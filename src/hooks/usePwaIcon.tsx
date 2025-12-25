import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const usePwaIcon = () => {
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIcon();
  }, []);

  const fetchIcon = async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("pwa_icon_url")
        .eq("id", "00000000-0000-0000-0000-000000000001")
        .single();

      if (error) throw error;

      if (data?.pwa_icon_url) {
        const { data: publicUrlData } = supabase.storage
          .from("pwa-icons")
          .getPublicUrl(data.pwa_icon_url);
        setIconUrl(publicUrlData.publicUrl);
      }
    } catch (error: any) {
      console.error("Error fetching PWA icon:", error);
    } finally {
      setLoading(false);
    }
  };

  return { iconUrl, loading };
};
