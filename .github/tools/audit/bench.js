// Abertura de telas com repetição: cada tela é aberta R vezes (alternando com
// uma tela leve) e o resultado é a mediana do tempo até o 2º quadro, com
// 1000 jogos e CPU 4× mais lenta. Para comparar duas versões, rode antes e
// depois na mesma máquina.
// XCSS="…" injeta CSS extra (teste de hipótese).
// Uso: R=7 node .github/tools/audit/bench.js [tela1.md tela2.md ...]
const path = require("path");
const ROOT = path.resolve(__dirname, "../../..");
const { start } = require(path.join(ROOT, ".github/tests/server"));
const { chromium } = require(path.join(ROOT, ".github/tests/node_modules/playwright"));
const R = Number(process.env.R || 7), N = Number(process.env.N || 1000);
const pages = process.argv.slice(2).length ? process.argv.slice(2) : ["Dashboard/Biblioteca.md", "Dashboard/Home.md", "Games/PC/Resident Evil 4.md", "Dashboard/Configurações.md", "Dashboard/Tier List.md", "Dashboard/Estatísticas.md", "Dashboard/RetroAchievements.md", "Dashboard/Coleções.md"];
(async () => {
  const { server, url } = await start();
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const ctx = await b.newContext({ viewport: { width: 410, height: 887 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  if (process.env.LANG_EN) await ctx.addInitScript(() => { try { localStorage.setItem("steamvault:ui:lang", "en"); } catch (_) {} }); // LANG_EN=1 mede em inglês
  const p = await ctx.newPage();
  await p.route("**/data.js", async route => { const r = await route.fetch(); let body = await r.text();
    body += `;(function(){const base=__PAGES.filter(x=>x.fm&&x.fm.type==="game");for(let i=0;i<${N};i++){const src=base[i%base.length];const path="Games/PC/Sintetico "+i+".md";const fm=Object.assign({},src.fm,{title:"Sintetico "+i});__PAGES.push({fm,path,page:src.page});__FILES.push(path);}})();`;
    route.fulfill({ response: r, body, headers: { ...r.headers(), "content-type": "application/javascript" } }); });
  await p.goto(url + "?p=Dashboard/Home.md"); await p.waitForFunction(() => window.__ready, null, { timeout: 180000 });
  const cdp = await ctx.newCDPSession(p); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  if (process.env.XCSS) await p.addStyleTag({ content: process.env.XCSS }); // CSS extra para testar uma ideia antes de aplicar
  const res = Object.fromEntries(pages.map(pg => [pg, []]));
  for (let k = 0; k < R; k++) for (const pg of pages) {
    await p.evaluate(() => go("Dashboard/Steam.md")); await p.waitForTimeout(250);
    const t = await p.evaluate(async pg => { const t0 = performance.now(); await go(pg); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return performance.now() - t0; }, pg);
    res[pg].push(t);
    await p.waitForTimeout(400);
  }
  const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  for (const pg of pages) console.log(pg.replace(/^.*\//, "").replace(".md", "").padEnd(26), String(Math.round(med(res[pg]))).padStart(5), "ms  (min", Math.round(Math.min(...res[pg])) + ")");
  await b.close(); server.close();
})();
