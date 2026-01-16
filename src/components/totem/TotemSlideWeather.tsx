import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Cloud, CloudRain, Sun, CloudSnow, Wind, Droplets, Thermometer } from "lucide-react";

interface WeatherData {
  temperature: number;
  weatherCode: number;
  humidity: number;
  windSpeed: number;
  feelsLike: number;
}

interface HourlyForecast {
  time: string;
  temperature: number;
  weatherCode: number;
}

interface TotemSlideWeatherProps {
  isActive: boolean;
}

const getWeatherIcon = (code: number, size: string = "w-16 h-16") => {
  const classes = size;
  if (code === 0) return <Sun className={`${classes} text-yellow-500`} />;
  if (code <= 3) return <Cloud className={`${classes} text-gray-400`} />;
  if (code <= 67) return <CloudRain className={`${classes} text-blue-500`} />;
  if (code <= 77) return <CloudSnow className={`${classes} text-blue-300`} />;
  return <Wind className={`${classes} text-gray-500`} />;
};

const getWeatherDescription = (code: number): string => {
  if (code === 0) return "Céu limpo";
  if (code <= 3) return "Parcialmente nublado";
  if (code <= 48) return "Nublado";
  if (code <= 67) return "Chuva";
  if (code <= 77) return "Neve";
  if (code <= 82) return "Aguaceiros";
  return "Tempestade";
};

export const TotemSlideWeather = ({ isActive }: TotemSlideWeatherProps) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [hourly, setHourly] = useState<HourlyForecast[]>([]);
  const [cityName, setCityName] = useState<string>("Carregando...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      const { data: settings } = await supabase
        .from("site_settings")
        .select("weather_latitude, weather_longitude, weather_city_name")
        .single();

      if (!settings?.weather_latitude || !settings?.weather_longitude) {
        setLoading(false);
        return;
      }

      setCityName(settings.weather_city_name || "Localização");

      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${settings.weather_latitude}&longitude=${settings.weather_longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature&hourly=temperature_2m,weather_code&timezone=auto`
        );
        const data = await response.json();

        setWeather({
          temperature: Math.round(data.current.temperature_2m),
          weatherCode: data.current.weather_code,
          humidity: data.current.relative_humidity_2m,
          windSpeed: Math.round(data.current.wind_speed_10m),
          feelsLike: Math.round(data.current.apparent_temperature),
        });

        // Get next 6 hours
        const currentHour = new Date().getHours();
        const hourlyData: HourlyForecast[] = [];
        for (let i = currentHour + 1; i < currentHour + 7 && i < 24; i++) {
          hourlyData.push({
            time: `${i}:00`,
            temperature: Math.round(data.hourly.temperature_2m[i]),
            weatherCode: data.hourly.weather_code[i],
          });
        }
        setHourly(hourlyData);
      } catch (error) {
        console.error("Error fetching weather:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 1800000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-2xl text-muted-foreground">
          Carregando clima...
        </div>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-3xl text-muted-foreground">
          Clima não configurado
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center">
      {/* Main Weather Display */}
      <div className="text-center mb-12">
        <p className="text-3xl text-muted-foreground mb-4">{cityName}</p>
        
        <div className="flex items-center justify-center gap-8 mb-6">
          {getWeatherIcon(weather.weatherCode, "w-32 h-32")}
          <div>
            <p className="text-9xl font-bold text-foreground">
              {weather.temperature}°
            </p>
            <p className="text-3xl text-muted-foreground">
              {getWeatherDescription(weather.weatherCode)}
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="flex justify-center gap-12 mt-8">
          <div className="flex items-center gap-3">
            <Thermometer className="w-8 h-8 text-orange-500" />
            <div className="text-left">
              <p className="text-sm text-muted-foreground">Sensação</p>
              <p className="text-2xl font-bold text-foreground">{weather.feelsLike}°C</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Droplets className="w-8 h-8 text-blue-500" />
            <div className="text-left">
              <p className="text-sm text-muted-foreground">Umidade</p>
              <p className="text-2xl font-bold text-foreground">{weather.humidity}%</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Wind className="w-8 h-8 text-gray-500" />
            <div className="text-left">
              <p className="text-sm text-muted-foreground">Vento</p>
              <p className="text-2xl font-bold text-foreground">{weather.windSpeed} km/h</p>
            </div>
          </div>
        </div>
      </div>

      {/* Hourly Forecast */}
      {hourly.length > 0 && (
        <div className="w-full max-w-4xl">
          <p className="text-xl text-muted-foreground mb-4 text-center">
            Próximas horas
          </p>
          <div className="flex justify-center gap-6">
            {hourly.map((hour, index) => (
              <div
                key={index}
                className="flex flex-col items-center p-4 bg-card rounded-xl border border-border"
              >
                <p className="text-lg text-muted-foreground">{hour.time}</p>
                {getWeatherIcon(hour.weatherCode, "w-10 h-10")}
                <p className="text-2xl font-bold text-foreground mt-2">
                  {hour.temperature}°
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
