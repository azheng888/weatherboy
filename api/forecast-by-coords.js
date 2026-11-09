const { handle, forecast, parseCoords } = require('./_lib/openweather');

module.exports = handle((req) => forecast(parseCoords(req.query)));
