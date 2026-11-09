import { Sunrise, Sunset, Navigation } from 'lucide-react';
import {
  formatClock, daylightProgress, daylightLength, isNightAt, toWind, windUnit, compass,
  toPressure, pressureUnit, toDistance, distanceUnit, dewPoint, toTemp,
} from '../lib/weather';

function DaylightCard({ weather, nowUnix }) {
  const tz = weather.timezone;
  const t = daylightProgress(weather, nowUnix);
  const night = isNightAt(weather, nowUnix);
  // Point on a semicircle from (10,90) to (190,90), radius 80.
  const angle = Math.PI * (1 - t);
  const x = 100 + 80 * Math.cos(angle);
  const y = 90 - 80 * Math.sin(angle);
  return (
    <article className="spot reveal">
      <p className="spot__kicker">Daylight</p>
      <p className="spot__value font-heading">{daylightLength(weather)}</p>
      <svg className="arc" viewBox="0 0 200 100" aria-hidden="true">
        <path d="M10 90 A80 80 0 0 1 190 90" className="arc__track" />
        {!night && (
          <path
            d={`M10 90 A80 80 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}`}
            className="arc__done"
          />
        )}
        <line x1="0" x2="200" y1="90" y2="90" className="arc__horizon" />
        {!night && <circle cx={x} cy={y} r="7" className="arc__sun" />}
      </svg>
      <div className="spot__pair">
        <span><Sunrise aria-hidden="true" />{formatClock(weather.sys.sunrise, tz)}</span>
        <span><Sunset aria-hidden="true" />{formatClock(weather.sys.sunset, tz)}</span>
      </div>
      <p className="spot__note">
        {night ? 'The sun is down. ' : `${Math.round(t * 100)}% of daylight has passed. `}
        Times are local to {weather.name}.
      </p>
    </article>
  );
}

function WindCard({ weather, unit }) {
  const { speed, deg = 0, gust } = weather.wind;
  return (
    <article className="spot reveal">
      <p className="spot__kicker">Wind</p>
      <p className="spot__value font-heading">
        {toWind(speed, unit)}<span className="spot__unit">{windUnit(unit)}</span>
      </p>
      <div className="compass" aria-hidden="true">
        {['N', 'E', 'S', 'W'].map((d) => <span key={d} className={`compass__mark compass__mark--${d}`}>{d}</span>)}
        {/* Meteorological degrees give where wind comes FROM; the arrow points where it blows TO. */}
        <Navigation className="compass__needle" style={{ transform: `rotate(${deg + 180 - 45}deg)` }} />
      </div>
      <p className="spot__note">
        From the {compass(deg)} ({deg}°)
        {gust ? `, gusting to ${toWind(gust, unit)} ${windUnit(unit)}` : ''}.
      </p>
    </article>
  );
}

function AtmosphereCard({ weather, unit }) {
  const m = weather.main;
  const rows = [
    ['Humidity', `${m.humidity}%`],
    ['Dew point', `${toTemp(dewPoint(m.temp, m.humidity), unit)}°`],
    ['Pressure', `${toPressure(m.pressure, unit)} ${pressureUnit(unit)}`],
    ['Visibility', `${toDistance(weather.visibility ?? 10000, unit)} ${distanceUnit(unit)}`],
    ['Cloud cover', `${weather.clouds.all}%`],
  ];
  return (
    <article className="spot reveal">
      <p className="spot__kicker">Atmosphere</p>
      <p className="spot__value font-heading">
        {toPressure(m.pressure, unit)}<span className="spot__unit">{pressureUnit(unit)}</span>
      </p>
      <dl className="rows">
        {rows.map(([k, v]) => (
          <div key={k} className="rows__row">
            <dt>{k}</dt>
            <dd className="font-mono">{v}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

export default function Conditions({ weather, unit, nowUnix }) {
  return (
    <div className="spots">
      <DaylightCard weather={weather} nowUnix={nowUnix} />
      <WindCard weather={weather} unit={unit} />
      <AtmosphereCard weather={weather} unit={unit} />
    </div>
  );
}
