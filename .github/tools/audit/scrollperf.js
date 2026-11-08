// rolagem de uma tela com 1000 jogos, CPU 4× mais lenta, quadros medidos por rAF
// PG=<tela> (padrão Biblioteca), argv: [modo da Biblioteca] [css extra]
// TRACE=1 soma o tempo por tipo de evento do Blink (Layerize, Paint, Decode…)
// DISTINCT=1 dá a cada jogo sintético uma capa com endereço próprio (sem cache de decodificação)
// REVISIT=1 rola tudo, sai e volta antes de medir
const ROOT = require("path").resolve(__dirname, "../../..");
const { start } = require(ROOT + "/.github/tests/server"); const { chromium } = require(ROOT + "/.github/tests/node_modules/playwright");
const N = 1000, VIEW = process.argv[2] || "shelf", XCSS = process.argv[3] || "";
(async () => {
  const { server, url } = await start(); const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const ctx = await b.newContext({ viewport: { width: 410, height: 887 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6 }); const p = await ctx.newPage();
  await p.route("**/data.js", async route => { const r = await route.fetch(); let body = await r.text();
    body += `;(function(){const base=__PAGES.filter(x=>x.fm&&x.fm.type==="game");for(let i=0;i<${N};i++){const src=base[i%base.length];const path="Games/PC/Sintetico "+i+".md";const fm=Object.assign({},src.fm,{title:"Sintetico "+i});if(${process.env.DISTINCT?1:0}&&typeof fm.cover==="string"&&fm.cover)fm.cover=location.origin+"/vault/"+fm.cover.split("/").map(encodeURIComponent).join("/")+"?i="+i;__PAGES.push({fm,path,page:src.page});__FILES.push(path);}})();`;
    route.fulfill({ response: r, body, headers: { ...r.headers(), "content-type": "application/javascript" } }); });
  await p.addInitScript(v => localStorage.setItem("steamvault:ui:libraryView", v), VIEW);
  await p.goto(url + "?p=Dashboard/Home.md"); await p.waitForFunction(() => window.__ready, null, { timeout: 180000 });
  const cdp = await ctx.newCDPSession(p); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const t0 = Date.now();
  await p.evaluate(x => go(x), process.env.PG || "Dashboard/Biblioteca.md"); await p.waitForFunction(() => document.querySelector(".sv-page"));
  await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  const open = Date.now() - t0;
  await p.evaluate(s => window.__step = s, Number(process.env.STEP || 140)); if (XCSS) await p.addStyleTag({ content: XCSS }); await p.waitForTimeout(1500);
  const view = process.env.PG || "lib"; await p.waitForTimeout(Number(process.env.WAIT || 0));
  if (process.env.REVISIT) { await p.evaluate(async () => { const L = document.querySelector(".sv-layer"); for (let i = 0; i < 200; i++) { L.scrollTop += 300; await new Promise(r => setTimeout(r, 30)); } }); await p.waitForTimeout(8000); await p.evaluate(() => go("Dashboard/Home.md")); await p.waitForTimeout(1000); await p.evaluate(x => go(x), process.env.PG); await p.waitForTimeout(3000); }
  await cdp.send("Performance.enable"); const g = async () => Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map(x => [x.name, x.value])); const m0 = await g();
  if (process.env.TRACE) await cdp.send("Tracing.start", { categories: "devtools.timeline,disabled-by-default-devtools.timeline", transferMode: "ReturnAsStream" });
  const r = await p.evaluate(async () => {
    const L = document.querySelector(".sv-layer"); const frames = []; let last = performance.now();
    for (let i = 0; i < 90; i++) { L.scrollTop += (window.__step || 140); await new Promise(res => requestAnimationFrame(res)); const now = performance.now(); frames.push(now - last); last = now; }
    frames.sort((a, b) => a - b);
    const sum = frames.reduce((a, b) => a + b, 0);
    return { media: Math.round(sum / frames.length), p90: Math.round(frames[Math.floor(frames.length * 0.9)]), pior: Math.round(frames[frames.length - 1]), acima50: frames.filter(f => f > 50).length };
  });
  if (process.env.TRACE) { const done = new Promise(res => cdp.once("Tracing.tracingComplete", async ({ stream }) => { let data = ""; for (;;) { const c = await cdp.send("IO.read", { handle: stream }); data += c.data; if (c.eof) break; } res(JSON.parse(data))})); await cdp.send("Tracing.end"); const tr = await done;
  const agg = {}; for (const e of (tr.traceEvents || tr)) if (e.ph === "X" && e.dur) agg[e.name] = (agg[e.name] || 0) + e.dur; console.log(Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 18).map(([k, v]) => k + " " + Math.round(v / 1000)).join(" | ")); }
  const m1 = await g(); const d = k => Math.round((m1[k] - m0[k]) * 1000); console.log(`  script ${d("ScriptDuration")} · layout ${d("LayoutDuration")} (${m1.LayoutCount - m0.LayoutCount}x) · style ${d("RecalcStyleDuration")} (${m1.RecalcStyleCount - m0.RecalcStyleCount}x) · task ${d("TaskDuration")} · nós ${m1.Nodes}`);
  console.log(`${view}: abrir ${open} ms · quadro médio ${r.media} ms · p90 ${r.p90} ms · pior ${r.pior} ms · quadros > 50 ms: ${r.acima50}/90`);
  await b.close(); server.close();
})();
