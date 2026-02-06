import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, HelpCircle } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface QuizQuestion {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  is_active: boolean;
  created_at: string;
}

const EMPTY_FORM = {
  question: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  correct_option: "a",
};

export const QuizQuestionsManager = () => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    const { data, error } = await supabase
      .from("quiz_questions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar perguntas");
      return;
    }
    setQuestions(data || []);
    setLoading(false);
  };

  const openNewDialog = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEditDialog = (q: QuizQuestion) => {
    setEditingId(q.id);
    setForm({
      question: q.question,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_option: q.correct_option,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.question.trim() || !form.option_a.trim() || !form.option_b.trim() || !form.option_c.trim() || !form.option_d.trim()) {
      toast.error("Preencha todos os campos!");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from("quiz_questions")
          .update(form)
          .eq("id", editingId);
        if (error) throw error;
        toast.success("Pergunta atualizada!");
      } else {
        const { error } = await supabase
          .from("quiz_questions")
          .insert(form);
        if (error) throw error;
        toast.success("Pergunta cadastrada!");
      }
      setDialogOpen(false);
      fetchQuestions();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar pergunta");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("quiz_questions")
      .update({ is_active: !current })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao alterar status");
      return;
    }
    fetchQuestions();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("quiz_questions")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir pergunta");
      return;
    }
    toast.success("Pergunta excluída!");
    fetchQuestions();
  };

  const correctLabel = (option: string) => {
    const map: Record<string, string> = { a: "A", b: "B", c: "C", d: "D" };
    return map[option] || option;
  };

  const getCorrectText = (q: QuizQuestion) => {
    const map: Record<string, string> = {
      a: q.option_a,
      b: q.option_b,
      c: q.option_c,
      d: q.option_d,
    };
    return map[q.correct_option] || "";
  };

  if (loading) {
    return <p className="text-muted-foreground">Carregando perguntas...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Perguntas do Quiz</h3>
          <span className="text-sm text-muted-foreground">
            ({questions.filter((q) => q.is_active).length} ativas)
          </span>
        </div>
        <Button size="sm" onClick={openNewDialog}>
          <Plus className="h-4 w-4 mr-1" />
          Nova Pergunta
        </Button>
      </div>

      {questions.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground mb-2">Nenhuma pergunta cadastrada</p>
          <p className="text-sm text-muted-foreground">
            Cadastre perguntas sobre o hotel para os hóspedes jogarem o Quiz!
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <Card key={q.id} className={`p-4 ${!q.is_active ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium mb-1">{q.question}</p>
                  <div className="grid grid-cols-2 gap-1 text-sm text-muted-foreground">
                    <span className={q.correct_option === "a" ? "text-green-600 font-medium" : ""}>
                      A: {q.option_a}
                    </span>
                    <span className={q.correct_option === "b" ? "text-green-600 font-medium" : ""}>
                      B: {q.option_b}
                    </span>
                    <span className={q.correct_option === "c" ? "text-green-600 font-medium" : ""}>
                      C: {q.option_c}
                    </span>
                    <span className={q.correct_option === "d" ? "text-green-600 font-medium" : ""}>
                      D: {q.option_d}
                    </span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    ✅ Resposta: {correctLabel(q.correct_option)} - {getCorrectText(q)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={q.is_active}
                    onCheckedChange={() => handleToggleActive(q.id, q.is_active)}
                  />
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(q)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir pergunta?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(q.id)}>
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Pergunta" : "Nova Pergunta"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Pergunta</Label>
              <Input
                placeholder="Ex: Qual o horário da piscina?"
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Opção A</Label>
                <Input
                  placeholder="Resposta A"
                  value={form.option_a}
                  onChange={(e) => setForm({ ...form, option_a: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Opção B</Label>
                <Input
                  placeholder="Resposta B"
                  value={form.option_b}
                  onChange={(e) => setForm({ ...form, option_b: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Opção C</Label>
                <Input
                  placeholder="Resposta C"
                  value={form.option_c}
                  onChange={(e) => setForm({ ...form, option_c: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Opção D</Label>
                <Input
                  placeholder="Resposta D"
                  value={form.option_d}
                  onChange={(e) => setForm({ ...form, option_d: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Resposta Correta</Label>
              <Select
                value={form.correct_option}
                onValueChange={(v) => setForm({ ...form, correct_option: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a">A - {form.option_a || "Opção A"}</SelectItem>
                  <SelectItem value="b">B - {form.option_b || "Opção B"}</SelectItem>
                  <SelectItem value="c">C - {form.option_c || "Opção C"}</SelectItem>
                  <SelectItem value="d">D - {form.option_d || "Opção D"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Salvando..." : editingId ? "Salvar Alterações" : "Cadastrar Pergunta"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
