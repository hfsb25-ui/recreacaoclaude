import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Convert base64 to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// VAPID public key - In production, you should generate your own keys
// using: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = "BEl62iUYgUivxIkv69yViEuiBIa-Ib27SzV2vDgHuEIo7qsKKNf5nDjXPWqTZVKxGhh2LCqIQh5dQPn3LJ0x-j0";

export const usePushNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if Push API is supported
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!isSupported) {
      toast.error("Notificações push não são suportadas neste navegador");
      return false;
    }

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm === "granted") {
        await subscribeToPush();
        toast.success("Notificações ativadas com sucesso!");
        return true;
      } else if (perm === "denied") {
        toast.error("Permissão para notificações negada");
        return false;
      }
      return false;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      toast.error("Erro ao solicitar permissão para notificações");
      return false;
    }
  };

  const subscribeToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready as ServiceWorkerRegistration & { pushManager: PushManager };
      
      // Check if already subscribed
      let sub = await registration.pushManager.getSubscription();
      
      if (!sub) {
        // Subscribe to push notifications
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      setSubscription(sub);

      // Save subscription to database
      const subscriptionJSON = sub.toJSON();
      const guestData = localStorage.getItem("guest");
      
      if (!guestData) {
        console.error("No guest data found");
        return;
      }

      const guest = JSON.parse(guestData);

      const { error } = await supabase
        .from("push_subscriptions")
        .upsert({
          guest_id: guest.id,
          endpoint: subscriptionJSON.endpoint!,
          p256dh: subscriptionJSON.keys!.p256dh!,
          auth: subscriptionJSON.keys!.auth!,
        }, {
          onConflict: 'guest_id,endpoint'
        });

      if (error) {
        console.error("Error saving subscription:", error);
        toast.error("Erro ao salvar inscrição de notificações");
      }
    } catch (error) {
      console.error("Error subscribing to push notifications:", error);
      toast.error("Erro ao ativar notificações push");
    }
  };

  const unsubscribe = async () => {
    try {
      if (subscription) {
        await subscription.unsubscribe();
        
        // Remove from database
        const { error } = await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", subscription.endpoint);

        if (error) {
          console.error("Error removing subscription:", error);
        }

        setSubscription(null);
        toast.success("Notificações desativadas");
      }
    } catch (error) {
      console.error("Error unsubscribing:", error);
      toast.error("Erro ao desativar notificações");
    }
  };

  return {
    permission,
    subscription,
    isSupported,
    requestPermission,
    unsubscribe,
  };
};
