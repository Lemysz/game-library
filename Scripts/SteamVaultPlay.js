// ==========================================================================
// Game Library — Play (o que fazer a seguir com a sua biblioteca)
//
// Funcionalidades que leem o modelo (SteamVaultCore) e ajudam a decidir,
// acompanhar e celebrar — nada aqui inventa dado:
//   · Caçador de conquistas   próximas conquistas, das mais fáceis às raras
//   · Calendário               mês a mês, com toque no dia
//   · Metas automáticas        progresso calculado a partir das datas
//   · Retrospectiva (Stories)  seu ano em tela cheia
//   · O que jogar agora?       sugestões do backlog em cartas
//   · Coleções automáticas     listas montadas pelos dados, tocáveis
//
// Acesso: customJS.SteamVaultPlay
// ==========================================================================

class SteamVaultPlay {

	constructor() {
		this.statsPath = "Dashboard/Estatísticas.md";   // metas e prêmios vivem aqui
		this.weekdays = ["D", "S", "T", "Q", "Q", "S", "S"];
		this.monthNames = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
	}

	get U() { return customJS.SteamVaultUI; }
	get C() { return customJS.SteamVaultCore; }
	get V() { return customJS.SteamVault; }

	// eventos por dia, calculados uma vez por revisão do modelo
	_days(model) {
		if (model.__svDays) return model.__svDays;
		const days = new Map();
		for (const e of this.C.activity(model, { limit: 100000 })) {
			if (!days.has(e.date)) days.set(e.date, []);
			days.get(e.date).push(e);
		}
		model.__svDays = days;
		return days;
	}

	// ======================================================= CAÇADOR
	// Bloqueadas ordenadas pela % de jogadores (mais comum = mais fácil);
	// as marcadas como alvo vêm primeiro; sem porcentagem, por último.
	huntList(g, n = 6) {
		// conjunto tirado do total (ex.: DLC que a pessoa não tem) fica de fora,
		// a menos que a conquista tenha sido marcada como alvo
		return g.achievements.filter(a => !a.unlocked && (a.target || this.C.achCounts(g, a))).sort((a, b) =>
			(b.target - a.target) || ((b.rarity ?? -1) - (a.rarity ?? -1)) || a.name.localeCompare(b.name)).slice(0, n);
	}

	_unit(g) { return customJS.SteamVaultAchievements?.isXbox?.(g) ? "G" : ""; }

	difficulty(r) {
		if (r === null || r === undefined) return { label: "Sem dados", tone: "muted" };
		if (r >= 50) return { label: "Fácil", tone: "green" };
		if (r >= 20) return { label: "Média", tone: "blue" };
		if (r >= 5) return { label: "Difícil", tone: "amber" };
		return { label: "Lendária", tone: "gold" };
	}

	huntRow(a, { game = null, unit = "" } = {}) {
		const U = this.U, d = this.difficulty(a.rarity);
		// 3.70.0: sem raridade (Xbox manual), o G da conquista no lugar de "Sem dados"
		if (unit && (a.rarity === null || a.rarity === undefined) && Number(a.points) > 0) d.label = `${U.fmtNum(Number(a.points))} ${unit}`;
		return `<li class="sv-hunt${a.target ? " is-target" : ""}">
			<a class="sv-hunt-icon" ${a.path ? U.openAttrs(a.path) : ""} aria-label="${U.attr(a.name || "Conquista")}">${a.iconSrc ? `<img src="${U.attr(a.iconSrc)}" alt="" loading="lazy" data-sv-img>` : U.icon("trophy")}</a>
			<div class="sv-hunt-text">
				<b>${U.esc(a.name)}</b>
				<span class="sv-meta">${game ? `<a ${U.openAttrs(game.path)}>${U.esc(game.title)}</a>` : ""}<span class="sv-hunt-diff sv-tone-${d.tone}">${d.label}</span>${a.rarity !== null ? `<span>${U.fmtPct(a.rarity)} dos jogadores</span>` : ""}</span>
				${a.description && !game ? `<p>${U.esc(a.description)}</p>` : ""}
			</div>
			${a.path ? `<button type="button" class="sv-hunt-pin${a.target ? " is-on" : ""}" data-action="ach-target" data-path="${U.attr(a.path)}" aria-pressed="${a.target}" title="${a.target ? "Tirar dos alvos" : "Marcar como alvo"}">${U.icon("pin")}</button>` : ""}
		</li>`;
	}

	// bloco na aba Conquistas da ficha
	hunterBlock(ctx, g) {
		const U = this.U;
		const list = this.huntList(g);
		if (!list.length) return "";
		const targets = g.achievements.filter(a => a.target && !a.unlocked).length;
		return `<section class="sv-hunter">
			${U.sectionHead("Próximas conquistas", { sub: targets ? `${U.plural(targets, "alvo marcado", "alvos marcados")} · depois, das mais comuns às mais raras` : "Das mais comuns (mais fáceis) às mais raras. Fixe as que quer caçar." })}
			<ol class="sv-huntlist">${list.map(a => this.huntRow(a, { unit: this._unit(g) })).join("")}</ol>
		</section>`;
	}

	// Home: alvos da biblioteca inteira + as mais fáceis dos jogos em andamento
	homeHunter(ctx) {
		const { model } = ctx, U = this.U;
		const out = [], seen = new Set();
		const push = (a, g) => { if (!seen.has(a.path || a.name + g.path)) { seen.add(a.path || a.name + g.path); out.push({ a, g }); } };
		for (const g of model.games) for (const a of g.achievements) if (a.target && !a.unlocked) push(a, g);
		const active = model.games.filter(g => ["Playing", "Paused"].includes(g.status) && g.ach.state === "known" && !g.ach.perfect)
			.sort((a, b) => (b.status === "Playing") - (a.status === "Playing") || b.lastPlayed.date.localeCompare(a.lastPlayed.date));
		for (const g of active) for (const a of this.huntList(g, 2)) if (out.length < 5) push(a, g);
		if (!out.length) return "";
		return `${U.sectionHead("Próximas conquistas", { sub: "Seus alvos e as mais fáceis do que está jogando" })}<ol class="sv-huntlist sv-huntlist--compact">${out.slice(0, 5).map(x => this.huntRow(x.a, { game: x.g, unit: this._unit(x.g) })).join("")}</ol>`;
	}

	async toggleTarget(el) {
		const path = el.dataset.path;
		const f = app.vault.getAbstractFileByPath(path);
		if (!f) return;
		const on = el.getAttribute("aria-pressed") !== "true";
		document.querySelectorAll(`[data-action="ach-target"][data-path="${CSS.escape(path)}"]`).forEach(b => {
			b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", String(on));
			b.title = on ? "Tirar dos alvos" : "Marcar como alvo";
			b.closest(".sv-hunt")?.classList.toggle("is-target", on);
		});
		this.V._haptic?.(on ? 12 : 8);
		try {
			await app.fileManager.processFrontMatter(f, fm => { if (on) fm.target = true; else delete fm.target; });
			this.V.toast(on ? "Conquista marcada como alvo" : "Alvo removido", { icon: "target", tone: on ? "ok" : "" });
		} catch (err) { this.V.toast(`Não foi possível salvar: ${err.message}`, { tone: "error" }); }
	}

	// ======================================================= CALENDÁRIO
	calendarBlock(ctx) {
		const d = new Date();
		return `<section class="sv-block sv-calendar-block" data-calendar data-ym="${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}">${this.calendarHtml(ctx, d.getFullYear(), d.getMonth())}</section>`;
	}

	calendarHtml(ctx, y, m) {
		const U = this.U, days = this._days(ctx.model);
		const p = n => String(n).padStart(2, "0");
		const first = new Date(y, m, 1), total = new Date(y, m + 1, 0).getDate();
		const today = this.C.today();
		let count = 0, active = 0, max = 1;
		for (let i = 1; i <= total; i++) { const n = (days.get(`${y}-${p(m + 1)}-${p(i)}`) || []).length; max = Math.max(max, n); }
		const cells = [];
		for (let i = 0; i < first.getDay(); i++) cells.push(`<span class="sv-cal-day is-pad"></span>`);
		for (let i = 1; i <= total; i++) {
			const iso = `${y}-${p(m + 1)}-${p(i)}`;
			const ev = days.get(iso) || [];
			if (ev.length) { active++; count += ev.reduce((s, e) => s + (e.type === "achievement" ? e.achievements.length : 1), 0); }
			const types = new Set(ev.map(e => e.type));
			const dots = ["perfect", "completed", "achievement", "session", "started"].filter(t => types.has(t)).slice(0, 3)
				.map(t => `<i class="sv-cal-dot sv-cal-dot--${t}"></i>`).join("");
			const lvl = ev.length ? Math.min(3, Math.ceil((ev.length / max) * 3)) : 0;
			cells.push(ev.length
				? `<button type="button" class="sv-cal-day l${lvl}${iso === today ? " is-today" : ""}" data-cal-day="${iso}" aria-label="${U.attr(`${i} de ${this.monthNames[m]}: ${customJS.SteamVaultUI.plural(ev.length, "evento", "eventos")}`)}"><b>${i}</b><span>${dots}</span></button>`
				: `<span class="sv-cal-day${iso === today ? " is-today" : ""}"><b>${i}</b></span>`);
		}
		const isNow = y === new Date().getFullYear() && m === new Date().getMonth();
		return `${U.sectionHead("Calendário", { sub: active ? `${U.plural(active, "dia com atividade", "dias com atividade")} · ${U.plural(count, "evento", "eventos")}` : "Nenhuma atividade registrada neste mês", action: `<span class="sv-cal-nav">${U.btn("", { icon: "chevronLeft", kind: "ghost", size: "sm", title: "Mês anterior", attrs: 'data-cal-move="-1"' })}<span class="sv-cal-title">${this.monthNames[m]} ${y}</span>${U.btn("", { icon: "chevronRight", kind: "ghost", size: "sm", title: "Próximo mês", attrs: `data-cal-move="1"${isNow ? " disabled" : ""}` })}</span>` })}
			<div class="sv-cal">
				${this.weekdays.map(w => `<span class="sv-cal-wd">${w}</span>`).join("")}
				${cells.join("")}
			</div>
			<p class="sv-cal-legend"><span><i class="sv-cal-dot sv-cal-dot--achievement"></i>Conquistas</span><span><i class="sv-cal-dot sv-cal-dot--session"></i>Sessões</span><span><i class="sv-cal-dot sv-cal-dot--completed"></i>Zerou</span><span><i class="sv-cal-dot sv-cal-dot--started"></i>Começou</span></p>`;
	}

	wireCalendar(root, ctx) {
		root.querySelectorAll("[data-calendar]").forEach(box => {
			box.addEventListener("click", e => {
				const mv = e.target.closest("[data-cal-move]");
				if (mv) {
					let [y, m] = box.dataset.ym.split("-").map(Number); m = m - 1 + Number(mv.dataset.calMove);
					const d = new Date(y, m, 1);
					box.dataset.ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
					box.innerHTML = this.calendarHtml(ctx, d.getFullYear(), d.getMonth());
					this.V._wireImages?.(box);
					return;
				}
				const day = e.target.closest("[data-cal-day]");
				if (day) this.openDay(ctx, day.dataset.calDay);
			});
		});
	}

	openDay(ctx, iso) {
		const U = this.U;
		const ev = this._days(ctx.model).get(iso) || [];
		const m = this.V.modal({ title: U.fmtDate(iso), sub: U.relDate(iso), size: "md", body: `<div class="sv-host">${ctx.P.activityFeed(ctx, ev, { showDay: false })}</div>` });
		this.wireModalLinks(m, ctx);
		this.V._wireImages?.(m.body);
	}

	// links dentro de janelas (que vivem fora da tela do app): abrir fecha a janela
	wireModalLinks(m, ctx) {
		m.el.addEventListener("click", e => {
			const fav = e.target.closest('[data-action="favorite"]');
			if (fav) { e.preventDefault(); e.stopPropagation(); this.V._toggleFavorite(fav, fav.dataset.path, m.el); return; }
			const a = e.target.closest("[data-open]");
			if (!a) return;
			e.preventDefault();
			m.close();
			this.V.open(a.dataset.open, ctx, e.ctrlKey || e.metaKey);
		});
	}

	// ======================================================= METAS
	// Definidas no frontmatter de Dashboard/Estatísticas (`goals`), como os
	// prêmios. O progresso é sempre calculado das datas das notas.
	goalTypes() {
		return {
			complete: { label: "Zerar jogos", text: n => `Zerar ${n} ${n === 1 ? "jogo" : "jogos"}`, icon: "flag", yearly: true },
			start: { label: "Começar jogos", text: n => `Começar ${n} ${n === 1 ? "jogo" : "jogos"}`, icon: "play", yearly: true },
			achievements: { label: "Desbloquear conquistas", text: n => `Desbloquear ${n} conquistas`, icon: "trophy", yearly: true },
			rare: { label: "Conquistas raras (até 15%)", text: n => `${n} conquistas raras`, icon: "medal", yearly: true },
			perfect: { label: "Jogos com 100%", text: n => `100% em ${n} ${n === 1 ? "jogo" : "jogos"}`, icon: "gem", yearly: true },
			hours: { label: "Horas em sessões", text: n => `${n} horas em sessões`, icon: "clock", yearly: true },
			queue: { label: "Zerar jogos da fila A seguir", text: n => `Zerar ${n} ${n === 1 ? "jogo" : "jogos"} da fila A seguir`, icon: "list", yearly: true },
			backlog: { label: "Backlog no máximo", text: n => `Backlog com até ${n} jogos`, icon: "books", yearly: false }
		};
	}

	// período da meta: "2026" (ano) ou "2026-10" (mês, 3.45.0)
	goalPeriod(y) {
		const m = /^(\d{4})-(\d{2})$/.exec(y || "");
		if (!m) return String(y);
		const names = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
		return `${names[Number(m[2]) - 1]} de ${m[1]}`;
	}

	goals(ctx) {
		const f = app.vault.getAbstractFileByPath(this.statsPath);
		const fm = f ? app.metadataCache.getFileCache(f)?.frontmatter : null;
		const types = this.goalTypes();
		return this.C.arr(fm?.goals).filter(x => x && typeof x === "object" && types[x.type] && Number(x.target) > 0)
			.map(x => ({ type: x.type, target: Number(x.target), year: /^\d{4}(-\d{2})?$/.test(String(x.year)) ? String(x.year) : String(new Date().getFullYear()) }));
	}

	goalProgress(model, goal) {
		const C = this.C, y = goal.year, t = this.goalTypes()[goal.type];
		const inY = d => !!d && d.startsWith(y);
		const g = model.games;
		let value = 0;
		const unlocked = () => g.flatMap(x => x.achievements.filter(a => a.unlocked && inY(a.unlockedDate)));
		switch (goal.type) {
			case "complete": value = g.filter(x => inY(x.completionDate)).length; break;
			case "start": value = g.filter(x => inY(x.startDate)).length; break;
			case "achievements": value = unlocked().length; break;
			case "rare": value = unlocked().filter(a => a.rarity !== null && a.rarity <= 15).length; break;
			case "perfect": value = [...this._days(model).values()].flat().filter(e => e.type === "perfect" && inY(e.date)).length; break;
			case "hours": value = Math.round(g.flatMap(x => x.sessions).filter(s => inY(C.iso(s.date))).reduce((a, s) => a + (C.num(s.hours) || 0), 0) * 10) / 10; break;
			case "queue": value = g.filter(x => x.upNext !== null && inY(x.completionDate)).length; break;
			case "backlog": value = g.filter(x => x.status === "Backlog").length; break;
		}
		if (goal.type === "backlog") {
			const done = value <= goal.target;
			return { value, target: goal.target, done, pct: done ? 100 : Math.max(4, Math.min(99, (goal.target / Math.max(1, value)) * 100)), text: t.text(goal.target), sub: done ? "Meta cumprida" : `${value} no backlog agora — faltam ${value - goal.target}`, icon: t.icon };
		}
		const pct = Math.min(100, (value / goal.target) * 100);
		const done = value >= goal.target;
		// ritmo esperado até hoje (só para o período corrente: o ano ou o mês)
		let sub = done ? "Meta cumprida" : `${this.U.fmtNum(value, 1)} de ${goal.target}`;
		const now = new Date(), monthly = y.length === 7;
		const cur = monthly ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}` : String(now.getFullYear());
		if (!done && y === cur) {
			const start = monthly ? new Date(now.getFullYear(), now.getMonth(), 1) : new Date(now.getFullYear(), 0, 1);
			const end = monthly ? new Date(now.getFullYear(), now.getMonth() + 1, 1) : new Date(now.getFullYear() + 1, 0, 1);
			const expected = goal.target * ((now - start) / (end - start));
			sub += value + 0.001 >= expected ? " · no ritmo" : ` · esperado ${this.U.fmtNum(expected, expected < 10 ? 1 : 0)} até hoje`;
		} else if (!done && y < cur) sub += " · não cumprida";
		return { value, target: goal.target, done, pct, text: `${t.text(goal.target)}${t.yearly ? ` em ${this.goalPeriod(y)}` : ""}`, sub, icon: t.icon };
	}

	goalCard(model, goal, i, { compact = false } = {}) {
		const U = this.U, pr = this.goalProgress(model, goal);
		return `<article class="sv-goal${pr.done ? " is-done" : ""}${compact ? " sv-goal--compact" : ""}">
			<div class="sv-goal-ring">${U.ring(pr.pct, { size: compact ? 48 : 64, stroke: compact ? 4 : 5, perfect: pr.done })}<span>${pr.done ? U.icon("check") : U.icon(pr.icon)}</span></div>
			<div class="sv-goal-text"><b>${U.esc(pr.text)}</b><small>${U.esc(pr.sub)}</small></div>
		</article>`;
	}

	goalsBlock(ctx, { compact = false } = {}) {
		const U = this.U, goals = this.goals(ctx);
		const year = String(new Date().getFullYear());
		const edit = U.btn(goals.length ? "Editar" : "Criar meta", { icon: goals.length ? "edit" : "plus", kind: goals.length ? "ghost" : "secondary", size: "sm", action: "goals-edit" });
		if (compact) {
			const month = `${year}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
			const cur = goals.filter(x => x.year === year || x.year === month || x.type === "backlog");
			if (!cur.length) return "";
			return `<section class="sv-block sv-goals-home">${U.sectionHead(`Metas de ${year}`, { action: `<a class="sv-link" ${U.openAttrs("Dashboard/Estatísticas")}>Ver todas</a>` })}<div class="sv-goals sv-goals--strip">${cur.map((x, i) => this.goalCard(ctx.model, x, i, { compact: true })).join("")}</div></section>`;
		}
		return `<section class="sv-block sv-goals-block">${U.sectionHead("Metas", { sub: goals.length ? "Progresso calculado pelas datas das suas notas" : "Defina metas e acompanhe o progresso sem marcar nada à mão", action: edit })}
			${goals.length ? `<div class="sv-goals">${goals.map((x, i) => this.goalCard(ctx.model, x, i)).join("")}</div>` : ""}</section>`;
	}

	openGoalsEditor(ctx) {
		const U = this.U, types = this.goalTypes();
		let list = this.goals(ctx);
		const year = new Date().getFullYear();
		const body = document.createElement("div");
		const paint = () => {
			body.innerHTML = `<div class="sv-goaledit">
				${list.length ? `<ul class="sv-goaledit-list">${list.map((x, i) => `<li><span class="sv-goaledit-ico">${U.icon(types[x.type].icon)}</span><span><b>${U.esc(types[x.type].text(x.target))}</b><small>${types[x.type].yearly ? U.esc(this.goalPeriod(x.year)) : "estado atual"}</small></span><button type="button" class="sv-btn sv-btn--ghost sv-btn--icon sv-btn--sm" data-rm="${i}" aria-label="Remover meta" title="Remover">${U.icon("trash")}</button></li>`).join("")}</ul>` : `<p class="sv-modal-text">Nenhuma meta ainda.</p>`}
				<div class="sv-goaledit-add">
					<label class="sv-label">Nova meta</label>
					<div class="sv-goaledit-row">
						<label class="sv-goal-f"><span class="sv-goal-fl">Tipo</span><span class="sv-select"><select data-g-type>${Object.entries(types).map(([k, v]) => `<option value="${k}">${U.esc(v.label)}</option>`).join("")}</select></span></label>
						<label class="sv-goal-f"><span class="sv-goal-fl">Quantidade</span><input class="sv-input" type="number" min="1" inputmode="numeric" value="5" data-g-n></label>
						<label class="sv-goal-f"><span class="sv-goal-fl">Ano</span><input class="sv-input" type="number" min="2000" max="2100" inputmode="numeric" value="${year}" data-g-year></label>
					</div>
					<div class="sv-goaledit-row sv-goaledit-period">
						<label class="sv-select"><select data-g-period aria-label="Período"><option value="year">No ano inteiro</option><option value="month">Em um mês</option></select></label>
						<label class="sv-select" data-g-month-wrap hidden><select data-g-month aria-label="Mês">${["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"].map((n, i) => `<option value="${String(i + 1).padStart(2, "0")}"${i === new Date().getMonth() ? " selected" : ""}>${n}</option>`).join("")}</select></label>
					</div>
					${U.btn("Adicionar meta", { icon: "plus", kind: "secondary", attrs: "data-g-add" })}
				</div>
			</div>`;
		};
		paint();
		const m = this.V.modal({ title: "Metas", sub: "O progresso é calculado automaticamente", size: "sm", body,
			actions: `${U.btn("Cancelar", { kind: "ghost", attrs: "data-close" })}${U.btn("Salvar", { kind: "primary", icon: "check", attrs: "data-g-save" })}` });
		body.addEventListener("change", e => {
			if (e.target.matches("[data-g-period]")) body.querySelector("[data-g-month-wrap]").hidden = e.target.value !== "month";
		});
		body.addEventListener("click", e => {
			const rm = e.target.closest("[data-rm]");
			if (rm) { list.splice(Number(rm.dataset.rm), 1); paint(); return; }
			if (e.target.closest("[data-g-add]")) {
				const type = body.querySelector("[data-g-type]").value, target = Math.max(1, Math.round(Number(body.querySelector("[data-g-n]").value) || 0));
				let y = String(Math.round(Number(body.querySelector("[data-g-year]").value) || year));
				if (body.querySelector("[data-g-period]").value === "month" && types[type].yearly) y += "-" + body.querySelector("[data-g-month]").value;
				if (!target) return;
				list.push({ type, target, year: y }); paint();
			}
		});
		m.el.querySelector("[data-g-save]").addEventListener("click", async () => {
			const f = app.vault.getAbstractFileByPath(this.statsPath);
			if (!f) return this.V.toast(`Nota ${this.statsPath} não encontrada`, { tone: "error" });
			await app.fileManager.processFrontMatter(f, fm => { fm.goals = list.map(x => ({ type: x.type, target: x.target, year: x.year })); });
			this.C.invalidate();
			m.close();
			this.V.toast("Metas salvas", { tone: "ok", icon: "flag" });
			setTimeout(() => this.V.refresh(), 250);
		});
	}

	// metas cumpridas: um aviso por meta, uma vez
	announceGoals(ctx) {
		const U = this.U;
		const done = this.goals(ctx).filter(g => this.goalProgress(ctx.model, g).done).map(g => `${g.type}:${g.target}:${g.year}`);
		let seen = null;
		try { seen = JSON.parse(U._store("goalsDone") || "null"); } catch (_) {}
		if (!seen) { U._store("goalsDone", JSON.stringify(done)); return; }
		const fresh = done.filter(k => !seen.includes(k));
		U._store("goalsDone", JSON.stringify([...new Set([...seen, ...done])]));
		fresh.slice(0, 2).forEach((k, i) => setTimeout(() => {
			const [type, target, year] = k.split(":");
			this.V.toast(`Meta cumprida: ${this.goalTypes()[type].text(Number(target))} em ${this.goalPeriod(year)}`, { icon: "flag", tone: "ok" });
			this.V._haptic?.(18);
		}, 2000 + i * 900));
	}

	// ======================================================= RETROSPECTIVA
	// O ano em Stories: tela cheia, toque à direita avança, à esquerda
	// volta, segurar pausa, arrastar para baixo fecha. Só dados do ano.
	yearsWithData(model) {
		return [...new Set([...this._days(model).keys()].map(d => d.slice(0, 4)))].sort().reverse();
	}

	yearData(model, y) {
		const C = this.C, inY = d => !!d && d.startsWith(y);
		const events = [...this._days(model)].filter(([d]) => inY(d)).flatMap(([, l]) => l);
		const perGame = new Map();
		const bump = (g, n) => perGame.set(g, (perGame.get(g) || 0) + n);
		for (const e of events) bump(e.game, e.type === "achievement" ? e.achievements.length : e.type === "completed" ? 6 : e.type === "session" ? 3 : e.type === "perfect" ? 8 : 1);
		const played = [...perGame].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]).map(([g]) => g);
		const unlocked = model.games.flatMap(g => g.achievements.filter(a => a.unlocked && inY(a.unlockedDate)).map(a => ({ a, g })));
		const rarest = unlocked.filter(x => x.a.rarity !== null).sort((x, y2) => x.a.rarity - y2.a.rarity)[0] || null;
		const completed = model.games.filter(g => inY(g.completionDate)).sort((a, b) => a.completionDate.localeCompare(b.completionDate));
		const started = model.games.filter(g => inY(g.startDate));
		const added = model.games.filter(g => inY(g.dateAdded));
		const perfect = events.filter(e => e.type === "perfect").map(e => e.game);
		const sessions = model.games.flatMap(g => g.sessions.filter(se => inY(C.iso(se.date))));
		const hours = Math.round(sessions.reduce((a, se) => a + (C.num(se.hours) || 0), 0) * 10) / 10;
		const byMonth = new Array(12).fill(0);
		for (const e of events) byMonth[Number(e.date.slice(5, 7)) - 1] += e.type === "achievement" ? e.achievements.length : 1;
		const topMonth = byMonth.indexOf(Math.max(...byMonth));
		const days = [...new Set(events.map(e => e.date))].sort();
		let best = 0, run = 0, prev = "";
		for (const d of days) { run = prev && C.daysBetween(prev, d) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = d; }
		const genres = new Map();
		for (const [g, n] of perGame) for (const x of g.genres) genres.set(x, (genres.get(x) || 0) + n);
		const topGenre = [...genres].sort((a, b) => b[1] - a[1])[0]?.[0] || "";
		return { y, events, played, top: played[0] || null, topScore: perGame.get(played[0]) || 0, unlocked, rarest, completed, started, added, perfect, sessions, hours, byMonth, topMonth, activeDays: days.length, streak: best, topGenre, genreGames: played.filter(g => g.genres.includes(topGenre)) };
	}

	openStories(ctx, year = null) {
		const U = this.U, V = this.V;
		const years = this.yearsWithData(ctx.model);
		const y = year || years.find(x => x === String(new Date().getFullYear())) || years[0] || String(new Date().getFullYear());
		const d = this.yearData(ctx.model, y);
		if (!d.events.length) return V.toast(`Nenhuma atividade com data em ${y}`, { tone: "warn", icon: "calendar" });
		const covers = list => `<div class="sv-story-covers">${list.slice(0, 6).map((g, i) => `<span style="--i:${i}">${U.cover(g)}</span>`).join("")}</div>`;
		const big = (n, label) => `<div class="sv-story-big"><b>${U.esc(String(n))}</b><span>${U.esc(label)}</span></div>`;
		const slides = [];
		const art = g => g?.images.background || g?.images.featured || g?.images.cover || "";
		slides.push({ bg: art(d.top), html: `<span class="sv-story-kicker">Retrospectiva</span><h2 class="sv-story-title">Seu ${y}<br>na Game Library</h2>${covers(d.played)}${years.length > 1 ? `<div class="sv-story-years">${years.slice(0, 6).map(x => `<button type="button" data-story-year="${x}" class="${x === y ? "is-active" : ""}">${x}</button>`).join("")}</div>` : ""}` });
		slides.push({ html: `<span class="sv-story-kicker">Sua biblioteca em ${y}</span>${big(d.played.length, d.played.length === 1 ? "jogo com atividade" : "jogos com atividade")}<ul class="sv-story-facts">${d.started.length ? `<li><b>${d.started.length}</b> começados</li>` : ""}${d.added.length ? `<li><b>${d.added.length}</b> adicionados</li>` : ""}<li><b>${d.activeDays}</b> ${d.activeDays === 1 ? "dia" : "dias"} com atividade</li></ul>` });
		if (d.top) slides.push({ bg: art(d.top), html: `<span class="sv-story-kicker">O jogo do seu ano</span><div class="sv-story-hero">${U.cover(d.top)}<div><h2 class="sv-story-title">${U.esc(d.top.title)}</h2><p class="sv-story-sub">${[d.unlocked.filter(x => x.g === d.top).length ? `${d.unlocked.filter(x => x.g === d.top).length} conquistas` : "", d.top.sessions.filter(se => (this.C.iso(se.date) || "").startsWith(y)).length ? `${d.top.sessions.filter(se => (this.C.iso(se.date) || "").startsWith(y)).length} sessões` : "", d.completed.includes(d.top) ? "zerado no ano" : ""].filter(Boolean).join(" · ")}</p></div></div>` });
		if (d.unlocked.length) slides.push({ html: `<span class="sv-story-kicker">Conquistas</span>${big(U.fmtNum(d.unlocked.length), "conquistas desbloqueadas")}${d.rarest ? `<div class="sv-story-medal sv-rarity-${U.rarityTier(d.rarest.a.rarity)}"><div>${d.rarest.a.iconSrc ? `<img src="${U.attr(d.rarest.a.iconSrc)}" alt="">` : U.icon("trophy")}</div><p><small>A mais rara</small><b>${U.esc(d.rarest.a.name)}</b><span>${U.fmtPct(d.rarest.a.rarity)} dos jogadores · ${U.esc(d.rarest.g.title)}</span></p></div>` : ""}` });
		if (d.completed.length) slides.push({ html: `<span class="sv-story-kicker">Zerados</span>${big(d.completed.length, d.completed.length === 1 ? "jogo zerado" : "jogos zerados")}${covers(d.completed)}` });
		if (d.perfect.length) slides.push({ html: `<span class="sv-story-kicker">100%</span>${big(d.perfect.length, d.perfect.length === 1 ? "jogo com todas as conquistas" : "jogos com todas as conquistas")}${covers(d.perfect)}` });
		const maxM = Math.max(1, ...d.byMonth);
		slides.push({ html: `<span class="sv-story-kicker">Ritmo</span><h2 class="sv-story-title">Seu mês mais ativo foi ${this.monthNames[d.topMonth]}</h2><div class="sv-story-months">${d.byMonth.map((n, i) => `<span class="${i === d.topMonth ? "is-top" : ""}" style="--h:${Math.max(4, (n / maxM) * 100)}%"><i></i><small>${U.months[i][0].toUpperCase()}</small></span>`).join("")}</div>${d.streak > 1 ? `<p class="sv-story-sub">Maior sequência: <b>${d.streak} dias seguidos</b></p>` : ""}${d.hours ? `<p class="sv-story-sub">${U.fmtHours(d.hours)} registradas em sessões</p>` : ""}` });
		if (d.topGenre) slides.push({ html: `<span class="sv-story-kicker">Gênero favorito</span><h2 class="sv-story-title sv-story-title--xl">${U.esc(d.topGenre)}</h2>${covers(d.genreGames)}` });
		slides.push({ html: `<span class="sv-story-kicker">Resumo de ${y}</span><div class="sv-story-grid">${[[d.played.length, "jogos"], [d.completed.length, "zerados"], [U.fmtNum(d.unlocked.length), "conquistas"], [d.perfect.length, "com 100%"], [d.activeDays, "dias ativos"], [d.streak, "dias seguidos"]].map(([n, l]) => `<div><b>${n}</b><span>${l}</span></div>`).join("")}</div><div class="sv-story-actions">${U.btn("Imagem para compartilhar", { icon: "image", kind: "glass", attrs: "data-story-share" })}${U.btn("Fechar", { kind: "primary", attrs: "data-story-close" })}</div>` });
		this._storyPlayer(ctx, slides, y);
	}

	_storyPlayer(ctx, slides, y) {
		const V = this.V, reduce = !V._motionOn?.();
		const el = document.createElement("div");
		el.className = "sv-stories steamvault";
		el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", `Retrospectiva ${y}`);
		el.innerHTML = `<div class="sv-story-bars">${slides.map(() => `<span><i></i></span>`).join("")}</div>
			<button type="button" class="sv-story-x" aria-label="Fechar">${this.U.icon("x")}</button>
			<div class="sv-story-stage" aria-live="polite"></div>`;
		document.body.appendChild(el);
		// Tab preso na retrospectiva; ao fechar, o foco volta para quem abriu
		const release = this.U.trapFocus?.(el, { initial: () => el.querySelector(".sv-story-x") });
		const stage = el.querySelector(".sv-story-stage"), bars = [...el.querySelectorAll(".sv-story-bars i")];
		const DUR = 6500;
		let i = 0, t0 = 0, elapsed = 0, paused = false, raf = 0, closed = false;
		const show = n => {
			i = Math.max(0, Math.min(slides.length - 1, n)); elapsed = 0; t0 = performance.now();
			const sl = slides[i];
			stage.innerHTML = `<div class="sv-story${sl.bg ? " has-bg" : ""}">${sl.bg ? `<img class="sv-story-bg" src="${this.U.attr(sl.bg)}" alt="">` : ""}<div class="sv-story-body">${sl.html}</div></div>`;
			bars.forEach((b, k) => { b.style.transform = `scaleX(${k < i ? 1 : 0})`; });
			V._wireImages?.(stage);
		};
		const tick = now => {
			if (closed) return;
			if (!paused) {
				elapsed += now - t0;
				bars[i].style.transform = `scaleX(${Math.min(1, elapsed / DUR)})`;
				if (elapsed >= DUR) { if (i < slides.length - 1) show(i + 1); else { paused = true; bars[i].style.transform = "scaleX(1)"; } }
			}
			t0 = now; raf = requestAnimationFrame(tick);
		};
		const close = () => { if (closed) return; closed = true; cancelAnimationFrame(raf); el.classList.remove("is-open"); document.removeEventListener("keydown", onKey, true); release?.(); setTimeout(() => el.remove(), 260); };
		const onKey = e => { if (e.key === "Escape") { e.stopPropagation(); close(); } else if (e.key === "ArrowRight") show(i + 1); else if (e.key === "ArrowLeft") show(i - 1); };
		document.addEventListener("keydown", onKey, true);
		// toque: esquerda volta, direita avança; segurar pausa; arrastar para baixo fecha
		let sx = 0, sy = 0, st = 0, moved = false;
		el.addEventListener("pointerdown", e => { if (e.target.closest("button")) return; sx = e.clientX; sy = e.clientY; st = performance.now(); moved = false; paused = true; });
		el.addEventListener("pointermove", e => { if (!st) return; const dy = e.clientY - sy; if (Math.abs(dy) > 12 || Math.abs(e.clientX - sx) > 12) moved = true; if (dy > 0) stage.style.transform = `translateY(${dy * 0.6}px)`; });
		el.addEventListener("pointerup", e => {
			if (!st) return;
			const dy = e.clientY - sy, held = performance.now() - st; st = 0; stage.style.transform = "";
			if (dy > 110) return close();
			paused = false;
			if (moved || held > 350) return;
			const w = el.clientWidth;
			show(e.clientX < w * 0.33 ? i - 1 : i + 1);
		});
		el.addEventListener("click", e => {
			if (e.target.closest(".sv-story-x, [data-story-close]")) return close();
			const yb = e.target.closest("[data-story-year]");
			if (yb) { close(); return setTimeout(() => this.openStories(ctx, yb.dataset.storyYear), 280); }
			// 3.55.0: o cartão do ano é o cartão de estatísticas com o intervalo
			// daquele ano (a rotina antiga da retrospectiva não existe mais)
			if (e.target.closest("[data-story-share]")) { close(); return setTimeout(() => this._shareYear(ctx, y), 280); }
		});
		show(0);
		requestAnimationFrame(() => el.classList.add("is-open"));
		if (!reduce) raf = requestAnimationFrame(tick); else { paused = true; }
		V._haptic?.();
	}

	_shareYear(ctx, y) {
		const I = ctx.I || customJS.SteamVaultInsights;
		if (!ctx.SH || !I?._stWindow) return this.V.toast("Módulo de cartão ausente (SteamVaultShare.js)", { tone: "warn" });
		const from = `${y}-01-01`, to = `${y}-12-31`;
		const W = I._stWindow(ctx, from, to, false);
		const top = [...W.hoursBy].filter(([, h]) => h > 0).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([g, h]) => ({ g, h }));
		window.__svStatsShare = { period: "year", label: String(y), range: { from, to, label: `em ${y}` }, W, top };
		return ctx.SH.open(ctx, "stats");
	}

	// ======================================================= O QUE JOGAR?
	moods() {
		return {
			any: { label: "Tanto faz", keys: [] },
			relax: { label: "Relaxar", keys: ["puzzle", "plataforma", "exploracao", "simulacao", "casual", "cozy", "fazenda", "construcao", "sandbox", "aventura"] },
			challenge: { label: "Desafio", keys: ["souls", "roguelike", "roguelite", "precision", "estrategia", "hack", "metroidvania", "bullet", "dificil"] },
			story: { label: "Boa história", keys: ["rpg", "narrativa", "historia", "visual novel", "jrpg", "drama", "misterio", "aventura"] },
			rush: { label: "Adrenalina", keys: ["acao", "tiro", "fps", "shooter", "horror", "terror", "survival", "luta", "corrida", "parkour"] }
		};
	}

	suggest(model, { time = "any", mood = "any" } = {}) {
		const C = this.C, moods = this.moods();
		const keys = moods[mood]?.keys || [];
		let pool = model.games.filter(g => ["Playing", "Paused", "Backlog"].includes(g.status));
		// poucos candidatos: completa com zerados bem avaliados, para rejogar
		const replay = pool.length < 3 ? model.games.filter(g => g.status === "Completed") : [];
		pool = [...pool, ...replay];
		// fila "A seguir": o primeiro ganha prioridade forte; os demais, um empurrão
		const queue = C.queue ? C.queue(model) : [];
		for (const g of queue) if (!pool.includes(g) && g.status !== "Wishlist") pool.push(g);
		const list = pool.map(g => {
			const tags = [...g.genres, ...g.subgenres].map(x => C.normalizeKey(x));
			const reasons = [];
			let score = Math.random() * 1.2;
			const qi = queue.indexOf(g);
			if (qi === 0) { score += 4; reasons.push("Primeiro da sua fila"); }
			else if (qi > 0) { score += 1.5; reasons.push(`${qi + 1}º na sua fila`); }
			if (g.status === "Playing") { score += 3; reasons.push("Jogando agora"); }
			else if (g.status === "Paused") { score += 2; reasons.push("Pausado"); }
			else if (g.notPlayed) { score += 1.2; reasons.push("Nunca jogado"); }
			else if (g.status === "Completed") { score -= 1; reasons.push("Para rejogar"); }
			if (g.rating) score += g.rating * 0.3;
			const hit = keys.find(k => tags.some(t => t.includes(k)));
			if (hit) { score += 3; reasons.push(`${moods[mood].label}: ${[...g.genres, ...g.subgenres].find(x => C.normalizeKey(x).includes(hit))}`); }
			else if (mood !== "any") score -= 1.5;
			const est = g.estimatedHours;
			const short = tags.some(t => /roguel|puzzle|arcade|luta|corrida|plataforma/.test(t));
			if (time === "short") { if ((est && est <= 12) || short) { score += 2; reasons.push(est ? `Curto: ~${U_h(est)}` : "Bom para sessões curtas"); } if (g.status === "Playing") score += 1; }
			if (time === "evening" && est && est >= 6 && est <= 40) { score += 1; reasons.push(`~${U_h(est)} para terminar`); }
			if (time === "marathon") { if ((est && est >= 25) || tags.some(t => /rpg|mundo aberto|open world/.test(t))) { score += 2; reasons.push(est ? `Longo: ~${U_h(est)}` : "Bom para maratonar"); } }
			if (g.ach.state === "known" && g.ach.pct >= 70 && !g.ach.perfect) { score += 1; reasons.push(`${Math.floor(g.ach.pct)}% das conquistas`); }
			return { g, score, reasons: reasons.slice(0, 3) };
		}).sort((a, b) => b.score - a.score);
		return list;
		function U_h(h) { return customJS.SteamVaultUI.fmtHours(h); }
	}

	openPicker(ctx) {
		const U = this.U, V = this.V, moods = this.moods();
		const times = { any: "Tanto faz", short: "Até 1 hora", evening: "Uma tarde", marathon: "Maratona" };
		const st = { time: "any", mood: "any" };
		const body = document.createElement("div");
		body.className = "sv-picker2";
		const chips = (name, opts, cur) => `<div class="sv-chipset" data-set="${name}">${Object.entries(opts).map(([k, v]) => `<button type="button" class="${k === cur ? "is-active" : ""}" data-v="${k}">${U.esc(typeof v === "string" ? v : v.label)}</button>`).join("")}</div>`;
		const form = () => {
			body.innerHTML = `<p class="sv-label">Quanto tempo você tem?</p>${chips("time", times, st.time)}
				<p class="sv-label">Com que vontade?</p>${chips("mood", moods, st.mood)}
				<div class="sv-picker2-go">${U.btn("Sugerir", { icon: "sparkles", kind: "primary", size: "lg", attrs: "data-go" })}${U.btn("Surpreenda-me", { icon: "dice", kind: "ghost", attrs: "data-random" })}</div>`;
		};
		let deck = [], k = 0;
		const card = s => `<article class="sv-pcard" data-path="${U.attr(s.g.path)}">
			<div class="sv-pcard-art">${U.cover(s.g, { eager: true })}</div>
			<div class="sv-pcard-info"><b>${U.esc(s.g.title)}</b><span class="sv-meta"><span>${U.esc(s.g.platform)}</span>${s.g.genres[0] ? `<span>${U.esc(s.g.genres[0])}</span>` : ""}${s.g.playtime.hours ? `<span>${U.fmtHours(s.g.playtime.hours)} jogadas</span>` : ""}</span>
			${s.reasons.length ? `<div class="sv-pcard-why">${s.reasons.map(r => `<span>${U.esc(r)}</span>`).join("")}</div>` : ""}</div>
		</article>`;
		const deckView = () => {
			if (k >= deck.length) { body.innerHTML = `${U.empty({ icon: "dice", title: "Acabaram as sugestões", text: "Mude o tempo ou a vontade para ver outras.", action: U.btn("Recomeçar", { icon: "refresh", attrs: "data-back" }) })}`; return; }
			body.innerHTML = `<div class="sv-deck">${deck.slice(k, k + 3).reverse().map(card).join("")}</div>
				<p class="sv-deck-hint">Deslize para a direita para jogar e para a esquerda para ver a próxima · ${k + 1} de ${deck.length}</p>
				<div class="sv-deck-actions">
					<button type="button" class="sv-deck-btn" data-no aria-label="Próxima sugestão">${U.icon("x")}</button>
					<button type="button" class="sv-deck-btn is-yes" data-yes aria-label="Abrir este jogo">${U.icon("play")}</button>
					<button type="button" class="sv-deck-btn" data-back aria-label="Mudar filtros">${U.icon("filter")}</button>
				</div>`;
			V._wireImages?.(body);
			const top = body.querySelector(".sv-deck .sv-pcard:last-child");
			if (top) this._dragCard(top, dir => dir > 0 ? yes() : no());
		};
		const yes = () => { const s = deck[k]; if (!s) return; V._haptic?.(14); m.close(); V.open(s.g.path, ctx); };
		const no = () => { k++; V._haptic?.(); deckView(); };
		form();
		const m = V.modal({ title: "O que jogar agora?", sub: "Sugestões do seu backlog e do que está em andamento", size: "sm", body });
		body.addEventListener("click", e => {
			const c = e.target.closest(".sv-chipset button");
			if (c) { const set = c.closest("[data-set]").dataset.set; st[set] = c.dataset.v; c.parentElement.querySelectorAll("button").forEach(b => b.classList.toggle("is-active", b === c)); V._haptic?.(); return; }
			if (e.target.closest("[data-go]")) { deck = this.suggest(ctx.model, st).slice(0, 8); k = 0; if (!deck.length) { body.innerHTML = U.empty({ icon: "books", title: "Nada no backlog", text: "Adicione jogos à biblioteca para receber sugestões.", compact: true }); return; } return deckView(); }
			if (e.target.closest("[data-random]")) { const pool = this.suggest(ctx.model, {}); if (!pool.length) return V.toast("A biblioteca está vazia", { tone: "warn" }); deck = [pool[Math.floor(Math.random() * pool.length)]]; k = 0; return deckView(); }
			if (e.target.closest("[data-yes]")) return yes();
			if (e.target.closest("[data-no]")) return no();
			if (e.target.closest("[data-back]")) return form();
		});
	}

	// carta que segue o dedo: passou do limite → decide para o lado; senão volta
	_dragCard(el, decide) {
		let sx = 0, dx = 0, on = false;
		el.addEventListener("pointerdown", e => { on = true; sx = e.clientX; dx = 0; el.setPointerCapture?.(e.pointerId); el.style.transition = "none"; });
		el.addEventListener("pointermove", e => { if (!on) return; dx = e.clientX - sx; el.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`; el.dataset.lean = dx > 40 ? "yes" : dx < -40 ? "no" : ""; });
		const end = () => {
			if (!on) return; on = false; el.style.transition = "";
			if (Math.abs(dx) > 90) { el.style.transform = `translateX(${Math.sign(dx) * 140}%) rotate(${Math.sign(dx) * 18}deg)`; el.style.opacity = "0"; setTimeout(() => decide(Math.sign(dx)), 180); }
			else { el.style.transform = ""; el.dataset.lean = ""; }
		};
		el.addEventListener("pointerup", end); el.addEventListener("pointercancel", end);
	}

	// ======================================================= COLEÇÕES AUTOMÁTICAS
	smartCollections(model) {
		const C = this.C, today = C.today(), month = today.slice(0, 7);
		const byHours = (a, b) => b.playtime.hours - a.playtime.hours;
		const recent = (a, b) => b.lastPlayed.date.localeCompare(a.lastPlayed.date);
		return [
			{ id: "playing", title: "Jogando agora", icon: "play", sub: "Status Jogando", games: model.games.filter(g => g.status === "Playing").sort(recent) },
			{ id: "month", title: "Jogados este mês", icon: "calendar", sub: "Com atividade desde o dia 1º", games: model.games.filter(g => g.lastPlayed.date.startsWith(month)).sort(recent) },
			{ id: "near", title: "Quase 100%", icon: "target", sub: "70% ou mais das conquistas", games: model.games.filter(g => g.ach.state === "known" && g.ach.total && !g.ach.perfect && g.ach.pct >= 70).sort((a, b) => b.ach.pct - a.ach.pct) },
			{ id: "stale", title: "Parados há mais de 3 meses", icon: "clock", sub: "Jogando ou pausados, sem atividade recente", games: model.games.filter(g => ["Playing", "Paused"].includes(g.status) && (!g.lastPlayed.date || C.daysBetween(g.lastPlayed.date, today) > 90)).sort(recent) },
			{ id: "perfect", title: "100% das conquistas", icon: "gem", sub: "Todas as conquistas conhecidas", games: model.games.filter(g => C.isPerfect(g)) },
			{ id: "never", title: "Nunca jogados", icon: "books", sub: "Sem horas, sessões nem início", games: model.games.filter(g => g.notPlayed) },
			{ id: "top", title: "Nota máxima", icon: "star", sub: "Avaliação 4,5 ou mais", games: model.games.filter(g => g.rating >= 4.5).sort((a, b) => b.rating - a.rating) },
			{ id: "long", title: "Mais de 50 horas", icon: "flame", sub: "Os que mais ocuparam seu tempo", games: model.games.filter(g => g.playtime.hours >= 50).sort(byHours) }
		].filter(x => x.games.length);
	}
}
