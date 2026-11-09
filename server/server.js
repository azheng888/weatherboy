require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const ow = require('../api/_lib/openweather');

const app = express();
const PORT = process.env.PORT || 5001;
const isProd = process.env.NODE_ENV === 'production';

if (!process.env.OPENWEATHER_API_KEY) {
  console.warn('OPENWEATHER_API_KEY is not set; API requests will fail.');
}

app.use(cors());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/api/overview', ow.handle((req) => ow.overview(req.query)));
app.get('/api/search/:query', ow.handle((req) => ow.searchPlaces(req.params.query)));
app.get('/api/weather/:city', ow.handle((req) => ow.currentWeather({ q: ow.parsePlace(req.params.city) })));
app.get('/api/forecast/:city', ow.handle((req) => ow.forecast({ q: ow.parsePlace(req.params.city) })));
app.get('/api/weather-by-coords', ow.handle((req) => ow.currentWeather(ow.parseCoords(req.query))));
app.get('/api/forecast-by-coords', ow.handle((req) => ow.forecast(ow.parseCoords(req.query))));
app.get('/api/aqi', ow.handle((req) => ow.airQuality(ow.parseCoords(req.query))));

if (isProd) {
  const build = path.join(__dirname, '../client/build');
  app.use(express.static(build));
  app.get(/^(?!\/api\/).*/, (req, res) => res.sendFile(path.join(build, 'index.html')));
}

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
