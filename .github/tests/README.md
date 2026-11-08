# Testes automáticos

O GitHub roda estes testes a cada envio ([`tests.yml`](../workflows/tests.yml)).

| Arquivo | O que faz |
|---|---|
| `checks.js` | Verificações rápidas, sem navegador: sintaxe dos scripts, cópia do CSS em `_install/`, versão igual no código, no README e no `CHANGELOG.md`, frontmatter das notas, rotas das telas, nenhum segredo versionado e nenhum código de terceiros, lixeira ou estado local no git. Rode depois de `git add`: ela lê os arquivos versionados. |
| `icons.js` | Confere que os SVGs de `Assets/Icons/` são a cópia exata do registro de ícones (`SteamVaultUI.paths`), sem arquivos faltando ou sobrando, sem script, imagem, link, filtro ou gradiente, e XML válido (`xmllint`). `node icons.js --write` regrava os arquivos depois de mudar um ícone. |
| `functional.js` | Usa o vault como uma pessoa: busca e filtros da Biblioteca, busca global, abas, menus e editores da ficha, favoritar, fila "A seguir", sessão ao vivo (pausar e salvar), editar o Perfil, galeria de ícones, Personalizar Home, menu Mais e Configurações. Confere o que foi gravado nas notas (em memória) e falha com qualquer erro de JavaScript. |
| `responsive.js` | Abre cada tela em 320, 360, 390 e 430 px (toque) e no computador, nos temas escuro e claro. Falha com erro de JavaScript, tela vazia, rolagem lateral ou conteúdo fora da tela; avisa sobre áreas de toque menores que 32 px e textos cortados. `SV_WIDTHS`, `SV_THEMES`, `SV_ONLY` e `SV_SHOTS` limitam ou fotografam. |
| `smoke.js` | Abre cada tela do vault num Chromium sem interface, no celular (410 × 887) e no computador (1400 × 900). Falha com erro de JavaScript, tela vazia ou rolagem lateral. |
| `perf.js` | Desempenho com biblioteca grande: acrescenta 1000 jogos sintéticos ao vault de teste e mede o tempo de cada tela (Início, Biblioteca, busca, Estatísticas…), no celular com CPU 4× mais lenta. Não roda no GitHub, porque o tempo varia por máquina: use `node perf.js 1000` antes e depois de uma mudança. |
| `harness.html` | Simulação mínima do Obsidian, do Dataview e do CustomJS que carrega os scripts de `Scripts/` sem alterar nada. |
| `server.js` | Servidor local dos testes. Lê as notas como o Dataview leria. |

## Rodar no seu computador

```bash
cd .github/tests
npm ci
npx playwright install chromium
npm test
node responsive.js
node functional.js
```

Com um Chromium já instalado (sem baixar outro), defina `CHROMIUM_PATH=/caminho/do/chrome`.

- `SV_SHOTS=screenshots node smoke.js` salva uma captura de cada tela.
- `SV_ONLY=Biblioteca node smoke.js` testa só as telas cujo caminho contém o texto.

O Obsidian ignora pastas que começam com ponto, então nada daqui aparece no vault.
