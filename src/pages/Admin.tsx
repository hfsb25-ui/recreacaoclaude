import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Download } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import AgeGroupsManager from "@/components/admin/AgeGroupsManager";
import ActivitiesManager from "@/components/admin/ActivitiesManager";

const Admin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso!");
    navigate("/");
  };

  const handleExportToday = async () => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      
      // Fetch all activities for today with age group info
      const { data: activities, error } = await supabase
        .from("activities")
        .select("*, age_groups(name, color)")
        .eq("activity_date", today)
        .order("start_time", { ascending: true });

      if (error) throw error;

      if (!activities || activities.length === 0) {
        toast.error("Não há atividades cadastradas para hoje");
        return;
      }

      // Group by age group
      const grouped = activities.reduce((acc: any, activity: any) => {
        const ageGroupName = activity.age_groups?.name || "Sem faixa etária";
        if (!acc[ageGroupName]) {
          acc[ageGroupName] = [];
        }
        acc[ageGroupName].push(activity);
        return acc;
      }, {});

      // Create CSV content
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += `Programação de Recreação - ${format(new Date(), "dd/MM/yyyy", { locale: ptBR })}\n\n`;

      // Add activities grouped by age group
      Object.keys(grouped).forEach((ageGroup) => {
        csvContent += `\n${ageGroup}\n`;
        csvContent += "Horário,Atividade,Descrição\n";
        
        grouped[ageGroup].forEach((activity: any) => {
          const startTime = activity.start_time.substring(0, 5);
          const endTime = activity.end_time.substring(0, 5);
          const timeRange = `${startTime} - ${endTime}`;
          const description = activity.description?.replace(/,/g, ";") || "";
          csvContent += `"${timeRange}","${activity.name}","${description}"\n`;
        });
      });

      // Create download link
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `programacao_${format(new Date(), "yyyy-MM-dd")}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Programação exportada com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao exportar programação");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--gradient-bg)]">
        <p className="text-foreground text-lg">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--gradient-bg)] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-[var(--gradient-tropical)] bg-clip-text text-transparent mb-2">
              Painel Administrativo
            </h1>
            <p className="text-muted-foreground">Gerencie a programação de recreação</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleExportToday}
              variant="outline"
              className="hover:bg-primary/10 hover:text-primary transition-[var(--transition-smooth)]"
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar Hoje
            </Button>
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="hover:bg-destructive/10 hover:text-destructive transition-[var(--transition-smooth)]"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>

        <Tabs defaultValue="age-groups" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="age-groups">Faixas Etárias</TabsTrigger>
            <TabsTrigger value="activities">Atividades</TabsTrigger>
          </TabsList>

          <TabsContent value="age-groups" className="space-y-4">
            <AgeGroupsManager />
          </TabsContent>

          <TabsContent value="activities" className="space-y-4">
            <ActivitiesManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
