/* Decorative helpers only — settings logic lives in options.js.
   NOTE: this must stay an external file (not inline in options.html)
   because MV3 extension pages block inline scripts via CSP. */
(function () {
  "use strict";

  var sync = function (r) {
    var min = parseFloat(r.min || "0");
    var max = parseFloat(r.max || "100");
    var v = parseFloat(r.value);
    if (!isFinite(min) || !isFinite(max) || !isFinite(v)) return;
    var raw = max > min ? (v - min) / (max - min) : 0.5;
    raw = Math.min(1, Math.max(0, raw));
    r.style.setProperty("--p", (raw * 100).toFixed(2) + "%");
  };

  var syncAll = function () {
    document.querySelectorAll('input[type="range"]').forEach(sync);
  };

  /* options.js calls this after programmatic value changes (load, theme
     switch, popup sync) so fills never lag behind the thumbs. */
  window.__mcSyncRanges = syncAll;

  var syncAir = function () {
    var en = document.getElementById("enabled");
    var tx = document.getElementById("onairText");
    var pill = document.getElementById("onair");
    if (!en || !tx || !pill) return;
    var on = !!en.checked;
    tx.textContent = on ? "ON AIR" : "PAUSED";
    pill.classList.toggle("off", !on);
  };

  /* options.js calls this after settings load / external sync changes so the
     ON AIR pill reflects the stored state, not just the last click. */
  window.__mcSyncAir = syncAir;

  document.addEventListener("input", function (e) {
    if (e.target && e.target.matches && e.target.matches('input[type="range"]')) sync(e.target);
  });
  document.addEventListener("change", function (e) {
    if (e.target && e.target.matches && e.target.matches('input[type="range"]')) sync(e.target);
    if (e.target && e.target.id === "enabled") syncAir();
  });
  /* Re-sync on layout changes: window resizes, font loads (which shift
     input width), + opening Custom <details>. Cheap, so just redo all. */
  document.addEventListener("toggle", function (e) {
    if (e.target && e.target.tagName === "DETAILS") requestAnimationFrame(syncAll);
  }, true);
  window.addEventListener("resize", syncAll);
  window.addEventListener("load", syncAll);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncAll);
  syncAll();
  syncAir();
})();
