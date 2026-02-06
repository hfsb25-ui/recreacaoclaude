import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, FileText, Check, X, AlertTriangle, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AgeGroup {
  id: string;
  name: string;
  color: string;
}

interface ParsedActivity {
  startTime: string;
  endTime: string;
  name: string;
  valid: boolean;
  error?: string;
}

interface BulkImportActivitiesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ageGroups: AgeGroup[];
  targetDate: string;
  onImportComplete: () => void;
}

const parseActivitiesText = (text: string): ParsedActivity[] => {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return lines.map((line) => {
    // Match patterns like:
    // 09:30 - 09:45 Activity Name
    // 09:30-09:45 Activity Name
    // 09:30 -09:45 Activity Name
    // 09:30- 09:45 Activity Name
    const match = line.match(
      /^(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})\s+(.+)$/
    );

    if (!match) {
      return {
        startTime: "",
        endTime: "",
        name: line,
        valid: false,
        error: "Formato inválido. Use: HH:MM - HH:MM Nome da atividade",
      };
    }

    const [, startRaw, endRaw, name] = match;

    // Normalize time to HH:MM format
    const normalizeTime = (t: string) => {
      const [h, m] = t.split(":");
      return `${h.padStart(2, "0")}:${m}`;
    };

    const startTime = normalizeTime(startRaw);
    const endTime = normalizeTime(endRaw);

    // Validate time ranges
    const startMinutes =
      parseInt(startTime.split(":")[0]) * 60 +
      parseInt(startTime.split(":")[1]);
    const endMinutes =
      parseInt(endTime.split(":")[0]) * 60 + parseInt(endTime.split(":")[1]);

    if (startMinutes >= endMinutes) {
      return {
        startTime,
        endTime,
        name: name.trim(),
        valid: false,
        error: "Horário de início deve ser anterior ao de término",
      };
    }

    return {
      startTime,
      endTime,
      name: name.trim(),
      valid: true,
    };
  });
};

const BulkImportActivities = ({
  open,
  onOpenChange,
  ageGroups,
  targetDate,
  onImportComplete,
}: BulkImportActivitiesProps) => {
  const [rawText, setRawText] = useState("");
  const [parsedActivities, setParsedActivities] = useState<ParsedActivity[]>(
    []
  );
  const [selectedAgeGroup, setSelectedAgeGroup] = useState("");
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<"input" | "preview">("input");

  const handleParse = () => {
    if (!rawText.trim()) {
      toast.error("Cole o texto com as atividades");
      return;
    }
    if (!selectedAgeGroup) {
      toast.error("Selecione a faixa etária");
      return;
    }

    const parsed = parseActivitiesText(rawText);
    setParsedActivities(parsed);
    setStep("preview");
  };

  const handleRemoveActivity = (index: number) => {
    setParsedActivities((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImport = async () => {
    const validActivities = parsedActivities.filter((a) => a.valid);

    if (validActivities.length === 0) {
      toast.error("Nenhuma atividade válida para importar");
      return;
    }

    setImporting(true);
    try {
      const activitiesToInsert = validActivities.map((activity) => ({
        name: activity.name,
        description: "",
        activity_date: targetDate,
        start_time: activity.startTime,
        end_time: activity.endTime,
        age_group_id: selectedAgeGroup,
        is_master: false,
      }));

      const { error } = await supabase
        .from("activities")
        .insert(activitiesToInsert);

      if (error) throw error;

      toast.success(
        `${validActivities.length} atividade(s) importada(s) com sucesso!`
      );
      handleClose();
      onImportComplete();
    } catch (error: any) {
      toast.error(error.message || "Erro ao importar atividades");
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setRawText("");
    setParsedActivities([]);
    setSelectedAgeGroup("");
    setStep("input");
    onOpenChange(false);
  };

  const validCount = parsedActivities.filter((a) => a.valid).length;
  const invalidCount = parsedActivities.filter((a) => !a.valid).length;

  const selectedGroup = ageGroups.find((g) => g.id === selectedAgeGroup);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Importar Atividades em Lote
          </DialogTitle>
        </DialogHeader>

        {step === "input" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Faixa Etária</Label>
              <Select
                value={selectedAgeGroup}
                onValueChange={setSelectedAgeGroup}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a faixa etária" />
                </SelectTrigger>
                <SelectContent>
                  {ageGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: group.color }}
                        />
                        {group.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cole as atividades abaixo</Label>
              <Textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`Exemplo:\n09:30 - 09:45 Chamada dos tios\n09:45 - 09:58 Aquecendo o corpinho\n10:00 - 10:25 Casa da Roça\n10:30 - 10:55 Alimentando os animais`}
                rows={12}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Formato: <code>HH:MM - HH:MM Nome da atividade</code> (uma por
                linha)
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleParse} className="flex-1">
                <Upload className="mr-2 h-4 w-4" />
                Processar Atividades
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              {selectedGroup && (
                <Badge
                  variant="secondary"
                  className="text-white"
                  style={{ backgroundColor: selectedGroup.color }}
                >
                  {selectedGroup.name}
                </Badge>
              )}
              <Badge variant="outline" className="gap-1">
                <Check className="h-3 w-3 text-green-500" />
                {validCount} válida(s)
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="outline" className="gap-1 border-destructive">
                  <X className="h-3 w-3 text-destructive" />
                  {invalidCount} com erro(s)
                </Badge>
              )}
            </div>

            {invalidCount > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <p className="text-sm">
                  Atividades com erro serão ignoradas na importação.
                </p>
              </div>
            )}

            <div className="max-h-[400px] overflow-y-auto space-y-2 border rounded-md p-3 bg-muted/10">
              {parsedActivities.map((activity, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-2 rounded-md border ${
                    activity.valid
                      ? "bg-background"
                      : "bg-destructive/5 border-destructive/30"
                  }`}
                >
                  {activity.valid ? (
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-destructive shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {activity.name}
                    </p>
                    {activity.valid ? (
                      <p className="text-xs text-muted-foreground">
                        {activity.startTime} - {activity.endTime}
                      </p>
                    ) : (
                      <p className="text-xs text-destructive">
                        {activity.error}
                      </p>
                    )}
                  </div>
                  {activity.valid && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleRemoveActivity(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleImport}
                disabled={importing || validCount === 0}
                className="flex-1"
              >
                <Upload className="mr-2 h-4 w-4" />
                {importing
                  ? "Importando..."
                  : `Importar ${validCount} Atividade(s)`}
              </Button>
              <Button variant="outline" onClick={() => setStep("input")}>
                Voltar
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BulkImportActivities;
