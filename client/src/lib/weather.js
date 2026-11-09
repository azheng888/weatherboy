// Pure helpers for turning OpenWeather payloads into what the UI shows.
// All temperatures arrive in °C and wind in m/s (units=metric).

// ── Units ────────────────────────────────────────────────

export const toTemp = (c, unit) => Math.round(unit === 'F' ? c * 9 / 5 + 32 : c);

export const windUnit = (unit) => (unit === 'F' ? 'mph' : 'km/h');
export const toWind = (ms, unit) => Math.round(unit === 'F' ? ms * 2.23694 : ms * 3.6);

export const distanceUnit = (unit) => (unit === 'F' ? 'mi' : 'km');
export const toDistance = (meters, unit) => {
  const v = unit === 'F' ? meters / 1609.34 : meters / 1000;
  return v >= 10 ? Math.round(v) : Math.round(v * 10) / 10;
};

export const pressureUnit = (unit) => (unit === 'F' ? 'inHg' : 'hPa');
export const toPressure = (hpa, unit) =>
  unit === 'F' ? Math.round(hpa * 0.02953 * 100) / 100 : Math.round(hpa);

/** Magnus approximation, °C in / °C out. */
export const dewPoint = (tempC, humidity) => {
  const a = 17.62;
  const b = 243.12;
  const g = Math.log(Math.max(humidity, 1) / 100) + (a * tempC) / (b + tempC);
  return (b * g) / (a - g);
};

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
export const compass = (deg = 0) => COMPASS[Math.round(((deg % 360) / 22.5)) % 16];

// ── Time (always in the place's own timezone) ───────────
// OpenWeather gives a UTC offset in seconds; shifting the timestamp and
// formatting as UTC yields the wall-clock time at that place.

const shifted = (unix, tzOffset) => new Date((unix + tzOffset) * 1000);

export const formatClock = (unix, tzOffset) =>
  shifted(unix, tzOffset).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });

export const formatHour = (unix, tzOffset) =>
  shifted(unix, tzOffset).toLocaleTimeString('en-US', { hour: 'numeric', timeZone: 'UTC' });

export const formatWeekday = (unix, tzOffset, style = 'short') =>
  shifted(unix, tzOffset).toLocaleDateString('en-US', { weekday: style, timeZone: 'UTC' });

export const formatDate = (unix, tzOffset) =>
  shifted(unix, tzOffset).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });

export const localDayKey = (unix, tzOffset) => shifted(unix, tzOffset).toISOString().slice(0, 10);

export const localHour = (unix, tzOffset) => shifted(unix, tzOffset).getUTCHours();

export const isNightAt = (weather, unix = weather.dt) =>
  unix < weather.sys.sunrise || unix >= weather.sys.sunset;

// ── Conditions ──────────────────────────────────────────

/** Maps an OpenWeather condition id to a coarse group used for icons, scenes and copy. */
export function conditionGroup(id) {
  if (id >= 200 && id < 300) return 'storm';
  if (id >= 300 && id < 400) return 'drizzle';
  if (id >= 500 && id < 600) return 'rain';
  if (id >= 600 && id < 700) return 'snow';
  if (id >= 700 && id < 800) return 'fog';
  if (id === 800) return 'clear';
  if (id <= 802) return 'partly';
  return 'cloudy';
}

const GROUP_PHRASE = {
  storm: 'Thunderstorms',
  drizzle: 'Drizzle',
  rain: 'Rain',
  snow: 'Snow',
  fog: 'Mist and haze',
  clear: 'Clear skies',
  partly: 'Some clouds',
  cloudy: 'Cloudy skies',
};

export const capitalize = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * One calm sentence about what happens next, e.g. "Clear skies until 6 PM,
 * then rain." Looks across the next 24 hours of 3-hour slots.
 */
export function outlookSentence(weather, forecast) {
  const tz = weather.timezone;
  const now = conditionGroup(weather.weather[0].id);
  const slots = forecast.list.slice(0, 8);
  const change = slots.find((s) => conditionGroup(s.weather[0].id) !== now);
  const lead = GROUP_PHRASE[now];
  if (!change) return `${lead} for the next 24 hours.`;
  const next = GROUP_PHRASE[conditionGroup(change.weather[0].id)].toLowerCase();
  return `${lead} until around ${formatHour(change.dt, tz)}, then ${next}.`;
}

// ── Aggregation ─────────────────────────────────────────

const mostCommon = (arr) => {
  const counts = new Map();
  arr.forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
};

/**
 * Collapses 3-hour forecast slots into local calendar days with true
 * highs/lows, the max chance of precipitation and a representative condition
 * (preferring daytime slots).
 */
export function dailySummary(forecast, tzOffset) {
  const days = new Map();
  forecast.list.forEach((slot) => {
    const key = localDayKey(slot.dt, tzOffset);
    if (!days.has(key)) days.set(key, []);
    days.get(key).push(slot);
  });

  return [...days.entries()].map(([key, slots]) => {
    const daytime = slots.filter((s) => {
      const h = localHour(s.dt, tzOffset);
      return h >= 9 && h <= 18;
    });
    const rep = daytime.length ? daytime : slots;
    const id = mostCommon(rep.map((s) => s.weather[0].id));
    const sample = rep.find((s) => s.weather[0].id === id);
    return {
      key,
      dt: slots[0].dt,
      high: Math.max(...slots.map((s) => s.main.temp_max)),
      low: Math.min(...slots.map((s) => s.main.temp_min)),
      pop: Math.max(...slots.map((s) => s.pop || 0)),
      rain: slots.reduce((sum, s) => sum + (s.rain?.['3h'] || 0) + (s.snow?.['3h'] || 0), 0),
      wind: Math.max(...slots.map((s) => s.wind.speed)),
      id,
      description: sample.weather[0].description,
      slots: slots.length,
    };
  });
}

/** Slots for a dashboard range: next 24h, tomorrow (local), or the whole 5 days. */
export function slotsForRange(forecast, tzOffset, range, nowUnix) {
  const list = forecast.list;
  if (range === '24h') return list.slice(0, 9);
  if (range === 'tomorrow') {
    const tomorrow = localDayKey(nowUnix + 86400, tzOffset);
    const slots = list.filter((s) => localDayKey(s.dt, tzOffset) === tomorrow);
    return slots.length ? slots : list.slice(8, 16);
  }
  return list;
}

// ── Air quality ─────────────────────────────────────────

export const AQI_LEVELS = [
  { label: 'Good', color: '#57c76a', advice: 'Air is clean. Enjoy time outside.' },
  { label: 'Fair', color: '#a6c94a', advice: 'Acceptable for nearly everyone.' },
  { label: 'Moderate', color: '#e9b23a', advice: 'Sensitive groups should ease off long efforts.' },
  { label: 'Poor', color: '#f2643a', advice: 'Limit prolonged outdoor exertion.' },
  { label: 'Very poor', color: '#c53c00', advice: 'Stay indoors where you can.' },
];

// ── Suggestions ─────────────────────────────────────────

/**
 * Practical, data-driven suggestions for the day, in the spirit of
 * "recommended actions". Each has a kind (for the icon), title and detail.
 */
export function suggestions({ weather, forecast, aqi, unit }) {
  const tz = weather.timezone;
  const next = forecast.list.slice(0, 5); // ~next 15h
  const out = [];

  const wet = next.find((s) => (s.pop || 0) >= 0.4);
  if (wet) {
    out.push({
      kind: 'umbrella',
      title: 'Bring an umbrella',
      detail: `${Math.round(wet.pop * 100)}% chance of precipitation around ${formatHour(wet.dt, tz)}`,
    });
  }

  const feels = weather.main.feels_like;
  if (feels <= 5) {
    out.push({ kind: 'cold', title: 'Layer up', detail: `Feels like ${toTemp(feels, unit)}° right now` });
  } else if (feels >= 30) {
    out.push({ kind: 'heat', title: 'Stay hydrated', detail: `Feels like ${toTemp(feels, unit)}°; seek shade at midday` });
  }

  const gust = weather.wind.gust || weather.wind.speed;
  if (gust >= 10) {
    out.push({ kind: 'wind', title: 'Secure loose items', detail: `Gusts up to ${toWind(gust, unit)} ${windUnit(unit)}` });
  }

  const aqiValue = aqi?.list?.[0]?.main?.aqi;
  if (aqiValue >= 3) {
    out.push({ kind: 'air', title: 'Go easy outdoors', detail: AQI_LEVELS[aqiValue - 1].advice });
  }

  const isNight = isNightAt(weather);
  const group = conditionGroup(weather.weather[0].id);
  if (!isNight && (group === 'clear' || group === 'partly') && weather.clouds.all < 40) {
    out.push({ kind: 'sun', title: 'Wear sunscreen', detail: `Sun until ${formatClock(weather.sys.sunset, tz)}` });
  }

  const visibility = weather.visibility ?? 10000;
  if (visibility < 2000) {
    out.push({ kind: 'fog', title: 'Drive with care', detail: `Visibility is ${toDistance(visibility, unit)} ${distanceUnit(unit)}` });
  }

  if (!out.length) {
    out.push({ kind: 'ok', title: 'A calm day', detail: 'Nothing unusual in the next 15 hours' });
  }
  return out.slice(0, 3);
}

// ── Sun position ────────────────────────────────────────

/** 0 at sunrise, 1 at sunset; clamped. */
export const daylightProgress = (weather, unix = weather.dt) => {
  const { sunrise, sunset } = weather.sys;
  return Math.min(1, Math.max(0, (unix - sunrise) / (sunset - sunrise)));
};

export const daylightLength = (weather) => {
  const mins = Math.round((weather.sys.sunset - weather.sys.sunrise) / 60);
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

export const placeLabel = (weather) => `${weather.name}, ${weather.sys.country}`;
