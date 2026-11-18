// ==========================================================================
// Game Library — Integrações de Plataformas
//
// Estrutura genérica para conectar perfis de outras plataformas, no mesmo
// espírito da Steam e do RetroAchievements (que continuam nos módulos deles,
// intocados). Cada plataforma é um ADAPTADOR com:
//   · o que pede para conectar (usuário, chave…) e o que sincroniza
//   · leitura do perfil, dos jogos e das conquistas
//   · como gravar o resultado nas fichas do vault
// A infraestrutura (config, chave só no aparelho, fila de rede, limite de
// uso, cache, vínculo por título, importação, sync automático) é comum.
//
// Plataformas
//   · Xbox — perfil MANUAL: nenhum token, conta, chave ou serviço externo.
//     As conquistas são cadastradas no gerenciador (SteamVaultAchManager).
//   · GOG — perfil público (gog.com/u/<usuário>), sem login. Exige o perfil
//     público nas configurações de privacidade da GOG.
//   · Epic Games, PlayStation, Google Play Games, Xbox — sem forma legítima e
//     segura hoje (explicado em unavailable()). A Game Library não usa login,
//     cookies ou tokens de sessão.
//
// Acesso: customJS.SteamVaultPlatforms
// ==========================================================================

class SteamVaultPlatforms {

	constructor() {
		this.STALE_HOURS = 12;
		this.GAP_MS = 700;
		this.COOLDOWN_MIN = 15;
		this._queue = Promise.resolve();
		this._last = 0;
	}

	get C() { return customJS.SteamVaultCore; }
	get U() { return customJS.SteamVaultUI; }
	get V() { return customJS.SteamVault; }

	// =================================================== registro
	// Nova plataforma = uma entrada aqui (+ a origem em Core.providerDefs).
	platforms() {
		if (this._reg) return this._reg;
		this._reg = {
			xbox: {
				id: "xbox", kind: "manual", provider: "xbox", label: "Xbox", page: "Dashboard/Xbox.md", route: "xbox-profile", fmKey: "xboxProfile",
				idField: "", platformName: "Xbox Series", platforms: ["Xbox Series", "Xbox One", "Xbox 360", "Xbox", "PC"], hosts: [], linkHosts: ["xbox.com"],
				idLabel: "Gamertag (opcional)", idPlaceholder: "sua gamertag", idPattern: /^[\p{L}\p{N} _#\-]{1,24}$/u,
				profileUrl: v => `https://www.xbox.com/play/user/${encodeURIComponent(v)}`,
				why: [
					"Tudo é cadastrado por você, sem conta, internet ou serviço externo: o Vault não guarda login, token nem chave do Xbox.",
					"As conquistas de cada jogo são cadastradas no gerenciador da ficha: uma a uma, várias de uma vez por lista de texto ou planilha (CSV ou Excel), e os ícones em lote, a partir de imagens do aparelho.",
					"O desbloqueio é marcado por você na ficha do jogo."
				],
				syncs: ["Sua gamertag (informada por você, não verificada)", "Jogos de Xbox cadastrados à mão, com todos os campos da ficha", "Conquistas com ícone, descrição, Gamerscore (G), categoria e DLC, cadastradas por você (uma a uma ou em lote)", "Desbloqueio, G conquistado e % de conclusão controlados por você", "Importação de uma lista de títulos colada por você"],
				notSynced: ["Leitura automática da sua conta, jogos ou tempo de jogo"],
				privacy: "Nenhum login, token ou chave e nenhuma consulta na internet: tudo fica no vault."
			},
			gog: {
				id: "gog", provider: "gog", label: "GOG", page: "Dashboard/GOG.md", route: "gog-profile", fmKey: "gogProfile",
				idField: "gogId", cacheKey: "gog", platformName: "PC", linkHosts: ["gog.com"], idPattern: /^\d{1,15}$/, hosts: ["www.gog.com", "gog.com", "images.gog.com", "images-1.gog.com", "images-2.gog.com", "images-3.gog.com", "images-4.gog.com"],
				connect: {
					fields: [{ k: "user", label: "Usuário GOG ou link do perfil", placeholder: "gog.com/u/seu-usuario", pattern: /^[A-Za-z0-9_.-]{2,40}$/ }],
					how: "Na GOG, em Configurações da conta › Privacidade, deixe o perfil como público. Depois informe o seu nome de usuário.",
					link: "https://www.gog.com/account/settings/privacy"
				},
				syncs: ["Nome e avatar do perfil", "Jogos do perfil", "Tempo de jogo", "Porcentagem de conquistas por jogo", "Última sessão"],
				notSynced: ["A lista individual de conquistas (o perfil público só mostra a porcentagem)", "Compras, carteira e dados da conta"],
				privacy: "Só páginas públicas do seu perfil, sem login, cookie ou chave.",
				limits: "Consultas espaçadas; um perfil privado aparece como \"perfil privado\" e nada é apagado."
			},
			// ---- plataformas SEM forma legítima de leitura automática: perfil
			// e importação dentro do vault, sem rede, sem credencial nenhuma
			epic: {
				id: "epic", kind: "manual", provider: "epic", label: "Epic Games", page: "Dashboard/Epic Games.md", route: "epic-profile", fmKey: "epicProfile",
				idField: "", platformName: "PC", platforms: ["PC"], hosts: [], linkHosts: ["epicgames.com"],
				idLabel: "Nome de exibição na Epic (opcional)", idPlaceholder: "como aparece na sua conta Epic", idPattern: /^[\p{L}\p{N} _.\-]{3,32}$/u,
				why: [
					"A Epic não tem API pública para jogos, conquistas ou tempo de jogo do jogador.",
					"O \"Entrar com Epic\" oficial (Epic Account Services) é feito para jogos e sites parceiros: devolve só nome e ID da conta e, para conquistas, só as do próprio produto do desenvolvedor — nunca a sua biblioteca.",
					"As ferramentas que leem a biblioteca usam o login do launcher com credenciais internas da Epic (engenharia reversa) e guardam sessões da sua conta — inseguro e fora das regras da Epic."
				],
				syncs: ["Seu nome de exibição (informado por você, não verificado)", "Jogos, conquistas e progresso que você registra na Game Library", "Importação de uma lista de títulos colada por você"],
				notSynced: ["Leitura automática da biblioteca, conquistas ou tempo de jogo"],
				privacy: "Nenhum login, token ou chave: nada sai do vault."
			},
			playstation: {
				id: "playstation", kind: "manual", provider: "playstation", label: "PlayStation", page: "Dashboard/PlayStation.md", route: "psn-profile", fmKey: "psnProfile",
				idField: "", platformName: "PS5", platforms: ["PS5", "PS4", "PS3", "PS Vita", "PSP"], hosts: [], linkHosts: ["playstation.com"],
				idLabel: "ID online da PSN (opcional)", idPlaceholder: "seu ID online", idPattern: /^[A-Za-z][A-Za-z0-9_-]{2,15}$/,
				profileUrl: v => `https://my.playstation.com/profile/${encodeURIComponent(v)}`,
				why: [
					"A Sony não oferece API pública de troféus, jogos ou perfil para apps de terceiros (o acesso oficial é só para parceiros).",
					"O perfil na web (my.playstation.com) exige estar logado; não há página pública legível sem login.",
					"As ferramentas que existem pedem o NPSSO — o cookie de sessão da sua conta, que dá acesso a ela inteira — e usam credenciais internas do app da PlayStation (engenharia reversa). A Game Library não pede nem guarda isso."
				],
				syncs: ["Seu ID online (informado por você, não verificado)", "Jogos e troféus que você registra na Game Library, com os graus Platina/Ouro/Prata/Bronze", "Importação de uma lista de títulos colada por você"],
				notSynced: ["Leitura automática de troféus, jogos ou tempo de jogo"],
				privacy: "Nenhum login, token ou cookie: nada sai do vault."
			},
			nintendo: {
				id: "nintendo", kind: "manual", provider: "nintendo", label: "Nintendo", page: "Dashboard/Nintendo.md", route: "nintendo-profile", fmKey: "nintendoProfile",
				idField: "", platformName: "Switch", platforms: ["Switch", "Switch 2", "3DS", "NDS", "Wii U", "Wii", "GameCube", "N64", "SNES", "NES", "GBA", "Game Boy"], hosts: [], linkHosts: ["nintendo.com"],
				idLabel: "Apelido ou código de amigo (opcional)", idPlaceholder: "ex.: SW-1234-5678-9012", idPattern: /^(SW-\d{4}-\d{4}-\d{4}|[\p{L}\p{N} _.\-]{3,32})$/u,
				// o perfil reúne os jogos de qualquer console da Nintendo, não só os com origem Nintendo
				family: true,
				why: [
					"O Switch não tem sistema de conquistas: não existe uma lista oficial para sincronizar.",
					"A Nintendo não oferece API pública de perfil, biblioteca ou tempo de jogo. O tempo aparece só no console e no app de controle parental.",
					"As ferramentas que leem a conta usam o login interno do app Nintendo Switch Online (engenharia reversa) e guardam a sessão da conta. A Game Library não pede nem guarda isso."
				],
				syncs: ["Seu apelido ou código de amigo (informado por você, não verificado)", "Jogos de todos os consoles Nintendo do vault (Switch, 3DS, GameCube, SNES…)", "Objetivos e desafios que você registra como conquistas", "Importação de uma lista de títulos colada por você"],
				notSynced: ["Leitura automática de jogos ou tempo de jogo", "Conquistas (o Switch não tem)"],
				privacy: "Nenhum login, token ou cookie: nada sai do vault."
			},
			googleplay: {
				id: "googleplay", kind: "manual", provider: "googleplay", label: "Google Play Games", page: "Dashboard/Google Play Games.md", route: "googleplay-profile", fmKey: "gplayProfile",
				idField: "", platformName: "Android", platforms: ["Android", "PC"], hosts: [], linkHosts: ["play.google.com"],
				idLabel: "Nome de jogador no Play Games (opcional)", idPlaceholder: "como aparece no app Play Games", idPattern: /^[\p{L}\p{N} _.\-]{3,32}$/u,
				why: [
					"O Google Play Games Services só deixa cada jogo ler as conquistas dele mesmo, dentro do próprio app. Não há API para outro app listar a sua biblioteca ou as suas conquistas.",
					"O perfil do Play Games não tem página pública na web.",
					"Ler esses dados de fora exigiria o login da sua conta Google em um app que não é o jogo: inseguro e fora das regras do Google."
				],
				syncs: ["Seu nome de jogador (informado por você, não verificado)", "Jogos, conquistas e XP que você registra na Game Library", "Importação de uma lista de títulos colada por você"],
				notSynced: ["Leitura automática de conquistas, XP ou biblioteca"],
				privacy: "Nenhum login, token ou chave: nada sai do vault."
			}
		};
		return this._reg;
	}

	isManual(id) { return this.get(id)?.kind === "manual"; }

	unavailable() {
		// Google Play Games e Nintendo ganharam perfis manuais (3.19.0)
		return [];
	}

	get(id) { return this.platforms()[id] || null; }

	// jogos de um perfil manual: os com a origem da plataforma e, na
	// Nintendo, também os de qualquer console dela (o Switch não tem conquistas)
	gamesFor(id, model) {
		const p = this.get(id);
		if (!p) return [];
		const B = customJS.SteamVaultBrowse;
		const fam = p.family ? g => (B?.platformDefaults?.(g.platform)?.maker || "") === p.label : () => false;
		return model.games.filter(g => g.provider === p.provider || fam(g));
	}

	// =================================================== chave (só no aparelho)
	_ls(get, key, val) {
		try {
			if (typeof app?.loadLocalStorage !== "function") return get ? "" : false;
			if (get) return String(app.loadLocalStorage(key) || "").trim();
			app.saveLocalStorage(key, val);
			return true;
		} catch (_) { return get ? "" : false; }
	}
	_secret(p) { return p.secretKey ? this._ls(true, p.secretKey) : ""; }
	_masked(v) { return v ? `${"•".repeat(Math.max(0, Math.min(12, v.length - 4)))}${v.slice(-4)}` : ""; }

	// =================================================== config (frontmatter da página)
	_pageFile(p) { return app.vault.getAbstractFileByPath(p.page); }

	getConfig(id) {
		const p = this.get(id);
		if (!p) return null;
		const f = this._pageFile(p);
		const fm = f ? app.metadataCache.getFileCache(f)?.frontmatter : null;
		const c = (fm?.[p.fmKey] && typeof fm[p.fmKey] === "object") ? fm[p.fmKey] : {};
		const account = String(c.account || "").trim();
		const secret = this._secret(p);
		const needsSecret = !!p.secretKey;
		return {
			id, label: p.label, account, name: String(c.name || account), avatar: String(c.avatar || ""), profileUrl: String(c.profileUrl || ""),
			stats: (c.stats && typeof c.stats === "object") ? c.stats : {},
			enabled: c.enabled !== false, autoSync: c.autoSync === true,
			lastSync: String(c.lastSync || ""), syncStatus: String(c.syncStatus || ""), syncError: String(c.syncError || ""),
			base: String(c.base || ""),
			hasSecret: !!secret, masked: this._masked(secret),
			configured: p.kind === "manual" ? (!!account || c.setup === true) : !!account && (!needsSecret || !!secret)
		};
	}

	async saveConfig(id, patch) {
		const p = this.get(id);
		let f = this._pageFile(p);
		if (!f) {
			if (!app.vault.getAbstractFileByPath("Dashboard")) await app.vault.createFolder("Dashboard").catch(() => {});
			f = await app.vault.create(p.page, ["---", "cssclasses:", '  - "steamvault"', `  - "sv-${id}"`, `${p.fmKey}: {}`, "---", "", this.C.noteBody(p.route)].join("\n"));
		}
		await app.fileManager.processFrontMatter(f, fm => {
			const cur = (fm[p.fmKey] && typeof fm[p.fmKey] === "object") ? fm[p.fmKey] : {};
			fm[p.fmKey] = { ...cur, ...patch };
		});
		this.C.invalidate();
	}

	// =================================================== cache (.steamvault/<id>.json)
	_cachePath(id) { return `.steamvault/${id}.json`; }
	async readCache(id) {
		try {
			const a = app.vault.adapter;
			if (!(await a.exists(this._cachePath(id)))) return null;
			return JSON.parse(await a.read(this._cachePath(id)));
		} catch (_) { return null; }
	}
	async _writeCache(id, patch) {
		const a = app.vault.adapter;
		const next = { ...((await this.readCache(id)) || {}), ...patch, updatedAt: new Date().toISOString() };
		try {
			if (!(await a.exists(".steamvault"))) await a.mkdir(".steamvault");
			await a.write(this._cachePath(id), JSON.stringify(next));
		} catch (err) { console.warn(`Game Library: cache de ${id}`, err?.message); }
		return next;
	}
	async clearCache(id) { try { if (await app.vault.adapter.exists(this._cachePath(id))) await app.vault.adapter.remove(this._cachePath(id)); } catch (_) {} }

	// =================================================== rede
	_cooldownUntil(id) { return Number(this._ls(true, `steamvault:${id}:cooldownUntil`)) || 0; }

	async _enqueue(fn) {
		const run = async () => {
			const wait = Math.max(0, this._last + this.GAP_MS - Date.now());
			if (wait) await new Promise(r => setTimeout(r, wait));
			try { return await fn(); } finally { this._last = Date.now(); }
		};
		const pr = this._queue.then(run, run);
		this._queue = pr.catch(() => {});
		return pr;
	}

	// Toda chamada passa por aqui: só hosts da própria plataforma; a chave
	// entra só no cabeçalho e nunca vai para console/erros.
	_get(id, url, opts = {}) { return this._req(id, url, opts); }

	async _req(id, url, { method = "GET", headers = {}, body = undefined, contentType = undefined, json = true, keepError = false } = {}) {
		const p = this.get(id);
		const host = new URL(url).hostname.toLowerCase();
		if (!p.hosts.includes(host)) return { ok: false, code: "internal" };
		if (Date.now() < this._cooldownUntil(id)) return { ok: false, code: "rate_limited" };
		const request = (typeof requestUrl === "function" && requestUrl) || globalThis.customJS?.obsidian?.requestUrl;
		if (typeof request !== "function") return { ok: false, code: "network" };
		const parse = res => { try { return typeof res.json === "object" && res.json !== null ? res.json : JSON.parse(String(res.text ?? "")); } catch (_) { return null; } };
		for (let attempt = 0; attempt < 3; attempt++) {
			let res;
			try {
				res = await this._enqueue(() => Promise.race([
					request({ url, method, headers: { Accept: json ? "application/json" : "text/html", ...headers }, ...(body !== undefined ? { body, contentType } : {}), throw: false }),
					new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 20000))
				]));
			} catch (_) {
				if (attempt < 2) { await new Promise(r => setTimeout(r, 1200 * 2 ** attempt)); continue; }
				return { ok: false, code: "network" };
			}
			const st = res?.status || 0;
			// resposta absurda (mais de 8 MB) não é processada
			if (String(res?.text ?? "").length > 8e6) return { ok: false, code: "format" };
			if (st === 429) { this._ls(false, `steamvault:${id}:cooldownUntil`, String(Date.now() + this.COOLDOWN_MIN * 60000)); return { ok: false, code: "rate_limited" }; }
			if (keepError && st >= 400 && st < 500) return { ok: false, code: "http", status: st, data: parse(res) };
			if (st === 401) return { ok: false, code: "bad_key", status: st };
			if (st === 403) return { ok: false, code: id === "gog" ? "private_profile" : "bad_key", status: st };
			if (st === 404) return { ok: false, code: "not_found" };
			if (st >= 500 && attempt < 2) { await new Promise(r => setTimeout(r, 1500 * 2 ** attempt)); continue; }
			if (st >= 400 || !st) return { ok: false, code: "http", status: st };
			if (!json) return { ok: true, text: String(res.text ?? "") };
			const data = parse(res);
			if (data === null) return { ok: false, code: "format" };
			return { ok: true, data };
		}
		return { ok: false, code: "network" };
	}

	message(id, code) {
		const L = this.get(id)?.label || "a plataforma";
		return ({
			ok: "sincronizado", no_key: `Informe a chave da ${L}`, no_user: `Informe o usuário da ${L}`,
			bad_key: `Acesso negado pela ${L}`,
			private_profile: `Perfil da ${L} privado — deixe-o público nas configurações de privacidade`,
			not_found: `Perfil não encontrado na ${L}`, rate_limited: `A ${L} limitou as consultas — o sync volta em alguns minutos`,
			network: `Sem conexão com a ${L}`, format: `Resposta inesperada da ${L} (formato mudou?)`, http: `A ${L} respondeu com erro`,
			disabled: "Integração desativada", internal: "Erro interno", manual: `${L} não tem sincronização automática legítima — use o registro e a importação da Game Library`, cancelled: "Cancelado"
		})[code] || `Falha na ${L}`;
	}

	// =================================================== utilidades
	_s(v) { return v === undefined || v === null ? "" : String(v).trim(); }
	_n(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }
	_date(v) {
		const s = this._s(v);
		if (!s) return { date: "", time: "" };
		// Aceita ISO ou epoch (s/ms); qualquer outra coisa é descartada em vez de gravada crua.
		const d = /^\d{9,13}$/.test(s) ? new Date(Number(s) * (s.length <= 10 ? 1000 : 1)) : new Date(s);
		if (isNaN(d) || d.getFullYear() < 1990 || d.getFullYear() > 2100) return { date: "", time: "" };
		const pad = n => String(n).padStart(2, "0");
		return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
	}
	_img(u) { const s = this._s(u); return this.C.safeUrl(s.startsWith("//") ? `https:${s}` : s, { protocols: ["https:"] }); }
	_int(v, min = 0, max = 1e9) { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : null; }
	_clip(v, max) { return this.C.clip(this._s(v), max); }

	// ====================================================== GOG (perfil público)
	_gogUser(raw) { return this._s(raw).replace(/^https?:\/\/(www\.)?gog\.com\/(\w{2}\/)?u\//i, "").replace(/[/?#].*$/, ""); }

	async _gogProfile(user) {
		const r = await this._get("gog", `https://www.gog.com/u/${encodeURIComponent(user)}`, { json: false });
		if (!r.ok) return r;
		const html = r.text;
		const meta = k => (new RegExp(`<meta[^>]+property=["']${k}["'][^>]+content=["']([^"']+)`, "i").exec(html) || [])[1] || "";
		return { ok: true, profile: { account: user, name: user, avatar: this._img(meta("og:image")), profileUrl: `https://www.gog.com/u/${encodeURIComponent(user)}` } };
	}

	_gogItems(d) {
		const items = d?._embedded?.items || d?.items || [];
		return items.map(it => {
			const g = it.game || it;
			let st = it.stats || {};
			// as estatísticas vêm por usuário ({ "<id>": {...} }) ou direto
			if (st && typeof st === "object" && !("playtime" in st) && !("achievements" in st)) st = Object.values(st)[0] || {};
			const pct = typeof st.achievements === "object" ? this._n(st.achievements?.percentage ?? st.achievements?.completion) : this._n(st.achievements);
			// link só dentro da gog.com (caminho relativo, nunca "//outro-host")
			const path = this._s(g.url);
			const url = /^\/(?!\/)[\w\-./%]*$/.test(path) ? this.C.safeUrl(`https://www.gog.com${path}`, { hosts: ["gog.com"] }) : "";
			const minutes = this._int(st.playtime, 0, 1e7);
			return {
				id: this._s(g.id), title: this._clip(g.title, 200), image: this._img(g.image ? `${g.image}${/\.\w+$/.test(g.image) ? "" : "_392.jpg"}` : ""),
				url, achievementSupport: g.achievementSupport !== false,
				playtimeHours: minutes !== null ? Math.round((minutes / 60) * 10) / 10 : null,
				achPct: g.achievementSupport === false ? null : (pct === null ? null : Math.min(100, Math.max(0, pct))),
				lastPlayed: this._date(st.lastSession).date
			};
		}).filter(x => /^\d{1,15}$/.test(x.id) && x.title).slice(0, 5000);
	}

	async _gogGames(user) {
		const all = [];
		for (let page = 1; page <= 20; page++) {
			const r = await this._get("gog", `https://www.gog.com/u/${encodeURIComponent(user)}/games/stats?sort=recent_playtime&order=desc&page=${page}`);
			if (!r.ok) return page === 1 ? r : { ok: true, games: all, partial: true };
			const items = this._gogItems(r.data);
			if (page === 1 && !items.length && !(r.data && (r.data._embedded || r.data.items))) return { ok: false, code: "format" };
			all.push(...items);
			const pages = this._n(r.data?.pages) || 1;
			if (page >= pages || !items.length) break;
		}
		return { ok: true, games: all };
	}

	// =================================================== conectar / desconectar
	async connect(id, values) {
		const p = this.get(id);
		if (id === "gog") {
			const user = this._gogUser(values.user);
			if (!p.connect.fields[0].pattern.test(user)) return { ok: false, code: "no_user" };
			const pr = await this._gogProfile(user);
			if (!pr.ok && pr.code !== "format") return pr;
			const games = await this._gogGames(user);
			if (!games.ok) return games;
			const prof = pr.ok ? pr.profile : { account: user, name: user, avatar: "", profileUrl: `https://www.gog.com/u/${user}` };
			await this.saveConfig(id, { account: prof.account, name: prof.name, avatar: prof.avatar, profileUrl: prof.profileUrl, enabled: true, syncStatus: "", syncError: "" });
			await this._writeCache(id, { profile: prof, games: games.games });
			return { ok: true, profile: prof };
		}
		return { ok: false, code: "internal" };
	}

	async disconnect(id) {
		const p = this.get(id);
		if (p.secretKey) this._ls(false, p.secretKey, null);
		await this.clearCache(id);
		await this.saveConfig(id, { account: "", name: "", avatar: "", profileUrl: "", stats: {}, base: "", lastSync: "", syncStatus: "", syncError: "" });
	}

	// ================================================ segredos do dispositivo
	// O que existe guardado neste aparelho (nunca nas notas) — para a tela
	// de Segurança — e a limpeza total ("apagar tudo deste dispositivo").
	secretsInventory() {
		const out = [];
		const R = customJS.SteamVaultRetro;
		if (R?.hasKey?.()) out.push({ label: "RetroAchievements", what: "Web API Key" });
		return out;
	}

	wipeSecrets() {
		const R = customJS.SteamVaultRetro;
		try { R?.removeKey?.(); } catch (_) {}
		for (const p of Object.values(this.platforms())) {
			if (p.secretKey) this._ls(false, p.secretKey, null);
		}
		return this.secretsInventory().length === 0;
	}

	async setFlag(id, key, value) { await this.saveConfig(id, { [key]: !!value }); }

	async saveManualProfile(id, name) {
		const p = this.get(id);
		const v = this._s(name).normalize("NFC");
		if (v && !p.idPattern.test(v)) return { ok: false, code: "bad_id" };
		await this.saveConfig(id, { setup: true, account: v, name: v, profileUrl: v && p.profileUrl ? p.profileUrl(v) : "" });
		return { ok: true };
	}

	// importação: uma lista de títulos colada pelo usuário → fichas manuais
	// (limites e validação: 200 linhas, títulos saneados, sem duplicar)
	parseTitles(text, ctx) {
		const C = this.C;
		const have = new Set(ctx.model.games.map(g => C.normalizeKey(g.title)));
		const seen = new Set(), fresh = [], dup = [];
		const lines = String(text ?? "").split(/\r?\n/).slice(0, 400);
		for (const raw of lines) {
			const t = C.clip(raw.replace(/^[\s\-*•\d.)]+/, "").replace(/[\u0000-\u001F\u007F]/g, "").trim(), 120);
			if (t.length < 2) continue;
			const k = C.normalizeKey(t);
			if (!k || seen.has(k)) continue;
			seen.add(k);
			(have.has(k) ? dup : fresh).push(t);
			if (fresh.length >= 200) break;
		}
		return { fresh, dup };
	}

	async importTitles(id, titles, platform, onProgress = () => {}) {
		const p = this.get(id), C = this.C;
		const plat = p.platforms.includes(platform) ? platform : p.platformName;
		let done = 0, fail = 0;
		for (const [i, title] of titles.entries()) {
			onProgress(i + 1, titles.length);
			try { await C.createGameNote({ title, platform: plat, achievementProvider: p.provider, achievementSync: C.defaultSync(p.provider), status: "Backlog" }); done++; }
			catch (_) { fail++; }
		}
		C.invalidate();
		return { done, fail };
	}

	// =========================================== Xbox: texto colado (1.10.0)
	// O TrueAchievements e o Exophase bloqueiam leitura automática (Cloudflare),
	// então o caminho legítimo é você copiar a página do seu perfil no navegador
	// e colar aqui. O leitor aceita tabela copiada (células separadas por Tab) ou
	// uma informação por linha: um título seguido dos números dele. Entende
	// "12 / 50" ou "12 of 50" (conquistas), o par maior como Gamerscore, "37%",
	// "12h 30m", "45 min", "12.5 hours" e datas como "12 Nov 2026" ou 12/11/2026.
	parseTrackerText(text) {
		const C = this.C;
		const num = s => Number(String(s).replace(/[.,](?=\d{3}\b)/g, "").replace(",", "."));
		const noise = /^(games?|title|nome|jogo|gamerscore|gs|achievements?|conquistas?|trophies|completion|ratio|ta|ta score|score|started|completed|won|last played|platform|plataforma|hours?|horas|my games|sort( by)?|filter|show|page|progress|playtime|time played|status|rank|#)$/i;
		const fracRe = /(\d[\d.,]*)\s*(?:\/|of|de)\s*(\d[\d.,]*)/gi;
		const months = { jan: 1, feb: 2, fev: 2, mar: 3, apr: 4, abr: 4, may: 5, mai: 5, jun: 6, jul: 7, aug: 8, ago: 8, sep: 9, set: 9, oct: 10, out: 10, nov: 11, dec: 12, dez: 12 };
		const stats = s => {
			const o = {};
			const fr = [...String(s).matchAll(fracRe)].map(m => ({ a: num(m[1]), b: num(m[2]), gs: /\bG\b|GS|gamerscore|pontos/i.test(s.slice(m.index, m.index + m[0].length + 14)) }))
				.filter(f => Number.isFinite(f.a) && Number.isFinite(f.b) && f.b > 0 && f.a <= f.b);
			for (const f of fr) (f.gs ? (o.gs ||= []) : (o.fr ||= [])).push(f);
			const h = /(\d+(?:[.,]\d+)?)\s*(?:h|hrs?|hours?|horas?)\b(?:\s*(\d+)\s*(?:m|min|mins|minutes?|minutos?)\b)?/i.exec(s);
			const mOnly = !h && /(\d+)\s*(?:m|min|mins|minutes?|minutos?)\b/i.exec(s);
			if (h) o.hours = num(h[1]) + (h[2] ? Number(h[2]) / 60 : 0);
			else if (mOnly) o.hours = Number(mOnly[1]) / 60;
			const pct = /(\d{1,3}(?:[.,]\d+)?)\s*%/.exec(s);
			if (pct) o.pct = num(pct[1]);
			let d = /(\d{1,2})\s+([a-zç]{3})[a-zç]*\.?\s+((?:19|20)\d{2})/i.exec(s), iso = "";
			if (d && months[d[2].toLowerCase()]) iso = `${d[3]}-${String(months[d[2].toLowerCase()]).padStart(2, "0")}-${d[1].padStart(2, "0")}`;
			else if ((d = /([a-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+((?:19|20)\d{2})/i.exec(s)) && months[d[1].toLowerCase()]) iso = `${d[3]}-${String(months[d[1].toLowerCase()]).padStart(2, "0")}-${d[2].padStart(2, "0")}`;
			else if ((d = /\b(\d{1,2})\/(\d{1,2})\/((?:19|20)\d{2})\b/.exec(s))) iso = `${d[3]}-${d[2].padStart(2, "0")}-${d[1].padStart(2, "0")}`;
			if (iso) o.date = iso;
			return o;
		};
		const has = o => o.gs || o.fr || o.hours !== undefined || o.pct !== undefined || o.date !== undefined;
		// plataformas e rótulos soltos ("Xbox Series", "Last played…") não são nome de jogo
		const plat = /^(xbox( one| 360| series( x\|s| x| s)?)?|pc|windows|steam|playstation( \d)?|ps[345]|switch|android|ios|mobile|game pass|completed|won|in progress|started|unstarted|rare|hidden|dlc)$/i;
		const isTitle = s => /[a-zà-ü]{2}/i.test(s) && !noise.test(s.trim()) && !plat.test(s.trim()) && !/^(last played|played|última vez|jogado|started|completed)\b/i.test(s.trim()) && !has(stats(s)) && s.length <= 120;
		const rows = [];
		let cur = null;
		const push = () => {
			if (!cur || !has(cur.o)) return;
			// frações sem rótulo: a de menor total são as conquistas; com duas, a
			// outra é o Gamerscore; com três (TrueAchievements), a do meio é o
			// Gamerscore e a maior é a pontuação TA, que não é usada
			const fr = [...(cur.o.fr || [])].sort((x, y) => x.b - y.b);
			const ach = fr[0] || null, gs = cur.o.gs?.[0] || (fr.length >= 2 ? fr[1] : null);
			rows.push({ title: C.clip(cur.title.replace(/[™®©]/g, "").replace(/\s+/g, " ").trim(), 120), achUnlocked: ach?.a ?? null, achTotal: ach?.b ?? null, gsEarned: gs?.a ?? null, gsTotal: gs?.b ?? null, pct: cur.o.pct ?? (ach ? Math.round((ach.a / ach.b) * 100) : null), hours: cur.o.hours !== undefined ? Math.round(cur.o.hours * 100) / 100 : null, lastPlayed: cur.o.date || "" });
		};
		const merge = (o, s) => { const n = stats(s); for (const k of ["gs", "fr"]) if (n[k]) o[k] = [...(o[k] || []), ...n[k]]; for (const k of ["hours", "pct", "date"]) if (n[k] !== undefined && o[k] === undefined) o[k] = n[k]; };
		for (const raw of String(text ?? "").split(/\r?\n/).slice(0, 6000)) {
			const line = raw.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim();
			if (!line) continue;
			const cells = line.split(/\t+/).map(x => x.trim()).filter(Boolean);
			if (cells.length > 1 && isTitle(cells[0])) {
				push(); cur = { title: cells[0], o: {} };
				for (const c of cells.slice(1)) merge(cur.o, c);
				continue;
			}
			if (isTitle(line)) { push(); cur = { title: line, o: {} }; continue; }
			if (cur) merge(cur.o, line);
		}
		push();
		// o mesmo jogo duas vezes: fica a primeira ocorrência
		const seen = new Set();
		return rows.filter(r => { const k = C.normalizeKey(r.title); if (!k || seen.has(k)) return false; seen.add(k); return true; }).slice(0, 2000);
	}

	// a ficha de Xbox que já representa este jogo (nome, sem edição/™)
	xboxGameFor(title, games) {
		const C = this.C, [k1, k2] = C.steamTitleKeys(title);
		const xb = games.filter(g => g.provider === "xbox" || /xbox/i.test(g.platform));
		const exact = xb.filter(g => C.steamTitleKeys(g.title)[0] === k1);
		if (exact.length) return exact.length === 1 ? exact[0] : null;
		const loose = xb.filter(g => C.steamTitleKeys(g.title)[1] === k2);
		return loose.length === 1 ? loose[0] : null;
	}

	// grava as linhas: completa a ficha existente ou cria uma nova (origem Xbox,
	// Manual). Os números ficam em fm.xbox (como uma leitura externa); nada que
	// não veio no texto é apagado, e as suas notas de conquista continuam suas.
	async importTrackerRows(rows, source, ctx, onProgress = () => {}) {
		const C = this.C, p = this.get("xbox");
		const now = new Date().toISOString();
		let created = 0, updated = 0, fail = 0;
		for (const [i, r] of rows.entries()) {
			onProgress(i + 1, rows.length);
			try {
				const g = this.xboxGameFor(r.title, ctx.model.games);
				let file = g ? app.vault.getAbstractFileByPath(g.path) : null;
				if (!file) { file = await C.createGameNote({ title: r.title, platform: p.platformName, achievementProvider: "xbox", achievementSync: C.defaultSync("xbox"), status: r.pct >= 100 ? "Completed" : r.hours ? "Paused" : "Backlog" }); created++; }
				else updated++;
				await app.fileManager.processFrontMatter(file, f => {
					const x = f.xbox && typeof f.xbox === "object" ? { ...f.xbox } : {};
					for (const k of ["achTotal", "achUnlocked", "gsTotal", "gsEarned"]) if (r[k] !== null && r[k] !== undefined) x[k] = r[k];
					if (r.hours !== null && r.hours !== undefined && !(r.hours === 0 && Number(x.playtimeHours) > 0)) x.playtimeHours = r.hours;
					if (r.lastPlayed) x.lastPlayed = r.lastPlayed;
					x.source = source; x.lastSync = now; x.syncStatus = "ok";
					f.xbox = x;
				});
			} catch (_) { fail++; }
		}
		C.invalidate();
		return { created, updated, fail };
	}

	// =================================================== jogos do vault
	vaultGames(id) {
		const p = this.get(id);
		return app.vault.getMarkdownFiles().map(f => ({ f, fm: app.metadataCache.getFileCache(f)?.frontmatter }))
			.filter(x => x.fm?.type === "game" && !x.f.path.includes("/_Templates/") && (this._s(x.fm[p.idField]) || this.C.achievementProvider(x.fm) === p.provider));
	}

	// sincroniza quem é da plataforma E está em modo Automática
	_isAuto(id, fm) {
		const C = this.C, p = this.get(id), pv = C.achievementProvider(fm);
		return pv === p.provider && C.achievementSync(fm, pv) === "automatic";
	}

	// liga fichas sem ID pelo título (e grava o ID)
	async _link(id, remote) {
		const p = this.get(id), C = this.C;
		const byKey = new Map(remote.map(x => [C.normalizeKey(x.title), x]));
		let linked = 0;
		for (const { f, fm } of this.vaultGames(id)) {
			if (this._s(fm[p.idField]) || !this._isAuto(id, fm)) continue;
			const hit = byKey.get(C.normalizeKey(fm.title || f.basename));
			if (!hit) continue;
			await app.fileManager.processFrontMatter(f, x => { x[p.idField] = hit.id; C.migrateAchievementFields(x); });
			linked++;
		}
		return linked;
	}

	// =================================================== sync
	async syncAll(id, { force = false, onProgress = () => {} } = {}) {
		if (this.isManual(id)) return { ok: false, code: "manual" };
		const cfg = this.getConfig(id);
		if (!cfg?.configured) return { ok: false, code: "no_user" };
		if (!cfg.enabled) return { ok: false, code: "disabled" };
		const flag = `__sv${id}SyncRunning`;
		if (window[flag]) return { ok: false, code: "busy" };
		window[flag] = true;
		const now = new Date().toISOString();
		try {
			const r = await this._syncGog(cfg, { force, onProgress });
			await this.saveConfig(id, r.ok ? { lastSync: now, syncStatus: r.failed ? "partial" : "ok", syncError: "", ...(r.config || {}) } : { syncStatus: r.code, syncError: this.message(id, r.code), lastAttempt: now });
			this.C.invalidate();
			return r;
		} finally { window[flag] = false; }
	}

	async _syncGog(cfg, { onProgress }) {
		const user = cfg.account;
		const gr = await this._gogGames(user);
		if (!gr.ok) return gr;
		const pr = await this._gogProfile(user).catch(() => null);
		const prof = pr?.ok ? pr.profile : { account: user, name: cfg.name || user, avatar: cfg.avatar, profileUrl: cfg.profileUrl };
		await this._writeCache("gog", { profile: prof, games: gr.games });
		const linked = await this._link("gog", gr.games);
		await new Promise(r => setTimeout(r, 150));
		const byId = new Map(gr.games.map(g => [g.id, g]));
		const games = this.vaultGames("gog").filter(x => this._s(x.fm.gogId) && this._isAuto("gog", x.fm));
		let synced = 0, skipped = 0;
		const now = new Date().toISOString();
		for (const [i, { f, fm }] of games.entries()) {
			onProgress({ index: i + 1, total: games.length, name: fm.title || f.basename });
			const g = byId.get(this._s(fm.gogId));
			if (!g) { skipped++; continue; }
			const cur = (fm.gog && typeof fm.gog === "object") ? fm.gog : {};
			const next = { gameId: g.id, playtimeHours: g.playtimeHours, achPct: g.achPct, lastSession: g.lastPlayed, url: g.url, image: g.image, lastSync: now, syncStatus: "ok" };
			if (Object.keys(next).every(k => k === "lastSync" || cur[k] === next[k])) { skipped++; continue; }
			await app.fileManager.processFrontMatter(f, x => {
				x.gog = next;
				this.C.migrateAchievementFields(x);
				if ((x.cover === undefined || x.cover === "") && g.image) x.cover = g.image;
			});
			synced++;
		}
		const hours = gr.games.reduce((s, g) => s + (g.playtimeHours || 0), 0);
		const withPct = gr.games.filter(g => g.achPct !== null);
		return { ok: true, synced, skipped, failed: 0, created: 0, linked, games: gr.games.length, partial: !!gr.partial,
			config: { name: prof.name, avatar: prof.avatar, profileUrl: prof.profileUrl, stats: { games: gr.games.length, hours: Math.round(hours), achAvg: withPct.length ? Math.round(withPct.reduce((s, g) => s + g.achPct, 0) / withPct.length) : null } } };
	}

	// =================================================== importar jogos
	async importGame(id, remoteId) {
		const p = this.get(id), C = this.C;
		const cache = await this.readCache(id);
		const list = cache?.games || [];
		const x = list.find(r => r.id === String(remoteId));
		if (!x) return { ok: false, code: "not_found" };
		const exists = this.vaultGames(id).find(v => this._s(v.fm[p.idField]) === x.id);
		if (exists) return { ok: true, file: exists.f, existed: true };
		const file = await C.createGameNote({
			title: x.title, platform: p.platformName, achievementProvider: p.provider, achievementSync: "automatic",
			[p.idField]: x.id, cover: x.image || "", status: x.achPct === 100 ? "Completed" : (x.playtimeHours ? "Paused" : "Backlog")
		});
		await new Promise(r => setTimeout(r, 250)); // o metadataCache lê a nota nova
		await app.fileManager.processFrontMatter(file, f => { f.gog = { gameId: x.id, playtimeHours: x.playtimeHours, achPct: x.achPct, lastSession: x.lastPlayed, url: x.url, image: x.image, lastSync: new Date().toISOString(), syncStatus: "ok" }; });
		C.invalidate();
		return { ok: true, file };
	}

	// fora do vault (para "Adicionar")
	async missing(id, ctx) {
		const p = this.get(id), cache = await this.readCache(id);
		const list = cache?.games || [];
		const have = new Set(ctx.model.games.map(g => this._s(g.page?.[p.idField])).filter(Boolean));
		const titles = new Set(ctx.model.games.filter(g => g.provider === p.provider).map(g => this.C.normalizeKey(g.title)));
		return list.filter(x => !have.has(x.id) && !titles.has(this.C.normalizeKey(x.title)));
	}

	// =================================================== automático
	maybeAutoSync() {
		if (window.__svPlatAutoDone) return;
		window.__svPlatAutoDone = true;
		let delay = 6000;
		for (const id of Object.keys(this.platforms())) {
			if (this.isManual(id)) continue;
			const cfg = this.getConfig(id);
			if (!cfg.configured || !cfg.enabled || !cfg.autoSync) continue;
			const last = Date.parse(cfg.lastSync || "");
			if (last && Date.now() - last < this.STALE_HOURS * 3600000) continue;
			setTimeout(() => this.syncAll(id, {}).then(r => { if (r.ok) this.V?.refresh(); }).catch(() => {}), delay);
			delay += 5000;
		}
	}
}
