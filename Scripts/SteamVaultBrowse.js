// ==========================================================================
// Game Library — Browse (Coleções, Plataformas, Gêneros, Franquias)
// Cada entidade tem uma composição própria — não "título + tabela".
// Plataformas, gêneros e franquias têm identidade (cor, ícone, dados)
// e um hub com propósito próprio: console, gosto e saga (3.9.0).
//
// Acesso: customJS.SteamVaultBrowse
// ==========================================================================

class SteamVaultBrowse {

	// mosaico de capas para entidades sem arte própria
	mosaic(ctx, games, { cover = "", n = 4 } = {}) {
		const { U } = ctx;
		if (cover) return `<div class="sv-mosaic sv-mosaic--single"><img src="${U.attr(cover)}" alt="" loading="lazy" data-sv-img></div>`;
		const arts = games.map(g => g.images.cover).filter(Boolean).slice(0, n);
		// sem nenhuma capa: capas tipográficas com os nomes, nunca um retângulo vazio
		if (!arts.length) return games.length
			? `<div class="sv-mosaic sv-mosaic--type">${games.slice(0, 5).map(g => `<span style="--sv-hue:${g.hue}">${U.esc(g.title)}</span>`).join("")}</div>`
			: `<div class="sv-mosaic sv-mosaic--empty">${U.icon("stack")}</div>`;
		// uma capa só: em pé, sobre um fundo desfocado dela mesma (esticada ficaria cortada)
		if (arts.length === 1) return `<div class="sv-mosaic sv-mosaic--1"><img class="sv-mosaic-bg" src="${U.attr(arts[0])}" alt="" loading="lazy" data-sv-img aria-hidden="true"><img class="sv-mosaic-fg" src="${U.attr(arts[0])}" alt="" loading="lazy" data-sv-img></div>`;
		return `<div class="sv-mosaic sv-mosaic--${arts.length}">${arts.map(s => `<img src="${U.attr(s)}" alt="" loading="lazy" data-sv-img>`).join("")}</div>`;
	}

	statsFor(ctx, games) {
		const { C, U } = ctx;
		const s = C.groupStats(games);
		return [
			{ label: "Jogos", value: U.fmtNum(s.count) },
			{ label: "Horas", value: U.fmtHours(s.hours) },
			{ label: "Zerados", value: `${s.completed}`, sub: s.count ? `${s.completionPct}%` : "" },
			s.achPct !== null ? { label: "Conquistas", value: U.fmtPct(s.achPct), tone: s.achPct === 100 ? "gold" : "" } : null
		];
	}

	gameGrid(ctx, games) {
		const { C, U } = ctx;
		if (!games.length) return U.empty({ icon: "grid", title: "Nenhum jogo aqui ainda", compact: true });
		return `<div class="sv-grid sv-grid--static">${games.map(g => U.gameCard(g, C)).join("")}</div>`;
	}

	// ============================================================ COLEÇÕES
	// Curadoria: cada coleção é uma "playlist" sua, com cor, ícone, tipo
	// (Meta, Maratona, Favoritos, Livre), capa em mosaico e progresso.
	collectionKinds() {
		return {
			goal: { label: "Meta", icon: "target" },
			marathon: { label: "Maratona", icon: "flame" },
			favorites: { label: "Favoritos", icon: "heart" },
			free: { label: "Coleção", icon: "layers" }
		};
	}

	collectionIdent(ctx, c) {
		const k = this.collectionKinds()[c.kind] || this.collectionKinds().free;
		const icon = c.iconImage ? `img:${c.iconImage}` : c.icon && ctx.U.paths[c.icon] ? c.icon : k.icon;
		return { color: /^#[0-9a-f]{3,8}$/i.test(c.accent || "") ? c.accent : `hsl(${ctx.C.hashHue(c.title)} 62% 56%)`, icon, kind: k.label };
	}

	smartIdent(id) {
		return ({
			playing: ["#1a9fff", "play"], month: ["#26a69a", "calendar"], near: ["#f2c14e", "target"], stale: ["#8fa3b8", "clock"],
			perfect: ["#e9bd52", "gem"], never: ["#a970ff", "books"], top: ["#ff7a45", "star"], long: ["#e94b3c", "flame"]
		})[id] || ["#4f8df7", "sparkles"];
	}

	// capa de playlist: até 4 capas num quadrado (ou a capa da coleção)
	playlistArt(ctx, c, id) {
		const { U } = ctx;
		if (c.cover) return `<div class="sv-plart is-cover"><img src="${U.attr(c.cover)}" alt="" loading="lazy" data-sv-img></div>`;
		const arts = c.games.map(g => g.images.cover).filter(Boolean).slice(0, 4);
		if (!arts.length) return `<div class="sv-plart is-empty"><span class="sv-plart-icon">${U.icon(id.icon)}</span></div>`;
		if (arts.length < 4) return `<div class="sv-plart is-stack" data-n="${arts.length}">${arts.map((s, i) => `<img class="sv-plart-c" style="--i:${i}" src="${U.attr(s)}" alt="" loading="lazy" data-sv-img>`).reverse().join("")}</div>`;
		return `<div class="sv-plart is-grid">${arts.map(s => `<img src="${U.attr(s)}" alt="" loading="lazy" data-sv-img>`).join("")}</div>`;
	}

	// 3.61.0: card de coleção no padrão dos gêneros e plataformas. Superfície
	// neutra, faixa com as capas sobre o fundo desfocado de uma delas; a cor
	// da coleção fica só no ícone. Sem jogos: os títulos planejados viram
	// minicapas tipográficas (ou o ícone, se não houver nada)
	collectionTile(ctx, c) {
		const { U, C } = ctx;
		const id = this.collectionIdent(ctx, c);
		const s = C.groupStats(c.games);
		const bg = c.cover || c.games.map(g => g.images.cover).find(Boolean) || "";
		const covers = c.games.slice(0, 3).map(g => U.cover(g)).join("");
		const planned = !covers && c.pending.length ? c.pending.slice(0, 3).map(t => `<span class="sv-gtile-plan" style="--sv-hue:${C.hashHue(t)}"><span>${U.esc(t)}</span></span>`).join("") : "";
		const art = covers ? `<div class="sv-gtile-covers">${covers}</div>` : planned ? `<div class="sv-gtile-covers">${planned}</div>` : `<span class="sv-gtile-mark">${U.icon(id.icon)}</span>`;
		const meta = [U.plural(c.games.length, "jogo", "jogos"), s.hours ? U.fmtHours(s.hours) : "", c.pending.length ? U.plural(c.pending.length, "planejado", "planejados") : ""].filter(Boolean);
		return `<a class="sv-gtile sv-gtile--col${c.pinned ? " is-pinned" : ""}" ${U.openAttrs(c.path)} style="${this.identStyle(id.color)}" data-hub-item data-name="${U.attr(c.title)}" data-key="${U.attr(this.hubKey(`${c.title} ${c.description} ${id.kind} ${c.games.map(g => g.title).join(" ")} ${c.pending.join(" ")}`))}" data-games="${c.games.length}" data-progress="${s.completionPct}" data-recent="${c.updated ? Date.parse(c.updated) / 864e5 : 0}">
			<div class="sv-gtile-art">${bg ? `<img class="sv-gtile-bg" src="${U.attr(bg)}" alt="" loading="lazy" decoding="async" data-sv-img>` : ""}${art}${c.pinned ? `<span class="sv-gtile-pin" title="Fixada">${U.icon("pin")}</span>` : ""}</div>
			<div class="sv-gtile-body">
				<span class="sv-gtile-head"><span class="sv-gtile-icon">${U.icon(id.icon)}</span><strong>${U.esc(c.title)}</strong></span>
				${c.description ? `<em class="sv-no-i18n">${U.esc(c.description)}</em>` : `<em>${U.esc(id.kind)}</em>`}
				<span class="sv-gtile-meta">${meta.map(m => `<span>${U.esc(m)}</span>`).join("")}${c.missing.length ? `<span class="sv-warn-text">${U.plural(c.missing.length, "link quebrado", "links quebrados")}</span>` : ""}</span>
				${c.games.length ? `<span class="sv-gtile-progress" title="${s.completed} de ${s.count} zerados"><span style="width:${s.completionPct}%"></span></span>` : ""}
			</div>
		</a>`;
	}

	// coleção automática no mesmo card (abre a página dela dentro de Coleções)
	smartTile(ctx, sc) {
		const { U, C } = ctx;
		const [color, icon] = this.smartIdent(sc.id);
		const s = C.groupStats(sc.games);
		const bg = sc.games.map(g => g.images.cover).find(Boolean) || "";
		return `<button type="button" class="sv-gtile sv-gtile--smart" data-action="smart-collection" data-id="${U.attr(sc.id)}" style="${this.identStyle(color)}">
			<div class="sv-gtile-art">${bg ? `<img class="sv-gtile-bg" src="${U.attr(bg)}" alt="" loading="lazy" decoding="async" data-sv-img>` : ""}${sc.games.length ? `<div class="sv-gtile-covers">${sc.games.slice(0, 3).map(g => U.cover(g)).join("")}</div>` : `<span class="sv-gtile-mark">${U.icon(icon)}</span>`}</div>
			<div class="sv-gtile-body">
				<span class="sv-gtile-head"><span class="sv-gtile-icon">${U.icon(icon)}</span><strong>${U.esc(sc.title)}</strong></span>
				<span class="sv-gtile-meta"><span>${U.plural(sc.games.length, "jogo", "jogos")}</span>${s.hours ? `<span>${U.esc(U.fmtHours(s.hours))}</span>` : ""}</span>
			</div>
		</button>`;
	}

	// painel de resumo (como o "Seu DNA gamer" dos gêneros): a coleção em
	// destaque e quanto de cada coleção você já zerou
	curation(ctx, cols) {
		const { U, C } = ctx;
		const featured = cols.find(c => c.pinned) || [...cols].filter(c => c.updated).sort((a, b) => b.updated.localeCompare(a.updated))[0] || cols[0];
		if (!featured) return "";
		const fid = this.collectionIdent(ctx, featured);
		const why = featured.pinned ? "Coleção fixada" : featured.updated ? `Atualizada ${U.relDate(featured.updated)}` : "Sua maior coleção";
		const withGames = cols.filter(c => c.games.length).map(c => ({ c, s: C.groupStats(c.games) })).sort((a, b) => b.s.completionPct - a.s.completionPct || b.c.games.length - a.c.games.length).slice(0, 6);
		const uniq = new Set(cols.flatMap(c => c.games));
		const tot = C.groupStats([...uniq]);
		return `<section class="sv-dna sv-dna--col" style="${this.identStyle(fid.color)}">
			<div class="sv-dna-head">
				<span class="sv-dna-kicker">Sua curadoria</span>
				<a class="sv-dna-fav" ${U.openAttrs(featured.path)}><span class="sv-dna-favicon">${U.icon(fid.icon)}</span><div><small>${U.esc(why)}</small><b>${U.esc(featured.title)}</b><em${featured.description ? ' class="sv-no-i18n"' : ""}>${U.esc(featured.description || `${fid.kind} · ${U.plural(featured.games.length, "jogo", "jogos")}`)}</em></div></a>
			</div>
			${withGames.length ? `<ol class="sv-dna-bars">${withGames.map(({ c, s }) => { const id = this.collectionIdent(ctx, c); return `<li style="${this.identStyle(id.color)}"><span class="sv-dna-ico">${U.icon(id.icon)}</span><a class="sv-dna-name" ${U.openAttrs(c.path)}>${U.esc(c.title)}</a><span class="sv-dna-track"><span style="width:${s.completionPct}%"></span></span><b>${s.completionPct}%</b></li>`; }).join("")}</ol>` : `<p class="sv-dna-empty">Adicione jogos às coleções para acompanhar o progresso de cada uma aqui.</p>`}
			<p class="sv-dna-note">${uniq.size ? `${U.plural(uniq.size, "jogo", "jogos")} nas suas coleções · ${U.plural(tot.completed, "zerado", "zerados")} (${tot.completionPct}%). As barras mostram quanto de cada coleção você já zerou.` : "As barras mostram quanto de cada coleção você já zerou."}</p>
		</section>`;
	}

	collections(ctx) {
		const { U, C, model } = ctx;
		const smartView = window.__svSmartView;
		if (smartView && ctx.X?.smartCollections) {
			const sc = ctx.X.smartCollections(model).find(x => x.id === smartView);
			if (sc) return this.smartCollectionPage(ctx, sc);
			window.__svSmartView = null;
		}
		const cols = [...model.collections].sort((a, b) => b.games.length - a.games.length || a.title.localeCompare(b.title));
		const smart = ctx.X ? ctx.X.smartCollections(model) : [];
		const add = U.btn("Nova coleção", { icon: "plus", kind: "primary", action: "legacy", attrs: 'data-legacy="addCollection"' });
		const html = `<div class="sv-page sv-pad sv-hubpage sv-hubpage--collections">
			${U.pageHead("Coleções", { sub: `${U.plural(cols.length, "coleção", "coleções")}${smart.length ? ` · ${U.plural(smart.length, "automática", "automáticas")}` : ""}`, actions: add })}
			${cols.length ? `
				${this.curation(ctx, cols)}
				${cols.length > 3 ? this.hubBar(ctx, { placeholder: "Buscar coleção ou jogo", sorts: [["games", "Jogos"], ["progress", "Progresso"], ["recent", "Recentes"], ["name", "Nome"]] }) : ""}
				<div class="sv-gtiles sv-gtiles--col" data-hub-list>${cols.map(c => this.collectionTile(ctx, c)).join("")}</div>
				<p class="sv-hub-noresult" data-hub-empty hidden>Nenhuma coleção encontrada.</p>`
				: U.empty({ icon: "stack", title: "Nenhuma coleção", text: "Coleções agrupam jogos por tema: favoritos, metas, maratonas.", action: U.btn("Criar coleção", { icon: "plus", kind: "primary", action: "legacy", attrs: 'data-legacy="addCollection"' }) })}
			${smart.length ? `<section class="sv-block">${U.sectionHead("Coleções automáticas", { count: smart.length, sub: "Montadas sozinhas a partir dos seus dados" })}<div class="sv-gtiles sv-gtiles--smart">${smart.map(sc => this.smartTile(ctx, sc)).join("")}</div></section>` : ""}
		</div>`;
		return { active: "collections", html, wire: root => this.wireHubBar(root) };
	}

	// coleção automática: página dentro de Coleções (não tem nota própria)
	smartCollectionPage(ctx, sc) {
		const { U, C } = ctx;
		const [color, icon] = this.smartIdent(sc.id);
		const art = sc.games.map(g => g.images.background || g.images.featured).find(Boolean) || "";
		const html = `<div class="sv-page sv-idpage" style="${this.identStyle(color)}">
			<section class="sv-idhero sv-idhero--collection${art ? " has-art" : ""}">
				${art ? `<img class="sv-idhero-art" src="${U.attr(art)}" alt="" data-sv-img>` : ""}
				<span class="sv-idhero-mark" aria-hidden="true">${U.icon(icon)}</span>
				<div class="sv-idhero-inner">
					<button type="button" class="sv-idhero-back" data-action="smart-back">${U.icon("chevronLeft")}Coleções</button>
					<span class="sv-idhero-kicker"><span class="sv-idhero-badge">${U.icon(icon)}</span>Coleção automática</span>
					<h1>${U.esc(sc.title)}</h1>
					<p class="sv-idhero-desc">${U.esc(sc.sub)}. Atualiza sozinha conforme seus dados mudam.</p>
					${U.figures(this.statsFor(ctx, sc.games))}
				</div>
			</section>
			<div class="sv-pad">
				<section class="sv-block">${U.sectionHead("Jogos", { count: sc.games.length })}${this.gameGrid(ctx, sc.games)}</section>
				<section class="sv-block">${U.sectionHead("Por status")}${this.statusBar(ctx, sc.games)}</section>
			</div>
		</div>`;
		return { active: "collections", html };
	}

	collection(ctx) {
		const { U, C, model, current } = ctx;
		const c = model.collections.find(x => x.path === current.file.path);
		if (!c) return { active: "collections", html: U.empty({ icon: "alert", title: "Coleção não encontrada" }) };
		const id = this.collectionIdent(ctx, c);
		const s = C.groupStats(c.games);
		const isGoal = c.kind === "goal";
		const next = c.games.find(g => g.status === "Playing") || c.games.find(g => !["Completed", "Dropped"].includes(g.status));
		const art = c.cover || c.games.map(g => g.images.background || g.images.featured).find(Boolean) || "";
		let view = "grid", sort = "manual";
		try { view = U._store("collView") === "list" ? "list" : "grid"; } catch (_) {}
		const plats = C.groupBy(c.games, g => g.platform), genres = C.groupBy(c.games, g => g.genres);
		const names = [...model.collections].sort((a, b) => b.games.length - a.games.length || a.title.localeCompare(b.title));
		const pager = (() => {
			const i = names.indexOf(c);
			if (names.length < 2 || i < 0) return "";
			const prev = names[(i - 1 + names.length) % names.length], nx = names[(i + 1) % names.length];
			const link = (x, dir) => `<a class="sv-pager-link is-${dir}" ${U.openAttrs(x.path)}>${U.icon(dir === "prev" ? "chevronLeft" : "chevronRight")}<span><small>${dir === "prev" ? "Anterior" : "Próxima"}</small><b>${U.esc(x.title)}</b></span></a>`;
			return prev === nx ? `<nav class="sv-pager is-single">${link(nx, "next")}</nav>` : `<nav class="sv-pager">${link(prev, "prev")}${link(nx, "next")}</nav>`;
		})();
		const warn = c.missing.length ? `<div class="sv-callout sv-callout--warn">${U.icon("alert")}<div><strong>${c.missing.length === 1 ? "1 jogo desta coleção não existe" : `${c.missing.length} jogos desta coleção não existem`} no vault</strong><p>${c.missing.map(m => U.esc(m)).join(", ")}. Use “Adicionar jogos” para corrigir a lista.</p></div></div>` : "";
		const row = (g, i) => `<li class="sv-plrow is-${g.status.toLowerCase()}" data-path="${U.attr(g.path)}" data-title="${U.attr(g.title)}" data-rating="${g.rating || 0}" data-hours="${g.playtime.hours}" data-status="${C.statusDefs[g.status]?.order ?? 9}" data-idx="${i}">
			<button type="button" class="sv-plrow-handle" aria-label="Arrastar para reordenar" title="Arrastar para reordenar">${U.icon("menu")}</button>
			<span class="sv-plrow-n">${i + 1}</span>
			<a class="sv-plrow-main" ${U.openAttrs(g.path)}>${U.cover(g, { cls: "sv-cover--xs" })}<span class="sv-plrow-text"><b>${U.esc(g.title)}</b><small>${[g.platform, g.releaseYear].filter(Boolean).map(x => U.esc(x)).join(" · ")}</small></span></a>
			<span class="sv-plrow-status"><i></i>${U.esc(C.statusLabel(g.status))}</span>
			<span class="sv-plrow-hours">${g.playtime.hours ? U.fmtHours(g.playtime.hours) : "—"}</span>
			<button type="button" class="sv-plrow-remove" data-col-remove aria-label="Remover da coleção" title="Remover da coleção">${U.icon("x")}</button>
		</li>`;
		const actions = `${U.btn("Adicionar jogos", { icon: "plus", kind: "primary", action: "collection-games", attrs: `data-path="${U.attr(c.path)}"` })}${U.btn("Editar identidade", { icon: "edit", kind: "glass", action: "identity-edit", attrs: `data-kind="collection" data-name="${U.attr(c.title)}" data-path="${U.attr(c.path)}"` })}${U.btn("", { icon: "share", kind: "glass", action: "share-card", title: "Compartilhar coleção", attrs: `data-kind="collection" data-path="${U.attr(c.path)}"` })}${U.btn("", { icon: "gear", kind: "glass", action: "legacy", title: "Nome e dados da coleção", attrs: 'data-legacy="editCollection"' })}`;
		const stats = [
			{ label: "Jogos", value: U.fmtNum(s.count) },
			{ label: "Horas", value: U.fmtHours(s.hours) },
			{ label: "Zerados", value: `${s.completed}`, sub: s.count ? `${s.completionPct}%` : "" },
			s.achPct !== null ? { label: "Conquistas", value: U.fmtPct(s.achPct), tone: s.achPct === 100 ? "gold" : "" } : null
		];
		const html = `<div class="sv-page sv-idpage sv-colpage" style="${this.identStyle(id.color)}">
			<section class="sv-idhero sv-idhero--collection${art ? " has-art" : ""}">
				${art ? `<img class="sv-idhero-art" src="${U.attr(art)}" alt="" data-sv-img>` : ""}
				<span class="sv-idhero-mark" aria-hidden="true">${U.icon(id.icon)}</span>
				<div class="sv-idhero-inner sv-colhero">
					${this.playlistArt(ctx, c, id)}
					<div class="sv-colhero-text">
						<span class="sv-idhero-kicker"><span class="sv-idhero-badge">${U.icon(id.icon)}</span>${U.esc(id.kind)}${c.pinned ? " · fixada" : ""}</span>
						<h1>${U.esc(c.title)}</h1>
						${c.description ? `<p class="sv-idhero-desc">${U.esc(c.description)}</p>` : ""}
						${U.figures(stats)}
						${isGoal && c.games.length ? `<div class="sv-goal"><div class="sv-goal-head"><b>${s.completionPct}%</b><span>da meta · ${s.completed} de ${s.count} zerados</span></div><span class="sv-goal-bar"><span style="width:${s.completionPct}%"></span></span></div>` : ""}
						<div class="sv-idhero-actions">${actions}</div>
					</div>
				</div>
			</section>
			<div class="sv-pad">
				${warn}
				${next && (isGoal || c.kind === "marathon") ? `<section class="sv-block">${U.sectionHead("Próximo da lista", { sub: next.status === "Playing" ? "Você está jogando" : "O primeiro da lista que falta zerar" })}${U.wideCard(next, C)}</section>` : ""}
				<section class="sv-block" data-col="${U.attr(c.path)}">
					${U.sectionHead("Jogos", { count: c.games.length })}
					${c.games.length ? `<div class="sv-coltools">
						<div class="sv-segmented" role="radiogroup" aria-label="Exibição"><button type="button" data-col-view="grid" class="${view === "grid" ? "is-active" : ""}" aria-label="Grade">${U.icon("grid")}</button><button type="button" data-col-view="list" class="${view === "list" ? "is-active" : ""}" aria-label="Lista">${U.icon("list")}</button></div>
						<label class="sv-colsort">${U.icon("sort")}<select data-col-sort aria-label="Ordenar">
							<option value="manual">Ordem da coleção</option><option value="rating">Nota</option><option value="hours">Horas</option><option value="status">Status</option><option value="title">Nome</option>
						</select></label>
						<span class="sv-coltools-hint" data-col-hint>${view === "list" ? "Arraste ☰ para reordenar" : ""}</span>
					</div>
					<div class="sv-colgrid" data-col-grid${view === "grid" ? "" : " hidden"}>${this.gameGrid(ctx, c.games)}</div>
					<ol class="sv-playlist" data-col-list${view === "list" ? "" : " hidden"}>${c.games.map(row).join("")}</ol>`
					: U.empty({ icon: id.icon, title: "Coleção vazia", text: "Adicione jogos para começar a montar esta coleção.", action: U.btn("Adicionar jogos", { icon: "plus", kind: "primary", action: "collection-games", attrs: `data-path="${U.attr(c.path)}"` }), compact: true })}
				</section>
				${c.pending.length ? `<section class="sv-block">${U.sectionHead("Ainda fora do vault", { count: c.pending.length, sub: "Títulos planejados para esta coleção que ainda não têm ficha" })}
					<div class="sv-pending">${c.pending.map(t => `<div class="sv-pending-item" style="--sv-hue:${C.hashHue(t)}"><span class="sv-pending-art">${U.esc(t)}</span><div><b>${U.esc(t)}</b>${U.btn("Criar ficha", { icon: "plus", kind: "ghost", size: "sm", action: "add-game", attrs: `data-title="${U.attr(t)}"` })}</div></div>`).join("")}</div></section>` : ""}
				${c.games.length ? `<section class="sv-block">${U.sectionHead("Resumo")}
					${this.statusBar(ctx, c.games)}
					<div class="sv-colsum">
						${plats.size ? `<div><h3>Plataformas</h3><div class="sv-chiplinks">${[...plats].filter(([n]) => n).sort((a, b) => b[1].length - a[1].length).map(([n, l]) => { const pp = model.platforms.find(p => C.normalizeKey(p.title) === C.normalizeKey(n)); const pid = this.ident(ctx, "platform", n, pp); return `<a class="sv-chiplink sv-chiplink--id" ${U.catAttrs("platform", n, pp)} style="${this.identStyle(pid.color)}">${U.icon(pid.icon)}${U.esc(n)}<span>${l.length}</span></a>`; }).join("")}</div></div>` : ""}
						${genres.size ? `<div><h3>Gêneros</h3><div class="sv-chiplinks">${[...genres].sort((a, b) => b[1].length - a[1].length).slice(0, 10).map(([n, l]) => { const gp = model.genres.find(p => C.normalizeKey(p.title) === C.normalizeKey(n)); const gid = this.ident(ctx, "genre", n, gp); return `<a class="sv-chiplink sv-chiplink--id" ${U.catAttrs("genre", n, gp)} style="${this.identStyle(gid.color)}">${U.icon(gid.icon)}${U.esc(n)}<span>${l.length}</span></a>`; }).join("")}</div></div>` : ""}
					</div></section>` : ""}
				${pager}
			</div>
		</div>`;
		return { active: "collections", html, wire: root => this.wireCollection(root, ctx, c) };
	}

	// grade/lista, ordenação, arrastar para reordenar e remover da coleção
	wireCollection(root, ctx, c) {
		const { U, V } = ctx;
		const sec = root.querySelector("[data-col]");
		if (!sec) return;
		const grid = sec.querySelector("[data-col-grid]"), list = sec.querySelector("[data-col-list]"), hint = sec.querySelector("[data-col-hint]");
		const sortSel = sec.querySelector("[data-col-sort]");
		let sort = "manual";
		const renumber = () => list?.querySelectorAll(".sv-plrow").forEach((r, i) => { r.querySelector(".sv-plrow-n").textContent = i + 1; });
		const setHint = () => { if (hint) hint.textContent = !list?.hidden ? (sort === "manual" ? "Arraste ☰ para reordenar" : "Volte para “Ordem da coleção” para reordenar") : ""; };
		sec.querySelectorAll("[data-col-view]").forEach(b => b.addEventListener("click", () => {
			const v = b.dataset.colView;
			sec.querySelectorAll("[data-col-view]").forEach(x => x.classList.toggle("is-active", x === b));
			if (grid) grid.hidden = v !== "grid";
			if (list) list.hidden = v !== "list";
			list?.classList.toggle("is-sorted", sort !== "manual");
			try { U._store("collView", v); } catch (_) {}
			setHint();
		}));
		// ordenação: reorganiza a lista e a grade (sem gravar; só "Ordem da coleção" é gravada)
		const manualOrder = () => [...(list?.querySelectorAll(".sv-plrow") || [])].sort((a, b) => a.dataset.idx - b.dataset.idx);
		const applySort = () => {
			if (!list) return;
			let rows = manualOrder();
			const by = { rating: (a, b) => b.dataset.rating - a.dataset.rating, hours: (a, b) => b.dataset.hours - a.dataset.hours, status: (a, b) => a.dataset.status - b.dataset.status, title: (a, b) => a.dataset.title.localeCompare(b.dataset.title) }[sort];
			if (by) rows = rows.sort((a, b) => by(a, b) || a.dataset.idx - b.dataset.idx);
			rows.forEach(r => list.appendChild(r));
			renumber();
			const cards = grid?.querySelector(".sv-grid");
			if (cards) { const map = new Map([...cards.children].map(el => [el.querySelector("[data-open]")?.dataset.open || el.dataset.open, el])); rows.forEach(r => { const el = map.get(r.dataset.path); if (el) cards.appendChild(el); }); }
			list.classList.toggle("is-sorted", sort !== "manual");
			setHint();
		};
		sortSel?.addEventListener("change", () => { sort = sortSel.value; applySort(); });

		const save = async (paths, okMsg) => {
			const file = app.vault.getAbstractFileByPath(c.path);
			if (!file) throw new Error("nota da coleção não encontrada");
			const link = p => `[[${String(p).replace(/\.md$/, "")}]]`;
			await app.fileManager.processFrontMatter(file, fm => {
				fm.games = [...paths.map(link), ...c.missing.map(m => `[[${m}]]`)];
				fm.updated = ctx.C.today();
			});
			if (okMsg) V.toast(okMsg, { tone: "ok", icon: "check" });
		};
		const currentPaths = () => manualOrder().map(r => r.dataset.path);

		// remover da coleção (lista)
		list?.addEventListener("click", async e => {
			const btn = e.target.closest("[data-col-remove]");
			if (!btn) return;
			e.preventDefault();
			const row = btn.closest(".sv-plrow");
			const title = row.dataset.title;
			row.classList.add("is-leaving");
			const removedIdx = Number(row.dataset.idx);
			const rest = currentPaths().filter(p => p !== row.dataset.path);
			try {
				await save(rest, `“${title}” saiu da coleção`);
				row.remove();
				list.querySelectorAll(".sv-plrow").forEach(r => { if (Number(r.dataset.idx) > removedIdx) r.dataset.idx = Number(r.dataset.idx) - 1; });
				grid?.querySelector(`.sv-grid > *:has([data-open="${CSS.escape(row.dataset.path)}"])`)?.remove();
				renumber();
			} catch (err) {
				row.classList.remove("is-leaving");
				V.toast(`Não foi possível remover: ${err.message}`, { tone: "error" });
			}
		});

		// arrastar para reordenar (só na "Ordem da coleção")
		let drag = null;
		list?.addEventListener("pointerdown", e => {
			const h = e.target.closest(".sv-plrow-handle");
			if (!h || sort !== "manual") return;
			e.preventDefault();
			const row = h.closest(".sv-plrow");
			const rows = [...list.querySelectorAll(".sv-plrow")];
			drag = { row, y0: e.clientY, start: rows.indexOf(row), rects: rows.map(r => r.getBoundingClientRect()), rows, to: rows.indexOf(row), id: e.pointerId };
			h.setPointerCapture?.(e.pointerId);
			row.classList.add("is-dragging"); list.classList.add("is-reordering");
		});
		list?.addEventListener("pointermove", e => {
			if (!drag || e.pointerId !== drag.id) return;
			const dy = e.clientY - drag.y0;
			drag.row.style.transform = `translateY(${dy}px)`;
			const mid = drag.rects[drag.start].top + drag.rects[drag.start].height / 2 + dy;
			let to = drag.rects.findIndex(r => mid < r.top + r.height / 2);
			if (to < 0) to = drag.rects.length - 1;
			drag.to = to;
			const h = drag.rects[drag.start].height + 6;
			drag.rows.forEach((r, i) => {
				if (r === drag.row) return;
				const shift = drag.start < to ? (i > drag.start && i <= to ? -h : 0) : (i < drag.start && i >= to ? h : 0);
				r.style.transform = shift ? `translateY(${shift}px)` : "";
			});
		});
		const drop = async e => {
			if (!drag || (e && e.pointerId !== drag.id)) return;
			const { row, start, to, rows } = drag;
			drag = null;
			rows.forEach(r => { r.style.transform = ""; });
			row.classList.remove("is-dragging"); list.classList.remove("is-reordering");
			if (to === start) return;
			const order = rows.slice(); order.splice(start, 1); order.splice(to, 0, row);
			order.forEach((r, i) => { r.dataset.idx = i; list.appendChild(r); });
			renumber();
			ctx.V._haptic?.();
			try { await save(order.map(r => r.dataset.path), "Ordem salva"); }
			catch (err) { V.toast(`Não foi possível salvar a ordem: ${err.message}`, { tone: "error" }); }
		};
		list?.addEventListener("pointerup", drop);
		list?.addEventListener("pointercancel", drop);
	}

	// ============================================================ GALERIA DE ÍCONES (3.35.0)
	// Revisão do sistema de ícones: gêneros por família, plataformas, marcas,
	// temas e interface, cada um em 24 e 16 px sobre fundo escuro e claro.
	// Os ícones vêm do mesmo registro que as telas usam (U.paths).
	genreGallery() {
		return [
			["Ação e combate", [["Ação", "acao"], ["Hack and slash", "hackslash"], ["Beat 'em up", "beatemup"], ["Luta", "luta"], ["Tiro", "tiro"], ["FPS", "fps"], ["Tiro em 3ª pessoa", "tps"], ["Shoot 'em up", "shmup"], ["Battle royale", "battleroyale"], ["Soulslike", "soulslike"]]],
			["Aventura e exploração", [["Aventura", "aventura"], ["Ação e aventura", "acaoaventura"], ["Exploração", "exploracao"], ["Mundo aberto", "mundoaberto"], ["Sandbox", "sandbox"], ["Metroidvania", "metroidvania"]]],
			["RPG", [["RPG", "rpg"], ["JRPG", "jrpg"], ["Action RPG", "arpg"], ["MMORPG", "mmorpg"]]],
			["Plataforma e movimento", [["Plataforma", "plataforma"], ["Plataforma 2D", "plataforma2d"], ["Plataforma 3D", "plataforma3d"], ["Plataforma de precisão", "precisionplatformers"], ["Parkour", "parkour"], ["Corrida", "corrida"], ["Esportes", "esportes"]]],
			["Estratégia, simulação e mente", [["Estratégia", "estrategia"], ["Tático", "tatico"], ["Tower defense", "towerdefense"], ["Cartas", "cartas"], ["Simulação", "simulacao"], ["Construção de cidades", "citybuilder"], ["Fazenda", "fazenda"], ["Quebra-cabeça", "puzzle"], ["Point and click", "pointandclick"], ["Roguelike", "roguelike"]]],
			["Tensão", [["Terror", "terror"], ["Survival horror", "survivalhorror"], ["Terror psicológico", "terrorpsicologico"], ["Sobrevivência", "sobrevivencia"], ["Furtividade", "furtividade"]]],
			["História e estilo", [["Narrativo", "narrativo"], ["Visual novel", "visualnovel"], ["Música e ritmo", "ritmo"], ["Cooperativo", "coop"], ["Aconchegante", "cozy"], ["Indie", "indie"]]]
		];
	}

	// o que cada símbolo de gênero quer dizer (legenda da galeria)
	iconConcept(id) {
		return ({
			"g-action": "espada", "g-adventure": "bússola", "g-actionadventure": "espada fincada no pico da montanha",
			"g-hackslash": "espadas cruzadas", "g-fighting": "luva de boxe", "crosshair": "mira com ponto central", "g-fps": "mira com anel", "g-tps": "personagem com a mira ao lado",
			"g-soulslike": "chama dupla", "compass": "bússola", "g-openworld": "duas montanhas", "g-sandbox": "caixa 3D",
			"g-metroidvania": "morcego", "g-rpg": "cristal octaedro", "g-jrpg": "cristal", "g-arpg": "escudo com espada", "g-mmo": "grupo de pessoas",
			"g-platformer": "pessoa correndo", "g-platformer2d": "degraus de blocos", "g-platformer3d": "plataforma flutuante e salto", "g-precision": "salto sobre espinhos",
			"g-parkour": "corrida livre", "car": "volante", "ball": "bola de futebol", "pawn": "torre de xadrez", "g-tactical": "mira de localização", "g-simulation": "engrenagem em movimento", "puzzle": "peça de quebra-cabeça",
			"dice": "dado 3D", "ghost": "fantasma", "skull": "caveira", "g-survival": "fogueira", "g-stealth": "olho", "g-narrative": "livro aberto",
			"g-visualnovel": "livro aberto", "g-rhythm": "notas musicais", "g-coop": "aperto de mãos", "g-indie": "coração de pixels", "g-puzzle": "grade de pe\u00e7as", "g-exploration": "bin\u00f3culos", "g-battleroyale": "paraquedas", "g-cozy": "caneca quente", "g-cards": "cartas", "g-towerdefense": "muralha do castelo", "g-pointclick": "clique do cursor", "g-beatemup": "punho fechado", "g-shmup": "nave decolando", "g-farming": "broto", "g-citybuilder": "pr\u00e9dios", "g-psychorror": "c\u00e9rebro"
		})[id] || "";
	}

	iconGallery(ctx) {
		const { U, C, model } = ctx;
		const used = new Set(model.games.flatMap(g => [...(g.genres || []), ...(g.subgenres || []), g.platform]).filter(Boolean).map(x => this.hubKey(x).replace(/[^a-z0-9]/g, "")));
		const cell = (id, label, tag = "", concept = "") => `<figure class="sv-icg-cell"${U.paths[id] ? "" : " data-missing"}>
			<div class="sv-icg-sw is-dark">${U.icon(id, "sv-icg-24")}${U.icon(id, "sv-icg-16")}</div>
			<div class="sv-icg-sw is-light">${U.icon(id, "sv-icg-24")}${U.icon(id, "sv-icg-16")}</div>
			<figcaption><b>${U.esc(label)}</b>${concept ? `<small>${U.esc(concept)}</small>` : ""}<code>${U.esc(id)}</code>${tag ? `<em>${U.esc(tag)}</em>` : ""}</figcaption>
		</figure>`;
		const grid = items => `<div class="sv-icg-grid">${items.join("")}</div>`;
		const genreSecs = this.genreGallery().map(([fam, list]) => `<h3 class="sv-icg-fam">${U.esc(fam)}</h3>${grid(list.map(([label, key]) => (id => cell(id, label, used.has(key) ? "na biblioteca" : "", this.iconConcept(id)))(this.genreDefaults(key)?.icon || "gamepad")))}`).join("");
		const strip = [...new Set(this.genreGallery().flatMap(([, l]) => l.map(([, k]) => this.genreDefaults(k)?.icon)).filter(Boolean))];
		const platGroups = this.iconGroups("platform");
		const usedPlat = new Set([...model.games.map(g => this.platformDefaults(g.platform)?.icon)].filter(Boolean));
		const platSecs = platGroups.filter(([n]) => n !== "Marcas e lojas").map(([name, list]) => `<h3 class="sv-icg-fam">${U.esc(name)}</h3>${grid(list.map(id => cell(id, this.iconLabel(id), usedPlat.has(id) ? "na biblioteca" : "")))}`).join("");
		const brands = (platGroups.find(([n]) => n === "Marcas e lojas") || [, []])[1];
		const themes = this.iconGroups("genre").find(([n]) => n === "Temas")[1].filter(id => !strip.includes(id));
		const grouped = new Set([...strip, ...themes, ...platGroups.flatMap(([, l]) => l)]);
		const ui = Object.keys(U.paths).filter(id => !grouped.has(id) && !/^[cghb]-/.test(id));
		const section = (title, sub, body) => `<section class="sv-block sv-icg-sec">${U.sectionHead(title, { sub })}${body}</section>`;
		const html = `<div class="sv-page sv-pad sv-icg">
			<header class="sv-icg-head"><h1>Ícones</h1><p class="sv-muted">Traço 2, grade de 24 com margem de 2 e cor do texto (<code>currentColor</code>), então seguem o tema claro, o escuro e a cor de destaque. Cada ícone aparece em 24 e 16 px sobre fundo escuro e claro. Os arquivos SVG ficam em <code>Assets/Icons/</code>.</p></header>
			${section("Gêneros", "o ícone padrão de cada gênero; a nota do gênero pode trocar em Editar identidade", `<div class="sv-icg-strip" aria-label="Todos os gêneros lado a lado em 16 px">${strip.map(id => `<span title="${U.attr(id)}">${U.icon(id)}</span>`).join("")}</div>${genreSecs}`)}
			${section("Consoles e plataformas", "o desenho do aparelho quando o formato é marcante, o logo quando a plataforma é reconhecida pelo nome", platSecs)}
			${section("Marcas e lojas", "símbolos próprios e simplificados, usados nos atalhos das contas", grid(brands.map(id => cell(id, this.iconLabel(id)))))}
			${section("Temas", "para franquias, coleções e subgêneros", grid(themes.map(id => cell(id, this.iconLabel(id)))))}
			${section("Interface", "navegação, ações e estados", grid(ui.map(id => cell(id, id))))}
		</div>`;
		return { active: "settings", html };
	}

	// ============================================================ IDENTIDADE
	// Plataformas, gêneros e franquias: cor, ícone e dados próprios. Os
	// padrões abaixo valem até a pessoa definir os dela em "Editar
	// identidade" (campos accent, icon, maker, year, generation da nota).

	// ícones do editor de identidade, em grupos (o primeiro grupo é o mais
	// provável para o tipo; os temáticos servem a todos)
	iconGroups(kind) {
		const consoles = ["c-atari", "c-nes", "c-mastersystem", "c-snes", "c-megadrive", "c-ps1", "c-saturn", "c-n64", "c-dreamcast", "c-ps2", "c-gamecube", "c-xbox", "c-ps3", "c-xbox360", "c-wii", "c-wiiu", "c-ps4", "c-xboxone", "c-switch", "c-ps5", "c-xseries", "c-switch2", "c-virtualboy", "c-segacd", "c-32x", "c-neogeo", "c-pcengine", "c-jaguar", "c-3do"];
		const sony = ["c-ps1-unit", "c-ps2-unit", "c-ps3-unit", "c-ps3slim", "c-ps4-unit", "c-ps4pro", "c-ps5-unit", "c-ps5slim", "h-psp-unit", "h-vita-unit", "h-portal"];
		const handhelds = ["h-gameboy", "h-gamegear", "h-gba", "h-ds", "h-3ds", "h-psp", "h-vita", "h-switchlite", "h-deck", "h-ally", "h-lynx", "h-wonderswan", "h-portal", "handheld"];
		const pcs = ["monitor", "c-pc", "c-laptop", "smartphone", "h-tablet", "c-arcade", "c-vr", "c-quest", "c-tv", "gamepad", "joystick", "vault"];
		const themes = ["flame", "ghost", "skull", "sword", "swords", "bow", "shield", "wand", "potion", "crown", "castle", "map", "compass", "mountain", "tree", "leaf", "sun", "snowflake", "wave", "anchor", "rocket", "planet", "ufo", "robot", "city", "car", "bolt", "crosshair", "bomb", "hammer", "key", "puzzle", "dice", "pawn", "invader", "mushroom", "ball", "trophy", "medal", "gem", "star", "sparkles", "heart", "heartbeat", "paw", "feather", "eye", "bulb", "music", "headphones", "camera", "film", "books", "masks", "moon", "clock", "calendar", "flag", "target", "layers"];
		const genres = ["g-action", "g-adventure", "g-actionadventure", "g-rpg", "g-jrpg", "g-arpg", "g-hackslash", "g-soulslike", "g-openworld", "g-sandbox", "compass", "g-metroidvania", "g-platformer", "g-platformer2d", "g-platformer3d", "g-precision", "g-parkour", "crosshair", "g-fps", "g-tps", "g-fighting", "car", "ball", "pawn", "g-tactical", "g-simulation", "g-survival", "ghost", "skull", "puzzle", "dice", "g-stealth", "g-rhythm", "g-narrative", "g-visualnovel", "g-mmo", "g-coop", "g-indie", "g-puzzle", "g-exploration", "g-battleroyale", "g-cozy", "g-cards", "g-towerdefense", "g-pointclick", "g-beatemup", "g-shmup", "g-farming", "g-citybuilder", "g-psychorror"];
		const brands = ["b-playstation", "b-xbox", "b-nintendo", "b-steam", "b-gog", "b-epic", "b-retro", "b-googleplay"];
		if (kind === "platform") return [["Consoles", consoles], ["Portáteis", handhelds], ["Aparelhos PlayStation", sony.filter(i => i !== "h-portal")], ["PC, celular e outros", pcs], ["Marcas e lojas", brands]];
		if (kind === "genre" || kind === "subgenre") return [["Gêneros", genres], ["Temas", kind === "subgenre" ? ["tag", ...themes] : themes], ["Jogos e consoles", ["gamepad", "joystick", "c-arcade", "invader", ...handhelds.slice(0, 3)]]];
		if (kind === "franchise") return [["Temas", ["film", ...themes.filter(i => i !== "film")]], ["Consoles e portáteis", [...consoles, ...handhelds, ...sony.filter(i => !handhelds.includes(i))]], ["Marcas", brands]];
		return [["Coleção", ["layers", "heart", "target", "flame", "trophy", "star", "gem", "calendar", "books", "crown", "flag", "clock", "moon", "sparkles"]], ["Temas", themes.filter(i => !["layers", "heart", "target", "flame", "trophy", "star", "gem", "calendar", "books", "crown", "flag", "clock", "moon", "sparkles"].includes(i))], ["Consoles e portáteis", [...consoles, ...handhelds, ...sony.filter(i => !handhelds.includes(i)), ...pcs]], ["Marcas e lojas", brands]];
	}

	iconLabel(i) {
		const n = { "c-ps1-unit": "PS1 (console)", "c-ps2-unit": "PS2 (console)", "c-ps3-unit": "PS3 (console)", "c-ps3slim": "PS3 Slim", "c-ps4-unit": "PS4 (console)", "c-ps4pro": "PS4 Pro", "c-ps5-unit": "PS5 (console)", "c-ps5slim": "PS5 Slim", "h-psp-unit": "PSP (console)", "h-vita-unit": "PS Vita (console)", "h-portal": "PS Portal", "c-switch2": "Switch 2", "c-virtualboy": "Virtual Boy", "c-segacd": "Sega CD", "c-32x": "32X", "c-neogeo": "Neo Geo", "c-pcengine": "PC Engine", "h-lynx": "Atari Lynx", "c-jaguar": "Atari Jaguar", "c-3do": "3DO", "h-wonderswan": "WonderSwan", "c-quest": "Meta Quest", "h-ally": "ROG Xbox Ally", "g-puzzle": "Quebra-cabe\u00e7a", "g-exploration": "Explora\u00e7\u00e3o", "g-battleroyale": "Battle royale", "g-cozy": "Aconchegante", "g-cards": "Cartas", "g-towerdefense": "Tower defense", "g-pointclick": "Point and click", "g-beatemup": "Beat 'em up", "g-shmup": "Shoot 'em up", "g-farming": "Fazenda", "g-citybuilder": "Constru\u00e7\u00e3o de cidades", "g-psychorror": "Terror psicol\u00f3gico", "g-action": "Ação", "g-adventure": "Aventura", "g-actionadventure": "Ação e aventura", "g-arpg": "Action RPG", "g-sandbox": "Sandbox", "g-metroidvania": "Metroidvania", "g-rpg": "RPG", "g-jrpg": "JRPG", "g-hackslash": "Hack and slash", "g-fighting": "Luta", "g-fps": "FPS", "g-tps": "Tiro em 3ª pessoa", "g-survival": "Sobrevivência", "g-simulation": "Simulação", "g-platformer": "Plataforma", "g-platformer2d": "Plataforma 2D", "g-platformer3d": "Plataforma 3D", "g-precision": "Plataforma de precisão", "g-openworld": "Mundo aberto", "g-parkour": "Parkour", "g-tactical": "Tático", "g-stealth": "Furtividade", "g-rhythm": "Ritmo", "g-indie": "Indie", "g-narrative": "Narrativo", "g-visualnovel": "Visual novel", "g-mmo": "MMO", "g-coop": "Cooperativo", "g-soulslike": "Soulslike", "compass": "Bússola (exploração)", "crosshair": "Mira (tiro)", "ball": "Bola (esportes)", "pawn": "Peão (estratégia)", "dice": "Dado (roguelike)", "car": "Carro (corrida)", "c-atari": "Atari", "c-nes": "NES / Famicom", "c-mastersystem": "Master System", "c-snes": "Super Nintendo", "c-megadrive": "Mega Drive", "c-ps1": "PlayStation", "c-saturn": "Saturn", "c-n64": "Nintendo 64", "c-dreamcast": "Dreamcast", "c-ps2": "PlayStation 2", "c-gamecube": "GameCube", "c-xbox": "Xbox", "c-ps3": "PlayStation 3", "c-xbox360": "Xbox 360", "c-wii": "Wii", "c-wiiu": "Wii U", "c-ps4": "PlayStation 4", "c-xboxone": "Xbox One", "c-switch": "Switch", "c-ps5": "PlayStation 5", "c-xseries": "Xbox Series", "c-arcade": "Fliperama", "c-pc": "PC (gabinete)", "c-laptop": "Notebook", "c-vr": "Realidade virtual", "c-tv": "TV", "h-gameboy": "Game Boy", "h-gamegear": "Game Gear", "h-gba": "Game Boy Advance", "h-ds": "Nintendo DS", "h-3ds": "Nintendo 3DS", "h-psp": "PSP", "h-vita": "PS Vita", "h-switchlite": "Switch Lite", "h-deck": "Steam Deck", "h-tablet": "Tablet", "b-playstation": "PlayStation", "b-xbox": "Xbox", "b-nintendo": "Nintendo", "b-steam": "Steam", "b-gog": "GOG", "b-epic": "Epic Games", "b-retro": "RetroAchievements (controle retrô)", "b-googleplay": "Google Play Games", rocket: "Foguete", planet: "Planeta", ufo: "Disco voador", robot: "Robô", castle: "Castelo", city: "Cidade", swords: "Espadas", bow: "Arco", wand: "Varinha", potion: "Poção", key: "Chave", bomb: "Bomba", hammer: "Martelo", mushroom: "Cogumelo", invader: "Invasor 8-bit", headphones: "Fones", camera: "Câmera", paw: "Pata", anchor: "Âncora", feather: "Pena", tree: "Árvore", sun: "Sol", snowflake: "Neve", wave: "Ondas", heartbeat: "Coração acelerado", flame: "Chama", ghost: "Fantasma", skull: "Caveira", sword: "Espada", shield: "Escudo", crown: "Coroa", map: "Mapa", mountain: "Montanha", leaf: "Folha", bolt: "Raio", puzzle: "Quebra-cabeça", trophy: "Troféu", medal: "Medalha", gem: "Joia", star: "Estrela", sparkles: "Brilho", heart: "Coração", eye: "Olho", bulb: "Ideia", music: "Música", film: "Filme", books: "Livros", masks: "Máscaras", moon: "Lua", clock: "Relógio", calendar: "Calendário", flag: "Bandeira", target: "Alvo", layers: "Camadas", monitor: "Computador", smartphone: "Celular", handheld: "Portátil", gamepad: "Controle", joystick: "Joystick", vault: "Cofre" };
		return n[i] || i.replace(/^[ch]-/, "").replace(/^./, c => c.toUpperCase());
	}

	platformDefaults(name) {
		const k = String(name || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
		const T = {
			pc: ["PC", "#4f8df7", "monitor", null, "", "pc"], windows: ["PC", "#4f8df7", "monitor", null, "", "pc"], steam: ["Valve", "#66c0f4", "b-steam", null, "", "pc"], gog: ["GOG", "#b98cf2", "b-gog", null, "", "pc"], epic: ["Epic Games", "#c9ccd2", "b-epic", null, "", "pc"], epicgames: ["Epic Games", "#c9ccd2", "b-epic", null, "", "pc"], steamdeck: ["Valve", "#7b61ff", "h-deck", 2022, "", "handheld"],
			ps1: ["Sony", "#3e6fd8", "c-ps1", 1994, "5ª geração", "home"], playstation: ["Sony", "#3e6fd8", "c-ps1", 1994, "5ª geração", "home"], psx: ["Sony", "#3e6fd8", "c-ps1", 1994, "5ª geração", "home"],
			ps2: ["Sony", "#2353b8", "c-ps2", 2000, "6ª geração", "home"], playstation2: ["Sony", "#2353b8", "c-ps2", 2000, "6ª geração", "home"],
			ps3: ["Sony", "#1d3f91", "c-ps3", 2006, "7ª geração", "home"], playstation3: ["Sony", "#1d3f91", "c-ps3", 2006, "7ª geração", "home"],
			ps4: ["Sony", "#0b3fa8", "c-ps4", 2013, "8ª geração", "home"], playstation4: ["Sony", "#0b3fa8", "c-ps4", 2013, "8ª geração", "home"],
			ps5: ["Sony", "#3a6df0", "c-ps5", 2020, "9ª geração", "home"], playstation5: ["Sony", "#3a6df0", "c-ps5", 2020, "9ª geração", "home"],
			psp: ["Sony", "#5b6b8c", "h-psp", 2004, "7ª geração", "handheld"], psvita: ["Sony", "#2c4fa3", "h-vita", 2011, "8ª geração", "handheld"], vita: ["Sony", "#2c4fa3", "h-vita", 2011, "8ª geração", "handheld"],
			nes: ["Nintendo", "#c8312f", "c-nes", 1983, "3ª geração", "home"], famicom: ["Nintendo", "#c8312f", "c-nes", 1983, "3ª geração", "home"],
			snes: ["Nintendo", "#6b4fc4", "c-snes", 1990, "4ª geração", "home"], supernintendo: ["Nintendo", "#6b4fc4", "c-snes", 1990, "4ª geração", "home"],
			n64: ["Nintendo", "#2f9d57", "c-n64", 1996, "5ª geração", "home"], nintendo64: ["Nintendo", "#2f9d57", "c-n64", 1996, "5ª geração", "home"],
			gamecube: ["Nintendo", "#6a4fc9", "c-gamecube", 2001, "6ª geração", "home"], gc: ["Nintendo", "#6a4fc9", "c-gamecube", 2001, "6ª geração", "home"],
			wii: ["Nintendo", "#25a8e0", "c-wii", 2006, "7ª geração", "home"], wiiu: ["Nintendo", "#1d95c9", "c-wiiu", 2012, "8ª geração", "home"],
			switch: ["Nintendo", "#e60012", "c-switch", 2017, "8ª geração", "hybrid"], nintendoswitch: ["Nintendo", "#e60012", "c-switch", 2017, "8ª geração", "hybrid"], 
			gb: ["Nintendo", "#8b956d", "h-gameboy", 1989, "4ª geração", "handheld"], gameboy: ["Nintendo", "#8b956d", "h-gameboy", 1989, "4ª geração", "handheld"],
			gbc: ["Nintendo", "#7a3fbf", "h-gameboy", 1998, "5ª geração", "handheld"], gameboycolor: ["Nintendo", "#7a3fbf", "h-gameboy", 1998, "5ª geração", "handheld"],
			gba: ["Nintendo", "#4b3fbf", "h-gba", 2001, "6ª geração", "handheld"], gameboyadvance: ["Nintendo", "#4b3fbf", "h-gba", 2001, "6ª geração", "handheld"],
			nds: ["Nintendo", "#8a96a3", "h-ds", 2004, "7ª geração", "handheld"], ds: ["Nintendo", "#8a96a3", "h-ds", 2004, "7ª geração", "handheld"], nintendods: ["Nintendo", "#8a96a3", "h-ds", 2004, "7ª geração", "handheld"],
			"3ds": ["Nintendo", "#d1232a", "h-3ds", 2011, "8ª geração", "handheld"], n3ds: ["Nintendo", "#d1232a", "h-3ds", 2011, "8ª geração", "handheld"], nintendo3ds: ["Nintendo", "#d1232a", "h-3ds", 2011, "8ª geração", "handheld"],
			xbox: ["Microsoft", "#2f9e2f", "c-xbox", 2001, "6ª geração", "home"], xbox360: ["Microsoft", "#5cb82f", "c-xbox360", 2005, "7ª geração", "home"],
			xboxone: ["Microsoft", "#107c10", "c-xboxone", 2013, "8ª geração", "home"], xboxseries: ["Microsoft", "#0e7a0d", "c-xseries", 2020, "9ª geração", "home"], xboxseriesx: ["Microsoft", "#0e7a0d", "c-xseries", 2020, "9ª geração", "home"], xboxseriess: ["Microsoft", "#0e7a0d", "c-xseries", 2020, "9ª geração", "home"],
			mastersystem: ["Sega", "#d33a3a", "c-mastersystem", 1985, "3ª geração", "home"], megadrive: ["Sega", "#2a63c9", "c-megadrive", 1988, "4ª geração", "home"], genesis: ["Sega", "#2a63c9", "c-megadrive", 1988, "4ª geração", "home"],
			saturn: ["Sega", "#4d5fa8", "c-saturn", 1994, "5ª geração", "home"], dreamcast: ["Sega", "#f26b21", "c-dreamcast", 1998, "6ª geração", "home"], gamegear: ["Sega", "#3b3f4a", "h-gamegear", 1990, "4ª geração", "handheld"],
			switch2: ["Nintendo", "#e60012", "c-switch2", 2025, "9\u00aa gera\u00e7\u00e3o", "hybrid"], nintendoswitch2: ["Nintendo", "#e60012", "c-switch2", 2025, "9\u00aa gera\u00e7\u00e3o", "hybrid"], virtualboy: ["Nintendo", "#d0021b", "c-virtualboy", 1995, "5\u00aa gera\u00e7\u00e3o", "home"], segacd: ["Sega", "#2a63c9", "c-segacd", 1991, "4\u00aa gera\u00e7\u00e3o", "home"], megacd: ["Sega", "#2a63c9", "c-segacd", 1991, "4\u00aa gera\u00e7\u00e3o", "home"], "32x": ["Sega", "#c8312f", "c-32x", 1994, "4\u00aa gera\u00e7\u00e3o", "home"], sega32x: ["Sega", "#c8312f", "c-32x", 1994, "4\u00aa gera\u00e7\u00e3o", "home"], neogeo: ["SNK", "#c9a227", "c-neogeo", 1990, "4\u00aa gera\u00e7\u00e3o", "home"], neogeoaes: ["SNK", "#c9a227", "c-neogeo", 1990, "4\u00aa gera\u00e7\u00e3o", "home"], pcengine: ["NEC", "#e8742a", "c-pcengine", 1987, "4\u00aa gera\u00e7\u00e3o", "home"], turbografx: ["NEC", "#e8742a", "c-pcengine", 1987, "4\u00aa gera\u00e7\u00e3o", "home"], turbografx16: ["NEC", "#e8742a", "c-pcengine", 1987, "4\u00aa gera\u00e7\u00e3o", "home"], tg16: ["NEC", "#e8742a", "c-pcengine", 1987, "4\u00aa gera\u00e7\u00e3o", "home"], lynx: ["Atari", "#d35400", "h-lynx", 1989, "4\u00aa gera\u00e7\u00e3o", "handheld"], atarilynx: ["Atari", "#d35400", "h-lynx", 1989, "4\u00aa gera\u00e7\u00e3o", "handheld"], jaguar: ["Atari", "#b71c1c", "c-jaguar", 1993, "5\u00aa gera\u00e7\u00e3o", "home"], atarijaguar: ["Atari", "#b71c1c", "c-jaguar", 1993, "5\u00aa gera\u00e7\u00e3o", "home"], atari: ["Atari", "#b5651d", "c-atari", 1977, "2\u00aa gera\u00e7\u00e3o", "home"], atari2600: ["Atari", "#b5651d", "c-atari", 1977, "2\u00aa gera\u00e7\u00e3o", "home"], "3do": ["Panasonic", "#5c6bc0", "c-3do", 1993, "5\u00aa gera\u00e7\u00e3o", "home"], wonderswan: ["Bandai", "#7e57c2", "h-wonderswan", 1999, "5\u00aa gera\u00e7\u00e3o", "handheld"], wonderswancolor: ["Bandai", "#7e57c2", "h-wonderswan", 2000, "5\u00aa gera\u00e7\u00e3o", "handheld"], psportal: ["Sony", "#3a6df0", "h-portal", 2023, "9\u00aa gera\u00e7\u00e3o", "handheld"], playstationportal: ["Sony", "#3a6df0", "h-portal", 2023, "9\u00aa gera\u00e7\u00e3o", "handheld"], quest: ["Meta", "#1c6ef2", "c-quest", 2019, "", "vr"], metaquest: ["Meta", "#1c6ef2", "c-quest", 2019, "", "vr"], oculusquest: ["Meta", "#1c6ef2", "c-quest", 2019, "", "vr"], rogally: ["ASUS", "#0e7a0d", "h-ally", 2023, "", "handheld"], xboxally: ["Microsoft", "#0e7a0d", "h-ally", 2025, "", "handheld"], rogxboxally: ["Microsoft", "#0e7a0d", "h-ally", 2025, "", "handheld"], arcade: ["Arcade", "#e5a50a", "c-arcade", null, "", "home"], mame: ["Arcade", "#e5a50a", "c-arcade", null, "", "home"],
			android: ["Mobile", "#3ddc84", "smartphone", null, "", "mobile"], ios: ["Mobile", "#9aa4b2", "smartphone", null, "", "mobile"], mobile: ["Mobile", "#3ddc84", "smartphone", null, "", "mobile"], iphone: ["Mobile", "#9aa4b2", "smartphone", null, "", "mobile"]
		};
		const r = T[k];
		return r ? { maker: r[0], color: r[1], icon: r[2], year: r[3], gen: r[4], form: r[5] } : null;
	}

	genreDefaults(name) {
		const k = String(name || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
		const T = {
			acao: ["#ff7a45", "g-action", "Reflexo e adrenalina"], action: ["#ff7a45", "g-action", "Reflexo e adrenalina"],
			aventura: ["#2bb3a3", "g-adventure", "Uma jornada para viver"], adventure: ["#2bb3a3", "g-adventure", "Uma jornada para viver"], acaoaventura: ["#ff8f3d", "g-actionadventure", "Ação com história para contar"], actionadventure: ["#ff8f3d", "g-actionadventure", "Ação com história para contar"],
			sandbox: ["#4a90e2", "g-sandbox", "O mundo é seu para bagunçar"], metroidvanias: ["#5c6bc0", "g-metroidvania", "Voltar com a habilidade nova"],
			rpg: ["#a970ff", "g-rpg", "Outra vida para viver"], jrpg: ["#b982ff", "g-jrpg", "Grupo, turnos e grandes jornadas"], arpg: ["#9a63f2", "g-arpg", "Atributos e reflexo"],
			horror: ["#c0392b", "ghost", "Luz apagada, coração acelerado"], terror: ["#c0392b", "ghost", "Luz apagada, coração acelerado"],
			survivalhorror: ["#8e1b1b", "skull", "Pouca munição, muito medo"], sobrevivencia: ["#6d8f3b", "g-survival", "Cada recurso conta"], survival: ["#6d8f3b", "g-survival", "Cada recurso conta"],
			plataforma: ["#3fbf6f", "g-platformer", "O pulo perfeito"], platformer: ["#3fbf6f", "g-platformer", "O pulo perfeito"], plataforma2d: ["#45c87a", "g-platformer2d", "Clássico, de lado"], plataforma3d: ["#2fae8a", "g-platformer3d", "Mundo aberto para pular"],
			precisionplatformers: ["#16c79a", "g-precision", "Um pixel de diferença"], precisionplatformer: ["#16c79a", "g-precision", "Um pixel de diferença"],
			
			metroidvania: ["#5c6bc0", "g-metroidvania", "Voltar com a habilidade nova"],
			parkour: ["#00bcd4", "g-parkour", "De telhado em telhado"], hackslash: ["#d35400", "g-hackslash", "Combo atrás de combo"], hackandslash: ["#d35400", "g-hackslash", "Combo atrás de combo"],
			luta: ["#e67e22", "g-fighting", "Leitura e tempo de reação"], fighting: ["#e67e22", "g-fighting", "Leitura e tempo de reação"],
			tiro: ["#8fa3b8", "crosshair", "Mira e posicionamento"], shooter: ["#8fa3b8", "crosshair", "Mira e posicionamento"], fps: ["#8fa3b8", "g-fps", "Mira e posicionamento"], tps: ["#8fa3b8", "g-tps", "Mira e posicionamento"],
			corrida: ["#e94b3c", "car", "Freada no último segundo"], racing: ["#e94b3c", "car", "Freada no último segundo"],
			esporte: ["#2ecc71", "ball", "Competição e torcida"], esportes: ["#2ecc71", "ball", "Competição e torcida"], sports: ["#2ecc71", "ball", "Competição e torcida"],
			estrategia: ["#4a90e2", "pawn", "Pensar três jogadas à frente"], strategy: ["#4a90e2", "pawn", "Pensar três jogadas à frente"], rts: ["#4a90e2", "pawn", "Pensar três jogadas à frente"],
			simulacao: ["#7cb342", "g-simulation", "Uma rotina para chamar de sua"], simulation: ["#7cb342", "g-simulation", "Uma rotina para chamar de sua"],
			roguelike: ["#9b59b6", "dice", "Mais uma tentativa"], roguelite: ["#9b59b6", "dice", "Mais uma tentativa"],
			stealth: ["#546e7a", "g-stealth", "Nas sombras"], furtividade: ["#546e7a", "g-stealth", "Nas sombras"],
			musica: ["#ec407a", "g-rhythm", "No ritmo"], ritmo: ["#ec407a", "g-rhythm", "No ritmo"], rhythm: ["#ec407a", "g-rhythm", "No ritmo"],
			indie: ["#ff6f91", "g-indie", "Ideias grandes de equipes pequenas"], narrativo: ["#8d6e63", "g-narrative", "A história em primeiro lugar"], narrative: ["#8d6e63", "g-narrative", "A história em primeiro lugar"],
			mundoaberto: ["#43a047", "g-openworld", "Para onde a vista alcança"], openworld: ["#43a047", "g-openworld", "Para onde a vista alcança"],
			soulslike: ["#a1887f", "g-soulslike", "Morrer, aprender, vencer"], tatico: ["#5c7cfa", "g-tactical", "Cada movimento importa"], tactical: ["#5c7cfa", "g-tactical", "Cada movimento importa"],
			cooperativo: ["#29b6f6", "g-coop", "Melhor em dupla"], coop: ["#29b6f6", "g-coop", "Melhor em dupla"],
			visualnovel: ["#b48ead", "g-visualnovel", "Ler, escolher e seguir"], novelavisual: ["#b48ead", "g-visualnovel", "Ler, escolher e seguir"],
			mmorpg: ["#5e81ac", "g-mmo", "Um mundo cheio de gente"], mmo: ["#5e81ac", "g-mmo", "Um mundo cheio de gente"],
			puzzle: ["#f2c14e", "g-puzzle", "A cabeça trabalhando"], quebracabeca: ["#f2c14e", "g-puzzle", "A cabeça trabalhando"], exploracao: ["#26a69a", "g-exploration", "Ver o que tem depois do mapa"], exploration: ["#26a69a", "g-exploration", "Ver o que tem depois do mapa"], battleroyale: ["#ef6c00", "g-battleroyale", "Só um fica de pé"], cozy: ["#d7a86e", "g-cozy", "Sem pressa"], aconchegante: ["#d7a86e", "g-cozy", "Sem pressa"], cartas: ["#8e44ad", "g-cards", "Cada carta muda a partida"], cardgame: ["#8e44ad", "g-cards", "Cada carta muda a partida"], deckbuilder: ["#8e44ad", "g-cards", "Cada carta muda a partida"], deckbuilding: ["#8e44ad", "g-cards", "Cada carta muda a partida"], towerdefense: ["#607d8b", "g-towerdefense", "Ninguém passa da muralha"], pointandclick: ["#8d6e63", "g-pointclick", "Olhar, clicar, descobrir"], pointclick: ["#8d6e63", "g-pointclick", "Olhar, clicar, descobrir"], beatemup: ["#e53935", "g-beatemup", "Rua cheia, punhos prontos"], brigaderua: ["#e53935", "g-beatemup", "Rua cheia, punhos prontos"], shmup: ["#29b6f6", "g-shmup", "Desviar de tudo, atirar em tudo"], shootemup: ["#29b6f6", "g-shmup", "Desviar de tudo, atirar em tudo"], navinha: ["#29b6f6", "g-shmup", "Desviar de tudo, atirar em tudo"], fazenda: ["#7cb342", "g-farming", "Plantar, colher, repetir"], farming: ["#7cb342", "g-farming", "Plantar, colher, repetir"], citybuilder: ["#42a5f5", "g-citybuilder", "Uma cidade inteira nas mãos"], construcaodecidades: ["#42a5f5", "g-citybuilder", "Uma cidade inteira nas mãos"], terrorpsicologico: ["#6a1b9a", "g-psychorror", "O medo vem de dentro"], horrorpsicologico: ["#6a1b9a", "g-psychorror", "O medo vem de dentro"], psychologicalhorror: ["#6a1b9a", "g-psychorror", "O medo vem de dentro"],
		};
		const r = T[k];
		return r ? { color: r[0], icon: r[1], mood: r[2] } : null;
	}

	// identidade final: o que a pessoa definiu na nota, senão o padrão
	ident(ctx, kind, name, page) {
		const { C, U } = ctx;
		const d = kind === "platform" ? this.platformDefaults(name) : kind === "genre" || kind === "subgenre" ? this.genreDefaults(name) : null;
		const hue = C.hashHue(name || "");
		const icon = page?.iconImage ? `img:${page.iconImage}` : page?.icon && U.paths[page.icon] ? page.icon : d?.icon || ({ platform: "monitor", genre: "gamepad", subgenre: "tag" }[kind] || "film");
		return {
			color: page?.accent || d?.color || `hsl(${hue} 62% 56%)`,
			icon,
			maker: page?.maker || d?.maker || (kind === "platform" ? "Outros" : ""),
			year: page?.year || d?.year || null,
			gen: page?.generation || d?.gen || "",
			form: d?.form || "",
			mood: d?.mood || ""
		};
	}

	// identidade como estilo inline: --sv-id (cor) e --sv-id-rgb para fundos
	identStyle(color) {
		// a cor vem de nota: só #hex/hsl() chegam ao atributo style
		return `--sv-id:${customJS.SteamVaultCore.safeColor(color, "var(--sv-blue)")}`;
	}

	// navegação anterior/próximo entre itens do mesmo hub
	pager(ctx, kind, names, current, pages) {
		const { U, C } = ctx;
		const i = names.findIndex(n => C.normalizeKey(n) === C.normalizeKey(current));
		if (i < 0 || names.length < 2) return "";
		const prev = names[(i - 1 + names.length) % names.length], next = names[(i + 1) % names.length];
		const link = (n, dir) => `<a class="sv-pager-link is-${dir}" ${U.catAttrs(kind, n, pages.get(C.normalizeKey(n)))}>${U.icon(dir === "prev" ? "chevronLeft" : "chevronRight")}<span><small>${dir === "prev" ? "Anterior" : "Próximo"}</small><b>${U.esc(n)}</b></span></a>`;
		// só dois itens: anterior e próximo seriam o mesmo — um botão só
		if (prev === next) return `<nav class="sv-pager is-single" aria-label="Navegar">${link(next, "next")}</nav>`;
		return `<nav class="sv-pager" aria-label="Navegar">${link(prev, "prev")}${link(next, "next")}</nav>`;
	}

	// barra de busca e ordenação dos hubs (filtra os cards já desenhados)
	hubBar(ctx, { placeholder, sorts }) {
		const { U } = ctx;
		return `<div class="sv-hubbar">
			<label class="sv-hubbar-search">${U.icon("search")}<input type="search" placeholder="${U.attr(placeholder)}" data-hub-q aria-label="${U.attr(placeholder)}"></label>
			<div class="sv-segmented sv-hubbar-sort" role="radiogroup" aria-label="Ordenar">${sorts.map(([k, l], i) => `<button type="button" role="radio" class="${i ? "" : "is-active"}" data-hub-sort="${k}" aria-checked="${!i}">${U.esc(l)}</button>`).join("")}</div>
		</div>`;
	}

	wireHubBar(root) {
		const q = root.querySelector("[data-hub-q]");
		const lists = [...root.querySelectorAll("[data-hub-list]")];
		if (!lists.length) return;
		let sort = root.querySelector("[data-hub-sort].is-active")?.dataset.hubSort || "";
		const apply = () => {
			const term = (q?.value || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
			for (const list of lists) {
				const items = [...list.querySelectorAll(":scope > [data-hub-item]")];
				items.sort((a, b) => sort === "name" ? a.dataset.name.localeCompare(b.dataset.name) : (Number(b.dataset[sort] || 0) - Number(a.dataset[sort] || 0)) || a.dataset.name.localeCompare(b.dataset.name));
				let shown = 0;
				for (const el of items) {
					const hit = !term || el.dataset.key.includes(term);
					el.hidden = !hit; if (hit) shown++;
					list.appendChild(el);
				}
				const group = list.closest("[data-hub-group]");
				if (group) group.hidden = !shown;
			}
			const empty = root.querySelector("[data-hub-empty]");
			if (empty) empty.hidden = lists.some(l => l.querySelector(":scope > [data-hub-item]:not([hidden])"));
		};
		q?.addEventListener("input", apply);
		root.querySelectorAll("[data-hub-sort]").forEach(b => b.addEventListener("click", () => {
			sort = b.dataset.hubSort;
			root.querySelectorAll("[data-hub-sort]").forEach(x => { const on = x === b; x.classList.toggle("is-active", on); x.setAttribute("aria-checked", String(on)); });
			apply();
		}));
	}

	hubKey(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }

	// barra empilhada de status (Jogando, Pausado, Backlog, Zerado…)
	statusBar(ctx, games) {
		const { U, C } = ctx;
		if (!games.length) return "";
		const tones = { Playing: "var(--sv-blue)", Paused: "var(--sv-amber, #e9bd52)", Backlog: "var(--sv-muted)", Completed: "var(--sv-green)", Dropped: "var(--sv-red)", Wishlist: "color-mix(in srgb, var(--sv-muted) 55%, transparent)" };
		const groups = [...C.groupBy(games, g => g.status)].sort((a, b) => (C.statusDefs[a[0]]?.order ?? 9) - (C.statusDefs[b[0]]?.order ?? 9));
		return `<div class="sv-statusbar">
			<div class="sv-stackbar" role="img" aria-label="Jogos por status">${groups.map(([k, l]) => `<span style="flex:${l.length};background:${tones[k] || "var(--sv-muted)"}" title="${U.attr(C.statusLabel(k))}: ${l.length}"></span>`).join("")}</div>
			<ul class="sv-statusbar-legend">${groups.map(([k, l]) => `<li><i style="background:${tones[k] || "var(--sv-muted)"}"></i>${U.esc(C.statusLabel(k))}<b>${l.length}</b></li>`).join("")}</ul>
		</div>`;
	}

	// leque de capas (identidade das franquias e plataformas)
	coverFan(ctx, games, n = 4) {
		const { U } = ctx;
		const list = games.slice(0, n);
		if (!list.length) return "";
		return `<div class="sv-fan sv-fan--${list.length}">${list.map((g, i) => `<span style="--i:${i}">${U.cover(g)}</span>`).join("")}</div>`;
	}

	identityBtn(ctx, kind, name, page) {
		const { U } = ctx;
		return U.btn("Editar identidade", { icon: "edit", kind: "glass", action: "identity-edit", attrs: `data-kind="${kind}" data-name="${U.attr(name)}" data-path="${U.attr(page?.path || "")}"` });
	}

	// 3.57.0: card de categoria (gêneros e subgêneros). A cor vem da arte dos
	// próprios jogos (faixa no topo, com a capa desfocada ao fundo); a cor da
	// categoria fica só no ícone.
	catTile(ctx, x, { kind, page, id, sub = "", key = "", score = 0 }) {
		const { U, C } = ctx;
		const s = C.groupStats(x.games);
		const rated = x.games.filter(g => g.rating > 0);
		const bg = x.games.map(g => g.images.cover).find(Boolean) || "";
		return `<a class="sv-gtile${kind === "subgenre" ? " sv-gtile--sub" : ""}" ${U.catAttrs(kind, x.name, page)} style="${this.identStyle(id.color)}" data-hub-item data-name="${U.attr(x.name)}" data-key="${U.attr(this.hubKey(`${x.name} ${key}`))}" data-games="${s.count}" data-hours="${s.hours}" data-rating="${rated.length ? rated.reduce((t, g) => t + g.rating, 0) / rated.length : 0}" data-score="${score}">
			<div class="sv-gtile-art">${bg ? `<img class="sv-gtile-bg" src="${U.attr(bg)}" alt="" loading="lazy" decoding="async" data-sv-img>` : ""}<div class="sv-gtile-covers">${x.games.slice(0, 3).map(g => U.cover(g)).join("")}</div></div>
			<div class="sv-gtile-body">
				<span class="sv-gtile-head"><span class="sv-gtile-icon">${U.icon(id.icon)}</span><strong>${U.esc(x.name)}</strong></span>
				${sub ? `<em>${U.esc(sub)}</em>` : ""}
				<span class="sv-gtile-meta"><span>${U.plural(s.count, "jogo", "jogos")}</span><span>${U.fmtHours(s.hours)}</span></span>
			</div>
		</a>`;
	}

	// ========================================================== PLATAFORMAS
	platforms(ctx) {
		const { U, C, model } = ctx;
		const groups = C.groupBy(model.games, g => g.platform);
		const pages = new Map(model.platforms.map(p => [C.normalizeKey(p.title), p]));
		const list = [...groups].filter(([n]) => n).sort((a, b) => b[1].length - a[1].length);
		const empty = model.platforms.filter(p => !groups.has(p.title));
		const order = ["PC", "Sony", "Nintendo", "Microsoft", "Sega", "Valve", "Mobile", "Outros"];
		const byMaker = new Map();
		for (const [name, games] of list) {
			const page = pages.get(C.normalizeKey(name)), id = this.ident(ctx, "platform", name, page);
			if (!byMaker.has(id.maker)) byMaker.set(id.maker, []);
			byMaker.get(id.maker).push({ name, games, page, id });
		}
		const makers = [...byMaker].sort((a, b) => ((order.indexOf(a[0]) + 1) || 99) - ((order.indexOf(b[0]) + 1) || 99));
		const top = list[0];
		const card = ({ name, games, page, id }) => {
			const s = C.groupStats(games);
			const rated = games.filter(g => g.rating > 0);
			const art = page?.cover ? `<img class="sv-pcard-art" src="${U.attr(page.cover)}" alt="" data-sv-img>` : "";
			const era = [id.year, id.gen].filter(Boolean).map(x => U.esc(x)).join(" · ");
			return `<a class="sv-pcard is-${id.form || "other"}" ${U.catAttrs("platform", name, page)} style="${this.identStyle(id.color)}" data-hub-item data-name="${U.attr(name)}" data-key="${U.attr(this.hubKey(`${name} ${id.maker}`))}" data-games="${s.count}" data-hours="${s.hours}" data-rating="${rated.length ? rated.reduce((a, g) => a + g.rating, 0) / rated.length : 0}">
				${art}
				<div class="sv-pcard-info">
					<div class="sv-pcard-head"><span class="sv-pcard-badge">${U.icon(id.icon)}</span><span class="sv-pcard-title"><strong class="sv-pcard-name">${U.esc(name)}</strong>${era ? `<small class="sv-pcard-era">${era}</small>` : ""}</span></div>
					<span class="sv-pcard-meta"><span>${U.plural(s.count, "jogo", "jogos")}</span><span>${U.fmtHours(s.hours)}</span><span>${s.completionPct}% zerados</span></span>
					<span class="sv-pcard-bar" role="img" aria-label="${s.completionPct}% zerados"><span style="width:${s.completionPct}%"></span></span>
				</div>
				<div class="sv-pcard-shelf" aria-hidden="true">${games.slice(0, 4).map(g => U.cover(g)).join("")}</div>
			</a>`;
		};
		const total = C.groupStats(model.games.filter(g => g.platform));
		const html = `<div class="sv-page sv-pad sv-hubpage sv-hubpage--platforms">
			${U.pageHead("Plataformas", { sub: U.plural(list.length, "plataforma com jogos", "plataformas com jogos"), actions: `${U.btn("Nova plataforma", { icon: "plus", action: "legacy", attrs: 'data-legacy="addPlatform"' })}${U.btn("", { icon: "refresh", action: "legacy", attrs: 'data-legacy="syncCategories"', title: "Criar páginas que faltam" })}` })}
			${list.length ? `<div class="sv-hubsum">
				<div><b>${list.length}</b><span>${list.length === 1 ? "plataforma" : "plataformas"}</span></div>
				<div><b>${byMaker.size}</b><span>${byMaker.size === 1 ? "fabricante" : "fabricantes"}</span></div>
				<div><b>${U.fmtHours(total.hours)}</b><span>jogadas</span></div>
				${top ? `<div class="is-wide"><b>${U.esc(top[0])}</b><span>a mais usada · ${U.plural(top[1].length, "jogo", "jogos")}</span></div>` : ""}
			</div>
			${list.length > 3 ? this.hubBar(ctx, { placeholder: "Buscar plataforma", sorts: [["games", "Jogos"], ["hours", "Horas"], ["name", "Nome"]] }) : ""}
			${makers.map(([maker, items]) => `<section class="sv-makergroup" data-hub-group>
				<header class="sv-makerhead"><h2>${U.esc(maker)}</h2><span class="sv-count">${items.length}</span></header>
				<div class="sv-pcards" data-hub-list>${items.map(card).join("")}</div>
			</section>`).join("")}
			<p class="sv-hub-noresult" data-hub-empty hidden>Nenhuma plataforma com esse nome.</p>`
			: U.empty({ icon: "monitor", title: "Nenhum jogo com plataforma", text: "Preencha a plataforma nos detalhes de um jogo para ver o hub." })}
			${empty.length ? `<details class="sv-hubmore"><summary>${U.icon("chevronRight")}Sem jogos ainda <span class="sv-count">${empty.length}</span></summary><div class="sv-chiplinks">${empty.map(p => { const id = this.ident(ctx, "platform", p.title, p); return `<a class="sv-chiplink" ${U.openAttrs(p.path)} style="${this.identStyle(id.color)}">${U.icon(id.icon)}${U.esc(p.title)}</a>`; }).join("")}</div></details>` : ""}
		</div>`;
		return { active: "platforms", html, wire: root => this.wireHubBar(root) };
	}

	platform(ctx) {
		const { U, C, model, current } = ctx;
		const title = C.str(current.title) || current.file.name;
		const pages = new Map(model.platforms.map(p => [C.normalizeKey(p.title), p]));
		const page = pages.get(C.normalizeKey(title)) || model.platforms.find(p => p.path === current.file.path);
		const id = this.ident(ctx, "platform", title, page);
		const games = model.games.filter(g => C.normalizeKey(g.platform) === C.normalizeKey(title));
		const s = C.groupStats(games);
		const byHours = [...games].sort((a, b) => b.playtime.hours - a.playtime.hours);
		const byAdded = [...games].filter(g => g.dateAdded).sort((a, b) => a.dateAdded.localeCompare(b.dateAdded));
		const first = byAdded[0], last = byAdded[byAdded.length - 1];
		const genreHours = new Map();
		for (const g of games) for (const ge of g.genres) genreHours.set(ge, (genreHours.get(ge) || 0) + g.playtime.hours);
		const topGenres = [...genreHours].sort((a, b) => b[1] - a[1]).slice(0, 5);
		const shelfOrder = [...games].sort((a, b) => (C.statusDefs[a.status]?.order ?? 9) - (C.statusDefs[b.status]?.order ?? 9) || b.playtime.hours - a.playtime.hours);
		const names = [...C.groupBy(model.games, g => g.platform)].filter(([n]) => n).sort((a, b) => b[1].length - a[1].length).map(([n]) => n);
		const showMaker = id.maker && id.maker !== "Outros" && C.normalizeKey(id.maker) !== C.normalizeKey(title);
		const kicker = [showMaker ? id.maker : (id.form === "pc" ? "Computador" : "Plataforma"), id.year, id.gen].filter(Boolean).join(" · ");
		const highlight = (label, g, value) => g ? `<a class="sv-hl" ${U.openAttrs(g.path)}>${U.cover(g, { cls: "sv-cover--xs" })}<span><small>${U.esc(label)}</small><b>${U.esc(g.title)}</b><em>${U.esc(value)}</em></span></a>` : "";
		const html = `<div class="sv-page sv-idpage" style="${this.identStyle(id.color)}">
			<section class="sv-idhero sv-idhero--platform${page?.cover ? " has-art" : ""}">
				${page?.cover ? `<img class="sv-idhero-art" src="${U.attr(page.cover)}" alt="" data-sv-img>` : ""}
				<span class="sv-idhero-mark" aria-hidden="true">${U.icon(id.icon)}</span>
				<div class="sv-idhero-inner">
					<span class="sv-idhero-kicker"><span class="sv-idhero-badge">${U.icon(id.icon)}</span>${U.esc(kicker)}</span>
					<h1>${U.esc(title)}</h1>
					${C.str(current.description) ? `<p class="sv-idhero-desc">${U.esc(current.description)}</p>` : ""}
					${U.figures(this.statsFor(ctx, games))}
					<div class="sv-idhero-actions">${this.identityBtn(ctx, "platform", title, page || { path: current.file.path })}</div>
				</div>
			</section>
			<div class="sv-pad">
				${games.length ? `<section class="sv-block">
					${U.sectionHead("Estante", { count: games.length, sub: "Jogando primeiro, depois por tempo de jogo" })}
					<div class="sv-bookshelf">${shelfOrder.map(g => `<a class="sv-bookshelf-item is-${g.status.toLowerCase()}" ${U.openAttrs(g.path)} title="${U.attr(g.title)}">${U.cover(g)}<span class="sv-bookshelf-dot"></span></a>`).join("")}</div>
				</section>
				<section class="sv-block">${U.sectionHead("Por status")}${this.statusBar(ctx, games)}</section>
				<section class="sv-block">${U.sectionHead("Destaques")}
					<div class="sv-hls">
						${highlight("Mais jogado", byHours[0], U.fmtHours(byHours[0]?.playtime.hours || 0))}
						${highlight("Primeiro adicionado", first, first ? U.fmtDate(first.dateAdded) : "")}
						${last && last !== first ? highlight("Último adicionado", last, U.fmtDate(last.dateAdded)) : ""}
						${s.achPct !== null ? `<div class="sv-hl is-stat"><span class="sv-hl-ring">${U.ring(s.achPct, { size: 48, perfect: s.achPct === 100 })}</span><span><small>Conquistas</small><b>${U.fmtPct(s.achPct)}</b><em>${U.plural(s.perfect, "jogo 100%", "jogos 100%")}</em></span></div>` : ""}
					</div>
				</section>
				${topGenres.length ? `<section class="sv-block">${U.sectionHead("Gêneros mais jogados aqui")}${U.bars(topGenres.map(([n, h]) => ({ label: n, value: h, display: U.fmtHours(h) })))}</section>` : ""}`
				: U.empty({ icon: id.icon, title: "Nenhum jogo nesta plataforma ainda", text: "Os jogos aparecem aqui quando o campo Plataforma deles for igual a este nome." })}
				${this.pager(ctx, "platform", names, title, pages)}
			</div>
		</div>`;
		return { active: "platforms", html };
	}

	// ============================================================== GÊNEROS
	genreGroups(ctx) {
		const { C, model } = ctx;
		const groups = new Map();
		for (const g of model.games) for (const name of g.genres) {
			const k = C.normalizeKey(name);
			if (!groups.has(k)) groups.set(k, { name, games: [], sub: new Set() });
			groups.get(k).games.push(g);
			g.subgenres.forEach(s => groups.get(k).sub.add(s));
		}
		return [...groups.values()].sort((a, b) => b.games.length - a.games.length || a.name.localeCompare(b.name));
	}

	// afinidade (0–100): horas pesam mais; nota média e quanto você zera completam
	affinity(ctx, list) {
		const maxH = Math.max(1, ...list.map(x => x.games.reduce((s, g) => s + g.playtime.hours, 0)));
		return list.map(x => {
			const h = x.games.reduce((s, g) => s + g.playtime.hours, 0);
			const rated = x.games.filter(g => g.rating > 0);
			const rating = rated.length ? rated.reduce((s, g) => s + g.rating, 0) / rated.length / 5 : 0.5;
			const done = x.games.filter(g => g.status === "Completed").length / x.games.length;
			return { ...x, hours: h, score: Math.round((0.55 * (h / maxH) + 0.25 * rating + 0.2 * done) * 100) };
		}).sort((a, b) => b.score - a.score);
	}

	genres(ctx) {
		const { U, C, model } = ctx;
		const list = this.genreGroups(ctx);
		const pages = new Map(model.genres.map(p => [C.normalizeKey(p.title), p]));
		const aff = this.affinity(ctx, list);
		const fav = aff[0];
		const favId = fav ? this.ident(ctx, "genre", fav.name, pages.get(C.normalizeKey(fav.name))) : null;
		const subs = C.groupBy(model.games, g => g.subgenres.map(s => C.normalizeKey(s)));
		const subLabel = new Map();
		for (const g of model.games) for (const s of g.subgenres) if (!subLabel.has(C.normalizeKey(s))) subLabel.set(C.normalizeKey(s), s);
		const tile = x => {
			const page = pages.get(C.normalizeKey(x.name));
			const id = this.ident(ctx, "genre", x.name, page);
			return this.catTile(ctx, x, { kind: "genre", page, id, sub: id.mood, key: [...x.sub].join(" "), score: aff.find(y => y.name === x.name)?.score || 0 });
		};
		const html = `<div class="sv-page sv-pad sv-hubpage sv-hubpage--genres">
			${U.pageHead("Gêneros", { sub: `${U.plural(list.length, "gênero", "gêneros")}, ${U.plural(subs.size, "subgênero", "subgêneros")}`, actions: `${U.btn("Novo gênero", { icon: "plus", action: "legacy", attrs: 'data-legacy="addGenre"' })}${U.btn("", { icon: "refresh", action: "legacy", attrs: 'data-legacy="syncCategories"', title: "Criar páginas que faltam" })}` })}
			${fav ? `<section class="sv-dna" style="${this.identStyle(favId.color)}">
				<div class="sv-dna-head">
					<span class="sv-dna-kicker">Seu DNA gamer</span>
					<div class="sv-dna-fav"><span class="sv-dna-favicon">${U.icon(favId.icon)}</span><div><small>Gênero favorito</small><b>${U.esc(fav.name)}</b>${favId.mood ? `<em>${U.esc(favId.mood)}</em>` : ""}</div></div>
				</div>
				<ol class="sv-dna-bars">${aff.slice(0, 6).map(x => { const id = this.ident(ctx, "genre", x.name, pages.get(C.normalizeKey(x.name))); return `<li style="${this.identStyle(id.color)}"><span class="sv-dna-ico">${U.icon(id.icon)}</span><span class="sv-dna-name">${U.esc(x.name)}</span><span class="sv-dna-track"><span style="width:${x.score}%"></span></span><b>${x.score}</b></li>`; }).join("")}</ol>
				<p class="sv-dna-note">Afinidade de 0 a 100: horas jogadas, nota média e quanto você zera em cada gênero.</p>
			</section>` : ""}
			${list.length > 3 ? this.hubBar(ctx, { placeholder: "Buscar gênero", sorts: [["score", "Afinidade"], ["games", "Jogos"], ["hours", "Horas"], ["name", "Nome"]] }) : ""}
			${list.length ? `<div class="sv-gtiles" data-hub-list>${list.map(tile).join("")}</div><p class="sv-hub-noresult" data-hub-empty hidden>Nenhum gênero com esse nome.</p>` : U.empty({ icon: "masks", title: "Nenhum gênero ainda", text: "Preencha o gênero nos detalhes de um jogo." })}
			${subs.size ? `<section class="sv-block">${U.sectionHead("Subgêneros", { count: subs.size, sub: "Toque para ver os jogos de cada um", action: `<a class="sv-link" ${U.openAttrs("Dashboard/Subgêneros")}>Ver todos</a>` })}<div class="sv-chiplinks">${[...subs].sort((a, b) => b[1].length - a[1].length).map(([k, l]) => this.subChip(ctx, subLabel.get(k), l.length)).join("")}</div></section>` : ""}
		</div>`;
		return { active: "genres", html, wire: root => this.wireHubBar(root) };
	}

	genre(ctx) {
		const { U, C, model, current } = ctx;
		const title = C.str(current.title) || current.file.name;
		const key = C.normalizeKey(title);
		const pages = new Map(model.genres.map(p => [C.normalizeKey(p.title), p]));
		const page = pages.get(key) || model.genres.find(p => p.path === current.file.path);
		const id = this.ident(ctx, "genre", title, page);
		// jogos do gênero; uma página antiga usada só como subgênero ainda mostra os dela
		const byGenre = model.games.filter(g => g.genres.some(x => C.normalizeKey(x) === key));
		const games = byGenre.length ? byGenre : model.games.filter(g => g.subgenres.some(x => C.normalizeKey(x) === key));
		const s = C.groupStats(games);
		const rated = games.filter(g => g.rating > 0);
		const avgRating = rated.length ? rated.reduce((t, g) => t + g.rating, 0) / rated.length : null;
		const doneH = games.filter(g => g.status === "Completed" && g.playtime.hours > 0);
		const avgDone = doneH.length ? doneH.reduce((t, g) => t + g.playtime.hours, 0) / doneH.length : null;
		const best = [...games].sort((a, b) => (b.rating || 0) - (a.rating || 0) || b.playtime.hours - a.playtime.hours).slice(0, 5);
		const subsHere = C.groupBy(games, g => g.subgenres.filter(x => C.normalizeKey(x) !== key));
		const related = C.groupBy(games, g => g.genres.filter(x => C.normalizeKey(x) !== key));
		let next = [];
		try { next = ctx.X?.suggest ? ctx.X.suggest(model).filter(g => games.includes(g)).slice(0, 4) : []; } catch (_) { next = []; }
		if (!next.length) next = games.filter(g => ["Backlog", "Paused"].includes(g.status) || g.notPlayed).slice(0, 4);
		const names = this.genreGroups(ctx).map(x => x.name);
		const stats = [
			{ label: "Jogos", value: U.fmtNum(s.count) },
			{ label: "Horas", value: U.fmtHours(s.hours) },
			avgRating !== null ? { label: "Nota média", value: U.fmtNum(avgRating, 1), sub: "de 5" } : { label: "Zerados", value: `${s.completed}`, sub: s.count ? `${s.completionPct}%` : "" },
			avgDone !== null ? { label: "Para zerar", value: U.fmtHours(avgDone), sub: "em média" } : null
		];
		const chips = (map, title, kind = "genre") => map.size ? `<section class="sv-block">${U.sectionHead(title)}<div class="sv-chiplinks">${[...map].sort((a, b) => b[1].length - a[1].length).slice(0, 12).map(([k, l]) => kind === "subgenre" ? this.subChip(ctx, k, l.length) : this.genreChip(ctx, k, l.length, pages)).join("")}</div></section>` : "";
		const html = `<div class="sv-page sv-idpage" style="${this.identStyle(id.color)}">
			<section class="sv-idhero sv-idhero--genre${page?.cover ? " has-art" : ""}">
				${page?.cover ? `<img class="sv-idhero-art" src="${U.attr(page.cover)}" alt="" data-sv-img>` : ""}
				<span class="sv-idhero-mark" aria-hidden="true">${U.icon(id.icon)}</span>
				<div class="sv-idhero-inner">
					<span class="sv-idhero-kicker"><span class="sv-idhero-badge">${U.icon(id.icon)}</span>Gênero</span>
					<h1>${U.esc(title)}</h1>
					${C.str(current.description) || id.mood ? `<p class="sv-idhero-desc">${U.esc(C.str(current.description) || id.mood)}</p>` : ""}
					${U.figures(stats)}
					<div class="sv-idhero-actions">${this.identityBtn(ctx, "genre", title, page || { path: current.file.path })}</div>
				</div>
			</section>
			<div class="sv-pad">
				${games.length ? `${best.length ? `<section class="sv-block">${U.sectionHead("Melhores do gênero", { sub: "Pela sua nota e pelo tempo de jogo" })}
					<ol class="sv-rank">${best.map((g, i) => `<li><a ${U.openAttrs(g.path)}><span class="sv-rank-n">${i + 1}</span>${U.cover(g, { cls: "sv-cover--xs" })}<span class="sv-rank-text"><b>${U.esc(g.title)}</b><small>${[g.platform, g.releaseYear].filter(Boolean).map(x => U.esc(x)).join(" · ")}</small></span><span class="sv-rank-side">${g.rating ? U.stars(g.rating) : ""}<small>${U.fmtHours(g.playtime.hours)}</small></span></a></li>`).join("")}</ol></section>` : ""}
				${next.length ? `<section class="sv-block">${U.sectionHead("Jogar agora neste gênero", { sub: "Do seu backlog e do que ficou pausado" })}<div class="sv-grid sv-grid--static">${next.map(g => U.gameCard(g, C)).join("")}</div></section>` : ""}
				${chips(subsHere, "Subgêneros", "subgenre")}
				${chips(related, "Aparece junto com")}
				<section class="sv-block">${U.sectionHead("Por status")}${this.statusBar(ctx, games)}</section>
				<section class="sv-block">${U.sectionHead("Todos os jogos", { count: games.length })}${this.gameGrid(ctx, games)}</section>`
				: U.empty({ icon: id.icon, title: "Nenhum jogo neste gênero ainda", text: "Os jogos aparecem aqui quando o gênero ou subgênero deles for este." })}
				${this.pager(ctx, "genre", names, title, pages)}
			</div>
		</div>`;
		return { active: "genres", html };
	}

	// chip que leva à página do gênero (cria no primeiro toque)
	genreChip(ctx, name, count, pages) {
		const { U, C, model } = ctx;
		const p = (pages || new Map(model.genres.map(x => [C.normalizeKey(x.title), x]))).get(C.normalizeKey(name));
		const id = this.ident(ctx, "genre", name, p);
		return `<a class="sv-chiplink sv-chiplink--id" ${U.catAttrs("genre", name, p)} style="${this.identStyle(id.color)}">${U.icon(id.icon)}${U.esc(name)}${count !== undefined ? `<span>${count}</span>` : ""}</a>`;
	}

	// ========================================================== SUBGÊNEROS
	// Mesma lógica dos gêneros: cada subgênero tem página própria em
	// Subgenres/ (type: subgenre), criada no primeiro toque se não existir.
	// Páginas antigas de gênero com o mesmo nome só emprestam a identidade.
	subPage(ctx, name) {
		const { C, model } = ctx;
		const k = C.normalizeKey(name);
		return (model.subgenres || []).find(p => C.normalizeKey(p.title) === k) || null;
	}

	subIdent(ctx, name, page) {
		const { C, model } = ctx;
		const own = page || this.subPage(ctx, name);
		const legacy = own ? null : model.genres.find(p => C.normalizeKey(p.title) === C.normalizeKey(name));
		return this.ident(ctx, "subgenre", name, own || legacy);
	}

	subChip(ctx, name, count) {
		const { U } = ctx;
		const page = this.subPage(ctx, name);
		const id = this.subIdent(ctx, name, page);
		return `<a class="sv-chiplink sv-chiplink--id" ${U.catAttrs("subgenre", name, page)} style="${this.identStyle(id.color)}">${U.icon(id.icon)}${U.esc(name)}${count !== undefined ? `<span>${count}</span>` : ""}</a>`;
	}

	subgenreGroups(ctx) {
		const { C, model } = ctx;
		const groups = new Map();
		for (const g of model.games) for (const name of g.subgenres) {
			const k = C.normalizeKey(name);
			if (!groups.has(k)) groups.set(k, { name, games: [], sub: new Set(), parents: new Map() });
			const x = groups.get(k);
			if (!x.games.includes(g)) x.games.push(g);
			for (const ge of g.genres) { x.parents.set(ge, (x.parents.get(ge) || 0) + 1); x.sub.add(ge); }
		}
		return [...groups.values()].sort((a, b) => b.games.length - a.games.length || a.name.localeCompare(b.name));
	}

	subgenres(ctx) {
		const { U, C, model } = ctx;
		const list = this.subgenreGroups(ctx);
		const aff = this.affinity(ctx, list);
		const fav = aff[0];
		const favId = fav ? this.subIdent(ctx, fav.name) : null;
		const parentsOf = x => [...x.parents].sort((a, b) => b[1] - a[1]).map(([n]) => n);
		const tile = x => {
			const page = this.subPage(ctx, x.name);
			const id = this.subIdent(ctx, x.name, page);
			const parents = parentsOf(x);
			return this.catTile(ctx, x, { kind: "subgenre", page, id, sub: parents.length ? `em ${parents.slice(0, 2).join(" · ")}` : id.mood, key: parents.join(" "), score: aff.find(y => y.name === x.name)?.score || 0 });
		};
		// mapa: cada gênero com os subgêneros que aparecem nos jogos dele
		const map = this.genreGroups(ctx).filter(x => x.sub.size).map(x => {
			const page = model.genres.find(p => C.normalizeKey(p.title) === C.normalizeKey(x.name));
			const id = this.ident(ctx, "genre", x.name, page);
			const counts = [...x.sub].map(n => [n, x.games.filter(g => g.subgenres.some(y => C.normalizeKey(y) === C.normalizeKey(n))).length]).sort((a, b) => b[1] - a[1]);
			return `<li class="sv-submap-row" style="${this.identStyle(id.color)}">
				<a class="sv-submap-genre" ${U.catAttrs("genre", x.name, page)}><span class="sv-submap-ico">${U.icon(id.icon)}</span><span><b>${U.esc(x.name)}</b><small>${U.plural(x.games.length, "jogo", "jogos")}</small></span></a>
				<div class="sv-chiplinks">${counts.map(([n, c]) => this.subChip(ctx, n, c)).join("")}</div>
			</li>`;
		});
		const html = `<div class="sv-page sv-pad sv-hubpage sv-hubpage--genres sv-hubpage--subgenres">
			${U.pageHead("Subgêneros", { sub: list.length ? `${U.plural(list.length, "subgênero", "subgêneros")} em ${U.plural(new Set(list.flatMap(x => x.games)).size, "jogo", "jogos")}` : "O detalhe de cada gênero", actions: `<a class="sv-btn sv-btn--secondary" ${U.openAttrs("Dashboard/Gêneros")}>${U.icon("masks")}<span>Gêneros</span></a>${U.btn("", { icon: "refresh", action: "legacy", attrs: 'data-legacy="syncCategories"', title: "Criar páginas que faltam" })}` })}
			${fav ? `<section class="sv-dna" style="${this.identStyle(favId.color)}">
				<div class="sv-dna-head">
					<span class="sv-dna-kicker">Seu estilo</span>
					<div class="sv-dna-fav"><span class="sv-dna-favicon">${U.icon(favId.icon)}</span><div><small>Subgênero favorito</small><b>${U.esc(fav.name)}</b>${favId.mood ? `<em>${U.esc(favId.mood)}</em>` : ""}</div></div>
				</div>
				<ol class="sv-dna-bars">${aff.slice(0, 6).map(x => { const id = this.subIdent(ctx, x.name); return `<li style="${this.identStyle(id.color)}"><span class="sv-dna-ico">${U.icon(id.icon)}</span><span class="sv-dna-name">${U.esc(x.name)}</span><span class="sv-dna-track"><span style="width:${x.score}%"></span></span><b>${x.score}</b></li>`; }).join("")}</ol>
				<p class="sv-dna-note">Afinidade de 0 a 100: horas jogadas, nota média e quanto você zera em cada subgênero.</p>
			</section>` : ""}
			${list.length > 3 ? this.hubBar(ctx, { placeholder: "Buscar subgênero ou gênero", sorts: [["score", "Afinidade"], ["games", "Jogos"], ["hours", "Horas"], ["name", "Nome"]] }) : ""}
			${list.length ? `<div class="sv-gtiles" data-hub-list>${list.map(tile).join("")}</div><p class="sv-hub-noresult" data-hub-empty hidden>Nenhum subgênero com esse nome.</p>` : U.empty({ icon: "tag", title: "Nenhum subgênero ainda", text: "Preencha o subgênero em Editar detalhes de um jogo (ex.: Metroidvania, Survival Horror)." })}
			${map.length ? `<section class="sv-block">${U.sectionHead("Por gênero", { sub: "Os subgêneros que aparecem dentro de cada gênero" })}<ul class="sv-submap">${map.join("")}</ul></section>` : ""}
		</div>`;
		return { active: "subgenres", html, wire: root => this.wireHubBar(root) };
	}

	subgenre(ctx) {
		const { U, C, model, current } = ctx;
		const title = C.str(current.title) || current.file.name;
		const key = C.normalizeKey(title);
		const page = this.subPage(ctx, title) || (model.subgenres || []).find(p => p.path === current.file.path);
		const id = this.subIdent(ctx, title, page);
		const games = model.games.filter(g => g.subgenres.some(x => C.normalizeKey(x) === key));
		const s = C.groupStats(games);
		const rated = games.filter(g => g.rating > 0);
		const avgRating = rated.length ? rated.reduce((t, g) => t + g.rating, 0) / rated.length : null;
		const doneH = games.filter(g => g.status === "Completed" && g.playtime.hours > 0);
		const avgDone = doneH.length ? doneH.reduce((t, g) => t + g.playtime.hours, 0) / doneH.length : null;
		const best = [...games].sort((a, b) => (b.rating || 0) - (a.rating || 0) || b.playtime.hours - a.playtime.hours).slice(0, 5);
		const parents = C.groupBy(games, g => g.genres);
		const siblings = C.groupBy(games, g => g.subgenres.filter(x => C.normalizeKey(x) !== key));
		const parentNames = [...parents].sort((a, b) => b[1].length - a[1].length).map(([n]) => n);
		let next = [];
		try { next = ctx.X?.suggest ? ctx.X.suggest(model).filter(g => games.includes(g)).slice(0, 4) : []; } catch (_) { next = []; }
		if (!next.length) next = games.filter(g => ["Backlog", "Paused"].includes(g.status) || g.notPlayed).slice(0, 4);
		const names = this.subgenreGroups(ctx).map(x => x.name);
		const pages = new Map(names.map(n => [C.normalizeKey(n), this.subPage(ctx, n)]).filter(([, p]) => p));
		const stats = [
			{ label: "Jogos", value: U.fmtNum(s.count) },
			{ label: "Horas", value: U.fmtHours(s.hours) },
			avgRating !== null ? { label: "Nota média", value: U.fmtNum(avgRating, 1), sub: "de 5" } : { label: "Zerados", value: `${s.completed}`, sub: s.count ? `${s.completionPct}%` : "" },
			avgDone !== null ? { label: "Para zerar", value: U.fmtHours(avgDone), sub: "em média" } : null
		];
		const chips = (map, head, kind) => map.size ? `<section class="sv-block">${U.sectionHead(head)}<div class="sv-chiplinks">${[...map].sort((a, b) => b[1].length - a[1].length).slice(0, 12).map(([k, l]) => kind === "subgenre" ? this.subChip(ctx, k, l.length) : this.genreChip(ctx, k, l.length)).join("")}</div></section>` : "";
		const kicker = parentNames.length ? `Subgênero · ${parentNames.slice(0, 2).join(" · ")}` : "Subgênero";
		const html = `<div class="sv-page sv-idpage" style="${this.identStyle(id.color)}">
			<section class="sv-idhero sv-idhero--genre sv-idhero--subgenre${page?.cover ? " has-art" : ""}">
				${page?.cover ? `<img class="sv-idhero-art" src="${U.attr(page.cover)}" alt="" data-sv-img>` : ""}
				<span class="sv-idhero-mark" aria-hidden="true">${U.icon(id.icon)}</span>
				<div class="sv-idhero-inner">
					<span class="sv-idhero-kicker"><span class="sv-idhero-badge">${U.icon(id.icon)}</span>${U.esc(kicker)}</span>
					<h1>${U.esc(title)}</h1>
					${C.str(current.description) || id.mood ? `<p class="sv-idhero-desc">${U.esc(C.str(current.description) || id.mood)}</p>` : ""}
					${U.figures(stats)}
					<div class="sv-idhero-actions">${this.identityBtn(ctx, "subgenre", title, page || { path: current.file.path })}<a class="sv-btn sv-btn--glass" ${U.openAttrs("Dashboard/Subgêneros")}>${U.icon("tag")}<span>Todos os subgêneros</span></a></div>
				</div>
			</section>
			<div class="sv-pad">
				${games.length ? `${chips(parents, "Dentro de", "genre")}
				${best.length ? `<section class="sv-block">${U.sectionHead("Melhores do subgênero", { sub: "Pela sua nota e pelo tempo de jogo" })}
					<ol class="sv-rank">${best.map((g, i) => `<li><a ${U.openAttrs(g.path)}><span class="sv-rank-n">${i + 1}</span>${U.cover(g, { cls: "sv-cover--xs" })}<span class="sv-rank-text"><b>${U.esc(g.title)}</b><small>${[g.platform, g.releaseYear].filter(Boolean).map(x => U.esc(x)).join(" · ")}</small></span><span class="sv-rank-side">${g.rating ? U.stars(g.rating) : ""}<small>${U.fmtHours(g.playtime.hours)}</small></span></a></li>`).join("")}</ol></section>` : ""}
				${next.length ? `<section class="sv-block">${U.sectionHead("Jogar agora neste subgênero", { sub: "Do seu backlog e do que ficou pausado" })}<div class="sv-grid sv-grid--static">${next.map(g => U.gameCard(g, C)).join("")}</div></section>` : ""}
				${chips(siblings, "Combina com", "subgenre")}
				<section class="sv-block">${U.sectionHead("Por status")}${this.statusBar(ctx, games)}</section>
				<section class="sv-block">${U.sectionHead("Todos os jogos", { count: games.length })}${this.gameGrid(ctx, games)}</section>`
				: U.empty({ icon: id.icon, title: "Nenhum jogo neste subgênero ainda", text: "Os jogos aparecem aqui quando o campo Subgênero deles tiver este nome." })}
				${this.pager(ctx, "subgenre", names, title, pages)}
			</div>
		</div>`;
		return { active: "subgenres", html };
	}

	// ============================================================ FRANQUIAS
	franchiseGroups(ctx) {
		const { C, model } = ctx;
		return [...C.groupBy(model.games.filter(g => g.franchise), g => g.franchise)].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
	}

	sagaOrder(games, mode) {
		const year = g => g.releaseYear ?? 9999;
		if (mode === "story") return [...games].sort((a, b) => (a.franchiseOrder ?? 999) - (b.franchiseOrder ?? 999) || year(a) - year(b) || a.title.localeCompare(b.title));
		return [...games].sort((a, b) => year(a) - year(b) || (a.franchiseOrder ?? 999) - (b.franchiseOrder ?? 999) || a.title.localeCompare(b.title));
	}

	franchiseArt(games) {
		const latest = [...games].sort((a, b) => (b.releaseYear ?? 0) - (a.releaseYear ?? 0));
		return latest.map(g => g.images.background || g.images.featured).find(Boolean) || "";
	}

	franchises(ctx) {
		const { U, C, model } = ctx;
		const groups = this.franchiseGroups(ctx);
		const pages = new Map((model.franchises || []).map(p => [C.normalizeKey(p.title), p]));
		const solo = model.games.filter(g => !g.franchise).length;
		const card = ([name, games]) => {
			const page = pages.get(C.normalizeKey(name));
			const id = this.ident(ctx, "franchise", name, page);
			const s = C.groupStats(games);
			const art = page?.cover || this.franchiseArt(games);
			const ordered = this.sagaOrder(games, "release");
			const years = ordered.map(g => g.releaseYear).filter(Boolean);
			const span = years.length ? (years[0] === years[years.length - 1] ? `${years[0]}` : `${years[0]}–${years[years.length - 1]}`) : "";
			return `<a class="sv-fcard${art ? "" : " is-noart"}" ${U.catAttrs("franchise", name, page)} style="${this.identStyle(id.color)}" data-hub-item data-name="${U.attr(name)}" data-key="${U.attr(this.hubKey(`${name} ${games.map(g => g.title).join(" ")}`))}" data-games="${s.count}" data-hours="${s.hours}" data-progress="${s.completionPct}">
				${art ? `<img class="sv-fcard-art" src="${U.attr(art)}" alt="" loading="lazy" data-sv-img>` : ""}
				<div class="sv-fcard-body">
					${this.coverFan(ctx, ordered, 4)}
					<div class="sv-fcard-text">
						<span class="sv-fcard-kicker">Franquia${span ? ` · ${U.esc(span)}` : ""}</span>
						<strong>${U.esc(name)}</strong>
						<span class="sv-fcard-meta"><span>${U.plural(s.count, "jogo", "jogos")}</span><span>${U.fmtHours(s.hours)}</span>${s.perfect ? `<span>${U.plural(s.perfect, "100%", "100%")}</span>` : ""}</span>
						<div class="sv-fcard-progress"><span class="sv-fcard-bar"><span style="width:${s.completionPct}%"></span></span><small>${s.completed} de ${s.count} zerados</small></div>
					</div>
				</div>
			</a>`;
		};
		const html = `<div class="sv-page sv-pad sv-hubpage sv-hubpage--franchises">
			${U.pageHead("Franquias", { sub: `${U.plural(groups.length, "franquia", "franquias")}${solo ? `, ${U.plural(solo, "jogo avulso", "jogos avulsos")}` : ""}` })}
			${groups.length ? `${groups.length > 3 ? this.hubBar(ctx, { placeholder: "Buscar franquia ou jogo", sorts: [["games", "Jogos"], ["hours", "Horas"], ["progress", "Progresso"], ["name", "Nome"]] }) : ""}
				<div class="sv-fcards" data-hub-list>${groups.map(card).join("")}</div>
				<p class="sv-hub-noresult" data-hub-empty hidden>Nenhuma franquia encontrada.</p>`
				: U.empty({ icon: "film", title: "Nenhuma franquia definida", text: "Preencha o campo Franquia nos detalhes de um jogo para agrupá-lo aqui." })}
		</div>`;
		return { active: "franchises", html, wire: root => this.wireHubBar(root) };
	}

	franchise(ctx) {
		const { U, C, model, current } = ctx;
		const title = C.str(current.title) || current.file.name;
		const key = C.normalizeKey(title);
		const pages = new Map((model.franchises || []).map(p => [C.normalizeKey(p.title), p]));
		const page = pages.get(key) || (model.franchises || []).find(p => p.path === current.file.path);
		const id = this.ident(ctx, "franchise", title, page);
		const games = model.games.filter(g => C.normalizeKey(g.franchise) === key);
		const s = C.groupStats(games);
		const hasStory = games.some(g => g.franchiseOrder !== null && g.franchiseOrder !== undefined);
		const byRelease = this.sagaOrder(games, "release"), byStory = this.sagaOrder(games, "story");
		const pickNext = list => list.find(g => g.status === "Playing") || list.find(g => !["Completed", "Dropped"].includes(g.status));
		const next = pickNext(hasStory ? byStory : byRelease);
		const missing = games.filter(g => ["Backlog", "Wishlist", "Paused"].includes(g.status) || g.notPlayed);
		const art = page?.cover || this.franchiseArt(games);
		const names = this.franchiseGroups(ctx).map(([n]) => n);
		const plats = C.groupBy(games, g => g.platform);
		const timeline = (list, mode) => `<ol class="sv-tl" data-tl="${mode}"${mode === (hasStory ? "story" : "release") ? "" : " hidden"}>${list.map((g, i) => `<li class="sv-tl-item is-${g.status.toLowerCase()}">
			<span class="sv-tl-step">${mode === "story" ? (g.franchiseOrder !== null && g.franchiseOrder !== undefined ? `#${g.franchiseOrder}` : "—") : (g.releaseYear || "Sem ano")}</span>
			<span class="sv-tl-node" aria-hidden="true"></span>
			<a class="sv-tl-card" ${U.openAttrs(g.path)}>${U.cover(g)}<b>${U.esc(g.title)}</b><small>${U.esc(C.statusLabel(g.status))}${g.playtime.hours ? ` · ${U.fmtHours(g.playtime.hours)}` : ""}</small></a>
		</li>`).join("")}</ol>`;
		const stats = [
			{ label: "Jogos", value: U.fmtNum(s.count) },
			{ label: "Horas", value: U.fmtHours(s.hours) },
			{ label: "Zerados", value: `${s.completed}`, sub: s.count ? `${s.completionPct}%` : "" },
			s.achPct !== null ? { label: "Conquistas", value: U.fmtPct(s.achPct), sub: s.perfect ? `${s.perfect} em 100%` : "", tone: s.achPct === 100 ? "gold" : "" } : null
		];
		const html = `<div class="sv-page sv-idpage" style="${this.identStyle(id.color)}">
			<section class="sv-idhero sv-idhero--franchise${art ? " has-art" : ""}">
				${art ? `<img class="sv-idhero-art" src="${U.attr(art)}" alt="" data-sv-img>` : ""}
				<div class="sv-idhero-inner">
					${this.coverFan(ctx, byRelease, 5)}
					<span class="sv-idhero-kicker"><span class="sv-idhero-badge">${U.icon(id.icon)}</span>Franquia</span>
					<h1>${U.esc(title)}</h1>
					${C.str(current.description) ? `<p class="sv-idhero-desc">${U.esc(current.description)}</p>` : ""}
					${U.figures(stats)}
					<div class="sv-sagabar"><span style="width:${s.completionPct}%"></span></div>
					<div class="sv-idhero-actions">${this.identityBtn(ctx, "franchise", title, page || { path: current.file.path })}</div>
				</div>
			</section>
			<div class="sv-pad">
				${games.length ? `${next ? `<section class="sv-block">${U.sectionHead("Próximo da saga", { sub: next.status === "Playing" ? "Você está jogando" : hasStory ? "Seguindo a ordem da história" : "Seguindo a ordem de lançamento" })}${U.wideCard(next, C)}</section>`
					: `<div class="sv-callout sv-callout--ok">${U.icon("trophy")}<div><strong>Saga concluída</strong><p>Você zerou todos os jogos desta franquia no vault.</p></div></div>`}
				<section class="sv-block">
					${U.sectionHead("Linha do tempo", { action: hasStory ? `<div class="sv-segmented" role="radiogroup" aria-label="Ordem"><button type="button" role="radio" data-tl-mode="story" class="is-active" aria-checked="true">História</button><button type="button" role="radio" data-tl-mode="release" aria-checked="false">Lançamento</button></div>` : "" })}
					${!hasStory ? `<p class="sv-muted sv-tl-hint">Ordem de lançamento. Para ver a ordem da história, preencha “Ordem na franquia” nos detalhes de cada jogo.</p>` : ""}
					<div class="sv-tl-wrap">${timeline(byStory, "story")}${timeline(byRelease, "release")}</div>
				</section>
				${missing.length ? `<section class="sv-block">${U.sectionHead("Falta jogar", { count: missing.length, sub: "No backlog, na lista de desejos ou pausados" })}<div class="sv-grid sv-grid--static">${missing.map(g => U.gameCard(g, C)).join("")}</div></section>` : ""}
				${plats.size > 1 ? `<section class="sv-block">${U.sectionHead("Plataformas da saga")}<div class="sv-chiplinks">${[...plats].map(([n, l]) => { const pp = model.platforms.find(p => C.normalizeKey(p.title) === C.normalizeKey(n)); const pid = this.ident(ctx, "platform", n, pp); return `<a class="sv-chiplink sv-chiplink--id" ${U.catAttrs("platform", n, pp)} style="${this.identStyle(pid.color)}">${U.icon(pid.icon)}${U.esc(n)}<span>${l.length}</span></a>`; }).join("")}</div></section>` : ""}`
				: U.empty({ icon: "film", title: "Nenhum jogo nesta franquia", text: "Os jogos aparecem aqui quando o campo Franquia deles tiver este nome." })}
				${this.pager(ctx, "franchise", names, title, pages)}
			</div>
		</div>`;
		const wire = root => root.querySelectorAll("[data-tl-mode]").forEach(b => b.addEventListener("click", () => {
			root.querySelectorAll("[data-tl-mode]").forEach(x => { const on = x === b; x.classList.toggle("is-active", on); x.setAttribute("aria-checked", String(on)); });
			root.querySelectorAll("[data-tl]").forEach(l => { l.hidden = l.dataset.tl !== b.dataset.tlMode; });
		}));
		return { active: "franchises", html, wire };
	}

	// ======================================================= EDITAR IDENTIDADE
	// ================================================ formulários simples
	// 3.65.0: nova coleção, editar coleção, novo gênero/subgênero e nova
	// plataforma saíram do SteamVaultLegacy e viraram janelas nativas
	// (botões no rodapé, Enter salva, mensagem de erro no próprio campo).
	// Os ids dos campos são os mesmos de antes; o que é gravado também.
	_simpleForm(ctx, { title, sub = "", body: html, ok, onOk, wire = null }) {
		const { U, V } = ctx;
		const body = document.createElement("div");
		body.className = "sv-host sv-legacy sv-simpleform";
		body.innerHTML = `${html}<div class="svl-form-msg" role="status" aria-live="polite"></div>`;
		const m = V.modal({ title, sub, size: "md", body,
			actions: `${U.btn("Cancelar", { kind: "ghost", attrs: "data-close" })}${U.btn(ok.label, { kind: "primary", attrs: `id="${ok.id}" data-sf-ok` })}` });
		const msg = body.querySelector(".svl-form-msg");
		const say = (text, tone = "") => { msg.textContent = text; msg.className = `svl-form-msg${tone ? ` is-${tone}` : ""}`; };
		const btn = m.el.querySelector("[data-sf-ok]");
		const run = async () => {
			if (btn.disabled) return;
			btn.disabled = true;
			try { await onOk({ body, say, m, val: sel => (body.querySelector(sel)?.value || "").trim() }); }
			catch (err) { console.error(`Game Library: falha em "${title}"`, err); say("Não foi possível salvar. Veja o console.", "error"); }
			finally { if (btn.isConnected) btn.disabled = false; }
		};
		btn.addEventListener("click", run);
		body.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.matches("input:not([type=checkbox]):not([type=file])")) { e.preventDefault(); run(); } });
		try { wire?.(body); } catch (err) { console.error("Game Library: falha ao ligar formulário", err); }
		// a janela inteira: o botão de salvar fica no rodapé, fora do corpo
		V._polishForm?.(m.el);
		setTimeout(() => body.querySelector("input.svl-input")?.focus({ preventScroll: true }), 60);
		return m;
	}

	newCollection(ctx) {
		const { C, L } = ctx;
		const picker = L?.imagePickerField ? L.imagePickerField({ id: "svl-ac-cover", label: "Capa (opcional)" }) : "";
		return this._simpleForm(ctx, {
			title: "Nova coleção",
			body: `<div class="svl-field"><label for="svl-ac-title">Nome da coleção *</label><input type="text" class="svl-input" id="svl-ac-title" placeholder="Ex: Favoritos" autocomplete="off" enterkeyhint="done"></div>
				<div class="svl-field"><label for="svl-ac-desc">Descrição</label><input type="text" class="svl-input" id="svl-ac-desc" placeholder="Do que se trata essa coleção?" autocomplete="off"></div>
				${picker}`,
			ok: { label: "Criar coleção", id: "svl-ac-submit" },
			wire: body => L?.wireImagePicker?.(body, "svl-ac-cover", { folder: L.folders.coverAssets, baseName: () => body.querySelector("#svl-ac-title")?.value || "colecao" }),
			onOk: async ({ val, say }) => {
				const title = val("#svl-ac-title");
				if (!title) return say("Dê um nome à coleção antes de continuar.", "error");
				say("Criando…");
				const y = v => C.yamlEscape(v);
				const folder = "Collections";
				if (!app.vault.getAbstractFileByPath(folder)) await app.vault.createFolder(folder).catch(() => {});
				const safe = C.safeFileName(title, "Nova Coleção");
				let path = `${folder}/${safe}.md`, n = 1;
				while (app.vault.getAbstractFileByPath(path)) path = `${folder}/${safe} ${++n}.md`;
				const content = ["---", `title: "${y(title)}"`, "type: collection", `description: "${y(val("#svl-ac-desc"))}"`, `accent: ""`, `cover: "${y(val("#svl-ac-cover"))}"`, "games: []", "cssclasses: [steamvault, sv-collection]", "---", "", ...C.noteBody("collection").split("\n")].join("\n");
				await app.vault.create(path, content);
				say(`"${title}" criada! Abrindo…`, "success");
				setTimeout(() => app.workspace.openLinkText(path, "", false), 500);
			}
		});
	}

	editCollectionData(ctx, c) {
		const { L, V } = ctx;
		if (!c?.file?.path) return V.toast("Coleção não encontrada", { tone: "error" });
		const picker = L?.imagePickerField ? L.imagePickerField({ id: "svl-cc-cover", label: "Capa", value: c.cover || "" }) : "";
		return this._simpleForm(ctx, {
			title: "Editar coleção", sub: c.title || c.file.name,
			body: `<div class="svl-field"><label for="svl-cc-desc">Descrição</label><input type="text" class="svl-input" id="svl-cc-desc" value="${ctx.U.attr(c.description || "")}" autocomplete="off"></div>${picker}`,
			ok: { label: "Salvar", id: "svl-cc-save" },
			wire: body => L?.wireImagePicker?.(body, "svl-cc-cover", { folder: L.folders.coverAssets, baseName: () => (c.title || c.file.name) }),
			onOk: async ({ val, say }) => {
				const file = app.vault.getAbstractFileByPath(c.file.path);
				if (!file) return say("A nota da coleção não foi encontrada.", "error");
				say("Salvando…");
				await app.fileManager.processFrontMatter(file, fm => { fm.description = val("#svl-cc-desc"); fm.cover = val("#svl-cc-cover"); });
				say("Salvo!", "success");
			}
		});
	}

	newGenre(ctx) {
		const { C } = ctx;
		let kind = "genre";
		return this._simpleForm(ctx, {
			title: "Novo gênero",
			body: `<div class="svl-field"><label for="svl-ag-name">Nome *</label><input type="text" class="svl-input" id="svl-ag-name" placeholder="Ex: Roguelike, Visual Novel..." autocomplete="off" enterkeyhint="done"></div>
				<div class="svl-field"><label id="svl-ag-type-l">Tipo</label>
					<div class="svl-segmented" id="svl-ag-type" data-value="genre" role="radiogroup" aria-labelledby="svl-ag-type-l">
						<button type="button" class="svl-segmented-opt is-active" data-value="genre" role="radio" aria-checked="true">Gênero</button>
						<button type="button" class="svl-segmented-opt" data-value="subgenre" role="radio" aria-checked="false">Subgênero</button>
					</div></div>`,
			ok: { label: "Criar", id: "svl-ag-submit" },
			wire: body => {
				const g = body.querySelector("#svl-ag-type");
				g.addEventListener("click", e => {
					const b = e.target.closest(".svl-segmented-opt"); if (!b) return;
					kind = b.dataset.value; g.dataset.value = kind;
					g.querySelectorAll(".svl-segmented-opt").forEach(x => { const on = x === b; x.classList.toggle("is-active", on); x.setAttribute("aria-checked", String(on)); });
				});
			},
			onOk: async ({ val, say, body }) => {
				const name = val("#svl-ag-name");
				if (!name) return say("Dê um nome antes de continuar.", "error");
				const field = kind === "subgenre" ? "customSubgenres" : "customGenres";
				const file = app.vault.getAbstractFileByPath("Dashboard/Gêneros.md");
				if (!file) return say("A página Dashboard/Gêneros.md não foi encontrada.", "error");
				if ((app.metadataCache.getFileCache(file)?.frontmatter?.[field] || []).includes(name)) return say(`Esse ${kind === "subgenre" ? "subgênero" : "gênero"} já existe.`, "error");
				say("Criando…");
				await app.fileManager.processFrontMatter(file, fm => { if (!Array.isArray(fm[field])) fm[field] = []; fm[field].push(name); });
				// subgênero ganha página de subgênero (antes nascia como gênero)
				await C.ensureCategoryNote(kind, name);
				say(`"${name}" criado! Já aparece nos formulários de jogo.`, "success");
				body.querySelector("#svl-ag-name").value = "";
			}
		});
	}

	newPlatform(ctx) {
		const { C, L } = ctx;
		return this._simpleForm(ctx, {
			title: "Nova plataforma",
			body: `<div class="svl-field"><label for="svl-ap-name">Nome da plataforma *</label><input type="text" class="svl-input" id="svl-ap-name" placeholder="Ex: Xbox 360, Wii U, Mobile..." autocomplete="off" enterkeyhint="done"></div>`,
			ok: { label: "Criar plataforma", id: "svl-ap-submit" },
			onOk: async ({ val, say, body }) => {
				const name = val("#svl-ap-name");
				if (!name) return say("Dê um nome à plataforma antes de continuar.", "error");
				const file = app.vault.getAbstractFileByPath("Dashboard/Plataformas.md");
				if (!file) return say("A página Dashboard/Plataformas.md não foi encontrada.", "error");
				const known = (L?.platformOrder || []).includes(name) || (app.metadataCache.getFileCache(file)?.frontmatter?.customPlatforms || []).includes(name);
				if (known) return say("Essa plataforma já existe.", "error");
				say("Criando…");
				await app.fileManager.processFrontMatter(file, fm => { if (!Array.isArray(fm.customPlatforms)) fm.customPlatforms = []; fm.customPlatforms.push(name); });
				// já deixa a pasta pronta para receber jogos dessa plataforma
				const folder = `Games/${C.safeFileName(name, name)}`;
				if (!app.vault.getAbstractFileByPath(folder)) await app.vault.createFolder(folder).catch(() => {});
				say(`"${name}" criada! Já aparece nos formulários de jogo.`, "success");
				body.querySelector("#svl-ap-name").value = "";
			}
		});
	}

	async editIdentity(ctx, kind, name, path) {
		const { U, C, V, L } = ctx;
		const isCol = kind === "collection";
		const list = kind === "platform" ? ctx.model.platforms : kind === "franchise" ? (ctx.model.franchises || []) : kind === "subgenre" ? (ctx.model.subgenres || []) : isCol ? ctx.model.collections : ctx.model.genres;
		const page = (path && list.find(p => p.path === path)) || list.find(p => C.normalizeKey(p.title) === C.normalizeKey(name)) || null;
		if (isCol && !page) return V.toast("Coleção não encontrada", { tone: "error" });
		const colDef = isCol ? this.collectionIdent(ctx, { ...page, accent: "", icon: "" }) : null;
		const def = isCol ? { color: colDef.color, icon: colDef.icon, mood: "" } : this.ident(ctx, kind, name, null);
		const cur = isCol ? { ...this.collectionIdent(ctx, page), mood: "" } : kind === "subgenre" ? this.subIdent(ctx, name, page) : this.ident(ctx, kind, name, page);
		const swatches = ["#4f8df7", "#a970ff", "#ff7a45", "#e94b3c", "#c0392b", "#f2c14e", "#3fbf6f", "#16c79a", "#26a69a", "#00bcd4", "#ec407a", "#8fa3b8"];
		const groups = this.iconGroups(kind);
		const kindLabel = kind === "platform" ? "plataforma" : kind === "franchise" ? "franquia" : kind === "subgenre" ? "subgênero" : isCol ? "coleção" : "gênero";
		const isGenre = kind === "genre" || kind === "subgenre";
		const kindOf = isGenre ? `do ${kindLabel}` : `da ${kindLabel}`;
		let color = page?.accent || "", icon = page?.icon && U.paths[page.icon] ? page.icon : "";
		// imagem própria (3.38.0): o texto do campo é o que vai para a nota
		let img = C.str(page?.page?.iconImage);
		const imgSrc = () => img ? C.iconImage(img) : "";
		const body = document.createElement("div");
		body.className = "sv-host sv-idedit sv-legacy";
		body.innerHTML = `
			<div class="sv-idedit-preview" style="${this.identStyle(cur.color)}"><span class="sv-idedit-icon">${U.icon(cur.icon)}</span><div><b>${U.esc(name)}</b><small>${U.esc(kind === "platform" ? [cur.maker, cur.year].filter(Boolean).join(" · ") || "Plataforma" : kind === "franchise" ? "Franquia" : isCol ? `${cur.kind} · ${U.plural(page.games.length, "jogo", "jogos")}` : cur.mood || (kind === "subgenre" ? "Subgênero" : "Gênero"))}</small></div></div>
			<div class="svl-field"><label>Cor</label>
				<div class="sv-idedit-swatches">
					<button type="button" class="sv-idedit-swatch is-auto${color ? "" : " is-active"}" data-color="" style="${this.identStyle(def.color)}" title="Automática">${U.icon("refresh")}</button>
					${swatches.map(c => `<button type="button" class="sv-idedit-swatch${color.toLowerCase() === c ? " is-active" : ""}" data-color="${c}" style="${this.identStyle(c)}" aria-label="${c}"></button>`).join("")}
					<label class="sv-idedit-custom" title="Outra cor"><input type="color" value="${U.attr(/^#[0-9a-f]{6}$/i.test(color) ? color : (/^#[0-9a-f]{6}$/i.test(def.color) ? def.color : "#4f8df7"))}" data-color-custom>${U.icon("plus")}</label>
				</div>
			</div>
			<div class="svl-field"><label>Ícone</label>
				<div class="sv-idedit-icons">
					<button type="button" class="sv-idedit-ico${icon ? "" : " is-active"}" data-icon="" title="Automático">${U.icon(def.icon)}<span>Auto</span></button>
				</div>
				${L?.imagePickerField ? `<div class="sv-idedit-img">${L.imagePickerField({ id: "sv-id-iconimg", label: "Imagem própria", placeholder: "Caminho no vault ou https://", hint: "Do aparelho ou do vault (PNG, JPG, WebP, GIF ou SVG). Aparece no lugar do ícone em todas as telas; escolher um ícone abaixo volta ao ícone." })}</div>` : ""}
				${groups.map(([label, list]) => `<div class="sv-idedit-group"><span class="sv-idedit-glabel">${U.esc(label)}</span><div class="sv-idedit-icons">${list.filter(i => U.paths[i]).map(i => `<button type="button" class="sv-idedit-ico${icon === i ? " is-active" : ""}" data-icon="${i}" title="${U.attr(this.iconLabel(i))}" aria-label="${U.attr(this.iconLabel(i))}">${U.icon(i)}</button>`).join("")}</div></div>`).join("")}
			</div>
			${kind === "platform" ? `<div class="sv-idedit-row">
				<div class="svl-field"><label for="sv-id-maker">Fabricante</label><input class="svl-input" id="sv-id-maker" list="sv-id-makers" placeholder="${U.attr(def.maker || "Ex: Nintendo")}" value="${U.attr(page?.maker || "")}"><datalist id="sv-id-makers">${["PC", "Sony", "Nintendo", "Microsoft", "Sega", "Valve", "Mobile", "Outros"].map(m => `<option value="${m}">`).join("")}</datalist></div>
				<div class="svl-field"><label for="sv-id-year">Lançamento</label><input class="svl-input" id="sv-id-year" inputmode="numeric" placeholder="${U.attr(def.year || "Ano")}" value="${U.attr(page?.year || "")}"></div>
				<div class="svl-field"><label for="sv-id-gen">Geração</label><input class="svl-input" id="sv-id-gen" placeholder="${U.attr(def.gen || "Ex: 6ª geração")}" value="${U.attr(page?.generation || "")}"></div>
			</div>` : ""}
			${isCol ? `<div class="svl-field"><label>Tipo</label>
				<div class="sv-segmented sv-idedit-kinds" role="radiogroup" aria-label="Tipo da coleção">${Object.entries(this.collectionKinds()).map(([k, v]) => `<button type="button" role="radio" data-col-kind="${k}" class="${page.kind === k ? "is-active" : ""}" aria-checked="${page.kind === k}">${U.icon(v.icon)}<span>${U.esc(k === "free" ? "Livre" : v.label)}</span></button>`).join("")}</div>
				<small class="svl-field-hint">Meta mostra a barra até 100% e o próximo da lista; Maratona também mostra o próximo.</small>
			</div>
			<label class="svl-checkbox-label sv-idedit-pin"><input type="checkbox" id="sv-id-pinned"${page.pinned ? " checked" : ""}> Fixar no destaque das Coleções</label>` : ""}
			<div class="svl-field"><label for="sv-id-desc">${isGenre ? "Frase ou descrição" : "Descrição"}</label><textarea class="svl-input" id="sv-id-desc" rows="2" placeholder="${U.attr(isGenre && def.mood ? def.mood : isGenre ? `Algo sobre este ${kindLabel}` : `Algo sobre esta ${kindLabel}`)}">${U.esc(C.str(page?.description) || "")}</textarea></div>
			${L?.imagePickerField ? L.imagePickerField({ id: "sv-id-cover", label: "Arte do topo (opcional)", hint: kind === "franchise" ? "Vazio = arte do jogo mais recente da franquia" : isCol ? "Vazio = mosaico com as capas dos jogos" : "Vazio = cor e ícone da identidade" }) : ""}`;
		const m = V.modal({ title: `Identidade ${kindOf}`, sub: name, size: "md", body,
			actions: `${U.btn("Cancelar", { kind: "ghost", attrs: "data-close" })}${U.btn("Salvar", { kind: "primary", attrs: "data-id-save" })}` });
		const preview = body.querySelector(".sv-idedit-preview");
		const paint = () => {
			const c = color || def.color, i = imgSrc() ? `img:${imgSrc()}` : icon || def.icon;
			preview.setAttribute("style", this.identStyle(c));
			preview.querySelector(".sv-idedit-icon").innerHTML = U.icon(i);
		};
		let colKind = isCol ? page.kind : "";
		body.addEventListener("click", e => {
			const ck = e.target.closest("[data-col-kind]");
			if (ck) { colKind = ck.dataset.colKind; body.querySelectorAll("[data-col-kind]").forEach(x => { const on = x === ck; x.classList.toggle("is-active", on); x.setAttribute("aria-checked", String(on)); }); const kd = this.collectionKinds()[colKind]; if (kd) { def.icon = kd.icon; const auto = body.querySelector('[data-icon=""]'); if (auto) auto.innerHTML = `${U.icon(kd.icon)}<span>Auto</span>`; const sm = preview.querySelector("small"); if (sm) sm.textContent = `${kd.label} · ${U.plural(page.games.length, "jogo", "jogos")}`; paint(); } return; }
			const sw = e.target.closest("[data-color]");
			if (sw) { color = sw.dataset.color; body.querySelectorAll("[data-color]").forEach(x => x.classList.toggle("is-active", x === sw)); paint(); return; }
			const ic = e.target.closest("[data-icon]");
			if (ic) {
				icon = ic.dataset.icon; body.querySelectorAll("[data-icon]").forEach(x => x.classList.toggle("is-active", x === ic));
				// escolher um ícone tira a imagem própria (senão ela continuaria valendo)
				if (imgInput?.value) { imgInput.value = ""; imgInput.dispatchEvent(new Event("input")); }
				paint();
			}
		});
		body.querySelector("[data-color-custom]")?.addEventListener("input", e => { color = e.target.value; body.querySelectorAll("[data-color]").forEach(x => x.classList.remove("is-active")); paint(); });
		const imgInput = body.querySelector("#sv-id-iconimg");
		if (imgInput) {
			imgInput.value = img;
			// sugestões: imagens que já estão no vault (digitar filtra)
			const dl = document.createElement("datalist");
			dl.id = "sv-id-iconimg-list";
			dl.innerHTML = (app.vault.getFiles?.() || []).filter(f => /^(png|jpe?g|webp|gif|avif|svg)$/i.test(f.extension) && !f.path.startsWith(".") && !f.path.startsWith("Assets/Icons/genres") && !f.path.startsWith("Assets/Icons/ui")).slice(0, 600).map(f => `<option value="${U.attr(f.path)}">`).join("");
			imgInput.after(dl); imgInput.setAttribute("list", dl.id);
			imgInput.addEventListener("input", () => { img = imgInput.value.trim(); paint(); });
			L.wireImagePicker(body, "sv-id-iconimg", { folder: "Assets/Icons/Custom", baseName: () => C.safeFileName(`${kindLabel}-${name}`, "icone").slice(0, 60), onSaved: path => { img = path; paint(); } });
			paint();
		}
		const coverInput = body.querySelector("#sv-id-cover");
		if (coverInput) { coverInput.value = page?.page?.cover || ""; L.wireImagePicker(body, "sv-id-cover", { folder: "Assets/Covers", baseName: () => `${name}-${kindLabel}` }); }
		m.el.querySelector("[data-id-save]")?.addEventListener("click", async () => {
			const btn = m.el.querySelector("[data-id-save]");
			btn.disabled = true;
			try {
				const file = page ? app.vault.getAbstractFileByPath(page.path) : await C.ensureCategoryNote(kind, name);
				if (!file) throw new Error("nota não encontrada");
				const val = sel => (body.querySelector(sel)?.value || "").trim();
				if (img && !imgSrc()) { btn.disabled = false; return V.toast("Imagem não encontrada: use um arquivo do vault (PNG, JPG, WebP, GIF ou SVG) ou um endereço https", { tone: "warn" }); }
				await app.fileManager.processFrontMatter(file, fm => {
					fm.accent = color || "";
					fm.icon = icon || "";
					if (img) fm.iconImage = img; else delete fm.iconImage;
					fm.description = val("#sv-id-desc");
					if (coverInput) fm.cover = val("#sv-id-cover");
					if (isCol) {
						fm.kind = colKind || "free";
						fm.pinned = !!body.querySelector("#sv-id-pinned")?.checked;
						fm.updated = C.today();
					}
					if (kind === "platform") {
						fm.maker = val("#sv-id-maker");
						const y = parseInt(val("#sv-id-year"), 10);
						fm.year = Number.isFinite(y) ? y : "";
						fm.generation = val("#sv-id-gen");
					}
				});
				m.close();
				V.toast("Identidade salva", { tone: "ok", icon: "check" });
				setTimeout(() => V.refresh?.(), 350);
			} catch (err) {
				console.error("Game Library: identidade", err);
				V.toast(`Não foi possível salvar: ${err.message}`, { tone: "error" });
				btn.disabled = false;
			}
		});
	}
}
