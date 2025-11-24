import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Rating {
  id: string;
  activity_id: string;
  guest_name: string;
  room_number: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  activities: {
    name: string;
  };
}

export const RatingsManager = () => {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRatings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("activity_ratings")
      .select(`
        *,
        activities (
          name
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching ratings:", error);
      toast({
        title: "Erro ao carregar avaliações",
        variant: "destructive",
      });
    } else {
      setRatings(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("activity_ratings")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting rating:", error);
      toast({
        title: "Erro ao excluir avaliação",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Avaliação excluída com sucesso",
      });
      fetchRatings();
    }
  };

  useEffect(() => {
    fetchRatings();
  }, []);

  if (loading) {
    return <div className="text-center p-8">Carregando avaliações...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Avaliações das Atividades</h2>
        <p className="text-muted-foreground">{ratings.length} avaliações</p>
      </div>

      {ratings.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Nenhuma avaliação ainda
        </Card>
      ) : (
        <div className="grid gap-4">
          {ratings.map((rating) => (
            <Card key={rating.id} className="p-4">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{rating.activities.name}</h3>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= rating.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Por: {rating.guest_name}
                    {rating.room_number && ` • Apto ${rating.room_number}`} •{" "}
                    {format(new Date(rating.created_at), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                  {rating.comment && (
                    <p className="text-sm mt-2">{rating.comment}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(rating.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
