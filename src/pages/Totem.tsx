import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TelaTotem, useDadosTotem, temAtividadeAgora, type SlideNovo } from "@/components/totem/TotemNovo";
import { cn } from "@/lib/utils";
import { Shield, Play } from "lucide-react";

// Hook to keep the screen awake using multiple strategies for Fire TV Stick / Silk Browser
const useWakeLock = () => {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const noSleepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [useVideoFallback, setUseVideoFallback] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [activeMethod, setActiveMethod] = useState<string>("none");

  // Strategy 1: Create invisible video element for fallback
  const createVideoFallback = useCallback(() => {
    if (videoRef.current) return;

    // Create a tiny video that plays in loop to prevent screen sleep
    const video = document.createElement("video");
    video.setAttribute("playsinline", "");
    video.setAttribute("muted", "");
    video.setAttribute("loop", "");
    video.setAttribute("autoplay", "");
    video.style.cssText = "position:fixed;top:-1px;left:-1px;width:1px;height:1px;opacity:0.01;pointer-events:none;z-index:-1;";
    
    // Create a minimal video blob (1x1 pixel, transparent, 1 second)
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
      video.src = "data:video/mp4;base64," + base64Video;
    }

    document.body.appendChild(video);
    videoRef.current = video;

    video.play().then(() => {
      console.log("[NoSleep] Video fallback ativo");
      setIsActive(true);
      setActiveMethod("video");
    }).catch((err) => {
      console.log("[NoSleep] Video fallback falhou:", err);
    });
  }, []);

  // Strategy 2: Silent audio context (keeps device active on some browsers)
  const createAudioContext = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const audioCtx = new AudioContextClass();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      // Silent (volume 0)
      gainNode.gain.value = 0;
      oscillator.frequency.value = 1;
      oscillator.start();
      
      audioContextRef.current = audioCtx;
      console.log("[NoSleep] Audio context ativo");
    } catch (err) {
      console.log("[NoSleep] Audio context falhou:", err);
    }
  }, []);

  // Strategy 3: DOM activity simulation (prevents idle detection)
  const startNoSleepInterval = useCallback(() => {
    if (noSleepIntervalRef.current) return;

    noSleepIntervalRef.current = setInterval(() => {
      // Simulate minimal activity every 30 seconds
      const event = new MouseEvent("mousemove", {
        bubbles: true,
        cancelable: true,
        clientX: Math.random(),
        clientY: Math.random(),
      });
      document.dispatchEvent(event);

      // Touch scroll prevention workaround
      window.scrollTo(0, 0);

      // Force video to keep playing if it stopped
      if (videoRef.current && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      }

      // Resume audio context if suspended
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume().catch(() => {});
      }
    }, 30000); // Every 30 seconds

    console.log("[NoSleep] Intervalo de atividade ativo");
  }, []);

  const removeVideoFallback = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = "";
      videoRef.current.remove();
      videoRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    removeVideoFallback();
    
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    
    if (noSleepIntervalRef.current) {
      clearInterval(noSleepIntervalRef.current);
      noSleepIntervalRef.current = null;
    }
    
    setIsActive(false);
    setActiveMethod("none");
  }, [removeVideoFallback]);

  const requestWakeLock = useCallback(async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
        console.log("[NoSleep] Wake Lock API ativo");
        setUseVideoFallback(false);
        setIsActive(true);
        setActiveMethod("wakeLock");
        
        wakeLockRef.current.addEventListener("release", () => {
          console.log("[NoSleep] Wake Lock liberado, reativando fallbacks");
          setIsActive(false);
          // Auto re-enable fallbacks if wake lock is released
          createVideoFallback();
          createAudioContext();
          startNoSleepInterval();
        });
      } else {
        throw new Error("Wake Lock not supported");
      }
    } catch (err) {
      console.log("[NoSleep] Wake Lock não disponível, usando fallbacks:", err);
      setUseVideoFallback(true);
      // Enable ALL fallback strategies for maximum compatibility
      createVideoFallback();
      createAudioContext();
      startNoSleepInterval();
      setIsActive(true);
    }
  }, [createVideoFallback, createAudioContext, startNoSleepInterval]);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
    cleanup();
  }, [cleanup]);

  useEffect(() => {
    requestWakeLock();

    // Re-acquire wake lock when page becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("[NoSleep] Página visível, reativando proteção");
        requestWakeLock();
      }
    };

    // Also listen for focus events (Fire TV specific)
    const handleFocus = () => {
      console.log("[NoSleep] Foco recuperado, reativando proteção");
      requestWakeLock();
    };

    // Prevent screen saver on user interaction
    const handleUserInteraction = () => {
      if (!isActive) {
        requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("click", handleUserInteraction);
    document.addEventListener("touchstart", handleUserInteraction);
    document.addEventListener("keydown", handleUserInteraction);

    return () => {
      releaseWakeLock();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("touchstart", handleUserInteraction);
      document.removeEventListener("keydown", handleUserInteraction);
    };
  }, [requestWakeLock, releaseWakeLock, isActive]);

  return { requestWakeLock, releaseWakeLock, useVideoFallback, isActive, activeMethod };
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

const Totem = () => {
  const [searchParams] = useSearchParams();
  const [config, setConfig] = useState<TotemConfig | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [previousSlideIndex, setPreviousSlideIndex] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeSlides, setActiveSlides] = useState<SlideConfig[]>([]);

  // Keep screen awake
  const { useVideoFallback, isActive: wakeLockActive, activeMethod } = useWakeLock();

  // Dados das telas (programação, ranking, tempo, destaques e avisos importantes)
  const dados = useDadosTotem();

  // Sem nenhuma atividade acontecendo, a tela "Acontecendo agora" sai da sequência (confere a cada 30s)
  const [haAgora, setHaAgora] = useState(true);
  useEffect(() => {
    const conferir = () => setHaAgora(temAtividadeAgora(dados));
    conferir();
    const t = setInterval(conferir, 30_000);
    return () => clearInterval(t);
  }, [dados]);

  // Sequência de telas: avisos importantes ativos primeiro, depois as telas ligadas no painel
  const rotacao = useMemo<SlideNovo[]>(() => {
    const tipos = ["nextactivity", "schedule", "weather", "announcements", "ranking", "qrcode"] as const;
    const normais: SlideNovo[] = activeSlides
      .filter((s) => (tipos as readonly string[]).includes(s.type))
      .filter((s) => s.type !== "nextactivity" || haAgora)
      .map((s) => ({ tipo: s.type as (typeof tipos)[number], duracao: s.duration || 10 }));
    const alertas: SlideNovo[] = dados.alertas.map((a) => ({ tipo: "alerta", duracao: a.duration_seconds || 10, alerta: a }));
    return [...alertas, ...normais];
  }, [activeSlides, dados.alertas, haAgora]);

  // Tamanho da tela para ampliar o desenho (feito em 1280×720) até caber na TV
  const [janela, setJanela] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const aoMudar = () => setJanela({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", aoMudar);
    return () => window.removeEventListener("resize", aoMudar);
  }, []);

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
    if (rotacao.length === 0) return;

    const currentSlide = rotacao[currentSlideIndex % rotacao.length];
    const duration = (currentSlide?.duracao || 10) * 1000;

    const timer = setTimeout(() => {
      // Start transition
      setIsTransitioning(true);
      setPreviousSlideIndex(currentSlideIndex);
      
      // After fade out, change slide
      transitionTimeoutRef.current = setTimeout(() => {
        setCurrentSlideIndex((prev) => (prev + 1) % rotacao.length);
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
  }, [currentSlideIndex, rotacao]);

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
    let timeout: ReturnType<typeof setTimeout>;
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

  const slideAtual = rotacao.length ? rotacao[currentSlideIndex % rotacao.length] : null;

  // Área da TV: resolução fixa do painel ou a tela inteira
  const [resW, resH] =
    config.resolution && config.resolution !== "auto" ? config.resolution.split("x").map(Number) : [janela.w, janela.h];
  const largura = Math.min(resW || janela.w, janela.w);
  const altura = Math.min(resH || janela.h, janela.h);
  const escala = Math.min(largura / 1280, altura / 720);

  return (
    <div className="min-h-screen min-w-screen flex items-center justify-center bg-black overflow-hidden">
      <div
        onClick={handleFullscreen}
        className="relative overflow-hidden bg-[#F4F6F0]"
        style={{ width: largura, height: altura }}
      >
        <div
          className="absolute left-1/2 top-1/2"
          style={{ width: 1280, height: 720, transform: `translate(-50%, -50%) scale(${escala})` }}
        >
          <TelaTotem
            key={slideAtual?.tipo === "alerta" ? slideAtual.alerta.id : `${slideAtual?.tipo}-${currentSlideIndex}`}
            dados={dados}
            slide={slideAtual}
            qrUrl={config.qr_code_url || window.location.origin}
            saindo={isTransitioning}
          />
        </div>

      {/* Wake Lock Status Indicator */}
      {wakeLockActive && (
        <div 
          className="fixed bottom-4 right-4 opacity-30 hover:opacity-90 transition-opacity duration-300 cursor-default"
          title={
            activeMethod === "wakeLock" 
              ? "Wake Lock API - Proteção nativa" 
              : "Fallback Multi-camada (Video + Audio + Activity)"
          }
        >
          <div className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm border",
            activeMethod === "wakeLock"
              ? "bg-primary/20 text-primary border-primary/30" 
              : "bg-accent/20 text-accent-foreground border-accent/30"
          )}>
            {activeMethod === "wakeLock" ? (
              <>
                <Shield className="w-3 h-3" />
                <span className="hidden sm:inline">Wake Lock</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 animate-pulse" />
                <span className="hidden sm:inline">NoSleep</span>
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
