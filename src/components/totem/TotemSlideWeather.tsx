import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Droplets, Thermometer, Wind, Umbrella } from "lucide-react";
import { describeWeather, fetchForecast, type Forecast } from "@/lib/weather";

interface TotemSlideWeatherProps {
  isActive: boolean;
}

const WeatherIcon = ({ code, isDay, className }: { code: number; isDay: boolean; className: string }) => {
  const { Icon, color } = describeWeather(code, isDay);
  return <Icon className={`${className} ${color}`} />;
};

export const TotemSlideWeather = ({ isActive }: TotemSlideWeatherProps) => {
  const [forecast, setForecast] = useState<Forecast | null>(null);
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
        setForecast(await fetchForecast(Number(settings.weather_latitude), Number(settings.weather_longitude), 6));
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

  if (!forecast) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-3xl text-muted-foreground">
          Clima não configurado
        </p>
      </div>
    );
  }

  const weather = forecast.current;
  const look = describeWeather(weather.weatherCode, weather.isDay);
  const hourly = forecast.nextHours;
  const alert = forecast.rainAlert;

  return (
    <div className="h-full flex flex-col items-center justify-center">
      {/* Main Weather Display */}
      <div className="text-center mb-12">
        <p className="text-3xl text-muted-foreground mb-4">{cityName}</p>
        
        <div className="flex items-center justify-center gap-8 mb-6">
          <WeatherIcon code={weather.weatherCode} isDay={weather.isDay} className="w-32 h-32" />
          <div>
            <p className="text-9xl font-bold text-foreground">
              {weather.temperature}°
            </p>
            <p className="text-3xl text-muted-foreground">
              {look.label}
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
          {weather.rainChance !== null && (
            <div className="flex items-center gap-3">
              <Umbrella className="w-8 h-8 text-sky-500" />
              <div className="text-left">
                <p className="text-sm text-muted-foreground">Chance de chuva</p>
                <p className="text-2xl font-bold text-foreground">{weather.rainChance}%</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Wind className="w-8 h-8 text-gray-500" />
            <div className="text-left">
              <p className="text-sm text-muted-foreground">Vento</p>
              <p className="text-2xl font-bold text-foreground">{weather.windSpeed} km/h</p>
            </div>
          </div>
        </div>
      </div>

      {alert && (
        <div className="mb-8 flex items-center gap-3 rounded-2xl bg-sky-100 dark:bg-sky-900/40 px-6 py-3 text-2xl text-sky-900 dark:text-sky-100">
          <Umbrella className="w-8 h-8 shrink-0" />
          <span>
            Possibilidade de chuva às {alert.hour}h ({alert.rainChance}%). Confira as atividades cobertas!
          </span>
        </div>
      )}

      {/* Hourly Forecast */}
      {hourly.length > 0 && (
        <div className="w-full max-w-4xl">
          <p className="text-xl text-muted-foreground mb-4 text-center">
            Próximas horas
          </p>
          <div className="flex justify-center gap-6">
            {hourly.map((hour) => (
              <div
                key={hour.hour}
                className="flex flex-col items-center p-4 bg-card rounded-xl border border-border min-w-[96px]"
              >
                <p className="text-lg text-muted-foreground">{hour.hour}h</p>
                <WeatherIcon code={hour.weatherCode} isDay={hour.isDay} className="w-10 h-10" />
                <p className="text-2xl font-bold text-foreground mt-2">{hour.temperature}°</p>
                <p className={`text-base mt-1 ${hour.rainChance >= 20 ? "text-sky-600 font-semibold" : "text-muted-foreground"}`}>
                  💧 {hour.rainChance}%
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
