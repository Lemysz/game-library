# Game Library: documentação

Detalhes técnicos e de uso. A apresentação está no [README](README.md), e o histórico de cada versão em [AUDITORIA.md](AUDITORIA.md).

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

O `Assets/steamvault-boot.js` mostra a tela de carregamento (**Game Library**, com o ícone do controle) enquanto o Obsidian abre. Antes dos plugins, quem cuida disso é o snippet; depois, o boot espera o CustomJS e chama `customJS.SteamVault.render(dv, "game")`. A primeira parte da linha espera o celular terminar de listar os arquivos do vault (até 10 s): sem isso, o Dataview às vezes mostrava "custom view not found" por um instante ao abrir o Obsidian. Notas antigas (que chamavam `customJS` direto ou o boot sem essa espera) são atualizadas sozinhas, em segundo plano, uma vez por versão.

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
| `SteamVaultAchManager.js` | **Gerenciador manual de conquistas** (Xbox, 3.74): lista com seleção em massa, cadastro sequencial e duplicar, lote por texto, planilha CSV/Excel, ícones em lote com recorte, backup/restauração e exportação CSV |
| `SteamVaultPlatforms.js` | **Integrações de plataformas**: registro de adaptadores (GOG automático; Xbox, Epic, PlayStation, Nintendo e Google Play manuais), rede com limite, cache, vínculo por título, sync e importação. Desde a 3.70 apaga do aparelho a autorização que tenha sobrado da antiga integração do Xbox |
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
| `xboxTitleId`, `gogId` | IDs do jogo na Xbox e na GOG. O sync da GOG preenche `gogId` sozinho; `gog:` é o cache dele (não edite). `xboxTitleId` e `xbox:` vêm da antiga integração do Xbox (removida na 3.70): continuam lidos e nunca são apagados. |
| `achImport` | Registro das importações feitas pelas versões 3.70–3.73 (que não existem mais). Fica na nota e não é usado. |
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
| `estimatedHours` | Tempo estimado para zerar. Usado na previsão “faltam ~X h”. |
| `notes` com `pinned: true` | A nota fica fixada no topo da Visão geral (escolha em *Fixar uma nota*). |

Coleções: `games: ["[[Jogo]]", ...]` e `pendingGames: ["Título ainda sem ficha", ...]`.

Campos opcionais da coleção (versão 3.10), todos editáveis em *Editar identidade*:

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
| Xbox | Conquistas, ícones e Gamerscore (G) | 100% manual, no gerenciador de conquistas (uma a uma, em lote ou por planilha) (3.74) |
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

## Integrações de plataformas (versão 3.3–3.5)

Além da Steam e do RetroAchievements (que continuam exatamente como eram), a Game Library conecta outras plataformas quando existe uma forma legítima e segura. Cada uma tem o próprio perfil (menu *Integrações*), aba no hub e card na tela *Integrações*. As automáticas têm **Conectar, Sincronizar, Ativar/Desativar, Sincronizar ao abrir e Desconectar**; as manuais não usam rede.

| Plataforma | Como conecta | O que sincroniza | O que não dá |
|---|---|---|---|
| **Xbox** | **Perfil manual**: gamertag opcional, só para o link do perfil, sem rede | Jogos cadastrados à mão; conquistas, ícones e G cadastrados no gerenciador (uma a uma, em lote ou por planilha); desbloqueio, G e % marcados por você (3.74) | Leitura automática de qualquer tipo: sem API, sem sites de terceiros |
| **GOG** | Perfil **público** (gog.com/u/usuário), sem login | Nome e avatar, jogos do perfil, tempo de jogo, % de conquistas por jogo, última sessão | Lista individual de conquistas (o perfil só mostra a %) |
| Epic Games | **Perfil manual**: nome opcional, sem rede | Estatísticas a partir do vault; importação de jogos por lista colada | Biblioteca e conquistas: não há API pública; o único acesso é pelas credenciais do launcher (engenharia reversa, fora das regras) |
| PlayStation | **Perfil manual**: ID online opcional (só para o link do perfil público), sem rede | Estatísticas e troféus por grau a partir do vault; importação por lista | Troféus e biblioteca: não há API pública; as ferramentas existentes pedem o token de sessão (NPSSO), que dá acesso à conta inteira |
| Google Play Games | **Perfil manual**: nome de jogador opcional, sem rede | Conquistas, progresso e XP registrados no vault; importação por lista (Android ou PC) | Leitura automática: cada jogo só lê as próprias conquistas e o perfil não é público |
| Nintendo | **Perfil manual**: apelido ou código de amigo opcional, sem rede | Jogos de qualquer console Nintendo do vault, horas, zerados, objetivos registrados; importação por lista com escolha do console | O Switch não tem conquistas e não há API pública; as ferramentas existentes usam o login interno do app Nintendo Switch Online |

- **Automático:** jogos com a origem da plataforma em modo *Automática* sincronizam. Os que não têm ID são ligados pelo título. Em *Manual*, nada é tocado.
- **Importação:** no perfil, *No seu perfil, fora do vault* → *Adicionar* (ou *Adicionar todos*) cria a ficha já ligada (origem da plataforma, sincronização Automática, ID e capa).
- **GOG só em %:** sem a lista de conquistas, o jogo mostra a porcentagem (anel e filtros usam esse valor). Ela não entra nas somas de "conquistas", que contam só conquistas reais.
- **Privacidade:** a chave (RetroAchievements) fica só neste dispositivo, nunca nas notas. Nada de senha, cookie ou token de sessão de navegador. Desconectar apaga a chave e o cache; as fichas ficam.

### Xbox: conquistas 100% manuais (3.74)

Sem API, site ou internet: as conquistas, os ícones, os G e o progresso são cadastrados por você, no **gerenciador de conquistas** do jogo (`SteamVaultAchManager.js`). A partir da 3.74, as tentativas anteriores (API da Microsoft/OpenXBL, busca e importação de TrueAchievements, XboxAchievements, Exophase, MetaGamerScore e XB.Live, página salva e favorito com script) foram removidas do código. Notas de conquista já existentes continuam valendo, no mesmo formato.

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
  - **Xbox (quem usou a integração por API, até a 3.69):** para revogar o acesso do lado da Microsoft: [account.live.com/consent/Manage](https://account.live.com/consent/Manage); da OpenXBL: painel da xbl.io.
- **Notas e arquivos sincronizados não são confiáveis por padrão (3.24.2):**
  - uma capa da internet só é baixada (cartão para compartilhar) de servidores públicos, nunca de `localhost` ou da rede local;
  - cores das notas só entram na tela se forem `#hex`;
  - links de loja guardados no cache só abrem nos domínios das lojas;
  - o arquivo de preferências compartilhadas é ignorado se passar de 256 KB.

## Destaques da Home e ação da ficha (versão 3.7)

- **Carrossel de destaques:** o card do topo da Home passa pelos jogos em destaque, trocando a cada 5 segundos, em loop contínuo. Dá para deslizar com o dedo ou arrastar com o mouse, usar as setas (no computador) ou tocar nos pontos.
  - A troca pausa com o ponteiro em cima, durante o arraste, enquanto a página rola, com o carrossel fora da tela e com a aba em segundo plano.
  - Com *Reduzir animações* ligado, a troca automática fica desligada; a navegação manual continua.
- **Quais jogos aparecem:** na ficha, *⋯ › Destacar na Home* (ou o campo `featuredOnHome: true` no frontmatter). Sem nenhum marcado, a Game Library escolhe sozinho: o que você está jogando e os jogos com arte, mais recentes primeiro (até 5). Com um só jogo, o topo fica como antes.
- **Ação principal da ficha:** o Obsidian não executa jogos, então o botão "Jogar" virou **Registrar sessão**, que abre o diário de sessões. É o que alimenta o tempo de jogo, a data da última vez jogada, o calendário, as metas e as estatísticas. Na Home, a ação do card é **Ver ficha**. As páginas da loja e da comunidade continuam no menu ⋯.

## Cartão para compartilhar (versão 3.6)

- **Jogo:** na ficha, *⋯ › Compartilhar cartão*. Traz a arte de fundo, a capa, o título, a plataforma, o ano, o status, a origem das conquistas, o tempo, as conquistas (com anel) e a nota ou a data em que zerou.
- **Perfil:** no menu da conta (avatar), *Compartilhar perfil*. Traz o avatar, o nome, jogos, horas, conquistas, zerados, jogos com 100%, a nota média e os mais jogados.
- **Formatos:** *Post 4:5* (1080×1350) ou *Story 9:16* (1080×1920). A escolha fica lembrada.
- **Saída:**
  - *Salvar* grava a imagem em `Assets/Compartilhar/`, em JPEG de alta qualidade (100–400 KB);
  - *Abrir* mostra a imagem para compartilhar pelo próprio Obsidian;
  - *Compartilhar* e *Copiar* aparecem quando o aparelho permite.
- Tudo é desenhado no aparelho, sem serviço externo. As imagens entram pelos bytes do arquivo do vault, ou pelo `requestUrl` do Obsidian quando vêm da Steam. Uma imagem que falha vira um fundo, e o cartão nunca quebra.

## Achievement Hub (versão 3.2)

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

## Recursos da versão 3.0

- **Logo do jogo (opcional).** Em *⋯ → Capa e fundo → Logo do jogo*: escolher do dispositivo, colar um link ou caminho, *Baixar da Steam* (com AppID) ou *Remover*. Em *No topo da ficha*, escolha *Mostrar a logo* ou *Mostrar o nome* (campo `showLogo: false`; a logo fica guardada). Sem logo, ou com o nome escolhido, o topo mostra o título como sempre.
- **Artes automáticas da Steam.** Para jogos com `steamAppId`, *⋯ → Baixar artes da Steam* (ou *Biblioteca Steam → Baixar artes*) traz capa, fundo e logo da loja Steam. No celular, as imagens são convertidas para WebP antes de gravar, em `Assets/Covers`, `Assets/Backgrounds` e `Assets/Logos`. Só preenche o que falta; na ficha, substitui.
- **Adicionar da biblioteca Steam.** Em *Biblioteca Steam → No seu perfil, fora do vault*, *Adicionar* (ou *Adicionar todos*) cria a ficha com o AppID, sincroniza as conquistas e baixa as artes.
- **Caçador de conquistas.** Na aba Conquistas da ficha: as que faltam, das mais comuns (mais fáceis) às mais raras, com a dificuldade. O alfinete marca como alvo (campo `target` na nota da conquista). Na Home, *Próximas conquistas* junta seus alvos e as mais fáceis do que está jogando.
- **Marcos do Vault.** Em Conquistas: 13 insígnias com níveis de bronze a diamante (jogos, zerados, 100%, conquistas, lendárias, horas, dias seguidos, plataformas, gêneros, franquias, avaliações, coleções e conquistas de madrugada), todas calculadas pelos seus dados. Um aviso aparece quando um marco sobe de nível.
- **Calendário.** Em Atividade: mês a mês, com os dias de conquistas, sessões, zeradas e começos. Toque num dia para ver o que aconteceu.
- **Metas.** Em Estatísticas → Metas → *Criar meta*: zerar, começar, conquistas, conquistas raras, 100%, horas em sessões ou tamanho máximo do backlog. O progresso é calculado das datas das notas, com o ritmo esperado para o ano. Aparecem também na Home. Ficam no frontmatter de `Dashboard/Estatísticas` (`goals`).
- **Retrospectiva em Stories.** Em Estatísticas → *Retrospectiva*: o ano em tela cheia. Toque à direita avança, à esquerda volta, segurar pausa e arrastar para baixo fecha. A última tela gera a imagem para compartilhar.
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
- **Detalhes.** Favoritar faz o coração pulsar. Menus, busca, janelas (no celular, painel que sobe da borda) e avisos entram com uma mola curta.
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

**Barra de rolagem:** *Style Settings → Game Library → Obsidian mobile → Ocultar barra de rolagem* (ligado por padrão) esconde o indicador cinza de rolagem vertical nas telas da Game Library e nas áreas internas (menu, janelas, busca, listas). A rolagem por toque, roda do mouse e teclado continua igual.

**Style Settings → Botões do topo:** *Ocultar botão de pesquisa* e *Ocultar ícone de perfil*, independentes (valem no celular e no desktop). Com a pesquisa oculta, os atalhos `/` e `Ctrl+K` ficam desativados.

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| "Game Library não carregou" | CustomJS desligado ou pasta de scripts diferente de `Scripts/`. |
| Tela de carregamento não some | O CustomJS não carregou em 40 s; a própria tela explica o que conferir. |
| Bloco de código em vez da tela | Dataview sem *Enable JavaScript Queries*, ou nota em modo de edição. |
| Tela sem estilo | Snippet `steamvault` desativado. |
| "O perfil Steam precisa ser público" | Privacidade da Steam; nada é contornado. |
| Conquistas de um jogo não chegam | Falta `steamAppId`, ou *Detalhes de jogos* está privado. |
| Nomes de arquivo com `U00e7` | *Configurações → Reparar nomes de arquivo escapados*. |
| Números estranhos | *Configurações → Diagnóstico do vault* lista o que corrigir na origem. |


## Novidades da versão 3.74

**Conquistas do Xbox reconstruídas: 100% manuais e rápidas de cadastrar.**

- **Limpeza:** saíram do código a busca e a importação por TrueAchievements, XboxAchievements, Exophase, MetaGamerScore e XB.Live, a página salva (`.mhtml`), o favorito com script e a limpeza de tokens da antiga API. Nenhuma consulta externa sobrou. As notas de conquista existentes continuam iguais.
- **Gerenciador de conquistas** (ficha › Conquistas › *Gerenciar conquistas* ou *Adicionar em lote*):
  - **Em lote:** uma por linha (`Nome | Descrição | G | Categoria | DLC`), seções `## DLC`, ou planilha CSV/Excel com colunas reconhecidas e prévia;
  - **Cadastro sequencial:** *Salvar e próxima* (ou Enter) e *Duplicar*;
  - **Seleção em massa:** desbloquear, bloquear, categoria, DLC e excluir;
  - **Ícones em lote:** várias imagens associadas pelo nome do arquivo ou pela ordem, recorte quadrado, WebP no vault;
  - **Backup automático** antes de excluir ou atualizar, **restaurar** sem apagar nada e **exportar CSV**.
- **Ficha:** restantes no resumo, *Gerenciar conquistas* e *Adicionar em lote*; sem *Raras* e *% global* no Xbox.
- Jogo novo de Xbox abre a ficha direto no cadastro em lote.

## Novidades da versão 3.73

**Favorito com script: conquistas com ícones em um toque.**

- Em *Buscar conquistas › Favorito com script*, **Copiar favorito** dá o código para criar um favorito no navegador.
- Na página de conquistas do jogo (no computador, clique; no Chrome do Android, digite *Vault* na barra de endereço), o favorito copia nome, descrição, G, DLC e ícones.
- **Colar do favorito** (ou colar no campo) mostra a prévia com os ícones; ao importar, os ícones vão para o vault em WebP.
- O conteúdo colado é validado campo a campo.

## Novidades da versão 3.72

**Conquistas com ícones a partir da página do jogo.**

- **Importar página salva:** em *Buscar conquistas*, escolha o arquivo `.mhtml` (Chrome do Android: menu ⋮ → download) ou a página completa (`.html` + imagens). O Vault lê nome, descrição, G, DLC e o **ícone** de cada conquista, com as imagens vindas de dentro do arquivo, sem acessar o site.
- **Colar com ícones:** ao colar uma lista copiada do navegador, o Vault aproveita o HTML que vem junto e mostra os ícones na prévia.
- **Ícones no vault:** ao importar, os ícones são gravados em WebP em `Assets/Achievements/<Jogo>/`. Uma conquista que já tem ícone não tem o ícone trocado.
- **Prévia:** cada linha mostra o ícone ao lado do nome.

## Novidades da versão 3.71

**Conquistas do Xbox de várias fontes, com comparação.**

- **Cinco fontes:** TrueAchievements, XboxAchievements, Exophase, MetaGamerScore e XB.Live (indicada para o Xbox original/Insignia). *Buscar em todas* abre as buscas indicadas para a versão de uma vez.
- **Versão do jogo:** Series X|S, One, 360, Xbox original ou PC, pela plataforma da ficha. A versão da página colada é detectada pelo link ou pelo texto, com aviso quando não bate.
- **Comparação:** cole a lista de quantas fontes quiser. O quadro mostra quantidade e G total de cada uma e avisa as divergências; cada conquista mostra de onde veio e, quando as fontes discordam, os G e as descrições de cada uma para você escolher. A fonte preferida dá os valores iniciais e fica lembrada neste aparelho.
- **G oficial:** TA Score, MGS e proporções são descartados; só o Gamerscore é lido.
- **DLCs:** títulos como *DLC: Nome* ou *Nome (10 achievements)* viram conjuntos na ficha.
- **Registro das fontes:** a ficha guarda a fonte preferida, o link, a versão e as fontes comparadas.
- **Ficha:** um botão só, *Buscar conquistas*, na estante e no menu ⋯.

## Novidades da versão 3.70

**O Xbox deixou de usar API: cadastro manual completo e importação assistida de conquistas pelo TrueAchievements.**

- **Integração por API removida:** login da Microsoft, chave da OpenXBL, renovação de token e leitura automática da conta saíram do Vault.
  - Na primeira abertura, a autorização e a chave que tenham sobrado neste aparelho são apagadas, junto com o cache do perfil.
  - Fichas, conquistas e campos antigos das notas continuam como estavam. Para revogar também do lado da Microsoft: [account.live.com/consent/Manage](https://account.live.com/consent/Manage).
- **Cadastro manual:** *Adicionar jogo* ganhou desenvolvedora, publicadora, data de lançamento, nota (0 a 5) e observações. A lista de plataformas tem Xbox Series, Xbox One, Xbox 360 e Xbox, e escolher uma delas põe a origem das conquistas em Xbox.
- **Importação assistida de conquistas** (só em jogos de Xbox):
  - *Buscar no TrueAchievements* abre a página no navegador;
  - você copia a lista e cola;
  - a prévia mostra nome, descrição e G de cada conquista, a quantidade e o G total, e pode ser corrigida;
  - *Importar* grava no vault.
  - Reimportar não duplica, atualizar pede confirmação e nada é apagado. (Substituído na 3.74 pelo [cadastro 100% manual](#xbox-conquistas-100-manuais-374).)
- **Gamerscore na ficha:** cada conquista mostra o selo de G. A estante mostra o G conquistado e o total (*80 / 200 G*), ao lado da contagem, da barra e da porcentagem. Em *Próximas conquistas*, jogos de Xbox mostram o G no lugar de "Sem dados".
- **README** reescrito, com capturas reais, e novo **CHANGELOG.md**.

## Novidades da versão 3.69

**Segunda otimização, agora nas ações do dia a dia e na abertura do app.** Medido com 1000 jogos e processador 4× mais lento, no celular simulado:

| Ação | Antes | Depois |
|---|---|---|
| Coleção → Adicionar jogos (abrir a janela) | 1.319 ms | 47 ms |
| Ficha → Editar detalhes | 178 ms | 101 ms |
| Adicionar jogo (abrir a janela) | 81 ms | 65 ms |
| Primeira abertura do app (até a Início pronta) | ~1,5 s | ~1,26 s |

- **Adicionar jogos (coleção):** a lista com todos os jogos era montada inteira ao abrir. Agora entram 60 linhas, e o resto em partes enquanto você olha a janela. Filtrar ou salvar monta antes o que falta. As linhas fora da área visível não são desenhadas. A contagem de selecionados continua contando todos.
- **Editar detalhes e demais editores:** ao abrir, o formulário era expandido "clicando" num botão que media a altura para animar, medida jogada fora logo depois. E as listas de gêneros e subgêneros vinham de uma nova varredura de todas as notas, embora o app já tivesse esses dados.
- **Primeira abertura:** a área da tela, recém-criada, já está no topo; o app deixou de mandá-la "para o topo" de novo, o que obrigava o navegador a calcular a tela inteira antes da hora.
- **Correção visual:** em campos de busca dentro de janelas (como "Filtrar jogos" em Adicionar jogos), a lupa ficava por cima do começo do texto.
- **Testado e descartado:** não desenhar as seções da Início abaixo da primeira tela. O ganho era pequeno e as seções saíam deslocadas em 1 px. Busca da Biblioteca, filtros, abas da ficha e das Estatísticas e a busca global já respondiam em 12–45 ms.

## Novidades da versão 3.68

**Otimização completa: telas abrindo mais rápido, sem mudar o que aparece.** Medido com 1000 jogos e processador 4× mais lento, no celular simulado:

| Tela | Antes | Depois |
|---|---|---|
| Tier List | 479 ms | 156 ms |
| RetroAchievements (Jogos / Conquistas) | 315 / 327 ms | 149 / 133 ms |
| Configurações | 438 ms | 231 ms |
| Biblioteca | 652 ms | 437 ms |
| Ícones | 276 ms | 133 ms |
| Ficha do jogo | 420 ms | 284 ms |
| Subgêneros / Perfil | 285 / 243 ms | 158 / 125 ms |

- **Medições fora de hora:** ao abrir uma tela, o app media o tamanho da área (para o topo, a barra inferior e as áreas seguras do celular) logo depois de inserir o conteúdo novo, e repetia isso no fim. Cada medição obrigava o navegador a calcular a tela inteira antes da hora.
  - Agora tudo é medido antes de trocar o conteúdo (a medida não depende dele) e só escrito depois.
  - O mesmo valeu para a posição das abas que grudam no topo, o carrossel da Início, a lista da Biblioteca e as setas das prateleiras.
- **Tier List:** as faixas S–D também são montadas em partes (as 40 primeiras capas de cada faixa na hora). Arrastar ou mover uma capa monta antes as que faltam, para a ordem gravada sair certa.
- **RetroAchievements:** as listas de jogos mostram 40 por vez, com "Mostrar mais". Na tela Jogos, digitar ou escolher um filtro traz todos antes de filtrar.
- **Estrelas da nota:** as cinco estrelas viraram um elemento só, no lugar de cinco ícones (na Biblioteca, cerca de 500 elementos a menos).
  - No tema escuro elas agora são douradas, como no tema claro. Antes, uma regra geral dos ícones as deixava brancas.
  - As estrelas apagadas também aparecem no tema claro (antes, eram brancas sobre fundo claro).
- **Galeria de ícones:** os grupos fora da tela não são desenhados até você rolar até eles.
- **Inglês:** a tradução percorre a tela uma vez só (antes passava duas vezes pelo mesmo conteúdo) e pula de uma vez as áreas com texto seu.
- **Sem mudança:** a rolagem já estava fluida (16–23 ms por quadro) e continua igual. Na lista dos jogos do RetroAchievements e na galeria, o resto aparece ao rolar ou ao tocar em "Mostrar mais".

## Novidades da versão 3.67

**Segunda varredura, agora atrás de duplicações e código morto.** Nenhum bug novo apareceu no app; a limpeza não muda nada na tela.

- **CSS:** 19 declarações que nunca valiam foram removidas, entre elas 2 repetidas, idênticas. Em todas, o mesmo seletor era declarado de novo mais adiante, com outro valor que é o que vale. A tela ficou idêntica: foram conferidos os estilos de 112.446 elementos em 102 telas, antes e depois.
- **Código morto:** um método antigo dos formulários (`formSectionLabel`), substituído na 3.62, e a regra de CSS que só ele usava.
- **Ícones:** a revisão confirmou a correção da 3.66 (nomes descritivos não são mais sobrescritos).
- **Modelo do Templater de coleção:** citava o botão "Escolher jogos", que hoje se chama "Adicionar jogos".
- **Verificado sem achados:**
  - arquivos de imagem e notas duplicadas;
  - frases repetidas ou vazias no dicionário de inglês;
  - páginas do Dashboard repetidas;
  - métodos com corpo idêntico (só um auxiliar de 8 linhas, de propósito, em cada integração);
  - textos de notas inseridos no HTML sem escape. Jogo, coleção, conquista, gênero e franquia com nomes contendo HTML (`<img onerror=…>`) passaram por todas as telas, abas, janelas e pela busca, sem nada executar.

## Novidades da versão 3.66

**Varredura de erros em todo o vault: oito bugs corrigidos.**

- **Datas em fuso horário:** alguns pontos calculavam "hoje" pelo horário de Greenwich. No Brasil, depois das 21h, isso já dava o dia seguinte. Afetava:
  - a data automática de início e de conclusão ao mudar o status em *Editar detalhes*;
  - a data impressa no cartão de compartilhar e no nome do arquivo salvo;
  - a data de entrada dos jogos importados da lista de desejos da Steam;
  - as datas do planejador de backlog e a data de modificação usada quando a nota não tem `updated`.
- **Números com vírgula:** um valor digitado à mão na nota como `hoursPlayed: 10,5` ou `rating: 4,5` era lido como zero. Agora vale 10,5 e 4,5.
- **Datas impossíveis:** uma data como `2024-02-30` ou com mês 13 aparecia como "30 fev 2024". Agora é tratada como vazia.
- **Nota fora da escala:** uma nota 9 ou -1 digitada à mão aparecia assim. Agora fica entre 0 e 5, inclusive nas notas por categoria.
- **Adicionar jogo:** se a Steam falhasse ao importar as conquistas logo depois de criar a ficha, o AppID que você tinha identificado se perdia. Agora ele é gravado na criação.
- **Galeria de ícones:** seis ícones (bola, peão, bússola, carro, mira e dado) mostravam o nome curto em vez do descritivo, como "Bola (esportes)".
- **Inglês:** dois textos continuavam em português (a nota sobre o que é sincronizado, em Configurações, e "dos desbloqueios em hardcore", no RetroAchievements).
- **Tier List:** cada visita deixava um "ouvinte" de rolagem preso que nunca era removido; com o uso, eles se acumulavam.

## Novidades da versão 3.65

**Os três itens que tinham ficado de fora da 3.64 foram tentados. O que funcionou ficou; o que não ajudou foi desfeito.**

- **Tier List muito mais leve ao rolar:** com 1000 jogos (CPU 4× mais lenta, no teste), cada quadro da rolagem caiu de ~120 ms para ~45 ms.
  - A causa não era o tamanho das imagens. A animação de entrada das capas ficava "presa" no fim, e o navegador mantinha cada capa numa camada própria para sempre. Com centenas de capas, montar essas camadas tomava a maior parte de cada quadro.
  - A animação agora termina de verdade, em todas as telas. Na Tier List, as capas pequenas entram sem zoom nem esmaecimento.
  - Miniaturas geradas no aparelho foram testadas e desfeitas: não mudaram nada, nem na segunda visita, com o cache pronto.
- **Novo gênero, nova plataforma, nova coleção e editar coleção** agora são janelas como as demais do app.
  - Os botões ficam no rodapé, e Enter salva.
  - Um campo obrigatório vazio fica marcado.
  - Um **subgênero** novo agora ganha página de subgênero; antes ganhava, por engano, uma página de gênero.
  - O que é gravado nas notas não mudou.
- **Contraste dos textos sobre imagens:** foi medido pixel a pixel (capas, fundos e topos de página), nos temas escuro e claro, no celular e no computador. Todos passam no mínimo de leitura.

## Novidades da versão 3.64

**Lançamentos, planejador de backlog, busca avançada, histórico completo na ficha e auditoria de acessibilidade.**

- **Data de lançamento (novo):** *Editar detalhes* ganhou o campo *Data de lançamento (opcional)*, ao lado do ano.
  - Com a data, o ano é preenchido sozinho se estiver vazio.
  - *Completar dados pela Steam* também traz a data (por exemplo "24 mar. 2023").
  - Fichas antigas não ganham campo vazio: a chave `releaseDate` só aparece quando você preenche.
- **Em breve (novo):** jogos da lista de desejos e do backlog com lançamento de hoje em diante.
  - Na *Lista de desejos*, um bloco no topo mostra a contagem regressiva (Hoje, Amanhã, em N dias, meses ou anos). Até 7 dias, o prazo fica destacado.
  - Na *Início*, a seção *Lançamentos em breve* aparece sozinha quando há algum lançamento, logo depois da lista de desejos. Dá para escondê-la ou movê-la como as outras.
- **Planejador de backlog (novo):** em *Estatísticas → Tempo*.
  - Soma o que falta nos jogos em backlog, pausados e em andamento.
  - Usa o *tempo estimado* da ficha. Sem ele, usa a mediana do que você levou para zerar jogos do mesmo gênero (marcado com "~").
  - Calcula seu ritmo pelas sessões das últimas 12 semanas (ou pelas 2 últimas semanas da Steam) e diz quando você termina tudo.
  - Sugere uma fila: prioridade primeiro, depois o que já está em andamento e o que acaba mais rápido.
- **Busca avançada na Biblioteca (novo):** o campo de busca aceita comandos, que podem ser combinados com texto.
  - `status:zerado`, `status:jogando`, `status:backlog`, `status:pausado`, `status:abandonado`, `status:desejos`
  - `plataforma:ps2`, `genero:rpg`, `franquia:zelda`, `fav`
  - `nota>4`, `horas>=20`, `ano:2023`, `conquistas<50` (aceitam `>`, `<`, `>=`, `<=`, `:` e `=`)
  - Também valem os nomes em inglês (`status:completed`, `platform:`, `rating>`, `hours>`, `year:`).
  - Quando há um comando ativo, o campo ganha um contorno azul. Um comando que não existe vira texto comum.
- **Ficha, linha do tempo:** além dos marcos (adicionado, começou, zerou, lançamento), *Ver toda a atividade* abre o histórico completo do jogo: sessões, conquistas e anotações.
- **Tier List mais leve ao rolar:** as capas restantes só entram quando a rolagem para, em vez de disputar os quadros com ela.
- **Acessibilidade:**
  - Todos os textos medidos passam no contraste mínimo (WCAG AA) nos temas escuro e claro. Foram ajustados o cinza dos textos secundários, o dourado e o verde do tema claro e o azul do botão principal.
  - Todos os controles mostram um indicador visível ao navegar com Tab.
- **Para quem mexe no código:** as ferramentas de auditoria (contraste, foco, layout, desempenho e outras) agora ficam em `.github/tools/audit/`, com instruções.

## Novidades da versão 3.63

**Completar dados pela Steam e as últimas pendências visuais resolvidas.**

- **Completar dados pela Steam (novo):** em jogos com AppID, o menu ⋯ da ficha tem *Completar dados pela Steam*.
  - Busca na loja Steam (dados públicos, sem login) gêneros, desenvolvedora, publicadora, ano de lançamento e sinopse, em português.
  - Uma janela mostra, campo a campo, o valor da Steam e o que está na ficha. Os campos vazios já vêm marcados; os preenchidos só mudam se você marcar.
  - Campos que já batem com a Steam nem aparecem. Nada é apagado.
- **Coleções em destaque na Início:** usam os mesmos cards de Coleções e Gêneros (capas sobre fundo desfocado, cor só no ícone). Aparecem até quatro, com a fixada primeiro; com uma só, o card ocupa a linha inteira.
- **"Continuar jogando" (Biblioteca):** o botão *Abrir* foi para o canto de baixo, ao lado do nome. No canto de cima ele ficava sob os botões de busca e perfil quando o card chegava ao topo.
- **Realce ao passar o mouse (computador):** abas, chips, botões e cards voltaram a acender com o mouse. No celular nada muda, para o realce não ficar "preso" depois do toque.
- **Capa e fundo:** o editor foi dividido em seções (Capas, Fundo e destaque, Logo).
- **Conquista manual:** "opcional" virou a etiqueta padrão, e o campo do ícone ganhou um texto de exemplo legível (antes aparecia "Emoji ()").

## Novidades da versão 3.62.3

- **Estatísticas no celular:** ao rolar, a faixa de abas (Visão geral… Comparar) grudava no topo por baixo da barra de status do Android, com o relógio e os ícones por cima das abas.
  - Agora ela gruda logo abaixo da barra de status, com fundo sólido cobrindo a área da barra.
  - Os botões de busca e perfil ficam na mesma linha da faixa, como nas abas da ficha do jogo.

## Novidades da versão 3.62.2

**Ações rápidas (segurar um jogo na Biblioteca) sem a caixinha sob o dedo e com a capa.**

- Ao segurar um card, uma caixinha cinza com o nome do jogo e o endereço da nota ("…Bully.md") seguia o dedo por cima da janela. Era o Android começando a "arrastar" o link do card. Os cards da Biblioteca não iniciam mais arraste nem seleção de texto ao serem segurados.
- A capa no topo das Ações rápidas aparecia só como um bloco de texto com o nome. Agora a imagem aparece, e isso vale para toda imagem dentro de janelas.

## Novidades da versão 3.62.1

- **Estatísticas, faixa de abas:** no fim da faixa (Visão geral, Tempo, Gosto… Comparar) sobravam cerca de 100 px vazios. O espaço era reservado aos botões de busca e perfil, mas só faz falta quando a faixa gruda no topo, ao lado deles.
  - No lugar normal, a faixa agora termina rente ao último item.
  - Grudada no topo, ela para antes dos botões, que descem para ficar alinhados a ela, como as abas da ficha do jogo.

## Novidades da versão 3.62

**Formulários com um desenho só, organizados em seções e mais confortáveis no celular.**

- **Adicionar jogo e Editar detalhes divididos em seções**, cada uma com título e uma linha de apoio:
  - **Adicionar jogo:** Essencial (nome, plataforma, status), Conquistas (origem, sincronização e "Identificar jogo na Steam"), Detalhes, Imagens e Sinopse.
  - **Editar detalhes:** Essencial, Gêneros e etiquetas, Progresso, Avaliação, Conquistas, Compra e lista de desejos, e Sinopse.
  - **Seções recolhidas:** Imagens, no Adicionar jogo; Conquistas e Compra, no Editar detalhes. Fechadas, elas mostram um resumo do que já está preenchido (ex.: "Steam · Automática", "R$ 36 · Digital").
  - **Avaliação por categoria** fica num "ver mais" dentro de Avaliação, já aberto quando há notas.
  - **Rolagem:** no celular, a do Adicionar jogo caiu de cerca de 1.380 para 690 px, e a do Editar detalhes de 1.900 para 1.270 px.
  - **Colunas:** campos curtos ficam lado a lado (duas colunas no celular, três no computador); em telas muito estreitas (menos de 340 px), uma coluna.
- **Mesmo desenho em todas as janelas:**
  - campos, seletores e áreas de texto com 44 px no toque e 40 px no mouse, cantos de 10 px e superfície neutra;
  - foco com anel suave da cor de destaque;
  - todos os seletores agora mostram a setinha (nos editores antigos ela não aparecia);
  - números sem as setinhas do navegador;
  - caixas de seleção e opções no visual do app, em vez das nativas brancas;
  - botões internos (Escolher do dispositivo, Adicionar, Identificar na Steam) na mesma altura e no mesmo canto dos campos.
- **Obrigatório e opcional claros:**
  - o "*" virou um pontinho da cor de destaque ao lado do rótulo;
  - "(opcional)" virou uma etiqueta discreta, e dicas como "0–5" ficam ao lado dela;
  - ao tentar salvar com um campo obrigatório vazio, ele fica com contorno de erro e recebe o foco; o erro some ao digitar.
- **Dicas abaixo do campo:** rótulos e campos alinhados mesmo quando só um deles tem explicação.
- **Imagens:** prévia em pé ao lado do campo, e "Remover" só aparece quando há imagem.
- **Ajustes pontuais:**
  - **Sinopse:** maior (4 a 5 linhas).
  - **Metas:** Tipo, Quantidade e Ano ganharam rótulos visíveis (antes eram dois números soltos).
  - **Editar perfil:** os seletores de Avatar e Fundo ocupam a largura toda e perderam o recuo vazio à esquerda; a vitrine virou uma lista leve com caixas de seleção.
  - **Zeradas:** "Quão difícil é o jogo" (que salva sozinho) fica logo abaixo da lista, antes do formulário de nova zerada; o resumo ("Zerado 1×") virou título.
  - **Identidade (gênero, plataforma, franquia):** a prévia ficou neutra, com a cor no ícone, como nos cards.
- **Funciona nos temas claro e escuro.** Nada fora das janelas mudou.

## Novidades da versão 3.61

**Coleções no mesmo visual de Gêneros, Subgêneros, Franquias e Plataformas.**

- **Painel "Sua curadoria"** no topo, no lugar do cartão grande colorido. Segue o desenho do "Seu DNA gamer" dos Gêneros:
  - a coleção em destaque (a fixada, a atualizada mais recentemente ou a maior), com ícone, nome e descrição;
  - barras com quanto de cada coleção você já zerou (até 6);
  - o total de jogos nas coleções e de zerados.
  - Toque no nome para abrir a coleção.
- **Cards em duas colunas**, iguais aos dos gêneros:
  - faixa com as capas sobre o fundo desfocado de uma delas;
  - superfície neutra, com a cor da coleção só no ícone;
  - descrição (ou o tipo: Meta, Maratona, Favoritos, Coleção), jogos, horas, planejados e links quebrados;
  - uma barra fina de progresso;
  - o alfinete marca a coleção fixada.
  - Coleção ainda sem jogos: os títulos planejados aparecem como minicapas tipográficas.
- **Coleções automáticas** no mesmo card, com capas e tom neutro (antes, quadrados de cor forte). Continuam abrindo a página delas dentro de Coleções.
- **Página da coleção:**
  - a capa de uma coleção vazia ficou neutra, com a cor só no ícone;
  - o topo ganhou a marca d'água do ícone, como nas páginas de gênero.
- Busca, ordenação, coleções fixadas e todas as ações da coleção continuam iguais.
- O card de coleção da Início não mudou.

## Novidades da versão 3.60

**Visões salvas na Biblioteca, abas e botões com o realce que faltava e a Steam Vitrine bem mais leve.**

- **Visões salvas (novo):** monte um filtro na Biblioteca (status, plataforma, gênero, favoritos, nota, conquistas…) e toque em **Salvar visão** na linha dos filtros ativos.
  - Dê um nome. A visão vira um atalho com alfinete na barra rápida, ao lado de "Todos".
  - Guarda também a ordem, os grupos e a visualização (grade, compacta, prateleira ou lista). A busca por texto não entra.
  - Um toque aplica a visão; outro toque volta a mostrar tudo.
  - **Toque longo** no atalho (no computador, botão direito), ou **Editar visão** com ela ativa, abre as opções: renomear, atualizar com os filtros atuais ou excluir.
  - As visões sincronizam entre aparelhos com o resto das preferências da Biblioteca (até 24).
- **Realce que não aparecia (corrigido):** em vários botões, o estado "ativo" ou "ligado" era apagado por uma regra mais forte do CSS e ficava igual aos outros. Agora aparecem:
  - a aba escolhida nas Estatísticas e no hub de Conquistas;
  - os atalhos ativos da Biblioteca (Todos, Jogando, Zerado, Favoritos…) e os chips da janela de filtros;
  - o coração vermelho de favorito nos cards;
  - o dia de hoje no calendário;
  - a cor escolhida nas Configurações.
- **Steam Vitrine:** as faixas "Jogos 100%" e "Favoritos Steam" mostram 24 capas. **Ver todos** abre a Biblioteca já filtrada (100% na Steam, ou favoritos da Steam). Com bibliotecas grandes, a tela abre em 0,3 s em vez de 1,4 s.
- **Toque mais fácil no celular:** o nome da franquia no topo da ficha, os chips da Visão geral e as linhas do gráfico de períodos das Estatísticas ganharam área de toque invisível maior, sem mudar o desenho.
- **Inglês:** as frases do alfinete da prévia (3.58.3) e das visões salvas foram traduzidas.
- **Proteções novas nas verificações automáticas:**
  - o CSS precisa continuar com seletores que o navegador indexa (a otimização da 3.59 não se perde);
  - nenhum estado "ativo" pode voltar a ser apagado pela regra base dos botões.

## Novidades da versão 3.59

**Otimização completa: todas as telas abrem mais rápido, com o mesmo visual.**

- **Telas mais leves:** o navegador recalcula os estilos da tela bem mais rápido. Muitas regras do CSS estavam escritas de um jeito que ele não consegue indexar e testava cada uma em todos os elementos da tela. Elas foram reescritas na forma que ele indexa, com exatamente o mesmo resultado. A comparação automática de todas as propriedades de estilo dos 112 mil elementos de 102 telas, em três tamanhos, não mostrou diferença visual.
- **Tier List com bibliotecas grandes:**
  - a faixa "Sem classificação" mostra as 60 primeiras capas na hora e monta o resto aos poucos, sem travar;
  - as capas fora da tela, em todas as faixas, só são desenhadas quando chegam perto;
  - arrastar e o toque para mover funcionam também nas capas montadas depois.
- **RetroAchievements:** as linhas das listas fora da tela só são desenhadas quando chegam perto.
- **Medido** num celular simulado com 1000 jogos e o processador 4× mais lento (tempo para abrir):

| Tela | Antes | Agora |
|---|---|---|
| Tier List | 7,1 s | 0,6 a 0,8 s |
| RetroAchievements (3 telas) | 1,4 a 1,5 s | 0,4 a 0,6 s |
| Biblioteca | 1,2 s | 0,6 s |
| Steam Vitrine | 2,3 s | 1,4 s |
| Ícones | 0,9 s | 0,4 s |
| Home | 0,58 s | 0,42 s |
| Plataformas | 0,39 s | 0,17 s |
| Configurações | 0,56 s | 0,30 s |

## Novidades da versão 3.58.3

**Prévia da Personalização parada no lugar, no celular.**

- **Antes:** a prévia acompanhava a rolagem. Ela cobria boa parte da tela, passava por baixo da barra de status e dos botões de busca e perfil, e no fim da seção era empurrada para cima.
- **Agora:** ela fica no lugar dela, no topo da central, e rola junto com a página como o resto das Configurações. Como não precisa mais caber numa faixa fixa, aparece maior: até 46% da altura da tela.
- **Quem preferir a prévia sempre à vista** toca no **alfinete**, ao lado do botão de recolher. Ela passa a ficar presa no topo, como antes. Toque de novo para soltar. A escolha fica lembrada no aparelho.
- No computador, nada muda: a prévia segue ao lado das opções.

## Novidades da versão 3.58.2

**Modo prateleira da Biblioteca fluido no celular.**

- **Rolagem sem travar:** a prateleira desenhava um reflexo de cada capa e mantinha todos os cards sempre desenhados, mesmo fora da tela. No celular e em telas de toque:
  - o reflexo sai;
  - as sombras ficaram mais curtas;
  - no celular, os cards fora da tela voltam a ser pulados, como na grade.
- **Mesmo visual de estante:** capas em três colunas, sombra embaixo e as tábuas emendadas de ponta a ponta.
- **Medido:** no teste com 1000 jogos e o processador 4× mais lento, o tempo médio por quadro ao rolar caiu de 111 para cerca de 45 ms na rolagem rápida e de 43 para cerca de 28 ms na rolagem normal, igual à grade. Abrir a Biblioteca nesse modo também ficou mais rápido.
- No computador, a prateleira continua com o reflexo.

## Novidades da versão 3.58.1

**Personalização da Interface melhor no celular, mais rápida e sem opções "mortas".**

- **Prévia sempre à vista no celular:** ela fica fixa no topo da central enquanto você rola pelas opções, então cada toque mostra o resultado na hora.
  - A prévia é mais compacta: as visões (Início, Ficha, Cards, Banners) viram ícones, e "Ver como computador" é um botão só.
  - Há um botão para **recolher** a prévia; a escolha fica lembrada no aparelho.
  - No modo fixo, a prévia mostra um celular estreito e inteiro: arte, título e números do topo aparecem juntos.
- **Toque confortável:** todos os botões da central têm pelo menos 44 px no celular (antes, opções de 36 px e botões ⋯ de 20 a 28 px).
  - Em telas bem estreitas (menos de 350 px), as visões da prévia ganham uma linha só delas.
  - As miniaturas ficam sempre em duas colunas.
- **Barra de ações numa linha:** Restaurar (ícone), Cancelar e Aplicar, bem mais baixa quando há alterações.
- **Opções que não faziam nada, corrigidas:**
  - espaço entre as seções da Início (no celular e no computador);
  - tamanho das capas nas faixas da Início;
  - abas da ficha em **pílulas** ou **segmentadas**.
  - "Plataforma (Biblioteca)" saiu da central: a Biblioteca já esconde essa etiqueta nas visualizações em que os formatos valem.
  - "Posição do conteúdo" e "Botões" agora avisam que valem no computador.
- **Card cinematográfico:** a arte horizontal não carregava em alguns casos e aparecia o fundo reserva com o título.
- **Ficha centralizada:** os números também ficam centralizados.
- **Mais rápida** (1000 jogos, celular simulado):
  - mudar uma opção que só troca a aparência deixou de redesenhar a prévia (de 400–520 ms para 130–190 ms);
  - a primeira prévia é preparada enquanto você lê a tela (de 1,5 s para cerca de 0,2–0,6 s);
  - a Biblioteca com um formato de card ficou tão rápida quanto no padrão (de 596 ms para 419 ms; o padrão leva 397 ms).

## Novidades da versão 3.58

**Personalização da Interface.** Uma central nas Configurações para escolher como a Game Library é montada (não só as cores), com pré-visualização real antes de aplicar.

### Como abrir
- **Configurações › Personalização da Interface** (também no índice de seções do topo).
- **Início › Personalizar Home › Aparência › Personalização da Interface**. O Personalizar Home continua funcionando como antes.

### Como usar a pré-visualização
1. Escolha uma área: Tela inicial, Fichas, Cards, Banners, Biblioteca, Temas ou Organização.
2. Toque numa miniatura ou opção. A prévia ao lado (ou abaixo, no celular) muda na hora, com os seus jogos e as artes do vault. Na ficha, o exemplo é o Resident Evil 4, se ele estiver no vault.
3. Alterne o que ver (**Início, Ficha, Cards, Banners**) e o tamanho (**Celular** ou **Computador**). A prévia é desenhada à parte, no tamanho escolhido, então o modo Computador mostra o layout de computador mesmo no celular.
4. Toque em **Aplicar** para salvar e redesenhar o vault, ou em **Cancelar** para descartar.
   - **Restaurar o original** volta tudo ao padrão da 3.57 (tema Steam, azul, Início na ordem padrão). Também só vale depois de Aplicar.
   - Enquanto você só experimenta, nada é gravado: nenhuma nota, nenhuma preferência, nenhuma sincronização.

### Modelos e ajustes
- **Tela inicial (destaque):**
  - **Original**;
  - **Carrossel com capa:** capa vertical à esquerda, informações à direita, sobre a arte desfocada;
  - **Cinematográfico:** banner amplo, título sobre a arte;
  - **Horizontal:** arte de fundo, conteúdo na lateral ou embaixo;
  - **Cards em destaque:** horizontais, verticais ou quadrados, de 2 a 4 por linha; no celular, uma faixa deslizante.
  - Ajustes: altura, quantidade de destaques e, no carrossel, troca automática e intervalo (5, 8 ou 12 s). A troca pausa ao tocar e respeita Reduzir animações.
- **Fichas:**
  - **Original**;
  - **Split Hero:** capa à esquerda, informações e descrição à direita;
  - **Cinematográfico:** banner imersivo, números abaixo;
  - **Minimalista:** sem arte de fundo;
  - **Editorial:** banner contido, capa sobreposta, tipografia grande.
  - Ajustes: posição e tamanho da capa, altura e largura do banner, números (em linha, em blocos ou compactos), descrição no topo, alinhamento, botões, estilo das abas e espaçamento.
  - Todas as abas, painéis, menus e editores continuam iguais em todos os modelos.
- **Cards:** Vertical (original), Horizontal, Quadrado, Compacto, Só a capa, Texto sobre a capa, Painel e Cinematográfico (usa a arte horizontal do jogo).
  - Ajustes: tamanho, cantos, contorno, sombra e o que aparece (status, nota, plataforma, conquistas e progresso).
  - Valem na Início, nas Coleções e na grade da Biblioteca. A Biblioteca pode manter o card original.
- **Banners:** véu sobre a arte (padrão, suave, forte ou sem véu), enquadramento (o salvo em cada ficha, topo, centro ou base) e ajuste (preencher ou mostrar a arte inteira, sem cortes).
- **Biblioteca:** tamanho das capas na grade, densidade e lista detalhada ou compacta. Busca, filtros, agrupamentos, ordenação, coleções inteligentes e ações em lote continuam iguais.
- **Temas:** os quatro temas (Steam, Steam clássico, Grafite e Meia-noite) e as cores de destaque, agora com prévia. A seção Aparência continua igual.
- **Organização:**
  - espaço entre as seções da Início, tamanho das capas e quantidade de jogos por faixa;
  - ordem e visibilidade das seções da Início;
  - **ordem das abas da ficha:** a primeira abre ao entrar.

### Combinações
- Seis combinações prontas, com layouts de verdade: **Original, Steam Split, Cinematográfico, Steam Minimal** (tema grafite), **Editorial** e **Compacto Mobile**.
- **Salvar combinação** guarda a mistura atual da prévia com um nome. Cada combinação salva pode ser renomeada, duplicada, atualizada ou excluída. As prontas podem ser duplicadas.
- Escolher uma combinação só muda a prévia; Aplicar confirma.

### Onde fica e o que sincroniza
- Tudo fica nas preferências da Game Library (`layout`, `layoutPresets`, além de `theme`, `accent` e `homeLayout`, que já existiam). Nenhuma nota de jogo é alterada.
- Com **Mesmas preferências em todos os aparelhos** ligado, a personalização e as combinações salvas vão para `Assets/game-library-preferencias.json`, junto com o resto.
- Um valor desconhecido (de outra versão ou editado à mão) volta ao padrão sem quebrar nada.

## Novidades da versão 3.57

**Gêneros, Subgêneros, Franquias e Plataformas com a cara do resto do vault.** As quatro telas pareciam de outro projeto: cada categoria pintava tudo com a própria cor (fundo, borda, brilho, barra e ícone), com listras diagonais e ícones gigantes de marca d'água. Agora seguem a mesma linguagem, inspirada na Steam:

- **A cor vem dos jogos:** os cards de gênero e subgênero ganharam uma faixa de arte, com as capas na frente e a primeira capa desfocada ao fundo. A cor de cada categoria aparece só no desenho do ícone.
- **Superfícies neutras do vault:** fundo e contorno iguais em todos os cards. O azul de destaque fica só para progresso e seleção.
- **Afinidade numa cor só:** o primeiro lugar em azul cheio e os demais mais suaves, em vez de seis cores diferentes. No computador, o favorito fica à esquerda e as barras à direita.
- **Plataformas compactas:** cada card mostra ícone, nome, geração, números e progresso à esquerda, e a estante de capas à direita. Cerca de metade da altura e sem espaço vazio.
  - O resumo virou um painel só, dividido por linhas.
  - Os grupos por fabricante têm um título discreto.
- **Franquias:** a arte da saga continua sendo a identidade, com um véu escuro neutro por cima (sem a tinta colorida), o rótulo em caixa alta discreta e a barra de progresso em azul.
- **Páginas de detalhe:** o topo de cada gênero, franquia e plataforma ficou mais sóbrio:
  - o brilho da cor ficou mais suave e a marca d'água quase transparente;
  - as listras saíram;
  - o selo do ícone ficou neutro.

  A linha do tempo, o ranking, os destaques, a estante e os gráficos usam os tons do vault.
- **Leitura:** nomes longos (como "Action-Adventure") e a frase de cada gênero quebram em até duas linhas no celular, em vez de serem cortados com "…".
- **O que jogar?:** a capa do jogo sorteado voltou a aparecer. O card herdava, por engano, uma regra dos cards de plataforma que deixava a imagem invisível.

Nada mudou no funcionamento: busca, ordenação, links, edição de identidade e navegação continuam iguais.

## Novidades da versão 3.56

**Conquistas da Steam voltam a sincronizar.** A Steam mudou a página pública de conquistas: em vez da lista em HTML, os dados agora vêm num bloco JSON dentro da página (`valve-ssr-data`). Jogos como Dying Light passaram a dar "A Steam mudou o formato da página pública" ou um falso "privado".

- **Leitura do formato novo:** desbloqueio com data e hora, nome, descrição, ícones e a % global de cada conquista saem de uma única página.
  - Conquistas arquivadas e grupos só de desenvolvedor ficam de fora.
  - O XML e o HTML antigos continuam como reserva, nessa ordem.
- **Raridade sem consulta extra:** a % global vem na mesma página.
- **Fichas existentes continuam valendo:** a conquista é casada pelo nome interno da Steam ou pelo ícone. Uma nota com nome em português ou com o ícone no endereço antigo é atualizada, não duplicada.
- **Menos falsos avisos:**
  - "privado" só aparece com as frases da própria Steam sobre detalhes de jogos privados (antes bastava a palavra *private* em qualquer lugar da página);
  - o aviso "não está no perfil" deixou de sair por engano.
- **Diagnóstico:** se a Steam mudar de novo, o começo das respostas fica em `.steamvault/debug-<AppID>.json`. É uma pasta local, fora do git, e guarda só o que a página pública mostra para qualquer visitante.

## Novidades da versão 3.55

**Mais leve no celular, mais acessível e com contraste conferido no tema claro.**

- **Abre mais rápido em português:** o dicionário de inglês (3.071 frases, 185 KB) saiu do código e foi para `Assets/i18n/en.json`. Ele só é lido quando o inglês está ligado.
  - Num celular simulado com 1000 jogos, a Início fica pronta cerca de 130 ms antes.
  - Em inglês, a tela espera a leitura (uma vez só), sem mostrar português antes.
  - **Ao atualizar um vault copiando só a pasta `Scripts/`,** copie também `Assets/i18n/`. Sem ela o app não quebra, só fica em português.
- **Busca da Biblioteca:** com uma busca de poucos resultados, o app montava, escondidos, todos os outros cards guardados (com 1000 jogos, 295 ms de trabalho). Agora monta só os que aparecem (11 ms). A travada de 105 ms na segunda busca sumiu.
- **Fotos do aparelho mais leves:** a capa, o fundo, o destaque ou o logo escolhidos da galeria são salvos em WebP:
  - capa até 1200 px, logo até 1000 px, fundos até 2560 px;
  - a transparência de PNG é mantida;
  - GIF, SVG e imagens pequenas ficam como vieram.

  Uma foto de 5 MB vira algumas centenas de KB, como já acontecia com as artes da Steam.
- **Retrospectiva:** o botão **Imagem para compartilhar** voltou a funcionar. Ele mostrava "Ação indisponível" desde a limpeza da 3.47. Agora gera o cartão de estatísticas daquele ano. Um período sem sessões não mostra mais os "mais jogados" de todos os tempos.
- **Teclado e leitor de tela:**
  - a escolha do jogo na Steam e a retrospectiva ganharam nome para o leitor de tela, Tab preso dentro da janela e foco de volta a quem abriu;
  - a retrospectiva anuncia cada slide.
- **Tema claro:** o contraste dos textos sobre as artes dos topos foi medido com os pixels reais atrás de cada letra. Ficaram mais legíveis:
  - o selo "Vault" nos topos da Steam e do RetroAchievements;
  - os rótulos dos números nos topos das plataformas;
  - o texto discreto dos topos de gênero e franquia.
- **CSS:** 7 regras repetidas foram unidas, e itens sem uso saíram de 4 listas. A verificação automática agora avisa quando sobrar uma classe sem uso.

## Novidades da versão 3.54

**As melhorias que ficaram da auditoria da 3.53.**

- **Sem páginas de gênero repetidas:** criar a página de um gênero pela rotina antiga (ao organizar os jogos) agora procura antes uma página com o mesmo nome. Diferenças só de maiúscula ou acento contam como o mesmo nome. Antes, "acao" podia virar uma segunda página ao lado de "Ação".
- **Arte de destaque do Resident Evil 2** em WebP: de 595 KB para 97 KB, com a mesma aparência. Agora todas as artes do vault estão em WebP ou JPG leve.
- **CSS mais enxuto:** saíram 138 regras de 42 classes que nenhuma tela usa mais (14 KB). A aparência é a mesma: as capturas de todas as telas, antes e depois, só diferem pelo ruído normal das animações.
- **Código sem repetição:**
  - a rotina antiga passou a usar a mesma função do núcleo para escrever texto no frontmatter, que também remove caracteres de controle vindos de sites;
  - duas funções idênticas de comparar nomes viraram uma.

## Novidades da versão 3.53

**Auditoria completa: estrutura, desempenho e imagens.** Revisamos o vault inteiro: pastas, links, imagens, código e CSS.

- **Vault mais leve:** as capas e os fundos de *God of War: Chains of Olympus* e *Bully* estavam em PNG e somavam 9,1 MB, sendo 5,9 MB só num fundo de 3840 px. Agora estão em WebP, como as outras artes, e somam 0,75 MB, com a mesma aparência. O fundo largo foi reduzido para 2560 px. As fichas foram atualizadas sozinhas e os originais continuam no histórico do git.
- **Proteção contra regressão:** a verificação automática agora avisa:
  - quando uma capa, fundo ou destaque aponta para um arquivo que não existe;
  - quando uma imagem em `Assets/` passa de 1 MB.
- **Sem problema encontrado:**
  - nenhuma imagem sem uso e nenhuma pasta vazia;
  - nenhum link quebrado fora dos exemplos da documentação;
  - nenhum método morto no código legado;
  - nenhum erro em nenhuma tela.

## Novidades da versão 3.52

**Correções da auditoria geral.** Todas as telas foram verificadas automaticamente, no celular e no computador, nos temas claro e escuro e em inglês: elementos que estouram a largura, botões sem nome, áreas de toque pequenas, imagens quebradas, contraste do texto e frases sem tradução.

- **Seu texto nunca é traduzido.** No inglês, a descrição de uma coleção aparecia meio traduzida ("Jogos com achievements in andamento…"), porque o tradutor trocava pedaços que coincidiam com frases do app. Agora sinopses, descrições de coleções, gêneros e plataformas, notas, anotações de sessão, observações de zeradas e a bio do perfil ficam exatamente como você escreveu.
- **Áreas de toque maiores no celular**, sem mudar a aparência:
  - a barra de status colorida da Início e da Biblioteca (12 px de altura) agora responde ao dedo 10 px acima e abaixo;
  - os pontinhos do destaque da Início passaram de 22 para 28 × 32 px.
- **Tema claro:** o rótulo da plataforma no topo das páginas GOG, PlayStation e Xbox estava com pouco contraste (2,4:1) e foi escurecido.
- **Inglês:** as frases do cartão "Nota diária" e da nota da Saúde da biblioteca agora são traduzidas.
- **Biblioteca:** a animação dos cards que voltam ao limpar uma busca escolhe os 24 primeiros numa passada só pela grade. Antes, com mil jogos, isso custava milhões de operações.
- **Sem problema encontrado:** nenhum elemento estoura a largura, nenhum botão fica sem nome acessível e nenhuma imagem está quebrada, em nenhuma tela.

## Novidades da versão 3.51

**Sessões na nota diária e resumo do mês.**

- **Nota diária do Obsidian (opcional).** Em *Configurações › Nota diária*, ligue "Anotar cada sessão na nota diária". Cada sessão registrada (pelo diário ou pelo cronômetro ao vivo) também vira uma linha na nota do dia, sob `## Jogos`: link para o jogo, horas e a anotação da sessão.
  - Usa a pasta e o formato do plugin *Notas diárias*. A tela mostra qual é a nota de hoje.
  - Se a seção `## Jogos` já existe, a linha entra no fim da lista dela, antes da próxima seção. Senão, a seção é criada no fim da nota.
  - Se a nota de hoje não existe e há um modelo de nota diária configurado, a Game Library não cria a nota (para não pular o modelo) e avisa para abri-la uma vez. Sem modelo, cria a nota só com a seção.
  - Vem desligada. A escolha acompanha as preferências entre aparelhos.
- **Resumo do mês.** Nos primeiros 7 dias de cada mês, a Início mostra "Seu outubro de 2026" (por exemplo), logo acima de "Sua semana":
  - horas jogadas, comparadas com o mês anterior;
  - dias jogando, zerados e conquistas;
  - o jogo do mês.

  O **×** dispensa o cartão até o mês seguinte. Meses sem nada registrado não mostram o cartão.

## Novidades da versão 3.50

**Desfazer e exportar.**

- **Desfazer a última ação em lote.** Depois de importar jogos, padronizar plataformas ou buscar capas, o aviso traz o botão **Desfazer**.
  - O que a ação criou (fichas e imagens) vai para a lixeira do Obsidian, de onde ainda dá para recuperar.
  - O que ela alterou volta ao valor anterior.
  - A última ação fica disponível por 24 horas em *Configurações › Importar biblioteca*.
- **Exportar a biblioteca em CSV** (*Biblioteca › ⋯* ou *Configurações*). O arquivo vai para a pasta `Backups/` do vault, no mesmo formato que a importação lê: título, plataforma, status, horas, nota, gêneros, subgêneros, desenvolvedora, publicadora, ano, franquia, datas e favorito. Abre em qualquer planilha e leva a biblioteca para outro app, ou de volta para o Vault sem duplicar nada. Substitui a exportação antiga.
- **Importação:**
  - passou a ler também subgêneros, franquia e favorito;
  - numa lista simples, a primeira linha só vira cabeçalho quando é exatamente um nome de coluna ("Jogo", "Título", "Name"). Antes, uma lista que começasse com "Jogo Desfazer Um" perdia o primeiro jogo.

## Novidades da versão 3.49

**Mais movimento, sem pesar.** As telas mais novas ganharam animações no mesmo estilo das que já existiam: as mesmas curvas e durações, cada efeito rodando uma vez e só com movimentos que o celular desenha sem recalcular a página (deslocar, esmaecer, escalar).

- **Biblioteca:** ao filtrar ou buscar, os jogos que aparecem sobem em cascata curta. São no máximo 24 de cada vez; o resto aparece direto.
- **Estatísticas:**
  - a aba escolhida entra suave;
  - na aba **Comparar**, cada barra se desenha da esquerda, linha a linha, e o efeito repete ao trocar a plataforma ou o ano, mostrando a diferença;
  - os cartões de destaque entram em seguida.
- **Ficha do jogo:** os **marcos** deslizam um a um, como as prateleiras da Início, e o **diário** entra em cascata ao trocar entre Recentes e Do início.
- **Saúde da biblioteca:** o anel enche até a nota e as seções entram em sequência.
- **Importar:** a prévia entra uma vez, quando o arquivo é lido.
- **"Reduzir animações"** (Configurações) e a preferência de movimento reduzido do sistema desligam tudo isso, como o resto das animações. As telas aparecem prontas, sem nada escondido.

## Novidades da versão 3.48

**Saúde da biblioteca, capas pelo nome e uma importação só.**

- **Saúde da biblioteca** (*Biblioteca › ⋯* ou *Configurações*): uma nota de 0 a 100 e, logo abaixo, o que corrigir.
  - **Sem capa:** um botão procura cada jogo na loja pública da Steam pelo nome e baixa capa, fundo e logo quando o nome bate exatamente. Serve também para jogos de console que saíram na Steam. A ficha não ganha o ID da Steam, então não passa a sincronizar conquistas de lá. São até 40 jogos por vez.
  - **Possíveis duplicatas:** mesmo título na mesma plataforma, com link para as duas fichas.
  - **Plataformas com nome fora do padrão:** por exemplo, "PlayStation 2" vira PS2 e "Nintendo 64" vira N64. Um toque padroniza todas, e elas ganham ícone, cor e página certos.
  - **Plataformas não reconhecidas, e jogos sem gênero, sem ano ou sem desenvolvedora:** com link direto para cada ficha.
  - Substitui a tela antiga "Jogos com dados incompletos".
- **Uma importação só:** "Importar vários jogos" agora abre a janela de importação, que aceita CSV ou uma lista simples, com um título por linha.
  - Na lista, cada linha inteira é um título, mesmo com vírgula ("Batman: Arkham Asylum, GOTY Edition").
  - Só marcadores de lista ("1. ", "- ", "• ") são removidos, então títulos que começam com número, como "1080° Snowboarding", ficam intactos.
- **Importação do Playnite:** a coluna `Playtime` é reconhecida como segundos pelos nomes das colunas do Playnite, mesmo num arquivo curto. Antes, 3600 segundos podiam virar 3600 horas.
- **Inglês:** as metas (por ano e por mês), os nomes dos meses e o "eventos nos últimos 12 meses" do mapa de calor da ficha passaram a ser traduzidos.
- **Revisão das telas novas** no tema claro e em inglês: Comparar, metas, marcos e importação.
- **Módulo antigo menor:** saíram o formulário antigo de importação e o painel de dados incompletos, com o que só eles usavam. `SteamVaultLegacy.js` passou de 5902 para 5732 linhas.

## Novidades da versão 3.47

**Biblioteca grande sem travar.** O Vault foi medido com 1000 jogos (com sessões, plataformas, gêneros e status variados) no celular, com o processador desacelerado 4 vezes para simular um aparelho intermediário. Três gargalos foram corrigidos:

| Com 1000 jogos (celular, CPU 4× mais lenta) | Antes | Agora |
|---|---|---|
| Abrir o vault até a Início pronta | 10,8 s | 6,0 s |
| Início | 2,3 s | 1,6 s |
| Primeira busca na Biblioteca | 4,3 s | 0,5 s |
| Buscas seguintes | 0,9 s | 0,5 s |

- **Início:** a prateleira Lista de desejos mostrava a lista inteira (169 jogos na simulação, mais de 5 mil elementos na tela). Agora mostra os 20 primeiros, como Favoritos, e "Ver lista" abre o resto.
- **Busca e filtros da Biblioteca:**
  - a busca espera uma pausa curta na digitação;
  - os cards não são mais movidos a cada letra: só aparecem ou somem;
  - os jogos que ainda não entraram na tela são filtrados pelos dados, sem montar mil cards de uma vez; os que combinam entram primeiro, conforme a rolagem.
- **No computador**, com os mesmos 1000 jogos: Início em 0,2 s, Biblioteca em 0,4 s e busca em cerca de 0,1 s.
- **Módulo antigo menor:** saíram a imagem da retrospectiva antiga (a de hoje é a dos Stories) e o "Backup completo (JSON)", que baixava um arquivo e não funcionava no celular. O item do menu da Biblioteca agora faz o backup em .zip dentro do vault, o mesmo de Configurações.
- **Ferramenta nova:** `.github/tests/perf.js` repete a medição (`node perf.js 1000`).

## Novidades da versão 3.46

**Importar biblioteca por CSV.** Traga a coleção de outro app de uma vez, sem digitar jogo por jogo. Fica em *Biblioteca › ⋯ › Importar de CSV* ou em *Configurações › Importar biblioteca*.

- **Formatos:** a exportação do **Playnite** (extensão Library Exporter), a do **Backloggd** e qualquer planilha salva como CSV com uma coluna de título. Separador vírgula, ponto e vírgula ou tab, com ou sem aspas.
- **Colunas reconhecidas sozinhas**, em inglês ou português: título, plataforma, status, horas, nota, gêneros, desenvolvedora, publicadora, ano de lançamento e datas (adicionado, começou, zerado, jogado por último). Dá para corrigir qualquer coluna na própria janela.
- **Conversões:**
  - **status:** os nomes do Playnite e do Backloggd viram os do vault (por exemplo, *Beaten* vira Zerado, *On Hold* vira Pausado e *Retired* vira Abandonado);
  - **tempo:** em segundos (Playnite), minutos, horas ou "12:30";
  - **nota:** em qualquer escala (0–5, 0–10 ou 0–100) vira 0–5, de meio em meio ponto;
  - **plataformas:** nomes longos viram os do vault ("Sony PlayStation 2" vira PS2, "PC (Windows)" vira PC).
- **Prévia antes de criar:** quantos jogos são novos, quantos já estão no vault (ficam de fora; a comparação é por título e plataforma) e as primeiras linhas como vão ficar. Plataforma e status padrão valem para as linhas que não trazem essa informação.
- **Segurança:** o arquivo é lido no próprio Obsidian e não vai para nenhum servidor. O limite é 1000 linhas e 5 MB por vez, e os textos são saneados antes de virar ficha.

## Novidades da versão 3.45

**Metas por mês, marcos do jogo e a aba Comparar.**

- **Metas de um mês.** No editor de metas (*Estatísticas › Metas*), escolha **No ano inteiro** ou **Em um mês**.
  - Uma meta mensal mostra o ritmo esperado até hoje dentro do mês e fica gravada como `2026-10`. A Início mostra as metas do ano e as do mês corrente.
  - **Tipo novo, "Zerar jogos da fila A seguir":** conta os jogos que estavam na fila e foram zerados no período.
- **Marcos do jogo.** A aba Sessões da ficha abre com uma faixa dos momentos do jogo, em ordem de data:
  - entrou no vault, começou, primeira sessão e maior sessão;
  - primeira conquista, metade das conquistas e conquista mais rara;
  - zerou, zerou de novo, 100% e última sessão.

  Tudo vem das datas que já estão nas notas.
- **Diário em ordem cronológica.** O diário da aba Sessões ganhou a escolha **Recentes / Do início**, para ler a história do jogo do começo ao fim. A escolha fica lembrada no aparelho.
- **Aba Comparar nas Estatísticas.** Duas plataformas ou dois anos lado a lado:
  - jogos, horas, sessões, zerados, porcentagem zerada, conquistas, nota média e gasto, com uma barra por linha e o maior valor em destaque;
  - embaixo, o gênero mais jogado e o jogo em destaque de cada lado;
  - as cores são azul × laranja, que continuam distintas para quem tem daltonismo, e as escolhas ficam lembradas.

## Novidades da versão 3.44

**Mais 35 ícones: plataformas novas, aparelhos PlayStation e subgêneros.**

- **Plataformas que caíam no ícone genérico agora têm desenho próprio.** Basta o nome da plataforma na nota do jogo para o ícone, a cor, o fabricante, o ano e a geração aparecerem sozinhos.
  - Nintendo: Switch 2 e Virtual Boy;
  - Sega: Sega CD (Mega CD) e 32X;
  - Neo Geo, PC Engine (TurboGrafx-16), Atari Lynx e Jaguar, 3DO e WonderSwan;
  - PS Portal, Meta Quest e ROG Xbox Ally;
  - "Atari 2600" e "Arcade" também passaram a ser reconhecidos.
- **Aparelhos PlayStation como opção.** Os letreiros (PS1, PS2…) continuam como padrão. Em *Editar identidade › Ícone*, o grupo novo **Aparelhos PlayStation** traz os consoles desenhados a partir das fotos de referência: PS1, PS2, PS3, PS3 Slim, PS4, PS4 Pro, PS5, PS5 Slim, PSP e PS Vita. Você escolhe console por console.
- **Subgêneros com ícone próprio.**
  - **Mudaram:** Quebra-cabeça (grade de peças), que antes repetia o ícone de DLC, e Exploração (binóculos), que antes repetia a bússola de Aventura.
  - **Novos:** Battle royale, Aconchegante, Cartas (deckbuilder), Tower defense, Point and click, Beat 'em up, Shoot 'em up, Fazenda, Construção de cidades e Terror psicológico.
  - Todos já aparecem na galeria de ícones e no editor.
- **Galeria de ícones:** o texto de abertura agora descreve o traço atual (2) e a regra dos consoles (desenho quando o formato é marcante, logo quando a plataforma é reconhecida pelo nome). As marcas PlayStation e Nintendo perderam os nomes antigos ("botões", "Joy-Con").

## Novidades da versão 3.43

**Consoles das outras marcas revisados.** A regra usada em todo o Vault é: logo quando a plataforma é reconhecida pelo nome (família PlayStation, Dreamcast, Switch), desenho do aparelho quando o formato é marcante. Os nomes dos ícones não mudaram, então notas, cartões, filtros e editores continuam funcionando.

- **Sega Saturn:** antes era só um planeta. Agora é o console visto de cima: tampa redonda grande, entrada de cartucho atrás, botão de abrir e os botões de power e reset à direita.
- **Super Nintendo e Mega Drive:** estavam desenhados como controles, parecidos entre si e com o ícone genérico de controle. Agora mostram o console.
  - **Super Nintendo:** corpo curvo, entrada do cartucho e as teclas deslizantes.
  - **Mega Drive:** parte central redonda com a entrada do cartucho.
- **Game Boy e Portátil:** o Game Boy ganhou o canto inferior direito arredondado do original. O Portátil genérico ficou neutro, sem a cruz, para não repetir o Game Boy.
- **Switch Lite, Steam Deck e Game Gear:** antes saíam quase iguais.
  - **Switch Lite:** analógicos e botões nas posições do aparelho.
  - **Steam Deck:** empunhaduras largas e os dois trackpads quadrados.
  - **Game Gear:** corpo arredondado com cruz à esquerda e dois botões em diagonal.
- **Atari 2600:** ganhou as quatro chaves no topo e a frente frisada.
- **Mesmo traço em todos:** N64, GameCube, Wii, Wii U, Master System, Notebook, TV, Tablet e Realidade virtual estavam no traço fino das versões antigas e agora usam o traço 2 dos demais.
- **PC (gabinete), na 3.43.1:** voltou ao desenho anterior, a pedido.

## Novidades da versão 3.42

**Ícones de consoles sem duplicação, PlayStation padronizado e novo GBA.**

- **Duplicações resolvidas:** antes, 13 nomes de ícone repetiam 6 desenhos. Agora cada um tem desenho próprio, e os nomes continuam os mesmos, então notas, cartões, filtros e editores seguem funcionando.
  - **Xbox:** a marca Xbox mantém a esfera. Cada geração ganhou o próprio aparelho: Xbox (caixa com a joia do X), Xbox 360 (laterais curvas e anel de luz), Xbox One (console largo com grade de ventilação) e Xbox Series (torre com a saída de ar no topo).
  - **PlayStation:** o PS1 deixou de repetir o logo da marca e agora usa o letreiro "PS1".
  - **Nintendo:** a marca usa a pílula com o N, e o Switch mantém o logo do Switch.
  - **Gêneros:** Action RPG virou escudo com espada (antes repetia Hack and slash), Tiro em 3ª pessoa ganhou a mira ao lado do personagem (antes repetia o ícone de perfil) e Simulação virou a engrenagem em movimento (antes repetia o ícone de configurações).
- **PS2 maior:** o letreiro do PS2 tinha hastes muito finas e parecia menor que os outros. As hastes agora têm o mesmo peso do PS3 ao PS5.
  - Os letreiros da Sony (PS1 a PS5, PSP e Vita) usam uma caixa 3:2 com a mesma altura dos outros ícones, sem a faixa vazia de cima e de baixo. Assim aparecem maiores nas etiquetas, nos blocos e nas fichas, sem cortes nem distorção.
  - Na marca d'água grande e na galeria continuam na caixa quadrada, onde já há espaço.
- **PS1 e PSP no mesmo padrão:** o PS1 usa o letreiro "PS1" com as mesmas letras do PS2, e o PSP e o PS Vita usam os próprios letreiros. A família PlayStation fica toda em letreiros.
- **Game Boy Advance:** novo desenho minimalista, com corpo largo, topo reto, laterais arredondadas embaixo, tela central, cruz à esquerda e dois botões à direita.

## Novidades da versão 3.41

**Novo ícone de Action-Adventure.** O ícone mostra uma espada fincada no pico de uma montanha, unindo ação (a espada) e aventura (a montanha a explorar).
- Segue o estilo dos ícones atuais: traço 2, contornos simples, branco no tema escuro.
- A espada tem a mesma lâmina do ícone de Ação, e a montanha conversa com o de Mundo aberto, mas o conjunto é diferente de ambos.
- O nome continua `g-actionadventure`, então o gênero Action-Adventure e as notas que usam esse ícone mudam sozinhos. O arquivo `Assets/Icons/genres/g-actionadventure.svg` também foi atualizado.

## Novidades da versão 3.40

**Ícones do quadro de referência, em branco.** Os ícones do quadro enviado substituíram os equivalentes da biblioteca. Os nomes continuam os mesmos, então menus, cartões, etiquetas, editores e notas que escolheram um ícone continuam funcionando.

- **De onde vêm os desenhos:** o quadro corresponde a bibliotecas abertas de ícones, e os vetores foram copiados de lá sem mudar o desenho, as proporções nem o traço (traço 2). Isso evita traçar a imagem, que ficaria borrada em 16 px.
  - **Tabler Icons (MIT):** início, biblioteca, conquistas, mídia, DLC, listas, lançamentos, estatísticas, busca, perfil, configurações, estrela, coração, relógio, atualizar, filme, câmera, link, nuvem; nos gêneros, RPG, estratégia, simulação, esportes, corrida, tiro, plataforma, ritmo, visual novel, sobrevivência e hack and slash; nos subgêneros, survival horror, metroidvania, MMORPG, stealth, TPS, action RPG e sandbox; nas plataformas, PC, Xbox, Nintendo/Switch, Dreamcast, Saturn e celular.
  - **Lucide (ISC):** ação (espada), aventura (bússola), terror (fantasma), tático e cooperativo (aperto de mãos).
  - **Phosphor (MIT):** luta (luva de boxe), soulslike (chama dupla) e FPS (mira com anel).
  - **Simple Icons (CC0):** PlayStation, PS1, PS2, PS3, PS4 e PS5.
  - **Desenhados à mão copiando o quadro:** 3DS, DS, PSP, PS Vita, NES, SNES, Game Boy, GBA, Mega Drive/Genesis e Arcade, que no quadro têm contornos próprios. Também o dado 3D com pontos (roguelike) e as duas montanhas (mundo aberto).
- **FPS separado de Tiro:** no quadro são ícones diferentes, então FPS ganhou o próprio (`g-fps`).
- **Brancos:** no tema escuro, todos os ícones da Game Library saem brancos, inclusive os que antes tinham a cor do gênero, do status ou da plataforma, e os dos formulários antigos.
  - O item ativo do menu e a aba ativa mantêm a cor de destaque, porque mostram onde você está.
  - No tema claro, os ícones seguem a cor do texto (escura); brancos ficariam invisíveis no fundo branco.
- **Mantidos:**
  - Wii, Wii U, GameCube e Nintendo 64 continuam com os desenhos anteriores. Os logotipos do quadro são marcas da Nintendo, que não existem como vetor aberto (foram retirados do Simple Icons a pedido da empresa), e não foram recriados.
  - Também ficaram os ícones sem correspondente no quadro: setas, fechar, adicionar, editar, lixeira, temas de franquia e outros.
- **Licenças:** os avisos das bibliotecas de origem estão em `Assets/Icons/LICENSES.txt`. As bibliotecas foram usadas só para extrair os desenhos; o vault não depende delas para funcionar.

## Novidades da versão 3.39

**Um só sistema de ícones e um módulo legado menor.** Por fora, nada muda de lugar; por dentro, sai código duplicado e sem uso.

- **Ícones dos formulários antigos:** os editores que vêm do módulo legado (Editar detalhes, Capa e fundo, Sessões, Notas, DLC, Zeradas, Importar vários jogos, Dados incompletos, Exportar, Backup, Nova coleção, Editar coleção, Nova plataforma, Novo gênero e Prêmios do ano) desenhavam ícones com uma família própria, de traço 1,8 e desenhos diferentes. Agora usam o mesmo registro do resto da biblioteca (`SteamVaultUI.paths`, traço 1,75).
  - 48 dos 69 desenhos antigos já existiam no registro com o mesmo nome e saíram.
  - 4 viraram apelidos de ícones existentes: `tick`→`check`, `pencil`→`edit`, `zap`→`bolt` e `bookOpen`→o livro aberto.
  - 17 que só existiam no legado passaram para o registro (pasta, sacola, tendência, caixa de entrada, proibido, caixa, controles, setas, cérebro, disco, salvar, balão, pausa, círculo, presente e cartas). Por isso aparecem na galeria e em `Assets/Icons/ui/`.
- **Emojis:** a varredura dos 16 formulários não achou nenhum emoji visível. Os que existem no código já viravam ícones na hora de desenhar e agora viram ícones do registro.
- **Código removido do `SteamVaultLegacy.js`** (6.527 → cerca de 6.030 linhas):
  - 21 métodos que nenhuma tela chamava: o cartão de jogo antigo com estrelas, preço e selo de platina; a leitura antiga de conquistas, hoje feita pelo `SteamVaultCore`; o botão antigo de sincronizar categorias; e o editor de categoria `editCategory`, sem nenhum botão;
  - a tabela duplicada de ícones;
  - dois campos de dados nunca lidos (`platformIcons` e `statusIcons`, com emojis);
  - as regras de CSS que só serviam ao que saiu.
- **Como se garantiu que era seguro:**
  - uma análise de alcançabilidade partiu do que as outras telas chamam e seguiu as chamadas internas, sem contar nomes soltos;
  - antes de apagar, os métodos marcados viraram armadilhas, e os 16 formulários foram abertos pelos botões reais: nenhuma chamada;
  - depois da remoção, a análise refeita não acha mais nada inalcançável.

## Novidades da versão 3.38

**Imagem própria no lugar do ícone.** Gêneros, subgêneros, plataformas, franquias e coleções podem usar uma imagem sua em vez do ícone SVG. Ela fica em *Editar identidade › Imagem própria*.

- **De onde vem a imagem:**
  - *Escolher do dispositivo* envia um arquivo do celular ou do computador e salva em `Assets/Icons/Custom/`;
  - o campo de texto aceita um caminho do vault (com sugestões das imagens que já estão nele, conforme você digita), um `[[link]]` ou um endereço `https://`;
  - formatos: PNG, JPG, WebP, GIF, AVIF, BMP ou SVG.
- **Onde aparece:** em todo lugar onde aquele ícone já aparecia, como selo da página, marca d'água do topo, cartões dos hubs, etiquetas na ficha do jogo, filtro de plataforma da Biblioteca e editor. A imagem tem o mesmo tamanho do ícone, fica quadrada, inteira (sem cortes) e com cantos suaves.
- **Como voltar ao ícone:** *Remover* no campo ou escolher qualquer ícone da grade. Remover não apaga o arquivo do vault.
- **Na nota:** o campo é `iconImage` (por exemplo `iconImage: "Assets/Icons/Custom/genero-horror.png"`). Se a imagem sumir do vault, a Game Library volta sozinha para o ícone.
- **Cor:** um SVG enviado aparece como imagem, com as cores dele; ele não acompanha a cor do texto como os ícones da biblioteca.
- **Como funciona por dentro:** o `U.icon()` passou a aceitar `img:<endereço>`, e a identidade (`ident` e `collectionIdent`) devolve isso quando há `iconImage`. Por isso nenhuma tela precisou mudar.

**Canva e Higgsfield nesta versão**
- **Retrospectiva 2026 no Canva:** uma apresentação editável na sua conta do Canva, montada com os números reais do vault (jogos, horas, zerados, prêmios de 2026 e curiosidades). Dá para ajustar e exportar em PNG, PDF ou PPTX pelo próprio Canva.
- **Artes das coleções:** o Canva gerou banners para "Clássicos portáteis" e "Meta: platinar em 2026", mas eles não entraram no vault. A rede desta sessão bloqueia os servidores de download do Canva, e a cópia local tem só 199 × 112 px. Para usar, abra as imagens no Canva, baixe e escolha cada uma em *Editar identidade › Arte do topo* da coleção.
- **Higgsfield:** o plano gratuito recusa os modelos de imagem melhores, e o download do resultado também é bloqueado pela rede da sessão. Por isso não foi usado.

## Novidades da versão 3.37

**Revisão de acabamento, sem reformular o que funciona.** Antes de mexer, cada tela foi auditada em celular, tablet e computador, nos temas escuro e claro:
- **Telas e capturas:** Início, Biblioteca, fichas, Conquistas, Estatísticas, Coleções, Lista de desejos, Perfil Steam, Plataformas, Gêneros e Configurações;
- **Interação:** 236 botões clicados, um a um, com registro de erros de JavaScript;
- **Foco por teclado:** navegação com Tab;
- **Auditorias automáticas:** layout, acessibilidade e contraste.

O funcionamento estava sólido: nenhum erro e nenhum botão sem ação. Por isso a versão traz só correções pontuais de acabamento:

- **Linha sobre a arte:** nas fichas, coleções e demais telas com arte no topo, uma linha escura de 1 px atravessava a imagem logo abaixo da barra superior. O degradê da barra se repetia dentro da borda transparente; agora ele é desenhado na caixa da borda, sem repetir.
- **Status da Steam legível sobre a arte:** "Steam não conectada" e o ícone de sincronização ganharam sombra suave enquanto a barra está sobre uma imagem, e não somem mais numa arte clara.
- **Ficha no celular:** o anel de "sem conquistas" ao lado dos números era espremido até virar uma oval; agora mantém o círculo.
- **Conquistas no celular:** o título começava colado nos botões flutuantes do topo. Agora começa abaixo deles, como em todas as outras telas.
- **Estatísticas no celular:** com três destaques numa grade de duas colunas, sobrava uma célula vazia; o último destaque passa a ocupar a linha inteira.
- **Menos botões repetidos:**
  - Lista de desejos vazia: o aviso já traz *Importar da Steam* e *Adicionar jogo*. O topo não repete mais esses botões, nem mostra *Verificar preços*, que não faz nada sem jogos.
  - Perfil Steam desconectado: havia três botões *Conectar perfil* na mesma tela; o do cartão Sincronização virou só um aviso.
- **Mantidos de propósito:**
  - os campos de seleção ficam com 16 px no celular, porque abaixo disso o iOS amplia a tela ao focar;
  - as áreas de toque dos pontinhos do carrossel e das legendas de status já são estendidas por CSS;
  - o campo de busca mostra o foco no contorno da caixa.
- **Canva e Higgsfield:** não foram usados nesta versão. Todas as melhorias eram ajustes de CSS e de modelo, em que uma imagem de referência não acrescentaria nada.

## Novidades da versão 3.36

**Gêneros redesenhados com pessoas e movimento.** Cinco ícones não diziam o que o gênero é:
- Aventura era um mapa genérico, igual ao tema Mapa;
- Ação era uma explosão abstrata, que servia a qualquer gênero;
- Ação e aventura era um chapéu, sem nenhum confronto;
- Hack and slash eram três riscos que lembravam garras;
- Luta era um punho, força sem oponente.

Agora:

| Gênero | Novo símbolo | Por que se distingue |
|---|---|---|
| Aventura (`g-adventure`) | caminhante subindo a encosta até a bandeira no pico | exploração e descoberta; é o único com montanha |
| Ação (`g-action`) | voadora com linhas de movimento | movimento e impacto, sem cenário nem arma |
| Ação e aventura (`g-actionadventure`) | salto entre dois penhascos com a espada erguida | o obstáculo do terreno (aventura) junto com a arma (confronto) |
| Hack and slash (`g-hackslash`) | espada com dois rastros de golpe em meia-lua | a arma em movimento, golpes seguidos |
| Luta (`g-fighting`) | dois lutadores frente a frente, um ataca e o outro defende | o confronto entre oponentes, sem arma |

- **Action RPG** (`g-arpg`) virou um brasão (escudo à frente da espada). A espada solta ficaria quase igual ao novo hack and slash; o brasão mantém a família do RPG.
- **Mantidos:**
  - RPG × Action RPG ficam distintos (dado de 20 lados × brasão);
  - FPS × 3ª pessoa (mira × personagem com mira), Plataforma × Metroidvania (blocos com salto × salas ligadas) e Sobrevivência × Terror (fogueira × fantasma) já se distinguiam;
  - Roguelike e roguelite, e estratégia e RTS, são o mesmo verbete na taxonomia do vault (mesma cor e frase), por isso dividem o ícone;
  - simulação e gerenciamento: a taxonomia não separa os dois.
- **Subgêneros:** os seis do vault (Survival Horror, Puzzle, Exploração, Parkour, Plataforma 2D e Precision Platformers) já tinham ícone próprio, e nenhum ficou de fora; não foi preciso criar uma família nova. O ícone escolhido na nota Sandbox (`planet`) foi preservado.
- **Galeria de ícones:** cada gênero ganhou uma linha com o conceito do símbolo.
- **Arquivos:** `map` e `sword` passaram de `Assets/Icons/genres/` para `themes/`, porque continuam disponíveis para franquias e coleções. `g-adventure` e `g-arpg` entraram em `genres/`.
- **Processo:** as poses partiram de uma prancha de referência do Canva. O Higgsfield gerou uma referência do montanhista, mas o proxy desta sessão bloqueou o download, então ela não pôde ser inspecionada aqui. Os vetores foram desenhados à mão na grade de 24 e revisados em 16, 24, 64, 96 e 144 px.

## Novidades da versão 3.35

**Sistema de ícones revisado.** Todos os ícones são da mesma família: traço 1,75 com pontas e cantos arredondados, grade de 24 com margem de 3, sem preenchimento (só pontos pequenos) e na cor do texto (`currentColor`). Eles continuam desenhados inline pelo `U.icon()`, por isso seguem o tema claro, o escuro e a cor de destaque sem nada extra. Um SVG carregado como imagem não herdaria essa cor.

- **Gêneros com símbolo próprio:** antes, vários gêneros dividiam o mesmo ícone. Ação, plataforma e esportes, por exemplo, usavam chama, montanha e troféu, e o troféu é também o ícone de Conquistas. Agora cada gênero da taxonomia tem o seu:

  | Família | Gêneros |
  |---|---|
  | Ação e combate | explosão (ação), golpes (hack and slash), punho (luta), mira (tiro), atirador com mira (3ª pessoa), espada fincada com brasas (soulslike) |
  | Aventura e exploração | mapa (aventura), chapéu de aventureiro (ação e aventura), bússola (exploração), montanhas com sol (mundo aberto), cubo (sandbox), salas ligadas (metroidvania) |
  | RPG | dado de 20 lados (RPG), cristal (JRPG), espada (action RPG), globo (MMORPG) |
  | Plataforma e movimento | blocos com salto (plataforma), escada de blocos (2D), plataforma flutuante (3D), espinhos com salto (precisão), corredor (parkour), carro (corrida), bola (esportes) |
  | Mente e estratégia | peão (estratégia), grade tática, broto (simulação), peça de quebra-cabeça, dado (roguelike) |
  | Tensão | fantasma (terror), caveira (survival horror), fogueira (sobrevivência), máscara (furtividade) |
  | História e estilo | livro aberto (narrativo), balão de fala (visual novel), nota com batidas (ritmo), dupla (cooperativo), coração de pixels (indie) |

  Visual novel e MMORPG passaram a ter identidade padrão. O ícone padrão de um gênero desconhecido deixou de ser as máscaras de teatro e passou a ser o controle.
- **Consoles legíveis:** PlayStation 1 a 5 e Xbox, 360, One e Series eram o aparelho com um controle espremido ao lado, ilegíveis em 16 px. Agora cada um é uma silhueta só, com a forma que diferencia a geração: a caixa com tampa do disco, a torre fina em pé, o topo arredondado, a placa inclinada, as asas curvas, e assim por diante.
- **Temáticos na margem:** fantasma, caveira, bússola, mira, carro, montanha, coroa, controle, celular, portátil, espada e mapa encostavam na borda (círculos de raio 10 numa grade de 24) e pareciam maiores e mais pesados que os demais. Foram redesenhados dentro da área útil.
- **Mantidos:** os ícones de interface (busca, filtro, ordenação, grade, lista, relógio, coração e outros), os outros consoles e portáteis e as marcas, que já seguiam a grade. As marcas são símbolos próprios e simplificados, não os logotipos oficiais.
- **Nomes preservados:** os redesenhados mantiveram o nome, então uma nota que escolheu `skull` ou `c-ps2` em *Editar identidade* ganha o desenho novo sem mudar nada. Os novos usam o prefixo `g-`. O editor de identidade ganhou o grupo **Gêneros**.
- **Arquivos SVG:** os 181 ícones estão em `Assets/Icons/` (`genres`, `platforms`, `brands`, `themes`, `ui`), um arquivo por ícone, com `viewBox="0 0 24 24"`, `currentColor` e nada além de geometria. O registro em `Scripts/SteamVaultUI.js` é a fonte. Depois de mudar um ícone, rode `node .github/tests/icons.js --write`. O teste `icons.js` no GitHub falha se os arquivos ficarem desatualizados, se sobrar ou faltar arquivo, se aparecer algo além de geometria ou se algum XML for inválido.
- **Galeria de ícones** (`Dashboard/Ícones`, ou *Configurações › Aparência › Galeria de ícones*): mostra os gêneros por família, os consoles, os portáteis, as marcas, os temas e a interface. Cada ícone aparece em 24 e 16 px sobre fundo escuro e claro, com o nome e um selo "na biblioteca" quando o gênero ou a plataforma tem jogos. No topo, todos os gêneros ficam lado a lado em 16 px, para conferir se dá para distinguir.
- **Processo:** a direção visual saiu de uma prancha de referência gerada no Canva (só referência; nenhuma imagem dela entrou no vault). Os vetores foram desenhados à mão na grade de 24.

## Novidades da versão 3.34

**A gamificação saiu.** A Jornada (nível, XP, ouro, patentes, atributos, missões, chefões, recompensas, meta diária, energia do dia) e as insígnias foram removidas por completo. Elas pediam manutenção e atenção sem ajudar no que a Game Library faz: organizar a biblioteca, acompanhar o progresso real e decidir o que jogar. Nada novo entrou no lugar; o progresso continua na Início, nas Estatísticas, em Conquistas e no Perfil.

- **Removido:**
  - a tela Jornada (`Dashboard/Jornada.md`), o script `SteamVaultJourney.js`, a entrada no menu lateral, no menu Mais e no menu da conta;
  - as insígnias (Bronze → Diamante) e os avisos "Insígnia conquistada";
  - no Perfil: nível, anel de XP no avatar, patente, título escolhido entre os liberados, cartão de nível, "Insígnias em destaque", a barra de abas da Jornada e a imagem do personagem;
  - na Início: o cartão "Próxima insígnia" (o cartão passou a se chamar só **Metas**);
  - no cartão de compartilhar o perfil: a linha de nível e patente (fica "Biblioteca de jogos · ano");
  - os sons de nível novo, chefão, missão e moedas (continuam: conquista, conquista rara, 100%, jogo zerado, sessão ao vivo e favorito);
  - cerca de 490 regras de CSS, 270 textos de tradução e as preferências `milestones` e `journeyLevel` da sincronização.
- **Preservado:** jogos, sessões, conquistas, notas, coleções, metas automáticas, Caçador de conquistas, calendário, fila "A seguir", sessão ao vivo, retrospectiva e o Perfil (nome, avatar, bio, fundo, vitrine, DNA gamer, momentos marcantes e contas conectadas).
- **Dados:** a nota `Dashboard/Jornada.md` deste vault só tinha `quests: []`, sem nada seu, e foi apagada (continua no histórico do git). Em um vault atualizado por cima, uma nota antiga da Jornada **não é apagada**: as missões, recompensas e chefões ficam intactos no frontmatter dela, e abrir a nota mostra o Perfil. Pode apagar a nota quando quiser. Campos antigos do perfil (`title`, `art`, `artRatio`, `artFit`, `artPos`) e imagens em `Assets/Personagem` também ficam onde estão; só deixam de ser lidos.
- **Perfil reorganizado:** sem o cartão de nível, as colunas ficaram equilibradas: Vitrine e Contas conectadas de um lado, DNA gamer e Momentos marcantes do outro. No celular a ordem é a mesma, em uma coluna.

## Novidades da versão 3.33

Auditoria completa do vault (visual, código, funcionamento e desempenho), com correções e duas funções novas.

- **Novas funções:**
  - **"Sua semana": esta semana ou a semana passada.** Um seletor no bloco da Início mostra a semana atual ou os 7 dias anteriores, com as barras por dia, as horas, as sessões, as conquistas e a comparação com a semana anterior. Embaixo aparece o jogo mais jogado no período (toque abre a ficha).
  - **"Seu ano com o jogo" na ficha** (aba Sessões): um mapa de calor dos últimos 12 meses com os dias de sessão, conquista ou marco daquele jogo.
- **Legibilidade (contraste medido em todas as telas, nos dois temas):**
  - **Tema claro:** o azul de destaque, o verde, o âmbar e o ciano usados em textos e links ficaram mais escuros. Agora passam do mínimo de leitura (4,5:1), e antes ficavam entre 3,6 e 4,2.
  - **Botões com cor de destaque no tema claro:** Azul-céu, Laranja, Dourado, Verde e Ciano tinham texto escuro sobre fundo escuro. Agora o texto é branco.
  - **Jornada (tema claro):** os números de HP e Humor, e o dourado, ficaram mais escuros.
  - **Integrações:** os botões "Importar jogos" do PlayStation e do Nintendo, e "Conectar" da Steam e do RetroAchievements no tema claro, ganharam contraste.
  - **Perfil:** o estado das contas conectadas e o nível "Prata" das insígnias no tema claro.
- **Mapas de calor (Estatísticas e ficha):** no celular abriam mostrando o começo do ano; agora abrem nos dias mais recentes, e a legenda não some ao rolar.
- **Código mais limpo, sem mudar nada na tela:**
  - 70 declarações de CSS que eram sempre sobrescritas pela mesma regra mais adiante foram removidas (13 regras ficaram vazias e saíram);
  - três funções antigas que nada mais chamava e duas classes de CSS sem uso também saíram.
  - Capturas de 170 telas (celular, tablet e computador, temas escuro e claro) foram comparadas pixel a pixel antes e depois e saíram iguais.
- **Teste automático novo (`functional.js`):** usa o vault como uma pessoa e confere o que foi gravado nas notas. Passa por busca e filtros da Biblioteca, busca global, abas, menus e editores da ficha, favoritar, fila "A seguir", sessão ao vivo, missão da Jornada, "Sua semana", mapa de calor, Personalizar Home, menu Mais e Configurações. Agora roda no GitHub a cada envio, junto com os testes que já existiam.

## Novidades da versão 3.32

- **3.32.2, acabamento depois da limpeza:**
  - **Telas do RetroAchievements:** jogos ainda sem sincronizar mostravam "0 de 0 · 0%" e os números "0 / 0" e "0%". Agora aparece "Conquistas aparecem depois da sincronização" e um "—" onde não há dado.
  - **Arquivos soltos:** saíram da raiz do vault 4 capturas de teste (`lib-b-*.png`, cerca de 1 MB) que tinham entrado por engano na 3.22.
- **3.32.1, vault sem conquistas pessoais:**
  - **Removido:**
    - as 411 notas de conquista que vieram da Steam e do RetroAchievements (pastas em `Achievements/`);
    - os ícones salvos em `Assets/Achievements/`;
    - os contadores (`achievementsEarned`/`achievementsTotal` ficam em 0) e os caches de sincronização `steam:` e `ra:` das fichas.
  - **Mantido:** os jogos continuam, com a origem das conquistas configurada (Steam ou RetroAchievements, automática). Ao conectar a sua conta e sincronizar, as conquistas voltam do seu perfil. O modelo `Achievements/_Templates` continua.
- **Efeitos sonoros:**
  - **Como ligar:** em *Configurações › Aparência › Efeitos sonoros*, desligados por padrão. Há volume Baixo, Médio ou Alto, e o botão *Ouvir* toca uma amostra diferente a cada toque.
  - **Como são feitos:** os sons são curtos, gerados pelo próprio app na hora (Web Audio), sem arquivos de áudio, sem internet e sem direitos autorais de terceiros.
  - **Onde tocam** (só nos momentos que importam, nunca em toques comuns de botão ou aba):
    - **Conquista desbloqueada:** um "plim" de duas notas, com um brilho a mais nas raras (até 10% dos jogadores);
    - **100% das conquistas:** uma fanfarra ascendente com acorde;
    - **Jogo zerado:** uma fanfarra curta de três notas;
    - **Nível novo na Jornada:** um arpejo subindo;
    - **Chefão derrotado:** um impacto grave e duas notas de vitória;
    - **Missão concluída:** um clique de confirmação, e um tom descendente ao desmarcar;
    - **Recompensa resgatada:** um som de moeda;
    - **Sessão ao vivo:** sons diferentes para começar, pausar, retomar e salvar (também ao registrar uma sessão pelo formulário);
    - **Favoritar:** um "pop" leve.
  - **De qualquer origem:** 100%, zerado, nível novo e chefão são percebidos ao comparar o estado anterior com o novo. Por isso o som toca mesmo quando a mudança vem de uma sincronização ou de outro aparelho, e não toca ao abrir o Obsidian. Se vários acontecem juntos, toca só o maior.
  - **Detalhes:** o Obsidian em segundo plano não toca nada. Um som não se empilha sobre outro em menos de 120 ms. A escolha acompanha "Mesmas preferências em todos os aparelhos".
  - **No celular:** o primeiro som só toca depois de um toque na tela (regra do Android e do iOS).

## Novidades da versão 3.31

- **3.31.1, revisão de bugs e proporções** (celular de 360 e 410 px, tablet de 820 px e computador de 1400 px, temas escuro e claro):
  - **"Continuar jogando" (ficha):** dizia "Nenhuma sessão registrada ainda" quando a sessão mais recente não tinha comentário, mesmo havendo sessões. Agora mostra a última anotação que existir ou avisa que as últimas sessões não têm anotação.
  - **Títulos longos no topo da ficha:** nomes compridos (ex.: "Bully: Scholarship Edition — Canis Canem Edit Remastered") ocupavam quatro linhas gigantes no computador e eram cortados no celular. A letra diminui conforme o tamanho do nome.
  - **Barra da sessão ao vivo:** no computador e no tablet ficou com até 520 px de largura (antes esticava com nomes longos). Em telas de 360 px, o "Sessão ao vivo" não quebra mais em duas linhas.
  - **Diário:** uma sessão sem comentário num dia com várias sessões mostrava a duração duas vezes ("Sessão de 30 min" e "30 min").
- **Fila "A seguir":** uma lista ordenada dos próximos jogos.
  - **Adicionar:** no menu ⋯ da ficha, *Adicionar à fila A seguir*, ou pelo botão *Organizar* da Início.
  - **Na ficha:** o topo mostra "2º na fila". Tocar abre a organização.
  - **Na Início:** a seção **A seguir** fica logo depois de "O que jogar agora?", com o próximo jogo em destaque. Ela pode ser movida ou escondida em *Personalizar Home*.
  - **Organizar:** botões para subir, descer e tirar da fila, e uma lista para adicionar jogos do backlog. *Salvar ordem* grava tudo de uma vez.
  - **"O que jogar agora?":** o primeiro da fila sempre aparece entre as sugestões ("Primeiro da sua fila"), e os demais ganham prioridade.
  - **Onde fica:** a ordem fica em cada ficha (`upNext: 1, 2, 3…`), então acompanha o vault entre aparelhos e não se perde ao renomear arquivos. Jogos zerados ou abandonados saem da fila sozinhos.
- **Diário do jogo** (aba Sessões): agora junta, dia a dia, as sessões, as conquistas desbloqueadas naquele dia e os marcos.
  - **Sessões:** horas, comentário, humor, progresso e o selo *Cronometrada* para as que vieram da sessão ao vivo.
  - **Conquistas:** os ícones com a cor da raridade e a mais rara do dia. Tocar abre a aba Conquistas.
  - **Marcos:** começou a jogar, zerou, entrou no vault.
  - **Dias antigos:** a partir do 20º dia, ficam em *Mostrar dias anteriores*.
- **Sessão ao vivo:**
  - **Pausar e retomar:** o botão ⏸ na barra flutuante para o cronômetro sem encerrar a sessão. O tempo pausado não conta nas horas salvas, e a barra fica âmbar enquanto está pausada.
  - **Correção:** ao tocar em ▶, a barra só aparecia depois de trocar de tela. Agora aparece na hora.
- **Conjuntos fora do total:** as conquistas de um conjunto marcado como "fora do total" (por exemplo, uma DLC que você não tem) não aparecem mais em "Próximos objetivos", no Caçador de conquistas nem nas missões automáticas da Jornada. Se você marcou alguma como alvo, ela continua aparecendo.

## Novidades da versão 3.30

- **Sessão ao vivo (cronômetro de jogo):**
  - **Começar:** na ficha de um jogo (e no destaque da Início), o botão ▶ ao lado de "Registrar sessão" começa a contar o tempo. O botão fica vermelho, com um ■, enquanto a sessão está aberta.
  - **Barra flutuante:** enquanto conta, uma barra aparece em todas as telas da Game Library, acima da barra inferior no celular e no canto no computador. Ela mostra a capa, o nome do jogo, o tempo correndo e o botão *Encerrar*. Tocar no jogo abre a ficha.
  - **Fora do app:** o início fica guardado no aparelho, então fechar o Obsidian ou trocar de app não perde a contagem.
  - **Encerrar:** mostra o tempo total, as horas jogadas (já preenchidas e editáveis) e um campo opcional "Como foi?". *Salvar sessão* grava na nota do jogo, no mesmo formato do "Registrar sessão":
    - entra em `sessions`, somando `hoursPlayed`;
    - atualiza `lastPlayed`;
    - muda Backlog para Jogando e preenche `startDate` na primeira vez.
    - Por isso a sessão conta na Jornada (XP e diárias), em "Sua semana", no feed, no calendário e nas estatísticas.
  - **Descartar** apaga a contagem sem gravar nada. Fechar a janela mantém o cronômetro rodando.
  - Só uma sessão por vez. Ao tentar começar outra, a Game Library pede para encerrar a atual.
- **Tema claro:** as cores das insígnias (bronze, prata, ouro, diamante, lendária) ficaram mais escuras no tema claro. A prata e o ouro mal apareciam sobre o fundo branco do Perfil.
- **Estatísticas › Backlog no seu ritmo:** sem sessões registradas, o cartão mostrava um "—" solto. Agora mostra as horas que faltam ("~13,8 h") e explica que o prazo em semanas aparece depois de registrar sessões.

## Novidades da versão 3.29

Revisão geral de todas as telas, no celular, no tablet e no computador, em português e em inglês.

- **Navegação:**
  - **Tocar de novo na aba atual** (barra inferior ou menu lateral) volta ao topo da tela, como nos apps de celular, em vez de recarregar a mesma tela.
  - **Vistos recentemente na busca:** ao abrir a busca com o campo vazio, aparecem os últimos jogos, conquistas, coleções e categorias que você abriu (até 6). O histórico fica só neste aparelho.
  - **Índice nas Configurações:** botões no topo (Integrações, Conquistas, Diagnóstico, Aparência, Backup) levam direto a cada seção.
- **Organização do conteúdo:**
  - **Hub de conquistas:**
    - "Em andamento" só aparece quando acrescenta algo à lista completa "Progresso por jogo" (com poucos jogos, as duas mostravam os mesmos itens);
    - "Jogos 100%" passou a se chamar "Concluídos", como no resto das telas;
    - no celular, as linhas de progresso voltaram a mostrar uma barra fina sob o nome do jogo.
  - **"Sua semana" sem atividade:** em vez de sete barras zeradas, um aviso curto com um atalho para registrar uma sessão.
  - **Tier List:** as faixas vazias ocupam menos espaço e crescem quando você arrasta um jogo para elas.
  - **História do jogo:** o nome da primeira conquista aparece entre aspas, para não ser confundido com um estado.
- **Usabilidade e toque:**
  - Links e botões pequenos (Ver todas, Sortear com filtros, Escrever minha análise, legendas, pontos do carrossel) ganharam uma área de toque maior, sem mudar o desenho. O botão de favoritar das capas ficou maior em telas de toque.
  - "Minha análise" vazia: no celular, o botão desce para a linha de baixo e ocupa a largura toda.
- **Imagens:** qualquer imagem da tela que não carrega (sem internet ou link expirado) some em vez de mostrar o ícone de imagem quebrada. Nos ícones de conquista, aparece um troféu no lugar.
- **Desempenho:** em jogos com mais de 150 conquistas, a aba Conquistas é montada só quando você a abre. A ficha abre mais rápido, e busca, filtros e conjuntos funcionam igual.
- **Inglês:** foram traduzidos "Sem jogos ainda", a contagem de franquias e jogos avulsos, os avisos de privacidade da Xbox e os textos novos desta versão.

## Novidades da versão 3.28

- **Tela de detalhes da conquista no visual novo da Steam**, igual para todas as origens (Steam, RetroAchievements, Xbox, PlayStation, Epic, Native, Custom…):
  - **Topo:** o ícone grande com o anel na cor da raridade; as raras desbloqueadas (até 10%) brilham. Abaixo vêm a capa e o nome do jogo (que abrem a ficha), o nome e a descrição da conquista.
  - **Etiquetas:** o conjunto (jogo base ou DLC, na cor do conjunto), Secreta, Hardcore (RetroAchievements), a categoria e Arquivada.
  - **Estado:** "Desbloqueada" em verde, com a data, a hora e há quanto tempo, ou "Bloqueada". Nos jogos sem sincronização automática há um botão para desbloquear ou bloquear ali mesmo.
  - **Raridade global:**
    - a % de jogadores em destaque;
    - um trilho com as faixas de raridade (Lendária ≤ 5%, Épica ≤ 15%, Rara ≤ 35%, Incomum ≤ 60%, Comum) e um marcador;
    - a faixa e a posição no jogo ("11ª mais rara de 46").
    - Sem a %, mostra a raridade escolhida por você ou explica por que ela falta.
  - **Conjunto / progresso no jogo:** "x/y", uma barra, quantas faltam e se o conjunto está completo.
  - **Detalhes:**
    - a origem com o selo da plataforma;
    - os pontos: Gamerscore no Xbox, pontos no RA e XP no Google Play;
    - como foi desbloqueada (sincronizada ou registrada por você);
    - a ordem no jogo.
  - **Notas**, *Editar* e *Abrir o jogo*.
  - **Anterior / Próxima:** navega pelas conquistas do jogo sem voltar à lista.
  - **"Mais de…":** as conquistas próximas do mesmo conjunto, no visual novo.
  - **Ícone de reserva:** quando o ícone da conquista não carrega (sem internet, por exemplo), aparece um troféu no lugar do ícone quebrado.
  - No celular, tudo fica centralizado em uma coluna; no computador, os cartões ficam em duas colunas.

## Novidades da versão 3.27

- **Conquistas no novo visual da Steam (Conjuntos de Conquistas)**, em todas as origens (Steam, RetroAchievements, Xbox, PlayStation, Epic, Native, Custom…):
  - **Linha de raridade em cada conquista:** barra fina com a % global e a faixa ("12,9% · Rara"). As raras desbloqueadas (até 10%) ganham um brilho. Conquistas sem % global mostram a raridade escolhida por você.
  - **Interruptor "% global"** na barra de ferramentas, para esconder ou mostrar as porcentagens. A escolha fica salva.
  - **Filtros em chips:** Todas, Desbloqueadas, Bloqueadas e Raras, com a contagem de cada uma, mais a busca e a ordenação (ordem do jogo, mais raras, mais recentes).
  - **Conjuntos:** o botão *Conjuntos* separa as conquistas em grupos como na Steam (jogo base, DLCs, temporadas). Basta digitar um trecho do nome ou da descrição (ex.: "Caminhos Distintos") e o nome do conjunto. O campo `set` é gravado em cada nota de conquista e a sincronização o preserva.
  - **Progresso por conjunto:** com mais de um conjunto, o topo mostra uma barra segmentada (jogo base em azul, cada DLC com a sua cor), cartões com "x/y" e "Conjunto completo", um seletor de conjunto e um grupo por conjunto na lista.
  - **Fora do total:** cada DLC pode deixar de contar no progresso total do jogo (ex.: uma DLC que você não tem). Fica em `achSetsExcluded` na ficha do jogo.
  - **Concluídos:** o filtro "100%" do hub de conquistas passou a se chamar "Concluídos", como na Steam. Jogos com vários conjuntos mostram "x/y conjuntos" na lista.
  - **Arquivadas:** conquistas com `archived: true` aparecem esmaecidas, com a etiqueta "Arquivada".
  - O que a Steam ainda não expõe publicamente (comparação com amigos) não foi incluído.
- **Desempenho:**
  - A página de um jogo de uma franquia muito grande desenhava um cartão para cada jogo da franquia. A prateleira agora mostra até 24, com "Ver todos". Num vault de teste com 1.000 jogos, a página caiu de 4,3 s para 0,6 s, e de 17 mil para 3,5 mil elementos (CPU 4× mais lenta, como num celular).
  - "Parecidos com este" deixou de varrer a franquia a cada jogo.
  - As setas das prateleiras são atualizadas no máximo uma vez por quadro durante a rolagem.
- **Correção na versão em inglês:** nomes que começavam com "Você" (ex.: a conquista "Você Fala Demais!") eram traduzidos pela metade.

## Novidades da versão 3.26

- **3.26.5:** o botão de trocar a imagem do personagem (Jornada) foi para o canto inferior direito, ao lado do nome da classe, e não cobre mais o título da arte.
- **3.26.4:** no celular, o fundo do Perfil sobe por trás da barra de status, como na Início e nas fichas, sem a faixa escura no topo. Vale com a opção "Imagem do topo na área da barra de status" ligada.
- **3.26.3:** no Perfil (Personagem), a barra de abas da Jornada saiu do topo e foi para o fim da ficha. O topo volta a começar pelo fundo e pelo avatar. Na Jornada, a barra continua no topo.
- **3.26.2, três correções:**
  - **Cores no estilo Steam:** a Jornada e o Perfil trocaram o verde neon pela paleta da Steam (azul de destaque, azul-céu `#66c0f4`, cinza-azulado e fundos escuros) e passaram a seguir a cor de destaque escolhida. Os números usam a fonte da interface.
  - **Tema e destaque nas Configurações:** em *Configurações › Aparência › Tema* há Steam (padrão), Steam clássico (`#171a21`/`#1b2838`/`#2a475e`), Grafite e Meia-noite, que mudam fundos e cartões no tema escuro. A cor de destaque ganhou o Azul-céu. As duas escolhas acompanham as preferências entre aparelhos.
  - **Navegação no Personagem:** o Perfil agora tem a mesma barra de abas da Jornada. Tocar em Missões, Chefões etc. abre a Jornada já naquela aba, e "Personagem" volta ao Perfil. A barra de abas também ficou protegida contra o gesto do Obsidian de abrir as barras laterais.
  - **Tela que se movia junto:** arrastar a Energia do Dia (ou qualquer controle deslizante) não rola mais a página nem dispara os gestos do app ou do Obsidian. A rolagem normal fora dos controles continua igual.
- **3.26.1, imagem do personagem sem esticar:** o botão de imagem no cartão do personagem (Jornada), ou *Editar perfil › Imagem do personagem*, abre um editor com prévia ao vivo.
  - **Origem:** automática (jogo em destaque), enviada do aparelho (salva em `Assets/Personagem/`, PNG/JPG/WebP/GIF/AVIF até 10 MB), uma imagem que já está no vault ou a capa de um jogo.
  - **Proporção:** Original, 1:1, 3:4, 4:5, 2:3, 4:3 ou 16:9. Ao enviar uma imagem, a proporção dela já vem marcada.
  - **Ajuste:** "Preencher" corta as bordas e tem o foco vertical ajustável; "Inteira" mostra a imagem toda sobre uma cópia desfocada dela, sem faixas pretas.
  - **Onde fica:** `artRatio`, `artFit`, `artPos` e `art` no `profile` de `Dashboard/Perfil.md`.
- **Perfil do jogador** (aba nova, na barra inferior no lugar do Perfil Steam e em *Progresso › Perfil*):
  - **Topo:** fundo com a arte de um jogo; avatar (foto da Steam, iniciais ou a capa de um jogo) com um anel do XP do nível; nome, título e bio; "Na Game Library desde".
  - **Números** que contam ao abrir: jogos, zerados, 100%, conquistas e horas.
  - **Nível** com atalho para a Jornada; **vitrine** com 4 favoritos; **insígnias em destaque**.
  - **DNA gamer:** % de jogos zerados, plataforma principal, franquia favorita, nota média e gêneros favoritos.
  - **Momentos marcantes:** primeiro jogo, primeiro zerado, primeiro 100%, conquista mais rara, mais jogado e melhor ano.
  - **Contas conectadas.**
  - **Editar perfil:** nome, bio, título, avatar, fundo e vitrine. Os títulos são liberados por nível, atributos e insígnias. Tudo fica no frontmatter de `Dashboard/Perfil.md`.
  - **Cartão para compartilhar:** passa a usar esse nome, esse avatar e o nível.
- **Jornada reconstruída** sobre o vault de referência *Obsidian Gamification — Level Up HUD*, adaptada à biblioteca de jogos:
  - **Abas:** Visão geral · Missões · Chefões · Recompensas · Histórico · Insígnias, mais os atalhos Personagem e Guia.
  - **XP Atual:** quanto falta para o próximo nível, com **ouro**, sequência e missões.
  - **Meta de XP diária:** anel e valor configuráveis.
  - **Códice de Hoje:** diárias automáticas e as suas, com adição rápida.
  - **Energia do Dia:** HP, humor e energia em barras que dá para arrastar ou ajustar pelo teclado.
  - **Quadro de Missões:** grupos recolhíveis Principal, Urgente e Secundária, com missões automáticas e as suas (XP e prazo opcional).
  - **Chefões:** um jogo para zerar ou fazer 100% até uma data e hora. O HP cai conforme você avança, a contagem regressiva mostra o chefão mais próximo, e o XP vem se ele for derrotado no prazo.
  - **Menu de Dopamina:** recompensas pagas com ouro (todo XP vira ouro, e gastar não reduz o nível). Vem com 6 recompensas de jogador; dá para criar as suas e desfazer um resgate.
  - **Últimos 7 dias e últimos 30 dias:** barras com a linha da meta. Tocar num dia mostra o que rendeu XP.
  - **Histórico de XP:** por dia, de onde vem o XP e como ele é calculado.
  - **Insígnias novas:** Caçador de Chefões, Missionário, Merecido e Foco Total.
- **Interação e animações:**
  - destaque que desliza entre as abas e entrada suave de cada aba;
  - números contando, barras e anéis se desenhando, radar crescendo do centro;
  - confete e "+XP" ao concluir uma missão, "−ouro" ao resgatar;
  - comemoração ao subir de nível;
  - borda animada no personagem e brilho na barra de XP;
  - segundos da contagem pulsando;
  - radar tocável: cada atributo mostra o nível e como subir.
  - Com "reduzir movimento", tudo aparece parado.
- **Correções visuais:**
  - os rótulos do radar não cortam mais no celular;
  - os botões da Jornada não herdam mais o estilo padrão de botão do Obsidian;
  - os brilhos de anéis e radar não desenham mais um quadrado escuro;
  - a grade de números do perfil não deixa espaço vazio no celular.

## Novidades da versão 3.25

- **Jornada (gamificação):** nova tela em *Mais › Progresso › Jornada* (no computador, na barra lateral), com painéis neon e uma cor por assunto. Tudo é calculado pelas suas notas; você não digita XP.
  - **Nível e XP.** Ganham XP:
    - jogo na biblioteca +25, começado +50;
    - zerado +500, 100% +1.000;
    - conquista +10, com bônus para as raras (até 35% +5, até 15% +15, até 5% +40);
    - hora jogada +5 e avaliação +20;
    - dia com atividade +15 e semana com 4 dias ativos +100;
    - nível de insígnia +150;
    - missões próprias: o XP que você definir.
  - **Custo dos níveis:** cada nível custa 150 XP a mais que o anterior (300, 450, 600…).
  - **Patentes:** Novato, Aventureiro (5), Veterano (10), Herói (20), Lenda (35) e Mítico (60).
  - **Personagem:** a capa do jogo em destaque, com uma classe tirada do seu atributo mais forte (Caçador de Troféus, Finalizador, Explorador de Mundos, Maratonista, Sentinela ou Crítico).
  - **Radar de atributos:** seis eixos (Conquistas, Finalização, Exploração, Dedicação, Constância e Crítica), cada um com a sua cor, em escala logarítmica de 0 a 100.
  - **Contagem regressiva:** até o fim da semana, do mês, do ano ou uma data própria (lançamento, evento). Toque no texto abaixo dos números para mudar.
  - **Energia:**
    - vida do backlog: jogos já começados sobre o total;
    - ânimo: dias com atividade nos últimos 7;
    - dias seguidos agora e o seu recorde.
  - **Missões:**
    - principal: zerar o jogo em andamento mais adiantado ou começar o próximo do backlog;
    - urgente: preço-alvo atingido, um jogo perto dos 100% ou uma meta anual atrasada;
    - secundárias: conquistas marcadas como alvo e as mais fáceis do que você está jogando.
  - **Diárias e semanais:** marcadas sozinhas pelas sessões e conquistas com data. As semanais recomeçam na segunda.
  - **Missões próprias:** únicas, diárias ou semanais, valendo de +50 a +500 XP. Ficam no frontmatter de `Dashboard/Jornada.md` (campo `quests`), então acompanham o vault em todos os aparelhos.
  - **Aviso de nível:** a subida de nível aparece uma vez, como as insígnias.
  - **Insígnias:** saíram da aba Conquistas e agora ficam no fim da Jornada. O card "Próxima insígnia" da Início abre a Jornada.
  - **Layout:** no computador, três colunas como no painel de referência; no celular, uma coluna na ordem nível → energia → contagem → missões → diárias → atributos → missões próprias → XP.
  - **Idiomas e temas:** tudo traduzido para o inglês; o tema claro e o preto OLED são respeitados.

## Novidades da versão 3.24

- **3.24.3, Insígnias:** os antigos "Marcos do Vault" viraram **Insígnias**, numa lista compacta em vez de 13 blocos grandes.
  - Cada linha mostra o nível atual, os níveis em bolinhas (bronze, prata, ouro, platina, diamante), quanto falta ("5 de 10 jogos zerados") e o próximo nível. A barra tem a cor do próximo nível.
  - No topo, um resumo por nível ("3 Prata · 7 Bronze · 3 a desbloquear").
  - Aparecem as 6 primeiras; *Ver todas as insígnias* mostra o resto.
  - Os avisos e o card da Início passaram a dizer "insígnia".
- **3.24.2, segurança:**
  - Endereços de imagem vindos de notas não alcançam a rede local.
  - Cores e links vindos de notas e do cache são validados antes de entrar na tela.
  - Respostas grandes demais da loja e do RetroAchievements são recusadas.
  - Os testes do GitHub ganharam verificações de segurança do código.
- **Versão em inglês:** *Configurações › Aparência › Idioma · Language*, com Português ou English. A escolha vale para o aparelho (ou para todos, com "Mesmas preferências em todos os aparelhos").
  - **O que é traduzido:** telas, menus, abas, botões, janelas de edição, avisos, cartões para compartilhar e a tela de carregamento. Datas usam os meses em inglês, e números usam ponto decimal (6.4 h, R$ 23.99).
  - **O que não muda:** o conteúdo das suas notas (títulos, sinopses, análises, nomes de gêneros, coleções e conquistas que vieram da Steam em português).
  - **Como funciona:** o app continua escrito em português. Com o inglês ligado, o `SteamVaultI18n.js` troca cada texto pelo do dicionário (mais de 2.400 frases, com modelos para as partes variáveis, como "606 jogos" → "606 games"). O que faltar no dicionário aparece em português, sem quebrar nada; para incluir, basta acrescentar a linha `"texto em português": "English text"` no `this.en`.
  - Custa entre 10 e 50 ms a mais por tela.
  - Os testes no GitHub agora também abrem todas as telas em inglês.

## Novidades da versão 3.23

- **Biblioteca sob demanda:** com mais de 120 jogos, a Biblioteca abre com 60 cards e traz mais 60 sempre que a rolagem chega perto do fim. Contadores e índice A–Z contam todos desde o início. Busca, filtros, ordenação, pular para uma letra, a visualização Lista e "Selecionar vários › Todos" carregam o resto na hora.
- **Tamanho do texto:** *Configurações › Aparência*, com quatro tamanhos (Menor, Padrão, Maior, Bem maior). Vale só para a Game Library.
- **Preto puro:** *Configurações › Aparência*. No tema escuro, o fundo vira preto de verdade, o que economiza bateria em telas OLED.
- **Backup em um toque:** *Configurações › Backup e aparelhos › Fazer backup agora*.
  - Gera `Backups/Game Library AAAA-MM-DD HHMM.zip`, com todas as notas de `Games/`, `Achievements/`, `Collections/`, `Platforms/`, `Genres/`, `Subgenres/`, `Franchises/` e `Dashboard/`, mais o arquivo de preferências.
  - Ficam os 5 mais recentes; os antigos vão para a lixeira do Obsidian. Imagens e scripts não entram, porque vêm do zip da versão.
  - Para restaurar, descompacte por cima do vault.
  - A Início lembra quando o último backup passa de 30 dias (ou quando ainda não há nenhum e a biblioteca tem 5 jogos ou mais). O X adia o lembrete por uma semana.
  - A pasta `Backups/` está no `.gitignore`.
- **Mesmas preferências em todos os aparelhos:** *Configurações › Backup e aparelhos*. Ligue em cada aparelho.
  - **O que vai junto:** cor de destaque, tamanho do texto, preto puro, layout da Início, visualização e filtros da Biblioteca e das Coleções, animações, brilho e inclinação das capas, vibração, formato dos cartões, período das Estatísticas, marcos e metas já anunciados e os lembretes.
  - **O que fica em cada aparelho:** barra lateral, aba aberta e áreas seguras da tela.
  - **Onde fica:** em `Assets/game-library-preferencias.json`, que viaja com o vault (Obsidian Sync, iCloud, Syncthing…).
  - **Ao ligar:** se outro aparelho já salvou, este adota o que está no arquivo; senão, este vira a referência.
  - Só entram as chaves da lista; nada de chaves de API, senhas ou dados de conta.

## Novidades da versão 3.22

- **Game Library:** novo nome do app em todas as telas, cartões e textos, com o ícone do controle. Os arquivos continuam com os nomes antigos (`Scripts/SteamVault*.js`, `.obsidian/snippets/steamvault.css`, `Assets/steamvault-boot.js`), assim como a classe `steamvault` das notas e a pasta `.steamvault/`. Nada precisa ser renomeado num vault existente.
- **Listas longas nas Estatísticas:** "Do início ao fim" e "Zerados por ano" mostram primeiro os mais recentes; o botão *Mostrar mais* traz o resto.
- **Desempenho:** a Biblioteca e as listas de Conquistas não desenham o que está fora da tela, e editar notas que não são do vault de jogos não recalcula a biblioteca.

## Novidades da versão 3.21

- **Primeiros passos:** com o vault vazio, a Início vira um assistente de 5 passos: conectar uma conta, adicionar jogos, capas e artes, cor e layout, e uma meta do ano. Cada passo se marca sozinho quando é feito. Com jogos no vault, o cartão aparece no topo da Início até tudo ficar pronto ou até ter 15 jogos. *Dispensar* esconde neste aparelho; *Configurações › Aparência* traz de volta.
- **Lista de desejos própria** (`Dashboard/Lista de Desejos`, também no menu): todos os jogos com status `Wishlist`.
  - Resumo com quanto custa a lista inteira hoje (e a economia), quantos estão em promoção, quantos chegaram ao preço-alvo e quantos estão no menor preço já visto.
  - Filtros (todos, em promoção, no preço-alvo, sem preço) e ordem por melhores ofertas, menor preço, mais perto do alvo, adicionados por último ou nome.
  - Cada jogo mostra preço atual, desconto, menor preço já visto (com a data), a barra até o preço-alvo e um gráfico pequeno do histórico. Tocar num ponto mostra data, preço e loja.
  - *Alvo* abre uma janela com sugestões (menor preço já visto, 25% e 50% de desconto). *Comprei* muda o status para `Backlog` e grava preço e data da compra.
  - O histórico cresce a cada verificação de preço (no máximo um ponto por dia).
  - *Importar da Steam* cria as fichas dos jogos da sua lista pública da Steam que ainda não estão no vault, com capa.
- **Testes automáticos no GitHub:** a cada envio, o GitHub confere a sintaxe dos scripts, o espelho do CSS, a versão, o frontmatter das notas e se há algum segredo versionado, e abre todas as telas num navegador no tamanho de celular e de computador. Para rodar no seu computador: `cd .github/tests && npm ci && npx playwright install chromium && npm test`.
- **Versões no GitHub:** quando a versão do `SteamVaultCore.js` muda, o GitHub cria a página da versão com as novidades (tiradas do `AUDITORIA.md`) e o zip pronto para abrir no Obsidian.

## Novidades da versão 3.20

- **Ícones das conquistas no vault:** *Configurações › Conquistas › Salvar ícones no vault* baixa os ícones da Steam, do RetroAchievements, da Xbox e da GOG para `Assets/Achievements/`. Assim eles aparecem sem internet. O campo `icon` da nota passa a apontar para o arquivo; o link original fica nos campos de cada plataforma.
- **Estatísticas › Ano a ano:** compara todos os anos (até 10), independentemente do período escolhido no topo. As horas vêm das sessões registradas.
- **Cor de destaque:** *Configurações › Aparência › Cor de destaque*, por aparelho. Quem usa o Style Settings ("Azul principal") continua podendo; a cor escolhida na Game Library vale por cima dele.
- **Bibliotecas grandes:** a Biblioteca, as listas de Conquistas e as abas de Estatísticas carregam em partes. Não há nada para configurar.
- **Teclado:** o primeiro Tab mostra "Pular para o conteúdo".

## Ícones de plataformas (versão 3.18.1)

- **Consoles PlayStation e Xbox:** aparecem com o próprio controle ao lado, para ficarem reconhecíveis mesmo pequenos.
- **Marcas:** PlayStation, Xbox, Nintendo, Steam, GOG, Epic Games, RetroAchievements e Google Play Games têm ícones próprios (`b-playstation`, `b-xbox`…). Eles identificam a origem em todo a Game Library: integrações, perfis, hub de Conquistas e selo de origem.
- **Escolher na nota:** use `icon: b-playstation` (ou outro) no frontmatter de uma plataforma, ou o grupo "Marcas e lojas" em *Editar identidade*.

## Integrações e Subgêneros (versão 3.18)

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

## Estatísticas (versão 3.17)

- **Período:** "Tudo" usa o tempo total de cada jogo; "Este ano", "12 meses" e "30 dias" contam só o que tem data (sessões, zeradas, conquistas, jogos adicionados). Para ver horas por período, registre sessões.
- **Abas:** Visão geral, Tempo, Gosto, Conquistas e Dinheiro. A aba e o período ficam lembrados neste dispositivo.
- **Economia:** usa o campo `regularPrice` (preço normal) quando ele é maior que `price` (o que você pagou).

## Home (versão 3.15)

- **Personalizar Home** (no fim da página): liga e desliga seções, muda a ordem e escolhe os cartões do painel lateral. A escolha fica salva neste dispositivo.
- **Sua semana:** usa as horas das sessões registradas; sem sessões, conta as atividades do dia.
- **O que jogar agora:** três sugestões do dia; "Sortear com filtros" abre o sorteio completo.

## Biblioteca (versão 3.11)

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
