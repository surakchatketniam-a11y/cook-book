const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..', 'website');
const APP_FILES = ["state", "confirm", "shopping", "sheets", "recipe-list", "recipe-detail", "settings", "main"];
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

function load(saved) {
  const dom = new JSDOM(read('index.html'), { runScripts: 'outside-only', url: 'http://localhost/' });
  dom.window.HTMLDialogElement.prototype.showModal ??= function () {};
  if (saved) dom.window.localStorage.setItem("thai-kitchen-v1", JSON.stringify(saved));
  dom.window.eval(
    read('data.js') +
      APP_FILES.map((f) => read(`js/${f}.js`)).join('\n') +
      ';window.__t={recipes,shoppingItems,shoppingTotal,shoppingBudget,recipeCost,costItems,migrateCosts,validBackup,recipeAllergens,openRecipe,save,refreshBackupNote,state:()=>state,doc:document};'
  );
  const t = dom.window.__t;
  return { ...t, window: dom.window, plan: (n) => (t.state().plan[t.recipes[0].id] = n) };
}

test('empty plan gives empty shopping list and zero total', () => {
  const w = load();
  assert.strictEqual(w.shoppingItems().length, 0);
  assert.strictEqual(w.shoppingTotal(), 0);
});

test('planning a recipe produces items whose keys are unique', () => {
  const w = load();
  w.plan(1);
  const keys = w.shoppingItems().map((i) => i.key);
  assert.ok(keys.length > 0);
  assert.strictEqual(new Set(keys).size, keys.length);
});

test('doubling boxes never decreases any ingredient item count', () => {
  const w = load();
  w.plan(1);
  const one = w.shoppingItems().length;
  w.plan(2);
  assert.strictEqual(w.shoppingItems().length, one);
});

test('budget scales with box count', () => {
  const w = load();
  w.plan(1);
  const one = w.shoppingBudget();
  w.plan(2);
  assert.strictEqual(w.shoppingBudget(), one * 2);
});

test('save() shows a warning when storage is unavailable and hides it when it recovers', () => {
  const w = load();
  const warning = w.doc.querySelector('#save-warning');
  const original = w.window.Storage.prototype.setItem;
  w.window.Storage.prototype.setItem = () => {
    throw new Error('quota');
  };
  w.save();
  assert.strictEqual(warning.hidden, false);
  w.window.Storage.prototype.setItem = original;
  w.save();
  assert.strictEqual(warning.hidden, true);
});

test('backup note warns when data exists and no backup was ever made', () => {
  const w = load();
  const note = w.doc.querySelector('#backup-note');
  w.refreshBackupNote();
  assert.ok(!note.classList.contains('warn'));
  w.plan(1);
  w.refreshBackupNote();
  assert.ok(note.classList.contains('warn'));
  w.window.localStorage.setItem('thai-kitchen-last-backup', String(Date.now()));
  w.refreshBackupNote();
  assert.ok(!note.classList.contains('warn'));
  w.window.localStorage.setItem('thai-kitchen-last-backup', String(Date.now() - 20 * 86400000));
  w.refreshBackupNote();
  assert.ok(note.classList.contains('warn'));
});

test('allergen summary flags gluten, coconut and egg where the ingredients imply them', () => {
  const w = load();
  const byName = (name) => w.recipes.find((r) => r.name.includes(name));
  assert.match(w.recipeAllergens(byName('กะเพราหมูสับ')), /ไข่/);
  assert.match(w.recipeAllergens(byName('กะเพราหมูสับ')), /กลูเตน/);
  assert.match(w.recipeAllergens(byName('แกงเขียวหวาน')), /มะพร้าว/);
});

test('recipe page shows the allergen box with the disclaimer', () => {
  const w = load();
  w.openRecipe(w.recipes[0]);
  const box = w.doc.querySelector('.allergen-box');
  assert.ok(box, 'allergen box rendered');
  assert.match(box.textContent, /แจ้งลูกค้าที่แพ้อาหาร/);
});

test('price reference date is shown in the closing note', () => {
  const w = load();
  assert.match(w.doc.querySelector('#price-date').textContent, /ตุลาคม 2569/);
});

test('new categories filter recipes, open details, and add to shopping plan', () => {
  const w = load();
  for (const [category, name, id] of [['ต้ม', 'ต้มข่าไก่', 24], ['ยำ', 'ยำแตงกุ้งสด', 25], ['ขนม', 'ฟักทองแกงบวด', 26]]) {
    w.doc.querySelector(`[data-filter="${category}"]`).click();
    const cards = [...w.doc.querySelectorAll('#grid .card')];
    assert.strictEqual(cards.length, 12);
    assert.ok(cards.some(card => card.textContent.includes(name)));
    const card = w.doc.querySelector(`.card[data-id="${id}"]`);
    assert.ok(fs.existsSync(path.join(root, card.querySelector('img').getAttribute('src'))));
    assert.ok(fs.existsSync(path.join(root, `images/${id}.webp`)));
    card.querySelector('.card-main').click();
    assert.strictEqual(w.doc.querySelector('#detail-title').textContent, name);
    assert.ok(w.doc.querySelectorAll('#scaled-ingredients li').length > 0);
    card.querySelector('[data-action="plan"]').click();
    assert.strictEqual(w.state().plan[id], 1);
    assert.ok(w.shoppingItems().length > 0);
  }
});


test('legacy combined costs keep their labels, total and shopping budget after migration', () => {
  const saved = {costs: {21: {values: [40, 7], other: 3, sale: 80}, 24: {values: [20, 16, 5, 6]}}, plan: {21: 2}, favorites: [], checked: {}, prices: {}, settings: {}};
  const w = load(saved), r = w.recipes.find(x => x.id === 21), unchanged = w.recipes.find(x => x.id === 24);
  assert.strictEqual(w.state().costs[21].legacyCombined, true);
  assert.strictEqual(w.costItems(r)[0].name, 'วัตถุดิบและเครื่องปรุง (ค่าเดิม)');
  assert.strictEqual(w.recipeCost(r), 50);
  assert.strictEqual(w.shoppingBudget(), 80);
  assert.strictEqual(w.recipeCost(unchanged), 47);
  w.openRecipe(r);
  const labels = [...w.doc.querySelectorAll('.cost-input')].map(x => x.parentElement.textContent);
  assert.match(labels[0], /ค่าเดิม/);
  assert.match(labels[1], /ภาชนะ/);
  assert.strictEqual(w.doc.querySelectorAll('.cost-input')[1].value, '7');
  assert.ok(w.validBackup({format:'thai-kitchen-backup', version:1, state:w.state()}));
  w.migrateCosts(w.state());
  assert.deepStrictEqual([...w.state().costs[21].values], [40, 7]);
});

test('legacy backup migration leaves untouched recipes and new saved layouts intact', () => {
  const w = load();
  const old = {costs:{27:{values:[42,9]}, 1:{values:[11,5,5,5,4]}}, plan:{}, prices:{}, checked:{}, favorites:[], settings:{}};
  assert.ok(w.validBackup({format:'thai-kitchen-backup', version:1, state:old}));
  w.migrateCosts(old);
  assert.strictEqual(old.costs[27].legacyCombined, true);
  assert.strictEqual(old.costs[1].legacyCombined, undefined);
  const fresh = {costSchemaVersion:2,costs:{27:{values:[20,14,4]}}};
  w.migrateCosts(fresh);
  assert.strictEqual(fresh.costs[27].legacyCombined, undefined);
});
