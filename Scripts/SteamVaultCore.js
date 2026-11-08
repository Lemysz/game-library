// ==========================================================================
// Game Library — Core (dados, schema e fonte única de verdade)
//
// Todo número que aparece na interface (total de conquistas, porcentagem,
// horas, 100%, "jogado por último") sai daqui. Cards, ficha, aba Steam e
// aba Conquistas chamam as MESMAS funções — por isso não divergem.
//
// Acesso: customJS.SteamVaultCore
// ==========================================================================

class SteamVaultCore {

	constructor() {
		// Versão do produto (SemVer) e estágio. A 1.0.0 consolida o desenvolvimento
		// anterior (numeração interna 3.x, ver docs/archive/). O estágio aparece em
		// Configurações e na versão do GitHub (tag v1.0.0-prototype).
		this.VERSION = "1.0.0";
		this.STAGE = "Prototype";

		this.folders = {
			games: "Games", collections: "Collections", achievements: "Achievements",
			genres: "Genres", subgenres: "Subgenres", platforms: "Platforms", dashboard: "Dashboard",
			coverAssets: "Assets/Covers", backgroundAssets: "Assets/Backgrounds",
			featuredAssets: "Assets/Featured", achievementAssets: "Assets/Achievements",
			soundtrackAssets: "Assets/Soundtracks"
		};

		// status canônicos. "Platinum" é legado: vira Completed e o 100% passa
		// a ser derivado das conquistas, não de um status digitado à mão.
		this.statusDefs = {
			Playing:   { label: "Jogando",          tone: "blue",  order: 0 },
			Paused:    { label: "Pausado",          tone: "amber", order: 1 },
			Backlog:   { label: "Backlog",          tone: "muted", order: 2 },
			Completed: { label: "Zerado",           tone: "green", order: 3 },
			Dropped:   { label: "Abandonado",       tone: "red",   order: 4 },
			Wishlist:  { label: "Lista de desejos", tone: "muted", order: 5 }
		};
		this.statusAliases = {
			platinum: "Completed", completed: "Completed", zerado: "Completed", concluido: "Completed", "concluído": "Completed",
			playing: "Playing", jogando: "Playing", paused: "Paused", pausado: "Paused",
			backlog: "Backlog", dropped: "Dropped", abandoned: "Dropped", abandonado: "Dropped",
			wishlist: "Wishlist"
		};

		// CONQUISTAS — duas propriedades independentes, nunca misturadas:
		//   achievementProvider = DE ONDE vêm as conquistas (a origem)
		//   achievementSync     = COMO o vault as mantém atualizadas
		// Native = conquistas/troféus/desafios próprios do jogo que nenhum
		// provedor online gerencia (celular, PS3, PC offline, console sem
		// integração) — sem subcategorias por aparelho. Custom = criadas à
		// mão pelo usuário. `sync` lista os modos aceitos, o padrão primeiro.
		// "Automática" só existe onde há integração de verdade no vault.
		this.providerDefs = {
			steam: { label: "Steam", short: "Steam", group: "online", sync: ["automatic", "manual"], integration: true },
			retroachievements: { label: "RetroAchievements", short: "RA", group: "online", sync: ["automatic", "manual"], integration: true },
			epic: { label: "Epic Games", short: "Epic", group: "online", sync: ["manual"] },
			gog: { label: "GOG", short: "GOG", group: "online", sync: ["manual", "automatic"], integration: true },
			playstation: { label: "PlayStation", short: "PS", group: "online", sync: ["manual"] },
			// 3.74.0: 100% manual — conquistas cadastradas no gerenciador (SteamVaultAchManager)
			xbox: { label: "Xbox", short: "Xbox", group: "online", sync: ["manual"] },
			googleplay: { label: "Google Play Games", short: "Play Games", group: "online", sync: ["manual"] },
			nintendo: { label: "Nintendo", short: "Nintendo", group: "online", sync: ["manual", "local"] },
			native: { label: "Native", short: "Native", group: "own", sync: ["manual", "local"] },
			custom: { label: "Custom", short: "Custom", group: "own", sync: ["local", "manual"] },
			none: { label: "Sem conquistas", short: "Sem conquistas", group: "state", sync: ["none"] },
			unset: { label: "Não configurado", short: "Não configurado", group: "state", sync: ["none"] }
		};
		this.providerGroups = [["online", "Provedores"], ["own", "Do jogo / do usuário"], ["state", "Estado"]];
		// raridade: faixas pela % global (Steam/RA) ou escolhida à mão
		// (Native/Custom/manuais) no campo `rarityTier`
		this.rarityTiers = {
			common: { label: "Comum", max: 101 }, uncommon: { label: "Incomum", max: 60 },
			rare: { label: "Rara", max: 35 }, epic: { label: "Épica", max: 15 }, legendary: { label: "Lendária", max: 5 }
		};
		this.rarityAliases = { comum: "common", incomum: "uncommon", rara: "rare", raro: "rare", "épica": "epic", epica: "epic", "lendária": "legendary", lendaria: "legendary" };
		this.syncDefs = {
			automatic: { label: "Automática", hint: "O vault busca o progresso sozinho" },
			manual: { label: "Manual", hint: "Você registra o que destravou" },
			local: { label: "Local", hint: "Existem só no vault" },
			none: { label: "Nenhuma", hint: "Nada para sincronizar" }
		};
		// grafias aceitas no frontmatter (e valores legados) → chave canônica
		this.providerAliases = {
			"steam": "steam", "retro": "retroachievements", "ra": "retroachievements", "retroachievements": "retroachievements",
			"epic": "epic", "epic games": "epic", "epic games store": "epic", "egs": "epic",
			"gog": "gog", "gog galaxy": "gog", "gog.com": "gog",
			"playstation": "playstation", "psn": "playstation", "ps": "playstation", "playstation network": "playstation",
			"xbox": "xbox", "xbox live": "xbox", "microsoft": "xbox",
			"googleplay": "googleplay", "google play": "googleplay", "google play games": "googleplay", "play games": "googleplay",
			"nintendo": "nintendo", "nintendo switch": "nintendo", "switch": "nintendo", "nintendo account": "nintendo", "eshop": "nintendo",
			"native": "native", "nativo": "native", "nativa": "native", "manual": "native",
			"custom": "custom", "personalizado": "custom", "personalizada": "custom",
			"none": "none", "sem conquistas": "none", "nenhum": "none", "nenhuma": "none",
			"unset": "unset", "não configurado": "unset", "nao configurado": "unset"
		};
		this.syncAliases = {
			"automatic": "automatic", "auto": "automatic", "automática": "automatic", "automatica": "automatic",
			"manual": "manual", "local": "local", "none": "none", "nenhuma": "none", "nenhum": "none"
		};

		this.platformOrder = ["PC", "Switch", "PS2", "PS1", "PSP", "PS Vita", "3DS", "NDS", "GBA", "N64", "GameCube", "Wii", "SNES", "Dreamcast", "Arcade"];

		// revisão do vault: sobe a cada mudança de metadado. O modelo inteiro
		// (jogos + índice de conquistas) é recalculado uma vez por revisão,
		// não uma vez por bloco/card/aba.
		if (typeof window.__svRev !== "number") window.__svRev = 0;
		if (!window.__svRevBound && typeof app !== "undefined" && app?.metadataCache?.on) {
			window.__svRevBound = true;
			const bump = () => { window.__svRev++; };
			// edição de uma nota que não é do vault de jogos (diário, rascunho…)
			// não refaz o modelo; uma nota que era ou passou a ser, sim
			const kinds = new Set(["game", "achievement", "collection", "genre", "subgenre", "platform", "franchise"]);
			app.metadataCache.on("changed", (file, _data, cache) => {
				const p = file?.path || "", fm = cache?.frontmatter;
				if (p.startsWith("Dashboard/") || window.__svRelPaths?.has(p) || kinds.has(String(fm?.type || "")) || [].concat(fm?.cssclasses || []).map(String).includes("steamvault")) bump();
			});
			app.vault.on("delete", bump);
			app.vault.on("rename", bump);
			app.vault.on("create", bump);
		}
	}

	// ------------------------------------------------------------ primitivos
	str(v) {
		if (v === null || v === undefined) return "";
		// caminho rápido: chamado centenas de milhares de vezes por montagem
		if (typeof v === "string") { const s = v.trim(); return (s === "undefined" || s === "null" || s === "NaN" || s === "[object Object]") ? "" : s; }
		if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
		if (typeof v === "object" && typeof v.toFormat === "function") return this.iso(v);
		if (typeof v === "object" && v.path) return String(v.path);
		const s = String(v).trim();
		return (s === "undefined" || s === "null" || s === "NaN" || s === "[object Object]") ? "" : s;
	}

	num(v) {
		if (v === null || v === undefined) return null;
		if (typeof v === "string" && v.trim() === "") return null;
		// 3.66.0: vírgula decimal, como se escreve em português ("10,5")
		const n = typeof v === "string" && /^\s*-?\d+,\d+\s*$/.test(v) ? Number(v.replace(",", ".")) : Number(v);
		return Number.isFinite(n) ? n : null;
	}

	// nota de 0 a 5 (vazia continua vazia)
	_r5(v) { const n = this.num(v); return n === null ? null : Math.min(5, Math.max(0, n)); }

	arr(v) {
		if (v === null || v === undefined || v === "") return [];
		if (Array.isArray(v)) return v.filter(x => x !== null && x !== undefined && x !== "");
		if (typeof v.array === "function") return v.array();
		return [v];
	}

	// qualquer representação de data (string, Luxon do Dataview, Date) →
	// "YYYY-MM-DD", ou "" se não houver data de verdade
	iso(v) {
		if (!v) return "";
		if (typeof v === "object" && typeof v.toISODate === "function") return v.toISODate() || "";
		if (v instanceof Date) return isNaN(v) ? "" : v.toISOString().slice(0, 10);
		const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v).trim());
		if (!m) return "";
		// 3.66.0: data impossível (mês 13, 30 de fevereiro) vale como vazia
		const y = +m[1], mo = +m[2], d = +m[3];
		if (mo < 1 || mo > 12 || d < 1 || d > new Date(Date.UTC(y, mo, 0)).getUTCDate()) return "";
		return `${m[1]}-${m[2]}-${m[3]}`;
	}

	isoDateTime(v) {
		if (!v) return "";
		if (typeof v === "object" && typeof v.toISO === "function") return v.toISO() || "";
		const s = String(v).trim();
		return /^\d{4}-\d{2}-\d{2}/.test(s) ? s : "";
	}

	today() { return this.localIso(new Date()); }
	// 3.66.0: data local (AAAA-MM-DD) de um Date ou de milissegundos.
	// toISOString() dá a data em UTC: no Brasil, depois das 21h, já é "amanhã"
	localIso(v) {
		const d = v instanceof Date ? v : new Date(v);
		if (isNaN(d)) return "";
		const p = n => String(n).padStart(2, "0");
		return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
	}

	maxIso(...dates) {
		return dates.filter(Boolean).sort().pop() || "";
	}

	daysBetween(a, b) {
		if (!a || !b) return null;
		return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);
	}

	normalizeKey(s) {
		return String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
			.replace(/[^a-z0-9]+/g, " ").trim();
	}

	slug(s) { return this.normalizeKey(s).replace(/ /g, "-"); }

	yamlEscape(s) {
		// aspas duplas do YAML: barra, aspas, quebras e tab escapados; os
		// demais caracteres de controle (texto remoto malformado) saem
		return String(s ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n|\r/g, "\\n").replace(/\t/g, "\\t")
			.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u2028\u2029]/g, "");
	}

	// ================================================== guardas (segurança)
	// Nome de arquivo/pasta a partir de texto qualquer (inclusive remoto):
	// sem separadores nem caracteres proibidos, sem "."/".." ou ponto no
	// início (nada de subir pastas ou criar ocultos), sem nomes reservados
	// do Windows, tamanho limitado.
	safeFileName(str, fallback = "Sem nome") {
		let s = String(str ?? "").normalize("NFC").replace(/[\\/:*?"<>|#^[\]\u0000-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim();
		s = s.replace(/^[.\s]+/, "").replace(/[.\s]+$/, "");
		if (/^(con|prn|aux|nul|com\d|lpt\d)$/i.test(s)) s = `${s}_`;
		s = s.slice(0, 120).trim();
		return s || fallback;
	}

	// URL segura para href/abrir: só http(s) (e os protocolos pedidos), e,
	// se informado, só os hosts permitidos. Qualquer outra coisa vira "".
	safeUrl(url, { hosts = null, protocols = ["https:", "http:"] } = {}) {
		try {
			const s = String(url ?? "").trim();
			if (!s || s.length > 2048) return "";
			const u = new URL(s);
			if (!protocols.includes(u.protocol)) return "";
			if (u.username || u.password) return "";
			if (hosts && !hosts.some(h => u.hostname === h || u.hostname.endsWith(`.${h}`))) return "";
			return u.href;
		} catch (_) { return ""; }
	}

	// 3.24.2: endereço da internet que pode ser baixado pelo app (requestUrl
	// não tem as travas do navegador). Só https/http para servidores públicos:
	// nada de localhost, rede local (10.x, 192.168.x, 172.16–31.x, 169.254.x),
	// .local/.internal nem IPv6 local — uma capa numa nota sincronizada não
	// pode fazer o aparelho falar com o roteador ou com serviços da máquina.
	publicUrl(url) {
		const href = this.safeUrl(url);
		if (!href) return "";
		const host = new URL(href).hostname.toLowerCase().replace(/^\[|\]$/g, "");
		if (!host || !host.includes(".") && !host.includes(":")) return "";
		if (/(^|\.)(localhost|local|internal|lan|home|arpa)$/.test(host)) return "";
		const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
		if (v4) {
			const [a, b] = [Number(v4[1]), Number(v4[2])];
			if (a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)) return "";
		}
		if (host.includes(":") && (host === "::1" || host === "::" || /^(fc|fd|fe8|fe9|fea|feb)/.test(host) || /^::ffff:/.test(host))) return "";
		return href;
	}

	// cor vinda de nota/arquivo antes de ir para um atributo style: só #hex ou
	// hsl() montado pelo próprio app; qualquer outra coisa vira o padrão
	safeColor(c, fallback = "") {
		const s = String(c ?? "").trim();
		return /^#[0-9a-f]{3,8}$/i.test(s) || /^hsl\(\d{1,3}(\.\d+)? \d{1,3}% \d{1,3}%\)$/.test(s) ? s : fallback;
	}

	// texto remoto com tamanho máximo (nada de campos gigantes nas notas)
	clip(v, max = 300) {
		// Texto remoto: remove caracteres de controle e colapsa quebras/espaços antes de cortar.
		const s = this.str(v).replace(/[\u0000-\u001F\u007F\u2028\u2029]+/g, " ").replace(/\s{2,}/g, " ").trim();
		return s.length > max ? s.slice(0, max) : s;
	}

	hashHue(s) {
		let h = 0;
		for (const ch of String(s ?? "")) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
		return h % 360;
	}

	// caminho de um campo de link (string "[[x]]", objeto Link do Dataview)
	linkPath(v) {
		if (!v) return "";
		if (typeof v === "object" && v.path) return v.path;
		const m = /\[\[([^\]|#]+)/.exec(String(v));
		return m ? m[1].trim() : String(v).trim();
	}

	// ---------------------------------------------------------------- imagens
	// devolve "" quando o arquivo NÃO existe — é isso que permite ao hero e
	// aos cards cair no fallback em vez de mostrar uma imagem quebrada
	resolveImage(val) {
		const v = this.str(val);
		if (!v) return "";
		if (/^(https?:|data:|app:|capacitor:|blob:)/i.test(v)) return v;
		if (typeof app === "undefined") return "";
		const clean = v.replace(/^\.?\//, "");
		const file = app.vault.getAbstractFileByPath(clean) || app.metadataCache.getFirstLinkpathDest?.(clean, "");
		return file ? app.vault.getResourcePath(file) : "";
	}

	// 3.38.0: imagem própria no lugar do ícone (gênero, subgênero, plataforma,
	// franquia, coleção). Aceita caminho do vault, [[link]] ou endereço
	// https de imagem; devolve o endereço pronto para <img> ou "".
	iconImage(val) {
		const v = this.str(val).replace(/^!?\[\[|\]\]$/g, "").split("|")[0].trim();
		if (!v || v.length > 500 || v.includes("..")) return "";
		const isUrl = /^https:\/\//i.test(v);
		if (!isUrl && !/\.(png|jpe?g|webp|gif|avif|svg|bmp)$/i.test(v)) return "";
		return this.resolveImage(v);
	}

	imageChain(p, chain) {
		for (const field of chain) {
			const src = this.resolveImage(p?.[field]);
			if (src) return { src, field };
		}
		return { src: "", field: "" };
	}

	// ------------------------------------------------------------- semântica
	normalizeProvider(v) {
		const k = this.str(v).toLowerCase();
		return this.providerAliases[k] || (this.providerDefs[k] ? k : "");
	}

	// origem: campo novo → campos legados (achievementSource/gameType, em
	// que "manual" era o que hoje é Native) → IDs de integração → não configurado
	achievementProvider(p) {
		return this.normalizeProvider(p?.achievementProvider)
			|| this.normalizeProvider(p?.achievementSource)
			|| this.normalizeProvider(p?.gameType)
			|| (this.str(p?.steamAppId) ? "steam" : this.str(p?.raGameId) ? "retroachievements" : "unset");
	}

	syncModes(provider) { return (this.providerDefs[provider] || this.providerDefs.unset).sync; }
	defaultSync(provider) { return this.syncModes(provider)[0]; }

	// modo pedido se o provedor aceitar; senão o padrão do provedor
	// (ex.: "automatic" numa Epic, que não tem integração, vira manual)
	achievementSync(p, provider = this.achievementProvider(p)) {
		const asked = this.syncAliases[this.str(p?.achievementSync).toLowerCase()] || "";
		return this.syncModes(provider).includes(asked) ? asked : this.defaultSync(provider);
	}

	providerLabel(k) { return (this.providerDefs[k] || this.providerDefs.unset).label; }
	syncLabel(k) { return (this.syncDefs[k] || this.syncDefs.none).label; }
	// o vault busca o progresso sozinho (sync da Steam / do RA)
	autoSync(g) { return g.sync === "automatic" && !!this.providerDefs[g.provider]?.integration; }
	// jogo que existe na Steam (loja, tempo de jogo, arte) — independe da
	// origem das conquistas: um jogo Steam pode ter conquistas Custom
	isSteamGame(g) { return !!g.steamAppId || g.provider === "steam"; }

	// dentro de processFrontMatter: grava os campos novos a partir do que a
	// nota já diz e remove os legados. Devolve true se mudou algo.
	migrateAchievementFields(x) {
		const provider = this.achievementProvider(x), sync = this.achievementSync(x, provider);
		let changed = false;
		if (x.achievementProvider !== provider) { x.achievementProvider = provider; changed = true; }
		if (x.achievementSync !== sync) { x.achievementSync = sync; changed = true; }
		for (const k of ["achievementSource", "gameType"]) if (k in x) { delete x[k]; changed = true; }
		return changed;
	}

	// valores de frontmatter para gravar (a partir de qualquer grafia)
	achievementFields(provider, sync) {
		const pv = this.normalizeProvider(provider) || "unset";
		const asked = this.syncAliases[this.str(sync).toLowerCase()] || "";
		return { achievementProvider: pv, achievementSync: this.syncModes(pv).includes(asked) ? asked : this.defaultSync(pv) };
	}

	normalizeStatus(v) {
		const raw = this.str(v);
		if (this.statusDefs[raw]) return raw;
		return this.statusAliases[raw.toLowerCase()] || "Backlog";
	}

	statusLabel(key) { return this.statusDefs[key]?.label || key; }

	// ============================================================ o modelo
	// Uma leitura do vault por revisão. Tudo o que as telas precisam.
	model(dv) {
		const rev = window.__svRev || 0;
		const cached = window.__svModelCache;
		if (cached && cached.rev === rev && typeof app !== "undefined") return cached.model;
		const model = this._buildModel(dv);
		window.__svModelCache = { rev, model };
		return model;
	}

	invalidate() { window.__svRev = (window.__svRev || 0) + 1; }

	_buildModel(dv) {
		// dv.pages() percorre o vault inteiro: uma chamada só
		const all = dv.pages();
		const pages = all.array ? all.array() : all;
		const gamePages = pages.filter(p => p.type === "game" && !String(p.file?.path || "").includes("/_Templates/"));
		const achPages = pages.filter(p => p.type === "achievement" && !String(p.file?.path || "").includes("/_Templates/"));

		// índice bruto: caminho do jogo → notas de conquista
		const byGame = new Map();
		const byName = new Map(gamePages.map(p => [p.file.name, p.file.path]));
		const gamePaths = new Set(gamePages.map(p => p.file.path));
		const orphans = [];
		for (const a of achPages) {
			let path = this.str(a.gamePath);
			if (!path || !gamePaths.has(path)) {
				const lp = this.linkPath(a.game).replace(/\.md$/, "");
				path = byName.get(lp.split("/").pop()) || "";
			}
			if (!path) { orphans.push(a.file.path); continue; }
			if (!byGame.has(path)) byGame.set(path, []);
			byGame.get(path).push(a);
		}

		const duplicates = [];
		const games = gamePages.map(p => this._buildGame(p, byGame.get(p.file.path) || [], duplicates));
		const gamesByPath = new Map(games.map(g => [g.path, g]));
		const gamesByName = new Map(games.map(g => [g.name.toLowerCase(), g]));

		const resolveGameLink = raw => {
			const lp = this.linkPath(raw).replace(/\.md$/, "");
			if (!lp) return null;
			return gamesByPath.get(lp + ".md") || gamesByPath.get(lp) || gamesByName.get(lp.split("/").pop().toLowerCase()) || null;
		};

		const collections = pages.filter(p => p.type === "collection" && !String(p.file.path).includes("/_Templates/")).map(p => {
			const declared = this.arr(p.games);
			const raw = declared.length ? declared : (p.file.outlinks?.array?.() || this.arr(p.file.outlinks));
			const list = [], missing = [];
			for (const l of raw) {
				const g = resolveGameLink(l);
				if (g) { if (!list.includes(g)) list.push(g); }
				else if (declared.length) missing.push(this.linkPath(l));
			}
			return {
				path: p.file.path, name: p.file.name, page: p,
				title: this.str(p.title) || p.file.name,
				description: this.str(p.description),
				accent: this.safeColor(this.str(p.accent)),
				cover: this.resolveImage(p.cover),
				games: list, missing,
				// títulos desejados que ainda não têm ficha (texto, não link)
				pending: this.arr(p.pendingGames).map(x => this.str(x)).filter(Boolean),
				// identidade e curadoria (3.10.0): tipo, ícone, fixada, atualização
				icon: this.str(p.icon), iconImage: this.iconImage(p.iconImage),
				kind: this.collectionKind(p),
				pinned: p.pinned === true || p.pinned === "true",
				declared: declared.length > 0,
				updated: this.collectionUpdated(p)
			};
		});
		const collectionsByGame = new Map();
		for (const c of collections) for (const g of c.games) {
			if (!collectionsByGame.has(g.path)) collectionsByGame.set(g.path, []);
			collectionsByGame.get(g.path).push(c);
		}

		const entity = type => pages.filter(p => p.type === type && !String(p.file.path).includes("/_Templates/")).map(p => ({
			path: p.file.path, name: p.file.name, page: p,
			title: this.str(p.title) || p.file.name,
			description: this.str(p.description), cover: this.resolveImage(p.cover),
			// identidade (3.9.0): tudo opcional; vazio = padrão da Game Library
			accent: /^#[0-9a-f]{3,8}$/i.test(this.str(p.accent)) ? this.str(p.accent) : "",
			icon: this.str(p.icon), iconImage: this.iconImage(p.iconImage), maker: this.str(p.maker),
			year: this.num(p.year), generation: this.str(p.generation)
		}));

		// notas que entram no modelo (o aviso de mudança só refaz o modelo por elas)
		window.__svRelPaths = new Set(pages.filter(p => ["game", "achievement", "collection", "genre", "subgenre", "platform", "franchise"].includes(p.type)).map(p => p.file.path));

		const model = {
			games, gamesByPath, collections, collectionsByGame,
			genres: entity("genre"), subgenres: entity("subgenre"), platforms: entity("platform"), franchises: entity("franchise"),
			orphanAchievements: orphans, duplicateAchievements: duplicates,
			builtAt: Date.now()
		};
		model.stats = this.libraryStats(model);
		return model;
	}

	// ============================================================ o jogo
	_buildGame(p, achNotes, duplicatesOut) {
		const provider = this.achievementProvider(p);
		const sync = this.achievementSync(p, provider);
		const steam = (p.steam && typeof p.steam === "object") ? p.steam : {};
		const ra = (p.ra && typeof p.ra === "object") ? p.ra : {};
		const g = {
			path: p.file.path, name: p.file.name, page: p,
			title: this.str(p.title) || p.file.name,
			platform: this.str(p.platform) || "Outros",
			provider, providerLabel: this.providerLabel(provider), sync, syncLabel: this.syncLabel(sync),
			status: this.normalizeStatus(p.status), statusRaw: this.str(p.status),
			favorite: p.favorite === true || p.favorite === "true",
			// 3.31.0: posição na fila "A seguir" (1 = o próximo); vazio = fora da fila
			upNext: (n => n !== null && n > 0 ? n : null)(this.num(p.upNext)),
			rating: Math.min(5, Math.max(0, this.num(p.rating) || 0)),
			ratings: {
				gameplay: this._r5(p.ratingGameplay), story: this._r5(p.ratingStory), graphics: this._r5(p.ratingGraphics),
				soundtrack: this._r5(p.ratingSoundtrack), fun: this._r5(p.ratingFun)
			},
			tier: this.str(p.tier).toUpperCase(), tierOrder: this.num(p.tierOrder),
			franchise: this.str(p.franchise), franchiseOrder: this.num(p.franchiseOrder),
			genres: this.arr(p.genre).map(x => this.str(x)).filter(Boolean),
			subgenres: this.arr(p.subgenre).map(x => this.str(x)).filter(Boolean),
			labels: this.arr(p.labels).map(x => this.str(x)).filter(Boolean),
			developer: this.str(p.developer), publisher: this.str(p.publisher),
			releaseYear: this.num(p.releaseYear), releaseDate: this.iso(p.releaseDate), summary: this.str(p.summary),
			// minha análise (Visão geral)
			review: this.str(p.review), pros: this.arr(p.pros).map(x => this.str(x)).filter(Boolean), cons: this.arr(p.cons).map(x => this.str(x)).filter(Boolean),
			recommend: p.recommend === true || p.recommend === "true" ? true : p.recommend === false || p.recommend === "false" ? false : null,
			ownership: this.str(p.ownership), priority: this.str(p.priority), difficulty: this.str(p.difficultyRating),
			dateAdded: this.iso(p.dateAdded), startDate: this.iso(p.startDate), completionDate: this.iso(p.completionDate),
			lastPlayedField: this.iso(p.lastPlayed),
			hoursLocal: this.num(p.hoursPlayed) || 0, estimatedHours: this.num(p.estimatedHours),
			steamAppId: this.str(p.steamAppId),
			steam: {
				lastSync: this.isoDateTime(steam.lastSync), lastAttempt: this.isoDateTime(steam.lastAttempt), status: this.str(steam.syncStatus), error: this.str(steam.syncError),
				playtimeHours: this.num(steam.playtimeHours), playtime2Weeks: this.num(steam.playtime2Weeks),
				lastPlayed: this.iso(steam.lastPlayed),
				achTotal: this.num(steam.achievements?.total), achUnlocked: this.num(steam.achievements?.unlocked)
			},
			raGameId: this.str(p.raGameId),
			// caches das integrações (SteamVaultPlatforms) — escritos pelo app
			xboxTitleId: this.str(p.xboxTitleId), gogId: this.str(p.gogId),
			xbox: (() => { const x = (p.xbox && typeof p.xbox === "object") ? p.xbox : {}; return {
				lastSync: this.isoDateTime(x.lastSync), status: this.str(x.syncStatus), error: this.str(x.syncError),
				achTotal: this.num(x.achTotal), achUnlocked: this.num(x.achUnlocked), gsTotal: this.num(x.gsTotal), gsEarned: this.num(x.gsEarned),
				lastPlayed: this.iso(x.lastPlayed) }; })(),
			gog: (() => { const x = (p.gog && typeof p.gog === "object") ? p.gog : {}; return {
				lastSync: this.isoDateTime(x.lastSync), status: this.str(x.syncStatus),
				playtimeHours: this.num(x.playtimeHours), achPct: this.num(x.achPct), lastPlayed: this.iso(x.lastSession), url: this.str(x.url) }; })(),
			// cache do sync com o RetroAchievements (gravado pelo SteamVaultRetro)
			ra: {
				lastSync: this.isoDateTime(ra.lastSync), status: this.str(ra.syncStatus), error: this.str(ra.syncError),
				console: this.str(ra.console), achTotal: this.num(ra.achievements?.total),
				achUnlocked: this.num(ra.achievements?.unlocked), achHardcore: this.num(ra.achievements?.hardcore),
				pointsTotal: this.num(ra.points?.total), pointsEarned: this.num(ra.points?.earned), pointsHardcore: this.num(ra.points?.hardcore),
				award: this.str(ra.award), awardDate: this.iso(ra.awardDate), lastPlayed: this.iso(ra.lastPlayed),
				players: this.num(ra.players), icon: this.str(ra.icon)
			},
			price: this.num(p.price), currentPrice: this.num(p.currentPrice), regularPrice: this.num(p.regularPrice),
			discountPercent: this.num(p.discountPercent), targetPrice: this.num(p.targetPrice), buyLink: this.str(p.buyLink),
			lowestSeenPrice: this.num(p.lowestSeenPrice), priceCheckedAt: this.isoDateTime(p.priceCheckedAt),
			// histórico de preço da lista de desejos (3.21.0): um ponto por dia verificado
			priceHistory: this.arr(p.priceHistory).map(h => ({ d: this.iso(h?.d), p: this.num(h?.p), s: this.str(h?.s) })).filter(h => h.d && h.p !== null),
			lowestSeenDate: this.iso(p.lowestSeenDate),
			wishlistAdded: this.iso(p.wishlistAdded), wishlistReason: this.str(p.wishlistReason), purchaseDate: this.iso(p.purchaseDate),
			priceStore: this.str(p.priceStore), priceUrl: this.str(p.priceUrl), priceStatus: this.str(p.priceStatus),
			sessions: this.arr(p.sessions).filter(s => s && typeof s === "object"),
			playthroughs: this.arr(p.playthroughs).filter(s => s && typeof s === "object"),
			dlc: this.arr(p.dlc).filter(Boolean),
			soundtrack: this.arr(p.soundtrack).filter(s => s && typeof s === "object"),
			screenshots: this.arr(p.screenshots).filter(Boolean),
			notes: this.arr(p.notes).filter(Boolean),
			legacyAch: { earned: this.num(p.achievementsEarned), total: this.num(p.achievementsTotal) }
		};

		// imagens — cada finalidade com sua cadeia de fallback
		g.images = {
			cover: this.imageChain(p, ["cover", "coverFicha"]).src,
			pageCover: this.imageChain(p, ["coverFicha", "cover"]).src,
			background: this.imageChain(p, ["background", "featured"]).src,
			featured: this.imageChain(p, ["featured", "background"]).src,
			// logotipo do jogo (PNG/WebP transparente), usado no lugar do título no topo
			logo: p.showLogo === false || p.showLogo === "false" ? "" : this.resolveImage(p.logo),
			logoFile: this.resolveImage(p.logo)
		};
		const clamp = (n, a, b, d) => { const v = this.num(n); return v === null ? d : Math.min(b, Math.max(a, v)); };
		g.framing = { x: clamp(p.bgPosX, 0, 100, 50), y: clamp(p.bgPosY, 0, 100, 50), zoom: clamp(p.bgZoom, 100, 220, 100) };
		g.accent = /^#[0-9a-f]{3,8}$/i.test(this.str(p.accent)) ? this.str(p.accent) : "";
		g.hue = this.hashHue(g.title);

		// conquistas: normaliza + remove duplicatas ANTES de qualquer conta
		const normalized = achNotes.map(a => this._normAchievement(a, g));
		const { list, dups } = this._dedupeAchievements(normalized);
		if (dups.length) duplicatesOut.push(...dups.map(d => ({ game: g.path, ...d })));
		g.achievements = this._orderAchievements(list, provider);

		g.ach = this.achievementSummary(g);
		g.playtime = this.playtime(g);
		g.lastPlayed = this.lastPlayed(g);
		g.sessionCount = g.sessions.length;
		g.notPlayed = g.playtime.hours === 0 && !g.sessions.length && !g.startDate && ["Backlog", "Wishlist"].includes(g.status);
		return g;
	}

	// Fila "A seguir" (3.31.0): só jogos ainda por jogar/terminar, na ordem
	queue(model) {
		return model.games.filter(g => g.upNext !== null && !["Completed", "Dropped"].includes(g.status)).sort((a, b) => a.upNext - b.upNext || a.title.localeCompare(b.title));
	}

	// conquista conta no progresso (o conjunto dela não foi tirado do total)
	achCounts(g, a) {
		const S = this.achSets(g);
		if (!S.multi) return true;
		const st = S.sets.find(x => x.name === (a.set || "Jogo base"));
		return !st || !st.excluded;
	}

	// Conjuntos de conquistas de um jogo (3.27.0). "Jogo base" primeiro; os
	// marcados em achSetsExcluded (ex.: DLC que a pessoa não tem) não entram
	// no progresso total do conjunto. Guardado no jogo até o modelo mudar.
	achSets(g) {
		if (g.__achSets) return g.__achSets;
		const BASE = "Jogo base";
		const excluded = new Set(this.arr(g.page?.achSetsExcluded).map(x => this.str(x)).filter(Boolean));
		const map = new Map();
		for (const a of g.achievements) {
			const name = a.set || BASE;
			if (!map.has(name)) map.set(name, []);
			map.get(name).push(a);
		}
		const sets = [...map.entries()].map(([name, list]) => {
			const unlocked = list.filter(a => a.unlocked).length;
			return { name, base: name === BASE, list, unlocked, total: list.length, done: list.length > 0 && unlocked === list.length, excluded: excluded.has(name), pct: list.length ? (unlocked / list.length) * 100 : 0 };
		}).sort((a, b) => (b.base - a.base) || a.name.localeCompare(b.name));
		const counted = sets.filter(s => !s.excluded);
		const unlocked = counted.reduce((t, s) => t + s.unlocked, 0), total = counted.reduce((t, s) => t + s.total, 0);
		g.__achSets = { sets, unlocked, total, pct: total ? (unlocked / total) * 100 : 0, multi: sets.length > 1, completedSets: sets.filter(s => s.done).length };
		return g.__achSets;
	}

	// conquista já normalizada é reaproveitada enquanto a nota não muda
	// (data de modificação) e o jogo continua o mesmo — refazer o modelo
	// depois de editar uma nota não recalcula as outras dezenas de milhares
	_normAchievement(a, g) {
		const path = a.file?.path, mt = a.file?.mtime;
		const ms = mt == null ? null : typeof mt === "number" ? mt : typeof mt.toMillis === "function" ? mt.toMillis() : Number(mt) || null;
		if (!path || !ms) return this._normAchievementRaw(a, g);
		const key = `${ms}|${g.path}|${g.provider}|${g.steamAppId}`;
		const cache = (window.__svAchCache ||= new Map());
		const hit = cache.get(path);
		if (hit && hit.key === key) return hit.val;
		const val = this._normAchievementRaw(a, g);
		cache.set(path, { key, val });
		return val;
	}

	_normAchievementRaw(a, g) {
		const icon = this.str(a.icon);
		const iconUrl = this.str(a.steamIconUrl) || this.str(a.raBadgeUrl);
		return {
			path: a.file?.path || "",
			name: this.str(a.name) || a.file?.name || "",
			description: this.str(a.description),
			iconSrc: this.resolveImage(icon) || (iconUrl && /^https?:/.test(iconUrl) ? iconUrl : ""),
			unlocked: a.unlocked === true || a.unlocked === "true",
			id: this.str(a.id) || a.file?.path || "",
			category: this.str(a.category),
			// 3.27.0: conjunto (estilo Conjuntos de Conquistas da Steam): vazio = jogo base
			set: this.clip(a.set ?? a.achievementSet, 60),
			archived: a.archived === true || a.archived === "true",
			secret: a.secret === true || a.secret === "true" || a.steamHidden === true,
			order: this.num(a.order),
			notes: this.str(a.notes),
			rarityTier: this.normalizeRarity(a.rarityTier),
			provider: g.provider, gameId: g.path,
			target: a.target === true || a.target === "true",
			unlockedDate: this.iso(a.unlockedDate),
			unlockedTime: this.str(a.unlockedTime),
			rarity: this.num(a.steamGlobalPercent ?? a.raPercent ?? a.xboxPercent),
			points: this.num(a.points) || 0,
			steamApiName: this.str(a.steamApiName),
			steamOrder: this.num(a.steamOrder),
			steamAppId: this.str(a.steamAppId) || g.steamAppId,
			iconHash: this.iconHash(iconUrl),
			raId: this.num(a.raId),
			raDisplayOrder: this.num(a.raDisplayOrder),
			hidden: a.steamHidden === true || a.secret === true || a.secret === "true",
			syncedFromSteam: this.str(a.unlockSource) === "steam",
			syncedFromRA: this.str(a.unlockSource) === "retroachievements",
			syncedFrom: this.str(a.unlockSource),
			xboxId: this.str(a.xboxId),
			hardcore: a.raHardcore === true || a.raHardcore === "true",
			raType: this.str(a.raType),
			gamePath: g.path
		};
	}

	normalizeRarity(v) {
		const k = this.str(v).toLowerCase();
		return this.rarityTiers[k] ? k : this.rarityAliases[k] || "";
	}

	// faixa efetiva: a % global quando existe, senão a escolhida à mão
	rarityOf(a) {
		if (a.rarity !== null && a.rarity !== undefined) {
			const p = a.rarity;
			return p <= 5 ? "legendary" : p <= 15 ? "epic" : p <= 35 ? "rare" : p <= 60 ? "uncommon" : "common";
		}
		return a.rarityTier || "";
	}

	// hash do arquivo do ícone na CDN da Steam: é o mesmo em qualquer idioma,
	// então serve de chave estável mesmo quando o nome está traduzido
	iconHash(url) {
		const m = /\/([0-9a-f]{40})\.(?:jpg|png|gif)/i.exec(String(url ?? ""));
		return m ? m[1].toLowerCase() : "";
	}

	// chave lógica: Steam AppID + apiname (ou hash do ícone, ou nome
	// normalizado); RetroAchievements pelo Achievement ID
	achievementKey(a) {
		if (a.raId !== null && a.raId !== undefined) return `ra:${a.raId}`;
		if (a.xboxId) return `xbox:${a.gamePath}:${a.xboxId}`;
		const app = a.steamAppId || "local";
		if (a.steamApiName) return `steam:${app}:api:${a.steamApiName.toLowerCase()}`;
		if (a.iconHash) return `steam:${app}:icon:${a.iconHash}`;
		return `name:${app}:${this.normalizeKey(a.name)}:${this.normalizeKey(a.description).slice(0, 40)}`;
	}

	_dedupeAchievements(list) {
		const seen = new Map(), out = [], dups = [];
		for (const a of list) {
			const k = this.achievementKey(a);
			if (!seen.has(k)) { seen.set(k, out.length); out.push(a); continue; }
			const i = seen.get(k);
			dups.push({ key: k, kept: out[i].path, dropped: a.path });
			if (a.unlocked && !out[i].unlocked) out[i] = a; // mantém a destravada
		}
		return { list: out, dups };
	}

	_orderAchievements(list, source) {
		const nl = (a, b) => (a === null) - (b === null);
		return [...list].sort((a, b) => {
			if (source === "retroachievements") return nl(a.raDisplayOrder, b.raDisplayOrder) || (a.raDisplayOrder ?? 0) - (b.raDisplayOrder ?? 0) || a.name.localeCompare(b.name);
			// `order` (definida no editor) vale para qualquer origem; Steam usa a própria
			return nl(a.order, b.order) || (a.order ?? 0) - (b.order ?? 0)
				|| nl(a.steamOrder, b.steamOrder) || (a.steamOrder ?? 0) - (b.steamOrder ?? 0) || a.name.localeCompare(b.name);
		});
	}

	// ------------------------------------------------ FONTE ÚNICA: conquistas
	// state: "none" (jogo sem conquistas) | "unknown" (não sabemos — nunca
	// mostra 0) | "known". `origin` diz de onde veio o número.
	achievementSummary(g) {
		if (g.provider === "none") return { state: "none", total: 0, unlocked: 0, locked: 0, pct: null, perfect: false, origin: "" };
		let total = 0, unlocked = 0, origin = "";
		if (g.achievements.length) {
			total = g.achievements.length;
			unlocked = g.achievements.filter(a => a.unlocked).length;
			origin = g.achievements.some(a => a.syncedFromSteam) ? "steam" : g.achievements.some(a => a.syncedFromRA) ? "retroachievements" : "vault";
			if (g.ra.achTotal !== null && g.ra.achTotal > total) { total = g.ra.achTotal; unlocked = Math.max(unlocked, g.ra.achUnlocked ?? 0); origin = "retroachievements"; }
			// a Steam conhece mais conquistas do que existem como nota:
			// o total oficial vence, o destravado continua vindo das notas
			if (g.steam.achTotal !== null && g.steam.achTotal > total) { total = g.steam.achTotal; unlocked = Math.max(unlocked, g.steam.achUnlocked ?? 0); origin = "steam"; }
			// 3.70.0: com notas, o Xbox é manual — a contagem antiga da API (fm.xbox)
			// não passa mais por cima do que você marca; só vale sem nenhuma nota
		} else if (g.steam.achTotal !== null) {
			// a página pública confirmou que o jogo não tem conquistas
			if (g.steam.achTotal === 0) return { state: "none", total: 0, unlocked: 0, locked: 0, pct: null, perfect: false, origin: "steam" };
			total = g.steam.achTotal; unlocked = g.steam.achUnlocked ?? 0; origin = "steam";
		} else if (g.xbox.achTotal !== null && g.xbox.achTotal > 0) {
			// contagem que ficou da antiga sincronização do Xbox (somente leitura)
			total = g.xbox.achTotal; unlocked = g.xbox.achUnlocked ?? 0; origin = "legacy";
		} else if (g.ra.achTotal !== null && g.ra.achTotal > 0) {
			total = g.ra.achTotal; unlocked = g.ra.achUnlocked ?? 0; origin = "retroachievements";
		} else if (g.legacyAch.total > 0) {
			total = g.legacyAch.total; unlocked = Math.min(g.legacyAch.earned || 0, total); origin = "legacy";
		} else if (g.gog.achPct !== null) {
			// a GOG pública só informa a porcentagem: estado próprio, sem
			// inventar contagem (as telas que somam conquistas o ignoram)
			const pct = Math.max(0, Math.min(100, g.gog.achPct));
			return { state: "pct", total: 0, unlocked: 0, locked: 0, pct, pctRound: Math.floor(pct), perfect: pct >= 100, origin: "gog" };
		} else {
			return { state: "unknown", total: 0, unlocked: 0, locked: 0, pct: null, perfect: false, origin: "" };
		}
		const pct = total > 0 ? Math.floor((unlocked / total) * 1000) / 10 : null;
		return { state: "known", total, unlocked, locked: total - unlocked, pct, pctRound: pct === null ? null : Math.floor(pct), perfect: total > 0 && unlocked === total, origin };
	}

	// ------------------------------------------------ FONTE ÚNICA: tempo
	playtime(g) {
		// campos do cache Steam só são gravados a partir de uma leitura pública
		// bem-sucedida; uma falha posterior não os apaga
		if (g.steam.playtimeHours !== null) return { hours: g.steam.playtimeHours, origin: "steam" };
		if (g.gog.playtimeHours !== null && g.gog.playtimeHours >= g.hoursLocal) return { hours: g.gog.playtimeHours, origin: "gog" };
		return { hours: g.hoursLocal, origin: "vault" };
	}

	lastPlayed(g) {
		const sessionLast = g.sessions.map(s => this.iso(s.date)).filter(Boolean).sort().pop() || "";
		const steamLast = g.steam.lastPlayed;
		const raLast = g.ra.lastPlayed;
		const date = this.maxIso(sessionLast, steamLast, raLast, g.xbox.lastPlayed, g.gog.lastPlayed, g.lastPlayedField);
		const origin = date && date === steamLast ? "steam" : date && date === raLast ? "retroachievements" : date && date === g.xbox.lastPlayed ? "xbox" : date && date === g.gog.lastPlayed ? "gog" : date ? "vault" : "";
		return { date, origin };
	}

	// "platinado" = 100% das conquistas conhecidas. Status legado Platinum
	// só vale como fallback para jogos cujas conquistas não conhecemos.
	isPerfect(g) {
		if (g.ach.state === "known" || g.ach.state === "pct") return g.ach.perfect;
		return g.statusRaw === "Platinum";
	}

	// ============================================================ agregados
	libraryStats(model) {
		const games = model.games;
		const known = games.filter(g => g.ach.state === "known");
		const sum = (list, f) => list.reduce((s, x) => s + (f(x) || 0), 0);
		const byStatus = {};
		for (const k of Object.keys(this.statusDefs)) byStatus[k] = 0;
		for (const g of games) byStatus[g.status] = (byStatus[g.status] || 0) + 1;
		const rated = games.filter(g => g.rating > 0);
		const achTotal = sum(known, g => g.ach.total), achUnlocked = sum(known, g => g.ach.unlocked);
		return {
			games: games.length,
			hours: Math.round(sum(games, g => g.playtime.hours) * 10) / 10,
			byStatus,
			completed: byStatus.Completed,
			perfect: games.filter(g => this.isPerfect(g)).length,
			favorites: games.filter(g => g.favorite).length,
			achTotal, achUnlocked,
			achPct: achTotal ? Math.floor((achUnlocked / achTotal) * 1000) / 10 : null,
			achGamesKnown: known.length,
			avgRating: rated.length ? Math.round((sum(rated, g => g.rating) / rated.length) * 10) / 10 : null,
			spent: Math.round(sum(games, g => g.price) * 100) / 100,
			steamGames: games.filter(g => g.provider === "steam").length,
			// mais de uma origem com conquistas conhecidas: cards mostram a origem
			achMixed: new Set(known.filter(g => g.ach.total).map(g => g.provider)).size > 1,
			byProvider: Object.fromEntries(Object.keys(this.providerDefs).map(k => [k, games.filter(g => g.provider === k).length])),
			bySync: Object.fromEntries(Object.keys(this.syncDefs).map(k => [k, games.filter(g => g.sync === k).length]))
		};
	}

	// faixa de progresso de um jogo (filtros): perfect = todas, partial =
	// parcialmente, zero = nenhuma, unknown = sem número, none = sem conquistas
	progressBucket(g) {
		if (g.ach.state === "none") return "none";
		if (g.ach.state === "pct") return g.ach.perfect ? "perfect" : g.ach.pct > 0 ? "partial" : "zero";
		if (g.ach.state !== "known" || !g.ach.total) return "unknown";
		return g.ach.perfect ? "perfect" : g.ach.unlocked > 0 ? "partial" : "zero";
	}

	// Números do Achievement Hub por origem — calculados só quando alguma
	// tela pede, uma vez por revisão do modelo (nada roda ao abrir o vault).
	providerStats(model) {
		if (model.__svProv) return model.__svProv;
		const blank = () => ({ games: [], known: 0, total: 0, unlocked: 0, perfect: 0, partial: 0, zero: 0, unknown: 0, points: 0, pointsTotal: 0, pct: null, recent: [] });
		const out = { all: blank() };
		for (const k of Object.keys(this.providerDefs)) out[k] = blank();
		for (const g of model.games) {
			for (const b of [out.all, out[g.provider] || out.unset]) {
				b.games.push(g);
				const bucket = this.progressBucket(g);
				if (bucket in b) b[bucket]++;
				if (g.ach.state === "known" && g.ach.total) { b.known++; b.total += g.ach.total; b.unlocked += g.ach.unlocked; }
				for (const a of g.achievements) { b.pointsTotal += a.points || 0; if (a.unlocked) b.points += a.points || 0; }
			}
		}
		for (const b of Object.values(out)) {
			b.pct = b.total ? Math.floor((b.unlocked / b.total) * 1000) / 10 : null;
			b.perfectGames = b.perfect;
		}
		// recentes: uma passada só, depois distribuídas por origem
		const recent = model.games.flatMap(g => g.achievements.filter(a => a.unlocked && a.unlockedDate).map(a => ({ a, g })))
			.sort((x, y) => (y.a.unlockedDate + y.a.unlockedTime).localeCompare(x.a.unlockedDate + x.a.unlockedTime));
		out.all.recent = recent.slice(0, 24);
		for (const r of recent) { const b = out[r.g.provider]; if (b && b.recent.length < 24) b.recent.push(r); }
		// mais de uma origem com conquistas → os cards mostram a origem
		out.mixed = Object.keys(this.providerDefs).filter(k => out[k].total > 0).length > 1;
		model.__svProv = out;
		return out;
	}

	groupBy(games, keyFn) {
		const m = new Map();
		for (const g of games) for (const k of [].concat(keyFn(g)).filter(Boolean)) {
			if (!m.has(k)) m.set(k, []);
			m.get(k).push(g);
		}
		return m;
	}

	groupStats(list) {
		const known = list.filter(g => g.ach.state === "known");
		const t = known.reduce((s, g) => s + g.ach.total, 0), u = known.reduce((s, g) => s + g.ach.unlocked, 0);
		return {
			count: list.length,
			hours: Math.round(list.reduce((s, g) => s + g.playtime.hours, 0) * 10) / 10,
			completed: list.filter(g => g.status === "Completed").length,
			perfect: list.filter(g => this.isPerfect(g)).length,
			achPct: t ? Math.floor((u / t) * 100) : null,
			completionPct: list.length ? Math.round((list.filter(g => g.status === "Completed").length / list.length) * 100) : 0
		};
	}

	// ------------------------------------------------------------ atividade
	// Somente eventos com data real no vault. Nada é inventado.
	// o modelo não muda entre revisões: a mesma consulta é respondida do cache
	activity(model, { limit = 40, game = null } = {}) {
		// a lista inteira e ordenada é montada uma vez; cada pedido leva só o começo
		const key = game?.path || "";
		const memo = (model.__activity ||= new Map());
		if (!memo.has(key)) memo.set(key, this._activity(model, { limit: Infinity, game }));
		return memo.get(key).slice(0, limit);
	}

	_activity(model, { limit = 40, game = null } = {}) {
		const ev = [];
		const games = game ? [game] : model.games;
		for (const g of games) {
			if (g.dateAdded) ev.push({ type: "added", date: g.dateAdded, game: g });
			if (g.startDate) ev.push({ type: "started", date: g.startDate, game: g });
			if (g.completionDate) ev.push({ type: "completed", date: g.completionDate, game: g });
			for (const s of g.sessions) {
				const d = this.iso(s.date);
				if (d) ev.push({ type: "session", date: d, game: g, hours: this.num(s.hours), note: this.str(s.note) });
			}
			const unlockedByDay = new Map();
			for (const a of g.achievements) {
				if (!a.unlocked || !a.unlockedDate) continue;
				if (!unlockedByDay.has(a.unlockedDate)) unlockedByDay.set(a.unlockedDate, []);
				unlockedByDay.get(a.unlockedDate).push(a);
			}
			for (const [date, list] of unlockedByDay) {
				list.sort((x, y) => (x.rarity ?? 101) - (y.rarity ?? 101));
				ev.push({ type: "achievement", date, game: g, achievements: list, time: list.map(a => a.unlockedTime).sort().pop() || "" });
			}
			if (g.ach.state === "known" && g.ach.perfect && g.achievements.length) {
				const last = g.achievements.map(a => a.unlockedDate).filter(Boolean).sort().pop();
				if (last) ev.push({ type: "perfect", date: last, game: g });
			}
		}
		const rank = { perfect: 0, completed: 1, achievement: 2, session: 3, started: 4, added: 5 };
		ev.sort((a, b) => b.date.localeCompare(a.date) || String(b.time || "").localeCompare(String(a.time || "")) || rank[a.type] - rank[b.type]);
		return ev.slice(0, limit);
	}

	// --------------------------------------------------------- seleção de jogos
	continuePlaying(model, n = 12) {
		const score = g => this.maxIso(g.lastPlayed.date, g.startDate);
		return model.games
			.filter(g => ["Playing", "Paused"].includes(g.status) || (g.lastPlayed.date && g.status !== "Wishlist"))
			.sort((a, b) => ((b.status === "Playing") - (a.status === "Playing")) || score(b).localeCompare(score(a)))
			.slice(0, n);
	}

	// Jogos "Em destaque" (carrossel do topo da Home): os marcados com
	// featuredOnHome: true. Sem nenhum marcado, uma seleção automática — o
	// que está jogando agora e os jogos com arte, mais recentes primeiro.
	featuredGames(model, max = 8) {
		const games = model.games;
		if (!games.length) return [];
		const recent = (a, b) => b.lastPlayed.date.localeCompare(a.lastPlayed.date) || b.rating - a.rating;
		const pinned = games.filter(g => g.page?.featuredOnHome === true || g.page?.featuredOnHome === "true").sort(recent);
		if (pinned.length) return pinned.slice(0, max);
		const first = this.featuredGame(model, { auto: true });
		const art = g => !!(g.images.background || g.images.featured);
		const rest = games.filter(g => g !== first && g.status !== "Wishlist" && art(g))
			.sort((a, b) => ((b.status === "Playing") - (a.status === "Playing")) || recent(a, b));
		return [first, ...rest].filter(Boolean).slice(0, Math.min(max, 5));
	}

	featuredGame(model, { auto = false } = {}) {
		const games = model.games;
		if (!games.length) return null;
		if (!auto) { const list = this.featuredGames(model); if (list.length) return list[0]; }
		const playing = games.filter(g => g.status === "Playing").sort((a, b) => b.lastPlayed.date.localeCompare(a.lastPlayed.date));
		if (playing.length) return playing[0];
		const withArt = games.filter(g => g.images.background || g.images.featured);
		const pool = withArt.length ? withArt : games;
		return [...pool].sort((a, b) => b.lastPlayed.date.localeCompare(a.lastPlayed.date) || b.rating - a.rating)[0];
	}

	// ======================================================== schema da nota
	// Um lugar só gera o corpo e o frontmatter das notas. Formulário
	// "Adicionar jogo", importação em massa, Templater e sync da Steam
	// passam por aqui — antes eram três cópias divergentes.
	// a nota passa pelo Assets/steamvault-boot.js: mostra a tela de carregamento
	// enquanto o CustomJS não terminou de carregar (abertura do Obsidian)
	// Ao abrir o Obsidian no celular, o Dataview pode rodar o bloco antes de o
	// vault terminar de listar os arquivos ("custom view not found"): a linha
	// espera o boot aparecer (até 10 s) antes de chamá-lo.
	bootLine(kind) { return `for (let i = 0; i < 200 && !app.metadataCache.getFirstLinkpathDest("Assets/steamvault-boot.js", ""); i++) await new Promise(r => setTimeout(r, 50)); await dv.view("Assets/steamvault-boot", { page: "${kind}" });`; }

	noteBody(kind) {
		return ["```dataviewjs", this.bootLine(kind), "```", ""].join("\n");
	}

	gameSchema() {
		return [
			["title", ""], ["type", "game"], ["platform", ""], ["achievementProvider", "unset"], ["achievementSync", "none"],
			["steamAppId", ""], ["raGameId", ""], ["xboxTitleId", ""], ["gogId", ""], ["status", "Backlog"], ["favorite", false], ["rating", 0],
			["tier", ""], ["tierOrder", ""], ["franchise", ""], ["franchiseOrder", ""],
			["genre", []], ["subgenre", []], ["labels", []],
			["developer", ""], ["publisher", ""], ["releaseYear", ""], ["releaseDate", ""], ["summary", ""],
			["cover", ""], ["coverFicha", ""], ["background", ""], ["featured", ""], ["logo", ""], ["showLogo", true],
			["featuredOnHome", false],
			["bgPosX", 50], ["bgPosY", 50], ["bgZoom", 100], ["accent", ""],
			["hoursPlayed", 0], ["estimatedHours", ""], ["dateAdded", "__TODAY__"],
			["startDate", ""], ["completionDate", ""], ["lastPlayed", ""],
			["priority", ""], ["ownership", ""], ["difficultyRating", ""],
			["ratingGameplay", ""], ["ratingStory", ""], ["ratingGraphics", ""], ["ratingSoundtrack", ""], ["ratingFun", ""],
			["price", ""], ["currentPrice", ""], ["regularPrice", ""], ["discountPercent", ""], ["targetPrice", ""],
			["lowestSeenPrice", ""], ["lowestSeenDate", ""], ["priceCheckedAt", ""], ["priceStatus", ""], ["priceStore", ""], ["priceUrl", ""], ["buyLink", ""], ["wishlistReason", ""], ["wishlistAdded", ""], ["priceHistory", []], ["purchaseDate", ""],
			["achievementsEarned", 0], ["achievementsTotal", 0],
			["sessions", []], ["playthroughs", []], ["dlc", []], ["soundtrack", []], ["screenshots", []], ["notes", []],
			["tags", ["game"]], ["cssclasses", ["steamvault", "sv-game"]]
		];
	}

	_yamlValue(v) {
		if (Array.isArray(v)) return v.length ? `[${v.map(x => `"${this.yamlEscape(x)}"`).join(", ")}]` : "[]";
		if (typeof v === "boolean" || typeof v === "number") return String(v);
		if (v === "" || v === null || v === undefined) return '""';
		return `"${this.yamlEscape(v)}"`;
	}

	buildGameNote(values = {}) {
		const lines = ["---"];
		const ach = this.achievementFields(values.achievementProvider || values.achievementSource || values.gameType
			|| (values.steamAppId ? "steam" : values.raGameId ? "retroachievements" : "unset"), values.achievementSync);
		values = { ...values, ...ach };
		delete values.achievementSource; delete values.gameType;
		for (const [key, def] of this.gameSchema()) {
			let v = key in values ? values[key] : def;
			if (v === "__TODAY__") v = this.today();
			if (key === "type" || key === "status") { lines.push(`${key}: ${v}`); continue; }
			lines.push(`${key}: ${this._yamlValue(v)}`);
		}
		lines.push("---", "", this.noteBody("game"));
		return lines.join("\n");
	}

	async createGameNote(values) {
		const platform = this.safeFileName(values.platform, "Outros");
		const folder = `${this.folders.games}/${platform}`;
		if (!app.vault.getAbstractFileByPath(folder)) await app.vault.createFolder(folder).catch(() => {});
		const base = this.safeFileName(values.title, "Novo jogo");
		let path = `${folder}/${base}.md`, n = 2;
		while (app.vault.getAbstractFileByPath(path)) path = `${folder}/${base} ${n++}.md`;
		const file = await app.vault.create(path, this.buildGameNote({ ...values, platform }));
		this.invalidate();
		return file;
	}

	// página de gênero/plataforma (mesmo formato das existentes)
	buildCategoryNote(kind, title) {
		return ["---", `title: "${this.yamlEscape(title)}"`, `type: ${kind}`, 'cover: ""', 'description: ""',
			"cssclasses:", '  - "steamvault"', `  - "sv-${kind}"`, "---", "", this.noteBody(kind)].join("\n");
	}

	// devolve o arquivo da página (cria se não existir). Nunca duplica:
	// procura antes por qualquer nota do mesmo tipo com o mesmo nome.
	// tipo da coleção: o que estiver na nota; senão, um palpite pelo nome
	collectionKind(p) {
		const k = this.str(p.kind).toLowerCase();
		if (["goal", "marathon", "favorites", "free"].includes(k)) return k;
		const t = this.str(p.title) || p.file?.name || "";
		if (/^meta\b|\bmeta:/i.test(t)) return "goal";
		if (/favorit/i.test(t)) return "favorites";
		if (/maratona/i.test(t)) return "marathon";
		return "free";
	}

	// última atualização: campo "updated" da nota ou a data do arquivo
	collectionUpdated(p) {
		const fm = this.iso(p.updated);
		let ms = 0;
		try { const m = p.file?.mtime; ms = typeof m === "number" ? m : (m?.ts ?? m?.toMillis?.() ?? (m ? Date.parse(m) : 0)) || 0; } catch (_) { ms = 0; }
		const file = ms ? this.localIso(ms) : "";
		return [fm, file].filter(Boolean).sort().pop() || "";
	}

	async ensureCategoryNote(kind, title) {
		const folder = kind === "genre" ? "Genres" : kind === "subgenre" ? "Subgenres" : kind === "franchise" ? "Franchises" : "Platforms";
		const key = this.normalizeKey(title);
		const found = app.vault.getMarkdownFiles().find(f => {
			const fm = app.metadataCache.getFileCache(f)?.frontmatter;
			return fm?.type === kind && this.normalizeKey(fm.title || f.basename) === key;
		});
		if (found) return found;
		const safe = this.safeFileName(title, "Sem nome");
		if (!app.vault.getAbstractFileByPath(folder)) await app.vault.createFolder(folder).catch(() => {});
		let path = `${folder}/${safe}.md`, n = 2;
		while (app.vault.getAbstractFileByPath(path)) path = `${folder}/${safe} ${n++}.md`;
		return await app.vault.create(path, this.buildCategoryNote(kind, title));
	}

	buildAchievementNote(values = {}) {
		const fm = {
			type: "achievement", name: values.name || "", description: values.description || "",
			icon: values.icon || "", points: values.points ?? 0,
			unlocked: !!values.unlocked, unlockedDate: values.unlockedDate || "", unlockedTime: values.unlockedTime || "",
			game: values.gameLink || "", gamePath: values.gamePath || "",
			steamAppId: values.steamAppId || "", steamApiName: values.steamApiName || "",
			steamGlobalPercent: values.steamGlobalPercent ?? "", steamOrder: values.steamOrder ?? "",
			steamIconUrl: values.steamIconUrl || "", unlockSource: values.unlockSource || "",
			category: values.category || "", rarityTier: values.rarityTier || "", secret: !!values.secret,
			order: values.order ?? "", notes: values.notes || "",
			...(values.extra && typeof values.extra === "object" ? values.extra : {}),
			dateAdded: this.today(), cssclasses: ["steamvault", "sv-achievement"]
		};
		const lines = ["---"];
		for (const [k, v] of Object.entries(fm)) {
			if (k === "type") { lines.push("type: achievement"); continue; }
			lines.push(`${k}: ${this._yamlValue(v)}`);
		}
		lines.push("---", "", this.noteBody("achievement"));
		return lines.join("\n");
	}

	// ============================================================ diagnóstico
	// Problemas de DADOS, listados para corrigir na origem.
	audit(model) {
		const issues = [];
		const add = (level, area, message, path = "", label = "") => issues.push({ level, area, message, path, label });
		for (const g of model.games) {
			const p = g.page;
			if (p.cover && !g.images.cover) add("warn", "Imagens", `Capa não encontrada: ${p.cover}`, g.path);
			if (p.background && !this.resolveImage(p.background)) add("warn", "Imagens", `Fundo não encontrado: ${p.background}`, g.path);
			if (g.provider === "steam" && !g.steamAppId) add("warn", "Steam", "Jogo Steam sem steamAppId", g.path);
			if (g.provider === "retroachievements" && !g.raGameId && g.sync === "automatic") add("info", "RetroAchievements", "Jogo RA sem raGameId (o sync tenta ligar pelo título; se não achar, informe o ID)", g.path);
			if (g.raGameId && g.ra.status && !["ok", ""].includes(g.ra.status)) add("warn", "RetroAchievements", `Último sync falhou: ${g.ra.error || g.ra.status}`, g.path);
			const askedPv = this.str(p.achievementProvider), askedSync = this.str(p.achievementSync);
			if (!askedPv && (this.str(p.achievementSource) || this.str(p.gameType))) add("info", "Conquistas", "Campos antigos (achievementSource/gameType) — use Configurações › Migrar conquistas", g.path);
			else if (askedPv && !this.normalizeProvider(askedPv)) add("warn", "Conquistas", `achievementProvider desconhecido: ${askedPv}`, g.path);
			if (g.provider === "unset") add("info", "Conquistas", "Origem das conquistas não configurada", g.path);
			if (askedSync && (this.syncAliases[askedSync.toLowerCase()] || askedSync) !== g.sync) add("info", "Conquistas", `Sincronização "${askedSync}" não se aplica a ${g.providerLabel} — usando ${g.syncLabel}`, g.path);
			if (g.legacyAch.total > 0 && g.achievements.length && g.legacyAch.total !== g.achievements.length) {
				add("info", "Conquistas", `achievementsTotal=${g.legacyAch.total} mas há ${g.achievements.length} notas`, g.path);
			}
			if (g.lastPlayedField && g.lastPlayedField === g.dateAdded && !g.sessions.length && !g.steam.lastPlayed) {
				add("warn", "Datas", "lastPlayed igual a dateAdded sem nenhuma sessão (provável data automática)", g.path);
			}
			if (g.status === "Completed" && !g.completionDate) add("info", "Datas", "Zerado sem data de conclusão (completionDate):", g.path, g.title);
			for (const a of g.achievements) if (!a.iconSrc) add("info", "Imagens", `Conquista sem ícone em ${g.title}:`, a.path, a.name);
		}
		for (const d of model.duplicateAchievements) add("error", "Conquistas", `Duplicata (${d.key}) — mantida ${d.kept}`, d.dropped);
		for (const o of model.orphanAchievements) add("error", "Conquistas", "Conquista sem jogo correspondente", o);
		for (const c of model.collections) for (const m of c.missing) add("error", "Coleções", `Link para jogo inexistente: ${m}`, c.path);
		const genreNames = new Set(model.genres.map(x => this.normalizeKey(x.title)));
		const subNames = new Set((model.subgenres || []).map(x => this.normalizeKey(x.title)));
		const used = new Map(), usedSub = new Map();
		for (const g of model.games) {
			for (const x of g.genres) used.set(this.normalizeKey(x), x);
			for (const x of g.subgenres) usedSub.set(this.normalizeKey(x), x);
		}
		for (const [k, label] of used) if (!genreNames.has(k)) add("info", "Gêneros", `Gênero sem página: ${label}`);
		// subgênero sem página própria é normal (a página nasce no primeiro clique);
		// só avisa quando ele ainda usa uma página de gênero antiga
		for (const [k, label] of usedSub) if (!subNames.has(k) && genreNames.has(k) && !used.has(k)) add("info", "Subgêneros", `Subgênero com página de gênero (mova para Subgenres/ com type: subgenre): ${label}`);
		return issues;
	}
}
