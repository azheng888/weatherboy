const axios = require('axios');

module.exports = async (req, res) => {
    const { query } = req.query;
    const apiKey = process.env.OPENWEATHER_API_KEY;
    try {
        const response = await axios.get(
            `http://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${apiKey}`
        );
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to search cities' });
    }
};
