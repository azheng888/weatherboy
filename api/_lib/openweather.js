const axios = require('axios');

const BASE = 'https://api.openweathermap.org';
const TTL_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 500;
const cache = new Map();

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function owm(path, params) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) throw new HttpError(500, 'Weather service is not configured.');

  const key = `${path}?${new URLSearchParams(params).toString()}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;

  try {
    const { data } = await axios.get(`${BASE}${path}`, {
      params: { ...params, appid: apiKey },
      timeout: 8000,
    });
    if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value);
    cache.set(key, { at: Date.now(), data });
    return data;
  } catch (err) {
    const status = err.response?.status;
    if (status === 404) throw new HttpError(404, 'We couldn’t find that place.');
    if (status === 401) throw new HttpError(500, 'Weather service is not configured.');
    if (status === 429) throw new HttpError(429, 'Too many requests. Try again in a minute.');
    throw new HttpError(502, 'The weather service is unavailable right now.');
  }
}

function parseCoords(query) {
  const lat = Number(query.lat);
  const lon = Number(query.lon);
  if (
    query.lat === undefined || query.lon === undefined ||
    !Number.isFinite(lat) || !Number.isFinite(lon) ||
    Math.abs(lat) > 90 || Math.abs(lon) > 180
  ) {
    throw new HttpError(400, 'Invalid coordinates.');
  }
  return { lat: lat.toFixed(4), lon: lon.toFixed(4) };
}

function parsePlace(value) {
  const q = String(value ?? '').trim();
  if (!q || q.length > 100) throw new HttpError(400, 'Enter a place name.');
  return q;
}

const searchPlaces = (query) =>
  owm('/geo/1.0/direct', { q: parsePlace(query), limit: 5 });

const currentWeather = (loc) =>
  owm('/data/2.5/weather', { ...loc, units: 'metric' });

const forecast = (loc) =>
  owm('/data/2.5/forecast', { ...loc, units: 'metric' });

const airQuality = (coords) => owm('/data/2.5/air_pollution', coords);

/**
 * Everything the dashboard needs in one round trip. Accepts either
 * `?q=City` or `?lat=..&lon=..`. Air quality is best-effort.
 */
async function overview(query) {
  const loc = query.q !== undefined ? { q: parsePlace(query.q) } : parseCoords(query);
  const [weather, fc] = await Promise.all([currentWeather(loc), forecast(loc)]);
  const coords = { lat: weather.coord.lat.toFixed(4), lon: weather.coord.lon.toFixed(4) };
  const aqi = await airQuality(coords).catch(() => null);
  return { weather, forecast: fc, aqi };
}

/** Wraps a data-producing function as a JSON request handler. */
function handle(fn) {
  return async (req, res) => {
    try {
      const data = await fn(req);
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      res.status(200).json(data);
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      if (status >= 500) console.error(err);
      res.status(status).json({ error: err instanceof HttpError ? err.message : 'Something went wrong.' });
    }
  };
}

module.exports = {
  HttpError, handle, parseCoords, parsePlace,
  searchPlaces, currentWeather, forecast, airQuality, overview,
};
