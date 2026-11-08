// ===================================================================
// Game Library — Personalização da Interface (3.58.0)
// ===================================================================
// Central em Configurações › Personalização da Interface:
//   · modelos visuais (miniaturas) para Início, fichas, cards, banners,
//     Biblioteca, temas e organização das seções;
//   · RASCUNHO temporário: nada é gravado até "Aplicar"; "Cancelar"
//     descarta; "Restaurar o original" volta ao padrão (também via Aplicar);
//   · pré-visualização REAL num iframe isolado: os mesmos renderizadores do
//     app (Início, ficha, cards, heros) com os seus jogos, no tamanho de
//     celular ou de computador — os pontos de corte valem de verdade;
//   · combinações (presets) prontas e salvas pela pessoa.
// Guarda só preferências (SteamVaultUI._store): "layout", "layoutPresets",
// e as já existentes "theme", "accent" e "homeLayout". Nunca toca nas notas.
// Acesso: customJS.SteamVaultLook
// ===================================================================

class SteamVaultLook {
	get U() { return customJS.SteamVaultUI; }

	// ------------------------------------------------------------ áreas
	areas() {
		return [
			["home", "Tela inicial", "home"], ["game", "Fichas", "gamepad"], ["cards", "Cards", "grid"],
			["banners", "Banners", "image"], ["library", "Biblioteca", "books"], ["theme", "Temas", "sparkles"],
			["layout", "Organização", "list"]
		];
	}

	// controles de cada área. visual = miniaturas; seg = botões; adv = vai
	// para "Mais ajustes"; when = só aparece quando faz sentido
	controls(area) {
		const yes = [["on", "Mostrar"], ["off", "Ocultar"]];
		const all = {
			home: [
				{ key: "home.hero", label: "Modelo do destaque", type: "visual", thumb: "home", values: [["original", "Original", "Arte inteira, capa sobreposta"], ["split", "Carrossel com capa", "Capa vertical à esquerda, informações à direita"], ["cinema", "Cinematográfico", "Banner amplo com título sobre a arte"], ["horizontal", "Horizontal", "Arte de fundo, conteúdo na lateral"], ["cards", "Cards em destaque", "Grade de cards com os destaques"]] },
				{ key: "home.height", label: "Altura do destaque", type: "seg", values: [["sm", "Baixa"], ["md", "Média"], ["lg", "Alta"]], when: d => d.layout.home.hero !== "cards" },
				{ key: "home.content", label: "Posição do conteúdo (computador)", type: "seg", values: [["side", "Na lateral"], ["bottom", "Embaixo"]], when: d => d.layout.home.hero === "horizontal", hint: "No celular o conteúdo fica sempre embaixo da arte." },
				{ key: "home.cards", label: "Formato dos cards", type: "seg", values: [["landscape", "Horizontal"], ["portrait", "Vertical"], ["square", "Quadrado"]], when: d => d.layout.home.hero === "cards" },
				{ key: "home.perRow", label: "Cards por linha (computador)", type: "seg", values: [["2", "2"], ["3", "3"], ["4", "4"]], when: d => d.layout.home.hero === "cards" },
				{ key: "home.count", label: "Jogos em destaque", type: "seg", values: [["all", "Todos"], ["3", "3"], ["5", "5"]] },
				{ key: "home.autoplay", label: "Trocar sozinho", type: "seg", values: [["on", "Sim"], ["off", "Não"]], adv: true, when: d => d.layout.home.hero !== "cards", hint: "Pausa ao tocar ou passar o mouse e respeita Reduzir animações." },
				{ key: "home.interval", label: "Intervalo", type: "seg", values: [["5", "5 s"], ["8", "8 s"], ["12", "12 s"]], adv: true, when: d => d.layout.home.hero !== "cards" && d.layout.home.autoplay === "on" }
			],
			game: [
				{ key: "game.model", label: "Modelo da ficha", type: "visual", thumb: "game", values: [["original", "Original", "O formato atual"], ["split", "Split Hero", "Capa à esquerda, informações e descrição à direita"], ["cinema", "Cinematográfico", "Banner amplo e imersivo, números abaixo"], ["minimal", "Minimalista", "Sem arte de fundo, só o essencial"], ["editorial", "Editorial", "Banner contido, tipografia grande, blocos"]] },
				{ key: "game.cover", label: "Capa", type: "seg", values: [["left", "Esquerda"], ["right", "Direita"], ["hidden", "Ocultar"]] },
				{ key: "game.coverSize", label: "Tamanho da capa", type: "seg", values: [["sm", "Pequena"], ["md", "Média"], ["lg", "Grande"]], when: d => d.layout.game.cover !== "hidden" },
				{ key: "game.banner", label: "Altura do banner", type: "seg", values: [["sm", "Baixa"], ["md", "Média"], ["lg", "Alta"], ["xl", "Tela cheia"]], when: d => d.layout.game.model !== "minimal" },
				{ key: "game.stats", label: "Números", type: "seg", values: [["row", "Em linha"], ["grid", "Em blocos"], ["compact", "Compactos"]] },
				{ key: "game.desc", label: "Descrição no topo", type: "seg", values: [["auto", "Automática"], ["on", "Mostrar"], ["off", "Ocultar"]] },
				{ key: "game.align", label: "Alinhamento", type: "seg", values: [["left", "À esquerda"], ["center", "Centralizado"]], adv: true },
				{ key: "game.width", label: "Largura do banner", type: "seg", values: [["full", "Inteira"], ["contained", "Contida"]], adv: true, when: d => !["minimal", "editorial"].includes(d.layout.game.model) },
				{ key: "game.actions", label: "Botões (computador)", type: "seg", values: [["inline", "Lado a lado"], ["full", "Largura total"]], adv: true, hint: "No celular os botões já ocupam a largura toda." },
				{ key: "game.tabs", label: "Abas", type: "seg", values: [["underline", "Sublinhadas"], ["pills", "Pílulas"], ["segmented", "Segmentadas"]], adv: true },
				{ key: "game.spacing", label: "Espaçamento", type: "seg", values: [["compact", "Compacto"], ["normal", "Normal"], ["airy", "Amplo"]], adv: true }
			],
			cards: [
				{ key: "cards.style", label: "Formato dos cards", type: "visual", thumb: "cards", values: [["original", "Vertical", "Capa com texto abaixo (original)"], ["horizontal", "Horizontal", "Capa pequena e texto ao lado"], ["square", "Quadrado", "Capa recortada em 1:1"], ["compact", "Compacto", "Mais jogos por linha"], ["cover", "Só a capa", "Sem texto"], ["overlay", "Texto sobre a capa", "Título por cima da arte"], ["below", "Painel", "Capa e informações num bloco"], ["cinema", "Cinematográfico", "Arte horizontal do jogo"]] },
				{ key: "cards.size", label: "Tamanho", type: "seg", values: [["sm", "Pequeno"], ["md", "Médio"], ["lg", "Grande"]] },
				{ key: "cards.status", label: "Status", type: "seg", values: yes },
				{ key: "cards.rating", label: "Nota", type: "seg", values: yes },
				{ key: "cards.meta", label: "Conquistas e progresso", type: "seg", values: yes, adv: true },
				{ key: "cards.radius", label: "Cantos", type: "seg", values: [["square", "Retos"], ["default", "Padrão"], ["round", "Arredondados"]], adv: true },
				{ key: "cards.border", label: "Contorno", type: "seg", values: [["off", "Sem"], ["on", "Com"]], adv: true },
				{ key: "cards.shadow", label: "Sombra", type: "seg", values: [["none", "Sem"], ["default", "Suave"], ["strong", "Forte"]], adv: true },
				{ key: "cards.library", label: "Na Biblioteca", type: "seg", values: [["same", "Usar este formato"], ["original", "Manter o original"]], adv: true }
			],
			banners: [
				{ key: "banners.gradient", label: "Véu sobre a arte", type: "visual", thumb: "grad", values: [["default", "Padrão", "Equilíbrio entre arte e leitura"], ["soft", "Suave", "Mais arte aparecendo"], ["strong", "Forte", "Mais contraste no texto"], ["none", "Sem véu", "A arte sem efeitos"]] },
				{ key: "banners.position", label: "Enquadramento", type: "seg", values: [["auto", "Do jogo"], ["top", "Topo"], ["center", "Centro"], ["bottom", "Base"]], hint: "\"Do jogo\" usa o enquadramento salvo em Capa e fundo de cada ficha." },
				{ key: "banners.fit", label: "Ajuste da imagem", type: "seg", values: [["cover", "Preencher"], ["contain", "Inteira"]], hint: "Inteira mostra a arte toda, sem cortes (pode sobrar fundo)." }
			],
			library: [
				{ key: "library.size", label: "Tamanho das capas na grade", type: "seg", values: [["sm", "Pequenas"], ["md", "Médias"], ["lg", "Grandes"]] },
				{ key: "library.density", label: "Densidade da grade", type: "seg", values: [["compact", "Compacta"], ["normal", "Normal"], ["airy", "Ampla"]] },
				{ key: "library.list", label: "Lista", type: "seg", values: [["normal", "Detalhada"], ["compact", "Compacta"]] }
			],
			layout: [
				{ key: "home.spacing", label: "Espaço entre as seções da Início", type: "seg", values: [["compact", "Compacto"], ["normal", "Normal"], ["airy", "Amplo"]] },
				{ key: "home.shelf", label: "Tamanho das capas nas faixas da Início", type: "seg", values: [["sm", "Pequenas"], ["md", "Médias"], ["lg", "Grandes"]] },
				{ key: "home.items", label: "Jogos por faixa", type: "seg", values: [["few", "Poucos"], ["normal", "Normal"], ["many", "Muitos"]] },
				{ type: "sections" },
				{ type: "tabs" }
			]
		};
		return all[area] || [];
	}

	// ------------------------------------------------------- miniaturas
	// desenhos em SVG (80 × 50): a = arte, c = capa, t = título, m = texto,
	// k = destaque (botão/barra), s = painel, g = véu
	thumb(kind, v) {
		const R = (x, y, w, h, c, r = 1.5) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" class="${c}"/>`;
		const covers3 = (y, h, w, c = "c") => [6, 32, 58].map(x => R(x, y, w, h, c)).join("");
		const D = {
			"home:original": R(0, 0, 80, 50, "a", 0) + R(0, 30, 80, 20, "g", 0) + R(6, 22, 14, 21, "c") + R(24, 30, 30, 4, "t") + R(24, 37, 22, 3, "m") + R(24, 42, 12, 4, "k"),
			"home:split": R(0, 0, 80, 50, "s", 0) + R(8, 9, 19, 28, "c") + R(33, 11, 34, 5, "t") + R(33, 20, 40, 3, "m") + R(33, 25, 32, 3, "m") + R(33, 31, 14, 5, "k") + R(34, 44, 6, 2, "k", 1) + R(42, 44, 3, 2, "m", 1) + R(47, 44, 3, 2, "m", 1),
			"home:cinema": R(0, 0, 80, 36, "a", 0) + R(0, 22, 80, 14, "g", 0) + R(6, 20, 44, 7, "t") + R(6, 30, 28, 3, "m") + R(6, 39, 14, 5, "k") + R(23, 39, 8, 5, "m"),
			"home:horizontal": R(0, 0, 80, 50, "a", 0) + R(0, 0, 40, 50, "g", 0) + R(6, 15, 28, 5, "t") + R(6, 24, 24, 3, "m") + R(6, 29, 18, 3, "m") + R(6, 36, 12, 5, "k"),
			"home:cards": R(4, 9, 22, 15, "a") + R(29, 9, 22, 15, "a") + R(54, 9, 22, 15, "a") + R(4, 28, 16, 3, "t") + R(29, 28, 16, 3, "t") + R(54, 28, 16, 3, "t") + R(4, 34, 11, 2, "m") + R(29, 34, 11, 2, "m") + R(54, 34, 11, 2, "m"),
			"game:original": R(0, 0, 80, 31, "a", 0) + R(6, 17, 14, 21, "c") + R(24, 21, 30, 5, "t") + R(24, 29, 36, 3, "m") + R(0, 42, 80, 1, "m", 0) + R(24, 45, 10, 2, "k", 1) + R(38, 45, 10, 2, "m", 1),
			"game:split": R(0, 0, 80, 50, "s", 0) + R(7, 8, 19, 28, "c") + R(32, 9, 34, 5, "t") + R(32, 18, 40, 2.5, "m") + R(32, 22, 38, 2.5, "m") + R(32, 26, 30, 2.5, "m") + R(32, 32, 12, 5, "k") + R(0, 42, 80, 1, "m", 0),
			"game:cinema": R(0, 0, 80, 38, "a", 0) + R(0, 24, 80, 14, "g", 0) + R(6, 25, 10, 14, "c") + R(19, 26, 42, 6, "t") + R(19, 34, 26, 2.5, "m") + R(6, 43, 14, 4, "k") + R(24, 43, 14, 4, "m") + R(42, 43, 14, 4, "m"),
			"game:minimal": R(0, 0, 80, 50, "s", 0) + R(8, 9, 15, 22, "c") + R(28, 12, 32, 5, "t") + R(28, 21, 24, 3, "m") + R(28, 27, 12, 4, "k") + R(8, 38, 64, 1, "m", 0) + R(8, 42, 10, 2, "m", 1) + R(22, 42, 10, 2, "m", 1),
			"game:editorial": R(0, 0, 80, 50, "s", 0) + R(5, 4, 70, 19, "a", 3) + R(10, 15, 15, 22, "c") + R(29, 26, 42, 6, "t") + R(29, 35, 36, 2.5, "m") + R(29, 39, 30, 2.5, "m") + R(10, 44, 18, 3, "k"),
			"cards:original": covers3(5, 25, 16) + [6, 32, 58].map(x => R(x, 33, 14, 3, "t") + R(x, 38, 9, 2, "m")).join(""),
			"cards:horizontal": [5, 19, 33].map(y => R(4, y, 72, 12, "s") + R(6, y + 2, 6, 8, "c", 1) + R(16, y + 3, 30, 3, "t") + R(16, y + 7.5, 18, 2, "m")).join(""),
			"cards:square": [6, 32, 58].map(x => R(x, 8, 17, 17, "c") + R(x, 29, 14, 3, "t") + R(x, 34, 9, 2, "m")).join(""),
			"cards:compact": [4, 17, 30, 43, 56, 69].map(x => R(x, 10, 10, 15, "c", 1) + R(x, 28, 9, 2, "t", 1)).join("") + [4, 17, 30, 43, 56, 69].map(x => R(x, 33, 10, 12, "c", 1)).join(""),
			"cards:cover": [5, 30, 55].map(x => R(x, 6, 20, 30, "c")).join(""),
			"cards:overlay": [5, 30, 55].map(x => R(x, 6, 20, 30, "c") + R(x, 26, 20, 10, "g", 0) + R(x + 2, 28, 14, 2.5, "t") + R(x + 2, 32, 9, 2, "m")).join(""),
			"cards:below": [5, 30, 55].map(x => R(x, 5, 20, 38, "s", 2) + R(x, 5, 20, 24, "c", 2) + R(x + 2, 32, 14, 3, "t") + R(x + 2, 37, 10, 2, "m")).join(""),
			"cards:cinema": R(4, 8, 34, 20, "a") + R(42, 8, 34, 20, "a") + R(4, 20, 34, 8, "g", 0) + R(42, 20, 34, 8, "g", 0) + R(6, 22, 20, 3, "t") + R(44, 22, 20, 3, "t") + R(4, 32, 34, 12, "a") + R(42, 32, 34, 12, "a"),
			"grad:default": R(0, 0, 80, 50, "a", 0) + R(0, 0, 80, 50, "g g2", 0) + R(6, 30, 34, 5, "t") + R(6, 38, 24, 3, "m"),
			"grad:soft": R(0, 0, 80, 50, "a", 0) + R(0, 0, 80, 50, "g g1", 0) + R(6, 30, 34, 5, "t") + R(6, 38, 24, 3, "m"),
			"grad:strong": R(0, 0, 80, 50, "a", 0) + R(0, 0, 80, 50, "g g3", 0) + R(6, 30, 34, 5, "t") + R(6, 38, 24, 3, "m"),
			"grad:none": R(0, 0, 80, 50, "a", 0) + R(6, 30, 34, 5, "t") + R(6, 38, 24, 3, "m")
		};
		return `<svg class="sv-lth" viewBox="0 0 80 50" aria-hidden="true" focusable="false">${D[`${kind}:${v}`] || ""}</svg>`;
	}

	// ------------------------------------------------------- rascunho
	_saved() {
		const U = this.U;
		return {
			layout: U.layoutClean(U._store("layout") || ""),
			theme: U._store("theme") || "steam",
			accent: U._store("accent") || "blue",
			homeLayout: U._store("homeLayout") || ""
		};
	}
	_defaults() { return { layout: this.U.layoutDefaults(), theme: "steam", accent: "blue", homeLayout: "" }; }
	_clone(x) { return JSON.parse(JSON.stringify(x)); }
	_key(d) { return JSON.stringify([d.layout, d.theme, d.accent, this._homeNorm(d.homeLayout)]); }
	_homeNorm(raw) { try { const o = JSON.parse(raw || "{}") || {}; return { order: Array.isArray(o.order) ? o.order : [], hidden: Array.isArray(o.hidden) ? o.hidden : [] }; } catch (_) { return { order: [], hidden: [] }; } }
	_get(d, key) { const [a, b] = key.split("."); return d.layout[a]?.[b]; }
	_set(d, key, v) { const [a, b] = key.split("."); d.layout[a][b] = v; }

	// ------------------------------------------------------- presets
	presets() {
		let mine = [];
		try { mine = JSON.parse(this.U._store("layoutPresets") || "[]"); } catch (_) { mine = []; }
		if (!Array.isArray(mine)) mine = [];
		return mine.filter(p => p && typeof p === "object" && p.id && p.name).map(p => ({ ...p, mine: true }));
	}
	_savePresets(list) {
		const clean = list.map(p => ({ id: String(p.id), name: String(p.name).slice(0, 48), layout: this.U.layoutClean(p.layout), theme: p.theme || "", accent: p.accent || "", homeLayout: typeof p.homeLayout === "string" ? p.homeLayout : "" }));
		this.U._store("layoutPresets", JSON.stringify(clean.slice(0, 24)));
	}
	_fromPreset(p, base) {
		const U = this.U;
		return {
			layout: p.mine ? U.layoutClean(p.layout) : U.layoutFrom(p.layout),
			theme: p.theme && U.themes()[p.theme] ? p.theme : (p.id === "original" ? "steam" : base.theme),
			accent: p.accent && U.accents()[p.accent] ? p.accent : (p.id === "original" ? "blue" : base.accent),
			homeLayout: p.mine ? (p.homeLayout || "") : (p.id === "original" ? "" : base.homeLayout)
		};
	}

	// ------------------------------------------------------- seção
	section(ctx) {
		const { U } = ctx;
		return `<section class="sv-surface sv-look" data-look>
			<h3>Personalização da Interface</h3>
			<p class="sv-muted">Escolha como a Início, as fichas, os cards e os banners são montados. Veja o resultado na prévia, com os seus jogos; nada muda no vault até tocar em <b>Aplicar</b>.</p>
			<div class="sv-look-presets" data-look-presets></div>
			<div class="sv-look-grid">
				<div class="sv-look-controls">
					<div class="sv-look-tabs" role="tablist" aria-label="Áreas da personalização">${this.areas().map(([id, label, icon], i) => `<button type="button" role="tab" class="sv-look-tab${i ? "" : " is-active"}" data-look-area="${id}" aria-selected="${!i}">${U.icon(icon)}<span>${U.esc(label)}</span></button>`).join("")}</div>
					<div class="sv-look-panel" data-look-panel></div>
				</div>
				<div class="sv-look-pv" data-look-pv>
					<div class="sv-look-pvhead">
						<b>Pré-visualização</b>
						<div class="sv-segmented sv-look-pvdev" role="radiogroup" aria-label="Tamanho da prévia"><button type="button" role="radio" data-pv-dev="mobile" class="is-active" aria-checked="true" aria-label="Celular" title="Celular">${U.icon("smartphone")}<span>Celular</span></button><button type="button" role="radio" data-pv-dev="desktop" aria-checked="false" aria-label="Computador" title="Computador">${U.icon("monitor")}<span>Computador</span></button></div>
						<button type="button" class="sv-look-pvpin" data-look-pin aria-pressed="false" aria-label="Fixar a prévia no topo" title="Fixar a prévia no topo">${U.icon("pin")}</button>
						<button type="button" class="sv-look-pvfold" data-look-fold aria-expanded="true" aria-label="Recolher a prévia" title="Recolher a prévia">${U.icon("chevronUp")}</button>
					</div>
					<div class="sv-segmented sv-look-pvview" role="radiogroup" aria-label="O que pré-visualizar">${[["home", "Início", "home"], ["game", "Ficha", "gamepad"], ["cards", "Cards", "grid"], ["banners", "Banners", "image"]].map(([v, l, ic], i) => `<button type="button" role="radio" data-pv-view="${v}" class="${i ? "" : "is-active"}" aria-checked="${!i}" aria-label="${l}" title="${l}">${U.icon(ic)}<span>${l}</span></button>`).join("")}</div>
					<div class="sv-look-frame" data-look-frame data-dev="mobile"><div class="sv-look-frame-load">${U.icon("image")}<span>Montando a prévia…</span></div></div>
					<p class="sv-look-pvnote">Com os seus jogos e as artes do vault. Role dentro da prévia para ver o resto da tela.</p>
				</div>
			</div>
			<div class="sv-look-bar" data-look-bar>
				<span class="sv-look-state" data-look-state role="status" aria-live="polite">Sem alterações</span>
				<div class="sv-look-actions">
					${U.btn("Restaurar o original", { kind: "ghost", size: "sm", icon: "refresh", attrs: 'data-look-reset aria-label="Restaurar o original" title="Restaurar o original"' })}
					${U.btn("Cancelar", { kind: "secondary", size: "sm", attrs: "data-look-cancel" })}
					${U.btn("Aplicar", { kind: "primary", size: "sm", icon: "check", attrs: "data-look-apply" })}
				</div>
			</div>
		</section>`;
	}

	wire(root, ctx) {
		const sec = root.querySelector("[data-look]");
		if (!sec) return;
		const { U, V } = ctx;
		let saved = this._saved();
		let draft = this._clone(saved);
		let area = "home", view = "home", dev = "mobile";
		const panel = sec.querySelector("[data-look-panel]");
		const state = sec.querySelector("[data-look-state]");
		const pv = this._preview(sec.querySelector("[data-look-frame]"), ctx);

		const dirty = () => this._key(draft) !== this._key(saved);
		const paintState = () => {
			const d = dirty();
			sec.classList.toggle("is-dirty", d);
			state.textContent = d ? (this._key(draft) === this._key(this._defaults()) ? "Original escolhido · toque em Aplicar para confirmar" : "Alterações não aplicadas") : "Sem alterações";
			sec.querySelector("[data-look-apply]").disabled = !d;
			sec.querySelector("[data-look-cancel]").disabled = !d;
		};
		const setPin = on => {
			sec.querySelector("[data-look-pv]").classList.toggle("is-pinned", on);
			const b = sec.querySelector("[data-look-pin]");
			b.setAttribute("aria-pressed", String(on));
			b.setAttribute("aria-label", on ? "Soltar a prévia" : "Fixar a prévia no topo");
			b.title = b.getAttribute("aria-label");
		};
		const refreshPv = () => { if (!sec.querySelector("[data-look-pv]").classList.contains("is-folded")) pv.update(draft, view, dev); };
		const changed = () => { paintPanel(); paintPresets(); paintState(); refreshPv(); };

		// ---- painel da área
		const seg = (c, cur) => `<div class="sv-look-row${c.adv ? " is-adv" : ""}"><span class="sv-label">${U.esc(c.label)}</span>
			<div class="sv-segmented sv-look-seg" role="radiogroup" aria-label="${U.attr(c.label)}">${c.values.map(([v, l]) => `<button type="button" role="radio" data-look-key="${c.key}" data-look-v="${U.attr(v)}" class="${v === cur ? "is-active" : ""}" aria-checked="${v === cur}">${U.esc(l)}</button>`).join("")}</div>
			${c.hint ? `<small class="sv-muted">${U.esc(c.hint)}</small>` : ""}</div>`;
		const visual = (c, cur) => `<div class="sv-look-row"><span class="sv-label">${U.esc(c.label)}</span>
			<div class="sv-look-tiles" role="radiogroup" aria-label="${U.attr(c.label)}">${c.values.map(([v, l, sub]) => `<button type="button" role="radio" class="sv-look-tile${v === cur ? " is-active" : ""}" data-look-key="${c.key}" data-look-v="${U.attr(v)}" aria-checked="${v === cur}">${this.thumb(c.thumb, v)}<b>${U.esc(l)}</b>${sub ? `<small>${U.esc(sub)}</small>` : ""}</button>`).join("")}</div></div>`;
		const themes = () => `<div class="sv-look-row"><span class="sv-label">Tema</span><div class="sv-look-tiles sv-look-tiles--theme" role="radiogroup" aria-label="Tema">${Object.entries(U.themes()).map(([k, [name, sub, [bg, s1, s2]]]) => `<button type="button" role="radio" class="sv-look-tile${draft.theme === k ? " is-active" : ""}" data-look-theme="${k}" aria-checked="${draft.theme === k}"><span class="sv-look-swatch" style="background:${bg}"><i style="background:${s1}"></i><i style="background:${s2}"></i></span><b>${U.esc(name)}</b><small>${U.esc(sub)}</small></button>`).join("")}</div><small class="sv-muted">Os temas mudam fundos e superfícies no tema escuro do Obsidian; no claro, a Game Library segue o Obsidian.</small></div>
			<div class="sv-look-row"><span class="sv-label">Cor de destaque</span><div class="sv-accentpick-row" role="radiogroup" aria-label="Cor de destaque">${Object.entries(U.accents()).map(([k, [name, c]]) => `<button type="button" role="radio" class="sv-accentpick-sw${draft.accent === k ? " is-active" : ""}" data-look-accent="${k}" aria-checked="${draft.accent === k}" title="${U.attr(name)}" aria-label="${U.attr(name)}" style="--sw:${c}"></button>`).join("")}</div></div>`;
		const sections = () => {
			const P = ctx.P, defs = P._homeSections();
			const lay = this._withDraft(draft, () => P._homeLayout(ctx));
			return `<div class="sv-look-row"><span class="sv-label">Seções da Início</span><small class="sv-muted">Ordem e visibilidade (o mesmo que Personalizar Home).</small>
				<ol class="sv-look-order">${lay.order.map((id, i) => { const [label, icon] = defs[id]; const off = lay.hidden.includes(id); return `<li class="${off ? "is-off" : ""}">${U.icon(icon)}<span>${U.esc(label)}</span>
					<button type="button" class="sv-look-mini" data-look-sec-up="${id}" ${i ? "" : "disabled"} aria-label="Subir ${U.attr(label)}">${U.icon("chevronUp")}</button>
					<button type="button" class="sv-look-mini" data-look-sec-down="${id}" ${i < lay.order.length - 1 ? "" : "disabled"} aria-label="Descer ${U.attr(label)}">${U.icon("chevronDown")}</button>
					<button type="button" class="sv-look-mini${off ? "" : " is-on"}" data-look-sec-vis="${id}" aria-pressed="${!off}" aria-label="${off ? "Mostrar" : "Ocultar"} ${U.attr(label)}">${U.icon(off ? "x" : "eye")}</button></li>`; }).join("")}</ol></div>`;
		};
		const tabsOrder = () => {
			const names = { overview: "Visão geral", achievements: "Conquistas", media: "Mídia", dlc: "DLC", sessions: "Sessões", notes: "Notas" };
			const order = draft.layout.game.tabOrder;
			return `<div class="sv-look-row"><span class="sv-label">Ordem das abas da ficha</span><small class="sv-muted">A primeira abre ao entrar na ficha. Abas sem conteúdo continuam escondidas como antes.</small>
				<ol class="sv-look-order">${order.map((id, i) => `<li><span>${U.esc(names[id])}</span>
					<button type="button" class="sv-look-mini" data-look-tab-up="${id}" ${i ? "" : "disabled"} aria-label="Subir ${U.attr(names[id])}">${U.icon("chevronUp")}</button>
					<button type="button" class="sv-look-mini" data-look-tab-down="${id}" ${i < order.length - 1 ? "" : "disabled"} aria-label="Descer ${U.attr(names[id])}">${U.icon("chevronDown")}</button></li>`).join("")}</ol></div>`;
		};
		const paintPanel = () => {
			const open = panel.querySelector("details")?.open;
			const list = area === "theme" ? null : this.controls(area).filter(c => !c.when || c.when(draft));
			if (!list) { panel.innerHTML = themes(); return; }
			const main = list.filter(c => !c.adv), adv = list.filter(c => c.adv);
			const one = c => c.type === "visual" ? visual(c, this._get(draft, c.key)) : c.type === "sections" ? sections() : c.type === "tabs" ? tabsOrder() : seg(c, this._get(draft, c.key));
			panel.innerHTML = main.map(one).join("") + (adv.length ? `<details class="sv-look-adv"${open ? " open" : ""}><summary>${U.icon("sliders")}<span>Mais ajustes</span></summary>${adv.map(one).join("")}</details>` : "");
		};

		// ---- presets
		const presetsBox = sec.querySelector("[data-look-presets]");
		const paintPresets = () => {
			const k = this._key(draft);
			const tile = (p, mine) => `<div class="sv-look-preset${this._key(this._fromPreset(p, draft)) === k ? " is-active" : ""}"><button type="button" class="sv-look-preset-main" data-look-preset="${U.attr(p.id)}" title="${U.attr(p.desc || p.name)}"><b>${U.esc(p.name)}</b>${p.desc ? `<small>${U.esc(p.desc)}</small>` : mine ? `<small>Sua combinação</small>` : ""}</button>${mine || p.id !== "original" ? `<button type="button" class="sv-look-preset-more" data-look-preset-menu="${U.attr(p.id)}" aria-label="Opções de ${U.attr(p.name)}">${U.icon("more")}</button>` : ""}</div>`;
			const mine = this.presets();
			presetsBox.innerHTML = `<div class="sv-look-presets-head"><span class="sv-label">Combinações</span>${U.btn("Salvar combinação", { kind: "ghost", size: "sm", icon: "save", attrs: "data-look-preset-new" })}</div>
				<div class="sv-look-presets-row">${U.layoutPresets().map(p => tile(p, false)).join("")}${mine.map(p => tile(p, true)).join("")}</div>`;
			try { V._wireHorizontalScrollers?.({ querySelectorAll: () => [presetsBox.querySelector(".sv-look-presets-row")] }); } catch (_) {}
		};
		const findPreset = id => U.layoutPresets().find(p => p.id === id) || this.presets().find(p => p.id === id);
		const askName = (title, value, onOk) => {
			const body = document.createElement("div");
			body.innerHTML = `<label class="sv-label" for="sv-look-name">Nome</label><input id="sv-look-name" class="sv-input" type="text" maxlength="48" value="${U.attr(value)}" autocomplete="off">`;
			const m = V.modal({ title, size: "sm", body, actions: `${U.btn("Cancelar", { kind: "ghost", attrs: "data-close" })}${U.btn("Salvar", { kind: "primary", attrs: "data-ok" })}` });
			const input = body.querySelector("input");
			const ok = () => { const v = input.value.trim(); if (!v) { input.focus(); return; } m.close(); onOk(v); };
			m.el.querySelector("[data-ok]").addEventListener("click", ok);
			input.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); ok(); } });
			setTimeout(() => input.focus(), 80);
		};
		const presetMenu = (p, anchor) => {
			const body = document.createElement("div");
			body.className = "sv-look-pmenu";
			body.innerHTML = `${p.mine ? `<button type="button" class="sv-btn sv-btn--ghost" data-pm="rename">${U.icon("edit")}<span>Renomear</span></button>` : ""}
				<button type="button" class="sv-btn sv-btn--ghost" data-pm="dup">${U.icon("copy")}<span>Duplicar</span></button>
				${p.mine ? `<button type="button" class="sv-btn sv-btn--ghost" data-pm="update">${U.icon("save")}<span>Atualizar com o que está na prévia</span></button><button type="button" class="sv-btn sv-btn--ghost sv-look-danger" data-pm="del">${U.icon("trash")}<span>Excluir</span></button>` : ""}`;
			const m = V.modal({ title: p.name, sub: p.mine ? "Sua combinação" : "Combinação pronta", size: "sm", body });
			body.addEventListener("click", async e => {
				const b = e.target.closest("[data-pm]");
				if (!b) return;
				const list = this.presets();
				const act = b.dataset.pm;
				m.close();
				if (act === "dup") {
					const src = this._fromPreset(p, draft);
					askName("Duplicar combinação", `${p.name} (cópia)`, name => { this._savePresets([...list, { id: `p${Date.now().toString(36)}`, name, ...src }]); paintPresets(); V.toast(`"${name}" salva`, { tone: "ok" }); });
				} else if (act === "rename") {
					askName("Renomear combinação", p.name, name => { this._savePresets(list.map(x => x.id === p.id ? { ...x, name } : x)); paintPresets(); });
				} else if (act === "update") {
					this._savePresets(list.map(x => x.id === p.id ? { ...x, ...this._clone(draft) } : x)); paintPresets(); V.toast(`"${p.name}" atualizada`, { tone: "ok" });
				} else if (act === "del") {
					if (!(await V.confirm({ title: `Excluir "${p.name}"?`, text: "Só a combinação salva é apagada; a aparência atual não muda.", confirm: "Excluir", danger: true }))) return;
					this._savePresets(list.filter(x => x.id !== p.id)); paintPresets();
				}
			});
			void anchor;
		};

		// ---- eventos
		sec.addEventListener("click", e => {
			const t = e.target.closest("button");
			if (!t || !sec.contains(t)) return;
			const d = t.dataset;
			if (d.lookArea) {
				area = d.lookArea;
				sec.querySelectorAll("[data-look-area]").forEach(b => { const on = b === t; b.classList.toggle("is-active", on); b.setAttribute("aria-selected", String(on)); });
				paintPanel();
				// a prévia acompanha a área (Fichas → ficha, Cards → cards…)
				const map = { home: "home", game: "game", cards: "cards", banners: "banners", library: "cards", layout: "home" };
				if (map[area] && map[area] !== view) setView(map[area]);
				return;
			}
			if (d.lookKey) { this._set(draft, d.lookKey, d.lookV); return changed(); }
			if (d.lookTheme) { draft.theme = d.lookTheme; return changed(); }
			if (d.lookAccent) { draft.accent = d.lookAccent; return changed(); }
			const moveHome = (id, dir) => {
				const lay = this._withDraft(draft, () => ctx.P._homeLayout(ctx));
				const i = lay.order.indexOf(id), j = i + dir;
				if (i < 0 || j < 0 || j >= lay.order.length) return;
				[lay.order[i], lay.order[j]] = [lay.order[j], lay.order[i]];
				draft.homeLayout = JSON.stringify(lay);
				changed();
			};
			if (d.lookSecUp) return moveHome(d.lookSecUp, -1);
			if (d.lookSecDown) return moveHome(d.lookSecDown, 1);
			if (d.lookSecVis) {
				const lay = this._withDraft(draft, () => ctx.P._homeLayout(ctx));
				const id = d.lookSecVis;
				lay.hidden = lay.hidden.includes(id) ? lay.hidden.filter(x => x !== id) : [...lay.hidden, id];
				draft.homeLayout = JSON.stringify(lay);
				return changed();
			}
			const moveTab = (id, dir) => { const o = draft.layout.game.tabOrder, i = o.indexOf(id), j = i + dir; if (i < 0 || j < 0 || j >= o.length) return; [o[i], o[j]] = [o[j], o[i]]; changed(); };
			if (d.lookTabUp) return moveTab(d.lookTabUp, -1);
			if (d.lookTabDown) return moveTab(d.lookTabDown, 1);
			if (d.lookPreset) { const p = findPreset(d.lookPreset); if (p) { draft = this._fromPreset(p, draft); changed(); } return; }
			if (d.lookPresetMenu) { const p = findPreset(d.lookPresetMenu); if (p) presetMenu(p, t); return; }
			if (t.hasAttribute("data-look-preset-new")) {
				askName("Salvar combinação", "Meu Game Vault", name => { this._savePresets([...this.presets(), { id: `p${Date.now().toString(36)}`, name, ...this._clone(draft) }]); paintPresets(); V.toast(`"${name}" salva nas suas combinações`, { tone: "ok" }); });
				return;
			}
			if (d.pvView) return setView(d.pvView);
			if (d.pvDev) {
				// celular: o botão "computador" sozinho funciona como alternância
				dev = d.pvDev === dev && d.pvDev === "desktop" ? "mobile" : d.pvDev;
				t.blur?.();
				sec.querySelectorAll("[data-pv-dev]").forEach(b => { const on = b.dataset.pvDev === dev; b.classList.toggle("is-active", on); b.setAttribute("aria-checked", String(on)); });
				return refreshPv();
			}
			if (t.hasAttribute("data-look-pin")) {
				const pinned = !sec.querySelector("[data-look-pv]").classList.contains("is-pinned");
				setPin(pinned);
				try { localStorage.setItem("steamvault:ui:lookPvPinned", pinned ? "1" : "0"); } catch (_) {}
				t.blur?.();
				return refreshPv();
			}
			if (t.hasAttribute("data-look-fold")) {
				const pvBox = sec.querySelector("[data-look-pv]");
				const folded = !pvBox.classList.contains("is-folded");
				pvBox.classList.toggle("is-folded", folded);
				t.setAttribute("aria-expanded", String(!folded));
				t.setAttribute("aria-label", folded ? "Mostrar a prévia" : "Recolher a prévia");
				t.title = t.getAttribute("aria-label");
				try { localStorage.setItem("steamvault:ui:lookPvFolded", folded ? "1" : "0"); } catch (_) {}
				if (!folded) refreshPv();
				return;
			}
			if (t.hasAttribute("data-look-apply")) return apply();
			if (t.hasAttribute("data-look-cancel")) { draft = this._clone(saved); changed(); V.toast("Alterações descartadas"); return; }
			if (t.hasAttribute("data-look-reset")) { draft = this._defaults(); changed(); return; }
		});
		const setView = v => {
			view = v;
			sec.querySelectorAll("[data-pv-view]").forEach(b => { const on = b.dataset.pvView === v; b.classList.toggle("is-active", on); b.setAttribute("aria-checked", String(on)); });
			refreshPv();
		};
		const apply = () => {
			const lay = U.layoutClean(draft.layout);
			const def = JSON.stringify(U.layoutDefaults());
			// padrão completo = sem chave (as versões antigas leem como antes)
			if (JSON.stringify(lay) === def) { if (U._store("layout") !== null) U._store("layout", ""); }
			else U._store("layout", JSON.stringify(lay));
			if (draft.theme !== saved.theme) U._store("theme", draft.theme);
			if (draft.accent !== saved.accent) U._store("accent", draft.accent);
			if (draft.homeLayout !== saved.homeLayout) U._store("homeLayout", draft.homeLayout || "{}");
			saved = this._saved();
			draft = this._clone(saved);
			V._applyPrefs?.();
			V.toast("Personalização aplicada", { tone: "ok", icon: "check" });
			// redesenha a tela (o novo layout já vale nas Configurações também)
			window.__svLookKeep = { area, view, dev };
			V.refresh?.();
		};

		// volta para onde estava depois do redesenho causado por Aplicar
		const keep = window.__svLookKeep;
		window.__svLookKeep = null;
		if (keep) {
			area = keep.area; view = keep.view; dev = keep.dev;
			sec.querySelectorAll("[data-look-area]").forEach(b => { const on = b.dataset.lookArea === area; b.classList.toggle("is-active", on); b.setAttribute("aria-selected", String(on)); });
			sec.querySelectorAll("[data-pv-view]").forEach(b => { const on = b.dataset.pvView === view; b.classList.toggle("is-active", on); b.setAttribute("aria-checked", String(on)); });
			sec.querySelectorAll("[data-pv-dev]").forEach(b => { const on = b.dataset.pvDev === dev; b.classList.toggle("is-active", on); b.setAttribute("aria-checked", String(on)); });
			requestAnimationFrame(() => sec.scrollIntoView({ block: "start" }));
		}
		if (window.__svLookOpen) { window.__svLookOpen = false; requestAnimationFrame(() => sec.scrollIntoView({ block: "start" })); }
		paintPanel(); paintPresets(); paintState();
		// prévia fixa no topo do celular: só quando escolhida (3.58.3)
		try { if (localStorage.getItem("steamvault:ui:lookPvPinned") === "1") setPin(true); } catch (_) {}
		// prévia recolhida (escolha do aparelho)
		try {
			if (localStorage.getItem("steamvault:ui:lookPvFolded") === "1") {
				const pvBox = sec.querySelector("[data-look-pv]"), fb = sec.querySelector("[data-look-fold]");
				pvBox.classList.add("is-folded"); fb.setAttribute("aria-expanded", "false"); fb.setAttribute("aria-label", "Mostrar a prévia"); fb.title = "Mostrar a prévia";
			}
		} catch (_) {}
		// 3.58.1: o iframe (com o CSS do vault) começa a ser preparado quando a
		// tela fica ociosa — a primeira prévia sai sem a espera de montá-lo
		(window.requestIdleCallback || (f => setTimeout(f, 700)))(() => { if (sec.isConnected) pv.warm(); }, { timeout: 2500 });
		// a prévia só é montada quando a central aparece na tela (o iframe
		// carrega o CSS do vault; não vale pagar isso sem ninguém olhando)
		if (typeof IntersectionObserver === "function") {
			// raiz = o rolador do app: a margem só funciona dentro dele (com a
			// raiz implícita, o .sv-layer recorta o quadro antes da margem valer)
			const io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) { io.disconnect(); refreshPv(); } }, { root: sec.closest(".sv-layer"), rootMargin: "0px 0px 600px 0px" });
			io.observe(sec.querySelector("[data-look-frame]"));
		} else refreshPv();
		// expõe para testes e para outras telas (ex.: abrir já num preset)
		sec.__svLook = { get draft() { return draft; }, apply, refresh: refreshPv };
	}

	// desenha com o rascunho no lugar do perfil salvo (só durante a chamada)
	_withDraft(d, fn) {
		const U = this.U;
		U._layoutDraft = U.layoutClean(d.layout);
		U._homeLayoutDraft = d.homeLayout;
		try { return fn(); } finally { U._layoutDraft = null; U._homeLayoutDraft = undefined; }
	}

	// jogo de exemplo: Resident Evil 4 se existir; senão o destaque da Início
	_sample(ctx) {
		const { model, C } = ctx;
		return model.games.find(g => /^resident evil 4\b/i.test(g.title)) || C.featuredGames(model)[0] || model.games.find(g => g.images.cover) || model.games[0] || null;
	}

	_content(ctx, view) {
		const { U, P, C, model } = ctx;
		const g = this._sample(ctx);
		if (!g) return { active: "home", html: `<div class="sv-page sv-pad">${U.empty({ icon: "gamepad", title: "Sem jogos para a prévia", text: "Adicione um jogo para ver os modelos com as suas artes." })}</div>` };
		if (view === "home") return { active: "home", html: P.home(ctx).html };
		if (view === "game") return { active: "library", html: P.game({ ...ctx, current: { file: { path: g.path } } }).html };
		const games = [g, ...model.games.filter(x => x !== g && x.images.cover), ...model.games.filter(x => x !== g && !x.images.cover)].slice(0, 12);
		if (view === "cards") {
			const lay = U.layout();
			return { active: "library", html: `<div class="sv-page sv-pad sv-look-pvcards">
				${U.shelf("Continuar jogando", games.slice(0, 8).map(x => U.gameCard(x, C)))}
				<section class="sv-block">${U.sectionHead("Biblioteca", { sub: "A grade da Biblioteca" })}<div class="sv-library" data-view="grid"${lay.cards.library === "original" ? " data-lay-off" : ""}><div class="sv-grid">${games.map(x => U.gameCard(x, C)).join("")}</div></div></section>
			</div>` };
		}
		// banners: o destaque da Início e o topo da ficha, um embaixo do outro
		const featured = C.featuredGames(model);
		const home = U.layout().home.hero === "cards" ? P._homeFeatureCards(ctx, featured.length ? featured : [g]) : P.gameHero(ctx, featured[0] || g, { variant: "home" });
		return { active: "home", html: `<div class="sv-page sv-page--home">${home}</div><div class="sv-page sv-page--game">${P.gameHero(ctx, g)}</div>` };
	}

	// ------------------------------------------------------- prévia
	_preview(frameBox, ctx) {
		const U = this.U, V = ctx.V;
		const W = { mobile: [390, 780], desktop: [1280, 800] };
		let iframe = null, doc = null, ready = null, seq = 0, timer = 0, lastDev = "", lastKey = "";
		// 3.58.1: o que muda a MARCAÇÃO da prévia. O resto (alturas, números,
		// véu, tema, cor, tamanho do aparelho…) só troca atributos e classes
		const markup = (d, view) => {
			const L = d.layout;
			return JSON.stringify([view, L.home.hero === "cards" ? ["cards", L.home.cards, L.home.perRow] : 0, L.home.count, L.home.items,
				L.game.tabOrder, L.cards.style === "cinema", L.cards.library, d.homeLayout || ""]);
		};
		const styles = () => {
			// o mesmo CSS do app: folhas por link (em cache) e os <style> da Game Library
			const out = [];
			for (const n of document.querySelectorAll('link[rel="stylesheet"], style')) {
				if (n.tagName === "LINK" && n.href) out.push(`<link rel="stylesheet" href="${U.attr(n.href)}">`);
				else if (n.tagName === "STYLE" && n.id !== "sv-accent-style" && /\.sv-|--sv-/.test(n.textContent || "")) out.push(`<style>${n.textContent}</style>`);
			}
			return out.join("");
		};
		const make = () => {
			if (ready) return ready;
			frameBox.querySelector(".sv-look-frame-load")?.removeAttribute("hidden");
			iframe = document.createElement("iframe");
			iframe.className = "sv-look-iframe";
			iframe.title = "Pré-visualização da personalização";
			iframe.setAttribute("tabindex", "-1");
			ready = new Promise(res => {
				const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">${styles()}<style id="sv-pv-accent"></style><style>html,body{margin:0;height:100%;overflow:hidden}body{background:var(--sv-bg)}.sv-layer{position:absolute;inset:0}*{scrollbar-width:none}::-webkit-scrollbar{display:none}</style></head><body><div class="sv-host sv-layer"></div></body></html>`;
				// srcdoc ANTES de entrar na página: senão o primeiro "load" é o
				// do about:blank e o conteúdo iria para o documento errado
				iframe.addEventListener("load", () => { doc = iframe.contentDocument; res(); }, { once: true });
				iframe.srcdoc = html;
				frameBox.appendChild(iframe);
			});
			return ready;
		};
		const fit = dev => {
			const [w, h] = W[dev];
			frameBox.style.width = "";
			const avail = Math.max(200, frameBox.clientWidth || 360);
			let k = Math.min(1, avail / w);
			// 3.58.1: prévia fixa do celular (altura limitada): escala menor para
			// caber ~62% da tela do aparelho — o topo inteiro (arte, título,
			// números) aparece, num celular estreito e centralizado
			const maxH = parseFloat(getComputedStyle(frameBox).maxHeight);
			if (Number.isFinite(maxH) && maxH < h * k) k = Math.min(k, maxH / (h * 0.62));
			iframe.style.width = `${w}px`; iframe.style.height = `${h}px`;
			iframe.style.transform = `scale(${k})`;
			if (Math.round(w * k) < avail - 2) frameBox.style.width = `${Math.round(w * k)}px`;
			frameBox.style.height = `${Math.round(Math.min(h * k, Number.isFinite(maxH) ? maxH : Infinity))}px`;
			frameBox.dataset.dev = dev;
		};
		const paint = async (draft, view, dev) => {
			const my = ++seq;
			await make();
			if (my !== seq || !doc || !frameBox.isConnected) return;
			const t0 = performance.now();
			const key = markup(draft, view);
			const full = key !== lastKey || !doc.querySelector(".sv-layer .sv-app");
			let shell = "";
			if (full) {
				let res;
				try { res = this._withDraft(draft, () => this._content(ctx, view)); }
				catch (err) { console.warn("Game Library: prévia", err); res = { active: "home", html: `<div class="sv-page sv-pad">${U.empty({ icon: "alert", title: "A prévia não pôde ser montada", text: String(err?.message || err) })}</div>` }; }
				shell = this._withDraft(draft, () => U.shell({ active: res.active, content: res.html, C: ctx.C, model: ctx.model, steamCfg: ctx.S?.getConfig?.() || null, raCfg: ctx.R?.getConfig?.() || null }));
			}
			const body = doc.body;
			// corpo: mesmas classes do Obsidian e da Game Library, com tema,
			// destaque e tamanho do aparelho escolhidos
			const keep = [...document.body.classList].filter(c => !/^sv-theme-|^sv-accent-custom$|^is-mobile$|^is-phone$|^is-tablet$/.test(c));
			body.className = keep.join(" ");
			if (draft.theme !== "steam") body.classList.add(`sv-theme-${draft.theme}`);
			const acc = U.accentCss(draft.accent);
			doc.getElementById("sv-pv-accent").textContent = acc;
			body.classList.toggle("sv-accent-custom", !!acc);
			if (dev === "mobile") body.classList.add("is-mobile", "is-phone");
			const ts = document.body.style.getPropertyValue("--sv-ts");
			if (ts) body.style.setProperty("--sv-ts", ts); else body.style.removeProperty("--sv-ts");
			const layer = body.querySelector(".sv-layer");
			const keepScroll = layer.dataset.view === view ? layer.scrollTop : 0;
			if (full) { layer.innerHTML = shell; layer.dataset.view = view; lastKey = key; }
			const app = layer.querySelector(".sv-app");
			const [w, h] = W[dev];
			for (const [k, max] of V._bps || []) app.classList.toggle(`sv-bp-${k}`, w < max);
			app.classList.toggle("is-touch", dev === "mobile");
			app.style.setProperty("--sv-view-h", `${h}px`);
			app.dataset.page = view === "game" ? "game" : view === "home" ? "home" : "library";
			U.applyLayout(app, U.layoutClean(draft.layout));
			// imagens: o app marca "carregada" para o fade; aqui é igual
			if (full) layer.querySelectorAll("img").forEach(img => {
				const done = () => img.classList.add("is-loaded");
				if (img.complete && img.naturalWidth) done(); else { img.addEventListener("load", done, { once: true }); img.addEventListener("error", () => img.classList.add("is-broken"), { once: true }); }
				img.loading = "eager";
			});
			// carrossel parado no primeiro destaque (sem cliques nem navegação)
			if (full) layer.querySelectorAll("[data-herocar-track]").forEach(tr => { tr.style.transform = "translate3d(-100%, 0, 0)"; tr.children[1]?.classList.add("is-current"); });
			fit(dev);
			lastDev = dev;
			layer.scrollTop = keepScroll;
			frameBox.querySelector(".sv-look-frame-load")?.setAttribute("hidden", "");
			frameBox.dataset.ms = String(Math.round(performance.now() - t0));
			frameBox.dataset.full = full ? "1" : "0";
			frameBox.dataset.ready = "1";
		};
		// a prévia é só para ver: nada dentro dela navega nem grava
		const block = () => {
			if (!doc || doc.__svBlocked) return;
			doc.__svBlocked = true;
			for (const type of ["click", "submit", "auxclick", "dblclick", "contextmenu"]) doc.addEventListener(type, e => { e.preventDefault(); e.stopPropagation(); }, true);
		};
		let ro = null;
		return {
			warm: () => { make().catch(() => {}); },
			update: (draft, view, dev) => {
				clearTimeout(timer);
				// só CSS (mesma marcação): na hora; redesenho: espera 90 ms entre toques
				const wait = ready && markup(draft, view) !== lastKey ? 90 : 0;
				timer = setTimeout(() => { paint(draft, view, dev).then(block).catch(err => console.warn("Game Library: prévia", err)); }, wait);
				if (!ro && typeof ResizeObserver === "function") { ro = new ResizeObserver(() => { if (iframe && lastDev) fit(lastDev); }); ro.observe(frameBox); }
			}
		};
	}
}
