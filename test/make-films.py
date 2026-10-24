"""Add 160 made-up films with generated posters to a test vault (for Posters, Scatter, Mosaic and the README).
Usage: python3 test/make-films.py <vault>   (run make-ace-vault.py first). Needs Pillow."""
import os, random, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
V = sys.argv[1]; D = os.path.join(V, "Atlas", "Films"); os.makedirs(os.path.join(D, "posters"), exist_ok=True)
random.seed(11)
A = ["Silent","Last","Crimson","Paper","Glass","Midnight","Hollow","Golden","Northern","Broken","Electric","Quiet","Wild","Distant","Iron","Velvet","Burning","Lonely","Secret","Falling","Endless","Second","Blue","Long","Little"]
B = ["Harbor","Summer","Orchard","Signal","Kingdom","River","Station","Garden","Frontier","Machine","Lantern","Mountain","Season","Tide","Comet","Letter","Highway","Archive","Island","Engine","Window","Cartographer","Lighthouse","Parade","Echo"]
genres = ["Drama","Adventure","Comedy","Sci-Fi","Thriller","Romance","Animation","Western","Mystery","Documentary"]
dirs = ["Ada Venn","Rui Okafor","Mira Castell","Theo Lindqvist","Sol Arden","June Halvorsen","Kai Moreau","Ines Tamura","Otto Brandt","Lea Fontaine","Rafe Calder","Nadia Sorel"]
pals = [("#1d2b53","#ff7a59","#ffd166"),("#0b3d2e","#e9c46a","#f4f1de"),("#3d0c11","#f28482","#f6bd60"),("#14213d","#fca311","#e5e5e5"),("#2b2d42","#8d99ae","#ef233c"),("#264653","#2a9d8f","#e76f51"),("#1b1b3a","#693668","#f7b267"),("#004e64","#00a5cf","#ffd23f"),("#3c1642","#086375","#1dd3b0"),("#231942","#5e548e","#e0b1cb"),("#5f0f40","#9a031e","#fb8b24"),("#0d1b2a","#415a77","#e0e1dd")]
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
fb = lambda s: ImageFont.truetype(FONT, s)
def poster(path, title, year, pal, kind):
    W, H = 300, 450; bg, c1, c2 = pal; im = Image.new("RGB", (W, H), bg); d = ImageDraw.Draw(im)
    for y in range(H):
        t = y / H; d.line([(0, y), (W, y)], fill=tuple(int(int(bg[i:i+2], 16) * (1 - t * .5) + int(c1[i:i+2], 16) * t * .5) for i in (1, 3, 5)))
    if kind == 0: r = random.randint(60, 110); cx, cy = random.randint(80, 220), random.randint(150, 260); d.ellipse([cx-r, cy-r, cx+r, cy+r], fill=c2)
    elif kind == 1:
        for k in range(3): y0 = 250 + k * 40; d.polygon([(0, H), (random.randint(40, 260), y0), (W, H)], fill=[c1, c2, bg][k])
    elif kind == 2:
        for k in range(9): x = k * 36; d.rectangle([x, 120, x + 18, 380], fill=c2 if k % 2 else c1)
    else:
        for k in range(5): r = 40 + k * 28; d.ellipse([150-r, 240-r, 150+r, 240+r], outline=c2, width=6)
    im = im.filter(ImageFilter.GaussianBlur(.6)); d = ImageDraw.Draw(im); w_ = title.upper().split()
    for j, l in enumerate([w_[0], " ".join(w_[1:])]):
        f = fb(34); w = d.textlength(l, font=f)
        if w > W - 30: f = fb(int(34 * (W - 30) / w))
        d.text(((W - d.textlength(l, font=f)) / 2, 26 + j * 42), l, font=f, fill="#ffffff")
    d.text((W / 2 - 20, H - 36), str(year), font=fb(16), fill="#ffffff")
    im.save(path)
used, names = set(), []
for k in range(160):
    while True:
        t = random.choice(A) + " " + random.choice(B)
        if t not in used: used.add(t); break
    year = int(min(2025, max(1950, random.gauss(1998, 17)))); g = random.choice(genres); dr = random.choice(dirs)
    imdb = round(min(9.3, max(4.8, random.gauss(7.2, .8))), 1); rank = max(1, min(5, round((imdb / 2 + random.gauss(0, .6)) * 2) / 2))
    fn = f"p{k:03d}.png"; poster(os.path.join(D, "posters", fn), t, year, random.choice(pals), random.randint(0, 3))
    status = "watched" if random.random() < .8 else "unwatched"
    open(os.path.join(D, t + ".md"), "w").write(f'---\nup:\n  - "[[Films]]"\nyear: {year}\ngenre: {g}\ndirector: "[[{dr}]]"\nimdbRating: {imdb}\nrank: {rank}\nstatus: {status}\nimage: "[[{fn}]]"\ncreated: {year + random.randint(0, 1)}-0{random.randint(1, 9)}-1{random.randint(0, 9)}\n---\nA film by [[{dr}]].\n')
    names.append(t)
open(os.path.join(D, "Films.md"), "w").write("---\ncreated: 2024-02-01\n---\n# Films\n\n" + "\n".join(f"- [[{n}]]" for n in names) + "\n")
open(os.path.join(V, "Films.base"), "w").write('filters:\n  and:\n    - file.inFolder("Atlas/Films")\n    - file.ext == "md"\n    - file.name != "Films"\nviews:\n  - type: ideaverse-map\n    name: Posters\n    sort:\n      - property: note.year\n        direction: ASC\n    maps-of-the-ideaverse:\n      iv-view: posters\n')
print("films:", len(names))
