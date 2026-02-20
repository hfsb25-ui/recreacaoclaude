import { supabase } from "@/integrations/supabase/client";

function parseBrowser(ua: string): string {
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("OPR/") || ua.includes("Opera")) return "Opera";
  if (ua.includes("Chrome") && !ua.includes("Edg")) return "Chrome";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Firefox")) return "Firefox";
  return "Outro";
}

function parseOS(ua: string): string {
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac OS")) return "macOS";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  if (ua.includes("Linux")) return "Linux";
  return "Outro";
}

function parseDeviceType(ua: string): string {
  if (/Mobi|Android.*Mobile|iPhone/.test(ua)) return "Mobile";
  if (/iPad|Android(?!.*Mobile)|Tablet/.test(ua)) return "Tablet";
  return "Desktop";
}

async function fetchIP(): Promise<string | null> {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    return data.ip || null;
  } catch {
    return null;
  }
}

export const trackLogin = async (userId: string, email: string) => {
  try {
    const ua = navigator.userAgent;
    const [ip, roleData] = await Promise.all([
      fetchIP(),
      supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
    ]);

    await supabase.from("admin_login_history").insert({
      user_id: userId,
      user_email: email,
      user_role: roleData.data?.role || null,
      ip_address: ip,
      user_agent: ua,
      browser: parseBrowser(ua),
      os: parseOS(ua),
      device_type: parseDeviceType(ua),
    } as any);
  } catch (err) {
    console.error("Failed to track login:", err);
  }
};
