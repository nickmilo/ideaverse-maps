"""A tags vault: a copy of synth where notes carry tags (frontmatter and inline, some nested, some none), for Bookshelf and Chord by Tag.
usage: python3 test/make-tags.py <synth vault> <out vault>"""
import os, re, shutil, sys, hashlib
src, dst = sys.argv[1], sys.argv[2]
if os.path.exists(dst): shutil.rmtree(dst)
shutil.copytree(src, dst)
TOP = {"idea": ["spark", "draft", "evergreen"], "book": ["fiction", "nonfiction"], "project": ["alpha", "beta", "gamma"], "person": [], "daily": [], "learning": ["course", "practice"], "music": []}
keys = list(TOP)
n = 0
for r, _, fs in os.walk(dst):
    for f in fs:
        if not f.endswith(".md"): continue
        p = os.path.join(r, f); h = int(hashlib.md5(p[len(dst):].encode()).hexdigest(), 16)
        if h % 6 == 0: continue   # some notes have no tags
        top = keys[h % len(keys)]; subs = TOP[top]; tag = top + ("/" + subs[(h >> 8) % len(subs)] if subs and (h >> 4) % 3 else "")
        extra = keys[(h >> 12) % len(keys)]
        t = open(p, encoding="utf8").read()
        if (h >> 16) % 2 and t.startswith("---\n"):
            t = t.replace("---\n", f"---\ntags:\n  - {tag}\n  - {extra}\n", 1)
        else:
            t = t.rstrip("\n") + f"\n\n#{tag} #{extra}\n"
        open(p, "w", encoding="utf8").write(t); n += 1
print("tagged", n)
