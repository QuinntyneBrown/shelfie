#!/usr/bin/env python3
"""Inventory every use of a BEM block across the mocks, for a CRD's Usage table.

Usage:
    python usage_inventory.py docs/mocks <block> [tag-regex]

    python usage_inventory.py docs/mocks btn "a|button"
    python usage_inventory.py docs/mocks ticket "li|div"

For each distinct (element, modifier classes, extra classes) configuration it
prints the count, the screens that use it, the ARIA and state attributes seen
and the most common labels. Every row must be buildable with the CRD's API.
"""
import collections
import glob
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

root, block = sys.argv[1], sys.argv[2]
tags = sys.argv[3] if len(sys.argv) > 3 else r"[a-z][a-z0-9]*"
rx = re.compile(r'<(%s)\b([^>]*class="([^"]*\b%s\b[^"]*)"[^>]*)>(.*?)</\1>' % (tags, re.escape(block)), re.S)
labels = collections.defaultdict(collections.Counter)
screens = collections.defaultdict(set)
attrs_seen = collections.defaultdict(collections.Counter)
for f in glob.glob(os.path.join(root, "**", "*.html"), recursive=True):
    rel = os.path.relpath(f, root).replace(os.sep, "/")
    if rel.startswith("index") or rel.startswith("assets"):
        continue
    screen = "/".join(rel.split("/")[:2])
    text = open(f, encoding="utf-8").read()
    for m in rx.finditer(text):
        tag, attrs, cls, inner = m.groups()
        mods = " ".join(sorted(c for c in cls.split() if c == block or c.startswith(block + "--")))
        extra = " ".join(sorted(c for c in cls.split() if not (c == block or c.startswith(block + "-"))))
        key = (tag, mods + (" +" + extra if extra else ""))
        label = re.sub(r"<[^>]+>", "", inner)
        label = re.sub(r"\s+", " ", label).strip()
        al = re.search(r'aria-label="([^"]*)"', attrs)
        if not label and al:
            label = "[" + al.group(1) + "]"
        labels[key][label[:48]] += 1
        screens[key].add(screen)
        for a in re.findall(r'\b(aria-[a-z]+|disabled|data-state|type)(?:="([^"]*)")?', attrs):
            if a[0] in ("aria-label", "aria-controls", "aria-describedby", "aria-labelledby"):
                continue
            attrs_seen[key][a[0] + ("=" + a[1] if a[1] else "")] += 1
for key in sorted(labels, key=lambda k: -sum(labels[k].values())):
    print(key, sum(labels[key].values()), "| screens", len(screens[key]), sorted(screens[key])[:10])
    print("   attrs:", dict(attrs_seen[key].most_common(8)))
    print("   labels:", [l for l, _ in labels[key].most_common(10)])
