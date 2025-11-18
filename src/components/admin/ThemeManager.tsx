import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Palette, RotateCcw } from "lucide-react";

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
}

const defaultColors: ThemeColors = {
  primary: "190 95% 45%",
  secondary: "15 85% 60%",
  accent: "45 95% 60%",
  background: "190 40% 98%",
  foreground: "200 25% 15%",
};

const ThemeManager = () => {
  const [colors, setColors] = useState<ThemeColors>(defaultColors);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Load colors from localStorage
    const savedColors = localStorage.getItem("themeColors");
    if (savedColors) {
      setColors(JSON.parse(savedColors));
      applyColors(JSON.parse(savedColors));
    }
  }, []);

  const applyColors = (newColors: ThemeColors) => {
    const root = document.documentElement;
    root.style.setProperty("--primary", newColors.primary);
    root.style.setProperty("--secondary", newColors.secondary);
    root.style.setProperty("--accent", newColors.accent);
    root.style.setProperty("--background", newColors.background);
    root.style.setProperty("--foreground", newColors.foreground);
    
    // Update gradients based on new colors
    root.style.setProperty("--gradient-tropical", `linear-gradient(135deg, hsl(${newColors.primary}), hsl(175 85% 55%))`);
    root.style.setProperty("--gradient-sunset", `linear-gradient(135deg, hsl(${newColors.secondary}), hsl(25 95% 68%))`);
    root.style.setProperty("--gradient-vibrant", `linear-gradient(135deg, hsl(${newColors.primary}), hsl(${newColors.secondary}))`);
  };

  const handleColorChange = (colorKey: keyof ThemeColors, value: string) => {
    const newColors = { ...colors, [colorKey]: value };
    setColors(newColors);
  };

  const handleSave = () => {
    applyColors(colors);
    localStorage.setItem("themeColors", JSON.stringify(colors));
    toast.success("Cores atualizadas com sucesso!");
  };

  const handleReset = () => {
    setColors(defaultColors);
    applyColors(defaultColors);
    localStorage.removeItem("themeColors");
    toast.success("Cores resetadas para o padrão!");
  };

  const hslToHex = (hsl: string) => {
    const [h, s, l] = hsl.split(" ").map((v) => parseFloat(v));
    const hDecimal = h / 360;
    const sDecimal = s / 100;
    const lDecimal = l / 100;

    const c = (1 - Math.abs(2 * lDecimal - 1)) * sDecimal;
    const x = c * (1 - Math.abs(((hDecimal * 6) % 2) - 1));
    const m = lDecimal - c / 2;

    let r = 0, g = 0, b = 0;
    if (hDecimal < 1/6) { r = c; g = x; b = 0; }
    else if (hDecimal < 2/6) { r = x; g = c; b = 0; }
    else if (hDecimal < 3/6) { r = 0; g = c; b = x; }
    else if (hDecimal < 4/6) { r = 0; g = x; b = c; }
    else if (hDecimal < 5/6) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }

    const toHex = (n: number) => {
      const hex = Math.round((n + m) * 255).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const hexToHsl = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const colorOptions = [
    { key: "primary" as keyof ThemeColors, label: "Cor Primária", description: "Cor principal do site" },
    { key: "secondary" as keyof ThemeColors, label: "Cor Secundária", description: "Cor complementar" },
    { key: "accent" as keyof ThemeColors, label: "Cor de Destaque", description: "Cor para elementos em destaque" },
    { key: "background" as keyof ThemeColors, label: "Cor de Fundo", description: "Cor do fundo do site" },
    { key: "foreground" as keyof ThemeColors, label: "Cor do Texto", description: "Cor principal do texto" },
  ];

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <CardTitle>Gerenciador de Cores</CardTitle>
        </div>
        <CardDescription>
          Personalize as cores do site para combinar com a identidade visual do seu hotel
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6">
          {colorOptions.map(({ key, label, description }) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={key} className="text-sm font-medium">
                {label}
              </Label>
              <p className="text-xs text-muted-foreground">{description}</p>
              <div className="flex gap-3 items-center">
                <input
                  type="color"
                  id={key}
                  value={hslToHex(colors[key])}
                  onChange={(e) => handleColorChange(key, hexToHsl(e.target.value))}
                  className="h-10 w-20 rounded-md border border-input cursor-pointer"
                />
                <div className="flex-1">
                  <input
                    type="text"
                    value={colors[key]}
                    onChange={(e) => handleColorChange(key, e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
                    placeholder="ex: 190 95% 45%"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Formato HSL: matiz saturação% luminosidade%
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-4">
          <Button onClick={handleSave} className="flex-1">
            Salvar Cores
          </Button>
          <Button onClick={handleReset} variant="outline" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Resetar
          </Button>
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm font-medium mb-3">Preview das cores:</p>
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-[100px] space-y-1">
              <div className="h-12 rounded-md" style={{ backgroundColor: `hsl(${colors.primary})` }} />
              <p className="text-xs text-center text-muted-foreground">Primária</p>
            </div>
            <div className="flex-1 min-w-[100px] space-y-1">
              <div className="h-12 rounded-md" style={{ backgroundColor: `hsl(${colors.secondary})` }} />
              <p className="text-xs text-center text-muted-foreground">Secundária</p>
            </div>
            <div className="flex-1 min-w-[100px] space-y-1">
              <div className="h-12 rounded-md" style={{ backgroundColor: `hsl(${colors.accent})` }} />
              <p className="text-xs text-center text-muted-foreground">Destaque</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ThemeManager;
