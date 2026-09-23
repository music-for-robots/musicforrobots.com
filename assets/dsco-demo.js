// DSCO demo: a scripted loop built from the game's own sprites.
// Weapon on the floor -> tractor-beamed into the drone -> fires alongside the
// operative -> runs dry -> dropped through the floor. Three weapons in rotation.
(() => {
  const cv = document.getElementById("dsco-stage");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const W = cv.width, H = cv.height, FLOOR = 150;

  const load = (src) => { const i = new Image(); i.src = src; return i; };
  const D = (n) => load("assets/dsco/" + n + ".png");
  const IMG = {
    grunt: load("assets/sprites/grunt_idle_parallel.png"),
    idle: load("assets/sprites/dsco_idle.png"),
    pick: D("dsco_weapon_pickup"),
    chaff: D("chaff_run"),
    boom: D("explosion_core"),
    m90: D("muzzle_m90"),
  };

  // Placement is the game's own, at its 32 px/unit: DscoView holds the gun's
  // centre FrontOffset = 1.6 u out along the aim, and the muzzle (along, perp)
  // is GameManager.DscoMuzzleOffset x 32. flashPivot is DscoView.MuzzleAnchor
  // in cell px, measured from the TOP (Unity's is from the bottom).
  // cycN = frames in the held-gun strip (48 px cells).
  const HOLD = 51.2;
  const WEAPONS = [
    { name: "SCRAP SMG", floor: D("scrap_smg"), cyc: D("scrap_smg_cycle"), cycN: 5, cycSec: 0.08,
      flash: D("muzzle_scrap_smg"), flashPivot: [16.5, 24.5], muzzle: [73.2, 7.5],
      ammo: 28, rate: 0.085, kind: "bullet" },
    { name: "AUTO-SHOTGUN", floor: D("auto_shotgun"), cyc: D("auto_shotgun_cycle"), cycN: 7, cycSec: 0.45,
      flash: D("muzzle_auto_shotgun"), flashPivot: [2.5, 22], muzzle: [73.2, 7.5],
      ammo: 6, rate: 0.55, kind: "spread" },
    { name: "XC-7 PLASMA LANCE", floor: D("railgun"), cyc: D("railgun_cycle"), cycN: 9, cycSec: 0,
      flash: null, muzzle: [71.7, 1.5], ammo: 3, rate: 0.35, charge: 0.75, kind: "lance" },
  ];

  // along the aim, then "up" off the barrel (canvas y runs down)
  const offset = (p, a, along, perp) => ({
    x: p.x + Math.cos(a) * along + Math.sin(a) * perp,
    y: p.y + Math.sin(a) * along - Math.cos(a) * perp,
  });

  const hudName = document.getElementById("dsco-hud-name");
  const hudAmmo = document.getElementById("dsco-hud-ammo");
  const hudBar = document.getElementById("dsco-hud-bar");
  const hud = document.getElementById("dsco-hud");
  const steps = [...document.querySelectorAll("[data-dsco-step]")];

  // Grunt stands on the floor; his rifle tip measured off the idle strip's frame 0.
  const GRUNT = { x: 40, y: FLOOR - 81, tipX: 40 + 75, tipY: FLOOR - 81 + 59 };
  const FLOOR_GUN = { x: 240, y: FLOOR - 12 };

  let S;
  function reset(wi) {
    S = {
      wi, w: WEAPONS[wi], phase: "floor", t: 0, time: S ? S.time : 0,
      ammo: WEAPONS[wi].ammo, cd: 0.25, charge: 0, cycleT: 99, flashT: 99, gruntCd: 0.1, gruntFlashT: 99,
      spawnCd: 0, gun: { ...FLOOR_GUN, a: 0, alpha: 1 },
      chaffs: S ? S.chaffs : [], bullets: [], beams: [], booms: S ? S.booms : [],
    };
  }
  reset(0);

  const dscoCenter = () => ({ x: 66, y: 50 + Math.sin(S.time * 3.9) * 3 });

  function aimFrom(p) {
    let best = null;
    for (const c of S.chaffs) if (c.hp > 0 && c.x + 30 < W && (!best || c.x < best.x)) best = c;
    // nothing in view yet: cover the floor ahead
    const tx = best ? best.x + 44 : W * 0.85, ty = FLOOR - 28;
    return Math.atan2(ty - p.y, tx - p.x);
  }

  function spawnChaff(x) { S.chaffs.push({ x: x ?? W - 20, hp: 5, hit: 0, f: Math.random() * 9 }); }

  function hitTest(x, y) {
    for (const c of S.chaffs) if (c.hp > 0 && x > c.x + 26 && x < c.x + 62 && y > FLOOR - 48 && y < FLOOR) return c;
    return null;
  }

  function damage(c, n) {
    c.hp -= n; c.hit = 0.08;
    if (c.hp <= 0) S.booms.push({ x: c.x + 44, y: FLOOR - 26, t: 0 });
  }

  function fireDsco(muzzle, a) {
    const w = S.w;
    if (w.kind === "bullet") {
      const j = (Math.random() - 0.5) * 0.06;
      S.bullets.push({ x: muzzle.x, y: muzzle.y, vx: Math.cos(a + j) * 620, vy: Math.sin(a + j) * 620, c: "#ffd35a", len: 9, w: 2, dmg: 1 });
    } else if (w.kind === "spread") {
      for (let i = -2; i <= 2; i++) {
        const b = a + i * 0.11 + (Math.random() - 0.5) * 0.04;
        S.bullets.push({ x: muzzle.x, y: muzzle.y, vx: Math.cos(b) * 520, vy: Math.sin(b) * 520, c: "#ff8a4a", len: 5, w: 2, dmg: 1 });
      }
    } else {
      // hitscan: everything along the ray goes
      const dx = Math.cos(a), dy = Math.sin(a);
      const x2 = muzzle.x + dx * 600, y2 = muzzle.y + dy * 600;
      for (const c of S.chaffs) {
        if (c.hp <= 0) continue;
        const px = c.x + 44 - muzzle.x, py = FLOOR - 26 - muzzle.y;
        const along = px * dx + py * dy, off = Math.abs(px * dy - py * dx);
        if (along > 0 && off < 22) damage(c, 99);
      }
      S.beams.push({ x1: muzzle.x, y1: muzzle.y, x2, y2, t: 0 });
    }
  }

  function update(dt) {
    S.time += dt; S.t += dt;
    const p = dscoCenter();
    const hold = () => { const a = aimFrom(p); return { ...offset(p, a, HOLD, 0), a }; };

    if (S.phase === "floor") {
      S.gun.y = FLOOR_GUN.y + Math.sin(S.time * 4) * 2;
      if (S.t > 1.3) { S.phase = "beam"; S.t = 0; S.from = { ...S.gun }; }
    } else if (S.phase === "beam") {
      const k = Math.min(1, S.t / 0.5), e = 1 - Math.pow(1 - k, 3), h = hold();
      S.gun.x = S.from.x + (h.x - S.from.x) * e; S.gun.y = S.from.y + (h.y - S.from.y) * e; S.gun.a = h.a * e;
      if (k >= 1) { S.phase = "fire"; S.t = 0; spawnChaff(W - 20); spawnChaff(W + 50); S.spawnCd = 1.2; }
    } else if (S.phase === "fire") {
      const h = hold(); Object.assign(S.gun, h);
      const muzzle = offset(p, h.a, S.w.muzzle[0], S.w.muzzle[1]);
      S.spawnCd -= dt;
      if (S.spawnCd <= 0 && S.ammo > 0) { spawnChaff(); S.spawnCd = S.w.kind === "bullet" ? 0.7 : 1.3; }
      S.cd -= dt;
      if (S.ammo > 0 && S.cd <= 0) {
        if (S.w.kind === "lance") {
          S.charge += dt;
          if (S.charge >= S.w.charge) { fireDsco(muzzle, h.a); S.ammo--; S.charge = 0; S.cd = S.w.rate; S.cycleT = 0; }
        } else { fireDsco(muzzle, h.a); S.ammo--; S.cd = S.w.rate; S.cycleT = 0; S.flashT = 0; }
      }
      if (S.ammo === 0 && S.cd <= -0.5) { S.phase = "drop"; S.t = 0; S.vy = -40; }
    } else if (S.phase === "drop") {
      S.vy += 420 * dt; S.gun.y += S.vy * dt; S.gun.a += dt * 2; S.gun.alpha = Math.max(0, 1 - S.t / 0.7);
      if (S.t > 1.4 && !S.chaffs.some((c) => c.hp > 0 && c.x < W)) { reset((S.wi + 1) % WEAPONS.length); }
    }

    // the operative fires his own rifle whenever something is on screen
    S.gruntCd -= dt;
    const target = S.chaffs.some((c) => c.hp > 0 && c.x < W - 20);
    if (target && S.gruntCd <= 0) {
      S.bullets.push({ x: GRUNT.tipX + 4, y: GRUNT.tipY, vx: 700, vy: 0, c: "#7ffcf0", len: 10, w: 2, dmg: 1 });
      S.gruntCd = 0.34; S.gruntFlashT = 0;
    }

    for (const b of S.bullets) {
      b.x += b.vx * dt; b.y += b.vy * dt;
      const c = hitTest(b.x, b.y);
      if (c) { damage(c, b.dmg); b.dead = true; }
      if (b.x > W + 20 || b.y > FLOOR || b.y < -20) b.dead = true;
    }
    S.bullets = S.bullets.filter((b) => !b.dead);
    for (const c of S.chaffs) {
      c.f += dt * 12; c.hit -= dt;
      if (c.hp > 0 && c.x > 150) c.x -= 30 * dt;
    }
    S.chaffs = S.chaffs.filter((c) => c.hp > 0);
    for (const b of S.beams) b.t += dt;
    S.beams = S.beams.filter((b) => b.t < 0.35);
    for (const b of S.booms) b.t += dt;
    S.booms = S.booms.filter((b) => b.t < 0.4);
    S.cycleT += dt; S.flashT += dt; S.gruntFlashT += dt;
  }

  // ── drawing ─────────────────────────────────────────
  const frame = (im, i, cw, x, y, ch) => { if (im.complete && im.naturalWidth) ctx.drawImage(im, i * cw, 0, cw, ch ?? im.naturalHeight, x, y, cw, ch ?? im.naturalHeight); };

  function drawBg() {
    ctx.fillStyle = "#081018"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(0,229,204,.05)";
    for (let x = 0; x < W; x += 16) ctx.fillRect(x, 0, 1, FLOOR);
    for (let y = FLOOR; y > 0; y -= 16) ctx.fillRect(0, y, W, 1);
    ctx.fillStyle = "#0b1824"; ctx.fillRect(0, FLOOR, W, H - FLOOR);
    ctx.fillStyle = "rgba(0,229,204,.45)"; ctx.fillRect(0, FLOOR, W, 1);
  }

  function drawDsco() {
    const p = dscoCenter(), x = Math.round(p.x - 42), y = Math.round(p.y - 42);
    let f = null;
    if (S.phase === "beam") f = Math.min(6, Math.floor((S.t / 0.5) * 7));
    else if (S.phase === "fire") f = 6;
    else if (S.phase === "drop" && S.t < 0.3) f = 6 + Math.min(2, Math.floor((S.t / 0.3) * 3));
    if (f === null) frame(IMG.idle, Math.floor(S.time * 10) % 9, 84, x, y);
    else frame(IMG.pick, f, 84, x, y);
  }

  function drawGun() {
    const g = S.gun, w = S.w;
    ctx.save(); ctx.globalAlpha = g.alpha; ctx.translate(Math.round(g.x), Math.round(g.y)); ctx.rotate(g.a);
    if (S.phase === "fire" || S.phase === "drop") {
      let f = 0;
      if (w.kind === "lance") f = S.cycleT < 0.25 ? 8 : Math.min(7, Math.floor((S.charge / w.charge) * 8));
      else if (S.cycleT < w.cycSec) f = Math.floor((S.cycleT / w.cycSec) * w.cycN);
      frame(w.cyc, f, 48, -24, -24);
    } else if (w.floor.complete) {
      ctx.drawImage(w.floor, -Math.round(w.floor.naturalWidth / 2), -Math.round(w.floor.naturalHeight / 2));
    }
    ctx.restore();
    if (S.phase === "fire" && w.flash && S.flashT < 0.07) {
      const m = offset(dscoCenter(), g.a, w.muzzle[0], w.muzzle[1]);
      ctx.save(); ctx.translate(Math.round(m.x), Math.round(m.y)); ctx.rotate(g.a);
      frame(w.flash, Math.floor((S.flashT / 0.07) * 4), 48, -w.flashPivot[0], -w.flashPivot[1]);
      ctx.restore();
    }
  }

  function drawFloorGlow() {
    if (S.phase !== "floor") return;
    const pulse = 0.35 + 0.25 * Math.sin(S.time * 5);
    const gr = ctx.createRadialGradient(FLOOR_GUN.x, FLOOR - 2, 1, FLOOR_GUN.x, FLOOR - 2, 30);
    gr.addColorStop(0, `rgba(255,220,80,${pulse})`); gr.addColorStop(1, "rgba(255,220,80,0)");
    ctx.fillStyle = gr; ctx.fillRect(FLOOR_GUN.x - 30, FLOOR - 32, 60, 34);
  }

  function drawBeam() {
    if (S.phase !== "beam") return;
    const c = dscoCenter(), p = offset(c, aimFrom(c), HOLD, 0), g = S.gun;
    if (Math.hypot(g.x - p.x, g.y - p.y) < 2) return;
    const dx = g.x - p.x, dy = g.y - p.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    const a = 0.35 + 0.2 * Math.sin(S.time * 40);
    ctx.fillStyle = `rgba(0,229,204,${a})`;
    ctx.beginPath();
    ctx.moveTo(p.x + nx * 2, p.y + ny * 2); ctx.lineTo(g.x + nx * 10, g.y + ny * 10);
    ctx.lineTo(g.x - nx * 10, g.y - ny * 10); ctx.lineTo(p.x - nx * 2, p.y - ny * 2); ctx.fill();
    ctx.strokeStyle = "rgba(180,255,245,.9)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(g.x, g.y); ctx.stroke();
  }

  function drawChaffs() {
    for (const c of S.chaffs) {
      frame(IMG.chaff, Math.floor(c.f) % 9, 92, Math.round(c.x), FLOOR - 69);
      if (c.hit > 0) {
        ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.6;
        frame(IMG.chaff, Math.floor(c.f) % 9, 92, Math.round(c.x), FLOOR - 69); ctx.restore();
      }
    }
  }

  function drawShots() {
    for (const b of S.bullets) {
      const L = Math.hypot(b.vx, b.vy);
      ctx.strokeStyle = b.c; ctx.lineWidth = b.w;
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - (b.vx / L) * b.len, b.y - (b.vy / L) * b.len); ctx.stroke();
    }
    for (const b of S.beams) {
      const k = 1 - b.t / 0.35;
      ctx.strokeStyle = `rgba(120,200,255,${k * 0.5})`; ctx.lineWidth = 9 * k + 1;
      ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
      ctx.strokeStyle = `rgba(240,252,255,${k})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
    }
    for (const b of S.booms) {
      if (!IMG.boom.complete) continue;
      const k = b.t / 0.4, s = 40 + 40 * k;
      ctx.globalAlpha = 1 - k; ctx.drawImage(IMG.boom, b.x - s / 2, b.y - s / 2, s, s); ctx.globalAlpha = 1;
    }
  }

  function draw() {
    ctx.imageSmoothingEnabled = false;
    drawBg(); drawFloorGlow();
    frame(IMG.grunt, Math.floor(S.time * 9) % 9, 108, GRUNT.x, GRUNT.y);
    if (S.gruntFlashT < 0.08) frame(IMG.m90, Math.floor((S.gruntFlashT / 0.08) * 4), 48, GRUNT.tipX - 18, GRUNT.tipY - 24);
    drawChaffs(); drawBeam(); drawDsco(); drawGun(); drawShots();
  }

  // ── HUD ─────────────────────────────────────────────
  let lastHud = "";
  function syncHud() {
    const armed = S.phase === "fire" || (S.phase === "beam" && S.t > 0.25);
    const step = S.phase === "fire" ? 2 : S.phase === "drop" ? 3 : 1;
    const key = `${armed}|${S.ammo}|${step}|${S.wi}`;
    if (key === lastHud) return; lastHud = key;
    hud.classList.toggle("empty", !armed);
    hudName.textContent = armed ? S.w.name : "NO FIELD WEAPON";
    hudAmmo.textContent = armed ? `${S.ammo} / ${S.w.ammo}` : "--";
    hudBar.style.width = armed ? `${(S.ammo / S.w.ammo) * 100}%` : "0%";
    steps.forEach((el) => el.classList.toggle("on", +el.dataset.dscoStep === step));
  }

  // ── loop ────────────────────────────────────────────
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    for (let i = 0; i < 60 * 2.6; i++) update(1 / 60);
    const still = () => { draw(); syncHud(); };
    Promise.all(Object.values(IMG).concat(WEAPONS.flatMap((w) => [w.floor, w.cyc])).map((i) => i.decode().catch(() => {}))).then(still);
    return;
  }
  let visible = true, last = 0;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(cv);
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
    if (visible) { update(dt); draw(); syncHud(); }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
