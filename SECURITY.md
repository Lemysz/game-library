# Segurança

A Game Library é um vault pessoal do Obsidian, mantido num repositório **privado**. Esta página
explica o que o projeto protege, como relatar um problema e o que nunca deve entrar no repositório.

## Versões com suporte

| Versão | Suporte |
|---|---|
| 1.0.x (Prototype) | ✅ correções de segurança |
| Anteriores à 1.0 (numeração interna 3.x) | ❌ substituídas pela 1.0 |

## Como relatar uma vulnerabilidade

Use um **relatório privado** do GitHub (*Security › Report a vulnerability*) ou fale diretamente com o
dono do repositório. **Não** abra uma issue comum para vulnerabilidades.

Inclua: versão (aparece em *Configurações* do app), aparelho, passos para reproduzir e o impacto
esperado. **Nunca** cole chaves, tokens, Web API Keys, senhas, cookies ou capturas que os mostrem.

## Modelo de segurança

- **Sem senha, cookie ou token de sessão.** Nenhuma integração pede login de terceiros.
  Steam e GOG leem perfis **públicos**; o RetroAchievements usa a Web API oficial com uma Web API Key.
- **Chaves só no aparelho.** A Web API Key do RetroAchievements fica no armazenamento local do
  Obsidian (`app.saveLocalStorage`), nunca em notas, no cache `.steamvault/`, no git ou no console.
  *Configurações › Segurança e privacidade › Apagar tudo deste dispositivo* remove tudo.
- **Rede restrita.** Cada integração só fala com os domínios oficiais dela, uma requisição por vez,
  com tamanho de resposta limitado e campos validados.
- **Notas não são confiáveis por padrão.** Texto de notas, arquivos sincronizados e respostas da
  internet passa por escape antes de virar HTML; cores só entram como `#hex`; links externos só abrem
  em `http(s)` nos domínios esperados; imagens remotas não são baixadas de `localhost` ou da rede local.
- **Código.** Sem `eval`, `new Function` ou `document.write`; sem dependências de runtime além dos
  plugins do Obsidian.

## Verificações automáticas

A cada envio, `.github/tests/checks.js` falha se encontrar: chaves ou tokens nos arquivos versionados,
`eval`/`new Function`, `window.open` sem validação, chave enviada ao console ou gravada em arquivo,
código de plugins de terceiros, lixeira, backups ou estado local versionados. As ferramentas
`.github/tools/audit/xss.js` (nomes com HTML em todas as telas) e `fuzz.js` (frontmatter malformado)
podem ser rodadas antes de mudanças sensíveis.

## O que nunca vai para o repositório

`.env`, chaves, certificados, `.steamvault/`, `Backups/`, `.trash/`, `workspace*.json`,
`Assets/game-library-preferencias.json` e o código de plugins ou temas de terceiros
(ver `.gitignore`). Se algo assim for enviado por engano, **revogue a credencial primeiro**
(por exemplo, gere uma nova Web API Key no RetroAchievements) e só depois limpe o histórico.
