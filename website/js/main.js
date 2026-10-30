refreshSettings();
document.querySelector("#price-date").textContent = `(ราคาอ้างอิงเมื่อ${PRICE_DATA_DATE}) `;
migrateShopping();
renderPlan();
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) dialog.close();
});
dialog.addEventListener("close", () => {
  stopKitchen();
  render();
  if (lastFocus) grid.querySelector(`.card[data-id="${lastFocus}"] .card-main`)?.focus();
});
render();

const sharedParams = new URL(location.href).searchParams,
  sharedId = Number(sharedParams.get("recipe")),
  sharedRecipe = recipes.find((r) => r.id === sharedId),
  rawSharedQty = sharedParams.get("qty");
const sharedQuantity =
  rawSharedQty &&
  /^\d+$/.test(rawSharedQty) &&
  Number(rawSharedQty) >= 1 &&
  Number(rawSharedQty) <= 10000
    ? Number(rawSharedQty)
    : null;
if (sharedRecipe) openRecipe(sharedRecipe, sharedQuantity);
