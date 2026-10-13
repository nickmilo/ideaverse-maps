# A made-up ACE vault for testing the plugin: folders, maps, links, up/related/collections, created dates.
import os, random, datetime, sys
random.seed(7)
V = sys.argv[1]; N = int(sys.argv[2]) if len(sys.argv) > 2 else 2500
words = "spark flow habit map idea note link garden river light story craft focus wonder mind home path lens orbit cosmos ember tide seed root branch".split()
def title(): return " ".join(random.choice(words).capitalize() if i == 0 else random.choice(words) for i in range(random.randint(2, 4)))
folders = {"+": 0.06, "Atlas/Dots": .3, "Atlas/Maps": .03, "Atlas/Sources": .12, "Calendar/Days": .25, "Calendar/Logs": .04, "Efforts/Projects/Active": .03, "Efforts/Areas": .02, "x/Templates": .01, "Notes": .14}
notes = []
used = set()
for i in range(N):
    f = random.choices(list(folders), weights=list(folders.values()))[0]
    d = datetime.date(2016, 1, 1) + datetime.timedelta(days=int((random.random() ** 0.6) * 3900))
    t = d.isoformat() if f == "Calendar/Days" else title()
    while t in used: t += " " + random.choice(words)
    used.add(t); notes.append((f, t, d))
maps = [n for n in notes if n[0] == "Atlas/Maps"]
hubs = random.sample(notes, 40)
os.makedirs(V, exist_ok=True)
open(os.path.join(V, "Home.md"), "w").write("# Home\n" + "\n".join(f"- [[{m[1]}]]" for m in maps) + "\n")
for f, t, d in notes:
    os.makedirs(os.path.join(V, f), exist_ok=True)
    fm = ["---", f"created: {d.isoformat()}"]
    if random.random() < .5: fm.append(f'up: "[[{random.choice(maps + hubs)[1]}]]"')
    if random.random() < .15: fm.append(f'related: "[[{random.choice(notes)[1]}]]"')
    if f == "Atlas/Maps": fm.append('collections: "[[Maps]]"')
    if random.random() < .1: fm.append(f"rank: {random.randint(1,5)}")
    fm.append("---")
    k = random.choice([0, 0, 1, 2, 3, 5]) if f != "Atlas/Maps" else 25
    targets = [random.choice(hubs if random.random() < .5 else notes)[1] for _ in range(k)]
    body = "\n".join(f"Thinking about [[{x}]] and how it connects." for x in targets) or "A loose thought, no links yet."
    open(os.path.join(V, f, t + ".md"), "w").write("\n".join(fm) + f"\n# {t}\n{body}\n")
print("wrote", len(notes) + 1)
