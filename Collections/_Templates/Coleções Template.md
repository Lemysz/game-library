<%*
// Game Library — template Templater para uma coleção.
// Os jogos ficam no campo `games` (links). Depois de criar, use
// "Adicionar jogos" na própria coleção para marcá-los visualmente.
const title = await tp.system.prompt("Nome da coleção");
const description = await tp.system.prompt("Descrição curta (opcional)", "");
tR += [
	"---",
	`title: ${JSON.stringify(title)}`,
	"type: collection",
	`description: ${JSON.stringify(description)}`,
	'accent: ""',
	'cover: ""',
	"games: []",
	"pendingGames: []",
	"cssclasses: [steamvault, sv-collection]",
	"---",
	"",
	customJS.SteamVaultCore.noteBody("collection")
].join("\n");
await tp.file.rename(title);
-%>
