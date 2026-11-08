// Game Library — inicialização das telas.
// Cada nota chama: await dv.view("Assets/steamvault-boot", { page: "home" })
// Ao abrir o Obsidian, o Dataview roda antes do CustomJS terminar de carregar
// os scripts de Scripts/. Em vez do erro "customJS is not defined", mostra a
// tela de carregamento até a Game Library ficar pronta e então monta a página.
return (async () => {
	const page = (input && input.page) || "home";
	// pronto = todos os módulos de Scripts/ carregados (ou os obrigatórios há 2 s,
	// caso algum opcional tenha sido removido do vault)
	let coreSince = 0;
	const ready = () => {
		const sv = typeof window.customJS !== "undefined" && window.customJS ? window.customJS.SteamVault : null;
		if (!sv) return false;
		const st = typeof sv.bootState === "function" ? sv.bootState() : "all";
		if (st === "all") return true;
		if (st === "core") { coreSince = coreSince || Date.now(); return Date.now() - coreSince > 2000; }
		return false;
	};
	if (ready()) return window.customJS.SteamVault.render(dv, page);

	const host = dv.container;
	const leaf = host.closest(".workspace-leaf-content");
	const view = leaf && !host.closest(".markdown-embed, .hover-popover, .popover, .canvas-node, .internal-embed") ? leaf.querySelector(":scope > .view-content") : null;
	const light = document.body.classList.contains("theme-light");
	const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
	const splash = document.createElement("div");
	splash.className = `sv-boot is-full${light ? " is-light" : ""}${reduce ? " is-still" : ""}`;
	splash.setAttribute("role", "status");
	splash.setAttribute("aria-live", "polite");
	// ícone: controle sobre o bloco azul. O mesmo desenho está no snippet
	// (steamvault.css, seção 38), que cobre a tela antes dos plugins: a troca
	// não salta, só ganha movimento (capas abrindo em leque, botões acendendo).
	const pad = "M15 14h18c5.6 0 10 4 10.9 9.5l1.7 10.6c.6 4.1-2.5 7.9-6.7 7.9-2.5 0-4.7-1.4-5.8-3.6L31.4 35H16.6l-1.7 3.4C13.8 40.6 11.6 42 9.1 42c-4.2 0-7.3-3.8-6.7-7.9l1.7-10.6C5 18 9.4 14 15 14z";
	const dpad = "M12.5 21h3v3.5H19v3h-3.5V31h-3v-3.5H9v-3h3.5z";
	splash.innerHTML = `<style>
		.sv-boot { position: relative; min-height: 70vh; overflow: hidden; background: #0b1119; color: #e8eef5; font-family: Inter, -apple-system, "Segoe UI", Roboto, system-ui, sans-serif; opacity: 1; transition: opacity .45s ease; }
		.sv-boot.is-cover { position: absolute; inset: 0; z-index: 40; min-height: 0; }
		/* na abertura cobre a tela toda, por cima das barras do Obsidian */
		.sv-boot.is-full { position: fixed; inset: 0; z-index: 9999; min-height: 0; }
		.sv-boot.is-light { background: #eef3f8; color: #13202e; }
		.sv-boot.is-out { opacity: 0; pointer-events: none; }
		/* mesma geometria da tela em CSS (steamvault.css, seção 38) */
		.sv-boot-glow { position: absolute; left: calc(50% - 150px); top: calc(50% - 190px); width: 300px; height: 300px; border-radius: 50%; background: radial-gradient(closest-side, rgba(52, 150, 255, .30), rgba(110, 90, 255, .10) 55%, transparent); opacity: 0; animation: svBootGlowIn .9s ease .1s forwards, svBootBreathe 3.2s ease-in-out 1s infinite; pointer-events: none; }
		.sv-boot.is-light .sv-boot-glow { background: radial-gradient(closest-side, rgba(52, 140, 255, .22), transparent); }
		.sv-boot-stage { position: absolute; left: calc(50% - 38px); top: calc(50% - 78px); width: 76px; height: 76px; transition: transform .45s cubic-bezier(.3, 0, .2, 1); }
		.sv-boot.is-out .sv-boot-stage { transform: scale(1.12); }
		.sv-boot-card { position: absolute; left: 18px; top: 10px; width: 40px; height: 54px; border-radius: 9px; box-shadow: 0 8px 18px -8px rgba(0, 0, 0, .6), inset 0 0 0 1px rgba(255, 255, 255, .16); transform: translate(var(--x), var(--y)) rotate(var(--r)); animation: svBootDeal .75s cubic-bezier(.2, .9, .25, 1.15) var(--d) backwards, svBootSway 2.8s ease-in-out calc(var(--d) + .75s) infinite alternate; }
		.sv-boot-card::after { content: ""; position: absolute; left: 6px; right: 6px; bottom: 6px; height: 4px; border-radius: 4px; background: rgba(255, 255, 255, .45); }
		.sv-boot-card.c1 { --x: -31px; --y: -12px; --r: -17deg; --d: .15s; background: linear-gradient(160deg, #8b7bff, #4b3bb8); }
		.sv-boot-card.c2 { --x: 0px; --y: -27px; --r: 0deg; --d: .25s; background: linear-gradient(160deg, #ffb547, #e0662a); }
		.sv-boot-card.c3 { --x: 31px; --y: -12px; --r: 17deg; --d: .35s; background: linear-gradient(160deg, #3fe0b0, #138a8a); }
		.sv-boot-tile { position: absolute; inset: 0; width: 76px; height: 76px; filter: drop-shadow(0 16px 22px rgba(26, 110, 240, .45)); animation: svBootFloat 3s ease-in-out .9s infinite; }
		.sv-boot-btn { fill: #1d63e0; animation: svBootBtn 2.4s ease-in-out infinite; }
		.sv-boot-btn.b1 { animation-delay: .6s; } .sv-boot-btn.b2 { animation-delay: .8s; } .sv-boot-btn.b3 { animation-delay: 1s; } .sv-boot-btn.b4 { animation-delay: 1.2s; }
		.sv-boot-name { position: absolute; left: 0; right: 0; top: calc(50% + 52px); transform: translateY(-50%); text-align: center; font-size: 1.35rem; font-weight: 800; letter-spacing: -.01em; line-height: 1.2; }
		.sv-boot-sub { position: absolute; left: 24px; right: 24px; top: calc(50% + 78px); text-align: center; font-size: .9rem; opacity: .62; }
		.sv-boot-bar { position: absolute; left: calc(50% - 74px); top: calc(50% + 92px); width: 148px; height: 4px; border-radius: 99px; overflow: hidden; background: rgba(127, 150, 175, .22); }
		.sv-boot-bar::after { content: ""; position: absolute; top: 0; bottom: 0; left: -45%; width: 45%; border-radius: inherit; background: linear-gradient(90deg, transparent, #3cb8ff 40%, #8b7bff 70%, transparent); animation: svBootBar 1.4s cubic-bezier(.45, 0, .25, 1) infinite; }
		.sv-boot-help { position: absolute; left: calc(50% - 150px); top: calc(50% + 110px); width: 300px; text-align: center; font-size: .85rem; line-height: 1.45; opacity: .8; }
		.sv-boot-help code { padding: 1px 5px; border-radius: 5px; background: rgba(127, 150, 175, .2); }
		.sv-boot.is-still *, .sv-boot.is-still *::after { animation: none !important; }
		.sv-boot.is-still .sv-boot-glow { opacity: 1; }
		@keyframes svBootDeal { from { transform: translate(0, 8px) rotate(0) scale(.6); opacity: 0; } }
		@keyframes svBootSway { to { transform: translate(var(--x), calc(var(--y) - 3px)) rotate(calc(var(--r) * 1.15)); } }
		@keyframes svBootFloat { 50% { transform: translateY(-4px); } }
		@keyframes svBootBtn { 0%, 30%, 100% { fill: #1d63e0; } 10%, 18% { fill: #ffc94a; } }
		@keyframes svBootGlowIn { to { opacity: 1; } }
		@keyframes svBootBreathe { 50% { transform: scale(1.08); } }
		@keyframes svBootBar { 0% { left: -45%; } 100% { left: 100%; } }
	</style>
	<div class="sv-boot-glow"></div>
	<div class="sv-boot-stage" aria-hidden="true">
		<span class="sv-boot-card c1"></span><span class="sv-boot-card c3"></span><span class="sv-boot-card c2"></span>
		<svg class="sv-boot-tile" viewBox="0 0 76 76"><defs><linearGradient id="sv-boot-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3cb8ff"/><stop offset="1" stop-color="#1d63e0"/></linearGradient></defs><rect width="76" height="76" rx="22" fill="url(#sv-boot-g)"/><rect x=".5" y=".5" width="75" height="75" rx="21.5" fill="none" stroke="#fff" stroke-opacity=".22"/><g transform="translate(14 10)"><path fill="#fff" d="${pad}"/><path fill="#1d63e0" d="${dpad}"/><circle class="sv-boot-btn b1" cx="34" cy="22.2" r="2.1"/><circle class="sv-boot-btn b2" cx="37.8" cy="26" r="2.1"/><circle class="sv-boot-btn b3" cx="34" cy="29.8" r="2.1"/><circle class="sv-boot-btn b4" cx="30.2" cy="26" r="2.1"/></g></svg>
	</div>
	<div class="sv-boot-name">Game Library</div>
	<div class="sv-boot-bar"></div>`;
	// várias notas abrindo juntas (abas no computador) dividem uma tela só
	const shared = document.querySelector("body > .sv-boot.is-full");
	if (shared) { shared.__svUsers = (shared.__svUsers || 1) + 1; splash.__svShared = shared; }
	else document.body.appendChild(splash);
	const screen = splash.__svShared || splash;
	const release = () => {
		screen.__svUsers = (screen.__svUsers || 1) - 1;
		if (screen.__svUsers > 0) return;
		screen.classList.add("is-out");
		setTimeout(() => screen.remove(), 480);
	};

	// espera o CustomJS (até ~40 s em aparelhos lentos)
	const t0 = Date.now();
	while (!ready() && Date.now() - t0 < 40000) {
		await new Promise(r => setTimeout(r, 60));
		if (!host.isConnected) return release(); // a nota foi fechada
	}
	if (!ready()) {
		// não prende o Obsidian: o aviso fica só dentro da nota
		const note = splash.cloneNode(true);
		release();
		note.classList.remove("is-full", "is-out");
		if (view) { note.classList.add("is-cover"); view.appendChild(note); } else host.appendChild(note);
		note.querySelector(".sv-boot-bar")?.remove();
		const sub = document.createElement("div");
		sub.className = "sv-boot-sub";
		let en = false; try { en = localStorage.getItem("steamvault:ui:lang") === "en"; } catch (_) {}
		sub.textContent = en ? "Game Library didn't load" : "A Game Library não carregou";
		note.appendChild(sub);
		const help = document.createElement("div");
		help.className = "sv-boot-help";
		help.innerHTML = en ? "Check that the <b>CustomJS</b> plugin is on and points to the <code>Scripts/</code> folder. Then reopen this note." : "Confira se o plugin <b>CustomJS</b> está ativo e aponta para a pasta <code>Scripts/</code>. Depois, reabra esta nota.";
		note.appendChild(help);
		return;
	}
	try {
		await window.customJS.SteamVault.render(dv, page);
	} finally {
		// um quadro depois, para a página já estar pintada atrás da tela
		requestAnimationFrame(() => requestAnimationFrame(release));
	}
})();
