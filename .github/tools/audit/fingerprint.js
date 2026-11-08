// impressão digital dos estilos calculados (elemento + ::before + ::after) de todas as telas
// node fingerprint.js <saida.json>   |   node fingerprint.js --diff a.json b.json
// ONLY=<trecho da chave> limita as telas; DETAIL=1 guarda os valores (para ver o que mudou)
const ROOT = require("path").resolve(__dirname, "../../..");
const fs = require("fs");
if (process.argv[2] === "--diff") {
  const A = JSON.parse(fs.readFileSync(process.argv[3])), B = JSON.parse(fs.readFileSync(process.argv[4]));
  let total = 0; const bad = [];
  for (const k of Object.keys(A)) {
    const a = A[k], b = B[k];
    if (!b) { console.log("falta", k); continue; }
    if (a.length !== b.length) { console.log(k, "nº de elementos diferente", a.length, b.length); bad.push(k); continue; }
    let n = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i].s === b[i].s) continue;
      n++; total++;
      if (n <= 4) {
        let d = [];
        if (a[i].s.includes("\u0001")) { const pa = a[i].s.split("\u0001"), pb = b[i].s.split("\u0001"); d = pa.map((x, j) => x !== pb[j] ? `${x.slice(0, 90)} → ${String(pb[j]).slice(0, 90)}` : null).filter(Boolean).slice(0, 6); }
        console.log(k, a[i].p, d.length ? "\n    " + d.join("\n    ") : "");
      }
    }
    if (n) { console.log(k, "→", n, "elementos diferentes"); bad.push(k); }
  }
  console.log(total ? `TOTAL: ${total} diferenças em ${bad.length} telas` : "IDÊNTICO");
  process.exit(0);
}
const { start } = require(ROOT + "/.github/tests/server"); const { chromium } = require(ROOT + "/.github/tests/node_modules/playwright");
const ONLY = process.env.ONLY, DETAIL = !!process.env.DETAIL;
const pages = fs.readdirSync(ROOT + "/Dashboard").filter(f => f.endsWith(".md")).map(f => "Dashboard/" + f).concat(["Games/PC/Resident Evil 4.md", "Games/PC/Dying Light.md"]);
const views = ["grid", "compact", "shelf", "list"];
(async () => {
  const { server, url } = await start(); const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const out = {};
  for (const [W, H, mob] of [[410, 887, true], [1300, 850, false], [800, 1000, true]]) {
    const jobs = pages.map(x => [x, null]).concat(views.map(v => ["Dashboard/Biblioteca.md", v])).filter(([pg, view]) => !ONLY || `${W} ${pg}${view ? " " + view : ""}`.includes(ONLY));
    if (!jobs.length) continue;
    const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: mob, hasTouch: mob, reducedMotion: "reduce" }); const p = await ctx.newPage(); await p.addInitScript(() => { let s = 42; Math.random = () => ((s = Math.imul(s, 1664525) + 1013904223 >>> 0) / 4294967296); });
    await p.goto(url + "?p=Dashboard/Home.md"); await p.waitForFunction(() => window.__ready);
    for (const [pg, view] of jobs) {
      if (view) await p.evaluate(v => localStorage.setItem("steamvault:ui:lib:library", JSON.stringify({ view: v })), view);
      await p.evaluate(x => go(x), pg); await p.waitForTimeout(900);
      await p.evaluate(() => { document.querySelectorAll(".sv-reveal").forEach(e => e.classList.remove("sv-reveal")); document.getAnimations().forEach(a => { try { a.finish(); } catch (_) {} }); });
      await p.waitForTimeout(100);
      out[`${W} ${pg}${view ? " " + view : ""}`] = await p.evaluate(DET => {
        const ser = cs => { const o = []; for (let i = 0; i < cs.length; i++) { const k = cs[i]; if (k.startsWith("animation") || k.startsWith("transition")) continue; o.push(k + ":" + cs.getPropertyValue(k)); } return o.sort().join("\u0001") + "\u0001"; };
        const h = str => { let x = 2166136261; for (let i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0).toString(36); };
        const root = document.querySelector(".sv-host") || document.body;
        const els = [root, ...root.querySelectorAll("*")];
        return els.map(el => { const s = ser(getComputedStyle(el)) + "|" + ser(getComputedStyle(el, "::before")) + "|" + ser(getComputedStyle(el, "::after")); return { p: (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".") : el.tagName), s: DET ? s : h(s) }; });
      }, DETAIL);
    }
    await ctx.close();
  }
  fs.writeFileSync(process.argv[2], JSON.stringify(out));
  console.log("telas:", Object.keys(out).length, "elementos:", Object.values(out).reduce((s, a) => s + a.length, 0));
  await b.close(); server.close();
})();
