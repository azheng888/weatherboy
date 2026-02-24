import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import './Weather.css';

function Weather() {
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [aqi, setAqi] = useState(null);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState('');
  const [unit, setUnit] = useState('F');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('weatherboy-favorites') || '[]');
    } catch {
      return [];
    }
  });

  const searchInputRef = useRef(null);

  // Press '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Dynamic background based on weather condition
  useEffect(() => {
    document.body.style.transition = 'background-color 1.5s ease';
    document.body.style.backgroundColor = getBackgroundColor(weather);
  }, [weather]);

  const getBackgroundColor = (w) => {
    if (!w) return '#0f1419';
    const id = w.weather[0].id;
    const isNight = w.weather[0].icon.endsWith('n');
    if (id >= 200 && id < 300) return '#0c0a1a'; // thunderstorm: deep purple-black
    if (id >= 300 && id < 400) return '#0d1e2e'; // drizzle: steel blue-black
    if (id >= 500 && id < 600) return '#091520'; // rain: dark navy
    if (id >= 600 && id < 700) return '#141e30'; // snow: icy blue-black
    if (id >= 700 && id < 800) return '#171720'; // atmosphere: grey-black
    if (id === 800) return isNight ? '#04080e' : '#0a1e35'; // clear: near-black or deep sky
    return isNight ? '#0e1420' : '#121d2a'; // clouds: blue-grey dark
  };

  const loadAllData = async (weatherRes, forecastRes) => {
    const { lat, lon } = weatherRes.data.coord;
    const aqiRes = await axios.get(`/api/aqi?lat=${lat}&lon=${lon}`);
    setWeather(weatherRes.data);
    setForecast(forecastRes.data);
    setAqi(aqiRes.data);
  };

  const fetchWeatherForCity = async (cityName) => {
    setLoading(true);
    setError('');
    try {
      const [weatherRes, forecastRes] = await Promise.all([
        axios.get(`/api/weather/${encodeURIComponent(cityName)}`),
        axios.get(`/api/forecast/${encodeURIComponent(cityName)}`),
      ]);
      await loadAllData(weatherRes, forecastRes);
    } catch (err) {
      setError('City not found. Please try again.');
      setWeather(null);
      setForecast(null);
      setAqi(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeather = async (e) => {
    e.preventDefault();
    if (!city.trim()) return;
    await fetchWeatherForCity(city);
  };

  const fetchByGeolocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setGeoLoading(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude: lat, longitude: lon } = coords;
        try {
          const [weatherRes, forecastRes] = await Promise.all([
            axios.get(`/api/weather-by-coords?lat=${lat}&lon=${lon}`),
            axios.get(`/api/forecast-by-coords?lat=${lat}&lon=${lon}`),
          ]);
          setCity(weatherRes.data.name);
          await loadAllData(weatherRes, forecastRes);
        } catch (err) {
          setError('Failed to fetch weather for your location.');
          setWeather(null);
          setForecast(null);
          setAqi(null);
        } finally {
          setGeoLoading(false);
        }
      },
      () => {
        setError('Unable to retrieve your location. Please check your browser permissions.');
        setGeoLoading(false);
      }
    );
  };

  const handleCityChange = async (e) => {
    const value = e.target.value;
    setCity(value);
    if (value.length > 2) {
      try {
        const response = await axios.get(`/api/search/${value}`);
        setSuggestions(response.data);
        setShowSuggestions(true);
      } catch (err) {
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleCitySelect = (selectedCity) => {
    const cityName = `${selectedCity.name}${selectedCity.state ? ', ' + selectedCity.state : ''}, ${selectedCity.country}`;
    setCity(cityName);
    setShowSuggestions(false);
  };

  const convertTemp = (temp) => {
    if (unit === 'F') return Math.round((temp * 9 / 5) + 32);
    return Math.round(temp);
  };

  const toggleUnit = () => setUnit(unit === 'C' ? 'F' : 'C');

  const handleHomeClick = () => {
    setWeather(null);
    setForecast(null);
    setAqi(null);
    setCity('');
    setError('');
  };

  const toggleFavorite = () => {
    if (!weather) return;
    const key = `${weather.name}, ${weather.sys.country}`;
    setFavorites(prev => {
      const updated = prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key];
      localStorage.setItem('weatherboy-favorites', JSON.stringify(updated));
      return updated;
    });
  };

  const removeFavorite = (key) => {
    setFavorites(prev => {
      const updated = prev.filter(f => f !== key);
      localStorage.setItem('weatherboy-favorites', JSON.stringify(updated));
      return updated;
    });
  };

  const isFavorited = weather ? favorites.includes(`${weather.name}, ${weather.sys.country}`) : false;

  const getWeatherIcon = (iconCode) => `http://openweathermap.org/img/wn/${iconCode}@2x.png`;

  const formatTime = (timestamp) => new Date(timestamp * 1000).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit'
  });

  const formatHour = (timestamp) => new Date(timestamp * 1000).toLocaleTimeString('en-US', {
    hour: 'numeric', hour12: true
  });

  const getAqiInfo = (aqiValue) => {
    const levels = [
      { label: 'Good',      color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.3)' },
      { label: 'Fair',      color: '#84cc16', bg: 'rgba(132,204,22,0.12)',  border: 'rgba(132,204,22,0.3)' },
      { label: 'Moderate',  color: '#eab308', bg: 'rgba(234,179,8,0.12)',   border: 'rgba(234,179,8,0.3)' },
      { label: 'Poor',      color: '#f97316', bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.3)' },
      { label: 'Very Poor', color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)' },
    ];
    return levels[aqiValue - 1];
  };

  const getChartData = () => {
    if (!forecast) return [];
    return forecast.list.map((item, i) => ({
      label: new Date(item.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' }),
      index: i,
      temp: convertTemp(item.main.temp),
    }));
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="chart-tooltip-label">{label}</p>
          <p className="chart-tooltip-value">{payload[0].value}°{unit}</p>
        </div>
      );
    }
    return null;
  };

  const chartData = getChartData();

  return (
    <div className="weather-app">
      <div className="header">
        <h1 onClick={handleHomeClick} className="logo">
          <span className="logo-icon">🌤️</span>
          WeatherBoy
        </h1>
        <button onClick={toggleUnit} className="unit-toggle">
          Switch to °{unit === 'C' ? 'F' : 'C'}
        </button>
      </div>

      <form onSubmit={fetchWeather} className="search-form">
        <div className="search-container">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Enter city name... (press / to focus)"
            value={city}
            onChange={handleCityChange}
            onFocus={() => setShowSuggestions(city.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className="search-input"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="suggestions-dropdown">
              {suggestions.map((cityData, index) => (
                <div
                  key={index}
                  className="suggestion-item"
                  onClick={() => handleCitySelect(cityData)}
                >
                  {cityData.name}
                  {cityData.state && `, ${cityData.state}`}
                  {cityData.country && ` - ${cityData.country}`}
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          className="geo-btn"
          onClick={fetchByGeolocation}
          disabled={geoLoading}
          title="Use my location"
        >
          {geoLoading ? '⏳' : '📍'}
        </button>
        <button type="submit" className="search-btn">Search</button>
      </form>

      {favorites.length > 0 && (
        <div className="favorites-bar">
          {favorites.map((fav, i) => (
            <div key={i} className="fav-chip">
              <span onClick={() => { setCity(fav); fetchWeatherForCity(fav); }}>{fav}</span>
              <button className="fav-remove" onClick={() => removeFavorite(fav)}>×</button>
            </div>
          ))}
        </div>
      )}

      {(loading || geoLoading) && <p className="loading">Loading...</p>}
      {error && <p className="error">{error}</p>}

      {!weather && !loading && !geoLoading && !error && (
        <div className="welcome-state">
          <div className="welcome-icon">🌤️</div>
          <h2>Welcome to WeatherBoy</h2>
          <p>Search for a city or use your location to view current weather and forecasts</p>
        </div>
      )}

      {weather && (
        <div className="current-weather">
          <div className="weather-title-row">
            <h2>{weather.name}, {weather.sys.country}</h2>
            <button
              className={`fav-btn ${isFavorited ? 'fav-btn--active' : ''}`}
              onClick={toggleFavorite}
              title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              {isFavorited ? '★' : '☆'}
            </button>
          </div>
          <div className="temp-display">
            <div className="temp-main">
              <img
                src={getWeatherIcon(weather.weather[0].icon)}
                alt={weather.weather[0].description}
                className="weather-icon-large"
              />
              <span className="temperature">{convertTemp(weather.main.temp)}°{unit}</span>
            </div>
            <div className="weather-info">
              <p className="description">{weather.weather[0].description}</p>
              <p>Feels like: {convertTemp(weather.main.feels_like)}°{unit}</p>
              <p>High: {convertTemp(weather.main.temp_max)}°{unit} • Low: {convertTemp(weather.main.temp_min)}°{unit}</p>
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
            <div className="detail">
              <span>Visibility</span>
              <strong>{(weather.visibility / 1000).toFixed(1)} km</strong>
            </div>
            <div className="detail">
              <span>Sunrise</span>
              <strong>{formatTime(weather.sys.sunrise)}</strong>
            </div>
            <div className="detail">
              <span>Sunset</span>
              <strong>{formatTime(weather.sys.sunset)}</strong>
            </div>
          </div>
        </div>
      )}

      {aqi && (() => {
        const aqiValue = aqi.list[0].main.aqi;
        const components = aqi.list[0].components;
        const info = getAqiInfo(aqiValue);
        return (
          <div className="aqi-section">
            <div className="aqi-header">
              <h3>Air Quality Index</h3>
              <span
                className="aqi-badge"
                style={{ color: info.color, background: info.bg, border: `1px solid ${info.border}` }}
              >
                {aqiValue} — {info.label}
              </span>
            </div>
            <div className="aqi-components">
              <div className="aqi-component"><span>PM2.5</span><strong>{components.pm2_5.toFixed(1)}</strong></div>
              <div className="aqi-component"><span>PM10</span><strong>{components.pm10.toFixed(1)}</strong></div>
              <div className="aqi-component"><span>O₃</span><strong>{components.o3.toFixed(1)}</strong></div>
              <div className="aqi-component"><span>NO₂</span><strong>{components.no2.toFixed(1)}</strong></div>
              <div className="aqi-component"><span>SO₂</span><strong>{components.so2.toFixed(1)}</strong></div>
              <div className="aqi-component"><span>CO</span><strong>{components.co.toFixed(1)}</strong></div>
            </div>
          </div>
        );
      })()}

      {forecast && (
        <div className="hourly-forecast">
          <h3>24-Hour Forecast</h3>
          <div className="hourly-scroll">
            {forecast.list.slice(0, 8).map((item, index) => (
              <div key={index} className="hourly-card">
                <p className="hourly-time">{formatHour(item.dt)}</p>
                <img
                  src={getWeatherIcon(item.weather[0].icon)}
                  alt={item.weather[0].description}
                  className="weather-icon-small"
                />
                <p className="hourly-temp">{convertTemp(item.main.temp)}°{unit}</p>
                <p className="hourly-pop">
                  {item.pop > 0 ? `💧 ${Math.round(item.pop * 100)}%` : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {forecast && (
        <div className="temp-chart">
          <h3>Temperature Trend</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#718096', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                interval={7}
              />
              <YAxis
                tick={{ fill: '#718096', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => `${v}°`}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="temp"
                stroke="#7c3aed"
                strokeWidth={2}
                fill="url(#tempGradient)"
                dot={false}
                activeDot={{ r: 4, fill: '#7c3aed', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
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
                  <img
                    src={getWeatherIcon(item.weather[0].icon)}
                    alt={item.weather[0].description}
                    className="weather-icon-small"
                  />
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
