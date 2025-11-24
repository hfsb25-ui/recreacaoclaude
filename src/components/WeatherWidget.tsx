import { useEffect, useState } from "react";
import { Card } from "./ui/card";
import { Cloud, CloudRain, Sun, CloudSnow, Wind } from "lucide-react";

interface WeatherData {
  temperature: number;
  weatherCode: number;
  humidity: number;
  windSpeed: number;
}

interface WeatherWidgetProps {
  latitude: number;
  longitude: number;
  cityName?: string;
}

const getWeatherIcon = (code: number) => {
  if (code === 0) return <Sun className="w-8 h-8 text-yellow-500" />;
  if (code <= 3) return <Cloud className="w-8 h-8 text-gray-400" />;
  if (code <= 67) return <CloudRain className="w-8 h-8 text-blue-500" />;
  if (code <= 77) return <CloudSnow className="w-8 h-8 text-blue-300" />;
  return <Wind className="w-8 h-8 text-gray-500" />;
};

const getWeatherDescription = (code: number): string => {
  if (code === 0) return "Céu limpo";
  if (code <= 3) return "Parcialmente nublado";
  if (code <= 48) return "Nublado";
  if (code <= 67) return "Chuva";
  if (code <= 77) return "Neve";
  if (code <= 82) return "Aguaceiros";
  if (code <= 86) return "Chuva forte";
  return "Tempestade";
};

export const WeatherWidget = ({ latitude, longitude, cityName }: WeatherWidgetProps) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`
        );
        const data = await response.json();
        
        setWeather({
          temperature: Math.round(data.current.temperature_2m),
          weatherCode: data.current.weather_code,
          humidity: data.current.relative_humidity_2m,
          windSpeed: Math.round(data.current.wind_speed_10m),
        });
      } catch (error) {
        console.error("Erro ao buscar dados do clima:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
    // Atualizar a cada 30 minutos
    const interval = setInterval(fetchWeather, 1800000);
    return () => clearInterval(interval);
  }, [latitude, longitude]);

  if (loading) {
    return (
      <Card className="p-4 bg-background/50 backdrop-blur-sm border-border/50">
        <div className="flex items-center gap-4 animate-pulse">
          <div className="w-16 h-16 bg-muted rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-24" />
            <div className="h-3 bg-muted rounded w-32" />
          </div>
        </div>
      </Card>
    );
  }

  if (!weather) return null;

  return (
    <Card className="p-4 bg-background/50 backdrop-blur-sm border-border/50">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          {getWeatherIcon(weather.weatherCode)}
        </div>
        <div className="flex-1">
          {cityName && (
            <p className="text-sm text-muted-foreground font-medium mb-1">
              {cityName}
            </p>
          )}
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">
              {weather.temperature}°C
            </span>
            <span className="text-sm text-muted-foreground">
              {getWeatherDescription(weather.weatherCode)}
            </span>
          </div>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span>Umidade: {weather.humidity}%</span>
            <span>Vento: {weather.windSpeed} km/h</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
