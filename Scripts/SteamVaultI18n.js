// ===================================================================
// Game Library — Idioma (3.24.0)
// ===================================================================
// O app é escrito em português. Com o inglês escolhido em Configurações,
// este módulo troca os textos depois que cada tela é desenhada: nós de
// texto e atributos lidos por pessoas (title, aria-label, placeholder…).
//   · Frases fixas: dicionário direto.
//   · Frases com partes variáveis ("606 jogos", "Último backup há 3 dias"):
//     modelos com {0}, {1}…; cada parte capturada também é traduzida.
//   · Números trocam vírgula decimal por ponto.
// O que não estiver no dicionário continua em português — nada quebra.
// As notas do vault (títulos, sinopses, análises) nunca são traduzidas.
// ===================================================================

class SteamVaultI18n {
	constructor() {
		// 3.55.0: o dicionário português → inglês (3071 frases, ~190 KB) mora em
		// Assets/i18n/en.json e só é lido com o inglês ligado — em português o
		// app abre sem carregá-lo. Frases fixas e modelos com {0}, {1}…
		this.en = {};
		this.dictPath = "Assets/i18n/en.json";
		this._loading = null;
		this._enLoaded = false;
		this._compiled = null;
		this._memo = new Map();
		// inglês salvo: começa a ler já, antes da primeira tela
		if (this.on) this.load();
	}

	// ------------------------------------------------------------ idioma
	get lang() {
		try { return localStorage.getItem("steamvault:ui:lang") === "en" ? "en" : "pt"; } catch (_) { return "pt"; }
	}
	get on() { return this.lang === "en"; }
	setLang(l) {
		try { localStorage.setItem("steamvault:ui:lang", l === "en" ? "en" : "pt"); } catch (_) {}
		customJS.SteamVaultUI?._onStore?.("lang", l);
		this._memo.clear();
		if (this.on) this.load();
	}

	// lê o dicionário uma vez (as chamadas seguintes reaproveitam a mesma leitura).
	// Sem o arquivo, o app segue em português — nada quebra.
	load() {
		if (this._enLoaded) return Promise.resolve();
		if (!this._loading) this._loading = (async () => {
			try {
				const raw = await app.vault.adapter.read(this.dictPath);
				const dict = JSON.parse(raw);
				if (dict && typeof dict === "object" && !Array.isArray(dict)) this.en = dict;
			} catch (err) { console.warn("Game Library: dicionário de inglês não carregado", err); }
			this._enLoaded = true;
			this._compiled = null;
			this._memo.clear();
		})();
		return this._loading;
	}

	// ------------------------------------------------------------ dicionário
	_compile() {
		if (this._compiled) return this._compiled;
		const exact = new Map(), lower = new Map(), tpls = [];
		const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		for (const [pt, en] of Object.entries(this.en)) {
			if (!en || en === pt) continue;
			if (!/\{\d+\}/.test(pt)) { exact.set(pt, en); lower.set(pt.toLowerCase(), en); continue; }
			// modelos precisam de texto fixo suficiente para não casar com qualquer coisa
			const literal = pt.replace(/\{\d+\}/g, "").replace(/[^A-Za-zÀ-ú]/g, "");
			if (literal.length < 3) continue;
			const order = [];
			const re = new RegExp("^" + pt.split(/(\{\d+\})/).map(p => { const m = /^\{(\d+)\}$/.exec(p); if (m) { order.push(Number(m[1])); return "(.+?)"; } return esc(p); }).join("") + "$", "s");
			// palavra-chave mais longa: filtro rápido antes do regex
			const key = (pt.replace(/\{\d+\}/g, " ").match(/[A-Za-zÀ-ú]{3,}/g) || []).sort((a, b) => b.length - a.length)[0]?.toLowerCase() || "";
			tpls.push({ re, order, en, key, size: literal.length });
		}
		tpls.sort((a, b) => b.size - a.size);
		return (this._compiled = { exact, lower, tpls });
	}

	// "1.234,5" → "1,234.5"
	_num(s) {
		return s.replace(/\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+,\d+/g, m => m.replace(/\./g, "\u0000").replace(/,/g, ".").replace(/\u0000/g, ","));
	}

	// só número com unidade ("6,4 h", "R$ 23,99", "45 min", "3,5×")
	_unit(s) { return /^[\s+\-~]*(R\$\s*)?[\d.,]+\s*(h|min|×|x|%|k|mil)?\s*$/.test(s); }

	t(input, depth = 0) {
		if (!this.on || input == null) return input;
		const s = String(input);
		if (!/[A-Za-zÀ-ú]/.test(s)) return this._num(s);
		if (this._unit(s)) return this._num(s);
		if (this._memo.has(s)) return this._memo.get(s);
		const lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0];
		const core = s.trim().replace(/\s+/g, " ");
		const out = lead + this._core(core, depth) + trail;
		if (this._memo.size > 20000) this._memo.clear();
		this._memo.set(s, out);
		return out;
	}

	// "há 2 sem." → "2 wk ago" (em qualquer ponto da frase)
	_rel(s) {
		return s.replace(/\bhá (\d+) sem\./g, "$1 wk ago").replace(/\bhá 1 dia\b/g, "1 day ago").replace(/\bhá (\d+) dias\b/g, "$1 days ago")
			.replace(/\bhá 1 mês\b/g, "1 month ago").replace(/\bhá (\d+) meses\b/g, "$1 months ago")
			.replace(/\bhá 1 ano\b/g, "1 year ago").replace(/\bhá (\d+) anos\b/g, "$1 years ago");
	}

	_core(s, depth) {
		const { exact, lower, tpls } = this._compile();
		if (exact.has(s)) return exact.get(s);
		// pontuação, emojis e símbolos nas pontas: "📁 Escolher…", "Plataforma:", "(opcional)"
		const m = /^([\s\p{P}\p{S}\p{Extended_Pictographic}️‍]*?)(\p{L}[\s\S]*?\p{L}|\p{L})([\s\p{P}\p{S}️]*)$/u.exec(s);
		const edged = m && (m[1] || m[3]);
		if (edged && exact.has(m[2])) return m[1] + exact.get(m[2]) + m[3];
		if (s.length > 3 && lower.has(s.toLowerCase())) {
			const en = lower.get(s.toLowerCase());
			return s === s.toUpperCase() ? en.toUpperCase() : en;
		}
		if (depth > 4) return s;
		// tempo relativo dentro da frase
		if (s.includes("há ")) { const r = this._rel(s); if (r !== s) return this._core(r, depth + 1); }
		// contagens: "3 de 5 prontos", "23 de 130 conquistas · Steam", "de 5", "6/10 jogos no vault"
		let c = /^([\d.,]+) de ([\d.,]+)(.*)$/.exec(s);
		if (c) return `${this._num(c[1])} of ${this._num(c[2])}${c[3] ? (c[3].startsWith(" ") ? " " : "") + this._core(c[3].trim(), depth + 1) : ""}`;
		// datas por extenso: "2 de outubro (de 2026)"
		c = /^(\d{1,2}) de (janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?: de (\d{4}))?(.*)$/.exec(s);
		if (c) return `${exact.get(c[2]) || c[2]} ${c[1]}${c[3] ? `, ${c[3]}` : ""}${c[4] ? this._core(c[4], depth + 1) : ""}`;
		c = /^de ([\d.,]+)$/.exec(s);
		if (c) return `of ${this._num(c[1])}`;
		c = /^([\d.,]+\/[\d.,]+) (.+)$/.exec(s);
		if (c) return `${this._num(c[1])} ${this._core(c[2], depth + 1)}`;
		c = /^em (.+)$/.exec(s);
		if (c) return `in ${this._core(c[1], depth + 1)}`;
		// número + resto ("606 jogos", "54% das conquistas", "31% feito até agora")
		const n = /^([+\-~]?[\d.,]+%?\s*)([A-Za-zÀ-ú][\s\S]*)$/.exec(s);
		if (n) {
			const rest = n[2].trim();
			if (exact.has(rest)) return this._num(n[1]) + exact.get(rest);
		}
		// modelos
		const low = s.toLowerCase();
		for (const tp of tpls) {
			if (tp.key && !low.includes(tp.key)) continue;
			const r = tp.re.exec(s);
			if (!r) continue;
			const parts = r.slice(1);
			return tp.en.replace(/\{(\d+)\}/g, (_, k) => {
				const v = parts[tp.order.indexOf(Number(k))];
				return v === undefined ? "" : v.match(/^\s*/)[0] + this._core(v.trim(), depth + 1);
			});
		}
		// sem a pontuação das pontas, de novo (depois dos modelos, que podem incluí-la)
		if (edged && depth < 4) { const inner = this._core(m[2], depth + 1); if (inner !== m[2]) return m[1] + inner + m[3]; }
		if (n) { const rest = n[2].trim(), tr = this._core(rest, depth + 1); if (tr !== rest) return this._num(n[1]) + tr; }
		// frases compostas: traduz cada pedaço
		for (const sep of [" · ", " — ", "; ", ": ", ", "]) {
			if (!s.includes(sep)) continue;
			const bits = s.split(sep);
			const tr = bits.map(b => this._core(b.trim(), depth + 1));
			if (tr.some((x, i) => x !== bits[i].trim())) return tr.join(sep);
		}
		return this._unit(s) ? this._num(s) : s;
	}

	// cartões desenhados em canvas: o texto passa pelo tradutor ao desenhar e
	// ao medir (as quebras de linha usam o texto já traduzido)
	wrapCanvas(x) {
		if (!this.on || !x || x.__svI18n) return x;
		x.__svI18n = true;
		const fill = x.fillText.bind(x), measure = x.measureText.bind(x);
		x.fillText = (s, ...a) => fill(this.t(String(s)), ...a);
		x.measureText = s => measure(this.t(String(s)));
		return x;
	}

	// ------------------------------------------------------------ DOM
	get _attrs() { return ["title", "aria-label", "placeholder", "alt", "data-tip", "aria-description"]; }
	get _skipSel() { return "code, pre, script, style, textarea, [contenteditable=''], [contenteditable='true'], .sv-no-i18n, .cm-editor, .sv-synopsis, .sv-hero-summary, .sv-idhero-desc, .sv-note > p, .sv-diary-session > p, .sv-pf-bio, .sv-vitrine-desc, .svl-playthrough-note, .sv-runs-note"; }
	_skip(el) {
		// 3.52.0: texto escrito pela pessoa (sinopse, descrições, notas, anotações
		// de sessão, bio) nunca é traduzido, nem em pedaços
		return !el || !!el.closest?.(this._skipSel);
	}
	// atributos: o placeholder de um campo de texto é traduzido; o que a pessoa digitou, não
	_skipAttr(el) {
		return !el || el.closest?.("code, pre, script, style, .sv-no-i18n, .cm-editor");
	}

	apply(root) {
		if (!this.on || !root) return;
		// 3.68.0: percorre elementos e textos e pula de uma vez as áreas que
		// não se traduzem (antes, cada texto subia pelos pais com closest(),
		// testando a lista inteira de seletores)
		const startEl = root.nodeType === 1 ? root : root.parentElement;
		if (startEl && root.nodeType !== 11 && this._skip(startEl)) return;
		const skipSel = this._skipSel, re = /[A-Za-zÀ-ú]/;
		const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
			acceptNode: n => n.nodeType === 1 ? (n.matches(skipSel) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP) : (re.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP)
		});
		const nodes = [];
		for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n);
		for (const n of nodes) { const v = n.nodeValue, t = this.t(v); if (t !== v) n.nodeValue = t; }
		const sel = this._attrs.map(a => `[${a}]`).join(",");
		const els = root.nodeType === 1 && root.matches?.(sel) ? [root, ...root.querySelectorAll(sel)] : [...(root.querySelectorAll?.(sel) || [])];
		for (const el of els) {
			if (this._skipAttr(el)) continue;
			for (const a of this._attrs) {
				const v = el.getAttribute(a);
				if (!v || !/[A-Za-zÀ-ú]/.test(v)) continue;
				const t = this.t(v);
				if (t !== v) el.setAttribute(a, t);
			}
		}
		// o observador de mudanças vê este mesmo conteúdo como "adicionado"
		// logo depois; a marca evita percorrê-lo de novo
		if (root.nodeType === 1) root.__svI18nDone = true;
	}

	// telas, janelas, avisos e menus que aparecem depois
	observe() {
		if (window.__svI18nObs || typeof MutationObserver !== "function") return;
		const scope = ".sv-host, .sv-layer, .sv-app, .sv-toasts, .sv-modal-root, .sv-lightbox, .sv-sheet, .sv-legacy, .sv-boot, .svl-modal, .sv-drawer";
		const obs = new MutationObserver(list => {
			if (!this.on) return;
			for (const m of list) {
				if (m.type === "attributes") {
					const el = m.target;
					if (el.closest?.(scope) && !this._skipAttr(el)) { const v = el.getAttribute(m.attributeName); const t = v && this.t(v); if (t && t !== v) el.setAttribute(m.attributeName, t); }
					continue;
				}
				for (const n of m.addedNodes) {
					if (n.nodeType === 3) { const p = n.parentElement; if (p?.closest(scope) && !this._skip(p)) { const v = n.nodeValue, t = this.t(v); if (t !== v) n.nodeValue = t; } }
					else if (n.nodeType === 1 && !n.__svI18nDone && (n.matches?.(scope) || n.closest?.(scope) || n.querySelector?.(scope))) this.apply(n);
				}
			}
		});
		obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: this._attrs });
		window.__svI18nObs = obs;
	}
}
