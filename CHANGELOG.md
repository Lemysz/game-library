# Changelog

Todas as mudanças relevantes da Game Library são registradas aqui.
O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e a numeração segue
[Versionamento Semântico](https://semver.org/lang/pt-BR/). Desde a 1.1.0 (estável), o formato das
notas (frontmatter) só ganha campos novos em versões menores, sempre com migração; mudanças
incompatíveis ficam para uma versão maior. Na fase *Prototype* (1.0.x), ele podia mudar entre
versões menores.

## [Não lançado]

### Alterado
- **Telas de integração mais parecidas entre si**: o botão *Importar jogos* da Epic agora é azul
  (antes branco, destoava das outras plataformas); o topo do Perfil Steam sem fundo de perfil ganhou
  o mesmo brilho na cor da plataforma dos perfis Xbox/PlayStation/Nintendo.
- **Perfis manuais sem jogos** (Xbox, PlayStation, Nintendo, Epic, Google Play): no lugar de vários
  números "—", uma frase só ("Importe ou adicione jogos para ver seus números aqui"); o botão
  *Importar jogos* não aparece mais repetido no aviso de lista vazia.

## [1.3.0] · 2026-11-12

Dados dos jogos de qualquer plataforma pelo Wikidata. Sem mudança no formato das notas (só o campo novo opcional `wikidataId`).

### Adicionado
- **Completar dados pelo Wikidata** (ficha › ⋯): estúdio, distribuidora, gêneros, ano e data de
  lançamento para jogos de qualquer plataforma, não só da Steam. Base aberta de domínio público
  (CC0), sem chave e sem conta. Mostra a mesma revisão do *Completar dados pela Steam*: campos vazios
  vêm marcados, os preenchidos só mudam se você marcar. Com várias edições do mesmo nome (remakes,
  versões), escolhe pela data da ficha ou pergunta qual é. Os gêneros chegam limpos e com a grafia
  dos gêneros que já existem no vault; o ID do item fica na ficha (`wikidataId`) para as próximas vezes.
  Se o Wikidata pedir uma pausa, o app avisa e não grava nada.
- **Aviso de versões novas dos plugins:** um workflow mensal (`plugins.yml`) confere se o Dataview e o
  CustomJS têm versão nova e, se tiverem, abre uma issue com o passo a passo. Nada é atualizado sozinho.
- **Roteiro de teste no aparelho** em CONTRIBUTING.md: 10 verificações rápidas antes de lançar.

## [1.2.1] · 2026-11-12

Instalação mais simples. Sem mudança no app nem no formato das notas.

### Mudado
- **Instalação sem passos de plugin:** o ZIP da versão já traz o **Dataview** (0.5.68) e o
  **CustomJS** (1.0.21) prontos e ativados; basta abrir a pasta como vault e confiar nela. Os
  arquivos vêm do release oficial de cada plugin, numa versão fixa, com o SHA-256 conferido pelo
  workflow (`.github/plugins/plugins.lock`) e a licença MIT ao lado. O código deles continua fora do
  repositório. Style Settings e Templater seguem opcionais, pela loja do Obsidian.

## [1.2.0] · 2026-11-11

Busca e filtros mais completos. Sem mudança no formato das notas.

### Adicionado
- **Filtro por subgênero** no painel de filtros da Biblioteca (aparece quando há mais de um
  subgênero na lista), com chip removível; entra nas visões salvas.
- **Comandos de busca novos** na Biblioteca: `subgenero:`, `dev:`, `dist:` e `tag:`
  (ex.: `subgenero:puzzle dev:capcom`).
- **Tags da ficha clicáveis:** cada tag abre a Biblioteca filtrada por ela (antes era só texto).

### Melhorado
- **Busca da Biblioteca:** o texto livre passa a cobrir também subgênero, distribuidora, plataforma
  e tags, e as palavras podem vir em qualquer ordem (`evil resident`, `capcom pc`).
- **Busca global:** jogos também são encontrados por plataforma, gênero, subgênero, estúdio,
  distribuidora, tags e ano (`ps2`, `survival horror`, `capcom 2019`). O nome continua na frente.

### Corrigido
- Modo inglês: as lembranças da Início ("Você começou…", "Você zerou…") ficavam em português.

## [1.1.0] · 2026-11-11

Primeira versão **estável**: a Game Library sai da fase de protótipo (1.0.0 a 1.0.2). O código é o da
1.0.2; muda o compromisso com quem usa.

### Mudado
- **Estágio:** sem "Prototype". A versão no GitHub usa a tag `v1.1.0` (sem sufixo) e aparece como
  *Latest*, não mais como pré-lançamento; o ZIP passa a se chamar `Game_Library_1.1.0.zip`.
- **Formato das notas:** campos novos podem chegar em versões menores, sempre com migração automática e
  aviso aqui; mudanças incompatíveis só numa versão maior (2.0).
- **Suporte de segurança:** 1.1.x; a 1.0.x (Prototype) foi substituída.

## [1.0.2] — Prototype · 2026-11-11

Correções da abertura e da navegação no Android. Sem funcionalidade nova e sem mudança no formato das notas.

### Corrigido
- **Tela de carregamento presa (Android):** a tela que cobre o Obsidian enquanto os plugins carregam
  tinha uma saída de 20 s que recomeçava sempre que a nota era redesenhada; podia ficar para sempre,
  sem deixar chegar às configurações. Agora há também um limite fixo de 25 s desde a abertura do
  Obsidian, que não recomeça.
- **Plugins ausentes:** se o Dataview não roda (não instalado, desligado ou modo restrito), a nota
  passa a explicar o que fazer em vez de ficar vazia.
- **Tela de inicialização ao trocar de aba:** no modo Leitura (o padrão de uma instalação nova), cada
  aba é uma nota com um bloco novo e vazio do Dataview, e a tela de inicialização do CSS cobria tudo por
  uma fração de segundo a cada troca, como se o app reiniciasse. Ela agora aparece só na abertura do
  Obsidian (classe `sv-booted` no `<body>` depois do primeiro desenho); nas trocas, a tela anterior fica
  até a nova estar pronta. Nos vaults antigos isso não aparecia porque a aba ficava no modo Live
  Preview, guardado no `workspace-mobile.json`, que não vai no ZIP.
- **Animações de entrada das telas:** logo depois de abrir uma nota no modo Leitura, um segundo
  desenho da mesma tela (outro bloco da nota rodando de novo) era tratado como atualização: trocava o
  HTML, desligava as animações e a tela aparecia de uma vez. Agora esse segundo desenho, se o conteúdo
  é o mesmo, mantém a tela e as animações (entrada da página, blocos, números, barras e anéis). Três
  testes funcionais novos simulam a troca de aba no modo Leitura.

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

[Não lançado]: ../../compare/v1.3.0...HEAD
[1.3.0]: ../../releases/tag/v1.3.0
[1.2.1]: ../../releases/tag/v1.2.1
[1.2.0]: ../../releases/tag/v1.2.0
[1.1.0]: ../../releases/tag/v1.1.0
[1.0.2]: ../../releases/tag/v1.0.2-prototype
[1.0.1]: ../../releases/tag/v1.0.1-prototype
[1.0.0]: ../../releases/tag/v1.0.0-prototype
