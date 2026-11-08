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
