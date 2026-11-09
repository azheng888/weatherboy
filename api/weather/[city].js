const { handle, currentWeather, parsePlace } = require('../_lib/openweather');

module.exports = handle((req) => currentWeather({ q: parsePlace(req.query.city) }));
