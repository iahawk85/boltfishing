import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { OPENWEATHER_API_KEY } from './config'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

function FishBitePredictionApp() {
  const [formData, setFormData] = useState({
    location: '',
    waterTemperature: 20,
    timeOfDay: '08:00',
    moonPhase: 'full'
  })

  const [weatherData, setWeatherData] = useState(null)
  const [prediction, setPrediction] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [geoLoading, setGeoLoading] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const fetchWeatherByCoords = async (latitude, longitude) => {
    setLoading(true)
    setError(null)

    try {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}&units=metric`
      )
      
      setWeatherData(response.data)
      setFormData(prev => ({
        ...prev,
        location: response.data.name,
        waterTemperature: Math.round(response.data.main.temp)
      }))
    } catch (err) {
      setError('Could not fetch weather data for your location.')
      setWeatherData(null)
    } finally {
      setLoading(false)
      setGeoLoading(false)
    }
  }

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }

    setGeoLoading(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        fetchWeatherByCoords(latitude, longitude)
      },
      (error) => {
        setGeoLoading(false)
        switch(error.code) {
          case error.PERMISSION_DENIED:
            setError('User denied the request for Geolocation.')
            break
          case error.POSITION_UNAVAILABLE:
            setError('Location information is unavailable.')
            break
          case error.TIMEOUT:
            setError('The request to get user location timed out.')
            break
          default:
            setError('An unknown error occurred.')
        }
      }
    )
  }

  const fetchWeatherData = async () => {
    if (!formData.location) {
      setError('Please enter a location')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?q=${formData.location}&appid=${OPENWEATHER_API_KEY}&units=metric`
      )
      
      setWeatherData(response.data)
      setFormData(prev => ({
        ...prev,
        waterTemperature: Math.round(response.data.main.temp)
      }))
    } catch (err) {
      setError('Could not fetch weather data. Please check the location.')
      setWeatherData(null)
    } finally {
      setLoading(false)
    }
  }

  const predictFishBite = () => {
    if (!weatherData) {
      setError('Please fetch weather data first')
      return
    }

    const { waterTemperature, timeOfDay, moonPhase } = formData
    const { weather, wind } = weatherData
    
    let score = 50 // Base probability

    // Water temperature impact
    if (waterTemperature >= 18 && waterTemperature <= 24) {
      score += 20
    }

    // Time of day impact
    const hour = parseInt(timeOfDay.split(':')[0])
    if (hour >= 6 && hour <= 10) score += 15
    if (hour >= 16 && hour <= 19) score += 15

    // Weather impact
    const mainWeather = weather[0].main.toLowerCase()
    switch(true) {
      case mainWeather.includes('clear'): score += 10; break
      case mainWeather.includes('clouds'): score += 5; break
      case mainWeather.includes('rain'): score -= 10; break
    }

    // Wind impact
    if (wind.speed < 5) score += 10
    else if (wind.speed > 10) score -= 10

    // Moon phase impact
    switch(moonPhase) {
      case 'full': score += 10; break
      case 'new': score -= 5; break
    }

    // Ensure score is between 0 and 100
    score = Math.max(0, Math.min(100, score))

    setPrediction(score)
  }

  const chartData = weatherData ? {
    labels: ['Water Temp', 'Time', 'Wind Speed', 'Prediction'],
    datasets: [
      {
        label: 'Fishing Conditions',
        data: [
          formData.waterTemperature,
          parseInt(formData.timeOfDay.split(':')[0]),
          weatherData.wind.speed,
          prediction || 0
        ],
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }
    ]
  } : null

  return (
    <div className="app-container">
      <h1>🎣 Advanced Fish Bite Prediction App</h1>
      
      <div className="prediction-form">
        <div className="location-input-group">
          <label>
            Location:
            <input 
              type="text" 
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="Enter city name"
            />
          </label>
          <div className="location-buttons">
            <button 
              onClick={fetchWeatherData} 
              disabled={loading}
            >
              {loading ? 'Fetching...' : 'Get Weather'}
            </button>
            <button 
              onClick={handleGeolocate} 
              disabled={geoLoading}
              className="geolocate-btn"
            >
              {geoLoading ? 'Locating...' : '🌍 Geolocate'}
            </button>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {weatherData && (
          <div className="weather-info">
            <h3>Current Weather in {weatherData.name}</h3>
            <p>Temperature: {weatherData.main.temp}°C</p>
            <p>Conditions: {weatherData.weather[0].description}</p>
            <p>Wind Speed: {weatherData.wind.speed} m/s</p>
          </div>
        )}

        <label>
          Water Temperature (°C):
          <input 
            type="number" 
            name="waterTemperature"
            value={formData.waterTemperature}
            onChange={handleInputChange}
            min="0" 
            max="40"
          />
        </label>

        <label>
          Time of Day:
          <input 
            type="time" 
            name="timeOfDay"
            value={formData.timeOfDay}
            onChange={handleInputChange}
          />
        </label>

        <label>
          Moon Phase:
          <select 
            name="moonPhase"
            value={formData.moonPhase}
            onChange={handleInputChange}
          >
            <option value="full">Full Moon</option>
            <option value="half">Half Moon</option>
            <option value="new">New Moon</option>
          </select>
        </label>

        <button 
          onClick={predictFishBite} 
          disabled={!weatherData}
        >
          Predict Fish Bite
        </button>
      </div>

      {prediction !== null && (
        <div className="prediction-result">
          <h2>Bite Probability: {prediction}%</h2>
          {prediction > 70 && <p>🎣 Excellent fishing conditions!</p>}
          {prediction > 40 && prediction <= 70 && <p>🐟 Moderate fishing conditions</p>}
          {prediction <= 40 && <p>🚫 Poor fishing conditions</p>}
        </div>
      )}

      {chartData && (
        <div style={{ marginTop: '20px', height: '300px' }}>
          <Line data={chartData} />
        </div>
      )}
    </div>
  )
}

export default FishBitePredictionApp
