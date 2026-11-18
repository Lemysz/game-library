# Game Library: documentação

Manual de referência da **Game Library V1.0 — Prototype**: estrutura, campos, telas, integrações e solução de problemas. A apresentação está no [README](README.md), as mudanças no [CHANGELOG](CHANGELOG.md) e o histórico de desenvolvimento anterior à 1.0 em [docs/archive](docs/archive/README.md).

## Estrutura

```
Dashboard/            telas do app (uma nota = uma tela)
Games/<Plataforma>/   uma nota por jogo (frontmatter = dados)
Achievements/<Jogo>/  uma nota por conquista
Collections/          coleções (lista de jogos no campo `games`)
Genres/, Subgenres/   páginas de gênero e de subgênero
Platforms/            páginas de plataforma
Assets/               capas, fundos, destaques, logos, ícones, trilhas
Assets/Icons/         ícones SVG (genres, platforms, brands, themes, ui)
Scripts/              código (CustomJS)
.obsidian/snippets/steamvault.css   visual
.steamvault/          cache do sync da Steam (criado no primeiro sync)
```

Toda nota tem um único bloco:

````
```dataviewjs
for (let i = 0; i < 200 && !app.metadataCache.getFirstLinkpathDest("Assets/steamvault-boot.js", ""); i++) await new Promise(r => setTimeout(r, 50)); await dv.view("Assets/steamvault-boot", { page: "game" });
```
````

O `Assets/steamvault-boot.js` mostra a tela de carregamento (**Game Library**, com o ícone do controle) enquanto o Obsidian abre, e só nessa hora: ao trocar de aba, a tela anterior fica até a nova estar pronta. Antes dos plugins, quem cuida disso é o snippet; depois, o boot espera o CustomJS e chama `customJS.SteamVault.render(dv, "game")`. A primeira parte da linha espera o celular terminar de listar os arquivos do vault (até 10 s): sem isso, o Dataview às vezes mostrava "custom view not found" por um instante ao abrir o Obsidian. Notas antigas (que chamavam `customJS` direto ou o boot sem essa espera) são atualizadas sozinhas, em segundo plano, uma vez por versão.

Telas disponíveis: `icons` (galeria de ícones), `home`, `library`, `game`, `wishlist`, `collections`, `collection`, `platforms`, `platform`, `genres`, `genre`, `subgenres`, `subgenre`, `franchises`, `franchise`, `integrations`, `achievements`, `achievement`, `tierlist`, `statistics`, `settings`, `steam-profile`, `steam-activity`, `steam-library`, `steam-showcase`, `retro`, `retro-games`, `retro-achievements`, `xbox-profile`, `gog-profile`, `epic-profile`, `psn-profile`, `nintendo-profile`, `googleplay-profile`.

## Scripts

| Arquivo | Papel |
|---|---|
| `SteamVault.js` | Entrada: roteamento, moldura do app, busca, modais, avisos, favoritos, ações de sync |
| `SteamVaultCore.js` | Modelo de dados e **fonte única** dos contadores (conquistas, horas, datas, 100%) |
| `SteamVaultSteam.js` | Sync público da Steam Community |
| `SteamVaultUI.js` | Componentes visuais (cards, hero, barras, ícones SVG) |
| `SteamVaultPages.js` | Início, Biblioteca, ficha do jogo |
| `SteamVaultBrowse.js` | Coleções, Plataformas, Gêneros, Franquias |
| `SteamVaultSteamPages.js` | Perfil, Atividade, Biblioteca e Vitrine Steam |
| `SteamVaultInsights.js` | Conquistas, Tier List, Estatísticas, Configurações |
| `SteamVaultRetro.js` | Sync do RetroAchievements (Web API oficial) |
| `SteamVaultPicks.js` | Ofertas & recomendações no fim da Home (lojas, cache, cards e comparação) e a tela Lista de desejos (histórico, alvo, importação da Steam) |
| `SteamVaultStores.js` | Adaptador da Nuuvem (onde buscar e como ler a loja) |
| `SteamVaultAchievements.js` | Origem × sincronização das conquistas: folha de escolha, marcar como desbloqueada, **editor de conquistas** (Native, Custom e demais origens manuais), migração e gráficos |
| `SteamVaultAchManager.js` | **Gerenciador manual de conquistas** (Xbox): lista com seleção em massa, cadastro sequencial e duplicar, lote por texto, planilha CSV/Excel, ícones em lote com recorte, backup/restauração e exportação CSV |
| `SteamVaultPlatforms.js` | **Integrações de plataformas**: registro de adaptadores (GOG automático; Xbox, Epic, PlayStation, Nintendo e Google Play manuais), rede com limite, cache, vínculo por título, sync e importação. Apaga do aparelho a autorização que tenha sobrado da antiga integração do Xbox |
| `SteamVaultPlatformPages.js` | Perfil GOG (conexão, sincronizar, importar, desconectar), perfis manuais (Xbox, Epic, PlayStation, Nintendo, Google Play) e a seção Integrações das Configurações |
| `SteamVaultShare.js` | Cartão para compartilhar (jogo e perfil): imagem 1080 px em Post 4:5 ou Story 9:16, desenhada no próprio aparelho |
| `SteamVaultHub.js` | **Achievement Hub** (tela Conquistas): registro de perfis por origem, abas dinâmicas montadas sob demanda, números por origem |
| `SteamVaultPlay.js` | Caçador de conquistas, calendário, metas, retrospectiva em Stories, "O que jogar agora?" e coleções automáticas |
| `SteamVaultRetroPages.js` | Perfil RA, Jogos RA, Conquistas RA, resumo na Home, painel na ficha |
| `SteamVaultI18n.js` | Versão em inglês: o tradutor que troca os textos depois que cada tela é desenhada. O dicionário português → inglês fica em `Assets/i18n/en.json` e só é lido com o inglês ligado |
| `SteamVaultLook.js` | Personalização da Interface: modelos da Início, das fichas, dos cards e dos banners, combinações salvas e a pré-visualização real (Configurações) |
| `SteamVaultCare.js` | Preferências entre aparelhos (arquivo `Assets/game-library-preferencias.json`) e backup em .zip na pasta `Backups/` |
| `SteamVaultProfile.js` | Perfil do jogador: nome, avatar, bio, vitrine, DNA gamer, momentos marcantes e contas (`Dashboard/Perfil.md`) |
| `SteamVaultLegacy.js` | Formulários de edição herdados do iiSU, abertos dentro dos modais |

## Schema do jogo

A lista completa está em `SteamVaultCore.gameSchema()`; formulários, importação e modelos usam essa mesma lista.

| Campo | Uso |
|---|---|
| `title`, `platform`, `status` | `status`: `Playing`, `Paused`, `Backlog`, `Completed`, `Dropped`, `Wishlist`. O antigo `Platinum` é lido como `Completed`; o 100% vem das conquistas. |
| `achievementProvider` | **De onde vêm as conquistas**: `steam`, `retroachievements`, `epic`, `gog`, `playstation`, `xbox`, `googleplay`, `native`, `custom`, `none` (Sem conquistas) ou `unset` (Não configurado). |
| `achievementSync` | **Como o vault as mantém**: `automatic`, `manual`, `local` ou `none`. Independente da origem; ver [Conquistas: origem e sincronização](#conquistas-origem-e-sincronização). |
| `xboxTitleId`, `gogId` | IDs do jogo na Xbox e na GOG. O sync da GOG preenche `gogId` sozinho; `gog:` é o cache dele (não edite). `xboxTitleId` e `xbox:` vêm da antiga integração do Xbox (removida antes da 1.0): continuam lidos e nunca são apagados. |
| `achImport` | Registro das importações feitas por ferramentas de desenvolvimento anteriores à 1.0 (que não existem mais). Fica na nota e não é usado. |
| `steamAppId` | Número da URL da loja. Loja, tempo de jogo e artes da Steam; as conquistas sincronizam quando a origem é Steam em modo Automática. |
| `raGameId` | ID do jogo no RetroAchievements (número da URL `retroachievements.org/game/…`). O sync preenche sozinho quando consegue ligar pelo título. |
| `cover`, `coverFicha`, `background`, `featured`, `logo`, `bgPosX/Y`, `bgZoom`, `accent` | Arte e enquadramento do hero. `logo` (imagem transparente) substitui o título no topo. Sem arte, o app gera um fundo próprio. |
| `targetPrice`, `currentPrice`, `regularPrice`, `discountPercent`, `lowestSeenPrice`, `priceStore`, `priceUrl`, `priceCheckedAt` | Lista de desejos: preço-alvo (seu) e preços lidos das lojas (escritos pelo app). |
| `priceHistory` | Histórico de preços escrito pelo app: um ponto por dia (`d` data, `p` preço, `s` loja), até 90 pontos. Alimenta o gráfico e o menor preço já visto. |
| `wishlistAdded`, `purchaseDate` | Data em que o jogo entrou na lista de desejos e data da compra (preenchida por *Comprei*). |
| `hoursPlayed`, `sessions` | Tempo registrado no vault. Com sync, o tempo da Steam tem prioridade. |
| `dateAdded`, `startDate`, `completionDate`, `lastPlayed` | `lastPlayed` nasce vazio e só é preenchido por uma sessão real ou pela Steam. |
| `favorite`, `rating`, `tier`, `franchise`, `genre`, `subgenre` | Organização. |
| `steam:` / `ra:` | Caches dos syncs, escritos pelo app — não edite. |
| `review`, `pros`, `cons`, `recommend` | Minha análise (Visão geral): opinião, prós e contras (listas) e o selo `true` (Recomendo) / `false` (Não recomendo). Editável no botão da própria Visão geral; aparece no cartão de compartilhar. |
| `estimatedHours` | Tempo estimado para zerar. Usado na previsão “faltam ~X h”. Sem ele, a previsão usa o seu histórico: a mediana das horas dos jogos que você zerou, do mesmo gênero (3 ou mais) ou de todos (3 ou mais). |
| `notes` com `pinned: true` | A nota fica fixada no topo da Visão geral (escolha em *Fixar uma nota*). |

Coleções: `games: ["[[Jogo]]", ...]` e `pendingGames: ["Título ainda sem ficha", ...]`.

Campos opcionais da coleção, todos editáveis em *Editar identidade*:

| Campo | Uso |
|---|---|
| `kind` | `goal` (Meta), `marathon` (Maratona), `favorites` (Favoritos) ou `free` (Livre). Sem o campo, o tipo é deduzido do nome |
| `pinned` | `true` fixa a coleção no destaque do hub |
| `accent` / `icon` | Cor (`#rrggbb`) e ícone. Vazio usa o padrão do tipo |
| `cover` | Arte do topo. Vazio usa o mosaico de capas |
| `updated` | Data da última alteração, gravada ao reordenar, remover ou editar |

A ordem de `games` é a ordem manual da lista. Arrastar pela alça ☰ regrava o campo.

## Conquistas: origem e sincronização

Cada jogo tem **duas propriedades separadas**, que nunca se misturam (nem nos dados, nem nos filtros, nem nas estatísticas):

**Origem** (`achievementProvider`), de onde vêm as conquistas:

| Origem | Quando usar | Sincronização aceita |
|---|---|---|
| Steam | Conquistas da Steam | Automática (padrão), Manual |
| RetroAchievements | Conquistas do RA | Automática (padrão), Manual |
| Epic Games, GOG, PlayStation, Google Play Games | Conquistas/troféus dessas plataformas | Manual (ainda não há integração automática no vault) |
| Xbox | Conquistas, ícones e Gamerscore (G) | 100% manual, no gerenciador de conquistas (uma a uma, em lote ou por planilha) |
| Native | Conquistas, troféus ou desafios **próprios do jogo** que nenhum provedor online gerencia: jogos de celular, PS3, PC offline, console sem integração. Não existem subcategorias por aparelho. | Manual (padrão), Local |
| Custom | Conquistas **criadas por você** | Local (padrão), Manual |
| Sem conquistas | O jogo não tem conquistas (a aba some) | Nenhuma |
| Não configurado | Ainda não definido (a aba pede para escolher) | Nenhuma |

**Sincronização** (`achievementSync`), como o vault mantém o progresso:

- **Automática**: o vault busca sozinho (sync da Steam e do RetroAchievements). Só existe onde há integração.
- **Manual**: você registra o que destravou. Na aba Conquistas, cada conquista ganha um botão ✓ para marcar ou desmarcar.
- **Local**: as conquistas existem só no vault (também com o ✓).
- **Nenhuma**: nada para sincronizar.

Exemplos: Steam/Automática, RetroAchievements/Automática, Native/Manual, Custom/Local, Sem conquistas/Nenhuma, Não configurado/Nenhuma. Um jogo Steam pode ter origem Custom: loja, tempo de jogo e artes continuam vindo da Steam, porque isso depende do `steamAppId`, não da origem das conquistas.

- **Onde trocar:** aba *Conquistas* da ficha → *Alterar* (folha com as duas escolhas), *Editar detalhes* ou *Adicionar jogo*. Os modos que a origem não aceita ficam desativados.
- **Filtro:** na Biblioteca, o filtro de troféu tem dois grupos, *Origem* e *Sincronização*, só com o que existe na lista.
- **Estatísticas:** em Conquistas, *Origem e sincronização* mostra os dois gráficos lado a lado.
- **Notas antigas:** `achievementSource` e `gameType` continuam sendo lidos (`manual` vira Native/Manual; sem nada, `steamAppId` → Steam e `raGameId` → RetroAchievements). *Configurações → Conquistas → Migrar conquistas* grava os campos novos e remove os antigos. O Diagnóstico aponta o que falta.

## Integrações de plataformas

Além da Steam e do RetroAchievements (que continuam exatamente como eram), a Game Library conecta outras plataformas quando existe uma forma legítima e segura. Cada uma tem o próprio perfil (menu *Integrações*), aba no hub e card na tela *Integrações*. As automáticas têm **Conectar, Sincronizar, Ativar/Desativar, Sincronizar ao abrir e Desconectar**; as manuais não usam rede.

| Plataforma | Como conecta | O que sincroniza | O que não dá |
|---|---|---|---|
| **Xbox** | **Perfil manual**: gamertag opcional, só para o link do perfil, sem rede | Jogos cadastrados à mão; conquistas, ícones e G cadastrados no gerenciador (uma a uma, em lote ou por planilha); desbloqueio, G e % marcados por você | Leitura automática de qualquer tipo: sem API, sem sites de terceiros |
| **GOG** | Perfil **público** (gog.com/u/usuário), sem login | Nome e avatar, jogos do perfil, tempo de jogo, % de conquistas por jogo, última sessão | Lista individual de conquistas (o perfil só mostra a %) |
| Epic Games | **Perfil manual**: nome opcional, sem rede | Estatísticas a partir do vault; importação de jogos por lista colada | Biblioteca e conquistas: não há API pública; o único acesso é pelas credenciais do launcher (engenharia reversa, fora das regras) |
| PlayStation | **Perfil manual**: ID online opcional (só para o link do perfil público), sem rede | Estatísticas e troféus por grau a partir do vault; importação por lista | Troféus e biblioteca: não há API pública; as ferramentas existentes pedem o token de sessão (NPSSO), que dá acesso à conta inteira |
| Google Play Games | **Perfil manual**: nome de jogador opcional, sem rede | Conquistas, progresso e XP registrados no vault; importação por lista (Android ou PC) | Leitura automática: cada jogo só lê as próprias conquistas e o perfil não é público |
| Nintendo | **Perfil manual**: apelido ou código de amigo opcional, sem rede | Jogos de qualquer console Nintendo do vault, horas, zerados, objetivos registrados; importação por lista com escolha do console | O Switch não tem conquistas e não há API pública; as ferramentas existentes usam o login interno do app Nintendo Switch Online |

- **Automático:** jogos com a origem da plataforma em modo *Automática* sincronizam. Os que não têm ID são ligados pelo título. Em *Manual*, nada é tocado.
- **Importação:** no perfil, *No seu perfil, fora do vault* → *Adicionar* (ou *Adicionar todos*) cria a ficha já ligada (origem da plataforma, sincronização Automática, ID e capa).
- **GOG só em %:** sem a lista de conquistas, o jogo mostra a porcentagem (anel e filtros usam esse valor). Ela não entra nas somas de "conquistas", que contam só conquistas reais.
- **Privacidade:** a chave (RetroAchievements) fica só neste dispositivo, nunca nas notas. Nada de senha, cookie ou token de sessão de navegador. Desconectar apaga a chave e o cache; as fichas ficam.

### Xbox: conquistas 100% manuais

Sem API, site ou internet: as conquistas, os ícones, os G e o progresso são cadastrados por você, no **gerenciador de conquistas** do jogo (`SteamVaultAchManager.js`). Antes da 1.0, as tentativas anteriores (API da Microsoft/OpenXBL, busca e importação de TrueAchievements, XboxAchievements, Exophase, MetaGamerScore e XB.Live, página salva e favorito com script) foram removidas do código. Notas de conquista já existentes continuam valendo, no mesmo formato.

**Cadastrar o jogo:** *Adicionar jogo* → plataforma *Xbox Series*, *Xbox One*, *Xbox 360* ou *Xbox*. A origem das conquistas vira Xbox, e a ficha abre direto no cadastro em lote.

**Abrir o gerenciador:** ficha do jogo › aba Conquistas › **Gerenciar conquistas** ou **Adicionar em lote** (também no menu ⋯ da ficha). No topo ficam total, desbloqueadas, restantes, Gamerscore conquistado/total e a porcentagem.

**Lista**
- Busca, grupos por *Jogo base* e por DLC, ícone, nome, categoria, descrição e G.
- O ✓ de cada linha desbloqueia ou bloqueia com um toque (a data do dia é gravada).
- **Selecionar:** marque várias e aplique *Desbloquear*, *Bloquear*, *Categoria*, *DLC* ou *Excluir*.
- **Exportar CSV**, **Fazer backup** e **Restaurar backup** ficam no fim da lista.

**Cadastro individual**
- Campos: ícone (com recorte *Preencher* ou *Ajustar*), nome, descrição, Gamerscore (G), categoria (História, Exploração, Combate, Colecionáveis… ou a sua), *Jogo base* ou *DLC* (com o nome da DLC), desbloqueada (e a data) e observações. Tudo editável depois.
- **Salvar e próxima** (ou Enter no nome) grava e abre a próxima em branco, mantendo a categoria e a DLC.
- **Duplicar** abre uma cópia da conquista para mudar só o necessário.
- Nomes repetidos no mesmo jogo são barrados.

**Em lote (a forma mais rápida)**
- Uma conquista por linha:

  ```text
  Primeiro passo | Complete o primeiro capítulo | 10
  Guerreiro | Derrote o primeiro chefe | 20 | Combate
  Explorador | Descubra todas as áreas | 30 | Exploração
  ## Farewell
  Adeus | Termine o capítulo 9 | 50 | História
  ```

  Colunas: Nome, Descrição, G, Categoria, DLC (só o nome é obrigatório; também aceita tabulação ou `;` no lugar de `|`). `## Nome` abre uma seção de DLC e `## Jogo base` volta ao jogo base. "10G" vale como 10.
- **Importar planilha:** CSV, TSV ou Excel (`.xlsx`, a primeira planilha). As colunas são reconhecidas pelo cabeçalho (Nome, Descrição, G/Gamerscore, Categoria, DLC, Ícone, Desbloqueada, Data, Observações; também em inglês) e podem ser corrigidas na prévia. O conteúdo vai para o campo de lista, onde dá para editar antes de importar.
- *Categoria para as sem categoria* e *DLC para todas* completam o que faltar.
- A **prévia** mostra quantidade, G e o que é novo ou já existe. Repetidas na lista viram uma só. As que já existem são ignoradas, a menos que você marque *Atualizar as que já existem* (descrição, G, categoria, DLC e ícone; o desbloqueio não muda), o que pede confirmação e faz backup antes.
- Coluna **Ícone**: caminho no vault (`Assets/…/x.png`) ou só o nome do arquivo (procurado em `Assets/Achievements/<Jogo>/` e depois no vault).

**Ícones em lote**
- **Escolher imagens** aceita várias de uma vez. Cada imagem é associada à conquista pelo nome do arquivo (`Guerreiro.png`, `02 - Guerreiro.jpg`, `2.png` = 2ª conquista) ou com **Associar pela ordem** (opcionalmente só nas sem ícone). Cada imagem tem uma lista para trocar a conquista à mão.
- *Preencher* corta para quadrado; *Ajustar* mantém a imagem inteira. Os ícones são salvos em WebP, até 256 px, em `Assets/Achievements/<Jogo>/`. Trocar ou remover um ícone não apaga o arquivo antigo.

**Backup e segurança dos dados**
- Antes de excluir, atualizar em lote ou restaurar, uma cópia das conquistas do jogo (todos os campos, inclusive os caminhos dos ícones) vai para `Backups/Conquistas/<Jogo>/<data> <motivo>.json`. Ficam os 10 mais recentes por jogo. *Fazer backup* grava uma cópia na hora.
- **Restaurar** não apaga nada: as conquistas do backup voltam aos valores dele e as que faltam são recriadas (um backup do estado atual é feito antes).
- Excluir manda a nota para a lixeira do Obsidian; os ícones continuam no vault.
- **Exportar CSV** gera `Backups/Conquistas/<Jogo>/<Jogo> - conquistas.csv`, que pode ser editado no Excel e importado de volta.
- O backup geral do vault (*Configurações › Backup*) também inclui as notas de conquista.

**Na ficha:** a estante mostra cada conquista com ícone, nome, descrição, categoria, selo de G e o estado (desbloqueada ou bloqueada), separadas por *Jogo base* e DLCs, com total, desbloqueadas, restantes, G conquistado/total e porcentagem. O filtro *Raras* e o *% global* não aparecem no Xbox (não há dados de raridade).

### Epic Games e PlayStation (manual)

Menu *Integrações › Perfil Epic* / *Perfil PlayStation*:

- **Configurar perfil:** nome (Epic) ou ID online (PSN). É opcional e validado, e **nunca** é consultado na rede.
- **Importar jogos:** cole uma lista (um título por linha, por exemplo copiada da sua biblioteca). A prévia mostra o que é novo e o que já está no vault, e cria as fichas com a origem da plataforma em modo Manual.
- Conquistas e troféus são registrados pelo editor de conquistas, como antes. O perfil soma tudo e, na PSN, mostra Platina/Ouro/Prata/Bronze.

### Segurança e privacidade

- **Nenhuma senha, cookie ou token de sessão de navegador.** Steam, GOG, Xbox, Epic e PlayStation não usam credencial nenhuma.
- A chave do RetroAchievements fica **só neste dispositivo** (armazenamento local do Obsidian), nunca nas notas, no cache ou no git. O cache de perfis fica em `.steamvault/`, que está no `.gitignore`.
- **Lista de desejos da Steam:** *Lista de desejos › Importar da Steam* lê a lista pública pelo endereço oficial `api.steampowered.com/IWishlistService/GetWishlist`, sem chave e só quando você toca no botão. Usa o SteamID do perfil já conectado. Se a lista for privada, a Game Library avisa e não tenta outro caminho.
- Cada integração só fala com os domínios oficiais dela. Respostas têm tamanho limitado e campos validados. Links vindos da internet só abrem se forem `https`/`http` nos domínios esperados.
- *Configurações › Segurança e privacidade* lista o que está guardado (sem mostrar o valor) e tem **Apagar tudo deste dispositivo**. Para cortar do lado das plataformas:
  - **RetroAchievements:** gerar uma nova Web API Key em *Settings*.
  - **Xbox (quem usou a antiga integração por API, anterior à 1.0):** para revogar o acesso do lado da Microsoft: [account.live.com/consent/Manage](https://account.live.com/consent/Manage); da OpenXBL: painel da xbl.io.
- **Notas e arquivos sincronizados não são confiáveis por padrão:**
  - uma capa da internet só é baixada (cartão para compartilhar) de servidores públicos, nunca de `localhost` ou da rede local;
  - cores das notas só entram na tela se forem `#hex`;
  - links de loja guardados no cache só abrem nos domínios das lojas;
  - o arquivo de preferências compartilhadas é ignorado se passar de 256 KB.

## Destaques da Home e ação da ficha

- **Carrossel de destaques:** o card do topo da Home passa pelos jogos em destaque, trocando a cada 5 segundos, em loop contínuo. Dá para deslizar com o dedo ou arrastar com o mouse, usar as setas (no computador) ou tocar nos pontos.
  - A troca pausa com o ponteiro em cima, durante o arraste, enquanto a página rola, com o carrossel fora da tela e com a aba em segundo plano.
  - Com *Reduzir animações* ligado, a troca automática fica desligada; a navegação manual continua.
- **Quais jogos aparecem:** na ficha, *⋯ › Destacar na Home* (ou o campo `featuredOnHome: true` no frontmatter). Sem nenhum marcado, a Game Library escolhe sozinho: o que você está jogando e os jogos com arte, mais recentes primeiro (até 5). Com um só jogo, o topo fica como antes.
- **Ação principal da ficha:** o Obsidian não executa jogos, então o botão "Jogar" virou **Registrar sessão**, que abre o diário de sessões. É o que alimenta o tempo de jogo, a data da última vez jogada, o calendário, as metas e as estatísticas. Na Home, a ação do card é **Ver ficha**. As páginas da loja e da comunidade continuam no menu ⋯.

## Cartão para compartilhar

- **Jogo:** na ficha, *⋯ › Compartilhar cartão*. Traz a arte de fundo, a capa, o título, a plataforma, o ano, o status, a origem das conquistas, o tempo, as conquistas (com anel) e a nota ou a data em que zerou.
- **Perfil:** no menu da conta (avatar), *Compartilhar perfil*. Traz o avatar, o nome, jogos, horas, conquistas, zerados, jogos com 100%, a nota média e os mais jogados.
- **Formatos:** *Post 4:5* (1080×1350) ou *Story 9:16* (1080×1920). A escolha fica lembrada.
- **Saída:**
  - *Salvar* grava a imagem em `Assets/Compartilhar/`, em JPEG de alta qualidade (100–400 KB);
  - *Abrir* mostra a imagem para compartilhar pelo próprio Obsidian;
  - *Compartilhar* e *Copiar* aparecem quando o aparelho permite.
- Tudo é desenhado no aparelho, sem serviço externo. As imagens entram pelos bytes do arquivo do vault, ou pelo `requestUrl` do Obsidian quando vêm da Steam. Uma imagem que falha vira um fundo, e o cartão nunca quebra.

## Achievement Hub

A tela **Conquistas** virou um hub com um perfil por origem: **Todos · Steam · RetroAchievements · Epic Games · GOG · PlayStation · Xbox · Google Play Games · Native · Custom**. Só aparecem as abas das origens que têm jogos (com só Steam, RA e Native: `Todos | Steam | RetroAchievements | Native`). No celular, as abas rolam para o lado; a ativa fica preenchida na cor da origem, e o hub lembra a última aba aberta.

Cada perfil tem composição própria, sempre com as peças da Game Library (tipografia, cards, anéis, barras, espaçamento, movimento):

| Perfil | Como é |
|---|---|
| Todos | Placar consolidado (conquistas, desbloqueadas, progresso, jogos 100%, em andamento), distribuição por origem (toque abre o perfil), em andamento, recentes, Marcos e progresso por jogo com filtros |
| Steam | O perfil Steam que já existia (mesmo topo, mesma subnavegação), mais raras, progresso e recentes |
| RetroAchievements | O topo RA que já existia, números dos jogos RA do vault, mais raras, progresso com o prêmio (Beaten/Mastered) |
| Epic Games | Vitrine escura e tipográfica: faixa de números, um jogo em destaque grande e cartões largos |
| GOG | Coleção em estantes por estado (em progresso, completos, a começar), em violeta |
| PlayStation | Troféus por grau (Platina, Ouro, Prata, Bronze), azul profundo; o grau vem da **categoria** da conquista |
| Xbox | Gamerscore (soma dos pontos G que você registra) e mosaico de jogos |
| Google Play Games | Pensado para o celular: cabeçalho compacto, recentes em carrossel, cartões pequenos com anel |
| Native | Neutro e universal; cada jogo mostra as próximas conquistas com o ✓ para marcar ali mesmo |
| Custom | Quadro de objetivos pessoais, filtro por categoria, marcar direto no cartão |

- **Sem integração inventada:** Epic, GOG, PlayStation, Xbox e Google Play Games avisam que ainda não têm sincronização automática e funcionam no modo manual. Steam e RetroAchievements continuam sincronizando como antes.
- **Filtros:** cada perfil filtra por progresso (100% · em andamento · 0% · sem dados). A Biblioteca ganhou o filtro *Progresso* (100% / todas desbloqueadas, em andamento / parcialmente, 0% / nenhuma, sem contagem, sem conquistas), ao lado do filtro de origem e sincronização (que inclui *Sem conquistas* e *Não configurado*).
- **Cards:** 🏆 42/50 discreto (84% no celular). Com mais de uma origem na biblioteca, um ponto na cor da origem mostra de onde vêm.
- **Estatísticas:** *Conquistas por origem* (desbloqueadas, total, %) e o par *Origem e sincronização*.
- **Leve:** só a aba ativa é montada; as outras, no primeiro toque (Steam e RA leem o cache deles só nessa hora). Os números por origem são calculados uma vez por revisão dos dados, só quando uma tela pede.

### Editor de conquistas

Para jogos sem sincronização automática (Native, Custom, Epic, GOG, PlayStation, Xbox, Google Play, e Steam/RA em modo Manual): na aba Conquistas do jogo, **Gerenciar conquistas** (em Custom, *Gerenciar objetivos*), ou pelos botões dos perfis Native e Custom.

- Adicionar, editar e excluir (a nota vai para a lixeira do Obsidian).
- Marcar ou desmarcar desbloqueada, com a data.
- Nome, descrição, ícone (escolhido do aparelho e convertido para WebP em `Assets/Achievements/<Jogo>/`), categoria (com sugestões por origem), raridade (Comum → Lendária), pontos (Gamerscore no Xbox, XP no Google Play), secreta e observações.
- Reordenar com ↑ ↓.

Na página de uma conquista manual, os botões *Marcar como desbloqueada* e *Editar* abrem o mesmo editor.

**Modelo de uma conquista** (nota em `Achievements/<Jogo>/`, campos novos todos opcionais): `name`, `description`, `icon`, `category`, `rarityTier` (common, uncommon, rare, epic, legendary), `secret`, `unlocked`, `unlockedDate`, `order`, `notes`, `points`, `game`/`gamePath`. A origem (provider) e o jogo (game ID) vêm do jogo, sem duplicar dado. Nas conquistas da Steam e do RA, a raridade continua vindo da % global. Conquistas secretas aparecem desfocadas até desbloquear (toque revela).

## Recursos gerais

- **Logo do jogo (opcional).** Em *⋯ → Capa e fundo → Logo do jogo*: escolher do dispositivo, colar um link ou caminho, *Baixar da Steam* (com AppID) ou *Remover*. Em *No topo da ficha*, escolha *Mostrar a logo* ou *Mostrar o nome* (campo `showLogo: false`; a logo fica guardada). Sem logo, ou com o nome escolhido, o topo mostra o título como sempre.
- **Artes automáticas da Steam.** Para jogos com `steamAppId`, *⋯ → Baixar artes da Steam* (ou *Biblioteca Steam → Baixar artes*) traz capa, fundo e logo da loja Steam. No celular, as imagens são convertidas para WebP antes de gravar, em `Assets/Covers`, `Assets/Backgrounds` e `Assets/Logos`. Só preenche o que falta; na ficha, substitui.
- **Adicionar da biblioteca Steam.** Em *Biblioteca Steam → No seu perfil, fora do vault*, *Adicionar* (ou *Adicionar todos*) cria a ficha com o AppID, sincroniza as conquistas e baixa as artes.
- **Caçador de conquistas.** Na aba Conquistas da ficha: as que faltam, das mais comuns (mais fáceis) às mais raras, com a dificuldade. O alfinete marca como alvo (campo `target` na nota da conquista). Na Home, *Próximas conquistas* junta seus alvos e as mais fáceis do que está jogando.
- **Marcos do Vault.** Em Conquistas: 13 insígnias com níveis de bronze a diamante (jogos, zerados, 100%, conquistas, lendárias, horas, dias seguidos, plataformas, gêneros, franquias, avaliações, coleções e conquistas de madrugada), todas calculadas pelos seus dados. Um aviso aparece quando um marco sobe de nível.
- **Calendário.** Em Atividade: mês a mês, com os dias de conquistas, sessões, zeradas e começos. Toque num dia para ver o que aconteceu.
- **Metas.** Em Estatísticas → Metas → *Criar meta*: zerar, começar, conquistas, conquistas raras, 100%, horas em sessões ou tamanho máximo do backlog. O progresso é calculado das datas das notas, com o ritmo esperado para o ano. Aparecem também na Home. Ficam no frontmatter de `Dashboard/Estatísticas` (`goals`).
- **Retrospectiva em Stories.** Em Estatísticas → *Retrospectiva*: o ano em tela cheia. Toque à direita avança, à esquerda volta, segurar pausa e arrastar para baixo fecha. A última tela gera a imagem para compartilhar.
- **Completar dados.** Na ficha, *⋯ → Completar dados pelo Wikidata* busca estúdio, distribuidora, gêneros, ano e data de lançamento no [Wikidata](https://www.wikidata.org) (base aberta, domínio público, sem chave). Jogos com AppID também têm *Completar dados pela Steam*. Nos dois, uma revisão mostra só o que difere da ficha: campos vazios vêm marcados e os preenchidos só mudam se você marcar. Quando há várias edições com o mesmo nome, o app escolhe pelo ano da ficha ou pergunta. O ID do Wikidata fica salvo em `wikidataId`.
- **Busca e filtros.** A busca da Biblioteca procura por nome, franquia, plataforma, gênero, subgênero, estúdio, distribuidora e tags, com as palavras em qualquer ordem, e aceita comandos: `status:zerado`, `plataforma:ps2`, `genero:acao`, `subgenero:puzzle`, `franquia:resident`, `dev:capcom`, `dist:rockstar`, `tag:coop`, `nota>4`, `horas>=20`, `ano:2023`, `conquistas>=80` e `fav`. O painel *Filtros* filtra por status, favoritos, plataforma, gênero, subgênero, nota e conquistas. A busca do topo (global) acha jogos pelos mesmos campos, além de coleções, plataformas, gêneros, franquias e conquistas. Na ficha, gênero, subgênero, plataforma, franquia, estúdio e tags são toques que levam à lista correspondente.
- **O que jogar agora?** Card na Home (e o dado da Biblioteca): escolha tempo e vontade e receba sugestões do backlog e do que está em andamento, em cartas. Direita joga, esquerda passa. *Surpreenda-me* sorteia.
- **Alerta de preço.** A Home mostra a lista de desejos com o preço atual no card (dourado quando chega ao `targetPrice`). A verificação roda sozinha quando a seção aparece, no máximo a cada 12 h por jogo, na Steam (AppID) ou na Nuuvem. O botão ↻ verifica agora.
- **Coleções automáticas.** Em Coleções: Jogando agora, Jogados este mês, Quase 100%, Parados há mais de 3 meses, 100%, Nunca jogados, Nota máxima e Mais de 50 horas. Toque para ver os jogos.
- **Gestos (celular).** Puxe o topo para baixo no Início, nas telas Steam e nas telas RA para sincronizar. Deslize a partir da borda esquerda para voltar.

## Ofertas & recomendações (fim da Home)

Prateleira no final da Home com ofertas da **Steam e da Nuuvem**, no mesmo card nativo da Game Library: capa, nome, loja de origem do preço, preço atual, preço original, desconto e — quando a loja informa — avaliação e gênero. Tocar no card abre a página do jogo na loja. Jogos que já estão no vault ficam de fora.

- **Filtro:** Todos | Steam | Nuuvem. Em *Steam*, as abas Ofertas / Mais vendidos / Novidades continuam. Em *Todos*, um card por jogo (com o menor preço entre as lojas na mesma moeda) e 8 cards por vez — *Ver mais* acrescenta outros 8 sem nova consulta.
- **Comparação:** "+N lojas" indica o mesmo jogo em outras listas já carregadas; *Comparar* abre os preços de cada loja lado a lado, com a diferença em reais e o menor preço destacado. Lojas que ainda não tinham o jogo são consultadas só nesse momento.
- **Fontes (públicas, sem chave):** Steam — páginas públicas da loja; Nuuvem — página pública de listagem (dados estruturados da página ou, na falta deles, os cartões de produto). Nada é inventado: o que a loja não informa fica fora do card; preços ficam na moeda da loja, sem conversão.
- **Sob demanda:** nada é consultado ao abrir a Home; ao se aproximar do fim, uma consulta de lista por loja (em paralelo, uma por vez em cada loja); capas e detalhes só dos cards que aparecem.
- **Cache:** 30 min para listas e preços (sessão + `.steamvault/picks.json` / `.steamvault/stores.json`); loja com falha não é tentada de novo por 5 min. Preço vencido nunca aparece como atual.
- **Falhas:** cada loja falha sozinha (as outras continuam). Offline ou com todas falhando, a seção não aparece — sem espaço vazio e sem erro. Em *Configurações → Lojas de ofertas* há o estado de cada loja e um botão *Testar lojas agora*.

## Sincronização com a Steam

A Game Library lê **somente páginas públicas da Steam Community** do perfil que você informar:

- `steamcommunity.com/id/<nome>/?xml=1` ou `/profiles/<SteamID64>/?xml=1` — identidade e privacidade;
- `/stats/<appid>/achievements/?xml=1` — suas conquistas no jogo (HTML como reserva);
- página global de conquistas do jogo — porcentagem de jogadores (raridade);
- `/games/?tab=all&xml=1` — horas e jogos do perfil;
- a página do perfil — nível, insígnias, vitrines, jogados recentemente.

Não usa Steam Web API, `api.steampowered.com`, chave de desenvolvedor, login, senha, cookies ou proxy. Nada privado é acessado.

**Conectar:** *Perfil Steam → Conectar perfil* (ou *Configurações*) e cole a URL. Na Steam, deixe *Meu perfil* e *Detalhes de jogos* como **Público**.

**Comportamento:**
- Uma requisição por vez, ~1,6 s de intervalo, 15 s de timeout, até 2 novas tentativas.
- Se a Steam limitar (429/403), o sync pausa por 15 minutos.
- Cada jogo só é consultado de novo após 12 h (*Forçar tudo* ignora isso).
- Sync automático é opcional e roda no máximo uma vez por sessão do Obsidian.
- Uma leitura bem-sucedida grava as conquistas reais nas notas (`unlockSource: steam`), cria as que faltarem e atualiza tempo e contadores. Uma falha registra o motivo e **não apaga** nada.
- Todo número nas telas Steam diz de onde veio: selo **Steam** (lido do perfil) ou **Vault** (calculado das notas).

## RetroAchievements (seção complementar)

A Steam é a plataforma principal da Game Library; o RetroAchievements tem uma seção própria, completa, mas secundária: último grupo da barra lateral, identidade em dourado discreto, hero menor e só um resumo compacto no fim da Home.

**Telas:** *Perfil RA* (avatar, lema, ranking, pontos hardcore/softcore/TrueRatio, jogados recentemente, conquistas recentes, prêmios e sincronização), *Jogos RA* (todos os jogos com progresso no seu perfil, com filtros e botão para adicionar ao vault) e *Conquistas RA* (linha do tempo dos últimos 90 dias, estatísticas, mais raras e conquistas por console). Na ficha de um jogo RA aparece um painel com console, prêmio, hardcore, pontos, jogadores e sincronização.

**Conectar:** *Perfil RA → Conectar* (ou *Configurações*). Informe seu usuário e sua **Web API Key** (retroachievements.org → Settings → Keys). A chave fica só neste dispositivo — nunca em notas, logs ou no vault. A chave salva pela versão anterior é reaproveitada.

**O que o botão Sincronizar faz, sozinho:**
- lê perfil, ranking, pontos, jogados recentemente, jogos com progresso, prêmios e desbloqueios dos últimos 90 dias;
- liga jogos RA do vault sem `raGameId` pelo título (e console);
- para cada jogo do vault ligado ao RA: cria as notas de conquista que faltam e atualiza todas com desbloqueio, data e hora, **hardcore**, pontos, TrueRatio, raridade (% de jogadores) e tipo (progressão / condição de vitória / perdível) — nada de desbloquear à mão;
- preenche, só se estiverem vazios: desenvolvedora, publicadora, gênero, ano, capa, data de início (primeiro desbloqueio) e data de conclusão (prêmio de zerado/masterizado);
- em *Jogos RA*, **Adicionar** cria a ficha de um jogo do seu perfil e já sincroniza as conquistas (ou *Adicionar todos* para os que têm progresso).

**Comportamento:** só a Web API oficial (retroachievements.org); uma requisição por vez; cache de 12 h por jogo (*Forçar tudo* ignora); pausa de 10 min se o RA limitar; sync automático opcional (uma vez por sessão). Falhas registram o motivo e não apagam nada. Números nas telas RA levam o selo **RA** (do seu perfil) ou **Vault** (das notas).

## Modelos (Templater)

`Games/_Templates/Game Template.md`, `Achievements/_Templates/Achievement Template.md` e `Collections/_Templates/Coleções Template.md` usam os mesmos geradores do app. Os botões *Adicionar jogo* e *Nova coleção* fazem o mesmo sem plugin.

## Aparência

**Tela de Configurações.** Organizada em cinco categorias, com um índice no topo: *Aparência* (tema, cor de destaque, preto puro, tamanho do texto, ícone de favorito e Personalização da Interface), *Efeitos e toque* (animações, brilho, comemoração, inclinação 3D, vibração e sons), *Idioma e rotina* (idioma e nota diária), *Integrações e conquistas* e *Biblioteca e dados* (saúde, backup, importação e diagnóstico).

Segue o tema claro/escuro do Obsidian. Os heros continuam escuros no tema claro, de propósito (arte sobre palco). Em *Style Settings → Game Library*: azul principal, ciano, destaque a partir da arte, largura das capas, arredondamento e densidade compacta. Em *Configurações* do app: reduzir animações.

**Brilho nas capas (estilo Big Picture):** uma faixa de luz atravessa a capa quando você passa o mouse ou foca com o teclado; no celular, ao tocar na capa, e uma vez na capa do jogo aberto. Anima só posição e transparência (roda na GPU, sem recalcular a página), nunca fica em loop e respeita "Reduzir animações". Dá para desligar em *Configurações → Brilho nas capas*.

**Movimento e microinterações:**
- **Entradas.** Ao abrir uma tela, as seções sobem suavemente conforme aparecem, com as capas das prateleiras entrando uma após a outra.
- **Números e barras.** Números de destaque contam até o valor. Barras de progresso, anéis de conquistas, a barra de estado da biblioteca e o mapa de atividade se desenham ao entrar na tela.
- **Arte do topo.** Assenta com um zoom lento quando carrega e rola mais devagar que a página (parallax feito pelo próprio navegador, onde houver suporte).
- **Mouse (desktop).** As capas inclinam em 3D com um reflexo que acompanha o cursor. Coleções, plataformas, gêneros e ofertas ganham uma luz suave sob o cursor, e o botão principal recebe um reflexo.
- **Celular (foco principal).**
  - **Gestos:** arraste a alça de uma janela para baixo para fechá-la (as janelas são painéis que sobem da borda); arraste o menu *Mais* para a esquerda para fechá-lo; deslize um aviso para o lado para dispensá-lo.
  - **Resposta ao toque:** cards e capas afundam sob o dedo; linhas de lista, conquistas, chips e itens de menu acendem na hora; os botões redondos do topo afundam.
  - **Ficha do jogo:** a seção entra pelo lado da aba tocada.
  - **Tier List:** toque numa capa para pegá-la e depois numa faixa (ou em outra capa) para soltar; toque de novo na mesma capa para abrir o jogo.
  - **Galeria:** deslize para o lado para trocar a imagem.
  - **Barra inferior:** a aba ativa ganha uma pílula.
  - **Vibração leve** (Android) ao favoritar, trocar de aba ou filtro, abrir o menu e dispensar janelas e avisos. Desligável em *Configurações → Vibração leve ao tocar*.
- **Comemorações.** Ao marcar um jogo como Zerado, a borda da capa acende em verde por dentro e a faixa de luz atravessa a arte; ao chegar a 100%, a borda acende em dourado e o selo carimba de novo (desligável em *Configurações → Comemoração na ficha ao zerar ou chegar a 100%*). Desbloquear uma conquista à mão acende a linha em verde. Cada uma acontece uma vez, logo depois da mudança.
- **Ícone de favorito nos cards.** Em *Configurações → Ícone de favorito nos cards*, escolha como o favorito aparece na capa: ponto (padrão), selo de vidro, marcador de página, canto dobrado, coração com contorno ou etiqueta "Favorito" na base. No computador, o botão de favoritar continua aparecendo ao passar o mouse.
- **Detalhes.** Favoritar faz o coração pulsar. Listas recolhíveis abrem com o conteúdo descendo suave. Menus, busca, janelas (no celular, painel que sobe da borda) e avisos entram com uma mola curta.
- **Regras.** Tudo roda uma vez e só anima posição/escala/transparência (GPU). Um re-render da mesma tela (salvar, sync, Dataview) troca o conteúdo sem animar nem piscar. *Reduzir animações* (ou a preferência do sistema) desliga tudo. A inclinação 3D pode ser desligada à parte em *Configurações → Inclinação 3D das capas*.

Atalhos: `/` ou `Ctrl/Cmd + K` para buscar; `Esc` fecha menus e modais.

## Celular e tablet

O layout se adapta à largura real da área da nota (não à da janela), então funciona igual no app mobile, em tablets, com painéis divididos ou com a barra lateral do Obsidian aberta:

- **Tablet / janela média:** barra lateral só com ícones; conteúdo em uma coluna.
- **Celular:** menu no botão do topo (a barra de navegação do próprio Obsidian continua embaixo); capas em grade de 3; ficha do jogo com a arte em faixa no topo, capa sobreposta ao lado do título e números em linha; janelas de edição abrem como painel de baixo para cima; campos com fonte de 16 px para o iOS não dar zoom.

Na aba principal, a Game Library é desenhada numa camada própria sobre a área de conteúdo, então fica igual no modo leitura e no modo edição, com qualquer tema. Para editar o texto da nota, use o modo código-fonte. Depois de atualizar os scripts, feche o Obsidian por completo: a versão aparece em *Configurações* do app.

**Modo aplicativo (celular):** em *Style Settings → Game Library → Obsidian mobile → Modo aplicativo* (ligado por padrão). Ligado: nas telas da Game Library somem o **cabeçalho** da nota (barra lateral, caminho, leitura/edição, ⋮) e a **barra inferior** do Obsidian (voltar, avançar, buscar, nova nota, abas, menu) — a interface fica com cara de app, a barra da Game Library assume a navegação e o menu **Mais** traz os atalhos do Obsidian (Voltar, Avançar, Buscar no vault, Nova nota, Editar nota, Menu lateral e *Mostrar controles do Obsidian*, que traz cabeçalho e barra de volta até você trocar de tela). Desligado: cabeçalho e barra do Obsidian funcionam normalmente. Cabeçalho e barra andam juntos, de propósito — não há opção separada. Nas notas comuns, tudo do Obsidian volta sozinho.

**Imagem do topo na área da barra de status:** *Style Settings → Game Library → Obsidian mobile* (ligado por padrão). Nas telas que começam com imagem — fichas de jogo (sempre) e, quando há imagem de fundo, Início, coleções, plataformas, gêneros, perfil Steam e página de conquista — a imagem sobe por trás da barra de status do Android, com um escurecimento suave em cima para os ícones do sistema continuarem legíveis. Textos, botões e ícones continuam abaixo da barra de status. Desligado, a imagem fica limitada à área normal.

**Sem barra superior (celular):** nenhuma faixa no topo, em nenhuma tela — só os botões redondos de pesquisa e perfil, flutuando abaixo da barra de status. Ao rolar, o conteúdo passa por trás deles e da barra de status.

**Áreas seguras (Android/iOS):** em qualquer modo, a Game Library mede quanto da tela fica por baixo da barra de status e da barra de gestos (valores do sistema, do Obsidian ou, no Android edge-to-edge sem informação, uma estimativa) e reserva só esse espaço: nada fica atrás da barra de status, e a barra da Game Library, os menus, as janelas e os avisos ficam acima da barra de gestos. Em paisagem, a barra lateral de ícones rola quando não cabe.

**Topo no celular:** não há barra superior. Pesquisa e perfil ficam como dois botões redondos flutuantes no canto superior direito (vidro sobre a arte, com um degradê suave atrás deles depois de rolar). A lupa abre o campo de busca por cima do topo; o avatar abre o **menu de conta** (Steam e RetroAchievements conectados, último sync, sincronizar, Configurações) — sem repetir a aba *Perfil* da barra inferior. O botão ☰ só aparece quando a barra inferior não está visível. No desktop, a barra superior continua completa.

**Navegação por controle (computador):** com um controle conectado (Xbox, PlayStation ou genérico), o direcional ou o analógico esquerdo move o foco para o item mais próximo naquela direção, **A** abre, **B** volta (ou fecha a janela/menu), **LB/RB** trocam de aba e **Start** abre a busca. Cada card conta como um item só. Desligável em *Configurações → Efeitos e toque → Navegação por controle*.

**Listas de escolha (celular):** os campos de seleção dos formulários abrem uma janela no visual do app, que sobe da borda, com a opção atual marcada e uma busca quando há mais de 10 opções. No computador fica a lista do sistema (que aceita teclado).

**Barra de rolagem:** *Style Settings → Game Library → Obsidian mobile → Ocultar barra de rolagem* (ligado por padrão) esconde o indicador cinza de rolagem vertical nas telas da Game Library e nas áreas internas (menu, janelas, busca, listas). A rolagem por toque, roda do mouse e teclado continua igual.

**Style Settings → Botões do topo:** *Ocultar botão de pesquisa* e *Ocultar ícone de perfil*, independentes (valem no celular e no desktop). Com a pesquisa oculta, os atalhos `/` e `Ctrl+K` ficam desativados.

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| "Game Library não carregou" | CustomJS desligado ou pasta de scripts diferente de `Scripts/`. |
| Tela de carregamento não some | O CustomJS não carregou em 40 s; a própria tela explica o que conferir. Se o Dataview não roda (plugin ausente, desligado ou modo restrito), a tela some em até 25 s e a nota diz o que fazer. |
| Bloco de código em vez da tela | Dataview sem *Enable JavaScript Queries*, ou nota em modo de edição. |
| Tela sem estilo | Snippet `steamvault` desativado. |
| "O perfil Steam precisa ser público" | Privacidade da Steam; nada é contornado. |
| Conquistas de um jogo não chegam | Falta `steamAppId`, ou *Detalhes de jogos* está privado. |
| Nomes de arquivo com `U00e7` | *Configurações → Reparar nomes de arquivo escapados*. |
| Números estranhos | *Configurações → Diagnóstico do vault* lista o que corrigir na origem. |


## Ícones de plataformas

- **Consoles PlayStation e Xbox:** aparecem com o próprio controle ao lado, para ficarem reconhecíveis mesmo pequenos.
- **Marcas:** PlayStation, Xbox, Nintendo, Steam, GOG, Epic Games, RetroAchievements e Google Play Games têm ícones próprios (`b-playstation`, `b-xbox`…). Eles identificam a origem em todo a Game Library: integrações, perfis, hub de Conquistas e selo de origem.
- **Escolher na nota:** use `icon: b-playstation` (ou outro) no frontmatter de uma plataforma, ou o grupo "Marcas e lojas" em *Editar identidade*.

## Integrações e Subgêneros

- **Tela Integrações** (`Dashboard/Integrações`, menu *Integrações › Todas as contas* ou o menu da conta): todas as contas num lugar só.
  - **Resumo:** contas conectadas, fichas sincronizadas, conquistas trazidas, último sync e a origem das conquistas dos seus jogos.
  - **Leitura automática:** Steam, RetroAchievements, Xbox e GOG. Cada card mostra estado (Conectada, Atenção, Pausada, Não conectada), conta, jogos, conquistas e 100% do vault, o que sincroniza e o que não, e as ações (Conectar, Sincronizar, Configurar, Sincronizar ao abrir).
  - **Perfis manuais:** Epic Games e PlayStation (importar lista de jogos, configurar o perfil).
  - **Sem integração disponível:** Google Play Games e Nintendo, com o motivo.
  - **Lojas de ofertas** e **Segurança e privacidade** também ficam aqui. As *Configurações* mostram só um resumo com o estado de cada conta e o botão *Abrir Integrações*.
- **RetroAchievements desconectado:** o Perfil RA mostra um painel único de conexão (3 passos) e os seus jogos RA do vault. *Jogos RA* e *Conquistas RA* mostram o que está nas fichas (progresso, pontos, hardcore, mais raras, por console) com um aviso compacto para conectar. Nenhuma tela repete o botão Conectar.
- **Subgêneros:** funcionam como os gêneros.
  - Hub `Dashboard/Subgêneros` (menu *Biblioteca › Subgêneros*): afinidade, busca e ordenação, um card por subgênero com os gêneros em que aparece, e o mapa *Por gênero*.
  - Cada subgênero tem página própria em `Subgenres/` (`type: subgenre`), criada no primeiro toque se ainda não existir. A página mostra os gêneros em que ele aparece, os melhores, o que jogar agora, os subgêneros que combinam, status e todos os jogos.
  - Na ficha do jogo (Visão geral › Ficha técnica), nos Gêneros e na página de cada gênero, os subgêneros são clicáveis.
  - O campo continua `subgenre` na nota do jogo. *Editar identidade* vale também para subgêneros (cor, ícone, frase e arte).
  - Páginas antigas em `Genres/` usadas só como subgênero foram movidas para `Subgenres/`. Se aparecer outra, o *Diagnóstico do vault* avisa.

## Estatísticas

- **Período:** "Tudo" usa o tempo total de cada jogo; "Este ano", "12 meses" e "30 dias" contam só o que tem data (sessões, zeradas, conquistas, jogos adicionados). Para ver horas por período, registre sessões.
- **Abas:** Visão geral, Tempo, Gosto, Conquistas e Dinheiro. A aba e o período ficam lembrados neste dispositivo.
- **Economia:** usa o campo `regularPrice` (preço normal) quando ele é maior que `price` (o que você pagou).

## Home

- **Personalizar Home** (no fim da página): liga e desliga seções, muda a ordem e escolhe os cartões do painel lateral. A escolha fica salva neste dispositivo.
- **Sua semana:** usa as horas das sessões registradas; sem sessões, conta as atividades do dia.
- **O que jogar agora:** três sugestões do dia; "Sortear com filtros" abre o sorteio completo.

## Biblioteca

- **Filtros:** o botão "Filtros" abre o painel. Toque num chip ativo para removê-lo. Os atalhos acima da grade combinam com a busca, mas não entre si.
- **Exibição:** ordem, agrupamento e visualização (grade, compacta, prateleira ou lista). Tudo fica lembrado neste dispositivo.
- **Toque longo num jogo** (ou botão direito no computador): ações rápidas de status, favorito, coleções e compartilhar.
- **Selecionar (✓):** ações em lote para vários jogos de uma vez.
- **Índice A–Z:** aparece na lateral quando a lista está em ordem de nome e tem 12 jogos ou mais.
- **Plataforma:** aparece na Lista, nos filtros e nos grupos. As capas da Grade, Compacta e Prateleira não levam selo de console.

## Identidade de plataformas, gêneros e franquias

Cada nota em `Platforms/`, `Genres/` e `Franchises/` aceita estes campos opcionais (todos editáveis pelo botão "Editar identidade" da página):

| Campo | O que faz |
|---|---|
| `accent` | Cor da identidade, em hexadecimal (ex.: `#a970ff`). Vazio = cor padrão. |
| `icon` | Nome do ícone (ex.: `ghost`, `gamepad`, `sword`). Vazio = ícone padrão. |
| `description` | Descrição (em gêneros, aparece como a frase do topo). |
| `cover` | Arte do topo da página. Nas franquias, vazio = arte do jogo mais recente. |
| `maker`, `year`, `generation` | Só plataformas: fabricante, ano de lançamento e geração. |

Franquias passam a ter nota própria (`type: franchise`), criada automaticamente na primeira vez que a página é aberta. A ordem da história vem do campo `franchiseOrder` de cada jogo.
