// ==UserScript==
// @name         Recreação HFSB – Sincronizar hóspedes e consumo do PMS
// @namespace    https://github.com/hfsb25-ui/recreacaoclaude
// @version      1.6.0
// @description  Envia ao app de Recreação os hóspedes na casa (2 vezes por dia: manhã e 20h, relatório "Hóspedes na Casa") e o consumo por apartamento (a cada 30 min) do TOTVS PMS SaaS.
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
  // Previsão do dia (chegadas, saídas, adultos e crianças) vai direto para o banco por uma função protegida pela mesma chave
  const PREVISAO_URL = "https://exxcevxihbcgleopekvt.supabase.co/rest/v1/rpc/pms_salvar_previsao";
  const SUPABASE_PUBLIC_KEY = "sb_publishable_2DbqR1Z61fhuqEbaHagy0w_eiq1iD2r"; // chave pública do app (a mesma que o site usa)
  const DEFAULT_API = "https://group05.totvshospitalidade.com/pmsreport/api/reservationReport/4627";
  // Horários da sincronização dos hóspedes: a partir das 7h (manhã) e a partir das 20h (noite)
  const SYNC_SLOTS = [
    { hour: 7, name: "manhã" },
    { hour: 20, name: "noite" },
  ];
  const DAYS_BACK = 15; // busca entradas dos últimos X dias para achar quem ainda está hospedado
  const CONSUMPTION_URL = "https://exxcevxihbcgleopekvt.supabase.co/functions/v1/pms-consumption-sync";
  const REPORT_BASE = "https://ebs.totvshospitalidade.com/report";
  // Relatórios usados (pedido de login de cada um + página + filtros, todos vazios = hoje)
  const REPORTS = {
    consumo: {
      filtersUrl: "https://ebs.totvshospitalidade.com/report/api/FiltersReport/7e6d796f-53d6-4d43-9f55-2de54785ab7b?culture=pt-BR",
      page: "AccountBalanceOnDate",
      form: "ArrivalDate=&BalanceOnDate=&BalanceSystemDate=&BillingAccountType=&CompanyClientId=&GroupName=" +
        "&PendingAccount=&PositiveBalance=&ReservationStatus=2&SortByUh=&ZeroBalance=",
      looksLike: /Saldo das Contas|C[óo]d\. Reserva/,
    },
    titulares: {
      filtersUrl: "https://ebs.totvshospitalidade.com/report/api/FiltersReport/76e5fa87-1619-4ed5-ba4e-4a2ef2334079?culture=pt-BR",
      page: "InHouseGuests",
      form: "BaseRate=&BirthdayEndDate=&BirthdayStartDate=&Classification=&GuestType=&MainGuestOnly=true&NoPost=" +
        "&Observations=&PensionType=&TotalizerByPensionType=&Wing=",
      looksLike: /Reserva/,
    },
    // Ocupação Detalhada: previsão por dia (já conta quem ainda vai chegar). Datas preenchidas na hora.
    ocupacao: {
      filtersUrl: "https://ebs.totvshospitalidade.com/report/api/FiltersReport/dc927f0d-0dc7-405c-b47f-f11313fb767c?culture=pt-BR",
      page: "OccupationDetailedDaily",
      form: "",
      looksLike: /Ocupa[çc][ãa]o|Pax/,
    },
    hospedes: {
      filtersUrl: "https://ebs.totvshospitalidade.com/report/api/FiltersReport/76e5fa87-1619-4ed5-ba4e-4a2ef2334079?culture=pt-BR",
      page: "InHouseGuests",
      form: "BaseRate=&BirthdayEndDate=&BirthdayStartDate=&Classification=&GuestType=&MainGuestOnly=&NoPost=" +
        "&Observations=&PensionType=&TotalizerByPensionType=&Wing=",
      looksLike: /Reserva/,
    },
  };
  const JWT_RE = /eyJ[\w-]+\.eyJ[\w-]+\.[\w-]+/g;
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
  // endereço real do relatório: aprendido na 1ª vez que o PMS abre o "Saldo das Contas" e guardado
  let reportPageUrl = GM_getValue("reportPageUrl", null);
  const rememberReportUrl = (url) => {
    try {
      const u = new URL(String(url), page.location.href);
      if (/ebs\.totvshospitalidade\.com$/i.test(u.hostname) && u.searchParams.get("auth")) {
        reportAuth = u.searchParams.get("auth");
        if (/AccountBalanceOnDate/i.test(u.pathname)) {
          reportPageUrl = u.origin + u.pathname;
          GM_setValue("reportPageUrl", reportPageUrl); // só o endereço; o login não é guardado
        }
      }
    } catch (e) {}
  };
  try {
    const desc = Object.getOwnPropertyDescriptor(page.HTMLIFrameElement.prototype, "src");
    Object.defineProperty(page.HTMLIFrameElement.prototype, "src", {
      ...desc,
      set(v) {
        rememberReportUrl(v);
        return desc.set.call(this, v);
      },
    });
  } catch (e) {}
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
          if (typeof skippedShapes !== "undefined") skippedShapes.push(shapeOf(info, values));
          continue;
        }
        const flat = info.flat();
        const reservation = flat.find((c) => /^[A-Z0-9]{4,}-\d{3,}$/i.test(c)) || (info[1] && info[1][0]);
        // apto: normalmente o 1º campo da 1ª linha; se ali estiver a reserva, procura um código curto de apto
        const looksUh = (c) => /^[A-Z]{0,2}\d{1,4}[A-Z]?$/i.test(c) && c !== reservation;
        const uh = looksUh(info[0][0]) ? info[0][0] : flat.find(looksUh);
        const dates = flat.map(brToIso).filter(Boolean).sort();
        const type = (info[1] || []).find((c) => ACCOUNT_TYPE.test(c)) || flat.find((c) => ACCOUNT_TYPE.test(c)) || null;
        const status = flat.find((c) => /check|confirm|hosped|pend|bloq/i.test(c)) || null;
        if (!reservation || !uh) {
          skipped++;
          if (typeof skippedShapes !== "undefined") skippedShapes.push(shapeOf(info, values));
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

  // ----- Hóspedes na Casa: leitura do CSV -----
  const RES_CODE = /^[A-Z0-9]{4,}-\d{3,}$/i;
  const looksUhCode = (c) => /^[A-Z]{0,2}\d{1,4}[A-Z]?$/i.test(c);
  const parseGuestsCsv = (text) => {
    const lines = String(text).split(/\r?\n/);
    const sep = (lines.find((l) => /Reserva/.test(l)) || "").includes(";") ? ";" : ",";
    const cellsOf = (l) => l.split(sep).map((c) => c.replace(/^"|"$/g, "").trim()).filter(Boolean);
    const stays = [];
    let cur = null;
    for (const line of lines) {
      const cells = cellsOf(line);
      if (!cells.length) continue;
      const resIdx = cells.findIndex((c) => RES_CODE.test(c));
      // Cabeçalho da reserva: tem o código da reserva
      if (resIdx >= 0) {
        const uhLabel = cells.findIndex((c) => /^C[óo]d\.?\s*UH$/i.test(c));
        let uh = uhLabel >= 0 ? cells[uhLabel + 1] : null;
        if (!uh || !looksUhCode(uh)) uh = cells.slice(resIdx + 1).find(looksUhCode) || null;
        const adIdx = cells.findIndex((c) => /AD\s*\/\s*C1/i.test(c));
        const comp = adIdx >= 0 ? cells.slice(adIdx + 1, adIdx + 5).map((c) => parseInt(c.replace(/\D/g, ""), 10) || 0) : [];
        const pIdx = cells.findIndex((c) => /^Tipo\s*Pens/i.test(c));
        const tIdx = cells.findIndex((c) => /^Tipo\s*UH$/i.test(c));
        const cIdx = cells.findIndex((c) => /^Cliente$/i.test(c));
        cur = {
          reservation_code: cells[resIdx],
          uh,
          room_type: tIdx >= 0 ? cells[tIdx + 1] : null,
          client: cIdx >= 0 && !/^AD/i.test(cells[cIdx + 1] || "") ? cells[cIdx + 1] : null,
          composition: comp,
          pension: pIdx >= 0 ? cells.slice(pIdx + 1).join(" ") : null,
          guests: [],
        };
        stays.push(cur);
        continue;
      }
      // Linha de rótulos das colunas
      if (cells.some((c) => /^Sobrenome$/i.test(c))) continue;
      // Linha de hóspede: data de nascimento seguida da idade
      const bIdx = cells.findIndex((c, i) => DATE_BR.test(c) && /^\d{1,3}$/.test(cells[i + 1] || ""));
      if (bIdx >= 0 && cur) {
        const dates = cells.filter((c) => DATE_BR.test(c));
        const typeIdx = cells.findIndex((c) => /h[óo]spede|acompanhante|crian/i.test(c));
        const nameCells = cells.slice(0, typeIdx >= 0 && typeIdx < bIdx ? typeIdx : bIdx);
        const phone = cells.find((c, i) => i > bIdx + 1 && /^\+?[\d\s()-]{10,}$/.test(c) && !DATE_BR.test(c)) || null;
        cur.guests.push({
          surname: nameCells[0] || "",
          name: nameCells.slice(1).join(" "),
          phone,
          guest_type: typeIdx >= 0 ? cells[typeIdx] : null,
          age: parseInt(cells[bIdx + 1], 10),
          arrival_date: brToIso(dates[1] || ""),
          departure_date: brToIso(dates[2] || ""),
        });
        continue;
      }
    }
    return stays;
  };


  // Monta a lista de aptos para o app: titular = 1º adulto; crianças pelo AD/C1/C2/C3 (ou pela idade)
  const personKey = (reservation, g) =>
    `${reservation}|${`${g.name} ${g.surname}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\s+/g, " ").trim()}`;

  // mainKeys: titulares vindos do relatório com "só hóspede principal" (se disponível)
  const buildStaysFromInHouse = (parsed, mainKeys = null) =>
    parsed
      .filter((s) => s.uh && s.guests.length)
      .map((s) => {
        const main = mainKeys ? s.guests.find((g) => mainKeys.has(personKey(s.reservation_code, g))) : null;
        const holder = main || s.guests.find((g) => g.age >= 18) || s.guests[0];
        const comp = s.composition || [];
        const adults = comp.length ? comp[0] : s.guests.filter((g) => g.age >= 12).length;
        const children = comp.length ? comp.slice(1).reduce((a, b) => a + b, 0) : s.guests.filter((g) => g.age < 12).length;
        const arrivals = s.guests.map((g) => g.arrival_date).filter(Boolean).sort();
        const departures = s.guests.map((g) => g.departure_date).filter(Boolean).sort();
        return {
          reservation_code: s.reservation_code,
          uh: s.uh,
          guest_name: `${holder.name} ${holder.surname}`.trim(),
          adults,
          children,
          guests_listed: s.guests.length,
          arrival_date: arrivals[0] ? `${arrivals[0]}T14:00:00` : null,
          departure_date: departures.length ? `${departures[departures.length - 1]}T12:00:00` : null,
          status: "Check-In",
          guests: s.guests.map((g) => ({ first_name: g.name, surname: g.surname, age: g.age, phone: g.phone, is_main: !!main && g === main })),
        };
      });

  // Junta as várias contas do mesmo apto + reserva num total só
  const mergeAccounts = (accounts) => {
    const map = new Map();
    for (const a of accounts) {
      const key = `${a.reservation_code}|${a.uh}`;
      const cur = map.get(key);
      if (!cur) {
        map.set(key, { ...a, accounts: 1 });
        continue;
      }
      cur.accounts += 1;
      VALUE_FIELDS.forEach((f) => (cur[f] = Math.round(((cur[f] || 0) + (a[f] || 0)) * 100) / 100));
      if (!/^h[óo]spede$/i.test(cur.account_type || "") && /^h[óo]spede$/i.test(a.account_type || "")) cur.account_type = a.account_type;
      if (a.arrival_date && (!cur.arrival_date || a.arrival_date < cur.arrival_date)) cur.arrival_date = a.arrival_date;
      if (a.departure_date && (!cur.departure_date || a.departure_date > cur.departure_date)) cur.departure_date = a.departure_date;
    }
    return [...map.values()];
  };

  // Exposto só para teste
  // ----- Previsão: leitura do CSV da "Ocupação Detalhada" (parte "Relatório Sintético") -----
  const PREV_CAMPOS = { "Occ": "ocupados", "In.H.": "in_house", "In": "chegadas", "Out": "saidas", "Adt": "adultos", "Chd": "criancas", "Pax": "pax" };
  const parseOccupationCsv = (text) => {
    const lines = String(text).split(/\r?\n/);
    const ini = lines.findIndex((l) => /Relat[óo]rio Sint[ée]tico/i.test(l));
    if (ini < 0) throw new Error("não achei a parte Sintética do relatório de ocupação");
    const cells = (l) => l.split(";").map((c) => c.trim()).filter(Boolean);
    const head = lines.slice(ini + 1).find((l) => /\bOcc\b/.test(l) && /Pax/.test(l));
    if (!head) throw new Error("não achei as colunas do relatório de ocupação");
    const nomes = cells(head);
    const out = [];
    for (const l of lines.slice(lines.indexOf(head) + 1)) {
      const c = cells(l);
      const m = (c[0] || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (!m) continue;
      const nums = c.slice(2); // depois da data e do dia da semana
      const dia = { dia: `${m[3]}-${m[2]}-${m[1]}` };
      nomes.forEach((n, i) => {
        if (PREV_CAMPOS[n] && nums[i] != null) dia[PREV_CAMPOS[n]] = parseInt(nums[i].replace(/\./g, ""), 10) || 0;
      });
      if (dia.chegadas != null) out.push(dia);
    }
    if (!out.length) throw new Error("o relatório de ocupação veio sem dias");
    return out;
  };

  if (typeof module !== "undefined") module.exports = { parseOccupationCsv, buildStays, parseComposition, parseConsumptionCsv, mergeAccounts, parseGuestsCsv, buildStaysFromInHouse };

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

  // Gera um relatório do TOTVS (de hoje) e devolve o CSV exportado
  const fetchReportCsv = async (rep) => {
    // 1) pede um login novo de relatório ao TOTVS, como o próprio PMS faz
    const candidates = [];
    if (authHeaders) {
      const r = await gmRequest({ method: "GET", url: rep.filtersUrl, headers: { Accept: "application/json", ...authHeaders } });
      [...new Set((r.responseText || "").match(JWT_RE) || [])].forEach((t) => candidates.push(t));
    }
    if (rep.page === "AccountBalanceOnDate" && reportAuth) candidates.push(reportAuth);
    if (!candidates.length) throw new Error("aguardando o login do PMS");

    // 2) abre o relatório (filtros vazios = hoje)
    const pageUrl = rep.page === "AccountBalanceOnDate" && reportPageUrl ? reportPageUrl : `${REPORT_BASE}/${rep.page}`;
    let page1 = null;
    for (const token of candidates) {
      const r = await gmRequest({
        method: "POST",
        url: `${pageUrl}?auth=${encodeURIComponent(token)}`,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        data: rep.form,
      });
      if (r.status >= 200 && r.status < 300 && /reportId/i.test(r.responseText || "")) {
        page1 = r;
        break;
      }
    }
    if (!page1) throw new Error("o relatório não aceitou o login");
    const html = page1.responseText || "";
    const m = html.match(/["']?reportId["']?\s*[:=]\s*["']([^"']+)["']/i);
    if (!m) throw new Error("não achei o código do relatório (o TOTVS pode ter mudado a tela)");
    const urlMatch = html.match(/["']?reportUrl["']?\s*[:=]\s*["']([^"']*)["']/i);

    // 3) gera o documento
    const build = await dx("startBuild", {
      reportId: m[1],
      reportUrl: urlMatch ? urlMatch[1] : "",
      drillDownKeys: [],
      sortingState: [],
      timeZoneOffset: 0 - new Date().getTimezoneOffset(),
      parameters: [],
    });
    const documentId = build && (build.documentId || build.DocumentId);
    if (!documentId) throw new Error("o relatório não gerou o documento");
    for (let i = 0, first = true; ; i++, first = false) {
      if (i > 90) throw new Error("o relatório demorou demais para ficar pronto");
      const st = await dx("getBuildStatus", { documentId, isFirstRequest: first, timeOut: 5000 });
      if (st && (st.completed || st.progress >= 100)) break;
      await sleep(1000);
    }

    // 4) exporta em CSV (primeiro do jeito direto; se o servidor exigir, do jeito assíncrono)
    const exportArg = { documentId, exportOptions: null, format: "csv", inlineResult: true, editingFieldValues: [] };
    try {
      const text = decode(await dx("exportTo", exportArg, true));
      if (rep.looksLike.test(text)) return text;
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
    if (!rep.looksLike.test(text)) throw new Error("a exportação não veio no formato esperado");
    return text;
  };

  const fetchConsumptionCsv = () => fetchReportCsv(REPORTS.consumo);

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
      const slim = mergeAccounts(accounts).map((a) => ({
        reservation_code: a.reservation_code, uh: a.uh, account_type: a.account_type, status: a.status,
        arrival_date: a.arrival_date, departure_date: a.departure_date,
        diaria: a.diaria, restaurante: a.restaurante, bares: a.bares, banquete: a.banquete, eventos: a.eventos,
        lavanderia: a.lavanderia, telefonia: a.telefonia, diversos: a.diversos, taxas: a.taxas, iss: a.iss,
        creditos: a.creditos, saldo: a.saldo,
      }));
      await sendConsumption({ report_date: reportDate, accounts: slim });
      GM_setValue("lastConsumption", Date.now());
      const t = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      consumptionStatus = `consumo às ${t} (${slim.length} aptos${skipped ? `, ${skipped} ignoradas` : ""})`;
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

  // ---------- Previsão de hoje e amanhã ----------
  let previsaoStatus = "";
  const runPrevisao = async () => {
    if (SYNC_KEY.startsWith("COLE_AQUI") || !authHeaders) return;
    try {
      const hoje = new Date();
      const amanha = new Date(hoje.getTime() + 864e5);
      const form = `Analitic=&EndDate=${ymd(amanha)}&RevenueExcludePension=&StartDate=${ymd(hoje)}&Synthetic=&TypeUH=`;
      const dias = parseOccupationCsv(await fetchReportCsv({ ...REPORTS.ocupacao, form }));
      const r = await gmRequest({
        method: "POST",
        url: PREVISAO_URL,
        headers: { "Content-Type": "application/json", apikey: SUPABASE_PUBLIC_KEY, Authorization: `Bearer ${SUPABASE_PUBLIC_KEY}` },
        data: JSON.stringify({ p_chave: SYNC_KEY, p_dias: dias }),
      });
      if (r.status < 200 || r.status >= 300) throw new Error(`banco respondeu ${r.status}`);
      const d0 = dias.find((d) => d.dia === ymd(hoje)) || dias[0];
      previsaoStatus = `previsão: ${d0.chegadas} chegadas hoje`;
    } catch (e) {
      console.warn("[Recreação] previsão", e);
      previsaoStatus = `previsão: ${e.message}`;
    }
    refreshBadge();
  };

  // ---------- 4) Aviso discreto no canto da tela ----------
  // Só uma bolinha verde (tudo certo) ou vermelha (problema). Clicando, abre o texto e o botão de sincronizar.
  let badge, dot, panel, panelText;
  let lastText = "";
  let lastOk = true;
  let open = false;
  const refreshBadge = () => lastText && show(lastText, lastOk);
  const build = () => {
    badge = document.createElement("div");
    badge.style.cssText =
      "position:fixed;right:10px;bottom:10px;z-index:2147483647;font:12px/1.35 system-ui,sans-serif;" +
      "display:flex;flex-direction:column;align-items:flex-end;gap:6px";
    panel = document.createElement("div");
    panel.style.cssText =
      "display:none;max-width:340px;padding:8px 10px;border-radius:10px;background:#fff;color:#1d2a22;" +
      "box-shadow:0 4px 14px rgba(0,0,0,.18);border:1px solid #e1e6de";
    panelText = document.createElement("div");
    const btn = document.createElement("button");
    btn.textContent = "Sincronizar agora";
    btn.style.cssText =
      "margin-top:6px;padding:4px 10px;border:0;border-radius:6px;background:#1F4D3A;color:#fff;font:600 12px system-ui,sans-serif;cursor:pointer";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      run(true);
      runConsumption(true);
    });
    panel.append(panelText, btn);
    dot = document.createElement("div");
    dot.style.cssText = "width:12px;height:12px;border-radius:50%;cursor:pointer;box-shadow:0 0 0 2px #fff,0 1px 4px rgba(0,0,0,.3)";
    dot.addEventListener("click", () => {
      open = !open;
      panel.style.display = open ? "block" : "none";
    });
    badge.append(panel, dot);
    document.body.appendChild(badge);
  };
  const show = (text, ok) => {
    lastText = text;
    lastOk = ok;
    if (!document.body) return;
    if (!badge) build();
    const allOk = ok && consumptionOk;
    const full = [text, consumptionStatus, previsaoStatus].filter(Boolean).join(" · ");
    const working = /^🔄/.test(text);
    dot.style.background = working ? "#F2B13B" : allOk ? "#16a34a" : "#dc2626";
    dot.title = `${full}\n(clique para ver detalhes)`;
    panelText.textContent = `Recreação HFSB — ${full}`;
  };

  let running = false;
  const todayKey = () => ymd(new Date());
  // Turno atual: o último horário de sincronização já alcançado hoje (null antes das 7h)
  const currentSlot = () => {
    const h = new Date().getHours();
    const slot = [...SYNC_SLOTS].reverse().find((x) => h >= x.hour);
    return slot ? { key: `${todayKey()}|${slot.hour}`, ...slot } : null;
  };
  const nextSlotHour = () => {
    const h = new Date().getHours();
    const next = SYNC_SLOTS.find((x) => h < x.hour);
    return next ? next.hour : SYNC_SLOTS[0].hour;
  };
  const run = async (force = false) => {
    if (running) return;
    const last = GM_getValue("lastSync", 0);
    const lastSlot = GM_getValue("lastSyncSlot", "");
    const slot = currentSlot();
    if (!force) {
      const lastTime = last ? new Date(last).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
      const lastWhen = last && ymd(new Date(last)) === todayKey() ? `hoje às ${lastTime}` : lastTime ? `ontem às ${lastTime}` : "";
      if (!slot) {
        show(`🕖 Recreação${lastWhen ? ` sincronizada ${lastWhen}` : ""} · próxima às ${SYNC_SLOTS[0].hour}h`, true);
        return;
      }
      if (lastSlot === slot.key) {
        show(`✅ Recreação sincronizada ${lastWhen} · próxima às ${nextSlotHour()}h`, true);
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
      let stays;
      let source = "";
      try {
        const parsed = parseGuestsCsv(await fetchReportCsv(REPORTS.hospedes));
        // titulares: mesmo relatório só com o hóspede principal (se falhar, segue sem marcar)
        let mainKeys = null;
        try {
          const mains = parseGuestsCsv(await fetchReportCsv(REPORTS.titulares));
          const total = parsed.reduce((n, x) => n + x.guests.length, 0);
          const mainTotal = mains.reduce((n, x) => n + x.guests.length, 0);
          if (mainTotal > 0 && mainTotal < total) {
            mainKeys = new Set(mains.flatMap((x) => x.guests.map((g) => personKey(x.reservation_code, g))));
          }
        } catch (e) {
          console.warn("[Recreação] titulares não identificados", e);
        }
        stays = buildStaysFromInHouse(parsed, mainKeys);
        if (!stays.length) throw new Error("relatório Hóspedes na Casa veio vazio");
      } catch (e) {
        console.warn("[Recreação] Hóspedes na Casa falhou, usando o método antigo", e);
        stays = buildStays(await fetchReport());
        source = " (método antigo)";
      }
      const result = await send(stays);
      runPrevisao(); // em paralelo: não atrasa nem derruba a sincronização dos hóspedes
      GM_setValue("lastSync", Date.now());
      const done = currentSlot();
      if (done) GM_setValue("lastSyncSlot", done.key);
      const t = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      show(`✅ Recreação sincronizada hoje às ${t} · ${result.rooms ?? stays.length} aptos${source} · próxima às ${nextSlotHour()}h`, true);
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
