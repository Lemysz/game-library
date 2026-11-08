// ==========================================================================
// Game Library — Steam Picks (recomendações da loja no fim da Home)
//
// Fonte: páginas públicas da LOJA Steam (store.steampowered.com), sem Steam
// Web API, sem chave, sem login — mesma regra de privacidade do sync.
//   · /api/featuredcategories  → ofertas, mais vendidos e novidades, com
//     nome, capa, preço final/original em BRL, desconto e fim da oferta
//     (UMA requisição para a seção inteira)
//   · /appreviews/<id>         → avaliação (resumo), só por card visível
//   · /api/appdetails?filters=genres → gêneros, só por card visível
//
// Carregamento em camadas (pensado para o celular):
//   1. a Home abre sem nenhuma consulta à Steam;
//   2. um sentinela no fim da Home dispara a lista quando você se aproxima
//      (IntersectionObserver na própria área que rola);
//   3. capa, avaliação e gênero de cada card só carregam quando AQUELE card
//      está perto de aparecer na prateleira.
// Offline ou falha: a seção não é montada (sem espaço vazio, sem erro).
// Preço com mais de 30 min nunca é mostrado como preço atual.
//
// Acesso: customJS.SteamVaultPicks
// ==========================================================================

class SteamVaultPicks {

	constructor() {
		this.STORE = "https://store.steampowered.com";
		this.HOSTS = ["store.steampowered.com"];
		this.CACHE = ".steamvault/picks.json";
		this.PRICE_TTL = 30 * 60 * 1000;          // preço: 30 min
		this.META_TTL = 24 * 60 * 60 * 1000;      // gênero/avaliação: 24 h
		this.TIMEOUT = 10000;
		this.MAX = 12;
		this.LISTS = [["specials", "Ofertas"], ["top_sellers", "Mais vendidos"], ["new_releases", "Novidades"]];
		this.REVIEW_PT = { 9: "Extremamente positivas", 8: "Muito positivas", 7: "Positivas", 6: "Ligeiramente positivas", 5: "Neutras", 4: "Ligeiramente negativas", 3: "Negativas", 2: "Muito negativas", 1: "Extremamente negativas" };
	}

	get U() { return customJS.SteamVaultUI; }

	// ------------------------------------------------------------ rede
	// link de loja: só https e só os domínios das lojas (o cache em
	// .steamvault/ é um arquivo do vault e pode ter sido editado)
	_storeUrl(url) {
		const href = customJS.SteamVaultCore.safeUrl(url, { protocols: ["https:"] });
		if (!href) return "";
		const host = new URL(href).hostname.toLowerCase();
		return this.HOSTS.includes(host) || customJS.SteamVaultStores?.allowsHost?.(host) ? href : "";
	}
	_open(url) { const u = this._storeUrl(url); if (u) window.open(u, "_blank"); }

	_online() { return typeof navigator === "undefined" || navigator.onLine !== false; }

	async _get(url, { as = "json" } = {}) {
		const host = new URL(url).hostname.toLowerCase();
		const extra = globalThis.customJS?.SteamVaultStores;
		if (!this.HOSTS.includes(host) && !extra?.allowsHost?.(host)) throw new Error("host");
		const request = (typeof requestUrl === "function" && requestUrl) || globalThis.customJS?.obsidian?.requestUrl;
		if (typeof request !== "function") throw new Error("sem requestUrl");
		// uma requisição por vez POR LOJA, com pequeno intervalo: nunca uma
		// rajada no mesmo site; lojas diferentes carregam em paralelo
		const run = async () => {
			const res = await Promise.race([
				request({ url, method: "GET", headers: { Accept: as === "json" ? "application/json" : "text/html,application/xhtml+xml" }, throw: false }),
				new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), this.TIMEOUT))
			]);
			await new Promise(r => setTimeout(r, 180));
			if (!res || res.status < 200 || res.status >= 300) throw new Error(`http ${res?.status}`);
			// resposta absurda (mais de 8 MB) não é processada
			if (String(res.text ?? "").length > 8e6) throw new Error("formato");
			if (as === "text") return String(res.text ?? "");
			return typeof res.json === "object" && res.json !== null ? res.json : JSON.parse(String(res.text ?? ""));
		};
		this._queues = this._queues || {};
		const q = this._queues[host] || Promise.resolve();
		const p = q.then(run, run);
		this._queues[host] = p.catch(() => {});
		return p;
	}

	// ------------------------------------------------------------ cache
	// memória (sessão) → arquivo .steamvault/picks.json (entre sessões)
	async _readCache() {
		if (window.__svPicks) return window.__svPicks;
		try {
			const a = app.vault.adapter;
			if (await a.exists(this.CACHE)) window.__svPicks = JSON.parse(await a.read(this.CACHE));
		} catch (_) {}
		return window.__svPicks || null;
	}

	async _writeCache(data) {
		window.__svPicks = data;
		try {
			const a = app.vault.adapter;
			if (!(await a.exists(".steamvault"))) await a.mkdir(".steamvault");
			await a.write(this.CACHE, JSON.stringify(data));
		} catch (_) {}
	}

	_img(url) { return /^https:\/\/[a-z0-9.-]*(steamstatic|steampowered|akamaihd)\.[a-z.]+\//i.test(String(url || "")) ? String(url) : ""; }

	_normItem(x, kind) {
		const id = String(x?.id ?? "");
		if (!/^\d+$/.test(id) || !x.name) return null;
		const cents = v => (Number.isFinite(Number(v)) ? Number(v) / 100 : null);
		const final = cents(x.final_price), original = cents(x.original_price);
		return {
			id, name: String(x.name), kind,
			image: this._img(x.header_image) || this._img(x.large_capsule_image) || this._img(x.small_capsule_image),
			final, original: original && final !== null && original > final ? original : null,
			discount: Number(x.discount_percent) > 0 ? Number(x.discount_percent) : 0,
			free: final === 0,
			endsAt: Number(x.discount_expiration) > 0 ? Number(x.discount_expiration) * 1000 : null,
			currency: String(x.currency || "BRL"),
			store: "steam", url: `${this.STORE}/app/${id}/`,
			key: globalThis.customJS?.SteamVaultStores?.norm?.(x.name) || String(x.name).toLowerCase()
		};
	}

	// lista da loja: cache válido (≤ 30 min) ou uma consulta nova
	async list() {
		const now = Date.now();
		const cache = await this._readCache();
		if (cache?.lists && now - (cache.fetchedAt || 0) < this.PRICE_TTL) return cache;
		if (!this._online()) return null;
		try {
			const j = await this._get(`${this.STORE}/api/featuredcategories?cc=br&l=brazilian`);
			const lists = {};
			for (const [key] of this.LISTS) {
				const seen = new Set();
				lists[key] = (j?.[key]?.items || []).map(x => this._normItem(x, key))
					.filter(x => x && x.currency === "BRL" && !seen.has(x.id) && seen.add(x.id));
			}
			if (!Object.values(lists).some(l => l.length)) return null;
			const data = { fetchedAt: now, lists, meta: cache?.meta || {} };
			await this._writeCache(data);
			return data;
		} catch (_) {
			return null; // offline/limite/formato: a seção simplesmente não aparece
		}
	}

	// gênero + avaliação de UM jogo (sob demanda, com cache de 24 h)
	async meta(id) {
		const data = window.__svPicks;
		const hit = data?.meta?.[id];
		if (hit && Date.now() - hit.at < this.META_TTL) return hit;
		const out = { at: Date.now(), genres: [], review: null, percent: null, total: 0 };
		try {
			const d = await this._get(`${this.STORE}/api/appdetails?appids=${id}&cc=br&l=brazilian&filters=genres`);
			out.genres = (d?.[id]?.data?.genres || []).map(g => String(g.description || "")).filter(Boolean).slice(0, 2);
		} catch (_) {}
		try {
			const r = await this._get(`${this.STORE}/appreviews/${id}?json=1&language=all&purchase_type=all&num_per_page=0&filter=summary&l=brazilian`);
			const q = r?.query_summary;
			if (q && Number(q.total_reviews) > 0) {
				out.review = this.REVIEW_PT[Number(q.review_score)] || String(q.review_score_desc || "");
				out.percent = Math.round((Number(q.total_positive) / Number(q.total_reviews)) * 100);
				out.total = Number(q.total_reviews);
				out.score = Number(q.review_score);
			}
		} catch (_) {}
		if (data) { data.meta = data.meta || {}; data.meta[id] = out; this._writeCache(data); }
		return out;
	}

	// ------------------------------------------------------------ interface
	money(v, cur) {
		if (!Number.isFinite(v)) return "";
		if (!cur || cur === "BRL") return cur ? this.U.fmtMoney(v) : v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
		try { return v.toLocaleString("pt-BR", { style: "currency", currency: cur }); } catch (_) { return `${v.toFixed(2)} ${cur}`; }
	}

	storeTag(store) {
		const S = globalThis.customJS?.SteamVaultStores;
		const label = store === "steam" ? "Steam" : S?.label?.(store) || store;
		return `<span class="sv-pick-store sv-pick-store--${this.U.attr(store)}">${this.U.esc(label)}</span>`;
	}

	// Card único para todas as lojas (mesma estrutura do card da Steam).
	// "others" = quantas OUTRAS lojas já carregadas têm o mesmo jogo.
	card(it, others = 0) {
		const U = this.U;
		const days = it.endsAt ? Math.ceil((it.endsAt - Date.now()) / 86400000) : null;
		const ends = days !== null && days > 0 ? (days === 1 ? "Oferta termina amanhã" : `Oferta por mais ${days} dias`) : "";
		const price = it.free ? `<b class="sv-pick-final">Gratuito</b>`
			: `${it.discount ? `<span class="sv-pick-off">-${it.discount}%</span>` : ""}<span class="sv-pick-prices">${it.original ? `<s>${this.money(it.original, it.currency)}</s>` : ""}<b class="sv-pick-final">${this.money(it.final, it.currency)}</b></span>`;
		// Steam: avaliação/gênero chegam sob demanda (meta); outras lojas: o que a lista já trouxe
		const staticMeta = it.store === "steam" ? "" : this.metaHtml({ genres: it.genres, rating: it.rating }, it);
		const meta = it.store === "steam" ? (ends ? `<span>${U.esc(ends)}</span>` : `<span class="sv-pick-skel"></span>`) : staticMeta;
		return `<article class="sv-pick" role="link" tabindex="0" data-href="${U.attr(this._storeUrl(it.url))}" data-pick="${U.attr(it.store === "steam" ? it.id : "")}" data-store="${U.attr(it.store)}" data-key="${U.attr(it.key || "")}" title="Abrir ${U.attr(it.name)} na loja">
			<span class="sv-pick-art">${it.image ? `<img data-lazy-src="${U.attr(it.image)}" alt="" decoding="async">` : ""}${U.icon("external")}</span>
			<span class="sv-pick-body">
				<b class="sv-pick-name">${U.esc(it.name)}</b>
				<span class="sv-pick-meta" data-pick-meta>${meta}</span>
				<span class="sv-pick-row">${this.storeTag(it.store)}<button type="button" class="sv-pick-compare" data-compare title="Comparar preços entre lojas">${U.icon("layers")}<span>${others ? `+${others} ${others === 1 ? "loja" : "lojas"}` : "Comparar"}</span></button></span>
				<span class="sv-pick-price">${price}</span>
			</span>
		</article>`;
	}

	metaHtml(m, it) {
		const U = this.U;
		const parts = [];
		if (m?.review) parts.push(`<span class="sv-pick-review sv-pick-review--${m.score >= 7 ? "pos" : m.score >= 5 ? "mid" : "neg"}">${U.esc(m.review)}${m.percent !== null ? ` · ${m.percent}%` : ""}</span>`);
		if (m?.rating?.value) parts.push(`<span class="sv-pick-review sv-pick-review--${m.rating.value / (m.rating.scale || 5) >= 0.7 ? "pos" : "mid"}">${String(m.rating.value).replace(".", ",")}/${m.rating.scale || 5}</span>`);
		if (m?.genres?.length) parts.push(`<span>${U.esc(m.genres.join(", "))}</span>`);
		if (!parts.length && it?.endsAt) {
			const days = Math.ceil((it.endsAt - Date.now()) / 86400000);
			if (days > 0) parts.push(`<span>${days === 1 ? "Oferta termina amanhã" : `Oferta por mais ${days} dias`}</span>`);
		}
		return parts.join("");
	}

	// itens do filtro atual (Todos = lojas intercaladas)
	itemsFor(state, data, stores, owned) {
		const notOwned = x => !(x.store === "steam" ? owned.ids.has(x.id) : owned.keys.has(x.key));
		const steamList = (data?.lists?.[state.steamTab] || []).filter(notOwned);
		if (state.store === "steam") return steamList;
		if (state.store !== "all") return (stores[state.store] || []).filter(notOwned);
		const cols = [(data?.lists?.specials || []).filter(notOwned), ...Object.values(stores).map(l => l.filter(notOwned))].filter(l => l.length);
		// "Todos": lojas intercaladas e UM card por jogo — o de menor preço
		// entre as lojas na mesma moeda (os outros ficam em "+N lojas")
		const out = [], seen = new Set();
		for (let i = 0; out.length < 60 && cols.some(c => i < c.length); i++) {
			for (const c of cols) {
				if (i >= c.length) continue;
				const x = c[i];
				if (x.key && seen.has(x.key)) continue;
				if (x.key) seen.add(x.key);
				const same = x.key ? [...(this._index?.get(x.key)?.values() || [])].filter(o => o.currency === x.currency && Number.isFinite(o.final) && notOwned(o)) : [];
				out.push(same.length > 1 ? same.reduce((a, b) => (b.final < a.final ? b : a)) : x);
			}
		}
		return out;
	}

	sectionHtml(state, data, stores, owned) {
		const U = this.U;
		const S = globalThis.customJS?.SteamVaultStores;
		const avail = [["all", "Todos"]];
		if (data) avail.push(["steam", "Steam"]);
		for (const id of Object.keys(stores)) if (stores[id].length) avail.push([id, S.label(id)]);
		if (!avail.some(([k]) => k === state.store)) state.store = "all";
		// só a Steam disponível: a seção volta a ser a Steam Picks original (com as abas)
		if (avail.length === 2 && data) state.store = "steam";
		const steamTabs = state.store === "steam" && data ? this.LISTS.filter(([k]) => (data.lists[k] || []).length) : [];
		const items = this.itemsFor(state, data, stores, owned);
		const shown = items.slice(0, state.show);
		return `<section class="sv-shelf sv-shelf--picks sv-picks" data-picks-ready>
			${U.sectionHead("Ofertas & recomendações", {
				sub: "Preços como informados por cada loja",
				action: `<span class="sv-shelf-nav">${U.btn("", { icon: "chevronLeft", kind: "ghost", size: "sm", action: "shelf-prev", title: "Anterior" })}${U.btn("", { icon: "chevronRight", kind: "ghost", size: "sm", action: "shelf-next", title: "Próximo" })}</span>`
			})}
			${avail.length > 2 ? `<div class="sv-segmented sv-picks-stores" role="tablist">${avail.map(([k, l]) => `<button type="button" class="${k === state.store ? "is-active" : ""}" data-picks-store="${k}">${U.esc(l)}</button>`).join("")}</div>` : ""}
			${steamTabs.length > 1 ? `<div class="sv-segmented sv-picks-tabs" role="tablist">${steamTabs.map(([k, l]) => `<button type="button" class="${k === state.steamTab ? "is-active" : ""}" data-picks-tab="${k}">${U.esc(l)}</button>`).join("")}</div>` : ""}
			<div class="sv-shelf-track" tabindex="0">${shown.map(it => this.card(it, this._others(it))).join("")}${items.length > shown.length ? this.moreTile(items.length - shown.length) : ""}</div>
		</section>`;
	}

	moreTile(rest) {
		return `<button type="button" class="sv-pick sv-pick--more" data-picks-more>${this.U.icon("chevronRight")}<b>Ver mais</b><small>${rest} ${rest === 1 ? "oferta" : "ofertas"}</small></button>`;
	}

	// mesmo jogo em outras listas já carregadas (sem nenhuma requisição)
	_others(it) {
		const idx = this._index?.get(it.key);
		return idx ? [...idx.keys()].filter(st => st !== it.store).length : 0;
	}

	_buildIndex(data, stores) {
		const idx = new Map();
		const add = x => { if (!x?.key) return; if (!idx.has(x.key)) idx.set(x.key, new Map()); const m = idx.get(x.key); if (!m.has(x.store)) m.set(x.store, x); };
		for (const k of Object.keys(data?.lists || {})) (data.lists[k] || []).forEach(add);
		for (const l of Object.values(stores)) l.forEach(add);
		this._index = idx;
	}

	skeletonHtml() {
		return `<section class="sv-shelf sv-shelf--picks sv-picks is-loading" aria-busy="true">
			<header class="sv-sechead"><div class="sv-sechead-text"><h2>Ofertas & recomendações</h2><p>Carregando das lojas…</p></div></header>
			<div class="sv-shelf-track">${Array.from({ length: 4 }, () => `<span class="sv-pick sv-pick--skel"><span class="sv-pick-art"></span><span class="sv-pick-body"><span class="sv-pick-skel sv-pick-skel--l"></span><span class="sv-pick-skel"></span><span class="sv-pick-skel sv-pick-skel--s"></span></span></span>`).join("")}</div>
		</section>`;
	}

	// ------------------------------------------------------------ comparação
	async compare(ctx, key) {
		const U = this.U, S = globalThis.customJS?.SteamVaultStores;
		if (!S || !ctx?.V?.modal) return;
		const known = this._index?.get(key);
		if (!known) return;
		const first = [...known.values()][0];
		const body = document.createElement("div");
		body.className = "sv-compare";
		body.innerHTML = `<p class="sv-modal-text">Preços como informados por cada loja agora. Moedas diferentes não são comparadas entre si.</p><div class="sv-compare-list" aria-busy="true">${["steam", ...S.ids()].map(st => `<div class="sv-compare-row is-loading">${this.storeTag(st)}<span class="sv-pick-skel"></span></div>`).join("")}</div>`;
		const m = ctx.V.modal({ title: first.name, sub: "Comparar preços", size: "sm", body });
		const rows = await S.searchAll(first.name, [...known.values()]);
		if (!m.el.isConnected) return;
		const order = ["steam", ...S.ids()];
		const byStore = new Map(rows.map(r => [r.store, r]));
		const priced = rows.filter(r => Number.isFinite(r.final));
		const cur = priced.find(r => r.currency === "BRL") ? "BRL" : priced[0]?.currency;
		const same = priced.filter(r => r.currency === cur);
		const min = same.length > 1 ? Math.min(...same.map(r => r.final)) : null;
		const max = same.length > 1 ? Math.max(...same.map(r => r.final)) : null;
		const list = body.querySelector(".sv-compare-list");
		list.removeAttribute("aria-busy");
		list.innerHTML = order.map(st => {
			const r = byStore.get(st);
			if (!r || r.failed) return `<div class="sv-compare-row is-muted">${this.storeTag(st)}<span class="sv-compare-note">Indisponível agora</span></div>`;
			if (r.missing || !Number.isFinite(r.final)) return `<div class="sv-compare-row is-muted">${this.storeTag(st)}<span class="sv-compare-note">Não encontrado nesta loja</span></div>`;
			const low = min !== null && r.currency === cur && r.final === min && min < max;
			const diff = min !== null && r.currency === cur && r.final > min ? `<small class="sv-compare-diff">+${this.money(r.final - min, r.currency)}</small>` : "";
			return `<a class="sv-compare-row${low ? " is-low" : ""}" href="${U.attr(this._storeUrl(r.url))}" data-href="${U.attr(this._storeUrl(r.url))}">${this.storeTag(st)}
				<span class="sv-compare-price"><span class="sv-compare-main">${r.discount ? `<span class="sv-pick-off">-${r.discount}%</span>` : ""}${r.original ? `<s>${this.money(r.original, r.currency)}</s>` : ""}<b>${r.free ? "Gratuito" : this.money(r.final, r.currency)}</b></span>${low ? `<em>Menor preço</em>` : diff}</span>${U.icon("external")}</a>`;
		}).join("");
		list.querySelectorAll("a[data-href]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); this._open(a.dataset.href); }));
	}

	// ------------------------------------------------------------ montagem
	// Chamado pela Home: só instala o sentinela. Nada de rede aqui.
	mount(root, ctx) {
		const slot = root.querySelector("[data-steam-picks]");
		if (!slot) return;
		const scroller = root.closest(".sv-layer") || root.closest(".markdown-preview-view, .cm-scroller") || null;
		window.__svPicksObs?.disconnect();
		if (typeof IntersectionObserver !== "function") return;
		const obs = new IntersectionObserver(entries => {
			if (!entries.some(e => e.isIntersecting)) return;
			obs.disconnect();
			this._load(slot, root, ctx);
		}, { root: scroller, rootMargin: "0px 0px 700px 0px" });
		obs.observe(slot);
		window.__svPicksObs = obs;
	}

	async _load(slot, root, ctx) {
		if (!slot.isConnected || !this._online()) return;
		const S = globalThis.customJS?.SteamVaultStores;
		// mostra o esqueleto só se nada estiver pronto no cache válido
		const cached = window.__svPicks;
		const fresh = cached?.lists && Date.now() - (cached.fetchedAt || 0) < this.PRICE_TTL;
		if (!fresh) slot.innerHTML = this.skeletonHtml();
		const ids = S ? S.ids() : [];
		const [steamRes, ...storeRes] = await Promise.allSettled([this.list(), ...ids.map(id => S.list(id))]);
		if (!slot.isConnected) return;
		const data = steamRes.status === "fulfilled" ? steamRes.value : null;
		const stores = {};
		ids.forEach((id, i) => { const r = storeRes[i]; stores[id] = r.status === "fulfilled" ? r.value || [] : []; });
		const any = (data && Object.values(data.lists || {}).some(l => l.length)) || Object.values(stores).some(l => l.length);
		if (!any) { slot.innerHTML = ""; return; } // offline/falha geral: nada na Home
		this._buildIndex(data, stores);
		const norm = t => S?.norm ? S.norm(t) : String(t).toLowerCase();
		const owned = { ids: new Set(ctx.model.games.map(g => String(g.steamAppId || "")).filter(Boolean)), keys: new Set(ctx.model.games.map(g => norm(g.title))) };
		const state = window.__svPicksState = window.__svPicksState || { store: "all", steamTab: window.__svPicksTab || "specials", show: 8 };
		state.show = 8;
		const render = () => {
			slot.innerHTML = this.sectionHtml(state, data, stores, owned);
			const sec = slot.querySelector(".sv-picks");
			if (!sec || !sec.querySelector(".sv-pick[data-href]")) { slot.innerHTML = ""; return; }
			sec.querySelectorAll("[data-picks-store]").forEach(b => b.addEventListener("click", () => { state.store = b.dataset.picksStore; state.show = 8; render(); }));
			sec.querySelectorAll("[data-picks-tab]").forEach(b => b.addEventListener("click", () => { state.steamTab = window.__svPicksTab = b.dataset.picksTab; state.show = 8; render(); }));
			this._wireCards(sec, ctx);
			this._wireMore(sec, state, data, stores, owned, ctx);
			ctx.V?._wireShelfEl?.(sec);
		};
		// monta no próximo momento ocioso: não disputa quadro com a rolagem
		const idle = window.requestIdleCallback || (fn => setTimeout(fn, 60));
		idle(() => { if (slot.isConnected) render(); }, { timeout: 600 });
	}

	// "Ver mais": acrescenta cards no fim, sem redesenhar nem recarregar
	_wireMore(sec, state, data, stores, owned, ctx) {
		const btn = sec.querySelector("[data-picks-more]");
		if (!btn) return;
		btn.addEventListener("click", () => {
			const items = this.itemsFor(state, data, stores, owned);
			const next = items.slice(state.show, state.show + 8);
			state.show += next.length;
			const tmp = document.createElement("div");
			tmp.innerHTML = next.map(it => this.card(it, this._others(it))).join("") + (items.length > state.show ? this.moreTile(items.length - state.show) : "");
			const added = [...tmp.children];
			btn.replaceWith(...added);
			this._wireCards(sec, ctx, added.filter(el => el.matches(".sv-pick[data-href]")));
			this._wireMore(sec, state, data, stores, owned, ctx);
			ctx.V?._shelfState?.(sec);
		});
	}

	// capa + gênero + avaliação só para os cards perto de aparecer
	_wireCards(sec, ctx, only = null) {
		const track = sec.querySelector(".sv-shelf-track");
		const byId = new Map();
		for (const k of Object.keys(window.__svPicks?.lists || {})) for (const it of window.__svPicks.lists[k]) byId.set(it.id, it);
		sec.__svIO = sec.__svIO || new IntersectionObserver(entries => {
			for (const e of entries) {
				if (!e.isIntersecting) continue;
				sec.__svIO.unobserve(e.target);
				const card = e.target;
				const img = card.querySelector("img[data-lazy-src]");
				if (img) {
					img.addEventListener("load", () => img.classList.add("is-loaded"), { once: true });
					img.addEventListener("error", () => img.remove(), { once: true });
					img.src = img.dataset.lazySrc; img.removeAttribute("data-lazy-src");
				}
				// só a Steam busca avaliação/gênero sob demanda
				const id = card.dataset.pick;
				if (card.dataset.store !== "steam" || !id) continue;
				const it = byId.get(id);
				this.meta(id).then(m => {
					const box = card.querySelector("[data-pick-meta]");
					if (!box || !card.isConnected) return;
					box.innerHTML = this.metaHtml(m, it);
					box.classList.add("is-in");
				}).catch(() => {});
			}
		}, { root: track, rootMargin: "0px 160px 0px 160px" });
		(only || [...sec.querySelectorAll(".sv-pick[data-href]")]).forEach(c => {
			sec.__svIO.observe(c);
			// abre a página do jogo na loja (app ou navegador), fora do Obsidian
			const open = () => this._open(c.dataset.href);
			c.addEventListener("click", e => {
				if (e.target.closest("[data-compare]")) { e.preventDefault(); e.stopPropagation(); this.compare(ctx, c.dataset.key); return; }
				e.preventDefault(); open();
			});
			c.addEventListener("keydown", e => { if (e.key === "Enter" && !e.target.closest("[data-compare]")) open(); });
		});
	}

	// ================================================ lista de desejos: preços
	// Para cada jogo da lista de desejos: preço da Steam (quando tem AppID)
	// ou o preço em BRL da Nuuvem. Grava na
	// ficha (currentPrice, regularPrice, discountPercent, lowestSeenPrice…)
	// e avisa quando chega ao preço-alvo. Cada jogo é consultado no máximo a
	// cada 12 h (forçar ignora); uma loja por vez.
	get WISH_TTL() { return 12 * 3600 * 1000; }

	async _priceFor(g) {
		if (/^\d+$/.test(g.steamAppId || "")) {
			try {
				const d = await this._get(`${this.STORE}/api/appdetails?appids=${g.steamAppId}&cc=br&l=brazilian&filters=price_overview`);
				const node = d?.[g.steamAppId];
				const po = node?.data?.price_overview;
				if (node?.success && po) return { final: po.final / 100, original: po.initial > po.final ? po.initial / 100 : null, discount: Number(po.discount_percent) || 0, currency: po.currency || "BRL", store: "steam", url: `${this.STORE}/app/${g.steamAppId}/` };
				if (node?.success && node.data && !po) return { final: 0, original: null, discount: 0, currency: "BRL", store: "steam", url: `${this.STORE}/app/${g.steamAppId}/`, free: true };
			} catch (_) {}
		}
		const S = globalThis.customJS?.SteamVaultStores;
		if (!S) return null;
		const rows = (await S.searchAll(g.title)).filter(r => !r.missing && !r.failed && Number.isFinite(r.final));
		const brl = rows.filter(r => (r.currency || "BRL") === "BRL");
		const best = (brl.length ? brl : rows).sort((a, b) => a.final - b.final)[0];
		return best ? { final: best.final, original: best.original || null, discount: best.discount || 0, currency: best.currency || "BRL", store: best.store, url: best.url || "" } : null;
	}

	async checkWishlist(model, { force = false, onProgress = () => {} } = {}) {
		if (!this._online()) return { ok: false, code: "offline", checked: 0, alerts: [] };
		const now = Date.now();
		const list = model.games.filter(g => g.status === "Wishlist" && (force || !g.priceCheckedAt || now - Date.parse(g.priceCheckedAt) > this.WISH_TTL));
		const alerts = [];
		let checked = 0;
		for (let i = 0; i < list.length; i++) {
			const g = list[i];
			onProgress({ index: i + 1, total: list.length, name: g.title });
			const f = app.vault.getAbstractFileByPath(g.path);
			if (!f) continue;
			let r = null;
			try { r = await this._priceFor(g); } catch (_) { r = null; }
			const iso = new Date().toISOString();
			await app.fileManager.processFrontMatter(f, x => {
				x.priceCheckedAt = iso;
				if (!r) { x.priceStatus = "not_found"; return; }
				x.priceStatus = "ok";
				x.currentPrice = r.final;
				x.regularPrice = r.original ?? r.final;
				x.discountPercent = r.discount || 0;
				x.priceStore = r.store;
				x.priceUrl = r.url;
				if (!x.buyLink && r.url) x.buyLink = r.url;
				const low = Number(x.lowestSeenPrice);
				if (!Number.isFinite(low) || x.lowestSeenPrice === "" || r.final < low) { x.lowestSeenPrice = r.final; x.lowestSeenDate = iso.slice(0, 10); }
				// histórico (3.21.0): um ponto por dia; os últimos 90
				const day = iso.slice(0, 10);
				const hist = Array.isArray(x.priceHistory) ? x.priceHistory.filter(h => h && typeof h === "object" && h.d) : [];
				const lastH = hist[hist.length - 1];
				if (lastH && String(lastH.d) === day) { lastH.p = r.final; lastH.s = r.store; } else hist.push({ d: day, p: r.final, s: r.store });
				x.priceHistory = hist.slice(-90);
			});
			checked++;
			if (r && g.targetPrice && r.final <= g.targetPrice && !(g.currentPrice !== null && g.currentPrice <= g.targetPrice)) alerts.push({ g, r });
		}
		customJS.SteamVaultCore.invalidate();
		return { ok: true, checked, alerts };
	}

	// Home: consulta sozinha quando a seção da lista de desejos aparece na
	// tela (nunca ao abrir), no máximo uma vez por sessão
	mountWishlist(root, ctx) {
		const sec = root.querySelector("[data-wishlist]");
		if (!sec || window.__svWishChecked || typeof IntersectionObserver !== "function") return;
		const stale = ctx.model.games.some(g => g.status === "Wishlist" && (!g.priceCheckedAt || Date.now() - Date.parse(g.priceCheckedAt) > this.WISH_TTL));
		if (!stale || !this._online()) return;
		const io = new IntersectionObserver(async entries => {
			if (!entries.some(e => e.isIntersecting)) return;
			io.disconnect();
			if (window.__svWishChecked) return;
			window.__svWishChecked = true;
			sec.classList.add("is-checking");
			const r = await this.checkWishlist(ctx.model).catch(() => null);
			sec.classList.remove("is-checking");
			if (!r?.checked) return;
			this._announcePrices(r.alerts);
			ctx.V?.refresh();
		}, { rootMargin: "0px 0px 200px 0px" });
		io.observe(sec);
	}

	_announcePrices(alerts) {
		const V = customJS.SteamVault, U = this.U;
		alerts.slice(0, 3).forEach(({ g, r }, i) => setTimeout(() => {
			V.toast(`${g.title} chegou ao preço-alvo: ${this.money(r.final, r.currency)}${r.discount ? ` (−${r.discount}%)` : ""}`, { icon: "bell", tone: "ok" });
			V._haptic?.(18);
		}, i * 900));
		void U;
	}

	wishlistBlock(ctx) {
		const { U, C, model } = ctx;
		const wish = model.games.filter(g => g.status === "Wishlist");
		if (!wish.length) return "";
		const hit = g => g.currentPrice !== null && g.targetPrice && g.currentPrice <= g.targetPrice;
		const sorted = [...wish].sort((a, b) => (hit(b) - hit(a)) || ((b.discountPercent || 0) - (a.discountPercent || 0)) || a.title.localeCompare(b.title));
		const last = wish.map(g => g.priceCheckedAt).filter(Boolean).sort().pop();
		const n = wish.filter(hit).length;
		// 3.47.0: a prateleira mostra os 20 primeiros (como Favoritos); o resto fica na tela da lista
		return `<div data-wishlist>${U.shelf("Lista de desejos", sorted.slice(0, 20).map(g => U.gameCard(g, C)), {
			count: wish.length,
			action: `${U.btn("", { icon: "refresh", kind: "ghost", size: "sm", action: "wishlist-prices", title: "Verificar preços agora" })}<a class="sv-link" ${U.openAttrs("Dashboard/Lista de Desejos")}>Ver lista</a>`
		}).replace('<div class="sv-shelf-track"', `<p class="sv-wish-note">${n ? `<b>${U.plural(n, "jogo no preço-alvo", "jogos no preço-alvo")}</b> · ` : ""}${last ? `Preços de ${U.relDate(last.slice(0, 10))}` : "Preços ainda não verificados"} · Steam e Nuuvem</p><div class="sv-shelf-track"`)}</div>`;
	}

	// ===================================================== LISTA DE DESEJOS (3.21.0)
	// Tela própria: preço de hoje, menor preço já visto, histórico, preço-alvo,
	// "comprei" e importação da lista de desejos pública da Steam.
	wishHit(g) { return g.currentPrice !== null && g.targetPrice && g.currentPrice <= g.targetPrice; }

	spark(g) {
		const U = this.U, h = (g.priceHistory || []).slice(-30);
		if (h.length < 2) return `<span class="sv-wish-spark is-empty">${h.length ? "Histórico a partir da próxima verificação" : "Sem histórico ainda"}</span>`;
		const W = 120, H = 34, pad = 4;
		const ps = h.map(x => x.p), min = Math.min(...ps), max = Math.max(...ps), span = max - min || 1;
		const x = i => pad + (i / (h.length - 1)) * (W - pad * 2), y = v => H - pad - ((v - min) / span) * (H - pad * 2);
		const pts = h.map((p, i) => `${x(i).toFixed(1)},${y(p.p).toFixed(1)}`).join(" ");
		const lo = ps.indexOf(min);
		return `<svg class="sv-wish-spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="${U.attr(`Preço nos últimos ${h.length} registros: de ${U.fmtMoney(max)} a ${U.fmtMoney(min)}`)}">
			<polyline points="${pts}" fill="none" stroke="var(--sv-blue)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
			<circle class="sv-wish-spark-lo" cx="${x(lo).toFixed(1)}" cy="${y(min).toFixed(1)}" r="3"/>
			${h.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.p).toFixed(1)}" r="7" fill="transparent"><title>${U.esc(`${U.fmtDate(p.d)}: ${U.fmtMoney(p.p)}${p.s ? ` (${p.s})` : ""}`)}</title></circle>`).join("")}
		</svg>`;
	}

	wishRow(ctx, g) {
		const { U, C } = ctx;
		const cur = g.currentPrice, reg = g.regularPrice, disc = g.discountPercent || 0, tgt = g.targetPrice;
		const hit = this.wishHit(g);
		const link = C.safeUrl(g.priceUrl || g.buyLink);
		const gap = cur !== null && tgt ? Math.max(0, cur - tgt) : null;
		const fill = cur !== null && tgt ? Math.min(100, Math.round((tgt / cur) * 100)) : 0;
		const added = g.wishlistAdded || g.dateAdded || "";
		return `<article class="sv-wishrow${hit ? " is-hit" : ""}" data-wish-item data-sale="${disc > 0}" data-target="${!!hit}" data-noprice="${cur === null}" data-name="${U.attr(g.title.toLowerCase())}" data-price="${cur ?? 999999}" data-disc="${disc}" data-gap="${gap ?? 999999}" data-added="${U.attr(added)}">
			<a class="sv-wishrow-cover" ${U.openAttrs(g.path)} aria-label="${U.attr(g.title)}">${U.cover(g, { cls: "sv-cover--xs" })}</a>
			<div class="sv-wishrow-main">
				<a class="sv-wishrow-title" ${U.openAttrs(g.path)}>${U.esc(g.title)}</a>
				<small class="sv-meta"><span>${U.esc(g.platform)}</span>${g.priceStore ? `<span>${U.esc(g.priceStore)}</span>` : ""}${g.lowestSeenPrice !== null ? `<span>Menor: ${U.esc(U.fmtMoney(g.lowestSeenPrice))}${g.lowestSeenDate ? ` em ${U.esc(U.fmtDate(g.lowestSeenDate))}` : ""}</span>` : ""}</small>
				${this.spark(g)}
			</div>
			<div class="sv-wishrow-price">
				${cur !== null ? `<b class="sv-num">${U.esc(U.fmtMoney(cur))}</b>${disc > 0 ? `<span class="sv-wish-disc">−${disc}%</span>` : ""}${reg && reg > cur ? `<s class="sv-num">${U.esc(U.fmtMoney(reg))}</s>` : ""}` : `<span class="sv-muted">${g.priceStatus === "not_found" ? "Não encontrado nas lojas" : "Preço não verificado"}</span>`}
			</div>
			<div class="sv-wishrow-target">
				${tgt ? `<span class="sv-wish-tlabel">${hit ? `${U.icon("check")}No preço-alvo` : `Alvo ${U.esc(U.fmtMoney(tgt))}`}</span>${cur !== null ? `<span class="sv-wish-tbar" role="img" aria-label="${U.attr(hit ? "No preço-alvo" : `Faltam ${U.fmtMoney(gap)}`)}"><i style="width:${fill}%"></i></span><small>${hit ? `${U.esc(U.fmtMoney(tgt - cur))} abaixo do alvo` : `faltam ${U.esc(U.fmtMoney(gap))}`}</small>` : ""}` : `<span class="sv-muted">Sem preço-alvo</span>`}
			</div>
			<div class="sv-wishrow-actions">
				${link ? `<a class="sv-btn sv-btn--ghost sv-btn--sm sv-btn--icon" href="${U.attr(link)}" title="Abrir na loja" aria-label="Abrir ${U.attr(g.title)} na loja">${U.icon("external")}</a>` : ""}
				${U.btn("", { icon: "target", kind: "ghost", size: "sm", action: "wish-target", title: "Definir preço-alvo", attrs: `data-path="${U.attr(g.path)}"` })}
				${U.btn("Comprei", { icon: "check", kind: "secondary", size: "sm", action: "wish-bought", attrs: `data-path="${U.attr(g.path)}"` })}
			</div>
		</article>`;
	}

	// 3.64.0: lançamentos (data de lançamento hoje ou depois), com contagem
	// regressiva. Usado na Lista de desejos e na Início
	upcoming(ctx, { all = false } = {}) {
		const { C, model } = ctx;
		const today = C.today();
		return model.games.filter(g => g.releaseDate && g.releaseDate >= today && (all || g.status === "Wishlist" || g.status === "Backlog"))
			.sort((a, b) => a.releaseDate.localeCompare(b.releaseDate) || a.title.localeCompare(b.title));
	}
	soonList(ctx, games) {
		const { U, C } = ctx;
		const today = C.today();
		const left = d => { const n = C.daysBetween(today, d); return n <= 0 ? "Hoje" : n === 1 ? "Amanhã" : n < 60 ? `em ${n} dias` : n < 365 ? `em ${Math.round(n / 30)} meses` : `em ${(n / 365).toFixed(1).replace(".0", "").replace(".", ",")} anos`; };
		return `<ol class="sv-soon">${games.map(g => `<li><a class="sv-soon-item" ${U.openAttrs(g.path)}>${U.cover(g, { cls: "sv-cover--xs" })}<span class="sv-soon-text"><b>${U.esc(g.title)}</b><small>${U.esc(U.fmtDate(g.releaseDate))}${g.platform ? ` · ${U.esc(g.platform)}` : ""}</small></span><span class="sv-soon-left${C.daysBetween(today, g.releaseDate) <= 7 ? " is-near" : ""}">${U.esc(left(g.releaseDate))}</span></a></li>`).join("")}</ol>`;
	}
	soonBlock(ctx, { limit = 4, home = false } = {}) {
		const { U } = ctx;
		const list = this.upcoming(ctx);
		if (!list.length) return "";
		return `<section class="sv-block sv-soonblock">${U.sectionHead(home ? "Lançamentos em breve" : "Em breve", { count: list.length, sub: home ? "Da sua lista de desejos e do backlog" : "Pela data de lançamento", action: home ? `<a class="sv-link" ${U.openAttrs("Dashboard/Lista de Desejos")}>Lista de desejos</a>` : "" })}${this.soonList(ctx, list.slice(0, limit))}</section>`;
	}

	wishlistPage(ctx) {
		const { U, C, model } = ctx;
		const wish = model.games.filter(g => g.status === "Wishlist");
		const priced = wish.filter(g => g.currentPrice !== null);
		const total = priced.reduce((t, g) => t + g.currentPrice, 0);
		const regular = priced.reduce((t, g) => t + (g.regularPrice && g.regularPrice > g.currentPrice ? g.regularPrice : g.currentPrice), 0);
		const onSale = wish.filter(g => (g.discountPercent || 0) > 0), hits = wish.filter(g => this.wishHit(g));
		const last = wish.map(g => g.priceCheckedAt).filter(Boolean).sort().pop();
		const steamOn = !!ctx.S?.getConfig?.().configured;
		// lista vazia: o próprio aviso já traz Importar e Adicionar (sem botões repetidos no topo)
		const actions = !wish.length ? "" : `${U.btn("Verificar preços", { icon: "refresh", kind: "secondary", action: "wishlist-prices" })}${U.btn("Importar da Steam", { icon: "download", kind: "primary", action: "wishlist-import", title: steamOn ? "Traz a sua lista de desejos pública da Steam" : "Conecte a Steam para importar" })}`;
		const sorted = [...wish].sort((a, b) => (this.wishHit(b) - this.wishHit(a)) || ((b.discountPercent || 0) - (a.discountPercent || 0)) || a.title.localeCompare(b.title));
		const chips = [["all", "Todos", wish.length], ["sale", "Em promoção", onSale.length], ["target", "No preço-alvo", hits.length], ["noprice", "Sem preço", wish.length - priced.length]].filter(([k, , n]) => k === "all" || n);
		const html = `<div class="sv-page sv-pad sv-wishpage">
			${U.pageHead("Lista de desejos", { sub: wish.length ? `${U.plural(wish.length, "jogo", "jogos")} · ${last ? `preços de ${U.relDate(last.slice(0, 10))}` : "preços ainda não verificados"}` : "Os jogos que você quer comprar", actions })}
			${this.soonBlock(ctx, { limit: 6 })}
			${wish.length ? `<dl class="sv-wishsum">
				<div><dt>Total hoje</dt><dd class="sv-num">${priced.length ? U.esc(U.fmtMoney(total)) : "—"}</dd>${regular > total ? `<small>economia de ${U.esc(U.fmtMoney(regular - total))}</small>` : ""}</div>
				<div><dt>Em promoção</dt><dd class="sv-num">${U.fmtNum(onSale.length)}</dd>${onSale.length ? `<small>até −${Math.max(...onSale.map(g => g.discountPercent))}%</small>` : ""}</div>
				<div><dt>No preço-alvo</dt><dd class="sv-num${hits.length ? " is-hit" : ""}">${U.fmtNum(hits.length)}</dd><small>${U.plural(wish.filter(g => g.targetPrice).length, "com alvo", "com alvo")}</small></div>
				<div><dt>Menor que já vimos</dt><dd class="sv-num">${U.fmtNum(priced.filter(g => g.lowestSeenPrice !== null && g.currentPrice <= g.lowestSeenPrice).length)}</dd><small>no menor preço agora</small></div>
			</dl>
			<div class="sv-wishbar">
				<div class="sv-hubchips" role="group" aria-label="Filtrar a lista de desejos">${chips.map(([k, l, n], i) => `<button type="button" data-wish-f="${k}" class="${i ? "" : "is-active"}" aria-pressed="${!i}">${U.esc(l)}<span>${n}</span></button>`).join("")}</div>
				<label class="sv-wishsort"><span class="sv-sr">Ordenar</span><select class="sv-input" data-wish-sort aria-label="Ordenar">
					<option value="best">Melhores ofertas</option><option value="price">Menor preço</option><option value="gap">Mais perto do alvo</option><option value="added">Adicionados por último</option><option value="name">Nome</option>
				</select></label>
			</div>
			<div class="sv-wishlist" data-wish-list>${sorted.map(g => this.wishRow(ctx, g)).join("")}</div>
			<p class="sv-hub-noresult" data-wish-none hidden>Nenhum jogo neste filtro.</p>
			<p class="sv-fineprint sv-wishnote">${U.icon("lock")} Preços lidos de páginas públicas da Steam e da Nuuvem, no máximo a cada 6 horas. A importação lê só a sua lista de desejos pública da Steam, sem senha nem chave, quando você toca em Importar.</p>`
			: U.empty({ icon: "bell", title: "Sua lista de desejos está vazia", text: "Importe a lista de desejos pública da Steam ou adicione um jogo com o status Lista de desejos. A Game Library acompanha o preço, guarda o menor valor e avisa quando chegar no preço-alvo.", action: `${U.btn("Importar da Steam", { icon: "download", kind: "primary", action: "wishlist-import" })}${U.btn("Adicionar jogo", { icon: "plus", kind: "secondary", action: "add-game" })}` })}
		</div>`;
		return { active: "wishlist", html, wire: root => this.wireWishlist(root) };
	}

	wireWishlist(root) {
		const list = root.querySelector("[data-wish-list]");
		if (!list) return;
		let f = "all", sort = "best";
		const items = [...list.querySelectorAll("[data-wish-item]")];
		const cmp = {
			best: (a, b) => (b.dataset.target === "true") - (a.dataset.target === "true") || Number(b.dataset.disc) - Number(a.dataset.disc) || a.dataset.name.localeCompare(b.dataset.name),
			price: (a, b) => Number(a.dataset.price) - Number(b.dataset.price),
			gap: (a, b) => Number(a.dataset.gap) - Number(b.dataset.gap),
			added: (a, b) => String(b.dataset.added).localeCompare(String(a.dataset.added)),
			name: (a, b) => a.dataset.name.localeCompare(b.dataset.name)
		};
		const apply = () => {
			let shown = 0;
			items.sort(cmp[sort]).forEach(el => {
				const ok = f === "all" || el.dataset[f] === "true";
				el.hidden = !ok; if (ok) shown++;
				list.appendChild(el);
			});
			const none = root.querySelector("[data-wish-none]"); if (none) none.hidden = shown > 0;
		};
		root.querySelectorAll("[data-wish-f]").forEach(b => b.addEventListener("click", () => {
			f = b.dataset.wishF;
			root.querySelectorAll("[data-wish-f]").forEach(x => { const on = x === b; x.classList.toggle("is-active", on); x.setAttribute("aria-pressed", String(on)); });
			apply();
		}));
		root.querySelector("[data-wish-sort]")?.addEventListener("change", e => { sort = e.target.value; apply(); });
	}

	// preço-alvo: digitado ou sugerido (menor já visto, −25%, −50%)
	editTarget(ctx, path) {
		const { U, C, V } = ctx;
		const g = ctx.model.gamesByPath.get(path);
		if (!g) return;
		const base = g.regularPrice || g.currentPrice;
		const sugg = [g.lowestSeenPrice !== null ? ["Menor já visto", g.lowestSeenPrice] : null, base ? ["−25%", Math.round(base * 75) / 100] : null, base ? ["−50%", Math.round(base * 50) / 100] : null].filter(Boolean);
		const body = document.createElement("div");
		body.innerHTML = `<div class="sv-form">
			<p class="sv-modal-text">${g.currentPrice !== null ? `Hoje: <b>${U.esc(U.fmtMoney(g.currentPrice))}</b>${g.priceStore ? ` na ${U.esc(g.priceStore)}` : ""}. ` : ""}A Game Library avisa quando o preço chegar neste valor ou abaixo dele.</p>
			<label class="sv-label" for="sv-wish-tgt">Preço-alvo (R$)</label>
			<input id="sv-wish-tgt" class="sv-input sv-input--lg" inputmode="decimal" autocomplete="off" placeholder="Ex.: 49,90" value="${g.targetPrice ? U.attr(String(g.targetPrice).replace(".", ",")) : ""}">
			${sugg.length ? `<div class="sv-hubchips sv-wish-sugg">${sugg.map(([l, v]) => `<button type="button" data-v="${v}">${U.esc(l)}<span>${U.esc(U.fmtMoney(v))}</span></button>`).join("")}</div>` : ""}
			<p class="sv-formmsg" data-msg></p>
		</div>`;
		const m = V.modal({ title: "Preço-alvo", sub: g.title, size: "sm", body, actions: `${g.targetPrice ? U.btn("Remover alvo", { kind: "ghost", attrs: "data-clear" }) : ""}${U.btn("Cancelar", { kind: "ghost", attrs: "data-close" })}${U.btn("Salvar", { kind: "primary", icon: "check", attrs: "data-save" })}` });
		const input = body.querySelector("#sv-wish-tgt");
		body.querySelectorAll("[data-v]").forEach(b => b.addEventListener("click", () => { input.value = String(b.dataset.v).replace(".", ","); input.focus(); }));
		const write = async v => {
			const f = app.vault.getAbstractFileByPath(path);
			if (!f) return;
			await app.fileManager.processFrontMatter(f, x => { x.targetPrice = v; });
			m.close();
			V.toast(v === "" ? "Preço-alvo removido" : `Preço-alvo: ${U.fmtMoney(v)}`, { tone: "ok", icon: "target" });
			C.invalidate?.(); setTimeout(() => V.refresh?.(), 300);
		};
		m.el.querySelector("[data-clear]")?.addEventListener("click", () => write(""));
		m.el.querySelector("[data-save]").addEventListener("click", () => {
			const v = Number(String(input.value).replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
			if (!Number.isFinite(v) || v <= 0 || v > 100000) { const msg = body.querySelector("[data-msg]"); msg.textContent = "Informe um valor maior que zero, por exemplo 49,90."; msg.className = "sv-formmsg is-error"; return; }
			write(Math.round(v * 100) / 100);
		});
		input.addEventListener("keydown", e => { if (e.key === "Enter") m.el.querySelector("[data-save]").click(); });
	}

	// comprei: sai da lista de desejos para o backlog, com o preço pago
	async markBought(ctx, path) {
		const { U, C, V } = ctx;
		const g = ctx.model.gamesByPath.get(path);
		if (!g) return;
		const ok = await V.confirm({ title: `Comprou ${g.title}?`, text: `O jogo sai da lista de desejos e entra no Backlog${g.currentPrice !== null ? `, com o preço pago de ${U.fmtMoney(g.currentPrice)} (dá para corrigir em Editar detalhes)` : ""}.`, confirm: "Comprei" });
		if (!ok) return;
		const f = app.vault.getAbstractFileByPath(path);
		if (!f) return;
		await app.fileManager.processFrontMatter(f, x => {
			x.status = "Backlog";
			if (g.currentPrice !== null && !(Number(x.price) > 0)) x.price = g.currentPrice;
			x.purchaseDate = C.today();
		});
		V.toast(`${g.title} foi para o Backlog`, { tone: "ok", icon: "check" });
		V._haptic?.(14);
		C.invalidate?.(); setTimeout(() => V.refresh?.(), 300);
	}

	// lista de desejos pública da Steam (IWishlistService, sem chave). Único
	// endereço da Steam Web API que a Game Library usa, e só quando a pessoa pede.
	async importSteamWishlist(ctx) {
		const { U, C, V, S } = ctx;
		const cfg = S?.getConfig?.() || {};
		if (!cfg.configured) return V.steamConnect?.(ctx);
		if (!/^\d{17}$/.test(String(cfg.steamId64 || ""))) return V.toast("Reconecte a Steam para obter o SteamID do perfil", { tone: "warn" });
		if (!this._online()) return V.toast("Sem conexão com a internet", { tone: "warn" });
		const request = (typeof requestUrl === "function" && requestUrl) || globalThis.customJS?.obsidian?.requestUrl;
		if (typeof request !== "function") return V.toast("requestUrl indisponível", { tone: "error" });
		const t = V.toast("Lendo a sua lista de desejos da Steam…", { sticky: true, icon: "download" });
		let items = [];
		try {
			const url = `https://api.steampowered.com/IWishlistService/GetWishlist/v1/?steamid=${cfg.steamId64}`;
			if (!/^https:\/\/api\.steampowered\.com\/IWishlistService\/GetWishlist\/v1\/\?steamid=\d{17}$/.test(url)) throw new Error("endereço");
			const res = await Promise.race([request({ url, method: "GET", headers: { Accept: "application/json" }, throw: false }), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), this.TIMEOUT))]);
			if (!res || res.status !== 200) throw new Error(res?.status === 403 || res?.status === 401 ? "privada" : `http ${res?.status}`);
			const j = typeof res.json === "object" && res.json ? res.json : JSON.parse(String(res.text || "{}"));
			items = (j?.response?.items || []).filter(x => Number.isInteger(Number(x?.appid))).slice(0, 300);
		} catch (err) {
			t.update(err.message === "privada" ? "A lista de desejos da Steam não está pública" : `Não foi possível ler a lista de desejos (${err.message})`, { tone: "error" });
			return t.close(5000);
		}
		const have = new Set(ctx.model.games.map(g => String(g.steamAppId || "")).filter(Boolean));
		const fresh = items.filter(x => !have.has(String(x.appid))).sort((a, b) => (Number(a.priority) || 999) - (Number(b.priority) || 999));
		if (!fresh.length) { t.update(items.length ? "Todos os jogos da lista de desejos já estão no vault" : "A lista de desejos da Steam está vazia", { tone: "ok" }); return t.close(4000); }
		t.close(0);
		const ok = await V.confirm({ title: `Adicionar ${U.plural(fresh.length, "jogo", "jogos")} à lista de desejos?`, text: "Cada um vira uma ficha com o status Lista de desejos, a capa da loja e o preço acompanhado. Pode levar alguns minutos.", confirm: "Adicionar" });
		if (!ok) return;
		const p = V.toast("Steam: criando fichas…", { sticky: true, icon: "download", progress: 0 });
		let done = 0, fail = 0;
		for (let i = 0; i < fresh.length; i++) {
			const it = fresh[i], id = String(it.appid);
			try {
				const d = await this._get(`${this.STORE}/api/appdetails?appids=${id}&cc=br&l=brazilian&filters=basic`);
				const name = String(d?.[id]?.data?.name || "").trim();
				if (!name) { fail++; continue; }
				p.update(`Steam: ${name} (${i + 1}/${fresh.length})`, { progress: ((i + 1) / fresh.length) * 100 });
				const added = Number(it.date_added) ? customJS.SteamVaultCore.localIso(Number(it.date_added) * 1000) : "";
				const file = await C.createGameNote({ title: name, platform: "PC", status: "Wishlist", steamAppId: id, achievementProvider: "steam", wishlistAdded: added });
				await S.fetchArt?.(file, { only: ["cover"] }).catch(() => {});
				done++;
			} catch (_) { fail++; }
		}
		p.update(`Steam: ${U.plural(done, "jogo adicionado", "jogos adicionados")} à lista de desejos${fail ? `, ${fail} com falha` : ""}`, { tone: fail && !done ? "error" : fail ? "warn" : "ok" });
		p.close(5000);
		C.invalidate?.();
		setTimeout(() => V.refresh?.(), 400);
	}
}
