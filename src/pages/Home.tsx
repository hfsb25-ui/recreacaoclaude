import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, Settings, Waves, Menu, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WeatherWidget } from "@/components/WeatherWidget";
import { useGuestAuth } from "@/hooks/useGuestAuth";
import { InstallPrompt } from "@/components/InstallPrompt";
import { NotificationPrompt } from "@/components/NotificationPrompt";

interface Announcement {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
}

interface MenuItem {
  id: string;
  title: string;
  url: string;
  is_active: boolean;
}

const Home = () => {
  const navigate = useNavigate();
  const { guest, currentLevel, logout } = useGuestAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [footerText, setFooterText] = useState<string>("Recreação Hotel © 2024. Todos os direitos reservados.");
  const [weatherLat, setWeatherLat] = useState<number | null>(null);
  const [weatherLng, setWeatherLng] = useState<number | null>(null);
  const [weatherCity, setWeatherCity] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
    fetchMenuItems();
    fetchLogo();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      console.log("Fetching announcements...");
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      console.log("Announcements data:", data);
      console.log("Announcements error:", error);

      if (data) setAnnouncements(data);
    } catch (error) {
      console.error("Error fetching announcements:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const { data } = await supabase
        .from("menu_items")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (data) setMenuItems(data);
    } catch (error) {
      console.error("Error fetching menu items:", error);
    }
  };

  const fetchLogo = async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("logo_url, footer_text, weather_latitude, weather_longitude, weather_city_name")
        .eq("id", "00000000-0000-0000-0000-000000000001")
        .maybeSingle();

      if (error) {
        console.error("Error fetching logo:", error);
        return;
      }

      if (data?.logo_url) {
        const { data: publicUrlData } = supabase.storage
          .from("logos")
          .getPublicUrl(data.logo_url);
        setLogoUrl(publicUrlData.publicUrl);
      }
      
      if (data?.footer_text) {
        setFooterText(data.footer_text);
      }

      if (data?.weather_latitude && data?.weather_longitude) {
        setWeatherLat(data.weather_latitude);
        setWeatherLng(data.weather_longitude);
        setWeatherCity(data.weather_city_name);
      }
    } catch (error) {
      console.error("Error fetching logo:", error);
    }
  };

  const handleMenuClick = (url: string) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      window.open(url, "_blank");
    } else {
      navigate(url);
    }
  };

  const getImageUrl = (path: string | null) => {
    if (!path) return null;
    const { data } = supabase.storage.from("announcements").getPublicUrl(path);
    return data.publicUrl;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <p className="text-foreground text-lg">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--gradient-bg)] overflow-x-hidden w-full">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 w-full">
          {guest && (
            <div className="flex items-center justify-center mb-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 hover:bg-primary/10">
                    <User className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      Olá, {guest.name}!
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-56 bg-background z-50">
                  <div className="px-2 py-3 space-y-2">
                    <div className="flex items-center gap-2 px-2">
                      <User className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold text-foreground">{guest.name}</p>
                        <p className="text-xs text-muted-foreground">Quarto {guest.room_number}</p>
                      </div>
                    </div>
                    <div className="border-t border-border my-2"></div>
                    <div className="px-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Pontos:</span>
                        <span className="font-bold text-primary">{guest.total_points}</span>
                      </div>
                      {currentLevel && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Nível:</span>
                          <span className="font-bold text-foreground">
                            {currentLevel.badge_emoji} {currentLevel.name}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="border-t border-border my-2"></div>
                    <DropdownMenuItem 
                      onClick={() => {
                        logout();
                        navigate("/");
                      }}
                      className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      Sair
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          <div className="flex items-center justify-between relative w-full">
            {/* Menu button - left */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 bg-background">
                {menuItems.map((item) => (
                  <DropdownMenuItem
                    key={item.id}
                    onClick={() => handleMenuClick(item.url)}
                    className="cursor-pointer"
                  >
                    {item.title}
                  </DropdownMenuItem>
                ))}
                {menuItems.length === 0 && (
                  <DropdownMenuItem disabled>Nenhum item no menu</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Logo - center */}
            <div className="flex-1 flex items-center justify-center gap-2 sm:gap-3 mx-2 overflow-hidden">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="Logo" 
                  className="h-10 sm:h-12 max-w-full object-contain"
                />
              ) : (
                <>
                  <div className="p-1.5 sm:p-2 bg-[var(--gradient-tropical)] rounded-xl shrink-0">
                    <Waves className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                  </div>
                  <div className="hidden sm:block overflow-hidden">
                    <h1 className="text-2xl sm:text-3xl font-bold bg-[var(--gradient-tropical)] bg-clip-text text-transparent truncate">
                      Recreação Hotel
                    </h1>
                    <p className="text-muted-foreground text-sm">Bem-vindo!</p>
                  </div>
                </>
              )}
            </div>

            {/* Settings button - right */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/auth")}
              className="hover:bg-primary/10 transition-[var(--transition-smooth)] shrink-0"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <section className="py-8 sm:py-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Weather Widget */}
          {weatherLat && weatherLng && (
            <div className="mb-8 max-w-md mx-auto">
              <WeatherWidget 
                latitude={weatherLat} 
                longitude={weatherLng} 
                cityName={weatherCity || undefined}
              />
            </div>
          )}

          {/* CTA Buttons */}
          <div className="text-center mb-12 flex flex-col sm:flex-row gap-4 justify-center items-center max-w-2xl mx-auto">
            <Button
              size="lg"
              onClick={() => navigate("/programacao")}
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm sm:text-xl px-6 sm:px-12 py-6 sm:py-8 h-auto shadow-[var(--shadow-hover)] w-full sm:flex-1"
            >
              <Calendar className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6" />
              ACESSAR PROGRAMAÇÃO
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate(guest ? "/guest-profile" : "/guest-auth")}
              className="text-sm sm:text-xl px-6 sm:px-12 py-6 sm:py-8 h-auto shadow-[var(--shadow-hover)] w-full sm:flex-1"
            >
              🎮 Área do Hóspede
            </Button>
          </div>

          {/* Announcements */}
          {announcements.length > 0 ? (
            <div className="space-y-6">
              {announcements.map((announcement) => (
                <Card
                  key={announcement.id}
                  className="overflow-hidden shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-hover)] transition-[var(--transition-smooth)]"
                >
                  {announcement.image_url && (
                    <div className="w-full h-[120px] sm:h-[160px] md:h-[200px] overflow-hidden bg-muted">
                      <img
                        src={getImageUrl(announcement.image_url) || ""}
                        alt={announcement.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <h2 className="text-2xl font-bold mb-2 text-foreground">
                      {announcement.title}
                    </h2>
                    {announcement.description && (
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {announcement.description}
                      </p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center shadow-[var(--shadow-soft)]">
              <p className="text-muted-foreground text-lg">
                Nenhum anúncio disponível no momento.
              </p>
            </Card>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-background/80 backdrop-blur-sm py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-sm text-muted-foreground">{footerText}</p>
        </div>
      </footer>

      {/* Install Prompt */}
      <InstallPrompt />
      
      {/* Notification Prompt */}
      <NotificationPrompt />
    </div>
  );
};

export default Home;
