// ==========================================================================
// Game Library — Pages
// Cada página devolve { active, html, wire(root, ctx) }. O shell (sidebar,
// topbar, navegação mobile) é aplicado pelo SteamVault.render().
//
// Acesso: customJS.SteamVaultPages
// ==========================================================================

class SteamVaultPages {

	// ================================================================ HOME
	home(ctx) {
		const { C, U, model } = ctx;
		if (!model.games.length) {
			return { active: "home", html: `<div class="sv-page sv-pad sv-onboardpage">${this._onboard(ctx, { full: true })}</div>` };
		}
		// 3.58.0: Personalização (destaque, quantidade de destaques e de itens por faixa)
		const lay = U.layout().home;
		let featuredList = C.featuredGames(model);
		if (lay.count !== "all") featuredList = featuredList.slice(0, Number(lay.count));
		const featured = featuredList[0] || C.featuredGame(model);
		const layout = this._homeLayout(ctx);
		const shown = new Set([featured].filter(Boolean));
		const per = n => lay.items === "few" ? Math.min(n, 6) : lay.items === "many" ? Math.max(n, 24) : n;
		const take = (list, n) => { const out = list.filter(g => !shown.has(g)).slice(0, per(n)); out.forEach(g => shown.add(g)); return out; };
		const cont = take(C.continuePlaying(model, 12), 10);
		const favorites = take(model.games.filter(g => g.favorite), 20);
		const recent = take([...model.games].sort((a, b) => b.dateAdded.localeCompare(a.dateAdded)), 12);
		const deals = model.games.filter(g => g.currentPrice !== null && g.targetPrice && g.currentPrice <= g.targetPrice && g.status === "Wishlist");

		const sections = {
			week: () => `${this._homeLastMonth(ctx)}${this._homeWeek(ctx)}`,
			picks: () => this._homePicks(ctx),
			queue: () => this._homeQueue(ctx),
			continue: () => U.shelf("Continuar jogando", cont.map(g => this._homeWide(ctx, g)), { variant: "wide", id: "continue" }),
			dashboard: () => this._homeDashboard(ctx, layout),
			memories: () => this._homeMemories(ctx),
			collection: () => this._homeCollection(ctx),
			wishlist: () => ctx.PK?.wishlistBlock ? ctx.PK.wishlistBlock(ctx) : deals.length ? U.shelf("Na lista de desejos, abaixo do preço-alvo", deals.map(g => U.gameCard(g, C))) : "",
			soon: () => ctx.PK?.soonBlock ? ctx.PK.soonBlock(ctx, { home: true }) : "",
			favorites: () => U.shelf("Favoritos", favorites.map(g => U.gameCard(g, C)), { count: model.games.filter(g => g.favorite).length }),
			recent: () => U.shelf("Adicionados recentemente", recent.map(g => U.gameCard(g, C))),
			retro: () => `<div data-ra-strip></div>`,
			steam: () => `<div data-steam-picks></div>`
		};
		const body = layout.order.filter(id => sections[id] && !layout.hidden.includes(id)).map(id => { try { return sections[id](); } catch (err) { console.warn("Game Library: seção da Home", id, err); return ""; } }).join("");
		// as faixas da Steam/RA são preenchidas depois do render: se o usuário
		// escondeu, ficam fora; senão o marcador já está no lugar escolhido
		const html = `<div class="sv-page sv-page--home">
			${lay.hero === "cards" ? this._homeFeatureCards(ctx, featuredList.length ? featuredList : [featured].filter(Boolean)) : featuredList.length > 1 ? this.heroCarousel(ctx, featuredList) : this.gameHero(ctx, featured, { variant: "home" })}
			<div class="sv-pad sv-homebody">
				${ctx.CA ? ctx.CA.nudge(ctx) : ""}
				${this._onboard(ctx)}
				${this._homeGreeting(ctx)}
				${body}
				<div class="sv-homefoot"><button type="button" class="sv-ovlink" data-home-custom>${U.icon("gear")}<span>Personalizar Home</span></button></div>
			</div>
		</div>`;
		return { active: "home", html, wire: root => this._wireHome(root, ctx) };
	}

	// 3.58.0: destaque em cards (Personalização › Tela inicial). Paisagem usa a
	// arte horizontal do jogo; retrato e quadrado usam a capa.
	_homeFeatureCards(ctx, games) {
		const { U, C } = ctx;
		if (!games.length) return "";
		const lay = U.layout().home;
		const card = g => {
			const wide = lay.cards === "landscape";
			const src = wide ? (g.images.featured || g.images.background || g.images.cover) : (g.images.cover || g.images.featured || g.images.background);
			const coverArt = wide && !(g.images.featured || g.images.background);
			const meta = [g.platform, g.playtime.hours ? U.fmtHours(g.playtime.hours) : "", g.ach.state === "known" && g.ach.total ? `${U.fmtPct(g.ach.pctRound)} das conquistas` : ""].filter(Boolean);
			return `<a class="sv-featcard${coverArt ? " is-coverart" : ""}" ${U.openAttrs(g.path)} style="--sv-hue:${g.hue};--sv-bg-x:${g.framing.x}%;--sv-bg-y:${g.framing.y}%">
				${src ? `<img class="sv-featcard-img" src="${U.attr(src)}" alt="" loading="lazy" decoding="async" data-sv-img>` : `<span class="sv-featcard-img is-empty"></span>`}
				<span class="sv-featcard-body">${U.statusTag(g, C)}<b>${U.esc(g.title)}</b>${meta.length ? `<small>${meta.map(m => `<span>${U.esc(m)}</span>`).join("")}</small>` : ""}</span>
			</a>`;
		};
		return `<div class="sv-pad sv-homefeat"><section class="sv-featcards" data-shape="${U.attr(lay.cards)}" style="--sv-fc-n:${U.attr(lay.perRow)}" aria-label="Jogos em destaque">
			${U.sectionHead("Em destaque", { count: games.length })}
			<div class="sv-featcards-track">${games.map(card).join("")}</div>
		</section></div>`;
	}

	// ---- primeiros passos (3.21.0): guia para quem está começando. Ocupa a
	// Início com o vault vazio; depois vira um card que some ao completar
	// tudo ou ao ser dispensado (por aparelho; volta em Configurações).
	_onboardSteps(ctx) {
		const { model, U } = ctx;
		const S = ctx.S, X = ctx.X;
		const steamOn = !!S?.getConfig?.().configured;
		const otherOn = ctx.PL ? Object.keys(ctx.PL.platforms()).some(id => ctx.PL.getConfig(id)?.configured) : false;
		const games = model.games;
		const steamGames = games.filter(g => g.steamAppId);
		const art = games.length > 0 && (steamGames.length ? steamGames.every(g => g.images.cover) : games.every(g => g.images.cover));
		const year = String(new Date().getFullYear());
		const goals = X?.goals ? X.goals(ctx).filter(g => g.year === year).length : 0;
		return [
			{ id: "connect", icon: "link", title: "Conecte uma conta", text: "A Steam traz tempo de jogo, conquistas e artes sozinha. Também dá para usar RetroAchievements, GOG e perfis manuais (Xbox, PlayStation e outras).", done: steamOn || otherOn,
				actions: [U.btn(steamOn ? "Steam conectada" : "Conectar a Steam", { icon: steamOn ? "check" : "b-steam", kind: steamOn ? "ghost" : "primary", size: "sm", action: steamOn ? "" : "steam-connect" }), `<a class="sv-btn sv-btn--ghost sv-btn--sm" ${U.openAttrs("Dashboard/Integrações")}>${U.icon("link")}<span>Outras contas</span></a>`] },
			{ id: "games", icon: "grid", title: "Adicione seus jogos", text: "Importe os jogos do seu perfil Steam de uma vez, cole uma lista de títulos ou crie as fichas uma a uma.", done: games.length > 0,
				actions: [`<a class="sv-btn sv-btn--${steamOn && !games.length ? "primary" : "ghost"} sv-btn--sm" ${U.openAttrs("Dashboard/Steam Biblioteca")}>${U.icon("b-steam")}<span>Importar da Steam</span></a>`, U.btn("Adicionar jogo", { icon: "plus", kind: steamOn ? "ghost" : "primary", size: "sm", action: "add-game" }), U.btn("Colar uma lista", { icon: "upload", kind: "ghost", size: "sm", action: "csv-import" })] },
			{ id: "art", icon: "image", title: "Capas e artes", text: "Os jogos da Steam recebem capa, fundo e logo da loja. Nos outros, escolha a capa em Editar › Capa e fundo.", done: art,
				actions: [U.btn("Baixar artes da Steam", { icon: "download", kind: "ghost", size: "sm", action: "steam-art-all" })] },
			{ id: "style", icon: "sparkles", title: "Deixe com a sua cara", text: "Escolha a cor de destaque e o que aparece na Início.", done: !!U._store("accent") || !!U._store("homeLayout"),
				actions: [`<a class="sv-btn sv-btn--ghost sv-btn--sm" ${U.openAttrs("Dashboard/Configurações")}>${U.icon("gear")}<span>Cor de destaque</span></a>`] },
			{ id: "goal", icon: "target", title: `Uma meta para ${year}`, text: "Quantos jogos zerar, horas jogadas ou conquistas no ano. A Início mostra o progresso.", done: goals > 0,
				actions: [U.btn("Criar meta", { icon: "plus", kind: "ghost", size: "sm", action: "goals-edit" })] }
		];
	}

	_onboard(ctx, { full = false } = {}) {
		const { U, model } = ctx;
		const steps = this._onboardSteps(ctx);
		const done = steps.filter(x => x.done).length;
		if (!full) {
			if (U._store("onboardHidden") === "1" || done === steps.length || model.games.length >= 15) return "";
		}
		const next = steps.find(x => !x.done);
		const pct = Math.round((done / steps.length) * 100);
		return `<section class="sv-onboard${full ? " is-full" : ""}" aria-labelledby="sv-onboard-h">
			<header class="sv-onboard-head">
				<span class="sv-onboard-mark" aria-hidden="true">${U.icon("brand")}</span>
				<div>
					<h2 id="sv-onboard-h">${full ? "Bem-vindo à Game Library" : "Primeiros passos"}</h2>
					<p>${full ? "Sua biblioteca de jogos no Obsidian. Cinco passos rápidos para deixar tudo pronto; dá para pular qualquer um." : `${done} de ${steps.length} prontos${next ? ` · próximo: ${U.esc(next.title.toLowerCase())}` : ""}`}</p>
				</div>
				${full ? "" : U.btn("", { icon: "x", kind: "ghost", size: "sm", action: "onboard-hide", title: "Dispensar os primeiros passos" })}
			</header>
			<div class="sv-onboard-bar" role="progressbar" aria-label="Primeiros passos" aria-valuemin="0" aria-valuemax="${steps.length}" aria-valuenow="${done}"><span style="width:${pct}%"></span></div>
			<ol class="sv-onboard-steps">${steps.map((x, i) => `<li class="sv-onboard-step${x.done ? " is-done" : ""}${x === next ? " is-next" : ""}">
				<span class="sv-onboard-n" aria-hidden="true">${x.done ? U.icon("check") : i + 1}</span>
				<div class="sv-onboard-body">
					<b>${U.icon(x.icon)}${U.esc(x.title)}${x.done ? `<span class="sv-sr"> (feito)</span>` : ""}</b>
					<p>${U.esc(x.text)}</p>
					${x.done ? "" : `<div class="sv-onboard-actions">${x.actions.join("")}</div>`}
				</div>
			</li>`).join("")}</ol>
			${full ? `<p class="sv-fineprint">Cada jogo é uma nota Markdown na pasta <code>Games/</code>. Nada sai do seu vault sem você pedir.</p>` : ""}
		</section>`;
	}

	// ---- layout escolhido (ordem e seções escondidas), por dispositivo
	_homeSections() {
		return {
			week: ["Sua semana", "chart"], picks: ["O que jogar agora", "dice"], queue: ["A seguir", "list"], continue: ["Continuar jogando", "play"],
			dashboard: ["Atividade e painel", "pulse"], memories: ["Neste dia", "calendar"], collection: ["Coleção em destaque", "layers"],
			wishlist: ["Lista de desejos", "tag"], soon: ["Lançamentos em breve", "calendar"], favorites: ["Favoritos", "heart"], recent: ["Adicionados recentemente", "plus"],
			retro: ["RetroAchievements", "b-retro"], steam: ["Ofertas e recomendações", "sparkles"]
		};
	}
	_homeSide() {
		return { library: ["Estado da biblioteca", "chart"], goals: ["Metas", "target"], month: ["Destaques do mês", "star"], hunter: ["Caçador de conquistas", "trophy"] };
	}
	_homeLayout(ctx) {
		const all = Object.keys(this._homeSections()), side = Object.keys(this._homeSide());
		let saved = {};
		try { saved = JSON.parse((ctx.U._homeLayoutDraft ?? ctx.U._store("homeLayout")) || "{}") || {}; } catch (_) { saved = {}; }
		const order = (Array.isArray(saved.order) ? saved.order.filter(id => all.includes(id)) : []);
		// seção nova entra logo depois da vizinha padrão, não no fim
		for (const [k, id] of all.entries()) if (!order.includes(id)) { const prev = all[k - 1], at = prev ? order.indexOf(prev) : -1; order.splice(at >= 0 ? at + 1 : order.length, 0, id); }
		return { order, hidden: Array.isArray(saved.hidden) ? saved.hidden.filter(id => all.includes(id) || side.includes(id)) : [] };
	}

	// ---- saudação + atalhos
	_homeGreeting(ctx) {
		const { U, model } = ctx;
		const h = new Date().getHours();
		const hello = h >= 5 && h < 12 ? "Bom dia" : h >= 12 && h < 18 ? "Boa tarde" : "Boa noite";
		const w = this._homeWeekData(ctx);
		const streak = this._homeStreak(ctx);
		const parts = [];
		if (w.hours > 0) parts.push(`Você jogou <b>${U.esc(U.fmtHours(w.hours))}</b> esta semana`);
		else if (w.events) parts.push(`<b>${U.plural(w.events, "atividade", "atividades")}</b> esta semana`);
		if (streak >= 2) parts.push(`está há <b>${streak} dias seguidos</b> jogando`);
		const playing = model.games.filter(g => g.status === "Playing").sort((a, b) => (b.lastPlayed.date || "").localeCompare(a.lastPlayed.date || ""));
		const line = parts.length ? `${parts.join(" e ")}.` : playing.length ? `${U.plural(playing.length, "jogo", "jogos")} em andamento. Que tal continuar de onde parou?` : "Que tal começar algo novo do backlog hoje?";
		const shortcut = (icon, label, attrs) => `<button type="button" class="sv-homeshortcut" ${attrs}>${U.icon(icon)}<span>${U.esc(label)}</span></button>`;
		const link = (icon, label, path) => `<a class="sv-homeshortcut" ${U.openAttrs(path)}>${U.icon(icon)}<span>${U.esc(label)}</span></a>`;
		return `<section class="sv-homegreet">
			<div class="sv-homegreet-text"><h1>${hello}!</h1><p>${line}</p></div>
			<div class="sv-homeshortcuts" role="group" aria-label="Atalhos">
				${shortcut("plus", "Adicionar jogo", 'data-action="add-game"')}
				${playing[0] ? shortcut("clock", "Registrar sessão", `data-action="manage" data-section="sessions" data-path="${U.attr(playing[0].path)}" title="Registrar sessão de ${U.attr(playing[0].title)}"`) : ""}
				${link("layers", "Coleções", "Dashboard/Coleções")}
				${link("chart", "Estatísticas", "Dashboard/Estatísticas")}
			</div>
		</section>`;
	}

	// offset = semanas para trás (0 = últimos 7 dias, 1 = os 7 anteriores)
	_homeWeekData(ctx, offset = 0) {
		const { C, model } = ctx;
		const cache = (model.__svHomeWeeks ||= {});
		if (cache[offset]) return cache[offset];
		const today = C.today();
		const dt = new Date(today + "T00:00:00");
		dt.setDate(dt.getDate() - offset * 7);
		const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
		const days = [], prev = [];
		for (let i = 6; i >= 0; i--) { const d = new Date(dt); d.setDate(d.getDate() - i); days.push(iso(d)); }
		for (let i = 13; i >= 7; i--) { const d = new Date(dt); d.setDate(d.getDate() - i); prev.push(iso(d)); }
		const hoursBy = new Map(), sessBy = new Map(), inWeek = new Set(days), perGame = new Map();
		for (const g of model.games) for (const s of g.sessions) { const d = C.iso(s.date); if (!d) continue; const h = C.num(s.hours) || 0; hoursBy.set(d, (hoursBy.get(d) || 0) + h); sessBy.set(d, (sessBy.get(d) || 0) + 1); if (inWeek.has(d)) perGame.set(g, (perGame.get(g) || 0) + h + 0.001); }
		const achBy = new Map();
		for (const g of model.games) for (const a of g.achievements) if (a.unlocked && a.unlockedDate) achBy.set(a.unlockedDate, (achBy.get(a.unlockedDate) || 0) + 1);
		const actBy = new Map();
		for (const e of C.activity(model, { limit: 100000 })) actBy.set(e.date, (actBy.get(e.date) || 0) + 1);
		const sum = (list, m) => list.reduce((t, d) => t + (m.get(d) || 0), 0);
		const out = {
			days: days.map(d => ({ d, hours: hoursBy.get(d) || 0, sessions: sessBy.get(d) || 0, ach: achBy.get(d) || 0, events: actBy.get(d) || 0 })),
			hours: sum(days, hoursBy), prevHours: sum(prev, hoursBy), sessions: sum(days, sessBy), ach: sum(days, achBy), events: sum(days, actBy), today,
			// o mais jogado do período (horas das sessões; empate: mais sessões)
			top: [...perGame].sort((a, b) => b[1] - a[1])[0] || null, offset
		};
		cache[offset] = out;
		return out;
	}

	_homeStreak(ctx) {
		const { C, model } = ctx;
		const days = ctx.X?._days ? ctx.X._days(model) : null;
		if (!days) return 0;
		let d = C.today(), n = 0;
		const back = iso => { const t = new Date(iso + "T00:00:00"); t.setDate(t.getDate() - 1); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`; };
		if (!days.has(d)) d = back(d); // hoje ainda sem atividade não quebra a sequência
		while (days.has(d)) { n++; d = back(d); }
		return n;
	}

	// ---- sua semana
	// resumo do mês (3.51.0): nos primeiros 7 dias, o mês que acabou num
	// cartão só, comparado com o mês anterior; dá para dispensar
	_homeLastMonth(ctx) {
		const { U, C } = ctx;
		if (!ctx.I?._stWindow) return "";
		const t = new Date(C.today() + "T00:00:00");
		if (t.getDate() > 7) return "";
		const p2 = n => String(n).padStart(2, "0");
		const pm = new Date(t.getFullYear(), t.getMonth() - 1, 1), ppm = new Date(t.getFullYear(), t.getMonth() - 2, 1);
		const key = `${pm.getFullYear()}-${p2(pm.getMonth() + 1)}`;
		if (U._store("monthSeen") === key) return "";
		const last = d => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
		const W = ctx.I._stWindow(ctx, `${key}-01`, `${key}-${p2(last(pm))}`, false);
		const pk = `${ppm.getFullYear()}-${p2(ppm.getMonth() + 1)}`;
		const P = ctx.I._stWindow(ctx, `${pk}-01`, `${pk}-${p2(last(ppm))}`, false);
		if (!W.sessions && !W.completed && !W.ach) return "";
		const days = new Set(ctx.model.games.flatMap(g => g.sessions.map(s => C.iso(s.date)).filter(d => d && d.startsWith(key)))).size;
		const top = [...W.hoursBy].filter(([, h]) => h > 0).sort((a, b) => b[1] - a[1])[0] || null;
		const names = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
		const month = `${names[pm.getMonth()]} de ${pm.getFullYear()}`;
		const d = W.sessionHours - P.sessionHours;
		const cmp = P.sessionHours ? (Math.abs(d) < 0.25 ? "igual ao mês anterior" : `${d > 0 ? "+" : "−"}${U.fmtHours(Math.abs(d))} que o mês anterior`) : "";
		return `<section class="sv-block sv-homeprev" data-month-block>
			${U.sectionHead(`Seu ${month}`, { sub: "Resumo do mês que acabou", action: U.btn("", { icon: "x", kind: "ghost", size: "sm", action: "month-dismiss", title: "Dispensar", attrs: `data-month="${key}"` }) })}
			<div class="sv-homeweek-card sv-homeprev-card">
				<ul class="sv-homeweek-stats">
					<li><b>${U.fmtHours(W.sessionHours)}</b><span>jogadas</span>${cmp ? `<small class="${d >= 0 ? "is-up" : "is-down"}">${U.esc(cmp)}</small>` : ""}</li>
					<li><b>${U.fmtNum(days)}</b><span>${days === 1 ? "dia jogando" : "dias jogando"}</span></li>
					<li><b>${U.fmtNum(W.completed)}</b><span>${W.completed === 1 ? "zerado" : "zerados"}</span></li>
					<li><b>${U.fmtNum(W.ach)}</b><span>${W.ach === 1 ? "conquista" : "conquistas"}</span></li>
				</ul>
				${top ? `<a class="sv-homeweek-top" ${U.openAttrs(top[0].path)}>${U.cover(top[0], { cls: "sv-cover--xs" })}<span><small>Jogo do mês</small><b>${U.esc(top[0].title)}</b></span><em class="sv-num">${U.esc(U.fmtHours(top[1]))}</em></a>` : ""}
			</div>
		</section>`;
	}

	_homeWeek(ctx, offset = 0) {
		const { U } = ctx;
		const w = this._homeWeekData(ctx, offset);
		const last = offset === 1;
		// alternar entre esta semana e a passada (3.33.0)
		const toggle = `<div class="sv-weektoggle" role="radiogroup" aria-label="Período">${[["0", "Esta semana"], ["1", "Semana passada"]].map(([v, l]) => `<button type="button" role="radio" data-week="${v}" aria-checked="${String(offset) === v}" class="${String(offset) === v ? "is-active" : ""}">${l}</button>`).join("")}</div>`;
		const head = sub => U.sectionHead("Sua semana", { sub, action: toggle });
		const topLine = w.top ? `<a class="sv-homeweek-top" ${U.openAttrs(w.top[0].path)}>${U.cover(w.top[0], { cls: "sv-cover--xs" })}<span><small>Mais jogado ${last ? "na semana passada" : "na semana"}</small><b>${U.esc(w.top[0].title)}</b></span><em class="sv-num">${U.esc(U.fmtHours(w.top[1]))}</em></a>` : "";
		const wd = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
		const useHours = w.hours > 0;
		const val = x => useHours ? x.hours : x.events;
		const max = Math.max(1, ...w.days.map(val));
		const delta = w.hours - w.prevHours;
		// semana vazia: um convite em vez de sete barras zeradas
		if (!w.events && !w.hours && !w.sessions && !w.ach) {
			const g = ctx.model.games.find(x => x.status === "Playing") || null;
			return `<section class="sv-block sv-homeweek" data-week-block>
				${head(last ? "Os 7 dias antes desta semana" : "Atividades nos últimos 7 dias")}
				<div class="sv-homeweek-card sv-homeweek-empty">
					<span class="sv-homeweek-empty-icon" aria-hidden="true">${U.icon("clock")}</span>
					<div><b>${last ? "Nada registrado na semana passada" : "Nada registrado nesta semana"}</b><span>Sessões, conquistas e jogos zerados aparecem aqui dia a dia.</span></div>
					${g && !last ? U.btn("Registrar sessão", { icon: "plus", kind: "secondary", size: "sm", action: "manage", attrs: `data-section="sessions" data-path="${U.attr(g.path)}"` }) : ""}
				</div>
			</section>`;
		}
		const ref = last ? "na semana retrasada" : "na semana passada";
		const cmp = !useHours ? "" : w.prevHours ? (Math.abs(delta) < 0.25 ? `igual ${last ? "à semana retrasada" : "à semana passada"}` : `${delta > 0 ? "+" : "−"}${U.fmtHours(Math.abs(delta))} que ${ref}`) : "primeira semana com sessões";
		return `<section class="sv-block sv-homeweek" data-week-block>
			${head(last ? (useHours ? "Horas registradas nos 7 dias antes desta semana" : "Atividades nos 7 dias antes desta semana") : (useHours ? "Horas registradas em sessões nos últimos 7 dias" : "Atividades nos últimos 7 dias"))}
			<div class="sv-homeweek-card">
				<div class="sv-homeweek-bars" role="img" aria-label="${useHours ? "Horas" : "Atividades"} por dia">${w.days.map(x => { const v = val(x); const dd = new Date(x.d + "T00:00:00"); return `<div class="sv-homeweek-day${x.d === w.today ? " is-today" : ""}" title="${U.attr(U.fmtDate(x.d))}: ${useHours ? U.attr(U.fmtHours(v)) : U.plural(v, "atividade", "atividades")}"><span class="sv-homeweek-val">${v ? (useHours ? U.fmtHours(v).replace(" h", "h") : v) : ""}</span><span class="sv-homeweek-bar"><i style="height:${v ? Math.max(8, (v / max) * 100) : 0}%"></i></span><small>${wd[dd.getDay()]}</small></div>`; }).join("")}</div>
				<ul class="sv-homeweek-stats">
					<li><b>${useHours ? U.fmtHours(w.hours) : U.fmtNum(w.events)}</b><span>${useHours ? "jogadas" : w.events === 1 ? "atividade" : "atividades"}</span>${cmp ? `<small class="${delta >= 0 ? "is-up" : "is-down"}">${U.esc(cmp)}</small>` : ""}</li>
					<li><b>${U.fmtNum(w.sessions)}</b><span>${w.sessions === 1 ? "sessão" : "sessões"}</span></li>
					<li><b>${U.fmtNum(w.ach)}</b><span>${w.ach === 1 ? "conquista" : "conquistas"}</span></li>
				</ul>
				${topLine}
			</div>
		</section>`;
	}

	// ---- fila "A seguir" (3.31.0): os próximos jogos, na ordem escolhida
	_homeQueue(ctx) {
		const { U, C, model } = ctx;
		const q = C.queue(model);
		if (!q.length) return "";
		const card = (g, i) => `<a class="sv-queuecard${i === 0 ? " is-next" : ""}" ${U.openAttrs(g.path)}>
			<span class="sv-queuecard-n sv-num">${i + 1}</span>
			${U.cover(g, { cls: "sv-cover--sm" })}
			<span class="sv-queuecard-t"><small>${i === 0 ? "Próximo" : U.esc(C.statusLabel(g.status))}</small><b>${U.esc(g.title)}</b><span class="sv-meta">${g.estimatedHours ? `<span>~${U.esc(U.fmtHours(g.estimatedHours))}</span>` : ""}${g.platform ? `<span>${U.esc(g.platform)}</span>` : ""}</span></span>
		</a>`;
		return `<section class="sv-block sv-homequeue">
			${U.sectionHead("A seguir", { count: q.length, sub: "Sua fila de próximos jogos", action: `<button type="button" class="sv-ovlink" data-action="queue-manage">${U.icon("list")}<span>Organizar</span></button>` })}
			<div class="sv-queuerow sv-hscroll">${q.slice(0, 10).map(card).join("")}</div>
		</section>`;
	}

	// ---- o que jogar agora (3 sugestões estáveis no dia)
	_homePicks(ctx) {
		const { U, C, model } = ctx;
		if (!ctx.X?.suggest) return ctx.X ? `<button type="button" class="sv-cta" data-action="picker"><span class="sv-cta-icon">${U.icon("dice")}</span><span class="sv-cta-text"><b>O que jogar agora?</b><small>Sugestões do seu backlog para agora</small></span>${U.icon("chevronRight")}</button>` : "";
		const today = C.today();
		let cache = window.__svHomePicks;
		if (!cache || cache.date !== today || cache.built !== model.builtAt) {
			const prevPaths = cache?.date === today ? cache.paths : null;
			const list = ctx.X.suggest(model, {});
			const byPath = new Map(list.map(x => [x.g.path, x]));
			const keep = prevPaths ? prevPaths.map(p => byPath.get(p)).filter(Boolean) : [];
			// o primeiro da fila "A seguir" sempre entra (mesmo no meio do dia)
			const q0 = C.queue(model)[0];
			const picks = keep.length === 3 && (!q0 || keep.some(x => x.g === q0)) ? keep : list.slice(0, 3);
			cache = window.__svHomePicks = { date: today, built: model.builtAt, paths: picks.map(x => x.g.path), picks };
		}
		const picks = cache.picks;
		if (!picks.length) return "";
		return `<section class="sv-block sv-homepicks">
			${U.sectionHead("O que jogar agora?", { sub: "Três sugestões do seu backlog para hoje", action: `<button type="button" class="sv-ovlink" data-action="picker">${U.icon("dice")}<span>Sortear com filtros</span></button>` })}
			<div class="sv-homepicks-list">${picks.map(({ g, reasons }) => {
				const art = g.images.featured || g.images.background;
				return `<a class="sv-homepick" ${U.openAttrs(g.path)} style="--sv-hue:${g.hue}">
					${art ? `<img class="sv-homepick-bg" src="${U.attr(art)}" alt="" loading="lazy" data-sv-img>` : ""}
					<span class="sv-homepick-cover">${U.cover(g)}</span>
					<span class="sv-homepick-text"><b>${U.esc(g.title)}</b><span class="sv-homepick-reasons">${(reasons.length ? reasons : [C.statusLabel(g.status)]).slice(0, 2).map(r => `<i>${U.esc(r)}</i>`).join("")}</span></span>
				</a>`;
			}).join("")}</div>
		</section>`;
	}

	// ---- continuar jogando com a nota da última sessão
	_homeWide(ctx, g) {
		const { U, C } = ctx;
		const last = [...g.sessions].map(s => ({ d: C.iso(s.date), note: C.str(s.note) })).filter(s => s.d && s.note).sort((a, b) => b.d.localeCompare(a.d))[0];
		const card = U.wideCard(g, C);
		return last ? card.replace('<span class="sv-wide-meta">', `<span class="sv-wide-note">“${U.esc(last.note)}”</span><span class="sv-wide-meta">`) : card;
	}

	// ---- atividade + painel lateral
	_homeDashboard(ctx, layout) {
		const { U, model, C } = ctx;
		const hide = id => layout.hidden.includes(id);
		const events = C.activity(model, { limit: 16 });
		const days = [];
		for (const e of events) { const last = days[days.length - 1]; if (last && last[0] === e.date) last[1].push(e); else days.push([e.date, [e]]); }
		const first = [], rest = [];
		let n = 0;
		for (const [, list] of days) { (n < 6 ? first : rest).push(...list); n += list.length; }
		const side = [
			!hide("library") && this._homeLibrary(ctx),
			!hide("goals") && this._homeGoals(ctx),
			!hide("month") && this._homeMonth(ctx),
			!hide("hunter") && ctx.X ? ctx.X.homeHunter(ctx) : ""
		].filter(Boolean).join("");
		return `<div class="sv-split sv-homesplit">
			<section class="sv-split-main">
				${U.sectionHead("Atividade recente", { action: `<a class="sv-link" ${U.openAttrs("Dashboard/Steam Atividade")}>Ver tudo</a>` })}
				${this.activityFeed(ctx, first)}
				${rest.length ? `<div class="sv-homefeed-more" hidden data-home-more>${this.activityFeed(ctx, rest)}</div><button type="button" class="sv-homefeed-toggle" data-home-more-btn aria-expanded="false">${U.icon("chevronDown")}<span>Mostrar mais ${U.plural(rest.length, "atividade", "atividades")}</span></button>` : ""}
			</section>
			${side ? `<aside class="sv-split-side sv-homeside">${side}</aside>` : ""}
		</div>`;
	}

	_homeLibrary(ctx) {
		const { U, C, model } = ctx;
		const s = model.stats;
		const tones = this._libTones();
		const order = ["Playing", "Paused", "Backlog", "Completed", "Dropped", "Wishlist"];
		const segs = order.map(k => ({ k, n: s.byStatus[k] || 0 })).filter(x => x.n);
		return `<section class="sv-surface sv-homecard">
			<h3>Estado da biblioteca</h3>
			<div class="sv-homelib-figs">
				<div><b>${U.fmtNum(s.games)}</b><span>jogos</span></div>
				<div><b>${U.fmtHours(s.hours)}</b><span>jogadas</span></div>
				<div><b>${U.fmtNum(s.completed)}</b><span>zerados</span></div>
				<div class="${s.perfect ? "is-gold" : ""}"><b>${U.fmtNum(s.perfect)}</b><span>com 100%</span></div>
			</div>
			<div class="sv-libsum-bar" role="group" aria-label="Jogos por status: toque para ver na Biblioteca">${segs.map(x => `<button type="button" data-home-status="${x.k}" style="flex:${x.n};--sv-tone:${tones[x.k]}" title="${U.attr(C.statusLabel(x.k))}: ${x.n}" aria-label="${U.attr(C.statusLabel(x.k))}: ${x.n}"></button>`).join("")}</div>
			<div class="sv-libsum-legend">${segs.map(x => `<button type="button" data-home-status="${x.k}" style="--sv-tone:${tones[x.k]}"><i></i>${U.esc(C.statusLabel(x.k))}<b>${x.n}</b></button>`).join("")}</div>
			${s.achTotal ? `<p class="sv-homelib-ach">${U.icon("trophy")}<span><b>${U.fmtNum(s.achUnlocked)}</b> de ${U.fmtNum(s.achTotal)} conquistas</span></p>` : ""}
		</section>`;
	}

	_homeGoals(ctx) {
		const { U, model } = ctx;
		const goals = ctx.X ? ctx.X.goalsBlock(ctx, { compact: true }) : "";
		const near = model.games.filter(g => g.ach.state === "known" && g.ach.total && !g.ach.perfect && g.ach.pct >= 50).sort((a, b) => b.ach.pct - a.ach.pct).slice(0, 3);
		if (!goals && !near.length) return "";
		return `<section class="sv-surface sv-homecard sv-homegoals">
			<h3>Metas</h3>
			${goals ? `<div class="sv-homegoals-goals">${goals}</div>` : ""}
			${near.length ? `<div class="sv-homegoals-near"><span>Perto dos 100%</span><div class="sv-mini-list">${near.map(g => this.miniGame(ctx, g)).join("")}</div></div>` : ""}
		</section>`;
	}

	_homeMonth(ctx) {
		const { U, C, model } = ctx;
		const today = C.today(), month = today.slice(0, 7);
		const inMonth = d => d && d.startsWith(month);
		const hours = new Map();
		for (const g of model.games) for (const s of g.sessions) if (inMonth(C.iso(s.date))) hours.set(g, (hours.get(g) || 0) + (C.num(s.hours) || 0));
		let top = [...hours].sort((a, b) => b[1] - a[1])[0];
		if (!top) { const g = model.games.filter(x => inMonth(x.lastPlayed.date)).sort((a, b) => b.playtime.hours - a.playtime.hours)[0]; if (g) top = [g, 0]; }
		const rare = model.games.flatMap(g => g.achievements.filter(a => a.unlocked && inMonth(a.unlockedDate) && a.rarity !== null).map(a => ({ a, g }))).sort((x, y) => x.a.rarity - y.a.rarity)[0];
		const done = model.games.filter(g => inMonth(g.completionDate) || g.playthroughs.some(r => inMonth(C.iso(r.end))));
		const label = U.fmtDate(today).replace(/^\d+ /, "").replace(/ \d{4}$/, "");
		const rows = [];
		if (top) rows.push(`<a class="sv-homemonth-row" ${U.openAttrs(top[0].path)}>${U.cover(top[0], { cls: "sv-cover--xs" })}<span><small>Mais jogado</small><b>${U.esc(top[0].title)}</b>${top[1] ? `<em>${U.fmtHours(top[1])} no mês</em>` : ""}</span></a>`);
		if (rare) rows.push(`<a class="sv-homemonth-row" ${U.openAttrs(rare.g.path)}><span class="sv-homemonth-icon">${rare.a.iconSrc ? `<img src="${U.attr(rare.a.iconSrc)}" alt="" loading="lazy">` : U.icon("trophy")}</span><span><small>Conquista mais rara</small><b>${U.esc(rare.a.name)}</b><em>${U.fmtPct(rare.a.rarity)} dos jogadores · ${U.esc(rare.g.title)}</em></span></a>`);
		if (done.length) rows.push(`<div class="sv-homemonth-row"><span class="sv-homemonth-icon is-green">${U.icon("flag")}</span><span><small>Zerados no mês</small><b>${U.plural(done.length, "jogo", "jogos")}</b><em>${done.slice(0, 3).map(g => U.esc(g.title)).join(", ")}</em></span></div>`);
		return `<section class="sv-surface sv-homecard sv-homemonth">
			<h3>Destaques de ${U.esc(label)}</h3>
			${rows.length ? rows.join("") : `<p class="sv-muted">Nada registrado neste mês ainda. Registre uma sessão para começar.</p>`}
		</section>`;
	}

	// ---- neste dia (anos e meses anteriores)
	_homeMemories(ctx) {
		const { U, C, model } = ctx;
		const days = ctx.X?._days ? ctx.X._days(model) : null;
		if (!days) return "";
		const today = C.today();
		const [y, m, d] = today.split("-").map(Number);
		const cands = [];
		for (let back = 1; back <= 12; back++) {
			const dt = new Date(y, m - 1 - back, d);
			if (dt.getDate() !== d) continue;
			const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
			if (days.has(iso)) cands.push({ iso, label: back % 12 === 0 ? (back === 12 ? "Há 1 ano" : `Há ${back / 12} anos`) : back === 1 ? "Há 1 mês" : `Há ${back} meses`, list: days.get(iso) });
		}
		for (let yy = y - 2; yy >= y - 10; yy--) { const iso = `${yy}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`; if (days.has(iso)) cands.push({ iso, label: `Há ${y - yy} anos`, list: days.get(iso) }); }
		if (!cands.length) return "";
		const rank = { perfect: 0, completed: 1, achievement: 2, started: 3, session: 4, added: 5 };
		const text = e => {
			const t = U.esc(e.game.title);
			switch (e.type) {
				case "perfect": return ["gem", "gold", `chegou a 100% em <b>${t}</b>`];
				case "completed": return ["flag", "green", `zerou <b>${t}</b>`];
				case "achievement": return ["trophy", "blue", e.achievements.length === 1 ? `desbloqueou <b>${U.esc(e.achievements[0].name)}</b> em ${t}` : `desbloqueou <b>${e.achievements.length} conquistas</b> em ${t}`];
				case "started": return ["play", "blue", `começou <b>${t}</b>`];
				case "session": return ["clock", "muted", `jogou <b>${t}</b>${e.hours ? ` por ${U.fmtHours(e.hours)}` : ""}`];
				default: return ["plus", "muted", `adicionou <b>${t}</b> ao vault`];
			}
		};
		return `<section class="sv-block sv-homemem">
			${U.sectionHead("Neste dia", { sub: `O que aconteceu em ${U.fmtDate(today, { year: false })} em outros momentos` })}
			<div class="sv-homemem-list">${cands.slice(0, 4).map(c => {
				const e = [...c.list].sort((a, b) => rank[a.type] - rank[b.type])[0];
				const [icon, tone, body] = text(e);
				const art = e.game.images.featured || e.game.images.background || e.game.images.cover;
				return `<a class="sv-homemem-card" ${U.openAttrs(e.game.path)} style="--sv-hue:${e.game.hue}">
					${art ? `<img src="${U.attr(art)}" alt="" loading="lazy" data-sv-img>` : ""}
					<span class="sv-homemem-body"><span class="sv-homemem-when"><span class="sv-feed-icon sv-tone-${tone}">${U.icon(icon)}</span>${U.esc(c.label)} · ${U.esc(U.fmtDate(c.iso))}</span><span class="sv-homemem-text">Você ${body}${c.list.length > 1 ? ` <small>e mais ${c.list.length - 1}</small>` : ""}</span></span>
				</a>`;
			}).join("")}</div>
		</section>`;
	}

	// ---- coleções em destaque (3.63.0: os cards do padrão de Coleções e
	// Gêneros; a fixada primeiro, depois as atualizadas mais recentemente)
	_homeCollection(ctx) {
		const { U, model } = ctx;
		const cols = model.collections.filter(c => c.games.length);
		if (!cols.length || !ctx.B?.collectionTile) return "";
		const order = [...cols].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || String(b.updated || "").localeCompare(String(a.updated || "")) || b.games.length - a.games.length).slice(0, 4);
		return `<section class="sv-block sv-homecol">
			${U.sectionHead(order.length > 1 ? "Coleções em destaque" : "Coleção em destaque", { action: `<a class="sv-link" ${U.openAttrs("Dashboard/Coleções")}>Todas as coleções</a>` })}
			<div class="sv-gtiles sv-gtiles--col sv-gtiles--home">${order.map(c => ctx.B.collectionTile(ctx, c)).join("")}</div>
		</section>`;
	}

	// ---- comportamento
	_wireHome(root, ctx) {
		const { U, V } = ctx;
		const page = root.querySelector(".sv-page--home");
		if (!page) return;
		page.querySelector("[data-home-more-btn]")?.addEventListener("click", e => {
			const btn = e.currentTarget, box = page.querySelector("[data-home-more]");
			const open = box.hidden;
			box.hidden = !open;
			btn.setAttribute("aria-expanded", String(open));
			btn.querySelector("span").textContent = open ? "Mostrar menos" : `Mostrar mais ${U.plural(box.querySelectorAll(".sv-feed-item").length, "atividade", "atividades")}`;
			btn.classList.toggle("is-open", open);
		});
		page.querySelectorAll("[data-home-status]").forEach(b => b.addEventListener("click", () => { window.__svLibStatus = b.dataset.homeStatus; V.open("Dashboard/Biblioteca", ctx); }));
		page.querySelector("[data-home-custom]")?.addEventListener("click", () => this._homeCustomize(ctx));
		page.addEventListener("click", e => {
			const b = e.target.closest("[data-week-block] [data-week]");
			if (!b) return;
			const sec = b.closest("[data-week-block]");
			sec.outerHTML = this._homeWeek(ctx, Number(b.dataset.week) || 0);
			ctx.V._wireImages(page.querySelector("[data-week-block]") || page);
			// teclado: o foco continua no botão escolhido (no toque, sem anel de foco)
			if (e.detail === 0) page.querySelector(`[data-week-block] [data-week="${b.dataset.week}"]`)?.focus();
		});
	}

	_homeCustomize(ctx) {
		const { U, V } = ctx;
		const layout = this._homeLayout(ctx);
		const defs = this._homeSections(), side = this._homeSide();
		const body = document.createElement("div");
		body.className = "sv-host sv-libsheet sv-homecustom";
		const row = (id, [label, icon], movable) => `<li class="sv-homecustom-row" data-id="${id}">
			<span class="sv-homecustom-icon">${U.icon(icon)}</span><span class="sv-homecustom-label">${U.esc(label)}</span>
			${movable ? `<button type="button" class="sv-homecustom-move" data-move="-1" aria-label="Subir">${U.icon("chevronDown")}</button><button type="button" class="sv-homecustom-move is-down" data-move="1" aria-label="Descer">${U.icon("chevronDown")}</button>` : ""}
			<label class="sv-switch"><input type="checkbox" data-show ${layout.hidden.includes(id) ? "" : "checked"}><span></span></label>
		</li>`;
		const paint = () => {
			body.innerHTML = `<section class="sv-fgroup"><h4>Seções (ordem de cima para baixo)</h4><ol class="sv-homecustom-list" data-list="main">${layout.order.map(id => row(id, defs[id], true)).join("")}</ol></section>
				<section class="sv-fgroup"><h4>No painel ao lado da atividade</h4><ol class="sv-homecustom-list">${Object.entries(side).map(([id, d]) => row(id, d, false)).join("")}</ol></section>
				${ctx.LK ? `<section class="sv-fgroup"><h4>Aparência</h4><p class="sv-muted">Modelo do destaque, cards, banners e fichas, com pré-visualização.</p><a class="sv-btn sv-btn--secondary sv-btn--sm" data-home-look ${U.openAttrs("Dashboard/Configurações")}>${U.icon("sliders")}<span>Personalização da Interface</span></a></section>` : ""}`;
		};
		paint();
		const m = V.modal({ title: "Personalizar Home", sub: "Escolha o que aparece e em que ordem. Fica salvo neste dispositivo.", size: "md", body, cls: "sv-libmodal",
			actions: `${U.btn("Restaurar padrão", { kind: "ghost", attrs: "data-home-reset" })}${U.btn("Pronto", { kind: "primary", attrs: "data-home-save" })}` });
		body.addEventListener("click", e => {
			// 3.58.0: atalho para a central (abre as Configurações já nela)
			if (e.target.closest("[data-home-look]")) { e.preventDefault(); e.stopPropagation(); window.__svLookOpen = true; m.close(); V.open("Dashboard/Configurações.md", ctx); return; }
			const mv = e.target.closest("[data-move]");
			if (!mv) return;
			const id = mv.closest("[data-id]").dataset.id, i = layout.order.indexOf(id), j = i + Number(mv.dataset.move);
			if (j < 0 || j >= layout.order.length) return;
			[layout.order[i], layout.order[j]] = [layout.order[j], layout.order[i]];
			paint();
		});
		body.addEventListener("change", e => {
			const cb = e.target.closest("[data-show]");
			if (!cb) return;
			const id = cb.closest("[data-id]").dataset.id;
			layout.hidden = cb.checked ? layout.hidden.filter(x => x !== id) : [...new Set([...layout.hidden, id])];
		});
		const apply = () => { U._store("homeLayout", JSON.stringify(layout)); m.close(); V._rerender ? V._rerender("home") : V.refresh(); V.toast("Home atualizada", { tone: "ok" }); };
		m.el.querySelector("[data-home-save]").addEventListener("click", apply);
		m.el.querySelector("[data-home-reset]").addEventListener("click", () => { layout.order = Object.keys(defs); layout.hidden = []; paint(); });
	}

	miniGame(ctx, g) {
		const { U } = ctx;
		return `<a class="sv-mini" ${U.openAttrs(g.path)}>
			${U.cover(g, { cls: "sv-cover--xs" })}
			<span class="sv-mini-text"><b>${U.esc(g.title)}</b><span>${g.ach.unlocked}/${g.ach.total} conquistas</span>${U.progressBar(g.ach.pct, { thin: true })}</span>
			<span class="sv-mini-value sv-num">${U.fmtPct(g.ach.pctRound)}</span>
		</a>`;
	}

	statusBreakdown(ctx) {
		const { C, U, model } = ctx;
		const total = model.games.length || 1;
		const order = ["Playing", "Paused", "Backlog", "Completed", "Dropped", "Wishlist"];
		const segs = order.map(k => ({ k, n: model.stats.byStatus[k] || 0 })).filter(x => x.n);
		return `<div class="sv-stackbar">${segs.map(x => `<span class="sv-tone-${C.statusDefs[x.k].tone}" style="flex:${x.n}" title="${U.attr(C.statusLabel(x.k))}: ${x.n}"></span>`).join("")}</div>
		<ul class="sv-legend">${segs.map(x => `<li><i class="sv-tone-${C.statusDefs[x.k].tone}"></i><span>${U.esc(C.statusLabel(x.k))}</span><b class="sv-num">${x.n}</b><small>${Math.round((x.n / total) * 100)}%</small></li>`).join("")}</ul>`;
	}

	// ------------------------------------------------------------ atividade
	activityFeed(ctx, events, { showGame = true, showDay = true } = {}) {
		const { U } = ctx;
		if (!events.length) return U.empty({ icon: "pulse", title: "Nenhuma atividade registrada", text: "Datas de início, sessões e conquistas desbloqueadas aparecem aqui.", compact: true });
		const byDay = new Map();
		for (const e of events) { if (!byDay.has(e.date)) byDay.set(e.date, []); byDay.get(e.date).push(e); }
		const line = e => {
			const game = showGame ? `<a class="sv-feed-game" ${U.openAttrs(e.game.path)}>${U.esc(e.game.title)}</a>` : "";
			switch (e.type) {
				case "achievement": {
					const a = e.achievements;
					const icons = a.slice(0, 4).map(x => x.iconSrc ? `<img src="${U.attr(x.iconSrc)}" alt="" title="${U.attr(x.name)}" loading="lazy">` : "").join("");
					const lead = a[0];
					const text = a.length === 1 ? `Desbloqueou <b>${U.esc(lead.name)}</b>` : `Desbloqueou <b>${a.length} conquistas</b>, incluindo ${U.esc(lead.name)}`;
					return { icon: "trophy", tone: "blue", body: `${text} ${showGame ? `em ${game}` : ""}`, extra: `<span class="sv-feed-icons">${icons}</span>` };
				}
				case "perfect": return { icon: "gem", tone: "gold", body: `Chegou a 100% das conquistas ${showGame ? `em ${game}` : ""}` };
				case "completed": return { icon: "flag", tone: "green", body: `Zerou ${game || "o jogo"}` };
				case "started": return { icon: "play", tone: "blue", body: `Começou ${game || "a jogar"}` };
				case "session": return { icon: "clock", tone: "muted", body: `Jogou ${e.hours ? `${U.fmtHours(e.hours)} de ` : ""}${game || "uma sessão"}${e.note ? `<span class="sv-feed-note">${U.esc(e.note)}</span>` : ""}` };
				default: return { icon: "plus", tone: "muted", body: `Adicionou ${game || "o jogo"} à biblioteca` };
			}
		};
		return `<ol class="sv-feed${showDay ? "" : " sv-feed--dayless"}">${[...byDay].map(([day, list]) => `<li class="sv-feed-day">${showDay ? `<time>${U.esc(U.relDate(day) === U.fmtDate(day) ? U.fmtDate(day) : `${U.relDate(day)}, ${U.fmtDate(day, { year: false })}`)}</time>` : ""}
			<ul>${list.map(e => { const l = line(e); return `<li class="sv-feed-item"><span class="sv-feed-icon sv-tone-${l.tone}">${U.icon(l.icon)}</span><span class="sv-feed-body">${l.body}</span>${l.extra || ""}</li>`; }).join("")}</ul></li>`).join("")}</ol>`;
	}

	// ==================================================== CARROSSEL (HOME)
	// Os jogos em destaque, cada um no MESMO card do topo da Home
	// (gameHero "home"). Trilha com cópias do último e do primeiro nas
	// pontas: ao passar do fim, a trilha salta sem transição para o card
	// real equivalente — loop sem quebra visual. Movimento por transform
	// (nada de rolagem nativa), arrastar com mouse ou toque.
	heroCarousel(ctx, games) {
		const { U } = ctx;
		const slide = (g, i, clone = false) => `<div class="sv-herocar-slide"${clone ? ' aria-hidden="true" inert data-clone' : ` data-i="${i}"`} role="group" aria-roledescription="slide" aria-label="${i + 1} de ${games.length}">${this.gameHero(ctx, g, { variant: "home" })}</div>`;
		const n = games.length;
		return `<section class="sv-herocar" data-herocar aria-roledescription="carousel" aria-label="Jogos em destaque" style="--n:${n}">
			<div class="sv-herocar-track" data-herocar-track>
				${slide(games[n - 1], n - 1, true)}${games.map((g, i) => slide(g, i)).join("")}${slide(games[0], 0, true)}
			</div>
			<button type="button" class="sv-herocar-nav sv-herocar-nav--prev" data-herocar-prev aria-label="Anterior">${U.icon("chevronLeft")}</button>
			<button type="button" class="sv-herocar-nav sv-herocar-nav--next" data-herocar-next aria-label="Próximo">${U.icon("chevronRight")}</button>
			<div class="sv-herocar-dots" role="tablist" aria-label="Escolher destaque">${games.map((g, i) => `<button type="button" role="tab" data-herocar-dot="${i}" aria-label="${U.attr(g.title)}"${i === 0 ? ' class="is-active" aria-selected="true"' : ""}><i></i></button>`).join("")}</div>
		</section>`;
	}

	// =============================================================== HERO
	// Composição full-bleed: arte ocupa a superfície inteira; capa em
	// evidência sobreposta à borda; título com presença; números com
	// hierarquia (um destaque, o resto discreto).
	// ícone da plataforma (o da página dela, senão o padrão do console)
	_platIcon(ctx, name) {
		const { C, model } = ctx;
		if (!name || !ctx.B?.ident) return "monitor";
		const page = (model?.platforms || []).find(p => C.normalizeKey(p.title) === C.normalizeKey(name)) || null;
		return ctx.B.ident(ctx, "platform", name, page).icon || "monitor";
	}

	gameHero(ctx, g, { variant = "page" } = {}) {
		const { C, U } = ctx;
		if (!g) return "";
		const bg = variant === "home" ? (g.images.featured || g.images.background) : (g.images.background || g.images.featured);
		const art = bg || g.images.cover;
		const artIsCover = !bg && !!g.images.cover;
		const f = g.framing;
		const a = g.ach;
		const perfect = C.isPerfect(g);
		const stateCls = [
			`is-${g.status.toLowerCase()}`, g.favorite ? "is-favorite" : "", perfect ? "is-perfect" : "",
			!art ? "is-noart" : "", artIsCover ? "is-coverart" : "", g.notPlayed ? "is-unplayed" : ""
		].filter(Boolean).join(" ");

		const eyebrow = [g.franchise ? `<a ${U.catAttrs("franchise", g.franchise, (ctx.model.franchises || []).find(p => C.normalizeKey(p.title) === C.normalizeKey(g.franchise)))} class="sv-hero-franchise">${U.esc(g.franchise)}</a>` : "", g.releaseYear ? `<span>${g.releaseYear}</span>` : ""].filter(Boolean).join("");
		const credit = [g.developer, g.publisher && g.publisher !== g.developer ? g.publisher : ""].filter(Boolean);

		const achBlock = a.state === "known" && a.total
			? `<div class="sv-hero-ach">${U.ring(a.pct, { size: 64, stroke: 5, perfect: a.perfect })}<div><b class="sv-num">${a.unlocked}<small>/${a.total}</small></b><span>${a.perfect ? "Todas as conquistas" : `${U.fmtPct(a.pctRound)} das conquistas`}</span></div></div>`
			: a.state === "pct" ? `<div class="sv-hero-ach">${U.ring(a.pct, { size: 64, stroke: 5, perfect: a.perfect })}<div><b class="sv-num">${U.fmtPct(a.pctRound)}</b><span>das conquistas na GOG</span></div></div>`
			: a.state === "unknown" ? `<div class="sv-hero-ach is-unknown"><span class="sv-hero-ach-unknown">${U.icon("trophy")}</span><div><b>—</b><span>${g.provider === "unset" ? "Origem das conquistas não configurada" : C.autoSync(g) ? "Sincronize para ver conquistas" : "Conquistas não registradas"}</span></div></div>` : "";

		const steamNote = g.provider === "steam" && C.autoSync(g) && g.steam.status && !["ok", "no_stats"].includes(g.steam.status)
			? `<span class="sv-hero-warn" title="${U.attr(g.steam.error)}">${U.icon("cloudOff")}${U.esc(ctx.S.message(g.steam.status))}</span>` : "";

		// Ação principal: o Obsidian não executa jogos, então a ficha oferece o
		// que alimenta a biblioteca — registrar uma sessão (tempo, calendário,
		// estatísticas, última vez jogado). Na Home, a ação é abrir a ficha.
		const primary = variant === "home" ? "" : U.btn("Registrar sessão", { icon: "plus", kind: "primary", size: "lg", action: "manage", attrs: `data-section="sessions" data-path="${U.attr(g.path)}"` });
		const openBtn = variant === "home" ? `<a class="sv-btn sv-btn--primary sv-btn--lg" ${U.openAttrs(g.path)}>${U.icon("eye")}<span>Ver ficha</span></a>` : "";

		return `<section class="sv-hero sv-hero--${variant} ${stateCls}" style="--sv-hue:${g.hue};${g.accent ? `--sv-accent:${g.accent};` : ""}--sv-bg-x:${f.x}%;--sv-bg-y:${f.y}%;--sv-bg-zoom:${(f.zoom / 100).toFixed(3)}" data-game="${U.attr(g.path)}">
			<div class="sv-hero-art" aria-hidden="true">
				${art ? `<img class="sv-hero-img" src="${U.attr(art)}" alt="" decoding="async" fetchpriority="high" data-sv-img data-accent-source>` : `<div class="sv-hero-texture"></div>`}
				<div class="sv-hero-scrim"></div>
			</div>
			<div class="sv-hero-inner">
				<div class="sv-hero-cover">${U.cover(g, { eager: true })}${perfect ? `<span class="sv-hero-seal" title="100% das conquistas">${U.icon("gem")}</span>` : ""}</div>
				<div class="sv-hero-info">
					${variant === "home" ? `<span class="sv-hero-kicker">${g.status === "Playing" ? "Jogando agora" : "Em destaque"}</span>` : ""}
					${eyebrow ? `<div class="sv-hero-eyebrow">${eyebrow}</div>` : ""}
					<h1 class="sv-hero-title${g.images.logo ? " has-logo" : ""}${g.title.length > 44 ? " is-xlong" : g.title.length > 26 ? " is-long" : ""}">${(() => {
						const inner = g.images.logo ? `<img class="sv-hero-logo" src="${U.attr(g.images.logo)}" alt="" decoding="async" data-sv-img><span class="sv-sr">${U.esc(g.title)}</span>` : U.esc(g.title);
						return variant === "home" ? `<a ${U.openAttrs(g.path)}>${inner}</a>` : inner;
					})()}</h1>
					${credit.length ? `<p class="sv-hero-credit">${credit.map(c => `<span>${U.esc(c)}</span>`).join("")}</p>` : ""}
					<div class="sv-hero-tags">
						${U.statusTag(g, C)}
						${(qi => qi > 0 ? `<button type="button" class="sv-tag sv-tag--queue" data-action="queue-manage" title="Organizar a fila A seguir">${U.icon("list")}${qi}º na fila</button>` : "")(g.upNext !== null && !["Completed", "Dropped"].includes(g.status) ? C.queue(ctx.model).indexOf(g) + 1 : 0)}
						<span class="sv-tag">${U.icon(this._platIcon(ctx, g.platform))}${U.esc(g.platform)}</span>
						${g.provider !== "unset" ? U.achSourceTag(g, { cls: "sv-tag", sync: false }) : ""}
						${steamNote}
					</div>
					${g.summary ? `<p class="sv-hero-summary">${U.esc(g.summary)}</p>` : ""}
					<div class="sv-hero-stats">
						<div class="sv-hero-time"><b class="sv-num">${U.esc(U.fmtHours(g.playtime.hours).replace(" h", ""))}<small>${g.playtime.hours >= 1 || g.playtime.hours === 0 ? "h" : ""}</small></b><span>${g.playtime.origin === "steam" ? "na Steam" : g.playtime.origin === "gog" ? "na GOG" : "jogadas"}${g.lastPlayed.date ? `, ${U.esc(U.relDate(g.lastPlayed.date))}` : ""}</span></div>
						${achBlock}
						${g.rating ? `<div class="sv-hero-rating"><b class="sv-num">${U.fmtNum(g.rating, 1)}</b>${U.stars(g.rating)}</div>` : ""}
					</div>
					<div class="sv-hero-actions">
						${primary}${openBtn}
						${g.status !== "Wishlist" ? `<button type="button" class="sv-btn sv-btn--glass sv-btn--lg sv-btn--icon sv-live-toggle" data-action="live-toggle" data-live-btn data-path="${U.attr(g.path)}" aria-pressed="false" title="Começar uma sessão ao vivo (cronômetro)" aria-label="Começar uma sessão ao vivo (cronômetro)">${U.icon("play")}<i class="sv-live-sq" aria-hidden="true"></i></button>` : ""}
						<button type="button" class="sv-btn sv-btn--glass sv-btn--lg sv-btn--icon sv-fav-toggle${g.favorite ? " is-on" : ""}" data-action="favorite" data-path="${U.attr(g.path)}" aria-pressed="${g.favorite}" title="${g.favorite ? "Remover dos favoritos" : "Favoritar"}">${U.icon("heart")}</button>
						${variant === "page" ? `<div class="sv-menu-wrap"><button type="button" class="sv-btn sv-btn--glass sv-btn--lg sv-btn--icon" data-action="menu" aria-haspopup="true" title="Mais ações">${U.icon("more")}</button>
							<div class="sv-menu" role="menu" hidden>
								<button role="menuitem" data-action="manage" data-section="details" data-path="${U.attr(g.path)}">${U.icon("edit")}Editar detalhes</button>
								<button role="menuitem" data-action="manage" data-section="images" data-path="${U.attr(g.path)}">${U.icon("image")}Capa e fundo</button>
								${!["Completed", "Dropped"].includes(g.status) ? `<button role="menuitem" data-action="queue-toggle" data-path="${U.attr(g.path)}">${U.icon("list")}${g.upNext !== null ? "Tirar da fila A seguir" : "Adicionar à fila A seguir"}</button>` : ""}
								<button role="menuitem" data-action="share-card" data-kind="game" data-path="${U.attr(g.path)}">${U.icon("share")}Compartilhar cartão</button>
								<button role="menuitem" data-action="feature-toggle" data-path="${U.attr(g.path)}" data-on="${g.page?.featuredOnHome === true || g.page?.featuredOnHome === "true" ? "1" : ""}">${U.icon("sparkles")}${g.page?.featuredOnHome === true || g.page?.featuredOnHome === "true" ? "Remover dos destaques da Home" : "Destacar na Home"}</button>
								${g.provider === "steam" && C.autoSync(g) ? `<button role="menuitem" data-action="steam-sync-game" data-path="${U.attr(g.path)}">${U.icon("refresh")}Sincronizar com a Steam</button>` : ""}
								${ctx.A?.isXbox?.(g) ? `<button role="menuitem" data-action="ach-bulk" data-path="${U.attr(g.path)}">${U.icon("list")}Adicionar conquistas em lote</button>` : ""}
								${g.provider === "gog" && C.autoSync(g) && ctx.PL?.getConfig("gog")?.configured ? `<button role="menuitem" data-action="plat-sync-game" data-platform="gog" data-path="${U.attr(g.path)}">${U.icon("refresh")}Sincronizar com a GOG</button>` : ""}
								${C.safeUrl(g.gog.url, { hosts: ["gog.com"] }) ? `<a role="menuitem" href="${U.attr(C.safeUrl(g.gog.url, { hosts: ["gog.com"] }))}">${U.icon("external")}Página na GOG</a>` : ""}
								${g.steamAppId ? `<button role="menuitem" data-action="steam-art" data-path="${U.attr(g.path)}">${U.icon("download")}Baixar artes da Steam</button><button role="menuitem" data-action="steam-details" data-path="${U.attr(g.path)}">${U.icon("list")}Completar dados pela Steam</button>` : ""}
								${g.raGameId ? `${g.provider === "retroachievements" && C.autoSync(g) ? `<button role="menuitem" data-action="ra-sync-game" data-path="${U.attr(g.path)}">${U.icon("refresh")}Sincronizar com o RetroAchievements</button>` : ""}<a role="menuitem" href="https://retroachievements.org/game/${U.attr(g.raGameId)}">${U.icon("external")}Página no RetroAchievements</a>` : ""}
								${g.steamAppId ? `<a role="menuitem" href="https://store.steampowered.com/app/${U.attr(g.steamAppId)}/">${U.icon("external")}Página na loja</a><a role="menuitem" href="https://steamcommunity.com/app/${U.attr(g.steamAppId)}">${U.icon("external")}Hub da comunidade</a>` : ""}
							</div></div>` : ""}
					</div>
				</div>
			</div>
		</section>`;
	}

	// ========================================================= BIBLIOTECA
	library(ctx, { games = null, title = "Biblioteca", active = "library", sub = "", headExtra = "", hideAchFilter = false } = {}) {
		const { C, U, model } = ctx;
		const list = games || model.games;
		const st = this._libState(ctx, active);
		const byTitle = [...list].sort((a, b) => a.title.localeCompare(b.title));
		const plats = this._libPlatIdents(ctx, list);
		const cardHtml = (g, hidden = false) => U.gameCard(g, C, { lib: plats.get(g.platform) }).replace('<article class="sv-card', `<article ${this._libAttrs(ctx, g)}${hidden ? " hidden" : ""} class="sv-card`);
		const rowHtml = g => this._libRow(ctx, g, plats.get(g.platform));
		// bibliotecas grandes (3.20.0): a tela abre com os primeiros cards já na
		// ordem e no filtro salvos; o resto entra em partes depois da pintura.
		// A lista só é montada quando a visualização Lista é aberta.
		let first = byTitle, pending = [];
		if (list.length > this._libChunk * 2 && st.group === "none") {
			const data = byTitle.map(g => ({ g, d: this._libData(ctx, g) }));
			const vis = data.filter(x => this._libMatch(st, x.d)).sort((x, y) => this._libCmp(st, x.d, y.d));
			const shown = new Set(vis.map(x => x.g));
			const order = [...vis, ...data.filter(x => !shown.has(x.g))].map(x => ({ g: x.g, hidden: !shown.has(x.g) }));
			first = order.slice(0, this._libChunk);
			pending = order.slice(this._libChunk);
		} else first = byTitle.map(g => ({ g, hidden: false }));
		const cards = first.map(x => cardHtml(x.g, x.hidden));
		const rowsNow = st.view === "list" || !pending.length;
		const rows = rowsNow ? byTitle.map(rowHtml) : [];

		const actions = active === "library" ? `${U.btn("Adicionar jogo", { icon: "plus", kind: "primary", action: "add-game" })}${U.btn("", { icon: "dice", kind: "secondary", action: "random-game", title: "O que jogar agora?" })}<div class="sv-menu-wrap">${U.btn("", { icon: "more", kind: "secondary", action: "menu", title: "Mais ações" })}<div class="sv-menu" hidden>
			<button data-action="csv-import">${U.icon("upload")}Importar vários jogos (lista ou CSV)</button>
			<button data-action="library-health">${U.icon("heartbeat")}Saúde da biblioteca</button>
			<button data-action="csv-export">${U.icon("download")}Exportar biblioteca (CSV)</button>
			<button data-action="backup-now">${U.icon("download")}Backup completo (.zip no vault)</button>
		</div></div>` : "";

		const sortLabel = this._libSorts()[st.sort] || "Nome";
		const html = `<div class="sv-page sv-pad sv-libpage">
			${U.pageHead(title, { sub: sub || U.plural(list.length, "jogo", "jogos"), actions })}
			${headExtra}
			${list.length ? this._libSummary(ctx, list) : ""}
			${list.length ? this._libContinue(ctx, list) : ""}
			${list.length ? `<div class="sv-libbar" role="toolbar" aria-label="Filtrar a biblioteca">
				<div class="sv-field sv-field--search">${U.icon("search")}<input type="search" class="sv-input" data-lib-q placeholder="Buscar ou filtrar: nota>4 status:zerado" aria-label="Buscar por nome, plataforma, gênero, subgênero, estúdio, distribuidora ou tag. Também aceita comandos como status:zerado, plataforma:ps2, subgenero:puzzle, dev:capcom, nota>4, horas>=20, ano:2023 e fav" enterkeyhint="search"></div>
				<button type="button" class="sv-libbtn" data-lib-filters aria-haspopup="dialog">${U.icon("filter")}<span class="sv-libbtn-label">Filtros</span><b class="sv-libbtn-badge" hidden>0</b></button>
				<button type="button" class="sv-libbtn" data-lib-display aria-haspopup="dialog" title="Ordenar, agrupar e visualizar">${U.icon("sort")}<span class="sv-libbtn-label" data-lib-sortlabel>${U.esc(sortLabel)}</span></button>
				<div class="sv-viewtoggle sv-libviews" role="radiogroup" aria-label="Visualização">${Object.entries(this._libViews()).map(([k, v]) => `<button type="button" data-view="${k}" class="${st.view === k ? "is-active" : ""}" title="${U.attr(v.label)}" aria-label="${U.attr(v.label)}">${U.icon(v.icon)}</button>`).join("")}</div>
				<button type="button" class="sv-libbtn sv-libbtn--icon" data-lib-select title="Selecionar vários" aria-label="Selecionar vários">${U.icon("check")}</button>
			</div>
			<div class="sv-libchips" data-lib-active hidden></div>
			<div class="sv-libquick" role="group" aria-label="Atalhos">${this._libQuick(ctx, list)}</div>` : ""}
			<div class="sv-library" data-view="${U.attr(st.view)}"${U.layout().cards.library === "original" ? " data-lay-off" : ""}>
				<div class="sv-azwrap" hidden><nav class="sv-azrail" aria-label="Pular para a letra">${"#ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(l => `<button type="button" data-az="${l}">${l}</button>`).join("")}</nav></div>
				<div class="sv-grid">${cards.join("")}</div>
				<div class="sv-list sv-liblist" hidden>${rows.join("")}</div>
				${list.length ? "" : U.empty({ icon: "books", title: "Nenhum jogo aqui ainda", text: "Adicione um jogo para começar: capa, progresso e conquistas aparecem aqui.", action: U.btn("Adicionar jogo", { icon: "plus", kind: "primary", action: "add-game" }) })}
				<div class="sv-noresults" hidden>${U.empty({ icon: "search", title: "Nenhum jogo encontrado", text: "Tente outro termo ou remova os filtros ativos.", action: U.btn("Limpar filtros", { attrs: "data-lib-clear" }) })}</div>
			</div>
		</div>`;
		return { active, html, wire: root => this._wireLibrary(root, ctx, { list, active, hideAchFilter, pending, cardHtml, rowHtml, rowsNow, byTitle }) };
	}

	// ---- definições
	_libSorts() {
		return { title: "Nome", played: "Jogado recentemente", added: "Adicionado recentemente", hours: "Mais horas", pct: "Conquistas", rating: "Nota", year: "Lançamento" };
	}
	_libGroups() {
		return { none: "Sem grupos", status: "Status", platform: "Plataforma", genre: "Gênero", franchise: "Franquia", year: "Ano de lançamento", letter: "Letra A–Z" };
	}
	_libViews() {
		return { grid: { label: "Grade", icon: "grid" }, compact: { label: "Compacta", icon: "rows" }, shelf: { label: "Prateleira", icon: "books" }, list: { label: "Lista", icon: "list" } };
	}
	_libSmart() {
		return { never: ["Nunca jogados", "books"], near: ["Quase 100%", "target"], stale: ["Parados há 3 meses", "clock"], nocover: ["Sem capa", "image"], norating: ["Sem nota", "star"], newmonth: ["Adicionados este mês", "calendar"] };
	}
	_libTones() {
		return { Playing: "var(--sv-blue)", Paused: "var(--sv-amber, #e9bd52)", Backlog: "#7c8aa0", Completed: "var(--sv-green)", Dropped: "var(--sv-red)", Wishlist: "#a970ff" };
	}

	// filtro, ordem, grupos e visualização ficam lembrados por tela
	_libState(ctx, active) {
		const def = { status: [], platform: [], genre: [], subgenre: [], ach: "", progress: "", rating: 0, fav: false, smart: "", sort: "title", group: "none", view: ctx.U._store("libraryView") || "grid" };
		let saved = {};
		try { saved = JSON.parse(ctx.U._store(`lib:${active}`) || "{}") || {}; } catch (_) { saved = {}; }
		const s = { ...def, ...saved, q: "" };
		for (const k of ["status", "platform", "genre", "subgenre"]) if (!Array.isArray(s[k])) s[k] = [];
		if (!this._libSorts()[s.sort]) s.sort = "title";
		if (!this._libGroups()[s.group]) s.group = "none";
		if (!this._libViews()[s.view]) s.view = "grid";
		return s;
	}

	_libPlatIdents(ctx, list) {
		const m = new Map();
		for (const g of list) {
			if (m.has(g.platform)) continue;
			const page = ctx.model.platforms.find(p => ctx.C.normalizeKey(p.title) === ctx.C.normalizeKey(g.platform));
			const id = ctx.B?.ident ? ctx.B.ident(ctx, "platform", g.platform, page) : { color: "#8fa3b8", icon: "monitor" };
			m.set(g.platform, { color: id.color, icon: id.icon, label: g.platform });
		}
		return m;
	}

	_libFlags(ctx, g) {
		const { C } = ctx, today = C.today();
		return [
			g.notPlayed && "never",
			g.ach.state === "known" && g.ach.total && !g.ach.perfect && g.ach.pct >= 70 && "near",
			["Playing", "Paused"].includes(g.status) && (!g.lastPlayed.date || C.daysBetween(g.lastPlayed.date, today) > 90) && "stale",
			!g.images.cover && "nocover",
			!g.rating && "norating",
			g.dateAdded && g.dateAdded.startsWith(today.slice(0, 7)) && "newmonth"
		].filter(Boolean).join(" ");
	}

	// dados de filtro/ordem de um jogo, com as mesmas chaves do dataset do card
	_libData(ctx, g) {
		const { C } = ctx;
		if (g.__libData && g.__libData.rev === ctx.model.builtAt) return g.__libData.d;
		const letter = (C.normalizeKey(g.title)[0] || "#").toUpperCase();
		const genres = [...g.genres].filter(Boolean);
		const subs = [...(g.subgenres || [])].filter(Boolean);
		const d = {
			fStatus: g.status, fPlatform: g.platform, fProvider: g.provider, fSync: g.sync,
			fProgress: C.progressBucket(g), fFav: String(!!g.favorite), fRating: String(g.rating || 0),
			fGenres: `|${genres.map(x => C.normalizeKey(x)).join("|")}|`, fSmart: this._libFlags(ctx, g),
			fSubs: `|${subs.map(x => C.normalizeKey(x)).join("|")}|`,
			// busca livre: nome, franquia, gênero, subgênero, estúdio, distribuidora, plataforma e tags
			fTitle: C.normalizeKey(`${g.title} ${g.franchise} ${genres.join(" ")} ${subs.join(" ")} ${g.developer || ""} ${g.publisher || ""} ${g.platform || ""} ${(g.labels || []).join(" ")}`),
			fDev: C.normalizeKey(g.developer || ""), fPub: C.normalizeKey(g.publisher || ""), fTags: `|${(g.labels || []).map(x => C.normalizeKey(x)).join("|")}|`,
			sTitle: g.title.toLowerCase(), sHours: String(g.playtime.hours || 0), sRating: String(g.rating || 0),
			sAdded: g.dateAdded || "", sPlayed: g.lastPlayed.date || "", sPct: String(g.ach.pct ?? -1), sYear: String(g.releaseYear || 0),
			gStatus: g.status, gPlatform: g.platform, gGenre: genres[0] || "", gFranchise: g.franchise || "",
			gYear: String(g.releaseYear || ""), gLetter: /[A-Z]/.test(letter) ? letter : "#"
		};
		Object.defineProperty(g, "__libData", { value: { rev: ctx.model.builtAt, d }, configurable: true, writable: true });
		return d;
	}

	_libAttrs(ctx, g) {
		const { U } = ctx;
		return Object.entries(this._libData(ctx, g)).map(([k, v]) => `data-${k.replace(/[A-Z]/g, c => "-" + c.toLowerCase())}="${U.attr(String(v))}"`).join(" ");
	}

	// filtro e ordem (os mesmos para os dados e para o dataset dos cards)
	get _libChunk() { return 60; }
	// 3.64.0: busca avançada. Comandos no campo de busca viram filtros:
	// status:zerado, plataforma:ps2, genero:acao, subgenero:puzzle, franquia:resident,
	// dev:capcom, dist:rockstar, tag:coop, nota>4, horas>=20, ano:2023,
	// conquistas>=80, fav. O resto continua sendo texto.
	_libQueryParse(raw, C) {
		const st = { jogando: "Playing", playing: "Playing", pausado: "Paused", paused: "Paused", backlog: "Backlog", zerado: "Completed", zerados: "Completed", completo: "Completed", completed: "Completed", concluido: "Completed", abandonado: "Dropped", dropped: "Dropped", desejos: "Wishlist", desejo: "Wishlist", wishlist: "Wishlist", lista: "Wishlist" };
		const nums = { nota: "fRating", rating: "fRating", horas: "sHours", hours: "sHours", h: "sHours", ano: "sYear", year: "sYear", conquistas: "sPct", ach: "sPct", pct: "sPct" };
		const rules = [], rest = [];
		const re = /([a-zà-ú]+)\s*(>=|<=|:|>|<|=)\s*("[^"]*"|[^\s]+)|(\S+)/gi;
		let m;
		while ((m = re.exec(String(raw || "")))) {
			if (m[4]) {
				const w = C.normalizeKey(m[4]);
				if (w === "fav" || w === "favorito" || w === "favoritos") rules.push(d => d.fFav === "true");
				else rest.push(m[4]);
				continue;
			}
			const key = C.normalizeKey(m[1]), op = m[2], val = C.normalizeKey(m[3].replace(/^"|"$/g, ""));
			if (["status", "s"].includes(key) && st[val.replace(/ /g, "")]) { const k = st[val.replace(/ /g, "")]; rules.push(d => d.fStatus === k); continue; }
			if (["plataforma", "plat", "platform", "p"].includes(key) && val) { rules.push(d => C.normalizeKey(d.fPlatform).includes(val)); continue; }
			if (["genero", "gen", "genre", "g"].includes(key) && val) { rules.push(d => d.fGenres.split("|").some(x => x && x.includes(val))); continue; }
			if (["subgenero", "sub", "subgenre"].includes(key) && val) { rules.push(d => d.fSubs.split("|").some(x => x && x.includes(val))); continue; }
			if (["dev", "desenvolvedora", "estudio", "developer"].includes(key) && val) { rules.push(d => d.fDev.includes(val)); continue; }
			if (["dist", "distribuidora", "pub", "publisher", "editora"].includes(key) && val) { rules.push(d => d.fPub.includes(val)); continue; }
			if (["tag", "tags", "etiqueta", "label"].includes(key) && val) { rules.push(d => d.fTags.split("|").some(x => x && x.includes(val))); continue; }
			if (["franquia", "saga", "franchise"].includes(key) && val) { rules.push(d => C.normalizeKey(d.gFranchise).includes(val)); continue; }
			if (["fav", "favorito"].includes(key)) { const yes = !["nao", "no", "false", "0"].includes(val); rules.push(d => (d.fFav === "true") === yes); continue; }
			if (nums[key] && val !== "" && Number.isFinite(Number(val.replace(" ", ".")))) {
				const n = Number(val.replace(" ", ".")), f = nums[key];
				const cmp = { ">": (a, b) => a > b, "<": (a, b) => a < b, ">=": (a, b) => a >= b, "<=": (a, b) => a <= b, ":": (a, b) => f === "fRating" || f === "sPct" || f === "sHours" ? a >= b : a === b, "=": (a, b) => a === b }[op];
				rules.push(d => { const v = Number(d[f]); return Number.isFinite(v) && (f !== "sPct" || v >= 0) && cmp(v, n); });
				continue;
			}
			rest.push(m[0]);
		}
		return { text: C.normalizeKey(rest.join(" ")), rules, count: rules.length };
	}

	_libMatch(state, d) {
		return (!state.q || d.fTitle.includes(state.q) || state.q.split(" ").every(w => d.fTitle.includes(w)))
			&& (!state.qRules?.length || state.qRules.every(r => r(d)))
			&& (!state.status.length || state.status.includes(d.fStatus))
			&& (!state.platform.length || state.platform.includes(d.fPlatform))
			&& (!state.genre.length || state.genre.some(x => d.fGenres.includes(`|${x}|`)))
			&& (!state.subgenre?.length || state.subgenre.some(x => d.fSubs.includes(`|${x}|`)))
			&& (!state.fav || d.fFav === "true")
			&& (!state.ach || (state.ach[0] === "p" ? d.fProvider : d.fSync) === state.ach.slice(2))
			&& (!state.progress || d.fProgress === state.progress)
			&& (!state.rating || Number(d.fRating) >= state.rating)
			&& (!state.smart || d.fSmart.split(" ").includes(state.smart));
	}
	_libCmp(state, x, y) {
		const s = state.sort;
		if (s === "title") return x.sTitle.localeCompare(y.sTitle);
		const key = { played: "sPlayed", added: "sAdded", hours: "sHours", pct: "sPct", rating: "sRating", year: "sYear" }[s];
		const r = ["hours", "pct", "rating", "year"].includes(s) ? Number(y[key]) - Number(x[key]) : String(y[key]).localeCompare(String(x[key]));
		return r || x.sTitle.localeCompare(y.sTitle);
	}

	_libRow(ctx, g, plat) {
		const { C, U } = ctx;
		const a = g.ach;
		const ach = a.state === "known" && a.total ? `${U.progressBar(a.pct, { thin: true, tone: a.perfect ? "gold" : "" })}<span class="sv-num">${a.unlocked}/${a.total}</span>` : `<span class="sv-muted">—</span>`;
		return `<div class="sv-row sv-librow${g.favorite ? " is-favorite" : ""}" data-row-path="${U.attr(g.path)}" data-game="${U.attr(g.path)}">
			<a class="sv-row-art" ${U.openAttrs(g.path)}>${U.cover(g)}</a>
			<a class="sv-row-title" ${U.openAttrs(g.path)}><span class="sv-librow-name">${U.esc(g.title)}${g.favorite ? `<span class="sv-librow-fav">${U.icon("heart")}</span>` : ""}</span><small class="sv-meta"><span class="sv-librow-plat" style="--sv-pc:${U.attr(plat?.color || "#8fa3b8")}">${U.icon(plat?.icon || "monitor")}${U.esc(g.platform)}</span>${g.releaseYear ? `<span>${g.releaseYear}</span>` : ""}</small></a>
			<span class="sv-row-cell sv-librow-status">${U.statusTag(g, C)}</span>
			<span class="sv-row-cell sv-librow-hours sv-num">${U.icon("clock")}${U.fmtHours(g.playtime.hours)}</span>
			<span class="sv-row-cell sv-row-ach">${ach}</span>
			<span class="sv-row-cell sv-librow-rating">${g.rating ? U.stars(g.rating) : `<span class="sv-muted">Sem nota</span>`}</span>
			<span class="sv-row-cell sv-librow-played">${g.lastPlayed.date ? U.esc(U.relDate(g.lastPlayed.date)) : `<span class="sv-muted">—</span>`}</span>
		</div>`;
	}

	// ---- topo vivo
	_libSummary(ctx, list) {
		const { C, U } = ctx;
		const s = C.groupStats(list);
		const tones = this._libTones();
		const groups = [...C.groupBy(list, g => g.status)].sort((a, b) => (C.statusDefs[a[0]]?.order ?? 9) - (C.statusDefs[b[0]]?.order ?? 9));
		const fig = [
			{ label: "Jogos", value: U.fmtNum(list.length) },
			{ label: "Horas", value: s.hours ? U.fmtHours(s.hours) : "—" },
			{ label: "Zerados", value: U.fmtNum(s.completed), sub: `${s.completionPct}%` },
			s.achPct !== null ? { label: "Conquistas", value: U.fmtPct(s.achPct), tone: s.achPct === 100 ? "gold" : "" } : null
		];
		return `<section class="sv-libsum">
			${U.figures(fig)}
			<div class="sv-libsum-bar" role="group" aria-label="Jogos por status: toque para filtrar">${groups.map(([k, l]) => `<button type="button" data-lib-status="${U.attr(k)}" style="flex:${l.length};--sv-tone:${tones[k] || "var(--sv-muted)"}" title="${U.attr(C.statusLabel(k))}: ${l.length}" aria-label="${U.attr(C.statusLabel(k))}: ${l.length}"></button>`).join("")}</div>
			<div class="sv-libsum-legend">${groups.map(([k, l]) => `<button type="button" data-lib-status="${U.attr(k)}" style="--sv-tone:${tones[k] || "var(--sv-muted)"}"><i></i>${U.esc(C.statusLabel(k))}<b>${l.length}</b></button>`).join("")}</div>
		</section>`;
	}

	_libContinue(ctx, list) {
		const { U } = ctx;
		const playing = list.filter(g => g.status === "Playing").sort((a, b) => (b.lastPlayed.date || "").localeCompare(a.lastPlayed.date || "") || a.title.localeCompare(b.title)).slice(0, 8);
		if (!playing.length) return "";
		return `<section class="sv-block sv-libcont">
			${U.sectionHead("Continuar jogando", { count: playing.length })}
			<div class="sv-libcont-track">${playing.map(g => {
				const art = g.images.featured || g.images.background || g.images.cover;
				const a = g.ach;
				return `<article class="sv-libcont-card" style="--sv-hue:${g.hue}">
					${art ? `<img class="sv-libcont-art" src="${U.attr(art)}" alt="" loading="lazy" data-sv-img>` : ""}
					<div class="sv-libcont-body">
						<span class="sv-libcont-kicker">${U.icon("play")}${g.lastPlayed.date ? `Última sessão ${U.esc(U.relDate(g.lastPlayed.date))}` : "Sem sessões registradas"}</span>
						<strong>${U.esc(g.title)}</strong>
						<span class="sv-libcont-meta"><span>${U.esc(g.platform)}</span>${g.playtime.hours ? `<span>${U.fmtHours(g.playtime.hours)}</span>` : ""}${a.state === "known" && a.total ? `<span>${U.icon("trophy")}${a.unlocked}/${a.total}</span>` : ""}</span>
						${a.state === "known" && a.total ? U.progressBar(a.pct, { thin: true, tone: a.perfect ? "gold" : "" }) : ""}
						<a class="sv-btn sv-btn--primary sv-btn--sm sv-libcont-open" ${U.openAttrs(g.path)}>${U.icon("play")}<span>Abrir</span></a>
					</div>
				</article>`;
			}).join("")}</div>
		</section>`;
	}

	// ---- visões salvas (3.60.0): filtros + ordem + grupos + visualização com
	// um nome, num toque. Ficam em "lib:views" (sincroniza entre aparelhos)
	_libViewKeys() { return ["status", "platform", "genre", "subgenre", "ach", "progress", "rating", "fav", "smart", "sort", "group", "view"]; }
	_libSavedViews(ctx) {
		try { const v = JSON.parse(ctx.U._store("lib:views") || "[]"); return Array.isArray(v) ? v.filter(x => x && x.id && typeof x.name === "string" && x.s && typeof x.s === "object") : []; }
		catch (_) { return []; }
	}
	_libStoreViews(ctx, list) { ctx.U._store("lib:views", JSON.stringify(list.slice(0, 24))); }
	_libSnap(state) {
		const o = {};
		for (const k of this._libViewKeys()) o[k] = Array.isArray(state[k]) ? [...state[k]].sort() : state[k];
		return o;
	}
	_libSameView(state, saved) {
		const a = this._libSnap(state), b = this._libSnap({ ...this._libSnap(state), subgenre: [], ...saved.s });
		return JSON.stringify(a) === JSON.stringify(b);
	}
	_libViewChips(ctx) {
		const { U } = ctx;
		return this._libSavedViews(ctx).map(v => `<button type="button" class="sv-qchip sv-qchip--view" data-q-view="${U.attr(v.id)}" title="${U.attr(v.name)} · toque longo para editar">${U.icon("pin")}<b class="sv-qchip-name">${U.esc(v.name)}</b></button>`).join("");
	}

	_libQuick(ctx, list) {
		const { C, U } = ctx;
		const tones = this._libTones();
		const n = {};
		for (const g of list) n[g.status] = (n[g.status] || 0) + 1;
		const flags = {};
		for (const g of list) for (const f of this._libFlags(ctx, g).split(" ").filter(Boolean)) flags[f] = (flags[f] || 0) + 1;
		const favs = list.filter(g => g.favorite).length;
		const statuses = Object.keys(C.statusDefs).filter(k => n[k]);
		const smart = Object.entries(this._libSmart()).filter(([k]) => flags[k]);
		return `<button type="button" class="sv-qchip" data-q-all>Todos<span>${list.length}</span></button>
			<span class="sv-qviews" data-q-views>${this._libViewChips(ctx)}</span>
			${statuses.map(k => `<button type="button" class="sv-qchip" data-q-status="${k}" style="--sv-tone:${tones[k]}"><i></i>${U.esc(C.statusLabel(k))}<span>${n[k]}</span></button>`).join("")}
			${favs ? `<button type="button" class="sv-qchip" data-q-fav>${U.icon("heart")}Favoritos<span>${favs}</span></button>` : ""}
			${smart.length ? `<span class="sv-qchip-sep" aria-hidden="true"></span>${smart.map(([k, [label, icon]]) => `<button type="button" class="sv-qchip sv-qchip--smart" data-q-smart="${k}">${U.icon(icon)}${U.esc(label)}<span>${flags[k]}</span></button>`).join("")}` : ""}`;
	}

	// ---- comportamento
	_wireLibrary(root, ctx, { list, active, hideAchFilter, pending = [], cardHtml = null, rowHtml = null, rowsNow = true, byTitle = list }) {
		const { U, C, V } = ctx;
		const lib = root.querySelector(".sv-library");
		if (!lib) return;
		const grid = lib.querySelector(".sv-grid"), rowsBox = lib.querySelector(".sv-list"), none = lib.querySelector(".sv-noresults");
		const az = lib.querySelector(".sv-azwrap");
		const page = root.querySelector(".sv-libpage");
		const state = this._libState(ctx, active);
		const cards = [...grid.querySelectorAll(".sv-card")];
		let rowOf = new Map([...rowsBox.querySelectorAll("[data-row-path]")].map(r => [r.dataset.rowPath, r]));
		let rowsBuilt = rowsNow, mounting = pending.length > 0;
		const gameOf = new Map(list.map(g => [g.path, g]));
		const save = () => { const { q, qRules, ...rest } = state; U._store(`lib:${active}`, JSON.stringify(rest)); };
		let visibleCount = 0;

		const matches = d => this._libMatch(state, d);
		const cmp = (a, b) => this._libCmp(state, a.dataset, b.dataset);

		// ---- montagem em partes (bibliotecas grandes)
		const mountChunk = n => {
			const chunk = pending.splice(0, n);
			if (!chunk.length) return;
			const tpl = document.createElement("template");
			tpl.innerHTML = chunk.map(x => cardHtml(x.g, x.hidden)).join("");
			V?._wireImages?.(tpl.content);
			cards.push(...tpl.content.children);
			grid.appendChild(tpl.content);
		};
		// 3.23.0: o resto entra conforme a rolagem chega perto do fim da grade
		// (um marcador invisível logo depois dela), não mais tudo de uma vez
		let io = null;
		const sentinel = document.createElement("div");
		sentinel.className = "sv-libmore"; sentinel.setAttribute("aria-hidden", "true");
		const stopWatch = () => { io?.disconnect(); io = null; sentinel.remove(); };
		const finishMount = () => { if (!mounting) return; mountChunk(Infinity); mounting = false; stopWatch(); };
		const later = fn => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 150 }) : setTimeout(fn, 16));
		const pump = () => {
			if (!mounting || !grid.isConnected) return;
			mountChunk(120);
			if (pending.length) later(pump);
			else { mounting = false; apply(); }
		};
		const scrollRoot = () => {
			// 3.68.0: no modo camada o rolador é a própria camada; procurar pelo
			// estilo calculado dos pais forçava o cálculo de estilos da tela inteira
			const layer = lib.closest(".sv-layer");
			if (layer) return layer;
			for (let el = lib.parentElement; el && el !== document.body; el = el.parentElement) {
				const o = getComputedStyle(el).overflowY;
				if (o === "auto" || o === "scroll") return el;
			}
			return null;
		};
		const watch = () => {
			if (!mounting) return;
			if (typeof IntersectionObserver !== "function") return later(pump);
			grid.after(sentinel);
			io = new IntersectionObserver(entries => {
				if (!entries.some(e => e.isIntersecting) || !mounting) return;
				// 3.55.0: só entram os que vão aparecer. Com uma busca de poucos
				// resultados a grade fica curta e o marcador segue à vista; antes
				// isso montava, oculto, todo o resto da biblioteca
				const firstHidden = pending.findIndex(x => x.hidden);
				const n = firstHidden < 0 ? 30 : Math.min(30, firstHidden);
				if (!n) return;
				mountChunk(n);
				if (!pending.length) { mounting = false; stopWatch(); return; }
				// ainda perto do fim (tela alta, rolagem rápida): observa de novo
				io.unobserve(sentinel); io.observe(sentinel);
			}, { root: scrollRoot(), rootMargin: "0px 0px 1500px 0px" });
			io.observe(sentinel);
		};
		// os que ainda não entraram contam nos números e no índice A–Z
		const pendingVisible = () => mounting ? pending.filter(x => !x.hidden) : [];
		// a Lista só é montada quando aberta
		const ensureRows = () => {
			if (rowsBuilt || !rowHtml) return;
			finishMount();
			rowsBox.innerHTML = byTitle.map(rowHtml).join("");
			rowOf = new Map([...rowsBox.querySelectorAll("[data-row-path]")].map(r => [r.dataset.rowPath, r]));
			rowsBuilt = true;
		};

		const groupOf = c => {
			const d = c.dataset;
			switch (state.group) {
				case "status": return [String(C.statusDefs[d.gStatus]?.order ?? 9), C.statusLabel(d.gStatus)];
				case "platform": return [d.gPlatform.toLowerCase(), d.gPlatform];
				case "genre": return d.gGenre ? [d.gGenre.toLowerCase(), d.gGenre] : ["~", "Sem gênero"];
				case "franchise": return d.gFranchise ? [d.gFranchise.toLowerCase(), d.gFranchise] : ["~", "Sem franquia"];
				case "year": return d.gYear ? [String(9999 - Number(d.gYear)).padStart(4, "0"), d.gYear] : ["~", "Sem ano"];
				case "letter": return d.gLetter === "#" ? ["~", "#"] : [d.gLetter, d.gLetter];
				default: return ["", ""];
			}
		};

		const head = (label, count, tone) => {
			const h = document.createElement("div");
			h.className = "sv-libgroup";
			if (tone) h.style.setProperty("--sv-tone", tone);
			h.innerHTML = `<h3>${tone ? "<i></i>" : ""}${U.esc(label)}</h3><span>${U.plural(count, "jogo", "jogos")}</span>`;
			return h;
		};

		let ready = false;
		// 3.47.0: sem agrupamento, a grade fica em ordem de classificação com
		// todos os cards; filtrar (busca, status, plataforma…) só liga e desliga
		// "hidden", sem mover nada. Só reordena quando a ordem ou os cards mudam.
		let domKey = "";
		const applyFlat = () => {
			const key = `${state.sort}|${cards.length}|${rowsBuilt ? 1 : 0}`;
			const vis = [];
			if (key !== domKey) {
				grid.querySelectorAll(".sv-libgroup").forEach(x => x.remove());
				rowsBox.querySelectorAll(".sv-libgroup").forEach(x => x.remove());
				const all = [...cards].sort(cmp);
				const gFrag = document.createDocumentFragment(), rFrag = document.createDocumentFragment();
				for (const c of all) {
					const on = matches(c.dataset);
					c.hidden = !on; gFrag.appendChild(c);
					const r = rowOf.get(c.dataset.game); if (r) { r.hidden = !on; rFrag.appendChild(r); }
					if (on) vis.push(c);
				}
				grid.appendChild(gFrag); rowsBox.appendChild(rFrag);
				domKey = key;
			} else {
				const shown = [];
				for (const c of cards) {
					const on = matches(c.dataset);
					if (on) vis.push(c);
					if (c.hidden !== !on) { if (on) shown.push(c); c.hidden = !on; const r = rowOf.get(c.dataset.game); if (r) r.hidden = !on; }
				}
				// 3.49.0: os que voltam à grade entram em cascata curta (só os 24
				// primeiros na ordem da tela; o resto aparece direto)
				if (shown.length && V?._motionOn?.()) {
					// os 24 primeiros na ordem da tela: uma passada pelos filhos da grade
					const want = new Set(shown), first = [];
					for (const el of grid.children) { if (want.has(el)) { first.push(el); if (first.length === 24) break; } }
					first.forEach((c, i) => { c.style.setProperty("--sv-i", i); c.classList.remove("sv-lib-in"); });
					requestAnimationFrame(() => first.forEach(c => c.classList.add("sv-lib-in")));
					setTimeout(() => first.forEach(c => { c.classList.remove("sv-lib-in"); c.style.removeProperty("--sv-i"); }), 900);
				}
			}
			return vis;
		};
		// 3.47.0: enquanto parte dos cards ainda não entrou, busca e filtros
		// decidem pelos dados (sem montar nada): os que combinam vão para a
		// frente da fila e entram conforme a rolagem; os demais esperam ocultos.
		// Mudar a ordem ou o agrupamento continua montando tudo.
		const sort0 = state.sort;
		// só vale quando a tela abriu sem filtro: aí os guardados já estão na
		// ordem de classificação, logo depois dos que entraram
		const lazyOk = pending.every(x => !x.hidden);
		const pendData = new Map();
		const filterPending = () => {
			const on = [], off = [];
			for (const x of pending) {
				let d = pendData.get(x.g);
				if (!d) { d = this._libData(ctx, x.g); pendData.set(x.g, d); }
				x.hidden = !matches(d);
				(x.hidden ? off : on).push(x);
			}
			pending.splice(0, pending.length, ...on, ...off);
			if (!pending.length) { mounting = false; stopWatch(); return; }
			// filtro novo: se o marcador já está à vista, os que passaram a
			// combinar entram sem esperar a rolagem
			if (io && on.length) { io.unobserve(sentinel); io.observe(sentinel); }
		};
		const apply = () => {
			// mudança feita pela pessoa: o filtro precisa de todos os cards
			if (mounting && ready) { if (lazyOk && state.group === "none" && state.sort === sort0) filterPending(); else finishMount(); }
			if (state.group === "none") {
				const vis = applyFlat();
				visibleCount = vis.length + pendingVisible().length;
				none.hidden = visibleCount > 0 || !cards.length;
				paintControls();
				paintAz(vis);
				save();
				return;
			}
			domKey = "";
			const vis = [], hid = [];
			for (const c of cards) (matches(c.dataset) ? vis : hid).push(c);
			vis.sort(cmp);
			visibleCount = vis.length + pendingVisible().length;
			grid.querySelectorAll(".sv-libgroup").forEach(x => x.remove());
			rowsBox.querySelectorAll(".sv-libgroup").forEach(x => x.remove());
			const gFrag = document.createDocumentFragment(), rFrag = document.createDocumentFragment();
			const place = c => { c.hidden = false; gFrag.appendChild(c); const r = rowOf.get(c.dataset.game); if (r) { r.hidden = false; rFrag.appendChild(r); } };
			if (state.group === "none") vis.forEach(place);
			else {
				const buckets = new Map();
				for (const c of vis) { const [k, label] = groupOf(c); if (!buckets.has(k)) buckets.set(k, { label, items: [] }); buckets.get(k).items.push(c); }
				const tones = this._libTones();
				for (const k of [...buckets.keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))) {
					const b = buckets.get(k);
					const tone = state.group === "status" ? tones[b.items[0].dataset.gStatus] : "";
					gFrag.appendChild(head(b.label, b.items.length, tone));
					rFrag.appendChild(head(b.label, b.items.length, tone));
					b.items.forEach(place);
				}
			}
			for (const c of hid) { c.hidden = true; gFrag.appendChild(c); const r = rowOf.get(c.dataset.game); if (r) { r.hidden = true; rFrag.appendChild(r); } }
			grid.appendChild(gFrag); rowsBox.appendChild(rFrag);
			none.hidden = visibleCount > 0 || !cards.length;
			paintControls();
			paintAz(vis);
			save();
		};

		// ---- controles
		const activeChips = () => {
			const out = [];
			const sm = this._libSmart();
			for (const s of state.status) out.push(["status", s, C.statusLabel(s)]);
			for (const p of state.platform) out.push(["platform", p, p]);
			for (const g of state.genre) out.push(["genre", g, genreLabel.get(g) || g]);
			for (const g of state.subgenre) out.push(["subgenre", g, genreLabel.get(`sub:${g}`) || g]);
			if (state.fav) out.push(["fav", "", "Favoritos"]);
			if (state.smart) out.push(["smart", state.smart, sm[state.smart]?.[0] || state.smart]);
			if (state.ach) out.push(["ach", state.ach, achLabel(state.ach)]);
			if (state.progress) out.push(["progress", state.progress, progressLabels[state.progress] || state.progress]);
			if (state.rating) out.push(["rating", "", `Nota ${U.fmtNum(state.rating, 1)}+`]);
			return out;
		};
		const genreLabel = new Map();
		for (const g of list) for (const x of g.genres) if (x) genreLabel.set(C.normalizeKey(x), x);
		for (const g of list) for (const x of g.subgenres || []) if (x) genreLabel.set(`sub:${C.normalizeKey(x)}`, x);
		const progressLabels = { perfect: "100% das conquistas", partial: "Conquistas em andamento", zero: "0% das conquistas", unknown: "Sem contagem", none: "Sem conquistas" };
		const achLabel = v => { const [t, k] = v.split(":"); return t === "p" ? (C.providerDefs[k]?.label || k) : (C.syncDefs[k]?.label || k); };

		const activeView = () => this._libSavedViews(ctx).find(v => this._libSameView(state, v)) || null;
		const chipsBox = page.querySelector("[data-lib-active]");
		const badge = page.querySelector(".sv-libbtn-badge");
		const paintControls = () => {
			const chips = activeChips();
			if (chipsBox) {
				chipsBox.hidden = !chips.length;
				const cur = activeView();
				chipsBox.innerHTML = chips.map(([k, v, label]) => `<button type="button" class="sv-achip" data-rm="${k}" data-v="${U.attr(v)}" aria-label="Remover filtro ${U.attr(label)}">${U.esc(label)}${U.icon("x")}</button>`).join("") + (chips.length > 1 ? `<button type="button" class="sv-achip sv-achip--clear" data-lib-clear>Limpar tudo</button>` : "")
					+ (cur ? `<button type="button" class="sv-achip sv-achip--save" data-lib-editview="${U.attr(cur.id)}">${U.icon("edit")}Editar visão</button>` : `<button type="button" class="sv-achip sv-achip--save" data-lib-saveview>${U.icon("pin")}Salvar visão</button>`)
					+ `<span class="sv-achip-count">${U.plural(visibleCount, "jogo", "jogos")}</span>`;
			}
			if (badge) { badge.hidden = !chips.length; badge.textContent = String(chips.length); }
			page.querySelectorAll(".sv-qchip").forEach(b => {
				const on = b.dataset.qView ? activeView()?.id === b.dataset.qView
					: b.hasAttribute("data-q-all") ? !chips.length
					: b.dataset.qStatus ? state.status.includes(b.dataset.qStatus)
					: b.hasAttribute("data-q-fav") ? state.fav
					: b.dataset.qSmart ? state.smart === b.dataset.qSmart : false;
				b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", String(on));
			});
			page.querySelectorAll("[data-lib-status]").forEach(b => b.classList.toggle("is-dim", !!state.status.length && !state.status.includes(b.dataset.libStatus)));
			const sl = page.querySelector("[data-lib-sortlabel]");
			if (sl) sl.textContent = this._libSorts()[state.sort] + (state.group !== "none" ? ` · ${this._libGroups()[state.group]}` : "");
		};

		const clearAll = () => { Object.assign(state, { status: [], platform: [], genre: [], subgenre: [], ach: "", progress: "", rating: 0, fav: false, smart: "", q: "", qRules: [] }); page.querySelector("[data-lib-q]")?.classList.remove("has-rules"); const q = page.querySelector("[data-lib-q]"); if (q) q.value = ""; apply(); };

		const setView = v => {
			if (v === "list" && !rowsBuilt) { ensureRows(); state.view = v; apply(); }
			state.view = v;
			lib.dataset.view = v;
			rowsBox.hidden = v !== "list"; grid.hidden = v === "list";
			page.querySelectorAll(".sv-libviews [data-view]").forEach(b => { const on = b.dataset.view === v; b.classList.toggle("is-active", on); b.setAttribute("aria-checked", String(on)); });
			U._store("libraryView", v);
			paintAz();
			save();
		};

		// ---- índice A–Z
		let lastVis = null;
		const paintAz = vis => {
			if (vis) lastVis = vis;
			if (!az) return;
			const later_ = pendingVisible();
			const show = state.sort === "title" && (state.group === "none" || state.group === "letter") && ((lastVis?.length || 0) + later_.length) >= 12;
			az.hidden = !show;
			lib.classList.toggle("has-az", show);
			if (!show) return;
			const have = new Set([...(lastVis || []).map(c => c.dataset.gLetter), ...later_.map(x => this._libData(ctx, x.g).gLetter)]);
			az.querySelectorAll("[data-az]").forEach(b => { b.disabled = !have.has(b.dataset.az); });
		};
		const jump = l => {
			if (mounting) { finishMount(); apply(); }
			const box = state.view === "list" ? rowsBox : grid;
			const target = [...box.children].find(el => !el.hidden && (el.dataset.gLetter === l || (el.dataset.rowPath && gameCard(el.dataset.rowPath)?.dataset.gLetter === l)));
			if (target) { target.scrollIntoView({ block: "start", behavior: "auto" }); V?._haptic?.(6); }
		};
		const gameCard = p => cards.find(c => c.dataset.game === p);
		if (az) {
			let dragging = false;
			const at = e => { const el = document.elementFromPoint(e.clientX, e.clientY)?.closest?.("[data-az]"); if (el && !el.disabled && el.dataset.az !== az.dataset.cur) { az.dataset.cur = el.dataset.az; jump(el.dataset.az); } };
			az.addEventListener("pointerdown", e => { if (!e.target.closest("[data-az]")) return; dragging = true; az.dataset.cur = ""; az.setPointerCapture?.(e.pointerId); at(e); e.preventDefault(); });
			az.addEventListener("pointermove", e => { if (dragging) at(e); });
			const end = () => { dragging = false; az.dataset.cur = ""; };
			az.addEventListener("pointerup", end); az.addEventListener("pointercancel", end);
		}

		// ---- eventos da barra
		const q = page.querySelector("[data-lib-q]");
		// 3.47.0: a busca espera uma pausa curta na digitação (bibliotecas grandes)
		let qTimer = 0;
		const setQuery = v => { const r = this._libQueryParse(v, C); state.q = r.text; state.qRules = r.rules; q?.classList.toggle("has-rules", r.count > 0); };
		q?.addEventListener("input", () => { clearTimeout(qTimer); qTimer = setTimeout(() => { setQuery(q.value); apply(); }, cards.length + pending.length > 200 ? 160 : 60); });
		// atalho vindo da ficha (ex.: tocar na desenvolvedora): já abre filtrado
		if (q && window.__svLibQuery) { q.value = window.__svLibQuery; setQuery(q.value); window.__svLibQuery = ""; }
		if (window.__svLibFilter && typeof window.__svLibFilter === "object") {
			const f = window.__svLibFilter; window.__svLibFilter = null;
			Object.assign(state, { status: [], smart: "", platform: [], genre: [], subgenre: [], ach: "", progress: "", rating: 0, fav: false });
			for (const k of ["status", "platform", "genre", "subgenre"]) if (Array.isArray(f[k])) state[k] = f[k].map(String);
			for (const k of ["ach", "progress", "smart"]) if (typeof f[k] === "string") state[k] = f[k];
			if (typeof f.fav === "boolean") state.fav = f.fav;
			if (typeof f.rating === "number") state.rating = f.rating;
		}
		if (window.__svLibStatus) { Object.assign(state, { status: [window.__svLibStatus], smart: "", platform: [], genre: [], ach: "", progress: "", rating: 0, fav: false }); window.__svLibStatus = ""; }
		// ---- visões salvas: nome, menu (renomear, atualizar, excluir) e toque longo
		const viewsBox = page.querySelector("[data-q-views]");
		const paintViews = () => { if (viewsBox) viewsBox.innerHTML = this._libViewChips(ctx); paintControls(); };
		const suggestName = () => {
			const c = activeChips().map(x => x[2]);
			return (c.length ? c.slice(0, 2).join(" · ") : this._libSorts()[state.sort]).slice(0, 40);
		};
		const viewName = (title, value, onOk) => {
			const body = document.createElement("div");
			body.innerHTML = `<label class="sv-label" for="sv-libview-name">Nome</label><input id="sv-libview-name" class="sv-input" type="text" maxlength="40" value="${U.attr(value)}" autocomplete="off"><p class="sv-fineprint">Guarda os filtros, a ordem, os grupos e a visualização atuais. A busca por texto não entra.</p>`;
			const m = V.modal({ title, size: "sm", body, actions: `${U.btn("Cancelar", { kind: "ghost", attrs: "data-close" })}${U.btn("Salvar", { kind: "primary", attrs: "data-ok" })}` });
			const input = body.querySelector("input");
			const ok = () => { const v = input.value.trim(); if (!v) { input.focus(); return; } m.close(); onOk(v); };
			m.el.querySelector("[data-ok]").addEventListener("click", ok);
			input.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); ok(); } });
			setTimeout(() => { input.focus(); input.select(); }, 80);
		};
		const viewMenu = id => {
			const v = this._libSavedViews(ctx).find(x => x.id === id);
			if (!v) return paintViews();
			const body = document.createElement("div");
			body.className = "sv-look-pmenu";
			body.innerHTML = `<button type="button" class="sv-btn sv-btn--ghost" data-vm="rename">${U.icon("edit")}<span>Renomear</span></button>
				<button type="button" class="sv-btn sv-btn--ghost" data-vm="update">${U.icon("save")}<span>Atualizar com os filtros atuais</span></button>
				<button type="button" class="sv-btn sv-btn--ghost sv-look-danger" data-vm="del">${U.icon("trash")}<span>Excluir</span></button>`;
			const m = V.modal({ title: v.name, sub: "Visão salva da Biblioteca", size: "sm", body });
			body.addEventListener("click", async e => {
				const b = e.target.closest("[data-vm]");
				if (!b) return;
				m.close();
				const all = this._libSavedViews(ctx);
				if (b.dataset.vm === "rename") viewName("Renomear visão", v.name, name => { this._libStoreViews(ctx, all.map(x => x.id === v.id ? { ...x, name } : x)); paintViews(); });
				else if (b.dataset.vm === "update") { this._libStoreViews(ctx, all.map(x => x.id === v.id ? { ...x, s: this._libSnap(state) } : x)); paintViews(); V.toast(`"${v.name}" atualizada`, { tone: "ok" }); }
				else if (b.dataset.vm === "del") {
					if (!(await V.confirm({ title: `Excluir "${v.name}"?`, text: "Só o atalho é apagado; os jogos não mudam.", confirm: "Excluir", danger: true }))) return;
					this._libStoreViews(ctx, all.filter(x => x.id !== v.id)); paintViews();
				}
			});
		};
		if (viewsBox) {
			let timer = 0;
			// toque longo (celular) ou botão direito (computador); no Android o
			// toque longo também dispara "contextmenu": o menu abre uma vez só
			viewsBox.addEventListener("contextmenu", e => {
				const c = e.target.closest("[data-q-view]"); if (!c) return;
				e.preventDefault(); clearTimeout(timer);
				if (c.__svLong) return;
				c.__svLong = true; viewMenu(c.dataset.qView);
			});
			viewsBox.addEventListener("pointerdown", e => {
				const c = e.target.closest("[data-q-view]"); if (!c) return;
				c.__svLong = false; clearTimeout(timer);
				timer = setTimeout(() => { c.__svLong = true; ctx.V?._haptic?.(); viewMenu(c.dataset.qView); }, 550);
			});
			for (const ev of ["pointerup", "pointercancel", "pointerleave"]) viewsBox.addEventListener(ev, () => clearTimeout(timer));
		}

		page.addEventListener("click", e => {
			const t = e.target;
			const qs = t.closest("[data-q-status], [data-lib-status]");
			if (qs) { const k = qs.dataset.qStatus || qs.dataset.libStatus; state.status = state.status.length === 1 && state.status[0] === k ? [] : [k]; state.smart = ""; return apply(); }
			if (t.closest("[data-q-all]")) return clearAll();
			const qv = t.closest("[data-q-view]");
			if (qv) {
				if (qv.__svLong) { qv.__svLong = false; return; }
				const v = this._libSavedViews(ctx).find(x => x.id === qv.dataset.qView);
				if (!v) return paintViews();
				if (activeView()?.id === v.id) return clearAll();
				for (const k of this._libViewKeys()) if (k in v.s) state[k] = Array.isArray(v.s[k]) ? [...v.s[k]] : v.s[k];
				if (!Array.isArray(v.s.subgenre)) state.subgenre = [];
				if (!this._libSorts()[state.sort]) state.sort = "title";
				if (!this._libGroups()[state.group]) state.group = "none";
				if (!this._libViews()[state.view]) state.view = "grid";
				if (lib.dataset.view !== state.view) setView(state.view);
				return apply();
			}
			if (t.closest("[data-lib-saveview]")) return viewName("Salvar visão", suggestName(), name => {
				this._libStoreViews(ctx, [...this._libSavedViews(ctx), { id: `v${Date.now().toString(36)}`, name, s: this._libSnap(state) }]);
				paintViews(); paintControls(); V.toast(`"${name}" salva nos atalhos`, { tone: "ok" });
			});
			const ev = t.closest("[data-lib-editview]");
			if (ev) return viewMenu(ev.dataset.libEditview);
			if (t.closest("[data-q-fav]")) { state.fav = !state.fav; return apply(); }
			const sm = t.closest("[data-q-smart]");
			if (sm) { state.smart = state.smart === sm.dataset.qSmart ? "" : sm.dataset.qSmart; if (state.smart) state.status = []; return apply(); }
			const rm = t.closest("[data-rm]");
			if (rm) {
				const k = rm.dataset.rm, v = rm.dataset.v;
				if (Array.isArray(state[k])) state[k] = state[k].filter(x => x !== v);
				else state[k] = k === "rating" ? 0 : k === "fav" ? false : "";
				return apply();
			}
			if (t.closest("[data-lib-clear]")) return clearAll();
			if (t.closest("[data-lib-filters]")) return this._libFilterSheet(ctx, { list, state, apply, hideAchFilter, count: () => visibleCount, clearAll, genreLabel, progressLabels });
			if (t.closest("[data-lib-display]")) return this._libDisplaySheet(ctx, { state, apply, setView });
			const vb = t.closest(".sv-libviews [data-view]");
			if (vb) return setView(vb.dataset.view);
			if (t.closest("[data-lib-select]")) { finishMount(); return sel.toggle(); }
		});

		// ---- seleção em lote + menu rápido
		const sel = this._libSelection(root, ctx, { lib, page, gameOf, cards, rowOf, ensureAll: finishMount });
		this._libLongPress(lib, ctx, { gameOf, sel });

		setView(state.view);
		apply();
		ready = true;
		watch();
	}

	// painel de filtros: aplica na hora, mostra quantos sobram
	_libFilterSheet(ctx, { list, state, apply, hideAchFilter, count, clearAll, genreLabel, progressLabels }) {
		const { C, U, V } = ctx;
		const tally = fn => { const m = new Map(); for (const g of list) for (const k of [].concat(fn(g)).filter(Boolean)) m.set(k, (m.get(k) || 0) + 1); return m; };
		const sN = tally(g => g.status), pN = tally(g => g.platform), gN = tally(g => [...new Set([...g.genres].map(x => C.normalizeKey(x)))]), sgN = tally(g => [...new Set([...(g.subgenres || [])].map(x => C.normalizeKey(x)))]);
		const prN = tally(g => C.progressBucket(g)), pvN = tally(g => `p:${g.provider}`), syN = tally(g => `s:${g.sync}`);
		const tones = this._libTones();
		const chip = (k, v, label, n, extra = "") => `<button type="button" class="sv-fchip" data-k="${k}" data-v="${U.attr(v)}" ${extra}>${label}${n !== null ? `<span>${n}</span>` : ""}</button>`;
		const group = (title, inner) => inner ? `<section class="sv-fgroup"><h4>${U.esc(title)}</h4><div class="sv-fchips">${inner}</div></section>` : "";
		const statusChips = Object.keys(C.statusDefs).filter(k => sN.get(k)).map(k => chip("status", k, `<i style="background:${tones[k]}"></i>${U.esc(C.statusLabel(k))}`, sN.get(k))).join("");
		const platChips = [...pN].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k, n]) => chip("platform", k, U.esc(k), n)).join("");
		const genreChips = [...gN].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k, n]) => chip("genre", k, U.esc(genreLabel.get(k) || k), n)).join("");
		const subChips = [...sgN].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k, n]) => chip("subgenre", k, U.esc(genreLabel.get(`sub:${k}`) || k), n)).join("");
		const progChips = Object.keys(progressLabels).filter(k => prN.get(k)).map(k => chip("progress", k, U.esc(progressLabels[k]), prN.get(k))).join("");
		const achChips = hideAchFilter ? "" : [...pvN].filter(([k]) => C.providerDefs[k.slice(2)]).map(([k, n]) => chip("ach", k, U.esc(C.providerDefs[k.slice(2)].label), n)).join("") + [...syN].filter(([k]) => C.syncDefs[k.slice(2)]).map(([k, n]) => chip("ach", k, `${U.icon("refresh")}${U.esc(C.syncDefs[k.slice(2)].label)}`, n)).join("");
		const ratingChips = [[0, "Qualquer"], [3, "3+"], [4, "4+"], [4.5, "4,5+"]].map(([v, l]) => chip("rating", String(v), v ? `${U.icon("star")}${l}` : l, null)).join("");
		const body = document.createElement("div");
		body.className = "sv-host sv-libsheet";
		body.innerHTML = `${group("Status", statusChips)}
			${group("Favoritos", chip("fav", "1", `${U.icon("heart")}Só favoritos`, list.filter(g => g.favorite).length))}
			${pN.size > 1 ? group("Plataforma", platChips) : ""}
			${gN.size > 1 ? group("Gênero", genreChips) : ""}
			${sgN.size > 1 ? group("Subgênero", subChips) : ""}
			${group("Nota mínima", ratingChips)}
			${prN.size > 1 ? group("Progresso de conquistas", progChips) : ""}
			${achChips ? group("Conquistas: origem e sincronização", achChips) : ""}`;
		const m = V.modal({ title: "Filtros", sub: "Os resultados mudam na hora", size: "md", body, cls: "sv-libmodal",
			actions: `${U.btn("Limpar", { kind: "ghost", attrs: "data-f-clear" })}${U.btn("Ver jogos", { kind: "primary", attrs: "data-close data-f-done" })}` });
		const paint = () => {
			body.querySelectorAll(".sv-fchip").forEach(b => {
				const k = b.dataset.k, v = b.dataset.v;
				const on = Array.isArray(state[k]) ? state[k].includes(v) : k === "fav" ? state.fav : k === "rating" ? String(state.rating) === v : state[k] === v;
				b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", String(on));
			});
			const done = m.el.querySelector("[data-f-done] span");
			if (done) done.textContent = count() ? `Ver ${U.plural(count(), "jogo", "jogos")}` : "Nenhum jogo";
		};
		body.addEventListener("click", e => {
			const b = e.target.closest(".sv-fchip");
			if (!b) return;
			const k = b.dataset.k, v = b.dataset.v;
			if (Array.isArray(state[k])) state[k] = state[k].includes(v) ? state[k].filter(x => x !== v) : [...state[k], v];
			else if (k === "fav") state.fav = !state.fav;
			else if (k === "rating") state.rating = Number(v);
			else state[k] = state[k] === v ? "" : v;
			apply(); paint();
		});
		m.el.querySelector("[data-f-clear]")?.addEventListener("click", () => { clearAll(); paint(); });
		paint();
	}

	_libDisplaySheet(ctx, { state, apply, setView }) {
		const { U, V } = ctx;
		const body = document.createElement("div");
		body.className = "sv-host sv-libsheet";
		const opt = (k, v, label, icon = "") => `<button type="button" class="sv-fchip" data-k="${k}" data-v="${v}">${icon ? U.icon(icon) : ""}${U.esc(label)}</button>`;
		body.innerHTML = `<section class="sv-fgroup"><h4>Visualização</h4><div class="sv-fviews">${Object.entries(this._libViews()).map(([k, v]) => `<button type="button" class="sv-fview" data-k="view" data-v="${k}">${U.icon(v.icon)}<span>${U.esc(v.label)}</span></button>`).join("")}</div></section>
			<section class="sv-fgroup"><h4>Ordenar por</h4><div class="sv-fchips">${Object.entries(this._libSorts()).map(([k, l]) => opt("sort", k, l)).join("")}</div></section>
			<section class="sv-fgroup"><h4>Agrupar por</h4><div class="sv-fchips">${Object.entries(this._libGroups()).map(([k, l]) => opt("group", k, l)).join("")}</div></section>`;
		V.modal({ title: "Exibição", sub: "Ordem, grupos e visualização ficam lembrados", size: "md", body, cls: "sv-libmodal", actions: U.btn("Pronto", { kind: "primary", attrs: "data-close" }) });
		const paint = () => body.querySelectorAll("[data-k]").forEach(b => { const on = state[b.dataset.k] === b.dataset.v; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", String(on)); });
		body.addEventListener("click", e => {
			const b = e.target.closest("[data-k]");
			if (!b) return;
			if (b.dataset.k === "view") setView(b.dataset.v);
			else { state[b.dataset.k] = b.dataset.v; apply(); }
			paint();
		});
		paint();
	}

	// ---- escrita (status, favorito, plataforma, coleções)
	async _libWrite(ctx, paths, fn) {
		let ok = 0;
		for (const p of paths) {
			const f = app.vault.getAbstractFileByPath(p);
			if (!f) continue;
			try { await app.fileManager.processFrontMatter(f, fn); ok++; } catch (err) { ctx.V.toast(`Não foi possível salvar ${p.split("/").pop()}: ${err.message}`, { tone: "error" }); }
		}
		return ok;
	}
	async _libSetStatus(ctx, paths, status) {
		const today = ctx.C.today();
		const n = await this._libWrite(ctx, paths, fm => {
			fm.status = status;
			if (status === "Playing" && !fm.startDate) fm.startDate = today;
			if (status === "Completed" && !fm.completionDate) fm.completionDate = today;
		});
		if (n) ctx.V.toast(n === 1 ? `Status: ${ctx.C.statusLabel(status)}` : `${n} jogos agora em ${ctx.C.statusLabel(status)}`, { tone: "ok" });
	}
	async _libSetFav(ctx, paths, on) {
		const n = await this._libWrite(ctx, paths, fm => { fm.favorite = on; });
		if (n) ctx.V.toast(on ? (n === 1 ? "Adicionado aos favoritos" : `${n} jogos favoritados`) : (n === 1 ? "Removido dos favoritos" : `${n} jogos fora dos favoritos`), { icon: "heart", tone: on ? "ok" : "" });
	}
	async _libSetPlatform(ctx, paths, platform) {
		const n = await this._libWrite(ctx, paths, fm => { fm.platform = platform; });
		if (n) ctx.V.toast(n === 1 ? `Plataforma: ${platform}` : `${n} jogos movidos para ${platform}`, { tone: "ok" });
	}
	// coleção: adiciona os que faltam ou tira todos os escolhidos
	async _libCollection(ctx, colPath, paths, add) {
		const { C } = ctx;
		const f = app.vault.getAbstractFileByPath(colPath);
		if (!f) return;
		const base = p => p.replace(/\.md$/, "");
		const same = (entry, p) => { const lp = C.linkPath(entry).replace(/\.md$/, ""); return lp === base(p) || lp.split("/").pop().toLowerCase() === base(p).split("/").pop().toLowerCase(); };
		await app.fileManager.processFrontMatter(f, fm => {
			const cur = Array.isArray(fm.games) ? fm.games : fm.games ? [fm.games] : [];
			fm.games = add ? [...cur, ...paths.filter(p => !cur.some(e => same(e, p))).map(p => `[[${base(p)}]]`)] : cur.filter(e => !paths.some(p => same(e, p)));
			fm.updated = C.today();
		});
		const col = ctx.model.collections.find(c => c.path === colPath);
		ctx.V.toast(`${paths.length === 1 ? "Jogo" : `${paths.length} jogos`} ${add ? "em" : "fora de"} “${col?.title || base(colPath).split("/").pop()}”`, { tone: "ok", icon: "layers" });
	}

	// ---- menu rápido (toque longo / botão direito)
	_libLongPress(lib, ctx, { gameOf, sel }) {
		let timer = null, start = null, fired = 0;
		const target = e => e.target.closest?.(".sv-card[data-game], .sv-librow[data-game]");
		const open = el => { const g = gameOf.get(el.dataset.game); if (!g || sel.on()) return; fired = Date.now(); ctx.V?._haptic?.(18); this._libQuickMenu(ctx, g); };
		lib.addEventListener("pointerdown", e => {
			if (e.pointerType === "mouse") return;
			const el = target(e); if (!el) return;
			start = { x: e.clientX, y: e.clientY };
			clearTimeout(timer);
			timer = setTimeout(() => { timer = null; open(el); }, 480);
		}, { passive: true });
		const cancel = () => { clearTimeout(timer); timer = null; };
		lib.addEventListener("pointermove", e => { if (timer && start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) cancel(); }, { passive: true });
		lib.addEventListener("pointerup", cancel, { passive: true });
		lib.addEventListener("pointercancel", cancel, { passive: true });
		lib.addEventListener("contextmenu", e => {
			const el = target(e); if (!el) return;
			e.preventDefault();
			if (Date.now() - fired < 800) return; // o toque longo já abriu
			cancel(); open(el);
		});
		// o toque que abriu o menu não abre a ficha
		lib.addEventListener("click", e => { if (Date.now() - fired < 700 && target(e)) { e.preventDefault(); e.stopPropagation(); } }, true);
		// 3.62.2: no Android, segurar um link inicia um "arrastar" do HTML e a
		// sombra do arraste (texto do link + endereço da nota) seguia o dedo
		// por cima do menu. Os cards não são arrastáveis
		lib.addEventListener("dragstart", e => { if (target(e)) e.preventDefault(); });
	}

	_libQuickMenu(ctx, g) {
		const { C, U, V, model } = ctx;
		const tones = this._libTones();
		const cols = model.collections;
		const inCol = new Set((model.collectionsByGame.get(g.path) || []).map(c => c.path));
		const body = document.createElement("div");
		body.className = "sv-host sv-libsheet sv-libquickmenu";
		body.innerHTML = `<div class="sv-qm-head">${U.cover(g)}<div><strong>${U.esc(g.title)}</strong><span>${U.esc(g.platform)}${g.playtime.hours ? ` · ${U.fmtHours(g.playtime.hours)}` : ""}</span></div></div>
			<section class="sv-fgroup"><h4>Status</h4><div class="sv-fchips">${Object.keys(C.statusDefs).map(k => `<button type="button" class="sv-fchip${g.status === k ? " is-active" : ""}" data-qm-status="${k}"><i style="background:${tones[k]}"></i>${U.esc(C.statusLabel(k))}</button>`).join("")}</div></section>
			<div class="sv-qm-actions">
				<button type="button" class="sv-qm-act${g.favorite ? " is-on" : ""}" data-qm-fav>${U.icon("heart")}<span>${g.favorite ? "Desfavoritar" : "Favoritar"}</span></button>
				<button type="button" class="sv-qm-act" data-qm-share>${U.icon("share")}<span>Compartilhar</span></button>
				<button type="button" class="sv-qm-act" data-qm-open>${U.icon("external")}<span>Abrir ficha</span></button>
			</div>
			${cols.length ? `<section class="sv-fgroup"><h4>Coleções</h4><div class="sv-qm-cols">${cols.map(c => { const id = ctx.B?.collectionIdent ? ctx.B.collectionIdent(ctx, c) : { color: "#4f8df7", icon: "layers" }; return `<button type="button" class="sv-qm-col${inCol.has(c.path) ? " is-on" : ""}" data-qm-col="${U.attr(c.path)}" style="--sv-id:${U.attr(id.color)}" aria-pressed="${inCol.has(c.path)}"><span class="sv-qm-colicon">${U.icon(id.icon)}</span><span>${U.esc(c.title)}</span><span class="sv-qm-check">${U.icon("check")}</span></button>`; }).join("")}</div></section>` : ""}`;
		const m = V.modal({ title: "Ações rápidas", size: "sm", body, cls: "sv-libmodal" });
		body.addEventListener("click", async e => {
			const t = e.target;
			const s = t.closest("[data-qm-status]");
			if (s) { m.close(); if (s.dataset.qmStatus !== g.status) await this._libSetStatus(ctx, [g.path], s.dataset.qmStatus); return; }
			if (t.closest("[data-qm-fav]")) { m.close(); return this._libSetFav(ctx, [g.path], !g.favorite); }
			if (t.closest("[data-qm-share]")) { m.close(); return ctx.SH ? ctx.SH.open(ctx, "game", g.path) : V.toast("Módulo de cartão ausente (SteamVaultShare.js)", { tone: "warn" }); }
			if (t.closest("[data-qm-open]")) { m.close(); return V.open(g.path, ctx); }
			const c = t.closest("[data-qm-col]");
			if (c) {
				const on = !c.classList.contains("is-on");
				c.classList.toggle("is-on", on); c.setAttribute("aria-pressed", String(on));
				await this._libCollection(ctx, c.dataset.qmCol, [g.path], on);
			}
		});
	}

	// ---- seleção em lote
	_libSelection(root, ctx, { lib, page, gameOf, ensureAll = () => {} }) {
		const { U, V, C, model } = ctx;
		const picked = new Set();
		let on = false, bar = null;
		const btn = page.querySelector("[data-lib-select]");
		const paint = () => {
			lib.querySelectorAll("[data-game]").forEach(el => el.classList.toggle("is-picked", picked.has(el.dataset.game)));
			if (bar) {
				bar.querySelector("[data-bulk-n]").innerHTML = picked.size ? `<b>${picked.size}</b><span> ${picked.size === 1 ? "selecionado" : "selecionados"}</span>` : "Toque nos jogos";
				bar.querySelectorAll("[data-bulk]").forEach(b => { b.disabled = !picked.size; });
			}
		};
		const close = () => {
			on = false; picked.clear();
			lib.classList.remove("is-selecting"); btn?.classList.remove("is-active");
			document.body.classList.remove("sv-has-bulk");
			bar?.remove(); bar = null; paint();
		};
		const openBar = () => {
			on = true;
			lib.classList.add("is-selecting"); btn?.classList.add("is-active");
			document.querySelectorAll(".sv-libbulk").forEach(x => x.remove());
			bar = document.createElement("div");
			bar.className = `sv-libbulk steamvault${document.body.classList.contains("theme-light") ? " is-light" : ""}`;
			bar.setAttribute("role", "toolbar"); bar.setAttribute("aria-label", "Ações em lote");
			bar.innerHTML = `<button type="button" class="sv-libbulk-x" data-bulk-close aria-label="Sair da seleção">${U.icon("x")}</button>
				<span class="sv-libbulk-n" data-bulk-n></span>
				<button type="button" class="sv-libbulk-all" data-bulk-all>Todos</button>
				<div class="sv-libbulk-acts">
					<button type="button" data-bulk="status" title="Mudar status">${U.icon("flag")}<span>Status</span></button>
					<button type="button" data-bulk="fav" title="Favoritar">${U.icon("heart")}<span>Favoritar</span></button>
					<button type="button" data-bulk="col" title="Adicionar a uma coleção">${U.icon("layers")}<span>Coleção</span></button>
					<button type="button" data-bulk="plat" title="Mudar plataforma">${U.icon("monitor")}<span>Plataforma</span></button>
				</div>`;
			document.body.appendChild(bar);
			document.body.classList.add("sv-has-bulk");
			requestAnimationFrame(() => bar?.classList.add("is-in"));
			bar.addEventListener("click", e => {
				const t = e.target;
				if (t.closest("[data-bulk-close]")) return close();
				if (t.closest("[data-bulk-all]")) { ensureAll(); lib.querySelectorAll(".sv-grid > .sv-card:not([hidden])").forEach(c => picked.add(c.dataset.game)); return paint(); }
				const a = t.closest("[data-bulk]")?.dataset.bulk;
				if (a && picked.size) bulk(a);
			});
			// some sozinha quando a tela muda
			const watch = setInterval(() => { if (!lib.isConnected) { clearInterval(watch); if (bar && bar.isConnected) { bar.remove(); document.body.classList.remove("sv-has-bulk"); } } }, 800);
			paint();
		};
		const bulk = async a => {
			const paths = [...picked];
			const pick = (title, items) => new Promise(res => {
				const body = document.createElement("div");
				body.className = "sv-host sv-libsheet";
				body.innerHTML = `<div class="sv-fchips sv-fchips--col">${items.map(([v, label]) => `<button type="button" class="sv-fchip" data-pick="${U.attr(v)}">${label}</button>`).join("")}</div>`;
				let done = false;
				const m = V.modal({ title, sub: U.plural(paths.length, "jogo selecionado", "jogos selecionados"), size: "sm", body, cls: "sv-libmodal", onClose: () => { if (!done) res(null); } });
				body.addEventListener("click", e => { const b = e.target.closest("[data-pick]"); if (!b) return; done = true; res(b.dataset.pick); m.close(); });
			});
			const tones = this._libTones();
			if (a === "status") {
				const v = await pick("Mudar status", Object.keys(C.statusDefs).map(k => [k, `<i style="background:${tones[k]}"></i>${U.esc(C.statusLabel(k))}`]));
				if (v) { close(); await this._libSetStatus(ctx, paths, v); }
			} else if (a === "fav") {
				const v = await pick("Favoritos", [["1", `${U.icon("heart")}Favoritar todos`], ["0", "Tirar dos favoritos"]]);
				if (v) { close(); await this._libSetFav(ctx, paths, v === "1"); }
			} else if (a === "col") {
				if (!model.collections.length) return V.toast("Crie uma coleção primeiro", { tone: "warn" });
				const v = await pick("Adicionar a uma coleção", model.collections.map(c => [c.path, `${U.icon((ctx.B?.collectionIdent?.(ctx, c) || {}).icon || "layers")}${U.esc(c.title)}`]));
				if (v) { close(); await this._libCollection(ctx, v, paths, true); }
			} else if (a === "plat") {
				const names = [...new Set([...model.platforms.map(p => p.title), ...model.games.map(g => g.platform)].filter(x => x && x !== "Outros"))].sort((x, y) => x.localeCompare(y));
				const v = await pick("Mudar plataforma", names.map(n => [n, U.esc(n)]));
				if (v) { close(); await this._libSetPlatform(ctx, paths, v); }
			}
		};
		// no modo seleção, tocar no jogo marca em vez de abrir
		lib.addEventListener("click", e => {
			if (!on) return;
			const el = e.target.closest("[data-game]");
			if (!el || !lib.contains(el)) return;
			e.preventDefault(); e.stopPropagation();
			const p = el.dataset.game;
			if (picked.has(p)) picked.delete(p); else picked.add(p);
			V?._haptic?.(6);
			paint();
		}, true);
		void gameOf;
		return { on: () => on, toggle: () => (on ? close() : openBar()), close };
	}

	// =========================================================== FICHA
	game(ctx) {
		const { C, U, model, current } = ctx;
		const g = model.gamesByPath.get(current.file.path);
		if (!g) return { active: "library", html: U.empty({ icon: "alert", title: "Jogo não encontrado no índice", text: "Verifique se o frontmatter tem type: game." }) };
		const a = g.ach;
		// 3.29.0: mais de 150 conquistas → o armário é montado ao abrir a aba
		const lazyAch = g.achievements.length > 150;
		const tabs = [
			{ id: "overview", label: "Visão geral" },
			g.provider !== "none" ? { id: "achievements", label: "Conquistas", count: a.state === "known" ? a.total : null } : null,
			{ id: "media", label: "Mídia", count: g.screenshots.length + g.soundtrack.length || null },
			{ id: "dlc", label: "DLC", count: g.dlc.length || null },
			{ id: "sessions", label: "Sessões", count: (g.sessions.length + g.playthroughs.length) || null },
			{ id: "notes", label: "Notas", count: g.notes.length || null }
		].filter(Boolean);
		// 3.58.0: ordem das abas escolhida em Personalização › Fichas
		const tabOrder = U.layout().game.tabOrder;
		tabs.sort((x, y) => tabOrder.indexOf(x.id) - tabOrder.indexOf(y.id));
		const first = tabs[0].id;

		const html = `<div class="sv-page sv-page--game" data-game="${U.attr(g.path)}">
			${this.gameHero(ctx, g)}
			<div class="sv-gamenav">${U.tabs(tabs, first, { cls: "sv-tabs--game" })}</div>
			<div class="sv-pad sv-gamebody">
				<div class="sv-panel" data-panel="overview"${first === "overview" ? "" : " hidden"}>${this._overview(ctx, g)}</div>
				${g.provider !== "none" ? `<div class="sv-panel" data-panel="achievements"${first === "achievements" ? "" : " hidden"}>${lazyAch ? `<div class="sv-achlazy" data-ach-lazy>${U.icon("trophy")}<span>Carregando ${U.fmtNum(g.achievements.length)} conquistas…</span></div>` : this.achievementCabinet(ctx, g)}</div>` : ""}
				<div class="sv-panel" data-panel="media"${first === "media" ? "" : " hidden"}>${this._media(ctx, g)}</div>
				<div class="sv-panel" data-panel="dlc"${first === "dlc" ? "" : " hidden"}>${this._dlc(ctx, g)}</div>
				<div class="sv-panel" data-panel="sessions"${first === "sessions" ? "" : " hidden"}>${this._sessions(ctx, g)}</div>
				<div class="sv-panel" data-panel="notes"${first === "notes" ? "" : " hidden"}>${this._notes(ctx, g)}</div>
			</div>
		</div>`;
		return {
			active: "library", html, wire: root => {
				if (window.__svAchBulkNext === g.path && ctx.A?.isXbox?.(g) && ctx.AM) { window.__svAchBulkNext = null; setTimeout(() => ctx.AM.open(ctx, g.path, { tab: "bulk" }), 450); }
				const show = id => {
					// listas enormes: o armário só é montado quando a aba abre
					const lazy = id === "achievements" && root.querySelector("[data-ach-lazy]");
					if (lazy) {
						const panel = lazy.parentElement;
						panel.innerHTML = this.achievementCabinet(ctx, g);
						this._wireCabinet(panel, ctx);
						ctx.V._wireImages(panel);
					}
					root.querySelectorAll(".sv-tabs--game .sv-tab").forEach(t => { const on = t.dataset.tab === id; t.classList.toggle("is-active", on); t.setAttribute("aria-selected", on); });
					root.querySelectorAll(".sv-panel").forEach(p => { p.hidden = p.dataset.panel !== id; });
					ctx.V._heatmapsToEnd(root.querySelector(`.sv-panel[data-panel="${id}"]`));
					window.__svGameTab = { path: g.path, id };
				};
				root.querySelectorAll(".sv-tabs--game .sv-tab").forEach(t => t.addEventListener("click", () => {
					show(t.dataset.tab);
					root.querySelector(".sv-gamenav")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
				}));
				// delegado: vale também para itens que entram depois ("Mostrar mais")
				root.addEventListener("click", e => {
					const o = e.target.closest("[data-diary-order]");
					if (!o || o.classList.contains("is-active")) return;
					ctx.U._store("diaryOrder", o.dataset.diaryOrder);
					const panel = root.querySelector('.sv-panel[data-panel="sessions"]');
					if (!panel) return;
					panel.innerHTML = this._sessions(ctx, g);
					panel.classList.add("is-reordered");
					setTimeout(() => panel.classList.remove("is-reordered"), 900);
					ctx.V._wireImages?.(panel);
					ctx.V._heatmapsToEnd?.(panel);
				});
				root.addEventListener("click", e => { const b = e.target.closest("[data-goto-tab]"); if (!b || !root.contains(b)) return; show(b.dataset.gotoTab); root.querySelector(".sv-gamenav")?.scrollIntoView({ block: "nearest", behavior: "smooth" }); });
				// volta para a aba em que estava depois de um re-render (ex.: ao salvar)
				if (window.__svGameTab?.path === g.path) show(window.__svGameTab.id);
				else if (first !== "overview") show(first);
				this._wireCabinet(root, ctx);
				this._wireOverview(root, ctx, g);
				this._wireDlc(root, g);
				// ícones da aba Conquistas carregam em segundo plano depois que a
				// ficha assenta: ao abrir a aba eles já estão prontos, em vez de
				// carregarem todos de uma vez enquanto a página rola
				const achPanel = root.querySelector('.sv-panel[data-panel="achievements"]');
				if (achPanel) setTimeout(() => (window.requestIdleCallback || (f => f()))(() => {
					if (!achPanel.isConnected) return;
					achPanel.querySelectorAll('img[loading="lazy"]').forEach(img => { img.decoding = "async"; img.loading = "eager"; });
				}, { timeout: 3000 }), 1800);
				this._wireSoundtrack(root, ctx, g);
				this._wireLightbox(root, ctx);
			}
		};
	}

	_overview(ctx, g) {
		const { C, U, model } = ctx;
		const a = g.ach;
		const rarest = g.achievements.filter(x => x.unlocked && x.rarity !== null).sort((x, y) => x.rarity - y.rarity).slice(0, 3);
		const ratings = Object.entries({ Gameplay: g.ratings.gameplay, História: g.ratings.story, Gráficos: g.ratings.graphics, "Trilha sonora": g.ratings.soundtrack, Diversão: g.ratings.fun }).filter(([, v]) => v);
		const dates = [["Adicionado", g.dateAdded], ["Começou", g.startDate], ["Zerou", g.completionDate], ["Última vez", g.lastPlayed.date]].filter(([, v]) => v);

		const collections = model.collectionsByGame.get(g.path) || [];
		const franchise = g.franchise ? model.games.filter(x => x !== g && x.franchise === g.franchise).sort((x, y) => (x.franchiseOrder ?? 99) - (y.franchiseOrder ?? 99)) : [];
		const genreSet = new Set([...g.genres, ...g.subgenres].map(x => C.normalizeKey(x)));
		const inFranchise = new Set(franchise);
		const similar = model.games.filter(x => x !== g && !inFranchise.has(x) && [...x.genres, ...x.subgenres].some(y => genreSet.has(C.normalizeKey(y)))).slice(0, 10);
		const d = this._ovData(ctx, g);

		return `<div class="sv-overview sv-overview--rich">
			<div class="sv-overview-main">
				${this._ovContinue(ctx, g, d)}
				${g.summary ? `<p class="sv-synopsis">${U.esc(g.summary)}</p>` : U.empty({ icon: "notebook", title: "Sem sinopse", text: "Adicione uma sinopse em Editar detalhes.", compact: true, action: U.btn("Editar detalhes", { icon: "edit", action: "manage", attrs: `data-section="details" data-path="${U.attr(g.path)}"` }) })}
				${this._ovReview(ctx, g)}
				${this._ovFacts(ctx, g)}
				${g.labels.length ? `<div class="sv-labels">${g.labels.map(l => `<button type="button" class="sv-ovchip is-search" data-ov-search="${U.attr(`tag:"${String(l).replace(/"/g, "")}"`)}" title="Ver na Biblioteca">${U.icon("tag")}${U.esc(l)}</button>`).join("")}</div>` : ""}
				${this._ovTimeline(ctx, g, d)}
				${this._ovRhythm(ctx, g, d)}
				${this._ovMedia(ctx, g)}
			</div>
			<aside class="sv-overview-side">
				<section class="sv-surface sv-progresspanel">
					<h3>Progresso</h3>
					${U.figures([
						{ label: "Tempo de jogo", value: U.fmtHours(g.playtime.hours), sub: g.playtime.origin === "steam" ? "dado da Steam" : g.playtime.origin === "gog" ? "dado da GOG" : g.estimatedHours ? `estimativa ${U.fmtHours(g.estimatedHours)}` : "" },
						{ label: "Sessões", value: U.fmtNum(g.sessions.length) },
						a.state === "known" && a.total ? { label: "Conquistas", value: `${a.unlocked}/${a.total}`, sub: a.origin === "steam" ? "dado da Steam" : "" } : null,
						a.state === "pct" ? { label: "Conquistas", value: U.fmtPct(a.pctRound), sub: "dado da GOG", tone: a.perfect ? "gold" : "" } : null,
						a.state === "known" && a.total ? { label: "Conclusão", value: U.fmtPct(a.pctRound), tone: a.perfect ? "gold" : "" } : null
					])}
					${a.state === "known" && a.total ? U.progressBar(a.pct, { tone: a.perfect ? "gold" : "" }) : ""}
					${this._ovForecast(ctx, g, d)}
					${rarest.length ? `<div class="sv-rarest"><span>Conquistas mais raras</span>${rarest.map(x => `<button type="button" class="sv-rarest-item" data-goto-tab="achievements" title="${U.attr(x.name)} — ${U.fmtPct(x.rarity)}">${x.iconSrc ? `<img src="${U.attr(x.iconSrc)}" alt="">` : U.icon("trophy")}<small>${U.fmtPct(x.rarity)}</small></button>`).join("")}</div>` : ""}
					${dates.length ? `<ol class="sv-dates">${dates.map(([k, v]) => `<li><span>${U.esc(k)}</span><time>${U.esc(U.fmtDate(v))}</time></li>`).join("")}</ol>` : ""}
					${g.provider === "steam" && C.autoSync(g) ? `<div class="sv-steamline">${g.steam.lastSync ? U.syncBadge(g.steam.status === "ok" ? "ok" : "warn", `Steam ${U.relDate(g.steam.lastSync.slice(0, 10))}`, g.steam.error) : U.syncBadge("off", "Nunca sincronizado")}${U.btn("Sincronizar", { icon: "refresh", kind: "ghost", size: "sm", action: "steam-sync-game", attrs: `data-path="${U.attr(g.path)}"` })}</div>` : ""}
				</section>
				${this._ovNext(ctx, g)}
				${this._ovRank(ctx, g, d)}
				${this._ovPinned(ctx, g)}
				${this._ovRuns(ctx, g, d)}
				${ratings.length ? `<section class="sv-surface"><h3>Avaliação</h3>${U.bars(ratings.map(([k, v]) => ({ label: k, value: v, display: U.fmtNum(v, 1) })), { max: 5 })}</section>` : ""}
				${this._ovPrice(ctx, g)}
				${ctx.RP ? ctx.RP.gamePanel(ctx, g) : ""}
			</aside>
		</div>
		${collections.length ? `<section class="sv-block">${U.sectionHead("Nas suas coleções", { count: collections.length })}<div class="sv-chiplinks">${collections.map(c => { const id = ctx.B?.collectionIdent ? ctx.B.collectionIdent(ctx, c) : { color: "#4f8df7", icon: "layers" }; return `<a class="sv-chiplink sv-chiplink--id" ${U.openAttrs(c.path)} style="--sv-id:${U.attr(id.color)}">${U.icon(id.icon)}${U.esc(c.title)}<span>${c.games.length}</span></a>`; }).join("")}</div></section>` : ""}
		${U.shelf(`Mais de ${g.franchise}`, franchise.slice(0, 24).map(x => U.gameCard(x, C)), { count: franchise.length, action: franchise.length > 24 ? `<a class="sv-link" role="button" tabindex="0" data-action="open-category" data-kind="franchise" data-name="${U.attr(g.franchise)}">Ver todos</a>` : "" })}
		${U.shelf("Parecidos com este", similar.map(x => U.gameCard(x, C)))}`;
	}

	// ---- dados derivados (sessões, zeradas, conquistas com data)
	_ovData(ctx, g) {
		const { C } = ctx;
		const today = C.today();
		const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
		const sessions = g.sessions.map((s, i) => ({ i, date: C.iso(s.date), hours: num(s.hours), note: String(s.note || "").trim(), mood: String(s.mood || ""), progress: s.progress === "" || s.progress === undefined ? null : num(s.progress) }))
			.filter(s => s.date).sort((x, y) => x.date.localeCompare(y.date));
		let runs = g.playthroughs.map(r => ({ start: C.iso(r.start), end: C.iso(r.end), difficulty: String(r.difficulty || ""), platform: String(r.platform || ""), note: String(r.note || "") })).filter(r => r.end || r.start);
		if (!runs.length && (g.completionDate || (g.startDate && g.status === "Completed"))) runs = [{ start: g.startDate, end: g.completionDate, difficulty: "", platform: g.platform, note: "" }];
		runs.sort((x, y) => (x.end || x.start || "").localeCompare(y.end || y.start || ""));
		const unlockedDates = g.achievements.filter(x => x.unlocked && x.unlockedDate).map(x => ({ date: x.unlockedDate, name: x.name })).sort((x, y) => x.date.localeCompare(y.date));
		const perfectDate = g.ach.perfect && unlockedDates.length ? unlockedDates[unlockedDates.length - 1].date : "";
		const start = g.startDate || sessions[0]?.date || "";
		return { today, sessions, runs, unlockedDates, perfectDate, start };
	}

	_ovSpan(days) {
		if (days <= 0) return "no mesmo dia";
		if (days < 60) return `${days} ${days === 1 ? "dia" : "dias"}`;
		const m = Math.round(days / 30.4);
		if (m < 24) return `${m} meses`;
		return `${Math.round(days / 365)} anos`;
	}

	// ---- continuar jogando
	_ovContinue(ctx, g, d) {
		const { U } = ctx;
		if (g.status !== "Playing") return "";
		const last = d.sessions[d.sessions.length - 1];
		// a última anotação que existir (a sessão mais recente pode não ter)
		const noted = [...d.sessions].reverse().find(x => x.note);
		const lastDate = last?.date || g.lastPlayed.date;
		return `<section class="sv-ovcont" style="--sv-hue:${g.hue}">
			<div class="sv-ovcont-icon">${U.icon("play")}</div>
			<div class="sv-ovcont-body">
				<span class="sv-ovcont-kicker">Continuar jogando${lastDate ? ` · última vez ${U.esc(U.relDate(lastDate))}` : ""}</span>
				${noted ? `<p class="sv-ovcont-note">“${U.esc(noted.note)}”</p>` : `<p class="sv-ovcont-note is-muted">${last ? "As últimas sessões não têm anotação. Anote onde parou para retomar depois." : "Nenhuma sessão registrada ainda. Anote onde parou para retomar depois."}</p>`}
				<span class="sv-ovcont-meta">${last?.hours ? `<span>${U.icon("clock")}${U.fmtHours(last.hours)} na última sessão</span>` : ""}${last?.mood ? `<span>${U.esc(last.mood)}</span>` : ""}${last?.progress !== null && last?.progress !== undefined ? `<span>${U.icon("target")}${last.progress}% da história</span>` : ""}</span>
			</div>
			${U.btn("Registrar sessão", { icon: "plus", kind: "primary", size: "sm", action: "manage", attrs: `data-section="sessions" data-path="${U.attr(g.path)}"` })}
		</section>`;
	}

	// ---- minha análise
	_ovReview(ctx, g) {
		const { U } = ctx;
		const has = g.review || g.pros.length || g.cons.length || g.recommend !== null;
		const edit = `<button type="button" class="sv-ovlink" data-ov-review>${U.icon(has ? "edit" : "plus")}<span>${has ? "Editar" : "Escrever minha análise"}</span></button>`;
		if (!has) {
			const played = g.playtime.hours >= 1 || ["Completed", "Dropped", "Playing", "Paused"].includes(g.status);
			return played ? `<section class="sv-ovreview is-empty">${U.icon("star")}<div><b>Minha análise</b><span>O que você achou? Escreva uma opinião, prós e contras.</span></div>${edit}</section>` : "";
		}
		const rec = g.recommend === true ? `<span class="sv-ovrec is-yes">${U.icon("check")}Recomendo</span>` : g.recommend === false ? `<span class="sv-ovrec is-no">${U.icon("x")}Não recomendo</span>` : "";
		return `<section class="sv-ovreview">
			<header><h3>Minha análise</h3>${rec}${edit}</header>
			${g.review ? `<blockquote>${U.esc(g.review)}</blockquote>` : ""}
			${g.pros.length || g.cons.length ? `<div class="sv-ovproscons">
				${g.pros.length ? `<ul class="is-pro">${g.pros.map(x => `<li>${U.icon("plus")}${U.esc(x)}</li>`).join("")}</ul>` : ""}
				${g.cons.length ? `<ul class="is-con">${g.cons.map(x => `<li><i></i>${U.esc(x)}</li>`).join("")}</ul>` : ""}
			</div>` : ""}
		</section>`;
	}

	// ---- ficha técnica clicável
	_ovFacts(ctx, g) {
		const { U, C, model } = ctx;
		const B = ctx.B;
		const find = (list, name) => (list || []).find(p => C.normalizeKey(p.title) === C.normalizeKey(name)) || null;
		const idChip = (kind, name, list, fallbackIcon) => {
			const page = find(list, name);
			const id = B?.ident ? B.ident(ctx, kind, name, page) : { color: "#8fa3b8", icon: fallbackIcon };
			return `<a class="sv-ovchip" ${U.catAttrs(kind, name, page)} style="--sv-id:${U.attr(id.color)}">${U.icon(id.icon || fallbackIcon)}${U.esc(name)}</a>`;
		};
		const search = (name, icon) => `<button type="button" class="sv-ovchip is-search" data-ov-search="${U.attr(name)}" title="Ver na Biblioteca">${U.icon(icon)}${U.esc(name)}</button>`;
		const rows = [
			g.genres.length && ["Gênero", "masks", g.genres.map(x => idChip("genre", x, model.genres, "masks")).join("")],
			g.subgenres.length && ["Subgênero", "tag", g.subgenres.map(x => B?.subIdent ? (() => { const page = B.subPage(ctx, x); const id = B.subIdent(ctx, x, page); return `<a class="sv-ovchip" ${U.catAttrs("subgenre", x, page)} style="--sv-id:${U.attr(id.color)}">${U.icon(id.icon || "tag")}${U.esc(x)}</a>`; })() : idChip("subgenre", x, model.subgenres, "tag")).join("")],
			g.platform && ["Plataforma", "monitor", idChip("platform", g.platform, model.platforms, "monitor")],
			g.franchise && ["Franquia", "film", idChip("franchise", g.franchise, model.franchises, "film")],
			g.developer && ["Desenvolvedora", "puzzle", search(g.developer, "puzzle")],
			g.publisher && g.publisher !== g.developer && ["Publicadora", "flag", search(g.publisher, "flag")],
			g.releaseYear && ["Lançamento", "calendar", `<span class="sv-ovfact-val">${g.releaseYear}</span>`],
			g.ownership && ["Formato", "gamepad", `<span class="sv-ovfact-val">${U.esc(g.ownership)}</span>`],
			g.difficulty && ["Dificuldade", "bolt", `<span class="sv-ovfact-val">${U.esc(g.difficulty)}</span>`],
			g.steamAppId && ["Steam AppID", "external", `<a class="sv-ovfact-val sv-link" href="https://store.steampowered.com/app/${U.attr(g.steamAppId)}/">${U.esc(g.steamAppId)}</a>`]
		].filter(Boolean);
		if (!rows.length) return "";
		return `<dl class="sv-ovfacts">${rows.map(([k, icon, v]) => `<div class="sv-ovfact"><dt>${U.icon(icon)}${U.esc(k)}</dt><dd>${v}</dd></div>`).join("")}</dl>`;
	}

	// ---- linha do tempo pessoal
	_ovTimeline(ctx, g, d) {
		const { U, C } = ctx;
		const ev = [];
		const add = (date, icon, title, sub = "", tone = "") => { if (date) ev.push({ date, icon, title, sub, tone }); };
		if (g.releaseDate) add(g.releaseDate, "calendar", g.releaseDate > C.today() ? "Data de lançamento" : "Lançamento", g.releaseDate > C.today() ? U.relDate(g.releaseDate) : "");
		add(g.dateAdded, "plus", "Entrou no vault");
		if (g.startDate) add(g.startDate, "play", "Começou a jogar", "", "blue");
		else if (d.sessions[0]) add(d.sessions[0].date, "play", "Primeira sessão", d.sessions[0].note, "blue");
		[...d.sessions].filter(s => s.hours >= 2).sort((x, y) => y.hours - x.hours).slice(0, 2).forEach(s => add(s.date, "flame", `Sessão de ${U.fmtHours(s.hours)}`, s.note, "amber"));
		if (d.unlockedDates[0]) add(d.unlockedDates[0].date, "trophy", "Primeira conquista", d.unlockedDates[0].name ? `“${d.unlockedDates[0].name}”` : "");
		d.runs.filter(r => r.end).forEach((r, i) => add(r.end, "flag", i ? `Zerou pela ${i + 1}ª vez` : "Zerou", [r.difficulty, r.start ? `em ${this._ovSpan(C.daysBetween(r.start, r.end))}` : ""].filter(Boolean).join(" · "), "green"));
		if (d.perfectDate) add(d.perfectDate, "gem", "100% das conquistas", d.start ? `${this._ovSpan(C.daysBetween(d.start, d.perfectDate))} depois de começar` : "", "gold");
		if (g.ra.award && g.ra.awardDate) add(g.ra.awardDate, "medal", `Prêmio RetroAchievements: ${g.ra.award}`, "", "gold");
		if (g.lastPlayed.date && !ev.some(e => e.date === g.lastPlayed.date)) add(g.lastPlayed.date, "clock", "Última vez jogado", U.relDate(g.lastPlayed.date));
		if (ev.length < 2) return "";
		ev.sort((x, y) => x.date.localeCompare(y.date));
		// 3.64.0: além dos marcos, o registro completo do jogo (sessões e
		// conquistas dia a dia), recolhido
		const all = C.activity(ctx.model, { limit: Infinity, game: g });
		const firstEnd = d.runs.find(r => r.end)?.end;
		const facts = [
			firstEnd && d.start && C.daysBetween(d.start, firstEnd) >= 0 ? `Zerado em ${this._ovSpan(C.daysBetween(d.start, firstEnd))}` : "",
			d.perfectDate && d.start ? `100% em ${this._ovSpan(C.daysBetween(d.start, d.perfectDate))}` : "",
			g.dateAdded && d.start && C.daysBetween(g.dateAdded, d.start) > 30 ? `Esperou ${this._ovSpan(C.daysBetween(g.dateAdded, d.start))} no backlog` : ""
		].filter(Boolean);
		return `<section class="sv-block sv-ovtl">
			${U.sectionHead("Sua história com o jogo")}
			${facts.length ? `<div class="sv-ovtl-facts">${facts.map(f => `<span>${U.esc(f)}</span>`).join("")}</div>` : ""}
			<ol class="sv-ovtl-list">${ev.map(e => `<li class="sv-ovtl-item${e.tone ? ` is-${e.tone}` : ""}"><span class="sv-ovtl-dot">${U.icon(e.icon)}</span><div><time>${U.esc(U.fmtDate(e.date))}</time><b>${U.esc(e.title)}</b>${e.sub ? `<small>${U.esc(e.sub)}</small>` : ""}</div></li>`).join("")}</ol>
			${all.length > ev.length ? `<details class="sv-ovtl-all"><summary>Ver toda a atividade<span>${all.length}</span></summary>${this.activityFeed(ctx, all.slice(0, 300), { showGame: false })}</details>` : ""}
		</section>`;
	}

	// ---- ritmo de jogo
	_ovRhythm(ctx, g, d) {
		const { U, C } = ctx;
		const ss = d.sessions;
		if (!ss.length) return "";
		const byDay = new Map();
		for (const s of ss) byDay.set(s.date, (byDay.get(s.date) || 0) + (s.hours || 0.5));
		const weeks = 26, end = new Date(d.today + "T00:00:00");
		const startD = new Date(end); startD.setDate(startD.getDate() - (weeks * 7 - 1) - ((end.getDay() + 6) % 7 === 6 ? 0 : 6 - ((end.getDay() + 6) % 7)));
		const max = Math.max(1, ...byDay.values());
		const cells = [];
		for (let i = 0; i < weeks * 7; i++) {
			const dt = new Date(startD); dt.setDate(startD.getDate() + i);
			const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
			const h = byDay.get(iso) || 0;
			const lvl = !h ? 0 : h / max > 0.75 ? 4 : h / max > 0.5 ? 3 : h / max > 0.25 ? 2 : 1;
			cells.push(`<i class="l${lvl}${iso > d.today ? " is-future" : ""}" title="${U.attr(U.fmtDate(iso))}${h ? ` · ${U.attr(U.fmtHours(h))}` : ""}"></i>`);
		}
		const total = ss.reduce((t, s) => t + s.hours, 0);
		const longest = ss.reduce((m, s) => s.hours > m.hours ? s : m, ss[0]);
		const days = [...byDay.keys()].sort();
		let streak = 1, best = 1;
		for (let i = 1; i < days.length; i++) { streak = C.daysBetween(days[i - 1], days[i]) === 1 ? streak + 1 : 1; best = Math.max(best, streak); }
		const since = g.lastPlayed.date ? C.daysBetween(g.lastPlayed.date, d.today) : null;
		const inWindow = days.some(x => x >= `${startD.getFullYear()}-${String(startD.getMonth() + 1).padStart(2, "0")}`);
		return `<section class="sv-block sv-ovrhythm">
			${U.sectionHead("Ritmo de jogo", { sub: inWindow ? "Sessões dos últimos 6 meses" : "Sem sessões nos últimos 6 meses" })}
			<div class="sv-ovheat" role="img" aria-label="Sessões por dia nos últimos 6 meses">${cells.join("")}</div>
			<div class="sv-ovrhythm-stats">
				<div><b>${U.fmtNum(ss.length)}</b><span>${ss.length === 1 ? "sessão" : "sessões"}</span></div>
				<div><b>${total ? U.fmtHours(total / ss.length) : "—"}</b><span>por sessão</span></div>
				<div><b>${longest.hours ? U.fmtHours(longest.hours) : "—"}</b><span>maior sessão</span></div>
				<div><b>${best}</b><span>${best === 1 ? "dia seguido" : "dias seguidos"}</span></div>
				${since !== null ? `<div><b>${since <= 0 ? "Hoje" : U.fmtNum(since)}</b><span>${since <= 0 ? "última vez" : since === 1 ? "dia sem jogar" : "dias sem jogar"}</span></div>` : ""}
			</div>
		</section>`;
	}

	// ---- destaques de mídia
	_ovMedia(ctx, g) {
		const { U, C } = ctx;
		const shots = g.screenshots.map(s => ({ src: C.resolveImage(typeof s === "string" ? s : s?.src), fav: typeof s === "object" && s?.favorite })).filter(s => s.src);
		const pick = shots.filter(s => s.fav).length ? shots.filter(s => s.fav) : shots.slice(-4).reverse();
		const tracks = g.soundtrack.filter(t => t.favorite && t.title);
		if (!pick.length && !tracks.length) return "";
		const favs = shots.some(s => s.fav);
		return `<section class="sv-block sv-ovmedia">
			${U.sectionHead(favs || tracks.length ? "Destaques de mídia" : "Últimas screenshots", { action: `<button type="button" class="sv-ovlink" data-goto-tab="media"><span>Ver mídia</span>${U.icon("chevronRight")}</button>` })}
			${pick.length ? `<div class="sv-ovshots">${pick.slice(0, 6).map((s, i) => `<button type="button" class="sv-ovshot" data-ov-shot="${i}"><img src="${U.attr(s.src)}" alt="" loading="lazy" data-sv-img>${s.fav ? `<span>${U.icon("heart")}</span>` : ""}</button>`).join("")}</div>` : ""}
			${tracks.length ? `<div class="sv-ovtracks">${tracks.slice(0, 4).map(t => `<button type="button" class="sv-ovtrack" data-goto-tab="media">${U.icon("music")}<b>${U.esc(t.title)}</b>${t.artist ? `<small>${U.esc(t.artist)}</small>` : ""}</button>`).join("")}</div>` : ""}
		</section>`;
	}

	// ---- previsão (dentro do painel de progresso)
	_ovForecast(ctx, g, d) {
		const { U, C } = ctx;
		const out = [];
		const recent = d.sessions.filter(s => C.daysBetween(s.date, d.today) <= 28).reduce((t, s) => t + s.hours, 0);
		let pace = recent / 4;
		if (!pace && d.sessions.length >= 2) {
			const span = Math.max(7, C.daysBetween(d.sessions[0].date, d.sessions[d.sessions.length - 1].date));
			pace = d.sessions.reduce((t, s) => t + s.hours, 0) / (span / 7);
		}
		const weeks = n => n <= 1.2 ? "cerca de 1 semana" : n < 8 ? `cerca de ${Math.round(n)} semanas` : `cerca de ${Math.round(n / 4.3)} meses`;
		if (g.estimatedHours && !["Completed", "Dropped", "Wishlist"].includes(g.status)) {
			const left = g.estimatedHours - g.playtime.hours;
			if (left > 0.5) out.push(`<li>${U.icon("clock")}<div><b>Faltam ~${U.fmtHours(left)} para zerar</b>${pace > 0.2 ? `<small>No seu ritmo (${U.fmtHours(pace)}/semana), ${weeks(left / pace)}</small>` : `<small>Estimativa de ${U.fmtHours(g.estimatedHours)} no total</small>`}</div></li>`);
			else out.push(`<li>${U.icon("flag")}<div><b>Você já passou do tempo estimado</b><small>A reta final deve estar perto</small></div></li>`);
		}
		const a = g.ach;
		if (a.state === "known" && a.total && !a.perfect && a.unlocked > 0) {
			const left = a.total - a.unlocked;
			const recentAch = d.unlockedDates.filter(x => C.daysBetween(x.date, d.today) <= 60).length;
			const rate = recentAch / (60 / 7);
			out.push(`<li>${U.icon("trophy")}<div><b>${U.plural(left, "conquista falta", "conquistas faltam")} para 100%</b>${rate >= 0.25 ? `<small>No seu ritmo, ${weeks(left / rate)}</small>` : `<small>${U.fmtPct(a.pctRound)} feito até agora</small>`}</div></li>`);
		}
		return out.length ? `<div class="sv-ovforecast"><span>Previsão</span><ul>${out.join("")}</ul></div>` : "";
	}

	// ---- próximos objetivos
	_ovNext(ctx, g) {
		const { U, C } = ctx;
		const locked = g.achievements.filter(x => !x.unlocked && (x.target || C.achCounts(g, x)));
		if (!locked.length || g.ach.state === "none") return "";
		const tierRank = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
		const targets = locked.filter(x => x.target);
		const rest = locked.filter(x => !x.target).sort((x, y) => (y.rarity ?? -1) - (x.rarity ?? -1) || (tierRank[x.rarityTier] ?? 5) - (tierRank[y.rarityTier] ?? 5) || (x.order ?? 999) - (y.order ?? 999));
		const pick = [...targets, ...rest].slice(0, 3);
		return `<section class="sv-surface sv-ovnext">
			<h3>Próximos objetivos</h3>
			<p class="sv-muted">${targets.length ? "Suas metas primeiro, depois as mais comuns entre os jogadores" : "As conquistas que mais jogadores já têm"}</p>
			<div class="sv-ovnext-list">${pick.map(x => `<button type="button" class="sv-ovnext-item" data-goto-tab="achievements">
				<span class="sv-ovnext-icon">${x.iconSrc && !x.secret ? `<img src="${U.attr(x.iconSrc)}" alt="" loading="lazy" data-sv-img>` : U.icon(x.secret ? "lock" : "trophy")}</span>
				<span class="sv-ovnext-text"><b>${U.esc(x.secret ? "Conquista secreta" : x.name)}</b>${!x.secret && x.description ? `<small>${U.esc(x.description)}</small>` : ""}</span>
				${x.target ? `<span class="sv-ovnext-pct is-target">${U.icon("target")}</span>` : x.rarity !== null ? `<span class="sv-ovnext-pct">${U.fmtPct(x.rarity)}</span>` : ""}
			</button>`).join("")}</div>
			<button type="button" class="sv-ovlink" data-goto-tab="achievements">${U.icon("chevronRight")}<span>Ver as ${U.fmtNum(locked.length)} que faltam</span></button>
		</section>`;
	}

	// ---- no seu vault: tier, ranking e comparação
	_ovRank(ctx, g, d) {
		const { U, C, model } = ctx;
		const games = model.games.filter(x => x.status !== "Wishlist");
		const rows = [];
		if (g.playtime.hours > 0) {
			const played = games.filter(x => x.playtime.hours > 0).sort((x, y) => y.playtime.hours - x.playtime.hours);
			const pos = played.indexOf(g) + 1;
			if (pos && played.length > 1) rows.push(["clock", pos === 1 ? "O seu jogo mais jogado" : `${pos}º mais jogado`, `de ${played.length} jogos com horas`]);
		}
		if (g.rating) {
			const rated = games.filter(x => x.rating);
			const above = rated.filter(x => x.rating > g.rating).length;
			const pct = Math.max(1, Math.round(((above + 1) / rated.length) * 100));
			if (rated.length > 2) rows.push(["star", pct <= 50 ? `Top ${pct}% das suas notas` : `Nota ${U.fmtNum(g.rating, 1)} de 5`, above ? `${U.plural(above, "jogo tem", "jogos têm")} nota maior` : "Entre as suas maiores notas"]);
		}
		const firstEnd = d.runs.find(r => r.end);
		if (firstEnd?.start) {
			const mine = C.daysBetween(firstEnd.start, firstEnd.end);
			const all = games.map(x => x.startDate && x.completionDate ? C.daysBetween(x.startDate, x.completionDate) : null).filter(v => v !== null && v >= 0).sort((x, y) => x - y);
			const pos = all.indexOf(mine) + 1;
			if (all.length > 1 && pos) rows.push(["bolt", pos === 1 ? "O mais rápido que você já zerou" : `${pos}º mais rápido para zerar`, this._ovSpan(mine)]);
		}
		const cmp = (label, list) => {
			const others = list.filter(x => x !== g && x.playtime.hours > 0);
			if (others.length < 2 || !g.playtime.hours) return;
			const avg = others.reduce((t, x) => t + x.playtime.hours, 0) / others.length;
			const diff = g.playtime.hours - avg;
			if (Math.abs(diff) < 1) rows.push(["chart", `Na média de ${label}`, `${U.fmtHours(avg)} por jogo`]);
			else rows.push(["chart", `${U.fmtHours(Math.abs(diff))} ${diff > 0 ? "acima" : "abaixo"} da média de ${label}`, `média de ${U.fmtHours(avg)} por jogo`]);
		};
		if (g.genres[0]) cmp(g.genres[0], games.filter(x => x.genres.includes(g.genres[0])));
		if (g.platform) cmp(g.platform, games.filter(x => x.platform === g.platform));
		const tiers = { S: "Obra-prima", A: "Excelente", B: "Muito bom", C: "Bom", D: "Esquecível" };
		const tier = tiers[g.tier] ? `<a class="sv-ovtier sv-tier--${g.tier.toLowerCase()}" ${U.openAttrs("Dashboard/Tier List")} title="Abrir a Tier List"><b>${U.esc(g.tier)}</b><span><small>Tier List</small>${U.esc(tiers[g.tier])}</span></a>` : "";
		if (!rows.length && !tier) return "";
		return `<section class="sv-surface sv-ovrank">
			<h3>No seu vault</h3>
			${tier}
			${rows.length ? `<ul>${rows.map(([icon, b, s]) => `<li>${U.icon(icon)}<div><b>${U.esc(b)}</b><small>${U.esc(s)}</small></div></li>`).join("")}</ul>` : ""}
		</section>`;
	}

	// ---- nota fixada
	_ovPinned(ctx, g) {
		const { U } = ctx;
		if (!g.notes.length) return "";
		const pinned = g.notes.find(n => n && typeof n === "object" && (n.pinned === true || n.pinned === "true"));
		if (!pinned) return `<button type="button" class="sv-surface sv-ovpin is-empty" data-ov-pin>${U.icon("pin")}<span><b>Fixar uma nota</b><small>Escolha uma das ${U.plural(g.notes.length, "nota", "notas")} para ficar aqui</small></span></button>`;
		return `<section class="sv-surface sv-ovpin">
			<header><h3>${U.icon("pin")}Nota fixada</h3><button type="button" class="sv-ovlink" data-ov-pin>${U.icon("edit")}<span>Trocar</span></button></header>
			${pinned.category ? `<span class="sv-ovpin-cat">${U.esc(pinned.category)}</span>` : ""}
			<p>${U.esc(pinned.text || "")}</p>
		</section>`;
	}

	// ---- zeradas
	_ovRuns(ctx, g, d) {
		const { U, C } = ctx;
		const done = d.runs.filter(r => r.end);
		if (!done.length) return "";
		return `<section class="sv-surface sv-ovruns">
			<header><h3>${done.length > 1 ? `Zerado ${done.length}×` : "Zerado"}</h3>${U.btn("", { icon: "plus", kind: "ghost", size: "sm", action: "manage", title: "Registrar zerada", attrs: `data-section="playthroughs" data-path="${U.attr(g.path)}"` })}</header>
			<ol>${done.map((r, i) => `<li><span class="sv-ovruns-n">${i + 1}ª</span><div><b>${U.esc(U.fmtDate(r.end))}</b><small>${[r.start ? this._ovSpan(C.daysBetween(r.start, r.end)) : "", r.difficulty, r.platform && r.platform !== g.platform ? r.platform : ""].filter(Boolean).map(x => U.esc(x)).join(" · ") || "Sem detalhes"}</small>${r.note ? `<p>${U.esc(r.note)}</p>` : ""}</div></li>`).join("")}</ol>
		</section>`;
	}

	_ovPrice(ctx, g) {
		const { U, C } = ctx;
		if (!(g.currentPrice !== null || g.price !== null || g.status === "Wishlist")) return "";
		return `<section class="sv-surface sv-pricepanel"><h3>Preço</h3>${U.figures([
			g.price !== null ? { label: "Pago", value: U.fmtMoney(g.price) } : null,
					g.currentPrice !== null ? { label: g.priceStore ? `Agora na ${globalThis.customJS?.SteamVaultStores?.label?.(g.priceStore) || g.priceStore}` : "Na loja agora", value: U.fmtMoney(g.currentPrice), sub: g.discountPercent ? `-${g.discountPercent}%` : "", tone: g.targetPrice && g.currentPrice <= g.targetPrice ? "gold" : g.discountPercent ? "green" : "" } : null,
					g.targetPrice ? { label: "Preço-alvo", value: U.fmtMoney(g.targetPrice), sub: g.currentPrice !== null ? (g.currentPrice <= g.targetPrice ? "atingido" : `faltam ${U.fmtMoney(g.currentPrice - g.targetPrice)}`) : "" } : null,
					g.lowestSeenPrice !== null ? { label: "Menor já visto", value: U.fmtMoney(g.lowestSeenPrice) } : null
		])}${g.status === "Wishlist" ? `<div class="sv-steamline">${g.priceCheckedAt ? `<span class="sv-sync">${U.icon("bell")}<span>Verificado ${U.esc(U.relDate(g.priceCheckedAt.slice(0, 10)))}</span></span>` : `<span class="sv-sync">${U.icon("bell")}<span>Ainda não verificado</span></span>`}<span class="sv-row-actions" style="margin:0">${C.safeUrl(g.priceUrl) ? `<a class="sv-btn sv-btn--ghost sv-btn--sm" href="${U.attr(C.safeUrl(g.priceUrl))}">${U.icon("external")}<span>Loja</span></a>` : ""}${U.btn("Verificar", { icon: "refresh", kind: "ghost", size: "sm", action: "wishlist-prices", attrs: `data-path="${U.attr(g.path)}"` })}</span></div>` : ""}</section>`;
	}

	// ---- comportamento da visão geral
	_wireOverview(root, ctx, g) {
		const { U, V, C } = ctx;
		const panel = root.querySelector('.sv-panel[data-panel="overview"]');
		if (!panel) return;
		const shots = [...panel.querySelectorAll("[data-ov-shot] img")].map(i => i.getAttribute("src"));
		panel.querySelectorAll("[data-ov-shot]").forEach(b => b.addEventListener("click", () => V.lightbox(shots, Number(b.dataset.ovShot) || 0)));
		panel.querySelectorAll("[data-ov-search]").forEach(b => b.addEventListener("click", () => { window.__svLibQuery = b.dataset.ovSearch; V.open("Dashboard/Biblioteca", ctx); }));
		const file = () => app.vault.getAbstractFileByPath(g.path);
		const save = async (fn, ok) => {
			const f = file(); if (!f) return V.toast("Arquivo do jogo não encontrado", { tone: "error" });
			try { await app.fileManager.processFrontMatter(f, fn); V.toast(ok, { tone: "ok" }); } catch (err) { V.toast(`Não foi possível salvar: ${err.message}`, { tone: "error" }); }
		};
		panel.querySelector("[data-ov-review]")?.addEventListener("click", () => {
			const body = document.createElement("div");
			body.className = "sv-host sv-legacy sv-ovreview-form";
			body.innerHTML = `<div class="svl-field"><label>Você recomenda?</label><div class="sv-fchips" data-ov-rec>
					<button type="button" class="sv-fchip" data-v="yes">${U.icon("check")}Recomendo</button>
					<button type="button" class="sv-fchip" data-v="no">${U.icon("x")}Não recomendo</button>
					<button type="button" class="sv-fchip" data-v="">Sem selo</button></div></div>
				<div class="svl-field"><label for="sv-ov-review">Minha opinião</label><textarea class="svl-input" id="sv-ov-review" rows="5" placeholder="O que ficou na memória? O que você diria a um amigo?">${U.esc(g.review)}</textarea></div>
				<div class="svl-field"><label for="sv-ov-pros">Prós <small>(um por linha)</small></label><textarea class="svl-input" id="sv-ov-pros" rows="3" placeholder="Trilha sonora marcante">${U.esc(g.pros.join("\n"))}</textarea></div>
				<div class="svl-field"><label for="sv-ov-cons">Contras <small>(um por linha)</small></label><textarea class="svl-input" id="sv-ov-cons" rows="3" placeholder="Final apressado">${U.esc(g.cons.join("\n"))}</textarea></div>`;
			let rec = g.recommend === true ? "yes" : g.recommend === false ? "no" : "";
			const paint = () => body.querySelectorAll("[data-ov-rec] .sv-fchip").forEach(b => b.classList.toggle("is-active", b.dataset.v === rec));
			body.querySelector("[data-ov-rec]").addEventListener("click", e => { const b = e.target.closest(".sv-fchip"); if (b) { rec = b.dataset.v; paint(); } });
			paint();
			const m = V.modal({ title: "Minha análise", sub: g.title, size: "md", body, actions: `${U.btn("Cancelar", { kind: "ghost", attrs: "data-close" })}${U.btn("Salvar", { kind: "primary", attrs: "data-ov-save" })}` });
			m.el.querySelector("[data-ov-save]").addEventListener("click", async () => {
				const lines = id => body.querySelector(id).value.split("\n").map(x => x.trim()).filter(Boolean);
				const review = body.querySelector("#sv-ov-review").value.trim();
				const pros = lines("#sv-ov-pros"), cons = lines("#sv-ov-cons");
				m.close();
				await save(fm => {
					if (review) fm.review = review; else delete fm.review;
					if (pros.length) fm.pros = pros; else delete fm.pros;
					if (cons.length) fm.cons = cons; else delete fm.cons;
					if (rec) fm.recommend = rec === "yes"; else delete fm.recommend;
				}, "Análise salva");
			});
		});
		panel.querySelector("[data-ov-pin]")?.addEventListener("click", () => {
			const body = document.createElement("div");
			body.className = "sv-host sv-libsheet";
			const text = n => typeof n === "string" ? n : String(n?.text || "");
			const isPinned = n => n && typeof n === "object" && (n.pinned === true || n.pinned === "true");
			body.innerHTML = `<div class="sv-ovpin-pick">${g.notes.map((n, i) => `<button type="button" class="sv-ovpin-opt${isPinned(n) ? " is-on" : ""}" data-i="${i}">${typeof n === "object" && n?.category ? `<span class="sv-ovpin-cat">${U.esc(n.category)}</span>` : ""}<span>${U.esc(text(n).slice(0, 220))}${text(n).length > 220 ? "…" : ""}</span></button>`).join("")}</div>`;
			const has = g.notes.some(isPinned);
			const m = V.modal({ title: "Fixar uma nota", sub: "Ela aparece na Visão geral do jogo", size: "md", body, actions: has ? U.btn("Desafixar", { kind: "ghost", attrs: "data-ov-unpin" }) : "" });
			const write = async idx => {
				m.close();
				await save(fm => {
					if (!Array.isArray(fm.notes)) return;
					fm.notes = fm.notes.map((n, i) => {
						const o = typeof n === "string" ? { text: n } : { ...n };
						if (i === idx) o.pinned = true; else delete o.pinned;
						return !o.pinned && !o.category && Object.keys(o).length === 1 ? o.text : o;
					});
				}, idx === null ? "Nota desafixada" : "Nota fixada");
			};
			body.addEventListener("click", e => { const b = e.target.closest("[data-i]"); if (b) write(Number(b.dataset.i)); });
			m.el.querySelector("[data-ov-unpin]")?.addEventListener("click", () => write(null));
		});
		void C;
	}

	// --------------------------------------------------- estante de troféus
	achievementCabinet(ctx, g) {
		const { U, C } = ctx;
		const a = g.ach;
		const list = g.achievements;
		const pathAttr = `data-path="${U.attr(g.path)}"`;
		const editable = !!ctx.A?.editable(g);
		// sem sync automático: o editor completo (adicionar, editar, ordenar,
		// excluir); com sync, o formulário de sempre
		const manage = editable
			? U.btn(g.provider === "custom" ? "Gerenciar objetivos" : "Gerenciar conquistas", { icon: "edit", kind: "secondary", size: "sm", action: "ach-manage", attrs: pathAttr })
			: U.btn("Adicionar conquista", { icon: "plus", kind: "secondary", size: "sm", action: "manage", attrs: `data-section="achievements" ${pathAttr}` });
		const auto = C.autoSync(g);
		const sync = auto && g.provider === "steam" ? U.btn("Sincronizar com a Steam", { icon: "refresh", kind: "secondary", size: "sm", action: "steam-sync-game", attrs: pathAttr })
			: auto && g.provider === "retroachievements" && g.raGameId ? U.btn("Sincronizar com o RA", { icon: "refresh", kind: "secondary", size: "sm", action: "ra-sync-game", attrs: pathAttr })
			: auto && g.provider === "gog" ? (ctx.PL?.getConfig("gog")?.configured
				? U.btn("Sincronizar com a GOG", { icon: "refresh", kind: "secondary", size: "sm", action: "plat-sync-game", attrs: `data-platform="gog" ${pathAttr}` })
				: U.btn(`Conectar ${g.providerLabel}`, { icon: "link", kind: "secondary", size: "sm", action: "plat-connect", attrs: `data-platform="gog"` })) : "";
		// 3.74.0: Xbox 100% manual — gerenciador com cadastro em lote, planilha e ícones
		const xb = !!ctx.A?.isXbox?.(g);
		const xbBtns = xb && ctx.AM ? U.btn("Adicionar em lote", { icon: "list", kind: list.length ? "ghost" : "primary", size: "sm", action: "ach-bulk", attrs: pathAttr }) : "";
		// Gamerscore: soma dos G das conquistas (desbloqueadas × todas)
		const gs = xb ? list.reduce((o, x) => { const v = Number(x.points) || 0; o.total += v; if (x.unlocked) o.earned += v; return o; }, { earned: 0, total: 0 }) : null;
		// origem e sincronização lado a lado, com atalho para trocar
		const origin = `<div class="sv-achorigin">${g.provider === "unset"
			? `<span class="sv-achsrc sv-achsrc--unset"><span class="sv-achsrc-pv">${U.icon("trophy")}Origem não configurada</span></span>`
			: U.achSourceTag(g)}<button type="button" class="sv-achorigin-edit" data-action="ach-config" ${pathAttr}>${U.icon("edit")}<span>${g.provider === "unset" ? "Configurar" : "Alterar"}</span></button>${g.provider !== "unset" ? `<button type="button" class="sv-achorigin-edit" data-action="hub-open" data-tab="${U.attr(g.provider)}">${U.icon("trophy")}<span>Perfil ${U.esc(C.providerDefs[g.provider].short)}</span></button>` : ""}</div>`;
		if (!list.length) {
			if (g.provider === "unset" && a.state !== "known") return `${origin}${U.empty({ icon: "trophy", title: "De onde vêm as conquistas?", text: "Escolha a origem (Steam, RetroAchievements, Epic, PlayStation, Native, Custom…) e como elas serão mantidas.", action: U.btn("Escolher origem", { icon: "trophy", kind: "primary", size: "sm", action: "ach-config", attrs: pathAttr }) })}`;
			if (a.state === "pct") return `${origin}${U.empty({ icon: "trophy", title: `${U.fmtPct(a.pctRound)} das conquistas na GOG`, text: "O perfil público da GOG informa só a porcentagem de conquistas, não a lista. Ela é atualizada a cada sincronização.", action: sync })}`;
			const text = auto && g.provider === "steam"
				? (g.steam.status && g.steam.status !== "ok" ? ctx.S.message(g.steam.status) : "Sincronize com seu perfil público da Steam para trazer suas conquistas reais.")
				: xb ? "Cadastre as conquistas uma a uma ou várias de uma vez: uma por linha (Nome | Descrição | G) ou por planilha (CSV ou Excel). Os ícones entram em lote, a partir de imagens do aparelho."
				: auto && g.provider === "gog" ? (ctx.PL?.getConfig("gog")?.configured ? "Sincronize com a GOG para trazer o progresso deste jogo." : "Conecte seu perfil público da GOG para sincronizar o progresso.")
				: auto && g.provider === "retroachievements" ? (g.raGameId ? "Sincronize com o RetroAchievements para trazer suas conquistas." : "Conecte o RetroAchievements: o sync liga o jogo pelo título ou pelo ID informado.")
				: g.sync === "local" ? "Crie as conquistas deste jogo; elas existem só no vault."
				: `Registre as conquistas${g.provider === "native" || g.provider === "unset" ? "" : ` de ${g.providerLabel}`} e marque as que desbloquear.`;
			return `${origin}${U.empty({ icon: "trophy", title: a.state === "known" ? `${a.unlocked} de ${a.total} conquistas (somente contagem)` : "Nenhuma conquista registrada", text, action: xb ? `${xbBtns}${manage}` : sync || manage })}`;
		}
		const unlocked = list.filter(x => x.unlocked);
		const showcase = [...unlocked].filter(x => x.rarity !== null).sort((x, y) => x.rarity - y.rarity).slice(0, 3);
		const lastUnlock = unlocked.map(x => x.unlockedDate).filter(Boolean).sort().pop();
		// 3.27.0: visual dos Conjuntos de Conquistas da Steam, para todas as origens
		const S = C.achSets(g), multi = S.multi;
		const tone = (st, i) => U.achSetTone(st.base, i);
		const sets = S.sets.map((st, i) => ({ ...st, color: tone(st, i) }));
		const ov = multi ? { u: S.unlocked, t: S.total, pct: S.pct } : { u: a.unlocked, t: a.total, pct: a.pct };
		const perfect = ov.t > 0 && ov.u === ov.t;
		const glOn = U._store("achGlobal") !== "0";
		const canSets = list.some(x => x.path);
		const seg = multi ? `<div class="sv-achseg" role="img" aria-label="Progresso por conjunto">${sets.filter(st => !st.excluded).map(st => `<i style="width:${ov.t ? (st.unlocked / ov.t) * 100 : 0}%;background:${st.color}"></i>`).join("")}</div>
			<div class="sv-achseg-legend">${sets.map(st => `<span style="--c:${st.color}">${U.esc(st.base ? "Jogo base" : st.name)}</span>`).join("")}</div>` : "";
		const cards = multi ? `<div class="sv-achsets">${sets.map(st => `<article class="sv-achsetcard${st.done ? " is-done" : ""}${st.excluded ? " is-excluded" : ""}" style="--c:${st.color}">
				<div class="sv-achsetcard-head"><b>${U.esc(st.name)}</b><span class="sv-num">${st.unlocked}/${st.total}</span></div>
				<div class="sv-achsetcard-bar"><i style="width:${st.pct}%"></i></div>
				<div class="sv-achsetcard-foot">${st.done ? `<span class="sv-achsetcard-done">${U.icon("trophy")}Conjunto completo</span>` : `<span>${U.icon("trophy")}Complete o conjunto</span>`}
					${st.base ? "" : `<button type="button" class="sv-achsetcard-count" data-set-count="${U.attr(st.name)}" aria-pressed="${!st.excluded}" title="${st.excluded ? "Passar a contar no progresso total" : "Não contar no progresso total (ex.: DLC que você não tem)"}">${st.excluded ? "Fora do total" : "Conta no total"}</button>`}</div>
			</article>`).join("")}</div>` : "";
		const tiles = l => l.map(x => U.achievementTile(x, { toggle: editable, unit: xb ? "G" : "" })).join("");
		const groups = multi ? sets.map(st => `<section class="sv-achset${st.excluded ? " is-excluded" : ""}" data-set-group="${U.attr(st.name)}" style="--c:${st.color}">
				<header class="sv-achset-head"><span class="sv-achset-dot"></span><h3>${U.esc(st.name)}</h3>${st.done ? `<span class="sv-achset-badge">${U.icon("trophy")}Completo</span>` : ""}<span class="sv-num">${st.unlocked}/${st.total}</span></header>
				<div class="sv-achgrid${editable ? " is-editable" : ""}">${tiles(st.list)}</div>
				<p class="sv-achset-empty" hidden>Nenhuma conquista com esses filtros.</p>
			</section>`).join("")
			: `<div class="sv-achgrid${editable ? " is-editable" : ""}">${tiles(list)}</div>`;
		return `<div class="sv-cabinet${glOn ? "" : " is-noglobal"}" data-cabinet ${pathAttr}>
			<header class="sv-cabinet-head">
				<div class="sv-cabinet-ring">${U.ring(ov.pct, { size: 112, stroke: 7, perfect })}<div><b class="sv-num">${U.fmtPct(Math.round(ov.pct))}</b><span>${perfect ? "completo" : "concluído"}</span></div></div>
				<div class="sv-cabinet-summary">
					<h2>${perfect ? "Todas as conquistas desbloqueadas" : `${ov.u} de ${ov.t} conquistas`}</h2>
					${gs && gs.total ? `<p class="sv-cabinet-gs"><b class="sv-num">${U.fmtNum(gs.earned)}</b><span>/ ${U.fmtNum(gs.total)} G</span><small>Gamerscore</small></p>` : ""}
					<p>${a.origin === "steam" ? "Progresso real do seu perfil público da Steam" : xb ? `Progresso marcado por você · ${U.plural(Math.max(0, ov.t - ov.u), "restante", "restantes")}` : a.origin === "retroachievements" ? "Progresso do seu perfil no RetroAchievements" : a.origin === "legacy" ? "Contagem manual" : g.sync === "local" ? "Conquistas que existem só no vault" : "Registrado por você"}${lastUnlock ? `, última em ${U.esc(U.fmtDate(lastUnlock))}` : ""}.</p>
					${seg}
					${origin}
					<div class="sv-cabinet-actions">${sync}${manage}${xbBtns}</div>
				</div>
				${showcase.length ? `<div class="sv-showcase" aria-label="Mais raras desbloqueadas">${showcase.map(x => `<figure class="sv-medallion sv-rarity-${U.rarityTier(x.rarity)}"><div>${x.iconSrc ? `<img src="${U.attr(x.iconSrc)}" alt="">` : U.icon("trophy")}</div><figcaption><b>${U.esc(x.name)}</b><span>${U.fmtPct(x.rarity)} dos jogadores</span></figcaption></figure>`).join("")}</div>` : ""}
			</header>
			${cards}
			${ctx.X ? ctx.X.hunterBlock(ctx, g) : ""}
			<div class="sv-achtools">
				<div class="sv-field sv-field--search sv-achtools-search">${U.icon("search")}<input type="search" class="sv-input" data-ach-search placeholder="Buscar conquista"></div>
				<div class="sv-achtools-row">
					<div class="sv-achchips" data-ach-filter role="radiogroup" aria-label="Filtro">
						<button type="button" class="is-active" data-value="all">Todas<span>${list.length}</span></button>
						<button type="button" data-value="unlocked">Desbloqueadas<span>${unlocked.length}</span></button>
						<button type="button" data-value="locked">Bloqueadas<span>${list.length - unlocked.length}</span></button>
						${xb ? "" : `<button type="button" data-value="rare">Raras</button>`}
					</div>
					<div class="sv-achtools-end">
						${multi ? `<label class="sv-select">${U.icon("layers")}<select data-ach-set aria-label="Conjunto"><option value="">Todos os conjuntos</option>${sets.map(st => `<option value="${U.attr(st.name)}">${U.esc(st.name)}</option>`).join("")}</select></label>` : ""}
						<label class="sv-select">${U.icon("sort")}<select data-ach-sort aria-label="Ordenar conquistas"><option value="default">Ordem do jogo</option><option value="rarity">Mais raras</option><option value="recent">Mais recentes</option></select></label>
						${xb ? "" : `<label class="sv-achglobal"><span>% global</span><input type="checkbox" data-ach-global${glOn ? " checked" : ""}><i aria-hidden="true"></i></label>`}
						${canSets ? `<button type="button" class="sv-btn sv-btn--ghost sv-btn--sm" data-ach-sets>${U.icon("layers")}<span>Conjuntos</span></button>` : ""}
					</div>
				</div>
			</div>
			${groups}
		</div>`;
	}

	_wireCabinet(root, ctx) {
		root.querySelectorAll("[data-cabinet]").forEach(cab => {
			const grids = [...cab.querySelectorAll(".sv-achgrid")];
			if (!grids.length) return;
			const orig = new Map(grids.map(gd => [gd, [...gd.children]]));
			const st = { f: "all", q: "", sort: "default", set: "" };
			const apply = () => {
				for (const gd of grids) {
					const items = [...orig.get(gd)];
					if (st.sort === "rarity") items.sort((a, b) => (Number(a.dataset.achRarity) || 101) - (Number(b.dataset.achRarity) || 101));
					if (st.sort === "recent") items.sort((a, b) => (b.dataset.achDate || "").localeCompare(a.dataset.achDate || ""));
					let shown = 0;
					const frag = document.createDocumentFragment();
					for (const el of items) {
						const un = el.dataset.achUnlocked === "true", r = Number(el.dataset.achRarity);
						el.hidden = !((st.f === "all") || (st.f === "unlocked" && un) || (st.f === "locked" && !un) || (st.f === "rare" && el.dataset.achRarity !== "" && r <= 15))
							|| (st.q && !el.dataset.search.includes(st.q));
						if (!el.hidden) shown++;
						frag.appendChild(el);
					}
					gd.appendChild(frag);
					const grp = gd.closest("[data-set-group]");
					if (grp) {
						grp.hidden = !!st.set && grp.dataset.setGroup !== st.set;
						grp.querySelector(".sv-achset-empty").hidden = shown > 0;
					}
				}
			};
			cab.querySelectorAll("[data-ach-filter] button").forEach(b => b.addEventListener("click", () => {
				cab.querySelectorAll("[data-ach-filter] button").forEach(x => x.classList.toggle("is-active", x === b));
				st.f = b.dataset.value; apply();
			}));
			cab.querySelector("[data-ach-search]")?.addEventListener("input", e => { st.q = e.target.value.toLowerCase().trim(); apply(); });
			cab.querySelector("[data-ach-sort]")?.addEventListener("change", e => { st.sort = e.target.value; apply(); });
			cab.querySelector("[data-ach-set]")?.addEventListener("change", e => { st.set = e.target.value; apply(); });
			cab.querySelector("[data-ach-global]")?.addEventListener("change", e => {
				cab.classList.toggle("is-noglobal", !e.target.checked);
				ctx.U._store("achGlobal", e.target.checked ? "1" : "0");
			});
			const g = ctx.model.gamesByPath.get(cab.dataset.path);
			if (!g) return;
			cab.querySelector("[data-ach-sets]")?.addEventListener("click", () => this.openSetManager(ctx, g, cab.querySelector("[data-ach-search]")?.value || ""));
			cab.querySelectorAll("[data-set-count]").forEach(b => b.addEventListener("click", () => this._toggleSetCount(ctx, g, b.dataset.setCount)));
		});
	}

	// conjunto conta (ou não) no progresso total do jogo: achSetsExcluded na ficha
	async _toggleSetCount(ctx, g, name) {
		const { C, V } = ctx;
		const f = app.vault.getAbstractFileByPath(g.path);
		if (!f) return;
		try {
			await app.fileManager.processFrontMatter(f, fm => {
				const cur = new Set(C.arr(fm.achSetsExcluded).map(x => C.str(x)).filter(Boolean));
				if (cur.has(name)) cur.delete(name); else cur.add(C.clip(name, 60));
				if (cur.size) fm.achSetsExcluded = [...cur]; else delete fm.achSetsExcluded;
			});
			C.invalidate();
			setTimeout(() => V.refresh(), 150);
		} catch (err) { V.toast(`Não foi possível salvar: ${err.message}`, { tone: "error" }); }
	}

	// Separar conquistas em conjuntos (ex.: DLC): pelo texto no nome/descrição.
	// Grava o campo "set" em cada nota (a sincronização preserva o campo).
	openSetManager(ctx, g, q0 = "") {
		const { U, C, V } = ctx;
		const S = C.achSets(g);
		const editable = g.achievements.filter(a => a.path);
		const body = document.createElement("div");
		body.className = "sv-setman";
		body.innerHTML = `
			<p class="sv-modal-text">Agrupe as conquistas como nos Conjuntos de Conquistas da Steam: jogo base, DLCs, temporadas. Funciona com qualquer origem.</p>
			<label class="sv-label" for="sv-sm-q">Conquistas que contêm</label>
			<input id="sv-sm-q" class="sv-input" type="search" placeholder="Ex.: Caminhos Distintos" value="${U.attr(q0)}">
			<small class="sv-setman-count" data-sm-count></small>
			<label class="sv-label" for="sv-sm-name">Mover para o conjunto</label>
			<input id="sv-sm-name" class="sv-input" type="text" maxlength="60" list="sv-sm-sets" placeholder="Ex.: Separate Ways · DLC">
			<datalist id="sv-sm-sets">${S.sets.map(st => `<option value="${U.attr(st.name)}"></option>`).join("")}</datalist>
			<label class="sv-switch"><input type="checkbox" data-sm-excl><span></span>Não contar no progresso total (DLC que você não tem)</label>
			${S.multi ? `<div class="sv-setman-list"><span class="sv-label">Conjuntos atuais</span>${S.sets.map(st => `<div class="sv-setman-row"><span><b>${U.esc(st.name)}</b><small>${st.unlocked}/${st.total}${st.excluded ? " · fora do total" : ""}</small></span>${st.base ? "" : `<button type="button" class="sv-btn sv-btn--ghost sv-btn--sm" data-sm-undo="${U.attr(st.name)}">${U.icon("refresh")}<span>Voltar ao jogo base</span></button>`}</div>`).join("")}</div>` : ""}`;
		const match = q => { q = q.trim().toLowerCase(); return q ? editable.filter(a => `${a.name} ${a.description}`.toLowerCase().includes(q)) : []; };
		const count = () => { const n = match(body.querySelector("#sv-sm-q").value).length; body.querySelector("[data-sm-count]").textContent = n ? U.plural(n, "conquista encontrada", "conquistas encontradas") : "Digite um trecho do nome ou da descrição"; };
		body.querySelector("#sv-sm-q").addEventListener("input", count);
		count();
		const write = async (list, set, excl) => {
			let done = 0;
			for (const a of list) {
				const f = app.vault.getAbstractFileByPath(a.path);
				if (!f) continue;
				await app.fileManager.processFrontMatter(f, fm => { if (set && set !== "Jogo base") fm.set = set; else delete fm.set; });
				done++;
			}
			const gf = app.vault.getAbstractFileByPath(g.path);
			if (gf && set && set !== "Jogo base") await app.fileManager.processFrontMatter(gf, fm => {
				const cur = new Set(C.arr(fm.achSetsExcluded).map(x => C.str(x)).filter(Boolean));
				if (excl) cur.add(set); else cur.delete(set);
				if (cur.size) fm.achSetsExcluded = [...cur]; else delete fm.achSetsExcluded;
			});
			C.invalidate();
			return done;
		};
		const m = V.modal({ title: "Conjuntos de conquistas", sub: g.title, size: "sm", body, actions: `${U.btn("Fechar", { kind: "ghost", attrs: "data-close" })}${U.btn("Mover", { kind: "primary", icon: "layers", attrs: "data-sm-apply" })}` });
		m.el.querySelector("[data-sm-apply]").addEventListener("click", async () => {
			const list = match(body.querySelector("#sv-sm-q").value), set = C.clip(body.querySelector("#sv-sm-name").value, 60);
			if (!list.length) return V.toast("Nenhuma conquista com esse texto", { tone: "warn" });
			if (!set) return V.toast("Dê um nome ao conjunto", { tone: "warn" });
			m.close();
			try { const n = await write(list, set, body.querySelector("[data-sm-excl]").checked); V.toast(`${U.plural(n, "conquista movida", "conquistas movidas")} para ${set}`, { tone: "ok", icon: "layers" }); setTimeout(() => V.refresh(), 200); }
			catch (err) { V.toast(`Não foi possível salvar: ${err.message}`, { tone: "error" }); }
		});
		body.querySelectorAll("[data-sm-undo]").forEach(b => b.addEventListener("click", async () => {
			const name = b.dataset.smUndo, list = editable.filter(a => a.set === name);
			m.close();
			try {
				await write(list, "", false);
				const gf = app.vault.getAbstractFileByPath(g.path);
				if (gf) await app.fileManager.processFrontMatter(gf, fm => { const cur = C.arr(fm.achSetsExcluded).filter(x => C.str(x) !== name); if (cur.length) fm.achSetsExcluded = cur; else delete fm.achSetsExcluded; });
				V.toast(`${name} voltou ao jogo base`, { tone: "ok", icon: "layers" }); setTimeout(() => V.refresh(), 200);
			} catch (err) { V.toast(`Não foi possível salvar: ${err.message}`, { tone: "error" }); }
		}));
	}

	// ------------------------------------------------------------- mídia
	_tabHero(ctx, { icon = "info", tone = "var(--sv-blue)", ring = null, ringLabel = "", ringValue = "", title = "", sub = "", stats = [], actions = "", attrs = "" } = {}) {
		const { U } = ctx;
		const visual = ring !== null
			? `<div class="sv-tabhero-ring">${U.ring(ring, { size: 96, stroke: 7, perfect: ring >= 100 })}<div><b class="sv-num" data-hero-ring-value>${U.esc(ringValue)}</b><span>${U.esc(ringLabel)}</span></div></div>`
			: `<div class="sv-tabhero-icon">${U.icon(icon)}</div>`;
		return `<header class="sv-tabhero" style="--tone:${tone}" ${attrs}>
			${visual}
			<div class="sv-tabhero-text">
				<h2 data-hero-title>${U.esc(title)}</h2>
				${sub ? `<p data-hero-sub>${U.esc(sub)}</p>` : ""}
				${stats.length ? `<ul class="sv-tabhero-stats">${stats.map(([v, l, key]) => `<li${key ? ` data-hero-stat="${key}"` : ""}><b>${U.esc(v)}</b><span>${U.esc(l)}</span></li>`).join("")}</ul>` : ""}
			</div>
			${actions ? `<div class="sv-tabhero-actions">${actions}</div>` : ""}
		</header>`;
	}

	_media(ctx, g) {
		const { U, C } = ctx;
		const shots = g.screenshots.map((s, i) => ({ src: C.resolveImage(typeof s === "string" ? s : s?.src), fav: typeof s === "object" && s?.favorite, i })).filter(s => s.src);
		const arts = [["Capa", g.images.cover], ["Fundo", g.images.background], ["Destaque", g.images.featured]].filter(([, s]) => s);
		const favs = shots.filter(s => s.fav).length;
		const manage = (label, section, kind = "ghost", icon = "edit") => U.btn(label, { icon, kind, size: "sm", action: "manage", attrs: `data-section="${section}" data-path="${U.attr(g.path)}"` });
		return `${this._tabHero(ctx, {
			icon: "image", tone: "#a970ff", title: "Mídia",
			sub: shots.length || g.soundtrack.length ? "Screenshots, artes e trilha sonora deste jogo" : "Guarde capturas e a trilha sonora dos seus momentos favoritos",
			stats: [[U.fmtNum(shots.length), shots.length === 1 ? "screenshot" : "screenshots"], favs ? [U.fmtNum(favs), favs === 1 ? "favorita" : "favoritas"] : null, [U.fmtNum(arts.length), arts.length === 1 ? "arte" : "artes"], [U.fmtNum(g.soundtrack.length), g.soundtrack.length === 1 ? "faixa" : "faixas"]].filter(Boolean),
			actions: manage(shots.length ? "Gerenciar screenshots" : "Adicionar screenshots", "screenshots", shots.length ? "secondary" : "primary", shots.length ? "edit" : "plus")
		})}
		<section class="sv-block">
			${U.sectionHead("Screenshots", { count: shots.length || null })}
			${shots.length ? `<div class="sv-gallery sv-gallery--tab">${shots.map((s, k) => `<button type="button" class="sv-shot${s.fav ? " is-fav" : ""}" data-lightbox="${k}"><img src="${U.attr(s.src)}" alt="" loading="lazy" data-sv-img>${s.fav ? `<span class="sv-shot-fav" title="Favorita">${U.icon("heart")}</span>` : ""}</button>`).join("")}</div>`
				: U.empty({ icon: "image", title: "Nenhuma screenshot", text: "Guarde capturas dos seus momentos favoritos deste jogo.", compact: true })}
		</section>
		${arts.length ? `<section class="sv-block">${U.sectionHead("Artes", { action: manage("Trocar artes", "images") })}<div class="sv-artwork sv-artwork--tab">${arts.map(([k, s]) => `<figure><button type="button" data-lightbox-src="${U.attr(s)}"><img src="${U.attr(s)}" alt="" loading="lazy" data-sv-img></button><figcaption>${U.esc(k)}</figcaption></figure>`).join("")}</div></section>` : ""}
		<section class="sv-block">
			${U.sectionHead("Trilha sonora", { count: g.soundtrack.length || null })}
			<div class="sv-legacy sv-legacy--soundtrack" data-legacy-soundtrack></div>
		</section>`;
	}

	_wireSoundtrack(root, ctx, g) {
		const host = root.querySelector("[data-legacy-soundtrack]");
		if (!host || !ctx.L) return;
		host.innerHTML = ctx.L.soundtrackSection(g.page);
		ctx.L.wireSoundtrackSection(host, g.page);
		ctx.V?.cleanLegacy?.(host);
	}

	_wireLightbox(root, ctx) {
		const imgs = [...root.querySelectorAll("[data-lightbox] img, [data-lightbox-src] img")];
		root.querySelectorAll("[data-lightbox], [data-lightbox-src]").forEach(btn => btn.addEventListener("click", () => {
			const start = imgs.indexOf(btn.querySelector("img"));
			ctx.V.lightbox(imgs.map(i => i.getAttribute("src")), Math.max(0, start));
		}));
	}

	_dlc(ctx, g) {
		const { U, C } = ctx;
		const manage = U.btn(g.dlc.length ? "Gerenciar" : "Adicionar DLC", { icon: g.dlc.length ? "edit" : "plus", kind: g.dlc.length ? "secondary" : "primary", size: "sm", action: "manage", attrs: `data-section="dlc" data-path="${U.attr(g.path)}"` });
		const done = g.dlc.filter(d => d?.completed).length, total = g.dlc.length;
		const pct = total ? Math.round((done / total) * 100) : 0;
		const hero = this._tabHero(ctx, {
			ring: total ? pct : null, icon: "puzzle", tone: "var(--sv-green)", ringValue: `${pct}%`, ringLabel: "concluído",
			title: total ? (done === total ? "Todas as DLC concluídas" : `${done} de ${total} concluídas`) : "DLC e expansões",
			sub: total ? "Toque no círculo de cada item para marcar como concluído" : "Registre expansões para acompanhar o que já foi concluído",
			stats: total ? [[U.fmtNum(done), done === 1 ? "concluída" : "concluídas", "done"], [U.fmtNum(total - done), total - done === 1 ? "pendente" : "pendentes", "left"]] : [],
			actions: manage, attrs: total ? "data-dlc-hero" : ""
		});
		if (!total) return `${hero}${U.empty({ icon: "puzzle", title: "Nenhuma DLC ou expansão", text: "Quando registrar uma, ela aparece aqui com o progresso.", compact: true })}`;
		return `${hero}
			<section class="sv-block">${U.sectionHead("Lista", { count: total })}
			<ul class="sv-checklist sv-dlclist" data-dlc-list>${g.dlc.map((d, i) => {
				const on = !!d?.completed;
				const title = typeof d === "string" ? d : d?.title || d?.name || "DLC";
				const date = typeof d === "object" ? C.iso(d?.completionDate || d?.date) : "";
				const kind = typeof d === "object" ? String(d?.type || "") : "";
				return `<li class="${on ? "is-done" : ""}"><button type="button" class="sv-check" data-dlc-toggle="${i}" aria-pressed="${on}" aria-label="${on ? "Desmarcar DLC" : "Concluir DLC"}" title="${on ? "Concluída — toque para desmarcar" : "Marcar como concluída"}">${U.icon("check")}</button><div class="sv-dlclist-text"><span>${U.esc(title)}</span>${kind || date ? `<small>${[kind, date ? `concluída em ${U.fmtDate(date)}` : ""].filter(Boolean).map(x => U.esc(x)).join(" · ")}</small>` : ""}</div><span class="sv-dlclist-state">${on ? "Concluída" : "Pendente"}</span></li>`;
			}).join("")}</ul></section>`;
	}

	// aba DLC: o quadrado de cada DLC conclui/desmarca na hora (antes era só
	// desenho); grava no frontmatter e atualiza o "x de y concluídas"
	_wireDlc(root, g) {
		const list = root.querySelector("[data-dlc-list]");
		if (!list) return;
		const sub = list.closest(".sv-block")?.querySelector(".sv-sechead-text > p");
		const hero = root.querySelector("[data-dlc-hero]");
		const recount = () => {
			const items = [...list.querySelectorAll("li")], done = items.filter(li => li.classList.contains("is-done")).length;
			if (sub && /concluídas/.test(sub.textContent)) sub.textContent = `${done} de ${items.length} concluídas`;
			// cabeçalho da aba acompanha na hora: título, números e anel
			if (hero) {
				const U = customJS.SteamVaultUI, total = items.length, pct = total ? Math.round((done / total) * 100) : 0;
				const t = hero.querySelector("[data-hero-title]"); if (t) t.textContent = done === total ? "Todas as DLC concluídas" : `${done} de ${total} concluídas`;
				const sd = hero.querySelector('[data-hero-stat="done"]'); if (sd) sd.innerHTML = `<b>${done}</b><span>${done === 1 ? "concluída" : "concluídas"}</span>`;
				const sl = hero.querySelector('[data-hero-stat="left"]'); if (sl) sl.innerHTML = `<b>${total - done}</b><span>${total - done === 1 ? "pendente" : "pendentes"}</span>`;
				const rv = hero.querySelector("[data-hero-ring-value]"); if (rv) rv.textContent = `${pct}%`;
				const svg = hero.querySelector(".sv-tabhero-ring svg"); if (svg && U?.ring) svg.outerHTML = U.ring(pct, { size: 96, stroke: 7, perfect: pct >= 100 });
			}
			list.querySelectorAll("li").forEach(li => { const st = li.querySelector(".sv-dlclist-state"); if (st) st.textContent = li.classList.contains("is-done") ? "Concluída" : "Pendente"; });
		};
		const paint = (btn, on) => {
			btn.closest("li")?.classList.toggle("is-done", on);
			btn.setAttribute("aria-pressed", String(on));
			btn.setAttribute("aria-label", on ? "Desmarcar DLC" : "Concluir DLC");
			btn.title = on ? "Concluída — toque para desmarcar" : "Marcar como concluída";
		};
		list.addEventListener("click", async e => {
			const btn = e.target.closest("[data-dlc-toggle]");
			if (!btn) return;
			const i = Number(btn.dataset.dlcToggle), on = !btn.closest("li").classList.contains("is-done");
			paint(btn, on); recount();
			customJS.SteamVault?._haptic?.();
			try {
				const file = app.vault.getAbstractFileByPath(g.path);
				if (!file) throw new Error("arquivo não encontrado");
				await app.fileManager.processFrontMatter(file, fm => {
					if (!Array.isArray(fm.dlc) || fm.dlc[i] === undefined) return;
					const cur = fm.dlc[i];
					fm.dlc[i] = typeof cur === "object" && cur ? { ...cur, completed: on } : { title: String(cur || "DLC"), completed: on };
				});
			} catch (err) {
				console.error("Game Library: falha ao atualizar DLC", err);
				paint(btn, !on); recount();
			}
		});
	}

	_sessions(ctx, g) {
		const { U, C } = ctx;
		const add = U.btn("Registrar sessão", { icon: "plus", kind: "primary", size: "sm", action: "manage", attrs: `data-section="sessions" data-path="${U.attr(g.path)}"` });
		const pts = U.btn(g.playthroughs.length ? "Gerenciar zeradas" : "Registrar zerada", { icon: "flag", kind: "secondary", size: "sm", action: "manage", attrs: `data-section="playthroughs" data-path="${U.attr(g.path)}"` });
		const sessions = [...g.sessions].sort((a, b) => C.iso(b.date).localeCompare(C.iso(a.date)));
		const hours = sessions.reduce((s, x) => s + (C.num(x.hours) || 0), 0);
		const longest = sessions.reduce((m, x) => Math.max(m, C.num(x.hours) || 0), 0);
		const ends = g.playthroughs.filter(t => C.iso(t.end)).length;
		const last = sessions[0] ? C.iso(sessions[0].date) : "";
		// diário (3.31.0): sessões + conquistas do dia + marcos, agrupados por data
		const days = new Map();
		const day = d => { if (!days.has(d)) days.set(d, { date: d, sessions: [], ach: [], marks: [] }); return days.get(d); };
		for (const x of sessions) { const d = C.iso(x.date); if (d) day(d).sessions.push(x); }
		for (const a of g.achievements) if (a.unlocked && a.unlockedDate) day(a.unlockedDate).ach.push(a);
		if (g.startDate) day(g.startDate).marks.push(["play", "Começou a jogar"]);
		for (const t of g.playthroughs) if (C.iso(t.end)) day(C.iso(t.end)).marks.push(["flag", "Zerou"]);
		if (g.completionDate && !g.playthroughs.some(t => C.iso(t.end) === g.completionDate)) day(g.completionDate).marks.push(["flag", "Zerou"]);
		if (g.dateAdded) day(g.dateAdded).marks.push(["plus", "Entrou no vault"]);
		// ordem do diário (3.45.0): mais recentes primeiro ou do início ao fim
		const asc = U._store("diaryOrder") === "asc";
		const diary = [...days.values()].sort((a, b) => asc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date));
		const order = diary.length > 1 ? `<div class="sv-segmented sv-diary-order" role="radiogroup" aria-label="Ordem do diário">${[["desc", "Recentes"], ["asc", "Do início"]].map(([k, l]) => `<button type="button" data-diary-order="${k}" class="${(k === "asc") === asc ? "is-active" : ""}" aria-checked="${(k === "asc") === asc}">${l}</button>`).join("")}</div>` : "";
		const hero = this._tabHero(ctx, {
			icon: "clock", tone: "var(--sv-blue)",
			title: sessions.length ? U.plural(sessions.length, "sessão registrada", "sessões registradas") : "Diário de sessões",
			sub: sessions.length ? (last ? `Última sessão ${U.relDate(last)}` : "Seu diário deste jogo") : "Cada sessão soma horas, atualiza “jogado por último” e aparece na atividade",
			stats: sessions.length ? [[U.fmtHours(hours), "no total"], [U.fmtHours(hours / sessions.length), "por sessão"], [longest ? U.fmtHours(longest) : "—", "maior sessão"], [U.fmtNum(ends), ends === 1 ? "zerada" : "zeradas"]] : [],
			actions: `${add}${pts}`
		});
		// mapa de calor do ano (3.33.0): dias com sessão, conquista ou marco
		const miles = this._gameMilestones(ctx, g, sessions);
		const milestones = miles.length >= 2 ? `<section class="sv-block sv-gmiles-block">${U.sectionHead("Marcos", { sub: "Os momentos deste jogo, do primeiro dia até hoje" })}<ol class="sv-gmiles">${miles.map(m => `<li class="sv-gmile">${U.icon(m.icon)}<b>${U.esc(m.title)}</b>${m.text ? `<span>${U.esc(m.text)}</span>` : ""}<time datetime="${U.attr(m.date)}">${U.esc(U.fmtDate(m.date))}</time></li>`).join("")}</ol></section>` : "";
		const yearAgo = (d => { d.setDate(d.getDate() - 364); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })(new Date());
		const heat = new Map(diary.filter(d => d.date >= yearAgo).map(d => [d.date, d.sessions.length + d.ach.length + d.marks.length]));
		const heatmap = heat.size && ctx.I?.heatmap ? `<section class="sv-block sv-gameheat">${U.sectionHead("Seu ano com o jogo", { sub: `${U.plural(heat.size, "dia", "dias")} com atividade nos últimos 12 meses` })}${ctx.I.heatmap(ctx, heat)}</section>` : "";
		return `${hero}
		${milestones}
		${heatmap}
		<section class="sv-block">
			${U.sectionHead("Diário", { count: diary.length || null, sub: diary.length ? "Sessões, conquistas e marcos, dia a dia" : "", action: order })}
			${diary.length ? `<ol class="sv-timeline sv-timeline--tab sv-diary">${U.moreList(diary.map(day => this._diaryDay(ctx, g, day)), 20, asc ? "Mostrar dias seguintes" : "Mostrar dias anteriores")}</ol>`
				: U.empty({ icon: "clock", title: "Nenhuma sessão registrada", text: "Anote o que fez em cada sessão para lembrar onde parou. Use ▶ no topo da ficha para cronometrar.", compact: true })}
		</section>
		<section class="sv-block">
			${U.sectionHead("Zeradas", { count: g.playthroughs.length || null })}
			${g.playthroughs.length ? `<ol class="sv-runs sv-runs--tab">${g.playthroughs.map((t, i) => { const open = !C.iso(t.end); const days = !open && C.iso(t.start) ? C.daysBetween(C.iso(t.start), C.iso(t.end)) : null; return `<li class="${open ? "is-open" : ""}"><span class="sv-runs-n">${i + 1}ª</span><div><b>${open ? (C.iso(t.start) ? `Desde ${U.esc(U.fmtDate(C.iso(t.start)))}` : "Em andamento") : U.esc(U.fmtDate(C.iso(t.end)))}</b><small>${open ? "Em andamento" : days !== null && days >= 0 ? `Levou ${U.esc(this._ovSpan(days))}` : "Concluída"}</small>${t.note ? `<p class="sv-runs-note">${U.esc(t.note)}</p>` : ""}</div><span class="sv-runs-meta">${t.difficulty ? `<span class="sv-tag">${U.esc(t.difficulty)}</span>` : ""}${t.platform ? `<span class="sv-tag">${U.esc(t.platform)}</span>` : ""}</span></li>`; }).join("")}</ol>`
				: U.empty({ icon: "flag", title: "Nenhuma zerada registrada", text: "Registre cada vez que terminar o jogo, com dificuldade e plataforma.", compact: true })}
		</section>`;
	}

	// marcos do jogo (3.45.0): o primeiro de cada coisa e os pontos de virada,
	// em ordem de data; tudo vem das notas (datas de sessões, conquistas e zeradas)
	_gameMilestones(ctx, g, sessions) {
		const { U, C } = ctx;
		const out = [];
		const add = (date, icon, title, text = "") => { if (date) out.push({ date, icon, title, text }); };
		add(g.dateAdded, "plus", "Entrou no vault");
		add(g.startDate, "play", "Começou a jogar");
		const byDate = [...sessions].filter(x => C.iso(x.date)).sort((a, b) => C.iso(a.date).localeCompare(C.iso(b.date)));
		if (byDate.length) add(C.iso(byDate[0].date), "clock", "Primeira sessão", C.num(byDate[0].hours) ? U.fmtHours(byDate[0].hours) : "");
		const longest = byDate.reduce((m, x) => (C.num(x.hours) || 0) > (C.num(m?.hours) || 0) ? x : m, null);
		if (longest && byDate.length > 1 && C.num(longest.hours)) add(C.iso(longest.date), "flame", "Maior sessão", U.fmtHours(longest.hours));
		const unl = g.achievements.filter(a => a.unlocked && a.unlockedDate).sort((a, b) => a.unlockedDate.localeCompare(b.unlockedDate));
		if (unl.length) add(unl[0].unlockedDate, "trophy", "Primeira conquista", unl[0].name);
		const total = g.achievements.length;
		if (total >= 4 && unl.length >= Math.ceil(total / 2)) add(unl[Math.ceil(total / 2) - 1].unlockedDate, "medal", "Metade das conquistas", `${Math.ceil(total / 2)} de ${total}`);
		const rare = unl.filter(a => a.rarity !== null && a.rarity !== undefined).sort((a, b) => a.rarity - b.rarity)[0];
		if (rare && unl.length > 1) add(rare.unlockedDate, "gem", "Conquista mais rara", `${rare.name} (${U.fmtPct(rare.rarity)})`);
		const ends = g.playthroughs.map(t => C.iso(t.end)).filter(Boolean).sort();
		const firstEnd = ends[0] || g.completionDate || "";
		add(firstEnd, "flag", "Zerou");
		if (ends.length > 1) add(ends[ends.length - 1], "refresh", `Zerou de novo (${ends.length}ª vez)`);
		if (total && unl.length === total) add(unl[unl.length - 1].unlockedDate, "sparkles", "100% das conquistas");
		if (byDate.length > 1) add(C.iso(byDate[byDate.length - 1].date), "calendar", "Última sessão");
		const seen = new Set();
		return out.sort((a, b) => a.date.localeCompare(b.date)).filter(m => { const k = m.title + m.date; if (seen.has(k)) return false; seen.add(k); return true; });
	}

	_diaryDay(ctx, g, d) {
		const { U, C } = ctx;
		const icon = d.sessions.length ? "play" : d.ach.length ? "trophy" : (d.marks[0] || ["calendar"])[0];
		const hours = d.sessions.reduce((t, x) => t + (C.num(x.hours) || 0), 0);
		const ach = [...d.ach].sort((a, b) => (a.rarity ?? 101) - (b.rarity ?? 101));
		const sess = d.sessions.map(x => {
			const pr = x.progress !== undefined && x.progress !== "" ? Math.max(0, Math.min(100, Number(x.progress) || 0)) : null;
			return `<div class="sv-diary-session">
				${x.note ? `<p>${U.esc(x.note)}</p>` : `<p class="sv-muted">Sessão${C.num(x.hours) ? ` de ${U.esc(U.fmtHours(x.hours))}` : ""}</p>`}
				${x.mood || pr !== null || x.source === "live" || (d.sessions.length > 1 && C.num(x.hours) && x.note) ? `<footer>${d.sessions.length > 1 && C.num(x.hours) && x.note ? `<span class="sv-timeline-mood">${U.esc(U.fmtHours(x.hours))}</span>` : ""}${x.source === "live" ? `<span class="sv-diary-live">${U.icon("clock")}Cronometrada</span>` : ""}${x.mood ? `<span class="sv-timeline-mood">${U.esc(x.mood)}</span>` : ""}${pr !== null ? `<span class="sv-timeline-progress"><i style="width:${pr}%"></i></span><small>${pr}% da história</small>` : ""}</footer>` : ""}
			</div>`;
		}).join("");
		return `<li class="sv-diary-day"><span class="sv-timeline-dot">${U.icon(icon)}</span><div class="sv-timeline-card">
			<header><time>${U.esc(U.fmtDate(d.date))} <span>· ${U.esc(U.relDate(d.date))}</span></time>${hours ? `<span class="sv-timeline-hours">${U.icon("clock")}${U.fmtHours(hours)}</span>` : ""}</header>
			${sess}
			${ach.length ? `<button type="button" class="sv-diary-ach" data-goto-tab="achievements"><span class="sv-diary-achicons">${ach.slice(0, 6).map(a => `<span class="sv-diary-achicon sv-rarity-${U.attr(C.rarityOf(a) || "common")}">${a.iconSrc ? `<img src="${U.attr(a.iconSrc)}" alt="" loading="lazy" data-sv-img>` : U.icon("trophy")}</span>`).join("")}${ach.length > 6 ? `<span class="sv-diary-achmore">+${ach.length - 6}</span>` : ""}</span><span class="sv-diary-achtext">${ach.length === 1 ? `<b>${U.esc(ach[0].name)}</b>` : `<b>${U.plural(ach.length, "conquista", "conquistas")}</b>${ach[0].rarity !== null && ach[0].rarity !== undefined ? ` · a mais rara: ${U.esc(ach[0].name)} (${U.esc(U.fmtPct(ach[0].rarity))})` : ""}`}</span></button>` : ""}
			${d.marks.length ? `<div class="sv-diary-marks">${d.marks.map(([ic, t]) => `<span>${U.icon(ic)}${U.esc(t)}</span>`).join("")}</div>` : ""}
		</div></li>`;
	}

	_notes(ctx, g) {
		const { U, C } = ctx;
		const manage = U.btn(g.notes.length ? "Gerenciar" : "Adicionar nota", { icon: g.notes.length ? "edit" : "plus", kind: g.notes.length ? "secondary" : "primary", size: "sm", action: "manage", attrs: `data-section="notes" data-path="${U.attr(g.path)}"` });
		const norm = g.notes.map((n, i) => ({ i, text: typeof n === "string" ? n : n?.text || "", cat: typeof n === "object" ? String(n?.category || "") : "", pin: typeof n === "object" && (n?.pinned === true || n?.pinned === "true") }));
		const cats = [...new Set(norm.map(n => n.cat).filter(Boolean))];
		const hero = this._tabHero(ctx, {
			icon: "notebook", tone: "var(--sv-amber, #e9bd52)",
			title: norm.length ? U.plural(norm.length, "nota", "notas") : "Notas",
			sub: norm.length ? (cats.length ? cats.slice(0, 4).join(" · ") : "Dicas, lembretes e teorias deste jogo") : "Dicas, senhas de cofres, onde parou, teorias — tudo fica aqui",
			stats: norm.length ? [[U.fmtNum(norm.length), norm.length === 1 ? "nota" : "notas"], [U.fmtNum(cats.length), cats.length === 1 ? "categoria" : "categorias"], norm.some(n => n.pin) ? ["1", "fixada"] : null].filter(Boolean) : [],
			actions: manage
		});
		if (!norm.length) return `${hero}${U.empty({ icon: "notebook", title: "Sem notas", text: "Escreva a primeira nota. Depois, fixe a mais importante na Visão geral.", compact: true })}`;
		const sorted = [...norm].sort((a, b) => (b.pin - a.pin) || a.i - b.i);
		return `${hero}
			<section class="sv-block">${U.sectionHead("Todas as notas", { count: norm.length })}
			<div class="sv-notes sv-notes--tab">${sorted.map(n => `<article class="sv-note${n.pin ? " is-pinned" : ""}"${n.cat ? ` style="--sv-hue:${C.hashHue(n.cat)}"` : ""}>${n.pin ? `<span class="sv-note-pin" title="Fixada na Visão geral">${U.icon("pin")}</span>` : ""}${n.cat ? `<span class="sv-note-cat">${U.esc(n.cat)}</span>` : ""}<p>${U.esc(n.text)}</p></article>`).join("")}</div></section>`;
	}
}
