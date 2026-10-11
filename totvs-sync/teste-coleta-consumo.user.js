// ==UserScript==
// @name         TESTE – Coleta de consumo do TOTVS (não envia nada)
// @namespace    https://github.com/hfsb25-ui/recreacaoclaude
// @version      0.1.0
// @description  Só para testar: gera o relatório "Saldo das Contas" de hoje, exporta em CSV e mostra o resultado na tela. Não envia dados para lugar nenhum.
// @match        https://gestaopms.totvshospitalidade.com/*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      ebs.totvshospitalidade.com
// ==/UserScript==

(function () {
  "use strict";

  const REPORT_BASE = "https://ebs.totvshospitalidade.com/report";
  const page = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
  const PMS_HOST = /totvshospitalidade\.com/i;
  let authHeaders = null;

  const remember = (url, headers) => {
    if (!url || !PMS_HOST.test(url) || !headers) return;
    const found = {};
    for (const [k, v] of Object.entries(headers)) {
      if (/^authorization$/i.test(k) && v) found[k] = v;
    }
    if (Object.keys(found).length) authHeaders = found;
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


  // Mostra cada etapa na tela
  let logLines = [];
  const log = (msg) => {
    logLines.push(msg);
    console.log("[Teste consumo]", msg);
    render();
  };

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

    log(`1) Login encontrado (${reportAuth ? "do relatório" : "do PMS"}). Abrindo o relatório de hoje…`);
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
    log("2) Relatório aberto. Gerando o documento…");
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
    log("3) Documento em geração, aguardando ficar pronto…");

    for (let i = 0, first = true; ; i++, first = false) {
      if (i > 60) throw new Error("o relatório demorou demais para ficar pronto");
      const st = await dx("getBuildStatus", { documentId, isFirstRequest: first, timeOut: 5000 });
      if (st && (st.completed || st.progress >= 100)) break;
      await sleep(1000);
    }

    log("4) Documento pronto. Exportando em CSV…");
    // 3) exporta em CSV (primeiro do jeito direto; se o servidor exigir, do jeito assíncrono)
    const exportArg = { documentId, exportOptions: null, format: "csv", inlineResult: true, editingFieldValues: [] };
    const looksLikeCsv = (t) => /Saldo das Contas|C[óo]d\. Reserva/.test(t);
    try {
      const text = decode(await dx("exportTo", exportArg, true));
      if (looksLikeCsv(text)) {
        log("5) CSV recebido (exportação direta).");
        return text;
      }
      log("   Exportação direta não veio em CSV, tentando o outro modo…");
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
    log("5) CSV recebido (exportação assíncrona).");
    return text;
  };


  const brl = (v) => (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const consumo = (a) =>
    ["restaurante", "bares", "banquete", "eventos", "lavanderia", "telefonia", "diversos", "taxas", "iss"]
      .reduce((s, k) => s + Math.max(-(a[k] || 0), 0), 0);

  let result = null;
  let running = false;
  const runTest = async () => {
    if (running) return;
    running = true;
    logLines = [];
    result = null;
    const t0 = Date.now();
    try {
      const csv = await fetchConsumptionCsv();
      const parsed = parseConsumptionCsv(csv);
      result = parsed;
      log(`6) Leitura concluída em ${((Date.now() - t0) / 1000).toFixed(1)}s: ${parsed.accounts.length} contas lidas` +
        (parsed.skipped ? `, ${parsed.skipped} blocos não reconhecidos` : "") +
        ` · data do relatório: ${parsed.reportDate || "?"}`);
    } catch (e) {
      log(`❌ Erro: ${e.message}`);
    } finally {
      running = false;
      render();
    }
  };

  // ---------- Painel na tela ----------
  let panel, btn;
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const render = () => {
    if (!document.body) return;
    if (!btn) {
      btn = document.createElement("button");
      btn.textContent = "🧪 Testar coleta de consumo";
      btn.style.cssText = "position:fixed;left:12px;bottom:12px;z-index:2147483647;font:13px system-ui,sans-serif;" +
        "padding:8px 12px;border-radius:8px;border:1px solid #1d4ed8;background:#eff6ff;color:#1e3a8a;cursor:pointer";
      btn.addEventListener("click", () => {
        panel.style.display = "block";
        runTest();
      });
      document.body.appendChild(btn);
      panel = document.createElement("div");
      panel.style.cssText = "display:none;position:fixed;left:12px;bottom:56px;z-index:2147483647;width:min(560px,90vw);" +
        "max-height:70vh;overflow:auto;background:#fff;color:#111;border:1px solid #cbd5e1;border-radius:10px;" +
        "box-shadow:0 8px 24px rgba(0,0,0,.2);font:12px/1.4 system-ui,sans-serif;padding:12px";
      document.body.appendChild(panel);
    }
    btn.disabled = running;
    btn.textContent = running ? "⏳ Coletando…" : "🧪 Testar coleta de consumo";
    let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <b>Teste da coleta de consumo</b>
      <button id="rs-close" style="border:0;background:none;font-size:16px;cursor:pointer">✕</button></div>
      <div style="color:#475569;margin-bottom:8px">Nada é enviado: os dados ficam só nesta tela.</div>`;
    html += logLines.map((l) => `<div>${esc(l)}</div>`).join("");
    if (result && result.accounts.length) {
      const totalConsumo = result.accounts.reduce((s, a) => s + consumo(a), 0);
      const types = {};
      result.accounts.forEach((a) => (types[a.account_type || "?"] = (types[a.account_type || "?"] || 0) + 1));
      html += `<div style="margin-top:8px">Tipos de conta: ${esc(Object.entries(types).map(([k, v]) => `${k}: ${v}`).join(" · "))}</div>`;
      html += `<div>Soma do consumo (sem diária) de todas as contas: <b>R$ ${brl(totalConsumo)}</b></div>`;
      html += `<div style="margin-top:8px">Confira alguns aptos com o relatório na tela do TOTVS:</div>
        <table style="border-collapse:collapse;width:100%;margin-top:4px">
        <tr style="text-align:left;border-bottom:1px solid #e2e8f0"><th>Apto</th><th>Reserva</th><th>Tipo</th>
        <th style="text-align:right">Restaurante</th><th style="text-align:right">Bares</th><th style="text-align:right">Consumo</th></tr>`;
      for (const a of result.accounts.slice(0, 15)) {
        html += `<tr style="border-bottom:1px solid #f1f5f9"><td>${esc(a.uh)}</td><td>${esc(a.reservation_code)}</td><td>${esc(a.account_type || "")}</td>
          <td style="text-align:right">${brl(-a.restaurante)}</td><td style="text-align:right">${brl(-a.bares)}</td>
          <td style="text-align:right"><b>${brl(consumo(a))}</b></td></tr>`;
      }
      html += "</table>";
      if (result.accounts.length > 15) html += `<div style="color:#475569">… e mais ${result.accounts.length - 15} contas.</div>`;
    }
    panel.innerHTML = html;
    const close = panel.querySelector("#rs-close");
    if (close) close.onclick = () => (panel.style.display = "none");
  };

  const start = () => render();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
