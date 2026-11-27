// ==========================================================================
// Game Library — Achievement Hub
//
// A tela Conquistas como um hub de perfis, um por origem (achievementProvider):
//   Todos · Steam · RetroAchievements · Epic Games · GOG · PlayStation ·
//   Xbox · Google Play Games · Native · Custom
//
// Arquitetura
//   · Os DADOS de cada origem vivem no Core (providerDefs + providerStats).
//   · A APRESENTAÇÃO vive aqui, num registro de perfis (profiles()). Cada
//     perfil tem a própria composição; todos usam as peças da Game Library (cards,
//     anéis, barras, tiles, tipografia, espaçamento).
//   · Nova origem = uma entrada em Core.providerDefs. Sem perfil próprio aqui,
//     ela usa o perfil genérico e já aparece nas abas, filtros e números.
//   · Só a aba ativa é montada; as outras, no primeiro toque (Steam e RA
//     leem o cache deles só nessa hora).
//   · Nada de integração inventada: onde não há sync automático, o perfil
//     diz isso e oferece o gerenciamento manual.
//
// Acesso: customJS.SteamVaultHub
// ==========================================================================

class SteamVaultHub {

	get U() { return customJS.SteamVaultUI; }
	get C() { return customJS.SteamVaultCore; }
	get V() { return customJS.SteamVault; }

	// perfil por origem. `render` recebe (ctx, stats da origem, stats gerais).
	profiles() {
		return {
			all: { label: "Todos", render: (ctx, b, st) => this.tabAll(ctx, b, st) },
			steam: { render: (ctx, b) => this.tabSteam(ctx, b) },
			retroachievements: { render: (ctx, b) => this.tabRetro(ctx, b) },
			epic: { render: (ctx, b) => this.tabEpic(ctx, b) },
			gog: { render: (ctx, b) => this.tabGog(ctx, b) },
			playstation: { render: (ctx, b) => this.tabPlayStation(ctx, b) },
			xbox: { render: (ctx, b) => this.tabXbox(ctx, b) },
			googleplay: { render: (ctx, b) => this.tabGooglePlay(ctx, b) },
			native: { render: (ctx, b) => this.tabNative(ctx, b) },
			custom: { render: (ctx, b) => this.tabCustom(ctx, b) }
		};
	}

	// abas visíveis: Todos + cada origem que tem pelo menos um jogo
	// (Sem conquistas / Não configurado são estados, não perfis: ficam nos filtros)
	tabs(ctx, st) {
		const C = this.C;
		const list = [{ id: "all", label: "Todos", count: null }];
		for (const [k, d] of Object.entries(C.providerDefs)) {
			if (d.group === "state" || !st[k]?.games.length) continue;
			list.push({ id: k, label: d.label, short: d.short, count: st[k].games.length });
		}
		return list;
	}

	// ================================================================ página
	async hub(ctx) {
		const { C, U, model } = ctx;
		const st = C.providerStats(model);
		const tabs = this.tabs(ctx, st);
		let active = U._store("hubTab") || "all";
		if (!tabs.some(t => t.id === active)) active = "all";
		const first = await this.renderTab(ctx, active, st);
		const all = st.all;
		const html = `<div class="sv-page sv-hub" data-hub data-pv="${U.attr(active)}">
			<header class="sv-hub-top">
				<div class="sv-hub-title">
					<h1>Conquistas</h1>
					<p>${all.total ? `${U.fmtNum(all.unlocked)} de ${U.fmtNum(all.total)} em ${U.plural(all.known, "jogo", "jogos")}` : "Hub de conquistas de todas as origens"}</p>
				</div>
				<nav class="sv-tabs sv-hubtabs" role="tablist" aria-label="Origem das conquistas">${tabs.map(t => `<button type="button" role="tab" class="sv-tab sv-hubtab sv-achsrc--${U.attr(t.id)}${t.id === active ? " is-active" : ""}" data-hub-tab="${U.attr(t.id)}" aria-selected="${t.id === active}">${U.icon(U.providerIcon(t.id))}<span>${U.esc(t.label)}</span>${t.count !== null ? `<small>${U.fmtNum(t.count)}</small>` : ""}</button>`).join("")}</nav>
			</header>
			${tabs.map(t => `<section class="sv-hubp sv-hubp--${U.attr(t.id)}" data-hub-panel="${U.attr(t.id)}" role="tabpanel"${t.id === active ? "" : " hidden"}>${t.id === active ? first : ""}</section>`).join("")}
		</div>`;
		return { active: "achievements", html, wire: root => this.wire(root, ctx) };
	}

	async renderTab(ctx, id, st = this.C.providerStats(ctx.model)) {
		const prof = this.profiles()[id] || { render: (c, b) => this.tabGeneric(c, b, id) };
		try { return await prof.render(ctx, st[id] || st.all, st); }
		catch (err) {
			console.error("Game Library: aba do hub", id, err);
			return `<div class="sv-pad">${this.U.empty({ icon: "alert", title: "Não foi possível montar esta aba", text: String(err?.message || err) })}</div>`;
		}
	}

	wire(root, ctx) {
		const hub = root.querySelector("[data-hub]");
		if (!hub) return;
		const show = async id => {
			const tab = hub.querySelector(`[data-hub-tab="${CSS.escape(id)}"]`);
			const panel = hub.querySelector(`[data-hub-panel="${CSS.escape(id)}"]`);
			if (!tab || !panel) return;
			hub.querySelectorAll("[data-hub-tab]").forEach(t => { const on = t === tab; t.classList.toggle("is-active", on); t.setAttribute("aria-selected", String(on)); });
			hub.querySelectorAll("[data-hub-panel]").forEach(p => { p.hidden = p !== panel; });
			hub.dataset.pv = id;
			this.U._store("hubTab", id);
			tab.scrollIntoView?.({ block: "nearest", inline: "nearest", behavior: "smooth" });
			if (!panel.dataset.ready) {
				panel.dataset.ready = "1";
				panel.innerHTML = `<div class="sv-hub-loading" aria-busy="true"><span></span><span></span><span></span></div>`;
				panel.innerHTML = await this.renderTab(ctx, id);
				this.wirePanel(panel, ctx, true);
			}
		};
		hub.querySelector(".sv-hubtabs")?.addEventListener("click", e => {
			const t = e.target.closest("[data-hub-tab]");
			if (!t || t.classList.contains("is-active")) return;
			this.V._haptic?.(8);
			show(t.dataset.hubTab);
		});
		// atalhos internos (distribuição por origem → aba)
		hub.addEventListener("click", e => {
			const go = e.target.closest("[data-hub-go]");
			if (!go) return;
			e.preventDefault();
			show(go.dataset.hubGo);
			hub.querySelector(".sv-hub-top")?.scrollIntoView?.({ block: "start", behavior: "smooth" });
		});
		const first = hub.querySelector("[data-hub-panel]:not([hidden])");
		if (first) { first.dataset.ready = "1"; this.wirePanel(first, ctx, false); }
	}

	// liga o que a aba precisa. `late` = montada depois da tela (as barras e
	// anéis não passaram pela entrada animada: vão direto ao estado final)
	wirePanel(panel, ctx, late) {
		const V = this.V;
		if (late) {
			V._wireImages?.(panel);
			V._wireHorizontalScrollers?.(panel);
			requestAnimationFrame(() => panel.querySelectorAll(".sv-progress, .sv-bar-track, .sv-stackbar, .sv-genre-share").forEach(el => el.classList.add("is-drawn")));
		}
		// itens que ficaram para depois da primeira pintura
		// em partes pequenas, para a rolagem não travar em listas de milhares
		if (panel.querySelector("template[data-hub-more]")) {
			const later = fn => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 300 }) : setTimeout(fn, 32));
			const step = () => {
				if (!panel.isConnected) return;
				const t = panel.querySelector("template[data-hub-more]");
				if (!t) return;
				const frag = document.createDocumentFragment();
				for (let i = 0; i < 60 && t.content.firstChild; i++) frag.appendChild(t.content.firstChild);
				this.V?._wireImages?.(frag);
				t.before(frag);
				if (!t.content.firstChild) t.remove();
				later(step);
			};
			later(step);
		}
		// filtros de progresso / categoria: só escondem itens já montados
		panel.querySelectorAll("[data-hub-filter]").forEach(bar => {
			const scope = bar.closest("[data-hub-list]") || panel;
			bar.addEventListener("click", e => {
				const b = e.target.closest("button[data-value]");
				if (!b) return;
				this.flushMore(scope);
				bar.querySelectorAll("button").forEach(x => { const on = x === b; x.classList.toggle("is-active", on); x.setAttribute("aria-pressed", String(on)); });
				const key = bar.dataset.hubFilter, v = b.dataset.value;
				let shown = 0;
				scope.querySelectorAll(`[data-${key}]`).forEach(it => {
					if (it === bar || bar.contains(it)) return;
					const ok = !v || (it.dataset[key] || "").split("|").includes(v);
					it.hidden = !ok; if (ok) shown++;
				});
				const none = scope.querySelector("[data-hub-none]");
				if (none) none.hidden = shown > 0;
			});
		});
	}

	// listas longas (3.20.0): os primeiros itens entram com a tela; o resto
	// fica num <template> e é montado depois da primeira pintura
	lazyItems(list, row, first = 60) {
		if (list.length <= first * 1.5) return list.map(row).join("");
		return `${list.slice(0, first).map(row).join("")}<template data-hub-more>${list.slice(first).map(row).join("")}</template>`;
	}

	flushMore(scope) {
		scope.querySelectorAll("template[data-hub-more]").forEach(t => {
			const box = t.parentElement;
			const frag = t.content;
			this.V?._wireImages?.(frag);
			t.remove();
			box.appendChild(frag);
		});
	}

	// ============================================================ peças comuns
	provBadge(k) {
		const U = this.U, d = this.C.providerDefs[k];
		return d ? `<span class="sv-hub-pv sv-achsrc--${U.attr(k)}"><i aria-hidden="true"></i>${U.esc(d.short || d.label)}</span>` : "";
	}

	// ordem útil para listas: em andamento (mais perto do fim primeiro),
	// 100%, zeradas, sem número
	sortGames(games) {
		const C = this.C, rank = { partial: 0, perfect: 1, zero: 2, unknown: 3, none: 4 };
		return [...games].sort((a, b) => rank[C.progressBucket(a)] - rank[C.progressBucket(b)] || (b.ach.pct ?? -1) - (a.ach.pct ?? -1) || a.title.localeCompare(b.title));
	}

	// chips de progresso (só os que existem). `key` = atributo filtrado.
	progressChips(games, { key = "progress" } = {}) {
		const U = this.U, C = this.C;
		const n = { perfect: 0, partial: 0, zero: 0, unknown: 0 };
		for (const g of games) { const b = C.progressBucket(g); if (b in n) n[b]++; }
		const defs = [["perfect", "Concluídos", "Todas desbloqueadas"], ["partial", "Em andamento", "Parcialmente desbloqueadas"], ["zero", "0%", "Nenhuma desbloqueada"], ["unknown", "Sem dados", "Sem contagem de conquistas"]];
		const present = defs.filter(([k]) => n[k]);
		if (present.length < 2) return "";
		return `<div class="sv-hubchips" data-hub-filter="${key}" role="group" aria-label="Filtrar por progresso">
			<button type="button" class="is-active" data-value="" aria-pressed="true">Todos<span>${games.length}</span></button>
			${present.map(([k, label, title]) => `<button type="button" data-value="${k}" aria-pressed="false" title="${U.attr(title)}">${U.esc(label)}<span>${n[k]}</span></button>`).join("")}
		</div>`;
	}

	// linha padrão de progresso (a mesma da antiga tela de conquistas)
	gameRow(ctx, g, { tone = "", badge = false, extra = "" } = {}) {
		const { U, C } = ctx;
		const a = g.ach, known = a.state === "known" && a.total, pctOnly = a.state === "pct";
		return `<a class="sv-achgame${a.perfect ? " is-perfect" : ""}" data-progress="${C.progressBucket(g)}" ${U.openAttrs(g.path)}>
			${U.cover(g, { cls: "sv-cover--xs" })}
			<span class="sv-achgame-text"><b>${U.esc(g.title)}</b><span class="sv-meta">${known ? `<span>${U.fmtNum(a.unlocked)} de ${U.fmtNum(a.total)}</span>` : pctOnly ? `<span>Porcentagem da GOG</span>` : `<span>Sem contagem</span>`}${known && g.achievements.length ? (S => S.multi ? `<span class="sv-achgame-sets">${S.completedSets}/${S.sets.length} conjuntos</span>` : "")(C.achSets(g)) : ""}${badge ? this.provBadge(g.provider) : ""}${extra}</span></span>
			<span class="sv-achgame-bar">${known || pctOnly ? U.progressBar(a.pct, { tone: a.perfect ? "gold" : tone }) : ""}</span>
			<span class="sv-achgame-pct sv-num">${a.perfect ? U.icon("gem") : ""}${known || pctOnly ? U.fmtPct(a.pctRound) : "—"}</span>
		</a>`;
	}

	listBlock(ctx, title, games, row, { sub = "", action = "", cls = "" } = {}) {
		const U = this.U;
		const sorted = this.sortGames(games);
		return `<section class="sv-block sv-hublist ${cls}" data-hub-list>
			${U.sectionHead(title, { count: games.length, sub, action })}
			${this.progressChips(sorted)}
			<div class="sv-hublist-items">${this.lazyItems(sorted, row)}</div>
			<p class="sv-muted sv-hub-none" data-hub-none hidden>Nenhum jogo neste filtro.</p>
		</section>`;
	}

	recentTiles(ctx, recent, n = 6) {
		const U = this.U;
		return recent.length ? `<div class="sv-achlist sv-achlist--compact">${recent.slice(0, n).map(({ a, g }) => U.achievementTile(a, { showGame: g })).join("")}</div>` : "";
	}

	rareWall(ctx, games, n = 8, tone = "") {
		const U = this.U;
		const rare = games.flatMap(g => g.achievements.filter(a => a.unlocked && a.rarity !== null).map(a => ({ a, g }))).sort((x, y) => x.a.rarity - y.a.rarity).slice(0, n);
		if (!rare.length) return "";
		return `<div class="sv-rarewall sv-rarewall--compact">${rare.map(({ a, g }) => `<a class="sv-medallion sv-rarity-${U.rarityTier(a.rarity)}" ${U.openAttrs(a.path || g.path)}${tone ? ` style="--sv-rarity:${tone}"` : ""}><div>${a.iconSrc ? `<img src="${U.attr(a.iconSrc)}" alt="" loading="lazy" data-sv-img>` : U.icon("trophy")}</div><span><b>${U.esc(a.name)}</b><small>${U.esc(g.title)}</small><em>${U.fmtPct(a.rarity)}</em></span></a>`).join("")}</div>`;
	}

	manageBtn(g, { label = "Gerenciar", kind = "ghost", icon = "edit" } = {}) {
		return this.U.btn(label, { icon, kind, size: "sm", action: "ach-manage", title: label ? "" : `Gerenciar conquistas de ${g.title}`, attrs: `data-path="${this.U.attr(g.path)}"` });
	}

	// plataforma integrada: perfil conectado (ou convite para conectar)
	platformStrip(ctx, k, b) {
		const U = this.U, PL = ctx.PL;
		const cfg = PL?.getConfig(k);
		if (!cfg) return this.manualNote(k);
		const p = PL.get(k), autoN = b.games.filter(g => this.C.autoSync(g)).length;
		if (p.kind === "manual") return `<div class="sv-hub-connect sv-achsrc--${k}">
			<a class="sv-hub-connect-ico" ${U.openAttrs(p.page)}>${U.icon("user")}</a>
			<div><b><a ${U.openAttrs(p.page)}>${U.esc(cfg.name || `Perfil ${p.label}`)}</a></b><p>Sem leitura automática legítima: registre à mão ou importe uma lista de títulos.</p></div>
			${U.btn("", { icon: "plus", kind: "ghost", size: "sm", action: "plat-import-list", title: `Importar jogos de ${p.label}`, attrs: `data-platform="${k}"` })}
		</div>`;
		if (!cfg.configured) return `<div class="sv-hub-connect sv-achsrc--${k}">
			<span class="sv-hub-connect-ico">${U.icon("link")}</span>
			<div><b>Conecte seu perfil ${U.esc(p.label)}</b><p>${U.esc(p.syncs.slice(0, 3).join(" · "))}. Jogos em modo Manual continuam sendo seus.</p></div>
			${U.btn("Conectar", { icon: "link", kind: "primary", size: "sm", action: "plat-connect", attrs: `data-platform="${k}"` })}
		</div>`;
		return `<div class="sv-hub-connect is-on sv-achsrc--${k}">
			<a class="sv-hub-connect-ava" ${U.openAttrs(p.page)}>${U.icon("user")}${cfg.avatar ? `<img src="${U.attr(cfg.avatar)}" alt="" data-sv-img>` : ""}</a>
			<div><b><a ${U.openAttrs(p.page)}>${U.esc(cfg.name)}</a></b><p>${cfg.enabled ? `${cfg.lastSync ? `Sincronizado ${U.esc(U.relDate(cfg.lastSync.slice(0, 10)))}` : "Ainda não sincronizado"} · ${U.plural(autoN, "jogo automático", "jogos automáticos")}` : "Integração desativada"}</p></div>
			${cfg.enabled ? U.btn("", { icon: "refresh", kind: "ghost", size: "sm", action: "plat-sync", title: `Sincronizar ${p.label}`, attrs: `data-platform="${k}"` }) : ""}
		</div>`;
	}

	// sem sync automático: diz com clareza e aponta o gerenciamento manual
	manualNote(k) {
		const U = this.U, d = this.C.providerDefs[k];
		return `<p class="sv-hub-syncnote">${U.icon("info")}<span>${d.integration ? "" : `${U.esc(d.label)} ainda não tem sincronização automática na Game Library. `}As conquistas são registradas por você, jogo a jogo.</span></p>`;
	}

	emptyProvider(ctx, k, b) {
		const U = this.U, d = this.C.providerDefs[k];
		const g = b.games[0];
		return U.empty({ icon: "trophy", title: `Nenhuma conquista de ${d.label} registrada`, text: `${U.plural(b.games.length, "jogo usa", "jogos usam")} esta origem. Registre as conquistas de cada um e marque as que desbloquear.`,
			action: b.games.length > 1 ? U.btn("Escolher jogo", { icon: "plus", kind: "primary", action: "ach-manage-pick", attrs: `data-provider="${U.attr(k)}"` }) : g ? this.manageBtn(g, { label: "Registrar conquistas", kind: "primary", icon: "plus" }) : "" });
	}

	pct(b) { return b.pct === null ? null : Math.floor(b.pct); }

	// ============================================================== TODOS
	tabAll(ctx, b, st) {
		const { U, C } = ctx;
		const dist = Object.keys(C.providerDefs).filter(k => st[k].total > 0).map(k => ({ k, b: st[k] })).sort((x, y) => y.b.total - x.b.total);
		const inProgress = this.sortGames(b.games.filter(g => C.progressBucket(g) === "partial")).slice(0, 6);
		const withCount = b.games.filter(g => g.ach.state === "known" && g.ach.total);
		// "Em andamento" só quando acrescenta algo à lista completa logo abaixo
		// (com poucos jogos as duas listas mostravam os mesmos itens)
		const showProgress = inProgress.length > 0 && withCount.length > inProgress.length + 2;
		return `<section class="sv-hubhero sv-hubhero--all">
			<div class="sv-hubhero-ring">${U.ring(b.pct ?? 0, { size: 116, stroke: 7, perfect: b.pct === 100 })}<div><b class="sv-num">${U.fmtPct(this.pct(b))}</b><span>progresso</span></div></div>
			<dl class="sv-hub-kpis">
				<div><dt>Conquistas</dt><dd class="sv-num">${U.fmtNum(b.total)}</dd></div>
				<div><dt>Desbloqueadas</dt><dd class="sv-num">${U.fmtNum(b.unlocked)}</dd></div>
				<div><dt>Concluídos</dt><dd class="sv-num is-gold">${U.fmtNum(b.perfect)}</dd></div>
				<div><dt>Em andamento</dt><dd class="sv-num">${U.fmtNum(b.partial)}</dd></div>
			</dl>
		</section>
		<div class="sv-pad">
			${dist.length ? `<section class="sv-block sv-hubdist">
				${U.sectionHead("Por origem", { sub: "Toque para abrir o perfil" })}
				<div class="sv-stackbar sv-hubdist-bar" role="img" aria-label="Conquistas por origem">${dist.map(({ k, b: x }) => `<span class="sv-achsrc--${U.attr(k)}" style="flex:${x.total}" title="${U.attr(C.providerLabel(k))}: ${U.fmtNum(x.total)}"></span>`).join("")}</div>
				<div class="sv-hubdist-rows">${dist.map(({ k, b: x }) => `<button type="button" class="sv-hubdist-row sv-achsrc--${U.attr(k)}" data-hub-go="${U.attr(k)}"><span class="sv-hubdist-ico" aria-hidden="true">${U.icon(U.providerIcon(k))}</span><span class="sv-hubdist-name">${U.esc(C.providerLabel(k))}</span><b class="sv-num">${U.fmtNum(x.total)}</b><small>${U.fmtNum(x.unlocked)} desbloqueadas · ${U.fmtPct(this.pct(x))}</small></button>`).join("")}</div>
			</section>` : ""}
			${b.total ? (showProgress ? `<div class="sv-split">
				<section class="sv-split-main">${U.sectionHead("Em andamento", { sub: "Mais perto dos 100% primeiro" })}<div class="sv-achgames">${inProgress.map(g => this.gameRow(ctx, g, { badge: st.mixed })).join("")}</div></section>
				<aside class="sv-split-side">${b.recent.length ? `${U.sectionHead("Recentes")}${this.recentTiles(ctx, b.recent, 6)}` : ""}</aside>
			</div>` : b.recent.length ? `<section class="sv-block">${U.sectionHead("Recentes")}${this.recentTiles(ctx, b.recent, 6)}</section>` : "") : U.empty({ icon: "trophy", title: "Nenhuma conquista registrada", text: "Sincronize a Steam ou o RetroAchievements, ou registre conquistas na aba Conquistas de um jogo.", action: `<a class="sv-btn sv-btn--primary" ${U.openAttrs("Dashboard/Biblioteca")}>${U.icon("grid")}<span>Biblioteca</span></a>` })}
			${withCount.length ? this.listBlock(ctx, "Progresso por jogo", withCount, g => this.gameRow(ctx, g, { badge: st.mixed })) : ""}
		</div>`;
	}

	// ============================================================== STEAM
	// o perfil Steam que já existe (mesmo hero, mesma subnavegação), com o
	// recorte de conquistas das fichas de origem Steam
	async tabSteam(ctx, b) {
		const { U, S, SP } = ctx;
		if (!SP || !S) return this.tabGeneric(ctx, b, "steam");
		const cfg = S.getConfig();
		const profile = await S.readProfileCache().catch(() => null);
		const rare = this.rareWall(ctx, b.games, 8);
		return `<div class="sv-hub-steam">${SP.profileHero(ctx, cfg, profile)}</div>
		<div class="sv-pad">
			${SP.subnav(ctx, "")}
			${rare ? `<section class="sv-block">${U.sectionHead("Mais raras desbloqueadas", { action: SP.origin("vault") })}${rare}</section>` : ""}
			<div class="sv-split">
				<section class="sv-split-main">${b.total ? this.listBlock(ctx, "Progresso nos jogos Steam", b.games, g => this.gameRow(ctx, g), { action: `<a class="sv-link" ${U.openAttrs("Dashboard/Steam Vitrine")}>Vitrine</a>` }) : this.emptySynced(ctx, "steam", b)}</section>
				<aside class="sv-split-side">${b.recent.length ? `${U.sectionHead("Desbloqueadas recentemente")}${this.recentTiles(ctx, b.recent, 8)}` : ""}</aside>
			</div>
		</div>`;
	}

	emptySynced(ctx, k, b) {
		const U = this.U;
		const auto = b.games.filter(g => this.C.autoSync(g)).length;
		return U.empty({ icon: "trophy", title: "Nenhuma conquista sincronizada ainda", text: auto ? "Sincronize para trazer o progresso dos seus jogos." : "Os jogos desta origem estão em sincronização manual.",
			action: auto ? U.btn("Sincronizar", { icon: "refresh", kind: k === "steam" ? "primary" : "ra", action: k === "steam" ? "steam-sync" : "ra-sync" }) : "" });
	}

	// ==================================================== RETROACHIEVEMENTS
	async tabRetro(ctx, b) {
		const { U, R, RP } = ctx;
		if (!R || !RP) return this.tabGeneric(ctx, b, "retroachievements");
		const cfg = R.getConfig();
		const cache = cfg.configured ? await R.readCache().catch(() => null) : null;
		const rare = this.rareWall(ctx, b.games, 8, "var(--sv-gold)");
		const hc = b.games.reduce((s, g) => s + g.achievements.filter(a => a.unlocked && a.hardcore).length, 0);
		return `<div class="sv-hub-retro">${RP.hero(ctx, cfg, cache, { compact: true })}</div>
		<div class="sv-pad">
			${RP.subnav(ctx, "")}
			${b.total ? `<section class="sv-insights sv-insights--retro">
				<div class="sv-insight"><b>${U.fmtNum(b.unlocked)}<small> / ${U.fmtNum(b.total)}</small></b><p>conquistas desbloqueadas nos jogos RA do vault ${RP.origin("vault")}</p></div>
				<div class="sv-insight"><b>${U.fmtNum(hc)}</b><p>em hardcore ${RP.origin("vault")}</p></div>
				<div class="sv-insight"><b>${U.fmtNum(b.perfect)}</b><p>${b.perfect === 1 ? "jogo" : "jogos"} com todas as conquistas ${RP.origin("vault")}</p></div>
				<div class="sv-insight"><b>${U.fmtNum(b.points)}<small> / ${U.fmtNum(b.pointsTotal)}</small></b><p>pontos das conquistas registradas ${RP.origin("vault")}</p></div>
			</section>` : ""}
			${rare ? `<section class="sv-block">${U.sectionHead("Mais raras", { action: RP.origin("vault") })}${rare}</section>` : ""}
			${b.total ? this.listBlock(ctx, "Progresso nos jogos RA", b.games, g => this.gameRow(ctx, g, { tone: "gold", extra: g.ra.award ? RP.awardTag(ctx, g.ra.award) : "" }), { cls: "sv-hublist--retro" }) : this.emptySynced(ctx, "retroachievements", b)}
		</div>`;
	}

	// ============================================================== EPIC
	// vitrine escura e tipográfica: um destaque grande e cartões largos
	tabEpic(ctx, b) {
		const { U, C } = ctx;
		// destaque só quando há o que destacar (um jogo com conquistas)
		const spot = this.sortGames(b.games).find(g => g.ach.state === "known" && g.ach.total) || null;
		const rest = this.sortGames(b.games).filter(g => g !== spot);
		const card = (g, big = false) => {
			const art = g.images.background || g.images.featured || g.images.cover;
			const a = g.ach, known = a.state === "known" && a.total;
			return `<article class="sv-ep-card${big ? " sv-ep-card--spot" : ""}" data-progress="${C.progressBucket(g)}" style="--sv-hue:${g.hue}">
				<a class="sv-ep-art" ${U.openAttrs(g.path)} aria-label="${U.attr(g.title)}">${art ? `<img src="${U.attr(art)}" alt="" loading="lazy" data-sv-img style="object-position:${g.framing.x}% ${g.framing.y}%">` : `<span class="sv-ep-fallback" aria-hidden="true">${U.esc(g.title)}</span>`}<span class="sv-ep-shade"></span></a>
				<div class="sv-ep-body">
					${big ? `<span class="sv-ep-eyebrow">Em destaque</span>` : ""}
					<a class="sv-ep-title" ${U.openAttrs(g.path)}>${U.esc(g.title)}</a>
					<div class="sv-ep-meta">${known ? `<span class="sv-num">${U.fmtNum(a.unlocked)}/${U.fmtNum(a.total)}</span>` : ""}<span class="sv-ep-sub">${known ? U.fmtPct(a.pctRound) : "Sem conquistas registradas"}</span>${this.manageBtn(g, { label: big ? "Gerenciar" : "", kind: "glass" })}</div>
					${known ? `<div class="sv-ep-bar"><span style="width:${a.pct}%"></span></div>` : ""}
				</div>
			</article>`;
		};
		return `<section class="sv-hubhero sv-ep-hero">
			<span class="sv-ep-kicker">Epic Games</span>
			<h2 class="sv-ep-h">Sua biblioteca</h2>
			<dl class="sv-ep-strip">
				<div><dt>Desbloqueadas</dt><dd class="sv-num">${U.fmtNum(b.unlocked)}</dd></div>
				<div><dt>Total</dt><dd class="sv-num">${U.fmtNum(b.total)}</dd></div>
				<div><dt>Progresso</dt><dd class="sv-num">${U.fmtPct(this.pct(b))}</dd></div>
				<div><dt>100%</dt><dd class="sv-num">${U.fmtNum(b.perfect)}</dd></div>
			</dl>
		</section>
		<div class="sv-pad">
			${this.platformStrip(ctx, "epic", b)}
			${!b.total && !b.games.some(g => g.achievements.length) ? this.emptyProvider(ctx, "epic", b) : ""}
			${spot ? card(spot, true) : ""}
			${rest.length ? `<section class="sv-block" data-hub-list>
				${U.sectionHead(spot ? "Mais na biblioteca" : "Biblioteca", { count: rest.length })}
				${this.progressChips(rest)}
				<div class="sv-ep-grid">${rest.map(g => card(g)).join("")}</div>
				<p class="sv-muted sv-hub-none" data-hub-none hidden>Nenhum jogo neste filtro.</p>
			</section>` : ""}
			${b.recent.length ? `<section class="sv-block">${U.sectionHead("Recentes")}${this.recentTiles(ctx, b.recent, 6)}</section>` : ""}
		</div>`;
	}

	// ============================================================== GOG
	// estantes por estado: em progresso, completos, a começar
	tabGog(ctx, b) {
		const { U, C } = ctx;
		const withPct = b.games.filter(g => (g.ach.state === "known" && g.ach.total) || g.ach.state === "pct");
		const avg = withPct.length ? Math.floor(withPct.reduce((s, g) => s + (g.ach.pct || 0), 0) / withPct.length) : null;
		const hours = b.games.reduce((s, g) => s + (g.playtime.hours || 0), 0);
		const shelves = [["partial", "Em progresso"], ["perfect", "Concluídos"], ["zero", "A começar"], ["unknown", "Sem conquistas registradas"]]
			.map(([k, label]) => [k, label, this.sortGames(b.games.filter(g => C.progressBucket(g) === k))]).filter(x => x[2].length);
		const row = g => {
			const a = g.ach, known = (a.state === "known" && a.total) || a.state === "pct";
			return `<div class="sv-gog-row">
				<a ${U.openAttrs(g.path)}>${U.cover(g, { cls: "sv-cover--xs" })}</a>
				<a class="sv-gog-text" ${U.openAttrs(g.path)}><b>${U.esc(g.title)}</b><small class="sv-meta"><span>${g.playtime.hours ? U.esc(U.fmtHours(g.playtime.hours)) : U.esc(g.platform)}</span>${a.state === "known" && a.total ? `<span>${U.fmtNum(a.unlocked)} de ${U.fmtNum(a.total)}</span>` : a.state === "pct" ? "<span>GOG</span>" : ""}</small>${known ? `<span class="sv-gog-bar"><span style="width:${a.pct}%"></span></span>` : ""}</a>
				<span class="sv-gog-pct sv-num">${known ? U.fmtPct(a.pctRound) : "—"}</span>
				${this.manageBtn(g, { label: "" })}
			</div>`;
		};
		return `<section class="sv-hubhero sv-gog-hero">
			<div class="sv-gog-seal">${U.ring(b.total ? b.pct : avg ?? 0, { size: 104, stroke: 6 })}<div><b class="sv-num">${U.fmtPct(b.total ? this.pct(b) : avg)}</b></div></div>
			<div class="sv-gog-text-hero">
				<span class="sv-gog-kicker">GOG</span>
				<h2>Sua coleção</h2>
				<p>${b.total ? `${U.fmtNum(b.unlocked)} de ${U.fmtNum(b.total)} conquistas` : avg !== null ? `média de ${avg}% das conquistas` : "conquistas ainda não registradas"} · ${U.plural(b.games.length, "jogo", "jogos")}${hours ? ` · ${U.fmtHours(hours)}` : ""} · ${U.fmtNum(b.perfect)} completos</p>
			</div>
		</section>
		<div class="sv-pad">
			${this.platformStrip(ctx, "gog", b)}
			${!b.total && !withPct.length && !b.games.some(g => g.achievements.length) && !b.games.some(g => C.autoSync(g)) ? this.emptyProvider(ctx, "gog", b) : ""}
			${shelves.map(([k, label, list]) => `<section class="sv-block sv-gog-shelf sv-gog-shelf--${k}"><h3 class="sv-gog-shelfhead"><i aria-hidden="true"></i>${U.esc(label)}<span>${list.length}</span></h3><div class="sv-gog-rows">${list.map(row).join("")}</div></section>`).join("")}
		</div>`;
	}

	// ========================================================= PLAYSTATION
	// troféus por grau. O grau vem da categoria (Platina/Ouro/Prata/Bronze)
	// definida no editor — a Game Library não adivinha grau pela raridade.
	grade(a) {
		const k = this.C.normalizeKey(a.category);
		return /^(platina|platinum)/.test(k) ? "platinum" : /^(ouro|gold)/.test(k) ? "gold" : /^(prata|silver)/.test(k) ? "silver" : /^bronze/.test(k) ? "bronze" : "";
	}

	tabPlayStation(ctx, b) {
		const { U, C } = ctx;
		const grades = [["platinum", "Platina"], ["gold", "Ouro"], ["silver", "Prata"], ["bronze", "Bronze"]];
		const count = (list, gr) => { const x = list.filter(a => this.grade(a) === gr); return { t: x.length, u: x.filter(a => a.unlocked).length }; };
		const allAch = b.games.flatMap(g => g.achievements);
		const noGrade = allAch.filter(a => !this.grade(a)).length;
		const row = g => {
			const a = g.ach, known = a.state === "known" && a.total;
			const dots = grades.map(([gr, label]) => { const c = count(g.achievements, gr); return c.t ? `<span class="sv-ps-dot sv-ps--${gr}" title="${label}: ${c.u} de ${c.t}">${U.icon("trophy")}${c.u}</span>` : ""; }).join("");
			return `<a class="sv-ps-row" data-progress="${C.progressBucket(g)}" ${U.openAttrs(g.path)}>
				${U.cover(g, { cls: "sv-cover--xs" })}
				<span class="sv-ps-text"><b>${U.esc(g.title)}</b><span class="sv-ps-dots">${dots || `<small class="sv-muted">${known ? `${U.fmtNum(a.unlocked)} de ${U.fmtNum(a.total)}` : "Sem troféus registrados"}</small>`}</span></span>
				<span class="sv-ps-prog">${known ? `<span class="sv-ps-bar"><span style="width:${a.pct}%"></span></span><b class="sv-num">${U.fmtPct(a.pctRound)}</b>` : ""}</span>
			</a>`;
		};
		return `<section class="sv-hubhero sv-ps-hero">
			<div class="sv-ps-level">${U.ring(b.pct ?? 0, { size: 96, stroke: 5 })}<div><b class="sv-num">${U.fmtPct(this.pct(b))}</b><span>troféus</span></div></div>
			<div class="sv-ps-head">
				<span class="sv-ps-kicker">PlayStation</span>
				<h2>Troféus</h2>
				<ul class="sv-ps-cases">${grades.map(([gr, label]) => { const c = count(allAch, gr); return `<li class="sv-ps--${gr}"><span class="sv-ps-cup">${U.icon("trophy")}</span><b class="sv-num">${U.fmtNum(c.u)}</b><small>${label}${c.t ? ` · ${U.fmtNum(c.t)}` : ""}</small></li>`; }).join("")}</ul>
			</div>
		</section>
		<div class="sv-pad">
			${this.platformStrip(ctx, "playstation", b)}
			${noGrade && allAch.length ? `<p class="sv-hub-syncnote">${U.icon("medal")}<span>${U.plural(noGrade, "troféu sem grau", "troféus sem grau")}. Defina Platina, Ouro, Prata ou Bronze na categoria, no editor de conquistas.</span></p>` : ""}
			${!allAch.length ? this.emptyProvider(ctx, "playstation", b) : ""}
			${this.listBlock(ctx, "Jogos", b.games, row, { cls: "sv-hublist--ps" })}
			${b.recent.length ? `<section class="sv-block">${U.sectionHead("Troféus recentes")}<div class="sv-ps-recent">${b.recent.slice(0, 8).map(({ a, g }) => { const gr = this.grade(a); return `<a class="sv-ps-trophy sv-ps--${gr || "none"}" ${U.openAttrs(a.path || g.path)}><span class="sv-ps-cup">${a.iconSrc ? `<img src="${U.attr(a.iconSrc)}" alt="" loading="lazy" data-sv-img>` : U.icon("trophy")}</span><span><b>${U.esc(a.name)}</b><small>${U.esc(g.title)}${gr ? ` · ${U.esc(grades.find(x => x[0] === gr)[1])}` : ""}</small></span><time>${U.esc(U.fmtDate(a.unlockedDate, { year: false }))}</time></a>`; }).join("")}</div></section>` : ""}
		</div>`;
	}

	// ============================================================== XBOX
	// Gamerscore = soma dos pontos (G) que você registrou; mosaico de jogos
	tabXbox(ctx, b) {
		const { U, C } = ctx;
		const hasG = b.pointsTotal > 0;
		const tile = g => {
			const a = g.ach, known = a.state === "known" && a.total;
			const gEarned = g.achievements.reduce((s, x) => s + (x.unlocked ? x.points || 0 : 0), 0), gTotal = g.achievements.reduce((s, x) => s + (x.points || 0), 0);
			return `<a class="sv-xb-tile" data-progress="${C.progressBucket(g)}" ${U.openAttrs(g.path)} style="--sv-hue:${g.hue}">
				${g.images.cover ? `<img src="${U.attr(g.images.cover)}" alt="" loading="lazy" data-sv-img>` : `<span class="sv-xb-fallback">${U.esc(g.title.charAt(0))}</span>`}
				<span class="sv-xb-info"><b>${U.esc(g.title)}</b><small class="sv-num">${gTotal ? `<i>G</i>${U.fmtNum(gEarned)}/${U.fmtNum(gTotal)}` : known ? `${U.fmtNum(a.unlocked)}/${U.fmtNum(a.total)}` : "—"}</small>${known ? `<span class="sv-xb-bar"><span style="width:${a.pct}%"></span></span>` : ""}</span>
			</a>`;
		};
		return `<section class="sv-hubhero sv-xb-hero">
			<div class="sv-xb-score">
				<span class="sv-xb-kicker">Xbox</span>
				<b class="sv-num"><i>G</i>${hasG ? U.fmtNum(b.points) : "—"}</b>
				<small>${hasG ? `G nos jogos do vault, de ${U.fmtNum(b.pointsTotal)} possíveis` : "Gamerscore: cadastre as conquistas e os G na ficha do jogo (uma a uma ou em lote)"}</small>
			</div>
			<dl class="sv-xb-stats">
				<div><dt>Conquistas</dt><dd class="sv-num">${U.fmtNum(b.unlocked)}<small>/${U.fmtNum(b.total)}</small></dd></div>
				<div><dt>Progresso</dt><dd class="sv-num">${U.fmtPct(this.pct(b))}</dd></div>
				<div><dt>100%</dt><dd class="sv-num">${U.fmtNum(b.perfect)}</dd></div>
			</dl>
		</section>
		<div class="sv-pad">
			${this.platformStrip(ctx, "xbox", b)}
			${!b.games.some(g => g.achievements.length) && !b.games.some(g => this.C.autoSync(g)) ? this.emptyProvider(ctx, "xbox", b) : ""}
			<section class="sv-block" data-hub-list>
				${U.sectionHead("Jogos", { count: b.games.length })}
				${this.progressChips(b.games)}
				<div class="sv-xb-tiles">${this.sortGames(b.games).map(tile).join("")}</div>
				<p class="sv-muted sv-hub-none" data-hub-none hidden>Nenhum jogo neste filtro.</p>
			</section>
			${b.recent.length ? `<section class="sv-block">${U.sectionHead("Recentes")}<div class="sv-xb-recent">${b.recent.slice(0, 8).map(({ a, g }) => `<a class="sv-xb-ach" ${U.openAttrs(a.path || g.path)}><span class="sv-xb-achicon">${a.iconSrc ? `<img src="${U.attr(a.iconSrc)}" alt="" loading="lazy" data-sv-img>` : U.icon("trophy")}</span><span><b>${U.esc(a.name)}</b><small>${U.esc(g.title)}</small></span>${a.points ? `<em class="sv-num"><i>G</i>${U.fmtNum(a.points)}</em>` : ""}</a>`).join("")}</div></section>` : ""}
		</div>`;
	}

	// ==================================================== GOOGLE PLAY GAMES
	// pensado para o celular: cabeçalho compacto, recentes em carrossel,
	// cartões pequenos em duas colunas
	tabGooglePlay(ctx, b) {
		const { U, C } = ctx;
		const card = g => {
			const a = g.ach, known = a.state === "known" && a.total;
			return `<a class="sv-gp-card" data-progress="${C.progressBucket(g)}" ${U.openAttrs(g.path)}>
				<span class="sv-gp-ring">${U.ring(known ? a.pct : 0, { size: 44, stroke: 4, perfect: a.perfect })}${U.cover(g, { cls: "sv-cover--xs" })}</span>
				<span class="sv-gp-text"><b>${U.esc(g.title)}</b><small class="sv-num">${known ? `${U.fmtNum(a.unlocked)}/${U.fmtNum(a.total)} · ${U.fmtPct(a.pctRound)}` : "Sem conquistas registradas"}</small></span>
			</a>`;
		};
		return `<div class="sv-pad sv-gp">
			<section class="sv-gp-head">
				<span class="sv-gp-mark">${U.icon("b-googleplay")}</span>
				<div><span class="sv-gp-kicker">Google Play Games</span><h2>Seu progresso</h2></div>
				<ul class="sv-gp-pills">
					<li><b class="sv-num">${U.fmtNum(b.unlocked)}<small>/${U.fmtNum(b.total)}</small></b><span>conquistas</span></li>
					<li><b class="sv-num">${U.fmtPct(this.pct(b))}</b><span>progresso</span></li>
					${b.pointsTotal ? `<li><b class="sv-num">${U.fmtNum(b.points)}</b><span>XP</span></li>` : `<li><b class="sv-num">${U.fmtNum(b.perfect)}</b><span>100%</span></li>`}
				</ul>
			</section>
			${this.manualNote("googleplay")}
			${!b.games.some(g => g.achievements.length) ? this.emptyProvider(ctx, "googleplay", b) : ""}
			${b.recent.length ? `<section class="sv-block">${U.sectionHead("Recentes")}<div class="sv-gp-recent sv-hscroll">${b.recent.slice(0, 12).map(({ a, g }) => `<a class="sv-gp-ach" ${U.openAttrs(a.path || g.path)}><span>${a.iconSrc ? `<img src="${U.attr(a.iconSrc)}" alt="" loading="lazy" data-sv-img>` : U.icon("trophy")}</span><b>${U.esc(a.name)}</b><small>${U.esc(g.title)}</small></a>`).join("")}</div></section>` : ""}
			<section class="sv-block" data-hub-list>
				${U.sectionHead("Jogos", { count: b.games.length })}
				${this.progressChips(b.games)}
				<div class="sv-gp-grid">${this.sortGames(b.games).map(card).join("")}</div>
				<p class="sv-muted sv-hub-none" data-hub-none hidden>Nenhum jogo neste filtro.</p>
			</section>
		</div>`;
	}

	// ============================================================== NATIVE
	// neutro e universal: conquistas próprias dos jogos, com o gerenciamento
	// à mão (marcar direto na lista, editor completo a um toque)
	tabNative(ctx, b) {
		const { U, C } = ctx;
		const block = g => {
			const a = g.ach, known = a.state === "known" && a.total;
			const next = g.achievements.filter(x => !x.unlocked).slice(0, 3);
			const editable = !!ctx.A?.editable(g);
			return `<article class="sv-nat-card" data-progress="${C.progressBucket(g)}">
				<header class="sv-nat-head">
					<a ${U.openAttrs(g.path)}>${U.cover(g, { cls: "sv-cover--xs" })}</a>
					<a class="sv-nat-title" ${U.openAttrs(g.path)}><b>${U.esc(g.title)}</b><small class="sv-meta"><span>${U.esc(g.platform)}</span><span>${known ? `${U.fmtNum(a.unlocked)} de ${U.fmtNum(a.total)}` : "nenhuma registrada"}</span></small></a>
					${known ? `<span class="sv-nat-ring">${U.ring(a.pct, { size: 40, stroke: 4, perfect: a.perfect })}<b class="sv-num">${U.fmtNum(a.pctRound)}</b></span>` : ""}
					${this.manageBtn(g, { label: "" })}
				</header>
				${known ? U.progressBar(a.pct, { thin: true, tone: a.perfect ? "gold" : "" }) : ""}
				${next.length ? `<div class="sv-nat-next"><span class="sv-nat-label">${a.unlocked ? "Próximas" : "Para desbloquear"}</span>${next.map(x => U.achievementTile(x, { toggle: editable })).join("")}</div>`
					: known && a.perfect ? `<p class="sv-nat-done">${U.icon("gem")}Todas as conquistas desbloqueadas</p>`
					: !g.achievements.length ? `<p class="sv-nat-empty">Registre as conquistas, troféus ou desafios que o próprio jogo oferece.</p>` : ""}
			</article>`;
		};
		return `<section class="sv-hubhero sv-nat-hero">
			<div class="sv-nat-intro">
				<span class="sv-nat-kicker">${U.icon("medal")}Native</span>
				<h2>Conquistas do próprio jogo</h2>
				<p>Troféus, desafios e objetivos que cada jogo oferece por conta própria: celular, console, PC offline, clássicos.</p>
			</div>
			<dl class="sv-nat-figs">
				<div><dt>Desbloqueadas</dt><dd class="sv-num">${U.fmtNum(b.unlocked)}<small>/${U.fmtNum(b.total)}</small></dd></div>
				<div><dt>Progresso</dt><dd class="sv-num">${U.fmtPct(this.pct(b))}</dd></div>
				<div><dt>Concluídos</dt><dd class="sv-num">${U.fmtNum(b.perfect)}</dd></div>
			</dl>
			<div class="sv-nat-cta">${b.games.length > 1 ? U.btn("Gerenciar conquistas", { icon: "edit", kind: "primary", action: "ach-manage-pick", attrs: `data-provider="native"` }) : b.games[0] ? this.manageBtn(b.games[0], { label: "Gerenciar conquistas", kind: "primary" }) : ""}</div>
		</section>
		<div class="sv-pad">
			<section class="sv-block" data-hub-list>
				${U.sectionHead("Jogos", { count: b.games.length })}
				${this.progressChips(b.games)}
				<div class="sv-nat-list">${this.sortGames(b.games).map(block).join("")}</div>
				<p class="sv-muted sv-hub-none" data-hub-none hidden>Nenhum jogo neste filtro.</p>
			</section>
		</div>`;
	}

	// ============================================================== CUSTOM
	// quadro de objetivos pessoais: marcar direto, filtrar por categoria
	tabCustom(ctx, b) {
		const { U } = ctx;
		const items = b.games.flatMap(g => g.achievements.map(a => ({ a, g })));
		const cats = [...new Set(items.map(x => x.a.category).filter(Boolean))].sort((x, y) => x.localeCompare(y));
		items.sort((x, y) => (x.a.unlocked - y.a.unlocked) || (x.g.title.localeCompare(y.g.title)) || ((x.a.order ?? 1e9) - (y.a.order ?? 1e9)));
		const done = items.filter(x => x.a.unlocked).length;
		const card = ({ a, g }) => {
			const editable = !!ctx.A?.editable(g);
			return `<article class="sv-cus-goal${a.unlocked ? " is-done" : ""}" data-cat="${U.attr(a.category || "")}" data-state="${a.unlocked ? "done" : "open"}">
				${editable && a.path ? `<button type="button" class="sv-ach-check${a.unlocked ? " is-on" : ""}" data-action="ach-unlock" data-path="${U.attr(a.path)}" aria-pressed="${a.unlocked}" title="${a.unlocked ? "Marcar como não concluído" : "Marcar como concluído"}">${U.icon("check")}</button>` : `<span class="sv-ach-check${a.unlocked ? " is-on" : ""}">${U.icon("check")}</span>`}
				<div class="sv-cus-text">
					<b>${U.esc(a.secret && !a.unlocked ? "Objetivo secreto" : a.name)}</b>
					${a.description && !(a.secret && !a.unlocked) ? `<p>${U.esc(a.description)}</p>` : ""}
					<span class="sv-cus-meta"><a ${U.openAttrs(g.path)}>${U.esc(g.title)}</a>${a.category ? `<span class="sv-ach-cat">${U.esc(a.category)}</span>` : ""}${a.unlocked && a.unlockedDate ? `<time>${U.esc(U.fmtDate(a.unlockedDate))}</time>` : ""}</span>
				</div>
			</article>`;
		};
		return `<section class="sv-hubhero sv-cus-hero">
			<span class="sv-cus-kicker">${U.icon("sparkles")}Custom</span>
			<h2>Seus objetivos</h2>
			<p class="sv-cus-count"><b class="sv-num">${U.fmtNum(done)}</b> de ${U.fmtNum(items.length)} concluídos</p>
			${items.length ? U.progressBar(items.length ? (done / items.length) * 100 : 0, { tone: done === items.length ? "gold" : "" }) : ""}
			<div class="sv-cus-cta">${b.games.length > 1 ? U.btn("Criar objetivo", { icon: "plus", kind: "primary", action: "ach-manage-pick", attrs: `data-provider="custom"` }) : b.games[0] ? this.manageBtn(b.games[0], { label: "Criar objetivo", kind: "primary", icon: "plus" }) : ""}</div>
		</section>
		<div class="sv-pad">
			${b.games.length > 1 ? `<div class="sv-cus-games sv-hscroll">${this.sortGames(b.games).map(g => `<a class="sv-cus-game" ${U.openAttrs(g.path)}>${U.cover(g, { cls: "sv-cover--xs" })}<span><b>${U.esc(g.title)}</b><small class="sv-num">${g.ach.state === "known" && g.ach.total ? `${g.ach.unlocked}/${g.ach.total}` : "—"}</small></span></a>`).join("")}</div>` : ""}
			${items.length ? `<section class="sv-block" data-hub-list>
				${U.sectionHead("Objetivos", { count: items.length })}
				${cats.length ? `<div class="sv-hubchips" data-hub-filter="cat" role="group" aria-label="Filtrar por categoria"><button type="button" class="is-active" data-value="" aria-pressed="true">Todos<span>${items.length}</span></button>${cats.map(c => `<button type="button" data-value="${U.attr(c)}" aria-pressed="false">${U.esc(c)}<span>${items.filter(x => x.a.category === c).length}</span></button>`).join("")}</div>` : ""}
				<div class="sv-cus-board">${items.map(card).join("")}</div>
				<p class="sv-muted sv-hub-none" data-hub-none hidden>Nenhum objetivo nesta categoria.</p>
			</section>` : U.empty({ icon: "sparkles", title: "Nenhum objetivo ainda", text: "Crie metas pessoais: terminar a campanha, achar todos os colecionáveis, zerar no difícil…", action: b.games[0] ? this.manageBtn(b.games[0], { label: "Criar objetivo", kind: "primary", icon: "plus" }) : "" })}
		</div>`;
	}

	// ============================================== perfil de uma origem nova
	tabGeneric(ctx, b, k) {
		const { U } = ctx;
		return `<section class="sv-hubhero sv-hubhero--all sv-achsrc--${U.attr(k)}">
			<div class="sv-hubhero-ring">${U.ring(b.pct ?? 0, { size: 104, stroke: 6 })}<div><b class="sv-num">${U.fmtPct(this.pct(b))}</b><span>${U.esc(this.C.providerLabel(k))}</span></div></div>
			<dl class="sv-hub-kpis"><div><dt>Desbloqueadas</dt><dd class="sv-num">${U.fmtNum(b.unlocked)}</dd></div><div><dt>Total</dt><dd class="sv-num">${U.fmtNum(b.total)}</dd></div><div><dt>100%</dt><dd class="sv-num">${U.fmtNum(b.perfect)}</dd></div></dl>
		</section>
		<div class="sv-pad">${this.C.providerDefs[k]?.integration ? "" : this.manualNote(k)}${this.listBlock(ctx, "Jogos", b.games, g => this.gameRow(ctx, g))}</div>`;
	}

	// ====================================================== ESTATÍSTICAS
	// Conquistas por origem (para a tela Estatísticas)
	providerBreakdown(ctx) {
		const { C, U, model } = ctx;
		const st = C.providerStats(model);
		const rows = Object.keys(C.providerDefs).filter(k => st[k].total > 0).map(k => ({ k, b: st[k] })).sort((x, y) => y.b.total - x.b.total);
		if (!rows.length) return "";
		return `<section class="sv-block">
			${U.sectionHead("Conquistas por origem", { action: `<a class="sv-link" ${U.openAttrs("Dashboard/Conquistas")}>Abrir o hub</a>` })}
			<div class="sv-hubbreak">${rows.map(({ k, b }) => `<div class="sv-hubbreak-row sv-achsrc--${U.attr(k)}"><span class="sv-hubbreak-name"><i aria-hidden="true"></i>${U.esc(C.providerLabel(k))}</span><span class="sv-hubbreak-bar">${U.progressBar(b.pct ?? 0, { thin: true })}</span><span class="sv-hubbreak-num sv-num">${U.fmtNum(b.unlocked)}<small>/${U.fmtNum(b.total)}</small></span><span class="sv-hubbreak-pct sv-num">${U.fmtPct(this.pct(b))}</span></div>`).join("")}</div>
		</section>`;
	}
}
