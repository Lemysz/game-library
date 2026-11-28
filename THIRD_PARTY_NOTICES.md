# Avisos de terceiros

A Game Library depende de software de terceiros. Esta página lista **o que é redistribuído** no
repositório (e no ZIP da versão) e **o que não é**, com a licença verificada.

> Licença do próprio projeto: **ainda não definida** — todos os direitos reservados ao autor até que
> uma licença seja escolhida. Nada nesta página concede licença sobre o código da Game Library.

## Redistribuído só no ZIP da versão

O código destes plugins **não** está no repositório. O workflow de versões baixa os arquivos do
release oficial de cada um, numa versão fixa, confere o SHA-256 listado em
[`.github/plugins/plugins.lock`](.github/plugins/plugins.lock) e os coloca no ZIP em
`.obsidian/plugins/<id>/`, com o texto da licença ao lado (`LICENSE`). Do `main.js` sai só o
*source map* embutido, como o próprio Obsidian faz ao instalar pela loja; o código não muda.

| Componente | Versão | Uso | Licença | Fonte |
|---|---|---|---|---|
| [Dataview](https://github.com/blacksmithgu/obsidian-dataview) | 0.5.68 | Executa os blocos `dataviewjs` de cada tela | MIT — © 2021 Michael Brenan ([texto](.github/plugins/dataview.LICENSE.txt)) | Release oficial no GitHub |
| [CustomJS](https://github.com/saml-dev/obsidian-custom-js) | 1.0.21 | Carrega os scripts de `Scripts/` | MIT — © 2021 Sam Lewis ([texto](.github/plugins/customjs.LICENSE.txt)) | Release oficial no GitHub |
| [Templater](https://github.com/SilentVoid13/Templater) | 2.27.0 | Modelos opcionais em `*/_Templates/` | AGPL-3.0 ([texto](.github/plugins/templater-obsidian.LICENSE.txt)) | Release oficial no GitHub · [código-fonte desta versão](https://github.com/SilentVoid13/Templater/tree/2.27.0) |

O Templater é distribuído sem modificação, como programa separado, ao lado do vault (agregação). A
licença dele (AGPL-3.0) vale para o código dele, não para a Game Library. O código-fonte
correspondente à versão está no link acima.

## Não redistribuído (instalado pelo próprio Obsidian)

O código destes plugins e do tema **não** está no repositório nem no ZIP. Cada pessoa instala pelo
navegador de plugins/temas do Obsidian, direto da fonte oficial. O vault guarda apenas a
**configuração** (`.obsidian/plugins/<id>/data.json` e as listas em `.obsidian/*.json`), que é
própria do projeto.

| Componente | Uso | Obrigatório | Licença | Fonte |
|---|---|---|---|---|
| [Minimal](https://github.com/kepano/obsidian-minimal) (tema) | Tema configurado em `appearance.json` | Opcional | MIT (cabeçalho do `theme.css`) | Temas da comunidade |

Como esses componentes não são redistribuídos, a Game Library não precisa reproduzir suas licenças.
Antes de incluir qualquer um deles no repositório ou no ZIP, **verifique a licença** e acrescente o
texto completo aqui.

## Redistribuído

### Ícones — `Assets/Icons/` e `SteamVaultUI.paths`

Parte dos desenhos vem de bibliotecas abertas, sem alteração de desenho (só a cor passou a ser
`currentColor`); os demais são desenhos próprios do projeto. Os textos completos das licenças estão em
[`Assets/Icons/LICENSES.txt`](Assets/Icons/LICENSES.txt).

| Biblioteca | Versão | Licença |
|---|---|---|
| Tabler Icons | 3.49.0 | MIT — © 2020-2026 Paweł Kuna |
| Lucide (lucide-static) | 1.61.0 | ISC — © Lucide Icons and Contributors; ícones derivados do Feather sob MIT — © 2013-present Cole Bemis |
| Phosphor Icons (@phosphor-icons/core) | 2.1.1 | MIT — © 2023 Phosphor Icons |
| Simple Icons | 16.35.0 | CC0-1.0 (os desenhos); **as marcas continuam pertencendo aos donos** |

## Carregado da internet (não redistribuído)

| Recurso | Uso | Licença |
|---|---|---|
| [Wikidata](https://www.wikidata.org) | Dados de *Completar dados pelo Wikidata* (estúdio, distribuidora, gêneros, datas), só quando a pessoa pede | CC0 1.0 (dados estruturados do Wikidata) |
| [Archivo](https://fonts.google.com/specimen/Archivo) e [IBM Plex Sans](https://fonts.google.com/specimen/IBM+Plex+Sans) | Tipografia do snippet, via `@import` do Google Fonts | SIL Open Font License 1.1 |

Sem internet, o snippet usa fontes do sistema (`Bahnschrift`, `Segoe UI`, `Roboto`…). O
carregamento do Google Fonts revela o endereço IP ao Google, como qualquer fonte web.

## Somente para testes (`.github/tests/`, não vai para o ZIP)

| Pacote | Versão | Licença |
|---|---|---|
| Playwright / playwright-core | 1.63.0 | Apache-2.0 |
| js-yaml | 4.3.2 | MIT |
| argparse (dependência do js-yaml) | 2.0.1 | Python-2.0 |
