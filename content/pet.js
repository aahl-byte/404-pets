// 404 Pets — a tiny pixel cat that lives on every page.
// It walks along the bottom of the window, chases your cursor, naps,
// bats a ball of yarn around, and hops up onto page elements to paw at them.

(() => {
  'use strict';

  if (window !== window.top) return;
  if (document.contentType && !/html/i.test(document.contentType)) return;
  if (window.__p404_loaded) return;
  window.__p404_loaded = true;

  // ---------------------------------------------------------------- config

  const SCALE = 4;           // css pixels per art pixel
  const GW = 20, GH = 16;    // art grid size
  const PET_W = GW * SCALE;  // 80
  const PET_H = GH * SCALE;  // 64
  const GRAVITY = 2400;      // px/s^2
  const WALK_SPEED = 46;
  const RUN_SPEED = 250;

  const PALETTES = {
    orange: {
      body: '#F5A54A', stripe: '#D9822B', belly: '#FFF6E8',
      pink: '#F08CA4', blush: '#F6BFC9', eye: '#33261F',
    },
    gray: {
      body: '#9AA3AD', stripe: '#7C858F', belly: '#F2F4F6',
      pink: '#EFA3B4', blush: '#E3B7C0', eye: '#2E3238',
    },
    black: {
      body: '#41414D', stripe: '#33333D', belly: '#FFFFFF',
      pink: '#EFA3B4', blush: '#8A6B75', eye: '#F5D76E',
    },
  };

  const settings = { enabled: true, color: 'orange' };

  // ---------------------------------------------------------------- state

  let root = null, petEl = null, shadowEl = null, canvas = null, ctx = null;
  let running = false;
  let rafId = 0;
  let lastT = 0;

  const pet = {
    x: 200,          // center x, viewport px
    y: 0,            // bottom y, viewport px
    vx: 0,
    vy: 0,
    dir: 1,          // 1 = facing right, -1 = facing left
    state: 'idle',   // idle | walk | run | jump | onPlatform | sleep | sit | dragged | fall
    stateT: 0,       // seconds in current state
    decideAt: 1.5,   // when to pick the next idle action
    walkPhase: 0,
    blinkT: 0,
    blinking: false,
    wagT: 0,
    wagFrame: 0,
    // jumping
    jump: null,      // {fromX, fromY, toX, toY, t, dur, peak, onLand}
    // platform riding
    platform: null,  // {el, ratio, until, pawAt}
    // chasing
    chaseCooldown: 0,
    caughtT: 0,
    // sleeping
    zT: 0,
    sleepUntil: 0,
  };

  const mouse = { x: -1e4, y: -1e4, vx: 0, vy: 0, lastMove: -1e4, t: 0 };
  let ball = null; // {el, x, y, vx, vy, spin, kicks, bornAt}

  const groundY = () => window.innerHeight - 2;

  // ---------------------------------------------------------------- art

  function drawCat() {
    const P = PALETTES[settings.color] || PALETTES.orange;
    const g = ctx;
    g.clearRect(0, 0, GW, GH);
    g.save();
    if (pet.dir < 0) {
      g.translate(GW, 0);
      g.scale(-1, 1);
    }

    const px = (x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
    const rect = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };

    const s = pet.state;
    const sleeping = s === 'sleep';
    const airborne = s === 'jump' || s === 'fall' || s === 'dragged';
    const eyes = sleeping ? 'closed'
      : (s === 'fall' || s === 'dragged') ? 'wide'
      : pet.blinking ? 'closed' : 'open';

    // -- tail (attached at the rear/left) --
    const TAILS = [
      [[1, 8], [0, 7], [0, 6], [1, 5]],
      [[0, 9], [0, 8], [0, 7]],
      [[0, 10], [0, 9], [1, 8]],
    ];
    const sitting = s === 'sit' || s === 'onPlatform';

    const head = (dy, eyeMode) => {
      // ears
      rect(10, dy, 2, 1, P.body);
      rect(16, dy, 2, 1, P.body);
      // head block, rounded
      rect(10, dy + 1, 8, 1, P.body);
      rect(9, dy + 2, 10, 6, P.body);
      rect(10, dy + 8, 8, 1, P.body);
      // inner ears
      px(11, dy + 1, P.pink);
      px(16, dy + 1, P.pink);
      // muzzle + nose
      rect(13, dy + 6, 3, 2, P.belly);
      px(14, dy + 6, P.pink);
      // blush
      px(10, dy + 6, P.blush);
      px(18, dy + 6, P.blush);
      // eyes
      const ey = dy + 4;
      if (eyeMode === 'open') {
        rect(12, ey, 1, 2, P.eye);
        rect(16, ey, 1, 2, P.eye);
      } else if (eyeMode === 'wide') {
        rect(11, ey, 2, 2, P.eye);
        px(11, ey, '#FFFFFF');
        rect(15, ey, 2, 2, P.eye);
        px(15, ey, '#FFFFFF');
      } else { // closed — happy little arcs
        px(12, ey + 1, P.eye);
        px(16, ey + 1, P.eye);
      }
    };

    if (sleeping) {
      // loaf: body low, head resting on paws
      for (const [tx, ty] of [[0, 13], [0, 14], [1, 15]]) px(tx, ty, P.stripe);
      rect(2, 11, 10, 4, P.body);
      rect(1, 12, 12, 3, P.body);
      rect(2, 15, 10, 1, P.body);
      px(4, 12, P.stripe); px(7, 12, P.stripe);
      head(4, 'closed');
    } else if (sitting) {
      // upright sit, tail curled around the front paws
      const tail = TAILS[pet.wagFrame % TAILS.length];
      for (const [tx, ty] of tail) px(tx, ty + 4, P.stripe);
      rect(3, 8, 9, 1, P.body);
      rect(2, 9, 10, 6, P.body);
      rect(3, 15, 8, 1, P.body);
      rect(8, 9, 3, 6, P.belly);       // chest
      px(4, 10, P.stripe); px(4, 11, P.stripe);
      px(9, 15, P.belly); px(10, 15, P.belly); // front toes
      px(1, 15, P.stripe); px(2, 15, P.stripe); // tail tip curled front
      head(0, eyes);
    } else {
      // standing / walking / airborne
      const tail = TAILS[pet.wagFrame % TAILS.length];
      for (const [tx, ty] of tail) px(tx, ty, P.stripe);
      rect(2, 9, 9, 1, P.body);
      rect(1, 10, 11, 3, P.body);
      rect(8, 10, 3, 3, P.belly);      // chest under the chin
      px(3, 10, P.stripe); px(3, 11, P.stripe);
      px(6, 10, P.stripe); px(6, 11, P.stripe);

      if (airborne) {
        // legs tucked / stretched mid-air
        rect(1, 13, 2, 2, P.body);
        rect(11, 13, 2, 2, P.body);
      } else if (s === 'walk' || s === 'run') {
        const a = Math.floor(pet.walkPhase) % 2 === 0;
        // diagonal gait: two legs down, two lifted
        rect(2, 13, 2, a ? 3 : 2, P.body);
        rect(5, 13, 2, a ? 2 : 3, P.body);
        rect(8, 13, 2, a ? 3 : 2, P.body);
        rect(11, 13, 2, a ? 2 : 3, P.body);
      } else {
        rect(2, 13, 2, 3, P.body);
        rect(5, 13, 2, 3, P.body);
        rect(8, 13, 2, 3, P.body);
        rect(11, 13, 2, 3, P.body);
      }
      head(0, eyes);
    }

    g.restore();
  }

  // ---------------------------------------------------------------- dom

  function particle(text, x, y) {
    if (!root) return;
    const el = document.createElement('span');
    el.className = 'p404-particle';
    el.textContent = text;
    el.style.transform = `translate(-50%, 0)`;
    el.style.left = `${Math.round(x)}px`;
    el.style.top = `${Math.round(y)}px`;
    root.appendChild(el);
    el.addEventListener('animationend', () => el.remove(), { once: true });
    setTimeout(() => el.remove(), 2000); // safety net
  }

  function mount() {
    if (root || !document.body) return;
    root = document.createElement('div');
    root.id = 'p404-root';

    shadowEl = document.createElement('div');
    shadowEl.id = 'p404-shadow';
    root.appendChild(shadowEl);

    petEl = document.createElement('div');
    petEl.id = 'p404-pet';
    canvas = document.createElement('canvas');
    canvas.width = GW;
    canvas.height = GH;
    ctx = canvas.getContext('2d');
    petEl.appendChild(canvas);
    root.appendChild(petEl);

    document.body.appendChild(root);

    pet.x = Math.min(160, window.innerWidth / 2);
    pet.y = groundY();
    pet.state = 'idle';
    pet.stateT = 0;

    petEl.addEventListener('mousedown', onGrab);
    petEl.addEventListener('mouseenter', () => {
      if (pet.state === 'sleep') wakeUp();
    });

    running = true;
    lastT = performance.now();
    rafId = requestAnimationFrame(tick);
  }

  function unmount() {
    running = false;
    cancelAnimationFrame(rafId);
    removeBall();
    if (root) root.remove();
    root = petEl = shadowEl = canvas = ctx = null;
  }

  // ---------------------------------------------------------------- input

  window.addEventListener('mousemove', (e) => {
    const now = performance.now() / 1000;
    const dt = Math.max(1e-3, now - mouse.t);
    mouse.vx = (e.clientX - mouse.x) / dt;
    mouse.vy = (e.clientY - mouse.y) / dt;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.t = now;
    mouse.lastMove = now;
  }, { passive: true });

  let drag = null; // {startX, startY, startT, moved, offX, offY, samples}

  function onGrab(e) {
    if (!settings.enabled || pet.state === 'dragged') return;
    e.preventDefault();
    drag = {
      startX: e.clientX, startY: e.clientY, startT: performance.now(),
      moved: false,
      offX: pet.x - e.clientX, offY: pet.y - e.clientY,
      samples: [],
    };
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', onDragEnd, { once: true });
  }

  function onDragMove(e) {
    if (!drag) return;
    if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 5) {
      drag.moved = true;
      setState('dragged');
      petEl.classList.add('p404-dragging');
      pet.platform = null;
      pet.jump = null;
    }
    if (pet.state === 'dragged') {
      pet.x = e.clientX + drag.offX;
      pet.y = e.clientY + drag.offY;
      drag.samples.push({ x: e.clientX, y: e.clientY, t: performance.now() });
      if (drag.samples.length > 6) drag.samples.shift();
    }
  }

  function onDragEnd() {
    window.removeEventListener('mousemove', onDragMove);
    if (!drag) return;
    const wasDrag = drag.moved;
    if (petEl) petEl.classList.remove('p404-dragging');

    if (!wasDrag) {
      // a click — affection!
      onPetted();
    } else {
      // toss velocity from the last few pointer samples
      let vx = 0, vy = 0;
      const s = drag.samples;
      if (s.length >= 2) {
        const a = s[0], b = s[s.length - 1];
        const dt = Math.max(0.016, (b.t - a.t) / 1000);
        vx = (b.x - a.x) / dt;
        vy = (b.y - a.y) / dt;
      }
      pet.vx = clamp(vx, -700, 700);
      pet.vy = clamp(vy, -900, 500);
      setState('fall');
    }
    drag = null;
  }

  function onPetted() {
    if (pet.state === 'sleep') { wakeUp(); return; }
    particle('❤️', pet.x, pet.y - PET_H - 6);
    if (Math.random() < 0.5) particle('❤️', pet.x + 18, pet.y - PET_H + 6);
    if (pet.state !== 'onPlatform' && pet.state !== 'jump') {
      // happy hop
      pet.vy = -420;
      pet.vx = 0;
      setState('fall');
    }
    pet.caughtT = 0;
  }

  function wakeUp() {
    particle('❗', pet.x, pet.y - PET_H - 6);
    setState('idle');
    pet.decideAt = 1 + Math.random() * 2;
  }

  // ---------------------------------------------------------------- helpers

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function setState(s) {
    if (pet.state === s) return;
    pet.state = s;
    pet.stateT = 0;
  }

  function inViewportX(x) {
    return clamp(x, PET_W / 2 + 2, window.innerWidth - PET_W / 2 - 2);
  }

  // Pick a page element the cat could stand on.
  function findPlatform() {
    const sel = 'img, h1, h2, h3, button, video, [role="button"], nav, .card, article > p:first-of-type';
    let els;
    try { els = document.querySelectorAll(sel); } catch { return null; }
    const good = [];
    const vw = window.innerWidth, vh = window.innerHeight;
    for (const el of els) {
      if (good.length > 40) break;
      if (el.closest('#p404-root')) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 70 || r.height < 24) continue;
      if (r.top < 90 || r.top > vh - 160) continue;
      if (r.left > vw - 60 || r.right < 60) continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none' || +style.opacity === 0) continue;
      good.push(el);
    }
    if (!good.length) return null;
    return good[Math.floor(Math.random() * good.length)];
  }

  function startJump(toX, toY, onLand) {
    const fromX = pet.x, fromY = pet.y;
    const dist = Math.hypot(toX - fromX, toY - fromY);
    const dur = clamp(0.35 + dist / 900, 0.35, 0.9);
    const rise = Math.max(40, fromY - toY + 46);
    pet.jump = { fromX, fromY, toX, toY, t: 0, dur, rise, onLand };
    pet.dir = toX >= fromX ? 1 : -1;
    setState('jump');
  }

  // Briefly wiggle a page element (the cat pawing at it).
  function pawAt(el) {
    if (!el || !el.isConnected) return;
    try {
      const prev = el.style.animation;
      el.style.animation = 'p404-wiggle 0.45s ease';
      setTimeout(() => {
        if (el.isConnected) el.style.animation = prev;
      }, 500);
    } catch { /* ignore */ }
  }

  // ---------------------------------------------------------------- yarn ball

  function spawnBall() {
    if (!root) return;
    removeBall();
    const el = document.createElement('div');
    el.className = 'p404-ball';
    el.textContent = '🧶';
    root.appendChild(el);
    const fromLeft = pet.x > window.innerWidth / 2;
    ball = {
      el,
      x: fromLeft ? 40 : window.innerWidth - 40,
      y: 40,
      vx: fromLeft ? 160 : -160,
      vy: 0,
      spin: 0,
      kicks: 0,
      bornAt: performance.now() / 1000,
    };
    if (pet.state !== 'dragged' && pet.state !== 'jump') {
      pet.platform = null;
      if (pet.state === 'onPlatform') setState('fall');
      else setState('run');
      particle('❗', pet.x, pet.y - PET_H - 6);
    }
  }

  function removeBall() {
    if (ball) { ball.el.remove(); ball = null; }
  }

  function updateBall(dt) {
    if (!ball) return;
    const b = ball;
    const floor = window.innerHeight - 10;
    b.vy += GRAVITY * 0.55 * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.spin += b.vx * dt * 1.6;
    if (b.y > floor) {
      b.y = floor;
      b.vy = -Math.abs(b.vy) * 0.55;
      b.vx *= 0.985;
      if (Math.abs(b.vy) < 40) b.vy = 0;
    }
    if (b.x < 14) { b.x = 14; b.vx = Math.abs(b.vx) * 0.8; }
    if (b.x > window.innerWidth - 14) { b.x = window.innerWidth - 14; b.vx = -Math.abs(b.vx) * 0.8; }
    if (b.y === undefined || Number.isNaN(b.x)) { removeBall(); return; }
    b.vx *= (1 - 0.25 * dt);
    b.el.style.transform =
      `translate(${Math.round(b.x - 11)}px, ${Math.round(b.y - 20)}px) rotate(${Math.round(b.spin)}deg)`;

    const age = performance.now() / 1000 - b.bornAt;
    if (age > 25 || b.kicks >= 10) {
      b.el.style.opacity = '0';
      const dead = b;
      setTimeout(() => { if (ball === dead) removeBall(); }, 650);
      ball = null;
      if (pet.state === 'run') setState('idle');
    }
  }

  // ---------------------------------------------------------------- brain

  function decide() {
    pet.decideAt = 2 + Math.random() * 4;
    const roll = Math.random();
    if (roll < 0.34) {
      setState('walk');
      pet.dir = Math.random() < 0.5 ? -1 : 1;
      pet.decideAt = 1.5 + Math.random() * 3;
    } else if (roll < 0.52) {
      setState('sit');
      pet.decideAt = 2.5 + Math.random() * 4;
    } else if (roll < 0.68) {
      const el = findPlatform();
      if (el) {
        const r = el.getBoundingClientRect();
        const ratio = 0.2 + Math.random() * 0.6;
        pet.platform = {
          el, ratio,
          until: performance.now() / 1000 + 6 + Math.random() * 8,
          pawAt: performance.now() / 1000 + 1.5 + Math.random() * 3,
        };
        startJump(inViewportX(r.left + r.width * ratio), r.top + 1, () => {
          setState('onPlatform');
        });
      }
    } else if (roll < 0.78 && !ball) {
      spawnBall();
    } else if (roll < 0.88) {
      pet.sleepUntil = performance.now() / 1000 + 8 + Math.random() * 14;
      setState('sleep');
    } else {
      setState('idle'); // just vibe
      if (mouse.lastMove > 0) pet.dir = mouse.x >= pet.x ? 1 : -1;
    }
  }

  function maybeChase(now) {
    if (pet.chaseCooldown > 0 || ball) return;
    if (pet.state !== 'idle' && pet.state !== 'walk' && pet.state !== 'sit') return;
    const recent = now - mouse.lastMove < 0.25;
    const speed = Math.hypot(mouse.vx, mouse.vy);
    const dist = Math.hypot(mouse.x - pet.x, mouse.y - (pet.y - PET_H / 2));
    if (recent && speed > 500 && dist < 320 && Math.random() < 0.06) {
      setState('run');
      particle('❗', pet.x, pet.y - PET_H - 6);
      pet.chaseCooldown = 9;
    }
  }

  // ---------------------------------------------------------------- update

  function tick(nowMs) {
    if (!running) return;
    const now = nowMs / 1000;
    let dt = Math.min(0.05, (nowMs - lastT) / 1000);
    lastT = nowMs;

    pet.stateT += dt;
    pet.chaseCooldown = Math.max(0, pet.chaseCooldown - dt);

    // blinking + tail wag timers
    pet.blinkT -= dt;
    if (pet.blinkT <= 0) {
      pet.blinking = !pet.blinking;
      pet.blinkT = pet.blinking ? 0.12 : 1.5 + Math.random() * 3;
    }
    pet.wagT += dt;
    const wagSpeed = (pet.state === 'run' || pet.state === 'jump') ? 0.15 : 0.4;
    if (pet.wagT > wagSpeed) {
      pet.wagT = 0;
      pet.wagFrame = (pet.wagFrame + 1) % 3;
    }

    updateBall(dt);
    maybeChase(now);

    switch (pet.state) {
      case 'idle': {
        pet.y = groundY();
        if (ball && pet.stateT > 0.6) { setState('run'); break; }
        if (now - mouse.lastMove < 1 && Math.abs(mouse.x - pet.x) > 30) {
          pet.dir = mouse.x >= pet.x ? 1 : -1; // watch the cursor
        }
        if (pet.stateT > pet.decideAt) decide();
        break;
      }

      case 'walk': {
        pet.y = groundY();
        pet.walkPhase += dt * 7;
        pet.x += pet.dir * WALK_SPEED * dt;
        const cl = inViewportX(pet.x);
        if (cl !== pet.x) { pet.x = cl; pet.dir *= -1; }
        if (pet.stateT > pet.decideAt) { setState('idle'); pet.decideAt = 1 + Math.random() * 2; }
        break;
      }

      case 'sit': {
        pet.y = groundY();
        if (now - mouse.lastMove < 1) pet.dir = mouse.x >= pet.x ? 1 : -1;
        if (pet.stateT > pet.decideAt) { setState('idle'); pet.decideAt = 0.5 + Math.random() * 1.5; }
        break;
      }

      case 'run': {
        pet.y = groundY();
        pet.walkPhase += dt * 14;
        const target = ball ? ball.x : mouse.x;
        const targetY = ball ? ball.y : mouse.y;
        const dx = target - pet.x;
        pet.dir = dx >= 0 ? 1 : -1;
        pet.x = inViewportX(pet.x + pet.dir * RUN_SPEED * dt);

        if (ball) {
          if (Math.abs(dx) < 34 && ball.y > window.innerHeight - 90) {
            // kick!
            ball.vx = pet.dir * (260 + Math.random() * 240);
            ball.vy = -(220 + Math.random() * 260);
            ball.kicks++;
            pet.vy = -260; setState('fall');
            if (Math.random() < 0.35) particle('❤️', pet.x, pet.y - PET_H - 6);
          } else if (Math.abs(dx) < 30) {
            setState('idle'); pet.decideAt = 0.4; // wait under it
          }
        } else {
          // chasing the cursor
          if (Math.abs(dx) < 80 && targetY > pet.y - 260 && now - mouse.lastMove < 2) {
            startJump(inViewportX(target), Math.max(60, targetY), () => {
              const d = Math.hypot(mouse.x - pet.x, mouse.y - pet.y);
              if (d < 60) {
                particle('❤️', pet.x, pet.y - PET_H - 2);
                particle('✨', pet.x + 16, pet.y - PET_H + 10);
              }
              setState('fall');
            });
          } else if (pet.stateT > 6 || now - mouse.lastMove > 2.5) {
            setState('idle');
            pet.decideAt = 1 + Math.random() * 2;
          }
        }
        break;
      }

      case 'jump': {
        const j = pet.jump;
        if (!j) { setState('fall'); break; }
        j.t += dt;
        const p = Math.min(1, j.t / j.dur);
        pet.x = j.fromX + (j.toX - j.fromX) * p;
        const base = j.fromY + (j.toY - j.fromY) * p;
        pet.y = base - Math.sin(p * Math.PI) * j.rise;
        if (p >= 1) {
          pet.x = j.toX; pet.y = j.toY;
          const land = j.onLand;
          pet.jump = null;
          if (land) land(); else setState('idle');
        }
        break;
      }

      case 'onPlatform': {
        const pl = pet.platform;
        if (!pl || !pl.el.isConnected) { pet.platform = null; setState('fall'); break; }
        const r = pl.el.getBoundingClientRect();
        if (r.width < 10 || r.top < 40 || r.top > window.innerHeight - 30) {
          pet.platform = null; setState('fall'); break;
        }
        pet.x = inViewportX(r.left + r.width * pl.ratio);
        pet.y = r.top + 1;
        if (now - mouse.lastMove < 1) pet.dir = mouse.x >= pet.x ? 1 : -1;

        if (pl.pawAt && now > pl.pawAt) {
          pl.pawAt = now + 2.5 + Math.random() * 4;
          pawAt(pl.el);
          particle('✨', pet.x + pet.dir * 20, pet.y - 8);
        }
        if (now > pl.until) {
          pet.platform = null;
          startJump(inViewportX(pet.x + pet.dir * 90), groundY(), () => setState('idle'));
        }
        break;
      }

      case 'sleep': {
        pet.y = groundY();
        pet.zT += dt;
        if (pet.zT > 1.4) {
          pet.zT = 0;
          particle('💤', pet.x + pet.dir * 26, pet.y - PET_H + 4);
        }
        const nearAndFast = Math.hypot(mouse.x - pet.x, mouse.y - pet.y) < 120 &&
          Math.hypot(mouse.vx, mouse.vy) > 900 && now - mouse.lastMove < 0.2;
        if (now > pet.sleepUntil || nearAndFast) wakeUp();
        break;
      }

      case 'fall': {
        pet.vy += GRAVITY * dt;
        pet.x = inViewportX(pet.x + pet.vx * dt);
        pet.y += pet.vy * dt;
        pet.vx *= (1 - 1.2 * dt);
        if (pet.y >= groundY()) {
          pet.y = groundY();
          if (pet.vy > 850) {
            pet.vy = -pet.vy * 0.25; // little bounce
          } else {
            pet.vy = 0; pet.vx = 0;
            setState('idle');
            pet.decideAt = 0.8 + Math.random() * 1.5;
          }
        }
        break;
      }

      case 'dragged': {
        // position handled by the drag listener
        break;
      }
    }

    // keep the cat inside the window on resize/scroll edge cases
    if (pet.state !== 'jump' && pet.state !== 'dragged') {
      pet.x = inViewportX(pet.x);
      if (pet.state !== 'fall' && pet.state !== 'onPlatform' && pet.y > groundY()) {
        pet.y = groundY();
      }
    }

    render();
    rafId = requestAnimationFrame(tick);
  }

  function render() {
    if (!petEl) return;
    drawCat();
    const bob = (pet.state === 'walk' || pet.state === 'run')
      ? Math.round(Math.sin(pet.walkPhase * Math.PI) * 1.5) : 0;
    const tx = Math.round(pet.x - PET_W / 2);
    const ty = Math.round(pet.y - PET_H + bob);
    petEl.style.transform = `translate(${tx}px, ${ty}px)`;

    // shadow: on the ground (or platform) below the cat
    const shadowY = pet.state === 'onPlatform' ? pet.y : groundY();
    const height = clamp(shadowY - pet.y, 0, 400);
    const k = 1 - height / 500;
    shadowEl.style.opacity = String(0.5 * k + 0.15);
    shadowEl.style.transform =
      `translate(${Math.round(pet.x - 24 * k)}px, ${Math.round(shadowY - 6)}px) scaleX(${k.toFixed(2)})`;
  }

  // ---------------------------------------------------------------- wiring

  function applyEnabled() {
    if (settings.enabled && !root) {
      if (document.body) mount();
      else document.addEventListener('DOMContentLoaded', mount, { once: true });
    } else if (!settings.enabled && root) {
      unmount();
    }
  }

  try {
    chrome.storage.sync.get({ enabled: true, color: 'orange' }, (v) => {
      settings.enabled = v.enabled !== false;
      settings.color = PALETTES[v.color] ? v.color : 'orange';
      applyEnabled();
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync') return;
      if (changes.enabled) {
        settings.enabled = changes.enabled.newValue !== false;
        applyEnabled();
      }
      if (changes.color && PALETTES[changes.color.newValue]) {
        settings.color = changes.color.newValue;
      }
    });

    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'p404-spawn-ball' && settings.enabled && root) {
        spawnBall();
        sendResponse({ ok: true });
      } else if (msg.type === 'p404-ping') {
        sendResponse({ ok: true, enabled: settings.enabled });
      }
    });
  } catch {
    // not running as an extension (e.g. opened directly) — just show the pet
    applyEnabled();
  }

  window.addEventListener('resize', () => {
    if (!root) return;
    pet.x = inViewportX(pet.x);
    if (pet.y > groundY()) pet.y = groundY();
  });
})();
