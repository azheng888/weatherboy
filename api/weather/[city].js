const axios = require('axios');

module.exports = async (req, res) => {
    const { city } = req.query;
    const apiKey = process.env.OPENWEATHER_API_KEY;
    try {
        const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`
        );
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({
            error: 'Failed to fetch weather data',
            details: error.response?.data
        });
    }
};
