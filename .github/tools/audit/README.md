# Ferramentas de auditoria

Scripts usados nas auditorias de desempenho, layout e acessibilidade. Eles
abrem o vault no mesmo harness dos testes (`.github/tests/harness.html`) com
um Chromium do Playwright. Não fazem parte do CI: servem para medir antes e
depois de uma mudança.

Requisitos: `npm install` em `.github/tests` (o Playwright fica em
`.github/tests/node_modules`). Para usar um Chromium já instalado, defina
`CHROMIUM_PATH=/caminho/do/chromium`.

| Script | O que mede | Uso |
|---|---|---|
| `contrast.js` | Contraste WCAG 2.1 de cada texto visível contra o fundo real, nos temas escuro e claro (4,5:1 comum, 3:1 grande). Ignora textos sobre imagens | `node contrast.js [largura]` |
| `contrast-images.js` | Contraste dos textos sobre imagens (capas, fundos, heróis): fotografa a área por trás de cada texto e mede pixel a pixel. `XCSS=…` injeta CSS para um teste de controle | `node contrast-images.js [largura]` |
| `focus.js` | Navegação por Tab: cada parada de foco precisa de um indicador visível (no elemento ou no contêiner, via `:focus-within`) | `node focus.js [largura] [tabs por página]` |
| `clickall.js` | Clica em cada botão, aba, chip e ação de cada tela e registra erros de script. `DEEP=1` clica também dentro das janelas abertas | `node clickall.js [largura] [pt\|en] [filtro]` |
| `xss.js` | Nomes com HTML (`<img onerror>`) em jogo, coleção e conquista, por todas as telas, janelas e a busca. `CONTROL=1` injeta de propósito para provar que acusa | `node xss.js [largura]` |
| `fuzz.js` | Jogos com frontmatter malformado em todas as telas: erros de script e textos quebrados (NaN, undefined…) | `node fuzz.js [largura]` |
| `i18n-scan.js` | Modo inglês: textos que ficaram em português | `node i18n-scan.js [largura]` |
| `layout.js` | Estouros horizontais, áreas de toque pequenas, sobreposições e imagens quebradas em todas as telas, no celular e no computador | `node layout.js` |
| `strips.js` | Faixas roláveis: sobras no fim, cortes e alinhamento | `node strips.js` |
| `forms.js` | Abre cada janela e formulário, mede tamanho e rolagem e fotografa | `node forms.js <prefixo> [largura] [nomes]` |
| `bench.js` | Abertura de telas com repetição (mediana de R aberturas), para comparar versões. `XCSS` testa CSS, `LANG_EN=1` mede em inglês | `R=7 node bench.js [telas…]` |
| `interact.js` | Latência de ações (busca e filtros da Biblioteca, busca global, abas, janelas) com 1000 jogos e CPU 4× | `R=5 node interact.js [filtro]` |
| `survey.js` | Tempo de abertura e de rolagem de todas as telas com 1000 jogos e CPU 4× mais lenta | `N=1000 node survey.js [tela]` |
| `scrollperf.js` | Tempo por quadro na rolagem de uma tela com 1000 jogos. `PG=<tela>`, `TRACE=1` (tempo por tipo de evento do Blink), `DISTINCT=1` (capas com endereços distintos), `REVISIT=1` (mede na volta à tela) | `node scrollperf.js [shelf\|grid\|…] [css extra]` |
| `selstats.js` | Seletores de CSS mais caros ao abrir uma tela (trace do Blink) | `node selstats.js [tela] [saida.json]` |
| `fingerprint.js` | Impressão digital dos estilos calculados de todas as telas, para provar que uma reorganização do CSS não mudou nada | `node fingerprint.js a.json` e depois `node fingerprint.js --diff a.json b.json` |

Os números dependem da máquina. Compare sempre duas medições feitas no mesmo
lugar, antes e depois da mudança.

Na pasta acima (`.github/tools/`): `css-index.py` (seletores indexáveis), `css-dups.py` (duplicações e declarações mortas no CSS; `--fix saida.css [--all]`) e `js-dups.py` (métodos duplicados e nunca usados).
