# Turn screencast frames into the README's swirl GIF: python3 test/make-gif.py <frames dir> <out.gif>
import sys, glob
from PIL import Image
fs = sorted(glob.glob(sys.argv[1] + "/f*.jpg"))
fr = [Image.open(f).convert("RGB").crop((600, 215, 1440, 965)).resize((672, 600), Image.LANCZOS) for f in fs]
pal = fr[len(fr) // 2].quantize(colors=128, method=Image.Quantize.MEDIANCUT)
q = [f.quantize(palette=pal, dither=Image.Dither.NONE) for f in fr]
q[0].save(sys.argv[2], save_all=True, append_images=q[1:], duration=58, loop=0, optimize=True)
