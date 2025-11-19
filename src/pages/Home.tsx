import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, Settings, Waves } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
}

const Home = () => {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (data) setAnnouncements(data);
    } catch (error) {
      console.error("Error fetching announcements:", error);
    } finally {
      setLoading(false);
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
        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--gradient-tropical)] rounded-xl">
              <Waves className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-[var(--gradient-tropical)] bg-clip-text text-transparent">
                Recreação Hotel
              </h1>
              <p className="text-muted-foreground text-sm">Bem-vindo!</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/auth")}
            className="hover:bg-primary/10 transition-[var(--transition-smooth)]"
          >
            <Settings className="mr-2 h-4 w-4" />
            Admin
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          {/* CTA Button */}
          <div className="text-center mb-12">
            <Button
              size="lg"
              onClick={() => navigate("/programacao")}
              className="bg-[var(--gradient-tropical)] hover:opacity-90 text-white text-xl px-12 py-8 h-auto shadow-[var(--shadow-hover)]"
            >
              <Calendar className="mr-3 h-6 w-6" />
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
                    <div className="w-full h-[200px] overflow-hidden bg-muted">
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
    </div>
  );
};

export default Home;
