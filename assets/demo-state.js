// The demo's release calendar, applied to the page so nobody has to edit it on
// the day. Elements carry data-show="soon live fest after" (any subset); the
// ones that don't match the current state are removed. The HTML ships in the
// "soon" state, so a visitor without JS sees the pre-release page.
//
// Times are 10:00 Pacific (17:00 UTC), Steam's usual release hour. Preview any
// state with ?demo=soon|live|fest|after.
(() => {
  const at = (iso) => Date.parse(iso);
  const calendar = [
    ["soon", at("2026-10-02T17:00:00Z")],   // until the demo releases
    ["live", at("2026-10-19T17:00:00Z")],   // until Steam Next Fest opens
    ["fest", at("2026-10-26T17:00:00Z")],   // until Steam Next Fest closes
  ];
  const forced = new URLSearchParams(location.search).get("demo");
  const state = ["soon", "live", "fest", "after"].includes(forced)
    ? forced
    : (calendar.find(([, end]) => Date.now() < end) || ["after"])[0];

  document.documentElement.dataset.demo = state;
  // Removed rather than hidden: juice.js types section kickers out character by
  // character, and would spend time "typing" a hidden variant first.
  document.querySelectorAll("[data-show]").forEach((el) => {
    if (el.dataset.show.split(/\s+/).includes(state)) el.hidden = false;
    else el.remove();
  });
})();
