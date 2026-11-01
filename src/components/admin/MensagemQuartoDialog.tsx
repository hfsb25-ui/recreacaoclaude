import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send } from "lucide-react";
import { toast } from "sonner";

export interface QuartoAlvo {
  uh: string;
  guest_name: string;
  reservation_code: string;
}

/** Lê a mensagem de erro que a função devolveu. */
export const erroDaFuncao = async (error: unknown, data: { error?: string } | null) => {
  if (data?.error) return data.error;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const j = await (error as any)?.context?.json?.();
    if (j?.error) return j.error as string;
  } catch {
    // ignora
  }
  return (error as Error)?.message || "Não foi possível concluir.";
};

const primeiroNome = (nome: string) => {
  const n = nome.trim().split(/\s+/)[0] ?? "";
  return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
};

/** Janela para mandar WhatsApp a um apartamento pelo número do app. */
export const MensagemQuartoDialog = ({ alvo, onClose }: { alvo: QuartoAlvo | null; onClose: () => void }) => {
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  const abrir = (aberto: boolean) => {
    if (!aberto) {
      setTexto("");
      onClose();
    }
  };

  const enviar = async () => {
    if (!alvo || !texto.trim()) return;
    setEnviando(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-atendimento", {
        body: { acao: "enviar", uh: alvo.uh, reservation_code: alvo.reservation_code, texto },
      });
      if (error || data?.error) throw new Error(await erroDaFuncao(error, data));
      toast.success(`Mensagem enviada para o apto ${alvo.uh}.`);
      setTexto("");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={!!alvo} onOpenChange={abrir}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Mensagem para o apto {alvo?.uh}</DialogTitle>
          <DialogDescription>
            Vai pelo WhatsApp do app para o titular ({alvo?.guest_name}). Se ele responder, a resposta chega nos números
            de atendimento.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          rows={5}
          maxLength={1500}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={alvo ? `Olá, ${primeiroNome(alvo.guest_name)}! ...` : ""}
          autoFocus
        />
        <p className="-mt-2 text-right text-xs text-muted-foreground">{texto.length}/1500</p>
        <DialogFooter>
          <Button variant="ghost" onClick={() => abrir(false)}>
            Cancelar
          </Button>
          <Button onClick={enviar} disabled={!texto.trim() || enviando}>
            <Send className="mr-2 h-4 w-4" />
            {enviando ? "Enviando…" : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
