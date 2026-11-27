// ===================================================================
// Game Library — Cuidados (3.23.0)
// ===================================================================
//   · Preferências entre aparelhos: as escolhas de aparência e de tela
//     (cor, layout da Início, filtros…) podem ser guardadas num arquivo
//     do vault, para o celular e o computador ficarem iguais. Só entram
//     as chaves da lista abaixo: nada de chaves, tokens ou dados de conta.
//   · Backup em um toque: um .zip com as notas da biblioteca dentro do
//     próprio vault (pasta Backups/), guardando os 5 mais recentes, e um
//     lembrete na Início quando o último passa de 30 dias.
// ===================================================================

class SteamVaultCare {
	constructor() {
		this.prefsPath = "Assets/game-library-preferencias.json";
		this.backupFolder = "Backups";
		this.keepBackups = 5;
		this.backupEveryDays = 30;
		// o que acompanha a pessoa entre aparelhos (o resto é do aparelho:
		// barra lateral, aba aberta, áreas seguras da tela…)
		this.syncKeys = ["accent", "homeLayout", "libraryView", "collView", "reducedMotion", "shine", "celebrate", "favStyle", "gamepad", "tilt", "haptics", "sfx", "sfxVol",
			"onboardHidden", "shareFormat", "statsPeriod", "goalsDone", "oled", "textScale", "backupRemind", "lang", "theme", "dailyLog", "monthSeen",
			// 3.58.0: Personalização da Interface (perfil de layout e combinações salvas)
			"layout", "layoutPresets"];
		this.syncPrefixes = ["lib:"];
		// pastas que entram no backup (só as notas .md)
		this.backupRoots = ["Games", "Achievements", "Collections", "Platforms", "Genres", "Subgenres", "Franchises", "Dashboard"];
	}

	get U() { return customJS.SteamVaultUI; }
	get C() { return customJS.SteamVaultCore; }

	// ============================================== preferências no vault
	_ls(key, value) {
		const k = `steamvault:ui:${key}`;
		try { if (value === undefined) return localStorage.getItem(k); if (value === null) localStorage.removeItem(k); else localStorage.setItem(k, value); } catch (_) { return null; }
	}
	isSynced(key) { return this.syncKeys.includes(key) || this.syncPrefixes.some(p => String(key).startsWith(p)); }
	syncOn() { return this._ls("prefsSync") === "1"; }

	// liga o aviso de escrita do UI._store (uma vez por sessão)
	bind() {
		const U = this.U;
		if (!U || U.__svCareBound) return;
		U.__svCareBound = true;
		U._onStore = key => { if (this.syncOn() && this.isSynced(key)) this._schedulePush(); };
	}

	_collect() {
		const out = {};
		try {
			for (let i = 0; i < localStorage.length; i++) {
				const k = localStorage.key(i);
				if (!k || !k.startsWith("steamvault:ui:")) continue;
				const key = k.slice("steamvault:ui:".length);
				if (this.isSynced(key)) out[key] = localStorage.getItem(k);
			}
		} catch (_) {}
		return out;
	}

	_schedulePush() {
		clearTimeout(this._pushTimer);
		this._pushTimer = setTimeout(() => this.push().catch(err => console.warn("Game Library: preferências", err)), 900);
	}

	async push() {
		const body = JSON.stringify({ app: "Game Library", kind: "preferences", updated: new Date().toISOString(), prefs: this._collect() }, null, 2);
		const f = app.vault.getAbstractFileByPath(this.prefsPath);
		if (f) await app.vault.modify(f, body);
		else {
			const dir = this.prefsPath.split("/").slice(0, -1).join("/");
			if (dir && !app.vault.getAbstractFileByPath(dir)) { try { await app.vault.createFolder(dir); } catch (_) {} }
			await app.vault.create(this.prefsPath, body);
		}
		const nf = app.vault.getAbstractFileByPath(this.prefsPath);
		if (nf?.stat) this._ls("prefsMtime", String(nf.stat.mtime));
	}

	// lê o arquivo quando ele mudou desde a última leitura (outro aparelho
	// salvou). Devolve true se alguma preferência mudou aqui.
	async pull(force = false) {
		const f = app.vault.getAbstractFileByPath(this.prefsPath);
		if (!f) return false;
		const mtime = String(f.stat?.mtime || "");
		if (!force && mtime && this._ls("prefsMtime") === mtime) return false;
		// 3.24.2: arquivo de preferências tem poucos KB; maior que 256 KB não é dele
		if (Number(f.stat?.size || 0) > 256 * 1024) return false;
		let data = null;
		try { data = JSON.parse(await app.vault.cachedRead(f)); } catch (_) { return false; }
		const prefs = data && typeof data.prefs === "object" ? data.prefs : null;
		if (!prefs) return false;
		let changed = false;
		for (const [k, v] of Object.entries(prefs).slice(0, 200)) {
			if (!this.isSynced(k) || k.length > 120 || /[\u0000-\u001F\u007F]/.test(k) || (v !== null && typeof v !== "string") || (typeof v === "string" && v.length > 20000)) continue;
			if (this._ls(k) !== v) { this._ls(k, v); changed = true; }
		}
		this._ls("prefsMtime", mtime);
		return changed;
	}

	// ligar: se outro aparelho já salvou, adota o que está no arquivo;
	// senão, este aparelho vira a referência
	async enable() {
		this._ls("prefsSync", "1");
		if (app.vault.getAbstractFileByPath(this.prefsPath)) { await this.pull(true); return "pulled"; }
		await this.push();
		return "pushed";
	}
	disable() { this._ls("prefsSync", "0"); }

	// ================================================================ backup
	_crcTable() {
		if (this.__crc) return this.__crc;
		const t = new Uint32Array(256);
		for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
		return (this.__crc = t);
	}
	_crc32(bytes) {
		const t = this._crcTable();
		let c = 0xffffffff;
		for (let i = 0; i < bytes.length; i++) c = t[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
		return (c ^ 0xffffffff) >>> 0;
	}
	async _deflate(bytes) {
		if (typeof CompressionStream !== "function") return null;
		try {
			const cs = new CompressionStream("deflate-raw");
			const out = new Response(new Blob([bytes]).stream().pipeThrough(cs));
			return new Uint8Array(await out.arrayBuffer());
		} catch (_) { return null; }
	}
	// .zip simples (deflate quando o aparelho oferece; senão sem compressão)
	async zip(entries, onStep) {
		const enc = new TextEncoder();
		const now = new Date();
		const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
		const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
		const parts = [], central = [];
		let offset = 0;
		for (let i = 0; i < entries.length; i++) {
			const { name, data } = entries[i];
			const nameB = enc.encode(name);
			const raw = typeof data === "string" ? enc.encode(data) : data;
			const crc = this._crc32(raw);
			const def = raw.length > 64 ? await this._deflate(raw) : null;
			const useDef = def && def.length < raw.length;
			const body = useDef ? def : raw;
			const h = new DataView(new ArrayBuffer(30));
			h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, useDef ? 8 : 0, true);
			h.setUint16(10, dosTime, true); h.setUint16(12, dosDate, true); h.setUint32(14, crc, true);
			h.setUint32(18, body.length, true); h.setUint32(22, raw.length, true); h.setUint16(26, nameB.length, true); h.setUint16(28, 0, true);
			parts.push(new Uint8Array(h.buffer), nameB, body);
			const c = new DataView(new ArrayBuffer(46));
			c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, useDef ? 8 : 0, true);
			c.setUint16(12, dosTime, true); c.setUint16(14, dosDate, true); c.setUint32(16, crc, true);
			c.setUint32(20, body.length, true); c.setUint32(24, raw.length, true); c.setUint16(28, nameB.length, true);
			c.setUint32(42, offset, true);
			central.push(new Uint8Array(c.buffer), nameB);
			offset += 30 + nameB.length + body.length;
			if (onStep && i % 25 === 0) { onStep(i, entries.length); await new Promise(r => setTimeout(r, 0)); }
		}
		const cdSize = central.reduce((s, b) => s + b.length, 0);
		const e = new DataView(new ArrayBuffer(22));
		e.setUint32(0, 0x06054b50, true); e.setUint16(8, entries.length, true); e.setUint16(10, entries.length, true);
		e.setUint32(12, cdSize, true); e.setUint32(16, offset, true);
		return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: "application/zip" });
	}

	backups() {
		const folder = app.vault.getAbstractFileByPath(this.backupFolder);
		const files = (folder?.children || []).filter(f => f.extension === "zip" && /^Game Library \d{4}-\d{2}-\d{2}/.test(f.name));
		return files.sort((a, b) => b.name.localeCompare(a.name));
	}
	lastBackup() {
		const f = this.backups()[0];
		if (!f) return null;
		const m = /(\d{4}-\d{2}-\d{2})/.exec(f.name);
		return { file: f, date: m ? m[1] : "" };
	}
	daysSinceBackup() {
		const last = this.lastBackup();
		if (!last?.date) return null;
		return Math.max(0, Math.floor((Date.now() - Date.parse(last.date + "T12:00:00")) / 86400000));
	}
	backupDue(model) {
		if (this._ls("backupRemind") === "0" || !model?.games?.length) return false;
		const snooze = Number(this._ls("backupSnooze") || 0);
		if (snooze && Date.now() < snooze) return false;
		const d = this.daysSinceBackup();
		// sem backup nenhum: lembra só quando a biblioteca já tem alguma coisa
		return d === null ? model.games.length >= 5 : d >= this.backupEveryDays;
	}
	snooze(days = 7) { this._ls("backupSnooze", String(Date.now() + days * 86400000)); }

	async backup(V) {
		const files = app.vault.getMarkdownFiles().filter(f => this.backupRoots.some(r => f.path.startsWith(r + "/")) && !f.path.includes("/_Templates/"));
		const t = V?.toast?.(`Preparando o backup de ${files.length} notas…`, { sticky: true, icon: "download", progress: 0 });
		try {
			const entries = [];
			for (let i = 0; i < files.length; i++) {
				entries.push({ name: files[i].path, data: await app.vault.cachedRead(files[i]) });
				if (i % 50 === 0) t?.update(`Lendo as notas (${i} de ${files.length})…`, { progress: Math.round((i / files.length) * 50) });
			}
			const prefs = app.vault.getAbstractFileByPath(this.prefsPath);
			if (prefs) entries.push({ name: this.prefsPath, data: await app.vault.cachedRead(prefs) });
			entries.push({ name: "LEIA-ME.txt", data: `Backup da Game Library (${this.C?.VERSION || ""}), ${new Date().toLocaleString("pt-BR")}.\n\n${files.length} notas da biblioteca (jogos, conquistas, coleções, categorias e telas).\nPara restaurar, descompacte por cima do vault. Imagens (Assets/) e scripts não entram: eles vêm do zip da versão.\n` });
			const blob = await this.zip(entries, (i, n) => t?.update(`Compactando (${i} de ${n})…`, { progress: 50 + Math.round((i / n) * 45) }));
			if (!app.vault.getAbstractFileByPath(this.backupFolder)) { try { await app.vault.createFolder(this.backupFolder); } catch (_) {} }
			const d = new Date(), pad = n => String(n).padStart(2, "0");
			let path = `${this.backupFolder}/Game Library ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}${pad(d.getMinutes())}.zip`;
			for (let i = 2; app.vault.getAbstractFileByPath(path); i++) path = path.replace(/( \(\d+\))?\.zip$/, ` (${i}).zip`);
			await app.vault.createBinary(path, await blob.arrayBuffer());
			// guarda só os mais recentes (os antigos vão para a lixeira do Obsidian)
			const old = this.backups().slice(this.keepBackups);
			for (const f of old) { try { await app.fileManager.trashFile(f); } catch (_) {} }
			this._ls("backupSnooze", null);
			const kb = Math.max(1, Math.round(blob.size / 1024));
			t?.update(`Backup salvo em ${path} (${kb >= 1024 ? (kb / 1024).toFixed(1).replace(".", ",") + " MB" : kb + " KB"})`, { tone: "ok", progress: null });
			t?.close(5000);
			return path;
		} catch (err) {
			console.error("Game Library: falha no backup", err);
			t?.update(`Não foi possível fazer o backup: ${err.message}`, { tone: "error", progress: null });
			t?.close(7000);
			return null;
		}
	}

	// lembrete compacto no topo da Início
	nudge(ctx) {
		const { U, model } = ctx;
		if (!this.backupDue(model)) return "";
		const d = this.daysSinceBackup();
		const text = d === null ? "Você ainda não tem nenhum backup da biblioteca." : `Seu último backup foi há ${U.plural(d, "dia", "dias")}.`;
		return `<section class="sv-nudge" aria-label="Lembrete de backup">
			<span class="sv-nudge-icon" aria-hidden="true">${U.icon("download")}</span>
			<p><b>${U.esc(text)}</b><span>Um toque guarda todas as notas num .zip dentro do vault.</span></p>
			<div class="sv-nudge-actions">${U.btn("Fazer backup", { icon: "download", kind: "primary", size: "sm", action: "backup-now" })}${U.btn("", { icon: "x", kind: "ghost", size: "sm", action: "backup-snooze", title: "Lembrar daqui a uma semana" })}</div>
		</section>`;
	}

	// ===================================================== IMPORTAR CSV (3.46.0)
	// Lê a exportação do Playnite, do Backloggd ou uma planilha simples e cria
	// as fichas dos jogos. Nada sai do aparelho: o arquivo é lido no próprio
	// Obsidian. Limites: 1000 linhas por vez, textos saneados e sem duplicar
	// (mesmo título na mesma plataforma, no vault ou no próprio arquivo).
	get csvLimit() { return 1000; }

	// CSV com aspas (RFC 4180); separador adivinhado entre vírgula, ponto e vírgula e tab
	parseCSV(text) {
		text = String(text ?? "").replace(/^﻿/, "");
		const head = text.slice(0, 4000).split(/\r?\n/)[0] || "";
		const counts = [",", ";", "\t"].map(d => [d, head.split(d).length]);
		const sep = counts.sort((a, b) => b[1] - a[1])[0][0];
		const rows = [];
		let row = [], cell = "", q = false;
		for (let i = 0; i < text.length; i++) {
			const ch = text[i];
			if (q) {
				if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
				else cell += ch;
			} else if (ch === '"' && cell === "") q = true;
			else if (ch === sep) { row.push(cell); cell = ""; }
			else if (ch === "\n" || ch === "\r") {
				if (ch === "\r" && text[i + 1] === "\n") i++;
				row.push(cell); cell = "";
				if (row.some(c => c.trim() !== "")) rows.push(row);
				row = [];
				if (rows.length > this.csvLimit + 1) break;
			} else cell += ch;
		}
		if (cell !== "" || row.length) { row.push(cell); if (row.some(c => c.trim() !== "")) rows.push(row); }
		return { sep, headers: (rows.shift() || []).map(h => h.trim()), rows };
	}

	// campos da ficha que a importação entende e os nomes de coluna de cada app
	csvFields() {
		return {
			title: ["name", "title", "game", "gamename", "jogo", "titulo", "nome"],
			platform: ["platform", "platforms", "plataforma", "plataformas", "console", "system", "sistema"],
			status: ["status", "completionstatus", "playstatus", "estado", "situacao"],
			hours: ["playtime", "hours", "hoursplayed", "timeplayed", "horas", "tempo", "tempodejogo", "playtimehours", "playtimeminutes", "playtimeseconds"],
			rating: ["rating", "userscore", "score", "myrating", "nota", "avaliacao"],
			genre: ["genres", "genre", "generos", "genero"],
			subgenre: ["subgenres", "subgenre", "subgeneros", "subgenero"],
			franchise: ["franchise", "franquia", "series", "serie"],
			favorite: ["favorite", "favourite", "favorito", "favoritos"],
			developer: ["developers", "developer", "desenvolvedora", "desenvolvedor"],
			publisher: ["publishers", "publisher", "publicadora", "distribuidora"],
			releaseYear: ["releasedate", "releaseyear", "release", "year", "ano", "lancamento"],
			dateAdded: ["added", "dateadded", "adicionado", "dataadicionado"],
			startDate: ["started", "datestarted", "startdate", "comecou", "inicio"],
			completionDate: ["completed", "completiondate", "finished", "datefinished", "datecompleted", "zerado", "zeradoem", "terminado"],
			lastPlayed: ["lastactivity", "lastplayed", "jogadoporultimo", "ultimavez"]
		};
	}
	csvLabels() {
		return { title: "Título", platform: "Plataforma", status: "Status", hours: "Horas", rating: "Nota", genre: "Gêneros", subgenre: "Subgêneros", franchise: "Franquia", favorite: "Favorito", developer: "Desenvolvedora", publisher: "Publicadora", releaseYear: "Ano de lançamento", dateAdded: "Adicionado em", startDate: "Começou em", completionDate: "Zerado em", lastPlayed: "Jogado por último" };
	}
	_ck(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, ""); }
	csvGuess(headers) {
		const keys = headers.map(h => this._ck(h)), map = {};
		for (const [f, names] of Object.entries(this.csvFields())) {
			let i = keys.findIndex(k => names.includes(k));
			if (i < 0) i = keys.findIndex(k => names.some(n => n.length > 3 && k.startsWith(n)));
			if (i >= 0 && !Object.values(map).includes(i)) map[f] = i;
		}
		return map;
	}

	// conversões de cada campo (tolerantes: o que não der para ler fica vazio)
	csvStatus(v) {
		const k = this._ck(v);
		const T = { notplayed: "Backlog", unplayed: "Backlog", plantoplay: "Backlog", backlog: "Backlog", owned: "Backlog", played: "Backlog", naojogado: "Backlog",
			playing: "Playing", jogando: "Playing", inprogress: "Playing", emandamento: "Playing",
			beaten: "Completed", completed: "Completed", finished: "Completed", mastered: "Completed", zerado: "Completed", concluido: "Completed", platinado: "Completed",
			onhold: "Paused", paused: "Paused", shelved: "Paused", pausado: "Paused",
			abandoned: "Dropped", dropped: "Dropped", retired: "Dropped", abandonado: "Dropped",
			wishlist: "Wishlist", listadedesejos: "Wishlist", wanttoplay: "Wishlist" };
		return T[k] || "";
	}
	csvHours(v, header, unit = "") {
		const s = String(v || "").trim(), h = this._ck(header);
		if (!s) return 0;
		let m = /^(\d+):(\d{1,2})(?::(\d{1,2}))?$/.exec(s);
		if (m) return Number(m[1]) + Number(m[2]) / 60 + (Number(m[3] || 0) / 3600);
		m = /(?:(\d+(?:[.,]\d+)?)\s*h)?\s*(?:(\d+)\s*m(?:in)?)?/i.exec(s);
		if (m && (m[1] || m[2]) && /[hm]/i.test(s)) return (Number(String(m[1] || 0).replace(",", ".")) || 0) + (Number(m[2] || 0) / 60);
		const n = Number(s.replace(/\s/g, "").replace(",", "."));
		if (!isFinite(n) || n < 0) return 0;
		if (/second|segundo/.test(h) || unit === "s") return n / 3600;
		if (/minut/.test(h) || unit === "m") return n / 60;
		return n;
	}
	csvDate(v) {
		const s = String(v || "").trim();
		let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
		if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
		m = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})/.exec(s);
		if (m) {
			// dia/mês quando der para saber; senão o formato brasileiro
			let d = Number(m[1]), mo = Number(m[2]);
			if (mo > 12 && d <= 12) [d, mo] = [mo, d];
			if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) return `${m[3]}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
		}
		const t = Date.parse(s);
		if (s.length >= 8 && !isNaN(t)) { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
		return "";
	}
	csvYear(v) { const m = /(19[5-9]\d|20\d\d)/.exec(String(v || "")); return m ? m[1] : ""; }
	csvList(v) { return String(v || "").split(/\s*[,;|]\s*/).map(x => this.C.clip(x.replace(/[\u0000-\u001F\u007F]/g, "").trim(), 60)).filter(Boolean).slice(0, 8); }
	// nome da plataforma no formato do vault (PC, PS2, PSP, SNES…)
	csvPlatform(v) {
		let s = String(v || "").split(/\s*[,;|]\s*/)[0].replace(/[\u0000-\u001F\u007F]/g, "").trim();
		if (!s) return "";
		const k = this._ck(s.replace(/\(.*?\)/g, "")).replace(/^(sony|nintendo|microsoft|sega|atari|nec|snk)/, "");
		const T = { pc: "PC", windows: "PC", pcwindows: "PC", steam: "PC", gog: "PC", epicgames: "PC", mac: "PC", macos: "PC", linux: "PC",
			playstation: "PS1", playstation1: "PS1", psx: "PS1", ps1: "PS1", playstation2: "PS2", ps2: "PS2", playstation3: "PS3", ps3: "PS3", playstation4: "PS4", ps4: "PS4", playstation5: "PS5", ps5: "PS5",
			playstationportable: "PSP", psp: "PSP", playstationvita: "PS Vita", psvita: "PS Vita", vita: "PS Vita", playstationportal: "PS Portal",
			entertainmentsystem: "NES", nes: "NES", famicom: "NES", superentertainmentsystem: "SNES", supernintendoentertainmentsystem: "SNES", supernintendo: "SNES", snes: "SNES", superfamicom: "SNES",
			"64": "N64", n64: "N64", nintendo64: "N64", gamecube: "GameCube", gc: "GameCube", wii: "Wii", wiiu: "Wii U", switch: "Switch", switch2: "Switch 2",
			gameboy: "Game Boy", gb: "Game Boy", gameboycolor: "GBC", gbc: "GBC", gameboyadvance: "GBA", gba: "GBA", ds: "NDS", nds: "NDS", "3ds": "3DS", new3ds: "3DS",
			xbox: "Xbox", xbox360: "Xbox 360", xboxone: "Xbox One", xboxseriesx: "Xbox Series", xboxseriess: "Xbox Series", xboxseriesxs: "Xbox Series", xboxseries: "Xbox Series",
			mastersystem: "Master System", megadrive: "Mega Drive", genesis: "Mega Drive", saturn: "Saturn", dreamcast: "Dreamcast", gamegear: "Game Gear", segacd: "Sega CD", megacd: "Sega CD", "32x": "32X",
			android: "Android", ios: "iOS", iphone: "iOS", steamdeck: "Steam Deck", neogeo: "Neo Geo", pcengine: "PC Engine", turbografx16: "PC Engine", lynx: "Atari Lynx", jaguar: "Atari Jaguar", "2600": "Atari 2600" };
		return T[k] || this.C.clip(s, 40);
	}
	csvRows(parsed, map, { platform = "PC", status = "Backlog" } = {}, ctx) {
		const C = this.C, H = parsed.headers;
		const col = (r, f) => map[f] !== undefined && map[f] >= 0 ? String(r[map[f]] ?? "").trim() : "";
		const ratings = map.rating !== undefined ? parsed.rows.map(r => Number(String(col(r, "rating")).replace(",", "."))).filter(n => isFinite(n) && n > 0) : [];
		const rMax = ratings.length ? Math.max(...ratings) : 0;
		const scale = rMax > 10 ? 20 : rMax > 5 ? 2 : 1;
		// coluna de tempo sem unidade no nome: o Playnite grava segundos. Se algum
		// valor passa de 10 mil, a coluna inteira é lida como segundos.
		const hHead = map.hours !== undefined ? this._ck(H[map.hours]) : "";
		const hVals = map.hours !== undefined ? parsed.rows.map(r => Number(String(col(r, "hours")).replace(/\s/g, "").replace(",", "."))).filter(n => isFinite(n)) : [];
		// o Playnite sempre grava "Playtime" em segundos: reconhece pelos nomes das colunas dele
		const keys = H.map(h => this._ck(h));
		const playnite = hHead === "playtime" && (keys.includes("completionstatus") || keys.includes("platforms") || keys.includes("sources"));
		const unit = !/hour|hora|minut|second|segundo/.test(hHead) && (playnite || hVals.some(n => n > 10000)) ? "s" : "";
		const have = new Set(ctx.model.games.map(g => `${C.normalizeKey(g.title)}|${C.normalizeKey(g.platform)}`));
		const seen = new Set(), fresh = [], dup = [], bad = [];
		for (const r of parsed.rows.slice(0, this.csvLimit)) {
			const title = C.clip(col(r, "title").replace(/[\u0000-\u001F\u007F]/g, "").trim(), 120);
			if (title.length < 1) { bad.push(r); continue; }
			const plat = this.csvPlatform(col(r, "platform")) || platform;
			const key = `${C.normalizeKey(title)}|${C.normalizeKey(plat)}`;
			if (seen.has(key)) continue;
			seen.add(key);
			const rv = Number(col(r, "rating").replace(",", "."));
			const hours = Math.round(this.csvHours(col(r, "hours"), map.hours !== undefined ? H[map.hours] : "", unit) * 10) / 10;
			const v = { title, platform: plat, status: this.csvStatus(col(r, "status")) || status,
				hoursPlayed: hours > 0 && hours < 100000 ? hours : 0,
				rating: isFinite(rv) && rv > 0 ? Math.min(5, Math.round((rv / scale) * 2) / 2) : 0,
				genre: this.csvList(col(r, "genre")), subgenre: this.csvList(col(r, "subgenre")),
				franchise: C.clip(col(r, "franchise").replace(/[\u0000-\u001F\u007F]/g, ""), 80),
				favorite: /^(yes|sim|true|1|x|s|y)$/i.test(col(r, "favorite")),
				developer: C.clip(this.csvList(col(r, "developer"))[0] || "", 80), publisher: C.clip(this.csvList(col(r, "publisher"))[0] || "", 80),
				releaseYear: Number(this.csvYear(col(r, "releaseYear"))) || "", startDate: this.csvDate(col(r, "startDate")), completionDate: this.csvDate(col(r, "completionDate")), lastPlayed: this.csvDate(col(r, "lastPlayed")) };
			const added = this.csvDate(col(r, "dateAdded"));
			if (added) v.dateAdded = added;
			if (v.completionDate && v.status === "Backlog") v.status = "Completed";
			(have.has(key) ? dup : fresh).push(v);
		}
		return { fresh, dup, bad: bad.length, cut: Math.max(0, parsed.rows.length - this.csvLimit) };
	}

	// janela: escolher o arquivo (ou colar), conferir as colunas e importar
	openCsvImport(ctx, V) {
		const U = this.U, C = this.C;
		const plats = [...new Set(ctx.model.games.map(g => g.platform).filter(Boolean))].sort((a, b) => a.localeCompare(b));
		if (!plats.includes("PC")) plats.unshift("PC");
		const labels = this.csvLabels();
		let parsed = null, map = {};
		const body = document.createElement("div");
		body.className = "sv-csv";
		body.innerHTML = `<div class="sv-csv-pick">
				<label class="sv-btn sv-btn--secondary sv-csv-file">${U.icon("upload")}<span>Escolher arquivo .csv</span><input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" data-csv-file hidden></label>
				<details class="sv-csv-paste"><summary>Ou colar o conteúdo</summary><textarea class="sv-input" rows="5" data-csv-text placeholder="Um título por linha, ou um CSV com cabeçalho (Name,Platform,Status…)"></textarea>${U.btn("Ler o texto", { kind: "secondary", size: "sm", attrs: "data-csv-read" })}</details>
				<p class="sv-muted sv-csv-help">Funciona com a exportação do <b>Playnite</b> (extensão Library Exporter), do <b>Backloggd</b> e com qualquer planilha salva como CSV com uma coluna de título. Também aceita uma lista simples, com um título por linha. O arquivo é lido aqui mesmo, sem sair do aparelho.</p>
			</div>
			<div class="sv-csv-preview" data-csv-preview hidden></div>`;
		const m = V.modal({ title: "Importar biblioteca", sub: "Crie as fichas de vários jogos de uma vez", size: "md", body,
			actions: `${U.btn("Cancelar", { kind: "ghost", attrs: "data-close" })}${U.btn("Importar", { kind: "primary", icon: "download", attrs: "data-csv-go disabled" })}` });
		const go = m.el.querySelector("[data-csv-go]");
		const opts = () => ({ platform: body.querySelector("[data-csv-plat]")?.value || "PC", status: body.querySelector("[data-csv-status]")?.value || "Backlog" });
		const paint = () => {
			const box = body.querySelector("[data-csv-preview]");
			if (!parsed || !parsed.headers.length) { box.hidden = false; box.innerHTML = `<p class="sv-formmsg is-warn">Não encontrei colunas nesse arquivo.</p>`; go.disabled = true; return; }
			const res = this.csvRows(parsed, map, opts(), ctx);
			const fieldSel = f => `<label class="sv-csv-map"><span>${U.esc(labels[f])}</span><span class="sv-select"><select data-csv-map="${f}"><option value="-1">— nenhuma —</option>${parsed.headers.map((h, i) => `<option value="${i}"${map[f] === i ? " selected" : ""}>${U.esc(h || `Coluna ${i + 1}`)}</option>`).join("")}</select></span></label>`;
			if (box.hidden && V._motionOn?.()) { box.classList.add("is-first"); setTimeout(() => box.classList.remove("is-first"), 900); }
			box.hidden = false;
			box.innerHTML = `<div class="sv-csv-sum">
					<b>${U.plural(res.fresh.length, "jogo novo", "jogos novos")}</b>
					${res.dup.length ? `<span>${U.plural(res.dup.length, "já está no vault", "já estão no vault")} (fica de fora)</span>` : ""}
					${res.bad ? `<span>${U.plural(res.bad, "linha sem título", "linhas sem título")}</span>` : ""}
					${res.cut ? `<span>${U.plural(res.cut, "linha passou do limite de 1000", "linhas passaram do limite de 1000")}</span>` : ""}
				</div>
				<div class="sv-csv-defaults">
					<label class="sv-csv-map"><span>Plataforma quando faltar</span><span class="sv-select"><select data-csv-plat>${plats.map(p => `<option${p === opts().platform ? " selected" : ""}>${U.esc(p)}</option>`).join("")}</select></span></label>
					<label class="sv-csv-map"><span>Status quando faltar</span><span class="sv-select"><select data-csv-status>${Object.entries(C.statusDefs).map(([k, d]) => `<option value="${k}"${k === opts().status ? " selected" : ""}>${U.esc(d.label)}</option>`).join("")}</select></span></label>
				</div>
				<details class="sv-csv-cols"${map.title === undefined ? " open" : ""}><summary>Colunas reconhecidas (${Object.keys(map).length} de ${Object.keys(labels).length})</summary><div class="sv-csv-maps">${Object.keys(labels).map(fieldSel).join("")}</div></details>
				${res.fresh.length ? `<div class="sv-csv-table" role="region" aria-label="Prévia" tabindex="0"><table><thead><tr><th>Título</th><th>Plataforma</th><th>Status</th><th>Horas</th><th>Nota</th></tr></thead><tbody>${res.fresh.slice(0, 8).map(v => `<tr><td>${U.esc(v.title)}</td><td>${U.esc(v.platform)}</td><td>${U.esc(C.statusDefs[v.status]?.label || v.status)}</td><td class="sv-num">${v.hoursPlayed ? U.esc(U.fmtHours(v.hoursPlayed)) : "—"}</td><td class="sv-num">${v.rating ? U.esc(U.fmtNum(v.rating, 1)) : "—"}</td></tr>`).join("")}</tbody></table>${res.fresh.length > 8 ? `<p class="sv-fineprint">e mais ${U.fmtNum(res.fresh.length - 8)}…</p>` : ""}</div>` : map.title === undefined ? `<p class="sv-formmsg is-warn">Escolha qual coluna tem o título do jogo.</p>` : ""}`;
			go.disabled = !res.fresh.length;
			go.querySelector("span") && (go.querySelector("span").textContent = res.fresh.length ? `Importar ${U.plural(res.fresh.length, "jogo", "jogos")}` : "Importar");
		};
		const load = text => {
			parsed = this.parseCSV(text);
			map = this.csvGuess(parsed.headers);
			// lista simples (um título por linha, sem cabeçalho reconhecido): cada
			// linha inteira é um título, mesmo com vírgula ("Batman: Arkham, GOTY")
			// com uma coluna só, o cabeçalho precisa ser exatamente um nome de coluna
			// ("Jogo", "Título", "Name"); "Jogo Desfazer Um" é um jogo, não um cabeçalho
			const oneCol = parsed.headers.length === 1 && !Object.values(this.csvFields()).some(n => n.includes(this._ck(parsed.headers[0])));
			if (oneCol || (map.title === undefined && Object.keys(map).length === 0)) {
				const lines = String(text ?? "").replace(/^\uFEFF/, "").split(/\r?\n/).map(l => l.replace(/^\s*(?:[-*•]|\d{1,3}[.)])\s+/, "").trim()).filter(l => l.length > 1).slice(0, this.csvLimit + 1);
				parsed = { sep: "\n", headers: ["Título"], rows: lines.map(l => [l]) };
				map = { title: 0 };
			}
			paint();
		};
		body.querySelector("[data-csv-file]").addEventListener("change", async e => {
			const f = e.target.files?.[0];
			if (!f) return;
			if (f.size > 5 * 1024 * 1024) return V.toast("Arquivo grande demais (máximo de 5 MB)", { tone: "warn" });
			load(await f.text());
		});
		body.querySelector("[data-csv-read]").addEventListener("click", () => load(body.querySelector("[data-csv-text]").value));
		body.addEventListener("change", e => {
			const s = e.target.closest("[data-csv-map]");
			if (s) { const v = Number(s.value); if (v < 0) delete map[s.dataset.csvMap]; else map[s.dataset.csvMap] = v; paint(); return; }
			if (e.target.closest("[data-csv-plat], [data-csv-status]")) paint();
		});
		go.addEventListener("click", async () => {
			if (!parsed) return;
			const res = this.csvRows(parsed, map, opts(), ctx);
			if (!res.fresh.length) return;
			go.disabled = true;
			const rec = this.undoBegin(`importação de ${U.plural(res.fresh.length, "jogo", "jogos")}`);
			let done = 0, fail = 0;
			for (const [i, v] of res.fresh.entries()) {
				if (i % 10 === 0) go.querySelector("span") && (go.querySelector("span").textContent = `Criando ${i + 1} de ${res.fresh.length}…`);
				try { await C.createGameNote({ ...v, achievementProvider: "unset" }); done++; } catch (err) { fail++; console.warn("Game Library: importar CSV", v.title, err); }
			}
			C.invalidate();
			m.close();
			const undo = this.undoCommit(rec);
			this.undoToast(V, `${U.plural(done, "jogo importado", "jogos importados")}${fail ? ` · ${U.plural(fail, "falhou", "falharam")}` : ""}`, undo, fail ? "warn" : "ok", "download");
			setTimeout(() => V.refresh(), 250);
		});
	}

	// ===================================================== SAÚDE DA BIBLIOTECA (3.48.0)
	// O que falta ou está repetido nas fichas, com correção em lote:
	// capas (buscadas na loja pública da Steam pelo nome), plataformas com
	// nome fora do padrão e jogos provavelmente duplicados.
	healthData(ctx) {
		const { C, model } = ctx;
		const B = customJS.SteamVaultBrowse;
		const games = model.games;
		const known = name => !!(B?.platformDefaults?.(name)) || model.platforms.some(p => C.normalizeKey(p.title) === C.normalizeKey(name));
		const noCover = games.filter(g => !g.images.cover);
		const noGenre = games.filter(g => !g.genres.length);
		const noYear = games.filter(g => !g.releaseYear);
		const noDev = games.filter(g => !g.developer);
		// plataforma fora do padrão: o nome que o vault usa para ela, quando existe
		const platRename = new Map();
		for (const g of games) {
			if (!g.platform || platRename.has(g.platform)) continue;
			const canon = this.csvPlatform(g.platform);
			if (canon && canon !== g.platform && known(canon)) platRename.set(g.platform, canon);
		}
		const platUnknown = [...new Set(games.map(g => g.platform).filter(p => p && !known(p) && !platRename.has(p)))];
		// duplicata provável: mesmo título na mesma plataforma (com o nome padronizado)
		const groups = new Map();
		for (const g of games) {
			const k = `${C.normalizeKey(g.title)}|${C.normalizeKey(platRename.get(g.platform) || g.platform)}`;
			if (!groups.has(k)) groups.set(k, []);
			groups.get(k).push(g);
		}
		const dups = [...groups.values()].filter(l => l.length > 1);
		return { noCover, noGenre, noYear, noDev, platRename, platUnknown, dups, total: games.length };
	}
	healthScore(h) {
		if (!h.total) return 100;
		const miss = h.noCover.length + h.noGenre.length * 0.6 + h.noYear.length * 0.3 + h.noDev.length * 0.3;
		const per = miss / (h.total * 2.2);
		return Math.max(0, Math.round(100 - per * 100 - h.dups.length * 2 - h.platRename.size * 2));
	}

	openHealth(ctx, V) {
		const U = this.U;
		const body = document.createElement("div");
		body.className = "sv-health";
		const list = (games, max = 12) => `<ul class="sv-health-list">${games.slice(0, max).map(g => `<li><a ${U.openAttrs(g.path)}>${U.cover(g, { cls: "sv-cover--xs" })}<span><b>${U.esc(g.title)}</b><small>${U.esc(g.platform || "Sem plataforma")}</small></span></a></li>`).join("")}${games.length > max ? `<li class="sv-health-more">e mais ${U.fmtNum(games.length - max)}</li>` : ""}</ul>`;
		const paint = () => {
			const h = this.healthData(ctx), score = this.healthScore(h);
			const ok = !h.noCover.length && !h.noGenre.length && !h.noYear.length && !h.noDev.length && !h.platRename.size && !h.platUnknown.length && !h.dups.length;
			const sec = (icon, title, n, sub, inner, action = "") => n ? `<section class="sv-health-sec"><header><span class="sv-health-ico">${U.icon(icon)}</span><div><b>${U.esc(title)}</b><small>${U.esc(sub)}</small></div><span class="sv-health-n">${U.fmtNum(n)}</span></header>${action ? `<div class="sv-row-actions">${action}</div>` : ""}${inner}</section>` : "";
			body.innerHTML = `<div class="sv-health-top">
					<div class="sv-health-ring">${U.ring(score, { size: 72, stroke: 6, perfect: score === 100 })}<span>${score}</span></div>
					<div><b>${ok ? "Tudo em ordem" : score >= 85 ? "Quase tudo em ordem" : "Dá para deixar mais completa"}</b><small>${U.plural(h.total, "jogo verificado", "jogos verificados")}. A nota sobe conforme capas, gêneros e dados ficam completos.</small></div>
				</div>
				${ok ? U.empty({ icon: "check", title: "Nada para corrigir", text: "Todas as fichas têm capa, gênero, ano e desenvolvedora, e não há duplicatas.", compact: true }) : ""}
				${sec("image", "Sem capa", h.noCover.length, "Procura cada jogo na loja pública da Steam pelo nome e baixa capa, fundo e logo quando o nome bate.", list(h.noCover), U.btn(`Buscar ${U.plural(Math.min(40, h.noCover.length), "capa", "capas")} na Steam`, { icon: "download", kind: "primary", size: "sm", attrs: "data-health-covers" }))}
				${sec("layers", "Possíveis duplicatas", h.dups.length, "Mesmo título na mesma plataforma. Abra as fichas e apague a que sobrar.", `<ul class="sv-health-list">${h.dups.slice(0, 10).map(l => `<li class="sv-health-dup">${l.map(g => `<a ${U.openAttrs(g.path)}><span><b>${U.esc(g.title)}</b><small>${U.esc(g.path)}</small></span></a>`).join("")}</li>`).join("")}</ul>`)}
				${sec("monitor", "Plataformas com nome fora do padrão", h.platRename.size, "Com o nome padrão, a plataforma ganha ícone, cor e página certos.", `<ul class="sv-health-renames">${[...h.platRename].map(([a, b]) => `<li><span>${U.esc(a)}</span>${U.icon("chevronRight")}<b>${U.esc(b)}</b></li>`).join("")}</ul>`, U.btn("Usar os nomes padrão", { icon: "check", kind: "secondary", size: "sm", attrs: "data-health-plat" }))}
				${sec("alert", "Plataformas não reconhecidas", h.platUnknown.length, "Funcionam normalmente; só ficam com o ícone genérico. Dá para escolher ícone e cor em Editar identidade.", `<p class="sv-health-tags">${h.platUnknown.map(p => `<span class="sv-tag">${U.esc(p)}</span>`).join("")}</p>`)}
				${sec("tag", "Sem gênero", h.noGenre.length, "O gênero alimenta Gêneros, Estatísticas e as sugestões do que jogar.", list(h.noGenre, 8))}
				${sec("calendar", "Sem ano de lançamento", h.noYear.length, "Usado no agrupamento por ano e na linha do tempo.", list(h.noYear, 8))}
				${sec("user", "Sem desenvolvedora", h.noDev.length, "Aparece na ficha e permite ver os outros jogos do mesmo estúdio.", list(h.noDev, 8))}`;
		};
		paint();
		// o anel parte do vazio e enche até a nota (some com "Reduzir animações")
		const fill = body.querySelector(".sv-health-ring .sv-ring-fill");
		if (fill && V._motionOn?.()) {
			fill.style.transition = "none"; fill.style.strokeDashoffset = fill.getAttribute("stroke-dasharray") || "";
			requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.transition = ""; fill.style.strokeDashoffset = ""; }));
		}
		const m = V.modal({ title: "Saúde da biblioteca", sub: "O que falta ou está repetido nas fichas", size: "md", body, actions: U.btn("Fechar", { kind: "ghost", attrs: "data-close" }) });
		body.addEventListener("click", async e => {
			const cov = e.target.closest("[data-health-covers]");
			if (cov) { cov.disabled = true; m.close(); await this.findCovers(ctx, V, this.healthData(ctx).noCover.slice(0, 40), null); return; }
			const pl = e.target.closest("[data-health-plat]");
			if (pl) {
				pl.disabled = true;
				const h = this.healthData(ctx);
				const rec = this.undoBegin("nomes de plataforma padronizados", ctx.model.games.filter(g => h.platRename.has(g.platform)), ["platform"]);
				let n = 0;
				for (const g of ctx.model.games) {
					const to = h.platRename.get(g.platform);
					const f = to && app.vault.getAbstractFileByPath(g.path);
					if (!f) continue;
					await app.fileManager.processFrontMatter(f, fm => { fm.platform = to; });
					n++;
				}
				this.C.invalidate();
				this.undoToast(V, `${U.plural(n, "ficha atualizada", "fichas atualizadas")}`, this.undoCommit(rec));
				m.close();
				setTimeout(() => V.refresh(), 250);
			}
		});
	}

	// capas: com AppID usa a arte dele; sem AppID procura o nome na loja da
	// Steam e só aceita quando o nome bate (sem palpite)
	async findCovers(ctx, V, games, btn) {
		const U = this.U, S = customJS.SteamVaultSteam, PK = customJS.SteamVaultPicks;
		if (!S?.fetchArt || !PK?._get) return V.toast("Módulos da Steam ausentes", { tone: "warn" });
		const norm = t => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[™®©]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
		const t = V.toast("Procurando capas na Steam…", { sticky: true, icon: "image", progress: 0 });
		const rec = this.undoBegin(`capas de ${U.plural(games.length, "jogo", "jogos")}`, games, ["cover", "background", "featured", "logo"]);
		let saved = 0, miss = 0, fail = 0;
		for (let i = 0; i < games.length; i++) {
			const g = games[i];
			t.update(`Capas: ${g.title} (${i + 1}/${games.length})`, { progress: ((i + 1) / games.length) * 100 });
			const f = app.vault.getAbstractFileByPath(g.path);
			if (!f) { fail++; continue; }
			try {
				let appId = g.steamAppId || "";
				if (!appId) {
					const j = await PK._get(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(g.title)}&cc=br&l=brazilian`, { as: "json" });
					const hit = (j?.items || []).find(x => norm(x.name) === norm(g.title));
					appId = hit ? String(hit.id) : "";
				}
				if (!/^\d+$/.test(String(appId))) { miss++; continue; }
				const r = await S.fetchArt(f, { appId });
				if (r.ok) saved++; else miss++;
			} catch (_) { fail++; }
		}
		this.C.invalidate();
		const undo = saved ? this.undoCommit(rec) : null;
		if (undo) { t.close(0); this.undoToast(V, `Capas em ${U.plural(saved, "jogo", "jogos")}${miss ? ` · ${U.plural(miss, "sem correspondência na Steam", "sem correspondência na Steam")}` : ""}`, undo, "ok", "image"); if (btn) btn.disabled = false; setTimeout(() => V.refresh(), 300); return; }
		t.update(saved ? `Capas em ${U.plural(saved, "jogo", "jogos")}${miss ? ` · ${U.plural(miss, "sem correspondência na Steam", "sem correspondência na Steam")}` : ""}${fail ? ` · ${fail} com erro de rede` : ""}` : fail && !miss ? "Sem conexão com a loja da Steam agora" : "Nenhum desses nomes foi encontrado na Steam", { tone: saved ? "ok" : "warn" });
		t.close(5000);
		if (btn) btn.disabled = false;
		setTimeout(() => V.refresh(), 300);
	}

	// ===================================================== DESFAZER (3.50.0)
	// A última ação em lote (importar, padronizar plataformas, buscar capas)
	// fica registrada: fichas criadas vão para a lixeira do Obsidian, campos
	// alterados voltam ao valor anterior e imagens baixadas pela ação saem.
	// O registro fica no aparelho por 24 h (só caminhos e valores antigos).
	get undoTtl() { return 24 * 3600 * 1000; }
	_fileSet() { return new Set(app.vault.getFiles().map(f => f.path)); }
	// antes da ação: lembra os arquivos que existem e os campos que podem mudar
	undoBegin(label, games = [], fields = []) {
		const before = new Map();
		for (const g of games) {
			const f = app.vault.getAbstractFileByPath(g.path || g);
			const fm = f ? app.metadataCache.getFileCache(f)?.frontmatter || {} : {};
			before.set(f?.path || g.path || g, Object.fromEntries(fields.map(k => [k, k in fm ? fm[k] : null])));
		}
		return { label, at: Date.now(), files: this._fileSet(), before, fields };
	}
	// depois da ação: guarda só o que mudou
	undoCommit(rec) {
		const now = this._fileSet();
		const created = [...now].filter(p => !rec.files.has(p));
		// valores antigos de todas as fichas envolvidas (o índice de metadados do
		// Obsidian pode demorar um instante para refletir a gravação; restaurar
		// um valor que não mudou é inofensivo)
		const restore = [...rec.before].filter(([, old]) => Object.keys(old).length).map(([path, old]) => ({ path, old }));
		if (!created.length && !restore.length) return null;
		const data = { label: rec.label, at: rec.at, created: created.slice(0, 2000), restore: restore.slice(0, 2000) };
		this._ls("undoBatch", JSON.stringify(data));
		return data;
	}
	undoInfo() {
		let d = null;
		try { d = JSON.parse(this._ls("undoBatch") || "null"); } catch (_) {}
		if (!d || !d.at || Date.now() - d.at > this.undoTtl) return null;
		return d;
	}
	async undoLast(V) {
		const d = this.undoInfo(), U = this.U;
		if (!d) return V.toast("Não há nada para desfazer", { icon: "info" });
		let trashed = 0, restored = 0;
		for (const r of d.restore) {
			const f = app.vault.getAbstractFileByPath(r.path);
			if (!f) continue;
			await app.fileManager.processFrontMatter(f, fm => { for (const [k, v] of Object.entries(r.old)) { if (v === null) delete fm[k]; else fm[k] = v; } });
			restored++;
		}
		// arquivos criados: notas e imagens da ação (do mais fundo para o mais raso)
		for (const p of [...d.created].sort((a, b) => b.length - a.length)) {
			const f = app.vault.getAbstractFileByPath(p);
			if (!f || f.children) continue;
			try { if (app.fileManager.trashFile) await app.fileManager.trashFile(f); else await app.vault.trash(f, true); trashed++; } catch (_) {}
		}
		this._ls("undoBatch", "");
		this.C.invalidate();
		V.toast(`Desfeito: ${d.label}${trashed ? ` · ${U.plural(trashed, "arquivo na lixeira", "arquivos na lixeira")}` : ""}${restored ? ` · ${U.plural(restored, "ficha restaurada", "fichas restauradas")}` : ""}`, { tone: "ok", icon: "refresh" });
		setTimeout(() => V.refresh(), 250);
	}
	// aviso de fim de ação com o botão Desfazer
	undoToast(V, message, data, tone = "ok", icon = "check") {
		return V.toast(message, { tone, icon, action: data ? { label: "Desfazer", run: () => this.undoLast(V) } : null });
	}

	// ===================================================== EXPORTAR CSV (3.50.0)
	// Mesmo formato que a importação lê: dá para guardar, abrir numa planilha
	// ou levar para outro app. O arquivo fica na pasta de backups do vault
	// (no celular, baixar arquivos pelo Obsidian não é confiável).
	csvCell(v) { const s = String(v ?? ""); return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
	exportCsvText(ctx) {
		const { model } = ctx;
		const head = ["Name", "Platform", "Status", "Hours", "Rating", "Genres", "Subgenres", "Developer", "Publisher", "ReleaseYear", "Franchise", "DateAdded", "Started", "Completed", "LastPlayed", "Favorite"];
		const rows = [...model.games].sort((a, b) => a.title.localeCompare(b.title)).map(g => [
			g.title, g.platform, g.status, g.playtime.hours ? Math.round(g.playtime.hours * 10) / 10 : "", g.rating || "",
			g.genres.join(", "), (g.subgenres || []).join(", "), g.developer || "", g.publisher || "", g.releaseYear || "", g.franchise || "",
			g.dateAdded || "", g.startDate || "", g.completionDate || "", g.lastPlayed?.date || "", g.favorite ? "yes" : ""
		]);
		return "﻿" + [head, ...rows].map(r => r.map(x => this.csvCell(x)).join(",")).join("\r\n") + "\r\n";
	}
	async exportCsv(ctx, V) {
		const U = this.U;
		try {
			if (!app.vault.getAbstractFileByPath(this.backupFolder)) await app.vault.createFolder(this.backupFolder).catch(() => {});
			const d = new Date(), p2 = n => String(n).padStart(2, "0");
			const path = `${this.backupFolder}/Game Library ${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}${p2(d.getMinutes())}.csv`;
			const text = this.exportCsvText(ctx);
			const f = app.vault.getAbstractFileByPath(path);
			if (f) await app.vault.modify(f, text); else await app.vault.create(path, text);
			V.toast(`${U.plural(ctx.model.games.length, "jogo exportado", "jogos exportados")} em ${path}`, { tone: "ok", icon: "download" });
		} catch (err) {
			console.warn("Game Library: exportar CSV", err);
			V.toast("Não foi possível criar o arquivo", { tone: "error" });
		}
	}

	// ===================================================== NOTA DIÁRIA (3.51.0)
	// Opcional (Configurações): cada sessão registrada também vira uma linha
	// na nota diária do Obsidian, sob "## Jogos", com link para o jogo.
	// Usa a pasta e o formato do plugin "Notas diárias". Se a nota de hoje
	// ainda não existe e o plugin tem modelo, não cria (para não pular o
	// modelo); sem modelo, cria a nota com a seção.
	dailyOn() { return this.U._store("dailyLog") === "1"; }
	dailyConfig() {
		const pl = app.internalPlugins?.getPluginById?.("daily-notes");
		const opt = pl?.instance?.options || {};
		return { enabled: !!pl?.enabled, folder: String(opt.folder || "").replace(/^\/+|\/+$/g, ""), format: String(opt.format || "YYYY-MM-DD"), template: String(opt.template || "") };
	}
	dailyPath(cfg = this.dailyConfig()) {
		const name = window.moment ? window.moment().format(cfg.format) : this.C.today();
		return `${cfg.folder ? cfg.folder + "/" : ""}${name}.md`;
	}
	async logSessionToDaily({ path, title, hours = 0, note = "" }, V = null) {
		if (!this.dailyOn()) return { ok: false, code: "off" };
		const U = this.U, C = this.C;
		try {
			const cfg = this.dailyConfig(), dp = this.dailyPath(cfg);
			let daily = app.vault.getAbstractFileByPath(dp);
			if (!daily) {
				if (cfg.template) { V?.toast("Abra a nota diária de hoje uma vez para a sessão ser anotada nela", { icon: "info" }); return { ok: false, code: "no_daily" }; }
				const dir = dp.split("/").slice(0, -1).join("/");
				if (dir && !app.vault.getAbstractFileByPath(dir)) await app.vault.createFolder(dir).catch(() => {});
				daily = await app.vault.create(dp, "");
			}
			const game = app.vault.getAbstractFileByPath(path);
			const link = game && app.fileManager.generateMarkdownLink ? app.fileManager.generateMarkdownLink(game, dp) : `[[${title}]]`;
			const clean = C.clip(String(note || "").replace(/[\r\n]+/g, " ").trim(), 200);
			const line = `- ${link}${hours ? ` · ${U.fmtHours(hours)}` : ""}${clean ? ` · ${clean}` : ""}`;
			const edit = text => {
				const lines = String(text || "").split("\n");
				const h = lines.findIndex(l => /^##\s+Jogos\s*$/.test(l));
				if (h < 0) return `${String(text || "").replace(/\s*$/, "")}${text && text.trim() ? "\n\n" : ""}## Jogos\n${line}\n`;
				let i = h + 1;
				while (i < lines.length && !/^#{1,6}\s/.test(lines[i]) && (lines[i].trim() === "" || /^\s*[-*]\s/.test(lines[i]))) i++;
				while (i > h + 1 && lines[i - 1].trim() === "") i--;
				lines.splice(i, 0, line);
				return lines.join("\n");
			};
			if (app.vault.process) await app.vault.process(daily, edit);
			else await app.vault.modify(daily, edit(await app.vault.read(daily)));
			return { ok: true, path: dp };
		} catch (err) {
			console.warn("Game Library: nota diária", err);
			return { ok: false, code: "error" };
		}
	}
}
