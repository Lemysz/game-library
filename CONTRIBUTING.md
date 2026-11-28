# Contribuindo

Obrigado pelo interesse! A Game Library é um projeto pessoal num repositório privado; contribuições
acontecem por convite. Antes de começar, leia o [`CLAUDE.md`](CLAUDE.md) (arquitetura e convenções).

## Fluxo

1. Crie um branch a partir de `main` (`feat/…`, `fix/…`, `docs/…`).
2. Faça mudanças **pequenas e pontuais**. Preserve o que funciona e os dados dos jogos.
3. Rode os testes (abaixo) e confira as capturas quando mexer em interface.
4. Atualize o `CHANGELOG.md` na seção **[Não lançado]**.
5. Abra um Pull Request preenchendo o modelo.

## Testes

```bash
cd .github/tests
npm ci
npx playwright install chromium
node checks.js && node icons.js && node smoke.js && node responsive.js && node functional.js
```

O GitHub Actions roda os mesmos testes em cada envio. Mudanças de interface precisam passar em
320, 360, 390 e 430 px e no desktop, nos temas claro e escuro (`responsive.js`).

### No aparelho (antes de lançar uma versão)

O harness simula o Obsidian; ele não pega tudo o que acontece no Android. Com o ZIP da versão num
vault **novo**, no celular, confira em poucos minutos:

1. Abrir a pasta como vault e **confiar**: Dataview, CustomJS e Templater já aparecem ativados.
2. A tela de carregamento aparece só na abertura e some sozinha (no máximo 25 s).
3. Trocar de aba pela barra inferior (Início, Biblioteca, Conquistas, Perfil): sem tela de
   carregamento no meio e com as animações de entrada.
4. Biblioteca: buscar por nome e por plataforma, aplicar e remover um filtro (status e subgênero).
5. Abrir uma ficha, favoritar e desfavoritar, trocar as abas da ficha.
6. Na ficha, *⋯ → Completar dados pelo Wikidata*: a revisão aparece e *Cancelar* não grava nada.
7. Girar o celular e voltar: nada cortado nem fora da tela.
8. Modo inglês (Configurações): as telas principais traduzidas.
9. Fechar o Obsidian por completo e abrir de novo: a Início abre direto.
10. Configurações mostra a versão certa.

Anote o aparelho e a versão do Android no PR ou na issue.

## Estilo

- Código, comentários e textos em português do Brasil; frase nova visível → tradução em
  `Assets/i18n/en.json`.
- CSS em `.obsidian/snippets/steamvault.css`, copiado para `_install/steamvault.css`.
- Sem dependências novas de runtime, sem integrações que peçam senha, cookie ou token de sessão.

## Mensagens de commit

Verbo no imperativo e escopo curto, por exemplo: `fix(biblioteca): corrige corte do filtro em 320 px`.

## Segurança

Nunca inclua chaves, tokens ou dados pessoais em commits, issues ou PRs. Vulnerabilidades:
veja [`SECURITY.md`](SECURITY.md).
