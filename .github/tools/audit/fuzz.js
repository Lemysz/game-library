// Robustez: injeta jogos com frontmatter malformado (como sai de uma edição à
// mão) e abre todas as telas e a ficha deles, registrando erros de script.
// Uso: node .github/tools/audit/fuzz.js [largura]
const path = require("path"), fs = require("fs");
const ROOT = path.resolve(__dirname, "../../..");
const { start } = require(path.join(ROOT, ".github/tests/server"));
const { chromium } = require(path.join(ROOT, ".github/tests/node_modules/playwright"));
const W = Number(process.argv[2] || 410);
const weird = [
  { title: "Fuzz texto", genre: "RPG", subgenre: "Souls-like", labels: "x", rating: "4,5", hoursPlayed: "10,5", releaseYear: "abc", releaseDate: "2023", status: "Playing", sessions: "ontem", playthroughs: "uma", dlc: "foo", notes: { a: 1 }, screenshots: "x", soundtrack: 5, tags: null, achievementsTotal: "x", achievementsEarned: "y" },
  { title: 12345, platform: null, status: "playing", rating: 9, favorite: "sim", genre: [null, 3, "Ação"], sessions: [null, { date: "x", hours: "a" }, "texto", { date: "2024-02-30", hours: 2 }], playthroughs: [null, {}, { start: 5 }], dlc: [null, "DLC solto", { name: 3 }], notes: [null, "nota", { text: null }], dateAdded: "ontem", lastPlayed: 20240101, startDate: "2025-13-01", completionDate: "x" },
  { title: "", status: "Completed", completionDate: "2024-01-01", startDate: "2024-05-01", rating: -1, estimatedHours: "muitas", price: "R$ 50", targetPrice: "x", currentPrice: "abc", discountPercent: "50%", tier: "Z", tierOrder: "x", franchise: ["a", "b"], franchiseOrder: "primeiro" },
  { title: "Fuzz desejos", status: "Wishlist", releaseDate: "2099-12-31", currentPrice: 0, regularPrice: -5, lowestSeenPrice: "x", priority: "urgente", cover: 42, background: ["x"], accent: "vermelho", bgPosX: "x", bgZoom: -100 },
  { title: "Fuzz vazio" }
];
const pages = fs.readdirSync(path.join(ROOT, "Dashboard")).filter(f => f.endsWith(".md")).map(f => "Dashboard/" + f).concat(weird.map((_, i) => `Games/PC/Fuzz ${i}.md`));
(async () => {
  const { server, url } = await start();
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const ctx = await b.newContext({ viewport: { width: W, height: 887 }, isMobile: W < 700, hasTouch: W < 700, reducedMotion: "reduce" });
  const p = await ctx.newPage();
  await p.route("**/data.js", async route => { const r = await route.fetch(); let body = await r.text();
    body += `;(function(){const W=${JSON.stringify(weird)};const base=__PAGES.find(x=>x.fm&&x.fm.type==="game");W.forEach((w,i)=>{const fm=Object.assign({type:"game",platform:"PC"},w);const path="Games/PC/Fuzz "+i+".md";__PAGES.push({fm,path,page:base.page});__FILES.push(path);});})();`;
    route.fulfill({ response: r, body, headers: { ...r.headers(), "content-type": "application/javascript" } }); });
  const errs = new Map(); let where = "";
  p.on("pageerror", e => { const k = e.message; if (!errs.has(k)) errs.set(k, `${where}: ${(e.stack || e.message).split("\n").slice(0, 3).join(" | ")}`); });
  p.on("console", m => { if (m.type() === "error" && !/Failed to load resource|net::/.test(m.text())) { const k = m.text().slice(0, 160); if (!errs.has(k)) errs.set(k, `${where}: console.error ${m.text().slice(0, 300)}`); } });
  await p.goto(url + "?p=Dashboard/Home.md"); await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
  for (const pg of pages) {
    where = pg;
    await p.evaluate(x => go(x), pg); await p.waitForTimeout(700);
    // abas da ficha e das estatísticas
    const tabs = await p.evaluate(() => [...document.querySelectorAll(".sv-gamenav [data-tab], .sv-sttabs button, [role=tab]")].filter(e => e.getClientRects().length).length);
    for (let t = 0; t < Math.min(tabs, 12); t++) {
      await p.evaluate(t => [...document.querySelectorAll(".sv-gamenav [data-tab], .sv-sttabs button, [role=tab]")].filter(e => e.getClientRects().length)[t]?.click(), t);
      await p.waitForTimeout(250);
    }
    const junk = await p.evaluate(() => { const t = document.querySelector(".sv-content")?.innerText || ""; const m = t.match(/.{0,30}(\bNaN\b|\bundefined\b|\[object Object\]|Invalid Date|\bInfinity\b).{0,30}/g); return m ? [...new Set(m)].slice(0, 4) : null; });
    if (junk) for (const j of junk) { const k = pg + j; if (!errs.has(k)) errs.set(k, `${pg}: texto quebrado na tela: "${j.replace(/\s+/g, " ")}"`); }
    const empty = await p.evaluate(() => !document.querySelector(".sv-page, .sv-game, .sv-content > *"));
    if (empty) errs.set("vazia " + pg, `${pg}: a tela ficou vazia`);
  }
  console.log(`${pages.length} telas abertas com ${weird.length} jogos malformados (${W}px)`);
  for (const v of errs.values()) console.log("  ERRO " + v);
  console.log(errs.size ? `${errs.size} erros distintos` : "Nenhum erro de script");
  await b.close(); server.close();
})();
