// Exporta o registro de ícones (SteamVaultUI.paths) para arquivos SVG
// independentes em Assets/Icons/<categoria>/<nome>.svg e confere que os
// arquivos estão em dia, válidos e sem nada além de geometria.
//   node .github/tests/icons.js          confere (falha se algo divergir)
//   node .github/tests/icons.js --write  regrava os arquivos
// O registro em JavaScript é a fonte: as telas desenham os ícones inline
// (herdam a cor do texto). Os arquivos são a cópia editável e reutilizável.
const fs = require("fs"), path = require("path"), vm = require("vm"), { execFileSync } = require("child_process");
const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "Assets/Icons");
const write = process.argv.includes("--write");

const sb = { customJS: {}, window: {}, document: {}, app: {}, console };
vm.createContext(sb);
for (const f of ["SteamVaultUI", "SteamVaultBrowse"]) vm.runInContext(fs.readFileSync(path.join(ROOT, "Scripts", f + ".js"), "utf8") + `\nthis.${f} = new ${f}();`, sb);
const U = sb.SteamVaultUI, B = sb.SteamVaultBrowse;
const paths = U.paths;

// categoria de cada ícone (um lugar só, na ordem abaixo)
const browseSrc = fs.readFileSync(path.join(ROOT, "Scripts/SteamVaultBrowse.js"), "utf8");
const gblock = browseSrc.slice(browseSrc.indexOf("\tgenreDefaults(name) {"), browseSrc.indexOf("const r = T[k];", browseSrc.indexOf("\tgenreDefaults(name) {")));
const genreIcons = new Set([...gblock.matchAll(/\["#[0-9a-f]{6}", "([\w-]+)"/g)].map(m => m[1]));
const platformMisc = new Set(B.iconGroups("platform").find(([n]) => n === "PC, celular e outros")[1]);
const themes = new Set(B.iconGroups("genre").find(([n]) => n === "Temas")[1]);
const category = id => id.startsWith("g-") || genreIcons.has(id) ? "genres"
	: /^[ch]-/.test(id) || platformMisc.has(id) ? "platforms"
	: id.startsWith("b-") ? "brands"
	: themes.has(id) ? "themes" : "ui";

const svg = id => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">\n  <title>${id}</title>\n  ${paths[id]}\n</svg>\n`;

const fails = [];
const expected = new Map(Object.keys(paths).map(id => [path.join(OUT, category(id), id + ".svg"), svg(id)]));
for (const [file, body] of expected) {
	if (/<script|<image|<foreignObject|href=|url\(|<filter|Gradient|on\w+=/i.test(body)) fails.push(`${path.relative(ROOT, file)}: elemento não permitido`);
	if (write) { fs.mkdirSync(path.dirname(file), { recursive: true }); if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== body) fs.writeFileSync(file, body); }
	else if (!fs.existsSync(file)) fails.push(`${path.relative(ROOT, file)}: falta (rode com --write)`);
	else if (fs.readFileSync(file, "utf8") !== body) fails.push(`${path.relative(ROOT, file)}: diferente do registro (rode com --write)`);
}
// arquivos que sobraram (ícone removido ou trocado de categoria)
const walk = d => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]) : [];
for (const f of walk(OUT).filter(f => f.endsWith(".svg") && !expected.has(f))) {
	if (write) fs.unlinkSync(f); else fails.push(`${path.relative(ROOT, f)}: sobrando (não existe no registro)`);
}
// XML válido (xmllint, quando o sistema tem)
let lint = "xmllint indisponível: validação XML pulada";
try { execFileSync("xmllint", ["--noout", ...expected.keys()], { stdio: "pipe" }); lint = "xmllint: todos os SVGs são XML válido"; }
catch (err) { if (err.code !== "ENOENT") fails.push(`xmllint: ${String(err.stderr || err.message).slice(0, 400)}`); }

const counts = {};
for (const id of Object.keys(paths)) counts[category(id)] = (counts[category(id)] || 0) + 1;
console.log(`${Object.keys(paths).length} ícones · ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
console.log(lint);
if (fails.length) { console.log(fails.map(f => "FAIL " + f).join("\n")); process.exit(1); }
console.log(write ? "Arquivos atualizados" : "Arquivos em dia com o registro");
