// ==UserScript==
// @name         Recreação HFSB – Sincronizar hóspedes e consumo do PMS
// @namespace    https://github.com/hfsb25-ui/recreacaoclaude
// @version      1.2.0
// @description  Envia ao app de Recreação a lista de hóspedes (1 vez por dia) e o consumo por apartamento (a cada 30 min) do TOTVS PMS SaaS.
// @match        https://gestaopms.totvshospitalidade.com/*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @connect      exxcevxihbcgleopekvt.supabase.co
// @connect      ebs.totvshospitalidade.com
// ==/UserScript==

(function () {
  "use strict";

  // ============ CONFIGURAÇÃO ============
  const SYNC_URL = "https://exxcevxihbcgleopekvt.supabase.co/functions/v1/pms-sync";
  const SYNC_KEY = "COLE_AQUI_A_CHAVE_SECRETA"; // a mesma do segredo PMS_SYNC_KEY no Supabase
  const DEFAULT_API = "https://group05.totvshospitalidade.com/pmsreport/api/reservationReport/4627";
  const SYNC_HOUR = 7; // a partir de que hora do dia faz a sincronização diária
  const DAYS_BACK = 15; // busca entradas dos últimos X dias para achar quem ainda está hospedado
  const CONSUMPTION_URL = "https://exxcevxihbcgleopekvt.supabase.co/functions/v1/pms-consumption-sync";
  const REPORT_BASE = "https://ebs.totvshospitalidade.com/report";
  const CONSUMPTION_EVERY_MIN = 30; // de quanto em quanto tempo atualiza o consumo
  const CONSUMPTION_HOURS = [7, 23]; // só atualiza o consumo entre estes horários
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

  // Login dos relatórios: o PMS abre os relatórios com "?auth=..." no endereço
  let reportAuth = null;
  const rememberReportUrl = (url) => {
    try {
      const u = new URL(String(url), page.location.href);
      if (/ebs\.totvshospitalidade\.com$/i.test(u.hostname) && u.searchParams.get("auth")) {
        reportAuth = u.searchParams.get("auth");
      }
    } catch (e) {}
  };
  try {
    const FormProto = page.HTMLFormElement.prototype;
    const origSubmit = FormProto.submit;
    FormProto.submit = function () {
      rememberReportUrl(this.action);
      return origSubmit.apply(this, arguments);
    };
    page.document.addEventListener("submit", (ev) => ev.target && rememberReportUrl(ev.target.action), true);
  } catch (e) {}

  const bearerToken = () => {
    if (!authHeaders) return null;
    for (const [k, v] of Object.entries(authHeaders)) {
      if (/^authorization$/i.test(k) && /^bearer\s+/i.test(v)) return v.replace(/^bearer\s+/i, "");
    }
    return null;
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

  // ----- Consumo: leitura do CSV do relatório "Saldo das Contas na Data" -----
  // Ordem fixa dos 17 valores de cada conta no relatório
  const VALUE_FIELDS = [
    "diaria", "restaurante", "bares", "banquete", "eventos", "lavanderia", "telefonia", "diversos",
    "adiantamento", "taxas", "iss", "total_servicos", "total_produto",
    "credito_deposito", "credito_sem_deposito", "creditos", "saldo",
  ];
  const ACCOUNT_TYPE = /^(h[óo]spede|empresa|grupo|ag[êe]ncia|master|passante|extra|evento)$/i;
  const DATE_BR = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const isMoney = (c) => /^-?[\d.]+,\d{2}$/.test(c);
  const toNumber = (c) => Number(c.replace(/\./g, "").replace(",", "."));
  const brToIso = (c) => {
    const m = c.match(DATE_BR);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
  };

  // Devolve só apto, reserva, tipo de conta, status, datas e valores. Os nomes dos hóspedes ficam de fora.
  const parseConsumptionCsv = (text) => {
    const lines = String(text).split(/\r?\n/);
    const sep = (lines.find((l) => l.includes("Saldo")) || "").includes(";") ? ";" : ",";
    const cellsOf = (l) => l.split(sep).map((c) => c.replace(/^"|"$/g, "").trim()).filter(Boolean);
    let reportDate = null;
    const accounts = [];
    let skipped = 0;
    let block = null;

    for (let i = 0; i < lines.length; i++) {
      const cells = cellsOf(lines[i]);
      if (!cells.length) continue;
      const di = cells.indexOf("Data Selecionada:");
      if (di >= 0 && cells[di + 1]) reportDate = brToIso(cells[di + 1]);
      if (cells[0] === "Total Geral") break;
      if (cells[0] === "Cód. Reserva" || cells[0] === "Cod. Reserva") {
        block = { info: [] };
        continue;
      }
      if (!block) continue;
      if (cells[0] === "Diária" || cells[0] === "Diaria") {
        const values = cellsOf(lines[i + 1] || "");
        i++;
        const info = block.info;
        block = null;
        if (values.length !== VALUE_FIELDS.length || !values.every(isMoney) || !info.length) {
          skipped++;
          continue;
        }
        const flat = info.flat();
        const reservation = flat.find((c) => /^[A-Z0-9]{4,}-\d{3,}$/i.test(c)) || (info[1] && info[1][0]);
        const uh = info[0][0];
        const dates = flat.map(brToIso).filter(Boolean).sort();
        const type = (info[1] || []).find((c) => ACCOUNT_TYPE.test(c)) || flat.find((c) => ACCOUNT_TYPE.test(c)) || null;
        const status = flat.find((c) => /check|confirm|hosped|pend|bloq/i.test(c)) || null;
        if (!reservation || !uh || uh.length > 10 || DATE_BR.test(uh)) {
          skipped++;
          continue;
        }
        const acc = {
          reservation_code: reservation,
          uh,
          account_type: type,
          status,
          arrival_date: dates[0] || null,
          departure_date: dates[dates.length - 1] || null,
        };
        VALUE_FIELDS.forEach((f, k) => (acc[f] = toNumber(values[k])));
        accounts.push(acc);
        continue;
      }
      if (/^Adiantamento/i.test(cells[0])) continue;
      block.info.push(cells);
    }
    return { reportDate, accounts, skipped };
  };

  // Exposto só para teste
  if (typeof module !== "undefined") module.exports = { buildStays, parseComposition, parseConsumptionCsv };

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

  // ---------- 3b) Consumo: gera o relatório "Saldo das Contas" de hoje e exporta em CSV ----------
  const gmRequest = (opts) =>
    new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        timeout: 60000,
        ...opts,
        onload: (r) => resolve(r),
        onerror: () => reject(new Error("Sem conexão com o servidor de relatórios")),
        ontimeout: () => reject(new Error("Servidor de relatórios demorou demais")),
      });
    });

  const decode = (buf) => {
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(buf);
    } catch (e) {
      return new TextDecoder("windows-1252").decode(buf);
    }
  };

  // O visualizador de relatórios (DevExpress) recebe "arg" codificado duas vezes
  const dx = async (actionKey, argObj, binary = false) => {
    const arg = encodeURIComponent(typeof argObj === "string" ? argObj : JSON.stringify(argObj));
    const r = await gmRequest({
      method: "POST",
      url: `${REPORT_BASE}/DXXRDV`,
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
      data: `actionKey=${actionKey}&arg=${encodeURIComponent(arg)}`,
      responseType: binary ? "arraybuffer" : undefined,
    });
    if (r.status < 200 || r.status >= 300) throw new Error(`Relatório (${actionKey}) respondeu ${r.status}`);
    if (binary) return r.response;
    let data;
    try {
      data = JSON.parse(r.responseText);
    } catch (e) {
      throw new Error(`Resposta inesperada do relatório (${actionKey})`);
    }
    if (data && data.success === false) throw new Error(`Relatório recusou ${actionKey}: ${data.error || ""}`);
    return data && data.result !== undefined ? data.result : data;
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const fetchConsumptionCsv = async () => {
    const auth = reportAuth || bearerToken();
    if (!auth) throw new Error("aguardando o login do PMS");

    // 1) abre o relatório de hoje (campos vazios = data atual do sistema)
    const form = "ArrivalDate=&BalanceOnDate=&BalanceSystemDate=&BillingAccountType=&CompanyClientId=&GroupName=" +
      "&PendingAccount=&PositiveBalance=&ReservationStatus=2&SortByUh=&ZeroBalance=";
    const page1 = await gmRequest({
      method: "POST",
      url: `${REPORT_BASE}/AccountBalanceOnDate?auth=${encodeURIComponent(auth)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: form,
    });
    if (page1.status === 401 || page1.status === 403) throw new Error("login do relatório expirou, abra qualquer relatório no PMS");
    if (page1.status < 200 || page1.status >= 300) throw new Error(`Relatório respondeu ${page1.status}`);
    const html = page1.responseText || "";
    const m = html.match(/["']?reportId["']?\s*[:=]\s*["']([^"']+)["']/i);
    if (!m) throw new Error("não achei o código do relatório (o TOTVS pode ter mudado a tela)");
    const reportId = m[1];
    const urlMatch = html.match(/["']?reportUrl["']?\s*[:=]\s*["']([^"']*)["']/i);

    // 2) gera o documento
    const tz = 0 - new Date().getTimezoneOffset();
    const build = await dx("startBuild", {
      reportId,
      reportUrl: urlMatch ? urlMatch[1] : "",
      drillDownKeys: [],
      sortingState: [],
      timeZoneOffset: tz,
      parameters: [],
    });
    const documentId = build && (build.documentId || build.DocumentId);
    if (!documentId) throw new Error("o relatório não gerou o documento");

    for (let i = 0, first = true; ; i++, first = false) {
      if (i > 60) throw new Error("o relatório demorou demais para ficar pronto");
      const st = await dx("getBuildStatus", { documentId, isFirstRequest: first, timeOut: 5000 });
      if (st && (st.completed || st.progress >= 100)) break;
      await sleep(1000);
    }

    // 3) exporta em CSV (primeiro do jeito direto; se o servidor exigir, do jeito assíncrono)
    const exportArg = { documentId, exportOptions: null, format: "csv", inlineResult: true, editingFieldValues: [] };
    const looksLikeCsv = (t) => /Saldo das Contas|C[óo]d\. Reserva/.test(t);
    try {
      const text = decode(await dx("exportTo", exportArg, true));
      if (looksLikeCsv(text)) return text;
    } catch (e) {
      console.warn("[Recreação] exportTo direto falhou, tentando assíncrono", e);
    }
    const opId = await dx("startExport", exportArg);
    const id = typeof opId === "string" ? opId : opId && (opId.id || opId.operationId);
    if (!id) throw new Error("o relatório não iniciou a exportação");
    for (let i = 0; ; i++) {
      if (i > 60) throw new Error("a exportação demorou demais");
      const st = await dx("getExportStatus", { id, timeOut: 5000 });
      if (st && (st.completed || st.progress >= 100)) break;
      await sleep(1000);
    }
    const text = decode(await dx("getExportResult", { id, inlineResult: true }, true));
    if (!looksLikeCsv(text)) throw new Error("a exportação não veio no formato esperado");
    return text;
  };

  const sendConsumption = (payload) =>
    new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "POST",
        url: CONSUMPTION_URL,
        headers: { "Content-Type": "application/json", "x-sync-key": SYNC_KEY },
        data: JSON.stringify(payload),
        timeout: 30000,
        onload: (r) => (r.status >= 200 && r.status < 300 ? resolve(JSON.parse(r.responseText || "{}")) : reject(new Error(`App respondeu ${r.status}: ${r.responseText}`))),
        onerror: () => reject(new Error("Sem conexão com o app")),
        ontimeout: () => reject(new Error("Tempo esgotado ao enviar")),
      });
    });

  let consumptionStatus = "";
  let consumptionOk = true;
  let consumptionRunning = false;
  const runConsumption = async (force = false) => {
    if (consumptionRunning || SYNC_KEY.startsWith("COLE_AQUI")) return;
    const h = new Date().getHours();
    const last = GM_getValue("lastConsumption", 0);
    if (!force) {
      if (h < CONSUMPTION_HOURS[0] || h >= CONSUMPTION_HOURS[1]) return;
      if (Date.now() - last < CONSUMPTION_EVERY_MIN * 60000) return;
    }
    if (!reportAuth && !authHeaders) return; // ainda sem login
    consumptionRunning = true;
    try {
      const csv = await fetchConsumptionCsv();
      const { reportDate, accounts, skipped } = parseConsumptionCsv(csv);
      if (!accounts.length) throw new Error("relatório de consumo veio vazio");
      // envia só o necessário (sem créditos detalhados e sem nomes)
      const slim = accounts.map((a) => ({
        reservation_code: a.reservation_code, uh: a.uh, account_type: a.account_type, status: a.status,
        arrival_date: a.arrival_date, departure_date: a.departure_date,
        diaria: a.diaria, restaurante: a.restaurante, bares: a.bares, banquete: a.banquete, eventos: a.eventos,
        lavanderia: a.lavanderia, telefonia: a.telefonia, diversos: a.diversos, taxas: a.taxas, iss: a.iss,
        creditos: a.creditos, saldo: a.saldo,
      }));
      await sendConsumption({ report_date: reportDate, accounts: slim });
      GM_setValue("lastConsumption", Date.now());
      const t = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      consumptionStatus = `consumo às ${t} (${accounts.length} contas${skipped ? `, ${skipped} ignoradas` : ""})`;
      consumptionOk = true;
    } catch (e) {
      console.warn("[Recreação] consumo", e);
      consumptionStatus = `consumo: ${e.message}`;
      consumptionOk = false;
    } finally {
      consumptionRunning = false;
      refreshBadge();
    }
  };

  // ---------- 4) Aviso discreto no canto da tela ----------
  let badge;
  let lastText = "";
  let lastOk = true;
  const refreshBadge = () => lastText && show(lastText, lastOk);
  const show = (text, ok) => {
    lastText = text;
    lastOk = ok;
    if (!document.body) return;
    if (!badge) {
      badge = document.createElement("div");
      badge.style.cssText =
        "position:fixed;right:12px;bottom:12px;z-index:2147483647;font:12px/1.3 system-ui,sans-serif;" +
        "padding:6px 10px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.2);cursor:pointer;opacity:.9";
      badge.title = "Clique para sincronizar agora";
      badge.addEventListener("click", () => {
        run(true);
        runConsumption(true);
      });
      document.body.appendChild(badge);
    }
    const allOk = ok && consumptionOk;
    badge.style.background = allOk ? "#e8f7ee" : "#fdecea";
    badge.style.color = allOk ? "#14532d" : "#7f1d1d";
    badge.textContent = consumptionStatus ? `${text} · ${consumptionStatus}` : text;
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
    setTimeout(() => runConsumption(), 40000);
    setInterval(() => {
      run(); // confere a cada 5 minutos se a sincronização do dia já foi feita
      runConsumption(); // e se já está na hora de atualizar o consumo
    }, 5 * 60000);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
