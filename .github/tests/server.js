// Servidor estático dos testes: serve o harness, os dados do vault e os arquivos do repositório em /vault/.
const fs = require("fs"), path = require("path"), http = require("http");
const yaml = require("js-yaml");

const ROOT = path.resolve(__dirname, "../..");
const HERE = __dirname;
const SKIP = new Set([".git", ".github", ".obsidian", ".trash", ".steamvault", "node_modules"]);

// Lê o vault como o Dataview veria: lista de arquivos + frontmatter de cada nota.
function buildData() {
	const files = [], pages = [], yamlErrors = [];
	(function walk(dir) {
		for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
			if (SKIP.has(e.name)) continue;
			const p = path.join(dir, e.name);
			if (e.isDirectory()) walk(p); else files.push(path.relative(ROOT, p).split(path.sep).join("/"));
		}
	})(ROOT);
	for (const f of files.filter(f => f.endsWith(".md"))) {
		const text = fs.readFileSync(path.join(ROOT, f), "utf8");
		const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
		let fm = {};
		if (m) { try { fm = yaml.load(m[1], { schema: yaml.JSON_SCHEMA }) || {}; } catch (e) { yamlErrors.push(`${f}: ${e.message.split("\n")[0]}`); } }
		const r = /(?:render\(dv,\s*|page:\s*)"([\w-]+)"/.exec(text);
		pages.push({ fm, path: f, page: r ? r[1] : null });
	}
	// Core e UI primeiro, o roteador por último; os demais em ordem alfabética.
	const all = fs.readdirSync(path.join(ROOT, "Scripts")).filter(f => f.endsWith(".js")).map(f => f.replace(/\.js$/, ""));
	const first = ["SteamVaultCore", "SteamVaultUI"].filter(n => all.includes(n));
	const scripts = [...first, ...all.filter(n => !first.includes(n) && n !== "SteamVault").sort(), "SteamVault"];
	return { files, pages, scripts, yamlErrors };
}

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".md": "text/markdown; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml", ".mp3": "audio/mpeg", ".ogg": "audio/ogg" };

function start(port = 0) {
	const data = buildData();
	const dataJs = `window.__FILES=${JSON.stringify(data.files)};window.__PAGES=${JSON.stringify(data.pages)};window.__SCRIPTS=${JSON.stringify(data.scripts)};`;
	// js-yaml para o navegador: na 4.x fica em dist/js-yaml.min.js (o require
	// aponta para index.js, na raiz do pacote); na 5.x, em dist/browser/
	const yamlDir = (d => fs.existsSync(path.join(d, "package.json")) ? d : path.dirname(d))(path.dirname(require.resolve("js-yaml")));
	const yamlJs = [path.join(yamlDir, "dist", "js-yaml.min.js"), path.join(yamlDir, "dist", "browser", "js-yaml.umd.min.js")].find(f => fs.existsSync(f)) || path.join(yamlDir, "dist", "js-yaml.min.js");
	const server = http.createServer((req, res) => {
		const url = decodeURIComponent(req.url.split("?")[0]);
		let file = null;
		if (url === "/" || url === "/harness.html") file = path.join(HERE, "harness.html");
		else if (url === "/data.js") { res.writeHead(200, { "content-type": TYPES[".js"] }); return res.end(dataJs); }
		else if (url === "/js-yaml.min.js") file = yamlJs;
		else if (url === "/obsidian-defaults.css") file = path.join(HERE, "obsidian-defaults.css");
		else if (url.startsWith("/vault/")) {
			file = path.resolve(ROOT, url.slice(7));
			// nada fora do repositório, nem as pastas ignoradas
			const rel = path.relative(ROOT, file);
			if (rel.startsWith("..") || path.isAbsolute(rel) || [".git", ".steamvault"].includes(rel.split(path.sep)[0])) file = null;
		}
		if (!file || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
		res.writeHead(200, { "content-type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream" });
		fs.createReadStream(file).pipe(res);
	});
	return new Promise(ok => server.listen(port, "127.0.0.1", () => ok({ server, data, url: `http://127.0.0.1:${server.address().port}/` })));
}

module.exports = { ROOT, buildData, start };
