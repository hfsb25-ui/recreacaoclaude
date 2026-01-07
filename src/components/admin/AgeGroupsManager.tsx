import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Edit, ChevronUp, ChevronDown, Eye, EyeOff, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AgeGroup {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  is_active: boolean;
}

interface AgeGroupRecreador {
  user_id: string;
  recreador_name: string;
}

const AgeGroupsManager = () => {
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AgeGroup | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#00BCD4");
  const [recreadorNames, setRecreadorNames] = useState("");
  const [ageGroupRecreadores, setAgeGroupRecreadores] = useState<Record<string, AgeGroupRecreador[]>>({});

  useEffect(() => {
    fetchAgeGroups();
  }, []);

  const fetchAgeGroups = async () => {
    const { data } = await supabase
      .from("age_groups")
      .select("*")
      .order("sort_order", { ascending: true });

    if (data) {
      setAgeGroups(data);
      fetchAgeGroupRecreadores(data.map(g => g.id));
    }
  };

  const fetchAgeGroupRecreadores = async (ageGroupIds: string[]) => {
    if (ageGroupIds.length === 0) return;
    
    const { data } = await supabase
      .from("age_group_recreadores")
      .select("age_group_id, user_id, recreador_name")
      .in("age_group_id", ageGroupIds);

    if (data) {
      const grouped = data.reduce((acc, item) => {
        if (!acc[item.age_group_id]) {
          acc[item.age_group_id] = [];
        }
        acc[item.age_group_id].push({
          user_id: item.user_id,
          recreador_name: item.recreador_name,
        });
        return acc;
      }, {} as Record<string, AgeGroupRecreador[]>);
      setAgeGroupRecreadores(grouped);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingGroup) {
        const { error } = await supabase
          .from("age_groups")
          .update({ name, color })
          .eq("id", editingGroup.id);

        if (error) throw error;

        // Update recreadores
        await updateAgeGroupRecreadores(editingGroup.id);
        
        toast.success("Faixa etária atualizada!");
      } else {
        const { data, error } = await supabase
          .from("age_groups")
          .insert([{ name, color, sort_order: ageGroups.length }])
          .select()
          .single();

        if (error) throw error;

        // Add recreadores to new group
        if (data) {
          await updateAgeGroupRecreadores(data.id);
        }
        
        toast.success("Faixa etária criada!");
      }

      fetchAgeGroups();
      handleClose();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar");
    }
  };

  const updateAgeGroupRecreadores = async (ageGroupId: string) => {
    // Delete existing recreadores for this age group
    await supabase
      .from("age_group_recreadores")
      .delete()
      .eq("age_group_id", ageGroupId);

    // Parse recreador names from comma-separated string
    const namesList = recreadorNames
      .split(",")
      .map(n => n.trim())
      .filter(n => n.length > 0);

    if (namesList.length > 0) {
      const inserts = namesList.map(recreadorName => ({
        age_group_id: ageGroupId,
        user_id: "manual-entry",
        recreador_name: recreadorName,
      }));

      const { error } = await supabase
        .from("age_group_recreadores")
        .insert(inserts);

      if (error) {
        console.error("Error inserting recreadores:", error);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta faixa etária?")) return;

    try {
      const { error } = await supabase.from("age_groups").delete().eq("id", id);

      if (error) throw error;
      toast.success("Faixa etária excluída!");
      fetchAgeGroups();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir");
    }
  };

  const handleEdit = (group: AgeGroup) => {
    setEditingGroup(group);
    setName(group.name);
    setColor(group.color);
    // Load existing recreadores for this group as comma-separated names
    const existing = ageGroupRecreadores[group.id] || [];
    setRecreadorNames(existing.map(r => r.recreador_name).join(", "));
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setEditingGroup(null);
    setName("");
    setColor("#00BCD4");
    setRecreadorNames("");
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    
    const currentGroup = ageGroups[index];
    const previousGroup = ageGroups[index - 1];
    
    try {
      await supabase
        .from("age_groups")
        .update({ sort_order: previousGroup.sort_order })
        .eq("id", currentGroup.id);
      
      await supabase
        .from("age_groups")
        .update({ sort_order: currentGroup.sort_order })
        .eq("id", previousGroup.id);
      
      fetchAgeGroups();
    } catch (error: any) {
      toast.error("Erro ao reordenar");
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === ageGroups.length - 1) return;
    
    const currentGroup = ageGroups[index];
    const nextGroup = ageGroups[index + 1];
    
    try {
      await supabase
        .from("age_groups")
        .update({ sort_order: nextGroup.sort_order })
        .eq("id", currentGroup.id);
      
      await supabase
        .from("age_groups")
        .update({ sort_order: currentGroup.sort_order })
        .eq("id", nextGroup.id);
      
      fetchAgeGroups();
    } catch (error: any) {
      toast.error("Erro ao reordenar");
    }
  };

  const handleToggleActive = async (group: AgeGroup) => {
    try {
      const { error } = await supabase
        .from("age_groups")
        .update({ is_active: !group.is_active })
        .eq("id", group.id);

      if (error) throw error;
      toast.success(group.is_active ? "Faixa etária desativada!" : "Faixa etária ativada!");
      fetchAgeGroups();
    } catch (error: any) {
      toast.error(error.message || "Erro ao alterar status");
    }
  };

  return (
    <div className="space-y-4">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 transition-[var(--transition-smooth)]">
            <Plus className="mr-2 h-4 w-4" />
            Nova Faixa Etária
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? "Editar" : "Nova"} Faixa Etária
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Infantil (4-7 anos)"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Cor</Label>
              <div className="flex gap-2">
                <Input
                  id="color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#00BCD4"
                />
              </div>
            </div>
            
            {/* Recreadores - Manual Input */}
            <div className="space-y-2">
              <Label htmlFor="recreadores" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Recreadores Responsáveis
              </Label>
              <Input
                id="recreadores"
                value={recreadorNames}
                onChange={(e) => setRecreadorNames(e.target.value)}
                placeholder="Ex: João, Maria, Pedro"
              />
              <p className="text-xs text-muted-foreground">
                Digite os nomes separados por vírgula
              </p>
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                {editingGroup ? "Atualizar" : "Criar"}
              </Button>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ageGroups.map((group, index) => (
          <Card
            key={group.id}
            className={`p-4 hover:shadow-[var(--shadow-hover)] transition-[var(--transition-smooth)] flex flex-col ${
              !group.is_active ? "opacity-60" : ""
            }`}
          >
            <div className="flex-1 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-muted-foreground font-medium">
                  Posição: {index + 1}
                </span>
                <div className="flex items-center gap-2 ml-auto">
                  <div className="flex items-center gap-1">
                    {group.is_active ? (
                      <Eye className="h-3 w-3 text-green-600" />
                    ) : (
                      <EyeOff className="h-3 w-3 text-muted-foreground" />
                    )}
                    <Switch
                      checked={group.is_active}
                      onCheckedChange={() => handleToggleActive(group)}
                      className="scale-75"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="h-7 w-7 p-0"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === ageGroups.length - 1}
                    className="h-7 w-7 p-0"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div
                className={`px-4 py-3 rounded-lg min-h-[64px] flex items-center justify-center text-center ${
                  !group.is_active ? "grayscale" : ""
                }`}
                style={{ backgroundColor: group.color }}
              >
                <h3 className="font-semibold text-white break-words w-full">{group.name}</h3>
              </div>
              
              {/* Show assigned recreadores */}
              {ageGroupRecreadores[group.id] && ageGroupRecreadores[group.id].length > 0 && (
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>
                    {ageGroupRecreadores[group.id].map(r => r.recreador_name).join(", ")}
                  </span>
                </div>
              )}
              
              {!group.is_active && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Não visível para hóspedes
                </p>
              )}
            </div>
            <div className="flex gap-2 mt-auto">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleEdit(group)}
                className="flex-1 hover:bg-primary/10 hover:text-primary transition-[var(--transition-smooth)]"
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDelete(group.id)}
                className="hover:bg-destructive/10 hover:text-destructive transition-[var(--transition-smooth)]"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AgeGroupsManager;
