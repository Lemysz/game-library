// ==========================================================================
// Game Library — loja adicional da seção de ofertas (Nuuvem)
//
// Só ADAPTADORES: onde buscar, como ler a resposta e como montar o link.
// Rede, fila, domínios permitidos, cache, lazy loading, cards e prateleira
// são os da integração da Steam (SteamVaultPicks) — nada disso é duplicado.
//
// Fonte (pública, sem chave, sem login): a Nuuvem não oferece API pública
// para este uso; é lida a página pública de listagem — primeiro os dados
// estruturados (JSON-LD) que a página publica, depois um leitor de cartões
// de produto que não depende de nomes de classes. Se o formato não for
// reconhecido, a loja simplesmente não aparece.
//
// Instant Gaming e GOG foram retiradas na versão 3.0.1: no aparelho, as
// duas respondiam sem produtos legíveis ("formato não reconhecido") — a
// Instant Gaming protege as páginas contra acesso automatizado e o
// catálogo da GOG não devolvia preços. Em vez de deixar lojas quebradas na
// interface, elas saíram do registro (e, com isso, de filtros, comparação,
// alertas de preço e Configurações).
//
// Regras: nenhum dado é inventado (o que a loja não informa fica fora do
// card); preços ficam na moeda informada pela loja, sem conversão.
//
// Acesso: customJS.SteamVaultStores
// ==========================================================================

class SteamVaultStores {

	constructor() {
		this.TTL = 30 * 60 * 1000;         // preço: 30 min (igual à Steam)
		this.FAIL_TTL = 5 * 60 * 1000;     // loja com falha: não tenta de novo por 5 min
		this.CACHE = ".steamvault/stores.json";
		this.PROVIDERS = {
			nuuvem: {
				label: "Nuuvem",
				hosts: ["www.nuuvem.com", "nuuvem.com"],
				list: "https://www.nuuvem.com/br-pt/catalog/price/promo/sort/bestselling/sort-mode/desc",
				search: t => `https://www.nuuvem.com/br-pt/catalog/search/${encodeURIComponent(t)}`,
				productHref: /\/item\//i,
				defaultCurrency: "BRL",
				kind: "html"
			}
		};
		// imagens: só dos CDNs das próprias lojas (tag <img>, não passa pela rede do app)
		this.IMG_HOSTS = /(^|\.)(nuuvem\.com|nuuvem\.com\.br)$/i;
		this._status = {};
	}

	get P() { return customJS.SteamVaultPicks; }

	allowsHost(host) {
		return Object.values(this.PROVIDERS).some(p => p.hosts.includes(host));
	}

	ids() { return Object.keys(this.PROVIDERS); }
	label(id) { return id === "steam" ? "Steam" : this.PROVIDERS[id]?.label || id; }

	// ------------------------------------------------------------ utilidades
	norm(title) {
		return String(title || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
			.replace(/[™®©]/g, "")
			.replace(/\((pc|mac|steam|gog|global|epic|br|latam)[^)]*\)/g, " ")
			.replace(/\b(steam|gog|epic)\s*(key|cd[- ]?key)\b/g, " ")
			.replace(/\b(pc|global|latam|brasil|br|cd[- ]?key|key)\s*$/g, " ")
			.replace(/[^a-z0-9]+/g, " ").trim();
	}

	_money(text) {
		const s = String(text ?? "").replace(/\u00a0/g, " ").trim();
		if (!s) return null;
		let t = s.replace(/[^\d.,]/g, "");
		if (!t) return null;
		if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, "").replace(",", ".");   // 1.234,56
		else t = t.replace(/,/g, "");                                           // 1,234.56
		const n = Number(t);
		return Number.isFinite(n) ? n : null;
	}

	_currencyOf(text, fallback) {
		const s = String(text || "");
		if (/R\$|BRL/.test(s)) return "BRL";
		if (/€|EUR/.test(s)) return "EUR";
		if (/US\$|USD|\$/.test(s)) return "USD";
		if (/£|GBP/.test(s)) return "GBP";
		return fallback || "";
	}

	_img(url, base) {
		try {
			const u = new URL(String(url || "").trim(), base);
			if (u.protocol !== "https:") return "";
			return this.IMG_HOSTS.test(u.hostname) ? u.href : "";
		} catch (_) { return ""; }
	}

	_link(url, provider) {
		try {
			const p = this.PROVIDERS[provider];
			const u = new URL(String(url || "").trim(), p.list);
			const okHost = p.hosts.includes(u.hostname);
			return u.protocol === "https:" && okHost ? u.href : "";
		} catch (_) { return ""; }
	}

	_item(provider, x) {
		const name = String(x.name || "").trim();
		const url = this._link(x.url, provider);
		if (!name || !url || x.final === null || x.final === undefined || !Number.isFinite(x.final)) return null;
		const original = Number.isFinite(x.original) && x.original > x.final ? x.original : null;
		const discount = Number.isFinite(x.discount) && x.discount > 0 ? Math.round(x.discount)
			: original ? Math.round((1 - x.final / original) * 100) : 0;
		return {
			store: provider, id: `${provider}:${url}`, name, url,
			image: x.image || "", final: x.final, original, discount,
			free: x.final === 0, currency: x.currency || "",
			genres: (x.genres || []).filter(Boolean).slice(0, 2),
			rating: x.rating || null, key: this.norm(name)
		};
	}

	// ------------------------------------------------------------ leitores
	// páginas HTML: JSON-LD primeiro; depois cartões de produto
	// Dados estruturados (JSON-LD) extraídos direto do texto: não monta o
	// documento, então é leve mesmo com páginas grandes.
	_ldBlocks(html) {
		const out = [];
		const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
		let m;
		while ((m = re.exec(String(html || "")))) { try { out.push(JSON.parse(m[1])); } catch (_) {} }
		return out;
	}

	// espera um momento ocioso do navegador (fora dos quadros de rolagem)
	_idle() { return new Promise(r => (window.requestIdleCallback || (fn => setTimeout(fn, 50)))(r, { timeout: 800 })); }

	async parseHtmlAsync(provider, html) {
		const quick = this.parseHtml(provider, html, { domFallback: false });
		if (quick.length) return quick;
		await this._idle();
		return this.parseHtml(provider, html, { domFallback: true });
	}

	parseHtml(provider, html, { domFallback = true } = {}) {
		const p = this.PROVIDERS[provider];
		const out = [];
		const seen = new Set();
		const push = it => { if (it && !seen.has(it.url)) { seen.add(it.url); out.push(it); } };

		// 1) dados estruturados (Product / ItemList / Offer)
		const walk = node => {
			if (!node || typeof node !== "object") return;
			if (Array.isArray(node)) return node.forEach(walk);
			const type = [].concat(node["@type"] || []).map(String);
			if (type.includes("ItemList")) (node.itemListElement || []).forEach(e => walk(e.item || e));
			if (type.includes("Product") || type.includes("VideoGame")) {
				const offer = [].concat(node.offers || [])[0] || {};
				const agg = node.aggregateRating;
				const rating = agg && Number(agg.ratingValue) > 0 ? { value: Number(agg.ratingValue), scale: Number(agg.bestRating) || 5, count: Number(agg.reviewCount || agg.ratingCount) || 0 } : null;
				push(this._item(provider, {
					name: node.name, url: node.url || offer.url,
					image: this._img([].concat(node.image || [])[0], p.list),
					final: this._money(offer.price ?? offer.lowPrice),
					original: this._money(offer.highPrice),
					currency: offer.priceCurrency || p.defaultCurrency,
					genres: [].concat(node.genre || []), rating
				}));
			}
			if (node["@graph"]) walk(node["@graph"]);
		};
		this._ldBlocks(html).forEach(walk);

		// 2) cartões de produto: link para página de produto + imagem + preço
		if (!out.length && domFallback) {
			// monta SÓ o trecho da página que contém os produtos (do primeiro
			// ao último link de produto, com folga) — cabeçalho, scripts e o
			// resto ficam de fora; bem mais leve em páginas grandes
			const raw = String(html || "");
			const hrefRe = new RegExp(`href=["'][^"']*?(${p.productHref.source})`, "gi");
			let first = -1, last = -1, mm;
			while ((mm = hrefRe.exec(raw))) { if (first < 0) first = mm.index; last = mm.index; }
			if (first < 0) return out;
			const from = raw.lastIndexOf("<", Math.max(0, first - 4000));
			const slice = raw.slice(Math.max(0, from), Math.min(raw.length, last + 6000));
			let doc;
			try { doc = new DOMParser().parseFromString(`<div>${slice}</div>`, "text/html"); } catch (_) { return out; }
			const priceRe = /(R\$|€|US\$|\$|£)\s*\d[\d.,]*|\d[\d.,]*\s*(€|R\$)/g;
			const anchors = [...doc.querySelectorAll("a[href]")].filter(a => p.productHref.test(a.getAttribute("href") || ""));
			for (const a of anchors) {
				// sobe até o contêiner do cartão (o primeiro que tem preço)
				let card = a, hops = 0;
				while (card && hops < 5 && !priceRe.test(card.textContent || "")) { card = card.parentElement; hops++; priceRe.lastIndex = 0; }
				priceRe.lastIndex = 0;
				if (!card) continue;
				const text = (card.textContent || "").replace(/\s+/g, " ");
				const prices = [...text.matchAll(priceRe)].map(m => ({ raw: m[0], v: this._money(m[0]) })).filter(x => x.v !== null && x.v > 0);
				if (!prices.length) continue;
				const values = prices.map(x => x.v);
				const final = Math.min(...values), max = Math.max(...values);
				const disc = /-\s?(\d{1,2})\s?%/.exec(text);
				const img = card.querySelector("img");
				const name = (a.getAttribute("title") || img?.getAttribute("alt") || card.querySelector("h2,h3,h4,[class*=title],[class*=name]")?.textContent || a.textContent || "").replace(/\s+/g, " ").trim();
				push(this._item(provider, {
					name, url: a.getAttribute("href"),
					image: this._img(img?.getAttribute("data-src") || img?.getAttribute("data-lazy") || img?.getAttribute("src"), p.list),
					final, original: max > final ? max : null,
					discount: disc ? Number(disc[1]) : null,
					currency: this._currencyOf(prices[0].raw, p.defaultCurrency)
				}));
			}
		}
		return out;
	}

	// ------------------------------------------------------------ cache
	async _cache() {
		if (window.__svStores) return window.__svStores;
		window.__svStores = {};
		try {
			const a = app.vault.adapter;
			if (await a.exists(this.CACHE)) window.__svStores = JSON.parse(await a.read(this.CACHE)) || {};
		} catch (_) {}
		return window.__svStores;
	}

	async _save() {
		try {
			const a = app.vault.adapter;
			if (!(await a.exists(".steamvault"))) await a.mkdir(".steamvault");
			await a.write(this.CACHE, JSON.stringify(window.__svStores || {}));
		} catch (_) {}
	}

	// ------------------------------------------------------------ listas
	// Lista de UMA loja. Cada loja falha sozinha: erro vira lista vazia e
	// status registrado (diagnóstico), sem afetar as outras.
	async list(provider) {
		const p = this.PROVIDERS[provider];
		const cache = await this._cache();
		const c = cache[provider];
		const now = Date.now();
		if (c?.items?.length && now - c.fetchedAt < this.TTL) { this._status[provider] = { state: "ok", count: c.items.length, at: c.fetchedAt, cached: true }; return c.items; }
		if (c?.failedAt && now - c.failedAt < this.FAIL_TTL) { this._status[provider] = { state: "erro", reason: c.reason, at: c.failedAt }; return []; }
		if (!this.P._online()) return [];
		try {
			const data = await this.P._get(p.list, { as: "text" });
			const items = await this.parseHtmlAsync(provider, data);
			if (!items.length) throw new Error("formato não reconhecido");
			cache[provider] = { fetchedAt: now, items };
			this._status[provider] = { state: "ok", count: items.length, at: now };
			this._save();
			return items;
		} catch (err) {
			const reason = String(err?.message || err).slice(0, 80);
			cache[provider] = { ...(c || {}), items: [], failedAt: now, reason };
			this._status[provider] = { state: "erro", reason, at: now };
			this._save();
			return [];
		}
	}

	status() { return this.ids().map(id => ({ id, label: this.label(id), ...(this._status[id] || { state: "não consultada" }) })); }

	// ------------------------------------------------------------ comparação
	// Busca UM título nas lojas (sob demanda, só ao tocar em "Comparar").
	async searchAll(title, have = []) {
		const key = this.norm(title);
		window.__svCompare = window.__svCompare || {};
		const memo = window.__svCompare[key];
		if (memo && Date.now() - memo.at < this.TTL) return memo.rows;
		const rows = [...have];
		const got = new Set(rows.map(r => r.store));
		const tasks = [];
		if (!got.has("steam")) tasks.push(this._searchSteam(title, key));
		for (const id of this.ids()) if (!got.has(id)) tasks.push(this._searchStore(id, title, key));
		const res = await Promise.allSettled(tasks);
		for (const r of res) if (r.status === "fulfilled" && r.value) rows.push(r.value);
		window.__svCompare[key] = { at: Date.now(), rows };
		return rows;
	}

	async _searchStore(id, title, key) {
		const p = this.PROVIDERS[id];
		try {
			const data = await this.P._get(p.search(title), { as: "text" });
			const items = await this.parseHtmlAsync(id, data);
			return items.find(x => x.key === key) || { store: id, missing: true };
		} catch (_) { return { store: id, failed: true }; }
	}

	async _searchSteam(title, key) {
		try {
			const j = await this.P._get(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(title)}&cc=br&l=brazilian`, { as: "json" });
			const hit = (j?.items || []).find(x => this.norm(x.name) === key);
			if (!hit) return { store: "steam", missing: true };
			const pr = hit.price || {};
			const final = Number.isFinite(Number(pr.final)) ? Number(pr.final) / 100 : (hit.price === undefined ? null : 0);
			const original = Number(pr.initial) > Number(pr.final) ? Number(pr.initial) / 100 : null;
			if (final === null) return { store: "steam", missing: true };
			return { store: "steam", name: hit.name, url: `https://store.steampowered.com/app/${hit.id}/`, final, original, discount: original ? Math.round((1 - final / original) * 100) : 0, currency: pr.currency || "BRL", key };
		} catch (_) { return { store: "steam", failed: true }; }
	}
}
