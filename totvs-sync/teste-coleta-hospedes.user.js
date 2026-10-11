// ==UserScript==
// @name         TESTE – Coleta de hóspedes na casa do TOTVS (não envia nada)
// @namespace    https://github.com/hfsb25-ui/recreacaoclaude
// @version      0.1.0
// @description  Só para testar: aprende o relatório "Hóspedes na Casa" quando você o abre, gera de novo sozinho, exporta em CSV e mostra o resultado na tela. Não envia dados para lugar nenhum.
// @match        https://gestaopms.totvshospitalidade.com/*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @connect      ebs.totvshospitalidade.com
// ==/UserScript==

(function () {
  "use strict";

  const page = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
  const PMS_HOST = /totvshospitalidade\.com/i;
  const CONFIG_KEY = "guestsReportConfig";
  let REPORT_BASE = "https://ebs.totvshospitalidade.com/report";
  let authHeaders = null;

  const remember = (url, headers) => {
    if (!url || !PMS_HOST.test(url) || !headers) return;
    const found = {};
    for (const [k, v] of Object.entries(headers)) {
      if (/^authorization$/i.test(k) && v) found[k] = v;
    }
    if (Object.keys(found).length) authHeaders = found;
  };

  // Diagnóstico: guarda quais pedidos do PMS devolveram um login (JWT), para descobrir de onde vem o login do relatório
  const JWT_RE = /eyJ[\w-]+\.eyJ[\w-]+\.[\w-]+/g;
  const tokenSources = []; // { method, url, body, tokens:Set }
  const maskBody = (b) => {
    if (b == null) return "";
    let t = typeof b === "string" ? b : (() => { try { return JSON.stringify(b); } catch (e) { return String(b); } })();
    return t.replace(JWT_RE, "<login>").slice(0, 400);
  };
  const recordResponse = (method, url, body, text) => {
    if (!text || typeof text !== "string") return;
    const found = text.match(JWT_RE);
    if (!found) return;
    tokenSources.push({ method: method || "GET", url: String(url), body: maskBody(body), tokens: new Set(found) });
    if (tokenSources.length > 50) tokenSources.shift();
  };

  const XHR = page.XMLHttpRequest.prototype;
  const origOpen = XHR.open;
  const origSet = XHR.setRequestHeader;
  const origSend = XHR.send;
  XHR.open = function (method, url) {
    this.__rsUrl = url;
    this.__rsMethod = method;
    this.__rsHeaders = {};
    return origOpen.apply(this, arguments);
  };
  XHR.setRequestHeader = function (k, v) {
    if (this.__rsHeaders) this.__rsHeaders[k] = v;
    return origSet.apply(this, arguments);
  };
  XHR.send = function (body) {
    try {
      remember(String(this.__rsUrl), this.__rsHeaders);
      const xhr = this;
      this.addEventListener("load", () => {
        try {
          const t = xhr.responseType === "" || xhr.responseType === "text" ? xhr.responseText
            : xhr.responseType === "json" ? JSON.stringify(xhr.response) : null;
          recordResponse(xhr.__rsMethod, xhr.__rsUrl, body, t);
        } catch (e) {}
      });
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
    const p = origFetch.apply(this, arguments);
    try {
      const url = typeof input === "string" ? input : input && input.url;
      const method = (init && init.method) || (input && input.method) || "GET";
      const body = init && init.body;
      p.then((res) => {
        try {
          res.clone().text().then((t) => recordResponse(method, url, body, t)).catch(() => {});
        } catch (e) {}
      }).catch(() => {});
    } catch (e) {}
    return p;
  };

  // Login dos relatórios: o PMS abre os relatórios com "?auth=..." no endereço
  // ---------- Aprende o relatório quando o PMS o abre ----------
  // Guarda: endereço da página, campos do formulário (sem o login) e o pedido que gera o login do relatório
  let config = GM_getValue(CONFIG_KEY, null);
  let learnedNow = false;
  const learnFromForm = (form) => {
    try {
      const u = new URL(String(form.action), page.location.href);
      if (!/ebs\.totvshospitalidade\.com$/i.test(u.hostname)) return;
      const auth = u.searchParams.get("auth");
      if (!auth) return;
      if (/AccountBalanceOnDate/i.test(u.pathname)) return; // esse é o do consumo
      const fields = [];
      for (const el of Array.from(form.elements || [])) {
        if (!el.name || /^auth$/i.test(el.name)) continue;
        fields.push([el.name, el.value == null ? "" : String(el.value)]);
      }
      const src = [...tokenSources].reverse().find((t) => t.tokens.has(auth));
      config = {
        name: u.pathname.split("/").pop(),
        pageUrl: u.origin + u.pathname,
        fields,
        filtersUrl: src ? src.url.replace(JWT_RE, "") : null,
        filtersMethod: src ? src.method : null,
        learnedAt: new Date().toISOString(),
      };
      GM_setValue(CONFIG_KEY, config);
      learnedNow = true;
      try { render(); } catch (e) {}
    } catch (e) {}
  };
  try {
    const FormProto = page.HTMLFormElement.prototype;
    const origSubmit = FormProto.submit;
    FormProto.submit = function () {
      learnFromForm(this);
      return origSubmit.apply(this, arguments);
    };
    page.document.addEventListener("submit", (ev) => ev.target && learnFromForm(ev.target), true);
  } catch (e) {}

  // ---------- Leitura do CSV do "Hóspedes na Casa" ----------
  const DATE_BR = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const RES_CODE = /^[A-Z0-9]{4,}-\d{3,}$/i;
  const brToIso = (c) => {
    const m = String(c).match(DATE_BR);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
  };
  const looksUh = (c) => /^[A-Z]{0,2}\d{1,4}[A-Z]?$/i.test(c);
  const unparsedShapes = [];
  const shapeOf = (cells) =>
    cells.map((c) =>
      RES_CODE.test(c) ? "RESERVA" : DATE_BR.test(c) ? "DATA" : /^\d{1,3}$/.test(c) ? `N:${c}` :
      /@/.test(c) ? "EMAIL" : /^\+?\d[\d\s()-]{7,}$/.test(c) ? "TELEFONE" : c.length <= 14 && !/\s/.test(c) ? `"${c}"` : `texto(${c.length})`
    ).join(" | ");

  const parseGuestsCsv = (text) => {
    const lines = String(text).split(/\r?\n/);
    const sep = (lines.find((l) => /Reserva/.test(l)) || "").includes(";") ? ";" : ",";
    const cellsOf = (l) => l.split(sep).map((c) => c.replace(/^"|"$/g, "").trim()).filter(Boolean);
    const stays = [];
    let cur = null;
    unparsedShapes.length = 0;
    for (const line of lines) {
      const cells = cellsOf(line);
      if (!cells.length) continue;
      const resIdx = cells.findIndex((c) => RES_CODE.test(c));
      // Cabeçalho da reserva: tem o código da reserva
      if (resIdx >= 0) {
        const uhLabel = cells.findIndex((c) => /^C[óo]d\.?\s*UH$/i.test(c));
        let uh = uhLabel >= 0 ? cells[uhLabel + 1] : null;
        if (!uh || !looksUh(uh)) uh = cells.slice(resIdx + 1).find(looksUh) || null;
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
        cur.guests.push({
          surname: nameCells[0] || "",
          name: nameCells.slice(1).join(" "),
          guest_type: typeIdx >= 0 ? cells[typeIdx] : null,
          age: parseInt(cells[bIdx + 1], 10),
          arrival_date: brToIso(dates[1] || ""),
          departure_date: brToIso(dates[2] || ""),
        });
        continue;
      }
      // Outras linhas com conteúdo: guarda só o formato, para diagnóstico
      if (!/HOTEL|H[óo]spedes na Casa|P[áa]gina/i.test(line) && unparsedShapes.length < 15) unparsedShapes.push(shapeOf(cells));
    }
    return stays;
  };

  // Mostra cada etapa na tela
  let logLines = [];
  const log = (msg) => {
    logLines.push(msg);
    console.log("[Teste hóspedes]", msg);
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

  const fetchGuestsCsv = async () => {
    if (!config) throw new Error("abra o relatório \"Hóspedes na Casa\" uma vez pelo menu do PMS para eu aprender");
    if (!authHeaders) throw new Error("aguarde o PMS carregar (ainda sem o login geral)");
    if (!config.filtersUrl) throw new Error("não descobri o pedido de login desse relatório; abra o relatório de novo");

    REPORT_BASE = config.pageUrl.replace(/\/[^/]+$/, "");
    // 1) login novo do relatório, como o PMS faz
    const r0 = await gmRequest({ method: config.filtersMethod || "GET", url: config.filtersUrl, headers: { Accept: "application/json", ...authHeaders } });
    const tokens = [...new Set((r0.responseText || "").match(JWT_RE) || [])];
    log(`1) Pedido de login do relatório → ${r0.status}, ${tokens.length} login(s)`);
    if (!tokens.length) throw new Error("o TOTVS não devolveu o login do relatório");

    // 2) abre o relatório com os mesmos filtros que você usou
    const body = config.fields.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
    let page1 = null;
    for (const t of tokens) {
      const r = await gmRequest({
        method: "POST",
        url: `${config.pageUrl}?auth=${encodeURIComponent(t)}`,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        data: body,
      });
      log(`2) Abrindo o relatório → ${r.status}`);
      if (r.status >= 200 && r.status < 300 && /reportId/i.test(r.responseText || "")) {
        page1 = r;
        break;
      }
    }
    if (!page1) throw new Error("o relatório não aceitou o login");
    const html = page1.responseText || "";
    const m = html.match(/["']?reportId["']?\s*[:=]\s*["']([^"']+)["']/i);
    if (!m) throw new Error("não achei o código do relatório");
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
    log("3) Documento em geração…");
    for (let i = 0, first = true; ; i++, first = false) {
      if (i > 90) throw new Error("o relatório demorou demais");
      const st = await dx("getBuildStatus", { documentId, isFirstRequest: first, timeOut: 5000 });
      if (st && (st.completed || st.progress >= 100)) break;
      await sleep(1000);
    }

    // 4) exporta em CSV
    log("4) Documento pronto. Exportando em CSV…");
    const exportArg = { documentId, exportOptions: null, format: "csv", inlineResult: true, editingFieldValues: [] };
    const looksLikeCsv = (t) => /Reserva/.test(t);
    try {
      const text = decode(await dx("exportTo", exportArg, true));
      if (looksLikeCsv(text)) return text;
    } catch (e) {}
    const opId = await dx("startExport", exportArg);
    const id = typeof opId === "string" ? opId : opId && (opId.id || opId.operationId);
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

  let result = null;
  let running = false;
  const runTest = async () => {
    if (running) return;
    running = true;
    logLines = [];
    result = null;
    const t0 = Date.now();
    try {
      const csv = await fetchGuestsCsv();
      const stays = parseGuestsCsv(csv);
      result = stays;
      const guests = stays.reduce((s, x) => s + x.guests.length, 0);
      log(`5) Leitura concluída em ${((Date.now() - t0) / 1000).toFixed(1)}s: ${stays.length} reservas/aptos, ${guests} hóspedes`);
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
      btn.style.cssText = "position:fixed;left:12px;bottom:56px;z-index:2147483647;font:13px system-ui,sans-serif;" +
        "padding:8px 12px;border-radius:8px;border:1px solid #15803d;background:#f0fdf4;color:#14532d;cursor:pointer";
      btn.addEventListener("click", () => {
        panel.style.display = "block";
        runTest();
      });
      document.body.appendChild(btn);
      panel = document.createElement("div");
      panel.style.cssText = "display:none;position:fixed;left:12px;bottom:100px;z-index:2147483647;width:min(640px,92vw);" +
        "max-height:70vh;overflow:auto;background:#fff;color:#111;border:1px solid #cbd5e1;border-radius:10px;" +
        "box-shadow:0 8px 24px rgba(0,0,0,.2);font:12px/1.4 system-ui,sans-serif;padding:12px";
      document.body.appendChild(panel);
    }
    btn.disabled = running;
    btn.textContent = running ? "⏳ Coletando hóspedes…" : "🧪 Testar coleta de hóspedes na casa";
    let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <b>Teste da coleta de hóspedes na casa</b>
      <button id="rs-close2" style="border:0;background:none;font-size:16px;cursor:pointer">✕</button></div>
      <div style="color:#475569;margin-bottom:8px">Nada é enviado: os dados ficam só nesta tela.</div>`;
    if (config) {
      html += `<div style="margin:6px 0;padding:6px;background:#f1f5f9;border-radius:6px">` +
        `<b>${learnedNow ? "Relatório aprendido agora" : "Relatório guardado"}:</b> ${esc(config.name)}<br>` +
        `<span style="font-family:monospace;font-size:11px;word-break:break-all">página: ${esc(config.pageUrl)}<br>` +
        `login: ${esc(config.filtersMethod || "?")} ${esc(config.filtersUrl || "não descoberto")}<br>` +
        `filtros: ${esc(config.fields.map(([k, v]) => `${k}=${v}`).join("&") || "(nenhum)")}</span></div>`;
    } else {
      html += `<div style="margin:6px 0">Ainda não aprendi o relatório. Abra o <b>Hóspedes na Casa</b> pelo menu do PMS uma vez.</div>`;
    }
    html += logLines.map((l) => `<div>${esc(l)}</div>`).join("");
    if (result && result.length) {
      const all = result.flatMap((s) => s.guests);
      const band = (a) => (a <= 3 ? "0–3" : a <= 7 ? "4–7" : a <= 12 ? "8–12" : a <= 17 ? "13–17" : "18+");
      const bands = {};
      all.forEach((g) => (bands[band(g.age)] = (bands[band(g.age)] || 0) + 1));
      const noGuests = result.filter((s) => !s.guests.length).length;
      const noUh = result.filter((s) => !s.uh).length;
      const mismatch = result.filter((s) => s.composition.length && s.composition.reduce((a, b) => a + b, 0) !== s.guests.length).length;
      html += `<div style="margin-top:8px">Idades: ${esc(["0–3", "4–7", "8–12", "13–17", "18+"].map((k) => `${k}: ${bands[k] || 0}`).join(" · "))}</div>`;
      html += `<div>Menores de 12 anos: <b>${all.filter((g) => g.age < 12).length}</b> · 12 anos ou mais: <b>${all.filter((g) => g.age >= 12).length}</b></div>`;
      html += `<div>Reservas sem hóspede listado: ${noGuests} · sem apto reconhecido: ${noUh} · AD/C1/C2/C3 diferente do nº de hóspedes: ${mismatch}</div>`;
      html += `<div style="margin-top:8px">Confira alguns aptos com o relatório na tela:</div>
        <table style="border-collapse:collapse;width:100%;margin-top:4px">
        <tr style="text-align:left;border-bottom:1px solid #e2e8f0"><th>Apto</th><th>Reserva</th><th>AD/C1/C2/C3</th><th>Hóspedes (idade)</th><th>Saída</th></tr>`;
      for (const s of result.slice(0, 12)) {
        const dep = s.guests.map((g) => g.departure_date).filter(Boolean).sort().pop() || "";
        html += `<tr style="border-bottom:1px solid #f1f5f9;vertical-align:top"><td>${esc(s.uh || "?")}</td><td>${esc(s.reservation_code)}</td>` +
          `<td>${esc(s.composition.join("/"))}</td>` +
          `<td>${s.guests.map((g) => `${esc(g.name)} ${esc(g.surname)} (${g.age})`).join("<br>")}</td><td>${esc(dep)}</td></tr>`;
      }
      html += "</table>";
      if (result.length > 12) html += `<div style="color:#475569">… e mais ${result.length - 12} reservas.</div>`;
    }
    if (unparsedShapes.length) {
      html += `<div style="margin-top:8px"><b>Linhas não reconhecidas (só o formato):</b></div>` +
        unparsedShapes.map((sh) => `<div style="font-family:monospace;font-size:11px">${esc(sh)}</div>`).join("");
    }
    panel.innerHTML = html;
    const close = panel.querySelector("#rs-close2");
    if (close) close.onclick = () => (panel.style.display = "none");
  };

  setInterval(() => {
    if (learnedNow && panel && panel.style.display !== "block") {
      panel.style.display = "block";
      render();
    }
  }, 1500);
  const start = () => render();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
