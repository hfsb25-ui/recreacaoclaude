import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TotemSlideSchedule } from "@/components/totem/TotemSlideSchedule";
import { TotemSlideRanking } from "@/components/totem/TotemSlideRanking";
import { TotemSlideAnnouncements } from "@/components/totem/TotemSlideAnnouncements";
import { TotemSlideWeather } from "@/components/totem/TotemSlideWeather";
import { TotemSlideQRCode } from "@/components/totem/TotemSlideQRCode";
import { TotemSlideNextActivity } from "@/components/totem/TotemSlideNextActivity";
import { TotemHeader } from "@/components/totem/TotemHeader";
import { cn } from "@/lib/utils";

interface SlideConfig {
  type: string;
  order: number;
  duration: number;
  active: boolean;
}

interface TotemConfig {
  is_active: boolean;
  slides_config: SlideConfig[];
  theme: string;
  qr_code_url: string | null;
  refresh_interval: number;
  access_key: string | null;
}

const slideComponents: Record<string, React.ComponentType<{ isActive: boolean }>> = {
  schedule: TotemSlideSchedule,
  ranking: TotemSlideRanking,
  announcements: TotemSlideAnnouncements,
  weather: TotemSlideWeather,
  qrcode: TotemSlideQRCode,
  nextactivity: TotemSlideNextActivity,
};

const Totem = () => {
  const [searchParams] = useSearchParams();
  const [config, setConfig] = useState<TotemConfig | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [previousSlideIndex, setPreviousSlideIndex] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [activeSlides, setActiveSlides] = useState<SlideConfig[]>([]);

  const fetchConfig = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("totem_config")
        .select("*")
        .single();

      if (data) {
        const slidesConfig = data.slides_config as unknown as SlideConfig[];
        setConfig({
          is_active: data.is_active,
          slides_config: slidesConfig,
          theme: data.theme,
          qr_code_url: data.qr_code_url,
          refresh_interval: data.refresh_interval,
          access_key: data.access_key,
        });
        
        const active = slidesConfig
          .filter((s) => s.active)
          .sort((a, b) => a.order - b.order);
        setActiveSlides(active);
      }
    } catch (error) {
      console.error("Error fetching totem config:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check authorization
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase
        .from("totem_config")
        .select("access_key")
        .single();

      const key = searchParams.get("key");
      
      // If no access key is set, allow access
      if (!data?.access_key) {
        setAuthorized(true);
      } else if (key === data.access_key) {
        setAuthorized(true);
      }
      
      fetchConfig();
    };

    checkAuth();
  }, [searchParams, fetchConfig]);

  // Auto-refresh data
  useEffect(() => {
    if (!config?.refresh_interval) return;

    const interval = setInterval(() => {
      fetchConfig();
    }, config.refresh_interval * 60 * 1000);

    return () => clearInterval(interval);
  }, [config?.refresh_interval, fetchConfig]);

  // Slide rotation with transition
  useEffect(() => {
    if (activeSlides.length === 0) return;

    const currentSlide = activeSlides[currentSlideIndex];
    const duration = (currentSlide?.duration || 10) * 1000;

    const timer = setTimeout(() => {
      // Start transition
      setIsTransitioning(true);
      setPreviousSlideIndex(currentSlideIndex);
      
      // After fade out, change slide
      transitionTimeoutRef.current = setTimeout(() => {
        setCurrentSlideIndex((prev) => (prev + 1) % activeSlides.length);
        setIsTransitioning(false);
        setPreviousSlideIndex(null);
      }, 500); // Match CSS transition duration
    }, duration);

    return () => {
      clearTimeout(timer);
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, [currentSlideIndex, activeSlides]);

  // Fullscreen on click
  const handleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  };

  // Hide cursor after inactivity
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const hideCursor = () => {
      document.body.style.cursor = "none";
    };
    const showCursor = () => {
      document.body.style.cursor = "default";
      clearTimeout(timeout);
      timeout = setTimeout(hideCursor, 3000);
    };

    document.addEventListener("mousemove", showCursor);
    timeout = setTimeout(hideCursor, 3000);

    return () => {
      document.removeEventListener("mousemove", showCursor);
      clearTimeout(timeout);
      document.body.style.cursor = "default";
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-2xl text-foreground">Carregando Totem...</div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">Acesso Restrito</h1>
          <p className="text-muted-foreground">
            Adicione ?key=SUACHAVE na URL para acessar
          </p>
        </div>
      </div>
    );
  }

  if (!config?.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">Totem Desativado</h1>
          <p className="text-muted-foreground">
            O totem está temporariamente desativado
          </p>
        </div>
      </div>
    );
  }

  const currentSlide = activeSlides[currentSlideIndex];
  const SlideComponent = currentSlide ? slideComponents[currentSlide.type] : null;

  return (
    <div
      onClick={handleFullscreen}
      className={`h-screen w-screen overflow-hidden flex flex-col ${
        config.theme === "dark" ? "dark" : ""
      } bg-background text-foreground`}
      style={{ maxHeight: '100vh', maxWidth: '100vw' }}
    >
      <TotemHeader qrCodeUrl={config.qr_code_url} />

      {/* Main Content Area - flex-1 with min-h-0 to prevent overflow */}
      <main className="flex-1 min-h-0 flex items-center justify-center p-4 md:p-6 lg:p-8 overflow-hidden relative">
        <div 
          className={cn(
            "w-full h-full max-w-full transition-all duration-500 ease-in-out",
            isTransitioning ? "opacity-0 scale-95 blur-sm" : "opacity-100 scale-100 blur-0"
          )}
        >
          {SlideComponent && (
            <SlideComponent 
              key={`${currentSlide.type}-${currentSlideIndex}`} 
              isActive={!isTransitioning} 
            />
          )}
        </div>
      </main>

      {/* Slide Indicators */}
      <footer className="py-3 flex-shrink-0 flex justify-center gap-2">
        {activeSlides.map((slide, index) => (
          <button
            key={slide.type}
            onClick={(e) => {
              e.stopPropagation();
              setCurrentSlideIndex(index);
            }}
            className={`w-2 h-2 md:w-3 md:h-3 rounded-full transition-all duration-300 ${
              index === currentSlideIndex
                ? "bg-primary w-6 md:w-8"
                : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
            }`}
            aria-label={`Ir para slide ${slide.type}`}
          />
        ))}
      </footer>
    </div>
  );
};

export default Totem;
