// Contraste dos textos SOBRE IMAGENS (capas, fundos, heróis), que o
// contrast.js não consegue medir porque o fundo não é uma cor só.
// Para cada texto: esconde só a cor do texto (a sombra e o escurecimento
// continuam), fotografa a área por trás dele e mede o contraste pixel a
// pixel. Passa quando 90% dos pixels atingem o mínimo (p10 ≥ 4,5:1, ou 3:1
// para texto grande). Temas escuro e claro.
// Uso: node .github/tools/audit/contrast-images.js [largura]
const path = require("path");
const ROOT = path.resolve(__dirname, "../../..");
const { start } = require(path.join(ROOT, ".github/tests/server"));
const { chromium } = require(path.join(ROOT, ".github/tests/node_modules/playwright"));
const W = Number(process.argv[2] || 410);
const pages = ["Dashboard/Home.md", "Dashboard/Biblioteca.md", "Dashboard/Coleções.md", "Dashboard/Gêneros.md", "Dashboard/Plataformas.md", "Dashboard/Conquistas.md", "Dashboard/Perfil.md", "Dashboard/Lista de Desejos.md", "Genres/Ação.md", "Collections/Favoritos.md", "Games/PC/Resident Evil 4.md", "Games/PC/Dying Light.md"];
const AREAS = ".sv-hero, .sv-idhero, .sv-ehero, .sv-phero, .sv-achhero, .sv-trophyhero, .sv-featured, .sv-wide, .sv-gtile, .sv-card-art, .sv-libcont-card, .sv-herocar, .sv-featcard, .sv-wide-art, .sv-pcard";
(async () => {
  const { server, url } = await start();
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  let fails = 0, checked = 0;
  for (const theme of ["dark", "light"]) {
    const ctx = await b.newContext({ viewport: { width: W, height: 900 }, isMobile: W < 700, hasTouch: W < 700, reducedMotion: "reduce", deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    await p.goto(url + "?p=Dashboard/Home.md"); await p.waitForFunction(() => window.__ready);
    if (theme === "light") await p.evaluate(() => { document.body.classList.remove("theme-dark"); document.body.classList.add("theme-light"); });
    const seen = new Set(), out = [];
    for (const pg of pages) {
      await p.evaluate(x => go(x), pg); await p.waitForTimeout(900);
      if (process.env.XCSS) await p.addStyleTag({ content: process.env.XCSS }); // controle: injeta um texto ruim e confere que o script acusa
      const n = await p.evaluate(AREAS => {
        document.querySelectorAll("[data-ci]").forEach(e => e.removeAttribute("data-ci"));
        const els = [];
        const w = document.createTreeWalker(document.querySelector(".sv-content") || document.body, NodeFilter.SHOW_TEXT);
        while (w.nextNode()) {
          const t = w.currentNode, el = t.parentElement;
          if (!t.nodeValue.trim() || !el || els.includes(el) || !el.closest(AREAS)) continue;
          if (el.closest("button, .sv-btn, .sv-chip, [hidden], [aria-hidden=true], .sv-sr, svg") || !el.getClientRects().length) continue;
          const cs = getComputedStyle(el); if (cs.visibility === "hidden" || +cs.opacity < 0.5) continue;
          els.push(el);
        }
        els.slice(0, 60).forEach((e, i) => e.setAttribute("data-ci", i));
        return Math.min(els.length, 60);
      }, AREAS);
      for (let i = 0; i < n; i++) {
        const info = await p.evaluate(i => {
          const el = document.querySelector(`[data-ci="${i}"]`); if (!el) return null;
          el.scrollIntoView({ block: "center", inline: "nearest" });
          const cs = getComputedStyle(el), r = el.getBoundingClientRect();
          // a caixa do texto, não do bloco inteiro
          const range = document.createRange(); range.selectNodeContents(el); const tr = range.getBoundingClientRect();
          const box = tr.width && tr.height ? tr : r;
          const key = (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/)[0] : el.tagName.toLowerCase()) + " em " + (el.closest("[class*=hero], .sv-gtile, .sv-card-art, .sv-featured, .sv-wide, .sv-libcont-card, .sv-pcard")?.className.split(" ")[0] || "?");
          // texto coberto por outro elemento (ex.: título da capa reserva sob a capa) não aparece
          const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
          if (top && top !== el && !el.contains(top) && !top.contains(el)) return null;
          const size = parseFloat(cs.fontSize), bold = Number(cs.fontWeight) >= 700;
          return { key, color: cs.color, need: size >= 24 || (bold && size >= 18.66) ? 3 : 4.5, text: el.textContent.trim().slice(0, 24), x: Math.max(0, box.left), y: Math.max(0, box.top), w: Math.min(box.width, innerWidth - Math.max(0, box.left)), h: Math.min(box.height, innerHeight - Math.max(0, box.top)) };
        }, i);
        if (!info || info.w < 4 || info.h < 4 || seen.has(info.key)) continue;
        await p.waitForTimeout(60);
        await p.evaluate(i => { const el = document.querySelector(`[data-ci="${i}"]`); el.dataset.ciColor = el.style.color; el.style.setProperty("color", "transparent", "important"); el.style.setProperty("-webkit-text-fill-color", "transparent", "important"); }, i);
        const shot = await p.screenshot({ clip: { x: info.x, y: info.y, width: info.w, height: info.h } });
        await p.evaluate(i => { const el = document.querySelector(`[data-ci="${i}"]`); el.style.removeProperty("-webkit-text-fill-color"); el.style.color = el.dataset.ciColor || ""; }, i);
        const res = await p.evaluate(async ({ b64, color }) => {
          const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
          const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
          const g = c.getContext("2d"); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data;
          const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
          const L = (r, gg, bb) => 0.2126 * lin(r) + 0.7152 * lin(gg) + 0.0722 * lin(bb);
          const m = color.match(/[\d.]+/g).map(Number); const Lt = L(m[0], m[1], m[2]);
          const rs = [];
          for (let k = 0; k < d.length; k += 4) { const Lb = L(d[k], d[k + 1], d[k + 2]); rs.push((Math.max(Lt, Lb) + 0.05) / (Math.min(Lt, Lb) + 0.05)); }
          rs.sort((a, b) => a - b);
          return { p10: rs[Math.floor(rs.length * 0.1)], med: rs[Math.floor(rs.length / 2)] };
        }, { b64: shot.toString("base64"), color: info.color });
        seen.add(info.key); checked++;
        if (res.p10 < info.need) out.push(`${pg.split("/").pop().replace(".md", "")}: ${info.key} "${info.text}" p10 ${res.p10.toFixed(2)}:1, mediana ${res.med.toFixed(2)}:1 (precisa ${info.need})`);
      }
    }
    console.log(`\n== tema ${theme}: ${seen.size} tipos de texto sobre imagem medidos, ${out.length} abaixo do mínimo`);
    out.forEach(x => console.log("  " + x));
    fails += out.length;
    await ctx.close();
  }
  console.log(fails ? `\nTOTAL: ${fails} de ${checked}` : `\nTodos os ${checked} textos sobre imagem passam`);
  await b.close(); server.close();
})();
