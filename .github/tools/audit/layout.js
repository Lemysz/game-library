// auditoria de todas as telas no celular (e no computador): estouros, toque, sobreposições, imagens
const ROOT = require("path").resolve(__dirname, "../../..");
const { start } = require(ROOT + "/.github/tests/server"); const { chromium } = require(ROOT + "/.github/tests/node_modules/playwright");
const fs = require("fs");
const pages = fs.readdirSync(ROOT + "/Dashboard").filter(f => f.endsWith(".md")).map(f => "Dashboard/" + f).concat(["Games/PC/Resident Evil 4.md", "Games/PC/Dying Light.md"]);
(async () => {
  const { server, url } = await start(); const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const [W, H, mob] of [[360, 760, true], [410, 887, true], [1300, 850, false]]) {
    const p = await (await b.newContext({ viewport: { width: W, height: H }, isMobile: mob, hasTouch: mob, reducedMotion: "reduce" })).newPage();
    const errs = []; p.on("pageerror", e => errs.push(e.message)); p.on("console", m => { if (m.type() === "error" && !/Failed to load resource|net::/.test(m.text())) errs.push(m.text()); });
    await p.goto(url + "?p=Dashboard/Home.md"); await p.waitForFunction(() => window.__ready);
    for (const pg of pages) {
      await p.evaluate(x => go(x), pg); await p.waitForTimeout(700);
      const r = await p.evaluate(([VW, mob]) => {
        const out = [];
        const R = el => el.getBoundingClientRect();
        const vis = el => { const r = R(el); if (!r.width || !r.height) return false; const cs = getComputedStyle(el); return cs.visibility !== "hidden" && cs.display !== "none" && +cs.opacity > 0.05; };
        const L = document.querySelector(".sv-layer");
        if (L && L.scrollWidth > L.clientWidth + 1) out.push(`rolagem lateral (${L.scrollWidth - L.clientWidth}px)`);
        const app = document.querySelector(".sv-app");
        const scrollerOf = el => { for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e); if (/(auto|scroll|hidden|clip)/.test(cs.overflowX) && e !== L && !e.classList.contains("sv-host")) return e; } return null; };
        // estoura a tela
        let over = 0, overEx = "";
        for (const el of app.querySelectorAll(".sv-content *")) {
          if (!vis(el)) continue; const b = R(el);
          if ((b.right > VW + 1 || b.left < -1) && !scrollerOf(el) && !el.closest(".sv-menu, [hidden], .sv-modal-root, .sv-toasts")) { over++; if (!overEx) overEx = (el.className && typeof el.className === "string" ? el.className.split(" ")[0] : el.tagName) + ` ${Math.round(b.left)}..${Math.round(b.right)}`; }
        }
        if (over) out.push(`${over} elementos fora da tela (ex.: ${overEx})`);
        // toque pequeno
        if (mob) {
          const small = [];
          for (const el of app.querySelectorAll("button, a[href], a[data-href], [role=button], [role=tab], input[type=checkbox], select, [data-open], [data-path]")) {
            if (!vis(el) || el.closest(".sv-menu:not(.is-open), [hidden], .sv-gamenav .sv-sr")) continue;
            const b = R(el); if (b.bottom < 0 || b.top > innerHeight * 3) continue;
            if (el.matches(".sv-content a") && getComputedStyle(el).display === "inline") continue; // links no meio do texto
            if (b.width < 32 || b.height < 32) small.push(`${(el.className && typeof el.className === "string" ? el.className.split(" ")[0] : el.tagName) || el.tagName}:${Math.round(b.width)}×${Math.round(b.height)}`);
          }
          const uniq = [...new Set(small)];
          if (uniq.length) out.push(`toque < 32px: ${uniq.slice(0, 6).join(", ")}${uniq.length > 6 ? ` (+${uniq.length - 6})` : ""}`);
        }
        // texto cortado sem reticências
        let cut = 0, cutEx = "";
        for (const el of app.querySelectorAll(".sv-content h1, .sv-content h2, .sv-content h3, .sv-content b, .sv-content strong, .sv-content .sv-btn, .sv-content p")) {
          if (!vis(el)) continue; const cs = getComputedStyle(el);
          if (cs.textOverflow === "ellipsis" || +cs.webkitLineClamp > 0 || cs.overflow === "visible") continue;
          if (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 3) { cut++; if (!cutEx) cutEx = (el.className || el.tagName) + ": " + el.textContent.trim().slice(0, 30); }
        }
        if (cut) out.push(`${cut} textos cortados (ex.: ${cutEx})`);
        // imagens
        let dist = 0, broken = 0;
        for (const img of app.querySelectorAll("img")) {
          if (!vis(img)) continue;
          if (img.complete && !img.naturalWidth && img.getAttribute("src")) broken++;
          const cs = getComputedStyle(img); if (cs.objectFit !== "fill" || !img.naturalWidth) continue;
          const b = R(img); const d = Math.abs(b.width / b.height - img.naturalWidth / img.naturalHeight) / (img.naturalWidth / img.naturalHeight);
          if (d > 0.06 && b.width > 24) dist++;
        }
        if (dist) out.push(`${dist} imagens distorcidas`);
        if (broken) out.push(`${broken} imagens quebradas visíveis`);
        // botões flutuantes sobre algo clicável no topo
        if (mob) {
          const fabs = [...document.querySelectorAll(".sv-topbar .sv-fab, .sv-topbar > button")].filter(vis).map(R);
          for (const el of app.querySelectorAll(".sv-content a, .sv-content button")) {
            if (!vis(el)) continue; const b = R(el);
            if (fabs.some(f => b.left < f.right && b.right > f.left && b.top < f.bottom && b.bottom > f.top)) { out.push(`clicável sob botão flutuante: ${(el.className || el.tagName).toString().split(" ")[0]}`); break; }
          }
        }
        // sem título
        if (!document.querySelector(".sv-content h1")) out.push("sem h1");
        return out;
      }, [W, mob]);
      if (r.length) console.log(W, pg.replace("Dashboard/", "").padEnd(30), r.join(" · "));
    }
    if (errs.length) console.log(W, "ERROS:", [...new Set(errs)].slice(0, 5));
  }
  console.log("fim");
  await b.close(); server.close();
})();
