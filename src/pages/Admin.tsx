import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Download } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
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
          acc[ageGroupName] = {
            name: ageGroupName,
            color: activity.age_groups?.color || "#00BCD4",
            activities: []
          };
        }
        acc[ageGroupName].activities.push(activity);
        return acc;
      }, {});

      // Create PDF
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;

      // Title
      pdf.setFontSize(20);
      pdf.setTextColor(0, 150, 180);
      pdf.text("Programação de Recreação", pageWidth / 2, yPosition, { align: "center" });
      
      yPosition += 10;
      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      pdf.text(format(new Date(), "dd/MM/yyyy", { locale: ptBR }), pageWidth / 2, yPosition, { align: "center" });
      
      yPosition += 15;

      // Add activities grouped by age group
      Object.values(grouped).forEach((group: any) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = margin;
        }

        // Age group header with colored background
        const hexColor = group.color.startsWith("#") ? group.color : "#00BCD4";
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        
        pdf.setFillColor(r, g, b);
        pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 10, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(14);
        pdf.text(group.name, margin + 5, yPosition + 2);
        
        yPosition += 12;

        // Activities table
        pdf.setTextColor(50, 50, 50);
        pdf.setFontSize(10);

        group.activities.forEach((activity: any) => {
          // Check if we need a new page
          if (yPosition > pageHeight - 30) {
            pdf.addPage();
            yPosition = margin;
          }

          const startTime = activity.start_time.substring(0, 5);
          const endTime = activity.end_time.substring(0, 5);
          const timeRange = `${startTime} - ${endTime}`;

          // Time
          pdf.setFont("helvetica", "bold");
          pdf.text(timeRange, margin + 5, yPosition);
          
          // Activity name
          pdf.setFont("helvetica", "normal");
          pdf.text(activity.name, margin + 45, yPosition);

          // Description (if exists)
          if (activity.description) {
            yPosition += 5;
            pdf.setFontSize(9);
            pdf.setTextColor(100, 100, 100);
            const splitDescription = pdf.splitTextToSize(activity.description, pageWidth - 2 * margin - 50);
            pdf.text(splitDescription, margin + 45, yPosition);
            yPosition += splitDescription.length * 4;
          }

          yPosition += 8;
          pdf.setFontSize(10);
          pdf.setTextColor(50, 50, 50);
        });

        yPosition += 5;
      });

      // Save PDF
      pdf.save(`programacao_${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("Programação exportada em PDF!");
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
