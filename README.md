# ครัวอาหารไทย

เว็บไซต์สูตรอาหารไทย 20 เมนู พร้อมหนังสือและไฟล์ประกอบ

- `website/` เว็บไซต์แบบ static
- `cookbook/` หนังสือ Word ที่จัดเก็บไว้
- `assets/` ภาพและฟอนต์ต้นฉบับ
- `source/` สคริปต์สร้างหนังสือและเตรียมข้อมูลเว็บไซต์
- `generated/` ผลลัพธ์ที่สร้างในเครื่อง (ไม่นำขึ้น Git)

Vercel ใช้ `vercel.json` กำหนด output directory เป็น `website` โดย project root ต้องเป็นรากของ repository มี build command เพียง `node scripts/stamp-sw.js` (ไม่ติดตั้ง dependencies) เพื่อประทับเวอร์ชันแคชลง `sw.js`

## สร้างหนังสือ

ติดตั้ง Python 3 และแพ็กเกจ `python-docx` จากนั้นรันจากราก repository:

```sh
python source/create_book.py
python source/add_images.py
python source/build_pdf.py
```

ผลลัพธ์อยู่ใน `generated/` สำหรับสร้าง PDF จาก HTML ให้ติดตั้ง Node.js, Playwright และ Chromium (`npm install --no-save playwright` และ `npx playwright install chromium`) แล้วรัน `node source/print_book.cjs` ไฟล์ PDF จะอยู่ที่ `generated/cookbook.pdf`

`python source/prepare.py` ต้องใช้ Pillow และจะสร้างข้อมูลกับภาพเว็บใหม่ใน `website/` โปรดตรวจ diff ก่อน commit เพราะอาจเขียนทับข้อมูลและภาพที่ปรับไว้ สคริปต์ `add_nutrition.py` และ `enrich_book.py` เป็นสคริปต์แก้ไขต้นฉบับจากขั้นตอนเก่า ไม่จำเป็นสำหรับการสร้างหนังสือปัจจุบัน และจะเขียนทับสคริปต์อื่นหากรัน

ไฟล์ PDF ฉบับเดิมมีขนาดเกิน 50 MiB จึงไม่อยู่ใน repository เวอร์ชันปัจจุบัน ไฟล์ทั้งหมดใน repository สาธารณะสามารถดาวน์โหลดได้

## ติดตั้งเป็นแอป (PWA)

เปิดเว็บไซต์ผ่าน HTTPS แล้วใช้เมนูติดตั้งของเบราว์เซอร์ บน iPhone/iPad ใช้ Safari → แชร์ → เพิ่มไปยังหน้าจอโฮม หลังเปิดเว็บครั้งแรกและดาวน์โหลดไฟล์ครบ จะเปิดสูตรและรายการซื้อแบบออฟไลน์ได้ ข้อมูลที่บันทึกไว้ยังอยู่เฉพาะเบราว์เซอร์/อุปกรณ์นั้น การล้างข้อมูลเว็บอาจลบข้อมูลและไฟล์ออฟไลน์

Service worker ใช้ network-first สำหรับไฟล์เว็บไซต์ (แคชแอปเก็บไว้ตอนติดตั้ง) ส่วนภาพสูตร 20 ภาพจะดาวน์โหลดเข้าแคชแยก (`thai-kitchen-img`) หลังติดตั้งเสร็จ และไม่ทำให้การติดตั้งล้มเหลว ชื่อแคชในไฟล์ที่ commit เป็น `thai-kitchen-pwa-dev` ตอน deploy `scripts/stamp-sw.js` จะแทนด้วย hash ของไฟล์ทั้งหมดอัตโนมัติ จึงไม่ต้องแก้เวอร์ชันด้วยมืออีก ไอคอน maskable สำหรับ Android อยู่ที่ `website/icons/icon-maskable-512.png`

## ทดสอบ

```sh
npm install
npm test
```
