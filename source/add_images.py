from docx import Document
from docx.shared import Cm, Pt
from docx.oxml import OxmlElement
from docx.text.paragraph import Paragraph
from pathlib import Path
import shutil
root=Path(__file__).resolve().parent.parent
assets=root/'assets'/'food_images'
out=root/'generated'
out.mkdir(exist_ok=True)
doc=Document(out/'หนังสือสูตรอาหารไทย_20เมนู.docx')
heads=[p for p in doc.paragraphs if p.style.name=='Heading 1' and len(p.text)>3 and p.text[:2].isdigit() and p.text[2:4]=='  ']
assert len(heads)==20
for i,heading in enumerate(heads,1):
 dest=assets / f'{i:02d}.png'
 node=OxmlElement('w:p'); heading._p.addnext(node); para=Paragraph(node,heading._parent)
 para.paragraph_format.space_after=Pt(4)
 para.add_run().add_picture(str(dest),width=Cm(4))
doc.save(out/'หนังสือสูตรอาหารไทย_20เมนู_พร้อมภาพ.docx')
print('recipes',len(heads),'images',len(doc.inline_shapes))

