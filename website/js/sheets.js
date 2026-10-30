function renderPrep(selected, items) {
  const sheet = document.querySelector("#prep-sheet");
  sheet.hidden = !selected.length;
  if (!selected.length) {
    sheet.open = false;
    document.querySelector("#prep-content").innerHTML = "";
    return;
  }
  const done = new Set(
    [...document.querySelectorAll("#prep-content input:checked")].map((x) => x.dataset.prepKey),
  );
  document.querySelector("#prep-content").innerHTML =
    `<p>สรุปจาก ${fmt(selected.length)} เมนู · ${fmt(selected.reduce((sum, r) => sum + quantity(state.plan[r.id]), 0))} กล่อง</p><h3>วัตถุดิบที่ต้องเตรียม</h3><ul class="prep-items">${items.map((item) => `<li><label><input type="checkbox" data-prep-key="${encodeURIComponent(item.key)}" ${done.has(encodeURIComponent(item.key)) ? "checked" : ""}><span>${item.text}</span></label></li>`).join("")}</ul><h3>เตรียมตามเมนู</h3><div class="prep-recipes">${selected.map((r) => `<article><h4>${r.name} · ${fmt(quantity(state.plan[r.id]))} กล่อง</h4><p>${r.prep}</p></article>`).join("")}</div><p class="small">ปริมาณเป็นการคูณสูตรต่อกล่อง ควรตรวจและปรับตามวิธีทำจริง โดยเฉพาะเมื่อปรุงครั้งละมาก ๆ คำแนะนำการเตรียมเป็นแนวทางของแต่ละสูตร</p>`;
}
document.querySelector("#print-prep").addEventListener("click", () => {
  const selected = recipes.filter((r) => state.plan[r.id]);
  if (!selected.length) return;
  const items = shoppingItems(),
    done = new Set(
      [...document.querySelectorAll("#prep-content input:checked")].map((x) => x.dataset.prepKey),
    );
  document.querySelector("#print-sheet").innerHTML =
    `<header class="print-header"><div><p class="print-brand">ครัวอาหารไทย · สูตรทำขาย</p><h1>ใบเตรียมของก่อนปรุง</h1><p>${fmt(selected.length)} เมนู · ${fmt(selected.reduce((sum, r) => sum + quantity(state.plan[r.id]), 0))} กล่อง</p></div><div class="print-date">วันที่ __________________</div></header><section class="print-ingredients"><h2>วัตถุดิบที่ต้องเตรียม</h2><ul>${items.map((item) => `<li><span class="print-check">${done.has(encodeURIComponent(item.key)) ? "✓" : ""}</span><span>${item.text}</span></li>`).join("")}</ul></section><section class="print-method"><h2>เตรียมตามเมนู</h2>${selected.map((r) => `<article><h3>${r.name} · ${fmt(quantity(state.plan[r.id]))} กล่อง</h3><p>${r.prep}</p></article>`).join("")}<p class="print-note">ปริมาณคูณตามสูตรต่อกล่อง ควรตรวจและปรับตามวิธีทำจริง โดยเฉพาะเมื่อปรุงครั้งละมาก ๆ</p></section>`;
  window.print();
});
const escapeHTML = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch],
  );
function quotePrice(r) {
  return Object.hasOwn(quotePrices, r.id)
    ? quotePrices[r.id]
    : (state.costs[r.id]?.sale ?? r.price);
}
function quoteTotal(selected) {
  return selected.reduce((sum, r) => sum + quotePrice(r) * quantity(state.plan[r.id]), 0);
}
function renderQuote(selected) {
  const sheet = document.querySelector("#quote-sheet");
  sheet.hidden = !selected.length;
  if (!selected.length) {
    sheet.open = false;
    document.querySelector("#quote-content").innerHTML = "";
    return;
  }
  document.querySelector("#quote-content").innerHTML =
    `<p>ราคาตั้งต้นมาจากราคาขายในแต่ละสูตร ปรับเฉพาะใบเสนอราคานี้ได้</p><div class="quote-fields"><label>ชื่อลูกค้า (ถ้ามี)<input id="quote-customer" type="text" maxlength="120" value="${escapeHTML(quoteCustomer)}" placeholder="ชื่อลูกค้าหรือหน่วยงาน"></label><label>หมายเหตุ (ถ้ามี)<textarea id="quote-note" maxlength="500" rows="2" placeholder="เช่น วันส่งมอบ หรือเงื่อนไขราคา">${escapeHTML(quoteNote)}</textarea></label></div><div class="quote-rows">${selected.map((r) => `<div class="quote-row"><div><strong>${r.name}</strong><span>${fmt(quantity(state.plan[r.id]))} กล่อง</span></div><label>ราคา / กล่อง (บาท)<input type="number" inputmode="decimal" min="0" step="0.01" data-quote-id="${r.id}" value="${quotePrice(r)}"></label><div class="quote-subtotal"><span>รวม</span><strong data-subtotal="${r.id}">${fmt(quotePrice(r) * quantity(state.plan[r.id]))} บาท</strong></div></div>`).join("")}</div><div class="shopping-total"><span>ยอดรวมทั้งหมด</span><strong id="quote-total">${fmt(quoteTotal(selected))} บาท</strong></div><p class="small">ราคานี้ยังไม่รวมค่าจัดส่ง ภาษี หรือส่วนลด เว้นแต่รวมไว้ในราคาหรือระบุในหมายเหตุ ข้อมูลใบเสนอราคาจะอยู่ระหว่างเปิดหน้านี้</p><button type="button" class="action" id="print-quote">พิมพ์ใบเสนอราคา / บันทึก PDF</button>`;
}
document.querySelector("#quote-content").addEventListener("input", (e) => {
  const el = e.target;
  if (el.id === "quote-customer") {
    quoteCustomer = el.value;
    return;
  }
  if (el.id === "quote-note") {
    quoteNote = el.value;
    return;
  }
  if (el.dataset.quoteId) {
    const id = Number(el.dataset.quoteId),
      r = recipes.find((x) => x.id === id),
      price = Number(el.value);
    if (!r) return;
    if (el.value === "" || !Number.isFinite(price) || price < 0) {
      delete quotePrices[id];
      el.setCustomValidity("กรุณากรอกราคาตั้งแต่ 0 บาท");
      document.querySelector("#print-quote").disabled = true;
      return;
    }
    el.setCustomValidity("");
    quotePrices[id] = price;
    document.querySelector(`[data-subtotal="${id}"]`).textContent =
      fmt(price * quantity(state.plan[id])) + " บาท";
    const selected = recipes.filter((x) => state.plan[x.id]);
    document.querySelector("#quote-total").textContent = fmt(quoteTotal(selected)) + " บาท";
    document.querySelector("#print-quote").disabled = [
      ...document.querySelectorAll("[data-quote-id]"),
    ].some((x) => !x.validity.valid || x.value === "");
  }
});
document.querySelector("#quote-content").addEventListener("click", (e) => {
  if (e.target.id !== "print-quote") return;
  const selected = recipes.filter((r) => state.plan[r.id]);
  if (!selected.length) return;
  document.querySelector("#print-sheet").innerHTML =
    `<header class="print-header"><div><p class="print-brand">ครัวอาหารไทย · สูตรทำขาย</p><h1>ใบเสนอราคาข้าวกล่อง</h1><p>ลูกค้า: ${quoteCustomer.trim() ? escapeHTML(quoteCustomer.trim()) : "________________________"}</p></div><div class="print-date">วันที่ __________________</div></header><table class="quote-print-table"><thead><tr><th>รายการ</th><th>จำนวน</th><th>ราคา / กล่อง</th><th>จำนวนเงิน</th></tr></thead><tbody>${selected.map((r) => `<tr><td>${r.name}</td><td>${fmt(quantity(state.plan[r.id]))}</td><td>${fmt(quotePrice(r))}</td><td>${fmt(quotePrice(r) * quantity(state.plan[r.id]))}</td></tr>`).join("")}</tbody><tfoot><tr><th colspan="3">ยอดรวม (บาท)</th><th>${fmt(quoteTotal(selected))}</th></tr></tfoot></table><p class="print-note">ราคานี้ยังไม่รวมค่าจัดส่ง ภาษี หรือส่วนลด เว้นแต่รวมไว้ในราคาหรือระบุในหมายเหตุ</p><div class="quote-print-note"><b>หมายเหตุ</b><p>${quoteNote.trim() ? escapeHTML(quoteNote.trim()).replace(/\n/g, "<br>") : "____________________________________________________________"}</p></div><div class="quote-signatures"><span>ผู้เสนอราคา __________________</span><span>ผู้รับใบเสนอราคา __________________</span></div>`;
  window.print();
});
function recipeAllergens(r) {
  const text = r.ingredients.join(" ") + " " + r.serving;
  const list = [];
  if (/ไข่/.test(text)) list.push("ไข่");
  if (/กุ้ง/.test(text)) list.push("กุ้ง");
  if (/นม/.test(text)) list.push("นม");
  if (/เม็ดมะม่วง|ถั่ว/.test(r.name + " " + r.serving) || /เม็ดมะม่วง/.test(text))
    list.push("ถั่ว/เม็ดมะม่วงหิมพานต์");
  if (/เต้าเจี้ยว|เต้าหู้|ซีอิ๊ว/.test(text)) list.push("ถั่วเหลือง");
  if (/ซอสหอยนางรม/.test(text)) list.push("หอยนางรม");
  if (/น้ำปลา|พริกแกง/.test(text)) list.push("ปลา/กะปิ");
  return list.length ? list.join(", ") : "โปรดตรวจจากวัตถุดิบจริง";
}
function renderLabels(selected) {
  const sheet = document.querySelector("#label-sheet");
  sheet.hidden = !selected.length;
  if (!selected.length) {
    sheet.open = false;
    document.querySelector("#label-content").innerHTML = "";
    return;
  }
  const totalBoxes = selected.reduce((s, r) => s + quantity(state.plan[r.id]), 0);
  document.querySelector("#label-content").innerHTML =
    `<p>พิมพ์ป้ายชื่อเมนู คุณค่าโภชนาการ และข้อมูลผู้แพ้อาหารสำหรับติดฝากล่อง</p><div class="quote-fields"><label>ชื่อร้าน / เบอร์โทร (ถ้ามี)<input id="label-shop" type="text" maxlength="80" value="${escapeHTML(labelShop)}" placeholder="เช่น ครัวอาหารไทย 08x-xxx-xxxx"></label><label>วันที่ทำ / เวลาแนะนำ<input id="label-date" type="text" maxlength="80" value="${escapeHTML(labelDate)}" placeholder="เช่น ปรุงสดวันนี้ · ควรรับประทานภายใน 4 ชม."></label></div><label class="label-mode"><input id="label-per-box" type="checkbox" ${labelPrintPerBox ? "checked" : ""}><span>พิมพ์ตามจำนวนกล่องจริง (${fmt(Math.min(totalBoxes, 200))} ดวง${totalBoxes > 200 ? " · จำกัดสูงสุด 200 ดวงต่อครั้ง" : ""}) · หากไม่ติ๊กจะพิมพ์ตัวอย่างเมนูละ 1 ดวง</span></label><div class="label-preview-grid">${selected.map((r) => `<div class="box-sticker"><strong>${r.name}</strong><span>พลังงานประมาณ ${r.kcal} kcal · โปรตีน ${r.protein} g</span><small>ข้อมูลผู้แพ้อาหาร: มีส่วนผสมของ ${recipeAllergens(r)}</small></div>`).join("")}</div><button type="button" class="action" id="print-labels">พิมพ์สติกเกอร์ติดกล่อง</button>`;
}
document.querySelector("#label-content").addEventListener("input", (e) => {
  if (e.target.id === "label-shop") labelShop = e.target.value;
  if (e.target.id === "label-date") labelDate = e.target.value;
  if (e.target.id === "label-per-box") labelPrintPerBox = e.target.checked;
});
document.querySelector("#label-content").addEventListener("click", (e) => {
  if (e.target.id !== "print-labels") return;
  const selected = recipes.filter((r) => state.plan[r.id]);
  if (!selected.length) return;
  const cards = [];
  for (const r of selected) {
    const copies = labelPrintPerBox ? Math.min(200 - cards.length, quantity(state.plan[r.id])) : 1;
    for (let i = 0; i < copies; i++)
      cards.push(
        `<div class="print-sticker"><div class="print-sticker-brand">${escapeHTML(labelShop.trim() || "ครัวอาหารไทย · ทำสดใหม่")}</div><strong>${r.name}</strong><div class="print-sticker-meta">พลังงาน ~${r.kcal} kcal · โปรตีน ${r.protein} g</div><div class="print-sticker-allergen">ผู้แพ้อาหาร: มี ${recipeAllergens(r)}</div><div class="print-sticker-date">${escapeHTML(labelDate.trim() || "ควรรับประทานทันที หรือเก็บในตู้เย็นและอุ่นให้ร้อนจัด")}</div></div>`,
      );
    if (cards.length >= 200) break;
  }
  document.querySelector("#print-sheet").innerHTML =
    `<div class="print-sticker-grid">${cards.join("")}</div>`;
  window.print();
});
document.querySelector("#shopping-list").addEventListener("input", (e) => {
  if (e.target.dataset.price !== undefined) {
    const item = shoppingItems()[Number(e.target.dataset.price)];
    if (!item) return;
    const val = Number(e.target.value);
    if (e.target.value === "" || !Number.isFinite(val) || val < 0) delete state.prices[item.key];
    else state.prices[item.key] = val;
    save();
    document.querySelector("#shopping-total-value").textContent = fmt(shoppingTotal()) + " บาท";
    updateComparison();
  }
});
document.querySelector("#shopping-list").addEventListener("change", (e) => {
  if (e.target.dataset.check !== undefined) {
    const items = shoppingItems(),
      item = items[Number(e.target.dataset.check)];
    if (item) {
      if (e.target.checked) state.checked[item.key] = true;
      else delete state.checked[item.key];
      save();
      document.querySelector("#clear-checked").hidden = !items.some((x) => state.checked[x.key]);
      document.querySelector("#reset-shopping").hidden = !(
        items.length > 0 ||
        Object.keys(state.prices).length > 0 ||
        Object.keys(state.checked).length > 0
      );
    }
  }
});
document.querySelector("#clear-checked").addEventListener("click", () => {
  state.checked = {};
  save();
  renderPlan();
});
document.querySelector("#reset-shopping").addEventListener("click", async () => {
  if (
    !(await askConfirm(
      "เริ่มรอบซื้อใหม่? เมนู ราคาซื้อ และเครื่องหมายติ๊กของรอบปัจจุบันจะถูกล้าง",
      "เริ่มรอบใหม่",
    ))
  )
    return;
  state.plan = {};
  state.prices = {};
  state.checked = {};
  quotePrices = {};
  quoteCustomer = "";
  quoteNote = "";
  save();
  renderPlan();
});
document.querySelector("#plan").addEventListener("change", (e) => {
  if (e.target.dataset.planQty) {
    state.plan[e.target.dataset.planQty] = quantity(e.target.value);
    save();
    renderPlan();
  }
});
document.querySelector("#plan").addEventListener("click", (e) => {
  if (e.target.dataset.remove) {
    delete state.plan[e.target.dataset.remove];
    save();
    renderPlan();
  }
});
document.querySelector("#copy-list").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(shoppingText());
    document.querySelector("#copy-status").textContent = " คัดลอกแล้ว";
  } catch (e) {
    document.querySelector("#copy-status").textContent =
      " คัดลอกไม่ได้ กรุณาเลือกข้อความในรายการด้วยตนเอง";
  }
});

document.querySelector("#print-list").addEventListener("click", () => {
  const selected = recipes.filter((r) => state.plan[r.id]);
  if (!selected.length) return;
  const list = shoppingItems();
  const total = selected.reduce((sum, r) => sum + quantity(state.plan[r.id]), 0);
  document.querySelector("#print-sheet").innerHTML =
    `<header class="print-header"><div><p class="print-brand">ครัวอาหารไทย · สูตรทำขาย</p><h1>รายการซื้อวัตถุดิบ</h1><p>เตรียมวัตถุดิบสำหรับ ${fmt(selected.length)} เมนู · ${fmt(total)} กล่อง</p></div><div class="print-date">วันที่ __________________</div></header><section class="print-recipes"><h2>เมนูที่เลือก</h2><ul>${selected.map((r) => `<li><span>${r.name}</span><b>${fmt(quantity(state.plan[r.id]))} กล่อง</b></li>`).join("")}</ul></section><section class="print-ingredients"><h2>วัตถุดิบที่ต้องเตรียม</h2><p>ทำเครื่องหมายเมื่อจัดเตรียมหรือซื้อแล้ว</p>${[
      "เนื้อสัตว์และไข่",
      "ผักสด",
      "เครื่องปรุงและอื่น ๆ",
    ]
      .map((group) => {
        const subset = list.filter((item) => item.category === group);
        return subset.length
          ? `<h3>${group}</h3><ul>${subset.map((item) => `<li><span class="print-check" aria-hidden="true">${state.checked[item.key] ? "✓" : ""}</span><span>${item.text}</span><span class="print-price">${state.prices[item.key] === undefined ? "________" : fmt(state.prices[item.key])} บาท</span></li>`).join("")}</ul>`
          : "";
      })
      .join(
        "",
      )}<p class="print-total">รวมราคาที่กรอก ${fmt(shoppingTotal())} บาท</p></section><p class="print-note">รวมไก่และข้าวสวยตามวิธีเตรียม และรวมหน่วยปริมาตรที่แปลงได้ โปรดตรวจปริมาณและเผื่อการสูญเสียก่อนซื้อ</p><div class="print-notes"><b>บันทึกเพิ่มเติม</b><div></div><div></div></div>`;
  window.print();
});
document.querySelector("#print-book").addEventListener("click", () => {
  document.querySelector("#print-sheet").innerHTML = recipes
    .map(
      (r, idx) =>
        `<article class="print-book-page">${idx === 0 ? `<header class="print-header"><div><p class="print-brand">ครัวอาหารไทย · สูตรทำขาย</p><h1>หนังสือรวม 20 สูตรอาหารทำขาย</h1><p>สูตรมาตรฐานต่อ 1 กล่อง พร้อมต้นทุนของคุณและเคล็ดลับทำขาย</p></div></header>` : ""}<div class="print-recipe-head"><h2>${String(r.id).padStart(2, "0")}. ${r.name}</h2><span>เวลา ${r.time} · ต้นทุนประมาณ ${fmt(recipeCost(r))} บาท/กล่อง · ราคาขาย ${fmt(state.costs[r.id]?.sale ?? r.price)} บาท</span></div><section class="print-ingredients"><h3>วัตถุดิบ (ต่อ 1 กล่อง)</h3><ul>${r.ingredients.map((item) => `<li><span class="print-check"></span><span>${item}</span></li>`).join("")}</ul></section><section class="print-method"><h3>เตรียมก่อนปรุง</h3><p>${r.prep}</p><h3>วิธีทำ</h3><ol>${r.steps.map((step) => `<li>${step}</li>`).join("")}</ol><h3>เคล็ดลับสำหรับทำขาย</h3><p>${r.detail} ${r.serving}</p></section></article>`,
    )
    .join("");
  window.print();
});
