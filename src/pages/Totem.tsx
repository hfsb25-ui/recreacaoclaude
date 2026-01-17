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
import { Shield, Play } from "lucide-react";

// Hook to keep the screen awake using Wake Lock API with video fallback for Silk Browser
const useWakeLock = () => {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [useVideoFallback, setUseVideoFallback] = useState(false);
  const [isActive, setIsActive] = useState(false);

  // Create invisible video element for fallback
  const createVideoFallback = useCallback(() => {
    if (videoRef.current) return;

    // Create a tiny video that plays in loop to prevent screen sleep
    const video = document.createElement("video");
    video.setAttribute("playsinline", "");
    video.setAttribute("muted", "");
    video.setAttribute("loop", "");
    video.style.cssText = "position:fixed;top:-1px;left:-1px;width:1px;height:1px;opacity:0.01;pointer-events:none;z-index:-1;";
    
    // Create a minimal video blob (1x1 pixel, transparent, 1 second)
    // This is a base64-encoded minimal MP4 video
    const base64Video = "AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAAhtZGF0AAAA1m1vb3YAAABsbXZoZAAAAAAAAAAAAAAAAAAAA+gAAAAAAAEAAAEAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAABidWR0YQAAAFptZXRhAAAAAAAAACFoZGxyAAAAAAAAAABtZGlyYXBwbAAAAAAAAAAAAAAAAC1pbHN0AAAAJal0b28AAAAdZGF0YQAAAAEAAAAATGF2ZjU4Ljc2LjEwMA==";
    
    try {
      const byteCharacters = atob(base64Video);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "video/mp4" });
      video.src = URL.createObjectURL(blob);
    } catch {
      // Fallback: use a data URL for an empty video
      video.src = "data:video/mp4;base64," + base64Video;
    }

    document.body.appendChild(video);
    videoRef.current = video;

    // Play the video
    video.play().then(() => {
      console.log("Video fallback ativo - tela não vai suspender (Silk Browser compatível)");
      setIsActive(true);
    }).catch((err) => {
      console.log("Video fallback falhou:", err);
      setIsActive(false);
    });
  }, []);

  const removeVideoFallback = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = "";
      videoRef.current.remove();
      videoRef.current = null;
    }
    setIsActive(false);
  }, []);

  const requestWakeLock = useCallback(async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
        console.log("Wake Lock ativo - tela não vai suspender");
        setUseVideoFallback(false);
        setIsActive(true);
        
        wakeLockRef.current.addEventListener("release", () => {
          console.log("Wake Lock liberado");
          setIsActive(false);
        });
      } else {
        // Wake Lock not supported, use video fallback
        console.log("Wake Lock não suportado, usando fallback de vídeo");
        setUseVideoFallback(true);
        createVideoFallback();
      }
    } catch (err) {
      console.log("Wake Lock erro, usando fallback de vídeo:", err);
      setUseVideoFallback(true);
      createVideoFallback();
    }
  }, [createVideoFallback]);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
    removeVideoFallback();
  }, [removeVideoFallback]);

  useEffect(() => {
    requestWakeLock();

    // Re-acquire wake lock when page becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      releaseWakeLock();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [requestWakeLock, releaseWakeLock]);

  return { requestWakeLock, releaseWakeLock, useVideoFallback, isActive };
};

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
  resolution: string;
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

  // Keep screen awake
  const { useVideoFallback, isActive: wakeLockActive } = useWakeLock();

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
          resolution: (data as any).resolution || "1920x1080",
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

  // Parse resolution
  const getResolutionStyle = () => {
    if (!config.resolution || config.resolution === "auto") {
      return { width: "100vw", height: "100vh" };
    }
    const [width, height] = config.resolution.split("x").map(Number);
    return { width: `${width}px`, height: `${height}px` };
  };

  const resolutionStyle = getResolutionStyle();
  const isFixedResolution = config.resolution && config.resolution !== "auto";

  return (
    <div className="min-h-screen min-w-screen flex items-center justify-center bg-black">
      <div
        onClick={handleFullscreen}
        className={`overflow-hidden flex flex-col ${
          config.theme === "dark" ? "dark" : ""
        } bg-background text-foreground`}
        style={isFixedResolution ? resolutionStyle : { width: '100vw', height: '100vh' }}
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

      {/* Wake Lock Status Indicator */}
      {wakeLockActive && (
        <div 
          className="fixed bottom-4 right-4 opacity-20 hover:opacity-80 transition-opacity duration-300 cursor-default"
          title={useVideoFallback ? "Video Fallback (Silk Browser)" : "Wake Lock API"}
        >
          <div className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm",
            useVideoFallback 
              ? "bg-yellow-500/20 text-yellow-500" 
              : "bg-green-500/20 text-green-500"
          )}>
            {useVideoFallback ? (
              <>
                <Play className="w-3 h-3" />
                <span className="hidden sm:inline">Video</span>
              </>
            ) : (
              <>
                <Shield className="w-3 h-3" />
                <span className="hidden sm:inline">Wake Lock</span>
              </>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Totem;
