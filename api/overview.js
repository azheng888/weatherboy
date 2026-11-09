const { handle, overview } = require('./_lib/openweather');

module.exports = handle((req) => overview(req.query));
