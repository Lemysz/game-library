// ==========================================================================
// Game Library — telas do RetroAchievements (seção complementar)
//
// Perfil RA, Jogos RA e Conquistas RA. Mesma organização da seção Steam,
// porém propositalmente mais contida: hero mais baixo, identidade dourada
// discreta, nada de destaque na Home além de um resumo compacto. A Steam
// continua sendo a plataforma principal da Game Library.
//
// Acesso: customJS.SteamVaultRetroPages
// ==========================================================================

class SteamVaultRetroPages {

	subnav(ctx, active) {
		const { U } = ctx;
		const items = U.nav.find(g => g.id === "retro").items;
		return `<nav class="sv-subnav sv-subnav--retro">${items.map(it => `<a class="${it.id === active ? "is-active" : ""}" ${U.openAttrs(it.path)}>${U.esc(it.label)}</a>`).join("")}</nav>`;
	}

	origin(kind) {
		return kind === "ra"
			? `<span class="sv-origin sv-origin--ra" title="Lido do seu perfil no RetroAchievements">RA</span>`
			: `<span class="sv-origin" title="Calculado a partir das notas do vault">Vault</span>`;
	}

	vaultGames(ctx) {
		return ctx.model.games.filter(g => g.provider === "retroachievements" || g.raGameId);
	}

	_vaultById(ctx) {
		return new Map(this.vaultGames(ctx).filter(g => g.raGameId).map(g => [String(g.raGameId), g]));
	}

	awardTag(ctx, kind) {
		const { U, R } = ctx;
		const label = R.awardLabel(kind);
		if (!label) return "";
		const icon = kind === "mastered" ? "gem" : kind === "completed" ? "medal" : "flag";
		return `<span class="sv-ra-award sv-ra-award--${U.attr(kind)}">${U.icon(icon)}<span>${U.esc(label)}</span></span>`;
	}

	raProgress(ctx, unlocked, total, hardcore) {
		const { U } = ctx;
		// sem contagem ainda (nunca sincronizado): diz isso, em vez de "0 de 0 · 0%"
		if (!(total > 0)) return `<div class="sv-ra-progress is-empty"><small class="sv-meta"><span>Conquistas aparecem depois da sincronização</span></small></div>`;
		const pct = Math.round((unlocked / total) * 100);
		return `<div class="sv-ra-progress"><div class="sv-progress sv-progress--thin sv-tone-gold"><span style="width:${pct}%"></span></div>
			<small class="sv-meta"><span>${U.fmtNum(unlocked)} de ${U.fmtNum(total)}</span>${hardcore ? `<span>${U.fmtNum(hardcore)} hardcore</span>` : ""}<span>${pct}%</span></small></div>`;
	}

	thumb(ctx, src, title) {
		const { U, C } = ctx;
		return src ? `<span class="sv-ra-thumb"><img src="${U.attr(src)}" alt="" loading="lazy" data-sv-img></span>`
			: `<span class="sv-ra-thumb is-empty" style="--sv-hue:${C.hashHue(title)}">${U.icon("b-retro")}</span>`;
	}

	// ---------------------------------------------------------------- hero
	hero(ctx, cfg, cache, { compact = false } = {}) {
		const { U, R } = ctx;
		const p = cache?.profile || {};
		const s = cache?.summary || {};
		const aw = cache?.awards || {};
		const name = p.user || cfg.user || "RetroAchievements";
		const vaultCount = this.vaultGames(ctx).length;
		const figs = cfg.configured && cache?.profile ? [
			{ label: "Pontos (hardcore)", value: U.fmtNum(p.points), origin: "ra" },
			{ label: "Softcore", value: U.fmtNum(p.softcorePoints), origin: "ra" },
			{ label: "TrueRatio", value: U.fmtNum(p.truePoints), origin: "ra" },
			{ label: "Masterizados", value: U.fmtNum(aw.mastery ?? 0), origin: "ra" },
			{ label: "Jogos no vault", value: U.fmtNum(vaultCount), origin: "vault" }
		] : this.vaultFigures(ctx);
		return `<section class="sv-rahero${compact ? " sv-rahero--compact" : ""}">
			<div class="sv-rahero-inner">
				<div class="sv-rahero-avatar">${p.avatar || cfg.avatar ? `<img src="${U.attr(p.avatar || cfg.avatar)}" alt="" data-sv-img>` : U.icon("b-retro")}</div>
				<div class="sv-rahero-text">
					<span class="sv-rahero-kicker">${U.icon("b-retro")}<span>RetroAchievements</span></span>
					<h1>${U.esc(name)}</h1>
					${cfg.configured && cache?.profile ? `<p class="sv-meta sv-rahero-sub">${s.rank ? `<span>#${U.fmtNum(s.rank)}${s.totalRanked ? ` de ${U.fmtNum(s.totalRanked)}` : ""}</span>` : ""}${p.memberSince ? `<span>Membro desde ${U.esc(U.fmtDate(p.memberSince))}</span>` : ""}${s.status ? `<span>${U.esc(s.status === "Online" ? "Online" : "Offline")}</span>` : ""}</p>` : `<p class="sv-rahero-sub">Seção complementar para jogos retrô. A Steam continua sendo a biblioteca principal.</p>`}
					${p.motto ? `<p class="sv-rahero-motto">“${U.esc(p.motto)}”</p>` : ""}
					${(s.richPresence || p.richPresence) && s.status === "Online" ? `<p class="sv-rahero-presence">${U.icon("pulse")}<span>${U.esc(s.richPresence || p.richPresence)}</span></p>` : ""}
					<dl class="sv-figures sv-rahero-figures">${figs.map(f => `<div class="sv-figure"><dt>${U.esc(f.label)}</dt><dd>${f.value}${this.origin(f.origin)}</dd></div>`).join("")}</dl>
				</div>
				<div class="sv-rahero-actions">${cfg.configured
					? `${U.btn("Sincronizar", { icon: "refresh", kind: "ra", action: "ra-sync" })}${ctx.C.safeUrl(cfg.profileUrl, { hosts: ["retroachievements.org"] }) ? `<a class="sv-btn sv-btn--ghost" href="${U.attr(ctx.C.safeUrl(cfg.profileUrl, { hosts: ["retroachievements.org"] }))}">${U.icon("external")}<span>Abrir no RA</span></a>` : ""}`
					: ""}</div>
			</div>
		</section>`;
	}

	syncPanel(ctx, cfg, cache) {
		const { U, R } = ctx;
		const cooldown = R._cooldownUntil() > Date.now();
		return `<section class="sv-surface sv-syncpanel sv-syncpanel--retro">
			<h3>Sincronização RetroAchievements</h3>
			${cfg.configured ? `<dl class="sv-kv">
				<div><dt>Usuário</dt><dd><a href="${U.attr(ctx.C.safeUrl(cfg.profileUrl, { hosts: ["retroachievements.org"] }))}">${U.esc(cfg.user)}</a></dd></div>
				<div><dt>Web API Key</dt><dd>${U.esc(cfg.maskedKey)}</dd></div>
				<div><dt>Último sync</dt><dd>${cfg.lastSync ? U.esc(U.fmtDate(String(cfg.lastSync).slice(0, 10))) : "Nunca"}</dd></div>
				<div><dt>Automático</dt><dd>${cfg.autoSync ? "Ligado (a cada 12 h, ao abrir)" : "Desligado"}</dd></div>
				${cfg.syncStatus && cfg.syncStatus !== "ok" && cfg.syncStatus !== "partial" ? `<div><dt>Estado</dt><dd class="sv-warn-text">${U.esc(R.message(cfg.syncStatus))}</dd></div>` : ""}
				${cooldown ? `<div><dt>Pausa</dt><dd class="sv-warn-text">O RetroAchievements limitou consultas; nova tentativa após ${new Date(R._cooldownUntil()).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</dd></div>` : ""}
			</dl>
			<div class="sv-syncpanel-actions">${U.btn("Sincronizar agora", { icon: "refresh", kind: "ra", size: "sm", action: "ra-sync" })}${U.btn("Forçar tudo", { kind: "ghost", size: "sm", action: "ra-sync-force", title: "Ignora o cache de 12 horas" })}${U.btn("Configurar", { icon: "gear", kind: "ghost", size: "sm", action: "ra-connect" })}</div>`
			: `<dl class="sv-kv">
				<div><dt>Conta</dt><dd>${cfg.hasKey ? "Falta o nome de usuário" : "Não conectada"}</dd></div>
				<div><dt>Jogos RA no vault</dt><dd>${U.fmtNum(this.vaultGames(ctx).length)}</dd></div>
				<div><dt>Modo</dt><dd>Manual (as fichas continuam editáveis)</dd></div>
			</dl>`}
			<p class="sv-fineprint">Fonte: Web API oficial do RetroAchievements, com seu usuário e sua Web API Key (guardada só neste dispositivo).</p>
		</section>`;
	}

	// conta desconectada: um painel só, com o passo a passo (o hero e o painel
	// de sync não repetem o botão)
	notConnected(ctx, cfg) {
		const { U } = ctx;
		const steps = [
			["user", "Entre no site", "Crie a conta (ou entre) em retroachievements.org."],
			["key", "Copie a Web API Key", "No site: Settings › Keys › Web API Key."],
			["link", "Conecte aqui", "Informe o usuário e cole a chave. Ela fica só neste dispositivo."]
		];
		const yes = ["Perfil, pontos hardcore/softcore e ranking", "Jogos com progresso, prêmios (masterizado, zerado)", "Todas as conquistas dos jogos do vault: ícone, pontos, raridade, hardcore e data", "Sincronização automática ao abrir (opcional, a cada 12 h)"];
		return `<section class="sv-surface sv-raconnect">
			<div class="sv-raconnect-head">
				<span class="sv-raconnect-mark">${U.icon("b-retro")}</span>
				<div><h3>Conecte sua conta do RetroAchievements</h3><p class="sv-muted">A Game Library passa a trazer perfil, jogos, prêmios e conquistas sozinho, sem desbloquear nada à mão.</p></div>
			</div>
			<ol class="sv-raconnect-steps">${steps.map(([i, t, d], n) => `<li><span class="sv-raconnect-n">${n + 1}</span><span class="sv-raconnect-ico">${U.icon(i)}</span><span><b>${U.esc(t)}</b><small>${U.esc(d)}</small></span></li>`).join("")}</ol>
			<ul class="sv-plat-list is-yes">${yes.map(x => `<li>${U.icon("check")}<span>${U.esc(x)}</span></li>`).join("")}</ul>
			<div class="sv-row-actions">${U.btn(cfg.hasKey ? "Informar usuário" : "Conectar RetroAchievements", { icon: "link", kind: "ra", action: "ra-connect" })}<a class="sv-btn sv-btn--ghost" href="https://retroachievements.org/settings">${U.icon("external")}<span>Abrir Settings › Keys</span></a></div>
			<p class="sv-fineprint">${U.icon("lock")} Web API oficial do RetroAchievements. Sem senha; a chave fica só neste dispositivo e nunca vai para as notas.</p>
		</section>`;
	}

	// aviso compacto nas abas Jogos e Conquistas quando falta conectar
	connectCallout(ctx, cfg) {
		const { U } = ctx;
		return `<div class="sv-callout sv-ra-callout">${U.icon("b-retro")}<div><strong>${cfg.hasKey ? "Falta o nome de usuário do RetroAchievements" : "Mostrando só o que está no vault"}</strong><p>Conecte a conta para trazer também os jogos do seu perfil, prêmios e a linha do tempo.</p></div>${U.btn(cfg.hasKey ? "Informar usuário" : "Conectar", { icon: "link", kind: "ra", size: "sm", action: "ra-connect" })}</div>`;
	}

	// números calculados das fichas (sem rede)
	vaultNumbers(ctx) {
		const games = this.vaultGames(ctx);
		const ach = games.flatMap(g => g.achievements);
		const known = games.filter(g => g.ach.state === "known" && g.ach.total);
		return {
			games, count: games.length,
			unlocked: known.reduce((s, g) => s + g.ach.unlocked, 0), total: known.reduce((s, g) => s + g.ach.total, 0),
			points: ach.filter(a => a.unlocked).reduce((s, a) => s + (a.points || 0), 0),
			hardcore: ach.filter(a => a.unlocked && a.hardcore).length,
			perfect: games.filter(g => g.ach.perfect).length
		};
	}

	vaultFigures(ctx) {
		const { U } = ctx;
		const n = this.vaultNumbers(ctx);
		return [
			{ label: "Jogos no vault", value: U.fmtNum(n.count), origin: "vault" },
			{ label: "Conquistas", value: n.total ? `${U.fmtNum(n.unlocked)}/${U.fmtNum(n.total)}` : "—", origin: "vault" },
			{ label: "Pontos", value: n.points ? U.fmtNum(n.points) : "—", origin: "vault" },
			{ label: "100%", value: U.fmtNum(n.perfect), origin: "vault" }
		];
	}

	// linha de um jogo do vault (sem dados do perfil)
	vaultRow(ctx, g) {
		return this.gameRow(ctx, {
			gameId: g.raGameId || g.path, title: g.title, console: g.ra.console || g.platform, icon: g.ra.icon || g.images.cover,
			total: g.ra.achTotal ?? g.ach.total ?? 0, unlocked: g.ra.achUnlocked ?? g.ach.unlocked ?? 0, hardcore: g.ra.achHardcore ?? 0,
			award: g.ra.award, lastPlayed: g.ra.lastPlayed || g.lastPlayed?.date || ""
		}, new Map([[String(g.raGameId || g.path), g]]));
	}

	// ========================================================= PERFIL RA
	async profile(ctx) {
		const { U, R } = ctx;
		const cfg = R.getConfig();
		const cache = cfg.configured ? await R.readCache() : null;
		const byId = this._vaultById(ctx);
		let body;
		if (!cfg.configured) {
			const mine = this.vaultGames(ctx);
			body = `<div class="sv-split"><section class="sv-split-main">${this.notConnected(ctx, cfg)}
				${mine.length ? `<div class="sv-sechead-gap"></div>${U.sectionHead("Seus jogos RA no vault", { count: mine.length, sub: "Origem RetroAchievements nas fichas", action: this.origin("vault") })}<div class="sv-ra-list">${U.moreList(mine.map(g => this.vaultRow(ctx, g)), 30)}</div>` : ""}
			</section><aside class="sv-split-side">${this.syncPanel(ctx, cfg, cache)}</aside></div>`;
		} else if (!cache?.profile) {
			body = `<div class="sv-split"><section class="sv-split-main">${U.empty({ icon: "refresh", title: "Ainda não sincronizado", text: "Toque em Sincronizar para trazer seu perfil, jogos e conquistas do RetroAchievements.", action: U.btn("Sincronizar agora", { icon: "refresh", kind: "ra", action: "ra-sync" }) })}</section><aside class="sv-split-side">${this.syncPanel(ctx, cfg, cache)}</aside></div>`;
		} else {
			const played = cache.summary?.recentlyPlayed || [];
			const recent = (cache.recent || []).slice(0, 8);
			const awards = (cache.awards?.list || []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
			body = `<div class="sv-split">
				<section class="sv-split-main">
					${U.sectionHead("Jogados recentemente", { count: played.length, action: this.origin("ra") })}
					${played.length ? `<div class="sv-ra-list">${played.map(x => this.gameRow(ctx, { ...x, award: "" }, byId)).join("")}</div>` : U.empty({ icon: "b-retro", title: "Nada jogado recentemente", compact: true })}
					<div class="sv-sechead-gap"></div>
					${U.sectionHead("Conquistas recentes", { count: (cache.recent || []).length, sub: "Últimos 90 dias", action: `<a class="sv-link" ${U.openAttrs("Dashboard/RetroAchievements Conquistas")}>Ver todas</a>` })}
					${recent.length ? `<div class="sv-ra-achs">${recent.map(a => this.achRow(ctx, a, byId)).join("")}</div>` : U.empty({ icon: "medal", title: "Nenhuma conquista nos últimos 90 dias", compact: true })}
				</section>
				<aside class="sv-split-side">
					${this.syncPanel(ctx, cfg, cache)}
					<section class="sv-surface sv-ra-awards-panel">
						<h3>Prêmios</h3>
						<dl class="sv-figures sv-ra-awardfigs">
							<div class="sv-figure"><dt>Masterizados</dt><dd>${U.fmtNum(cache.awards?.mastery ?? 0)}</dd></div>
							<div class="sv-figure"><dt>Zerados (HC)</dt><dd>${U.fmtNum(cache.awards?.beatenHardcore ?? 0)}</dd></div>
							<div class="sv-figure"><dt>Zerados (SC)</dt><dd>${U.fmtNum(cache.awards?.beatenSoftcore ?? 0)}</dd></div>
						</dl>
						${awards.length ? `<div class="sv-ra-badges">${awards.slice(0, 12).map(a => `<a class="sv-ra-badge sv-ra-badge--${U.attr(a.kind)}" title="${U.attr(`${a.title} — ${R.awardLabel(a.kind)}`)}" ${byId.get(a.gameId) ? U.openAttrs(byId.get(a.gameId).path) : `href="${U.attr(R.gameUrl(a.gameId))}"`}>${a.icon ? `<img src="${U.attr(a.icon)}" alt="" loading="lazy" data-sv-img>` : U.icon("medal")}</a>`).join("")}</div>` : `<p class="sv-muted">Nenhum prêmio ainda.</p>`}
					</section>
				</aside>
			</div>`;
		}
		const html = `<div class="sv-page sv-page--retro">
			${this.hero(ctx, cfg, cache)}
			<div class="sv-pad">${this.subnav(ctx, "retro")}${body}</div>
		</div>`;
		return { active: "retro", html };
	}

	gameRow(ctx, x, byId) {
		const { U, R } = ctx;
		const g = byId.get(String(x.gameId));
		const action = g
			? `<a class="sv-btn sv-btn--ghost sv-btn--sm" ${U.openAttrs(g.path)}>${U.icon("eye")}<span>Ficha</span></a>`
			: U.btn("Adicionar", { icon: "plus", kind: "ghost", size: "sm", action: "ra-import-game", attrs: `data-id="${U.attr(x.gameId)}"`, title: "Criar a ficha no vault e sincronizar" });
		const when = x.lastPlayed || x.lastUnlock;
		return `<div class="sv-ra-row" data-k="${U.attr(ctx.C.normalizeKey(`${x.title} ${x.console}`))}" data-state="${g ? "vault" : "out"}" data-award="${U.attr(x.award || "")}">
			${this.thumb(ctx, x.icon, x.title)}
			<div class="sv-ra-row-text">
				<b>${g ? `<a ${U.openAttrs(g.path)}>${U.esc(x.title)}</a>` : U.esc(x.title)}</b>
				<small class="sv-meta"><span>${U.esc(x.console)}</span>${when ? `<span>${U.esc(U.relDate(String(when).slice(0, 10)))}</span>` : ""}${g ? "<span>No vault</span>" : ""}</small>
				${this.raProgress(ctx, x.unlocked || 0, x.total || 0, x.hardcore || 0)}
			</div>
			<div class="sv-ra-row-side">${this.awardTag(ctx, x.award)}${action}</div>
		</div>`;
	}

	achRow(ctx, a, byId) {
		const { U } = ctx;
		const g = byId.get(String(a.gameId));
		return `<div class="sv-ra-ach">
			<span class="sv-ra-ach-icon">${a.badge ? `<img src="${U.attr(a.badge)}" alt="" loading="lazy" data-sv-img>` : U.icon("medal")}</span>
			<div class="sv-ra-ach-text"><b>${U.esc(a.title)}</b><small>${U.esc(a.description)}</small>
				<small class="sv-meta">${g ? `<a ${U.openAttrs(g.path)}>${U.esc(a.gameTitle)}</a>` : `<span>${U.esc(a.gameTitle)}</span>`}<span>${U.esc(a.console)}</span></small></div>
			<div class="sv-ra-ach-side"><span class="sv-ra-points">${U.fmtNum(a.points)} pts</span>${a.hardcore ? `<span class="sv-ra-hc">Hardcore</span>` : `<span class="sv-ra-sc">Softcore</span>`}<time>${U.esc(U.fmtDate(String(a.date).slice(0, 10)))}</time></div>
		</div>`;
	}

	// =========================================================== JOGOS RA
	async games(ctx) {
		const { U, R, C } = ctx;
		const cfg = R.getConfig();
		const cache = cfg.configured ? await R.readCache() : null;
		const byId = this._vaultById(ctx);
		const list = (cache?.completion || []).slice().sort((a, b) => String(b.lastUnlock).localeCompare(String(a.lastUnlock)));
		// jogos RA do vault que não aparecem no perfil (sem progresso ainda)
		const inList = new Set(list.map(x => String(x.gameId)));
		const extra = this.vaultGames(ctx).filter(g => !g.raGameId || !inList.has(String(g.raGameId))).map(g => ({
			gameId: g.raGameId || "", title: g.title, console: g.ra.console || g.platform, icon: g.ra.icon || g.images.cover,
			total: g.ra.achTotal ?? g.ach.total, unlocked: g.ra.achUnlocked ?? g.ach.unlocked, hardcore: g.ra.achHardcore ?? 0, award: g.ra.award, lastUnlock: g.ra.lastPlayed,
			_path: g.path
		}));
		const all = [...list, ...extra];
		const outCount = list.filter(x => !byId.has(String(x.gameId))).length;
		const withProgressOut = list.filter(x => !byId.has(String(x.gameId)) && x.unlocked > 0).length;
		const counts = {
			all: all.length, vault: all.length - outCount, out: outCount,
			mastered: all.filter(x => x.award === "mastered" || x.award === "completed").length,
			beaten: all.filter(x => /beaten/.test(x.award || "")).length
		};
		const seg = [["all", "Todos"], ["vault", "No vault"], ["out", "Fora do vault"], ["mastered", "Masterizados"], ["beaten", "Zerados"]];
		// 3.68.0: as 40 primeiras linhas na hora; o resto fica guardado até
		// "Mostrar mais" ou até a pessoa filtrar (aí todas entram antes de filtrar)
		const rows = U.moreList(all.map(x => x._path ? this.gameRow(ctx, x, new Map([[String(x.gameId), { path: x._path }], ...byId])) : this.gameRow(ctx, x, byId)), 40);
		const html = `<div class="sv-page sv-page--retro">
			${this.hero(ctx, cfg, cache, { compact: true })}
			<div class="sv-pad">${this.subnav(ctx, "retro-games")}
				${!cfg.configured ? this.connectCallout(ctx, cfg) : !cache?.completion ? `<div class="sv-callout sv-ra-callout">${U.icon("refresh")}<div><strong>Nenhum jogo do perfil sincronizado ainda</strong><p>A sincronização traz todos os jogos em que você tem progresso no RetroAchievements.</p></div>${U.btn("Sincronizar", { icon: "refresh", kind: "ra", size: "sm", action: "ra-sync" })}</div>` : ""}
				${!all.length ? U.empty({ icon: "b-retro", title: "Nenhum jogo RetroAchievements ainda", text: "Jogos com origem RetroAchievements nas fichas (ou do seu perfil, depois de conectar) aparecem aqui." }) : `
				<div class="sv-toolbar">
					<label class="sv-field sv-field--search">${U.icon("search")}<input type="search" class="sv-input" data-ra-q placeholder="Filtrar por jogo ou console" aria-label="Filtrar jogos"></label>
					<div class="sv-segmented" role="tablist">${seg.filter(([k], i) => !i || counts[k]).map(([k, l], i) => `<button type="button" class="${i ? "" : "is-active"}" data-ra-f="${k}">${l}<span>${counts[k]}</span></button>`).join("")}</div>
					<div class="sv-toolbar-end">${withProgressOut ? U.btn(`Adicionar ${withProgressOut} ao vault`, { icon: "download", kind: "ghost", size: "sm", action: "ra-import-all", title: "Cria as fichas dos jogos com progresso que ainda não estão no vault" }) : ""}</div>
				</div>
				${outCount ? `<p class="sv-fineprint sv-ra-note">Jogos “fora do vault” vêm do seu perfil no RA. Adicionar cria a ficha com schema completo e já sincroniza as conquistas.</p>` : ""}
				<div class="sv-ra-list" data-ra-list>${rows}</div>
				<div class="sv-noresults" hidden>${U.empty({ icon: "search", title: "Nenhum jogo com esse filtro", compact: true })}</div>`}
			</div>
		</div>`;
		return { active: "retro-games", html, wire: root => this._wireGames(root, ctx) };
	}

	_wireGames(root, ctx) {
		const { C } = ctx;
		const q = root.querySelector("[data-ra-q]");
		let f = "all";
		const expand = () => {
			const box = root.querySelector("[data-ra-list]"), tpl = box?.querySelector(":scope > template[data-sv-more]");
			if (!tpl) return;
			box.insertBefore(tpl.content, tpl); tpl.remove();
			box.querySelector(":scope > .sv-morebtn")?.remove();
			ctx.V?._wireImages?.(box);
		};
		const apply = () => {
			const k = C.normalizeKey(q?.value || "");
			if (k || f !== "all") expand();
			let shown = 0;
			root.querySelectorAll("[data-ra-list] .sv-ra-row").forEach(r => {
				const okF = f === "all" || (f === "vault" && r.dataset.state === "vault") || (f === "out" && r.dataset.state === "out")
					|| (f === "mastered" && /^(mastered|completed)$/.test(r.dataset.award)) || (f === "beaten" && /beaten/.test(r.dataset.award));
				const ok = okF && (!k || r.dataset.k.includes(k));
				r.hidden = !ok; if (ok) shown++;
			});
			const nr = root.querySelector(".sv-noresults"); if (nr) nr.hidden = shown > 0;
		};
		q?.addEventListener("input", apply);
		root.querySelectorAll("[data-ra-f]").forEach(b => b.addEventListener("click", () => {
			f = b.dataset.raF;
			root.querySelectorAll("[data-ra-f]").forEach(x => x.classList.toggle("is-active", x === b));
			apply();
		}));
	}

	// ======================================================= CONQUISTAS RA
	async achievements(ctx) {
		const { U, R, C } = ctx;
		const cfg = R.getConfig();
		const cache = cfg.configured ? await R.readCache() : null;
		const byId = this._vaultById(ctx);
		const recent = cache?.recent || [];
		const games = this.vaultGames(ctx);
		const vaultAch = games.flatMap(g => g.achievements.map(a => ({ ...a, game: g })));
		const unlockedVault = vaultAch.filter(a => a.unlocked);
		const hc = unlockedVault.filter(a => a.hardcore).length;
		const rarest = unlockedVault.filter(a => a.rarity !== null).sort((a, b) => a.rarity - b.rarity).slice(0, 9);
		const pts90 = recent.reduce((s, a) => s + (a.points || 0), 0);
		const byConsole = C.groupBy(cache?.completion || [], x => x.console);
		const consoleBars = [...byConsole].map(([k, l]) => ({ label: k, value: l.reduce((s, x) => s + (x.unlocked || 0), 0), display: `${U.fmtNum(l.reduce((s, x) => s + (x.unlocked || 0), 0))} em ${U.plural(l.length, "jogo", "jogos")}` }))
			.filter(x => x.value > 0).sort((a, b) => b.value - a.value).slice(0, 8);
		const days = C.groupBy(recent.slice(0, 60), a => String(a.date).slice(0, 10));
		const html = `<div class="sv-page sv-page--retro">
			${this.hero(ctx, cfg, cache, { compact: true })}
			<div class="sv-pad">${this.subnav(ctx, "retro-achievements")}
				${!cfg.configured ? `${this.connectCallout(ctx, cfg)}${this.vaultAchievements(ctx, { games, vaultAch, unlockedVault, hc, rarest })}` : `
				<section class="sv-insights sv-insights--retro">
					<div class="sv-insight"><b>${U.fmtNum(recent.length)}</b><p>conquistas nos últimos 90 dias ${this.origin("ra")}</p></div>
					<div class="sv-insight"><b>${U.fmtNum(pts90)}</b><p>pontos ganhos no período ${this.origin("ra")}</p></div>
					<div class="sv-insight"><b>${unlockedVault.length ? `${Math.round((hc / unlockedVault.length) * 100)}%` : "—"}</b><p>das conquistas dos seus jogos RA no vault foram em hardcore ${this.origin("vault")}</p></div>
					<div class="sv-insight"><b>${vaultAch.length ? `${U.fmtNum(unlockedVault.length)}<small> / ${U.fmtNum(vaultAch.length)}</small>` : "—"}</b><p>conquistas desbloqueadas nos jogos RA do vault ${this.origin("vault")}</p></div>
				</section>
				<div class="sv-split">
					<section class="sv-split-main">
						${U.sectionHead("Linha do tempo", { sub: "Desbloqueios dos últimos 90 dias", action: this.origin("ra") })}
						${recent.length ? `<div class="sv-ra-days">${[...days].map(([d, l]) => `<div class="sv-ra-day"><time>${U.esc(U.fmtDate(d))}</time><div class="sv-ra-achs">${l.map(a => this.achRow(ctx, a, byId)).join("")}</div></div>`).join("")}</div>` : U.empty({ icon: "medal", title: "Nenhum desbloqueio nos últimos 90 dias", text: cache ? "Jogue algo com o RetroAchievements ativo e sincronize." : "Sincronize para ver sua linha do tempo.", compact: true, action: cache ? "" : U.btn("Sincronizar", { icon: "refresh", kind: "ra", size: "sm", action: "ra-sync" }) })}
					</section>
					<aside class="sv-split-side">
						${U.sectionHead("Mais raras", { sub: "Suas conquistas RA menos desbloqueadas", action: this.origin("vault") })}
						${rarest.length ? `<div class="sv-rarewall sv-rarewall--compact">${rarest.map(a => `<a class="sv-medallion ${U.rarityClass ? U.rarityClass(a.rarity) : ""}" ${a.path ? U.openAttrs(a.path) : ""} style="--sv-rarity:var(--sv-gold)"><div>${a.iconSrc ? `<img src="${U.attr(a.iconSrc)}" alt="" loading="lazy" data-sv-img>` : U.icon("medal")}</div><span><b>${U.esc(a.name)}</b><small>${U.esc(a.game.title)}</small><em>${U.fmtPct(a.rarity)}</em></span></a>`).join("")}</div>` : `<p class="sv-muted">Aparece depois de sincronizar jogos RA do vault.</p>`}
						<div class="sv-sechead-gap"></div>
						${U.sectionHead("Por console", { sub: "Conquistas desbloqueadas", action: this.origin("ra") })}
						${consoleBars.length ? U.bars(consoleBars) : `<p class="sv-muted">Sem dados ainda.</p>`}
					</aside>
				</div>`}
			</div>
		</div>`;
		return { active: "retro-achievements", html };
	}

	// Conquistas RA só com as fichas do vault (conta desconectada)
	vaultAchievements(ctx, { games, vaultAch, unlockedVault, hc, rarest }) {
		const { U, C } = ctx;
		if (!games.length) return U.empty({ icon: "medal", title: "Nenhuma conquista RetroAchievements no vault", text: "Defina a origem RetroAchievements na aba Conquistas de um jogo, ou conecte a conta para sincronizar." });
		const points = unlockedVault.reduce((s, a) => s + (a.points || 0), 0);
		const byConsole = [...C.groupBy(games, g => g.ra.console || g.platform)].map(([k, l]) => {
			const n = l.reduce((s, g) => s + g.achievements.filter(a => a.unlocked).length, 0);
			return { label: k, value: n, display: `${U.fmtNum(n)} em ${U.plural(l.length, "jogo", "jogos")}` };
		}).filter(x => x.value > 0).sort((a, b) => b.value - a.value);
		const latest = unlockedVault.filter(a => a.unlockedDate).sort((a, b) => (b.unlockedDate + (b.unlockedTime || "")).localeCompare(a.unlockedDate + (a.unlockedTime || ""))).slice(0, 8);
		return `<section class="sv-insights sv-insights--retro">
			<div class="sv-insight"><b>${vaultAch.length ? `${U.fmtNum(unlockedVault.length)}<small> / ${U.fmtNum(vaultAch.length)}</small>` : "—"}</b><p>conquistas desbloqueadas nos jogos RA do vault ${this.origin("vault")}</p></div>
			<div class="sv-insight"><b>${U.fmtNum(points)}</b><p>pontos somados nas fichas ${this.origin("vault")}</p></div>
			<div class="sv-insight"><b>${unlockedVault.length ? `${Math.round((hc / unlockedVault.length) * 100)}%` : "—"}</b><p>dos desbloqueios em hardcore ${this.origin("vault")}</p></div>
			<div class="sv-insight"><b>${U.fmtNum(games.filter(g => g.ach.perfect).length)}</b><p>${games.filter(g => g.ach.perfect).length === 1 ? "jogo com 100%" : "jogos com 100%"} ${this.origin("vault")}</p></div>
		</section>
		<div class="sv-split">
			<section class="sv-split-main">
				${U.sectionHead("Progresso por jogo", { count: games.length, action: this.origin("vault") })}
				<div class="sv-ra-list">${U.moreList(games.map(g => this.vaultRow(ctx, g)), 30)}</div>
				${latest.length ? `<div class="sv-sechead-gap"></div>${U.sectionHead("Últimos desbloqueios", { action: this.origin("vault") })}<div class="sv-achlist sv-achlist--compact">${latest.map(a => U.achievementTile(a, { showGame: a.game })).join("")}</div>` : ""}
			</section>
			<aside class="sv-split-side">
				${U.sectionHead("Mais raras", { sub: "Suas conquistas RA menos desbloqueadas", action: this.origin("vault") })}
				${rarest.length ? `<div class="sv-rarewall sv-rarewall--compact">${rarest.map(a => `<a class="sv-medallion" ${a.path ? U.openAttrs(a.path) : ""} style="--sv-rarity:var(--sv-gold)"><div>${a.iconSrc ? `<img src="${U.attr(a.iconSrc)}" alt="" loading="lazy" data-sv-img>` : U.icon("medal")}</div><span><b>${U.esc(a.name)}</b><small>${U.esc(a.game.title)}</small><em>${U.fmtPct(a.rarity)}</em></span></a>`).join("")}</div>` : `<p class="sv-muted">A raridade chega com a sincronização.</p>`}
				${byConsole.length ? `<div class="sv-sechead-gap"></div>${U.sectionHead("Por console", { sub: "Conquistas desbloqueadas", action: this.origin("vault") })}${U.bars(byConsole)}` : ""}
			</aside>
		</div>`;
	}

	// ======================================= resumo compacto para a Home
	// Aparece só com a conta conectada; fica abaixo do conteúdo principal,
	// sem competir com o destaque da Steam.
	async homeStrip(ctx) {
		const { U, R } = ctx;
		if (!R) return "";
		const cfg = R.getConfig();
		if (!cfg.configured) return "";
		const cache = await R.readCache();
		if (!cache?.profile) return "";
		const p = cache.profile, last = (cache.recent || [])[0];
		return `<section class="sv-block sv-ra-strip">
			<a class="sv-ra-strip-inner" ${U.openAttrs("Dashboard/RetroAchievements")}>
				<span class="sv-ra-strip-avatar">${p.avatar ? `<img src="${U.attr(p.avatar)}" alt="" data-sv-img>` : U.icon("b-retro")}</span>
				<span class="sv-ra-strip-text"><small>RetroAchievements</small><b>${U.esc(p.user)}</b></span>
				<span class="sv-ra-strip-fig"><b>${U.fmtNum(p.points)}</b><small>pontos</small></span>
				<span class="sv-ra-strip-fig"><b>${U.fmtNum(cache.awards?.mastery ?? 0)}</b><small>masterizados</small></span>
				${last ? `<span class="sv-ra-strip-last">${last.badge ? `<img src="${U.attr(last.badge)}" alt="" data-sv-img>` : ""}<span><small>Última conquista</small><b>${U.esc(last.title)}</b></span></span>` : ""}
				<span class="sv-ra-strip-go">${U.icon("chevronRight")}</span>
			</a>
		</section>`;
	}

	// ============================== painel RA dentro da ficha do jogo
	gamePanel(ctx, g) {
		const { U, R } = ctx;
		if (!R || !(g.provider === "retroachievements" || g.raGameId)) return "";
		const cfg = R.getConfig();
		const r = g.ra;
		return `<section class="sv-surface sv-ra-gamepanel">
			<h3>${U.icon("b-retro")}<span>RetroAchievements</span></h3>
			${g.raGameId ? `<dl class="sv-kv">
				${r.console ? `<div><dt>Console</dt><dd>${U.esc(r.console)}</dd></div>` : ""}
				${r.award ? `<div><dt>Prêmio</dt><dd>${this.awardTag(ctx, r.award)}${r.awardDate ? ` <small class="sv-muted">${U.esc(U.fmtDate(r.awardDate))}</small>` : ""}</dd></div>` : ""}
				${r.achTotal !== null ? `<div><dt>Hardcore</dt><dd>${U.fmtNum(r.achHardcore ?? 0)} de ${U.fmtNum(r.achTotal)}</dd></div>` : ""}
				${r.pointsTotal !== null ? `<div><dt>Pontos</dt><dd>${U.fmtNum(r.pointsEarned ?? 0)} de ${U.fmtNum(r.pointsTotal)}</dd></div>` : ""}
				${r.players ? `<div><dt>Jogadores</dt><dd>${U.fmtNum(r.players)}</dd></div>` : ""}
				<div><dt>Sync</dt><dd>${r.lastSync ? U.esc(U.fmtDate(String(r.lastSync).slice(0, 10))) : "Nunca"}${r.status && r.status !== "ok" ? ` <span class="sv-warn-text">${U.esc(R.message(r.status))}</span>` : ""}</dd></div>
			</dl>` : `<p class="sv-muted">Sem o ID do jogo no RetroAchievements. Sincronize o perfil (liga automaticamente pelo título) ou informe o <code>raGameId</code> em Editar detalhes.</p>`}
			<div class="sv-syncpanel-actions">
				${cfg.configured && g.raGameId && g.provider === "retroachievements" && ctx.C.autoSync(g) ? U.btn("Sincronizar", { icon: "refresh", kind: "ra", size: "sm", action: "ra-sync-game", attrs: `data-path="${U.attr(g.path)}"` }) : ""}
				${!cfg.configured ? U.btn("Conectar", { icon: "link", kind: "ra", size: "sm", action: "ra-connect" }) : ""}
				${g.raGameId ? `<a class="sv-btn sv-btn--ghost sv-btn--sm" href="${U.attr(R.gameUrl(g.raGameId))}">${U.icon("external")}<span>Ver no RA</span></a>` : ""}
			</div>
		</section>`;
	}
}
