import ast,json,shutil
from pathlib import Path
from PIL import Image, ImageOps
root=Path(__file__).resolve().parent.parent; out=root/'website'; (out/'images').mkdir(exist_ok=True); (out/'fonts').mkdir(exist_ok=True)
def get(p,k):
 t=ast.parse(p.read_text(encoding='utf-8-sig'))
 return next(ast.literal_eval(n.value) for n in t.body if isinstance(n,ast.Assign) and any(isinstance(x,ast.Name) and x.id==k for x in n.targets))
recipes=get(root/'source/create_book.py','recipes'); extra=get(root/'source/build_pdf.py','extra'); nutr=get(root/'source/build_pdf.py','nutrition')
result=[]
for i,(r,x,n) in enumerate(zip(recipes,extra,nutr),1):
 name,time,ing,steps,cost,price,tip=r; items=[c.rsplit(' ',1) for c in cost.split(';')]
 result.append(dict(id=i,name=name,time=time,ingredients=ing.split('; '),steps=steps.split('|'),cost=[{'name':a,'value':int(b)} for a,b in items],price=price,prep=x[0],detail=x[1],serving=x[2],kcal=n[0],protein=n[1]))
 (lambda im:(im.save(out/f'images/{i:02}.webp','WEBP',quality=82),im.resize((480,320),Image.LANCZOS).save(out/f'images/{i:02}-480.webp','WEBP',quality=78,method=6)))(ImageOps.fit(Image.open(root/f'assets/food_images/{i:02}.png').convert('RGB'),(900,600)))
cover=Image.open(root/'assets/food_images/cover-spread.png').convert('RGB'); cover.save(out/'images/cover.webp','WEBP',quality=85); cover.resize((800,round(800*cover.height/cover.width)),Image.LANCZOS).save(out/'images/cover-800.webp','WEBP',quality=76,method=6)
from fontTools.ttLib import TTFont  # needs: pip install fonttools brotli
for name in ['Sarabun-Regular','Sarabun-Bold','Sriracha-Regular']:
 font=TTFont(root/'assets/fonts'/f'{name}.ttf'); font.flavor='woff2'; font.save(out/'fonts'/f'{name}.woff2')
(out/'data.js').write_text('const recipes = '+json.dumps(result,ensure_ascii=False)+';',encoding='utf-8')

