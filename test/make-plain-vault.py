# A plain vault: no ACE folders, no frontmatter conventions, wiki links only.
import os, random, datetime, sys
random.seed(3); V = sys.argv[1]; N = int(sys.argv[2])
words = "alpha beta gamma delta river stone cloud forest lamp book coffee music chess garden kitchen travel".split()
fold = ["Projects", "Reading", "Journal", "Ideas", "Work/Meetings", "Work/Clients", ""]
names = []
for i in range(N):
    t = " ".join(random.choice(words).capitalize() for _ in range(3)) + f" {i}"
    names.append((random.choice(fold), t))
for f, t in names:
    os.makedirs(os.path.join(V, f), exist_ok=True)
    k = random.choice([0, 1, 1, 2, 4]) if not t.startswith("Alpha") else 15
    body = " ".join(f"[[{random.choice(names[:max(5, N//10)])[1]}]]" for _ in range(k))
    open(os.path.join(V, f, t + ".md"), "w").write(f"# {t}\n{body}\n")
print("ok", N)
