#!/usr/bin/env python3
"""Duplicação e código morto nos módulos Scripts/*.js.
  - métodos com o corpo idêntico (depois de normalizar espaços) em lugares diferentes;
  - métodos que nunca são citados em nenhum arquivo (nem como .nome, nem como
    "nome" em texto, que cobre despacho dinâmico por mapas de strings).
Só lista; não altera nada.
Uso: python3 .github/tools/js-dups.py
"""
import re, glob, collections

files = sorted(glob.glob("Scripts/*.js"))
srcs = {f: open(f, encoding="utf-8").read() for f in files}
extra = "".join(open(p, encoding="utf-8").read() for p in glob.glob("**/*.md", recursive=True) if not p.startswith((".git", "node_modules")))
extra += "".join(open(p, encoding="utf-8").read() for p in glob.glob(".github/tests/*.js") + glob.glob(".github/tests/*.html") + ["Assets/steamvault-boot.js"])

methods = []  # (file, name, line, body)
head = re.compile(r"^\t(?:async\s+)?(?:get\s+|set\s+)?([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{", re.M)
for f, s in srcs.items():
    for m in head.finditer(s):
        name = m.group(1)
        if name in ("if", "for", "while", "switch", "catch", "function", "constructor"): continue
        i, depth, q = m.end(), 1, None
        while i < len(s) and depth:
            c = s[i]
            if q:
                if c == "\\": i += 2; continue
                if c == q: q = None
                elif q == "`" and s.startswith("${", i): pass
            elif c in "\"'`": q = c
            elif s.startswith("//", i): i = s.find("\n", i); continue
            elif c == "{": depth += 1
            elif c == "}": depth -= 1
            i += 1
        body = s[m.end():i - 1]
        methods.append((f, name, s.count("\n", 0, m.start()) + 1, body))

norm = lambda b: re.sub(r"//[^\n]*", "", re.sub(r"\s+", " ", b)).strip()
by_body = collections.defaultdict(list)
for f, n, l, b in methods:
    nb = norm(b)
    if len(nb) > 120: by_body[nb].append((f, n, l))
print("== métodos com corpo idêntico (mais de 120 caracteres)")
k = 0
for nb, locs in by_body.items():
    if len(locs) > 1:
        k += 1; print("  " + " = ".join(f"{f.split('/')[-1]}:{l} {n}()" for f, n, l in locs))
print(f"  total: {k}")

allsrc = "".join(srcs.values()) + extra
print("== métodos nunca citados")
dead = 0
for f, n, l, b in methods:
    uses = len(re.findall(r"(?<![\w$])" + re.escape(n) + r"(?![\w$])", allsrc))
    if uses <= 1:
        dead += 1; print(f"  {f.split('/')[-1]}:{l} {n}()")
print(f"  total: {dead}")
