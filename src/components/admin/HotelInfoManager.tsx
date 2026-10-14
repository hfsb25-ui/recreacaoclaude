import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from "lucide-react";
import {
  carregarHotelInfo,
  formatarWhatsapp,
  linkWhatsapp,
  linkContato,
  numeroWhatsapp,
  type Contato,
  type HotelInfo,
  type Horario,
  type Ramal,
} from "@/hooks/useHotelInfo";

const mover = <T,>(lista: T[], i: number, d: -1 | 1) => {
  const j = i + d;
  if (j < 0 || j >= lista.length) return lista;
  const nova = [...lista];
  [nova[i], nova[j]] = [nova[j], nova[i]];
  return nova;
};

/** Painel: horários, Wi-Fi, ramais e WhatsApp que aparecem na tela "O hotel" do app. */
const HotelInfoManager = () => {
  const [info, setInfo] = useState<HotelInfo | null>(null);
  const [telefone, setTelefone] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarHotelInfo().then((i) => {
      setInfo(i);
      setTelefone(formatarWhatsapp(i.whatsapp));
    });
  }, []);

  if (!info) {
    return <p className="text-muted-foreground">Carregando…</p>;
  }

  const setHorario = (i: number, campo: keyof Horario, valor: string | boolean) =>
    setInfo({ ...info, horarios: info.horarios.map((h, k) => (k === i ? { ...h, [campo]: valor } : h)) });
  const setRamal = (i: number, campo: keyof Ramal, valor: string | boolean) =>
    setInfo({ ...info, ramais: info.ramais.map((r, k) => (k === i ? { ...r, [campo]: valor } : r)) });

  const setContato = (i: number, campo: keyof Contato, valor: string | boolean) =>
    setInfo({ ...info, contatos: info.contatos.map((c, k) => (k === i ? { ...c, [campo]: valor } : c)) });

  const digitos = telefone.replace(/\D/g, "");
  const whatsapp = digitos ? (digitos.startsWith("55") && digitos.length > 11 ? digitos : `55${digitos}`) : "";

  const salvar = async () => {
    setSalvando(true);
    try {
      const dados = {
        id: 1,
        horarios: info.horarios.filter((h) => h.nome.trim()).map((h) => ({ ...h, nome: h.nome.trim(), horario: h.horario.trim() })),
        wifi_rede: info.wifi_rede.trim(),
        wifi_senha: info.wifi_senha.trim(),
        wifi_mostrar: info.wifi_mostrar,
        whatsapp,
        whatsapp_mensagem: info.whatsapp_mensagem.trim(),
        ramais: info.ramais.filter((r) => r.nome.trim()).map((r) => ({ ...r, nome: r.nome.trim(), ramal: r.ramal.trim() })),
        contatos: info.contatos
          .filter((c) => c.nome.trim() && numeroWhatsapp(c.whatsapp))
          .map((c) => ({ ...c, nome: c.nome.trim(), descricao: c.descricao.trim(), whatsapp: numeroWhatsapp(c.whatsapp) })),
        updated_at: new Date().toISOString(),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("hotel_info").upsert(dados);
      if (error) {
        if (/contatos/.test(error.message)) {
          throw new Error("Falta rodar o SQL dos contatos no Supabase.");
        }
        if (/hotel_info/.test(error.message) && /exist|schema cache/i.test(error.message)) {
          throw new Error("Falta rodar o SQL da tabela de informações do hotel no Supabase.");
        }
        throw error;
      }
      toast.success("Informações do hotel salvas! O app já mostra as novas.");
      const atual = await carregarHotelInfo();
      setInfo(atual);
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold">Informações do hotel</h2>
        <p className="text-muted-foreground text-sm">
          O que aparece na tela "O hotel", na tela inicial e no login do app. Salvou, o hóspede já vê.
        </p>
      </div>

      <Card className="p-5 space-y-3">
        <h3 className="text-lg font-semibold">Horários</h3>
        <p className="text-xs text-muted-foreground">Desligue a chave para guardar um horário sem mostrar no app.</p>
        {info.horarios.map((h, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <div className="flex flex-col">
              <button type="button" aria-label="Subir" onClick={() => setInfo({ ...info, horarios: mover(info.horarios, i, -1) })} className="text-muted-foreground hover:text-foreground">
                <ChevronUp className="h-4 w-4" />
              </button>
              <button type="button" aria-label="Descer" onClick={() => setInfo({ ...info, horarios: mover(info.horarios, i, 1) })} className="text-muted-foreground hover:text-foreground">
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            <Input className="flex-1 min-w-[140px]" aria-label="Nome" placeholder="Ex.: Café da manhã" value={h.nome} onChange={(e) => setHorario(i, "nome", e.target.value)} />
            <Input className="w-40" aria-label="Horário" placeholder="Ex.: 7h30 às 10h" value={h.horario} onChange={(e) => setHorario(i, "horario", e.target.value)} />
            <div className="flex items-center gap-1.5">
              <Switch checked={h.visivel !== false} onCheckedChange={(v) => setHorario(i, "visivel", v)} aria-label="Mostrar no app" />
              <span className="text-xs text-muted-foreground w-12">{h.visivel !== false ? "No app" : "Oculto"}</span>
            </div>
            <Button type="button" variant="ghost" size="icon" aria-label="Remover" onClick={() => setInfo({ ...info, horarios: info.horarios.filter((_, k) => k !== i) })}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => setInfo({ ...info, horarios: [...info.horarios, { nome: "", horario: "", visivel: true }] })}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar horário
        </Button>
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="text-lg font-semibold">Wi-Fi</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="wifi-rede">Nome da rede</Label>
            <Input id="wifi-rede" value={info.wifi_rede} onChange={(e) => setInfo({ ...info, wifi_rede: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wifi-senha">Senha</Label>
            <Input id="wifi-senha" value={info.wifi_senha} onChange={(e) => setInfo({ ...info, wifi_senha: e.target.value })} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={info.wifi_mostrar} onCheckedChange={(v) => setInfo({ ...info, wifi_mostrar: v })} />
          Mostrar o Wi-Fi no app
        </label>
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="text-lg font-semibold">Ramais</h3>
        <p className="text-xs text-muted-foreground">"Urgente" aparece em vermelho. O ramal chamado "Recepção" também aparece na tela de login.</p>
        {info.ramais.map((r, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <div className="flex flex-col">
              <button type="button" aria-label="Subir" onClick={() => setInfo({ ...info, ramais: mover(info.ramais, i, -1) })} className="text-muted-foreground hover:text-foreground">
                <ChevronUp className="h-4 w-4" />
              </button>
              <button type="button" aria-label="Descer" onClick={() => setInfo({ ...info, ramais: mover(info.ramais, i, 1) })} className="text-muted-foreground hover:text-foreground">
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            <Input className="flex-1 min-w-[140px]" aria-label="Nome" placeholder="Ex.: Recepção" value={r.nome} onChange={(e) => setRamal(i, "nome", e.target.value)} />
            <Input className="w-28" aria-label="Ramal" placeholder="Ex.: 9" value={r.ramal} onChange={(e) => setRamal(i, "ramal", e.target.value)} />
            <div className="flex items-center gap-1.5">
              <Switch checked={r.urgente} onCheckedChange={(v) => setRamal(i, "urgente", v)} aria-label="Urgente" />
              <span className={`text-xs w-14 ${r.urgente ? "text-red-600 font-semibold" : "text-muted-foreground"}`}>{r.urgente ? "Urgente" : "Normal"}</span>
            </div>
            <Button type="button" variant="ghost" size="icon" aria-label="Remover" onClick={() => setInfo({ ...info, ramais: info.ramais.filter((_, k) => k !== i) })}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => setInfo({ ...info, ramais: [...info.ramais, { nome: "", ramal: "", urgente: false }] })}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar ramal
        </Button>
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="text-lg font-semibold">WhatsApp do hotel</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="whats">Número com DDD</Label>
            <Input id="whats" inputMode="tel" placeholder="(24) 99968-0997" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="whats-msg">Mensagem que já vem escrita (opcional)</Label>
            <Input id="whats-msg" placeholder="Olá! Sou hóspede do apto {apto}." value={info.whatsapp_mensagem} onChange={(e) => setInfo({ ...info, whatsapp_mensagem: e.target.value })} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {"{apto}"} vira o apartamento de quem está logado.{" "}
          {whatsapp && (
            <a className="underline font-medium" href={linkWhatsapp({ ...info, whatsapp }, "101")} target="_blank" rel="noopener noreferrer">
              Testar o link
            </a>
          )}
        </p>
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="text-lg font-semibold">Outros contatos (WhatsApp)</h3>
        <p className="text-xs text-muted-foreground">
          Farmácia, táxi, passeios… Aparecem em "O hotel" e o hóspede toca para abrir a conversa no WhatsApp.
        </p>
        {info.contatos.map((c, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 border-b pb-3 last:border-b-0 last:pb-0">
            <div className="flex flex-col">
              <button type="button" aria-label="Subir" onClick={() => setInfo({ ...info, contatos: mover(info.contatos, i, -1) })} className="text-muted-foreground hover:text-foreground">
                <ChevronUp className="h-4 w-4" />
              </button>
              <button type="button" aria-label="Descer" onClick={() => setInfo({ ...info, contatos: mover(info.contatos, i, 1) })} className="text-muted-foreground hover:text-foreground">
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            <Input className="flex-1 min-w-[140px]" aria-label="Nome" placeholder="Ex.: Farmácia São José" value={c.nome} onChange={(e) => setContato(i, "nome", e.target.value)} />
            <Input className="w-44" aria-label="WhatsApp" inputMode="tel" placeholder="(24) 99999-0000" value={c.whatsapp.startsWith("55") ? formatarWhatsapp(c.whatsapp) : c.whatsapp} onChange={(e) => setContato(i, "whatsapp", e.target.value)} />
            <Input className="flex-1 min-w-[180px]" aria-label="Descrição" placeholder="Ex.: Entrega no hotel (opcional)" value={c.descricao} onChange={(e) => setContato(i, "descricao", e.target.value)} />
            <div className="flex items-center gap-1.5">
              <Switch checked={c.visivel !== false} onCheckedChange={(v) => setContato(i, "visivel", v)} aria-label="Mostrar no app" />
              <span className="text-xs text-muted-foreground w-12">{c.visivel !== false ? "No app" : "Oculto"}</span>
            </div>
            {numeroWhatsapp(c.whatsapp) && (
              <a className="text-xs underline font-medium" href={linkContato(c)} target="_blank" rel="noopener noreferrer">
                Testar
              </a>
            )}
            <Button type="button" variant="ghost" size="icon" aria-label="Remover" onClick={() => setInfo({ ...info, contatos: info.contatos.filter((_, k) => k !== i) })}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => setInfo({ ...info, contatos: [...info.contatos, { nome: "", descricao: "", whatsapp: "", visivel: true }] })}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar contato
        </Button>
      </Card>

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={salvar} disabled={salvando} size="lg" className="shadow-lg">
          {salvando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Salvar informações
        </Button>
      </div>
    </div>
  );
};

export default HotelInfoManager;
