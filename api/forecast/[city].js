const { handle, forecast, parsePlace } = require('../_lib/openweather');

module.exports = handle((req) => forecast({ q: parsePlace(req.query.city) }));
