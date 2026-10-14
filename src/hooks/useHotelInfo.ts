import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HOTEL } from "@/config/hotel";

export interface Horario {
  nome: string;
  horario: string;
  visivel: boolean;
}

export interface Ramal {
  nome: string;
  ramal: string;
  urgente: boolean;
}

export interface Contato {
  nome: string;
  descricao: string;
  whatsapp: string;
  visivel: boolean;
}

export interface HotelInfo {
  horarios: Horario[];
  wifi_rede: string;
  wifi_senha: string;
  wifi_mostrar: boolean;
  whatsapp: string;
  whatsapp_mensagem: string;
  ramais: Ramal[];
  contatos: Contato[];
}

/** Valores de reserva, caso o banco ainda não tenha a tabela ou esteja fora do ar. */
export const HOTEL_INFO_PADRAO: HotelInfo = {
  horarios: HOTEL.horarios.map((h) => ({ ...h, visivel: true })),
  wifi_rede: HOTEL.wifi.rede,
  wifi_senha: HOTEL.wifi.senha,
  wifi_mostrar: true,
  whatsapp: HOTEL.whatsapp,
  whatsapp_mensagem: "",
  ramais: HOTEL.ramais,
  contatos: [],
};

let cache: HotelInfo | null = null;

const normalizar = (d: Partial<HotelInfo> | null): HotelInfo => ({
  horarios: Array.isArray(d?.horarios) ? (d!.horarios as Horario[]) : HOTEL_INFO_PADRAO.horarios,
  wifi_rede: d?.wifi_rede ?? HOTEL_INFO_PADRAO.wifi_rede,
  wifi_senha: d?.wifi_senha ?? HOTEL_INFO_PADRAO.wifi_senha,
  wifi_mostrar: d?.wifi_mostrar ?? true,
  whatsapp: (d?.whatsapp ?? HOTEL_INFO_PADRAO.whatsapp).replace(/\D/g, ""),
  whatsapp_mensagem: d?.whatsapp_mensagem ?? "",
  ramais: Array.isArray(d?.ramais) ? (d!.ramais as Ramal[]) : HOTEL_INFO_PADRAO.ramais,
  contatos: Array.isArray(d?.contatos) ? (d!.contatos as Contato[]) : [],
});

export const carregarHotelInfo = async (): Promise<HotelInfo> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from("hotel_info").select("*").eq("id", 1).maybeSingle();
    if (error || !data) return HOTEL_INFO_PADRAO;
    cache = normalizar(data);
    return cache;
  } catch {
    return HOTEL_INFO_PADRAO;
  }
};

/** Informações do hotel (editáveis no painel), com valores de reserva enquanto carrega. */
export const useHotelInfo = () => {
  const [info, setInfo] = useState<HotelInfo>(cache ?? HOTEL_INFO_PADRAO);
  useEffect(() => {
    let ativo = true;
    carregarHotelInfo().then((i) => ativo && setInfo(i));
    return () => {
      ativo = false;
    };
  }, []);
  return info;
};

/** Formata 5524999680997 como (24) 99968-0997 */
export const formatarWhatsapp = (numero: string) => {
  const d = numero.replace(/\D/g, "").replace(/^55/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return numero;
};

export const linkWhatsapp = (info: HotelInfo, apto?: string) => {
  const numero = info.whatsapp.startsWith("55") ? info.whatsapp : `55${info.whatsapp}`;
  const modelo = info.whatsapp_mensagem || "";
  // Sem apartamento (hóspede não logado), não manda a mensagem que depende dele
  const texto = modelo.includes("{apto}") && !apto ? "" : modelo.replace(/\{apto\}/g, apto ?? "").trim();
  return `https://wa.me/${numero}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
};

export const ramalRecepcao = (info: HotelInfo) =>
  (info.ramais.find((r) => /recep/i.test(r.nome)) ?? info.ramais.find((r) => !r.urgente) ?? info.ramais[0])?.ramal ?? "";

/** Número só com dígitos e com o 55 do Brasil na frente. */
export const numeroWhatsapp = (numero: string) => {
  const d = numero.replace(/\D/g, "");
  if (!d) return "";
  return d.startsWith("55") && d.length > 11 ? d : `55${d}`;
};

export const linkContato = (c: Contato) => `https://wa.me/${numeroWhatsapp(c.whatsapp)}`;
