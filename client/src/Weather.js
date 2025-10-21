import React, { useState } from 'react';
import axios from 'axios';
import './Weather.css';

function Weather() {
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unit, setUnit] = useState('C'); // 'C' for Celsius, 'F' for Fahrenheit

  const fetchWeather = async (e) => {
    e.preventDefault();
    if (!city.trim()) return;

    setLoading(true);
    setError('');

    try {
      const weatherRes = await axios.get(`/api/weather/${city}`);
      const forecastRes = await axios.get(`/api/forecast/${city}`);
      
      setWeather(weatherRes.data);
      setForecast(forecastRes.data);
    } catch (err) {
      setError('City not found. Please try again.');
      setWeather(null);
      setForecast(null);
    } finally {
      setLoading(false);
    }
  };

  const convertTemp = (temp) => {
    if (unit === 'F') {
      return Math.round((temp * 9/5) + 32);
    }
    return Math.round(temp);
  };

  const toggleUnit = () => {
    setUnit(unit === 'C' ? 'F' : 'C');
  };

  return (
    <div className="weather-app">
      <div className="header">
        <h1>WeatherBoy</h1>
        <button onClick={toggleUnit} className="unit-toggle">
          Switch to °{unit === 'C' ? 'F' : 'C'}
        </button>
      </div>
      
      <form onSubmit={fetchWeather} className="search-form">
        <input
          type="text"
          placeholder="Enter city name..."
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="search-input"
        />
        <button type="submit" className="search-btn">
          Search
        </button>
      </form>

      {loading && <p className="loading">Loading...</p>}
      {error && <p className="error">{error}</p>}

      {weather && (
        <div className="current-weather">
          <h2>{weather.name}, {weather.sys.country}</h2>
          <div className="temp-display">
            <span className="temperature">{convertTemp(weather.main.temp)}°{unit}</span>
            <div className="weather-info">
              <p className="description">{weather.weather[0].description}</p>
              <p>Feels like: {convertTemp(weather.main.feels_like)}°{unit}</p>
            </div>
          </div>
          <div className="weather-details">
            <div className="detail">
              <span>Humidity</span>
              <strong>{weather.main.humidity}%</strong>
            </div>
            <div className="detail">
              <span>Wind Speed</span>
              <strong>{weather.wind.speed} m/s</strong>
            </div>
            <div className="detail">
              <span>Pressure</span>
              <strong>{weather.main.pressure} hPa</strong>
            </div>
          </div>
        </div>
      )}

      {forecast && (
        <div className="forecast">
          <h3>5-Day Forecast</h3>
          <div className="forecast-grid">
            {forecast.list
              .filter((item, index) => index % 8 === 0)
              .slice(0, 5)
              .map((item, index) => (
                <div key={index} className="forecast-card">
                  <p className="forecast-date">
                    {new Date(item.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' })}
                  </p>
                  <p className="forecast-temp">{convertTemp(item.main.temp)}°{unit}</p>
                  <p className="forecast-desc">{item.weather[0].description}</p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Weather;