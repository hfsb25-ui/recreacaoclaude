import { useEffect, useRef } from "react";
import { AlertTriangle, Info, CheckCircle, XCircle, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TotemAlert {
  id: string;
  title: string;
  message: string | null;
  alert_type: "info" | "warning" | "success" | "danger";
  duration_seconds: number;
  play_sound: boolean;
}

interface TotemAlertOverlayProps {
  alert: TotemAlert;
  onDismiss: () => void;
  soundEnabled?: boolean;
}

const alertStyles = {
  info: {
    bg: "bg-blue-600",
    border: "border-blue-400",
    icon: Info,
    pulse: "bg-blue-400",
  },
  warning: {
    bg: "bg-amber-600",
    border: "border-amber-400",
    icon: AlertTriangle,
    pulse: "bg-amber-400",
  },
  success: {
    bg: "bg-emerald-600",
    border: "border-emerald-400",
    icon: CheckCircle,
    pulse: "bg-emerald-400",
  },
  danger: {
    bg: "bg-red-700",
    border: "border-red-400",
    icon: XCircle,
    pulse: "bg-red-400",
  },
};

export const TotemAlertOverlay = ({
  alert,
  onDismiss,
  soundEnabled = true,
}: TotemAlertOverlayProps) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const dismissedRef = useRef(false);
  const styles = alertStyles[alert.alert_type];
  const Icon = styles.icon;

  const playBeep = () => {
    if (!soundEnabled || !alert.play_sound) return;

    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = audioContextRef.current || new AudioContextClass();
      audioContextRef.current = ctx;

      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);

      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch {
      // Ignore audio errors
    }
  };

  useEffect(() => {
    dismissedRef.current = false;
    playBeep();

    const timer = setTimeout(() => {
      if (!dismissedRef.current) {
        dismissedRef.current = true;
        onDismiss();
      }
    }, alert.duration_seconds * 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [alert.id, alert.duration_seconds, onDismiss]);

  const handleInteraction = () => {
    if (!dismissedRef.current) {
      dismissedRef.current = true;
      onDismiss();
    }
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center p-8 md:p-16",
        styles.bg
      )}
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
      role="alert"
      aria-live="assertive"
    >
      {/* Pulsing background rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <div className={cn("w-[60vmin] h-[60vmin] rounded-full opacity-20 animate-ping", styles.pulse)} />
        <div className={cn("absolute w-[40vmin] h-[40vmin] rounded-full opacity-30 animate-pulse", styles.pulse)} />
      </div>

      {/* Content */}
      <div
        className={cn(
          "relative z-10 w-full max-w-6xl text-center rounded-3xl border-4 p-8 md:p-12 shadow-2xl",
          "bg-background/95 backdrop-blur-sm",
          styles.border
        )}
      >
        <div className="flex items-center justify-center gap-4 md:gap-6 mb-6 md:mb-8">
          <Icon className={cn("w-16 h-16 md:w-24 md:h-24", styles.border.replace("border-", "text-"))} />
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground">
            {alert.title}
          </h2>
          <Icon className={cn("w-16 h-16 md:w-24 md:h-24", styles.border.replace("border-", "text-"))} />
        </div>

        {alert.message && (
          <p className="text-2xl md:text-3xl lg:text-4xl text-foreground leading-relaxed whitespace-pre-wrap">
            {alert.message}
          </p>
        )}

        <div className="mt-8 md:mt-12 flex items-center justify-center gap-3 text-muted-foreground">
          {alert.play_sound && soundEnabled ? (
            <Volume2 className="w-6 h-6 md:w-8 md:h-8" />
          ) : (
            <VolumeX className="w-6 h-6 md:w-8 md:h-8" />
          )}
          <span className="text-lg md:text-xl">
            Toque na tela para dispensar
          </span>
        </div>
      </div>
    </div>
  );
};
