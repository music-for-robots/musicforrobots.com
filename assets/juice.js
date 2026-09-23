// Scroll-triggered presentation: section headers boot in, the WARDEN terminal
// types itself, the field-manual numbers count up. Each plays once per visit.
// Everything here is motion, so reduced-motion visitors get the finished page
// (the <head> script only adds the "js" class when motion is allowed, and the
// hidden starting states in CSS all hang off that class).
(() => {
  if (!document.documentElement.classList.contains("js")) return;

  const once = (els, fn, threshold = 0.35) => {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { io.unobserve(e.target); fn(e.target); }
    }, { threshold });
    els.forEach((el) => io.observe(el));
  };

  // Types the text nodes under `root` back in, in document order, leaving the
  // element structure (coloured spans, the cursor) in place.
  function teleprint(root, cps, lineHold = 0) {
    const nodes = [];
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) nodes.push(walk.currentNode);
    const full = nodes.map((n) => n.textContent);
    nodes.forEach((n) => { n.textContent = ""; });
    return () => {
      let ni = 0, ci = 0, carry = 0, last = performance.now(), hold = 0;
      const tick = (now) => {
        const dt = (now - last) / 1000; last = now;
        if (hold > 0) { hold -= dt; requestAnimationFrame(tick); return; }
        carry += dt * cps;
        while (carry >= 1 && ni < nodes.length) {
          carry -= 1;
          const ch = full[ni][ci++];
          nodes[ni].textContent += ch;
          if (ci >= full[ni].length) { ni++; ci = 0; }
          if (ch === "\n" && lineHold) { hold = lineHold; carry = 0; break; }
        }
        if (ni < nodes.length) requestAnimationFrame(tick);
        else root.classList.add("printed");
      };
      requestAnimationFrame(tick);
    };
  }

  // 4. section headers: kicker types, heading wipes in behind it
  document.querySelectorAll("main section").forEach((sec) => {
    const kicker = sec.querySelector(".kicker");
    const h2 = sec.querySelector("h2");
    if (!kicker || !h2) return;
    const print = teleprint(kicker, 45);
    // Watch the kicker line, not the section (a tall section on a phone would
    // leave its title blank until it was halfway up the screen) and not the
    // heading (its hidden state is a zero-height clip-path, and Chrome's
    // IntersectionObserver honours clip-path, so it would never fire).
    once([kicker], () => {
      print();
      setTimeout(() => h2.classList.add("booted"), 180);
    }, 1);
  });

  // 3. the terminal readout types itself, one line at a time
  const pre = document.querySelector(".terminal pre");
  if (pre) {
    pre.style.minHeight = pre.offsetHeight + "px";   // no layout jump while it fills
    const print = teleprint(pre, 90, 0.12);
    once([pre], print, 0.5);
  }

  // 5. field-manual numbers roll up from zero ("2–4" rolls both ends)
  const nums = [...document.querySelectorAll(".feat .num")];
  nums.forEach((el) => { el.dataset.final = el.textContent; el.textContent = el.textContent.replace(/\d+/g, "0"); });
  once(nums, (el) => {
    const parts = el.dataset.final.split(/(\d+)/);
    const t0 = performance.now(), dur = 900;
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = parts.map((p) => (/^\d+$/.test(p) ? Math.round(+p * e) : p)).join("");
      if (k < 1) requestAnimationFrame(tick); else el.classList.add("landed");
    };
    requestAnimationFrame(tick);
  }, 0.6);
})();
