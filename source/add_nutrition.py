from pathlib import Path
p=Path('D:/www/cook-book/build_pdf.py'); s=p.read_text(encoding='utf-8')
s=s.replace("content=['<!doctype html>","nutrition=[(560,34),(520,29),(500,32),(530,29),(510,33),(630,36),(520,30),(530,30),(520,23),(530,29),(540,26),(560,30),(520,32),(620,33),(670,29),(620,24),(510,33),(510,29),(590,39),(570,32)]\ncontent=['<!doctype html>")
s=s.replace("prep,detail,serving=extra[i-1]", "prep,detail,serving=extra[i-1]\n kcal,protein=nutrition[i-1]")
s=s.replace('<div class="cost"><div class="label">ต้นทุนตัวอย่างต่อกล่อง</div>', '<div class="nutrition"><span class="label">คุณค่าโภชนาการโดยประมาณต่อกล่อง</span><div><strong>{kcal}</strong> กิโลแคลอรี &nbsp; / &nbsp; โปรตีน <strong>{protein}</strong> กรัม</div></div><div class="cost"><div class="label">ต้นทุนตัวอย่างต่อกล่อง</div>')
s=s.replace('.cost{position:absolute;', '.nutrition{position:absolute;bottom:38mm;left:15mm;right:15mm;border-top:1px solid #e0dacf;padding-top:3mm;color:#555c51;font-size:14px}.nutrition .label{display:block}.nutrition strong{font-size:17px;color:#23372c}.cost{position:absolute;')
s=s.replace('ภาพอาหารสร้างด้วย AI เพื่อประกอบการจัดเสิร์ฟ อาจมีเครื่องเคียงแตกต่างจากสูตร','ภาพอาหารสร้างด้วย AI เพื่อประกอบการจัดเสิร์ฟ อาจมีเครื่องเคียงแตกต่างจากสูตร ตัวเลขโภชนาการเป็นค่าประมาณจากวัตถุดิบในสูตร ไม่ใช่ผลตรวจวิเคราะห์ และเปลี่ยนตามวัตถุดิบและวิธีปรุง')
p.write_text(s,encoding='utf-8')
p=Path('D:/www/cook-book/print_book.cjs');s=p.read_text(encoding='utf-8').replace('หนังสือสูตรอาหารไทย_ฉบับขยายสูตร.pdf','หนังสือสูตรอาหารไทย_พร้อมโภชนาการ.pdf').replace("el.querySelector('.cost').getBoundingClientRect().top", "el.querySelector('.nutrition').getBoundingClientRect().top");p.write_text(s,encoding='utf-8')
