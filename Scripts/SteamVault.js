// ==========================================================================
// Game Library — ponto de entrada (facade)
//
// Toda nota da Game Library tem um único bloco:
//
//   ```dataviewjs
//   await dv.view("Assets/steamvault-boot", { page: "home" });
//   ```
//
// O boot mostra a tela de carregamento, espera o CustomJS e chama
// customJS.SteamVault.render(dv, "home").
//
// Este módulo roteia para a página certa, aplica o app shell (sidebar,
// topbar, navegação mobile) e cuida de tudo o que é comum: navegação,
// busca global, modais, toasts, lightbox, favoritos, ações de sync da
// Steam e os editores herdados (montados dentro de modais).
//
// Módulos (um arquivo por classe, pasta Scripts/, plugin CustomJS):
//   SteamVaultCore        modelo de dados, fonte única de contadores
//   SteamVaultSteam       sync público da Steam Community (sem Web API)
//   SteamVaultUI          componentes do design system
//   SteamVaultPages       Início, Biblioteca, ficha do jogo
//   SteamVaultBrowse      Coleções, Plataformas, Gêneros, Franquias
//   SteamVaultSteamPages  Perfil / Atividade / Biblioteca / Vitrine Steam
//   SteamVaultInsights    Conquistas, Tier List, Estatísticas, Retro, Config.
//   SteamVaultLegacy      formulários de edição herdados (ex-IISU.js)
//   SteamVaultProfile     Perfil do jogador
// ==========================================================================

class SteamVault {

	constructor() {
		this.routes = {
			home: ["P", "home"], library: ["P", "library"], game: ["P", "game"], wishlist: ["PK", "wishlistPage"],
			collections: ["B", "collections"], collection: ["B", "collection"],
			platforms: ["B", "platforms"], platform: ["B", "platform"],
			genres: ["B", "genres"], genre: ["B", "genre"], subgenres: ["B", "subgenres"], subgenre: ["B", "subgenre"], franchises: ["B", "franchises"], franchise: ["B", "franchise"],
			"steam-profile": ["SP", "profile"], "steam-activity": ["SP", "activity"],
			"steam-library": ["SP", "library"], "steam-showcase": ["SP", "showcase"],
			achievements: ["H", "hub"], player: ["PF", "page"], tierlist: ["I", "tierlist"], statistics: ["I", "statistics"],
			settings: ["I", "settings"], achievement: ["I", "achievement"],
			// 3.34.0: a Jornada saiu; uma nota antiga dela (num vault atualizado) abre o Perfil
			journey: ["PF", "page"],
			icons: ["B", "iconGallery"],
			// RetroAchievements — seção complementar
			retro: ["RP", "profile"], "retro-games": ["RP", "games"], "retro-achievements": ["RP", "achievements"],
			// perfis de plataformas (GOG integrado; Xbox manual desde a 3.70)
			"xbox-profile": ["PP", "xbox"], "gog-profile": ["PP", "gog"],
			"epic-profile": ["PP", "epic"], "psn-profile": ["PP", "psn"], "nintendo-profile": ["PP", "nintendo"], "googleplay-profile": ["PP", "googleplay"], integrations: ["PP", "integrations"]
		};
		if (!window.__svHosts) window.__svHosts = new Set();
		if (!window.__svAccent) window.__svAccent = new Map();
		this._bindGlobalKeys();
	}

	// ------------------------------------------------------------ módulos
	get _required() { return ["C", "U", "S", "P", "B", "SP", "I"]; }

	// para o Assets/steamvault-boot.js: "all" = todos os módulos carregados,
	// "core" = os obrigatórios (os opcionais ainda podem estar chegando)
	bootState() {
		const M = this.mods();
		if (this._required.some(k => !M[k])) return "none";
		return Object.values(M).every(Boolean) ? "all" : "core";
	}

	mods() {
		const j = typeof customJS !== "undefined" ? customJS : {};
		return {
			C: j.SteamVaultCore, U: j.SteamVaultUI, S: j.SteamVaultSteam, P: j.SteamVaultPages,
			B: j.SteamVaultBrowse, SP: j.SteamVaultSteamPages, I: j.SteamVaultInsights, L: j.SteamVaultLegacy,
			R: j.SteamVaultRetro, RP: j.SteamVaultRetroPages, PK: j.SteamVaultPicks, X: j.SteamVaultPlay,
			A: j.SteamVaultAchievements, AM: j.SteamVaultAchManager, H: j.SteamVaultHub,
			PL: j.SteamVaultPlatforms, PP: j.SteamVaultPlatformPages, SH: j.SteamVaultShare, CA: j.SteamVaultCare, T: j.SteamVaultI18n, PF: j.SteamVaultProfile, LK: j.SteamVaultLook
		};
	}

	// =============================================================== render
	async render(dv, page = "home") {
		const host = dv.container;
		let M = this.mods();
		let missing = this._required.filter(k => !M[k]);
		// o CustomJS carrega um arquivo por vez e este (SteamVault.js) vem
		// primeiro: espera os outros módulos antes de desistir
		for (let t = 0; missing.length && t < 400 && host.isConnected; t++) {
			await new Promise(r => setTimeout(r, 100));
			M = this.mods(); missing = this._required.filter(k => !M[k]);
		}
		if (missing.length) {
			host.classList.add("sv-host");
			host.innerHTML = `<div class="sv-fatal"><strong>Game Library não carregou</strong><p>Verifique se o plugin CustomJS está ativo e aponta para a pasta <code>Scripts/</code>. Módulos ausentes: ${missing.join(", ")}.</p></div>`;
			return;
		}
		host.__svRender = { dv, page };
		// inglês: o dicionário mora num arquivo à parte; a tela espera a leitura
		// (uma vez só) para não aparecer em português e trocar logo depois
		if (M.T?.on && !M.T._enLoaded) await M.T.load();
		this._migrateBoot();
		// a página de coleção automática vive dentro de Coleções: sair dela limpa
		if (page !== "collections") window.__svSmartView = null;
		window.__svHosts.add(host);

		const current = dv.current?.() || null;
		const model = M.C.model(dv);
		const ctx = { dv, ...M, V: this, model, current, page };
		try { this._sfxDiff(model, M); } catch (_) {}

		let res;
		try {
			let route = this.routes[page];
			if (!route) throw new Error(`Página desconhecida: ${page}`);
			if (!M[route[0]] && route[0] === "H") route = ["I", "achievements"]; // hub ausente: tela antiga
			res = await M[route[0]][route[1]](ctx);
		} catch (err) {
			console.error("Game Library: falha ao montar a página", page, err);
			res = { active: "", html: `<div class="sv-page sv-pad">${M.U.empty({ icon: "alert", title: "Não foi possível montar esta tela", text: String(err?.message || err) })}</div>` };
		}

		const surface = this._surface(host);
		const steamCfg = M.S.getConfig();
		const preScroller = surface.scroller || host.parentElement;
		const preOwn = surface.layer ? surface.el.clientWidth : preScroller?.clientWidth;
		const preW = this._viewWidth(preOwn);
		// 3.68.0: tudo o que o ajuste de tamanho mede, medido antes de trocar o conteúdo
		const preSize = surface.layer ? { fit: this._measureFit(surface), w: preOwn, vw: preW, h: surface.el.clientHeight } : null;
		surface.el.innerHTML = M.U.shell({ active: res.active, content: res.html, C: M.C, model, steamCfg, raCfg: M.R ? M.R.getConfig() : null });
		const root = surface.el.querySelector(".sv-app");
		root.dataset.page = page;
		// 3.58.0: personalização da interface (atributos data-lay-*)
		try { M.U.applyLayout?.(root); } catch (err) { console.warn("Game Library: layout", err); }
		root.classList.add("sv-instant");
		this._presetSize(root, preW);
		// navegação de verdade × re-render da MESMA tela (Dataview, sync,
		// salvar): as animações de entrada só rodam na navegação — o re-render
		// troca o conteúdo sem a tela piscar
		const renderKey = `${page}:${current?.file?.path || ""}`;
		const isRefresh = surface.el.__svKey === renderKey;
		if (!isRefresh && current?.file?.path && ["game", "achievement", "collection", "platform", "genre", "subgenre", "franchise"].includes(page)) this._pushRecent(current.file.path);
		surface.el.__svKey = renderKey;
		root.classList.toggle("is-refresh", isRefresh);
		this._markTopImage(root);
		host.__svSurface = surface;
		this._markLeaf(host);
		this._observeSize(host, surface);
		this._applyPrefs();
		this._wire(root, ctx);
		try { res.wire?.(root, ctx); } catch (err) { console.error("Game Library: falha ao ligar a página", page, err); }
		try { M.X?.wireCalendar(root, ctx); } catch (err) { console.warn("Game Library: calendário", err); }
		this._wireImages(root);
		// inglês: troca os textos já desenhados e acompanha o que aparecer depois
		if (M.T?.on) { try { M.T.apply(root); M.T.observe(); } catch (err) { console.warn("Game Library: idioma", err); } }
		this._restoreScroll(host, surface, page, current);
		this._wireMotion(root, surface, isRefresh);
		try { this._wireHeroCarousel(root, surface); } catch (err) { console.warn("Game Library: carrossel", err); }
		this._wirePointerFx(root);
		this._wireGestures(root, surface, ctx);
		// depois de 2 quadros (estado inicial já aplicado) liga as transições
		requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("sv-instant")));
		if (document.body.classList.contains("sv-app-paused")) document.body.classList.remove("sv-app-paused");
		this._markScreen();
		host.__svApply?.(preSize);
		// resumo RA na Home: carregado depois, no fim da página (secundário)
		if (page === "home" && M.RP) {
			M.RP.homeStrip(ctx).then(h => {
				const slot = root.querySelector("[data-ra-strip]");
				if (slot && h) { slot.outerHTML = h; this._wireImages(root); }
			}).catch(() => {});
		}
		// Steam Picks: só instala o sentinela no fim da Home (nenhuma consulta agora)
		if (page === "home" && M.PK) { try { M.PK.mount(root, ctx); M.PK.mountWishlist?.(root, ctx); } catch (err) { console.warn("Game Library: Steam Picks", err); } }
		M.S.maybeAutoSync();
		M.R?.maybeAutoSync();
		M.PL?.maybeAutoSync();
		// marcos da Game Library: avisa uma vez por revisão dos dados, com a tela já pronta
		if (M.X && window.__svMsRev !== window.__svRev) {
			window.__svMsRev = window.__svRev;
			setTimeout(() => { try { M.X.announceGoals(ctx); } catch (_) {} }, 1200);
		}
	}

	// ------------------------------------------------------ superfície
	// Na aba principal, o app é desenhado numa CAMADA própria que cobre a
	// área de conteúdo da aba (.view-content), com rolagem própria. Assim o
	// editor (Live Preview), o modo leitura, o tema e a versão do Obsidian
	// não conseguem estreitar, centralizar, cortar ou deslocar a tela.
	// A nota em si guarda só um marcador vazio. Em notas incorporadas e
	// pré-visualizações (hover), o app continua dentro da nota.
	// Notas antigas chamam customJS direto e mostram "customJS is not defined"
	// ao abrir o Obsidian. Uma vez por versão, em segundo plano, troca essa
	// linha (e só ela) pela chamada do boot, que tem a tela de carregamento.
	_migrateBoot() {
		if (window.__svBootMigrating || typeof app === "undefined" || !app.vault?.process) return;
		const C = this.mods().C, key = "steamvault:bootMigrated";
		try { if (localStorage.getItem(key) === C.VERSION) return; } catch (_) { return; }
		window.__svBootMigrating = true;
		// customJS direto (antigo) ou a chamada do boot sem a espera (até 3.22.0)
		const re = /await customJS\.SteamVault\.render\(dv, "([a-z-]+)"\);|^await dv\.view\("Assets\/steamvault-boot", \{ page: "([a-z-]+)" \}\);$/gm;
		const run = async () => {
			if (!app.vault.getAbstractFileByPath("Assets/steamvault-boot.js")) return; // sem o boot, nada muda
			let n = 0;
			for (const f of app.vault.getMarkdownFiles()) {
				const cls = app.metadataCache.getFileCache(f)?.frontmatter?.cssclasses;
				if (!(Array.isArray(cls) ? cls : [cls]).some(c => String(c || "").includes("steamvault"))) continue;
				const text = await app.vault.cachedRead(f);
				if (!re.test(text)) continue;
				re.lastIndex = 0;
				await app.vault.process(f, t => t.replace(re, (m, a, b) => C.bootLine(a || b)));
				n++;
				if (n % 20 === 0) await new Promise(r => setTimeout(r, 30));
			}
			try { localStorage.setItem(key, C.VERSION); } catch (_) { /* sem armazenamento: tenta de novo na próxima abertura */ }
			window.__svBootMigrating = "done";
			if (n) console.info(`Game Library: ${n} notas passaram a usar a tela de carregamento`);
		};
		setTimeout(() => (window.requestIdleCallback || (f => f()))(() => run().catch(err => console.warn("Game Library: migração do boot falhou", err)).finally(() => { if (window.__svBootMigrating !== "done") window.__svBootMigrating = false; })), 4000);
	}

	_surface(host) {
		const inline = host.closest(".markdown-embed, .hover-popover, .popover, .canvas-node, .internal-embed");
		const leafContent = host.closest(".workspace-leaf-content");
		const viewContent = leafContent?.querySelector(":scope > .view-content");
		if (inline || !viewContent) {
			host.classList.add("sv-host");
			return { el: host, scroller: host.closest(".markdown-preview-view, .cm-scroller"), layer: false };
		}
		let layer = viewContent.querySelector(":scope > .sv-layer");
		if (!layer) {
			layer = document.createElement("div");
			layer.className = "sv-host sv-layer";
			layer.__svY = 0; // 3.69.0: camada nova já está no topo (evita gravar scrollTop e forçar o layout)
			viewContent.appendChild(layer);
		}
		viewContent.classList.add("sv-has-layer");
		layer.__svAnchor = host;
		layer.__svMiss = 0;
		// tela nova começa destravada (nada herdado do menu da tela anterior)
		layer.classList.remove("is-locked");
		host.classList.remove("sv-host");
		host.classList.add("sv-anchor");
		host.textContent = "";
		this._watchLayers();
		return { el: layer, scroller: layer, layer: true, viewContent, leafContent };
	}

	// Áreas seguras do aparelho (barra de status em cima, barra de gestos
	// embaixo). Fontes, da mais confiável para a menos:
	//   1. env(safe-area-inset-*) — o que o sistema informa ao WebView
	//   2. --safe-area-inset-* — o que o próprio Obsidian mobile expõe
	//   3. estimativa: se o WebView ocupa a tela inteira (Android 15
	//      "edge-to-edge", ex.: POCO F7) e ninguém informou nada, usa
	//      valores típicos de barra de status e de barra de gestos.
	_insets() {
		const now = Date.now();
		if (!window.__svInsetsBound) {
			window.__svInsetsBound = true;
			const clear = () => { window.__svInsets = null; };
			window.addEventListener("resize", clear, { passive: true });
			window.addEventListener("orientationchange", clear, { passive: true });
		}
		if (window.__svInsets && now - window.__svInsets.at < 30000) return window.__svInsets;
		let envT = 0, envB = 0;
		try {
			const pr = document.createElement("div");
			pr.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)";
			document.body.appendChild(pr);
			const cs = getComputedStyle(pr);
			envT = parseFloat(cs.paddingTop) || 0; envB = parseFloat(cs.paddingBottom) || 0;
			pr.remove();
		} catch (_) {}
		const bs = getComputedStyle(document.body);
		const v = n => parseFloat(bs.getPropertyValue(n)) || 0;
		let top = Math.max(envT, v("--safe-area-inset-top")), bottom = Math.max(envB, v("--safe-area-inset-bottom"));
		let estimated = false;
		const b = document.body.classList;
		// Android edge-to-edge: com o teclado aberto, o "safe-area inferior"
		// passa a incluir a altura do TECLADO. Barra de gestos tem 16–34 px;
		// acima disso é teclado — vale o último valor real da barra de gestos
		// (senão a barra de ações das janelas ganhava centenas de px de folga
		// e ficava assim depois que o teclado fechava)
		if (bottom > 56) bottom = window.__svGestureInset ?? 0;
		else if (bottom > 0) window.__svGestureInset = bottom;
		if (top > 80) top = window.__svTopInset ?? 0;
		else if (top > 0) window.__svTopInset = top;
		if (b.contains("is-mobile") && (!top || !bottom)) {
			const sh = window.screen?.height || 0;
			const edgeToEdge = sh > 0 && Math.abs(sh - window.innerHeight) < 8;
			if (edgeToEdge && b.contains("is-android")) {
				if (!top) { top = 32; estimated = true; }
				if (!bottom) { bottom = 18; estimated = true; }
			}
		}
		window.__svInsets = { top: Math.round(top), bottom: Math.round(bottom), estimated, at: now };
		const r = document.documentElement.style;
		r.setProperty("--sv-inset-top", `${Math.round(top)}px`);
		r.setProperty("--sv-inset-bottom", `${Math.round(bottom)}px`);
		return window.__svInsets;
	}

	// encaixa a camada entre o cabeçalho flutuante e a barra inferior
	// flutuante do Obsidian mobile (quando existem e cobrem o conteúdo)
	// ------------------------------------------------ desempenho do layout
	// Escreve só quando o valor muda: uma escrita igual ainda invalida o
	// estilo e obriga o navegador a recalcular a página na próxima leitura.
	_setVar(el, name, val) { if (el.style.getPropertyValue(name) !== val) el.style.setProperty(name, val); }
	_setCls(el, cls, on) { if (el.classList.contains(cls) !== !!on) el.classList.toggle(cls, !!on); }
	// Última medida da tela (classes de tamanho + variáveis). Aplicada no
	// .sv-app novo ANTES da primeira leitura de layout: a página é montada
	// uma vez só, já no tamanho certo — sem calcular tudo como desktop e
	// refazer como celular.
	_rememberSize(cls, vars) {
		const st = window.__svSizeState || (window.__svSizeState = { cls: {}, vars: {} });
		Object.assign(st.cls, cls || {}); Object.assign(st.vars, vars || {});
	}
	_presetSize(root, w) {
		const st = window.__svSizeState;
		if (st) {
			for (const [k, on] of Object.entries(st.cls)) if (on) root.classList.add(k);
			for (const [n, v] of Object.entries(st.vars)) root.style.setProperty(n, v);
		}
		// classes de largura: medidas ANTES de trocar o conteúdo (a largura da
		// área não depende dele), então valem também no primeiro desenho
		for (const [k, max] of this._bps) root.classList.toggle(`sv-bp-${k}`, w < max);
	}
	get _bps() { return [["lg", 1180], ["md", 1000], ["sm", 760], ["xs", 440]]; }
	_viewWidth(own) {
		const cands = [own, window.innerWidth, document.documentElement.clientWidth, window.visualViewport?.width].filter(v => Number.isFinite(v) && v > 0);
		return cands.length ? Math.min(...cands) : 1200;
	}

	_fitLayer(surface) { this._writeFit(surface, this._measureFit(surface)); }

	// 3.68.0: medir e escrever separados. Nada aqui depende do conteúdo da
	// tela, então a render mede ANTES de trocar o conteúdo (layout já pronto,
	// leitura barata) e escreve depois, sem forçar o layout da tela nova
	_measureFit(surface) {
		if (!surface?.layer) return null;
		const { el, viewContent, leafContent } = surface;
		this._insets(); // aquece o cache das áreas seguras aqui (lê estilos calculados)
		const vc = viewContent.getBoundingClientRect();
		if (!vc.height) return null;
		let top = 0, bottom = 0;
		const header = leafContent.querySelector(":scope > .view-header");
		if (header && header.getClientRects().length) {
			const hr = header.getBoundingClientRect();
			if (hr.bottom > vc.top + 1 && hr.top <= vc.top + 8) top = Math.round(hr.bottom - vc.top);
		}
		for (const nav of document.querySelectorAll(".mobile-navbar")) {
			if (!nav.getClientRects().length) continue;
			const nr = nav.getBoundingClientRect();
			if (nr.top < vc.bottom - 1 && nr.bottom >= vc.bottom - 48 && nr.height < 160) bottom = Math.max(bottom, Math.round(vc.bottom - nr.top));
		}
		const lr = el.getBoundingClientRect();
		return { top, bottom, lrTop: lr.top, lrBottom: lr.bottom, curTop: parseFloat(el.style.top) || 0, vh: window.innerHeight };
	}

	_writeFit(surface, r) {
		if (!r || !surface?.layer) return;
		const el = surface.el;
		const topVal = r.top ? `${r.top}px` : "";
		if (el.style.top !== topVal) el.style.top = topVal;
		this._setVar(el, "--sv-safe-bottom", `${r.bottom}px`);
		// quanto da camada fica por baixo da barra de status / de gestos
		// (só aplica o espaço onde há sobreposição real — sem duplicar o
		// que o Obsidian ou o sistema já reservaram). A posição da camada vem
		// da medição, corrigida pela mudança do "top" (sem medir de novo)
		const ins = this._insets();
		// innerHeight também força o layout quando há mudança pendente: vem da medição
		const vh = r.vh;
		const lrTop = r.lrTop + (r.top - r.curTop);
		const safeTop = Math.max(0, Math.round(ins.top - lrTop));
		const safeBottom = Math.max(0, Math.round(r.lrBottom - (vh - ins.bottom)));
		const app_ = el.querySelector(".sv-app");
		if (app_) {
			this._setVar(app_, "--sv-safe-top", `${safeTop}px`);
			this._setVar(app_, "--sv-safe-bottom-inset", `${safeBottom}px`);
		}
		this._rememberSize(null, { "--sv-safe-top": `${safeTop}px`, "--sv-safe-bottom-inset": `${safeBottom}px` });
	}

	// remove a camada quando a aba passa a mostrar outra nota (ou o modo
	// código-fonte, em que o Dataview não desenha nada)
	_watchLayers() {
		if (window.__svLayerWatch) return;
		const isSteamVaultFile = layer => {
			try {
				const leafEl = layer.closest(".workspace-leaf-content");
				const leaf = app.workspace.getLeavesOfType("markdown").find(l => l.view?.containerEl === leafEl);
				const fm = leaf?.view?.file ? app.metadataCache.getFileCache(leaf.view.file)?.frontmatter : null;
				const cls = [].concat(fm?.cssclasses || fm?.cssclass || []).map(String);
				return { known: !!leaf, sv: cls.includes("steamvault") };
			} catch (_) { return { known: false, sv: false }; }
		};
		const check = () => {
			for (const layer of document.querySelectorAll(".sv-layer")) {
				try {
				if (layer.__svAnchor?.isConnected) { layer.__svMiss = 0; continue; }
				const st = isSteamVaultFile(layer);
				layer.__svMiss = (layer.__svMiss || 0) + 1;
				// outra nota na aba: some já; mesma nota re-renderizando: espera
				if ((st.known && !st.sv) || layer.__svMiss >= 3) {
					layer.parentElement?.classList.remove("sv-has-layer");
					layer.closest(".workspace-leaf-content")?.classList.remove("sv-leaf");
					layer.remove();
					customJS.SteamVault?._markScreen?.();
				}
				} catch (err) { console.warn("Game Library: verificação da camada", err); }
			}
			if (!document.querySelector(".sv-layer")) { clearInterval(window.__svLayerWatch); window.__svLayerWatch = null; }
		};
		window.__svLayerWatch = setInterval(check, 600);
		if (!window.__svLayerEvents) {
			window.__svLayerEvents = true;
			try {
				app.workspace.on("file-open", () => setTimeout(check, 80));
				app.workspace.on("layout-change", () => setTimeout(check, 80));
			} catch (_) {}
		}
	}

	// re-render de todas as telas vivas (depois de um sync, por exemplo)
	// re-desenha só as telas deste tipo (ex.: abrir uma coleção automática)
	_rerender(page) {
		for (const host of [...window.__svHosts]) {
			if (!host.isConnected) { window.__svHosts.delete(host); continue; }
			const r = host.__svRender;
			if (r && r.page === page) this.render(r.dv, r.page).then(() => { const l = host.closest(".sv-layer") || document.querySelector(".sv-layer"); if (l) l.scrollTop = 0; }).catch(err => console.warn("Game Library: re-render falhou", err));
		}
	}

	refresh() {
		this.mods().C?.invalidate();
		for (const host of [...window.__svHosts]) {
			if (!host.isConnected) { window.__svHosts.delete(host); continue; }
			const r = host.__svRender;
			if (r) this.render(r.dv, r.page).catch(err => console.warn("Game Library: refresh falhou", err));
		}
	}

	// a nota vira "tela": sem cabeçalho de nota, sem largura de leitura
	_markLeaf(host) {
		const view = host.closest(".markdown-reading-view, .markdown-source-view, .markdown-preview-view");
		view?.classList.add("sv-view");
		host.closest(".workspace-leaf-content")?.classList.add("sv-leaf");
	}

	// Classes de largura a partir da largura REAL da área da nota (não da
	// janela). Aplicadas antes do primeiro paint e atualizadas ao girar o
	// celular, abrir painel lateral, dividir a tela etc.
	_observeSize(host, surface) {
		const scroller = surface.scroller || host.parentElement;
		const apply = (pre = null) => {
			const app_ = surface.el.querySelector(".sv-app");
			if (!app_) return;
			if (pre && !pre.fit) pre = null; // medição prévia só vale no modo camada
			if (surface.layer) {
				if (pre) this._writeFit(surface, pre.fit); else this._fitLayer(surface);
				// menu aberto durante giro de tela/redimensionamento: acompanha
				const d = app_.querySelector(".sv-drawer:not([hidden])");
				if (d) { d.style.top = `${surface.el.scrollTop}px`; d.style.height = `${surface.el.clientHeight}px`; }
			}
			else if (scroller && scroller.clientWidth > 0) {
				// modo inline (nota incorporada): alinha à área visível
				const sr = scroller.getBoundingClientRect();
				const hr = surface.el.getBoundingClientRect();
				const shift = Math.round(hr.left - (sr.left + scroller.clientLeft));
				app_.style.width = `${scroller.clientWidth}px`;
				app_.style.maxWidth = "none";
				app_.style.marginLeft = shift ? `${-shift}px` : "";
			}
			// leituras primeiro (um único cálculo de layout)…
			const own = pre ? pre.w : surface.layer ? surface.el.clientWidth : scroller?.clientWidth;
			const w = pre ? pre.vw : this._viewWidth(own);
			const touch = document.body.classList.contains("is-mobile") || matchMedia("(hover: none)").matches;
			const h = (pre ? pre.h : surface.layer ? surface.el.clientHeight : scroller?.clientHeight) || window.innerHeight;
			// …depois as escritas, só do que mudou
			const cls = { "is-touch": touch };
			for (const [k, max] of this._bps) { cls[`sv-bp-${k}`] = w < max; }
			for (const [k, on] of Object.entries(cls)) this._setCls(app_, k, on);
			const bn = app_.querySelector(".sv-bottomnav");
			// com medição prévia, o estilo calculado da barra inferior fica para o
			// próximo quadro (lê-lo agora forçaria o cálculo de estilos da tela nova);
			// até lá vale o estado lembrado, aplicado por _presetSize
			if (pre) {
				cls["has-bottomnav"] = app_.classList.contains("has-bottomnav");
				requestAnimationFrame(() => { if (!app_.isConnected) return; const on = !!bn && getComputedStyle(bn).display !== "none"; this._setCls(app_, "has-bottomnav", on); if (window.__svSizeState) window.__svSizeState.cls["has-bottomnav"] = on; });
			} else {
				cls["has-bottomnav"] = !!bn && getComputedStyle(bn).display !== "none";
				this._setCls(app_, "has-bottomnav", cls["has-bottomnav"]);
			}
			const vars = { "--sv-view-w": `${Math.round(w)}px` };
			if (h) vars["--sv-view-h"] = `${h}px`;
			for (const [n, v] of Object.entries(vars)) this._setVar(app_, n, v);
			this._rememberSize(cls, vars);
			// setas/esmaecido das abas roláveis: no próximo quadro, fora do caminho crítico
			requestAnimationFrame(() => app_.querySelectorAll(".sv-tabs").forEach(t => t.dispatchEvent(new Event("scroll"))));
			const sw = (surface.scroller || scroller)?.__svStuckWatch;
			if (sw) { if (pre) requestAnimationFrame(sw); else sw(); } // lê estilo calculado: fora da montagem
		};
		// 3.68.0: sem a chamada imediata. A render chama host.__svApply() no fim,
		// depois de ligar a página; medir aqui também obrigava o navegador a
		// calcular o layout inteiro duas vezes na mesma abertura de tela
		// (classes e variáveis de tamanho já vêm de _presetSize)
		setTimeout(apply, 350); setTimeout(apply, 1200);
		host.__svApply = apply;
		host.__svResize?.disconnect();
		if (typeof ResizeObserver === "function") {
			let raf = 0;
			const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(apply); });
			ro.observe(surface.el);
			if (surface.viewContent) ro.observe(surface.viewContent);
			else if (scroller) ro.observe(scroller);
			window.visualViewport?.addEventListener("resize", apply, { passive: true });
			host.__svResize = ro;
		} else {
			window.addEventListener("resize", apply);
		}
	}

	_applyPrefs() {
		const U = this.mods().U;
		const reduced = U._store("reducedMotion") === "1";
		document.body.classList.toggle("sv-reduced-motion", reduced);
		document.body.classList.toggle("sv-no-shine", U._store("shine") === "0");
		document.body.classList.toggle("sv-no-tilt", U._store("tilt") === "0");
		document.body.classList.toggle("sv-no-haptics", U._store("haptics") === "0");
		// 3.23.0: preto puro (telas OLED) e tamanho do texto, por aparelho ou sincronizados
		document.body.classList.toggle("sv-oled", U._store("oled") === "1");
		const ts = Number(U._store("textScale") || 1);
		if (ts && ts !== 1 && ts >= 0.85 && ts <= 1.3) document.body.style.setProperty("--sv-ts", String(ts));
		else document.body.style.removeProperty("--sv-ts");
		this._applyAccent(U._store("accent") || "blue");
		// 3.26.2: tema da interface (fundos e superfícies)
		const theme = U._store("theme") || "steam";
		for (const t of ["classic", "graphite", "midnight"]) document.body.classList.toggle(`sv-theme-${t}`, theme === t);
		// preferências guardadas no vault: outro aparelho pode ter mudado algo
		const CA = this.mods().CA;
		if (CA) {
			CA.bind();
			if (CA.syncOn() && !this.__svPulling) {
				this.__svPulling = true;
				CA.pull().then(changed => { if (changed) { this._applyPrefs(); this.refresh(); } }).catch(() => {}).finally(() => { this.__svPulling = false; });
			}
		}
	}

	// cor de destaque escolhida em Configurações › Aparência (por aparelho).
	// Vale no corpo da página e nos palcos escuros (heros), nos dois temas.
	_applyAccent(id) {
		const U = this.mods().U;
		const css = U.accentCss ? U.accentCss(id) : "";
		let st = document.getElementById("sv-accent-style");
		if (!css) { st?.remove(); document.body.classList.remove("sv-accent-custom"); return; }
		if (!st) { st = document.createElement("style"); st.id = "sv-accent-style"; document.head.appendChild(st); }
		st.textContent = css;
		document.body.classList.add("sv-accent-custom");
	}

	// posição de rolagem sobrevive ao re-render automático do Dataview.
	// Desempenho: o evento de rolagem dispara dezenas de vezes por segundo.
	// Nada nele mede layout nem consulta o Dataview — o trabalho roda no
	// máximo uma vez por quadro, só lê scrollTop, e as abas grudadas são
	// detectadas por um IntersectionObserver (fora do caminho da rolagem).
	_restoreScroll(host, surface, page, current) {
		const scroller = surface.scroller;
		if (!scroller) return;
		const app_ = surface.el.querySelector(".sv-app");
		const setCls = (cls, on) => { if (app_.classList.contains(cls) !== on) app_.classList.toggle(cls, on); };
		const mark = (known = null) => {
			if (!app_) return;
			const y = known ?? scroller.scrollTop;
			setCls("is-scrolled", y > 48);
			// a fileira de botões vira barra sólida assim que o conteúdo começa a subir
			const raised = app_.classList.contains("is-raised");
			if (!raised && y > 6) app_.classList.add("is-raised");
			else if (raised && y < 2) app_.classList.remove("is-raised");
			if (y <= 0) setCls("is-tabs-stuck", false);
		};
		// abas da ficha grudadas no topo? Um marcador de altura zero logo antes
		// delas: quando ele passa acima da linha onde as abas grudam, elas grudaram.
		scroller.__svStuckIO?.disconnect();
		app_?.classList.remove("is-tabs-stuck");
		// 3.62.1: vale também para as abas das Estatísticas (.sv-sttabs), que
		// só reservam o espaço dos botões flutuantes quando grudam no topo
		const gn = app_?.querySelector(".sv-gamenav, .sv-sttabs");
		if (gn && typeof IntersectionObserver === "function") {
			const sentinel = document.createElement("div");
			sentinel.className = "sv-gamenav-sentinel";
			sentinel.setAttribute("aria-hidden", "true");
			gn.before(sentinel);
			const watch = () => {
				scroller.__svStuckIO?.disconnect();
				if (!gn.isConnected) return;
				const stickTop = parseFloat(getComputedStyle(gn).top) || 0;
				const io = new IntersectionObserver(es => {
					const e = es[es.length - 1];
					setCls("is-tabs-stuck", !e.isIntersecting && e.boundingClientRect.top < (e.rootBounds?.top ?? 0) + stickTop + 1 && scroller.scrollTop > 0);
				}, { root: scroller, rootMargin: `${-Math.round(stickTop + 1)}px 0px 0px 0px`, threshold: 0 });
				io.observe(sentinel);
				io.__svTop = stickTop;
				scroller.__svStuckIO = io;
			};
			// 3.68.0: no próximo quadro. Ler o "top" calculado aqui, no meio da
			// montagem, obrigava o navegador a recalcular os estilos da página
			// inteira antes da hora (e de novo depois). O estado inicial já é
			// "não grudada"
			requestAnimationFrame(watch);
			// a linha onde as abas grudam muda com a barra de status (giro, redimensionar)
			scroller.__svStuckWatch = () => { const t = parseFloat(getComputedStyle(gn).top) || 0; if (t !== scroller.__svStuckIO?.__svTop) watch(); };
		} else scroller.__svStuckWatch = null;
		// "rolou um pouco" (barra sólida) e "rolou bastante": marcadores
		// invisíveis no topo do conteúdo, também por IntersectionObserver —
		// nenhuma leitura de posição durante a rolagem
		scroller.__svTopIO?.disconnect();
		let useMarks = false;
		if (surface.layer && scroller === surface.el && typeof IntersectionObserver === "function") {
			scroller.querySelectorAll(":scope > .sv-scroll-mark").forEach(m => m.remove());
			const mk = (y, cls) => { const m = document.createElement("div"); m.className = "sv-scroll-mark"; m.style.top = `${y}px`; m.dataset.cls = cls; m.setAttribute("aria-hidden", "true"); scroller.prepend(m); return m; };
			const marks = [mk(4, "is-raised"), mk(48, "is-scrolled")];
			const io = new IntersectionObserver(es => { for (const e of es) setCls(e.target.dataset.cls, !e.isIntersecting && e.boundingClientRect.bottom <= (e.rootBounds?.top ?? 0) + 1); if (scroller.scrollTop <= 0) setCls("is-tabs-stuck", false); }, { root: scroller, threshold: 0 });
			marks.forEach(m => io.observe(m));
			scroller.__svTopIO = io;
			useMarks = true;
		}
		const key = `${page}:${current?.file?.path || ""}`;
		const saved = window.__svScroll?.[key];
		// 3.68.0: só escreve se não estiver sabidamente no topo (escrever
		// scrollTop logo depois de trocar o conteúdo força o layout)
		if (surface.layer && !saved && scroller.__svY !== 0) { scroller.scrollTop = 0; scroller.__svY = 0; }
		if (saved) requestAnimationFrame(() => { scroller.scrollTop = saved; if (!useMarks) mark(); });
		scroller.__svMark = useMarks ? null : mark;
		scroller.__svHost = host;
		scroller.__svKey = key;
		// 3.68.0: acabou de ir para o topo? marca com 0 sem ler de volta
		// (ler scrollTop logo depois de trocar o conteúdo forçava o layout)
		mark(surface.layer && !saved ? 0 : null);
		if (!scroller.__svScrollBound) {
			scroller.__svScrollBound = true;
			let frame = 0, idle = 0;
			const tick = () => {
				frame = 0;
				scroller.__svMark?.();
			};
			// guardar a posição e corrigir um deslocamento lateral acidental:
			// só quando a rolagem para (fora dos quadros da rolagem)
			const settle = () => {
				idle = 0;
				if (scroller.scrollLeft) scroller.scrollLeft = 0;
				window.__svScroll = window.__svScroll || {};
				scroller.__svY = scroller.scrollTop;
				if (scroller.__svKey) window.__svScroll[scroller.__svKey] = scroller.__svY;
			};
			scroller.addEventListener("scroll", () => {
				scroller.__svY = null; // posição conhecida só quando a rolagem para
				if (!frame) frame = requestAnimationFrame(tick);
				clearTimeout(idle); idle = setTimeout(settle, 140);
			}, { passive: true });
		}
	}

	// ============================================================ wiring
	_wire(root, ctx) {
		const { U } = ctx;
		root.addEventListener("click", e => this._onClick(e, root, ctx));
		root.addEventListener("keydown", e => {
			if (e.key === "Escape") { this._closeMenus(root); this._closeDrawer(root); }
		});
		this._wireSearch(root, ctx);
		try { this._liveSync(root, ctx); } catch (err) { console.warn("Game Library: sessão ao vivo", err); }
		this._heatmapsToEnd(root);
		this._wireShelves(root);
		this._wireTabs(root);
		this._wireHorizontalScrollers(root);
		this.shieldDrag(root);
		// celular: brilho ao tocar na capa (não existe "passar o mouse")
		root.addEventListener("pointerdown", e => {
			if (e.pointerType === "mouse") return;
			const el = e.target.closest(".sv-card, .sv-wide, .sv-hero-cover, .sv-award");
			if (el && root.contains(el)) this._shine(el);
		}, { passive: true });
		this._heroShine(root);
		this._wireTouchFx(root);
		root.querySelectorAll(".sv-nav-item").forEach(a => a.addEventListener("mouseenter", () => {
			if (root.classList.contains("is-collapsed")) a.setAttribute("title", a.dataset.tip || "");
			else a.removeAttribute("title");
		}));
		// estado inicial dos botões de rolagem das prateleiras
		// 3.68.0: lê todas as prateleiras e só depois escreve (alternar leitura
		// e escrita forçava um layout por prateleira)
		requestAnimationFrame(() => { const m = [...root.querySelectorAll(".sv-shelf")].map(s => [s, this._shelfMeasure(s)]); for (const [s, v] of m) this._shelfApply(s, v); });
		void U;
	}

	_onClick(e, root, ctx) {
		const actionEl = e.target.closest("[data-action]");
		const openEl = e.target.closest("[data-open]");
		// ação tem prioridade sobre o link que a envolve (ex.: favoritar no card)
		if (actionEl && root.contains(actionEl) && this._handles(actionEl.dataset.action)) {
			if (actionEl.closest(".sv-legacy")) return; // editores herdados cuidam dos seus próprios botões
			e.preventDefault(); e.stopPropagation();
			this._action(actionEl.dataset.action, actionEl, root, ctx, e);
			return;
		}
		if (openEl && root.contains(openEl) && !openEl.closest(".sv-legacy")) {
			e.preventDefault();
			// tocar de novo na aba atual (barra inferior ou menu lateral) volta ao
			// topo, como nos apps de celular, em vez de recarregar a mesma tela
			if (openEl.matches(".sv-bottomnav-item.is-active, .sv-nav-item.is-active") && !(e.ctrlKey || e.metaKey) && this._samePage(openEl.dataset.open, ctx)) {
				const sc = root.closest(".sv-layer") || document.scrollingElement;
				if (sc && sc.scrollTop > 0) { sc.scrollTo({ top: 0, behavior: this._motionOn() ? "smooth" : "auto" }); return; }
			}
			this._closeDrawer(root);
			// "Ver todos" de uma faixa: a Biblioteca abre com o filtro dela
			if (openEl.dataset.libFilter) { try { window.__svLibFilter = JSON.parse(openEl.dataset.libFilter); } catch (_) { window.__svLibFilter = null; } }
			const newTab = e.ctrlKey || e.metaKey || e.button === 1;
			const delay = root.classList.contains("is-touch") && this._shineOn() && openEl.closest(".sv-card, .sv-wide, .sv-award") ? 170 : 0;
			if (delay) setTimeout(() => this.open(openEl.dataset.open, ctx, newTab), delay);
			else this.open(openEl.dataset.open, ctx, newTab);
		}
	}

	_samePage(target, ctx) {
		const norm = p => String(p || "").replace(/\.md$/i, "");
		const cur = ctx?.current?.file?.path;
		return !!cur && norm(cur) === norm(target);
	}

	_handles(a) {
		return ["favorite", "menu", "manage", "steam-sync-game", "steam-sync", "steam-sync-force", "steam-connect", "steam-clear",
			"add-game", "random-game", "legacy", "toggle-sidebar", "open-drawer", "close-drawer", "shelf-prev", "shelf-next",
			"repair-names", "collection-games", "open-category", "identity-edit", "smart-back",
			"ra-connect", "ra-sync", "ra-sync-force", "ra-sync-game", "ra-import-game", "ra-import-all", "ra-disconnect", "obs", "search-open", "search-close", "live-toggle", "live-stop", "live-pause", "queue-toggle", "queue-manage",
			"steam-import", "steam-art", "steam-art-all", "steam-details", "ach-target", "goals-edit", "stories", "picker", "wishlist-prices", "wishlist-import", "wish-target", "wish-bought", "onboard-hide", "onboard-show", "show-more", "backup-now", "backup-snooze", "csv-import", "library-health", "csv-export", "undo-last", "month-dismiss", "smart-collection",
			"ach-config", "ach-unlock", "ach-migrate", "ach-icons-local", "skip-content", "ach-manage", "ach-manage-pick", "hub-open", "ach-bulk",
			"plat-connect", "plat-sync", "plat-sync-game", "plat-disconnect", "plat-import", "plat-import-list", "secrets-wipe", "share-card", "feature-toggle"].includes(a);
	}

	open(path, ctx, newTab = false) {
		if (!path) return;
		const src = ctx?.current?.file?.path || "";
		app.workspace.openLinkText(String(path).replace(/\.md$/, ""), src, newTab ? "tab" : false);
	}

	async _action(action, el, root, ctx, e) {
		const { C, S, L, U } = ctx;
		const path = el.dataset.path;
		switch (action) {
			case "toggle-sidebar": {
				const collapsed = root.classList.toggle("is-collapsed");
				U._store("sidebar", collapsed ? "collapsed" : "open");
				el.setAttribute("aria-label", collapsed ? "Expandir barra lateral" : "Recolher barra lateral");
				return;
			}
			case "open-drawer": return this._openDrawer(root);
			case "close-drawer": return this._closeDrawer(root);
			case "shelf-prev": case "shelf-next": {
				const track = el.closest(".sv-shelf")?.querySelector(".sv-shelf-track");
				if (track) track.scrollBy({ left: (action === "shelf-next" ? 1 : -1) * track.clientWidth * 0.85, behavior: this._smooth() });
				return;
			}
			case "menu": {
				const menu = el.closest(".sv-menu-wrap")?.querySelector(".sv-menu");
				if (!menu) return;
				const open = menu.hidden;
				this._closeMenus(root);
				menu.hidden = !open;
				el.setAttribute("aria-expanded", String(open));
				// foco no 1º item só quando o menu foi aberto pelo teclado
				if (open && e && e.detail === 0) menu.querySelector("button, a")?.focus();
				return;
			}
			case "favorite": return this._toggleFavorite(el, path, root);
			case "manage": this._closeMenus(root); return this.manage(ctx, el.dataset.section, path);
			case "legacy": this._closeMenus(root); return this.legacy(ctx, el.dataset.legacy, el);
			case "add-game": return this.addGame(ctx, { title: el.dataset.title || "", appId: el.dataset.appid || "" });
			case "random-game": return ctx.X ? ctx.X.openPicker(ctx) : this.randomGame(ctx);
			case "collection-games": return this.collectionGames(ctx, path);
			case "obs": this._closeDrawer(root); return this._obsidian(el.dataset.cmd);
			case "search-open": return this._openSearch(root);
			case "live-toggle": return this._liveToggle(el.dataset.path, root, ctx);
			case "live-stop": return this._liveStopDialog(root, ctx);
			case "live-pause": return this._livePause(root, ctx);
			case "queue-toggle": this._closeMenus(root); return this._queueToggle(el.dataset.path, ctx);
			case "queue-manage": return this._queueManage(ctx);
			case "search-close": return this._closeSearch(root);
			case "ra-connect": return this.raConnect(ctx);
			case "ra-sync": return this.raSyncAll(ctx, false);
			case "ra-sync-force": return this.raSyncAll(ctx, true);
			case "ra-sync-game": this._closeMenus(root); return this.raSyncGame(ctx, path);
			case "ra-import-game": return this.raImport(ctx, [el.dataset.id], el);
			case "ra-import-all": return this.raImport(ctx, null, el);
			case "ra-disconnect": {
				const ok = await this.confirm({ title: "Desconectar o RetroAchievements?", text: "Remove a Web API Key deste dispositivo e o cache do perfil. Fichas e conquistas já sincronizadas continuam no vault.", confirm: "Desconectar", danger: true });
				if (!ok) return;
				await ctx.R.disconnect();
				this.toast("RetroAchievements desconectado", { tone: "ok" });
				return this.refresh();
			}
			case "open-category": {
				const kind = ["platform", "franchise", "subgenre"].includes(el.dataset.kind) ? el.dataset.kind : "genre";
				const name = el.dataset.name || "";
				try {
					const file = await ctx.C.ensureCategoryNote(kind, name);
					this.open(file.path, ctx, e.ctrlKey || e.metaKey);
				} catch (err) {
					this.toast(`Não foi possível abrir “${name}”: ${err.message}`, { tone: "error" });
				}
				return;
			}
			case "steam-connect": return this.steamConnect(ctx);
			case "steam-sync": return this.steamSyncAll(ctx, false);
			case "steam-sync-force": return this.steamSyncAll(ctx, true);
			case "steam-sync-game": this._closeMenus(root); return this.steamSyncGame(ctx, path);
			case "steam-import": return this.steamImport(ctx, el.dataset.appid || null, el);
			case "steam-art": this._closeMenus(root); return this.steamArt(ctx, path ? [path] : null, el);
			case "steam-details": this._closeMenus(root); return this.steamDetails(ctx, path);
			case "steam-art-all": return this.steamArt(ctx, null, el);
			case "ach-target": return ctx.X?.toggleTarget(el);
			case "goals-edit": return ctx.X?.openGoalsEditor(ctx);
			case "stories": return ctx.X?.openStories(ctx, el.dataset.year || null);
			case "feature-toggle": this._closeMenus(root); return this._toggleFeatured(el, path || el.dataset.path);
			case "share-card": this._closeMenus(root); if (!ctx.SH) return this.toast("Módulo de cartão ausente (SteamVaultShare.js)", { tone: "warn" }); return ctx.SH.open(ctx, el.dataset.kind || "game", path || el.dataset.path || "");
			case "picker": return ctx.X ? ctx.X.openPicker(ctx) : this.randomGame(ctx);
			case "wishlist-prices": return this.wishlistPrices(ctx, el);
			case "wishlist-import": return ctx.PK?.importSteamWishlist(ctx);
			case "wish-target": return ctx.PK?.editTarget(ctx, el.dataset.path);
			case "wish-bought": return ctx.PK?.markBought(ctx, el.dataset.path);
			case "onboard-hide": { ctx.U._store("onboardHidden", "1"); this.toast("Primeiros passos dispensados. Dá para ver de novo em Configurações.", { icon: "check" }); return this.refresh(); }
			case "backup-now": {
				if (!ctx.CA) return;
				el.disabled = true;
				const out = await ctx.CA.backup(this);
				el.disabled = false;
				if (out) this.refresh();
				return;
			}
			case "csv-export": this._closeMenus(root); return ctx.CA ? ctx.CA.exportCsv(ctx, this) : null;
			case "month-dismiss": { ctx.U._store("monthSeen", el.dataset.month || ""); el.closest("[data-month-block]")?.remove(); return; }
			case "undo-last": return ctx.CA ? ctx.CA.undoLast(this) : null;
			case "library-health": this._closeMenus(root); return ctx.CA ? ctx.CA.openHealth(ctx, this) : this.toast("Módulo de dados ausente (SteamVaultCare.js)", { tone: "warn" });
			case "csv-import": return ctx.CA ? ctx.CA.openCsvImport(ctx, this) : this.toast("Módulo de dados ausente (SteamVaultCare.js)", { tone: "warn" });
			case "backup-snooze": { ctx.CA?.snooze(7); el.closest(".sv-nudge")?.remove(); this.toast("Lembro de novo daqui a uma semana", { icon: "check" }); return; }
			// listas longas: o resto fica num <template> até a pessoa pedir
			case "show-more": {
				const box = el.parentElement, tpl = box?.querySelector(":scope > template[data-sv-more]");
				if (!tpl) { el.remove(); return; }
				const frag = tpl.content;
				this._wireImages?.(frag);
				tpl.replaceWith(frag);
				el.remove();
				return;
			}
			case "onboard-show": { ctx.U._store("onboardHidden", "0"); this.toast("Os primeiros passos voltaram para a Início", { icon: "check", tone: "ok" }); return; }
			case "smart-collection": window.__svSmartView = el.dataset.id || null; return this._rerender("collections");
			case "smart-back": window.__svSmartView = null; return this._rerender("collections");
			case "identity-edit": return ctx.B.editIdentity(ctx, el.dataset.kind, el.dataset.name || "", el.dataset.path || "");
			case "ach-config": this._closeMenus(root); return ctx.A?.openConfig(ctx, path);
			case "ach-unlock": return ctx.A?.toggleUnlock(el);
			// 3.74.0: jogos de Xbox usam o gerenciador manual (lote, planilha, ícones)
			case "ach-manage": this._closeMenus(root); return ctx.A?.isXbox?.(ctx.model.gamesByPath.get(path)) && ctx.AM ? ctx.AM.open(ctx, path) : ctx.A?.openManager(ctx, path, { edit: el.dataset.edit || "" });
			case "ach-bulk": this._closeMenus(root); return ctx.AM?.open(ctx, path, { tab: "bulk" });
			case "ach-manage-pick": return ctx.A?.openPicker(ctx, el.dataset.provider);
			case "ach-icons-local": return ctx.A?.localizeIcons(ctx);
			case "skip-content": { const main = root.querySelector(".sv-content"); main?.focus({ preventScroll: true }); const f = main?.querySelector("h1, h2, a[href], button, input"); f?.scrollIntoView?.({ block: "nearest" }); return; }
			case "plat-connect": this._closeMenus(root); return ctx.PP?.openConnect(ctx, el.dataset.platform);
			case "plat-sync": this._closeMenus(root); return ctx.PP?.sync(ctx, el.dataset.platform);
			case "plat-sync-game": this._closeMenus(root); return ctx.PP?.syncGame(ctx, el.dataset.platform, path);
			case "plat-disconnect": return ctx.PP?.disconnect(ctx, el.dataset.platform);
			case "plat-import": return ctx.PP?.importGames(ctx, el.dataset.platform, el.dataset.id || null);
			case "plat-import-list": return ctx.PP?.openImportList(ctx, el.dataset.platform);
			case "secrets-wipe": {
				const ok = await this.confirm({ title: "Apagar tudo deste dispositivo?", text: "Remove a Web API Key do RetroAchievements guardada neste aparelho. As fichas e o que já foi sincronizado continuam; para usar de novo, conecte outra vez.", confirm: "Apagar", danger: true });
				if (!ok || !ctx.PL) return;
				const clean = ctx.PL.wipeSecrets();
				this.toast(clean ? "Nenhuma chave ou autorização ficou neste dispositivo" : "Algumas chaves não puderam ser apagadas", { tone: clean ? "ok" : "warn", icon: "lock" });
				return setTimeout(() => this.refresh(), 250);
			}
			case "hub-open": ctx.U._store("hubTab", el.dataset.tab || "all"); return this.open("Dashboard/Conquistas", ctx);
			case "ach-migrate": {
				if (!ctx.A) return;
				const n = ctx.A.legacyCount();
				if (!n) return this.toast("Todas as notas já usam origem e sincronização", { tone: "ok", icon: "check" });
				const ok = await this.confirm({ title: "Migrar conquistas?", text: `${ctx.U.plural(n, "jogo recebe", "jogos recebem")} achievementProvider e achievementSync (deduzidos de achievementSource, gameType e dos IDs). Os campos antigos saem das notas.`, confirm: "Migrar" });
				if (!ok) return;
				const done = await ctx.A.migrateAll();
				this.toast(`${ctx.U.plural(done, "nota migrada", "notas migradas")}`, { tone: "ok", icon: "check" });
				return setTimeout(() => this.refresh(), 250);
			}
			case "steam-clear": {
				const ok = await this.confirm({ title: "Limpar cache da Steam?", text: "Remove o cache do perfil e da lista de jogos. Conquistas e tempos já gravados nas notas continuam.", confirm: "Limpar cache" });
				if (!ok) return;
				await S.clearCache();
				this.toast("Cache da Steam limpo", { tone: "ok" });
				return this.refresh();
			}
			case "repair-names": {
				if (!L?.repairEscapedFilenames) return this.toast("Editor herdado indisponível", { tone: "warn" });
				const t = this.toast("Reparando nomes de arquivo…", { sticky: true });
				try { await L.repairEscapedFilenames({ notify: false }); t.update("Nomes verificados", { tone: "ok" }); }
				catch (err) { t.update(`Falha: ${err.message}`, { tone: "error" }); }
				t.close(3000);
				return;
			}
		}
		void C; void e;
	}

	// ----------------------------------------------------------- busca
	// No celular a busca é um botão redondo; tocar abre o campo por cima
	// do topo da tela (com teclado e resultados). Fechar volta ao botão.
	_openSearch(root) {
		this._closeMenus(root);
		root.classList.add("is-search-open");
		const input = root.querySelector(".sv-search-input");
		requestAnimationFrame(() => input?.focus());
	}

	_closeSearch(root) {
		root.classList.remove("is-search-open");
		const input = root.querySelector(".sv-search-input");
		const box = root.querySelector(".sv-search-results");
		if (input) { input.value = ""; input.blur(); }
		if (box) { box.hidden = true; box.innerHTML = ""; }
	}

	// ------------------------------------------ imagem no topo da tela
	// Fichas de jogo sempre têm imagem no topo (arte, capa desfocada ou o
	// fundo gerado). Coleções, plataformas, gêneros, perfil Steam e página
	// de conquista só contam quando a imagem de fundo existe e carregou.
	_markTopImage(root) {
		const first = root.querySelector(".sv-content > .sv-page > :first-child");
		const set = on => root.classList.toggle("has-top-image", !!on);
		if (!first) return set(false);
		if (first.matches(".sv-hero, .sv-herocar, .sv-idhero")) return set(true);
		// 3.26.4: o fundo do Perfil do jogador também sobe por trás da barra de status
		const img = first.matches(".sv-ehero, .sv-phero, .sv-achhero, .sv-pf-hero")
			? first.querySelector(".sv-ehero-art img, .sv-phero-art img, img.sv-achhero-bg, .sv-pf-banner img") : null;
		if (!img) return set(false);
		if (img.complete) return set(img.naturalWidth > 0);
		set(true);
		img.addEventListener("error", () => set(false), { once: true });
	}

	// ------------------------------------------------- Obsidian mobile
	// Marca no <body> se a aba ativa é uma tela da Game Library. O CSS usa
	// isso para ocultar a barra inferior do Obsidian (opção do Style
	// Settings) só aqui — nas notas comuns ela volta sozinha.
	_markScreen() {
		const on = !!document.querySelector(".workspace-leaf.mod-active .sv-layer, .workspace-leaf.mod-active .sv-app")
			|| (!document.querySelector(".workspace-leaf.mod-active") && !!document.querySelector(".sv-layer"));
		const b = document.body.classList;
		if (b.contains("sv-on-screen") !== on) b.toggle("sv-on-screen", on);
		if (!on && b.contains("sv-app-paused")) b.remove("sv-app-paused");
	}

	_obsidian(cmd) {
		const run = (...ids) => {
			for (const id of ids) { try { if (app.commands?.executeCommandById?.(id)) return true; } catch (_) {} }
			return false;
		};
		switch (cmd) {
			case "back": return run("app:go-back");
			case "forward": return run("app:go-forward");
			case "search": return run("global-search:open", "switcher:open");
			case "new": return run("file-explorer:new-file", "app:new-file");
			case "sidebar":
				try { const L = app.workspace.leftSplit; if (L?.collapsed === false) L.collapse?.(); else if (L?.expand) L.expand(); else run("app:toggle-left-sidebar"); }
				catch (_) { run("app:toggle-left-sidebar"); }
				return;
			case "navbar":
				document.body.classList.add("sv-app-paused");
				// recalcula as áreas reservadas, agora que cabeçalho e barra voltaram
				requestAnimationFrame(() => { for (const h of window.__svHosts || []) h.__svApply?.(); });
				this.toast("Controles do Obsidian visíveis até você trocar de tela", { icon: "rows" });
				return;
			case "edit": return run("markdown:toggle-preview");
		}
	}

	// ---------------------------------------------------------- brilho
	_shineOn() {
		const b = document.body.classList;
		return !b.contains("sv-no-shine") && !b.contains("sv-reduced-motion") && !matchMedia("(prefers-reduced-motion: reduce)").matches;
	}

	// liga a animação uma vez (reiniciando se já estava rodando) e limpa depois
	_shine(el, cls = "is-shine", ms = 700) {
		if (!this._shineOn()) return;
		clearTimeout(el.__svShineT);
		el.classList.remove("is-shine", "is-shine-slow");
		requestAnimationFrame(() => {
			el.classList.add(cls);
			el.__svShineT = setTimeout(() => el.classList.remove(cls), ms + 80);
		});
	}

	// brilho de entrada na capa do hero, depois que a imagem carrega (uma vez)
	_heroShine(root) {
		const el = root.querySelector(".sv-hero-cover");
		if (!el || !this._shineOn()) return;
		const img = el.querySelector("img");
		const go = () => setTimeout(() => el.isConnected && this._shine(el, "is-shine-slow", 1100), 450);
		if (!img || (img.complete && img.naturalWidth)) go();
		else { img.addEventListener("load", go, { once: true }); img.addEventListener("error", go, { once: true }); }
	}

	// -------------------------------------------------------- movimento
	// Camada de acabamento: seções que entram ao aparecer, números que
	// contam, barras e anéis que se desenham, inclinação 3D e luz que segue
	// o mouse. Regras de custo, as mesmas do brilho:
	//   · só transform/opacity (e translate/scale) animam → compositor da GPU
	//   · nada em loop: cada efeito roda uma vez, quando o elemento aparece
	//     (IntersectionObserver — nenhum trabalho no evento de rolagem)
	//   · re-render da mesma tela não reanima nada
	//   · "Reduzir animações" ou a preferência do sistema desligam tudo
	// --------------------------------------------- carrossel de destaques
	// Trilha [cópia do último] [1 … n] [cópia do primeiro], movida por
	// transform. Troca a cada 5 s; pausa com o ponteiro em cima, durante o
	// arraste, com a aba oculta ou fora da tela, e não roda com "Reduzir
	// animações". Ao terminar a transição numa cópia, salta sem animação
	// para o card real — loop sem quebra.
	_wireHeroCarousel(root, surface) {
		const car = root.querySelector("[data-herocar]");
		if (!car) return;
		const track = car.querySelector("[data-herocar-track]");
		const slides = [...track.children];
		const n = slides.length - 2;
		if (n < 2) return;
		// 3.58.0: intervalo e reprodução automática vêm da Personalização
		const hl = this.mods().U.layout?.().home || {};
		const DELAY = (Number(hl.interval) || 5) * 1000, DUR = 620, AUTO = hl.autoplay !== "off";
		const dots = [...car.querySelectorAll("[data-herocar-dot]")];
		const motion = this._motionOn() && AUTO;
		const animate_ = this._motionOn();
		let due = 0, held = null;
		// 3.68.0: a largura vem do ResizeObserver (sem medir na montagem, o que
		// forçava o layout); o trilho se move em % da própria largura = a do carrossel
		let pos = 1 + ((window.__svHeroIdx ?? 0) % n), w = 0, timer = 0, hover = false, visible = true, dragging = false, scrolling = false, scrollIdle = 0;
		const W = () => (w > 1 ? w : (w = car.clientWidth || 1));
		const real = () => (pos - 1 + n) % n;
		const place = (animate, dx = 0) => {
			track.style.transition = animate && animate_ ? `transform ${DUR}ms cubic-bezier(.22,.8,.26,1)` : "none";
			track.style.transform = dx ? `translate3d(calc(${-pos * 100}% + ${dx}px), 0, 0)` : `translate3d(${-pos * 100}%, 0, 0)`;
		};
		const mark = () => {
			const i = real();
			window.__svHeroIdx = i;
			dots.forEach((d, k) => { const on = k === i; d.classList.toggle("is-active", on); d.setAttribute("aria-selected", String(on)); });
			slides.forEach((s, k) => { const on = k === pos; s.classList.toggle("is-current", on); if (!s.hasAttribute("data-clone")) { s.toggleAttribute("inert", !on); s.setAttribute("aria-hidden", String(!on)); } });
			car.style.setProperty("--sv-herocar-cycle", `${DELAY}ms`);
			// recomeça a barrinha trocando o nome da animação (sem forçar layout)
			car.classList.toggle("is-alt");
			car.classList.toggle("is-ticking", !!timer);
		};
		// só o card atual fica desenhado com o carrossel parado; os vizinhos
		// aparecem durante o arraste e a transição (menos memória de GPU)
		let movingT = 0;
		const moving = on => { clearTimeout(movingT); if (car.classList.contains("is-moving") !== on) car.classList.toggle("is-moving", on); };
		const settle = () => {
			if (pos === 0) { pos = n; place(false); }
			else if (pos === n + 1) { pos = 1; place(false); }
			mark();
			if (!dragging) moving(false);
		};
		const go = (to, animate = true) => {
			const anim = animate && animate_;
			if (anim) moving(true);
			pos = to; place(animate); mark();
			if (!anim) settle();
			else movingT = setTimeout(settle, DUR + 80); // garantia, caso o transitionend não chegue
			schedule();
		};
		track.addEventListener("transitionend", e => { if (e.target === track && e.propertyName === "transform") settle(); });
		const canPlay = () => motion && !hover && !dragging && !scrolling && visible && !document.hidden && car.isConnected;
		// classes só mudam quando o estado muda (nada de recalcular estilo à toa)
		const setTick = on => { if (car.classList.contains("is-ticking") !== on) { car.classList.toggle("is-ticking", on); car.classList.toggle("is-paused", !on); } };
		const onScreen = () => {
			const r = car.getBoundingClientRect(), h = (surface?.scroller || document.documentElement).clientHeight || window.innerHeight;
			const top = surface?.scroller ? surface.scroller.getBoundingClientRect().top : 0;
			return r.bottom - top > r.height * 0.35 && r.top - top < h - r.height * 0.35;
		};
		const fire = () => {
			timer = 0;
			visible = onScreen();
			if (!visible && !document.hidden && car.isConnected) { arm(1000); return; }
			if (canPlay()) return go(pos + 1);
			// rolando a página: espera a rolagem parar e troca em seguida
			if (scrolling && motion && !hover && !dragging && visible && !document.hidden && car.isConnected) { arm(400); return; }
			schedule();
		};
		const arm = ms => { due = performance.now() + ms; timer = setTimeout(fire, ms); };
		const schedule = () => {
			clearTimeout(timer); timer = 0;
			held = null; car.classList.remove("is-hold");
			if (!car.isConnected) return stop();
			if (motion && !hover && !dragging && visible && !document.hidden) arm(DELAY);
			setTick(!!timer);
		};
		const stop = () => { clearTimeout(timer); timer = 0; ro?.disconnect(); document.removeEventListener("visibilitychange", onVis); scroller?.removeEventListener("scroll", onScroll); };

		// botões e pontos
		car.querySelector("[data-herocar-prev]")?.addEventListener("click", () => go(pos - 1));
		car.querySelector("[data-herocar-next]")?.addEventListener("click", () => go(pos + 1));
		dots.forEach((d, k) => d.addEventListener("click", () => go(k + 1)));
		car.addEventListener("keydown", e => {
			if (e.key === "ArrowRight") { e.preventDefault(); go(pos + 1); }
			else if (e.key === "ArrowLeft") { e.preventDefault(); go(pos - 1); }
		});
		// mouse em cima / foco dentro: pausa (dá tempo de ler e clicar)
		car.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") { hover = true; schedule(); } });
		car.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") { hover = false; schedule(); } });
		car.addEventListener("focusin", () => { hover = true; schedule(); });
		car.addEventListener("focusout", e => { if (!car.contains(e.relatedTarget)) { hover = false; schedule(); } });

		// arrastar (mouse e toque). Toque vertical fica com a rolagem da página.
		let x0 = 0, y0 = 0, t0 = 0, dx = 0, axis = null, pid = null, moved = false;
		const layerLeft = () => (surface?.el || root).getBoundingClientRect().left;
		track.addEventListener("pointerdown", e => {
			if (e.button !== 0 || pid !== null) return;
			if (e.pointerType !== "mouse" && e.clientX - layerLeft() <= 20) return; // borda: gesto de voltar
			if (e.target.closest("button, input, select, textarea, .sv-menu")) return;
			pid = e.pointerId; x0 = e.clientX; y0 = e.clientY; t0 = performance.now(); dx = 0; axis = null; moved = false;
			if (pos === 0 || pos === n + 1) settle();
		});
		track.addEventListener("pointermove", e => {
			if (e.pointerId !== pid) return;
			const mx = e.clientX - x0, my = e.clientY - y0;
			if (!axis) {
				if (Math.abs(mx) < 6 && Math.abs(my) < 6) return;
				axis = Math.abs(mx) > Math.abs(my) ? "x" : "y";
				if (axis === "y") { pid = null; return; }
				dragging = true; moved = true; moving(true); schedule();
				try { track.setPointerCapture(pid); } catch (_) {}
				car.classList.add("is-dragging");
			}
			// resistência suave além de um card de distância
			const cw = W();
			dx = Math.abs(mx) > cw ? Math.sign(mx) * (cw + (Math.abs(mx) - cw) * 0.25) : mx;
			place(false, dx);
		});
		const release = e => {
			if (e.pointerId !== pid) return;
			pid = null;
			if (!dragging) return;
			dragging = false; car.classList.remove("is-dragging");
			const v = dx / Math.max(1, performance.now() - t0);
			const step = Math.abs(dx) > W() * 0.18 || Math.abs(v) > 0.45 ? (dx < 0 ? 1 : -1) : 0;
			if (step) this._haptic?.(8);
			go(pos + step);
		};
		track.addEventListener("pointerup", release);
		track.addEventListener("pointercancel", release);
		// depois de arrastar, o "clique" que o navegador gera não abre a ficha
		car.addEventListener("click", e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
		track.addEventListener("dragstart", e => e.preventDefault());

		// tamanho, visibilidade e aba oculta
		const ro = typeof ResizeObserver === "function" ? new ResizeObserver(() => { const nw = car.clientWidth; if (nw && nw !== w) { w = nw; place(false); } }) : null;
		ro?.observe(car);
		const onVis = () => schedule();
		document.addEventListener("visibilitychange", onVis);
		// enquanto a página rola, não troca de card (a troca disputaria os
		// quadros com a rolagem); volta a contar logo que a rolagem para
		const scroller = surface?.scroller || null;
		// a barrinha do tempo congela junto (sem animação rodando durante a
		// rolagem) e continua de onde parou
		const onScroll = () => {
			if (!car.isConnected) return stop();
			if (!scrolling && timer && held === null) {
				held = Math.max(0, due - performance.now());
				clearTimeout(timer); timer = 0;
				car.classList.add("is-hold");
			}
			scrolling = true;
			clearTimeout(scrollIdle);
			scrollIdle = setTimeout(() => {
				scrolling = false;
				if (held === null) return;
				const rest = held; held = null;
				car.classList.remove("is-hold");
				if (car.isConnected && motion && !hover && !dragging && !document.hidden) arm(rest);
				else schedule();
			}, 700);
		};
		scroller?.addEventListener("scroll", onScroll, { passive: true });

		slides[pos]?.setAttribute("data-intro", "");
		place(false); mark(); schedule();
	}

	_motionOn() {
		return !document.body.classList.contains("sv-reduced-motion") && !matchMedia("(prefers-reduced-motion: reduce)").matches;
	}

	_tiltOn() { return this._motionOn() && !document.body.classList.contains("sv-no-tilt"); }

	_wireMotion(root, surface, refresh) {
		surface.el.__svIO?.disconnect();
		surface.el.__svIO = null;
		if (refresh || !this._motionOn() || typeof IntersectionObserver !== "function") return;
		let counts = [], draws = [];
		try {
			// blocos que entram ao aparecer: itens de grade (um a um) ou, se o
			// bloco não tem grade dentro, o bloco inteiro — nunca os dois
			const inner = ".sv-grid > .sv-card, .sv-vitrines > *, .sv-platforms > *, .sv-genres > *, .sv-statgrid > *, .sv-steamcases > *, .sv-smart > *, .sv-settings > *, .sv-awards > *, .sv-tiers > .sv-tier, .sv-franchise, .sv-fcards > *, .sv-pcards > *, .sv-gtiles > *, .sv-hls > *";
			const outer = ".sv-content .sv-pad > :not(.sv-panel):not([data-steam-picks]):not([data-ra-strip]):not(:empty)";
			const reveal = new Set(root.querySelectorAll(inner));
			root.querySelectorAll(outer).forEach(el => { if (!el.querySelector(inner)) reveal.add(el); });
			counts = [...root.querySelectorAll(".sv-figure dd, .sv-hero-stats > :not(.sv-hero-rating) b, .sv-insight b, .sv-cabinet-ring b")].filter(el => !el.closest(".sv-herocar") && this._numPrep(el));
			draws = [...root.querySelectorAll(".sv-progress, .sv-bar-track, .sv-genre-share, .sv-stackbar, .sv-heatmap, .sv-ring")];
			if (!reveal.size && !counts.length && !draws.length) return;

			root.classList.add("sv-motion");
			reveal.forEach(el => el.classList.add("sv-reveal"));
			draws.forEach(el => {
				const f = el.matches(".sv-ring") ? el.querySelector(".sv-ring-fill") : null;
				if (f) { f.style.transition = "none"; f.style.strokeDashoffset = f.getAttribute("stroke-dasharray") || ""; }
			});

			const pending = new Set([...reveal, ...counts, ...draws]);
			// toque: o que aparece no meio de uma rolagem já chega pronto (sem
			// contar números nem desenhar o anel quadro a quadro, que disputariam
			// os quadros com a rolagem); a entrada suave dos blocos continua
			const touch = root.classList.contains("is-touch");
			const scrollEl = surface.layer ? surface.el : window;
			let lastScroll = -1e9;
			if (touch) {
				if (surface.el.__svMotionScroll) scrollEl.removeEventListener("scroll", surface.el.__svMotionScroll);
				surface.el.__svMotionScroll = () => { lastScroll = performance.now(); };
				scrollEl.addEventListener("scroll", surface.el.__svMotionScroll, { passive: true });
			}
			const io = new IntersectionObserver(entries => {
				if (!root.isConnected) { io.disconnect(); return; }
				const moving = touch && performance.now() - lastScroll < 250;
				let n = 0;
				for (const en of entries) {
					if (!en.isIntersecting) continue;
					io.unobserve(en.target);
					pending.delete(en.target);
					if (moving && this._settleNow(en.target)) continue;
					this._play(en.target, n++);
				}
			}, { root: surface.layer ? surface.el : null, rootMargin: "0px 0px -4% 0px" });
			pending.forEach(el => io.observe(el));
			surface.el.__svIO = io;

			// rede de segurança: nada que já está na tela fica escondido
			setTimeout(() => {
				if (!root.isConnected || !pending.size) return;
				const view = (surface.layer ? surface.el : document.documentElement).getBoundingClientRect();
				for (const el of pending) {
					const r = el.getBoundingClientRect();
					if (r.width && r.bottom > view.top && r.top < view.bottom) { io.unobserve(el); pending.delete(el); this._play(el, 0); }
				}
			}, 2500);
		} catch (err) {
			// qualquer falha: tudo volta ao estado final, sem animação
			root.classList.remove("sv-motion");
			counts.forEach(el => { if (el.__svNum) { el.__svNum.node.nodeValue = el.__svNum.text; el.__svNum = null; } });
			draws.forEach(el => { const f = el.querySelector?.(".sv-ring-fill"); if (f) { f.style.transition = ""; f.style.strokeDashoffset = ""; } });
			console.warn("Game Library: animações de entrada desligadas", err);
		}
	}

	// estado final imediato para números e anéis (true se tratou o elemento)
	_settleNow(el) {
		if (el.__svNum) { el.__svNum.node.nodeValue = el.__svNum.text; el.__svNum = null; return true; }
		if (el.matches(".sv-ring")) {
			const f = el.querySelector(".sv-ring-fill");
			if (f) { f.style.transition = "none"; f.style.strokeDashoffset = ""; requestAnimationFrame(() => { f.style.transition = ""; }); }
			return true;
		}
		return false;
	}

	_play(el, n) {
		if (el.__svNum) return this._countUp(el);
		if (el.classList.contains("sv-reveal")) {
			const d = Math.min(n, 8) * 50;
			el.style.setProperty("--sv-d", `${d}ms`);
			el.classList.add("is-inview");
			// terminada a entrada, o elemento volta às próprias transições
			setTimeout(() => el.classList.remove("sv-reveal"), 900 + d);
			return;
		}
		if (el.matches(".sv-ring")) {
			const f = el.querySelector(".sv-ring-fill");
			if (f) { f.style.transition = ""; f.style.strokeDashoffset = ""; }
			return;
		}
		el.classList.add("is-drawn");
	}

	// número no início do texto (formato pt-BR: 1.234,5): prepara a contagem
	// e começa em zero; o texto final volta exatamente como era
	_numPrep(el) {
		const node = el.firstChild;
		if (!node || node.nodeType !== 3) return false;
		const m = /^(\s*)(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?([\s\S]*)$/.exec(node.nodeValue);
		if (!m) return false;
		const value = Number(`${m[2].replace(/\./g, "")}.${m[3] || "0"}`);
		const dec = m[3] ? m[3].length : 0;
		// valores pequenos não ganham nada contando; anos não são contagens
		if (!(value >= 2) || (!dec && !m[4].trim() && value >= 1900 && value <= 2100)) return false;
		el.__svNum = { node, text: node.nodeValue, lead: m[1], tail: m[4], value, dec };
		node.nodeValue = `${m[1]}${this._numFmt(0, dec)}${m[4]}`;
		return true;
	}

	// um formatador por número de casas (toLocaleString criava um a cada quadro)
	_numFmt(v, dec) {
		const f = (this.__numFmts ||= {})[dec] ||= new Intl.NumberFormat("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
		return f.format(v);
	}

	_countUp(el) {
		const n = el.__svNum;
		if (!n) return;
		el.__svNum = null;
		const t0 = performance.now(), dur = n.value > 40 ? 1000 : 750;
		const step = t => {
			if (!n.node.isConnected) return;
			const p = Math.min(1, (t - t0) / dur);
			if (p >= 1) { n.node.nodeValue = n.text; return; }
			const e = 1 - Math.pow(1 - p, 3);
			const v = n.dec ? n.value * e : Math.round(n.value * e);
			n.node.nodeValue = `${n.lead}${this._numFmt(v, n.dec)}${n.tail}`;
			requestAnimationFrame(step);
		};
		requestAnimationFrame(step);
	}

	// Mouse (só ponteiro fino): capas inclinam em 3D com um reflexo que
	// acompanha o cursor; cards de coleção/plataforma/gênero/oferta ganham
	// uma luz suave sob o cursor. Um listener por tela; no máximo uma
	// escrita de variáveis CSS por quadro, só no elemento sob o mouse.
	_wirePointerFx(root) {
		if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
		const TILT = ".sv-card-art, .sv-hero-cover .sv-cover";
		const SPOT = ".sv-vitrine, .sv-platform, .sv-genre, .sv-pick, .sv-smart-item";
		const PROPS = ["--sv-rx", "--sv-ry", "--sv-mx", "--sv-my"];
		let cur = null, tilt = false, raf = 0, x = 0, y = 0;
		const reset = () => {
			if (cur) PROPS.forEach(p => cur.style.removeProperty(p));
			cur = null;
		};
		const frame = () => {
			raf = 0;
			if (!cur || !cur.isConnected) return;
			// centro pelo retângulo (a rotação o preserva) e tamanho pelo
			// layout (sem a inclinação) → sem realimentação entre quadros
			const r = cur.getBoundingClientRect(), w = cur.offsetWidth, h = cur.offsetHeight;
			if (!w || !h) return;
			const px = Math.min(1, Math.max(0, (x - (r.left + r.width / 2)) / w + 0.5));
			const py = Math.min(1, Math.max(0, (y - (r.top + r.height / 2)) / h + 0.5));
			cur.style.setProperty("--sv-mx", `${(px * 100).toFixed(1)}%`);
			cur.style.setProperty("--sv-my", `${(py * 100).toFixed(1)}%`);
			if (tilt && this._tiltOn()) {
				cur.style.setProperty("--sv-rx", `${((0.5 - py) * 10).toFixed(2)}deg`);
				cur.style.setProperty("--sv-ry", `${((px - 0.5) * 12).toFixed(2)}deg`);
			}
		};
		root.addEventListener("pointermove", e => {
			if (e.pointerType !== "mouse") return;
			const el = e.target.closest?.(`${TILT}, ${SPOT}`) || null;
			if (el !== cur) {
				reset();
				if (el && root.contains(el)) { cur = el; tilt = el.matches(TILT); }
			}
			if (!cur) return;
			x = e.clientX; y = e.clientY;
			if (!raf) raf = requestAnimationFrame(frame);
		}, { passive: true });
		root.addEventListener("pointerleave", reset, { passive: true });
	}

	// --------------------------------------------------------- toque
	// Celular primeiro: vibração curta nos toques que mudam algo (favoritar,
	// trocar de aba ou filtro, abrir o menu, dispensar janela/aviso) e a
	// seção da ficha que desliza na direção da aba escolhida.
	_haptic(ms = 8) {
		const b = document.body.classList;
		if (b.contains("sv-no-haptics") || !(b.contains("is-mobile") || matchMedia("(hover: none)").matches)) return;
		try {
			const H = window.Capacitor?.Plugins?.Haptics;
			if (H?.impact) { H.impact({ style: ms > 12 ? "MEDIUM" : "LIGHT" }).catch?.(() => {}); return; }
			navigator.vibrate?.(ms);
		} catch (_) {}
	}

	_wireTouchFx(root) {
		const tabs = [...root.querySelectorAll(".sv-tabs--game .sv-tab")];
		let idx = Math.max(0, tabs.findIndex(t => t.classList.contains("is-active")));
		root.addEventListener("click", e => {
			const t = e.target.closest?.(".sv-tabs--game .sv-tab, .sv-segmented > button, .sv-viewtoggle button, .sv-picks-stores > button");
			if (!t || !root.contains(t)) return;
			if (t.matches(".sv-tab")) {
				// roda depois do clique da aba (painel já trocado, animação
				// ainda não calculada): informa de que lado a seção entra
				const n = tabs.indexOf(t);
				if (n >= 0 && n !== idx) root.style.setProperty("--sv-tab-dir", n > idx ? "1" : "-1");
				if (n >= 0) idx = n;
			}
			this._haptic();
		});
	}

	// arrastar para dispensar: `el` segue o dedo no eixo `axis` ("x" ou "y")
	// só no sentido `sign` (+1/-1); passou do limite (ou gesto rápido) →
	// onDismiss(), senão volta ao lugar. O toque que começa em algo que
	// rola, campo de texto ou faixa lateral não vira gesto.
	_swipe(handle, el, { axis = "y", sign = 1, limit = 90, onDismiss, onMove = null }) {
		let sx = 0, sy = 0, t0 = 0, d = 0, active = null;
		const reset = () => { el.style.transition = ""; el.style.transform = ""; onMove?.(0); };
		handle.addEventListener("touchstart", e => {
			if (e.touches.length !== 1 || e.target.closest("input, textarea, select, .sv-shelf-track, .sv-tabs, .sv-segmented")) { active = false; return; }
			const t = e.touches[0]; sx = t.clientX; sy = t.clientY; t0 = performance.now(); d = 0; active = null;
		}, { passive: true });
		handle.addEventListener("touchmove", e => {
			if (active === false) return;
			const t = e.touches[0], dx = t.clientX - sx, dy = t.clientY - sy;
			const main = axis === "y" ? dy : dx, cross = axis === "y" ? dx : dy;
			if (active === null) {
				if (Math.abs(main) < 8 && Math.abs(cross) < 8) return;
				active = Math.abs(main) > Math.abs(cross) && main * sign > 0;
				if (!active) return;
				el.style.transition = "none";
			}
			d = Math.max(0, main * sign);
			el.style.transform = axis === "y" ? `translateY(${d}px)` : `translateX(${d * sign}px)`;
			onMove?.(d);
		}, { passive: true });
		const end = () => {
			if (!active) { active = null; return; }
			active = null;
			const v = d / Math.max(1, performance.now() - t0);
			if (d > limit || (v > 0.6 && d > 24)) {
				this._haptic();
				// a saída continua do ponto em que o dedo soltou
				el.style.transition = "";
				requestAnimationFrame(() => { el.style.transform = ""; onDismiss(); });
			} else reset();
		};
		handle.addEventListener("touchend", end, { passive: true });
		handle.addEventListener("touchcancel", end, { passive: true });
	}

	// ------------------------------------------------ gestos de tela
	// Celular: puxar o topo para baixo sincroniza (Início, telas Steam e RA);
	// deslizar a partir da borda esquerda volta à tela anterior. Os
	// ouvintes ficam na camada (que sobrevive às trocas de tela) e leem a
	// tela atual em cada toque; indicadores só animam transform/opacity.
	_wireGestures(root, surface, ctx) {
		if (!surface.layer) return;
		const layer = surface.el;
		layer.__svScreen = { root, ctx };
		if (layer.__svGestures) return;
		layer.__svGestures = true;
		const PULL = 70, EDGE = 20, BACK = 90;
		let mode = null, x0 = 0, y0 = 0, d = 0, armed = false, busy = false;
		const cur = () => layer.__svScreen;
		const touchOk = () => { const r = cur()?.root; return r?.isConnected && r.classList.contains("is-touch") && r.querySelector(".sv-drawer")?.hidden !== false && !document.querySelector(".sv-modal-root, .sv-stories"); };
		const indicator = cls => {
			const r = cur().root;
			let el = r.querySelector(`:scope > .${cls}`);
			if (!el) { el = document.createElement("div"); el.className = cls; el.innerHTML = this.mods().U.icon(cls === "sv-ptr" ? "refresh" : "chevronLeft"); r.appendChild(el); }
			return el;
		};
		const pullAction = () => {
			const { root: r, ctx: c } = cur(), page = r.dataset.page || "";
			const steam = c.S.getConfig().configured, ra = !!c.R?.getConfig?.().configured;
			if (/^retro/.test(page)) return ra ? this.raSyncAll(c, false) : this.raConnect(c);
			if (/^steam-/.test(page)) return steam ? this.steamSyncAll(c, false) : this.steamConnect(c);
			if (page === "home") {
				const jobs = [];
				if (steam) jobs.push(this.steamSyncAll(c, false));
				if (ra) jobs.push(this.raSyncAll(c, false));
				if (jobs.length) return Promise.allSettled(jobs);
			}
			this.refresh();
			this.toast("Tela atualizada", { icon: "refresh", tone: "ok" });
			return Promise.resolve();
		};
		const pullPage = () => /^(home|steam-|retro)/.test(cur()?.root?.dataset.page || "");
		// captura: a borda tem prioridade sobre prateleiras e abas que rolam
		layer.addEventListener("touchstart", e => {
			mode = null; armed = false; d = 0;
			if (e.touches.length !== 1 || !touchOk()) return;
			if (e.target.closest?.("[data-sv-drag], input[type=range]")) return;
			const t = e.touches[0], lr = layer.getBoundingClientRect();
			x0 = t.clientX; y0 = t.clientY;
			if (x0 - lr.left <= EDGE) { mode = "edge?"; e.stopPropagation(); return; }
			if (!busy && layer.scrollTop <= 0 && pullPage() && !e.target.closest(".sv-search, input, textarea, select")) mode = "pull?";
		}, { passive: true, capture: true });
		layer.addEventListener("touchmove", e => {
			if (!mode) return;
			const t = e.touches[0], dx = t.clientX - x0, dy = t.clientY - y0;
			if (mode === "edge?") {
				if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
				mode = dx > 0 && Math.abs(dx) > Math.abs(dy) ? "edge" : null;
				if (!mode) return;
			}
			if (mode === "pull?") {
				if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
				mode = dy > 0 && Math.abs(dy) > Math.abs(dx) && layer.scrollTop <= 0 ? "pull" : null;
				if (!mode) return;
			}
			if (mode === "edge") {
				e.stopPropagation();
				d = Math.max(0, dx);
				const el = indicator("sv-back"), p = Math.min(1, d / BACK);
				el.style.transform = `translate3d(${Math.min(d * 0.6, 64) - 48}px, -50%, 0) scale(${0.7 + p * 0.3})`;
				el.style.opacity = String(Math.min(1, p * 1.4));
				if (!armed && d >= BACK) { armed = true; el.classList.add("is-armed"); this._haptic(); }
				else if (armed && d < BACK) { armed = false; el.classList.remove("is-armed"); }
			} else if (mode === "pull") {
				if (layer.scrollTop > 0) return;
				e.stopPropagation();
				d = Math.max(0, dy) * 0.5;
				const el = indicator("sv-ptr");
				el.style.transform = `translate3d(-50%, ${Math.min(d, 96) - 56}px, 0) rotate(${d * 3}deg)`;
				el.style.opacity = String(Math.min(1, d / PULL));
				if (!armed && d >= PULL) { armed = true; el.classList.add("is-armed"); this._haptic(); }
				else if (armed && d < PULL) { armed = false; el.classList.remove("is-armed"); }
			}
		}, { passive: true, capture: true });
		const end = () => {
			const m = mode; mode = null;
			if (m === "edge") {
				const el = cur()?.root?.querySelector(":scope > .sv-back");
				if (el) { el.style.transform = ""; el.style.opacity = ""; el.classList.remove("is-armed"); }
				if (armed) this._goBack(cur());
			} else if (m === "pull") {
				const el = cur()?.root?.querySelector(":scope > .sv-ptr");
				if (!el) return;
				if (!armed) { el.style.transform = ""; el.style.opacity = ""; return; }
				busy = true;
				el.classList.remove("is-armed"); el.classList.add("is-busy");
				el.style.transform = "translate3d(-50%, 18px, 0)"; el.style.opacity = "1";
				Promise.resolve(pullAction()).catch(() => {}).finally(() => {
					busy = false;
					el.classList.remove("is-busy"); el.style.transform = ""; el.style.opacity = "";
				});
			}
			armed = false;
		};
		layer.addEventListener("touchend", end, { passive: true, capture: true });
		layer.addEventListener("touchcancel", end, { passive: true, capture: true });

		// Arrasto vertical dentro da Game Library é rolagem: não deixa chegar aos
		// gestos do Obsidian (puxar para baixo abre a paleta de comandos).
		// Enquanto o Obsidian decidia se era o gesto dele, o navegador segurava
		// a rolagem e depois soltava tudo de uma vez: a tela congelava e pulava.
		// O arrasto horizontal continua passando (barras laterais do Obsidian).
		let gx = 0, gy = 0, vertical = null;
		layer.addEventListener("touchstart", e => {
			vertical = null;
			if (e.touches.length !== 1 || e.target.closest?.("[data-sv-drag], input[type=range]")) return;
			gx = e.touches[0].clientX; gy = e.touches[0].clientY;
		}, { passive: true, capture: true }); // captura: abas e prateleiras param o touchstart delas
		layer.addEventListener("touchmove", e => {
			if (e.touches.length !== 1) return;
			if (vertical === null) {
				const dx = Math.abs(e.touches[0].clientX - gx), dy = Math.abs(e.touches[0].clientY - gy);
				if (Math.max(dx, dy) < 6) return e.stopPropagation(); // ainda indefinido
				vertical = dy >= dx;
				if (!vertical) return;
			}
			if (vertical) e.stopPropagation();
		}, { passive: true });
		layer.addEventListener("touchend", e => { if (vertical) e.stopPropagation(); vertical = null; }, { passive: true });
	}

	// voltar: histórico da aba do Obsidian; sem histórico, vai para o Início
	_goBack(screen) {
		const leaf = app.workspace.getMostRecentLeaf?.() || app.workspace.activeLeaf;
		const back = leaf?.history?.backHistory;
		if (Array.isArray(back) && !back.length) {
			if (screen?.root?.dataset.page !== "home") this.open("Dashboard/Home", screen?.ctx);
			return;
		}
		this._obsidian("back");
	}

	_smooth() { return document.body.classList.contains("sv-reduced-motion") ? "auto" : "smooth"; }

	_closeMenus(root) {
		root.querySelectorAll(".sv-menu:not([hidden])").forEach(m => {
			m.hidden = true;
			m.closest(".sv-menu-wrap")?.querySelector('[data-action="menu"]')?.setAttribute("aria-expanded", "false");
		});
	}

	// O menu fica dentro da camada do app, que é quem rola. Por isso ele é
	// posicionado na parte VISÍVEL da camada (não no início do conteúdo) e
	// a página por trás fica travada enquanto ele está aberto.
	_openDrawer(root) {
		const d = root.querySelector(".sv-drawer");
		if (!d) return;
		const layer = root.closest(".sv-layer");
		if (layer) {
			d.style.top = `${layer.scrollTop}px`;
			d.style.height = `${layer.clientHeight}px`;
			d.style.bottom = "auto";
			// a página por trás não rola enquanto o menu está aberto
			layer.classList.add("is-locked");
		}
		d.hidden = false;
		requestAnimationFrame(() => d.classList.add("is-open"));
		this._haptic();
		const panel = d.querySelector(".sv-drawer-panel"), back = d.querySelector(".sv-drawer-backdrop");
		if (panel && !d.__svSwipe) {
			d.__svSwipe = true;
			this._swipe(panel, panel, {
				axis: "x", sign: -1, limit: 80,
				onMove: px => { if (back) back.style.opacity = px ? String(Math.max(0, 1 - px / panel.offsetWidth)) : ""; },
				onDismiss: () => { if (back) back.style.opacity = ""; this._closeDrawer(root); }
			});
		}
		if (!root.classList.contains("is-touch")) d.querySelector(".sv-nav-item.is-active, .sv-nav-item")?.focus();
	}

	_closeDrawer(root) {
		const d = root.querySelector(".sv-drawer");
		if (!d || d.hidden) return;
		d.classList.remove("is-open");
		// Destrava a rolagem JÁ, enquanto a camada ainda é alcançável a
		// partir desta tela. Antes isso ficava para depois da animação: se o
		// toque no menu navegava para outra tela, a tela antiga já tinha
		// sido descartada, a camada não era encontrada e a trava ficava —
		// a tela nova abria sem rolar. (A trava não muda a posição de
		// rolagem, então não há nada a restaurar.)
		root.closest(".sv-layer")?.classList.remove("is-locked");
		setTimeout(() => {
			if (!d.isConnected) return;
			d.hidden = true;
			d.style.top = d.style.height = d.style.bottom = "";
		}, 220);
	}

	// --------------------------------------------------------------- abas
	// Faixas de abas que rolam para o lado: indicam quando há abas escondidas
	// e trazem a aba ativa para a área visível (ao abrir e ao tocar).
	_wireTabs(root) {
		root.querySelectorAll(".sv-tabs").forEach(tabs => {
			// dica visual de que há mais abas escondidas nas bordas
			const update = () => {
				const max = tabs.scrollWidth - tabs.clientWidth;
				tabs.classList.toggle("has-more-right", max > 2 && tabs.scrollLeft < max - 2);
				tabs.classList.toggle("has-more-left", max > 2 && tabs.scrollLeft > 2);
			};
			tabs.addEventListener("scroll", update, { passive: true });
			// só ao abrir: se a aba ativa estiver fora da vista, rola o mínimo
			// para mostrá-la (sem centralizar e sem mexer ao tocar nas abas)
			requestAnimationFrame(() => {
				const t = tabs.querySelector(".sv-tab.is-active");
				if (t) {
					const tr = tabs.getBoundingClientRect(), r = t.getBoundingClientRect();
					if (r.right > tr.right) tabs.scrollLeft += r.right - tr.right + 16;
					else if (r.left < tr.left) tabs.scrollLeft -= tr.left - r.left + 16;
				}
				update();
			});
		});
	}

	// 3.26.2: zonas de arrasto (barras de energia, controles deslizantes). O
	// toque nelas é só delas: não rola a página, não chega aos gestos do app
	// (puxar para atualizar, deslizar da borda) nem aos do Obsidian (abrir as
	// barras laterais) — antes, arrastar a barra deslocava a tela inteira.
	shieldDrag(scope) {
		scope.querySelectorAll?.("[data-sv-drag], input[type=range]").forEach(el => {
			if (el.__svShield) return;
			el.__svShield = true;
			const stop = e => e.stopPropagation();
			el.addEventListener("touchstart", stop, { passive: true });
			el.addEventListener("touchmove", e => { e.stopPropagation(); if (e.cancelable && el.matches("[data-sv-drag]")) e.preventDefault(); }, { passive: false });
			el.addEventListener("touchend", stop, { passive: true });
			el.addEventListener("touchcancel", stop, { passive: true });
		});
	}

	// Faixas que rolam para o lado (abas, prateleiras, filtros): o arrasto
	// horizontal fica com elas e não chega ao gesto do Obsidian de abrir as
	// barras laterais.
	_wireHorizontalScrollers(root) {
		const sel = ".sv-tabs, .sv-shelf-track, .sv-segmented, .sv-subnav, .sv-chiplinks--nav, .sv-saga, .sv-heatmap-wrap, .sv-hscroll, .sv-hubchips, .sv-herocar";
		root.querySelectorAll(sel).forEach(el => {
			let sx = 0, sy = 0, horizontal = null;
			el.addEventListener("touchstart", e => {
				const t = e.touches[0]; sx = t.clientX; sy = t.clientY; horizontal = null;
				if (el.scrollWidth > el.clientWidth + 1) e.stopPropagation();
			}, { passive: true });
			el.addEventListener("touchmove", e => {
				if (el.scrollWidth <= el.clientWidth + 1) return;
				const t = e.touches[0];
				if (horizontal === null) horizontal = Math.abs(t.clientX - sx) > Math.abs(t.clientY - sy);
				if (horizontal) e.stopPropagation();
			}, { passive: true });
			el.addEventListener("touchend", e => { if (horizontal) e.stopPropagation(); }, { passive: true });
		});
	}

	// prateleira montada depois da tela (ex.: Steam Picks): mesmo
	// comportamento das outras — setas, estado das setas e arrasto isolado
	_wireShelfEl(sec) {
		const track = sec.querySelector(".sv-shelf-track");
		if (!track) return;
		track.addEventListener("scroll", () => this._shelfStateSoon(sec), { passive: true });
		requestAnimationFrame(() => this._shelfState(sec));
		const tmp = { querySelectorAll: sel => sec.querySelectorAll(sel) };
		try { this._wireHorizontalScrollers(tmp); } catch (_) {}
	}

	// ----------------------------------------------------------- shelves
	_wireShelves(root) {
		root.querySelectorAll(".sv-shelf-track").forEach(track => {
			track.addEventListener("scroll", () => this._shelfStateSoon(track.closest(".sv-shelf")), { passive: true });
		});
	}

	// no máximo uma medição por quadro (cada uma força um layout)
	_shelfStateSoon(shelf) {
		if (!shelf || shelf.__svShelfRaf) return;
		shelf.__svShelfRaf = requestAnimationFrame(() => { shelf.__svShelfRaf = 0; this._shelfState(shelf); });
	}

	_shelfState(shelf) { this._shelfApply(shelf, this._shelfMeasure(shelf)); }
	_shelfMeasure(shelf) {
		const t = shelf?.querySelector(".sv-shelf-track");
		return t ? { max: t.scrollWidth - t.clientWidth - 2, left: t.scrollLeft } : null;
	}
	// só escreve o que mudou (cada escrita invalida o layout)
	_shelfApply(shelf, v) {
		if (!v) return;
		const set = (el, on) => { if (el && el.hasAttribute("disabled") !== on) el.toggleAttribute("disabled", on); };
		if (shelf.classList.contains("is-scrollable") !== v.max > 0) shelf.classList.toggle("is-scrollable", v.max > 0);
		set(shelf.querySelector('[data-action="shelf-prev"]'), v.left <= 2);
		set(shelf.querySelector('[data-action="shelf-next"]'), v.left >= v.max);
	}

	// ------------------------------------------------------------ imagens
	// fade-in quando a imagem carrega de verdade; imagem quebrada some e
	// deixa o fallback (tipográfico/gradiente) que já está por baixo
	// mapa de calor: abre mostrando os dias mais recentes (a direita), não o
	// começo do ano; no celular a faixa rola na horizontal
	_heatmapsToEnd(root) {
		requestAnimationFrame(() => root?.querySelectorAll?.(".sv-heatmap-wrap").forEach(w => { if (w.scrollWidth > w.clientWidth + 2 && w.getClientRects().length) w.scrollLeft = w.scrollWidth; }));
	}

	_imgFail(img) {
		if (img.classList.contains("is-broken")) return;
		img.classList.add("is-broken"); img.closest(".sv-cover")?.classList.add("is-missing");
		// ícone de conquista que não carregou: mostra o troféu no lugar de um quadro vazio
		const slot = img.parentElement;
		if (slot && !img.closest(".sv-cover") && /ach|hunt|medal|badge|trophy|ra-ach|rarest|showcase/.test(slot.className) && !slot.querySelector(":scope > svg.sv-i"))
			img.insertAdjacentHTML("beforebegin", customJS.SteamVaultUI.icon("trophy"));
	}

	_wireImages(root) {
		root.querySelectorAll("img[data-sv-img]").forEach(img => {
			const done = () => img.classList.add("is-loaded");
			if (img.complete && img.naturalWidth) done();
			else { img.addEventListener("load", done, { once: true }); img.addEventListener("error", () => this._imgFail(img), { once: true }); }
		});
		// 3.29.0: qualquer outra imagem da tela que falhar (sem internet, link
		// expirado) some em vez de mostrar o ícone de imagem quebrada
		if (!root.__svImgGuard) {
			root.__svImgGuard = true;
			root.addEventListener("error", e => { const t = e.target; if (t?.tagName === "IMG" && !t.hasAttribute("data-sv-img")) this._imgFail(t); }, true);
		}
		root.querySelectorAll("img:not([data-sv-img])").forEach(img => { if (img.complete && !img.naturalWidth && img.getAttribute("src")) this._imgFail(img); });
		root.querySelectorAll("img[data-accent-source]").forEach(img => {
			const hero = img.closest(".sv-hero");
			if (!hero || hero.style.getPropertyValue("--sv-accent")) return;
			const set = () => { const c = this._accentOf(img); if (c) hero.style.setProperty("--sv-accent", c); };
			// já calculada: na hora; senão fora do caminho da primeira pintura
			const apply = () => { if (window.__svAccent.has(img.currentSrc || img.src)) set(); else (window.requestIdleCallback ? requestIdleCallback(set, { timeout: 400 }) : setTimeout(set, 60)); };
			if (img.complete && img.naturalWidth) apply(); else img.addEventListener("load", apply, { once: true });
		});
	}

	// cor de destaque derivada da arte: média dos pixels mais saturados,
	// clareada para funcionar sobre fundo escuro. Cache por imagem.
	_accentOf(img) {
		const src = img.currentSrc || img.src;
		if (window.__svAccent.has(src)) return window.__svAccent.get(src);
		let out = "";
		try {
			const c = document.createElement("canvas");
			c.width = 32; c.height = 18;
			const g = c.getContext("2d", { willReadFrequently: true });
			g.drawImage(img, 0, 0, 32, 18);
			const d = g.getImageData(0, 0, 32, 18).data;
			let r = 0, gg = 0, b = 0, w = 0;
			for (let i = 0; i < d.length; i += 4) {
				const R = d[i], G = d[i + 1], B = d[i + 2];
				const max = Math.max(R, G, B), min = Math.min(R, G, B);
				const sat = max ? (max - min) / max : 0;
				const lum = (max + min) / 510;
				if (lum < 0.12 || lum > 0.92) continue;
				const wt = sat * sat + 0.02;
				r += R * wt; gg += G * wt; b += B * wt; w += wt;
			}
			if (w > 0) {
				const [h, s] = this._hsl(r / w, gg / w, b / w);
				out = `hsl(${Math.round(h)} ${Math.round(Math.min(78, Math.max(38, s * 100)))}% 62%)`;
			}
		} catch (_) { out = ""; } // canvas "tainted" → sem accent, fica o azul padrão
		window.__svAccent.set(src, out);
		return out;
	}

	_hsl(r, g, b) {
		r /= 255; g /= 255; b /= 255;
		const max = Math.max(r, g, b), min = Math.min(r, g, b);
		let h = 0; const l = (max + min) / 2;
		const d = max - min;
		const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
		if (d) {
			if (max === r) h = 60 * (((g - b) / d) % 6);
			else if (max === g) h = 60 * ((b - r) / d + 2);
			else h = 60 * ((r - g) / d + 4);
		}
		return [(h + 360) % 360, s, l];
	}

	// ------------------------------------------------------------ favorito
	// "Destacar na Home": entra (ou sai) do carrossel do topo da Home
	async _toggleFeatured(el, path) {
		const file = path && app.vault.getAbstractFileByPath(path);
		if (!file) return;
		const on = !el.dataset.on;
		try {
			await app.fileManager.processFrontMatter(file, fm => { fm.featuredOnHome = on; });
			this.toast(on ? "Em destaque na Home" : "Removido dos destaques da Home", { icon: "sparkles", tone: on ? "ok" : "" });
		} catch (err) {
			this.toast(`Não foi possível salvar: ${err.message}`, { tone: "error" });
		}
	}

	async _toggleFavorite(el, path, root) {
		const file = app.vault.getAbstractFileByPath(path);
		if (!file) return;
		const on = !(el.getAttribute("aria-pressed") === "true");
		if (on) this.sfx("fav");
		// resposta imediata; o arquivo é a verdade e o re-render confirma
		root.querySelectorAll(`[data-action="favorite"][data-path="${CSS.escape(path)}"]`).forEach(b => {
			b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", String(on));
			b.title = on ? "Remover dos favoritos" : "Favoritar";
			// coração "pulsa" uma vez ao favoritar (classe passageira: o
			// re-render que confirma o arquivo não repete a animação)
			if (on) this._haptic(14);
			if (on && this._motionOn()) {
				b.classList.remove("is-pop"); void b.offsetWidth; b.classList.add("is-pop");
				setTimeout(() => b.classList.remove("is-pop"), 700);
			}
		});
		try {
			await app.fileManager.processFrontMatter(file, fm => { fm.favorite = on; });
			this.toast(on ? "Adicionado aos favoritos" : "Removido dos favoritos", { icon: "heart", tone: on ? "ok" : "" });
		} catch (err) {
			this.toast(`Não foi possível salvar: ${err.message}`, { tone: "error" });
		}
	}

	// ============================================================== busca
	_searchIndex(ctx) {
		const { model, C } = ctx;
		if (window.__svSearchIndex?.built === model.builtAt) return window.__svSearchIndex.items;
		const items = [];
		for (const g of model.games) items.push({ kind: "game", label: g.title, sub: g.platform, path: g.path, key: C.normalizeKey(`${g.title} ${g.franchise} ${g.developer}`), g });
		for (const c of model.collections) items.push({ kind: "collection", label: c.title, sub: `${c.games.length} jogos`, path: c.path, key: C.normalizeKey(c.title) });
		for (const p of model.platforms) items.push({ kind: "platform", label: p.title, sub: "Plataforma", path: p.path, key: C.normalizeKey(p.title) });
		for (const p of model.genres) items.push({ kind: "genre", label: p.title, sub: "Gênero", path: p.path, key: C.normalizeKey(p.title) });
		for (const p of model.subgenres || []) items.push({ kind: "subgenre", label: p.title, sub: "Subgênero", path: p.path, key: C.normalizeKey(p.title) });
		for (const p of model.franchises || []) items.push({ kind: "franchise", label: p.title, sub: "Franquia", path: p.path, key: C.normalizeKey(p.title) });
		for (const g of model.games) for (const a of g.achievements) if (a.path) items.push({ kind: "achievement", label: a.name, sub: g.title, path: a.path, key: C.normalizeKey(a.name), a });
		window.__svSearchIndex = { built: model.builtAt, items };
		return items;
	}

	// ===================================================== efeitos sonoros (3.32.0)
	// Sons curtos gerados na hora (Web Audio): nada de arquivo, download ou
	// licença. Desligados por padrão; liga em Configurações › Aparência.
	// Tocam só em momentos que importam (conquista, zerado, nível, chefão,
	// missão, recompensa, sessão ao vivo, favorito) — nunca em toques comuns.
	_sfxOn() { return this.mods().U?._store("sfx") === "1"; }
	_sfxVol() { return ({ low: 0.14, mid: 0.26, high: 0.42 })[this.mods().U?._store("sfxVol") || "mid"] || 0.26; }
	_sfxCtx() {
		const AC = window.AudioContext || window.webkitAudioContext;
		if (!AC) return null;
		if (!window.__svAudio) { try { window.__svAudio = new AC(); } catch (_) { return null; } }
		const a = window.__svAudio;
		if (a.state === "suspended") a.resume?.().catch?.(() => {});
		return a;
	}
	// uma nota: frequência, início (s), duração (s), forma de onda, volume relativo
	_tone(a, out, f, t, d, type = "sine", v = 1, slideTo = 0) {
		const o = a.createOscillator(), g = a.createGain();
		o.type = type; o.frequency.setValueAtTime(f, a.currentTime + t);
		if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, a.currentTime + t + d);
		g.gain.setValueAtTime(0.0001, a.currentTime + t);
		g.gain.exponentialRampToValueAtTime(v, a.currentTime + t + 0.008);
		g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t + d);
		o.connect(g); g.connect(out);
		o.start(a.currentTime + t); o.stop(a.currentTime + t + d + 0.03);
	}
	sfx(name, { force = false } = {}) {
		if ((!force && !this._sfxOn()) || document.hidden) return;
		const a = this._sfxCtx();
		if (!a) return;
		// no máximo um som a cada 120 ms (evita empilhar ao clicar rápido)
		const now = performance.now();
		if (!force && now - (window.__svSfxLast || 0) < 120) return;
		window.__svSfxLast = now;
		try {
			const out = a.createGain(), lp = a.createBiquadFilter();
			lp.type = "lowpass"; lp.frequency.value = 7200;
			out.gain.value = this._sfxVol();
			out.connect(lp); lp.connect(a.destination);
			const T = (f, t, d, type, v, sl) => this._tone(a, out, f, t, d, type, v, sl);
			switch (name) {
				case "ach": T(1318.5, 0, 0.16, "triangle", 0.55); T(1975.5, 0.075, 0.42, "triangle", 0.5); T(3951, 0.075, 0.3, "sine", 0.1); break;
				case "ach-rare": T(1318.5, 0, 0.14, "triangle", 0.5); T(1975.5, 0.07, 0.4, "triangle", 0.5); T(2637, 0.16, 0.38, "sine", 0.28); T(3136, 0.24, 0.5, "sine", 0.22); T(3951, 0.32, 0.6, "sine", 0.12); break;
				case "perfect": [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => T(f, i * 0.085, 0.3, "triangle", 0.45)); [1046.5, 1318.5, 1568].forEach(f => T(f, 0.36, 0.9, "sine", 0.26)); T(2093, 0.4, 0.8, "sine", 0.1); break;
				case "complete": [392, 523.25, 659.25].forEach((f, i) => T(f, i * 0.09, 0.28, "triangle", 0.45)); [523.25, 659.25, 783.99].forEach(f => T(f, 0.28, 0.7, "sine", 0.26)); break;
				case "start": T(587.33, 0, 0.12, "sine", 0.45); T(880, 0.09, 0.24, "sine", 0.45); break;
				case "pause": T(783.99, 0, 0.12, "sine", 0.4); T(523.25, 0.09, 0.2, "sine", 0.36); break;
				case "resume": T(523.25, 0, 0.1, "sine", 0.36); T(783.99, 0.08, 0.18, "sine", 0.4); break;
				case "save": T(659.25, 0, 0.1, "triangle", 0.4); T(987.77, 0.08, 0.3, "triangle", 0.4); T(1318.5, 0.08, 0.3, "sine", 0.15); break;
				case "fav": T(1046.5, 0, 0.07, "sine", 0.35, 1568); break;
				default: T(880, 0, 0.1, "sine", 0.3);
			}
		} catch (_) {}
	}
	// momentos grandes descobertos entre um modelo e o seguinte (vale para o
	// que mudou por edição, sync ou outro aparelho): 100% e zerado
	_sfxDiff(model, M) {
		if (!model || window.__svSfxBuilt === model.builtAt) return;
		window.__svSfxBuilt = model.builtAt;
		const snap = { games: new Map(model.games.map(g => [g.path, { st: g.status, pf: !!g.ach?.perfect }])) };
		const prev = window.__svSfxSnap;
		window.__svSfxSnap = snap;
		if (!prev || !this._sfxOn()) return;
		let perfect = false, complete = false;
		for (const [p, v] of snap.games) { const o = prev.games.get(p); if (!o) continue; if (v.pf && !o.pf) perfect = true; if (v.st === "Completed" && o.st !== "Completed") complete = true; }
		const sound = perfect ? "perfect" : complete ? "complete" : "";
		if (sound) setTimeout(() => this.sfx(sound, { force: true }), 380);
	}

	// ===================================================== fila "A seguir" (3.31.0)
	// A ordem fica na própria ficha (upNext: 1, 2, 3…), então acompanha o
	// vault entre aparelhos e sobrevive a renomear arquivos.
	async _queueWrite(changes) {
		for (const [path, n] of changes) {
			const f = app.vault.getAbstractFileByPath(path);
			if (!f) continue;
			await app.fileManager.processFrontMatter(f, fm => { if (n) fm.upNext = n; else delete fm.upNext; });
		}
	}
	async _queueToggle(path, ctx) {
		const { C } = ctx;
		const g = ctx.model.gamesByPath.get(path);
		if (!g) return;
		const q = C.queue(ctx.model);
		try {
			if (g.upNext !== null) {
				await this._queueWrite([[path, 0], ...q.filter(x => x !== g).map((x, i) => [x.path, i + 1]).filter(([p, n]) => ctx.model.gamesByPath.get(p).upNext !== n)]);
				this.toast(`${g.title} saiu da fila`, { icon: "list" });
			} else {
				await this._queueWrite([[path, (q.length ? Math.max(...q.map(x => x.upNext)) : 0) + 1]]);
				this.toast(`${g.title} entrou na fila A seguir (${q.length + 1}º)`, { tone: "ok", icon: "list" });
			}
			C.invalidate(); setTimeout(() => this.refresh(), 150);
		} catch (err) { this.toast(`Não foi possível salvar: ${err.message}`, { tone: "error" }); }
	}
	_queueManage(ctx) {
		const { U, C, model } = ctx;
		let order = C.queue(model).map(g => g.path);
		const before = new Map(order.map((p, i) => [p, i + 1]));
		const removed = new Set();
		const candidates = () => model.games.filter(g => !order.includes(g.path) && ["Backlog", "Paused", "Playing"].includes(g.status)).sort((a, b) => a.title.localeCompare(b.title));
		const body = document.createElement("div");
		body.className = "sv-queueman";
		const draw = () => {
			const cands = candidates();
			body.innerHTML = `
				<p class="sv-modal-text">Os próximos jogos, na ordem em que você quer jogar. O primeiro aparece na Início e em "O que jogar agora?".</p>
				${order.length ? `<ol class="sv-queueman-list">${order.map((p, i) => { const g = model.gamesByPath.get(p); return `<li data-p="${U.attr(p)}">
					<span class="sv-queueman-n sv-num">${i + 1}</span>${U.cover(g, { cls: "sv-cover--xs" })}
					<span class="sv-queueman-t"><b>${U.esc(g.title)}</b><small>${U.esc(C.statusLabel(g.status))}${g.estimatedHours ? ` · ~${U.esc(U.fmtHours(g.estimatedHours))}` : ""}</small></span>
					<button type="button" class="sv-queueman-btn" data-up ${i === 0 ? "disabled" : ""} aria-label="Subir ${U.attr(g.title)}">${U.icon("chevronUp")}</button>
					<button type="button" class="sv-queueman-btn" data-down ${i === order.length - 1 ? "disabled" : ""} aria-label="Descer ${U.attr(g.title)}">${U.icon("chevronDown")}</button>
					<button type="button" class="sv-queueman-btn" data-rm aria-label="Tirar ${U.attr(g.title)} da fila">${U.icon("x")}</button>
				</li>`; }).join("")}</ol>` : `<p class="sv-queueman-empty">${U.icon("list")}<span>A fila está vazia. Adicione abaixo ou pelo menu ⋯ da ficha de um jogo.</span></p>`}
				${cands.length ? `<label class="sv-label" for="sv-q-add">Adicionar à fila</label>
				<div class="sv-queueman-add"><label class="sv-select"><select id="sv-q-add"><option value="">Escolha um jogo…</option>${cands.map(g => `<option value="${U.attr(g.path)}">${U.esc(g.title)} · ${U.esc(C.statusLabel(g.status))}</option>`).join("")}</select></label>${U.btn("Adicionar", { icon: "plus", kind: "secondary", attrs: "data-add" })}</div>` : ""}`;
			this._wireImages(body);
		};
		draw();
		body.addEventListener("click", e => {
			const li = e.target.closest("li[data-p]"), p = li?.dataset.p, i = p ? order.indexOf(p) : -1;
			if (e.target.closest("[data-up]") && i > 0) [order[i - 1], order[i]] = [order[i], order[i - 1]];
			else if (e.target.closest("[data-down]") && i >= 0 && i < order.length - 1) [order[i + 1], order[i]] = [order[i], order[i + 1]];
			else if (e.target.closest("[data-rm]") && i >= 0) { order.splice(i, 1); removed.add(p); }
			else if (e.target.closest("[data-add]")) { const v = body.querySelector("#sv-q-add")?.value; if (!v) return; order.push(v); removed.delete(v); }
			else return;
			draw();
		});
		const m = this.modal({ title: "Fila A seguir", sub: order.length ? U.plural(order.length, "jogo", "jogos") : "", size: "sm", body,
			actions: `${U.btn("Cancelar", { kind: "ghost", attrs: "data-close" })}${U.btn("Salvar ordem", { kind: "primary", icon: "check", attrs: "data-q-save" })}` });
		m.el.querySelector("[data-q-save]").addEventListener("click", async e => {
			e.currentTarget.disabled = true;
			const changes = [...[...removed].filter(p => before.has(p)).map(p => [p, 0]), ...order.map((p, i) => [p, i + 1]).filter(([p, n]) => before.get(p) !== n)];
			try {
				await this._queueWrite(changes);
				m.close();
				if (changes.length) { this.toast("Fila salva", { tone: "ok", icon: "list" }); C.invalidate(); setTimeout(() => this.refresh(), 150); }
			} catch (err) { e.currentTarget.disabled = false; this.toast(`Não foi possível salvar: ${err.message}`, { tone: "error" }); }
		});
	}

	// ===================================================== sessão ao vivo (3.30.0)
	// Cronômetro de sessão: começa na ficha (ou na Início), segue em todas as
	// telas numa barra flutuante e, ao encerrar, vira uma sessão na nota do
	// jogo (mesmo formato do "Registrar sessão"). O início fica só neste
	// aparelho, então fechar o Obsidian não perde a contagem.
	_live() {
		try { const v = JSON.parse(localStorage.getItem("steamvault:live") || "null"); return v && typeof v.path === "string" && Number(v.start) > 0 ? v : null; } catch (_) { return null; }
	}
	_setLive(v) { try { if (v) localStorage.setItem("steamvault:live", JSON.stringify(v)); else localStorage.removeItem("steamvault:live"); } catch (_) {} }
	// tempo jogado: do início até agora (ou até a pausa), sem os trechos pausados
	_liveElapsed(v) { return v ? Math.max(0, (v.pausedAt || Date.now()) - v.start - (Number(v.paused) || 0)) : 0; }
	_livePause(root, ctx) {
		const v = this._live();
		if (!v) return;
		if (v.pausedAt) { v.paused = (Number(v.paused) || 0) + (Date.now() - v.pausedAt); delete v.pausedAt; this.sfx("resume"); }
		else { v.pausedAt = Date.now(); this.sfx("pause"); }
		this._setLive(v);
		this._liveSyncAll(ctx);
	}
	_liveClock(ms) {
		const t = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), x = t % 60, p = n => String(n).padStart(2, "0");
		return h ? `${h}:${p(m)}:${p(x)}` : `${p(m)}:${p(x)}`;
	}
	_liveTick() {
		clearInterval(window.__svLiveTick); window.__svLiveTick = 0;
		const live = this._live();
		if (!live) return;
		const upd = () => {
			const els = document.querySelectorAll("[data-live-time]");
			if (!els.length || !this._live()) { clearInterval(window.__svLiveTick); window.__svLiveTick = 0; return; }
			const t = this._liveClock(this._liveElapsed(live));
			els.forEach(el => { if (el.textContent !== t) el.textContent = t; });
		};
		upd();
		if (!live.pausedAt) window.__svLiveTick = setInterval(upd, 1000);
	}
	// barra flutuante + estado dos botões de iniciar/encerrar
	_liveSync(root, ctx) {
		const { U } = ctx;
		const live = this._live();
		root.querySelector(".sv-livedock")?.remove();
		root.querySelectorAll("[data-live-btn]").forEach(b => {
			const on = !!live && live.path === b.dataset.path;
			b.classList.toggle("is-live", on);
			b.setAttribute("aria-pressed", String(on));
			b.title = on ? "Encerrar a sessão ao vivo" : "Começar uma sessão ao vivo (cronômetro)";
			b.setAttribute("aria-label", b.title);
		});
		const main = root.querySelector(".sv-main");
		if (live && main) {
			const g = ctx.model?.gamesByPath?.get(live.path);
			const paused = !!live.pausedAt;
			main.insertAdjacentHTML("beforeend", `<div class="sv-livedock"><div class="sv-livebar${paused ? " is-paused" : ""}" role="status">
				<a class="sv-livebar-game" ${U.openAttrs(live.path)}>${g ? U.cover(g, { cls: "sv-cover--xs" }) : `<span class="sv-livebar-ico">${U.icon("play")}</span>`}<span><small><i aria-hidden="true"></i>${paused ? "Sessão pausada" : "Sessão ao vivo"}</small><b>${U.esc(g?.title || live.title || "")}</b></span></a>
				<span class="sv-livebar-time sv-num" data-live-time>${this._liveClock(this._liveElapsed(live))}</span>
				<button type="button" class="sv-livebar-pause" data-action="live-pause" aria-label="${paused ? "Retomar a sessão" : "Pausar a sessão"}" title="${paused ? "Retomar" : "Pausar"}">${paused ? U.icon("play") : `<i aria-hidden="true"></i><i aria-hidden="true"></i>`}</button>
				<button type="button" class="sv-livebar-stop" data-action="live-stop" aria-label="Encerrar a sessão"><i aria-hidden="true"></i><span>Encerrar</span></button>
			</div></div>`);
			this._wireImages(main.querySelector(".sv-livedock"));
		}
		this._liveTick();
	}
	// todas as telas abertas (a camada da tela não fica dentro do host)
	_liveSyncAll(ctx) { document.querySelectorAll(".sv-app").forEach(r => this._liveSync(r, ctx)); }
	_liveToggle(path, root, ctx) {
		const live = this._live();
		if (live && live.path === path) return this._liveStopDialog(root, ctx);
		if (live) { this.toast("Já há uma sessão ao vivo. Encerre-a antes de começar outra.", { tone: "warn", icon: "clock" }); return this._liveStopDialog(root, ctx); }
		const g = ctx.model?.gamesByPath?.get(path);
		if (!g) return;
		this._setLive({ path, title: g.title, start: Date.now() });
		this.sfx("start");
		this._haptic?.();
		this._liveSyncAll(ctx);
		this.toast(`Sessão de ${g.title} começou. O tempo conta mesmo fora do app.`, { tone: "ok", icon: "play" });
	}
	_liveStopDialog(root, ctx) {
		const { U, C } = ctx;
		const live = this._live();
		if (!live) return;
		const g = ctx.model?.gamesByPath?.get(live.path);
		const ms = this._liveElapsed(live);
		const hours = Math.max(0.01, Math.round((ms / 3600000) * 100) / 100);
		const body = document.createElement("div");
		body.className = "sv-livesave";
		body.innerHTML = `
			<div class="sv-livesave-time"><b class="sv-num">${this._liveClock(ms)}</b><span>desde ${(d => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`)(new Date(live.start))}</span></div>
			${ms < 60000 ? `<p class="sv-formmsg is-warn">Menos de um minuto. Salve só se quiser registrar mesmo assim.</p>` : ""}
			<label class="sv-label" for="sv-live-h">Horas jogadas</label>
			<input id="sv-live-h" class="sv-input" type="number" inputmode="decimal" min="0" max="48" step="0.05" value="${hours}">
			<label class="sv-label" for="sv-live-note">Como foi? <small>(opcional)</small></label>
			<textarea id="sv-live-note" class="sv-input" rows="3" maxlength="500" placeholder="Ex.: Terminei o capítulo 3, faltam dois chefes"></textarea>
			<small class="sv-muted">Fechar esta janela mantém o cronômetro contando.</small>`;
		const m = this.modal({ title: "Encerrar sessão", sub: g?.title || live.title || "", size: "sm", body,
			actions: `${U.btn("Descartar", { kind: "ghost", attrs: "data-live-discard" })}${U.btn("Salvar sessão", { kind: "primary", icon: "check", attrs: "data-live-save" })}` });
		m.el.querySelector("[data-live-discard]")?.addEventListener("click", async () => {
			const ok = await this.confirm({ title: "Descartar a sessão?", text: "O tempo contado não vai para a nota do jogo.", confirm: "Descartar", danger: true });
			if (!ok) return;
			this._setLive(null); m.close(); this.refresh();
		});
		m.el.querySelector("[data-live-save]")?.addEventListener("click", async e => {
			const btn = e.currentTarget; btn.disabled = true;
			const h = Math.min(48, Math.max(0, Number(String(body.querySelector("#sv-live-h").value).replace(",", ".")) || 0));
			const note = C.clip(body.querySelector("#sv-live-note").value.trim(), 500);
			const f = app.vault.getAbstractFileByPath(live.path);
			if (!f) { btn.disabled = false; return this.toast("A nota do jogo não foi encontrada.", { tone: "error" }); }
			try {
				const today = C.today();
				await app.fileManager.processFrontMatter(f, fm => {
					if (!Array.isArray(fm.sessions)) fm.sessions = [];
					const entry = { date: today, hours: Math.round(h * 100) / 100, source: "live" };
					if (note) entry.note = note;
					fm.sessions.push(entry);
					if (h > 0) fm.hoursPlayed = Math.round(((Number(fm.hoursPlayed) || 0) + h) * 100) / 100;
					fm.lastPlayed = today;
					if (fm.status === "Backlog" || fm.status === "Wishlist") fm.status = "Playing";
					if (!fm.startDate) fm.startDate = today;
				});
				this._setLive(null);
				m.close();
				this.sfx("save");
				const dl = await this.mods().CA?.logSessionToDaily?.({ path: live.path, title: g?.title || live.title, hours: h, note }, this);
				this.toast(`Sessão salva: ${U.fmtHours(h)} em ${g?.title || live.title}${dl?.ok ? " · anotada na nota diária" : ""}`, { tone: "ok", icon: "clock" });
				C.invalidate();
				setTimeout(() => this.refresh(), 150);
			} catch (err) { btn.disabled = false; this.toast(`Não foi possível salvar: ${err.message}`, { tone: "error" }); }
		});
	}

	// vistos recentemente (só neste aparelho): aparecem na busca vazia
	_recent() { try { return JSON.parse(localStorage.getItem("steamvault:recent") || "[]").filter(x => typeof x === "string"); } catch (_) { return []; } }
	_pushRecent(path) {
		try { localStorage.setItem("steamvault:recent", JSON.stringify([path, ...this._recent().filter(x => x !== path)].slice(0, 8))); } catch (_) {}
	}

	_wireSearch(root, ctx) {
		const { U, C } = ctx;
		const input = root.querySelector(".sv-search-input");
		const box = root.querySelector(".sv-search-results");
		if (!input || !box) return;
		let sel = -1, results = [];
		const kinds = { game: ["Jogos", "grid"], collection: ["Coleções", "stack"], platform: ["Plataformas", "monitor"], genre: ["Gêneros", "masks"], subgenre: ["Subgêneros", "tag"], franchise: ["Franquias", "film"], achievement: ["Conquistas", "trophy"] };
		const draw = () => {
			const q = C.normalizeKey(input.value);
			if (!q) {
				const byPath = new Map(this._searchIndex(ctx).map(it => [it.path, it]));
				const cur = ctx.current?.file?.path;
				results = this._recent().filter(p => p !== cur).map(p => byPath.get(p)).filter(Boolean).slice(0, 6);
				if (!results.length || document.activeElement !== input) { box.hidden = true; box.innerHTML = ""; results = []; return; }
				sel = -1;
				box.innerHTML = `<div class="sv-search-group"><span class="sv-search-label">Vistos recentemente</span>${results.map((it, n) => {
					const thumb = it.kind === "game" ? U.cover(it.g, { cls: "sv-cover--xs" }) : it.kind === "achievement" && it.a.iconSrc ? `<img class="sv-search-ach" src="${U.attr(it.a.iconSrc)}" alt="">` : `<span class="sv-search-ico">${U.icon((kinds[it.kind] || [, "search"])[1])}</span>`;
					return `<a class="sv-search-item" role="option" data-i="${n}" data-open="${U.attr(it.path)}" href="${U.attr(it.path)}">${thumb}<span><b>${U.esc(it.label)}</b><small>${U.esc(it.sub)}</small></span></a>`;
				}).join("")}</div>`;
				this._wireImages(box);
				box.hidden = false;
				return;
			}
			const all = this._searchIndex(ctx);
			const scored = [];
			for (const it of all) {
				const i = it.key.indexOf(q);
				if (i < 0) continue;
				scored.push({ it, s: (i === 0 ? 0 : 1) + (it.kind === "achievement" ? 2 : 0) + it.key.length / 200 });
			}
			scored.sort((a, b) => a.s - b.s);
			const byKind = {};
			for (const { it } of scored) { (byKind[it.kind] = byKind[it.kind] || []); if (byKind[it.kind].length < (it.kind === "game" ? 6 : 4)) byKind[it.kind].push(it); }
			results = Object.keys(kinds).flatMap(k => byKind[k] || []);
			sel = results.length ? 0 : -1;
			if (!results.length) {
				box.innerHTML = `<div class="sv-search-empty">${U.icon("search")}<span>Nada encontrado para “${U.esc(input.value)}”</span></div>`;
			} else {
				let n = -1;
				box.innerHTML = Object.keys(kinds).filter(k => byKind[k]?.length).map(k => `<div class="sv-search-group"><span class="sv-search-label">${kinds[k][0]}</span>${byKind[k].map(it => {
					n++;
					const thumb = it.kind === "game" ? U.cover(it.g, { cls: "sv-cover--xs" }) : it.kind === "achievement" && it.a.iconSrc ? `<img class="sv-search-ach" src="${U.attr(it.a.iconSrc)}" alt="">` : `<span class="sv-search-ico">${U.icon(kinds[k][1])}</span>`;
					return `<a class="sv-search-item${n === 0 ? " is-sel" : ""}" role="option" data-i="${n}" data-open="${U.attr(it.path)}" href="${U.attr(it.path)}">${thumb}<span><b>${U.esc(it.label)}</b><small>${U.esc(it.sub)}</small></span></a>`;
				}).join("")}</div>`).join("");
				// capas dos resultados entram com fade como as da tela
				this._wireImages(box);
			}
			box.hidden = false;
		};
		const mark = () => box.querySelectorAll(".sv-search-item").forEach(a => { const on = Number(a.dataset.i) === sel; a.classList.toggle("is-sel", on); if (on) a.scrollIntoView({ block: "nearest" }); });
		input.addEventListener("input", draw);
		input.addEventListener("focus", () => draw());
		input.addEventListener("keydown", e => {
			if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(results.length - 1, sel + 1); mark(); }
			else if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(0, sel - 1); mark(); }
			else if (e.key === "Enter" && results[sel]) { e.preventDefault(); this.open(results[sel].path, ctx, e.ctrlKey || e.metaKey); input.blur(); box.hidden = true; }
			else if (e.key === "Escape") { this._closeSearch(root); }
		});
		input.addEventListener("blur", () => setTimeout(() => {
			box.hidden = true;
			if (!input.value && root.classList.contains("is-search-open") && document.activeElement !== input) root.classList.remove("is-search-open");
		}, 160));
	}

	// "/" ou Ctrl/Cmd+K focam a busca da tela ativa — um listener só
	_bindGlobalKeys() {
		if (window.__svKeysBound) return;
		window.__svKeysBound = true;
		const reapply = () => {
			for (const h of [...(window.__svHosts || [])]) {
				if (!h.isConnected) { window.__svHosts.delete(h); continue; }
				h.__svApply?.();
			}
		};
		const later = () => { this._markScreen(); reapply(); setTimeout(() => { this._markScreen(); reapply(); }, 400); };
		window.addEventListener("resize", later, { passive: true });
		let mq = 0;
		try { new MutationObserver(() => { cancelAnimationFrame(mq); mq = requestAnimationFrame(reapply); }).observe(document.body, { attributes: true, attributeFilter: ["class"] }); } catch (_) {}
		window.addEventListener("orientationchange", later, { passive: true });
		document.addEventListener("visibilitychange", () => { if (!document.hidden) later(); });
		try {
			app.workspace.on("resize", later);
			app.workspace.on("layout-change", later);
			app.workspace.on("active-leaf-change", later);
		} catch (_) {}
		// Teclado virtual: mede a parte da tela coberta pela área visível
		// (visualViewport) e expõe --sv-kb. Se o WebView encolhe com o teclado,
		// isso dá 0 e nada muda; se o teclado cobre a página, as janelas sobem
		// exatamente essa altura. Ao abrir e ao fechar, tudo é recalculado
		// (sem valor velho guardado) e o campo tocado vai para o centro.
		const vv = window.visualViewport;
		const isField = el => el?.matches?.("input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]), textarea, select, [contenteditable=true]");
		const kbUpdate = () => {
			const covered = vv ? Math.round(window.innerHeight - vv.height - vv.offsetTop) : 0;
			const kb = covered > 80 ? covered : 0;
			document.documentElement.style.setProperty("--sv-kb", `${kb}px`);
			document.body.classList.toggle("sv-kb-open", kb > 0);
			window.__svInsets = null;
			reapply();
		};
		vv?.addEventListener("resize", kbUpdate, { passive: true });
		document.addEventListener("focusin", e => {
			const el = e.target;
			if (!isField(el) || !el.closest(".sv-modal-root, .sv-host")) return;
			setTimeout(() => {
				kbUpdate();
				if (document.activeElement === el) el.scrollIntoView({ block: "center", behavior: "smooth" });
			}, 320);
		});
		document.addEventListener("focusout", e => {
			if (!isField(e.target)) return;
			// o teclado fecha com animação: mede de novo ao fim dela
			setTimeout(() => { if (!isField(document.activeElement)) kbUpdate(); }, 350);
			setTimeout(() => { if (!isField(document.activeElement)) kbUpdate(); }, 800);
		});
		// iOS só mostra o estado :active (resposta ao toque) se houver um
		// ouvinte de touchstart na página
		document.addEventListener("touchstart", () => {}, { passive: true });
		// menus abertos fecham ao clicar fora (um listener para todas as telas)
		document.addEventListener("click", e => {
			if (e.target.closest?.(".sv-menu-wrap")) return;
			document.querySelectorAll(".sv-app .sv-menu:not([hidden])").forEach(m => { m.hidden = true; });
		}, true);
		document.addEventListener("keydown", e => {
			const t = e.target;
			const typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
			const isK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k";
			if (!isK && (e.key !== "/" || typing)) return;
			const input = document.querySelector(".workspace-leaf.mod-active .sv-search-input") || document.querySelector(".sv-search-input");
			if (!input || document.querySelector(".sv-modal-root")) return;
			if (getComputedStyle(input.closest(".sv-search") || input).display === "none" && document.body.classList.contains("sv-hide-top-search")) return;
			e.preventDefault(); e.stopPropagation();
			input.closest(".sv-app")?.classList.add("is-search-open");
			requestAnimationFrame(() => { input.focus(); input.select(); });
		}, true);
	}

	// ============================================================== toasts
	toast(message, { tone = "", icon = "", sticky = false, progress = null, action = null } = {}) {
		const U = this.mods().U;
		let stack = document.querySelector(".sv-toasts");
		if (!stack) { stack = document.createElement("div"); stack.className = "sv-toasts steamvault"; stack.setAttribute("role", "status"); stack.setAttribute("aria-live", "polite"); document.body.appendChild(stack); }
		const el = document.createElement("div");
		const ic = icon || ({ ok: "check", error: "alert", warn: "alert" })[tone] || "info";
		const paint = (msg, t, p) => {
			el.className = `sv-toast${t ? ` sv-toast--${t}` : ""}`;
			el.innerHTML = `<span class="sv-toast-icon">${U.icon(ic)}</span><span class="sv-toast-text">${U.esc(msg)}</span>${action ? `<button type="button" class="sv-toast-action">${U.esc(action.label)}</button>` : ""}${p !== null && p !== undefined ? `<span class="sv-toast-progress"><span style="width:${Math.max(0, Math.min(100, p))}%"></span></span>` : ""}`;
		};
		// 3.50.0: botão de ação no aviso (ex.: Desfazer); um toque só
		if (action) el.addEventListener("click", e => {
			const b = e.target.closest(".sv-toast-action");
			if (!b || b.disabled) return;
			b.disabled = true;
			api.close(0);
			Promise.resolve().then(() => action.run()).catch(err => console.warn("Game Library: ação do aviso", err));
		});
		paint(message, tone, progress);
		el.classList.add("is-fresh");
		stack.appendChild(el);
		requestAnimationFrame(() => el.classList.add("is-in"));
		// ícone "entra" só na primeira pintura (atualizações de progresso não repetem)
		setTimeout(() => el.classList.remove("is-fresh"), 700);
		let timer = null;
		const api = {
			el,
			update: (msg, { tone: t = tone, progress: p = null } = {}) => { const fresh = el.classList.contains("is-fresh"); paint(msg, t, p); el.classList.add("is-in"); if (fresh) el.classList.add("is-fresh"); },
			close: (ms = 0) => { clearTimeout(timer); timer = setTimeout(() => { el.classList.remove("is-in"); setTimeout(() => el.remove(), 250); }, ms); }
		};
		if (!sticky) api.close(tone === "error" ? 7000 : action ? 9000 : 3200);
		// deslizar para qualquer lado dispensa o aviso (ele sai por esse lado)
		for (const sign of [1, -1]) this._swipe(el, el, { axis: "x", sign, limit: 70, onDismiss: () => { el.style.transform = `translateX(${sign * 120}%)`; el.style.opacity = "0"; api.close(0); } });
		return api;
	}

	// ============================================================== modal
	// Painel próprio: backdrop, cabeçalho, corpo, ações; Esc fecha; foco
	// fica preso dentro enquanto aberto e volta para quem abriu.
	modal({ title, sub = "", body = "", actions = "", size = "md", onClose = null, cls = "" } = {}) {
		const U = this.mods().U;
		const opener = document.activeElement;
		const wrap = document.createElement("div");
		wrap.className = `sv-modal-root steamvault${document.body.classList.contains("theme-light") ? " is-light" : ""}`;
		const id = `sv-modal-${Date.now().toString(36)}-${(this._modalSeq = (this._modalSeq || 0) + 1)}`;
		wrap.innerHTML = `<div class="sv-modal-backdrop" data-close></div>
			<div class="sv-modal sv-modal--${size} ${cls}" role="dialog" aria-modal="true" aria-labelledby="${id}">
				<header class="sv-modal-head"><div><h2 id="${id}">${U.esc(title)}</h2>${sub ? `<p>${U.esc(sub)}</p>` : ""}</div>
					<button type="button" class="sv-btn sv-btn--ghost sv-btn--icon" data-close aria-label="Fechar">${U.icon("x")}</button></header>
				<div class="sv-modal-body"></div>
				${actions ? `<footer class="sv-modal-foot">${actions}</footer>` : ""}
			</div>`;
		const bodyEl = wrap.querySelector(".sv-modal-body");
		const sheet = wrap.querySelector(".sv-modal");
		if (typeof body === "string") bodyEl.innerHTML = body; else if (body) bodyEl.appendChild(body);
		this._polishForm(bodyEl);
		// 3.62.2: capas e imagens dentro da janela também recebem o "carregada"
		// (sem isso a imagem ficava invisível e só aparecia a capa de texto)
		try { this._wireImages(bodyEl); } catch (_) {}
		document.body.appendChild(wrap);
		requestAnimationFrame(() => wrap.classList.add("is-open"));
		let closed = false;
		const close = () => {
			if (closed) return; closed = true;
			wrap.classList.remove("is-open");
			document.removeEventListener("keydown", onKey, true);
			setTimeout(() => wrap.remove(), 200);
			onClose?.();
			opener?.focus?.();
		};
		const focusables = () => [...wrap.querySelectorAll('button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])')].filter(el => !el.disabled && el.offsetParent !== null);
		const onKey = e => {
			if (e.key === "Escape") { e.stopPropagation(); close(); }
			else if (e.key === "Tab") {
				const f = focusables(); if (!f.length) return;
				if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
				else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
			}
		};
		document.addEventListener("keydown", onKey, true);
		wrap.addEventListener("click", e => { if (e.target.closest("[data-close]")) close(); });
		// celular: a janela é um painel de baixo — arrastar a alça/cabeçalho
		// para baixo fecha, como nos apps nativos
		if (size !== "full" && (document.body.classList.contains("is-mobile") || matchMedia("(max-width: 760px)").matches)) {
			sheet.classList.add("is-sheet");
			const backdrop = wrap.querySelector(".sv-modal-backdrop");
			this._swipe(wrap.querySelector(".sv-modal-head"), sheet, {
				axis: "y", sign: 1, limit: 100,
				onMove: px => { backdrop.style.opacity = px ? String(Math.max(0.2, 1 - px / 400)) : ""; },
				onDismiss: () => { backdrop.style.opacity = ""; close(); }
			});
		}
		// foco inicial: no toque, a própria janela (focar um campo abriria o
		// teclado sozinho e um link ganharia o anel de foco); no teclado/mouse,
		// o primeiro controle, como antes
		const touch = document.body.classList.contains("is-mobile") || matchMedia("(hover: none)").matches;
		sheet.setAttribute("tabindex", "-1");
		setTimeout(() => {
			if (touch) sheet.focus({ preventScroll: true });
			else (wrap.querySelector("[autofocus]") || focusables().find(el => !el.hasAttribute("data-close")) || focusables()[0])?.focus();
		}, 60);
		return { el: wrap, body: bodyEl, close };
	}

	confirm({ title, text = "", confirm = "Confirmar", danger = false }) {
		const U = this.mods().U;
		return new Promise(resolve => {
			let answered = false;
			const m = this.modal({
				title, size: "sm", body: text ? `<p class="sv-modal-text">${U.esc(text)}</p>` : "",
				actions: `${U.btn("Cancelar", { kind: "ghost", attrs: "data-close" })}${U.btn(confirm, { kind: danger ? "danger" : "primary", attrs: "data-ok" })}`,
				onClose: () => { if (!answered) resolve(false); }
			});
			m.el.querySelector("[data-ok]").addEventListener("click", () => { answered = true; resolve(true); m.close(); });
		});
	}

	// ============================================================ lightbox
	lightbox(srcs, start = 0) {
		const U = this.mods().U;
		if (!srcs?.length) return;
		let i = start;
		const m = this.modal({ title: "Mídia", size: "full", cls: "sv-lightbox", body: `<figure class="sv-lb-stage"><img alt=""><figcaption></figcaption></figure>${srcs.length > 1 ? `<button type="button" class="sv-lb-nav sv-lb-prev" aria-label="Anterior">${U.icon("chevronLeft")}</button><button type="button" class="sv-lb-nav sv-lb-next" aria-label="Próxima">${U.icon("chevronRight")}</button>` : ""}` });
		const img = m.el.querySelector(".sv-lb-stage img"), cap = m.el.querySelector("figcaption");
		const show = n => { i = (n + srcs.length) % srcs.length; img.src = srcs[i]; cap.textContent = `${i + 1} de ${srcs.length}`; };
		// cada imagem entra com um fade curto quando termina de carregar
		img.addEventListener("load", () => {
			if (this._motionOn() && img.animate) img.animate([{ opacity: 0, transform: "scale(0.985)" }, { opacity: 1, transform: "none" }], { duration: 280, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" });
		});
		m.el.querySelector(".sv-lb-prev")?.addEventListener("click", () => show(i - 1));
		m.el.querySelector(".sv-lb-next")?.addEventListener("click", () => show(i + 1));
		m.el.addEventListener("keydown", e => { if (e.key === "ArrowLeft") show(i - 1); if (e.key === "ArrowRight") show(i + 1); });
		// celular: deslizar para o lado troca a imagem (as setas continuam)
		if (srcs.length > 1) {
			const stage = m.el.querySelector(".sv-lb-stage");
			let sx = 0, sy = 0, t0 = 0;
			stage.addEventListener("touchstart", e => { if (e.touches.length !== 1) return; sx = e.touches[0].clientX; sy = e.touches[0].clientY; t0 = performance.now(); }, { passive: true });
			stage.addEventListener("touchend", e => {
				const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
				if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4 && performance.now() - t0 < 700) { this._haptic(); show(i + (dx < 0 ? 1 : -1)); }
			}, { passive: true });
		}
		show(i);
	}

	// ================================================== editores herdados
	// Os formulários do SteamVaultLegacy são montados dentro do modal. O
	// botão "abrir formulário" deles vira desnecessário (o modal JÁ é o
	// formulário) e "Cancelar" fecha o modal.
	_mountLegacy(m, html, wire) {
		const L = this.mods().L;
		const host = document.createElement("div");
		host.className = "sv-legacy sv-legacy--modal";
		host.innerHTML = html;
		m.body.appendChild(host);
		try { wire?.(host); } catch (err) { console.error("Game Library: falha ao ligar editor", err); }
		this.cleanLegacy(host);
		this._polishForm(host);
		L?.wireImageFade?.(host);
		host.querySelectorAll('[id$="-toggle"]').forEach(btn => {
			if (/timeline/.test(btn.id)) return;
			const form = host.querySelector(`#${CSS.escape(btn.id.replace(/-toggle$/, "-form"))}`);
			// 3.69.0: abre direto (classes do estado aberto). O clique chamava o
			// openForm do módulo antigo, que media a altura para animar — um
			// layout forçado inteiro, desperdiçado: logo abaixo a altura vira "none"
			if (form && !form.classList.contains("is-open")) { form.classList.add("is-open"); btn.classList.add("is-open"); }
			btn.classList.add("sv-legacy-toggle");
		});
		host.querySelectorAll(".svl-form").forEach(f => { f.classList.add("is-open"); f.style.maxHeight = "none"; });
		host.querySelectorAll('[id$="-cancel"]').forEach(b => b.addEventListener("click", () => m.close()));
		return host;
	}

	// ícones herdados viram SVG; emojis decorativos que sobrarem em rótulos
	// saem (o vocabulário visual da Game Library é um conjunto de ícones só)
	cleanLegacy(host) {
		const L = this.mods().L;
		try { L?._svgifyIcons?.(host); } catch (_) {}
		const re = /(?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:\uFE0F|\u200D(?:\p{Extended_Pictographic}))*\s?/gu;
		const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT, {
			acceptNode: n => n.parentElement?.closest("select, option, textarea, input, [contenteditable]") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
		});
		const nodes = [];
		while (walker.nextNode()) nodes.push(walker.currentNode);
		for (const n of nodes) { const t = n.nodeValue.replace(re, ""); if (t !== n.nodeValue) n.nodeValue = t; }
		host.querySelectorAll("[placeholder], [title]").forEach(el => {
			for (const a of ["placeholder", "title"]) { const v = el.getAttribute(a); if (v) el.setAttribute(a, v.replace(re, "")); }
		});
		return host;
	}

	// 3.62.0: acabamento comum a todo formulário aberto numa janela.
	// - "(opcional)" no fim do rótulo vira uma etiqueta discreta; "*" vira o
	//   marcador de obrigatório (e o campo ganha aria-required)
	// - ao tentar salvar com um obrigatório vazio, o campo fica com estado de
	//   erro e recebe o foco (a mensagem do formulário continua a mesma)
	// Idempotente: pode rodar de novo no mesmo conteúdo.
	_polishForm(root) {
		if (!root) return;
		const ctl = lb => {
			const f = lb.getAttribute("for");
			return (f && root.querySelector(`#${CSS.escape(f)}`)) || lb.closest(".svl-field, .sv-mgr-field, .sv-field-block")?.querySelector("input:not([type=hidden]):not([type=file]), select, textarea") || null;
		};
		for (const lb of root.querySelectorAll("label, .sv-label")) {
			if (lb.dataset.svPolished) continue;
			lb.dataset.svPolished = "1";
			const last = [...lb.childNodes].reverse().find(n => n.nodeType === 3 && n.nodeValue.trim());
			if (!last) continue;
			const t = last.nodeValue;
			let m;
			if ((m = /^(.*?)\s*\*\s*$/.exec(t))) {
				last.nodeValue = m[1];
				const req = document.createElement("span"); req.className = "sv-req"; req.title = "Obrigatório"; req.setAttribute("aria-hidden", "true");
				lb.appendChild(req);
				const c = ctl(lb); if (c) c.setAttribute("aria-required", "true");
			} else if ((m = /^(.*?)\s*\(([^()]*?),\s*opcional\)\s*$/i.exec(t))) {
				last.nodeValue = m[1] + " ";
				const hint = document.createElement("small"); hint.className = "sv-lhint"; hint.textContent = m[2];
				const opt = document.createElement("span"); opt.className = "sv-opt"; opt.textContent = "opcional";
				lb.append(hint, opt);
			} else if ((m = /^(.*?)\s*(?:\(opcional\)|[—–-]\s*opcional)\s*$/i.exec(t))) {
				last.nodeValue = m[1];
				const opt = document.createElement("span"); opt.className = "sv-opt"; opt.textContent = "opcional";
				lb.appendChild(opt);
			}
		}
		if (root.__svFormGuard) return;
		root.__svFormGuard = true;
		const empty = el => !String(el.value || "").trim();
		root.addEventListener("click", e => {
			const btn = e.target.closest(".svl-btn-primary, .sv-btn--primary, [data-ok]");
			if (!btn) return;
			const scope = btn.closest(".svl-form, .sv-modal") || root;
			setTimeout(() => {
				if (!scope.isConnected) return;
				const bad = [...scope.querySelectorAll('[aria-required="true"]')].filter(el => el.offsetParent !== null && empty(el));
				bad.forEach(el => el.setAttribute("aria-invalid", "true"));
				if (bad.length && !bad.includes(document.activeElement)) bad[0].focus({ preventScroll: false });
			}, 60);
		}, true);
		root.addEventListener("input", e => { if (e.target.getAttribute?.("aria-invalid") === "true" && !empty(e.target)) e.target.removeAttribute("aria-invalid"); });
	}

	_needLegacy() {
		if (this.mods().L) return true;
		this.toast("O módulo SteamVaultLegacy.js não foi carregado — os editores ficam indisponíveis.", { tone: "error" });
		return false;
	}

	manage(ctx, section, path) {
		if (!this._needLegacy()) return;
		const { L, dv, model, U } = ctx;
		const p = dv.page(path);
		const g = model.gamesByPath.get(path);
		if (!p) return this.toast("Jogo não encontrado", { tone: "error" });
		const platforms = L.getAllPlatforms(dv);
		const defs = {
			details: ["Editar detalhes", () => L.gameDetailsEditPanel(p, platforms, [...new Set([...model.games.flatMap(g => g.genres), ...model.genres.map(x => x.title)])].sort((a, b) => a.localeCompare(b)), [...new Set([...model.games.flatMap(g => g.subgenres), ...(model.subgenres || []).map(x => x.title)])].sort((a, b) => a.localeCompare(b))), h => L.wireGameDetailsEditor(h, p), "lg"],
			images: ["Capa e fundo", () => L.coverEditPanel(p), h => L.wireCoverEditor(h, p), "lg"],
			achievements: ["Conquistas", () => L.addAchievementForm(p), h => L.wireAddAchievementForm(h, p), "md"],
			sessions: ["Diário de sessões", () => L.sessionsSection(p), h => L.wireSessionsSection(h, p), "md"],
			playthroughs: ["Zeradas", () => L.playthroughsSection(p), h => L.wirePlaythroughsSection(h, p), "md"],
			dlc: ["DLC e expansões", () => L.dlcSection(p), h => L.wireDlcSection(h, p), "md"],
			notes: ["Notas", () => L.notesSection(p), h => L.wireNotesSection(h, p), "md"],
			screenshots: ["Screenshots", () => L.screenshotsSection(p), h => L.wireScreenshotsSection(h, p), "lg"]
		};
		const d = defs[section] || defs.details;
		const m = this.modal({ title: d[0], sub: g?.title || p.file.name, size: d[3] });
		this._mountLegacy(m, d[1](), d[2]);
		void U;
	}

	legacy(ctx, kind, el) {
		if (!this._needLegacy()) return;
		const { L, dv, model, current, page, C } = ctx;
		let _games = null, _platforms = null;
		const lazy = {
			get games() { return _games || (_games = dv.pages().where(p => p.type === "game" && !String(p.file.path).includes("/_Templates/")).array()); },
			get platforms() { return _platforms || (_platforms = L.getAllPlatforms(dv)); }
		};
		const defs = {
			addCollection: ["Nova coleção", "", () => L.addCollectionForm(), h => L.wireAddCollectionForm(h)],
			editCollection: ["Editar coleção", "", () => L.collectionEditPanel(current), h => L.wireCollectionEditor(h, current)],
			addPlatform: ["Nova plataforma", "", () => L.addCustomPlatformForm(), h => L.wireAddCustomPlatformForm(h)],
			addGenre: ["Novo gênero", "", () => L.addCustomGenreForm(), h => L.wireAddCustomGenreForm(h)],
			editAchievement: ["Editar conquista", "", () => L.achievementUnlockEditPanel(current) + L.achievementIconEditPanel(current), h => { L.wireAchievementUnlockEditor(h, current); L.wireAchievementIconEditor(h, current); }],
			syncCategories: null,
			awards: ["Prêmios do ano", "Escolha manual por categoria", () => { const y = String(new Date().getFullYear()); return L.awardsSection(lazy.games, C.arr(current?.awards), y); }, h => L.wireAwardsSection(h, current.file.path, String(new Date().getFullYear()))]
		};
		// 3.65.0: os quatro formulários simples já são janelas nativas
		const B = ctx.B;
		if (kind === "addCollection" && B?.newCollection) return B.newCollection(ctx);
		if (kind === "editCollection" && B?.editCollectionData) return B.editCollectionData(ctx, current);
		if (kind === "addGenre" && B?.newGenre) return B.newGenre(ctx);
		if (kind === "addPlatform" && B?.newPlatform) return B.newPlatform(ctx);
		if (kind === "syncCategories") return this._syncCategories(ctx, page === "genres" ? "genre" : page === "subgenres" ? "subgenre" : "platform");
		const d = defs[kind];
		if (!d) return this.toast("Ação indisponível", { tone: "warn" });
		const m = this.modal({ title: d[0], sub: d[1], size: "md" });
		this._mountLegacy(m, d[2](), d[3]);
		void el;
	}

	// cria as páginas que faltam para os nomes em uso (gênero, subgênero ou
	// plataforma). Usa C.ensureCategoryNote, que nunca duplica uma página.
	async _syncCategories(ctx, k) {
		const { model, C, U } = ctx;
		const pick = { genre: g => g.genres, subgenre: g => g.subgenres, platform: g => [g.platform] }[k];
		const list = { genre: model.genres, subgenre: model.subgenres || [], platform: model.platforms }[k];
		const have = new Set(list.map(x => C.normalizeKey(x.title)));
		const names = new Map();
		for (const g of model.games) for (const n of pick(g)) if (n && !have.has(C.normalizeKey(n))) names.set(C.normalizeKey(n), n);
		const label = { genre: ["página de gênero", "páginas de gênero"], subgenre: ["página de subgênero", "páginas de subgênero"], platform: ["página de plataforma", "páginas de plataforma"] }[k];
		if (!names.size) return this.toast(`Todas as ${label[1]} já existem`, { tone: "ok" });
		const ok = await this.confirm({ title: `Criar ${U.plural(names.size, label[0], label[1])}?`, text: [...names.values()].join(", "), confirm: "Criar" });
		if (!ok) return;
		let made = 0;
		for (const n of names.values()) { try { await C.ensureCategoryNote(k, n); made++; } catch (err) { console.warn("Game Library: página não criada", n, err); } }
		this.toast(made ? `${U.plural(made, "página criada", "páginas criadas")}` : "Nenhuma página criada", { tone: made ? "ok" : "warn" });
		C.invalidate?.();
		return this.refresh();
	}

	addGame(ctx, { title = "", appId = "" } = {}) {
		if (!this._needLegacy()) return;
		const { L, dv } = ctx;
		const platforms = L.getAllPlatforms(dv);
		const m = this.modal({ title: "Adicionar jogo", sub: "A ficha nasce com o schema completo; a data de “jogado por último” só aparece depois da primeira sessão.", size: "lg" });
		const host = this._mountLegacy(m, L.addGameForm(platforms), h => L.wireAddGameForm(h));
		const t = host.querySelector("#svl-f-title");
		if (t && title) { t.value = title; t.dispatchEvent(new Event("input", { bubbles: true })); }
		setTimeout(() => t?.focus(), 80);
		void appId;
	}

	randomGame(ctx) {
		const pool = ctx.model.games.filter(g => g.notPlayed || g.status === "Backlog" || g.status === "Paused");
		const list = pool.length ? pool : ctx.model.games;
		if (!list.length) return this.toast("A biblioteca está vazia", { tone: "warn" });
		const g = list[Math.floor(Math.random() * list.length)];
		this.toast(`Que tal ${g.title}?`, { icon: "dice" });
		this.open(g.path, ctx);
	}

	// ------------------------------------------------ jogos de uma coleção
	// A lista vive no frontmatter (`games:`), não em links soltos no corpo —
	// então um link quebrado vira um aviso claro, não um card fantasma.
	collectionGames(ctx, path) {
		const { model, U, C } = ctx;
		const c = model.collections.find(x => x.path === path);
		const file = app.vault.getAbstractFileByPath(path);
		if (!c || !file) return;
		const chosen = new Set(c.games.map(g => g.path));
		const games = [...model.games].sort((a, b) => a.title.localeCompare(b.title));
		// 3.69.0: com centenas de jogos, a janela levava mais de 1 s para abrir
		// (todas as linhas montadas de uma vez). Entram 60; o resto em partes
		// quando o aparelho fica livre, e tudo de uma vez antes de filtrar ou salvar
		const row = g => `<label class="sv-picker-item" data-k="${U.attr(C.normalizeKey(g.title))}"><input type="checkbox" value="${U.attr(g.path)}" ${chosen.has(g.path) ? "checked" : ""}>${U.cover(g, { cls: "sv-cover--xs" })}<span><b>${U.esc(g.title)}</b><small>${U.esc(g.platform)}</small></span><span class="sv-picker-check">${U.icon("check")}</span></label>`;
		const rows = games.map(row);
		const body = `<div class="sv-picker">
			<div class="sv-field sv-field--search">${U.icon("search")}<input type="search" class="sv-input" data-picker-q placeholder="Filtrar jogos" aria-label="Filtrar jogos"></div>
			<p class="sv-picker-count" data-picker-count></p>
			<div class="sv-picker-list">${rows.slice(0, 60).join("")}</div>
			${c.missing.length ? `<p class="sv-fineprint">Ao salvar, ${customJS.SteamVaultUI.plural(c.missing.length, "link para jogo inexistente será removido", "links para jogos inexistentes serão removidos")}: ${c.missing.map(x => U.esc(x)).join(", ")}.</p>` : ""}
		</div>`;
		const m = this.modal({ title: "Jogos da coleção", sub: c.title, size: "md", body, actions: `${U.btn("Cancelar", { kind: "ghost", attrs: "data-close" })}${U.btn("Salvar", { kind: "primary", attrs: "data-save" })}` });
		const list = m.el.querySelector(".sv-picker-list");
		let next = 60;
		const appendRows = n => {
			if (next >= rows.length || !list.isConnected) return;
			const tpl = document.createElement("template");
			tpl.innerHTML = rows.slice(next, next + n).join("");
			next += n;
			this._wireImages(tpl.content);
			const q = C.normalizeKey(m.el.querySelector("[data-picker-q]")?.value || "");
			if (q) tpl.content.querySelectorAll(".sv-picker-item").forEach(it => { it.hidden = !it.dataset.k.includes(q); });
			list.appendChild(tpl.content);
		};
		const flush = () => appendRows(Infinity);
		const later = fn => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 400 }) : setTimeout(fn, 32));
		const pump = () => { if (next < rows.length && list.isConnected) { appendRows(120); later(pump); } };
		later(pump);
		// a contagem vem do conjunto marcado (as linhas ainda não montadas também contam)
		const count = () => { m.el.querySelector("[data-picker-count]").textContent = `${customJS.SteamVaultUI.plural(chosen.size, "selecionado", "selecionados")}`; };
		count();
		m.el.addEventListener("change", e => { const i = e.target; if (i?.matches?.(".sv-picker-item input")) { if (i.checked) chosen.add(i.value); else chosen.delete(i.value); } count(); });
		m.el.querySelector("[data-picker-q]").addEventListener("input", e => {
			flush();
			const q = C.normalizeKey(e.target.value);
			m.el.querySelectorAll(".sv-picker-item").forEach(it => { it.hidden = q && !it.dataset.k.includes(q); });
		});
		m.el.querySelector("[data-save]").addEventListener("click", async () => {
			flush();
			const paths = [...m.el.querySelectorAll(".sv-picker-item input:checked")].map(i => i.value);
			const links = paths.map(p => { const f = app.vault.getAbstractFileByPath(p); return f ? `[[${app.metadataCache.fileToLinktext(f, path, true)}]]` : ""; }).filter(Boolean);
			try {
				await app.fileManager.processFrontMatter(file, fm => { fm.games = links; });
				m.close();
				this.toast("Coleção atualizada", { tone: "ok" });
			} catch (err) { this.toast(`Não foi possível salvar: ${err.message}`, { tone: "error" }); }
		});
	}

	// ============================================================ Steam
	steamConnect(ctx) {
		const { S, U } = ctx;
		const cfg = S.getConfig();
		const body = `<div class="sv-form">
			<p class="sv-modal-text">Cole o endereço do seu perfil na Steam Community. Funciona com URL personalizada (<code>/id/nome</code>) e com o SteamID64 (<code>/profiles/7656…</code>).</p>
			<label class="sv-label" for="sv-steam-url">Perfil Steam</label>
			<input id="sv-steam-url" class="sv-input sv-input--lg" value="${U.attr(cfg.input || cfg.profileUrl || "")}" placeholder="https://steamcommunity.com/id/seu-nome" autocomplete="off" spellcheck="false" autofocus>
			<p class="sv-formmsg" data-msg></p>
			<ul class="sv-privacy">
				<li>${U.icon("lock")}<span>Sem senha, login, cookies ou Steam Web API.</span></li>
				<li>${U.icon("eye")}<span>Só o que o perfil mostra publicamente. Perfil e “detalhes de jogos” precisam estar públicos.</span></li>
				<li>${U.icon("clock")}<span>Consultas espaçadas, com cache de 12 h e pausa automática se a Steam limitar.</span></li>
			</ul>
		</div>`;
		const m = this.modal({ title: "Conectar perfil Steam", size: "md", body, actions: `${U.btn("Cancelar", { kind: "ghost", attrs: "data-close" })}${U.btn("Verificar e salvar", { kind: "primary", attrs: "data-save" })}` });
		const msg = m.el.querySelector("[data-msg]");
		const input = m.el.querySelector("#sv-steam-url");
		const go = async () => {
			msg.className = "sv-formmsg"; msg.textContent = "Consultando o perfil público…";
			try {
				const r = await S.resolveProfile(input.value);
				if (!r.ok) { msg.className = "sv-formmsg is-error"; msg.textContent = S.message(r.code); return; }
				m.close();
				this.toast(r.isPublic ? `Conectado a ${r.profile.name}` : `Conectado a ${r.profile.name} — o perfil não é público, o sync fica indisponível`, { tone: r.isPublic ? "ok" : "warn" });
				if (r.isPublic) this.steamSyncAll(ctx, false);
			} catch (err) { msg.className = "sv-formmsg is-error"; msg.textContent = `${S.message("network")}: ${err.message}`; }
		};
		m.el.querySelector("[data-save]").addEventListener("click", go);
		input.addEventListener("keydown", e => { if (e.key === "Enter") go(); });
	}

	// ======================================================= RetroAchievements
	raConnect(ctx) {
		const { R, U } = ctx;
		if (!R) return this.toast("O módulo SteamVaultRetro.js não foi carregado", { tone: "error" });
		const cfg = R.getConfig();
		const body = `<div class="sv-form">
			<p class="sv-modal-text">Use seu nome de usuário e sua <b>Web API Key</b> do RetroAchievements (em retroachievements.org → Settings → Keys). Com isso a Game Library sincroniza perfil, jogos, prêmios e todas as conquistas sozinho.</p>
			<label class="sv-label" for="sv-ra-user">Usuário</label>
			<input id="sv-ra-user" class="sv-input sv-input--lg" value="${U.attr(cfg.user)}" placeholder="seu-usuario" autocomplete="off" autocapitalize="off" spellcheck="false" autofocus>
			<label class="sv-label" for="sv-ra-key" style="margin-top:14px">Web API Key</label>
			<input id="sv-ra-key" class="sv-input sv-input--lg" type="password" value="" placeholder="${U.attr(cfg.hasKey ? `Salva: ${cfg.maskedKey} (deixe vazio para manter)` : "Cole sua Web API Key")}" autocomplete="off" spellcheck="false">
			<label class="sv-switch"><input type="checkbox" id="sv-ra-auto" ${cfg.autoSync ? "checked" : ""}><span></span>Sincronizar automaticamente ao abrir (no máximo a cada 12 h)</label>
			<p class="sv-formmsg" data-msg></p>
			<ul class="sv-privacy">
				<li>${U.icon("lock")}<span>A chave fica só neste dispositivo — nunca em notas, logs ou no vault.</span></li>
				<li>${U.icon("link")}<span>Só a Web API oficial (retroachievements.org).</span></li>
				<li>${U.icon("clock")}<span>Consultas espaçadas, cache de 12 h e pausa automática se o RA limitar.</span></li>
			</ul>
		</div>`;
		const m = this.modal({ title: "Conectar RetroAchievements", size: "md", body,
			actions: `${cfg.configured ? U.btn("Desconectar", { kind: "ghost", attrs: "data-disc" }) : ""}${U.btn("Cancelar", { kind: "ghost", attrs: "data-close" })}${U.btn("Verificar e salvar", { kind: "ra", attrs: "data-save" })}` });
		const msg = m.el.querySelector("[data-msg]");
		m.el.querySelector("[data-disc]")?.addEventListener("click", () => { m.close(); this._action("ra-disconnect", m.el, document.body, ctx); });
		const go = async () => {
			msg.className = "sv-formmsg"; msg.textContent = "Verificando no RetroAchievements…";
			try {
				const key = m.el.querySelector("#sv-ra-key").value.trim();
				const r = await R.connect(m.el.querySelector("#sv-ra-user").value, key || null);
				if (!r.ok) { msg.className = "sv-formmsg is-error"; msg.textContent = R.message(r.code); return; }
				await R.saveConfig({ autoSync: m.el.querySelector("#sv-ra-auto").checked });
				m.close();
				this.toast(`Conectado a ${r.profile.user}`, { tone: "ok", icon: "b-retro" });
				this.raSyncAll(ctx, false);
			} catch (err) { msg.className = "sv-formmsg is-error"; msg.textContent = err.message; }
		};
		m.el.querySelector("[data-save]").addEventListener("click", go);
		m.el.querySelectorAll("input").forEach(i => i.addEventListener("keydown", e => { if (e.key === "Enter") go(); }));
	}

	async raSyncAll(ctx, force) {
		const { R } = ctx;
		if (!R) return;
		if (!R.getConfig().configured) return this.raConnect(ctx);
		if (window.__svRaSyncRunning) return this.toast("Já existe uma sincronização do RetroAchievements em andamento", { tone: "warn" });
		const t = this.toast("Lendo seu perfil no RetroAchievements…", { sticky: true, icon: "b-retro", progress: 0 });
		try {
			const r = await R.syncAll({ force, onProgress: ({ index, total, name }) => t.update(total > 1 ? `RA: ${name} (${index}/${total})` : "RA: perfil, jogos e prêmios…", { progress: total > 1 ? (index / total) * 100 : 8 }) });
			if (!r.ok) t.update(R.message(r.code), { tone: r.code === "rate_limited" ? "warn" : "error" });
			else {
				const parts = [`${customJS.SteamVaultUI.plural(r.games, "jogo", "jogos")} no perfil`];
				if (r.synced) parts.push(`${customJS.SteamVaultUI.plural(r.synced, "ficha atualizada", "fichas atualizadas")}`);
				if (r.created) parts.push(`${customJS.SteamVaultUI.plural(r.created, "conquista nova", "conquistas novas")}`);
				if (r.linked) parts.push(`${customJS.SteamVaultUI.plural(r.linked, "jogo ligado", "jogos ligados")} pelo título`);
				if (r.failed) parts.push(`${r.failed} com falha`);
				t.update(`RetroAchievements: ${parts.join(", ")}`, { tone: r.failed ? "warn" : "ok" });
			}
		} catch (err) { t.update(`RetroAchievements: ${err.message}`, { tone: "error" }); }
		t.close(5000);
		this.refresh();
	}

	async raSyncGame(ctx, path) {
		const { R } = ctx;
		if (!R?.getConfig().configured) return this.raConnect(ctx);
		const file = app.vault.getAbstractFileByPath(path);
		if (!file) return;
		const t = this.toast(`RA: sincronizando ${file.basename}…`, { sticky: true, icon: "b-retro" });
		try {
			const r = await R.syncGame(file, { force: true });
			t.update(r.ok ? `${file.basename}: ${r.unlocked} de ${r.total} conquistas${r.created ? `, ${customJS.SteamVaultUI.plural(r.created, "nova", "novas")}` : ""}` : `${file.basename}: ${R.message(r.code)}`, { tone: r.ok ? "ok" : "warn" });
		} catch (err) { t.update(`RA: ${err.message}`, { tone: "error" }); }
		t.close(5000);
		this.refresh();
	}

	async raImport(ctx, ids, el) {
		const { R } = ctx;
		if (!R?.getConfig().configured) return this.raConnect(ctx);
		const cache = await R.readCache();
		const inVault = new Set(R.vaultGames().map(x => String(x.fm.raGameId || "")).filter(Boolean));
		const all = cache?.completion || [];
		const list = ids ? all.filter(x => ids.includes(String(x.gameId))) : all.filter(x => !inVault.has(String(x.gameId)) && x.unlocked > 0);
		if (!list.length) return this.toast("Nada para adicionar", { tone: "warn" });
		if (list.length > 1) {
			const ok = await this.confirm({ title: `Adicionar ${list.length} jogos ao vault?`, text: "Cada jogo vira uma ficha com schema completo e já sincroniza as conquistas do RetroAchievements. Pode levar alguns minutos.", confirm: "Adicionar" });
			if (!ok) return;
		}
		if (el) el.disabled = true;
		const t = this.toast("RA: criando fichas…", { sticky: true, icon: "b-retro", progress: 0 });
		try {
			const r = await R.importMany(list, ({ index, total, name }) => t.update(`RA: ${name} (${index}/${total})`, { progress: (index / total) * 100 }));
			t.update(`RetroAchievements: ${customJS.SteamVaultUI.plural(r.done, "ficha criada", "fichas criadas")}${r.failed ? `, ${r.failed} com falha` : ""}`, { tone: r.failed ? "warn" : "ok" });
			if (list.length === 1 && r.done) {
				const f = R.vaultGames().find(x => String(x.fm.raGameId) === String(list[0].gameId));
				if (f) setTimeout(() => this.open(f.f.path, ctx), 400);
			}
		} catch (err) { t.update(`RA: ${err.message}`, { tone: "error" }); }
		t.close(5000);
		this.refresh();
	}

	// preços da lista de desejos, agora (ignora o intervalo de 12 h)
	async wishlistPrices(ctx, el) {
		const PK = ctx.PK;
		if (!PK?.checkWishlist) return;
		if (!PK._online()) return this.toast("Sem conexão com a internet", { tone: "warn" });
		const games = ctx.model.games.filter(g => g.status === "Wishlist" && (!el?.dataset.path || g.path === el.dataset.path));
		if (!games.length) return this.toast("A lista de desejos está vazia", { tone: "warn" });
		if (el) el.disabled = true;
		const t = this.toast("Verificando preços…", { sticky: true, icon: "bell", progress: 0 });
		const r = await PK.checkWishlist({ ...ctx.model, games }, { force: true, onProgress: ({ index, total, name }) => t.update(`Preços: ${name} (${index}/${total})`, { progress: (index / total) * 100 }) }).catch(err => ({ ok: false, err }));
		if (!r?.ok) t.update("Não foi possível verificar os preços agora", { tone: "error" });
		else t.update(r.alerts.length ? `${ctx.U.plural(r.alerts.length, "jogo chegou", "jogos chegaram")} ao preço-alvo` : `Preços atualizados (${ctx.U.plural(r.checked, "jogo", "jogos")})`, { tone: "ok" });
		t.close(3500);
		if (r?.alerts?.length) PK._announcePrices(r.alerts);
		window.__svWishChecked = true;
		this.refresh();
	}

	// jogos do perfil público → fichas (um ou todos da lista "fora do vault")
	async steamImport(ctx, appId, el) {
		const { S } = ctx;
		if (!S.getConfig().configured) return this.steamConnect(ctx);
		const all = window.__svSteamMissing || [];
		const list = appId ? all.filter(x => String(x.appId) === String(appId)) : all;
		if (!list.length) return this.toast("Nada para adicionar", { tone: "warn" });
		if (list.length > 1) {
			const ok = await this.confirm({ title: `Adicionar ${list.length} jogos ao vault?`, text: "Cada jogo vira uma ficha com o schema completo, sincroniza as conquistas do seu perfil público e baixa capa, fundo e logo da loja. Pode levar alguns minutos (a Steam é consultada com calma).", confirm: "Adicionar" });
			if (!ok) return;
		}
		if (el) el.disabled = true;
		const t = this.toast("Steam: criando fichas…", { sticky: true, progress: 0 });
		try {
			const r = await S.importOwned(list, ({ index, total, name }) => t.update(`Steam: ${name} (${index}/${total})`, { progress: (index / total) * 100 }));
			t.update(`Steam: ${customJS.SteamVaultUI.plural(r.done, "ficha criada", "fichas criadas")}${r.failed ? `, ${r.failed} com falha` : ""}`, { tone: r.failed ? "warn" : "ok" });
			window.__svSteamMissing = all.filter(x => !list.includes(x));
			if (list.length === 1 && r.done) {
				const g = ctx.C.model(ctx.dv).games.find(x => x.steamAppId === String(list[0].appId));
				if (g) setTimeout(() => this.open(g.path, ctx), 400);
			}
		} catch (err) { t.update(`Steam: ${err.message}`, { tone: "error" }); }
		t.close(5000);
		this.refresh();
	}

	// capa, fundo e logo da loja Steam para um jogo (ou todos os que faltam)
	// 3.63.0: completa gêneros, desenvolvedora, publicadora, ano e sinopse com
	// os dados públicos da loja Steam (a mesma API de appdetails já usada para
	// o nome e as artes; sem login). Nada é sobrescrito sem escolha: a janela
	// mostra o valor atual e o da Steam, e só os campos vazios vêm marcados.
	async steamDetails(ctx, path) {
		const { U, C } = ctx;
		const L = this.mods().L;
		const g = ctx.model.gamesByPath.get(path);
		if (!g?.steamAppId) return this.toast("Este jogo não tem AppID da Steam", { tone: "warn" });
		const f = app.vault.getAbstractFileByPath(path);
		if (!f || !L?._steamFetchText) return this.toast("Ficha não encontrada", { tone: "error" });
		const t = this.toast("Buscando os dados na loja Steam…", { sticky: true, icon: "refresh" });
		let d = null;
		try {
			const text = await L._steamFetchText(`https://store.steampowered.com/api/appdetails?appids=${encodeURIComponent(g.steamAppId)}&cc=br&l=portuguese`, { "Accept": "application/json,text/plain,*/*" });
			const node = JSON.parse(text)?.[String(g.steamAppId)];
			d = node?.success && node.data ? node.data : null;
		} catch (_) { d = null; }
		t.close(0);
		if (!d) return this.toast("A loja Steam não respondeu ou não tem dados deste jogo", { tone: "warn" });
		const fm = app.metadataCache?.getFileCache?.(f)?.frontmatter || ctx.dv?.page?.(path) || {};
		const str = v => (v === undefined || v === null ? "" : String(v)).trim();
		const arr = v => (Array.isArray(v) ? v : v ? [v] : []).map(x => str(x)).filter(Boolean);
		const clean = s => (L._htmlDecode ? L._htmlDecode(String(s || "").replace(/<[^>]+>/g, " ")) : String(s || "")).replace(/\s+/g, " ").trim();
		const year = (String(d.release_date?.date || "").match(/(?:19|20)\d{2}/) || [])[0];
		// data completa ("24 mar. 2023", "24 de mar. de 2023", "Mar 24, 2023");
		// "Em breve" ou só o trimestre não viram data
		const relIso = (() => {
			const mo = { jan: 1, fev: 2, feb: 2, mar: 3, abr: 4, apr: 4, mai: 5, may: 5, jun: 6, jul: 7, ago: 8, aug: 8, set: 9, sep: 9, out: 10, oct: 10, nov: 11, dez: 12, dec: 12 };
			const raw = String(d.release_date?.date || "").toLowerCase();
			let m = raw.match(/(\d{1,2})\s*(?:de\s*)?([a-z]{3})[a-zç]*\.?\s*(?:de\s*)?((?:19|20)\d{2})/);
			if (!m) { const n = raw.match(/([a-z]{3})[a-z]*\.?\s*(\d{1,2}),?\s*((?:19|20)\d{2})/); if (n) m = [n[0], n[2], n[1], n[3]]; }
			return m && mo[m[2]] ? `${m[3]}-${String(mo[m[2]]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}` : "";
		})();
		const rows = [
			{ k: "genre", label: "Gêneros", cur: arr(fm.genre), val: [...new Set((d.genres || []).map(x => clean(x.description)).filter(Boolean))] },
			{ k: "developer", label: "Desenvolvedora", cur: str(fm.developer), val: (d.developers || []).map(clean).filter(Boolean).join(", ") },
			{ k: "publisher", label: "Publicadora", cur: str(fm.publisher), val: (d.publishers || []).map(clean).filter(Boolean).join(", ") },
			{ k: "releaseYear", label: "Ano de lançamento", cur: str(fm.releaseYear), val: year ? Number(year) : "" },
			{ k: "releaseDate", label: "Data de lançamento", cur: C.iso(fm.releaseDate) || "", val: relIso },
			{ k: "summary", label: "Sinopse", cur: str(fm.summary), val: clean(d.short_description) }
		].filter(r => Array.isArray(r.val) ? r.val.length : str(r.val));
		const show = v => Array.isArray(v) ? v.join(", ") : str(v);
		const same = r => C.normalizeKey(show(r.cur)) === C.normalizeKey(show(r.val));
		const todo = rows.filter(r => !same(r));
		if (!todo.length) return this.toast(rows.length ? "Os dados da ficha já batem com a Steam" : "A loja Steam não tem esses dados para este jogo", { tone: rows.length ? "ok" : "warn" });
		const body = document.createElement("div");
		body.className = "sv-sdetails";
		body.innerHTML = `<p class="sv-sdetails-intro">Marque o que deve ir para a ficha. Campos vazios já vêm marcados; os preenchidos só mudam se você marcar.</p>
			<ul class="sv-sdetails-list">${todo.map((r, i) => { const empty = !show(r.cur); return `<li><label class="sv-sdetails-row">
				<input type="checkbox" data-sd="${i}"${empty ? " checked" : ""}>
				<span class="sv-sdetails-text"><b>${U.esc(r.label)}</b>
					<span class="sv-sdetails-new">${U.esc(r.k === "releaseDate" ? U.fmtDate(r.val) : show(r.val))}</span>
					<small>${empty ? "Vazio na ficha" : `Na ficha: ${U.esc(r.k === "releaseDate" ? U.fmtDate(r.cur) : show(r.cur))}`}</small></span>
			</label></li>`; }).join("")}</ul>`;
		const m = this.modal({ title: "Completar dados pela Steam", sub: g.title, size: "sm", body, actions: `${U.btn("Cancelar", { kind: "ghost", attrs: "data-close" })}${U.btn("Aplicar", { kind: "primary", icon: "check", attrs: "data-sd-apply" })}` });
		m.el.querySelector("[data-sd-apply]").addEventListener("click", async () => {
			const pick = [...body.querySelectorAll("[data-sd]:checked")].map(x => todo[Number(x.dataset.sd)]);
			if (!pick.length) { m.close(); return; }
			try {
				await app.fileManager.processFrontMatter(f, front => { for (const r of pick) front[r.k] = Array.isArray(r.val) ? [...r.val] : r.val; });
				m.close();
				this.toast(`${U.plural(pick.length, "campo atualizado", "campos atualizados")} com os dados da Steam`, { tone: "ok", icon: "check" });
				C.invalidate?.();
				this.refresh();
			} catch (err) {
				console.error("Game Library: completar dados pela Steam", err);
				this.toast("Não foi possível gravar na ficha", { tone: "error" });
			}
		});
	}

	async steamArt(ctx, paths, el) {
		const { S, C } = ctx;
		const games = paths ? paths.map(p => ctx.model.gamesByPath.get(p)).filter(Boolean)
			: ctx.model.games.filter(g => g.steamAppId && (!g.images.cover || !g.images.background || !g.images.logoFile));
		if (!games.length) return this.toast("Todos os jogos Steam já têm arte", { tone: "ok", icon: "image" });
		if (el) el.disabled = true;
		const t = this.toast("Baixando artes da Steam…", { sticky: true, icon: "image", progress: 0 });
		let saved = 0, none = 0;
		for (let i = 0; i < games.length; i++) {
			const g = games[i];
			t.update(`Artes: ${g.title} (${i + 1}/${games.length})`, { progress: ((i + 1) / games.length) * 100 });
			const f = app.vault.getAbstractFileByPath(g.path);
			const r = f ? await S.fetchArt(f, { force: !!paths }).catch(() => ({ ok: false })) : { ok: false };
			if (r.ok) saved++; else none++;
		}
		t.update(saved ? `Artes atualizadas em ${ctx.U.plural(saved, "jogo", "jogos")}${none ? `; ${none} sem arte na loja` : ""}` : "A loja Steam não tem artes para estes jogos", { tone: saved ? "ok" : "warn" });
		t.close(4000);
		C.invalidate();
		this.refresh();
	}

	async steamSyncAll(ctx, force) {
		const { S } = ctx;
		if (!S.getConfig().configured) return this.steamConnect(ctx);
		if (window.__svSyncRunning) return this.toast("Já existe uma sincronização em andamento", { tone: "warn" });
		const t = this.toast("Lendo o perfil público da Steam…", { sticky: true, icon: "refresh", progress: 0 });
		try {
			const r = await S.syncAll({ force, onProgress: ({ index, total, name }) => t.update(`Sincronizando ${name} (${index}/${total})`, { progress: (index / Math.max(1, total)) * 100 }) });
			if (!r.ok) t.update(S.message(r.code), { tone: r.code === "rate_limited" ? "warn" : "error" });
			else {
				const parts = [`${customJS.SteamVaultUI.plural(r.synced, "jogo sincronizado", "jogos sincronizados")}`];
				if (r.skipped) parts.push(`${r.skipped} em cache`);
				if (r.failed) parts.push(`${customJS.SteamVaultUI.plural(r.failed, "indisponível", "indisponíveis")}`);
				if (r.created) parts.push(`${customJS.SteamVaultUI.plural(r.created, "conquista nova", "conquistas novas")}`);
				t.update(`Steam: ${parts.join(", ")}`, { tone: r.failed ? "warn" : "ok" });
			}
		} catch (err) {
			t.update(`${S.message("network")}: ${err.message}`, { tone: "error" });
		}
		t.close(5000);
		this.refresh();
	}

	async steamSyncGame(ctx, path) {
		const { S } = ctx;
		if (!S.getConfig().configured) return this.steamConnect(ctx);
		const file = app.vault.getAbstractFileByPath(path);
		if (!file) return;
		const t = this.toast(`Sincronizando ${file.basename}…`, { sticky: true, icon: "refresh" });
		try {
			const r = await S.syncGame(file, { force: true });
			t.update(r.ok ? `${file.basename}: ${S.message("ok")}${r.created ? `, ${customJS.SteamVaultUI.plural(r.created, "conquista nova", "conquistas novas")}` : ""}` : `${file.basename}: ${S.message(r.code)}`, { tone: r.ok ? "ok" : "warn" });
		} catch (err) { t.update(`${S.message("network")}: ${err.message}`, { tone: "error" }); }
		t.close(5000);
		this.refresh();
	}
}
