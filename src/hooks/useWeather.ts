import { useState, useEffect } from 'react';
import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, Sun, Wind, CloudDrizzle } from 'lucide-react';

interface WeatherData {
    temperature: number;
    weatherCode: number;
    isDay: boolean;
    hourly?: {
        time: string[];
        temperature2m: number[];
        precipitationProbability: number[];
        weatherCode: number[];
    };
    daily?: {
        time: string[];
        weatherCode: number[];
        temperature2mMax: number[];
        temperature2mMin: number[];
    };
}

export function useWeather() {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!navigator.geolocation) {
            setError("Géolocalisation non supportée");
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    const res = await fetch(
                        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,is_day,weather_code&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
                    );

                    if (!res.ok) throw new Error("Erreur météo");

                    const data = await res.json();
                    setWeather({
                        temperature: Math.round(data.current.temperature_2m),
                        weatherCode: data.current.weather_code,
                        isDay: data.current.is_day === 1,
                        hourly: {
                            time: data.hourly.time,
                            temperature2m: data.hourly.temperature_2m,
                            precipitationProbability: data.hourly.precipitation_probability,
                            weatherCode: data.hourly.weather_code
                        },
                        daily: {
                            time: data.daily.time,
                            weatherCode: data.daily.weather_code,
                            temperature2mMax: data.daily.temperature_2m_max,
                            temperature2mMin: data.daily.temperature_2m_min
                        }
                    });
                } catch (err) {
                    setError("Impossible de charger la météo");
                    console.error(err);
                } finally {
                    setLoading(false);
                }
            },
            (err) => {
                setError("Accès position refusé");
                setLoading(false);
            }
        );
    }, []);

    const getWeatherIcon = (code: number, isDay: boolean) => {
        // WMO Weather interpretation codes (https://open-meteo.com/en/docs)
        if (code === 0) return Sun; // Clear sky
        if (code === 1 || code === 2 || code === 3) return Cloud; // Cloudy
        if (code === 45 || code === 48) return CloudFog; // Fog
        if (code >= 51 && code <= 55) return CloudDrizzle; // Drizzle
        if (code >= 61 && code <= 67) return CloudRain; // Rain
        if (code >= 71 && code <= 77) return CloudSnow; // Snow
        if (code >= 80 && code <= 82) return CloudRain; // Showers
        if (code >= 95 && code <= 99) return CloudLightning; // Thunderstorm
        return Sun;
    };

    return { weather, loading, error, getWeatherIcon };
}
