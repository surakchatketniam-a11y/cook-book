import ast,json,shutil
from pathlib import Path
from PIL import Image, ImageOps
root=Path('D:/www/cook-book'); out=root/'thai-kitchen-site/dist'; (out/'images').mkdir(exist_ok=True); (out/'fonts').mkdir(exist_ok=True)
def get(p,k):
 t=ast.parse(p.read_text(encoding='utf-8-sig'))
 return next(ast.literal_eval(n.value) for n in t.body if isinstance(n,ast.Assign) and any(isinstance(x,ast.Name) and x.id==k for x in n.targets))
recipes=get(root/'create_book.py','recipes'); extra=get(root/'build_pdf.py','extra'); nutr=get(root/'build_pdf.py','nutrition')
result=[]
for i,(r,x,n) in enumerate(zip(recipes,extra,nutr),1):
 name,time,ing,steps,cost,price,tip=r; items=[c.rsplit(' ',1) for c in cost.split(';')]
 result.append(dict(id=i,name=name,time=time,ingredients=ing.split('; '),steps=steps.split('|'),cost=[{'name':a,'value':int(b)} for a,b in items],price=price,prep=x[0],detail=x[1],serving=x[2],kcal=n[0],protein=n[1]))
 ImageOps.fit(Image.open(root/f'food_images/{i:02}.png').convert('RGB'),(900,600)).save(out/f'images/{i:02}.webp','WEBP',quality=82)
Image.open(root/'food_images/cover-spread.png').convert('RGB').save(out/'images/cover.webp','WEBP',quality=85)
for name in ['Sarabun-Regular.ttf','Sarabun-Bold.ttf','Sriracha-Regular.ttf']: shutil.copy(root/'fonts'/name,out/'fonts'/name)
(out/'data.js').write_text('const recipes = '+json.dumps(result,ensure_ascii=False)+';',encoding='utf-8')

