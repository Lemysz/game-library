# Auditoria e mudanças — iiSU → Steam Vault

Registro do que foi encontrado no vault original e do que mudou. Correções de dados foram feitas **na origem** (nas notas), não escondidas na interface.

## 1. Problemas encontrados

**Arquivos**
- O zip original tinha nomes com acentos escapados (`#U00e7` e `U00e7`) e 81 entradas duplicadas. Na extração, 33 arquivos foram renomeados para o nome correto e 15 duplicatas idênticas removidas.
- 35 notas de conquista (Celeste e Dying Light) apontavam o campo `icon` para nomes escapados. Todos foram decodificados e cada caminho novo foi conferido: todos existem.

**Dados**
- Os 4 jogos tinham `lastPlayed` igual a `dateAdded` sem nenhuma sessão: data automática, não real.
- `achievementsEarned` estava 0 em todos, embora Celeste tivesse 10 conquistas desbloqueadas e Dying Light 23.
- Resident Evil 2 declara 44 conquistas, mas só existem 43 notas. O contador passou a refletir as 43 notas; o primeiro sync com a Steam cria a que falta.
- A coleção Favoritos linkava "Resident Evil 2 Remake" e "Resident Evil 4 Remake"; os arquivos se chamam "Resident Evil 2" e "Resident Evil 4". Os prêmios em Estatísticas tinham o mesmo erro.
- Clássicos Portáteis e Meta Platinar em 2026 só linkavam jogos que não existem no vault.
- Capas inexistentes: `Banners/Favoritos.png` e `Assets/Platforms/PC.jpg`.
- Subgênero "Precision platformers" não batia com a página "Precision Platformers".
- Resident Evil 4 não tem capa, fundo, nota nem datas (dado ausente de fato; a tela mostra um estado próprio para isso).

**Código**
- `IISU.js`: 10.214 linhas, ~450 métodos numa classe só. O corpo das notas de jogo era gerado em dois lugares diferentes, com 9 blocos `dataviewjs` cada; conquistas, categorias e coleções tinham geradores próprios.
- O template do Templater tinha 45 campos, contra 63 usados de fato, e criava `lastPlayed` com a data de hoje.
- `progressPct` inventava progresso pelo status (Backlog 8%, Jogando 55%, Abandonado 25%).
- A remoção de conquistas duplicadas só valia para RetroAchievements.
- O `gameType` misturava plataforma, loja e origem das conquistas.
- A integração Steam lia só dados da loja e conquistas globais do jogo; nada do perfil do jogador.

**CSS**
- `iisu-frontend.css`: 11.162 linhas, 217 `!important`, repetido em `_install/`.

## 2. O que mudou

**Dados (feito por script, uma vez)**
- Games/PC/Celeste.md: subgênero "Precision platformers" → "Precision Platformers" (bate com a página)
- Games/PC/Celeste.md: lastPlayed era igual a dateAdded sem nenhuma sessão (data automática) → vazio
- Games/PC/Celeste.md: campo morto achievements: [] removido
- Games/PC/Dying Light.md: lastPlayed era igual a dateAdded sem nenhuma sessão (data automática) → vazio
- Games/PC/Dying Light.md: campo morto achievements: [] removido
- Games/PC/Resident Evil 2.md: lastPlayed era igual a dateAdded sem nenhuma sessão (data automática) → vazio
- Games/PC/Resident Evil 2.md: campo morto achievements: [] removido
- Games/PC/Resident Evil 4.md: lastPlayed era igual a dateAdded sem nenhuma sessão (data automática) → vazio
- Games/PC/Resident Evil 4.md: campo morto achievements: [] removido
- Games/PC/Celeste.md: achievementsEarned/Total 0/32 → 10/32 (contagem real das notas)
- Games/PC/Dying Light.md: achievementsEarned/Total 0/78 → 23/78 (contagem real das notas)
- Games/PC/Resident Evil 2.md: achievementsEarned/Total 0/44 → 0/43 (contagem real das notas)
- Collections/Clássicos Portáteis.md: 7 jogo(s) sem ficha no vault movidos para pendingGames (antes eram links quebrados): Loco Roco, WipEout Pure, Ape Escape P, Pokemon Alpha Sapphire, Mario and Luigi Dream Team, Yoshis Island DS, Chibi Robo Zip Lash
- Collections/Favoritos.md: link [[Resident Evil 2 Remake]] → [[Resident Evil 2]]
- Collections/Favoritos.md: link [[Resident Evil 4 Remake]] → [[Resident Evil 4]]
- Collections/Favoritos.md: capa inexistente removida (Banners/Favoritos.png)
- Collections/Meta Platinar em 2026.md: 3 jogo(s) sem ficha no vault movidos para pendingGames (antes eram links quebrados): Ape Escape P, WipEout Pure, Loco Roco
- Platforms/PC.md: capa inexistente removida (Assets/Platforms/PC.jpg)
- Dashboard/Estatísticas.md: prêmio "Jogo do Ano" apontava para Games/PC/Resident Evil 4 Remake.md → Games/PC/Resident Evil 4.md
- Dashboard/Estatísticas.md: prêmio "Melhor História" apontava para Games/PC/Resident Evil 2 Remake.md → Games/PC/Resident Evil 2.md
- Dashboard/Estatísticas.md: prêmio "Melhor Gameplay" apontava para Games/PC/Resident Evil 4 Remake.md → Games/PC/Resident Evil 4.md
- Dashboard/Estatísticas.md: prêmio "Melhor Trilha Sonora" apontava para Games/PC/Resident Evil 4 Remake.md → Games/PC/Resident Evil 4.md
- Dashboard/Estatísticas.md: prêmio "Melhor Experiência" apontava para Games/PC/Resident Evil 2 Remake.md → Games/PC/Resident Evil 2.md
- Dashboard/Steam Atividade.md: criada
- Dashboard/Steam Biblioteca.md: criada
- Dashboard/Steam Vitrine.md: criada
- Dashboard/Configurações.md: criada
- Dashboard/Perfil.md: removida (metas vazias; conteúdo coberto por Perfil Steam, Conquistas e Estatísticas)
- 35 ícones de conquista corrigidos (lista completa no fim).
- Todas as notas: `cssclasses` novos (`steamvault` + `sv-<tela>`) e corpo de um bloco só.
- Jogos: novo campo `achievementSource` (o `gameType` foi mantido como reserva).

**Arquitetura**
- `IISU.js` virou nove módulos (ver README). Os formulários antigos continuam em `SteamVaultLegacy.js`, renomeado (`iisu-` → `svl-`), e abrem dentro dos modais novos.
- Um único gerador de notas (`SteamVaultCore.buildGameNote` / `buildAchievementNote` / `noteBody`) serve formulário, importação em massa, Templater e sync.
- Uma fonte única de contadores: conquistas deduplicadas (por nome da API, hash do ícone ou nome), horas e datas com origem explícita (Steam ou vault). Sem conquistas conhecidas, o app mostra "—" em vez de inventar 0% ou 55%.
- Status novos: `Paused`; `Platinum` passou a ser `Completed` + 100% derivado. "Não jogado" é derivado dos dados.
- Coleções: jogos no frontmatter (`games`), títulos sem ficha em `pendingGames`, com botão "Criar ficha".
- Sync da Steam Community pública, sem Web API (ver README).
- Diagnóstico do vault em *Configurações*, com a lista de problemas de dados e o link para a nota.

**Visual**
- `steamvault.css` (~2.500 linhas, 20 seções, tokens centralizados, tema claro intencional, Style Settings), no lugar do CSS antigo.
- Nenhum emoji na interface: ícones SVG de um só traço; emojis dos formulários antigos são removidos ao abrir.

**Removido**
- `Scripts/IISU.js`, `iisu-frontend.css` (e a cópia em `_install/`), `Dashboard/Perfil.md` (metas vazias; o conteúdo está em Perfil Steam, Conquistas e Estatísticas), campo morto `achievements: []`.

## 3. Revisão mobile

A primeira versão dependia de *container queries* sobre o elemento da nota. No Obsidian real (principalmente no mobile e com temas como o Minimal) essa detecção podia não acontecer, e o layout de desktop aparecia inteiro no celular. Agora:

- O `SteamVault.js` mede a largura real da área da nota e aplica classes de largura (`sv-bp-lg/md/sm/xs`), atualizadas ao girar a tela ou redimensionar.
- A altura da tela vem de uma variável medida (`--sv-view-h`), sem depender de unidades de contêiner.
- Restrições de largura e margens de temas são anuladas nas notas do Steam Vault.
- Grades nunca exigem mais largura do que existe (`minmax(min(Npx, 100%), 1fr)`).
- Layout de celular próprio para ficha, heros, filtros, conquistas, estatísticas, Steam, modais e avisos; efeitos de hover desligados em telas de toque.

### Segunda revisão mobile

Em aparelho real, algumas telas (ex.: Configurações) ficavam mais largas que o celular e cortadas à direita, e outras continuavam no layout de desktop. Causa provável: um contêiner do Obsidian/tema que se ajusta ao conteúdo esticava a nota, e a detecção de largura lia essa largura inflada. Correções:

- A largura usada no layout é a **visível** (o menor entre a área da nota, a janela e a tela), nunca a do conteúdo.
- `.sv-host` usa `contain: inline-size`, e `.sv-app` nunca passa da largura visível: o conteúdo não consegue mais esticar a nota.
- No celular, textos longos quebram linha, botões podem ocupar duas linhas e todas as colunas de grade encolhem (`minmax(0, 1fr)`).
- Auditoria automática de **48 telas, abas, modais e formulários** em 320, 360, 390, 430, 768 e 1024 px, com um ambiente "hostil" que imita temas (imagens com cantos, margens e limite de largura; contêiner que se ajusta ao conteúdo): nenhum elemento passa da borda.

### Ícones das conquistas

Na Vitrine (e nos destaques de Conquistas e da ficha), o ícone quadrado ficava sobre uma moldura redonda; quando o tema aplica cantos e limites às imagens, o quadrado "vazava" e aparecia uma borda arredondada atrás. Agora o ícone é um quadrado arredondado recortado pelo próprio contêiner, com contorno na cor da raridade. Todas as imagens do Steam Vault (capas, fundos, ícones, avatares, capturas) ignoram margens, bordas, cantos e limites de largura impostos por temas: o formato vem só do contêiner.

### Gêneros

- Gêneros e subgêneros usados pelos jogos mas sem nota em `Genres/` (Horror, Survival Horror, Puzzle, Parkour, Exploração) apareciam na tela sem link — tocar não fazia nada. As 5 notas foram criadas, e daqui em diante qualquer gênero ou plataforma sem página é criado automaticamente no primeiro toque e aberto em seguida (sem duplicar se a página já existir com outro nome de arquivo).
- "Aparece junto com", na página de um gênero, virou lista de links.
- Página de gênero no celular aparecia estreita e deslocada para a esquerda. A largura do app não é mais travada por uma medição feita durante a animação de abertura (é medida de novo depois dela e a cada mudança de layout do Obsidian), e a nota não pode mais rolar para o lado — só as faixas que deslizam de propósito (prateleiras, abas, filtros).

### Modo de edição (Live Preview) no celular

Os prints de Gêneros mostravam a nota aberta no **modo de edição** (ícone de livro no topo). No editor do Obsidian (CodeMirror) o conteúdo fica numa coluna centralizada com largura de leitura, que pode ficar mais larga que a tela, e o texto herda `white-space: pre-wrap`. O resultado era a tela mais larga que o celular, centralizada e cortada dos dois lados, com espaços do código aparecendo como linhas em branco. O problema foi reproduzido no ambiente de teste (coluna de 600 px num celular de 396 px) e corrigido:

- O app se alinha exatamente à área visível da nota (mede o rolador e se posiciona sobre ele), em qualquer modo e com qualquer tema.
- Espaçamento e quebra de texto do editor não afetam mais as telas.
- Telas do Steam Vault abertas no modo edição passam sozinhas para o modo leitura (uma vez por nota em cada aba; se você voltar ao modo edição de propósito, ele é mantido).
- As proteções de largura, rolagem lateral e cabeçalho da nota funcionam mesmo se o Obsidian não aplicar a cssclass `steamvault`.
- Auditoria das 48 telas repetida em modo leitura, modo edição e modo edição com coluna centralizada de 600 px: nenhuma falha.

### Camada própria (versão 2.1.0)

Mesmo alinhando o app à área visível, prints do Obsidian mobile mais novo (cabeçalho e barra inferior flutuantes) ainda mostravam a tela cortada ou centralizada — cada versão do Obsidian e cada tema organiza a nota de um jeito. Em vez de continuar se adaptando a isso, o app deixou de ser desenhado **dentro** da nota:

- Na aba principal, o Steam Vault desenha numa camada própria que cobre a área de conteúdo da aba, com rolagem própria e exatamente o tamanho visível. O editor, o modo leitura, o tema e a versão do Obsidian não interferem mais na largura, no alinhamento nem no corte.
- A camada começa abaixo do cabeçalho flutuante do Obsidian mobile e reserva espaço para a barra inferior flutuante.
- Ao abrir outra nota na mesma aba, a camada é removida sozinha. No modo código-fonte (sem renderização do Dataview) ela também sai, e a nota fica editável.
- Notas incorporadas e pré-visualizações (hover) continuam desenhadas dentro da nota.
- A troca automática para o modo leitura foi removida: com a camada, os dois modos ficam iguais.
- Auditoria das 48 telas em modo leitura, modo edição, modo edição com coluna centralizada e Obsidian mobile com cabeçalho/barra flutuantes, em 320 e 396 px: nenhuma falha. Desktop conferido.

### RetroAchievements como seção própria (versão 2.2.0)

- Antes: o RA ficava dentro de *Progresso*, usava só a lista global de conquistas de um jogo (`API_GetGameExtended`) e cada desbloqueio era marcado à mão.
- Agora: módulo `SteamVaultRetro.js` com a Web API oficial e dados do **seu** perfil (`API_GetUserProfile`, `API_GetUserSummary`, `API_GetUserCompletionProgress`, `API_GetGameInfoAndUserProgress`, `API_GetUserAwards`, `API_GetAchievementsEarnedBetween`). Um botão sincroniza tudo: conquistas (com hardcore, data, pontos, raridade, tipo), prêmios, pontos, ranking, jogos e metadados.
- Seção própria: *Perfil RA*, *Jogos RA*, *Conquistas RA*, painel RA na ficha do jogo, bloco em *Configurações* e resumo compacto na Home.
- Hierarquia: a Steam subiu para o 2º grupo da barra lateral (logo depois da Biblioteca) e mantém o azul, o hero grande e a barra inferior do celular; o RA fica no último grupo, com dourado só como detalhe e hero menor.
- Schema: novo campo `raGameId`; cache `ra:` no jogo; notas de conquista ganham `raHardcore`, `raPercent`, `raTrueRatio`, `raType`, `raBadgeUrl`. O campo antigo `raUsername` é lido como reserva.
- Testado contra uma imitação da API oficial (27 verificações): conectar, sincronizar, ligar jogo pelo título, criar/atualizar notas sem duplicar, adicionar jogo do perfil, cache de 12 h, limite 429, chave inválida e a chave nunca aparecendo em notas. Telas auditadas no celular (320/396 px) e desktop.

### Brilho nas capas (versão 2.2.1)

Faixa de luz diagonal que atravessa a capa uma vez (hover, foco de teclado, toque no celular e entrada da capa do hero). Implementada num pseudo-elemento já recortado pela capa, animando apenas `transform` e `opacity`. Medido num celular emulado com CPU 6× mais lenta: 60 fps estáveis (pior quadro 16,8 ms) e nenhum recálculo de layout durante a animação. Sem loop contínuo; desligável em Configurações e desligado com "Reduzir animações" ou a preferência de movimento reduzido do sistema. Capas pequenas (listas, busca, tier list) não brilham.

### Ocultar barra do Obsidian no celular (versão 2.2.2)

Nova opção no Style Settings (*Obsidian mobile → Ocultar barra de navegação do Obsidian*, ligada por padrão). Só vale quando a aba ativa é uma tela do Steam Vault (marcador `sv-on-screen` atualizado ao trocar de aba, de layout ou de nota); nas notas comuns a barra volta. No lugar dela aparece a barra inferior do próprio Steam Vault, e o menu *Mais* ganha o grupo "Obsidian" com Voltar, Avançar, Buscar, Nova nota, Menu lateral e Mostrar barra do Obsidian (temporário, até trocar de tela). A barra de status do aparelho e o cabeçalho da nota não são alterados. Auditoria das 55 telas repetida com a opção ligada: nenhuma falha.

### Topo do celular sem barra (versão 2.3.0)

Análise: com a barra do Obsidian oculta, o celular tinha o cabeçalho do Obsidian, a barra superior do Steam Vault (☰, busca, perfil) e a barra inferior do Steam Vault. O ☰ repetia o "Mais" e o perfil repetia a aba "Perfil" — só a busca era exclusiva. Solução:

- No celular a barra superior deixa de ocupar espaço: pesquisa e avatar viram botões redondos flutuantes (vidro) no canto superior direito, sobre a arte; um degradê suave aparece atrás deles só depois de rolar.
- A lupa abre o campo de busca por cima do topo (Esc, perda de foco ou ✕ fecham); os atalhos `/` e `Ctrl+K` também abrem.
- O avatar abre um menu de conta (status da Steam e do RetroAchievements, sincronizar, Configurações), que não duplica a aba Perfil. Vale também no desktop.
- O ☰ só aparece se a barra inferior não estiver visível (classe `has-bottomnav` medida pelo script).
- Telas sem hero começam abaixo da fileira de botões; heros com fundo próprio reservam o espaço; as abas fixas da ficha deixam a direita livre.
- Style Settings: *Ocultar botão de pesquisa* e *Ocultar ícone de perfil*, independentes.
- Auditoria das 55 telas no celular (leitura 320 px; Obsidian com cabeçalho flutuante e barra oculta, 396 px): nenhuma falha. Desktop conferido.

### Barra de rolagem (versão 2.3.1)

Nova opção no Style Settings (*Obsidian mobile → Ocultar barra de rolagem*, ligada por padrão): esconde o indicador de rolagem vertical da camada do Steam Vault e das áreas internas que rolam (menu Mais, janelas de edição, resultados da busca, listas, menu de conta). Só o indicador some — medido com barras reais: 15 px → 0 px, e a rolagem por roda do mouse continua idêntica.

### Menu lateral no celular (versão 2.3.2)

Bug: com a página rolada, o menu "Mais" não ia até o fim da tela — começava no topo do conteúdo (ficando parcialmente acima da tela) e rolava junto com a página. Causa: desde a camada própria (2.1.0) quem rola é a camada, e o menu era posicionado em relação ao início do conteúdo dela. Correção: ao abrir, o menu é posicionado na parte visível da camada (topo = posição de rolagem atual, altura = altura visível) e a página por trás fica travada; o menu continua rolando por dentro; ao fechar, a página volta exatamente para onde estava. Também acompanha giro de tela. Reproduzido e testado com a página rolada 1.400 px: menu cobre de cima a baixo, página não rola por trás.

### Modo aplicativo e áreas seguras (versão 2.4.0)

- **Modo aplicativo** (Style Settings, opção única, ligado por padrão) substitui a opção "Ocultar barra de navegação do Obsidian". Ligado, oculta nas telas do Steam Vault o cabeçalho da nota e a barra inferior do Obsidian, juntos; desligado, ambos funcionam normalmente. Não existe opção separada para o cabeçalho. O menu *Mais* ganhou "Editar nota" e "Mostrar controles do Obsidian" (pausa o modo até a próxima tela). A marca da aba (`sv-leaf`) é removida quando ela volta a mostrar uma nota comum.
- **Áreas seguras**: o script lê `env(safe-area-inset-*)`, as variáveis `--safe-area-inset-*` do Obsidian e, no Android edge-to-edge (WebView do tamanho da tela, como no POCO F7 com Android 15) sem nenhum valor informado, estima 32 px (status) e 18 px (gestos). Aplica só a sobreposição real (`--sv-safe-top`, `--sv-safe-bottom-inset`), sem duplicar espaço já reservado pelo Obsidian. Afeta: faixa da barra de status (a barra superior compacta vira essa faixa), botões flutuantes, busca, abas fixas da ficha, barra inferior, menu Mais, janelas de edição (inclusive os botões fixos Cancelar/Salvar), avisos, barra superior e lateral em tablet/paisagem.
- Encontrado e corrigido junto: em paisagem no celular, os últimos ícones da barra lateral ficavam fora da tela sem rolagem; e os botões fixos dos formulários também grudavam no rodapé em formulários dentro da página (agora só nas janelas).
- Testado num POCO F7 simulado (410×887 CSS, barras do sistema desenhadas): 55 telas com o modo ligado e desligado — nenhum elemento sai da tela e nada interativo fica sob a barra de status ou de gestos; menu rolado até o fim, janela de edição e paisagem conferidos. Não foi possível ver o "Modo aplicativo" do Anime Vault (outro projeto, fora do alcance desta conversa); a lógica foi documentada para facilitar o alinhamento.

### Revisão de conflitos da interface (versão 2.4.1)

**Seções da ficha "sumindo" com pesquisa/perfil ligados.** Causa: para os botões redondos não cobrirem as abas grudadas no topo, a faixa de abas reservava 104 px à direita; num celular de ~410 px isso empurrava DLC, Sessões e Notas para fora da área visível, sem indicação de que dava para deslizar — ou seja, ligar um elemento da interface alterava o conteúdo da página. Correção: as abas ocupam a largura toda e, quando grudam no topo, ficam logo **abaixo** da fileira de botões (que ganha fundo sólido); dica visual na borda quando há abas escondidas; a aba ativa é trazida para a área visível. Resultado medido: mesmas abas visíveis com os ícones ligados e desligados; as 6 seções abrem com o mesmo conteúdo nos dois casos.

**Barra da Steam no meio da tela em páginas curtas** (Biblioteca compacta/lista). Causa: a barra é "grudenta" no fundo enquanto há conteúdo para rolar, mas nada a empurrava para baixo quando o conteúdo acabava cedo. Correção: no celular o app é uma coluna flexível e o conteúdo estica até a barra. Medido: 335 px e 197 px acima do fundo → 0 px em todas as telas.

**Encontrado na análise geral (não estava nos prints):**
- Ao rolar, cards e botões passavam por baixo dos ícones de pesquisa/perfil (um toque ali caía no ícone). Agora, assim que a página começa a rolar, a fileira de ícones vira uma barra sólida e o conteúdo passa por trás dela; no topo da página os ícones continuam flutuando sobre a arte.
- A reserva de espaço no topo era um número fixo repetido em vários lugares; agora é uma única variável (altura da fileira de ícones), que vale zero com pesquisa e perfil ocultos — páginas, heros e abas seguem a mesma medida.
- Uma regra antiga do arquivo de áreas seguras sobrescrevia a posição das abas grudadas; removida.
- Telas sem item próprio na barra da Steam (Configurações, Coleções, Estatísticas, RetroAchievements…) não destacavam nada; agora destacam "Mais". Sub-telas da Steam destacam "Perfil"; fichas destacam "Biblioteca".

**Verificação:** matriz de conflitos com 26 telas × 5 combinações (modo aplicativo ligado/desligado; pesquisa e perfil ligados, só um, nenhum) × 2 posições de rolagem = 260 verificações — 0 falhas de layout e 0 telas com conteúdo alterado pelos ícones ou pelo modo. Navegação encadeada entre telas sem vazamento de estado (busca aberta, menu, rolagem, controles do Obsidian). Auditoria das 55 telas no POCO F7 simulado com o modo ligado e desligado: 0 falhas. Desktop conferido.

### Imagem do topo na barra de status + animação da barra (versão 2.5.0)

- **Faixa no topo das fichas.** Era a faixa na cor do app atrás da barra de status (2.4.0). Agora ela é uma camada própria: some nas telas que começam com imagem e continua nas demais.
- **Imagem expandida** (Style Settings: *Imagem do topo na área da barra de status*, ligado por padrão). O topo com imagem sobe pela altura exata da barra de status e o conteúdo desce o mesmo tanto, então só a imagem se expande. Um escurecimento suave no alto garante a legibilidade dos ícones do sistema. Critério de "tem imagem": fichas de jogo sempre (arte, capa desfocada ou fundo gerado); coleção, plataforma, gênero, perfil Steam e página de conquista só com imagem de fundo carregada (imagem quebrada → volta a faixa). Topos só com gradiente (Conquistas, RetroAchievements) e telas sem topo mantêm a faixa.
- **Animação da barra.** A faixa da barra de status e a barra dos ícones usam só opacidade (180 ms) e deslocamento de poucos pixels (220 ms), em camadas que não ocupam espaço: nada no layout se move. A animação dispara só quando o estado muda, com histerese perto do topo (aparece acima de 6 px de rolagem e some abaixo de 2 px) para não piscar. Ao abrir ou voltar para uma tela já rolada, o estado final é aplicado sem animação. Respeita "Reduzir animações".
- **Corrigido junto.** A cada evento de rolagem, o script regravava a classe da barra mesmo sem mudança, e o navegador reavaliava os estilos à toa. Agora só grava quando o estado muda: 20 → 1 alteração ao rolar a ficha, 0 no `<body>`.
- **Verificação** (POCO F7 simulado):
  - 13 tipos de tela: imagem sob a barra de status só onde há imagem; título na mesma posição com a opção ligada e desligada; nenhum texto, botão ou ícone atrás da barra de status.
  - Animação a 60 fps com CPU 6× mais lenta.
  - Matriz de conflitos (260 verificações): 0 falhas.
  - Auditoria das 55 telas com o modo aplicativo ligado e desligado: 0 falhas. Com o modo aplicativo desligado a opção não tem efeito, porque o cabeçalho do Obsidian já cobre a barra de status.

### Barra superior removida (versão 2.5.1)

A pedido, as duas faixas do topo no celular foram removidas em todas as telas: a da barra de status e a que aparecia atrás dos ícones ao rolar (a animação da 2.5.0 deixa de ter efeito). Ficam só os botões de pesquisa e perfil, com o mesmo visual de vidro em qualquer posição, sempre abaixo da barra de status (42 px do topo; barra de status de 32 px no POCO F7 simulado). As abas da ficha continuam grudando logo abaixo dos botões. O conteúdo rolado passa por trás dos botões e da barra de status. Verificação: 260 verificações da matriz de conflitos e 55 telas — 0 falhas.

### Barra de abas da ficha e fades (versão 2.5.2)

Analisado a partir de gravação de tela no POCO F7:
- **Conteúdo vazando por cima das abas grudadas**: a 2.5.1 removeu a cobertura da área acima das abas junto com a barra do topo. Restaurada como antes, mas como fundo da própria barra de abas e só enquanto ela está grudada; nas outras telas continua sem faixa.
- **Faixa de abas "andando" ao trocar de seção**: a centralização automática da aba tocada (2.4.1) foi removida — a troca de seção volta ao comportamento original. A aba ativa só é trazida para a vista ao abrir a ficha, e só o mínimo necessário. A rolagem até as abas ao trocar de seção agora considera onde elas grudam (`scroll-margin-top`).
- **Arrastar as abas abria o painel do Obsidian** (propriedades do arquivo): o arrasto horizontal em abas, prateleiras e filtros deixa de chegar ao gesto do Obsidian (0 eventos no teste).
- **Fades removidos**: sem o escurecimento sobre a barra de status (gradiente da 2.5.0 e degradê superior da arte) e sem o "fade" das bordas que o Obsidian mobile aplica aos contêineres da nota (neutralizado nas telas do Steam Vault com o modo aplicativo). O degradê inferior da arte, que a funde no fundo, continua.
- Verificação: troca de todas as seções com abas grudadas, matriz de conflitos (260) e auditoria das 55 telas — 0 falhas.

### Steam Picks na Home (versão 2.6.0)

Base: vault enviado pelo usuário (Steam_Vault_V2, versão 2.5.2).

- Novo módulo `SteamVaultPicks.js` + seção no fim da Home (abaixo de todo o conteúdo, inclusive do resumo do RetroAchievements), usando a prateleira nativa do Vault (setas, arrasto isolado do gesto do Obsidian).
- Dados da loja Steam pública: `/api/featuredcategories` (ofertas, mais vendidos, novidades — nome, capa, preço final/original em BRL, desconto, fim da oferta), `/appreviews/<id>` (avaliação) e `/api/appdetails?filters=genres` (gênero). Uma requisição por vez, timeout de 10 s.
- Carregamento: sentinela com IntersectionObserver na área que rola (700 px antes do fim); detalhes e imagens por card com IntersectionObserver na própria prateleira; montagem no próximo momento ocioso do navegador.
- Cache: lista 30 min (sessão + `.steamvault/picks.json`), detalhes 24 h. Preço vencido nunca é exibido.
- Testado com imitação dos endpoints: Home aberta = 0 requisições e 0 imagens; perto do fim = 1 requisição de lista, detalhes e imagens só dos cards visíveis; subir/descer, trocar de aba e voltar para a Home = 0 novas consultas da lista; offline, falha de rede e cache vencido offline = seção inexistente (0 px, sem erro); jogos do vault excluídos. Desempenho com CPU 6× mais lenta: média de 17,1 ms por quadro (16,7 ms sem a seção), 95% em 60 fps. Auditoria das 55 telas e matriz de conflitos (260): 0 falhas.

### Rolagem travada ao abrir telas pelo menu "Mais" (versão 2.6.1)

- **Sintoma:** ao abrir qualquer tela pelo menu Mais (ex.: Perfil Steam), a rolagem não respondia; só voltava depois de um segundo toque.
- **Causa:** ao abrir, o menu trava a rolagem da camada do app (`.sv-layer.is-locked`, `overflow-y: hidden`) para a página de trás não rolar junto. A trava só era removida depois da animação de fechamento (220 ms), procurando a camada a partir da tela ANTIGA (`root.closest(".sv-layer")`). Tocar num item do menu navega e redesenha a tela antes disso; quando o código agendado rodava, a tela antiga já estava fora do documento, a camada não era encontrada e a trava ficava. A tela nova, que reaproveita a mesma camada, nascia sem rolagem.
- **Correção:** a trava é removida no instante em que o menu começa a fechar, e toda tela nova começa destravada, sem herdar estado do menu da tela anterior. A antiga "restauração de posição" ao fechar também saiu: a trava não muda a posição de rolagem, e restaurá-la depois de navegar levava a nova tela para a posição da antiga.
- **Verificação:**
  - os 17 itens do menu Mais com um único toque: 17/17 destravados e rolando (antes 0/17);
  - arrasto de dedo real: rolagem imediata nas telas abertas pelo menu;
  - com o menu aberto, a página de trás continua travada e o menu rola por dentro; ao fechar tocando fora, a posição da página é mantida;
  - 55 telas e matriz de conflitos: 0 falhas.

### Nuuvem, Instant Gaming e GOG nas ofertas (versão 2.7.0)

- **Arquitetura.** Nada da Steam foi reescrito. O novo `SteamVaultStores.js` tem só adaptadores (endereço, leitura e link de cada loja). Rede, domínios permitidos, cache, lazy loading, card, prateleira e estados de carregamento continuam sendo os da integração da Steam (`SteamVaultPicks`), que ganhou quatro coisas:
  - a fila de requisições passou a ser por loja;
  - o filtro de lojas;
  - "Ver mais";
  - a comparação de preços.
- **Fontes.**
  - GOG: catálogo JSON público (`catalog.gog.com/v1/catalog`, BR/BRL).
  - Nuuvem e Instant Gaming: não oferecem API pública para esse uso (a da Instant Gaming exige credenciais de parceiro). São lidas as páginas públicas de listagem: primeiro os dados estruturados (JSON-LD), extraídos direto do texto, e na falta deles os cartões de produto. Nesse caso só o trecho com os produtos é montado, num momento ocioso do navegador.
- **Comparação.** Primeiro com as listas já carregadas (sem requisição); busca sob demanda nas lojas que faltam só ao tocar em "Comparar". O "menor preço" só é apontado entre preços na mesma moeda. Nenhuma loja é qualificada como melhor.
- **Testado com imitações dos endereços** (formatos JSON, JSON-LD e HTML sem dados estruturados):
  - Home aberta: 0 requisições.
  - Perto do fim: 4 consultas de lista (uma por loja), 3 capas para 8 cards.
  - Filtros e "Ver mais": sem nova consulta de lista.
  - Comparação: 0 buscas quando as listas já tinham o jogo, 3 quando só uma loja tinha.
  - Falha individual (conexão, bloqueio, formato desconhecido): as outras lojas continuam. Só a Steam disponível: a seção volta a ser a Steam Picks original, com as abas.
  - Offline ou tudo falhando: seção inexistente.
- **Desempenho** com CPU 6× mais lenta e páginas de ~300 KB: média de 17,1 ms por quadro (16,7 ms sem a seção), 95% em 60 fps.
- **Verificações gerais:** 55 telas e matriz de conflitos, 0 falhas.

### Movimento e microinterações (versão 2.8.0)

Camada de acabamento por cima do que já existia (seção 21 do CSS; `_wireMotion` e `_wirePointerFx` em `SteamVault.js`). Nenhum layout, dado ou fluxo foi alterado.

- **Entradas.**
  - Seções sobem ao aparecer, e as capas das prateleiras entram em cascata.
  - Números de destaque contam até o valor. Barras, anéis, barra de estado e mapa de atividade se desenham.
  - A arte do topo assenta com zoom lento e tem parallax ligado à rolagem, feito pelo navegador (`animation-timeline`, sem JavaScript; ausente onde não há suporte).
  - Tudo é disparado por `IntersectionObserver`: nenhum trabalho no evento de rolagem.
- **Microinterações.**
  - Capas: inclinação 3D e reflexo que seguem o mouse (desligável em Configurações). Luz sob o cursor em coleções, plataformas, gêneros e ofertas.
  - Botão principal: reflexo ao passar o mouse. Coração pulsa ao favoritar.
  - Abas e item ativo do menu: indicadores crescem. Barra inferior: pílula no item ativo.
  - Menus, busca, janelas e avisos: entram com mola curta. No celular, a janela sobe da borda.
  - Toque: cards afundam sob o dedo.
- **Celular primeiro** (o vault é usado sobretudo no celular; seção 21b do CSS, `_swipe`/`_haptic`/`_wireTouchFx`):
  - Gestos: janela (painel de baixo, com alça) fecha arrastando para baixo; menu *Mais* fecha arrastando para a esquerda; aviso some deslizando para o lado. Arrasto curto volta ao lugar; a saída continua do ponto em que o dedo soltou.
  - Resposta imediata ao toque em cards, linhas, conquistas, chips, menus e botões do topo. Tudo usa `.is-touch`, não depende de hover. No iOS, o `:active` fica ligado por um ouvinte de toque.
  - Seção da ficha entra pelo lado da aba tocada.
  - Vibração leve só nos toques que mudam algo (Haptics do app quando existir, senão `navigator.vibrate`; desligável).
  - Testado com toques reais simulados num celular de 410 × 887 px: cada gesto dispensa ou volta como esperado, 1 vibração por ação, 0 erros.
- **Sem piscar no re-render.** Antes, todo re-render da mesma tela (salvar, favoritar, sync, Dataview) refazia o fade da página inteira. Agora o app distingue navegação de re-render (`is-refresh`) e só anima na navegação.
- **Correções encontradas na análise.**
  - A entrada da capa do hero animava `transform` e, ao terminar, apagava o `translateY(72px)` que a faz entrar na faixa de abas. Isso só funcionava com "Reduzir animações". A entrada agora usa `translate` e a capa fica onde o layout previa.
  - As capas nos resultados da busca global nunca apareciam: ficavam com opacidade 0 porque o fade de carregamento não era ligado ali.
- **Custo.**
  - Só transform/opacity/translate/scale animam, com exceção do recorte de dois elementos e do traço dos anéis.
  - Nada fica em loop. Inclinação e luz fazem no máximo uma escrita de variável CSS por quadro, só no elemento sob o mouse.
  - Com "Reduzir animações" ou a preferência do sistema, nada disso roda. Se o observador falhar, tudo aparece no estado final.
- **Testado** num harness que roda os scripts reais contra as notas do vault (Chromium):
  - 23 telas × desktop, celular (390 px) e movimento reduzido: 0 erros e 0 elementos presos invisíveis, sem desenhar ou em zero.
  - Re-render sem animação conferido.
  - CPU 6× mais lenta, navegação + rolagem no celular: 95% dos quadros ≤ 16,8 ms, igual ao original.

### Revisão geral para o celular (versão 2.9.0)

Revisão completa com o POCO F7 como alvo (≈410 × 887 px em CSS, Android edge-to-edge). Só correções, otimizações e acabamento; nenhuma funcionalidade nova.

- **Bugs corrigidos.**
  - Tier List inutilizável no celular: o arrastar do HTML não funciona com o dedo. Agora: toque na capa para pegá-la; toque numa faixa (vai para o fim) ou em outra capa (entra antes dela) para soltar; toque de novo na mesma capa para abrir o jogo.
  - Conquistas → "Mais recentes" não ordenava por data (só separava quem tinha data). Agora usa data e hora reais.
  - Galeria de mídia sem gesto no celular: deslizar para o lado troca a imagem.
  - Mapa de atividade (Estatísticas) abria mostrando o começo do ano no celular. Agora abre nas semanas recentes.
  - Coleções automáticas pareciam tocáveis (elevação, luz, "afundar"), mas não são links. Os efeitos saíram.
- **Desempenho.**
  - Modelo de dados: `dv.pages()` (varre o vault inteiro) era chamado duas vezes por montagem; agora uma. Ligar conquista → jogo passou de busca linear por jogo a consulta em conjunto (O(n) em vez de O(conquistas × jogos)).
  - Imagens: capas, fundos e destaques em PNG convertidos para WebP na mesma resolução (qualidade 86), com as notas atualizadas. De ~12,6 MB para ~0,7 MB (até 17× menor por imagem): menos memória e decodificação mais rápida no celular. Uma cópia idêntica e não usada (`Resident Evil 2-fundo.png`) foi removida.
  - Arte do topo com `decoding="async"` e `fetchpriority="high"`.
  - `SteamVaultLegacy.js`: 156 métodos inalcançáveis removidos (renderizadores antigos do iiSU substituídos pelos módulos novos). De 479 KB para 304 KB (−37%), menos código para o Obsidian analisar a cada abertura. A análise usou um parser de JavaScript e só removeu nomes que não aparecem em nenhum lugar do código alcançável. Os 20 editores herdados foram abertos antes e depois: resultado idêntico.
  - Método `retro()` morto em `SteamVaultInsights.js` removido (a rota usa `SteamVaultRetroPages`).
  - Tier List grava só as capas que mudaram de faixa ou posição (antes regravava a faixa inteira, redesenhando a tela a cada nota).
  - Sync da Steam não regrava os contadores do jogo quando não mudaram.
  - Editores herdados só consultam a lista de jogos e plataformas quando a ação precisa dela.
- **Toque e layout.**
  - Alvos de toque de pelo menos 36 px em botões pequenos, filtros, alternador de visualização, chips e links de seção (antes 24–32 px).
  - Configurações: "Inclinação 3D" só no desktop e "Vibração" só no celular.
  - Espaço entre números e barras nos painéis (Gastos).
  - Atalhos de Franquias rolam sem esconder o bloco sob os botões do topo.
- **Verificação:** 23 telas × celular, desktop e movimento reduzido. Tier List por toque, ordenação, galeria e mapa conferidos no POCO F7 simulado.

### Novas funcionalidades (versão 3.0.0)

Escolhidas pelo dono do vault a partir de uma lista de propostas. Celular primeiro; mesmas regras de dados (nada inventado) e de desempenho.

- **Novo módulo** `SteamVaultPlay.js`: caçador de conquistas, marcos, calendário, metas, Stories, sugestor e coleções automáticas. Artes e importação ficam em `SteamVaultSteam.js`; preços em `SteamVaultPicks.js`; gestos em `SteamVault.js`.
- **Artes automáticas da Steam.** Imagens públicas da CDN da loja (`library_600x900`, `library_hero`, `logo.png`), sem API. Convertidas para WebP no aparelho (canvas; se não houver suporte, fica o original). Só preenche o que falta. Teste: 3 arquivos, capa 97 KB, fundo 99 KB, logo 2 KB. O logotipo passa a substituir o título no topo da ficha (o texto continua para leitores de tela).
- **Adicionar da biblioteca Steam.** Um toque cria a ficha (schema completo, AppID, status), sincroniza as conquistas e baixa as artes. Reaproveita a lista do perfil já em cache (uma requisição a menos por jogo). Antes, o botão só abria o formulário vazio.
- **Caçador de conquistas.** Ordena pela % de jogadores; alvos marcados com o campo `target` na nota da conquista.
- **Marcos do Vault.** 13 insígnias com até 5 níveis, calculadas uma vez por revisão do modelo. O aviso de nível novo aparece uma vez; na primeira execução só memoriza, sem enxurrada de avisos.
- **Calendário.** Mês a mês, a partir do mesmo índice de atividade (calculado uma vez por revisão). O toque no dia abre o painel com os eventos.
- **Metas.** Em `goals` no frontmatter de Estatísticas (como os prêmios). 7 tipos, progresso das datas, ritmo esperado no ano corrente, aviso ao cumprir.
- **Retrospectiva em Stories.** Só dados com data no ano. Telas vazias são puladas. Barra de progresso animada por transform. Gestos: tocar, segurar e arrastar para baixo. A imagem legada continua como "Imagem para compartilhar".
- **O que jogar agora?** Pontuação por status, vontade (gêneros), tempo (duração estimada e gêneros) e progresso, com os motivos visíveis no card. Com menos de 3 candidatos, completa com zerados para rejogar.
- **Alerta de preço.** Steam `appdetails` (preço em BRL) ou o menor preço BRL entre as lojas já suportadas. Grava nos campos do schema, respeita 12 h por jogo e só consulta quando a seção aparece. Avisa só quando o preço chega ao alvo (não a cada verificação).
- **Coleções automáticas navegáveis.** 8 regras; o toque abre um painel com a grade.
- **Gestos.** Puxar para sincronizar (Início, Steam, RA) e voltar pela borda esquerda, com ouvintes na camada. A borda tem prioridade sobre faixas que rolam; um arrasto no meio da tela não dispara nada. Sem histórico, "voltar" leva ao Início.
- **Testado** no POCO F7 simulado com toques reais (CDP): cada funcionalidade, mais a varredura de 23 telas × celular, desktop e movimento reduzido e o desempenho com CPU 6× mais lenta.

### Correções vistas no aparelho (versão 3.0.1)

A partir de capturas de tela do POCO F7. O harness de testes passou a carregar também os estilos padrão do Obsidian para botões e campos (altura fixa, `nowrap`, bordas, anéis de foco), que antes ficavam de fora — era por isso que os problemas não apareciam nos testes.

- **Card "O que jogar agora?" transbordando.** O Obsidian dá a todo `<button>` altura fixa (`--input-height`) e `white-space: nowrap`. O card tinha 40 px de altura para um conteúdo de ~80 px, e o subtítulo passava 49 px da borda. A mesma causa afetava coleções automáticas, "conquistas mais raras", dias do calendário, miniaturas de screenshots e o "Ver mais" das ofertas. Correção única: esses botões têm a altura do conteúdo, texto que quebra dentro da caixa, e fundo e sombra do próprio componente. Uma varredura de todos os botões de todas as telas e editores confirmou o resto.
- **Painel do dia no calendário com texto quebrado letra a letra.** O feed de atividade tinha um layout de desktop (coluna de data de 116 px + ícone + miniaturas). A versão de celular só existia pelas classes de largura da tela principal, e as janelas ficam fora dela; somado à regra das janelas que deixa palavras quebrarem em qualquer letra, o texto ficava com ~100 px. Correção estrutural: o feed usa container queries e se adapta à largura do próprio espaço (Home, Atividade, painel, colunas estreitas). No estreito, as miniaturas vão para baixo do texto e as palavras não quebram no meio. O painel não repete a data do título. A redução das miniaturas no celular, que nunca funcionava por causa de um `!important`, passou a funcionar.
- **Lojas.** Instant Gaming e GOG respondiam, no aparelho, sem produtos legíveis ("formato não reconhecido"). A Instant Gaming protege as páginas contra acesso automatizado, e o catálogo da GOG não devolvia preços; não havia correção verificável, então as duas saíram do registro de lojas, e com isso de filtros, comparação, alerta de preço, Configurações e textos. Ficam Steam e Nuuvem. Uma loja indisponível agora mostra "Indisponível agora" em vez de uma mensagem de erro técnica.
- **Logo opcional.** Em *Capa e fundo*: escolher, colar, baixar da Steam, remover, e escolher "Mostrar a logo / Mostrar o nome" (`showLogo`). O topo volta ao título sem mudar o layout. A Biblioteca Steam não trata uma logo oculta como faltante.
- **Barra "Cancelar/Salvar" com um bloco vazio embaixo depois de digitar.** No Android edge-to-edge, com o teclado aberto, a área segura inferior informada pelo sistema passa a incluir a altura do teclado. O Vault a usava como folga da barra de ações (e da barra inferior e dos avisos) e mantinha o valor em cache depois que o teclado fechava. Correção:
  - Área segura acima de 56 px é tratada como teclado: vale o último valor real da barra de gestos.
  - O teclado é medido pela área visível da tela (`visualViewport` → `--sv-kb`). A janela sobe exatamente essa altura enquanto ele cobre a página e volta a 0 ao fechar, recalculado ao abrir e ao fechar.
  - O campo tocado é centralizado na janela.
  - Todos os estados dos campos (normal, hover que gruda no toque, pressionado, foco, preenchimento automático do Android, desativado) são definidos explicitamente.
  - Janelas no toque não focam mais o primeiro campo sozinhas (o que abria o teclado sem pedir e deixava o anel de foco em links).
- **Revisão geral:** varreduras de botões, de caixas que saem do card e de texto que vaza da própria caixa, em 17 telas e 8 editores. Corrigidos também o link "Ver tudo", que avançava sobre a margem, o ícone das dicas vazias dos editores e o enquadramento do fundo no celular ("−/+" ao lado da barra). 23 telas × celular, desktop e movimento reduzido: sem erros.

### Sistema universal de conquistas (versão 3.1.0)

**Antes:** um campo só (`achievementSource`: steam / retroachievements / manual / none, com o `gameType` antigo como reserva) dizia ao mesmo tempo de onde vinham as conquistas e como eram atualizadas. "Manual" era uma origem e um modo ao mesmo tempo; Epic, GOG, PlayStation, Xbox, Google Play, jogos de celular e conquistas criadas pelo usuário não tinham onde entrar.

**Agora:** duas propriedades independentes em todo o sistema.

- **Dados.** `achievementProvider` (Steam, RetroAchievements, Epic Games, GOG, PlayStation, Xbox, Google Play Games, Native, Custom, Sem conquistas, Não configurado) e `achievementSync` (Automática, Manual, Local, Nenhuma). As definições ficam num lugar só (`SteamVaultCore.providerDefs` / `syncDefs`), com os modos que cada origem aceita. "Automática" só existe onde há integração real (Steam e RA). Um modo inválido para a origem (ex.: Epic/Automática) cai no padrão da origem e o Diagnóstico avisa. Grafias alternativas são aceitas (`psn`, `Epic Games`, `nativo`, `personalizado`…).
- **Compatibilidade.** Notas antigas funcionam sem mudança. A ordem de leitura é `achievementProvider`, depois `achievementSource`/`gameType` (`manual` vira Native), depois `steamAppId` → Steam e `raGameId` → RetroAchievements, e por fim Não configurado. *Configurações → Conquistas → Migrar conquistas* grava os campos novos e remove os antigos; os syncs da Steam e do RA também migram a nota que tocam. Notas novas (formulário, modelo do Templater, importações) já nascem no formato novo, e a importação em massa usa "Não configurado" em vez de afirmar "Sem conquistas".
- **Sync.** A Steam só sincroniza conquistas de jogos com origem Steam em modo Automática. O RA só liga pelo título e sincroniza com origem RetroAchievements em modo Automática. Em Manual, os botões de sync somem. Loja, tempo de jogo e artes da Steam seguem o `steamAppId`, não a origem: um jogo Steam com conquistas Custom continua nas telas Steam e com o botão Jogar.
- **Interface.**
  - O topo da ficha mostra um selo duplo (origem | sincronização).
  - A aba Conquistas mostra a mesma linha com *Alterar*, que abre uma folha com as duas escolhas; os modos que a origem não aceita ficam desativados, com o motivo.
  - Em Manual e Local, cada conquista ganha um ✓ para marcar ou desmarcar como desbloqueada (grava `unlocked`, `unlockedDate` e `unlockSource: vault`).
  - "Não configurado" pede para escolher a origem. As mensagens de lista vazia seguem a origem e o modo.
  - *Editar detalhes* e *Adicionar jogo* trocaram o antigo "Tipo de conquistas" por *Origem* (lista agrupada) e *Sincronização*. "Atualizar dados" e a importação do RA só aparecem onde há de onde buscar.
- **Filtros e estatísticas.** O filtro da Biblioteca tem dois grupos (*Origem* e *Sincronização*), só com o que existe e com contagem. Em Conquistas, *Origem e sincronização* mostra os dois gráficos lado a lado. `libraryStats` tem `byProvider` e `bySync`. A exportação CSV tem colunas separadas.
- **Diagnóstico.** Aponta campos antigos, origem desconhecida, origem não configurada, modo que não se aplica à origem, Steam sem AppID e RA automático sem ID.
- **Testes:**
  - Resolvedores com 12 combinações antigas e novas.
  - Folha e editores: Native aceita Manual/Local; Epic e Google Play só Manual, com o aviso.
  - Gravação sem campos antigos; ✓ gravando a data; filtros por origem e por modo.
  - Migração a partir de uma nota antiga.
  - As mesmas telas com os dados antigos sem migrar: resultado idêntico.

### Achievement Hub (versão 3.2.0)

**Análise antes de mudar.**
- As conquistas já eram notas por jogo, e a origem e a sincronização já eram propriedades separadas (3.1).
- A tela Conquistas era uma página única de progresso.
- Steam e RA tinham topos próprios (`profileHero`, `RP.hero`) e subnavegações.
- Filtros e estatísticas conheciam a origem, mas não o progresso por origem.
- As animações de entrada só cobriam o conteúdo presente na primeira montagem.

**Arquitetura.**
- Os dados de cada origem ficam no Core: `providerDefs` e, novo, `providerStats(model)`. Calculado sob demanda, uma vez por revisão, traz por origem: jogos, total, desbloqueadas, %, 100%, em andamento, 0%, sem dados, pontos e recentes.
- A apresentação fica num registro de perfis em `SteamVaultHub.js`. Nova origem = uma linha em `providerDefs`; sem perfil próprio, ela usa o genérico e já entra em abas, filtros e números.
- O modelo de conquista ganhou campos opcionais: `category`, `rarityTier`, `secret`, `order`, `notes`, e `id`/`provider`/`gameId` derivados. `order` ordena qualquer origem, e a Steam mantém a própria ordem.
- `progressBucket(g)` define 100% / parcial / 0% / sem dados / sem conquistas para todos os filtros.

**Interface.**
- Hub com abas dinâmicas (só origens com jogos) e um perfil com composição própria por origem.
- Steam e RA reutilizam os componentes que já existiam, sem redesenho; só o espaço do topo foi ajustado para ficar sob as abas.
- Editor completo de conquistas para as origens manuais.
- Filtro de progresso na Biblioteca.
- Cards com 🏆 também no celular (em %), e ponto da origem quando há mais de uma.
- Conquistas por origem nas Estatísticas.
- Página da conquista com categoria, raridade manual, secreta, observações e ações do editor.

**Performance.** Só a aba ativa é montada; as outras, no primeiro toque (medido com CPU 6× mais lenta: 110–180 ms por aba). Abrir o hub custa o mesmo que abrir a Biblioteca. A rolagem da Home ficou igual à versão anterior.

**Correções encontradas na revisão:**
- A subnavegação das telas Steam/RA e os atalhos de Franquias tinham margem fixa de −16 px, maior que a margem da página no celular (14 px). Isso criava 2 px de rolagem lateral: eram as 8 falhas antigas da varredura. Agora a margem segue a da página, e a varredura passou a 69 de 69.
- "Conquista oculta ou sem descrição" aparecia em conquistas manuais sem descrição; agora só em conquistas da Steam/RA.

**Testes (harness com os estilos do Obsidian):**
- Cenário com as 11 origens, incluindo Sem conquistas e Não configurado.
- Nomes e descrições longos, secretas, conquistas sem ícone e uma lista de 60 conquistas.
- As 10 abas em 410 px, 360 px e desktop, tema escuro e claro: sem rolagem lateral, texto cortado ou erro.
- Editor: criar com todos os campos e ícone, editar, desbloquear e desfazer, reordenar (gravando `order` só onde mudou) e excluir.
- Seletor de jogo, marcar pelo quadro Custom (a aba ativa se mantém) e filtros da Biblioteca.
- Os 20 editores herdados continuam funcionando.

### Espaçamento e integrações de plataformas (versão 3.3.0)

**Espaçamento (a partir da captura do celular).**
- **Causa:** as seções (`.sv-block`, `.sv-shelf`, `.sv-split`) trazem o próprio espaço, mas peças soltas (vazios, avisos, faixas de números, o destaque da Epic) não traziam. Quando duas ficavam vizinhas, encostavam, como o card vazio colado no destaque da Epic.
- **Correção estrutural:**
  - Os perfis do hub viraram uma pilha com espaçamento fixo, com espaço de seção entre seções.
  - No resto do Vault, vazios, avisos e faixas de números ganham respiro quando vizinhos de outra peça.
- **Detector automático:** mede as bordas visuais (fundo, sombra, borda) de todos os elementos vizinhos. Rodou em 23 telas, nas abas das fichas (Steam, Epic, Native, Custom, Sem conquistas, Não configurado, PlayStation), nas 10 abas do hub (com e sem conquistas), nos editores e nos perfis Xbox/GOG conectados e desconectados, em 360/410 px e desktop. Achou também um vazio encostado num aviso na Biblioteca Steam, já corrigido.
- **Epic:** o destaque só aparece quando há um jogo com conquistas (sem destaque redundante sob o vazio) e não sobra uma seção "Biblioteca" vazia. Jogo sem arte mostra o título em marca d'água. Botões não dependem mais de `margin-left: auto`, que a regra global dos botões anulava.
- **Mantido de propósito:** o conteúdo passa por trás dos botões flutuantes e da barra de status ao rolar. É a escolha da versão 2.5.1 (sem barra superior), que foi preservada.

**Integrações.**
- **Pesquisa:**
  - Xbox tem acesso legítimo pela OpenXBL, com chave pessoal gerada pelo próprio usuário (cabeçalho `x-authorization`, endpoints de conta, histórico de títulos e conquistas).
  - A GOG publica jogos, tempo e % de conquistas no perfil público.
  - Epic, PlayStation e Google Play não têm forma segura: só login por credenciais de launcher ou token de sessão. Não foram implementadas, e o Vault explica por quê.
- **Arquitetura:** `SteamVaultPlatforms` é um registro de adaptadores com infraestrutura comum:
  - config no frontmatter do perfil e chave via `saveLocalStorage`;
  - fila de rede com hosts permitidos e pausa em 429;
  - cache em `.steamvault/<id>.json`, vínculo por título, importação e sync automático opcional.
  - Nova plataforma = uma entrada no registro. Steam e RA não foram tocados.
- **Modelo:**
  - `xboxTitleId`/`gogId` e os caches `xbox:`/`gog:` nas fichas.
  - `xboxId`/`xboxPercent` nas conquistas; a raridade Xbox entra como a da Steam/RA.
  - Estado `pct` para jogos que só têm porcentagem (GOG), sem inventar contagem.
  - Tempo de jogo da GOG e últimos acessos de Xbox/GOG entram nos cálculos de sempre.
- **Testes** com imitações fiéis das respostas (sem internet no ambiente):
  - chave inválida (recusada e não guardada), chave fora das notas;
  - ligação por título; criação e atualização de conquistas (G, raridade, secreta, data);
  - segundo sync sem rebaixar listas; importação;
  - perfil GOG privado (mensagem clara) e % na ficha e no hub;
  - desativar (sync bloqueado), desconectar (chave e cache apagados, fichas mantidas) e troca automática para o endereço novo da OpenXBL.
- **Validação geral:** varredura com 75 de 75 telas sem erro, editores herdados intactos, desempenho igual.

### Xbox direto pela Microsoft (versão 3.4.0)

Alternativa sem terceiros à OpenXBL, e agora o modo recomendado.

**Fluxo:**
- **Login:** OAuth 2.0 por código de dispositivo na plataforma de identidade da Microsoft (contas pessoais, escopo `XboxLive.signin offline_access`), com o aplicativo registrado pelo próprio usuário (cliente público, sem segredo). Funciona no celular sem URL de retorno.
- **Tokens:** a autorização vira o token de usuário da Xbox Live (`user.auth.xboxlive.com`, ticket `d=`) e depois o XSTS (`xsts.auth.xboxlive.com`, parte confiável `http://xboxlive.com`).
- **Leitura:** chamadas com `XBL3.0 x=uhs;token` a `profile`, `titlehub` e `achievements.xboxlive.com`. As respostas têm o mesmo formato que o adaptador já lia.

**Segredos:** só a autorização de renovação fica guardada, via `saveLocalStorage` neste dispositivo, e é trocada a cada renovação. Os tokens de acesso e o XSTS vivem só na memória.

**Erros tratados com mensagem clara:**
- Client ID inválido, ou app sem "fluxos de cliente público".
- Login recusado ou código expirado.
- Autorização revogada ou expirada (pede para conectar de novo).
- Conta sem perfil Xbox, conta infantil sem permissão da família, região sem Xbox Live.

**Um modo por vez:** conectar por um modo apaga o segredo do outro. Desconectar apaga a autorização e o cache, e lembra onde revogar na conta Microsoft.

**Testes** (imitações fiéis dos endpoints, sem internet no ambiente):
- as quatro validações de erro;
- o fluxo completo do código, com a autorização pendente antes de ser aprovada;
- sync de perfil, jogos e conquistas;
- nova sessão renovando a autorização (e trocando por uma nova);
- revogação e conta sem Xbox;
- troca para OpenXBL e de volta, e desconexão.

As mesmas telas e varreduras da 3.3.0 seguem sem problemas.

### Segurança das integrações, Epic Games e PlayStation (versão 3.5.0)

**Auditoria completa** de Steam, RetroAchievements e das integrações novas, item por item:

| Verificação | Resultado |
|---|---|
| Chaves, tokens ou senhas no código | Nenhum. Até o `client_id` da Microsoft é informado pelo próprio usuário (app dele) |
| Segredos em notas, cache ou git | Nenhum. Chaves e autorizações só em `saveLocalStorage` (fora do vault). O teste varre notas e `.steamvault/` atrás deles |
| Segredos em logs e toasts | Nenhum `console.log` com chave ou token. Mensagens de erro usam códigos, não a resposta crua |
| Steam | Só páginas públicas, sem login nem chave, e host na lista de permitidos. Nada a corrigir além dos itens gerais abaixo |
| RetroAchievements | **Corrigido:** uma chave nova que falhava na verificação substituía a chave boa já salva. Agora a anterior é restaurada, e uma chave que nunca funcionou não fica guardada |
| Links vindos da internet ou das notas | **Corrigido:** `href` de perfil, loja, oferta e capa aceitava qualquer esquema. Agora passa por `safeUrl`: só `https:`/`http:`, sem `usuário:senha@`, e só nos domínios oficiais de cada plataforma (`javascript:` e domínios falsos viram texto) |
| Nomes de arquivo | **Corrigido:** títulos remotos com `..`, `/`, caracteres de controle ou nomes reservados (`CON`, `NUL`…) podiam gerar caminhos ruins. Agora tudo passa por `safeFileName`, usado por Steam, RA, Xbox, GOG, importação, Legacy e editor de conquistas |
| Frontmatter | **Corrigido:** `yamlEscape` agora escapa tabulação e remove caracteres de controle, `U+2028` e `U+2029`. Um título hostil não abre outra chave YAML |
| Respostas das APIs | **Corrigido:** as respostas das integrações não tinham limite de tamanho nem de conteúdo. Agora há limite de 8 MB por resposta e cada campo é validado: IDs por formato, números com limites, textos cortados e sem caracteres de controle, datas inválidas descartadas, imagens só por `https`, links da GOG só em `www.gog.com` |
| Sessão e expiração | Xbox renova a autorização a cada sessão, e uma revogada pede nova conexão sem apagar dados. 429 respeita o `Retry-After`. Sem cookies de navegador em nenhuma integração |
| Arquivos locais | **Adicionado** `.gitignore` com `.steamvault/` (caches de perfil) e `.trash/` |
| Apagar tudo | **Adicionado:** *Configurações › Segurança e privacidade* lista o que está guardado neste dispositivo (sem mostrar o valor) e apaga tudo de uma vez, com os links para revogar do lado de cada plataforma |

**Arquitetura comum** (`SteamVaultPlatforms`): cada integração é um adaptador independente no registro, com hosts permitidos, modos, chave de segredo e validadores próprios. Todas seguem o mesmo caminho:

1. **Conectar:** configuração não secreta no frontmatter do perfil.
2. **Autenticar:** segredo só no armazenamento local.
3. **Validar:** o perfil só é salvo depois de uma leitura verificada.
4. **Sincronizar:** fila, limite de taxa e hosts permitidos.
5. **Armazenar só o necessário:** campos validados; o cache fica fora do git.
6. **Atualizar:** automático ou manual.
7. **Desconectar:** apaga o segredo, os tokens em memória e o cache; as fichas ficam.

Uma integração desativada ou com erro não afeta as outras.

**Epic Games e PlayStation:** não existe forma legítima de ler a biblioteca ou o progresso do jogador.
- **Epic:** não tem API pública de biblioteca ou conquistas para terceiros. O Epic Account Services só entrega nome e ID, e conquistas apenas do jogo do próprio desenvolvedor. As ferramentas existentes usam as credenciais do launcher, obtidas por engenharia reversa.
- **PSN:** não tem API pública. As ferramentas existentes pedem o cookie de sessão NPSSO (acesso à conta inteira) e credenciais do app oficial extraídas por engenharia reversa.

Pelas regras do projeto, as duas viraram **perfis manuais**:
- nome ou ID online opcional, validado e nunca consultado na rede;
- estatísticas montadas a partir do vault (troféus por grau na PSN);
- importação de jogos a partir de uma lista colada, com prévia, sem duplicar;
- painel "Por que não há sincronização automática".

Esses adaptadores não têm hosts nem segredos, e o teste confirma zero requisições.

**Testes** (`t21`):
- `safeUrl`, `safeFileName` e YAML com entradas hostis;
- resposta hostil da GOG (HTML no título, `javascript:` em links, `onerror`, números absurdos, datas inválidas) e resposta gigante;
- `priceUrl` com `javascript:` na ficha;
- chave do RA preservada;
- Epic e PSN: validação, prévia, importação e ausência de rede;
- inventário e "Apagar tudo";
- varredura de segredos nas notas e no cache.

Todas as telas, varreduras de espaçamento, editores, desempenho e os testes Xbox/GOG da 3.3–3.4 seguem sem problemas.

### Barra cinza nas abas das seções (versão 3.5.1)

Nas abas de Steam e RetroAchievements (Perfil, Atividade, Biblioteca, Vitrine), a linha azul da aba ativa ficava 1 px abaixo da faixa. Como a faixa rola para o lado, esse 1 px a tornava rolável também na vertical, e o Android desenhava uma barra de rolagem cinza na borda direita.

- A linha agora fica dentro da faixa.
- A faixa não rola na vertical, e o indicador de rolagem fica oculto também no Android.
- A mesma proteção vale para as abas das fichas.

Uma varredura nova verifica, em todas as telas do celular, que nenhuma faixa horizontal pode rolar na vertical. Antes da correção ela apontava as 6 telas afetadas.

### Revisão geral do Vault (versão 3.5.2)

Varredura automática de todas as telas, abas das fichas e janelas (celular 410 e 360 px, desktop, tema claro, Vault vazio e com todas as integrações conectadas). Ela procura texto sobreposto, texto cortado, contraste baixo, imagens quebradas, rolagem lateral e erros de JavaScript. Depois veio a revisão visual tela a tela.

**Bugs corrigidos:**
- **Capa translúcida no topo das fichas:** a regra do fundo desfocado (60%) também atingia a capa, e o nome da capa-marcador aparecia através dela.
- **Tier List no celular:** jogos sem capa viravam retângulos sem nome (a regra da legenda escondia o nome dentro da capa). O mesmo tipo de regra ampla demais foi corrigido nas coleções automáticas e na aba Custom.
- **Janela "Conquistas" da ficha:** o botão "Atualizar dados" aparecia duplicado, inclusive em jogos sem Steam/RA, e o clique era registrado duas vezes.
- **Prévia do enquadramento do fundo:** nunca mostrava a imagem, porque dependia de estilos antigos do iiSU. Ganhou estilos próprios, com a mesma regra de posição e zoom da ficha.
- **Busca dentro de janelas:** a lupa ficava por cima do texto "Filtrar jogos".
- **Steam em português:** "Membro desde", "última vez" e status eram exibidos em inglês. As datas e a presença agora são traduzidas.
- **"Jogados recentemente" (Steam):** um jogo sem imagem quebrava o nome palavra por palavra.
- **Ícones de conquista que não carregam** (sem internet ou link expirado) mostram o troféu, não um quadro vazio.

**Design e alinhamento:**
- **Barras de estatística:** todas começam e terminam no mesmo ponto, e valor zero não desenha barra.
- **Filtros da Biblioteca no celular:** duas colunas legíveis, em vez de quatro cortados ("T…", "Q…").
- **Separador "•":** não começa mais uma linha quando o texto quebra (RetroAchievements, GOG, Xbox, listas).
- **Avisos no celular:** o botão fica abaixo do texto, que usa a largura toda.
- **Plataformas e coleções sem capas:** mostram capas tipográficas com os nomes, não um cartão vazio. Coleção automática com um jogo só mostra a capa em pé sobre fundo desfocado.
- **Franquias:** a barra solta sob a linha do tempo virou "X de Y zerados", e um jogo sem ano diz "Sem ano". A barra de rolagem da linha do tempo foi escondida.
- **Espaçamento e recuos:** "Próximas conquistas" tinha 0 px de espaço abaixo do resumo; a lista de privacidade nas janelas de conexão estava recuada.
- **Contraste:** as opções ativas dos editores ficaram mais escuras. No tema claro, dourado, raridade lendária e selos Xbox/GOG ficaram legíveis.
- **Vault vazio:**
  - Início sem margem lateral: corrigido.
  - Biblioteca sem mensagem: ganhou uma mensagem com o botão "Adicionar jogo".
  - Tier List dizia "todos classificados" sem jogos: corrigido.
- **Textos:** todos os "(s)" viraram plural de verdade ("4 jogos sincronizados, 53 conquistas novas"). O diagnóstico usa o nome da conquista e do jogo, sem repetir.
- **Editor de conquista:** os botões dizem "Salvar data" e "Salvar ícone".

Testes de regressão (segurança, integrações, hub, editores, varreduras de espaçamento e texto) sem falhas. O desempenho ficou igual ao da versão anterior.

### Altura da barra de abas grudada (versão 3.5.3)

**Causa:** nas fichas, a barra de abas (Visão geral, Conquistas…) grudava ABAIXO da faixa reservada aos botões Pesquisa e Perfil. Essa faixa é a variável `--sv-fabrow`, de 60 px, que ganhava fundo sólido ao rolar (`.sv-topbar::before` e `.sv-gamenav::before`, com altura `safe-top + fabrow`). Com os ícones visíveis, o cabeçalho grudado tinha 60 + 47 = 107 px. Com os dois ocultos no Style Settings, a faixa valia 0 e sobravam 47 px. A altura da barra dependia, portanto, da presença dos ícones.

**Correção** (só estrutura, sem mudar o visual nem o tamanho dos ícones):
- As abas grudam no topo (`top: safe-top`), sempre com 47 px.
- A faixa sólida dos botões não é desenhada nas fichas. O fundo do grudado cobre só a barra de status.
- Quando as abas grudam, Pesquisa e Perfil passam a ficar dentro da linha das abas, centralizados nela (40 px, como antes).
- As abas reservam à direita só a largura dos ícones visíveis: 2 ícones, 1 ou nenhum. Ocultar um ícone só remove o ícone.

**Medido no celular:**

| Estado | Antes | Agora |
|---|---|---|
| Com os ícones | 107 px | 47 px |
| Sem os ícones | 47 px | 47 px |
| Com barra de status de 28 px | — | 47 px |

As outras telas (faixa sólida ao rolar) e o desktop ficam como estavam.

### Desempenho e cartão para compartilhar (versão 3.6.0)

**Medição** (celular simulado com processador 4× mais lento; os tempos vão de abrir a tela até a tela desenhada): entre 60% e 70% do tempo de cada tela ia para uma única etapa, `_observeSize`.

**Causa:** a página nova era inserida sem as classes de tamanho de tela (`sv-bp-sm` etc.) e sem as variáveis de medida (largura, altura, áreas seguras, barra inferior). O primeiro cálculo de layout montava a página inteira como desktop. Logo depois as classes entravam e o navegador refazia tudo como celular. Somavam-se leituras e escritas alternadas, que forçam novos cálculos: `_fitLayer`, `_insets`, o disparo de "scroll" em cada faixa de abas e `getComputedStyle`.

**Correção:**
- A largura é medida **antes** de trocar o conteúdo, e as classes e variáveis da última medição são aplicadas no `.sv-app` novo antes de qualquer leitura. A página é calculada uma vez só.
- As escritas de classes e variáveis só acontecem quando o valor muda (`_setCls`, `_setVar`).
- As setas das abas roláveis são atualizadas no quadro seguinte.
- A medição das áreas seguras do sistema fica em cache até girar a tela, abrir o teclado ou redimensionar (antes, 0,8 s).
- Nas listas longas (Biblioteca em grade e lista, Progresso por jogo, conquistas da ficha), os itens fora da tela não são calculados até chegarem perto (`content-visibility: auto`, com a altura lembrada para a barra de rolagem não pular).

| Tela | Antes | Depois | Vault 8× maior: antes | Vault 8× maior: depois |
|---|---|---|---|---|
| Início | 437 ms | 135 ms | 668 ms | 219 ms |
| Biblioteca | 340 ms | 99 ms | 518 ms | 185 ms |
| Conquistas | 587 ms | 148 ms | 487 ms | 113 ms |
| Ficha (Celeste) | 400 ms | 130 ms | 438 ms | 191 ms |

**Rolagem** (com processador 6× mais lento):

| | Antes | Depois |
|---|---|---|
| Tempo médio por quadro | 22,7 ms | 18,6 ms |
| 95% dos quadros dentro de | 33 ms | 16,8 ms (60 fps) |
| Quadros travados | 6–8 | 3 |

O cálculo dos dados (`model`) foi medido em cerca de 10 ms para 1.673 notas e ficou como estava.

**Cartão para compartilhar:** `SteamVaultShare.js`, descrito na documentação ([DOCUMENTACAO.md](DOCUMENTACAO.md)). Formatos Post e Story, para o jogo e para o perfil.
- As imagens são lidas como bytes (vault ou `requestUrl`), então o canvas nunca fica bloqueado para exportação.
- A saída é JPEG a 92%, com 100–400 KB contra 1–3 MB em PNG. Para copiar, a imagem é convertida para PNG na hora.
- O layout do perfil é calculado pelo espaço disponível: as capas encolhem no Post e o espaço é distribuído no Story.

### Carrossel de destaques e ação principal da ficha (versão 3.7.0)

**Carrossel:**
- Cada slide é o próprio card do topo da Home (`gameHero` com a variante "home"); não há componente visual novo.
- A trilha tem uma cópia do último e do primeiro card nas pontas. Ao terminar a transição numa cópia, salta sem animação para o card real — loop sem quebra.
- O movimento é feito por `transform`, com arraste por Pointer Events (mouse e toque). Com `touch-action: pan-y`, o toque vertical continua rolando a página, e o gesto de voltar pela borda tem prioridade.
- Autoplay de 5 s, com o tempo restante desenhado no ponto ativo. Pausa com o mouse em cima, com foco dentro, durante o arraste, durante a rolagem da página, fora da tela e com a aba oculta. Não roda com *Reduzir animações*.
- Só o primeiro card anima a entrada. A contagem animada dos números fica fora do carrossel (a cópia mostrava valores pela metade). Os cards fora da vista ficam `inert` e `aria-hidden`.
- Desempenho medido por comparação justa (mesmo tipo de renderização): a rolagem custa cerca de 1,4 ms a mais por quadro, com processador 6× mais lento, por haver mais cards montados.

**Destaques:** `featuredGames()` no Core usa os jogos com `featuredOnHome: true` (o campo já existia, mas aceitava um só). Sem nenhum marcado, faz uma seleção automática de até 5. O menu ⋯ da ficha ganhou *Destacar na Home* / *Remover dos destaques da Home*. O campo entrou no schema das notas novas.

**"Jogar" → "Registrar sessão":** o botão abria `steam://rungameid`, que não faz sentido dentro de um vault. A ação já existia para jogos sem Steam e é a que alimenta tempo, última sessão, calendário, metas e estatísticas. Agora vale para todos os jogos. Na Home, a ação principal do card é "Ver ficha".

### Travadas ao rolar as fichas (versão 3.7.1)

**Medição:** rolagem nas fichas, com processador 6× mais lento, comparando a 3.5.2, a 3.5.3, a 3.6.0 e a atual. A aba Conquistas piorou a partir da 3.6.0.

**Causas:**
1. O `content-visibility: auto` nas linhas de conquistas (3.6.0) fazia o navegador desenhar cada linha no instante em que ela entrava na tela, durante a rolagem.
2. O evento de rolagem, que dispara dezenas de vezes por segundo, fazia em cada disparo:
   - medir a posição das abas (`getComputedStyle` e `getBoundingClientRect`), o que força o recálculo do layout da página inteira;
   - ler `scrollLeft`, com o mesmo efeito;
   - consultar o Dataview (`dv.current()`) para montar a chave da posição salva.

**Correções:**
- As listas de conquistas voltam a ser desenhadas normalmente; a Biblioteca mantém o recurso, que lá foi medido como neutro.
- Nenhuma medição de layout acontece durante a rolagem:
  - "abas grudadas" é detectado por um marcador antes das abas, observado por `IntersectionObserver`;
  - "rolou um pouco" e "rolou bastante" usam dois marcadores no topo do conteúdo, também observados.
- A posição de rolagem é guardada e o deslocamento lateral acidental é corrigido só quando a rolagem para (140 ms depois). A chave da posição é calculada uma vez, ao abrir a tela.

**Resultado:** o JavaScript rodando durante a rolagem caiu de cerca de 430 ms para 63 ms no teste. As fichas voltaram ao nível da 3.5.2 ou melhor, com menos travadas na ficha com 78 conquistas. O que resta nas listas muito longas é o próprio desenho das linhas, que já existia antes.

### Travadas nas fichas, segunda rodada (versão 3.7.2)

**Medição nova:** toque de verdade (eventos de toque), contando quantas vezes a página é redesenhada durante a rolagem e quanta memória de GPU as camadas ocupam. O limite no celular costuma ser a GPU, que a desaceleração do processador não reproduz.
- Ficha: 44 redesenhos na 3.5.2 e cerca de 120 da 3.5.3 em diante.
- A bissecção (JS novo + CSS antigo, e o inverso) apontou o CSS da 3.5.3 — a barra de abas grudada.

**Causas e correções:**
1. **Pesquisa e Perfil deslizavam até a linha das abas animando `top`**, o que recalcula e redesenha a página a cada quadro, toda vez que as abas grudam ou desgrudam. Agora o deslize usa `transform`, feito pela GPU, com a mesma posição final.
2. **O efeito de vidro (`backdrop-filter`) desses botões** era refeito a cada quadro sobre o conteúdo em movimento. Com a página rolada, o desfoque sai e o fundo fica um pouco mais opaco (mesma aparência).
3. **Carrossel da Home:** os cards fora da vista também ocupavam a GPU (camadas de 2,3 para 7,1 megapixels). Agora, com o carrossel parado, só o card atual fica desenhado; os vizinhos aparecem no arraste e na transição, e a trilha só fica em camada própria enquanto se move. Resultado: 2,97 megapixels.

**Resultado:** na ficha, os redesenhos durante a rolagem caíram de 119 (3.7.0) para cerca de 60 (3.5.2: 44; o resto é a barra de abas se reorganizando uma vez quando gruda). Posições, visual e comportamento ficam iguais.

### Travadas no topo das fichas (versão 3.7.3)

**O que o vídeo do aparelho mostrou:** analisado quadro a quadro (60 fps), cada gesto no topo da ficha deixava a tela parada por vários quadros e depois ela pulava de uma vez para a posição final, às vezes centenas de pixels em um único quadro. A Home e a lista de conquistas, já rolada, ficavam lisas; o problema era sair do topo da ficha ou voltar para ele.

**Causa:** a correção 2 da 3.7.2. Ligar e desligar o desfoque de Pesquisa e Perfil ao sair do topo (4 px de rolagem) obriga o navegador a recriar as camadas da GPU e a animar a cor de fundo fora da GPU, bem no início de cada gesto. Medição com arrastos curtos no topo: 0 redesenhos na 3.5.2, 3.6.0 e 3.7.0 contra 80 na 3.7.2.

**Correção:** no celular, os botões flutuantes não usam mais desfoque em nenhuma posição. O fundo é fixo e semiopaco, e a única transição que sobra é a do toque. A barra de abas da ficha também ficou sem desfoque: o fundo dela já é 88% opaco e, quando gruda, 100%, então não há mais nada para ligar ou desligar durante a rolagem. Arrastos no topo voltaram a 0 redesenhos, e o cenário completo voltou ao mesmo número da 3.5.2.

### Rolagem que congela e pula: gestos do Obsidian (versão 3.7.4)

**Análise mais funda:** com a GPU emulada, a densidade de tela do POCO F7 e a contagem de quadros realmente descartados, a rolagem do Vault acontece no compositor e o JavaScript do Vault gasta cerca de 1 ms no início do gesto. Ou seja, o que sobrou da travada não vem do desenho da página.

**Causa:** o Obsidian para celular escuta os toques do documento inteiro para os gestos dele (puxar para baixo abre a paleta de comandos, que aparece no vídeo do aparelho, e deslizar abre as barras laterais). Esses ouvintes podem cancelar o toque, então o navegador segura a rolagem até o Obsidian decidir se o gesto é dele. Enquanto isso, a tela fica parada. Quando ele libera, o navegador aplica de uma vez todo o deslocamento acumulado do dedo, e a tela pula. É exatamente o padrão do vídeo.

**Correção:** dentro da camada do Vault, o arrasto vertical (rolagem) não chega mais aos ouvintes do Obsidian. Os primeiros 6 px ficam retidos até a direção ficar clara. O arrasto horizontal continua chegando, então as barras laterais do Obsidian seguem funcionando, e as faixas horizontais (abas, prateleiras) continuam com o gesto delas. Puxar para sincronizar, voltar pela borda e o carrossel não mudam.

**Teste:** um detector que imita o do Obsidian (não passivo, segura os primeiros movimentos) atrasava o início da rolagem em 11 quadros na 3.7.3. Na 3.7.4 a rolagem começa no 2º quadro e o detector não recebe nenhum movimento vertical.

**Efeito colateral intencional:** puxar para baixo dentro do Vault não abre mais a paleta de comandos do Obsidian por acidente.

### Parallax e ícones de conquistas (versão 3.7.5)

**A pista do aparelho:** a travada some depois de abrir a aba Conquistas, e as conquistas "recarregam" ao abrir a aba. No vídeo, ao tocar em Conquistas, a rolagem automática até as abas fica quase 1 s parada e depois pula, sem dedo nenhum na tela. Logo depois, os ícones aparecem em branco e carregam todos de uma vez. Ou seja, a travada não dependia do gesto, e sim do topo da ficha estar visível.

**Causas:**
1. **Parallax da arte do topo.** A animação ligada à rolagem é processada na thread principal a cada quadro em que a arte está visível (cerca de 140 recálculos por teste e o dobro de trabalho de preparo de cada quadro). Na Home ela não chegava a rodar, porque o carrossel corta a arte, e por isso a Home ficava lisa.
2. **Ícones da aba Conquistas** com carregamento preguiçoso dentro de um painel escondido: só começavam a baixar e decodificar ao abrir a aba, junto com a rolagem automática e a entrada do painel.

**Correções:**
- Em telas de toque, as artes dos topos (ficha, perfis, conquistas, Home) ficam sem parallax. O "assentar" da arte ao carregar continua. Com mouse, nada muda.
- Cerca de 2 s depois de a ficha abrir, quando a página está ociosa, os ícones da aba Conquistas carregam em segundo plano. Ao abrir a aba, já estão prontos.

**Medição (GPU emulada, densidade do POCO F7, quadros realmente descartados):**
- Rolagem rápida na Visão geral: 42 → 7 quadros descartados.
- Abrir Conquistas e rolar: cerca de 74 → 39.
- Ícones prontos antes de abrir a aba: 13 de 78 → 78 de 78.

### Revisão geral de desempenho e erros (versão 3.8.0)

**Varredura de erros:** 27 telas (incluindo coleção e conquista avulsa) em computador, celular e movimento reduzido. Nenhum erro de JavaScript, nenhum aviso interno, nenhum elemento cortado ou fora do lugar. As varreduras de espaçamento, de textos e dos 8 editores também passaram. Os dois apontamentos da varredura de textos (prateleiras de borda a borda) são propositais: a página não rola para o lado.

**Desempenho, medido tela a tela** (GPU emulada, densidade do POCO F7, quadros realmente descartados, animações que nunca param, trabalho por quadro):
1. **Formatação de números:** `toLocaleString` criava um formatador novo a cada chamada, e cada tela faz centenas delas (horas, contagens, porcentagens, preços). Agora há um formatador reaproveitado por formato, cerca de 60 vezes mais rápido (5.000 chamadas: 165 ms → 3 ms).
2. **Contagem animada dos números:** no toque, número que entra na tela no meio de uma rolagem aparece direto no valor final, e o mesmo vale para o anel de progresso. Os blocos continuam entrando suavemente. O que já está na tela ao abrir conta como antes. Em Estatísticas, as alterações de texto durante a rolagem caíram de 17 para 1, e os redesenhos de cerca de 106 para 83. Na tela Steam, de 45 para 2.
3. **Carrossel da Home:** a barrinha do tempo congela enquanto a página rola (sem animação rodando no meio da rolagem) e continua de onde parou. Reiniciar a barrinha não força mais um cálculo de layout a cada troca (agora alterna o nome da animação).
4. **Testado e descartado:** tirar a leve ampliação das capas ao carregarem não trouxe ganho mensurável, então o visual ficou como está.

**Bug corrigido:** no computador, o parallax dos cards do carrossel da Home nunca funcionava. O carrossel cortava o conteúdo com `overflow: hidden`, que o navegador trata como área de rolagem própria, e a animação ficava presa a ela. Agora é `overflow: clip`, que corta sem criar área de rolagem.

### Prévias do editor "Capa e fundo" (versão 3.8.1)

**Problema:** todas as miniaturas eram a mesma caixinha vertical com um ícone, sem relação com o que aparece de verdade. A arte larga do fundo e a horizontal do destaque saíam recortadas em pé, e um campo vazio mostrava só o ícone, mesmo quando a ficha usava outra imagem no lugar ou o cartão tipográfico com o nome.

**Agora cada miniatura imita o lugar onde a imagem aparece:**
- **Capa do card e capa da ficha:** verticais, com o mesmo canto e sombra das capas. Sem imagem, mostram o cartão tipográfico (nome e plataforma) que as telas usam.
- **Fundo da ficha:** na proporção do topo da ficha medida na tela (alto no celular, largo no computador), acompanhando o enquadramento ao vivo.
- **Imagem de destaque:** na proporção do card de destaque da Home neste aparelho.
- **Campo vazio:** a miniatura mostra a imagem que o Vault usa no lugar, pela mesma ordem de reserva das telas, com uma etiqueta: "Usa a capa do card", "Usa o fundo da ficha", "Usa a imagem de destaque", "Capa desfocada" (como o topo faz quando só há capa), "Automática" ou "Sem arte".

**Bug corrigido:** a prévia do enquadramento tinha camada própria e passava por cima do rodapé fixo (Cancelar/Salvar) ao rolar o editor. O rodapé agora fica sempre por cima.

### Prévias do editor no celular (versão 3.8.2)

**Problema:** no celular, a arte do topo não ocupa o bloco todo. Ela fica numa faixa larga no alto (cerca de 1,72:1, mais a barra de status), com a capa e o título abaixo, sobre o fundo escuro. A 3.8.1 media o bloco inteiro do topo, alto, e por isso as miniaturas de fundo e destaque saíam em pé. Já a prévia do enquadramento procurava a peça da interface antiga, não a achava e caía num formato largo padrão que não batia com nada. Pelo mesmo motivo, arrastar o enquadramento não mexia na ficha atrás do editor.

**Correção:**
- **Proporção:** fundo, destaque e prévia do enquadramento usam a proporção da faixa da arte, medida na ficha (no celular, cerca de 1,72:1; no computador, 2:1 na ficha e 1,78:1 no card da Home).
- **Composição:** a prévia do enquadramento copia a ficha real, com capa e título nas mesmas posições relativas e em escala (o que fica fora da faixa na ficha fica fora da prévia) e o mesmo escurecimento por cima da arte.
- **Ao vivo:** arrastar o enquadramento atualiza também o topo da ficha atrás do editor.
- **Jogo sem arte:** a prévia continua escondida, com a mensagem "Escolha uma imagem acima".
- **Tamanho:** no celular, as miniaturas largas ficam com no máximo 280 px.

Teste: na largura do celular, a proporção da prévia é igual à da faixa real (1,724 nas duas).

### Mídia e DLC (versão 3.8.3)

**"Concluir DLC" não fazia nada:**
- **Aba DLC da ficha:** o quadrado ao lado de cada DLC era só desenho. Agora é um botão que conclui ou desmarca na hora, grava na nota e atualiza o "x de y concluídas".
- **Janela "DLC e expansões":** o botão de concluir não tinha estilo e uma DLC concluída não mudava de aparência, então o toque parecia não fazer nada. Além disso, depois do primeiro toque o botão ficava desativado para sempre. Agora o marcador fica verde com ✓ e o nome riscado, alternando a cada toque.
- **Adicionar e remover:** a DLC nova aparece na lista na hora; antes aparecia só "Adicionada!" e a lista não mudava. Remover não desloca mais as outras, e duas remoções seguidas apagavam a DLC errada.
- **Nome:** DLC antiga gravada só como texto aparecia como "DLC"; agora mostra o nome dela.

**Trilha sonora:** a capa embutida no arquivo de música entrava na linha da faixa sem tamanho e ocupava a linha inteira, espremendo o nome, a estrela e o lápis. Agora é uma miniatura de 44 px, com o nome e o artista legíveis, a estrela dourada ao lado do nome e o lápis alinhado à direita. No formulário da faixa, "Remover música" fica separado de Cancelar e Salvar.

**Screenshots:**
- **Prévia:** tem o formato de uma screenshot (16:9).
- **Lista viva:** a screenshot adicionada aparece na hora na janela.
- **Índices certos:** favoritar e remover agem sempre sobre a imagem certa, e a tela cheia inclui as imagens recém-adicionadas.

Teste no simulador: toques seguidos, adicionar e remover em sequência conferidos no que fica gravado na nota.

### Hubs de plataformas, gêneros e franquias (versão 3.9.0)

Cada hub ganhou um propósito e uma identidade própria. Cada plataforma, gênero e franquia tem cor e ícone, com padrões automáticos que podem ser trocados em "Editar identidade".

**🎮 Plataformas: o console**
- **Hub:** agrupado por fabricante (PC, Sony, Nintendo, Microsoft, Sega, Mobile…). Cada card leva a cor da marca, o ícone do aparelho (console, portátil, celular), ano e geração, as capas e o progresso. No topo, um resumo (plataformas, fabricantes, horas, a mais usada); as plataformas sem jogos ficam recolhidas.
- **Página:** topo na cor da marca, com o ícone do aparelho ao fundo; estante de capas (Jogando primeiro), barra de status, destaques (mais jogado, primeiro e último adicionado, conquistas) e os gêneros mais jogados naquela plataforma.
- **Padrões conhecidos:** mais de 40 plataformas já vêm com fabricante, cor, ícone, ano e geração.

**🧬 Gêneros: o seu gosto**
- **Hub:** "Seu DNA gamer", com o gênero favorito e a afinidade de 0 a 100 por gênero (55% horas, 25% nota média, 20% jogos zerados). Cada gênero tem cor, ícone, uma frase e textura de fundo.
- **Página:** melhores do gênero (pela nota e pelo tempo de jogo), nota média, tempo médio para zerar, "Jogar agora neste gênero" (do backlog e do que ficou pausado), subgêneros, gêneros que aparecem juntos, status e todos os jogos.

**🎬 Franquias: a saga**
- **Notas próprias:** franquias passam a ter nota em `Franchises/`, criada na primeira vez que a página é aberta, como já acontecia com plataformas e gêneros. O nome da franquia no topo da ficha leva à página dela.
- **Hub:** cards cinematográficos com a arte do jogo mais recente, leque de capas, período ("2005–2007") e progresso da saga.
- **Página:** arte da saga no topo, leque de capas e barra de progresso. "Próximo da saga" mostra o jogo em andamento ou o próximo na ordem; quando tudo foi zerado, aparece "Saga concluída". A linha do tempo alterna entre **História** (campo "Ordem na franquia") e **Lançamento**. Há ainda "Falta jogar" e as plataformas da saga.

**Comum aos três**
- **Navegação:** anterior / próximo entre itens; com só dois itens, aparece um botão só.
- **Busca e ordenação:** nos hubs, quando há mais de 3 itens (por jogos, horas, progresso, afinidade ou nome).
- **Editar identidade:** cor (paleta ou cor livre), ícone, descrição ou frase e arte do topo. Nas plataformas, também fabricante, lançamento e geração. Tudo fica gravado na nota, nos campos `accent`, `icon`, `description`, `cover`, `maker`, `year` e `generation`; campo vazio volta ao padrão automático.
- **Ícones novos:** controle, portátil, celular, fantasma, caveira, espada, bússola, montanha, raio, carro, mira, lâmpada, escudo, coroa, folha, mapa e filme.

Teste no simulador (celular e computador): editar a identidade grava na nota e muda a cor da página e do hub na hora; a busca e a ordenação filtram e reordenam os cards; o link da franquia na ficha abre a página dela.


### Coleções completas (versão 3.10.0)

Coleções viraram playlists com identidade própria: cor, ícone, tipo e capa.

**Hub**
- **Destaque:** a coleção fixada aparece em card grande no topo. Sem nenhuma fixada, aparece a atualizada mais recentemente.
- **Cards com identidade:** cada card mostra a cor e o ícone da coleção, um mosaico de capas (leque com 1–3 jogos, grade com 4 ou mais), jogos, horas, progresso, data da última atualização e os títulos planejados.
- **Tipos:** Meta, Maratona, Favoritos e Livre. Quando o campo não existe, o tipo é deduzido do nome.
- **Coleções automáticas:** cada uma tem cor e ícone próprios. Agora abrem uma página com botão de voltar, em vez de uma janela.
- **Busca e ordenação:** aparecem quando há mais de 3 coleções.

**Página da coleção**
- **Topo:** mosaico de capas sobre a arte desfocada, tipo, figuras (jogos, horas, zerados, conquistas) e ações (adicionar jogos, editar identidade, compartilhar, nome e dados). No celular, o botão principal ocupa a linha inteira.
- **Meta e Maratona:** barra de progresso até 100% e "Próximo da lista".
- **Visualização:** grade ou lista. A escolha fica lembrada.
- **Ordenação:** ordem da coleção, nota, horas, status ou nome.
- **Lista com ordem manual:** arraste pela alça ☰ para reordenar. A nova ordem é gravada no campo `games` da nota, e os links quebrados são preservados. O ✕ tira o jogo da coleção, com aviso.
- **Complementos:** "Ainda fora do vault" (com "Criar ficha"), resumo por status, plataformas e gêneros, e anterior/próxima coleção.

**Ações**
- **Editar identidade:** cor, ícone, tipo, "Fixar no destaque", descrição e arte do topo.
- **Cartão para compartilhar:** fundo desfocado, tipo, título, descrição, 4 números e a grade de capas (os jogos zerados levam um ponto verde), em Post ou Story.

Teste no simulador (celular, computador e tema claro): arrastar e remover gravam a nota na ordem certa; mudar o tipo para Meta faz a barra aparecer na hora; a página automática volta ao hub; o cartão é gerado sem sobreposições. Varredura geral: 81 telas ok.


### Editor de identidade da coleção (versão 3.10.1)

- **Prévia sincronizada:** ao trocar o tipo, a prévia mostra na hora o novo tipo e o número de jogos ("Meta · 3 jogos"). Antes, repetia o nome da coleção.
- **Ícone automático:** o botão "Auto" passa a mostrar o ícone do tipo escolhido. Antes, trocar a cor depois de mudar o tipo fazia a prévia voltar ao ícone do tipo antigo.


### Biblioteca completa (versão 3.11.0)

**Topo vivo**
- **Resumo:** jogos, horas, zerados e conquistas, mais uma barra colorida por status. Tocar num segmento ou na legenda filtra a lista.
- **Continuar jogando:** faixa com a arte dos jogos marcados como Jogando, a última sessão, horas, conquistas e o botão "Abrir".

**Filtros mais leves**
- **Uma linha só:** busca + "Filtros" (com o número de filtros ativos) + "Exibição" + "Selecionar". No celular, os botões viram ícones.
- **Painel de filtros:** status, plataforma e gênero (escolha vários de cada), favoritos, nota mínima, progresso de conquistas e origem/sincronização. Aplica na hora e mostra "Ver N jogos".
- **Chips dos filtros ativos:** cada um com ✕, mais "Limpar tudo" e a contagem de jogos.
- **Atalhos roláveis:** status com cor e contagem, Favoritos e os atalhos inteligentes (Nunca jogados, Quase 100%, Parados há 3 meses, Sem capa, Sem nota, Adicionados este mês). Os atalhos são exclusivos entre si; as combinações ficam no painel.
- **Memória:** filtros, ordem, grupos e visualização ficam lembrados por tela (Biblioteca e Biblioteca Steam separadas), inclusive depois de salvar algo.

**Formas de ver**
- **Exibição:** ordenar (nome, jogado recentemente, adicionado, horas, conquistas, nota, lançamento), agrupar (status, plataforma, gênero, franquia, ano, letra A–Z) e visualizar (grade, compacta, prateleira, lista).
- **Prateleira:** capas grandes numa estante, com reflexo.
- **Lista rica:** capa, plataforma com ícone, ano, status, horas, barra de conquistas, nota em estrelas e última vez jogado. No celular, ela se reorganiza em duas linhas.
- **Índice A–Z:** aparece na lateral com 12 jogos ou mais em ordem de nome. Dá para tocar numa letra ou arrastar o dedo pelo índice.

**Cards**
- **Informações novas:** selo da plataforma (cor e ícone da identidade dela), selo dourado "100%", estrelas da nota (no celular, "★ 4,5") e horas. O selo da plataforma some quando o card mostra o preço da lista de desejos.

**Menu rápido e lote**
- **Toque longo (celular) ou botão direito (computador):** mudar o status, favoritar, compartilhar, abrir a ficha e marcar ou desmarcar coleções, sem abrir a ficha. O toque que abre o menu não abre o jogo.
- **Modo seleção:** marque vários jogos (ou "Todos" os visíveis) e aplique status, favorito, coleção ou plataforma de uma vez. Ao mudar para Jogando, a data de início é preenchida se estiver vazia; ao mudar para Zerado, a data de conclusão.

Teste no simulador (celular, computador e tema claro, com 20 jogos): filtros, chips, atalhos, grupos, visualizações, A–Z, memória após re-render, menu rápido (status e coleção gravados na nota) e lote (favoritos gravados). Varredura geral: 81 telas ok; editores ok.


### Grade sem selo de plataforma (versão 3.11.1)

- **Capas limpas na Grade:** o selo do console saiu das capas na visualização Grade, como já acontecia na Compacta e na Prateleira. A plataforma continua na Lista, nos filtros e nos grupos.


### Leque de capas sem moldura e tela de carregamento (versão 3.12.0)

- **Leque sem cartão atrás:** nas coleções (topo da página e cards do hub), o leque de 1 a 3 capas aparece sem o quadro desfocado atrás. As capas, a inclinação e as sombras continuam.
- **Tela de carregamento:** ao abrir o Obsidian, aparecia o erro "ReferenceError: customJS is not defined", porque o Dataview roda antes do CustomJS terminar. Agora, no lugar do erro, aparece a marca do Steam Vault com uma barra animada.
  - **Antes dos plugins:** o snippet esconde o bloco de código e desenha a tela.
  - **Dataview pronto, CustomJS ainda não:** o `Assets/steamvault-boot.js` mostra a mesma tela, na mesma posição, com animação. Quando o CustomJS fica pronto, monta a página e a tela some com um esmaecimento.
  - **Se o CustomJS não carregar em 40 s:** a tela explica o que conferir.
  - Respeita "reduzir movimento" e o tema claro.
- **Notas atualizadas:** as 248 notas do vault e o gerador de notas passaram a usar `await dv.view("Assets/steamvault-boot", { page: "…" })`. Notas criadas antes desta versão são corrigidas sozinhas, em segundo plano, uma vez por versão; só essa linha muda.

Teste no simulador (Obsidian imitado, celular, tema escuro e claro): as fases antes dos plugins e com o Dataview pronto coincidem na mesma geometria; a página monta e a tela some; o aviso aparece quando o CustomJS não carrega. Varredura geral: 81 telas ok.


### Tela de carregamento em tela cheia (versão 3.12.1)

- **Sem barras do Obsidian:** a tela de carregamento cobre a tela inteira, por cima da barra superior (caminho da nota e botões) e da barra inferior de navegação do Obsidian. O mesmo vale para a fase antes dos plugins (pelo snippet).
- **"Módulos ausentes" corrigido:** o CustomJS carrega um arquivo por vez e o `SteamVault.js` vem primeiro, então o boot achava que o Steam Vault estava pronto quando só ele tinha carregado. Agora o boot espera todos os módulos (ou só os obrigatórios, se em 2 s faltar apenas algum opcional). O `render` também espera até 40 s antes de mostrar o aviso.
- **Nunca prende o Obsidian:** a tela do snippet não captura toques e some sozinha depois de 20 s. Se o CustomJS não carregar, o aviso fica só dentro da nota. Várias notas abrindo juntas dividem uma tela só.

Teste no simulador: a tela cobre o topo e a barra inferior; com os módulos chegando aos poucos, continua carregando até todos chegarem; o aviso de falha fica dentro da nota. Varredura geral: 81 telas ok.


### Topo da ficha sem o selo de sincronização (versão 3.12.2)

- **Só a origem no topo:** o topo da ficha do jogo mostra apenas a origem das conquistas (ex.: "Steam"); o selo "Automática" saiu. A sincronização continua visível e editável na aba Conquistas, junto do botão "Alterar".


### Visão geral da ficha completa (versão 3.13.0)

A aba Visão geral ganhou doze recursos.

**Sua história com o jogo**
- **Continuar jogando:** aparece quando o status é Jogando. Mostra a última sessão (nota, horas, humor, % da história) e o botão para registrar a próxima.
- **Linha do tempo pessoal:** entrou no vault, começou, sessões mais longas, primeira conquista, cada zerada, 100% e prêmio do RA, mais resumos ("Zerado em 52 dias", "100% em 4 meses", "Esperou 5 meses no backlog").
- **Ritmo de jogo:** mapa de calor dos últimos 6 meses e números (sessões, média por sessão, maior sessão, dias seguidos, dias sem jogar).
- **Minha análise:** opinião, prós, contras e selo Recomendo / Não recomendo, com editor próprio. No cartão de compartilhar, entra num painel de vidro acima da capa.

**O que falta**
- **Próximos objetivos:** suas metas primeiro, depois as conquistas bloqueadas que mais jogadores já têm.
- **Previsão:** "faltam ~7 h para zerar" (com o tempo estimado) e conquistas que faltam, com o prazo no seu ritmo (sessões e desbloqueios recentes).

**Contexto**
- **No seu vault:** selo do tier (abre a Tier List), posição em horas e nota, o quanto foi rápido para zerar e a comparação com a média do gênero e da plataforma.
- **Ficha técnica clicável:** gênero, plataforma e franquia viram chips com a cor e o ícone da identidade e abrem as páginas. Desenvolvedora e publicadora abrem a Biblioteca já filtrada.

**Mídia e memória**
- **Destaques de mídia:** screenshots favoritas (ou as últimas) com tela cheia e as trilhas favoritas.
- **Nota fixada:** escolha uma nota para ficar no topo. A aba Notas mostra o alfinete, e editar a nota não a desafixa.
- **Zeradas:** cada zerada com data, duração, dificuldade e observação, além do botão para registrar outra.

O painel lateral deixou de ser fixo na rolagem, porque ficou mais longo. Tudo aparece só quando há dados; a análise e a nota fixada mostram um convite discreto.

Teste no simulador (celular e computador): todas as seções aparecem com dados de exemplo; salvar a análise e fixar outra nota gravam na nota; a desenvolvedora abre a Biblioteca filtrada; o cartão de compartilhar mostra a análise legível. Varredura geral: 81 telas ok; editores ok.


### Abas da ficha com a mesma linguagem (versão 3.14.0)

Mídia, DLC, Sessões e Notas passaram a seguir o mesmo desenho do topo da aba Conquistas.

- **Cabeçalho de aba:** ícone ou anel de progresso na cor da aba, título com o resumo, números em pílulas e as ações principais. No celular, as ações ficam lado a lado, embaixo.
- **Mídia (violeta):** contagem de screenshots, favoritas, artes e faixas. As favoritas ganham um coração, e as artes trazem o nome sobre a imagem, com o atalho "Trocar artes".
- **DLC (verde):** anel com o percentual concluído, que atualiza na hora ao marcar um item. Cada item mostra o tipo, a data de conclusão e o estado (Concluída ou Pendente).
- **Sessões (azul):** total, média, maior sessão e zeradas. O diário virou uma sequência de cartões ligados por uma linha, com horas, humor e uma barra de "% da história". As zeradas mostram quanto tempo levaram.
- **Notas (âmbar):** contagem, categorias e nota fixada. Cada categoria tem uma cor própria (na borda e na etiqueta), e a nota fixada vem primeiro.
- **Conquistas:** no celular, "Sincronizar" e "Adicionar conquista" ficam lado a lado.
- **Espaçamento:** o mesmo entre as seções de todas as abas; estados vazios aparecem abaixo do cabeçalho, com o botão de adicionar nele.

Teste no simulador (celular e computador): todas as abas com dados de exemplo e vazias; marcar uma DLC atualiza o título, os números e o anel na hora. Varredura geral: 81 telas ok; editores, mídia e espaçamentos ok.


### Home completa (versão 3.15.0)

A Home foi reorganizada em blocos com propósito próprio.

**Abertura pessoal**
- **Saudação:** muda com a hora ("Bom dia", "Boa tarde", "Boa noite") e resume o momento: horas jogadas na semana e dias seguidos de atividade (hoje ainda sem atividade não quebra a sequência).
- **Atalhos:** Adicionar jogo, Registrar sessão (do jogo jogado por último) e os links para Coleções e Estatísticas.
- **Sua semana:** barras dos 7 dias (horas de sessões, ou atividades quando não há sessões), com o dia de hoje destacado, comparação com a semana anterior, sessões e conquistas da semana.

**Decidir o que jogar**
- **O que jogar agora:** três sugestões na própria Home, com o motivo de cada uma. Elas ficam as mesmas durante o dia e mudam quando a biblioteca muda; o sorteio completo continua em "Sortear com filtros".
- **Continuar jogando:** o cartão mostra a nota da última sessão.

**Painel ao lado da atividade (no celular, em sequência)**
- **Estado da biblioteca:** números principais e a barra por status, que abre a Biblioteca já filtrada pelo status tocado.
- **Metas e marcos:** o próximo Marco do Vault (com a cor do nível e a barra), as metas e "Perto dos 100%" num bloco só.
- **Destaques do mês:** jogo mais jogado, conquista mais rara desbloqueada e jogos zerados no mês.

**Memória**
- **Neste dia:** o que aconteceu nesta data em meses e anos anteriores, com a arte do jogo.
- **Coleção em destaque:** a coleção fixada (ou a atualizada por último), no card grande das Coleções.

**Organização**
- **Atividade mais enxuta:** os 6 eventos mais recentes, agrupados por dia; "Mostrar mais" abre o restante ali mesmo, e "Ver tudo" leva à página de atividade.
- **Sem repetição:** um jogo que já aparece no destaque, em Continuar jogando ou em Favoritos não se repete em Adicionados recentemente.
- **Personalizar Home:** no fim da página, escolha quais seções aparecem, em que ordem, e quais cartões ficam no painel lateral. Fica salvo neste dispositivo, com "Restaurar padrão".

Teste no simulador (celular, computador e tema claro): saudação, semana, sugestões, painel, Neste dia e coleção com dados de exemplo; "Mostrar mais" abre a atividade; personalizar reordena e esconde seções; a barra de status abre a Biblioteca filtrada. Varredura geral: 81 telas ok; editores, carrossel e espaçamentos ok.


### Ícones de consoles e temáticos (versão 3.16.0)

- **63 ícones novos**, no mesmo traço dos demais. São silhuetas genéricas, sem logotipos de marca.
  - **21 consoles de mesa:** Atari, NES/Famicom, Master System, Super Nintendo, Mega Drive, PlayStation 1 a 5, Saturn, Nintendo 64, Dreamcast, GameCube, Xbox, Xbox 360, Xbox One, Xbox Series, Wii, Wii U e Switch.
  - **10 portáteis:** Game Boy, Game Gear, Game Boy Advance, DS, 3DS, PSP, PS Vita, Switch Lite, Steam Deck e o portátil genérico.
  - **PC e outros:** gabinete, notebook, tablet, fliperama, realidade virtual e TV.
  - **27 temáticos:** foguete, planeta, disco voador, robô, castelo, cidade, espadas, arco, varinha, poção, chave, bomba, martelo, cogumelo, invasor 8-bit, bola, peão, fones, câmera, pata, âncora, pena, árvore, sol, neve, ondas e coração acelerado.
- **Seletor em grupos:** em Editar identidade, os ícones aparecem em grupos com título.
  - **Plataforma:** Consoles, Portáteis, PC/celular/outros.
  - **Gênero e franquia:** Temas, e depois Consoles.
  - **Coleção:** Coleção, Temas, Consoles.
  - **Nome ao passar o dedo ou o mouse:** cada ícone mostra o nome (ex.: "PlayStation 2").
- **Padrões automáticos:** mais de 50 plataformas conhecidas passam a usar o ícone do próprio console (SNES, Switch, PS2, Game Boy…). Isso aparece nos hubs, nas páginas, nos selos e na ficha técnica. Quem já escolheu um ícone na nota mantém a escolha.

Teste no simulador: folha com todos os ícones novos revisada; o seletor mostra os grupos; varredura geral, espaçamentos e editores ok.


### Estatísticas completas (versão 3.17.0)

A aba foi reorganizada em cinco abas e passou a respeitar um período.

- **Período:** Tudo, Este ano, 12 meses ou 30 dias, lembrado neste dispositivo. "Tudo" usa o tempo total de cada jogo (inclui a Steam). Os outros períodos contam só o que tem data: horas e sessões registradas, zeradas, conquistas desbloqueadas e jogos adicionados. Cada número mostra a variação em relação ao período anterior de mesmo tamanho.
- **Visão geral:** números do período; prêmios do ano numa faixa compacta; destaques; funil da biblioteca (na biblioteca → começados → zerados → 100%, com a % entre etapas); status; backlog no seu ritmo (tempo estimado ou mediana dos zerados ÷ horas semanais dos últimos 12 meses); zerados por ano com as capas; linha do tempo "Do início ao fim"; metas.
- **Tempo:** hábitos (dias ativos, maior sequência, sessão média e maior, dia favorito); mapa de atividade refeito, com meses, legenda e toque no dia para ver o que aconteceu (antes aparecia em branco no celular); horas por mês (ou eventos, sem sessões); dias da semana; período do dia pela hora das conquistas.
- **Gosto:** roscas de gêneros e plataformas por horas (com as cores de identidade de cada um, até 6 fatias + Outros, toque para abrir a página); nota média por gênero e por plataforma; gráfico nota × horas; distribuição das notas.
- **Conquistas:** desbloqueadas no período, % do total, lendárias, jogos com 100%; raridade das conquistas (comuns a lendárias); as 5 mais raras; conquistas por mês e por origem; resumo por origem e sincronização.
- **Dinheiro:** total pago, média por jogo, custo por hora e economia (preço normal menos o pago); gastos por ano e por plataforma; melhor e pior custo por hora.
- **Compartilhar resumo:** cartão em PNG (Post ou Story) com o período, horas, sessões ou jogos, zerados, conquistas e os mais jogados.

Teste no simulador (celular, computador e tema claro): as cinco abas com os dados do novo Vault; troca de período mantém a aba; toque no mapa abre o dia; o cartão é gerado. Varredura geral: 81 telas ok; editores e espaçamentos ok.

### Integrações, RetroAchievements, Subgêneros e revisão (versão 3.18.0)

- **Integrações em uma tela só:** nova `Dashboard/Integrações`. Antes, o perfil Steam, o RetroAchievements, as outras plataformas, as lojas e a segurança ficavam espalhados nas Configurações.
  - Resumo no topo: contas, fichas sincronizadas, conquistas trazidas, último sync e a barra de origem das conquistas, com legenda.
  - Cards com a cor de cada plataforma: Steam, RetroAchievements, Xbox e GOG (automáticas); Epic Games e PlayStation (manuais).
  - Google Play Games e Nintendo aparecem como "sem integração disponível", com o motivo.
  - As Configurações ficaram com um resumo e o atalho. O menu da conta ganhou "Todas as integrações".
  - Ícones de console no menu *Integrações*, no topo dos perfis e nos cards.
- **Botões repetidos:** Xbox e GOG desconectados mostravam três botões "Conectar" na mesma tela (topo, quadro e painel). Agora só o do topo.
- **RetroAchievements:**
  - Sem conta, as três abas repetiam o mesmo aviso vazio. Agora o Perfil RA tem um painel de conexão com 3 passos e os jogos RA do vault (Bully, God of War).
  - Jogos RA e Conquistas RA mostram progresso, pontos, hardcore, mais raras e conquistas por console calculados das fichas, com um aviso compacto para conectar.
  - O topo mostra os números do vault em vez de ficar só com "Jogos no vault".
- **Subgêneros:**
  - Hub e página própria para cada subgênero (`Subgenres/`, `type: subgenre`), no mesmo modelo dos gêneros.
  - Chips clicáveis na ficha, no hub e na página de cada gênero.
  - A busca do topo agora encontra subgêneros e franquias.
  - Identidade própria, editável em *Editar identidade*.
- **Organização dos dados:**
  - Parkour, Plataforma 2D, Precision Platformers, Survival Horror, Puzzle e Exploração estavam em `Genres/` como gênero, mas só eram usados como subgênero. Foram para `Subgenres/`.
  - A página de um gênero agora lista os jogos desse gênero. Antes misturava os que só o tinham como subgênero.
  - "Criar páginas que faltam" nos Gêneros não cria mais páginas de gênero para subgêneros. Nos Subgêneros, o mesmo botão cria as páginas de subgênero.
  - Novos padrões de identidade: Action-Adventure e Sandbox.
- **Ajustes:**
  - Editar detalhes sugere também os gêneros e subgêneros que já têm página.
  - O painel de sync da Steam ganhou "Limpar cache", que antes ficava só nas Configurações.

Teste no simulador (celular e computador): Integrações, Subgêneros, página de subgênero, Gêneros, ficha (chips), Configurações, as três abas RA e Xbox desconectados. Varredura geral, espaçamentos e editores ok.

### Ícones de plataformas e consoles (versão 3.18.1)

- **Problema:** vários ícones de console eram caixas genéricas. O do PS5, no topo do Perfil PlayStation, não parecia um console. Integrações e perfis usavam ícones emprestados (controle de joystick, cofre, gabinete de PC).
- **Família PlayStation e Xbox redesenhada:** cada console aparece com o seu controle ao lado.
  - PS1: tampa redonda.
  - PS2: torre em pé.
  - PS3: topo curvo.
  - PS4: corpo inclinado com o sulco.
  - PS5: painel curvo.
  - Xbox: "joia" em X.
  - Xbox 360: laterais côncavas.
  - Xbox One: placa.
  - Xbox Series: torre com a ventilação.
  - O controle Sony tem direcional; o do Xbox tem o analógico em cima.
- **Marcas das plataformas** (8 silhuetas próprias, sem copiar logotipos):
  - PlayStation: triângulo, círculo, xis e quadrado.
  - Xbox: esfera com X.
  - Nintendo: par de Joy-Con.
  - Steam: pistão.
  - GOG: letras "gog".
  - Epic Games: brasão com E.
  - RetroAchievements: controle retrô.
  - Google Play Games: botão de play.
- **Onde as marcas aparecem:**
  - Menu Integrações e menu da conta.
  - Topo dos perfis Xbox, GOG, Epic e PlayStation.
  - Cards e resumo da tela Integrações.
  - Abas e "Por origem" do hub de Conquistas.
  - Selo de origem das conquistas na ficha e nos cards.
  - Telas e avisos do RetroAchievements.
  - Aba Google Play do hub.
  - Linhas de jogos dos perfis.
- **Origens do próprio vault:** Native usa medalha, Custom usa brilho, "Sem conquistas" usa X e "Não configurado" usa info.
- **Ficha do jogo:** a etiqueta da plataforma no topo usa o ícone do console (antes era sempre o monitor).
- **Novos padrões de plataforma:** "Steam", "GOG" e "Epic" ganham a marca e a cor próprias.
- **Editor de identidade:** novo grupo "Marcas e lojas". Quem já escolheu um ícone mantém a escolha e recebe o desenho novo.

### Perfis manuais de Nintendo e Google Play Games (versão 3.19.0)

- **Novos perfis:** `Dashboard/Nintendo` e `Dashboard/Google Play Games`, no mesmo modelo de Epic e PlayStation: sem rede, sem login, sem credencial nenhuma. Os dois ficam no menu *Integrações* e entre os *Perfis manuais* da tela Integrações.
- **Antes:** apareciam só como "sem integração disponível". Essa seção some quando não há plataforma nessa situação.
- **Nintendo:**
  - Origem de conquistas nova, `nintendo` (sincronização Manual ou Local). Aceita também "Nintendo Switch", "Switch" e "eShop" como grafias.
  - O perfil reúne os jogos de **qualquer console Nintendo** do vault (Switch, 3DS, GameCube, SNES…), não só os com essa origem.
  - Como o Switch não tem conquistas, o topo mostra jogos, horas, zerados e consoles. Há também a faixa "Por console", com os ícones de cada plataforma.
  - "Registrar objetivos" abre o editor manual. O perfil aceita um apelido ou o código de amigo (SW-1234-5678-9012), que não é verificado.
- **Google Play Games:**
  - Jogos com origem Google Play Games, com conquistas, progresso e XP (os pontos registrados).
  - O perfil aceita o nome de jogador, que não é verificado.
- **Importar jogos:** cria fichas com a origem da plataforma e sincronização Manual. Nintendo deixa escolher o console; Play Games, Android ou PC.
- **Por que não há leitura automática:** o motivo de cada plataforma fica explicado no perfil.
  - Nintendo: o Switch não tem conquistas; não há API pública; as ferramentas existentes usam o login interno do app Nintendo Switch Online.
  - Google Play Games: cada jogo só lê as próprias conquistas; o perfil não tem página pública; ler de fora exigiria o login da conta Google.

### Ícones no vault, ano a ano, desempenho, cor de destaque e acessibilidade (versão 3.20.0)

- **Ícones das conquistas salvos no vault:** em *Configurações › Conquistas* aparece quantos ícones já estão no vault e quantos ainda vêm da internet.
  - *Salvar ícones no vault* baixa os que faltam para `Assets/Achievements/<Jogo>/` e aponta cada nota para o arquivo.
  - Só aceita os servidores de imagem da Steam, do RetroAchievements, da Xbox e da GOG. Arquivos acima de 2 MB ou que não sejam imagem são recusados.
  - O link original (`steamIconUrl`, `raBadgeUrl`) continua na nota. As sincronizações nunca trocam um ícone local.
- **Estatísticas › Ano a ano:** aba nova com:
  - o ano atual até hoje comparado com o mesmo período do ano anterior;
  - os melhores anos;
  - gráficos por ano de horas em sessões, zerados, conquistas, jogos adicionados e gastos;
  - uma tabela-resumo com nota média dos zerados e o jogo destaque de cada ano.
  - Com um ano só, a aba avisa que a comparação começa no segundo ano.
- **Desempenho em bibliotecas grandes** (teste com 606 jogos e 4.500 conquistas):
  - *Biblioteca:* abre com os primeiros 60 cards, já no filtro e na ordem salvos. O resto entra em partes depois da primeira pintura, e a visualização Lista só é montada quando aberta. Abrir passou de ~2,3 s para ~0,2–0,5 s.
  - *Conquistas:* as listas longas mostram os primeiros 60 jogos e completam depois. Reabrir passou de ~0,7 s para ~0,05 s.
  - *Estatísticas:* só a aba aberta é montada; as outras, no primeiro toque.
  - Filtros, busca, índice A–Z e seleção em lote completam a lista na hora, quando usados.
- **Cor de destaque:** em *Configurações › Aparência*, 8 cores (azul, roxo, rosa, vermelho, laranja, dourado, verde, ciano), guardadas neste aparelho.
  - Valem para botões, abas, barras, links e destaques, nos dois temas e nos topos escuros.
  - As cores fixas de azul do visual passaram a seguir essa escolha.
  - Em verde, laranja, ciano e dourado, o texto dos botões fica escuro, para ter contraste.
- **Acessibilidade:**
  - Botão "Pular para o conteúdo" (primeiro item ao usar Tab).
  - Região principal identificada.
  - Gráficos de colunas com descrição em texto.
  - Ícones de conquista que são links agora têm nome.
  - Texto secundário mais legível: contraste de 3,9:1 para 5:1 no tema escuro e de 3,4:1 para 5:1 no claro.
  - A varredura automática não encontrou botões, links ou campos sem nome.

### Primeiros passos, lista de desejos, testes e versões no GitHub (versão 3.21.0)

- **Primeiros passos:** assistente de 5 passos para quem está começando.
  - Os passos são conectar uma conta, adicionar jogos, capas e artes, deixar com a sua cara (cor de destaque ou layout da Início) e criar uma meta do ano.
  - Cada passo se marca sozinho quando é feito, com o botão certo para fazê-lo.
  - Com o vault vazio, a Início inteira vira o assistente. Com jogos, ele aparece como cartão no topo da Início até tudo ficar pronto ou até ter 15 jogos.
  - *Dispensar* esconde neste aparelho. *Configurações › Aparência* traz de volta.
- **Lista de desejos própria:** tela nova `Dashboard/Lista de Desejos`, também no menu.
  - Resumo: total da lista hoje (com a economia), em promoção, no preço-alvo e no menor preço já visto.
  - Filtros e ordenação.
  - Cada jogo mostra preço atual, desconto, menor preço já visto com a data, a barra até o alvo e um gráfico pequeno do histórico.
  - *Alvo* abre uma janela com sugestões. *Comprei* muda para Backlog e grava preço e data.
  - Campo novo `priceHistory`: a verificação de preço passa a guardar um ponto por dia, até 90.
  - *Importar da Steam* lê a lista de desejos pública pelo endereço oficial da Steam (`IWishlistService/GetWishlist`). Não usa chave e só roda quando você toca no botão. Cria as fichas que faltam, com capa.
- **Testes automáticos no GitHub** (`.github/tests`, `.github/workflows/tests.yml`):
  - Verificações: sintaxe dos scripts, cópia do CSS em `_install/`, versão igual no código, no README e aqui, frontmatter de todas as notas, rotas das telas e nenhum segredo versionado.
  - Num Chromium sem interface, abre todas as telas do Dashboard, um jogo, uma plataforma, um gênero, um subgênero, uma franquia, uma coleção e uma conquista. Abre também todas as abas de Conquistas e Estatísticas e o vault vazio, no celular (410 × 887) e no computador.
  - Falha com erro de JavaScript, tela vazia ou rolagem lateral. As capturas de tela ficam guardadas por 7 dias em cada execução.
- **Versões no GitHub** (`.github/workflows/release.yml`): quando a `VERSION` muda, cria a tag `vX.Y.Z` e a página da versão. A página traz as novidades tiradas desta seção do histórico e o zip pronto para abrir no Obsidian.

### Correção da ficha de jogos da lista de desejos e perfil limpo (versão 3.21.1)

- **Ficha de jogo com status Lista de desejos:** abria com "Não foi possível montar esta tela — C is not defined". O painel de preço da Visão geral usava uma função do núcleo sem tê-la carregado. Corrigido.
- **Testes mais rigorosos:**
  - Os testes no GitHub agora abrem também a ficha de um jogo da lista de desejos, com preço e histórico, e a tela Lista de desejos com esse jogo. O teste novo reproduz o erro na versão anterior e passa nesta.
  - Verificação nova sem navegador: em cada método dos scripts, todo atalho do contexto usado (`C`, `U`, `V`, `S`…) precisa ter sido declarado. Pega esse tipo de erro mesmo nas partes que só aparecem com certos dados.
- **Perfil Steam removido do vault:** `Dashboard/Steam.md` volta sem perfil conectado (`steamProfile: {}`). Os jogos, as conquistas e as artes continuam.

### Nova tela de inicialização: Game Library (versão 3.21.2)

- **Nome:** a tela que aparece enquanto o Obsidian abre agora diz **Game Library**. O aviso de falha também: "A Game Library não carregou".
- **Ícone novo:** um controle branco sobre o bloco azul, no lugar do cofre. O mesmo desenho está no snippet, que cobre a tela antes dos plugins, e no `Assets/steamvault-boot.js`. Por isso a troca entre as duas telas não salta.
- **Animação:**
  - três capas de jogo saem de trás do ícone e abrem em leque, uma após a outra, e depois balançam devagar;
  - os botões do controle acendem em sequência;
  - um brilho suave respira atrás do ícone;
  - a barra de carregamento ganhou um degradê azul e lilás.
  - Na saída, o ícone cresce um pouco enquanto a tela some.
  - Com "reduzir movimento" ligado no aparelho, a tela fica parada e mostra o desenho completo.

### Game Library e desempenho (versão 3.22.0)

- **Novo nome em tudo:** o app passa a se chamar **Game Library** em todo lugar visível:
  - menu lateral, Configurações e primeiros passos;
  - cartões para compartilhar e retrospectiva;
  - avisos e textos das integrações;
  - Style Settings, README, documentação, modelos de issue e zip das versões (`Game_Library_X.Y.Z.zip`).
  - O ícone do controle substitui o cofre no menu lateral, nos primeiros passos e nos cartões.
  - **Continua igual por compatibilidade:** os nomes dos arquivos (`Scripts/SteamVault*.js`, `steamvault.css`), as classes CSS, a pasta `.steamvault/` e as preferências salvas. Vaults antigos seguem funcionando sem nenhuma troca, e as escolhas do Style Settings são mantidas.
- **Imagens do GitHub refeitas:** banner, galerias, telas e cartões, com o novo nome, sem perfil real e com o nome de exemplo "Jogador".
- **Desempenho** (teste com 606 jogos e 8.600 conquistas, celular simulado):
  - *Estatísticas › Visão geral:* de 359 ms para 43 ms, e de 6.269 para 892 elementos na tela.
    - "Do início ao fim" mostra as 12 zeradas mais recentes, com *Mostrar as mais antigas*.
    - "Zerados por ano" mostra até 18 capas por ano, com *Ver todos*.
    - O resto só é montado quando você toca.
  - *Biblioteca* e listas de *Conquistas:* cards e linhas fora da tela não são desenhados até chegarem perto (`content-visibility`). A rolagem no celular ficou cerca de 25% mais leve.
  - *Cor de destaque das capas:* calculada fora do caminho da primeira pintura.
  - *Menos recálculos:* editar uma nota que não é de jogo, conquista, coleção, categoria ou do Dashboard (um diário, por exemplo) não refaz mais o modelo da biblioteca.

### Erro passageiro ao abrir o Obsidian (versão 3.22.1)

- **O problema:** ao abrir o Obsidian no celular, aparecia por um instante "Dataview: custom view not found for 'Assets/steamvault-boot.js'" no lugar da tela de carregamento. Logo depois a Início abria normalmente.
- **A causa:** o Dataview rodava o bloco da nota antes de o Obsidian terminar de listar os arquivos do vault, e ainda não encontrava o `Assets/steamvault-boot.js`.
- **A correção:**
  - A linha de cada nota agora espera o arquivo do boot aparecer (até 10 s) antes de chamá-lo. As 470 notas do repositório já vêm com a linha nova.
  - Notas criadas antes desta versão são atualizadas sozinhas, em segundo plano, na primeira abertura (a mesma migração que já trocava as chamadas antigas do `customJS`). Fichas novas já nascem com a linha nova.
  - A tela de carregamento do snippet também cobre esse intervalo (o bloco do Dataview ainda vazio) e o aviso de erro do Dataview, se aparecer. A tela fica contínua até a página estar pronta.
- **Teste:** a sequência de abertura do celular foi simulada no navegador com as duas linhas. Com a nova, a tela de carregamento fica na tela o tempo todo e a página aparece sem erro. Com a antiga, o erro se repete, como no vídeo.

### Biblioteca sob demanda, tamanho do texto, preto puro, backup e preferências entre aparelhos (versão 3.23.0)

- **Biblioteca sob demanda:**
  - Antes, os 606 cards (cerca de 42 mil elementos) entravam todos nos primeiros segundos. Agora entram 60 e mais 60 cada vez que a rolagem chega a 1.500 px do fim da grade (abertura com 3,9 mil elementos).
  - Contadores e índice A–Z incluem os que ainda não entraram.
  - Busca, filtros, ordenação, pular para uma letra, a Lista e "Selecionar vários › Todos" carregam o resto antes de agir.
- **Tamanho do texto:** quatro tamanhos (0,92×, 1×, 1,08×, 1,16×). Todos os tamanhos de fonte do snippet passaram a multiplicar `var(--sv-ts)`, definida no corpo da página só quando diferente de 1. O resto do Obsidian não muda.
  - Testado em "Bem maior" no celular: Início, Biblioteca, ficha, Estatísticas, Conquistas, Integrações, Lista de desejos e Configurações, sem nada saindo da tela.
- **Preto puro (OLED):** no tema escuro, fundo `#000` e superfícies quase pretas, inclusive na barra inferior e na busca.
- **Backup em um toque** (módulo novo `SteamVaultCare.js`):
  - Um .zip com deflate (ou sem compressão em aparelhos antigos) na pasta `Backups/`, com as notas da biblioteca, as preferências e um LEIA-ME.
  - Guarda os 5 mais recentes. Lembrete na Início quando passa de 30 dias, que pode ser adiado por uma semana ou desligado.
  - O zip de teste (471 notas) abre e passa na verificação de integridade.
- **Mesmas preferências em todos os aparelhos:**
  - Ligado, cada mudança numa preferência da lista é salva (com um pequeno atraso) em `Assets/game-library-preferencias.json`.
  - A cada tela, se o arquivo mudou desde a última leitura, este aparelho adota o que está nele.
  - Chaves fora da lista são ignoradas, e as do aparelho (barra lateral, abas, áreas seguras) não viajam.

### Versão em inglês (versão 3.24.0)

- **Idioma:** *Configurações › Aparência › Idioma · Language* (Português / English). A preferência entra na lista de "Mesmas preferências em todos os aparelhos".
- **Como foi feito:** o código continua em português. O módulo novo `SteamVaultI18n.js` traduz depois que cada tela é desenhada e acompanha o que aparece depois (janelas, avisos, abas e listas montadas sob demanda).
  - Um dicionário com cerca de 2.430 frases, extraídas dos scripts e traduzidas.
  - Modelos para frases com partes variáveis ("Último backup há {0}").
  - Regras para contagens ("23 de 130" → "23 of 130"), tempo relativo ("há 2 sem." → "2 wk ago"), datas por extenso ("2 de outubro" → "October 2"), números (vírgula → ponto) e frases compostas (" · ", " — ", ", ", ": ").
  - Atributos lidos por leitores de tela e dicas (title, aria-label, placeholder) também são traduzidos.
  - Os cartões para compartilhar (desenhados em canvas) passam pelo tradutor ao desenhar e ao medir o texto.
  - Avisos nativos do Obsidian e a tela de carregamento também ficam em inglês.
- **O que fica como está:** o conteúdo das notas (títulos, sinopses, análises, descrições de coleções, nomes de gêneros e as conquistas da Steam, que vêm em português).
- **Cobertura conferida:** todas as telas, abas e janelas de edição foram abertas em inglês no celular e no computador. O que sobrou em português são dados das notas e da Steam.
- **Desempenho:** de 10 a 50 ms a mais por tela com o inglês ligado; nada muda em português.
- **Testes no GitHub:** uma terceira passada abre todas as telas em inglês.

### Bibliotecas com milhares de jogos (versão 3.24.1)

Teste com o processador do navegador desacelerado 4× (velocidade de celular), com 1.026 jogos e 25 mil conquistas e com 3.006 jogos e 74 mil conquistas. Nenhum travamento ou erro nos dois tamanhos.

- **Configurações:** de 6,1 s para 0,26 s com mil jogos. A contagem de ícones das conquistas analisava o endereço de cada ícone cerca de 99 mil vezes. Agora usa um teste simples, guardado por servidor, e a contagem é feita uma vez por versão dos dados.
- **Refazer os dados depois de uma mudança:**
  - Cada conquista normalizada é reaproveitada enquanto a nota dela não muda (data de modificação) e o jogo continua o mesmo.
  - Com 3 mil jogos, editar uma nota passou de 2,9 s para 1,35 s.
  - A conversão de texto mais usada ganhou um caminho rápido (é chamada meio milhão de vezes por montagem).
- **Atividade:** a lista completa é montada uma vez por versão dos dados; cada tela pega só o começo. Antes, a Início refazia tudo três vezes.
- **Rolagem:**
  - As listas de Conquistas entram em partes de 60 linhas, em vez de todas de uma vez: o pior quadro com mil jogos caiu de 733 ms para cerca de 200 ms.
  - A Biblioteca carrega 30 cards por vez ao rolar.
  - As seções da Início abaixo da dobra só são desenhadas ao chegar perto.
- **Tempos com mil jogos (celular):** Início 1,2 s, Biblioteca 0,8 s, Conquistas 0,6 s, Estatísticas 0,6 s, ficha 0,6 s e Configurações 0,3 s. Memória JS: 42 MB.
- **Tempos com 3 mil jogos (celular):** Início 1,5 s, Biblioteca 0,8 s, Conquistas 1,1 s, Estatísticas 1,6 s. Primeira montagem dos dados: cerca de 3 s, com a tela de carregamento. Memória JS: 68 MB.

### Segurança: dados das notas tratados como externos (versão 3.24.2)

Revisão de tudo que entra no app vindo de notas, do cache `.steamvault/`, do arquivo de preferências compartilhadas ou da internet. Notas podem chegar de outro aparelho pela sincronização, então foram tratadas como dado externo.

- **Cartão para compartilhar:** baixava qualquer endereço `http(s)` da capa pela rede do Obsidian, que não tem as travas do navegador. Uma nota com a capa apontando para `http://192.168.0.1/…` faria o aparelho acessar o roteador. Agora:
  - só são aceitos servidores públicos (o novo `C.publicUrl` recusa localhost, 10.x, 172.16–31.x, 192.168.x, 169.254.x, 100.64.x, `.local`/`.internal`, IPv6 local e nomes sem domínio);
  - a resposta precisa ser imagem, com no máximo 15 MB e 20 s de espera;
  - fora do vault, o `fetch` só aceita endereços do próprio aparelho (`app:`, `capacitor:`, `blob:`, `data:image`).
- **Cores em atributo `style`:** a cor da identidade (plataformas, gêneros, coleções, franquias) ia direto para `style="--sv-id:…"`. Na coleção, ela não era validada: um `accent: "red;background:url(…)"` injetava CSS. Agora:
  - `identStyle` e o topo das telas de entidade passam por `C.safeColor` (só `#hex` ou o `hsl()` do próprio app);
  - a coleção valida a cor como os outros tipos.
- **Links de loja:** os cards de ofertas e a comparação de preços abriam `data-href` sem validar, e esses links podem vir do cache em `.steamvault/`, que é um arquivo editável. Agora eles passam por `_storeUrl` (só `https` e os domínios das lojas) antes de entrar na tela e antes de `window.open`. O link de trilha sonora da ficha antiga só abre se for `http(s)`.
- **Ícones de conquista:** o download confere de novo o servidor, mesmo que a lista venha de um cálculo guardado.
- **Tamanho das respostas:** ofertas e RetroAchievements passaram a recusar respostas acima de 8 MB, como as outras integrações já faziam.
- **Preferências compartilhadas:**
  - arquivo acima de 256 KB é ignorado;
  - no máximo 200 chaves, cada uma com até 120 caracteres e sem caracteres de controle;
  - a cor de destaque só é aplicada se for uma das cores da lista (antes, um nome como `constructor` quebrava a tela).
- **Testes no GitHub:** a seção 8 do `checks.js` reprova:
  - `eval`, `new Function` e `document.write`;
  - `window.open` sem validação de endereço;
  - chave ou token passado para `console.*`;
  - chave gravada em nota ou arquivo;
  - `.gitignore` sem `.steamvault/` e `Backups/`.
- **Conferido, sem mudança:**
  - chaves e a autorização da Microsoft continuam só no armazenamento local do Obsidian;
  - cada integração só fala com os próprios domínios;
  - erros de rede não levam a chave;
  - a tradução só escreve texto (nunca HTML);
  - o backup leva só notas e preferências, sem `.steamvault/` nem chaves.

### Insígnias no lugar dos Marcos do Vault (versão 3.24.3)

A grade de 13 blocos ocupava mais de uma tela no celular, e havia três problemas:
- a barra das insígnias bloqueadas era azul, e a das conquistadas ficava vazia, sem explicar o que media;
- o texto com o requisito ficava escondido em telas estreitas;
- o nome ainda citava o "Vault".

Optei por manter o recurso, porque ele alimenta o card da Início e os avisos de novo nível, e redesenhar:
- lista de linhas (uma coluna no celular, várias no computador) com o requisito sempre visível;
- bolinhas mostram os níveis conquistados;
- a barra e a seta usam a cor do próximo nível;
- resumo por nível no topo;
- 6 linhas visíveis, o resto em *Ver todas*;
- inglês: "Badges", com todos os requisitos traduzidos.

### Jornada: gamificação (versão 3.25.0)

Tela nova (`SteamVaultJourney.js`, rota `journey`, nota `Dashboard/Jornada.md`), inspirada num painel estilo "level up" com fundo escuro e neon.

- **Sem XP manual:** todo o XP sai das notas (jogos, datas, conquistas, horas e avaliações) e das insígnias. A única exceção são as missões próprias, que a pessoa cria e marca.
- **Dados da nota tratados como externos:**
  - missões próprias com no máximo 50 itens;
  - título com até 120 caracteres;
  - XP entre 10 e 1.000;
  - repetição só `once`, `daily` ou `weekly`;
  - histórico com até 400 datas;
  - ids validados;
  - contagem regressiva com modo e data validados.
- **Cálculo único:** o estado inteiro (XP, nível, atributos, energia, diárias) é calculado uma vez por versão dos dados e guardado no modelo. A contagem regressiva usa um único intervalo, que para quando a tela sai.
- **Aviso de nível:** uma vez por subida, guardado em `journeyLevel`, que entra nas preferências compartilhadas entre aparelhos.
- **Insígnias:** saíram das abas Conquistas (hub e tela antiga) e ficam na Jornada.
- **Testes:**
  - celular, computador e inglês sem erro e sem rolagem lateral;
  - criar, concluir (única e diária) e remover missão, com o XP somando;
  - contagem com data própria;
  - vault vazio mostra o convite para começar;
  - 112 frases novas no dicionário em inglês.

### Perfil do jogador e Jornada sobre o HUD de referência (versão 3.26.0)

- **Base:** o vault *Obsidian Gamification — Level Up HUD* foi aberto numa pasta isolada, só para leitura; nada dele foi executado nem copiado. Dele vieram a estrutura e as ideias:
  - nível e XP com curva, ouro e Menu de Dopamina;
  - chefões com contagem e HP;
  - códice com adição rápida, meta diária e energia arrastável;
  - gráfico de 7 dias, conquistas com cadeado e guia.

  Tudo foi reescrito no estilo da Game Library e adaptado a jogos. O XP continua vindo das notas, sem tarefas com tags.
- **Dados pessoais validados como externos:**
  - `quests` (60 itens), `rewards` (30, ícone sem `<>"'&`), `bosses` (20, só caminhos `.md`);
  - `energy` entre 0 e 100, `dailyGoal` entre 10 e 5.000;
  - em `Dashboard/Perfil.md`: `profile` com nome de até 40 caracteres, bio de até 160, título de até 60, avatar e fundo só como caminho de nota e até 4 favoritos.
  - Ao gravar, as listas são reescritas já validadas.
- **Botões:** o estilo padrão de botão do Obsidian tem prioridade maior que uma classe simples. Os botões da Jornada e do Perfil ganharam uma regra de reset e seletores com prioridade maior, para não herdar fundo, altura e sombra.
- **Brilhos em SVG:** o `drop-shadow` dentro do SVG desenhava um quadrado escuro no avatar e nos anéis. Ele passou para o elemento SVG inteiro.
- **Testes:**
  - celular, computador e inglês sem erro e sem rolagem lateral;
  - criar missão com prazo, diária pelo códice, concluir as duas, resgatar, criar recompensa, criar chefão, mudar a meta e arrastar o HP, conferindo o frontmatter gravado;
  - trocar todas as abas, tocar num atributo e abrir o guia;
  - editar o perfil (nome, bio, título, avatar, vitrine), gerar o cartão para compartilhar e abrir as telas com o vault vazio;
  - 220 frases novas no dicionário em inglês.

### Imagem do personagem com proporção (versão 3.26.1)

- **Problema:** a moldura do personagem tinha altura fixa e cortava a imagem (`object-fit: cover`). Uma imagem quadrada ou larga perdia boa parte da arte.
- **Moldura nova (`.sv-art`):** usa `aspect-ratio` com a proporção escolhida (ou a da própria imagem, em "Original"). No modo "inteira" (`contain`), um fundo desfocado da mesma imagem preenche a sobra.
- **Envio de imagem:**
  - só tipos de imagem (`image/png|jpeg|webp|gif|avif`), até 10 MB;
  - nome limpo por `safeFileName`, sem sobrescrever (sufixo "(2)");
  - gravação em `Assets/Personagem/` com `createBinary`.
- **Caminho guardado:** só arquivo de imagem do vault (sem endereço externo nem `..`) ou nota de jogo.
- **Editor do perfil:** salvar agora mescla os campos com os que já existem, em vez de substituir o perfil inteiro.
- **Testado no celular:**
  - envio de uma imagem 800×800, com 1:1 detectado e o ajuste "inteira": a moldura fica 352×352;
  - capa de jogo em 16:9: proporção 1,78;
  - "Original": a moldura segue os 0,67 da capa.

### Cores Steam, navegação do Personagem e arrasto isolado (versão 3.26.2)

- **Causa do "tela inteira se move":**
  - o app só bloqueava o arrasto **vertical** antes de ele chegar ao Obsidian;
  - o **horizontal** passava adiante, e o Obsidian o usava para abrir as barras laterais, deslocando o espaço de trabalho;
  - a barra da Energia do Dia tinha `touch-action: none`, que só impede a rolagem do navegador, não os ouvintes de toque acima dela.

  Correção (`shieldDrag`):
  - elementos com `data-sv-drag` e todo `input[type=range]` param `touchstart/move/end` na origem;
  - o `touchmove` da zona de arrasto cancela a rolagem;
  - os gestos do app (puxar para atualizar, deslizar da borda) ignoram toques que começam nessas zonas.

  A barra de abas da Jornada entrou na lista de faixas horizontais protegidas.
- **Causa da navegação travada:** "Personagem" era um link para o Perfil, e o Perfil não tinha a barra de abas, então não havia caminho de volta às outras abas. Agora as duas telas usam a mesma barra (`J.navBar`):
  - no Perfil, cada aba é um link que grava a aba escolhida e abre a Jornada nela;
  - o Guia funciona nas duas telas.
- **Cores:**
  - a Jornada e o Perfil usam `--sv-blue` (a cor de destaque), azul-céu, cinza-azulado e `#2a475e`;
  - as cores fixas em verde foram trocadas, inclusive nos efeitos, na tela de nível e no editor de imagem;
  - os textos sobre o destaque usam `--sv-on-accent`.
- **Temas:** são classes `sv-theme-*` no `body`, que só redefinem fundos, superfícies, linhas e textos no escuro. Ficam antes do OLED, para que o preto puro continue vencendo.
- **Testes:**
  - toque real (CDP) arrastando a barra em diagonal: o valor foi de 60 para 80, `scrollTop` não mudou e 0 toques chegaram ao documento; a rolagem fora da barra continua funcionando;
  - Perfil → Missões abre a Jornada na aba Missões; trocar de aba dentro da Jornada funciona; Personagem → Perfil funciona;
  - os quatro temas trocam `--sv-surface`.

### Barra de abas no fim do Perfil (versão 3.26.3)

- A pedido, no Perfil a barra de abas foi para depois das seções, e o topo voltou a ser o fundo com o avatar, como antes da 3.26.2. A navegação para a Jornada continua igual: cada aba abre a Jornada naquela aba.
- **Testado:** Perfil → Missões abre a aba Missões da Jornada, e Personagem → Perfil funciona. O arrasto isolado da 3.26.2 continua funcionando.

### Perfil com o fundo atrás da barra de status (versão 3.26.4)

- **Causa:** `_markTopImage` não reconhecia o topo do Perfil (`.sv-pf-hero`) como uma tela que começa com imagem. Sem a classe `has-top-image`, a faixa da barra de status ficava por cima.
- **Correção:** o Perfil entrou na lista. O fundo ganha a altura da barra de status (`--sv-safe-top`), e o avatar e os textos continuam abaixo dela.
- **Testado** com a barra de status simulada em 48 px: o fundo começa em 0 e fica com 218 px (170 + 48).

### Botão da imagem do personagem no canto inferior (versão 3.26.5)

- O botão ficava no canto superior direito, em cima do logotipo das capas. Agora fica no canto inferior direito; o texto da classe já reserva esse espaço (`right: 56px`), então os dois não se sobrepõem.

### Conjuntos de conquistas e desempenho (versão 3.27.0)

- **Visual dos Conjuntos de Conquistas da Steam (beta de outubro de 2026)** aplicado ao armário de conquistas de todas as origens:
  - linha de raridade com a % global, brilho nas raras desbloqueadas e interruptor "% global";
  - filtros em chips, seletor de conjunto e um grupo por conjunto;
  - barra segmentada e cartões de progresso por conjunto.
- **Modelo:**
  - `set` e `archived` são lidos de cada nota de conquista;
  - `C.achSets(g)` agrupa, conta e respeita `achSetsExcluded`. O resultado fica guardado no jogo até o modelo mudar.
- **Gerenciador de conjuntos:**
  - grava `set` nas notas com `processFrontMatter`, que só altera esse campo; por isso a sincronização da Steam, do RA e das plataformas não o apaga;
  - "Voltar ao jogo base" remove o campo.
- **Privacidade:** a comparação com amigos da Steam não foi implementada. Exigiria dados de terceiros que a API pública não oferece.
- **Desempenho**, medido num vault de teste com 1.026 jogos e 25 mil conquistas, com a CPU 4× mais lenta:
  - a prateleira da franquia na página do jogo agora tem limite de 24 cartões. Resident Evil 4 caiu de 4,3 s / 17.232 elementos para 0,6 s / 3.478;
  - a busca de "Parecidos com este" usa um `Set`;
  - a atualização das setas das prateleiras é agrupada por quadro (`_shelfStateSoon`).
- **Inglês:** o modelo genérico `"Você {0}{1}"` casava com qualquer texto começando por "Você", inclusive nomes de conquistas. Foi trocado pela palavra exata.

### Detalhe da conquista (versão 3.28.0)

- `Insights.achievement` foi reescrito. Os cartões de Estado, Raridade global, Conjunto e Detalhes substituem a antiga linha de números, que quebrava "Desbloqueada" no meio da palavra em telas estreitas.
- O botão de desbloquear chama a mesma ação `ach-unlock` do armário de conquistas. Por isso continua valendo a regra de que só jogos editáveis (sem sincronização automática) mostram o botão.
- `U.achSetTone(base, i)` centraliza a cor de cada conjunto, usada pelo armário e pelo detalhe.
- O ícone usa `data-sv-img`: se a imagem falha, ela some e fica o troféu que está por baixo.
- Inglês: 24 frases novas.

### Revisão geral (versão 3.29.0)

- **Método:**
  - um script percorreu as 34 telas (Dashboard, ficha de jogo, categorias e conquista) em três tamanhos (celular de 410 px, tablet de 820 px e computador de 1400 px), em português e em inglês;
  - mediu erros, rolagem horizontal, texto cortado, alvos de toque abaixo de 28 px e português sobrando na versão em inglês;
  - depois houve uma revisão visual das capturas do celular.
  - Não houve erros nem rolagem horizontal. Os pontos abaixo foram corrigidos.
- **Imagens quebradas:**
  - `_wireImages` só cuidava das imagens com `data-sv-img`; as demais (por exemplo, os ícones do feed de atividade) mostravam o ícone de imagem quebrada.
  - Agora um ouvinte de `error` em fase de captura, um por tela, marca qualquer `img` com `is-broken`. A lógica de falha virou `_imgFail`.
- **Toque:** os alvos pequenos (`.sv-ovlink`, `.sv-jr-linkbtn`, `.sv-pf-link`, `.sv-link`, legendas da barra de status e pontos do carrossel) ganham uma área invisível (`::after`) só em `is-touch`.
- **Hub de conquistas:** "Em andamento" repetia "Progresso por jogo" quando havia poucos jogos. Só aparece se `withCount > inProgress + 2`.
- **Navegação:**
  - `_samePage` e o toque na aba ativa rolam ao topo;
  - `_pushRecent` e `_recent` guardam no `localStorage` (só no aparelho) as últimas 8 telas de jogo, conquista ou categoria abertas, mostradas na busca vazia;
  - o índice das Configurações é montado no `wire`, a partir dos `h3` das seções.
- **Desempenho:** `lazyAch` (mais de 150 conquistas) troca o armário por um aviso de carregamento. `show("achievements")` monta, liga (`_wireCabinet`) e carrega as imagens (`_wireImages`) do painel.
- **Inglês:** 19 frases novas. O aviso de privacidade da Xbox foi dividido em trechos para casar com o dicionário.
- **Sem regressões:** as medições de desempenho com 1.026 jogos continuam no nível da 3.27.

### Sessão ao vivo e acabamento (versão 3.30.0)

- **Revisão:** capturas do computador (1400 px) das telas principais e do celular no tema claro.
  - **Encontrados:** insígnias quase invisíveis no tema claro (prata `#b9c6d3` sobre branco) e um "—" solto em "Backlog no seu ritmo".
  - **Corrigidos:** a 3.30 escurece os metais em `body.theme-light` e mostra as horas restantes no lugar do traço.
- **Sessão ao vivo:**
  - **Onde fica:** o estado é só `{path, title, start}` em `localStorage` (`steamvault:live`). Não é segredo nem dado pessoal, e nunca vai para o vault enquanto conta.
  - **Barra:** `_liveSync` desenha a barra (`.sv-livedock`, *sticky* e com altura zero no fim de `.sv-main`) e atualiza os botões `[data-live-btn]`.
  - **Relógio:** `_liveTick` usa um único intervalo de 1 s e para sozinho quando não há barra na tela.
  - **Gravação:** usa `processFrontMatter` com os mesmos campos do formulário de sessão já existente (`date`, `hours`, `note`), mais `source: "live"`.
  - **Erros encontrados nos testes e corrigidos:** a barra perdia a altura dentro do contêiner de altura zero (`align-items: flex-start` resolveu) e os três botões da janela não cabiam no celular (ficaram dois; fechar a janela continua a sessão).
- **Inglês:** 21 frases novas.

### Fila, diário e pausa (versão 3.31.0)

- **Fila:**
  - `g.upNext` (número maior que 0) e `C.queue(model)` (sem Zerado e Abandonado, em ordem);
  - `V._queueToggle`, `V._queueManage` e `V._queueWrite`: este só grava as fichas cuja posição mudou;
  - `_homeLayout` encaixa uma seção nova depois da vizinha padrão, em vez de mandá-la para o fim do layout salvo;
  - `Play.suggest` soma +4 ao primeiro da fila e +1,5 aos demais, e o cache diário da Início é refeito se o primeiro da fila não estiver nele.
- **Diário:** `_diaryDay` agrupa sessões, conquistas por `unlockedDate`, `startDate`, zeradas e `dateAdded`. Os dias passam por `U.moreList` (20 montados de início). O `data-goto-tab` virou delegado, para valer também nos itens que entram depois.
- **Pausa:** o estado ganhou `pausedAt` e `paused` (ms). `_liveElapsed` desconta os trechos pausados, e o intervalo de 1 s não roda durante a pausa.
- **Bug encontrado pelo teste:** `_liveToggle` procurava `.sv-app` dentro do host, mas a camada da tela vive fora dele. Agora usa `_liveSyncAll`, que percorre `document.querySelectorAll(".sv-app")`.
- **Conjuntos excluídos:** `C.achCounts(g, a)` é usado em `Play.huntList` (Caçador e missões da Jornada) e em `Pages._ovNext`.
- **Inglês:** 32 frases novas.

### Revisão de bugs e proporções (versão 3.31.1)

- **Auditoria automática:** as 34 telas, em 410, 820 e 1400 px. Nenhum erro, nenhuma rolagem horizontal. A checagem de "vaza da tela" passou a ignorar o que está dentro de contêineres que cortam o conteúdo (carrosséis), e com isso também não encontrou nada.
- **Casos de borda dos recursos novos:** título de 56 caracteres, fila com 6 jogos, sessão ao vivo com mais de 1 hora e pausada, duas sessões no mesmo dia (uma sem comentário). Verificados em 360, 410, 820 e 1400 px e no tema claro.
- **Corrigidos:**
  - `_ovContinue` usava só a última sessão; agora usa a última com `note`;
  - `.sv-hero-title.is-long` / `.is-xlong` (mais de 26 / mais de 44 caracteres);
  - `.sv-livebar` com `width: min(520px, 100%)` fora do celular, e o rótulo em uma linha;
  - chip de duração só quando a sessão tem comentário.

### Efeitos sonoros (versão 3.32.0)

- **Motor:**
  - `V.sfx(nome)` cria cada som com osciladores do Web Audio (envelope de ataque de 8 ms e queda exponencial), passando por um filtro passa-baixa de 7,2 kHz e um ganho mestre (0,14 / 0,26 / 0,42);
  - um único `AudioContext`, criado sob demanda e retomado se estiver suspenso;
  - nenhum arquivo, nenhuma rede, nenhum dado pessoal.
- **Ganchos diretos:** `Achievements.toggleUnlock` (usa `data-ach-rarity` para o som de rara), `Journey.toggleQuest` e `Journey.buyReward`, `_toggleFavorite`, sessão ao vivo (`_liveToggle`, `_livePause`, salvar) e o formulário de sessão antigo.
- **Momentos detectados:** `_sfxDiff` guarda, a cada modelo novo, o status e o 100% de cada jogo, mais o nível e os chefões vencidos da Jornada. Compara com o modelo anterior e toca um som só, o de maior prioridade: chefão, depois 100%, depois nível, depois zerado. Na primeira montagem só guarda o estado, então abrir o vault fica em silêncio.
- **Teste:** contando osciladores criados, com os efeitos desligados favoritar não tocou nada. Ligados, tocaram conquista, nível (ao zerar, o XP também subiu o nível), começar, pausar, retomar, missão e moeda. O pico na gravação com volume alto ficou em 32% da escala, sem distorção.
- **Preferências:** `sfx` e `sfxVol` entraram em `CA.syncKeys`.

### Limpeza das conquistas pessoais (versão 3.32.1)

- **Removido a pedido:**
  - as notas de conquista de Bully, Celeste, Dying Light, God of War: Chains of Olympus, Resident Evil 2 e Resident Evil 4 (411 notas);
  - `Assets/Achievements/`;
  - os blocos `steam:` e `ra:` das fichas, com `achievementsEarned`/`achievementsTotal` em 0;
  - as entradas dessas notas na lista de arquivos recentes do Obsidian (`.obsidian/workspace-mobile.json`).
- **Conferido:** hub de conquistas, fichas, Início, Perfil, Jornada, Estatísticas, Steam e RetroAchievements mostram os estados vazios, sem erros. O teste de telas pula sozinho o tipo "conquista" quando não há nenhuma nota desse tipo.
- **Recuperação:** a remoção está no histórico do git; o commit anterior tem tudo.

### Acabamento depois da limpeza (versão 3.32.2)

- **Varredura de textos:** todas as telas foram procuradas por "0 de 0", "0/0", NaN, undefined, null, Infinity e "[object". Só sobrava o caso do RetroAchievements.
  - `RetroPages.raProgress` não desenha mais a barra quando não há total.
  - Os cartões "conquistas desbloqueadas" e "hardcore" mostram "—" quando não há conquistas.
- **Arquivos soltos:** `lib-b-d-0.png`, `lib-b-d-1.png`, `lib-b-m-0.png` e `lib-b-m-1.png` saíram do repositório.

### Auditoria completa (versão 3.33.0)

- **Mapeamento:** 24 scripts (cerca de 28 mil linhas), um CSS de 8.383 linhas, 68 notas e 5 plugins (Dataview, CustomJS, Templater, Tasks, Style Settings).
- **Ferramentas usadas, em Chromium sem interface, sobre o harness do repositório:**
  1. **CSS morto:** extração das 1.989 classes do CSS e busca em todos os scripts e notas, incluindo classes montadas em pedaços (`sv-rarity-${tier}`). Só `svl-ra-status` e `sv-awards-block` estavam sem uso.
  2. **CSS duplicado (postcss):** 194 seletores repetidos.
     - Uma declaração só foi removida quando o mesmo seletor, no mesmo contexto (`@media`), define a mesma propriedade mais adiante com importância igual ou maior. Nesse caso a anterior nunca vale.
     - Ficaram de fora regras posteriores com `:has()`, `color-mix()` ou `dvh`, que podem servir de reserva.
     - Resultado: 70 declarações e 13 regras vazias removidas.
     - Validação: 170 capturas antes e depois saíram iguais pixel a pixel. A única diferença, a contagem regressiva da Jornada, também varia entre duas rodadas iguais.
  3. **JavaScript morto:** métodos de todos os módulos sem nenhuma referência, inclusive por nome nas rotas. `Browse.entityHero`, `Insights._awards` e `Play.openSmart` saíram.
  4. **Vazamentos:** contagem de ouvintes em `window`, `document`, `body` e na camada da tela, de intervalos e de observers (Mutation/Intersection/Resize), e do heap, ao longo de três voltas por oito telas. Tudo estável, sem acúmulo.
  5. **IDs duplicados:** nenhum.
  6. **Contraste (WCAG):** cor do texto contra o fundo efetivo, em todas as telas, nos temas escuro e claro. Correções:
     - tokens do tema claro: `--sv-blue` `#0a6bc0`, `--sv-green` `#2f7d1f`, `--sv-amber` `#946005`, `--sv-cyan` `#0f6a9c`;
     - acentos do tema claro: azul, azul-céu e laranja mais escuros, e `--sv-on-accent: #fff` no tema claro. Antes, o texto sobre o botão era o mesmo nos dois temas, e Azul-céu, Laranja, Dourado, Verde e Ciano ficavam com texto escuro sobre fundo escuro;
     - botões de plataforma, cores da Jornada, `sv-pf-acc-state` e a prata das insígnias.
     - Os dois avisos restantes são falsos positivos: a aba ativa da Jornada tem o fundo num pseudo-elemento, e o "+" da tarefa é o botão de envio do formulário.
  7. **Elementos interativos:** toda `data-action` presente nas telas existe no roteador. O único botão sem ouvinte é de envio de formulário, o que está correto.
  8. **Textos quebrados** ("0 de 0", NaN, undefined): nenhum, depois da 3.32.2.
  9. **Testes funcionais:** 35 verificações, agora no CI (`functional.js`).
- **Bug encontrado:** `.sv-heatmap-wrap` rolava para a esquerda no celular, escondendo os dias recentes e a legenda. `V._heatmapsToEnd` corrige na montagem da tela, nos painéis tardios das Estatísticas e ao trocar de aba na ficha, e a legenda ficou `sticky`.
- **Novas funções:**
  - `_homeWeekData(ctx, offset)` (cache por semana, com o jogo mais jogado) e um seletor no bloco "Sua semana", com troca delegada e foco preservado no teclado;
  - mapa de calor por jogo na aba Sessões, reaproveitando `Insights.heatmap` com os dias do diário.
- **Não mudado de propósito:** o texto branco sobre o azul Steam (`#1a9fff`) e sobre os acentos roxo, rosa e vermelho no tema escuro fica entre 2,8:1 e 3,7:1. Esse é o visual dos botões da Steam e a identidade do vault; escurecer mudaria a aparência de todos os botões principais.

### Remoção da gamificação (versão 3.34.0)

- **Decisão:** a Jornada e as insígnias foram removidas sem substituto. Todo número que elas mostravam já existe em forma útil na Início, nas Estatísticas, em Conquistas e no Perfil; o resto (XP, ouro, chefões, energia) era camada de jogo sobre os dados, não informação.
- **Código:** `SteamVaultJourney.js` (1.046 linhas) apagado; `SteamVaultProfile.js` foi de 505 para cerca de 300 linhas; `milestones`, `milestonesBlock` e `announceMilestones` saíram de `SteamVaultPlay.js`; rota, módulo `J`, entradas de menu, sons e detecção de nível/chefão saíram de `SteamVault.js`, `SteamVaultUI.js`, `SteamVaultShare.js` e `SteamVaultCare.js`.
- **CSS:** 477 regras apagadas (seção 39 inteira, insígnias, cartão de nível, anel e moldura do personagem), mais 6 seletores tirados de listas compartilhadas. `deadcss` não acha mais classes da Jornada; `_install/steamvault.css` é cópia idêntica.
- **Referências:** nenhuma ocorrência de `SteamVaultJourney`, `sv-jr`, `ctx.J` ou `Dashboard/Jornada` no código. A rota `journey` ficou como apelido do Perfil, para uma nota antiga não dar "Página desconhecida".
- **Testes:** `checks.js` ok; `smoke.js` abre todas as telas em português e inglês sem erro; `functional.js` (36 testes) trocou o teste de missão da Jornada por um do Perfil (abre o editor, salva a bio, confere a nota e confere que não há nível nem insígnias); auditoria de layout e de acessibilidade (IDs, contraste, botões sem ação) sem achados novos.

### Sistema de ícones (versão 3.35.0)

- **Auditoria:** havia 155 ícones inline num só registro (`U.paths`, 24×24, traço 1,75, `currentColor`) e nenhum arquivo de ícone (SVG, PNG ou WebP) em uso. Os emojis de plataforma e status do módulo legado (`platformIcons`, `statusIcons`) estavam definidos mas não apareciam em nenhuma tela.
- **Problemas encontrados:**
  - 16 gêneros dividiam 9 símbolos (chama, mapa, espada, mira, folha, bússola, montanha, coroa e escudo), e o troféu de Esportes colidia com o de Conquistas;
  - os consoles PlayStation e Xbox desenhavam aparelho e controle juntos, ilegíveis em 16 px;
  - 12 ícones temáticos ultrapassavam a margem de 3.
- **Feito:** 25 ícones novos de gênero (`g-*`) e 21 redesenhados com o mesmo nome. O mapeamento dos gêneros foi atualizado, com visual novel e MMORPG acrescentados, e o ícone padrão de gênero passou a ser o controle. O grupo Gêneros entrou no editor de identidade. A exportação para `Assets/Icons/` (181 SVGs) ganhou o teste `icons.js`, e a galeria ficou em `Dashboard/Ícones`.
- **Validação:**
  - `xmllint` aceita os 181 arquivos;
  - nenhum ícone do registro ficou sem uso e nenhuma chamada aponta para um ícone inexistente;
  - os ícones escolhidos pelas notas (`planet`, `skull`) continuam existindo;
  - a galeria abre sem ícone faltando e os gêneros não se repetem;
  - inspeção visual em 16, 24, 32 e 56 px, no tema escuro e no claro, no celular e no computador, nas telas de Gêneros, Plataformas, plataforma e galeria;
  - `checks`, `smoke` e `functional` (39) passam.
- **Integrações:** o Canva gerou uma prancha de referência de estilo, usada só como direção visual; não havia designs nem brand kit de referência na conta. O Higgsfield recusou a geração no plano gratuito ("Requires basic plan or higher") e não foi usado.

### Revisão dos ícones de gênero (versão 3.36.0)

- **Diagnóstico:**
  - a taxonomia real tem 6 gêneros (Ação, Horror, Plataforma, Hack & Slash, Action-Adventure, Sandbox) e 6 subgêneros, todos com ícone, resolvidos por `genreDefaults` e pela identidade da nota;
  - substituídos: Aventura, Ação, Ação e aventura, Hack and slash e Luta;
  - Action RPG foi trocado por colidir com o novo hack and slash;
  - os demais ficaram.
- **Backup:** antes de substituir, `Assets/Icons/` e `SteamVaultUI.js` da 3.35 foram copiados para uma área temporária, e a prancha antes/depois foi gerada a partir dessa cópia. O histórico do git guarda a versão anterior.
- **Validação:**
  - `xmllint` aceita os 181 SVGs, e o `icons.js` confirma os arquivos em dia, sem sobras;
  - os ícones foram inspecionados em 16 a 144 px, no tema escuro e no claro;
  - nas páginas reais, apareceram em Gêneros (afinidade, cartões, marcas d'água), Hack & Slash, Action-Adventure e na galeria;
  - `checks`, `smoke` e `functional` (39) passam.
- **Integrações:**
  - Canva: gerou a prancha de poses usada como referência;
  - Higgsfield: gerou uma imagem com o modelo `z_image`, mas o download foi bloqueado pelo proxy da sessão (403) e ela não foi inspecionada.

### Revisão de acabamento (versão 3.37.0)

- **Diagnóstico:**
  - capturas de 12 telas no celular (410 px), no tablet (820 px) e no computador (1400 px), nos temas escuro e claro;
  - varredura de 236 botões (todas as ações visíveis, sem as destrutivas, cada uma fechada com Esc): nenhum erro de JavaScript;
  - Tab por 60 elementos: todos com foco visível, exceto o campo de busca, que destaca o contêiner;
  - `qa` (IDs, contraste e ações sem tratamento) e auditoria de layout sem achados novos.
- **Corrigido:**
  - a linha de 1 px sobre a arte, causada por `background` repetindo na borda transparente da barra superior;
  - o status da Steam ilegível sobre a arte clara;
  - o anel espremido na ficha (`flex: none`);
  - o título de Conquistas colado aos botões flutuantes no celular;
  - a célula vazia nos destaques das Estatísticas;
  - os botões repetidos na Lista de desejos vazia e no Perfil Steam desconectado.
- **Preservado:** todo o resto: layout, componentes, ícones, animações e navegação. A análise não indicou motivo para reformular nenhum componente.
- **Testes:** `checks`, `icons`, `smoke` (todas as telas, português e inglês) e `functional` (39) passam. As correções foram conferidas em capturas antes e depois.

### Imagem própria no lugar do ícone (versão 3.38.0)

- **Implementação:**
  - `Core.iconImage()` valida e resolve o campo `iconImage`: caminho do vault com extensão de imagem, `[[link]]` ou `https`, sem `..`;
  - `U.icon("img:…")` desenha um `<img>` com a classe do ícone;
  - `ident` e `collectionIdent` preferem a imagem;
  - o editor de identidade reaproveita o seletor de imagem já existente (envio do aparelho para `Assets/Icons/Custom/`) e oferece a lista de sugestões do vault.
- **Validação:**
  - teste no harness, no celular e no computador: grava `iconImage`, a imagem aparece no selo, na marca d'água, no hub de Gêneros e na ficha de um jogo do gênero;
  - escolher um ícone remove a imagem;
  - três testes novos no `functional.js` (42 no total);
  - `checks`, `icons` e `smoke` passam.
- **Limitação:** a rede desta sessão bloqueia `canva.com` e o CDN do Higgsfield (403 no proxy). As artes das coleções geradas no Canva não puderam ser baixadas em resolução útil e não foram colocadas no vault.

### Ícones unificados e limpeza do módulo legado (versão 3.39.0)

- **Diagnóstico:**
  - a varredura de texto dos 16 formulários legados abertos pelos botões reais não achou nenhum emoji visível (`_svgifyIcons` já convertia);
  - a inconsistência era a segunda família de ícones (`_svgPaths`, 69 desenhos, traço 1,8).
- **Feito:**
  - `svgIcon` lê `SteamVaultUI.paths`, com 4 apelidos;
  - 17 desenhos migrados para o registro;
  - `_svgPaths` removido;
  - 21 métodos inalcançáveis e 2 campos nunca lidos removidos;
  - entrada `editCategory`, sem botão, removida do roteador;
  - 3 regras e 1 seletor de CSS órfãos removidos.
- **Validação:**
  - alcançabilidade refeita: 174 métodos, 0 inalcançáveis;
  - armadilhas antes da remoção: 0 chamadas;
  - os 16 formulários abrem, com as mesmas contagens de ícones e sem erro;
  - `checks`, `icons` (200 SVGs) e `smoke` passam, e `functional` passa com 42 testes.

### Ícones do quadro de referência (versão 3.40.0)

- **Mapeamento:** cada ícone do quadro foi comparado, lado a lado e ampliado, com candidatos do Tabler, Lucide, Phosphor e Simple Icons, e escolhido pelo desenho idêntico.
  - 74 ícones existentes foram substituídos com o mesmo nome e 1 foi criado (`g-fps`).
  - Os consoles e portáteis sem equivalente aberto foram redesenhados à mão a partir do recorte ampliado.
- **Cor:** a seção 52 do CSS força branco no tema escuro, com exceções para o estado ativo (menu, abas, segmentos) e para a amostra clara da galeria.
- **Validação:**
  - medição da cor calculada: 0 ícones fora do branco em Gêneros (60), galeria (874), Início (107), Biblioteca, ficha, Plataformas, Estatísticas e Configurações, no celular e no computador;
  - `xmllint` aceita os 201 SVGs;
  - `checks`, `icons` e `smoke` passam, e `functional` passa com 42 testes.
- **Limitações:**
  - os letreiros PS2 a PS5 são largos e ficam pequenos nas etiquetas de 16 px;
  - Wii, Wii U, GameCube e N64 mantêm os desenhos anteriores (marcas sem vetor aberto);
  - a verificação foi feita no harness, não no Obsidian do aparelho.

### Ícone de Action-Adventure (versão 3.41.0)

- **Mudança:** só o desenho de `g-actionadventure` foi trocado, mantendo o nome; a descrição da galeria foi atualizada em português e inglês.
- **Validação:** prévia em 16, 24 e 48 px nos temas claro e escuro, ao lado de Ação, Aventura e Mundo aberto; `xmllint` aceita os 201 SVGs; `checks`, `icons`, `smoke` e `functional` passam.

### Duplicações de ícones, PS2, PS1, PSP e GBA (versão 3.42.0)

- **Auditoria:** a comparação de todos os desenhos do registro encontrou 6 grupos idênticos: b-xbox = c-xbox = c-xbox360 = c-xboxone = c-xseries, b-playstation = c-ps1, b-nintendo = c-switch, g-arpg = g-hackslash, user = g-tps e gear = g-simulation.
  - Todos foram separados mantendo os nomes, e agora não há nenhum desenho repetido.
  - Nenhum arquivo foi removido. Os SVGs em `Assets/Icons` foram regenerados e não há mais arquivos idênticos, nem SVGs fora dessa pasta.
  - As notas do vault só usam `icon: planet` e `icon: skull`, que não mudaram.
- **Peso dos letreiros:** PS2, PSP e PS1 recebem um contorno do mesmo tom (`stroke-width` 0,26 e 0,2). As hastes passam de 0,29 para cerca de 0,55, perto das do PS3 ao PS5.
- **Caixa 3:2:** `U.icon` marca os letreiros com `sv-i--wide` e usa `viewBox="0 4 24 16"`. A seção 53 do CSS deixa a largura automática, com a mesma altura; marca d'água e galeria voltam ao quadrado.
- **Validação:**
  - prévia em 16, 24 e 48 px nos fundos claro e escuro;
  - Plataformas, página do PSP e ficha do jogo no celular;
  - galeria no computador: no tema escuro, só os itens ativos e as amostras claras não são brancos (exceções previstas);
  - `xmllint` aceita os 201 SVGs, e `checks`, `icons`, `smoke` e `functional` passam.

### Consoles das outras marcas (versão 3.43.0)

- **Auditoria:** os 30 ícones de consoles não Sony foram comparados em 16, 24 e 48 px, nos fundos claro e escuro.
  - Problemas encontrados: SNES e Mega Drive desenhados como controles; Game Boy praticamente igual ao Portátil; Switch Lite igual ao Steam Deck e parecido com o Game Gear; Saturn só com o planeta; 15 ícones no traço antigo (1,75).
- **Correção:** 19 desenhos trocados mantendo os nomes. Nenhuma referência precisou mudar e nenhum arquivo foi removido.
  - As notas do vault só usam `icon: planet` e `icon: skull`, que não mudaram.
- **Validação:**
  - nenhum desenho repetido no registro;
  - todos os consoles no traço 2, exceto os letreiros da Sony, que são preenchidos;
  - galeria no computador com 0 ícones fora do branco, além das exceções previstas;
  - `xmllint` aceita os 201 SVGs, e `checks`, `icons`, `smoke` e `functional` passam.

### PC (gabinete) restaurado (versão 3.43.1)

- `c-pc` voltou exatamente ao desenho anterior à 3.43.0. O ícone do PC na plataforma (`monitor`) não tinha mudado.
- `icons.js --write` regenerou `Assets/Icons/platforms/c-pc.svg`; `checks`, `icons`, `smoke` e `functional` passam.

### Ícones novos (versão 3.44.0)

- **Registro:** 236 ícones, com 35 novos.
  - 12 plataformas desenhadas à mão no traço 2;
  - 11 aparelhos PlayStation (os desenhos aprovados sobre as fotos, mais o PS Portal);
  - 12 subgêneros, vindos do Tabler (MIT) e do Phosphor (MIT), já citados em `Assets/Icons/LICENSES.txt`.
- **Ligações:**
  - `platformDefaults` ganhou 32 nomes, e `switch2` deixou de usar o ícone do Switch;
  - `genreDefaults` ganhou 24 nomes; `puzzle` e `exploracao` mudaram de ícone;
  - `iconGroups` ganhou o grupo "Aparelhos PlayStation"; `iconLabel`, `iconConcept` e a galeria de gêneros foram atualizados, com tradução em inglês.
- **Validação:**
  - nenhum desenho repetido e nenhuma célula da galeria sem ícone;
  - `xmllint` aceita os 236 SVGs;
  - a página Subgêneros no celular mostra os ícones novos;
  - `checks`, `icons`, `smoke` e `functional` passam.

### Metas por mês, marcos e Comparar (versão 3.45.0)

- **Metas:**
  - `goals[].year` aceita `AAAA` ou `AAAA-MM`; valores fora disso voltam ao ano corrente, como antes;
  - o tipo `queue` conta `upNext` com `completionDate` no período;
  - o ritmo esperado usa o mês ou o ano corrente.
- **Limitação removida:** a linha "Metas (antiga tela Perfil) não foram reimplementadas" estava desatualizada, porque as metas existem em Estatísticas desde a 3.17.
- **Marcos:** `_gameMilestones` usa só datas já gravadas (sessões, conquistas, zeradas, `startDate`, `dateAdded`). Sem datas suficientes (menos de dois marcos), a faixa não aparece.
- **Comparar:**
  - **plataformas:** tudo na biblioteca de cada uma;
  - **anos:** `_stWindow` de janeiro a dezembro;
  - o período do topo não se aplica, e isso está avisado na própria aba.
- **Testes:** `functional.js` ganhou 6 verificações (comparar e trocar o lado, meta mensal gravada e exibida, marcos e ordem do diário). Também passam `checks`, `icons` e `smoke`.
- **Correção visual:** a lista do editor de metas tinha o recuo padrão de lista e ficava desalinhada do formulário.

### Importar CSV (versão 3.46.0)

- **Código:** `SteamVaultCare.js` traz:
  - um leitor CSV (RFC 4180, com BOM, separador adivinhado e limite de 1000 linhas);
  - o reconhecimento de colunas por apelidos normalizados;
  - as conversões tolerantes (o que não dá para ler fica vazio).

  As fichas são criadas por `C.createGameNote`, o mesmo caminho de "Adicionar jogo", então o schema e o escape do YAML são os de sempre.
- **Duplicados:** a chave é título + plataforma normalizados, contra o vault e contra o próprio arquivo.
- **Segurança (seção 8 do checks.js):**
  - leitura local com `File.text()`, sem rede, sem `eval` e sem gravar segredos;
  - tamanho máximo de 5 MB;
  - caracteres de controle removidos e textos cortados (título 120, listas 60, nomes 80).
- **Ambiente de testes:** `server.js` procurava o js-yaml do navegador num caminho que não existe nem na 4.x nem na 5.x, então criar notas pelo harness falhava sem aviso. Agora o caminho é achado nas duas versões.
- **Testes:**
  - `functional.js` ganhou 3 verificações (prévia, ficha criada com status, horas em segundos, nota em 0–100 e gêneros, e sem duplicar);
  - prova manual com CSV no formato do Playnite (4 linhas) e do Backloggd (3 linhas);
  - `checks`, `icons` e `smoke` passam.

### Desempenho com 1000 jogos e módulo antigo (versão 3.47.0)

- **Método:** `perf.js` injeta 1000 jogos sintéticos (semente fixa) no `data.js` do harness e mede cada tela até dois quadros depois do `go()`, no celular (410 × 887, CPU 4× mais lenta pelo DevTools) e no computador. O perfilador do Chrome (amostragem de 200 µs) apontou onde o tempo ia.
- **Achados e correções:**
  - **Início:** a prateleira da Lista de desejos montava todos os itens (5216 elementos com 169 jogos). Com o corte em 20, o DOM da Início caiu de 8129 para 3557 elementos. O tempo que aparecia em `_fitLayer`, `_insets` e `_restoreScroll` era o layout forçado dessa página enorme.
  - **Biblioteca, busca:**
    - `input` com espera de 160 ms (acima de 200 jogos) ou 60 ms;
    - sem agrupamento, `applyFlat` mantém a grade inteira em ordem de classificação e só troca `hidden`; reordena só quando a ordem ou a quantidade de cards muda;
    - com montagem em partes, `filterPending` decide pelos dados (`_libData`, guardado por jogo) e põe os que combinam na frente da fila. Isso vale quando a tela abriu sem filtro e a ordem não mudou; nos outros casos continua `finishMount`.
  - **Conferência com 1000 jogos:** "sintético 99" acha 11 jogos (contador 11); busca vazia após rolar até o fim mostra 1006 em ordem alfabética; o filtro Zerado bate com o contador (175).
- **Módulo antigo:** `SteamVaultLegacy.js` passou de 6034 para 5902 linhas.
  - Saíram `retrospectiveImageButton`, `wireRetrospectiveImageButton`, `fullBackupButton`, `wireFullBackupButton` e `formatHours` (usado só pela retrospectiva antiga), além do ramo `retrospective` em `SteamVault.legacy()`, que nenhum botão chamava.
  - A análise de alcance (métodos chamados de fora, mais o que eles chamam) termina com 0 métodos sem uso.
- **Testes:** `checks`, `icons`, `smoke` e `functional` passam.

### Saúde da biblioteca e importação unificada (versão 3.48.0)

- **Saúde:** `SteamVaultCare.healthData/openHealth/findCovers`.
  - A plataforma conta como reconhecida quando tem padrão em `platformDefaults` ou página própria; o nome padrão sugerido vem do mesmo mapa da importação (`csvPlatform`).
  - A duplicata é por título + plataforma padronizada.
  - A nota pesa capa (1), gênero (0,6), ano e desenvolvedora (0,3 cada), com −2 por duplicata e por plataforma fora do padrão.
- **Capas pelo nome:**
  - a busca usa `storesearch` da loja pública pelo `_get` do módulo da lista de desejos, que só permite `store.steampowered.com`, uma requisição por vez;
  - aceita só nome idêntico depois de normalizar;
  - `fetchArt` ganhou `appId` para usar o AppID achado sem gravá-lo na ficha;
  - limite de 40 jogos por vez.
- **Importação unificada:**
  - o botão dos primeiros passos e o menu da Biblioteca abrem a janela nova;
  - saíram `bulkImportForm`, `wireBulkImportForm`, `_createBasicGameNote`, `incompleteGamesPanel`, `collapsePanel`, `internalHref` e `_achSvg`;
  - a análise de alcance volta a 0 métodos sem uso.
- **Correções:** horas do Playnite em arquivo curto; traduções das metas, dos meses e do mapa de calor da ficha.
- **Testes:** `functional.js` ganhou 5 verificações (lista simples, saúde, padronizar plataforma) e passa com 56. Também passam `checks`, `icons` e `smoke`.

### Animações nas telas novas (versão 3.49.0)

- **Regras:** as mesmas da seção 21 do CSS (seção 57 nova): só `transform`, `opacity`, `translate` e `scale`, nada em loop, e a regra geral de movimento reduzido (seção 20) zera tudo dentro do Vault e das janelas.
- **Custos:**
  - **Biblioteca:** anima só os cards que voltaram à grade (no máximo 24). A classe sai depois de 900 ms, e a reentrada é feita no quadro seguinte (`requestAnimationFrame`), sem forçar layout.
  - **Comparar:** 2 barras por linha.
  - **Marcos:** até 6 com atraso próprio.
  - **Diário:** os 6 primeiros dias, só quando a ordem muda.
  - **Saúde:** o anel usa a transição de `stroke-dashoffset` que os anéis já tinham.
- **Verificação:**
  - com movimento, as animações rodam (Biblioteca 6, Comparar 15, marcos 3, diário 3, Saúde 2) e, terminadas, nada fica transparente nem com escala parcial;
  - com "Reduzir animações", nenhuma roda e tudo aparece no estado final;
  - `perf.js` com 1000 jogos não mostrou piora na busca;
  - `checks`, `icons`, `smoke` e `functional` passam.

### Desfazer e exportar CSV (versão 3.50.0)

- **Desfazer:** `undoBegin` guarda os arquivos que existem e os campos que a ação pode mudar; `undoCommit` registra os arquivos novos e os valores antigos.
  - Os valores antigos são guardados sempre, porque o índice de metadados do Obsidian pode demorar um instante para refletir a gravação.
  - O registro fica no `localStorage` do aparelho por 24 h e só contém caminhos e valores do frontmatter.
  - `undoLast` restaura os campos e manda os arquivos criados para a lixeira com `fileManager.trashFile`.
  - O aviso ganhou a opção `action`, com um botão que funciona uma vez só e um tempo maior na tela (9 s).
- **Exportar:** `exportCsvText` grava com BOM e CRLF (abre certo no Excel) e com aspas só quando necessário. O formato é o mesmo da importação; ida e volta reconhece 16 de 16 colunas e cria 0 jogos novos. Saíram `exportLibraryButton` e `wireExportLibrary` do módulo antigo (5732 para 5688 linhas, 0 métodos sem uso).
- **Testes:** `functional.js` ganhou 4 verificações (Desfazer no aviso, fichas na lixeira, CSV em `Backups/` e ida e volta) e passa com 60. Também passam `checks`, `icons` e `smoke`.

### Nota diária e resumo do mês (versão 3.51.0)

- **Nota diária:** `SteamVaultCare.logSessionToDaily` é chamado depois de gravar a sessão no diário (`SteamVaultLegacy.wireSessionsSection`) e no fim da sessão ao vivo (`SteamVault._liveStopDialog`).
  - Lê `daily-notes` pelo `app.internalPlugins` (pasta, formato e modelo) e cria o link com `fileManager.generateMarkdownLink`.
  - Grava com `vault.process` (ou leitura e escrita, onde não existe).
  - A anotação vira uma linha só (sem quebras), com até 200 caracteres.
  - Falhas não impedem a sessão de ser salva, porque a nota do jogo é gravada antes.
- **Resumo do mês:** `_homeLastMonth` usa o mesmo `_stWindow` das Estatísticas, para o mês anterior e o retrasado. Durante a implementação, o nome `_homeMonth` colidiu com o método que já existia ("Destaques do mês") e foi trocado antes de qualquer envio. `monthSeen` guarda o mês dispensado.
- **Testes:** `functional.js` ganhou 4 verificações (texto inserido na nota diária, desligada não escreve, resumo com data simulada, dispensar) e passa com 64. Também passam `checks`, `icons` e `smoke`.

### Auditoria geral (versão 3.52.0)

- **Método:** um script percorre todas as telas do painel, todas as fichas e uma página de cada tipo, rolando até o fim, no celular (410 × 887) e no computador. Ele aponta elementos que estouram a largura (fora de contêineres roláveis), controles sem nome acessível, alvos de toque menores que 24 px, imagens quebradas, erros e avisos do console e, em inglês, frases em português. Um segundo script mede o contraste texto × fundo (WCAG) nos temas claro e escuro.
- **Resultados e correções:**
  - estouro, nome acessível e imagens: 0 em todas as telas;
  - alvos pequenos: os segmentos da barra de status (12 px) e os pontos do carrossel (22 px) ganharam área de toque sem mudar o desenho (seção 60 do CSS). Os demais apontados são links dentro de texto, que seguem o tamanho da letra;
  - tradução: o `_skip` do `SteamVaultI18n` passou a ignorar as classes de texto da pessoa, e a descrição dos cartões de coleção recebeu `sv-no-i18n`;
  - contraste: só `.sv-plathero-kicker` no tema claro era real. Os outros pontos são texto claro sobre a arte dos topos (fundo de imagem que o script não lê), conferidos em captura;
  - o único erro de console é o favicon que o navegador pede ao servidor de testes (não existe no Obsidian).
- **Testes:** `functional.js` ganhou 2 verificações (texto da pessoa fora da tradução, toque fora dos 12 px da barra) e passa com 66. Também passam `checks`, `icons` e `smoke`.

### Auditoria completa do vault (versão 3.53.0)

- **Estrutura:**
  - 377 arquivos e 67 notas;
  - 0 imagens sem uso e 0 pastas vazias;
  - os únicos "links quebrados" são exemplos da documentação e o marcador do modelo de jogo;
  - o código legado não tem métodos inalcançáveis (verificado por análise de chamadas).
- **Imagens:** 4 PNG (9,1 MB) convertidos para WebP 0,86 pelo canvas do Chromium (0,75 MB). O fundo de 3840 px foi reduzido para 2560. O frontmatter das duas fichas e o `workspace-mobile.json` foram atualizados, e a comparação lado a lado não mostra perda visível.
- **CSS morto:** foram encontradas 42 classes sem uso, descontando as opções do Style Settings (que viram classes do `body`) e os prefixos montados no código. A remoção automática foi tentada duas vezes:
  - primeiro com expressões regulares, que se confundem com as chaves dentro dos comentários;
  - depois com um tokenizador.

  Nas duas vezes, a comparação de capturas de todas as telas mostrou páginas sem estilo. O arquivo foi restaurado do backup, e as capturas voltaram a bater com a referência (só diferem pelo tempo das animações). O ganho seria de 15 KB em 605 KB (2,5%), então a limpeza fica para ser feita à mão, seção por seção.
- **Desempenho (`perf.js`, 330 cards):**
  - busca na Biblioteca em cerca de 0,6 s e limpeza em 0,43 s;
  - recálculo do índice em 30 ms;
  - nenhum erro.
- **Testes:**
  - `checks.js` ganhou 2 verificações (arte referenciada existe; nenhuma imagem acima de 1 MB). A primeira foi validada provocando uma referência quebrada;
  - passam `checks`, `icons`, `smoke` e `functional` (66).

### Melhorias futuras da auditoria (versão 3.54.0)

- **CSS morto (feito com segurança):** o `prune3` mascara comentários e textos antes de ler as chaves e percorre `@media`/`@supports`. Ele só considera um seletor morto quando a classe morta aparece fora de parênteses: `:not(.x)` e `:is(.x, .y)` ficam. Numa lista de seletores, remove só os mortos. Três provas:
  1. o próprio Chromium lê os dois arquivos e compara as regras: 5333 → 5195, nenhuma regra nova ou alterada, todas as 138 removidas contêm uma das 42 classes mortas;
  2. capturas das 68 telas comparadas pixel a pixel com uma referência nova: de 0 a 6 px na maioria; as barras animadas (Gêneros, Plataformas, Coleções) e o carrossel da Início já variavam entre capturas do mesmo CSS;
  3. `checks`, `smoke` e `functional` passam.

  As duas tentativas anteriores (3.53) falhavam ao cortar os blocos; esta compara as regras lidas pelo navegador em vez de confiar no texto.
- **Imagem:** `Resident Evil 2-destaque.jpg` (595 KB) virou WebP (97 KB). O harness de testes usa esse arquivo para simular o download da arte da Steam e passou a servi-lo como `image/webp`.
- **Duplicações (análise de corpos de método normalizados):**
  - `SteamVaultLegacy.yamlEscape` e `ensureCategoryNote` delegam ao `SteamVaultCore`, que remove caracteres de controle e não duplica a página;
  - `_normalizeAchievementName` reaproveita `_normalizeSteamName`;
  - continua duplicado o `_ls` de `SteamVaultRetro` e `SteamVaultPlatforms` (9 linhas): são módulos independentes, e unir os dois criaria uma dependência entre eles;
  - o `esc` do Legacy também fica, porque usa o `safeText` próprio.
- **Testes:**
  - `functional.js` ganhou "página de gênero não duplica quando o nome muda só no acento" e passa com 67;
  - o código legado continua sem métodos inalcançáveis.

### Desempenho, acessibilidade e contraste (versão 3.55.0)

- **Dicionário de inglês sob demanda:**
  - **Custo medido:** avaliar o módulo com o dicionário custava 18,6 ms contra 4,1 ms sem ele (primeira execução, CPU 4× mais lenta).
  - **Onde está agora:** `Assets/i18n/en.json`, lido por `app.vault.adapter.read`:
    - no construtor, se o idioma salvo for inglês;
    - em `setLang("en")`;
    - no `render`, que espera com `await` só quando o inglês está ligado.
  - **Leitura falha:** o app segue em português.
  - **Harness:** `adapter.read` passou a servir `Assets/i18n/*.json` do disco.
  - **Abertura com 1000 jogos (`perf.js`, celular):** 3,50 s → 3,35–3,39 s, em duas rodadas de cada.
- **Biblioteca:** o `IntersectionObserver` da montagem gradual chamava `mountChunk(30)` enquanto o marcador estivesse à vista. Numa busca de poucos resultados, ele montava ocultos os 600+ cards restantes.
  - Agora monta só o trecho visível da fila (`findIndex(x => x.hidden)`).
  - O `filterPending` volta a observar o marcador quando o filtro novo libera cards.
  - Perfil de CPU, 1000 jogos: `mountChunk` caiu de 295 ms para 11 ms (busca "sintético 99"), e a tarefa longa de 105 ms (busca "sintético 5") sumiu.
  - Busca no `perf.js`: 590/622/430 ms → 414/414/412 ms. Esses números incluem 400 ms de espera do próprio teste.
- **`saveDeviceImage`:** passa pelo `SteamVaultSteam._compress`, com largura máxima por pasta (Covers 1200, Logos 1000, demais 2560) e alfa preservado fora do JPEG. Só comprime acima de 300 KB e nos formatos `png/jpe?g/webp/bmp/avif/tiff?`.
- **Regressão corrigida:** `data-story-share` chamava `V.legacy(ctx, "retrospective")`, removido na 3.47. O novo `SteamVaultPlay._shareYear` monta o `__svStatsShare` do ano com `_stWindow` e abre o cartão "stats". No `statsCard`, o recurso de usar os "mais jogados" de sempre ficou restrito ao período "desde o início".
- **Acessibilidade:**
  - **Novo `U.trapFocus(root, {initial})`:** prende o Tab, foca o controle inicial e devolve o foco a quem abriu.
  - **Escolha do jogo na Steam:** usa o `trapFocus` e ganhou `aria-labelledby`/`aria-describedby`.
  - **Retrospectiva:** usa o `trapFocus` e ganhou `aria-live` no palco.
  - **`V.modal`:** o id do título ganhou um contador, para não repetir com duas janelas abertas no mesmo milissegundo.
- **Contraste sobre arte (script novo):** para cada texto dentro dos topos, a letra fica transparente (a sombra é mantida), o retângulo é fotografado, e o contraste da cor da letra é medido contra cada pixel. Vale o pior 10%, com mínimo de 4,5:1, ou 3:1 em texto grande.
  - **Achados reais:**
    - `.sv-origin` nos topos do RetroAchievements e da Steam (2,85 e 3,60);
    - `dt` do topo das plataformas no tema claro (4,16);
    - `--sv-muted` do `.sv-idhero` (4,21).
  - **Correções:** seção 61 do CSS, e `--sv-muted` do `.sv-idhero` de 0,66 → 0,74.
  - **Falsos positivos descartados:** texto reserva coberto pela capa, cor em `color(srgb …)` e o ícone dourado dentro do `.sv-idhero-kicker`.
  - **Resultado:** 0 casos reais nos dois temas, em todas as fichas, categorias e telas.
- **CSS:**
  - `merge2.py` une regras de mesmo seletor no mesmo bloco só quando nenhuma regra entre elas declara uma propriedade da mesma família. Foram 7 uniões; as outras 130 repetições são sobrescritas intencionais;
  - classes mortas saíram de 4 listas `:is()`;
  - os `:not(.sv-row--head)` ficaram, porque tirá-los mudaria a especificidade.
  - **Prova:** capturas idênticas, exceto o número da versão e o ruído conhecido das animações.
- **Testes:**
  - `checks.js` ganhou classes de CSS sem uso (validada com uma classe falsa), `git ls-files -z` (nomes com acento) e o dicionário JSON válido e fora do código;
  - `functional.js` ganhou 7 testes e passa com 74: dicionário não lido em português; inglês lido do arquivo; foto grande em WebP; janela padrão, escolha da Steam e retrospectiva com nome, Tab preso, Esc e foco de volta; cartão do ano.

### Conquistas Steam no layout novo (versão 3.56.0)

- **Causa:** a página `steamcommunity.com/profiles/<id>/stats/<appId>/achievements/` passou a ser montada em React. Os dados vêm em `<script id="valve-ssr-data">` (`renderContext.queryData.queries`), sem `.achieveRow`. O XML `?xml=1` também não respondia para esses jogos. Resultado: `html_changed` ou falso `private_game_details`, porque a regex `/private|not public/` casava texto comum da página.
- **Correção:** a pessoa enviou um `SteamVaultSteam.js` que foi instalado sem alterações. Diferença em relação à 3.55: só acréscimos e as duas detecções abaixo.
  - **`_parseSsrAchievements`** lê as consultas `schema_v2`, `user_achievements` e `globalpercentages`.
    - Ignora `archived`, `developeronly` e `ispublic === false`.
    - Monta o ícone em `shared.fastly.steamstatic.com/community_assets/images/apps/<appId>/<hash>`, host já aceito pelo download de ícones.
  - **Ordem em `fetchPlayerAchievements`:** página nova → XML → HTML.
  - **Raridade:** `fetchGlobalRarity` e `_applyAchievements` reaproveitam a raridade da página nova.
  - **Privado:** só com frases específicas da Steam.
  - **`not_owned` por `.profile_header` saiu:** a página nova sempre tem o cabeçalho do perfil.
  - **`_writeDebug`:** grava os primeiros 6.000 caracteres de cada resposta em `.steamvault/` (ignorado pelo git) quando nada é reconhecido. Só conteúdo público, sem chave ou token.
- **Segurança:** só `steamcommunity.com`, páginas públicas, sem login, cookie, chave ou API.
- **Limite do teste:** a Steam está bloqueada no ambiente de testes, então o formato foi conferido com uma página simulada na estrutura que o leitor espera, não com a página real.
- **Testes:** `functional.js` ganhou 3 (leitura do `valve-ssr-data`; nota existente casada pelo hash do ícone sem duplicar; conquista nova com raridade, ícone e contadores da ficha) e passa com 77. A versão anterior falharia nos três.

### Hubs de categoria com a identidade do vault (versão 3.57.0)

- **Diagnóstico (capturas enviadas pela pessoa e do harness):**
  - `--sv-id` tingia fundo, contorno, sombra, barras e ícone de cada card (`.sv-gtile`, `.sv-pcard`, `.sv-fcard`, `.sv-dna`, `.sv-submap-row`, `.sv-chiplink--id`);
  - havia listras (`repeating-linear-gradient`) e marcas d'água (`.sv-gtile-mark`, `.sv-pcard-mark`);
  - as barras de afinidade usavam 6 cores sem significado;
  - os cards de plataforma eram altos e vazios, e o resumo eram 4 caixas.
- **Princípio:** a cor de cada categoria fica só no desenho do ícone, `color-mix(in oklab, var(--sv-id) 72%, var(--sv-text))` sobre chip neutro. As superfícies são `--sv-surface`/`--sv-line`, o progresso e a seleção usam `--sv-accent`, e a cor de verdade vem da arte dos jogos.
- **Marcação (`SteamVaultBrowse.js`):**
  - novo `catTile()`, comum a gêneros e subgêneros: faixa `.sv-gtile-art` com a capa desfocada (`.sv-gtile-bg`) e até 3 capas, e corpo com ícone, nome, frase e números. Os `data-*` da busca e da ordenação continuam os mesmos;
  - o card de plataforma virou grade com informações e estante de 4 capas, e a barra ganhou `role="img"` com rótulo;
  - o ponto colorido do fabricante saiu;
  - o rótulo da franquia ficou sem ícone colorido;
  - o gráfico "Gêneros mais jogados aqui" passou a usar as barras padrão.
- **CSS:** a seção 35 foi reescrita no lugar (barra e resumo dos hubs, plataformas, gêneros, franquias, celular), sem sobrescritas empilhadas no fim.
  - As regras do card de plataforma passaram a valer só em `.sv-pcards > .sv-pcard`. Antes, `.sv-pcard-art { position: absolute; opacity: 0 }` também valia para o card do sorteio do "O que jogar?" (`SteamVaultPlay`), que mostrava o card **sem capa**. Conferido antes (opacity 0) e depois (opacity 1).
  - **Topo de identidade:** brilho de 58% → 26%, marca d'água 0,2 → 0,08, listras removidas, selo neutro, kicker em caixa alta neutra.
  - **Linha do tempo, ranking, destaques, estante e navegação:** `--sv-id` → tokens do vault.
  - Nomes e frases dos cards de gênero com até 2 linhas (`line-clamp`).
- **Verificação:**
  - capturas das 4 telas e de 4 páginas de detalhe, no celular e no computador, nos temas escuro e claro;
  - contraste sobre arte (medidor da 3.55) com 0 casos nos dois temas;
  - `checks.js` sem classes de CSS sem uso;
  - desempenho com 1000 jogos (`perf.js`) sem perda: Gêneros 190 contra 193 ms; Plataformas 180–202 ms contra 266–309 ms, em duas rodadas.
- **Testes:** `functional.js` ganhou 5 e passa com 82:
  - cards com faixa de arte, fundo neutro igual e sem marca d'água ou listras;
  - afinidade numa cor só;
  - busca do hub;
  - cards de plataforma compactos e sem ponto colorido;
  - capa do sorteio visível.

### Personalização da Interface (versão 3.58.0)

- **Arquitetura (sem framework novo):**
  - **Perfil de layout:** um JSON em `SteamVaultUI._store("layout")`. `layoutSchema` lista os valores permitidos de cada opção (o primeiro é o padrão); `layoutClean` valida e completa qualquer entrada, com migração tolerante; `layout()` devolve o perfil salvo ou o rascunho da prévia.
  - **Aplicação:** `applyLayout(el)` escreve `data-lay-<seção>-<opção>` no `.sv-app` só para o que difere do padrão, a cada render, em `SteamVault.render`. Padrão completo = nenhum atributo = a interface da 3.57.
  - **Marcação nova (mínima):**
    - `_homeFeatureCards` (destaque em cards);
    - a descrição passou a existir também no hero da ficha (oculta no Original);
    - ordem das abas e aba inicial vindas do perfil;
    - `data-lay-off` na Biblioteca que mantém o card original;
    - `has-wide` / `--sv-art` no card só com o formato Cinematográfico ativo;
    - `is-rating` na nota do card.
  - **Carrossel:** o intervalo e a troca automática vêm do perfil. A transição continua animada mesmo sem troca automática.
  - **Novo módulo `SteamVaultLook.js` (central):** o CustomJS carrega como os outros, `ctx.LK`. Integrado ao `settings(ctx)` antes de "Aparência", e o índice de seções o inclui sozinho.
  - **`accentCss(id)` no UI:** o `_applyAccent` e a prévia usam o mesmo texto.
- **Pré-visualização:**
  - **Por que um iframe isolado:** os pontos de corte do app são classes no `.sv-app`, e não media queries. Uma prévia "computador" desenhada dentro do app num celular herdaria as regras de celular, e as escolhas já aplicadas vazariam para a prévia.
  - **Como funciona:**
    - recebe o mesmo CSS (links do documento e os `<style>` da Game Library), as classes do `body`, tema e destaque do rascunho e as classes de largura calculadas para 390 ou 1280 px;
    - o conteúdo vem dos renderizadores reais (`P.home`, `P.game`, `U.gameCard`, `P.gameHero`, `U.shell`), chamados com o rascunho em `U._layoutDraft` / `U._homeLayoutDraft` só durante a chamada;
    - cliques e envios dentro dela são bloqueados.
  - **Montagem:** o iframe é criado só quando a central se aproxima da tela, com um `IntersectionObserver` cuja raiz é o `.sv-layer`. Com a raiz implícita, o rolador recortava o quadro antes da margem valer.
  - **Tempo:** a atualização leva de 17 a 93 ms no harness (computador), com espera de 90 ms entre toques.
  - **Bug encontrado e corrigido:** o iframe entrava na página antes do `srcdoc`, e o primeiro `load` era o do `about:blank`.
- **Aplicar, Cancelar, Restaurar:**
  - **Aplicar** grava `layout` (vazio quando é o padrão), `theme`, `accent` e `homeLayout` (só os que mudaram) e redesenha, mantendo área, prévia e tamanho.
  - **Cancelar** volta ao salvo.
  - **Restaurar** põe o padrão no rascunho, e Aplicar confirma.
  - Nenhuma gravação em notas: conferido pelo contador de `processFrontMatter` do harness.
- **Combinações:** seis prontas (`layoutPresets()`, com layouts parciais sobre o padrão) e as da pessoa em `layoutPresets` (até 24, nome com até 48 caracteres, validadas na gravação). Renomear, duplicar, atualizar e excluir (com confirmação).
- **Sincronização:** `layout` e `layoutPresets` entraram em `SteamVaultCare.syncKeys`. Nenhum segredo envolvido.
- **CSS (nas seções correspondentes):**
  - 9b (cards), logo antes do hero;
  - Biblioteca, junto dos cards;
  - 10b (modelos do hero), depois das regras do hero;
  - a central, junto do índice das Configurações.
  - **Regras de computador** usam `.sv-app:not(.sv-bp-sm)`, para nunca vazarem para o celular; as de celular partem do layout móvel existente.
  - **Formatos de card** excluem `:where(.sv-library:not([data-view="grid"]), .sv-library[data-lay-off]) *`, com especificidade zero: as visualizações Compacta, Prateleira e Lista não mudam.
  - **Topo imersivo:** as alturas da arte no celular levam `:root` para vencer a regra de `body.sv-immersive-top` (achado nas capturas: o Cinematográfico saía igual ao Horizontal).
  - **Botões da central:** a regra genérica `.sv-host button` fixava altura e `nowrap`; foi corrigido nas miniaturas, combinações e abas, junto da especificidade do estado ativo.
- **Verificação:**
  - **8 tamanhos:** 320, 360, 390, 410, 430, 768, 1024 e 1400 px, com 11 combinações cada (88 telas: Início, Biblioteca e ficha em vários modelos). Nenhum erro de script e nenhuma rolagem lateral.
  - **Ajustes depois das capturas:** em 320 px, Horizontal com respiro no topo e números em blocos com 2 colunas abaixo de 440 px.
  - **Central:** capturada no celular e no computador.
  - **Regressão dos hubs da 3.57 com o padrão:** idênticos, com de 0 a 7 px de ruído. A exceção é a plataforma PC, pelas barras já mudadas na 3.57.
  - **`perf.js 1000`:** igual à 3.57 dentro da variação (abertura 2.914 contra 3.068 ms; Início 814 contra 862; Biblioteca 462 contra 490).
  - **Inglês:** 176 frases novas no dicionário; nenhum texto em português sobrando na central.
- **Testes:**
  - `functional.js` ganhou 20 testes e passa com 102. Entre eles:
    - padrão sem atributos e migração de valores inválidos;
    - sincronização;
    - prévia que muda sem gravar e alternância de tamanho;
    - Cancelar, Aplicar e persistência;
    - nenhuma escrita em notas;
    - cards sobre a capa, ficha Split, ordem das abas, destaque em cards e intervalo do carrossel;
    - combinação pronta, salvar, renomear e excluir;
    - tema claro;
    - Restaurar e Aplicar.
  - Também passam `checks`, `icons` e `smoke`.
- **Limitações conhecidas:**
  - **Ordem dos blocos da Visão geral:** fica fixa. A ordem configurável vale para as seções da Início e as abas da ficha.
  - **Prévia em modo Computador no celular:** é reduzida para caber, então o texto fica pequeno; dá para rolar dentro dela.
  - **Cards em outras telas:** os formatos valem para os cards de jogo (`gameCard`). Os cards especiais de outras telas (Continuar jogando largo, cards de plataforma ou franquia, conquistas) mantêm o desenho próprio.

### Personalização no celular: auditoria e otimizações (versão 3.58.1)

- **Auditorias automáticas (scripts no scratchpad):**
  - **Central em 320, 360 e 390 px:** alvos de toque, estouros e cortes.
  - **29 combinações de modelos × 3 larguras:** título ou capa sob os botões flutuantes, título sobre a capa, estouros, imagens distorcidas (`object-fit: fill` com proporção errada), texto sobre a capa passando da capa e rolagem lateral. Zero achados depois das correções.
  - **Efeito:** cada valor de cada opção comparado com o padrão pelos estilos calculados, no celular e no computador.
- **Achados e correções:**
  1. **Opções sem efeito:** `home.spacing`, `home.shelf` e `game.tabs` não tinham CSS. Foram criadas as regras; no celular, a margem entre seções passou a usar `--sv-home-gap`, com 28 px de padrão.
  2. **`cards.platform`:** a Biblioteca já esconde `.sv-card-plat` nas visualizações onde os formatos valem. A opção saiu da central (o valor salvo continua válido).
  3. **Card cinematográfico:** `url()` em variável CSS é resolvido em relação à folha de estilo. O caminho relativo virava `.obsidian/snippets/vault/...` e dava 404. Agora o endereço é absoluto (`new URL(..., document.baseURI)`), e o fundo reserva fica oculto quando há arte.
  4. **Alvos de toque:**
     - os ⋯ das combinações encolhiam (faltava `flex: none`);
     - segmentos, abas, ordenação e botões da barra passaram a 44 px no celular;
     - as visões da prévia viram ícones; o seletor de tamanho é um botão de alternância no celular;
     - abaixo de 350 px, as visões ganham linha própria (`@media`, só nesta peça da interface do app).
  5. **Grade em coluna:** os controles cresciam até 736 px por falta de `min-width: 0` nos itens flexíveis.
  6. **Ficha centralizada:** números centralizados.
- **Prévia fixa no celular:** `position: sticky` abaixo da fileira de botões flutuantes, com fundo sólido e quadro de até `min(30vh, 260px)`. Nesse modo, `fit()` reduz a escala até caber cerca de 62% da altura do aparelho, centralizado. O recolher fica em `lookPvFolded` (por aparelho, sem sincronizar).
- **Otimizações (`pvperf`, 1000 jogos, CPU 4× mais lenta):**
  - **Chave de marcação da prévia:** visão, destaque em cards, quantidades, ordem das abas, card cinematográfico, Biblioteca original e seções da Início. Quando ela não muda, só atributos, tema, cor e escala são reaplicados (`data-full="0"`); antes, cada toque redesenhava a página inteira.
    - Opção só de CSS: de 402–522 ms para 129–193 ms.
    - Troca de tamanho do aparelho sem redesenhar.
    - Sem a espera de 90 ms entre toques nesse caso.
  - **`warm()`:** cria o iframe e lê o CSS com `requestIdleCallback`. A primeira prévia caiu de 1.491 ms para 223–650 ms.
  - **Seletor dos formatos de card:** de `:not(:where(...) *)` (todos os ancestrais de cada card) para `:is(.sv-shelf-track, .sv-grid:not(:where(...) > *)) > .sv-card` (só o pai). Biblioteca com "Texto sobre a capa": de 596 ms para 419 ms; o padrão leva 397 ms.
- **Testes:** `functional.js` ganhou 6 testes e passa com 108:
  - toda opção mostrada na central tem regra de CSS ou tratamento no código;
  - card cinematográfico com endereço absoluto;
  - opção só de CSS não redesenha a prévia;
  - prévia fixa no celular;
  - recolher;
  - alvos de toque ≥ 44 px.
  - Também passam `checks`, `icons` e `smoke`.

### Modo prateleira: travamento ao rolar (versão 3.58.2)

- **Medição:** harness com 1000 jogos sintéticos, 410×887 com toque e `Emulation.setCPUThrottlingRate` em 4×. A `.sv-layer` é rolada por 90 quadros (passos de 140 e de 45 px) e cada quadro é medido com `requestAnimationFrame`.
  - Antes: prateleira com 111 ms de média e 76 de 90 quadros acima de 50 ms; a grade, com 42 ms.
- **Causas (isoladas por CSS injetado):**
  1. `-webkit-box-reflect` em cada `.sv-card-art`.
  2. `content-visibility: visible`, que desligava o salto dos cards fora da tela. A regra existia para a tábua (`::after`) e o reflexo poderem passar da caixa do card.
  3. Sombras longas na capa e na tábua.
  - O `::after` de brilho das capas (com `translate3d`) pesou pouco e ficou como estava.
- **Correção (CSS, `.sv-app:is(.sv-bp-sm, .is-touch)`):**
  - `-webkit-box-reflect: initial`. Atenção: `none` é descartado pelo Chromium nessa propriedade e o reflexo continuava ativo; a primeira medição "corrigida" estava enganada por isso.
  - Sombras curtas.
  - Só no celular, `content-visibility: auto` de novo. Como a contenção de pintura recorta o que passa da caixa (e `overflow-clip-margin` não vale aqui), a tábua passou para dentro do card: `margin: 0 -9px; padding: 0 9px 22px`, com o vão de 14 px. Isso dá 4 px de sobreposição, mais que o raio de 3 px, e não abre fresta. O `row-gap` caiu para 12 px e a margem negativa dos grupos foi zerada, para manter o espaçamento.
- **Depois:** 45 ms de média (passo de 140 px) e 28 ms (passo de 45 px), contra 43 ms antes. Mesmo nível da grade. Sem rolagem lateral de 320 a 900 px. O computador mantém o reflexo.

### Prévia da central no celular: sem rolar junto por padrão (versão 3.58.3)

- **Relato (gravação de tela do usuário):** a prévia "mexia junto" com a rolagem. Era o `position: sticky` da 3.58.1:
  - presa a 58 px do topo, ela ocupava cerca de metade da tela;
  - no fim do bloco da central, o contêiner a empurrava para cima, por baixo da barra de status e dos botões flutuantes.
- **Correção:**
  - no celular, `.sv-look-pv` passou a `position: relative`, com o quadro de até `min(46vh, 400px)`;
  - o modo preso virou opcional: `.is-pinned`, ligado pelo botão `[data-look-pin]` (ícone de alfinete, com `aria-pressed`). Ele volta ao `sticky` e ao quadro de `min(30vh, 260px)`. A escolha fica em `steamvault:ui:lookPvPinned`, por aparelho e sem sincronizar;
  - o botão some com a prévia recolhida e no computador, onde a coluna lateral continua `sticky`.
- **Teste funcional:** "a prévia fica fixa no topo" foi trocado por dois testes: por padrão a prévia rola com a página, e o alfinete a prende e é lembrado. Agora são 109 testes.

### Otimização completa: seletores indexáveis e listas sob demanda (versão 3.59.0)

- **Levantamento:** `survey.js` no scratchpad. Mede todas as telas do Dashboard e uma ficha, com 1000 jogos sintéticos, 410×887, toque e CPU 4×. Registra o tempo de abrir, o script, o estilo e o layout (`Performance.getMetrics`) e a rolagem por `requestAnimationFrame`.
  - Na maioria das telas, o estilo dominava.
  - O trace `SelectorStats` do Blink mostrou regras com cerca de 26 mil tentativas cada, ou seja, todos os elementos da tela.
- **Causa:** o Blink indexa as regras pelo último composto do seletor (classe, tag, id ou atributo). Um `:is()`/`:where()` com vários argumentos nessa posição vai para o balde universal. Experimento isolado:
  - `.x :is(.a, .b)` faz 4003 tentativas;
  - `.x :is(.a)`, `.x :where(.a)` e `.x :is(.y .a)` fazem 1 ou 2.
- **Correção (`.github/tools/css-index.py`, idempotente):**
  - `X :where(A, B)` vira `X :where(A), X :where(B)`, com a mesma especificidade.
  - `X :is(A, B)` vira `:is()` de um argumento quando as especificidades são iguais. Quando não são, o argumento menor ganha `:not(.sv-nunca)`, que sempre casa, até igualar.
  - O que não dá para igualar (uma tag a mais) fica num `:is()` residual pequeno, com um argumento-guia de mesma especificidade: `.sv-nunca.sv-nunca`.
  - O invólucro tolerante é mantido, então um argumento inválido não derruba a regra.
  - Foram 88 seletores reescritos, sem regras novas.
  - A verificação de classes sem uso (`checks.js`) ignora `sv-nunca`.
- **`:has()` do topo:** `.sv-app:has(.sv-content > .sv-page > :first-child…)` varria a árvore inteira em cada recálculo, cerca de 5 a 7 ms cada. Agora é ancorado pelos filhos diretos, `:has(> :where(.sv-main) > .sv-content > …)`. O `:where` mantém a especificidade.
- **Listas longas:**
  - `content-visibility: auto` nas capas da Tier List e nas linhas `.sv-ra-list > .sv-ra-row`;
  - a capa escolhida ou sendo arrastada fica fora da regra, porque a contenção recortaria o anel;
  - a faixa "Sem classificação" monta 60 capas e o resto em partes de 120 via `requestIdleCallback`;
  - `dragstart` e `dragend` passaram a ser delegados no `root`.
- **Verificação de que nada mudou:** `fingerprint.js` no scratchpad. Faz o hash de todas as propriedades calculadas, com `::before` e `::after`, propriedades ordenadas e `Math.random` fixo.
  - Cobre 102 telas: o Dashboard inteiro, duas fichas e as 4 visualizações da Biblioteca, em 410, 800 e 1300 px. São 112.080 elementos.
  - Antes e depois: só diferem os 24 elementos com `content-visibility` intencional.
- **Resultados (abrir, ms, antes → depois):**
  - Tier List: 7061 → 584 a 806;
  - RetroAchievements: 1498 → 400; RA Jogos: 1422 → 423; RA Conquistas: 1437 → 596;
  - Biblioteca: 1185 → 587; Steam Vitrine: 2276 → 1405; Ícones: 910 → 425.
  - Soma dos seletores no trace da Tier List: 492 → 264 ms.
- **Ainda pesada:** a Steam Vitrine com 12 mil nós. As faixas de "Jogos 100%" e "Favoritos" mostram todas as capas; nos dados sintéticos são centenas.

### Revisão geral: o que acrescentar e melhorar (versão 3.60.0)

- **Auditoria automática** (`c363/audit.js` no scratchpad): todas as telas, em 360, 410 e 1300 px.
  - Verifica rolagem lateral, elementos fora da tela, alvos de toque abaixo de 32 px, texto cortado sem reticências, imagens distorcidas ou quebradas, clicáveis sob os botões flutuantes, ausência de `h1` e erros de script.
  - Encontrou só alvos de toque. A maioria já tinha área invisível (`::after`). Ganharam a mesma área: `.sv-hero-franchise`, `.sv-ovchip` e `.sv-stgantt-row`.
- **Estados apagados (bug antigo):**
  - Componentes com regra base `.X, .sv-host button.X { background… }` têm especificidade (0,2,1). Um `.X.is-active` sozinho (0,2,0) perde em `background`, `color`, `box-shadow` e `opacity`.
  - Um teste no navegador ligou e desligou o estado nos elementos reais, comparando com os vizinhos inativos. Confirmou, entre outros, as abas das Estatísticas e os atalhos da Biblioteca.
  - Correção: 17 regras de estado ganharam a variante `.sv-host button.X.is-*`.
  - Os `:hover` equivalentes ficaram como estavam, porque restaurá-los nos botões deixaria o hover "preso" depois de um toque no celular.
  - A impressão digital dos estilos mostrou diferença só nesses elementos (3 a 13 por tela).
  - Proteção nova no `checks.js`: estados (.is-*) não são apagados pela regra base dos botões. Foi testada com o CSS antigo, em que acusa.
- **Visões salvas:**
  - Chave `lib:views`, que sincroniza pelo prefixo `lib:`.
  - O retrato tem as chaves `status, platform, genre, ach, progress, rating, fav, smart, sort, group, view`, com as listas ordenadas.
  - A visão ativa é a que bate com o estado atual.
  - Toque longo de 550 ms ou `contextmenu`, com uma guarda para o menu abrir uma vez só no Android.
  - O clique depois do toque longo é ignorado.
- **"Ver todos" com filtro:**
  - `data-lib-filter` (JSON) no link `data-open` vira `window.__svLibFilter`, que o `_wireLibrary` consome.
  - Só são aceitas as chaves conhecidas, com os tipos certos.
  - Steam Vitrine: de 12.374 para 1.455 nós, e de 1405 para 342 ms para abrir (1000 jogos, CPU 4×).
- **CSS:** a verificação de seletores indexáveis roda `css-index.py` e exige que ele não mude nada. Sem Python, ela é pulada.
- **Testes:** 6 testes funcionais novos (5 das visões salvas e 1 do "Ver todos" filtrado). Agora são 115.
- **Ficou de fora:** tempo para zerar (HowLongToBeat). O serviço não tem API oficial e exigiria raspagem de páginas, o que as regras do projeto não permitem.

### Coleções no padrão dos hubs de identidade (versão 3.61.0)

- **Antes:**
  - `.sv-cfeature`: cartão gigante com gradiente da cor da coleção;
  - `.sv-ccard`: cartões com fundo colorido e capa quadrada saturada;
  - `.sv-smtile`: automáticas com ícone em quadrado de cor cheia.
  - Isso destoava de Gêneros, Subgêneros, Franquias e Plataformas, que usam superfície neutra e cor só no desenho do ícone (desde a 3.57).
- **Agora (`SteamVaultBrowse`):**
  - `curation()` reaproveita o `.sv-dna`, com o modificador `--col`;
  - `collectionTile()` e `smartTile()` reaproveitam o `.sv-gtile`, com `--col` e `--smart`;
  - extras: `.sv-gtile-progress`, `-pin`, `-mark` e `-plan` (minicapa tipográfica de título planejado, com `--sv-hue` derivado do nome).
  - Os atributos `data-hub-item`, `data-key`, `data-games`, `data-progress` e `data-recent` foram mantidos, então `hubBar` e `wireHubBar` funcionam sem mudança.
  - O card automático é um `<button>`; os estilos de botão foram zerados com a variante `.sv-host button.sv-gtile--smart`.
- **Página da coleção:** `.sv-idhero-mark` igual à dos gêneros; `.sv-plart.is-empty` neutra.
- **Removido** (sem uso): `.sv-cfeature`, `.sv-ccards` e todo o `.sv-smtile*`.
- **Mantido:** `collectionCard()` e `.sv-ccard`, que continuam no card da Início.
- **Toque:** os nomes nas barras do painel ganharam `padding` vertical com margem negativa. Um `::after` seria cortado pelo `overflow` das reticências.
- **Inglês:** 13 frases novas no `en.json`. O modelo do total evita "finished" duplicado, porque a parte com o número já é traduzida sozinha.
- **Testes:** 5 testes funcionais novos: painel e cards, ausência dos cards antigos, abrir e voltar da automática e abrir a coleção. A busca é testada quando há mais de 3 coleções. Agora são 120.
- **Auditoria de telas** (360, 410 e 1300 px): sem estouros, cortes ou erros na Coleções.

### Formulários e auditoria geral (versão 3.62.0)

- **Inspeção:** 27 janelas abertas pelos mesmos `data-action` do app e fotografadas em 320, 410 e 1300 px (`c365/forms.js`).
  - **Herdadas (`SteamVaultLegacy`, `.sv-legacy`):** Adicionar jogo, Editar detalhes, Capa e fundo, Conquistas, Sessões, Zeradas, DLC, Notas, Nova e Editar coleção, Novo gênero e Nova plataforma.
  - **Novas:** Filtros, Exibição, Identidade, Metas, Minha análise, Editar perfil, conexões (Steam, Xbox, RetroAchievements), Importar, Jogos da coleção, Compartilhar, O que jogar e confirmações.
  - **Nas telas:** Configurações e Personalização. Já seguiam o padrão; não mudaram.
- **Diagnóstico por prioridade:**
  - **Críticos:** nenhum. Testes novos de persistência criam um jogo, editam detalhes (conferindo que ano, plataforma, gêneros e sinopse se preservam), registram uma sessão e criam uma coleção.
  - **Altos:**
    - Adicionar jogo e Editar detalhes eram colunas únicas de 1.380 e 1.900 px, sem agrupamento.
    - Os seletores herdados não mostravam a setinha: uma regra posterior com o atalho `background:` zerava o `background-image`.
  - **Médios:**
    - Metas com dois campos numéricos sem rótulo.
    - Editar perfil: `.sv-select` com recuo de 32 px reservado a um ícone ausente, e caixas de seleção nativas.
    - Sem estado de erro visual; o foco não voltava ao campo vazio em Coleção e Gênero.
    - "Remover" visível com a imagem vazia.
    - Em Zeradas, a dificuldade do jogo aparecia depois dos botões do outro formulário.
    - Alturas e cantos diferentes entre os campos novos e os herdados.
  - **Baixos:** prévia da identidade com gradiente saturado; sinopse de 2 linhas; "(opcional)" escrito de três jeitos.
  - **Técnicos sem problema:** um clique triplo em Criar gera uma nota só; um nome vazio é barrado com aviso; não há erros de script.
- **Implementação:**
  - **Seções:** `Legacy.formSec()` cria seções `<section>` ou `<details>` recolhíveis, com resumo. O `addGameForm` e o `gameDetailsEditPanel` foram reorganizados reaproveitando o markup de cada campo (extraído por id). Um script conferiu que nenhum id sumiu ou mudou, e os `wire*` não foram tocados.
  - **`_polishForm()`:** roda em toda janela (`modal()` e `_mountLegacy`) e é idempotente. Faz as etiquetas de opcional e obrigatório e o `aria-required`, e marca `aria-invalid` com foco ao salvar com um obrigatório vazio.
  - **CSS (seção 51):** tokens `--sv-ctl-*` só em `.sv-modal-root` (44 px com `pointer: coarse` ou `body.is-mobile`), seta SVG, caixas de seleção com `appearance: none` e máscara de check, seções, dicas com `order: 2` e seletor de imagem compacto.
  - Seletores passados pelo `css-index.py`, sem estados apagados.
- **Teclado virtual:** já era tratado (`--sv-kb` e o campo centralizado ao focar); confirmado.
- **Verificação:**
  - 7 testes de comportamento novos e 7 de persistência. Agora são 134.
  - Janelas sem estouro lateral e dentro da tela, inclusive em 320 px; tema claro conferido.
  - **Impressão digital de estilos** das 102 telas, nos 3 tamanhos, antes e depois: **idêntica**. As mudanças ficaram só nas janelas.
  - Auditoria visual das telas: sem rolagem lateral, cortes, imagens distorcidas nem erros. Os alvos abaixo de 32 px listados já têm área invisível ampliada; o audit mede só a caixa.

### Sobra no fim das abas das Estatísticas (versão 3.62.1)

- **Relato (gravação):** espaço vazio no fim da faixa `.sv-sttabs`.
- **Causa:** a regra `.sv-app.sv-bp-sm .sv-sttabs { padding-right: 104px }` reservava sempre o lugar dos botões flutuantes. A ficha (`.sv-gamenav`) já fazia isso só com `is-tabs-stuck`.
- **Correção:**
  - o sentinela e o IntersectionObserver de `_restoreScroll` passaram a observar `.sv-gamenav, .sv-sttabs`;
  - o espaço à direita só vale com `is-tabs-stuck`: 108 px, ou 60 px quando um dos botões está oculto;
  - fora disso, o fim fica com a mesma margem do começo (14 px).
- **Varredura** de todas as faixas horizontais das telas (`c366/strips.js`): nenhuma outra com o fim maior que o começo.
- **Teste funcional novo:** a faixa termina rente ao último item. Agora são 135.

### Ações rápidas: arraste do link e capa invisível (versão 3.62.2)

- **Relato (gravação):** na janela aberta pelo toque longo num card, uma caixa cinza com o texto do link e o endereço ("BullyPS2 / …Bully.md") acompanhava o dedo, e a capa do topo era a de texto.
- **Causas:**
  1. No Chromium do Android, segurar um `<a>` inicia um drag-and-drop HTML, e aquela caixa é a sombra do arraste. O `-webkit-touch-callout` não existe no Chromium, então não impedia nada.
  2. `V.modal()` não chamava `_wireImages`. As `img[data-sv-img]` das janelas nunca recebiam `is-loaded` e, no aparelho, ficavam ocultas sob a capa de texto.
- **Correção:**
  - `dragstart` cancelado nos cards e linhas da Biblioteca (`_libLongPress`);
  - `-webkit-user-drag: none` e `user-select: none` nos links e imagens do card;
  - `_wireImages(bodyEl)` em toda janela.
- **Testes funcionais novos** (falham no código anterior e passam no atual): o `dragstart` no link do card é cancelado, e a capa das Ações rápidas fica com `is-loaded`. Agora são 137.

### Abas das Estatísticas sob a barra de status (versão 3.62.3)

- **Relato (gravação):** em Estatísticas › Comparar, com a tela rolada, a faixa `.sv-sttabs` grudava em `top: var(--sv-topbar-h)`, que vale 0 no celular. Ficava por baixo da barra de status, e os botões flutuantes (já alinhados para as abas grudadas desde a 3.62.1) não batiam com ela.
- **Correção (só no celular):**
  - `top: var(--sv-safe-top)` e `scroll-margin-top`, como a `.sv-gamenav`;
  - grudada (`is-tabs-stuck`): fundo sólido, sem desfoque, e `box-shadow: 0 calc(var(--sv-safe-top) * -1) 0 var(--sv-bg)` para cobrir a faixa da barra de status. Um `::before` acima da caixa seria cortado pelo `overflow-x` da faixa.
- **Varredura** dos outros `position: sticky`: só esta faixa usava `--sv-topbar-h` sem margem no celular.
- **Teste funcional novo:** com uma barra de status simulada de 32 px, as abas grudadas ficam em 32 px e cobrem a faixa. Agora são 138.

### Pendências visuais e Completar dados pela Steam (versão 3.63.0)

- **Completar dados pela Steam:** `V.steamDetails()` chama `appdetails` (`cc=br`, `l=portuguese`) pelo `_steamFetchText` já usado.
  - Monta as linhas genre, developer, publisher, releaseYear e summary. A sinopse passa por limpeza de HTML e entidades.
  - Linhas iguais à ficha (comparação por `normalizeKey`) são omitidas, e só os campos vazios vêm marcados.
  - A gravação usa `processFrontMatter` só com o que foi marcado.
  - **Testes** (resposta simulada por `__mockReq`): o item no menu; só o vazio marcado; a sinopse sem HTML; grava só o marcado e preserva desenvolvedora, sinopse e gêneros.
- **Coleção da Início:** `_homeCollection` passou a usar `collectionTile` numa grade (até 4, fixada primeiro).
  - `collectionCard` foi removido e, com ele, as 24 regras `.sv-ccard*`, sem outros usos.
  - O `.sv-plart` continua, porque ainda é usado na página da coleção.
- **Hover:**
  - 26 regras `:hover` apagadas pela regra base ganharam a variante `:where(.sv-host) button.X:hover:where(:not(:disabled))`, só em `@media (hover: hover) and (pointer: fine)`.
  - Elas têm a mesma especificidade da base: vencem a base sem passar por cima dos hovers de contexto.
  - Conferido com o mouse no computador simulado: a aba das Estatísticas ganha fundo.
- **Continuar jogando:** `.sv-libcont-open` foi para baixo e à direita, com `padding-right` no corpo. Antes ficava na mesma faixa vertical da fileira de botões flutuantes (10–50 px) quando o card chegava ao topo.
- **Capa e fundo:** `formSec` com três seções; os ids foram conferidos.
- **Conquista manual:** o placeholder perdia o emoji na limpeza, e o rótulo "— opcional" não era reconhecido. O `_polishForm` agora aceita travessão.
- **Verificação:** 142 testes funcionais; auditoria das telas em 360, 410 e 1300 px sem achados novos.

### Lançamentos, planejador, busca avançada e acessibilidade (versão 3.64.0)

- **releaseDate:** novo campo no schema de notas novas (`buildGameNote`) e no modelo (`C.iso`).
  - Em notas existentes, só é gravado quando preenchido no *Editar detalhes* ou pelo *Completar dados*. Ao apagar o campo, a chave existente fica vazia.
  - O `steamDetails` converte "24 mar. 2023", "24 de mar. de 2023" e "Mar 24, 2023".
- **Em breve:** `PK.upcoming()`, `soonList()` e `soonBlock()`, usados na Lista de desejos e na seção `soon` da Início.
- **Planejador:** `_stPlanData()` e `_stPlanner()` em Estatísticas → Tempo.
  - Estimativa: `estimatedHours`, senão a mediana do gênero entre os zerados, senão a mediana geral, senão 15 h.
  - Ritmo: sessões de 12 semanas ÷ 12, senão `playtime2Weeks` ÷ 2.
- **Busca avançada:** `_libQueryParse()` transforma comandos em regras (`state.qRules`), avaliadas em `_libMatch`. As regras não são salvas no estado persistido.
- **Linha do tempo da ficha:** `<details class="sv-ovtl-all">` com `C.activity(..., { game })`, limitado a 300 itens.
- **Tier List:** o `pump` espera 180 ms sem rolagem e monta em partes de 60 via `requestIdleCallback` (timeout de 600 ms).
- **Contraste** (`.github/tools/audit/contrast.js`): 9 tipos de texto abaixo do mínimo, 0 depois.
  - `--sv-muted`: #8594a6 → #8c9bad (escuro) e #5a6878 → #526070 (claro).
  - Tema claro: `--sv-gold` #946b08 → #805c06 e `--sv-green` #2f7d1f → #286b1a.
  - Botão principal: novos tokens `--sv-primary-hi/lo` (escuro #1278cc → #0a62ad, 5,2:1 com texto branco). Antes, o degradê partia de um azul claro (3,0:1).
  - Funil das Estatísticas e número das jogadas da ficha com fundo/texto ajustados.
  - Medido em 410 e 1280 px, temas escuro e claro.
- **Foco por teclado** (`focus.js`): 690 paradas de Tab em 7 telas, todas com indicador visível (no elemento ou no contêiner via `:focus-within`).
- **Ferramentas:** survey, fingerprint, selstats, layout, strips, forms, scrollperf, contrast e focus em `.github/tools/audit/`, com caminhos relativos ao repositório e `CHROMIUM_PATH` opcional.
- **Testes:** novos casos para a janela de preço-alvo, a busca da aba Coleções, a data no Completar dados, a busca avançada (6), o Em breve, o planejador e o *Ver toda a atividade*. O harness passou a invalidar o cache do modelo após `processFrontMatter`.

### Itens adiados da 3.64: Tier List, editores simples e contraste sobre imagens (versão 3.65.0)

- **Tier List:** um trace da rolagem (`scrollperf.js` com `TRACE=1`) mostrou `Layerize` com ~46 ms por quadro.
  - Causa: `.sv-cover > img.is-loaded { animation: sv-img-in … both }`. O preenchimento `both` de uma animação de `scale` mantém cada capa como camada composta depois do fim.
  - Correção: `backwards`, porque o estado final é o normal, e sem animação nem transição nas capas da Tier List.
  - Resultado: ~120 ms → ~45 ms por quadro. Prateleira e grade continuam iguais (~38 ms).
  - **Desfeito por não ajudar:** miniaturas (`createImageBitmap` + IndexedDB). Com 1000 capas distintas (`DISTINCT=1`): 34 ms com elas e 29 ms sem, na segunda visita; na primeira, pior.
  - **Desfeito por não ajudar:** esconder a capa reserva sob a imagem carregada. Sem efeito medível.
- **Editores simples:** `addCollection`, `editCollection`, `addGenre` e `addPlatform` saíram do `_mountLegacy`.
  - Viraram `B.newCollection`, `B.editCollectionData`, `B.newGenre` e `B.newPlatform`, sobre `_simpleForm()`: `V.modal` com ações no rodapé, Enter salva e `_polishForm`.
  - Os ids dos campos e o conteúdo gravado são os mesmos.
  - Correção: o subgênero criava a nota com `ensureCategoryNote("genre")` e agora usa `"subgenre"`.
  - As funções antigas continuam no `SteamVaultLegacy.js` como reserva, caso o módulo Browse não carregue.
  - Testes: erro sem nome e `aria-invalid`; subgênero em `customSubgenres` com página em `Subgenres/`; Enter na nova plataforma; plataforma repetida recusada; editar coleção carrega e grava.
- **Contraste sobre imagens** (`contrast-images.js`): esconde só a cor do texto, fotografa a área por trás e mede o contraste pixel a pixel. Passa se p10 ≥ o mínimo.
  - Texto coberto por outro elemento (`elementFromPoint`) é ignorado. O título da capa reserva fica sob a capa e não aparece.
  - Resultado: 144 medições (410 e 1280 px, dois temas), 0 abaixo do mínimo.
  - Controle: com `XCSS` injetando texto cinza sem sombra no herói, o script acusa.

### Varredura geral de erros (versão 3.66.0)

- **Métodos:**
  - ESLint (regras de erro: `no-undef`, `no-dupe-keys` e afins) em todos os módulos.
  - `clickall.js`: clica em cada botão, aba e ação de todas as telas. Foram 424 cliques em 410 px/pt e a mesma varredura em 1280 px/en, sem erros.
  - `forms.js`: abre todas as janelas.
  - `fuzz.js`: 5 jogos com frontmatter malformado, em todas as telas e abas, procurando erros e textos "NaN", "undefined", "[object Object]" e "Invalid Date".
  - `i18n-scan.js`: procura português no modo inglês.
  - Revisão de `new Date(...)` e `toISOString()`, de ouvintes em alvos permanentes e de `setInterval`.
  - Checagem dos dados de todas as notas: status, notas, datas, conquistas × jogos, coleções e imagens.
- **Corrigido:**
  - `iconLabel`: 6 chaves duplicadas, e as últimas sobrescreviam os nomes descritivos.
  - `C.num`: vírgula decimal (`/^-?\d+,\d+$/`).
  - `C.iso`: valida o mês e o último dia do mês.
  - `rating` e `_r5()`: limitados a 0–5.
  - `C.localIso()`: substitui `toISOString().slice(0, 10)` onde a data é local. São 8 pontos: auto-datas do Editar detalhes, cartão e nome do arquivo de compartilhar, `date_added` da lista de desejos, planejador, linha de desfazer e `mtime`.
  - `C.today()` passou a usar o mesmo helper. No Legacy, `moment ? … : toISOString` virou `C.today()`.
  - `steamAppId` do jogo identificado entra no `buildGameNote`.
  - Duas frases no `en.json`.
  - O ouvinte de rolagem da Tier List sai quando a tela sai ou quando termina de montar.
- **Fusos horários:** a bateria funcional passa com o navegador em America/Sao_Paulo e em Asia/Tokyo. Em Tóquio, o próprio teste do "Em breve" usava `toISOString` e falhava; foi corrigido para `localIso`.
- **Verificado sem achados:**
  - erros de script (cliques, janelas, dados malformados, vault vazio);
  - layout e faixas (360, 410 e 1300 px);
  - contraste e foco;
  - dados das 67 notas;
  - os demais ouvintes globais (todos protegidos por marcador ou removidos ao desmontar) e intervalos.

### Segunda varredura: duplicações, código morto e escape de HTML (versão 3.67.0)

- **Ferramentas novas:**
  - `.github/tools/css-dups.py`: regras idênticas e declarações mortas por contexto e seletor, com `--fix` e `--all`; preserva o par de fallback dentro da mesma regra.
  - `.github/tools/js-dups.py`: corpos idênticos e métodos nunca citados.
  - `audit/xss.js`: payloads `<img onerror>` em todos os campos de texto de jogo, coleção e conquista. Tem controle com `CONTROL=1`.
  - `audit/clickall.js` com `DEEP=1`: clica também dentro de cada janela aberta, menos em apagar e remover.
- **CSS:** 19 declarações mortas removidas (2 iguais e 17 sobrescritas pelo mesmo seletor no mesmo contexto). Exemplos:
  - `.sv-modal` max-height da linha 3744, sobrescrito em 4107 e 5102;
  - `.sv-herocar-dots` gap e tamanho, sobrescritos em 8756;
  - `.sv-libsum-bar` overflow, sobrescrito em 8750.
  - Resta só `overflow: hidden` → `clip` em `.sv-herocar` (fallback intencional).
  - `fingerprint.js`: **IDÊNTICO** (102 telas, 112.446 elementos).
- **Código morto:** `Legacy.formSectionLabel()` e `.svl-form-section`, CSS e lista de svgify.
- **Escape:** 0 achados em 30 telas, nas abas, em 8 janelas e na busca. O controle acusou.
- **Cliques profundos:** 708 cliques (telas e janelas). Um erro veio do harness, que não tinha `metadataCache.fileToLinktext` (API real do Obsidian): foi acrescentado, com um teste novo de "Adicionar jogos" gravando links `[[…]]`.
- **Lint ampliado:** `array-callback-return`, `no-fallthrough`, `no-unused-expressions` e afins. Os achados restantes são falsos positivos (`new Promise(r => setTimeout(r))`; laço de datas com `setDate`).
- **Sem achados:**
  - assets e notas duplicados (md5);
  - chaves repetidas, vazias ou com marcadores divergentes no `en.json`;
  - páginas do Dashboard duplicadas;
  - `safeUrl` e `esc` consistentes entre os módulos.

### Otimização completa (versão 3.68.0)

- **Medição:** `survey.js` (29 telas) e o novo `bench.js` (mediana de 5–7 aberturas, com `XCSS` para testar hipóteses e `LANG_EN`), além de traces com perfil de CPU e de layout forçado.
- **Layout forçado na render** (`SteamVault.render`):
  - `_observeSize` chamava `apply()` logo após o `innerHTML`, e a render chamava de novo no fim: dois layouts completos.
  - Agora há uma chamada só, com medição prévia (`preSize`: `_measureFit`, largura, altura e `innerHeight`, feitos antes da troca do conteúdo). `_fitLayer` foi dividido em `_measureFit` e `_writeFit`.
  - `has-bottomnav` e `__svStuckWatch` (que leem estilo calculado) foram para o rAF.
  - `_insets()` passou a ser aquecido na medição: o `getComputedStyle` do probe ficava no meio da montagem quando o cache de 30 s expirava.
- **Mais leituras fora de hora:**
  - `_restoreScroll`: o `watch` das abas grudadas vai para o rAF; o `scrollTop = 0` só é escrito quando a posição não é sabidamente 0 (`scroller.__svY`, atualizado quando a rolagem para); `mark(0)` não lê de volta.
  - Carrossel: `translate3d(-pos × 100%)`, com a largura vinda do ResizeObserver.
  - Biblioteca: `scrollRoot` usa `.sv-layer` em vez de subir os pais com `getComputedStyle`.
  - Prateleiras: `_shelfMeasure` lê todas e `_shelfApply` escreve depois (era leitura e escrita alternadas).
- **DOM:**
  - Tier List: fila por faixa (40 por faixa + 60 do "Sem classificação" na hora), com `flushAll()` antes de dragstart, toque e gravação.
  - RA: `U.moreList(…, 30/40)`; na tela Jogos, `expand()` antes de filtrar.
  - `U.stars()`: um `<span>` com três camadas de máscara (`--on` e `<i>` para a meia), no lugar de 5 SVGs.
  - `.sv-icg-grid { content-visibility: auto }`. Testados e descartados por não ajudarem: `content-visibility` nas faixas da Tier List (pior) e nas linhas do RA (sem ganho).
- **Tradução:** TreeWalker com `SHOW_ELEMENT | SHOW_TEXT`, que rejeita as subárvores puladas por `matches()` (era `closest()` por texto); `__svI18nDone` evita o segundo passe do MutationObserver.
- **Estrelas:** antes, `body:not(.theme-light) … .sv-i` pintava as estrelas de branco no tema escuro, por cima de `.sv-star.is-on { color: gold }`. Ficaram douradas nos dois temas, e o contorno apagado usa `--sv-text` a 22%.
- **Resultado** (abertura, `survey.js`, antes → depois): Biblioteca 652 → 437, Tier List 479 → 156, Configurações 438 → 231, RA 413 → 261, RA Jogos 315 → 149, RA Conquistas 327 → 133, Ícones 276 → 133, ficha 420 → 284, Início 373 → 314, Subgêneros 285 → 158, Perfil 243 → 125 ms. Rolagem igual.
- **Testes novos:** estrelas, Tier List (todas as capas e arrastar grava) e carrossel em %. Também conferido: o filtro do RA acha uma linha guardada (1000 jogos) e a tradução continua completa (`i18n-scan.js`).

### Segunda otimização: interações e inicialização (versão 3.69.0)

- **Ferramenta nova:** `audit/interact.js` mede a latência (mediana) de 13 ações até o 2º quadro: busca e filtros da Biblioteca, busca global, abas, janelas. Aceita `XCSS`.
- **Janela de jogos da coleção** (`V.collectionGames`):
  - 60 linhas na hora e o resto por `requestIdleCallback` (partes de 120). `flush()` antes do filtro e de salvar.
  - A contagem vem do `Set` dos marcados, atualizado no `change`.
  - `.sv-picker-list > .sv-picker-item { content-visibility: auto }`.
  - Resultado: 1.319 → 47 ms. Só `content-visibility` dava 432 ms.
- **`_mountLegacy`:** marca `is-open` direto no formulário e no botão, em vez de `btn.click()`. O `openForm` dos 16 editores antigos lia `scrollHeight` para animar a altura, e a janela a zerava em seguida com `maxHeight: none`.
  - Gêneros e subgêneros de Editar detalhes: `model.games.flatMap(g => g.genres/subgenres)` em vez de `L.knownGenres(dv)` (varredura do `dv.pages()`).
  - Resultado: 178 → 101 ms.
- **Inicialização:** a camada nova nasce com `__svY = 0`, e o `_restoreScroll` não grava `scrollTop` (o layout forçado de ~218 ms passou para o quadro normal). Até a 1ª tela: ~1.545 → ~1.256 ms.
- **Correção:** `.sv-modal-root .sv-modal .sv-field--search input.sv-input { padding-left: 36px }`. O padding da seção 51 (formulários, 3.62) anulava o recuo da lupa nos campos de busca dentro de janelas.
- **Descartado:** `content-visibility` nas seções da Início. A mediana caiu de 229 para 186 ms, mas o mínimo não mudou, e o diff de pixels mostrou deslocamento de ~1 px (49 mil pixels diferentes em 1280 px).
- **Avaliado e mantido:** reconstrução do modelo a cada mudança (65–100 ms com 1000 jogos e CPU 4×, a maior parte no `dv.pages()` simulado). As leituras restantes de layout no rAF (prateleiras, abas grudadas, barra inferior) antecipam o primeiro layout do quadro e não duplicam trabalho.
- **Testes:** a contagem da janela de coleção vem dos marcados e a lupa não cobre o texto.

### Xbox sem API: cadastro manual e importação assistida de conquistas (versão 3.70.0)

- **Removido (`SteamVaultPlatforms`):** `msStart`, `msPoll`, `_msEnsure`, `_msGet`, `_xboxCall`, `_xbox`, `_xboxProfile`, `_xboxTitles`, `_xboxAchievements`, `_syncXbox`, `_syncXboxGame`, `_applyAchievements`, `MS_AUTH`/`MS_SCOPE` e os ramos do Xbox em `connect`, `getConfig`, `disconnect`, `syncAll`, `importGame` e `missing`. Em `SteamVaultPlatformPages`, saíram `openXboxConnect` e os painéis de conexão; no CSS, `.sv-xbmode`, `.sv-xbguide`, `.sv-xbdevice`, `.sv-xbcode`, `.sv-xbwait` e `.sv-xbspin`.
- **Xbox como plataforma manual:** `kind: "manual"` no registro, `Core.providerDefs.xbox.sync = ["manual"]`. Nota antiga com `achievementSync: automatic` passa a ser lida como manual sem que a nota seja tocada. `fm.xbox` e `xboxTitleId` continuam lidos.
- **Limpeza da autorização antiga:** `purgeLegacyXbox()` apaga `steamvault-xbox-ms-refresh` e `steamvault-xbox-openxbl-key` do armazenamento local do Obsidian e remove `.steamvault/xbox.json`. Roda no construtor e, se o `app` ainda não estiver pronto, na primeira chamada de `platforms()`. `secretsInventory`/`wipeSecrets` listam e apagam sobras.
- **Cadastro manual (`SteamVaultLegacy`):** campos `svl-f-developer`, `svl-f-publisher`, `svl-f-releasedate`, `svl-f-rating` e `svl-f-notes` (vira `notes[0]`). Plataforma com `/\bxbox\b/` muda a origem para xbox, a menos que você já a tenha trocado (`e.isTrusted`). Depois de criar, `window.__svXboxImportNext` abre o assistente na ficha.
- **Importação assistida (`SteamVaultAchievements`):**
  - `xboxSearchUrl`/`openXboxSearch`: `window.open` só da busca do TrueAchievements, validada por `safeUrl` (https, host `trueachievements.com`). Nenhuma requisição de rede.
  - `parseAchievementText`: CSV/TSV com cabeçalho, tabela por tabulação, uma por linha com `NNG`, barras e blocos (G antes ou depois). Valores acima de 1000 são tratados como o total do jogo; linhas de navegação são filtradas. Texto sem nenhum G e sem descrição não vira conquista. Repetidas são unidas por `normalizeKey`.
  - `_xboxPlan` marca cada item como new, same ou update, e `applyXboxImport` cria as novas (continuando `order`) e atualiza só a descrição e os pontos das existentes, sem tocar em `unlocked` ou `unlockedDate`. A ficha grava `achImport` e, se a origem estava vazia, `achievementProvider: xbox` e `achievementSync: manual`.
  - Prévia editável (nome, descrição, G e etiqueta Nova/Muda/Igual), `V.confirm` antes de atualizar existentes; as conquistas que estão fora da lista são mantidas.
- **Ficha:** `UI.achievementTile(..., { unit: "G" })` mostra o selo `.sv-ach-pts`; a estante mostra `.sv-cabinet-gs` (G conquistado / total) e os botões *Importar conquistas* e *Buscar no TrueAchievements*. Em `Play.huntRow`, quando não há raridade, aparece o G no lugar de "Sem dados".
- **Correções encontradas pelas capturas:** `.sv-xbimp-opt[hidden]` (o `display: flex` vencia o `hidden`); a descrição na prévia com `field-sizing: content`; o selo de G quebrava em duas linhas por causa de `.sv-achgrid.is-editable .sv-ach-side > :not(.sv-ach-check)`, que agora exclui `.sv-ach-pts`. O resumo da prévia separa cada parte num `<span>` para o inglês casar frase por frase.
- **Segurança:** os nomes colados com HTML (`<img onerror>`, `<svg onload>`) não são interpretados na prévia nem na estante, e os nomes de arquivo saem limpos. Nenhum segredo novo, nenhum log de dados.
- **Inglês:** 82 frases novas no `en.json`, entre elas "Nome do jogo", que já faltava. O coletor do modo inglês não encontra texto em português nas telas novas.
- **README:** reescrito com finalidade, tecnologias, seção do Xbox, segurança e capturas reais do harness (`.github/readme/xbox.jpg`); `platforms.png` refeito (Xbox manual). Novo `CHANGELOG.md`.
- **Testes:** 20 funcionais novos (total de 196). `clickall` (DEEP, 713 cliques), `xss` e `i18n` sem erros.

### Conquistas do Xbox de várias fontes (versão 3.71.0)

- **Verificação antes de implementar:** TrueAchievements, XboxAchievements, Exophase, MetaGamerScore e XB.Live não responderam daqui (rede bloqueada). A pesquisa na web não encontrou API pública nem termos de uso de nenhum dos cinco; o único meio automático encontrado foi um raspador de terceiros (Apify) para o TrueAchievements, que exige proxy. Decisão: busca assistida em todas as fontes, sem nenhuma requisição do Vault a esses sites.
- **Registro modular (`SteamVaultAchievements.XBOX_SOURCE_DEFS`):** `id`, `label`, `short`, `host`, `home`, `search(título, versão)`, `covers` e `community` (pontuação própria a ignorar). `openXboxSearch(ctx, path, sourceId, version)` valida o link com `safeUrl` (host da fonte ou `duckduckgo.com`, só https). `xboxSourcesFor(version)` ordena pelas versões cobertas.
- **Versões:** `xboxVersionOf(g)` (plataforma da ficha → Series X|S, One, 360, Xbox original, PC) e `detectXboxVersions(texto, link)`. `detectXboxSource` reconhece a fonte pelo domínio real do link (um domínio diferente com o nome no caminho não engana) ou por menções no texto.
- **Leitor:** `parseAchievementText` agora passa por `_stripCommunityScores` (TA, TA Score, MGS, proporção) e separa o texto por `_setHeader` (*Base game (N achievements)*, *DLC: Nome*, *Nome (N achievements)*, *Nome DLC*); cada parte vai para `_parseSegment` (o leitor anterior). O CSV aceita coluna de conjunto. Linhas com mais de 1000 G no formato "uma por linha" são tratadas como total.
- **Comparação:** `mergeXboxLists(lists, preferredId)` junta por `normalizeKey`, guarda o que cada fonte disse (`cands`) e marca `gDiff`, `dDiff` e `missingIn`. `xboxListStats` dá quantidade, G total e conjuntos. As edições à mão ficam num mapa por conquista e sobrevivem a novas listas e à troca da preferida (lembrada em `steamvault:xbox:prefSource`, armazenamento local).
- **Gravação:** `applyXboxImport` grava `set` nas novas (via `extra`) e nas existentes quando a lista informa o conjunto (nunca apaga um conjunto). `achImport` ganhou `version` e `sources` (até 10, as de mesmo nome substituídas). `_xboxPlan` só compara o conjunto quando a lista traz um.
- **Ficha:** a estante e o menu ⋯ têm um botão só, *Buscar conquistas*. A ação `xbox-ach-search` continua (abre o TrueAchievements).
- **CSS:** seção `.sv-xbs*` (fontes, quadro de comparação, escolhas por fonte); saíram as regras `.sv-xbimp-steps`.
- **Inglês:** 53 frases novas.
- **Testes:** 12 funcionais novos (208 no total): registro, TA Score/MGS, DLC por título e por CSV, versões, detecção de fonte, comparação, links só nos domínios esperados, *Buscar em todas*, escolha de G e gravação de conjuntos e fontes.

### Página salva e ícones (versão 3.72.0)

- **Contexto:** a leitura automática pelo link foi testada com a rede liberada para os cinco sites. TrueAchievements, XboxAchievements e Exophase respondem 403 com o desafio do Cloudflare ("Just a moment…") até no `robots.txt` (Exophase) ou em todas as páginas. O `robots.txt` do MetaGamerScore pede `Crawl-Delay: 600`, proíbe `/achievement/` e as URLs com `?`, e a página inicial devolveu 503. Passar pelo desafio do Cloudflare seria contornar uma proteção, o que não foi feito. A alternativa: o usuário abre a página no navegador e o Vault lê o que ele salva ou copia.
- **`parseMhtml(text)`:** lê o `multipart/related` (limite, `Snapshot-Content-Location`, partes com `Content-Type`, `Content-Transfer-Encoding` base64/quoted-printable/8bit, `Content-Location` e `Content-ID`). Devolve o primeiro `text/html` (decodificado pelo charset) e um mapa endereço → imagem (PNG, JPEG, WebP, GIF, AVIF; até 2 MB cada).
- **`parseAchievementHtml(html, { base, files })`:** remove scripts, estilos, iframes e objetos; agrupa os ancestrais (até 6 níveis) de cada imagem pela assinatura tag + classes e escolhe o grupo que mais se repete com nome e G. Por card: nome (`[class*=title]`, `[class*=name]`, títulos, links, negrito ou `alt`), descrição (`[class*=desc]` ou o texto mais longo), G (classe de pontos sem `ta`/`ratio`/`mgs`/`percent`, depois "NN G" no texto sem pontuações da comunidade, depois o último número isolado) e ícone (`data-src`, `data-original`, `src` ou `srcset`). Os títulos de seção entre os cards definem o conjunto (DLC). Sem molde: `_htmlText` + `parseAchievementText`, com ícones casados pelo `alt`. O link vem de `canonical`, `og:url` ou `base`.
- **Ícones:** os da página salva vêm como bytes; `data:` só PNG/JPEG/WebP; os endereços passam por `C.publicUrl` (só https, sem rede local). `_iconBytes` confere a assinatura do arquivo (PNG, JPEG, GIF, WebP) e o tamanho (32 B a 2 MB) antes de gravar. `applyXboxImport({ icons })` converte com `Steam._compress` (WebP, 256 px) e grava com `Steam._saveBinary`. Endereços remotos são baixados com 150 ms entre um e outro. Conquista que já tem ícone fica com o dela.
- **Janela:** botão *Importar página salva* (`input type=file`, vários arquivos: o `.html` e as imagens da página completa, casadas pelo nome do arquivo), leitura do `text/html` no evento `paste` (vale quando reconhece ao menos 80% do que o texto reconheceu; senão empresta só os ícones, pelo nome), miniaturas na prévia (blob revogado ao importar) e a opção *Salvar N ícones no vault*.
- **Correção encontrada no teste:** `_htmlText` grudava palavras de elementos vizinhos sem espaço (`</b><span>`), e o G de "prólogo.10 G" não era lido. Agora elementos de linha ganham um espaço.
- **Inglês:** 17 frases novas.
- **Testes:** 7 funcionais novos (215 no total): cards com DLC e porcentagem, tabela com TA Score, `.mhtml` com imagens dentro, ícones da rede local e `javascript:` descartados, importação de página salva pela janela com gravação dos ícones e colagem com HTML.

### Favorito com script (versão 3.73.0)

- **`_bookmarkletMain()`:** função autossuficiente que roda na página do site, no navegador do usuário. Usa o mesmo método do leitor de página salva (grupo de ancestrais das imagens com a mesma assinatura, nome, descrição, G sem TA/MGS/porcentagem, títulos de seção para DLC), mas sobre o DOM já desenhado (`innerText`, `currentSrc`). Imagens: o maior entre o tamanho natural, `width` e `clientWidth`, a partir de 16 px; SVG e GIF em `data:` descartados. Ícones: `fetch` sem credenciais, 4 por vez, cada um até 300 KB, total até 6 MB; quando o servidor não permite (CORS), vai o endereço. Copia `GLVAULT-ACH/1` + JSON com `navigator.clipboard.writeText` (com `execCommand("copy")` como reserva) e mostra um aviso na página.
- **`bookmarkletUrl()`:** `javascript:` + `encodeURIComponent` do código (cerca de 11 mil caracteres), com os avisos traduzidos quando o Vault está em inglês.
- **`parseBookmarkletPayload(text)`:** JSON até 12 MB; até 2000 itens; nome 160, descrição 600, conjunto 60 caracteres; G inteiro de 0 a 1000; ícone `data:image/(png|jpeg|webp|gif);base64` até ~560 KB ou `C.publicUrl` https; link só http/https. Repetidas unidas pelo nome.
- **Janela:** seção recolhível *Favorito com script* (passo a passo, *Copiar favorito*, *Colar do favorito* via `navigator.clipboard.readText`). Colar o conteúdo no campo é interceptado (o JSON não fica no campo), e ele entra como a lista da página salva, com a fonte detectada pelo link.
- **Correção encontrada no teste:** o filtro de imagens pequenas usava só o tamanho natural do arquivo; ícones pequenos exibidos ampliados eram descartados.
- **Inglês:** 24 frases novas; o passo a passo ficou sem itálicos no meio das frases, para cada item traduzir inteiro.
- **Testes:** 5 funcionais novos (220 no total): o favorito roda numa página simulada (domínio interceptado pelo Playwright, sem acesso à internet), copia cards, DLC e ícones (inclusive de outro domínio); conteúdo malicioso é barrado; colar e importar com ícones no vault.

### Conquistas do Xbox 100% manuais — reconstrução (versão 3.74.0)

- **Removido (`SteamVaultAchievements`, ~1050 linhas):** registro de fontes (`XBOX_SOURCE_DEFS`), `openXboxSearch`, `detectXboxSource/Versions`, `xboxVersionOf`, `_stripCommunityScores`, `_setHeader`, `parseAchievementText`/`_parseSegment`, `parseMhtml`, `_b64`, `_qp`, `_htmlText`, `parseAchievementHtml`, `readSavedPage`, `_iconBytes`, o favorito (`_bookmarkletMain`, `bookmarkletUrl`, `parseBookmarkletPayload`), `_xboxPlan`, `mergeXboxLists`, `xboxListStats`, `openXboxImport` e `applyXboxImport`. Ficou só `isXbox(g)`. Os hosts `images-eds.xboxlive.com` e `store-images.s-microsoft.com` e o campo `xboxIconUrl` saíram de `_iconHost`/`iconPlan`.
- **Removido (outros):** `SteamVaultPlatforms.purgeLegacyXbox`, `legacySecrets` e o item correspondente em `secretsInventory`/`wipeSecrets`; ações `xbox-ach-search`/`xbox-ach-import`; `__svXboxImportNext`; o texto de conexão da Microsoft que sobrava em `PlatformPages`; CSS `.sv-xbs*` e `.sv-xbimp*` (86 regras); 124 frases do `en.json` que não existem mais no código.
- **Novo módulo `SteamVaultAchManager`** (ctx `AM`):
  - **Dados:** `rows(g)` lê as notas (frontmatter) na ordem; `create`, `update` (data e `unlockSource` ao desbloquear) e `trash` (`fileManager.trashFile`). A janela mantém a própria lista em memória e a atualiza a cada gravação, porque o cache de metadados do Obsidian demora um instante a ver notas novas.
  - **Lote:** `parseBulk(texto, mapeamento)`: separador `|`, tabulação, `;` ou `,` (só com cabeçalho); cabeçalho reconhecido por `COLS`; sem cabeçalho, a ordem é Nome, Descrição, G, Categoria, DLC, Ícone, Observações; seções `## Nome`/`[Nome]`; "Nome — Descrição — 10" sem separador; `_clean` limita os textos e o G (0–1000) e lê "Desbloqueada" (sim/x/1…). Repetidas unidas pelo nome.
  - **Excel:** `readXlsx` abre o `.zip` (diretório central, `deflate-raw` por `DecompressionStream`), lê `sharedStrings`, o `workbook` e as relações para achar a primeira planilha, e converte células (`s`, `inlineStr`, `b`, números) em texto com tabulação.
  - **Ícones:** `squareIcon` (canvas; *cover* corta, *contain* encaixa; até 256 px; WebP ou PNG), `saveIcon` (nunca sobrescreve: acrescenta número), `matchIcon` (nome do arquivo sem número inicial, extensão ou "(1)"; número puro = posição).
  - **Backup:** `backup(g, motivo, rows)` grava JSON pelo `adapter` em `Backups/Conquistas/<Jogo>/` e mantém 10; `restore` só atualiza o que ainda tem nota e recria o resto; `exportCsv` gera CSV com BOM, reimportável.
  - **Janela:** abas Lista/Em lote/Ícones; formulário com *Salvar e próxima*, Enter, *Duplicar*, recorte, DLC; seleção com ações em massa (sai do modo seleção após aplicar); avisos com confirmação antes de excluir ou atualizar.
- **Ficha (`SteamVaultPages`):** botões *Gerenciar conquistas* (a ação `ach-manage` usa o gerenciador novo em jogos de Xbox; as demais origens manuais seguem com o editor de antes) e *Adicionar em lote* (`ach-bulk`, também no menu ⋯); "N restantes" no resumo; *Raras* e *% global* escondidos no Xbox.
- **Correções encontradas nos testes:** o rodapé era redesenhado depois da prévia e desativava *Adicionar* ao carregar uma planilha por arquivo; a restauração tratava como existente uma nota já apagada fora da janela; o botão de cada linha herdava `justify-content: center` do Obsidian.
- **Dados existentes:** o formato das notas de conquista não mudou e nenhuma nota foi alterada ou apagada pela atualização. `achImport` (das versões 3.70–3.73) fica nas notas, sem uso.
- **Testes:** os blocos das versões 3.70–3.73 saíram; 20 testes novos (200 no total).

## 4. Limitações conhecidas

- A cor de destaque extraída da arte depende do navegador permitir ler a imagem; quando não permite, fica o azul padrão.
- O sync da Steam foi escrito contra o formato atual das páginas públicas. Se a Steam mudar o HTML, o app avisa ("formato da página mudou") e preserva os dados anteriores.
- O sync do RetroAchievements foi testado contra uma imitação fiel da Web API oficial, não contra o servidor real (sem internet no ambiente de desenvolvimento). Se o RA mudar algum campo, a tela mostra o erro e nada é apagado.
- Os atalhos do grupo "Obsidian" usam comandos internos do Obsidian (`app:go-back`, `global-search:open`, `markdown:toggle-preview` etc.). Se uma versão futura mudar algum desses nomes, o botão correspondente pode não reagir — "Mostrar controles do Obsidian" continua funcionando como saída.
- **Nuuvem e Instant Gaming não puderam ser verificadas contra as lojas reais** (sem internet no ambiente de desenvolvimento): a leitura foi escrita para os formatos usuais (dados estruturados da página ou cartões de produto), mas se a página real vier em outro formato — ou pedir verificação anti-robô — a loja simplesmente não aparece. O estado real de cada loja aparece em Configurações → Lojas de ofertas. A Instant Gaming vende principalmente em euros; se a página vier em €, o preço é mostrado em € (sem conversão) e não entra no "menor preço" em reais.
- Steam Picks depende do formato das páginas públicas da loja Steam; se a Steam mudar esse formato ou limitar o acesso, a seção simplesmente deixa de aparecer (sem afetar o resto da Home). Os testes usaram uma imitação desses endereços, não a loja real (sem internet no ambiente de desenvolvimento).
- O "fade" das bordas do Obsidian mobile foi neutralizado pelos nomes de contêiner conhecidos; se uma versão futura do Obsidian usar outro elemento para isso, ele pode voltar a aparecer.
- Sem a faixa no topo, ao rolar o conteúdo passa por trás da barra de status; em trechos muito claros da página, os ícones do sistema podem perder contraste.
- A cor dos ícones da barra de status (claros ou escuros) é definida pelo Obsidian conforme o tema, não pelo Steam Vault. No tema escuro combinam com o escurecimento da imagem; no tema claro, o Obsidian pode usar ícones escuros sobre a imagem, e o escurecimento suave ajuda, mas não substitui essa escolha do app.
- A estimativa de áreas seguras (32/18 px) só entra quando nem o sistema nem o Obsidian informam os valores; nos demais casos, os valores reais são usados.
- **Xbox (3.74):** as conquistas são 100% manuais. A leitura de Excel cobre arquivos `.xlsx` comuns (primeira planilha, células de texto e número); fórmulas são lidas pelo último valor salvo no arquivo, e `.xls` antigo não é aceito (salve como `.xlsx` ou CSV). O recorte de ícones é automático (centro), sem ajuste manual de enquadramento.
- A integração GOG foi escrita a partir da documentação e dos formatos conhecidos, e testada contra imitações — não contra os servidores reais (sem internet no ambiente de desenvolvimento). A GOG não documenta o endpoint do perfil público: se o formato mudar, o Vault mostra "formato mudou" e nada é apagado.
- O grau dos troféus PlayStation (Platina/Ouro/Prata/Bronze) vem da categoria definida por você; o Vault não deduz o grau pela raridade. O Gamerscore do Xbox e o XP do Google Play são a soma dos pontos que você registra.
- A GOG sincroniza automaticamente. Xbox (desde a 3.70), Epic Games e PlayStation não têm API pública legítima para o progresso do jogador, então funcionam como perfis manuais (importação por lista e registro manual). Google Play Games não expõe as conquistas do jogador para apps de terceiros. Se alguma plataforma abrir uma API oficial, basta um adaptador novo no registro.
- **Cartão para compartilhar:** o botão *Compartilhar* depende de o aparelho oferecer o compartilhamento de arquivos ao Obsidian; quando não oferece, use *Salvar* e compartilhe a imagem pelo Obsidian ou pelo gerenciador de arquivos. As fontes do cartão são as do sistema (as mesmas da interface).
- A importação por CSV foi testada com arquivos montados no formato documentado do Playnite (Library Exporter) e do Backloggd, não com exportações reais. Se algum app usar outro nome de coluna, a janela deixa escolher a coluna à mão.
- O desempenho foi medido no harness com o Chromium do ambiente de desenvolvimento e CPU desacelerada, não num celular real. A proporção entre telas vale; o tempo absoluto no aparelho depende do processador e da versão do Obsidian.
- A busca de capas pelo nome não pôde ser testada contra a loja real (a rede do ambiente de desenvolvimento bloqueia a Steam). Ela usa o mesmo endereço e o mesmo caminho de rede da verificação de preços da lista de desejos. Nomes que não batem exatamente (edições, subtítulos diferentes) ficam de fora em vez de receber uma capa errada.
- A nota diária usa o plugin *Notas diárias* do próprio Obsidian. Plugins de terceiros que mudam o nome ou a pasta da nota diária (como Periodic Notes) não são lidos; nesse caso a nota de hoje mostrada em Configurações indica onde a linha vai entrar.
- **Tier List com centenas de capas:** desde a 3.65 a rolagem fica perto da prateleira. O que resta é decodificar cada capa no tamanho original na primeira vez que ela aparece; miniaturas foram testadas e não reduziram esse custo no Chromium.
- **Editores antigos (`SteamVaultLegacy.js`):** os quatro formulários simples (coleção, gênero e plataforma) já são janelas nativas desde a 3.65. Os grandes (Adicionar jogo, Editar detalhes, Capa e fundo, Conquistas, Sessões, Trilha sonora, Capturas, DLC e Anotações) continuam no módulo antigo, com o visual novo por CSS e `formSec()`. Reescrevê-los é um trabalho grande, com risco de quebrar fluxos que funcionam, e o ganho para quem usa seria pequeno, porque já têm a mesma aparência.
- O contraste sobre imagens (`contrast-images.js`) foi medido com as artes deste vault. Uma capa ou um fundo muito claro escolhido por você pode ficar abaixo do mínimo em algum texto; o escurecimento e a sombra continuam valendo.
- O antigo formulário "importar conquistas por Game ID" do iiSU foi substituído pelo sync; o código continua no `SteamVaultLegacy.js`, mas não aparece mais na interface.

## Anexo: ícones corrigidos

- Achievements/Celeste/Começar a escalar.md: ícone "Assets/Achievements/Celeste/ComeU00e7ar a escalar.jpg" → "Assets/Achievements/Celeste/Começar a escalar.jpg"
- Achievements/Celeste/Máquinas sem sentido.md: ícone "Assets/Achievements/Celeste/MU00e1quinas sem sentido.jpg" → "Assets/Achievements/Celeste/Máquinas sem sentido.jpg"
- Achievements/Celeste/O Coração da Montanha.md: ícone "Assets/Achievements/Celeste/O CoraU00e7U00e3o da Montanha.jpg" → "Assets/Achievements/Celeste/O Coração da Montanha.jpg"
- Achievements/Celeste/Pesada e frágil.md: ícone "Assets/Achievements/Celeste/Pesada e frU00e1gil.jpg" → "Assets/Achievements/Celeste/Pesada e frágil.jpg"
- Achievements/Celeste/Rasgam o céu.md: ícone "Assets/Achievements/Celeste/Rasgam o cU00e9u.jpg" → "Assets/Achievements/Celeste/Rasgam o céu.jpg"
- Achievements/Celeste/Ressureições.md: ícone "Assets/Achievements/Celeste/RessureiU00e7U00f5es.jpg" → "Assets/Achievements/Celeste/Ressureições.jpg"
- Achievements/Dying Light/A História Toda.md: ícone "Assets/Achievements/Dying Light/A HistU00f3ria Toda.jpg" → "Assets/Achievements/Dying Light/A História Toda.jpg"
- Achievements/Dying Light/Abre-te Sésamo.md: ícone "Assets/Achievements/Dying Light/Abre-te SU00e9samo.jpg" → "Assets/Achievements/Dying Light/Abre-te Sésamo.jpg"
- Achievements/Dying Light/Agora Você Pode Entrar.md: ícone "Assets/Achievements/Dying Light/Agora VocU00ea Pode Entrar.jpg" → "Assets/Achievements/Dying Light/Agora Você Pode Entrar.jpg"
- Achievements/Dying Light/Até que não foi difícil, hein.md: ícone "Assets/Achievements/Dying Light/AtU00e9 que nU00e3o foi difU00edcil, hein.jpg" → "Assets/Achievements/Dying Light/Até que não foi difícil, hein.jpg"
- Achievements/Dying Light/Caça aos Fugitivos.md: ícone "Assets/Achievements/Dying Light/CaU00e7a aos Fugitivos.jpg" → "Assets/Achievements/Dying Light/Caça aos Fugitivos.jpg"
- Achievements/Dying Light/Começos Difíceis.md: ícone "Assets/Achievements/Dying Light/ComeU00e7os DifU00edceis.jpg" → "Assets/Achievements/Dying Light/Começos Difíceis.jpg"
- Achievements/Dying Light/E se você tivesse escolhido o outro.md: ícone "Assets/Achievements/Dying Light/E se vocU00ea tivesse escolhido o outro.jpg" → "Assets/Achievements/Dying Light/E se você tivesse escolhido o outro.jpg"
- Achievements/Dying Light/E você gostou dele, né.md: ícone "Assets/Achievements/Dying Light/E vocU00ea gostou dele, nU00e9.jpg" → "Assets/Achievements/Dying Light/E você gostou dele, né.jpg"
- Achievements/Dying Light/Estava esperando você há tanto tempo.md: ícone "Assets/Achievements/Dying Light/Estava esperando vocU00ea hU00e1 tanto tempo.jpg" → "Assets/Achievements/Dying Light/Estava esperando você há tanto tempo.jpg"
- Achievements/Dying Light/Fidípedes.md: ícone "Assets/Achievements/Dying Light/FidU00edpedes.jpg" → "Assets/Achievements/Dying Light/Fidípedes.jpg"
- Achievements/Dying Light/Invasão.md: ícone "Assets/Achievements/Dying Light/InvasU00e3o.jpg" → "Assets/Achievements/Dying Light/Invasão.jpg"
- Achievements/Dying Light/Isso é Harraaaaan!.md: ícone "Assets/Achievements/Dying Light/Isso U00e9 Harraaaaan!.jpg" → "Assets/Achievements/Dying Light/Isso é Harraaaaan!.jpg"
- Achievements/Dying Light/Isso é Realmente Necessário.md: ícone "Assets/Achievements/Dying Light/Isso U00e9 Realmente NecessU00e1rio.jpg" → "Assets/Achievements/Dying Light/Isso é Realmente Necessário.jpg"
- Achievements/Dying Light/Juntos Até o Fim.md: ícone "Assets/Achievements/Dying Light/Juntos AtU00e9 o Fim.jpg" → "Assets/Achievements/Dying Light/Juntos Até o Fim.jpg"
- Achievements/Dying Light/Mestre Artesão.md: ícone "Assets/Achievements/Dying Light/Mestre ArtesU00e3o.jpg" → "Assets/Achievements/Dying Light/Mestre Artesão.jpg"
- Achievements/Dying Light/Mestre do Judô.md: ícone "Assets/Achievements/Dying Light/Mestre do JudU00f4.jpg" → "Assets/Achievements/Dying Light/Mestre do Judô.jpg"
- Achievements/Dying Light/Mãos suadas.md: ícone "Assets/Achievements/Dying Light/MU00e3os suadas.jpg" → "Assets/Achievements/Dying Light/Mãos suadas.jpg"
- Achievements/Dying Light/Não aprovo diversões sem sentido.md: ícone "Assets/Achievements/Dying Light/NU00e3o aprovo diversU00f5es sem sentido.jpg" → "Assets/Achievements/Dying Light/Não aprovo diversões sem sentido.jpg"
- Achievements/Dying Light/Número da Sorte.md: ícone "Assets/Achievements/Dying Light/NU00famero da Sorte.jpg" → "Assets/Achievements/Dying Light/Número da Sorte.jpg"
- Achievements/Dying Light/Pequeno Artesão.md: ícone "Assets/Achievements/Dying Light/Pequeno ArtesU00e3o.jpg" → "Assets/Achievements/Dying Light/Pequeno Artesão.jpg"
- Achievements/Dying Light/Pérolas na Lama.md: ícone "Assets/Achievements/Dying Light/PU00e9rolas na Lama.jpg" → "Assets/Achievements/Dying Light/Pérolas na Lama.jpg"
- Achievements/Dying Light/Recuperação de Desastre.md: ícone "Assets/Achievements/Dying Light/RecuperaU00e7U00e3o de Desastre.jpg" → "Assets/Achievements/Dying Light/Recuperação de Desastre.jpg"
- Achievements/Dying Light/Senti sua presença.md: ícone "Assets/Achievements/Dying Light/Senti sua presenU00e7a.jpg" → "Assets/Achievements/Dying Light/Senti sua presença.jpg"
- Achievements/Dying Light/Silêncio.md: ícone "Assets/Achievements/Dying Light/SilU00eancio.jpg" → "Assets/Achievements/Dying Light/Silêncio.jpg"
- Achievements/Dying Light/Sussurro Elétrico.md: ícone "Assets/Achievements/Dying Light/Sussurro ElU00e9trico.jpg" → "Assets/Achievements/Dying Light/Sussurro Elétrico.jpg"
- Achievements/Dying Light/Todos Dançando Agora.md: ícone "Assets/Achievements/Dying Light/Todos DanU00e7ando Agora.jpg" → "Assets/Achievements/Dying Light/Todos Dançando Agora.jpg"
- Achievements/Dying Light/Tudo está Escrito.md: ícone "Assets/Achievements/Dying Light/Tudo estU00e1 Escrito.jpg" → "Assets/Achievements/Dying Light/Tudo está Escrito.jpg"
- Achievements/Dying Light/Você sabe que são apenas pontos, né.md: ícone "Assets/Achievements/Dying Light/VocU00ea sabe que sU00e3o apenas pontos, nU00e9.jpg" → "Assets/Achievements/Dying Light/Você sabe que são apenas pontos, né.jpg"
- Achievements/Dying Light/Ágil.md: ícone "Assets/Achievements/Dying Light/U00c1gil.jpg" → "Assets/Achievements/Dying Light/Ágil.jpg"
