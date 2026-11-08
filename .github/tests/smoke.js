// Abre cada tela do vault num Chromium sem interface, no celular e no computador,
// e falha se aparecer erro de JavaScript, tela vazia ou rolagem lateral.
const fs = require("fs"), path = require("path");
const { start } = require("./server");

let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("playwright-core")); }

const VIEWPORTS = [
	{ tag: "celular", viewport: { width: 410, height: 887 }, isMobile: true, hasTouch: true },
	{ tag: "computador", viewport: { width: 1400, height: 900 } },
	// a mesma passada em inglês (Configurações › Aparência › Idioma)
	{ tag: "inglês", viewport: { width: 410, height: 887 }, isMobile: true, hasTouch: true, lang: "en" }
];
const SHOTS = process.env.SV_SHOTS ? path.resolve(process.env.SV_SHOTS) : null;

(async () => {
	const { server, data, url } = await start();
	const real = p => p.fm && !p.path.includes("_Templates") && !p.path.startsWith("_install/");
	const first = type => data.pages.find(p => real(p) && p.fm.type === type)?.path;
	const targets = [
		...data.pages.filter(p => p.path.startsWith("Dashboard/") && p.page).map(p => p.path).sort(),
		first("game"), first("platform"), first("genre"), first("subgenre"), first("franchise"), first("collection"), first("achievement")
	].filter(Boolean).filter(p => !process.env.SV_ONLY || p.includes(process.env.SV_ONLY));

	const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
	const fails = [];
	if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

	for (const vp of VIEWPORTS) {
		const ctx = await browser.newContext({ viewport: vp.viewport, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, reducedMotion: "reduce" });
		if (vp.lang) await ctx.addInitScript(l => localStorage.setItem("steamvault:ui:lang", l), vp.lang);
		const page = await ctx.newPage();
		page.on("pageerror", e => page.evaluate(m => window.__errors.push("pageerror: " + m), e.message).catch(() => {}));
		await page.goto(url + "?p=" + encodeURIComponent("Dashboard/Home.md"));
		await page.waitForFunction(() => window.__ready, null, { timeout: 30000 });

		const check = async name => {
			const r = await page.evaluate(() => {
				const app = document.querySelector(".sv-app"), layer = document.querySelector(".sv-layer");
				return {
					errors: window.__errors.slice(0, 3),
					rendered: !!app && (app.innerText || "").trim().length > 40,
					hscroll: !!layer && layer.scrollWidth > layer.clientWidth + 1
				};
			});
			const problems = [...r.errors, !r.rendered && "tela vazia", r.hscroll && "rolagem lateral"].filter(Boolean);
			console.log(`${problems.length ? "FAIL" : "ok  "} ${vp.tag.padEnd(10)} ${name}${problems.length ? "\n     " + problems.join("\n     ") : ""}`);
			if (problems.length) fails.push(`${vp.tag} ${name}`);
			if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${vp.tag}-${name.replace(/[^\w]+/g, "_")}.png`) });
		};

		for (const target of targets) {
			await page.evaluate(async p => { window.__errors.length = 0; await go(p); }, target);
			await page.waitForTimeout(700);
			// rola até o fim para montar as partes que só aparecem sob demanda
			await page.evaluate(async () => { const l = document.querySelector(".sv-layer"); if (!l) return; for (let y = 0; y < l.scrollHeight; y += 700) { l.scrollTop = y; await new Promise(r => setTimeout(r, 40)); } l.scrollTop = 0; });
			await page.waitForTimeout(300);
			await check(target);
		}

		// abas do hub de conquistas e das estatísticas
		for (const [target, sel] of [["Dashboard/Conquistas.md", "[data-hub-tab]"], ["Dashboard/Estatísticas.md", "[data-st-tab]"]]) {
			await page.evaluate(async p => { window.__errors.length = 0; await go(p); }, target);
			await page.waitForTimeout(600);
			const n = await page.evaluate(s => document.querySelectorAll(s).length, sel);
			for (let i = 0; i < n; i++) {
				await page.evaluate(([s, k]) => document.querySelectorAll(s)[k]?.click(), [sel, i]);
				await page.waitForTimeout(250);
			}
			await check(`${target} (${n} abas)`);
		}

		// jogo na lista de desejos, com preço e histórico (ficha e tela Lista de desejos)
		const wishPath = await page.evaluate(() => {
			const base = __PAGES.find(x => x.fm?.type === "game" && !x.path.includes("_Templates"));
			if (!base) return null;
			const path = base.path.replace(/[^/]+\.md$/, "Teste Lista de Desejos.md");
			const hist = [46.99, 30.5, 46.99, 23.99].map((p, i) => ({ d: `2026-0${i + 3}-10`, p, s: "steam" }));
			const pg = { path, page: "game", fm: { ...base.fm, title: "Teste Lista de Desejos", status: "Wishlist", hoursPlayed: 0, sessions: [], currentPrice: 23.99, regularPrice: 46.99, discountPercent: 49, targetPrice: 25, lowestSeenPrice: 23.99, lowestSeenDate: "2026-06-10", priceStore: "steam", priceUrl: "https://store.steampowered.com/app/1/", priceCheckedAt: "2026-10-01T10:00:00Z", priceHistory: hist } };
			__PAGES.push(pg); __FILES.push(path); byPath.set(path, pg); fileSet.add(path);
			customJS.SteamVaultCore.invalidate();
			return path;
		});
		if (wishPath) for (const target of [wishPath, "Dashboard/Lista de Desejos.md"]) {
			await page.evaluate(async p => { window.__errors.length = 0; await go(p); }, target);
			await page.waitForTimeout(700);
			await check(`${target} (com jogo na lista de desejos)`);
		}

		// vault vazio: a Início vira o assistente de primeiros passos
		await page.evaluate(async () => {
			window.__errors.length = 0;
			const keep = __PAGES.filter(x => !x.fm || (x.fm.type !== "game" && x.fm.type !== "achievement"));
			__PAGES.splice(0, __PAGES.length, ...keep);
			customJS.SteamVaultCore.invalidate();
			await go("Dashboard/Home.md");
		});
		await page.waitForTimeout(600);
		const onboard = await page.evaluate(() => !!document.querySelector(".sv-onboard"));
		if (!onboard) { console.log(`FAIL ${vp.tag.padEnd(10)} vault vazio sem os primeiros passos`); fails.push(`${vp.tag} vault vazio`); }
		await check("vault vazio");
		await ctx.close();
	}

	await browser.close();
	server.close();
	console.log(fails.length ? `\n${fails.length} tela(s) com problema` : `\nTodas as telas abriram sem erro`);
	process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
