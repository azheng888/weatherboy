const { handle, currentWeather, parseCoords } = require('./_lib/openweather');

module.exports = handle((req) => currentWeather(parseCoords(req.query)));
