import { useState, useEffect } from "react";
import { X, Smartphone, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const InstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return;
    }

    // Check if user already dismissed
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      return;
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Handler for Android/Chrome
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Show prompt after 3 seconds
    const timer = setTimeout(() => {
      if (isIOSDevice || deferredPrompt) {
        setShowPrompt(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timer);
    };
  }, [deferredPrompt]);

  // Show prompt after deferredPrompt is set (for Android)
  useEffect(() => {
    if (deferredPrompt && !isIOS) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [deferredPrompt, isIOS]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowPrompt(false);
      localStorage.setItem("pwa-install-dismissed", "true");
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  if (!showPrompt) return null;

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="sm:max-w-md">
        <button
          onClick={handleDismiss}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Fechar</span>
        </button>

        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-4 animate-pulse">
              <Smartphone className="h-12 w-12 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            📱 Instale nosso App!
          </DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            Tenha acesso rápido à programação, receba notificações e acesse mesmo offline!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {isIOS ? (
            <>
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-center">
                  Para instalar no iPhone/iPad:
                </p>
                <ol className="text-sm space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-foreground">1.</span>
                    <span>
                      Toque no botão <Share className="inline h-4 w-4 mx-1" /> 
                      <strong>Compartilhar</strong> na barra inferior do Safari
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-foreground">2.</span>
                    <span>
                      Role para baixo e toque em <strong>"Adicionar à Tela Inicial"</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-foreground">3.</span>
                    <span>Toque em <strong>"Adicionar"</strong> no canto superior direito</span>
                  </li>
                </ol>
              </div>
              <Button 
                onClick={handleDismiss} 
                className="w-full"
                variant="outline"
              >
                Entendi
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2 text-center">
                <p className="text-sm text-muted-foreground">
                  ✨ Acesso instantâneo da tela inicial
                </p>
                <p className="text-sm text-muted-foreground">
                  🔔 Notificações em tempo real
                </p>
                <p className="text-sm text-muted-foreground">
                  📶 Funciona mesmo sem internet
                </p>
              </div>
              <Button 
                onClick={handleInstall} 
                className="w-full"
                size="lg"
              >
                Instalar Agora
              </Button>
              <Button 
                onClick={handleDismiss} 
                variant="ghost"
                className="w-full"
              >
                Agora não
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
