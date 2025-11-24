import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus } from "lucide-react";

interface ActivityTemplate {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export const ActivityTemplatesManager = () => {
  const [templates, setTemplates] = useState<ActivityTemplate[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ActivityTemplate | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from("activity_templates")
      .select("*")
      .order("name");

    if (error) {
      toast({
        title: "Erro ao carregar templates",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setTemplates(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: "Nome é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (editingTemplate) {
      const { error } = await supabase
        .from("activity_templates")
        .update({
          name: name.trim(),
          description: description.trim() || null,
        })
        .eq("id", editingTemplate.id);

      if (error) {
        toast({
          title: "Erro ao atualizar template",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Template atualizado com sucesso",
      });
    } else {
      const { error } = await supabase.from("activity_templates").insert({
        name: name.trim(),
        description: description.trim() || null,
      });

      if (error) {
        toast({
          title: "Erro ao criar template",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Template criado com sucesso",
      });
    }

    handleClose();
    fetchTemplates();
  };

  const handleEdit = (template: ActivityTemplate) => {
    setEditingTemplate(template);
    setName(template.name);
    setDescription(template.description || "");
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este template?")) return;

    const { error } = await supabase
      .from("activity_templates")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro ao excluir template",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Template excluído com sucesso",
    });
    fetchTemplates();
  };

  const handleClose = () => {
    setIsOpen(false);
    setEditingTemplate(null);
    setName("");
    setDescription("");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Catálogo de Atividades</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Editar Template" : "Novo Template"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Atividade</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Futebol na praia"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição padrão da atividade"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingTemplate ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {templates.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                Nenhum template cadastrado. Clique em "Novo Template" para começar.
              </p>
            </CardContent>
          </Card>
        ) : (
          templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{template.name}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(template)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDelete(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              {template.description && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {template.description}
                  </p>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
