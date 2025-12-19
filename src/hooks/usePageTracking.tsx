import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Generate a unique session ID for this browser session
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem("tracking-session-id");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem("tracking-session-id", sessionId);
  }
  return sessionId;
};

export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    const trackVisit = async () => {
      try {
        const sessionId = getSessionId();
        const guestId = localStorage.getItem("guest_id");

        await supabase.from("site_visits").insert({
          session_id: sessionId,
          page_path: location.pathname,
          user_agent: navigator.userAgent,
          referrer: document.referrer || null,
          guest_id: guestId || null,
        });
      } catch (error) {
        // Silently fail - tracking shouldn't break the app
        console.error("Error tracking page visit:", error);
      }
    };

    trackVisit();
  }, [location.pathname]);
};
