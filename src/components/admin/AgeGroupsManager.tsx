import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2, Edit } from "lucide-react";
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
}

const AgeGroupsManager = () => {
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AgeGroup | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#00BCD4");

  useEffect(() => {
    fetchAgeGroups();
  }, []);

  const fetchAgeGroups = async () => {
    const { data } = await supabase
      .from("age_groups")
      .select("*")
      .order("sort_order", { ascending: true });

    if (data) setAgeGroups(data);
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
        toast.success("Faixa etária atualizada!");
      } else {
        const { error } = await supabase
          .from("age_groups")
          .insert([{ name, color, sort_order: ageGroups.length }]);

        if (error) throw error;
        toast.success("Faixa etária criada!");
      }

      fetchAgeGroups();
      handleClose();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar");
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
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setEditingGroup(null);
    setName("");
    setColor("#00BCD4");
  };

  return (
    <div className="space-y-4">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="bg-[var(--gradient-tropical)] hover:opacity-90 transition-[var(--transition-smooth)]">
            <Plus className="mr-2 h-4 w-4" />
            Nova Faixa Etária
          </Button>
        </DialogTrigger>
        <DialogContent>
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
        {ageGroups.map((group) => (
          <Card
            key={group.id}
            className="p-4 hover:shadow-[var(--shadow-hover)] transition-[var(--transition-smooth)]"
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className="px-4 py-2 rounded-lg"
                style={{ backgroundColor: group.color }}
              >
                <h3 className="font-semibold text-white">{group.name}</h3>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleEdit(group)}
                className="flex-1"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDelete(group.id)}
                className="hover:bg-destructive/10 hover:text-destructive"
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
