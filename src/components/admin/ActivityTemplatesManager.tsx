import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus, FileDown, FileUp } from "lucide-react";
import jsPDF from "jspdf";

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

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    let items: { name: string; description?: string }[] = [];

    try {
      if (file.name.endsWith(".json")) {
        const parsed = JSON.parse(text);
        items = Array.isArray(parsed) ? parsed : [parsed];
      } else if (file.name.endsWith(".csv")) {
        const lines = text.split("\n").filter((l) => l.trim());
        const startIndex = lines[0]?.toLowerCase().includes("name") ? 1 : 0;
        for (let i = startIndex; i < lines.length; i++) {
          const parts = lines[i].split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
          if (parts[0]) {
            items.push({ name: parts[0], description: parts[1] || undefined });
          }
        }
      } else {
        toast({ title: "Formato não suportado. Use .json ou .csv", variant: "destructive" });
        return;
      }
    } catch {
      toast({ title: "Erro ao ler o arquivo", variant: "destructive" });
      return;
    }

    if (items.length === 0) {
      toast({ title: "Nenhum template encontrado no arquivo", variant: "destructive" });
      return;
    }

    const validItems = items
      .filter((item) => item.name?.trim())
      .map((item) => ({
        name: item.name.trim(),
        description: item.description?.trim() || null,
      }));

    if (validItems.length === 0) {
      toast({ title: "Nenhum template válido no arquivo", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("activity_templates").insert(validItems);

    if (error) {
      toast({ title: "Erro ao importar templates", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: `${validItems.length} template${validItems.length > 1 ? "s" : ""} importado${validItems.length > 1 ? "s" : ""} com sucesso!` });
    fetchTemplates();
    e.target.value = "";
  };

  const handleExportPdf = () => {
    if (templates.length === 0) {
      toast({ title: "Nenhum template para exportar", variant: "destructive" });
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let y = 20;

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Catálogo de Atividades", pageWidth / 2, y, { align: "center" });
    y += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text(`${templates.length} atividade${templates.length > 1 ? "s" : ""} cadastrada${templates.length > 1 ? "s" : ""}`, pageWidth / 2, y, { align: "center" });
    doc.setTextColor(0, 0, 0);
    y += 12;

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    templates.forEach((template, index) => {
      const estimatedHeight = template.description ? 22 : 14;
      if (y + estimatedHeight > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`${index + 1}. ${template.name}`, margin, y);
      y += 6;

      if (template.description) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        const lines = doc.splitTextToSize(template.description, contentWidth - 10);
        doc.text(lines, margin + 5, y);
        y += lines.length * 4 + 2;
        doc.setTextColor(0, 0, 0);
      }

      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.2);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;
    });

    const now = new Date();
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Gerado em ${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );

    doc.save("catalogo-atividades.pdf");
    toast({ title: "PDF exportado com sucesso!" });
  };

  const handleExportJson = () => {
    if (templates.length === 0) {
      toast({ title: "Nenhum template para exportar", variant: "destructive" });
      return;
    }

    const data = templates.map((t) => ({ name: t.name, description: t.description }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "catalogo-atividades.json";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "JSON exportado com sucesso!" });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Catálogo de Atividades</h2>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" asChild>
            <label className="cursor-pointer">
              <FileUp className="mr-2 h-4 w-4" />
              Importar
              <input
                type="file"
                accept=".json,.csv"
                className="hidden"
                onChange={handleImport}
              />
            </label>
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportJson} disabled={templates.length === 0}>
            <FileDown className="mr-2 h-4 w-4" />
            Exportar JSON
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={templates.length === 0}>
            <FileDown className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => setIsOpen(true)}>
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
