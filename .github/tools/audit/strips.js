const ROOT = require("path").resolve(__dirname, "../../..");
const { start } = require(ROOT + "/.github/tests/server"); const { chromium } = require(ROOT + "/.github/tests/node_modules/playwright");
const fs = require("fs");
const pages = fs.readdirSync(ROOT + "/Dashboard").filter(f => f.endsWith(".md")).map(f => "Dashboard/" + f).concat(["Games/PC/Resident Evil 4.md"]);
(async () => { const { server, url } = await start(); const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const p = await (await b.newContext({ viewport: { width: 410, height: 887 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" })).newPage();
await p.goto(url + "?p=Dashboard/Home.md"); await p.waitForFunction(() => window.__ready);
for (const pg of pages) {
  await p.evaluate(x => go(x), pg); await p.waitForTimeout(700);
  const r = await p.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll(".sv-content *")) {
      const cs = getComputedStyle(el);
      if (!/(auto|scroll)/.test(cs.overflowX) || el.scrollWidth <= el.clientWidth + 2 || !el.getClientRects().length) continue;
      const kids = [...el.children].filter(k => k.getClientRects().length && getComputedStyle(k).position !== "absolute");
      if (!kids.length) continue;
      el.scrollLeft = el.scrollWidth;
      const er = el.getBoundingClientRect(), last = kids[kids.length - 1].getBoundingClientRect(), first = kids[0];
      el.scrollLeft = 0;
      const lead = Math.round(first.getBoundingClientRect().left - er.left);
      const trail = Math.round(er.right - last.right);
      if (trail > Math.max(lead, 0) + 24) out.push(`${el.className.split(" ").slice(0, 2).join(".")}: começo ${lead}px, fim ${trail}px`);
    }
    return out;
  });
  if (r.length) console.log(pg.replace("Dashboard/", "").padEnd(28), r.join(" · "));
}
console.log("fim"); await b.close(); server.close(); })();
