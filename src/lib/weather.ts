import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudRainWind,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
  type LucideIcon,
} from "lucide-react";

/** Condição do tempo a partir do código WMO usado pelo Open-Meteo */
export interface WeatherLook {
  label: string;
  Icon: LucideIcon;
  color: string;
}

export const describeWeather = (code: number, isDay = true): WeatherLook => {
  switch (code) {
    case 0:
      return isDay
        ? { label: "Céu limpo", Icon: Sun, color: "text-yellow-500" }
        : { label: "Céu limpo", Icon: Moon, color: "text-indigo-300" };
    case 1:
      return isDay
        ? { label: "Poucas nuvens", Icon: CloudSun, color: "text-yellow-500" }
        : { label: "Poucas nuvens", Icon: CloudMoon, color: "text-indigo-300" };
    case 2:
      return isDay
        ? { label: "Parcialmente nublado", Icon: CloudSun, color: "text-gray-400" }
        : { label: "Parcialmente nublado", Icon: CloudMoon, color: "text-gray-400" };
    case 3:
      return { label: "Nublado", Icon: Cloud, color: "text-gray-400" };
    case 45:
    case 48:
      return { label: "Neblina", Icon: CloudFog, color: "text-gray-400" };
    case 51:
    case 53:
    case 55:
    case 56:
    case 57:
      return { label: "Garoa", Icon: CloudDrizzle, color: "text-sky-500" };
    case 61:
      return { label: "Chuva fraca", Icon: CloudRain, color: "text-blue-500" };
    case 63:
    case 66:
      return { label: "Chuva", Icon: CloudRain, color: "text-blue-500" };
    case 65:
    case 67:
      return { label: "Chuva forte", Icon: CloudRain, color: "text-blue-600" };
    case 80:
      return { label: "Pancadas de chuva fracas", Icon: CloudRainWind, color: "text-blue-500" };
    case 81:
      return { label: "Pancadas de chuva", Icon: CloudRainWind, color: "text-blue-500" };
    case 82:
      return { label: "Pancadas fortes de chuva", Icon: CloudRainWind, color: "text-blue-600" };
    case 95:
      return { label: "Trovoada", Icon: CloudLightning, color: "text-purple-500" };
    case 96:
    case 99:
      return { label: "Trovoada com granizo", Icon: CloudLightning, color: "text-purple-600" };
    default:
      if (code >= 71 && code <= 86) return { label: "Neve", Icon: CloudSnow, color: "text-blue-300" };
      return { label: "Nublado", Icon: Cloud, color: "text-gray-400" };
  }
};

export interface CurrentWeather {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  isDay: boolean;
  rainChance: number | null;
}

export interface HourForecast {
  hour: number;
  temperature: number;
  weatherCode: number;
  isDay: boolean;
  rainChance: number;
}

export interface Forecast {
  current: CurrentWeather;
  nextHours: HourForecast[];
  /** primeira hora (nas próximas horas) com chance de chuva alta */
  rainAlert: HourForecast | null;
}

export const RAIN_ALERT_THRESHOLD = 60;

/** Busca o tempo atual e as próximas horas (passa da meia-noite sem cortar) */
export const fetchForecast = async (latitude: number, longitude: number, hours = 6): Promise<Forecast> => {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature,is_day` +
    `&hourly=temperature_2m,weather_code,precipitation_probability,is_day` +
    `&forecast_days=2&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo respondeu ${res.status}`);
  const data = await res.json();

  const times: string[] = data.hourly.time;
  // a hora atual no fuso do hotel, ex.: "2026-10-10T19"
  const currentHourKey = String(data.current.time).slice(0, 13);
  const idx = Math.max(0, times.findIndex((t) => t.slice(0, 13) === currentHourKey));

  const nextHours: HourForecast[] = [];
  for (let i = idx + 1; i <= idx + hours && i < times.length; i++) {
    nextHours.push({
      hour: Number(times[i].slice(11, 13)),
      temperature: Math.round(data.hourly.temperature_2m[i]),
      weatherCode: data.hourly.weather_code[i],
      isDay: data.hourly.is_day[i] === 1,
      rainChance: data.hourly.precipitation_probability?.[i] ?? 0,
    });
  }

  return {
    current: {
      temperature: Math.round(data.current.temperature_2m),
      feelsLike: Math.round(data.current.apparent_temperature),
      humidity: data.current.relative_humidity_2m,
      windSpeed: Math.round(data.current.wind_speed_10m),
      weatherCode: data.current.weather_code,
      isDay: data.current.is_day === 1,
      rainChance: data.hourly.precipitation_probability?.[idx] ?? null,
    },
    nextHours,
    rainAlert: nextHours.find((h) => h.rainChance >= RAIN_ALERT_THRESHOLD) ?? null,
  };
};
