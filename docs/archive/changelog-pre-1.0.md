# Changelog anterior à 1.0 (arquivo)

> **Arquivo histórico.** Resumo das últimas versões de desenvolvimento (3.62 a 3.74), como
> estava antes da consolidação na **V1.0 — Prototype**. Notas completas em
> [notas-de-versao-pre-1.0.md](notas-de-versao-pre-1.0.md) e histórico técnico em
> [historico-tecnico-pre-1.0.md](historico-tecnico-pre-1.0.md).

## 3.74.0: Conquistas do Xbox 100% manuais (reconstrução)

### Removido
- Busca e importação por TrueAchievements, XboxAchievements, Exophase, MetaGamerScore e XB.Live (3.71), página salva `.mhtml`/HTML e HTML colado (3.72), favorito com script (3.73), comparação entre fontes e a limpeza automática de tokens da antiga API do Xbox. Também saíram os servidores de imagem da Xbox Live da lista de ícones baixáveis. As notas de conquista existentes não foram tocadas.

### Adicionado
- **Gerenciador de conquistas** (`SteamVaultAchManager.js`), na ficha de jogos de Xbox:
  - **Em lote:** uma por linha (`Nome | Descrição | G | Categoria | DLC`), seções `## DLC`, padrões de categoria e DLC, prévia e confirmação;
  - **Planilha CSV, TSV ou Excel (.xlsx)** com reconhecimento e correção das colunas (inclusive Ícone e Desbloqueada);
  - **Cadastro sequencial** (*Salvar e próxima*, Enter), **Duplicar** e bloqueio de nomes repetidos;
  - **Seleção em massa:** desbloquear, bloquear, categoria, DLC e excluir;
  - **Ícones em lote:** associação pelo nome do arquivo ou pela ordem, troca manual, recorte (*Preencher*/*Ajustar*), WebP 256 px em `Assets/Achievements/<Jogo>/`;
  - **Backup** automático (antes de excluir, atualizar em lote ou restaurar) em `Backups/Conquistas/<Jogo>/`, **restauração** sem apagar nada e **exportação CSV**.
- Ficha: conquistas restantes no resumo, botões *Gerenciar conquistas* e *Adicionar em lote*; o jogo novo de Xbox abre direto no lote.

### Testes
- Os testes dos sistemas removidos saíram; 20 testes novos cobrem a limpeza, a leitura do lote e das planilhas, o cadastro, a duplicação, a seleção, os ícones, o backup, a exportação e a ficha (200 no total).

## 3.73.0: Favorito com script

### Adicionado
- **Favorito com script** em *Buscar conquistas*: *Copiar favorito* gera o código (`javascript:`); na página de conquistas do jogo, o favorito copia nome, descrição, G, DLC e ícones num formato próprio. *Colar do favorito* (ou colar no campo) mostra a prévia com os ícones.
- Validação do conteúdo colado (textos cortados, G de 0 a 1000, só links http/https, ícones só imagem ou endereço público https).
- Avisos do favorito no idioma do Vault.
- 5 testes funcionais novos (220 no total).

## 3.72.0: Página salva e ícones

### Adicionado
- **Importar página salva** em *Buscar conquistas*: `.mhtml` (arquivo único) ou página completa (`.html` + imagens). Lê nome, descrição, G, DLC e o ícone de cada conquista, com as imagens de dentro do arquivo.
- **Colar com ícones:** o HTML que o navegador põe na área de transferência é lido ao colar.
- **Ícones no vault:** gravados em WebP (até 256 px) em `Assets/Achievements/<Jogo>/`. Só imagens de verdade (PNG, JPEG, GIF, WebP, até 2 MB) e, quando vêm por endereço, só de servidores públicos.
- 7 testes funcionais novos (215 no total).

## 3.71.0: Conquistas do Xbox de várias fontes

### Adicionado
- **Cinco fontes** na janela *Buscar conquistas*: TrueAchievements, XboxAchievements, Exophase, MetaGamerScore e XB.Live (Xbox original/Insignia). Busca por fonte ou em todas as indicadas para a versão, sempre no navegador.
- **Versão do jogo** (Series X|S, One, 360, Xbox original, PC) e detecção da fonte e da versão da página colada.
- **Comparação entre fontes:** quantidade e G total por fonte, divergências apontadas, escolha de G e descrição por conquista e fonte preferida lembrada no aparelho.
- **DLCs como conjuntos** e registro das fontes comparadas na ficha (`achImport.sources`).
- **Registro modular** (`XBOX_SOURCE_DEFS`): uma fonte nova é uma entrada.
- 12 testes funcionais novos (208 no total).

### Alterado
- TA Score, MGS e proporções são descartados antes da leitura: só o Gamerscore oficial vale.
- Um botão só na ficha: *Buscar conquistas*.

## 3.70.0: Xbox sem API, cadastro manual e importação assistida de conquistas

### Removido
- **Integração por API do Xbox** (login da Microsoft por código de dispositivo e chave da OpenXBL): conexão, renovação de token, leitura de perfil, jogos e conquistas, cache e textos de conexão.
- **Autorização antiga apagada do aparelho:** na primeira abertura, a Game Library apaga do armazenamento local a autorização da Microsoft e a chave da OpenXBL que tenham sobrado, além do cache `.steamvault/xbox.json`. Fichas, conquistas e campos antigos das notas não são tocados.

### Adicionado
- **Cadastro manual completo:** *Adicionar jogo* ganhou desenvolvedora, publicadora, data de lançamento, nota (0 a 5) e observações, além de Xbox Series, Xbox One, Xbox 360 e Xbox na lista de plataformas. Escolher uma plataforma Xbox define a origem das conquistas como Xbox.
- **Importação assistida de conquistas do Xbox (TrueAchievements):** botão de busca, que só abre a página no navegador; lista colada pelo usuário; prévia editável com nome, descrição, G, quantidade e G total; marcação Nova, Muda ou Igual; e importação sem duplicatas. Atualizar conquistas existentes pede confirmação, e nada é apagado.
- **Gamerscore na ficha:** selo de G em cada conquista, G conquistado e total na estante (*80 / 200 G*) e o G no lugar de "Sem dados" em *Próximas conquistas* nos jogos de Xbox.
- **Testes:** 20 testes funcionais novos, com leitura de seis formatos de lista, limpeza da autorização antiga, cadastro, importação, reimportação e o assistente aparecendo só em jogos de Xbox.

### Alterado
- O perfil do Xbox virou um perfil manual, com o Gamerscore somado das fichas.
- README revisto, com capturas reais do harness de testes, seção de tecnologias e este changelog.

## 3.69.0: Segunda otimização
Ações do dia a dia mais rápidas (*Adicionar jogos* da coleção de 1.319 ms para 47 ms) e primeira abertura do app de cerca de 1,5 s para cerca de 1,26 s, medidas com 1000 jogos e CPU 4× mais lenta.

## 3.68.0: Otimização completa
Telas abrindo mais rápido sem mudar o que aparece: Tier List de 479 ms para 156 ms, Configurações de 438 ms para 231 ms e Biblioteca de 652 ms para 437 ms. As estrelas da nota passaram a ser um elemento só.

## 3.67.0: Duplicações e código morto
Foram removidas 19 declarações de CSS que nunca valiam e um método sem uso. Entraram ferramentas de auditoria (`css-dups.py`, `js-dups.py`, `xss.js`).

## 3.66.0: Varredura de erros
Oito bugs corrigidos, entre eles "hoje" calculado em UTC (no Brasil, depois das 21h, já dava o dia seguinte) e números com vírgula decimal digitados à mão.

## 3.65.0: Itens pendentes da 3.64
A Tier List ficou muito mais leve ao rolar (de cerca de 120 ms para cerca de 45 ms por quadro com 1000 jogos), e o contraste dos textos sobre imagens foi medido pixel a pixel, com todos acima do mínimo de leitura.

## 3.64.0: Lançamentos, planejador e acessibilidade
Data de lançamento, planejador de backlog, busca avançada, histórico completo na ficha e auditoria de acessibilidade.

## 3.63.0: Completar dados pela Steam
Gêneros, estúdio, ano e sinopse puxados da loja Steam (dados públicos), com as últimas pendências visuais resolvidas.

## 3.62.0: Formulários
*Adicionar jogo* e *Editar detalhes* ganharam um desenho único, divididos em seções e mais confortáveis no celular.

Versões anteriores: [notas-de-versao-pre-1.0.md](notas-de-versao-pre-1.0.md) e [historico-tecnico-pre-1.0.md](historico-tecnico-pre-1.0.md).
