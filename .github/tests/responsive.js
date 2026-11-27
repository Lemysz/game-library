// Responsividade: abre cada tela em 320, 360, 390 e 430 px (celular, toque) e no
// computador, nos temas escuro e claro; no tema escuro também o celular deitado
// (780×360) e uma janela média do computador (1100 px). Falha com erro de JavaScript, tela vazia,
// rolagem lateral ou conteúdo fora da tela. Avisa (sem falhar) sobre áreas de
// toque menores que 32 px (área efetiva, com o ::after que a amplia) e textos
// cortados sem reticências.
//
//   node responsive.js                 todas as larguras e os dois temas
//   SV_WIDTHS=320,390 node responsive.js
//   SV_THEMES=light node responsive.js
//   SV_NO_EXTRA=1 node responsive.js   sem o celular deitado e a janela média
//   SV_ONLY=Biblioteca node responsive.js
//   SV_SHOTS=shots node responsive.js  salva uma captura por tela/largura/tema
const fs = require("fs"), path = require("path");
const { start, screenTargets, launchBrowser } = require("./server");

const MOBILE = (process.env.SV_WIDTHS || "320,360,390,430").split(",").map(Number).filter(Boolean);
const THEMES = (process.env.SV_THEMES || "dark,light").split(",");
const DESKTOP = process.env.SV_NO_DESKTOP ? [] : [{ tag: "desktop", viewport: { width: 1400, height: 900 } }];
const SHOTS = process.env.SV_SHOTS ? path.resolve(process.env.SV_SHOTS) : null;

(async () => {
	const { server, data, url } = await start();
	const targets = screenTargets(data);
	const browser = await launchBrowser();
	const fails = [], warns = new Map();
	if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
	const viewports = [
		...MOBILE.map(w => ({ tag: `${w}px`, viewport: { width: w, height: Math.round(w * 2.16) }, isMobile: true, hasTouch: true })),
		...DESKTOP,
		// 1.14.2: celular deitado e janela média (a tela de Configurações rolava
		// para o lado nessas larguras e nenhuma das outras pegava)
		...(process.env.SV_NO_EXTRA ? [] : [
			{ tag: "deitado", viewport: { width: 780, height: 360 }, isMobile: true, hasTouch: true, firstTheme: true },
			{ tag: "1100px", viewport: { width: 1100, height: 800 }, firstTheme: true }
		])
	];

	for (const theme of THEMES) for (const vp of viewports) {
		if (vp.firstTheme && theme !== THEMES[0]) continue;
		const ctx = await browser.newContext({ viewport: vp.viewport, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, reducedMotion: "reduce", colorScheme: theme });
		const page = await ctx.newPage();
		// erros de script: o harness já registra "error" e "unhandledrejection" em window.__errors
		await page.goto(url + "?p=" + encodeURIComponent("Dashboard/Home.md"));
		await page.waitForFunction(() => window.__ready, null, { timeout: 30000 });
		await page.evaluate(t => {
			document.body.classList.toggle("theme-light", t === "light");
			document.body.classList.toggle("theme-dark", t !== "light");
			if (!matchMedia("(pointer: coarse)").matches) document.body.classList.remove("is-mobile", "is-phone");
		}, theme);

		for (const target of targets) {
			await page.evaluate(async p => { window.__errors.length = 0; await go(p); }, target);
			await page.waitForTimeout(500);
			await page.evaluate(async () => { const l = document.querySelector(".sv-layer"); if (!l) return; for (let y = 0; y < l.scrollHeight; y += 700) { l.scrollTop = y; await new Promise(r => setTimeout(r, 30)); } l.scrollTop = 0; });
			await page.waitForTimeout(250);
			const r = await page.evaluate(([VW, mob]) => {
				const R = el => el.getBoundingClientRect();
				const vis = el => { const b = R(el); if (!b.width || !b.height) return false; const cs = getComputedStyle(el); return cs.visibility !== "hidden" && cs.display !== "none" && +cs.opacity > 0.05; };
				const name = el => (typeof el.className === "string" && el.className.split(" ")[0]) || el.tagName.toLowerCase();
				const app = document.querySelector(".sv-app"), L = document.querySelector(".sv-layer");
				const out = { errors: window.__errors.slice(0, 3), rendered: !!app && (app.innerText || "").trim().length > 40, hscroll: !!L && L.scrollWidth > L.clientWidth + 1, outside: [], small: [], cut: [], spill: [] };
				if (!app) return out;
				// dentro de um contêiner com rolagem/corte próprio (faixas roláveis) não conta
				const clipped = el => { for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) { if (e === L || e.classList.contains("sv-host")) return false; if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(e).overflowX)) return true; } return false; };
				for (const el of app.querySelectorAll(".sv-content *")) {
					if (!vis(el) || el.closest(".sv-menu, [hidden], .sv-modal-root, .sv-toasts")) continue;
					const b = R(el);
					if ((b.right > VW + 1 || b.left < -1) && !clipped(el)) out.outside.push(`${name(el)} ${Math.round(b.left)}..${Math.round(b.right)}`);
				}
				// área de toque efetiva: a caixa do elemento somada à extensão de um ::after
				// absoluto (inset negativo), a menos que o próprio elemento corte o ::after
				// (overflow); um input escondido dentro de um <label> vale pelo label
				const touchBox = el => {
					if (getComputedStyle(el).pointerEvents === "none" && el.closest("label")) el = el.closest("label");
					const b = R(el); let w = b.width, h = b.height;
					const cs = getComputedStyle(el), a = getComputedStyle(el, "::after");
					if (a.content !== "none" && a.position === "absolute" && cs.overflow === "visible") {
						const px = v => Math.max(0, -parseFloat(v) || 0);
						w += px(a.left) + px(a.right); h += px(a.top) + px(a.bottom);
					}
					return [w, h];
				};
				if (mob) for (const el of app.querySelectorAll("button, a[href], [role=button], [role=tab], select, input[type=checkbox]")) {
					if (!vis(el) || el.closest("[hidden], .sv-menu:not(.is-open), .sv-sr")) continue;
					if (el.matches(".sv-content a") && getComputedStyle(el).display === "inline") continue;
					const b = R(el); if (b.bottom < 0 || b.top > innerHeight * 3) continue;
					const [w, h] = touchBox(el);
					if (w < 31.5 || h < 31.5) out.small.push(`${name(el)} ${Math.round(w)}×${Math.round(h)}`);
				}
				for (const el of app.querySelectorAll(".sv-content h1, .sv-content h2, .sv-content h3, .sv-content .sv-btn, .sv-content p")) {
					if (!vis(el)) continue; const cs = getComputedStyle(el);
					if (cs.textOverflow === "ellipsis" || +cs.webkitLineClamp > 0 || cs.overflow === "visible") continue;
					if (el.scrollWidth > el.clientWidth + 2) out.cut.push(`${name(el)}: ${el.textContent.trim().slice(0, 28)}`);
				}
				// números do topo da ficha: a legenda não pode invadir a coluna vizinha
				for (const el of app.querySelectorAll(".sv-hero-stats > * span, .sv-hero-stats > * b")) {
					if (!vis(el) || el.closest(".sv-hero-ach-unknown")) continue;
					const cell = el.closest(".sv-hero-stats > *"), b = R(el), c = R(cell);
					if (b.left + el.scrollWidth > c.right + 1) out.spill.push(`${name(cell)}: ${el.textContent.trim().slice(0, 24)}`);
				}
				return out;
			}, [vp.viewport.width, !!vp.isMobile]);
			const problems = [...r.errors, !r.rendered && "tela vazia", r.hscroll && "rolagem lateral", r.outside.length && `${r.outside.length} elementos fora da tela (ex.: ${r.outside[0]})`, r.spill.length && `texto invade a coluna vizinha (${r.spill[0]})`].filter(Boolean);
			const label = `${theme.padEnd(5)} ${vp.tag.padEnd(7)} ${target}`;
			console.log(`${problems.length ? "FAIL" : "ok  "} ${label}${problems.length ? "\n     " + problems.join("\n     ") : ""}`);
			if (problems.length) fails.push(label);
			for (const [k, list] of [["toque < 32 px", r.small], ["texto cortado", r.cut]]) for (const x of new Set(list)) {
				const key = `${k}: ${target.replace(/^Dashboard\//, "")} › ${process.env.SV_SIZES ? x : x.replace(/ \d+×\d+$/, "")}`;
				if (!warns.has(key)) warns.set(key, new Set());
				warns.get(key).add(vp.tag);
			}
			if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${theme}-${vp.tag}-${target.replace(/[^\w]+/g, "_")}.png`) });
		}
		await ctx.close();
	}

	if (warns.size) {
		console.log(`\nAvisos (não falham o teste): ${warns.size}`);
		for (const [k, tags] of [...warns].slice(0, 60)) console.log(`  ·  ${k}  [${[...tags].join(", ")}]`);
	}
	await browser.close(); server.close();
	console.log(fails.length ? `\n${fails.length} tela(s) com problema` : "\nTodas as telas passaram em todas as larguras e temas");
	process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
