import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useGuestAuth } from "@/hooks/useGuestAuth";

export const NotificationPrompt = () => {
  const { guest } = useGuestAuth();
  const { permission, isSupported, requestPermission } = usePushNotifications();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Only show prompt if guest is logged in, notifications are supported,
    // permission hasn't been requested, and user hasn't dismissed the prompt
    if (
      guest &&
      isSupported &&
      permission === "default" &&
      !localStorage.getItem("notification-prompt-dismissed")
    ) {
      // Show prompt after 3 seconds
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [guest, isSupported, permission]);

  const handleEnable = async () => {
    const success = await requestPermission();
    if (success) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("notification-prompt-dismissed", "true");
  };

  if (!showPrompt || !guest) return null;

  return (
    <Card className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 p-4 shadow-lg z-50 bg-card border-border animate-slide-in-right">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-accent"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </button>
      
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-full">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground">Receba Lembretes</h3>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Ative as notificações para receber lembretes das atividades e não perder nenhuma programação!
        </p>
        
        <div className="flex gap-2">
          <Button onClick={handleEnable} className="flex-1">
            Ativar
          </Button>
          <Button onClick={handleDismiss} variant="outline" className="flex-1">
            Depois
          </Button>
        </div>
      </div>
    </Card>
  );
};
