// ==========================================================================
// Game Library — Insights (Conquistas, Tier List, Estatísticas,
// RetroAchievements, Configurações, página de conquista)
//
// Acesso: customJS.SteamVaultInsights
// ==========================================================================

class SteamVaultInsights {

	// ============================================================ CONQUISTAS
	achievements(ctx) {
		const { U, C, model } = ctx;
		const games = model.games.filter(g => g.ach.state === "known" && g.ach.total);
		const all = games.flatMap(g => g.achievements.map(a => ({ a, g })));
		const s = model.stats;
		const recent = all.filter(x => x.a.unlocked && x.a.unlockedDate).sort((x, y) => (y.a.unlockedDate + y.a.unlockedTime).localeCompare(x.a.unlockedDate + x.a.unlockedTime)).slice(0, 8);
		const rarest = all.filter(x => x.a.unlocked && x.a.rarity !== null).sort((x, y) => x.a.rarity - y.a.rarity).slice(0, 6);
		const byTier = { legendary: 0, epic: 0, rare: 0, uncommon: 0, common: 0 };
		for (const x of all) if (x.a.unlocked && x.a.rarity !== null) byTier[U.rarityTier(x.a.rarity)]++;
		const sorted = [...games].sort((a, b) => (b.ach.perfect - a.ach.perfect) || b.ach.pct - a.ach.pct);

		const row = g => `<a class="sv-achgame${g.ach.perfect ? " is-perfect" : ""}" ${U.openAttrs(g.path)}>
			${U.cover(g, { cls: "sv-cover--xs" })}
			<span class="sv-achgame-text"><b>${U.esc(g.title)}</b><span class="sv-meta"><span>${g.ach.unlocked} de ${g.ach.total}</span>${g.provider !== "unset" ? `<span>${U.esc(C.providerDefs[g.provider].short)}</span>` : ""}</span></span>
			<span class="sv-achgame-bar">${U.progressBar(g.ach.pct, { tone: g.ach.perfect ? "gold" : "" })}</span>
			<span class="sv-achgame-pct sv-num">${g.ach.perfect ? U.icon("gem") : ""}${U.fmtPct(g.ach.pctRound)}</span>
		</a>`;

		const html = `<div class="sv-page">
			<section class="sv-trophyhero">
				<div class="sv-trophyhero-inner">
					<div class="sv-cabinet-ring">${U.ring(s.achPct ?? 0, { size: 132, stroke: 8, perfect: s.achPct === 100 })}<div><b class="sv-num">${U.fmtPct(s.achPct === null ? null : Math.floor(s.achPct))}</b><span>de tudo</span></div></div>
					<div class="sv-trophyhero-text">
						<h1>Conquistas</h1>
						<p>${U.fmtNum(s.achUnlocked)} de ${U.fmtNum(s.achTotal)} desbloqueadas em ${U.plural(games.length, "jogo", "jogos")}.</p>
						${U.figures([
							{ label: "Jogos 100%", value: String(s.perfect), tone: s.perfect ? "gold" : "" },
							{ label: "Lendárias", value: String(byTier.legendary), sub: "até 5% dos jogadores" },
							{ label: "Épicas", value: String(byTier.epic), sub: "até 15%" },
							{ label: "Raras", value: String(byTier.rare), sub: "até 35%" }
						])}
					</div>
					${rarest.length ? `<div class="sv-showcase">${rarest.slice(0, 3).map(({ a, g }) => `<a class="sv-medallion sv-rarity-${U.rarityTier(a.rarity)}" ${U.openAttrs(a.path || g.path)}><div>${a.iconSrc ? `<img src="${U.attr(a.iconSrc)}" alt="">` : U.icon("trophy")}</div><span><b>${U.esc(a.name)}</b><small>${U.esc(g.title)}</small><em>${U.fmtPct(a.rarity)}</em></span></a>`).join("")}</div>` : ""}
				</div>
			</section>
			<div class="sv-pad">
				${ctx.A ? ctx.A.statsBlock(ctx) : ""}
				${!games.length ? U.empty({ icon: "trophy", title: "Nenhuma conquista registrada", text: "Sincronize jogos Steam com seu perfil público, importe do RetroAchievements ou adicione conquistas manualmente na ficha de um jogo.", action: `<a class="sv-btn sv-btn--primary" ${U.openAttrs("Dashboard/Steam")}>${U.icon("user")}<span>Perfil Steam</span></a>` }) : `
				<div class="sv-split">
					<section class="sv-split-main">
						${U.sectionHead("Progresso por jogo", { count: games.length })}
						<div class="sv-achgames">${sorted.map(row).join("")}</div>
					</section>
					<aside class="sv-split-side">
						${recent.length ? `${U.sectionHead("Desbloqueadas recentemente")}<div class="sv-achlist sv-achlist--compact">${recent.map(({ a, g }) => U.achievementTile(a, { showGame: g })).join("")}</div>` : ""}
					</aside>
				</div>`}
			</div>
		</div>`;
		return { active: "achievements", html };
	}

	// ============================================================== TIER LIST
	tierlist(ctx) {
		const { U, model } = ctx;
		const tiers = [["S", "Obras-primas"], ["A", "Excelentes"], ["B", "Muito bons"], ["C", "Bons"], ["D", "Esquecíveis"]];
		const eligible = model.games.filter(g => g.status !== "Wishlist");
		const byTier = t => eligible.filter(g => g.tier === t).sort((a, b) => (a.tierOrder ?? 999) - (b.tierOrder ?? 999) || a.title.localeCompare(b.title));
		const unranked = eligible.filter(g => !tiers.some(([t]) => t === g.tier));
		const tile = g => `<div class="sv-tiletier" draggable="true" data-tier-game="${U.attr(g.path)}" data-tier="${U.attr(g.tier)}" data-order="${g.tierOrder ?? ""}" title="${U.attr(g.title)}"><a ${U.openAttrs(g.path)}>${U.cover(g)}</a><span>${U.esc(g.title)}</span></div>`;
		const html = `<div class="sv-page sv-pad">
			${U.pageHead("Tier List", { sub: "Arraste as capas entre as faixas (no celular: toque na capa e depois na faixa). A ordem dentro da faixa também é salva." })}
			<div class="sv-tiers">${tiers.map(([t, label]) => `<div class="sv-tier sv-tier--${t.toLowerCase()}">
				<div class="sv-tier-label"><b>${t}</b><span>${U.esc(label)}</span></div>
				<div class="sv-tier-zone" data-tier-zone="${t}">${byTier(t).slice(0, 40).map(tile).join("")}</div>
			</div>`).join("")}</div>
			<section class="sv-block">${U.sectionHead("Sem classificação", { count: unranked.length })}
				<div class="sv-tier-zone sv-tier-zone--pool" data-tier-zone="">${unranked.slice(0, 60).map(tile).join("") || `<p class="sv-muted">${model.games.length ? "Todos os jogos já estão classificados." : "Nenhum jogo no vault ainda."}</p>`}</div>
			</section>
		</div>`;
		// 3.59.0: a faixa "Sem classificação" pode ter centenas de capas (uma
		// biblioteca Steam importada inteira). Entram as 60 primeiras; o resto
		// é montado em partes quando o aparelho fica livre
		// 3.68.0: o mesmo vale para as faixas S–D (com centenas de jogos
		// classificados, eram centenas de capas montadas de uma vez): as 40
		// primeiras de cada faixa entram na hora, o resto em partes
		// 1.14.1: o resto já não é montado todo em segundo plano (com centenas
		// de capas por faixa a rolagem passava de 50 ms por quadro): cada faixa
		// recebe mais capas quando a rolagem chega perto do fim dela
		const queue = [...tiers.map(([t]) => ({ zone: t, items: byTier(t).slice(40) })), { zone: "", items: unranked.slice(60) }].filter(q => q.items.length);
		const more = zone => {
			const q = zone === undefined ? queue[0] : queue.find(x => x.zone === zone);
			if (!q) return null;
			const html = q.items.splice(0, 60).map(tile).join("");
			if (!q.items.length) queue.splice(queue.indexOf(q), 1);
			return { zone: q.zone, html, left: q.items.length };
		};
		more.has = zone => queue.some(x => x.zone === zone);
		return { active: "tierlist", html, wire: root => this._wireTier(root, ctx, queue.length ? more : null) };
	}

	_wireTier(root, ctx, more = null) {
		let dragging = null;
		// monta na hora tudo o que falta (antes de arrastar ou gravar: a ordem
		// gravada precisa ver a faixa inteira)
		const flushAll = () => { if (!more) return; let c; while ((c = more())) append(c); };
		const append = c => {
			const zone = root.querySelector(`[data-tier-zone="${c.zone}"]`);
			if (!zone) return;
			const tpl = document.createElement("template");
			tpl.innerHTML = c.html;
			ctx.V?._wireImages?.(tpl.content);
			zone.appendChild(tpl.content);
		};
		if (more) {
			// 3.64.0: monta só com a rolagem parada (montar no meio do gesto
			// pesava os quadros) e em partes menores
			const scroller = root.closest(".sv-layer") || document.querySelector(".sv-layer") || window;
			const alive = () => root.querySelector("[data-tier-zone]")?.isConnected;
			let lastScroll = 0, io = null;
			// 3.66.0: o rolador é permanente; o ouvinte sai quando a Tier List sai da tela
			const stop = () => { scroller.removeEventListener("scroll", onScroll); io?.disconnect(); };
			const onScroll = () => { if (!alive()) return stop(); lastScroll = performance.now(); };
			scroller.addEventListener("scroll", onScroll, { passive: true });
			const later = fn => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 600 }) : setTimeout(fn, 32));
			const want = new Set();
			let busy = false;
			const pump = () => {
				if (!alive()) return stop();
				if (performance.now() - lastScroll < 180) { setTimeout(() => later(pump), 120); return; }
				const zone = want.values().next().value;
				if (zone === undefined) { busy = false; return; }
				want.delete(zone);
				const c = more(zone);
				if (c) { append(c); if (c.left) watch(zone); }
				later(pump);
			};
			const ask = zone => { want.add(zone); if (!busy) { busy = true; later(pump); } };
			// a última capa montada de cada faixa avisa quando chega perto da tela
			const watch = zone => {
				const z = root.querySelector(`[data-tier-zone="${zone}"]`);
				const last = z?.querySelector("[data-tier-game]:last-of-type") || z?.lastElementChild;
				if (!last) return;
				if (!io) return ask(zone);
				last.__svTierZone = zone;
				io.observe(last);
			};
			if (typeof IntersectionObserver === "function") {
				io = new IntersectionObserver(es => {
					for (const e of es) if (e.isIntersecting) { io.unobserve(e.target); ask(e.target.__svTierZone); }
				}, { root: scroller === window ? null : scroller, rootMargin: "0px 0px 900px 0px" });
			}
			// faixas com capas por montar
			root.querySelectorAll("[data-tier-zone]").forEach(z => { if (more.has?.(z.dataset.tierZone)) watch(z.dataset.tierZone); });
		}
		// grava só as capas cuja faixa ou posição mudou (cada gravação
		// redesenha a tela; antes a faixa inteira era regravada)
		const save = async zone => {
			const tier = zone.dataset.tierZone;
			const items = [...zone.querySelectorAll("[data-tier-game]")];
			for (let i = 0; i < items.length; i++) {
				const el = items[i], order = tier ? String(i + 1) : "";
				if ((el.dataset.tier || "") === tier && (el.dataset.order || "") === order) continue;
				const f = app.vault.getAbstractFileByPath(el.dataset.tierGame);
				if (f) await app.fileManager.processFrontMatter(f, fm => { fm.tier = tier; fm.tierOrder = tier ? i + 1 : ""; });
				el.dataset.tier = tier; el.dataset.order = order;
			}
		};
		const commit = async (to, from) => {
			flushAll();
			await save(to);
			if (from && from !== to) await save(from);
			ctx.C.invalidate();
		};
		// delegado: vale também para as capas montadas depois
		root.addEventListener("dragstart", e => {
			const el = e.target.closest?.("[data-tier-game]");
			if (!el || !root.contains(el)) return;
			flushAll();
			dragging = el; el.classList.add("is-dragging"); e.dataTransfer.effectAllowed = "move";
		});
		root.addEventListener("dragend", e => {
			const el = e.target.closest?.("[data-tier-game]");
			if (el) el.classList.remove("is-dragging");
			dragging = null;
		});
		root.querySelectorAll("[data-tier-zone]").forEach(zone => {
			zone.addEventListener("dragover", e => {
				if (!dragging) return;
				e.preventDefault();
				zone.classList.add("is-over");
				const after = [...zone.querySelectorAll("[data-tier-game]:not(.is-dragging)")].find(c => { const r = c.getBoundingClientRect(); return e.clientX < r.left + r.width / 2 && e.clientY < r.bottom; });
				after ? zone.insertBefore(dragging, after) : zone.appendChild(dragging);
			});
			zone.addEventListener("dragleave", () => zone.classList.remove("is-over"));
			zone.addEventListener("drop", async e => {
				e.preventDefault(); zone.classList.remove("is-over");
				await commit(zone, dragging?.closest("[data-tier-zone]"));
			});
		});

		// toque (o arrastar do HTML não funciona com o dedo): toque numa capa
		// para pegá-la; toque numa faixa (vai para o fim) ou em outra capa
		// (entra antes dela) para soltar; toque de novo na mesma para abrir
		if (!root.classList.contains("is-touch")) return;
		let picked = null;
		const drop = () => { picked?.classList.remove("is-picked"); picked = null; root.querySelector(".sv-tiers")?.classList.remove("is-picking"); };
		root.addEventListener("click", async e => {
			const tileEl = e.target.closest("[data-tier-game]");
			const zone = e.target.closest("[data-tier-zone]");
			if (!zone || !root.contains(zone)) { if (picked && !e.target.closest(".sv-tier")) drop(); return; }
			if (tileEl && tileEl === picked) { drop(); return; } // segue para abrir o jogo
			e.preventDefault(); e.stopPropagation();
			if (!picked) {
				if (!tileEl) return;
				flushAll();
				picked = tileEl; tileEl.classList.add("is-picked");
				root.querySelector(".sv-tiers")?.classList.add("is-picking");
				ctx.V?._haptic?.();
				if (!window.__svTierHint) { window.__svTierHint = true; ctx.V?.toast("Toque numa faixa para mover. Toque de novo na capa para abrir o jogo.", { icon: "layers" }); }
				return;
			}
			const from = picked.closest("[data-tier-zone]");
			tileEl ? zone.insertBefore(picked, tileEl) : zone.appendChild(picked);
			const moved = picked; drop();
			moved.classList.add("is-placed"); setTimeout(() => moved.classList.remove("is-placed"), 500);
			ctx.V?._haptic?.(12);
			await commit(zone, from);
		}, true);
	}

	// ============================================================ ESTATÍSTICAS
	// analytics de jogo: insights primeiro, gráfico só quando ajuda
	// ============================================================ ESTATÍSTICAS
	// Período (Tudo / ano / 12 meses / 30 dias) e abas ficam lembrados neste
	// dispositivo. "Tudo" usa o tempo total do jogo (inclui a Steam); os demais
	// períodos só contam o que tem data: sessões, zeradas, conquistas, compras.
	_stPeriods() {
		return { all: "Tudo", year: "Este ano", "12m": "12 meses", "30d": "30 dias" };
	}
	_stTabs() {
		return { overview: ["Visão geral", "chart"], time: ["Tempo", "clock"], taste: ["Gosto", "heart"], ach: ["Conquistas", "trophy"], money: ["Dinheiro", "coins"], years: ["Ano a ano", "calendar"], compare: ["Comparar", "layers"] };
	}
	_stIso(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
	_stRange(C, period) {
		const today = C.today(), t = new Date(today + "T00:00:00");
		const back = n => { const d = new Date(t); d.setDate(d.getDate() - n); return this._stIso(d); };
		if (period === "year") {
			const y = t.getFullYear(), py = new Date(t); py.setFullYear(y - 1);
			return { from: `${y}-01-01`, to: today, prevFrom: `${y - 1}-01-01`, prevTo: this._stIso(py), label: `em ${y}`, prevLabel: `${y - 1} até hoje` };
		}
		if (period === "12m") return { from: back(364), to: today, prevFrom: back(729), prevTo: back(365), label: "nos últimos 12 meses", prevLabel: "12 meses anteriores" };
		if (period === "30d") return { from: back(29), to: today, prevFrom: back(59), prevTo: back(30), label: "nos últimos 30 dias", prevLabel: "30 dias anteriores" };
		return { from: "", to: today, label: "desde o início", all: true };
	}

	// números de um intervalo [from, to]
	_stWindow(ctx, from, to, all) {
		const { C, model } = ctx;
		const inR = d => !!d && (!from || d >= from) && d <= to;
		const games = model.games;
		const hoursBy = new Map();
		let sessions = 0, sessionHours = 0;
		for (const g of games) for (const s of g.sessions) {
			const d = C.iso(s.date); if (!inR(d)) continue;
			const h = C.num(s.hours) || 0; sessions++; sessionHours += h;
			hoursBy.set(g, (hoursBy.get(g) || 0) + h);
		}
		const doneDates = g => [g.completionDate, ...g.playthroughs.map(r => C.iso(r.end))].filter(Boolean);
		const completedList = all ? games.filter(g => g.status === "Completed" || g.completionDate) : games.filter(g => doneDates(g).some(inR));
		const unlocked = [];
		for (const g of games) for (const a of g.achievements) if (a.unlocked && (all || inR(a.unlockedDate))) unlocked.push({ a, g });
		const bought = games.filter(g => g.price > 0 && (all || inR(g.dateAdded)));
		if (all) for (const g of games) hoursBy.set(g, g.playtime.hours);
		return {
			games: all ? games.length : games.filter(g => inR(g.dateAdded)).length,
			hours: all ? model.stats.hours : sessionHours, sessions, sessionHours,
			completed: completedList.length, completedList,
			ach: unlocked.length, unlocked,
			spent: bought.reduce((t, g) => t + g.price, 0), bought,
			hoursBy
		};
	}

	statistics(ctx) {
		const { U, C, model } = ctx;
		const g = model.games, s = model.stats;
		if (!g.length) return { active: "statistics", html: `<div class="sv-page sv-pad">${U.pageHead("Estatísticas")}${U.empty({ icon: "chart", title: "Sem dados ainda", text: "Estatísticas aparecem conforme você adiciona jogos e registra o que jogou." })}</div>` };
		let period = U._store("statsPeriod") || "all";
		if (!this._stPeriods()[period]) period = "all";
		let tab = U._store("statsTab") || "overview";
		if (!this._stTabs()[tab]) tab = "overview";
		const R = this._stRange(C, period);
		const W = this._stWindow(ctx, R.from, R.to, R.all);
		const P = R.all ? null : this._stWindow(ctx, R.prevFrom, R.prevTo, false);
		const top = [...W.hoursBy].filter(([, h]) => h > 0).sort((a, b) => b[1] - a[1]);
		window.__svStatsShare = { period, label: this._stPeriods()[period], range: R, W, top: top.slice(0, 3).map(([x, h]) => ({ g: x, h })) };

		const panels = {
			overview: () => this._stOverview(ctx, R, W, P),
			time: () => this._stTime(ctx, R, W),
			taste: () => this._stTaste(ctx, R, W),
			ach: () => this._stAch(ctx, R, W, P),
			money: () => this._stMoney(ctx, R, W),
			years: () => this._stYears(ctx),
			compare: () => this._stCompare(ctx)
		};
		const actions = `${U.btn("Compartilhar resumo", { icon: "share", kind: "secondary", attrs: 'data-st-share' })}${ctx.X ? U.btn(`Retrospectiva ${new Date().getFullYear()}`, { icon: "sparkles", kind: "primary", action: "stories" }) : ""}`;
		const html = `<div class="sv-page sv-pad sv-stpage">
			${U.pageHead("Estatísticas", { sub: `${U.plural(s.games, "jogo", "jogos")}, ${U.fmtHours(s.hours)} no total`, actions })}
			<div class="sv-stbar">
				<div class="sv-segmented sv-stperiod" role="radiogroup" aria-label="Período">${Object.entries(this._stPeriods()).map(([k, l]) => `<button type="button" data-st-period="${k}" class="${k === period ? "is-active" : ""}" aria-checked="${k === period}">${U.esc(l)}</button>`).join("")}</div>
			</div>
			<nav class="sv-sttabs" role="tablist" aria-label="Seções das estatísticas">${Object.entries(this._stTabs()).map(([k, [l, i]]) => `<button type="button" role="tab" data-st-tab="${k}" class="sv-sttab${k === tab ? " is-active" : ""}" aria-selected="${k === tab}">${U.icon(i)}<span>${U.esc(l)}</span></button>`).join("")}</nav>
			${Object.keys(panels).map(k => k === tab ? `<section class="sv-stpanel" data-st-panel="${k}" role="tabpanel">${this._stBuild(panels, k)}</section>` : `<section class="sv-stpanel" data-st-panel="${k}" role="tabpanel" data-st-lazy hidden></section>`).join("")}
		</div>`;
		return { active: "statistics", html, wire: root => this._stWire(root, ctx, panels) };
	}

	// ---- peças comuns
	_stDelta(cur, prev, { money = false, hours = false } = {}) {
		const U = customJS.SteamVaultUI;
		if (prev === null || prev === undefined) return "";
		const d = cur - prev;
		if (Math.abs(d) < (hours ? 0.05 : 0.5)) return `<small class="sv-stdelta is-flat">igual ao período anterior</small>`;
		const v = money ? U.fmtMoney(Math.abs(d)) : hours ? U.fmtHours(Math.abs(d)) : U.fmtNum(Math.round(Math.abs(d)));
		return `<small class="sv-stdelta ${d > 0 ? "is-up" : "is-down"}">${d > 0 ? "▲" : "▼"} ${v}</small>`;
	}
	_stKpis(items) {
		const U = customJS.SteamVaultUI;
		return `<div class="sv-stkpis">${items.filter(Boolean).map(k => `<div class="sv-stkpi${k.tone ? ` is-${k.tone}` : ""}"><span class="sv-stkpi-label">${k.icon ? U.icon(k.icon) : ""}${U.esc(k.label)}</span><b>${U.esc(k.value)}</b>${k.sub ? `<small>${U.esc(k.sub)}</small>` : ""}${k.delta || ""}</div>`).join("")}</div>`;
	}
	_stCard(title, body, { sub = "", cls = "", action = "" } = {}) {
		const U = customJS.SteamVaultUI;
		return `<section class="sv-surface sv-stcard${cls ? ` ${cls}` : ""}"><header class="sv-stcard-head"><div><h3>${U.esc(title)}</h3>${sub ? `<p>${U.esc(sub)}</p>` : ""}</div>${action}</header>${body}</section>`;
	}
	_stEmpty(text) { return `<p class="sv-stempty">${customJS.SteamVaultUI.esc(text)}</p>`; }

	// colunas verticais (um valor por categoria); a dica mostra o número
	_stCols(items, { tone = "var(--sv-blue)", fmt = v => String(v), short = null, highlightLast = false } = {}) {
		const U = customJS.SteamVaultUI;
		const max = Math.max(...items.map(i => i.value), 0);
		if (!max) return "";
		return `<div class="sv-stcols" style="--tone:${tone}" role="img" aria-label="${U.attr(items.map(i => `${i.title || i.label}: ${fmt(i.value)}`).join("; "))}">${items.map((i, k) => `<div class="sv-stcol${highlightLast && k === items.length - 1 ? " is-now" : ""}" title="${U.attr(`${i.title || i.label}: ${fmt(i.value)}`)}"><span class="sv-stcol-val">${i.value ? U.esc((short || fmt)(i.value)) : ""}</span><span class="sv-stcol-bar"><i style="height:${i.value ? Math.max(3, (i.value / max) * 100) : 0}%"></i></span><small>${U.esc(i.label)}</small></div>`).join("")}</div>`;
	}

	// colunas agrupadas por mês (uma cor por origem; legenda sempre visível)
	_stGroupCols(months, series) {
		const U = customJS.SteamVaultUI;
		const max = Math.max(0, ...months.flatMap(m => series.map(sr => m.v[sr.key] || 0)));
		if (!max) return "";
		return `<div class="sv-stlegend">${series.map(sr => `<span><i style="background:${sr.color}"></i>${U.esc(sr.label)}</span>`).join("")}</div>
			<div class="sv-stcols sv-stcols--group">${months.map(m => `<div class="sv-stcol" title="${U.attr(`${m.title}: ${series.map(sr => `${sr.label} ${m.v[sr.key] || 0}`).join(" · ")}`)}"><span class="sv-stcol-bar sv-stcol-bar--group">${series.map(sr => `<i style="height:${m.v[sr.key] ? Math.max(3, (m.v[sr.key] / max) * 100) : 0}%;background:${sr.color}"></i>`).join("")}</span><small>${U.esc(m.label)}</small></div>`).join("")}</div>`;
	}

	// rosca: no máximo 6 fatias + "Outros"; 2px de respiro entre fatias
	_stDonut(segs, { big = "", small = "", fmt = v => String(v) } = {}) {
		const U = customJS.SteamVaultUI;
		const list = [...segs].filter(x => x.value > 0).sort((a, b) => b.value - a.value);
		if (!list.length) return "";
		const main = list.slice(0, 6), rest = list.slice(6);
		if (rest.length) main.push({ label: `Outros (${rest.length})`, value: rest.reduce((t, x) => t + x.value, 0), color: "var(--sv-muted)" });
		const total = main.reduce((t, x) => t + x.value, 0);
		const R = 42, C2 = 2 * Math.PI * R, gap = main.length > 1 ? 1.6 : 0;
		let acc = 0;
		const arcs = main.map(x => {
			const len = Math.max(0, (x.value / total) * C2 - gap);
			const el = `<circle cx="50" cy="50" r="${R}" fill="none" stroke="${x.color}" stroke-width="12" stroke-dasharray="${len} ${C2 - len}" stroke-dashoffset="${-acc}" transform="rotate(-90 50 50)"><title>${U.esc(`${x.label}: ${fmt(x.value)} (${Math.round((x.value / total) * 100)}%)`)}</title></circle>`;
			acc += (x.value / total) * C2;
			return el;
		}).join("");
		return `<div class="sv-stdonut">
			<div class="sv-stdonut-chart"><svg viewBox="0 0 100 100" role="img" aria-label="${U.attr(main.map(x => `${x.label} ${fmt(x.value)}`).join(", "))}"><circle cx="50" cy="50" r="${R}" fill="none" stroke="var(--sv-surface-2)" stroke-width="12"/>${arcs}</svg><div><b>${U.esc(big)}</b><small>${U.esc(small)}</small></div></div>
			<ul class="sv-stdonut-legend">${main.map(x => `<li${x.href ? ` data-open="${U.attr(x.href)}"` : ""}><i style="background:${x.color}"></i><span>${U.esc(x.label)}</span><b>${U.esc(fmt(x.value))}</b><small>${Math.round((x.value / total) * 100)}%</small></li>`).join("")}</ul>
		</div>`;
	}

	// pontos: horas (x, raiz) × nota (y); rótulo nos extremos
	_stScatter(points) {
		const U = customJS.SteamVaultUI;
		if (points.length < 2) return "";
		const maxH = Math.max(1, ...points.map(p => p.h));
		const X = h => 8 + Math.sqrt(h / maxH) * 86, Y = r => 90 - (r / 5) * 80;
		const pA = [...points].sort((a, b) => b.h - a.h)[0], pB = [...points].sort((a, b) => (b.r * 10 - b.h / maxH) - (a.r * 10 - a.h / maxH))[0];
		const X0 = h => 8 + Math.sqrt(h / maxH) * 86;
		// dois rótulos só quando estão longe um do outro; o resto fica na dica
		const label = new Set(Math.abs(X0(pA.h) - X0(pB.h)) > 40 || Math.abs(pA.r - pB.r) >= 1.5 ? [pA, pB] : [pA]);
		const ticks = [0, 0.25, 0.5, 1].map(f => Math.round(maxH * f * f * 10) / 10);
		return `<div class="sv-stscatter">
			<div class="sv-stscatter-plot" role="img" aria-label="Nota por horas jogadas">
				${[1, 2, 3, 4, 5].map(r => `<span class="sv-stscatter-grid" style="top:${Y(r)}%"><small>${r}★</small></span>`).join("")}
				${points.map(p => `<a class="sv-stdot${label.has(p) ? " is-labeled" : ""}${X(p.h) > 55 ? " is-right" : ""}${Y(p.r) < 20 ? " is-below" : ""}" ${U.openAttrs(p.g.path)} style="left:${X(p.h)}%;top:${Y(p.r)}%" title="${U.attr(`${p.g.title}: ${U.fmtHours(p.h)}, nota ${U.fmtNum(p.r, 1)}`)}"><i></i>${label.has(p) ? `<span>${U.esc(p.g.title)}</span>` : ""}</a>`).join("")}
			</div>
			<div class="sv-stscatter-x">${ticks.map(t => `<small style="left:${X(t)}%">${U.esc(U.fmtHours(t))}</small>`).join("")}</div>
			<p class="sv-stnote">Acima e à esquerda: jogos que você adorou e jogou pouco. Abaixo e à direita: muitas horas, nota menor.</p>
		</div>`;
	}

	_stMonths(C, n = 12) {
		const t = new Date(C.today() + "T00:00:00"), out = [];
		const names = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
		for (let i = n - 1; i >= 0; i--) { const d = new Date(t.getFullYear(), t.getMonth() - i, 1); out.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: names[d.getMonth()], title: `${names[d.getMonth()]} ${d.getFullYear()}` }); }
		return out;
	}

	// ---- VISÃO GERAL
	_stOverview(ctx, R, W, P) {
		const { U, C, model } = ctx;
		const g = model.games, s = model.stats;
		const all = !!R.all;
		const kpis = this._stKpis([
			{ label: all ? "Jogos" : "Jogos adicionados", icon: "grid", value: U.fmtNum(W.games), delta: P ? this._stDelta(W.games, P.games) : "" },
			{ label: all ? "Horas jogadas" : "Horas em sessões", icon: "clock", value: U.fmtHours(W.hours), delta: P ? this._stDelta(W.hours, P.hours, { hours: true }) : "" },
			{ label: "Zerados", icon: "flag", value: U.fmtNum(W.completed), delta: P ? this._stDelta(W.completed, P.completed) : "" },
			{ label: "Conquistas", icon: "trophy", value: U.fmtNum(W.ach), sub: all && s.achTotal ? `de ${U.fmtNum(s.achTotal)}` : "", delta: P ? this._stDelta(W.ach, P.ach) : "" },
			{ label: "Gasto", icon: "coins", value: U.fmtMoney(W.spent), delta: P ? this._stDelta(W.spent, P.spent, { money: true }) : "" }
		]);
		const note = all ? "" : `<p class="sv-stnote">${U.esc(R.label[0].toUpperCase() + R.label.slice(1))}, comparado com ${U.esc(R.prevLabel)}. Horas por período vêm das sessões registradas.</p>`;

		// funil da biblioteca (sempre o total)
		const owned = g.filter(x => x.status !== "Wishlist");
		const started = owned.filter(x => !x.notPlayed && (x.status !== "Backlog" || x.playtime.hours > 0 || x.startDate || x.sessions.length));
		const done = owned.filter(x => x.status === "Completed" || x.completionDate);
		const perfect = owned.filter(x => C.isPerfect(x));
		const steps = [["Na biblioteca", owned.length, "grid"], ["Começados", started.length, "play"], ["Zerados", done.length, "flag"], ["100%", perfect.length, "gem"]];
		const funnel = `<ol class="sv-stfunnel">${steps.map(([l, n, i], k) => { const pct = owned.length ? (n / owned.length) * 100 : 0; const conv = k ? (steps[k - 1][1] ? Math.round((n / steps[k - 1][1]) * 100) : 0) : null; return `<li style="--w:${Math.max(pct, n ? 6 : 0)}%"><span class="sv-stfunnel-bar">${U.icon(i)}<b>${U.fmtNum(n)}</b><span>${U.esc(l)}</span></span>${conv !== null ? `<small>${conv}% da etapa anterior</small>` : `<small>sem a lista de desejos</small>`}</li>`; }).join("")}</ol>`;

		// backlog no seu ritmo
		const backlog = g.filter(x => ["Backlog", "Paused", "Playing"].includes(x.status));
		const doneHours = done.map(x => x.playtime.hours).filter(h => h > 0).sort((a, b) => a - b);
		const median = doneHours.length ? doneHours[Math.floor(doneHours.length / 2)] : 20;
		const left = backlog.reduce((t, x) => t + Math.max(0, (x.estimatedHours || median) - (x.status === "Backlog" ? 0 : x.playtime.hours)), 0);
		const recent = this._stWindow(ctx, this._stRange(C, "12m").from, C.today(), false);
		const pace = recent.sessionHours / 52 || (s.hours && g.length ? 0 : 0);
		const est = pace > 0.1 ? left / pace : null;
		const backlogCard = backlog.length ? this._stCard("Backlog no seu ritmo", `<div class="sv-stbig"><b>${est !== null ? (est < 8 ? `${Math.max(1, Math.round(est))} sem.` : est < 104 ? `${Math.round(est / 4.35)} meses` : `${(est / 52).toFixed(1).replace(".", ",")} anos`) : `~${U.fmtHours(left)}`}</b><span>${est !== null ? `para terminar ${U.plural(backlog.length, "jogo", "jogos")} (~${U.fmtHours(left)}) jogando ${U.fmtHours(pace)} por semana` : `para terminar ${U.plural(backlog.length, "jogo", "jogos")}. Registre sessões para ver o prazo em semanas.`}</span></div><p class="sv-stnote">Usa o tempo estimado de cada jogo; sem ele, a mediana dos seus zerados (${U.fmtHours(median)}).</p>`) : "";

		// zerados por ano, com as capas
		const byYear = [...C.groupBy(g.filter(x => x.completionDate), x => x.completionDate.slice(0, 4))].sort((a, b) => b[0].localeCompare(a[0]));
		const years = byYear.length ? this._stCard("Zerados por ano", `<div class="sv-styears">${byYear.map(([y, l]) => `<div class="sv-styear"><div class="sv-styear-head"><b>${y}</b><span>${U.plural(l.length, "jogo", "jogos")}</span></div><div class="sv-styear-covers">${U.moreList(l.sort((a, b) => a.completionDate.localeCompare(b.completionDate)).map(x => `<a ${U.openAttrs(x.path)} title="${U.attr(`${x.title} · ${U.fmtDate(x.completionDate)}`)}">${U.cover(x)}</a>`), 18, "Ver todos")}</div></div>`).join("")}</div>`) : "";

		// do início ao fim (linha do tempo)
		const runs = g.filter(x => x.startDate && x.completionDate && x.completionDate >= x.startDate).sort((a, b) => a.startDate.localeCompare(b.startDate));
		// a linha do tempo mostra as mais recentes primeiro; as antigas sob demanda
		const runsRecent = [...runs].sort((a, b) => b.completionDate.localeCompare(a.completionDate));
		let gantt = "";
		if (runs.length) {
			const t0 = Date.parse(runs[0].startDate), t1 = Math.max(...runs.map(x => Date.parse(x.completionDate)));
			const span = Math.max(1, t1 - t0);
			gantt = this._stCard("Do início ao fim", `<div class="sv-stgantt">${U.moreList(runsRecent.map(x => { const a = ((Date.parse(x.startDate) - t0) / span) * 100, b = ((Date.parse(x.completionDate) - t0) / span) * 100; const days = C.daysBetween(x.startDate, x.completionDate); return `<a class="sv-stgantt-row" ${U.openAttrs(x.path)} title="${U.attr(`${x.title}: ${U.fmtDate(x.startDate)} → ${U.fmtDate(x.completionDate)}`)}"><span class="sv-stgantt-name">${U.esc(x.title)}</span><span class="sv-stgantt-track"><i style="left:${a}%;width:${Math.max(1.5, b - a)}%"></i></span><span class="sv-stgantt-days">${days} ${days === 1 ? "dia" : "dias"}</span></a>`; }), 12, "Mostrar as mais antigas")}<div class="sv-stgantt-axis"><small>${U.esc(U.fmtDate(runs[0].startDate))}</small><small>${U.esc(U.fmtDate(new Date(t1).toISOString().slice(0, 10)))}</small></div></div>`, { sub: "Do dia em que começou ao dia em que zerou" });
		}

		// destaques (sempre o total, como antes)
		const topAll = [...g].sort((a, b) => b.playtime.hours - a.playtime.hours);
		const topShare = s.hours ? Math.round((topAll.slice(0, 3).reduce((x, y) => x + y.playtime.hours, 0) / s.hours) * 100) : 0;
		const durations = runs.map(x => ({ g: x, days: C.daysBetween(x.startDate, x.completionDate) })).sort((a, b) => a.days - b.days);
		const perHourPaid = g.filter(x => x.price > 0 && x.playtime.hours > 0).map(x => ({ g: x, v: x.price / x.playtime.hours })).sort((a, b) => a.v - b.v);
		const insights = [
			topAll[0] && s.hours ? { big: `${topShare}%`, text: `do seu tempo está em ${topAll.slice(0, 3).map(x => x.title).join(", ")}.` } : null,
			s.achTotal ? { big: U.fmtPct(Math.floor(s.achPct)), text: `das conquistas conhecidas desbloqueadas; ${U.fmtNum(s.achTotal - s.achUnlocked)} ainda esperando.` } : null,
			durations.length ? { big: `${durations[0].days} ${durations[0].days === 1 ? "dia" : "dias"}`, text: `foi a zerada mais rápida (${durations[0].g.title}).` } : null,
			perHourPaid.length ? { big: U.fmtMoney(perHourPaid[0].v), text: `por hora em ${perHourPaid[0].g.title}, o melhor custo-benefício.` } : null
		].filter(Boolean);

		return `${kpis}${note}
			${this._stAwardsStrip(ctx)}
			${insights.length ? `<section class="sv-insights sv-stinsights">${insights.map(i => `<article class="sv-insight"><b>${U.esc(i.big)}</b><p>${U.esc(i.text)}</p></article>`).join("")}</section>` : ""}
			<div class="sv-stgrid">
				${this._stCard("Funil da biblioteca", funnel, { sub: "Do que você tem até o 100%" })}
				${this._stCard("Status", ctx.P.statusBreakdown(ctx))}
				${backlogCard}
				${years}
			</div>
			${gantt}
			${ctx.X ? ctx.X.goalsBlock(ctx) : ""}`;
	}

	// prêmios do ano em uma faixa só
	_stAwardsStrip(ctx) {
		const { U, C, model, current } = ctx;
		const all = C.arr(current?.awards).filter(a => a && typeof a === "object");
		if (!all.length) return "";
		const year = [...new Set(all.map(a => String(a.year)))].sort().reverse()[0];
		const list = all.filter(a => String(a.year) === year).map(a => ({ a, g: model.gamesByPath.get(C.str(a.gamePath)) }));
		return `<section class="sv-block sv-stawards">${U.sectionHead(`Prêmios de ${year}`, { action: U.btn("Editar", { icon: "edit", kind: "ghost", size: "sm", action: "legacy", attrs: 'data-legacy="awards"' }) })}
			<div class="sv-stawards-track">${list.map(({ a, g }) => `<${g ? `a ${U.openAttrs(g.path)}` : "div"} class="sv-staward">${g ? U.cover(g) : `<div class="sv-cover is-missing"></div>`}<span><small>${U.esc(a.category)}</small><b>${g ? U.esc(g.title) : "Jogo não encontrado"}</b></span></${g ? "a" : "div"}>`).join("")}</div></section>`;
	}

	// ---- TEMPO
	// 3.64.0: planejador de backlog. Quanto falta (tempo estimado do jogo, ou
	// a mediana do que você levou para zerar jogos do mesmo gênero), o seu
	// ritmo real (sessões das últimas 12 semanas) e uma fila sugerida.
	_stPlanData(ctx) {
		const { C, model } = ctx;
		const today = C.today();
		const med = list => { const a = list.filter(n => n > 0).sort((x, y) => x - y); return a.length ? a[Math.floor((a.length - 1) / 2)] : null; };
		const done = model.games.filter(g => (g.status === "Completed" || g.completionDate) && g.playtime.hours > 0);
		const byGenre = new Map();
		for (const g of done) for (const ge of g.genres.slice(0, 1)) { const k = C.normalizeKey(ge); if (!byGenre.has(k)) byGenre.set(k, []); byGenre.get(k).push(g.playtime.hours); }
		const overall = med(done.map(g => g.playtime.hours)) || 15;
		const pend = model.games.filter(g => ["Backlog", "Paused", "Playing"].includes(g.status));
		const items = pend.map(g => {
			const own = g.estimatedHours > 0 ? g.estimatedHours : null;
			const gm = g.genres[0] ? med(byGenre.get(C.normalizeKey(g.genres[0])) || []) : null;
			const est = own || gm || overall;
			const played = g.playtime.hours || 0;
			const left = Math.max(g.status === "Backlog" && !played ? est : est - played, 0.5);
			return { g, est, left: Math.round(left * 10) / 10, guess: !own, prio: { Alta: 0, "Média": 1, Baixa: 2 }[g.priority] ?? 3 };
		});
		const total = items.reduce((t, x) => t + x.left, 0);
		const from = (() => { const d = new Date(today + "T00:00:00"); d.setDate(d.getDate() - 83); return C.localIso(d); })();
		let recent = 0;
		for (const g of model.games) for (const se of g.sessions) { const d = C.iso(se.date); if (d && d >= from && d <= today) recent += C.num(se.hours) || 0; }
		const steam2w = model.games.reduce((t, g) => t + (g.steam?.playtime2Weeks || 0), 0);
		const pace = recent > 0 ? recent / 12 : steam2w > 0 ? steam2w / 2 : 0;
		const weeks = pace > 0 ? total / pace : null;
		const end = weeks !== null ? (() => { const d = new Date(today + "T00:00:00"); d.setDate(d.getDate() + Math.ceil(weeks * 7)); return C.localIso(d); })() : "";
		const queue = [...items].sort((a, b) => a.prio - b.prio || (a.g.status === "Backlog") - (b.g.status === "Backlog") || a.left - b.left || a.g.title.localeCompare(b.g.title));
		return { items, total, pace, weeks, end, queue, guesses: items.filter(x => x.guess).length, paceFromSteam: !(recent > 0) && steam2w > 0 };
	}
	_stPlanner(ctx) {
		const { U, C } = ctx;
		const d = this._stPlanData(ctx);
		if (!d.items.length) return this._stCard("Planejador de backlog", this._stEmpty("Nada no backlog, pausado ou em andamento. Bom trabalho!"));
		const kpis = this._stKpis([
			{ label: "Jogos pendentes", icon: "books", value: U.fmtNum(d.items.length), sub: "backlog, pausados e jogando" },
			{ label: "Faltam", icon: "clock", value: `~${U.fmtHours(d.total)}`, sub: d.guesses ? `${d.guesses} por estimativa` : "pelo tempo estimado" },
			{ label: "Seu ritmo", icon: "pulse", value: d.pace > 0 ? `${U.fmtHours(d.pace)}/sem.` : "—", sub: d.pace > 0 ? (d.paceFromSteam ? "pelas 2 últimas semanas na Steam" : "nas últimas 12 semanas") : "registre sessões" },
			d.end ? { label: "Termina tudo em", icon: "flag", value: d.weeks > 104 ? `${Math.round(d.weeks / 52)} anos` : d.weeks > 8 ? `${Math.round(d.weeks / 4.35)} meses` : U.plural(Math.max(1, Math.round(d.weeks)), "semana", "semanas"), sub: U.fmtDate(d.end) } : null
		]);
		const prio = { 0: "Alta", 1: "Média", 2: "Baixa" };
		const row = (x, i) => `<li><a class="sv-plan-row" ${U.openAttrs(x.g.path)}><span class="sv-plan-n">${i + 1}</span>${U.cover(x.g, { cls: "sv-cover--xs" })}<span class="sv-plan-text"><b>${U.esc(x.g.title)}</b><small>${U.esc(C.statusLabel(x.g.status))}${prio[x.prio] ? ` · prioridade ${prio[x.prio].toLowerCase()}` : ""}</small></span><span class="sv-plan-left${x.guess ? " is-guess" : ""}" title="${x.guess ? "Estimativa pela mediana dos seus jogos zerados" : "Pelo tempo estimado da ficha"}">${x.guess ? "~" : ""}${U.esc(U.fmtHours(x.left))}</span></a></li>`;
		return this._stCard("Planejador de backlog", `${kpis}
			<h4 class="sv-plan-title">Fila sugerida</h4>
			<ol class="sv-plan">${d.queue.slice(0, 5).map(row).join("")}</ol>
			<p class="sv-plan-note">Ordem: prioridade, depois o que já está em andamento e o que acaba mais rápido. "~" = estimativa pela mediana do que você levou para zerar jogos do mesmo gênero; preencha o tempo estimado na ficha para afinar.</p>`, { sub: "Quanto falta e quando você termina, no seu ritmo" });
	}

	_stTime(ctx, R, W) {
		const { U, C, model } = ctx;
		const days = new Map();
		for (const e of C.activity(model, { limit: 100000 })) days.set(e.date, (days.get(e.date) || 0) + (e.type === "achievement" ? e.achievements.length : 1));
		const months = this._stMonths(C);
		const mh = new Map(months.map(m => [m.key, 0])), me = new Map(months.map(m => [m.key, 0]));
		for (const g of model.games) for (const se of g.sessions) { const d = C.iso(se.date); if (d && mh.has(d.slice(0, 7))) mh.set(d.slice(0, 7), mh.get(d.slice(0, 7)) + (C.num(se.hours) || 0)); }
		for (const [d, n] of days) if (me.has(d.slice(0, 7))) me.set(d.slice(0, 7), me.get(d.slice(0, 7)) + n);
		const useH = [...mh.values()].some(v => v > 0);
		const monthCols = this._stCols(months.map(m => ({ label: m.label, title: m.title, value: useH ? Math.round(mh.get(m.key) * 10) / 10 : me.get(m.key) })), { fmt: v => useH ? U.fmtHours(v) : U.plural(v, "evento", "eventos"), short: v => useH ? U.fmtHours(v).replace(" h", "h") : U.fmtNum(v), highlightLast: true });

		// hábitos (dentro do período)
		const inR = d => !!d && (!R.from || d >= R.from) && d <= R.to;
		const wd = [0, 0, 0, 0, 0, 0, 0], names = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
		const active = [...days.keys()].filter(inR).sort();
		for (const d of active) wd[new Date(d + "T00:00:00").getDay()] += days.get(d);
		const order = [1, 2, 3, 4, 5, 6, 0];
		const weekCols = this._stCols(order.map(i => ({ label: names[i], value: wd[i] })), { tone: "var(--sv-cyan, #4fc3f7)", fmt: v => U.plural(v, "evento", "eventos"), short: v => U.fmtNum(v) });
		const slots = [["Madrugada", 0, 5], ["Manhã", 6, 11], ["Tarde", 12, 17], ["Noite", 18, 23]];
		const times = W.unlocked.map(x => Number(String(x.a.unlockedTime || "").slice(0, 2))).filter(h => Number.isFinite(h) && String(h) !== "NaN");
		const slotN = slots.map(([l, a, b]) => ({ label: l, value: times.filter(h => h >= a && h <= b).length }));
		let best = 0, run = 0, prev = "";
		for (const d of active) { run = prev && C.daysBetween(prev, d) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = d; }
		const sess = model.games.flatMap(x => x.sessions.map(se => ({ d: C.iso(se.date), h: C.num(se.hours) || 0 }))).filter(x => inR(x.d));
		const favDay = Math.max(...wd) ? names[wd.indexOf(Math.max(...wd))] : "";
		const habits = this._stKpis([
			{ label: "Dias ativos", icon: "calendar", value: U.fmtNum(active.length), sub: R.label },
			{ label: "Maior sequência", icon: "flame", value: `${best} ${best === 1 ? "dia" : "dias"}` },
			{ label: "Sessão média", icon: "clock", value: sess.length ? U.fmtHours(sess.reduce((t, x) => t + x.h, 0) / sess.length) : "—", sub: U.plural(sess.length, "sessão", "sessões") },
			{ label: "Maior sessão", icon: "bolt", value: sess.length ? U.fmtHours(Math.max(...sess.map(x => x.h))) : "—" },
			favDay ? { label: "Dia favorito", icon: "star", value: favDay } : null
		]);
		return `${habits}
			${this._stPlanner(ctx)}
			${this._stCard("Atividade no último ano", this._stHeatmap(ctx, days), { sub: "Inícios, sessões, zeradas e conquistas com data. Toque num dia para ver o que aconteceu." })}
			<div class="sv-stgrid">
				${this._stCard(useH ? "Horas por mês" : "Atividade por mês", monthCols || this._stEmpty("Nada registrado nos últimos 12 meses."), { sub: useH ? "Horas registradas em sessões" : "Sem sessões com horas: conta os eventos" })}
				${this._stCard("Dias da semana", weekCols || this._stEmpty("Sem atividade no período."), { sub: `Em que dia você mais joga, ${R.label}` })}
				${this._stCard("Período do dia", times.length ? this._stCols(slotN, { tone: "var(--sv-amber, #e9bd52)", fmt: v => U.plural(v, "conquista", "conquistas"), short: v => U.fmtNum(v) }) : this._stEmpty("As conquistas sincronizadas trazem o horário; ainda não há nenhuma com hora neste período."), { sub: "Pela hora das conquistas desbloqueadas" })}
			</div>`;
	}

	_stHeatmap(ctx, days) {
		const { U } = ctx;
		const end = new Date(ctx.C.today() + "T00:00:00");
		const start = new Date(end); start.setDate(start.getDate() - 364 - start.getDay());
		const max = Math.max(1, ...days.values());
		const cells = [], monthsAt = [];
		const names = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
		let col = 0, lastM = -1, total = 0;
		for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
			const iso = this._stIso(d);
			if (d.getDay() === 0) { if (d.getMonth() !== lastM) { monthsAt.push([col, names[d.getMonth()]]); lastM = d.getMonth(); } col++; }
			const n = days.get(iso) || 0; total += n;
			const lvl = n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4));
			cells.push(`<i class="l${lvl}"${n ? ` data-st-day="${iso}"` : ""} title="${U.attr(U.fmtDate(iso))}: ${U.plural(n, "evento", "eventos")}"></i>`);
		}
		return `<div class="sv-stheat" data-st-heat>
			<div class="sv-stheat-scroll">
				<div class="sv-stheat-months" style="--cols:${col}">${monthsAt.map(([c, l]) => `<span style="--c:${c}">${l}</span>`).join("")}</div>
				<div class="sv-stheat-grid">${cells.join("")}</div>
			</div>
			<div class="sv-stheat-foot"><span>${U.plural(total, "evento", "eventos")} em 12 meses</span><span class="sv-stheat-legend">menos<i class="l0"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i>mais</span></div>
		</div>`;
	}

	// ---- GOSTO
	_stTaste(ctx, R, W) {
		const { U, C, model } = ctx;
		const B = ctx.B;
		const hoursOf = gm => W.hoursBy.get(gm) || 0;
		const useH = [...W.hoursBy.values()].some(h => h > 0);
		const val = gm => useH ? hoursOf(gm) : 1;
		const fmt = v => useH ? U.fmtHours(v) : U.plural(v, "jogo", "jogos");
		const pool = useH ? model.games.filter(gm => hoursOf(gm) > 0) : model.games;
		const ident = (kind, name, list) => { const page = (list || []).find(p => C.normalizeKey(p.title) === C.normalizeKey(name)); const id = B?.ident ? B.ident(ctx, kind, name, page) : { color: `hsl(${C.hashHue(name)} 60% 55%)` }; return { color: id.color, href: page?.path || "" }; };
		const genreMap = new Map();
		for (const gm of pool) { const gs = gm.genres.length ? gm.genres : ["Sem gênero"]; for (const x of gs) genreMap.set(x, (genreMap.get(x) || 0) + val(gm) / (useH ? gs.length : 1)); }
		const platMap = new Map();
		for (const gm of pool) platMap.set(gm.platform, (platMap.get(gm.platform) || 0) + val(gm));
		const total = [...platMap.values()].reduce((t, v) => t + v, 0);
		const gDonut = this._stDonut([...genreMap].map(([l, v]) => ({ label: l, value: Math.round(v * 10) / 10, ...ident("genre", l, model.genres) })), { big: String(genreMap.size), small: genreMap.size === 1 ? "gênero" : "gêneros", fmt });
		const pDonut = this._stDonut([...platMap].map(([l, v]) => ({ label: l, value: Math.round(v * 10) / 10, ...ident("platform", l, model.platforms) })), { big: useH ? U.fmtHours(total) : String(total), small: useH ? R.label : "jogos", fmt });

		// nota média por gênero e por plataforma
		const rated = model.games.filter(gm => gm.rating > 0);
		const avgBy = keyFn => { const m = new Map(); for (const gm of rated) for (const k of [].concat(keyFn(gm))) { const e = m.get(k) || { s: 0, n: 0 }; e.s += gm.rating; e.n++; m.set(k, e); } return [...m].map(([k, e]) => ({ label: k, value: e.s / e.n, n: e.n })).sort((a, b) => b.value - a.value || b.n - a.n); };
		const avgBars = list => list.length ? U.bars(list.slice(0, 8).map(x => ({ label: x.label, value: x.value, display: `${U.fmtNum(x.value, 1)} ★ · ${U.plural(x.n, "jogo", "jogos")}` })), { max: 5 }) : this._stEmpty("Avalie jogos para ver a média.");
		const dist = [5, 4, 3, 2, 1].map(r => ({ label: `${r}★`, value: rated.filter(x => Math.round(x.rating) === r).length }));
		const points = rated.filter(gm => gm.playtime.hours > 0).map(gm => ({ g: gm, h: gm.playtime.hours, r: gm.rating }));
		return `<div class="sv-stgrid">
				${this._stCard(useH ? "Gêneros por horas" : "Gêneros", gDonut || this._stEmpty("Nenhum jogo com horas neste período."), { sub: useH ? `Horas ${R.label}; jogo com vários gêneros divide as horas` : "Quantos jogos de cada gênero" })}
				${this._stCard(useH ? "Plataformas por horas" : "Plataformas", pDonut || this._stEmpty("Nenhum jogo com horas neste período."), { sub: "Cores da identidade de cada plataforma" })}
				${this._stCard("Nota média por gênero", avgBars(avgBy(gm => gm.genres.length ? gm.genres : ["Sem gênero"])))}
				${this._stCard("Nota média por plataforma", avgBars(avgBy(gm => gm.platform)))}
			</div>
			${points.length >= 2 ? this._stCard("Nota × horas", this._stScatter(points), { sub: "Cada ponto é um jogo avaliado; toque para abrir" }) : ""}
			${rated.length ? this._stCard("Suas notas", this._stCols(dist, { tone: "var(--sv-gold)", fmt: v => U.plural(v, "jogo", "jogos"), short: v => U.fmtNum(v) }), { sub: `Média ${U.fmtNum(model.stats.avgRating || 0, 1)} em ${U.plural(rated.length, "jogo avaliado", "jogos avaliados")}` }) : ""}`;
	}

	// ---- CONQUISTAS
	_stAch(ctx, R, W, P) {
		const { U, C, model } = ctx;
		const tiers = [["common", "Comuns"], ["uncommon", "Incomuns"], ["rare", "Raras"], ["epic", "Épicas"], ["legendary", "Lendárias"]];
		const tierOf = a => a.rarityTier || U.rarityTier(a.rarity);
		const counts = Object.fromEntries(tiers.map(([k]) => [k, 0]));
		let unknown = 0;
		for (const { a } of W.unlocked) { const t = tierOf(a); if (counts[t] !== undefined) counts[t]++; else unknown++; }
		const known = Object.values(counts).reduce((t, v) => t + v, 0);
		const rarity = known ? `<div class="sv-strarity">
			<div class="sv-strarity-bar" role="img" aria-label="Conquistas por raridade">${tiers.filter(([k]) => counts[k]).map(([k, l]) => `<span class="sv-rarity-${k}" style="flex:${counts[k]}" title="${U.attr(`${l}: ${counts[k]}`)}"></span>`).join("")}</div>
			<ul class="sv-strarity-legend">${tiers.map(([k, l]) => `<li class="sv-rarity-${k}"><i></i><span>${U.esc(l)}</span><b>${U.fmtNum(counts[k])}</b><small>${known ? Math.round((counts[k] / known) * 100) : 0}%</small></li>`).join("")}</ul>
			${unknown ? `<p class="sv-stnote">${U.plural(unknown, "conquista sem", "conquistas sem")} porcentagem de jogadores fica de fora.</p>` : ""}
		</div>` : this._stEmpty("Nenhuma conquista com raridade conhecida neste período.");
		const rarest = W.unlocked.filter(x => x.a.rarity !== null && x.a.rarity !== undefined).sort((a, b) => a.a.rarity - b.a.rarity).slice(0, 5);
		const rareList = rarest.length ? `<ol class="sv-strare">${rarest.map(({ a, g }, i) => `<li><a ${U.openAttrs(a.path || g.path)} class="sv-rarity-${tierOf(a)}"><span class="sv-strare-n">${i + 1}</span><span class="sv-strare-icon">${a.iconSrc ? `<img src="${U.attr(a.iconSrc)}" alt="" loading="lazy">` : U.icon("trophy")}</span><span class="sv-strare-text"><b>${U.esc(a.name)}</b><small>${U.esc(g.title)}${a.unlockedDate ? ` · ${U.esc(U.fmtDate(a.unlockedDate))}` : ""}</small></span><span class="sv-strare-pct">${U.fmtPct(a.rarity)}</span></a></li>`).join("")}</ol>` : this._stEmpty("Sem conquistas raras com data neste período.");

		// por mês e por origem
		const months = this._stMonths(C);
		const colors = { steam: "#1a9fff", retroachievements: "#e9bd52", xbox: "#3fbf6f", playstation: "#5c7cfa", gog: "#a970ff", epic: "#8fa3b8", googleplay: "#2fc4a4", nintendo: "#ff4554" };
		const byM = new Map(months.map(m => [m.key, {}]));
		const seen = new Set();
		for (const gm of model.games) for (const a of gm.achievements) { if (!a.unlocked || !a.unlockedDate) continue; const m = byM.get(a.unlockedDate.slice(0, 7)); if (!m) continue; const k = gm.provider; m[k] = (m[k] || 0) + 1; seen.add(k); }
		const series = [...seen].map(k => ({ key: k, label: C.providerLabel ? C.providerLabel(k) : k, color: colors[k] || "var(--sv-muted)" }));
		const grouped = this._stGroupCols(months.map(m => ({ label: m.label, title: m.title, v: byM.get(m.key) })), series);
		const s = model.stats;
		const kpis = this._stKpis([
			{ label: "Desbloqueadas", icon: "trophy", value: U.fmtNum(W.ach), sub: R.label, delta: P ? this._stDelta(W.ach, P.ach) : "" },
			{ label: "Do total", icon: "chart", value: s.achTotal ? U.fmtPct(Math.floor(s.achPct)) : "—", sub: s.achTotal ? `${U.fmtNum(s.achUnlocked)} de ${U.fmtNum(s.achTotal)}` : "" },
			{ label: "Lendárias", icon: "gem", value: U.fmtNum(counts.legendary), tone: counts.legendary ? "gold" : "" },
			{ label: "Jogos com 100%", icon: "medal", value: U.fmtNum(s.perfect), tone: s.perfect ? "gold" : "" }
		]);
		return `${kpis}
			<div class="sv-stgrid">
				${this._stCard("Raridade das suas conquistas", rarity, { sub: `Pela % de jogadores que têm cada uma, ${R.label}` })}
				${this._stCard("As mais raras", rareList, { sub: "Desbloqueadas por menos jogadores" })}
			</div>
			${this._stCard("Conquistas por mês", grouped || this._stEmpty("Nenhuma conquista com data nos últimos 12 meses."), { sub: "Nos últimos 12 meses, por origem" })}
			${ctx.H ? ctx.H.providerBreakdown(ctx) : ""}
			${ctx.A ? ctx.A.statsBlock(ctx) : ""}`;
	}

	// ---- DINHEIRO
	_stMoney(ctx, R, W) {
		const { U, C, model } = ctx;
		const g = model.games;
		const paid = W.bought;
		const total = paid.reduce((t, x) => t + x.price, 0);
		const hrs = paid.reduce((t, x) => t + x.playtime.hours, 0);
		const savings = paid.filter(x => x.regularPrice > x.price).map(x => ({ g: x, v: x.regularPrice - x.price, pct: Math.round((1 - x.price / x.regularPrice) * 100) })).sort((a, b) => b.v - a.v);
		const saved = savings.reduce((t, x) => t + x.v, 0);
		const kpis = this._stKpis([
			{ label: "Total pago", icon: "coins", value: U.fmtMoney(total), sub: U.plural(paid.length, "compra", "compras") + (R.all ? "" : ` ${R.label}`) },
			{ label: "Média por jogo", icon: "grid", value: paid.length ? U.fmtMoney(total / paid.length) : "—" },
			{ label: "Por hora jogada", icon: "clock", value: hrs ? U.fmtMoney(total / hrs) : "—" },
			{ label: "Economia", icon: "tag", value: savings.length ? U.fmtMoney(saved) : "—", sub: savings.length ? "abaixo do preço normal" : "registre o preço normal", tone: saved ? "green" : "" }
		]);
		if (!g.some(x => x.price > 0)) return `${kpis}${U.empty({ icon: "coins", title: "Sem preços registrados", text: "Informe quanto pagou em Editar detalhes de cada jogo para ver os gastos.", compact: true })}`;
		const byYear = [...C.groupBy(g.filter(x => x.price > 0), x => (x.dateAdded || "").slice(0, 4) || "Sem data")].sort((a, b) => a[0].localeCompare(b[0]));
		const yearCols = this._stCols(byYear.map(([y, l]) => ({ label: y, value: Math.round(l.reduce((t, x) => t + x.price, 0) * 100) / 100 })), { tone: "var(--sv-green)", fmt: v => U.fmtMoney(v), short: v => U.fmtMoney(v).replace(/,\d\d$/, "") });
		const byPlat = [...C.groupBy(paid, x => x.platform)].map(([p, l]) => ({ label: p, value: l.reduce((t, x) => t + x.price, 0), n: l.length })).sort((a, b) => b.value - a.value);
		const cph = g.filter(x => x.price > 0 && x.playtime.hours > 0).map(x => ({ g: x, v: x.price / x.playtime.hours })).sort((a, b) => a.v - b.v);
		const row = x => ({ label: x.g.title, value: x.v, href: x.g.path, display: `${U.fmtMoney(x.v)}/h` });
		return `${kpis}
			<div class="sv-stgrid">
				${this._stCard("Gastos por ano", yearCols || this._stEmpty("Sem compras com data."), { sub: "Pela data em que o jogo entrou no vault" })}
				${this._stCard("Gastos por plataforma", byPlat.length ? U.bars(byPlat.map(x => ({ label: x.label, value: x.value, display: `${U.fmtMoney(x.value)} · ${U.plural(x.n, "jogo", "jogos")}` }))) : this._stEmpty("Sem compras neste período."))}
				${this._stCard("Melhor custo por hora", cph.length ? U.bars(cph.slice(0, 5).map(row)) : this._stEmpty("Precisa de preço e horas."), { sub: "Quanto menor, melhor" })}
				${cph.length > 5 ? this._stCard("Pior custo por hora", U.bars(cph.slice(-5).reverse().map(row)), { sub: "Ainda dá tempo de aproveitar" }) : ""}
				${savings.length ? this._stCard("Economia", U.bars(savings.slice(0, 6).map(x => ({ label: x.g.title, value: x.v, href: x.g.path, display: `${U.fmtMoney(x.v)} · −${x.pct}%` }))), { sub: "Preço normal menos o que você pagou" }) : ""}
			</div>`;
	}

	// cada aba é montada só quando aberta pela primeira vez (3.20.0)
	_stBuild(panels, k) {
		const U = customJS.SteamVaultUI;
		try { return panels[k](); }
		catch (err) { console.warn("Game Library: estatísticas", k, err); return U.empty({ icon: "alert", title: "Não foi possível montar esta seção", text: String(err?.message || err), compact: true }); }
	}

	_stWirePanel(panel, ctx, late) {
		ctx.V._heatmapsToEnd?.(panel);
		const { V } = ctx;
		if (late) {
			V._wireImages?.(panel);
			V._wireHorizontalScrollers?.(panel);
			requestAnimationFrame(() => panel.querySelectorAll(".sv-progress, .sv-bar-track, .sv-stackbar, .sv-genre-share, .sv-heatmap, .sv-ring").forEach(el => el.classList.add("is-drawn")));
		}
		panel.querySelectorAll(".sv-stdonut-legend [data-open]").forEach(li => li.addEventListener("click", () => V.open(li.dataset.open, ctx)));
		panel.querySelectorAll(".sv-stheat-scroll").forEach(w => { w.scrollLeft = w.scrollWidth; });
		if (panel.dataset.stPanel === "compare") this._stWireCompare(panel, ctx);
	}

	// ---- comparar (3.45.0): duas plataformas ou dois anos lado a lado
	_stCmpState(ctx) {
		const U = ctx.U;
		let st = null;
		try { st = JSON.parse(U._store("statsCmp") || "null"); } catch (_) {}
		return st && typeof st === "object" ? st : {};
	}
	_stCmpOptions(ctx, mode) {
		const { C, model } = ctx;
		if (mode === "platform") {
			const n = new Map();
			for (const g of model.games) if (g.platform) n.set(g.platform, (n.get(g.platform) || 0) + 1);
			return [...n].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([p]) => p);
		}
		const now = Number(C.today().slice(0, 4)), seen = new Set();
		const add = d => { const y = Number(String(d || "").slice(0, 4)); if (y > 1970 && y <= now) seen.add(y); };
		for (const x of model.games) {
			add(x.dateAdded); add(x.completionDate); add(x.startDate);
			for (const s of x.sessions) add(C.iso(s.date));
			for (const r of x.playthroughs) add(C.iso(r.end));
			for (const a of x.achievements) if (a.unlocked) add(a.unlockedDate);
		}
		return [...seen].sort((a, b) => b - a).map(String);
	}
	_stCmpData(ctx, mode, key) {
		const { model } = ctx;
		const avg = list => { const r = list.filter(z => z.rating > 0); return r.length ? r.reduce((t, z) => t + z.rating, 0) / r.length : null; };
		const topGenre = byGame => {
			const m = new Map();
			for (const [g, h] of byGame) for (const ge of g.genres || []) m.set(ge, (m.get(ge) || 0) + (h || 0.001));
			return [...m].sort((a, b) => b[1] - a[1])[0]?.[0] || "";
		};
		if (mode === "platform") {
			const games = model.games.filter(g => g.platform === key);
			const done = games.filter(g => g.status === "Completed" || g.completionDate);
			const ach = games.flatMap(g => g.achievements), unl = ach.filter(a => a.unlocked);
			const byGame = games.map(g => [g, g.playtime.hours]);
			const top = [...games].sort((a, b) => b.playtime.hours - a.playtime.hours)[0] || null;
			return { games: games.length, hours: games.reduce((t, g) => t + g.playtime.hours, 0), completed: done.length,
				donePct: games.length ? (done.length / games.length) * 100 : 0, ach: unl.length, achPct: ach.length ? (unl.length / ach.length) * 100 : null,
				rating: avg(games), spent: games.reduce((t, g) => t + (g.price > 0 ? g.price : 0), 0), genre: topGenre(byGame), top };
		}
		const W = this._stWindow(ctx, `${key}-01-01`, `${key}-12-31`, false);
		const top = [...W.hoursBy].filter(([, h]) => h > 0).sort((a, b) => b[1] - a[1])[0]?.[0] || [...W.completedList].sort((a, b) => (b.rating || 0) - (a.rating || 0))[0] || null;
		return { games: W.games, hours: W.sessionHours, completed: W.completed, ach: W.ach, rating: avg(W.completedList), spent: W.spent,
			sessions: W.sessions, genre: topGenre([...W.hoursBy]), top };
	}
	_stCompare(ctx) {
		const { U } = ctx;
		const st = this._stCmpState(ctx);
		const mode = st.mode === "year" ? "year" : "platform";
		const opts = this._stCmpOptions(ctx, mode);
		const seg = `<div class="sv-segmented sv-stcmp-mode" role="radiogroup" aria-label="Comparar">${[["platform", "Plataformas"], ["year", "Anos"]].map(([k, l]) => `<button type="button" data-cmp-mode="${k}" class="${k === mode ? "is-active" : ""}" aria-checked="${k === mode}">${U.esc(l)}</button>`).join("")}</div>`;
		if (opts.length < 2) return `<div class="sv-stcmp" data-cmp>${seg}${U.empty({ icon: "layers", title: mode === "platform" ? "Só uma plataforma por enquanto" : "Só um ano por enquanto", text: mode === "platform" ? "A comparação aparece quando houver jogos em duas plataformas ou mais." : "A comparação aparece a partir do segundo ano com datas registradas.", compact: true })}</div>`;
		const pick = (v, fb) => opts.includes(String(v)) ? String(v) : fb;
		const a = pick(st[mode + "A"], opts[0]);
		let b = pick(st[mode + "B"], opts.find(o => o !== a));
		if (b === a) b = opts.find(o => o !== a);
		const A = this._stCmpData(ctx, mode, a), B = this._stCmpData(ctx, mode, b);
		const sel = (side, v) => `<label class="sv-select sv-stcmp-sel"><select data-cmp-side="${side}" aria-label="${side === "A" ? "Primeiro" : "Segundo"}">${opts.map(o => `<option value="${U.attr(o)}"${o === v ? " selected" : ""}>${U.esc(o)}</option>`).join("")}</select></label>`;
		const rows = [
			["Jogos", "grid", A.games, B.games, v => U.fmtNum(v)],
			[mode === "platform" ? "Horas jogadas" : "Horas em sessões", "clock", A.hours, B.hours, v => U.fmtHours(v)],
			mode === "year" ? ["Sessões", "play", A.sessions, B.sessions, v => U.fmtNum(v)] : null,
			["Zerados", "flag", A.completed, B.completed, v => U.fmtNum(v)],
			mode === "platform" ? ["Zerados da plataforma", "check", A.donePct, B.donePct, v => U.fmtPct(Math.round(v))] : null,
			["Conquistas", "trophy", A.ach, B.ach, v => U.fmtNum(v)],
			mode === "platform" && (A.achPct !== null || B.achPct !== null) ? ["Conquistas desbloqueadas", "medal", A.achPct || 0, B.achPct || 0, v => U.fmtPct(Math.floor(v))] : null,
			A.rating !== null || B.rating !== null ? ["Nota média", "star", A.rating || 0, B.rating || 0, v => v ? U.fmtNum(v, 1) : "—"] : null,
			A.spent || B.spent ? ["Gasto", "coins", A.spent, B.spent, v => U.fmtMoney(v)] : null
		].filter(Boolean);
		const row = ([label, icon, x, y, fmt], ri) => {
			const max = Math.max(x, y, 0);
			const w = v => max ? Math.max(v ? 3 : 0, (v / max) * 100) : 0;
			return `<div class="sv-stcmp-row" role="row" style="--sv-r:${ri}"><span class="sv-stcmp-label" role="rowheader">${U.icon(icon)}${U.esc(label)}</span>
				<span class="sv-stcmp-cell is-a${x > y ? " is-win" : ""}" role="cell"><b>${U.esc(fmt(x))}</b><span class="sv-stcmp-bar"><i style="width:${w(x)}%"></i></span></span>
				<span class="sv-stcmp-cell is-b${y > x ? " is-win" : ""}" role="cell"><b>${U.esc(fmt(y))}</b><span class="sv-stcmp-bar"><i style="width:${w(y)}%"></i></span></span></div>`;
		};
		const pill = (D) => `<div class="sv-stcmp-foot">${D.genre ? `<span><small>Gênero mais jogado</small><b>${U.esc(D.genre)}</b></span>` : ""}${D.top ? `<a class="sv-stcmp-top" ${U.openAttrs(D.top.path)}>${U.cover(D.top, { cls: "sv-cover--xs" })}<span><small>Destaque</small><b>${U.esc(D.top.title)}</b></span></a>` : ""}</div>`;
		return `<div class="sv-stcmp" data-cmp>
			<div class="sv-stcmp-bar-top">${seg}<div class="sv-stcmp-pick">${sel("A", a)}<span class="sv-stcmp-vs">×</span>${sel("B", b)}</div></div>
			<p class="sv-stnote">${mode === "platform" ? "Tudo o que está na biblioteca em cada plataforma; o período escolhido acima não se aplica." : "Cada ano de janeiro a dezembro, pelas datas das notas; o período escolhido acima não se aplica."}</p>
			<section class="sv-surface sv-stcmp-table" role="table" aria-label="Comparação">
				<div class="sv-stcmp-row sv-stcmp-head" role="row"><span role="columnheader"></span><span class="is-a" role="columnheader">${U.esc(a)}</span><span class="is-b" role="columnheader">${U.esc(b)}</span></div>
				${rows.map(row).join("")}
			</section>
			<div class="sv-stcmp-foots"><div class="is-a"><h4>${U.esc(a)}</h4>${pill(A)}</div><div class="is-b"><h4>${U.esc(b)}</h4>${pill(B)}</div></div>
		</div>`;
	}
	_stWireCompare(panel, ctx) {
		const box = panel.querySelector("[data-cmp]");
		if (!box || box.dataset.wired) return;
		box.dataset.wired = "1";
		const save = patch => {
			const st = Object.assign(this._stCmpState(ctx), patch);
			ctx.U._store("statsCmp", JSON.stringify(st));
			panel.innerHTML = this._stBuild({ compare: () => this._stCompare(ctx) }, "compare");
			ctx.V._wireImages?.(panel);
			this._stWireCompare(panel, ctx);
		};
		box.addEventListener("click", e => {
			const m = e.target.closest("[data-cmp-mode]");
			if (m && !m.classList.contains("is-active")) save({ mode: m.dataset.cmpMode });
		});
		box.addEventListener("change", e => {
			const s = e.target.closest("[data-cmp-side]");
			if (!s) return;
			const mode = this._stCmpState(ctx).mode === "year" ? "year" : "platform";
			save({ [mode + s.dataset.cmpSide]: s.value });
		});
	}

	// ---- ano a ano (3.20.0): cada ano lado a lado, sempre todos os anos
	_stYears(ctx) {
		const { U, C, model } = ctx;
		const g = model.games;
		const now = Number(C.today().slice(0, 4));
		const seen = new Set();
		const add = d => { const y = Number(String(d || "").slice(0, 4)); if (y > 1970 && y <= now) seen.add(y); };
		for (const x of g) {
			add(x.dateAdded); add(x.completionDate); add(x.startDate);
			for (const s of x.sessions) add(C.iso(s.date));
			for (const r of x.playthroughs) add(C.iso(r.end));
			for (const a of x.achievements) if (a.unlocked) add(a.unlockedDate);
		}
		if (!seen.size) return U.empty({ icon: "calendar", title: "Ainda sem anos para comparar", text: "As datas de quando você adicionou, jogou, zerou e desbloqueou aparecem aqui ano a ano.", compact: true });
		const first = Math.max(Math.min(...seen), now - 9);
		const years = [];
		for (let y = first; y <= now; y++) {
			const W = this._stWindow(ctx, `${y}-01-01`, `${y}-12-31`, false);
			const top = [...W.hoursBy].filter(([, h]) => h > 0).sort((a, b) => b[1] - a[1])[0]?.[0]
				|| [...W.completedList].sort((a, b) => (b.rating || 0) - (a.rating || 0))[0] || null;
			years.push({ y, W, top, label: y === now ? `${y}*` : String(y) });
		}
		// este ano até hoje × o mesmo período do ano passado
		const R = this._stRange(C, "year");
		const cur = this._stWindow(ctx, R.from, R.to, false), prev = this._stWindow(ctx, R.prevFrom, R.prevTo, false);
		const kpis = this._stKpis([
			{ label: "Horas em sessões", icon: "clock", value: U.fmtHours(cur.sessionHours), delta: this._stDelta(cur.sessionHours, prev.sessionHours, { hours: true }) },
			{ label: "Zerados", icon: "flag", value: U.fmtNum(cur.completed), delta: this._stDelta(cur.completed, prev.completed) },
			{ label: "Conquistas", icon: "trophy", value: U.fmtNum(cur.ach), delta: this._stDelta(cur.ach, prev.ach) },
			{ label: "Jogos adicionados", icon: "grid", value: U.fmtNum(cur.games), delta: this._stDelta(cur.games, prev.games) },
			{ label: "Gasto", icon: "coins", value: U.fmtMoney(cur.spent), delta: this._stDelta(cur.spent, prev.spent, { money: true }) }
		]);
		// melhores anos
		const best = (key, fmt, label) => {
			const b = years.filter(x => x.W[key] > 0).sort((a, c) => c.W[key] - a.W[key])[0];
			return b ? `<li><span>${U.esc(label)}</span><b>${b.y}</b><small>${U.esc(fmt(b.W[key]))}</small></li>` : "";
		};
		const bests = [best("sessionHours", v => U.fmtHours(v), "Mais horas"), best("completed", v => U.plural(v, "jogo zerado", "jogos zerados"), "Mais zerados"), best("ach", v => U.plural(v, "conquista", "conquistas"), "Mais conquistas"), best("games", v => U.plural(v, "jogo adicionado", "jogos adicionados"), "Mais jogos novos")].filter(Boolean).join("");
		const col = (key, opts) => this._stCols(years.map(x => ({ label: x.label, title: String(x.y), value: Math.round(x.W[key] * 100) / 100 })), { highlightLast: true, ...opts });
		const charts = [
			["Horas em sessões", col("sessionHours", { tone: "var(--sv-blue)", fmt: v => U.fmtHours(v), short: v => `${Math.round(v)}h` }), "Registre sessões para ver as horas de cada ano"],
			["Zerados", col("completed", { tone: "var(--sv-green)", fmt: v => U.fmtNum(v) }), "Pela data de conclusão"],
			["Conquistas desbloqueadas", col("ach", { tone: "var(--sv-gold)", fmt: v => U.fmtNum(v) }), "Pela data de desbloqueio"],
			["Jogos adicionados", col("games", { tone: "#a970ff", fmt: v => U.fmtNum(v) }), "Pela data em que entrou no vault"],
			["Gastos", col("spent", { tone: "#2fc4a4", fmt: v => U.fmtMoney(v), short: v => U.fmtMoney(v).replace(/,\d\d$/, "") }), "Pelo preço pago"]
		].map(([t, body, empty]) => this._stCard(t, body || this._stEmpty(empty))).join("");
		const rows = [...years].reverse().map(x => {
			const r = x.W.completedList.filter(z => z.rating > 0);
			const avg = r.length ? r.reduce((t, z) => t + z.rating, 0) / r.length : null;
			return `<tr${x.y === now ? ' class="is-now"' : ""}><th scope="row">${x.y}${x.y === now ? "<small>até hoje</small>" : ""}</th>
				<td class="sv-num">${U.fmtNum(x.W.games)}</td><td class="sv-num">${x.W.sessionHours ? U.fmtHours(x.W.sessionHours) : "—"}</td><td class="sv-num">${U.fmtNum(x.W.completed)}</td>
				<td class="sv-num">${U.fmtNum(x.W.ach)}</td><td class="sv-num">${x.W.spent ? U.fmtMoney(x.W.spent) : "—"}</td><td class="sv-num">${avg !== null ? U.fmtNum(avg, 1) : "—"}</td>
				<td>${x.top ? `<a class="sv-styy-top" ${U.openAttrs(x.top.path)}>${U.cover(x.top, { cls: "sv-cover--xs" })}<span>${U.esc(x.top.title)}</span></a>` : `<span class="sv-muted">—</span>`}</td></tr>`;
		}).join("");
		const table = `<div class="sv-styy-scroll" tabindex="0" role="region" aria-label="Resumo por ano"><table class="sv-styy">
			<thead><tr><th scope="col">Ano</th><th scope="col">Jogos</th><th scope="col">Horas</th><th scope="col">Zerados</th><th scope="col">Conquistas</th><th scope="col">Gasto</th><th scope="col">Nota média</th><th scope="col">Destaque</th></tr></thead>
			<tbody>${rows}</tbody></table></div>`;
		return `<p class="sv-stnote">Esta aba mostra sempre todos os anos; o período escolhido acima não se aplica. * ano em andamento.</p>
			<section class="sv-block">${U.sectionHead(`${now} até hoje`, { sub: `Comparado com o mesmo período de ${now - 1}` })}${kpis}</section>
			${years.length > 1 ? `${bests ? `<section class="sv-block">${U.sectionHead("Seus melhores anos")}<ul class="sv-stbest">${bests}</ul></section>` : ""}
			<div class="sv-stgrid">${charts}</div>` : `<div class="sv-callout">${U.icon("calendar")}<div><strong>${now} é o seu primeiro ano no vault</strong><p>A comparação entre anos, os gráficos e os melhores anos aparecem a partir do segundo ano com datas registradas.</p></div></div>`}
			<section class="sv-block">${U.sectionHead("Resumo por ano", { sub: "Destaque: o jogo com mais horas em sessões no ano (ou o zerado com a melhor nota)" })}${table}</section>`;
	}

	// ---- comportamento
	_stWire(root, ctx, panels = null) {
		const { U, V } = ctx;
		const page = root.querySelector(".sv-stpage");
		if (!page) return;
		const show = id => {
			const lazy = page.querySelector(`[data-st-panel="${id}"][data-st-lazy]`);
			if (lazy && panels?.[id]) { lazy.innerHTML = this._stBuild(panels, id); lazy.removeAttribute("data-st-lazy"); this._stWirePanel(lazy, ctx, true); }
			page.querySelectorAll("[data-st-tab]").forEach(b => { const on = b.dataset.stTab === id; b.classList.toggle("is-active", on); b.setAttribute("aria-selected", String(on)); });
			page.querySelectorAll("[data-st-panel]").forEach(p => { p.hidden = p.dataset.stPanel !== id; });
			U._store("statsTab", id);
			if (id === "time") requestAnimationFrame(() => page.querySelectorAll(".sv-stheat-scroll").forEach(w => { w.scrollLeft = w.scrollWidth; }));
		};
		page.querySelectorAll("[data-st-tab]").forEach(b => b.addEventListener("click", () => show(b.dataset.stTab)));
		page.querySelectorAll("[data-st-period]").forEach(b => b.addEventListener("click", () => {
			if (b.classList.contains("is-active")) return;
			U._store("statsPeriod", b.dataset.stPeriod);
			V._rerender ? V._rerender("statistics") : V.refresh();
		}));
		page.addEventListener("click", e => {
			const d = e.target.closest("[data-st-day]");
			if (d && ctx.X?.openDay) ctx.X.openDay(ctx, d.dataset.stDay);
		});
		page.querySelector("[data-st-share]")?.addEventListener("click", () => ctx.SH ? ctx.SH.open(ctx, "stats") : V.toast("Módulo de cartão ausente (SteamVaultShare.js)", { tone: "warn" }));
		page.querySelectorAll("[data-st-panel]:not([data-st-lazy])").forEach(p => this._stWirePanel(p, ctx, false));
	}

	heatmap(ctx, days) {
		const { U } = ctx;
		const end = new Date(); end.setHours(0, 0, 0, 0);
		const start = new Date(end); start.setDate(start.getDate() - 364 - start.getDay());
		const p = n => String(n).padStart(2, "0");
		const cells = [];
		const max = Math.max(1, ...days.values());
		for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
			const iso = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
			const n = days.get(iso) || 0;
			const lvl = n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4));
			cells.push(`<i class="l${lvl}" title="${U.attr(U.fmtDate(iso))}: ${n}"></i>`);
		}
		const total = [...days].filter(([k]) => new Date(k + "T00:00:00") >= start).reduce((a, [, v]) => a + v, 0);
		return `<div class="sv-heatmap-wrap" data-heatmap><div class="sv-heatmap">${cells.join("")}</div><p class="sv-fineprint">${U.plural(total, "evento", "eventos")} nos últimos 12 meses</p></div>`;
	}

	// ========================================================= CONFIGURAÇÕES
	settings(ctx) {
		const { U, C, model } = ctx;
		const issues = C.audit(model);
		const levels = { error: "Erro", warn: "Aviso", info: "Info" };
		const html = `<div class="sv-page sv-pad">
			${U.pageHead("Configurações", { sub: `Game Library ${C.VERSION}${C.STAGE ? ` · ${C.STAGE}` : ""}` })}
			<div class="sv-settings">
				<section class="sv-setgroup" id="sv-set-look">
					<header class="sv-setgroup-head"><span class="sv-setgroup-icon" aria-hidden="true">${U.icon("sparkles")}</span><div><h2>Aparência</h2><p>Tema, cores, texto e o jeito de cada tela</p></div></header>
					<div class="sv-setgroup-body">
				<section class="sv-surface">
					<h3>Tema e cores</h3>
					<p class="sv-muted">A Game Library segue o tema claro/escuro do Obsidian. No escuro, escolha o tema e a cor de destaque.</p>
					<div class="sv-accentpick"><span class="sv-label" id="sv-theme-label">Tema</span>
						<div class="sv-themepick-row" role="radiogroup" aria-labelledby="sv-theme-label">${Object.entries(U.themes()).map(([k, [name, sub, [bg, s1, s2]]]) => { const on = (U._store("theme") || "steam") === k; return `<button type="button" role="radio" aria-checked="${on}" class="sv-themepick-sw${on ? " is-active" : ""}" data-ui-theme="${k}" style="--p-bg:${bg};--p-s1:${s1};--p-s2:${s2}"><span class="sv-themepick-prev"><i></i><i></i></span><span>${U.esc(name)}<small>${U.esc(sub)}</small></span></button>`; }).join("")}</div>
						<small class="sv-muted">Muda fundos e cartões no tema escuro. Combine com qualquer cor de destaque.</small>
					</div>
					<div class="sv-accentpick"><span class="sv-label" id="sv-accent-label">Cor de destaque</span>
						<div class="sv-accentpick-row" role="radiogroup" aria-labelledby="sv-accent-label">${Object.entries(U.accents()).map(([k, [name, c]]) => { const on = (U._store("accent") || "blue") === k; return `<button type="button" role="radio" class="sv-accentpick-sw${on ? " is-active" : ""}" data-accent="${k}" aria-checked="${on}" aria-label="${U.attr(name)}" title="${U.attr(name)}" style="--sw:${c}"><span aria-hidden="true">${U.icon("check")}</span></button>`; }).join("")}</div>
						<small class="sv-muted">Botões, abas, barras e destaques usam esta cor neste aparelho. As cores de cada plataforma continuam as delas.</small>
					</div>
					<div class="sv-setlist">
					<label class="sv-switch sv-setrow"><input type="checkbox" data-ui-oled ${U._store("oled") === "1" ? "checked" : ""}><span></span><b>Preto puro no tema escuro</b><small>Fundo totalmente preto; telas OLED gastam menos bateria.</small></label>
					</div>
				</section>
				<section class="sv-surface">
					<h3>Texto e cards</h3>
					<div class="sv-accentpick"><span class="sv-label" id="sv-ts-label">Tamanho do texto</span>
						<div class="sv-segmented" role="radiogroup" aria-labelledby="sv-ts-label">${[["0.92", "Menor"], ["1", "Padrão"], ["1.08", "Maior"], ["1.16", "Bem maior"]].map(([v, l]) => { const on = String(Number(U._store("textScale") || 1)) === String(Number(v)); return `<button type="button" role="radio" data-ui-ts="${v}" class="${on ? "is-active" : ""}" aria-checked="${on}" style="font-size:${Number(v) * 0.86}rem">${l}</button>`; }).join("")}</div>
						<small class="sv-muted">Vale para os textos da Game Library; o resto do Obsidian não muda.</small>
					</div>
					<div class="sv-accentpick"><span class="sv-label" id="sv-fav-label">Ícone de favorito nos cards</span>
						<div class="sv-favpick" role="radiogroup" aria-labelledby="sv-fav-label">${[["dot", "Ponto"], ["glass", "Selo de vidro"], ["ribbon", "Marcador"], ["corner", "Canto dobrado"], ["outline", "Contorno"], ["label", "Etiqueta"]].map(([v, l]) => { const on = (U._store("favStyle") || "dot") === v; return `<button type="button" role="radio" class="sv-favpick-opt${on ? " is-active" : ""}" data-ui-fav="${v}" aria-checked="${on}"><span class="sv-favpick-art" data-fav="${v}"><span class="sv-card-favmark" aria-hidden="true">${U.icon("heart")}<span>Favorito</span></span></span><span class="sv-favpick-name">${l}</span></button>`; }).join("")}</div>
					</div>
					<div class="sv-row-actions"><a class="sv-btn sv-btn--ghost sv-btn--sm" ${U.openAttrs("Dashboard/Ícones")}>${U.icon("grid")}<span>Galeria de ícones</span></a></div>
				</section>
				<section class="sv-surface" id="sv-set-screen">
					<h3>Tela e modo aplicativo</h3>
					<div class="sv-setlist">
					${U.screenPrefs().map(([key, , , label, hint]) => `<label class="sv-switch sv-setrow"><input type="checkbox" data-ui-screen="${key}" ${U.screenPrefOn(key) ? "checked" : ""}><span></span><b>${U.esc(label)}</b><small>${U.esc(hint)}</small></label>`).join("")}
					</div>
				</section>
				${ctx.LK ? ctx.LK.section(ctx) : ""}
					</div>
				</section>
				<section class="sv-setgroup" id="sv-set-motion">
					<header class="sv-setgroup-head"><span class="sv-setgroup-icon" aria-hidden="true">${U.icon("bolt")}</span><div><h2>Efeitos e toque</h2><p>Animações, brilho, som e vibração</p></div></header>
					<div class="sv-setgroup-body">
				<section class="sv-surface">
					<h3>Animações e efeitos</h3>
					<div class="sv-setlist">
					<label class="sv-switch sv-setrow"><input type="checkbox" data-ui-reduced ${U._store("reducedMotion") === "1" ? "checked" : ""}><span></span><b>Reduzir animações</b><small>Desliga entradas, brilhos e movimentos do app.</small></label>
					<label class="sv-switch sv-setrow"><input type="checkbox" data-ui-shine ${U._store("shine") === "0" ? "" : "checked"}><span></span><b>Brilho nas capas (estilo Big Picture)</b><small>Uma faixa de luz atravessa a capa ao tocar ou passar o mouse.</small></label>
					<label class="sv-switch sv-setrow"><input type="checkbox" data-ui-celebrate ${U._store("celebrate") === "0" ? "" : "checked"}><span></span><b>Comemoração na ficha ao zerar ou chegar a 100%</b><small>A capa acende no topo da ficha logo depois da mudança.</small></label>
					<label class="sv-switch sv-setrow"><input type="checkbox" data-ui-tilt ${U._store("tilt") === "0" ? "" : "checked"}><span></span><b>Inclinação 3D das capas</b><small>Só no computador.</small></label>
					<label class="sv-switch sv-setrow"><input type="checkbox" data-ui-gamepad ${U._store("gamepad") === "0" ? "" : "checked"}><span></span><b>Navegação por controle</b><small>No computador, com um controle conectado: o direcional move, A abre, B volta, LB/RB trocam de aba e Start abre a busca.</small></label>
					</div>
				</section>
				<section class="sv-surface">
					<h3>Som e vibração</h3>
					<div class="sv-setlist">
					<label class="sv-switch sv-setrow"><input type="checkbox" data-ui-haptics ${U._store("haptics") === "0" ? "" : "checked"}><span></span><b>Vibração leve ao tocar</b><small>Ao favoritar, trocar de aba e dispensar avisos (Android).</small></label>
					<div class="sv-sfxset">
						<label class="sv-switch sv-setrow"><input type="checkbox" data-ui-sfx ${U._store("sfx") === "1" ? "checked" : ""}><span></span><b>Efeitos sonoros</b><small>Conquistas, jogo zerado e 100%, sessão ao vivo e favoritos. Sons curtos criados pelo próprio app, sem arquivos nem internet.</small></label>
						<div class="sv-sfxset-row"${U._store("sfx") === "1" ? "" : " hidden"}>
							<div class="sv-segmented" role="radiogroup" aria-label="Volume dos efeitos">${[["low", "Baixo"], ["mid", "Médio"], ["high", "Alto"]].map(([v, l]) => { const on = (U._store("sfxVol") || "mid") === v; return `<button type="button" role="radio" data-ui-sfxvol="${v}" class="${on ? "is-active" : ""}" aria-checked="${on}">${l}</button>`; }).join("")}</div>
							${U.btn("Ouvir", { icon: "play", kind: "ghost", size: "sm", attrs: "data-ui-sfxtest" })}
						</div>
					</div>
					</div>
				</section>
					</div>
				</section>
				<section class="sv-setgroup" id="sv-set-general">
					<header class="sv-setgroup-head"><span class="sv-setgroup-icon" aria-hidden="true">${U.icon("sliders")}</span><div><h2>Idioma e rotina</h2><p>Idioma do app, nota diária e primeiros passos</p></div></header>
					<div class="sv-setgroup-body">
				<section class="sv-surface">
					<h3>Geral</h3>
					<div class="sv-accentpick sv-no-i18n"><span class="sv-label" id="sv-lang-label">Idioma · Language</span>
						<div class="sv-segmented" role="radiogroup" aria-labelledby="sv-lang-label">${[["pt", "Português"], ["en", "English"]].map(([v, l]) => { const on = (ctx.T?.lang || "pt") === v; return `<button type="button" role="radio" data-ui-lang="${v}" class="${on ? "is-active" : ""}" aria-checked="${on}">${l}</button>`; }).join("")}</div>
						<small class="sv-muted">${ctx.T?.on ? "Screens, menus, cards and messages. Your notes (titles, synopses, reviews) stay as you wrote them." : "Telas, menus, cartões e avisos. As suas notas (títulos, sinopses, análises) ficam como você escreveu."}</small>
					</div>
					${U._store("onboardHidden") === "1" ? `<div class="sv-row-actions">${U.btn("Mostrar os primeiros passos na Início", { icon: "sparkles", kind: "ghost", size: "sm", action: "onboard-show" })}</div>` : ""}
				</section>
				${ctx.CA ? (() => { const cfg = ctx.CA.dailyConfig(); return `<section class="sv-surface sv-care">
					<h3>Nota diária</h3>
					<div class="sv-setlist"><label class="sv-switch sv-setrow"><input type="checkbox" data-ui-dailylog ${ctx.CA.dailyOn() ? "checked" : ""}><span></span><b>Anotar cada sessão na nota diária do Obsidian</b></label></div>
					<p class="sv-muted sv-care-note">Uma linha sob <code>## Jogos</code> com link para o jogo, as horas e a anotação da sessão. Nota de hoje: <code>${U.esc(ctx.CA.dailyPath(cfg))}</code>${cfg.enabled ? "" : " (o plugin Notas diárias está desligado; a pasta e o formato padrão são usados)"}.${cfg.template ? " Como há um modelo de nota diária, a nota precisa ter sido aberta uma vez no dia." : ""}</p>
				</section>`; })() : ""}
					</div>
				</section>
				<section class="sv-setgroup" id="sv-set-intg">
					<header class="sv-setgroup-head"><span class="sv-setgroup-icon" aria-hidden="true">${U.icon("link")}</span><div><h2>Integrações e conquistas</h2><p>Contas conectadas, origens e ícones das conquistas</p></div></header>
					<div class="sv-setgroup-body">
				${ctx.PP ? ctx.PP.settingsSummary(ctx) : ""}
				${ctx.A ? (() => { const n = ctx.A.legacyCount(); return `<section class="sv-surface sv-settings-ach">
					<h3>Conquistas</h3>
					<p class="sv-muted">Cada jogo tem uma <b>origem</b> (Steam, RetroAchievements, Epic Games, GOG, PlayStation, Xbox, Google Play Games, Native, Custom, Sem conquistas ou Não configurado) e, separada dela, uma <b>sincronização</b> (Automática, Manual, Local ou Nenhuma). Troque as duas na aba Conquistas de cada jogo.</p>
					<p class="sv-formmsg${n ? " is-warn" : " is-ok"}">${n ? `${U.plural(n, "jogo ainda usa", "jogos ainda usam")} os campos antigos (achievementSource/gameType). Tudo continua funcionando; migrar deixa as notas no formato novo.` : "Todas as notas usam origem e sincronização."}</p>
					${n ? `<div class="sv-row-actions">${U.btn("Migrar conquistas", { icon: "refresh", kind: "secondary", size: "sm", action: "ach-migrate" })}</div>` : ""}
					${(() => { const ip = ctx.A.iconPlan ? ctx.A.iconPlan(model) : null; if (!ip || !ip.total) return ""; const pct = Math.round((ip.local / ip.total) * 100); return `<div class="sv-iconsave">
						<div class="sv-iconsave-head"><b>Ícones salvos no vault</b><span class="sv-num">${U.fmtNum(ip.local)} de ${U.fmtNum(ip.total)}</span></div>
						<div class="sv-progress sv-progress--thin" role="progressbar" aria-label="Ícones salvos no vault" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div>
						<p class="sv-muted">${ip.remote.length ? `${U.plural(ip.remote.length, "ícone ainda vem", "ícones ainda vêm")} da internet e ${ip.remote.length === 1 ? "some" : "somem"} sem conexão. Salvar baixa ${ip.remote.length === 1 ? "o arquivo" : "os arquivos"} para <code>Assets/Achievements</code>, uma vez só.` : "Todos os ícones com origem na internet já estão no vault: aparecem mesmo sem conexão."}${ip.none ? ` ${U.plural(ip.none, "conquista não tem", "conquistas não têm")} ícone.` : ""}</p>
						${ip.remote.length ? `<div class="sv-row-actions">${U.btn(`Salvar ${U.plural(ip.remote.length, "ícone", "ícones")} no vault`, { icon: "download", kind: "secondary", size: "sm", action: "ach-icons-local" })}</div>` : ""}
					</div>`; })()}
				</section>`; })() : ""}
					</div>
				</section>
				<section class="sv-setgroup" id="sv-set-data">
					<header class="sv-setgroup-head"><span class="sv-setgroup-icon" aria-hidden="true">${U.icon("box")}</span><div><h2>Biblioteca e dados</h2><p>Saúde, backup, importação e diagnóstico</p></div></header>
					<div class="sv-setgroup-body">
				${ctx.CA ? (() => { const h = ctx.CA.healthData(ctx), sc = ctx.CA.healthScore(h); return `<section class="sv-surface sv-care">
					<h3>Saúde da biblioteca</h3>
					<div class="sv-care-row">
						<span class="sv-care-icon" aria-hidden="true">${U.icon("heartbeat")}</span>
						<div><b>${sc}/100${h.dups.length ? ` · ${U.plural(h.dups.length, "possível duplicata", "possíveis duplicatas")}` : ""}</b>
						<p class="sv-muted">${(parts => parts.length ? `${parts.join(", ")}. Corrija em lote, sem abrir ficha por ficha.` : "Todas as fichas têm capa, gênero, ano e desenvolvedora, e não há duplicatas.")([h.noCover.length ? U.plural(h.noCover.length, "jogo sem capa", "jogos sem capa") : "", h.noGenre.length ? U.plural(h.noGenre.length, "sem gênero", "sem gênero") : "", h.platRename.size ? U.plural(h.platRename.size, "plataforma com nome fora do padrão", "plataformas com nome fora do padrão") : ""].filter(Boolean))}</p></div>
					</div>
					<div class="sv-row-actions">${U.btn("Ver e corrigir", { icon: "heartbeat", kind: "secondary", size: "sm", action: "library-health" })}</div>
				</section>`; })() : ""}
				${ctx.CA ? (() => { const CA = ctx.CA, last = CA.lastBackup(), days = CA.daysSinceBackup(), n = CA.backups().length; return `<section class="sv-surface sv-care">
					<h3>Backup e aparelhos</h3>
					<div class="sv-care-row">
						<span class="sv-care-icon" aria-hidden="true">${U.icon("download")}</span>
						<div><b>${last ? `Último backup ${days === 0 ? "hoje" : days === 1 ? "ontem" : `há ${U.plural(days, "dia", "dias")}`}` : "Nenhum backup ainda"}</b>
						<p class="sv-muted">Um .zip com todas as notas da biblioteca (jogos, conquistas, coleções, categorias e telas) na pasta <code>${U.esc(CA.backupFolder)}/</code> do vault. ${n ? `Há ${U.plural(n, "backup guardado", "backups guardados")}. ` : ""}Ficam os ${CA.keepBackups} mais recentes; os antigos vão para a lixeira do Obsidian.</p></div>
					</div>
					<div class="sv-row-actions">${U.btn("Fazer backup agora", { icon: "download", kind: "primary", size: "sm", action: "backup-now" })}${last ? `<a class="sv-btn sv-btn--ghost sv-btn--sm" ${U.openAttrs(last.file.path)}>${U.icon("external")}<span>Abrir o último</span></a>` : ""}</div>
					<div class="sv-setlist"><label class="sv-switch sv-setrow"><input type="checkbox" data-ui-backupremind ${U._store("backupRemind") === "0" ? "" : "checked"}><span></span><b>Lembrar na Início quando o último backup passar de ${CA.backupEveryDays} dias</b></label></div>
					<hr class="sv-care-sep">
					<div class="sv-setlist"><label class="sv-switch sv-setrow"><input type="checkbox" data-ui-prefsync ${CA.syncOn() ? "checked" : ""}><span></span><b>Mesmas preferências em todos os aparelhos</b></label></div>
					<p class="sv-muted sv-care-note">Cor de destaque, tema, Personalização da Interface (modelos, cards, banners e combinações salvas), tamanho do texto, preto puro, layout da Início, visualização e filtros da Biblioteca, animações e lembretes ficam em <code>${U.esc(CA.prefsPath)}</code>, que vai junto com o vault (Obsidian Sync, iCloud, Syncthing…). Ligue em cada aparelho. Nenhuma chave, senha ou dado de conta entra nesse arquivo.</p>
				</section>`; })() : ""}
				${ctx.CA ? `<section class="sv-surface sv-care">
					<h3>Importar biblioteca</h3>
					<div class="sv-care-row">
						<span class="sv-care-icon" aria-hidden="true">${U.icon("upload")}</span>
						<div><b>Trazer jogos de outro app</b>
						<p class="sv-muted">Lê um arquivo CSV do Playnite, do Backloggd ou de uma planilha e cria as fichas de uma vez, com plataforma, status, horas, nota, gêneros e datas quando houver. Jogos que já estão no vault ficam de fora. Exportar grava a biblioteca no mesmo formato, na pasta Backups/.</p></div>
					</div>
					<div class="sv-row-actions">${U.btn("Importar CSV", { icon: "upload", kind: "secondary", size: "sm", action: "csv-import" })}${U.btn("Exportar CSV", { icon: "download", kind: "ghost", size: "sm", action: "csv-export" })}</div>
					${(u => u ? `<p class="sv-formmsg sv-undo-line">${U.icon("refresh")}<span>Última ação em lote: <b>${U.esc(u.label)}</b> (${U.esc(U.relDate(customJS.SteamVaultCore.localIso(u.at)))}).</span>${U.btn("Desfazer", { kind: "ghost", size: "sm", action: "undo-last" })}</p>` : "")(ctx.CA.undoInfo())}
				</section>` : ""}
				<section class="sv-surface">
					<h3>Diagnóstico do vault</h3>
					<p class="sv-muted">Problemas de dados encontrados agora. Corrija na origem (na nota indicada).</p>
					${issues.length ? `<ul class="sv-issues">${issues.slice(0, 60).map(i => `<li class="sv-issue sv-issue--${i.level}"><span class="sv-issue-level">${levels[i.level]}</span><span class="sv-issue-area">${U.esc(i.area)}</span><span class="sv-issue-msg">${U.esc(i.message)}${i.path ? ` <a ${U.openAttrs(i.path)}>${U.esc(i.label || i.path.split("/").pop().replace(/\.md$/, ""))}</a>` : ""}</span></li>`).join("")}</ul>${issues.length > 60 ? `<p class="sv-fineprint">+${issues.length - 60} itens</p>` : ""}` : U.empty({ icon: "check", title: "Nenhum problema encontrado", compact: true })}
					<div class="sv-row-actions">${U.btn("Reparar nomes de arquivo escapados", { icon: "refresh", kind: "ghost", size: "sm", action: "repair-names" })}</div>
				</section>
					</div>
				</section>
			</div>
		</div>`;
		return {
			active: "settings", html, wire: root => {
				// 3.58.0: Personalização da Interface (central com prévia)
				try { ctx.LK?.wire(root, ctx); } catch (err) { console.warn("Game Library: personalização", err); }
				// 3.29.0: índice das seções no topo (a tela é longa no celular)
				// 1.6.0: o índice lista as categorias (cada uma com o seu ícone)
				const secs = [...root.querySelectorAll(".sv-settings > .sv-setgroup")];
				if (secs.length > 2) {
					const nav = document.createElement("nav");
					nav.className = "sv-setnav"; nav.setAttribute("aria-label", "Seções das configurações");
					secs.forEach(sec => {
						const b = document.createElement("button");
						b.type = "button";
						b.innerHTML = `${sec.querySelector(".sv-setgroup-icon")?.innerHTML || ""}<span>${U.esc(sec.querySelector("h2").textContent.trim())}</span>`;
						b.addEventListener("click", () => sec.scrollIntoView({ behavior: ctx.V._motionOn() ? "smooth" : "auto", block: "start" }));
						nav.appendChild(b);
					});
					root.querySelector(".sv-settings")?.before(nav);
					try { ctx.V._wireHorizontalScrollers({ querySelectorAll: () => [nav] }); } catch (_) {}
				}
				root.querySelectorAll("[data-accent]").forEach(b => b.addEventListener("click", () => {
					U._store("accent", b.dataset.accent);
					ctx.V._applyAccent?.(b.dataset.accent);
					root.querySelectorAll("[data-accent]").forEach(x => { const on = x === b; x.classList.toggle("is-active", on); x.setAttribute("aria-checked", String(on)); });
				}));
				root.querySelectorAll("[data-ui-theme]").forEach(b => b.addEventListener("click", () => {
					U._store("theme", b.dataset.uiTheme);
					ctx.V._applyPrefs?.();
					root.querySelectorAll("[data-ui-theme]").forEach(x => { const on = x === b; x.classList.toggle("is-active", on); x.setAttribute("aria-checked", String(on)); });
				}));
				root.querySelectorAll("[data-ui-lang]").forEach(b => b.addEventListener("click", () => {
					if (!ctx.T || ctx.T.lang === b.dataset.uiLang) return;
					ctx.T.setLang(b.dataset.uiLang);
					ctx.V.refresh?.();
					setTimeout(() => ctx.V.toast(ctx.T.on ? "Language: English" : "Idioma: português", { tone: "ok" }), 300);
				}));
				root.querySelectorAll("[data-ui-ts]").forEach(b => b.addEventListener("click", () => {
					U._store("textScale", b.dataset.uiTs);
					ctx.V._applyPrefs?.();
					root.querySelectorAll("[data-ui-ts]").forEach(x => { const on = x === b; x.classList.toggle("is-active", on); x.setAttribute("aria-checked", String(on)); });
				}));
				root.querySelectorAll("[data-ui-fav]").forEach(b => b.addEventListener("click", () => {
					U._store("favStyle", b.dataset.uiFav);
					ctx.V._applyPrefs?.();
					root.querySelectorAll("[data-ui-fav]").forEach(x => { const on = x === b; x.classList.toggle("is-active", on); x.setAttribute("aria-checked", String(on)); });
				}));
				root.querySelector("[data-ui-oled]")?.addEventListener("change", e => {
					U._store("oled", e.target.checked ? "1" : "0");
					document.body.classList.toggle("sv-oled", e.target.checked);
				});
				root.querySelector("[data-ui-backupremind]")?.addEventListener("change", e => U._store("backupRemind", e.target.checked ? "1" : "0"));
				root.querySelector("[data-ui-dailylog]")?.addEventListener("change", e => { U._store("dailyLog", e.target.checked ? "1" : "0"); ctx.V?.toast(e.target.checked ? "As próximas sessões também vão para a nota diária" : "Sessões só na nota do jogo", { icon: "check" }); });
				root.querySelector("[data-ui-prefsync]")?.addEventListener("change", async e => {
					const CA = ctx.CA;
					if (!CA) return;
					if (!e.target.checked) { CA.disable(); return ctx.V.toast("Este aparelho volta a ter preferências próprias", { icon: "check" }); }
					try {
						const how = await CA.enable();
						ctx.V._applyPrefs?.();
						ctx.V.toast(how === "pulled" ? "Preferências trazidas do vault" : "Preferências deste aparelho salvas no vault", { tone: "ok" });
						if (how === "pulled") ctx.V.refresh?.();
					} catch (err) { e.target.checked = false; CA.disable(); ctx.V.toast(`Não foi possível ligar: ${err.message}`, { tone: "error" }); }
				});
				root.querySelector("[data-ui-reduced]")?.addEventListener("change", e => {
					U._store("reducedMotion", e.target.checked ? "1" : "0");
					document.body.classList.toggle("sv-reduced-motion", e.target.checked);
				});
				root.querySelectorAll("[data-ui-screen]").forEach(input => input.addEventListener("change", e => {
					const key = e.target.dataset.uiScreen, pref = U.screenPrefs().find(x => x[0] === key);
					if (!pref) return;
					U._store(`screen:${key}`, e.target.checked ? "1" : "0");
					document.body.classList.toggle(pref[1], e.target.checked);
				}));
				root.querySelector("[data-ui-shine]")?.addEventListener("change", e => {
					U._store("shine", e.target.checked ? "1" : "0");
					document.body.classList.toggle("sv-no-shine", !e.target.checked);
				});
				root.querySelector("[data-ui-celebrate]")?.addEventListener("change", e => U._store("celebrate", e.target.checked ? "1" : "0"));
				root.querySelector("[data-ui-gamepad]")?.addEventListener("change", e => U._store("gamepad", e.target.checked ? "1" : "0"));
				root.querySelector("[data-ui-tilt]")?.addEventListener("change", e => {
					U._store("tilt", e.target.checked ? "1" : "0");
					document.body.classList.toggle("sv-no-tilt", !e.target.checked);
				});
				root.querySelector("[data-ui-sfx]")?.addEventListener("change", e => {
					U._store("sfx", e.target.checked ? "1" : "0");
					root.querySelector(".sv-sfxset-row")?.toggleAttribute("hidden", !e.target.checked);
					if (e.target.checked) ctx.V.sfx("ach", { force: true });
				});
				root.querySelectorAll("[data-ui-sfxvol]").forEach(b => b.addEventListener("click", () => {
					U._store("sfxVol", b.dataset.uiSfxvol);
					root.querySelectorAll("[data-ui-sfxvol]").forEach(x => { const on = x === b; x.classList.toggle("is-active", on); x.setAttribute("aria-checked", String(on)); });
					ctx.V.sfx("ach", { force: true });
				}));
				// amostra: alterna entre os sons a cada toque
				let demo = 0;
				root.querySelector("[data-ui-sfxtest]")?.addEventListener("click", () => { const list = ["ach", "ach-rare", "perfect", "complete", "start", "save", "fav"]; ctx.V.sfx(list[demo++ % list.length], { force: true }); });
				root.querySelector("[data-ui-haptics]")?.addEventListener("change", e => {
					U._store("haptics", e.target.checked ? "1" : "0");
					document.body.classList.toggle("sv-no-haptics", !e.target.checked);
				});
			}
		};
	}

	// ==================================================== nota de conquista
	// 3.28.0: detalhe no visual dos Conjuntos de Conquistas da Steam, igual
	// para todas as origens (Steam, RA, Xbox, PlayStation, Native…)
	achievement(ctx) {
		const { U, C, model, current } = ctx;
		const g = model.games.find(x => x.achievements.some(a => a.path === current.file.path));
		const a = g?.achievements.find(x => x.path === current.file.path);
		if (!a) return { active: "achievements", html: `<div class="sv-page sv-pad">${U.empty({ icon: "alert", title: "Conquista sem jogo", text: "O campo game/gamePath desta nota não aponta para um jogo existente, ou ela é uma duplicata." })}</div>` };
		const tier = C.rarityOf(a);
		const known = a.rarity !== null && a.rarity !== undefined;
		const editable = !!ctx.A?.editable(g);
		const list = g.achievements, idx = list.indexOf(a);
		// conjunto e cor (mesma paleta do armário de conquistas)
		const S = C.achSets(g);
		const setIdx = S.sets.findIndex(st => st.name === (a.set || "Jogo base"));
		const st = S.sets[setIdx] || null;
		const setColor = st ? U.achSetTone(st.base, setIdx) : "var(--sv-blue)";
		const setName = st ? (st.base ? "Jogo base" : st.name) : "Jogo base";
		// posição na raridade do jogo: "3ª mais rara de 46"
		const ranked = list.filter(x => x.rarity !== null && x.rarity !== undefined).sort((x, y) => x.rarity - y.rarity);
		const rank = known ? ranked.indexOf(a) + 1 : 0;
		const unit = { retroachievements: "pontos", xbox: "Gamerscore", googleplay: "XP" }[g.provider] || "pontos";
		const secret = a.secret && !a.unlocked;
		const chips = [
			S.multi || a.set ? `<span class="sv-achd-chip sv-achd-chip--set" style="--c:${setColor}"><i></i>${U.esc(setName)}</span>` : "",
			a.secret ? `<span class="sv-achd-chip">${U.icon("lock")}Secreta</span>` : "",
			a.hardcore ? `<span class="sv-achd-chip sv-achd-chip--hc">${U.icon("flame")}Hardcore</span>` : "",
			a.category ? `<span class="sv-achd-chip">${U.esc(a.category)}</span>` : "",
			a.archived ? `<span class="sv-achd-chip">Arquivada</span>` : ""
		].join("");
		const when = a.unlocked && a.unlockedDate ? `${U.fmtDate(a.unlockedDate)}${a.unlockedTime ? ` · ${a.unlockedTime}` : ""}` : "";
		const status = `<article class="sv-achd-card sv-achd-status${a.unlocked ? " is-on" : ""}">
				<span class="sv-achd-status-icon">${U.icon(a.unlocked ? "check" : "lock")}</span>
				<div><span class="sv-achd-k">Estado</span><b>${a.unlocked ? "Desbloqueada" : "Bloqueada"}</b>
				<small>${a.unlocked ? (when ? `${U.esc(when)}${a.unlockedDate ? ` · ${U.esc(U.relDate(a.unlockedDate))}` : ""}` : "Data não registrada") : secret ? "Conquista secreta: a descrição aparece ao desbloquear" : "Ainda não desbloqueada"}</small></div>
				${editable ? `<button type="button" class="sv-achd-toggle${a.unlocked ? " is-on" : ""}" data-action="ach-unlock" data-ach-rarity="${a.rarity ?? ""}" data-path="${U.attr(a.path)}" aria-pressed="${a.unlocked}" title="${a.unlocked ? "Marcar como bloqueada" : "Marcar como desbloqueada"}">${U.icon(a.unlocked ? "lock" : "check")}<span>${a.unlocked ? "Bloquear" : "Desbloquear"}</span></button>` : ""}
			</article>`;
		const rarity = `<article class="sv-achd-card sv-achd-rarity${tier ? ` sv-rarity-${tier}` : ""}">
				<span class="sv-achd-k">Raridade global</span>
				${known ? `<div class="sv-achd-big"><b class="sv-num">${U.fmtPct(a.rarity)}</b><span>dos jogadores</span></div>
				<div class="sv-achd-meter sv-achd-meter--zones" role="img" aria-label="${U.attr(U.fmtPct(a.rarity))} dos jogadores"><i style="width:${Math.max(1.5, Math.min(100, a.rarity))}%"></i></div>
				<small><em>${U.esc(U.rarityLabel(tier))}</em>${rank && ranked.length > 1 ? ` · ${rank === 1 ? "a mais rara do jogo" : `${rank}ª mais rara de ${ranked.length}`}` : ""}</small>`
				: tier ? `<div class="sv-achd-big"><b>${U.esc(U.rarityLabel(tier))}</b></div><small>Raridade definida por você</small>`
				: `<div class="sv-achd-big"><b class="is-muted">—</b></div><small>${g.provider === "steam" || g.provider === "retroachievements" ? "Sincronize para trazer a % de jogadores" : "Esta origem não informa a % de jogadores"}</small>`}
			</article>`;
		const set = st ? `<article class="sv-achd-card sv-achd-set" style="--c:${setColor}">
				<span class="sv-achd-k">${S.multi ? "Conjunto" : "Progresso no jogo"}</span>
				<div class="sv-achd-big"><b>${U.esc(S.multi ? setName : g.title)}</b><span class="sv-num">${st.unlocked}/${st.total}</span></div>
				<div class="sv-achd-meter sv-achd-meter--set"><i style="width:${st.pct}%"></i></div>
				<small>${st.done ? `${U.icon("trophy")}Conjunto completo` : `<span>Faltam ${st.total - st.unlocked}</span> · ${U.fmtPct(Math.round(st.pct))}`}${S.multi ? ` · jogo: ${S.unlocked}/${S.total}` : ""}${st.excluded ? " · fora do total" : ""}</small>
			</article>` : "";
		const facts = [
			["Origem", U.achSourceTag(g)],
			a.points ? [unit === "Gamerscore" ? "Gamerscore" : unit === "XP" ? "XP" : "Pontos", `<b class="sv-num">${U.fmtNum(a.points)}</b>${unit === "Gamerscore" ? " G" : ""}`] : null,
			a.syncedFrom ? ["Desbloqueio", a.syncedFromSteam ? "Sincronizado da Steam" : a.syncedFromRA ? "Sincronizado do RetroAchievements" : `Sincronizado (${U.esc(a.syncedFrom)})`] : a.unlocked ? ["Desbloqueio", "Registrado por você"] : null,
			["Ordem no jogo", `${idx + 1} de ${list.length}`]
		].filter(Boolean);
		const details = `<article class="sv-achd-card sv-achd-facts"><span class="sv-achd-k">Detalhes</span><dl>${facts.map(([k, v]) => `<div><dt>${U.esc(k)}</dt><dd>${v}</dd></div>`).join("")}</dl></article>`;
		const nav = (x, dir) => x ? `<a class="sv-achd-nav sv-achd-nav--${dir}" ${U.openAttrs(x.path)}>${dir === "prev" ? U.icon("chevronLeft") : ""}<span><small>${dir === "prev" ? "Anterior" : "Próxima"}</small><b>${U.esc(x.name)}</b></span>${dir === "next" ? U.icon("chevronRight") : ""}</a>` : `<span class="sv-achd-nav is-empty"></span>`;
		const prev = list.slice(0, idx).reverse().find(x => x.path), next = list.slice(idx + 1).find(x => x.path);
		const sameSet = (st ? st.list : list).filter(x => x !== a);
		const siblings = sameSet.slice(Math.max(0, sameSet.findIndex(x => list.indexOf(x) > idx) - 3)).slice(0, 8);
		const html = `<div class="sv-page sv-achd">
			<section class="sv-achhero sv-achd-hero${a.unlocked ? " is-unlocked" : ""}${tier ? ` sv-rarity-${tier}` : ""}${a.unlocked && known && a.rarity <= 10 ? " is-glow" : ""}">
				${g.images.background ? `<img class="sv-achhero-bg" src="${U.attr(g.images.background)}" alt="" data-sv-img>` : ""}
				<div class="sv-achhero-inner sv-achd-inner">
					<div class="sv-achhero-icon sv-achd-medal">${U.icon(secret ? "eye" : "trophy")}${a.iconSrc ? `<img src="${U.attr(a.iconSrc)}" alt="" data-sv-img>` : ""}${a.unlocked ? "" : `<span class="sv-ach-lock">${U.icon("lock")}</span>`}</div>
					<div class="sv-achd-head">
						<a class="sv-achd-game" ${U.openAttrs(g.path)}>${g.images.cover ? `<img src="${U.attr(g.images.cover)}" alt="">` : ""}<span>${U.esc(g.title)}</span></a>
						<h1>${U.esc(a.name)}</h1>
						<p>${a.description ? U.esc(a.description) : secret ? "Conquista secreta" : "Sem descrição"}</p>
						${chips ? `<div class="sv-achd-chips">${chips}</div>` : ""}
					</div>
				</div>
			</section>
			<div class="sv-pad sv-achd-body">
				<div class="sv-achd-grid">${status}${rarity}${set}${details}</div>
				${a.notes ? `<article class="sv-achd-card sv-achd-notes"><span class="sv-achd-k">${U.icon("notebook")}Notas</span><p>${U.esc(a.notes)}</p></article>` : ""}
				<div class="sv-achd-actions">${editable
					? U.btn("Editar", { icon: "edit", kind: "secondary", action: "ach-manage", attrs: `data-path="${U.attr(g.path)}" data-edit="${U.attr(a.path)}"` })
					: U.btn("Editar", { icon: "edit", kind: "secondary", action: "legacy", attrs: 'data-legacy="editAchievement"' })}<a class="sv-btn sv-btn--ghost" ${U.openAttrs(g.path)}>${U.icon("grid")}<span>Abrir o jogo</span></a></div>
				${prev || next ? `<nav class="sv-achd-navs" aria-label="Outras conquistas">${nav(prev, "prev")}${nav(next, "next")}</nav>` : ""}
				${siblings.length ? `<section class="sv-block">${U.sectionHead(S.multi ? `Mais de ${setName}` : `Outras de ${g.title}`, { count: sameSet.length, action: `<a class="sv-link" ${U.openAttrs(g.path)}>Ver todas</a>` })}<div class="sv-achlist">${siblings.map(x => U.achievementTile(x)).join("")}</div></section>` : ""}
			</div>
		</div>`;
		return { active: "achievements", html };
	}
}
