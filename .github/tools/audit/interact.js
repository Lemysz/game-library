// Interações com 1000 jogos e CPU 4× mais lenta: quanto tempo cada ação leva
// até o 2º quadro (mediana de R repetições). Cobre busca e filtros da
// Biblioteca, ordenação, troca de modo de exibição, busca global, abertura
// de janelas e troca de abas da ficha e das Estatísticas.
// XCSS="…" injeta CSS extra.
// Uso: R=5 node .github/tools/audit/interact.js [filtro]
const path = require("path");
const ROOT = path.resolve(__dirname, "../../..");
const { start } = require(path.join(ROOT, ".github/tests/server"));
const { chromium } = require(path.join(ROOT, ".github/tests/node_modules/playwright"));
const R = Number(process.env.R || 5), N = Number(process.env.N || 1000), ONLY = process.argv[2] || "";
const frames = "await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))";
// cada ação: [nome, tela, preparo (no navegador), ação medida (no navegador)]
const act = (sel, extra = "") => `const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return -1; ${extra} const t0 = performance.now(); el.click(); ${frames}; return performance.now() - t0;`;
const typ = (sel, val) => `const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return -1; el.value = ""; el.dispatchEvent(new Event("input", { bubbles: true })); await new Promise(r => setTimeout(r, 400)); const t0 = performance.now(); el.value = ${JSON.stringify(val)}; el.dispatchEvent(new Event("input", { bubbles: true })); await new Promise(r => setTimeout(r, 260)); ${frames}; return performance.now() - t0 - 260;`;
const actions = [
  ["Biblioteca: digitar na busca", "Dashboard/Biblioteca.md", typ("[data-lib-q]", "Sintetico 12")],
  ["Biblioteca: busca avançada nota>4", "Dashboard/Biblioteca.md", typ("[data-lib-q]", "nota>4 status:zerado")],
  ["Biblioteca: chip de status", "Dashboard/Biblioteca.md", act("[data-lib-status]:not([data-lib-status='']), .sv-libsum-chips button, [data-lib-chip]")],
  ["Biblioteca: abrir Filtros", "Dashboard/Biblioteca.md", act("[data-lib-filters]")],
  ["Biblioteca: abrir Exibição", "Dashboard/Biblioteca.md", act("[data-lib-display]")],
  ["Busca global: digitar", "Dashboard/Home.md", `const b = document.createElement("button"); b.hidden = true; b.dataset.action = "search-open"; document.querySelector(".sv-app").appendChild(b); b.click(); b.remove(); await new Promise(r => setTimeout(r, 300)); const el = document.querySelector(".sv-search-input"); if (!el) return -1; const t0 = performance.now(); el.value = "sin"; el.dispatchEvent(new Event("input", { bubbles: true })); await new Promise(r => setTimeout(r, 200)); ${frames}; const t = performance.now() - t0 - 200; document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); return t;`],
  ["Ficha: aba Conquistas", "Games/PC/Resident Evil 4.md", act(".sv-gamenav [data-tab]:nth-child(2)")],
  ["Ficha: aba Sessões", "Games/PC/Resident Evil 4.md", act(".sv-gamenav [data-tab]:nth-child(5)")],
  ["Ficha: Editar detalhes", "Games/PC/Resident Evil 4.md", `const b = document.createElement("button"); b.hidden = true; b.dataset.action = "manage"; b.dataset.section = "details"; b.dataset.path = "Games/PC/Resident Evil 4.md"; document.querySelector(".sv-app").appendChild(b); const t0 = performance.now(); b.click(); b.remove(); ${frames}; await new Promise(r => setTimeout(r, 0)); ${frames}; return performance.now() - t0;`],
  ["Estatísticas: aba Tempo", "Dashboard/Estatísticas.md", act(".sv-sttabs button:nth-child(2)")],
  ["Estatísticas: aba Gosto", "Dashboard/Estatísticas.md", act(".sv-sttabs button:nth-child(3)")],
  ["Adicionar jogo (janela)", "Dashboard/Biblioteca.md", `const b = document.createElement("button"); b.hidden = true; b.dataset.action = "add-game"; document.querySelector(".sv-app").appendChild(b); const t0 = performance.now(); b.click(); b.remove(); ${frames}; return performance.now() - t0;`],
  ["Coleção: Adicionar jogos (janela)", "Collections/Favoritos.md", `const b = document.createElement("button"); b.hidden = true; b.dataset.action = "collection-games"; b.dataset.path = "Collections/Favoritos.md"; document.querySelector(".sv-app").appendChild(b); const t0 = performance.now(); b.click(); b.remove(); ${frames}; return performance.now() - t0;`],
].filter(a => !ONLY || a[0].toLowerCase().includes(ONLY.toLowerCase()));
(async () => {
  const { server, url } = await start();
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const ctx = await b.newContext({ viewport: { width: 410, height: 887 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.route("**/data.js", async route => { const r = await route.fetch(); let body = await r.text();
    body += `;(function(){const base=__PAGES.filter(x=>x.fm&&x.fm.type==="game");for(let i=0;i<${N};i++){const src=base[i%base.length];const path="Games/PC/Sintetico "+i+".md";const fm=Object.assign({},src.fm,{title:"Sintetico "+i});__PAGES.push({fm,path,page:src.page});__FILES.push(path);}})();`;
    route.fulfill({ response: r, body, headers: { ...r.headers(), "content-type": "application/javascript" } }); });
  await p.goto(url + "?p=Dashboard/Home.md"); await p.waitForFunction(() => window.__ready, null, { timeout: 180000 });
  const cdp = await ctx.newCDPSession(p); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  if (process.env.XCSS) await p.addStyleTag({ content: process.env.XCSS }); // testar uma ideia de CSS antes de aplicar
  for (const [name, pg, code] of actions) {
    const ts = [];
    for (let k = 0; k < R; k++) {
      await p.keyboard.press("Escape").catch(() => {}); await p.waitForTimeout(150);
      await p.evaluate(x => go(x), pg); await p.waitForTimeout(700);
      ts.push(await p.evaluate(new Function(`return (async () => { ${code} })()`)));
    }
    const s = ts.filter(t => t >= 0).sort((a, b) => a - b);
    console.log(name.padEnd(36), s.length ? `${String(Math.round(s[Math.floor(s.length / 2)])).padStart(5)} ms` : "  não encontrado");
  }
  if (errs.length) console.log("erros:", [...new Set(errs)].slice(0, 4));
  await b.close(); server.close();
})();
