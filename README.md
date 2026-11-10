# WeatherBoy

A weather dashboard built with React and Node.js. Search any city or use your location to see current conditions, a 5-day forecast, and air quality.

**Live demo:** [weatherboy-green.vercel.app](https://weatherboy-green.vercel.app)

## Features

- Live city search with autocomplete and keyboard navigation (`/` to focus, arrow keys to choose, `Esc` to close)
- Weather for your current location via the browser's geolocation API
- Current conditions: temperature, feels-like, humidity, wind, visibility, sunrise and sunset
- Temperature chart and a 5-day forecast
- Air quality index (AQI)
- Saved favorite places and a °F / °C toggle, remembered between visits
- Animated sky scene that changes with the current conditions

## Tech stack

- **Frontend:** React 19, Recharts, Lucide icons
- **Backend:** Express 5 for local development; Vercel serverless functions in production
- **Data:** [OpenWeather API](https://openweathermap.org/api) (geocoding, current weather, forecast, air pollution)

The API key never reaches the browser. All requests go through the server, which adds the key, caches responses for 5 minutes and converts upstream errors into clear messages.

## Project structure

```
api/            Vercel serverless functions (one per endpoint)
api/_lib/       Shared OpenWeather client, caching and error handling
server/         Express server used for local development
client/         React app (Create React App)
```

## Running locally

1. Get a free API key from [OpenWeather](https://home.openweathermap.org/api_keys).
2. Create a `.env` file in the project root:
   ```
   OPENWEATHER_API_KEY=your_key_here
   ```
3. Install dependencies and start both servers:
   ```bash
   npm run install-all
   npm run dev                # API on http://localhost:5001
   cd client && npm start     # app on http://localhost:3000
   ```

## Tests

```bash
cd client && npm test
```
