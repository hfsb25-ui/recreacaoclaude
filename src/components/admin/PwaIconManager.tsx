import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, X, Smartphone, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const PwaIconManager = () => {
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    // Validate file size (max 1MB)
    if (file.size > 1 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 1MB");
      return;
    }

    try {
      setUploading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Você precisa estar logado");
        return;
      }

      // Delete old icon if exists
      const { data: currentSettings } = await supabase
        .from("site_settings")
        .select("pwa_icon_url")
        .eq("id", "00000000-0000-0000-0000-000000000001")
        .single();

      if (currentSettings?.pwa_icon_url) {
        await supabase.storage.from("pwa-icons").remove([currentSettings.pwa_icon_url]);
      }

      // Upload new icon
      const fileExt = file.name.split(".").pop();
      const fileName = `pwa-icon-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("pwa-icons")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Update settings
      const { error: updateError } = await supabase
        .from("site_settings")
        .update({
          pwa_icon_url: fileName,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq("id", "00000000-0000-0000-0000-000000000001");

      if (updateError) throw updateError;

      toast.success("Ícone do PWA atualizado com sucesso!");
      fetchIcon();
    } catch (error: any) {
      console.error("Error uploading PWA icon:", error);
      toast.error("Erro ao fazer upload do ícone");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveIcon = async () => {
    if (!confirm("Tem certeza que deseja remover o ícone customizado? O ícone padrão será restaurado.")) return;

    try {
      setUploading(true);

      const { data: currentSettings } = await supabase
        .from("site_settings")
        .select("pwa_icon_url")
        .eq("id", "00000000-0000-0000-0000-000000000001")
        .single();

      if (currentSettings?.pwa_icon_url) {
        await supabase.storage.from("pwa-icons").remove([currentSettings.pwa_icon_url]);
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("site_settings")
        .update({
          pwa_icon_url: null,
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        })
        .eq("id", "00000000-0000-0000-0000-000000000001");

      if (error) throw error;

      toast.success("Ícone removido! O ícone padrão será usado.");
      setIconUrl(null);
    } catch (error: any) {
      console.error("Error removing PWA icon:", error);
      toast.error("Erro ao remover ícone");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">Carregando...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Ícone do App (PWA)
          </h3>
          <p className="text-sm text-muted-foreground">
            Personalize o ícone que aparece quando o app é instalado no celular.
          </p>
        </div>

        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Para melhor resultado, use uma imagem <strong>quadrada</strong> de pelo menos <strong>512x512 pixels</strong> em formato PNG com fundo transparente ou sólido.
          </AlertDescription>
        </Alert>

        {iconUrl ? (
          <div className="space-y-4">
            <div className="border border-border rounded-lg p-4 bg-muted/30">
              <Label className="text-sm font-medium mb-2 block">Preview do Ícone Atual</Label>
              <div className="flex items-center gap-6">
                {/* Preview grande */}
                <div className="text-center">
                  <div className="w-32 h-32 rounded-2xl overflow-hidden bg-white shadow-lg border border-border">
                    <img
                      src={iconUrl}
                      alt="Ícone do PWA"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground mt-2 block">512px</span>
                </div>
                
                {/* Preview médio */}
                <div className="text-center">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-white shadow-md border border-border">
                    <img
                      src={iconUrl}
                      alt="Ícone do PWA"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground mt-2 block">192px</span>
                </div>
                
                {/* Preview pequeno */}
                <div className="text-center">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-white shadow border border-border">
                    <img
                      src={iconUrl}
                      alt="Ícone do PWA"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground mt-2 block">180px</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => document.getElementById("pwa-icon-upload")?.click()}
                disabled={uploading}
                className="flex-1"
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Enviando..." : "Substituir Ícone"}
              </Button>
              <Button
                variant="destructive"
                onClick={handleRemoveIcon}
                disabled={uploading}
              >
                <X className="mr-2 h-4 w-4" />
                Remover
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-colors">
              <Smartphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">Nenhum ícone customizado</p>
              <p className="text-xs text-muted-foreground mb-4">O ícone padrão do sistema está sendo usado</p>
              <Button
                onClick={() => document.getElementById("pwa-icon-upload")?.click()}
                disabled={uploading}
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Enviando..." : "Fazer Upload do Ícone"}
              </Button>
            </div>
          </div>
        )}

        <input
          id="pwa-icon-upload"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileUpload}
          className="hidden"
        />
      </Card>

      {/* Tips Section */}
      <Card className="p-6 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
        <h4 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">Dicas para o Ícone do PWA</h4>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• Use uma imagem <strong>quadrada</strong> (1:1) para evitar distorções</li>
          <li>• Tamanho recomendado: <strong>512x512 pixels</strong></li>
          <li>• Formatos aceitos: PNG (recomendado), JPEG, WebP</li>
          <li>• PNG com fundo transparente funciona melhor em diferentes dispositivos</li>
          <li>• O ícone será usado na tela inicial do celular e na lista de apps</li>
          <li>• Após alterar, os usuários precisam reinstalar o app para ver o novo ícone</li>
        </ul>
      </Card>
    </div>
  );
};
