import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Download, Smartphone, Share } from "lucide-react";
import { usePwaIcon } from "@/hooks/usePwaIcon";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const { iconUrl } = usePwaIcon();

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <Card className="p-8">
          <div className="text-center mb-8">
            {iconUrl ? (
              <div className="w-24 h-24 mx-auto mb-4 rounded-3xl overflow-hidden shadow-lg">
                <img src={iconUrl} alt="App Icon" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-24 h-24 mx-auto mb-4 bg-primary/10 rounded-3xl flex items-center justify-center">
                <Smartphone className="h-12 w-12 text-primary" />
              </div>
            )}
            <h1 className="text-3xl font-bold mb-2">Instalar App</h1>
            <p className="text-muted-foreground">
              Acesse a programação de forma rápida e offline
            </p>
          </div>

          {isInstalled ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-500/10 rounded-full flex items-center justify-center">
                <Download className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-xl font-semibold mb-2">App Instalado!</h2>
              <p className="text-muted-foreground mb-6">
                O app já está instalado no seu dispositivo
              </p>
              <Button onClick={() => navigate("/")} className="w-full">
                Ir para Página Inicial
              </Button>
            </div>
          ) : (
            <>
              {/* Android/Chrome */}
              {deferredPrompt && !isIOS && (
                <div className="space-y-4">
                  <Button onClick={handleInstall} className="w-full" size="lg">
                    <Download className="h-5 w-5 mr-2" />
                    Instalar Agora
                  </Button>
                  <p className="text-sm text-muted-foreground text-center">
                    Clique no botão acima para instalar o app
                  </p>
                </div>
              )}

              {/* iOS Instructions */}
              {isIOS && (
                <div className="space-y-6">
                  <div className="bg-muted/50 rounded-lg p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Share className="h-5 w-5" />
                      Instruções para iPhone/iPad
                    </h3>
                    <ol className="space-y-3 text-sm">
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs">
                          1
                        </span>
                        <span>
                          Toque no botão <strong>Compartilhar</strong> (
                          <Share className="inline h-4 w-4" />) na barra inferior do Safari
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs">
                          2
                        </span>
                        <span>
                          Role para baixo e selecione{" "}
                          <strong>"Adicionar à Tela de Início"</strong>
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs">
                          3
                        </span>
                        <span>
                          Toque em <strong>"Adicionar"</strong> no canto superior direito
                        </span>
                      </li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Generic Instructions */}
              {!deferredPrompt && !isIOS && (
                <div className="space-y-6">
                  <div className="bg-muted/50 rounded-lg p-6">
                    <h3 className="font-semibold mb-4">
                      Como Instalar (Android/Chrome)
                    </h3>
                    <ol className="space-y-3 text-sm">
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs">
                          1
                        </span>
                        <span>
                          Toque no menu (⋮) no canto superior direito do navegador
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs">
                          2
                        </span>
                        <span>Selecione "Instalar app" ou "Adicionar à tela inicial"</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs">
                          3
                        </span>
                        <span>Confirme tocando em "Instalar"</span>
                      </li>
                    </ol>
                  </div>
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-border">
                <h3 className="font-semibold mb-3">Benefícios do App</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                    Acesso rápido direto da tela inicial
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                    Funciona offline - veja a programação sem internet
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                    Experiência otimizada para celular
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                    Receba notificações de atividades (em breve)
                  </li>
                </ul>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Install;
