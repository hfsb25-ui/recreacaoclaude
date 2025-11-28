import { useEffect, useState } from "react";
import { Waves } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen = ({ onFinish }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [settings, setSettings] = useState({
    splash_title: "Recreação Hotel",
    splash_subtitle: "Sua programação de atividades",
    splash_duration: 2000,
    splash_gradient_from: "192 92% 60%",
    splash_gradient_via: "280 80% 65%",
    splash_gradient_to: "340 85% 70%",
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data } = await supabase
          .from("site_settings")
          .select("splash_title, splash_subtitle, splash_duration, splash_gradient_from, splash_gradient_via, splash_gradient_to")
          .single();

        if (data) {
          setSettings({
            splash_title: data.splash_title || "Recreação Hotel",
            splash_subtitle: data.splash_subtitle || "Sua programação de atividades",
            splash_duration: data.splash_duration || 2000,
            splash_gradient_from: data.splash_gradient_from || "192 92% 60%",
            splash_gradient_via: data.splash_gradient_via || "280 80% 65%",
            splash_gradient_to: data.splash_gradient_to || "340 85% 70%",
          });
        }
      } catch (error) {
        console.error("Erro ao carregar configurações do splash:", error);
      }
    };

    loadSettings();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onFinish, 500);
    }, settings.splash_duration);

    return () => clearTimeout(timer);
  }, [onFinish, settings.splash_duration]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-500 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      style={{
        background: `linear-gradient(135deg, hsl(${settings.splash_gradient_from}), hsl(${settings.splash_gradient_via}), hsl(${settings.splash_gradient_to}))`
      }}
    >
      <div className="text-center space-y-8 animate-scale-in">
        {/* Logo/Icon Container */}
        <div className="relative">
          {/* Animated rings */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full border-4 border-white/20 animate-ping" style={{ animationDuration: '2s' }}></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full border-4 border-white/30 animate-pulse" style={{ animationDuration: '1.5s' }}></div>
          </div>
          
          {/* Main Icon */}
          <div className="relative w-32 h-32 mx-auto bg-white rounded-3xl shadow-2xl flex items-center justify-center">
            <Waves className="h-16 w-16 text-primary animate-bounce" style={{ animationDuration: '1.5s' }} />
          </div>
        </div>

        {/* App Name */}
        <div className="space-y-2 animate-fade-in" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
          <h1 className="text-4xl font-bold text-white drop-shadow-lg">
            {settings.splash_title}
          </h1>
          <p className="text-white/90 text-lg font-light">
            {settings.splash_subtitle}
          </p>
        </div>

        {/* Loading Indicator */}
        <div className="flex items-center justify-center gap-2 animate-fade-in" style={{ animationDelay: '0.6s', animationFillMode: 'both' }}>
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};
