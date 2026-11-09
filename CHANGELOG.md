# Changelog

Todas as mudanças relevantes da Game Library são registradas aqui.
O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e a numeração segue
[Versionamento Semântico](https://semver.org/lang/pt-BR/). Enquanto o projeto estiver na fase
*Prototype*, a API das notas (frontmatter) pode mudar entre versões menores; toda mudança desse tipo
será anunciada aqui, com o caminho de migração.

## [Não lançado]

### Corrigido
- **Tela de carregamento presa (Android):** a tela que cobre o Obsidian enquanto os plugins carregam
  tinha uma saída de 20 s que recomeçava sempre que a nota era redesenhada; podia ficar para sempre,
  sem deixar chegar às configurações. Agora há também um limite fixo de 25 s desde a abertura do
  Obsidian, que não recomeça.
- **Plugins ausentes:** se o Dataview não roda (não instalado, desligado ou modo restrito), a nota
  passa a explicar o que fazer em vez de ficar vazia.

## [1.0.1] — Prototype · 2026-11-08

Correções pontuais da 1.0. Sem funcionalidade nova e sem mudança no formato das notas.

### Corrigido
- **Imagens maiores que o original:** ao reduzir uma imagem (artes baixadas da Steam, ícones de
  conquistas e imagens do aparelho acima de 300 KB), o app sempre gravava WebP, mesmo quando ele ficava
  maior que o original. Uma capa em pixel art de 437 KB (3000×4500) virava 661 KB. Agora, nesse caso,
  compara com PNG (ou JPEG, sem transparência) no mesmo tamanho reduzido e fica com o menor: a mesma
  capa fica com 157 KB, em 1200 px. Teste funcional novo cobre o caso.
- **Áreas de toque no celular:** o título dos cards (16 px de altura), as linhas do gráfico de
  períodos das Estatísticas (19 px) e o nome das coleções no DNA da biblioteca (31 px) passaram a ter
  pelo menos 32 px para o dedo, sem mudar o visual.
  No título, o `::after` que ampliaria o toque era cortado pelo `overflow` das reticências.
- `responsive.js` mede a área de toque **efetiva** (com o `::after` que a amplia e o `label` de
  interruptores), em vez da caixa visível; meio pixel de tolerância para arredondamentos.
- O recarregamento da tela depois de salvar (dois pontos do `SteamVaultLegacy.js`) usava
  `workspace.activeLeaf`, obsoleto na API do Obsidian; agora usa `getMostRecentLeaf()`, com o
  antigo só como reserva (o mesmo padrão já usado em `SteamVault.js`).

### Segurança

- **Reparo de ícones da Steam**: o endereço salvo numa conquista (`steamIconUrl`) só é baixado de
  domínios da Steam, como já acontecia em *Salvar ícones no vault*. Uma nota sincronizada não consegue
  mais fazer o aparelho acessar `localhost` ou a rede local.
- **Testes** (`.github/tests/`, fora do ZIP): Playwright 1.48.2 → 1.63.0 (GHSA-7mvr-c777-76hp: o
  download do navegador não conferia o certificado) e js-yaml 4.1.0 → 4.3.2 (GHSA-mh29-5h37-fv8m e
  outras). `npm audit` sem vulnerabilidades.

### Documentação
- Requisito mínimo explícito: Obsidian 1.8.7 (APIs `loadLocalStorage`/`saveLocalStorage`),
  conferido na documentação atual da API do Obsidian pelo Context7.
- Roadmap: chave do RetroAchievements no `app.secretStorage`.

## [1.0.0] — Prototype · 2026-11-08

Primeira versão oficial. Ela **consolida** o que já existia no vault ao fim do desenvolvimento
anterior (numeração interna 3.x, encerrada na 3.74.0) e passa a ser o ponto de partida do produto.
Nenhuma funcionalidade nova foi atribuída a esta versão: as entradas abaixo descrevem o que já estava
implementado e foi verificado pelos testes automáticos antes da publicação.

### Incluído na 1.0 (já implementado)

- **Telas**: Início, Biblioteca, ficha do jogo, Lista de desejos, Coleções, Plataformas, Gêneros,
  Subgêneros, Franquias, Conquistas (hub por origem), Tier List, Estatísticas, Perfil, Integrações,
  Configurações e galeria de Ícones — 36 rotas no roteador, cada tela é uma nota em `Dashboard/`.
- **Ficha do jogo**: arte, capa, logo, status, nota, tempo, sessões, zeradas, DLC, mídia, análise
  com prós e contras, conquistas e histórico.
- **Biblioteca**: busca, filtros, agrupamento, quatro visões (grade, compacta, prateleira, lista),
  menu rápido por toque longo, seleção em lote e índice A–Z.
- **Coleções** manuais e automáticas, **metas**, **planejador de backlog**, **"O que jogar agora?"**,
  calendário de atividade e retrospectiva em Stories.
- **Conquistas**: origem × sincronização por jogo, editor manual, gerenciador do Xbox (lote, planilha
  CSV/Excel, ícones em lote, backup e exportação CSV), raridade e "caçador de conquistas".
- **Integrações**: Steam (perfil público), RetroAchievements (Web API oficial) e GOG (perfil público)
  automáticas; Xbox, PlayStation, Nintendo, Epic Games e Google Play Games como perfis manuais.
- **Cartões para compartilhar** (jogo, perfil, ano) gerados no aparelho.
- **Aparência**: tema claro e escuro, Style Settings, modo aplicativo no celular, áreas seguras do
  Android, redução de animações e personalização da Início e das fichas.
- **Idiomas**: português (padrão) e inglês.
- **Cuidados com os dados**: backup em `.zip`, diagnóstico do vault, reparo de nomes escapados.

### Consolidação desta versão

- Versão do app passa a ser `1.0.0` com o estágio **Prototype** (exibido em *Configurações*).
- `CHANGELOG.md` reiniciado; o histórico 3.x foi preservado sem edição em
  [`docs/archive/`](docs/archive/README.md) (`AUDITORIA.md` virou
  `docs/archive/historico-tecnico-pre-1.0.md`).
- `DOCUMENTACAO.md` virou um manual de referência: as seções "Novidades da versão 3.x" foram
  arquivadas e os títulos deixaram de citar versões internas.
- Novos documentos: `CLAUDE.md`, `SECURITY.md`, `CONTRIBUTING.md`, `THIRD_PARTY_NOTICES.md`,
  `ASSET_CREDITS.md` e modelo de Pull Request.
- Repositório limpo: binários de plugins e do tema de terceiros, lixeira do Obsidian, estado de
  janelas e caches deixaram de ser versionados (ver `.gitignore`). As configurações necessárias
  (`data.json` do Dataview e do CustomJS, lista de plugins, snippet) continuam no vault.
- O plugin **Tasks**, ativado mas sem nenhum uso no vault, saiu da lista de plugins da comunidade.
- Os links dos modelos de issue apontavam para outro repositório; foram corrigidos.
- Fluxo de versões (`release.yml`) refeito: roda quando uma tag `v*` é enviada (ou pelo botão
  *Run workflow*, que cria a tag no GitHub), confere a tag contra a versão do código, monta um ZIP
  instalável sem arquivos locais e cria a versão no GitHub como *pré-lançamento* (o repositório é
  privado, então a versão também é).
- Testes ampliados: telas abertas também em 320, 360, 390 e 430 px nos temas claro e escuro.

### Correções de interface

Revisão visual de todas as telas em 320, 360, 390, 430 px e desktop, nos temas claro e escuro.
O sistema visual (tokens, tipografia Archivo + IBM Plex Sans, cartões, botões) já era consistente;
as correções são pontuais e valem só para telefones estreitos:

- Novo ponto de quebra `xxs` (largura útil abaixo de 380 px), no mesmo sistema dos demais.
- **Ficha do jogo:** em 360 px a legenda "Sincronize para ver conquistas" cruzava o divisor, e em
  320 px invadia a coluna da nota. Abaixo de 380 px o resumo de conquistas mostra só número e
  legenda, como horas e nota.
- **Ficha do jogo:** em 320 px "Registrar sessão" quebrava em duas linhas; as ações do topo ficaram
  numa linha só (botões de ícone de 40 px, área de toque de 44 px de altura mantida).
- **Estados vazios** (ex.: Lista de desejos): em telefones estreitos os botões se empilham em largura
  total em vez de quebrar o texto em duas linhas.
- **Busca da Biblioteca:** a dica longa termina em reticências em vez de ser cortada no meio.
- **Ficha › Visão geral:** chips com nomes longos (ex.: desenvolvedora "Maddy Makes Games Inc.")
  causavam rolagem lateral em 320 px com a fonte real (IBM Plex Sans); agora quebram em duas linhas
  dentro da coluna. Encontrado pelo CI, que carrega as fontes web como o aparelho.
- Novo teste `responsive.js` impede a volta do texto invadindo a coluna vizinha.

### Experimental

Funciona e é testado, mas pode mudar sem aviso:

- Leitura dos perfis **públicos** da Steam Community e da GOG, e dos preços da Nuuvem: dependem de
  páginas que essas lojas podem alterar a qualquer momento.
- **Modo inglês**: tradução aplicada depois que cada tela é desenhada (dicionário em
  `Assets/i18n/en.json`); textos novos podem aparecer em português.
- **Gerenciador de conquistas do Xbox** (reconstruído pouco antes da 1.0).
- **Personalização da Interface** (modelos da Início, das fichas e dos cards).

### Limitações conhecidas

Ver [README › Limitações conhecidas](README.md#%EF%B8%8F-limitações-conhecidas).

[Não lançado]: ../../compare/v1.0.1-prototype...HEAD
[1.0.1]: ../../releases/tag/v1.0.1-prototype
[1.0.0]: ../../releases/tag/v1.0.0-prototype
