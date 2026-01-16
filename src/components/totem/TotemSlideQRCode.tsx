import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QrCode, Smartphone, Star, Trophy, Calendar } from "lucide-react";

interface TotemSlideQRCodeProps {
  isActive: boolean;
}

export const TotemSlideQRCode = ({ isActive }: TotemSlideQRCodeProps) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [siteName, setSiteName] = useState<string>("Recreação Hotel");

  useEffect(() => {
    const fetchConfig = async () => {
      const [totemRes, settingsRes] = await Promise.all([
        supabase.from("totem_config").select("qr_code_url").single(),
        supabase.from("site_settings").select("site_name").single(),
      ]);

      // Use custom URL or default to current origin
      const url = totemRes.data?.qr_code_url || window.location.origin;
      setQrCodeUrl(url);

      if (settingsRes.data?.site_name) {
        setSiteName(settingsRes.data.site_name);
      }
    };

    fetchConfig();
  }, []);

  // Generate QR Code using Google Charts API
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(
    qrCodeUrl
  )}&bgcolor=ffffff&color=000000`;

  return (
    <div className="h-full flex flex-col items-center justify-center">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-3 mb-4">
          <Smartphone className="w-12 h-12 text-primary" />
          <h2 className="text-5xl font-bold text-foreground">
            Baixe o App!
          </h2>
        </div>
        <p className="text-2xl text-muted-foreground">
          Escaneie o QR Code e acesse {siteName}
        </p>
      </div>

      {/* QR Code */}
      <div className="relative mb-12">
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
        <div className="relative bg-white p-8 rounded-3xl shadow-2xl">
          <img
            src={qrImageUrl}
            alt="QR Code para acessar o app"
            className="w-80 h-80"
          />
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-3 gap-8 max-w-4xl">
        <div className="flex flex-col items-center text-center p-6 bg-card rounded-2xl border border-border">
          <Calendar className="w-12 h-12 text-primary mb-4" />
          <h3 className="text-xl font-bold text-foreground mb-2">
            Programação
          </h3>
          <p className="text-muted-foreground">
            Veja todas as atividades do dia
          </p>
        </div>
        <div className="flex flex-col items-center text-center p-6 bg-card rounded-2xl border border-border">
          <Star className="w-12 h-12 text-primary mb-4" />
          <h3 className="text-xl font-bold text-foreground mb-2">
            Ganhe Pontos
          </h3>
          <p className="text-muted-foreground">
            Participe e acumule pontos
          </p>
        </div>
        <div className="flex flex-col items-center text-center p-6 bg-card rounded-2xl border border-border">
          <Trophy className="w-12 h-12 text-primary mb-4" />
          <h3 className="text-xl font-bold text-foreground mb-2">
            Prêmios
          </h3>
          <p className="text-muted-foreground">
            Concorra a prêmios semanais
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-12 text-center">
        <p className="text-xl text-muted-foreground">
          📱 Aponte a câmera do seu celular para o QR Code
        </p>
      </div>
    </div>
  );
};
