import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
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
}

const GamificationManager = () => {
  const [topGuests, setTopGuests] = useState<RankingGuest[]>([]);
  const [resetConfig, setResetConfig] = useState<ResetConfig | null>(null);
  const [resetDay1, setResetDay1] = useState("3");
  const [resetDay2, setResetDay2] = useState("0");
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

      // Reset all guests points and levels
      await supabase
        .from("guests")
        .update({ total_points: 0, current_level: 1 })
        .neq("id", "00000000-0000-0000-0000-000000000000");

      toast.success("Período finalizado e pontos resetados com sucesso!");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Erro ao finalizar período");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Configuração de Reset</h3>
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
        <Button onClick={handleSaveConfig} disabled={loading}>
          Salvar Configuração
        </Button>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Ranking Atual (Top 10)</h3>
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
                  <li>Resetar todos os pontos e níveis para 0</li>
                  <li>Criar um novo período de ranking</li>
                </ul>
                <br />
                Esta ação não pode ser desfeita.
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
