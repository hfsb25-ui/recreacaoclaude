import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Chave pública de envio (VAPID). A privada fica só nos segredos do Supabase.
export const VAPID_PUBLIC_KEY = "BFDeDDjKIN15dZD6xsOITMf-IYLjJZ02bt9mk5DlUMeLnn1OWDjpr6i4UHILSN7nnjV-3TxjIJ7JIG6Ai0zPDHE";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function base64ParaBytes(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const bruto = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const saida = new Uint8Array(bruto.length);
  for (let i = 0; i < bruto.length; i++) saida[i] = bruto.charCodeAt(i);
  return saida;
}

const suportaPush = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/** iPhone/iPad no Safari: só recebe notificação depois de "Adicionar à Tela de Início". */
const ehIosForaDoApp = () => {
  if (typeof window === "undefined") return false;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const instalado =
    window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
  return ios && !instalado;
};

const salvarNoBanco = async (guestId: string | null, sub: PushSubscription) => {
  const j = sub.toJSON();
  const { data, error } = await db.rpc("push_inscrever", {
    p_guest_id: guestId,
    p_endpoint: j.endpoint,
    p_p256dh: j.keys?.p256dh,
    p_auth: j.keys?.auth,
  });
  return !error && data === true;
};

const obterInscricao = async (criar: boolean) => {
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub && criar) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ParaBytes(VAPID_PUBLIC_KEY),
    });
  }
  return sub;
};

// Liga o aparelho ao hóspede logado (ou só registra o aparelho) uma vez por abertura do app
const sincronizados = new Set<string>();
const chave = (guestId?: string | null) => guestId || "sem-login";

export const usePushNotifications = (guestId?: string | null) => {
  const isSupported = suportaPush();
  const precisaInstalar = !isSupported && ehIosForaDoApp();
  const [permission, setPermission] = useState<NotificationPermission>(isSupported ? Notification.permission : "default");
  const [ativo, setAtivo] = useState(false);
  const [carregando, setCarregando] = useState(false);

  // Se já deu permissão antes, mantém a inscrição ligada ao hóspede atual (o cadastro muda a cada estadia)
  useEffect(() => {
    if (!isSupported || Notification.permission !== "granted") return;
    let cancelado = false;
    (async () => {
      try {
        const sub = await obterInscricao(true);
        if (!sub || cancelado) return;
        if (!sincronizados.has(chave(guestId))) {
          if (await salvarNoBanco(guestId ?? null, sub)) sincronizados.add(chave(guestId));
        }
        if (!cancelado) setAtivo(true);
      } catch {
        // sem internet ou navegador recusou: tenta de novo na próxima abertura
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [isSupported, guestId]);

  const ativar = useCallback(async () => {
    if (!isSupported) return false;
    setCarregando(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return false;
      const sub = await obterInscricao(true);
      if (!sub) return false;
      const ok = await salvarNoBanco(guestId ?? null, sub);
      if (ok) {
        sincronizados.add(chave(guestId));
        setAtivo(true);
      }
      return ok;
    } catch (e) {
      console.error("Erro ao ativar notificações", e);
      return false;
    } finally {
      setCarregando(false);
    }
  }, [isSupported, guestId]);

  const desativar = useCallback(async () => {
    if (!isSupported) return;
    setCarregando(true);
    try {
      const sub = await obterInscricao(false);
      if (sub) {
        await db.rpc("push_cancelar", { p_endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      sincronizados.clear();
      setAtivo(false);
    } finally {
      setCarregando(false);
    }
  }, [isSupported, guestId]);

  return { isSupported, precisaInstalar, permission, ativo, carregando, ativar, desativar };
};
