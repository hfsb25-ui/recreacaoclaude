import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download,
  CalendarIcon,
  Settings2,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  BedDouble,
  Headset,
  Gift,
  Contact,
  CalendarDays,
  BookOpen,
  Baby,
  Star,
  Trophy,
  Bell,
  Megaphone,
  Newspaper,
  MonitorSmartphone,
  Hotel,
  Map as MapIcon,
  List as ListIcon,
  BarChart3,
  Gauge,
  History,
  UserCog,
  Palette,
  MessageCircle,
  Database,
} from "lucide-react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { PdfSettingsManager, PdfSettings, loadPdfSettings, savePdfSettings, getDefaultPdfSettings } from "@/components/admin/PdfSettingsManager";
import { DatabaseExport } from "@/components/admin/DatabaseExport";
import { DatabaseImport } from "@/components/admin/database/DatabaseImport";
import { WhatsAppManager } from "@/components/admin/WhatsAppManager";
import { RatingAlertsManager } from "@/components/admin/RatingAlertsManager";
import { RecreationReportManager } from "@/components/admin/RecreationReportManager";
import { PmsStaysManager } from "@/components/admin/PmsStaysManager";
import { PmsSummaryCards } from "@/components/admin/PmsSummaryCards";
import { LeadsManager } from "@/components/admin/LeadsManager";
import { LoginHistoryManager } from "@/components/admin/LoginHistoryManager";
import { MigrationManager } from "@/components/admin/MigrationManager";
import HotelInfoManager from "@/components/admin/HotelInfoManager";
import PasseiosManager from "@/components/admin/PasseiosManager";
import NotificacoesManager from "@/components/admin/NotificacoesManager";
import BrindesManager from "@/components/admin/BrindesManager";
import PopupsManager from "@/components/admin/PopupsManager";
import AtendimentoManager from "@/components/admin/AtendimentoManager";
import { AdminShell, type PaginaAdmin } from "@/components/admin/painel/AdminShell";
import { AdminPainel } from "@/components/admin/painel/AdminPainel";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbAny = supabase as any;

const Admin = () => {
  const navigate = useNavigate();
  const { role, loading: roleLoading, isGestor } = useUserRole();
  const [userEmail, setUserEmail] = useState("");
  const [badges, setBadges] = useState<{ brindes: number; mensagens: number; avaliacoes: number }>({ brindes: 0, mensagens: 0, avaliacoes: 0 });
  const [loading, setLoading] = useState(true);
  const [demorando, setDemorando] = useState(false);
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

  // Contadores do menu (só gestor)
  useEffect(() => {
    if (!isGestor) return;
    const carregar = async () => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const doisDias = new Date(hoje.getTime() - 2 * 86400000);
      const [b, m, a] = await Promise.all([
        dbAny.from("brindes_tripadvisor").select("id", { count: "exact", head: true }).is("entregue_em", null),
        dbAny.from("whatsapp_mensagens").select("id", { count: "exact", head: true }).eq("direcao", "entrada").gte("created_at", hoje.toISOString()),
        dbAny.from("activity_ratings").select("id", { count: "exact", head: true }).lte("rating", 2).gte("created_at", doisDias.toISOString()),
      ]);
      setBadges({ brindes: b.count ?? 0, mensagens: m.count ?? 0, avaliacoes: a.count ?? 0 });
    };
    carregar();
    const t = setInterval(carregar, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [isGestor]);

  useEffect(() => {
    checkAuth();
    fetchAgeGroups();
    loadPdfSettingsFromDb();
  }, []);

  // Se ficar carregando muito tempo, oferece entrar de novo
  useEffect(() => {
    if (!(loading || roleLoading)) return;
    const t = setTimeout(() => setDemorando(true), 8000);
    return () => clearTimeout(t);
  }, [loading, roleLoading]);

  const entrarDeNovo = async () => {
    try {
      await Promise.race([
        supabase.auth.signOut({ scope: "local" }),
        new Promise((r) => setTimeout(r, 3000)),
      ]);
    } catch {
      // segue mesmo assim
    }
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("sb-") && k.endsWith("-auth-token"))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      // sem armazenamento
    }
    window.location.href = "/auth";
  };

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
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUserEmail(session.user.email ?? "");
    } catch (e) {
      console.error("Erro ao conferir a sessão:", e);
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
        <div className="flex flex-col items-center gap-4 p-6 text-center">
          <p className="text-foreground text-lg">Carregando...</p>
          {demorando && (
            <>
              <p className="text-muted-foreground max-w-xs">
                Está demorando mais que o normal. Pode ser a sessão que expirou.
              </p>
              <Button onClick={entrarDeNovo}>Entrar de novo</Button>
            </>
          )}
        </div>
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

  const irPara = (id: string) => {
    window.location.hash = id;
  };

  const paginas: PaginaAdmin[] = [
    {
      id: "painel",
      rotulo: "Painel",
      grupo: null,
      icone: LayoutDashboard,
      titulo: "Painel",
      sub: `Hoje, ${format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}`,
      render: () => <AdminPainel isGestor={isGestor} irPara={irPara} />,
    },
    {
      id: "hospedes",
      rotulo: "Hospedados agora",
      curto: "Hóspedes",
      grupo: "Hóspedes",
      icone: BedDouble,
      sub: "Quem está no hotel, vindo do TOTVS",
      render: () => (
        <div className="space-y-4">
          <PmsSummaryCards />
          <PmsStaysManager />
        </div>
      ),
    },
    ...(isGestor
      ? ([
          { id: "atendimento", rotulo: "Atendimento", grupo: "Hóspedes", icone: Headset, badge: badges.mensagens, render: () => <AtendimentoManager /> },
          { id: "brindes", rotulo: "Brindes", grupo: "Hóspedes", icone: Gift, badge: badges.brindes, render: () => <BrindesManager /> },
          { id: "leads", rotulo: "Contatos (leads)", grupo: "Hóspedes", icone: Contact, render: () => <LeadsManager /> },
        ] as PaginaAdmin[])
      : []),
    { id: "atividades", rotulo: "Programação", grupo: "Recreação", icone: CalendarDays, sub: "Atividades por dia e faixa etária", render: () => <ActivitiesManager /> },
    { id: "catalogo", rotulo: "Catálogo de atividades", curto: "Catálogo", grupo: "Recreação", icone: BookOpen, render: () => <ActivityTemplatesManager /> },
    { id: "faixas", rotulo: "Faixas etárias", grupo: "Recreação", icone: Baby, render: () => <AgeGroupsManager /> },
    ...(isGestor
      ? ([
          { id: "avaliacoes", rotulo: "Avaliações", grupo: "Recreação", icone: Star, badge: badges.avaliacoes, render: () => <RatingsManager /> },
          { id: "ranking", rotulo: "Ranking e jogos", grupo: "Recreação", icone: Trophy, render: () => <GamificationManager /> },
          { id: "notificacoes", rotulo: "Notificações", curto: "Comunicar", grupo: "Comunicação", icone: Bell, sub: "Avisos no celular de quem baixou o app", render: () => <NotificacoesManager /> },
          { id: "popups", rotulo: "Popups", grupo: "Comunicação", icone: Megaphone, render: () => <PopupsManager /> },
          { id: "avisos", rotulo: "Anúncios", grupo: "Comunicação", icone: Newspaper, render: () => <AnnouncementsManager /> },
          { id: "totem", rotulo: "Totem", grupo: "Comunicação", icone: MonitorSmartphone, render: () => <TotemManager /> },
          { id: "hotel", rotulo: "Informações do hotel", grupo: "Hotel", icone: Hotel, render: () => <HotelInfoManager /> },
          { id: "passeios", rotulo: "Passeios", grupo: "Hotel", icone: MapIcon, render: () => <PasseiosManager /> },
          { id: "menu", rotulo: "Menu do app", grupo: "Hotel", icone: ListIcon, render: () => <MenuItemsManager /> },
          { id: "estatisticas", rotulo: "Estatísticas", grupo: "Relatórios", icone: BarChart3, render: () => <StatisticsManager /> },
          { id: "kpis", rotulo: "KPIs", grupo: "Relatórios", icone: Gauge, render: () => <KPIDashboard /> },
          { id: "logins", rotulo: "Logins", grupo: "Relatórios", icone: History, render: () => <LoginHistoryManager /> },
          { id: "usuarios", rotulo: "Usuários", grupo: "Sistema", icone: UserCog, render: () => <UsersManager /> },
          {
            id: "aparencia",
            rotulo: "Aparência",
            grupo: "Sistema",
            icone: Palette,
            sub: "Nome, logo, ícone, cores e clima",
            render: () => (
              <Card className="p-4">
                <Tabs defaultValue="nome" className="w-full">
                  <TabsList className="grid h-auto w-full grid-cols-3 gap-1 sm:grid-cols-5">
                    <TabsTrigger value="nome" className="text-xs sm:text-sm">Nome</TabsTrigger>
                    <TabsTrigger value="logo" className="text-xs sm:text-sm">Logo</TabsTrigger>
                    <TabsTrigger value="pwa-icon" className="text-xs sm:text-sm">Ícone do app</TabsTrigger>
                    <TabsTrigger value="theme" className="text-xs sm:text-sm">Cores</TabsTrigger>
                    <TabsTrigger value="weather" className="text-xs sm:text-sm">Clima</TabsTrigger>
                  </TabsList>
                  <TabsContent value="nome" className="mt-4"><SiteNameManager /></TabsContent>
                  <TabsContent value="logo" className="mt-4"><LogoManager /></TabsContent>
                  <TabsContent value="pwa-icon" className="mt-4"><PwaIconManager /></TabsContent>
                  <TabsContent value="theme" className="mt-4 space-y-4">
                    <ThemeManager />
                    <SplashScreenManager />
                  </TabsContent>
                  <TabsContent value="weather" className="mt-4"><WeatherLocationManager /></TabsContent>
                </Tabs>
              </Card>
            ),
          },
          {
            id: "whatsapp",
            rotulo: "WhatsApp",
            grupo: "Sistema",
            icone: MessageCircle,
            sub: "Conexão com a Evolution, alertas e relatório da recreação",
            render: () => (
              <div className="space-y-4">
                <WhatsAppManager />
                <RatingAlertsManager />
                <RecreationReportManager />
              </div>
            ),
          },
          {
            id: "dados",
            rotulo: "Dados e backup",
            grupo: "Sistema",
            icone: Database,
            render: () => (
              <div className="space-y-4">
                <Card className="flex flex-wrap items-center gap-3 p-4">
                  <span className="mr-auto text-sm text-muted-foreground">Importar ou exportar o banco de dados do app.</span>
                  <DatabaseImport />
                  <DatabaseExport />
                </Card>
                <MigrationManager />
              </div>
            ),
          },
        ] as PaginaAdmin[])
      : []),
  ];

  return (
    <>
      <AdminShell
        paginas={paginas}
        atalhosCelular={isGestor ? ["painel", "hospedes", "atividades", "notificacoes"] : ["painel", "hospedes", "atividades", "catalogo"]}
        usuario={{ email: userEmail, papel: role }}
        onExportarPdf={() => setExportDialogOpen(true)}
        onSair={handleSignOut}
      />
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
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
                      className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
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
                  {showPdfSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <PdfSettingsManager settings={pdfSettings} onSettingsChange={handlePdfSettingsChange} />
              </CollapsibleContent>
            </Collapsible>

            <Button onClick={handleExport} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Admin;
