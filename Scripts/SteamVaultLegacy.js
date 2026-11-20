// ==========================================================================
// Game Library — Legacy (editores e integrações herdados da versão iiSU)
//
// Este arquivo é a antiga biblioteca IISU.js, renomeada e ajustada:
//   · classe IISU → SteamVaultLegacy; prefixo CSS iisu- → svl-
//   · notas novas nascem pelo SteamVaultCore (schema real, lastPlayed vazio,
//     achievementProvider + achievementSync, corpo de um bloco só)
//   · progresso/100% delegados ao SteamVaultCore (fonte única)
//   · chave do RetroAchievements migrada com leitura da chave antiga
// As telas novas usam daqui somente os formulários de edição (sessões, DLC,
// trilha, screenshots, notas, detalhes, capa/fundo, conquistas, coleções,
// gêneros/plataformas, importação, backup, RetroAchievements), montados
// dentro dos modais da Game Library.
//
// Acesso: customJS.SteamVaultLegacy
// ==========================================================================

class SteamVaultLegacy {

	constructor() {
		// guarda o estado de reprodução do soundtrack (faixa, posição,
		// tocando ou não) num lugar que sobrevive à reciclagem de DOM que
		// o Modo de Leitura do Obsidian faz em seções que saem da tela —
		// isso é um comportamento do próprio Obsidian, não deste vault,
		// mas guardar o estado aqui permite retomar de onde parou assim
		// que a seção for recriada, em vez de simplesmente parar de vez
		if (!window.__svlSoundtrackState) window.__svlSoundtrackState = {};
		this._soundtrackState = window.__svlSoundtrackState;

		// -------------------------------------------------------- desempenho
		// "Revisão" do vault: um número que só sobe, incrementado sempre que
		// uma nota muda, é criada, apagada ou renomeada. buildAchievementIndex()
		// usa isso pra saber se pode reaproveitar o índice já calculado em vez
		// de escanear todas as notas de conquista de novo — sem isso, TODA
		// aba com cards (Home, Biblioteca, Plataformas, Gêneros, Coleções,
		// Franquias, Perfil e cada ficha de jogo) refazia essa varredura
		// completa a cada troca de aba, o que é a maior causa de lentidão
		// numa biblioteca grande. Os listeners são globais e só precisam ser
		// registrados uma vez por sessão do Obsidian — mesmo padrão do
		// estado do soundtrack, acima.
		if (typeof window.__svlVaultRev !== "number") window.__svlVaultRev = 0;
		if (!window.__svlVaultRevBound) {
			window.__svlVaultRevBound = true;
			const bump = () => { window.__svlVaultRev++; };
			app.metadataCache.on("changed", bump);
			app.vault.on("delete", bump);
			app.vault.on("rename", bump);
			app.vault.on("create", bump);
		}

		this.platformOrder = ["PS Vita", "PSP", "PS1", "PS2", "Switch", "3DS", "NDS",
			"GBA", "N64", "GameCube", "Wii", "SNES", "Dreamcast", "Arcade", "PC",
			// 3.70.0: consoles Xbox no cadastro manual
			"Xbox Series", "Xbox One", "Xbox 360", "Xbox"];


		this.statusLabels = { Playing: "Jogando", Completed: "Zerado", Platinum: "Platinado", Backlog: "Backlog", Dropped: "Abandonado", Wishlist: "Lista de desejos" };
		this.noteCategoryIcons = {
			"Impressão": "💭", "Personagem": "🧑", "História": "📖", "Build": "🛠️",
			"Dica": "💡", "Curiosidade": "✨", "Teoria": "🔮", "Observação": "👁️"
		};
		this.awardCategories = ["Jogo do Ano", "Melhor História", "Melhor Gameplay", "Melhor Trilha Sonora", "Maior Surpresa", "Melhor Descoberta", "Melhor Experiência"];
		this.statusOptions = [
			["Playing", "Jogando"], ["Paused", "Pausado"], ["Completed", "Zerado"], ["Backlog", "Backlog"],
			["Dropped", "Abandonado"], ["Wishlist", "Lista de desejos"]
		];

		this.tabs = [
			{ id: "home", label: "Home", icon: "🏠", path: "Dashboard/Home" },
			{ id: "biblioteca", label: "Biblioteca", icon: "📚", path: "Dashboard/Biblioteca" },
			{ id: "plataformas", label: "Plataformas", icon: "🎮", path: "Dashboard/Plataformas" },
			{ id: "colecoes", label: "Coleções", icon: "🗂️", path: "Dashboard/Coleções" },
			{ id: "franquias", label: "Franquias", icon: "🧬", path: "Dashboard/Franquias" },
			{ id: "generos", label: "Gêneros", icon: "🎭", path: "Dashboard/Gêneros" },
			{ id: "conquistas", label: "Conquistas", icon: "🏆", path: "Dashboard/Conquistas" },
			{ id: "tierlist", label: "Tier List", icon: "🏅", path: "Dashboard/Tier List" },
			{ id: "retroachievements", label: "RetroAchievements", icon: "🎮", path: "Dashboard/RetroAchievements" },
			{ id: "steam", label: "Steam", icon: "🟦", path: "Dashboard/Steam" },
			{ id: "estatisticas", label: "Estatísticas", icon: "📊", path: "Dashboard/Estatísticas" }
		];

		// pastas padrão onde tudo é organizado
		this.folders = {
			games: "Games", collections: "Collections", achievements: "Achievements",
			genres: "Genres", platforms: "Platforms",
			coverAssets: "Assets/Covers", backgroundAssets: "Assets/Backgrounds", achievementAssets: "Assets/Achievements",
			featuredAssets: "Assets/Featured",
			soundtrackAssets: "Assets/Soundtracks"
		};
		// cadeias de fallback por finalidade de imagem — ver gameImage().
		// O primeiro item de cada lista é o campo "próprio" daquela
		// finalidade; os seguintes são só a rede de segurança.
		this.imageChains = {
			cover: ["cover", "coverFicha"],
			fichaCover: ["coverFicha", "cover"],
			background: ["background", "featured", "coverFicha", "cover"],
			featured: ["featured", "background", "coverFicha", "cover"]
		};
		// enquadramento padrão do fundo da ficha quando o jogo não tem
		// valores próprios: centrado nos dois eixos, sem aproximação.
		this.bgFramingDefaults = { x: 50, y: 50, zoom: 100 };
	}

	// -------------------------------------------------------------- utils
	/* ----------------------------------------------------------------------
	   safeText() — filtro contra "valor interno vazando para a tela"
	   Antes, qualquer campo ausente ou mal calculado chegava à interface
	   como o texto literal "undefined", "null", "NaN" ou
	   "[object Object]". Como praticamente todo texto renderizado passa
	   por esc(), a checagem fica aqui: um ponto só, em vez de um `|| ""`
	   espalhado por cada chamada. Texto legítimo não é afetado — só os
	   quatro resultados que a linguagem produz quando não há valor.
	   ---------------------------------------------------------------------- */
	safeText(value) {
		if (value === null || value === undefined) return "";
		if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
		// objeto de data (Luxon do Dataview ou Date nativo) que escapou para
		// um ponto de exibição genérico: converte pela mesma camada de datas
		// em vez de imprimir o ISO cru
		if (typeof value === "object" && (typeof value.toFormat === "function" || typeof value.getFullYear === "function")) {
			const p = this.dateParts(value);
			if (p) return p.hasTime ? `${p.day}/${p.month}/${p.year} às ${p.hour}:${p.minute}` : `${p.day}/${p.month}/${p.year}`;
			return "";
		}
		const s = String(value);
		return (s === "undefined" || s === "null" || s === "NaN" || s === "[object Object]") ? "" : s;
	}

	esc(str) {
		return this.safeText(str).replace(/[&<>"']/g, c => ({
			"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
		}[c]));
	}

	// verdadeiro quando o sistema operacional pede "reduzir movimento" ou
	// quando o interruptor manual (classe no <body>, reservada pra um
	// futuro toggle nas configurações) está ligado. Um lugar só pra essa
	// checagem, usado por qualquer animação disparada via JS em vez de só
	// confiar no CSS.
	prefersReducedMotion() {
		return document.body.classList.contains("svl-anim-reduced") ||
			(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
	}

	// ================================================ reparo de nomes de arquivo
	// Alguns arquivos chegaram ao vault com os acentos "escapados" por uma
	// ferramenta de zip: "Abre-te S#U00e9samo.md" em vez de "Abre-te
	// Sésamo.md". Além do nome feio, o "#" quebra os links — o Obsidian lê
	// tudo depois do "#" como título de seção, não acha a nota e CRIA uma
	// nota vazia nova ("Isso", "Isso 4"...). Este reparo renomeia esses
	// arquivos/pastas para o nome certo (o Obsidian atualiza os links que
	// apontam para eles) e manda para a lixeira do vault as notas vazias
	// criadas por esses cliques. Roda sozinho uma vez por sessão.
	_decodeEscapedName(name) {
		return String(name)
			.replace(/#L([0-9a-fA-F]{6})/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
			.replace(/#U([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
			// variante sem "#" gerada por alguns extratores de zip (ex.: "CoraU00e7U00e3o")
			.replace(/U(00[0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
	}

	async repairEscapedFilenames(options = {}) {
		const escaped = /#(U[0-9a-fA-F]{4}|L[0-9a-fA-F]{6})|U00[89a-fA-F][0-9a-fA-F]/;
		const inTrash = f => f.path === ".trash" || f.path.startsWith(".trash/");
		const skip = new Set();
		let renamed = 0, conflicts = 0, removed = 0;
		for (let guard = 0; guard < 2000; guard++) {
			// pastas mais rasas primeiro: renomear a pasta já corrige o
			// caminho de tudo o que está dentro dela
			const next = app.vault.getAllLoadedFiles()
				.filter(f => f.path && !inTrash(f) && !skip.has(f.path) && escaped.test(f.name))
				.sort((a, b) => a.path.split("/").length - b.path.split("/").length)[0];
			if (!next) break;
			const fixedName = this._decodeEscapedName(next.name);
			const parent = next.parent?.path && next.parent.path !== "/" ? `${next.parent.path}/` : "";
			const target = `${parent}${fixedName}`;
			if (app.vault.getAbstractFileByPath(target)) { skip.add(next.path); conflicts += 1; continue; }
			try {
				await app.fileManager.renameFile(next, target);
				renamed += 1;
			} catch (err) {
				console.warn("Game Library: não consegui renomear", next.path, err);
				skip.add(next.path);
			}
		}
		// notas vazias criadas pelos links quebrados, dentro de Achievements
		const achRoot = `${this.folders.achievements}/`;
		for (const f of app.vault.getMarkdownFiles()) {
			if (!f.path.startsWith(achRoot) || (f.stat?.size ?? 1) !== 0) continue;
			try { await app.vault.trash(f, false); removed += 1; } catch (_) {}
		}
		if (renamed || removed || options.verbose) {
			const parts = [];
			if (renamed) parts.push(`${customJS.SteamVaultUI.plural(renamed, "arquivo com nome corrigido", "arquivos com nome corrigido")}`);
			if (removed) parts.push(`${customJS.SteamVaultUI.plural(removed, "nota vazia enviada", "notas vazias enviadas")} para a lixeira do vault`);
			if (conflicts) parts.push(`${customJS.SteamVaultUI.plural(conflicts, "não renomeado", "não renomeados")}: já existe um arquivo com o nome certo`);
			this._notify(`Game Library: ${parts.join(" · ") || "nenhum nome para corrigir"}`, 9000);
		}
		return { renamed, conflicts, removed };
	}

	/* ======================================================================
	   SISTEMA DE ÍCONES SVG
	   Um conjunto único de ícones de traço (24×24, traço 1.8, pontas
	   arredondadas, cor = currentColor) substitui os emoji da interface.
	   Como funciona, sem mudar nenhuma nota nem assinatura de função:
	   as funções continuam recebendo/gerando os mesmos emoji de sempre, e
	   _svgifyIcons() troca, já no HTML montado, cada emoji conhecido por
	   seu SVG — mas SÓ dentro de contêineres de interface (abas, rótulos
	   de seção, blocos de número, botões...). Texto do usuário (títulos,
	   sinopse, notas, descrições) e <option> nunca são tocados; emoji sem
	   equivalente no mapa simplesmente continua como está.
	   ====================================================================== */
	// emoji → nome do ícone (várias variações apontam para o mesmo ícone)
	get _emojiIconMap() {
		if (this.__emojiIconMap) return this.__emojiIconMap;
		const m = {
			"🎮": "gamepad", "🕹": "joystick", "🏆": "trophy", "⏱": "clock", "⏳": "clock", "🕒": "clock", "🕰": "clock",
			"💎": "gem", "✅": "check", "✓": "tick", "🎭": "masks", "⭐": "star", "🌟": "star", "🗂": "folder", "📁": "folder",
			"🧬": "layers", "🖼": "image", "📚": "books", "💰": "coins", "💸": "coins", "🏅": "medal", "🎵": "music",
			"📝": "pencil", "✏": "pencil", "🟦": "store", "✕": "x", "❌": "x", "🏁": "flag", "📈": "trend",
			"🗓": "calendar", "📅": "calendar", "📥": "inbox", "🧩": "puzzle", "📸": "camera", "📓": "notebook",
			"🔁": "repeat", "🔄": "refresh", "↻": "refresh", "↺": "refresh", "🌀": "refresh", "👑": "crown",
			"🧑": "user", "👤": "user", "🪪": "user", "🚫": "ban", "📊": "chart", "🎯": "target", "🔍": "search", "🔎": "search",
			"✨": "sparkles", "🔮": "sparkles", "⚠": "alert", "📦": "box", "🔒": "lock", "🚀": "zap", "🧭": "compass",
			"🏷": "tag", "🎬": "film", "🖥": "monitor", "💻": "monitor", "🔑": "key", "🔗": "link", "☰": "menu",
			"ℹ": "info", "🎚": "sliders", "↔": "arrowsH", "↕": "arrowsV", "🎲": "dice", "🗺": "map", "🧠": "brain",
			"⚙": "gear", "🛠": "gear", "📼": "disc", "🏠": "home", "💾": "save", "💡": "bulb", "👁": "eye",
			"📖": "bookOpen", "💭": "chat", "▶": "play", "⏸": "pause", "🕸": "grid",
			// plataformas: os pontos coloridos viram o controle genérico
			"⬇": "download", "🆓": "gift", "🆕": "sparkles", "🃏": "cards", "⬜": "circle",
			"🟢": "gamepad", "🟣": "gamepad", "🟡": "gamepad", "🔴": "gamepad", "🟪": "gamepad", "⚪": "gamepad", "🐬": "gamepad"
		};
		this.__emojiIconMap = m;
		return m;
	}

	svgIcon(name, extraClass = "") {
		// 3.39.0: um só registro de ícones (SteamVaultUI.paths); estes nomes antigos
		// apontam para o equivalente de lá
		const alias = { tick: "check", pencil: "edit", zap: "bolt", bookOpen: "g-narrative" };
		const d = customJS.SteamVaultUI?.paths?.[alias[name] || name];
		if (!d) return "";
		return `<svg class="svl-svg svl-svg-${name}${extraClass ? " " + extraClass : ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
	}

	// contêineres de INTERFACE onde emoji vira SVG. Nada fora desta lista
	// é tocado — títulos de jogo, sinopses, notas e descrições são do
	// usuário e continuam exatamente como foram escritos.
	get _iconContainerSelector() {
		return [
			".svl-tab-icon", ".svl-stat-tile-icon", ".svl-shelf-icon", ".svl-medal-icon",
			".svl-stat", ".svl-topbar-title", ".svl-activity-label", ".svl-soundtrack-icon", ".svl-image-preview-empty",
			".svl-picker-btn", ".svl-btn-ghost", ".svl-btn", ".svl-smart-icon", ".svl-hof-medal", ".svl-segmented-opt",
			".svl-plat-ach", ".svl-edit-btn-icon", ".svl-dist-card-icon", ".svl-collapse-icon", ".svl-achgame-crown",
			".svl-framing-label", ".svl-tagchip-remove", ".svl-soundtrack-editbtn", ".svl-timeline-icon", ".svl-add-btn-icon",
			".svl-search-icon", ".svl-empty-hint-icon", ".svl-player-btn", ".svl-ach-sum-item", ".svl-goals-empty-icon",
			".svl-dlc-remove", ".svl-soundtrack-remove", ".svl-platinum-badge", ".svl-platinum-inline", ".svl-bar-label",
			".svl-pill", ".svl-quick-actions button", ".svl-add-btn", ".svl-add-btn-sm", ".svl-saga-name", "label",
			".svl-chip", ".svl-status-pill", ".svl-empty-hint", ".svl-profile-fact", ".svl-hh-kicker"
		].join(",");
	}

	_svgifyIcons(root) {
		if (!root?.querySelectorAll) return;
		const map = this._emojiIconMap;
		// um emoji por vez, com o seletor de variação (FE0F) opcional
		// emoji compostos (ex.: 🧑‍🚀 = 🧑 + junção + 🚀) contam como UM só,
		// identificado pelo primeiro símbolo — senão viravam dois ícones
		const re = /(\p{Extended_Pictographic}|[✕✓☰↔↕↻↺ℹ])\uFE0F?(?:\u200D\p{Extended_Pictographic}\uFE0F?)*/gu;
		const skip = "option, select, textarea, input, script, style, svg, .svl-card-title, .svl-ach-name, .svl-ach-desc, .svl-synopsis-text, .svl-note-text";
		const containers = root.querySelectorAll(this._iconContainerSelector);
		for (const el of containers) {
			if (el.closest(skip)) continue;
			const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
			const nodes = [];
			let n;
			while ((n = walker.nextNode())) {
				if (n.parentElement?.closest(skip)) continue;
				re.lastIndex = 0;
				if (re.test(n.nodeValue)) nodes.push(n);
			}
			for (const node of nodes) {
				const text = node.nodeValue;
				re.lastIndex = 0;
				let last = 0, m, changed = false;
				const frag = document.createDocumentFragment();
				while ((m = re.exec(text))) {
					const name = map[m[1]];
					if (!name) continue;
					changed = true;
					if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
					const tpl = document.createElement("template");
					tpl.innerHTML = this.svgIcon(name);
					frag.appendChild(tpl.content);
					last = m.index + m[0].length;
				}
				if (!changed) continue;
				if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
				node.replaceWith(frag);
			}
		}
	}

	// dá fade-in pras imagens de um trecho de HTML recém-inserido, assim
	// que cada uma efetivamente termina de carregar (em vez de fingir que
	// carregou instantaneamente). Chamado automaticamente pelo mount(), e
	// também deve ser chamado à mão sempre que um trecho com capas/ícones
	// for reconstruído fora do fluxo de montagem normal (ex.: reordenar a
	// prateleira da Biblioteca).
	wireImageFade(container) {
		// todo trecho montado ou reconstruído também troca emoji de interface por SVG
		this._svgifyIcons(container);
		container.querySelectorAll("img").forEach(img => {
			if (img.complete) { img.classList.add("is-loaded"); return; }
			img.addEventListener("load", () => img.classList.add("is-loaded"), { once: true });
			img.addEventListener("error", () => img.classList.add("is-loaded"), { once: true });
		});
	}

	// escapa um texto pra caber dentro de uma string YAML entre aspas
	// duplas ("campo: \"...\""). A ordem importa: barra invertida
	// primeiro (senão dobra os escapes que a gente mesmo acabou de
	// criar), só depois aspas e quebras de linha reais — que são
	// exatamente o que quebrava o frontmatter quando alguém colava uma
	// sinopse com mais de uma linha (o YAML não aceita quebra de linha
	// literal dentro de uma string com aspas simples assim).
	yamlEscape(str) {
		// fonte única: o Core também remove caracteres de controle
		return customJS.SteamVaultCore.yamlEscape(str);
	}

	safeName(str, fallback = "sem-nome") {
		return customJS.SteamVaultCore?.safeFileName ? customJS.SteamVaultCore.safeFileName(str, fallback) : ((String(str ?? "").replace(/[\\/:*?"<>|#^[\]]/g, "").replace(/^\.+/, "").trim()) || fallback);
	}

	// "concluído" pra fins de contagem agregada inclui tanto Zerado quanto
	// Platinado — platinar não deveria fazer um jogo "sumir" das
	// estatísticas de conclusão, só indicar um nível a mais
	isCompletedStatus(status) {
		return status === "Completed" || status === "Platinum";
	}

	// Game Library Awards — premiação pessoal com escolha manual (nunca
	// automática). Guardado no frontmatter da própria página que hospeda
	// a seção (mesmo padrão de armazenamento usado nas metas).
	// Hall da Fama — a premiação pessoal do ano. Continua 100% manual e
	// guardada no frontmatter da página; o que mudou é a forma: uma grade
	// de cartões com a capa do jogo escolhido, em vez de sete linhas de
	// formulário. awardsSection() continua existindo e chama esta.
	hallOfFameSection(games, awards, year) {
		const yearAwards = (awards || []).filter(a => String(a.year) === String(year));
		const options = this._asArray(games).map(g => ({ path: g.file.path, title: g.title || g.file.name, cover: this.gameImageSrc(g, "cover") }))
			.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
		let chosen = 0;
		const cards = this.awardCategories.map((cat, i) => {
			const picked = yearAwards.find(a => a.category === cat);
			const game = picked ? this._asArray(games).find(g => g.file.path === picked.gamePath) : null;
			if (game) chosen += 1;
			const cover = game ? this.gameImageSrc(game, "cover") : "";
			const opts = `<option value="">— nenhum —</option>${options.map(o =>
				`<option value="${this.esc(o.path)}" data-cover="${this.esc(o.cover)}"${picked?.gamePath === o.path ? " selected" : ""}>${this.esc(o.title)}</option>`).join("")}`;
			return `<div class="svl-hof-card${game ? "" : " is-empty"}" data-category="${this.esc(cat)}">
				<div class="svl-hof-art"${cover ? ` style="background-image:url('${this.esc(cover)}')"` : ""}></div>
				<div class="svl-hof-shade"></div>
				<div class="svl-hof-body">
					<span class="svl-hof-cat"><span class="svl-hof-medal">${i === 0 ? "👑" : "🏆"}</span>${this.esc(cat)}</span>
					<span class="svl-award-winner svl-hof-winner">${game ? this.esc(game.title || game.file.name) : "Ainda não escolhido"}</span>
					<select class="svl-input svl-award-select svl-hof-select" data-category="${this.esc(cat)}" aria-label="Escolher ${this.esc(cat)}">${opts}</select>
				</div>
			</div>`;
		}).join("");
		return `<div class="svl-hof">
			<div class="svl-hof-head">
				<span class="svl-hof-head-title">Sua premiação de ${this.esc(year)}</span>
				<span class="svl-hof-head-count">${chosen} de ${this.awardCategories.length} categorias escolhidas</span>
			</div>
			<div class="svl-hof-grid">${cards}</div>
		</div>`;
	}

	awardsSection(games, awards, year) {
		return this.hallOfFameSection(games, awards, year);
	}

	wireAwardsSection(root, pagePath, year) {
		root.querySelectorAll(".svl-award-select").forEach(select => {
			select.addEventListener("change", async () => {
				const category = select.dataset.category;
				const gamePath = select.value;
				select.disabled = true;
				try {
					const file = app.vault.getAbstractFileByPath(pagePath);
					if (!file) throw new Error("arquivo não encontrado");
					await app.fileManager.processFrontMatter(file, fm => {
						if (!Array.isArray(fm.awards)) fm.awards = [];
						const existing = fm.awards.findIndex(a => String(a.year) === String(year) && a.category === category);
						if (!gamePath) {
							if (existing >= 0) fm.awards.splice(existing, 1);
						} else if (existing >= 0) {
							fm.awards[existing].gamePath = gamePath;
						} else {
							fm.awards.push({ year, category, gamePath });
						}
					});
					const row = select.closest(".svl-hof-card") || select.closest(".svl-award-row");
					const winnerLabel = row?.querySelector(".svl-award-winner");
					if (winnerLabel) winnerLabel.textContent = gamePath ? select.options[select.selectedIndex].textContent : "Ainda não escolhido";
					// a capa do cartão acompanha a escolha, sem recarregar a nota
					const art = row?.querySelector(".svl-hof-art");
					if (art) {
						const cover = select.options[select.selectedIndex]?.dataset.cover || "";
						art.style.backgroundImage = cover ? `url('${cover}')` : "";
					}
					row?.classList.toggle("is-empty", !gamePath);
				} catch (err) {
					console.error("Game Library: falha ao salvar prêmio", err);
				} finally {
					select.disabled = false;
				}
			});
		});
	}

	// lista todos os gêneros/subgêneros já usados em algum jogo do vault —
	// alimenta a sugestão automática ao adicionar um novo, pra evitar
	// duplicar variações do mesmo gênero ("RPG" vs "Rpg" vs "rpg")
	knownGenres(dv, field = "genre") {
		const set = new Set();
		for (const p of dv.pages().where(g => g.type === "game")) {
			for (const g of (p[field] || [])) if (g) set.add(String(g));
		}
		return [...set].sort((a, b) => a.localeCompare(b));
	}

	getAllPlatforms(dv) {
		const settings = dv.page("Dashboard/Plataformas");
		const custom = (settings && Array.isArray(settings.customPlatforms)) ? settings.customPlatforms : [];
		const known = new Set(this.platformOrder);
		const extra = custom.filter(p => p && !known.has(p));
		return [...this.platformOrder, ...extra];
	}

	formatPrice(value) {
		const n = Number(value) || 0;
		return `R$ ${n.toFixed(2).replace(".", ",")}`;
	}

	iconPlay() {
		return `<svg class="svl-icon svl-icon-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4.8c0-1.1 1.2-1.8 2.2-1.2l12 7.2c1 .6 1 2 0 2.6l-12 7.2c-1 .6-2.2-.1-2.2-1.2z"/></svg>`;
	}

	iconPause() {
		return `<svg class="svl-icon svl-icon-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5" y="4" width="5" height="16" rx="1.5"/><rect x="14" y="4" width="5" height="16" rx="1.5"/></svg>`;
	}

	iconPrev() {
		return `<svg class="svl-icon svl-icon-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1 1 1 0 0 0 1-1V6a1 1 0 0 0-1-1zM19.2 5.36c.53-.32 1.2.06 1.2.68v11.92c0 .62-.67 1-1.2.68l-9.95-5.96a.8.8 0 0 1 0-1.36z"/></svg>`;
	}

	iconNext() {
		return `<svg class="svl-icon svl-icon-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17 5a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1 1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM4.8 5.36c-.53-.32-1.2.06-1.2.68v11.92c0 .62.67 1 1.2.68l9.95-5.96a.8.8 0 0 0 0-1.36z"/></svg>`;
	}

	/* ======================================================================
	   DATAS — UM ÚNICO PONTO DE CONVERSÃO "valor interno → texto"
	   O mesmo campo chega aqui em três formas diferentes, dependendo de
	   como foi escrito no frontmatter e de quem o leu:
	     dateAdded: 2026-09-17      → objeto Luxon DateTime (Dataview
	                                  converte sozinho quando não há aspas)
	     dateAdded: "2026-09-17"    → string ISO curta
	     vindo de API/JS            → string ISO completa, com hora e fuso
	   Antes, cada função de exibição tratava só uma ou duas dessas formas
	   e caía em String(value) no resto — foi assim que apareceu
	   "Colecionando desde 2026-09-17T00:00:00.000-03:00" na tela.
	   Agora TUDO passa primeiro por dateParts(), que normaliza as três
	   formas em componentes simples; quem exibe só escolhe o arranjo.
	   O vault continua guardando a data em ISO: a conversão é só de
	   apresentação.
	   ====================================================================== */

	// normaliza qualquer valor de data em { year, month, day, hour,
	// minute, hasTime } — ou null se não for uma data reconhecível.
	// Meia-noite exata conta como "sem hora": é o que o Dataview produz
	// para uma data escrita sem horário, e mostrar "às 00:00" nesses
	// casos seria inventar uma informação que o usuário não deu.
	dateParts(value) {
		if (value === null || value === undefined || value === "") return null;
		let s;
		if (typeof value === "object") {
			if (typeof value.toFormat === "function") {
				s = value.toFormat("yyyy-MM-dd'T'HH:mm"); // Luxon (Dataview)
			} else if (typeof value.getFullYear === "function" && !Number.isNaN(value.getTime())) {
				const p = n => String(n).padStart(2, "0"); // Date nativo
				s = `${value.getFullYear()}-${p(value.getMonth() + 1)}-${p(value.getDate())}T${p(value.getHours())}:${p(value.getMinutes())}`;
			} else {
				return null;
			}
		} else {
			s = String(value).trim();
		}
		const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(s);
		if (!m) return null;
		const hour = m[4] || "";
		const minute = m[5] || "";
		return {
			year: m[1], month: m[2], day: m[3], hour, minute,
			hasTime: !!hour && !(hour === "00" && minute === "00")
		};
	}

	// data amigável: 17/09/2026, ou 17/09/2026 às 14:30 quando o valor
	// carrega um horário real. opts.time força (true) ou suprime (false).
	formatDateValue(value, opts = {}) {
		const p = this.dateParts(value);
		if (!p) return this.safeText(value);
		const d = `${p.day}/${p.month}/${p.year}`;
		const showTime = opts.time === true || (opts.time !== false && p.hasTime);
		return showTime && p.hour ? `${d} às ${p.hour}:${p.minute}` : d;
	}

	// data em formato ISO puro (yyyy-mm-dd), pra fazer contas de data com
	// segurança — usado pelo calendário de atividade e pelo "há X anos".
	// É o caminho de PROCESSAMENTO, não o de exibição.
	dateISO(value) {
		const p = this.dateParts(value);
		return p ? `${p.year}-${p.month}-${p.day}` : "";
	}

	hashColor(str) {
		let h = 0;
		const s = String(str ?? "x");
		for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
		return `hsl(${Math.abs(h) % 360}, 62%, 58%)`;
	}

	// mesmo hash de cor, mas escuro e pouco saturado — pra usar como fundo
	// (atrás da letra de capa reservada), não como destaque chamativo
	hashColorMuted(str) {
		let h = 0;
		const s = String(str ?? "x");
		for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
		return `hsl(${Math.abs(h) % 360}, 32%, 20%)`;
	}

	// leitor mínimo de tag ID3v2 (v2.3/v2.4) — procura o frame APIC (capa
	// embutida no próprio arquivo de música) e devolve {mime, bytes}, ou
	// null se o arquivo não tiver tag ID3 ou não tiver capa embutida.
	// Nunca lança erro: qualquer formato inesperado só resulta em null,
	// caindo de volta pro ícone padrão.
	extractId3CoverArt(buffer) {
		try {
			const view = new Uint8Array(buffer);
			if (view.length < 10) return null;
			if (view[0] !== 0x49 || view[1] !== 0x44 || view[2] !== 0x33) return null; // "ID3"
			const majorVersion = view[3];
			const tagSize = ((view[6] & 0x7f) << 21) | ((view[7] & 0x7f) << 14) | ((view[8] & 0x7f) << 7) | (view[9] & 0x7f);
			let offset = 10;
			const tagEnd = Math.min(10 + tagSize, view.length);

			while (offset + 10 <= tagEnd) {
				const frameId = String.fromCharCode(view[offset], view[offset + 1], view[offset + 2], view[offset + 3]);
				let frameSize;
				if (majorVersion >= 4) {
					frameSize = ((view[offset + 4] & 0x7f) << 21) | ((view[offset + 5] & 0x7f) << 14) | ((view[offset + 6] & 0x7f) << 7) | (view[offset + 7] & 0x7f);
				} else {
					frameSize = (view[offset + 4] << 24) | (view[offset + 5] << 16) | (view[offset + 6] << 8) | view[offset + 7];
				}
				const frameStart = offset + 10;
				if (frameSize <= 0 || frameStart + frameSize > view.length) break;

				if (frameId === "APIC") {
					let p = frameStart;
					const textEncoding = view[p]; p += 1;
					let mimeEnd = p;
					while (mimeEnd < frameStart + frameSize && view[mimeEnd] !== 0x00) mimeEnd++;
					const mime = String.fromCharCode(...view.slice(p, mimeEnd));
					p = mimeEnd + 1;
					p += 1; // pula o byte de "tipo de imagem"
					const isUtf16 = textEncoding === 1 || textEncoding === 2;
					if (isUtf16) {
						while (p + 1 < frameStart + frameSize && !(view[p] === 0x00 && view[p + 1] === 0x00)) p += 2;
						p += 2;
					} else {
						while (p < frameStart + frameSize && view[p] !== 0x00) p++;
						p += 1;
					}
					const imgBytes = view.slice(p, frameStart + frameSize);
					if (imgBytes.length > 0 && mime.startsWith("image/")) {
						return { mime, bytes: imgBytes };
					}
				}
				offset = frameStart + frameSize;
			}
			return null;
		} catch (e) {
			return null;
		}
	}

	// converte os bytes crus da capa extraída num data: URI, pronto pra
	// usar direto num <img src="...">
	// bloco PICTURE do FLAC — formato compartilhado entre arquivos .flac
	// nativos e o comentário METADATA_BLOCK_PICTURE do Ogg/Opus (que é
	// esse mesmo bloco, só que codificado em base64 dentro do comentário)
	parseFlacPictureBlock(view, offset) {
		try {
			let p = offset;
			p += 4; // tipo da figura (não usamos)
			const mimeLen = (view[p] << 24) | (view[p + 1] << 16) | (view[p + 2] << 8) | view[p + 3]; p += 4;
			const mime = String.fromCharCode(...view.slice(p, p + mimeLen)); p += mimeLen;
			const descLen = (view[p] << 24) | (view[p + 1] << 16) | (view[p + 2] << 8) | view[p + 3]; p += 4;
			p += descLen;
			p += 4 + 4 + 4 + 4; // largura, altura, profundidade de cor, nº de cores
			const dataLen = (view[p] << 24) | (view[p + 1] << 16) | (view[p + 2] << 8) | view[p + 3]; p += 4;
			const bytes = view.slice(p, p + dataLen);
			if (bytes.length > 0 && mime.startsWith("image/")) return { mime, bytes };
			return null;
		} catch (e) {
			return null;
		}
	}

	// arquivo .flac nativo: "fLaC" + blocos de metadados sequenciais
	extractFlacCoverArt(buffer) {
		try {
			const view = new Uint8Array(buffer);
			if (view.length < 4 || String.fromCharCode(...view.slice(0, 4)) !== "fLaC") return null;
			let offset = 4;
			while (offset + 4 <= view.length) {
				const headerByte = view[offset];
				const isLast = (headerByte & 0x80) !== 0;
				const blockType = headerByte & 0x7f;
				const blockLen = (view[offset + 1] << 16) | (view[offset + 2] << 8) | view[offset + 3];
				const blockStart = offset + 4;
				if (blockType === 6) {
					const pic = this.parseFlacPictureBlock(view, blockStart);
					if (pic) return pic;
				}
				offset = blockStart + blockLen;
				if (isLast) break;
			}
			return null;
		} catch (e) {
			return null;
		}
	}

	// decodifica base64 sem depender de atob (mais previsível entre ambientes)
	base64DecodeToBytes(str) {
		const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
		str = str.replace(/[^A-Za-z0-9+/]/g, "");
		const bytes = [];
		for (let i = 0; i < str.length; i += 4) {
			const e1 = chars.indexOf(str[i]);
			const e2 = chars.indexOf(str[i + 1]);
			const e3 = str[i + 2] !== undefined ? chars.indexOf(str[i + 2]) : -1;
			const e4 = str[i + 3] !== undefined ? chars.indexOf(str[i + 3]) : -1;
			bytes.push((e1 << 2) | (e2 >> 4));
			if (e3 >= 0) bytes.push(((e2 & 15) << 4) | (e3 >> 2));
			if (e4 >= 0) bytes.push(((e3 & 3) << 6) | e4);
		}
		return new Uint8Array(bytes);
	}

	// arquivos Ogg (.opus, .ogg) — reconstrói o(s) pacote(s) lógico(s) a
	// partir das páginas físicas, acha o cabeçalho de comentários
	// (OpusTags ou \x03vorbis) e procura METADATA_BLOCK_PICTURE
	extractOggCoverArt(buffer) {
		try {
			const view = new Uint8Array(buffer);
			if (view.length < 4 || String.fromCharCode(...view.slice(0, 4)) !== "OggS") return null;

			let offset = 0;
			let packets = [];
			let currentPacket = [];
			let pageCount = 0;
			while (offset + 27 <= view.length && pageCount < 6) {
				if (String.fromCharCode(...view.slice(offset, offset + 4)) !== "OggS") break;
				const segCount = view[offset + 26];
				const segTable = view.slice(offset + 27, offset + 27 + segCount);
				let dataOffset = offset + 27 + segCount;
				for (const segLen of segTable) {
					currentPacket.push(...view.slice(dataOffset, dataOffset + segLen));
					dataOffset += segLen;
					if (segLen < 255) {
						packets.push(new Uint8Array(currentPacket));
						currentPacket = [];
					}
				}
				offset = dataOffset;
				pageCount++;
				if (packets.length >= 3) break;
			}

			for (const packet of packets) {
				let p = 0;
				let isComment = false;
				if (packet.length > 8 && String.fromCharCode(...packet.slice(0, 8)) === "OpusTags") {
					p = 8; isComment = true;
				} else if (packet.length > 7 && packet[0] === 0x03 && String.fromCharCode(...packet.slice(1, 7)) === "vorbis") {
					p = 7; isComment = true;
				}
				if (!isComment) continue;

				const vendorLen = packet[p] | (packet[p + 1] << 8) | (packet[p + 2] << 16) | (packet[p + 3] << 24); p += 4;
				p += vendorLen;
				const commentCount = packet[p] | (packet[p + 1] << 8) | (packet[p + 2] << 16) | (packet[p + 3] << 24); p += 4;
				for (let i = 0; i < commentCount && p + 4 <= packet.length; i++) {
					const len = packet[p] | (packet[p + 1] << 8) | (packet[p + 2] << 16) | (packet[p + 3] << 24); p += 4;
					const comment = String.fromCharCode(...packet.slice(p, p + len));
					p += len;
					const eq = comment.indexOf("=");
					if (eq > 0 && comment.slice(0, eq).toUpperCase() === "METADATA_BLOCK_PICTURE") {
						const decoded = this.base64DecodeToBytes(comment.slice(eq + 1));
						const pic = this.parseFlacPictureBlock(decoded, 0);
						if (pic) return pic;
					}
				}
			}
			return null;
		} catch (e) {
			return null;
		}
	}

	async loadEmbeddedTrackArt(path) {
		try {
			const file = app.vault.getAbstractFileByPath(path);
			if (!file) return null;
			const buffer = await app.vault.readBinary(file);
			// cada extrator já confere sua própria assinatura de arquivo
			// no início e sai imediatamente se não bater, então tentar os
			// três em sequência é barato mesmo quando não é o formato certo
			const art = this.extractId3CoverArt(buffer) || this.extractFlacCoverArt(buffer) || this.extractOggCoverArt(buffer);
			if (!art) return null;
			let binary = "";
			const chunkSize = 8192;
			for (let i = 0; i < art.bytes.length; i += chunkSize) {
				binary += String.fromCharCode.apply(null, art.bytes.subarray(i, i + chunkSize));
			}
			const base64 = typeof btoa === "function" ? btoa(binary) : Buffer.from(art.bytes).toString("base64");
			return `data:${art.mime};base64,${base64}`;
		} catch (e) {
			console.error("Game Library: falha ao ler capa embutida", e);
			return null;
		}
	}

	statusKey(status) {
		return ({ Playing: "playing", Completed: "completed", Platinum: "platinum", Backlog: "backlog", Dropped: "dropped", Wishlist: "wishlist" })[status] || "backlog";
	}

	accentFor(p) {
		return (p.accent && String(p.accent).length) ? p.accent : this.hashColor(p.title || p.file?.name);
	}

	/* ======================================================================
	   IMAGENS DE JOGO — UM RESOLVEDOR POR FINALIDADE
	   O vault guarda quatro imagens independentes por jogo, cada uma num
	   campo próprio do frontmatter:

	     cover      → capa principal (cards da Home, Biblioteca, etc.)
	     coverFicha → capa da ficha individual
	     background → arte de fundo da ficha (larga/cinemática)
	     featured   → arte dos cards de destaque (Home, vitrine Steam)

	   Nenhuma delas escreve ou lê o valor das outras: o usuário pode ter
	   a capa oficial como capa, uma artwork como fundo da ficha e uma
	   terceira no card de destaque. O que as liga é só o FALLBACK — se a
	   personalizada não existe, cai para a próxima imagem disponível, em
	   vez de deixar o componente vazio.

	   Antes, "fundo da ficha" e "card de destaque" dividiam o MESMO campo
	   (`background`), então escolher uma mudava a outra. Cada componente
	   também montava sua própria cadeia de fallback à mão, e elas não
	   batiam entre si. Agora a cadeia vive aqui, uma vez só.
	   (a tabela `imageChains` fica no construtor, junto de `folders`.)
	   ====================================================================== */

	// devolve { src, field, isFallback } para a finalidade pedida.
	// `isFallback` diz se a imagem veio de um campo diferente do próprio
	// da finalidade — o CSS usa isso para tratar uma capa vertical
	// reaproveitada como fundo largo (desfoque + zoom) em vez de esticá-la.
	gameImage(p, purpose = "cover") {
		const chain = this.imageChains[purpose] || this.imageChains.cover;
		for (const field of chain) {
			const raw = p?.[field];
			const val = String(raw ?? "").trim();
			if (!val) continue;
			const src = this.resolveImageSrc(val);
			if (src) return { src, field, isFallback: field !== chain[0] };
		}
		return { src: "", field: "", isFallback: false };
	}

	// atalho para quem só precisa do endereço da imagem
	gameImageSrc(p, purpose = "cover") {
		return this.gameImage(p, purpose).src;
	}

	/* ----------------------------------------------------------------------
	   ENQUADRAMENTO DO FUNDO DA FICHA
	   A imagem escolhida quase nunca tem a mesma proporção da faixa onde
	   ela aparece, então o navegador corta alguma parte. Estes três
	   valores dizem QUAL parte: dois eixos de posição e uma escala. São
	   guardados por jogo (bgPosX, bgPosY, bgZoom), e valem só para o
	   fundo da ficha — a capa e a imagem de destaque não são afetadas.

	   O arquivo de imagem nunca é alterado: o ajuste é só de exibição,
	   aplicado como background-position + escala da camada.

	   Sem valores salvos: centro/centro, escala padrão.
	   (os padrões ficam em `bgFramingDefaults`, no construtor.)
	   ---------------------------------------------------------------------- */
	bgFraming(p) {
		const d = this.bgFramingDefaults;
		const num = (v, def) => {
			// Number(null) e Number("") são 0, que aqui é uma posição
			// legítima (topo/esquerda) — sem esta checagem um campo vazio
			// no frontmatter seria lido como "colado no canto" em vez de
			// cair no padrão
			if (v === null || v === undefined || v === "") return def;
			const n = Number(v);
			return Number.isFinite(n) ? n : def;
		};
		const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
		return {
			x: clamp(num(p?.bgPosX, d.x), 0, 100),
			y: clamp(num(p?.bgPosY, d.y), 0, 100),
			// abaixo de 100 sobraria borda vazia na faixa, então esse é o piso:
			// "afastar" no controle significa voltar ao enquadramento cheio
			zoom: clamp(num(p?.bgZoom, d.zoom), 100, 220)
		};
	}

	// as variáveis CSS são o contrato entre o dado e o desenho: o mesmo
	// estilo serve para a ficha renderizada e para a prévia ao vivo
	bgFramingStyle(p) {
		const f = this.bgFraming(p);
		return `--svl-bg-x:${f.x}%; --svl-bg-y:${f.y}%; --svl-bg-zoom:${(f.zoom / 100).toFixed(3)};`;
	}

	// -------------------------------------------------------- imagens locais
	// Corrige o bug de capas/fundos não aparecerem: um <img src="Games/x.png">
	// direto NÃO funciona dentro do Obsidian (o webview usa um esquema de URL
	// próprio, tipo app://...). Precisa resolver o caminho do vault para uma
	// "resource path" de verdade antes de usar em src ou background-image.
	resolveImageSrc(pathOrUrl) {
		const val = String(pathOrUrl ?? "").trim();
		if (!val) return "";
		if (/^(https?:|data:|app:|capacitor:|blob:)/i.test(val)) return val;
		const clean = val.replace(/^\.?\//, "");
		const file = app.vault.getAbstractFileByPath(clean) || app.metadataCache.getFirstLinkpathDest?.(clean, "");
		if (file) return app.vault.getResourcePath(file);
		return val;
	}

	async ensureFolder(path) {
		const parts = String(path).split("/").filter(Boolean);
		let cur = "";
		for (const part of parts) {
			cur = cur ? `${cur}/${part}` : part;
			if (!app.vault.getAbstractFileByPath(cur)) {
				await app.vault.createFolder(cur).catch(() => {});
			}
		}
	}

	// salva um File (do <input type=file>) dentro do vault e devolve o
	// caminho relativo — pronto para ir direto no campo cover/background/icon.
	async saveDeviceImage(file, folder, baseName) {
		await this.ensureFolder(folder);
		const validExts = ["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg", "heic", "heif", "avif", "tif", "tiff"];
		const mimeToExt = {
			"image/png": "png", "image/jpeg": "jpg", "image/jpg": "jpg", "image/webp": "webp",
			"image/gif": "gif", "image/bmp": "bmp", "image/svg+xml": "svg", "image/heic": "heic",
			"image/heif": "heif", "image/avif": "avif", "image/tiff": "tiff"
		};
		const extMatch = /\.([a-z0-9]+)$/i.exec(file.name || "");
		let ext = extMatch ? extMatch[1].toLowerCase() : "";
		// nem todo seletor de arquivo (principalmente ao escolher direto da
		// galeria em alguns celulares) preserva uma extensão reconhecível no
		// nome — nesse caso, usa o tipo MIME real do arquivo em vez de cair
		// sempre para .png, que era a causa de outros formatos não funcionarem.
		if (!validExts.includes(ext)) {
			ext = mimeToExt[file.type] || "jpg";
		}
		let buf = await file.arrayBuffer();
		// 3.55.0: foto do aparelho passa pela mesma compressão das artes da
		// Steam (WebP, sem ampliar): uma foto de celular de 5 MB vira algumas
		// centenas de KB. GIF (animação), SVG e arquivos pequenos ficam como
		// vieram; se o aparelho não decodificar o formato, grava o original
		const S = customJS.SteamVaultSteam;
		if (S?._compress && /^(png|jpe?g|webp|bmp|avif|tiff?)$/.test(ext) && buf.byteLength > 300 * 1024) {
			const maxW = /\/Covers\b/.test(folder) ? 1200 : /\/Logos\b/.test(folder) ? 1000 : 2560;
			const out = await S._compress({ buf, ext }, { maxW, alpha: !/^jpe?g$/.test(ext) });
			if (out?.buf) { buf = out.buf; ext = out.ext; }
		}
		const safe = this.safeName(baseName, "imagem");
		let path = `${folder}/${safe}.${ext}`;
		let n = 1;
		while (app.vault.getAbstractFileByPath(path)) {
			n += 1;
			path = `${folder}/${safe}-${n}.${ext}`;
		}
		await app.vault.createBinary(path, buf);
		return path;
	}

	// mesma lógica do saveDeviceImage, mas para arquivos de áudio da
	// seção Soundtrack
	async saveDeviceAudio(file, folder, baseName) {
		await this.ensureFolder(folder);
		const validExts = ["mp3", "wav", "ogg", "m4a", "aac", "flac", "opus", "wma", "weba"];
		const mimeToExt = {
			"audio/mpeg": "mp3", "audio/mp3": "mp3", "audio/wav": "wav", "audio/x-wav": "wav",
			"audio/ogg": "ogg", "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/aac": "aac",
			"audio/flac": "flac", "audio/opus": "opus", "audio/webm": "weba"
		};
		const extMatch = /\.([a-z0-9]+)$/i.exec(file.name || "");
		let ext = extMatch ? extMatch[1].toLowerCase() : "";
		if (!validExts.includes(ext)) {
			ext = mimeToExt[file.type] || "mp3";
		}
		const safe = this.safeName(baseName, "musica");
		let path = `${folder}/${safe}.${ext}`;
		let n = 1;
		while (app.vault.getAbstractFileByPath(path)) {
			n += 1;
			path = `${folder}/${safe}-${n}.${ext}`;
		}
		const buf = await file.arrayBuffer();
		await app.vault.createBinary(path, buf);
		return path;
	}

	// mesma resolução de caminho do vault usada pelas imagens — funciona
	// para qualquer arquivo local (áudio incluso), só com um nome mais
	// claro no contexto de mídia que não é imagem.
	resolveFileSrc(pathOrUrl) {
		return this.resolveImageSrc(pathOrUrl);
	}

	// ---------------------------------------------------------- pedacinhos
	chip(text, icon = "") {
		if (!text) return "";
		return `<span class="svl-chip">${icon ? icon + " " : ""}${this.esc(text)}</span>`;
	}

	/* ----------------------------------------------------------------------
	   CONQUISTAS — CAMPOS DE CADA ORIGEM
	   Uma conquista pode vir de três lugares, cada um com seus próprios
	   campos no frontmatter — e eles NUNCA são misturados nem convertidos
	   um no outro:
	     Steam (e Exophase, que só completa descrições da Steam):
	       steamAppId, steamGlobalPercent, steamOrder
	     RetroAchievements:
	       raId (Achievement ID), raGameId (Game ID do CONJUNTO de onde a
	       conquista veio), raSetTitle, raSetKind (base/subset),
	       raDisplayOrder, raPercent, raSet (tipo: progression,
	       win_condition, missable — nome histórico do campo)
	     Manual: nenhum identificador de plataforma.
	   (a leitura e a ordem das conquistas ficam no SteamVaultCore; aqui
	   ficam só os auxiliares usados pelo sync)
	   ---------------------------------------------------------------------- */
	_achNum(value) {
		if (value === null || value === undefined) return null;
		if (typeof value === "string" && value.trim() === "") return null;
		const n = Number(value);
		return Number.isFinite(n) ? n : null;
	}

	// "God of War [Subset - Bonus]" → "Bonus"; vazio se não for subset
	_raSubsetName(title) {
		const m = /\[\s*subset\s*[-–—:]\s*([^\]]+?)\s*\]/i.exec(String(title ?? ""));
		return m ? m[1] : "";
	}

	// origem das conquistas (Core): lê achievementProvider e os campos antigos
	_pv(p) { return customJS.SteamVaultCore.achievementProvider(p || {}); }

	// campos "Origem" + "Sincronização" (formulários de adicionar e editar):
	// duas escolhas separadas; os modos que a origem não aceita ficam desativados
	// 1.12.0: "Possui franquia?" — Não = sem franquia (fora da aba Franquias);
	// Sim = escolher uma franquia existente ou digitar uma nova
	_franchiseFieldsHtml(prefix, current = "", order = "") {
		const C = customJS.SteamVaultCore;
		const has = !!C.str(current);
		const names = C.franchiseNames();
		return `<div class="svl-field svl-franchise-field" id="${prefix}-wrap">
				<label>Possui franquia?</label>
				<div class="svl-segmented" id="${prefix}-has" role="radiogroup" aria-label="Possui franquia?">
					<button type="button" class="svl-segmented-opt${has ? "" : " is-active"}" data-value="no" role="radio" aria-checked="${!has}">Não</button>
					<button type="button" class="svl-segmented-opt${has ? " is-active" : ""}" data-value="yes" role="radio" aria-checked="${has}">Sim</button>
				</div>
			</div>
			<div class="svl-field" data-fr-when="yes"${has ? "" : " hidden"}><label for="${prefix}">Franquia</label>
				<input type="text" class="svl-input" id="${prefix}" value="${this.esc(current)}" placeholder="Escolha ou digite uma nova" autocomplete="off" list="${prefix}-list" maxlength="80">
				<datalist id="${prefix}-list">${names.map(n => `<option value="${this.esc(n)}">`).join("")}</datalist>
				<small class="svl-field-hint" id="${prefix}-hint">${names.length ? "Escolha uma das suas franquias ou digite o nome de uma nova" : "Digite o nome da franquia: ela é criada ao salvar"}</small></div>
			<div class="svl-field" data-fr-when="yes"${has ? "" : " hidden"}><label for="${prefix}-order">Ordem na saga</label>
				<small class="svl-field-hint">Opcional. Vazio = ordena por ano de lançamento</small>
				<input type="number" class="svl-input" id="${prefix}-order" value="${this.esc(order ?? "")}" placeholder="1" inputmode="numeric"></div>`;
	}

	_wireFranchise(root, prefix) {
		const C = customJS.SteamVaultCore;
		const seg = root.querySelector(`#${prefix}-has`), input = root.querySelector(`#${prefix}`), hint = root.querySelector(`#${prefix}-hint`);
		if (!seg || !input) return;
		const names = C.franchiseNames();
		const set = yes => {
			seg.querySelectorAll("[data-value]").forEach(b => { const on = (b.dataset.value === "yes") === yes; b.classList.toggle("is-active", on); b.setAttribute("aria-checked", String(on)); });
			root.querySelectorAll(`#${prefix}-wrap ~ [data-fr-when]`).forEach(el => { el.hidden = !yes; });
			if (yes) requestAnimationFrame(() => input.focus({ preventScroll: true }));
		};
		seg.addEventListener("click", e => { const b = e.target.closest("[data-value]"); if (b) set(b.dataset.value === "yes"); });
		// avisa quando o nome digitado é uma franquia que já existe (com outra grafia) ou uma nova
		input.addEventListener("input", () => {
			const k = C.normalizeKey(input.value), hit = k && names.find(n => C.normalizeKey(n) === k);
			hint.textContent = !k ? "Escolha uma das suas franquias ou digite o nome de uma nova" : hit ? (hit === input.value.trim() ? "Franquia existente" : `Vai entrar em “${hit}”, que já existe`) : "Franquia nova: ela é criada ao salvar";
		});
	}

	// valor a gravar: "" com Não; com Sim, o nome na grafia da franquia existente
	_franchiseValue(root, prefix) {
		const C = customJS.SteamVaultCore;
		const yes = root.querySelector(`#${prefix}-has [data-value="yes"]`)?.classList.contains("is-active");
		return yes ? C.canonicalFranchise(root.querySelector(`#${prefix}`)?.value || "") : "";
	}

	_achFieldsHtml(prefix, provider, sync) {
		const C = customJS.SteamVaultCore;
		const groups = C.providerGroups.map(([id, label]) => `<optgroup label="${this.esc(label)}">${Object.entries(C.providerDefs).filter(([, d]) => d.group === id)
			.map(([k, d]) => `<option value="${k}"${k === provider ? " selected" : ""}>${this.esc(d.label)}</option>`).join("")}</optgroup>`).join("");
		const modes = C.syncModes(provider);
		return `<div class="svl-field-grid svl-achfields" id="${prefix}" data-provider="${this.esc(provider)}" data-sync="${this.esc(sync)}">
			<div class="svl-field"><label for="${prefix}-provider">Origem das conquistas</label>
				<select class="svl-input" id="${prefix}-provider">${groups}</select></div>
			<div class="svl-field"><label>Sincronização</label>
				<div class="svl-segmented svl-achfields-sync" id="${prefix}-sync">${Object.entries(C.syncDefs).map(([k, d]) => `<button type="button" class="svl-segmented-opt${k === sync ? " is-active" : ""}" data-value="${k}"${modes.includes(k) ? "" : " disabled"}>${this.esc(d.label)}</button>`).join("")}</div>
				<small class="svl-field-hint" id="${prefix}-hint">${this.esc(C.syncDefs[sync]?.hint || "")}</small></div>
		</div>`;
	}

	_wireAchFields(root, prefix, onChange = () => {}) {
		const C = customJS.SteamVaultCore;
		const wrap = root.querySelector(`#${prefix}`);
		if (!wrap) return () => ({ provider: "unset", sync: "none" });
		const sel = wrap.querySelector(`#${prefix}-provider`), seg = wrap.querySelector(`#${prefix}-sync`), hint = wrap.querySelector(`#${prefix}-hint`);
		const paint = () => {
			const pv = wrap.dataset.provider, modes = C.syncModes(pv);
			if (!modes.includes(wrap.dataset.sync)) wrap.dataset.sync = modes[0];
			seg.querySelectorAll("[data-value]").forEach(b => {
				b.disabled = !modes.includes(b.dataset.value);
				b.classList.toggle("is-active", b.dataset.value === wrap.dataset.sync);
			});
			const def = C.providerDefs[pv];
			hint.textContent = C.syncDefs[wrap.dataset.sync].hint + (pv === "xbox" ? " · Conquistas, G e ícones cadastrados por você na ficha do jogo, uma a uma ou em lote." : def.group === "online" && !def.integration ? ` · ${def.label} ainda não tem integração automática.` : "");
			onChange({ provider: pv, sync: wrap.dataset.sync });
		};
		sel.addEventListener("change", () => { wrap.dataset.provider = sel.value; paint(); });
		seg.addEventListener("click", e => {
			const b = e.target.closest("[data-value]");
			if (!b || b.disabled) return;
			wrap.dataset.sync = b.dataset.value; paint();
		});
		paint();
		return () => ({ provider: wrap.dataset.provider, sync: wrap.dataset.sync });
	}

	// as cinco seções "de atividade" do jogo (conquistas, screenshots,
	// soundtrack, DLCs, sessões) num único card contínuo, compacto — em
	// vez de cinco caixas separadas com bastante espaço entre elas.
	// Reaproveita cada seção por inteiro, sem tocar no HTML/JS de dentro;
	// o CSS "esconde" a moldura própria de cada uma pra virarem blocos
	// do mesmo componente, com um rótulo pequeno identificando cada uma.
	// cada seção de atividade (conquistas, screenshots, soundtrack, dlc,
	// sessões) vira seu PRÓPRIO card independente — mesmo visual do
	// card único de antes (borda, rótulo, divisórias), mas cada um num
	// bloco dataviewjs separado. Isso importa de verdade pro desempenho:
	// um card único reagindo a qualquer mudança forçava o Dataview a
	// re-renderizar as cinco seções inteiras (achievements incluso, que
	// faz uma varredura no vault) toda vez que você marcava só uma DLC.
	// Com cards independentes, marcar uma DLC só re-renderiza a DLC.
	// estado vazio com um ícone grande e discreto acima do texto, ao
	// invés de só uma linha de texto cinza solta
	emptyHint(icon, text, opts = {}) {
		const cls = opts.large ? "svl-empty-hint svl-empty-hint-lg" : "svl-empty-hint";
		// opts.type liga uma ilustração de fundo temática (ver CSS); sem
		// ele, o vazio continua exatamente como antes (ícone + texto).
		const typeAttr = opts.type ? ` data-empty-type="${this.esc(opts.type)}"` : "";
		return `<div class="${cls}"${typeAttr}><span class="svl-empty-hint-icon">${icon}</span><span>${text}</span></div>`;
	}

	/* ======================================================================
	   TIER LIST — ranking pessoal dos jogos zerados
	   Faixas fixas (S a D) mais a bandeja dos que ainda não foram
	   ranqueados. A posição de cada jogo fica no frontmatter do PRÓPRIO
	   jogo (`tier` e `tierOrder`), não numa nota-lista: ao contrário das
	   Coleções, que são várias listas independentes, aqui cada jogo tem
	   uma posição só — é uma ordenação, não uma curadoria.

	   Consequência prática disso: a página pode ser reconstruída do zero
	   a qualquer momento a partir dos jogos, e mover um jogo não exige
	   reescrever nenhuma outra nota.
	   ====================================================================== */

	/* ----------------------------------------------------------------------
	   ARRASTAR NA TIER LIST
	   Pointer Events em vez de HTML5 drag-and-drop: o drag-and-drop nativo
	   simplesmente não existe em toque, e metade do uso aqui é no celular.
	   O mesmo código serve para mouse, dedo e caneta.

	   O gesto só começa depois de uns pixels de movimento (`LIMIAR`). Sem
	   isso, um toque parado vira arraste e o usuário não consegue mais
	   ROLAR a página começando o dedo em cima de uma capa — que é
	   exatamente onde as capas estão. Antes do limiar o toque pertence à
	   página; depois dele, passa a pertencer à tier list.
	   ---------------------------------------------------------------------- */

	/* ======================================================================
	   ZERADAS (PLAYTHROUGHS) — o histórico de cada vez que você terminou
	   Antes havia um par `startDate`/`completionDate`: uma conclusão só
	   por jogo. Zerar de novo obrigava a escolher entre apagar a data
	   antiga ou não registrar a nova.

	   Agora existe `playthroughs: []`, no mesmo formato de `sessions` e
	   `dlc`. Cada entrada: { start, end, difficulty, platform, note }.
	   Uma entrada SEM `end` é uma rejogada em andamento — começar de novo
	   e parar no meio é um fato tão registrável quanto terminar, e sem
	   isso não haveria onde anotar que você recomeçou.

	   `completionDate` NÃO foi aposentado, e isso é deliberado: o heatmap
	   de atividade, a retrospectiva anual e os prêmios leem esse campo.
	   Ele continua sendo a data da PRIMEIRA conclusão, e a leitura abaixo
	   o trata como uma zerada implícita quando a lista está vazia. Assim
	   nenhum jogo antigo perde o que já tinha registrado, e nada precisou
	   ser reescrito em massa no disco.
	   ====================================================================== */
	playthroughsOf(p) {
		const list = Array.isArray(p?.playthroughs) ? p.playthroughs : [];
		if (list.length) return list;
		// jogo que só tem o par antigo: vira uma zerada implícita, de
		// leitura, para a seção não aparecer vazia em quem já registrou
		const end = this.dateISO(p?.completionDate);
		const start = this.dateISO(p?.startDate);
		if (!end && !start) return [];
		return [{ start, end, difficulty: "", platform: p?.platform || "", note: "", legacy: true }];
	}

	// contagens derivadas — nunca guardadas, sempre recalculadas, como o
	// resto do vault faz com progresso
	playthroughStats(p) {
		const list = this.playthroughsOf(p);
		const done = list.filter(t => this.dateISO(t?.end));
		const ongoing = list.filter(t => !this.dateISO(t?.end) && this.dateISO(t?.start));
		const dates = done.map(t => this.dateISO(t.end)).filter(Boolean).sort();
		return {
			total: list.length,
			completions: done.length,
			ongoing: ongoing.length,
			first: dates[0] || "",
			last: dates[dates.length - 1] || ""
		};
	}

	// escala curta em vez de número: "quão difícil o jogo é" é um juízo
	// grosso, e cinco degraus nomeados se comparam melhor entre jogos do
	// que notas de 1 a 10, que cada pessoa calibra de um jeito
	difficultyRatings() {
		return [
			["", "—"],
			["Tranquilo", "😌 Tranquilo"],
			["Normal", "🙂 Normal"],
			["Puxado", "😤 Puxado"],
			["Brutal", "💀 Brutal"]
		];
	}

	playthroughRow(t, index) {
		const start = this.formatDateValue(t?.start);
		const end = this.formatDateValue(t?.end);
		const open = !this.dateISO(t?.end);
		const periodo = open
			? (start ? `Começou em ${this.esc(start)}` : "Em andamento")
			: (start && start !== end ? `${this.esc(start)} → ${this.esc(end)}` : this.esc(end));
		const tags = [
			t?.difficulty ? this.chip(this.esc(t.difficulty), "🎚️") : "",
			t?.platform ? this.chip(this.esc(t.platform), "🎮") : ""
		].filter(Boolean).join("");
		return `<div class="svl-playthrough-row${open ? " is-open" : ""}">
			<span class="svl-playthrough-num">${index + 1}ª</span>
			<div class="svl-playthrough-main">
				<span class="svl-playthrough-period">${periodo}${open ? ` <span class="svl-playthrough-flag">em andamento</span>` : ""}</span>
				${t?.note ? `<span class="svl-playthrough-note">${this.esc(t.note)}</span>` : ""}
				${tags ? `<span class="svl-chip-row">${tags}</span>` : ""}
			</div>
		</div>`;
	}

	playthroughsSection(p) {
		const list = this.playthroughsOf(p);
		const s = this.playthroughStats(p);
		const legacy = list.some(t => t.legacy);
		const resumo = s.completions
			? `<div class="svl-playthrough-summary">Zerado ${s.completions}×${s.ongoing ? ` · ${s.ongoing} em andamento` : ""}${s.first && s.last && s.first !== s.last ? ` · de ${this.esc(this.formatDateValue(s.first))} a ${this.esc(this.formatDateValue(s.last))}` : ""}</div>`
			: (s.ongoing ? `<div class="svl-playthrough-summary">${s.ongoing} rejogada em andamento</div>` : "");
		const body = list.length
			? `${resumo}<div class="svl-playthrough-list svl-list-card">${list.map((t, i) => this.playthroughRow(t, i)).join("")}</div>${legacy ? `<div class="svl-playthrough-legacy">A primeira veio da data de conclusão já registrada na ficha.</div>` : ""}`
			: this.emptyHint("🔁", "Nenhuma zerada registrada ainda.");

		const difOptions = this.difficultyRatings()
			.map(([v, l]) => `<option value="${this.esc(v)}"${String(p?.difficultyRating || "") === v ? " selected" : ""}>${this.esc(l)}</option>`).join("");

		// 3.62.0: a dificuldade do jogo (salva sozinha ao mudar) fica junto da
		// lista, antes do formulário de nova zerada e dos botões dele
		return `${body}
			<div class="svl-field svl-playthrough-difficulty">
				<label for="svl-pt-rating">Quão difícil é o jogo</label>
				<small class="svl-field-hint">Sua opinião sobre o jogo em si — diferente da dificuldade em que você zerou. Salva sozinha ao escolher.</small>
				<select class="svl-input" id="svl-pt-rating">${difOptions}</select>
			</div>
			<div class="svl-add-wrap svl-add-wrap-sm">
				<button type="button" class="svl-add-btn svl-add-btn-sm" id="svl-pt-toggle">
					<span class="svl-add-btn-icon">+</span> Registrar zerada
				</button>
				<div class="svl-form" id="svl-pt-form">
					<div class="svl-form-inner">
						<div class="svl-field">
							<label for="svl-pt-end">Data em que zerou</label>
							<small class="svl-field-hint">Deixe vazio se for uma rejogada que ainda está em andamento</small>
							<input type="date" class="svl-input" id="svl-pt-end">
						</div>
						<div class="svl-field">
							<label for="svl-pt-start">Data em que começou (opcional)</label>
							<input type="date" class="svl-input" id="svl-pt-start">
						</div>
						<div class="svl-field">
							<label for="svl-pt-difficulty">Dificuldade em que zerou (opcional)</label>
							<small class="svl-field-hint">Campo livre: cada jogo nomeia a sua (Hard, Ultra-Violence, Assist Mode…)</small>
							<input type="text" class="svl-input" id="svl-pt-difficulty" list="svl-pt-difficulty-sug" placeholder="Ex: Normal">
							<datalist id="svl-pt-difficulty-sug">
								<option value="Fácil"></option><option value="Normal"></option>
								<option value="Difícil"></option><option value="Muito difícil"></option>
								<option value="New Game+"></option>
							</datalist>
						</div>
						<div class="svl-field">
							<label for="svl-pt-platform">Plataforma dessa vez (opcional)</label>
							<input type="text" class="svl-input" id="svl-pt-platform" placeholder="${this.esc(p?.platform || "PC")}">
						</div>
						<div class="svl-field">
							<label for="svl-pt-note">Observação (opcional)</label>
							<input type="text" class="svl-input" id="svl-pt-note" placeholder="Ex: 100%, com amigo, NG+">
						</div>
						<div class="svl-form-actions">
							<button type="button" class="svl-btn-ghost" id="svl-pt-cancel">Cancelar</button>
							<button type="button" class="svl-btn-primary" id="svl-pt-submit">Registrar</button>
						</div>
						<div class="svl-form-msg" id="svl-pt-msg"></div>
					</div>
				</div>
			</div>
`;
	}

	wirePlaythroughsSection(root, p) {
		const toggleBtn = root.querySelector("#svl-pt-toggle");
		const form = root.querySelector("#svl-pt-form");
		const msg = root.querySelector("#svl-pt-msg");
		const ratingSel = root.querySelector("#svl-pt-rating");

		// a nota de dificuldade do jogo salva sozinha ao mudar: é um campo
		// só, e um botão "Salvar" para ele seria cerimônia demais
		ratingSel?.addEventListener("change", async () => {
			try {
				const file = app.vault.getAbstractFileByPath(p.file.path);
				if (!file) throw new Error("arquivo não encontrado");
				await app.fileManager.processFrontMatter(file, fm => { fm.difficultyRating = ratingSel.value || ""; });
			} catch (err) {
				if (msg) { msg.textContent = "Não consegui salvar: " + (err?.message || err); msg.className = "svl-form-msg is-error"; }
			}
		});

		if (!toggleBtn || !form) return;
		const cancelBtn = root.querySelector("#svl-pt-cancel");
		const submitBtn = root.querySelector("#svl-pt-submit");
		const openForm = () => { form.classList.add("is-open"); toggleBtn.classList.add("is-open"); form.style.maxHeight = (form.scrollHeight + 40) + "px"; };
		const closeForm = () => { form.style.maxHeight = "0px"; form.classList.remove("is-open"); toggleBtn.classList.remove("is-open"); };
		toggleBtn.addEventListener("click", () => form.classList.contains("is-open") ? closeForm() : openForm());
		cancelBtn?.addEventListener("click", closeForm);

		submitBtn?.addEventListener("click", async () => {
			const v = id => root.querySelector(`#${id}`)?.value.trim() || "";
			const end = v("svl-pt-end"), start = v("svl-pt-start");
			if (!end && !start) {
				msg.textContent = "Informe pelo menos uma das duas datas.";
				msg.className = "svl-form-msg is-error";
				return;
			}
			if (end && start && start > end) {
				msg.textContent = "A data de início é depois da data em que zerou.";
				msg.className = "svl-form-msg is-error";
				return;
			}
			submitBtn.disabled = true;
			try {
				const file = app.vault.getAbstractFileByPath(p.file.path);
				if (!file) throw new Error("arquivo não encontrado");
				await app.fileManager.processFrontMatter(file, fm => {
					if (!Array.isArray(fm.playthroughs)) fm.playthroughs = [];
					// primeira zerada registrada num jogo que já tinha o par
					// antigo: a antiga entra na lista antes da nova, senão o
					// histórico começaria a contar do zero
					if (!fm.playthroughs.length && (fm.completionDate || fm.startDate)) {
						fm.playthroughs.push({
							start: this.dateISO(fm.startDate), end: this.dateISO(fm.completionDate),
							difficulty: "", platform: fm.platform || "", note: ""
						});
					}
					const entry = { start, end };
					const dif = v("svl-pt-difficulty"), plat = v("svl-pt-platform"), note = v("svl-pt-note");
					if (dif) entry.difficulty = dif;
					if (plat) entry.platform = plat;
					if (note) entry.note = note;
					fm.playthroughs.push(entry);
					// completionDate segue sendo a PRIMEIRA conclusão, porque
					// é dela que o heatmap, a retrospectiva e os prêmios vivem
					const ends = fm.playthroughs.map(t => this.dateISO(t?.end)).filter(Boolean).sort();
					if (ends.length) fm.completionDate = ends[0];
					if (end && !this.isCompletedStatus(fm.status)) fm.status = "Completed";
				});
				msg.textContent = "Registrado. Recarregue a nota pra ver na lista.";
				msg.className = "svl-form-msg is-ok";
				["svl-pt-end", "svl-pt-start", "svl-pt-difficulty", "svl-pt-platform", "svl-pt-note"]
					.forEach(id => { const el = root.querySelector(`#${id}`); if (el) el.value = ""; });
			} catch (err) {
				msg.textContent = "Não consegui registrar: " + (err?.message || err);
				msg.className = "svl-form-msg is-error";
			} finally {
				submitBtn.disabled = false;
			}
		});
	}

	/* ----------------------------------------------------------------------
	   FICHA — FATOS DO JOGO
	   Os mesmos dados de sempre e exatamente as mesmas regras de quando
	   cada um aparece; o que muda é a forma: em vez de uma lista vertical
	   de 15 linhas, uma grade de blocos agrupada por assunto (progresso,
	   tempo, sobre, avaliação, compra). Campo vazio continua não aparecendo.
	   ---------------------------------------------------------------------- */

	/* ----------------------------------------------------------------------
	   FICHA — PAINEL DE INFORMAÇÕES (layout "ficha Steam")
	   Mesmos dados e mesmas regras de exibição de antes (campo vazio não
	   aparece); muda só a apresentação: em vez de um cartão com borda para
	   cada dado, cada seção usa três formas simples —
	     · números de destaque (valor grande + rótulo pequeno)
	     · linhas rótulo/valor alinhadas (metadados)
	     · medidores (conquistas, avaliação)
	   separadas por fios finos. Ícones das seções em SVG de traço único,
	   herdando a cor do texto — nada de emoji misturado.
	   ---------------------------------------------------------------------- */

	// --------------------------------------------- editor de imagens do jogo
	// Quatro finalidades independentes, uma por campo do frontmatter (ver
	// gameImage()). Deixar vazio não quebra nada: a finalidade volta a
	// usar a cadeia de fallback automático.
	coverEditPanel(p = null) {
		return `<div class="svl-cover-edit-wrap">
			<button type="button" class="svl-edit-cover-btn" id="svl-ce-toggle">
				<span class="svl-edit-btn-icon">🖼️</span>
				<span class="svl-edit-btn-text"><strong>Imagens personalizadas</strong><small>Capa, capa da ficha, fundo e imagem de destaque</small></span>
				<span class="svl-edit-btn-chevron">›</span>
			</button>
			<div class="svl-form" id="svl-ce-form">
				<div class="svl-form-inner">
					${this.formSec("Capas", `
						${this.imagePickerField({ id: "svl-ce-cover", label: "Capa do card (Home, Biblioteca, etc.)" })}
						${this.imagePickerField({ id: "svl-ce-cover-ficha", label: "Capa desta ficha", hint: "Vazio = usa a capa do card" })}`, { icon: "image", sub: "A arte em pé dos cards e do topo da ficha" })}
					${this.formSec("Fundo e destaque", `
						${this.imagePickerField({ id: "svl-ce-background", label: "Fundo da ficha", placeholder: "URL ou escolha abaixo", hint: "Arte larga, de fundo desta página. Vazio = usa a imagem de destaque ou a capa" })}
						${this.bgFramingControls(p)}
						${this.imagePickerField({ id: "svl-ce-featured", label: "Imagem de destaque", placeholder: "URL ou escolha abaixo", hint: "Arte horizontal dos cards de destaque (Home e vitrine Steam). Vazio = usa o fundo da ficha ou a capa" })}`, { icon: "monitor", sub: "Artes largas: fundo desta página e cards de destaque" })}
					${this.formSec("Logo", `
						${this.imagePickerField({ id: "svl-ce-logo", label: "Logo do jogo", placeholder: "URL ou escolha abaixo", hint: "Imagem com fundo transparente (PNG ou WebP). Aparece no lugar do nome, no topo da ficha" })}
						<div class="svl-field svl-logo-mode">
						<label>No topo da ficha</label>
						<div class="svl-segmented" id="svl-ce-logomode" role="radiogroup" aria-label="No topo da ficha">
							<button type="button" class="svl-segmented-opt" data-v="logo" role="radio">Mostrar a logo</button>
							<button type="button" class="svl-segmented-opt" data-v="name" role="radio">Mostrar o nome</button>
						</div>
						<small class="svl-field-hint" id="svl-ce-logohint"></small>
					</div>`, { icon: "sparkles", sub: "Opcional. Aparece no lugar do nome, no topo da ficha" })}
					<div class="svl-form-actions">
						<button type="button" class="svl-btn-ghost" id="svl-ce-cancel">Cancelar</button>
						<button type="button" class="svl-btn-primary" id="svl-ce-save">Salvar</button>
					</div>
					<div class="svl-form-msg" id="svl-ce-msg"></div>
				</div>
			</div>
		</div>`;
	}

	// controles de enquadramento do fundo — ficam logo abaixo do seletor
	// da imagem, como um sub-bloco do mesmo campo, e não como uma tela à
	// parte. A prévia é a própria ficha atrás do formulário: mexer nos
	// controles reposiciona o fundo de verdade, ao vivo.
	bgFramingControls(p = null) {
		const row = (id, icon, label, min, max, step, left, right) => `<div class="svl-framing-row">
			<span class="svl-framing-label" id="${id}-label">${icon} ${this.esc(label)}</span>
			<div class="svl-framing-slider">
				<span class="svl-framing-end" aria-hidden="true">${this.esc(left)}</span>
				<input type="range" class="svl-range" id="${id}" min="${min}" max="${max}" step="${step}"
					aria-label="${this.esc(label)}" aria-describedby="${id}-out">
				<span class="svl-framing-end" aria-hidden="true">${this.esc(right)}</span>
			</div>
			<output class="svl-framing-value" id="${id}-out" aria-live="off">${""}</output>
		</div>`;

		return `<div class="svl-field svl-framing">
			<label>Enquadramento do fundo</label>
			<small class="svl-field-hint">Escolhe qual parte da arte aparece. Não altera o arquivo da imagem, e vale só para esta ficha.</small>
			${this.bgFramingPreview(p)}
			${row("svl-ce-bgx", "↔️", "Horizontal", 0, 100, 1, "esq.", "dir.")}
			${row("svl-ce-bgy", "↕️", "Vertical", 0, 100, 1, "cima", "baixo")}
			${row("svl-ce-bgzoom", "🔍", "Zoom", 100, 220, 1, "−", "+")}
			<button type="button" class="svl-picker-btn svl-framing-reset" id="svl-ce-bgreset">↺ Restaurar posição</button>
		</div>`;
	}

	/* ----------------------------------------------------------------------
	   PRÉVIA DO ENQUADRAMENTO
	   Não é um desenho parecido com a ficha: é a MESMA marcação e as
	   MESMAS classes do gameHero(), num contêiner mais estreito. Assim a
	   prévia herda de graça a borda, a vinheta (::after), o tint, o brilho
	   do acento, o formato da capa e a tipografia do título — e continua
	   herdando se qualquer uma dessas regras mudar depois. Imitar tudo
	   isso à mão daria uma prévia que envelhece mal e mente aos poucos.

	   Fica de fora só o que depende de consulta ao Dataview (barra de
	   progresso) e o que é interativo (botão de favorito): a prévia é para
	   olhar, e recriar um botão com o mesmo id quebraria o da ficha.
	   ---------------------------------------------------------------------- */
	bgFramingPreview(p) {
		if (!p) return "";
		const title = p.title || p.file?.name || "";
		const coverSrc = this.gameImageSrc(p, "fichaCover");
		const cover = coverSrc
			? `<img src="${this.esc(coverSrc)}" alt="" loading="lazy" decoding="async">`
			: `<span class="svl-cover-fallback" style="background:${this.hashColorMuted(title)}">${this.esc(String(title).charAt(0).toUpperCase())}</span>`;
		const bg = this.gameImage(p, "background");
		const metaParts = [p.platform, customJS.SteamVaultCore.providerLabel(this._pv(p))].filter(Boolean);

		return `<div class="svl-framing-preview" id="svl-ce-bgpreview">
			<div class="svl-framing-preview-head">
				<span>Prévia da ficha</span>
				<span class="svl-framing-preview-tip">arraste a imagem para posicionar</span>
			</div>
			<div class="svl-game-hero is-framing-preview" data-status="${this.statusKey(p.status)}">
				<div class="svl-game-hero-bg">
					<div class="svl-game-hero-bg-image${bg.isFallback ? " is-fallback" : ""}" id="svl-ce-bglayer"
						style="${bg.src ? `background-image:url('${this.esc(bg.src)}');` : ""} ${this.bgFramingStyle(p)}"></div>
					<div class="svl-game-hero-glow" style="--svl-hero-accent:${this.esc(this.accentFor(p))};"></div>
					<div class="svl-game-hero-bg-tint"></div>
				</div>
				<div class="svl-game-hero-top">
					<div class="svl-cover svl-cover-portrait svl-game-hero-cover">${cover}</div>
				</div>
				<div class="svl-game-hero-info">
					<h1>${this.esc(title)}</h1>
					${metaParts.length ? `<div class="svl-game-hero-meta">${metaParts.map(m => this.esc(m)).join(" • ")}</div>` : ""}
					<div class="svl-hero-badges">
						<span class="svl-status-pill status-${this.statusKey(p.status)}">${this.esc(this.statusLabels[p.status] || p.status || "")}</span>
					</div>
				</div>
			</div>
			<p class="svl-framing-preview-empty">Escolha uma imagem acima para ver a prévia.</p>
		</div>`;
	}

	wireCoverEditor(root, p) {
		const toggleBtn = root.querySelector("#svl-ce-toggle");
		const form = root.querySelector("#svl-ce-form");
		const cancelBtn = root.querySelector("#svl-ce-cancel");
		const saveBtn = root.querySelector("#svl-ce-save");
		const msg = root.querySelector("#svl-ce-msg");
		if (!toggleBtn || !form) return;

		const coverInput = root.querySelector("#svl-ce-cover");
		const coverFichaInput = root.querySelector("#svl-ce-cover-ficha");
		const bgInput = root.querySelector("#svl-ce-background");
		const featuredInput = root.querySelector("#svl-ce-featured");
		if (coverInput) coverInput.value = p.cover || "";
		if (coverFichaInput) coverFichaInput.value = p.coverFicha || "";
		if (bgInput) bgInput.value = p.background || "";
		if (featuredInput) featuredInput.value = p.featured || "";
		const logoInput = root.querySelector("#svl-ce-logo");
		if (logoInput) logoInput.value = p.logo || "";

		const baseName = () => p.title || p.file.name;
		// cada seletor salva num campo e num nome de arquivo próprios —
		// nenhum dos quatro nunca escreve ou lê o valor dos outros.
		/* --- prévias fiéis ao que aparece de verdade ---
		   Cada miniatura tem o formato do lugar onde a imagem é usada (capa
		   vertical, topo da ficha, card de destaque da Home) e, com o campo
		   vazio, mostra o que a Game Library usa no lugar — a mesma cadeia de
		   reserva das telas — com uma etiqueta dizendo de onde veio. */
		const title = baseName(), hue = customJS.SteamVaultCore?.hashHue?.(title) ?? 210;
		const val = id => root.querySelector(`#${id}`)?.value.trim() || "";
		const srcOf = v => v ? this.resolveImageSrc(v) : "";
		const tag = t => `<span class="svl-prev-tag">${this.esc(t)}</span>`;
		const fallback = () => `<div class="sv-cover-fallback" style="--sv-hue:${hue}"><span class="sv-cover-fallback-title">${this.esc(title)}</span><span class="sv-cover-fallback-meta">${this.esc(p.platform || "")}</span></div>`;
		const framingStyle = () => {
			const n = (id, d) => { const v = Number(root.querySelector(`#${id}`)?.value); return Number.isFinite(v) && v ? v : d; };
			const f = this.bgFraming(p), x = n("svl-ce-bgx", f.x), y = n("svl-ce-bgy", f.y), z = n("svl-ce-bgzoom", f.zoom) / 100;
			return `object-position:${x}% ${y}%;transform:scale(${z.toFixed(3)});transform-origin:${x}% ${y}%`;
		};
		const coverPrev = (own, otherId, otherLabel) => v => {
			const mine = srcOf(v), other = mine ? "" : srcOf(val(otherId));
			if (mine) return `<img src="${this.esc(mine)}" alt="" decoding="async">`;
			if (other) return `<img src="${this.esc(other)}" alt="" decoding="async">${tag(otherLabel)}`;
			return `${fallback()}${tag("Automática")}`;
		};
		// fundo e destaque: a própria arte; senão a outra arte larga; senão a
		// capa desfocada e ampliada (como o topo faz); senão o palco vazio
		const widePrev = (otherId, otherLabel) => v => {
			const mine = srcOf(v), other = mine ? "" : srcOf(val(otherId));
			const cover = mine || other ? "" : srcOf(val("svl-ce-cover")) || srcOf(val("svl-ce-cover-ficha"));
			const shade = `<span class="svl-prev-shade"></span><span class="svl-prev-title">${this.esc(title)}</span>`;
			if (mine || other) return `<img src="${this.esc(mine || other)}" alt="" decoding="async" style="${framingStyle()}">${shade}${other ? tag(otherLabel) : ""}`;
			if (cover) return `<img class="is-coverart" src="${this.esc(cover)}" alt="" decoding="async">${shade}${tag("Capa desfocada")}`;
			return `<span class="svl-prev-stage" style="--sv-hue:${hue}"></span>${shade}${tag("Sem arte")}`;
		};
		const renderers = {
			"svl-ce-cover": coverPrev("svl-ce-cover", "svl-ce-cover-ficha", "Usa a capa da ficha"),
			"svl-ce-cover-ficha": coverPrev("svl-ce-cover-ficha", "svl-ce-cover", "Usa a capa do card"),
			"svl-ce-background": widePrev("svl-ce-featured", "Usa a imagem de destaque"),
			"svl-ce-featured": widePrev("svl-ce-background", "Usa o fundo da ficha")
		};
		const refreshPreviews = () => {
			for (const [id, fn] of Object.entries(renderers)) {
				const box = root.querySelector(`#${id}-preview`);
				if (box) box.innerHTML = fn(val(id));
			}
		};
		// proporções reais: topo da ficha medido na tela; card de destaque da
		// Home calculado como a Home faz (no celular, alto; com tela larga, largo)
		const shapePreviews = () => {
			// a arte fica na faixa .sv-hero-art: é a proporção dela que vale
			const art = document.querySelector(".sv-app .sv-hero:not(.sv-hero--home) .sv-hero-art") || document.querySelector(".svl-game-hero:not(.is-framing-preview)");
			const hr = art?.getBoundingClientRect();
			const bgRatio = hr && hr.height > 0 ? hr.width / hr.height : 2.4;
			// card de destaque da Home (não está na tela): mesma conta do CSS —
			// celular: faixa de clamp(200px, 58vw, 320px) + barra de status;
			// tela larga: o card inteiro, clamp(460px, 72vh, 720px) de altura
			const vw = document.querySelector(".sv-content")?.clientWidth || window.innerWidth, vh = window.innerHeight;
			const app = document.querySelector(".sv-app");
			const narrow = !!app?.classList.contains("sv-bp-sm");
			const safeTop = narrow && document.body.classList.contains("sv-immersive-top") ? (parseFloat(getComputedStyle(app).getPropertyValue("--sv-safe-top")) || 0) : 0;
			const featRatio = narrow ? vw / (Math.min(320, Math.max(200, window.innerWidth * 0.58)) + safeTop) : vw / Math.min(720, Math.max(460, vh * 0.72));
			for (const [id, ratio] of [["svl-ce-background", bgRatio], ["svl-ce-featured", featRatio]]) {
				const box = root.querySelector(`#${id}-preview`);
				if (!box) continue;
				box.style.aspectRatio = ratio.toFixed(4);
				box.closest(".svl-image-picker")?.classList.toggle("is-wide", ratio > 1.15);
			}
		};
		const opt = extra => ({ renderPreview: v => (renderers[extra.id] ? renderers[extra.id](v) : ""), ...extra, onSaved: v => { extra.onSaved?.(v); refreshPreviews(); } });
		this.wireImagePicker(root, "svl-ce-cover", opt({ id: "svl-ce-cover", folder: this.folders.coverAssets, baseName }));
		this.wireImagePicker(root, "svl-ce-cover-ficha", opt({ id: "svl-ce-cover-ficha", folder: this.folders.coverAssets, baseName: () => baseName() + "-ficha" }));
		// declarada aqui e preenchida mais abaixo: o seletor de fundo
		// precisa avisar a prévia quando a imagem muda, e a prévia precisa
		// do seletor já montado para ler o valor dele
		let syncPreviewImage = () => {};
		this.wireImagePicker(root, "svl-ce-background", opt({
			id: "svl-ce-background",
			folder: this.folders.backgroundAssets,
			baseName: () => baseName() + "-fundo",
			// escolher um arquivo do dispositivo (ou remover) altera o campo
			// por código, e atribuir .value NÃO dispara o evento "input" —
			// sem este aviso a prévia continuaria mostrando a arte anterior
			onSaved: () => syncPreviewImage()
		}));
		this.wireImagePicker(root, "svl-ce-featured", opt({ id: "svl-ce-featured", folder: this.folders.featuredAssets, baseName: () => baseName() + "-destaque" }));
		["svl-ce-cover", "svl-ce-cover-ficha", "svl-ce-background", "svl-ce-featured"].forEach(id => root.querySelector(`#${id}`)?.addEventListener("input", refreshPreviews));
		// enquadramento mexe também nas miniaturas de fundo e destaque
		root.addEventListener("input", e => {
			if (!e.target.matches?.("#svl-ce-bgx, #svl-ce-bgy, #svl-ce-bgzoom")) return;
			root.querySelectorAll("#svl-ce-background-preview img:not(.is-coverart), #svl-ce-featured-preview img:not(.is-coverart)").forEach(i => i.setAttribute("style", framingStyle()));
		});
		shapePreviews(); refreshPreviews();
		root.querySelector("#svl-ce-bgreset")?.addEventListener("click", () => setTimeout(() => root.querySelectorAll("#svl-ce-background-preview img:not(.is-coverart), #svl-ce-featured-preview img:not(.is-coverart)").forEach(i => i.setAttribute("style", framingStyle())), 0));

		// logo: opcional. "Mostrar o nome" (showLogo: false) mantém o
		// arquivo mas usa o título no topo; sem logo, o título também volta
		const modeBox = root.querySelector("#svl-ce-logomode");
		const logoHint = root.querySelector("#svl-ce-logohint");
		let logoMode = p.showLogo === false || p.showLogo === "false" ? "name" : "logo";
		const paintMode = () => {
			modeBox?.querySelectorAll("[data-v]").forEach(b => { const on = b.dataset.v === logoMode; b.classList.toggle("is-active", on); b.setAttribute("aria-checked", String(on)); });
			const has = !!logoInput?.value.trim();
			if (logoHint) logoHint.textContent = logoMode === "name" ? "O topo mostra o nome do jogo; a logo fica guardada para quando quiser usar." : has ? "O topo mostra a logo no lugar do nome." : "Sem logo escolhida: o topo mostra o nome do jogo.";
		};
		modeBox?.addEventListener("click", e => { const b = e.target.closest("[data-v]"); if (!b) return; logoMode = b.dataset.v; paintMode(); });
		this.wireImagePicker(root, "svl-ce-logo", { folder: "Assets/Logos", baseName: () => baseName() + "-logo", onSaved: v => { if (v) logoMode = "logo"; paintMode(); } });
		logoInput?.addEventListener("input", paintMode);
		// atalho: logo oficial da loja Steam (quando o jogo tem AppID)
		const appId = String(p.steamAppId || "").trim();
		const S = globalThis.customJS?.SteamVaultSteam;
		if (/^\d+$/.test(appId) && S?.fetchArt) {
			const actions = root.querySelector("#svl-ce-logo-pick")?.parentElement;
			const steamBtn = document.createElement("button");
			steamBtn.type = "button"; steamBtn.className = "svl-picker-btn"; steamBtn.id = "svl-ce-logo-steam";
			steamBtn.textContent = "Baixar da Steam";
			actions?.appendChild(steamBtn);
			steamBtn.addEventListener("click", async () => {
				steamBtn.disabled = true; steamBtn.textContent = "Baixando…";
				try {
					const f = app.vault.getAbstractFileByPath(p.file.path);
					const r = f ? await S.fetchArt(f, { force: true, only: ["logo"], save: false }) : null;
					if (r?.paths?.logo) { logoInput.value = r.paths.logo; logoInput.dispatchEvent(new Event("input", { bubbles: true })); logoMode = "logo"; paintMode(); steamBtn.textContent = "Baixada ✓"; }
					else steamBtn.textContent = "A Steam não tem logo";
				} catch (_) { steamBtn.textContent = "Não foi possível baixar"; }
				setTimeout(() => { steamBtn.disabled = false; steamBtn.textContent = "Baixar da Steam"; }, 2500);
			});
		}
		paintMode();

		/* --- enquadramento do fundo, com prévia ao vivo ---
		   A prévia é a própria ficha: os controles escrevem as variáveis
		   CSS na camada de fundo que já está na tela, então o usuário vê
		   o resultado real, no tamanho real, enquanto arrasta. Nada é
		   gravado no arquivo até ele clicar em Salvar. */
		const bgLayer = () => root.closest(".markdown-preview-view, .workspace-leaf-content, body")
			?.querySelector(".svl-game-hero:not(.is-framing-preview) .svl-game-hero-bg-image")
			|| document.querySelector(".svl-game-hero:not(.is-framing-preview) .svl-game-hero-bg-image");
		const previewLayer = () => root.querySelector("#svl-ce-bglayer");
		const previewBox = () => root.querySelector("#svl-ce-bgpreview .svl-game-hero");
		// o topo da ficha de verdade: o da interface atual (.sv-hero) e, por
		// compatibilidade, o da antiga (.svl-game-hero)
		const newHero = () => document.querySelector(".sv-app .sv-hero:not(.sv-hero--home)");
		const realHero = () => newHero()
			|| root.closest(".markdown-preview-view, .workspace-leaf-content, body")?.querySelector(".svl-game-hero:not(.is-framing-preview)")
			|| document.querySelector(".svl-game-hero:not(.is-framing-preview)");
		// o enquadramento é background-position em porcentagem, e essa
		// porcentagem só recorta o mesmo pedaço da imagem se a CAIXA tiver
		// a mesma proporção largura/altura — do contrário, os mesmos
		// números de X/Y/zoom cortam pedaços diferentes em cada uma (era
		// esse o descompasso entre a prévia e a ficha de verdade). Por
		// isso a prévia copia, ao vivo, a proporção real do herói — nunca
		// uma altura fixa — e continua acompanhando se a ficha mudar de
		// proporção (cover maior em telas largas, texto quebrando diferente
		// em cada resolução, painel lateral aberto/fechado etc.).
		// Na interface atual a arte ocupa só a faixa .sv-hero-art (no celular,
		// uma faixa larga no alto, com capa e título abaixo dela): a prévia
		// copia a proporção dessa faixa e coloca capa e título nas mesmas
		// posições relativas, em escala, com o mesmo escurecimento por cima.
		const syncPreviewRatio = () => {
			const box = previewBox();
			if (!box) return;
			const nh = newHero(), artEl = nh?.querySelector(".sv-hero-art");
			const a = (artEl || realHero())?.getBoundingClientRect();
			const ratio = (a && a.height > 0) ? a.width / a.height : 2.4;
			box.style.aspectRatio = ratio.toFixed(4);
			box.classList.remove("is-tall");
			if (!nh || !artEl || !a?.width) { box.classList.remove("is-measured"); return; }
			const bw = box.getBoundingClientRect().width || a.width;
			const k = bw / a.width;
			const put = (sel, pre) => {
				const r = nh.querySelector(sel)?.getBoundingClientRect();
				if (!r?.width) { box.style.setProperty(`--pv-${pre}d`, "none"); return null; }
				box.style.setProperty(`--pv-${pre}d`, "block");
				box.style.setProperty(`--pv-${pre}l`, `${((r.left - a.left) / a.width * 100).toFixed(2)}%`);
				box.style.setProperty(`--pv-${pre}t`, `${((r.top - a.top) / a.height * 100).toFixed(2)}%`);
				box.style.setProperty(`--pv-${pre}w`, `${(r.width / a.width * 100).toFixed(2)}%`);
				return r;
			};
			put(".sv-hero-cover", "c");
			const tr = put(".sv-hero-title, .sv-hero-logo", "t");
			const tEl = nh.querySelector(".sv-hero-title");
			if (tr && tEl) box.style.setProperty("--pv-tfs", `${(parseFloat(getComputedStyle(tEl).fontSize) * k).toFixed(2)}px`);
			const scrim = nh.querySelector(".sv-hero-scrim");
			const tint = box.querySelector(".svl-game-hero-bg-tint");
			if (scrim && tint) tint.style.background = getComputedStyle(scrim).backgroundImage;
			box.classList.add("is-measured");
		};
		syncPreviewRatio();
		const realHeroEl = realHero();
		if (realHeroEl && typeof ResizeObserver !== "undefined") {
			// acompanha o herói de verdade: cover que muda de tamanho por
			// causa da largura da tela, imagem que termina de carregar,
			// nota que é reaberta noutra largura — tudo isso re-mede sozinho
			new ResizeObserver(syncPreviewRatio).observe(realHeroEl);
		}
		// a escala da capa e do título depende da largura da prévia (a folha
		// do editor ainda está abrindo quando isto roda)
		if (previewBox() && typeof ResizeObserver !== "undefined") {
			let lastW = 0;
			new ResizeObserver(es => { const w = Math.round(es[0].contentRect.width); if (w && w !== lastW) { lastW = w; syncPreviewRatio(); } }).observe(previewBox());
		}
		const bgX = root.querySelector("#svl-ce-bgx");
		const bgY = root.querySelector("#svl-ce-bgy");
		const bgZoom = root.querySelector("#svl-ce-bgzoom");
		const bgReset = root.querySelector("#svl-ce-bgreset");
		const framingDefaults = this.bgFramingDefaults;
		// o que estava salvo quando o formulário abriu — é para cá que o
		// Cancelar volta, e não para os padrões
		const savedFraming = this.bgFraming(p);

		const applyFraming = () => {
			if (!bgX || !bgY || !bgZoom) return;
			const x = Number(bgX.value), y = Number(bgY.value), z = Number(bgZoom.value);
			const out = (el, txt) => { const o = root.querySelector(`#${el}-out`); if (o) o.textContent = txt; };
			const side = (v, a, mid, b) => v === 50 ? mid : (v < 50 ? a : b);
			out("svl-ce-bgx", `${x}% · ${side(x, "esquerda", "centro", "direita")}`);
			out("svl-ce-bgy", `${y}% · ${side(y, "cima", "centro", "baixo")}`);
			out("svl-ce-bgzoom", z === 100 ? "100% · padrão" : `${z}%`);
			// as duas camadas recebem os mesmos valores: a da prévia, que o
			// usuário está olhando, e a da ficha atrás do formulário
			for (const layer of [previewLayer(), bgLayer()]) {
				if (!layer) continue;
				layer.style.setProperty("--svl-bg-x", x + "%");
				layer.style.setProperty("--svl-bg-y", y + "%");
				layer.style.setProperty("--svl-bg-zoom", (z / 100).toFixed(3));
			}
			// a ficha atual (atrás do editor) também acompanha, ao vivo
			const nh = newHero();
			if (nh) {
				nh.style.setProperty("--sv-bg-x", x + "%");
				nh.style.setProperty("--sv-bg-y", y + "%");
				nh.style.setProperty("--sv-bg-zoom", (z / 100).toFixed(3));
			}
		};
		const setFraming = f => {
			if (bgX) bgX.value = f.x;
			if (bgY) bgY.value = f.y;
			if (bgZoom) bgZoom.value = f.zoom;
			applyFraming();
		};
		setFraming(savedFraming);
		// "input" e não "change": no mobile o change só dispara ao soltar
		// o dedo, e a prévia ao vivo é o ponto do controle
		[bgX, bgY, bgZoom].forEach(el => el?.addEventListener("input", applyFraming));
		bgReset?.addEventListener("click", () => setFraming(framingDefaults));

		/* O touch-action do CSS resolve a rolagem do navegador, mas não
		   impede que um gesto lateral seja reconhecido por quem escuta
		   toques mais acima (o app tem gestos próprios de navegação). Por
		   isso o toque também para de subir a partir da área de ajustes:
		   é a combinação das duas coisas que faz a tela parar de deslizar.
		   Só `touchmove` é interceptado — `touchstart`/`touchend` seguem
		   normalmente, para não atrapalhar toques comuns. */
		const framingBox = root.querySelector(".svl-framing");
		framingBox?.addEventListener("touchmove", e => e.stopPropagation(), { passive: true });

		/* --- arrastar dentro da prévia ---
		   Pointer Events cobrem mouse, toque e caneta com um código só, e
		   o setPointerCapture garante que o arraste continue mesmo se o
		   dedo sair da prévia no meio do movimento.
		   O eixo é invertido de propósito: `background-position: 0%` mostra
		   a BORDA ESQUERDA da imagem, então arrastar a arte para a direita
		   precisa DIMINUIR a porcentagem. Sem isso, a imagem fugiria do
		   dedo. A divisão pelo zoom mantém o passo proporcional: quanto
		   mais aproximado, menos a mesma distância de arraste desloca. */
		const preview = previewBox();
		if (preview && bgX && bgY) {
			let dragging = null, frame = null, pending = null;
			preview.addEventListener("pointerdown", e => {
				if (!previewLayer()?.style.backgroundImage) return;
				dragging = { px: e.clientX, py: e.clientY, x: Number(bgX.value), y: Number(bgY.value) };
				preview.setPointerCapture(e.pointerId);
				preview.classList.add("is-dragging");
				e.stopPropagation();
				e.preventDefault();
			});
			preview.addEventListener("pointermove", e => {
				if (!dragging) return;
				e.stopPropagation();
				const rect = preview.getBoundingClientRect();
				const z = Number(bgZoom?.value || 100) / 100;
				const clamp = n => Math.min(100, Math.max(0, n));
				const stepX = ((e.clientX - dragging.px) / Math.max(rect.width, 1)) * 100 / z;
				const stepY = ((e.clientY - dragging.py) / Math.max(rect.height, 1)) * 100 / z;
				pending = { x: clamp(dragging.x - stepX), y: clamp(dragging.y - stepY) };
				// um movimento rápido dispara vários pointermove entre dois
				// quadros; aplicar todos escreveria estilo várias vezes para
				// um único repinte. Guarda o último e aplica no quadro.
				if (frame === null) frame = requestAnimationFrame(() => {
					frame = null;
					if (!pending) return;
					bgX.value = pending.x;
					bgY.value = pending.y;
					applyFraming();
				});
			});
			const endDrag = e => {
				if (!dragging) return;
				dragging = null;
				// aplica o último valor pendente: se o dedo sair entre dois
				// quadros, sem isto o deslocamento final se perde e a imagem
				// "recua" um pouco ao soltar
				if (frame !== null) { cancelAnimationFrame(frame); frame = null; }
				if (pending) {
					bgX.value = pending.x;
					bgY.value = pending.y;
					pending = null;
					applyFraming();
				}
				preview.classList.remove("is-dragging");
				if (e?.pointerId != null && preview.hasPointerCapture?.(e.pointerId)) preview.releasePointerCapture(e.pointerId);
			};
			preview.addEventListener("pointerup", endDrag);
			preview.addEventListener("pointercancel", endDrag);
			// se o ponteiro se perder (janela redimensionada, aba trocada),
			// o arraste não pode ficar preso ligado
			preview.addEventListener("lostpointercapture", endDrag);
		}

		// trocar ou remover a imagem de fundo atualiza a prévia na hora —
		// senão ela continuaria mostrando a arte anterior até recarregar
		syncPreviewImage = () => {
			const layer = previewLayer();
			if (!layer) return;
			const val = bgInput?.value.trim();
			const src = val ? this.resolveImageSrc(val) : this.gameImage({ ...p, background: "" }, "background").src;
			layer.style.backgroundImage = src ? `url('${src}')` : "";
			layer.classList.toggle("is-fallback", !val && !!src);
			root.querySelector("#svl-ce-bgpreview")?.classList.toggle("is-empty", !src);
			// sem imagem não há o que enquadrar: deixar os controles ativos
			// convidaria a ajustar algo sem efeito visível nenhum
			[bgX, bgY, bgZoom, bgReset].forEach(el => { if (el) el.disabled = !src; });
			framingBox?.classList.toggle("is-disabled", !src);
			// o painel é aberto com um max-height calculado no clique; se o
			// conteúdo muda de altura depois disso (a dica de prévia vazia
			// aparecendo ou sumindo), o fim do formulário fica cortado
			if (form.classList.contains("is-open")) form.style.maxHeight = (form.scrollHeight + 40) + "px";
		};
		bgInput?.addEventListener("input", syncPreviewImage);
		syncPreviewImage();

		const openForm = () => {
			form.classList.add("is-open");
			toggleBtn.classList.add("is-open");
			form.style.maxHeight = (form.scrollHeight + 40) + "px";
		};
		const closeForm = () => {
			form.style.maxHeight = "0px";
			form.classList.remove("is-open");
			toggleBtn.classList.remove("is-open");
		};
		toggleBtn.addEventListener("click", () => form.classList.contains("is-open") ? closeForm() : openForm());
		// cancelar desfaz a prévia ao vivo: o fundo da ficha volta ao
		// enquadramento que estava gravado quando o formulário abriu
		cancelBtn?.addEventListener("click", () => { setFraming(savedFraming); closeForm(); });

		saveBtn?.addEventListener("click", async () => {
			saveBtn.disabled = true;
			msg.textContent = "Salvando…";
			msg.className = "svl-form-msg";
			try {
				const file = app.vault.getAbstractFileByPath(p.file.path);
				if (!file) throw new Error("arquivo não encontrado");
				const framing = {
					x: Number(bgX?.value ?? framingDefaults.x),
					y: Number(bgY?.value ?? framingDefaults.y),
					zoom: Number(bgZoom?.value ?? framingDefaults.zoom)
				};
				await app.fileManager.processFrontMatter(file, fm => {
					fm.cover = coverInput?.value.trim() || "";
					fm.coverFicha = coverFichaInput?.value.trim() || "";
					fm.background = bgInput?.value.trim() || "";
					fm.featured = featuredInput?.value.trim() || "";
					fm.logo = logoInput?.value.trim() || "";
					if (logoMode === "name") fm.showLogo = false; else delete fm.showLogo;
					// enquadramento: números, um campo por eixo. Ficam no
					// próprio jogo, então cada ficha tem o seu.
					fm.bgPosX = framing.x;
					fm.bgPosY = framing.y;
					fm.bgZoom = framing.zoom;
				});
				// o que foi gravado passa a ser o ponto de retorno do Cancelar
				savedFraming.x = framing.x; savedFraming.y = framing.y; savedFraming.zoom = framing.zoom;
				msg.textContent = "Salvo!";
				msg.className = "svl-form-msg is-success";
			} catch (err) {
				console.error("Game Library: falha ao salvar capa/fundo", err);
				msg.textContent = "Não foi possível salvar. Veja o console.";
				msg.className = "svl-form-msg is-error";
			} finally {
				saveBtn.disabled = false;
			}
		});
	}

	// ------------------------------------------------- seletor de imagem
	// campo reutilizado pelo formulário de jogo, editor de capa/fundo e
	// ícone de conquista — sempre com a opção de digitar uma URL OU
	// escolher um arquivo direto do armazenamento do dispositivo.
	imagePickerField({ id, label, placeholder = "URL ou escolha abaixo", value = "", hint = "" }) {
		return `<div class="svl-field">
			<label for="${id}">${this.esc(label)}</label>
			${hint ? `<small class="svl-field-hint">${this.esc(hint)}</small>` : ""}
			<div class="svl-image-picker">
				<div class="svl-image-preview" id="${id}-preview"><span class="svl-image-preview-empty">🖼️</span></div>
				<div class="svl-image-picker-controls">
					<input type="text" class="svl-input" id="${id}" value="${this.esc(value)}" placeholder="${this.esc(placeholder)}">
					<div class="svl-image-picker-actions">
						<button type="button" class="svl-picker-btn" id="${id}-pick">📁 Escolher do dispositivo</button>
						<button type="button" class="svl-picker-btn svl-picker-btn-clear" id="${id}-clear" title="Remover esta imagem">✕ Remover</button>
					</div>
					<input type="file" accept="image/*" class="svl-file-input-hidden" id="${id}-file">
				</div>
			</div>
		</div>`;
	}

	wireImagePicker(root, id, opts = {}) {
		const textInput = root.querySelector(`#${id}`);
		const pickBtn = root.querySelector(`#${id}-pick`);
		const fileInput = root.querySelector(`#${id}-file`);
		const preview = root.querySelector(`#${id}-preview`);
		if (!textInput || !pickBtn || !fileInput || !preview) return;

		const I = this;
		const clearBtn = root.querySelector(`#${id}-clear`);
		const pickLabel = () => (textInput.value.trim() ? "🔄 Substituir imagem" : "📁 Escolher do dispositivo");
		const renderPreview = opts.renderPreview || (val => val
			? `<img src="${I.esc(I.resolveImageSrc(val))}" alt="" loading="lazy" decoding="async">`
			: `<span class="svl-image-preview-empty">🖼️</span>`);
		const updatePreview = () => {
			const val = textInput.value.trim();
			preview.innerHTML = renderPreview(val);
			// os três estados do campo ficam visíveis sem precisar ler o
			// texto: prévia, rótulo do botão e disponibilidade do Remover
			pickBtn.textContent = pickLabel();
			if (clearBtn) clearBtn.disabled = !val;
			// conteúdo trocado depois da montagem: ícones de novo em SVG
			I._svgifyIcons(pickBtn.parentElement || pickBtn);
			I._svgifyIcons(preview);
		};
		textInput.addEventListener("input", updatePreview);
		updatePreview();

		clearBtn?.addEventListener("click", () => {
			// limpar o campo é o que faz a finalidade voltar ao fallback
			// automático — não apaga o arquivo de imagem do vault
			textInput.value = "";
			updatePreview();
			opts.onSaved?.("");
		});

		pickBtn.addEventListener("click", () => fileInput.click());
		fileInput.addEventListener("change", async () => {
			const file = fileInput.files?.[0];
			if (!file) return;
			// o rótulo do botão é recalculado por updatePreview() no fim
			pickBtn.disabled = true;
			pickBtn.textContent = "Enviando…";
			try {
				const folder = opts.folder || "Assets";
				const baseName = (opts.baseName && opts.baseName()) || file.name.replace(/\.[^.]+$/, "");
				const path = await I.saveDeviceImage(file, folder, baseName);
				textInput.value = path;
				updatePreview();
				opts.onSaved?.(path);
			} catch (err) {
				console.error("Game Library: falha ao salvar imagem do dispositivo", err);
			} finally {
				pickBtn.disabled = false;
				updatePreview(); // devolve ao botão o rótulo do estado atual
				fileInput.value = "";
			}
		});
	}

	// campo de áudio: link (YouTube/Spotify/etc.) OU um arquivo de áudio
	// escolhido do dispositivo — mesma lógica do seletor de imagem.
	audioPickerField({ id, label, placeholder = "Link (opcional) ou escolha um arquivo abaixo" }) {
		return `<div class="svl-field">
			<label for="${id}">${this.esc(label)}</label>
			<div class="svl-image-picker">
				<div class="svl-image-preview" id="${id}-preview"><span class="svl-image-preview-empty">🎵</span></div>
				<div class="svl-image-picker-controls">
					<input type="text" class="svl-input" id="${id}" placeholder="${this.esc(placeholder)}">
					<button type="button" class="svl-picker-btn" id="${id}-pick">📁 Escolher áudio do dispositivo</button>
					<input type="file" accept="audio/*" class="svl-file-input-hidden" id="${id}-file">
				</div>
			</div>
		</div>`;
	}

	wireAudioPicker(root, id, opts = {}) {
		const textInput = root.querySelector(`#${id}`);
		const pickBtn = root.querySelector(`#${id}-pick`);
		const fileInput = root.querySelector(`#${id}-file`);
		const preview = root.querySelector(`#${id}-preview`);
		if (!textInput || !pickBtn || !fileInput) return;

		pickBtn.addEventListener("click", () => fileInput.click());
		fileInput.addEventListener("change", async () => {
			const file = fileInput.files?.[0];
			if (!file) return;
			const originalLabel = pickBtn.textContent;
			pickBtn.disabled = true;
			pickBtn.textContent = "Enviando…";
			try {
				const folder = opts.folder || "Assets";
				const baseName = (opts.baseName && opts.baseName()) || file.name.replace(/\.[^.]+$/, "");
				const path = await this.saveDeviceAudio(file, folder, baseName);
				textInput.value = path;
				if (preview) preview.innerHTML = `<span class="svl-image-preview-empty">✅</span>`;
				opts.onSaved?.(path);
			} catch (err) {
				console.error("Game Library: falha ao salvar áudio do dispositivo", err);
			} finally {
				pickBtn.disabled = false;
				pickBtn.textContent = originalLabel;
				fileInput.value = "";
			}
		});
	}

	// ---------------------------------------------------------- conquistas (UI)
	achievementIconHtml(icon) {
		const val = String(icon ?? "").trim();
		if (!val) return `<span class="svl-ach-icon-fallback">🏆</span>`;
		const isLocalOrUrl = /^(https?:\/\/|data:|\.{0,2}\/)/i.test(val) || /\.(png|jpe?g|gif|webp|svg|bmp|heic|heif|avif|tiff?)$/i.test(val) || val.includes("/");
		if (isLocalOrUrl) {
			const src = this.resolveImageSrc(val);
			return `<img src="${this.esc(src)}" alt="" loading="lazy" decoding="async">`;
		}
		return `<span class="svl-ach-icon-fallback">${this.esc(val)}</span>`;
	}

	/* ======================================================================
	   SEÇÃO DE CONQUISTAS DA FICHA
	   Um único desenho para Steam, RetroAchievements (Base Set e Subsets)
	   e conquistas manuais — o que muda de uma fonte para outra são só os
	   dados exibidos (pontos, raridade, tipo, IDs), nunca o componente.
	   Estrutura:
	     resumo (x / y · %, barra, restantes, pontos, raras)
	     conjuntos (divisor discreto só quando há mais de um)
	       linhas (link para a nota + botão de detalhes)
	     controle de mostrar mais / menos (ícone)
	   Todo o comportamento é ligado por wireAchievementSections(), que o
	   mount() já chama — as fichas existentes não precisam ser editadas.
	   ====================================================================== */


	/* ======================================================================
	   ABA CONQUISTAS (Dashboard/Conquistas)
	   Mesma linguagem da seção de conquistas da ficha — o corpo de cada
	   jogo É a própria achievementSection(), só que sem o resumo interno
	   (o cabeçalho do jogo já mostra o progresso). A página fica compacta:
	     resumo geral · destaques (recentes e raras) · busca + filtro
	     jogos em cartões recolhíveis, agrupados por fonte (Steam / Retro)
	   O corpo de cada jogo só é montado quando é aberto (ou quando a busca
	   encontra algo nele): uma biblioteca com milhares de conquistas não
	   desenha milhares de linhas escondidas ao abrir a aba.
	   ====================================================================== */

	// Botão compacto para reparar somente dados ausentes/incompletos das
	// conquistas já cadastradas, usando automaticamente a fonte do jogo.
	achievementRefreshForm() {
		return `<div class="svl-achievement-refresh-wrap">
			<button type="button" class="svl-add-btn svl-add-btn-sm svl-refresh-ach-btn is-secondary" id="svl-ach-refresh" title="Preencher descrições, ícones e outros dados ausentes">
				<span class="svl-add-btn-icon svl-refresh-ach-icon" aria-hidden="true">↻</span>
				<span>Atualizar dados</span>
			</button>
			<span class="svl-achievement-refresh-msg" id="svl-ach-refresh-msg" aria-live="polite"></span>
		</div>`;
	}

	async refreshIncompleteAchievements(gamePage, source = "") {
		// completar dados vem da ORIGEM (Steam/RA), qualquer que seja a sincronização
		const pv = this._pv(gamePage);
		const resolvedSource = String(source || ({ steam: "Steam", retroachievements: "Retro" })[pv] || customJS.SteamVaultCore.providerLabel(pv)).trim();
		const gameTitle = gamePage?.title || gamePage?.file?.name || gamePage?.basename || "Jogo";
		const folder = `${this.folders.achievements}/${this.safeName(gameTitle, "Jogo")}`;
		const files = app.vault.getMarkdownFiles().filter(f => f.path.startsWith(`${folder}/`));
		const achievementFiles = files.filter(f => {
			const fm = app.metadataCache.getFileCache(f)?.frontmatter;
			return fm?.type === "achievement";
		});
		const empty = { source: resolvedSource, checked: 0, updated: 0, missing: 0, iconsFixed: 0, iconsFailed: 0 };
		if (!achievementFiles.length) return empty;
		const blank = v => v === undefined || v === null || String(v).trim() === "";

		if (resolvedSource === "Steam") {
			const appid = String(gamePage?.steamAppId || "").trim();
			if (!appid) throw new Error("Este jogo não possui Steam App ID cadastrado.");

			// índice por nome e por descrição (só descrições únicas)
			const indexOf = list => {
				const byName = new Map(), byDesc = new Map(), dup = new Set();
				list.forEach((a, i) => {
					a._order = i + 1;
					byName.set(this._normalizeAchievementName(a.name), a);
					const d = this._normalizeAchievementName(a.description);
					if (!d) return;
					if (byDesc.has(d)) dup.add(d); else byDesc.set(d, a);
				});
				dup.forEach(d => byDesc.delete(d));
				return fm => byName.get(this._normalizeAchievementName(fm.name))
					|| byDesc.get(this._normalizeAchievementName(fm.description))
					|| null;
			};

			const primary = await this.fetchSteamAchievements(appid, { gameTitle });
			const matchers = [indexOf(primary.achievements)];
			const entries = achievementFiles.map(file => {
				const fm = app.metadataCache.getFileCache(file)?.frontmatter || {};
				return { file, fm: { ...fm, name: fm.name || file.basename } };
			});
			// conquistas que não bateram (nome salvo em outro idioma) →
			// consulta a lista no outro idioma uma única vez
			if (entries.some(e => !matchers[0](e.fm))) {
				const other = primary.language === "english" ? "brazilian" : "english";
				try {
					const alt = await this.fetchSteamAchievements(appid, { gameTitle, languages: [other] });
					matchers.push(indexOf(alt.achievements));
				} catch (_) { /* opcional */ }
			}

			let updated = 0, missing = 0, iconsFixed = 0, iconsFailed = 0;
			for (const { file, fm: fmNow } of entries) {
				let remote = null;
				for (const m of matchers) { remote = m(fmNow); if (remote) break; }
				const iconUrl = String(remote?.iconUrl || fmNow.steamIconUrl || "").trim();
				if (!remote && !iconUrl) { missing += 1; continue; }
				if (!remote) missing += 1;

				const needDescription = remote && blank(fmNow.description) && String(remote.description || "").trim();
				const needPercent = remote && blank(fmNow.steamGlobalPercent) && remote.percentage != null;
				const needOrder = remote && this._achNum(fmNow.steamOrder) === null;
				const needIcon = !!iconUrl && this._achievementIconNeedsRepair(fmNow.icon);
				const needMeta = !!iconUrl && String(fmNow.steamIconUrl || "") !== iconUrl;
				if (!needDescription && !needPercent && !needOrder && !needIcon && !needMeta) continue;

				let newIcon = "";
				if (needIcon) {
					newIcon = await this._downloadSteamAchievementIcon(iconUrl, gameTitle, remote?.name || fmNow.name, file.basename, { strict: true });
					if (newIcon) iconsFixed += 1; else iconsFailed += 1;
				}
				await app.fileManager.processFrontMatter(file, fm => {
					if (needDescription) fm.description = remote.description;
					if (newIcon) fm.icon = newIcon;
					// download falhou e não há nada para mostrar: usa a URL
					// remota por enquanto — o próximo "Atualizar" tenta de novo
					else if (needIcon && blank(fm.icon)) fm.icon = iconUrl;
					if (needPercent) fm.steamGlobalPercent = remote.percentage;
					if (needOrder) fm.steamOrder = remote._order;
					if (iconUrl) fm.steamIconUrl = iconUrl;
					fm.steamAppId = appid;
				});
				if (needDescription || needPercent || needOrder || newIcon) updated += 1;
			}
			return { source: "Steam Web", checked: achievementFiles.length, updated, missing, iconsFixed, iconsFailed };
		}

		if (resolvedSource === "Retro") {
			const pageBaseId = this._achNum(gamePage?.raGameId);
			// cada conquista guarda o Game ID do CONJUNTO de onde veio (Base
			// Set ou Subset). Agrupa por ele e consulta cada conjunto uma
			// vez — antes só o Game ID do jogo era consultado, e as
			// conquistas de Subsets ficavam sempre como "não encontradas".
			const bySet = new Map();
			for (const file of achievementFiles) {
				const fmNow = app.metadataCache.getFileCache(file)?.frontmatter || {};
				const setId = this._achNum(fmNow.raSetId ?? fmNow.raGameId) ?? pageBaseId;
				if (setId === null) continue;
				if (!bySet.has(setId)) bySet.set(setId, []);
				bySet.get(setId).push(file);
			}
			if (!bySet.size) throw new Error("Este jogo não possui Game ID do RetroAchievements cadastrado.");

			let updated = 0, missing = 0, iconsFixed = 0, iconsFailed = 0;
			// sem resposta do RA para a conquista: ainda dá para recuperar o
			// ícone pela raIconUrl já salva na nota
			const repairFromSaved = async (file, fmNow) => {
				const saved = String(fmNow.raIconUrl || "").trim();
				if (!saved || !this._achievementIconNeedsRepair(fmNow.icon)) return;
				const base = fmNow.raId ? `${this.safeName(fmNow.name || file.basename, "conquista")}-${fmNow.raId}` : file.basename;
				const icon = await this._raDownloadImage(saved, gameTitle, base, { strict: true });
				if (!icon) { iconsFailed += 1; return; }
				await app.fileManager.processFrontMatter(file, fm => { fm.icon = icon; });
				iconsFixed += 1;
			};
			const linked = [];
			for (const [setId, files] of [...bySet.entries()].sort((a, b) => a[0] - b[0])) {
				let game;
				try {
					game = await this.raFetchGameExtended(setId);
				} catch (err) {
					console.warn(`Game Library: não foi possível consultar o conjunto ${setId} do RetroAchievements.`, err);
					missing += files.length;
					for (const file of files) await repairFromSaved(file, app.metadataCache.getFileCache(file)?.frontmatter || {});
					continue;
				}
				const setKind = this._raSubsetName(game.title) ? "subset" : "base";
				linked.push({ id: Number(game.id), kind: setKind });
				const byId = new Map(game.achievements.map(a => [Number(a.id), a]));
				const byName = new Map(game.achievements.map(a => [this._normalizeAchievementName(a.name), a]));
				for (const file of files) {
					const fmNow = app.metadataCache.getFileCache(file)?.frontmatter || {};
					const remote = (fmNow.raId && byId.get(Number(fmNow.raId))) || byName.get(this._normalizeAchievementName(fmNow.name || file.basename));
					if (!remote) { missing += 1; await repairFromSaved(file, fmNow); continue; }
					const needDescription = blank(fmNow.description) && String(remote.description || "").trim();
					const needIcon = String(remote.iconUrl || "").trim() && this._achievementIconNeedsRepair(fmNow.icon);
					const needPoints = blank(fmNow.points) && Number(remote.points) >= 0;
					// identificação do conjunto e ordem oficial: metadados da
					// plataforma, nunca campos do usuário
					const needSet = String(fmNow.raSetKind ?? "").trim() !== setKind
						|| String(fmNow.raSetTitle ?? "").trim() !== game.title
						|| this._achNum(fmNow.raDisplayOrder) === null
						|| this._achNum(fmNow.raId) === null;
					if (!needDescription && !needIcon && !needPoints && !needSet) continue;
					let newIcon = "";
					if (needIcon) {
						newIcon = await this._raDownloadImage(remote.iconUrl, gameTitle, `${this.safeName(remote.name, "conquista")}-${remote.id}`, { strict: true });
						if (newIcon) iconsFixed += 1; else iconsFailed += 1;
					}
					await app.fileManager.processFrontMatter(file, fm => {
						if (needDescription) fm.description = remote.description;
						if (newIcon) fm.icon = newIcon;
						else if (needIcon && blank(fm.icon)) fm.icon = remote.iconUrl;
						if (needPoints) fm.points = Number(remote.points);
						fm.raId = Number(remote.id);
						fm.raGameId = Number(game.id);
						fm.raBadge = remote.badgeName;
						fm.raIconUrl = remote.iconUrl;
						fm.raPercent = remote.percent;
						fm.raSet = remote.setType;
						fm.raSetTitle = game.title;
						fm.raSetKind = setKind;
						fm.raDisplayOrder = remote.displayOrder;
					});
					updated += 1;
				}
			}

			// corrige o vínculo do jogo: o Base Set volta a ser o raGameId
			// (importações antigas de Subset podiam ter trocado esse campo)
			// e os Subsets ficam listados em raSubsetIds
			if (linked.length) {
				try {
					const gameFile = app.vault.getAbstractFileByPath(gamePage?.file?.path || "");
					if (gameFile) await app.fileManager.processFrontMatter(gameFile, fm => {
						for (const s of linked.filter(x => x.kind === "subset")) this._raLinkSetToGame(fm, s.id, "subset");
						const base = linked.find(x => x.kind === "base");
						if (base) this._raLinkSetToGame(fm, base.id, "base");
					});
				} catch (_) { /* não crítico */ }
			}
			return { source: "RetroAchievements", checked: achievementFiles.length, updated, missing, iconsFixed, iconsFailed };
		}

		throw new Error("Não foi possível identificar a fonte de conquistas deste jogo. Só origens Steam e RetroAchievements têm de onde buscar dados.");
	}

	wireAchievementRefresh(root, gamePage) {
		const btn = root.querySelector("#svl-ach-refresh");
		const msg = root.querySelector("#svl-ach-refresh-msg");
		if (!btn) return;
		btn.addEventListener("click", async () => {
			btn.disabled = true;
			btn.classList.add("is-loading");
			const card = btn.closest(".svl-activity-card, .svl-activity-section, .svl-info-card") || root;
			const list = card.querySelector(".svl-ach");
			list?.classList.add("is-refreshing");
			list?.setAttribute("aria-busy", "true");
			if (msg) { msg.textContent = "Atualizando…"; msg.className = "svl-achievement-refresh-msg"; }
			try {
				const result = await this.refreshIncompleteAchievements(gamePage);
				const parts = [];
				if (result.updated) parts.push(`${customJS.SteamVaultUI.plural(result.updated, "conquista atualizada", "conquistas atualizadas")}`);
				if (result.iconsFixed) parts.push(`${customJS.SteamVaultUI.plural(result.iconsFixed, "ícone recuperado", "ícones recuperados")}`);
				if (result.iconsFailed) parts.push(`${customJS.SteamVaultUI.plural(result.iconsFailed, "ícone não baixado", "ícones não baixados")} — tente de novo`);
				if (result.missing) parts.push(`${customJS.SteamVaultUI.plural(result.missing, "não encontrada", "não encontradas")} na fonte`);
				const text = parts.length ? parts.join(" · ") : "Tudo em dia";
				const tone = result.iconsFailed ? "is-error" : "is-success";
				if (msg) { msg.textContent = `${text} · ${({ Steam: "Steam", Retro: "RetroAchievements" })[result.source] || result.source}`; msg.className = `svl-achievement-refresh-msg ${tone}`; }
				if (typeof app?.workspace?.requestSaveLayout === "function") app.workspace.requestSaveLayout();
				setTimeout(() => { try { (app.workspace.getMostRecentLeaf?.() || app.workspace.activeLeaf)?.rebuildView?.(); } catch (_) {} }, 250);
			} catch (err) {
				console.error("Game Library: falha ao atualizar conquistas incompletas.", err);
				if (msg) { msg.textContent = err?.message || "Não foi possível atualizar as conquistas."; msg.className = "svl-achievement-refresh-msg is-error"; }
			} finally {
				btn.disabled = false;
				btn.classList.remove("is-loading");
				list?.classList.remove("is-refreshing");
				list?.removeAttribute("aria-busy");
			}
		});
	}

	// --------------------------------------------- formulário: nova conquista
	// Cada origem só recebe as ações compatíveis: um jogo Steam nunca tem
	// conquistas no RetroAchievements (e vice-versa), então o formulário de
	// importação do RA nem é gerado quando a origem não é RetroAchievements.
	// "Atualizar dados" só existe onde há de onde buscar (Steam/RA).
	addAchievementForm(gamePage) {
		const pv = this._pv(gamePage);
		const refresh = pv === "steam" || pv === "retroachievements" ? this.achievementRefreshForm() : "";
		let html = `<div class="svl-action-group">${refresh}${this._addAchievementFormManual()}</div>`;
		if (pv === "retroachievements") html += this.raImportForm();
		return html;
	}

	_addAchievementFormManual() {
		return `<div class="svl-add-wrap svl-add-wrap-sm">
			<button type="button" class="svl-add-btn svl-add-btn-sm" id="svl-aa-toggle">
				<span class="svl-add-btn-icon">+</span> Adicionar conquista
			</button>
			<div class="svl-form" id="svl-aa-form">
				<div class="svl-form-inner">
					<div class="svl-field">
						<label for="svl-aa-name">Nome *</label>
						<input type="text" class="svl-input" id="svl-aa-name" placeholder="Ex: Primeira vitória">
					</div>
					<div class="svl-field">
						<label for="svl-aa-desc">Descrição curta</label>
						<input type="text" class="svl-input" id="svl-aa-desc" placeholder="Ex: Vença sua primeira partida">
					</div>
					<div class="svl-field">
						<label for="svl-aa-points">Pontos (RetroAchievements) (opcional)</label>
						<input type="number" class="svl-input" id="svl-aa-points" min="0" placeholder="Ex: 10">
					</div>
					${this.imagePickerField({ id: "svl-aa-icon", label: "Ícone", placeholder: "Um emoji ou escolha uma imagem" })}
					<label class="svl-toggle-row">
						<input type="checkbox" id="svl-aa-unlocked">
						<span>Já destravada</span>
					</label>
					<div class="svl-form-grid">
						<div class="svl-field"><label for="svl-aa-unlocked-date">Data do desbloqueio</label><input type="date" class="svl-input" id="svl-aa-unlocked-date"></div>
						<div class="svl-field"><label for="svl-aa-unlocked-time">Hora do desbloqueio</label><input type="time" class="svl-input" id="svl-aa-unlocked-time"></div>
					</div>
					<div class="svl-form-actions">
						<button type="button" class="svl-btn-ghost" id="svl-aa-cancel">Cancelar</button>
						<button type="button" class="svl-btn-primary" id="svl-aa-submit">Criar conquista</button>
					</div>
					<div class="svl-form-msg" id="svl-aa-msg"></div>
				</div>
			</div>
		</div>`;
	}

	// cria a nota da conquista dentro de Achievements/<jogo>/, ligada ao
	// jogo pelo campo `game`. Sem API nem ID — tudo cadastrado à mão.
	wireAddAchievementForm(root, gamePage) {
		this.wireAchievementRefresh(root, gamePage);
		this.wireRaImportForm(root, gamePage);
		const toggleBtn = root.querySelector("#svl-aa-toggle");
		const form = root.querySelector("#svl-aa-form");
		const cancelBtn = root.querySelector("#svl-aa-cancel");
		const submitBtn = root.querySelector("#svl-aa-submit");
		const msg = root.querySelector("#svl-aa-msg");
		if (!toggleBtn || !form) return;

		this.wireImagePicker(root, "svl-aa-icon", {
			folder: this.folders.achievementAssets,
			baseName: () => `${gamePage.title || gamePage.file.name}-${root.querySelector("#svl-aa-name")?.value || "conquista"}`,
			renderPreview: val => val ? this.achievementIconHtml(val) : `<span class="svl-image-preview-empty">🏆</span>`
		});

		const openForm = () => {
			form.classList.add("is-open");
			toggleBtn.classList.add("is-open");
			form.style.maxHeight = (form.scrollHeight + 40) + "px";
		};
		const closeForm = () => {
			form.style.maxHeight = "0px";
			form.classList.remove("is-open");
			toggleBtn.classList.remove("is-open");
		};
		toggleBtn.addEventListener("click", () => form.classList.contains("is-open") ? closeForm() : openForm());
		cancelBtn?.addEventListener("click", closeForm);

		submitBtn?.addEventListener("click", async () => {
			const name = root.querySelector("#svl-aa-name")?.value.trim();
			if (!name) {
				msg.textContent = "Dê um nome à conquista antes de continuar.";
				msg.className = "svl-form-msg is-error";
				return;
			}
			submitBtn.disabled = true;
			msg.textContent = "Criando…";
			msg.className = "svl-form-msg";

			const description = root.querySelector("#svl-aa-desc")?.value.trim() || "";
			const points = Number(root.querySelector("#svl-aa-points")?.value) || 0;
			const icon = root.querySelector("#svl-aa-icon")?.value.trim() || "🏆";
			const unlocked = !!root.querySelector("#svl-aa-unlocked")?.checked;
			const unlockedDate = root.querySelector("#svl-aa-unlocked-date")?.value || "";
			const unlockedTime = root.querySelector("#svl-aa-unlocked-time")?.value || "";

			try {
				const yesc = s => this.yamlEscape(s);
				const gameFolderName = this.safeName(gamePage.title || gamePage.file.name, "Jogo");
				const folder = `${this.folders.achievements}/${gameFolderName}`;
				await this.ensureFolder(folder);
				const safeAch = this.safeName(name, "Conquista");
				let path = `${folder}/${safeAch}.md`;
				let n = 1;
				while (app.vault.getAbstractFileByPath(path)) {
					n += 1;
					path = `${folder}/${safeAch} ${n}.md`;
				}
				const today = customJS.SteamVaultCore.today();
				const content = [
					"---",
					"type: achievement",
					`name: "${yesc(name)}"`,
					`description: "${yesc(description)}"`,
					`icon: "${yesc(icon)}"`,
					`points: ${points}`,
					`unlocked: ${unlocked}`,
					`unlockedDate: "${yesc(unlockedDate)}"`,
					`unlockedTime: "${yesc(unlockedTime)}"`,
					`game: "[[${gamePage.file.name}]]"`,
					`gamePath: "${yesc(gamePage.file.path)}"`,
					`dateAdded: ${today}`,
					"cssclasses: [steamvault, sv-achievement]",
					"---",
					"",
					...customJS.SteamVaultCore.noteBody("achievement").split("\n")
				].join("\n");

				await app.vault.create(path, content);
				msg.textContent = `"${name}" criada!`;
				msg.className = "svl-form-msg is-success";
				form.querySelectorAll("input").forEach(el => { el.type === "checkbox" ? (el.checked = false) : (el.value = ""); });
				root.querySelector(`#svl-aa-icon-preview`).innerHTML = `<span class="svl-image-preview-empty">🏆</span>`;
			} catch (err) {
				console.error("Game Library: falha ao criar conquista", err);
				msg.textContent = "Não foi possível criar a conquista. Veja o console.";
				msg.className = "svl-form-msg is-error";
			} finally {
				submitBtn.disabled = false;
			}
		});
	}

	achievementUnlockEditPanel(a) {
		const date = this.esc(String(a.unlockedDate || ""));
		const time = this.esc(String(a.unlockedTime || ""));
		const checked = a.unlocked ? " checked" : "";
		return `<div class="svl-cover-edit-wrap">
			<button type="button" class="svl-edit-cover-btn" id="svl-au-toggle"><span class="svl-edit-btn-icon">🗓️</span><span class="svl-edit-btn-text"><strong>Data do desbloqueio</strong><small>Informe manualmente quando conquistou</small></span><span class="svl-edit-btn-chevron">›</span></button>
			<div class="svl-form" id="svl-au-form"><div class="svl-form-inner">
				<label class="svl-toggle-row"><input type="checkbox" id="svl-au-unlocked"${checked}><span>Conquista destravada</span></label>
				<div class="svl-form-grid"><div class="svl-field"><label for="svl-au-date">Data</label><input type="date" class="svl-input" id="svl-au-date" value="${date}"></div><div class="svl-field"><label for="svl-au-time">Hora</label><input type="time" class="svl-input" id="svl-au-time" value="${time}"></div></div>
				<div class="svl-form-actions"><button type="button" class="svl-btn-primary" id="svl-au-save">Salvar data</button></div><div class="svl-form-msg" id="svl-au-msg"></div>
			</div></div></div>`;
	}

	wireAchievementUnlockEditor(root, cur) {
		const toggle = root.querySelector("#svl-au-toggle"), form = root.querySelector("#svl-au-form"), save = root.querySelector("#svl-au-save"), msg = root.querySelector("#svl-au-msg");
		if (!toggle || !form || !save) return;
		const open = () => { form.classList.add("is-open"); toggle.classList.add("is-open"); form.style.maxHeight = (form.scrollHeight + 40) + "px"; };
		const close = () => { form.style.maxHeight = "0px"; form.classList.remove("is-open"); toggle.classList.remove("is-open"); };
		toggle.addEventListener("click", () => form.classList.contains("is-open") ? close() : open());
		save.addEventListener("click", async () => {
			const unlocked = !!root.querySelector("#svl-au-unlocked")?.checked;
			const date = root.querySelector("#svl-au-date")?.value || "";
			const time = root.querySelector("#svl-au-time")?.value || "";
			if (unlocked && !date) { msg.textContent = "Informe a data do desbloqueio."; msg.className = "svl-form-msg is-error"; return; }
			save.disabled = true;
			try {
				const file = app.vault.getAbstractFileByPath(cur.file.path);
				if (!file) throw new Error("Nota da conquista não encontrada.");
				await app.fileManager.processFrontMatter(file, fm => { fm.unlocked = unlocked; fm.unlockedDate = date; fm.unlockedTime = time; });
				msg.textContent = "Data e hora salvas."; msg.className = "svl-form-msg is-success";
				new Notice(customJS.SteamVaultI18n?.t("Conquista atualizada.") ?? "Conquista atualizada.");
			} catch (err) { console.error("Game Library: falha ao salvar data da conquista", err); msg.textContent = "Não foi possível salvar. Veja o console."; msg.className = "svl-form-msg is-error"; }
			save.disabled = false;
		});
	}

	// botão "Editar ícone" na própria ficha da conquista — mesmo padrão
	// visual dos outros botões de editar (ícone em caixinha, chevron que
	// gira ao abrir), reaproveitando o seletor de imagem já usado em
	// capas/fundo/screenshots/soundtrack.
	achievementIconEditPanel(a) {
		return `<div class="svl-cover-edit-wrap">
			<button type="button" class="svl-edit-cover-btn" id="svl-ai-toggle">
				<span class="svl-edit-btn-icon">🖼️</span>
				<span class="svl-edit-btn-text"><strong>Editar ícone</strong><small>Emoji ou uma imagem do seu dispositivo</small></span>
				<span class="svl-edit-btn-chevron">›</span>
			</button>
			<div class="svl-form" id="svl-ai-form">
				<div class="svl-form-inner">
					${this.imagePickerField({ id: "svl-ai-icon", label: "Ícone", placeholder: "Um emoji ou escolha uma imagem abaixo", value: a.icon || "" })}
					<div class="svl-form-actions">
						<button type="button" class="svl-btn-ghost" id="svl-ai-cancel">Cancelar</button>
						<button type="button" class="svl-btn-primary" id="svl-ai-save">Salvar ícone</button>
					</div>
					<div class="svl-form-msg" id="svl-ai-msg"></div>
				</div>
			</div>
		</div>`;
	}

	wireAchievementIconEditor(root, a) {
		const toggleBtn = root.querySelector("#svl-ai-toggle");
		const form = root.querySelector("#svl-ai-form");
		const cancelBtn = root.querySelector("#svl-ai-cancel");
		const saveBtn = root.querySelector("#svl-ai-save");
		const msg = root.querySelector("#svl-ai-msg");
		if (!toggleBtn || !form) return;

		this.wireImagePicker(root, "svl-ai-icon", {
			folder: this.folders.achievementAssets,
			baseName: () => this.safeName(a.name || a.file.name)
		});

		const openForm = () => { form.classList.add("is-open"); toggleBtn.classList.add("is-open"); form.style.maxHeight = (form.scrollHeight + 40) + "px"; };
		const closeForm = () => { form.style.maxHeight = "0px"; form.classList.remove("is-open"); toggleBtn.classList.remove("is-open"); };
		toggleBtn.addEventListener("click", () => form.classList.contains("is-open") ? closeForm() : openForm());
		cancelBtn?.addEventListener("click", closeForm);

		saveBtn?.addEventListener("click", async () => {
			saveBtn.disabled = true;
			msg.textContent = "Salvando…";
			msg.className = "svl-form-msg";
			try {
				const file = app.vault.getAbstractFileByPath(a.file.path);
				if (!file) throw new Error("arquivo não encontrado");
				const val = root.querySelector("#svl-ai-icon")?.value.trim() || "🏆";
				await app.fileManager.processFrontMatter(file, fm => { fm.icon = val; });
				msg.textContent = "Salvo!";
				msg.className = "svl-form-msg is-success";
			} catch (err) {
				console.error("Game Library: falha ao salvar ícone da conquista", err);
				msg.textContent = "Não foi possível salvar. Veja o console.";
				msg.className = "svl-form-msg is-error";
			} finally {
				saveBtn.disabled = false;
			}
		});
	}

	// ------------------------------------------------ importação automática: Steam Web
	// Descobre o AppID pela busca pública da Steam e importa as conquistas
	// diretamente da página de estatísticas, sem Steam Web API e sem exigir
	// que o usuário informe qualquer ID.
	_normalizeSteamName(value) {
		return String(value ?? "")
			.toLowerCase()
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.replace(/[™®©]/g, "")
			.replace(/[^a-z0-9]+/g, " ")
			.trim()
			.replace(/\s+/g, " ");
	}

	async _steamRequest(url, options = {}) {
		// CustomJS documenta a instância `customJS.obsidian` como ponte para os módulos
		// internos do Obsidian. Em especial, requestUrl funciona no desktop e no mobile
		// sem depender de CORS. Mantemos fallbacks apenas para instalações que exponham
		// a função globalmente.
		const candidates = [
			globalThis?.customJS?.obsidian?.requestUrl,
			globalThis?.requestUrl,
			globalThis?.app?.requestUrl
		];
		for (const fn of candidates) {
			if (typeof fn === "function") {
				try { return await fn.call(globalThis.customJS?.obsidian || globalThis, { url, ...options }); }
			catch (err) { /* tenta a próxima ponte */ }
			}
		}
		throw new Error("Não consegui acessar a função de rede do Obsidian (requestUrl). Verifique se o plugin CustomJS está carregado.");
	}

	async _steamFetchText(url, headers = {}) {
		const response = await this._steamRequest(url, {
			method: "GET",
			headers: {
				"User-Agent": "Mozilla/5.0 (Obsidian Game Library)",
				"Accept": "text/html,application/json;q=0.9,*/*;q=0.8",
				"Accept-Language": "pt-BR,pt;q=0.9,en;q=0.7",
				...headers
			}
		});
		if (response?.status && response.status >= 400) throw new Error(`Steam respondeu HTTP ${response.status}.`);
		return String(response?.text ?? "");
	}

	_htmlDecode(value) {
		return String(value ?? "")
			.replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
			.replace(/&#x27;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
			.replace(/&nbsp;/gi, " ");
	}

	_extractAttr(tag, attr) {
		const re = new RegExp(`\\b${attr}\\s*=\\s*["']([^"']*)["']`, "i");
		return tag.match(re)?.[1] || "";
	}

	async _steamSearchCandidates(term) {
		const q = String(term ?? "").trim();
		if (!q) return [];
		const encoded = encodeURIComponent(q);
		const urls = [
			`https://store.steampowered.com/search/suggest?cc=US&l=english&realm=1&origin=https%3A%2F%2Fstore.steampowered.com&f=jsonfull&term=${encoded}&require_type=game,software`,
			`https://store.steampowered.com/search/?category1=998&ignore_preferences=1&term=${encoded}`
		];

		const candidates = [];
		const seen = new Set();
		for (const url of urls) {
			try {
				const html = await this._steamFetchText(url);
				if (!html) continue;
				let parsed = null;
				try { parsed = JSON.parse(html); } catch (_) {}

				// Endpoint /search/suggest?f=jsonfull retorna uma lista direta de objetos.
				if (Array.isArray(parsed)) {
					for (const item of parsed) {
						const type = String(item?.type || "game").toLowerCase();
						const appid = String(item?.id ?? item?.appid ?? "").trim();
						const name = String(item?.name ?? "").trim();
						if (!appid || !/^\d+$/.test(appid) || !name || (type !== "game" && type !== "software")) continue;
						if (seen.has(appid)) continue;
						seen.add(appid);
						candidates.push({ appid, name, href: `https://store.steampowered.com/app/${appid}/`, released: "", releaseYear: "", sourceTerm: q });
					}
					if (candidates.length) return candidates;
				}

				// Fallback HTML: não depende de ordem de atributos nem de DOMParser.
				const rowTagRe = /<a\b[^>]*class=["'][^"']*\bsearch_result_row\b[^"']*["'][^>]*>[\s\S]*?<\/a>/gi;
				let match;
				while ((match = rowTagRe.exec(html))) {
					const tag = match[0];
					const dataId = this._extractAttr(tag, "data-ds-appid").split(",")[0].trim();
					const href = this._htmlDecode(this._extractAttr(tag, "href"));
					const idFromHref = href.match(/\/app\/(\d+)/i)?.[1] || "";
					const appid = /^\d+$/.test(dataId) ? dataId : idFromHref;
					if (!appid || seen.has(appid)) continue;
					const titleRaw = tag.match(/<span\b[^>]*class=["'][^"']*\btitle\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1] || "";
					const releasedRaw = tag.match(/<div\b[^>]*class=["'][^"']*\bsearch_released\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] || "";
					const name = this._htmlDecode(titleRaw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
					const released = this._htmlDecode(releasedRaw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
					if (!name) continue;
					seen.add(appid);
					candidates.push({ appid, name, href, released, releaseYear: released.match(/\b(?:19|20)\d{2}\b/)?.[0] || "", sourceTerm: q });
				}
				if (candidates.length) return candidates;
			} catch (_) {
				// tenta a próxima URL/formato
			}
		}
		return candidates;
	}

	async _steamAppDetails(appid) {
		try {
			const url = `https://store.steampowered.com/api/appdetails?appids=${encodeURIComponent(appid)}&cc=US&l=english`;
			const text = await this._steamFetchText(url, { "Accept": "application/json,text/plain,*/*" });
			const data = JSON.parse(text);
			const node = data?.[String(appid)];
			if (!node?.success || !node?.data) return null;
			return node.data;
		} catch (_) {
			return null;
		}
	}

	async _steamCanonicalTitle(appid) {
		const details = await this._steamAppDetails(appid);
		if (details?.name) {
			const date = String(details?.release_date?.date || "");
			return { name: String(details.name).trim(), releaseYear: date.match(/\b(?:19|20)\d{2}\b/)?.[0] || "" };
		}
		try {
			const html = await this._steamFetchText(`https://store.steampowered.com/app/${encodeURIComponent(appid)}/`);
			const title = html.match(/class=["'][^"']*apphub_AppName[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1]
				|| html.match(/id=["']appHubAppName["'][^>]*>([\s\S]*?)<\/div>/i)?.[1]
				|| html.match(/<meta[^>]+itemprop=["']name["'][^>]+content=["']([^"']+)["']/i)?.[1]
				|| "";
			return { name: this._htmlDecode(title.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()), releaseYear: "" };
		} catch (_) { return { name: "", releaseYear: "" }; }
	}

	async findSteamApp(title, options = {}) {
		const term = String(title ?? "").trim();
		if (!term) throw new Error("Nome do jogo vazio.");

		const target = this._normalizeSteamName(term);
		const titleYearMatch = term.match(/\b(19|20)\d{2}\b/);
		const requestedYear = String(titleYearMatch?.[0] || options.year || "").trim();
		const explicitYear = titleYearMatch?.[0] || requestedYear;
		const hasRemake = /\bremake\b/i.test(term);
		const hasRemaster = /\bremaster(ed)?\b/i.test(term);
		const baseTitle = this._normalizeSteamName(
			term
				.replace(/\(?\b(19|20)\d{2}\b\)?/g, " ")
				.replace(/\bremaster(ed)?\b/gi, " ")
				.replace(/\bremake\b/gi, " ")
				.replace(/\s{2,}/g, " ")
				.trim()
		);

		const queries = [...new Set([
			term,
			explicitYear ? `${baseTitle} ${explicitYear}` : "",
			baseTitle
		].filter(Boolean))];

		const byAppId = new Map();
		for (const query of queries) {
			for (const c of await this._steamSearchCandidates(query)) {
				if (!byAppId.has(c.appid)) byAppId.set(c.appid, c);
			}
		}

		const rawCandidates = [...byAppId.values()];
		if (!rawCandidates.length) throw new Error(`Não encontrei jogos Steam para “${term}”.`);

		const hydrated = [];
		for (const c of rawCandidates.slice(0, 24)) {
			const canonical = await this._steamCanonicalTitle(c.appid);
			const displayName = canonical?.name || c.name;
			const norm = this._normalizeSteamName(displayName);
			const releaseYear = String(canonical?.releaseYear || c.releaseYear || displayName.match(/\b(19|20)\d{2}\b/)?.[0] || "");
			let score = 0;
			if (norm === target) score = 2000;
			else if (baseTitle && norm === baseTitle) score = 1800;
			else if (baseTitle && norm.startsWith(baseTitle)) score = 1400;
			else if (baseTitle && baseTitle.startsWith(norm)) score = 1300;
			else {
				const a = new Set(norm.split(" ").filter(Boolean));
				const b = baseTitle.split(" ").filter(Boolean);
				const overlap = b.filter(x => a.has(x)).length;
				score = overlap * 100 - Math.abs(norm.length - baseTitle.length);
			}

			// O ano digitado no título OU no campo “Ano de lançamento” é uma restrição forte.
			if (explicitYear) {
				if (norm.includes(explicitYear)) score += 1400;
				else if (releaseYear === explicitYear) score += 1700;
				else score -= 1600;
			}

			// A Steam nem sempre escreve “Remake/Remastered” no título oficial.
			// Nesses casos, uma variante pedida pelo usuário é resolvida pela data de lançamento:
			// entre candidatos equivalentes, a variante é normalmente a versão mais recente.
			if (hasRemake) {
				if (/\bremake\b/i.test(displayName)) score += 700;
				else if (releaseYear) score += Math.max(0, Number(releaseYear) - 2000) * 8;
			}
			if (hasRemaster) {
				if (/\bremaster(ed)?\b/i.test(displayName)) score += 700;
				else if (releaseYear) score += Math.max(0, Number(releaseYear) - 2000) * 6;
			}

			hydrated.push({ ...c, name: displayName, canonicalName: displayName, releaseYear, score, explicitYear });
		}

		// Quando o usuário escreveu “Remake/Remastered” e há várias versões com o mesmo
		// nome-base, dá um bônus adicional à versão mais recente. Isso resolve casos como
		// “Resident Evil 4 Remake”, cujo título oficial na Steam é apenas “Resident Evil 4”.
		if (hasRemake || hasRemaster) {
			const comparable = hydrated.filter(c => c.score > 0 && (!baseTitle || this._normalizeSteamName(c.name).includes(baseTitle)));
			const latestYear = comparable.map(c => Number(c.releaseYear)).filter(Boolean).sort((a, b) => b - a)[0];
			if (latestYear) {
				for (const c of comparable) {
					if (Number(c.releaseYear) === latestYear) c.score += 700;
				}
			}
		}

		hydrated.sort((a, b) => b.score - a.score || Number(b.releaseYear || 0) - Number(a.releaseYear || 0) || a.name.localeCompare(b.name));
		const best = hydrated[0];
		if (!best || best.score < 300) {
			throw new Error(`Não encontrei um jogo Steam suficientemente compatível para “${term}”.`);
		}

		// Quando não há ano/variante explícitos, nunca escolha silenciosamente entre
		// versões do mesmo jogo. Ex.: "Resident Evil 4" deve permitir escolher
		// entre o original (2005) e o remake (2023), em vez de assumir o primeiro.
		const sameBaseVariants = hydrated
			.filter(c => {
				const n = this._normalizeSteamName(c.name);
				return baseTitle && (n === baseTitle || n.startsWith(baseTitle + " ") || baseTitle.startsWith(n + " "));
			})
			.sort((a, b) => b.score - a.score || Number(b.releaseYear || 0) - Number(a.releaseYear || 0));

		if (!explicitYear && !hasRemake && !hasRemaster && sameBaseVariants.length > 1) {
			return await this._chooseSteamCandidate(term, sameBaseVariants.slice(0, 8));
		}

		if (explicitYear) {
			const exactYear = hydrated.filter(c => {
				const n = this._normalizeSteamName(c.name);
				return n.includes(explicitYear) || String(c.releaseYear) === explicitYear;
			});
			if (exactYear.length === 1) return exactYear[0];
		}

		return best;
	}

	async _chooseSteamCandidate(title, candidates) {
		return await new Promise((resolve, reject) => {
			// Modal 100% orientado a classes svl-* (sem estilo inline): o visual
			// vem inteiramente do CSS, no mesmo padrão da lightbox e dos outros
			// overlays do vault, para herdar a identidade Steam (ou dourada, na
			// aba RetroAchievements) automaticamente, sem duplicar regras aqui.
			const overlay = document.createElement("div");
			overlay.className = "svl-steam-picker-overlay";

			const panel = document.createElement("div");
			panel.className = "svl-steam-picker-panel";
			panel.setAttribute("role", "dialog");
			panel.setAttribute("aria-modal", "true");

			const titleEl = document.createElement("h2");
			titleEl.className = "svl-steam-picker-title";
			titleEl.textContent = "Escolha o jogo Steam";
			titleEl.id = `svl-steam-picker-${Date.now().toString(36)}`;
			panel.setAttribute("aria-labelledby", titleEl.id);
			const desc = document.createElement("p");
			desc.className = "svl-steam-picker-desc";
			desc.textContent = `Foram encontradas várias correspondências para "${title}".`;
			desc.id = `${titleEl.id}-d`;
			panel.setAttribute("aria-describedby", desc.id);
			let release = null;

			const list = document.createElement("div");
			list.className = "svl-steam-picker-list";

			const cleanup = () => {
				document.removeEventListener("keydown", onKeyDown, true);
				release?.();
				// mesmo padrão de saída da lightbox: toca a animação reversa
				// (classe is-closing) e só remove o overlay depois que ela
				// termina, em vez de sumir de um jeito seco.
				if (this.prefersReducedMotion()) { overlay.remove(); return; }
				overlay.classList.add("is-closing");
				setTimeout(() => overlay.remove(), 180);
			};
			const cancel = () => { cleanup(); reject(new Error("Seleção do jogo Steam cancelada.")); };
			const onKeyDown = e => { if (e.key === "Escape") { e.preventDefault(); cancel(); } };

			candidates.forEach((candidate, index) => {
				const btn = document.createElement("button");
				btn.type = "button";
				btn.className = "svl-steam-picker-item";

				const name = document.createElement("strong");
				name.className = "svl-steam-picker-item-name";
				name.textContent = candidate.name;

				const meta = document.createElement("div");
				meta.className = "svl-steam-picker-item-meta";
				const appid = document.createElement("span");
				appid.textContent = `AppID ${candidate.appid}`;
				meta.appendChild(appid);
				if (index === 0) {
					const badge = document.createElement("span");
					badge.className = "svl-steam-picker-badge";
					badge.textContent = "Melhor correspondência";
					meta.appendChild(badge);
				}

				btn.append(name, meta);
				btn.addEventListener("click", () => { cleanup(); resolve(candidate); });
				list.appendChild(btn);
			});

			const actions = document.createElement("div");
			actions.className = "svl-steam-picker-actions";
			const cancelBtn = document.createElement("button");
			cancelBtn.type = "button";
			cancelBtn.className = "svl-steam-picker-cancel";
			cancelBtn.textContent = "Cancelar";
			cancelBtn.addEventListener("click", cancel);
			actions.appendChild(cancelBtn);

			panel.append(titleEl, desc, list, actions);
			overlay.appendChild(panel);
			document.body.appendChild(overlay);
			document.addEventListener("keydown", onKeyDown, true);
			// Tab preso na janela; ao fechar, o foco volta para quem abriu
			const U = customJS.SteamVaultUI;
			if (U?.trapFocus) release = U.trapFocus(panel, { initial: () => list.querySelector("button") });
			else setTimeout(() => list.querySelector("button")?.focus(), 0);
		});
	}

	async fetchSteamAchievements(appid, options = {}) {
		const languages = Array.isArray(options.languages) && options.languages.length ? options.languages : ["brazilian", "english"];
		let lastError = null;
		for (const lang of languages) {
			try {
				const url = `https://steamcommunity.com/stats/${encodeURIComponent(appid)}/achievements/?l=${lang}`;
				const html = await this._steamFetchText(url, { "X-ValveUserAgent": "panorama" });
				if (!html || html.length < 500) continue;
				const doc = new DOMParser().parseFromString(html, "text/html");
				let rows = [...doc.querySelectorAll(".achieveRow")];

				// A Steam pode mudar detalhes do markup; preserve fallbacks para os blocos
				// estáveis achieveTxt/achieveImgHolder.
				if (!rows.length) {
					const texts = [...doc.querySelectorAll(".achieveTxt")];
					const imgs = [...doc.querySelectorAll(".achieveImgHolder img")];
					if (texts.length && imgs.length) {
						rows = texts.map((text, i) => ({ text, img: imgs[i] || null, fallback: true }));
					}
				}

				// Último fallback: extrai diretamente os blocos do HTML, sem depender de DOMParser.
				if (!rows.length) {
					const blockRe = /<div[^>]+class=["'][^"']*\\bachieveRow\\b[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<div[^>]+class=["'][^"']*\\bclearer\\b[^"']*["'][^>]*>/gi;
					let m;
					while ((m = blockRe.exec(html))) {
						const block = m[0];
						const img = block.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] || "";
						const nameRaw = block.match(/<div[^>]+class=["'][^"']*\\bachieveTxt\\b[^"']*["'][^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1] || "";
						const descRaw = block.match(/<div[^>]+class=["'][^"']*\\bachieveTxt\\b[^"']*["'][^>]*>[\s\S]*?<h5[^>]*>([\s\S]*?)<\/h5>/i)?.[1] || "";
						const name = this._htmlDecode(nameRaw.replace(/<[^>]+>/g, " ").replace(/\\s+/g, " ").trim());
						const description = this._htmlDecode(descRaw.replace(/<[^>]+>/g, " ").replace(/\\s+/g, " ").trim());
						if (name) rows.push({ rawName: name, rawDescription: description, rawImg: img, rawHtml: block, fallback: true });
					}
				}

				if (!rows.length) continue;

				let achievements = rows.map((row, index) => {
					const isRawFallback = !!row.rawName;
					const textRoot = row.fallback ? row.text : row.querySelector?.(".achieveTxt");
					const imgNode = row.fallback ? row.img : (row.querySelector?.(".achieveImgHolder img") || row.querySelector?.("img"));
					const img = row.rawImg || imgNode?.getAttribute?.("src") || "";
					const name = row.rawName || (textRoot?.querySelector?.("h3")?.textContent || row.querySelector?.("h3")?.textContent || "").trim();
					const description = row.rawDescription || (textRoot?.querySelector?.("h5")?.textContent || row.querySelector?.("h5")?.textContent || "").trim();
					const pctRoot = row.fallback ? null : row.querySelector(".achievePercent");
					const percentageText = (pctRoot?.textContent || row.text?.textContent || row.textContent || "").match(/(\d+(?:[\.,]\d+)?)%/);
					const percentage = percentageText ? Number(percentageText[1].replace(",", ".")) : null;
					return {
						key: String(row.getAttribute?.("data-achievementid") || row.getAttribute?.("data-achievement") || index + 1),
						name: name || `Conquista ${index + 1}`,
						description,
						iconUrl: this._absoluteSteamUrl(img),
						percentage,
						unlocked: false
					};
				}).filter(a => a.name && !/^Conquista \d+$/i.test(a.name));

				if (achievements.length) {
					// A página pública da Steam omite propositalmente a descrição de várias
					// conquistas ocultas. Nesses casos, tente uma fonte pública de
					// catálogo que replica os dados de conquistas da Steam. A Steam
					// continua sendo a fonte primária; o fallback só preenche campos vazios.
					try {
						const fallback = await this._fetchPublicSteamAchievementDescriptions(options?.gameTitle || "");
						if (fallback?.size) {
							achievements = achievements.map(a => {
							if (String(a.description || "").trim()) return a;
							const recovered = fallback.get(this._normalizeAchievementName(a.name));
							return recovered ? { ...a, description: recovered } : a;
						});
						}
					} catch (fallbackErr) {
						console.warn("Game Library: não foi possível recuperar descrições faltantes das conquistas Steam.", fallbackErr);
					}
					return { achievements, language: lang, url };
				}
			} catch (err) {
				lastError = err;
			}
		}
		throw lastError || new Error(`A Steam não retornou conquistas para o AppID ${appid}.`);
	}

	_normalizeAchievementName(value) {
		return this._normalizeSteamName(value);
	}

	_steamAchievementSlug(value) {
		return this._normalizeAchievementName(value).replace(/\s+/g, "-");
	}

	async _fetchPublicSteamAchievementDescriptions(gameTitle) {
		const title = String(gameTitle || "").trim();
		if (!title) return new Map();
		const slug = this._steamAchievementSlug(title);
		if (!slug) return new Map();

		const urls = [
			`https://www.exophase.com/game/${encodeURIComponent(slug)}-steam/achievements/pt-BR/`,
			`https://www.exophase.com/game/${encodeURIComponent(slug)}-steam/achievements/`
		];

		const map = new Map();
		for (const url of urls) {
			try {
				const html = await this._steamFetchText(url, { "Accept": "text/html,application/xhtml+xml,*/*" });
				if (!html || html.length < 1000) continue;
				const doc = new DOMParser().parseFromString(html, "text/html");
				const links = [...doc.querySelectorAll('a[href*="/achievement/"]')];
				for (const link of links) {
					const name = String(link.textContent || "").replace(/\s+/g, " ").trim();
					if (!name) continue;
					let card = link.closest("li, article, .achievement, .achievement-card, .game-achievement") || link.parentElement;
					for (let depth = 0; depth < 3 && card; depth++, card = card.parentElement) {
						const lines = String(card.innerText || "")
							.split(/\n+/)
							.map(x => x.trim())
							.filter(Boolean);
						const nameIndex = lines.findIndex(x => this._normalizeAchievementName(x) === this._normalizeAchievementName(name));
						if (nameIndex < 0) continue;
						const after = lines.slice(nameIndex + 1).filter(x => !/^Image$/i.test(x) && !/^\d+(?:[.,]\d+)?%/.test(x) && !/^\d+(?:[.,]\d+)?$/.test(x));
						const description = after.find(x => x && !/^Steam$/i.test(x) && x.length > 2);
						if (description) {
							map.set(this._normalizeAchievementName(name), description);
							break;
						}
					}
				}
				if (map.size) return map;
			} catch (_) {}
		}
		return map;
	}

	_absoluteSteamUrl(url) {
		const value = String(url ?? "").trim();
		if (!value) return "";
		if (/^https?:\/\//i.test(value)) return value;
		if (value.startsWith("//")) return `https:${value}`;
		try { return new URL(value, "https://steamcommunity.com/").href; } catch (_) { return value; }
	}

	// ------------------------------------------------ ícones de conquistas
	// Toda gravação de imagem baixada passa por aqui. Antes era usado
	// app.vault.adapter.writeBinary, que grava no disco mas NÃO registra o
	// arquivo no índice do vault — no celular (sem monitor de arquivos) o
	// ícone ficava "invisível": getAbstractFileByPath devolvia null, o
	// <img> apontava para um caminho cru e quebrava, e serviços de
	// sincronização nem enviavam o arquivo para os outros aparelhos.
	async _writeVaultBinary(path, data) {
		const existing = app.vault.getAbstractFileByPath(path);
		if (existing && "extension" in existing && typeof app.vault.modifyBinary === "function") {
			await app.vault.modifyBinary(existing, data);
			return path;
		}
		// arquivo "órfão" (no disco, fora do índice): remove e recria pelo vault
		try { if (!existing && await app.vault.adapter.exists(path)) await app.vault.adapter.remove(path); } catch (_) {}
		await app.vault.createBinary(path, data);
		return path;
	}

	// identifica o formato real pelos primeiros bytes — a extensão da URL
	// nem sempre bate com o conteúdo, e uma página de erro em HTML nunca
	// deve ser salva como se fosse imagem.
	_imageExtFromBytes(data) {
		const b = new Uint8Array(data.slice(0, 12));
		if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return "png";
		if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return "jpg";
		if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "gif";
		if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "webp";
		if (b[0] === 0x42 && b[1] === 0x4D) return "bmp";
		return "";
	}

	// tenta cada URL até uma devolver uma imagem válida
	async _fetchImageBytes(urls, via = "steam") {
		const request = via === "ra" ? this._raBridgeRequest.bind(this) : this._steamRequest.bind(this);
		let lastErr = null;
		for (const url of urls.filter(Boolean)) {
			try {
				const response = await request(url, {
					method: "GET",
					headers: { "User-Agent": "Mozilla/5.0 (Obsidian Game Library)", "Accept": "image/*,*/*;q=0.8" },
					throw: false
				});
				if (response?.status && response.status >= 400) throw new Error(`HTTP ${response.status}`);
				let data = null;
				if (typeof response?.arrayBuffer === "function") data = await response.arrayBuffer();
				else if (response?.arrayBuffer instanceof ArrayBuffer) data = response.arrayBuffer;
				else if (typeof response?.buffer === "function") data = await response.buffer();
				else if (response?.buffer instanceof ArrayBuffer) data = response.buffer;
				if (!(data instanceof ArrayBuffer) || data.byteLength < 64) throw new Error("Imagem vazia.");
				const ext = this._imageExtFromBytes(data);
				if (!ext) throw new Error("A resposta não é uma imagem.");
				return { data, ext, url };
			} catch (err) {
				lastErr = err;
			}
		}
		throw lastErr || new Error("Nenhuma URL de ícone disponível.");
	}

	// a Steam serve o mesmo ícone por vários CDNs; se um domínio antigo
	// (steamcdn-a.akamaihd.net etc.) falhar, os outros costumam responder
	_steamIconCandidates(iconUrl) {
		const abs = this._absoluteSteamUrl(iconUrl);
		const out = [abs];
		const m = abs.match(/\/images\/apps\/(\d+)\/([^?#]+)/i);
		if (m) {
			const tail = `${m[1]}/${m[2]}`;
			out.push(
				`https://cdn.fastly.steamstatic.com/steamcommunity/public/images/apps/${tail}`,
				`https://cdn.akamai.steamstatic.com/steamcommunity/public/images/apps/${tail}`,
				`https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${tail}`,
				`https://shared.fastly.steamstatic.com/community_assets/images/apps/${tail}`,
				`https://shared.akamai.steamstatic.com/community_assets/images/apps/${tail}`,
				`https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/${tail}`
			);
		}
		// o endereço pode vir de uma nota (steamIconUrl): só domínios da Steam,
		// nunca localhost ou a rede local
		const hosts = ["steamstatic.com", "steamcommunity.com", "steampowered.com", "steamcdn-a.akamaihd.net"];
		return [...new Set(out.map(u => customJS.SteamVaultCore.safeUrl(u, { hosts })).filter(Boolean))];
	}

	// arquivo de ícone já baixado, válido e registrado no vault
	_existingIconFile(folder, base) {
		for (const ext of ["png", "jpg", "gif", "webp", "bmp"]) {
			const f = app.vault.getAbstractFileByPath(`${folder}/${base}.${ext}`);
			if (f && "extension" in f && (f.stat?.size ?? 1) > 0) return f.path;
		}
		return "";
	}

	// O ícone precisa ser (re)buscado? Sim quando: está vazio, é o troféu
	// padrão, é uma URL remota da Steam/RA (baixa para ficar offline) ou
	// aponta para um arquivo que não existe mais no vault. Emoji ou imagem
	// escolhidos pelo usuário (que existem) são sempre preservados.
	_achievementIconNeedsRepair(icon) {
		const val = String(icon ?? "").trim();
		if (!val || val === "🏆") return true;
		if (/^https?:\/\//i.test(val)) return /steam|akamaihd|retroachievements/i.test(val);
		if (/^(data:|app:|capacitor:|blob:)/i.test(val)) return false;
		const looksLikeFile = /\.(png|jpe?g|gif|webp|svg|bmp|heic|heif|avif|tiff?)$/i.test(val) || val.includes("/");
		if (!looksLikeFile) return false;
		const clean = val.replace(/^\.?\//, "");
		const file = app.vault.getAbstractFileByPath(clean) || app.metadataCache.getFirstLinkpathDest?.(clean, "");
		if (!file || !("extension" in file)) return true;
		return (file.stat?.size ?? 1) <= 0;
	}

	// options.strict: em caso de falha devolve "" (em vez da URL remota),
	// para quem chamou saber que o download não aconteceu
	async _downloadSteamAchievementIcon(iconUrl, gameName, achievementName, assetBaseName = "", options = {}) {
		if (!iconUrl) return "";
		const assetsFolder = `${this.folders.achievementAssets}/${this.safeName(gameName, "Jogo")}`;
		await this.ensureFolder(assetsFolder);
		const base = this.safeName(assetBaseName || achievementName, "Conquista");
		const reuse = this._existingIconFile(assetsFolder, base);
		if (reuse) return reuse;
		try {
			const { data, ext } = await this._fetchImageBytes(this._steamIconCandidates(iconUrl), "steam");
			return await this._writeVaultBinary(`${assetsFolder}/${base}.${ext}`, data);
		} catch (err) {
			console.warn("Game Library: não foi possível baixar ícone da conquista.", iconUrl, err);
			return options.strict ? "" : iconUrl;
		}
	}

	// ============================================================ alerta de preço
	// Consulta o preço atual na loja da Steam (região Brasil, em R$) e
	// guarda no frontmatter do jogo: currentPrice, regularPrice,
	// discountPercent, lowestSeenPrice/lowestSeenDate e priceCheckedAt.
	// Vale para jogos na Lista de desejos ou com preço-alvo e ainda não
	// comprados (sem "Preço pago").
	async fetchSteamPrice(appid) {
		const url = `https://store.steampowered.com/api/appdetails?appids=${encodeURIComponent(appid)}&cc=br&l=portuguese&filters=price_overview`;
		const text = await this._steamFetchText(url, { "Accept": "application/json" });
		let json;
		try { json = JSON.parse(text); } catch (_) { throw new Error("A Steam não devolveu os dados de preço."); }
		const entry = json?.[String(appid)];
		if (!entry?.success) throw new Error(`AppID ${appid} não encontrado na loja da Steam.`);
		const po = entry.data?.price_overview;
		// sem price_overview: jogo gratuito, fora de venda ou sem preço no Brasil
		if (!po) return { unavailable: true };
		return {
			current: Math.round(Number(po.final) || 0) / 100,
			regular: Math.round(Number(po.initial) || 0) / 100,
			discount: Number(po.discount_percent) || 0,
			currency: po.currency || "BRL"
		};
	}

	_priceWatched(p) {
		if (!p) return false;
		return p.status === "Wishlist" || (Number(p.targetPrice) > 0 && !(Number(p.price) > 0));
	}

	_isBlankValue(v) {
		return v === undefined || v === null || String(v).trim() === "";
	}

	_notify(text, ms = 8000) {
		const N = globalThis.customJS?.obsidian?.Notice || globalThis.Notice;
		try { if (typeof N === "function") new N(text, ms); } catch (_) {}
	}

	// verifica UM jogo. options.lookup: se não houver steamAppId, tenta
	// descobrir pelo nome (pode abrir o seletor de jogos da Steam)
	async checkGamePrice(fileOrPath, options = {}) {
		const file = typeof fileOrPath === "string" ? app.vault.getAbstractFileByPath(fileOrPath) : fileOrPath;
		if (!file) throw new Error("Ficha do jogo não encontrada.");
		const fmNow = app.metadataCache.getFileCache(file)?.frontmatter || {};
		const title = fmNow.title || file.basename;
		let appid = String(fmNow.steamAppId || "").trim();
		if (!appid && options.lookup) {
			const found = await this.findSteamApp(title, { year: fmNow.releaseYear || "" });
			appid = String(found?.appid || "").trim();
		}
		if (!appid) throw new Error("Este jogo não tem Steam App ID.");
		const price = await this.fetchSteamPrice(appid);
		const now = window.moment ? window.moment().format("YYYY-MM-DDTHH:mm") : new Date().toISOString().slice(0, 16);
		const today = now.slice(0, 10);
		let reachedTarget = false;
		await app.fileManager.processFrontMatter(file, fm => {
			fm.steamAppId = appid;
			fm.priceCheckedAt = now;
			if (price.unavailable) { fm.priceStatus = "indisponivel"; return; }
			fm.priceStatus = "";
			const target = Number(fm.targetPrice) || 0;
			const prev = this._isBlankValue(fm.currentPrice) ? null : Number(fm.currentPrice);
			// só avisa quando CRUZA o alvo — não repete a cada verificação
			reachedTarget = this._priceWatched(fm) && target > 0 && price.current <= target && !(prev !== null && prev <= target);
			fm.currentPrice = price.current;
			fm.regularPrice = price.regular;
			fm.discountPercent = price.discount;
			const low = Number(fm.lowestSeenPrice);
			if (this._isBlankValue(fm.lowestSeenPrice) || !Number.isFinite(low) || price.current < low) {
				fm.lowestSeenPrice = price.current;
				fm.lowestSeenDate = today;
			}
		});
		if (reachedTarget) this._notify(`💰 ${title} chegou ao seu preço-alvo: ${this.formatPrice(price.current)}${price.discount ? ` (-${price.discount}%)` : ""}`);
		return { title, appid, ...price, reachedTarget };
	}

	// botão "Verificar preço" dentro da seção Compra da ficha
	wirePriceCheck(root, p) {
		const btn = root?.querySelector?.("#svl-price-check");
		const msg = root?.querySelector?.("#svl-price-check-msg");
		if (!btn || btn.dataset.wired === "1") return;
		btn.dataset.wired = "1";
		btn.addEventListener("click", async () => {
			btn.disabled = true;
			const section = btn.closest(".svl-fb-section");
			section?.classList.add("is-refreshing");
			if (msg) { msg.textContent = "Consultando a Steam…"; msg.className = "svl-price-check-msg"; }
			try {
				const r = await this.checkGamePrice(p.file.path, { lookup: true });
				const text = r.unavailable
					? "Sem preço na loja brasileira da Steam"
					: `${this.formatPrice(r.current)}${r.discount ? ` (-${r.discount}%)` : ""}`;
				if (msg) { msg.textContent = text; msg.className = "svl-price-check-msg is-success"; }
				setTimeout(() => { try { (app.workspace.getMostRecentLeaf?.() || app.workspace.activeLeaf)?.rebuildView?.(); } catch (_) {} }, 300);
			} catch (err) {
				console.error("Game Library: falha ao verificar preço.", err);
				if (msg) { msg.textContent = err?.message || "Não foi possível verificar o preço."; msg.className = "svl-price-check-msg is-error"; }
			} finally {
				btn.disabled = false;
				section?.classList.remove("is-refreshing");
			}
		});
	}

	async importSteamAchievements(gamePage, appid = "", options = {}) {
		const title = gamePage?.title || gamePage?.file?.name || "Jogo";
		const lookupOptions = { ...options, year: options.year || gamePage?.releaseYear || "" };
		const resolved = appid ? { appid: String(appid), name: title } : await this.findSteamApp(title, lookupOptions);
		const result = await this.fetchSteamAchievements(resolved.appid, { gameTitle: resolved.name || title });
		const folder = `${this.folders.achievements}/${this.safeName(title, "Jogo")}`;
		await this.ensureFolder(folder);

		const yesc = s => this.yamlEscape(s);
		let created = 0;
		let reused = 0;
		for (const [orderIndex, ach] of result.achievements.entries()) {
			const safeAch = this.safeName(ach.name, "Conquista");
			let path = `${folder}/${safeAch}.md`;
			const existing = app.vault.getAbstractFileByPath(path);
			if (existing) {
				reused += 1;
				continue;
			}
			let n = 1;
			while (app.vault.getAbstractFileByPath(path)) {
				n += 1;
				path = `${folder}/${safeAch} ${n}.md`;
			}

			const iconBaseName = path.replace(`${folder}/`, "").replace(/\.md$/i, "");
			const icon = await this._downloadSteamAchievementIcon(ach.iconUrl, title, ach.name, iconBaseName);
			const today = customJS.SteamVaultCore.today();
			const content = [
				"---",
				"type: achievement",
				`name: "${yesc(ach.name)}"`,
				`description: "${yesc(ach.description)}"`,
				`icon: "${yesc(icon)}"`,
				"points: 0",
				"unlocked: false",
				"unlockedDate: \"\"",
				"unlockedTime: \"\"",
				`game: "[[${gamePage.file.name}]]"`,
				`gamePath: "${yesc(gamePage.file.path)}"`,
				`steamAppId: "${yesc(resolved.appid)}"`,
				`steamGlobalPercent: ${ach.percentage == null ? '""' : ach.percentage}`,
				`steamIconUrl: "${yesc(ach.iconUrl)}"`,
				// posição na lista pública da Steam: a ficha usa isto para
				// reproduzir exatamente a ordem da Steam
				`steamOrder: ${orderIndex + 1}`,
				`dateAdded: ${today}`,
				"cssclasses: [steamvault, sv-achievement]",
				"---",
				"",
				...customJS.SteamVaultCore.noteBody("achievement").split("\n")
			].join("\n");
			await app.vault.create(path, content);
			created += 1;
		}

		return { appid: resolved.appid, name: resolved.name, language: result.language, total: result.achievements.length, created, reused };
	}

	// ============================================================
	// ------------ importação automática: RetroAchievements Web API ------------
	// Integração com a Web API OFICIAL do RetroAchievements
	// (https://api-docs.retroachievements.org/). Não usa scraping, não usa
	// serviços intermediários e não exige login na conta do usuário — a
	// única credencial usada é a Web API Key, configurada uma vez na
	// aba RetroAchievements e nunca gravada em notas, logs ou código-fonte.
	// Veja raSettingsPanel()/wireRaSettingsPanel() para a configuração da
	// chave e raImportForm()/wireRaImportForm() para a importação em si.
	// ============================================================

	// --------------------------------------------------- credencial (chave)
	// A chave fica em app.loadLocalStorage/saveLocalStorage: um
	// armazenamento nativo do Obsidian, associado a este cofre e a este
	// dispositivo, fora de qualquer nota, fora da pasta do vault e fora
	// da sincronização de conteúdo do vault (bem diferente de gravar a
	// chave num arquivo .md ou .json dentro do cofre). É o armazenamento
	// "seguro" mais próximo disponível para um script CustomJS, sem
	// depender de nenhuma biblioteca extra.
	_raStorageKey() {
		return "steamvault-retroachievements-webapikey";
	}

	// chave usada pela versão anterior (iiSU). Lida uma vez e migrada.
	_raLegacyStorageKey() {
		return "iisu-retroachievements-webapikey";
	}

	_raHasLocalStorageBridge() {
		return typeof app?.loadLocalStorage === "function" && typeof app?.saveLocalStorage === "function";
	}

	// nunca chamado pela UI diretamente — só pela camada de requisição.
	_raGetApiKeyRaw() {
		if (!this._raHasLocalStorageBridge()) return "";
		try {
			const cur = String(app.loadLocalStorage(this._raStorageKey()) || "").trim();
			if (cur) return cur;
			const old = String(app.loadLocalStorage(this._raLegacyStorageKey()) || "").trim();
			if (old) { app.saveLocalStorage(this._raStorageKey(), old); app.saveLocalStorage(this._raLegacyStorageKey(), null); }
			return old;
		} catch (_) {
			return "";
		}
	}

	raHasApiKey() {
		return !!this._raGetApiKeyRaw();
	}

	// -------------------------------------------------- camada de rede
	// Domínios oficiais aceitos. NUNCA aceita um domínio vindo de input
	// do usuário — a lista é fixa, hardcoded, e checada por igualdade
	// exata de host (não por "includes"/"endsWith", que poderiam ser
	// enganados por algo como "retroachievements.org.evil.com").
	_raAllowedHosts() {
		return ["retroachievements.org", "www.retroachievements.org", "media.retroachievements.org"];
	}

	_raAssertOfficialUrl(urlString) {
		let host = "";
		try {
			host = new URL(urlString).hostname.toLowerCase();
		} catch (_) {
			throw new Error("URL inválida para a requisição do RetroAchievements.");
		}
		if (!this._raAllowedHosts().includes(host)) {
			throw new Error("Bloqueado: destino fora do domínio oficial do RetroAchievements.");
		}
		return true;
	}

	// mesma ponte de rede usada pela integração Steam (requestUrl do
	// Obsidian, sem CORS), mas isolada num método próprio: assim nada
	// relacionado à Steam precisa mudar, e esta função nunca ecoa a URL
	// completa (que pode conter a chave) em nenhum log.
	async _raBridgeRequest(url, options = {}) {
		const candidates = [
			globalThis?.customJS?.obsidian?.requestUrl,
			globalThis?.requestUrl,
			globalThis?.app?.requestUrl
		];
		for (const fn of candidates) {
			if (typeof fn === "function") {
				try {
					return await fn.call(globalThis.customJS?.obsidian || globalThis, { url, ...options });
				} catch (err) {
					// tenta a próxima ponte disponível
				}
			}
		}
		throw new Error("Não consegui acessar a função de rede do Obsidian (requestUrl). Verifique se o plugin CustomJS está carregado.");
	}

	// endpoints oficiais permitidos — uma allowlist fixa em vez de deixar
	// o chamador montar o nome do arquivo livremente.
	_raEndpoints() {
		return { gameExtended: "API_GetGameExtended.php" };
	}

	// função central de requisição: TODA chamada à Web API do RA passa
	// por aqui. A chave só é lida e anexada na hora da requisição, nunca
	// é devolvida ao chamador, nunca aparece em console.log/console.error
	// e nunca é escrita em disco.
	async _raRequestJson(endpointKey, params = {}) {
		const endpointFile = this._raEndpoints()[endpointKey];
		if (!endpointFile) throw new Error("Endpoint interno desconhecido.");

		const apiKey = this._raGetApiKeyRaw();
		if (!apiKey) throw new Error("Web API Key do RetroAchievements não configurada. Configure na aba RetroAchievements.");

		const url = new URL(`https://retroachievements.org/API/${endpointFile}`);
		for (const [k, v] of Object.entries(params)) {
			if (v === undefined || v === null || v === "") continue;
			url.searchParams.set(k, String(v));
		}
		// a chave é anexada por último e só aqui — nunca fica guardada em
		// nenhuma variável fora deste método.
		url.searchParams.set("y", apiKey);
		this._raAssertOfficialUrl(url.href);

		let response;
		try {
			response = await this._raBridgeRequest(url.href, {
				method: "GET",
				headers: { "User-Agent": "Mozilla/5.0 (Obsidian Game Library)", "Accept": "application/json" },
				// sem isso, o requestUrl do Obsidian lança uma exceção genérica em
				// qualquer status >= 400 e nunca chegamos a checar response.status
				// abaixo — as mensagens amigáveis (chave inválida, rate limit, jogo
				// não encontrado) nunca apareceriam.
				throw: false
			});
		} catch (err) {
			// nunca inclua url.href (contém a chave) nesta mensagem/log
			console.error("Game Library: falha de rede ao consultar a Web API do RetroAchievements.");
			throw new Error("Erro de rede ao falar com o RetroAchievements. Verifique sua conexão e tente de novo.");
		}

		const status = response?.status;
		if (status && status >= 400) {
			if (status === 401 || status === 403) throw new Error("Web API Key do RetroAchievements inválida ou sem permissão.");
			if (status === 429) throw new Error("Limite de requisições do RetroAchievements atingido. Aguarde um pouco e tente de novo.");
			if (status === 404) throw new Error("Jogo não encontrado no RetroAchievements.");
			throw new Error(`O RetroAchievements respondeu com um erro (HTTP ${status}).`);
		}

		let data;
		try {
			data = JSON.parse(String(response?.text ?? ""));
		} catch (_) {
			throw new Error("O RetroAchievements devolveu uma resposta que não é um JSON válido.");
		}
		if (data === undefined || data === null) throw new Error("O RetroAchievements não devolveu dados.");
		return data;
	}

	// -------------------------------------------------- normalização
	_raPick(obj, ...keys) {
		for (const k of keys) {
			if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
		}
		return undefined;
	}

	_raValidateGameId(value) {
		const raw = String(value ?? "").trim();
		if (!/^\d+$/.test(raw) || Number(raw) <= 0) {
			throw new Error("Game ID inválido — informe apenas o número do jogo no RetroAchievements (ex: 14402).");
		}
		return Number(raw);
	}

	// as imagens do RA vivem em media.retroachievements.org; a API só
	// devolve o caminho relativo (ex: "/Images/000705.png"). A URL final
	// é sempre montada por nós a partir de um domínio fixo — nunca a
	// partir de algo que o usuário digitou.
	_raImageUrl(relPath) {
		const val = String(relPath ?? "").trim();
		if (!val || !val.startsWith("/")) return "";
		const url = `https://media.retroachievements.org${val}`;
		try { this._raAssertOfficialUrl(url); } catch (_) { return ""; }
		return url;
	}

	_raBadgeUrl(badgeName) {
		const val = String(badgeName ?? "").trim();
		if (!val || !/^[A-Za-z0-9_-]+$/.test(val)) return "";
		const url = `https://media.retroachievements.org/Badge/${encodeURIComponent(val)}.png`;
		try { this._raAssertOfficialUrl(url); } catch (_) { return ""; }
		return url;
	}

	_raNormalizeAchievements(rawMap, totalPlayers) {
		const list = Object.values(rawMap || {});
		return list.map(a => {
			const id = Number(this._raPick(a, "ID", "id"));
			const numAwarded = Number(this._raPick(a, "NumAwarded", "numAwarded")) || 0;
			const badgeName = String(this._raPick(a, "BadgeName", "badgeName") || "").trim();
			const percent = totalPlayers > 0 ? Math.round((numAwarded / totalPlayers) * 1000) / 10 : null;
			return {
				id,
				name: String(this._raPick(a, "Title", "title") || "").trim(),
				description: String(this._raPick(a, "Description", "description") || "").trim(),
				points: Number(this._raPick(a, "Points", "points")) || 0,
				badgeName,
				iconUrl: this._raBadgeUrl(badgeName),
				setType: String(this._raPick(a, "type", "Type") || "").trim(),
				displayOrder: Number(this._raPick(a, "DisplayOrder", "displayOrder")) || 0,
				numAwarded,
				percent
			};
		})
		.filter(a => Number.isFinite(a.id) && a.id > 0 && a.name)
		.sort((x, y) => x.displayOrder - y.displayOrder || x.id - y.id);
	}

	_raNormalizeGame(raw) {
		const id = Number(this._raPick(raw, "ID", "id"));
		if (!Number.isFinite(id) || id <= 0) throw new Error("Jogo não encontrado no RetroAchievements.");
		const totalPlayers = Number(this._raPick(raw, "NumDistinctPlayersCasual", "numDistinctPlayersCasual")) || 0;
		const achievementsRaw = this._raPick(raw, "Achievements", "achievements") || {};
		return {
			id,
			title: String(this._raPick(raw, "Title", "title") || "").trim(),
			consoleName: String(this._raPick(raw, "ConsoleName", "consoleName") || "").trim(),
			icon: this._raImageUrl(this._raPick(raw, "ImageIcon", "imageIcon")),
			boxArt: this._raImageUrl(this._raPick(raw, "ImageBoxArt", "imageBoxArt")),
			totalPlayers,
			achievements: this._raNormalizeAchievements(achievementsRaw, totalPlayers)
		};
	}

	async raFetchGameExtended(gameIdInput) {
		const id = this._raValidateGameId(gameIdInput);
		const raw = await this._raRequestJson("gameExtended", { i: id });
		if (Array.isArray(raw) && raw.length === 0) throw new Error("Jogo não encontrado no RetroAchievements.");
		return this._raNormalizeGame(raw);
	}

	// -------------------------------------------------- download de badge
	// Baixa o ícone da conquista para dentro do vault (mesma pasta usada
	// pela importação Steam), assim a ficha funciona offline. O host já
	// foi validado em _raBadgeUrl/_raImageUrl antes de chegar aqui; ainda
	// assim, revalidamos por segurança antes de qualquer download.
	async _raDownloadImage(url, gameTitle, baseName, options = {}) {
		if (!url) return "";
		try { this._raAssertOfficialUrl(url); } catch (_) { return options.strict ? "" : url; }
		const assetsFolder = `${this.folders.achievementAssets}/${this.safeName(gameTitle, "Jogo")}`;
		await this.ensureFolder(assetsFolder);
		const base = this.safeName(baseName, "conquista");
		const reuse = this._existingIconFile(assetsFolder, base);
		if (reuse) return reuse;
		try {
			const { data, ext } = await this._fetchImageBytes([url], "ra");
			return await this._writeVaultBinary(`${assetsFolder}/${base}.${ext}`, data);
		} catch (err) {
			console.warn("Game Library: não foi possível baixar a imagem do RetroAchievements.", err);
			return options.strict ? "" : url;
		}
	}

	// registra um conjunto no frontmatter do JOGO: o Base Set vira o
	// raGameId; cada Subset entra (sem repetir) em raSubsetIds. Um jogo sem
	// raGameId ainda recebe o primeiro conjunto importado, como antes,
	// para continuar aparecendo na aba RetroAchievements.
	_raLinkSetToGame(fm, setId, setKind) {
		const id = Number(setId);
		if (!Number.isFinite(id) || id <= 0) return;
		if (setKind === "subset") {
			const current = (Array.isArray(fm.raSubsetIds) ? fm.raSubsetIds : (fm.raSubsetIds ? [fm.raSubsetIds] : []))
				.map(Number).filter(n => Number.isFinite(n) && n > 0);
			if (!current.includes(id)) current.push(id);
			fm.raSubsetIds = current.sort((a, b) => a - b);
			if (!this._achNum(fm.raGameId)) fm.raGameId = id;
		} else {
			fm.raGameId = id;
			if (Array.isArray(fm.raSubsetIds)) {
				const rest = fm.raSubsetIds.map(Number).filter(n => Number.isFinite(n) && n > 0 && n !== id);
				if (rest.length !== fm.raSubsetIds.length) fm.raSubsetIds = rest;
			}
		}
	}

	// -------------------------------------------------- importação em si
	// Cria/atualiza as notas de conquista em Achievements/<jogo>/, no
	// mesmo formato usado pelo Achievement Template e pelo formulário
	// manual "Adicionar conquista". Dedup por `raId`: uma conquista que já
	// foi importada antes é atualizada, nunca duplicada; `unlocked`,
	// `unlockedDate`, `unlockedTime` e o `icon` (caso o usuário já tenha
	// trocado por um customizado) nunca são sobrescritos numa atualização.
	async raImportGame(gameFile, gameIdInput, options = {}) {
		const game = await this.raFetchGameExtended(gameIdInput);
		if (!game.achievements.length) throw new Error("Este jogo não tem conquistas cadastradas no RetroAchievements.");

		const gameTitle = gameFile.title || gameFile.file?.name || gameFile.basename || "Jogo";
		// mesma convenção de pasta usada pelo formulário manual e pela
		// importação Steam (título > nome do arquivo), para que as
		// conquistas de um mesmo jogo sempre caiam na mesma pasta.
		const folder = `${this.folders.achievements}/${this.safeName(gameTitle, "Jogo")}`;
		await this.ensureFolder(folder);
		const gameFileRef = gameFile.file ?? gameFile;

		// índice das conquistas já importadas para este jogo, por raId
		const existingFiles = app.vault.getMarkdownFiles().filter(f => f.path.startsWith(`${folder}/`));
		const byRaId = new Map();
		for (const f of existingFiles) {
			const fm = app.metadataCache.getFileCache(f)?.frontmatter;
			if (fm?.type === "achievement" && fm?.raId) byRaId.set(Number(fm.raId), f);
		}

		const yesc = s => this.yamlEscape(s);
		const today = customJS.SteamVaultCore.today();
		let created = 0, updated = 0;
		// Base Set ou Subset: no RetroAchievements cada subset é um "jogo"
		// próprio, com Game ID próprio e título "Jogo [Subset - Nome]".
		// Guardar isso na conquista mantém cada uma presa ao seu conjunto.
		const setKind = this._raSubsetName(game.title) ? "subset" : "base";

		for (const ach of game.achievements) {
			const existingFile = byRaId.get(ach.id);

			if (existingFile) {
				await app.fileManager.processFrontMatter(existingFile, fm => {
					fm.name = ach.name;
					fm.description = ach.description;
					fm.points = ach.points;
					fm.raBadge = ach.badgeName;
					fm.raIconUrl = ach.iconUrl;
					fm.raPercent = ach.percent;
					fm.raSet = ach.setType;
					fm.raGameId = game.id;
					fm.raSetTitle = game.title;
					fm.raSetKind = setKind;
					fm.raDisplayOrder = ach.displayOrder;
					// unlocked/unlockedDate/unlockedTime/icon: preservados de propósito
				});
				updated += 1;
				continue;
			}

			// baixa o ícone só para conquistas novas — numa atualização o
			// campo `icon` é preservado (pode já ter sido customizado pelo
			// usuário), então não há por que baixar de novo.
			const iconBaseName = `${this.safeName(ach.name, "conquista")}-${ach.id}`;
			const localIcon = options.downloadIcons === false ? ach.iconUrl : await this._raDownloadImage(ach.iconUrl, gameTitle, iconBaseName);

			const safeAch = this.safeName(ach.name, "Conquista");
			let path = `${folder}/${safeAch}.md`;
			let n = 1;
			while (app.vault.getAbstractFileByPath(path)) {
				n += 1;
				path = `${folder}/${safeAch} ${n}.md`;
			}

			const content = [
				"---",
				"type: achievement",
				`name: "${yesc(ach.name)}"`,
				`description: "${yesc(ach.description)}"`,
				`icon: "${yesc(localIcon)}"`,
				`points: ${ach.points}`,
				"unlocked: false",
				"unlockedDate: \"\"",
				"unlockedTime: \"\"",
				`game: "[[${gameFileRef.name}]]"`,
				`gamePath: "${yesc(gameFileRef.path)}"`,
				`raId: ${ach.id}`,
				`raGameId: ${game.id}`,
				`raBadge: "${yesc(ach.badgeName)}"`,
				`raIconUrl: "${yesc(ach.iconUrl)}"`,
				`raPercent: ${ach.percent === null ? '""' : ach.percent}`,
				`raSet: "${yesc(ach.setType)}"`,
				`raSetTitle: "${yesc(game.title)}"`,
				`raSetKind: "${setKind}"`,
				`raDisplayOrder: ${Number(ach.displayOrder) || 0}`,
				`dateAdded: ${today}`,
				"cssclasses: [steamvault, sv-achievement]",
				"---",
				"",
				...customJS.SteamVaultCore.noteBody("achievement").split("\n")
			].join("\n");
			await app.vault.create(path, content);
			created += 1;
		}

		// guarda o vínculo do jogo com o RA, para reimportações futuras.
		// Importar um Subset NÃO troca o Game ID principal do jogo (antes
		// trocava, e a próxima atualização passava a buscar só o subset):
		// o subset entra na lista raSubsetIds.
		try {
			const trueGameFile = app.vault.getAbstractFileByPath(gameFileRef.path);
			if (trueGameFile) await app.fileManager.processFrontMatter(trueGameFile, fm => this._raLinkSetToGame(fm, game.id, setKind));
		} catch (_) { /* não crítico */ }

		return { game, created, updated, total: game.achievements.length };
	}

	// -------------------------------------------------- painel de config
	// Vive na aba RetroAchievements (Dashboard/RetroAchievements) — um
	// espaço só dela, separado do resto das configurações da biblioteca.
	// raProfileHeader() monta o perfil (avatar, nome, rank, pontos);
	// raSettingsPanel() é a configuração da chave em si, usada por todas
	// as fichas de jogo na hora de importar.

	// -------------------------------------------------- form na ficha do jogo
	raImportForm() {
		return `<div class="svl-add-wrap svl-add-wrap-sm">
			<button type="button" class="svl-add-btn svl-add-btn-sm" id="svl-ra-toggle">
				<span class="svl-add-btn-icon">🔗</span> Importar do RetroAchievements
			</button>
			<div class="svl-form" id="svl-ra-form">
				<div class="svl-form-inner">
					<p class="svl-empty-hint">Informe o Game ID do RetroAchievements (o número na URL da página do jogo). Não é preciso login.</p>
					<div class="svl-field">
						<label for="svl-ra-gameid">Game ID</label>
						<input type="number" class="svl-input" id="svl-ra-gameid" min="1" placeholder="Ex: 14402">
					</div>
					<div class="svl-form-actions">
						<button type="button" class="svl-btn-ghost" id="svl-ra-cancel">Cancelar</button>
						<button type="button" class="svl-btn-primary" id="svl-ra-submit">Importar</button>
					</div>
					<div class="svl-form-msg" id="svl-ra-msg"></div>
				</div>
			</div>
		</div>`;
	}

	wireRaImportForm(root, gamePage) {
		const toggleBtn = root.querySelector("#svl-ra-toggle");
		const form = root.querySelector("#svl-ra-form");
		const cancelBtn = root.querySelector("#svl-ra-cancel");
		const submitBtn = root.querySelector("#svl-ra-submit");
		const input = root.querySelector("#svl-ra-gameid");
		const msg = root.querySelector("#svl-ra-msg");
		if (!toggleBtn || !form) return;

		const openForm = () => { form.classList.add("is-open"); toggleBtn.classList.add("is-open"); form.style.maxHeight = (form.scrollHeight + 40) + "px"; };
		const closeForm = () => { form.style.maxHeight = "0px"; form.classList.remove("is-open"); toggleBtn.classList.remove("is-open"); };
		toggleBtn.addEventListener("click", () => form.classList.contains("is-open") ? closeForm() : openForm());
		cancelBtn?.addEventListener("click", closeForm);

		submitBtn?.addEventListener("click", async () => {
			if (!this.raHasApiKey()) {
				msg.textContent = "Configure sua Web API Key na aba RetroAchievements antes de importar.";
				msg.className = "svl-form-msg is-error";
				return;
			}
			const gameId = input?.value?.trim();
			if (!gameId) {
				msg.textContent = "Informe o Game ID do RetroAchievements.";
				msg.className = "svl-form-msg is-error";
				return;
			}
			submitBtn.disabled = true;
			msg.textContent = "Importando…";
			msg.className = "svl-form-msg";
			try {
				const result = await this.raImportGame(gamePage, gameId);
				msg.textContent = `"${result.game.title}": ${customJS.SteamVaultUI.plural(result.created, "conquista nova", "conquistas novas")}, ${customJS.SteamVaultUI.plural(result.updated, "atualizada", "atualizadas")} de ${result.total}.`;
				msg.className = "svl-form-msg is-success";
				if (input) input.value = "";
			} catch (err) {
				console.error("Game Library: falha ao importar do RetroAchievements.", err);
				msg.textContent = err?.message || "Não foi possível importar. Veja o console.";
				msg.className = "svl-form-msg is-error";
			} finally {
				submitBtn.disabled = false;
			}
		});
	}

	// ------------------------------------------------ formulário: novo jogo
	addGameForm(platforms) {
		const platformOptions = (platforms || this.platformOrder).map(p => `<option value="${this.esc(p)}">${this.esc(p)}</option>`).join("");
		const statusOptions = this.statusOptions.map(([v, l]) => `<option value="${this.esc(v)}">${this.esc(l)}</option>`).join("");
		return `<div class="svl-add-wrap">
			<button type="button" class="svl-add-btn" id="svl-add-toggle">
				<span class="svl-add-btn-icon">+</span> Adicionar jogo
			</button>
			<div class="svl-form" id="svl-add-form">
				<div class="svl-form-inner">
					${this.formSec("Essencial", `
						<div class="svl-field">
							<label for="svl-f-title">Nome do jogo *</label>
							<input type="text" class="svl-input" id="svl-f-title" placeholder="Ex: Hollow Knight" autocomplete="off" enterkeyhint="next">
						</div>
						<div class="svl-field-grid svl-field-grid--2">
							<div class="svl-field"><label for="svl-f-platform">Plataforma</label>
								<select class="svl-input" id="svl-f-platform">${platformOptions}</select></div>
							<div class="svl-field"><label for="svl-f-status">Status</label>
								<select class="svl-input" id="svl-f-status">${statusOptions}</select></div>
						</div>`, { icon: "gamepad", sub: "O mínimo para a ficha existir" })}
					${this.formSec("Conquistas", `
						${this._achFieldsHtml("svl-f-ach", "steam", "automatic")}
						<div class="svl-field svl-lookup" id="svl-steam-lookup-wrap">
							<div class="svl-lookup-row">
								<button type="button" class="svl-btn-ghost" id="svl-f-steam-lookup">🔎 Identificar jogo na Steam</button>
								<span id="svl-f-steam-selected" class="svl-lookup-state">Nenhum jogo Steam identificado ainda.</span>
							</div>
							<div id="svl-f-steam-msg" class="svl-form-msg"></div>
						</div>`, { icon: "trophy", sub: "De onde vem o progresso e como ele é atualizado" })}
					${this.formSec("Detalhes", `
						<div class="svl-field-grid">
							${this._franchiseFieldsHtml("svl-f-franchise")}
							<div class="svl-field"><label for="svl-f-year">Ano de lançamento</label>
								<input type="number" class="svl-input" id="svl-f-year" placeholder="Ex: 2017" inputmode="numeric"></div>
							<div class="svl-field"><label for="svl-f-releasedate">Data de lançamento (opcional)</label>
								<input type="date" class="svl-input" id="svl-f-releasedate"></div>
							<div class="svl-field"><label for="svl-f-developer">Desenvolvedora</label>
								<input type="text" class="svl-input" id="svl-f-developer" placeholder="Ex: Remedy" autocomplete="off"></div>
							<div class="svl-field"><label for="svl-f-publisher">Publicadora</label>
								<input type="text" class="svl-input" id="svl-f-publisher" placeholder="Ex: Xbox Game Studios" autocomplete="off"></div>
							<div class="svl-field"><label for="svl-f-genre">Gêneros</label>
								<input type="text" class="svl-input" id="svl-f-genre" placeholder="Plataforma, RPG" autocomplete="off"></div>
							<div class="svl-field"><label for="svl-f-subgenre">Subgêneros</label>
								<input type="text" class="svl-input" id="svl-f-subgenre" placeholder="Metroidvania, Souls-like" autocomplete="off"></div>
							<div class="svl-field"><label for="svl-f-hours">Horas jogadas</label>
								<input type="number" class="svl-input" id="svl-f-hours" value="0" inputmode="decimal"></div>
							<div class="svl-field"><label for="svl-f-price">Preço pago (R$)</label>
								<input type="number" class="svl-input" id="svl-f-price" min="0" step="0.01" placeholder="0,00" inputmode="decimal"></div>
							<div class="svl-field"><label for="svl-f-rating">Sua nota (0 a 5, opcional)</label>
								<input type="number" class="svl-input" id="svl-f-rating" min="0" max="5" step="0.5" placeholder="Ex: 4,5" inputmode="decimal"></div>
						</div>`, { icon: "list", sub: "Saga, lançamento, estúdio, gêneros, tempo e nota" })}
					${this.formSec("Imagens", `
						${this.imagePickerField({ id: "svl-f-cover", label: "Capa do card" })}
						${this.imagePickerField({ id: "svl-f-cover-ficha", label: "Capa da ficha", placeholder: "Vazio = usa a capa do card acima" })}
						${this.imagePickerField({ id: "svl-f-background", label: "Fundo da ficha", hint: "Vazio = usa a imagem de destaque ou a capa" })}
						${this.imagePickerField({ id: "svl-f-featured", label: "Imagem de destaque", hint: "Cards de destaque. Vazio = usa o fundo da ficha ou a capa" })}`, { icon: "image", sub: "Opcional. Com um AppID da Steam, as artes podem ser baixadas depois", fold: true, open: false })}
					${this.formSec("Sinopse", `
						<div class="svl-field">
							<textarea class="svl-textarea" id="svl-f-summary" rows="4" placeholder="Do que se trata o jogo?"></textarea>
						</div>`, { icon: "edit" })}
					${this.formSec("Observações", `
						<div class="svl-field">
							<textarea class="svl-textarea" id="svl-f-notes" rows="3" placeholder="Onde parou, dicas, com quem joga… (opcional)"></textarea>
						</div>`, { icon: "notebook", sub: "Vira a primeira nota da aba Notas" })}

					<div class="svl-form-actions">
						<button type="button" class="svl-btn-ghost" id="svl-f-cancel">Cancelar</button>
						<button type="button" class="svl-btn-primary" id="svl-f-submit">Criar jogo</button>
					</div>
					<div class="svl-form-msg" id="svl-f-msg"></div>
				</div>
			</div>
		</div>`;
	}

	/* ======================================================================
	   ABA PLATAFORMAS — CARTÃO DE CONSOLE
	   Evolução da platformShelfRow() (que continua existindo, intacta):
	   mesma lista vertical e escaneável, agora com
	     · fabricante e tipo (Sony · Portátil) para as plataformas conhecidas
	     · barra segmentada por status (zerado, platinado, jogando…)
	     · conquistas da plataforma, quando houver
	     · parcela da biblioteca e as capas dos jogos mais recentes
	   Tudo é calculado na hora a partir das fichas: nada é gravado.
	   ====================================================================== */

	/* ======================================================================
	   HOME — FAIXA DE ABERTURA
	   Um bloco só, no topo, que responde "o que eu estava fazendo?" antes
	   de qualquer prateleira: saudação, ritmo recente (sessões dos últimos
	   7 e 30 dias) e o jogo em que você tocou por último, com o progresso
	   dele. Tudo vem das fichas; nada é gravado.
	   ====================================================================== */

	/* ======================================================================
	   ORDENAÇÃO GENÉRICA DE CARTÕES
	   Barra de botões (mesmo desenho do filtro da aba Conquistas) que só
	   REORDENA os elementos já desenhados, lendo data-* de cada cartão.
	   Usada em Plataformas, Gêneros e Coleções. A escolha fica lembrada
	   por página enquanto o Obsidian estiver aberto.
	   ====================================================================== */

	// O Dataview devolve DataArray (não é Array de verdade: tem map e
	// filter, mas não tem reduce). Tudo que entra nas funções abaixo passa
	// por aqui primeiro, para a mesma função aceitar os dois formatos.
	_asArray(value) {
		if (Array.isArray(value)) return value;
		if (value && typeof value.array === "function") return value.array();
		if (value && typeof value[Symbol.iterator] === "function" && typeof value !== "string") return [...value];
		return value === null || value === undefined ? [] : [value];
	}

	/* ======================================================================
	   ABA GÊNEROS — CARTÃO DE GÊNERO
	   Substitui o cartão genérico (categoryCard, que continua existindo)
	   só nesta aba. Sem imagem própria, o gênero usa um mosaico com as
	   capas dos seus jogos — nunca mais um quadro vazio com uma letra.
	   ====================================================================== */

	/* ======================================================================
	   ABA COLEÇÕES
	   Cartão de coleção com arte (capa própria ou mosaico dos jogos), cor
	   de destaque da própria coleção (campo accent) e progresso; coleções
	   inteligentes viram blocos compactos que abrem uma prateleira de cada
	   vez — antes eram sete prateleiras cheias empilhadas.
	   ====================================================================== */

	/* ======================================================================
	   ABA ESTATÍSTICAS
	   ====================================================================== */

	// "banner de saga" pra uma franquia — identidade própria da aba
	// Franquias: faixa de anos, e uma linha do tempo em pontinhos (um por
	// jogo, na ordem de lançamento, colorido pelo status de conclusão)
	/* ----------------------------------------------------------------------
	   ESTATÍSTICAS COMBINADAS DE UMA FRANQUIA
	   Soma os jogos da saga num único retrato. A regra que exige atenção
	   é a das conquistas: jogos marcados como "Sem conquistas" entram nas
	   horas e na contagem de concluídos, mas NÃO entram no denominador do
	   progresso de conquistas. Contá-los como 0/0 seria inofensivo, mas
	   contá-los como jogos "sem nada destravado" puxaria a porcentagem da
	   franquia para baixo por um motivo que não existe — o jogo não tem
	   troféus para destravar.
	   ---------------------------------------------------------------------- */

	// cria (se ainda não existir) a nota de uma categoria — gênero ou
	// plataforma — para que ela possa ter imagem própria e página dedicada
	async ensureCategoryNote(kind, name) {
		// fonte única: o Core não duplica a página quando o nome muda só em
		// maiúsculas ou acentos ("Ação" e "acao" são a mesma)
		const file = await customJS.SteamVaultCore.ensureCategoryNote(kind === "genre" ? "genre" : "platform", name);
		return file?.path;
	}

	// 3.62.0: seção de formulário (título, apoio e corpo). "fold" vira um
	// <details> recolhível com um resumo do que já está preenchido. Só
	// reorganiza a apresentação: ids e eventos dos campos não mudam
	formSec(title, body, { icon = "", sub = "", fold = false, open = true, summary = "", id = "" } = {}) {
		const U = customJS.SteamVaultUI;
		const ic = icon && U?.icon ? `<span class="svl-sec-icon">${U.icon(icon)}</span>` : "";
		const head = `${ic}<span class="svl-sec-text"><span class="svl-sec-title">${this.esc(title)}</span>${sub ? `<span class="svl-sec-sub">${this.esc(sub)}</span>` : ""}</span>`;
		const idAttr = id ? ` data-sec="${this.esc(id)}"` : "";
		if (!fold) return `<section class="svl-sec"${idAttr}><header class="svl-sec-head">${head}</header><div class="svl-sec-body">${body}</div></section>`;
		return `<details class="svl-sec svl-sec--fold"${idAttr}${open ? " open" : ""}><summary class="svl-sec-head">${head}${summary ? `<span class="svl-sec-summary">${this.esc(summary)}</span>` : ""}<span class="svl-sec-chev" aria-hidden="true"></span></summary><div class="svl-sec-body">${body}</div></details>`;
	}

	// liga os eventos do formulário depois que o HTML já está no DOM.
	// Cria a nota de verdade via app.vault.create — sem precisar de
	// Templater nem de copiar templates manualmente.
	wireAddGameForm(root) {
		const toggleBtn = root.querySelector("#svl-add-toggle");
		const form = root.querySelector("#svl-add-form");
		const cancelBtn = root.querySelector("#svl-f-cancel");
		const submitBtn = root.querySelector("#svl-f-submit");
		const msg = root.querySelector("#svl-f-msg");
		if (!toggleBtn || !form) return;

		this.wireImagePicker(root, "svl-f-cover", { folder: this.folders.coverAssets, baseName: () => root.querySelector("#svl-f-title")?.value || "capa" });
		this.wireImagePicker(root, "svl-f-cover-ficha", { folder: this.folders.coverAssets, baseName: () => (root.querySelector("#svl-f-title")?.value || "capa") + "-ficha" });
		this.wireImagePicker(root, "svl-f-background", { folder: this.folders.backgroundAssets, baseName: () => (root.querySelector("#svl-f-title")?.value || "fundo") + "-fundo" });
		this.wireImagePicker(root, "svl-f-featured", { folder: this.folders.featuredAssets, baseName: () => (root.querySelector("#svl-f-title")?.value || "destaque") + "-destaque" });

		const openForm = () => {
			form.classList.add("is-open");
			toggleBtn.classList.add("is-open");
			form.style.maxHeight = (form.scrollHeight + 40) + "px";
		};
		const closeForm = () => {
			form.style.maxHeight = "0px";
			form.classList.remove("is-open");
			toggleBtn.classList.remove("is-open");
		};

		toggleBtn.addEventListener("click", () => {
			form.classList.contains("is-open") ? closeForm() : openForm();
		});
		cancelBtn?.addEventListener("click", closeForm);

		const steamLookupBtn = root.querySelector("#svl-f-steam-lookup");
		const steamSelected = root.querySelector("#svl-f-steam-selected");
		const steamMsg = root.querySelector("#svl-f-steam-msg");
		let selectedSteam = null;

		const clearSteamSelection = () => {
			selectedSteam = null;
			if (steamSelected) steamSelected.textContent = "Nenhum jogo Steam identificado ainda.";
		};

		// "Identificar na Steam" só faz sentido com origem Steam
		this._wireFranchise(root, "svl-f-franchise");
		const getAch = this._wireAchFields(root, "svl-f-ach", ({ provider }) => {
			const isSteam = provider === "steam";
			const lookupWrap = root.querySelector("#svl-steam-lookup-wrap");
			if (lookupWrap) lookupWrap.style.display = isSteam ? "" : "none";
			if (!isSteam) clearSteamSelection();
		});
		// 3.70.0: escolher um console Xbox troca a origem das conquistas para
		// Xbox (se você ainda não escolheu outra). Ao criar, a ficha já abre com
		// o assistente de conquistas (busca nas fontes + texto colado)
		const provSel = root.querySelector("#svl-f-ach-provider");
		let provTouched = false;
		provSel?.addEventListener("change", e => { if (e.isTrusted) provTouched = true; });
		root.querySelector("#svl-f-platform")?.addEventListener("change", e => {
			if (!provSel || provTouched || !/\bxbox\b/i.test(e.target.value)) return;
			provSel.value = "xbox"; provSel.dispatchEvent(new Event("change"));
		});

		const val = id => (root.querySelector(id)?.value || "").trim();
		const runSteamLookup = async () => {
			const title = val("#svl-f-title");
			const year = val("#svl-f-year");
			if (!title) {
				if (steamMsg) { steamMsg.textContent = "Digite o nome do jogo primeiro."; steamMsg.className = "svl-form-msg is-error"; }
				return;
			}
			clearSteamSelection();
			if (steamLookupBtn) steamLookupBtn.disabled = true;
			if (steamMsg) { steamMsg.textContent = "Consultando a Steam…"; steamMsg.className = "svl-form-msg"; }
			try {
				const result = await this.findSteamApp(title, { year });
				selectedSteam = result;
				if (steamSelected) steamSelected.textContent = `✅ ${result.name}${result.releaseYear ? ` (${result.releaseYear})` : ""} · AppID ${result.appid}`;
				if (steamMsg) { steamMsg.textContent = "Jogo Steam identificado. As conquistas serão importadas ao criar a ficha."; steamMsg.className = "svl-form-msg is-success"; }
			} catch (err) {
				console.error("Game Library: falha ao identificar jogo Steam", err);
				if (steamMsg) { steamMsg.textContent = err?.message || "Não foi possível identificar o jogo na Steam."; steamMsg.className = "svl-form-msg is-error"; }
			} finally {
				if (steamLookupBtn) steamLookupBtn.disabled = false;
			}
		};

		steamLookupBtn?.addEventListener("click", runSteamLookup);
		["#svl-f-title", "#svl-f-year"].forEach(id => root.querySelector(id)?.addEventListener("input", clearSteamSelection));

		submitBtn?.addEventListener("click", async () => {
			const title = val("#svl-f-title");
			if (!title) {
				msg.textContent = "Dê um nome ao jogo antes de continuar.";
				msg.className = "svl-form-msg is-error";
				return;
			}
			submitBtn.disabled = true;
			msg.textContent = "Criando…";
			msg.className = "svl-form-msg";

			const platform = val("#svl-f-platform");
			const status = val("#svl-f-status");
			const ach = getAch();
			const franchise = this._franchiseValue(root, "svl-f-franchise");
			if (root.querySelector('#svl-f-franchise-has [data-value="yes"].is-active') && !franchise) { submitBtn.disabled = false; msg.textContent = "Escolha a franquia ou marque Não."; msg.className = "svl-form-msg is-error"; return; }
			const franchiseOrder = franchise ? val("#svl-f-franchise-order") : "";
			const genre = val("#svl-f-genre").split(",").map(s => s.trim()).filter(Boolean);
			const subgenre = val("#svl-f-subgenre").split(",").map(s => s.trim()).filter(Boolean);
			const year = val("#svl-f-year");
			const releaseDate = customJS.SteamVaultCore.iso(val("#svl-f-releasedate"));
			const developer = val("#svl-f-developer"), publisher = val("#svl-f-publisher");
			const rating = Math.min(5, Math.max(0, customJS.SteamVaultCore.num(val("#svl-f-rating")) || 0));
			const hours = Number(val("#svl-f-hours")) || 0;
			const price = Math.max(0, Number(val("#svl-f-price")) || 0);
			const cover = val("#svl-f-cover");
			const coverFicha = val("#svl-f-cover-ficha");
			const background = val("#svl-f-background");
			const featured = val("#svl-f-featured");
			const summary = val("#svl-f-summary");
			const obs = val("#svl-f-notes");

			try {
				const yesc = s => this.yamlEscape(s);
				// jogos novos nascem organizados numa subpasta da própria
				// plataforma (Games/PSP/, Games/3DS/, etc.) — jogos antigos na
				// raiz de Games/ continuam funcionando normalmente
				const platformFolderName = this.safeName(platform, "Outros");
				const folder = `${this.folders.games}/${platformFolderName}`;
				await this.ensureFolder(folder);
				const safeName = this.safeName(title, "Novo Jogo");
				let path = `${folder}/${safeName}.md`;
				let n = 1;
				while (app.vault.getAbstractFileByPath(path)) {
					n += 1;
					path = `${folder}/${safeName} ${n}.md`;
				}
				const today = customJS.SteamVaultCore.today();
				const genreYaml = genre.length ? `[${genre.map(g => `"${yesc(g)}"`).join(", ")}]` : "[]";
				const subgenreYaml = subgenre.length ? `[${subgenre.map(g => `"${yesc(g)}"`).join(", ")}]` : "[]";

				if (franchise) await customJS.SteamVaultCore.ensureCategoryNote("franchise", franchise).catch(() => {});
				const content = customJS.SteamVaultCore.buildGameNote({
					title, platform, franchise,
					franchiseOrder: Number(franchiseOrder) > 0 ? Number(franchiseOrder) : "",
					genre, subgenre, status,
					achievementProvider: ach.provider, achievementSync: ach.sync,
					// 3.66.0: o AppID identificado já vai na ficha (antes só era
					// gravado depois que as conquistas importavam; se a importação
					// falhasse, a identificação se perdia)
					steamAppId: ach.provider === "steam" && selectedSteam?.appid ? String(selectedSteam.appid) : "",
					cover, coverFicha, background, featured,
					hoursPlayed: Number(hours) || 0, price: Number(price) || "",
					releaseYear: year ? Number(year) : (releaseDate ? Number(releaseDate.slice(0, 4)) : ""), summary,
					// 3.70.0: cadastro manual completo numa tela só
					releaseDate, developer, publisher, rating, notes: obs ? [obs] : []
				});

				await app.vault.create(path, content);

				// A lista de conquistas é importada para origem Steam (em qualquer
				// sincronização); o progresso real só com sincronização Automática.
				// Se a fonte externa falhar, o jogo continua sendo criado normalmente.
				if (ach.provider === "steam") {
					msg.textContent = `"${title}" criado. Buscando conquistas na Steam…`;
					msg.className = "svl-form-msg";
					try {
						const freshFile = app.vault.getAbstractFileByPath(path);
						if (!freshFile) throw new Error("A ficha recém-criada não foi encontrada.");
						const gamePage = app.metadataCache.getFileCache(freshFile)?.frontmatter
							? { ...app.metadataCache.getFileCache(freshFile).frontmatter, file: freshFile, title }
							: { file: freshFile, title };
						const imported = await this.importSteamAchievements(gamePage, selectedSteam?.appid || "", { year });
						await app.fileManager.processFrontMatter(freshFile, fm => {
							fm.steamAppId = String(imported.appid);
							fm.achievementsTotal = Number(imported.total) || 0;
							fm.achievementsEarned = 0;
						});
						msg.textContent = `"${title}" criado e ${customJS.SteamVaultUI.plural(imported.created, "conquista importada", "conquistas importadas")}! Abrindo a ficha…`;
						msg.className = "svl-form-msg is-success";
					} catch (importErr) {
						console.error("Game Library: falha ao importar conquistas da Steam", importErr);
						msg.textContent = `"${title}" foi criado, mas não consegui importar as conquistas automaticamente.`;
						msg.className = "svl-form-msg is-error";
					}
					// estado REAL do perfil (páginas públicas da Steam Community)
					try {
						const S = customJS.SteamVaultSteam;
						const f = app.vault.getAbstractFileByPath(path);
						if (f && ach.sync === "automatic" && S.getConfig().configured) setTimeout(() => S.syncGame(f, { force: true }).catch(() => {}), 1200);
					} catch (_) {}
				} else {
					msg.textContent = `"${title}" foi criado! Abrindo a ficha…`;
					msg.className = "svl-form-msg is-success";
				}

				form.querySelectorAll("input, textarea").forEach(el => { el.value = el.type === "number" ? "0" : ""; });

				// 3.74.0: jogo de Xbox abre a ficha já no cadastro em lote das conquistas
				if (ach.provider === "xbox") window.__svAchBulkNext = path;
				setTimeout(() => {
					app.workspace.openLinkText(path, "", false);
				}, 500);
			} catch (err) {
				console.error("Game Library: falha ao criar jogo", err);
				msg.textContent = "Não foi possível criar o jogo. Veja o console para detalhes.";
				msg.className = "svl-form-msg is-error";
			} finally {
				submitBtn.disabled = false;
			}
		});
	}

	// -------------------------------------------------- editar detalhes do jogo
	// painel separado do de capa/fundo — cobre tudo que é texto/seleção
	// campo de "chips" com botão de adicionar + sugestão automática — usado
	// pra gênero e subgênero, mas genérico o bastante pra outros campos de
	// lista no futuro. Mantém um input escondido com os valores separados
	// por vírgula, pra não precisar mudar a lógica de salvar já existente.
	tagChipField({ idPrefix, label, values = [], suggestions = [], placeholder = "" }) {
		const chips = values.map((v, i) => `<span class="svl-tagchip" data-index="${i}">${this.esc(v)}<button type="button" class="svl-tagchip-remove" data-index="${i}" title="Remover">✕</button></span>`).join("");
		const datalistId = `${idPrefix}-list`;
		const datalistOptions = suggestions.map(s => `<option value="${this.esc(s)}"></option>`).join("");
		return `<div class="svl-field">
			<label for="${idPrefix}-add">${this.esc(label)}</label>
			<input type="hidden" id="${idPrefix}-hidden" value="${this.esc(values.join(", "))}">
			<div class="svl-tagchip-list" id="${idPrefix}-chips">${chips}</div>
			<div class="svl-tagchip-add-row">
				<input type="text" class="svl-input" id="${idPrefix}-add" list="${datalistId}" placeholder="${this.esc(placeholder)}">
				<datalist id="${datalistId}">${datalistOptions}</datalist>
				<button type="button" class="svl-add-btn-sm svl-tagchip-addbtn" id="${idPrefix}-addbtn">+ Adicionar</button>
			</div>
		</div>`;
	}

	wireTagChipField(root, idPrefix) {
		const hidden = root.querySelector(`#${idPrefix}-hidden`);
		const chipList = root.querySelector(`#${idPrefix}-chips`);
		const addInput = root.querySelector(`#${idPrefix}-add`);
		const addBtn = root.querySelector(`#${idPrefix}-addbtn`);
		if (!hidden || !chipList) return;

		const getValues = () => hidden.value.split(",").map(s => s.trim()).filter(Boolean);
		const render = values => {
			hidden.value = values.join(", ");
			chipList.innerHTML = values.map((v, i) => `<span class="svl-tagchip" data-index="${i}">${this.esc(v)}<button type="button" class="svl-tagchip-remove" data-index="${i}" title="Remover">✕</button></span>`).join("");
			this._svgifyIcons(chipList);
			chipList.querySelectorAll(".svl-tagchip-remove").forEach(btn => {
				btn.addEventListener("click", () => {
					const idx = Number(btn.dataset.index);
					const next = getValues();
					next.splice(idx, 1);
					render(next);
				});
			});
		};
		render(getValues());

		const addValue = () => {
			const v = addInput.value.trim();
			if (!v) return;
			const next = getValues();
			if (!next.some(x => x.toLowerCase() === v.toLowerCase())) next.push(v);
			render(next);
			addInput.value = "";
			addInput.focus();
		};
		addBtn?.addEventListener("click", addValue);
		addInput?.addEventListener("keydown", e => {
			if (e.key === "Enter") { e.preventDefault(); addValue(); }
		});
	}

	// (franquia, gêneros, subgêneros, plataforma, status, etc.)
	gameDetailsEditPanel(p, platforms, knownGenres = [], knownSubgenres = []) {
		let platformList = platforms || this.platformOrder;
		if (p.platform && !platformList.includes(p.platform)) platformList = [...platformList, p.platform];
		const platformOptions = platformList.map(pl =>
			`<option value="${this.esc(pl)}"${pl === p.platform ? " selected" : ""}>${this.esc(pl)}</option>`).join("");
		const statusOptions = this.statusOptions.map(([v, l]) =>
			`<option value="${this.esc(v)}"${v === p.status ? " selected" : ""}>${this.esc(l)}</option>`).join("");
		const priorityOptions = ["", "Baixa", "Média", "Alta"].map(pr =>
			`<option value="${this.esc(pr)}"${pr === (p.priority || "") ? " selected" : ""}>${pr || "—"}</option>`).join("");
		const C = customJS.SteamVaultCore, provider = C.achievementProvider(p), sync = C.achievementSync(p, provider);

		return `<div class="svl-cover-edit-wrap">
			<button type="button" class="svl-edit-cover-btn" id="svl-de-toggle">
				<span class="svl-edit-btn-icon">✏️</span>
				<span class="svl-edit-btn-text"><strong>Editar detalhes</strong><small>Plataforma, status, gêneros, preço e mais</small></span>
				<span class="svl-edit-btn-chevron">›</span>
			</button>
			<div class="svl-form" id="svl-de-form">
				<div class="svl-form-inner">
					${this.formSec("Essencial", `
						<div class="svl-field-grid">
							<div class="svl-field"><label for="svl-de-platform">Plataforma</label>
							<select class="svl-input" id="svl-de-platform">${platformOptions}</select></div>
							<div class="svl-field"><label for="svl-de-status">Status</label>
							<select class="svl-input" id="svl-de-status">${statusOptions}</select></div>
							${this._franchiseFieldsHtml("svl-de-franchise", p.franchise || "", p.franchiseOrder ?? "")}
							<div class="svl-field"><label for="svl-de-year">Ano de lançamento</label>
							<input type="number" class="svl-input" id="svl-de-year" value="${this.esc(p.releaseYear || "")}"></div>
							<div class="svl-field"><label for="svl-de-releasedate">Data de lançamento (opcional)</label>
							<input type="date" class="svl-input" id="svl-de-releasedate" value="${this.esc(this.dateISO(p.releaseDate) || "")}"></div>
							<div class="svl-field"><label for="svl-de-developer">Desenvolvedora</label>
							<input type="text" class="svl-input" id="svl-de-developer" value="${this.esc(p.developer || "")}"></div>
							<div class="svl-field"><label for="svl-de-publisher">Publicadora</label>
							<input type="text" class="svl-input" id="svl-de-publisher" value="${this.esc(p.publisher || "")}"></div>
						</div>`, { icon: "gamepad", sub: "Plataforma, status, saga e quem fez o jogo" })}
					${this.formSec("Gêneros e etiquetas", `
						${this.tagChipField({ idPrefix: "svl-de-genre", label: "Gêneros", values: p.genre || [], suggestions: knownGenres, placeholder: "Ex: Ação" })}
						${this.tagChipField({ idPrefix: "svl-de-subgenre", label: "Subgêneros", values: p.subgenre || [], suggestions: knownSubgenres, placeholder: "Ex: Metroidvania" })}
						<div class="svl-field">
						<label for="svl-de-labels">Etiquetas livres</label>
						<input type="text" class="svl-input" id="svl-de-labels" value="${this.esc((p.labels || []).join(", "))}" placeholder="co-op, difícil, de boa pra jogar cansado">
					</div>`, { icon: "tag", sub: "Organizam a Biblioteca, os filtros e as páginas de gênero" })}
					${this.formSec("Progresso", `
						<div class="svl-field-grid">
							<div class="svl-field"><label for="svl-de-hours">Horas jogadas</label>
							<input type="number" class="svl-input" id="svl-de-hours" value="${this.esc(p.hoursPlayed || 0)}"></div>
							<div class="svl-field"><label for="svl-de-esthours">Tempo estimado p/ zerar (h)</label>
							<input type="number" class="svl-input" id="svl-de-esthours" min="0" value="${this.esc(p.estimatedHours || "")}"></div>
							<div class="svl-field"><label for="svl-de-startdate">Data de início</label>
							<input type="date" class="svl-input" id="svl-de-startdate" value="${this.esc(this.dateISO(p.startDate) || "")}"></div>
							<div class="svl-field"><label for="svl-de-completiondate">Data de conclusão</label>
							<input type="date" class="svl-input" id="svl-de-completiondate" value="${this.esc(this.dateISO(p.completionDate) || "")}"></div>
						</div>`, { icon: "clock", sub: "Tempo de jogo e datas" })}
					${this.formSec("Avaliação", `
						<div class="svl-field-grid">
							<div class="svl-field"><label for="svl-de-rating">Avaliação geral (0–5)</label>
							<input type="number" class="svl-input" id="svl-de-rating" min="0" max="5" value="${this.esc(p.rating || 0)}"></div>
						</div>
						<details class="svl-subfold"${[p.ratingGameplay, p.ratingStory, p.ratingGraphics, p.ratingSoundtrack, p.ratingFun].some(v => v !== undefined && v !== null && v !== "") ? " open" : ""}>
							<summary>Avaliação por categoria</summary>
							<div class="svl-form-grid">
							<div class="svl-field"><label for="svl-de-rating-gameplay">Gameplay (0–5, opcional)</label>
							<input type="number" class="svl-input" id="svl-de-rating-gameplay" min="0" max="5" value="${this.esc(p.ratingGameplay ?? "")}"></div>
						<div class="svl-field"><label for="svl-de-rating-story">História (0–5, opcional)</label>
							<input type="number" class="svl-input" id="svl-de-rating-story" min="0" max="5" value="${this.esc(p.ratingStory ?? "")}"></div>
						<div class="svl-field"><label for="svl-de-rating-graphics">Gráficos (0–5, opcional)</label>
							<input type="number" class="svl-input" id="svl-de-rating-graphics" min="0" max="5" value="${this.esc(p.ratingGraphics ?? "")}"></div>
						<div class="svl-field"><label for="svl-de-rating-soundtrack">Trilha sonora (0–5, opcional)</label>
							<input type="number" class="svl-input" id="svl-de-rating-soundtrack" min="0" max="5" value="${this.esc(p.ratingSoundtrack ?? "")}"></div>
						<div class="svl-field"><label for="svl-de-rating-fun">Fator diversão (0–5, opcional)</label>
							<input type="number" class="svl-input" id="svl-de-rating-fun" min="0" max="5" value="${this.esc(p.ratingFun ?? "")}"></div>
							</div>
						</details>`, { icon: "star", sub: "Sua nota de 0 a 5" })}
					${this.formSec("Conquistas", `
						${this._achFieldsHtml("svl-de-ach", provider, sync)}`, { icon: "trophy", fold: true, open: false, summary: [C.providerDefs?.[provider]?.label || provider, C.syncDefs?.[sync]?.label || sync].filter(Boolean).join(" · ") })}
					${this.formSec("Compra e lista de desejos", `
						<div class="svl-field-grid">
							<div class="svl-field"><label for="svl-de-price">Preço pago (R$)</label>
							<input type="number" class="svl-input" id="svl-de-price" min="0" step="0.01" value="${this.esc(p.price || 0)}"></div>
							<div class="svl-field"><label for="svl-de-ownership">Propriedade</label>
							<select class="svl-input" id="svl-de-ownership">
								<option value=""${!p.ownership ? " selected" : ""}>—</option>
								<option value="Digital"${p.ownership === "Digital" ? " selected" : ""}>Digital</option>
								<option value="Físico"${p.ownership === "Físico" ? " selected" : ""}>Físico</option>
							</select></div>
							<div class="svl-field"><label for="svl-de-priority">Prioridade (backlog)</label>
							<select class="svl-input" id="svl-de-priority">${priorityOptions}</select></div>
							<div class="svl-field"><label for="svl-de-targetprice">Preço-alvo p/ comprar (R$)</label>
							<input type="number" class="svl-input" id="svl-de-targetprice" min="0" step="0.01" value="${this.esc(p.targetPrice || "")}" placeholder="Ex: 49.90"></div>
						</div>
						<div class="svl-field">
						<label for="svl-de-buylink">Link para comprar (wishlist)</label>
						<input type="text" class="svl-input" id="svl-de-buylink" value="${this.esc(p.buyLink || "")}" placeholder="https://...">
					</div>
						<div class="svl-field">
						<label for="svl-de-wishreason">Por que quero (wishlist, opcional)</label>
						<input type="text" class="svl-input" id="svl-de-wishreason" value="${this.esc(p.wishlistReason || "")}" placeholder="Ex: recomendação de um amigo, ficou em promoção">
					</div>`, { icon: "coins", fold: true, open: false, summary: [Number(p.price) > 0 ? `R$ ${String(p.price).replace(".", ",")}` : "", p.ownership || "", p.priority ? `Prioridade ${p.priority}` : ""].filter(Boolean).join(" · ") })}
					${this.formSec("Sinopse", `
						<div class="svl-field">
							<textarea class="svl-textarea" id="svl-de-summary" rows="5">${this.esc(p.summary || "")}</textarea>
						</div>`, { icon: "edit" })}

					<div class="svl-form-actions">
						<button type="button" class="svl-btn-ghost" id="svl-de-cancel">Cancelar</button>
						<button type="button" class="svl-btn-primary" id="svl-de-save">Salvar</button>
					</div>
					<div class="svl-form-msg" id="svl-de-msg"></div>
				</div>
			</div>
		</div>`;
	}

	wireGameDetailsEditor(root, p) {
		this.wirePriceCheck(root, p);
		const toggleBtn = root.querySelector("#svl-de-toggle");
		const form = root.querySelector("#svl-de-form");
		const cancelBtn = root.querySelector("#svl-de-cancel");
		const saveBtn = root.querySelector("#svl-de-save");
		const msg = root.querySelector("#svl-de-msg");
		if (!toggleBtn || !form) return;

		this.wireTagChipField(root, "svl-de-genre");
		this.wireTagChipField(root, "svl-de-subgenre");
		const getAch = this._wireAchFields(root, "svl-de-ach");
		this._wireFranchise(root, "svl-de-franchise");

		const openForm = () => {
			form.classList.add("is-open");
			toggleBtn.classList.add("is-open");
			form.style.maxHeight = (form.scrollHeight + 40) + "px";
		};
		const closeForm = () => {
			form.style.maxHeight = "0px";
			form.classList.remove("is-open");
			toggleBtn.classList.remove("is-open");
		};
		toggleBtn.addEventListener("click", () => form.classList.contains("is-open") ? closeForm() : openForm());
		cancelBtn?.addEventListener("click", closeForm);

		const val = id => (root.querySelector(id)?.value || "").trim();

		saveBtn?.addEventListener("click", async () => {
			saveBtn.disabled = true;
			msg.textContent = "Salvando…";
			msg.className = "svl-form-msg";
			try {
				const file = app.vault.getAbstractFileByPath(p.file.path);
				if (!file) throw new Error("arquivo não encontrado");
				const genre = val("#svl-de-genre-hidden").split(",").map(s => s.trim()).filter(Boolean);
				const subgenre = val("#svl-de-subgenre-hidden").split(",").map(s => s.trim()).filter(Boolean);
				// 1.12.0: "Possui franquia?" Não = sem franquia; Sim = grafia da franquia existente (ou nova, criada aqui)
				const franchiseName = this._franchiseValue(root, "svl-de-franchise");
				if (root.querySelector('#svl-de-franchise-has [data-value="yes"].is-active') && !franchiseName) { saveBtn.disabled = false; msg.textContent = "Escolha a franquia ou marque Não."; msg.className = "svl-form-msg is-error"; return; }
				if (franchiseName) await customJS.SteamVaultCore.ensureCategoryNote("franchise", franchiseName).catch(() => {});
				await app.fileManager.processFrontMatter(file, fm => {
					fm.platform = val("#svl-de-platform");
					fm.status = val("#svl-de-status");
					const ach = getAch();
					Object.assign(fm, customJS.SteamVaultCore.achievementFields(ach.provider, ach.sync));
					delete fm.gameType; delete fm.achievementSource;
					fm.franchise = franchiseName;
					const ordem = Number(val("#svl-de-franchise-order"));
					fm.franchiseOrder = franchiseName && Number.isFinite(ordem) && ordem > 0 ? ordem : "";
					fm.genre = genre;
					fm.subgenre = subgenre;
					fm.releaseYear = val("#svl-de-year") ? Number(val("#svl-de-year")) : "";
					// 3.63/3.64: data de lançamento (lista de desejos "Em breve"); a
					// chave só entra na nota quando há data ou já existia
					{ const rd = val("#svl-de-releasedate"); if (rd) { fm.releaseDate = rd; if (!fm.releaseYear) fm.releaseYear = Number(rd.slice(0, 4)); } else if ("releaseDate" in fm) fm.releaseDate = ""; }
					fm.developer = val("#svl-de-developer");
					fm.publisher = val("#svl-de-publisher");
					fm.hoursPlayed = Math.round((Number(val("#svl-de-hours")) || 0) * 100) / 100;
					fm.startDate = val("#svl-de-startdate") || "";
					fm.completionDate = val("#svl-de-completiondate") || "";
					// preenchimento automático de datas: só quando o campo está
					// vazio e o status está mudando de fato — nunca sobrescreve
					// uma data que a pessoa já preencheu com a mão
					const today = customJS.SteamVaultCore.today();
					if (!fm.startDate && fm.status === "Playing" && p.status !== "Playing") fm.startDate = today;
					if (!fm.completionDate && this.isCompletedStatus(fm.status) && !this.isCompletedStatus(p.status)) fm.completionDate = today;
					fm.priority = val("#svl-de-priority");
					const newPrice = Math.max(0, Number(val("#svl-de-price")) || 0);
					if (newPrice !== Number(fm.price || 0)) {
						if (!Array.isArray(fm.priceHistory)) fm.priceHistory = [];
						const today = customJS.SteamVaultCore.today();
						fm.priceHistory.push({ date: today, price: newPrice });
					}
					fm.price = newPrice;
					fm.targetPrice = val("#svl-de-targetprice") ? Math.max(0, Number(val("#svl-de-targetprice")) || 0) : "";
					fm.buyLink = val("#svl-de-buylink");
					fm.wishlistReason = val("#svl-de-wishreason");
					fm.estimatedHours = val("#svl-de-esthours") ? Math.max(0, Number(val("#svl-de-esthours")) || 0) : "";
					fm.ownership = val("#svl-de-ownership");
					fm.labels = val("#svl-de-labels").split(",").map(s => s.trim()).filter(Boolean);
					fm.rating = Math.max(0, Math.min(5, Number(val("#svl-de-rating")) || 0));
					const subRating = id => { const v = val(id); return v === "" ? "" : Math.max(0, Math.min(5, Number(v) || 0)); };
					fm.ratingGameplay = subRating("#svl-de-rating-gameplay");
					fm.ratingStory = subRating("#svl-de-rating-story");
					fm.ratingGraphics = subRating("#svl-de-rating-graphics");
					fm.ratingSoundtrack = subRating("#svl-de-rating-soundtrack");
					fm.ratingFun = subRating("#svl-de-rating-fun");
					fm.summary = val("#svl-de-summary");
				});
				msg.textContent = "Salvo!";
				msg.className = "svl-form-msg is-success";
			} catch (err) {
				console.error("Game Library: falha ao salvar detalhes", err);
				msg.textContent = "Não foi possível salvar. Veja o console.";
				msg.className = "svl-form-msg is-error";
			} finally {
				saveBtn.disabled = false;
			}
		});
	}

	// ------------------------------------------------------------ soundtrack
	soundtrackRow(t, i) {
		const title = this.esc(t?.title || "Faixa");
		const url = String(t?.url || "").trim();
		const isExternal = /^https?:\/\//i.test(url);
		const playable = url && !isExternal;
		const icon = !url ? "🎵" : (isExternal ? "🔗" : "🎵");
		const fav = t?.favorite ? `<span class="svl-soundtrack-fav" title="Faixa favorita">★</span>` : "";
		const artist = t?.artist ? `<div class="svl-soundtrack-artist">${this.esc(t.artist)}</div>` : "";
		return `<div class="svl-soundtrack-row" data-index="${i}" data-url="${this.esc(url)}">
			<span class="svl-soundtrack-num">${i + 1}</span>
			<span class="svl-soundtrack-icon${playable ? " is-playable" : ""}">${icon}</span>
			<div class="svl-soundtrack-text">
				<div class="svl-soundtrack-title">${title}${fav}</div>
				${artist}
			</div>
			<button type="button" class="svl-soundtrack-editbtn" data-index="${i}" title="Editar">✏️</button>
		</div>`;
	}

	soundtrackSection(p) {
		const tracks = Array.isArray(p.soundtrack) ? p.soundtrack : [];
		const hasPlayable = tracks.some(t => t?.url && !/^https?:\/\//i.test(String(t.url).trim()));
		const artSrc = this.gameImageSrc(p, "fichaCover");
		const art = artSrc ? `<img src="${this.esc(artSrc)}" alt="" loading="lazy" decoding="async">` : "🎵";

		const player = tracks.length ? `<div class="svl-player">
			<audio id="svl-player-audio" preload="none"></audio>
			<div class="svl-player-now">
				<div class="svl-player-icon" id="svl-player-icon">${art}</div>
				<div class="svl-player-info">
					<div class="svl-player-track-name" id="svl-player-track-name">${hasPlayable ? "Toque numa faixa para tocar" : "Nenhuma faixa local ainda"}</div>
					<div class="svl-player-progress-track"><div class="svl-player-progress-fill" id="svl-player-progress-fill"></div></div>
					<div class="svl-player-time" id="svl-player-time">0:00 / 0:00</div>
				</div>
			</div>
			<div class="svl-player-controls">
				<button type="button" class="svl-player-btn" data-action="prev" title="Anterior">${this.iconPrev()}</button>
				<button type="button" class="svl-player-btn svl-player-btn-main" data-action="playpause" title="Reproduzir">${this.iconPlay()}</button>
				<button type="button" class="svl-player-btn" data-action="next" title="Próxima">${this.iconNext()}</button>
			</div>
		</div>` : "";

		const summary = tracks.length ? `<div class="svl-dlc-summary">${tracks.length} faixa${tracks.length === 1 ? "" : "s"}</div>` : "";
		const list = tracks.length
			? `<div class="svl-soundtrack-list svl-list-card">${tracks.map((t, i) => this.soundtrackRow(t, i)).join("")}</div>`
			: this.emptyHint("🎵", "Nenhuma música adicionada ainda.", { type: "music" });

		return `${player}${summary}${list}
			<div class="svl-add-wrap svl-add-wrap-sm">
				<button type="button" class="svl-add-btn svl-add-btn-sm" id="svl-st-toggle">
					<span class="svl-add-btn-icon">+</span> Adicionar música
				</button>
				<div class="svl-form" id="svl-st-form">
					<div class="svl-form-inner">
						<div class="svl-field">
							<label for="svl-st-title">Nome da música *</label>
							<input type="text" class="svl-input" id="svl-st-title" placeholder="Ex: Main Theme">
						</div>
						<div class="svl-field">
							<label for="svl-st-artist">Artista / compositor (opcional)</label>
							<input type="text" class="svl-input" id="svl-st-artist" placeholder="Ex: Christopher Larkin">
						</div>
						${this.audioPickerField({ id: "svl-st-url", label: "Áudio" })}
						<label class="svl-checkbox-label">
							<input type="checkbox" id="svl-st-favorite"> Marcar como faixa favorita
						</label>
						<div class="svl-form-actions">
							<button type="button" class="svl-btn-ghost svl-btn-danger" id="svl-st-delete" style="display:none">Remover música</button>
							<button type="button" class="svl-btn-ghost" id="svl-st-cancel">Cancelar</button>
							<button type="button" class="svl-btn-primary" id="svl-st-submit">Adicionar</button>
						</div>
						<div class="svl-form-msg" id="svl-st-msg"></div>
					</div>
				</div>
			</div>`;
	}

	wireSoundtrackSection(root, p) {
		const tracks = Array.isArray(p.soundtrack) ? p.soundtrack : [];
		const toggleBtn = root.querySelector("#svl-st-toggle");
		const form = root.querySelector("#svl-st-form");
		const cancelBtn = root.querySelector("#svl-st-cancel");
		const submitBtn = root.querySelector("#svl-st-submit");
		const deleteBtn = root.querySelector("#svl-st-delete");
		const msg = root.querySelector("#svl-st-msg");

		if (toggleBtn && form) {
			this.wireAudioPicker(root, "svl-st-url", {
				folder: `${this.folders.soundtrackAssets}/${this.safeName(p.title || p.file.name)}`,
				baseName: () => root.querySelector("#svl-st-title")?.value || "musica"
			});
			const openForm = () => {
				form.classList.add("is-open");
				toggleBtn.classList.add("is-open");
				form.style.maxHeight = (form.scrollHeight + 40) + "px";
			};
			const closeForm = () => {
				form.style.maxHeight = "0px";
				form.classList.remove("is-open");
				toggleBtn.classList.remove("is-open");
				delete form.dataset.editingIndex;
				submitBtn.textContent = "Adicionar";
				if (deleteBtn) deleteBtn.style.display = "none";
			};
			toggleBtn.addEventListener("click", () => form.classList.contains("is-open") ? closeForm() : openForm());
			cancelBtn?.addEventListener("click", closeForm);

			submitBtn?.addEventListener("click", async () => {
				const title = root.querySelector("#svl-st-title")?.value.trim();
				if (!title) {
					msg.textContent = "Dê um nome à música antes de continuar.";
					msg.className = "svl-form-msg is-error";
					return;
				}
				const url = root.querySelector("#svl-st-url")?.value.trim() || "";
				const artist = root.querySelector("#svl-st-artist")?.value.trim() || "";
				const favorite = root.querySelector("#svl-st-favorite")?.checked || false;
				const editingIndex = form.dataset.editingIndex;
				submitBtn.disabled = true;
				try {
					const file = app.vault.getAbstractFileByPath(p.file.path);
					if (!file) throw new Error("arquivo não encontrado");
					await app.fileManager.processFrontMatter(file, fm => {
						if (!Array.isArray(fm.soundtrack)) fm.soundtrack = [];
						const entry = { title, url };
						if (artist) entry.artist = artist;
						if (favorite) entry.favorite = true;
						if (editingIndex !== undefined && fm.soundtrack[Number(editingIndex)]) {
							fm.soundtrack[Number(editingIndex)] = entry;
						} else {
							fm.soundtrack.push(entry);
						}
					});
					msg.textContent = editingIndex !== undefined ? "Salvo!" : "Adicionada!";
					msg.className = "svl-form-msg is-success";
					root.querySelector("#svl-st-title").value = "";
					root.querySelector("#svl-st-url").value = "";
					root.querySelector("#svl-st-artist").value = "";
					root.querySelector("#svl-st-favorite").checked = false;
					delete form.dataset.editingIndex;
					submitBtn.textContent = "Adicionar";
				} catch (err) {
					console.error("Game Library: falha ao salvar música", err);
					msg.textContent = "Não foi possível salvar. Veja o console.";
					msg.className = "svl-form-msg is-error";
				} finally {
					submitBtn.disabled = false;
				}
			});

			root.querySelectorAll(".svl-soundtrack-editbtn").forEach(btn => {
				btn.addEventListener("click", e => {
					e.stopPropagation();
					const idx = Number(btn.dataset.index);
					const t = tracks[idx];
					if (!t) return;
					form.dataset.editingIndex = String(idx);
					root.querySelector("#svl-st-title").value = t.title || "";
					root.querySelector("#svl-st-url").value = t.url || "";
					root.querySelector("#svl-st-artist").value = t.artist || "";
					root.querySelector("#svl-st-favorite").checked = !!t.favorite;
					submitBtn.textContent = "Salvar";
					if (deleteBtn) deleteBtn.style.display = "";
					openForm();
				});
			});

			// "Remover música" só existe dentro do formulário de edição — não
			// fica mais um X sempre visível na linha, reduzindo o risco de
			// apagar sem querer. Só aparece quando você já está editando uma
			// faixa existente (nunca ao adicionar uma nova).
			deleteBtn?.addEventListener("click", async () => {
				const idx = Number(form.dataset.editingIndex);
				if (Number.isNaN(idx)) return;
				deleteBtn.disabled = true;
				try {
					const file = app.vault.getAbstractFileByPath(p.file.path);
					if (!file) throw new Error("arquivo não encontrado");
					await app.fileManager.processFrontMatter(file, fm => {
						if (Array.isArray(fm.soundtrack)) fm.soundtrack.splice(idx, 1);
					});
					closeForm();
				} catch (err) {
					console.error("Game Library: falha ao remover música", err);
					msg.textContent = "Não foi possível remover. Veja o console.";
					msg.className = "svl-form-msg is-error";
				} finally {
					deleteBtn.disabled = false;
				}
			});
		}

		// tenta usar a capa que já vem embutida no próprio arquivo de
		// música (tag ID3/Ogg/FLAC), trocando o emoji pelo ícone real do
		// arquivo quando existir. Acontece em segundo plano. Só aplica o
		// destaque dourado depois de CONFIRMAR que não há capa — nunca
		// como um estado "de passagem" antes da imagem aparecer, pra não
		// dar a impressão de que algo mudou sozinho ou por causa do clique.
		root.querySelectorAll(".svl-soundtrack-row").forEach(row => {
			const url = row.dataset.url;
			const iconEl = row.querySelector(".svl-soundtrack-icon");
			if (!url || /^https?:\/\//i.test(url)) return;
			this.loadEmbeddedTrackArt(url).then(dataUri => {
				row.dataset.artUri = dataUri || "";
				if (iconEl) {
					if (dataUri) iconEl.innerHTML = `<img src="${this.esc(dataUri)}" alt="" loading="lazy" decoding="async">`;
					else iconEl.classList.add("no-art");
				}
				const isCurrentlyShown = Number(row.dataset.index) === currentIndex || (currentIndex === -1 && Number(row.dataset.index) === 0);
				if (isCurrentlyShown) updatePlayerIcon(currentIndex === -1 ? 0 : currentIndex);
			});
		});

		// -------------------------------------------- player de áudio embutido
		const audio = root.querySelector("#svl-player-audio");
		if (!audio) return; // sem faixas, sem player pra ligar
		const playerEl = root.querySelector(".svl-player");
		const playPauseBtn = root.querySelector('[data-action="playpause"]');
		const prevBtn = root.querySelector('[data-action="prev"]');
		const nextBtn = root.querySelector('[data-action="next"]');
		const nowTitle = root.querySelector("#svl-player-track-name");
		const playerIconEl = root.querySelector("#svl-player-icon");
		const defaultPlayerIcon = playerIconEl ? playerIconEl.innerHTML : "";
		const progressFill = root.querySelector("#svl-player-progress-fill");
		const timeDisplay = root.querySelector("#svl-player-time");
		let currentIndex = -1;

		const localSrc = t => {
			const val = String(t?.url || "").trim();
			if (!val || /^https?:\/\//i.test(val)) return null;
			return this.resolveFileSrc(val);
		};
		const playableIndexes = () => tracks.map((t, i) => i).filter(i => localSrc(tracks[i]));

		// chave de estado por jogo — pra retomar a reprodução do ponto
		// certo quando o Modo de Leitura do Obsidian reciclar essa seção
		// e recriar o elemento de áudio do zero (ver comentário no construtor)
		const stateKey = p.file.path;
		const saveState = () => {
			this._soundtrackState[stateKey] = {
				trackIndex: currentIndex,
				currentTime: audio.currentTime || 0,
				isPlaying: !audio.paused
			};
		};

		const highlightRow = idx => {
			root.querySelectorAll(".svl-soundtrack-row").forEach(r => r.classList.remove("is-playing"));
			root.querySelector(`.svl-soundtrack-row[data-index="${idx}"]`)?.classList.add("is-playing");
		};

		// mostra no player a capa da própria faixa (extraída do arquivo),
		// se já tiver sido encontrada; senão volta pra capa do jogo — nunca
		// mistura o ícone de uma faixa com o de outra
		const updatePlayerIcon = idx => {
			if (!playerIconEl) return;
			const row = root.querySelector(`.svl-soundtrack-row[data-index="${idx}"]`);
			const artUri = row?.dataset.artUri;
			playerIconEl.innerHTML = artUri ? `<img src="${this.esc(artUri)}" alt="" loading="lazy" decoding="async">` : defaultPlayerIcon;
		};

		const loadTrack = (idx, autoplay = true, seekTo = 0) => {
			const t = tracks[idx];
			if (!t) return;
			const src = localSrc(t);
			currentIndex = idx;
			highlightRow(idx);
			updatePlayerIcon(idx);
			nowTitle.textContent = t.title || "Faixa";
			if (!src) {
				// sem áudio local: se tiver link externo, abre numa aba; só destaca a linha
				if (/^https?:\/\//i.test(String(t.url || ""))) window.open(t.url, "_blank");
				return;
			}
			audio.src = src;
			if (seekTo > 0) {
				const onReady = () => { audio.currentTime = seekTo; audio.removeEventListener("loadedmetadata", onReady); };
				audio.addEventListener("loadedmetadata", onReady);
			}
			if (autoplay) audio.play().catch(() => {});
		};

		// retoma de onde parou, se essa mesma ficha já tinha uma faixa
		// tocando antes da seção ser recriada
		const saved = this._soundtrackState[stateKey];
		if (saved && tracks[saved.trackIndex]) {
			loadTrack(saved.trackIndex, saved.isPlaying, saved.currentTime);
		}
		audio.addEventListener("timeupdate", saveState);
		audio.addEventListener("play", saveState);
		audio.addEventListener("pause", saveState);

		const goNext = () => {
			const playable = playableIndexes();
			if (!playable.length) return;
			const pos = playable.indexOf(currentIndex);
			loadTrack(playable[(pos + 1) % playable.length]);
		};
		const goPrev = () => {
			const playable = playableIndexes();
			if (!playable.length) return;
			const pos = playable.indexOf(currentIndex);
			loadTrack(playable[(pos - 1 + playable.length) % playable.length]);
		};

		playPauseBtn?.addEventListener("click", () => {
			if (!audio.src) {
				const first = playableIndexes()[0];
				if (first === undefined) return;
				loadTrack(first);
				return;
			}
			if (audio.paused) audio.play().catch(() => {});
			else audio.pause();
		});
		prevBtn?.addEventListener("click", goPrev);
		nextBtn?.addEventListener("click", goNext);

		audio.addEventListener("play", () => { playPauseBtn.innerHTML = this.iconPause(); playerEl?.classList.add("is-playing"); });
		audio.addEventListener("pause", () => { playPauseBtn.innerHTML = this.iconPlay(); playerEl?.classList.remove("is-playing"); });
		audio.addEventListener("ended", goNext);

		const formatTime = s => {
			if (!isFinite(s) || s < 0) return "0:00";
			const m = Math.floor(s / 60);
			const sec = Math.floor(s % 60).toString().padStart(2, "0");
			return `${m}:${sec}`;
		};
		audio.addEventListener("timeupdate", () => {
			if (!audio.duration) return;
			progressFill.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
			if (timeDisplay) timeDisplay.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
		});
		audio.addEventListener("loadedmetadata", () => {
			if (timeDisplay) timeDisplay.textContent = `0:00 / ${formatTime(audio.duration)}`;
		});

		const progressTrack = root.querySelector("#svl-player-progress-fill")?.parentElement;
		progressTrack?.addEventListener("click", e => {
			if (!audio.duration) return;
			const rect = progressTrack.getBoundingClientRect();
			const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
			audio.currentTime = ratio * audio.duration;
		});

		root.querySelectorAll(".svl-soundtrack-row").forEach(row => {
			row.addEventListener("click", e => {
				if (e.target.closest(".svl-soundtrack-remove")) return;
				loadTrack(Number(row.dataset.index));
			});
		});
	}

	// ---------------------------------------------------- formulário: nova coleção
	addCollectionForm() {
		return `<div class="svl-add-wrap">
			<button type="button" class="svl-add-btn" id="svl-ac-toggle">
				<span class="svl-add-btn-icon">+</span> Criar coleção
			</button>
			<div class="svl-form" id="svl-ac-form">
				<div class="svl-form-inner">
					<div class="svl-field">
						<label for="svl-ac-title">Nome da coleção *</label>
						<input type="text" class="svl-input" id="svl-ac-title" placeholder="Ex: Favoritos">
					</div>
					<div class="svl-field">
						<label for="svl-ac-desc">Descrição</label>
						<input type="text" class="svl-input" id="svl-ac-desc" placeholder="Do que se trata essa coleção?">
					</div>
					${this.imagePickerField({ id: "svl-ac-cover", label: "Capa (opcional)" })}
					<div class="svl-form-actions">
						<button type="button" class="svl-btn-ghost" id="svl-ac-cancel">Cancelar</button>
						<button type="button" class="svl-btn-primary" id="svl-ac-submit">Criar coleção</button>
					</div>
					<div class="svl-form-msg" id="svl-ac-msg"></div>
				</div>
			</div>
		</div>`;
	}

	wireAddCollectionForm(root) {
		const toggleBtn = root.querySelector("#svl-ac-toggle");
		const form = root.querySelector("#svl-ac-form");
		const cancelBtn = root.querySelector("#svl-ac-cancel");
		const submitBtn = root.querySelector("#svl-ac-submit");
		const msg = root.querySelector("#svl-ac-msg");
		if (!toggleBtn || !form) return;

		this.wireImagePicker(root, "svl-ac-cover", { folder: this.folders.coverAssets, baseName: () => root.querySelector("#svl-ac-title")?.value || "colecao" });

		const openForm = () => {
			form.classList.add("is-open");
			toggleBtn.classList.add("is-open");
			form.style.maxHeight = (form.scrollHeight + 40) + "px";
		};
		const closeForm = () => {
			form.style.maxHeight = "0px";
			form.classList.remove("is-open");
			toggleBtn.classList.remove("is-open");
		};
		toggleBtn.addEventListener("click", () => form.classList.contains("is-open") ? closeForm() : openForm());
		cancelBtn?.addEventListener("click", closeForm);

		submitBtn?.addEventListener("click", async () => {
			const title = root.querySelector("#svl-ac-title")?.value.trim();
			if (!title) {
				msg.textContent = "Dê um nome à coleção antes de continuar.";
				msg.className = "svl-form-msg is-error";
				return;
			}
			submitBtn.disabled = true;
			msg.textContent = "Criando…";
			msg.className = "svl-form-msg";
			const description = root.querySelector("#svl-ac-desc")?.value.trim() || "";
			const cover = root.querySelector("#svl-ac-cover")?.value.trim() || "";

			try {
				const yesc = s => this.yamlEscape(s);
				const folder = this.folders.collections;
				if (!app.vault.getAbstractFileByPath(folder)) {
					await app.vault.createFolder(folder).catch(() => {});
				}
				const safeName = this.safeName(title, "Nova Coleção");
				let path = `${folder}/${safeName}.md`;
				let n = 1;
				while (app.vault.getAbstractFileByPath(path)) {
					n += 1;
					path = `${folder}/${safeName} ${n}.md`;
				}
				const content = [
					"---",
					`title: "${yesc(title)}"`,
					"type: collection",
					`description: "${yesc(description)}"`,
					`accent: ""`,
					`cover: "${yesc(cover)}"`,
					"games: []",
					"cssclasses: [steamvault, sv-collection]",
					"---",
					"",
					...customJS.SteamVaultCore.noteBody("collection").split("\n")
				].join("\n");

				await app.vault.create(path, content);
				msg.textContent = `"${title}" criada! Abrindo…`;
				msg.className = "svl-form-msg is-success";
				setTimeout(() => app.workspace.openLinkText(path, "", false), 500);
			} catch (err) {
				console.error("Game Library: falha ao criar coleção", err);
				msg.textContent = "Não foi possível criar a coleção. Veja o console.";
				msg.className = "svl-form-msg is-error";
			} finally {
				submitBtn.disabled = false;
			}
		});
	}

	// --------------------------------------------------------- editar coleção
	collectionEditPanel(c) {
		return `<div class="svl-cover-edit-wrap">
			<button type="button" class="svl-edit-cover-btn" id="svl-cc-toggle">
				<span class="svl-edit-btn-icon">✏️</span>
				<span class="svl-edit-btn-text"><strong>Editar coleção</strong></span>
				<span class="svl-edit-btn-chevron">›</span>
			</button>
			<div class="svl-form" id="svl-cc-form">
				<div class="svl-form-inner">
					<div class="svl-field">
						<label for="svl-cc-desc">Descrição</label>
						<input type="text" class="svl-input" id="svl-cc-desc" value="${this.esc(c.description || "")}">
					</div>
					${this.imagePickerField({ id: "svl-cc-cover", label: "Capa", value: c.cover || "" })}
					<div class="svl-form-actions">
						<button type="button" class="svl-btn-ghost" id="svl-cc-cancel">Cancelar</button>
						<button type="button" class="svl-btn-primary" id="svl-cc-save">Salvar</button>
					</div>
					<div class="svl-form-msg" id="svl-cc-msg"></div>
				</div>
			</div>
		</div>`;
	}

	wireCollectionEditor(root, c) {
		const toggleBtn = root.querySelector("#svl-cc-toggle");
		const form = root.querySelector("#svl-cc-form");
		const cancelBtn = root.querySelector("#svl-cc-cancel");
		const saveBtn = root.querySelector("#svl-cc-save");
		const msg = root.querySelector("#svl-cc-msg");
		if (!toggleBtn || !form) return;

		this.wireImagePicker(root, "svl-cc-cover", { folder: this.folders.coverAssets, baseName: () => (c.title || c.file.name) });

		const openForm = () => {
			form.classList.add("is-open");
			toggleBtn.classList.add("is-open");
			form.style.maxHeight = (form.scrollHeight + 40) + "px";
		};
		const closeForm = () => {
			form.style.maxHeight = "0px";
			form.classList.remove("is-open");
			toggleBtn.classList.remove("is-open");
		};
		toggleBtn.addEventListener("click", () => form.classList.contains("is-open") ? closeForm() : openForm());
		cancelBtn?.addEventListener("click", closeForm);

		saveBtn?.addEventListener("click", async () => {
			saveBtn.disabled = true;
			msg.textContent = "Salvando…";
			msg.className = "svl-form-msg";
			try {
				const file = app.vault.getAbstractFileByPath(c.file.path);
				if (!file) throw new Error("arquivo não encontrado");
				await app.fileManager.processFrontMatter(file, fm => {
					fm.description = root.querySelector("#svl-cc-desc")?.value.trim() || "";
					fm.cover = root.querySelector("#svl-cc-cover")?.value.trim() || "";
				});
				msg.textContent = "Salvo!";
				msg.className = "svl-form-msg is-success";
			} catch (err) {
				console.error("Game Library: falha ao salvar coleção", err);
				msg.textContent = "Não foi possível salvar. Veja o console.";
				msg.className = "svl-form-msg is-error";
			} finally {
				saveBtn.disabled = false;
			}
		});
	}

	// -------------------------------------------------- formulário: nova plataforma
	// plataformas personalizadas ficam guardadas em Dashboard/Plataformas.md
	// (campo customPlatforms) e passam a aparecer em toda seleção de
	// plataforma do app, ao lado das já conhecidas.
	// cria um gênero ou subgênero novo direto da aba Gêneros, mesmo sem
	// nenhum jogo usando ele ainda — mesmo padrão do "Nova plataforma"
	addCustomGenreForm() {
		return `<div class="svl-add-wrap">
			<button type="button" class="svl-add-btn" id="svl-ag-toggle">
				<span class="svl-add-btn-icon">+</span> Novo gênero ou subgênero
			</button>
			<div class="svl-form" id="svl-ag-form">
				<div class="svl-form-inner">
					<div class="svl-field">
						<label for="svl-ag-name">Nome *</label>
						<input type="text" class="svl-input" id="svl-ag-name" placeholder="Ex: Roguelike, Visual Novel...">
					</div>
					<div class="svl-field">
						<label>Tipo</label>
						<div class="svl-segmented" id="svl-ag-type" data-value="genre">
							<button type="button" class="svl-segmented-opt is-active" data-value="genre">Gênero</button>
							<button type="button" class="svl-segmented-opt" data-value="subgenre">Subgênero</button>
						</div>
					</div>
					<div class="svl-form-actions">
						<button type="button" class="svl-btn-ghost" id="svl-ag-cancel">Cancelar</button>
						<button type="button" class="svl-btn-primary" id="svl-ag-submit">Criar</button>
					</div>
					<div class="svl-form-msg" id="svl-ag-msg"></div>
				</div>
			</div>
		</div>`;
	}

	wireAddCustomGenreForm(root) {
		const toggleBtn = root.querySelector("#svl-ag-toggle");
		const form = root.querySelector("#svl-ag-form");
		const cancelBtn = root.querySelector("#svl-ag-cancel");
		const submitBtn = root.querySelector("#svl-ag-submit");
		const msg = root.querySelector("#svl-ag-msg");
		const typeGroup = root.querySelector("#svl-ag-type");
		if (!toggleBtn || !form) return;

		typeGroup?.querySelectorAll(".svl-segmented-opt").forEach(btn => {
			btn.addEventListener("click", () => {
				typeGroup.querySelectorAll(".svl-segmented-opt").forEach(b => b.classList.remove("is-active"));
				btn.classList.add("is-active");
				typeGroup.dataset.value = btn.dataset.value;
			});
		});

		const openForm = () => {
			form.classList.add("is-open");
			toggleBtn.classList.add("is-open");
			form.style.maxHeight = (form.scrollHeight + 40) + "px";
		};
		const closeForm = () => {
			form.style.maxHeight = "0px";
			form.classList.remove("is-open");
			toggleBtn.classList.remove("is-open");
		};
		toggleBtn.addEventListener("click", () => form.classList.contains("is-open") ? closeForm() : openForm());
		cancelBtn?.addEventListener("click", closeForm);

		submitBtn?.addEventListener("click", async () => {
			const name = root.querySelector("#svl-ag-name")?.value.trim();
			if (!name) {
				msg.textContent = "Dê um nome antes de continuar.";
				msg.className = "svl-form-msg is-error";
				return;
			}
			const kind = typeGroup?.dataset.value || "genre";
			const field = kind === "subgenre" ? "customSubgenres" : "customGenres";
			submitBtn.disabled = true;
			msg.textContent = "Criando…";
			msg.className = "svl-form-msg";
			try {
				const settingsPath = "Dashboard/Gêneros.md";
				const file = app.vault.getAbstractFileByPath(settingsPath);
				if (!file) throw new Error("Dashboard/Gêneros.md não encontrado");

				const already = (app.metadataCache.getFileCache(file)?.frontmatter?.[field] || []).includes(name);
				if (already) {
					msg.textContent = `Esse ${kind === "subgenre" ? "subgênero" : "gênero"} já existe.`;
					msg.className = "svl-form-msg is-error";
					submitBtn.disabled = false;
					return;
				}

				await app.fileManager.processFrontMatter(file, fm => {
					if (!Array.isArray(fm[field])) fm[field] = [];
					fm[field].push(name);
				});
				await this.ensureCategoryNote("genre", name);

				msg.textContent = `"${name}" criado! Já aparece nos formulários de jogo.`;
				msg.className = "svl-form-msg is-success";
				root.querySelector("#svl-ag-name").value = "";
			} catch (err) {
				console.error("Game Library: falha ao criar gênero/subgênero", err);
				msg.textContent = "Não foi possível criar. Veja o console.";
				msg.className = "svl-form-msg is-error";
			} finally {
				submitBtn.disabled = false;
			}
		});
	}

	addCustomPlatformForm() {
		return `<div class="svl-add-wrap">
			<button type="button" class="svl-add-btn" id="svl-ap-toggle">
				<span class="svl-add-btn-icon">+</span> Nova plataforma
			</button>
			<div class="svl-form" id="svl-ap-form">
				<div class="svl-form-inner">
					<div class="svl-field">
						<label for="svl-ap-name">Nome da plataforma *</label>
						<input type="text" class="svl-input" id="svl-ap-name" placeholder="Ex: Xbox 360, Wii U, Mobile...">
					</div>
					<div class="svl-form-actions">
						<button type="button" class="svl-btn-ghost" id="svl-ap-cancel">Cancelar</button>
						<button type="button" class="svl-btn-primary" id="svl-ap-submit">Criar plataforma</button>
					</div>
					<div class="svl-form-msg" id="svl-ap-msg"></div>
				</div>
			</div>
		</div>`;
	}

	wireAddCustomPlatformForm(root) {
		const toggleBtn = root.querySelector("#svl-ap-toggle");
		const form = root.querySelector("#svl-ap-form");
		const cancelBtn = root.querySelector("#svl-ap-cancel");
		const submitBtn = root.querySelector("#svl-ap-submit");
		const msg = root.querySelector("#svl-ap-msg");
		if (!toggleBtn || !form) return;

		const openForm = () => {
			form.classList.add("is-open");
			toggleBtn.classList.add("is-open");
			form.style.maxHeight = (form.scrollHeight + 40) + "px";
		};
		const closeForm = () => {
			form.style.maxHeight = "0px";
			form.classList.remove("is-open");
			toggleBtn.classList.remove("is-open");
		};
		toggleBtn.addEventListener("click", () => form.classList.contains("is-open") ? closeForm() : openForm());
		cancelBtn?.addEventListener("click", closeForm);

		submitBtn?.addEventListener("click", async () => {
			const name = root.querySelector("#svl-ap-name")?.value.trim();
			if (!name) {
				msg.textContent = "Dê um nome à plataforma antes de continuar.";
				msg.className = "svl-form-msg is-error";
				return;
			}
			submitBtn.disabled = true;
			msg.textContent = "Criando…";
			msg.className = "svl-form-msg";
			try {
				const settingsPath = "Dashboard/Plataformas.md";
				const file = app.vault.getAbstractFileByPath(settingsPath);
				if (!file) throw new Error("Dashboard/Plataformas.md não encontrado");

				const already = this.platformOrder.includes(name) ||
					(app.metadataCache.getFileCache(file)?.frontmatter?.customPlatforms || []).includes(name);
				if (already) {
					msg.textContent = "Essa plataforma já existe.";
					msg.className = "svl-form-msg is-error";
					submitBtn.disabled = false;
					return;
				}

				await app.fileManager.processFrontMatter(file, fm => {
					if (!Array.isArray(fm.customPlatforms)) fm.customPlatforms = [];
					fm.customPlatforms.push(name);
				});
				// já deixa a pastinha pronta pra receber jogos dessa plataforma
				await this.ensureFolder(`${this.folders.games}/${this.safeName(name, name)}`);

				msg.textContent = `"${name}" criada! Já aparece nos formulários de jogo.`;
				msg.className = "svl-form-msg is-success";
				root.querySelector("#svl-ap-name").value = "";
			} catch (err) {
				console.error("Game Library: falha ao criar plataforma", err);
				msg.textContent = "Não foi possível criar a plataforma. Veja o console.";
				msg.className = "svl-form-msg is-error";
			} finally {
				submitBtn.disabled = false;
			}
		});
	}

	// ------------------------------------------------------------ screenshots
	screenshotThumb(s, i) {
		const src = typeof s === "string" ? s : (s?.src || "");
		const favorite = typeof s === "object" && s?.favorite;
		const resolved = this.resolveImageSrc(src);
		return `<div class="svl-screenshot-thumb${favorite ? " is-favorite" : ""}" data-index="${i}">
			<img src="${this.esc(resolved)}" alt="" loading="lazy" decoding="async" data-lightbox-index="${i}">
			<button type="button" class="svl-screenshot-fav" data-index="${i}" title="Marcar como favorita">${favorite ? "★" : "☆"}</button>
			<button type="button" class="svl-screenshot-remove" data-index="${i}" title="Remover">✕</button>
		</div>`;
	}

	screenshotsSection(p) {
		const shots = Array.isArray(p.screenshots) ? p.screenshots : [];
		const gallery = shots.length
			? `<div class="svl-screenshot-gallery">${shots.map((s, i) => this.screenshotThumb(s, i)).join("")}</div>
			<div class="svl-lightbox" id="svl-lightbox" style="display:none;">
				<button type="button" class="svl-lightbox-close" data-lightbox-action="close">✕</button>
				<button type="button" class="svl-lightbox-nav svl-lightbox-prev" data-lightbox-action="prev">‹</button>
				<img class="svl-lightbox-img" data-lightbox-img alt="">
				<button type="button" class="svl-lightbox-nav svl-lightbox-next" data-lightbox-action="next">›</button>
			</div>`
			: this.emptyHint("📸", "Nenhuma screenshot adicionada ainda.", { type: "screenshot" });
		return `${gallery}
			<div class="svl-add-wrap svl-add-wrap-sm">
				<button type="button" class="svl-add-btn svl-add-btn-sm" id="svl-ss-toggle">
					<span class="svl-add-btn-icon">+</span> Adicionar screenshot
				</button>
				<div class="svl-form" id="svl-ss-form">
					<div class="svl-form-inner">
						${this.imagePickerField({ id: "svl-ss-file", label: "Imagem" })}
						<div class="svl-form-actions">
							<button type="button" class="svl-btn-ghost" id="svl-ss-cancel">Cancelar</button>
							<button type="button" class="svl-btn-primary" id="svl-ss-submit">Adicionar</button>
						</div>
						<div class="svl-form-msg" id="svl-ss-msg"></div>
					</div>
				</div>
			</div>`;
	}

	wireScreenshotsSection(root, p) {
		const toggleBtn = root.querySelector("#svl-ss-toggle");
		const form = root.querySelector("#svl-ss-form");
		const cancelBtn = root.querySelector("#svl-ss-cancel");
		const submitBtn = root.querySelector("#svl-ss-submit");
		const msg = root.querySelector("#svl-ss-msg");
		const fileOf = () => { const f = app.vault.getAbstractFileByPath(p.file.path); if (!f) throw new Error("arquivo não encontrado"); return f; };
		const lightboxHtml = `<div class="svl-lightbox" id="svl-lightbox" style="display:none;">
				<button type="button" class="svl-lightbox-close" data-lightbox-action="close">✕</button>
				<button type="button" class="svl-lightbox-nav svl-lightbox-prev" data-lightbox-action="prev">‹</button>
				<img class="svl-lightbox-img" data-lightbox-img alt="">
				<button type="button" class="svl-lightbox-nav svl-lightbox-next" data-lightbox-action="next">›</button>
			</div>`;
		const syncGallery = () => {
			const thumbs = [...root.querySelectorAll(".svl-screenshot-thumb")];
			thumbs.forEach((t, i) => { t.dataset.index = i; t.querySelectorAll("[data-index], [data-lightbox-index]").forEach(el => { if (el.dataset.index !== undefined) el.dataset.index = i; if (el.dataset.lightboxIndex !== undefined) el.dataset.lightboxIndex = i; }); });
			if (!thumbs.length) {
				root.querySelector(".svl-screenshot-gallery")?.remove();
				if (!root.querySelector(".svl-empty-hint")) root.querySelector(".svl-add-wrap")?.insertAdjacentHTML("beforebegin", this.emptyHint("📸", "Nenhuma screenshot adicionada ainda.", { type: "screenshot" }));
			}
		};

		if (toggleBtn && form) {
			this.wireImagePicker(root, "svl-ss-file", {
				folder: `${this.folders.coverAssets.replace("Covers", "Screenshots")}/${this.safeName(p.title || p.file.name)}`,
				baseName: () => `screenshot-${Date.now()}`
			});
			const openForm = () => { form.classList.add("is-open"); toggleBtn.classList.add("is-open"); form.style.maxHeight = (form.scrollHeight + 40) + "px"; };
			const closeForm = () => { form.style.maxHeight = "0px"; form.classList.remove("is-open"); toggleBtn.classList.remove("is-open"); };
			toggleBtn.addEventListener("click", () => form.classList.contains("is-open") ? closeForm() : openForm());
			cancelBtn?.addEventListener("click", closeForm);

			submitBtn?.addEventListener("click", async () => {
				const input = root.querySelector("#svl-ss-file");
				const path = input?.value.trim();
				if (!path) { msg.textContent = "Escolha uma imagem antes de continuar."; msg.className = "svl-form-msg is-error"; return; }
				submitBtn.disabled = true;
				try {
					await app.fileManager.processFrontMatter(fileOf(), fm => {
						if (!Array.isArray(fm.screenshots)) fm.screenshots = [];
						fm.screenshots.push(path);
					});
					// a nova screenshot aparece na hora na galeria da janela
					root.querySelector(".svl-empty-hint")?.remove();
					let gallery = root.querySelector(".svl-screenshot-gallery");
					if (!gallery) {
						root.querySelector(".svl-add-wrap")?.insertAdjacentHTML("beforebegin", `<div class="svl-screenshot-gallery"></div>${root.querySelector(".svl-lightbox") ? "" : lightboxHtml}`);
						gallery = root.querySelector(".svl-screenshot-gallery");
						wireLightboxControls();
					}
					gallery.insertAdjacentHTML("beforeend", this.screenshotThumb(path, gallery.children.length));
					syncGallery();
					msg.textContent = "Screenshot adicionada.";
					msg.className = "svl-form-msg is-success";
					input.value = ""; input.dispatchEvent(new Event("input", { bubbles: true }));
				} catch (err) {
					console.error("Game Library: falha ao adicionar screenshot", err);
					msg.textContent = "Não foi possível adicionar. Veja o console.";
					msg.className = "svl-form-msg is-error";
				} finally {
					submitBtn.disabled = false;
				}
			});
		}

		// lightbox — toca numa miniatura pra ver em tela cheia, com navegação;
		// a lista de imagens é lida na hora (inclui as recém-adicionadas)
		let currentIndex = 0;
		const thumbs = () => [...root.querySelectorAll(".svl-screenshot-thumb img")];
		const showAt = i => {
			const t = thumbs(), lightbox = root.querySelector(".svl-lightbox"), img = root.querySelector("[data-lightbox-img]");
			if (!t.length || !lightbox || !img) return;
			currentIndex = (i + t.length) % t.length;
			img.src = t[currentIndex].src;
			lightbox.style.display = "flex";
			requestAnimationFrame(() => lightbox.classList.add("is-open"));
		};
		const closeLightbox = () => {
			const lightbox = root.querySelector(".svl-lightbox");
			if (!lightbox) return;
			lightbox.classList.remove("is-open");
			setTimeout(() => { if (!lightbox.classList.contains("is-open")) lightbox.style.display = "none"; }, 180);
		};
		const wireLightboxControls = () => {
			const lightbox = root.querySelector(".svl-lightbox");
			if (!lightbox || lightbox.__svlWired) return;
			lightbox.__svlWired = true;
			lightbox.querySelector('[data-lightbox-action="close"]')?.addEventListener("click", closeLightbox);
			lightbox.querySelector('[data-lightbox-action="prev"]')?.addEventListener("click", () => showAt(currentIndex - 1));
			lightbox.querySelector('[data-lightbox-action="next"]')?.addEventListener("click", () => showAt(currentIndex + 1));
			lightbox.addEventListener("click", e => { if (e.target === lightbox) closeLightbox(); });
		};
		wireLightboxControls();

		// favoritar, remover e abrir: um ouvinte só, com o índice atual
		root.addEventListener("click", async e => {
			const fav = e.target.closest(".svl-screenshot-fav"), rm = e.target.closest(".svl-screenshot-remove");
			const img = !fav && !rm ? e.target.closest(".svl-screenshot-thumb img") : null;
			const thumb = (fav || rm || img)?.closest(".svl-screenshot-thumb");
			if (!thumb || !root.contains(thumb)) return;
			const idx = Number(thumb.dataset.index);
			if (img) return showAt(idx);
			e.stopPropagation();
			if (fav) {
				const wasFav = thumb.classList.contains("is-favorite");
				thumb.classList.toggle("is-favorite", !wasFav); fav.textContent = wasFav ? "☆" : "★";
				try {
					await app.fileManager.processFrontMatter(fileOf(), fm => {
						if (!Array.isArray(fm.screenshots)) return;
						const cur = fm.screenshots[idx];
						const src = typeof cur === "string" ? cur : cur?.src;
						if (src) fm.screenshots[idx] = { src, favorite: !wasFav };
					});
				} catch (err) {
					console.error("Game Library: falha ao favoritar screenshot", err);
					thumb.classList.toggle("is-favorite", wasFav); fav.textContent = wasFav ? "★" : "☆";
				}
				return;
			}
			if (rm.disabled) return;
			rm.disabled = true; thumb.style.display = "none";
			try {
				await app.fileManager.processFrontMatter(fileOf(), fm => { if (Array.isArray(fm.screenshots)) fm.screenshots.splice(idx, 1); });
				thumb.remove(); syncGallery();
			} catch (err) {
				console.error("Game Library: falha ao remover screenshot", err);
				thumb.style.display = ""; rm.disabled = false;
			}
		});
		// listener global de ESC, montado uma única vez
		if (!window.__svlLightboxEscBound) {
			window.__svlLightboxEscBound = true;
			document.addEventListener("keydown", e => {
				if (e.key !== "Escape") return;
				const open = document.querySelector(".svl-lightbox.is-open");
				if (open) { open.classList.remove("is-open"); setTimeout(() => { if (!open.classList.contains("is-open")) open.style.display = "none"; }, 180); }
			});
		}
	}

	// -------------------------------------------------------- DLC / expansões
	dlcRow(d, i) {
		const done = !!d?.completed;
		const check = globalThis.customJS?.SteamVaultUI?.icon?.("check") || "✓";
		return `<div class="svl-dlc-row${done ? " is-done" : ""}" data-index="${i}">
			<button type="button" class="svl-dlc-check" data-index="${i}" title="${done ? "Concluída — toque para desmarcar" : "Marcar como concluída"}" aria-label="${done ? "Desmarcar DLC" : "Concluir DLC"}" aria-pressed="${done}">${check}</button>
			<span class="svl-dlc-title">${this.esc((typeof d === "string" ? d : d?.title) || "DLC")}</span>
			<button type="button" class="svl-dlc-remove" data-index="${i}" title="Remover">✕</button>
		</div>`;
	}

	dlcSection(p) {
		const items = Array.isArray(p.dlc) ? p.dlc : [];
		const doneCount = items.filter(d => d?.completed).length;
		const summary = items.length ? `<div class="svl-dlc-summary">${doneCount}/${items.length} concluídas</div>` : "";
		const list = items.length
			? `<div class="svl-dlc-list svl-list-card">${items.map((d, i) => this.dlcRow(d, i)).join("")}</div>`
			: this.emptyHint("📦", "Nenhuma DLC cadastrada ainda.", { type: "dlc" });
		return `${summary}${list}
			<div class="svl-add-wrap svl-add-wrap-sm">
				<button type="button" class="svl-add-btn svl-add-btn-sm" id="svl-dlc-toggle">
					<span class="svl-add-btn-icon">+</span> Adicionar DLC
				</button>
				<div class="svl-form" id="svl-dlc-form">
					<div class="svl-form-inner">
						<div class="svl-field">
							<label for="svl-dlc-name">Nome da DLC *</label>
							<input type="text" class="svl-input" id="svl-dlc-name" placeholder="Ex: Ashes of Ariandel">
						</div>
						<div class="svl-form-actions">
							<button type="button" class="svl-btn-ghost" id="svl-dlc-cancel">Cancelar</button>
							<button type="button" class="svl-btn-primary" id="svl-dlc-submit">Adicionar</button>
						</div>
						<div class="svl-form-msg" id="svl-dlc-msg"></div>
					</div>
				</div>
			</div>`;
	}

	wireDlcSection(root, p) {
		const toggleBtn = root.querySelector("#svl-dlc-toggle");
		const form = root.querySelector("#svl-dlc-form");
		const cancelBtn = root.querySelector("#svl-dlc-cancel");
		const submitBtn = root.querySelector("#svl-dlc-submit");
		const msg = root.querySelector("#svl-dlc-msg");
		const fileOf = () => { const f = app.vault.getAbstractFileByPath(p.file.path); if (!f) throw new Error("arquivo não encontrado"); return f; };
		// a lista na tela acompanha cada mudança (antes só aparecia
		// "Adicionada!" e a lista ficava igual até reabrir a janela)
		const syncList = () => {
			const rows = [...root.querySelectorAll(".svl-dlc-row")];
			rows.forEach((r, i) => { r.dataset.index = i; r.querySelectorAll("[data-index]").forEach(b => { b.dataset.index = i; }); });
			const done = rows.filter(r => r.classList.contains("is-done")).length;
			let sum = root.querySelector(".svl-dlc-summary");
			if (rows.length) {
				if (!sum) { sum = document.createElement("div"); sum.className = "svl-dlc-summary"; root.querySelector(".svl-dlc-list")?.before(sum); }
				sum.textContent = `${done}/${rows.length} concluídas`;
			} else {
				sum?.remove();
				root.querySelector(".svl-dlc-list")?.remove();
				if (!root.querySelector(".svl-empty-hint")) root.querySelector(".svl-add-wrap")?.insertAdjacentHTML("beforebegin", this.emptyHint("📦", "Nenhuma DLC cadastrada ainda.", { type: "dlc" }));
			}
		};
		const paintRow = (row, done) => {
			row.classList.toggle("is-done", done);
			const b = row.querySelector(".svl-dlc-check");
			if (b) { b.setAttribute("aria-pressed", String(done)); b.title = done ? "Concluída — toque para desmarcar" : "Marcar como concluída"; b.setAttribute("aria-label", done ? "Desmarcar DLC" : "Concluir DLC"); }
		};

		if (toggleBtn && form) {
			const openForm = () => { form.classList.add("is-open"); toggleBtn.classList.add("is-open"); form.style.maxHeight = (form.scrollHeight + 40) + "px"; setTimeout(() => root.querySelector("#svl-dlc-name")?.focus(), 60); };
			const closeForm = () => { form.style.maxHeight = "0px"; form.classList.remove("is-open"); toggleBtn.classList.remove("is-open"); };
			toggleBtn.addEventListener("click", () => form.classList.contains("is-open") ? closeForm() : openForm());
			cancelBtn?.addEventListener("click", closeForm);
			const add = async () => {
				const input = root.querySelector("#svl-dlc-name");
				const title = input?.value.trim();
				if (!title) { msg.textContent = "Dê um nome à DLC antes de continuar."; msg.className = "svl-form-msg is-error"; return; }
				submitBtn.disabled = true;
				try {
					await app.fileManager.processFrontMatter(fileOf(), fm => {
						if (!Array.isArray(fm.dlc)) fm.dlc = [];
						fm.dlc.push({ title, completed: false });
					});
					root.querySelector(".svl-empty-hint")?.remove();
					let list = root.querySelector(".svl-dlc-list");
					if (!list) { list = document.createElement("div"); list.className = "svl-dlc-list svl-list-card"; root.querySelector(".svl-add-wrap")?.before(list); }
					list.insertAdjacentHTML("beforeend", this.dlcRow({ title, completed: false }, list.children.length));
					this._svgifyIcons?.(list);
					syncList();
					msg.textContent = `“${title}” adicionada.`;
					msg.className = "svl-form-msg is-success";
					input.value = ""; input.focus();
				} catch (err) {
					console.error("Game Library: falha ao adicionar DLC", err);
					msg.textContent = "Não foi possível adicionar. Veja o console.";
					msg.className = "svl-form-msg is-error";
				} finally {
					submitBtn.disabled = false;
				}
			};
			submitBtn?.addEventListener("click", add);
			root.querySelector("#svl-dlc-name")?.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); add(); } });
		}

		// concluir / desmarcar e remover: um ouvinte só, que lê o índice
		// atual da linha (remover uma DLC não desloca as outras)
		root.addEventListener("click", async e => {
			const chk = e.target.closest(".svl-dlc-check"), rm = e.target.closest(".svl-dlc-remove");
			const btn = chk || rm;
			if (!btn || !root.contains(btn) || btn.disabled) return;
			const row = btn.closest(".svl-dlc-row");
			const idx = Number(row?.dataset.index);
			if (!row || !Number.isInteger(idx)) return;
			if (chk) {
				const done = !row.classList.contains("is-done");
				paintRow(row, done); syncList(); globalThis.customJS?.SteamVault?._haptic?.();
				try {
					await app.fileManager.processFrontMatter(fileOf(), fm => {
						if (!Array.isArray(fm.dlc) || fm.dlc[idx] === undefined) return;
						const cur = fm.dlc[idx];
						fm.dlc[idx] = typeof cur === "object" && cur ? { ...cur, completed: done } : { title: String(cur || "DLC"), completed: done };
					});
				} catch (err) {
					console.error("Game Library: falha ao atualizar DLC", err);
					paintRow(row, !done); syncList();
				}
				return;
			}
			btn.disabled = true;
			row.style.display = "none";
			try {
				await app.fileManager.processFrontMatter(fileOf(), fm => { if (Array.isArray(fm.dlc)) fm.dlc.splice(idx, 1); });
				row.remove(); syncList();
			} catch (err) {
				console.error("Game Library: falha ao remover DLC", err);
				row.style.display = ""; btn.disabled = false;
			}
		});
	}

	// ---------------------------------------------------------- diário de sessões
	sessionRow(s) {
		const hours = s?.hours > 0 ? `<span class="svl-session-hours">${this.esc(s.hours)}h</span>` : "";
		const mood = s?.mood ? `<span class="svl-session-mood" title="Como foi essa sessão">${this.esc(s.mood)}</span>` : "";
		const progress = (s?.progress !== undefined && s?.progress !== "" && s?.progress !== null)
			? `<span class="svl-session-progress">${this.esc(s.progress)}%</span>` : "";
		return `<div class="svl-session-row">
			<div class="svl-session-main">
				<span class="svl-session-date">${this.esc(this.formatDateValue(s?.date))} ${mood}</span>
				<span class="svl-session-note">${this.esc(s?.note || "")}</span>
			</div>
			<div class="svl-session-side">${progress}${hours}</div>
		</div>`;
	}

	gameTimeline(p) {
		const events = [];
		if (p.dateAdded) events.push({ date: this.dateISO(p.dateAdded), icon: "🆕", label: "Adicionado à biblioteca" });
		for (const s of (p.sessions || [])) {
			const iso = this.dateISO(s?.date);
			if (!iso) continue;
			events.push({ date: iso, icon: s?.mood || "🎮", label: s?.note || "Sessão de jogo" });
		}
		if (this.isCompletedStatus(p.status) && p.lastPlayed) {
			events.push({ date: this.dateISO(p.lastPlayed), icon: "🏁", label: "Concluído" });
		}
		if (events.length < 2) return "";
		events.sort((a, b) => a.date.localeCompare(b.date));
		const rows = events.map(e => `<div class="svl-timeline-row">
			<span class="svl-timeline-icon">${e.icon}</span>
			<span class="svl-timeline-date">${this.esc(this.formatDateValue(e.date))}</span>
			<span class="svl-timeline-label">${this.esc(e.label)}</span>
		</div>`).join("");
		return `<div class="svl-timeline-toggle-wrap">
			<button type="button" class="svl-picker-btn" id="svl-timeline-toggle">🗓️ Ver linha do tempo</button>
			<div class="svl-timeline" id="svl-timeline-body" style="display:none;">${rows}</div>
		</div>`;
	}

	sessionsSection(p) {
		const sessions = Array.isArray(p.sessions) ? [...p.sessions].reverse() : [];
		const list = sessions.length
			? `<div class="svl-session-list svl-list-card">${sessions.map(s => this.sessionRow(s)).join("")}</div>`
			: this.emptyHint("📓", "Nenhuma sessão registrada ainda.", { type: "diary" });
		return `${this.gameTimeline(p)}${list}
			<div class="svl-add-wrap svl-add-wrap-sm">
				<button type="button" class="svl-add-btn svl-add-btn-sm" id="svl-ses-toggle">
					<span class="svl-add-btn-icon">+</span> Registrar sessão
				</button>
				<div class="svl-form" id="svl-ses-form">
					<div class="svl-form-inner">
						<div class="svl-field">
							<label for="svl-ses-note">O que rolou? *</label>
							<input type="text" class="svl-input" id="svl-ses-note" placeholder="Ex: Cheguei no chefe final">
						</div>
						<div class="svl-field">
							<label for="svl-ses-hours">Horas jogadas nessa sessão (opcional)</label>
							<input type="number" class="svl-input" id="svl-ses-hours" min="0" step="0.5" placeholder="0">
						</div>
						<div class="svl-field">
							<label for="svl-ses-mood">Como foi? (opcional)</label>
							<select class="svl-input" id="svl-ses-mood">
								<option value="">—</option>
								<option value="😍">😍 Excelente</option>
								<option value="🙂">🙂 Boa</option>
								<option value="😐">😐 Normal</option>
								<option value="😕">😕 Fraca</option>
								<option value="😡">😡 Frustrante</option>
							</select>
						</div>
						<div class="svl-field">
							<label for="svl-ses-progress">Progresso no jogo até aqui, % (opcional)</label>
							<input type="number" class="svl-input" id="svl-ses-progress" min="0" max="100" placeholder="Ex: 40">
						</div>
						<div class="svl-form-actions">
							<button type="button" class="svl-btn-ghost" id="svl-ses-cancel">Cancelar</button>
							<button type="button" class="svl-btn-primary" id="svl-ses-submit">Registrar</button>
						</div>
						<div class="svl-form-msg" id="svl-ses-msg"></div>
					</div>
				</div>
			</div>`;
	}

	wireSessionsSection(root, p) {
		const timelineToggle = root.querySelector("#svl-timeline-toggle");
		const timelineBody = root.querySelector("#svl-timeline-body");
		timelineToggle?.addEventListener("click", () => {
			const isOpen = timelineBody.style.display !== "none";
			timelineBody.style.display = isOpen ? "none" : "flex";
			timelineToggle.textContent = isOpen ? "🗓️ Ver linha do tempo" : "🗓️ Esconder linha do tempo";
		});

		const toggleBtn = root.querySelector("#svl-ses-toggle");
		const form = root.querySelector("#svl-ses-form");
		const cancelBtn = root.querySelector("#svl-ses-cancel");
		const submitBtn = root.querySelector("#svl-ses-submit");
		const msg = root.querySelector("#svl-ses-msg");
		if (!toggleBtn || !form) return;

		const openForm = () => { form.classList.add("is-open"); toggleBtn.classList.add("is-open"); form.style.maxHeight = (form.scrollHeight + 40) + "px"; };
		const closeForm = () => { form.style.maxHeight = "0px"; form.classList.remove("is-open"); toggleBtn.classList.remove("is-open"); };
		toggleBtn.addEventListener("click", () => form.classList.contains("is-open") ? closeForm() : openForm());
		cancelBtn?.addEventListener("click", closeForm);

		submitBtn?.addEventListener("click", async () => {
			const note = root.querySelector("#svl-ses-note")?.value.trim();
			if (!note) {
				msg.textContent = "Escreva alguma coisa antes de registrar.";
				msg.className = "svl-form-msg is-error";
				return;
			}
			const hours = Number(root.querySelector("#svl-ses-hours")?.value) || 0;
			const mood = root.querySelector("#svl-ses-mood")?.value || "";
			const progressVal = root.querySelector("#svl-ses-progress")?.value;
			const progress = progressVal !== "" && progressVal !== undefined ? Math.min(100, Math.max(0, Number(progressVal) || 0)) : "";
			submitBtn.disabled = true;
			try {
				const file = app.vault.getAbstractFileByPath(p.file.path);
				if (!file) throw new Error("arquivo não encontrado");
				const today = customJS.SteamVaultCore.today();
				await app.fileManager.processFrontMatter(file, fm => {
					if (!Array.isArray(fm.sessions)) fm.sessions = [];
					const entry = { date: today, note, hours };
					if (mood) entry.mood = mood;
					if (progress !== "") entry.progress = progress;
					fm.sessions.push(entry);
					// arredonda pra 2 casas a cada soma, senão o erro de ponto
					// flutuante vai se acumulando a cada sessão registrada e o
					// valor guardado no frontmatter vira algo como 45.34999999999999
					if (hours > 0) fm.hoursPlayed = Math.round(((Number(fm.hoursPlayed) || 0) + hours) * 100) / 100;
					fm.lastPlayed = today;
					// registrar uma sessão significa que o jogo saiu da fila —
					// atualiza o status sozinho, sem precisar editar à mão
					if (fm.status === "Backlog" || fm.status === "Wishlist") fm.status = "Playing";
					if (!fm.startDate) fm.startDate = today;
				});
				const dl = await customJS.SteamVaultCare?.logSessionToDaily?.({ path: p.file.path, title: p.title || p.file.basename, hours, note }, customJS.SteamVault);
				msg.textContent = dl?.ok ? "Registrada! Também anotada na nota diária." : "Registrada!";
				customJS.SteamVault?.sfx?.("save");
				msg.className = "svl-form-msg is-success";
				root.querySelector("#svl-ses-note").value = "";
				root.querySelector("#svl-ses-hours").value = "";
				root.querySelector("#svl-ses-mood").value = "";
				root.querySelector("#svl-ses-progress").value = "";
			} catch (err) {
				console.error("Game Library: falha ao registrar sessão", err);
				msg.textContent = "Não foi possível registrar. Veja o console.";
				msg.className = "svl-form-msg is-error";
			} finally {
				submitBtn.disabled = false;
			}
		});
	}

	// ------------------------------------------------------------------ notas
	// mesma ideia do diário de sessões, mas sem data obrigatória — pra
	// lembretes soltos (senha de um cofre, dica de puzzle, onde parou)
	noteRow(n, i) {
		const text = typeof n === "string" ? n : (n?.text || "");
		const category = typeof n === "object" ? n?.category : "";
		const icon = this.noteCategoryIcons[category] || "📝";
		const tag = category ? `<span class="svl-note-category">${this.esc(category)}</span>` : "";
		return `<div class="svl-note-row" data-index="${i}">
			<span class="svl-soundtrack-icon">${icon}</span>
			<span class="svl-note-text">${tag}${this.esc(text)}</span>
			<button type="button" class="svl-soundtrack-editbtn" data-index="${i}" title="Editar">✏️</button>
			<button type="button" class="svl-soundtrack-remove" data-index="${i}" title="Remover">✕</button>
		</div>`;
	}

	notesSection(p) {
		const notes = Array.isArray(p.notes) ? p.notes : [];
		const list = notes.length
			? `<div class="svl-notes-list svl-list-card">${notes.map((n, i) => this.noteRow(n, i)).join("")}</div>`
			: this.emptyHint("📝", "Nenhuma nota ainda — anote uma dica, uma senha, ou só um lembrete de onde parou.", { type: "note" });
		return `${list}
			<div class="svl-add-wrap svl-add-wrap-sm">
				<button type="button" class="svl-add-btn svl-add-btn-sm" id="svl-note-toggle">
					<span class="svl-add-btn-icon">+</span> Adicionar nota
				</button>
				<div class="svl-form" id="svl-note-form">
					<div class="svl-form-inner">
						<div class="svl-field">
							<label for="svl-note-text">Nota *</label>
							<textarea class="svl-textarea" id="svl-note-text" rows="2" placeholder="Ex: A senha do cofre é 4-7-2"></textarea>
						</div>
						<div class="svl-field">
							<label for="svl-note-category">Categoria (opcional)</label>
							<select class="svl-input" id="svl-note-category">
								<option value="">—</option>
								${Object.keys(this.noteCategoryIcons).map(c => `<option value="${this.esc(c)}">${this.noteCategoryIcons[c]} ${this.esc(c)}</option>`).join("")}
							</select>
						</div>
						<div class="svl-form-actions">
							<button type="button" class="svl-btn-ghost" id="svl-note-cancel">Cancelar</button>
							<button type="button" class="svl-btn-primary" id="svl-note-submit">Adicionar</button>
						</div>
						<div class="svl-form-msg" id="svl-note-msg"></div>
					</div>
				</div>
			</div>`;
	}

	wireNotesSection(root, p) {
		const notes = Array.isArray(p.notes) ? p.notes : [];
		const toggleBtn = root.querySelector("#svl-note-toggle");
		const form = root.querySelector("#svl-note-form");
		const cancelBtn = root.querySelector("#svl-note-cancel");
		const submitBtn = root.querySelector("#svl-note-submit");
		const msg = root.querySelector("#svl-note-msg");
		const textArea = root.querySelector("#svl-note-text");

		if (toggleBtn && form) {
			const openForm = () => { form.classList.add("is-open"); toggleBtn.classList.add("is-open"); form.style.maxHeight = (form.scrollHeight + 40) + "px"; };
			const closeForm = () => {
				form.style.maxHeight = "0px";
				form.classList.remove("is-open");
				toggleBtn.classList.remove("is-open");
				delete form.dataset.editingIndex;
				submitBtn.textContent = "Adicionar";
			};
			toggleBtn.addEventListener("click", () => form.classList.contains("is-open") ? closeForm() : openForm());
			cancelBtn?.addEventListener("click", closeForm);

			submitBtn?.addEventListener("click", async () => {
				const text = textArea?.value.trim();
				if (!text) {
					msg.textContent = "Escreva alguma coisa antes de continuar.";
					msg.className = "svl-form-msg is-error";
					return;
				}
				const category = root.querySelector("#svl-note-category")?.value || "";
				const editingIndex = form.dataset.editingIndex;
				submitBtn.disabled = true;
				try {
					const file = app.vault.getAbstractFileByPath(p.file.path);
					if (!file) throw new Error("arquivo não encontrado");
					await app.fileManager.processFrontMatter(file, fm => {
						if (!Array.isArray(fm.notes)) fm.notes = [];
						const entry = category ? { text, category } : text;
						if (editingIndex !== undefined && fm.notes[Number(editingIndex)] !== undefined) {
							// editar o texto não desafixa a nota da Visão geral
							const prev = fm.notes[Number(editingIndex)];
							fm.notes[Number(editingIndex)] = prev && typeof prev === "object" && prev.pinned ? { ...(typeof entry === "string" ? { text: entry } : entry), pinned: true } : entry;
						} else {
							fm.notes.push(entry);
						}
					});
					msg.textContent = editingIndex !== undefined ? "Salva!" : "Adicionada!";
					msg.className = "svl-form-msg is-success";
					textArea.value = "";
					root.querySelector("#svl-note-category").value = "";
					delete form.dataset.editingIndex;
					submitBtn.textContent = "Adicionar";
				} catch (err) {
					console.error("Game Library: falha ao salvar nota", err);
					msg.textContent = "Não foi possível salvar. Veja o console.";
					msg.className = "svl-form-msg is-error";
				} finally {
					submitBtn.disabled = false;
				}
			});

			root.querySelectorAll(".svl-note-row .svl-soundtrack-editbtn").forEach(btn => {
				btn.addEventListener("click", () => {
					const idx = Number(btn.dataset.index);
					const n = notes[idx];
					if (n === undefined) return;
					const text = typeof n === "string" ? n : (n?.text || "");
					const category = typeof n === "object" ? (n?.category || "") : "";
					form.dataset.editingIndex = String(idx);
					textArea.value = text;
					root.querySelector("#svl-note-category").value = category;
					submitBtn.textContent = "Salvar";
					openForm();
				});
			});
		}

		root.querySelectorAll(".svl-note-row .svl-soundtrack-remove").forEach(btn => {
			btn.addEventListener("click", async () => {
				const idx = Number(btn.dataset.index);
				const row = btn.closest(".svl-note-row");
				if (row) row.style.display = "none";
				btn.disabled = true;
				try {
					const file = app.vault.getAbstractFileByPath(p.file.path);
					if (!file) throw new Error("arquivo não encontrado");
					await app.fileManager.processFrontMatter(file, fm => {
						if (Array.isArray(fm.notes)) fm.notes.splice(idx, 1);
					});
				} catch (err) {
					console.error("Game Library: falha ao remover nota", err);
					if (row) row.style.display = "";
					btn.disabled = false;
				}
			});
		});
	}
}
