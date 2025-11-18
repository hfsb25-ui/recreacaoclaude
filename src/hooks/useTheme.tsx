import { useEffect } from "react";

export const useTheme = () => {
  useEffect(() => {
    // Load colors from localStorage on mount
    const savedColors = localStorage.getItem("themeColors");
    if (savedColors) {
      try {
        const colors = JSON.parse(savedColors);
        const root = document.documentElement;
        
        Object.entries(colors).forEach(([key, value]) => {
          root.style.setProperty(`--${key}`, value as string);
        });
        
        // Update gradients based on saved colors
        if (colors.primary && colors.secondary) {
          root.style.setProperty("--gradient-tropical", `linear-gradient(135deg, hsl(${colors.primary}), hsl(175 85% 55%))`);
          root.style.setProperty("--gradient-sunset", `linear-gradient(135deg, hsl(${colors.secondary}), hsl(25 95% 68%))`);
          root.style.setProperty("--gradient-vibrant", `linear-gradient(135deg, hsl(${colors.primary}), hsl(${colors.secondary}))`);
        }
      } catch (error) {
        console.error("Error loading theme colors:", error);
      }
    }
  }, []);
};
