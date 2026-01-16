import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Cloud, CloudRain, Sun, CloudSnow, Wind } from "lucide-react";

interface TotemHeaderProps {
  qrCodeUrl: string | null;
}

interface WeatherData {
  temperature: number;
  weatherCode: number;
}

interface SiteSettings {
  logo_url: string | null;
  site_name: string | null;
  weather_latitude: number | null;
  weather_longitude: number | null;
  weather_city_name: string | null;
}

const getWeatherIcon = (code: number) => {
  if (code === 0) return <Sun className="w-10 h-10 text-yellow-500" />;
  if (code <= 3) return <Cloud className="w-10 h-10 text-gray-400" />;
  if (code <= 67) return <CloudRain className="w-10 h-10 text-blue-500" />;
  if (code <= 77) return <CloudSnow className="w-10 h-10 text-blue-300" />;
  return <Wind className="w-10 h-10 text-gray-500" />;
};

export const TotemHeader = ({ qrCodeUrl }: TotemHeaderProps) => {
  const [time, setTime] = useState(new Date());
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("*")
        .single();

      if (data) {
        setSettings(data);
        if (data.logo_url) {
          const { data: urlData } = supabase.storage
            .from("logos")
            .getPublicUrl(data.logo_url);
          setLogoUrl(urlData.publicUrl);
        }
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const fetchWeather = async () => {
      if (!settings?.weather_latitude || !settings?.weather_longitude) return;

      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${settings.weather_latitude}&longitude=${settings.weather_longitude}&current=temperature_2m,weather_code&timezone=auto`
        );
        const data = await response.json();
        setWeather({
          temperature: Math.round(data.current.temperature_2m),
          weatherCode: data.current.weather_code,
        });
      } catch (error) {
        console.error("Error fetching weather:", error);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 1800000);
    return () => clearInterval(interval);
  }, [settings?.weather_latitude, settings?.weather_longitude]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  return (
    <header className="flex items-center justify-between px-8 py-6 border-b border-border/30 bg-background/80 backdrop-blur-sm">
      {/* Logo / Site Name */}
      <div className="flex items-center gap-4">
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" className="h-16 w-auto object-contain" />
        ) : (
          <h1 className="text-3xl font-bold text-foreground">
            {settings?.site_name || "Recreação Hotel"}
          </h1>
        )}
      </div>

      {/* Weather */}
      {weather && (
        <div className="flex items-center gap-3">
          {getWeatherIcon(weather.weatherCode)}
          <div className="text-right">
            <p className="text-4xl font-bold text-foreground">{weather.temperature}°C</p>
            {settings?.weather_city_name && (
              <p className="text-sm text-muted-foreground">{settings.weather_city_name}</p>
            )}
          </div>
        </div>
      )}

      {/* Clock */}
      <div className="text-right">
        <p className="text-5xl font-bold text-foreground tabular-nums">
          {formatTime(time)}
        </p>
        <p className="text-lg text-muted-foreground capitalize">
          {formatDate(time)}
        </p>
      </div>
    </header>
  );
};
