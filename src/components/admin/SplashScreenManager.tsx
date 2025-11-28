import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Waves, Sun, Sparkles, Star, Zap, Heart, Music, Trophy } from "lucide-react";

export const SplashScreenManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    splash_title: "Recreação Hotel",
    splash_subtitle: "Sua programação de atividades",
    splash_duration: 2000,
    splash_gradient_from: "192 92% 60%",
    splash_gradient_via: "280 80% 65%",
    splash_gradient_to: "340 85% 70%",
    splash_icon: "Waves",
    splash_animation_type: "scale",
  });

  const iconOptions = [
    { value: "Waves", label: "Ondas", Icon: Waves },
    { value: "Sun", label: "Sol", Icon: Sun },
    { value: "Sparkles", label: "Brilhos", Icon: Sparkles },
    { value: "Star", label: "Estrela", Icon: Star },
    { value: "Zap", label: "Raio", Icon: Zap },
    { value: "Heart", label: "Coração", Icon: Heart },
    { value: "Music", label: "Música", Icon: Music },
    { value: "Trophy", label: "Troféu", Icon: Trophy },
  ];

  const animationOptions = [
    { value: "scale", label: "Escalar (padrão)" },
    { value: "fade", label: "Fade In" },
    { value: "slide", label: "Deslizar" },
    { value: "zoom", label: "Zoom" },
    { value: "pulse", label: "Pulsar" },
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("splash_title, splash_subtitle, splash_duration, splash_gradient_from, splash_gradient_via, splash_gradient_to, splash_icon, splash_animation_type")
        .single();

      if (error) throw error;
      if (data) {
        setSettings({
          splash_title: data.splash_title || "Recreação Hotel",
          splash_subtitle: data.splash_subtitle || "Sua programação de atividades",
          splash_duration: data.splash_duration || 2000,
          splash_gradient_from: data.splash_gradient_from || "192 92% 60%",
          splash_gradient_via: data.splash_gradient_via || "280 80% 65%",
          splash_gradient_to: data.splash_gradient_to || "340 85% 70%",
          splash_icon: data.splash_icon || "Waves",
          splash_animation_type: data.splash_animation_type || "scale",
        });
      }
    } catch (error: any) {
      console.error("Erro ao carregar configurações:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("site_settings")
        .update({
          splash_title: settings.splash_title,
          splash_subtitle: settings.splash_subtitle,
          splash_duration: settings.splash_duration,
          splash_gradient_from: settings.splash_gradient_from,
          splash_gradient_via: settings.splash_gradient_via,
          splash_gradient_to: settings.splash_gradient_to,
          splash_icon: settings.splash_icon,
          splash_animation_type: settings.splash_animation_type,
        })
        .eq("id", (await supabase.from("site_settings").select("id").single()).data?.id);

      if (error) throw error;
      toast.success("Configurações do splash screen salvas!");
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tela de Abertura</CardTitle>
        <CardDescription>
          Configure a animação que aparece ao abrir o aplicativo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="splash_title">Título</Label>
            <Input
              id="splash_title"
              value={settings.splash_title}
              onChange={(e) => setSettings({ ...settings, splash_title: e.target.value })}
              placeholder="Recreação Hotel"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="splash_subtitle">Subtítulo</Label>
            <Input
              id="splash_subtitle"
              value={settings.splash_subtitle}
              onChange={(e) => setSettings({ ...settings, splash_subtitle: e.target.value })}
              placeholder="Sua programação de atividades"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="splash_duration">Duração (milissegundos)</Label>
            <Input
              id="splash_duration"
              type="number"
              min="500"
              max="5000"
              step="100"
              value={settings.splash_duration}
              onChange={(e) => setSettings({ ...settings, splash_duration: parseInt(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">
              Tempo que a tela de abertura fica visível (recomendado: 2000ms)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="splash_icon">Ícone</Label>
            <Select
              value={settings.splash_icon}
              onValueChange={(value) => setSettings({ ...settings, splash_icon: value })}
            >
              <SelectTrigger id="splash_icon">
                <SelectValue placeholder="Selecione um ícone" />
              </SelectTrigger>
              <SelectContent>
                {iconOptions.map((icon) => (
                  <SelectItem key={icon.value} value={icon.value}>
                    <div className="flex items-center gap-2">
                      <icon.Icon className="h-4 w-4" />
                      {icon.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="splash_animation">Tipo de Animação</Label>
            <Select
              value={settings.splash_animation_type}
              onValueChange={(value) => setSettings({ ...settings, splash_animation_type: value })}
            >
              <SelectTrigger id="splash_animation">
                <SelectValue placeholder="Selecione uma animação" />
              </SelectTrigger>
              <SelectContent>
                {animationOptions.map((animation) => (
                  <SelectItem key={animation.value} value={animation.value}>
                    {animation.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <Label>Cores do Gradiente (formato HSL)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Use valores HSL sem "hsl()" - exemplo: 192 92% 60%
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="gradient_from" className="text-xs">Cor Inicial</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="gradient_from"
                  value={settings.splash_gradient_from}
                  onChange={(e) => setSettings({ ...settings, splash_gradient_from: e.target.value })}
                  placeholder="192 92% 60%"
                />
                <div 
                  className="w-12 h-10 rounded border"
                  style={{ backgroundColor: `hsl(${settings.splash_gradient_from})` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gradient_via" className="text-xs">Cor Intermediária</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="gradient_via"
                  value={settings.splash_gradient_via}
                  onChange={(e) => setSettings({ ...settings, splash_gradient_via: e.target.value })}
                  placeholder="280 80% 65%"
                />
                <div 
                  className="w-12 h-10 rounded border"
                  style={{ backgroundColor: `hsl(${settings.splash_gradient_via})` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gradient_to" className="text-xs">Cor Final</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="gradient_to"
                  value={settings.splash_gradient_to}
                  onChange={(e) => setSettings({ ...settings, splash_gradient_to: e.target.value })}
                  placeholder="340 85% 70%"
                />
                <div 
                  className="w-12 h-10 rounded border"
                  style={{ backgroundColor: `hsl(${settings.splash_gradient_to})` }}
                />
              </div>
            </div>

            <div className="mt-4 p-4 rounded-lg border" 
              style={{ 
                background: `linear-gradient(135deg, hsl(${settings.splash_gradient_from}), hsl(${settings.splash_gradient_via}), hsl(${settings.splash_gradient_to}))` 
              }}
            >
              <p className="text-white text-center font-semibold">Preview do Gradiente</p>
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </CardContent>
    </Card>
  );
};
