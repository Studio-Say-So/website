#!/usr/bin/env python3
"""Structural HTML formatter for the Eleventy templates.

Only inserts newlines and indentation *between* elements. Never reflows a text
node, and treats pre/textarea/svg/script/style — and anything classed
whitespace-pre* — as opaque, because the site uses literal newlines inside
headings as design.
"""
import re
import sys
import pathlib

VOID = {"img", "br", "hr", "input", "meta", "link", "source", "area", "base",
        "col", "embed", "param", "track", "wbr"}

# never look inside these
OPAQUE_TAGS = {"pre", "textarea", "svg", "script", "style"}

# elements that must stay on one line with their content
INLINE = {"a", "span", "b", "i", "em", "strong", "small", "sub", "sup", "code",
          "label", "u", "s", "abbr", "cite", "q", "time", "mark", "br", "img"}

TOKEN = re.compile(r"<!--.*?-->|<!\[CDATA\[.*?\]\]>|<!doctype[^>]*>|</?[a-zA-Z][\w:-]*(?:\"[^\"]*\"|'[^']*'|[^>\"'])*/?>", re.S | re.I)


def is_opaque(tag, attrs):
    if tag in OPAQUE_TAGS:
        return True
    m = re.search(r'class\s*=\s*"([^"]*)"', attrs) or re.search(r"class\s*=\s*'([^']*)'", attrs)
    return bool(m and re.search(r"whitespace-pre", m.group(1)))


def skip_element(src, start):
    """Return index just past the element beginning at `start`."""
    m = re.match(r"<([a-zA-Z][\w:-]*)", src[start:])
    tag = m.group(1).lower()
    gt = src.index(">", start) + 1
    if tag in VOID or src[gt - 2] == "/":
        return gt
    depth = 1
    pat = re.compile(rf"<(/?){re.escape(tag)}\b", re.I)
    i = gt
    while depth:
        mm = pat.search(src, i)
        if not mm:
            return len(src)
        i = src.index(">", mm.end()) + 1
        depth += -1 if mm.group(1) else 1
    return i


def format_html(src, indent=0):
    out = []
    i = 0
    n = len(src)

    def emit(line, lvl):
        out.append("  " * lvl + line)

    stack = []
    pending_text = []

    def collapse_outside_tags(text):
        """Collapse runs of whitespace in text nodes only, never inside a tag,
        so attribute values (a doubled space in a class list, say) survive."""
        out_parts = []
        pos = 0
        for mm in TOKEN.finditer(text):
            out_parts.append(re.sub(r"\s+", " ", text[pos:mm.start()]))
            out_parts.append(mm.group(0))
            pos = mm.end()
        out_parts.append(re.sub(r"\s+", " ", text[pos:]))
        return "".join(out_parts)

    def flush_text(lvl):
        if not pending_text:
            return
        text = "".join(pending_text)
        pending_text.clear()
        if text.strip():
            emit(collapse_outside_tags(text).strip(), lvl)

    while i < n:
        m = TOKEN.search(src, i)
        if not m:
            pending_text.append(src[i:])
            break
        if m.start() > i:
            pending_text.append(src[i:m.start()])
        tok = m.group(0)
        lvl = indent + len(stack)

        if tok.lower().startswith("<!--") or tok.lower().startswith("<!doctype") or tok.startswith("<!["):
            flush_text(lvl)
            emit(tok.strip(), lvl)
            i = m.end()
            continue

        tm = re.match(r"</?([a-zA-Z][\w:-]*)", tok)
        tag = tm.group(1).lower()
        closing = tok.startswith("</")
        selfclose = tok.rstrip().endswith("/>") or tag in VOID

        if closing:
            flush_text(lvl)
            if stack and stack[-1] == tag:
                stack.pop()
            emit(tok, indent + len(stack))
            i = m.end()
            continue

        attrs = tok[len(tag) + 1:-1]
        if is_opaque(tag, attrs) and not selfclose:
            flush_text(lvl)
            end = skip_element(src, m.start())
            block = src[m.start():end]
            # one list entry, so the blank-line filter below cannot eat a
            # deliberate paragraph break inside whitespace-pre content
            out.append("  " * lvl + block)
            i = end
            continue

        if tag in INLINE and not selfclose:
            # keep inline elements and their content on one line
            end = skip_element(src, m.start())
            pending_text.append(src[m.start():end])
            i = end
            continue

        flush_text(lvl)
        emit(tok, lvl)
        if not selfclose:
            stack.append(tag)
        i = m.end()

    flush_text(indent + len(stack))
    return "\n".join(l for l in out if l.strip())


def process(path):
    p = pathlib.Path(path)
    s = p.read_text(encoding="utf-8")
    if s.startswith("---"):
        cut = s.index("\n---\n", 3) + len("\n---\n")
        fm, body = s[:cut], s[cut:]
    else:
        fm, body = "", s
    formatted = format_html(body)
    p.write_text(fm + formatted + "\n", encoding="utf-8")
    return len(body), len(formatted)


if __name__ == "__main__":
    for arg in sys.argv[1:]:
        a, b = process(arg)
        print(f"  {arg}: {a} -> {b} bytes")
