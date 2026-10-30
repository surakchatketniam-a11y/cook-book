// In-page replacement for window.confirm(): resolves true only when the user presses the confirm button.
// Buttons are handled directly (not via the dialog's close event) so the answer never depends on event timing.
function askConfirm(message, okLabel = "ยืนยัน") {
  const box = document.querySelector("#confirm-dialog"),
    ok = document.querySelector("#confirm-ok"),
    cancel = box.querySelector("[data-cancel]");
  document.querySelector("#confirm-message").textContent = message;
  ok.textContent = okLabel;
  return new Promise((resolve) => {
    const finish = (answer) => {
      ok.removeEventListener("click", onOk);
      cancel.removeEventListener("click", onCancel);
      box.removeEventListener("cancel", onCancel);
      box.removeEventListener("close", onCancel);
      if (box.open) box.close();
      resolve(answer);
    };
    const onOk = () => finish(true),
      onCancel = () => finish(false);
    ok.addEventListener("click", onOk);
    cancel.addEventListener("click", onCancel);
    box.addEventListener("cancel", onCancel);
    box.addEventListener("close", onCancel);
    box.showModal();
  });
}
