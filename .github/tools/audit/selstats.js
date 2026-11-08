// seletores mais caros ao abrir uma tela (trace "SelectorStats" do Blink)
const ROOT = require("path").resolve(__dirname, "../../..");
const { start } = require(ROOT + "/.github/tests/server"); const { chromium } = require(ROOT + "/.github/tests/node_modules/playwright");
const fs = require("fs");
const N = Number(process.env.N || 1000), PG = process.argv[2] || "Dashboard/Tier List.md", OUT = process.argv[3] || require("os").tmpdir() + "/trace.json";
(async () => {
  const { server, url } = await start(); const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const ctx = await b.newContext({ viewport: { width: 410, height: 887 }, isMobile: true, hasTouch: true }); const p = await ctx.newPage();
  await p.route("**/data.js", async route => { const r = await route.fetch(); let body = await r.text();
    body += `;(function(){const base=__PAGES.filter(x=>x.fm&&x.fm.type==="game");for(let i=0;i<${N};i++){const src=base[i%base.length];const path="Games/PC/Sintetico "+i+".md";const fm=Object.assign({},src.fm,{title:"Sintetico "+i});__PAGES.push({fm,path,page:src.page});__FILES.push(path);}})();`;
    route.fulfill({ response: r, body, headers: { ...r.headers(), "content-type": "application/javascript" } }); });
  await p.goto(url + "?p=Dashboard/Home.md"); await p.waitForFunction(() => window.__ready, null, { timeout: 180000 });
  await b.startTracing(p, { path: OUT, categories: ["disabled-by-default-blink.debug", "devtools.timeline", "blink"] });
  await p.evaluate(x => go(x), PG);
  await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await p.waitForTimeout(500);
  await b.stopTracing();
  const tr = JSON.parse(fs.readFileSync(OUT, "utf8")); const evs = tr.traceEvents || tr;
  const agg = new Map();
  for (const e of evs) {
    const st = e.args?.selector_stats?.selector_timings; if (!st) continue;
    for (const s of st) { const a = agg.get(s.selector) || { t: 0, match: 0, att: 0, fast: 0 }; a.t += s["elapsed (us)"]; a.match += s.match_count; a.att += s.match_attempts; a.fast += s.fast_reject_count; agg.set(s.selector, a); }
  }
  const list = [...agg.entries()].sort((a, b) => b[1].t - a[1].t);
  const tot = list.reduce((s, [, a]) => s + a.t, 0);
  console.log("total seletores (us):", Math.round(tot), "· seletores:", list.length);
  for (const [sel, a] of list.slice(0, Number(process.env.TOP || 30))) console.log(String(Math.round(a.t)).padStart(8), String(a.att).padStart(8), String(a.match).padStart(7), sel.slice(0, 170));
  await b.close(); server.close();
})();
