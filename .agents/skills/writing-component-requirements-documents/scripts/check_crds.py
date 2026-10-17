#!/usr/bin/env python3
"""Check component requirements documents (CRDs).

Usage:
    python check_crds.py docs/specs/components [--l2 docs/specs/L2.md] [--design-system docs/design-system]

A CRD is <name>.md plus <name>.html in the components folder. Errors exit 1;
warnings are printed but do not fail. Paths default to the layout this skill
expects: L2.md one level up from the components folder, the design system at
docs/design-system next to docs/specs.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

SECTIONS = [
    "Purpose and scope",
    "Usage",
    "Anatomy",
    "API",
    "Variants and sizes",
    "States",
    "Markup",
    "Design",
    "Colour",
    "Responsive behaviour",
    "Accessibility",
    "Content and internationalisation",
    "Performance",
    "Acceptance criteria",
    "Implementation notes",
    "Decisions",
]

AC_LINE = re.compile(r"^\s*-\s+\*\*AC-(\d+)\*\*\s+(.*)$")
L2_ID = re.compile(r"\bL2-\d{3}\b")
TOKEN = re.compile(r"(?<![\w-])--([a-z][a-z0-9]*(?:-[a-z0-9]+)*)(?![\w/*{…-])")
HEX = re.compile(r"(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b")
UNRESOLVED = re.compile(r"\b(TBD|TODO|FIXME)\b|open question", re.IGNORECASE)
PLACEHOLDER = re.compile(r"\{(Component name|component|built \||Part|Rule|Decision|Question|Caption|One sentence)|L2-xxx|L2-yyy")


def defined_tokens(design_system: Path) -> set[str]:
    names: set[str] = set()
    for rel in ("tokens/tokens.css", "assets/components.css"):
        path = design_system / rel
        if path.exists():
            text = path.read_text(encoding="utf-8")
            names.update(re.findall(r"--([a-z][a-z0-9-]*)\s*:", text))
            # Per-instance knobs the stylesheet reads with a fallback, e.g. width: var(--progress, 0%).
            names.update(re.findall(r"var\(\s*--([a-z][a-z0-9-]*)\s*,", text))
    return names


def strip_code_and_links(text: str) -> str:
    text = re.sub(r"```.*?```", "", text, flags=re.DOTALL)
    return re.sub(r"\]\([^)]*\)", "]()", text)


def sections(text: str) -> list[str]:
    return [m.group(1).strip() for m in re.finditer(r"^## (.+)$", text, re.MULTILINE)]


def section_body(text: str, name: str) -> str:
    m = re.search(rf"^## {re.escape(name)}\s*$(.*?)(?=^## |\Z)", text, re.MULTILINE | re.DOTALL)
    return m.group(1) if m else ""


def check_md(path: Path, l2_ids: set[str], tokens: set[str], prefixes: set[str], errors: list, warnings: list) -> set[str]:
    text = path.read_text(encoding="utf-8")
    name = path.name

    if not re.match(r"^# \S", text):
        errors.append(f"{name}: must start with '# <Component name>'")

    found = sections(text)
    missing = [s for s in SECTIONS if s not in found]
    if missing:
        errors.append(f"{name}: missing sections: {', '.join(missing)}")
    else:
        order = [s for s in found if s in SECTIONS]
        if order != SECTIONS:
            errors.append(f"{name}: sections out of order")

    acs: dict[int, str] = {}
    for line in text.splitlines():
        m = AC_LINE.match(line)
        if not m:
            continue
        number, body = int(m.group(1)), m.group(2)
        if number in acs:
            errors.append(f"{name}: AC-{number} is used twice")
        acs[number] = body
        if not re.search(r"\bGiven\b", body) or not re.search(r"\bwhen\b", body, re.I) or not re.search(r"\bthen\b", body, re.I):
            errors.append(f"{name}: AC-{number} is not Given/When/Then")
        trace = re.search(r"\((L2-\d{3})\)\s*$", body)
        if not trace:
            errors.append(f"{name}: AC-{number} does not end with one L2 ID in parentheses")
    if not acs:
        errors.append(f"{name}: no acceptance criteria (lines starting '- **AC-1** Given …')")
    elif sorted(acs) != list(range(1, len(acs) + 1)):
        errors.append(f"{name}: acceptance criteria are not numbered AC-1..AC-{len(acs)} without gaps")

    cited = set()
    for body in acs.values():
        cited.update(L2_ID.findall(body))
    for ref in sorted(set(L2_ID.findall(text))):
        if ref not in l2_ids:
            errors.append(f"{name}: {ref} does not exist in L2.md")

    traces = re.search(r"^\|\s*Traces to\s*\|(.*)\|\s*$", text, re.MULTILINE)
    if not traces:
        errors.append(f"{name}: metadata table has no 'Traces to' row")
    else:
        listed = set(L2_ID.findall(traces.group(1)))
        if listed != cited:
            extra, absent = sorted(listed - cited), sorted(cited - listed)
            detail = "; ".join(filter(None, [
                f"not cited by any AC: {', '.join(extra)}" if extra else "",
                f"cited but not listed: {', '.join(absent)}" if absent else "",
            ]))
            errors.append(f"{name}: 'Traces to' must equal the L2 IDs cited in the criteria ({detail})")

    prose = strip_code_and_links(text)
    for hit in sorted(set(HEX.findall(prose))):
        errors.append(f"{name}: hex colour {hit}; name the token instead")
    for m in UNRESOLVED.finditer(prose):
        errors.append(f"{name}: unresolved marker '{m.group(0)}'; decide it and record it under Decisions")
    for m in PLACEHOLDER.finditer(text):
        errors.append(f"{name}: template placeholder left in: '{m.group(0)}'")

    unknown = sorted({t for t in TOKEN.findall(text) if t.split("-")[0] in prefixes and t not in tokens})
    for t in unknown:
        errors.append(f"{name}: --{t} is not defined in tokens.css or components.css")

    decisions = section_body(text, "Decisions").strip()
    if decisions and not re.search(r"\*\*D-\d+\*\*", decisions) and not decisions.startswith("None."):
        errors.append(f"{name}: Decisions must list '- **D-1** …' entries or say 'None.'")

    if not section_body(text, "Usage").count("|") and "Usage" in found:
        warnings.append(f"{name}: Usage has no inventory table")

    return {f"AC-{n}" for n in acs}


def check_html(path: Path, acs: set[str], errors: list, warnings: list) -> None:
    text = path.read_text(encoding="utf-8")
    name = path.name
    for sheet in ("design-system/tokens/tokens.css", "design-system/assets/components.css"):
        if sheet not in text:
            errors.append(f"{name}: does not link {sheet}")
    if "design-system/assets/ds.js" not in text:
        warnings.append(f"{name}: does not load ds.js (theme toggle, live tokens and contrast)")
    for theme in ("light", "dark"):
        if f'data-theme="{theme}"' not in text:
            errors.append(f'{name}: no data-theme="{theme}" rendering')
    if not re.search(r"<title>[^<]+</title>", text):
        errors.append(f"{name}: no <title>")
    meta = re.search(r'<meta name="crd:component" content="([^"]+)"', text)
    if not meta or meta.group(1) != path.stem:
        errors.append(f'{name}: <meta name="crd:component" content="{path.stem}"> missing or wrong')
    if PLACEHOLDER.search(text):
        errors.append(f"{name}: template placeholder left in")
    shown = set(re.findall(r"\bAC-\d+\b", text))
    for ac in sorted(shown - acs, key=lambda a: int(a[3:])):
        errors.append(f"{name}: labels {ac}, which the Markdown does not define")
    unshown = sorted(acs - shown, key=lambda a: int(a[3:]))
    if unshown:
        warnings.append(f"{name}: never labels {', '.join(unshown)}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("folder", type=Path)
    parser.add_argument("--l2", type=Path)
    parser.add_argument("--design-system", type=Path)
    args = parser.parse_args()

    folder: Path = args.folder.resolve()
    l2 = args.l2 or folder.parent / "L2.md"
    design_system = args.design_system or folder.parent.parent / "design-system"
    if not l2.exists():
        print(f"error: {l2} not found; CRDs need L2 requirements first", file=sys.stderr)
        return 1
    if not design_system.exists():
        print(f"warning: {design_system} not found; token names are not checked", file=sys.stderr)

    l2_ids = set(re.findall(r"^## (L2-\d{3}):", l2.read_text(encoding="utf-8"), re.MULTILINE))
    tokens = defined_tokens(design_system)
    prefixes = {t.split("-")[0] for t in tokens}

    errors: list[str] = []
    warnings: list[str] = []
    mds = {p.stem: p for p in folder.glob("*.md") if p.name != "README.md"}
    htmls = {p.stem: p for p in folder.glob("*.html")}

    for stem in sorted(mds.keys() - htmls.keys()):
        errors.append(f"{stem}.md has no {stem}.html")
    for stem in sorted(htmls.keys() - mds.keys()):
        errors.append(f"{stem}.html has no {stem}.md")

    for stem in sorted(mds):
        acs = check_md(mds[stem], l2_ids, tokens, prefixes, errors, warnings)
        if stem in htmls:
            check_html(htmls[stem], acs, errors, warnings)

    index = folder / "README.md"
    if index.exists():
        listed = index.read_text(encoding="utf-8")
        for stem in sorted(mds):
            if f"({stem}.md)" not in listed:
                warnings.append(f"README.md does not link {stem}.md")
    elif mds:
        warnings.append("README.md index is missing")

    for w in warnings:
        print(f"warning: {w}")
    for e in errors:
        print(f"error: {e}")
    print(f"{len(mds)} CRD(s), {len(errors)} error(s), {len(warnings)} warning(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
