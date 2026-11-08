// ==========================================================================
// Game Library — Perfil do jogador
//
// A sua página: nome, avatar, bio, vitrine de favoritos, DNA gamer,
// momentos marcantes e contas conectadas. O que é número vem do modelo
// (SteamVaultCore); o que é pessoal (nome, bio, avatar, banner,
// favoritos) fica no frontmatter de
// Dashboard/Perfil.md — acompanha o vault em todos os aparelhos.
//
// Acesso: customJS.SteamVaultProfile
// ==========================================================================

class SteamVaultProfile {

	constructor() {
		this.notePath = "Dashboard/Perfil.md";
		this.maxFav = 4;
	}

	get U() { return customJS.SteamVaultUI; }
	get C() { return customJS.SteamVaultCore; }
	get V() { return customJS.SteamVault; }
	get X() { return customJS.SteamVaultPlay; }

	// ============================================================ dados
	// lidos de uma nota: tudo validado e com tamanho máximo
	data() {
		const C = this.C;
		const f = app.vault.getAbstractFileByPath(this.notePath);
		const fm = (f && app.metadataCache.getFileCache(f)?.frontmatter) || {};
		const p = fm.profile && typeof fm.profile === "object" ? fm.profile : {};
		const path = v => { const s = C.str(v); return s && s.length <= 300 && /\.md$/i.test(s) && !/^[a-z]+:/i.test(s) ? s : ""; };
		return {
			name: C.clip(p.name, 40), bio: C.clip(p.bio, 160),
			avatar: p.avatar === "steam" || p.avatar === "initials" ? p.avatar : path(p.avatar),
			banner: path(p.banner),
			favorites: C.arr(p.favorites).map(path).filter(Boolean).slice(0, this.maxFav)
		};
	}

	// nome mostrado: o do perfil, senão o da Steam, senão "Jogador"
	displayName(ctx) {
		const d = this.data();
		const s = ctx?.S?.getConfig?.() || customJS.SteamVaultSteam?.getConfig?.() || {};
		return d.name || s.name || "Jogador";
	}

	avatarSrc(ctx, model) {
		const d = this.data();
		const s = ctx?.S?.getConfig?.() || {};
		if (d.avatar === "initials") return "";
		if (d.avatar && d.avatar !== "steam") { const g = model.gamesByPath.get(d.avatar); if (g?.images.cover) return g.images.cover; }
		return d.avatar === "steam" || !d.avatar ? (s.avatar || "") : "";
	}

	initials(name) {
		const w = String(name || "J").trim().split(/\s+/).filter(Boolean);
		return ((w[0]?.[0] || "J") + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase();
	}

	favorites(model) {
		const d = this.data();
		const chosen = d.favorites.map(p => model.gamesByPath.get(p)).filter(Boolean);
		if (chosen.length) return { list: chosen, auto: false };
		const auto = [...model.games].filter(g => g.status !== "Wishlist")
			.sort((a, b) => (b.favorite - a.favorite) || (b.rating - a.rating) || (b.playtime.hours - a.playtime.hours)).slice(0, this.maxFav);
		return { list: auto, auto: true };
	}

	// momentos marcantes, todos com data ou número vindo das notas
	moments(model) {
		const C = this.C, U = this.U, g = model.games.filter(x => x.status !== "Wishlist");
		const out = [];
		const first = (arr, key) => arr.filter(x => key(x)).sort((a, b) => key(a).localeCompare(key(b)))[0];
		const added = first(g, x => x.dateAdded);
		if (added) out.push({ icon: "plus", tone: "cyan", date: added.dateAdded, title: "Primeiro jogo na biblioteca", sub: added.title, path: added.path });
		const done = first(g, x => x.completionDate);
		if (done) out.push({ icon: "flag", tone: "green", date: done.completionDate, title: "Primeiro jogo zerado", sub: done.title, path: done.path });
		const perfect = [...(this.X ? this.X._days(model).values() : [])].flat().filter(e => e.type === "perfect").sort((a, b) => a.date.localeCompare(b.date))[0];
		if (perfect) out.push({ icon: "gem", tone: "gold", date: perfect.date, title: "Primeiro 100%", sub: perfect.game.title, path: perfect.game.path });
		const rare = g.flatMap(x => x.achievements.filter(a => a.unlocked && a.rarity !== null && a.rarity !== undefined).map(a => ({ a, x }))).sort((p, q) => p.a.rarity - q.a.rarity)[0];
		if (rare) out.push({ icon: "medal", tone: "violet", date: rare.a.unlockedDate || "", title: "Conquista mais rara", sub: `${rare.a.name} · ${U.fmtPct(rare.a.rarity)} dos jogadores · ${rare.x.title}`, path: rare.a.path || rare.x.path, img: rare.a.iconSrc });
		const most = [...g].sort((a, b) => b.playtime.hours - a.playtime.hours)[0];
		if (most && most.playtime.hours > 0) out.push({ icon: "clock", tone: "pink", date: "", title: "Mais jogado", sub: `${most.title} · ${U.fmtHours(most.playtime.hours)}`, path: most.path });
		const years = C.groupBy(g.filter(x => x.completionDate), x => x.completionDate.slice(0, 4));
		const best = [...years.entries()].sort((a, b) => b[1].length - a[1].length)[0];
		if (best && best[1].length > 1) out.push({ icon: "crown", tone: "amber", date: "", title: `Melhor ano: ${best[0]}`, sub: `${U.plural(best[1].length, "jogo zerado", "jogos zerados")}` });
		return out.sort((a, b) => (a.date ? 0 : 1) - (b.date ? 0 : 1) || a.date.localeCompare(b.date));
	}

	dna(model) {
		const C = this.C, g = model.games.filter(x => x.status !== "Wishlist");
		const count = key => { const m = new Map(); for (const x of g) for (const k of [].concat(key(x)).filter(Boolean)) m.set(k, (m.get(k) || 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
		const genres = count(x => x.genres), platforms = count(x => x.platform), fr = count(x => x.franchise);
		const rated = g.filter(x => x.rating > 0);
		const done = g.filter(x => x.status === "Completed" || x.completionDate).length;
		return {
			genres: genres.slice(0, 5), total: g.length, platforms: platforms.slice(0, 4), franchise: fr[0] && fr[0][1] > 1 ? fr[0] : null,
			avg: rated.length ? rated.reduce((t, x) => t + x.rating, 0) / rated.length : 0,
			completion: g.length ? Math.round((done / g.length) * 100) : 0, done, hue: n => C.hashHue(n)
		};
	}

	// ============================================================ tela
	page(ctx) {
		const { U, model } = ctx;
		const d = this.data();
		const name = this.displayName(ctx);
		const empty = !model.games.length;
		const sections = empty ? `<div class="sv-pf-empty">${U.empty({ icon: "user", title: "O seu perfil ganha vida com os seus jogos", text: "Adicione jogos ou conecte a Steam: estatísticas, vitrine, DNA gamer e momentos marcantes aparecem aqui.", action: U.btn("Editar perfil", { icon: "edit", kind: "primary", attrs: 'data-pf="edit"' }) })}</div>`
			: `${this.statsStrip(ctx)}
			<div class="sv-pf-grid">
				<div class="sv-pf-col">${this.showcase(ctx)}${this.accounts(ctx)}</div>
				<div class="sv-pf-col">${this.dnaCard(ctx)}${this.momentsCard(ctx)}</div>
			</div>`;
		const html = `<div class="sv-page sv-pf">${this.hero(ctx, d, name)}<div class="sv-pad sv-pf-body">${sections}</div></div>`;
		return { active: "player", html, wire: root => this.wire(root, ctx) };
	}

	hero(ctx, d, name) {
		const { U, model, C } = ctx;
		const bannerGame = (d.banner && model.gamesByPath.get(d.banner)) || (C.featuredGame ? C.featuredGame(model, { auto: true }) : null);
		const bg = bannerGame ? (bannerGame.images.background || bannerGame.images.featured || bannerGame.images.cover) : "";
		const src = this.avatarSrc(ctx, model);
		const since = model.games.map(g => g.dateAdded).filter(Boolean).sort()[0];
		return `<section class="sv-pf-hero">
			<div class="sv-pf-banner">${bg ? `<img src="${U.attr(bg)}" alt="" decoding="async">` : ""}<span class="sv-pf-banner-fx"></span></div>
			<div class="sv-pf-id">
				<div class="sv-pf-avatar" style="--sv-pf-h:${C.hashHue(name)}">
					<span class="sv-pf-pic">${src ? `<img src="${U.attr(src)}" alt="" decoding="async">` : `<b>${U.esc(this.initials(name))}</b>`}</span>
				</div>
				<div class="sv-pf-who">
					<h1>${U.esc(name)}</h1>
					${d.bio ? `<p class="sv-pf-bio">${U.esc(d.bio)}</p>` : ""}
					<span class="sv-pf-meta">${since ? `<span>Na Game Library desde ${U.esc(this._month(since))}</span>` : ""}</span>
				</div>
				<div class="sv-pf-actions">
					${U.btn("Editar perfil", { icon: "edit", kind: "secondary", size: "sm", attrs: 'data-pf="edit"' })}
					${U.btn("Compartilhar", { icon: "share", kind: "ghost", size: "sm", action: "share-card", attrs: 'data-kind="profile"' })}
				</div>
			</div>
		</section>`;
	}

	_month(iso) {
		const m = this.U.months[Number(iso.slice(5, 7)) - 1] || "";
		return `${m}/${iso.slice(0, 4)}`;
	}

	statsStrip(ctx) {
		const { U, model } = ctx, s = model.stats;
		const unlocked = model.games.reduce((t, g) => t + g.achievements.filter(a => a.unlocked).length, 0);
		const owned = model.games.filter(g => g.status !== "Wishlist").length;
		const cells = [["grid", "Jogos", owned, "cyan"], ["flag", "Zerados", s.completed, "green"], ["gem", "Com 100%", s.perfect, "gold"], ["trophy", "Conquistas", unlocked, "amber"], ["clock", "Horas", Math.round(s.hours), "violet"]];
		return `<div class="sv-pf-stats">${cells.map(([i, l, v, t]) => `<div class="sv-pf-stat sv-pf-tone--${t}"><span class="sv-pf-stat-ico">${U.icon(i)}</span><b class="sv-num" data-pf-count="${v}">${U.fmtNum(v)}</b><small>${U.esc(l)}</small></div>`).join("")}</div>`;
	}

	_card(title, icon, body, { action = "", cls = "" } = {}) {
		const U = this.U;
		return `<section class="sv-pf-card${cls ? ` ${cls}` : ""}"><header class="sv-pf-ch"><span class="sv-pf-ch-ico">${U.icon(icon)}</span><h2>${U.esc(title)}</h2>${action}</header>${body}</section>`;
	}

	showcase(ctx) {
		const U = this.U, { list, auto } = this.favorites(ctx.model);
		const slots = Array.from({ length: this.maxFav }, (_, i) => list[i]);
		return this._card("Vitrine", "sparkles", `<div class="sv-pf-shelf">${slots.map((g, i) => g
			? `<a class="sv-pf-fav" ${U.openAttrs(g.path)} style="--i:${i}">${U.cover(g)}<span class="sv-pf-fav-name">${U.esc(g.title)}</span></a>`
			: `<button type="button" class="sv-pf-fav is-empty" data-pf="edit" style="--i:${i}" aria-label="Escolher favorito">${U.icon("plus")}</button>`).join("")}</div>
			${auto ? `<p class="sv-pf-hint">Escolhidos automaticamente pelos favoritos, notas e horas. Use Editar para montar a sua vitrine.</p>` : ""}`,
			{ action: `<button type="button" class="sv-pf-link" data-pf="edit">${U.icon("edit")}<span>Editar</span></button>` });
	}

	dnaCard(ctx) {
		const U = this.U, d = this.dna(ctx.model);
		const max = d.genres[0]?.[1] || 1;
		const R = 30, L = 2 * Math.PI * R;
		return this._card("DNA gamer", "heartbeat", `<div class="sv-pf-dna">
			<div class="sv-pf-dna-top">
				<div class="sv-pf-donut"><svg viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="${R}" class="sv-pf-donut-bg"/><circle cx="36" cy="36" r="${R}" class="sv-pf-donut-fill" stroke-dasharray="${L.toFixed(1)}" style="--sv-pf-off:${(L * (1 - d.completion / 100)).toFixed(1)};--sv-pf-len:${L.toFixed(1)}"/></svg><span><b class="sv-num">${d.completion}%</b><small>zerados</small></span></div>
				<ul class="sv-pf-facts">
					${d.platforms[0] ? `<li>${U.icon("monitor")}<span><small>Plataforma principal</small><b>${U.esc(d.platforms[0][0])}</b></span></li>` : ""}
					${d.franchise ? `<li>${U.icon("layers")}<span><small>Franquia favorita</small><b>${U.esc(d.franchise[0])}</b></span></li>` : ""}
					${d.avg ? `<li>${U.icon("star")}<span><small>Nota média</small><b>${U.fmtNum(d.avg, 1)}</b></span></li>` : ""}
				</ul>
			</div>
			${d.genres.length ? `<ul class="sv-pf-genres">${d.genres.map(([n, c], i) => `<li style="--sv-pf-h:${d.hue(n)};--i:${i}"><span class="sv-pf-g-name">${U.esc(n)}</span><span class="sv-pf-g-bar"><span style="width:${Math.round((c / max) * 100)}%"></span></span><em class="sv-num">${c}</em></li>`).join("")}</ul>` : ""}
		</div>`);
	}

	momentsCard(ctx) {
		const U = this.U, list = this.moments(ctx.model);
		if (!list.length) return "";
		return this._card("Momentos marcantes", "flag", `<ol class="sv-pf-moments">${list.map((m, i) => {
			const inner = `<span class="sv-pf-m-dot sv-pf-tone--${m.tone}">${m.img ? `<img src="${U.attr(m.img)}" alt="" loading="lazy">` : U.icon(m.icon)}</span><span class="sv-pf-m-text"><b>${U.esc(m.title)}</b><small>${U.esc(m.sub)}</small></span>${m.date ? `<time>${U.esc(U.fmtDate ? U.fmtDate(m.date) : m.date)}</time>` : ""}`;
			return `<li style="--i:${i}">${m.path ? `<a ${U.openAttrs(m.path)}>${inner}</a>` : `<div>${inner}</div>`}</li>`;
		}).join("")}</ol>`);
	}

	accounts(ctx) {
		const { U, S, R } = ctx;
		const PL = customJS.SteamVaultPlatforms;
		const rows = [];
		const s = S?.getConfig?.() || {};
		rows.push({ icon: "b-steam", label: "Steam", on: !!s.configured, who: s.name || s.customUrl || "", path: "Dashboard/Steam" });
		const ra = R?.getConfig?.();
		if (ra) rows.push({ icon: "b-retro", label: "RetroAchievements", on: !!ra.configured, who: ra.user || "", path: "Dashboard/RetroAchievements" });
		if (PL?.platforms) for (const [id, p] of Object.entries(PL.platforms())) {
			const c = PL.getConfig(id);
			if (c?.configured) rows.push({ icon: `b-${({ psn: "playstation", googleplay: "googleplay" })[id] || id}`, label: p.label, on: true, who: c.name || "", path: p.page });
		}
		const on = rows.filter(r => r.on).length;
		return this._card("Contas conectadas", "link", `<ul class="sv-pf-accounts">${rows.map(r => `<li><a ${U.openAttrs(r.path)}><span class="sv-pf-acc-ico">${U.icon(U.paths[r.icon] ? r.icon : "link")}</span><span class="sv-pf-acc-text"><b>${U.esc(r.label)}</b><small>${r.on ? U.esc(r.who || "Conectada") : "Não conectada"}</small></span><span class="sv-pf-acc-state${r.on ? " is-on" : ""}">${r.on ? "Ativa" : "Conectar"}</span></a></li>`).join("")}</ul>`,
			{ action: `<a class="sv-pf-link" ${U.openAttrs("Dashboard/Integrações")}>${on} ${on === 1 ? "ativa" : "ativas"}${U.icon("chevronRight")}</a>` });
	}

	// ============================================================ ações
	wire(root, ctx) {
		const host = root.querySelector(".sv-pf");
		if (!host) return;
		host.addEventListener("click", e => {
			const b = e.target.closest("[data-pf]");
			if (b) { e.preventDefault(); if (b.dataset.pf === "edit") this.openEditor(ctx); }
		});
		this.animate(host);
	}

	// números contam do zero, gráfico e barras se desenham (uma vez por visita)
	animate(host) {
		if (!this.V._motionOn?.() || host.closest(".is-refresh")) return;
		host.classList.add("sv-pf-anim");
		requestAnimationFrame(() => requestAnimationFrame(() => host.classList.add("is-in")));
		host.querySelectorAll("[data-pf-count]").forEach(el => this.countUp(el, Number(el.dataset.pfCount)));
	}

	countUp(el, to, dur = 900) {
		if (!(to > 1) || !el.firstChild) return;
		const node = el.firstChild, final = node.nodeValue, t0 = performance.now(), U = this.U;
		const step = t => {
			if (!node.isConnected) return;
			const p = Math.min(1, (t - t0) / dur);
			node.nodeValue = p >= 1 ? final : U.fmtNum(Math.round(to * (1 - Math.pow(1 - p, 3))));
			if (p < 1) requestAnimationFrame(step);
		};
		node.nodeValue = "0";
		requestAnimationFrame(step);
	}

	openEditor(ctx) {
		const { U, model } = ctx;
		const d = this.data();
		const s = ctx.S?.getConfig?.() || {};
		const games = [...model.games].filter(g => g.status !== "Wishlist").sort((a, b) => a.title.localeCompare(b.title));
		const favs = new Set(this.favorites(model).auto ? [] : d.favorites);
		const body = document.createElement("div");
		body.className = "sv-pf-edit";
		const opt = (v, l, sel) => `<option value="${U.attr(v)}"${sel ? " selected" : ""}>${U.esc(l)}</option>`;
		body.innerHTML = `
			<label class="sv-label" for="sv-pf-name">Nome</label>
			<input id="sv-pf-name" class="sv-input" type="text" maxlength="40" value="${U.attr(d.name)}" placeholder="${U.attr(s.name || "Jogador")}">
			<label class="sv-label" for="sv-pf-bio">Bio</label>
			<textarea id="sv-pf-bio" class="sv-input" rows="2" maxlength="160" placeholder="Uma frase sobre você como jogador">${U.esc(d.bio)}</textarea>
			<div class="sv-pf-edit-row">
				<div><label class="sv-label" for="sv-pf-avatar">Avatar</label>
				<label class="sv-select"><select id="sv-pf-avatar">${s.avatar ? opt("steam", "Foto da Steam", d.avatar === "steam" || !d.avatar) : ""}${opt("initials", "Iniciais", d.avatar === "initials" || (!d.avatar && !s.avatar))}${games.filter(g => g.images.cover).map(g => opt(g.path, `Capa: ${g.title}`, d.avatar === g.path)).join("")}</select></label></div>
				<div><label class="sv-label" for="sv-pf-banner">Fundo</label>
				<label class="sv-select"><select id="sv-pf-banner">${opt("", "Automático (jogo em destaque)", !d.banner)}${games.filter(g => g.images.background || g.images.featured).map(g => opt(g.path, g.title, d.banner === g.path)).join("")}</select></label></div>
			</div>
			<div class="sv-pf-favhead"><span class="sv-label">Vitrine</span><small data-pf-favcount></small></div>
			<input class="sv-input sv-pf-favsearch" type="search" placeholder="Buscar jogo" aria-label="Buscar jogo">
			<div class="sv-pf-favpick">${games.map(g => `<label class="sv-pf-favopt" data-name="${U.attr(g.title.toLowerCase())}"><input type="checkbox" value="${U.attr(g.path)}"${favs.has(g.path) ? " checked" : ""}>${U.cover(g, { cls: "sv-cover--xs" })}<span>${U.esc(g.title)}</span></label>`).join("")}</div>`;
		const m = this.V.modal({ title: "Editar perfil", size: "md", body, cls: "sv-pf-modal", actions: `${U.btn("Cancelar", { kind: "ghost", attrs: "data-close" })}${U.btn("Salvar", { kind: "primary", icon: "check", attrs: "data-pf-save" })}` });
		const boxes = [...body.querySelectorAll(".sv-pf-favpick input")];
		const count = () => {
			const n = boxes.filter(b => b.checked).length;
			body.querySelector("[data-pf-favcount]").textContent = `${n} de ${this.maxFav}`;
			boxes.forEach(b => { b.disabled = !b.checked && n >= this.maxFav; b.closest("label").classList.toggle("is-on", b.checked); });
		};
		boxes.forEach(b => b.addEventListener("change", count));
		count();
		body.querySelector(".sv-pf-favsearch").addEventListener("input", e => {
			const q = e.target.value.trim().toLowerCase();
			body.querySelectorAll(".sv-pf-favopt").forEach(l => { l.hidden = !!q && !l.dataset.name.includes(q); });
		});
		m.el.querySelector("[data-pf-save]").addEventListener("click", async () => {
			const C = this.C;
			const profile = {
				name: C.clip(body.querySelector("#sv-pf-name").value, 40), bio: C.clip(body.querySelector("#sv-pf-bio").value, 160),
				avatar: body.querySelector("#sv-pf-avatar").value,
				banner: body.querySelector("#sv-pf-banner").value, favorites: boxes.filter(b => b.checked).map(b => b.value).slice(0, this.maxFav)
			};
			m.close();
			try {
				let f = app.vault.getAbstractFileByPath(this.notePath);
				if (!f) {
					if (!app.vault.getAbstractFileByPath("Dashboard")) await app.vault.createFolder("Dashboard").catch(() => {});
					f = await app.vault.create(this.notePath, ["---", "cssclasses:", '  - "steamvault"', '  - "sv-player"', "---", "", C.noteBody("player")].join("\n"));
				}
				await app.fileManager.processFrontMatter(f, fm => { fm.profile = { ...(fm.profile && typeof fm.profile === "object" ? fm.profile : {}), ...profile }; });
				C.invalidate();
				this.V.toast("Perfil salvo", { icon: "user", tone: "ok" });
				setTimeout(() => this.V.refresh(), 200);
			} catch (err) { this.V.toast(`Não foi possível salvar: ${err.message}`, { tone: "error" }); }
		});
	}
}
