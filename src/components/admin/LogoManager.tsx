import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, X, Image as ImageIcon } from "lucide-react";

export const LogoManager = () => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogo();
  }, []);

  const fetchLogo = async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("logo_url")
        .eq("id", "00000000-0000-0000-0000-000000000001")
        .single();

      if (error) throw error;

      if (data?.logo_url) {
        const { data: publicUrlData } = supabase.storage
          .from("logos")
          .getPublicUrl(data.logo_url);
        setLogoUrl(publicUrlData.publicUrl);
      }
    } catch (error: any) {
      console.error("Error fetching logo:", error);
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

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB");
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

      // Delete old logo if exists
      const { data: currentSettings } = await supabase
        .from("site_settings")
        .select("logo_url")
        .eq("id", "00000000-0000-0000-0000-000000000001")
        .single();

      if (currentSettings?.logo_url) {
        await supabase.storage.from("logos").remove([currentSettings.logo_url]);
      }

      // Upload new logo
      const fileExt = file.name.split(".").pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Update settings
      const { error: updateError } = await supabase
        .from("site_settings")
        .update({
          logo_url: fileName,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq("id", "00000000-0000-0000-0000-000000000001");

      if (updateError) throw updateError;

      toast.success("Logo atualizado com sucesso!");
      fetchLogo();
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast.error("Erro ao fazer upload do logo");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!confirm("Tem certeza que deseja remover o logo?")) return;

    try {
      setUploading(true);

      const { data: currentSettings } = await supabase
        .from("site_settings")
        .select("logo_url")
        .eq("id", "00000000-0000-0000-0000-000000000001")
        .single();

      if (currentSettings?.logo_url) {
        await supabase.storage.from("logos").remove([currentSettings.logo_url]);
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("site_settings")
        .update({
          logo_url: null,
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        })
        .eq("id", "00000000-0000-0000-0000-000000000001");

      if (error) throw error;

      toast.success("Logo removido com sucesso!");
      setLogoUrl(null);
    } catch (error: any) {
      console.error("Error removing logo:", error);
      toast.error("Erro ao remover logo");
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
            <ImageIcon className="h-5 w-5" />
            Gerenciar Logo do Site
          </h3>
          <p className="text-sm text-muted-foreground">
            Faça upload do logo que aparecerá no topo da página inicial. Tamanho máximo: 2MB.
          </p>
        </div>

        {logoUrl ? (
          <div className="space-y-4">
            <div className="border border-border rounded-lg p-4 bg-muted/30">
              <Label className="text-sm font-medium mb-2 block">Preview do Logo Atual</Label>
              <div className="flex items-center justify-center bg-white rounded-lg p-6 min-h-[200px]">
                <img
                  src={logoUrl}
                  alt="Logo do site"
                  className="max-h-[150px] max-w-full object-contain"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => document.getElementById("logo-upload")?.click()}
                disabled={uploading}
                className="flex-1"
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Enviando..." : "Substituir Logo"}
              </Button>
              <Button
                variant="destructive"
                onClick={handleRemoveLogo}
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
              <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">Nenhum logo configurado</p>
              <Button
                onClick={() => document.getElementById("logo-upload")?.click()}
                disabled={uploading}
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Enviando..." : "Fazer Upload do Logo"}
              </Button>
            </div>
          </div>
        )}

        <input
          id="logo-upload"
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </Card>

      <Card className="p-6 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
        <h4 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">Dicas para o Logo</h4>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• Use imagens PNG ou SVG com fundo transparente para melhor resultado</li>
          <li>• Recomendamos dimensões de aproximadamente 200x60 pixels</li>
          <li>• O logo será redimensionado automaticamente para caber no espaço disponível</li>
          <li>• Certifique-se de que o logo tenha boa legibilidade em diferentes tamanhos</li>
        </ul>
      </Card>
    </div>
  );
};
