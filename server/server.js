const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;
console.log('API Key loaded:', process.env.OPENWEATHER_API_KEY ? 'Yes' : 'No');

app.use(cors());
app.use(express.json());

const path = require('path');

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
}

app.get('/test', (req, res) => {
    res.json({ message: 'Server is working!' });
});

// Geocoding API - search for cities
app.get('/api/search/:query', async (req, res) => {
    try {
        const { query } = req.params;
        const apiKey = process.env.OPENWEATHER_API_KEY;
        
        const response = await axios.get(
            `http://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${apiKey}`
        );
        
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to search cities' });
    }
});

// Get weather by city name
app.get('/api/weather/:city', async (req, res) => {
    try {
        const { city } = req.params;
        const apiKey = process.env.OPENWEATHER_API_KEY;
        
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
        const response = await axios.get(url);

        res.json(response.data);
    } catch (error) {
        console.log('Error details:', error.response?.data);
        console.log('Error status:', error.response?.status);
        res.status(error.response?.status || 500).json({
            error: 'Failed to fetch weather data',
            details: error.response?.data
        });
    }
});

// Get weather by coordinates
app.get('/api/weather-by-coords', async (req, res) => {
    try {
        const { lat, lon } = req.query;
        const apiKey = process.env.OPENWEATHER_API_KEY;
        const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
        );
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ error: 'Failed to fetch weather data' });
    }
});

// Get forecast by coordinates
app.get('/api/forecast-by-coords', async (req, res) => {
    try {
        const { lat, lon } = req.query;
        const apiKey = process.env.OPENWEATHER_API_KEY;
        const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
        );
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch forecast data' });
    }
});

// Get AQI by coordinates
app.get('/api/aqi', async (req, res) => {
    try {
        const { lat, lon } = req.query;
        const apiKey = process.env.OPENWEATHER_API_KEY;
        const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`
        );
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch AQI data' });
    }
});

// Get 5-day forecast
app.get('/api/forecast/:city', async (req, res) => {
    try {
        const { city } = req.params;
        const apiKey = process.env.OPENWEATHER_API_KEY;
        
        const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`
        );
        
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch forecast data' });
    }
});

if (process.env.NODE_ENV === 'production') {
    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
    });
  }

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});