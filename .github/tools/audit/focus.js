// Auditoria de navegação por teclado: aperta Tab pelas páginas principais e
// confere se cada elemento focado mostra um indicador visível (contorno,
// sombra ou mudança de fundo/borda) e se o foco não fica preso nem some.
// Uso: node .github/tools/audit/focus.js [largura] [tabs por página]
const path = require("path");
const ROOT = path.resolve(__dirname, "../../..");
const { start } = require(path.join(ROOT, ".github/tests/server"));
const { chromium } = require(path.join(ROOT, ".github/tests/node_modules/playwright"));
const W = Number(process.argv[2] || 1280), N = Number(process.argv[3] || 60);
const pages = ["Dashboard/Home.md", "Dashboard/Biblioteca.md", "Dashboard/Coleções.md", "Dashboard/Estatísticas.md", "Dashboard/Lista de Desejos.md", "Dashboard/Configurações.md", "Games/PC/Resident Evil 4.md"];
(async () => {
  const { server, url } = await start();
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await (await b.newContext({ viewport: { width: W, height: 900 }, reducedMotion: "reduce" })).newPage();
  await p.goto(url + "?p=Dashboard/Home.md"); await p.waitForFunction(() => window.__ready);
  const bad = new Map(); let seen = 0;
  for (const pg of pages) {
    await p.evaluate(x => go(x), pg); await p.waitForTimeout(700);
    await p.evaluate(() => { document.activeElement?.blur?.(); (document.querySelector(".sv-app") || document.body).focus?.(); });
    for (let i = 0; i < N; i++) {
      await p.keyboard.press("Tab");
      const r = await p.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body || !el.closest(".sv-app, .sv-modal-root")) return null;
        const id = (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : el.tagName.toLowerCase()) + (el.dataset.action ? `[${el.dataset.action}]` : "");
        const box = el.getBoundingClientRect();
        if (!box.width || !box.height) return { id, why: "foco num elemento invisível" };
        const st = e => { const c = getComputedStyle(e); return [c.outlineStyle !== "none" && parseFloat(c.outlineWidth) > 0 ? "o" : "", c.boxShadow, c.backgroundColor, c.borderColor, c.textDecorationLine, c.color].join("|"); };
        const on = st(el);
        // compara com o mesmo elemento sem foco (mede um clone fora do foco)
        const clone = el.cloneNode(true); clone.removeAttribute("id"); clone.setAttribute("tabindex", "-1");
        el.parentNode.insertBefore(clone, el.nextSibling);
        const off = st(clone); clone.remove();
        if (on === off) {
          // o indicador pode estar no contêiner (:focus-within): compara os pais com e sem o foco
          const anc = [el.parentElement, el.parentElement?.parentElement].filter(Boolean);
          const withF = anc.map(st); el.blur(); const noF = anc.map(st); el.focus({ preventScroll: true });
          if (withF.every((v, k) => v === noF[k])) return { id, why: "sem indicador de foco visível" };
        }
        return { id, ok: true };
      });
      if (!r) continue;
      seen++;
      if (!r.ok && !bad.has(r.id)) bad.set(r.id, `${pg.split("/").pop().replace(".md", "")}: ${r.id} — ${r.why}`);
    }
  }
  console.log(`${seen} paradas de foco verificadas em ${pages.length} páginas`);
  for (const v of bad.values()) console.log("  " + v);
  console.log(bad.size ? `\n${bad.size} tipos de controle sem foco visível` : "Todos os controles focados mostram indicador visível");
  await b.close(); server.close();
})();
