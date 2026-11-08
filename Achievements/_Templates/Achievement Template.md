<%*
// Game Library — template Templater para uma conquista manual.
// Jogos Steam não precisam disto: o sync público cria e atualiza as notas.
const C = customJS.SteamVaultCore;
const gameFiles = app.vault.getMarkdownFiles().filter(f => app.metadataCache.getFileCache(f)?.frontmatter?.type === "game");
const gameFile = await tp.system.suggester(gameFiles.map(f => f.basename), gameFiles, false, "Jogo");
const name = await tp.system.prompt("Nome da conquista");
const description = await tp.system.prompt("Descrição", "");
const points = Number(await tp.system.prompt("Pontos (RetroAchievements; 0 se não usar)", "0")) || 0;
tR += C.buildAchievementNote({ name, description, points, gameLink: `[[${gameFile.basename}]]`, gamePath: gameFile.path, unlockSource: "manual" });
await tp.file.rename(name);
-%>
