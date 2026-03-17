const axios = require('axios');

module.exports = async (req, res) => {
    const { lat, lon } = req.query;
    const apiKey = process.env.OPENWEATHER_API_KEY;
    try {
        const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
        );
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch forecast data' });
    }
};
