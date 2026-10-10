import { useEffect, useState } from "react";
import { Card } from "./ui/card";
import { Umbrella } from "lucide-react";
import { describeWeather, fetchForecast, type Forecast } from "@/lib/weather";

interface WeatherWidgetProps {
  latitude: number;
  longitude: number;
  cityName?: string;
}

export const WeatherWidget = ({ latitude, longitude, cityName }: WeatherWidgetProps) => {
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setForecast(await fetchForecast(latitude, longitude, 6));
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

  if (!forecast) return null;
  const weather = forecast.current;
  const { Icon, color, label } = describeWeather(weather.weatherCode, weather.isDay);
  const alert = forecast.rainAlert;

  return (
    <Card className="p-4 bg-background/50 backdrop-blur-sm border-border/50">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <Icon className={`w-8 h-8 ${color}`} />
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
              {label}
            </span>
          </div>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span>Umidade: {weather.humidity}%</span>
            <span>Vento: {weather.windSpeed} km/h</span>
            {weather.rainChance !== null && <span>Chuva: {weather.rainChance}%</span>}
          </div>
          {alert && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-sky-700 dark:text-sky-300">
              <Umbrella className="h-3.5 w-3.5 shrink-0" />
              Possibilidade de chuva às {alert.hour}h ({alert.rainChance}%)
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};
