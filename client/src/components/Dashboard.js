import { useMemo, useState } from 'react';
import {
  ComposedChart, Area, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from 'recharts';
import {
  TrendingUp, TrendingDown, RefreshCw, Umbrella, Snowflake, ThermometerSun, Wind,
  Leaf, SunMedium, CloudFog, Check, Droplets,
} from 'lucide-react';
import ConditionIcon from './ConditionIcon';
import {
  toTemp, toWind, windUnit, dewPoint, formatHour, formatWeekday, formatClock,
  slotsForRange, AQI_LEVELS, suggestions, isNightAt,
} from '../lib/weather';

const RANGES = [
  ['24h', 'Next 24h'],
  ['tomorrow', 'Tomorrow'],
  ['5d', '5 days'],
];

const TIP_ICONS = {
  umbrella: Umbrella, cold: Snowflake, heat: ThermometerSun, wind: Wind,
  air: Leaf, sun: SunMedium, fog: CloudFog, ok: Check,
};

function Sparkline({ values }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * 100,
    28 - ((v - min) / span) * 24,
  ]);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const [lx, ly] = pts[pts.length - 1];
  return (
    <div className="spark" aria-hidden="true">
      <svg viewBox="0 0 100 32" preserveAspectRatio="none">
        <path d={`${d} L100 32 L0 32Z`} className="spark__fill" />
        <path d={d} className="spark__line" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="spark__dot" style={{ left: `${lx}%`, top: `${(ly / 32) * 100}%` }} />
    </div>
  );
}

function Kpi({ label, value, unit, series, trend, trendUp, positive }) {
  const Trend = trendUp ? TrendingUp : TrendingDown;
  return (
    <div className="kpi">
      <p className="kpi__label">{label}</p>
      <div className="kpi__row">
        <p className="kpi__value font-heading">
          {value}
          {unit && <span className="kpi__unit">{unit}</span>}
        </p>
        <Sparkline values={series} />
      </div>
      <p className={`kpi__trend${positive ? ' is-positive' : ''}`}>
        <Trend aria-hidden="true" />
        <span>{trend}</span>
      </p>
    </div>
  );
}

function ChartTooltip({ active, payload, unit }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="chart-tip">
      <p className="chart-tip__time">{p.full}</p>
      <p><span className="dot dot--temp" />Temperature <b>{p.temp}°{unit}</b></p>
      <p><span className="dot dot--feels" />Feels like <b>{p.feels}°{unit}</b></p>
      <p><span className="dot dot--pop" />Precipitation <b>{p.pop}%</b></p>
    </div>
  );
}

function AirPanel({ aqi }) {
  const entry = aqi?.list?.[0];
  if (!entry) {
    return (
      <div>
        <h4 className="card-title">Air quality</h4>
        <p className="muted small mt-2">Air quality data isn’t available for this place.</p>
      </div>
    );
  }
  const value = entry.main.aqi;
  const level = AQI_LEVELS[value - 1];
  const c = entry.components;
  const pollutants = [
    ['PM2.5', c.pm2_5, 'chart-1'],
    ['PM10', c.pm10, 'chart-3'],
    ['O₃', c.o3, 'chart-4'],
    ['NO₂', c.no2, 'chart-5'],
  ];
  return (
    <div>
      <div className="row-between">
        <h4 className="card-title">Air quality</h4>
        <p className="small muted">AQI {value} of 5</p>
      </div>
      <p className="aqi__label font-heading" style={{ '--aqi': level.color }}>
        <span className="aqi__swatch" />
        {level.label}
      </p>
      <div className="aqi__scale" role="img" aria-label={`Air quality index ${value}: ${level.label}`}>
        {AQI_LEVELS.map((l, i) => (
          <span
            key={l.label}
            className={`aqi__seg${i + 1 === value ? ' is-active' : ''}`}
            style={{ background: l.color }}
          />
        ))}
      </div>
      <ul className="legend-grid">
        {pollutants.map(([name, v, color]) => (
          <li key={name}>
            <span className="legend-grid__name"><span className={`sq bg-${color}`} />{name}</span>
            <span className="legend-grid__val">{v.toFixed(1)}</span>
          </li>
        ))}
      </ul>
      <p className="small muted mt-3">{level.advice} <span className="font-mono">µg/m³</span></p>
    </div>
  );
}

function Tips({ tips }) {
  return (
    <div>
      <div className="row-between">
        <h4 className="card-title">Today’s suggestions</h4>
        <p className="small muted">{tips.length} for the next 15h</p>
      </div>
      <ul className="tips">
        {tips.map((t) => {
          const Icon = TIP_ICONS[t.kind] || Check;
          return (
            <li key={t.title} className="tip">
              <span className="tip__icon"><Icon aria-hidden="true" /></span>
              <span className="tip__text">
                <span className="tip__title">{t.title}</span>
                <span className="tip__detail">{t.detail}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Hourly({ data, unit }) {
  const { weather, forecast } = data;
  const tz = weather.timezone;
  const items = [
    {
      key: 'now', time: 'Now', id: weather.weather[0].id, night: isNightAt(weather),
      temp: weather.main.temp, pop: forecast.list[0]?.pop || 0,
    },
    ...forecast.list.slice(0, 8).map((s) => ({
      key: s.dt, time: formatHour(s.dt, tz), id: s.weather[0].id,
      night: s.sys?.pod === 'n', temp: s.main.temp, pop: s.pop || 0,
    })),
  ];
  return (
    <div className="card" id="hourly">
      <div className="row-between">
        <h4 className="card-title">Hour by hour</h4>
        <p className="small muted">3-hour steps, local time</p>
      </div>
      <ol className="hourly">
        {items.map((it, i) => (
          <li key={it.key} className={`hourly__item${i === 0 ? ' is-now' : ''}`}>
            <span className="hourly__time">{it.time}</span>
            <ConditionIcon id={it.id} night={it.night} />
            <span className="hourly__temp font-heading">{toTemp(it.temp, unit)}°</span>
            <span className="hourly__pop">
              {it.pop >= 0.1 ? <><Droplets aria-hidden="true" />{Math.round(it.pop * 100)}%</> : ' '}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

const ago = (ms) => {
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'Updated just now';
  if (mins < 60) return `Updated ${mins} min ago`;
  return `Updated ${Math.floor(mins / 60)}h ago`;
};

export default function Dashboard({ data, unit, onRefresh, refreshing, fetchedAt, now }) {
  const [range, setRange] = useState('24h');
  const { weather, forecast, aqi } = data;
  const tz = weather.timezone;
  const nowUnix = Math.floor(now / 1000);

  const slots = useMemo(
    () => slotsForRange(forecast, tz, range, weather.dt),
    [forecast, tz, range, weather.dt],
  );

  const chartData = useMemo(() => slots.map((s) => ({
    dt: s.dt,
    label: range === '5d' ? formatWeekday(s.dt, tz) : formatHour(s.dt, tz),
    full: `${formatWeekday(s.dt, tz, 'long')}, ${formatHour(s.dt, tz)}`,
    temp: toTemp(s.main.temp, unit),
    feels: toTemp(s.main.feels_like, unit),
    pop: Math.round((s.pop || 0) * 100),
  })), [slots, range, tz, unit]);

  const temps = chartData.map((d) => d.temp);
  const peak = chartData.reduce((a, b) => (b.temp > a.temp ? b : a), chartData[0]);
  const low = Math.min(...temps);
  const nowTemp = toTemp(weather.main.temp, unit);
  const pops = chartData.map((d) => d.pop);
  const wettest = chartData.reduce((a, b) => (b.pop > a.pop ? b : a), chartData[0]);
  const winds = slots.map((s) => toWind(s.wind.speed, unit));
  const gust = Math.max(...slots.map((s) => toWind(s.wind.gust || s.wind.speed, unit)));
  const hums = slots.map((s) => s.main.humidity);
  const avgHum = Math.round(hums.reduce((a, b) => a + b, 0) / hums.length);
  const dew = toTemp(dewPoint(weather.main.temp, weather.main.humidity), unit);

  const tips = useMemo(() => suggestions({ weather, forecast, aqi, unit }), [weather, forecast, aqi, unit]);
  const rangeLabel = RANGES.find(([k]) => k === range)[1].toLowerCase();
  const tickInterval = range === '5d' ? 7 : range === 'tomorrow' ? 0 : 1;

  return (
    <div className="workspace reveal">
      <div className="workspace__bar">
        <nav className="workspace__tabs" aria-label="Dashboard sections">
          <a href="#forecast" className="tab is-active">Overview</a>
          <a href="#hourly" className="tab">Hourly</a>
          <a href="#conditions" className="tab tab--md">Conditions</a>
          <a href="#week" className="tab tab--md">Week</a>
        </nav>
        <div className="workspace__tools">
          <span className="pill pill--soft">{ago(now - fetchedAt)}</span>
          <button
            type="button"
            className="icon-btn"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh forecast"
            title="Refresh"
          >
            <RefreshCw className={refreshing ? 'spin' : ''} aria-hidden="true" />
          </button>
          <span className="avatar" aria-hidden="true">{weather.sys.country}</span>
        </div>
      </div>

      <div className="workspace__body">
        <div className="workspace__head">
          <div>
            <h3 className="font-heading workspace__title">{weather.name} forecast &amp; conditions</h3>
            <p className="small muted mt-1">
              Local time {formatClock(nowUnix, tz)} · sunrise {formatClock(weather.sys.sunrise, tz)} · sunset {formatClock(weather.sys.sunset, tz)}
            </p>
          </div>
          <div className="seg" role="group" aria-label="Time range">
            {RANGES.map(([key, lbl]) => (
              <button
                key={key}
                type="button"
                className={`seg__btn${range === key ? ' is-active' : ''}`}
                aria-pressed={range === key}
                onClick={() => setRange(key)}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        <div className="kpis">
          <Kpi
            label={`Peak temperature, ${rangeLabel}`}
            value={peak.temp}
            unit={`°${unit}`}
            series={temps}
            trendUp={peak.temp >= nowTemp}
            trend={`${peak.temp >= nowTemp ? '+' : ''}${peak.temp - nowTemp}° vs now · low ${low}°`}
          />
          <Kpi
            label="Chance of precipitation"
            value={wettest.pop}
            unit="%"
            series={pops}
            trendUp={wettest.pop >= 30}
            positive={wettest.pop < 30}
            trend={wettest.pop >= 10 ? `Most likely ${wettest.full.replace(',', '')}` : 'Dry throughout'}
          />
          <Kpi
            label="Strongest wind"
            value={Math.max(...winds)}
            unit={windUnit(unit)}
            series={winds}
            trendUp={winds[winds.length - 1] >= winds[0]}
            trend={`Gusts up to ${gust} ${windUnit(unit)}`}
          />
          <Kpi
            label="Average humidity"
            value={avgHum}
            unit="%"
            series={hums}
            trendUp={hums[hums.length - 1] >= hums[0]}
            positive
            trend={`Dew point ${dew}° right now`}
          />
        </div>

        <div className="split">
          <div className="card">
            <div className="row-between wrap">
              <h4 className="card-title">Temperature vs. feels like</h4>
              <p className="small muted">°{unit} in 3-hour steps, local time</p>
            </div>
            <ul className="legend">
              <li><span className="legend__line" />Temperature</li>
              <li><span className="legend__line legend__line--dashed" />Feels like</li>
              <li><span className="legend__box" />Precipitation chance</li>
            </ul>
            <div className="chart">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 22, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1e8538" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#1e8538" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(14,26,18,0.06)" vertical={false} />
                  <XAxis
                    dataKey="dt"
                    tickFormatter={(dt) => chartData.find((d) => d.dt === dt)?.label}
                    tick={{ fill: '#58635a', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    interval={tickInterval}
                    minTickGap={8}
                  />
                  <YAxis
                    yAxisId="t"
                    tick={{ fill: '#58635a', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}°`}
                    domain={['dataMin - 2', 'dataMax + 2']}
                    allowDecimals={false}
                  />
                  <YAxis yAxisId="p" orientation="right" domain={[0, 100]} hide />
                  <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ stroke: 'rgba(14,26,18,0.18)' }} />
                  <Bar yAxisId="p" dataKey="pop" fill="#2b8cb8" fillOpacity={0.18} radius={[4, 4, 0, 0]} barSize={14} />
                  <Area
                    yAxisId="t" type="monotone" dataKey="temp" stroke="#1e8538" strokeWidth={2.25}
                    fill="url(#tempFill)" dot={false}
                    activeDot={{ r: 4.5, fill: '#1e8538', stroke: '#fff', strokeWidth: 2 }}
                  />
                  <Line
                    yAxisId="t" type="monotone" dataKey="feels" stroke="#0f2e1a" strokeOpacity={0.55}
                    strokeWidth={1.5} strokeDasharray="4 4" dot={false} activeDot={false}
                  />
                  <ReferenceLine
                    yAxisId="t" x={peak.dt} stroke="#f2643a" strokeDasharray="3 3"
                    label={{ value: `Peak ${peak.temp}°`, position: 'top', fill: '#c53c00', fontSize: 11 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card card--stack">
            <AirPanel aqi={aqi} />
            <div className="hairline" />
            <Tips tips={tips} />
          </div>
        </div>

        <Hourly data={data} unit={unit} />
      </div>
    </div>
  );
}
