// ==========================================================================
// Game Library — RetroAchievements (seção complementar)
//
// Sincroniza SEU perfil do RetroAchievements pela Web API OFICIAL
// (https://api-docs.retroachievements.org). Credenciais: seu nome de
// usuário + sua Web API Key (em retroachievements.org → Settings → Keys).
//
//   · a chave fica só neste dispositivo (armazenamento local do Obsidian),
//     nunca em notas, logs ou no vault; é a mesma chave que a Game Library
//     já usava (a da versão iiSU é migrada automaticamente)
//   · só domínios oficiais: retroachievements.org / media.retroachievements.org
//   · uma requisição por vez, com intervalo; pausa automática se o RA
//     limitar o acesso; falhas nunca apagam dados já sincronizados
//
// O que o sync traz:
//   perfil (avatar, lema, membro desde, rich presence), pontos hardcore /
//   softcore / TrueRatio, posição no ranking, jogos com progresso (todos),
//   prêmios (masterização, zerado hardcore/softcore), conquistas recentes
//   e, para cada jogo do vault ligado ao RA: todas as conquistas com
//   desbloqueio, data, hardcore, pontos, raridade e tipo (progressão /
//   condição de vitória / perdível), além de console, desenvolvedora,
//   publicadora, gênero, lançamento e capa quando a ficha não tem.
//
// Acesso: customJS.SteamVaultRetro
// ==========================================================================

class SteamVaultRetro {

	constructor() {
		this.API = "https://retroachievements.org/API/";
		this.MEDIA = "https://media.retroachievements.org";
		this.SITE = "https://retroachievements.org";
		this.HOSTS = ["retroachievements.org", "www.retroachievements.org", "media.retroachievements.org"];
		this.PAGE = "Dashboard/RetroAchievements.md";
		this.CACHE = ".steamvault/ra.json";
		this.KEY = "steamvault-retroachievements-webapikey";
		this.KEY_OLD = "iisu-retroachievements-webapikey";
		this.GAP_MS = 450;
		this.STALE_HOURS = 12;
		this.COOLDOWN_MIN = 10;
		this.ENDPOINTS = {
			profile: "API_GetUserProfile.php",
			summary: "API_GetUserSummary.php",
			completion: "API_GetUserCompletionProgress.php",
			game: "API_GetGameInfoAndUserProgress.php",
			awards: "API_GetUserAwards.php",
			between: "API_GetAchievementsEarnedBetween.php"
		};
		// console do RA → nome de plataforma usado no vault
		this.CONSOLES = {
			"snes/super famicom": "SNES", "snes": "SNES", "super nintendo entertainment system": "SNES",
			"nes/famicom": "NES", "nes": "NES", "game boy": "Game Boy", "game boy color": "Game Boy Color",
			"game boy advance": "GBA", "nintendo ds": "NDS", "nintendo dsi": "NDS", "nintendo 64": "N64",
			"gamecube": "GameCube", "wii": "Wii", "virtual boy": "Virtual Boy", "pokemon mini": "Pokémon Mini",
			"playstation": "PS1", "playstation 2": "PS2", "playstation portable": "PSP",
			"genesis/mega drive": "Mega Drive", "mega drive": "Mega Drive", "master system": "Master System",
			"game gear": "Game Gear", "sega cd": "Sega CD", "32x": "32X", "saturn": "Saturn", "dreamcast": "Dreamcast",
			"pc engine/turbografx-16": "PC Engine", "pc engine cd/turbografx-cd": "PC Engine CD",
			"atari 2600": "Atari 2600", "atari 7800": "Atari 7800", "atari lynx": "Atari Lynx", "atari jaguar": "Atari Jaguar",
			"neo geo pocket": "Neo Geo Pocket", "wonderswan": "WonderSwan", "msx": "MSX", "arcade": "Arcade", "3do interactive multiplayer": "3DO"
		};
		this.AWARD_LABEL = {
			"mastered": "Masterizado", "completed": "Completo (softcore)",
			"beaten-hardcore": "Zerado (hardcore)", "beaten-softcore": "Zerado (softcore)"
		};
		this._queue = Promise.resolve();
		this._last = 0;
	}

	get C() { return customJS.SteamVaultCore; }

	// ============================================================ credencial
	_ls(get, key, val) {
		try {
			if (typeof app?.loadLocalStorage !== "function") return get ? "" : false;
			if (get) return String(app.loadLocalStorage(key) || "").trim();
			app.saveLocalStorage(key, val);
			return true;
		} catch (_) { return get ? "" : false; }
	}

	_apiKey() {
		const cur = this._ls(true, this.KEY);
		if (cur) return cur;
		const old = this._ls(true, this.KEY_OLD);
		if (old) { this._ls(false, this.KEY, old); this._ls(false, this.KEY_OLD, null); }
		return old;
	}

	hasKey() { return !!this._apiKey(); }

	maskedKey() {
		const k = this._apiKey();
		return k ? `${"•".repeat(Math.max(0, Math.min(12, k.length - 4)))}${k.slice(-4)}` : "";
	}

	setKey(raw) {
		const v = String(raw ?? "").trim();
		if (!/^[A-Za-z0-9]{8,64}$/.test(v)) throw new Error("Isso não parece uma Web API Key (só letras e números, sem espaços).");
		if (!this._ls(false, this.KEY, v)) throw new Error("Este Obsidian não permite guardar a chave neste dispositivo.");
	}

	removeKey() { this._ls(false, this.KEY, null); this._ls(false, this.KEY_OLD, null); }

	// ============================================================ config
	_pageFile() { return app.vault.getAbstractFileByPath(this.PAGE); }

	getConfig() {
		const f = this._pageFile();
		const fm = f ? app.metadataCache.getFileCache(f)?.frontmatter : null;
		const p = (fm?.raProfile && typeof fm.raProfile === "object") ? fm.raProfile : {};
		// raUsername/raAvatar: campos da versão anterior (iiSU), lidos como reserva
		const user = String(p.user || fm?.raUsername || "").trim();
		const hasKey = this.hasKey();
		return {
			user, ulid: String(p.ulid || ""), avatar: String(p.avatar || fm?.raAvatar || ""),
			profileUrl: user ? `${this.SITE}/user/${encodeURIComponent(user)}` : "",
			lastSync: String(p.lastSync || ""), syncStatus: String(p.syncStatus || ""), syncError: String(p.syncError || ""),
			autoSync: p.autoSync === true, hasKey, maskedKey: this.maskedKey(),
			configured: !!user && hasKey
		};
	}

	async saveConfig(patch) {
		let f = this._pageFile();
		if (!f) {
			f = await app.vault.create(this.PAGE, ["---", "cssclasses:", '  - "steamvault"', '  - "sv-retro"', "raProfile: {}", "---", "", this.C.noteBody("retro")].join("\n"));
		}
		await app.fileManager.processFrontMatter(f, fm => {
			const cur = (fm.raProfile && typeof fm.raProfile === "object") ? fm.raProfile : {};
			fm.raProfile = { ...cur, ...patch };
		});
		this.C.invalidate();
	}

	// ============================================================ rede
	_assertHost(url) {
		const host = new URL(url).hostname.toLowerCase();
		if (!this.HOSTS.includes(host)) throw new Error("Destino fora do domínio oficial do RetroAchievements.");
	}

	image(rel) {
		const v = String(rel ?? "").trim();
		if (!v) return "";
		if (/^https:\/\/(media\.)?retroachievements\.org\//i.test(v)) return v;
		return v.startsWith("/") ? `${this.MEDIA}${v}` : "";
	}

	badge(name) {
		const v = String(name ?? "").trim();
		return /^[A-Za-z0-9_-]+$/.test(v) ? `${this.MEDIA}/Badge/${v}.png` : "";
	}

	_cooldownUntil() { return Number(this._ls(true, "steamvault:ra:cooldownUntil")) || 0; }

	async _request(fn) {
		const run = async () => {
			const wait = Math.max(0, this._last + this.GAP_MS - Date.now());
			if (wait) await new Promise(r => setTimeout(r, wait));
			try { return await fn(); } finally { this._last = Date.now(); }
		};
		const p = this._queue.then(run, run);
		this._queue = p.catch(() => {});
		return p;
	}

	// Toda chamada passa por aqui. A chave só é anexada no momento da
	// requisição e a URL completa nunca vai para console/erros.
	async _get(endpointKey, params = {}) {
		const file = this.ENDPOINTS[endpointKey];
		if (!file) return { ok: false, code: "internal" };
		const key = this._apiKey();
		if (!key) return { ok: false, code: "no_key" };
		if (Date.now() < this._cooldownUntil()) return { ok: false, code: "rate_limited" };
		const url = new URL(this.API + file);
		for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
		url.searchParams.set("y", key);
		this._assertHost(url.href);
		const request = (typeof requestUrl === "function" && requestUrl) || globalThis.customJS?.obsidian?.requestUrl;
		if (typeof request !== "function") return { ok: false, code: "network" };

		for (let attempt = 0; attempt < 3; attempt++) {
			let res;
			try {
				res = await this._request(() => Promise.race([
					request({ url: url.href, method: "GET", headers: { Accept: "application/json" }, throw: false }),
					new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 20000))
				]));
			} catch (_) {
				if (attempt < 2) { await new Promise(r => setTimeout(r, 1200 * 2 ** attempt)); continue; }
				return { ok: false, code: "network" };
			}
			const st = res?.status || 0;
			if (st === 401 || st === 403) return { ok: false, code: "bad_key" };
			if (st === 429) {
				this._ls(false, "steamvault:ra:cooldownUntil", String(Date.now() + this.COOLDOWN_MIN * 60000));
				return { ok: false, code: "rate_limited" };
			}
			if (st === 404) return { ok: false, code: "not_found" };
			if (st >= 500 && attempt < 2) { await new Promise(r => setTimeout(r, 1500 * 2 ** attempt)); continue; }
			if (st >= 400) return { ok: false, code: "http", status: st };
			if (String(res?.text ?? "").length > 8e6) return { ok: false, code: "format" };
			let data;
			try { data = typeof res.json === "object" && res.json !== null ? res.json : JSON.parse(String(res.text ?? "")); }
			catch (_) { return { ok: false, code: "format" }; }
			if (data && typeof data === "object" && !Array.isArray(data) && data.message && Object.keys(data).length <= 2 && /invalid|unauthor/i.test(String(data.message))) return { ok: false, code: "bad_key" };
			return { ok: true, data };
		}
		return { ok: false, code: "network" };
	}

	message(code) {
		return ({
			ok: "sincronizado",
			no_key: "Configure sua Web API Key do RetroAchievements",
			no_user: "Informe seu nome de usuário do RetroAchievements",
			bad_key: "Usuário ou Web API Key do RetroAchievements inválidos",
			not_found: "Não encontrado no RetroAchievements",
			rate_limited: "O RetroAchievements limitou o acesso — o sync volta em alguns minutos",
			network: "Sem conexão com o RetroAchievements",
			format: "Resposta inesperada do RetroAchievements",
			http: "O RetroAchievements respondeu com erro",
			no_game_id: "Jogo sem ID do RetroAchievements",
			internal: "Erro interno"
		})[code] || "Falha no RetroAchievements";
	}

	// ============================================================ utilidades
	_n(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }
	_s(v) { return v === undefined || v === null ? "" : String(v).trim(); }
	_pct(v) { const n = parseFloat(String(v ?? "").replace("%", "")); return Number.isFinite(n) ? Math.round(n * 10) / 10 : null; }

	// "2024-03-02 18:22:10" (UTC) → { date: "2024-03-02", time: "15:22", iso }
	_when(v) {
		const s = this._s(v);
		if (!s) return { date: "", time: "", iso: "" };
		const d = new Date(/Z|[+-]\d\d:?\d\d$/.test(s) ? s : s.replace(" ", "T") + "Z");
		if (isNaN(d)) return { date: s.slice(0, 10), time: "", iso: "" };
		const pad = n => String(n).padStart(2, "0");
		return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}`, iso: d.toISOString() };
	}

	platformFor(consoleName) {
		const k = this._s(consoleName).toLowerCase();
		return this.CONSOLES[k] || this._s(consoleName) || "Outros";
	}

	awardLabel(kind) { return this.AWARD_LABEL[this._s(kind).toLowerCase()] || ""; }

	gameUrl(id) { return id ? `${this.SITE}/game/${encodeURIComponent(id)}` : ""; }

	// ============================================================ leituras
	async fetchProfile(user) {
		const r = await this._get("profile", { u: user });
		if (!r.ok) return r;
		const d = r.data || {};
		if (!d.User && !d.user) return { ok: false, code: "not_found" };
		return {
			ok: true, profile: {
				user: this._s(d.User), ulid: this._s(d.ULID), avatar: this.image(d.UserPic),
				memberSince: this._when(d.MemberSince).date, motto: this._s(d.Motto), richPresence: this._s(d.RichPresenceMsg),
				lastGameId: this._s(d.LastGameID), points: this._n(d.TotalPoints) ?? 0, softcorePoints: this._n(d.TotalSoftcorePoints) ?? 0,
				truePoints: this._n(d.TotalTruePoints) ?? 0, contribCount: this._n(d.ContribCount) ?? 0, contribYield: this._n(d.ContribYield) ?? 0
			}
		};
	}

	async fetchSummary(user) {
		const r = await this._get("summary", { u: user, g: 8, a: 0 });
		if (!r.ok) return r;
		const d = r.data || {};
		const awarded = d.Awarded && typeof d.Awarded === "object" ? d.Awarded : {};
		return {
			ok: true, summary: {
				rank: this._n(d.Rank), totalRanked: this._n(d.TotalRanked), status: this._s(d.Status),
				richPresence: this._s(d.RichPresenceMsg), lastActivity: this._when(d.LastActivity?.timestamp || d.LastActivity?.lastupdate).iso,
				recentlyPlayed: (Array.isArray(d.RecentlyPlayed) ? d.RecentlyPlayed : []).map(x => {
					const aw = awarded[x.GameID] || {};
					return {
						gameId: this._s(x.GameID), title: this._s(x.Title), console: this._s(x.ConsoleName),
						icon: this.image(x.ImageIcon), boxArt: this.image(x.ImageBoxArt), titleImg: this.image(x.ImageTitle),
						lastPlayed: this._when(x.LastPlayed).iso, total: this._n(x.AchievementsTotal) ?? this._n(aw.NumPossibleAchievements) ?? 0,
						unlocked: this._n(aw.NumAchieved) ?? 0, hardcore: this._n(aw.NumAchievedHardcore) ?? 0
					};
				})
			}
		};
	}

	async fetchCompletion(user) {
		const out = [];
		for (let offset = 0; offset < 5000; offset += 500) {
			const r = await this._get("completion", { u: user, c: 500, o: offset });
			if (!r.ok) return offset ? { ok: true, games: out, partial: true } : r;
			const list = Array.isArray(r.data?.Results) ? r.data.Results : [];
			for (const x of list) {
				out.push({
					gameId: this._s(x.GameID), title: this._s(x.Title), console: this._s(x.ConsoleName), icon: this.image(x.ImageIcon),
					total: this._n(x.MaxPossible) ?? 0, unlocked: this._n(x.NumAwarded) ?? 0, hardcore: this._n(x.NumAwardedHardcore) ?? 0,
					lastUnlock: this._when(x.MostRecentAwardedDate).iso, award: this._s(x.HighestAwardKind), awardDate: this._when(x.HighestAwardDate).iso
				});
			}
			const total = this._n(r.data?.Total) ?? list.length;
			if (out.length >= total || list.length < 500) break;
		}
		return { ok: true, games: out };
	}

	async fetchAwards(user) {
		const r = await this._get("awards", { u: user });
		if (!r.ok) return r;
		const d = r.data || {};
		return {
			ok: true, awards: {
				total: this._n(d.TotalAwardsCount) ?? 0, mastery: this._n(d.MasteryAwardsCount) ?? 0,
				completion: this._n(d.CompletionAwardsCount) ?? 0, beatenHardcore: this._n(d.BeatenHardcoreAwardsCount) ?? 0,
				beatenSoftcore: this._n(d.BeatenSoftcoreAwardsCount) ?? 0,
				list: (Array.isArray(d.VisibleUserAwards) ? d.VisibleUserAwards : []).map(x => {
					const type = this._s(x.AwardType);
					const hc = Number(x.AwardDataExtra) === 1;
					const kind = /beaten/i.test(type) ? (hc ? "beaten-hardcore" : "beaten-softcore") : /mastery|completion/i.test(type) ? (hc ? "mastered" : "completed") : "";
					return { date: this._when(x.AwardedAt).iso, type, kind, gameId: this._s(x.AwardData), hardcore: hc, title: this._s(x.Title), console: this._s(x.ConsoleName), icon: this.image(x.ImageIcon) };
				}).filter(x => x.kind)
			}
		};
	}

	async fetchRecent(user, days = 90) {
		const t = Math.floor(Date.now() / 1000), f = t - days * 86400;
		const r = await this._get("between", { u: user, f, t });
		if (!r.ok) return r;
		const list = Array.isArray(r.data) ? r.data : [];
		return {
			ok: true, recent: list.map(x => ({
				date: this._when(x.Date).iso, hardcore: Number(x.HardcoreMode) === 1, id: this._s(x.AchievementID),
				title: this._s(x.Title), description: this._s(x.Description), badge: this.badge(x.BadgeName) || this.image(x.BadgeURL),
				points: this._n(x.Points) ?? 0, trueRatio: this._n(x.TrueRatio), type: this._s(x.Type),
				gameId: this._s(x.GameID), gameTitle: this._s(x.GameTitle), gameIcon: this.image(x.GameIcon), console: this._s(x.ConsoleName)
			})).sort((a, b) => String(b.date).localeCompare(String(a.date)))
		};
	}

	async fetchGame(gameId, user) {
		if (!/^\d+$/.test(String(gameId))) return { ok: false, code: "no_game_id" };
		const r = await this._get("game", { g: gameId, u: user, a: 1 });
		if (!r.ok) return r;
		const d = r.data || {};
		if (!d.ID && !d.Title) return { ok: false, code: "not_found" };
		const players = this._n(d.NumDistinctPlayers) ?? this._n(d.NumDistinctPlayersCasual) ?? 0;
		const list = Object.values(d.Achievements || {}).map(a => {
			const hc = this._when(a.DateEarnedHardcore), sc = this._when(a.DateEarned);
			const when = hc.iso ? hc : sc;
			const n = this._n(a.NumAwarded) ?? 0;
			return {
				id: this._s(a.ID), name: this._s(a.Title), description: this._s(a.Description),
				points: this._n(a.Points) ?? 0, trueRatio: this._n(a.TrueRatio), badge: this.badge(a.BadgeName),
				order: this._n(a.DisplayOrder) ?? 0, type: this._s(a.type || a.Type),
				unlocked: !!(sc.iso || hc.iso), hardcore: !!hc.iso, date: when.date, time: when.time, iso: when.iso,
				percent: players > 0 ? Math.round((n / players) * 1000) / 10 : null
			};
		}).filter(a => a.id && a.name).sort((a, b) => a.order - b.order || Number(a.id) - Number(b.id));
		const released = this._s(d.Released);
		return {
			ok: true, game: {
				id: this._s(d.ID), title: this._s(d.Title), console: this._s(d.ConsoleName),
				icon: this.image(d.ImageIcon), boxArt: this.image(d.ImageBoxArt), titleImg: this.image(d.ImageTitle), ingame: this.image(d.ImageIngame),
				developer: this._s(d.Developer), publisher: this._s(d.Publisher), genre: this._s(d.Genre),
				year: (/(\d{4})/.exec(released) || [])[1] || "", players,
				award: this._s(d.HighestAwardKind), awardDate: this._when(d.HighestAwardDate).date,
				completion: this._pct(d.UserCompletion), completionHardcore: this._pct(d.UserCompletionHardcore),
				achievements: list
			}
		};
	}

	// ============================================================ cache
	async readCache() {
		try {
			const a = app.vault.adapter;
			if (!(await a.exists(this.CACHE))) return null;
			return JSON.parse(await a.read(this.CACHE));
		} catch (_) { return null; }
	}

	async _writeCache(patch) {
		const a = app.vault.adapter;
		const cur = (await this.readCache()) || {};
		const next = { ...cur, ...patch, updatedAt: new Date().toISOString() };
		try {
			if (!(await a.exists(".steamvault"))) await a.mkdir(".steamvault");
			await a.write(this.CACHE, JSON.stringify(next));
		} catch (err) { console.warn("Game Library: não foi possível gravar o cache do RetroAchievements", err?.message); }
		return next;
	}

	async clearCache() {
		try { if (await app.vault.adapter.exists(this.CACHE)) await app.vault.adapter.remove(this.CACHE); } catch (_) {}
		await this.saveConfig({ lastSync: "", syncStatus: "", syncError: "" });
	}

	// ============================================================ conectar
	async connect(user, key) {
		const u = this._s(user).replace(/^https?:\/\/(www\.)?retroachievements\.org\/user\//i, "").replace(/\/.*$/, "");
		if (!u) return { ok: false, code: "no_user" };
		// a chave nova só fica guardada se o RetroAchievements a confirmar;
		// uma chave errada nunca substitui a que já funcionava
		const previous = this._apiKey();
		if (key) this.setKey(key);
		if (!this.hasKey()) return { ok: false, code: "no_key" };
		const r = await this.fetchProfile(u);
		if (!r.ok) {
			if (key) { if (previous) this._ls(false, this.KEY, previous); else this.removeKey(); }
			return r;
		}
		await this.saveConfig({ user: r.profile.user || u, ulid: r.profile.ulid, avatar: r.profile.avatar, syncStatus: "", syncError: "" });
		await this._writeCache({ profile: r.profile });
		return { ok: true, profile: r.profile };
	}

	async disconnect() {
		this.removeKey();
		await this.clearCache();
		await this.saveConfig({ user: "", ulid: "", avatar: "" });
	}

	// ============================================================ jogos do vault
	vaultGames() {
		return app.vault.getMarkdownFiles().map(f => ({ f, fm: app.metadataCache.getFileCache(f)?.frontmatter }))
			.filter(x => x.fm?.type === "game" && !x.f.path.includes("/_Templates/"));
	}

	_isRetroGame(fm) {
		// sync automático só para origem RetroAchievements em modo Automática
		const C = this.C, provider = C.achievementProvider(fm);
		return provider === "retroachievements" && C.achievementSync(fm, provider) === "automatic";
	}

	// jogos do vault que são do RA mas ainda sem raGameId: tenta ligar pelo
	// título (e console, quando bate) usando a lista de progresso do perfil
	async _linkByTitle(completion) {
		const C = this.C;
		let linked = 0;
		for (const { f, fm } of this.vaultGames()) {
			if (!this._isRetroGame(fm) || this._s(fm.raGameId)) continue;
			const key = C.normalizeKey(fm.title || f.basename);
			const plat = C.normalizeKey(fm.platform);
			const hits = completion.filter(g => C.normalizeKey(g.title) === key);
			const hit = hits.find(g => C.normalizeKey(this.platformFor(g.console)) === plat) || (hits.length === 1 ? hits[0] : null);
			if (!hit) continue;
			await app.fileManager.processFrontMatter(f, x => { x.raGameId = hit.gameId; this.C.migrateAchievementFields(x); });
			linked++;
		}
		return linked;
	}

	// ============================================================ sync de um jogo
	async syncGame(file, { force = false, user = "" } = {}) {
		const cfg = this.getConfig();
		const u = user || cfg.user;
		if (!u) return { ok: false, code: "no_user" };
		const fm = app.metadataCache.getFileCache(file)?.frontmatter || {};
		const gameId = this._s(fm.raGameId);
		if (!gameId) return { ok: false, code: "no_game_id" };
		const last = Date.parse(fm.ra?.lastSync || "");
		if (!force && last && Date.now() - last < this.STALE_HOURS * 3600000) return { ok: true, skipped: true };

		const r = await this.fetchGame(gameId, u);
		const now = new Date().toISOString();
		if (!r.ok) {
			await app.fileManager.processFrontMatter(file, x => {
				const cur = (x.ra && typeof x.ra === "object") ? x.ra : {};
				x.ra = { ...cur, lastAttempt: now, syncStatus: r.code, syncError: this.message(r.code) };
			});
			return r;
		}
		const g = r.game;
		const res = await this._applyAchievements(file, fm, g);
		const unlocked = g.achievements.filter(a => a.unlocked);
		const hc = unlocked.filter(a => a.hardcore);
		const pts = a => a.reduce((s, x) => s + (x.points || 0), 0);
		const dates = unlocked.map(a => a.date).filter(Boolean).sort();
		const beaten = /mastered|completed|beaten/.test(g.award);
		await app.fileManager.processFrontMatter(file, x => {
			x.raGameId = g.id || gameId;
			this.C.migrateAchievementFields(x);
			x.ra = {
				lastSync: now, lastAttempt: now, syncStatus: "ok", syncError: "",
				console: g.console, players: g.players, icon: g.icon,
				achievements: { total: g.achievements.length, unlocked: unlocked.length, hardcore: hc.length },
				points: { total: pts(g.achievements), earned: pts(unlocked), hardcore: pts(hc) },
				award: g.award, awardDate: g.awardDate, lastPlayed: dates[dates.length - 1] || ""
			};
			x.achievementsTotal = g.achievements.length;
			x.achievementsEarned = unlocked.length;
			// informações do jogo só preenchem o que está VAZIO na ficha
			const empty = v => v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length) || v === 0;
			if (empty(x.developer) && g.developer) x.developer = g.developer;
			if (empty(x.publisher) && g.publisher) x.publisher = g.publisher;
			if (empty(x.genre) && g.genre) x.genre = g.genre.split(/\s*[,/]\s*/).filter(Boolean);
			if (empty(x.releaseYear) && g.year) x.releaseYear = Number(g.year);
			if (empty(x.cover) && g.boxArt) x.cover = g.boxArt;
			if (empty(x.startDate) && dates[0]) x.startDate = dates[0];
			if (empty(x.completionDate) && beaten && g.awardDate) x.completionDate = g.awardDate;
		});
		this.C.invalidate();
		return { ok: true, ...res, unlocked: unlocked.length, total: g.achievements.length };
	}

	async _applyAchievements(gameFile, gameFm, g) {
		const C = this.C;
		const notes = app.vault.getMarkdownFiles().filter(f => {
			const afm = app.metadataCache.getFileCache(f)?.frontmatter;
			if (afm?.type !== "achievement") return false;
			return afm.gamePath === gameFile.path || C.linkPath(afm.game).replace(/\.md$/, "") === gameFile.basename;
		});
		const byId = new Map(), byName = new Map();
		for (const f of notes) {
			const afm = app.metadataCache.getFileCache(f).frontmatter;
			if (afm.raId !== undefined && afm.raId !== null && afm.raId !== "") byId.set(String(afm.raId), f);
			byName.set(C.normalizeKey(afm.name || f.basename), f);
		}
		let updated = 0, created = 0;
		const used = new Set();
		for (const a of g.achievements) {
			const f = byId.get(a.id) || byName.get(C.normalizeKey(a.name));
			if (f && !used.has(f.path)) {
				used.add(f.path);
				const afm = app.metadataCache.getFileCache(f).frontmatter;
				const same = !!afm.unlocked === a.unlocked && String(afm.unlockedDate || "") === a.date && String(afm.raId ?? "") === a.id
					&& (afm.raHardcore === true) === a.hardcore && Number(afm.raPercent) === a.percent && afm.unlockSource === "retroachievements";
				if (same) continue;
				await app.fileManager.processFrontMatter(f, x => {
					x.unlocked = a.unlocked; x.unlockedDate = a.date; x.unlockedTime = a.time;
					x.unlockSource = "retroachievements"; x.raId = Number(a.id); x.raDisplayOrder = a.order;
					x.raHardcore = a.hardcore; x.points = a.points;
					if (a.percent !== null) x.raPercent = a.percent;
					if (a.trueRatio !== null) x.raTrueRatio = a.trueRatio;
					if (a.type) x.raType = a.type;
					if (a.badge) { x.raBadgeUrl = a.badge; if (!x.icon) x.icon = a.badge; }
				});
				updated++;
			} else if (!f) {
				const folderName = C.safeFileName(gameFm.title || gameFile.basename, "Jogo");
				const folder = `${C.folders.achievements}/${folderName}`;
				if (!app.vault.getAbstractFileByPath(folder)) await app.vault.createFolder(folder).catch(() => {});
				const base = C.safeFileName(a.name, "Conquista");
				let path = `${folder}/${base}.md`, n = 2;
				while (app.vault.getAbstractFileByPath(path)) path = `${folder}/${base} ${n++}.md`;
				await app.vault.create(path, C.buildAchievementNote({
					name: a.name, description: a.description, icon: a.badge, points: a.points,
					unlocked: a.unlocked, unlockedDate: a.date, unlockedTime: a.time,
					gameLink: `[[${gameFile.basename}]]`, gamePath: gameFile.path, unlockSource: "retroachievements",
					extra: {
						raId: Number(a.id), raDisplayOrder: a.order, raHardcore: a.hardcore, raPercent: a.percent ?? "",
						raTrueRatio: a.trueRatio ?? "", raType: a.type, raBadgeUrl: a.badge
					}
				}));
				created++;
			}
		}
		return { updated, created };
	}

	// ============================================================ importar jogos
	// cria a ficha de um jogo do perfil RA que ainda não está no vault
	async importGame(entry) {
		const C = this.C;
		const gameId = this._s(entry.gameId || entry.id);
		const exists = this.vaultGames().find(x => this._s(x.fm.raGameId) === gameId);
		if (exists) return { ok: true, file: exists.f, existed: true };
		const file = await C.createGameNote({
			title: entry.title, platform: this.platformFor(entry.console), achievementProvider: "retroachievements", achievementSync: "automatic",
			raGameId: gameId, status: /mastered|completed|beaten/.test(entry.award || "") ? "Completed" : (entry.unlocked > 0 ? "Playing" : "Backlog"),
			cover: ""
		});
		await new Promise(r => setTimeout(r, 250)); // deixa o metadataCache ler a nota nova
		const r = await this.syncGame(file, { force: true });
		return { ok: true, file, sync: r };
	}

	async importMany(entries, onProgress = () => {}) {
		let done = 0, failed = 0;
		for (const [i, e] of entries.entries()) {
			onProgress({ index: i + 1, total: entries.length, name: e.title });
			try { const r = await this.importGame(e); if (r.ok) done++; else failed++; }
			catch (_) { failed++; }
			if (Date.now() < this._cooldownUntil()) break;
		}
		return { ok: true, done, failed };
	}

	// ============================================================ sync geral
	async syncAll({ force = false, onProgress = () => {} } = {}) {
		const cfg = this.getConfig();
		if (!cfg.user) return { ok: false, code: "no_user" };
		if (!cfg.hasKey) return { ok: false, code: "no_key" };
		if (window.__svRaSyncRunning) return { ok: false, code: "busy" };
		window.__svRaSyncRunning = true;
		const now = new Date().toISOString();
		try {
			onProgress({ index: 0, total: 1, name: "perfil" });
			const pr = await this.fetchProfile(cfg.user);
			if (!pr.ok) {
				await this.saveConfig({ syncStatus: pr.code, syncError: this.message(pr.code), lastAttempt: now });
				return pr;
			}
			const [sm, cp, aw, rc] = [await this.fetchSummary(cfg.user), await this.fetchCompletion(cfg.user), await this.fetchAwards(cfg.user), await this.fetchRecent(cfg.user, 90)];
			const cache = await this._writeCache({
				profile: pr.profile,
				...(sm.ok ? { summary: sm.summary } : {}),
				...(cp.ok ? { completion: cp.games } : {}),
				...(aw.ok ? { awards: aw.awards } : {}),
				...(rc.ok ? { recent: rc.recent } : {})
			});
			const linked = cp.ok ? await this._linkByTitle(cp.games) : 0;
			await new Promise(r => setTimeout(r, 200));

			// jogos do vault ligados ao RA
			const games = this.vaultGames().filter(x => this._s(x.fm.raGameId) && this._isRetroGame(x.fm));
			let synced = 0, skipped = 0, failed = 0, created = 0;
			for (const [i, { f, fm }] of games.entries()) {
				onProgress({ index: i + 1, total: games.length, name: fm.title || f.basename });
				const r = await this.syncGame(f, { force, user: cfg.user });
				if (r.ok && r.skipped) skipped++;
				else if (r.ok) { synced++; created += r.created || 0; }
				else { failed++; if (r.code === "rate_limited" || r.code === "bad_key") break; }
			}
			await this.saveConfig({ user: pr.profile.user || cfg.user, ulid: pr.profile.ulid, avatar: pr.profile.avatar, lastSync: now, syncStatus: failed ? "partial" : "ok", syncError: "" });
			this.C.invalidate();
			return { ok: true, synced, skipped, failed, created, linked, games: (cache.completion || []).length };
		} finally {
			window.__svRaSyncRunning = false;
		}
	}

	maybeAutoSync() {
		if (window.__svRaAutoDone) return;
		window.__svRaAutoDone = true;
		const cfg = this.getConfig();
		if (!cfg.configured || !cfg.autoSync) return;
		const last = Date.parse(cfg.lastSync || "");
		if (last && Date.now() - last < this.STALE_HOURS * 3600000) return;
		setTimeout(() => this.syncAll({}).then(() => customJS.SteamVault?.refresh()).catch(() => {}), 4000);
	}
}
