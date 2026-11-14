// ==========================================================================
// Game Library — UI (componentes do design system)
// Funções puras que devolvem HTML. Nenhuma delas lê o vault: recebem os
// objetos já normalizados pelo SteamVaultCore.
//
// Acesso: customJS.SteamVaultUI
// ==========================================================================

class SteamVaultUI {

	constructor() {
		this.nav = [
			{ id: "library", label: "Biblioteca", items: [
				{ id: "home", label: "Início", icon: "home", path: "Dashboard/Home" },
				{ id: "library", label: "Biblioteca", icon: "grid", path: "Dashboard/Biblioteca" },
				{ id: "collections", label: "Coleções", icon: "stack", path: "Dashboard/Coleções" },
				{ id: "wishlist", label: "Lista de desejos", icon: "bell", path: "Dashboard/Lista de Desejos" },
				{ id: "platforms", label: "Plataformas", icon: "monitor", path: "Dashboard/Plataformas" },
				{ id: "genres", label: "Gêneros", icon: "masks", path: "Dashboard/Gêneros" },
				{ id: "subgenres", label: "Subgêneros", icon: "tag", path: "Dashboard/Subgêneros" },
				{ id: "franchises", label: "Franquias", icon: "layers", path: "Dashboard/Franquias" }
			] },
			// Steam logo depois da biblioteca: é a plataforma principal da Game Library
			{ id: "steam", label: "Steam", tone: "steam", items: [
				{ id: "steam-profile", label: "Perfil Steam", icon: "user", path: "Dashboard/Steam" },
				{ id: "steam-activity", label: "Atividade", icon: "pulse", path: "Dashboard/Steam Atividade" },
				{ id: "steam-library", label: "Biblioteca Steam", icon: "books", path: "Dashboard/Steam Biblioteca" },
				{ id: "steam-showcase", label: "Vitrine", icon: "sparkles", path: "Dashboard/Steam Vitrine" }
			] },
			{ id: "gaming", label: "Progresso", items: [
				{ id: "player", label: "Perfil", icon: "user", path: "Dashboard/Perfil" },
				{ id: "achievements", label: "Conquistas", icon: "trophy", path: "Dashboard/Conquistas" },
				{ id: "tierlist", label: "Tier List", icon: "rows", path: "Dashboard/Tier List" }
			] },
			{ id: "analytics", label: "Análises", items: [
				{ id: "statistics", label: "Estatísticas", icon: "chart", path: "Dashboard/Estatísticas" }
			] },
			// Integrações: o hub com todas as contas e os perfis das outras plataformas
			{ id: "platforms-linked", label: "Integrações", tone: "platforms", items: [
				{ id: "integrations", label: "Todas as contas", icon: "link", path: "Dashboard/Integrações" },
				{ id: "xbox-profile", label: "Perfil Xbox", icon: "b-xbox", path: "Dashboard/Xbox" },
				{ id: "psn-profile", label: "Perfil PlayStation", icon: "b-playstation", path: "Dashboard/PlayStation" },
				{ id: "nintendo-profile", label: "Perfil Nintendo", icon: "b-nintendo", path: "Dashboard/Nintendo" },
				{ id: "gog-profile", label: "Perfil GOG", icon: "b-gog", path: "Dashboard/GOG" },
				{ id: "epic-profile", label: "Perfil Epic", icon: "b-epic", path: "Dashboard/Epic Games" },
				{ id: "googleplay-profile", label: "Perfil Play Games", icon: "b-googleplay", path: "Dashboard/Google Play Games" }
			] },
			// RetroAchievements: seção complementar, por último e mais discreta
			{ id: "retro", label: "RetroAchievements", tone: "retro", items: [
				{ id: "retro", label: "Perfil RA", icon: "b-retro", path: "Dashboard/RetroAchievements" },
				{ id: "retro-games", label: "Jogos RA", icon: "stack", path: "Dashboard/RetroAchievements Jogos" },
				{ id: "retro-achievements", label: "Conquistas RA", icon: "medal", path: "Dashboard/RetroAchievements Conquistas" }
			] }
		];
		this.settingsItem = { id: "settings", label: "Configurações", icon: "gear", path: "Dashboard/Configurações" };
		this.mobileNav = ["home", "library", "achievements", "player"];
	}

	// ---------------------------------------------------------- utilidades
	// meses curtos no idioma escolhido (Configurações › Aparência › Idioma)
	get months() {
		let en = false;
		try { en = localStorage.getItem("steamvault:ui:lang") === "en"; } catch (_) {}
		return en ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] : ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
	}

	// lista longa: os primeiros itens já montados; o resto num <template>
	// (fora do layout) até a pessoa tocar em "Mostrar mais"
	moreList(items, first, label = "Mostrar mais") {
		if (items.length <= first + 2) return items.join("");
		const rest = items.length - first;
		return `${items.slice(0, first).join("")}<template data-sv-more>${items.slice(first).join("")}</template><button type="button" class="sv-morebtn" data-action="show-more">${this.icon("chevronDown")}<span>${this.esc(label)} (${this.fmtNum(rest)})</span></button>`;
	}

	// 3.55.0: janela que não passa por V.modal (escolha do jogo na Steam,
	// retrospectiva): o Tab fica dentro dela e, ao fechar, o foco volta para
	// quem abriu. Devolve a função que solta o foco.
	trapFocus(root, { initial = null } = {}) {
		const opener = document.activeElement;
		const sel = 'button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])';
		const list = () => [...root.querySelectorAll(sel)].filter(el => !el.disabled && el.offsetParent !== null);
		const onKey = e => {
			if (e.key !== "Tab" || !root.isConnected) return;
			const f = list(), a = document.activeElement;
			if (!f.length) { e.preventDefault(); return; }
			if (!root.contains(a)) { e.preventDefault(); f[0].focus(); }
			else if (e.shiftKey && a === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
			else if (!e.shiftKey && a === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
		};
		document.addEventListener("keydown", onKey, true);
		setTimeout(() => (initial?.() || list()[0] || root)?.focus?.({ preventScroll: true }), 0);
		return () => {
			document.removeEventListener("keydown", onKey, true);
			if (opener?.isConnected && !root.contains(opener)) opener.focus?.({ preventScroll: true });
		};
	}

	esc(v) {
		if (v === null || v === undefined) return "";
		const s = String(v);
		if (s === "undefined" || s === "null" || s === "NaN") return "";
		return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
	}

	attr(v) { return this.esc(v); }

	fmtNum(n, digits = 0) {
		if (n === null || n === undefined || !Number.isFinite(Number(n))) return "—";
		// formatadores reaproveitados: toLocaleString cria um a cada chamada, e
		// uma tela chama isto centenas de vezes
		const f = (this.__nf ||= {})[digits] ||= new Intl.NumberFormat("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
		return f.format(Number(n));
	}

	fmtHours(h) {
		const n = Number(h) || 0;
		if (n === 0) return "0 h";
		if (n < 1) return `${Math.round(n * 60)} min`;
		return `${this.fmtNum(n, n < 100 ? 1 : 0)} h`;
	}

	fmtPct(p) { return p === null || p === undefined ? "—" : `${this.fmtNum(p, p % 1 ? 1 : 0)}%`; }

	fmtMoney(n) {
		if (n === null || n === undefined || !Number.isFinite(Number(n))) return "—";
		return (this.__brl ||= new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })).format(Number(n));
	}

	fmtDate(iso, { year = true } = {}) {
		const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
		if (!m) return "";
		const s = `${Number(m[3])} ${this.months[Number(m[2]) - 1]}`;
		return year ? `${s} ${m[1]}` : s;
	}

	relDate(iso) {
		if (!iso) return "";
		const d = Math.round((new Date(new Date().toDateString()) - new Date(iso + "T00:00:00")) / 86400000);
		if (d <= 0) return "hoje";
		if (d === 1) return "ontem";
		if (d < 7) return `há ${d} dias`;
		if (d < 30) return `há ${Math.round(d / 7)} sem.`;
		if (d < 365) { const m = Math.max(1, Math.round(d / 30)); return `há ${m} ${m === 1 ? "mês" : "meses"}`; }
		return this.fmtDate(iso);
	}

	plural(n, one, many) { return `${this.fmtNum(n)} ${Number(n) === 1 ? one : many}`; }

	// ------------------------------------------------------------- ícones
	// 24×24, currentColor — um só vocabulário visual (3.40.0: o conjunto do
	// quadro de referência vem do Tabler Icons, Lucide, Phosphor e Simple Icons,
	// no traço original deles; os demais seguem no traço 1.75). Área útil
	// de 3 a 21 (margem de 3 em volta); exportados em Assets/Icons/ (3.35.0)
	get paths() {
		if (this._paths) return this._paths;
		this._paths = {
			home: `<g stroke-width="2"><path d="M5 12l-2 0l9 -9l9 9l-2 0" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7" /><path d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6" /></g>`,
			grid: `<g stroke-width="2"><path d="M4 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4" /><path d="M14 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4" /><path d="M4 15a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4" /><path d="M14 15a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4" /></g>`,
			list: `<g stroke-width="2"><path d="M9 6l11 0" /><path d="M9 12l11 0" /><path d="M9 18l11 0" /><path d="M5 6l0 .01" /><path d="M5 12l0 .01" /><path d="M5 18l0 .01" /></g>`,
			stack: `<path d="M5 8h14v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z"/><path d="M7 5h10M9 2.5h6"/>`,
			monitor: `<g stroke-width="2"><path d="M3 5a1 1 0 0 1 1 -1h16a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1v-10" /><path d="M7 20h10" /><path d="M9 16v4" /><path d="M15 16v4" /></g>`,
			masks: `<path d="M4 5.5c3 1 6 1 9 0v5a4.5 4.5 0 0 1-9 0z"/><path d="M13 9.5c2.3.8 4.7.8 7 0v4a4.5 4.5 0 0 1-8.2 2.6"/>`,
			layers: `<path d="M12 3.5 20.5 8 12 12.5 3.5 8z"/><path d="m3.5 12 8.5 4.5 8.5-4.5M3.5 16l8.5 4.5 8.5-4.5"/>`,
			trophy: `<g stroke-width="2"><path d="M8 21l8 0" /><path d="M12 17l0 4" /><path d="M7 4l10 0" /><path d="M17 4v8a5 5 0 0 1 -10 0v-8" /><path d="M3 9a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M17 9a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /></g>`,
			rows: `<path d="M4 5h3v4H4zM4 10.5h3v4H4zM4 16h3v4H4z"/><path d="M10 7h10M10 12.5h7M10 18h4"/>`,
			joystick: `<rect x="4" y="15" width="16" height="5" rx="1.5"/><path d="M12 15V9"/><circle cx="12" cy="6.5" r="2.8"/>`,
			user: `<g stroke-width="2"><path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" /><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" /></g>`,
			pulse: `<path d="M3 12h4l2.5-6 5 12 2.5-6h4"/>`,
			books: `<rect x="4" y="4" width="4.5" height="16" rx="1"/><rect x="9.5" y="4" width="4.5" height="16" rx="1"/><path d="m15.5 5.2 3.6-.9 2.8 15.2-3.6.9z"/>`,
			sparkles: `<path d="m10 3.5 1.6 4.4L16 9.5l-4.4 1.6L10 15.5l-1.6-4.4L4 9.5l4.4-1.6z"/><path d="m17.5 14 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>`,
			chart: `<g stroke-width="2"><path d="M3 13a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -6" /><path d="M15 9a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -10" /><path d="M9 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -14" /><path d="M4 20h14" /></g>`,
			gear: `<g stroke-width="2"><path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065" /><path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" /></g>`,
			search: `<g stroke-width="2"><path d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M21 21l-6 -6" /></g>`,
			heart: `<g stroke-width="2"><path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572" /></g>`,
			star: `<g stroke-width="2"><path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873l-6.158 -3.245" /></g>`,
			clock: `<g stroke-width="2"><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" /><path d="M12 7v5l3 3" /></g>`,
			play: `<path d="M7.5 4.8v14.4L19 12z"/>`,
			more: `<circle cx="5.5" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="18.5" cy="12" r="1.2" fill="currentColor"/>`,
			x: `<path d="M6 6l12 12M18 6 6 18"/>`,
			check: `<path d="m5 12.5 4.5 4.5L19 7"/>`,
			lock: `<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>`,
			refresh: `<g stroke-width="2"><path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" /><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" /></g>`,
			link: `<g stroke-width="2"><path d="M9 15l6 -6" /><path d="M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464" /><path d="M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463" /></g>`,
			external: `<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>`,
			edit: `<path d="m16.5 3.5 4 4L8 20H4v-4z"/>`,
			plus: `<path d="M12 5v14M5 12h14"/>`,
			chevronLeft: `<path d="m14.5 5.5-6.5 6.5 6.5 6.5"/>`,
			chevronRight: `<path d="m9.5 5.5 6.5 6.5-6.5 6.5"/>`,
			chevronDown: `<path d="m6 9.5 6 6 6-6"/>`,
			chevronUp: `<path d="m6 14.5 6-6 6 6"/>`,
			sidebar: `<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M9 4.5v15"/>`,
			menu: `<path d="M4 7h16M4 12h16M4 17h16"/>`,
			image: `<g stroke-width="2"><path d="M15 8h.01" /><path d="M3 6a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v12a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3v-12" /><path d="M3 16l5 -5c.928 -.893 2.072 -.893 3 0l5 5" /><path d="M14 14l1 -1c.928 -.893 2.072 -.893 3 0l3 3" /></g>`,
			music: `<path d="M9 17.5v-12l11-2v12"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="15.5" r="2.5"/>`,
			puzzle: `<g stroke-width="2"><path d="M4 7h3a1 1 0 0 0 1 -1v-1a2 2 0 0 1 4 0v1a1 1 0 0 0 1 1h3a1 1 0 0 1 1 1v3a1 1 0 0 0 1 1h1a2 2 0 0 1 0 4h-1a1 1 0 0 0 -1 1v3a1 1 0 0 1 -1 1h-3a1 1 0 0 1 -1 -1v-1a2 2 0 0 0 -4 0v1a1 1 0 0 1 -1 1h-3a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 1 -1h1a2 2 0 0 0 0 -4h-1a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 1 -1" /></g>`,
			notebook: `<rect x="5" y="3.5" width="14" height="17" rx="1.5"/><path d="M9 3.5v17M12 8h4M12 11.5h4"/>`,
			flag: `<path d="M5 21V4M5 4h12l-2.5 4.5L17 13H5"/>`,
			repeat: `<path d="m17 3.5 3 3-3 3"/><path d="M4 11V9.5a3 3 0 0 1 3-3h13M7 20.5l-3-3 3-3"/><path d="M20 13v1.5a3 3 0 0 1-3 3H4"/>`,
			calendar: `<g stroke-width="2"><path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2l0 -12" /><path d="M16 3l0 4" /><path d="M8 3l0 4" /><path d="M4 11l16 0" /><path d="M8 15h2v2h-2l0 -2" /></g>`,
			coins: `<ellipse cx="12" cy="7" rx="6.5" ry="2.8"/><path d="M5.5 7v5c0 1.5 2.9 2.8 6.5 2.8s6.5-1.3 6.5-2.8V7M5.5 12v5c0 1.5 2.9 2.8 6.5 2.8s6.5-1.3 6.5-2.8v-5"/>`,
			dice: `<g stroke-width="2"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/><circle cx="12" cy="7.2" r="1" fill="currentColor" stroke="none"/><circle cx="7.4" cy="14.6" r="1" fill="currentColor" stroke="none"/><circle cx="15.4" cy="12.8" r="1" fill="currentColor" stroke="none"/><circle cx="17.4" cy="15.8" r="1" fill="currentColor" stroke="none"/></g>`,
			download: `<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M4.5 19.5h15"/>`,
			alert: `<path d="M12 4 21 19.5H3z"/><path d="M12 10v4.5M12 17.2h.01"/>`,
			info: `<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8h.01"/>`,
			cloud: `<g stroke-width="2"><path d="M6.657 18c-2.572 0 -4.657 -2.007 -4.657 -4.483c0 -2.475 2.085 -4.482 4.657 -4.482c.393 -1.762 1.794 -3.2 3.675 -3.773c1.88 -.572 3.956 -.193 5.444 1c1.488 1.19 2.162 3.007 1.77 4.769h.99c1.913 0 3.464 1.56 3.464 3.486c0 1.927 -1.551 3.487 -3.465 3.487h-11.878" /></g>`,
			copy: `<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"/>`,
			share: `<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="m8.2 10.8 7.6-4.1M8.2 13.2l7.6 4.1"/>`,
			cloudOff: `<g stroke-width="2"><path d="M9.58 5.548c.24 -.11 .492 -.207 .752 -.286c1.88 -.572 3.956 -.193 5.444 1c1.488 1.19 2.162 3.007 1.77 4.769h.99c1.913 0 3.464 1.56 3.464 3.486c0 .957 -.383 1.824 -1.003 2.454m-2.997 1.033h-11.343c-2.572 -.004 -4.657 -2.011 -4.657 -4.487c0 -2.475 2.085 -4.482 4.657 -4.482c.13 -.582 .37 -1.128 .7 -1.62" /><path d="M3 3l18 18" /></g>`,
			medal: `<circle cx="12" cy="14.5" r="5.5"/><path d="M8.5 10 6 3.5h4l2 4 2-4h4L15.5 10"/>`,
			gem: `<path d="M6 4h12l3.5 5L12 20.5 2.5 9z"/><path d="M2.5 9h19M9 4l3 16.5L15 4"/>`,
			brand: `<path vector-effect="non-scaling-stroke" transform="translate(0 -2) scale(.5)" d="M15 14h18c5.6 0 10 4 10.9 9.5l1.7 10.6c.6 4.1-2.5 7.9-6.7 7.9-2.5 0-4.7-1.4-5.8-3.6L31.4 35H16.6l-1.7 3.4C13.8 40.6 11.6 42 9.1 42c-4.2 0-7.3-3.8-6.7-7.9l1.7-10.6C5 18 9.4 14 15 14z"/><path d="M7 9.5v3M5.5 11h3"/><g fill="currentColor" stroke="none"><circle cx="17" cy="9.1" r="1"/><circle cx="18.9" cy="11" r="1"/><circle cx="17" cy="12.9" r="1"/><circle cx="15.1" cy="11" r="1"/></g>`,
			vault: `<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><circle cx="12" cy="12" r="4.2"/><path d="M12 7.8v1.4M12 14.8v1.4M7.8 12h1.4M14.8 12h1.4"/><path d="M3.5 8h-1M3.5 16h-1"/>`,
			filter: `<path d="M4 5.5h16l-6 7.5v5l-4 1.5v-6.5z"/>`,
			sort: `<path d="M7 4v16M3.5 16.5 7 20l3.5-3.5M17 20V4M13.5 7.5 17 4l3.5 3.5"/>`,
			eye: `<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>`,
			tag: `<path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3-8.7 8.7z"/><circle cx="8" cy="8" r="1.4"/>`,
			upload: `<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M4.5 19.5h15"/>`,
			trash: `<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>`,
			target: `<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.8" fill="currentColor"/>`,
			pin: `<path d="M9 4h6l-1 5 3 3v1.5H7V12l3-3-1-5zM12 13.5V20"/>`,
			flame: `<path d="M12 21c3.6 0 6-2.5 6-5.8 0-3.6-2.6-5.4-3.6-8.7-.6 1.6-1.4 2.6-2.6 3.3.1-2.5-.7-4.6-2.3-6.3-.3 3.9-3.5 6-3.5 10.9C6 18.5 8.4 21 12 21z"/>`,
			moon: `<path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10z"/>`,
			bell: `<path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5H5l1.5-1.5zM10 20.5h4"/>`,
			// identidade de plataformas, gêneros e franquias (3.9.0)
			gamepad: `<path d="M7.5 6.5h9a4.5 4.5 0 0 1 4.4 3.6l.9 4.8a2.6 2.6 0 0 1-4.6 2.1l-1.7-2H8.5l-1.7 2a2.6 2.6 0 0 1-4.6-2.1l.9-4.8a4.5 4.5 0 0 1 4.4-3.6z"/><path d="M7 10v3M5.5 11.5h3"/><circle cx="16" cy="10.5" r=".9" fill="currentColor" stroke="none"/><circle cx="17.8" cy="12.6" r=".9" fill="currentColor" stroke="none"/>`,
			handheld: `<g stroke-width="2"><rect x="6.5" y="3" width="11" height="18" rx="2.5"/><rect x="8.5" y="5.5" width="7" height="7" rx=".5"/><circle cx="12" cy="16.8" r="1.6"/></g>`,
			smartphone: `<g stroke-width="2"><path d="M6 5a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2v-14" /><path d="M11 4h2" /><path d="M12 17v.01" /></g>`,
			ghost: `<g stroke-width="2"><path d="M15 10v1" /><path d="M7.528 20.472a1.6 1.6 0 012.277 0l1.057 1.056a1.6 1.6 0 002.276 0l1.057-1.056a1.6 1.6 0 012.277 0l1.114 1.114a1.4 1.4 0 002.414-1V10a8 8 0 00-16 0v10.586a1.4 1.4 0 002.414 1z" /><path d="M9 10v1" /></g>`,
			skull: `<g stroke-width="2"><path d="M12 4c4.418 0 8 3.358 8 7.5c0 1.901 -.755 3.637 -2 4.96l0 2.54a1 1 0 0 1 -1 1h-10a1 1 0 0 1 -1 -1v-2.54c-1.245 -1.322 -2 -3.058 -2 -4.96c0 -4.142 3.582 -7.5 8 -7.5" /><path d="M10 17v3" /><path d="M14 17v3" /><path d="M8 11a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M14 11a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /></g>`,
			sword: `<path d="M20 4h-3.6l-8.2 8.4 3.4 3.4L20 7.6z"/><path d="m6.6 10.8 6.6 6.6M8.2 15.8 4.6 19.4"/>`,
			compass: `<circle cx="12" cy="12" r="8.5"/><path d="m15.2 8.8-1.9 4.5-4.5 1.9 1.9-4.5z"/>`,
			mountain: `<path d="m3 19.5 6-11 3.8 6.5 2.2-3.3 6 7.8z"/>`,
			bolt: `<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>`,
			car: `<g stroke-width="2"><path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M10 12a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M12 14l0 7" /><path d="M10 12l-6.75 -2" /><path d="M14 12l6.75 -2" /></g>`,
			crosshair: `<g stroke-width="2"><path d="M11.5 12a.5 .5 0 1 0 1 0a.5 .5 0 1 0 -1 0" fill="currentColor" /><path d="M5 12a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M12 3l0 2" /><path d="M3 12l2 0" /><path d="M12 19l0 2" /><path d="M19 12l2 0" /></g>`,
			bulb: `<path d="M15 14c.2-1 .7-1.7 1.5-2.5A5 5 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6M10 22h4"/>`,
			shield: `<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>`,
			crown: `<path d="m3.5 7 3.2 9h10.6l3.2-9-5 4.5L12 5l-3.5 6.5z"/><path d="M6.7 19.5h10.6"/>`,
			leaf: `<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>`,
			map: `<path d="M3.5 6.5 9 4.5l6 2 5.5-2v13l-5.5 2-6-2-5.5 2z"/><path d="M9 4.5v13M15 6.5v13"/>`,
			film: `<g stroke-width="2"><path d="M4 6a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2l0 -12" /><path d="M8 4l0 16" /><path d="M16 4l0 16" /><path d="M4 8l4 0" /><path d="M4 16l4 0" /><path d="M4 12l16 0" /><path d="M16 8l4 0" /><path d="M16 16l4 0" /></g>`,
			// consoles e portáteis (silhuetas genéricas) e ícones temáticos (3.16.0)
			// marcas das plataformas (silhuetas próprias, no traço dos demais)
			"b-playstation": `<path fill="currentColor" stroke="none" d="M8.984 2.596v17.547l3.915 1.261V6.688c0-.69.304-1.151.794-.991.636.18.76.814.76 1.505v5.875c2.441 1.193 4.362-.002 4.362-3.152 0-3.237-1.126-4.675-4.438-5.827-1.307-.448-3.728-1.186-5.39-1.502zm4.656 16.241l6.296-2.275c.715-.258.826-.625.246-.818-.586-.192-1.637-.139-2.357.123l-4.205 1.5V14.98l.24-.085s1.201-.42 2.913-.615c1.696-.18 3.785.03 5.437.661 1.848.601 2.04 1.472 1.576 2.072-.465.6-1.622 1.036-1.622 1.036l-8.544 3.107V18.86zM1.807 18.6c-1.9-.545-2.214-1.668-1.352-2.32.801-.586 2.16-1.052 2.16-1.052l5.615-2.013v2.313L4.205 17c-.705.271-.825.632-.239.826.586.195 1.637.15 2.343-.12L8.247 17v2.074c-.12.03-.256.044-.39.073-1.939.331-3.996.196-6.038-.479z"/>`,
			"b-xbox": `<g stroke-width="2"><path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M6.5 5c7.72 2.266 10.037 7.597 12.5 12.5" /><path d="M17.5 5c-7.72 2.266 -10.037 7.597 -12.5 12.5" /></g>`,
			"b-nintendo": `<g stroke-width="2"><rect x="2" y="7" width="20" height="10" rx="5"/><path d="M8.5 14.5v-5l7 5v-5"/></g>`,
			"b-steam": `<circle cx="12" cy="12" r="9.3"/><circle cx="15.4" cy="8.8" r="2.7"/><circle cx="8.4" cy="15.4" r="1.9"/><path d="m13.4 10.7-3.6 3.4M2.9 13.4l4 1.4"/>`,
			"b-gog": `<circle cx="6" cy="10" r="2.6"/><path d="M8.6 10v4.6a2.6 2.6 0 0 1-2.6 2.6H4.4"/><circle cx="12" cy="10" r="2.6"/><circle cx="18" cy="10" r="2.6"/><path d="M20.6 10v4.6a2.6 2.6 0 0 1-2.6 2.6h-1.6"/>`,
			"b-epic": `<path d="M5 2.8h14v14.6l-7 4-7-4z"/><path d="M14.6 6.8H9.4v8h5.2M9.4 10.8h4.4"/>`,
			"b-retro": `<path d="M7.2 7.5h9.6a4.5 4.5 0 0 1 0 9H7.2a4.5 4.5 0 0 1 0-9z"/><path d="M5.2 12h3.6M7 10.2v3.6"/><circle cx="15.7" cy="13.2" r="1"/><circle cx="18.1" cy="10.8" r="1"/>`,
			"b-googleplay": `<path d="M5.5 3.6v16.8a.9.9 0 0 0 1.4.8l13.4-8.4a.9.9 0 0 0 0-1.6L6.9 2.8a.9.9 0 0 0-1.4.8z"/><path d="M5.9 3.4 15.2 12l-9.3 8.6"/>`,
			"c-atari": `<g stroke-width="2"><path d="M3 12 5 8h14l2 4v6H3z"/><path d="M3 14.5h18M8 8V5.5M11 8V5.5M13 8V5.5M16 8V5.5"/></g>`,
			"c-nes": `<g stroke-width="2"><rect x="3" y="6.5" width="18" height="11" rx="1.5"/><path d="M3 11h18"/><path d="M6.5 8.7h4M13 8.7h1.5M16.5 8.7h1"/><path d="M6.5 14.3h2.5M15 14.3h2.5"/></g>`,
			"c-mastersystem": `<g stroke-width="2"><path d="M2.5 10 5 7.5h14l2.5 2.5v7.5h-19z"/><path d="M2.5 13h19M8 7.5V5.5h8v2M15 15.3h3.5"/></g>`,
			"c-snes": `<g stroke-width="2"><path d="M3 8.5A2 2 0 0 1 5 6.5h14a2 2 0 0 1 2 2V15a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z"/><rect x="8" y="8.5" width="8" height="3" rx=".5"/><path d="M5.5 14.5h2M16.5 14.5h2"/></g>`,
			"c-megadrive": `<g stroke-width="2"><rect x="2" y="7" width="20" height="10.5" rx="2"/><circle cx="12" cy="12.2" r="3.8"/><path d="M9.6 11h4.8"/><path d="M4.5 10h1.5M18 10h1.5"/></g>`,
			"c-ps1": `<path fill="currentColor" stroke="currentColor" stroke-width=".2" stroke-linejoin="miter" stroke-linecap="butt" transform="translate(1.25 0) translate(12 12) scale(1.24) translate(-8.86 -12)" d="M7.46 13.779v.292h4.142v-3.85h3.796V9.93h-4.115v3.85zM7.195 10.221v1.62H0v2.23h.292v-1.938H7.46V9.929H0v.292ZM16.513 9.929h1.2v4.142h-.292v-3.85h-.908z"/>`,
			"c-saturn": `<g stroke-width="2"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><circle cx="10.5" cy="12.3" r="4.2"/><path d="M7.5 7.2h6"/><circle cx="18" cy="9.5" r="1.2"/><path d="M18 13.5h.01"/><path d="M18 15.8h.01"/></g>`,
			"c-n64": `<g stroke-width="2"><path d="M2.5 13 5 9h14l2.5 4v4.5a1.5 1.5 0 0 1-1.5 1.5H4a1.5 1.5 0 0 1-1.5-1.5z"/><path d="M8.5 9V6h7v3M2.5 13h19"/><path d="M6.5 16h.01"/><path d="M17.5 16h.01"/></g>`,
			"c-dreamcast": `<g stroke-width="2"><path d="M10 12.057a1.9 1.9 0 0 0 .614 .743c1.06 .713 2.472 .112 3.043 -.919c.839 -1.513 -.022 -3.368 -1.525 -4.08c-2 -.95 -4.371 .154 -5.24 2.086c-1.095 2.432 .29 5.248 2.71 6.246c2.931 1.208 6.283 -.418 7.438 -3.255c1.36 -3.343 -.557 -7.134 -3.896 -8.41c-3.855 -1.474 -8.2 .68 -9.636 4.422c-1.63 4.253 .823 9.024 5.082 10.576c4.778 1.74 10.118 -.941 11.833 -5.59a9.354 9.354 0 0 0 .577 -2.813" /></g>`,
			"c-ps2": `<path fill="currentColor" stroke="currentColor" stroke-width=".26" stroke-linejoin="miter" stroke-linecap="butt" d="M7.46 13.779v.292h4.142v-3.85h3.796V9.93h-4.115v3.85zm16.248-3.558v1.62h-7.195v2.23H24v-.292h-7.168v-1.646H24V9.929h-7.487v.292zm-16.513 0v1.62H0v2.23h.292v-1.938H7.46V9.929H0v.292Z"/>`,
			"c-gamecube": `<g stroke-width="2"><rect x="4" y="7" width="16" height="14" rx="2"/><path d="M7 7V4.5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1V7"/><circle cx="12" cy="14" r="3.5"/></g>`,
			"c-xbox": `<g stroke-width="2"><rect x="3" y="6" width="18" height="12" rx="2.5"/><circle cx="12" cy="12" r="3"/><path d="m10.8 10.8 2.4 2.4M13.2 10.8l-2.4 2.4"/></g>`,
			"c-ps3": `<path fill="currentColor" stroke="none" d="M15.362 9.433h-3.148c-.97 0-1.446.6-1.446 1.38v2.365c0 .483-.228.83-.71.83H7.304a.035.035 0 00-.035.035v.47c0 .02.01.032.03.032h3.11c.97 0 1.45-.597 1.45-1.377v-2.363c0-.484.224-.832.71-.832h2.781c.02 0 .04-.014.04-.033v-.475c0-.02-.02-.035-.04-.035zm-9.266 0H.038c-.022 0-.038.017-.038.035v.477c0 .02.016.036.038.036h5.694c.48 0 .71.347.71.83s-.228.83-.71.83H1.228c-.7 0-1.227.586-1.227 1.365v1.513c0 .02.02.037.04.037h1.03c.02 0 .04-.016.04-.037v-1.513c0-.48.28-.82.68-.82H6.1c.97 0 1.444-.594 1.444-1.374 0-.778-.473-1.38-1.442-1.38zm17.453 2.498a.04.04 0 010-.056c.3-.25.45-.627.45-1.062 0-.778-.474-1.38-1.446-1.38h-6.057c-.02 0-.036.018-.036.038v.475c0 .02.02.04.04.04h5.7c.48 0 .715.35.715.83s-.23.83-.712.83h-5.7c-.02 0-.036.02-.036.04v.48c0 .02.016.033.037.033h5.7c.63.007.71.62.71.93v.06c0 .485-.23.833-.71.833h-5.7c-.02 0-.036.015-.036.034v.477c0 .02.015.037.036.037h6.05c.973 0 1.446-.645 1.446-1.38v-.057c0-.47-.15-.916-.45-1.19z"/>`,
			"c-xbox360": `<g stroke-width="2"><path d="M3 6.5q9 2.5 18 0v11q-9-2.5-18 0z"/><circle cx="16.5" cy="12" r="2"/><path d="M6 12h4.5"/></g>`,
			"c-wii": `<g stroke-width="2"><rect x="5" y="3" width="6" height="18" rx="1.2"/><path d="M7 6.5h2"/><rect x="15" y="6" width="4" height="15" rx="2"/><path d="M17 9.5h.01"/><path d="M17 13h.01"/></g>`,
			"c-wiiu": `<g stroke-width="2"><path d="M2 10a3.5 3.5 0 0 1 3.5-3.5h13A3.5 3.5 0 0 1 22 10v4a3.5 3.5 0 0 1-3.5 3.5h-13A3.5 3.5 0 0 1 2 14z"/><rect x="7" y="8.5" width="10" height="7" rx=".5"/><path d="M4.5 10.5h.01"/><path d="M19.5 10.5h.01"/></g>`,
			"c-ps4": `<path fill="currentColor" stroke="none" d="M12.302 13.18v-2.387c0-.486.227-.834.712-.834h2.99c.017 0 .035-.018.035-.036v-.475c0-.004 0-.008-.003-.012h-3.66c-.792.1-1.18.653-1.18 1.357v2.386c0 .482-.233.831-.71.831H7.332c-.018 0-.036.012-.036.036v.475c0 .02.01.035.023.04h3.584c.933-.025 1.393-.62 1.393-1.385zM.024 14.564h1.05a.042.042 0 00.025-.04v-1.52c0-.487.275-.823.676-.823h4.323c.974 0 1.445-.6 1.445-1.384 0-.705-.386-1.257-1.18-1.357H.006c0 .003-.006.005-.006.01v.475c0 .024.013.036.037.036h5.697c.484 0 .712.35.712.833 0 .484-.227.836-.712.836H1.226c-.7 0-1.226.592-1.226 1.373v1.519c0 .02.01.036.028.04zm15.998-.55h5.738c.017 0 .03.012.03.024v.483c0 .024.017.036.035.036h1.035c.018 0 .036-.01.036-.036v-.475c0-.018.02-.036.04-.036h1.028c.024 0 .036-.018.036-.036v-.484c0-.018-.01-.036-.035-.036h-1.03c-.02 0-.037-.017-.037-.035V9.96c0-.283-.104-.463-.28-.523h-.3a1.153 1.153 0 00-.303.132l-6.18 3.815c-.24.15-.323.318-.263.445.048.104.185.182.454.182zm.895-.637l4.79-2.961c.03-.024.09-.018.09.048v2.961c0 .018-.016.036-.034.036h-4.817c-.04 0-.06-.012-.065-.024-.006-.024.005-.042.036-.06z"/>`,
			"c-xboxone": `<g stroke-width="2"><rect x="2" y="8" width="20" height="8" rx="1"/><path d="M13.5 8v8"/><path d="M4.5 10.5h6.5M4.5 13.5h6.5"/><circle cx="17.8" cy="12" r="1.3"/></g>`,
			"c-switch": `<g stroke-width="2"><path d="M10 20v-16h-3a4 4 0 0 0 -4 4v8a4 4 0 0 0 4 4h3" /><path d="M14 20v-16h3a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-3" /><path d="M16.5 15.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" fill="currentColor" /><path d="M5.5 8.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" fill="currentColor" /></g>`,
			"c-ps5": `<path fill="currentColor" stroke="none" d="M10.4499 14.56905a1.38287 1.38287 0 001.38287-1.38287v-2.37841a.83315.83315 0 01.83416-.83315h2.68403a.03732.03732 0 00.03631-.03732V9.4612a.03631.03631 0 00-.0363-.0363H12.1172a1.38287 1.38287 0 00-1.38388 1.38286v2.38043a.83416.83416 0 01-.83315.83415H7.25347a.03631.03631 0 00-.03631.03632v.47608a.03631.03631 0 00.03631.03631zm6.04488-3.21156V9.4612a.03631.03631 0 01.0363-.0363h7.30772a.03732.03732 0 01.03732.0363v.47609a.03833.03833 0 01-.03732.03732h-6.20929a.03631.03631 0 00-.0363.03631v1.2356a.3954.3954 0 00.3964.39741h4.62267a1.46457 1.46457 0 010 2.9251h-6.0812a.03631.03631 0 01-.0363-.0363v-.47407a.03631.03631 0 01.0363-.03632h5.53047a.91586.91586 0 10-.00706-1.8307h-4.72656a.83315.83315 0 01-.83315-.83416m-10.84608.28645a.83466.83466 0 000-1.66932H.03654a.03732.03732 0 01-.03632-.03732V9.4612a.03631.03631 0 01.03632-.0363h6.1528a1.38388 1.38388 0 010 2.76673H1.9328a.83315.83315 0 00-.83315.83416v1.51299a.03631.03631 0 01-.03631.0363H.03654a.03631.03631 0 01-.03632-.04034v-1.51298a1.38287 1.38287 0 011.38388-1.37783Z"/>`,
			"c-xseries": `<g stroke-width="2"><rect x="7" y="2.5" width="10" height="19" rx="1.5"/><circle cx="12" cy="6.5" r="2.5"/><path d="M10.5 18.5h.01"/><path d="M13.5 18.5h.01"/></g>`,
			"c-arcade": `<g stroke-width="2"><rect x="6.5" y="3" width="11" height="4" rx="1"/><path d="M8 7v6M16 7v6"/><rect x="5" y="13" width="14" height="4.5" rx="1"/><path d="M6.5 17.5V21h11v-3.5"/><path d="M9 15.2h.01M15 15.2h.01"/></g>`,
			"c-pc": `<rect x="7" y="2.5" width="10" height="19" rx="1.5"/><path d="M10 6h4M10 9h4"/><circle cx="12" cy="16" r="1.6"/>`,
			"c-laptop": `<g stroke-width="2"><path d="M3 19l18 0" /> <path d="M5 7a1 1 0 0 1 1 -1h12a1 1 0 0 1 1 1v8a1 1 0 0 1 -1 1h-12a1 1 0 0 1 -1 -1l0 -8" /></g>`,
			"c-vr": `<g stroke-width="2"><path d="M3 8v8.5a2.5 2.5 0 0 0 2.5 2.5h1.06a3 3 0 0 0 2.34 -1.13l1.54 -1.92a2 2 0 0 1 3.12 0l1.54 1.92a3 3 0 0 0 2.34 1.13h1.06a2.5 2.5 0 0 0 2.5 -2.5v-8.5a2 2 0 0 0 -2 -2h-14a2 2 0 0 0 -2 2" /> <path d="M7 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /> <path d="M15 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /></g>`,
			"c-tv": `<g stroke-width="2"><path d="M3 9a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2l0 -9" /> <path d="M16 3l-4 4l-4 -4" /></g>`,
			"h-gameboy": `<g stroke-width="2"><path d="M6 3h12v14a4 4 0 0 1-4 4H6z"/><rect x="8.5" y="5.5" width="7" height="6" rx=".5"/><path d="M8.5 15.5h2.5M9.75 14.25v2.5"/><path d="M14.6 15h.01"/><path d="M13.2 16.8h.01"/></g>`,
			"h-gamegear": `<g stroke-width="2"><path d="M6.5 6.5h11c2.5 0 4.5 2.5 4.5 5.5s-2 5.5-4.5 5.5h-11C4 17.5 2 15 2 12s2-5.5 4.5-5.5z"/><rect x="8.2" y="8.6" width="7.6" height="6.8" rx=".5"/><path d="M4 12h2M5 11v2"/><path d="M18.6 12.8h.01"/><path d="M19.8 11.2h.01"/></g>`,
			"h-gba": `<g stroke-width="2"><path d="M2 9.5A3.5 3.5 0 0 1 5.5 6h13A3.5 3.5 0 0 1 22 9.5v3c0 2.5-1.5 5.5-4 5.5H6c-2.5 0-4-3-4-5.5z"/><rect x="8" y="8" width="8" height="6.5" rx=".5"/><path d="M3.8 11.5h2.4M5 10.3v2.4"/><path d="M18.6 10.5h.01M19.6 12.4h.01"/></g>`,
			"h-ds": `<g stroke-width="2"><rect x="4" y="5" width="16" height="14" rx="2"/><rect x="6.5" y="7.5" width="11" height="5.5" rx=".8"/><path d="M7 16h2M11 16h2M15 16h2"/></g>`,
			"h-3ds": `<g stroke-width="2"><rect x="5" y="5" width="14" height="10" rx="1.5"/><path d="M3.5 15h17l-.8 3.2a1.5 1.5 0 0 1-1.5 1.1H5.8a1.5 1.5 0 0 1-1.5-1.1z"/><path d="M8 17.2h6M15.8 17.2h1"/></g>`,
			"h-psp": `<path fill="currentColor" stroke="currentColor" stroke-width=".26" stroke-linejoin="miter" stroke-linecap="butt" d="M0 9.93v.296h7.182v1.626H.001v2.217h.295v-1.921h7.182V9.93zm11.29 0v3.844H7.478v.296h4.124v-3.844h3.813V9.93zm5.233 0v.296h7.182v1.626h-7.182v2.217h.296v-1.921H24V9.93z"/>`,
			"h-vita": `<path fill="currentColor" stroke="none" d="M3.176 12.216H1.274c-.26 0-.453.198-.453.538v1.235H0v-1.19c0-.668.42-1.119 1.014-1.119h1.924c.471-.018.584-.252.584-.592 0-.26-.13-.616-.584-.58H0v-.49h3.176c.832 0 1.16.481 1.16 1.07 0 .669-.328 1.128-1.16 1.128zm3.488-1.122v1.813c0 .663-.299 1.076-1.126 1.076H3.761v-.49h1.55c.318 0 .507-.258.507-.586v-1.813c0-.578.28-1.077 1.102-1.077h1.765v.49H7.158c-.412-.017-.494.32-.494.587zm4.84 2.904c-.331-.018-.47-.27-.532-.377-.063-.107-1.92-3.609-1.92-3.609h.924l1.538 2.855c.08.16.262.2.36.012l1.53-2.867h.577s-1.798 3.404-1.87 3.52c-.071.117-.276.484-.607.466zm3.005-3.972h.84v3.96h-.84zm3.77.46l.003 3.477h-.826V10.49l-1.57-.002v-.483L19.859 10l-.002.489zm3.235-.481c-.314.005-.51.354-.579.467-.071.116-1.873 3.527-1.873 3.527h.578l.44-.84h2.541l.454.84H24s-1.86-3.508-1.923-3.616c-.062-.107-.201-.36-.533-.378h-.03zm-.18.996c.078-.005.155.047.2.138l.825 1.525h-2.004l.818-1.538c.043-.082.102-.12.162-.125Z"/>`,
			"h-switchlite": `<g stroke-width="2"><rect x="2" y="7" width="20" height="10" rx="4"/><rect x="7" y="8.6" width="10" height="6.8" rx=".5"/><circle cx="4.6" cy="10.2" r=".8"/><circle cx="19.4" cy="13.8" r=".8"/><path d="M4.6 13.8h.01"/><path d="M19.4 10.2h.01"/></g>`,
			"h-deck": `<g stroke-width="2"><path d="M5 6.5h14a3.5 3.5 0 0 1 3.5 3.5v6a2 2 0 0 1-3.4 1.4L18 16H6l-1.1 1.4A2 2 0 0 1 1.5 16v-6A3.5 3.5 0 0 1 5 6.5z"/><rect x="7.3" y="8.3" width="9.4" height="6" rx=".5"/><circle cx="4.4" cy="9.6" r=".7"/><circle cx="19.6" cy="9.6" r=".7"/><rect x="3.4" y="12.2" width="2" height="2" rx=".3"/><rect x="18.6" y="12.2" width="2" height="2" rx=".3"/></g>`,
			"c-ps1-unit": `<g stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="1"/><path d="M2 9h4.5l1-3M22 9h-4.5l-1-3"/><circle cx="11" cy="11.2" r="3.6"/><circle cx="5.2" cy="14.5" r=".8"/><circle cx="18.8" cy="14.5" r=".8"/><path d="M9 18v-1h2.4v1M12.8 18v-1h2.4v1"/><path d="M5 11.4h.01"/></g>`,
			"c-ps2-unit": `<g stroke-width="2"><path d="M4.2 4h15.6l1.7 8h-19z"/><path d="M2.5 12v6h19v-6M2.5 15h19"/><path d="M5 18v2h13v-2"/></g>`,
			"c-ps3-unit": `<g stroke-width="2"><path d="M7.5 2.5h9.5v19H7.5C6.2 18.6 5.5 15.3 5.5 12s.7-6.6 2-9.5z"/><path d="M12.8 2.5v19M15 2.5v19"/><path d="M12.8 14h2.2"/></g>`,
			"c-ps3slim": `<g stroke-width="2"><path d="M7 3h10a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7c-.9-2.8-1.3-5.8-1.3-9S6.1 5.8 7 3z"/><path d="M15.5 6v8"/><path d="M15.5 4.8h.01"/><path d="M15.5 16.5h.01"/></g>`,
			"c-ps4-unit": `<g stroke-width="2"><path d="M4.5 9h17l-2 6h-17z"/><path d="M10.2 9l-2 6"/></g>`,
			"c-ps4pro": `<g stroke-width="2"><path d="M3.5 6v13.5M6.5 4.8v15.2"/><path d="M9.5 3.5l10.5-1v17.5H9.5z"/><path d="M8 21.5h7"/></g>`,
			"c-ps5-unit": `<g stroke-width="2"><path d="M7.5 2.5c1.7 1 2.9 2.4 3.2 4V20.5H7.9C7.7 14.5 7.5 8.5 7.5 2.5z"/><path d="M16.5 2.5c-1.7 1-2.9 2.4-3.2 4V20.5h2.8c.8-5 1-11 .4-18z"/><path d="M14.9 14.5v4.5"/><path d="M9.5 21.5h5"/></g>`,
			"c-ps5slim": `<g stroke-width="2"><rect x="7" y="3" width="10" height="17" rx="2"/><path d="M11 3v17M13 3v17"/><path d="M7 9h4M13 9h4"/><path d="M8.5 21.5h7"/></g>`,
			"h-psp-unit": `<g stroke-width="2"><rect x="1.8" y="7" width="20.4" height="10" rx="5"/><rect x="6.8" y="8.6" width="10.4" height="6.8" rx=".4"/><path d="M3.5 10.8h2M4.5 9.8v2"/><circle cx="4.5" cy="14.2" r=".5"/><path d="M19.5 9.9h.01"/><path d="M19.5 11.9h.01"/><path d="M18.5 10.9h.01"/><path d="M20.5 10.9h.01"/></g>`,
			"h-vita-unit": `<g stroke-width="2"><path d="M7 6.5h10c2.9 0 5.2 2.4 5.2 5.5S19.9 17.5 17 17.5H7C4.1 17.5 1.8 15.1 1.8 12S4.1 6.5 7 6.5z"/><rect x="7.4" y="8.4" width="9.2" height="7.2" rx=".4"/><path d="M3.6 10.4h2M4.6 9.4v2"/><circle cx="4.6" cy="14" r="1"/><circle cx="19.4" cy="14" r="1"/><path d="M18.8 10.4h.01"/><path d="M20 10.4h.01"/></g>`,
			"h-portal": `<g stroke-width="2"><rect x="6" y="6" width="12" height="8.5" rx="1"/><path d="M6 8.5H4.5A2.5 2.5 0 0 0 2 11v5.5a1.8 1.8 0 0 0 3.2 1.1L7.5 14.5"/><path d="M18 8.5h1.5A2.5 2.5 0 0 1 22 11v5.5a1.8 1.8 0 0 1-3.2 1.1L16.5 14.5"/><circle cx="4.3" cy="12" r=".6"/><circle cx="19.7" cy="12" r=".6"/></g>`,
			"c-switch2": `<g stroke-width="2"><rect x="6" y="6" width="12" height="12" rx=".6"/><path d="M6 6H4.5A2.5 2.5 0 0 0 2 8.5v7A2.5 2.5 0 0 0 4.5 18H6M18 6h1.5A2.5 2.5 0 0 1 22 8.5v7a2.5 2.5 0 0 1-2.5 2.5H18"/><circle cx="4" cy="9.5" r=".8"/><circle cx="20" cy="14.5" r=".8"/><path d="M4 14.5h.01"/><path d="M20 9.5h.01"/></g>`,
			"c-virtualboy": `<g stroke-width="2"><path d="M3 5.5h18a1 1 0 0 1 1 1V11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6.5a1 1 0 0 1 1-1z"/><path d="M7 8.5h3M14 8.5h3"/><path d="M12 13v3M8 21l4-5 4 5"/></g>`,
			"c-segacd": `<g stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="1.5"/><circle cx="11" cy="11" r="4.5"/><circle cx="11" cy="11" r=".6"/><path d="M3 17h18"/><path d="M18 7h.01"/></g>`,
			"c-32x": `<g stroke-width="2"><path d="M3 10c0-3.3 4-6 9-6s9 2.7 9 6v1H3z"/><path d="M8 11v8a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-8"/><path d="M10.5 15h3"/></g>`,
			"c-neogeo": `<g stroke-width="2"><rect x="2" y="7" width="20" height="10" rx="1"/><rect x="7" y="9" width="10" height="3.5" rx=".5"/><path d="M4.5 15h2M17.5 15h2"/></g>`,
			"c-pcengine": `<g stroke-width="2"><rect x="4" y="5" width="16" height="14" rx="1.5"/><path d="M4 9h16M8 7h.01M10.5 7h.01M13 7h.01M15.5 7h.01"/><path d="M7.5 15.5h9"/></g>`,
			"h-lynx": `<g stroke-width="2"><path d="M5 7h14a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-4a3 3 0 0 1 3-3z"/><rect x="7.5" y="8.8" width="8" height="6.4" rx=".5"/><path d="M3.6 12h2.2M4.7 10.9v2.2"/><circle cx="18.6" cy="10.8" r=".9"/><circle cx="18.6" cy="13.8" r=".9"/></g>`,
			"c-jaguar": `<g stroke-width="2"><path d="M3 16.5 4.5 10C5 8 6.5 7 8.5 7h7c2 0 3.5 1 4 3l1.5 6.5a1.5 1.5 0 0 1-1.5 1.8H4.5A1.5 1.5 0 0 1 3 16.5z"/><path d="M8.5 7V5h7v2"/><path d="M6 14.5h12"/></g>`,
			"c-3do": `<g stroke-width="2"><rect x="2" y="7.5" width="20" height="9" rx="1"/><path d="M4.5 10.5h10"/><circle cx="18.5" cy="12" r="1.5"/><path d="M4.5 13.8h3"/></g>`,
			"h-wonderswan": `<g stroke-width="2"><rect x="5" y="3" width="14" height="18" rx="2.5"/><rect x="7.5" y="5.5" width="9" height="7" rx=".5"/><path d="M9 15.5h.01"/><path d="M9 18h.01"/><path d="M7.8 16.8h.01"/><path d="M10.2 16.8h.01"/><path d="M14.5 16h.01"/><path d="M16 17.5h.01"/></g>`,
			"c-quest": `<g stroke-width="2"><path d="M4.5 7h15A2.5 2.5 0 0 1 22 9.5v5a2.5 2.5 0 0 1-2.5 2.5h-4l-1.5-2h-4L8.5 17h-4A2.5 2.5 0 0 1 2 14.5v-5A2.5 2.5 0 0 1 4.5 7z"/><path d="M5 10h.01"/><path d="M19 10h.01"/><path d="M5 14h.01"/><path d="M19 14h.01"/></g>`,
			"h-ally": `<g stroke-width="2"><path d="M5.5 6h13A3.5 3.5 0 0 1 22 9.5v6.3a2.2 2.2 0 0 1-4 1.3L16.8 15.5H7.2L6 17.1a2.2 2.2 0 0 1-4-1.3V9.5A3.5 3.5 0 0 1 5.5 6z"/><rect x="7.4" y="7.8" width="9.2" height="6" rx=".5"/><circle cx="4.5" cy="9.5" r=".8"/><circle cx="19.5" cy="12.8" r=".8"/><path d="M4.5 12.8h.01"/><path d="M19.5 9.5h.01"/></g>`,
			"g-puzzle": `<g stroke-width="2"><path d="M4 6a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2l0 -12" /><path d="M12 4v2.5a.5 .5 0 0 1 -.5 .5a1.5 1.5 0 0 0 0 3a.5 .5 0 0 1 .5 .5v1.5" /><path d="M12 12v1.5a.5 .5 0 0 0 .5 .5a1.5 1.5 0 0 1 0 3a.5 .5 0 0 0 -.5 .5v2.5" /><path d="M20 12h-2.5a.5 .5 0 0 1 -.5 -.5a1.5 1.5 0 0 0 -3 0a.5 .5 0 0 1 -.5 .5h-1.5" /><path d="M12 12h-1.5a.5 .5 0 0 0 -.5 .5a1.5 1.5 0 0 1 -3 0a.5 .5 0 0 0 -.5 -.5h-2.5" /></g>`,
			"g-exploration": `<g stroke-width="2"><path d="M4 16a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /><path d="M14 16a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /><path d="M16.346 9.17l-.729 -1.261c-.16 -.248 -1.056 -.203 -1.117 .091l-.177 1.38" /><path d="M19.761 14.813l-2.84 -5.133c-.189 -.31 -.592 -.68 -1.421 -.68c-.828 0 -1.5 .448 -1.5 1v6" /><path d="M7.654 9.17l.729 -1.261c.16 -.249 1.056 -.203 1.117 .091l.177 1.38" /><path d="M4.239 14.813l2.84 -5.133c.189 -.31 .592 -.68 1.421 -.68c.828 0 1.5 .448 1.5 1v6" /><path d="M10 12h4v2h-4l0 -2" /></g>`,
			"g-battleroyale": `<g stroke-width="2"><path d="M22 12a10 10 0 1 0 -20 0" /><path d="M22 12c0 -1.66 -1.46 -3 -3.25 -3c-1.8 0 -3.25 1.34 -3.25 3c0 -1.66 -1.57 -3 -3.5 -3s-3.5 1.34 -3.5 3c0 -1.66 -1.46 -3 -3.25 -3c-1.8 0 -3.25 1.34 -3.25 3" /><path d="M2 12l10 10l-3.5 -10" /><path d="M15.5 12l-3.5 10l10 -10" /></g>`,
			"g-cozy": `<g stroke-width="2"><path d="M4.083 5h10.834a1.08 1.08 0 0 1 1.083 1.077v8.615c0 2.38 -1.94 4.308 -4.333 4.308h-4.334c-2.393 0 -4.333 -1.929 -4.333 -4.308v-8.615a1.08 1.08 0 0 1 1.083 -1.077" /><path d="M16 8h2.5c1.38 0 2.5 1.045 2.5 2.333v2.334c0 1.288 -1.12 2.333 -2.5 2.333h-2.5" /></g>`,
			"g-cards": `<g stroke-width="2"><path d="M3.604 7.197l7.138 -3.109a.96 .96 0 0 1 1.27 .527l4.924 11.902a1 1 0 0 1 -.514 1.304l-7.137 3.109a.96 .96 0 0 1 -1.271 -.527l-4.924 -11.903a1 1 0 0 1 .514 -1.304l0 .001" /><path d="M15 4h1a1 1 0 0 1 1 1v3.5" /><path d="M20 6c.264 .112 .52 .217 .768 .315a1 1 0 0 1 .53 1.311l-2.298 5.374" /></g>`,
			"g-towerdefense": `<g stroke-width="2"><path d="M15 19v-2a3 3 0 0 0 -6 0v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-14h4v3h3v-3h4v3h3v-3h4v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1" /><path d="M3 11l18 0" /></g>`,
			"g-pointclick": `<g stroke-width="2"><path d="M3 12l3 0" /><path d="M12 3l0 3" /><path d="M7.8 7.8l-2.2 -2.2" /><path d="M16.2 7.8l2.2 -2.2" /><path d="M7.8 16.2l-2.2 2.2" /><path d="M12 12l9 3l-4 2l-2 4l-3 -9" /></g>`,
			"g-beatemup": `<g fill="currentColor" stroke="none" transform="scale(0.09375)"><path d="M200,80H184V64a32,32,0,0,0-56-21.13A32,32,0,0,0,72.21,60.42,32,32,0,0,0,24,88v40a104,104,0,0,0,208,0V112A32,32,0,0,0,200,80ZM152,48a16,16,0,0,1,16,16V80H136V64A16,16,0,0,1,152,48ZM88,64a16,16,0,0,1,32,0v40a16,16,0,0,1-32,0ZM40,88a16,16,0,0,1,32,0v16a16,16,0,0,1-32,0Zm176,40a88,88,0,0,1-175.92,3.75A31.93,31.93,0,0,0,80,125.13a31.93,31.93,0,0,0,44.58,3.35,32.21,32.21,0,0,0,11.8,11.44A47.88,47.88,0,0,0,120,176a8,8,0,0,0,16,0,32,32,0,0,1,32-32,8,8,0,0,0,0-16H152a16,16,0,0,1-16-16V96h64a16,16,0,0,1,16,16Z"/></g>`,
			"g-shmup": `<g fill="currentColor" stroke="none" transform="scale(0.09375)"><path d="M223.85,47.12a16,16,0,0,0-15-15c-12.58-.75-44.73.4-71.41,27.07L132.69,64H74.36A15.91,15.91,0,0,0,63,68.68L28.7,103a16,16,0,0,0,9.07,27.16l38.47,5.37,44.21,44.21,5.37,38.49a15.94,15.94,0,0,0,10.78,12.92,16.11,16.11,0,0,0,5.1.83A15.91,15.91,0,0,0,153,227.3L187.32,193A15.91,15.91,0,0,0,192,181.64V123.31l4.77-4.77C223.45,91.86,224.6,59.71,223.85,47.12ZM74.36,80h42.33L77.16,119.52,40,114.34Zm74.41-9.45a76.65,76.65,0,0,1,59.11-22.47,76.46,76.46,0,0,1-22.42,59.16L128,164.68,91.32,128ZM176,181.64,141.67,216l-5.19-37.17L176,139.31Zm-74.16,9.5C97.34,201,82.29,224,40,224a8,8,0,0,1-8-8c0-42.29,23-57.34,32.86-61.85a8,8,0,0,1,6.64,14.56c-6.43,2.93-20.62,12.36-23.12,38.91,26.55-2.5,36-16.69,38.91-23.12a8,8,0,1,1,14.56,6.64Z"/></g>`,
			"g-farming": `<g stroke-width="2"><path d="M2 9a10 10 0 1 0 20 0" /><path d="M12 19a10 10 0 0 1 10 -10" /><path d="M2 9a10 10 0 0 1 10 10" /><path d="M12 4a9.7 9.7 0 0 1 2.99 7.5" /><path d="M9.01 11.5a9.7 9.7 0 0 1 2.99 -7.5" /></g>`,
			"g-citybuilder": `<g stroke-width="2"><path d="M3 21l18 0" /><path d="M5 21v-14l8 -4v18" /><path d="M19 21v-10l-6 -4" /><path d="M9 9l0 .01" /><path d="M9 12l0 .01" /><path d="M9 15l0 .01" /><path d="M9 18l0 .01" /></g>`,
			"g-psychorror": `<g stroke-width="2"><path d="M15.5 13a3.5 3.5 0 0 0 -3.5 3.5v1a3.5 3.5 0 0 0 7 0v-1.8" /><path d="M8.5 13a3.5 3.5 0 0 1 3.5 3.5v1a3.5 3.5 0 0 1 -7 0v-1.8" /><path d="M17.5 16a3.5 3.5 0 0 0 0 -7h-.5" /><path d="M19 9.3v-2.8a3.5 3.5 0 0 0 -7 0" /><path d="M6.5 16a3.5 3.5 0 0 1 0 -7h.5" /><path d="M5 9.3v-2.8a3.5 3.5 0 0 1 7 0v10" /></g>`,
			"h-tablet": `<g stroke-width="2"><path d="M5 4a1 1 0 0 1 1 -1h12a1 1 0 0 1 1 1v16a1 1 0 0 1 -1 1h-12a1 1 0 0 1 -1 -1v-16" /> <path d="M11 17a1 1 0 1 0 2 0a1 1 0 0 0 -2 0" /></g>`,
			"rocket": `<path d="M12 2.5c3 2 4.5 5.5 4.5 9.5l-2 3h-5l-2-3c0-4 1.5-7.5 4.5-9.5z"/><circle cx="12" cy="9" r="1.6"/><path d="M9.5 15 7 17.5V20l3-1.5M14.5 15l2.5 2.5V20l-3-1.5M12 18v3"/>`,
			"planet": `<circle cx="12" cy="12" r="5.5"/><path d="M4.5 15.5c-2 1.8-2.3 3.2-1.3 3.8 1.8 1.1 7.4-1.2 12.3-5.2S22.6 6 20.8 4.9c-1-.6-2.6.1-4.4 1.6"/>`,
			"ufo": `<path d="M8 10a4 4 0 0 1 8 0"/><ellipse cx="12" cy="12.5" rx="9.5" ry="3"/><path d="M8 18.5 7 21M16 18.5l1 2.5M12 16v4"/>`,
			"robot": `<rect x="5" y="8" width="14" height="11" rx="2"/><path d="M12 8V5"/><circle cx="12" cy="4" r="1"/><circle cx="9" cy="12.5" r="1.2"/><circle cx="15" cy="12.5" r="1.2"/><path d="M9.5 16h5M3 12v3M21 12v3"/>`,
			"castle": `<path d="M3.5 21.5V8.5h3V11H9V8.5h6V11h2.5V8.5h3v13z"/><path d="M10 21.5V18a2 2 0 0 1 4 0v3.5M12 8.5V3l3 1.3L12 5.6"/>`,
			"city": `<path d="M3 21.5h18M5 21.5V10h5v11.5M10 21.5V4h7v17.5M17 21.5V12h3v9.5"/><path d="M12.5 7h2M12.5 10h2M12.5 13h2M7 13h1M7 16h1"/>`,
			"swords": `<path d="M4 4l12 12M20 4 8 16"/><path d="M13.5 18.5l5-5M5.5 13.5l5 5M17.5 17.5 20.5 20.5M6.5 17.5 3.5 20.5"/>`,
			"bow": `<path d="M5 4c7 1 14 8 15 15"/><path d="M5 4l15 15"/><path d="M3 21 14 10M14 10h-3.5M14 10v3.5"/>`,
			"wand": `<path d="m4 20 11-11M15 5.5V3M18.5 10H21M17 7l1.8-1.8M11.3 7.3 9.8 5.8M16.7 12.7l1.5 1.5"/><path d="m15 9-2-2"/>`,
			"potion": `<path d="M10 2.5h4M10.5 2.5v5l-4.9 8.9a3.5 3.5 0 0 0 3.1 5.1h6.6a3.5 3.5 0 0 0 3.1-5.1l-4.9-8.9v-5"/><path d="M7.5 14h9"/>`,
			"key": `<circle cx="7.5" cy="15.5" r="4"/><path d="m10.5 12.5 9-9M16 7l2.5 2.5M14 9l2 2"/>`,
			"bomb": `<circle cx="10.5" cy="14" r="6.5"/><path d="m15 9.5 2-2M17 7.5l1.5 1.5M18 4.5c.5-1 1.6-1.5 2.5-1M8 11.5a3 3 0 0 1 2.5-1"/>`,
			"hammer": `<path d="m14.5 6.5-11 11 3 3 11-11"/><path d="M12.5 4.5 16 2l6 6-2.5 3.5z"/>`,
			"mushroom": `<path d="M3.5 12a8.5 7.5 0 0 1 17 0z"/><path d="M8.5 12v6.5a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2V12"/><circle cx="9" cy="8" r="1.3"/><circle cx="15" cy="7.5" r="1.6"/>`,
			"invader": `<path d="M7 5h2v2H7zM15 5h2v2h-2zM9 7h6v2H9zM5 9h14v6h-2v2h-2v-2H9v2H7v-2H5z"/><path d="M8.5 11.5h1M14.5 11.5h1"/>`,
			ball: `<g stroke-width="2"><path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M12 7l4.76 3.45l-1.76 5.55h-6l-1.76 -5.55l4.76 -3.45" /><path d="M12 7v-4m3 13l2.5 3m-.74 -8.55l3.74 -1.45m-11.44 7.05l-2.56 2.95m.74 -8.55l-3.74 -1.45" /></g>`,
			pawn: `<g stroke-width="2"><path d="M8 16l-1.447 .724a1 1 0 0 0 -.553 .894v2.382h12v-2.382a1 1 0 0 0 -.553 -.894l-1.447 -.724h-8" /><path d="M8 16l1 -9h6l1 9" /><path d="M6 4l.5 3h11l.5 -3" /><path d="M10 4v3" /><path d="M14 4v3" /></g>`,
			"headphones": `<path d="M3.5 17v-4a8.5 8.5 0 0 1 17 0v4"/><rect x="2.5" y="14" width="4.5" height="7" rx="1.5"/><rect x="17" y="14" width="4.5" height="7" rx="1.5"/>`,
			camera: `<g stroke-width="2"><path d="M5 7h1a2 2 0 0 0 2 -2a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2" /><path d="M9 13a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" /></g>`,
			"paw": `<circle cx="6.5" cy="10" r="1.8"/><circle cx="10" cy="5.8" r="1.8"/><circle cx="14.5" cy="5.8" r="1.8"/><circle cx="18" cy="10" r="1.8"/><path d="M7.5 18c0-3.3 2.3-6 4.8-6s4.7 2.7 4.7 6c0 2-1.5 3-3 2.5-1-.3-1.1-.5-1.7-.5s-.8.2-1.8.5c-1.6.5-3-.5-3-2.5z"/>`,
			"anchor": `<circle cx="12" cy="5" r="2"/><path d="M12 7v14.5M8 11h8M4 13.5c0 4.5 3.6 8 8 8s8-3.5 8-8"/>`,
			"feather": `<path d="M20 4C12 4 6 9 6 18l-2.5 3"/><path d="M20 4c0 8-4.5 13-13 14M15 9l-8.5 8.5M10.5 14h5"/>`,
			"tree": `<path d="M12 2.5 6 10h3l-4 5.5h14L15 10h3z"/><path d="M12 15.5v6"/>`,
			"sun": `<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>`,
			"snowflake": `<path d="M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6M9.5 4.5 12 6.5l2.5-2M9.5 19.5l2.5-2 2.5 2"/>`,
			"wave": `<path d="M2.5 9.5c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 3-2M2.5 15c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 3-2"/>`,
			"heartbeat": `<path d="M20.5 11.5C21 9 19.4 5 15.8 5c-1.8 0-3 .9-3.8 2-.8-1.1-2-2-3.8-2C4.6 5 3 9 3.5 11.5"/><path d="M2.5 13.5h4l2-3 3 6 2.5-4.5 1.5 1.5h6"/>`,
			// gêneros (3.35.0): um símbolo por ideia, no mesmo traço e margem dos demais
			"g-action": `<g stroke-width="2"><path d="m11 19-6-6" /><path d="m5 21-2-2" /><path d="m8 16-4 4" /><path d="M9.5 17.5 20.414 6.586A2 2 0 0021 5.172V3h-2.172a2 2 0 00-1.414.586L6.5 14.5" /></g>`,
			"g-adventure": `<g stroke-width="2"><circle cx="12" cy="12" r="10" /><path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z" /></g>`,
			"g-arpg": `<g stroke-width="2"><path d="M12 3 5 5.5v5.5c0 4.2 2.9 7.6 7 10 4.1-2.4 7-5.8 7-10V5.5z"/><path d="M12 7v8.5M9.5 13h5M12 15.5v2"/></g>`,
			"g-actionadventure": `<g stroke-width="2"><path d="M2.5 20.5 8.5 14l2.6 2.9 3-3.4 7.4 7z"/><path d="M8.5 12.5 9.3 9.5l4.9-4.9 2.2 2.2-4.9 4.9z"/><path d="m12.6 4 4.4 4.4M16.2 5.8 19.5 2.5"/></g>`,
			"g-sandbox": `<g stroke-width="2"><path d="M12 3l8 4.5l0 9l-8 4.5l-8 -4.5l0 -9l8 -4.5" /><path d="M12 12l8 -4.5" /><path d="M12 12l0 9" /><path d="M12 12l-8 -4.5" /></g>`,
			"g-metroidvania": `<g stroke-width="2"><path d="M17 16c.74 -2.286 2.778 -3.762 5 -3c-.173 -2.595 .13 -5.314 -2 -7.5c-1.708 2.648 -3.358 2.557 -5 2.5v-4l-3 2l-3 -2v4c-1.642 .057 -3.292 .148 -5 -2.5c-2.13 2.186 -1.827 4.905 -2 7.5c2.222 -.762 4.26 .714 5 3c2.593 0 3.889 .952 5 4c1.111 -3.048 2.407 -4 5 -4" /><path d="M9 8a3 3 0 0 0 6 0" /></g>`,
			"g-rpg": `<g stroke-width="2"><path d="M12.859 21.652l8.845 -8.949a.984 .984 0 0 0 0 -1.407l-8.845 -8.948a1.233 1.233 0 0 0 -1.718 0l-8.845 8.949a.984 .984 0 0 0 0 1.407l8.845 8.949a1.234 1.234 0 0 0 1.718 -.001" /><path d="M2 12c.004 .086 .103 .178 .296 .246l8.845 2.632c.459 .163 1.259 .163 1.718 0l8.845 -2.632c.195 -.07 .294 -.156 .296 -.243" /><path d="M12 2.12v19.76" /></g>`,
			"g-jrpg": `<path d="M12 3 16.5 9 12 21 7.5 9z"/><path d="M7.5 9h9M12 3v6"/><path d="M19 4v3M17.5 5.5h3"/>`,
			"g-hackslash": `<g stroke-width="2"><path d="M21 3v5l-11 9l-4 4l-3 -3l4 -4l9 -11l5 0" /><path d="M5 13l6 6" /><path d="M14.32 17.32l3.68 3.68l3 -3l-3.365 -3.365" /><path d="M10 5.5l-2 -2.5h-5v5l3 2.5" /></g>`,
			"g-fighting": `<g fill="currentColor" stroke="none" transform="scale(0.09375)"><path d="M168,16H120A56.06,56.06,0,0,0,64,72H56a32,32,0,0,0-32,32v29.19a16.09,16.09,0,0,0,3.51,10,8,8,0,0,0,.62.69L64,179.34V216a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V177.12l15.38-53.85a15.89,15.89,0,0,0,.62-4.39V72A56.06,56.06,0,0,0,168,16Zm40,102.88L192.31,173.8A7.85,7.85,0,0,0,192,176v40H80V176a8,8,0,0,0-2.38-5.69L40,133.12V104A16,16,0,0,1,56,88h8v16a8,8,0,0,0,16,0V72a40,40,0,0,1,40-40h48a40,40,0,0,1,40,40Zm-36.42,48.28L153.89,176l17.69,8.84a8,8,0,0,1-7.16,14.32L136,184.94l-28.42,14.22a8,8,0,1,1-7.16-14.32L118.11,176l-17.69-8.84a8,8,0,1,1,7.16-14.32L136,167.06l28.42-14.22a8,8,0,1,1,7.16,14.32Z"/></g>`,
			"g-tps": `<g stroke-width="2"><path d="M6 7a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0"/><path d="M3 21v-1.5A3.5 3.5 0 0 1 6.5 16h4"/><circle cx="17.5" cy="17.5" r="3.5"/><path d="M17.5 12.5v1.5M17.5 21v1.5M12.5 17.5H14M21 17.5h1.5"/></g>`,
			"g-survival": `<g stroke-width="2"><path d="M4 21l16 -4" /><path d="M20 21l-16 -4" /><path d="M12 15a4 4 0 0 0 4 -4c0 -3 -2 -3 -2 -8c-4 2 -6 5 -6 8a4 4 0 0 0 4 4" /></g>`,
			"g-simulation": `<g stroke-width="2"><path d="M13 20.693c-.905 .628 -2.36 .292 -2.675 -1.01a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.492 .362 1.716 2.219 .674 3.03" /> <path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" /> <path d="M17 22l5 -3l-5 -3l0 6" /></g>`,
			"g-platformer": `<g stroke-width="2"><path d="M11.007 5a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M4 17l5 1l.75 -1.5" /><path d="M15 21v-4l-4 -3l1 -6" /><path d="M7 12v-3l5 -1l3 3l3 1" /></g>`,
			"g-platformer2d": `<path d="M3.5 20.5h17V4.5H17v4h-4v4H9v4H3.5z"/>`,
			"g-platformer3d": `<path d="M4 15.5 12 11.5l8 4-8 4z"/><path d="M4 15.5V17l8 4 8-4v-1.5"/><path d="M6.5 9C8 3.5 16 3.5 17.5 9" stroke-dasharray="0 3.2"/>`,
			"g-precision": `<path d="M3.5 20.5 5.6 16l2.1 4.5 2.1-4.5 2.2 4.5 2.1-4.5 2.1 4.5 2.1-4.5 2.2 4.5"/><path d="M4.5 11c2.5-6 12.5-6 15 0" stroke-dasharray="0 3.2"/>`,
			"g-openworld": `<g stroke-width="2"><path d="M2.5 19 9.5 8l7 11z"/><path d="M14 15l3-4.5L21.5 19h-5"/></g>`,
			"g-parkour": `<circle cx="15" cy="4.8" r="1.8"/><path d="m13.8 8.3-3 5.2 3.6 2.6-1.1 4.4"/><path d="m7.8 10 3.2-1.8 3 .2 2.6 3.1M10.8 13.5 8 16.3H4.8"/>`,
			"g-tactical": `<g stroke-width="2"><line x1="2" x2="5" y1="12" y2="12" /><line x1="19" x2="22" y1="12" y2="12" /><line x1="12" x2="12" y1="2" y2="5" /><line x1="12" x2="12" y1="19" y2="22" /><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="3" /></g>`,
			"g-stealth": `<g stroke-width="2"><path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6" /></g>`,
			"g-rhythm": `<g stroke-width="2"><path d="M3 17a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" /><path d="M13 17a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" /><path d="M9 17v-13h10v13" /><path d="M9 8h10" /></g>`,
			"g-indie": `<path d="M10 19v-2H8v-2H6v-2H4V8h2V6h4v2h4V6h4v2h2v5h-2v2h-2v2h-2v2z"/>`,
			"g-narrative": `<path d="M12 6.8C10 5.3 7.5 4.8 3.5 4.8v13c4 0 6.5.5 8.5 2 2-1.5 4.5-2 8.5-2v-13c-4 0-6.5.5-8.5 2z"/><path d="M12 6.8v13"/>`,
			"g-visualnovel": `<g stroke-width="2"><path d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0" /><path d="M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0" /><path d="M3 6l0 13" /><path d="M12 6l0 13" /><path d="M21 6l0 13" /></g>`,
			"g-mmo": `<g stroke-width="2"><path d="M5 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" /><path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /><path d="M21 21v-2a4 4 0 0 0 -3 -3.85" /></g>`,
			"g-coop": `<g stroke-width="2"><path d="m11 17 2 2a1 1 0 1 0 3-3" /><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" /><path d="m21 3 1 11h-2" /><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" /><path d="M3 4h8" /></g>`,
			"g-soulslike": `<g fill="currentColor" stroke="none" transform="scale(0.09375)"><path d="M183.89,153.34a57.6,57.6,0,0,1-46.56,46.55A8.75,8.75,0,0,1,136,200a8,8,0,0,1-1.32-15.89c16.57-2.79,30.63-16.85,33.44-33.45a8,8,0,0,1,15.78,2.68ZM216,144a88,88,0,0,1-176,0c0-27.92,11-56.47,32.66-84.85a8,8,0,0,1,11.93-.89l24.12,23.41,22-60.41a8,8,0,0,1,12.63-3.41C165.21,36,216,84.55,216,144Zm-16,0c0-46.09-35.79-85.92-58.21-106.33L119.52,98.74a8,8,0,0,1-13.09,3L80.06,76.16C64.09,99.21,56,122,56,144a72,72,0,0,0,144,0Z"/></g>`,
			// vindos do módulo legado (3.39.0): mesma grade e traço, agora num só registro
			folder: `<path d="M3.5 7a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>`,
			store: `<path d="M5 8h14l-1.2 11.5a1.5 1.5 0 0 1-1.5 1.3H7.7a1.5 1.5 0 0 1-1.5-1.3z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>`,
			trend: `<path d="M3.5 17l6-6 4 4 7-7.5"/><path d="M15 7.5h5.5V13"/>`,
			inbox: `<path d="M3.5 13.5l2.6-7.7A1.5 1.5 0 0 1 7.5 4.8h9a1.5 1.5 0 0 1 1.4 1l2.6 7.7V18a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 3.5 18z"/><path d="M3.5 13.5H8l1.5 2.5h5l1.5-2.5h4.5"/>`,
			ban: `<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>`,
			box: `<path d="M3.5 7.5L12 3.5l8.5 4v9L12 20.5l-8.5-4z"/><path d="M3.5 7.5L12 11.5l8.5-4M12 11.5v9"/>`,
			sliders: `<path d="M5 20v-6M5 10V4M12 20v-8M12 8V4M19 20v-4M19 12V4"/><path d="M3 14h4M10 8h4M17 16h4"/>`,
			arrowsH: `<path d="M3.5 12h17M7 8.5L3.5 12 7 15.5M17 8.5l3.5 3.5-3.5 3.5"/>`,
			arrowsV: `<path d="M12 3.5v17M8.5 7L12 3.5 15.5 7M8.5 17l3.5 3.5 3.5-3.5"/>`,
			brain: `<path d="M9 4.5a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 .5V6a1.5 1.5 0 0 0-3-1.5zM15 4.5a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 .5"/>`,
			disc: `<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.5"/>`,
			save: `<path d="M5 3.5h11l3.5 3.5v12a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V5A1.5 1.5 0 0 1 5 3.5z"/><path d="M7.5 3.5v5h8v-5M7.5 20.5v-6h9v6"/>`,
			chat: `<path d="M4 5.5h16v11H9l-4.5 3.5V16.5H4z"/>`,
			pause: `<path d="M8 5v14M16 5v14"/>`,
			circle: `<circle cx="12" cy="12" r="8.5"/>`,
			gift: `<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M3.5 9h17M12 9v11M12 9c-1.5-3.5-5.5-4-5.5-1.5S10 9 12 9zM12 9c1.5-3.5 5.5-4 5.5-1.5S14 9 12 9z"/>`,
			cards: `<rect x="3.5" y="6" width="11" height="15" rx="1.5"/><path d="M9 3.5l9.8 2.2a1.5 1.5 0 0 1 1.1 1.8l-2.7 12"/>`,
			// 3.40.0: ícones do quadro de referência sem equivalente anterior
			"g-fps": `<g fill="currentColor" stroke="none" transform="scale(0.09375)"><path d="M232,120h-8.34A96.14,96.14,0,0,0,136,32.34V24a8,8,0,0,0-16,0v8.34A96.14,96.14,0,0,0,32.34,120H24a8,8,0,0,0,0,16h8.34A96.14,96.14,0,0,0,120,223.66V232a8,8,0,0,0,16,0v-8.34A96.14,96.14,0,0,0,223.66,136H232a8,8,0,0,0,0-16Zm-96,87.6V200a8,8,0,0,0-16,0v7.6A80.15,80.15,0,0,1,48.4,136H56a8,8,0,0,0,0-16H48.4A80.15,80.15,0,0,1,120,48.4V56a8,8,0,0,0,16,0V48.4A80.15,80.15,0,0,1,207.6,120H200a8,8,0,0,0,0,16h7.6A80.15,80.15,0,0,1,136,207.6ZM128,88a40,40,0,1,0,40,40A40,40,0,0,0,128,88Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,152Z"/></g>`,
		};
		return this._paths;
	}

	get wideIcons() { return this._wide || (this._wide = new Set(["c-ps1", "c-ps2", "c-ps3", "c-ps4", "c-ps5", "h-psp", "h-vita"])); }

	icon(name, cls = "") {
		// imagem própria (3.38.0): "img:<endereço>" vira <img> com a mesma classe
		// e o mesmo tamanho do ícone, então serve em qualquer lugar que use icon()
		if (typeof name === "string" && name.startsWith("img:")) {
			const src = name.slice(4);
			return src ? `<img class="sv-i sv-i--img${cls ? " " + cls : ""}" src="${this.attr(src)}" alt="" aria-hidden="true" loading="lazy" decoding="async" draggable="false">` : "";
		}
		const d = this.paths[name];
		if (!d) return "";
		// letreiros largos (PS1, PS2…, PSP, Vita, 3.42.0): caixa 3:2 sem a margem vazia
		// de cima e de baixo, para o logo ter a mesma presença dos ícones quadrados
		const wide = this.wideIcons.has(name);
		return `<svg class="sv-i${wide ? " sv-i--wide" : ""}${cls ? " " + cls : ""}" viewBox="${wide ? "0 4 24 16" : "0 0 24 24"}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
	}

	// ----------------------------------------------------------- primitivos
	btn(label, { icon = "", kind = "secondary", action = "", attrs = "", size = "", title = "" } = {}) {
		const cls = `sv-btn sv-btn--${kind}${size ? ` sv-btn--${size}` : ""}${!label ? " sv-btn--icon" : ""}`;
		return `<button type="button" class="${cls}"${action ? ` data-action="${this.attr(action)}"` : ""}${title || !label ? ` title="${this.attr(title || label)}" aria-label="${this.attr(title || label)}"` : ""} ${attrs}>${icon ? this.icon(icon) : ""}${label ? `<span>${this.esc(label)}</span>` : ""}</button>`;
	}

	// gênero/plataforma: abre a página; se ainda não existir, o toque cria e abre
	catAttrs(kind, name, page) {
		return page ? this.openAttrs(page.path) : `data-action="open-category" data-kind="${kind}" data-name="${this.attr(name)}" href="#" role="link"`;
	}

	// Avatar → menu de conta (status das contas e sincronização). Não repete
	// a aba "Perfil": mostra quem está conectado e dá atalhos de sync.
	accountMenu(steamCfg, raCfg, avatar, syncState) {
		const steamOn = !!steamCfg?.configured;
		const raOn = !!raCfg?.configured;
		const raLast = raCfg?.lastSync ? `Sync ${this.relDate(String(raCfg.lastSync).slice(0, 10))}` : "Nunca sincronizado";
		return `<div class="sv-menu-wrap sv-account">
			<button type="button" class="sv-profile-btn sv-fab" data-action="menu" aria-haspopup="true" aria-expanded="false" title="${this.attr(steamCfg?.name || "Conta")}">${avatar}</button>
			<div class="sv-menu sv-account-menu" role="menu" hidden>
				<div class="sv-account-head">
					<span class="sv-account-avatar">${avatar}</span>
					<span class="sv-account-id"><b>${this.esc(steamOn ? (steamCfg.name || steamCfg.customUrl || "Perfil Steam") : "Steam não conectada")}</b><small class="sv-account-state sv-account-state--${syncState[0]}">${this.esc(steamOn ? syncState[1] : "Conecte para sincronizar")}</small></span>
				</div>
				<a role="menuitem" ${this.openAttrs("Dashboard/Perfil")}>${this.icon("user")}Meu perfil</a>
				<a role="menuitem" ${this.openAttrs("Dashboard/Steam")}>${this.icon("b-steam")}Perfil Steam</a>
				${steamOn ? `<button role="menuitem" data-action="steam-sync">${this.icon("refresh")}Sincronizar Steam</button>` : `<button role="menuitem" data-action="steam-connect">${this.icon("link")}Conectar Steam</button>`}
				<div class="sv-menu-sep"></div>
				${raCfg ? (raOn
					? `<button role="menuitem" class="sv-menu-ra" data-action="ra-sync">${this.icon("b-retro")}<span>Sincronizar RetroAchievements<small>${this.esc(raCfg.user)} · ${this.esc(raLast)}</small></span></button>`
					: `<button role="menuitem" class="sv-menu-ra" data-action="ra-connect">${this.icon("b-retro")}Conectar RetroAchievements</button>`) : ""}
				<a role="menuitem" ${this.openAttrs("Dashboard/Integrações")}>${this.icon("link")}Todas as integrações</a>
				<button role="menuitem" data-action="share-card" data-kind="profile">${this.icon("share")}Compartilhar perfil</button>
				<a role="menuitem" ${this.openAttrs("Dashboard/Configurações")}>${this.icon("gear")}Configurações</a>
			</div>
		</div>`;
	}

	// atalhos do Obsidian no menu "Mais" (celular): substituem a barra
	// inferior do Obsidian quando ela está oculta pelo Style Settings
	obsidianGroup() {
		const it = (cmd, icon, label) => `<button type="button" class="sv-nav-item" data-action="obs" data-cmd="${cmd}">${this.icon(icon)}<span>${label}</span></button>`;
		return `<div class="sv-nav-group sv-nav-group--obsidian"><span class="sv-nav-label">Obsidian</span>
			${it("back", "chevronLeft", "Voltar")}${it("forward", "chevronRight", "Avançar")}${it("search", "search", "Buscar no vault")}
			${it("new", "plus", "Nova nota")}${it("edit", "edit", "Editar nota")}${it("sidebar", "sidebar", "Menu lateral do Obsidian")}${it("navbar", "rows", "Mostrar controles do Obsidian")}</div>`;
	}

	safeUrl(url, opts) { return customJS.SteamVaultCore.safeUrl(url, opts); }

	openAttrs(path) { return `data-open="${this.attr(path)}" href="${this.attr(path)}"`; }

	statusTag(g, C) {
		const tone = C.statusDefs[g.status]?.tone || "muted";
		let label = C.statusLabel(g.status);
		if (g.notPlayed && g.status === "Backlog") label = "Não jogado";
		return `<span class="sv-status sv-tone-${tone}"><i></i><span class="sv-status-label">${this.esc(label)}</span></span>`;
	}

	progressBar(pct, { tone = "", thin = false, label = "" } = {}) {
		const v = pct === null || pct === undefined ? 0 : Math.max(0, Math.min(100, pct));
		return `<div class="sv-progress${thin ? " sv-progress--thin" : ""}${tone ? ` sv-tone-${tone}` : ""}" role="progressbar" aria-valuenow="${Math.round(v)}" aria-valuemin="0" aria-valuemax="100"${label ? ` aria-label="${this.attr(label)}"` : ""}><span style="width:${v}%"></span></div>`;
	}

	ring(pct, { size = 56, stroke = 4, perfect = false } = {}) {
		const r = (size - stroke) / 2, c = 2 * Math.PI * r;
		const v = pct === null ? 0 : Math.max(0, Math.min(100, pct));
		return `<svg class="sv-ring${perfect ? " is-perfect" : ""}" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
			<circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" class="sv-ring-track"/>
			<circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" class="sv-ring-fill" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - v / 100)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
		</svg>`;
	}

	// 3.68.0: as cinco estrelas num elemento só (máscaras de CSS), em vez de
	// cinco SVGs: na Biblioteca eram ~500 elementos a menos por tela.
	// --on = estrelas cheias; <i> = a meia estrela (contorno dourado)
	stars(rating) {
		const r = Math.max(0, Math.min(5, Number(rating) || 0));
		const on = Math.floor(r + 1e-9), half = r - on >= 0.5 ? 1 : 0;
		return `<span class="sv-stars" role="img" aria-label="${r} de 5" style="--on:${on}">${half ? `<i style="--at:${on}"></i>` : ""}</span>`;
	}

	// capa com fallback tipográfico: nunca uma área vazia
	cover(g, { cls = "", eager = false } = {}) {
		const src = g.images.cover;
		const style = `--sv-hue:${g.hue}`;
		const fallback = `<div class="sv-cover-fallback" style="${style}"><span class="sv-cover-fallback-title">${this.esc(g.title)}</span><span class="sv-cover-fallback-meta">${this.esc(g.platform)}</span></div>`;
		if (!src) return `<div class="sv-cover is-missing ${cls}" style="${style}">${fallback}</div>`;
		return `<div class="sv-cover ${cls}" style="${style}">${fallback}<img src="${this.attr(src)}" alt="" ${eager ? "" : 'loading="lazy"'} decoding="async" data-sv-img></div>`;
	}

	// 🏆 42/50 (84% no estreito). Com mais de uma origem na biblioteca, um
	// ponto na cor da origem diz de onde vêm — sem texto extra no card.
	achMini(g, { provider = false } = {}) {
		if (g.ach.state !== "known" || !g.ach.total) return "";
		const pv = provider && g.provider !== "unset" ? ` sv-achsrc--${this.attr(g.provider)} has-pv` : "";
		return `<span class="sv-achmini${g.ach.perfect ? " is-perfect" : ""}${pv}" title="${g.ach.unlocked} de ${g.ach.total} conquistas${provider ? ` · ${this.attr(g.providerLabel)}` : ""}">${this.icon("trophy")}<b class="sv-achmini-full">${g.ach.unlocked}/${g.ach.total}</b><b class="sv-achmini-short">${this.fmtPct(g.ach.pctRound)}</b></span>`;
	}

	// ----------------------------------------------------------- game card
	// prioridade: arte → título → status → progresso. O resto aparece no hover.
	gameCard(g, C, { size = "", lib = null } = {}) {
		const pct = g.ach.state === "known" ? g.ach.pct : null;
		const progress = pct !== null ? this.progressBar(pct, { thin: true, tone: g.ach.perfect ? "gold" : "" }) : "";
		// url() dentro de variável CSS é resolvido em relação à FOLHA de estilo:
		// o endereço vai absoluto (3.58.1), senão um caminho relativo dá 404
		let wide = this.layout().cards.style === "cinema" ? (g.images.featured || g.images.background || "") : "";
		if (wide) { try { wide = new URL(wide, document.baseURI).href; } catch (_) { wide = ""; } }
		return `<article class="sv-card${size ? ` sv-card--${size}` : ""}${g.favorite ? " is-favorite" : ""}${wide ? " has-wide" : ""}" data-game="${this.attr(g.path)}"${wide ? ` style="--sv-art:url(&quot;${this.attr(wide)}&quot;)"` : ""}>
			<a class="sv-card-art" ${this.openAttrs(g.path)} aria-label="${this.attr(g.title)}">
				${this.cover(g)}
				${g.favorite ? `<span class="sv-card-favmark" aria-hidden="true">${this.icon("heart")}<span>Favorito</span></span>` : ""}
				<div class="sv-card-overlay">
					<div class="sv-card-overlay-top">${g.favorite ? `<span class="sv-card-fav" title="Favorito">${this.icon("heart")}</span>` : ""}</div>
					<div class="sv-card-overlay-body">
						${g.ach.state === "known" && g.ach.total ? `<div class="sv-card-stat">${this.icon("trophy")}<b>${this.fmtPct(g.ach.pctRound)}</b><span>${g.ach.unlocked}/${g.ach.total}</span></div>` : ""}
						<div class="sv-card-stat">${this.icon("clock")}<b>${this.fmtHours(g.playtime.hours)}</b></div>
						${g.rating ? `<div class="sv-card-stat is-rating">${this.icon("star")}<b>${this.fmtNum(g.rating, 1)}</b></div>` : ""}
					</div>
				</div>
				${g.ach.perfect ? (lib ? `<span class="sv-card-ribbon" title="100% das conquistas">${this.icon("gem")}100%</span>` : `<span class="sv-card-perfect" title="100% das conquistas">${this.icon("gem")}</span>`) : ""}
				${lib && !(g.status === "Wishlist" && g.currentPrice !== null) ? `<span class="sv-card-plat" style="--sv-pc:${this.attr(lib.color)}" title="${this.attr(lib.label)}">${this.icon(lib.icon)}<span>${this.esc(lib.label)}</span></span>` : ""}
				${g.status === "Wishlist" && g.currentPrice !== null ? `<span class="sv-card-price${g.targetPrice && g.currentPrice <= g.targetPrice ? " is-target" : ""}" title="${this.attr(g.targetPrice && g.currentPrice <= g.targetPrice ? "No preço-alvo" : "Preço atual")}">${g.targetPrice && g.currentPrice <= g.targetPrice ? this.icon("bell") : ""}${this.esc(g.currentPrice === 0 ? "Grátis" : this.fmtMoney(g.currentPrice))}${g.discountPercent ? `<em>−${this.fmtNum(g.discountPercent)}%</em>` : ""}</span>` : ""}
			</a>
			<button type="button" class="sv-card-favbtn${g.favorite ? " is-on" : ""}" data-action="favorite" data-path="${this.attr(g.path)}" aria-pressed="${g.favorite}" title="${g.favorite ? "Remover dos favoritos" : "Favoritar"}">${this.icon("heart")}</button>
			<div class="sv-card-body">
				<a class="sv-card-title" ${this.openAttrs(g.path)}>${this.esc(g.title)}</a>
				<div class="sv-card-meta">${this.statusTag(g, C)}${this.achMini(g, { provider: !!window.__svModelCache?.model?.stats?.achMixed })}</div>
				${lib ? `<div class="sv-card-sub">${g.rating ? `${this.stars(g.rating)}<span class="sv-card-rate">${this.icon("star")}${this.fmtNum(g.rating, 1)}</span>` : `<span class="sv-card-norate">Sem nota</span>`}<span class="sv-card-hours">${this.icon("clock")}${this.fmtHours(g.playtime.hours)}</span></div>` : ""}
				${progress}
			</div>
		</article>`;
	}

	// variação larga para "continuar jogando": arte horizontal
	wideCard(g, C) {
		const art = g.images.featured || g.images.background;
		const pct = g.ach.state === "known" ? g.ach.pct : null;
		return `<article class="sv-wide" data-game="${this.attr(g.path)}" style="--sv-hue:${g.hue}">
			<a class="sv-wide-art" ${this.openAttrs(g.path)} aria-label="${this.attr(g.title)}">
				${art ? `<img src="${this.attr(art)}" alt="" loading="lazy" data-sv-img style="object-position:${g.framing.x}% ${g.framing.y}%">` : `<div class="sv-wide-fallback"></div>`}
				<div class="sv-wide-shade"></div>
				<div class="sv-wide-info">
					<span class="sv-wide-title">${this.esc(g.title)}</span>
					<span class="sv-wide-meta">${this.statusTag(g, C)}<span>${this.icon("clock")}${this.fmtHours(g.playtime.hours)}</span>${g.lastPlayed.date ? `<span>${this.esc(this.relDate(g.lastPlayed.date))}</span>` : ""}</span>
					${pct !== null ? `<div class="sv-wide-progress">${this.progressBar(pct, { thin: true, tone: g.ach.perfect ? "gold" : "" })}<span>${this.fmtPct(g.ach.pctRound)}</span></div>` : ""}
				</div>
			</a>
		</article>`;
	}

	gameRow(g, C) {
		return `<div class="sv-row" data-game="${this.attr(g.path)}">
			<a class="sv-row-art" ${this.openAttrs(g.path)}>${this.cover(g)}</a>
			<a class="sv-row-title" ${this.openAttrs(g.path)}>${this.esc(g.title)}<small class="sv-meta"><span>${this.esc(g.platform)}</span>${g.releaseYear ? `<span>${g.releaseYear}</span>` : ""}</small></a>
			<span class="sv-row-cell">${this.statusTag(g, C)}</span>
			<span class="sv-row-cell sv-num">${this.fmtHours(g.playtime.hours)}</span>
			<span class="sv-row-cell sv-row-ach">${g.ach.state === "known" && g.ach.total ? `${this.progressBar(g.ach.pct, { thin: true, tone: g.ach.perfect ? "gold" : "" })}<span class="sv-num">${g.ach.unlocked}/${g.ach.total}</span>` : `<span class="sv-muted">—</span>`}</span>
			<span class="sv-row-cell sv-num">${g.rating ? `${this.icon("star", "sv-i--gold")}${this.fmtNum(g.rating, 1)}` : `<span class="sv-muted">—</span>`}</span>
		</div>`;
	}

	// ----------------------------------------------------------- estrutura
	sectionHead(title, { count = null, action = "", sub = "", id = "" } = {}) {
		return `<header class="sv-sechead"${id ? ` id="${this.attr(id)}"` : ""}>
			<div class="sv-sechead-text"><h2>${this.esc(title)}${count !== null ? `<span class="sv-count">${this.fmtNum(count)}</span>` : ""}</h2>${sub ? `<p>${this.esc(sub)}</p>` : ""}</div>
			${action ? `<div class="sv-sechead-actions">${action}</div>` : ""}
		</header>`;
	}

	shelf(title, itemsHtml, { count = null, action = "", id = "", variant = "" } = {}) {
		if (!itemsHtml.length) return "";
		return `<section class="sv-shelf${variant ? ` sv-shelf--${variant}` : ""}"${id ? ` id="${this.attr(id)}"` : ""}>
			${this.sectionHead(title, { count, action: `${action}<span class="sv-shelf-nav">${this.btn("", { icon: "chevronLeft", kind: "ghost", size: "sm", action: "shelf-prev", title: "Anterior" })}${this.btn("", { icon: "chevronRight", kind: "ghost", size: "sm", action: "shelf-next", title: "Próximo" })}</span>` })}
			<div class="sv-shelf-track" tabindex="0">${itemsHtml.join("")}</div>
		</section>`;
	}

	empty({ icon = "info", title, text = "", action = "", compact = false }) {
		return `<div class="sv-empty${compact ? " sv-empty--compact" : ""}">
			<span class="sv-empty-icon">${this.icon(icon)}</span>
			<div class="sv-empty-text"><strong>${this.esc(title)}</strong>${text ? `<p>${this.esc(text)}</p>` : ""}</div>
			${action ? `<div class="sv-empty-action">${action}</div>` : ""}
		</div>`;
	}

	// faixa de números com hierarquia: um valor principal, rótulo discreto
	figures(items) {
		return `<dl class="sv-figures">${items.filter(Boolean).map(it => `<div class="sv-figure${it.tone ? ` sv-tone-${it.tone}` : ""}"><dt>${this.esc(it.label)}</dt><dd>${it.html ?? this.esc(it.value)}${it.sub ? `<small>${this.esc(it.sub)}</small>` : ""}</dd></div>`).join("")}</dl>`;
	}

	// barras de distribuição (estatísticas, gêneros)
	bars(rows, { unit = "", max = null } = {}) {
		const m = max ?? Math.max(1, ...rows.map(r => r.value));
		return `<div class="sv-bars">${rows.map(r => `<div class="sv-bar-row">
			<span class="sv-bar-label">${r.href ? `<a ${this.openAttrs(r.href)}>${this.esc(r.label)}</a>` : this.esc(r.label)}</span>
			<span class="sv-bar-track"><span style="width:${(r.value / m) * 100}%${r.color ? `;background:${r.color}` : ""}"></span></span>
			<span class="sv-bar-value sv-num">${this.esc(r.display ?? `${this.fmtNum(r.value, 1)}${unit}`)}</span>
		</div>`).join("")}</div>`;
	}

	syncBadge(state, label, detail = "") {
		const icon = state === "ok" ? "cloud" : state === "busy" ? "refresh" : "cloudOff";
		return `<span class="sv-sync sv-sync--${this.attr(state)}" title="${this.attr(detail || label)}">${this.icon(icon)}<span>${this.esc(label)}</span></span>`;
	}

	tabs(items, active, { cls = "" } = {}) {
		return `<nav class="sv-tabs ${cls}" role="tablist">${items.map(t => `<button type="button" role="tab" class="sv-tab${t.id === active ? " is-active" : ""}" data-tab="${this.attr(t.id)}" aria-selected="${t.id === active}">${this.esc(t.label)}${t.count !== undefined && t.count !== null ? `<span class="sv-tab-count">${this.fmtNum(t.count)}</span>` : ""}</button>`).join("")}</nav>`;
	}

	// ----------------------------------------------------------- conquista
	rarityTier(p) {
		if (p === null || p === undefined) return "";
		if (p <= 5) return "legendary";
		if (p <= 15) return "epic";
		if (p <= 35) return "rare";
		if (p <= 60) return "uncommon";
		return "common";
	}

	// cor de cada conjunto de conquistas: jogo base azul, DLCs na ordem
	achSetTone(base, i) { return base ? "var(--sv-blue)" : ["#a06bff", "#e8b13c", "#22b8cf", "#ec5a9e", "#2fbf6c", "#ff8a3d"][(Math.max(1, i) - 1) % 6]; }

	rarityLabel(tier) { return ({ legendary: "Lendária", epic: "Épica", rare: "Rara", uncommon: "Incomum", common: "Comum" })[tier] || ""; }

	// origem + sincronização das conquistas: dois selos, nunca um só
	syncIcon(sync) { return ({ automatic: "refresh", manual: "edit", local: "vault", none: "x" })[sync] || "x"; }
	// cor de destaque (3.20.0): [nome, cor, forte, tema claro, texto sobre ela]
	accents() {
		return {
			blue: ["Azul Steam", "#1a9fff", "#0b84e3", "#0a6bc0", ""],
			sky: ["Azul-céu", "#66c0f4", "#3d9fd8", "#1a6aa3", "#0b1119"],
			purple: ["Roxo", "#8b6cff", "#6a4ce0", "#6a4ce0", "#ffffff"],
			pink: ["Rosa", "#ec5a9e", "#c93a7d", "#c2336f", "#ffffff"],
			red: ["Vermelho", "#f2545b", "#d33a42", "#c62f37", "#ffffff"],
			orange: ["Laranja", "#ff8a3d", "#e0661a", "#b34c0d", "#0b1119"],
			gold: ["Dourado", "#e8b13c", "#c38f19", "#946500", "#0b1119"],
			green: ["Verde", "#2fbf6c", "#1f9454", "#1a7f47", "#0b1119"],
			cyan: ["Ciano", "#22b8cf", "#13909f", "#0c7684", "#0b1119"]
		};
	}

	// temas da interface: só fundos e superfícies (a cor de destaque é à parte)
	themes() {
		return {
			steam: ["Steam", "Azul-marinho, o padrão", ["#0e151f", "#141d29", "#1a2533"]],
			classic: ["Steam clássico", "Os tons do cliente da Steam", ["#171a21", "#1b2838", "#2a475e"]],
			graphite: ["Grafite", "Cinza neutro, sem azul", ["#111114", "#18181c", "#212126"]],
			midnight: ["Meia-noite", "Azul quase preto", ["#060a13", "#0c1322", "#121b2e"]]
		};
	}

	// ícone de cada origem/plataforma: marca para as lojas e redes,
	// símbolo para as origens do próprio vault
	providerIcon(id) {
		return { steam: "b-steam", retroachievements: "b-retro", xbox: "b-xbox", playstation: "b-playstation", gog: "b-gog", epic: "b-epic", googleplay: "b-googleplay", nintendo: "b-nintendo", native: "medal", custom: "sparkles", none: "x", unset: "info", all: "trophy" }[id] || "trophy";
	}

	achSourceTag(g, { cls = "", sync = true } = {}) {
		if (g.provider === "none") return "";
		return `<span class="sv-achsrc sv-achsrc--${this.attr(g.provider)}${cls ? " " + cls : ""}" title="Origem das conquistas: ${this.attr(g.providerLabel)} · Sincronização: ${this.attr(g.syncLabel)}">`
			+ `<span class="sv-achsrc-pv">${this.icon(this.providerIcon(g.provider))}${this.esc(g.providerLabel)}</span>`
			+ (sync && g.sync !== "none" ? `<span class="sv-achsrc-sync sv-sync--${this.attr(g.sync)}">${this.icon(this.syncIcon(g.sync))}${this.esc(g.syncLabel)}</span>` : "")
			+ `</span>`;
	}

	achievementTile(a, { showGame = null, toggle = false, unit = "" } = {}) {
		// faixa: pela % global quando existe; senão a escolhida no editor
		const tier = a.rarity !== null && a.rarity !== undefined ? this.rarityTier(a.rarity) : (a.rarityTier || "");
		const secret = a.secret && !a.unlocked;
		const known = a.rarity !== null && a.rarity !== undefined;
		// 3.27.0 (visual dos Conjuntos de Conquistas da Steam): barra fina com a
		// % de jogadores e a faixa; as raras desbloqueadas (até 10%) brilham
		const gl = known ? `<span class="sv-ach-gl" title="${this.attr(this.rarityLabel(tier))} — ${this.fmtPct(a.rarity)} dos jogadores"><span class="sv-ach-glbar"><i style="width:${Math.max(2, Math.min(100, a.rarity))}%"></i></span><em>${this.fmtPct(a.rarity)} · ${this.esc(this.rarityLabel(tier))}</em></span>`
			: tier ? `<span class="sv-ach-gl" title="Raridade definida por você"><em>${this.esc(this.rarityLabel(tier))}</em></span>` : "";
		const glow = a.unlocked && known && a.rarity <= 10;
		return `<div class="sv-ach${a.unlocked ? " is-unlocked" : " is-locked"}${tier ? ` sv-rarity-${tier}` : ""}${secret ? " is-secret" : ""}${glow ? " is-glow" : ""}${a.archived ? " is-archived" : ""}" data-set="${this.attr(a.set || "Jogo base")}" data-ach-unlocked="${a.unlocked}" data-ach-rarity="${a.rarity ?? ""}" data-ach-date="${this.attr((a.unlockedDate || "") + (a.unlockedTime || ""))}" data-search="${this.attr((a.name + " " + (secret ? "" : a.description) + " " + (a.category || "")).toLowerCase())}">
			<a class="sv-ach-icon" ${a.path ? this.openAttrs(a.path) : ""} aria-label="${this.attr(a.name || "Conquista")}">${a.iconSrc ? `<img src="${this.attr(a.iconSrc)}" alt="" loading="lazy" data-sv-img>` : this.icon(secret ? "eye" : "trophy")}${a.unlocked ? "" : `<span class="sv-ach-lock">${this.icon("lock")}</span>`}</a>
			<div class="sv-ach-text"${secret ? ` tabindex="0" title="Conquista secreta — toque para revelar"` : ""}>
				<strong>${this.esc(a.name)}</strong>
				${a.description ? `<p>${this.esc(a.description)}</p>` : !a.unlocked && (a.steamApiName || a.raId !== null && a.raId !== undefined) ? `<p>Conquista oculta ou sem descrição</p>` : ""}
				${a.category || secret || showGame || a.archived ? `<span class="sv-ach-tags">${secret ? `<span class="sv-ach-secret">${this.icon("lock")}Secreta</span>` : ""}${a.archived ? `<span class="sv-ach-cat">Arquivada</span>` : ""}${a.category ? `<span class="sv-ach-cat">${this.esc(a.category)}</span>` : ""}${showGame ? `<a class="sv-ach-game" ${this.openAttrs(showGame.path)}>${this.esc(showGame.title)}</a>` : ""}</span>` : ""}
				${gl}
			</div>
			<div class="sv-ach-side">
				${unit && Number(a.points) > 0 ? `<span class="sv-ach-pts" title="${this.attr(`${a.points} ${unit === "G" ? "de Gamerscore" : unit}`)}">${this.fmtNum(a.points)}<i>${this.esc(unit)}</i></span>` : ""}
				${a.unlocked && a.unlockedDate ? `<time>${this.esc(this.fmtDate(a.unlockedDate))}</time>` : ""}
				${toggle && a.path ? `<button type="button" class="sv-ach-check${a.unlocked ? " is-on" : ""}" data-action="ach-unlock" data-path="${this.attr(a.path)}" aria-pressed="${a.unlocked}" title="${a.unlocked ? "Marcar como bloqueada" : "Marcar como desbloqueada"}">${this.icon("check")}</button>` : ""}
			</div>
		</div>`;
	}

	// ----------------------------------------------------------- app shell
	shell({ active, content, C, model, steamCfg, raCfg = null, title = "" }) {
		const collapsed = this._store("sidebar") === "collapsed";
		const navItem = it => `<a class="sv-nav-item${it.id === active ? " is-active" : ""}" ${this.openAttrs(it.path)} data-tip="${this.attr(it.label)}"${it.id === active ? ' aria-current="page"' : ""}>${this.icon(it.icon)}<span>${this.esc(it.label)}</span></a>`;
		const groups = this.nav.map(g => `<div class="sv-nav-group${g.tone ? ` sv-nav-group--${g.tone}` : ""}"><span class="sv-nav-label">${this.esc(g.label)}</span>${g.items.map(navItem).join("")}</div>`).join("");
		const all = this.nav.flatMap(g => g.items);
		const mobile = this.mobileNav.map(id => all.find(i => i.id === id)).filter(Boolean);
		const avatar = steamCfg?.avatar ? `<img src="${this.attr(steamCfg.avatar)}" alt="">` : this.icon("user");
		const syncState = !steamCfg?.configured ? ["off", "Steam não conectada"] : steamCfg.syncStatus && steamCfg.syncStatus !== "ok" ? ["warn", "Sync com aviso"] : steamCfg.lastSync ? ["ok", `Sync ${this.relDate(String(steamCfg.lastSync).slice(0, 10))}`] : ["off", "Nunca sincronizado"];
		// item da barra inferior que representa a tela atual: fichas de jogo
		// pertencem à Biblioteca, sub-telas da Steam ao Perfil (entrada da
		// seção Steam) e todo o resto do menu ao "Mais"
		const mobileIds = new Set(mobile.map(it => it.id));
		const bottomActive = mobileIds.has(active) ? active
			: active === "game" ? "library"
			: active === "achievement" ? "achievements"
			: active ? "more" : "";
		return `<div class="sv-app${collapsed ? " is-collapsed" : ""}" data-active="${this.attr(active)}">
			<button type="button" class="sv-skip" data-action="skip-content">Pular para o conteúdo</button>
			<aside class="sv-sidebar" aria-label="Navegação">
				<div class="sv-brand">
					<a class="sv-brand-mark" ${this.openAttrs("Dashboard/Home")} aria-label="Game Library — início">${this.icon("brand")}</a>
					<span class="sv-brand-name">Game Library</span>
					<button type="button" class="sv-collapse" data-action="toggle-sidebar" title="Recolher barra lateral" aria-label="Recolher barra lateral">${this.icon("sidebar")}</button>
				</div>
				<nav class="sv-nav">${groups}</nav>
				<div class="sv-nav-foot">${navItem(this.settingsItem)}</div>
			</aside>
			<div class="sv-main">
				<header class="sv-topbar">
					<button type="button" class="sv-btn sv-btn--ghost sv-btn--icon sv-drawer-btn sv-fab" data-action="open-drawer" aria-label="Menu">${this.icon("menu")}</button>
					<div class="sv-search" role="search">
						${this.icon("search")}
						<input type="search" class="sv-search-input" placeholder="Buscar jogos, coleções, conquistas" aria-label="Busca global" autocomplete="off" spellcheck="false">
						<kbd>/</kbd>
						<button type="button" class="sv-search-close" data-action="search-close" aria-label="Fechar busca">${this.icon("x")}</button>
						<div class="sv-search-results" role="listbox" hidden></div>
					</div>
					<div class="sv-topbar-actions">
						${this.syncBadge(syncState[0], syncState[1])}
						<button type="button" class="sv-search-toggle sv-fab" data-action="search-open" aria-label="Buscar" title="Buscar">${this.icon("search")}</button>
						${this.accountMenu(steamCfg, raCfg, avatar, syncState)}
					</div>
				</header>
				<main class="sv-content" tabindex="-1" aria-label="Conteúdo">${content}</main>
			</div>
			<nav class="sv-bottomnav" aria-label="Navegação principal">
				${mobile.map(it => `<a class="sv-bottomnav-item${it.id === bottomActive ? " is-active" : ""}" ${this.openAttrs(it.path)}>${this.icon(it.icon)}<span>${this.esc(it.label.replace(" Steam", ""))}</span></a>`).join("")}
				<button type="button" class="sv-bottomnav-item${bottomActive === "more" ? " is-active" : ""}" data-action="open-drawer">${this.icon("menu")}<span>Mais</span></button>
			</nav>
			<div class="sv-drawer" hidden><div class="sv-drawer-backdrop" data-action="close-drawer"></div><div class="sv-drawer-panel">${groups}${navItem(this.settingsItem)}${this.obsidianGroup()}</div></div>
		</div>`;
	}

	// ================================================== PERSONALIZAÇÃO (3.58.0)
	// Perfil de layout: um JSON só em _store("layout"). Cada opção tem uma
	// lista de valores permitidos e o PRIMEIRO é o padrão. Valor padrão =
	// nenhum atributo aplicado, ou seja, a interface da 3.57 exatamente.
	get layoutSchema() {
		return {
			home: {
				hero: ["original", "split", "cinema", "horizontal", "cards"],
				height: ["md", "sm", "lg"], content: ["side", "bottom"],
				autoplay: ["on", "off"], interval: ["5", "8", "12"], count: ["all", "3", "5"],
				cards: ["landscape", "portrait", "square"], perRow: ["3", "2", "4"],
				spacing: ["normal", "compact", "airy"], shelf: ["md", "sm", "lg"], items: ["normal", "few", "many"]
			},
			game: {
				model: ["original", "split", "cinema", "minimal", "editorial"],
				cover: ["left", "right", "hidden"], coverSize: ["md", "sm", "lg"],
				banner: ["md", "sm", "lg", "xl"], width: ["full", "contained"], align: ["left", "center"],
				stats: ["row", "grid", "compact"], desc: ["auto", "on", "off"], tabs: ["underline", "pills", "segmented"],
				actions: ["inline", "full"], spacing: ["normal", "compact", "airy"]
			},
			cards: {
				style: ["original", "horizontal", "square", "compact", "cover", "overlay", "below", "cinema"],
				radius: ["default", "square", "round"], border: ["off", "on"], shadow: ["default", "none", "strong"],
				size: ["md", "sm", "lg"], status: ["on", "off"], platform: ["on", "off"], rating: ["on", "off"], meta: ["on", "off"],
				library: ["same", "original"]
			},
			banners: { fit: ["cover", "contain"], position: ["auto", "top", "center", "bottom"], gradient: ["default", "soft", "strong", "none"] },
			library: { size: ["md", "sm", "lg"], density: ["normal", "compact", "airy"], list: ["normal", "compact"] }
		};
	}
	get gameTabIds() { return ["overview", "achievements", "media", "dlc", "sessions", "notes"]; }

	layoutDefaults() {
		const out = {};
		for (const [sec, fields] of Object.entries(this.layoutSchema)) {
			out[sec] = {};
			for (const [k, vals] of Object.entries(fields)) out[sec][k] = vals[0];
		}
		out.game.tabOrder = [...this.gameTabIds];
		return out;
	}

	// valida e completa qualquer coisa (versão antiga, arquivo editado à mão,
	// outro aparelho): valor desconhecido volta ao padrão, nunca quebra
	layoutClean(raw) {
		const def = this.layoutDefaults();
		let src = raw;
		if (typeof src === "string") { try { src = JSON.parse(src); } catch (_) { src = null; } }
		if (!src || typeof src !== "object") return def;
		for (const [sec, fields] of Object.entries(this.layoutSchema)) {
			const got = src[sec] && typeof src[sec] === "object" ? src[sec] : {};
			for (const [k, vals] of Object.entries(fields)) if (vals.includes(String(got[k]))) def[sec][k] = String(got[k]);
		}
		const order = Array.isArray(src.game?.tabOrder) ? src.game.tabOrder.filter(t => this.gameTabIds.includes(t)) : [];
		def.game.tabOrder = [...new Set([...order, ...this.gameTabIds])];
		return def;
	}

	// perfil em uso: o rascunho da pré-visualização (só durante o desenho
	// da prévia) ou o salvo
	layout() {
		if (this._layoutDraft) return this._layoutDraft;
		const raw = this._store("layout") || "";
		if (this.__layRaw !== raw || !this.__lay) { this.__layRaw = raw; this.__lay = this.layoutClean(raw); }
		return this.__lay;
	}

	// atributos data-lay-<seção>-<opção> só para o que difere do padrão
	layoutAttrs(p = this.layout()) {
		const out = {};
		for (const [sec, fields] of Object.entries(this.layoutSchema)) {
			for (const [k, vals] of Object.entries(fields)) {
				const v = p?.[sec]?.[k];
				if (v && v !== vals[0]) out[`data-lay-${sec}-${k.replace(/[A-Z]/g, c => "-" + c.toLowerCase())}`] = v;
			}
		}
		return out;
	}

	applyLayout(el, p = this.layout()) {
		if (!el) return;
		for (const a of [...el.attributes]) if (a.name.startsWith("data-lay-")) el.removeAttribute(a.name);
		for (const [k, v] of Object.entries(this.layoutAttrs(p))) el.setAttribute(k, v);
	}

	// combinações prontas (não guardadas): layouts de verdade, não só cores.
	// theme/accent ausentes = mantém os atuais
	layoutPresets() {
		return [
			{ id: "original", name: "Original", desc: "O visual clássico da Game Library", layout: {} },
			{ id: "steam-split", name: "Steam Split", desc: "Destaque em carrossel com capa ao lado e fichas divididas", layout: { home: { hero: "split" }, game: { model: "split", stats: "grid" }, library: { size: "md" } } },
			{ id: "cinema", name: "Cinematográfico", desc: "Banners amplos, arte em primeiro plano e cards com texto sobre a capa", layout: { home: { hero: "cinema", height: "lg" }, game: { model: "cinema", banner: "lg" }, cards: { style: "overlay" }, banners: { gradient: "soft" } } },
			{ id: "minimal", name: "Steam Minimal", desc: "Tema grafite, fichas limpas e cards sem moldura", theme: "graphite", layout: { home: { hero: "horizontal", height: "sm" }, game: { model: "minimal", stats: "compact" }, cards: { shadow: "none", radius: "square" }, library: { density: "compact" } } },
			{ id: "editorial", name: "Editorial", desc: "Tipografia grande, blocos organizados e capa em evidência", layout: { home: { hero: "horizontal" }, game: { model: "editorial", stats: "grid", desc: "on" }, cards: { style: "below" } } },
			{ id: "compact", name: "Compacto Mobile", desc: "Mais jogos por tela no celular: destaques em cards, grade densa", layout: { home: { hero: "cards", cards: "landscape", spacing: "compact", items: "few" }, game: { model: "minimal", spacing: "compact", stats: "compact" }, cards: { style: "compact", size: "sm" }, library: { size: "sm", density: "compact", list: "compact" } } }
		];
	}

	// perfil completo de uma combinação parcial (o resto fica no padrão)
	layoutFrom(partial) {
		const d = this.layoutDefaults();
		for (const [sec, vals] of Object.entries(partial || {})) if (d[sec] && vals && typeof vals === "object") Object.assign(d[sec], vals);
		return this.layoutClean(d);
	}

	// CSS da cor de destaque (o app e a pré-visualização usam o mesmo texto)
	accentCss(id) {
		const list = this.accents();
		const a = Object.prototype.hasOwnProperty.call(list, id) ? list[id] : null;
		if (!a || id === "blue") return "";
		const [, mid, strong, light, on] = a;
		const stage = ".sv-hero, .sv-ehero, .sv-phero, .sv-trophyhero, .sv-achhero, .sv-featured, .sv-wide, .sv-lightbox";
		return `body.sv-accent-custom.sv-accent-custom { --sv-blue: ${mid}; --sv-blue-strong: ${strong}; --sv-on-accent: ${on}; }
body.sv-accent-custom.sv-accent-custom.theme-light { --sv-blue: ${light}; --sv-blue-strong: ${strong}; --sv-on-accent: #fff; }
body.sv-accent-custom.sv-accent-custom :is(${stage}) { --sv-blue: ${mid}; }`;
	}

	_store(key, value) {
		const k = `steamvault:ui:${key}`;
		try {
			if (value === undefined) return localStorage.getItem(k);
			localStorage.setItem(k, value);
			this._onStore?.(key, value);
		} catch (_) { return null; }
	}

	// cabeçalho de página (não-hero): título forte, subtítulo, ações
	pageHead(title, { sub = "", actions = "", meta = "" } = {}) {
		return `<header class="sv-pagehead">
			<div class="sv-pagehead-text"><h1>${this.esc(title)}</h1>${sub ? `<p>${this.esc(sub)}</p>` : ""}${meta}</div>
			${actions ? `<div class="sv-pagehead-actions">${actions}</div>` : ""}
		</header>`;
	}
}
