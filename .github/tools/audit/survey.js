// todas as telas: tempo de abertura (render JS + 2 quadros) e rolagem, 1000 jogos, CPU 4×, celular
const ROOT = require("path").resolve(__dirname, "../../..");
const { start } = require(ROOT + "/.github/tests/server"); const { chromium } = require(ROOT + "/.github/tests/node_modules/playwright");
const fs = require("fs");
const N = Number(process.env.N || 1000), ONLY = process.argv[2];
const pages = fs.readdirSync(ROOT + "/Dashboard").filter(f => f.endsWith(".md")).map(f => "Dashboard/" + f).concat(["Games/PC/Resident Evil 4.md"]);
(async () => {
  const { server, url } = await start(); const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const ctx = await b.newContext({ viewport: { width: 410, height: 887 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }); const p = await ctx.newPage();
  const errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.route("**/data.js", async route => { const r = await route.fetch(); let body = await r.text();
    body += `;(function(){const base=__PAGES.filter(x=>x.fm&&x.fm.type==="game");for(let i=0;i<${N};i++){const src=base[i%base.length];const path="Games/PC/Sintetico "+i+".md";const fm=Object.assign({},src.fm,{title:"Sintetico "+i});__PAGES.push({fm,path,page:src.page});__FILES.push(path);}})();`;
    route.fulfill({ response: r, body, headers: { ...r.headers(), "content-type": "application/javascript" } }); });
  await p.goto(url + "?p=Dashboard/Home.md"); await p.waitForFunction(() => window.__ready, null, { timeout: 180000 });
  const cdp = await ctx.newCDPSession(p); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 }); await cdp.send("Performance.enable");
  const g = async () => Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map(x => [x.name, x.value]));
  const rows = [];
  for (const pg of pages.filter(x => !ONLY || x.includes(ONLY))) {
    await p.evaluate(() => go("Dashboard/Ícones.md")).catch(() => {}); await p.waitForTimeout(300);
    const m0 = await g(); const t0 = Date.now(); if (process.env.XCSS) await p.addStyleTag({ content: process.env.XCSS });
    await p.evaluate(x => go(x), pg);
    await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const open = Date.now() - t0; const m1 = await g();
    await p.waitForTimeout(Number(process.env.WAIT || 1200));
    const sc = await p.evaluate(async () => {
      const L = document.querySelector(".sv-layer"); if (!L) return null; const frames = []; let last = performance.now();
      for (let i = 0; i < 40; i++) { L.scrollTop += 60; await new Promise(res => requestAnimationFrame(res)); const now = performance.now(); frames.push(now - last); last = now; }
      frames.sort((a, b) => a - b); return { med: Math.round(frames.reduce((a, b) => a + b, 0) / frames.length), p90: Math.round(frames[36]), nodes: document.querySelectorAll("*").length };
    });
    const d = k => Math.round((m1[k] - m0[k]) * 1000);
    rows.push([pg.replace("Dashboard/", "").replace(".md", "").padEnd(26), String(open).padStart(6), String(d("ScriptDuration")).padStart(6), String(d("RecalcStyleDuration")).padStart(6), String(d("LayoutDuration")).padStart(6), String(sc?.med ?? "-").padStart(5), String(sc?.p90 ?? "-").padStart(5), String(sc?.nodes ?? "-").padStart(7)].join(" "));
    console.log(rows[rows.length - 1]);
  }
  if (process.env.TIERCHK) { await p.evaluate(() => go("Dashboard/Tier List.md")); await p.waitForTimeout(6000); console.log("capas na faixa:", await p.evaluate(() => document.querySelectorAll(".sv-tier-zone--pool > .sv-tiletier").length), "contador:", await p.evaluate(() => document.querySelector(".sv-block .sv-sechead, .sv-block")?.textContent.match(/\d+/)?.[0])); }
  console.log("tela                        abrir script estilo layout rolar   p90     nós");
  if (errs.length) console.log("erros:", errs.slice(0, 5));
  await b.close(); server.close();
})();
