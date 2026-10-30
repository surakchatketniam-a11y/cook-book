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
