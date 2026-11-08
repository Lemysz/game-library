// Escape de HTML: cria jogo, coleção, conquista, gênero e franquia com nomes
// "maliciosos" (<img onerror=…>, aspas, </script>) e abre todas as telas,
// abas, a busca e as janelas principais. Falha se qualquer payload executar
// ou se um nome aparecer cortado (o HTML ter sido interpretado).
// Uso: node .github/tools/audit/xss.js [largura]
const path = require("path"), fs = require("fs");
const ROOT = path.resolve(__dirname, "../../..");
const { start } = require(path.join(ROOT, ".github/tests/server"));
const { chromium } = require(path.join(ROOT, ".github/tests/node_modules/playwright"));
const W = Number(process.argv[2] || 1280);
const X = n => `Z${n}<img src=x onerror="window.__xss=(window.__xss||[]).concat('${n}')">"'&</b>`;
const G = "Games/PC/XSS.md";
const inject = `;(function(){const X=${X.toString()};const base=__PAGES.find(x=>x.fm&&x.fm.type==="game");
const g={type:"game",platform:"PC",status:"Playing",title:X("title"),franchise:X("franchise"),developer:X("dev"),publisher:X("pub"),genre:[X("genre")],subgenre:[X("sub")],labels:[X("label")],summary:X("summary"),wishlistReason:X("reason"),
 sessions:[{date:"2024-05-01",hours:2,note:X("session")}],playthroughs:[{start:"2024-01-01",end:"2024-02-01",note:X("run"),difficulty:X("diff")}],dlc:[{name:X("dlc"),owned:true}],notes:[{date:"2024-05-02",text:X("note")}],
 achievementProvider:"custom",achievementSync:"local",rating:4,review:X("review"),hoursPlayed:5,dateAdded:"2024-01-01",lastPlayed:"2024-05-01",startDate:"2024-01-01"};
__PAGES.push({fm:g,path:"${G}",page:base.page});__FILES.push("${G}");
__PAGES.push({fm:{type:"achievement",name:X("ach"),description:X("achdesc"),unlocked:true,unlockedDate:"2024-05-01",category:X("cat"),game:"[[XSS]]",gamePath:"${G}"},path:"Achievements/XSS/a.md",page:null});__FILES.push("Achievements/XSS/a.md");
const col=__PAGES.find(x=>x.fm&&x.fm.type==="collection");
__PAGES.push({fm:{type:"collection",title:X("col"),description:X("coldesc"),games:["[[XSS]]"]},path:"Collections/XSS.md",page:col?col.page:null});__FILES.push("Collections/XSS.md");
})();`;
const pages = fs.readdirSync(path.join(ROOT, "Dashboard")).filter(f => f.endsWith(".md")).map(f => "Dashboard/" + f).concat([G, "Collections/XSS.md"]);
(async () => {
  const { server, url } = await start();
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await (await b.newContext({ viewport: { width: W, height: 900 }, reducedMotion: "reduce" })).newPage();
  await p.route("**/data.js", async route => { const r = await route.fetch(); route.fulfill({ response: r, body: (await r.text()) + inject, headers: { ...r.headers(), "content-type": "application/javascript" } }); });
  const errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.goto(url + "?p=Dashboard/Home.md"); await p.waitForFunction(() => window.__ready);
  const cut = new Set();
  const scan = async where => {
    const r = await p.evaluate(() => {
      // um nome renderizado como texto contém "<img"; se virou HTML, existe um <img src="x">
      const bad = [...document.querySelectorAll('img[src="x"]')].filter(e => e.closest(".sv-app, .sv-modal-root, .sv-search")).map(e => e.outerHTML.slice(0, 60));
      return { bad, xss: window.__xss || [] };
    });
    for (const x of r.bad) cut.add(`${where}: HTML interpretado ${x}`);
    for (const x of r.xss) cut.add(`${where}: EXECUTOU payload "${x}"`);
  };
  for (const pg of pages) {
    await p.evaluate(x => go(x), pg); await p.waitForTimeout(700);
    if (process.env.CONTROL) await p.evaluate(h => document.querySelector(".sv-app").insertAdjacentHTML("beforeend", h), X("controle")); // controle: injeção proposital
    await scan(pg);
    const tabs = await p.evaluate(() => [...document.querySelectorAll(".sv-gamenav [data-tab], .sv-sttabs button, .sv-app [role=tab]")].filter(e => e.getClientRects().length).length);
    for (let t = 0; t < Math.min(tabs, 12); t++) { await p.evaluate(t => [...document.querySelectorAll(".sv-gamenav [data-tab], .sv-sttabs button, .sv-app [role=tab]")].filter(e => e.getClientRects().length)[t]?.click(), t); await p.waitForTimeout(250); await scan(pg + " (aba)"); }
  }
  // janelas e busca com o jogo
  const acts = [["manage", "details"], ["manage", "sessions"], ["manage", "playthroughs"], ["manage", "dlc"], ["manage", "notes"], ["manage", "achievements"], ["share-card", ""], ["review", ""]];
  await p.evaluate(x => go(x), G); await p.waitForTimeout(600);
  for (const [a, sec] of acts) {
    await p.evaluate(([a, sec, G]) => { const b = document.createElement("button"); b.hidden = true; b.dataset.action = a; if (sec) b.dataset.section = sec; b.dataset.path = G; b.dataset.kind = "game"; document.querySelector(".sv-app").appendChild(b); b.click(); b.remove(); }, [a, sec, G]);
    await p.waitForTimeout(700); await scan(`janela ${a} ${sec}`); await p.keyboard.press("Escape"); await p.waitForTimeout(250);
  }
  for (const q of ["Z", "Ztitle", "<img"]) {
    await p.evaluate(() => { const b = document.createElement("button"); b.hidden = true; b.dataset.action = "search-open"; document.querySelector(".sv-app").appendChild(b); b.click(); b.remove(); });
    await p.waitForTimeout(300); await p.keyboard.type(q); await p.waitForTimeout(500); await scan(`busca "${q}"`); await p.keyboard.press("Escape"); await p.waitForTimeout(200);
  }
  for (const v of cut) console.log("  " + v);
  if (errs.length) console.log("  erros de script:", [...new Set(errs)].slice(0, 5));
  console.log(cut.size ? `${cut.size} problemas de escape` : `Nenhum nome interpretado como HTML (${pages.length} telas, abas, ${acts.length} janelas e a busca)`);
  await b.close(); server.close();
})();
