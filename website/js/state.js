const grid = document.querySelector("#grid"),
  search = document.querySelector("#search"),
  count = document.querySelector("#count"),
  empty = document.querySelector("#empty"),
  dialog = document.querySelector("#dialog"),
  detail = document.querySelector("#detail");
let filter = "ทั้งหมด",
  lastFocus = null,
  favoritesOnly = false;
let quotePrices = {},
  quoteCustomer = "",
  quoteNote = "",
  labelShop = "",
  labelDate = "",
  labelPrintPerBox = false;
const storageKey = "thai-kitchen-v1";
let state = {
  costs: {},
  plan: {},
  favorites: [],
  checked: {},
  prices: {},
  settings: {},
  channels: [],
};
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (saved && typeof saved === "object")
    state = {
      costs: saved.costs || {},
      plan: saved.plan || {},
      favorites: Array.isArray(saved.favorites) ? saved.favorites : [],
      checked: saved.checked || {},
      prices: saved.prices || {},
      settings: saved.settings || {},
      channels: Array.isArray(saved.channels) ? saved.channels : [],
      shoppingKeysVersion: saved.shoppingKeysVersion,
      costSchemaVersion: saved.costSchemaVersion,
    };
} catch (e) {}
function save() {
  const warning = document.querySelector("#save-warning");
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
    warning.hidden = true;
  } catch (e) {
    warning.hidden = false;
  }
  if (typeof refreshBackupNote === "function") refreshBackupNote();
}
const quantity = (n) => Math.max(1, Math.min(10000, Math.floor(Number(n) || 1)));

// Legacy recipes stored one combined ingredient amount followed by packaging.
function migrateCosts(target) {
  if (target.costSchemaVersion === 2) return;
  for (const [id, cost] of Object.entries(target.costs || {})) {
    const n = Number(id);
    if ((n >= 21 && n <= 23 || n >= 27 && n <= 56) && cost && Array.isArray(cost.values))
      cost.legacyCombined = true;
  }
  target.costSchemaVersion = 2;
}
function costItems(r) {
  if (!state.costs[r.id]?.legacyCombined) return r.cost;
  const packaging = r.cost.find((item) => item.name === "ภาชนะ");
  return [
    { name: "วัตถุดิบและเครื่องปรุง (ค่าเดิม)", value: r.cost.filter((item) => item !== packaging).reduce((sum, item) => sum + item.value, 0) },
    { name: "ภาชนะ", value: packaging?.value ?? 0 },
  ];
}
migrateCosts(state);
