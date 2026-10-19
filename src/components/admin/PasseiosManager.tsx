import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowDown, ArrowUp, ExternalLink, ImagePlus, MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  BUCKET_FOTOS,
  CATEGORIAS,
  PASTA_FOTOS,
  carregarPasseios,
  categoriaDe,
  prepararFoto,
  urlFoto,
  type Categoria,
  type Passeio,
} from "@/data/regiao";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type Form = Omit<Passeio, "id" | "ordem">;

const VAZIO: Form = {
  nome: "",
  cidade: "",
  categoria: "natureza",
  resumo: "",
  descricao: "",
  distancia: "",
  duracao: "",
  funcionamento: "",
  preco: "",
  dicas: "",
  mapa: "",
  criancas: false,
  chuva: false,
  agendar: false,
  imagem: null,
  ativo: true,
};

const Miniatura = ({ p }: { p: Pick<Passeio, "imagem" | "categoria"> }) => {
  const foto = urlFoto(p.imagem);
  const c = categoriaDe(p.categoria);
  return foto ? (
    <img src={foto} alt="" className="h-16 w-24 shrink-0 rounded-lg object-cover" />
  ) : (
    <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg text-2xl" style={{ background: c.fundo }}>
      {c.emoji}
    </div>
  );
};

const PasseiosManager = () => {
  const [lista, setLista] = useState<Passeio[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(VAZIO);
  const [foto, setFoto] = useState<File | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [apagarId, setApagarId] = useState<string | null>(null);
  const inputFoto = useRef<HTMLInputElement>(null);

  const carregar = async () => {
    setCarregando(true);
    try {
      setLista(await carregarPasseios(true));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      toast.error(/passeios/.test(msg) ? "Falta rodar o SQL dos passeios no Supabase." : "Erro ao carregar os passeios");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  useEffect(() => {
    if (!foto) return;
    const u = URL.createObjectURL(foto);
    setPrevia(u);
    return () => URL.revokeObjectURL(u);
  }, [foto]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const abrirNovo = () => {
    setEditandoId(null);
    setForm(VAZIO);
    setFoto(null);
    setPrevia(null);
    setAberto(true);
  };

  const abrirEdicao = (p: Passeio) => {
    setEditandoId(p.id);
    const { id: _id, ordem: _ordem, ...resto } = p;
    setForm({ ...VAZIO, ...resto });
    setFoto(null);
    setPrevia(urlFoto(p.imagem));
    setAberto(true);
  };

  const removerFoto = () => {
    setFoto(null);
    setPrevia(null);
    set("imagem", null);
  };

  const salvar = async () => {
    if (!form.nome.trim()) {
      toast.error("Dê um nome ao passeio");
      return;
    }
    setSalvando(true);
    try {
      let imagem = form.imagem;
      const antiga = editandoId ? lista.find((p) => p.id === editandoId)?.imagem ?? null : null;
      if (foto) {
        const blob = await prepararFoto(foto);
        const caminho = `${PASTA_FOTOS}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
        const { error } = await supabase.storage.from(BUCKET_FOTOS).upload(caminho, blob, { contentType: "image/webp" });
        if (error) throw error;
        imagem = caminho;
      }
      const dados = { ...form, imagem, nome: form.nome.trim(), updated_at: new Date().toISOString() };
      if (editandoId) {
        const { error } = await db.from("passeios").update(dados).eq("id", editandoId);
        if (error) throw error;
      } else {
        const ordem = lista.reduce((m, p) => Math.max(m, p.ordem), 0) + 1;
        const { error } = await db.from("passeios").insert({ ...dados, ordem });
        if (error) throw error;
      }
      // Foto trocada ou removida: apaga a antiga do armazenamento
      if (antiga && antiga !== imagem) await supabase.storage.from(BUCKET_FOTOS).remove([antiga]);
      toast.success(editandoId ? "Passeio atualizado!" : "Passeio cadastrado!");
      setAberto(false);
      carregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  };

  const alternarAtivo = async (p: Passeio, ativo: boolean) => {
    setLista((l) => l.map((x) => (x.id === p.id ? { ...x, ativo } : x)));
    const { error } = await db.from("passeios").update({ ativo }).eq("id", p.id);
    if (error) {
      toast.error("Erro ao salvar");
      carregar();
    }
  };

  const mover = async (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= lista.length) return;
    const nova = [...lista];
    [nova[i], nova[j]] = [nova[j], nova[i]];
    const comOrdem = nova.map((p, k) => ({ ...p, ordem: k + 1 }));
    setLista(comOrdem);
    await Promise.all(
      [comOrdem[i], comOrdem[j]].map((p) => db.from("passeios").update({ ordem: p.ordem }).eq("id", p.id)),
    );
  };

  const apagar = async () => {
    const p = lista.find((x) => x.id === apagarId);
    setApagarId(null);
    if (!p) return;
    const { error } = await db.from("passeios").delete().eq("id", p.id);
    if (error) {
      toast.error("Erro ao apagar");
      return;
    }
    if (p.imagem) await supabase.storage.from(BUCKET_FOTOS).remove([p.imagem]);
    toast.success("Passeio apagado");
    carregar();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Passeios na região</h2>
          <p className="text-sm text-muted-foreground">
            O que aparece em "Passeios na região" no app. Só os ligados aparecem para o hóspede.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="/regiao" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" /> Ver no app
            </a>
          </Button>
          <Button onClick={abrirNovo}>
            <Plus className="mr-2 h-4 w-4" /> Novo passeio
          </Button>
        </div>
      </div>

      <Card className="divide-y">
        {carregando ? (
          <p className="p-6 text-center text-muted-foreground">Carregando…</p>
        ) : lista.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-8 text-center text-muted-foreground">
            <MapPin className="h-8 w-8" />
            Nenhum passeio cadastrado. Clique em "Novo passeio".
          </div>
        ) : (
          lista.map((p, i) => (
            <div key={p.id} className={`flex items-center gap-3 p-3 ${p.ativo ? "" : "opacity-60"}`}>
              <Miniatura p={p} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{p.nome}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {categoriaDe(p.categoria).label}
                  {p.cidade ? ` · ${p.cidade}` : ""}
                  {p.distancia ? ` · ${p.distancia}` : ""}
                </p>
                {!p.imagem && <p className="text-xs text-amber-600">Sem foto</p>}
              </div>
              <div className="flex items-center gap-1">
                <label className="mr-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Switch checked={p.ativo} onCheckedChange={(v) => alternarAtivo(p, v)} aria-label="Mostrar no app" />
                  <span className="hidden sm:inline">{p.ativo ? "No app" : "Escondido"}</span>
                </label>
                <Button variant="ghost" size="icon" onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir">
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => mover(i, 1)} disabled={i === lista.length - 1} aria-label="Descer">
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => abrirEdicao(p)} aria-label="Editar">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setApagarId(p.id)} aria-label="Apagar">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))
        )}
      </Card>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editandoId ? "Editar passeio" : "Novo passeio"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Foto</Label>
              {previa ? (
                <div className="relative overflow-hidden rounded-xl border">
                  <img src={previa} alt="Prévia da foto" className="h-48 w-full object-cover" />
                  <div className="absolute right-2 top-2 flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => inputFoto.current?.click()}>
                      Trocar
                    </Button>
                    <Button size="sm" variant="secondary" onClick={removerFoto} aria-label="Remover foto">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => inputFoto.current?.click()}
                  className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-muted-foreground hover:bg-muted/50"
                >
                  <ImagePlus className="h-8 w-8" />
                  <span className="text-sm font-medium">Escolher foto</span>
                  <span className="text-xs">Foto deitada fica melhor. O app diminui o tamanho sozinho.</span>
                </button>
              )}
              <input
                ref={inputFoto}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setFoto(f);
                  e.target.value = "";
                }}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="p-nome">Nome *</Label>
                <Input id="p-nome" value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Ex.: Cachoeira do Sertão" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-cidade">Cidade</Label>
                <Input id="p-cidade" value={form.cidade} onChange={(e) => set("cidade", e.target.value)} placeholder="Ex.: Vassouras" />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.categoria} onValueChange={(v) => set("categoria", v as Categoria)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CATEGORIAS) as Categoria[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {CATEGORIAS[k].emoji} {CATEGORIAS[k].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="p-resumo">Resumo (aparece na lista)</Label>
                <Input id="p-resumo" value={form.resumo} onChange={(e) => set("resumo", e.target.value)} placeholder="Uma frase curta" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="p-desc">Descrição completa</Label>
                <Textarea id="p-desc" rows={4} value={form.descricao} onChange={(e) => set("descricao", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-dist">Distância do hotel</Label>
                <Input id="p-dist" value={form.distancia} onChange={(e) => set("distancia", e.target.value)} placeholder="Ex.: 20 min de carro" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-dur">Tempo sugerido</Label>
                <Input id="p-dur" value={form.duracao} onChange={(e) => set("duracao", e.target.value)} placeholder="Ex.: 2 horas" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-func">Funcionamento</Label>
                <Input id="p-func" value={form.funcionamento} onChange={(e) => set("funcionamento", e.target.value)} placeholder="Ex.: Todos os dias, 9h às 17h" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-preco">Entrada / preço</Label>
                <Input id="p-preco" value={form.preco} onChange={(e) => set("preco", e.target.value)} placeholder="Ex.: Gratuito" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="p-dicas">Dicas (uma por linha)</Label>
                <Textarea id="p-dicas" rows={3} value={form.dicas} onChange={(e) => set("dicas", e.target.value)} placeholder={"Leve repelente\nVá de manhã"} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="p-mapa">Como chegar (link do Google Maps ou endereço)</Label>
                <Input id="p-mapa" value={form.mapa} onChange={(e) => set("mapa", e.target.value)} placeholder="Cole o link do Maps ou escreva o endereço" />
              </div>
            </div>

            <div className="grid gap-3 rounded-xl bg-muted/50 p-4 sm:grid-cols-2">
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={form.criancas} onCheckedChange={(v) => set("criancas", v)} /> Bom para crianças
              </label>
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={form.chuva} onCheckedChange={(v) => set("chuva", v)} /> Coberto (dia de chuva)
              </label>
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={form.agendar} onCheckedChange={(v) => set("agendar", v)} /> Botão "Agendar com a recepção"
              </label>
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={form.ativo} onCheckedChange={(v) => set("ativo", v)} /> Mostrar no app
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!apagarId} onOpenChange={() => setApagarId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar passeio?</AlertDialogTitle>
            <AlertDialogDescription>
              Ele sai do app e a foto é apagada. Se for só por um tempo, desligue a chave "No app".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={apagar} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PasseiosManager;
