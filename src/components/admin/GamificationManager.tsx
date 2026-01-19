import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FileDown } from "lucide-react";
import { jsPDF } from "jspdf";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface RankingGuest {
  id: string;
  name: string;
  room_number: string;
  total_points: number;
  current_level: number;
}

interface ResetConfig {
  id: string;
  reset_day_1: number;
  reset_day_2: number;
  reset_time: string;
}

const GamificationManager = () => {
  const [topGuests, setTopGuests] = useState<RankingGuest[]>([]);
  const [resetConfig, setResetConfig] = useState<ResetConfig | null>(null);
  const [resetDay1, setResetDay1] = useState("3");
  const [resetDay2, setResetDay2] = useState("0");
  const [resetTime, setResetTime] = useState("00:00");
  const [loading, setLoading] = useState(false);

  const weekDays = [
    { value: "0", label: "Domingo" },
    { value: "1", label: "Segunda-feira" },
    { value: "2", label: "Terça-feira" },
    { value: "3", label: "Quarta-feira" },
    { value: "4", label: "Quinta-feira" },
    { value: "5", label: "Sexta-feira" },
    { value: "6", label: "Sábado" },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch top 10 guests
    const { data: guestsData } = await supabase
      .from("guests")
      .select("*")
      .order("total_points", { ascending: false })
      .limit(10);

    if (guestsData) {
      setTopGuests(guestsData);
    }

    // Fetch reset config
    const { data: configData } = await supabase
      .from("reset_config")
      .select("*")
      .single();

    if (configData) {
      setResetConfig(configData);
      setResetDay1(configData.reset_day_1.toString());
      setResetDay2(configData.reset_day_2.toString());
      setResetTime(configData.reset_time || "00:00");
    }
  };

  const handleSaveConfig = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("reset_config")
        .update({
          reset_day_1: parseInt(resetDay1),
          reset_day_2: parseInt(resetDay2),
          reset_time: resetTime,
          updated_at: new Date().toISOString(),
        })
        .eq("id", resetConfig?.id);

      if (error) throw error;

      toast.success("Configuração de reset salva com sucesso!");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar configuração");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizePeriod = async () => {
    setLoading(true);
    try {
      // Get active period
      const { data: activePeriod } = await supabase
        .from("ranking_periods")
        .select("*")
        .eq("is_active", true)
        .single();

      if (!activePeriod) {
        throw new Error("Nenhum período ativo encontrado");
      }

      // Get top 3 guests
      const top3 = topGuests.slice(0, 3);

      // Count checkins for each guest
      const winnersData = await Promise.all(
        top3.map(async (guest, index) => {
          const { count } = await supabase
            .from("activity_checkins")
            .select("*", { count: "exact", head: true })
            .eq("guest_id", guest.id);

          const prizes = [
            "Mestre da Recreação",
            "Campeão da Diversão",
            "Estrela da Semana",
          ];

          return {
            ranking_period_id: activePeriod.id,
            guest_id: guest.id,
            guest_name: guest.name,
            room_number: guest.room_number,
            final_position: index + 1,
            total_points: guest.total_points,
            total_checkins: count || 0,
            prize_name: prizes[index],
          };
        })
      );

      // Save winners
      const { error: winnersError } = await supabase
        .from("ranking_winners")
        .insert(winnersData);

      if (winnersError) throw winnersError;

      // Close active period
      await supabase
        .from("ranking_periods")
        .update({ is_active: false })
        .eq("id", activePeriod.id);

      // Set guest_id to null in activity_ratings to preserve ratings but remove FK constraint
      const { error: ratingsError } = await supabase
        .from("activity_ratings")
        .update({ guest_id: null })
        .not("guest_id", "is", null);

      if (ratingsError) {
        console.error("Error updating ratings:", ratingsError);
      }

      // Delete all check-ins
      const { error: checkinsError } = await supabase
        .from("activity_checkins")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (checkinsError) {
        console.error("Error deleting checkins:", checkinsError);
      }

      // Delete all guests
      const { error: guestsError } = await supabase
        .from("guests")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (guestsError) {
        console.error("Error deleting guests:", guestsError);
        throw new Error(`Erro ao deletar hóspedes: ${guestsError.message}`);
      }

      // Create new period
      const newPeriodNumber = activePeriod.period_number + 1;
      await supabase.from("ranking_periods").insert({
        period_number: newPeriodNumber,
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        is_active: true,
      });

      toast.success("Período finalizado! Todos os hóspedes foram removidos.");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Erro ao finalizar período");
    } finally {
      setLoading(false);
    }
  };

  const exportRankingPdf = async (guests: RankingGuest[]) => {
    const top3 = guests.slice(0, 3);
    
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

    // Background gradient effect (light blue to white)
    doc.setFillColor(240, 248, 255);
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    // Header decoration
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, pageWidth, 50, "F");

    // Title (without emoji - using text only)
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(32);
    doc.setFont("helvetica", "bold");
    doc.text("RANKING TOP 3", pageWidth / 2, 30, { align: "center" });

    // Period info
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    const today = new Date().toLocaleDateString("pt-BR");
    doc.text(`Atualizado em: ${today}`, pageWidth / 2, 42, { align: "center" });

    // Reset text color for content
    doc.setTextColor(30, 30, 30);

    // Ranking items - TOP 3 only
    let yPos = 70;
    const rowHeight = 28;

    top3.forEach((guest, index) => {
      const position = index + 1;

      // Medal/position background with larger boxes for top 3
      const colors: Record<number, [number, number, number]> = {
        1: [255, 215, 0],   // Gold
        2: [192, 192, 192], // Silver
        3: [205, 127, 50],  // Bronze
      };
      doc.setFillColor(...colors[position]);
      doc.roundedRect(margin, yPos - 6, pageWidth - 2 * margin, rowHeight, 4, 4, "F");

      // Position number (using text instead of emoji)
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(50, 50, 50);
      const posText = `${position}o`;
      doc.text(posText, margin + 12, yPos + 8);

      // Guest name (truncate if too long to avoid overlap)
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      const maxNameWidth = 80; // Maximum width for name
      let displayName = guest.name;
      while (doc.getTextWidth(displayName) > maxNameWidth && displayName.length > 10) {
        displayName = displayName.slice(0, -1);
      }
      if (displayName !== guest.name) {
        displayName += "...";
      }
      doc.text(displayName, margin + 35, yPos + 6);

      // Room number
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text(`Quarto ${guest.room_number}`, margin + 35, yPos + 14);

      // Points - positioned to the right with fixed position
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(59, 130, 246);
      doc.text(`${guest.total_points} pts`, pageWidth - margin - 5, yPos + 8, { align: "right" });

      yPos += rowHeight + 8;
    });

    // CTA Section
    yPos += 20;
    
    // CTA Background
    doc.setFillColor(34, 197, 94); // Green
    doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 50, 6, 6, "F");
    
    // CTA Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("AINDA DA TEMPO!", pageWidth / 2, yPos + 18, { align: "center" });
    
    // CTA Subtitle
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Entre para o Hall da Fama do Santa Barbara!", pageWidth / 2, yPos + 30, { align: "center" });
    
    // CTA instruction
    doc.setFontSize(10);
    doc.text("Cadastre-se e participe das atividades para ganhar pontos!", pageWidth / 2, yPos + 42, { align: "center" });

    // Footer
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text(
      "Participe das atividades e ganhe pontos!",
      pageWidth / 2,
      pageHeight - 20,
      { align: "center" }
    );

    // Save PDF
    doc.save(`ranking-top3-${today.replace(/\//g, "-")}.pdf`);
    toast.success("PDF do ranking exportado com sucesso!");
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Configuração de Reset</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Reset configurado para {weekDays.find(d => d.value === resetDay1)?.label} e {weekDays.find(d => d.value === resetDay2)?.label} às {resetTime}
        </p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <Label>Primeiro Dia de Reset</Label>
            <Select value={resetDay1} onValueChange={setResetDay1}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {weekDays.map((day) => (
                  <SelectItem key={day.value} value={day.value}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Segundo Dia de Reset</Label>
            <Select value={resetDay2} onValueChange={setResetDay2}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {weekDays.map((day) => (
                  <SelectItem key={day.value} value={day.value}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2 mb-4">
          <Label>Horário do Reset</Label>
          <Input 
            type="time" 
            value={resetTime} 
            onChange={(e) => setResetTime(e.target.value)}
          />
        </div>
        <Button onClick={handleSaveConfig} disabled={loading}>
          Salvar Configuração
        </Button>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Ranking Atual (Top 10)</h3>
          {topGuests.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportRankingPdf(topGuests)}
            >
              <FileDown className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          )}
        </div>
        {topGuests.length === 0 ? (
          <p className="text-muted-foreground">Nenhum hóspede cadastrado</p>
        ) : (
          <div className="space-y-3 mb-4">
            {topGuests.map((guest, index) => (
              <div
                key={guest.id}
                className="flex justify-between items-center p-3 bg-muted rounded-lg"
              >
                <div>
                  <span className="font-bold mr-3">{index + 1}º</span>
                  <span className="font-medium">{guest.name}</span>
                  <span className="text-muted-foreground ml-2">
                    (Quarto {guest.room_number})
                  </span>
                </div>
                <div className="text-primary font-bold">{guest.total_points} pts</div>
              </div>
            ))}
          </div>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={loading || topGuests.length === 0}>
              Finalizar Período e Resetar Pontos
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Finalização do Período</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação irá:
                <ul className="list-disc list-inside mt-2">
                  <li>Salvar os Top 3 no Hall da Fama</li>
                  <li><strong>EXCLUIR TODOS os hóspedes cadastrados</strong></li>
                  <li><strong>EXCLUIR TODOS os check-ins</strong></li>
                  <li>Criar um novo período de ranking</li>
                </ul>
                <br />
                Os novos hóspedes poderão se cadastrar nos mesmos quartos.
                <br />
                <strong>Esta ação não pode ser desfeita.</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleFinalizePeriod}>
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Todos os Hóspedes</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Total de hóspedes cadastrados: {topGuests.length}
        </p>
        <Button
          variant="outline"
          onClick={() => window.open("/hall-of-fame", "_blank")}
        >
          Ver Hall da Fama
        </Button>
      </Card>
    </div>
  );
};

export default GamificationManager;
