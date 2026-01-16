import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Monitor,
  Calendar,
  Trophy,
  Megaphone,
  Cloud,
  QrCode,
  GripVertical,
  ExternalLink,
  Sparkles,
} from "lucide-react";

interface SlideConfig {
  type: string;
  order: number;
  duration: number;
  active: boolean;
}

interface TotemConfig {
  id: string;
  is_active: boolean;
  slides_config: SlideConfig[];
  theme: string;
  qr_code_url: string | null;
  refresh_interval: number;
  access_key: string | null;
}

const slideTypes = [
  { type: "schedule", label: "Programação", icon: Calendar },
  { type: "ranking", label: "Ranking", icon: Trophy },
  { type: "announcements", label: "Anúncios", icon: Megaphone },
  { type: "weather", label: "Clima", icon: Cloud },
  { type: "qrcode", label: "QR Code", icon: QrCode },
  { type: "nextactivity", label: "Próxima Atividade", icon: Sparkles },
];

const TotemManager = () => {
  const [config, setConfig] = useState<TotemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    const { data, error } = await supabase
      .from("totem_config")
      .select("*")
      .single();

    if (data) {
      setConfig({
        id: data.id,
        is_active: data.is_active,
        slides_config: data.slides_config as unknown as SlideConfig[],
        theme: data.theme,
        qr_code_url: data.qr_code_url,
        refresh_interval: data.refresh_interval,
        access_key: data.access_key,
      });
    }
    setLoading(false);
  };

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);

    const { error } = await supabase
      .from("totem_config")
      .update({
        is_active: config.is_active,
        slides_config: JSON.parse(JSON.stringify(config.slides_config)),
        theme: config.theme,
        qr_code_url: config.qr_code_url,
        refresh_interval: config.refresh_interval,
        access_key: config.access_key,
      })
      .eq("id", config.id);

    if (error) {
      toast.error("Erro ao salvar configurações");
    } else {
      toast.success("Configurações salvas!");
    }
    setSaving(false);
  };

  const updateSlide = (type: string, field: keyof SlideConfig, value: any) => {
    if (!config) return;

    const updatedSlides = config.slides_config.map((slide) =>
      slide.type === type ? { ...slide, [field]: value } : slide
    );

    setConfig({ ...config, slides_config: updatedSlides });
  };

  const getSlideConfig = (type: string) => {
    return config?.slides_config.find((s) => s.type === type);
  };

  const getTotemUrl = () => {
    const baseUrl = window.location.origin;
    if (config?.access_key) {
      return `${baseUrl}/totem?key=${config.access_key}`;
    }
    return `${baseUrl}/totem`;
  };

  if (loading) {
    return <div className="p-4">Carregando configurações...</div>;
  }

  if (!config) {
    return <div className="p-4">Erro ao carregar configurações</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Monitor className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Totem / TV Lobby</h2>
        </div>
        <Button onClick={saveConfig} disabled={saving}>
          {saving ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>

      {/* Status e URL */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-lg">Status do Totem</h3>
            <p className="text-sm text-muted-foreground">
              Ative ou desative a exibição do totem
            </p>
          </div>
          <Switch
            checked={config.is_active}
            onCheckedChange={(checked) =>
              setConfig({ ...config, is_active: checked })
            }
          />
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <Label className="text-sm text-muted-foreground">URL do Totem</Label>
          <div className="flex items-center gap-2 mt-1">
            <code className="flex-1 p-2 bg-background rounded text-sm break-all">
              {getTotemUrl()}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(getTotemUrl(), "_blank")}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Configurações Gerais */}
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4">Configurações Gerais</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Tema</Label>
            <Select
              value={config.theme}
              onValueChange={(value) => setConfig({ ...config, theme: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">Escuro</SelectItem>
                <SelectItem value="light">Claro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Atualizar dados a cada (min)</Label>
            <Input
              type="number"
              min={1}
              max={60}
              value={config.refresh_interval}
              onChange={(e) =>
                setConfig({
                  ...config,
                  refresh_interval: parseInt(e.target.value) || 5,
                })
              }
            />
          </div>

          <div>
            <Label>Chave de Acesso (opcional)</Label>
            <Input
              type="text"
              placeholder="Deixe vazio para acesso livre"
              value={config.access_key || ""}
              onChange={(e) =>
                setConfig({
                  ...config,
                  access_key: e.target.value || null,
                })
              }
            />
          </div>
        </div>

        <div className="mt-4">
          <Label>URL do QR Code (opcional)</Label>
          <Input
            type="url"
            placeholder="https://seu-site.com (padrão: URL atual)"
            value={config.qr_code_url || ""}
            onChange={(e) =>
              setConfig({
                ...config,
                qr_code_url: e.target.value || null,
              })
            }
          />
        </div>
      </Card>

      {/* Configuração dos Slides */}
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4">Slides</h3>
        <div className="space-y-4">
          {slideTypes.map((slideType) => {
            const slideConfig = getSlideConfig(slideType.type);
            const Icon = slideType.icon;

            return (
              <div
                key={slideType.type}
                className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg"
              >
                <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
                
                <div className="flex items-center gap-3 flex-1">
                  <Icon className="w-5 h-5 text-primary" />
                  <span className="font-medium">{slideType.label}</span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground">
                      Duração (s)
                    </Label>
                    <Input
                      type="number"
                      min={5}
                      max={60}
                      className="w-20"
                      value={slideConfig?.duration || 10}
                      onChange={(e) =>
                        updateSlide(
                          slideType.type,
                          "duration",
                          parseInt(e.target.value) || 10
                        )
                      }
                    />
                  </div>

                  <Switch
                    checked={slideConfig?.active ?? true}
                    onCheckedChange={(checked) =>
                      updateSlide(slideType.type, "active", checked)
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Preview Info */}
      <Card className="p-6 bg-primary/5 border-primary/20">
        <h3 className="font-semibold text-lg mb-2">💡 Dica de Uso</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Abra a URL do totem em um navegador na TV do lobby</li>
          <li>• Pressione F11 para modo tela cheia</li>
          <li>• O cursor desaparece automaticamente após 3 segundos</li>
          <li>• Clique na tela para alternar tela cheia</li>
          <li>• Os dados são atualizados automaticamente</li>
        </ul>
      </Card>
    </div>
  );
};

export default TotemManager;
