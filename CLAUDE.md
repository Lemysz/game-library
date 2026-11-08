# CLAUDE.md — Game Library

Guia para quem (pessoa ou agente) for modificar este repositório. Leia antes de mexer.

## O que é

**Game Library V1.0 — Prototype**: um vault do [Obsidian](https://obsidian.md) que funciona como uma
biblioteca pessoal de videogames com cara de aplicativo (catálogo, fichas, conquistas, estatísticas).
**Não** é launcher nem frontend de emulação. Prioridade: Obsidian Android; desktop continua suportado.

- Idioma do produto, do código (comentários) e da documentação: **português do Brasil**. O modo
  inglês é uma camada de tradução (`Assets/i18n/en.json`).
- Sem build, sem servidor, sem banco de dados: Markdown + JavaScript puro + um CSS snippet.
- Licença: **ainda não definida** (todos os direitos reservados). Não adicione um arquivo `LICENSE`
  nem declare uma licença sem decisão explícita do dono do projeto.
- Repositório **privado**. Nunca torne público, nunca publique GitHub Pages ou releases públicas.

## Arquitetura

```text
Dashboard/*.md   uma nota = uma tela; cada nota tem só um bloco dataviewjs que chama o boot
Assets/steamvault-boot.js   tela de carregamento; espera o CustomJS e chama SteamVault.render(dv, page)
Scripts/*.js     módulos CustomJS (uma classe por arquivo, instanciada pelo CustomJS)
.obsidian/snippets/steamvault.css   todo o visual (cópia idêntica em _install/steamvault.css)
Games/<Plataforma>/*.md   uma nota por jogo; os dados ficam no frontmatter
Achievements/<Jogo>/*.md  uma nota por conquista
Collections/ Platforms/ Genres/ Subgenres/ Franchises/   páginas de categoria (frontmatter `type`)
Assets/          capas, fundos, destaques, logos, ícones SVG, dicionário de inglês
.github/tests/   harness que simula Obsidian + Dataview + CustomJS e os testes (Playwright)
docs/archive/    histórico anterior à 1.0 (somente leitura)
```

Fluxo de uma tela: nota → `dv.view("Assets/steamvault-boot", { page })` → `customJS.SteamVault.render(dv, page)`
→ o roteador (`this.routes` em `Scripts/SteamVault.js`) escolhe `[módulo, método]` → o módulo devolve HTML
→ `SteamVault` monta a moldura (barra, menu, busca, modais) numa camada própria (`.sv-layer`).

Módulos (atalhos de contexto usados nos métodos): `C` Core (modelo de dados, **fonte única** dos
contadores), `U` UI (componentes e registro de ícones), `P` Pages (Início, Biblioteca, ficha), `B` Browse
(coleções, plataformas, gêneros, franquias), `I` Insights (Tier List, Estatísticas, Configurações),
`H` Hub de conquistas, `S`/`SP` Steam, `R`/`RP` RetroAchievements, `PL`/`PP` outras plataformas,
`A`/`AM` conquistas e gerenciador manual, `X` Play, `PK` Picks/lista de desejos, `SH` Share,
`CA` Care (backup/preferências), `T` I18n, `PF` Profile, `LK` Look, `L` Legacy (formulários).
A tabela completa está em `DOCUMENTACAO.md › Scripts`.

### Nomes legados

O código ainda usa o nome interno **SteamVault** (`SteamVault*.js`, classes `sv-*`, chaves
`steamvault:*` no `localStorage`, pasta `.steamvault/`). Isso é intencional: renomear quebraria
vaults existentes e notas que chamam o boot. **Não renomeie** sem um plano de migração.
Comentários como `// 3.74.0: …` citam a numeração interna anterior à 1.0 (ver `docs/archive/`).

## Convenções

- **JavaScript**: tabs, aspas duplas, sem dependências externas, sem `eval`/`new Function`/
  `document.write`. Cada método declara os atalhos que usa (`const { C, U } = ctx` ou equivalente);
  `checks.js` falha se um atalho for usado sem declaração.
- **HTML a partir de dados**: todo texto vindo de nota, arquivo ou internet passa por escape
  (`U.esc`/equivalentes) antes de ir para `innerHTML`. Cores só entram se forem `#hex`. Links externos
  só abrem por `safeUrl`/validação de domínio (`checks.js` confere `window.open`).
- **CSS**: tudo em `.obsidian/snippets/steamvault.css`; depois de editar, copie para
  `_install/steamvault.css` (precisam ser idênticos). Use os tokens existentes (`--sv-*`) em vez de
  valores soltos. Rode `python3 .github/tools/css-index.py` (ver `checks.js`) — seletores precisam
  ser indexáveis. Toda classe do CSS precisa existir em algum script ou nota.
- **Ícones**: o registro é `SteamVaultUI.paths`; depois de mudar um ícone, rode
  `node .github/tests/icons.js --write` para regravar `Assets/Icons/`.
- **Textos**: escritos em português, frase curta, verbo no infinitivo nos botões. Toda frase nova
  visível precisa de tradução em `Assets/i18n/en.json` (`node .github/tools/audit/i18n-scan.js`).
- **Dados**: nunca reescreva o frontmatter de jogos sem necessidade; preserve campos desconhecidos.
  Migrações precisam ser idempotentes e não destrutivas.
- **Segredos**: chaves só em `app.saveLocalStorage` (por aparelho). Nunca em notas, cache, git ou
  console. Nenhuma credencial em issues, PRs, commits ou CI.

## Versão

- `Scripts/SteamVaultCore.js`: `this.VERSION` (SemVer) e `this.STAGE` (`Prototype`).
- Ao lançar: atualize `VERSION`, o selo do `README.md` (`vers%C3%A3o-X.Y.Z`) e crie a seção
  `## [X.Y.Z]` no `CHANGELOG.md`. `checks.js` confere os três.
- A versão no GitHub nasce de uma tag: `git tag vX.Y.Z-prototype && git push origin vX.Y.Z-prototype`
  dispara `.github/workflows/release.yml` (pré-lançamento com o ZIP instalável). Sem permissão para
  enviar tags (ex.: sessões na nuvem), use *Actions › Versões › Run workflow* no branch `main` com a
  tag: o GitHub cria a tag no commit do branch. A tag precisa bater com `VERSION`/`STAGE`.

## Testes

```bash
cd .github/tests && npm ci && npx playwright install chromium
node checks.js        # sintaxe, versão, CSS, segredos, higiene do repositório (sem navegador)
node icons.js         # SVGs em dia com o registro
node smoke.js         # todas as telas em 410 px e 1400 px, português e inglês
node responsive.js    # 320/360/390/430 px e desktop, temas escuro e claro
node functional.js    # 201 testes de uso (filtros, modais, gravação nas notas)
```

Num ambiente com Chromium já instalado, use `CHROMIUM_PATH=/caminho/do/chrome`. O harness simula o
Obsidian; ele **não substitui** um teste no aparelho real. Ferramentas de auditoria (contraste, XSS,
foco, desempenho) estão em `.github/tools/audit/`.

## O que não fazer

- Não versionar `main.js`/`styles.css`/`manifest.json` de plugins, temas, `.trash/`, `Backups/`,
  `.steamvault/`, `workspace*.json` (o `.gitignore` e o `checks.js` cuidam disso).
- Não adicionar integrações que peçam senha, cookie ou token de sessão de terceiros.
- Não reescrever módulos inteiros sem demonstrar a necessidade; preferir mudanças pontuais.
- Não remover funcionalidades que passam nos testes.
- Não criar documentos redundantes: README (apresentação), DOCUMENTACAO (manual), CHANGELOG
  (mudanças), CLAUDE (guia de desenvolvimento), SECURITY, CONTRIBUTING, THIRD_PARTY_NOTICES,
  ASSET_CREDITS.
