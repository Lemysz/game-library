#!/usr/bin/env python3
"""Duplicações no CSS do Steam Vault.

Acha, no mesmo contexto (@media/@supports/@container) e com o MESMO seletor:
  - regras idênticas repetidas (seletor + declarações iguais);
  - declarações mortas: a mesma propriedade declarada de novo mais adiante
    (na mesma regra ou numa regra posterior com o mesmo seletor), com
    importância igual ou maior. A anterior nunca vale.
Com --fix, remove só as declarações mortas cujo valor é IGUAL ao que vale
(duplicação pura, sem risco de ser um fallback de navegador) e as regras
que ficarem vazias. As de valor diferente só são listadas.
Uso: python3 .github/tools/css-dups.py <css> [--fix saida.css]
"""
import re, sys

path = sys.argv[1]
src = open(path, encoding="utf-8").read()

def skip_comment(s, i):
    j = s.find("*/", i + 2)
    return len(s) if j < 0 else j + 2

rules = []  # (ctx, selector, decls[(prop, val, imp, start, end)], body_start, body_end, rule_start)

def parse_block(s, i, end, ctx):
    while i < end:
        if s.startswith("/*", i): i = skip_comment(s, i); continue
        if s[i].isspace() or s[i] == ";": i += 1; continue
        if s[i] == "}": return i + 1
        # prelúdio até { ou ;
        j, depth, q = i, 0, None
        while j < end:
            c = s[j]
            if q:
                if c == "\\": j += 2; continue
                if c == q: q = None
            elif c in "\"'": q = c
            elif s.startswith("/*", j): j = skip_comment(s, j); continue
            elif c == "(": depth += 1
            elif c == ")": depth -= 1
            elif depth == 0 and c in "{;": break
            j += 1
        pre = re.sub(r"/\*.*?\*/", "", s[i:j], flags=re.S).strip()
        if j >= end: return end
        if s[j] == ";": i = j + 1; continue
        # acha o } correspondente
        k, depth, q = j + 1, 1, None
        while k < end and depth:
            c = s[k]
            if q:
                if c == "\\": k += 2; continue
                if c == q: q = None
            elif c in "\"'": q = c
            elif s.startswith("/*", k): k = skip_comment(s, k); continue
            elif c == "{": depth += 1
            elif c == "}": depth -= 1
            k += 1
        body_s, body_e = j + 1, k - 1
        if pre.startswith("@"):
            name = pre.split()[0]
            if name in ("@media", "@supports", "@container", "@layer", "@document"):
                parse_block(s, body_s, body_e, ctx + (re.sub(r"\s+", " ", pre),))
            # @keyframes, @font-face etc.: fora da análise
        else:
            rules.append((ctx, re.sub(r"\s+", " ", pre), parse_decls(s, body_s, body_e), body_s, body_e, i))
        i = k
    return i

def parse_decls(s, a, b):
    out, i = [], a
    while i < b:
        if s.startswith("/*", i): i = skip_comment(s, i); continue
        if s[i].isspace() or s[i] == ";": i += 1; continue
        j, depth, q = i, 0, None
        while j < b:
            c = s[j]
            if q:
                if c == "\\": j += 2; continue
                if c == q: q = None
            elif c in "\"'": q = c
            elif s.startswith("/*", j): j = skip_comment(s, j); continue
            elif c == "(": depth += 1
            elif c == ")": depth -= 1
            elif c == ";" and depth == 0: break
            elif c == "{": break  # aninhamento: não analisa
            j += 1
        if j < b and s[j] == "{": return out
        txt = re.sub(r"/\*.*?\*/", "", s[i:j], flags=re.S).strip()
        if ":" in txt:
            p, v = txt.split(":", 1)
            v = v.strip(); imp = bool(re.search(r"!\s*important\s*$", v))
            v = re.sub(r"\s*!\s*important\s*$", "", v)
            out.append((p.strip().lower(), re.sub(r"\s+", " ", v), imp, i, j + (1 if j < b else 0)))
        i = j + 1
    return out

parse_block(src, 0, len(src), ())

# regras idênticas
seen, dup_rules = {}, []
for r in rules:
    key = (r[0], r[1], tuple((p, v, im) for p, v, im, _, _ in r[2]))
    if key in seen and r[2]: dup_rules.append((seen[key], r))
    seen[key] = r

# declarações mortas
groups = {}
for r in rules: groups.setdefault((r[0], r[1]), []).append(r)
dead_same, dead_diff = [], []
for (ctx, sel), rs in groups.items():
    decls = [(d, r) for r in rs for d in r[2]]
    for n, (d, r) in enumerate(decls):
        p, v, imp = d[0], d[1], d[2]
        if p.startswith("--") and False: pass
        for d2, r2 in decls[n + 1:]:
            if d2[0] == p and (d2[2] or not imp):
                (dead_same if d2[1] == v and d2[2] == imp else dead_diff).append((ctx, sel, d, d2))
                break

line = lambda pos: src.count("\n", 0, pos) + 1
print(f"{len(rules)} regras analisadas")
print(f"regras idênticas repetidas: {len(dup_rules)}")
for a, b in dup_rules[:30]: print(f"  linha {line(a[5])} = linha {line(b[5])}: {a[1][:90]}")
print(f"declarações mortas com o MESMO valor (duplicação pura): {len(dead_same)}")
for ctx, sel, d, d2 in dead_same[:40]: print(f"  linha {line(d[3])} → repetida na {line(d2[3])}: {sel[:70]} {{ {d[0]}: {d[1][:40]} }}")
print(f"declarações mortas com valor diferente (só lista): {len(dead_diff)}")
for ctx, sel, d, d2 in dead_diff[:60]: print(f"  linha {line(d[3])} ({d[0]}: {d[1][:30]}) → vale a da {line(d2[3])} ({d2[1][:30]}): {sel[:60]}")

if "--fix" in sys.argv:
    out = sys.argv[sys.argv.index("--fix") + 1]
    # --all: também as de valor diferente, menos o par "fallback" dentro da
    # MESMA regra (ex.: 90vh e depois 90dvh), que existe de propósito
    pool = dead_same + ([x for x in dead_diff if not (x[3][3] > x[2][3] and src.rfind("{", 0, x[3][3]) == src.rfind("{", 0, x[2][3]))] if "--all" in sys.argv else [])
    cuts = sorted({(d[3], d[4]) for _, _, d, _ in pool}, reverse=True)
    s = src
    for a, b in cuts: s = s[:a] + s[b:]
    # regras que ficaram vazias (só no texto reescrito: procura "seletor {  }")
    s2 = re.sub(r"(?m)^[^{}@\n][^{}]*\{\s*\}\n?", "", s)
    open(out, "w", encoding="utf-8").write(s2)
    print(f"--fix: {len(cuts)} declarações removidas, {len(s) - len(s2)} bytes de regras vazias, saída em {out}")
