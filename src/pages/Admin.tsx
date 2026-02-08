import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Download, CalendarIcon, Settings2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import AgeGroupsManager from "@/components/admin/AgeGroupsManager";
import ActivitiesManager from "@/components/admin/ActivitiesManager";
import ThemeManager from "@/components/admin/ThemeManager";
import AnnouncementsManager from "@/components/admin/AnnouncementsManager";
import { MenuItemsManager } from "@/components/admin/MenuItemsManager";
import { UsersManager } from "@/components/admin/UsersManager";
import { LogoManager } from "@/components/admin/LogoManager";
import { SiteNameManager } from "@/components/admin/SiteNameManager";
import { RatingsManager } from "@/components/admin/RatingsManager";
import { ActivityTemplatesManager } from "@/components/admin/ActivityTemplatesManager";
import { SplashScreenManager } from "@/components/admin/SplashScreenManager";
import { WeatherLocationManager } from "@/components/admin/WeatherLocationManager";
import GamificationManager from "@/components/admin/GamificationManager";
import { StatisticsManager } from "@/components/admin/StatisticsManager";
import { KPIDashboard } from "@/components/admin/KPIDashboard";
import { PwaIconManager } from "@/components/admin/PwaIconManager";
import TotemManager from "@/components/admin/TotemManager";
import { useUserRole } from "@/hooks/useUserRole";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { PdfSettingsManager, PdfSettings, loadPdfSettings, savePdfSettings, getDefaultPdfSettings } from "@/components/admin/PdfSettingsManager";
import { DatabaseExport } from "@/components/admin/DatabaseExport";
import { DatabaseImport } from "@/components/admin/database/DatabaseImport";

const Admin = () => {
  const navigate = useNavigate();
  const { role, loading: roleLoading, isGestor } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>("all");
  const [ageGroups, setAgeGroups] = useState<any[]>([]);
  const [pdfSettings, setPdfSettings] = useState<PdfSettings>(getDefaultPdfSettings());
  const [showPdfSettings, setShowPdfSettings] = useState(false);

  // Helper function to format date without timezone issues
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    checkAuth();
    fetchAgeGroups();
    loadPdfSettingsFromDb();
  }, []);

  const loadPdfSettingsFromDb = async () => {
    const settings = await loadPdfSettings();
    setPdfSettings(settings);
  };

  const fetchAgeGroups = async () => {
    const { data, error } = await supabase
      .from("age_groups")
      .select("*")
      .order("sort_order", { ascending: true });
    
    if (error) {
      toast.error("Erro ao carregar faixas etárias");
      return;
    }
    
    setAgeGroups(data || []);
  };

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso!");
    navigate("/");
  };

  const handlePdfSettingsChange = (newSettings: PdfSettings) => {
    setPdfSettings(newSettings);
    savePdfSettings(newSettings);
  };

  const addBackgroundImage = (pdf: jsPDF, settings: PdfSettings) => {
    if (!settings.backgroundImage) return;
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Save current graphics state
    pdf.saveGraphicsState();
    
    // Set opacity for background
    const gState = pdf.GState({ opacity: settings.backgroundOpacity });
    pdf.setGState(gState);
    
    // Add background image covering the entire page
    try {
      pdf.addImage(settings.backgroundImage, 'JPEG', 0, 0, pageWidth, pageHeight);
    } catch (error) {
      console.error("Error adding background image:", error);
    }
    
    // Restore graphics state
    pdf.restoreGraphicsState();
  };

  const generatePdfForAgeGroup = (group: any, dateStr: string, settings: PdfSettings) => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = settings.pageMargin;
    let yPosition = margin;

    // Add background image to first page
    addBackgroundImage(pdf, settings);

    // Parse title color
    const titleHex = settings.titleColor.startsWith("#") ? settings.titleColor : "#0096B4";
    const titleR = parseInt(titleHex.slice(1, 3), 16);
    const titleG = parseInt(titleHex.slice(3, 5), 16);
    const titleB = parseInt(titleHex.slice(5, 7), 16);

    // Header based on style
    if (settings.headerStyle !== "none") {
      // Title
      pdf.setFontSize(settings.titleFontSize);
      pdf.setTextColor(titleR, titleG, titleB);
      pdf.text("Programação de Recreação", pageWidth / 2, yPosition, { align: "center" });
      
      yPosition += settings.titleFontSize * 0.5;

      // Date
      if (settings.showDate) {
        pdf.setFontSize(settings.titleFontSize * 0.6);
        pdf.setTextColor(100, 100, 100);
        pdf.text(format(selectedDate, "dd/MM/yyyy", { locale: ptBR }), pageWidth / 2, yPosition, { align: "center" });
        yPosition += 10;
      }
      
      yPosition += 5;
    }

    // Age group header with colored background
    const hexColor = group.color.startsWith("#") ? group.color : "#00BCD4";
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    if (settings.headerStyle === "full") {
      pdf.setFillColor(r, g, b);
      const headerHeight = settings.activityFontSize * 1.2;
      pdf.rect(margin, yPosition - headerHeight * 0.4, pageWidth - 2 * margin, headerHeight, "F");
      pdf.setTextColor(255, 255, 255);
    } else {
      pdf.setTextColor(r, g, b);
    }
    
    pdf.setFontSize(settings.activityFontSize + 2);
    pdf.setFont("helvetica", "bold");
    pdf.text(group.name, settings.headerStyle === "full" ? margin + 5 : margin, yPosition + 2);
    
    yPosition += settings.activityFontSize + 4;

    // Recreadores (staff names) below age group
    if (group.recreadores && group.recreadores.length > 0) {
      pdf.setFontSize(settings.descriptionFontSize);
      pdf.setFont("helvetica", "italic");
      pdf.setTextColor(80, 80, 80);
      const recreadorNames = group.recreadores.map((r: any) => r.recreador_name).join(", ");
      pdf.text(`Recreadores: ${recreadorNames}`, margin + 5, yPosition);
      yPosition += settings.descriptionFontSize + 4;
    }

    yPosition += 4;

    // Activities table
    pdf.setTextColor(50, 50, 50);
    pdf.setFont("helvetica", "normal");

    group.activities.forEach((activity: any) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 30) {
        pdf.addPage();
        addBackgroundImage(pdf, settings);
        yPosition = margin;
      }

      const startTime = activity.start_time.substring(0, 5);
      const endTime = activity.end_time.substring(0, 5);
      const timeRange = `${startTime} - ${endTime}`;

      // Time
      pdf.setFontSize(settings.timeFontSize);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(50, 50, 50);
      pdf.text(timeRange, margin + 5, yPosition);
      
      // Activity name
      pdf.setFontSize(settings.activityFontSize);
      pdf.setFont("helvetica", "normal");
      const timeWidth = settings.timeFontSize * 4;
      pdf.text(activity.name, margin + timeWidth + 10, yPosition);

      // Description (if exists and enabled)
      if (activity.description && settings.showDescription) {
        yPosition += settings.descriptionFontSize * 0.6;
        pdf.setFontSize(settings.descriptionFontSize);
        pdf.setTextColor(100, 100, 100);
        const splitDescription = pdf.splitTextToSize(activity.description, pageWidth - 2 * margin - timeWidth - 15);
        pdf.text(splitDescription, margin + timeWidth + 10, yPosition);
        yPosition += splitDescription.length * (settings.descriptionFontSize * 0.45);
      }

      yPosition += settings.activityFontSize * 0.5;
      pdf.setTextColor(50, 50, 50);
    });

    // Sanitize filename - remove special characters
    const sanitizedName = group.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "_")
      .toLowerCase();

    pdf.save(`programacao_${dateStr}_${sanitizedName}.pdf`);
  };

  const handleExport = async () => {
    try {
      // Reload PDF settings from database before export
      const freshSettings = await loadPdfSettings();
      setPdfSettings(freshSettings);
      
      const dateStr = formatDateLocal(selectedDate);
      
      // Build query
      let query = supabase
        .from("activities")
        .select("*, age_groups(id, name, color)")
        .eq("activity_date", dateStr)
        .order("start_time", { ascending: true });
      
      // Filter by age group if not "all"
      if (selectedAgeGroup !== "all") {
        query = query.eq("age_group_id", selectedAgeGroup);
      }
      
      const { data: activities, error } = await query;

      if (error) throw error;

      if (!activities || activities.length === 0) {
        toast.error("Não há atividades cadastradas para esta data");
        return;
      }

      // Get all unique age group IDs
      const ageGroupIds = [...new Set(activities.map(a => a.age_groups?.id).filter(Boolean))];
      
      // Fetch recreadores for these age groups
      const { data: recreadoresData } = await supabase
        .from("age_group_recreadores")
        .select("age_group_id, recreador_name")
        .in("age_group_id", ageGroupIds);

      // Group recreadores by age group
      const recreadoresByGroup = (recreadoresData || []).reduce((acc: any, item: any) => {
        if (!acc[item.age_group_id]) {
          acc[item.age_group_id] = [];
        }
        acc[item.age_group_id].push(item);
        return acc;
      }, {});

      // Group activities by age group
      const grouped = activities.reduce((acc: any, activity: any) => {
        const ageGroupId = activity.age_groups?.id;
        const ageGroupName = activity.age_groups?.name || "Sem faixa etária";
        if (!acc[ageGroupName]) {
          acc[ageGroupName] = {
            name: ageGroupName,
            color: activity.age_groups?.color || "#00BCD4",
            recreadores: ageGroupId ? recreadoresByGroup[ageGroupId] || [] : [],
            activities: []
          };
        }
        acc[ageGroupName].activities.push(activity);
        return acc;
      }, {});

      const groups = Object.values(grouped);
      
      // Generate one PDF per age group using fresh settings
      groups.forEach((group: any) => {
        generatePdfForAgeGroup(group, format(selectedDate, "yyyy-MM-dd"), freshSettings);
      });

      toast.success(`${groups.length} PDF(s) exportado(s) com sucesso!`);
      setExportDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao exportar programação");
    }
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--gradient-bg)]">
        <p className="text-foreground text-lg">Carregando...</p>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--gradient-bg)]">
        <Card className="p-8 text-center">
          <p className="text-foreground text-lg mb-4">Acesso não autorizado</p>
          <p className="text-muted-foreground mb-4">Seu usuário ainda não possui um nível de acesso atribuído.</p>
          <Button onClick={() => navigate("/")}>Voltar para início</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--gradient-bg)] p-4 sm:p-6 overflow-x-hidden w-full">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-[var(--gradient-tropical)] bg-clip-text text-transparent mb-2">
              Painel Administrativo
            </h1>
            <p className="text-muted-foreground">Gerencie a programação de recreação</p>
          </div>
          <div className="flex gap-2">
            {isGestor && <DatabaseImport />}
            {isGestor && <DatabaseExport />}
            <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="hover:bg-primary/10 hover:text-primary transition-[var(--transition-smooth)]"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exportar PDF
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Exportar Programação</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Data</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !selectedDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecione a data</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => date && setSelectedDate(date)}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Faixa Etária</label>
                      <Select value={selectedAgeGroup} onValueChange={setSelectedAgeGroup}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a faixa etária" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as faixas etárias</SelectItem>
                          {ageGroups.map((group) => (
                            <SelectItem key={group.id} value={group.id}>
                              {group.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Collapsible open={showPdfSettings} onOpenChange={setShowPdfSettings}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-3 h-auto">
                        <span className="flex items-center gap-2 text-sm">
                          <Settings2 className="h-4 w-4" />
                          Personalizar PDF
                        </span>
                        {showPdfSettings ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <PdfSettingsManager 
                        settings={pdfSettings} 
                        onSettingsChange={handlePdfSettingsChange} 
                      />
                    </CollapsibleContent>
                  </Collapsible>
                  
                  <Button onClick={handleExport} className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Exportar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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

        <Tabs defaultValue="age-groups" className="w-full max-w-full">
          <div className="w-full overflow-x-auto mb-6 scrollbar-thin -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex h-auto p-1 gap-1 w-max">
              <TabsTrigger value="age-groups" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">Faixas Etárias</TabsTrigger>
              <TabsTrigger value="activity-templates" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">Catálogo</TabsTrigger>
              <TabsTrigger value="activities" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">Atividades</TabsTrigger>
              {isGestor && (
                <>
                  <TabsTrigger value="ratings" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">Avaliações</TabsTrigger>
                  <TabsTrigger value="gamification" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">Gamificação</TabsTrigger>
                  <TabsTrigger value="statistics" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">Estatísticas</TabsTrigger>
                  <TabsTrigger value="kpis" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">KPIs</TabsTrigger>
                  <TabsTrigger value="announcements" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">Anúncios</TabsTrigger>
                  <TabsTrigger value="menu" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">Menu</TabsTrigger>
                  <TabsTrigger value="totem" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">Totem</TabsTrigger>
                  <TabsTrigger value="site-name" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">Nome</TabsTrigger>
                  <TabsTrigger value="users" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">Usuários</TabsTrigger>
                  <TabsTrigger value="settings" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 flex items-center gap-1">
                    <Settings2 className="h-3 w-3" />
                    Configurações
                  </TabsTrigger>
                </>
              )}
            </TabsList>
          </div>

          <TabsContent value="age-groups" className="space-y-4">
            <AgeGroupsManager />
          </TabsContent>

          <TabsContent value="activity-templates" className="space-y-4">
            <ActivityTemplatesManager />
          </TabsContent>

          <TabsContent value="activities" className="space-y-4">
            <ActivitiesManager />
          </TabsContent>

          {isGestor && (
            <>
              <TabsContent value="ratings" className="space-y-4">
                <RatingsManager />
              </TabsContent>

              <TabsContent value="gamification" className="space-y-4">
                <GamificationManager />
              </TabsContent>

              <TabsContent value="statistics" className="space-y-4">
                <StatisticsManager />
              </TabsContent>

              <TabsContent value="kpis" className="space-y-4">
                <KPIDashboard />
              </TabsContent>

              <TabsContent value="announcements" className="space-y-4">
                <AnnouncementsManager />
              </TabsContent>

              <TabsContent value="menu" className="space-y-4">
                <MenuItemsManager />
              </TabsContent>

              <TabsContent value="totem" className="space-y-4">
                <TotemManager />
              </TabsContent>

              <TabsContent value="site-name" className="space-y-4">
                <SiteNameManager />
              </TabsContent>

              <TabsContent value="users" className="space-y-4">
                <UsersManager />
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <Card className="p-4">
                  <Tabs defaultValue="logo" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1 h-auto">
                      <TabsTrigger value="logo" className="text-xs sm:text-sm">Logo</TabsTrigger>
                      <TabsTrigger value="pwa-icon" className="text-xs sm:text-sm">Ícone PWA</TabsTrigger>
                      <TabsTrigger value="theme" className="text-xs sm:text-sm">Cores</TabsTrigger>
                      <TabsTrigger value="weather" className="text-xs sm:text-sm">Clima</TabsTrigger>
                    </TabsList>
                    <TabsContent value="logo" className="mt-4">
                      <LogoManager />
                    </TabsContent>
                    <TabsContent value="pwa-icon" className="mt-4">
                      <PwaIconManager />
                    </TabsContent>
                    <TabsContent value="theme" className="mt-4 space-y-4">
                      <ThemeManager />
                      <SplashScreenManager />
                    </TabsContent>
                    <TabsContent value="weather" className="mt-4">
                      <WeatherLocationManager />
                    </TabsContent>
                  </Tabs>
                </Card>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
