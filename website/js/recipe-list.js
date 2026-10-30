const fmt = (n) => new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(n);
function recipeCost(r) {
  const c = state.costs[r.id] || {},
    base = r.cost.reduce((sum, item, i) => sum + (c.values?.[i] ?? item.value), 0) + (c.other ?? 0);
  return (
    base +
    ["labor", "utilities", "packaging"].reduce(
      (sum, key) => sum + (c[key] ?? state.settings[key] ?? 0),
      0,
    )
  );
}
function recipeMarginPercent(r) {
  const c = state.costs[r.id] || {},
    sale = c.sale ?? r.price;
  if (!sale) return null;
  const fee = c.fee ?? state.settings.fee ?? 0,
    profit = sale - recipeCost(r) - (sale * fee) / 100;
  return (profit / sale) * 100;
}
function render() {
  const query = search.value.trim().toLowerCase();
  const found = recipes.filter(
    (r) =>
      (!favoritesOnly || state.favorites.includes(r.id)) &&
      (filter === "ทั้งหมด" ||
        (filter === "แกง"
          ? r.name.includes("แกง")
          : r.ingredients.some((x) => x.includes(filter)))) &&
      (r.name + " " + r.ingredients.join(" ")).toLowerCase().includes(query),
  );
  count.textContent = `${found.length} เมนู`;
  empty.hidden = found.length !== 0;
  grid.innerHTML = found
    .map((r) => {
      const planned = state.plan[r.id] ? quantity(state.plan[r.id]) : 0,
        marginPct = state.costs[r.id] ? recipeMarginPercent(r) : null;
      return `<article class="card" data-id="${r.id}"><button type="button" class="card-main" aria-label="ดูสูตร ${r.name}"><img src="images/${String(r.id).padStart(2, "0")}.webp" alt="ภาพประกอบ ${r.name}" loading="lazy"><div class="card-body"><div class="card-top"><span>RECIPE ${String(r.id).padStart(2, "0")}</span><span>${r.time}</span></div><h3>${r.name}</h3><div class="card-bottom"><span>${state.costs[r.id] ? "ต้นทุนของคุณ" : "ต้นทุนโดยประมาณ"} <b>${fmt(recipeCost(r))} บาท</b>${marginPct !== null ? ` <small class="card-margin">(ส่วนต่าง ${fmt(marginPct)}%)</small>` : ""}</span><span>ดูสูตร ↗</span></div></div></button><div class="card-actions"><button type="button" class="card-favorite" data-action="favorite" aria-pressed="${state.favorites.includes(r.id)}" aria-label="${state.favorites.includes(r.id) ? "นำออกจากเมนูโปรด" : "บันทึกเมนูโปรด"} ${r.name}">${state.favorites.includes(r.id) ? "★ โปรด" : "☆ โปรด"}</button>${planned ? `<div class="card-plan-stepper" role="group" aria-label="จำนวนกล่องในรายการซื้อสำหรับ ${r.name}"><button type="button" class="card-step" data-action="plan-dec" aria-label="${planned === 1 ? "นำออกจากรายการซื้อ" : "ลดจำนวนกล่อง"} ${r.name}">−</button><span class="card-plan-qty">${fmt(planned)} กล่อง</span><button type="button" class="card-step" data-action="plan-inc" aria-label="เพิ่มจำนวนกล่อง ${r.name}">+</button></div>` : `<button type="button" class="card-plan" data-action="plan" aria-label="เพิ่มลงรายการซื้อ ${r.name}">+ เพิ่มลงรายการซื้อ</button>`}</div></article>`;
    })
    .join("");
}
document.querySelector("#favorites-filter").addEventListener("click", (e) => {
  favoritesOnly = !favoritesOnly;
  e.currentTarget.setAttribute("aria-pressed", String(favoritesOnly));
  e.currentTarget.classList.toggle("active", favoritesOnly);
  render();
});
search.addEventListener("input", render);
document.querySelector("#search-link").addEventListener("click", (e) => {
  e.preventDefault();
  document.querySelector(".recipe-controls").scrollIntoView({ behavior: "smooth", block: "start" });
  search.focus({ preventScroll: true });
});
document.querySelectorAll(".filters .chip").forEach((b) =>
  b.addEventListener("click", () => {
    filter = b.dataset.filter;
    document
      .querySelectorAll(".filters .chip")
      .forEach(
        (c) => (
          c.classList.toggle("active", c === b),
          c.setAttribute("aria-pressed", String(c === b))
        ),
      );
    render();
  }),
);
