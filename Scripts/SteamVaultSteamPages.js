// ==========================================================================
// Game Library — Steam Pages (Perfil, Atividade, Biblioteca, Vitrine)
// Regra: todo número exibido diz de onde veio. "Steam" = lido do perfil
// público na Steam Community. "Vault" = calculado a partir das suas notas.
//
// Acesso: customJS.SteamVaultSteamPages
// ==========================================================================

class SteamVaultSteamPages {

	subnav(ctx, active) {
		const { U } = ctx;
		const items = U.nav.find(g => g.id === "steam").items;
		return `<nav class="sv-subnav">${items.map(it => `<a class="${it.id === active ? "is-active" : ""}" ${U.openAttrs(it.path)}>${U.esc(it.label)}</a>`).join("")}</nav>`;
	}

	// A Steam Community é lida em inglês (formato estável para o parser);
	// datas e presença são traduzidas só na exibição.
	enDate(text) {
		const t = String(text || "").trim();
		const M = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
		const m = /^(?:on\s+)?(?:(\d{1,2})\s+([a-z]{3})[a-z]*\.?|([a-z]{3})[a-z]*\.?\s+(\d{1,2}))(?:,?\s+(\d{4}))?$/i.exec(t);
		if (!m) return t;
		const day = Number(m[1] || m[4]), mon = M[(m[2] || m[3]).toLowerCase()];
		if (!mon || day < 1 || day > 31) return t;
		const pad = n => String(n).padStart(2, "0");
		const U = customJS.SteamVaultUI;
		return m[5] ? U.fmtDate(`${m[5]}-${pad(mon)}-${pad(day)}`) : U.fmtDate(`2000-${pad(mon)}-${pad(day)}`, { year: false });
	}

	presence(profile) {
		const st = String(profile?.onlineState || "").toLowerCase();
		if (st === "in-game") {
			const game = String(profile.stateMessage || "").split(/<br\s*\/?>/i)[1]?.replace(/<[^>]+>/g, " ").trim();
			return game ? `Jogando ${game}` : "Jogando";
		}
		return st === "online" ? "Online" : "Offline";
	}

	origin(kind) {
		return kind === "steam"
			? `<span class="sv-origin sv-origin--steam" title="Lido do seu perfil público na Steam Community">Steam</span>`
			: `<span class="sv-origin" title="Calculado a partir das notas do vault">Vault</span>`;
	}

	// estado de conexão, sempre explicando motivo e ação
	connectionState(ctx, cfg, profile) {
		const { U, S } = ctx;
		if (!cfg.configured) {
			return U.empty({ icon: "user", title: "Conecte seu perfil público da Steam", text: "Informe a URL do seu perfil. A Game Library lê somente o que a Steam Community mostra publicamente — sem login, senha, cookies ou chave de API.", action: U.btn("Conectar perfil", { icon: "link", kind: "primary", action: "steam-connect" }) });
		}
		if (cfg.syncStatus === "private_profile" || profile?.privacy && profile.privacy !== "public") {
			return `<div class="sv-callout sv-callout--warn">${U.icon("lock")}<div><strong>${U.esc(S.message("private_profile"))}</strong><p>Na Steam: Editar perfil, Configurações de privacidade, e deixe “Meu perfil” e “Detalhes de jogos” como Público. Nada privado é acessado pela Game Library.</p></div>${U.btn("Tentar de novo", { icon: "refresh", action: "steam-sync", size: "sm" })}</div>`;
		}
		if (cfg.syncStatus && !["ok", "private_profile"].includes(cfg.syncStatus)) {
			return `<div class="sv-callout">${U.icon("cloudOff")}<div><strong>${U.esc(S.message(cfg.syncStatus))}</strong><p>Os dados abaixo são do último sync bem-sucedido; nada foi apagado.</p></div>${U.btn("Sincronizar", { icon: "refresh", action: "steam-sync", size: "sm" })}</div>`;
		}
		return "";
	}

	profileHero(ctx, cfg, profile) {
		const { U, model, C } = ctx;
		const steamGames = model.games.filter(g => g.provider === "steam");
		const known = steamGames.filter(g => g.ach.state === "known");
		const unlocked = known.reduce((s, g) => s + g.ach.unlocked, 0), total = known.reduce((s, g) => s + g.ach.total, 0);
		const perfect = steamGames.filter(g => C.isPerfect(g)).length;
		const bg = profile?.background || "";
		const name = profile?.name || cfg.name || "Perfil Steam";
		const avatar = profile?.avatar || cfg.avatar;
		return `<section class="sv-phero${bg ? "" : " is-noart"}">
			<div class="sv-phero-art" aria-hidden="true">${bg ? `<img src="${U.attr(bg)}" alt="" data-sv-img>` : ""}<div class="sv-phero-scrim"></div></div>
			<div class="sv-phero-inner">
				<div class="sv-phero-avatar">${avatar ? `<img src="${U.attr(avatar)}" alt="">` : U.icon("user")}${profile?.level !== undefined && profile?.level !== null ? `<span class="sv-level" title="Nível Steam (público)">${U.esc(profile.level)}</span>` : ""}</div>
				<div class="sv-phero-text">
					<h1>${U.esc(name)}</h1>
					<p class="sv-phero-sub">${profile?.onlineState ? `<span class="sv-presence sv-presence--${U.attr(profile.onlineState)}">${U.esc(this.presence(profile))}</span>` : ""}${profile?.memberSince ? `<span>Membro desde ${U.esc(this.enDate(profile.memberSince))}</span>` : ""}${profile?.location ? `<span>${U.esc(profile.location)}</span>` : ""}</p>
					${profile?.summary ? `<p class="sv-phero-summary">${U.esc(profile.summary.slice(0, 220))}</p>` : ""}
					<div class="sv-phero-figures">
						${U.figures([
							profile?.counts?.games !== undefined ? { label: "Jogos no perfil", html: `${U.fmtNum(profile.counts.games)}${this.origin("steam")}` } : null,
							{ label: "Jogos Steam no vault", html: `${U.fmtNum(steamGames.length)}${this.origin("vault")}` },
							profile?.badgeCount !== undefined ? { label: "Insígnias", html: `${U.fmtNum(profile.badgeCount)}${this.origin("steam")}` } : null,
							total ? { label: "Conquistas", html: `${U.fmtNum(unlocked)}<small>/${U.fmtNum(total)}</small>${this.origin(known.some(g => g.ach.origin === "steam") ? "steam" : "vault")}` } : null,
							{ label: "100%", html: `${perfect}${this.origin("vault")}`, tone: perfect ? "gold" : "" }
						])}
					</div>
				</div>
				<div class="sv-phero-actions">
					${cfg.configured ? U.btn("Sincronizar", { icon: "refresh", kind: "glass", action: "steam-sync" }) : U.btn("Conectar perfil", { icon: "link", kind: "primary", action: "steam-connect" })}
					${C.safeUrl(cfg.profileUrl, { hosts: ["steamcommunity.com"] }) ? `<a class="sv-btn sv-btn--glass" href="${U.attr(C.safeUrl(cfg.profileUrl, { hosts: ["steamcommunity.com"] }))}">${U.icon("external")}<span>Abrir na Steam</span></a>` : ""}
				</div>
			</div>
		</section>`;
	}

	// =============================================================== PERFIL
	async profile(ctx) {
		const { U, S, C, model } = ctx;
		const cfg = S.getConfig();
		const profile = await S.readProfileCache();
		S.maybeAutoSync();
		const steamGames = model.games.filter(g => C.isSteamGame(g));
		const featured = [...steamGames].sort((a, b) => (!!(b.images.featured || b.images.background) - !!(a.images.featured || a.images.background)) || b.playtime.hours - a.playtime.hours)[0];
		const recentAch = C.activity(model, { limit: 80 }).filter(e => e.type === "achievement" && e.game.provider === "steam").flatMap(e => e.achievements.map(a => ({ a, g: e.game }))).slice(0, 8);
		const recentSteam = profile?.recentGames || [];
		const html = `<div class="sv-page">
			${this.profileHero(ctx, cfg, profile)}
			<div class="sv-pad">
				${this.subnav(ctx, "steam-profile")}
				${this.connectionState(ctx, cfg, profile)}
				<div class="sv-split">
					<section class="sv-split-main">
						${featured ? `${U.sectionHead("Jogo em destaque", { sub: "O jogo Steam com mais horas no vault (com arte)" })}${this.featuredStrip(ctx, featured)}` : ""}
						${recentSteam.length ? `${U.sectionHead("Jogados recentemente", { sub: profile.recentHours ? `${U.fmtHours(profile.recentHours)} nas últimas duas semanas` : "", action: this.origin("steam") })}
							<div class="sv-recent">${recentSteam.map(r => this.recentSteamRow(ctx, r)).join("")}</div>` : ""}
						${recentAch.length ? `${U.sectionHead("Conquistas recentes", { action: `<a class="sv-link" ${U.openAttrs("Dashboard/Steam Atividade")}>Ver atividade</a>` })}<div class="sv-achlist">${recentAch.map(({ a, g }) => U.achievementTile(a, { showGame: g })).join("")}</div>` : ""}
						${!featured && !recentSteam.length ? U.empty({ icon: "books", title: "Nenhum jogo Steam no vault", text: "Marque a origem das conquistas como Steam e informe o Steam AppID em um jogo.", compact: true }) : ""}
					</section>
					<aside class="sv-split-side">
						${this.syncPanel(ctx, cfg, profile)}
						${profile?.badges?.length ? `${U.sectionHead("Insígnias", { action: this.origin("steam") })}<div class="sv-badges">${profile.badges.map(b => `<span class="sv-badge" title="${U.attr(b.title)}"><img src="${U.attr(b.icon)}" alt=""></span>`).join("")}</div>` : ""}
						${profile?.mostPlayed?.length ? `${U.sectionHead("Mais jogados (2 semanas)", { action: this.origin("steam") })}${U.bars(profile.mostPlayed.map(m => ({ label: m.name, value: m.hours2Weeks || 0, display: U.fmtHours(m.hours2Weeks || 0) })))}` : ""}
					</aside>
				</div>
			</div>
		</div>`;
		return { active: "steam-profile", html };
	}

	featuredStrip(ctx, g) {
		const { U, C } = ctx;
		const art = g.images.featured || g.images.background;
		return `<a class="sv-featured" ${U.openAttrs(g.path)} style="--sv-hue:${g.hue}">
			${art ? `<img src="${U.attr(art)}" alt="" data-sv-img style="object-position:${g.framing.x}% ${g.framing.y}%">` : ""}
			<div class="sv-featured-shade"></div>
			<div class="sv-featured-info">
				${U.cover(g, { cls: "sv-cover--sm" })}
				<div><strong>${U.esc(g.title)}</strong>
				${U.figures([
					{ label: "Tempo", html: `${U.fmtHours(g.playtime.hours)}${this.origin(g.playtime.origin)}` },
					g.ach.state === "known" && g.ach.total ? { label: "Conquistas", html: `${g.ach.unlocked}/${g.ach.total}${this.origin(g.ach.origin === "steam" ? "steam" : "vault")}` } : null,
					g.lastPlayed.date ? { label: "Última vez", value: U.relDate(g.lastPlayed.date) } : null
				])}</div>
			</div>
		</a>`;
	}

	// 1.9.0: a ficha de um jogo do perfil: pelo AppID ou, numa ficha de PC/Steam
	// ainda sem AppID, pelo nome (a próxima sincronização grava o AppID)
	localFor(ctx, appId, name) {
		const { C, model } = ctx;
		const byId = model.games.find(g => g.steamAppId && g.steamAppId === String(appId));
		if (byId) return byId;
		const [k1, k2] = C.steamTitleKeys(name);
		const cands = model.games.filter(g => !g.steamAppId && (g.provider === "steam" || /^(pc|steam|windows)$/i.test(g.platform)));
		const exact = cands.filter(g => C.steamTitleKeys(g.title)[0] === k1);
		if (exact.length === 1) return exact[0];
		const loose = cands.filter(g => C.steamTitleKeys(g.title)[1] === k2);
		return loose.length === 1 ? loose[0] : null;
	}

	recentSteamRow(ctx, r) {
		const { U } = ctx;
		const local = this.localFor(ctx, r.appId, r.name);
		const pct = r.achTotal ? Math.floor((r.achUnlocked / r.achTotal) * 100) : null;
		const tag = local ? `a ${U.openAttrs(local.path)}` : `div`;
		return `<${tag} class="sv-recent-row">
			${r.capsule ? `<img src="${U.attr(r.capsule)}" alt="" loading="lazy">` : `<span class="sv-recent-thumb">${local ? U.cover(local, { cls: "sv-cover--xs" }) : U.icon("joystick")}</span>`}
			<span class="sv-recent-text"><b>${U.esc(r.name)}</b><span>${r.hours !== null ? `${U.fmtHours(r.hours)} registradas` : ""}${r.lastPlayedText ? `, ${U.esc(this.enDate(r.lastPlayedText))}` : ""}${local ? "" : `<em class="sv-muted"> fora do vault</em>`}</span>${!local && r.appId ? U.btn("Adicionar", { icon: "plus", kind: "ghost", size: "sm", action: "steam-import", attrs: `data-appid="${U.attr(r.appId)}" data-name="${U.attr(r.name)}" data-hours="${U.attr(r.hours ?? "")}"`, title: `Criar a ficha de ${r.name} com conquistas, horas e artes` }) : ""}</span>
			${pct !== null ? `<span class="sv-recent-ach">${U.progressBar(pct, { thin: true })}<small class="sv-num">${r.achUnlocked}/${r.achTotal}</small></span>` : ""}
		</${tag.split(" ")[0]}>`;
	}

	syncPanel(ctx, cfg, profile) {
		const { U, S } = ctx;
		const cooldown = S.cooldownUntil() > Date.now();
		return `<section class="sv-surface sv-syncpanel">
			<h3>Sincronização</h3>
			${cfg.configured ? `<dl class="sv-kv">
				<div><dt>Perfil</dt><dd><a href="${U.attr(ctx.C.safeUrl(cfg.profileUrl, { hosts: ["steamcommunity.com"] }))}">${U.esc(cfg.customUrl || cfg.steamId64)}</a></dd></div>
				<div><dt>Visibilidade</dt><dd>${cfg.privacy === "public" ? "Pública" : cfg.privacy ? "Privada ou restrita" : "—"}</dd></div>
				<div><dt>Último sync</dt><dd>${cfg.lastSync ? U.esc(`${U.fmtDate(String(cfg.lastSync).slice(0, 10))}`) : "Nunca"}</dd></div>
				<div><dt>Automático</dt><dd>${cfg.autoSync ? "Ligado (a cada 12 h, ao abrir)" : "Desligado"}</dd></div>
				${cooldown ? `<div><dt>Pausa</dt><dd class="sv-warn-text">A Steam limitou consultas; nova tentativa após ${new Date(S.cooldownUntil()).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</dd></div>` : ""}
			</dl>
			<div class="sv-syncpanel-actions">${U.btn("Sincronizar agora", { icon: "refresh", kind: "primary", size: "sm", action: "steam-sync" })}${U.btn("Forçar tudo", { kind: "ghost", size: "sm", action: "steam-sync-force", title: "Ignora o cache de 12 horas" })}${U.btn("Configurar", { icon: "gear", kind: "ghost", size: "sm", action: "steam-connect" })}${U.btn("", { icon: "trash", kind: "ghost", size: "sm", action: "steam-clear", title: "Limpar cache Steam" })}</div>`
				: `<p class="sv-muted">Nenhum perfil conectado. Use o botão Conectar perfil no topo.</p>`}
			<p class="sv-fineprint">Fonte: páginas públicas da Steam Community. Sem Steam Web API, sem login, sem cookies.</p>
		</section>`;
	}

	// ============================================================ ATIVIDADE
	async activity(ctx) {
		const { U, S, C, model } = ctx;
		const cfg = S.getConfig();
		const profile = await S.readProfileCache();
		const events = C.activity(model, { limit: 120 });
		const steamOnly = events.filter(e => C.isSteamGame(e.game));
		const byMonth = new Map();
		for (const e of events) {
			if (e.type !== "achievement") continue;
			const k = e.date.slice(0, 7);
			byMonth.set(k, (byMonth.get(k) || 0) + e.achievements.length);
		}
		const months = [...byMonth].sort().slice(-12);
		const html = `<div class="sv-page">
			${this.profileHero(ctx, cfg, profile)}
			<div class="sv-pad">
				${this.subnav(ctx, "steam-activity")}
				<div class="sv-split">
					<section class="sv-split-main">
						${ctx.X ? ctx.X.calendarBlock(ctx) : ""}
						${U.sectionHead("Linha do tempo", { sub: "Somente eventos com data registrada no vault ou lida da Steam" })}
						${U.tabs([{ id: "all", label: "Tudo", count: events.length }, { id: "steam", label: "Jogos Steam", count: steamOnly.length }], "all", { cls: "sv-tabs--inline" })}
						<div data-feed="all">${ctx.P.activityFeed(ctx, events)}</div>
						<div data-feed="steam" hidden>${ctx.P.activityFeed(ctx, steamOnly)}</div>
					</section>
					<aside class="sv-split-side">
						${months.length ? `${U.sectionHead("Conquistas por mês", { action: this.origin("vault") })}${U.bars(months.map(([m, n]) => ({ label: `${U.months[Number(m.slice(5)) - 1]} ${m.slice(2, 4)}`, value: n, display: String(n) })))}` : ""}
						${profile?.recentGames?.length ? `${U.sectionHead("Na Steam agora", { action: this.origin("steam") })}<div class="sv-recent sv-recent--compact">${profile.recentGames.slice(0, 4).map(r => this.recentSteamRow(ctx, r)).join("")}</div>` : ""}
					</aside>
				</div>
			</div>
		</div>`;
		return {
			active: "steam-activity", html, wire: root => root.querySelectorAll(".sv-tabs--inline .sv-tab").forEach(t => t.addEventListener("click", () => {
				root.querySelectorAll(".sv-tabs--inline .sv-tab").forEach(x => x.classList.toggle("is-active", x === t));
				root.querySelectorAll("[data-feed]").forEach(f => { f.hidden = f.dataset.feed !== t.dataset.tab; });
			}))
		};
	}

	// ====================================================== BIBLIOTECA STEAM
	async library(ctx) {
		const { U, S, C, model } = ctx;
		const cfg = S.getConfig();
		const owned = await S._readCache("games");
		const steamGames = model.games.filter(g => C.isSteamGame(g));
		const missing = (owned?.games || []).filter(x => x.hours > 0 && !this.localFor(ctx, x.appId, x.name)).sort((a, b) => b.hours - a.hours).slice(0, 30);
		window.__svSteamMissing = missing;
		const unsynced = steamGames.filter(g => g.provider === "steam" && C.autoSync(g) && !g.steam.lastSync);
		const noArt = steamGames.filter(g => g.steamAppId && (!g.images.cover || !g.images.background || !g.images.logoFile));
		const artNote = noArt.length ? `<div class="sv-callout">${U.icon("image")}<div><strong>${U.plural(noArt.length, "jogo sem todas as artes", "jogos sem todas as artes")}</strong><p>Capa, fundo e logo vêm da loja Steam, convertidos para um formato leve.</p></div>${U.btn("Baixar artes", { icon: "download", size: "sm", action: "steam-art-all" })}</div>` : "";
		const head = `${this.subnav(ctx, "steam-library")}${this.connectionState(ctx, cfg, null)}${this.attention(ctx, cfg)}${cfg.configured ? `<div class="sv-row-actions sv-steamlib-actions">${U.btn("Importar da biblioteca Steam", { icon: "download", kind: "primary", size: "sm", action: "steam-library-picker" })}${U.btn("Sincronizar agora", { icon: "refresh", kind: "ghost", size: "sm", action: "steam-sync" })}</div>` : ""}${artNote}
			${unsynced.length && cfg.configured ? `<div class="sv-callout">${U.icon("cloudOff")}<div><strong>${U.plural(unsynced.length, "jogo nunca sincronizado", "jogos nunca sincronizados")}</strong><p>${unsynced.slice(0, 5).map(g => U.esc(g.title)).join(", ")}${unsynced.length > 5 ? "…" : ""}</p></div>${U.btn("Sincronizar", { icon: "refresh", size: "sm", action: "steam-sync" })}</div>` : ""}`;
		const res = ctx.P.library(ctx, { games: steamGames, title: "Biblioteca Steam", active: "steam-library", sub: `${U.plural(steamGames.length, "jogo Steam no vault", "jogos Steam no vault")}${owned?.games ? `, ${U.fmtNum(owned.games.length)} no perfil público` : ""}`, headExtra: head, hideAchFilter: true });
		if (missing.length) {
			res.html = res.html.replace(/<\/div>\s*$/, `<section class="sv-block">${U.sectionHead("No seu perfil, fora do vault", { count: missing.length, sub: "Jogos com horas registradas na Steam que ainda não têm ficha. Adicionar cria a ficha, sincroniza as conquistas e baixa capa, fundo e logo.", action: `${missing.length > 1 ? U.btn("Adicionar todos", { icon: "plus", kind: "primary", size: "sm", action: "steam-import" }) : ""}${this.origin("steam")}` })}
				<div class="sv-steamlist">${missing.map(x => `<div class="sv-steamlist-row"><img src="https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${U.attr(x.appId)}/capsule_184x69.jpg" alt="" loading="lazy" onerror="this.outerHTML='<span class=&quot;sv-steamlist-ph&quot;></span>'"><b>${U.esc(x.name)}</b><span class="sv-num">${U.fmtHours(x.hours)}</span>${U.btn("Adicionar", { icon: "plus", kind: "ghost", size: "sm", action: "steam-import", attrs: `data-appid="${U.attr(x.appId)}"`, title: `Criar a ficha de ${x.name} com conquistas e artes` })}</div>`).join("")}</div></section></div>`);
		}
		return res;
	}

	// 1.9.0: o que impede a sincronização, jogo a jogo (sem AppID, erro de
	// sync, tempo que não veio e por quê). Tocar em Sincronizar tenta
	// identificar o AppID sozinho antes de sincronizar.
	attention(ctx, cfg) {
		const { U, S, model } = ctx;
		if (!cfg.configured) return "";
		const rows = [];
		for (const g of model.games) {
			const cand = g.provider === "steam" || (["unset", "none"].includes(g.provider) && /^(pc|steam|windows)$/i.test(g.platform));
			if (!g.steamAppId) { if (cand) rows.push([g, "Sem Steam AppID: tocar em Sincronizar procura pelo nome no seu perfil e na loja"]); continue; }
			if (g.steam.status && !["ok", "no_stats"].includes(g.steam.status)) rows.push([g, S.message(g.steam.status)]);
			else if (g.steam.lastSync && g.steam.playtimeHours === null && g.steam.hoursNote) rows.push([g, `Tempo de jogo não veio: ${S.message(g.steam.hoursNote === "not_owned" ? "not_owned" : g.steam.hoursNote)}`]);
		}
		if (!rows.length) return "";
		return `<section class="sv-block sv-steamfix">${U.sectionHead("Precisam de atenção", { count: rows.length, sub: "Jogos que a sincronização não conseguiu completar" })}
			<div class="sv-steamlist">${rows.slice(0, 20).map(([g, why]) => `<div class="sv-steamlist-row sv-steamfix-row"><span class="sv-steamfix-cover">${U.cover(g, { cls: "sv-cover--xs" })}</span><span class="sv-steamfix-text"><a ${U.openAttrs(g.path)}><b>${U.esc(g.title)}</b></a><small>${U.esc(why)}</small></span>${U.btn("Sincronizar", { icon: "refresh", kind: "ghost", size: "sm", action: "steam-sync-game", attrs: `data-path="${U.attr(g.path)}"` })}</div>`).join("")}</div>
		</section>`;
	}

	// ============================================================== VITRINE
	// 3.60.0: faixas longas mostram 24 capas; "Ver todos" abre a Biblioteca
	// com o mesmo filtro (as faixas inteiras chegavam a milhares de nós)
	seeAll(ctx, filter) {
		const { U } = ctx;
		return `<a class="sv-link" ${U.openAttrs("Dashboard/Biblioteca")} data-lib-filter="${U.attr(JSON.stringify(filter))}">Ver todos</a>`;
	}

	// 1.13.0: nomes das vitrines da Steam (a página é lida em inglês)
	caseTitle(t) {
		const s = String(t || "").replace(/\s+/g, " ").trim();
		const map = { "achievement showcase": "Vitrine de conquistas", "rarest achievement showcase": "Conquistas mais raras", "screenshot showcase": "Capturas de tela",
			"artwork showcase": "Artes", "favorite game": "Jogo favorito", "game collector": "Colecionador", "awards showcase": "Prêmios", "item showcase": "Itens",
			"items for trade": "Itens para troca", "trade showcase": "Itens para troca", "workshop showcase": "Oficina", "my workshop": "Oficina", "favorite group": "Grupo favorito",
			"badge collector": "Colecionador de insígnias", "featured badge": "Insígnia em destaque", "review showcase": "Análise em destaque", "guide showcase": "Guia em destaque",
			"my guides": "Guias", "completionist showcase": "Jogos 100%" };
		return map[s.toLowerCase()] || s || "Vitrine";
	}

	// 1.13.0: a Vitrine segue as vitrines do perfil da Steam — jogo em destaque,
	// vitrine de conquistas (com os números) e colecionador — montadas com o
	// que já está no vault; as vitrines públicas do perfil vêm depois
	async showcase(ctx) {
		const { U, S, C, model } = ctx;
		const cfg = S.getConfig();
		const profile = await S.readProfileCache();
		const steamGames = model.games.filter(g => C.isSteamGame(g));
		const known = steamGames.filter(g => g.ach.state === "known" && g.ach.total > 0);
		const perfect = steamGames.filter(g => C.isPerfect(g));
		const rare = steamGames.flatMap(g => g.achievements.filter(a => a.unlocked && a.rarity !== null).map(a => ({ a, g }))).sort((x, y) => x.a.rarity - y.a.rarity).slice(0, 6);
		const favs = steamGames.filter(g => g.favorite);
		const showcases = (profile?.showcases || []).filter(s => s.title || s.images?.length || s.stats?.length || s.text);
		const pct = g => g.ach.total ? Math.floor((g.ach.unlocked / g.ach.total) * 100) : 0;

		// jogo em destaque: o favorito mais jogado; sem favorito, o mais jogado
		const byHours = (a, b) => b.playtime.hours - a.playtime.hours;
		const feat = [...favs].sort(byHours)[0] || [...steamGames].filter(g => g.playtime.hours > 0).sort(byHours)[0] || null;
		const featArt = feat ? (feat.images.background || feat.images.featured || "") : "";
		const featHtml = feat ? `<section class="sv-block">
			<a class="sv-svfeat${featArt ? "" : " is-noart"}" ${U.openAttrs(feat.path)}>
				${featArt ? `<img class="sv-svfeat-art" src="${U.attr(featArt)}" alt="" loading="lazy" data-sv-img>` : ""}
				<span class="sv-svfeat-body">
					<span class="sv-svfeat-cover">${U.cover(feat)}</span>
					<span class="sv-svfeat-text">
						<span class="sv-svfeat-kicker">${U.icon(feat.favorite ? "heart" : "clock")}${feat.favorite ? "Jogo favorito" : "Mais jogado"}</span>
						<strong>${U.esc(feat.title)}</strong>
						<span class="sv-svfeat-nums">
							<span><b class="sv-num">${U.esc(U.fmtHours(feat.playtime.hours))}</b><small>jogadas</small></span>
							${feat.ach.state === "known" && feat.ach.total ? `<span><b class="sv-num">${feat.ach.unlocked}<i>/${feat.ach.total}</i></b><small>conquistas</small></span>` : ""}
							${feat.lastPlayed?.date ? `<span><b>${U.esc(U.relDate(feat.lastPlayed.date))}</b><small>última vez</small></span>` : ""}
						</span>
						${feat.ach.state === "known" && feat.ach.total ? `<span class="sv-svfeat-bar"><span style="width:${pct(feat)}%"></span></span>` : ""}
					</span>
				</span>
			</a>
		</section>` : "";

		// vitrine de conquistas: números + as mais raras
		const unlocked = known.reduce((n, g) => n + g.ach.unlocked, 0);
		const started = known.filter(g => g.ach.unlocked > 0);
		const avg = started.length ? Math.round(started.reduce((n, g) => n + g.ach.unlocked / g.ach.total, 0) / started.length * 100) : null;
		const achHtml = known.length ? `<section class="sv-block sv-svach">
			${U.sectionHead("Vitrine de conquistas", { sub: rare.length ? "As mais raras que você desbloqueou" : "Seus números nas conquistas da Steam", action: this.origin("vault") })}
			<div class="sv-svach-card">
				${rare.length ? `<div class="sv-rarewall sv-rarewall--compact">${rare.map(({ a, g }) => `<a class="sv-medallion sv-rarity-${U.rarityTier(a.rarity)}" ${U.openAttrs(a.path || g.path)} title="${U.attr(`${a.name} · ${g.title}`)}"><div>${a.iconSrc ? `<img src="${U.attr(a.iconSrc)}" alt="">` : U.icon("trophy")}</div><span><b>${U.esc(a.name)}</b><em>${U.fmtPct(a.rarity)}</em></span></a>`).join("")}</div>` : ""}
				<div class="sv-svach-stats">
					<span><b class="sv-num">${U.fmtNum(unlocked)}</b><small>conquistas</small></span>
					<span class="${perfect.length ? "is-gold" : ""}"><b class="sv-num">${U.fmtNum(perfect.length)}</b><small>jogos 100%</small></span>
					<span><b class="sv-num">${avg === null ? "—" : `${avg}%`}</b><small>média de conclusão</small></span>
				</div>
			</div>
		</section>` : "";

		// colecionador: os mais perto dos 100% (sem os já completos)
		const near = known.filter(g => !C.isPerfect(g) && g.ach.unlocked > 0).sort((a, b) => pct(b) - pct(a) || (a.ach.total - a.ach.unlocked) - (b.ach.total - b.ach.unlocked)).slice(0, 5);
		const nearHtml = near.length ? `<section class="sv-block">
			${U.sectionHead("Rumo aos 100%", { sub: "Os jogos Steam mais perto de completar", action: this.origin("vault") })}
			<div class="sv-svnear">${near.map(g => `<a class="sv-svnear-row" ${U.openAttrs(g.path)}>
				${U.cover(g, { cls: "sv-cover--xs" })}
				<span class="sv-svnear-text"><b>${U.esc(g.title)}</b><small>${g.ach.unlocked} de ${g.ach.total} · ${g.ach.total - g.ach.unlocked === 1 ? "falta 1" : `faltam ${g.ach.total - g.ach.unlocked}`}</small>
					<span class="sv-svnear-bar"><span style="width:${pct(g)}%"></span></span></span>
				<b class="sv-svnear-pct sv-num">${pct(g)}%</b>
			</a>`).join("")}</div>
		</section>` : "";

		// vitrines públicas do perfil Steam
		const casesHtml = showcases.length ? `<section class="sv-block">${U.sectionHead("Vitrines do perfil", { sub: "Como aparecem publicamente na Steam", action: this.origin("steam") })}
			<div class="sv-steamcases">${showcases.map(s => `<article class="sv-steamcase"><h3>${U.icon("layers")}${U.esc(this.caseTitle(s.title))}</h3>
				${s.stats?.length ? U.figures(s.stats.slice(0, 4).map(x => ({ label: x.label, value: x.value }))) : ""}
				${s.images.length ? `<div class="sv-steamcase-imgs">${s.images.map(src => `<img src="${U.attr(src)}" alt="" loading="lazy">`).join("")}</div>` : ""}
				${s.text ? `<p>${U.esc(s.text)}</p>` : ""}</article>`).join("")}</div></section>` : "";

		const empty = !featHtml && !achHtml && !nearHtml && !casesHtml && !perfect.length && !favs.length;
		const html = `<div class="sv-page">
			${this.profileHero(ctx, cfg, profile)}
			<div class="sv-pad">
				${this.subnav(ctx, "steam-showcase")}
				${!cfg.configured ? this.connectionState(ctx, cfg, null) : ""}
				${featHtml}${achHtml}${nearHtml}
				${U.shelf("Jogos 100%", perfect.slice(0, 24).map(g => U.gameCard(g, C)), { count: perfect.length, action: perfect.length > 24 ? this.seeAll(ctx, { progress: "perfect", ach: "p:steam" }) : "" })}
				${casesHtml}
				${U.shelf("Favoritos Steam", favs.slice(0, 24).map(g => U.gameCard(g, C)), { count: favs.length, action: favs.length > 24 ? this.seeAll(ctx, { fav: true, ach: "p:steam" }) : "" })}
				${cfg.configured && empty ? `<div class="sv-callout">${U.icon("info")}<div><strong>A vitrine ainda está vazia</strong><p>Sincronize os jogos Steam e marque favoritos para preencher esta tela.</p></div></div>` : ""}
				${cfg.configured && !showcases.length && !empty ? `<p class="sv-muted sv-svhint">${U.icon("info")}As vitrines configuradas no seu perfil Steam (conquistas, capturas, colecionador…) aparecem aqui depois do próximo sync.</p>` : ""}
			</div>
		</div>`;
		return { active: "steam-showcase", html };
	}
}
