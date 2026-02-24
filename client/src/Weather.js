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
    try { return JSON.parse(localStorage.getItem('weatherboy-favorites') || '[]'); }
    catch { return []; }
  });

  const searchInputRef = useRef(null);
  const canvasRef = useRef(null);
  const lightningFlashRef = useRef(null);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Dynamic background + accent color
  useEffect(() => {
    document.body.style.transition = 'background-color 1.5s ease';
    document.body.style.backgroundColor = getBackgroundColor(weather);
    document.documentElement.style.setProperty('--accent', getAccentColor(weather));
  }, [weather]);

  // Canvas particle animation
  useEffect(() => {
    const canvas = canvasRef.current;
    const flash = lightningFlashRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const type = getParticleType(weather);
    let particles = [];

    if (type === 'rain' || type === 'storm') {
      for (let i = 0; i < 220; i++) particles.push({
        x: Math.random() * canvas.width * 1.5 - canvas.width * 0.25,
        y: Math.random() * canvas.height,
        len: Math.random() * 16 + 8,
        speed: Math.random() * 8 + 10,
        opacity: Math.random() * 0.22 + 0.06,
      });
    } else if (type === 'snow') {
      for (let i = 0; i < 140; i++) particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 3.5 + 1,
        speed: Math.random() * 1.2 + 0.4,
        drift: Math.random() * 0.8 - 0.4,
        opacity: Math.random() * 0.5 + 0.2,
        wobble: Math.random() * Math.PI * 2,
      });
    } else if (type === 'stars') {
      for (let i = 0; i < 180; i++) particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.85,
        r: Math.random() * 1.4 + 0.3,
        opacity: Math.random() * 0.7 + 0.2,
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
      });
    }

    let lightningTimer;
    if (type === 'storm') {
      const doFlash = () => {
        if (!flash) return;
        flash.style.background = 'rgba(220,200,255,0.15)';
        setTimeout(() => { if (flash) flash.style.background = 'rgba(255,255,255,0)'; }, 60);
        setTimeout(() => {
          if (!flash) return;
          flash.style.background = 'rgba(220,200,255,0.08)';
          setTimeout(() => { if (flash) flash.style.background = 'rgba(255,255,255,0)'; }, 40);
        }, 110);
        lightningTimer = setTimeout(doFlash, Math.random() * 5000 + 2000);
      };
      lightningTimer = setTimeout(doFlash, 1800);
    }

    let animFrame;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (type === 'rain' || type === 'storm') {
        ctx.lineWidth = type === 'storm' ? 0.8 : 1;
        particles.forEach(p => {
          ctx.beginPath();
          ctx.globalAlpha = p.opacity * (type === 'storm' ? 0.7 : 1);
          ctx.strokeStyle = 'rgba(147,197,253,1)';
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.len * 0.15, p.y + p.len);
          ctx.stroke();
          p.y += p.speed; p.x -= p.speed * 0.12;
          if (p.y > canvas.height + 20) {
            p.y = -20;
            p.x = Math.random() * canvas.width * 1.5 - canvas.width * 0.25;
          }
        });
      } else if (type === 'snow') {
        particles.forEach(p => {
          p.wobble += 0.02;
          ctx.beginPath();
          ctx.globalAlpha = p.opacity;
          ctx.fillStyle = 'rgba(186,230,253,1)';
          ctx.arc(p.x + Math.sin(p.wobble) * 2, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
          p.y += p.speed; p.x += p.drift;
          if (p.y > canvas.height + 10) { p.y = -10; p.x = Math.random() * canvas.width; }
        });
      } else if (type === 'stars') {
        particles.forEach(p => {
          p.twinkle += p.twinkleSpeed;
          ctx.beginPath();
          ctx.globalAlpha = p.opacity * (0.55 + 0.45 * Math.sin(p.twinkle));
          ctx.fillStyle = 'rgba(255,255,255,1)';
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      ctx.globalAlpha = 1;
      animFrame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animFrame);
      clearTimeout(lightningTimer);
      window.removeEventListener('resize', resize);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (flash) flash.style.background = 'rgba(255,255,255,0)';
    };
  }, [weather]);

  // ── Helpers ─────────────────────────────────────────────

  const getBackgroundColor = (w) => {
    if (!w) return '#0a1e35';
    const id = w.weather[0].id;
    const isNight = w.weather[0].icon.endsWith('n');
    if (id >= 200 && id < 300) return '#0c0a1a';
    if (id >= 300 && id < 400) return '#0d1e2e';
    if (id >= 500 && id < 600) return '#091520';
    if (id >= 600 && id < 700) return '#141e30';
    if (id >= 700 && id < 800) return '#171720';
    if (id === 800) return isNight ? '#04080e' : '#0a1e35';
    return isNight ? '#0e1420' : '#121d2a';
  };

  const getAccentColor = (w) => {
    if (!w) return '#38bdf8';
    const id = w.weather[0].id;
    const isNight = w.weather[0].icon.endsWith('n');
    if (id >= 200 && id < 300) return '#c084fc';
    if (id >= 300 && id < 600) return '#22d3ee';
    if (id >= 600 && id < 700) return '#bae6fd';
    if (id >= 700 && id < 800) return '#94a3b8';
    if (id === 800) return isNight ? '#818cf8' : '#38bdf8';
    return '#94a3b8';
  };

  const getParticleType = (w) => {
    if (!w) return 'none';
    const id = w.weather[0].id;
    const isNight = w.weather[0].icon.endsWith('n');
    if (id >= 200 && id < 300) return 'storm';
    if (id >= 300 && id < 600) return 'rain';
    if (id >= 600 && id < 700) return 'snow';
    if (id === 800 && isNight) return 'stars';
    return 'none';
  };

  const getWeatherEmoji = (id, isNight) => {
    if (id >= 200 && id < 300) return '⛈️';
    if (id >= 300 && id < 400) return '🌦️';
    if (id >= 500 && id < 600) return '🌧️';
    if (id >= 600 && id < 700) return '❄️';
    if (id >= 700 && id < 800) return '🌫️';
    if (id === 800) return isNight ? '🌙' : '☀️';
    if (id <= 802) return isNight ? '⛅' : '🌤️';
    return '☁️';
  };

  const getAqiInfo = (v) => ([
    { label: 'Good',      color: '#22c55e' },
    { label: 'Fair',      color: '#84cc16' },
    { label: 'Moderate',  color: '#eab308' },
    { label: 'Poor',      color: '#f97316' },
    { label: 'Very Poor', color: '#ef4444' },
  ])[v - 1];

  const convertTemp = (t) => unit === 'F' ? Math.round((t * 9 / 5) + 32) : Math.round(t);

  const formatTime = (ts) => new Date(ts * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const formatHour = (ts) => new Date(ts * 1000).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });

  const getForecastDays = () => {
    if (!forecast) return [];
    const days = forecast.list.filter((_, i) => i % 8 === 0).slice(0, 5);
    const allHighs = days.map(d => convertTemp(d.main.temp_max));
    const allLows = days.map(d => convertTemp(d.main.temp_min));
    const rangeMin = Math.min(...allLows);
    const rangeMax = Math.max(...allHighs);
    return days.map(d => ({
      ...d,
      barPct: rangeMax > rangeMin
        ? (convertTemp(d.main.temp_max) - rangeMin) / (rangeMax - rangeMin)
        : 0.5,
    }));
  };

  const getChartData = () => {
    if (!forecast) return [];
    return forecast.list.map(item => ({
      label: new Date(item.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' }),
      temp: convertTemp(item.main.temp),
    }));
  };

  // ── Data actions ─────────────────────────────────────────

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
    } catch {
      setError('City not found. Please try again.');
      setWeather(null); setForecast(null); setAqi(null);
    } finally { setLoading(false); }
  };

  const fetchWeather = async (e) => {
    e.preventDefault();
    if (city.trim()) await fetchWeatherForCity(city);
  };

  const fetchByGeolocation = () => {
    if (!navigator.geolocation) { setError('Geolocation is not supported by your browser.'); return; }
    setGeoLoading(true); setError('');
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lon } }) => {
        try {
          const [weatherRes, forecastRes] = await Promise.all([
            axios.get(`/api/weather-by-coords?lat=${lat}&lon=${lon}`),
            axios.get(`/api/forecast-by-coords?lat=${lat}&lon=${lon}`),
          ]);
          setCity(weatherRes.data.name);
          await loadAllData(weatherRes, forecastRes);
        } catch {
          setError('Failed to fetch weather for your location.');
          setWeather(null); setForecast(null); setAqi(null);
        } finally { setGeoLoading(false); }
      },
      () => { setError('Unable to retrieve your location.'); setGeoLoading(false); }
    );
  };

  const handleCityChange = async (e) => {
    const value = e.target.value;
    setCity(value);
    if (value.length > 2) {
      try { const r = await axios.get(`/api/search/${value}`); setSuggestions(r.data); setShowSuggestions(true); }
      catch { setSuggestions([]); }
    } else { setSuggestions([]); setShowSuggestions(false); }
  };

  const handleCitySelect = (c) => {
    setCity(`${c.name}${c.state ? ', ' + c.state : ''}, ${c.country}`);
    setShowSuggestions(false);
  };

  const handleHomeClick = () => { setWeather(null); setForecast(null); setAqi(null); setCity(''); setError(''); };

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

  // ── Custom chart tooltip ────────────────────────────────

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-label">{label}</p>
        <p className="chart-tooltip-value">{payload[0].value}°{unit}</p>
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────

  const chartData = getChartData();
  const forecastDays = getForecastDays();

  return (
    <>
      <canvas ref={canvasRef} className="particle-canvas" />
      <div ref={lightningFlashRef} className="lightning-flash" />

      <div className="weather-app">

        {/* Header */}
        <div className="header">
          <h1 className="logo" onClick={handleHomeClick}>
            <span className="logo-icon">🌤️</span>WeatherBoy
          </h1>
          <button className="unit-toggle" onClick={() => setUnit(u => u === 'C' ? 'F' : 'C')}>
            Switch to °{unit === 'C' ? 'F' : 'C'}
          </button>
        </div>

        {/* Search */}
        <form onSubmit={fetchWeather} className="search-form">
          <div className="search-container">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Enter city name...  (press / to focus)"
              value={city}
              onChange={handleCityChange}
              onFocus={() => setShowSuggestions(city.length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="search-input"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="suggestions-dropdown">
                {suggestions.map((c, i) => (
                  <div key={i} className="suggestion-item" onClick={() => handleCitySelect(c)}>
                    {c.name}{c.state && `, ${c.state}`}{c.country && ` — ${c.country}`}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button type="button" className="geo-btn" onClick={fetchByGeolocation} disabled={geoLoading} title="Use my location">
            {geoLoading ? '⏳' : '📍'}
          </button>
          <button type="submit" className="search-btn">Search</button>
        </form>

        {/* Favorites */}
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

        {/* Welcome */}
        {!weather && !loading && !geoLoading && !error && (
          <div className="welcome-state">
            <div className="welcome-icon">🌤️</div>
            <h2>Welcome to WeatherBoy</h2>
            <p>Search for a city or use your location</p>
          </div>
        )}

        {/* Hero */}
        {weather && (() => {
          const id = weather.weather[0].id;
          const isNight = weather.weather[0].icon.endsWith('n');
          return (
            <div className="hero">
              <div className="hero-top">
                <div>
                  <div className="hero-city">{weather.name}, {weather.sys.country}</div>
                  <div className="hero-temp">{convertTemp(weather.main.temp)}°</div>
                  <div className="hero-condition-row">
                    <span className="hero-emoji">{getWeatherEmoji(id, isNight)}</span>
                    <span className="hero-condition">{weather.weather[0].description}</span>
                  </div>
                  <div className="hero-sub">
                    Feels like {convertTemp(weather.main.feels_like)}°
                    &nbsp;·&nbsp; H: {convertTemp(weather.main.temp_max)}°
                    &nbsp;·&nbsp; L: {convertTemp(weather.main.temp_min)}°
                  </div>
                </div>
                <button className={`fav-btn${isFavorited ? ' fav-btn--active' : ''}`} onClick={toggleFavorite}>
                  {isFavorited ? '★' : '☆'}
                </button>
              </div>
            </div>
          );
        })()}

        {/* Details */}
        {weather && (
          <div className="details">
            {[
              { label: 'Humidity',   value: `${weather.main.humidity}%` },
              { label: 'Wind',       value: `${weather.wind.speed} m/s` },
              { label: 'Pressure',   value: `${weather.main.pressure} hPa` },
              { label: 'Visibility', value: `${(weather.visibility / 1000).toFixed(1)} km` },
              { label: 'Sunrise',    value: formatTime(weather.sys.sunrise) },
              { label: 'Sunset',     value: formatTime(weather.sys.sunset) },
            ].map(({ label, value }) => (
              <div key={label} className="detail-card glass">
                <div className="detail-label">{label}</div>
                <div className="detail-value">{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* AQI */}
        {aqi && (() => {
          const aqiValue = aqi.list[0].main.aqi;
          const c = aqi.list[0].components;
          const info = getAqiInfo(aqiValue);
          return (
            <>
              <div className="section-label">Air Quality</div>
              <div className="aqi-card glass">
                <div className="aqi-scale-block">
                  <div className="aqi-index-label">Index</div>
                  <div className="aqi-scale">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className={`aqi-seg${i === aqiValue ? ' active' : ''}`}
                        style={{ background: getAqiInfo(i).color }} />
                    ))}
                  </div>
                  <div className="aqi-scale-labels">
                    <span>Good</span><span>Fair</span><span>Moderate</span><span>Poor</span><span>Very Poor</span>
                  </div>
                </div>
                <div className="aqi-pollutants">
                  {[['PM2.5', c.pm2_5], ['PM10', c.pm10], ['O₃', c.o3], ['NO₂', c.no2]].map(([name, val]) => (
                    <div key={name} className="aqi-poll">
                      <div className="aqi-poll-label">{name}</div>
                      <div className="aqi-poll-val">{val.toFixed(1)}</div>
                    </div>
                  ))}
                </div>
                <div className="aqi-number-block">
                  <div className="aqi-big-num" style={{ color: info.color }}>{aqiValue}</div>
                  <div className="aqi-big-label" style={{ color: info.color + 'aa' }}>{info.label}</div>
                </div>
              </div>
            </>
          );
        })()}

        {/* Hourly */}
        {forecast && (
          <>
            <div className="section-label">Next 24 Hours</div>
            <div className="hourly-card glass">
              <div className="hourly-scroll">
                {forecast.list.slice(0, 8).map((item, i) => (
                  <div key={i} className={`h-item${i === 0 ? ' now' : ''}`}>
                    <div className="h-time">{formatHour(item.dt)}</div>
                    <img src={`http://openweathermap.org/img/wn/${item.weather[0].icon}.png`}
                      alt={item.weather[0].description} className="h-icon-img" />
                    <div className="h-temp">{convertTemp(item.main.temp)}°</div>
                    <div className="h-pop">{item.pop > 0 ? `💧 ${Math.round(item.pop * 100)}%` : ''}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Temperature trend */}
        {forecast && (
          <>
            <div className="section-label">Temperature Trend</div>
            <div className="temp-chart glass">
              <ResponsiveContainer width="100%" height={170}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                    tickLine={false} axisLine={false} interval={7} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                    tickLine={false} axisLine={false} tickFormatter={v => `${v}°`} domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="temp" stroke="var(--accent)" strokeWidth={2}
                    fill="url(#tg)" dot={false} activeDot={{ r: 4, fill: 'var(--accent)', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* 5-day forecast */}
        {forecast && (
          <>
            <div className="section-label">5-Day Forecast</div>
            <div className="forecast-rows glass">
              {forecastDays.map((item, i) => (
                <div key={i} className="f-row">
                  <div className="f-day">
                    {new Date(item.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <img src={`http://openweathermap.org/img/wn/${item.weather[0].icon}.png`}
                    alt={item.weather[0].description} className="f-icon-img" />
                  <div className="f-desc">{item.weather[0].description}</div>
                  <div className="f-bar-wrap">
                    <span className="f-low">{convertTemp(item.main.temp_min)}°</span>
                    <div className="f-bar-track">
                      <div className="f-bar-fill" style={{ width: `${Math.round(item.barPct * 100)}%` }} />
                    </div>
                    <span className="f-high">{convertTemp(item.main.temp_max)}°</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </>
  );
}

export default Weather;
