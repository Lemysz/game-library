// ===================================================================
// Game Library — Gerenciador manual de conquistas (3.74.0)
// ===================================================================
// Conquistas do Xbox 100% manuais: nada de API, site ou internet. Tudo é
// cadastrado por você, o mais rápido possível:
//   · Lista: busca, desbloqueio em um toque, seleção para ações em massa
//     (desbloquear, bloquear, categoria, DLC, excluir).
//   · Formulário: todos os campos, "Salvar e próxima" (sequencial) e
//     "Duplicar".
//   · Em lote: uma conquista por linha ("Nome | Descrição | G | Categoria |
//     DLC") ou planilha CSV/Excel (.xlsx), com colunas reconhecidas, prévia
//     e confirmação.
//   · Ícones: várias imagens de uma vez, associadas pelo nome do arquivo ou
//     pela ordem, recortadas em quadrado e salvas em WebP no vault.
//   · Backup: antes de excluir, atualizar em lote ou restaurar, uma cópia
//     das conquistas do jogo vai para Backups/Conquistas/<Jogo>/ (.json).
//
// Dados: uma nota por conquista em Achievements/<Jogo>/ (o mesmo formato
// de sempre: name, description, icon, points, category, set, unlocked,
// unlockedDate, notes, order, gamePath). Ícones em
// Assets/Achievements/<Jogo>/. Nada sai do vault.
// ===================================================================

class SteamVaultAchManager {
	constructor() {
		this.KEEP_BACKUPS = 10;
		this.ICON_SIZE = 256;
		this.CATS = ["História", "Exploração", "Combate", "Colecionáveis", "Dificuldade", "Multijogador", "Desafio", "Diversos"];
		// colunas reconhecidas na lista/planilha (cabeçalho, sem acento)
		this.COLS = {
			name: /^(nome|name|conquista|achievement|titulo|title)$/,
			description: /^(descricao|description|desc|detalhes|objetivo)$/,
			points: /^(g|gs|gamerscore|pontos|points|pontuacao|score|valor)$/,
			category: /^(categoria|category|tipo|type)$/,
			set: /^(dlc|conjunto|set|expansao|pacote|grupo)$/,
			icon: /^(icone|icon|imagem|image|arquivo|file)$/,
			unlocked: /^(desbloqueada|desbloqueado|unlocked|status|feita|concluida)$/,
			date: /^(data|date|unlockeddate|desbloqueio)$/,
			notes: /^(observacoes|observacao|notas|notes|obs)$/
		};
		this.COL_LABELS = { name: "Nome", description: "Descrição", points: "G", category: "Categoria", set: "DLC", icon: "Ícone", unlocked: "Desbloqueada", date: "Data", notes: "Observações", "": "Ignorar" };
	}

	get C() { return customJS.SteamVaultCore; }
	get U() { return customJS.SteamVaultUI; }
	get V() { return customJS.SteamVault; }

	// ============================================================ dados
	_safe(s, fb) { return this.C.safeFileName(s, fb); }
	folder(g) { return `${this.C.folders.achievements}/${this._safe(g.title, "Jogo")}`; }
	iconFolder(g) { return `${this.C.folders.achievementAssets}/${this._safe(g.title, "Jogo")}`; }
	backupFolder(g) { return `Backups/Conquistas/${this._safe(g.title, "Jogo")}`; }
	_fm(path) { const f = app.vault.getAbstractFileByPath(path); return (f && app.metadataCache.getFileCache(f)?.frontmatter) || {}; }
	_bool(v) { return v === true || v === "true"; }

	// conquistas do jogo, lidas das notas, na ordem
	rows(g) {
		const C = this.C;
		return g.achievements.filter(a => a.path).map((a, i) => {
			const fm = this._fm(a.path);
			const icon = C.str(fm.icon) === "🏆" ? "" : C.str(fm.icon);
			return {
				path: a.path, name: C.str(fm.name) || a.name, description: C.str(fm.description ?? a.description),
				icon, iconSrc: a.iconSrc || (icon ? C.resolveImage(icon) : ""), points: Math.max(0, Math.round(C.num(fm.points) || 0)),
				category: C.str(fm.category), set: C.clip(C.str(fm.set ?? fm.achievementSet), 60), unlocked: this._bool(fm.unlocked),
				unlockedDate: C.iso(fm.unlockedDate) || "", notes: C.str(fm.notes), order: C.num(fm.order) ?? i + 1
			};
		}).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
	}
	stats(rows) {
		const total = rows.length, unlocked = rows.filter(r => r.unlocked).length;
		const gTotal = rows.reduce((t, r) => t + r.points, 0), gEarned = rows.reduce((t, r) => t + (r.unlocked ? r.points : 0), 0);
		return { total, unlocked, left: total - unlocked, gTotal, gEarned, pct: total ? Math.floor((unlocked / total) * 100) : 0 };
	}

	async _ensure(folder) { if (!app.vault.getAbstractFileByPath(folder)) await app.vault.createFolder(folder).catch(() => {}); }
	async create(g, it, order) {
		const C = this.C;
		const folder = this.folder(g);
		await this._ensure(folder);
		const base = this._safe(it.name, "Conquista");
		let p = `${folder}/${base}.md`, n = 2;
		while (app.vault.getAbstractFileByPath(p)) p = `${folder}/${base} ${n++}.md`;
		await app.vault.create(p, C.buildAchievementNote({
			name: it.name, description: it.description || "", icon: it.icon || "", points: it.points || 0,
			unlocked: !!it.unlocked, unlockedDate: it.unlocked ? (it.unlockedDate || C.today()) : "", unlockSource: it.unlocked ? "vault" : "",
			gameLink: `[[${g.name}]]`, gamePath: g.path, category: it.category || "", notes: it.notes || "", order,
			...(it.set ? { extra: { set: it.set } } : {})
		}));
		return p;
	}
	async update(path, patch) {
		const f = app.vault.getAbstractFileByPath(path);
		if (!f) throw new Error("nota da conquista não encontrada");
		await app.fileManager.processFrontMatter(f, fm => {
			for (const [k, v] of Object.entries(patch)) fm[k] = v;
			if ("unlocked" in patch) {
				if (patch.unlocked) { if (!fm.unlockedDate) fm.unlockedDate = this.C.today(); if (!fm.unlockSource) fm.unlockSource = "vault"; }
				else { fm.unlockedDate = ""; fm.unlockedTime = ""; if (fm.unlockSource === "vault") fm.unlockSource = ""; }
			}
		});
	}
	// a nota vai para a lixeira do Obsidian (o ícone fica no vault)
	async trash(path) { const f = app.vault.getAbstractFileByPath(path); if (!f) return; if (app.fileManager.trashFile) await app.fileManager.trashFile(f); else await app.vault.trash(f, true); }

	// --------------------------------------------------------- backup
	async _adapterWrite(path, text) {
		const A = app.vault.adapter;
		const parts = path.split("/").slice(0, -1);
		for (let i = 1; i <= parts.length; i++) { const d = parts.slice(0, i).join("/"); if (!(await A.exists(d))) await A.mkdir(d).catch(() => {}); }
		await A.write(path, text);
	}
	async backup(g, reason = "manual", rows = this.rows(g)) {
		if (!rows.length) return "";
		const d = new Date(), pad = n => String(n).padStart(2, "0");
		const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
		const path = `${this.backupFolder(g)}/${stamp} ${this._safe(reason, "backup")}.json`;
		const data = { app: "Game Library", kind: "achievements", version: 1, game: g.title, gamePath: g.path, date: d.toISOString(), reason,
			achievements: rows.map(({ name, description, icon, points, category, set, unlocked, unlockedDate, notes, order }) => ({ name, description, icon, points, category, set, unlocked, unlockedDate, notes, order })) };
		await this._adapterWrite(path, JSON.stringify(data, null, "\t"));
		// guarda os mais recentes
		const all = await this.backups(g);
		for (const old of all.slice(this.KEEP_BACKUPS)) await app.vault.adapter.remove(old.path).catch(() => {});
		return path;
	}
	async backups(g) {
		try {
			const r = await app.vault.adapter.list(this.backupFolder(g));
			return (r?.files || []).filter(p => p.endsWith(".json")).sort().reverse().map(p => ({ path: p, label: p.split("/").pop().replace(/\.json$/, "") }));
		} catch (_) { return []; }
	}
	// restaura sem apagar nada: o que existe é atualizado pelo nome, o que falta é recriado
	// rows: a lista atual (a janela mantém a sua, já com o que acabou de ser
	// criado). Devolve as linhas novas e as alteradas, para a janela atualizar.
	async restore(g, path, rows = this.rows(g)) {
		const C = this.C;
		const data = JSON.parse(await app.vault.adapter.read(path));
		if (!data || data.kind !== "achievements" || !Array.isArray(data.achievements)) throw new Error("arquivo de backup inválido");
		await this.backup(g, "antes de restaurar", rows);
		// só conta como existente o que ainda tem a nota no vault
		const have = new Map(rows.filter(r => app.vault.getAbstractFileByPath(r.path)).map(r => [C.normalizeKey(r.name), r]));
		let order = Math.max(0, ...rows.map(r => r.order || 0));
		const created = [], updated = [];
		for (const a of data.achievements) {
			const it = this._clean(a);
			if (!it.name) continue;
			const ex = have.get(C.normalizeKey(it.name));
			const patch = { description: it.description, icon: it.icon, points: it.points, category: it.category, set: it.set, unlocked: it.unlocked, unlockedDate: it.unlocked ? it.unlockedDate || C.today() : "", notes: it.notes };
			if (ex) { await this.update(ex.path, patch); updated.push({ path: ex.path, patch }); }
			else { const o = ++order; const p = await this.create(g, it, o); created.push(this.row(p, it, o)); have.set(C.normalizeKey(it.name), created[created.length - 1]); }
		}
		return { created, updated };
	}
	// linha da lista a partir dos dados gravados
	row(path, it, order) {
		const C = this.C;
		return { path, name: it.name, description: it.description || "", icon: it.icon || "", iconSrc: it.icon ? C.resolveImage(it.icon) : "", points: it.points || 0, category: it.category || "", set: it.set || "", unlocked: !!it.unlocked, unlockedDate: it.unlocked ? (it.unlockedDate || C.today()) : "", notes: it.notes || "", order };
	}
	// valores vindos de fora (lista, planilha, backup): limpos e limitados
	_clean(a) {
		const C = this.C, s = (v, n) => C.clip(String(v ?? "").replace(/\s+/g, " ").trim(), n);
		const set = s(a.set, 60);
		return {
			name: s(a.name, 140), description: s(a.description, 600), icon: s(a.icon, 300),
			points: Math.max(0, Math.min(1000, Math.round(Number(String(a.points ?? "").replace(/[^\d.,-]/g, "").replace(",", ".")) || 0))),
			category: s(a.category, 40), set: /^(jogo base|base game|base|principal|-)$/i.test(set) ? "" : set.replace(/^dlc\s*[:\-–—]\s*/i, ""),
			unlocked: a.unlocked === true || /^(sim|s|yes|y|true|x|1|desbloqueada|desbloqueado|feita|ok|✓|✔)$/i.test(String(a.unlocked ?? "").trim()),
			unlockedDate: C.iso(a.unlockedDate) || "", notes: s(a.notes, 600)
		};
	}

	// --------------------------------------------------------- exportar
	toCsv(rows) {
		const q = v => { const t = String(v ?? ""); return /[",\n;]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
		const head = ["Nome", "Descrição", "G", "Categoria", "DLC", "Ícone", "Desbloqueada", "Data", "Observações"];
		return "﻿" + [head, ...rows.map(r => [r.name, r.description, r.points, r.category, r.set, r.icon, r.unlocked ? "sim" : "não", r.unlockedDate, r.notes])].map(l => l.map(q).join(",")).join("\n") + "\n";
	}
	async exportCsv(g, rows = this.rows(g)) {
		const path = `${this.backupFolder(g)}/${this._safe(g.title, "Jogo")} - conquistas.csv`;
		await this._adapterWrite(path, this.toCsv(rows));
		return path;
	}

	// ===================================================== lista em lote
	// texto → { rows, mapping, headers, delim }. Formatos:
	//   · uma por linha, campos por "|", tabulação ou ";":
	//       Nome | Descrição | G | Categoria | DLC
	//   · planilha (CSV/TSV) com cabeçalho: as colunas são reconhecidas pelo
	//     nome (Nome, Descrição, G, Categoria, DLC, Ícone, Desbloqueada…)
	//   · "## Nome" ou "[Nome]" numa linha sozinha abre uma seção de DLC
	//     ("## Jogo base" volta ao jogo base)
	parseBulk(text, mapping = null) {
		const C = this.C;
		const src = String(text ?? "").replace(/^﻿/, "").replace(/\r\n?/g, "\n");
		const lines = src.split("\n").slice(0, 5000);
		const content = lines.filter(l => l.trim() && !/^\s*(#{1,3}\s|\[[^\]]+\]\s*$)/.test(l));
		if (!content.length) return { rows: [], mapping: null, headers: null, delim: "" };
		const cnt = (l, d) => l.split(d).length - 1;
		const delim = content.some(l => l.includes("|")) ? "|" : content.some(l => l.includes("\t")) ? "\t" : content.filter(l => cnt(l, ";") >= 1).length >= content.length * 0.6 ? ";" : content.filter(l => cnt(l, ",") >= 1).length >= content.length * 0.8 ? "," : "";
		const split = l => {
			if (!delim) return [l];
			if (delim === "|") return l.split("|");
			const out = []; let cur = "", q = false;
			for (let i = 0; i < l.length; i++) { const ch = l[i]; if (q) { if (ch === '"' && l[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; } else if (ch === '"' && !cur.trim()) q = true; else if (ch === delim) { out.push(cur); cur = ""; } else cur += ch; }
			out.push(cur); return out;
		};
		const norm = h => C.normalizeKey(h).replace(/\s+/g, "");
		const guess = cells => cells.map(h => Object.keys(this.COLS).find(k => this.COLS[k].test(norm(h))) || "");
		const first = split(content[0]).map(c => c.trim());
		const g0 = guess(first);
		const hasHeader = g0.includes("name") && g0.filter(Boolean).length >= 2;
		const headers = hasHeader ? first : null;
		// sem cabeçalho, a ordem é: Nome, Descrição, G, Categoria, DLC, Ícone
		const map = mapping || (hasHeader ? g0 : ["name", "description", "points", "category", "set", "icon", "notes"]);
		// "," sem cabeçalho quebraria descrições com vírgula: a linha inteira é o nome
		const useSplit = !(delim === "," && !hasHeader);
		const rows = [];
		let section = "", skipHead = hasHeader;
		for (const raw of lines) {
			const t = raw.trim();
			if (!t) continue;
			const sec = /^#{1,3}\s+(.+)$/.exec(t) || /^\[([^\]]+)\]$/.exec(t);
			if (sec) { const n = sec[1].trim(); section = /^(jogo base|base game|base|principal)$/i.test(n) ? "" : C.clip(n.replace(/^dlc\s*[:\-–—]\s*/i, ""), 60); continue; }
			if (skipHead) { skipHead = false; continue; }
			const cells = (useSplit ? split(raw) : [raw]).map(c => c.trim());
			const it = {};
			map.forEach((k, i) => { if (k && cells[i] !== undefined && cells[i] !== "" && it[k] === undefined) it[k] = cells[i]; });
			// "Nome — Descrição — 10" (sem separador de colunas)
			if (!delim && it.name) { const m = /^(.+?)\s+[—–]\s+(.+?)(?:\s+[—–]\s+(\d{1,4})\s*G?)?$/.exec(it.name); if (m) { it.name = m[1]; it.description = m[2]; if (m[3]) it.points = m[3]; } }
			// G escrito com a letra ("10G", "10 G")
			if (it.points !== undefined && !/^\s*\d/.test(it.points)) { it.category = it.category || it.points; delete it.points; }
			const clean = this._clean({ ...it, unlockedDate: it.date });
			if (!clean.set && section) clean.set = section;
			if (!clean.name || /^\d+$/.test(clean.name)) continue;
			rows.push(clean);
		}
		return { rows: this._dedupe(rows), mapping: map, headers, delim };
	}
	_dedupe(rows) {
		const C = this.C, seen = new Map();
		for (const r of rows) { const k = C.normalizeKey(r.name); if (!k) continue; if (!seen.has(k)) seen.set(k, r); }
		return [...seen.values()];
	}

	// --------------------------------------------------- planilha .xlsx
	// leitor mínimo de Excel: abre o .zip, lê as strings compartilhadas e a
	// primeira planilha → texto com tabulação (vai para o campo de lista)
	async readXlsx(buf) {
		if (buf.byteLength > 20 * 1024 * 1024) throw new Error("planilha grande demais (máx. 20 MB)");
		const files = await this._unzip(buf, n => /^xl\/(sharedStrings\.xml|workbook\.xml|_rels\/workbook\.xml\.rels|worksheets\/[^/]+\.xml)$/i.test(n));
		const xml = s => new DOMParser().parseFromString(s || "", "application/xml");
		const shared = files["xl/sharedStrings.xml"] ? [...xml(files["xl/sharedStrings.xml"]).getElementsByTagName("si")].map(si => [...si.getElementsByTagName("t")].map(t => t.textContent).join("")) : [];
		let sheet = "xl/worksheets/sheet1.xml";
		try {
			const wb = xml(files["xl/workbook.xml"]), first = wb.getElementsByTagName("sheet")[0];
			const rid = first && (first.getAttribute("r:id") || first.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id"));
			const rel = [...xml(files["xl/_rels/workbook.xml.rels"]).getElementsByTagName("Relationship")].find(r => r.getAttribute("Id") === rid);
			if (rel) { const tg = rel.getAttribute("Target").replace(/^\/?(xl\/)?/, ""); sheet = `xl/${tg}`; }
		} catch (_) {}
		const sx = files[sheet] || Object.entries(files).find(([k]) => /^xl\/worksheets\//i.test(k))?.[1];
		if (!sx) throw new Error("planilha sem dados");
		const col = ref => { let n = 0; for (const ch of String(ref).replace(/\d+/g, "")) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };
		const out = [];
		for (const row of xml(sx).getElementsByTagName("row")) {
			const cells = [];
			for (const c of row.getElementsByTagName("c")) {
				const t = c.getAttribute("t"), v = c.getElementsByTagName("v")[0]?.textContent ?? "";
				const val = t === "s" ? (shared[Number(v)] ?? "") : t === "inlineStr" ? [...c.getElementsByTagName("t")].map(x => x.textContent).join("") : t === "b" ? (v === "1" ? "sim" : "não") : v;
				cells[col(c.getAttribute("r") || "A")] = String(val).replace(/[\t\r\n]+/g, " ").trim();
			}
			if (cells.some(x => x)) out.push(Array.from(cells, x => x ?? "").join("\t"));
			if (out.length > 5000) break;
		}
		return out.join("\n");
	}
	async _unzip(buf, want) {
		const dv = new DataView(buf), u8 = new Uint8Array(buf), dec = new TextDecoder();
		let eocd = -1;
		for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
		if (eocd < 0) throw new Error("não é um arquivo .xlsx válido");
		const count = dv.getUint16(eocd + 10, true);
		let p = dv.getUint32(eocd + 16, true);
		const out = {};
		for (let i = 0; i < count && p + 46 <= buf.byteLength; i++) {
			if (dv.getUint32(p, true) !== 0x02014b50) break;
			const method = dv.getUint16(p + 10, true), size = dv.getUint32(p + 20, true);
			const nlen = dv.getUint16(p + 28, true), elen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
			const name = dec.decode(u8.subarray(p + 46, p + 46 + nlen));
			p += 46 + nlen + elen + clen;
			if (!want(name) || size > 30 * 1024 * 1024) continue;
			const start = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true);
			const data = u8.subarray(start, start + size);
			if (method === 0) out[name] = dec.decode(data);
			else if (method === 8 && typeof DecompressionStream === "function") {
				const s = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
				out[name] = dec.decode(await new Response(s).arrayBuffer());
			}
		}
		return out;
	}

	// ============================================================ ícones
	// imagem do aparelho → quadrado de até 256 px em WebP (PNG se o aparelho
	// não gerar WebP). fit "cover" corta as bordas; "contain" mantém tudo.
	async squareIcon(file, fit = "cover") {
		if (!file || !/^image\//.test(file.type || "") || file.size > 15 * 1024 * 1024) throw new Error("escolha uma imagem (até 15 MB)");
		const bmp = await createImageBitmap(file);
		const side = fit === "cover" ? Math.min(bmp.width, bmp.height) : Math.max(bmp.width, bmp.height);
		const size = Math.max(16, Math.min(this.ICON_SIZE, side));
		const c = document.createElement("canvas"); c.width = size; c.height = size;
		const ctx = c.getContext("2d");
		const k = fit === "cover" ? size / Math.min(bmp.width, bmp.height) : size / Math.max(bmp.width, bmp.height);
		const w = bmp.width * k, h = bmp.height * k;
		ctx.imageSmoothingQuality = "high";
		ctx.drawImage(bmp, (size - w) / 2, (size - h) / 2, w, h);
		bmp.close?.();
		let blob = await new Promise(r => c.toBlob(r, "image/webp", 0.88));
		let ext = "webp";
		if (!blob || blob.type !== "image/webp") { blob = await new Promise(r => c.toBlob(r, "image/png")); ext = "png"; }
		if (!blob) throw new Error("não foi possível converter a imagem");
		return { buf: await blob.arrayBuffer(), ext };
	}
	async saveIcon(g, name, file, fit = "cover") {
		const out = await this.squareIcon(file, fit);
		const folder = this.iconFolder(g);
		await this._ensure(folder);
		const base = this._safe(name, "conquista");
		let p = `${folder}/${base}.${out.ext}`, n = 2;
		while (app.vault.getAbstractFileByPath(p)) p = `${folder}/${base} ${n++}.${out.ext}`;
		await app.vault.createBinary(p, out.buf);
		return p;
	}
	// nome do arquivo → conquista: "03 - Cume.png", "cume.webp", "Cume (1).jpg"
	matchIcon(fileName, rows) {
		const C = this.C;
		const stem = String(fileName).replace(/\.[a-z0-9]+$/i, "").replace(/\s*\(\d+\)$/, "");
		const key = C.normalizeKey(stem.replace(/^\s*\d+\s*[-_.)\s]+\s*/, "").replace(/[_-]+/g, " "));
		if (key) { const hit = rows.find(r => C.normalizeKey(r.name) === key) || rows.find(r => { const k = C.normalizeKey(r.name); return k.length >= 4 && (key.includes(k) || k.includes(key)); }); if (hit) return hit; }
		const num = /^\s*(\d{1,4})\s*$/.exec(stem);
		return num ? rows[Number(num[1]) - 1] || null : null;
	}

	// ============================================================ janela
	open(ctx, path, { tab = "list" } = {}) {
		const C = this.C, U = this.U, V = this.V;
		const g = ctx.model.gamesByPath.get(path);
		if (!g) return;
		let rows = this.rows(g);
		let view = tab === "bulk" ? "bulk" : tab === "icons" ? "icons" : "list";
		let form = null, q = "", selecting = false, sel = new Set(), dirty = false, busy = false;
		let bulk = { text: "", mapping: null, defCat: "", defSet: "", update: false, file: "" };
		let pics = [], fit = "cover", lastNew = { category: "", set: "" };
		const body = document.createElement("div");
		body.className = "sv-am";
		const m = V.modal({ title: "Conquistas", sub: `${g.title} · ${g.providerLabel || "Xbox"}`, size: "lg", cls: "sv-am-modal", body,
			actions: `<div class="sv-am-foot"></div>`,
			onClose: () => { for (const p of pics) URL.revokeObjectURL(p.url); if (dirty) { C.invalidate(); setTimeout(() => V.refresh(), 250); } } });
		const foot = m.el.querySelector(".sv-am-foot");
		const $ = s => body.querySelector(s);
		// a lista da janela é atualizada a cada gravação (o cache do Obsidian
		// demora um instante para ver notas novas)
		const patchRow = (p, patch) => { const r = rows.find(x => x.path === p); if (!r) return; Object.assign(r, patch); if ("icon" in patch) r.iconSrc = patch.icon ? C.resolveImage(patch.icon) : ""; if ("unlocked" in patch) r.unlockedDate = patch.unlocked ? (patch.unlockedDate || r.unlockedDate || C.today()) : ""; };
		const nextOrder = () => Math.max(0, ...rows.map(r => r.order || 0)) + 1;
		const ico = r => r && (r.iconSrc || (r.icon ? C.resolveImage(r.icon) : "")) ? `<img src="${U.attr(r.iconSrc || C.resolveImage(r.icon))}" alt="" loading="lazy">` : U.icon("trophy");
		const sets = () => [...new Set(rows.map(r => r.set).filter(Boolean))];
		const cats = () => [...new Set([...this.CATS, ...rows.map(r => r.category).filter(Boolean)])];
		const lists = () => `<datalist id="sv-am-cats">${cats().map(c => `<option value="${U.attr(c)}">`).join("")}</datalist><datalist id="sv-am-sets">${sets().map(c => `<option value="${U.attr(c)}">`).join("")}</datalist>`;

		const head = () => {
			const s = this.stats(rows);
			return `<div class="sv-am-stats">
				<div><b class="sv-num">${U.fmtNum(s.total)}</b><span>conquistas</span></div>
				<div><b class="sv-num">${U.fmtNum(s.unlocked)}</b><span>desbloqueadas</span></div>
				<div><b class="sv-num">${U.fmtNum(s.left)}</b><span>restantes</span></div>
				<div><b class="sv-num">${U.fmtNum(s.gEarned)}<small>/${U.fmtNum(s.gTotal)} G</small></b><span>Gamerscore</span></div>
			</div>
			<div class="sv-am-progress">${U.progressBar(s.pct, { thin: true, tone: s.total && s.left === 0 ? "gold" : "" })}<span class="sv-num">${s.pct}%</span></div>
			<div class="sv-am-tabs" role="tablist">${[["list", "Lista", "list"], ["bulk", "Em lote", "rows"], ["icons", "Ícones", "image"]].map(([id, l, i]) => `<button type="button" role="tab" data-am-tab="${id}" aria-selected="${view === id || (id === "list" && view === "form")}">${U.icon(i)}<span>${l}</span></button>`).join("")}</div>`;
		};
		const paint = () => {
			if (view === "form") return paintForm();
			body.innerHTML = head() + (view === "bulk" ? bulkHtml() : view === "icons" ? iconsHtml() : listHtml()) + lists();
			// o rodapé primeiro: a prévia do lote e a grade de ícones ajustam o botão dele
			paintFoot();
			if (view === "bulk") paintBulk();
			if (view === "icons") paintIcons();
		};
		const paintFoot = () => {
			if (view === "list") foot.innerHTML = selecting ? "" : `${U.btn("Concluir", { kind: "primary", attrs: "data-close" })}`;
			if (view === "bulk") foot.innerHTML = `${U.btn("Concluir", { kind: "ghost", attrs: "data-close" })}${U.btn("Adicionar", { kind: "primary", icon: "plus", attrs: "data-am-bulkgo disabled" })}`;
			if (view === "icons") foot.innerHTML = `${U.btn("Concluir", { kind: "ghost", attrs: "data-close" })}${U.btn("Salvar ícones", { kind: "primary", icon: "check", attrs: "data-am-icongo disabled" })}`;
		};

		// ----------------------------------------------------------- lista
		const listHtml = () => {
			const k = C.normalizeKey(q);
			const vis = rows.filter(r => !k || C.normalizeKey(`${r.name} ${r.description} ${r.category} ${r.set}`).includes(k));
			const groups = [["", vis.filter(r => !r.set)], ...sets().map(st => [st, vis.filter(r => r.set === st)])].filter(([, l]) => l.length);
			const row = r => `<li class="sv-am-row${r.unlocked ? " is-on" : ""}${sel.has(r.path) ? " is-sel" : ""}">
				${selecting ? `<input type="checkbox" data-am-sel="${U.attr(r.path)}" ${sel.has(r.path) ? "checked" : ""} aria-label="Selecionar ${U.attr(r.name)}">` : ""}
				<span class="sv-am-ico">${ico(r)}</span>
				<button type="button" class="sv-am-main" data-am-edit="${U.attr(r.path)}"><b>${U.esc(r.name)}</b><small>${[r.category, r.description].filter(Boolean).map(x => U.esc(x)).join(" · ") || "Toque para editar"}</small></button>
				<span class="sv-am-g sv-num">${r.points ? `${U.fmtNum(r.points)}<i>G</i>` : ""}</span>
				<button type="button" class="sv-ach-check${r.unlocked ? " is-on" : ""}" data-am-toggle="${U.attr(r.path)}" aria-pressed="${r.unlocked}" title="${r.unlocked ? "Marcar como bloqueada" : "Marcar como desbloqueada"}">${U.icon("check")}</button>
			</li>`;
			const selBar = selecting ? `<div class="sv-am-selbar">
				<span><b>${sel.size}</b> ${sel.size === 1 ? "selecionada" : "selecionadas"}</span>
				<button type="button" class="sv-am-link" data-am-selall>${sel.size === vis.length && vis.length ? "Nenhuma" : "Todas"}</button>
				<div class="sv-am-selact">${U.btn("Desbloquear", { icon: "check", kind: "ghost", size: "sm", attrs: `data-am-bulkact="unlock"${sel.size ? "" : " disabled"}` })}${U.btn("Bloquear", { icon: "lock", kind: "ghost", size: "sm", attrs: `data-am-bulkact="lock"${sel.size ? "" : " disabled"}` })}${U.btn("Categoria", { icon: "tag", kind: "ghost", size: "sm", attrs: `data-am-bulkact="category"${sel.size ? "" : " disabled"}` })}${U.btn("DLC", { icon: "layers", kind: "ghost", size: "sm", attrs: `data-am-bulkact="set"${sel.size ? "" : " disabled"}` })}${U.btn("Excluir", { icon: "trash", kind: "ghost", size: "sm", attrs: `data-am-bulkact="delete"${sel.size ? "" : " disabled"}` })}</div>
				<div class="sv-am-selask" data-am-ask hidden></div>
				${U.btn("Fechar seleção", { kind: "secondary", size: "sm", attrs: "data-am-select" })}
			</div>` : "";
			return `<div class="sv-am-bar">
					<div class="sv-field sv-field--search">${U.icon("search")}<input type="search" class="sv-input" data-am-q placeholder="Buscar" value="${U.attr(q)}"></div>
					${rows.length ? U.btn(selecting ? "" : "Selecionar", { icon: "check", kind: "ghost", size: "sm", attrs: `data-am-select${selecting ? ' hidden' : ""}` }) : ""}
					${U.btn("Nova", { icon: "plus", kind: "primary", size: "sm", attrs: "data-am-new" })}
				</div>
				${selBar}
				${rows.length ? (groups.length ? groups.map(([st, l]) => `<section class="sv-am-group"><h4>${U.icon(st ? "layers" : "trophy")}<span>${U.esc(st || "Jogo base")}</span><small class="sv-num">${l.filter(r => r.unlocked).length}/${l.length} · ${U.fmtNum(l.reduce((t, r) => t + r.points, 0))} G</small></h4><ol class="sv-am-list">${l.map(row).join("")}</ol></section>`).join("") : `<p class="sv-am-none">Nada encontrado para “${U.esc(q)}”.</p>`)
				: `<div class="sv-am-empty">${U.icon("trophy")}<p>Nenhuma conquista ainda. Adicione várias de uma vez colando uma lista ou uma planilha, ou cadastre uma a uma.</p><div>${U.btn("Adicionar em lote", { icon: "rows", kind: "primary", size: "sm", attrs: 'data-am-tab="bulk"' })}${U.btn("Nova conquista", { icon: "plus", kind: "secondary", size: "sm", attrs: "data-am-new" })}</div></div>`}
				${rows.length ? `<div class="sv-am-tools">${U.btn("Exportar CSV", { icon: "download", kind: "ghost", size: "sm", attrs: "data-am-export" })}${U.btn("Fazer backup", { icon: "shield", kind: "ghost", size: "sm", attrs: "data-am-backup" })}${U.btn("Restaurar backup", { icon: "refresh", kind: "ghost", size: "sm", attrs: "data-am-restore" })}</div><div class="sv-am-restore" data-am-restorelist hidden></div>` : ""}`;
		};

		// --------------------------------------------------------- formulário
		const blank = () => ({ path: "", name: "", description: "", icon: "", iconSrc: "", points: "", category: lastNew.category, set: lastNew.set, unlocked: false, unlockedDate: "", notes: "", file: null });
		const openForm = (r, { dup = false } = {}) => {
			form = r ? { ...r, file: null, ...(dup ? { path: "", name: `${r.name} (cópia)`, unlocked: false, unlockedDate: "" } : {}) } : blank();
			view = "form"; paintForm();
			m.el.querySelector(".sv-modal-body")?.scrollTo?.(0, 0);
			setTimeout(() => { const n = $('[data-f="name"]'); n?.focus(); if (dup) n?.select(); }, 30);
		};
		const paintForm = () => {
			const f = form;
			body.innerHTML = `<div class="sv-am-form">
				<div class="sv-am-iconrow">
					<span class="sv-am-iconprev${fit === "contain" ? " is-contain" : ""}" data-am-iconprev>${f.file ? `<img src="${U.attr(f.fileUrl)}" alt="">` : ico(f)}</span>
					<div class="sv-am-iconbtns">
						<label class="sv-btn sv-btn--secondary sv-btn--sm">${U.icon("image")}<span>${f.icon || f.file ? "Trocar ícone" : "Escolher ícone"}</span><input type="file" accept="image/*" data-am-iconfile hidden></label>
						${f.icon || f.file ? U.btn("Remover", { icon: "trash", kind: "ghost", size: "sm", attrs: "data-am-iconclear" }) : ""}
						<div class="sv-am-fit" role="radiogroup" aria-label="Recorte">${[["cover", "Preencher"], ["contain", "Ajustar"]].map(([v, l]) => `<button type="button" role="radio" data-am-fit="${v}" aria-checked="${fit === v}">${l}</button>`).join("")}</div>
					</div>
				</div>
				<label class="sv-mgr-field"><span class="sv-label">Nome *</span><input class="sv-input" data-f="name" value="${U.attr(f.name)}" maxlength="140" placeholder="Nome da conquista" enterkeyhint="next"></label>
				<label class="sv-mgr-field"><span class="sv-label">Descrição</span><textarea class="sv-input" rows="2" data-f="description" placeholder="O que é preciso fazer">${U.esc(f.description)}</textarea></label>
				<div class="sv-mgr-grid">
					<label class="sv-mgr-field"><span class="sv-label">Gamerscore (G)</span><input class="sv-input" type="number" min="0" max="1000" step="5" inputmode="numeric" data-f="points" value="${U.attr(f.points || "")}" placeholder="0"></label>
					<label class="sv-mgr-field"><span class="sv-label">Categoria</span><input class="sv-input" data-f="category" list="sv-am-cats" value="${U.attr(f.category)}" placeholder="História, Combate…"></label>
				</div>
				<div class="sv-mgr-field"><span class="sv-label">Conquista de</span>
					<div class="sv-am-seg" role="radiogroup">${[["", "Jogo base"], ["dlc", "DLC"]].map(([v, l]) => `<button type="button" role="radio" data-am-kind="${v}" aria-checked="${(v === "dlc") === !!f.set}">${l}</button>`).join("")}</div>
					<input class="sv-input" data-f="set" list="sv-am-sets" value="${U.attr(f.set)}" placeholder="Nome da DLC" ${f.set ? "" : "hidden"}>
				</div>
				<label class="sv-switch"><input type="checkbox" data-f="unlocked" ${f.unlocked ? "checked" : ""}><span></span>Desbloqueada</label>
				<label class="sv-mgr-field" data-am-date ${f.unlocked ? "" : "hidden"}><span class="sv-label">Data do desbloqueio</span><input class="sv-input" type="date" data-f="unlockedDate" value="${U.attr(f.unlockedDate)}"></label>
				<label class="sv-mgr-field"><span class="sv-label">Observações</span><textarea class="sv-input" rows="2" data-f="notes" placeholder="Dicas, onde encontrar (opcional)">${U.esc(f.notes)}</textarea></label>
				<p class="sv-formmsg" data-msg></p>
			</div>${lists()}`;
			foot.innerHTML = `${f.path ? `${U.btn("", { icon: "trash", kind: "ghost", attrs: 'data-am-del title="Excluir" aria-label="Excluir"' })}${U.btn("Duplicar", { icon: "copy", kind: "ghost", attrs: "data-am-dup" })}` : ""}<span class="sv-mgr-footgap"></span>${U.btn("Voltar", { kind: "ghost", attrs: "data-am-back" })}${f.path ? "" : U.btn("Salvar e próxima", { icon: "plus", kind: "secondary", attrs: "data-am-savenext" })}${U.btn("Salvar", { kind: "primary", icon: "check", attrs: "data-am-save" })}`;
		};
		const readForm = () => {
			const v = k => $(`[data-f="${k}"]`);
			const isDlc = $('[data-am-kind="dlc"]')?.getAttribute("aria-checked") === "true";
			Object.assign(form, {
				name: v("name").value.trim(), description: v("description").value.trim(),
				points: Math.max(0, Math.min(1000, Math.round(Number(v("points").value) || 0))), category: v("category").value.trim(),
				set: isDlc ? C.clip(v("set").value.trim(), 60) : "", unlocked: v("unlocked").checked,
				unlockedDate: v("unlocked").checked ? (v("unlockedDate").value || C.today()) : "", notes: v("notes").value.trim()
			});
		};
		const saveForm = async next => {
			if (busy) return;
			readForm();
			const f = form, msg = $("[data-msg]");
			const err = t => { msg.textContent = t; msg.className = "sv-formmsg is-error"; };
			if (!f.name) { err("Dê um nome à conquista."); $('[data-f="name"]').focus(); return; }
			if (rows.some(r => r.path !== f.path && C.normalizeKey(r.name) === C.normalizeKey(f.name))) { err("Já existe uma conquista com esse nome neste jogo."); $('[data-f="name"]').focus(); return; }
			if ($('[data-am-kind="dlc"]')?.getAttribute("aria-checked") === "true" && !f.set) { err("Dê o nome da DLC."); $('[data-f="set"]').focus(); return; }
			busy = true;
			try {
				if (f.file) f.icon = await this.saveIcon(g, f.name, f.file, fit);
				const data = { name: f.name, description: f.description, icon: f.icon, points: f.points, category: f.category, set: f.set, unlocked: f.unlocked, unlockedDate: f.unlockedDate, notes: f.notes };
				if (f.path) { await this.update(f.path, data); patchRow(f.path, data); }
				else { const o = nextOrder(); rows.push(this.row(await this.create(g, data, o), data, o)); }
				if (f.fileUrl) URL.revokeObjectURL(f.fileUrl);
				dirty = true;
				V._haptic?.(10);
				if (next) {
					lastNew = { category: f.category, set: f.set };
					V.toast(`“${f.name}” salva. Próxima!`, { tone: "ok", icon: "trophy" });
					openForm(null);
				} else { V.toast(f.path ? "Conquista salva" : "Conquista criada", { tone: "ok", icon: "trophy" }); form = null; view = "list"; paint(); }
			} catch (e) { err(`Não foi possível salvar: ${e.message}`); }
			finally { busy = false; }
		};

		// ----------------------------------------------------------- em lote
		const bulkHtml = () => `<div class="sv-am-bulk">
			<div class="sv-am-help"><p>Uma conquista por linha. Só o nome é obrigatório; categoria e DLC são opcionais.</p><p class="sv-am-fmt">Nome | Descrição | G | Categoria | DLC</p><p>Uma linha “## Nome da DLC” abre uma seção de DLC.</p></div>
			<textarea class="sv-input sv-am-text" rows="8" data-am-text spellcheck="false" placeholder="Primeiro passo | Complete o primeiro capítulo | 10&#10;Guerreiro | Derrote o primeiro chefe | 20 | Combate&#10;Explorador | Descubra todas as áreas | 30 | Exploração&#10;## Farewell&#10;Adeus | Termine o capítulo 9 | 50">${U.esc(bulk.text)}</textarea>
			<div class="sv-am-row2">
				<label class="sv-btn sv-btn--secondary sv-btn--sm">${U.icon("upload")}<span>Importar planilha</span><input type="file" accept=".csv,.tsv,.txt,.xlsx,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" data-am-sheet hidden></label>
				<small data-am-file>${bulk.file ? U.esc(bulk.file) : "CSV ou Excel (.xlsx) com as colunas Nome, Descrição, G, Categoria, DLC, Ícone"}</small>
			</div>
			<div class="sv-am-defs">
				<label class="sv-mgr-field"><span class="sv-label">Categoria para as sem categoria</span><input class="sv-input" data-am-defcat list="sv-am-cats" value="${U.attr(bulk.defCat)}" placeholder="Nenhuma"></label>
				<label class="sv-mgr-field"><span class="sv-label">DLC para todas (vazio = jogo base)</span><input class="sv-input" data-am-defset list="sv-am-sets" value="${U.attr(bulk.defSet)}" placeholder="Jogo base"></label>
			</div>
			<div class="sv-am-map" data-am-map hidden></div>
			<div class="sv-am-sum" data-am-sum aria-live="polite">Cole ou digite a lista para ver a prévia.</div>
			<div class="sv-am-prev" data-am-prev></div>
			<label class="sv-am-opt" data-am-updwrap hidden><input type="checkbox" data-am-upd ${bulk.update ? "checked" : ""}><span data-am-updlabel></span></label>
		</div>`;
		let plan = [];
		const iconByName = ref => {
			if (!ref) return "";
			const direct = app.vault.getAbstractFileByPath(ref);
			if (direct) return direct.path;
			const leaf = ref.split(/[\\/]/).pop().toLowerCase();
			const inFolder = app.vault.getAbstractFileByPath(`${this.iconFolder(g)}/${ref.split(/[\\/]/).pop()}`);
			if (inFolder) return inFolder.path;
			const any = (app.vault.getFiles?.() || []).find(f => f.path.toLowerCase().endsWith(`/${leaf}`) && /\.(png|jpe?g|webp|gif|avif)$/i.test(f.path));
			return any ? any.path : "";
		};
		const paintBulk = () => {
			const r = this.parseBulk(bulk.text, bulk.mapping);
			const have = new Map(rows.map(x => [C.normalizeKey(x.name), x]));
			plan = r.rows.map(x => {
				const it = { ...x, category: x.category || bulk.defCat.trim(), set: bulk.defSet.trim() ? C.clip(bulk.defSet.trim(), 60) : x.set };
				const ref = it.icon; it.iconRef = ref; it.icon = iconByName(ref);
				const ex = have.get(C.normalizeKey(it.name));
				return { ...it, ex: ex?.path || "" };
			});
			// colunas da planilha: dá para corrigir o que cada uma é
			const mapEl = $("[data-am-map]");
			if (r.headers) {
				mapEl.hidden = false;
				mapEl.innerHTML = `<span class="sv-label">Colunas</span><div>${r.headers.map((h, i) => `<label><small>${U.esc(h || `Coluna ${i + 1}`)}</small><select class="sv-input" data-am-col="${i}">${Object.entries(this.COL_LABELS).map(([k, l]) => `<option value="${k}"${(r.mapping[i] || "") === k ? " selected" : ""}>${l}</option>`).join("")}</select></label>`).join("")}</div>`;
			} else { mapEl.hidden = true; mapEl.innerHTML = ""; }
			const n = plan.filter(p => !p.ex).length, e = plan.length - n;
			const gs = plan.reduce((t, p) => t + p.points, 0);
			const noIcon = plan.filter(p => p.iconRef && !p.icon).length;
			$("[data-am-sum]").innerHTML = plan.length ? `<b>${U.plural(plan.length, "conquista", "conquistas")} · ${U.fmtNum(gs)} G</b><span>${[n ? U.plural(n, "nova", "novas") : "", e ? `${U.plural(e, "já existe", "já existem")}` : "", noIcon ? `${U.plural(noIcon, "ícone não encontrado", "ícones não encontrados")}` : ""].filter(Boolean).map(x => `<span>${x}</span>`).join(" · ")}</span>`
				: bulk.text.trim() ? "Nenhuma conquista reconhecida. Use uma por linha: Nome | Descrição | G." : "Cole ou digite a lista para ver a prévia.";
			$("[data-am-prev]").innerHTML = plan.length ? `<ol>${plan.slice(0, 400).map(p => `<li class="${p.ex ? (bulk.update ? "is-upd" : "is-skip") : "is-new"}">
				<span class="sv-am-ico">${p.icon ? `<img src="${U.attr(C.resolveImage(p.icon))}" alt="">` : U.icon("trophy")}</span>
				<span class="sv-am-pt"><b>${U.esc(p.name)}</b><small>${[p.description, p.category, p.set ? `DLC: ${p.set}` : "", p.iconRef && !p.icon ? `ícone “${p.iconRef}” não encontrado` : ""].filter(Boolean).map(x => U.esc(x)).join(" · ")}</small></span>
				<span class="sv-am-g sv-num">${p.points ? `${U.fmtNum(p.points)}<i>G</i>` : ""}</span>
				<span class="sv-am-tag">${p.ex ? (bulk.update ? "Atualiza" : "Já existe") : "Nova"}</span>
			</li>`).join("")}</ol>${plan.length > 400 ? `<p class="sv-am-none">+${U.fmtNum(plan.length - 400)} na lista</p>` : ""}` : "";
			const wrap = $("[data-am-updwrap]");
			wrap.hidden = !e;
			$("[data-am-updlabel]").textContent = `Atualizar ${U.plural(e, "a que já existe", "as que já existem")} (descrição, G, categoria, DLC e ícone; um backup é feito antes)`;
			const will = n + (bulk.update ? e : 0);
			const go = foot.querySelector("[data-am-bulkgo]");
			if (go) { go.disabled = !will; go.querySelector("span").textContent = will ? `Adicionar ${will}` : "Adicionar"; }
		};
		const runBulk = async () => {
			if (busy) return;
			const todo = plan.filter(p => !p.ex || bulk.update);
			if (!todo.length) return;
			const upd = todo.filter(p => p.ex);
			if (upd.length && !(await V.confirm({ title: `Atualizar ${U.plural(upd.length, "conquista", "conquistas")}?`, text: "A descrição, o G, a categoria, a DLC e o ícone serão trocados pelos da lista. O desbloqueio não muda. Um backup das conquistas deste jogo é feito antes.", confirm: "Atualizar" }))) return;
			busy = true;
			const go = foot.querySelector("[data-am-bulkgo]"); if (go) go.disabled = true;
			try {
				if (upd.length) await this.backup(g, "antes do lote", rows);
				let created = 0, updated = 0;
				for (const p of todo) {
					const data = { name: p.name, description: p.description, points: p.points, category: p.category, set: p.set, notes: p.notes, ...(p.icon ? { icon: p.icon } : {}) };
					if (p.ex) { const patch = { description: data.description, points: data.points, category: data.category, set: data.set, ...(p.icon ? { icon: p.icon } : {}), ...(p.notes ? { notes: p.notes } : {}) }; await this.update(p.ex, patch); patchRow(p.ex, patch); updated++; }
					else { const o = nextOrder(), it = { ...data, unlocked: p.unlocked, unlockedDate: p.unlockedDate }; rows.push(this.row(await this.create(g, it, o), it, o)); created++; }
				}
				dirty = true;
				bulk = { text: "", mapping: null, defCat: "", defSet: "", update: false, file: "" };
				V.toast([created ? U.plural(created, "conquista adicionada", "conquistas adicionadas") : "", updated ? U.plural(updated, "atualizada", "atualizadas") : ""].filter(Boolean).join(", "), { tone: "ok", icon: "trophy" });
				view = "list"; paint();
			} catch (e) { V.toast(`Não foi possível adicionar: ${e.message}`, { tone: "error" }); if (go) go.disabled = false; }
			finally { busy = false; }
		};

		// ------------------------------------------------------------ ícones
		const iconsHtml = () => `<div class="sv-am-icons">
			<p class="sv-am-help">Escolha várias imagens de uma vez. Cada uma é associada à conquista pelo nome do arquivo (ex.: “Guerreiro.png”, “02 - Guerreiro.jpg” ou “2.png”) ou pela ordem. Confira e troque o que precisar antes de salvar.</p>
			<div class="sv-am-row2">
				<label class="sv-btn sv-btn--secondary sv-btn--sm">${U.icon("image")}<span>Escolher imagens</span><input type="file" accept="image/*" multiple data-am-pics hidden></label>
				<div class="sv-am-fit" role="radiogroup" aria-label="Recorte">${[["cover", "Preencher"], ["contain", "Ajustar"]].map(([v, l]) => `<button type="button" role="radio" data-am-fit="${v}" aria-checked="${fit === v}">${l}</button>`).join("")}</div>
			</div>
			<div class="sv-am-row2" data-am-picbar hidden>${U.btn("Associar pelos nomes", { icon: "tag", kind: "ghost", size: "sm", attrs: "data-am-bynames" })}${U.btn("Associar pela ordem", { icon: "sort", kind: "ghost", size: "sm", attrs: "data-am-byorder" })}<label class="sv-am-opt"><input type="checkbox" data-am-onlyempty checked><span>Pela ordem, só nas sem ícone</span></label></div>
			<div class="sv-am-pics" data-am-picgrid></div>
			<p class="sv-am-none" data-am-noicon></p>
		</div>`;
		const paintIcons = () => {
			const grid = $("[data-am-picgrid]");
			$("[data-am-picbar]").hidden = !pics.length;
			const without = rows.filter(r => !r.icon).length;
			$("[data-am-noicon]").textContent = rows.length ? `${U.plural(without, "conquista sem ícone", "conquistas sem ícone")} de ${U.fmtNum(rows.length)}.` : "Cadastre as conquistas antes de adicionar os ícones.";
			const opts = cur => `<option value="">— Não usar —</option>${rows.map(r => `<option value="${U.attr(r.path)}"${r.path === cur ? " selected" : ""}>${U.esc(r.name)}${r.icon ? " ✓" : ""}</option>`).join("")}`;
			grid.innerHTML = pics.map((p, i) => `<figure class="sv-am-pic${p.target ? " is-set" : ""}${fit === "contain" ? " is-contain" : ""}">
				<img src="${U.attr(p.url)}" alt="">
				<figcaption><small title="${U.attr(p.file.name)}">${U.esc(p.file.name)}</small><select class="sv-input" data-am-pic="${i}" aria-label="Conquista da imagem ${U.attr(p.file.name)}">${opts(p.target)}</select>${p.target && rows.find(r => r.path === p.target)?.icon ? `<span class="sv-am-tag">Troca o atual</span>` : ""}</figcaption>
			</figure>`).join("");
			const n = pics.filter(p => p.target).length;
			const go = foot.querySelector("[data-am-icongo]");
			if (go) { go.disabled = !n; go.querySelector("span").textContent = n ? `Salvar ${U.plural(n, "ícone", "ícones")}` : "Salvar ícones"; }
		};
		const byNames = () => { const used = new Set(); for (const p of pics) { const hit = this.matchIcon(p.file.name, rows.filter(r => !used.has(r.path))); p.target = hit ? hit.path : ""; if (hit) used.add(hit.path); } };
		const byOrder = onlyEmpty => { const pool = rows.filter(r => !onlyEmpty || !r.icon); pics.forEach((p, i) => { p.target = pool[i]?.path || ""; }); };
		const runIcons = async () => {
			if (busy) return;
			const todo = pics.filter(p => p.target);
			if (!todo.length) return;
			const dup = todo.map(p => p.target).filter((t, i, a) => a.indexOf(t) !== i);
			if (dup.length) return V.toast("Duas imagens estão na mesma conquista: confira a associação", { tone: "warn" });
			busy = true;
			const go = foot.querySelector("[data-am-icongo]"); if (go) go.disabled = true;
			let ok = 0, fail = 0;
			const t = V.toast(`Salvando ícones (0/${todo.length})…`, { sticky: true, icon: "image", progress: 0 });
			try {
				for (const [i, p] of todo.entries()) {
					const r = rows.find(x => x.path === p.target);
					try { const icon = await this.saveIcon(g, r.name, p.file, fit); await this.update(r.path, { icon }); patchRow(r.path, { icon }); ok++; } catch (_) { fail++; }
					t?.update?.(`Salvando ícones (${i + 1}/${todo.length})…`, { progress: ((i + 1) / todo.length) * 100 });
				}
			} finally { t?.close?.(); busy = false; }
			for (const p of pics) URL.revokeObjectURL(p.url);
			pics = [];
			dirty = true;
			V.toast(`${U.plural(ok, "ícone salvo", "ícones salvos")}${fail ? ` · ${fail} com erro` : ""}`, { tone: fail ? "warn" : "ok", icon: "image" });
			paint();
		};

		// ------------------------------------------------------------ eventos
		const later = (() => { let t = 0; return fn => { clearTimeout(t); t = setTimeout(fn, 200); }; })();
		body.addEventListener("input", e => {
			const el = e.target;
			if (el.matches("[data-am-q]")) { q = el.value; later(() => { const pos = el.selectionStart; paint(); const n = $("[data-am-q]"); n.focus(); n.setSelectionRange(pos, pos); }); }
			if (el.matches("[data-am-text]")) { bulk.text = el.value; bulk.mapping = null; later(paintBulk); }
			if (el.matches("[data-am-defcat]")) { bulk.defCat = el.value; later(paintBulk); }
			if (el.matches("[data-am-defset]")) { bulk.defSet = el.value; later(paintBulk); }
		});
		body.addEventListener("change", async e => {
			const el = e.target;
			if (el.matches("[data-am-sel]")) { el.checked ? sel.add(el.dataset.amSel) : sel.delete(el.dataset.amSel); paint(); }
			if (el.matches("[data-am-upd]")) { bulk.update = el.checked; paintBulk(); }
			if (el.matches("[data-am-col]")) { const r = this.parseBulk(bulk.text, bulk.mapping); const map = [...(r.mapping || [])]; map[Number(el.dataset.amCol)] = el.value; bulk.mapping = map; paintBulk(); }
			if (el.matches("[data-am-pic]")) { pics[Number(el.dataset.amPic)].target = el.value; paintIcons(); }
			if (el.matches('[data-f="unlocked"]')) { const d = $("[data-am-date]"); d.hidden = !el.checked; const inp = d.querySelector("input"); if (el.checked && !inp.value) inp.value = C.today(); }
			if (el.matches("[data-am-iconfile]")) {
				const file = el.files?.[0]; if (!file) return;
				if (!/^image\//.test(file.type || "")) return V.toast("Escolha um arquivo de imagem", { tone: "warn" });
				readForm(); if (form.fileUrl) URL.revokeObjectURL(form.fileUrl);
				form.file = file; form.fileUrl = URL.createObjectURL(file); paintForm();
			}
			if (el.matches("[data-am-pics]")) {
				const files = [...(el.files || [])].filter(f => /^image\//.test(f.type || "")).slice(0, 500);
				for (const f of files) pics.push({ file: f, url: URL.createObjectURL(f), target: "" });
				byNames(); el.value = ""; paintIcons();
			}
			if (el.matches("[data-am-sheet]")) {
				const file = el.files?.[0]; if (!file) return;
				try {
					const text = /\.xlsx$/i.test(file.name) || /spreadsheetml/.test(file.type) ? await this.readXlsx(await file.arrayBuffer()) : (await file.text());
					bulk.text = text; bulk.mapping = null; bulk.file = file.name;
					paint();
				} catch (err) { V.toast(`Não foi possível ler a planilha: ${err.message}`, { tone: "error" }); }
				el.value = "";
			}
		});
		const onClick = async e => {
			const b = e.target.closest("button, [data-am-tab]");
			if (!b || busy) return;
			const d = b.dataset;
			if (d.amTab) { if (view === "form") { form = null; } view = d.amTab; selecting = false; sel.clear(); return paint(); }
			if ("amNew" in d) return openForm(null);
			if (d.amEdit) { if (selecting) { sel.has(d.amEdit) ? sel.delete(d.amEdit) : sel.add(d.amEdit); return paint(); } return openForm(rows.find(r => r.path === d.amEdit)); }
			if (d.amToggle) {
				const r = rows.find(x => x.path === d.amToggle); if (!r) return;
				r.unlocked = !r.unlocked; r.unlockedDate = r.unlocked ? C.today() : "";
				await this.update(r.path, { unlocked: r.unlocked, unlockedDate: r.unlockedDate });
				dirty = true; V._haptic?.(8); return paint();
			}
			if ("amSelect" in d) { selecting = !selecting; sel.clear(); return paint(); }
			if ("amSelall" in d) { const k = C.normalizeKey(q); const vis = rows.filter(r => !k || C.normalizeKey(`${r.name} ${r.description} ${r.category} ${r.set}`).includes(k)); if (sel.size === vis.length) sel.clear(); else vis.forEach(r => sel.add(r.path)); return paint(); }
			if (d.amBulkact) {
				const act = d.amBulkact, paths = [...sel];
				if (!paths.length) return;
				if (act === "category" || act === "set") {
					const ask = $("[data-am-ask]");
					ask.hidden = false;
					ask.innerHTML = `<input class="sv-input" data-am-askval list="${act === "category" ? "sv-am-cats" : "sv-am-sets"}" placeholder="${act === "category" ? "Categoria (vazio = sem categoria)" : "Nome da DLC (vazio = jogo base)"}">${U.btn("Aplicar", { kind: "primary", size: "sm", attrs: `data-am-askgo="${act}"` })}`;
					return ask.querySelector("input").focus();
				}
				if (act === "delete") {
					if (!(await V.confirm({ title: `Excluir ${U.plural(paths.length, "conquista", "conquistas")}?`, text: "As notas vão para a lixeira do Obsidian e um backup das conquistas deste jogo é feito antes. Os ícones continuam no vault.", confirm: "Excluir", danger: true }))) return;
					busy = true;
					try { await this.backup(g, "antes de excluir", rows); for (const p of paths) await this.trash(p); rows = rows.filter(r => !paths.includes(r.path)); } finally { busy = false; }
				} else { busy = true; try { for (const p of paths) { const patch = { unlocked: act === "unlock", unlockedDate: act === "unlock" ? C.today() : "" }; await this.update(p, patch); patchRow(p, patch); } } finally { busy = false; } }
				dirty = true; sel.clear(); selecting = false; return paint();
			}
			if (d.amAskgo) {
				const val = C.clip(($("[data-am-askval]")?.value || "").trim(), d.amAskgo === "set" ? 60 : 40);
				busy = true; try { for (const p of sel) { await this.update(p, { [d.amAskgo]: val }); patchRow(p, { [d.amAskgo]: val }); } } finally { busy = false; }
				dirty = true; sel.clear(); selecting = false; return paint();
			}
			if (d.amFit) { fit = d.amFit; if (view === "form") { readForm(); return paintForm(); } return view === "icons" ? (body.querySelectorAll("[data-am-fit]").forEach(x => x.setAttribute("aria-checked", x.dataset.amFit === fit)), body.querySelectorAll(".sv-am-pic").forEach(x => x.classList.toggle("is-contain", fit === "contain"))) : null; }
			if ("amIconclear" in d) { readForm(); if (form.fileUrl) URL.revokeObjectURL(form.fileUrl); Object.assign(form, { icon: "", iconSrc: "", file: null, fileUrl: "" }); return paintForm(); }
			if (d.amKind !== undefined) { body.querySelectorAll("[data-am-kind]").forEach(x => x.setAttribute("aria-checked", x === b)); const inp = $('[data-f="set"]'); inp.hidden = d.amKind !== "dlc"; if (d.amKind === "dlc") inp.focus(); return; }
			if ("amBack" in d) { if (form?.fileUrl) URL.revokeObjectURL(form.fileUrl); form = null; view = "list"; return paint(); }
			if ("amSave" in d) return saveForm(false);
			if ("amSavenext" in d) return saveForm(true);
			if ("amDup" in d) { readForm(); return openForm(form, { dup: true }); }
			if ("amDel" in d) {
				if (!(await V.confirm({ title: "Excluir esta conquista?", text: "A nota vai para a lixeira do Obsidian e um backup das conquistas deste jogo é feito antes. O ícone continua no vault.", confirm: "Excluir", danger: true }))) return;
				busy = true; try { await this.backup(g, "antes de excluir", rows); await this.trash(form.path); rows = rows.filter(r => r.path !== form.path); } finally { busy = false; }
				dirty = true; form = null; view = "list"; return paint();
			}
			if ("amBulkgo" in d) return runBulk();
			if ("amIcongo" in d) return runIcons();
			if ("amBynames" in d) { byNames(); return paintIcons(); }
			if ("amByorder" in d) { byOrder(!!$("[data-am-onlyempty]")?.checked); return paintIcons(); }
			if ("amExport" in d) { try { const p = await this.exportCsv(g, rows); V.toast(`CSV salvo em ${p}`, { tone: "ok", icon: "download" }); } catch (err) { V.toast(`Não foi possível exportar: ${err.message}`, { tone: "error" }); } return; }
			if ("amBackup" in d) { try { const p = await this.backup(g, "manual", rows); V.toast(p ? `Backup salvo em ${p}` : "Nada para guardar ainda", { tone: "ok", icon: "shield" }); } catch (err) { V.toast(`Não foi possível fazer o backup: ${err.message}`, { tone: "error" }); } return; }
			if ("amRestore" in d) {
				const box = $("[data-am-restorelist]");
				const list = await this.backups(g);
				box.hidden = false;
				box.innerHTML = list.length ? `<p class="sv-am-help">Restaurar não apaga nada: as conquistas do backup são recriadas ou voltam aos valores dele (um backup do estado atual é feito antes).</p><ol>${list.map(x => `<li><span>${U.esc(x.label)}</span>${U.btn("Restaurar", { kind: "ghost", size: "sm", attrs: `data-am-restorego="${U.attr(x.path)}"` })}</li>`).join("")}</ol>` : `<p class="sv-am-help">Nenhum backup deste jogo ainda.</p>`;
				return;
			}
			if (d.amRestorego) {
				if (!(await V.confirm({ title: "Restaurar este backup?", text: "As conquistas do backup voltam aos valores dele e as que faltam são recriadas. Nada é apagado.", confirm: "Restaurar" }))) return;
				busy = true;
				try {
					const r = await this.restore(g, d.amRestorego, rows);
					rows = rows.filter(x => app.vault.getAbstractFileByPath(x.path));
					for (const u of r.updated) patchRow(u.path, u.patch);
					rows.push(...r.created);
					dirty = true;
					V.toast(`Backup restaurado: ${[r.created.length ? U.plural(r.created.length, "recriada", "recriadas") : "", r.updated.length ? U.plural(r.updated.length, "atualizada", "atualizadas") : ""].filter(Boolean).join(", ") || "nada mudou"}`, { tone: "ok", icon: "refresh" });
				}
				catch (err) { V.toast(`Não foi possível restaurar: ${err.message}`, { tone: "error" }); }
				finally { busy = false; }
				return paint();
			}
		};
		body.addEventListener("click", onClick);
		foot.addEventListener("click", onClick);
		// Enter no nome salva e já abre a próxima (cadastro sequencial)
		body.addEventListener("keydown", e => {
			if (view === "form" && e.key === "Enter" && e.target.matches('[data-f="name"], [data-f="points"], [data-f="category"]') && !e.isComposing) { e.preventDefault(); saveForm(!form.path); }
		});
		paint();
		return m;
	}
}
