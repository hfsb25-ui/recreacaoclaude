import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Upload, X, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
export interface PdfSettings {
  titleFontSize: number;
  activityFontSize: number;
  timeFontSize: number;
  descriptionFontSize: number;
  showDescription: boolean;
  backgroundImage: string | null;
  backgroundOpacity: number;
  titleColor: string;
  showDate: boolean;
  headerStyle: "full" | "minimal" | "none";
  pageMargin: number;
}

const defaultSettings: PdfSettings = {
  titleFontSize: 20,
  activityFontSize: 12,
  timeFontSize: 11,
  descriptionFontSize: 9,
  showDescription: true,
  backgroundImage: null,
  backgroundOpacity: 0.15,
  titleColor: "#0096B4",
  showDate: true,
  headerStyle: "full",
  pageMargin: 20,
};

interface PdfSettingsManagerProps {
  settings: PdfSettings;
  onSettingsChange: (settings: PdfSettings) => void;
}

export const PdfSettingsManager = ({ settings, onSettingsChange }: PdfSettingsManagerProps) => {
  const [localSettings, setLocalSettings] = useState<PdfSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const updateSetting = <K extends keyof PdfSettings>(key: K, value: PdfSettings[K]) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      updateSetting("backgroundImage", base64);
      toast.success("Imagem de fundo carregada");
    };
    reader.readAsDataURL(file);
  };

  const removeBackgroundImage = () => {
    updateSetting("backgroundImage", null);
    toast.success("Imagem de fundo removida");
  };

  const resetToDefaults = () => {
    setLocalSettings(defaultSettings);
    onSettingsChange(defaultSettings);
    toast.success("Configurações restauradas");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Personalização do PDF
        </h3>
        <Button variant="ghost" size="sm" onClick={resetToDefaults}>
          Restaurar padrão
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Font Sizes */}
        <Card className="p-4 space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">Tamanhos de Fonte</h4>
          
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs">Título Principal</Label>
                <span className="text-xs text-muted-foreground">{localSettings.titleFontSize}pt</span>
              </div>
              <Slider
                value={[localSettings.titleFontSize]}
                onValueChange={([value]) => updateSetting("titleFontSize", value)}
                min={14}
                max={36}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs">Horário</Label>
                <span className="text-xs text-muted-foreground">{localSettings.timeFontSize}pt</span>
              </div>
              <Slider
                value={[localSettings.timeFontSize]}
                onValueChange={([value]) => updateSetting("timeFontSize", value)}
                min={8}
                max={18}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs">Nome da Atividade</Label>
                <span className="text-xs text-muted-foreground">{localSettings.activityFontSize}pt</span>
              </div>
              <Slider
                value={[localSettings.activityFontSize]}
                onValueChange={([value]) => updateSetting("activityFontSize", value)}
                min={8}
                max={20}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs">Descrição</Label>
                <span className="text-xs text-muted-foreground">{localSettings.descriptionFontSize}pt</span>
              </div>
              <Slider
                value={[localSettings.descriptionFontSize]}
                onValueChange={([value]) => updateSetting("descriptionFontSize", value)}
                min={6}
                max={14}
                step={1}
              />
            </div>
          </div>
        </Card>

        {/* Background & Style */}
        <Card className="p-4 space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">Aparência</h4>
          
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Imagem de Fundo</Label>
              {localSettings.backgroundImage ? (
                <div className="relative">
                  <img 
                    src={localSettings.backgroundImage} 
                    alt="Background preview" 
                    className="w-full h-20 object-cover rounded-md border"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={removeBackgroundImage}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="pdf-bg-upload"
                  />
                  <Label
                    htmlFor="pdf-bg-upload"
                    className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-md cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Carregar imagem</span>
                  </Label>
                </div>
              )}
            </div>

            {localSettings.backgroundImage && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs">Opacidade do Fundo</Label>
                  <span className="text-xs text-muted-foreground">{Math.round(localSettings.backgroundOpacity * 100)}%</span>
                </div>
                <Slider
                  value={[localSettings.backgroundOpacity]}
                  onValueChange={([value]) => updateSetting("backgroundOpacity", value)}
                  min={0.05}
                  max={0.5}
                  step={0.05}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs">Cor do Título</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={localSettings.titleColor}
                  onChange={(e) => updateSetting("titleColor", e.target.value)}
                  className="w-12 h-8 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={localSettings.titleColor}
                  onChange={(e) => updateSetting("titleColor", e.target.value)}
                  className="flex-1 h-8 text-xs"
                  placeholder="#0096B4"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Margem da Página</Label>
              <Select 
                value={localSettings.pageMargin.toString()} 
                onValueChange={(value) => updateSetting("pageMargin", parseInt(value))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">Pequena (10mm)</SelectItem>
                  <SelectItem value="15">Média (15mm)</SelectItem>
                  <SelectItem value="20">Normal (20mm)</SelectItem>
                  <SelectItem value="25">Grande (25mm)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Options */}
        <Card className="p-4 space-y-4 md:col-span-2">
          <h4 className="text-sm font-medium text-muted-foreground">Opções</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
              <Label className="text-xs">Exibir Data</Label>
              <Switch
                checked={localSettings.showDate}
                onCheckedChange={(checked) => updateSetting("showDate", checked)}
              />
            </div>

            <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
              <Label className="text-xs">Exibir Descrições</Label>
              <Switch
                checked={localSettings.showDescription}
                onCheckedChange={(checked) => updateSetting("showDescription", checked)}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Estilo do Cabeçalho</Label>
              <Select 
                value={localSettings.headerStyle} 
                onValueChange={(value) => updateSetting("headerStyle", value as "full" | "minimal" | "none")}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Completo</SelectItem>
                  <SelectItem value="minimal">Minimalista</SelectItem>
                  <SelectItem value="none">Sem cabeçalho</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export const getDefaultPdfSettings = (): PdfSettings => defaultSettings;

export const loadPdfSettings = async (): Promise<PdfSettings> => {
  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("pdf_settings")
      .limit(1)
      .single();
    
    if (error) {
      console.error("Error loading PDF settings from database:", error);
      return defaultSettings;
    }
    
    if (data?.pdf_settings && typeof data.pdf_settings === 'object') {
      return { ...defaultSettings, ...(data.pdf_settings as unknown as Partial<PdfSettings>) };
    }
  } catch (error) {
    console.error("Error loading PDF settings:", error);
  }
  return defaultSettings;
};

export const savePdfSettings = async (settings: PdfSettings) => {
  try {
    // Get the site settings id first
    const { data: siteData } = await supabase
      .from("site_settings")
      .select("id")
      .limit(1)
      .single();
    
    if (!siteData?.id) {
      console.error("No site settings found");
      return;
    }
    
    const { error } = await supabase
      .from("site_settings")
      .update({ pdf_settings: settings as unknown as Record<string, never> })
      .eq("id", siteData.id);
    
    if (error) {
      console.error("Error saving PDF settings to database:", error);
      toast.error("Erro ao salvar configurações do PDF");
      return;
    }
  } catch (error) {
    console.error("Error saving PDF settings:", error);
    toast.error("Erro ao salvar configurações do PDF");
  }
};
