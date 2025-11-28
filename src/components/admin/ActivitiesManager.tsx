import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Clock, Calendar as CalendarIcon, Download, Check, ChevronsUpDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface Activity {
  id: string;
  name: string;
  description: string;
  activity_date: string;
  start_time: string;
  end_time: string;
  age_group_id: string;
  age_groups?: { name: string; color: string };
}

interface AgeGroup {
  id: string;
  name: string;
  color: string;
}

interface ActivityTemplate {
  id: string;
  name: string;
  description: string | null;
}

const ActivitiesManager = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([]);
  const [activityTemplates, setActivityTemplates] = useState<ActivityTemplate[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [activityDate, setActivityDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [ageGroupId, setAgeGroupId] = useState("");
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
  const [filterAgeGroup, setFilterAgeGroup] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Helper function to format date without timezone issues
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    fetchAgeGroups();
    fetchActivityTemplates();
    fetchActivities();
  }, []);

  const fetchAgeGroups = async () => {
    const { data } = await supabase
      .from("age_groups")
      .select("*")
      .order("sort_order", { ascending: true });

    if (data) setAgeGroups(data);
  };

  const fetchActivityTemplates = async () => {
    const { data } = await supabase
      .from("activity_templates")
      .select("*")
      .order("name");

    if (data) setActivityTemplates(data);
  };

  const fetchActivities = async () => {
    const { data } = await supabase
      .from("activities")
      .select("*, age_groups(name, color)")
      .order("activity_date", { ascending: false })
      .order("start_time", { ascending: true });

    if (data) setActivities(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingActivity) {
        const { error } = await supabase
          .from("activities")
          .update({
            name,
            description,
            activity_date: activityDate,
            start_time: startTime,
            end_time: endTime,
            age_group_id: ageGroupId,
          })
          .eq("id", editingActivity.id);

        if (error) throw error;
        toast.success("Atividade atualizada!");
      } else {
        const { error } = await supabase.from("activities").insert([
          {
            name,
            description,
            activity_date: activityDate,
            start_time: startTime,
            end_time: endTime,
            age_group_id: ageGroupId,
          },
        ]);

        if (error) throw error;
        toast.success("Atividade criada!");
      }

      fetchActivities();
      handleClose();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta atividade?")) return;

    try {
      const { error } = await supabase.from("activities").delete().eq("id", id);

      if (error) throw error;
      toast.success("Atividade excluída!");
      fetchActivities();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir");
    }
  };

  const handleEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setSelectedTemplateId(""); // Clear template selection when editing
    setName(activity.name);
    setDescription(activity.description || "");
    // Extract just the date part (YYYY-MM-DD) to avoid timezone issues
    const dateOnly = activity.activity_date.split('T')[0];
    setActivityDate(dateOnly);
    setStartTime(activity.start_time);
    setEndTime(activity.end_time);
    setAgeGroupId(activity.age_group_id);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setEditingActivity(null);
    setSelectedTemplateId("");
    setName("");
    setDescription("");
    setActivityDate("");
    setStartTime("");
    setEndTime("");
    setAgeGroupId("");
  };

  const handleOpenNew = () => {
    setEditingActivity(null);
    setSelectedTemplateId("");
    setName("");
    setDescription("");
    
    // Pre-fill from filters
    if (filterDate) {
      setActivityDate(formatDateLocal(filterDate));
    } else {
      setActivityDate("");
    }
    
    if (filterAgeGroup) {
      setAgeGroupId(filterAgeGroup);
    } else {
      setAgeGroupId("");
    }
    
    setStartTime("");
    setEndTime("");
    setIsOpen(true);
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = activityTemplates.find(t => t.id === templateId);
    if (template) {
      setName(template.name);
      if (template.description) {
        setDescription(template.description);
      }
    }
  };

  const handleImportPreviousWeek = async () => {
    if (!filterDate) return;

    setImporting(true);
    try {
      const previousWeekDate = subDays(filterDate, 7);
      const previousWeekDateStr = formatDateLocal(previousWeekDate);

      // Buscar atividades da semana anterior
      const { data: previousActivities, error: fetchError } = await supabase
        .from("activities")
        .select("*")
        .eq("activity_date", previousWeekDateStr);

      if (fetchError) throw fetchError;

      if (!previousActivities || previousActivities.length === 0) {
        toast.error("Não há atividades cadastradas para este dia da semana anterior");
        return;
      }

      // Copiar atividades para a data selecionada
      const targetDateStr = formatDateLocal(filterDate);
      
      const newActivities = previousActivities.map(activity => ({
        name: activity.name,
        description: activity.description,
        activity_date: targetDateStr,
        start_time: activity.start_time,
        end_time: activity.end_time,
        age_group_id: activity.age_group_id,
      }));

      const { error: insertError } = await supabase
        .from("activities")
        .insert(newActivities);

      if (insertError) throw insertError;

      toast.success(`${newActivities.length} atividades importadas com sucesso!`);
      fetchActivities();
    } catch (error: any) {
      toast.error(error.message || "Erro ao importar atividades");
    } finally {
      setImporting(false);
    }
  };

  const filteredActivities = activities.filter(activity => {
    const matchesDate = filterDate 
      ? activity.activity_date.split('T')[0] === formatDateLocal(filterDate)
      : true;
    const matchesAgeGroup = filterAgeGroup 
      ? activity.age_group_id === filterAgeGroup
      : true;
    return matchesDate && matchesAgeGroup;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex-1">
          <Label className="mb-2 block">Filtrar por data</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full sm:w-[280px] justify-start text-left font-normal",
                  !filterDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filterDate ? format(filterDate, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecione uma data</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filterDate}
                onSelect={setFilterDate}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex-1">
          <Label className="mb-2 block">Filtrar por faixa etária</Label>
          <Select value={filterAgeGroup} onValueChange={setFilterAgeGroup}>
            <SelectTrigger className="w-full sm:w-[280px]">
              <SelectValue placeholder="Todas as faixas etárias" />
            </SelectTrigger>
            <SelectContent>
              {ageGroups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {filterDate && (
          <Button
            variant="outline"
            onClick={handleImportPreviousWeek}
            disabled={importing}
            className="hover:bg-primary/10 hover:text-primary transition-[var(--transition-smooth)] mt-8"
          >
            <Download className="mr-2 h-4 w-4" />
            {importing ? "Importando..." : "Importar Semana Anterior"}
          </Button>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <Button 
          onClick={handleOpenNew}
          className="bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-[var(--transition-smooth)]"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Atividade
        </Button>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingActivity ? "Editar" : "Nova"} Atividade
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="age-group">Faixa Etária</Label>
              <Select value={ageGroupId} onValueChange={setAgeGroupId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma faixa etária" />
                </SelectTrigger>
                <SelectContent>
                  {ageGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template">Nome da Atividade</Label>
              <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={searchOpen}
                    className="w-full justify-between"
                  >
                    {name || "Selecione ou digite uma atividade..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Digite o nome da atividade..." 
                      value={name}
                      onValueChange={setName}
                    />
                    <CommandList>
                      <CommandEmpty>Nenhuma atividade encontrada.</CommandEmpty>
                      <CommandGroup>
                        {activityTemplates
                          .filter(template => 
                            template.name.toLowerCase().includes(name.toLowerCase())
                          )
                          .map((template) => (
                            <CommandItem
                              key={template.id}
                              value={template.name}
                              onSelect={() => {
                                handleTemplateSelect(template.id);
                                setSearchOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  name === template.name ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {template.name}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição opcional da atividade"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !activityDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {activityDate ? format(new Date(activityDate + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR }) : <span>Selecione uma data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={activityDate ? new Date(activityDate + 'T12:00:00') : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setActivityDate(formatDateLocal(date));
                      }
                    }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time">Horário de Início</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">Horário de Término</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                {editingActivity ? "Atualizar" : "Criar"}
              </Button>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        {filteredActivities.length === 0 && (filterDate || filterAgeGroup) && (
          <Card className="p-6 text-center text-muted-foreground">
            Nenhuma atividade cadastrada para os filtros selecionados
          </Card>
        )}
        {filteredActivities.map((activity) => (
          <Card
            key={activity.id}
            className="p-6 hover:shadow-[var(--shadow-hover)] transition-[var(--transition-smooth)]"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="px-3 py-1 rounded-lg text-sm font-medium text-white"
                    style={{
                      backgroundColor: activity.age_groups?.color || "#00BCD4",
                    }}
                  >
                    {activity.age_groups?.name}
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-2">{activity.name}</h3>
                {activity.description && (
                  <p className="text-muted-foreground mb-3">
                    {activity.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    {format(new Date(activity.activity_date + 'T12:00:00'), "dd/MM/yyyy", {
                      locale: ptBR,
                    })}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {activity.start_time.slice(0, 5)} -{" "}
                    {activity.end_time.slice(0, 5)}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(activity)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(activity.id)}
                  className="hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ActivitiesManager;
