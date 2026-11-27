<%*
// Game Library — template Templater para uma nova ficha de jogo.
// Opcional: o botão "Adicionar jogo" da Biblioteca faz o mesmo sem plugin.
// O conteúdo vem do SteamVaultCore.buildGameNote — o MESMO gerador usado
// pelo formulário, pela importação em massa e pelo sync da Steam. Assim o
// schema nunca diverge. "Jogado por último" nasce vazio.
const C = customJS.SteamVaultCore;
const title = await tp.system.prompt("Nome do jogo");
// mesma lista do formulário "Adicionar jogo" (inclui os consoles Xbox)
const platforms = customJS.SteamVaultLegacy?.platformOrder || ["PC", "Switch", "PS5", "PS4", "PS3", "PS2", "PS1", "PSP", "PS Vita", "3DS", "NDS", "GBA", "N64", "GameCube", "Wii", "SNES", "Dreamcast", "Arcade"];
const platform = await tp.system.suggester(platforms, platforms, false, "Plataforma");
// origem e sincronização são perguntas separadas; a sincronização só
// oferece os modos que a origem escolhida aceita
const providers = Object.entries(C.providerDefs);
const achievementProvider = await tp.system.suggester(providers.map(([, d]) => d.label), providers.map(([k]) => k), false, "Origem das conquistas") || "unset";
const modes = C.syncModes(achievementProvider);
const achievementSync = modes.length > 1
	? await tp.system.suggester(modes.map(k => `${C.syncDefs[k].label} — ${C.syncDefs[k].hint}`), modes, false, "Sincronização") || modes[0]
	: modes[0];
const steamAppId = achievementProvider === "steam" ? await tp.system.prompt("Steam AppID (número da URL da loja)", "") : "";
const status = await tp.system.suggester(
	["Backlog", "Jogando", "Pausado", "Zerado", "Abandonado", "Lista de desejos"],
	["Backlog", "Playing", "Paused", "Completed", "Dropped", "Wishlist"], false, "Status"
);
const franchise = await tp.system.prompt("Franquia (opcional)", "");
tR += C.buildGameNote({ title, platform, achievementProvider, achievementSync, steamAppId, status, franchise });
await tp.file.rename(title);
-%>
