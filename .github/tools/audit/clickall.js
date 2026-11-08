// Clica em cada botão, aba, chip e ação de cada tela (um por vez, voltando à
// tela depois) e registra erros de script e console.error. Tudo acontece no
// harness, com gravações só na memória.
// Uso: node .github/tools/audit/clickall.js [largura] [idioma pt|en] [filtro de tela]
const path = require("path"), fs = require("fs");
const ROOT = path.resolve(__dirname, "../../..");
const { start } = require(path.join(ROOT, ".github/tests/server"));
const { chromium } = require(path.join(ROOT, ".github/tests/node_modules/playwright"));
const W = Number(process.argv[2] || 410), LANG = process.argv[3] || "pt", ONLY = process.argv[4] || "";
const pages = fs.readdirSync(path.join(ROOT, "Dashboard")).filter(f => f.endsWith(".md")).map(f => "Dashboard/" + f)
  .concat(["Games/PC/Resident Evil 4.md", "Games/PC/Dying Light.md", "Collections/Favoritos.md", "Genres/Ação.md"]).filter(p => !ONLY || p.includes(ONLY));
// ações que saem do app ou apagam o estado do harness inteiro
const SKIP = /^(obs|secrets-wipe|plat-disconnect|steam-clear|steam-disconnect|ra-disconnect|backup-now|csv-export)$/;
(async () => {
  const { server, url } = await start();
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const ctx = await b.newContext({ viewport: { width: W, height: 887 }, isMobile: W < 700, hasTouch: W < 700, reducedMotion: "reduce" });
  await ctx.addInitScript(l => { try { localStorage.setItem("steamvault:ui:lang", l); } catch (_) {} window.open = () => null; }, LANG);
  const p = await ctx.newPage();
  const errs = new Map(); let where = "";
  p.on("pageerror", e => { const k = e.message.split("\n")[0]; if (!errs.has(k)) errs.set(k, `${where}: ${e.stack?.split("\n").slice(0, 3).join(" | ") || e.message}`); });
  p.on("console", m => { if (m.type() === "error" && !/favicon|Failed to load resource|net::/.test(m.text())) { const k = m.text().slice(0, 160); if (!errs.has(k)) errs.set(k, `${where}: console.error ${m.text().slice(0, 300)}`); } });
  p.on("dialog", d => d.dismiss().catch(() => {}));
  await p.goto(url + "?p=Dashboard/Home.md"); await p.waitForFunction(() => window.__ready);
  let clicks = 0;
  for (const pg of pages) {
    await p.evaluate(x => go(x), pg); await p.waitForTimeout(600);
    const n = await p.evaluate(() => {
      const els = [...document.querySelectorAll(".sv-app [data-action], .sv-app button, .sv-app [role=tab], .sv-app summary")].filter(e => e.getClientRects().length && !e.closest("[hidden]"));
      els.forEach((e, i) => e.setAttribute("data-ck", i));
      return els.length;
    });
    for (let i = 0; i < Math.min(n, 120); i++) {
      await p.evaluate(x => go(x), pg).catch(() => {}); await p.waitForTimeout(250);
      await p.evaluate(() => { const els = [...document.querySelectorAll(".sv-app [data-action], .sv-app button, .sv-app [role=tab], .sv-app summary")].filter(e => e.getClientRects().length && !e.closest("[hidden]")); els.forEach((e, i) => e.setAttribute("data-ck", i)); });
      const info = await p.evaluate(([i, skip]) => {
        const el = document.querySelector(`[data-ck="${i}"]`); if (!el) return null;
        const a = el.dataset.action || "";
        if (new RegExp(skip).test(a) || el.closest("a[href^=http]")) return { skip: true };
        const label = (a ? `[${a}] ` : "") + (el.getAttribute("aria-label") || el.textContent || el.className).trim().replace(/\s+/g, " ").slice(0, 40);
        el.click();
        return { label };
      }, [i, SKIP.source]);
      if (!info || info.skip) continue;
      where = `${pg.split("/").pop().replace(".md", "")} → ${info.label}`;
      clicks++;
      await p.waitForTimeout(220);
      // DEEP=1: se abriu uma janela, clica também nos controles dela (menos os
      // de apagar), reabrindo-a quando um clique a fecha
      if (process.env.DEEP) {
        const inner = await p.evaluate(() => { const m = [...document.querySelectorAll(".sv-modal-root .sv-modal")].find(e => e.getClientRects().length); if (!m) return 0; const els = [...m.querySelectorAll("button, [role=tab], [role=radio], summary, input[type=checkbox], select")].filter(e => e.getClientRects().length && !/excluir|apagar|remover|delete|remove|desconectar/i.test((e.textContent || "") + (e.getAttribute("aria-label") || "") + (e.title || "")) && !e.matches(".sv-modal-close, [data-close], .is-danger, .sv-btn--danger")); els.forEach((e, k) => e.setAttribute("data-mk", k)); return Math.min(els.length, 25); });
        for (let k = 0; k < inner; k++) {
          const lab = await p.evaluate(k => { const e = document.querySelector(`[data-mk="${k}"]`); if (!e || !e.isConnected || !e.getClientRects().length) return null; const l = (e.getAttribute("aria-label") || e.textContent || e.className).trim().replace(/\s+/g, " ").slice(0, 30); if (e.tagName === "SELECT") { if (e.options.length > 1) { e.selectedIndex = (e.selectedIndex + 1) % e.options.length; e.dispatchEvent(new Event("change", { bubbles: true })); } } else e.click(); return l; }, k);
          if (lab === null) continue;
          where = `${pg.split("/").pop().replace(".md", "")} → ${info.label} → ${lab}`;
          clicks++;
          await p.waitForTimeout(160);
        }
      }
      // fecha janelas/menus abertos pelo clique
      for (let k = 0; k < 3; k++) { await p.keyboard.press("Escape").catch(() => {}); await p.waitForTimeout(60); }
    }
  }
  console.log(`${clicks} cliques em ${pages.length} telas (${W}px, ${LANG})`);
  for (const v of errs.values()) console.log("  ERRO " + v);
  console.log(errs.size ? `${errs.size} erros distintos` : "Nenhum erro de script");
  await b.close(); server.close();
})();
