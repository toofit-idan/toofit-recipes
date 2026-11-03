// Entry screen for trainees. The password sits in public code, so this only keeps out casual visitors - it is not real protection.
(function () {
  const PASSWORD = "toofit2026";
  const KEY = "toofit-access";
  const root = document.documentElement;

  let unlocked = false;
  try { unlocked = localStorage.getItem(KEY) === "1"; } catch (e) { /* storage blocked: ask every visit */ }
  root.classList.toggle("unlocked", unlocked);

  document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("gateForm");
    if (!form) return;
    const input = document.getElementById("gatePassword");
    const error = document.getElementById("gateError");
    if (!unlocked) setTimeout(function () { input.focus(); }, 300);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (input.value.trim().toLowerCase() === PASSWORD) {
        try { localStorage.setItem(KEY, "1"); } catch (err) { /* stays unlocked for this visit only */ }
        root.classList.add("unlocking");
        setTimeout(function () { root.classList.add("unlocked"); root.classList.remove("unlocking"); }, 450);
      } else {
        error.hidden = false;
        form.classList.remove("shake"); void form.offsetWidth; form.classList.add("shake");
        input.select();
      }
    });
    input.addEventListener("input", function () { error.hidden = true; });
  });
})();
