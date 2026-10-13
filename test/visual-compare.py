import sys,json,os
from PIL import Image, ImageChops
a,b=sys.argv[1],sys.argv[2]; import tempfile; base=os.environ.get('BASE', tempfile.gettempdir()+'/ivm-base'); A=f'{base}/{a}'; B=f'{base}/{b}'
ga=json.load(open(A+'/geo.json')); gb=json.load(open(B+'/geo.json'))
for k in ga:
    d=[f'{s}: {ga[k].get(s)} -> {gb.get(k,{}).get(s)}' for s in set(ga[k])|set(gb.get(k,{})) if ga[k].get(s)!=gb.get(k,{}).get(s)]
    im=ImageChops.difference(Image.open(f'{A}/{k}.png').convert('RGB'),Image.open(f'{B}/{k}.png').convert('RGB'))
    bbox=im.getbbox(); n=sum(1 for p in im.getdata() if max(p)>40) if bbox else 0
    print(k, 'px', n, bbox or '', *(['\n   '+x for x in d]))
