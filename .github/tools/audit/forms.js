// abre cada formulário/janela do app e fotografa (topo e fim do corpo da janela)
// node forms.js <prefixo> [largura] [filtro]
const ROOT = require("path").resolve(__dirname, "../../..");
const { start } = require(ROOT + "/.github/tests/server"); const { chromium } = require(ROOT + "/.github/tests/node_modules/playwright");
const [out, W = "410", only = ""] = process.argv.slice(2);
const G = "Games/PC/Resident Evil 4.md";
const jobs = [
  ["add-game", "Dashboard/Biblioteca.md", { action: "add-game" }],
  ["details", G, { action: "manage", section: "details", path: G }],
  ["images", G, { action: "manage", section: "images", path: G }],
  ["achievements", G, { action: "manage", section: "achievements", path: G }],
  ["sessions", G, { action: "manage", section: "sessions", path: G }],
  ["playthroughs", G, { action: "manage", section: "playthroughs", path: G }],
  ["dlc", G, { action: "manage", section: "dlc", path: G }],
  ["notes", G, { action: "manage", section: "notes", path: G }],
  ["add-collection", "Dashboard/Coleções.md", { action: "legacy", legacy: "addCollection" }],
  ["edit-collection", "Collections/Favoritos.md", { action: "legacy", legacy: "editCollection" }],
  ["collection-games", "Collections/Favoritos.md", { action: "collection-games", path: "Collections/Favoritos.md" }],
  ["add-genre", "Dashboard/Gêneros.md", { action: "legacy", legacy: "addGenre" }],
  ["add-platform", "Dashboard/Plataformas.md", { action: "legacy", legacy: "addPlatform" }],
  ["identity", "Genres/Ação.md", { action: "identity-edit", kind: "genre", name: "Ação", path: "Genres/Ação.md" }],
  ["filters", "Dashboard/Biblioteca.md", { sel: "[data-lib-filters]" }],
  ["display", "Dashboard/Biblioteca.md", { sel: "[data-lib-display]" }],
  ["goals", "Dashboard/Estatísticas.md", { action: "goals-edit" }],
  ["csv", "Dashboard/Biblioteca.md", { action: "csv-import" }],
  ["steam-connect", "Dashboard/Steam.md", { action: "steam-connect" }],
  ["ra-connect", "Dashboard/RetroAchievements.md", { action: "ra-connect" }],
  ["profile", "Dashboard/Perfil.md", { sel: "[data-action='profile-edit'], .sv-pf-link[data-pf-edit], button.sv-pf-link" }],
  ["share", G, { action: "share-card", kind: "game", path: G }],
  ["random", "Dashboard/Biblioteca.md", { action: "random-game" }],
  ["confirm", "Dashboard/Configurações.md", { action: "secrets-wipe" }],
  ["wish-target", "Dashboard/Lista de Desejos.md", { sel: "[data-action='wish-target']" }],
  ["review", G, { sel: "[data-action='review'], [data-review-edit], .sv-ovreview button" }],
  ["search", "Dashboard/Home.md", { action: "search-open" }]
];
(async () => {
  const { server, url } = await start(); const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const w = Number(W), mob = w < 700;
  const ctx = await b.newContext({ viewport: { width: w, height: mob ? 887 : 900 }, isMobile: mob, hasTouch: mob, reducedMotion: "reduce" });
  const p = await ctx.newPage();
  const errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.goto(url + "?p=Dashboard/Home.md"); await p.waitForFunction(() => window.__ready);
  for (const [name, page, a] of jobs) {
    if (only && !only.split(",").includes(name)) continue;
    await p.keyboard.press("Escape").catch(() => {}); await p.waitForTimeout(150);
    await p.evaluate(x => go(x), page); await p.waitForTimeout(700);
    const ok = await p.evaluate(a => {
      if (a.sel) { const el = document.querySelector(a.sel); if (!el) return false; el.click(); return true; }
      const root = document.querySelector(".sv-app"); const btn = document.createElement("button");
      btn.type = "button"; btn.hidden = true; btn.dataset.action = a.action;
      for (const [k, v] of Object.entries(a)) if (k !== "action") btn.dataset[k] = v;
      root.appendChild(btn); btn.click(); btn.remove(); return true;
    }, a);
    await p.waitForTimeout(900);
    const info = await p.evaluate(() => {
      const m = [...document.querySelectorAll(".sv-modal-root.is-open .sv-modal, .sv-modal-root .sv-modal, .sv-search.is-open, .sv-search")].find(e => e.getClientRects().length);
      if (!m) return null;
      const body = m.querySelector(".sv-modal-body") || m;
      const r = m.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), scroll: body.scrollHeight - body.clientHeight, over: m.scrollWidth > m.clientWidth + 1 || body.scrollWidth > body.clientWidth + 1 };
    });
    if (!ok || !info) { console.log(name.padEnd(17), "NÃO ABRIU"); continue; }
    console.log(name.padEnd(17), JSON.stringify(info));
    await p.screenshot({ path: `${out}-${W}-${name}.png` });
    if (info.scroll > 40) {
      await p.evaluate(() => { const m = [...document.querySelectorAll(".sv-modal-root .sv-modal")].find(e => e.getClientRects().length); const body = m?.querySelector(".sv-modal-body"); if (body) body.scrollTop = body.scrollHeight; });
      await p.waitForTimeout(250); await p.screenshot({ path: `${out}-${W}-${name}-fim.png` });
    }
  }
  if (errs.length) console.log("ERROS:", [...new Set(errs)].slice(0, 6));
  await b.close(); server.close();
})();
