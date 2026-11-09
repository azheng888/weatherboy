import { Star, X, AlertCircle, Droplets, Wind, Gauge, Leaf, Sunrise, Sunset } from 'lucide-react';
import SkyScene from './SkyScene';
import SearchBox from './SearchBox';
import {
  toTemp, capitalize, outlookSentence, formatDate, formatClock, isNightAt,
  toWind, windUnit, compass, AQI_LEVELS,
} from '../lib/weather';

/** The handful of numbers people check first, right in the hero. */
function Glance({ data, unit }) {
  const { weather, forecast, aqi } = data;
  const tz = weather.timezone;
  const now = Math.floor(Date.now() / 1000);
  const rain = Math.round(Math.max(0, ...forecast.list.slice(0, 4).map((s) => s.pop || 0)) * 100);
  const aqiValue = aqi?.list?.[0]?.main?.aqi;
  const sunUp = now >= weather.sys.sunrise && now < weather.sys.sunset;
  // After sunset, today's sunrise has passed; tomorrow's is ~24h later.
  const nextSunrise = now < weather.sys.sunrise ? weather.sys.sunrise : weather.sys.sunrise + 86400;
  const items = [
    { icon: Droplets, label: 'Rain, next 12h', value: `${rain}%` },
    { icon: Wind, label: 'Wind', value: `${toWind(weather.wind.speed, unit)} ${windUnit(unit)} ${compass(weather.wind.deg)}` },
    { icon: Gauge, label: 'Humidity', value: `${weather.main.humidity}%` },
    aqiValue && { icon: Leaf, label: 'Air quality', value: AQI_LEVELS[aqiValue - 1].label },
    sunUp
      ? { icon: Sunset, label: 'Sunset', value: formatClock(weather.sys.sunset, tz) }
      : { icon: Sunrise, label: 'Sunrise', value: formatClock(nextSunrise, tz) },
  ].filter(Boolean);
  return (
    <ul className="glance" aria-label="Current conditions">
      {items.map(({ icon: Icon, label, value }) => (
        <li key={label} className="glance__item">
          <span className="glance__label"><Icon aria-hidden="true" />{label}</span>
          <span className="glance__value font-heading">{value}</span>
        </li>
      ))}
    </ul>
  );
}

function RevealLine({ text, className }) {
  const words = text.split(' ');
  return (
    <span className={`hero__line ${className}`}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, i) => (
          <span key={`${word}-${i}`}>
            <span className="word-mask">
              <span className="word" style={{ animationDelay: `${120 + i * 70}ms` }}>{word}</span>
            </span>
            {i < words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </span>
    </span>
  );
}

export default function Hero({
  data, unit, loading, error, onSelect, favorites, onOpenFavorite, onRemoveFavorite,
  isFavorite, onToggleFavorite,
}) {
  const weather = data?.weather;
  const night = weather ? isNightAt(weather) : false;

  let line1 = 'Know the sky.';
  let line2 = 'Plan the day.';
  let blurb = 'Hour-by-hour forecasts, air quality and a calm read on the week ahead, for anywhere on Earth.';
  if (weather) {
    line1 = `${toTemp(weather.main.temp, unit)}° in ${weather.name}.`;
    line2 = `${capitalize(weather.weather[0].description)}.`;
    blurb = outlookSentence(weather, data.forecast);
  } else if (loading) {
    line1 = 'Reading the sky…';
    line2 = 'One moment.';
  }

  return (
    <section className={`hero${night ? ' hero--night' : ''}${weather ? ' hero--data' : ''}`} aria-labelledby="hero-title">
      <SkyScene weather={weather} />

      <div className="hero__inner">
        <div className="hero__top">
          {weather && (
            <div className="hero__meta">
              <span className="pill pill--glass">
                <span className="pill__dot" />
                {weather.name}, {weather.sys.country}
                <span className="pill__sep pill__wide" aria-hidden="true">/</span>
                <span className="font-mono pill__wide">{formatDate(weather.dt, weather.timezone)}</span>
                <span className="pill__sep" aria-hidden="true">/</span>
                <span className="font-mono">{formatClock(Math.floor(Date.now() / 1000), weather.timezone)}</span>
              </span>
              <button
                type="button"
                className={`icon-btn icon-btn--glass${isFavorite ? ' is-active' : ''}`}
                onClick={onToggleFavorite}
                aria-pressed={isFavorite}
                aria-label={isFavorite ? 'Remove from saved places' : 'Save this place'}
                title={isFavorite ? 'Saved' : 'Save place'}
              >
                <Star aria-hidden="true" fill={isFavorite ? 'currentColor' : 'none'} />
              </button>
            </div>
          )}
          <h1 id="hero-title" className="hero__title font-heading" key={`${line1}${line2}`}>
            <RevealLine text={line1} className="hero__line--accent" />
            <RevealLine text={line2} className="hero__line--quiet" />
          </h1>
          {weather && (
            <p className="hero__sub">
              Feels like {toTemp(weather.main.feels_like, unit)}°
              <span aria-hidden="true"> · </span>H {toTemp(weather.main.temp_max, unit)}°
              <span aria-hidden="true"> · </span>L {toTemp(weather.main.temp_min, unit)}°
            </p>
          )}
          {weather && <Glance data={data} unit={unit} />}
        </div>

        <div className="hero__panel">
          <div className="glass">
            <SearchBox onSelect={onSelect} loading={loading} />
            {favorites.length > 0 && (
              <ul className="chips" aria-label="Saved places">
                {favorites.map((f) => (
                  <li key={f.label} className="chip">
                    <button type="button" className="chip__main" onClick={() => onOpenFavorite(f)}>{f.label}</button>
                    <button
                      type="button"
                      className="chip__x"
                      onClick={() => onRemoveFavorite(f)}
                      aria-label={`Remove ${f.label}`}
                    >
                      <X aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div aria-live="polite" className="hero__blurb">
            {error
              ? <p className="hero__error"><AlertCircle aria-hidden="true" />{error}</p>
              : <p key={blurb} className="fade-in">{blurb}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
