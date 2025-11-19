import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, Settings, Waves, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [footerText, setFooterText] = useState<string>("Recreação Hotel © 2024. Todos os direitos reservados.");
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
        .select("logo_url, footer_text")
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
    <div className="min-h-screen bg-[var(--gradient-bg)]">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between relative">
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
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 sm:gap-3 max-w-[60%] sm:max-w-none">
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
                  <div className="hidden sm:block">
                    <h1 className="text-2xl sm:text-3xl font-bold bg-[var(--gradient-tropical)] bg-clip-text text-transparent whitespace-nowrap">
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
          {/* CTA Button */}
          <div className="text-center mb-12">
            <Button
              size="lg"
              onClick={() => navigate("/programacao")}
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm sm:text-xl px-6 sm:px-12 py-6 sm:py-8 h-auto shadow-[var(--shadow-hover)] w-full sm:w-auto"
            >
              <Calendar className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6" />
              ACESSAR PROGRAMAÇÃO
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
    </div>
  );
};

export default Home;
