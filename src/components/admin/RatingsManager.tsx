import { useState, useEffect, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Trash2, FileDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { jsPDF } from "jspdf";

const RatingsCharts = lazy(() =>
  import("./RatingsCharts").then((module) => ({
    default: module.RatingsCharts,
  }))
);

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

  const calculateStats = () => {
    if (ratings.length === 0) return null;

    // Distribuição de estrelas
    const starDistribution = [1, 2, 3, 4, 5].map((star) => ({
      name: `${star}★`,
      value: ratings.filter((r) => r.rating === star).length,
      star,
    }));

    // Estatísticas por atividade
    const activityStats = ratings.reduce((acc, rating) => {
      const activityName = rating.activities.name;
      if (!acc[activityName]) {
        acc[activityName] = { name: activityName, ratings: [], total: 0 };
      }
      acc[activityName].ratings.push(rating.rating);
      acc[activityName].total++;
      return acc;
    }, {} as Record<string, { name: string; ratings: number[]; total: number }>);

    const activityCountData = Object.values(activityStats)
      .map((a) => ({ name: a.name, count: a.total }))
      .sort((a, b) => b.count - a.count);

    const activityAvgData = Object.values(activityStats)
      .map((a) => ({
        name: a.name,
        average: a.ratings.reduce((sum, r) => sum + r, 0) / a.ratings.length,
      }))
      .sort((a, b) => b.average - a.average);

    // Métricas gerais
    const totalRatings = ratings.length;
    const overallAverage =
      ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings;
    const mostRated = activityCountData[0];
    const bestRated = activityAvgData[0];

    return {
      starDistribution,
      activityCountData,
      activityAvgData,
      totalRatings,
      overallAverage,
      mostRated,
      bestRated,
    };
  };

  const stats = calculateStats();

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

  const exportRatingsPdf = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const lineHeight = 4;
    let yPos = margin;

    // Header
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, pageWidth, 20, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("AVALIAÇÕES DAS ATIVIDADES", pageWidth / 2, 13, { align: "center" });

    yPos = 30;

    // Stats summary
    if (stats) {
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Total: ${stats.totalRatings} avaliações | Média geral: ${stats.overallAverage.toFixed(1)} estrelas | Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
        pageWidth / 2,
        yPos,
        { align: "center" }
      );
      yPos += 8;
    }

    // Ratings list
    doc.setTextColor(30, 30, 30);

    ratings.forEach((rating, index) => {
      // Check if we need a new page
      if (yPos > pageHeight - 25) {
        doc.addPage();
        yPos = margin;
      }

      // Alternating background
      if (index % 2 === 0) {
        doc.setFillColor(248, 248, 248);
        doc.rect(margin - 2, yPos - 3, pageWidth - 2 * margin + 4, 14, "F");
      }

      // Activity name and stars
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      const stars = "★".repeat(rating.rating) + "☆".repeat(5 - rating.rating);
      doc.text(`${rating.activities.name}  ${stars}`, margin, yPos);

      // Guest info and date
      yPos += lineHeight;
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      const dateStr = format(new Date(rating.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR });
      const guestInfo = `${rating.guest_name}${rating.room_number ? ` - Apto ${rating.room_number}` : ""} | ${dateStr}`;
      doc.text(guestInfo, margin, yPos);

      // Comment if exists
      if (rating.comment) {
        yPos += lineHeight;
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(6);
        // Truncate long comments
        const maxWidth = pageWidth - 2 * margin;
        const lines = doc.splitTextToSize(`"${rating.comment}"`, maxWidth);
        doc.text(lines.slice(0, 2), margin, yPos); // Max 2 lines
        yPos += (Math.min(lines.length, 2) - 1) * lineHeight;
      }

      yPos += 6;
    });

    // Footer
    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    doc.text(
      "Relatório de Avaliações - Recreação Hotel",
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );

    const today = format(new Date(), "dd-MM-yyyy");
    doc.save(`avaliacoes-${today}.pdf`);
    toast({ title: "PDF exportado com sucesso!" });
  };

  if (loading) {
    return <div className="text-center p-8">Carregando avaliações...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Avaliações das Atividades</h2>
        <p className="text-muted-foreground">{ratings.length} avaliações</p>
      </div>

      {ratings.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Nenhuma avaliação ainda
        </Card>
      ) : (
        <>
          <Suspense
            fallback={
              <div className="text-center p-8">Carregando estatísticas...</div>
            }
          >
            <RatingsCharts stats={stats} />
          </Suspense>

          {/* Recent Ratings List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Avaliações Recentes</h3>
              <Button variant="outline" size="sm" onClick={exportRatingsPdf}>
                <FileDown className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
            </div>
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
          </div>
        </>
      )}
    </div>
  );
};
