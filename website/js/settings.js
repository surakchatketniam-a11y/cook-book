const backupKey = "thai-kitchen-last-backup",
  backupStaleDays = 14;
function refreshBackupNote() {
  const note = document.querySelector("#backup-note");
  let last = 0;
  try {
    last = Number(localStorage.getItem(backupKey)) || 0;
  } catch (e) {}
  const hasData =
    [state.plan, state.prices, state.costs, state.settings].some((o) => Object.keys(o).length) ||
    state.favorites.length;
  const days = last ? Math.floor((Date.now() - last) / 86400000) : null;
  const stale = hasData && (days === null || days >= backupStaleDays);
  note.textContent = last
    ? `สำรองข้อมูลล่าสุด: ${new Date(last).toLocaleDateString("th-TH", { dateStyle: "long" })}` +
      (stale ? ` (${days} วันที่แล้ว ควรสำรองใหม่)` : "")
    : hasData
      ? "ยังไม่เคยสำรองข้อมูล ควรกดสำรองข้อมูลไว้ เพราะข้อมูลเก็บในเบราว์เซอร์นี้เท่านั้น"
      : "ยังไม่เคยสำรองข้อมูล";
  note.classList.toggle("warn", Boolean(stale));
}
function refreshSettings() {
  refreshBackupNote();
  document.querySelectorAll("[data-setting]").forEach((input) => {
    input.value =
      state.settings[input.dataset.setting] ?? (input.dataset.setting === "target" ? 20 : 0);
  });
}
document.querySelectorAll("[data-setting]").forEach((input) =>
  input.addEventListener("change", () => {
    const key = input.dataset.setting;
    let value = Math.max(0, Number(input.value) || 0);
    if (key === "fee" || key === "target") value = Math.min(100, value);
    input.value = value;
    state.settings[key] = value;
    save();
    render();
  }),
);
document.querySelector("#export-data").addEventListener("click", () => {
  const blob = new Blob(
    [JSON.stringify({ format: "thai-kitchen-backup", version: 1, state }, null, 2)],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = "thai-kitchen-backup.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  document.querySelector("#data-status").textContent = "ดาวน์โหลดไฟล์สำรองแล้ว";
  try {
    localStorage.setItem(backupKey, String(Date.now()));
  } catch (e) {}
  refreshBackupNote();
});
function validBackup(data) {
  const obj = (x) => x && typeof x === "object" && !Array.isArray(x),
    safeKey = (k) =>
      k.length < 500 && !/[<>]/.test(k) && !["__proto__", "prototype", "constructor"].includes(k),
    num = (x) => typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= 1e9,
    map = (o, check) => obj(o) && Object.entries(o).every(([k, v]) => safeKey(k) && check(v, k));
  if (!obj(data) || data.format !== "thai-kitchen-backup" || data.version !== 1 || !obj(data.state))
    return false;
  const x = data.state;
  return (
    map(
      x.plan,
      (v, k) =>
        recipes.some((r) => String(r.id) === k) &&
        num(v) &&
        Number.isInteger(v) &&
        v >= 1 &&
        v <= 10000,
    ) &&
    map(x.prices, (v) => num(v)) &&
    map(x.checked, (v) => typeof v === "boolean") &&
    Array.isArray(x.favorites) &&
    x.favorites.every((id) => recipes.some((r) => r.id === id)) &&
    map(
      x.settings,
      (v, k) =>
        ["labor", "utilities", "packaging", "fee", "target"].includes(k) &&
        num(v) &&
        (!["fee", "target"].includes(k) || v <= 100),
    ) &&
    (x.channels === undefined ||
      (Array.isArray(x.channels) &&
        x.channels.length <= 3 &&
        Array.from(x.channels).every(
          (c) =>
            c === null ||
            (obj(c) &&
              ["fee", "vat"].every(
                (k) => c[k] === undefined || c[k] === null || (num(c[k]) && c[k] <= 100),
              ) &&
              (c.name === undefined ||
                c.name === null ||
                (typeof c.name === "string" && c.name.length <= 60))),
        ))) &&
    map(
      x.costs,
      (c, k) =>
        recipes.some((r) => String(r.id) === k) &&
        obj(c) &&
        Object.entries(c).every(([field, v]) =>
          field === "values"
            ? Array.isArray(v) && v.every(num)
            : ["other", "sale", "fee", "target", "labor", "utilities", "packaging"].includes(
                field,
              ) &&
              num(v) &&
              (!["fee", "target"].includes(field) || v <= 100),
        ),
    )
  );
}
document.querySelector("#import-data").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (file.size > 2 * 1024 * 1024) throw Error("ไฟล์มีขนาดใหญ่เกินไป");
    const data = JSON.parse(await file.text());
    if (!validBackup(data)) throw Error("รูปแบบไฟล์ไม่ถูกต้อง");
    if (!(await askConfirm("กู้คืนข้อมูลจากไฟล์นี้? ข้อมูลปัจจุบันจะถูกแทนที่", "กู้คืนข้อมูล")))
      return;
    state = data.state;
    state.channels = state.channels || [];
    state.shoppingKeysVersion = state.shoppingKeysVersion === 3 ? 3 : undefined;
    migrateShopping();
    save();
    refreshSettings();
    renderPlan();
    render();
    document.querySelector("#data-status").textContent = "กู้คืนข้อมูลแล้ว";
  } catch (error) {
    document.querySelector("#data-status").textContent =
      "กู้คืนไม่ได้: " + (error.message || "ไฟล์ไม่ถูกต้อง");
  } finally {
    e.target.value = "";
  }
});
