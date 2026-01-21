const axios = require('axios');

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const GEO_URL = 'https://api.openweathermap.org/geo/1.0';

// Hardcoded location for Caloocan City Bagong Silang
const DEFAULT_LOCATION = {
    name: 'Caloocan City Bagong Silang',
    lat: 14.7565,
    lon: 121.0174
};

/**
 * Get current weather data for the default location
 */
const getCurrentWeather = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/weather`, {
            params: {
                lat: DEFAULT_LOCATION.lat,
                lon: DEFAULT_LOCATION.lon,
                appid: OPENWEATHER_API_KEY,
                units: 'metric'
            }
        });

        const data = response.data;

        return {
            temperature: Math.round(data.main.temp),
            feelsLike: Math.round(data.main.feels_like),
            humidity: data.main.humidity,
            pressure: data.main.pressure,
            windSpeed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
            description: data.weather[0].description,
            icon: data.weather[0].icon,
            location: DEFAULT_LOCATION.name
        };
    } catch (error) {
        console.error('Error fetching current weather:', error.message);
        throw new Error('Failed to fetch current weather data');
    }
};

/**
 * Get hourly forecast (OpenWeather provides 3-hour intervals in free tier)
 */
const getHourlyForecast = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/forecast`, {
            params: {
                lat: DEFAULT_LOCATION.lat,
                lon: DEFAULT_LOCATION.lon,
                appid: OPENWEATHER_API_KEY,
                units: 'metric',
                cnt: 16 // Get next 16 intervals (48 hours)
            }
        });

        const hourlyData = response.data.list.map(item => ({
            timestamp: item.dt,
            time: new Date(item.dt * 1000).toLocaleTimeString('en-US', {
                hour: '2-digit',
                hour12: true
            }),
            temperature: Math.round(item.main.temp),
            feelsLike: Math.round(item.main.feels_like),
            humidity: item.main.humidity,
            description: item.weather[0].description,
            icon: item.weather[0].icon,
            windSpeed: Math.round(item.wind.speed * 3.6), // Convert m/s to km/h
            precipitation: item.pop * 100 // Probability of precipitation in %
        }));

        return hourlyData;
    } catch (error) {
        console.error('Error fetching hourly forecast:', error.message);
        throw new Error('Failed to fetch hourly forecast data');
    }
};

/**
 * Get 7-day weather forecast
 */
const getWeeklyForecast = async () => {
    try {
        // OpenWeather free tier only provides 5-day forecast with 3-hour intervals
        // We'll process this to get daily forecasts
        const response = await axios.get(`${BASE_URL}/forecast`, {
            params: {
                lat: DEFAULT_LOCATION.lat,
                lon: DEFAULT_LOCATION.lon,
                appid: OPENWEATHER_API_KEY,
                units: 'metric'
            }
        });

        // Group forecast data by day
        const dailyData = {};
        response.data.list.forEach(item => {
            const date = new Date(item.dt * 1000);
            const dayKey = date.toLocaleDateString('en-US', { weekday: 'long' });

            if (!dailyData[dayKey]) {
                dailyData[dayKey] = {
                    temps: [],
                    descriptions: [],
                    icons: [],
                    humidity: [],
                    windSpeed: []
                };
            }

            dailyData[dayKey].temps.push(item.main.temp);
            dailyData[dayKey].descriptions.push(item.weather[0].description);
            dailyData[dayKey].icons.push(item.weather[0].icon);
            dailyData[dayKey].humidity.push(item.main.humidity);
            dailyData[dayKey].windSpeed.push(item.wind.speed);
        });

        // Calculate daily averages and highs/lows
        const weeklyForecast = Object.keys(dailyData).map((day, index) => {
            const dayData = dailyData[day];
            const temps = dayData.temps;

            // Get most common weather condition
            const conditionCounts = {};
            dayData.descriptions.forEach(desc => {
                conditionCounts[desc] = (conditionCounts[desc] || 0) + 1;
            });
            const mostCommonCondition = Object.keys(conditionCounts).reduce((a, b) =>
                conditionCounts[a] > conditionCounts[b] ? a : b
            );

            // Get most common icon
            const iconCounts = {};
            dayData.icons.forEach(icon => {
                iconCounts[icon] = (iconCounts[icon] || 0) + 1;
            });
            const mostCommonIcon = Object.keys(iconCounts).reduce((a, b) =>
                iconCounts[a] > iconCounts[b] ? a : b
            );

            return {
                day: index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : day,
                high: Math.round(Math.max(...temps)),
                low: Math.round(Math.min(...temps)),
                condition: mostCommonCondition,
                icon: mostCommonIcon,
                humidity: Math.round(dayData.humidity.reduce((a, b) => a + b, 0) / dayData.humidity.length),
                windSpeed: Math.round((dayData.windSpeed.reduce((a, b) => a + b, 0) / dayData.windSpeed.length) * 3.6)
            };
        });

        // Return only first 5 days (OpenWeather free tier limitation)
        return weeklyForecast.slice(0, 5);
    } catch (error) {
        console.error('Error fetching weekly forecast:', error.message);
        throw new Error('Failed to fetch weekly forecast data');
    }
};

/**
 * Get comprehensive weather data including current, hourly, and weekly forecasts
 */
const getCompleteWeatherData = async () => {
    try {
        const [current, hourly, weekly] = await Promise.all([
            getCurrentWeather(),
            getHourlyForecast(),
            getWeeklyForecast()
        ]);

        return {
            current,
            hourly,
            weekly,
            location: DEFAULT_LOCATION
        };
    } catch (error) {
        console.error('Error fetching complete weather data:', error.message);
        throw new Error('Failed to fetch weather data');
    }
};

module.exports = {
    getCurrentWeather,
    getHourlyForecast,
    getWeeklyForecast,
    getCompleteWeatherData
};
