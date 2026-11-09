const { handle, searchPlaces } = require('../_lib/openweather');

module.exports = handle((req) => searchPlaces(req.query.query));
