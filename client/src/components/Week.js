import { Droplets } from 'lucide-react';
import ConditionIcon from './ConditionIcon';
import { dailySummary, formatWeekday, toTemp, capitalize, localDayKey } from '../lib/weather';

export default function Week({ weather, forecast, unit }) {
  const tz = weather.timezone;
  const todayKey = localDayKey(weather.dt, tz);
  const tomorrowKey = localDayKey(weather.dt + 86400, tz);
  const days = dailySummary(forecast, tz)
    // Today's remaining slots may be few; fold in the current reading too.
    .map((d) => (d.key === todayKey
      ? { ...d, high: Math.max(d.high, weather.main.temp), low: Math.min(d.low, weather.main.temp) }
      : d))
    // Drop a trailing partial day with too few slots to have a meaningful high/low.
    .filter((d, i) => i === 0 || d.slots >= 4)
    .slice(0, 6);

  const lows = days.map((d) => toTemp(d.low, unit));
  const highs = days.map((d) => toTemp(d.high, unit));
  const min = Math.min(...lows, toTemp(weather.main.temp, unit));
  const max = Math.max(...highs, toTemp(weather.main.temp, unit));
  const span = max - min || 1;
  const pos = (v) => ((v - min) / span) * 100;

  return (
    <ol className="week">
      {days.map((d, i) => {
        const lo = lows[i];
        const hi = highs[i];
        const isToday = d.key === todayKey;
        const cur = toTemp(weather.main.temp, unit);
        return (
          <li key={d.key} className="week__row reveal" style={{ transitionDelay: `${i * 60}ms` }}>
            <span className="week__day font-heading">{isToday ? 'Today' : d.key === tomorrowKey ? 'Tomorrow' : formatWeekday(d.dt, tz, 'long')}</span>
            <span className="week__cond">
              <ConditionIcon id={d.id} />
              <span className="week__desc">{capitalize(d.description)}</span>
            </span>
            <span className={`week__pop${d.pop >= 0.3 ? ' is-wet' : ''}`}>
              {d.pop >= 0.1 ? <><Droplets aria-hidden="true" />{Math.round(d.pop * 100)}%</> : ''}
            </span>
            <span className="week__range">
              <span className="week__lo font-mono">{lo}°</span>
              <span className="week__track" aria-label={`Low ${lo}°, high ${hi}°`} role="img">
                <span
                  className="week__fill"
                  style={{ left: `${pos(lo)}%`, width: `${Math.max(pos(hi) - pos(lo), 3)}%` }}
                />
                {isToday && <span className="week__now" style={{ left: `${pos(cur)}%` }} title={`Now ${cur}°`} />}
              </span>
              <span className="week__hi font-mono">{hi}°</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
