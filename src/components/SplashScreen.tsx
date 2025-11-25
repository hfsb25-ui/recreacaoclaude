import { useEffect, useState } from "react";
import { Waves } from "lucide-react";

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen = ({ onFinish }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Show splash for 2 seconds, then fade out
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Wait for fade out animation to complete before removing
      setTimeout(onFinish, 500);
    }, 2000);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-primary via-secondary to-accent transition-opacity duration-500 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
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
            Recreação Hotel
          </h1>
          <p className="text-white/90 text-lg font-light">
            Sua programação de atividades
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
