// ==========================================================================
// Game Library — Perfis das plataformas (GOG integrado; Xbox, PlayStation, Epic… manuais)
//
// Mesma estrutura dos perfis Steam e RetroAchievements: topo com avatar,
// nome e números, painel de sincronização, jogos do vault, jogos recentes,
// jogos do perfil fora do vault (com Adicionar) e conquistas recentes.
// Cada plataforma com a sua cor; a linguagem é a da Game Library.
// Também guarda os fluxos (conectar, sincronizar, importar, desconectar)
// e a tela Integrações (hub de todas as contas).
//
// Acesso: customJS.SteamVaultPlatformPages
// ==========================================================================

class SteamVaultPlatformPages {

	get U() { return customJS.SteamVaultUI; }
	get C() { return customJS.SteamVaultCore; }
	get V() { return customJS.SteamVault; }
	get PL() { return customJS.SteamVaultPlatforms; }

	// rotas
	xbox(ctx) { return this.manualPage(ctx, "xbox"); }
	gog(ctx) { return this.page(ctx, "gog"); }
	epic(ctx) { return this.manualPage(ctx, "epic"); }
	psn(ctx) { return this.manualPage(ctx, "playstation"); }
	nintendo(ctx) { return this.manualPage(ctx, "nintendo"); }
	googleplay(ctx) { return this.manualPage(ctx, "googleplay"); }
	integrations(ctx) { return this.hub(ctx); }

	// ================================================================ página
	async page(ctx, id) {
		const { U, C, model } = ctx;
		const PL = this.PL, p = PL.get(id), cfg = PL.getConfig(id);
		const cache = cfg.configured ? await PL.readCache(id) : null;
		const games = model.games.filter(g => g.provider === p.provider || g.page?.[p.idField]);
		const linked = games.filter(g => g.page?.[p.idField]);
		const remote = cache?.games || [];
		const missing = cfg.configured ? (await PL.missing(id, ctx)).slice(0, 40) : [];
		const recent = [...remote].filter(x => x.lastPlayed).sort((a, b) => b.lastPlayed.localeCompare(a.lastPlayed)).slice(0, 8);
		const byRemote = new Map(linked.map(g => [String(g.page[p.idField]), g]));
		const recentAch = model.games.filter(g => g.provider === p.provider).flatMap(g => g.achievements.filter(a => a.unlocked && a.unlockedDate && a.syncedFrom === id).map(a => ({ a, g })))
			.sort((x, y) => (y.a.unlockedDate + y.a.unlockedTime).localeCompare(x.a.unlockedDate + x.a.unlockedTime)).slice(0, 8);
		const figs = this.figures(ctx, id, cfg, remote, games);
		const html = `<div class="sv-page sv-page--plat sv-plat--${id}">
			<section class="sv-plathero">
				<div class="sv-plathero-inner">
					<div class="sv-plathero-ava">${U.icon(U.providerIcon(id))}${cfg.avatar ? `<img src="${U.attr(cfg.avatar)}" alt="" data-sv-img>` : ""}</div>
					<div class="sv-plathero-text">
						<span class="sv-plathero-kicker"><i aria-hidden="true"></i>${U.esc(p.label)}</span>
						<h1>${U.esc(cfg.configured ? cfg.name : `Perfil ${p.label}`)}</h1>
						<p class="sv-meta">${cfg.configured ? `<span>gog.com/u/${U.esc(cfg.account)}</span>${cfg.lastSync ? `<span>Sincronizado ${U.esc(U.relDate(cfg.lastSync.slice(0, 10)))}</span>` : "<span>Ainda não sincronizado</span>"}${!cfg.enabled ? "<span>Integração desativada</span>" : ""}` : `<span>${U.esc(p.connect.how)}</span>`}</p>
						${cfg.configured ? `<dl class="sv-figures sv-plathero-figs">${figs.map(f => `<div class="sv-figure"><dt>${U.esc(f.label)}</dt><dd>${f.value}</dd></div>`).join("")}</dl>` : ""}
					</div>
					<div class="sv-plathero-actions">${cfg.configured
						? `${cfg.enabled ? U.btn("Sincronizar", { icon: "refresh", kind: "primary", action: "plat-sync", attrs: `data-platform="${id}"` }) : ""}${C.safeUrl(cfg.profileUrl, { hosts: p.linkHosts || [] }) ? `<a class="sv-btn sv-btn--ghost" href="${U.attr(C.safeUrl(cfg.profileUrl, { hosts: p.linkHosts || [] }))}">${U.icon("external")}<span>Abrir perfil</span></a>` : ""}`
						: U.btn(`Conectar ${p.label}`, { icon: "link", kind: "primary", action: "plat-connect", attrs: `data-platform="${id}"` })}</div>
				</div>
			</section>
			<div class="sv-pad sv-plat-body">
				${cfg.syncStatus && !["ok", "partial"].includes(cfg.syncStatus) ? `<div class="sv-callout">${U.icon("cloudOff")}<div><strong>${U.esc(cfg.syncError || PL.message(id, cfg.syncStatus))}</strong><p>Os dados já sincronizados continuam nas fichas.</p></div></div>` : ""}
				<div class="sv-split">
					<section class="sv-split-main">
						${cfg.configured ? "" : this.pitch(ctx, id)}
						${linked.length ? `${U.sectionHead("No vault", { count: linked.length, sub: `Fichas ligadas ao seu perfil ${p.label}` })}<div class="sv-achgames">${this.sortGames(linked).map(g => ctx.H ? ctx.H.gameRow(ctx, g, { extra: this.gameExtra(ctx, id, g) }) : "").join("")}</div>` : ""}
						${recent.length ? `<section class="sv-block">${U.sectionHead("Jogados recentemente", { action: this.origin(id) })}<div class="sv-plat-recent">${recent.map(x => this.remoteRow(ctx, id, x, byRemote.get(x.id))).join("")}</div></section>` : ""}
						${missing.length ? `<section class="sv-block">${U.sectionHead("No seu perfil, fora do vault", { count: missing.length, sub: "Adicionar cria a ficha já ligada ao perfil (origem " + p.label + ", sincronização Automática).", action: missing.length > 1 ? U.btn("Adicionar todos", { icon: "plus", kind: "primary", size: "sm", action: "plat-import", attrs: `data-platform="${id}"` }) : "" })}<div class="sv-plat-recent">${missing.map(x => this.remoteRow(ctx, id, x, null, true)).join("")}</div></section>` : ""}
					</section>
					<aside class="sv-split-side">
						${this.syncPanel(ctx, id, cfg)}
						${recentAch.length ? `<div class="sv-sechead-gap"></div>${U.sectionHead("Conquistas recentes")}<div class="sv-achlist sv-achlist--compact">${recentAch.map(({ a, g }) => U.achievementTile(a, { showGame: g })).join("")}</div>` : ""}
					</aside>
				</div>
			</div>
		</div>`;
		return { active: `${id}-profile`, html, wire: root => this.wireToggles(root, id) };
	}

	sortGames(list) { return [...list].sort((a, b) => (b.lastPlayed.date || "").localeCompare(a.lastPlayed.date || "") || a.title.localeCompare(b.title)); }

	origin(id) { return `<span class="sv-origin sv-origin--${id}" title="Lido do seu perfil">GOG</span>`; }

	figures(ctx, id, cfg, remote, games) {
		const U = this.U;
		const hours = remote.reduce((s, g) => s + (g.playtimeHours || 0), 0);
		const withPct = remote.filter(g => g.achPct !== null);
		return [
			{ label: "Jogos no perfil", value: U.fmtNum(remote.length) },
			{ label: "Tempo de jogo", value: U.fmtHours(Math.round(hours)) },
			{ label: "Média de conquistas", value: withPct.length ? `${Math.round(withPct.reduce((s, g) => s + g.achPct, 0) / withPct.length)}%` : "—" },
			{ label: "Jogos no vault", value: U.fmtNum(games.length) }
		];
	}

	gameExtra(ctx, id, g) {
		const U = this.U;
		if (id === "gog" && g.gog.playtimeHours) return `<span>${U.esc(U.fmtHours(g.gog.playtimeHours))}</span>`;
		return "";
	}

	remoteRow(ctx, id, x, g, add = false) {
		const U = this.U;
		const prog = (x.achPct !== null ? { pct: Math.floor(x.achPct), label: `${Math.floor(x.achPct)}% das conquistas` } : null);
		const time = id === "gog" && x.playtimeHours ? U.fmtHours(x.playtimeHours) : "";
		return `<div class="sv-plat-row">
			<span class="sv-plat-thumb">${U.icon(U.providerIcon(id))}${x.image ? `<img src="${U.attr(x.image)}" alt="" loading="lazy" data-sv-img>` : ""}</span>
			<div class="sv-plat-row-text">
				<b>${g ? `<a ${U.openAttrs(g.path)}>${U.esc(x.title)}</a>` : U.esc(x.title)}</b>
				<small class="sv-meta">${prog ? `<span>${U.esc(prog.label)}</span>` : "<span>Sem conquistas</span>"}${time ? `<span>${U.esc(time)}</span>` : ""}${x.lastPlayed ? `<span>${U.esc(U.relDate(x.lastPlayed))}</span>` : ""}</small>
				${prog ? `<span class="sv-plat-bar"><span style="width:${prog.pct}%"></span></span>` : ""}
			</div>
			${add ? U.btn("Adicionar", { icon: "plus", kind: "ghost", size: "sm", action: "plat-import", attrs: `data-platform="${id}" data-id="${U.attr(x.id)}"` })
				: g ? `<a class="sv-btn sv-btn--ghost sv-btn--sm" ${U.openAttrs(g.path)}>${U.icon("eye")}<span>Ficha</span></a>` : ""}
		</div>`;
	}

	pitch(ctx, id) {
		const U = this.U, p = this.PL.get(id);
		return `<section class="sv-surface sv-plat-pitch">
			<h3>O que é sincronizado</h3>
			<ul class="sv-plat-list is-yes">${p.syncs.map(x => `<li>${U.icon("check")}<span>${U.esc(x)}</span></li>`).join("")}</ul>
			<ul class="sv-plat-list is-no">${p.notSynced.map(x => `<li>${U.icon("x")}<span>${U.esc(x)}</span></li>`).join("")}</ul>
			<p class="sv-fineprint">${U.esc(p.privacy)}</p>
		</section>`;
	}

	syncPanel(ctx, id, cfg) {
		const U = this.U, PL = this.PL, p = PL.get(id);
		return `<section class="sv-surface sv-syncpanel sv-plat-sync">
			<h3>Sincronização ${U.esc(p.label)}</h3>
			${cfg.configured ? `<dl class="sv-kv">
				<div><dt>Conta</dt><dd>${U.esc(cfg.name)}</dd></div>
				<div><dt>Último sync</dt><dd>${cfg.lastSync ? U.esc(U.fmtDate(cfg.lastSync.slice(0, 10))) : "Nunca"}</dd></div>
				${cfg.syncStatus && cfg.syncStatus !== "ok" ? `<div><dt>Estado</dt><dd class="sv-warn-text">${U.esc(cfg.syncStatus === "partial" ? "Parcial" : PL.message(id, cfg.syncStatus))}</dd></div>` : ""}
			</dl>
			<label class="sv-switch"><input type="checkbox" data-plat-flag="enabled" ${cfg.enabled ? "checked" : ""}><span></span>Integração ativa</label>
			<label class="sv-switch"><input type="checkbox" data-plat-flag="autoSync" ${cfg.autoSync ? "checked" : ""} ${cfg.enabled ? "" : "disabled"}><span></span>Sincronizar ao abrir (no máximo a cada 12 h)</label>
			<div class="sv-syncpanel-actions">${cfg.enabled ? U.btn("Sincronizar agora", { icon: "refresh", size: "sm", action: "plat-sync", attrs: `data-platform="${id}"` }) : ""}${U.btn("Configurar", { icon: "gear", kind: "ghost", size: "sm", action: "plat-connect", attrs: `data-platform="${id}"` })}${U.btn("Desconectar", { icon: "trash", kind: "ghost", size: "sm", action: "plat-disconnect", attrs: `data-platform="${id}"` })}</div>`
			: `<p class="sv-muted">Nenhum perfil conectado. Use o botão Conectar no topo.</p>`}
			<p class="sv-fineprint">${U.esc(p.limits)}</p>
		</section>`;
	}

	wireToggles(root, id) {
		root.querySelectorAll(`[data-plat-flag]`).forEach(inp => inp.addEventListener("change", async () => {
			const pid = inp.closest("[data-platform-block]")?.dataset.platformBlock || id;
			await this.PL.setFlag(pid, inp.dataset.platFlag, inp.checked);
			this.V.toast(inp.dataset.platFlag === "enabled" ? (inp.checked ? "Integração ativada" : "Integração desativada") : (inp.checked ? "Sincronização ao abrir ligada" : "Sincronização ao abrir desligada"), { tone: "ok", icon: "check" });
			setTimeout(() => this.V.refresh(), 250);
		}));
	}

	// ============================================================ fluxos
	openConnect(ctx, id) {
		if (this.PL.isManual(id)) return this.openManualSetup(ctx, id);
		const U = this.U, PL = this.PL, p = PL.get(id), cfg = PL.getConfig(id);
		const body = document.createElement("div");
		body.innerHTML = `<div class="sv-platconnect">
			<p class="sv-modal-text">${U.esc(p.connect.how)} ${p.connect.link ? `<a href="${U.attr(p.connect.link)}">Abrir ${U.esc(new URL(p.connect.link).hostname)}</a>` : ""}</p>
			${p.connect.fields.map(f => `<label class="sv-mgr-field"><span class="sv-label">${U.esc(f.label)}</span><input class="sv-input" data-pf="${f.k}" ${f.secret ? 'type="password" autocomplete="off"' : 'autocomplete="off" autocapitalize="off"'} spellcheck="false" placeholder="${U.attr(f.secret && cfg.hasSecret ? `atual: ${cfg.masked} (deixe vazio para manter)` : f.placeholder)}" value="${U.attr(!f.secret && f.k === "user" ? cfg.account : "")}"></label>`).join("")}
			<div class="sv-plat-cols">
				<div><span class="sv-label">Sincroniza</span><ul class="sv-plat-list is-yes">${p.syncs.map(x => `<li>${U.icon("check")}<span>${U.esc(x)}</span></li>`).join("")}</ul></div>
				<div><span class="sv-label">Não sincroniza</span><ul class="sv-plat-list is-no">${p.notSynced.map(x => `<li>${U.icon("x")}<span>${U.esc(x)}</span></li>`).join("")}</ul></div>
			</div>
			<p class="sv-fineprint">${U.icon("lock")} ${U.esc(p.privacy)}</p>
			<p class="sv-formmsg" data-pmsg></p>
		</div>`;
		const m = this.V.modal({ title: `Conectar ${p.label}`, sub: cfg.configured ? `Conectado como ${cfg.name}` : "", size: "sm", body,
			actions: `${U.btn("Cancelar", { kind: "ghost", attrs: "data-close" })}${U.btn(cfg.configured ? "Salvar e verificar" : "Conectar", { kind: "primary", icon: "link", attrs: "data-pgo" })}` });
		const go = m.el.querySelector("[data-pgo]");
		go.addEventListener("click", async () => {
			const msg = body.querySelector("[data-pmsg]");
			const values = {};
			body.querySelectorAll("[data-pf]").forEach(i => { values[i.dataset.pf] = i.value.trim(); });
			go.disabled = true; msg.textContent = "Verificando…"; msg.className = "sv-formmsg";
			try {
				const r = await PL.connect(id, values);
				if (!r.ok) { msg.textContent = PL.message(id, r.code); msg.className = "sv-formmsg is-error"; go.disabled = false; return; }
				m.close();
				this.V.toast(`${p.label}: conectado como ${r.profile.name}`, { tone: "ok", icon: "link" });
				setTimeout(() => this.sync(ctx, id), 400);
			} catch (err) { msg.textContent = err.message; msg.className = "sv-formmsg is-error"; go.disabled = false; }
		});
	}

	async sync(ctx, id) {
		const PL = this.PL, p = PL.get(id), cfg = PL.getConfig(id);
		if (!cfg.configured) return this.openConnect(ctx, id);
		if (!cfg.enabled) return this.V.toast(`${p.label}: integração desativada`, { tone: "warn" });
		const t = this.V.toast(`Lendo seu perfil ${p.label}…`, { sticky: true, icon: "refresh", progress: 0 });
		try {
			const r = await PL.syncAll(id, { onProgress: ({ index, total, name }) => t.update(`${p.label}: ${name} (${index}/${total})`, { progress: (index / total) * 100 }) });
			if (!r.ok) t.update(r.code === "busy" ? `${p.label}: já existe uma sincronização em andamento` : PL.message(id, r.code), { tone: r.code === "rate_limited" || r.code === "busy" ? "warn" : "error" });
			else {
				const parts = [`${customJS.SteamVaultUI.plural(r.games, "jogo", "jogos")} no perfil`];
				if (r.synced) parts.push(`${customJS.SteamVaultUI.plural(r.synced, "ficha atualizada", "fichas atualizadas")}`);
				if (r.created) parts.push(`${customJS.SteamVaultUI.plural(r.created, "conquista nova", "conquistas novas")}`);
				if (r.linked) parts.push(`${customJS.SteamVaultUI.plural(r.linked, "ligado", "ligados")} pelo título`);
				if (r.failed) parts.push(`${r.failed} com falha`);
				t.update(`${p.label}: ${parts.join(", ")}`, { tone: r.failed ? "warn" : "ok" });
			}
		} catch (err) { t.update(`${p.label}: ${err.message}`, { tone: "error" }); }
		t.close(5000);
		this.V.refresh();
	}

	async syncGame(ctx, id, path) {
		const cfg = this.PL.getConfig(id);
		if (!cfg.configured) return this.openConnect(ctx, id);
		void path;
		return this.sync(ctx, id);
	}

	async importGames(ctx, id, remoteId) {
		const PL = this.PL, p = PL.get(id);
		const ids = remoteId ? [remoteId] : (await PL.missing(id, ctx)).slice(0, 40).map(x => x.id);
		if (!ids.length) return;
		if (ids.length > 1 && !(await this.V.confirm({ title: `Adicionar ${ids.length} jogos?`, text: `Cada um vira uma ficha com origem ${p.label} e sincronização Automática.`, confirm: "Adicionar" }))) return;
		const t = this.V.toast(`${p.label}: adicionando…`, { sticky: true, icon: "plus", progress: 0 });
		let done = 0, fail = 0;
		for (const [i, x] of ids.entries()) {
			t.update(`${p.label}: adicionando ${i + 1}/${ids.length}`, { progress: ((i + 1) / ids.length) * 100 });
			try { const r = await PL.importGame(id, x); if (r.ok) done++; else fail++; } catch (_) { fail++; }
		}
		t.update(`${p.label}: ${customJS.SteamVaultUI.plural(done, "jogo adicionado", "jogos adicionados")}${fail ? `, ${fail} com falha` : ""}`, { tone: fail ? "warn" : "ok" });
		t.close(4000);
		this.V.refresh();
	}

	async disconnect(ctx, id) {
		const p = this.PL.get(id);
		if (this.PL.isManual(id)) {
			if (!(await this.V.confirm({ title: `Remover o perfil ${p.label}?`, text: "Apaga só o nome/ID informado. Jogos e conquistas continuam no vault.", confirm: "Remover" }))) return;
			await this.PL.saveConfig(id, { setup: false, account: "", name: "", profileUrl: "" });
			return setTimeout(() => this.V.refresh(), 250);
		}
		const ok = await this.V.confirm({ title: `Desconectar ${p.label}?`, text: `Remove a conexão${p.secretKey ? " e a chave deste dispositivo" : ""} e o cache do perfil. As fichas e conquistas já sincronizadas continuam no vault.`, confirm: "Desconectar", danger: true });
		if (!ok) return;
		await this.PL.disconnect(id);
		this.V.toast(`${p.label} desconectado`, { icon: "check" });
		setTimeout(() => this.V.refresh(), 250);
	}

	// ============================================================ HUB
	// Dashboard/Integrações: todas as contas num lugar só — Steam,
	// RetroAchievements, GOG (leitura automática), Xbox, Epic e PlayStation
	// (perfis manuais) e as plataformas sem integração segura. Cada card usa
	// a cor da plataforma e mostra estado, conta, números do vault e ações.
	entries(ctx) {
		const { C, model } = ctx;
		const U = this.U;
		const PL = this.PL, st = C.providerStats(model);
		const S = ctx.S, R = ctx.R;
		const out = [];
		const sc = S?.getConfig ? S.getConfig() : { configured: false };
		out.push({
			id: "steam", provider: "steam", label: "Steam", icon: "b-steam", page: "Dashboard/Steam", kind: "auto",
			configured: !!sc.configured, enabled: true, name: sc.name || sc.customUrl || sc.steamId64 || "", avatar: sc.avatar || "",
			lastSync: String(sc.lastSync || ""), autoSync: !!sc.autoSync, status: sc.configured && sc.privacy && sc.privacy !== "public" ? "Perfil não público: o sync fica indisponível" : sc.syncStatus && !["ok", "partial"].includes(sc.syncStatus) ? (S.message ? S.message(sc.syncStatus) : sc.syncStatus) : "",
			connect: 'data-action="steam-connect"', sync: 'data-action="steam-sync"', auto: "steam",
			how: "Perfil público da Steam Community, sem login",
			syncs: ["Nome, avatar e nível do perfil", "Tempo de jogo e última sessão", "Conquistas com data e raridade global", "Artes da loja (capa, fundo e logo)"],
			notSynced: ["Senha, login, cookies ou Steam Web API", "Perfis ou detalhes de jogos privados"],
			stats: st.steam
		});
		const rc = R?.getConfig ? R.getConfig() : { configured: false };
		out.push({
			id: "retroachievements", provider: "retroachievements", label: "RetroAchievements", icon: "b-retro", page: "Dashboard/RetroAchievements", kind: "auto",
			configured: !!rc.configured, enabled: true, name: rc.user || "", avatar: rc.avatar || "",
			lastSync: String(rc.lastSync || ""), autoSync: !!rc.autoSync, status: rc.syncStatus && !["ok", "partial"].includes(rc.syncStatus) ? (rc.syncError || (R.message ? R.message(rc.syncStatus) : rc.syncStatus)) : (!rc.configured && rc.hasKey ? "Falta o nome de usuário" : ""),
			connect: 'data-action="ra-connect"', sync: 'data-action="ra-sync"', auto: "ra",
			how: "Web API oficial, com usuário e Web API Key",
			syncs: ["Perfil, pontos hardcore/softcore e ranking", "Jogos com progresso e prêmios", "Conquistas com pontos, raridade, hardcore e data"],
			notSynced: ["Desbloqueios (só o emulador desbloqueia)", "Senha da conta"],
			stats: st.retroachievements
		});
		for (const p of Object.values(PL.platforms())) {
			const cfg = PL.getConfig(p.id);
			const manual = p.kind === "manual";
			out.push({
				id: p.id, provider: p.provider, label: p.label, page: p.page, kind: manual ? "manual" : "auto",
				icon: U.providerIcon(p.id),
				configured: cfg.configured, enabled: cfg.enabled, name: cfg.name || cfg.account || "", avatar: cfg.avatar || "",
				lastSync: cfg.lastSync, autoSync: cfg.autoSync,
				status: !manual && cfg.syncStatus && !["ok", "partial"].includes(cfg.syncStatus) ? (cfg.syncError || PL.message(p.id, cfg.syncStatus)) : "",
				connect: `data-action="plat-connect" data-platform="${p.id}"`, sync: `data-action="plat-sync" data-platform="${p.id}"`,
				importList: manual ? `data-action="plat-import-list" data-platform="${p.id}"` : "",
				how: manual ? (p.id === "xbox" ? "Perfil manual, com cadastro rápido de conquistas, G e ícones" : "Perfil manual: você registra, a Game Library organiza") : "Perfil público da GOG, sem login",
				syncs: p.syncs, notSynced: p.notSynced, stats: manual ? this.manualStats(PL.gamesFor(p.id, model)) : st[p.provider], platformBlock: !manual
			});
		}
		return out;
	}

	state(e) {
		if (e.kind === "manual") return e.configured ? ["info", "Perfil manual"] : ["off", "Manual"];
		if (!e.configured) return ["off", e.status ? "Incompleta" : "Não conectada"];
		if (!e.enabled) return ["off", "Pausada"];
		if (e.status) return ["warn", "Atenção"];
		return ["ok", "Conectada"];
	}

	card(ctx, e) {
		const U = this.U;
		const [tone, label] = this.state(e);
		const s = e.stats || { games: [], unlocked: 0, total: 0, perfect: 0 };
		const ach = s.total ? `${U.fmtNum(s.unlocked)}/${U.fmtNum(s.total)}` : "—";
		const pct = s.total ? Math.floor((s.unlocked / s.total) * 100) : null;
		const line = e.kind === "manual"
			? (e.name ? `${U.esc(e.name)} · informado por você` : U.esc(e.how))
			: e.configured ? `${U.esc(e.name)}${e.enabled ? ` · ${e.lastSync ? `sync ${U.esc(U.relDate(e.lastSync.slice(0, 10)))}` : "nunca sincronizado"}` : " · integração pausada"}` : U.esc(e.how);
		const btn = (label, icon, attrs, kind = "secondary") => `<button type="button" class="sv-btn sv-btn--${kind} sv-btn--sm" ${attrs}>${U.icon(icon)}<span>${U.esc(label)}</span></button>`;
		const actions = e.kind === "manual"
			? `${btn("Importar jogos", "plus", e.importList, "primary")}${btn(e.configured ? "Editar" : "Configurar", "user", e.connect, "ghost")}`
			: e.configured
				? `${e.enabled ? btn("Sincronizar", "refresh", e.sync, "primary") : ""}${btn("Configurar", "gear", e.connect, "ghost")}`
				: btn("Conectar", "link", e.connect, "primary");
		const auto = e.kind === "auto" && e.configured ? (e.platformBlock
			? `<label class="sv-switch sv-intcard-auto"><input type="checkbox" data-plat-flag="autoSync" ${e.autoSync ? "checked" : ""} ${e.enabled ? "" : "disabled"}><span></span>Sincronizar ao abrir</label>`
			: `<label class="sv-switch sv-intcard-auto"><input type="checkbox" data-int-auto="${e.auto}" ${e.autoSync ? "checked" : ""}><span></span>Sincronizar ao abrir</label>`) : "";
		return `<article class="sv-intcard sv-achsrc--${e.id} sv-plat--${e.id} is-${tone}"${e.platformBlock ? ` data-platform-block="${e.id}"` : ""}>
			<header class="sv-intcard-head">
				<a class="sv-intcard-logo" ${U.openAttrs(e.page)} aria-label="Abrir ${U.attr(e.label)}">${U.icon(e.icon)}${e.avatar ? `<img src="${U.attr(e.avatar)}" alt="" data-sv-img>` : ""}</a>
				<div class="sv-intcard-title"><b><a ${U.openAttrs(e.page)}>${U.esc(e.label)}</a></b><small>${line}</small></div>
				<span class="sv-intcard-state is-${tone}"><i aria-hidden="true"></i>${U.esc(label)}</span>
			</header>
			${e.status ? `<p class="sv-intcard-alert">${U.icon("alert")}<span>${U.esc(e.status)}</span></p>` : ""}
			<dl class="sv-intcard-figs">
				<div><dt>Jogos</dt><dd>${U.fmtNum(s.games.length)}</dd></div>
				<div><dt>Conquistas</dt><dd>${ach}</dd></div>
				<div><dt>100%</dt><dd>${U.fmtNum(s.perfect || 0)}</dd></div>
			</dl>
			<div class="sv-intcard-bar" role="img" aria-label="${pct === null ? "Sem conquistas" : `${pct}% das conquistas`}"><span style="width:${pct || 0}%"></span></div>
			<details class="sv-intcard-more"><summary>${U.icon("info")}<span>O que sincroniza</span></summary>
				<ul class="sv-plat-list is-yes">${e.syncs.map(x => `<li>${U.icon("check")}<span>${U.esc(x)}</span></li>`).join("")}</ul>
				<ul class="sv-plat-list is-no">${e.notSynced.map(x => `<li>${U.icon("x")}<span>${U.esc(x)}</span></li>`).join("")}</ul>
			</details>
			<footer class="sv-intcard-foot">
				<div class="sv-intcard-actions">${actions}<a class="sv-btn sv-btn--ghost sv-btn--sm sv-btn--icon" ${U.openAttrs(e.page)} title="Abrir perfil ${U.attr(e.label)}" aria-label="Abrir perfil ${U.attr(e.label)}">${U.icon("chevronRight")}</a></div>
				${auto}
			</footer>
		</article>`;
	}

	async hub(ctx) {
		const { U, C, model } = ctx;
		const PL = this.PL;
		const list = this.entries(ctx);
		const autos = list.filter(e => e.kind === "auto"), manuals = list.filter(e => e.kind === "manual");
		const on = autos.filter(e => e.configured).length + manuals.filter(e => e.configured).length;
		const last = autos.filter(e => e.configured && e.lastSync).map(e => e.lastSync).sort().pop() || "";
		// origem das conquistas dos jogos: ordem fixa das plataformas
		const order = ["steam", "retroachievements", "xbox", "playstation", "nintendo", "gog", "epic", "googleplay", "native", "custom", "none", "unset"];
		const st = C.providerStats(model);
		const dist = order.map(k => [k, st[k]?.games.length || 0]).filter(([, n]) => n > 0);
		const linked = model.games.filter(g => ["steam", "retroachievements", "gog"].includes(g.provider) && C.autoSync?.(g)).length;
		const synced = ["steam", "retroachievements", "gog"].reduce((n, k) => n + (st[k]?.unlocked || 0), 0);
		const off = PL.unavailable();
		const html = `<div class="sv-page sv-pad sv-intpage">
			${U.pageHead("Integrações", { sub: "Suas contas de jogos conectadas à Game Library" })}
			<section class="sv-intsum">
				<dl class="sv-intsum-figs">
					<div><dt>Contas</dt><dd>${on}<small> de ${list.length}</small></dd></div>
					<div><dt>Fichas sincronizadas</dt><dd>${U.fmtNum(linked)}</dd></div>
					<div><dt>Conquistas trazidas</dt><dd>${U.fmtNum(synced)}</dd></div>
					<div><dt>Último sync</dt><dd>${last ? U.esc(U.relDate(last.slice(0, 10))) : "—"}</dd></div>
				</dl>
				${dist.length ? `<div class="sv-intsum-dist">
					<span class="sv-label">Origem das conquistas dos seus jogos</span>
					<div class="sv-stackbar sv-intsum-bar" role="img" aria-label="Jogos por origem">${dist.map(([k, n]) => `<span class="sv-achsrc--${k}" style="flex:${n}" title="${U.attr(C.providerDefs[k]?.label || k)}: ${n}"></span>`).join("")}</div>
					<ul class="sv-statusbar-legend sv-intsum-legend">${dist.map(([k, n]) => `<li class="sv-achsrc--${k}"><i></i>${U.esc(C.providerDefs[k]?.short || k)}<b>${n}</b></li>`).join("")}</ul>
				</div>` : ""}
				<p class="sv-intsum-safe">${U.icon("lock")}<span>Nenhuma senha. Chaves e autorizações ficam só neste dispositivo, nunca nas notas.</span></p>
			</section>
			<section class="sv-block">${U.sectionHead("Leitura automática", { count: autos.length, sub: "A Game Library busca perfil, jogos e conquistas sozinho" })}
				<div class="sv-intcards">${autos.map(e => this.card(ctx, e)).join("")}</div>
			</section>
			<section class="sv-block">${U.sectionHead("Perfis manuais", { count: manuals.length, sub: "Sem leitura automática legítima: você registra, a Game Library organiza e mostra o perfil" })}
				<div class="sv-intcards">${manuals.map(e => this.card(ctx, e)).join("")}</div>
			</section>
			${off.length ? `<section class="sv-block">${U.sectionHead("Sem integração disponível", { sub: "Jogos dessas plataformas funcionam normalmente; só não há sincronização" })}
				<div class="sv-intg-offlist sv-intg-offlist--grid">${off.map(u => `<details class="sv-intg-off sv-achsrc--${u.id}"><summary><span class="sv-intg-off-ico">${U.icon(U.providerIcon(u.id))}</span><span class="sv-intg-off-t"><b>${U.esc(u.label)}</b><small>Sem integração segura · toque para ver por quê</small></span></summary><p>${U.esc(u.reason)}</p></details>`).join("")}</div>
			</section>` : ""}
			<div class="sv-intpage-cols">
				${this.storesBlock(ctx)}
				${this.securityBlock(ctx)}
			</div>
		</div>`;
		return { active: "integrations", html, wire: root => this.wireHub(root, ctx) };
	}

	storesBlock(ctx) {
		const U = this.U;
		if (!globalThis.customJS?.SteamVaultStores) return "";
		return `<section class="sv-surface sv-settings-stores">
			<h3>Lojas de ofertas <span class="sv-muted">· fim da Home</span></h3>
			<p class="sv-muted">Steam e Nuuvem, lidas de páginas públicas das lojas. Uma loja indisponível fica fora da seção sem afetar a outra.</p>
			<div class="sv-stores-status" data-stores-status></div>
			<div class="sv-row-actions">${U.btn("Testar lojas agora", { icon: "refresh", kind: "ghost", size: "sm", attrs: "data-stores-test" })}</div>
		</section>`;
	}

	wireHub(root, ctx) {
		const U = this.U;
		this.wireToggles(root, "");
		root.querySelectorAll("[data-int-auto]").forEach(inp => inp.addEventListener("change", async () => {
			try {
				if (inp.dataset.intAuto === "ra") await ctx.R.saveConfig({ autoSync: inp.checked });
				else {
					const file = app.vault.getAbstractFileByPath(ctx.S.settingsPath);
					if (file) await app.fileManager.processFrontMatter(file, fm => { fm.steamProfile = { ...(fm.steamProfile || {}), autoSync: inp.checked }; });
				}
				this.V.toast(inp.checked ? "Sincronização ao abrir ligada" : "Sincronização ao abrir desligada", { tone: "ok", icon: "check" });
			} catch (err) { this.V.toast(err.message, { tone: "error" }); }
		}));
		// lojas de ofertas: estado por loja + teste sob demanda
		const box = root.querySelector("[data-stores-status]");
		const paint = () => {
			const S = globalThis.customJS?.SteamVaultStores;
			if (!box || !S) return;
			const steam = window.__svPicks?.lists ? { state: "ok", count: Object.values(window.__svPicks.lists).reduce((n, l) => n + l.length, 0) } : { state: "não consultada" };
			const rows = [{ id: "steam", label: "Steam", ...steam }, ...S.status()];
			box.innerHTML = rows.map(r => `<div class="sv-kv-row"><span class="sv-pick-store sv-pick-store--${U.attr(r.id)}">${U.esc(r.label)}</span><span class="${r.state === "erro" ? "sv-warn-text" : "sv-muted"}">${r.state === "ok" ? `${r.count} ofertas${r.cached ? " (cache)" : ""}` : r.state === "erro" ? "Indisponível agora — nova tentativa em alguns minutos" : "Ainda não consultada nesta sessão"}</span></div>`).join("");
		};
		paint();
		root.querySelector("[data-stores-test]")?.addEventListener("click", async e => {
			const S = globalThis.customJS?.SteamVaultStores, P = globalThis.customJS?.SteamVaultPicks;
			if (!S || !P) return;
			if (!P._online()) { this.V.toast("Sem conexão com a internet", { tone: "warn" }); return; }
			const b = e.currentTarget;
			b.disabled = true;
			const cache = await S._cache();
			for (const id of S.ids()) delete cache[id];
			window.__svPicks = null;
			await Promise.allSettled([P.list(), ...S.ids().map(id => S.list(id))]);
			paint();
			b.disabled = false;
		});
	}

	// Configurações: resumo compacto que leva ao hub
	settingsSummary(ctx) {
		const U = this.U;
		const list = this.entries(ctx);
		const on = list.filter(e => e.configured).length;
		return `<section class="sv-surface sv-settings-intg">
			<h3>Integrações</h3>
			<p class="sv-muted">${U.plural(on, "conta conectada", "contas conectadas")} de ${list.length}. Conectar, sincronizar, lojas de ofertas e segurança ficam na tela Integrações.</p>
			<div class="sv-intmini">${list.map(e => { const [tone, label] = this.state(e); return `<a class="sv-intmini-item sv-achsrc--${e.id} sv-plat--${e.id} is-${tone}" ${U.openAttrs(e.page)} title="${U.attr(`${e.label}: ${label}`)}"><span class="sv-intmini-ico">${U.icon(e.icon)}</span><span><b>${U.esc(e.label)}</b><small>${U.esc(label)}</small></span></a>`; }).join("")}</div>
			<div class="sv-row-actions"><a class="sv-btn sv-btn--primary sv-btn--sm" ${U.openAttrs("Dashboard/Integrações")}>${U.icon("link")}<span>Abrir Integrações</span></a></div>
		</section>`;
	}

	// ============================================ Configurações › Segurança
	securityBlock(ctx) {
		const U = this.U, PL = this.PL;
		const inv = PL.secretsInventory();
		return `<section class="sv-surface sv-settings-sec">
			<h3>Segurança e privacidade</h3>
			<ul class="sv-plat-list is-yes">
				<li>${U.icon("check")}<span>Nenhuma senha é pedida ou guardada. Steam, GOG, Xbox, Epic e PlayStation não usam credencial nenhuma.</span></li>
				<li>${U.icon("check")}<span>Chaves e autorizações ficam só neste dispositivo (armazenamento local do Obsidian), nunca nas notas, no cache ou nos registros.</span></li>
				<li>${U.icon("check")}<span>Cada integração só fala com os domínios oficiais dela; links vindos da internet são validados antes de abrir.</span></li>
				<li>${U.icon("check")}<span>Caches de perfil ficam em <code>.steamvault/</code>, fora do git (<code>.gitignore</code>).</span></li>
			</ul>
			<span class="sv-label">Guardado neste dispositivo</span>
			${inv.length ? `<ul class="sv-sec-inv">${inv.map(x => `<li>${U.icon("lock")}<span><b>${U.esc(x.label)}</b> · ${U.esc(x.what)}</span></li>`).join("")}</ul>` : `<p class="sv-muted">Nenhuma chave ou autorização guardada.</p>`}
			${inv.length ? `<div class="sv-row-actions">${U.btn("Apagar tudo deste dispositivo", { icon: "trash", kind: "ghost", size: "sm", action: "secrets-wipe" })}</div>` : ""}
			<p class="sv-fineprint">Para cortar o acesso também do lado das plataformas: RetroAchievements gerando uma nova Web API Key em retroachievements.org › Settings.</p>
		</section>`;
	}

	// ======================================== plataformas sem leitura automática
	// Perfil montado só com o que está no vault; nenhuma rede, nenhum segredo.
	async manualPage(ctx, id) {
		const { U, C, model } = ctx;
		const PL = this.PL, p = PL.get(id), cfg = PL.getConfig(id);
		const games = PL.gamesFor(id, model);
		const known = games.filter(g => g.ach.state === "known" && g.ach.total);
		const total = known.reduce((s, g) => s + g.ach.total, 0), unlocked = known.reduce((s, g) => s + g.ach.unlocked, 0);
		const pct = total ? Math.floor((unlocked / total) * 100) : null;
		const recent = games.flatMap(g => g.achievements.filter(a => a.unlocked && a.unlockedDate).map(a => ({ a, g })))
			.sort((x, y) => (y.a.unlockedDate + y.a.unlockedTime).localeCompare(x.a.unlockedDate + x.a.unlockedTime)).slice(0, 8);
		const isPs = id === "playstation";
		const grades = isPs && ctx.H ? [["platinum", "Platinas"], ["gold", "Ouro"], ["silver", "Prata"], ["bronze", "Bronze"]].map(([k, l]) => [l, games.reduce((s, g) => s + g.achievements.filter(a => a.unlocked && ctx.H.grade(a) === k).length, 0)]) : [];
		const isNin = id === "nintendo", isGp = id === "googleplay", isXb = id === "xbox";
		// 3.70.0: Gamerscore (soma dos G) conquistado e disponível nos jogos de Xbox do vault
		// 1.10.0: sem G nas notas, vale o Gamerscore colado do TrueAchievements/Exophase
		const gs = isXb ? games.reduce((o, g) => {
			const pts = g.achievements.filter(a => Number(a.points) > 0);
			if (!pts.length && g.xbox.gsTotal !== null) { o.total += g.xbox.gsTotal; o.earned += g.xbox.gsEarned ?? 0; return o; }
			for (const a of pts) { const v = Number(a.points); o.total += v; if (a.unlocked) o.earned += v; }
			return o;
		}, { earned: 0, total: 0 }) : null;
		const hours = games.reduce((s, g) => s + (g.playtime?.hours || 0), 0);
		const byConsole = [...C.groupBy(games, g => g.platform)].sort((a, b) => b[1].length - a[1].length);
		const xp = games.reduce((s, g) => s + g.achievements.filter(a => a.unlocked).reduce((t, a) => t + (a.points || 0), 0), 0);
		const figs = isNin
			// o Switch não tem conquistas: o perfil mostra tempo, zerados e consoles
			? [["Jogos no vault", U.fmtNum(games.length)], ["Horas", U.fmtHours(hours)], ["Zerados", U.fmtNum(games.filter(g => g.status === "Completed").length)], ["Consoles", U.fmtNum(byConsole.length)]]
			: [["Jogos no vault", U.fmtNum(games.length)], [isPs ? "Troféus" : "Conquistas", total ? `${U.fmtNum(unlocked)}/${U.fmtNum(total)}` : "—"], ["Progresso", pct === null ? "—" : `${pct}%`], ...(isPs ? grades.slice(0, 1) : isGp ? [["XP", xp ? U.fmtNum(xp) : "—"]] : isXb ? [["Gamerscore", gs.total ? `${U.fmtNum(gs.earned)}/${U.fmtNum(gs.total)} G` : "—"]] : [["100%", U.fmtNum(games.filter(g => g.ach.perfect).length)]]).map(([l, v]) => [l, typeof v === "number" ? U.fmtNum(v) : v])];
		const consoleStrip = isNin && byConsole.length ? `<section class="sv-block sv-plat-consoles">${U.sectionHead("Por console", { count: byConsole.length })}<div class="sv-chiplinks">${byConsole.map(([n, l]) => { const page = (model.platforms || []).find(x => C.normalizeKey(x.title) === C.normalizeKey(n)) || null; const pid = ctx.B?.ident ? ctx.B.ident(ctx, "platform", n, page) : { color: "#e60012", icon: "gamepad" }; return `<a class="sv-chiplink sv-chiplink--id" ${U.catAttrs("platform", n, page)} style="--sv-id:${U.attr(pid.color)}">${U.icon(pid.icon)}${U.esc(n)}<span>${l.length}</span></a>`; }).join("")}</div></section>` : "";
		const link = C.safeUrl(cfg.profileUrl, { hosts: p.linkHosts });
		const html = `<div class="sv-page sv-page--plat sv-plat--${id}">
			<section class="sv-plathero">
				<div class="sv-plathero-inner">
					<div class="sv-plathero-ava">${U.icon(U.providerIcon(id))}</div>
					<div class="sv-plathero-text">
						<span class="sv-plathero-kicker"><i aria-hidden="true"></i>${U.esc(p.label)} · manual</span>
						<h1>${U.esc(cfg.name || `Perfil ${p.label}`)}</h1>
						<p class="sv-meta"><span>${cfg.name ? "Nome informado por você (não verificado)" : "Sem leitura automática legítima: o perfil é montado com o que está no vault"}</span></p>
						${games.length ? `<dl class="sv-figures sv-plathero-figs">${figs.map(([l, v]) => `<div class="sv-figure"><dt>${U.esc(l)}</dt><dd>${v}</dd></div>`).join("")}</dl>` : `<p class="sv-plathero-hint">${U.icon("chart")}<span>Importe ou adicione jogos para ver seus números aqui.</span></p>`}
					</div>
					<div class="sv-plathero-actions">
						${U.btn("Importar jogos", { icon: "plus", kind: "primary", action: "plat-import-list", attrs: `data-platform="${id}"` })}
						${id === "xbox" ? U.btn("Colar do TrueAchievements/Exophase", { icon: "copy", kind: "ghost", action: "xbox-tracker-import" }) : ""}
						${U.btn(cfg.name ? "Editar perfil" : "Configurar perfil", { icon: "user", kind: "ghost", action: "plat-connect", attrs: `data-platform="${id}"` })}
						${link ? `<a class="sv-btn sv-btn--ghost" href="${U.attr(link)}">${U.icon("external")}<span>Abrir perfil</span></a>` : ""}
					</div>
				</div>
			</section>
			<div class="sv-pad sv-plat-body">
				${isPs && grades.some(([, n]) => n) ? `<section class="sv-plat-grades">${grades.map(([l, n], i) => `<div class="sv-ps--${["platinum", "gold", "silver", "bronze"][i]}"><span class="sv-ps-cup">${U.icon("trophy")}</span><b class="sv-num">${U.fmtNum(n)}</b><small>${U.esc(l)}</small></div>`).join("")}</section>` : ""}
				${consoleStrip}
				<div class="sv-split">
					<section class="sv-split-main">
						${games.length ? `${U.sectionHead("Seus jogos", { count: games.length, sub: isNin ? "Jogos de qualquer console Nintendo do vault" : "", action: U.btn(isPs ? "Registrar troféus" : isNin ? "Registrar objetivos" : "Registrar conquistas", { icon: "edit", kind: "ghost", size: "sm", action: "ach-manage-pick", attrs: `data-provider="${p.provider}"` }) })}<div class="sv-achgames">${games.sort((a, b) => (b.lastPlayed.date || "").localeCompare(a.lastPlayed.date || "") || a.title.localeCompare(b.title)).map(g => ctx.H ? ctx.H.gameRow(ctx, g) : "").join("")}</div>`
							: U.empty({ icon: "plus", title: `Nenhum jogo de ${p.label} ainda`, text: "Use o botão Importar jogos acima (um título por linha) ou adicione jogos com a origem " + p.label + "." })}
					</section>
					<aside class="sv-split-side">
						<section class="sv-surface sv-plat-why">
							<h3>${isNin ? "Por que não há sincronização" : "Por que não há sincronização automática"}</h3>
							<ul class="sv-plat-list is-no">${p.why.map(x => `<li>${U.icon("info")}<span>${U.esc(x)}</span></li>`).join("")}</ul>
							<span class="sv-label">O que a Game Library oferece</span>
							<ul class="sv-plat-list is-yes">${p.syncs.map(x => `<li>${U.icon("check")}<span>${U.esc(x)}</span></li>`).join("")}</ul>
							<p class="sv-fineprint">${U.icon("lock")} ${U.esc(p.privacy)}</p>
						</section>
						${recent.length ? `<div class="sv-sechead-gap"></div>${U.sectionHead(isPs ? "Troféus recentes" : "Conquistas recentes")}<div class="sv-achlist sv-achlist--compact">${recent.map(({ a, g }) => U.achievementTile(a, { showGame: g })).join("")}</div>` : ""}
					</aside>
				</div>
			</div>
		</div>`;
		return { active: `${id === "playstation" ? "psn" : id}-profile`, html };
	}

	// números de um perfil manual a partir dos jogos dele
	manualStats(games) {
		const known = games.filter(g => g.ach.state === "known" && g.ach.total);
		return { games, total: known.reduce((s, g) => s + g.ach.total, 0), unlocked: known.reduce((s, g) => s + g.ach.unlocked, 0), perfect: games.filter(g => g.ach.perfect).length };
	}

	openManualSetup(ctx, id) {
		const U = this.U, PL = this.PL, p = PL.get(id), cfg = PL.getConfig(id);
		const body = document.createElement("div");
		body.innerHTML = `<div class="sv-platconnect">
			<p class="sv-modal-text">${U.esc(p.label)} não oferece uma forma legítima de ler o seu perfil automaticamente. O nome abaixo é só para identificar o perfil na Game Library: não é verificado e nada é enviado para a ${U.esc(p.label)}.</p>
			<label class="sv-mgr-field"><span class="sv-label">${U.esc(p.idLabel)}</span><input class="sv-input" data-pf="name" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="32" placeholder="${U.attr(p.idPlaceholder)}" value="${U.attr(cfg.name)}"></label>
			<p class="sv-fineprint">${U.icon("lock")} ${U.esc(p.privacy)}</p>
			<p class="sv-formmsg" data-pmsg></p>
		</div>`;
		const m = this.V.modal({ title: `Perfil ${p.label}`, sub: "Manual", size: "sm", body,
			actions: `${U.btn("Cancelar", { kind: "ghost", attrs: "data-close" })}${U.btn("Salvar", { kind: "primary", icon: "check", attrs: "data-pgo" })}` });
		m.el.querySelector("[data-pgo]").addEventListener("click", async () => {
			const r = await PL.saveManualProfile(id, body.querySelector("[data-pf]").value);
			if (!r.ok) { const msg = body.querySelector("[data-pmsg]"); msg.textContent = id === "nintendo" ? "Use um apelido (3 a 32 caracteres) ou o código de amigo no formato SW-1234-5678-9012." : id === "playstation" ? "ID online inválido: 3 a 16 caracteres, começando com letra (letras, números, - e _)." : "Nome inválido: 3 a 32 caracteres (letras, números, espaço, ponto, - e _)."; msg.className = "sv-formmsg is-error"; return; }
			m.close();
			this.V.toast(`Perfil ${p.label} salvo`, { tone: "ok", icon: "check" });
			setTimeout(() => this.V.refresh(), 250);
		});
	}

	// importar lista colada: pré-visualização (novos × já no vault) antes de criar
	// 1.10.0: importar o perfil do TrueAchievements ou do Exophase por texto
	// colado (os dois bloqueiam leitura automática). Prévia antes de gravar.
	openTrackerImport(ctx) {
		const U = this.U, PL = this.PL;
		const body = document.createElement("div");
		body.innerHTML = `<div class="sv-platconnect sv-trackimp">
			<ol class="sv-trackimp-steps">
				<li>No navegador, abra o seu perfil no <b>TrueAchievements</b> (aba Games) ou no <b>Exophase</b> (lista de jogos do Xbox).</li>
				<li>Selecione a página inteira, copie e cole abaixo.</li>
				<li>Confira a prévia e toque em Importar. Repita quando quiser atualizar.</li>
			</ol>
			<div class="sv-segmented" role="radiogroup" aria-label="De onde vem o texto">${[["trueachievements", "TrueAchievements"], ["exophase", "Exophase"]].map(([v, l], i) => `<button type="button" role="radio" data-trk="${v}" class="${i ? "" : "is-active"}" aria-checked="${!i}">${l}</button>`).join("")}</div>
			<label class="sv-mgr-field"><span class="sv-label">Texto copiado</span><textarea class="sv-input sv-import-text" rows="7" data-trktext spellcheck="false" placeholder="Halo Infinite&#10;85 / 119&#10;1,040 / 1,600&#10;42h 15m"></textarea></label>
			<div class="sv-trackimp-prev" data-trkprev><p class="sv-muted">Nenhum jogo reconhecido ainda.</p></div>
		</div>`;
		const m = this.V.modal({ title: "Importar do TrueAchievements/Exophase", sub: "Sem login: só o texto que você copiou", size: "md", body,
			actions: `${U.btn("Cancelar", { kind: "ghost", attrs: "data-close" })}${U.btn("Importar", { kind: "primary", icon: "download", attrs: "data-trkgo disabled" })}` });
		const go = m.el.querySelector("[data-trkgo]"), prev = body.querySelector("[data-trkprev]");
		let source = "trueachievements", rows = [];
		body.querySelectorAll("[data-trk]").forEach(b => b.addEventListener("click", () => {
			source = b.dataset.trk;
			body.querySelectorAll("[data-trk]").forEach(x => { const on = x === b; x.classList.toggle("is-active", on); x.setAttribute("aria-checked", String(on)); });
		}));
		const fmt = r => [r.achTotal !== null ? `${U.fmtNum(r.achUnlocked)}/${U.fmtNum(r.achTotal)} conquistas` : "", r.gsTotal !== null ? `${U.fmtNum(r.gsEarned)}/${U.fmtNum(r.gsTotal)} G` : "", r.hours !== null ? U.fmtHours(r.hours) : "", r.lastPlayed ? U.fmtDate(r.lastPlayed) : ""].filter(Boolean).join(" · ");
		const update = () => {
			rows = PL.parseTrackerText(body.querySelector("[data-trktext]").value);
			go.disabled = !rows.length;
			if (!rows.length) { prev.innerHTML = `<p class="sv-muted">Nenhum jogo reconhecido ainda.</p>`; return; }
			const known = rows.filter(r => PL.xboxGameFor(r.title, ctx.model.games)).length;
			prev.innerHTML = `<p class="sv-trackimp-sum"><b>${U.plural(rows.length, "jogo reconhecido", "jogos reconhecidos")}</b> · ${U.plural(known, "já tem ficha", "já têm ficha")} · ${U.plural(rows.length - known, "novo", "novos")}</p>
				<ul class="sv-trackimp-list">${rows.slice(0, 60).map(r => `<li><b>${U.esc(r.title)}</b><small>${U.esc(fmt(r) || "—")}</small><span class="sv-trackimp-tag${PL.xboxGameFor(r.title, ctx.model.games) ? " is-in" : ""}">${PL.xboxGameFor(r.title, ctx.model.games) ? "Atualizar" : "Novo"}</span></li>`).join("")}</ul>
				${rows.length > 60 ? `<p class="sv-muted">E mais ${rows.length - 60}.</p>` : ""}`;
		};
		body.querySelector("[data-trktext]").addEventListener("input", update);
		go.addEventListener("click", async () => {
			if (!rows.length) return;
			go.disabled = true;
			const r = await PL.importTrackerRows(rows, source, ctx, (i, n) => { prev.innerHTML = `<p class="sv-muted">Gravando ${i}/${n}…</p>`; });
			m.close();
			this.V.toast(`Xbox: ${[U.plural(r.updated, "ficha atualizada", "fichas atualizadas"), U.plural(r.created, "ficha criada", "fichas criadas"), r.fail ? `${r.fail} com falha` : ""].filter(Boolean).join(", ")}`, { tone: r.fail ? "warn" : "ok", icon: "check" });
			setTimeout(() => this.V.refresh(), 300);
		});
	}

	openImportList(ctx, id) {
		const U = this.U, PL = this.PL, p = PL.get(id);
		const body = document.createElement("div");
		body.innerHTML = `<div class="sv-platconnect">
			<p class="sv-modal-text">Cole os títulos dos seus jogos de ${U.esc(p.label)}, um por linha (por exemplo, copiados da sua biblioteca). Cada um vira uma ficha com origem ${U.esc(p.label)} e sincronização Manual. Até 200 por vez; os que já estão no vault são ignorados.</p>
			<label class="sv-mgr-field"><span class="sv-label">Títulos</span><textarea class="sv-input sv-import-text" rows="8" data-list spellcheck="false" placeholder="Alan Wake 2&#10;Control&#10;Hades"></textarea></label>
			${p.platforms.length > 1 ? `<label class="sv-mgr-field"><span class="sv-label">Plataforma</span><select class="sv-input" data-plat>${p.platforms.map(x => `<option>${U.esc(x)}</option>`).join("")}</select></label>` : ""}
			<p class="sv-import-preview" data-prev>Nenhum título ainda.</p>
		</div>`;
		const m = this.V.modal({ title: `Importar jogos · ${p.label}`, size: "sm", body,
			actions: `${U.btn("Cancelar", { kind: "ghost", attrs: "data-close" })}${U.btn("Importar", { kind: "primary", icon: "plus", attrs: "data-pgo" })}` });
		const go = m.el.querySelector("[data-pgo]"), prev = body.querySelector("[data-prev]");
		let parsed = { fresh: [], dup: [] };
		const update = () => {
			parsed = PL.parseTitles(body.querySelector("[data-list]").value, ctx);
			prev.textContent = parsed.fresh.length || parsed.dup.length ? `${U.plural(parsed.fresh.length, "jogo novo", "jogos novos")}${parsed.dup.length ? ` · ${U.plural(parsed.dup.length, "já está", "já estão")} no vault` : ""}` : "Nenhum título ainda.";
			go.disabled = !parsed.fresh.length;
		};
		body.querySelector("[data-list]").addEventListener("input", update);
		update();
		go.addEventListener("click", async () => {
			if (!parsed.fresh.length) return;
			go.disabled = true;
			const platform = body.querySelector("[data-plat]")?.value || p.platformName;
			const r = await PL.importTitles(id, parsed.fresh, platform, (i, n) => { prev.textContent = `Criando ${i}/${n}…`; });
			m.close();
			this.V.toast(`${p.label}: ${U.plural(r.done, "jogo adicionado", "jogos adicionados")}${r.fail ? `, ${r.fail} com falha` : ""}`, { tone: r.fail ? "warn" : "ok", icon: "plus" });
			setTimeout(() => this.V.refresh(), 300);
		});
	}
}
