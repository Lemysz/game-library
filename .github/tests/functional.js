// Testes funcionais: além de abrir as telas (smoke.js), clica, filtra, abre e
// fecha janelas e confere o que foi gravado nas notas (o harness guarda as
// notas em memória, nada sai do processo). Roda em ~1 minuto.
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("playwright-core")); }
const { start } = require("./server");

const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok }); console.log(`${ok ? "ok  " : "FAIL"} ${name}${!ok && detail ? `\n     ${detail}` : ""}`); };

(async () => {
	const { server, url } = await start();
	const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
	const ctx = await browser.newContext({ viewport: { width: 410, height: 887 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
	const p = await ctx.newPage();
	const errors = [];
	p.on("pageerror", e => errors.push(e.message));
	const go = async path => { await p.evaluate(x => go(x), path); await p.waitForTimeout(600); };
	const fm = path => p.evaluate(x => __PAGES.find(y => y.path === x)?.fm, path);
	const click = sel => p.evaluate(s => { const el = document.querySelector(s); if (!el) return false; el.click(); return true; }, sel);
	const count = sel => p.evaluate(s => document.querySelectorAll(s).length, sel);
	const visible = sel => p.evaluate(s => [...document.querySelectorAll(s)].filter(e => e.getClientRects().length && !e.closest("[hidden]")).length, sel);
	const modalOpen = () => p.evaluate(() => !!document.querySelector(".sv-modal-root.is-open"));
	const closeModal = async () => { await p.keyboard.press("Escape"); await p.waitForTimeout(350); };

	await p.goto(url + "?p=Dashboard/Home.md");
	await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
	const games = await p.evaluate(() => __PAGES.filter(x => x.fm?.type === "game" && !x.path.includes("_Templates")).map(x => x.path));
	const game = games[0];

	// ---- Biblioteca: busca, filtro por status, visualizações
	await go("Dashboard/Biblioteca.md");
	const total = await visible(".sv-library .sv-grid > .sv-card");
	check("biblioteca mostra os jogos", total === games.length, `${total} de ${games.length}`);
	const firstTitle = await p.evaluate(() => document.querySelector(".sv-library .sv-card .sv-card-title")?.textContent.trim() || "");
	await p.fill("[data-lib-q]", firstTitle.slice(0, 5)); await p.waitForTimeout(400);
	const afterSearch = await visible(".sv-library .sv-grid > .sv-card");
	check("busca da biblioteca filtra", afterSearch >= 1 && afterSearch <= total);
	await p.fill("[data-lib-q]", "zzzz-nada"); await p.waitForTimeout(400);
	check("busca sem resultado mostra o aviso", await visible(".sv-noresults") === 1);
	await click("[data-lib-clear]"); await p.waitForTimeout(300);
	check("limpar filtros volta tudo", await visible(".sv-library .sv-grid > .sv-card") === total);
	const status = await p.evaluate(() => document.querySelector("[data-lib-status]")?.dataset.libStatus);
	await click(`.sv-libsum-legend [data-lib-status="${status}"]`); await p.waitForTimeout(300);
	const byStatus = await visible(".sv-library .sv-grid > .sv-card");
	const expected = await p.evaluate(s => __PAGES.filter(x => x.fm?.type === "game" && !x.path.includes("_Templates") && x.fm.status === s).length, status);
	check(`filtro por status (${status})`, byStatus === expected, `${byStatus} ≠ ${expected}`);
	await click("[data-lib-clear]"); await p.waitForTimeout(300);
	await click('.sv-libviews [data-view="list"]'); await p.waitForTimeout(300);
	check("visualização em lista", await visible(".sv-liblist .sv-librow, .sv-liblist > *") > 0);
	await click('.sv-libviews [data-view="grid"]'); await p.waitForTimeout(300);
	await click("[data-lib-filters]"); await p.waitForTimeout(400);
	check("janela de filtros abre", await modalOpen() || await visible(".sv-libsheet, .sv-sheet") > 0);
	await closeModal();
	check("janela de filtros fecha com Esc", !(await modalOpen()));

	// ---- visões salvas (3.60.0)
	await click(`.sv-libsum-legend [data-lib-status="${status}"]`); await p.waitForTimeout(300);
	await click("[data-lib-saveview]"); await p.waitForTimeout(400);
	check("visão salva: pede o nome", await modalOpen() && await count("#sv-libview-name") === 1);
	await p.fill("#sv-libview-name", "Teste visão"); await p.keyboard.press("Enter"); await p.waitForTimeout(400);
	const savedViews = await p.evaluate(() => JSON.parse(localStorage.getItem("steamvault:ui:lib:views") || "[]"));
	check("visão salva: guarda filtros e aparece nos atalhos", savedViews.length === 1 && savedViews[0].s.status.includes(status) && await count('.sv-qviews [data-q-view]') === 1, JSON.stringify(savedViews));
	await click("[data-lib-clear]"); await p.waitForTimeout(300);
	await click(".sv-qviews [data-q-view]"); await p.waitForTimeout(300);
	check("visão salva: um toque reaplica o filtro", await visible(".sv-library .sv-grid > .sv-card") === expected && await p.evaluate(() => document.querySelector(".sv-qviews [data-q-view]").classList.contains("is-active")) && await count("[data-lib-editview]") === 1);
	await p.dispatchEvent(".sv-qviews [data-q-view]", "contextmenu"); await p.waitForTimeout(400);
	check("visão salva: toque longo abre o menu", await modalOpen() && await count('[data-vm="del"]') === 1);
	await click('[data-vm="del"]'); await p.waitForTimeout(400);
	await click(".sv-modal-root.is-open [data-ok], .sv-modal-root.is-open .sv-btn--danger"); await p.waitForTimeout(400);
	check("visão salva: excluir tira o atalho", await count(".sv-qviews [data-q-view]") === 0 && await p.evaluate(() => JSON.parse(localStorage.getItem("steamvault:ui:lib:views") || "[]").length === 0));
	await click("[data-lib-clear]"); await p.waitForTimeout(300);
	// "Ver todos" de uma faixa abre a Biblioteca filtrada
	await p.evaluate(() => { window.__svLibFilter = { fav: true }; }); await go("Dashboard/Biblioteca.md");
	const favs = await p.evaluate(() => __PAGES.filter(x => x.fm?.type === "game" && !x.path.includes("_Templates") && (x.fm.favorite === true || x.fm.favorite === "true")).length);
	check("Ver todos: a Biblioteca abre com o filtro da faixa", await visible(".sv-library .sv-grid > .sv-card") === favs && await count('[data-lib-active] [data-rm="fav"]') === 1, String(favs));
	await click("[data-lib-clear]"); await p.waitForTimeout(300);

	// ---- Coleções no padrão dos gêneros (3.61.0)
	await go("Dashboard/Coleções.md");
	const nCols = await p.evaluate(() => __PAGES.filter(x => x.fm?.type === "collection" && !x.path.includes("_Templates")).length);
	check("Coleções: painel de curadoria e um card por coleção", await count(".sv-dna--col") === 1 && await count(".sv-gtiles--col > .sv-gtile--col") === nCols, String(nCols));
	check("Coleções: sem os cards coloridos antigos", await count(".sv-hubpage--collections .sv-ccard") === 0);
	if (await count("[data-hub-q]")) {
		const firstCol = await p.evaluate(() => document.querySelector(".sv-gtile--col")?.dataset.name || "");
		await p.fill("[data-hub-q]", firstCol.slice(0, 5)); await p.waitForTimeout(250);
		check("Coleções: a busca filtra os cards", await visible(".sv-gtile--col") >= 1 && await visible(".sv-gtile--col") <= nCols);
		await p.fill("[data-hub-q]", ""); await p.waitForTimeout(150);
	}
	if (await count(".sv-gtile--smart")) {
		await click(".sv-gtile--smart"); await p.waitForTimeout(600);
		check("Coleções: automática abre a página dela", await count('[data-action="smart-back"]') === 1);
		await click('[data-action="smart-back"]'); await p.waitForTimeout(600);
		check("Coleções: voltar da automática", await count(".sv-dna--col") === 1);
	}
	const colPath = await p.evaluate(() => document.querySelector(".sv-gtile--col")?.getAttribute("data-open") || "");
	await click(".sv-gtile--col"); await p.waitForTimeout(700);
	check("Coleções: o card abre a coleção", await p.evaluate(() => !!document.querySelector(".sv-colpage")) && !!colPath);

	// ---- formulários: criar, editar e persistir (3.62.0)
	const openAction = (attrs) => p.evaluate(a => { const b = document.createElement("button"); b.type = "button"; b.hidden = true; for (const [k, v] of Object.entries(a)) b.dataset[k] = v; document.querySelector(".sv-app").appendChild(b); b.click(); b.remove(); }, attrs);
	const setVal = (sel, v) => p.evaluate(([s, v]) => { const el = document.querySelector(s); if (!el) return false; el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); return true; }, [sel, v]);
	const RE4 = "Games/PC/Resident Evil 4.md";
	await go("Dashboard/Biblioteca.md");
	await openAction({ action: "add-game" }); await p.waitForTimeout(500);
	check("Adicionar jogo: o formulário abre", await count("#svl-f-title") === 1 && await count("#svl-f-submit") === 1);
	await setVal("#svl-f-title", "Jogo de Teste Formulário");
	await setVal("#svl-f-platform", await p.evaluate(() => [...document.querySelectorAll("#svl-f-platform option")].map(o => o.value).find(v => v === "PS2") || document.querySelector("#svl-f-platform option").value));
	await setVal("#svl-f-status", "Backlog");
	await setVal("#svl-f-franchise", "Saga Teste");
	await p.evaluate(() => { const r = document.querySelector('[name="svl-f-ach-sync"][value="manual"], [data-sync="manual"], [data-v="manual"]'); r?.click(); });
	await click("#svl-f-submit"); await p.waitForTimeout(900);
	const created = await p.evaluate(() => (window.__created || []).find(x => /Jogo de Teste Formul/.test(x)) || "");
	const cfm = created ? await fm(created) : null;
	check("Adicionar jogo: cria a ficha com os campos preenchidos", !!cfm && cfm.title === "Jogo de Teste Formulário" && cfm.status === "Backlog" && cfm.franchise === "Saga Teste" && cfm.type === "game", JSON.stringify({ created, cfm: cfm && { title: cfm.title, status: cfm.status, franchise: cfm.franchise, platform: cfm.platform } }));
	await closeModal();
	await go(RE4);
	const fBefore = await fm(RE4);
	await openAction({ action: "manage", section: "details", path: RE4 }); await p.waitForTimeout(600);
	check("Editar detalhes: abre com os valores atuais", await p.evaluate(v => document.querySelector("#svl-de-franchise")?.value === (v || ""), fBefore.franchise));
	await setVal("#svl-de-franchise", "Resident Evil (teste)");
	await setVal("#svl-de-rating", "4");
	await click("#svl-de-save"); await p.waitForTimeout(700);
	const fAfter = await fm(RE4);
	check("Editar detalhes: grava o que mudou", fAfter.franchise === "Resident Evil (teste)" && Number(fAfter.rating) === 4, JSON.stringify({ franchise: fAfter.franchise, rating: fAfter.rating }));
	check("Editar detalhes: preserva o resto (ano, plataforma, gêneros, sinopse)", String(fAfter.releaseYear) === String(fBefore.releaseYear) && fAfter.platform === fBefore.platform && JSON.stringify(fAfter.genre) === JSON.stringify(fBefore.genre) && fAfter.summary === fBefore.summary, JSON.stringify({ y: [fBefore.releaseYear, fAfter.releaseYear], g: [fBefore.genre, fAfter.genre] }));
	await p.evaluate(([path, v]) => { const x = __PAGES.find(y => y.path === path); x.fm.franchise = v.franchise; x.fm.rating = v.rating; }, [RE4, { franchise: fBefore.franchise, rating: fBefore.rating }]);
	await closeModal();
	await openAction({ action: "manage", section: "sessions", path: RE4 }); await p.waitForTimeout(600);
	await setVal("#svl-ses-note", "Sessão de teste do formulário");
	await setVal("#svl-ses-hours", "1.5");
	const writes0 = await p.evaluate(() => window.__fmWrites || 0);
	await click("#svl-ses-submit"); await p.waitForTimeout(700);
	const ses = await fm(RE4);
	check("Diário de sessões: registra a sessão", (await p.evaluate(() => window.__fmWrites || 0)) > writes0 && JSON.stringify(ses.sessions || ses.sessionLog || "").includes("Sessão de teste do formulário"), JSON.stringify(ses.sessions || null).slice(0, 200));
	await closeModal();
	await go("Dashboard/Coleções.md");
	await openAction({ action: "legacy", legacy: "addCollection" }); await p.waitForTimeout(500);
	await setVal("#svl-ac-title", "Coleção de Teste");
	await setVal("#svl-ac-desc", "Criada pelo teste");
	await click("#svl-ac-submit"); await p.waitForTimeout(900);
	const ccol = await p.evaluate(() => (window.__created || []).find(x => /Cole..o de Teste/.test(x)) || "");
	const ccfm = ccol ? await fm(ccol) : null;
	check("Nova coleção: cria a nota com nome e descrição", !!ccfm && /Teste/.test(ccfm.title || "") && (ccfm.description || "").includes("Criada pelo teste"), JSON.stringify({ ccol, ccfm }));
	await closeModal();
	// 3.65.0: formulários simples nativos (antes no SteamVaultLegacy)
		await go("Dashboard/Gêneros.md");
	await openAction({ action: "legacy", legacy: "addGenre" }); await p.waitForTimeout(500);
	check("Novo gênero: abre como janela nativa", await count(".sv-modal .sv-simpleform #svl-ag-name") === 1 && await count(".sv-modal-foot #svl-ag-submit, .sv-modal #svl-ag-submit") === 1);
	await click("#svl-ag-submit"); await p.waitForTimeout(300);
	check("Novo gênero: sem nome mostra o erro e marca o campo", (await p.evaluate(() => document.querySelector(".sv-simpleform .svl-form-msg")?.textContent || "")).includes("Dê um nome") && await count("#svl-ag-name[aria-invalid=true]") === 1);
	const gBefore = JSON.stringify((await fm("Dashboard/Gêneros.md"))?.customSubgenres ?? null);
	await setVal("#svl-ag-name", "Subgênero Teste");
	await click('#svl-ag-type [data-value="subgenre"]');
	await click("#svl-ag-submit"); await p.waitForTimeout(700);
	const gfm = await fm("Dashboard/Gêneros.md");
	const gnote = await p.evaluate(() => (window.__created || []).find(x => /Subg.nero Teste/.test(x)) || "");
	check("Novo subgênero: grava em customSubgenres e cria a página em Subgenres/", (gfm?.customSubgenres || []).includes("Subgênero Teste") && gnote.startsWith("Subgenres/"), JSON.stringify({ sub: gfm?.customSubgenres, gnote }));
	await p.evaluate(v => { const x = __PAGES.find(y => y.path === "Dashboard/Gêneros.md"); const old = JSON.parse(v); if (old === null) delete x.fm.customSubgenres; else x.fm.customSubgenres = old; }, gBefore);
	await closeModal();
	await go("Dashboard/Plataformas.md");
	await openAction({ action: "legacy", legacy: "addPlatform" }); await p.waitForTimeout(500);
	await setVal("#svl-ap-name", "Console Teste");
	await p.focus("#svl-ap-name"); await p.keyboard.press("Enter"); await p.waitForTimeout(700);
	const pfm = await fm("Dashboard/Plataformas.md");
	check("Nova plataforma: Enter salva e grava em customPlatforms", (pfm?.customPlatforms || []).includes("Console Teste"), JSON.stringify(pfm?.customPlatforms));
	await p.evaluate(() => { const x = __PAGES.find(y => y.path === "Dashboard/Plataformas.md"); x.fm.customPlatforms = (x.fm.customPlatforms || []).filter(n => n !== "Console Teste"); });
	await setVal("#svl-ap-name", "PS2"); await click("#svl-ap-submit"); await p.waitForTimeout(400);
	check("Nova plataforma: recusa uma que já existe", (await p.evaluate(() => document.querySelector(".sv-simpleform .svl-form-msg")?.textContent || "")).includes("já existe"));
	await closeModal();
	await go("Collections/Favoritos.md");
	const cBefore = (await fm("Collections/Favoritos.md"))?.description;
	await openAction({ action: "legacy", legacy: "editCollection" }); await p.waitForTimeout(500);
	check("Editar coleção: vem com a descrição atual", (await p.evaluate(() => document.querySelector("#svl-cc-desc")?.value || "")) === String(cBefore || ""));
	await setVal("#svl-cc-desc", "Descrição do teste"); await click("#svl-cc-save"); await p.waitForTimeout(600);
	check("Editar coleção: grava a descrição", (await fm("Collections/Favoritos.md"))?.description === "Descrição do teste");
	await p.evaluate(v => { __PAGES.find(y => y.path === "Collections/Favoritos.md").fm.description = v; customJS.SteamVaultCore.invalidate?.(); }, cBefore ?? "");
	await closeModal();
	// busca da aba Coleções: com a coleção do teste passam a ser 4 (a barra só aparece acima de 3)
	await p.evaluate(() => { customJS.SteamVaultCore.invalidate?.(); }); await go("Dashboard/Coleções.md"); await p.waitForTimeout(500);
	if (await count("[data-hub-q]")) {
		await p.fill("[data-hub-q]", "Teste"); await p.waitForTimeout(250);
		check("Coleções: a busca filtra os cards (4+ coleções)", await visible(".sv-gtile--col") === 1);
		await p.fill("[data-hub-q]", "zzzz-nada"); await p.waitForTimeout(250);
		check("Coleções: busca sem resultado mostra o aviso", await visible(".sv-gtile--col") === 0 && await visible("[data-hub-empty]") === 1);
		await p.fill("[data-hub-q]", ""); await p.waitForTimeout(200);
	} else check("Coleções: barra de busca com 4+ coleções", false, String(await count(".sv-gtile--col")));
	// preço-alvo da Lista de desejos (um jogo vira "Lista de desejos" durante o teste)
	{
		const W = "Games/PS2/Bully.md";
		const w0 = await fm(W);
		await p.evaluate(path => { const x = __PAGES.find(y => y.path === path); x.fm.status = "Wishlist"; x.fm.currentPrice = 59.9; customJS.SteamVaultCore.invalidate?.(); }, W);
		await go("Dashboard/Lista de Desejos.md"); await p.waitForTimeout(500);
		check("Lista de desejos: botão de preço-alvo no jogo", await count('[data-action="wish-target"]') >= 1);
		await click('[data-action="wish-target"]'); await p.waitForTimeout(500);
		check("Preço-alvo: a janela abre com campo e sugestões", await modalOpen() && await count("#sv-wish-tgt") === 1);
		await setVal("#sv-wish-tgt", "39,90"); await click(".sv-modal-root.is-open [data-save]"); await p.waitForTimeout(600);
		check("Preço-alvo: grava o valor na ficha", Number((await fm(W)).targetPrice) === 39.9, String((await fm(W)).targetPrice));
		await p.evaluate(([path, o]) => { const x = __PAGES.find(y => y.path === path); x.fm.status = o.status; delete x.fm.currentPrice; x.fm.targetPrice = o.targetPrice ?? ""; customJS.SteamVaultCore.invalidate?.(); }, [W, w0]);
	}

	// ---- acabamento dos formulários (3.62.0)
	await go("Dashboard/Biblioteca.md");
	await openAction({ action: "add-game" }); await p.waitForTimeout(500);
	check("formulário: obrigatório marcado (ponto + aria-required)", await count('label[for="svl-f-title"] .sv-req') === 1 && await p.evaluate(() => document.querySelector("#svl-f-title").getAttribute("aria-required") === "true"));
	check("formulário: seções com título e imagens recolhidas", await count(".sv-modal-root .svl-sec") >= 5 && await p.evaluate(() => { const d = [...document.querySelectorAll(".sv-modal-root details.svl-sec")].find(x => x.querySelector("#svl-f-cover")); return !!d && !d.open; }));
	check("formulário: \"Remover\" escondido com a imagem vazia", await p.evaluate(() => { const b = document.querySelector("#svl-f-cover-clear"); return !!b && b.disabled && getComputedStyle(b).display === "none"; }));
	await p.evaluate(() => document.querySelector("#svl-f-title").blur());
	await click("#svl-f-submit"); await p.waitForTimeout(300);
	check("formulário: salvar vazio marca o erro e foca o campo", await p.evaluate(() => { const t = document.querySelector("#svl-f-title"); return t.getAttribute("aria-invalid") === "true" && document.activeElement === t; }));
	await setVal("#svl-f-title", "x");
	check("formulário: o erro some ao digitar", await p.evaluate(() => !document.querySelector("#svl-f-title").hasAttribute("aria-invalid")));
	await closeModal();
	await go(RE4);
	await openAction({ action: "manage", section: "sessions", path: RE4 }); await p.waitForTimeout(500);
	check("formulário: \"(opcional)\" vira etiqueta", await count(".sv-modal-root .sv-opt") >= 2 && await p.evaluate(() => ![...document.querySelectorAll(".sv-modal-root label")].some(l => /\(opcional\)/i.test(l.textContent))));
	await closeModal();
	await go("Dashboard/Estatísticas.md");
	await openAction({ action: "goals-edit" }); await p.waitForTimeout(500);
	check("Metas: os campos da nova meta têm rótulo visível", await p.evaluate(() => [...document.querySelectorAll(".sv-goal-fl")].map(e => e.textContent).join("|") === "Tipo|Quantidade|Ano"));
	await closeModal();

	// ---- abas das Estatísticas: sem sobra no fim da faixa (3.62.1)
	await go("Dashboard/Estatísticas.md");
	const stTabs = await p.evaluate(() => { const t = document.querySelector(".sv-sttabs"); if (!t) return null; t.scrollLeft = t.scrollWidth; const last = [...t.children].pop(); const sobra = Math.round(t.getBoundingClientRect().right - last.getBoundingClientRect().right); t.scrollLeft = 0; return { sobra, stuck: document.querySelector(".sv-app").classList.contains("is-tabs-stuck") }; });
	check("Estatísticas: faixa de abas termina rente ao último item (sem grudar)", !!stTabs && !stTabs.stuck && stTabs.sobra <= 24, JSON.stringify(stTabs));
	// 3.62.3: grudada, fica abaixo da barra de status (simulada com 32 px)
	await p.addStyleTag({ content: ".sv-app { --sv-safe-top: 32px !important; }" });
	await p.evaluate(() => { document.querySelector(".sv-layer").scrollTop = 900; }); await p.waitForTimeout(600);
	const stStuck = await p.evaluate(() => ({ stuck: document.querySelector(".sv-app").classList.contains("is-tabs-stuck"), top: Math.round(document.querySelector(".sv-sttabs").getBoundingClientRect().top), shadow: getComputedStyle(document.querySelector(".sv-sttabs")).boxShadow }));
	check("Estatísticas: abas grudadas ficam abaixo da barra de status e cobrem a faixa dela", stStuck.stuck && stStuck.top === 32 && /-32px/.test(stStuck.shadow), JSON.stringify(stStuck));
	await p.evaluate(() => { document.querySelectorAll("style").forEach(st => { if (st.textContent.includes("--sv-safe-top: 32px")) st.remove(); }); document.querySelector(".sv-layer").scrollTop = 0; }); await p.waitForTimeout(300);

	// ---- Ações rápidas (toque longo no card): sem arraste do link e com a capa (3.62.2)
	await go("Dashboard/Biblioteca.md");
	check("Biblioteca: segurar o card não inicia arraste do link", await p.evaluate(() => { const a = document.querySelector(".sv-library .sv-card a[href], .sv-library .sv-card [data-open]"); if (!a) return false; const ev = new DragEvent("dragstart", { bubbles: true, cancelable: true }); a.dispatchEvent(ev); return ev.defaultPrevented; }));
	await p.dispatchEvent(".sv-library .sv-card[data-game]", "contextmenu"); await p.waitForTimeout(700);
	check("Ações rápidas: abre com a capa do jogo visível", await modalOpen() && await p.evaluate(() => { const img = document.querySelector(".sv-modal-root .sv-qm-head .sv-cover img"); return !!img && img.classList.contains("is-loaded") && getComputedStyle(img).opacity !== "0"; }), await p.evaluate(() => { const img = document.querySelector(".sv-modal-root .sv-qm-head .sv-cover img"); return img ? img.className + " op=" + getComputedStyle(img).opacity + " complete=" + img.complete : "sem img"; }));
	await closeModal();

	// ---- Completar dados pela Steam (3.63.0)
	{
		const RE = "Games/PC/Resident Evil 4.md";
		const orig = await fm(RE);
		await p.evaluate(path => { const x = __PAGES.find(y => y.path === path); x.fm.publisher = ""; window.__mockReq = async u => /api\/appdetails/.test(u) ? { status: 200, headers: {}, text: JSON.stringify({ [x.fm.steamAppId]: { success: true, data: { genres: [{ description: "Ação" }, { description: "Terror" }], developers: ["Dev Teste"], publishers: ["Pub Teste"], release_date: { date: "24 mar. 2023" }, short_description: "Sinopse <b>da</b> Steam &amp; mais" } } }) } : null; }, RE);
		await go(RE);
		check("ficha: menu tem \"Completar dados pela Steam\"", await count('[data-action="steam-details"]') === 1);
		await openAction({ action: "steam-details", path: RE }); await p.waitForTimeout(800);
		const rowsSd = await p.evaluate(() => [...document.querySelectorAll(".sv-sdetails-row")].map(r => ({ b: r.querySelector("b").textContent, on: r.querySelector("input").checked, v: r.querySelector(".sv-sdetails-new").textContent })));
		check("Completar dados: só os campos vazios vêm marcados (publicadora e data)", rowsSd.length >= 3 && rowsSd.filter(r => r.on).map(r => r.b).join("|") === "Publicadora|Data de lançamento", JSON.stringify(rowsSd));
		check("Completar dados: data da loja (\"24 mar. 2023\") vira data completa", (rowsSd.find(r => r.b === "Data de lançamento")?.v || "").includes("2023"));
		check("Completar dados: sinopse sem HTML", (rowsSd.find(r => r.b === "Sinopse")?.v || "") === "Sinopse da Steam & mais", JSON.stringify(rowsSd.find(r => r.b === "Sinopse")));
		await click("[data-sd-apply]"); await p.waitForTimeout(600);
		const afterSd = await fm(RE);
		check("Completar dados: grava só o marcado e preserva o resto", afterSd.publisher === "Pub Teste" && afterSd.releaseDate === "2023-03-24" && afterSd.developer === orig.developer && afterSd.summary === orig.summary && JSON.stringify(afterSd.genre) === JSON.stringify(orig.genre), JSON.stringify({ pub: afterSd.publisher, dev: afterSd.developer }));
		await p.evaluate(([path, o]) => { const x = __PAGES.find(y => y.path === path); x.fm.publisher = o.publisher; delete x.fm.releaseDate; window.__mockReq = null; customJS.SteamVaultCore.invalidate?.(); }, [RE, orig]);
	}

	// ---- busca avançada da Biblioteca (3.64.0)
	await go("Dashboard/Biblioteca.md");
	const libCount = async () => visible(".sv-library .sv-grid > .sv-card");
	const nGames = await p.evaluate(() => __PAGES.filter(x => x.fm?.type === "game" && !x.path.includes("_Templates")));
	const expect = await p.evaluate(() => { const g = __PAGES.filter(x => x.fm?.type === "game" && !x.path.includes("_Templates")); return { done: g.filter(x => x.fm.status === "Completed").length, r4: g.filter(x => Number(x.fm.rating) >= 4).length, both: g.filter(x => x.fm.status === "Completed" && Number(x.fm.rating) >= 4).length, pc: g.filter(x => x.fm.platform === "PC").length, fav: g.filter(x => x.fm.favorite === true || x.fm.favorite === "true").length }; });
	await p.fill("[data-lib-q]", "status:zerado"); await p.waitForTimeout(400);
	check("busca avançada: status:zerado", await libCount() === expect.done, `${await libCount()} ≠ ${expect.done}`);
	await p.fill("[data-lib-q]", "status:zerado nota>=4"); await p.waitForTimeout(400);
	check("busca avançada: comandos combinados (status + nota)", await libCount() === expect.both && await p.evaluate(() => document.querySelector("[data-lib-q]").classList.contains("has-rules")), `${await libCount()} ≠ ${expect.both}`);
	await p.fill("[data-lib-q]", "plataforma:pc"); await p.waitForTimeout(400);
	check("busca avançada: plataforma:pc", await libCount() === expect.pc);
	await p.fill("[data-lib-q]", "fav"); await p.waitForTimeout(400);
	check("busca avançada: fav", await libCount() === expect.fav);
	await p.fill("[data-lib-q]", "status:xyz"); await p.waitForTimeout(400);
	check("busca avançada: comando desconhecido vira texto (sem resultados, sem erro)", await libCount() === 0 && await visible(".sv-noresults") === 1);
	await click("[data-lib-clear]"); await p.waitForTimeout(300);
	check("busca avançada: limpar volta tudo", await libCount() === nGames.length);
	// ---- lançamentos "Em breve" (3.64.0)
	{
		const W = "Games/PS2/Bully.md";
		await p.evaluate(path => { const x = __PAGES.find(y => y.path === path); x.fm.__st = x.fm.status; x.fm.status = "Wishlist"; const d = new Date(); d.setDate(d.getDate() + 5); x.fm.releaseDate = customJS.SteamVaultCore.localIso(d); customJS.SteamVaultCore.invalidate?.(); }, W);
		await go("Dashboard/Lista de Desejos.md");
		check("Em breve: o jogo com lançamento futuro aparece com contagem regressiva", await p.evaluate(() => { const it = document.querySelector(".sv-soonblock .sv-soon-item"); return !!it && /em 5 dias/.test(it.textContent) && it.querySelector(".sv-soon-left.is-near") !== null; }));
		await go("Dashboard/Home.md");
		check("Em breve: seção na Início", await count(".sv-homebody .sv-soonblock") === 1);
		await p.evaluate(path => { const x = __PAGES.find(y => y.path === path); x.fm.status = x.fm.__st; delete x.fm.__st; delete x.fm.releaseDate; customJS.SteamVaultCore.invalidate?.(); }, W);
	}
	// ---- planejador de backlog (3.64.0) e registro completo da ficha
	await p.evaluate(() => localStorage.setItem("steamvault:ui:statsTab", "time"));
	await go("Dashboard/Estatísticas.md");
	check("Planejador de backlog: cartão na aba Tempo", await p.evaluate(() => [...document.querySelectorAll(".sv-stcard h3")].some(h => h.textContent === "Planejador de backlog")));
	await p.evaluate(() => localStorage.removeItem("steamvault:ui:statsTab"));
	await p.evaluate(() => { const x = __PAGES.find(y => y.path === "Games/PC/Resident Evil 4.md"); x.fm.__ses = JSON.stringify(x.fm.sessions || []); x.fm.sessions = [...(x.fm.sessions || []), { date: "2026-01-10", hours: 1, note: "a" }, { date: "2026-01-11", hours: 0.5, note: "b" }, { date: "2026-01-12", hours: 0.7, note: "c" }]; customJS.SteamVaultCore.invalidate?.(); });
	await go("Games/PC/Resident Evil 4.md");
	const ovAll = await p.evaluate(() => { const d = document.querySelector(".sv-ovtl-all"); if (!d) return { has: false, marks: document.querySelectorAll(".sv-ovtl-item").length }; d.open = true; return { has: true, items: d.querySelectorAll(".sv-feed-item").length, marks: document.querySelectorAll(".sv-ovtl-item").length }; });
	check("Ficha: \"Ver toda a atividade\" abre o registro completo", ovAll.has && ovAll.items > 0, JSON.stringify(ovAll));
	await p.evaluate(() => { const x = __PAGES.find(y => y.path === "Games/PC/Resident Evil 4.md"); x.fm.sessions = JSON.parse(x.fm.__ses); delete x.fm.__ses; customJS.SteamVaultCore.invalidate?.(); });

	// ---- busca global
	await click('[data-action="search-open"]'); await p.waitForTimeout(300);
	await p.fill(".sv-search-input", firstTitle.slice(0, 4)); await p.waitForTimeout(300);
	check("busca global mostra resultados", await count(".sv-search-results .sv-search-item") > 0);
	await p.keyboard.press("Enter"); await p.waitForTimeout(800);
	check("Enter abre o primeiro resultado", await p.evaluate(() => !!document.querySelector(".sv-page--game")));

	// ---- ficha: abas, menu, editor, favorito
	await go(game);
	for (const tab of ["achievements", "media", "sessions", "notes", "overview"]) {
		const ok = await click(`.sv-tabs--game [data-tab="${tab}"]`); await p.waitForTimeout(200);
		check(`aba ${tab} da ficha`, ok && await p.evaluate(t => !document.querySelector(`.sv-panel[data-panel="${t}"]`)?.hidden, tab));
	}
	await click('.sv-hero-actions [data-action="menu"]'); await p.waitForTimeout(200);
	check("menu ⋯ da ficha abre", await visible(".sv-hero-actions .sv-menu") === 1);
	await p.keyboard.press("Escape"); await p.waitForTimeout(200);
	check("menu ⋯ fecha com Esc", await visible(".sv-hero-actions .sv-menu") === 0);
	const favBefore = !!(await fm(game)).favorite;
	await click(".sv-fav-toggle"); await p.waitForTimeout(700);
	check("favoritar grava na nota", !!(await fm(game)).favorite === !favBefore);
	await click(".sv-fav-toggle"); await p.waitForTimeout(700);
	await p.evaluate(path => document.querySelector(`.sv-menu [data-action="manage"][data-section="details"]`)?.click(), game); await p.waitForTimeout(700);
	check("editor de detalhes abre", await modalOpen());
	await closeModal();

	// ---- fila "A seguir" (só jogos não zerados/abandonados entram)
	const open = await p.evaluate(() => __PAGES.find(x => x.fm?.type === "game" && !x.path.includes("_Templates") && !["Completed", "Dropped"].includes(x.fm.status))?.path);
	await go(open);
	await click('[data-action="queue-toggle"]'); await p.waitForTimeout(900);
	check("entrar na fila grava upNext", Number((await fm(open)).upNext) >= 1);
	await go("Dashboard/Home.md");
	check("fila aparece na Início", await count(".sv-homequeue .sv-queuecard") >= 1);
	await click('.sv-homequeue [data-action="queue-manage"]'); await p.waitForTimeout(400);
	await click(".sv-queueman-list li [data-rm]"); await p.waitForTimeout(150);
	await click("[data-q-save]"); await p.waitForTimeout(1000);
	check("tirar da fila apaga upNext", (await fm(open)).upNext === undefined);

	// ---- sessão ao vivo
	await go(game);
	await click("[data-live-btn]"); await p.waitForTimeout(300);
	check("sessão ao vivo começa (barra aparece)", await count(".sv-livebar") === 1);
	await click(".sv-livebar-pause"); await p.waitForTimeout(200);
	check("pausar a sessão", await p.evaluate(() => !!JSON.parse(localStorage.getItem("steamvault:live") || "{}").pausedAt));
	await click(".sv-livebar-pause"); await p.waitForTimeout(200);
	const sessionsBefore = ((await fm(game)).sessions || []).length;
	await click(".sv-livebar-stop"); await p.waitForTimeout(400);
	await p.fill("#sv-live-h", "0.5"); await p.fill("#sv-live-note", "teste funcional");
	await click("[data-live-save]"); await p.waitForTimeout(1000);
	const after = await fm(game);
	check("salvar a sessão grava na nota", (after.sessions || []).length === sessionsBefore + 1 && after.sessions.at(-1).note === "teste funcional");
	check("barra some depois de salvar", await count(".sv-livebar") === 0);

	// ---- Perfil: editar e salvar a bio
	await go("Dashboard/Perfil.md");
	check("Perfil sem nível nem insígnias", await count(".sv-pf-level, .sv-pf-badges, .sv-pf-lvl, .sv-pf-ring") === 0);
	await click('[data-pf="edit"]'); await p.waitForTimeout(400);
	check("editor do perfil abre", await modalOpen());
	await p.fill("#sv-pf-bio", "bio de teste"); await click("[data-pf-save]"); await p.waitForTimeout(1000);
	check("salvar o perfil grava na nota", ((await fm("Dashboard/Perfil.md"))?.profile || {}).bio === "bio de teste");

	// ---- "Sua semana": alternar para a semana passada; mapa de calor na ficha
	await go("Dashboard/Home.md");
	if (await count("[data-week-block] [data-week]")) {
		await click('[data-week-block] [data-week="1"]'); await p.waitForTimeout(300);
		check("Sua semana alterna para a semana passada", await p.evaluate(() => document.querySelector("[data-week-block] [data-week].is-active")?.dataset.week === "1"));
	}
	await go(game);
	await click('.sv-tabs--game [data-tab="sessions"]'); await p.waitForTimeout(300);
	check("mapa de calor na aba Sessões (depois da sessão gravada)", await count(".sv-gameheat .sv-heatmap i") > 300);

	// ---- Início: personalizar; gaveta "Mais"
	await go("Dashboard/Home.md");
	await click("[data-home-custom]"); await p.waitForTimeout(400);
	check("Personalizar Home abre", await modalOpen());
	await closeModal();
	await click('.sv-bottomnav [data-action="open-drawer"]'); await p.waitForTimeout(300);
	check("menu Mais abre", await visible(".sv-drawer") === 1);
	await p.keyboard.press("Escape"); await p.waitForTimeout(300);

	// ---- Configurações: índice e efeitos sonoros
	await go("Dashboard/Configurações.md");
	check("índice das Configurações", await count(".sv-setnav button") >= 3);
	await click("[data-ui-sfx]"); await p.waitForTimeout(200);
	check("ligar efeitos sonoros salva a preferência", await p.evaluate(() => customJS.SteamVaultUI._store("sfx") === "1"));
	await click("[data-ui-sfx]");

	// ---- imagem própria no lugar do ícone (gênero): grava, aparece e volta ao ícone
	await go("Genres/Horror.md");
	await click('[data-action="identity-edit"]'); await p.waitForTimeout(500);
	await p.fill("#sv-id-iconimg", "Assets/Covers/Celeste.webp"); await p.waitForTimeout(200);
	await click("[data-id-save]"); await p.waitForTimeout(1200);
	check("imagem própria grava iconImage na nota", (await fm("Genres/Horror.md")).iconImage === "Assets/Covers/Celeste.webp");
	check("imagem própria aparece no lugar do ícone", await count(".sv-page img.sv-i--img") >= 1);
	await click('[data-action="identity-edit"]'); await p.waitForTimeout(500);
	await click('.sv-idedit-ico[data-icon="ghost"]'); await p.waitForTimeout(150);
	await click("[data-id-save]"); await p.waitForTimeout(1200);
	check("escolher um ícone tira a imagem própria", (await fm("Genres/Horror.md")).iconImage === undefined && await count(".sv-page img.sv-i--img") === 0);

	// ---- galeria de ícones: abre pelas Configurações e não tem ícone faltando
	await click('.sv-settings a[data-open="Dashboard/Ícones"], .sv-settings [data-path="Dashboard/Ícones"]') || await go("Dashboard/Ícones.md");
	await p.waitForTimeout(700);
	check("galeria de ícones abre", await count(".sv-icg-cell") > 100);
	check("nenhum ícone faltando na galeria", await count(".sv-icg-cell[data-missing]") === 0);
	check("gêneros com ícones distintos", await p.evaluate(() => { const ids = [...document.querySelectorAll(".sv-icg-strip span")].map(s => s.title); return ids.length >= 30 && new Set(ids).size === ids.length; }));

	// ---- comparar (3.45.0): duas plataformas lado a lado, trocar o lado B redesenha
	await go("Dashboard/Estatísticas.md");
	await click('[data-st-tab="compare"]'); await p.waitForTimeout(400);
	check("comparar mostra duas plataformas", await count(".sv-stcmp-row") >= 4 && await count('[data-cmp-side="A"]') === 1);
	const lastPlat = await p.evaluate(() => [...document.querySelectorAll('[data-cmp-side="B"] option')].pop()?.value);
	await p.selectOption('[data-cmp-side="B"]', lastPlat); await p.waitForTimeout(300);
	check("comparar troca o segundo lado", await p.evaluate(() => document.querySelector('[data-cmp-side="B"]').value) === lastPlat && await p.evaluate(() => document.querySelector(".sv-stcmp-head .is-b").textContent) === lastPlat);

	// ---- meta de um mês (3.45.0): grava "AAAA-MM" e mostra o nome do mês
	await click('[data-st-tab="overview"]'); await p.waitForTimeout(300);
	await click('[data-action="goals-edit"]'); await p.waitForTimeout(400);
	await p.selectOption("[data-g-type]", "queue"); await p.fill("[data-g-n]", "1");
	await p.selectOption("[data-g-period]", "month"); await p.selectOption("[data-g-month]", "03");
	await p.fill("[data-g-year]", "2026"); await click("[data-g-add]"); await p.waitForTimeout(150);
	await click("[data-g-save]"); await p.waitForTimeout(1200);
	check("meta mensal grava o mês", ((await fm("Dashboard/Estatísticas.md")).goals || []).some(g => g.type === "queue" && g.year === "2026-03"));
	check("meta mensal aparece com o nome do mês", await p.evaluate(() => [...document.querySelectorAll(".sv-goal-text b")].some(b => /março de 2026/.test(b.textContent))));

	// ---- marcos e ordem do diário na ficha (3.45.0)
	await go("Games/PC/Celeste.md");
	await click('.sv-tabs--game [data-tab="sessions"]'); await p.waitForTimeout(400);
	check("ficha mostra os marcos do jogo", await count(".sv-gmile") >= 2);
	const firstDay = await p.evaluate(() => document.querySelector(".sv-diary time")?.textContent);
	await click('[data-diary-order="asc"]'); await p.waitForTimeout(400);
	check("diário em ordem do início", await p.evaluate(() => document.querySelector(".sv-diary time")?.textContent) !== firstDay && await count('[data-diary-order="asc"].is-active') === 1);
	await click('[data-diary-order="desc"]'); await p.waitForTimeout(300);

	// ---- importar CSV (3.46.0): colar, conferir a prévia e criar as fichas sem duplicar
	await go("Dashboard/Biblioteca.md");
	await click('[data-action="csv-import"]'); await p.waitForTimeout(400);
	await p.evaluate(() => { document.querySelector(".sv-csv-paste").open = true; });
	await p.fill("[data-csv-text]", 'Name,Platforms,CompletionStatus,Playtime,UserScore,Genres\n"Teste CSV Um","Sony PlayStation 2",Beaten,36000,90,"Action, RPG"\n"Celeste","PC (Windows)",Completed,3600,80,Platform\n');
	await click("[data-csv-read]"); await p.waitForTimeout(400);
	check("importar CSV lê o arquivo e mostra a prévia", await count(".sv-csv-table tbody tr") === 1 && /1 jogo novo/.test(await p.evaluate(() => document.querySelector(".sv-csv-sum").textContent)));
	await click("[data-csv-go]"); await p.waitForTimeout(1500);
	const csvNote = await fm("Games/PS2/Teste CSV Um.md");
	check("importar CSV cria a ficha com os dados convertidos", !!csvNote && csvNote.status === "Completed" && csvNote.hoursPlayed === 10 && csvNote.rating === 4.5 && (csvNote.genre || []).length === 2);
	check("importar CSV não duplica jogo que já existe", await p.evaluate(() => __PAGES.filter(x => x.fm?.type === "game" && x.fm.title === "Celeste").length) === 1);

	// ---- lista simples na importação (3.48.0): cada linha é um título, mesmo com vírgula ou número
	await go("Dashboard/Biblioteca.md");
	await click('[data-action="csv-import"]'); await p.waitForTimeout(400);
	await p.evaluate(() => { document.querySelector(".sv-csv-paste").open = true; });
	await p.fill("[data-csv-text]", "1080° Snowboarding\nBatman: Arkham Asylum, GOTY Edition\n- Celeste\n");
	await click("[data-csv-read]"); await p.waitForTimeout(400);
	check("lista simples vira um jogo por linha", JSON.stringify(await p.evaluate(() => [...document.querySelectorAll(".sv-csv-table tbody td:first-child")].map(t => t.textContent))) === JSON.stringify(["1080° Snowboarding", "Batman: Arkham Asylum, GOTY Edition"]));
	await click("[data-csv-go]"); await p.waitForTimeout(1500);
	check("lista simples cria as fichas", !!(await fm("Games/PC/1080° Snowboarding.md")) && !!(await fm("Games/PC/Batman Arkham Asylum, GOTY Edition.md") || await p.evaluate(() => __PAGES.some(x => x.fm?.title === "Batman: Arkham Asylum, GOTY Edition"))));

	// ---- saúde da biblioteca (3.48.0): nota, seções e padronização do nome da plataforma
	await p.evaluate(() => { const g = __PAGES.find(x => x.fm?.title === "1080° Snowboarding"); if (g) g.fm.platform = "Nintendo 64"; customJS.SteamVaultCore.invalidate(); });
	await go("Dashboard/Biblioteca.md");
	await click('[data-action="library-health"]'); await p.waitForTimeout(500);
	check("saúde da biblioteca abre com nota e seções", await count(".sv-health-ring") === 1 && await count(".sv-health-sec") >= 2);
	check("saúde sugere o nome padrão da plataforma", /Nintendo 64\s*N64/.test(await p.evaluate(() => document.querySelector(".sv-health-renames")?.textContent || "")));
	await click("[data-health-plat]"); await p.waitForTimeout(1200);
	check("usar o nome padrão grava a plataforma", await p.evaluate(() => __PAGES.find(x => x.fm?.title === "1080° Snowboarding")?.fm.platform) === "N64");

	// ---- desfazer e exportar (3.50.0)
	await go("Dashboard/Biblioteca.md");
	const gamesNow = () => p.evaluate(() => app.vault.getMarkdownFiles().filter(f => f.path.startsWith("Games/") && !f.path.includes("_Templates")).length);
	const before = await gamesNow();
	await click('[data-action="csv-import"]'); await p.waitForTimeout(400);
	await p.evaluate(() => { document.querySelector(".sv-csv-paste").open = true; });
	await p.fill("[data-csv-text]", "Jogo Para Desfazer Um\nJogo Para Desfazer Dois\n");
	await click("[data-csv-read]"); await p.waitForTimeout(300);
	await click("[data-csv-go]"); await p.waitForTimeout(1300);
	check("importar mostra o botão Desfazer", await gamesNow() === before + 2 && await count(".sv-toast-action") >= 1);
	await click(".sv-toast-action"); await p.waitForTimeout(1500);
	check("desfazer manda as fichas importadas para a lixeira", await gamesNow() === before);
	await click('[data-action="csv-export"]'); await p.waitForTimeout(800);
	check("exportar grava o CSV na pasta Backups", await p.evaluate(() => (window.__created || []).some(x => /^Backups\/Game Library .*\.csv$/.test(x))));
	check("CSV exportado volta inteiro na importação", await p.evaluate(() => { const C = customJS.SteamVaultCore, CA = customJS.SteamVaultCare; const model = C.model(window.dv || app.plugins?.plugins?.dataview?.api); const t = CA.parseCSV(CA.exportCsvText({ C, model })); return Object.keys(CA.csvGuess(t.headers)).length === t.headers.length && CA.csvRows(t, CA.csvGuess(t.headers), {}, { C, model }).fresh.length === 0; }));

	// ---- nota diária (3.51.0): a sessão entra sob "## Jogos", antes da próxima seção
	check("sessão vai para a nota diária na seção Jogos", await p.evaluate(async () => {
		const CA = customJS.SteamVaultCare, U = customJS.SteamVaultUI, before = U._store("dailyLog");
		U._store("dailyLog", "1");
		const dp = CA.dailyPath(), store = { [dp]: "## Jogos\n- [[Hades]]\n\n## Tarefas\n- algo" }, get = app.vault.getAbstractFileByPath;
		app.vault.getAbstractFileByPath = x => x === dp ? { path: dp } : get(x);
		app.vault.process = async (f, fn) => { store[f.path] = fn(store[f.path]); };
		await CA.logSessionToDaily({ path: "Games/PC/Celeste.md", title: "Celeste", hours: 1.5, note: "linha 1\nlinha 2" });
		app.vault.getAbstractFileByPath = get; delete app.vault.process; U._store("dailyLog", before || "0");
		return store[dp] === "## Jogos\n- [[Hades]]\n- [[Celeste]] · 1,5 h · linha 1 linha 2\n\n## Tarefas\n- algo";
	}));
	check("nota diária desligada não escreve nada", await p.evaluate(async () => { customJS.SteamVaultUI._store("dailyLog", "0"); return (await customJS.SteamVaultCare.logSessionToDaily({ path: "x", title: "x" })).code === "off"; }));

	// ---- resumo do mês (3.51.0): nos primeiros dias do mês, o mês que acabou; dá para dispensar
	await p.evaluate(() => { const C = customJS.SteamVaultCore; window.__svRealToday = C.today; C.today = () => "2026-11-03"; const g = __PAGES.find(x => x.path === "Games/PC/Celeste.md"); g.fm.sessions = [...(g.fm.sessions || []), { date: "2026-10-12", hours: 2.5 }]; C.invalidate(); });
	await go("Dashboard/Home.md");
	check("resumo do mês aparece no começo do mês", /Seu outubro de 2026/.test(await p.evaluate(() => document.querySelector(".sv-homeprev")?.textContent || "")));
	await click('[data-action="month-dismiss"]'); await p.waitForTimeout(200);
	await go("Dashboard/Home.md");
	check("resumo do mês dispensado não volta", await count(".sv-homeprev") === 0);
	await p.evaluate(() => { customJS.SteamVaultCore.today = window.__svRealToday; customJS.SteamVaultCore.invalidate(); });

	// ---- 3.52.0: texto da pessoa não é traduzido e a barra de status tem área de toque maior
	check("tradutor não mexe em texto escrito pela pessoa", await p.evaluate(() => { const T = customJS.SteamVaultI18n, el = document.createElement("p"); el.className = "sv-idhero-desc"; document.body.appendChild(el); const skip = !!T._skip(el); el.remove(); return skip; }));
	await go("Dashboard/Biblioteca.md");
	check("barra de status responde ao toque fora dos 12 px", await p.evaluate(() => { const b = document.querySelector(".sv-libsum-bar button"); if (!b) return true; const r = b.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + Math.min(5, r.width / 2), r.top - 8); return hit === b || b.contains(hit); }));

	check("página de gênero não duplica quando o nome muda só no acento", await p.evaluate(async () => { const n = app.vault.getMarkdownFiles().length; const path = await customJS.SteamVaultLegacy.ensureCategoryNote("genre", "acao"); return path === "Genres/Ação.md" && app.vault.getMarkdownFiles().length === n; }));
	check("português abre sem ler o dicionário de inglês", await p.evaluate(() => !customJS.SteamVaultI18n._enLoaded && Object.keys(customJS.SteamVaultI18n.en).length === 0));
	await p.evaluate(() => customJS.SteamVaultI18n.setLang("en"));
	await go("Dashboard/Biblioteca.md");
	check("inglês: dicionário lido do arquivo e tela traduzida", await p.evaluate(() => { const T = customJS.SteamVaultI18n, nav = document.querySelector(".sv-app")?.innerText || ""; return T._enLoaded && Object.keys(T.en).length > 3000 && /Library/.test(nav) && !/Biblioteca/.test(nav); }));
	await p.evaluate(() => customJS.SteamVaultI18n.setLang("pt"));
	const foto = await p.evaluate(async () => {
		// foto de celular: JPEG grande com degradê e ruído (determinístico). Um padrão
		// sintético em PNG comprimia de jeito diferente em cada versão do Chromium
		// (768 KB no 130, 3 MB no 153) e tornava a comparação de tamanho instável.
		const c = document.createElement("canvas"); c.width = 1800; c.height = 2700; const g = c.getContext("2d");
		const gr = g.createLinearGradient(0, 0, c.width, c.height); gr.addColorStop(0, "#2a4d6e"); gr.addColorStop(0.5, "#c98a4b"); gr.addColorStop(1, "#1d2b1f");
		g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
		const img = g.getImageData(0, 0, c.width, c.height); let s = 12345;
		for (let i = 0; i < img.data.length; i += 4) { s = (s * 1103515245 + 12345) >>> 0; const n = ((s >>> 16) & 63) - 32; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
		g.putImageData(img, 0, 0);
		const blob = await new Promise(r => c.toBlob(r, "image/jpeg", 0.92)); const file = new File([blob], "foto.jpg", { type: "image/jpeg" });
		const path = await customJS.SteamVaultLegacy.saveDeviceImage(file, "Assets/Covers", "Foto teste");
		const bmp = await createImageBitmap(new Blob([await (await fetch(window.__blobs[path])).arrayBuffer()]));
		const ok = /\.webp$/.test(path) && window.__bin[path] < blob.size && bmp.width === 1200;
		// diagnóstico quando falha: qual condição não valeu (depende do codificador WebP do navegador)
		return { ok, info: `caminho=${path} webp=${window.__bin[path]} B original=${blob.size} B largura=${bmp.width} ${(navigator.userAgent.match(/Chrome\/[\d.]+/) || [""])[0]}` };
	});
	check("foto do aparelho grande é salva em WebP, menor e sem passar de 1200 px na capa", foto.ok);
	if (!foto.ok) console.log(`     ${foto.info}`);
	// 1.0.1: capa em pixel art (blocos de cor chapada, PNG de 437 KB, acima do
	// limite de 300 KB a partir do qual o app comprime) reduzida para 1200 px não
	// pode ficar maior que o original. Antes virava WebP mesmo assim (661 KB);
	// agora fica o menor formato, no mesmo tamanho reduzido
	const chapada = await p.evaluate(async () => {
		const c = document.createElement("canvas"); c.width = 3000; c.height = 4500; const g = c.getContext("2d");
		const pal = ["#0b1119", "#1d63e0", "#ffb547", "#3fe0b0"]; let s = 7;
		for (let y = 0; y < c.height; y += 15) for (let x = 0; x < c.width; x += 15) { s = (s * 1103515245 + 12345) >>> 0; g.fillStyle = pal[(s >>> 16) & 3]; g.fillRect(x, y, 15, 15); }
		const blob = await new Promise(r => c.toBlob(r, "image/png")); const file = new File([blob], "arte.png", { type: "image/png" });
		const path = await customJS.SteamVaultLegacy.saveDeviceImage(file, "Assets/Covers", "Arte chapada");
		const bmp = await createImageBitmap(new Blob([await (await fetch(window.__blobs[path])).arrayBuffer()]));
		const ok = window.__bin[path] < blob.size && bmp.width === 1200;
		return { ok, info: `caminho=${path} salvo=${window.__bin[path]} B original=${blob.size} B largura=${bmp.width} ${(navigator.userAgent.match(/Chrome\/[\d.]+/) || [""])[0]}` };
	});
	check("imagem reduzida nunca fica maior que o original (escolhe o menor formato)", chapada.ok);
	if (!chapada.ok) console.log(`     ${chapada.info}`);
	// ---- acessibilidade das janelas (3.55.0): nome, foco preso, Esc e foco de volta
	const trapTest = async (open, rootSel) => {
		await p.evaluate(() => { const b = document.querySelector(".sv-app button:not([disabled])"); b.focus(); window.__op = b; });
		await p.evaluate(open); await p.waitForTimeout(250);
		const named = await p.evaluate(sel => { const d = document.querySelector(sel); if (!d) return false; const lb = d.getAttribute("aria-labelledby"); const name = lb ? document.getElementById(lb)?.textContent : d.getAttribute("aria-label"); return d.getAttribute("role") === "dialog" && d.getAttribute("aria-modal") === "true" && !!(name || "").trim(); }, rootSel);
		let inside = true;
		for (let k = 0; k < 14; k++) { await p.keyboard.press(k % 5 === 4 ? "Shift+Tab" : "Tab"); inside = inside && await p.evaluate(sel => !!document.activeElement?.closest(sel), rootSel); }
		await p.keyboard.press("Escape"); await p.waitForTimeout(400);
		const back = await p.evaluate(sel => !document.querySelector(sel) && document.activeElement === window.__op, rootSel);
		return { named, inside, back };
	};
	await go("Dashboard/Biblioteca.md");
	let r = await trapTest(() => customJS.SteamVault.modal({ title: "Janela de teste", body: '<input aria-label="campo"><button type="button">Um</button>', actions: '<button type="button" data-close>Fechar</button>' }), ".sv-modal-root .sv-modal");
	check("janela padrão: nome, Tab preso, Esc fecha e o foco volta", r.named && r.inside && r.back, JSON.stringify(r));
	r = await trapTest(() => { customJS.SteamVaultLegacy._chooseSteamCandidate("Teste", [{ name: "Jogo A", appid: 1 }, { name: "Jogo B", appid: 2 }]).catch(() => {}); }, ".svl-steam-picker-panel");
	check("escolha do jogo na Steam: nome, Tab preso, Esc fecha e o foco volta", r.named && r.inside && r.back, JSON.stringify(r));
	r = await trapTest(() => { const b = document.createElement("button"); b.type = "button"; b.dataset.action = "stories"; b.dataset.year = "2026"; document.querySelector(".sv-app .sv-page").appendChild(b); b.click(); b.remove(); }, ".sv-stories");
	check("retrospectiva: nome, Tab preso, Esc fecha e o foco volta", r.named && r.inside && r.back, JSON.stringify(r));
	await p.evaluate(() => { const b = document.createElement("button"); b.type = "button"; b.dataset.action = "stories"; b.dataset.year = "2026"; document.querySelector(".sv-app .sv-page").appendChild(b); b.click(); b.remove(); });
	await p.waitForTimeout(300);
	for (let k = 0; k < 12; k++) await p.keyboard.press("ArrowRight");
	await p.evaluate(() => document.querySelector(".sv-stories [data-story-share]")?.click()); await p.waitForTimeout(900);
	check("retrospectiva: \"Imagem para compartilhar\" abre o cartão do ano", await p.evaluate(() => /Compartilhar resumo/.test(document.querySelector(".sv-modal-root h2")?.textContent || "") && window.__svStatsShare?.label === "2026"));
	await closeModal();
	// ---- conquistas Steam no layout novo (valve-ssr-data): Dying Light
	r = await p.evaluate(async () => {
		const S = customJS.SteamVaultSteam, H1 = "a".repeat(40), H2 = "b".repeat(40), H3 = "c".repeat(40);
		S.minIntervalMs = 0;
		const steamPage = __PAGES.find(x => x.path === "Dashboard/Steam.md"); const oldProfile = steamPage.fm.steamProfile;
		steamPage.fm.steamProfile = { steamId64: "76561190000000001", privacy: "public" };
		const game = app.vault.getAbstractFileByPath("Games/PC/Dying Light.md");
		// nota que já existia: nome em português e ícone no endereço antigo (mesmo hash)
		await app.vault.create("Achievements/Dying Light/Bem-vindo a Harran.md", `---\ntype: achievement\nname: "Bem-vindo a Harran"\ngame: "[[Dying Light]]"\ngamePath: "Games/PC/Dying Light.md"\nunlocked: false\nsteamIconUrl: "https://cdn.akamai.steamstatic.com/steamcommunity/public/images/apps/239140/${H1}.jpg"\n---\n`);
		const schema = { groups: [
			{ achievements: [
				{ internal_key: 1, api_name: "ACH_WELCOME", name: "Welcome to Harran", description: "Start the game", icon_achieved: `${H1}.jpg`, icon_unachieved: `${H1}_u.jpg` },
				{ internal_key: 2, api_name: "ACH_NIGHT", name: "Night Runner", description: "Survive a night", icon_achieved: `${H2}.jpg`, icon_unachieved: `${H2}_u.jpg` },
				{ internal_key: 3, api_name: "ACH_OLD", name: "Old one", description: "", icon_achieved: `${H3}.jpg`, archived: true }
			] },
			{ developeronly: true, achievements: [{ internal_key: 9, api_name: "DEV", name: "Dev", icon_achieved: `${H3}.jpg` }] }
		] };
		const queries = [
			{ queryKey: ["achievements", "239140", "schema_v2", "english"], state: { data: schema } },
			{ queryKey: ["achievements", "239140", "user_achievements", "76561190000000001"], state: { data: { achievements: { "1": { unlocked: true, unlock_time: 1700000000 }, "2": { unlocked: false } } } } },
			{ queryKey: ["achievements", "239140", "globalpercentages"], state: { data: { percentages: { "1": 91.27, "2": 12.04 } } } }
		];
		const html = `<html><body><div id="root"></div><script id="valve-ssr-data" type="application/json">${JSON.stringify({ renderContext: { queryData: JSON.stringify({ queries }) } })}</script></body></html>`;
		window.__mockReq = u => /\/profiles\/76561190000000001\/stats\/239140\/achievements\/\?l=/.test(u) ? { status: 200, headers: {}, text: html } : null;
		const fetched = await S.fetchPlayerAchievements("239140");
		const res = await S.syncGame(game, { force: true });
		const notes = __PAGES.filter(x => x.fm?.type === "achievement" && x.fm.gamePath === "Games/PC/Dying Light.md");
		const old = notes.find(x => x.path === "Achievements/Dying Light/Bem-vindo a Harran.md")?.fm || {};
		const night = notes.find(x => x.fm.name === "Night Runner")?.fm || {};
		const gfm = __PAGES.find(x => x.path === "Games/PC/Dying Light.md").fm;
		window.__mockReq = null; steamPage.fm.steamProfile = oldProfile; S.minIntervalMs = 1600;
		return { via: fetched.via, total: fetched.total, res, n: notes.length, oldUnlocked: old.unlocked, oldDate: old.unlockedDate, oldApi: old.steamApiName, oldPct: old.steamGlobalPercent,
			nightUnlocked: night.unlocked, nightPct: night.steamGlobalPercent, nightIcon: night.steamIconUrl, gTotal: gfm.achievementsTotal, gEarned: gfm.achievementsEarned, status: gfm.steam?.syncStatus };
	});
	check("conquistas Steam no layout novo: lidas do valve-ssr-data (arquivada e de desenvolvedor fora)", r.via === "ssr" && r.total === 2, JSON.stringify(r));
	check("conquistas Steam no layout novo: nota existente casada pelo ícone, sem duplicar", r.n === 2 && r.res.updated === 1 && r.res.created === 1 && r.oldUnlocked === true && /^\d{4}-\d{2}-\d{2}$/.test(r.oldDate) && r.oldApi === "ACH_WELCOME" && r.oldPct === 91.3, JSON.stringify(r));
	check("conquistas Steam no layout novo: conquista nova criada bloqueada, com raridade e ícone", r.nightUnlocked === false && r.nightPct === 12 && /shared\.fastly\.steamstatic\.com\/community_assets\/images\/apps\/239140\/b{40}\.jpg/.test(r.nightIcon) && r.gTotal === 2 && r.gEarned === 1 && r.status === "ok", JSON.stringify(r));
	// ---- hubs de categoria (3.57.0): linguagem neutra, arte dos jogos, busca intacta
	await go("Dashboard/Gêneros.md");
	r = await p.evaluate(() => {
		const tiles = [...document.querySelectorAll(".sv-gtiles > .sv-gtile")];
		const fills = [...document.querySelectorAll(".sv-dna-bars li:not(:first-child) .sv-dna-track > span")].map(x => getComputedStyle(x).backgroundColor);
		const bgs = tiles.map(t => getComputedStyle(t).backgroundColor);
		return { n: tiles.length, art: tiles.every(t => t.querySelector(".sv-gtile-art .sv-gtile-covers .sv-cover") && t.querySelector(".sv-gtile-body strong")), marks: document.querySelectorAll(".sv-gtile-mark, .sv-pcard-mark").length, oneFill: new Set(fills).size === 1, oneBg: new Set(bgs).size === 1, stripes: tiles.some(t => /repeating-linear-gradient/.test(getComputedStyle(t).backgroundImage)) };
	});
	check("Gêneros: cards com faixa de arte, fundo neutro igual e sem marca d'água ou listras", r.n > 3 && r.art && r.marks === 0 && r.oneBg && !r.stripes, JSON.stringify(r));
	check("Gêneros: barras de afinidade numa cor só", r.oneFill, JSON.stringify(r));
	await p.fill("[data-hub-q]", "horr"); await p.waitForTimeout(150);
	check("Gêneros: a busca do hub continua filtrando (nome e subgêneros)", await p.evaluate(() => { const shown = [...document.querySelectorAll(".sv-gtiles > .sv-gtile")].filter(t => !t.hidden).map(t => t.dataset.name); return shown.includes("Horror") && !shown.includes("Plataforma") && !shown.includes("Sandbox"); }));
	await p.fill("[data-hub-q]", "");
	await go("Dashboard/Plataformas.md");
	r = await p.evaluate(() => { const c = [...document.querySelectorAll(".sv-pcards > .sv-pcard")]; return { n: c.length, h: Math.max(...c.map(x => x.getBoundingClientRect().height)), shelf: c.every(x => x.querySelector(".sv-pcard-shelf .sv-cover")), dot: document.querySelectorAll(".sv-makerhead span[style]").length }; });
	check("Plataformas: cards compactos com estante de capas", r.n > 0 && r.h < 130 && r.shelf && r.dot === 0, JSON.stringify(r));
	await p.evaluate(() => { const b = document.createElement("button"); b.dataset.action = "picker"; document.querySelector(".sv-app .sv-page").appendChild(b); b.click(); b.remove(); });
	await p.waitForTimeout(400); await p.evaluate(() => document.querySelector("[data-go]")?.click()); await p.waitForTimeout(800);
	check("O que jogar?: a capa do card aparece (não herda mais as regras dos hubs)", await p.evaluate(() => { const a = document.querySelector(".sv-deck .sv-pcard:last-child .sv-pcard-art"); return !!a && getComputedStyle(a).opacity === "1" && getComputedStyle(a).position !== "absolute"; }));
	await closeModal();
	// ---- Personalização da Interface (3.58.0)
	const LS = k => p.evaluate(k => localStorage.getItem("steamvault:ui:" + k), k);
	const appLay = () => p.evaluate(() => Object.fromEntries([...document.querySelector(".sv-app").attributes].filter(a => a.name.startsWith("data-lay-")).map(a => [a.name, a.value])));
	check("personalização: sem nada salvo, nenhum atributo de layout (interface da 3.57)", Object.keys(await appLay()).length === 0 && !(await LS("layout")));
	check("personalização: preferência antiga ou inválida é corrigida sem quebrar", await p.evaluate(() => { const U = customJS.SteamVaultUI; const a = U.layoutClean('{"game":{"model":"bogus","cover":"right","tabOrder":["notes","x"]},"cards":7,"zzz":1}'); const b = U.layoutClean("não é json"); return a.game.model === "original" && a.game.cover === "right" && a.game.tabOrder[0] === "notes" && a.game.tabOrder.length === 6 && a.cards.style === "original" && b.home.hero === "original"; }));
	check("personalização: layout e combinações acompanham a sincronização de preferências", await p.evaluate(() => customJS.SteamVaultCare.isSynced("layout") && customJS.SteamVaultCare.isSynced("layoutPresets")));
	await go("Dashboard/Configurações.md");
	await p.evaluate(() => document.querySelector("[data-look]").scrollIntoView({ block: "start" }));
	await p.waitForFunction(() => document.querySelector("[data-look-frame]")?.dataset.ready === "1", null, { timeout: 15000 });
	const fmBefore = await p.evaluate(() => (window.__fmWrites || 0));
	const pvAttr = name => p.evaluate(n => document.querySelector(".sv-look-iframe")?.contentDocument?.querySelector(".sv-app")?.getAttribute(n), name);
	const pvReady = async () => { await p.waitForTimeout(200); await p.waitForFunction(() => document.querySelector("[data-look-frame]")?.dataset.ready === "1"); await p.waitForTimeout(150); };
	await click('[data-look-area="game"]'); await click('[data-look-key="game.model"][data-look-v="cinema"]'); await pvReady();
	r = { pv: await pvAttr("data-lay-game-model"), app: (await appLay())["data-lay-game-model"], saved: await LS("layout"), pvGame: await p.evaluate(() => !!document.querySelector(".sv-look-iframe").contentDocument.querySelector(".sv-hero--page")) };
	check("pré-visualização: escolher Cinematográfico muda a prévia (ficha real), não o app nem o que está salvo", r.pv === "cinema" && !r.app && !r.saved && r.pvGame, JSON.stringify(r));
	await click('[data-pv-dev="desktop"]'); await pvReady();
	check("pré-visualização: alterna para o tamanho de computador (sem classes de celular)", await p.evaluate(() => { const app = document.querySelector(".sv-look-iframe").contentDocument.querySelector(".sv-app"); return !app.classList.contains("sv-bp-sm") && document.querySelector("[data-look-frame]").dataset.dev === "desktop"; }));
	await click('[data-pv-dev="mobile"]'); await pvReady();
	await click("[data-look-cancel]"); await pvReady();
	check("Cancelar descarta o rascunho (prévia volta ao original, Aplicar desligado)", !(await pvAttr("data-lay-game-model")) && await p.evaluate(() => document.querySelector("[data-look-apply]").disabled));
	await click('[data-look-area="cards"]'); await click('[data-look-key="cards.style"][data-look-v="overlay"]');
	await click('[data-look-area="game"]'); await click('[data-look-key="game.model"][data-look-v="split"]');
	await click("[data-look-apply]"); await p.waitForTimeout(900);
	r = { saved: JSON.parse((await LS("layout")) || "{}"), app: await appLay() };
	check("Aplicar grava as preferências e o app passa a usar o layout", r.saved.cards?.style === "overlay" && r.saved.game?.model === "split" && r.app["data-lay-cards-style"] === "overlay" && r.app["data-lay-game-model"] === "split", JSON.stringify(r));
	check("a personalização não grava nada nas notas", (await p.evaluate(() => (window.__fmWrites || 0))) === fmBefore);
	await go("Dashboard/Home.md");
	check("cards com texto sobre a capa na Início", await p.evaluate(() => { const b = document.querySelector(".sv-shelf-track .sv-card .sv-card-body"); return !!b && getComputedStyle(b).position === "absolute"; }));
	await go("Games/PC/Resident Evil 4.md");
	check("ficha no modelo Split mostra a descrição no topo e mantém abas e painéis", await p.evaluate(() => { const s = document.querySelector(".sv-hero--page .sv-hero-summary"); return !!s && getComputedStyle(s).display !== "none" && document.querySelectorAll(".sv-tabs--game .sv-tab").length >= 5 && !!document.querySelector('.sv-panel[data-panel="overview"]'); }));
	await p.evaluate(() => { const U = customJS.SteamVaultUI; const l = U.layoutClean(U._store("layout")); l.game.tabOrder = ["sessions", ...l.game.tabOrder.filter(t => t !== "sessions")]; l.home.hero = "cards"; l.home.interval = "8"; U._store("layout", JSON.stringify(l)); });
	await go("Games/PC/Resident Evil 4.md");
	check("ordem das abas: Sessões primeiro abre a ficha nessa aba", await p.evaluate(() => document.querySelector(".sv-tabs--game .sv-tab")?.dataset.tab === "sessions" && document.querySelector(".sv-tabs--game .sv-tab.is-active")?.dataset.tab === "sessions" && !document.querySelector('.sv-panel[data-panel="sessions"]').hidden && document.querySelector('.sv-panel[data-panel="overview"]').hidden));
	await go("Dashboard/Home.md");
	check("destaque da Início em cards (jogos reais do vault)", await p.evaluate(() => document.querySelectorAll(".sv-featcards .sv-featcard").length > 0 && !document.querySelector("[data-herocar]")));
	await p.evaluate(() => { const U = customJS.SteamVaultUI; const l = U.layoutClean(U._store("layout")); l.home.hero = "split"; U._store("layout", JSON.stringify(l)); });
	await go("Dashboard/Home.md");
	check("carrossel usa o intervalo escolhido (8 s)", await p.evaluate(() => { const c = document.querySelector("[data-herocar]"); return !!c && c.style.getPropertyValue("--sv-herocar-cycle") === "8000ms"; }));
	// combinações
	await go("Dashboard/Configurações.md");
	await click('[data-look-preset="minimal"]'); await p.waitForTimeout(200);
	r = await p.evaluate(() => { const d = document.querySelector("[data-look]").__svLook.draft; return { theme: d.theme, model: d.layout.game.model, active: !!document.querySelector('.sv-look-preset.is-active [data-look-preset="minimal"]') }; });
	check("combinação pronta muda o rascunho inteiro (tema e layouts)", r.theme === "graphite" && r.model === "minimal" && r.active, JSON.stringify(r));
	await click("[data-look-preset-new]"); await p.waitForTimeout(300);
	await p.fill("#sv-look-name", "Teste Minimal"); await click(".sv-modal-root [data-ok]"); await p.waitForTimeout(300);
	r = JSON.parse((await LS("layoutPresets")) || "[]");
	check("salvar combinação com nome", r.length === 1 && r[0].name === "Teste Minimal" && r[0].layout.game.model === "minimal" && r[0].theme === "graphite", JSON.stringify(r).slice(0, 200));
	const pid = r[0]?.id;
	await click(`[data-look-preset-menu="${pid}"]`); await p.waitForTimeout(250); await click('.sv-modal-root [data-pm="rename"]'); await p.waitForTimeout(250);
	await p.fill("#sv-look-name", "Steam Minimal Meu"); await click(".sv-modal-root [data-ok]"); await p.waitForTimeout(300);
	check("renomear combinação", JSON.parse((await LS("layoutPresets")) || "[]")[0]?.name === "Steam Minimal Meu");
	await click(`[data-look-preset-menu="${pid}"]`); await p.waitForTimeout(250); await click('.sv-modal-root [data-pm="del"]'); await p.waitForTimeout(300); await click(".sv-modal-root [data-ok]"); await p.waitForTimeout(300);
	check("excluir combinação (só a salva; a aparência não muda)", JSON.parse((await LS("layoutPresets")) || "[]").length === 0 && (await appLay())["data-lay-game-model"] === "split");
	// tema claro com um modelo aplicado
	await p.evaluate(() => { document.body.classList.add("theme-light"); document.body.classList.remove("theme-dark"); });
	await go("Games/PC/Resident Evil 4.md");
	check("tema claro: a ficha personalizada abre normalmente", await p.evaluate(() => !!document.querySelector(".sv-hero--page .sv-hero-title")));
	await p.evaluate(() => { document.body.classList.remove("theme-light"); document.body.classList.add("theme-dark"); });
	// restaurar o original
	await go("Dashboard/Configurações.md");
	await click("[data-look-reset]"); await p.waitForTimeout(200);
	check("Restaurar o original só vale depois de Aplicar", !!(await LS("layout")) && /Aplicar/.test(await p.evaluate(() => document.querySelector("[data-look-state]").textContent)));
	await click("[data-look-apply]"); await p.waitForTimeout(900);
	check("depois de restaurar e aplicar: sem layout salvo, sem atributos, tema padrão", !(await LS("layout")) && Object.keys(await appLay()).length === 0 && ["steam", null].includes(await LS("theme")));
	await p.evaluate(() => { localStorage.removeItem("steamvault:ui:theme"); localStorage.removeItem("steamvault:ui:homeLayout"); });
	// ---- Personalização no celular e otimizações (3.58.1)
	check("toda opção da central tem efeito (regra de CSS ou tratada no código)", await p.evaluate(() => {
		const U = customJS.SteamVaultUI, css = [...document.styleSheets].flatMap(sh => { try { return [...sh.cssRules].map(r => r.cssText); } catch (_) { return []; } }).join("\n");
		const js = new Set(["home.interval", "home.autoplay", "home.count", "home.items", "home.hero=cards", "home.cards", "home.perRow", "cards.library"]);
		const shown = new Set(["home", "game", "cards", "banners", "library", "layout"].flatMap(a => customJS.SteamVaultLook.controls(a).map(c => c.key).filter(Boolean)));
		const miss = [];
		for (const [sec, f] of Object.entries(U.layoutSchema)) for (const [k, vals] of Object.entries(f)) {
			if (!shown.has(`${sec}.${k}`)) continue;
			const attr = `data-lay-${sec}-${k.replace(/[A-Z]/g, c => "-" + c.toLowerCase())}`;
			for (const v of vals.slice(1)) if (!css.includes(`${attr}="${v}"`) && !js.has(`${sec}.${k}`) && !js.has(`${sec}.${k}=${v}`)) miss.push(`${sec}.${k}=${v}`);
		}
		window.__lookMiss = miss; return !miss.length;
	}), JSON.stringify(await p.evaluate(() => window.__lookMiss || [])));
	await p.evaluate(() => localStorage.setItem("steamvault:ui:layout", JSON.stringify({ cards: { style: "cinema" } })));
	await go("Dashboard/Home.md");
	check("card cinematográfico usa a arte horizontal com endereço absoluto", await p.evaluate(() => { const c = document.querySelector(".sv-shelf-track > .sv-card.has-wide"); return !!c && /url\("(?:https?|app|file|blob|capacitor):/.test(c.style.getPropertyValue("--sv-art")); }));
	await p.evaluate(() => localStorage.removeItem("steamvault:ui:layout"));
	await go("Dashboard/Configurações.md");
	await p.evaluate(() => document.querySelector("[data-look]").scrollIntoView({ block: "start" }));
	await p.waitForFunction(() => document.querySelector("[data-look-frame]")?.dataset.ready === "1", null, { timeout: 15000 });
	await click('[data-look-area="game"]'); await p.waitForTimeout(150);
	await p.evaluate(() => { document.querySelector("[data-look-frame]").dataset.ready = ""; document.querySelector('[data-look-key="game.stats"][data-look-v="grid"]').click(); });
	await p.waitForFunction(() => document.querySelector("[data-look-frame]")?.dataset.ready === "1");
	check("prévia: opção só de CSS não redesenha a prévia (só troca atributos)", await p.evaluate(() => document.querySelector("[data-look-frame]").dataset.full === "0" && document.querySelector(".sv-look-iframe").contentDocument.querySelector(".sv-app").getAttribute("data-lay-game-stats") === "grid"));
	const pvScroll = d => p.evaluate(d => { const pv = document.querySelector("[data-look-pv]"); const L = document.querySelector(".sv-layer"); const top0 = pv.getBoundingClientRect().top; L.scrollTop += d; return new Promise(res => requestAnimationFrame(() => res({ top0: Math.round(top0), top1: Math.round(pv.getBoundingClientRect().top), pos: getComputedStyle(pv).position, h: Math.round(pv.getBoundingClientRect().height) }))); }, d);
	// 3.58.3: por padrão a prévia rola com a página; o alfinete a prende no topo
	r = await pvScroll(400); await pvScroll(-400);
	check("celular: a prévia rola com a página por padrão (não fica presa)", r.pos !== "sticky" && r.top1 < r.top0 - 300, JSON.stringify(r));
	await click("[data-look-pin]"); await p.waitForTimeout(200);
	r = await pvScroll(400); await pvScroll(-400);
	check("celular: o alfinete prende a prévia no topo (e é lembrado)", r.pos === "sticky" && r.top1 > 0 && r.top1 < 90 && r.h < 360 && await p.evaluate(() => localStorage.getItem("steamvault:ui:lookPvPinned") === "1"), JSON.stringify(r));
	await click("[data-look-pin]"); await p.waitForTimeout(150);
	await click("[data-look-fold]"); await p.waitForTimeout(150);
	check("celular: recolher a prévia deixa só a barra (e é lembrado)", await p.evaluate(() => document.querySelector("[data-look-pv]").classList.contains("is-folded") && getComputedStyle(document.querySelector("[data-look-frame]")).display === "none" && localStorage.getItem("steamvault:ui:lookPvFolded") === "1"));
	await click("[data-look-fold]"); await p.waitForTimeout(150);
	check("celular: alvos de toque da central com pelo menos 44 px", await p.evaluate(() => [...document.querySelectorAll("[data-look] :is(.sv-look-seg, .sv-look-pvview, .sv-look-pvdev) > button, [data-look] .sv-look-tab, [data-look] .sv-look-preset-more, [data-look] [data-look-fold], [data-look] .sv-look-actions > .sv-btn")].filter(b => b.getBoundingClientRect().width).every(b => { const r = b.getBoundingClientRect(); return r.height >= 43.5 && r.width >= 43.5; })));
	await click("[data-look-cancel]"); await p.waitForTimeout(200);
	// ---- todas as telas sem erro depois de tudo isso
	// 3.67.0: "Adicionar jogos" da coleção grava os links
	{
		const CP = "Collections/Favoritos.md";
		const before = JSON.stringify((await fm(CP))?.games || []);
		await go(CP); await openAction({ action: "collection-games", path: CP }); await p.waitForTimeout(600);
		await p.evaluate(() => { const i = [...document.querySelectorAll(".sv-picker-item input")].find(x => !x.checked); if (i) { i.checked = true; i.dispatchEvent(new Event("change", { bubbles: true })); } });
		check("Coleção, Adicionar jogos: a contagem vem dos marcados (e a lupa não cobre o texto)", await p.evaluate(() => { const n = document.querySelectorAll(".sv-picker-item input:checked").length; const t = document.querySelector("[data-picker-count]")?.textContent || ""; const inp = document.querySelector("[data-picker-q]"); return t.startsWith(String(n)) && parseFloat(getComputedStyle(inp).paddingLeft) >= 30; }));
		await click(".sv-modal [data-save]"); await p.waitForTimeout(600);
		const after = (await fm(CP))?.games || [];
		check("Coleção, Adicionar jogos: grava os links [[...]] dos marcados", after.length === JSON.parse(before).length + 1 && after.every(x => /^\[\[[^\]]+\]\]$/.test(x)), JSON.stringify(after));
		await p.evaluate(([CP, v]) => { __PAGES.find(y => y.path === CP).fm.games = JSON.parse(v); customJS.SteamVaultCore.invalidate?.(); }, [CP, before]);
		await closeModal();
	}
	// 3.68.0: estrelas num elemento só; Tier List montada em partes; carrossel em %
	{
		const st = await p.evaluate(() => { const U = customJS.SteamVaultUI; const d = document.createElement("div"); d.innerHTML = U.stars(3.5) + U.stars(4) + U.stars(0); const s = [...d.querySelectorAll(".sv-stars")]; return s.map(x => ({ on: x.style.getPropertyValue("--on"), half: x.querySelectorAll("i").length, label: x.getAttribute("aria-label"), svgs: x.querySelectorAll("svg").length })); });
		check("estrelas: um elemento só, cheias em --on e a meia como <i>", st[0].on === "3" && st[0].half === 1 && st[1].on === "4" && st[1].half === 0 && st[2].on === "0" && st.every(x => x.svgs === 0) && st[0].label === "3.5 de 5", JSON.stringify(st));
		const tierSnap = await p.evaluate(() => __PAGES.filter(x => x.fm?.type === "game").map(x => [x.path, x.fm.tier, x.fm.tierOrder]));
		await go("Dashboard/Tier List.md"); await p.waitForTimeout(1500);
		const elig = await p.evaluate(() => customJS.SteamVaultCore.model(mkdv()).games.filter(g => g.status !== "Wishlist").length);
		check("Tier List: todas as capas elegíveis aparecem", await count(".sv-tiletier") === elig, `${await count(".sv-tiletier")} de ${elig}`);
		const moved = await p.evaluate(() => {
			const tile = document.querySelector(".sv-tiletier[data-tier-game]"); const zone = document.querySelector('[data-tier-zone="D"]');
			if (!tile || !zone) return null;
			const dt = new DataTransfer();
			tile.dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer: dt }));
			zone.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: dt, clientX: 99999, clientY: 99999 }));
			zone.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }));
			tile.dispatchEvent(new DragEvent("dragend", { bubbles: true, dataTransfer: dt }));
			return tile.dataset.tierGame;
		});
		await p.waitForTimeout(500);
		const tfm = moved ? await fm(moved) : null;
		check("Tier List: arrastar para a faixa D grava tier e ordem", !!tfm && tfm.tier === "D" && Number(tfm.tierOrder) >= 1, JSON.stringify({ moved, tier: tfm?.tier, order: tfm?.tierOrder }));
		await p.evaluate(snap => { for (const [path, t, o] of snap) { const x = __PAGES.find(y => y.path === path); if (x) { x.fm.tier = t; x.fm.tierOrder = o; } } customJS.SteamVaultCore.invalidate?.(); }, tierSnap);
		await go("Dashboard/Home.md"); await p.waitForTimeout(500);
		const tr = await p.evaluate(() => document.querySelector("[data-herocar-track]")?.style.transform || "");
		check("carrossel: posição em % da largura (sem medir na montagem)", !tr || /%/.test(tr), tr);
	}
	// 3.66.0: leitura tolerante de dados digitados à mão
	const u = await p.evaluate(() => { const C = customJS.SteamVaultCore; return { a: C.num("10,5"), b: C.num("4.5"), c: C.num("1,2,3"), d: C.iso("2024-02-30"), e: C.iso("2024-02-29"), f: C.iso("2025-13-01"), g: C._r5(9), h: C._r5(-1), i: C._r5(""), j: C.localIso(new Date(2024, 0, 5, 23, 30)), k: C.today() === C.localIso(new Date()) }; });
	check("dados: vírgula decimal (\"10,5\") vira 10.5", u.a === 10.5 && u.b === 4.5 && u.c === null, JSON.stringify(u));
	check("dados: data impossível (30/02, mês 13) vale como vazia", u.d === "" && u.e === "2024-02-29" && u.f === "", JSON.stringify(u));
	check("dados: nota limitada a 0–5 (vazia continua vazia)", u.g === 5 && u.h === 0 && u.i === null, JSON.stringify(u));
	check("datas: \"hoje\" e conversões usam a data local, não UTC", u.j === "2024-01-05" && u.k, JSON.stringify(u));
	check("ícones: nomes descritivos não são sobrescritos (Bola (esportes))", await p.evaluate(() => customJS.SteamVaultBrowse.iconLabel("ball")) === "Bola (esportes)");
	// 3.74.0: conquistas do Xbox 100% manuais (gerenciador com lote, planilha e ícones)
	{
		// limpeza: nada das integrações antigas sobrou
		const gone = await p.evaluate(() => { const A = customJS.SteamVaultAchievements, PL = customJS.SteamVaultPlatforms; return {
			a: ["openXboxImport", "openXboxSearch", "parseAchievementText", "parseAchievementHtml", "parseMhtml", "bookmarkletUrl", "applyXboxImport", "mergeXboxLists"].filter(k => typeof A[k] === "function"),
			pl: ["purgeLegacyXbox", "msStart", "msPoll"].filter(k => typeof PL[k] === "function"), legacy: "legacySecrets" in (PL.get("xbox") || {}), kind: PL.get("xbox").kind,
			am: typeof customJS.SteamVaultAchManager?.open === "function" }; });
		check("Xbox: as integrações e importações antigas foram removidas (API, fontes, página salva, favorito)", !gone.a.length && !gone.pl.length && !gone.legacy && gone.kind === "manual" && gone.am, JSON.stringify(gone));
		await go("Dashboard/Xbox.md");
		check("Xbox: a página do perfil é manual, sem conexão nem sites externos", await p.evaluate(() => { const t = document.querySelector(".sv-app").innerText; return !/TrueAchievements|Exophase|MetaGamerScore|XB\.Live|OpenXBL/i.test(t) && ![...document.querySelectorAll(".sv-app button, .sv-app a")].some(b => /Xbox|Microsoft/i.test(b.textContent) && /Conectar|Entrar com/i.test(b.textContent)); }));
		// leitura da lista em lote
		const P = await p.evaluate(() => { const AM = customJS.SteamVaultAchManager; const s = r => r.rows.map(x => `${x.name}|${x.description}|${x.points}|${x.category}|${x.set}`);
			return { pipe: s(AM.parseBulk("Primeiro passo | Complete o primeiro capítulo | 10\nGuerreiro | Derrote o chefe | 20 | Combate\n## Farewell\nAdeus | Fim | 50 | História | \n## Jogo base\nVolta | Base | 5")),
				csv: s(AM.parseBulk("Nome;Descrição;G;Categoria;DLC\n\"Cume\";\"Topo; alto\";30;Exploração;\nLua;Lua cheia;20;;Farewell")),
				commaHdr: s(AM.parseBulk('Name,Description,Gamerscore\nCume,"Chegue, enfim",30')),
				dup: AM.parseBulk("A | x | 10\na | y | 20").rows.length, junk: AM.parseBulk("   \n\n").rows.length,
				g: AM.parseBulk("A | x | 10G\nB | y | 9999").rows.map(r => r.points), un: AM.parseBulk("Nome,Desbloqueada\nA,sim\nB,não").rows.map(r => r.unlocked),
				match: ["02 - Guerreiro.png", "adeus.webp", "3.jpg", "outro.png"].map(f => AM.matchIcon(f, [{ name: "Primeiro passo" }, { name: "Guerreiro" }, { name: "Adeus" }])?.name || "-") }; });
		check("lote: uma por linha (Nome | Descrição | G | Categoria) e seções ## de DLC", P.pipe.join() === "Primeiro passo|Complete o primeiro capítulo|10||,Guerreiro|Derrote o chefe|20|Combate|,Adeus|Fim|50|História|Farewell,Volta|Base|5||", JSON.stringify(P.pipe));
		check("lote: planilha CSV com cabeçalho (aspas e ;) e coluna de DLC", P.csv.join() === "Cume|Topo; alto|30|Exploração|,Lua|Lua cheia|20||Farewell" && P.commaHdr.join() === "Cume|Chegue, enfim|30||", JSON.stringify([P.csv, P.commaHdr]));
		check("lote: repetidas viram uma, G aceita \"10G\" e fica até 1000, coluna Desbloqueada", P.dup === 1 && P.junk === 0 && P.g.join() === "10,1000" && P.un.join() === "true,false", JSON.stringify(P));
		check("ícones: associação pelo nome do arquivo e pelo número", P.match.join() === "Guerreiro,Adeus,Adeus,-", JSON.stringify(P.match));
		// cadastro do jogo de Xbox: origem Xbox e o lote abre sozinho
		const act = a => p.evaluate(a => { const b = document.createElement("button"); b.hidden = true; for (const [k, v] of Object.entries(a)) b.dataset[k] = v; document.querySelector(".sv-app").appendChild(b); b.click(); b.remove(); }, a);
		await go("Dashboard/Biblioteca.md"); await act({ action: "add-game" }); await p.waitForTimeout(600);
		await p.evaluate(() => { const v = (id, x, ev = "input") => { const e = document.querySelector(id); e.value = x; e.dispatchEvent(new Event(ev, { bubbles: true })); }; v("#svl-f-title", "Teste Xbox 374"); v("#svl-f-platform", "Xbox Series", "change"); v("#svl-f-developer", "Remedy"); v("#svl-f-publisher", "Epic"); v("#svl-f-releasedate", "2023-10-27"); v("#svl-f-rating", "4.5"); v("#svl-f-notes", "Parei no capítulo 3"); });
		check("cadastro manual: o formulário tem capa, gêneros, sinopse, status, tempo e observações", await p.evaluate(() => ["#svl-f-cover", "#svl-f-genre", "#svl-f-subgenre", "#svl-f-summary", "#svl-f-status", "#svl-f-hours", "#svl-f-notes"].every(s => document.querySelector(s))));
		check("Xbox: escolher a plataforma Xbox define a origem das conquistas", await p.evaluate(() => document.querySelector("#svl-f-ach-provider")?.value) === "xbox");
		await p.evaluate(() => document.querySelector("#svl-f-submit").click()); await p.waitForTimeout(1200);
		const xp = await p.evaluate(() => (window.__created || []).find(x => /Teste Xbox 374/.test(x)));
		const xf = xp ? await fm(xp) : {};
		check("cadastro manual: grava desenvolvedora, publicadora, lançamento, nota e observações", xf.developer === "Remedy" && xf.publisher === "Epic" && xf.releaseDate === "2023-10-27" && Number(xf.rating) === 4.5 && xf.notes?.[0] === "Parei no capítulo 3", JSON.stringify(xf));
		await p.keyboard.press("Escape"); await p.waitForTimeout(300);
		await p.evaluate(() => { customJS.SteamVaultCore.invalidate(); app.vault.adapter.list = async d => ({ files: Object.keys(window.__fs || {}).filter(k => k.startsWith(d + "/") && !k.slice(d.length + 1).includes("/")), folders: [] }); });
		await go(xp); await p.waitForTimeout(600);
		check("Xbox: depois de criar o jogo, o cadastro em lote das conquistas abre sozinho", await p.evaluate(() => !!document.querySelector(".sv-am [data-am-text]")));
		const sum = s => p.evaluate(s => document.querySelector(s)?.innerText.replace(/\s+/g, " ").trim() || "", s);
		const notes = () => p.evaluate(x => __PAGES.filter(y => y.fm?.type === "achievement" && y.fm.gamePath === x).map(y => `${y.fm.name}|${y.fm.points}|${y.fm.category || ""}|${y.fm.set || ""}|${y.fm.unlocked}|${y.fm.icon || ""}`).sort(), xp);
		await p.evaluate(t => { const ta = document.querySelector("[data-am-text]"); ta.value = t; ta.dispatchEvent(new Event("input", { bubbles: true })); }, "Primeiro passo | Complete o primeiro capítulo | 10\nGuerreiro | Derrote o primeiro chefe | 20 | Combate\n## Farewell\nAdeus | Termine o capítulo 9 | 50 | História");
		await p.waitForTimeout(400);
		check("lote: a prévia mostra quantidade, G e novas", /3 conquistas · 80 G/.test(await sum("[data-am-sum]")) && /Adicionar 3/.test(await sum("[data-am-bulkgo]")), await sum("[data-am-sum]"));
		await p.evaluate(() => document.querySelector("[data-am-bulkgo]").click()); await p.waitForTimeout(800);
		check("lote: cria as notas com G, categoria e DLC", (await notes()).join() === "Adeus|50|História|Farewell|false|,Guerreiro|20|Combate||false|,Primeiro passo|10|||false|", JSON.stringify(await notes()));
		// cadastro individual sequencial, duplicado barrado, duplicar
		await p.evaluate(() => document.querySelector("[data-am-new]").click()); await p.waitForTimeout(200);
		const fill = o => p.evaluate(o => { for (const [k, v] of Object.entries(o)) { const e = document.querySelector(`[data-f="${k}"]`); e.value = v; e.dispatchEvent(new Event("input", { bubbles: true })); } }, o);
		await fill({ name: "Sem pressa", description: "Termine sem morrer", points: "25", category: "Desafio" });
		await p.evaluate(() => document.querySelector("[data-am-savenext]").click()); await p.waitForTimeout(400);
		check("cadastro: \"Salvar e próxima\" grava e já abre a próxima (mantém a categoria)", await p.evaluate(() => document.querySelector('[data-f="name"]')?.value === "" && document.querySelector('[data-f="category"]')?.value === "Desafio"));
		await fill({ name: "guerreiro", points: "5" }); await p.evaluate(() => document.querySelector("[data-am-save]").click()); await p.waitForTimeout(200);
		check("cadastro: nome repetido no mesmo jogo é barrado", /Já existe/.test(await sum("[data-msg]")));
		await p.evaluate(() => document.querySelector("[data-am-back]").click()); await p.waitForTimeout(200);
		await p.evaluate(() => [...document.querySelectorAll("[data-am-edit]")].find(b => /Guerreiro/.test(b.textContent)).click()); await p.waitForTimeout(200);
		await p.evaluate(() => document.querySelector("[data-am-dup]").click()); await p.waitForTimeout(200);
		const dupName = await p.evaluate(() => document.querySelector('[data-f="name"]').value);
		await fill({ name: "Guerreiro II", points: "30" }); await p.evaluate(() => document.querySelector("[data-am-save]").click()); await p.waitForTimeout(400);
		check("cadastro: duplicar copia os campos e cria outra conquista", dupName === "Guerreiro (cópia)" && (await notes()).some(n => n.startsWith("Guerreiro II|30|Combate|")), JSON.stringify(await notes()));
		// desbloqueio, números e ações em massa
		await p.evaluate(() => [...document.querySelectorAll("[data-am-toggle]")].slice(0, 2).forEach(b => b.click())); await p.waitForTimeout(500);
		const st = await sum(".sv-am-stats");
		check("números: total, desbloqueadas, restantes, G conquistado/total e %", /^5 conquistas 2 desbloqueadas 3 restantes 30\/135 G Gamerscore$/.test(st) && /40%/.test(await sum(".sv-am-progress")), st);
		await p.evaluate(() => document.querySelector("[data-am-select]").click()); await p.waitForTimeout(150);
		await p.evaluate(() => { const c = document.querySelector('[data-am-sel*="Guerreiro II"]'); c.checked = true; c.dispatchEvent(new Event("change", { bubbles: true })); }); await p.waitForTimeout(150);
		await p.evaluate(() => document.querySelector('[data-am-bulkact="delete"]').click()); await p.waitForTimeout(250);
		await p.evaluate(() => [...document.querySelectorAll(".sv-modal-root button")].filter(b => /^Excluir$/.test(b.textContent.trim())).pop()?.click()); await p.waitForTimeout(600);
		const bk = await p.evaluate(() => Object.keys(window.__fs || {}).filter(k => /^Backups\/Conquistas\/Teste Xbox 374\/.+antes de excluir\.json$/.test(k)));
		check("seleção: excluir pede confirmação e faz backup antes", !(await notes()).some(n => n.startsWith("Guerreiro II")) && bk.length === 1, JSON.stringify(bk));
		// planilha CSV atualizando uma existente (com backup) e ícone pelo nome
		await p.evaluate(async () => { const c = document.createElement("canvas"); c.width = 64; c.height = 64; c.getContext("2d").fillRect(0, 0, 64, 64); const bl = await new Promise(r => c.toBlob(r, "image/png")); await app.vault.createBinary("Assets/Achievements/Teste Xbox 374/guerreiro.png", await bl.arrayBuffer()); });
		await p.evaluate(() => document.querySelector('[data-am-tab="bulk"]').click()); await p.waitForTimeout(200);
		await p.evaluate(t => { const inp = document.querySelector("[data-am-sheet]"); const dt = new DataTransfer(); dt.items.add(new File([t], "lista.csv", { type: "text/csv" })); inp.files = dt.files; inp.dispatchEvent(new Event("change", { bubbles: true })); }, "Nome;Descrição;G;Categoria;Ícone\nGuerreiro;Derrote o chefe final;40;Combate;guerreiro.png\nAlpinista;Escale;15;Desafio;");
		await p.waitForTimeout(500);
		const csvSum = await sum("[data-am-sum]");
		await p.evaluate(() => { const c = document.querySelector("[data-am-upd]"); c.checked = true; c.dispatchEvent(new Event("change", { bubbles: true })); }); await p.waitForTimeout(150);
		await p.evaluate(() => document.querySelector("[data-am-bulkgo]").click()); await p.waitForTimeout(250);
		await p.evaluate(() => [...document.querySelectorAll(".sv-modal-root button")].filter(b => /^Atualizar$/.test(b.textContent.trim())).pop()?.click()); await p.waitForTimeout(700);
		const n2 = await notes();
		check("planilha: CSV reconhece colunas, atualiza a existente (com confirmação) e associa o ícone pelo nome", /1 nova · 1 já existe/.test(csvSum) && n2.includes("Guerreiro|40|Combate||true|Assets/Achievements/Teste Xbox 374/guerreiro.png") && n2.includes("Alpinista|15|Desafio||false|"), JSON.stringify([csvSum, n2]));
		// Excel (.xlsx)
		const xlsx = await p.evaluate(async () => { const CA = customJS.SteamVaultCare;
			const sheet = `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row><row r="2"><c r="A2" t="s"><v>3</v></c><c r="B2"><v>100</v></c><c r="C2" t="s"><v>4</v></c></row><row r="3"><c r="A3" t="inlineStr"><is><t>Perfeição</t></is></c><c r="B3"><v>60</v></c></row></sheetData></worksheet>`;
			const sst = `<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${["Nome", "G", "DLC", "Mestre", "Pacote 2"].map(s => `<si><t>${s}</t></si>`).join("")}</sst>`;
			const blob = await CA.zip([{ name: "xl/workbook.xml", data: `<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="A" sheetId="1" r:id="rId1"/></sheets></workbook>` }, { name: "xl/_rels/workbook.xml.rels", data: `<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>` }, { name: "xl/worksheets/sheet1.xml", data: sheet }, { name: "xl/sharedStrings.xml", data: sst }]);
			const inp = document.querySelector("[data-am-sheet]") || (document.querySelector('[data-am-tab="bulk"]').click(), document.querySelector("[data-am-sheet]"));
			const dt = new DataTransfer(); dt.items.add(new File([blob], "lista.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })); inp.files = dt.files; inp.dispatchEvent(new Event("change", { bubbles: true }));
			await new Promise(r => setTimeout(r, 500));
			return document.querySelector("[data-am-sum]")?.innerText.replace(/\s+/g, " ");
		});
		await p.evaluate(() => document.querySelector("[data-am-bulkgo]").click()); await p.waitForTimeout(700);
		check("planilha: Excel (.xlsx) é lido e importado", /2 conquistas · 160 G/.test(xlsx) && (await notes()).some(n => n === "Mestre|100||Pacote 2|false|") && (await notes()).some(n => n.startsWith("Perfeição|60|")), JSON.stringify(xlsx));
		// ícones em lote
		await p.evaluate(() => document.querySelector('[data-am-tab="icons"]').click()); await p.waitForTimeout(200);
		await p.evaluate(async () => { const mk = async n => { const c = document.createElement("canvas"); c.width = 300; c.height = 200; c.getContext("2d").fillRect(0, 0, 300, 200); return new File([await new Promise(r => c.toBlob(r, "image/png"))], n, { type: "image/png" }); };
			const inp = document.querySelector("[data-am-pics]"); const dt = new DataTransfer(); for (const n of ["01 - Primeiro passo.png", "Adeus.png", "qualquer.png"]) dt.items.add(await mk(n)); inp.files = dt.files; inp.dispatchEvent(new Event("change", { bubbles: true })); });
		await p.waitForTimeout(500);
		const auto = await p.evaluate(() => [...document.querySelectorAll("[data-am-pic]")].map(s => s.selectedOptions[0]?.textContent || ""));
		await p.evaluate(() => document.querySelector("[data-am-icongo]").click()); await p.waitForTimeout(1200);
		const n3 = await notes();
		check("ícones: várias imagens associadas pelo nome e salvas no vault (WebP, por jogo)", auto[0] === "Primeiro passo" && auto[1] === "Adeus" && /Não usar/.test(auto[2]) && n3.some(n => /^Primeiro passo\|.*\|Assets\/Achievements\/Teste Xbox 374\/Primeiro passo\.(webp|png)$/.test(n)) && n3.some(n => /^Adeus\|.*\|Assets\/Achievements\/Teste Xbox 374\/Adeus\.(webp|png)$/.test(n)), JSON.stringify([auto, n3]));
		// backup e restauração
		await p.evaluate(() => document.querySelector('[data-am-tab="list"]').click()); await p.waitForTimeout(200);
		await p.evaluate(() => document.querySelector("[data-am-backup]").click()); await p.waitForTimeout(400);
		await p.evaluate(async x => { const pg = __PAGES.find(y => y.fm?.type === "achievement" && y.fm.gamePath === x && y.fm.name === "Alpinista"); await app.fileManager.trashFile(app.vault.getAbstractFileByPath(pg.path)); }, xp);
		await p.evaluate(() => document.querySelector("[data-am-restore]").click()); await p.waitForTimeout(400);
		await p.evaluate(() => document.querySelector("[data-am-restorego]").click()); await p.waitForTimeout(250);
		await p.evaluate(() => [...document.querySelectorAll(".sv-modal-root button")].filter(b => /^Restaurar$/.test(b.textContent.trim()) && !b.dataset.amRestorego).pop()?.click()); await p.waitForTimeout(800);
		check("backup: restaurar recria o que sumiu sem apagar nada", (await notes()).some(n => n.startsWith("Alpinista|15|Desafio|")) && (await notes()).length === 7, JSON.stringify(await notes()));
		await p.evaluate(() => document.querySelector("[data-am-export]").click()); await p.waitForTimeout(400);
		check("exportar: CSV com as conquistas do jogo, reimportável", await p.evaluate(() => { const k = Object.keys(window.__fs || {}).find(k => /Teste Xbox 374 - conquistas\.csv$/.test(k)); const t = k && window.__fs[k]; return !!t && customJS.SteamVaultAchManager.parseBulk(t).rows.length === 7; }));
		// ficha
		await p.keyboard.press("Escape"); await p.waitForTimeout(400);
		await p.evaluate(() => customJS.SteamVaultCore.invalidate()); await go(xp);
		await p.evaluate(() => [...document.querySelectorAll(".sv-gamenav [data-tab]")].find(x => /Conquistas/.test(x.textContent))?.click()); await p.waitForTimeout(700);
		const cab = await p.evaluate(() => ({ s: document.querySelector(".sv-cabinet-summary")?.innerText.replace(/\s+/g, " ") || "", sets: [...document.querySelectorAll(".sv-achset-head h3")].map(h => h.textContent), pts: document.querySelectorAll(".sv-ach-pts").length, cats: document.querySelectorAll(".sv-ach-cat").length, rare: !!document.querySelector('[data-ach-filter] [data-value="rare"]'), btns: [...document.querySelectorAll('[data-action="ach-manage"], [data-action="ach-bulk"]')].map(b => b.textContent.trim()) }));
		check("ficha: G conquistado/total, restantes, DLCs separadas, G e categoria em cada conquista", /2 de 7 conquistas/.test(cab.s) && /50 \/ 300 G/.test(cab.s) && /5 restantes/.test(cab.s) && cab.sets.join() === "Jogo base,Farewell,Pacote 2" && cab.pts === 7 && cab.cats >= 4 && !cab.rare && cab.btns.includes("Gerenciar conquistas") && cab.btns.includes("Adicionar em lote"), JSON.stringify(cab));
		await go("Games/PC/Resident Evil 4.md");
		await p.evaluate(() => [...document.querySelectorAll(".sv-gamenav [data-tab]")].find(x => /Conquistas/.test(x.textContent))?.click()); await p.waitForTimeout(500);
		check("Xbox: o cadastro em lote aparece só em jogos de Xbox", await p.evaluate(() => !document.querySelector('[data-action="ach-bulk"]')));
		await p.evaluate(x => { for (let i = __PAGES.length - 1; i >= 0; i--) { const y = __PAGES[i]; if (y.path === x || y.fm?.gamePath === x) __PAGES.splice(i, 1); } customJS.SteamVaultCore.invalidate(); }, xp);
	}
	// Busca e filtros: a busca livre cobre distribuidora, subgênero, plataforma e
	// tags (palavras em qualquer ordem); comandos subgenero:/dev:/dist:/tag:;
	// filtro por subgênero no painel; tag da ficha abre a Biblioteca filtrada.
	{
		await p.evaluate(() => { try { localStorage.removeItem("steamvault:ui:lib:library"); } catch (_) {} });
		await go("Dashboard/Biblioteca.md");
		const shown = () => p.evaluate(() => [...document.querySelectorAll(".sv-library .sv-grid > .sv-card")].filter(e => e.getClientRects().length).map(e => e.querySelector(".sv-card-title")?.textContent.trim()).sort().join("|"));
		const libQ = async v => { await p.evaluate(v => { const q = document.querySelector("[data-lib-q]"); q.value = v; q.dispatchEvent(new Event("input", { bubbles: true })); }, v); await p.waitForTimeout(450); return shown(); };
		const expect = fn => p.evaluate(src => { const f = new Function("g", "return " + src); return __PAGES.filter(x => x.fm?.type === "game" && !x.path.includes("_Templates") && x.fm.status !== "Wishlist" && f(x.fm)).map(x => x.fm.title).sort().join("|"); }, fn);
		const all = await libQ("");
		check("busca: acha pela distribuidora", (await libQ("rockstar games")) === await expect('/rockstar games/i.test(g.publisher || "")') && (await libQ("rockstar games")) !== "");
		check("busca: acha pelo subgênero", (await libQ("puzzle")) === await expect('(g.subgenre || []).some(x => /puzzle/i.test(x)) || /puzzle/i.test(g.title)'));
		check("busca: acha pela plataforma", (await libQ("psp")) === await expect('g.platform === "PSP"'));
		check("busca: palavras em qualquer ordem", (await libQ("evil resident")) === await expect('/resident evil/i.test(g.title)') && (await libQ("evil resident")) !== "");
		check("busca avançada: subgenero:parkour", (await libQ("subgenero:parkour")) === await expect('(g.subgenre || []).includes("Parkour")'));
		check("busca avançada: dev: e dist:", (await libQ("dev:capcom")) === await expect('/capcom/i.test(g.developer || "")') && (await libQ("dist:rockstar")) === await expect('/rockstar/i.test(g.publisher || "")'));
		await libQ("");
		await p.evaluate(() => document.querySelector("[data-lib-filters]").click()); await p.waitForTimeout(450);
		const hasSub = await p.evaluate(() => { const b = [...document.querySelectorAll('.sv-libsheet .sv-fchip[data-k="subgenre"]')].find(b => /Puzzle/.test(b.textContent)); b?.click(); return !!b; });
		await p.waitForTimeout(350); await closeModal();
		const bySub = await shown();
		check("filtro por subgênero: o painel filtra e mostra o chip", hasSub && bySub === await expect('(g.subgenre || []).includes("Puzzle")') && await count('[data-lib-active] [data-rm="subgenre"]') === 1, bySub);
		await p.evaluate(() => rerender()); await p.waitForTimeout(700);
		check("filtro por subgênero: lembrado ao redesenhar", (await shown()) === bySub);
		await click('[data-lib-active] [data-rm="subgenre"]'); await p.waitForTimeout(400);
		check("filtro por subgênero: remover o chip volta tudo", (await shown()) === all);
		// tag da ficha
		const tagged = "Games/PC/Celeste.md";
		await p.evaluate(x => { __PAGES.find(y => y.path === x).fm.labels = ["de boa"]; customJS.SteamVaultCore.invalidate(); }, tagged);
		await go(tagged);
		const chip = await p.evaluate(() => { const b = document.querySelector(".sv-labels [data-ov-search]"); b?.click(); return b ? b.tagName + ":" + b.dataset.ovSearch : ""; });
		await p.waitForTimeout(900);
		check("ficha: a tag é um botão que abre a Biblioteca filtrada por ela", chip === 'BUTTON:tag:"de boa"' && (await shown()) === "Celeste", chip + " → " + await shown());
		await p.evaluate(x => { __PAGES.find(y => y.path === x).fm.labels = []; customJS.SteamVaultCore.invalidate(); }, tagged);
		await libQ("");
		// busca global
		const glob = async v => { await p.evaluate(v => { document.querySelector('[data-action="search-open"]')?.click(); const i = document.querySelector(".sv-search input"); i.focus(); i.value = v; i.dispatchEvent(new Event("input", { bubbles: true })); }, v); await p.waitForTimeout(350); return p.evaluate(() => [...document.querySelectorAll(".sv-search-item")].filter(a => a.querySelector(".sv-cover")).map(a => a.querySelector("b").textContent).sort().join("|")); };
		check("busca global: jogos por plataforma, subgênero e distribuidora", (await glob("ps2")).split("|").includes("Bully") && !(await glob("ps2")).includes("Celeste") && (await glob("survival horror")).split("|").length === 3 && (await glob("rockstar games")) === "Bully", [await glob("ps2"), await glob("survival horror")].join(" / "));
		check("busca global: o nome continua na frente e sem resultado avisa", (await glob("celeste")) === "Celeste" && (await glob("zzzz")) === "" && await count(".sv-search-empty") === 1);
		await p.keyboard.press("Escape"); await p.waitForTimeout(300);
	}
	// 1.0.2: troca de aba como no Obsidian no modo Leitura — cada nota cria um
	// bloco novo e vazio do Dataview, e o bloco pode rodar duas vezes logo
	// depois de abrir. A tela de inicialização só pode aparecer na abertura, e o
	// segundo desenho da mesma tela não pode cortar a animação de entrada.
	{
		const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
		const m = await mctx.newPage();
		m.on("pageerror", e => errors.push(e.message));
		await m.addInitScript(() => document.addEventListener("DOMContentLoaded", () => {
			document.querySelector(".markdown-preview-view").classList.add("steamvault");
			document.getElementById("host").className = "block-language-dataviewjs";
		}));
		await m.goto(url + "?p=Dashboard/Conquistas.md", { waitUntil: "domcontentloaded" });
		const splash = () => m.evaluate(() => { const c = getComputedStyle(document.body, "::before"); return c.content !== "none" && c.visibility !== "hidden" && +c.opacity > 0; });
		const atBoot = await splash();
		await m.waitForFunction(() => window.__ready, null, { timeout: 60000 });
		check("inicialização: a tela de carregamento aparece na abertura e some no primeiro desenho", atBoot && !(await splash()) && await m.evaluate(() => document.body.classList.contains("sv-booted")));
		await m.evaluate(() => {
			window.go = async pth => {
				curPath = pth;
				const old = document.getElementById("host"), nb = document.createElement("div");
				nb.className = "block-language-dataviewjs"; old.removeAttribute("id"); old.replaceWith(nb); nb.id = "host";
				await new Promise(r => setTimeout(r, 150));
				const pg = byPath.get(pth)?.page || "home";
				const side = document.createElement("div"); side.className = "markdown-source-view steamvault"; side.style.display = "none";
				const h2 = document.createElement("div"); h2.className = "block-language-dataviewjs"; side.appendChild(h2);
				document.querySelector(".view-content").prepend(side);
				await Promise.all([customJS.SteamVault.render(mkdv(), pg), new Promise(r => setTimeout(r, 40)).then(() => customJS.SteamVault.render({ ...mkdv(), container: h2 }, pg))]);
			};
		});
		await m.evaluate(() => [...document.querySelectorAll(".sv-bottomnav-item[data-open]")].find(x => /Biblioteca$/.test(x.dataset.open))?.click());
		let flashed = false, first = null, swapped = false, refresh = false;
		for (let i = 0; i < 45; i++) {
			if (await splash()) flashed = true;
			const st = await m.evaluate(f => { const a = document.querySelector(".sv-layer .sv-app"); if (!a || a.dataset.page !== "library") return null; if (!window.__svFirst) window.__svFirst = a; return { same: window.__svFirst === a, refresh: a.classList.contains("is-refresh") }; });
			if (st) { first = true; if (!st.same) swapped = true; if (st.refresh) refresh = true; }
			await m.waitForTimeout(20);
		}
		check("troca de aba (modo Leitura): a tela de carregamento não aparece de novo", first && !flashed);
		check("troca de aba: o segundo desenho da mesma tela não corta a animação de entrada", first && !swapped && !refresh && await m.evaluate(() => document.querySelector(".sv-layer .sv-app").classList.contains("sv-motion")), JSON.stringify({ swapped, refresh }));
		await mctx.close();
	}
	check("nenhum erro de script durante os testes", errors.length === 0, errors.slice(0, 3).join(" | "));

	await browser.close(); server.close();
	const fails = results.filter(r => !r.ok).length;
	console.log(fails ? `\n${fails} teste(s) funcional(is) falharam` : `\nTodos os ${results.length} testes funcionais passaram`);
	process.exit(fails ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1); });
