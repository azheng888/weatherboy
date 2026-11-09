const { handle, airQuality, parseCoords } = require('./_lib/openweather');

module.exports = handle((req) => airQuality(parseCoords(req.query)));
