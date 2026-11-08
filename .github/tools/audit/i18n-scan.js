// Modo inglês: procura textos que ficaram em português em todas as telas
// (palavras acentuadas ou muito comuns do português). Nomes de jogos,
// gêneros e plataformas vêm das notas e são ignorados quando batem com elas.
// Uso: node .github/tools/audit/i18n-scan.js [largura]
const path = require("path"), fs = require("fs");
const ROOT = path.resolve(__dirname, "../../..");
const { start } = require(path.join(ROOT, ".github/tests/server"));
const { chromium } = require(path.join(ROOT, ".github/tests/node_modules/playwright"));
const W = Number(process.argv[2] || 1280);
const pages = fs.readdirSync(path.join(ROOT, "Dashboard")).filter(f => f.endsWith(".md")).map(f => "Dashboard/" + f).concat(["Games/PC/Resident Evil 4.md", "Collections/Favoritos.md", "Genres/Ação.md"]);
(async () => {
  const { server, url } = await start();
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const ctx = await b.newContext({ viewport: { width: W, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.setItem("steamvault:ui:lang", "en"); } catch (_) {} });
  const p = await ctx.newPage();
  await p.goto(url + "?p=Dashboard/Home.md"); await p.waitForFunction(() => window.__ready);
  const found = new Map();
  for (const pg of pages) {
    await p.evaluate(x => go(x), pg); await p.waitForTimeout(800);
    const tabs = await p.evaluate(() => [...document.querySelectorAll(".sv-gamenav [data-tab], .sv-sttabs button")].filter(e => e.getClientRects().length).length);
    for (let t = -1; t < Math.min(tabs, 10); t++) {
      if (t >= 0) { await p.evaluate(t => [...document.querySelectorAll(".sv-gamenav [data-tab], .sv-sttabs button")].filter(e => e.getClientRects().length)[t]?.click(), t); await p.waitForTimeout(400); }
      const hits = await p.evaluate(() => {
        const own = new Set(); // textos que vêm das notas (títulos, gêneros, descrições)
        for (const x of window.__PAGES || []) for (const k of ["title", "name", "description", "summary", "platform", "franchise", "developer", "publisher"]) { const v = x.fm?.[k]; if (typeof v === "string") own.add(v.trim()); }
        for (const x of window.__PAGES || []) for (const k of ["genre", "subgenre", "labels"]) for (const v of [].concat(x.fm?.[k] || [])) own.add(String(v).trim());
        const pt = /[ãõçáéíóúâêô]|\b(de|do|da|dos|das|jogos?|sem|(?<!\.)com|para|você|seu|sua|ainda|horas?|conquistas?|nenhum|nenhuma|adicionar|ver|todos?|ano|mês|semana|zerad[oa]s?|jogando)\b/i;
        const out = [];
        const w = document.createTreeWalker(document.querySelector(".sv-app") || document.body, NodeFilter.SHOW_TEXT);
        while (w.nextNode()) {
          const n = w.currentNode, t = n.nodeValue.trim(), el = n.parentElement;
          if (t.length < 3 || !el || !el.getClientRects().length || el.closest("script, style, code, .sv-sr, [hidden]")) continue;
          if (own.has(t) || [...own].some(o => o.length > 3 && t.includes(o))) continue;
          if (pt.test(t)) out.push(t.slice(0, 70));
        }
        for (const el of document.querySelectorAll(".sv-app [placeholder], .sv-app [aria-label], .sv-app [title]")) for (const a of ["placeholder", "aria-label", "title"]) { const v = el.getAttribute(a); if (v && pt.test(v) && !own.has(v) && ![...own].some(o => o.length > 3 && v.includes(o))) out.push(`@${a}: ${v.slice(0, 60)}`); }
        return out;
      });
      for (const h of hits) if (!found.has(h)) found.set(h, pg.split("/").pop().replace(".md", ""));
    }
  }
  for (const [t, pg] of found) console.log(`  ${pg}: ${t}`);
  console.log(found.size ? `${found.size} textos possivelmente em português no modo inglês` : "Nenhum texto em português no modo inglês");
  await b.close(); server.close();
})();
