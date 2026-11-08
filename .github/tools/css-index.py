#!/usr/bin/env python3
"""Reescreve seletores cujo último composto é um :is()/:where() com vários
argumentos (o Blink não consegue indexá-los e testa a regra em TODOS os
elementos) como listas de seletores com :is()/:where() de UM argumento, que
são indexados pela classe/tag/atributo do argumento.

Seguro por construção:
  - :where(A, B)  ->  :where(A), :where(B)    (especificidade 0 nos dois casos)
  - :is(A, B)     ->  :is(A), :is(B)          com a mesma especificidade:
    o argumento menos específico ganha :not(.sv-nunca) (classe que nunca
    existe, então sempre casa) até igualar o maior. O que não dá para igualar
    (ex.: uma tag a mais) fica num :is() residual pequeno, com um
    argumento-guia ".sv-nunca.sv-nunca…" que tem a especificidade original.
  - o invólucro :is()/:where() é mantido: ele é tolerante, então um argumento
    inválido continua sem invalidar a regra inteira.
Uso (rodar de novo depois de editar o CSS; é idempotente):
  python3 .github/tools/css-index.py .obsidian/snippets/steamvault.css /tmp/x.css
  cp /tmp/x.css .obsidian/snippets/steamvault.css; cp /tmp/x.css _install/steamvault.css
"""
import re, sys

src = open(sys.argv[1], encoding="utf-8").read()

# ---------------------------------------------------------------- utilitários
def split_top(s, sep=","):
    """divide por `sep` fora de parênteses, colchetes e strings"""
    out, depth, cur, q = [], 0, [], None
    i = 0
    while i < len(s):
        c = s[i]
        if q:
            cur.append(c)
            if c == "\\": cur.append(s[i + 1]); i += 2; continue
            if c == q: q = None
        elif c in "\"'": q = c; cur.append(c)
        elif c in "([": depth += 1; cur.append(c)
        elif c in ")]": depth -= 1; cur.append(c)
        elif c == sep and depth == 0: out.append("".join(cur)); cur = []
        else: cur.append(c)
        i += 1
    out.append("".join(cur))
    return out

def last_compound_start(sel):
    """índice onde começa o último composto (depois do último combinador)"""
    depth, q, last = 0, None, 0
    i = 0
    while i < len(sel):
        c = sel[i]
        if q:
            if c == "\\": i += 2; continue
            if c == q: q = None
        elif c in "\"'": q = c
        elif c in "([": depth += 1
        elif c in ")]": depth -= 1
        elif depth == 0 and (c.isspace() or c in ">+~"): last = i + 1
        i += 1
    return last

def pseudo_args(comp, j):
    """em comp[j] começa ':is(' ou ':where('; devolve (nome, ini_args, fim_paren)"""
    m = re.match(r":(is|where)\(", comp[j:])
    k = j + len(m.group(0)); depth, q = 1, None
    i = k
    while i < len(comp):
        c = comp[i]
        if q:
            if c == "\\": i += 2; continue
            if c == q: q = None
        elif c in "\"'": q = c
        elif c in "([": depth += 1
        elif c in ")]":
            depth -= 1
            if depth == 0: return m.group(1), k, i
        i += 1
    return None

def specificity(sel):
    """(a, b, c) de um seletor complexo"""
    a = b = c = 0
    i = 0
    s = sel
    while i < len(s):
        ch = s[i]
        if ch == "#": a += 1; i += 1; m = re.match(r"[\w-]+", s[i:]); i += m.end() if m else 0
        elif ch == ".": b += 1; i += 1; m = re.match(r"[\w-]+", s[i:]); i += m.end() if m else 0
        elif ch == "[":
            b += 1; d = 1; i += 1
            while i < len(s) and d:
                if s[i] == "[": d += 1
                elif s[i] == "]": d -= 1
                i += 1
        elif ch == ":":
            if s[i:i + 2] == "::":
                c += 1; i += 2; m = re.match(r"[\w-]+", s[i:]); i += m.end() if m else 0
                if i < len(s) and s[i] == "(": i = skip_paren(s, i)
                continue
            m = re.match(r":([\w-]+)", s[i:]); name = m.group(1).lower(); i += m.end()
            if name in ("before", "after", "first-line", "first-letter"): c += 1; continue
            if i < len(s) and s[i] == "(":
                end = skip_paren(s, i); inner = s[i + 1:end - 1]; i = end
                if name == "where": continue
                if name in ("is", "not", "has", "matches", "-webkit-any"):
                    best = max((specificity(x.strip()) for x in split_top(inner)), default=(0, 0, 0))
                    a += best[0]; b += best[1]; c += best[2]; continue
                if name in ("nth-child", "nth-last-child") and " of " in inner:
                    best = max((specificity(x.strip()) for x in split_top(inner.split(" of ", 1)[1])), default=(0, 0, 0))
                    a += best[0]; b += best[1] + 1; c += best[2]; continue
                b += 1; continue
            b += 1
        elif re.match(r"[a-zA-Z]", ch):
            m = re.match(r"[\w-]+", s[i:]); c += 1; i += m.end()
        elif ch == "*": i += 1
        else: i += 1
    return (a, b, c)

def skip_paren(s, i):
    d = 0
    while i < len(s):
        if s[i] == "(": d += 1
        elif s[i] == ")":
            d -= 1
            if d == 0: return i + 1
        i += 1
    return i

def bucketable(comp):
    """o composto já tem classe/tag/id/atributo fora de pseudos?"""
    i = 0
    while i < len(comp):
        ch = comp[i]
        if ch in ".#[": return True
        if ch == ":":
            m = re.match(r"::?[\w-]+", comp[i:]); i += m.end()
            if i < len(comp) and comp[i] == "(": i = skip_paren(comp, i)
            continue
        if re.match(r"[a-zA-Z]", ch): return True
        i += 1
    return False

stats = {"rules": 0, "sel": 0, "expanded": 0, "skipped_spec": 0, "out": 0}
MAX = 48

def expand(sel):
    """devolve a lista de seletores equivalentes (ou [sel])"""
    st = last_compound_start(sel)
    head, comp = sel[:st], sel[st:]
    if bucketable(comp): return [sel]
    m = re.search(r":(is|where)\(", comp)
    if not m: return [sel]
    # só um :is/:where no nível de cima do composto, e precisa estar fora de outros parênteses
    if comp[:m.start()].count("(") != comp[:m.start()].count(")"): return [sel]
    r = pseudo_args(comp, m.start())
    if not r: return [sel]
    name, k, e = r
    args = [x.strip() for x in split_top(comp[k:e]) if x.strip()]
    if len(args) < 2 or len(args) > MAX: return [sel]
    # :is() residual de uma passada anterior (tem o argumento-guia): fica
    if any(re.match(r"^(sv-nunca|[.#]sv-nunca)", x) for x in args): return [sel]
    residual = None
    if name == "is":
        specs = [specificity(x) for x in args]
        top = max(specs)
        if any(sp != top for sp in specs):
            # iguala a especificidade com :not() de classe/id/tag que não existe
            # (sempre casa); só quando falta algo em cada componente
            ok = [all(top[t] >= sp[t] for t in range(3)) for sp in specs]
            rest = [x for x, o in zip(args, ok) if not o]
            args = [x + ":not(#sv-nunca)" * (top[0] - sp[0]) + ":not(.sv-nunca)" * (top[1] - sp[1]) + ":not(sv-nunca)" * (top[2] - sp[2]) for x, sp, o in zip(args, specs, ok) if o]
            stats["padded"] = stats.get("padded", 0) + 1
            if rest:
                # os que não dá para igualar ficam juntos num :is() pequeno, com
                # um argumento-guia que nunca casa e tem a especificidade do
                # original (o :is vale pelo maior argumento)
                guide = ("sv-nunca" if top[2] else "") + "#sv-nunca" * top[0] + ".sv-nunca" * top[1]
                guide += ":not(sv-nunca)" * max(0, top[2] - 1)
                if not args: stats["skipped_spec"] += 1; return [sel]
                assert specificity(guide) == top, (guide, top)
                stats["residual"] = stats.get("residual", 0) + 1
                residual = ", ".join(rest + [guide])
    pre, post = comp[:m.start()], comp[e + 1:]
    res = []
    for x in args:
        res.extend(expand(head + pre + f":{name}({x})" + post))
    if residual: res.append(head + pre + f":{name}({residual})" + post)
    return res

# ---------------------------------------------------------------- percorre o CSS
out = []
i = 0
n = len(src)
def emit_rule(prelude, body):
    sels = split_top(prelude)
    new = []
    changed = False
    for s in sels:
        lead = re.match(r"\s*", s).group(0); core = s.strip()
        stats["sel"] += 1
        ex = expand(core)
        if len(ex) > 1: changed = True; stats["expanded"] += 1
        new.extend((lead, x) for x in ex)
    stats["rules"] += 1
    if not changed: return prelude + body
    stats["out"] += 1
    # mantém a primeira quebra/indentação; os novos ficam um por linha
    first_lead = new[0][0]
    indent = re.search(r"[ \t]*$", first_lead).group(0) if "\n" in first_lead else ""
    txt = first_lead + new[0][1]
    for lead, x in new[1:]:
        txt += ",\n" + indent + x
    trail = re.search(r"\s*$", prelude).group(0)
    return txt + trail + body

def walk(s):
    res = []
    i = 0
    while i < len(s):
        # comentários
        if s.startswith("/*", i):
            j = s.find("*/", i + 2); j = len(s) if j < 0 else j + 2
            res.append(s[i:j]); i = j; continue
        # procura o próximo { ou ; no nível de cima
        j = i; q = None; depth = 0
        while j < len(s):
            c = s[j]
            if q:
                if c == "\\": j += 2; continue
                if c == q: q = None
            elif c in "\"'": q = c
            elif s.startswith("/*", j): break
            elif c == "(": depth += 1
            elif c == ")": depth -= 1
            elif depth == 0 and c in "{;}": break
            j += 1
        if j >= len(s) or s.startswith("/*", j):
            res.append(s[i:j]); i = j; continue
        if s[j] == ";" or s[j] == "}":
            res.append(s[i:j + 1]); i = j + 1; continue
        prelude = s[i:j]
        # bloco: acha o } correspondente
        k = j + 1; d = 1; q = None
        while k < len(s) and d:
            c = s[k]
            if q:
                if c == "\\": k += 2; continue
                if c == q: q = None
            elif s.startswith("/*", k):
                e = s.find("*/", k + 2); k = len(s) if e < 0 else e + 2; continue
            elif c in "\"'": q = c
            elif c == "{": d += 1
            elif c == "}": d -= 1
            k += 1
        body = s[j:k]
        p = prelude.strip()
        if p.startswith("@"):
            if re.match(r"@(media|supports|container|layer)\b", p):
                res.append(prelude + "{" + walk(body[1:-1]) + "}")
            else:
                res.append(prelude + body)
        else:
            # o comentário antes do seletor pertence ao prelúdio: separa
            res.append(emit_rule(prelude, body))
        i = k
    return "".join(res)

result = walk(src)
open(sys.argv[2], "w", encoding="utf-8").write(result)
print(stats, "bytes", len(src), "->", len(result), file=sys.stderr)
