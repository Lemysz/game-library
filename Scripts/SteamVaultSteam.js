// ==========================================================================
// Game Library — Steam Community Sync (páginas PÚBLICAS, sem Web API)
//
// Fonte: somente steamcommunity.com, exatamente como qualquer visitante
// anônimo vê. NÃO usa:
//   · Steam Web API / api.steampowered.com / chave de desenvolvedor
//   · login, senha, cookies, sessão
//   · proxies ou serviços intermediários
// Se a Steam não exibe um dado publicamente, este módulo NÃO o obtém —
// e marca o estado como indisponível em vez de inventar um número.
//
// Rede: requestUrl do Obsidian (desktop e mobile). Todas as requisições
// passam por uma fila única com intervalo mínimo, timeout, retry limitado
// com backoff exponencial e um "disjuntor" quando a Steam limita o acesso.
//
// Acesso: customJS.SteamVaultSteam
// ==========================================================================

class SteamVaultSteam {

	constructor() {
		this.host = "https://steamcommunity.com";
		this.settingsPath = "Dashboard/Steam.md";
		this.cacheDir = ".steamvault";
		this.minIntervalMs = 1600;      // entre requisições
		this.timeoutMs = 15000;
		this.maxRetries = 2;            // total = 1 + 2 tentativas
		this.cooldownMs = 15 * 60000;   // pausa após 429 / bloqueio
		this.staleHours = 12;           // um jogo só é re-sincronizado depois disso
		if (!window.__svSteamQueue) window.__svSteamQueue = { last: 0, chain: Promise.resolve() };

		this.messages = {
			ok: "Sincronizado com a Steam Community",
			not_configured: "Configure seu perfil Steam para sincronizar",
			invalid_profile: "Endereço de perfil Steam inválido",
			profile_not_found: "Perfil Steam não encontrado",
			private_profile: "O perfil Steam precisa ser público",
			private_game_details: "Os detalhes de jogos estão privados na Steam",
			no_stats: "Este jogo não tem conquistas públicas na Steam",
			not_owned: "Jogo não encontrado no perfil público",
			no_app_id: "Jogo sem Steam AppID",
			html_changed: "A Steam mudou o formato da página pública",
			rate_limited: "A Steam limitou as consultas — tente mais tarde",
			network: "Não foi possível sincronizar (rede ou timeout)",
			unavailable: "Dados públicos da Steam indisponíveis"
		};
	}

	message(code) { return this.messages[code] || this.messages.unavailable; }

	// ============================================================ perfil
	// Aceita URL /id/…, URL /profiles/7656…, o custom URL puro ou o SteamID64.
	parseProfileInput(raw) {
		const s = String(raw ?? "").trim();
		if (!s) return null;
		let m = /steamcommunity\.com\/profiles\/(\d{17})/i.exec(s);
		if (m) return { kind: "id64", value: m[1] };
		m = /steamcommunity\.com\/id\/([A-Za-z0-9_-]{2,64})/i.exec(s);
		if (m) return { kind: "vanity", value: m[1] };
		if (/^7656\d{13}$/.test(s)) return { kind: "id64", value: s };
		if (/^[A-Za-z0-9_-]{2,64}$/.test(s)) return { kind: "vanity", value: s };
		return null;
	}

	profileBaseUrl(cfg) {
		if (cfg?.steamId64) return `${this.host}/profiles/${cfg.steamId64}`;
		if (cfg?.customUrl) return `${this.host}/id/${encodeURIComponent(cfg.customUrl)}`;
		return "";
	}

	// config salva no frontmatter de Dashboard/Steam.md (sem dado sensível:
	// só o endereço público do perfil)
	getConfig() {
		const file = app.vault.getAbstractFileByPath(this.settingsPath);
		const fm = file ? app.metadataCache.getFileCache(file)?.frontmatter : null;
		const p = fm?.steamProfile && typeof fm.steamProfile === "object" ? fm.steamProfile : {};
		return {
			input: p.input || "", steamId64: p.steamId64 ? String(p.steamId64) : "", customUrl: p.customUrl || "",
			profileUrl: p.profileUrl || "", name: p.name || "", avatar: p.avatar || "",
			privacy: p.privacy || "", lastSync: p.lastSync || "", syncStatus: p.syncStatus || "",
			autoSync: p.autoSync === true, language: p.language || "brazilian",
			configured: !!(p.steamId64 || p.customUrl)
		};
	}

	async _saveConfig(patch) {
		const file = app.vault.getAbstractFileByPath(this.settingsPath);
		if (!file) throw new Error(`Nota ${this.settingsPath} não encontrada.`);
		await app.fileManager.processFrontMatter(file, fm => {
			const cur = fm.steamProfile && typeof fm.steamProfile === "object" ? fm.steamProfile : {};
			fm.steamProfile = { ...cur, ...patch };
		});
	}

	// resolve o endereço informado para um SteamID64 usando o XML público do
	// perfil (steamcommunity.com/id/<x>/?xml=1) — sem Web API
	async resolveProfile(input) {
		const parsed = this.parseProfileInput(input);
		if (!parsed) return { ok: false, code: "invalid_profile" };
		const base = parsed.kind === "id64" ? `${this.host}/profiles/${parsed.value}` : `${this.host}/id/${encodeURIComponent(parsed.value)}`;
		const res = await this._get(`${base}/?xml=1`);
		if (!res.ok) return res;
		const doc = this._xml(res.text);
		const err = this._t(doc, "response > error") || this._t(doc, "error");
		if (err || !doc) return { ok: false, code: "profile_not_found", detail: err };
		const id64 = this._t(doc, "profile > steamID64");
		if (!/^\d{17}$/.test(id64)) return { ok: false, code: "html_changed" };
		const privacy = this._t(doc, "profile > privacyState") || "";
		const cfg = {
			input: String(input).trim(), steamId64: id64,
			customUrl: this._t(doc, "profile > customURL") || (parsed.kind === "vanity" ? parsed.value : ""),
			profileUrl: `${this.host}/profiles/${id64}/`,
			name: this._t(doc, "profile > steamID"), avatar: this._t(doc, "profile > avatarFull"),
			privacy, resolvedAt: new Date().toISOString()
		};
		await this._saveConfig(cfg);
		return { ok: true, profile: cfg, isPublic: privacy === "public" };
	}

	// ========================================================== rede
	_sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

	_requestFn() {
		const fn = globalThis?.customJS?.obsidian?.requestUrl || globalThis?.requestUrl || globalThis?.app?.requestUrl;
		if (typeof fn !== "function") throw new Error("requestUrl do Obsidian indisponível (CustomJS carregado?)");
		return fn;
	}

	_store(key, value) {
		const k = `steamvault:${key}`;
		try {
			if (value === undefined) return typeof app?.loadLocalStorage === "function" ? app.loadLocalStorage(k) : localStorage.getItem(k);
			if (typeof app?.saveLocalStorage === "function") app.saveLocalStorage(k, value); else localStorage.setItem(k, value);
		} catch (_) { return null; }
	}

	cooldownUntil() { return Number(this._store("cooldownUntil") || 0); }

	// só steamcommunity.com — qualquer outro host é recusado aqui
	_assertHost(url) {
		const u = new URL(url);
		if (u.hostname !== "steamcommunity.com") throw new Error(`Host não permitido: ${u.hostname}`);
		if (/api\.steampowered\.com/i.test(url)) throw new Error("Steam Web API não é usada pela Game Library");
	}

	// uma fila global: nunca duas requisições ao mesmo tempo, sempre com
	// intervalo mínimo entre elas
	_enqueue(task) {
		const q = window.__svSteamQueue;
		const run = async () => {
			const wait = q.last + this.minIntervalMs - Date.now();
			if (wait > 0) await this._sleep(wait);
			try { return await task(); } finally { q.last = Date.now(); }
		};
		const p = q.chain.then(run, run);
		q.chain = p.catch(() => {});
		return p;
	}

	async _get(url) {
		this._assertHost(url);
		if (Date.now() < this.cooldownUntil()) return { ok: false, code: "rate_limited" };
		const request = this._requestFn();
		for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
			if (attempt > 0) await this._sleep(Math.min(20000, 1500 * 2 ** attempt + Math.random() * 500));
			let res;
			try {
				res = await this._enqueue(() => Promise.race([
					request({ url, method: "GET", throw: false, headers: { "Accept-Language": "en-US,en;q=0.8" } }),
					this._sleep(this.timeoutMs).then(() => { throw new Error("timeout"); })
				]));
			} catch (err) {
				if (attempt === this.maxRetries) return { ok: false, code: "network", detail: String(err?.message || err) };
				continue;
			}
			const status = res?.status ?? 0;
			if (status === 429 || status === 403) {
				this._store("cooldownUntil", String(Date.now() + this.cooldownMs));
				return { ok: false, code: "rate_limited", status };
			}
			if (status >= 500 || status === 0) {
				if (attempt === this.maxRetries) return { ok: false, code: "network", status };
				continue;
			}
			const text = typeof res.text === "string" ? res.text : "";
			if (!text.trim()) {
				if (attempt === this.maxRetries) return { ok: false, code: "unavailable", status };
				continue;
			}
			return { ok: true, status, text };
		}
		return { ok: false, code: "network" };
	}

	// ========================================================== parsing
	_xml(text) {
		try {
			const doc = new DOMParser().parseFromString(text, "text/xml");
			return doc.querySelector("parsererror") ? null : doc;
		} catch (_) { return null; }
	}

	_html(text) {
		try { return new DOMParser().parseFromString(text, "text/html"); } catch (_) { return null; }
	}

	_t(root, sel) { return (root?.querySelector(sel)?.textContent || "").trim(); }

	_num(s) {
		const n = Number(String(s ?? "").replace(/,/g, "").replace(/[^\d.]/g, ""));
		return Number.isFinite(n) ? n : null;
	}

	_iconHash(url) {
		const m = /\/([0-9a-f]{40})\.(?:jpg|png|gif)/i.exec(String(url ?? ""));
		return m ? m[1].toLowerCase() : "";
	}

	_isPrivatePage(text) {
		return /profile_private_info|This profile is private|perfil é privado/i.test(text);
	}

	// "Unlocked 23 May, 2018 @ 10:03pm" | "Unlocked Jun 4 @ 9:01pm"
	_parseUnlockText(s) {
		const months = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
		const t = String(s).replace(/\s+/g, " ");
		let m = /(\d{1,2}) ([A-Za-z]{3})[a-z]*,? (\d{4})? ?@ ?(\d{1,2}):(\d{2}) ?([ap]m)/i.exec(t)
			|| null;
		let day, mon, year, hh, mm, ap;
		if (m) { [, day, mon, year, hh, mm, ap] = m; }
		else {
			m = /([A-Za-z]{3})[a-z]* (\d{1,2}),? (\d{4})? ?@ ?(\d{1,2}):(\d{2}) ?([ap]m)/i.exec(t);
			if (!m) return null;
			[, mon, day, year, hh, mm, ap] = m;
		}
		const month = months[mon.toLowerCase()];
		if (!month) return null;
		let h = Number(hh) % 12 + (ap.toLowerCase() === "pm" ? 12 : 0);
		const y = Number(year) || new Date().getFullYear();
		const p = n => String(n).padStart(2, "0");
		return { date: `${y}-${p(month)}-${p(day)}`, time: `${p(h)}:${mm}` };
	}

	_fromTimestamp(ts) {
		const n = Number(ts);
		if (!Number.isFinite(n) || n <= 0) return null;
		const d = new Date(n * 1000);
		const p = x => String(x).padStart(2, "0");
		return { date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, time: `${p(d.getHours())}:${p(d.getMinutes())}` };
	}

	// ================================ layout novo da Steam Community (React/SSR)
	// A página traz tudo num <script id="valve-ssr-data">: usuário (desbloqueio +
	// timestamp), esquema (nome, descrição, ícones) e % global de cada conquista.
	_parseSsrAchievements(text, appId) {
		try {
			const m = /<script[^>]*id="valve-ssr-data"[^>]*>([\s\S]*?)<\/script>/.exec(String(text || ""));
			if (!m) return null;
			const ssr = JSON.parse(m[1]);
			const qd = ssr?.renderContext?.queryData;
			const queries = (typeof qd === "string" ? JSON.parse(qd) : qd)?.queries || [];
			const pick = tag => queries.find(q => Array.isArray(q.queryKey) && q.queryKey[0] === "achievements" && q.queryKey.includes(tag))?.state?.data;
			const user = pick("user_achievements"), schema = pick("schema_v2"), pcts = pick("globalpercentages")?.percentages || {};
			if (!schema || !Array.isArray(schema.groups)) return null;
			const mine = user?.achievements || {};
			const icon = h => h ? `https://shared.fastly.steamstatic.com/community_assets/images/apps/${encodeURIComponent(appId)}/${h}` : "";
			const list = [], byHash = new Map(), byName = new Map();
			let order = 0;
			for (const g of schema.groups) {
				if (g?.developeronly || g?.ispublic === false) continue;
				for (const a of g.achievements || []) {
					if (a.archived) continue;
					const mineA = mine[String(a.internal_key)] || {};
					const unlocked = mineA.unlocked === true;
					const when = unlocked ? this._fromTimestamp(mineA.unlock_time) : null;
					const pct = Number(pcts[String(a.internal_key)]);
					const hash = this._iconHash(icon(a.icon_achieved));
					if (Number.isFinite(pct)) {
						const r = Math.round(pct * 10) / 10;
						if (hash) byHash.set(hash, r);
						byName.set(String(a.name || "").toLowerCase(), r);
					}
					list.push({
						apiName: a.api_name || "", name: a.name || "", description: a.description || "", hidden: !!a.hidden,
						iconUrl: icon(a.icon_achieved), iconLockedUrl: icon(a.icon_unachieved), iconHash: hash,
						unlocked, unlockedDate: when?.date || "", unlockedTime: when?.time || "", order: ++order
					});
				}
			}
			return { list, hasUser: !!user?.achievements, rarity: { byHash, byName } };
		} catch (_) { return null; }
	}

	// ============================================ conquistas do MEU perfil
	// 1º: XML público de stats do usuário · 2º: HTML público da mesma página
	async fetchPlayerAchievements(appId, cfg = this.getConfig()) {
		if (!cfg.configured) return { ok: false, code: "not_configured" };
		if (!appId) return { ok: false, code: "no_app_id" };
		const base = this.profileBaseUrl(cfg);
		const lang = encodeURIComponent(cfg.language || "brazilian");

		// 1º: página atual (layout novo, dados embutidos em JSON)
		const pageRes = await this._get(`${base}/stats/${encodeURIComponent(appId)}/achievements/?l=${lang}`);
		if (!pageRes.ok && pageRes.code === "rate_limited") return pageRes;
		if (pageRes.ok) {
			const ssr = this._parseSsrAchievements(pageRes.text, appId);
			if (ssr?.hasUser) {
				if (!ssr.list.length) return { ok: false, code: "no_stats" };
				return { ok: true, via: "ssr", list: ssr.list, total: ssr.list.length, unlocked: ssr.list.filter(a => a.unlocked).length, rarity: ssr.rarity };
			}
		}

		const xmlRes = await this._get(`${base}/stats/${encodeURIComponent(appId)}/achievements/?xml=1&l=${lang}`);
		if (!xmlRes.ok && xmlRes.code === "rate_limited") return xmlRes;
		if (xmlRes.ok) {
			const doc = this._xml(xmlRes.text);
			const error = this._t(doc, "playerstats > error") || this._t(doc, "error");
			if (doc && !error && doc.querySelector("achievements")) {
				const list = [...doc.querySelectorAll("achievements > achievement")].map((el, i) => {
					const closed = el.getAttribute("closed") === "1";
					const when = this._fromTimestamp(this._t(el, "unlockTimestamp"));
					return {
						apiName: this._t(el, "apiname"), name: this._t(el, "name"), description: this._t(el, "description"),
						iconUrl: this._t(el, "iconClosed"), iconLockedUrl: this._t(el, "iconOpen"),
						iconHash: this._iconHash(this._t(el, "iconClosed")),
						unlocked: closed, unlockedDate: closed && when ? when.date : "", unlockedTime: closed && when ? when.time : "",
						order: i + 1
					};
				});
				if (list.length) {
					return {
						ok: true, via: "xml", list,
						total: list.length, unlocked: list.filter(a => a.unlocked).length,
						hoursPlayed: this._num(this._t(doc, "stats > hoursPlayed"))
					};
				}
				return { ok: false, code: "no_stats" };
			}
			if (/private/i.test(error)) return { ok: false, code: "private_game_details" };
			if (/no stats|not have stats|no achievements/i.test(error)) return { ok: false, code: "no_stats" };
		}

		// fallback HTML (em inglês, para datas previsíveis — o nome traduzido
		// não importa: o casamento é feito pelo hash do ícone)
		const htmlRes = await this._get(`${base}/stats/${encodeURIComponent(appId)}/achievements/?l=english`);
		if (!htmlRes.ok) return htmlRes;
		if (this._isPrivatePage(htmlRes.text)) return { ok: false, code: "private_profile" };
		const doc = this._html(htmlRes.text);
		const rows = [...(doc?.querySelectorAll(".achieveRow") || [])];
		if (!rows.length) {
			// frases específicas — a palavra solta "private" aparece em qualquer página e dava falso "privado"
			if (/game details (?:are|is) (?:set to )?private|stats? (?:are|is) (?:not public|private)|This user has not made their game details public/i.test(htmlRes.text)) return { ok: false, code: "private_game_details" };
			// guarda a resposta bruta para diagnóstico do novo formato da Steam
			await this._writeDebug(appId, xmlRes, htmlRes, pageRes);
			return { ok: false, code: "html_changed" };
		}
		const list = rows.map((row, i) => {
			const img = row.querySelector(".achieveImgHolder img")?.getAttribute("src") || "";
			const unlockEl = row.querySelector(".achieveUnlockTime");
			const when = unlockEl ? this._parseUnlockText(unlockEl.textContent) : null;
			return {
				apiName: "", name: this._t(row, ".achieveTxt h3"), description: this._t(row, ".achieveTxt h5"),
				iconUrl: img, iconLockedUrl: "", iconHash: this._iconHash(img),
				unlocked: !!unlockEl, unlockedDate: when?.date || "", unlockedTime: when?.time || "", order: i + 1
			};
		});
		return { ok: true, via: "html", list, total: list.length, unlocked: list.filter(a => a.unlocked).length };
	}

	// raridade global — página pública de estatísticas do jogo
	async fetchGlobalRarity(appId) {
		const res = await this._get(`${this.host}/stats/${encodeURIComponent(appId)}/achievements/?l=english`);
		if (!res.ok) return res;
		const ssr = this._parseSsrAchievements(res.text, appId);
		if (ssr && ssr.rarity.byHash.size + ssr.rarity.byName.size) return { ok: true, ...ssr.rarity };
		const doc = this._html(res.text);
		const rows = [...(doc?.querySelectorAll(".achieveRow") || [])];
		if (!rows.length) return { ok: false, code: "html_changed" };
		const byHash = new Map(), byName = new Map();
		for (const row of rows) {
			const pct = this._num(this._t(row, ".achievePercent"));
			if (pct === null) continue;
			const hash = this._iconHash(row.querySelector("img")?.getAttribute("src"));
			if (hash) byHash.set(hash, pct);
			byName.set(this._t(row, "h3").toLowerCase(), pct);
		}
		return { ok: true, byHash, byName };
	}

	// ================================================ jogos do perfil
	// tempo de jogo e "jogado por último" — só se "detalhes de jogos" for público
	async fetchOwnedGames(cfg = this.getConfig()) {
		if (!cfg.configured) return { ok: false, code: "not_configured" };
		const base = this.profileBaseUrl(cfg);

		const xml = await this._get(`${base}/games/?tab=all&xml=1`);
		if (!xml.ok && xml.code === "rate_limited") return xml;
		if (xml.ok) {
			const doc = this._xml(xml.text);
			const games = [...(doc?.querySelectorAll("gamesList > games > game") || [])].map(el => ({
				appId: this._t(el, "appID"), name: this._t(el, "name"),
				hours: this._num(this._t(el, "hoursOnRecord")) ?? 0,
				hours2Weeks: this._num(this._t(el, "hoursLast2Weeks")), lastPlayed: ""
			}));
			if (games.length) return { ok: true, via: "xml", games };
			if (doc && /private/i.test(this._t(doc, "error"))) return { ok: false, code: "private_game_details" };
		}

		const res = await this._get(`${base}/games/?tab=all&l=english`);
		if (!res.ok) return res;
		if (this._isPrivatePage(res.text)) return { ok: false, code: "private_profile" };
		let raw = null;
		const attr = /data-profile-gameslist="([^"]+)"/.exec(res.text);
		if (attr) {
			try {
				const decoded = new DOMParser().parseFromString(`<i>${attr[1]}</i>`, "text/html").body.textContent;
				raw = JSON.parse(decoded)?.rgGames;
			} catch (_) { raw = null; }
		}
		if (!raw) {
			const m = /var rgGames\s*=\s*(\[[\s\S]*?\]);/.exec(res.text);
			if (m) { try { raw = JSON.parse(m[1]); } catch (_) { raw = null; } }
		}
		if (!Array.isArray(raw)) return { ok: false, code: /private/i.test(res.text) ? "private_game_details" : "html_changed" };
		if (!raw.length) return { ok: false, code: "private_game_details" };
		const games = raw.map(g => {
			const minutes = Number(g.playtime_forever ?? NaN);
			const hours = Number.isFinite(minutes) ? Math.round((minutes / 60) * 10) / 10 : this._num(g.hours_forever) ?? 0;
			const lp = this._fromTimestamp(g.rtime_last_played);
			return {
				appId: String(g.appid), name: g.name || "", hours,
				hours2Weeks: Number.isFinite(Number(g.playtime_2weeks)) ? Math.round(g.playtime_2weeks / 6) / 10 : null,
				lastPlayed: lp?.date || ""
			};
		});
		return { ok: true, via: "html", games };
	}

	// ================================================ perfil público
	async fetchProfile(cfg = this.getConfig()) {
		if (!cfg.configured) return { ok: false, code: "not_configured" };
		const base = this.profileBaseUrl(cfg);
		const xmlRes = await this._get(`${base}/?xml=1`);
		if (!xmlRes.ok) return xmlRes;
		const x = this._xml(xmlRes.text);
		if (!x || this._t(x, "response > error")) return { ok: false, code: "profile_not_found" };
		const profile = {
			steamId64: this._t(x, "profile > steamID64"), name: this._t(x, "profile > steamID"),
			avatar: this._t(x, "profile > avatarFull"), privacy: this._t(x, "profile > privacyState"),
			onlineState: this._t(x, "profile > onlineState"), stateMessage: this._t(x, "profile > stateMessage"),
			memberSince: this._t(x, "profile > memberSince"), headline: this._t(x, "profile > headline"),
			location: this._t(x, "profile > location"), customUrl: this._t(x, "profile > customURL"),
			mostPlayed: [...x.querySelectorAll("mostPlayedGames > mostPlayedGame")].map(el => ({
				name: this._t(el, "gameName"), link: this._t(el, "gameLink"), logo: this._t(el, "gameLogo"),
				icon: this._t(el, "gameIcon"), hours2Weeks: this._num(this._t(el, "hoursPlayed")),
				hours: this._num(this._t(el, "hoursOnRecord")),
				appId: (/app\/(\d+)/.exec(this._t(el, "gameLink")) || [])[1] || ""
			}))
		};
		profile.profileUrl = `${this.host}/profiles/${profile.steamId64}/`;
		if (profile.privacy !== "public") return { ok: true, profile, partial: true, code: "private_profile" };

		const htmlRes = await this._get(`${base}/?l=english`);
		if (htmlRes.ok) Object.assign(profile, this._parseProfileHtml(htmlRes.text));
		return { ok: true, profile, partial: !htmlRes.ok };
	}

	_parseProfileHtml(text) {
		const doc = this._html(text);
		if (!doc) return {};
		const out = {};
		const lvl = this._num(this._t(doc, ".friendPlayerLevelNum"));
		if (lvl !== null) out.level = lvl;
		const bg = doc.querySelector(".has_profile_background, .profile_page.has_profile_background");
		const bgMatch = /url\(\s*['"]?([^'")]+)['"]?\s*\)/.exec(bg?.getAttribute("style") || "");
		out.background = bgMatch ? bgMatch[1] : (doc.querySelector(".profile_animated_background img")?.getAttribute("src") || "");
		out.backgroundVideo = doc.querySelector(".profile_animated_background video source[type='video/webm']")?.getAttribute("src") || "";
		out.summary = this._t(doc, ".profile_summary");
		const badgesTotal = this._num(this._t(doc, ".profile_badges .profile_count_link_total"));
		if (badgesTotal !== null) out.badgeCount = badgesTotal;
		out.badges = [...doc.querySelectorAll(".profile_badges_badge")].slice(0, 6).map(b => ({
			title: b.getAttribute("data-tooltip-html")?.replace(/<[^>]+>/g, " ").trim() || "",
			icon: b.querySelector("img")?.getAttribute("src") || ""
		}));
		out.counts = {};
		for (const link of doc.querySelectorAll(".profile_item_links .profile_count_link")) {
			const label = this._t(link, ".count_link_label").toLowerCase();
			const n = this._num(this._t(link, ".profile_count_link_total"));
			if (label && n !== null) out.counts[label] = n;
		}
		const recentHeader = this._t(doc, ".recentgame_recentplaytime h2, .recentgame_recentplaytime");
		out.recentHours = this._num((/([\d.,]+)\s*hours/i.exec(recentHeader) || [])[1]);
		out.recentGames = [...doc.querySelectorAll(".recent_game")].slice(0, 6).map(el => {
			const link = el.querySelector(".game_name a")?.getAttribute("href") || "";
			const details = this._t(el, ".game_info_details");
			const achText = this._t(el, ".game_info_achievement_summary .ellipsis, .achievement_progress_bar_ctn");
			const ach = /(\d+)\s*of\s*(\d+)/i.exec(this._t(el, ".game_info_achievement_summary") || achText);
			return {
				name: this._t(el, ".game_name"), appId: (/app\/(\d+)/.exec(link) || [])[1] || "",
				capsule: el.querySelector(".game_capsule")?.getAttribute("src") || "",
				hours: this._num((/([\d.,]+)\s*hrs on record/i.exec(details) || [])[1]),
				lastPlayedText: (/last played on (.+)$/i.exec(details) || [])[1] || (/currently in-game/i.test(details) ? "Jogando agora" : ""),
				achUnlocked: ach ? Number(ach[1]) : null, achTotal: ach ? Number(ach[2]) : null
			};
		});
		out.showcases = [...doc.querySelectorAll(".profile_customization")].slice(0, 6).map(el => ({
			title: this._t(el, ".profile_customization_header"),
			images: [...el.querySelectorAll("img")].map(i => i.getAttribute("src")).filter(s => s && /^https:/.test(s) && !/avatar|emoticon/i.test(s)).slice(0, 8),
			text: this._t(el, ".showcase_notes, .profile_customization_block .showcase_content_bg").slice(0, 280),
			stats: [...el.querySelectorAll(".showcase_stat")].map(s => ({ value: this._t(s, ".value"), label: this._t(s, ".label") })).filter(s => s.value)
		})).filter(s => s.title || s.images.length);
		const fav = doc.querySelector(".favoritegame_showcase_game");
		if (fav) out.favoriteGame = { name: this._t(fav, ".showcase_item_detail_title"), image: fav.querySelector("img")?.getAttribute("src") || "" };
		return out;
	}

	// ========================================================== cache
	async _readCache(name) {
		try {
			const path = `${this.cacheDir}/${name}.json`;
			if (!(await app.vault.adapter.exists(path))) return null;
			return JSON.parse(await app.vault.adapter.read(path));
		} catch (_) { return null; }
	}

	// grava o começo das respostas da Steam em .steamvault/debug-<appId>.json
	async _writeDebug(appId, xmlRes, htmlRes, pageRes) {
		const cut = r => ({ ok: !!r?.ok, status: r?.status ?? null, code: r?.code || "", length: (r?.text || "").length, head: (r?.text || "").slice(0, 6000) });
		await this._writeCache(`debug-${appId}`, { at: new Date().toISOString(), page: cut(pageRes), xml: cut(xmlRes), html: cut(htmlRes) });
	}

	async _writeCache(name, data) {
		try {
			if (!(await app.vault.adapter.exists(this.cacheDir))) await app.vault.adapter.mkdir(this.cacheDir);
			await app.vault.adapter.write(`${this.cacheDir}/${name}.json`, JSON.stringify(data, null, 1));
		} catch (err) { console.warn("Game Library: cache não gravado", err); }
	}

	async readProfileCache() { return await this._readCache("profile"); }

	async clearCache() {
		try { if (await app.vault.adapter.exists(this.cacheDir)) await app.vault.adapter.rmdir(this.cacheDir, true); } catch (_) {}
		this._store("cooldownUntil", "0");
	}

	// ============================================ sincronizar UM jogo
	// Grava `steam:` na nota do jogo e o estado real em cada nota de
	// conquista. Falha → preserva tudo que já existia e registra o motivo.
	async syncGame(gameFile, { force = false, cfg = this.getConfig(), owned = null } = {}) {
		const fm = app.metadataCache.getFileCache(gameFile)?.frontmatter || {};
		const appId = String(fm.steamAppId || "").trim();
		const now = new Date().toISOString();
		const prev = fm.steam && typeof fm.steam === "object" ? fm.steam : {};

		const writeState = async (patch) => {
			await app.fileManager.processFrontMatter(gameFile, f => {
				const cur = f.steam && typeof f.steam === "object" ? f.steam : {};
				f.steam = { ...cur, ...patch, lastAttempt: now };
			});
		};

		if (!cfg.configured) return { ok: false, code: "not_configured" };
		if (!appId) { await writeState({ syncStatus: "no_app_id", syncError: this.message("no_app_id") }); return { ok: false, code: "no_app_id" }; }
		if (!force && prev.lastSync && (Date.now() - Date.parse(prev.lastSync)) < this.staleHours * 3600000) {
			return { ok: true, skipped: true };
		}

		const patch = {};
		// tempo/último jogado vêm da lista pública de jogos (1 requisição
		// para a biblioteca toda — reaproveitada no sync em lote)
		const ownedRes = owned || await this.fetchOwnedGames(cfg);
		if (ownedRes.ok) {
			const hit = ownedRes.games.find(x => x.appId === appId);
			if (hit) {
				patch.playtimeHours = hit.hours;
				if (hit.hours2Weeks !== null) patch.playtime2Weeks = hit.hours2Weeks;
				if (hit.lastPlayed) patch.lastPlayed = hit.lastPlayed;
				patch.owned = true;
			} else patch.owned = false;
		}

		const achRes = await this.fetchPlayerAchievements(appId, cfg);
		let written = { updated: 0, created: 0 };
		if (achRes.ok) {
			written = await this._applyAchievements(gameFile, fm, appId, achRes, cfg);
			patch.achievements = { total: achRes.total, unlocked: achRes.unlocked, via: achRes.via };
			if (patch.playtimeHours === undefined && achRes.hoursPlayed) patch.playtimeHours = achRes.hoursPlayed;
		}

		const gotSomething = achRes.ok || (ownedRes.ok && patch.owned);
		const code = achRes.ok ? "ok" : (achRes.code === "no_stats" && gotSomething ? "ok" : achRes.code);
		if (gotSomething) {
			patch.lastSync = now;
			patch.syncStatus = code;
			patch.syncError = code === "ok" ? "" : this.message(code);
			if (achRes.code === "no_stats") patch.achievements = { total: 0, unlocked: 0, via: "none" };
		} else {
			patch.syncStatus = achRes.code || ownedRes.code || "unavailable";
			patch.syncError = this.message(patch.syncStatus);
		}
		await writeState(patch);
		return { ok: gotSomething, code: patch.syncStatus, ...written };
	}

	async _applyAchievements(gameFile, gameFm, appId, res, cfg) {
		const core = customJS.SteamVaultCore;
		const notes = app.vault.getMarkdownFiles().filter(f => {
			const afm = app.metadataCache.getFileCache(f)?.frontmatter;
			if (afm?.type !== "achievement") return false;
			return afm.gamePath === gameFile.path || core.linkPath(afm.game).replace(/\.md$/, "") === gameFile.basename;
		});
		const index = { api: new Map(), icon: new Map(), name: new Map() };
		for (const f of notes) {
			const afm = app.metadataCache.getFileCache(f).frontmatter;
			if (afm.steamApiName) index.api.set(String(afm.steamApiName).toLowerCase(), f);
			const h = this._iconHash(afm.steamIconUrl);
			if (h) index.icon.set(h, f);
			index.name.set(core.normalizeKey(afm.name || f.basename), f);
		}

		let rarity = null;
		const needsRarity = notes.length < res.list.length || notes.some(f => {
			const v = app.metadataCache.getFileCache(f).frontmatter.steamGlobalPercent;
			return v === undefined || v === null || v === "";
		});
		if (res.rarity && res.rarity.byHash.size + res.rarity.byName.size) rarity = res.rarity;
		else if (needsRarity) { const r = await this.fetchGlobalRarity(appId); if (r.ok) rarity = r; }

		let updated = 0, created = 0;
		const used = new Set();
		for (const a of res.list) {
			const f = (a.apiName && index.api.get(a.apiName.toLowerCase())) || (a.iconHash && index.icon.get(a.iconHash)) || index.name.get(core.normalizeKey(a.name));
			const pct = rarity ? (rarity.byHash.get(a.iconHash) ?? rarity.byName.get(String(a.name).toLowerCase()) ?? null) : null;
			if (f && !used.has(f.path)) {
				used.add(f.path);
				const afm = app.metadataCache.getFileCache(f).frontmatter;
				const changed = !!afm.unlocked !== a.unlocked || String(afm.unlockedDate || "") !== a.unlockedDate
					|| (a.apiName && afm.steamApiName !== a.apiName) || (pct !== null && Number(afm.steamGlobalPercent) !== pct)
					|| afm.unlockSource !== "steam" || Number(afm.steamOrder) !== a.order;
				if (!changed) continue;
				await app.fileManager.processFrontMatter(f, x => {
					x.unlocked = a.unlocked;
					x.unlockedDate = a.unlockedDate;
					x.unlockedTime = a.unlockedTime;
					x.unlockSource = "steam";
					x.steamOrder = a.order;
					if (a.apiName) x.steamApiName = a.apiName;
					if (!x.steamIconUrl && a.iconUrl) x.steamIconUrl = a.iconUrl;
					if (!x.steamAppId) x.steamAppId = appId;
					if (pct !== null) x.steamGlobalPercent = pct;
				});
				updated++;
			} else if (!f) {
				// conquista que existe na Steam e não existia no vault
				const folderName = customJS.SteamVaultCore.safeFileName(gameFm.title || gameFile.basename, "Jogo");
				const folder = `${core.folders.achievements}/${folderName}`;
				if (!app.vault.getAbstractFileByPath(folder)) await app.vault.createFolder(folder).catch(() => {});
				const base = customJS.SteamVaultCore.safeFileName(a.name || a.apiName, "Conquista");
				let path = `${folder}/${base}.md`, n = 2;
				while (app.vault.getAbstractFileByPath(path)) path = `${folder}/${base} ${n++}.md`;
				await app.vault.create(path, core.buildAchievementNote({
					name: a.name, description: a.description, icon: a.iconUrl, steamIconUrl: a.iconUrl,
					unlocked: a.unlocked, unlockedDate: a.unlockedDate, unlockedTime: a.unlockedTime,
					gameLink: `[[${gameFile.basename}]]`, gamePath: gameFile.path, steamAppId: appId,
					steamApiName: a.apiName, steamGlobalPercent: pct ?? "", steamOrder: a.order, unlockSource: "steam"
				}));
				created++;
			}
		}
		// contadores legados passam a refletir o dado real (fonte única)
		// (só grava se mudou: cada gravação redesenha as telas abertas)
		const gfm = app.metadataCache.getFileCache(gameFile)?.frontmatter || {};
		if (Number(gfm.achievementsTotal) !== res.total || Number(gfm.achievementsEarned) !== res.unlocked) {
			await app.fileManager.processFrontMatter(gameFile, x => {
				x.achievementsTotal = res.total;
				x.achievementsEarned = res.unlocked;
			});
		}
		return { updated, created };
	}

	// ================================================ sincronizar tudo
	// incremental: só jogos Steam com cache vencido; uma lista de jogos
	// do perfil para o lote inteiro; para no primeiro bloqueio
	async syncAll({ force = false, onProgress = () => {} } = {}) {
		if (window.__svSyncRunning) return { ok: false, code: "busy" };
		window.__svSyncRunning = true;
		const summary = { synced: 0, skipped: 0, failed: 0, created: 0, codes: {} };
		try {
			const cfg = this.getConfig();
			if (!cfg.configured) return { ok: false, code: "not_configured" };
			const profileRes = await this.fetchProfile(cfg);
			if (profileRes.ok) {
				await this._writeCache("profile", { fetchedAt: new Date().toISOString(), ...profileRes.profile });
				await this._saveConfig({
					name: profileRes.profile.name, avatar: profileRes.profile.avatar, privacy: profileRes.profile.privacy,
					level: profileRes.profile.level ?? null, lastSync: new Date().toISOString(),
					syncStatus: profileRes.code || "ok"
				});
				if (profileRes.code === "private_profile") return { ok: false, code: "private_profile" };
			} else {
				await this._saveConfig({ syncStatus: profileRes.code });
				return profileRes;
			}

			const owned = await this.fetchOwnedGames(cfg);
			if (owned.ok) await this._writeCache("games", { fetchedAt: new Date().toISOString(), games: owned.games });
			else if (owned.code === "rate_limited") return owned;

			const files = app.vault.getMarkdownFiles().filter(f => {
				const fm = app.metadataCache.getFileCache(f)?.frontmatter;
				if (fm?.type !== "game") return false;
				// só origem Steam em modo Automática (Manual = o usuário registra)
				const C = customJS.SteamVaultCore, provider = C.achievementProvider(fm);
				return provider === "steam" && C.achievementSync(fm, provider) === "automatic" && String(fm.steamAppId || "").trim();
			});
			let i = 0;
			for (const f of files) {
				i++;
				onProgress({ index: i, total: files.length, name: f.basename });
				const r = await this.syncGame(f, { force, cfg, owned });
				if (r.skipped) summary.skipped++;
				else if (r.ok) { summary.synced++; summary.created += r.created || 0; }
				else summary.failed++;
				summary.codes[r.code || "ok"] = (summary.codes[r.code || "ok"] || 0) + 1;
				if (r.code === "rate_limited") break;
			}
			customJS.SteamVaultCore.invalidate();
			return { ok: true, ...summary };
		} finally {
			window.__svSyncRunning = false;
		}
	}

	// sync automático opcional: no máximo uma vez por sessão do Obsidian e
	// só quando o último sync do perfil estiver vencido
	// ============================================ artes da loja (CDN pública)
	// Capa (600×900), fundo (library hero 1920×620) e logotipo que a própria
	// loja Steam publica para cada AppID. Só imagens da CDN da Steam; nada
	// de API ou login. No celular, a imagem é convertida para WebP antes de
	// ser gravada (arquivos até 10× menores); se o aparelho não souber gerar
	// WebP, fica o JPG/PNG original.
	artSources(appId) {
		const id = encodeURIComponent(String(appId).trim());
		const bases = [`https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${id}`, `https://cdn.akamai.steamstatic.com/steam/apps/${id}`];
		const both = f => bases.map(b => `${b}/${f}`);
		return {
			cover: { urls: [...both("library_600x900_2x.jpg"), ...both("library_600x900.jpg")], maxW: 600, folder: "Assets/Covers", suffix: "" },
			hero: { urls: both("library_hero.jpg"), maxW: 1920, folder: "Assets/Backgrounds", suffix: "-fundo" },
			logo: { urls: both("logo.png"), maxW: 640, folder: "Assets/Logos", suffix: "-logo", alpha: true }
		};
	}

	async _download(url) {
		if (!/^https:\/\/(shared|cdn)\.akamai\.steamstatic\.com\//.test(url)) throw new Error("host");
		const request = this._requestFn();
		if (!request) throw new Error("sem requestUrl");
		const res = await Promise.race([
			request({ url, method: "GET", throw: false }),
			new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), this.timeoutMs))
		]);
		const type = String(res?.headers?.["content-type"] || res?.headers?.["Content-Type"] || "");
		if (!res || res.status !== 200 || !res.arrayBuffer || res.arrayBuffer.byteLength < 2000 || (type && !/^image\//i.test(type))) return null;
		return { buf: res.arrayBuffer, ext: /png/i.test(type) || /\.png$/i.test(url) ? "png" : "jpg" };
	}

	// redimensiona (nunca amplia) e tenta gravar como WebP
	async _compress(file, { maxW, alpha = false }) {
		try {
			if (typeof createImageBitmap !== "function") return file;
			const bmp = await createImageBitmap(new Blob([file.buf]));
			const scale = Math.min(1, maxW / bmp.width);
			const c = document.createElement("canvas");
			c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
			const g = c.getContext("2d");
			if (!alpha) { g.fillStyle = "#000"; g.fillRect(0, 0, c.width, c.height); }
			g.drawImage(bmp, 0, 0, c.width, c.height);
			bmp.close?.();
			const blob = await new Promise(r => c.toBlob(r, "image/webp", 0.86));
			if (!blob || blob.type !== "image/webp") return file;
			let best = { buf: await blob.arrayBuffer(), ext: "webp" };
			// 1.0.1: reduzida, uma imagem de cores chapadas (arte, captura de tela)
			// pode ficar maior em WebP do que era no original. Nesse caso tenta,
			// no mesmo tamanho reduzido, PNG (com transparência) ou JPEG, e fica
			// com o menor: nunca grava um arquivo maior que o necessário.
			if (scale < 1 && best.buf.byteLength >= file.buf.byteLength) {
				const type = alpha ? "image/png" : "image/jpeg";
				const alt = await new Promise(r => c.toBlob(r, type, 0.9));
				if (alt && alt.type === type && alt.size < best.buf.byteLength) best = { buf: await alt.arrayBuffer(), ext: alpha ? "png" : "jpg" };
			}
			return best.buf.byteLength < file.buf.byteLength || scale < 1 ? best : file;
		} catch (_) { return file; }
	}

	async _saveBinary(path, buf) {
		const folder = path.split("/").slice(0, -1).join("/");
		if (folder && !app.vault.getAbstractFileByPath(folder)) await app.vault.createFolder(folder).catch(() => {});
		const existing = app.vault.getAbstractFileByPath(path);
		if (existing) await app.vault.modifyBinary(existing, buf);
		else await app.vault.createBinary(path, buf);
		return path;
	}

	// baixa só o que falta na ficha (force: substitui). Devolve quantas salvou.
	// appId (3.48.0): busca a arte de um AppID achado pelo nome, sem gravá-lo
	// na ficha (ex.: jogo de PS2 que também saiu na Steam continua sem sync)
	async fetchArt(gameFile, { force = false, only = null, save = true, appId: forced = "" } = {}) {
		const fm = app.metadataCache.getFileCache(gameFile)?.frontmatter || {};
		const appId = String(forced || fm.steamAppId || "").trim();
		if (!/^\d+$/.test(appId)) return { ok: false, code: "no_app_id", saved: 0 };
		const C = customJS.SteamVaultCore;
		const has = field => !!C.resolveImage(fm[field]);
		const want = {
			cover: force || !has("cover"),
			hero: force || !has("background") || !has("featured"),
			logo: force || !has("logo")
		};
		const base = customJS.SteamVaultCore.safeFileName(fm.title || gameFile.basename, "Jogo");
		const saved = {};
		for (const [kind, src] of Object.entries(this.artSources(appId))) {
			if (!want[kind] || (only && !only.includes(kind))) continue;
			let file = null;
			for (const url of src.urls) { try { file = await this._download(url); } catch (_) { file = null; } if (file) break; }
			if (!file) continue;
			file = await this._compress(file, src);
			saved[kind] = await this._saveBinary(`${src.folder}/${base}${src.suffix}.${file.ext}`, file.buf);
		}
		if (!Object.keys(saved).length) return { ok: false, code: "unavailable", saved: 0 };
		// save: false → o formulário decide (ex.: editor "Capa e fundo")
		if (!save) return { ok: true, saved: Object.keys(saved).length, kinds: Object.keys(saved), paths: saved };
		await app.fileManager.processFrontMatter(gameFile, x => {
			if (saved.cover) x.cover = saved.cover;
			if (saved.hero) { if (force || !has("background")) x.background = saved.hero; if (force || !has("featured")) x.featured = saved.hero; }
			if (saved.logo) x.logo = saved.logo;
		});
		C.invalidate();
		return { ok: true, saved: Object.keys(saved).length, kinds: Object.keys(saved) };
	}

	// ============================================ jogos do perfil → fichas
	// Cria a ficha de jogos que estão no perfil público e ainda não existem
	// no vault, já com AppID, sincroniza as conquistas e baixa as artes.
	async importOwned(list, onProgress = () => {}) {
		const C = customJS.SteamVaultCore;
		const cfg = this.getConfig();
		// a lista do perfil já está em cache (foi ela que montou "fora do vault")
		const cached = await this._readCache("games");
		const owned = cached?.games?.length ? { ok: true, games: cached.games } : await this.fetchOwnedGames(cfg).catch(() => ({ ok: false }));
		let done = 0, failed = 0;
		for (let i = 0; i < list.length; i++) {
			const it = list[i];
			onProgress({ index: i + 1, total: list.length, name: it.name });
			try {
				const file = await C.createGameNote({
					title: it.name, platform: "PC", achievementProvider: "steam", achievementSync: "automatic", steamAppId: String(it.appId),
					status: it.hours > 0 ? "Paused" : "Backlog", lastPlayed: it.lastPlayed || ""
				});
				await this._waitMeta(file, "steamAppId");
				await this.syncGame(file, { force: true, cfg, owned: owned?.ok ? owned : null });
				await this.fetchArt(file).catch(() => {});
				done++;
			} catch (err) { failed++; console.warn("Game Library: importar", it.name, err); }
		}
		C.invalidate();
		return { done, failed };
	}

	// o Obsidian indexa o frontmatter de uma nota nova um instante depois
	async _waitMeta(file, key, ms = 3000) {
		const t0 = Date.now();
		while (Date.now() - t0 < ms) {
			if (app.metadataCache.getFileCache(file)?.frontmatter?.[key] !== undefined) return true;
			await this._sleep(120);
		}
		return false;
	}

	maybeAutoSync() {
		const cfg = this.getConfig();
		if (!cfg.configured || !cfg.autoSync || window.__svAutoSyncDone) return;
		window.__svAutoSyncDone = true;
		const age = cfg.lastSync ? Date.now() - Date.parse(cfg.lastSync) : Infinity;
		if (age < this.staleHours * 3600000) return;
		setTimeout(() => this.syncAll().then(r => {
			if (r?.ok && typeof Notice === "function") new Notice(customJS.SteamVaultI18n?.t(`Game Library: ${customJS.SteamVaultUI.plural(r.synced, "jogo sincronizado", "jogos sincronizados")} com a Steam Community`) ?? `Game Library: ${customJS.SteamVaultUI.plural(r.synced, "jogo sincronizado", "jogos sincronizados")} com a Steam Community`);
		}).catch(err => console.warn("Game Library: auto-sync falhou", err)), 4000);
	}
}
