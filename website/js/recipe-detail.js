let kitchenActive = false,
  wakeLock = null,
  wakeRequest = 0;
function kitchenStatus(message) {
  const el = detail.querySelector("#kitchen-status");
  if (el && kitchenActive) el.textContent = message;
}
async function acquireWakeLock() {
  if (!kitchenActive || !dialog.open || document.visibilityState !== "visible") return;
  const token = ++wakeRequest;
  if (!navigator.wakeLock) {
    kitchenStatus("เบราว์เซอร์นี้ไม่รองรับการเปิดหน้าจอค้าง โปรดตรวจการตั้งค่าหน้าจอ");
    return;
  }
  try {
    const lock = await navigator.wakeLock.request("screen");
    if (token !== wakeRequest || !kitchenActive || !dialog.open) {
      await lock.release();
      return;
    }
    wakeLock = lock;
    kitchenStatus("โหมดเข้าครัวเปิดอยู่ · เปิดหน้าจอค้างแล้ว");
    lock.addEventListener("release", () => {
      if (wakeLock === lock) wakeLock = null;
      if (kitchenActive) kitchenStatus("การเปิดหน้าจอค้างหยุดลง อุปกรณ์อาจพักหน้าจอได้");
    });
  } catch (e) {
    if (token === wakeRequest) kitchenStatus("เปิดหน้าจอค้างไม่ได้ อุปกรณ์อาจพักหน้าจอได้");
  }
}
function stopKitchen() {
  kitchenActive = false;
  wakeRequest++;
  dialog.classList.remove("kitchen-mode");
  const btn = detail.querySelector("#kitchen-toggle"),
    status = detail.querySelector("#kitchen-status");
  if (btn) {
    btn.setAttribute("aria-pressed", "false");
    btn.textContent = "เริ่มโหมดเข้าครัว";
  }
  if (status) status.hidden = true;
  if (wakeLock) {
    const lock = wakeLock;
    wakeLock = null;
    lock.release().catch(() => {});
  }
}
document.addEventListener("visibilitychange", () => {
  if (kitchenActive && document.visibilityState === "visible" && !wakeLock) acquireWakeLock();
});
grid.addEventListener("click", (event) => {
  const card = event.target.closest(".card");
  if (!card) return;
  const id = Number(card.dataset.id),
    action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "favorite") {
    const index = state.favorites.indexOf(id);
    if (index < 0) state.favorites.push(id);
    else state.favorites.splice(index, 1);
    save();
    render();
    const next = grid.querySelector(`.card[data-id="${id}"] [data-action="favorite"]`);
    (next || document.querySelector("#favorites-filter")).focus();
    return;
  }
  if (action === "plan") {
    state.plan[id] = 1;
    save();
    renderPlan();
    grid.querySelector(`.card[data-id="${id}"] [data-action="plan-inc"]`)?.focus();
    return;
  }
  if (action === "plan-inc") {
    state.plan[id] = quantity((state.plan[id] || 1) + 1);
    save();
    renderPlan();
    grid.querySelector(`.card[data-id="${id}"] [data-action="plan-inc"]`)?.focus();
    return;
  }
  if (action === "plan-dec") {
    const current = quantity(state.plan[id] || 1);
    if (current <= 1) delete state.plan[id];
    else state.plan[id] = current - 1;
    save();
    renderPlan();
    const target = grid.querySelector(
      `.card[data-id="${id}"] [data-action="${current <= 1 ? "plan" : "plan-dec"}"]`,
    );
    target?.focus();
    return;
  }
  if (event.target.closest(".card-main")) {
    lastFocus = id;
    openRecipe(recipes.find((r) => r.id === id));
  }
});
function openRecipe(r, sharedQuantity = null) {
  detail.innerHTML = `<div class="detail-toolbar"><span>${r.name}</span><button class="close" aria-label="ปิดหน้าสูตร">×</button></div><div class="detail-header"><img src="images/${String(r.id).padStart(2, "0")}.webp" alt="ภาพประกอบ ${r.name}"></div><div class="detail-content"><div class="detail-meta">สูตร ${String(r.id).padStart(2, "0")} / 1 กล่อง / ${r.time}</div><h2 id="detail-title">${r.name}</h2><div class="recipe-actions"><button type="button" class="action" id="favorite" aria-pressed="${state.favorites.includes(r.id)}">${state.favorites.includes(r.id) ? "★ เมนูโปรด" : "☆ บันทึกเมนูโปรด"}</button><button type="button" class="action" id="share-recipe">คัดลอกลิงก์สูตร</button><button type="button" class="action" id="print-recipe">พิมพ์สูตร</button><button type="button" class="action" id="print-single-label">พิมพ์ป้ายติดกล่อง</button><button type="button" class="action kitchen-toggle" id="kitchen-toggle" aria-pressed="false">เริ่มโหมดเข้าครัว</button><span id="recipe-status" role="status"></span></div><p id="kitchen-status" class="kitchen-status" role="status" aria-live="polite" hidden></p><div class="detail-view-switch" role="group" aria-label="เลือกส่วนของสูตร"><button type="button" id="view-recipe" aria-pressed="true" aria-controls="recipe-panel">วิธีทำและวัตถุดิบ</button><button type="button" id="view-calculator" aria-pressed="false" aria-controls="calculator-panel">คำนวณต้นทุน</button></div><div id="recipe-panel"><div class="detail-columns"><div><h3>วัตถุดิบ</h3><label class="quantity-label">จำนวนกล่อง <input id="quantity" type="number" min="1" max="10000" step="1" value="${sharedQuantity ?? state.plan[r.id] ?? 1}"></label><div class="batch-summary"><div><strong id="batch-total"></strong><span>ต้นทุนรวมตามจำนวนกล่อง</span></div><div><strong id="batch-margin"></strong><span>ส่วนต่างรวมตามจำนวนกล่อง</span></div></div><p id="batch-warning" class="batch-warning" role="status" hidden>การปรุงครั้งละมาก (ตั้งแต่ 10 กล่องขึ้นไป) ควรลดสัดส่วนน้ำมันและน้ำลงประมาณ 15–20% จากการคูณปกติ และชิมรสก่อนตักเสิร์ฟ</p><ul class="ingredients" id="scaled-ingredients"></ul><button type="button" class="action" id="add-plan">เพิ่มลงรายการซื้อ</button><span id="plan-status" role="status"></span><button type="button" class="view-plan" id="view-plan" hidden>ดูรายการซื้อ →</button><div class="nutrition"><b>คุณค่าโภชนาการโดยประมาณ</b><p><strong>${r.kcal}</strong> กิโลแคลอรี / โปรตีน <strong>${r.protein}</strong> กรัม</p><div class="small">ต่อ 1 กล่อง ตัวเลขเป็นเพียงการประมาณเบื้องต้น ยังไม่ผ่านการวิเคราะห์ และเปลี่ยนตามวัตถุดิบและวิธีปรุง</div></div></div><div><h3>เตรียมก่อนปรุง</h3><p>${r.prep}</p><h3>วิธีทำ</h3><ol class="steps">${r.steps.map((x, i) => `<li><label><input class="step-check" type="checkbox" aria-label="ทำขั้นตอนที่ ${i + 1} เสร็จแล้ว"><span>${x}</span></label></li>`).join("")}</ol><h3>เคล็ดลับสำหรับทำขาย</h3><p>${r.detail} ${r.serving}</p><p class="small">ปรุงเนื้อสัตว์และไข่ให้สุกทั่ว แยกอุปกรณ์ดิบและสุก เก็บอาหารในอุณหภูมิที่เหมาะสม และตรวจสารก่อภูมิแพ้จากวัตถุดิบจริง</p></div></div></div><section class="calculator" id="calculator-panel" hidden><h3>คำนวณต้นทุนของคุณ</h3><label class="quantity-label">จำนวนกล่อง <input id="calc-quantity" type="number" min="1" max="10000" step="1" value="${sharedQuantity ?? state.plan[r.id] ?? 1}"></label><div class="batch-summary"><div><strong id="calc-batch-total"></strong><span>ต้นทุนรวมตามจำนวนกล่อง</span></div><div><strong id="calc-batch-margin"></strong><span>ส่วนต่างรวมตามจำนวนกล่อง</span></div></div><p>แก้ตัวเลขต่อกล่องตามราคาจริง รวมค่าใช้จ่ายอื่นเพิ่มเติมเพื่อดูส่วนต่าง</p><div class="calc-grid">${r.cost.map((c, i) => `<label>${c.name} (บาท)<input class="cost-input" type="number" min="0" step="0.1" value="${state.costs[r.id]?.values?.[i] ?? c.value}"></label>`).join("")}<label>ค่าใช้จ่ายอื่นต่อกล่อง (บาท)<input class="cost-input" type="number" min="0" step="0.1" value="${state.costs[r.id]?.other ?? 0}"></label><label>ค่าแรงต่อกล่อง (บาท)<input class="extra-cost" data-key="labor" type="number" min="0" step="0.1" value="${state.costs[r.id]?.labor ?? state.settings.labor ?? 0}"></label><label>ค่าน้ำไฟต่อกล่อง (บาท)<input class="extra-cost" data-key="utilities" type="number" min="0" step="0.1" value="${state.costs[r.id]?.utilities ?? state.settings.utilities ?? 0}"></label><label>ค่าช้อนส้อม / ถุง / เครื่องเคียงเพิ่มต่อกล่อง (บาท)<input class="extra-cost" data-key="packaging" type="number" min="0" step="0.1" value="${state.costs[r.id]?.packaging ?? state.settings.packaging ?? 0}"></label><label>ค่าธรรมเนียมจากยอดขาย (%)<input id="fee" type="number" min="0" max="100" step="0.1" value="${state.costs[r.id]?.fee ?? state.settings.fee ?? 0}"></label><label>ส่วนต่างเป้าหมายจากยอดขาย (%)<input id="target-margin" type="number" min="0" max="99.9" step="0.1" value="${state.costs[r.id]?.target ?? state.settings.target ?? 20}"></label><label>ราคาขายต่อกล่อง (บาท)<input id="sale" type="number" min="0" step="0.1" value="${state.costs[r.id]?.sale ?? r.price}"></label></div><button type="button" class="calculator-link" id="use-shop-defaults">ใช้ค่าเริ่มต้นของร้านสำหรับเมนูนี้</button><button type="button" class="calculator-link reset-calculator" id="reset-calculator">รีเซ็ตต้นทุนเมนูนี้</button><span id="reset-status" class="small" role="status"></span><p class="small">ค่ากล่องหลักรวมอยู่ในต้นทุนด้านบนแล้ว ช่องช้อนส้อม/ถุงใช้สำหรับกรอกเฉพาะสิ่งที่เพิ่มเข้ามา เพื่อไม่ให้นับค่ากล่องซ้ำ</p><div class="results"><div><strong id="total"></strong><span>ต้นทุนรวมต่อกล่อง</span></div><div><strong id="margin"></strong><span>ส่วนต่างต่อกล่องหลังค่าธรรมเนียม</span></div><div><strong id="margin-percent"></strong><span>ส่วนต่างต่อยอดขาย</span></div><div><strong id="suggested"></strong><span>ราคาแนะนำตามเป้าหมาย</span></div></div><p class="warning">ราคาแนะนำคำนวณจากต้นทุนต่อกล่อง ส่วนต่างเป้าหมาย และค่าธรรมเนียมเป็นเปอร์เซ็นต์ของยอดขาย ส่วนต่างจะเป็นกำไรสุทธิได้เมื่อรวมค่าใช้จ่ายทั้งหมดแล้ว</p><section class="channel-comparison"><h3>เปรียบเทียบราคาตามช่องทาง</h3><p>เทียบกับราคาขายและค่าธรรมเนียมปัจจุบันด้านบน เพื่อให้ได้เงินหลังหักค่าธรรมเนียมเท่ากันต่อกล่อง โดยสมมติว่าต้นทุนเท่ากันทุกช่องทาง</p><div class="channel-grid">${[0, 1, 2].map((i) => `<div class="channel-card"><h4>ช่องทาง ${i + 1}</h4><label>ชื่อช่องทาง (ถ้ามี)<input class="channel-field" data-channel="${i}" data-channel-key="name" type="text" maxlength="60" value="${escapeHTML(state.channels?.[i]?.name ?? "")}" placeholder="${["เช่น หน้าร้าน", "เช่น GrabFood", "เช่น LINE MAN"][i]}"></label><label>ค่าธรรมเนียมจากยอดขาย (%)<input class="channel-field" data-channel="${i}" data-channel-key="fee" type="number" min="0" max="100" step="0.1" value="${state.channels?.[i]?.fee ?? ""}" placeholder="ระบุค่าธรรมเนียม"></label><label>VAT ของค่าธรรมเนียม (%)<input class="channel-field" data-channel="${i}" data-channel-key="vat" type="number" min="0" max="100" step="0.1" value="${state.channels?.[i]?.vat ?? 0}"></label><div class="channel-result"><span>ราคาเพื่อรักษาส่วนต่าง</span><strong id="channel-price-${i}">—</strong><small id="channel-note-${i}"></small></div></div>`).join("")}</div><p class="small">VAT คิดเฉพาะจากค่าธรรมเนียม ไม่ใช่จากยอดขาย กรอกตามเงื่อนไขจริงของแต่ละช่องทาง ราคาเป็นการประมาณและไม่รวมค่าใช้จ่ายที่ต่างกันระหว่างช่องทาง</p></section></section></div>`;
  const qtyInput = detail.querySelector("#quantity"),
    calcQtyInput = detail.querySelector("#calc-quantity");
  detail.querySelector("#kitchen-toggle").addEventListener("click", () => {
    if (kitchenActive) {
      stopKitchen();
    } else {
      kitchenActive = true;
      const btn = detail.querySelector("#kitchen-toggle");
      btn.setAttribute("aria-pressed", "true");
      btn.textContent = "ออกจากโหมดเข้าครัว";
      dialog.classList.add("kitchen-mode");
      detail.querySelector("#kitchen-status").hidden = false;
      acquireWakeLock();
    }
  });
  detail.querySelector("#favorite").addEventListener("click", (e) => {
    const index = state.favorites.indexOf(r.id);
    if (index < 0) state.favorites.push(r.id);
    else state.favorites.splice(index, 1);
    save();
    const selected = state.favorites.includes(r.id);
    e.currentTarget.setAttribute("aria-pressed", String(selected));
    e.currentTarget.textContent = selected ? "★ เมนูโปรด" : "☆ บันทึกเมนูโปรด";
    render();
  });
  detail.querySelector("#share-recipe").addEventListener("click", async () => {
    const url = new URL(location.href);
    url.searchParams.set("recipe", r.id);
    url.searchParams.set("qty", quantity(qtyInput.value));
    url.hash = "";
    try {
      await navigator.clipboard.writeText(url.href);
      detail.querySelector("#recipe-status").textContent =
        "คัดลอกลิงก์พร้อมจำนวนกล่องแล้ว (ไม่รวมต้นทุน)";
    } catch (e) {
      detail.querySelector("#recipe-status").textContent = "คัดลอกไม่สำเร็จ";
    }
  });
  detail.querySelector("#print-recipe").addEventListener("click", () => {
    const qty = quantity(qtyInput.value);
    const ingredients = r.ingredients.map((item) => {
      const part = ingredientParts(item);
      return part ? `${part.name} ${fmt(part.amount * qty)} ${part.unit}` : `${item} × ${qty}`;
    });
    document.querySelector("#print-sheet").innerHTML =
      `<header class="print-header"><div><p class="print-brand">ครัวอาหารไทย · สูตรทำขาย</p><h1>${r.name}</h1><p>${fmt(qty)} กล่อง · ${r.time} ต่อสูตร</p></div></header><section class="print-ingredients"><h2>วัตถุดิบ</h2><ul>${ingredients.map((item) => `<li><span class="print-check"></span><span>${item}</span></li>`).join("")}</ul></section><section class="print-method"><h2>เตรียมก่อนปรุง</h2><p>${r.prep}</p><h2>วิธีทำ</h2><ol>${r.steps.map((step) => `<li>${step}</li>`).join("")}</ol><h2>เคล็ดลับ</h2><p>${r.detail} ${r.serving}</p><p class="print-note">ขั้นตอนและเวลาเป็นแนวทางสำหรับสูตรหนึ่งกล่อง ควรปรับวิธีปรุงให้เหมาะกับปริมาณที่ทำจริง</p></section>`;
    dialog.close();
    window.print();
  });
  detail.querySelector("#print-single-label").addEventListener("click", () => {
    const qty = Math.min(200, quantity(qtyInput.value));
    const card = `<div class="print-sticker"><div class="print-sticker-brand">${escapeHTML(labelShop.trim() || "ครัวอาหารไทย · ทำสดใหม่")}</div><strong>${r.name}</strong><div class="print-sticker-meta">พลังงาน ~${r.kcal} kcal · โปรตีน ${r.protein} g</div><div class="print-sticker-allergen">ผู้แพ้อาหาร: มี ${recipeAllergens(r)}</div><div class="print-sticker-date">${escapeHTML(labelDate.trim() || "ควรรับประทานทันที หรือเก็บในตู้เย็นและอุ่นให้ร้อนจัด")}</div></div>`;
    document.querySelector("#print-sheet").innerHTML =
      `<div class="print-sticker-grid">${Array.from({ length: qty }, () => card).join("")}</div>`;
    dialog.close();
    window.print();
  });
  const scale = () => {
    const qty = quantity(qtyInput.value);
    detail.querySelector("#batch-warning").hidden = qty < 10;
    detail.querySelector("#scaled-ingredients").innerHTML = r.ingredients
      .map((item) => {
        const part = ingredientParts(item);
        if (!part) return `<li>${item} × ${qty}</li>`;
        const key = itemKey(part.name, part.unit),
          [name, unit] = key.split("|"),
          dryTsp = drySpoonGrams[name],
          total = part.amount * qty,
          converted =
            total *
            (dryTsp && ["ช้อนชา", "ช้อนโต๊ะ"].includes(part.unit)
              ? dryTsp * (part.unit === "ช้อนโต๊ะ" ? 3 : 1)
              : part.unit === "ช้อนโต๊ะ"
                ? 15
                : part.unit === "ช้อนชา"
                  ? 5
                  : 1);
        const extra = ["ช้อนชา", "ช้อนโต๊ะ"].includes(part.unit)
          ? ` (${dryTsp ? "ประมาณ " : ""}${displayAmount(converted, unit, name)})`
          : "";
        return `<li>${part.name} ${displayAmount(total, part.unit, name)}${extra}</li>`;
      })
      .join("");
  };
  detail.querySelector("#add-plan").addEventListener("click", () => {
    const q = quantity(qtyInput.value);
    qtyInput.value = q;
    calcQtyInput.value = q;
    state.plan[r.id] = q;
    save();
    renderPlan();
    detail.querySelector("#plan-status").textContent = " เพิ่มแล้ว";
    detail.querySelector("#view-plan").hidden = false;
  });
  function switchRecipeView(view) {
    const isRecipe = view === "recipe";
    detail.querySelector("#recipe-panel").hidden = !isRecipe;
    detail.querySelector("#calculator-panel").hidden = isRecipe;
    detail.querySelector("#view-recipe").setAttribute("aria-pressed", String(isRecipe));
    detail.querySelector("#view-calculator").setAttribute("aria-pressed", String(!isRecipe));
    detail
      .querySelector(".detail-view-switch")
      .scrollIntoView({ behavior: "smooth", block: "start" });
  }
  detail.querySelector("#view-recipe").addEventListener("click", () => switchRecipeView("recipe"));
  detail
    .querySelector("#view-calculator")
    .addEventListener("click", () => switchRecipeView("calculator"));
  detail.querySelector("#view-plan").addEventListener("click", () => {
    lastFocus = null;
    dialog.close();
    document.querySelector("#shopping").scrollIntoView({ behavior: "smooth" });
  });
  detail.querySelector(".close").addEventListener("click", () => dialog.close());
  const updateChannels = (sale, fee) => {
    for (let i = 0; i < 3; i++) {
      const feeInput = detail.querySelector(`[data-channel="${i}"][data-channel-key="fee"]`),
        vatInput = detail.querySelector(`[data-channel="${i}"][data-channel-key="vat"]`),
        out = detail.querySelector(`#channel-price-${i}`),
        note = detail.querySelector(`#channel-note-${i}`),
        rate = Number(feeInput.value),
        vat = Number(vatInput.value);
      if (
        feeInput.value.trim() === "" ||
        !Number.isFinite(rate) ||
        rate < 0 ||
        rate > 100 ||
        vatInput.value.trim() === "" ||
        !Number.isFinite(vat) ||
        vat < 0 ||
        vat > 100
      ) {
        out.textContent = "—";
        note.textContent = "กรอกอัตรา 0–100% ให้ครบ";
        continue;
      }
      const effective = (rate / 100) * (1 + vat / 100);
      if (effective >= 1) {
        out.textContent = "กำหนดไม่ได้";
        note.textContent = "ค่าธรรมเนียมรวม VAT ต้องต่ำกว่า 100%";
        continue;
      }
      const price = (sale * (1 - fee / 100)) / (1 - effective);
      out.textContent = fmt(Math.ceil((price - 1e-9) * 100) / 100) + " บาท";
      note.textContent = `หักรวม ${fmt(effective * 100)}% ของยอดขาย`;
    }
  };
  const update = () => {
    const base = [...detail.querySelectorAll(".cost-input")].reduce(
        (a, x) => a + Math.max(0, Number(x.value) || 0),
        0,
      ),
      extras = [...detail.querySelectorAll(".extra-cost")],
      total = base + extras.reduce((a, x) => a + Math.max(0, Number(x.value) || 0), 0),
      sale = Math.max(0, Number(detail.querySelector("#sale").value) || 0),
      fee = Math.min(100, Math.max(0, Number(detail.querySelector("#fee").value) || 0)),
      target = Math.min(
        100,
        Math.max(0, Number(detail.querySelector("#target-margin").value) || 0),
      ),
      profit = sale - total - (sale * fee) / 100;
    detail.querySelector("#total").textContent = fmt(total) + " บาท";
    detail.querySelector("#margin").textContent = fmt(profit) + " บาท";
    const qty = quantity(qtyInput.value);
    detail.querySelector("#batch-total").textContent = fmt(total * qty) + " บาท";
    detail.querySelector("#batch-margin").textContent = fmt(profit * qty) + " บาท";
    detail.querySelector("#calc-batch-total").textContent = fmt(total * qty) + " บาท";
    detail.querySelector("#calc-batch-margin").textContent = fmt(profit * qty) + " บาท";
    detail.querySelector("#margin-percent").textContent = sale
      ? fmt((profit / sale) * 100) + "%"
      : "—";
    const remaining = 100 - fee - target;
    detail.querySelector("#suggested").textContent =
      remaining > 0
        ? fmt(Math.ceil(((total * 100) / remaining) * 100) / 100) + " บาท"
        : "กำหนดไม่ได้";
    updateChannels(sale, fee);
    scale();
  };
  detail.querySelectorAll("input").forEach((x) =>
    x.addEventListener("input", () => {
      if (x.classList.contains("channel-field")) {
        const index = Number(x.dataset.channel),
          key = x.dataset.channelKey;
        state.channels = state.channels || [];
        state.channels[index] = state.channels[index] || { name: "", fee: null, vat: 0 };
        if (key === "name") {
          state.channels[index].name = x.value.slice(0, 60);
          save();
          return;
        }
        const val = x.value.trim() === "" ? null : Number(x.value);
        state.channels[index][key] =
          Number.isFinite(val) && val !== null && val >= 0 && val <= 100 ? val : null;
        save();
        update();
        return;
      }
      if (x === qtyInput || x === calcQtyInput) {
        const other = x === qtyInput ? calcQtyInput : qtyInput;
        other.value = x.value;
        update();
        return;
      }
      if (x.classList.contains("step-check")) return;
      const saved = state.costs[r.id] || {};
      if (x.classList.contains("cost-input")) {
        const inputs = [...detail.querySelectorAll(".cost-input")];
        saved.values = inputs.slice(0, -1).map((y) => Math.max(0, Number(y.value) || 0));
        saved.other = Math.max(0, Number(inputs.at(-1).value) || 0);
      } else if (x.classList.contains("extra-cost"))
        saved[x.dataset.key] = Math.max(0, Number(x.value) || 0);
      else if (x.id === "sale") saved.sale = Math.max(0, Number(x.value) || 0);
      else if (x.id === "fee" || x.id === "target-margin")
        saved[x.id === "fee" ? "fee" : "target"] = Math.min(100, Math.max(0, Number(x.value) || 0));
      state.costs[r.id] = saved;
      save();
      update();
    }),
  );
  detail.querySelector("#use-shop-defaults").addEventListener("click", () => {
    const saved = state.costs[r.id] || {};
    for (const key of ["labor", "utilities", "packaging", "fee", "target"]) delete saved[key];
    state.costs[r.id] = saved;
    save();
    detail
      .querySelectorAll(".extra-cost")
      .forEach((x) => (x.value = state.settings[x.dataset.key] ?? 0));
    detail.querySelector("#fee").value = state.settings.fee ?? 0;
    detail.querySelector("#target-margin").value = state.settings.target ?? 20;
    update();
  });
  detail.querySelector("#reset-calculator").addEventListener("click", () => {
    if (
      !confirm(
        "รีเซ็ตต้นทุนและราคาขายของเมนูนี้? ค่าที่ปรับไว้สำหรับเมนูนี้จะถูกลบ และจะใช้ค่าเริ่มต้นของร้าน",
      )
    )
      return;
    delete state.costs[r.id];
    const inputs = [...detail.querySelectorAll(".cost-input")];
    r.cost.forEach((cost, i) => (inputs[i].value = cost.value));
    inputs[inputs.length - 1].value = 0;
    detail
      .querySelectorAll(".extra-cost")
      .forEach((input) => (input.value = state.settings[input.dataset.key] ?? 0));
    detail.querySelector("#fee").value = state.settings.fee ?? 0;
    detail.querySelector("#target-margin").value = state.settings.target ?? 20;
    detail.querySelector("#sale").value = r.price;
    save();
    update();
    render();
    renderPlan();
    detail.querySelector("#reset-status").textContent = " รีเซ็ตต้นทุนแล้ว";
  });
  update();
  dialog.showModal();
}
