#!/usr/bin/env bash
# Acrescenta ao ZIP da versão os plugins obrigatórios (Dataview e CustomJS), para o
# vault abrir pronto, sem instalar nada pela loja do Obsidian.
#   bash .github/tools/bundle-plugins.sh Game_Library_X.Y.Z.zip
# - Lê versões, arquivos e SHA-256 de .github/plugins/plugins.lock.
# - Baixa cada arquivo do release OFICIAL no GitHub e confere o hash: se um não
#   bater, para com erro e o ZIP não é alterado.
# - Tira o source map embutido do main.js, como o próprio Obsidian faz ao instalar
#   pela loja ("/* nosourcemap */"): o arquivo fica quase metade menor e abre mais
#   rápido no celular. O código não muda.
# - Junta a licença (MIT) de cada plugin.
# Nada disso vai para o repositório: só para o ZIP.
set -euo pipefail

ZIP="$(realpath "$1")"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOCK="$ROOT/.github/plugins/plugins.lock"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

while read -r id ver repo file sha; do
	[[ -z "${id:-}" || "$id" == \#* ]] && continue
	[[ "$id" =~ ^[a-z0-9-]+$ && "$ver" =~ ^[0-9][0-9A-Za-z.+-]*$ && "$repo" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]] || { echo "::error::linha inválida em plugins.lock: $id $ver $repo"; exit 1; }
	[[ "$file" =~ ^(manifest\.json|main\.js|styles\.css)$ && "$sha" =~ ^[0-9a-f]{64}$ ]] || { echo "::error::arquivo ou hash inválido em plugins.lock: $id $file"; exit 1; }
	dir="$WORK/Game_Library/.obsidian/plugins/$id"
	mkdir -p "$dir"
	curl -sSfL --retry 3 --max-time 120 -o "$dir/$file" "https://github.com/$repo/releases/download/$ver/$file"
	got="$(sha256sum "$dir/$file" | cut -c1-64)"
	if [[ "$got" != "$sha" ]]; then
		echo "::error::$id $ver/$file: SHA-256 $got, esperado $sha. O arquivo do release mudou; confira antes de atualizar plugins.lock."
		exit 1
	fi
	echo "ok  $id $ver $file"
	if [[ "$file" == "main.js" ]]; then
		python3 -I - "$dir/main.js" <<'PY'
import sys
p = sys.argv[1]
b = open(p, "rb").read()
i = b.rfind(b"//# sourceMappingURL=data:")
if i >= 0:
    open(p, "wb").write(b[:i] + b"\n\n/* nosourcemap */")
PY
	fi
	lic="$ROOT/.github/plugins/$id.LICENSE.txt"
	[[ -f "$lic" ]] || { echo "::error::falta a licença .github/plugins/$id.LICENSE.txt"; exit 1; }
	cp "$lic" "$dir/LICENSE"
done < "$LOCK"

# cada plugin precisa dos 3 arquivos e da licença
for dir in "$WORK"/Game_Library/.obsidian/plugins/*/; do
	for f in manifest.json main.js styles.css LICENSE; do
		[[ -s "$dir$f" ]] || { echo "::error::$(basename "$dir") sem $f"; exit 1; }
	done
done

(cd "$WORK" && zip -q -r -X "$ZIP" Game_Library/.obsidian/plugins)
echo "plugins incluídos em $(basename "$ZIP")"
