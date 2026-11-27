// ==========================================================================
// Game Library — Conquistas: origem × sincronização
//
// Cada jogo tem DUAS propriedades independentes (definidas no Core):
//   achievementProvider  de onde vêm as conquistas (Steam, RA, Epic, GOG,
//                        PlayStation, Xbox, Google Play Games, Native,
//                        Custom, Sem conquistas, Não configurado)
//   achievementSync      como o vault as mantém (Automática, Manual,
//                        Local, Nenhuma)
// Aqui ficam a folha para escolher as duas, o "marcar como desbloqueada"
// dos modos Manual/Local, a migração dos campos antigos e o resumo por
// origem/sincronização usado nas estatísticas.
//
// Acesso: customJS.SteamVaultAchievements
// ==========================================================================

class SteamVaultAchievements {

	get U() { return customJS.SteamVaultUI; }
	get C() { return customJS.SteamVaultCore; }
	get V() { return customJS.SteamVault; }

	// conquistas que o próprio usuário atualiza (sem sync automático)
	editable(g) { return g.provider !== "none" && !this.C.autoSync(g); }

	// ======================================================= FOLHA DE ORIGEM
	openConfig(ctx, path) {
		const C = this.C, U = this.U;
		const f = app.vault.getAbstractFileByPath(path);
		const g = ctx.model.gamesByPath.get(path);
		if (!f || !g) return;
		const st = { provider: g.provider, sync: g.sync, steamAppId: g.steamAppId || "", raGameId: g.raGameId || "" };
		const body = document.createElement("div");
		const paint = () => {
			const modes = C.syncModes(st.provider), def = C.providerDefs[st.provider];
			const noAuto = !def.integration && !["none", "unset", "native", "custom"].includes(st.provider);
			body.innerHTML = `<div class="sv-achcfg">
				<p class="sv-modal-text">A <b>origem</b> diz de onde vêm as conquistas; a <b>sincronização</b>, como o vault as mantém. São escolhas separadas.</p>
				${C.providerGroups.map(([id, label]) => `<fieldset class="sv-achcfg-group"><legend class="sv-label">${U.esc(label)}</legend><div class="sv-achcfg-grid" role="radiogroup">${
					Object.entries(C.providerDefs).filter(([, d]) => d.group === id).map(([k, d]) => `<button type="button" class="sv-achcfg-opt sv-achsrc--${k}${k === st.provider ? " is-active" : ""}" role="radio" aria-checked="${k === st.provider}" data-pv="${k}">${U.esc(d.label)}</button>`).join("")
				}</div></fieldset>`).join("")}
				<fieldset class="sv-achcfg-group"><legend class="sv-label">Sincronização</legend>
					<div class="sv-segmented sv-achcfg-sync" role="radiogroup">${Object.entries(C.syncDefs).map(([k, d]) => `<button type="button" role="radio" data-sync="${k}" aria-checked="${k === st.sync}" class="${k === st.sync ? "is-active" : ""}"${modes.includes(k) ? "" : " disabled"}>${U.icon(U.syncIcon(k))}${U.esc(d.label)}</button>`).join("")}</div>
					<p class="sv-achcfg-hint">${U.esc(C.syncDefs[st.sync].hint)}${noAuto ? ` · ${U.esc(def.label)} ainda não tem integração automática no vault.` : ""}</p>
				</fieldset>
				${st.provider === "steam" ? `<label class="sv-achcfg-id"><span class="sv-label">Steam AppID</span><input class="sv-input" inputmode="numeric" data-id="steamAppId" value="${U.attr(st.steamAppId)}" placeholder="número da URL da loja"></label>` : ""}
				${st.provider === "retroachievements" ? `<label class="sv-achcfg-id"><span class="sv-label">ID do jogo no RetroAchievements</span><input class="sv-input" inputmode="numeric" data-id="raGameId" value="${U.attr(st.raGameId)}" placeholder="opcional — o sync tenta achar pelo título"></label>` : ""}
			</div>`;
		};
		paint();
		body.addEventListener("input", e => { const k = e.target.dataset?.id; if (k) st[k] = e.target.value.trim(); });
		body.addEventListener("click", e => {
			const pv = e.target.closest("[data-pv]");
			if (pv && pv.dataset.pv !== st.provider) {
				st.provider = pv.dataset.pv;
				// mantém o modo se o novo provedor aceitar; senão o padrão dele
				if (!C.syncModes(st.provider).includes(st.sync)) st.sync = C.defaultSync(st.provider);
				this.V._haptic?.(8); paint(); return;
			}
			const sy = e.target.closest("[data-sync]:not([disabled])");
			if (sy && sy.dataset.sync !== st.sync) { st.sync = sy.dataset.sync; this.V._haptic?.(8); paint(); }
		});
		const m = this.V.modal({ title: "Conquistas", sub: g.title, size: "sm", body,
			actions: `${U.btn("Cancelar", { kind: "ghost", attrs: "data-close" })}${U.btn("Salvar", { kind: "primary", icon: "check", attrs: "data-ac-save" })}` });
		m.el.querySelector("[data-ac-save]").addEventListener("click", async () => {
			try {
				await app.fileManager.processFrontMatter(f, fm => {
					Object.assign(fm, C.achievementFields(st.provider, st.sync));
					delete fm.achievementSource; delete fm.gameType;
					if (st.provider === "steam" && st.steamAppId) fm.steamAppId = st.steamAppId;
					if (st.provider === "retroachievements" && st.raGameId) fm.raGameId = st.raGameId;
				});
				C.invalidate();
				m.close();
				this.V.toast(`${C.providerLabel(st.provider)} · ${C.syncLabel(st.sync)}`, { tone: "ok", icon: "trophy" });
				setTimeout(() => this.V.refresh(), 250);
			} catch (err) { this.V.toast(`Não foi possível salvar: ${err.message}`, { tone: "error" }); }
		});
	}

	// ============================================ MARCAR COMO DESBLOQUEADA
	// só aparece em jogos Manual/Local: nos automáticos quem manda é o sync
	async toggleUnlock(el) {
		const path = el.dataset.path;
		const f = app.vault.getAbstractFileByPath(path);
		if (!f) return;
		const on = el.getAttribute("aria-pressed") !== "true";
		el.classList.toggle("is-on", on); el.setAttribute("aria-pressed", String(on));
		el.closest(".sv-ach")?.classList.toggle("is-unlocked", on);
		el.closest(".sv-ach")?.classList.toggle("is-locked", !on);
		// 1.4.0: a linha acende uma vez ao desbloquear (o redesenho espera o brilho)
		if (on) { const row = el.closest(".sv-ach"); row?.classList.remove("is-just"); void row?.offsetWidth; row?.classList.add("is-just"); }
		this.V._haptic?.(on ? [10, 40, 16] : 8);
		// som: as raras (até 10% dos jogadores) têm um brilho a mais
		if (on) { const r = Number(el.closest("[data-ach-rarity]")?.dataset.achRarity); this.V.sfx?.(r > 0 && r <= 10 ? "ach-rare" : "ach"); }
		try {
			await app.fileManager.processFrontMatter(f, fm => {
				fm.unlocked = on;
				if (on) { if (!fm.unlockedDate) fm.unlockedDate = this.C.today(); fm.unlockSource = "vault"; }
				else { delete fm.unlockedDate; delete fm.unlockedTime; delete fm.unlockSource; }
			});
			this.C.invalidate();
			this.V.toast(on ? "Conquista desbloqueada" : "Conquista bloqueada de novo", { icon: on ? "trophy" : "lock", tone: on ? "ok" : "" });
			setTimeout(() => this.V.refresh(), on ? 650 : 300);
		} catch (err) { this.V.toast(`Não foi possível salvar: ${err.message}`, { tone: "error" }); }
	}

	// ============================================== EDITOR DE CONQUISTAS
	// Para jogos sem sync automático (Native, Custom, Epic, GOG, PlayStation,
	// Xbox, Google Play, Steam/RA em modo Manual). Cada conquista continua
	// sendo uma nota em Achievements/<Jogo>/ — o mesmo modelo de sempre, com
	// campos opcionais: category, rarityTier, secret, order, notes.
	openPicker(ctx, provider) {
		const U = this.U, C = this.C;
		const PL = customJS.SteamVaultPlatforms, own = PL?.get?.(provider)?.family ? PL.gamesFor(provider, ctx.model) : ctx.model.games.filter(g => g.provider === provider);
		const games = own.filter(g => this.editable(g)).sort((a, b) => a.title.localeCompare(b.title));
		if (games.length === 1) return this.openManager(ctx, games[0].path);
		const body = document.createElement("div");
		body.innerHTML = games.length ? `<ul class="sv-mgr-pick">${games.map(g => `<li><button type="button" data-pick="${U.attr(g.path)}">${U.cover(g, { cls: "sv-cover--xs" })}<span><b>${U.esc(g.title)}</b><small>${g.ach.state === "known" && g.ach.total ? `${g.ach.unlocked} de ${g.ach.total}` : "nenhuma registrada"}</small></span>${U.icon("chevronRight")}</button></li>`).join("")}</ul>`
			: `<p class="sv-modal-text">Nenhum jogo de ${U.esc(C.providerLabel(provider))} com gerenciamento manual.</p>`;
		const m = this.V.modal({ title: "Escolha o jogo", sub: C.providerLabel(provider), size: "sm", body });
		this.V._wireImages?.(body);
		body.addEventListener("click", e => {
			const b = e.target.closest("[data-pick]");
			if (!b) return;
			m.close();
			setTimeout(() => this.openManager(ctx, b.dataset.pick), 220);
		});
	}

	_safe(s, fb) { return this.C.safeFileName(s, fb); }

	// categorias sugeridas por origem (além das já usadas no jogo)
	_catPresets(provider) {
		return ({
			playstation: ["Platina", "Ouro", "Prata", "Bronze"],
			custom: ["Campanha", "Missões secundárias", "Colecionáveis", "Dificuldade", "Itens", "Desafio"],
			native: ["História", "Colecionáveis", "Desafio", "Combate", "Exploração"]
		})[provider] || ["História", "Colecionáveis", "Desafio"];
	}

	_pointsLabel(provider) { return ({ xbox: "Gamerscore (G)", googleplay: "XP", retroachievements: "Pontos RA" })[provider] || "Pontos"; }

	openManager(ctx, path, { edit = "" } = {}) {
		const C = this.C, U = this.U, V = this.V;
		const g = ctx.model.gamesByPath.get(path);
		if (!g) return;
		const fmOf = p => { const f = app.vault.getAbstractFileByPath(p); return (f && app.metadataCache.getFileCache(f)?.frontmatter) || {}; };
		// estado local: a lista do jogo, na ordem atual
		let items = g.achievements.filter(a => a.path).map(a => ({ path: a.path, name: a.name, iconSrc: a.iconSrc, category: a.category, tier: C.rarityOf(a), secret: a.secret, unlocked: a.unlocked, date: a.unlockedDate, order: a.order }));
		let dirty = false, form = null, busy = false;
		const presets = () => [...new Set([...this._catPresets(g.provider), ...items.map(x => x.category).filter(Boolean)])];
		const body = document.createElement("div");
		body.className = "sv-mgr";
		const m = V.modal({ title: g.sync === "local" && g.provider === "custom" ? "Objetivos" : "Conquistas", sub: `${g.title} · ${g.providerLabel}`, size: "md", cls: "sv-mgr-modal", body,
			actions: `<div class="sv-mgr-foot"></div>`,
			onClose: () => { if (dirty) { C.invalidate(); setTimeout(() => V.refresh(), 250); } } });
		const foot = m.el.querySelector(".sv-mgr-foot");
		const tierSeg = cur => `<div class="sv-mgr-tiers" role="radiogroup">${[["", "Nenhuma"], ...Object.entries(C.rarityTiers).map(([k, d]) => [k, d.label])].map(([k, l]) => `<button type="button" role="radio" data-tier="${k}" aria-checked="${k === cur}" class="${k === cur ? "is-active" : ""}${k ? ` sv-rarity-${k}` : ""}">${U.esc(l)}</button>`).join("")}</div>`;
		const iconPrev = src => src ? `<img src="${U.attr(src)}" alt="">` : U.icon("trophy");

		const paintList = () => {
			const done = items.filter(x => x.unlocked).length;
			body.innerHTML = `<div class="sv-mgr-summary">
					<div><b class="sv-num">${done}<small>/${items.length}</small></b><span>${items.length ? `${Math.floor((done / items.length) * 100)}% desbloqueadas` : "nenhuma ainda"}</span></div>
					${U.btn(g.provider === "custom" ? "Novo objetivo" : "Adicionar", { icon: "plus", kind: "primary", size: "sm", attrs: "data-new" })}
				</div>
				${items.length ? U.progressBar(items.length ? (done / items.length) * 100 : 0, { thin: true, tone: done === items.length && done ? "gold" : "" }) : ""}
				${items.length ? `<ol class="sv-mgr-list">${items.map((x, i) => `<li class="sv-mgr-item${x.unlocked ? " is-on" : ""}">
					<span class="sv-mgr-ico${x.tier ? ` sv-rarity-${x.tier}` : ""}">${iconPrev(x.iconSrc)}</span>
					<button type="button" class="sv-mgr-main" data-edit="${i}"><b>${U.esc(x.name)}</b><small>${[x.secret ? "Secreta" : "", x.category, x.tier ? C.rarityTiers[x.tier].label : "", x.unlocked && x.date ? U.fmtDate(x.date) : ""].filter(Boolean).map(U.esc.bind(U)).join(" · ") || "Toque para editar"}</small></button>
					<span class="sv-mgr-move"><button type="button" data-up="${i}" aria-label="Subir" title="Subir"${i === 0 ? " disabled" : ""}>${U.icon("chevronLeft")}</button><button type="button" data-down="${i}" aria-label="Descer" title="Descer"${i === items.length - 1 ? " disabled" : ""}>${U.icon("chevronRight")}</button></span>
					<button type="button" class="sv-ach-check${x.unlocked ? " is-on" : ""}" data-toggle="${i}" aria-pressed="${x.unlocked}" title="${x.unlocked ? "Marcar como bloqueada" : "Marcar como desbloqueada"}">${U.icon("check")}</button>
				</li>`).join("")}</ol>`
				: `<div class="sv-mgr-empty">${U.icon(g.provider === "custom" ? "sparkles" : "trophy")}<p>${g.provider === "custom" ? "Crie objetivos pessoais para este jogo: terminar a campanha, achar todos os colecionáveis, zerar no difícil…" : "Registre as conquistas, troféus ou desafios deste jogo e marque as que desbloquear."}</p></div>`}`;
			foot.innerHTML = U.btn("Concluir", { kind: "primary", attrs: "data-close" });
		};

		const paintForm = () => {
			const f = form;
			body.innerHTML = `<div class="sv-mgr-form">
				<div class="sv-mgr-iconrow">
					<span class="sv-mgr-iconprev${f.rarityTier ? ` sv-rarity-${f.rarityTier}` : ""}" data-iconprev>${iconPrev(f.iconPreview)}</span>
					<div class="sv-mgr-iconbtns">
						<label class="sv-btn sv-btn--secondary sv-btn--sm">${U.icon("image")}<span>Escolher imagem</span><input type="file" accept="image/*" data-iconfile hidden></label>
						${f.icon ? U.btn("Remover", { icon: "trash", kind: "ghost", size: "sm", attrs: "data-iconclear" }) : ""}
					</div>
				</div>
				<label class="sv-mgr-field"><span class="sv-label">Nome *</span><input class="sv-input" data-f="name" value="${U.attr(f.name)}" maxlength="140" placeholder="${g.provider === "custom" ? "Ex.: Termine a campanha" : "Nome da conquista"}"></label>
				<label class="sv-mgr-field"><span class="sv-label">Descrição</span><textarea class="sv-input" rows="2" data-f="description" placeholder="O que é preciso fazer">${U.esc(f.description)}</textarea></label>
				<div class="sv-mgr-grid">
					<label class="sv-mgr-field"><span class="sv-label">Categoria</span><input class="sv-input" data-f="category" list="sv-mgr-cats" value="${U.attr(f.category)}" placeholder="${U.attr(presets()[0] || "")}"><datalist id="sv-mgr-cats">${presets().map(c => `<option value="${U.attr(c)}">`).join("")}</datalist></label>
					<label class="sv-mgr-field"><span class="sv-label">${U.esc(this._pointsLabel(g.provider))}</span><input class="sv-input" type="number" min="0" inputmode="numeric" data-f="points" value="${U.attr(f.points || "")}" placeholder="0"></label>
				</div>
				<div class="sv-mgr-field"><span class="sv-label">Raridade</span>${tierSeg(f.rarityTier)}</div>
				<label class="sv-switch"><input type="checkbox" data-f="secret" ${f.secret ? "checked" : ""}><span></span>Secreta (nome e descrição ficam escondidos até desbloquear)</label>
				<label class="sv-switch"><input type="checkbox" data-f="unlocked" ${f.unlocked ? "checked" : ""}><span></span>Desbloqueada</label>
				<label class="sv-mgr-field sv-mgr-date"${f.unlocked ? "" : " hidden"}><span class="sv-label">Data do desbloqueio</span><input class="sv-input" type="date" data-f="unlockedDate" value="${U.attr(f.unlockedDate)}"></label>
				<label class="sv-mgr-field"><span class="sv-label">Observações</span><textarea class="sv-input" rows="2" data-f="notes" placeholder="Dicas, lembretes, onde encontrar">${U.esc(f.notes)}</textarea></label>
				<p class="sv-formmsg" data-msg></p>
			</div>`;
			foot.innerHTML = `${f.path ? U.btn("", { icon: "trash", kind: "ghost", attrs: 'data-del title="Excluir" aria-label="Excluir"' }) : ""}<span class="sv-mgr-footgap"></span>${U.btn("Voltar", { kind: "ghost", attrs: "data-back" })}${U.btn("Salvar", { kind: "primary", icon: "check", attrs: "data-save" })}`;
		};

		const openForm = i => {
			const x = i === null ? null : items[i];
			const fm = x ? fmOf(x.path) : {};
			form = x ? {
				path: x.path, index: i, name: C.str(fm.name) || x.name, description: C.str(fm.description), icon: C.str(fm.icon) === "🏆" ? "" : C.str(fm.icon),
				iconPreview: x.iconSrc, category: C.str(fm.category), rarityTier: C.normalizeRarity(fm.rarityTier), points: C.num(fm.points) || "",
				secret: fm.secret === true || fm.secret === "true", unlocked: fm.unlocked === true || fm.unlocked === "true",
				unlockedDate: C.iso(fm.unlockedDate) || "", notes: C.str(fm.notes)
			} : { path: "", index: null, name: "", description: "", icon: "", iconPreview: "", category: "", rarityTier: "", points: "", secret: false, unlocked: false, unlockedDate: "", notes: "" };
			paintForm();
			m.el.querySelector(".sv-modal-body")?.scrollTo?.(0, 0);
		};
		const back = () => { form = null; paintList(); };

		// grava a ordem 1..n só nas notas que mudaram
		const saveOrder = async () => {
			for (const [i, x] of items.entries()) {
				if (x.order === i + 1) continue;
				const f = app.vault.getAbstractFileByPath(x.path);
				if (!f) continue;
				await app.fileManager.processFrontMatter(f, fm => { fm.order = i + 1; });
				x.order = i + 1; dirty = true;
			}
		};

		const save = async () => {
			const f = form, msg = body.querySelector("[data-msg]");
			const val = k => body.querySelector(`[data-f="${k}"]`);
			f.name = val("name").value.trim(); f.description = val("description").value.trim();
			f.category = val("category").value.trim(); f.points = Math.max(0, Math.round(Number(val("points").value) || 0));
			f.secret = val("secret").checked; f.unlocked = val("unlocked").checked;
			f.unlockedDate = f.unlocked ? (val("unlockedDate").value || C.today()) : ""; f.notes = val("notes").value.trim();
			if (!f.name) { msg.textContent = "Dê um nome à conquista."; msg.className = "sv-formmsg is-error"; val("name").focus(); return; }
			busy = true;
			try {
				if (f.path) {
					const file = app.vault.getAbstractFileByPath(f.path);
					if (!file) throw new Error("nota não encontrada");
					await app.fileManager.processFrontMatter(file, fm => {
						fm.name = f.name; fm.description = f.description; fm.icon = f.icon;
						fm.category = f.category; fm.rarityTier = f.rarityTier; fm.points = f.points;
						fm.secret = f.secret; fm.unlocked = f.unlocked; fm.notes = f.notes;
						if (f.unlocked) { fm.unlockedDate = f.unlockedDate; if (!fm.unlockSource) fm.unlockSource = "vault"; }
						else { fm.unlockedDate = ""; fm.unlockedTime = ""; if (fm.unlockSource === "vault") fm.unlockSource = ""; }
					});
					Object.assign(items[f.index], { name: f.name, category: f.category, tier: f.rarityTier || items[f.index].tier, secret: f.secret, unlocked: f.unlocked, date: f.unlockedDate, iconSrc: f.iconPreview || (f.icon ? C.resolveImage(f.icon) : "") });
				} else {
					const folder = `${C.folders.achievements}/${this._safe(g.title, "Jogo")}`;
					if (!app.vault.getAbstractFileByPath(folder)) await app.vault.createFolder(folder).catch(() => {});
					const base = this._safe(f.name, "Conquista");
					let p = `${folder}/${base}.md`, n = 2;
					while (app.vault.getAbstractFileByPath(p)) p = `${folder}/${base} ${n++}.md`;
					await app.vault.create(p, C.buildAchievementNote({
						name: f.name, description: f.description, icon: f.icon, points: f.points,
						unlocked: f.unlocked, unlockedDate: f.unlockedDate, unlockSource: f.unlocked ? "vault" : "",
						gameLink: `[[${g.name}]]`, gamePath: g.path, category: f.category, rarityTier: f.rarityTier,
						secret: f.secret, order: items.length + 1, notes: f.notes
					}));
					items.push({ path: p, name: f.name, iconSrc: f.iconPreview, category: f.category, tier: f.rarityTier, secret: f.secret, unlocked: f.unlocked, date: f.unlockedDate, order: items.length + 1 });
				}
				dirty = true;
				V._haptic?.(10);
				V.toast(f.path ? "Conquista salva" : "Conquista criada", { tone: "ok", icon: "trophy" });
				back();
			} catch (err) { msg.textContent = `Não foi possível salvar: ${err.message}`; msg.className = "sv-formmsg is-error"; }
			finally { busy = false; }
		};

		const pickIcon = async input => {
			const file = input.files?.[0];
			if (!file) return;
			const prev = body.querySelector("[data-iconprev]");
			try {
				const buf = await file.arrayBuffer();
				const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
				const S = customJS.SteamVaultSteam;
				const out = S?._compress ? await S._compress({ buf, ext }, { maxW: 256, alpha: true }) : { buf, ext };
				const name = this._safe(body.querySelector('[data-f="name"]').value || form.name, "conquista").replace(/\s+/g, "-").toLowerCase();
				const p = `${C.folders.achievementAssets}/${this._safe(g.title, "Jogo")}/${name}-${Date.now().toString(36)}.${out.ext}`;
				if (S?._saveBinary) await S._saveBinary(p, out.buf);
				else { const folder = p.split("/").slice(0, -1).join("/"); if (!app.vault.getAbstractFileByPath(folder)) await app.vault.createFolder(folder).catch(() => {}); await app.vault.createBinary(p, out.buf); }
				form.icon = p;
				form.iconPreview = URL.createObjectURL(new Blob([out.buf], { type: ({ webp: "image/webp", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg" })[out.ext] || file.type || "image/png" }));
				if (prev) prev.innerHTML = iconPrev(form.iconPreview);
				const btns = body.querySelector(".sv-mgr-iconbtns");
				if (btns && !btns.querySelector("[data-iconclear]")) btns.insertAdjacentHTML("beforeend", U.btn("Remover", { icon: "trash", kind: "ghost", size: "sm", attrs: "data-iconclear" }));
			} catch (err) { V.toast(`Não foi possível usar a imagem: ${err.message}`, { tone: "error" }); }
		};

		body.addEventListener("change", e => {
			if (e.target.matches("[data-iconfile]")) pickIcon(e.target);
			if (e.target.matches('[data-f="unlocked"]')) {
				const d = body.querySelector(".sv-mgr-date");
				if (d) { d.hidden = !e.target.checked; const inp = d.querySelector("input"); if (e.target.checked && !inp.value) inp.value = C.today(); }
			}
		});
		const onClick = async e => {
			if (busy) return;
			const t = e.target.closest("button, [data-edit]");
			if (!t) return;
			if (t.matches("[data-new]")) return openForm(null);
			if (t.matches("[data-edit]")) return openForm(Number(t.dataset.edit));
			if (t.matches("[data-back]")) return back();
			if (t.matches("[data-save]")) return save();
			if (t.matches("[data-tier]")) {
				form.rarityTier = t.dataset.tier;
				t.parentElement.querySelectorAll("[data-tier]").forEach(b => { const on = b === t; b.classList.toggle("is-active", on); b.setAttribute("aria-checked", String(on)); });
				const prev = body.querySelector("[data-iconprev]");
				if (prev) prev.className = `sv-mgr-iconprev${form.rarityTier ? ` sv-rarity-${form.rarityTier}` : ""}`;
				return;
			}
			if (t.matches("[data-iconclear]")) {
				form.icon = ""; form.iconPreview = "";
				body.querySelector("[data-iconprev]").innerHTML = iconPrev("");
				t.remove(); return;
			}
			if (t.matches("[data-toggle]")) {
				const x = items[Number(t.dataset.toggle)];
				const file = app.vault.getAbstractFileByPath(x.path);
				if (!file) return;
				x.unlocked = !x.unlocked; x.date = x.unlocked ? (x.date || C.today()) : "";
				V._haptic?.(x.unlocked ? [10, 40, 16] : 8);
				paintList();
				busy = true;
				try {
					await app.fileManager.processFrontMatter(file, fm => {
						fm.unlocked = x.unlocked;
						if (x.unlocked) { if (!fm.unlockedDate) fm.unlockedDate = x.date; fm.unlockSource = fm.unlockSource || "vault"; }
						else { fm.unlockedDate = ""; fm.unlockedTime = ""; if (fm.unlockSource === "vault") fm.unlockSource = ""; }
					});
					dirty = true;
				} finally { busy = false; }
				return;
			}
			if (t.matches("[data-up], [data-down]")) {
				const i = Number(t.dataset.up ?? t.dataset.down), j = t.matches("[data-up]") ? i - 1 : i + 1;
				if (j < 0 || j >= items.length) return;
				[items[i], items[j]] = [items[j], items[i]];
				paintList();
				body.querySelector(`[data-edit="${j}"]`)?.closest("li")?.classList.add("is-moved");
				busy = true;
				try { await saveOrder(); } finally { busy = false; }
				return;
			}
			if (t.matches("[data-del]")) {
				const ok = await V.confirm({ title: "Excluir conquista?", text: `"${form.name || "Conquista"}" vai para a lixeira do Obsidian.`, confirm: "Excluir", danger: true });
				if (!ok) return;
				const file = app.vault.getAbstractFileByPath(form.path);
				try {
					if (file) { if (app.fileManager.trashFile) await app.fileManager.trashFile(file); else await app.vault.trash(file, true); }
					items.splice(form.index, 1);
					dirty = true;
					V.toast("Conquista excluída", { icon: "trash" });
					back();
					await saveOrder();
				} catch (err) { V.toast(`Não foi possível excluir: ${err.message}`, { tone: "error" }); }
			}
		};
		body.addEventListener("click", onClick);
		foot.addEventListener("click", onClick);
		paintList();
		if (edit) { const i = items.findIndex(x => x.path === edit); if (i >= 0) openForm(i); }
	}

	// ============================================================ MIGRAÇÃO
	// grava achievementProvider/achievementSync a partir do que cada nota já
	// diz (achievementSource, gameType, IDs) e remove os campos antigos
	// jogo de Xbox: origem Xbox ou plataforma com "Xbox" no nome. As
	// conquistas do Xbox são 100% manuais (3.74.0): SteamVaultAchManager.
	isXbox(g) { return !!g && (g.provider === "xbox" || /\bxbox\b/i.test(String(g.platform || ""))); }

	legacyCount() {
		return app.vault.getMarkdownFiles().filter(f => {
			const fm = app.metadataCache.getFileCache(f)?.frontmatter;
			return fm?.type === "game" && !f.path.includes("/_Templates/") && (!fm.achievementProvider || "achievementSource" in fm || "gameType" in fm);
		}).length;
	}

	async migrateAll() {
		let changed = 0;
		for (const f of app.vault.getMarkdownFiles()) {
			const fm = app.metadataCache.getFileCache(f)?.frontmatter;
			if (fm?.type !== "game" || f.path.includes("/_Templates/")) continue;
			let did = false;
			await app.fileManager.processFrontMatter(f, x => { did = this.C.migrateAchievementFields(x); });
			if (did) changed++;
		}
		this.C.invalidate();
		return changed;
	}

	// ======================================================== ESTATÍSTICAS
	// dois gráficos lado a lado — origem e sincronização nunca somadas
	statsBlock(ctx) {
		const { C, U, model } = ctx;
		const s = model.stats;
		const bars = (defs, counts) => Object.keys(defs).filter(k => counts[k]).map(k => ({ label: defs[k].label, value: counts[k], display: U.fmtNum(counts[k]) }));
		const pv = bars(C.providerDefs, s.byProvider), sy = bars(C.syncDefs, s.bySync);
		if (!pv.length) return "";
		const unset = s.byProvider.unset || 0;
		return `<section class="sv-block sv-achsplit">
			${U.sectionHead("Origem e sincronização", { action: unset ? `<span class="sv-sync">${U.icon("info")}<span>${U.plural(unset, "jogo sem origem", "jogos sem origem")}</span></span>` : "" })}
			<div class="sv-achsplit-grid">
				<div class="sv-surface"><h3>Origem</h3>${U.bars(pv, { max: Math.max(...pv.map(x => x.value)) })}</div>
				<div class="sv-surface"><h3>Sincronização</h3>${U.bars(sy, { max: Math.max(...sy.map(x => x.value)) })}</div>
			</div>
		</section>`;
	}

	// ========================================== ícones guardados no vault (3.20.0)
	// Os ícones vindos da Steam, do RetroAchievements, da Xbox e da GOG são
	// links da internet: sem conexão, somem. Aqui eles são baixados para
	// Assets/Achievements/<Jogo>/ e a nota passa a apontar para o arquivo.
	// Só os servidores de imagem dessas plataformas são aceitos.
	// só https e só os servidores de imagem das plataformas (resultado guardado por servidor)
	_iconHost(url) {
		if (!url || typeof url !== "string" || !url.startsWith("https://")) return false;
		const host = /^https:\/\/([^/?#:@]+)(?::\d+)?(?:[/?#]|$)/i.exec(url)?.[1]?.toLowerCase();
		if (!host) return false;
		const memo = (this.__iconHosts ||= new Map());
		if (!memo.has(host)) memo.set(host, /^((shared|cdn|community|avatars)\.(akamai|cloudflare|fastly)\.steamstatic\.com|steamcdn-a\.akamaihd\.net|media\.retroachievements\.org|images(-\d)?\.gog(-statics)?\.com)$/.test(host));
		return memo.get(host);
	}

	// uma vez por versão do modelo (a tela de Configurações pede a cada desenho)
	iconPlan(model) {
		if (model.__iconPlan) return model.__iconPlan;
		return (model.__iconPlan = this._iconPlan(model));
	}
	_iconPlan(model) {
		const C = this.C, out = { total: 0, local: 0, none: 0, remote: [] };
		for (const g of model.games) for (const a of g.achievements) {
			if (!a.path) continue;
			const file = app.vault.getAbstractFileByPath(a.path);
			const fm = (file && app.metadataCache.getFileCache(file)?.frontmatter) || {};
			out.total++;
			const icon = C.str(fm.icon);
			if (icon && !/^https?:/i.test(icon) && C.resolveImage(icon)) { out.local++; continue; }
			const url = [icon, fm.steamIconUrl, fm.raBadgeUrl].map(x => C.str(x)).find(x => this._iconHost(x));
			if (url) out.remote.push({ g, a, file, url }); else out.none++;
		}
		return out;
	}

	async _fetchIcon(url) {
		if (!this._iconHost(url)) return null;
		const request = globalThis.customJS?.obsidian?.requestUrl || globalThis.requestUrl || globalThis.app?.requestUrl;
		if (typeof request !== "function") throw new Error("requestUrl indisponível");
		const res = await Promise.race([
			request({ url, method: "GET", throw: false }),
			new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 15000))
		]);
		const type = String(res?.headers?.["content-type"] || res?.headers?.["Content-Type"] || "").toLowerCase();
		const buf = res?.arrayBuffer;
		if (!res || res.status !== 200 || !buf || buf.byteLength < 64 || buf.byteLength > 2 * 1024 * 1024) return null;
		if (type && !/^image\//.test(type)) return null;
		const ext = /png/.test(type) ? "png" : /webp/.test(type) ? "webp" : /gif/.test(type) ? "gif" : /jpe?g/.test(type) ? "jpg" : (/\.(png|webp|gif|jpe?g)(\?|$)/i.exec(url)?.[1] || "jpg").toLowerCase().replace("jpeg", "jpg");
		return { buf, ext };
	}

	async localizeIcons(ctx) {
		const C = this.C, V = this.V, U = this.U;
		if (window.__svIconsRunning) return V.toast("Os ícones já estão sendo salvos", { tone: "warn" });
		const plan = this.iconPlan(ctx.model);
		if (!plan.remote.length) return V.toast(plan.local ? "Todos os ícones já estão no vault" : "Nenhum ícone da internet para salvar", { tone: "ok", icon: "check" });
		if (typeof navigator !== "undefined" && navigator.onLine === false) return V.toast("Sem conexão com a internet", { tone: "warn" });
		window.__svIconsRunning = true;
		const t = V.toast(`Salvando ícones (0/${plan.remote.length})…`, { sticky: true, icon: "download", progress: 0 });
		let done = 0, fail = 0, i = 0;
		try {
			for (const it of plan.remote) {
				i++;
				try {
					const got = await this._fetchIcon(it.url);
					if (!got) { fail++; continue; }
					const folder = `${C.folders.achievementAssets}/${this._safe(it.g.title, "Jogo")}`;
					const path = `${folder}/${this._safe(it.a.name, "Conquista")}.${got.ext}`;
					if (!app.vault.getAbstractFileByPath(path)) {
						if (!app.vault.getAbstractFileByPath(folder)) await app.vault.createFolder(folder).catch(() => {});
						await app.vault.createBinary(path, got.buf);
					}
					await app.fileManager.processFrontMatter(it.file, fm => { fm.icon = path; });
					done++;
				} catch (_) { fail++; }
				t.update?.(`Salvando ícones (${i}/${plan.remote.length})…`, { progress: (i / plan.remote.length) * 100 });
				await new Promise(r => setTimeout(r, 120));
			}
			t.update?.(`${U.plural(done, "ícone salvo", "ícones salvos")} no vault${fail ? ` · ${fail} não ${fail === 1 ? "baixou" : "baixaram"}` : ""}`, { tone: fail && !done ? "error" : fail ? "warn" : "ok" });
		} finally {
			window.__svIconsRunning = false;
			t.close?.(5000);
			C.invalidate?.();
			setTimeout(() => V.refresh?.(), 400);
		}
	}
}
