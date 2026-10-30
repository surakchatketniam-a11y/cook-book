function ingredientParts(text) {
  const match = text.match(/^(.*?)\s+(\d+(?:\.\d+)?|[¼½¾])\s+(.+)$/);
  if (!match) return null;
  const fractions = { "¼": 0.25, "½": 0.5, "¾": 0.75 };
  return { name: match[1], amount: fractions[match[2]] || Number(match[2]), unit: match[3] };
}
const aliases = {
  ใบกะเพรา: "กะเพรา",
  ใบโหระพา: "โหระพา",
  กระเทียมสับ: "กระเทียม",
  พริกกระเทียมสับ: "พริกกระเทียม",
  น้ำมันสำหรับทอด: "น้ำมัน",
  ไข่ต้มปอกเปลือก: "ไข่",
  ไก่สับ: "ไก่รวม",
  ไก่หั่น: "ไก่รวม",
  ข้าวสวย: "ข้าวสวยรวม",
  ข้าวสวยเย็น: "ข้าวสวยรวม",
};
const vegetables = new Set([
  "กะเพรา",
  "โหระพา",
  "กระเทียม",
  "พริกกระเทียม",
  "กะหล่ำปลี",
  "ขิงซอย",
  "ขึ้นฉ่าย",
  "ข้าวโพดอ่อน",
  "คะน้า",
  "ต้นหอม",
  "ถั่วฝักยาว",
  "พริกหยวก",
  "พริกหวาน",
  "มะเขือเปราะ",
  "หอมใหญ่",
  "เห็ดหูหนู",
  "แครอต",
  "แตงกวา",
  "ใบมะกรูด",
]);
const drySpoonGrams = { น้ำตาล: 4, น้ำตาลปี๊บ: 6, พริกไทย: 2.5, ผงพะโล้: 2.5, ผงกะหรี่: 2.5 };
function category(name) {
  return /^(ไก่รวม|หมู|กุ้ง|ไข่)/.test(name)
    ? "เนื้อสัตว์และไข่"
    : vegetables.has(name)
      ? "ผักสด"
      : "เครื่องปรุงและอื่น ๆ";
}
function itemKey(name, unit) {
  const normalized = aliases[name] || name;
  if (["ช้อนชา", "ช้อนโต๊ะ"].includes(unit) && drySpoonGrams[normalized])
    return normalized + "|กรัม";
  return normalized + "|" + (["ช้อนชา", "ช้อนโต๊ะ", "มล.", "ซีซี"].includes(unit) ? "ซีซี" : unit);
}
function displayAmount(amount, unit, name = "") {
  if (unit === "ฟอง" && amount >= 30) {
    const trays = Math.floor(amount / 30),
      rem = amount % 30;
    return `${fmt(amount)} ฟอง (${fmt(trays)} แผง${rem ? ` กับ ${fmt(rem)} ฟอง` : ""})`;
  }
  if (unit === "กรัม" && amount >= 1000) return `${fmt(amount / 1000)} กก. (${fmt(amount)} กรัม)`;
  if (unit === "ซีซี" && amount >= 1000) return `${fmt(amount / 1000)} ลิตร (${fmt(amount)} ซีซี)`;
  return `${fmt(amount)} ${unit}`;
}
function shoppingItems() {
  const items = new Map();
  for (const r of recipes) {
    const qty = state.plan[r.id];
    if (!qty) continue;
    for (const text of r.ingredients) {
      const part = ingredientParts(text);
      if (!part) {
        const key = "unparsed|" + text;
        if (!items.has(key))
          items.set(key, {
            key,
            name: text,
            unit: "",
            amount: 0,
            parts: new Map(),
            unparsed: true,
          });
        items.get(key).amount += qty;
        continue;
      }
      const key = itemKey(part.name, part.unit),
        [name, unit] = key.split("|");
      if (!items.has(key)) items.set(key, { key, name, unit, amount: 0, parts: new Map() });
      const item = items.get(key),
        amount = part.amount * qty,
        dryTsp = drySpoonGrams[name];
      item.amount +=
        amount *
        (dryTsp && ["ช้อนชา", "ช้อนโต๊ะ"].includes(part.unit)
          ? dryTsp * (part.unit === "ช้อนโต๊ะ" ? 3 : 1)
          : part.unit === "ช้อนโต๊ะ"
            ? 15
            : part.unit === "ช้อนชา"
              ? 5
              : 1);
      const prep =
        aliases[part.name] ||
        ["ไก่รวม", "ข้าวสวยรวม", "ไข่", "กระเทียม", "พริกกระเทียม", "น้ำมัน"].includes(name);
      if (unit === "ซีซี" || (dryTsp && ["ช้อนชา", "ช้อนโต๊ะ"].includes(part.unit)))
        item.parts.set(part.unit, (item.parts.get(part.unit) || 0) + amount);
      else if (prep) item.parts.set(part.name, (item.parts.get(part.name) || 0) + amount);
    }
  }
  return [...items.values()].map((item) => {
    let text;
    if (item.unparsed) text = `${item.name} × ${fmt(item.amount)}`;
    else {
      const parts = [...item.parts]
        .filter(([name]) => name !== item.name || item.parts.size > 1)
        .map(([name, amount]) =>
          ["ช้อนชา", "ช้อนโต๊ะ", "มล."].includes(name)
            ? `${fmt(amount)} ${name}`
            : `${name} ${fmt(amount)} ${item.unit}`,
        );
      if (
        (item.unit === "ซีซี" || drySpoonGrams[item.name]) &&
        item.parts.size === 1 &&
        ["ช้อนชา", "ช้อนโต๊ะ", "มล."].includes([...item.parts.keys()][0])
      ) {
        const [unit, amount] = [...item.parts][0];
        text = `${item.name} ${fmt(amount)} ${unit} (ประมาณ ${displayAmount(item.amount, item.unit, item.name)})`;
      } else
        text = `${item.name} ${displayAmount(item.amount, item.unit, item.name)}${parts.length ? " (" + parts.join(" / ") + ")" : ""}`;
      if (item.name === "ข้าวสวยรวม")
        text += ` · ข้าวสารดิบประมาณ ${displayAmount(Math.ceil(item.amount / 2.5), "กรัม")}`;
    }
    return { ...item, text, category: category(item.name) };
  });
}
// Migrate the previous display-text keys without discarding older unmatched entries.
function migrateShopping() {
  if (state.shoppingKeysVersion === 3) return;
  const items = shoppingItems();
  for (const field of ["checked", "prices"]) {
    const old = state[field],
      moved = {};
    for (const [key, value] of Object.entries(old)) {
      if (key.includes("|")) {
        const [name, unit] = key.split("|");
        if (unit === "ซีซี" && drySpoonGrams[name]) {
          moved[name + "|กรัม"] = value;
          delete old[key];
        }
        continue;
      }
      const match = key.match(/^(.*?)\s+[\d,.]+\s+(กรัม|ซีซี|ช้อนชา|ช้อนโต๊ะ|มล\.|ฟอง|ใบ)/);
      if (!match) continue;
      const target = itemKey(match[1], match[2]);
      if (!items.some((item) => item.key === target)) continue;
      if (field === "prices") moved[target] = (moved[target] || 0) + (Number(value) || 0);
      else moved[target] = true;
      delete old[key];
    }
    for (const [key, value] of Object.entries(moved)) if (old[key] === undefined) old[key] = value;
  }
  state.shoppingKeysVersion = 3;
  save();
}
function shoppingText() {
  return shoppingItems()
    .map((item) => item.text)
    .join("\n");
}
function shoppingTotal() {
  return shoppingItems().reduce((sum, item) => sum + (Number(state.prices[item.key]) || 0), 0);
}
function shoppingBudget() {
  return recipes
    .filter((r) => state.plan[r.id])
    .reduce((sum, r) => {
      const c = state.costs[r.id] || {};
      return (
        sum +
        quantity(state.plan[r.id]) *
          r.cost.reduce(
            (subtotal, item, i) =>
              subtotal +
              (/กล่อง|บรรจุภัณฑ์/.test(item.name) ? 0 : Number(c.values?.[i] ?? item.value)),
            0,
          )
      );
    }, 0);
}
function shoppingComparison() {
  const items = shoppingItems(),
    entered = items.filter((item) => Object.hasOwn(state.prices, item.key)).length,
    total = shoppingTotal(),
    budget = shoppingBudget();
  return {
    entered,
    count: items.length,
    total,
    budget,
    complete: items.length > 0 && entered === items.length,
    difference: total - budget,
  };
}
function comparisonHTML() {
  const c = shoppingComparison(),
    diff = c.complete
      ? (c.difference > 0 ? "+" : "") + fmt(c.difference) + " บาท"
      : "รอกรอกราคาให้ครบ";
  return `<div class="comparison-stats"><div><span>งบวัตถุดิบตามสูตร</span><strong>${fmt(c.budget)} บาท</strong></div><div><span>ราคาซื้อที่กรอก (${c.entered}/${c.count} รายการ)</span><strong>${fmt(c.total)} บาท</strong></div><div><span>ยอดซื้อเทียบกับงบ</span><strong>${diff}</strong></div></div><p class="small">งบคำนวณจากต้นทุนวัตถุดิบและเครื่องปรุงในสูตร รวมค่าที่ปรับเอง ไม่รวมกล่อง ค่าแรง ค่าน้ำไฟ หรือค่าใช้จ่ายอื่น ราคาซื้อจริงอาจรวมของที่เหลือใช้ในรอบถัดไป จึงเทียบกันเพื่อวางแผน ไม่ใช่กำไรสุทธิ</p>`;
}
function updateComparison() {
  const el = document.querySelector("#shopping-comparison");
  if (el) el.innerHTML = comparisonHTML();
}

function renderPlan() {
  const selected = recipes.filter((r) => state.plan[r.id]);
  document.querySelector("#plan-count").textContent = selected.length;
  document.querySelector("#plan").innerHTML = selected.length
    ? selected
        .map(
          (r) =>
            `<div class="plan-row"><strong>${r.name}</strong><label>จำนวนกล่อง <input type="number" min="1" max="10000" step="1" value="${state.plan[r.id]}" data-plan-qty="${r.id}"></label><button type="button" class="remove-plan" data-remove="${r.id}">นำออก</button></div>`,
        )
        .join("")
    : '<p class="empty-plan">ยังไม่มีเมนูในรายการ กดเพิ่มลงรายการซื้อที่การ์ดเมนูหรือในหน้าสูตร <a href="#recipes">เลือกเมนูที่อยากทำ →</a></p>';
  const items = shoppingItems(),
    groups = ["เนื้อสัตว์และไข่", "ผักสด", "เครื่องปรุงและอื่น ๆ"];
  document.querySelector("#shopping-list").innerHTML = items.length
    ? "<h3>วัตถุดิบรวม</h3>" +
      groups
        .map((group) => {
          const subset = items.filter((item) => item.category === group);
          return subset.length
            ? `<section class="shopping-group"><h4>${group}</h4><ul>${subset
                .map((item) => {
                  const i = items.indexOf(item);
                  return `<li class="shopping-item"><label class="shopping-check"><input type="checkbox" data-check="${i}" ${state.checked[item.key] ? "checked" : ""}><span>${item.text}</span></label><label class="shopping-price"><input type="number" inputmode="decimal" min="0" step="0.01" data-price="${i}" value="${state.prices[item.key] ?? ""}" placeholder="ราคา" aria-label="ราคาที่จ่ายสำหรับ ${item.text} (บาท)"><span>บาท</span></label></li>`;
                })
                .join("")}</ul></section>`
            : "";
        })
        .join("") +
      '<div class="shopping-total"><span>รวมราคาที่กรอกในรอบนี้</span><strong id="shopping-total-value">' +
      fmt(shoppingTotal()) +
      ' บาท</strong></div><section class="shopping-comparison" id="shopping-comparison" aria-live="polite">' +
      comparisonHTML() +
      '</section><p class="small">ยอดรวมคิดจากทุกราคาที่กรอก ราคาและเครื่องหมายติ๊กจะคงเดิมเมื่อเปลี่ยนจำนวนกล่อง โปรดตรวจว่าครอบคลุมปริมาณใหม่หรือไม่</p>'
    : "";
  document.querySelector("#copy-list").hidden = !items.length;
  document.querySelector("#print-list").hidden = !items.length;
  const hasChecked = items.some((item) => state.checked[item.key]);
  document.querySelector("#clear-checked").hidden = !hasChecked;
  const hasShoppingData =
    items.length > 0 ||
    Object.keys(state.prices).length > 0 ||
    Object.keys(state.checked).length > 0;
  document.querySelector("#reset-shopping").hidden = !hasShoppingData;
  if (!items.length) document.querySelector("#copy-status").textContent = "";
  renderPrep(selected, items);
  renderQuote(selected);
  renderLabels(selected);
  render();
}
