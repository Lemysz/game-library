// Verificações rápidas, sem navegador: sintaxe, espelho do CSS, versão, notas e segredos.
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const { ROOT, buildData } = require("./server");

const fails = [];
const ok = (name, cond, detail = "") => { console.log(`${cond ? "ok  " : "FAIL"} ${name}${!cond && detail ? `\n     ${detail}` : ""}`); if (!cond) fails.push(name); };
const read = p => fs.readFileSync(path.join(ROOT, p), "utf8");

// 1. Sintaxe de cada script do CustomJS
for (const f of fs.readdirSync(path.join(ROOT, "Scripts")).filter(f => f.endsWith(".js"))) {
	let err = "";
	try { execFileSync(process.execPath, ["--check", path.join(ROOT, "Scripts", f)], { stdio: "pipe" }); } catch (e) { err = String(e.stderr || e.message).split("\n").slice(0, 4).join(" "); }
	ok(`sintaxe Scripts/${f}`, !err, err);
}

// 2. A cópia em _install/ é idêntica ao snippet ativo
ok("_install/steamvault.css igual a .obsidian/snippets/steamvault.css", read("_install/steamvault.css") === read(".obsidian/snippets/steamvault.css"));

// 3. Versão: código, selo do README e CHANGELOG andam juntos (SemVer + estágio)
const core = read("Scripts/SteamVaultCore.js");
const version = (/this\.VERSION\s*=\s*"(\d+\.\d+\.\d+)"/.exec(core) || [])[1];
const stage = (/this\.STAGE\s*=\s*"([\w-]*)"/.exec(core) || [])[1];
ok("VERSION (SemVer) definida no SteamVaultCore.js", !!version);
ok("STAGE definido no SteamVaultCore.js", stage !== undefined);
const badge = (/vers%C3%A3o-([\d.]+)/.exec(read("README.md")) || [])[1];
ok(`selo do README (${badge}) igual à VERSION (${version})`, badge === version);
ok(`CHANGELOG.md tem a seção da versão ${version}`, new RegExp(`^## \\[${String(version).replace(/\./g, "\\.")}\\]`, "m").test(read("CHANGELOG.md")));

// 3b. Higiene do repositório: nada de código de terceiros, lixeira ou estado local versionados
{
	const files = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" }).split("\n").filter(Boolean);
	const bad = files.filter(f => /^\.obsidian\/plugins\/[^/]+\/(main\.js|styles\.css|manifest\.json)$/.test(f) || /^\.obsidian\/themes\//.test(f)
		|| /^\.obsidian\/workspace[^/]*\.json$/.test(f) || /^\.trash\//.test(f) || /^Backups\//.test(f) || /(^|\/)\.env(\.|$)/.test(f) || /node_modules\//.test(f));
	ok("sem plugins/tema de terceiros, lixeira, backups ou estado local no git", !bad.length, bad.slice(0, 6).join(", "));
	const needed = [".obsidian/community-plugins.json", ".obsidian/plugins/dataview/data.json", ".obsidian/plugins/customjs/data.json", ".obsidian/snippets/steamvault.css", ".obsidian/appearance.json"];
	const miss = needed.filter(f => !files.includes(f));
	ok("configurações necessárias do vault versionadas", !miss.length, miss.join(", "));
	let dv = {}; try { dv = JSON.parse(read(".obsidian/plugins/dataview/data.json")); } catch (_) { }
	ok("Dataview com consultas JavaScript ligadas (data.json)", dv.enableDataviewJs === true);
	let cj = {}; try { cj = JSON.parse(read(".obsidian/plugins/customjs/data.json")); } catch (_) { }
	ok("CustomJS lendo a pasta Scripts/ (data.json)", cj.jsFolder === "Scripts/");
}

// 4. Todas as notas têm frontmatter legível
const data = buildData();
ok(`frontmatter de ${data.pages.length} notas`, !data.yamlErrors.length, data.yamlErrors.slice(0, 5).join("\n     "));

// 5. Cada tela do Dashboard aponta para uma rota que existe
const router = read("Scripts/SteamVault.js");
const block = (/this\.routes\s*=\s*\{([\s\S]*?)\n\t*\};/.exec(router) || [])[1] || "";
const routes = new Set([...block.matchAll(/"?([\w-]+)"?:\s*\["\w+",\s*"\w+"\]/g)].map(m => m[1]));
ok(`rotas lidas do roteador (${routes.size})`, routes.size > 20);
const missing = data.pages.filter(p => p.path.startsWith("Dashboard/") && p.page && !routes.has(p.page) && p.page !== "home").map(p => `${p.path} → ${p.page}`);
ok("telas do Dashboard com rota conhecida", !missing.length, missing.join(", "));

// 6. Nenhum segredo no repositório (chaves e tokens vivem só no aparelho)
const secretRx = [
	/\b[0-9A-F]{32}\b(?=[^\n]{0,40}(?:key|token|secret))/i,       // chave Steam Web API ao lado de "key"
	/(?:apikey|api_key|access_token|refresh_token|client_secret)\s*[:=]\s*["'][A-Za-z0-9_\-.]{16,}["']/i,
	/\bgh[pousr]_[A-Za-z0-9]{30,}\b/,                                // token do GitHub
	/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/
];
const tracked = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" }).split("\n").filter(f => /\.(js|md|json|ya?ml|css|txt)$/.test(f) && !f.startsWith(".github/tests/"));
const leaks = [];
for (const f of tracked) { const t = read(f); for (const rx of secretRx) if (rx.test(t)) leaks.push(`${f} (${rx.source.slice(0, 30)}…)`); }
ok("nenhum segredo nos arquivos versionados", !leaks.length, leaks.slice(0, 5).join("\n     "));
ok("cache local .steamvault/ fora do git", !tracked.some(f => f.startsWith(".steamvault/")));

// 7. Atalhos do contexto (C, U, V…) usados num método sem terem sido declarados nele
//    (um "C is not defined" só aparece quando aquela parte da tela é desenhada)
const CTX_VARS = ["U", "C", "V", "S", "R", "L", "X", "PL", "PK", "SP", "RP", "B", "model"];
const undef = [];
for (const f of fs.readdirSync(path.join(ROOT, "Scripts")).filter(f => f.endsWith(".js"))) {
	const lines = read(`Scripts/${f}`).split("\n");
	const starts = [];
	lines.forEach((l, i) => { const m = /^\t(?:async\s+)?([\w$]+)\s*\(.*\)\s*\{\s*$/.exec(l); if (m && !/^(if|for|while|switch|catch)$/.test(m[1])) starts.push([m[1], i]); });
	starts.forEach(([name, s], k) => {
		const code = lines.slice(s, k + 1 < starts.length ? starts[k + 1][1] : lines.length).join("\n")
			.replace(/\/\/.*$/gm, "").replace(/"(?:\\.|[^"\\\n])*"/g, '""').replace(/'(?:\\.|[^'\\\n])*'/g, "''");
		for (const v of CTX_VARS) {
			if (!new RegExp(`(?<![\\w$.])${v}(?=\\??\\.)`).test(code)) continue;
			const declared = new RegExp(`(?:const|let|var)\\s*\\{[^}]*(?<![\\w$:])${v}(?![\\w$])[^}]*\\}|(?:const|let|var)\\s+(?:[\\w$]+\\s*=\\s*[^,;]+,\\s*)*${v}\\s*=|[,(]\\s*${v}\\s*[,)=]|\\(\\s*${v}\\s*\\)|(?<![\\w$.])${v}\\s*=>`).test(code);
			if (!declared) undef.push(`Scripts/${f}:${s + 1} ${name}() usa ${v} sem declarar`);
		}
	});
}
ok("atalhos do contexto declarados em cada método", !undef.length, undef.slice(0, 8).join("\n     "));

// 8. Segurança do código (3.24.2)
const code = [...fs.readdirSync(path.join(ROOT, "Scripts")).filter(f => f.endsWith(".js")).map(f => `Scripts/${f}`), "Assets/steamvault-boot.js"]
	.map(f => [f, read(f).split("\n")]);
const hits = (rx, allow = null) => code.flatMap(([f, lines]) => lines.map((l, i) => [l, i]).filter(([l]) => rx.test(l) && !(allow && allow.test(l))).map(([, i]) => `${f}:${i + 1}`));
const noStr = l => l.replace(/\/\/.*$/, "").replace(/`(?:\\.|[^`\\])*`/g, "``").replace(/"(?:\\.|[^"\\])*"/g, '""').replace(/'(?:\\.|[^'\\])*'/g, "''");
const evalHits = hits(/(?<![\w$.])eval\s*\(|new\s+Function\s*\(|document\.write\s*\(/);
ok("sem eval, new Function ou document.write", !evalHits.length, evalHits.slice(0, 5).join(", "));
// link aberto pelo app passa antes por uma validação de endereço
const openHits = hits(/window\.open\s*\(/, /safeUrl|_storeUrl|https\?:/);
ok("window.open só com endereço validado", !openHits.length, openHits.slice(0, 5).join(", "));
// nada de chave, token ou senha em console.*
const logHits = code.flatMap(([f, lines]) => lines.map((l, i) => [noStr(l), i]).filter(([l]) => /console\.\w+\(/.test(l) && /\b(api_?key|apiKey|secret|token|refresh_token|password|senha|_secret\(|_apiKey\()/i.test(l)).map(([, i]) => `${f}:${i + 1}`));
ok("nenhuma chave ou token enviado ao console", !logHits.length, logHits.slice(0, 5).join(", "));
// segredos só no armazenamento local do Obsidian, nunca em arquivo do vault
const writeSecret = code.flatMap(([f, lines]) => lines.map((l, i) => [noStr(l), i]).filter(([l]) => /vault\.(create|modify|append)|adapter\.write/.test(l) && /\b(apiKey|_apiKey\(|_secret\(|refresh_token|access_token)\b/.test(l)).map(([, i]) => `${f}:${i + 1}`));
ok("chaves nunca gravadas em notas ou arquivos", !writeSecret.length, writeSecret.slice(0, 5).join(", "));
const gi = read(".gitignore");
ok(".gitignore protege .steamvault/ e Backups/", /^\.steamvault\/$/m.test(gi) && /^Backups\/$/m.test(gi));

// Imagens: referências do frontmatter existem e nenhuma passa de 1 MB (pesa no celular).
const artMissing = [];
for (const f of fs.readdirSync(path.join(ROOT, "Games"), { recursive: true }).filter(f => String(f).endsWith(".md"))) {
	for (const m of read(path.join("Games", String(f))).matchAll(/^(?:cover|background|featured):\s*"?([^"\n]+?)"?\s*$/gm))
		if (!/^https?:/.test(m[1]) && !fs.existsSync(path.join(ROOT, m[1]))) artMissing.push(`${f} → ${m[1]}`);
}
ok("capas, fundos e destaques apontam para arquivos existentes", !artMissing.length, artMissing.slice(0, 5).join("\n     "));
const bigArt = execFileSync("git", ["ls-files", "-z", "Assets"], { cwd: ROOT, encoding: "utf8" }).split("\0")
	.filter(f => /\.(png|jpe?g|webp|gif)$/i.test(f) && fs.existsSync(path.join(ROOT, f)) && fs.statSync(path.join(ROOT, f)).size > 1048576);
ok("nenhuma imagem em Assets/ acima de 1 MB", !bigArt.length, bigArt.join(", "));

// CSS (3.60.0): seletores indexáveis. Um :is()/:where() de vários argumentos
// no fim do seletor faz o navegador testar a regra em todos os elementos;
// .github/tools/css-index.py reescreve sem mudar o resultado. Se ele mudaria
// algo, o CSS precisa passar por ele (sem Python, a verificação é pulada)
{
	const os = require("os");
	const tmp = path.join(os.tmpdir(), `sv-css-index-${process.pid}.css`);
	let out = null;
	try { execFileSync("python3", [path.join(ROOT, ".github/tools/css-index.py"), path.join(ROOT, ".obsidian/snippets/steamvault.css"), tmp], { stdio: "pipe" }); out = fs.readFileSync(tmp, "utf8"); fs.unlinkSync(tmp); } catch (_) { out = null; }
	if (out === null) console.log("--   seletores indexáveis (python3 indisponível, pulado)");
	else ok("seletores indexáveis (css-index.py não muda nada)", out === read(".obsidian/snippets/steamvault.css"), "rode: python3 .github/tools/css-index.py .obsidian/snippets/steamvault.css /tmp/x.css e copie para o snippet e para _install/");
}

// CSS (3.60.0): estado apagado pela regra base. Com ".X, .sv-host button.X
// { background… }", um ".X.is-active { background… }" perde para a regra base
// (mais forte) e o estado não aparece: a regra de estado precisa da mesma
// variante ".sv-host button.X.is-active"
{
	const css = read(".obsidian/snippets/steamvault.css").replace(/\/\*[\s\S]*?\*\//g, "");
	const split = t => { const o = []; let d = 0, cur = ""; for (const c of t) { if ("([".includes(c)) d++; else if (")]".includes(c)) d--; if (c === "," && !d) { o.push(cur.trim()); cur = ""; } else cur += c; } o.push(cur.trim()); return o; };
	const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m => ({ sels: split(m[1]), props: new Set([...m[2].matchAll(/(?:^|;)\s*([\w-]+)\s*:/g)].map(x => x[1])) }));
	const all = new Set(rules.flatMap(r => r.sels));
	const base = new Map();
	for (const r of rules) for (const sel of r.sels) { const m = /^\.sv-host button\.(sv-[\w-]+)$/.exec(sel); if (m) base.set(m[1], new Set([...(base.get(m[1]) || []), ...r.props])); }
	const lost = [];
	for (const r of rules) for (const sel of r.sels) {
		const m = /^\.(sv-[\w-]+)((?:\.is-[\w-]+)+)$/.exec(sel);
		if (!m || !base.has(m[1])) continue;
		const hit = ["background", "background-color", "color", "box-shadow", "opacity"].filter(k => r.props.has(k) && base.get(m[1]).has(k));
		if (hit.length && !all.has(`.sv-host button.${m[1]}${m[2]}`)) lost.push(`${sel} (${hit.join(", ")})`);
	}
	ok("estados (.is-*) não são apagados pela regra base dos botões", !lost.length, lost.slice(0, 8).join("; "));
}

// CSS (3.55.0): toda classe do snippet precisa aparecer em algum script ou
// nota. Exceções: as opções do Style Settings (viram classes do <body>) e os
// prefixos montados no código ("sv-rarity-${tier}").
{
	const cssRaw = read(".obsidian/snippets/steamvault.css");
	const settingsIds = new Set([...(/\/\*\s*@settings([\s\S]*?)\*\//.exec(cssRaw) || ["", ""])[1].matchAll(/^\s*id:\s*([\w-]+)/gm)].map(m => m[1]));
	// o que está só dentro de :not(…) não precisa existir (e tirar mudaria o peso do seletor)
	const css = cssRaw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/:not\([^()]*\)/g, "");
	const listJs = d => fs.readdirSync(path.join(ROOT, d)).filter(f => f.endsWith(".js")).map(f => read(`${d}/${f}`));
	const mdAll = execFileSync("git", ["ls-files", "-z", "*.md"], { cwd: ROOT, encoding: "utf8" }).split("\0").filter(Boolean).map(f => read(f));
	const src = [...listJs("Scripts"), ...listJs("Assets"), ...mdAll].join("\n");
	const prefixes = [...new Set([...src.matchAll(/((?:sv|svl)-[\w-]*-)\$\{/g)].map(m => m[1]))];
	const classes = [...new Set([...css.matchAll(/\.((?:sv|svl)-[\w-]+)/g)].map(m => m[1]))];
	// "sv-nunca" (3.59.0): classe que nunca existe, usada como guia de
	// especificidade nos seletores divididos para o navegador indexar
	const unused = classes.filter(c => c !== "sv-nunca" && !settingsIds.has(c) && !src.includes(c) && !prefixes.some(pf => c.startsWith(pf)));
	ok(`nenhuma classe de CSS sem uso (${classes.length} classes, ${settingsIds.size} opções do Style Settings)`, !unused.length, unused.slice(0, 12).join(" "));
}

// Dicionário de inglês (3.55.0): arquivo à parte, lido só com o inglês ligado
{
	let dict = null, err = "";
	try { dict = JSON.parse(read("Assets/i18n/en.json")); } catch (e) { err = e.message; }
	const n = dict && typeof dict === "object" && !Array.isArray(dict) ? Object.keys(dict).length : 0;
	ok(`Assets/i18n/en.json é um dicionário válido (${n} frases)`, n > 1000 && Object.values(dict).every(v => typeof v === "string"), err);
	ok("dicionário fora do código (o módulo de idioma não carrega frases)", !/this\.en = \{\s*"/.test(read("Scripts/SteamVaultI18n.js")));
}

console.log(fails.length ? `\n${fails.length} verificação(ões) falharam` : "\nTudo certo");
process.exit(fails.length ? 1 : 0);
