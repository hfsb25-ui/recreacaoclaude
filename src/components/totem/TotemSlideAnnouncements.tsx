import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, Sparkles } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
}

interface TotemSlideAnnouncementsProps {
  isActive: boolean;
}

export const TotemSlideAnnouncements = ({ isActive }: TotemSlideAnnouncementsProps) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const { data } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (data) setAnnouncements(data);
      setLoading(false);
    };

    fetchAnnouncements();
    const interval = setInterval(fetchAnnouncements, 300000);
    return () => clearInterval(interval);
  }, []);

  // Rotate announcements
  useEffect(() => {
    if (announcements.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [announcements.length]);

  const getImageUrl = (imagePath: string) => {
    const { data } = supabase.storage
      .from("announcements")
      .getPublicUrl(imagePath);
    return data.publicUrl;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-2xl text-muted-foreground">
          Carregando anúncios...
        </div>
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Megaphone className="w-24 h-24 mx-auto text-muted-foreground mb-4" />
          <p className="text-3xl text-muted-foreground">
            Nenhum anúncio no momento
          </p>
        </div>
      </div>
    );
  }

  const currentAnnouncement = announcements[currentIndex];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-3 mb-4">
          <Sparkles className="w-10 h-10 text-primary" />
          <h2 className="text-5xl font-bold text-foreground">Destaques</h2>
          <Sparkles className="w-10 h-10 text-primary" />
        </div>
      </div>

      {/* Announcement Display */}
      <div className="flex-1 flex items-center justify-center">
        <div
          key={currentAnnouncement.id}
          className="w-full max-w-4xl animate-fade-in"
        >
          {currentAnnouncement.image_url ? (
            <div className="grid grid-cols-2 gap-8 items-center">
              {/* Image */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src={getImageUrl(currentAnnouncement.image_url)}
                  alt={currentAnnouncement.title}
                  className="w-full h-auto object-cover aspect-[4/3]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </div>

              {/* Content */}
              <div className="space-y-6">
                <h3 className="text-5xl font-bold text-foreground leading-tight">
                  {currentAnnouncement.title}
                </h3>
                {currentAnnouncement.description && (
                  <p className="text-2xl text-muted-foreground leading-relaxed">
                    {currentAnnouncement.description}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center p-12 bg-card rounded-3xl border border-border">
              <h3 className="text-5xl font-bold text-foreground mb-6">
                {currentAnnouncement.title}
              </h3>
              {currentAnnouncement.description && (
                <p className="text-2xl text-muted-foreground max-w-2xl mx-auto">
                  {currentAnnouncement.description}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Indicators */}
      {announcements.length > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {announcements.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "bg-primary w-6"
                  : "bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
