// Auditoria de contraste (WCAG 2.1): cada texto visível contra o fundo real
// por trás dele, nos temas escuro e claro. Texto comum precisa de 4,5:1;
// texto grande (24 px, ou 18,66 px em negrito) precisa de 3:1.
// Uso: node .github/tools/audit/contrast.js [largura]
// Ignora textos sobre imagens (o fundo não é uma cor só) e textos desabilitados.
const path = require("path");
const ROOT = path.resolve(__dirname, "../../..");
const { start } = require(path.join(ROOT, ".github/tests/server"));
const { chromium } = require(path.join(ROOT, ".github/tests/node_modules/playwright"));
const W = Number(process.argv[2] || 410);
const pages = ["Dashboard/Home.md", "Dashboard/Biblioteca.md", "Dashboard/Coleções.md", "Dashboard/Gêneros.md", "Dashboard/Plataformas.md", "Dashboard/Conquistas.md", "Dashboard/Estatísticas.md", "Dashboard/Perfil.md", "Dashboard/Configurações.md", "Dashboard/Lista de Desejos.md", "Games/PC/Resident Evil 4.md"];
(async () => {
  const { server, url } = await start();
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  let total = 0;
  for (const theme of ["dark", "light"]) {
    const p = await (await b.newContext({ viewport: { width: W, height: 900 }, isMobile: W < 700, hasTouch: W < 700, reducedMotion: "reduce" })).newPage();
    await p.goto(url + "?p=Dashboard/Home.md"); await p.waitForFunction(() => window.__ready);
    if (theme === "light") await p.evaluate(() => { document.body.classList.remove("theme-dark"); document.body.classList.add("theme-light"); });
    const found = new Map();
    for (const pg of pages) {
      await p.evaluate(x => go(x), pg); await p.waitForTimeout(700);
      const bad = await p.evaluate(() => {
        const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) { const n = c.match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)/); return n ? [n[1] * 255, n[2] * 255, n[3] * 255, n[4] === undefined ? 1 : +n[4]] : null; } const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [v[0], v[1], v[2], v[3] === undefined ? 1 : v[3]]; };
        const mix = (top, bot) => { const a = top[3]; return [top[0] * a + bot[0] * (1 - a), top[1] * a + bot[1] * (1 - a), top[2] * a + bot[2] * (1 - a), 1]; };
        const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
        const bgOf = el => {
          const layers = [];
          for (let e = el; e; e = e.parentElement) {
            const cs = getComputedStyle(e);
            if (cs.backgroundImage !== "none" && !/gradient/.test(cs.backgroundImage)) return null; // imagem: fundo indefinido
            if (e.tagName === "IMG" || e.querySelector?.(":scope > img.sv-hero-img, :scope > .sv-idhero-art, :scope > img[class*=bg]")) return null;
            // gradiente: usa a média das cores dele como uma camada
            if (/gradient/.test(cs.backgroundImage)) {
              const stops = (cs.backgroundImage.match(/rgba?\([^)]+\)|color\(srgb [^)]+\)/g) || []).map(parse).filter(Boolean);
              if (stops.length) { const A = stops.reduce((a, s) => a + s[3], 0); if (A > 0) layers.push([0, 1, 2].map(i => stops.reduce((a, s) => a + s[i] * s[3], 0) / A).concat(A / stops.length)); }
            }
            const c = parse(cs.backgroundColor);
            if (c && c[3] > 0) layers.push(c);
            if (layers.length && layers.slice(-2).some(l => l[3] >= 0.99)) break;
          }
          let base = [13, 20, 32, 1];
          if (document.body.classList.contains("theme-light")) base = [245, 247, 250, 1];
          for (const l of layers.reverse()) base = mix(l, base);
          return base;
        };
        const out = [];
        const walker = document.createTreeWalker(document.querySelector(".sv-content") || document.body, NodeFilter.SHOW_TEXT);
        const seen = new Set();
        while (walker.nextNode()) {
          const t = walker.currentNode; if (!t.nodeValue.trim()) continue;
          const el = t.parentElement; if (!el || seen.has(el)) continue; seen.add(el);
          if (!el.getClientRects().length || el.closest("[hidden], [aria-hidden=true], .sv-sr, :disabled, .is-disabled, .sv-hero, .sv-idhero, .sv-cover-fallback, .sv-gtile-art, .sv-card-art, .sv-libcont-card, .sv-herocar, .sv-featcard, .sv-wide-art, .sv-pcard-art, svg")) continue;
          const cs = getComputedStyle(el);
          if (+cs.opacity < 0.98 || cs.visibility === "hidden") continue;
          const fg = parse(cs.color); if (!fg) continue;
          const bg = bgOf(el); if (!bg) continue;
          const f = fg[3] < 1 ? mix(fg, bg) : fg;
          const L1 = lum(f), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
          const size = parseFloat(cs.fontSize), bold = Number(cs.fontWeight) >= 700;
          const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
          if (ratio < need - 0.05) out.push(`${(el.className && typeof el.className === "string" ? "." + el.className.split(" ")[0] : el.tagName.toLowerCase())} "${t.nodeValue.trim().slice(0, 24)}" ${ratio.toFixed(2)}:1 (precisa ${need}) cor=${cs.color}`);
        }
        return out;
      });
      for (const x of bad) { const k = x.replace(/ "[^"]*"/, "").replace(/ \d+\.\d+:1/, ""); if (!found.has(k)) found.set(k, `${pg.split("/").pop().replace(".md", "")}: ${x}`); }
    }
    console.log(`\n== tema ${theme}: ${found.size} tipos de texto abaixo do mínimo`);
    for (const v of found.values()) console.log("  " + v);
    total += found.size;
    await p.close();
  }
  console.log(total ? `\nTOTAL: ${total}` : "\nTodos os textos medidos passam no contraste");
  await b.close(); server.close();
})();
