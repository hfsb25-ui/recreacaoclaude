import { useCallback, useEffect, useRef, useState } from "react";
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
import { ImagePlus, Megaphone, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { BUCKET_FOTOS, prepararFoto } from "@/data/regiao";
import {
  DESTINOS_POPUP,
  PASTA_POPUPS,
  dataBr,
  hojeYmd,
  situacao,
  ultimoDia,
  urlImagemPopup,
  type Popup,
} from "@/data/popups";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type Form = Omit<Popup, "id" | "created_at">;

const novo = (): Form => ({
  titulo: "",
  mensagem: "",
  imagem: null,
  botao_texto: "",
  botao_link: "",
  inicio: hojeYmd(),
  dias: 7,
  publico: "todos",
  ativo: true,
});

const SELO: Record<ReturnType<typeof situacao>, { label: string; cls: string }> = {
  no_ar: { label: "No ar", cls: "bg-green-100 text-green-800" },
  agendado: { label: "Agendado", cls: "bg-blue-100 text-blue-800" },
  encerrado: { label: "Encerrado", cls: "bg-muted text-muted-foreground" },
  pausado: { label: "Pausado", cls: "bg-amber-100 text-amber-800" },
};

const OUTRO = "__outro__";

const PopupsManager = () => {
  const [lista, setLista] = useState<Popup[]>([]);
  const [editando, setEditando] = useState<Popup | null>(null);
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState<Form>(novo());
  const [foto, setFoto] = useState<File | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [apagar, setApagar] = useState<Popup | null>(null);
  const arquivo = useRef<HTMLInputElement>(null);

  const carregar = useCallback(async () => {
    const { data, error } = await db.from("popups").select("*").order("inicio", { ascending: false });
    if (error) toast.error("Não foi possível carregar os popups.");
    setLista((data ?? []) as Popup[]);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const abrir = (p?: Popup) => {
    setEditando(p ?? null);
    setForm(
      p
        ? {
            titulo: p.titulo,
            mensagem: p.mensagem,
            imagem: p.imagem,
            botao_texto: p.botao_texto ?? "",
            botao_link: p.botao_link ?? "",
            inicio: p.inicio,
            dias: p.dias,
            publico: p.publico,
            ativo: p.ativo,
          }
        : novo(),
    );
    setFoto(null);
    setPrevia(p ? urlImagemPopup(p.imagem) : null);
    setAberto(true);
  };

  const escolherFoto = (f: File | undefined) => {
    if (!f) return;
    setFoto(f);
    setPrevia(URL.createObjectURL(f));
  };

  const tirarFoto = () => {
    setFoto(null);
    setPrevia(null);
    setForm((f) => ({ ...f, imagem: null }));
  };

  const salvar = async () => {
    if (!form.titulo.trim()) {
      toast.error("Escreva o título.");
      return;
    }
    if (form.botao_texto?.trim() && !form.botao_link?.trim()) {
      toast.error("Escolha o que o botão abre, ou apague o texto do botão.");
      return;
    }
    setSalvando(true);
    try {
      let imagem = form.imagem;
      if (foto) {
        const blob = await prepararFoto(foto);
        const caminho = `${PASTA_POPUPS}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
        const { error } = await supabase.storage.from(BUCKET_FOTOS).upload(caminho, blob, { contentType: "image/webp" });
        if (error) throw error;
        imagem = caminho;
      }
      const dados = {
        ...form,
        titulo: form.titulo.trim(),
        mensagem: form.mensagem.trim(),
        botao_texto: form.botao_texto?.trim() || null,
        botao_link: form.botao_texto?.trim() ? form.botao_link?.trim() || null : null,
        dias: Math.min(365, Math.max(1, Math.round(Number(form.dias) || 1))),
        imagem,
      };
      const { error } = editando
        ? await db.from("popups").update(dados).eq("id", editando.id)
        : await db.from("popups").insert(dados);
      if (error) throw error;
      const antiga = editando?.imagem;
      if (antiga && antiga !== imagem) await supabase.storage.from(BUCKET_FOTOS).remove([antiga]);
      toast.success(editando ? "Popup atualizado." : "Popup criado.");
      setAberto(false);
      carregar();
    } catch (e) {
      toast.error((e as Error).message || "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  };

  const alternar = async (p: Popup, ativo: boolean) => {
    const { error } = await db.from("popups").update({ ativo }).eq("id", p.id);
    if (error) toast.error("Não foi possível salvar.");
    carregar();
  };

  const confirmarApagar = async () => {
    if (!apagar) return;
    const { error } = await db.from("popups").delete().eq("id", apagar.id);
    if (error) toast.error("Não foi possível apagar.");
    else if (apagar.imagem) await supabase.storage.from(BUCKET_FOTOS).remove([apagar.imagem]);
    setApagar(null);
    carregar();
  };

  const destinoEhLista = DESTINOS_POPUP.some((d) => d.link === form.botao_link);
  const selectDestino = !form.botao_link ? "" : destinoEhLista ? form.botao_link : OUTRO;

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" /> Popups
            </h2>
            <p className="text-sm text-muted-foreground">
              Aparece uma vez em cada celular quando a pessoa abre o app, durante os dias que você escolher.
            </p>
          </div>
          <Button onClick={() => abrir()}>
            <Plus className="mr-2 h-4 w-4" /> Novo popup
          </Button>
        </div>

        {lista.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum popup cadastrado ainda.</p>
        ) : (
          <ul className="divide-y">
            {lista.map((p) => {
              const s = SELO[situacao(p)];
              const img = urlImagemPopup(p.imagem);
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
                  {img ? (
                    <img src={img} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Megaphone className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium">{p.titulo}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {dataBr(p.inicio)} até {dataBr(ultimoDia(p))} ({p.dias} {p.dias === 1 ? "dia" : "dias"}) ·{" "}
                      {p.publico === "hospedes" ? "só hóspedes logados" : "todos"}
                    </div>
                  </div>
                  <Switch checked={p.ativo} onCheckedChange={(v) => alternar(p, v)} aria-label="Ativo" />
                  <Button variant="ghost" size="icon" onClick={() => abrir(p)} aria-label="Editar">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setApagar(p)} aria-label="Apagar">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar popup" : "Novo popup"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 md:grid-cols-[1fr_300px]">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pp-titulo">Título</Label>
                <Input
                  id="pp-titulo"
                  maxLength={70}
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ex.: 🍕 Noite da pizza com 20% off"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pp-msg">Mensagem</Label>
                <Textarea
                  id="pp-msg"
                  rows={4}
                  maxLength={400}
                  value={form.mensagem}
                  onChange={(e) => setForm({ ...form, mensagem: e.target.value })}
                  placeholder="Ex.: Toda sexta, das 19h às 22h, no restaurante. Mostre esta tela no caixa."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Imagem (opcional)</Label>
                <input
                  ref={arquivo}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => escolherFoto(e.target.files?.[0])}
                />
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => arquivo.current?.click()}>
                    <ImagePlus className="mr-2 h-4 w-4" /> {previa ? "Trocar imagem" : "Escolher imagem"}
                  </Button>
                  {previa && (
                    <Button type="button" variant="ghost" onClick={tirarFoto}>
                      <X className="mr-1 h-4 w-4" /> Tirar
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="pp-inicio">Começa em</Label>
                  <Input
                    id="pp-inicio"
                    type="date"
                    value={form.inicio}
                    onChange={(e) => setForm({ ...form, inicio: e.target.value || hojeYmd() })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pp-dias">Aparece por quantos dias</Label>
                  <Input
                    id="pp-dias"
                    type="number"
                    min={1}
                    max={365}
                    value={form.dias}
                    onChange={(e) => setForm({ ...form, dias: Number(e.target.value) })}
                  />
                </div>
              </div>
              <p className="-mt-2 text-xs text-muted-foreground">
                No ar de {dataBr(form.inicio)} até {dataBr(ultimoDia({ inicio: form.inicio, dias: Math.max(1, Number(form.dias) || 1) }))}.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="pp-botao">Texto do botão (opcional)</Label>
                  <Input
                    id="pp-botao"
                    maxLength={30}
                    value={form.botao_texto ?? ""}
                    onChange={(e) => setForm({ ...form, botao_texto: e.target.value })}
                    placeholder="Ex.: Quero reservar"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>O botão abre</Label>
                  <Select
                    value={selectDestino}
                    onValueChange={(v) => setForm({ ...form, botao_link: v === OUTRO ? "https://" : v })}
                    disabled={!form.botao_texto?.trim()}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha" />
                    </SelectTrigger>
                    <SelectContent>
                      {DESTINOS_POPUP.map((d) => (
                        <SelectItem key={d.link} value={d.link}>
                          {d.label}
                        </SelectItem>
                      ))}
                      <SelectItem value={OUTRO}>Outro link (site, WhatsApp…)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {selectDestino === OUTRO && form.botao_texto?.trim() && (
                <div className="space-y-1.5">
                  <Label htmlFor="pp-link">Link</Label>
                  <Input
                    id="pp-link"
                    value={form.botao_link ?? ""}
                    onChange={(e) => setForm({ ...form, botao_link: e.target.value })}
                    placeholder="https://wa.me/55..."
                  />
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Quem vê</Label>
                  <Select value={form.publico} onValueChange={(v) => setForm({ ...form, publico: v as Form["publico"] })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos que abrirem o app</SelectItem>
                      <SelectItem value="hospedes">Só hóspedes que entraram com o apto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch id="pp-ativo" checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
                  <Label htmlFor="pp-ativo">Ativo</Label>
                </div>
              </div>
            </div>

            {/* Prévia */}
            <div className="space-y-2">
              <Label>Como aparece</Label>
              <div className="rounded-2xl bg-neutral-800 p-4">
                <div className="overflow-hidden rounded-[20px] bg-white text-[#1D2A22]">
                  {previa && <img src={previa} alt="" className="max-h-48 w-full object-cover" />}
                  <div className="space-y-2 p-4">
                    <div className="text-lg font-extrabold leading-tight">{form.titulo || "Título do popup"}</div>
                    {form.mensagem && <p className="whitespace-pre-line text-sm text-[#3D4A41]">{form.mensagem}</p>}
                    {form.botao_texto?.trim() && (
                      <div className="rounded-xl bg-[#1F4D3A] py-2.5 text-center text-sm font-extrabold text-white">
                        {form.botao_texto}
                      </div>
                    )}
                    <div className="text-center text-xs font-bold text-[#5B6B60]">
                      {form.botao_texto?.trim() ? "Agora não" : "Fechar"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!apagar} onOpenChange={(v) => !v && setApagar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar popup?</AlertDialogTitle>
            <AlertDialogDescription>“{apagar?.titulo}” será apagado de vez.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarApagar}>Apagar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PopupsManager;
