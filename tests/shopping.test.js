const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..', 'website');
const APP_FILES = ["state", "shopping", "sheets", "recipe-list", "recipe-detail", "settings", "main"];
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

function load() {
  const dom = new JSDOM(read('index.html'), { runScripts: 'outside-only', url: 'http://localhost/' });
  dom.window.HTMLDialogElement.prototype.showModal ??= function () {};
  dom.window.eval(
    read('data.js') +
      APP_FILES.map((f) => read(`js/${f}.js`)).join('\n') +
      ';window.__t={recipes,shoppingItems,shoppingTotal,shoppingBudget,state:()=>state};'
  );
  const t = dom.window.__t;
  return { ...t, plan: (n) => (t.state().plan[t.recipes[0].id] = n) };
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
