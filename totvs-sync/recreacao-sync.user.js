// ==UserScript==
// @name         Recreação HFSB – Sincronizar hóspedes do PMS
// @namespace    https://github.com/hfsb25-ui/recreacaoclaude
// @version      1.1.0
// @description  Envia a lista de hóspedes hospedados do TOTVS PMS SaaS para o app de Recreação, 1 vez por dia, na primeira abertura do PMS a partir do horário configurado.
// @match        https://gestaopms.totvshospitalidade.com/*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @connect      exxcevxihbcgleopekvt.supabase.co
// ==/UserScript==

(function () {
  "use strict";

  // ============ CONFIGURAÇÃO ============
  const SYNC_URL = "https://exxcevxihbcgleopekvt.supabase.co/functions/v1/pms-sync";
  const SYNC_KEY = "COLE_AQUI_A_CHAVE_SECRETA"; // a mesma do segredo PMS_SYNC_KEY no Supabase
  const DEFAULT_API = "https://group05.totvshospitalidade.com/pmsreport/api/reservationReport/4627";
  const SYNC_HOUR = 7; // a partir de que hora do dia faz a sincronização diária
  const DAYS_BACK = 15; // busca entradas dos últimos X dias para achar quem ainda está hospedado
  // =====================================

  const page = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
  const PMS_HOST = /totvshospitalidade\.com/i;

  // ---------- 1) Captura o login que o próprio PMS usa nas chamadas ----------
  let authHeaders = null;
  let apiBase = GM_getValue("apiBase", DEFAULT_API);

  const remember = (url, headers) => {
    if (!url || !PMS_HOST.test(url) || !headers) return;
    const found = {};
    for (const [k, v] of Object.entries(headers)) {
      if (/^(authorization|x-.*|tenant.*|property.*)$/i.test(k) && v) found[k] = v;
    }
    if (Object.keys(found).length) authHeaders = found;
    const m = String(url).match(/^(https:\/\/[^/]+\/pmsreport\/api\/reservationReport\/\d+)/i);
    if (m && m[1] !== apiBase) {
      apiBase = m[1];
      GM_setValue("apiBase", apiBase);
    }
  };

  const XHR = page.XMLHttpRequest.prototype;
  const origOpen = XHR.open;
  const origSet = XHR.setRequestHeader;
  const origSend = XHR.send;
  XHR.open = function (method, url) {
    this.__rsUrl = url;
    this.__rsHeaders = {};
    return origOpen.apply(this, arguments);
  };
  XHR.setRequestHeader = function (k, v) {
    if (this.__rsHeaders) this.__rsHeaders[k] = v;
    return origSet.apply(this, arguments);
  };
  XHR.send = function () {
    try {
      remember(String(this.__rsUrl), this.__rsHeaders);
    } catch (e) {}
    return origSend.apply(this, arguments);
  };

  const origFetch = page.fetch;
  page.fetch = function (input, init) {
    try {
      const url = typeof input === "string" ? input : input && input.url;
      let h = {};
      const src = (init && init.headers) || (input && input.headers);
      if (src && typeof src.forEach === "function") src.forEach((v, k) => (h[k] = v));
      else if (src) h = { ...src };
      remember(url, h);
    } catch (e) {}
    return origFetch.apply(this, arguments);
  };

  // ---------- 2) Transformação: só o mínimo necessário ----------
  const ymd = (d) => {
    const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return z.toISOString().slice(0, 10);
  };

  const parseComposition = (code) => {
    const p = String(code || "").split("|").map((n) => parseInt(n, 10) || 0);
    return { adults: p[0] || 0, children: (p[1] || 0) + (p[2] || 0) };
  };

  // Quem conta como "no hotel": já fez check-in, ou tem chegada prevista para hoje
  const isInHouse = (row, today, now) => {
    const dep = new Date(row.departureDate);
    if (isNaN(dep.getTime()) || dep < now) return false;
    const status = String(row.status || "").toLowerCase();
    if (/check.?in|hosped/.test(status)) return true;
    if (/confirm/.test(status) && String(row.arrivalDate || "").slice(0, 10) === today) return true;
    return false;
  };

  const buildStays = (items, now = new Date()) => {
    const today = ymd(now);
    const groups = new Map();
    for (const row of items || []) {
      const key = `${row.reservationCode}|${row.uh}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    const stays = [];
    for (const rows of groups.values()) {
      const holder = rows.find((r) => r.adultsAndChildren && r.adultsAndChildren !== "Acompanhante") || rows[0];
      if (!isInHouse(holder, today, now)) continue;
      const comp = parseComposition(holder.adultsAndChildren);
      stays.push({
        reservation_code: String(holder.reservationCode),
        uh: String(holder.uh),
        guest_name: String(holder.guestName || "").trim(),
        adults: comp.adults,
        children: comp.children,
        guests_listed: rows.length,
        arrival_date: holder.arrivalDate,
        departure_date: holder.departureDate,
        status: holder.status,
      });
    }
    return stays;
  };

  // Exposto só para teste
  if (typeof module !== "undefined") module.exports = { buildStays, parseComposition };

  // ---------- 3) Busca no PMS e envia ao app ----------
  const fetchReport = async () => {
    const end = new Date();
    const start = new Date(end.getTime() - DAYS_BACK * 864e5);
    const qs = new URLSearchParams({
      IsCheckIn: "true",
      GroupName: "",
      CompanyClientName: "",
      ClientName: "",
      UserName: "",
      CheckReport: "0",
      DateInitial: ymd(start),
      DateFinal: ymd(end),
      culture: "pt-BR",
    });
    const res = await origFetch.call(page, `${apiBase}/searchCheck?${qs}`, {
      headers: { Accept: "application/json", ...(authHeaders || {}) },
      credentials: "include",
    });
    if (!res.ok) throw new Error(`PMS respondeu ${res.status}`);
    const data = await res.json();
    const list = data && data.listReservationCheckReportDto;
    if (!list || !Array.isArray(list.items)) throw new Error("Formato do relatório mudou");
    return list.items;
  };

  const send = (stays) =>
    new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "POST",
        url: SYNC_URL,
        headers: { "Content-Type": "application/json", "x-sync-key": SYNC_KEY },
        data: JSON.stringify({ source: "tampermonkey", stays }),
        timeout: 30000,
        onload: (r) => (r.status >= 200 && r.status < 300 ? resolve(JSON.parse(r.responseText || "{}")) : reject(new Error(`App respondeu ${r.status}: ${r.responseText}`))),
        onerror: () => reject(new Error("Sem conexão com o app")),
        ontimeout: () => reject(new Error("Tempo esgotado ao enviar")),
      });
    });

  // ---------- 4) Aviso discreto no canto da tela ----------
  let badge;
  const show = (text, ok) => {
    if (!document.body) return;
    if (!badge) {
      badge = document.createElement("div");
      badge.style.cssText =
        "position:fixed;right:12px;bottom:12px;z-index:2147483647;font:12px/1.3 system-ui,sans-serif;" +
        "padding:6px 10px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.2);cursor:pointer;opacity:.9";
      badge.title = "Clique para sincronizar agora";
      badge.addEventListener("click", () => run(true));
      document.body.appendChild(badge);
    }
    badge.style.background = ok ? "#e8f7ee" : "#fdecea";
    badge.style.color = ok ? "#14532d" : "#7f1d1d";
    badge.textContent = text;
  };

  let running = false;
  const todayKey = () => ymd(new Date());
  const run = async (force = false) => {
    if (running) return;
    const last = GM_getValue("lastSync", 0);
    const lastDay = GM_getValue("lastSyncDay", "");
    if (!force) {
      if (lastDay === todayKey()) {
        const t = new Date(last).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        show(`✅ Recreação sincronizada hoje às ${t}`, true);
        return;
      }
      if (new Date().getHours() < SYNC_HOUR) {
        show(`🕖 Recreação: sincroniza hoje a partir das ${SYNC_HOUR}h`, true);
        return;
      }
    }
    if (SYNC_KEY.startsWith("COLE_AQUI")) {
      show("⚠️ Recreação: falta configurar a chave no script", false);
      return;
    }
    if (!authHeaders) {
      show("⏳ Recreação: aguardando o login do PMS…", false);
      return;
    }
    running = true;
    try {
      show("🔄 Sincronizando com a Recreação…", true);
      const items = await fetchReport();
      const stays = buildStays(items);
      const result = await send(stays);
      GM_setValue("lastSync", Date.now());
      GM_setValue("lastSyncDay", todayKey());
      const t = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      show(`✅ Recreação sincronizada hoje às ${t} · ${result.rooms ?? stays.length} aptos`, true);
    } catch (e) {
      console.warn("[Recreação]", e);
      show(`⚠️ Recreação: ${e.message} (clique para tentar de novo)`, false);
    } finally {
      running = false;
    }
  };

  const start = () => {
    setTimeout(() => run(), 20000); // espera o PMS carregar e fazer as primeiras chamadas
    setInterval(() => run(), 5 * 60000); // confere a cada 5 minutos se a sincronização do dia já foi feita
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
