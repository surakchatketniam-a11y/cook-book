// Run at deploy time (vercel.json buildCommand): rewrites the cache name in website/sw.js
// to a hash of every other site file, so any change invalidates the offline cache automatically.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.join(__dirname, '..', 'website');
const swPath = path.join(root, 'sw.js');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const hash = crypto.createHash('sha256');
for (const file of walk(root).sort()) {
  if (file === swPath) continue;
  hash.update(path.relative(root, file)).update(fs.readFileSync(file));
}
const version = hash.digest('hex').slice(0, 8);
const sw = fs.readFileSync(swPath, 'utf8');
const next = sw.replace(/thai-kitchen-pwa-[A-Za-z0-9]+/, `thai-kitchen-pwa-${version}`);
if (next === sw && !sw.includes(`thai-kitchen-pwa-${version}`)) throw new Error('cache name not found in sw.js');
fs.writeFileSync(swPath, next);
console.log(`sw.js cache name -> thai-kitchen-pwa-${version}`);
