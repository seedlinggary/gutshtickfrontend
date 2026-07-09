import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';
import HowToPlay from './HowToPlay';
import './BubbleTrouble.css';

// ── Playfield ──
const W = 720;
const H = 480;
const WALL = 14;              // solid boundary thickness
const LEFT = WALL;
const RIGHT = W - WALL;
const TOP = WALL;
const FLOOR = H - WALL;

// ── Physics ──
const GRAVITY = 680;          // px/s^2
const HARPOON_SPEED = 720;    // px/s
const FIRE_COOLDOWN = 0.15;   // s after retract before refire
const RAPID_COOLDOWN = 0.05;  // s cooldown while Rapid Fire is active
const PLAYER_W = 30;
const PLAYER_H = 34;
const RESPAWN_INVULN = 2.2;   // s
const INTER_LEVEL = 1.6;      // s pause between levels

// ── Power-ups ──
const CAPSULE_R = 14;         // capsule half-size
const CAPSULE_FALL = 120;     // px/s falling speed of a dropped capsule
const CAPSULE_LIFE = 6;       // s a landed capsule waits to be collected
const FREEZE_SCALE = 0.42;    // bubble time-scale while Freeze is active

const POWERUPS = {
  laser:  { icon: '⚡', label: 'LASER',   color: '#f43f5e', duration: 7 },
  spikes: { icon: '🔱', label: 'SPIKES',  color: '#f59e0b', duration: 7 },
  rapid:  { icon: '🔥', label: 'RAPID',   color: '#22d3ee', duration: 9 },
  shield: { icon: '🛡️', label: 'SHIELD',  color: '#a78bfa', duration: 6 },
  freeze: { icon: '❄️', label: 'FREEZE',  color: '#60a5fa', duration: 6 },
  mega:   { icon: '💥', label: 'MEGA POP', color: '#f97316', duration: 8 },
};
const POWER_POOL = ['laser', 'spikes', 'rapid', 'shield', 'freeze', 'mega'];

// Bubble tiers: index 0 = small, 1 = medium, 2 = large
const TIERS = [
  { r: 15, bounce: 350, hspeed: 150, points: 40, color: '#f472b6' }, // small
  { r: 26, bounce: 430, hspeed: 120, points: 20, color: '#38bdf8' }, // medium
  { r: 40, bounce: 500, hspeed: 92,  points: 10, color: '#a78bfa' }, // large
];

// Per-level layouts. inset = how far each side wall moves in (narrower arena);
// speed = base velocity multiplier; bubbles = starting bubbles as {tier, x(0..1),
// dir(optional), midAir(optional -> spawns already high & fast), hidden(optional
// -> 'power' | 'points' | 'nested' surprise bubble).
// platforms = solid ledges bubbles bounce off and that block harpoons, given in
// absolute px { x, y, w, h } (+ optional vx/min/max for a moving platform). They
// are always kept well short of the full width so bubbles can never be trapped.
// mod = level gimmick flags { gravityMul, bounceMul, dim, swarm }.
const LEVEL_PLANS = [
  // 1 — gentle intro: one large bubble
  { inset: 0,   speed: 1.00, bubbles: [{ tier: 2, x: 0.50 }] },
  // 2 — a large plus a medium
  { inset: 0,   speed: 1.00, bubbles: [{ tier: 2, x: 0.32 }, { tier: 1, x: 0.70 }] },
  // 3 — two large bubbles closing from both sides
  { inset: 0,   speed: 1.05, bubbles: [{ tier: 2, x: 0.26, dir: 1 }, { tier: 2, x: 0.74, dir: -1 }] },
  // 4 — FIRST PLATFORM: a central ledge to shoot around; one large + a hidden medium
  { inset: 0,   speed: 1.15,
    platforms: [{ x: 270, y: 300, w: 180, h: 14 }],
    bubbles: [{ tier: 2, x: 0.50 }, { tier: 1, x: 0.16, hidden: 'points' }] },
  // 5 — narrow walls, two large
  { inset: 90,  speed: 1.10, bubbles: [{ tier: 2, x: 0.30 }, { tier: 2, x: 0.70 }] },
  // 6 — EXTRA BOUNCY: two large starting mid-air, springy floor, twin low ledges
  { inset: 0,   speed: 1.10, mod: { bounceMul: 1.28 },
    platforms: [{ x: 120, y: 330, w: 130, h: 14 }, { x: 470, y: 330, w: 130, h: 14 }],
    bubbles: [{ tier: 2, x: 0.35, midAir: true }, { tier: 2, x: 0.65, midAir: true }] },
  // 7 — fast mix around two staggered ledges; a hidden power bubble
  { inset: 0,   speed: 1.35,
    platforms: [{ x: 120, y: 250, w: 150, h: 14 }, { x: 450, y: 340, w: 150, h: 14 }],
    bubbles: [{ tier: 2, x: 0.50, hidden: 'power' }, { tier: 1, x: 0.22 }, { tier: 1, x: 0.78 }] },
  // 8 — SWARM: a burst of small fast bubbles at once, no splitting to worry about
  { inset: 0,   speed: 1.15, mod: { swarm: true },
    bubbles: [
      { tier: 0, x: 0.15 }, { tier: 0, x: 0.30 }, { tier: 0, x: 0.45, hidden: 'nested' },
      { tier: 0, x: 0.60 }, { tier: 0, x: 0.75 }, { tier: 0, x: 0.88 }, { tier: 1, x: 0.50 } ] },
  // 9 — three large across the floor with a wide central ledge splitting the arena
  { inset: 0,   speed: 1.20,
    platforms: [{ x: 285, y: 210, w: 150, h: 14 }],
    bubbles: [{ tier: 2, x: 0.18 }, { tier: 2, x: 0.50 }, { tier: 2, x: 0.82 }] },
  // 10 — gauntlet: narrow, fast, two mid-air large + a medium
  { inset: 90,  speed: 1.40, bubbles: [{ tier: 2, x: 0.28, midAir: true }, { tier: 2, x: 0.72, midAir: true }, { tier: 1, x: 0.50 }] },
  // 11 — LIGHTS DOWN: dim arena, careful play, a hidden power reward
  { inset: 0,   speed: 1.10, mod: { dim: true },
    platforms: [{ x: 280, y: 320, w: 160, h: 14 }],
    bubbles: [{ tier: 2, x: 0.30, hidden: 'power' }, { tier: 2, x: 0.70 }] },
  // 12 — MOVING PLATFORM: a ledge slides side to side; two large + hidden nested
  { inset: 0,   speed: 1.15,
    platforms: [{ x: 200, y: 300, w: 140, h: 14, vx: 90, min: 40, max: 680 }],
    bubbles: [{ tier: 2, x: 0.25 }, { tier: 2, x: 0.75, hidden: 'nested' }] },
  // 13 — HEAVY GRAVITY: bubbles fall hard and stay low, fast & relentless
  { inset: 0,   speed: 1.20, mod: { gravityMul: 1.55, bounceMul: 1.12 },
    bubbles: [{ tier: 2, x: 0.30 }, { tier: 1, x: 0.55 }, { tier: 1, x: 0.80 }] },
  // 14 — FINALE: narrow, dim, moving ledge, mixed mid-air large + hidden power
  { inset: 60,  speed: 1.35, mod: { dim: true },
    platforms: [{ x: 250, y: 260, w: 130, h: 14, vx: 70, min: 90, max: 630 }],
    bubbles: [{ tier: 2, x: 0.30, midAir: true }, { tier: 2, x: 0.70, midAir: true }, { tier: 1, x: 0.50, hidden: 'power' }] },
];

const DIFF = {
  easy:   { speedMul: 0.82 },
  medium: { speedMul: 1.0 },
  hard:   { speedMul: 1.2 },
};

let BUBBLE_ID = 1;
let CAPSULE_ID = 1;

function makeBubble(x, y, tier, vx, vy, mul, power, hidden) {
  const t = TIERS[tier];
  return {
    id: BUBBLE_ID++,
    x, y, tier,
    r: t.r,
    vx: (vx == null ? (Math.random() < 0.5 ? -1 : 1) * t.hspeed : vx) * mul,
    vy: vy == null ? -t.bounce * 0.55 : vy,
    power: power || null,   // powerup type this bubble drops when popped, or null
    hidden: hidden || null, // 'power' | 'points' | 'nested' surprise, or null
  };
}

function newCapsule(x, y, type) {
  return { id: CAPSULE_ID++, x, y, type, landed: false, life: CAPSULE_LIFE };
}

// Build the bubbles + arena bounds + speed factor for a given level.
// Levels beyond the plan list cycle back through with extra bubbles & speed.
function buildLevel(level, diff) {
  const cfg = DIFF[diff];
  const plan = LEVEL_PLANS[(level - 1) % LEVEL_PLANS.length];
  const cycle = Math.floor((level - 1) / LEVEL_PLANS.length);
  const left = LEFT + plan.inset;
  const right = RIGHT - plan.inset;
  const speed = plan.speed * cfg.speedMul * (1 + 0.09 * cycle);
  const mod = plan.mod || {};
  // Fresh, mutable platform objects each build (so moving ledges reset cleanly).
  const platforms = (plan.platforms || []).map((p) => ({ ...p }));

  const specs = plan.bubbles.map((b) => ({ ...b }));
  // Each full cycle through the plans adds one more bubble for endless scaling.
  for (let c = 0; c < cycle; c++) {
    specs.push({ tier: c % 2 === 0 ? 2 : 1, x: 0.2 + 0.6 * Math.random() });
  }

  const bubbles = [];
  let specials = 0;
  const maxSpecial = specs.length >= 3 ? 2 : 1;
  for (const sp of specs) {
    const t = TIERS[sp.tier];
    let x = left + sp.x * (right - left);
    x = Math.max(left + t.r, Math.min(right - t.r, x));
    const dir = sp.dir != null ? sp.dir : (Math.random() < 0.5 ? -1 : 1);
    // Roughly 38% of starting bubbles carry a power-up (capped) — an earned treat,
    // not every pop. Bubbles already flagged 'hidden' don't also carry a ring power.
    let power = null;
    if (!sp.hidden && specials < maxSpecial && Math.random() < 0.38) {
      power = POWER_POOL[Math.floor(Math.random() * POWER_POOL.length)];
      specials++;
    }
    const y = sp.midAir ? (TOP + FLOOR) / 2 : TOP + 90 + (bubbles.length % 2) * 40;
    const vy = sp.midAir ? -t.bounce * speed : -t.bounce * 0.55;
    bubbles.push(makeBubble(x, y, sp.tier, dir * t.hspeed * speed, vy, 1, power, sp.hidden));
  }
  return { bubbles, bounds: { left, right }, speed, platforms, mod };
}

// Pop bubble at index i: score it, split it, and drop a capsule if it was special.
// mega = true destroys the bubble outright with no children (Mega Pop power-up).
function popBubbleAt(s, i, mega) {
  const b = s.bubbles[i];
  s.score += TIERS[b.tier].points;
  const newOnes = [];
  if (!mega && b.tier > 0) {
    const nt = b.tier - 1;
    const sp = TIERS[nt].hspeed * s.speed;
    const pop = -TIERS[nt].bounce * 0.5;
    newOnes.push(makeBubble(b.x, b.y, nt, -sp, pop, 1));
    newOnes.push(makeBubble(b.x, b.y, nt, sp, pop, 1));
  }
  if (b.power) s.capsules.push(newCapsule(b.x, b.y, b.power));
  // Hidden/nested surprise: a normal-looking bubble that reveals a bonus on popping.
  if (b.hidden) {
    if (b.hidden === 'points') {
      s.score += 200;
      s.flashHint = { text: '+200!', x: b.x, y: b.y, life: 0.9 };
    } else if (b.hidden === 'power') {
      const type = POWER_POOL[Math.floor(Math.random() * POWER_POOL.length)];
      s.capsules.push(newCapsule(b.x, b.y, type));
      s.flashHint = { text: 'SURPRISE!', x: b.x, y: b.y, life: 0.9 };
    } else if (b.hidden === 'nested' && !mega) {
      // a hidden small bubble was tucked inside — pops out
      newOnes.push(makeBubble(b.x, b.y, 0, -TIERS[0].hspeed * s.speed, -TIERS[0].bounce * 0.5, 1));
      s.flashHint = { text: 'HIDDEN!', x: b.x, y: b.y, life: 0.9 };
    }
  }
  s.bubbles.splice(i, 1, ...newOnes);
}

function initState(difficulty) {
  const setup = buildLevel(1, difficulty);
  return {
    bubbles: setup.bubbles,
    bounds: setup.bounds,
    speed: setup.speed,
    platforms: setup.platforms,   // solid ledges for this level
    mod: setup.mod,               // level gimmick flags
    flashHint: null,              // transient floating text for surprises
    capsules: [],
    power: null,          // { type, time } — the one active power-up
    laserOn: false,       // laser beam firing this frame (draw flag)
    player: { x: W / 2, vx: 0 },
    harpoon: null,        // { x, tipY, pierce } — pierce = spiked (piercing) shot
    cooldown: 0,
    level: 1,
    score: 0,
    lives: 3,
    invuln: 0,
    interLevel: 0,
    input: { left: false, right: false, fire: false, fireHeld: false },
    lastTime: 0,
    raf: null,
  };
}

function circleRectHit(cx, cy, r, rx, ry, rw, rh) {
  const nx = Math.max(rx, Math.min(cx, rx + rw));
  const ny = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy <= r * r;
}

// Elastic bounce of a bubble off a solid platform rect. Pushes the bubble out of
// the ledge along the shallowest axis and reflects the matching velocity. `bounce`
// is the tier's characteristic bounce speed (already scaled) used for top/bottom
// hits so a bubble landing on a ledge springs like it does off the floor.
function collideBubblePlatform(b, p, bounce) {
  const nx = Math.max(p.x, Math.min(b.x, p.x + p.w));
  const ny = Math.max(p.y, Math.min(b.y, p.y + p.h));
  const dx = b.x - nx;
  const dy = b.y - ny;
  if (dx * dx + dy * dy > b.r * b.r) return;

  // Center buried inside the ledge (thin ledge, big bubble): eject via least overlap.
  const inside = b.x > p.x && b.x < p.x + p.w && b.y > p.y && b.y < p.y + p.h;
  if (inside) {
    const toT = b.y - p.y, toB = p.y + p.h - b.y, toL = b.x - p.x, toR = p.x + p.w - b.x;
    const m = Math.min(toT, toB, toL, toR);
    if (m === toT) { b.y = p.y - b.r; b.vy = -bounce; }
    else if (m === toB) { b.y = p.y + p.h + b.r; b.vy = Math.abs(b.vy); }
    else if (m === toL) { b.x = p.x - b.r; b.vx = -Math.abs(b.vx); }
    else { b.x = p.x + p.w + b.r; b.vx = Math.abs(b.vx); }
    return;
  }

  const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
  const ux = dx / dist, uy = dy / dist;
  // push the bubble to just touch the nearest edge point
  b.x = nx + ux * b.r;
  b.y = ny + uy * b.r;
  if (Math.abs(ux) > Math.abs(uy)) {
    // side hit → reflect horizontal, away from the ledge
    b.vx = Math.abs(b.vx) * (ux < 0 ? -1 : 1);
  } else if (uy < 0) {
    b.vy = -bounce;            // landed on top → spring up
  } else {
    b.vy = Math.abs(b.vy);     // clipped the underside → push back down
  }
}

function drawCapsule(ctx, c) {
  const p = POWERUPS[c.type];
  ctx.save();
  ctx.shadowColor = p.color;
  ctx.shadowBlur = 16;
  ctx.fillStyle = p.color;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(c.x - CAPSULE_R, c.y - CAPSULE_R, CAPSULE_R * 2, CAPSULE_R * 2, 8);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.font = '16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(p.icon, c.x, c.y + 1);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
}

function drawPlatform(ctx, p) {
  ctx.save();
  const g = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
  g.addColorStop(0, '#3b4a72');
  g.addColorStop(1, '#232f4e');
  ctx.fillStyle = g;
  ctx.strokeStyle = 'rgba(120,170,255,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(p.x, p.y, p.w, p.h, 6);
  ctx.fill();
  ctx.stroke();
  // rivets so the ledge reads as solid metal
  ctx.fillStyle = 'rgba(180,210,255,0.7)';
  for (let x = p.x + 10; x < p.x + p.w - 6; x += 24) {
    ctx.beginPath();
    ctx.arc(x, p.y + p.h / 2, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Spiked (piercing) harpoon: a jagged barbed shaft, visually distinct from both
// the plain harpoon line and the wide Laser beam.
function drawSpikedHarpoon(ctx, hx, tipY) {
  ctx.save();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3;
  ctx.shadowColor = 'rgba(245,158,11,0.8)';
  ctx.shadowBlur = 8;
  // central shaft
  ctx.beginPath();
  ctx.moveTo(hx, FLOOR);
  ctx.lineTo(hx, tipY);
  ctx.stroke();
  // barbs down the shaft, alternating sides
  ctx.fillStyle = '#fbbf24';
  for (let y = FLOOR - 12; y > tipY + 6; y -= 16) {
    const side = ((y / 16) | 0) % 2 === 0 ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(hx, y);
    ctx.lineTo(hx + side * 8, y + 5);
    ctx.lineTo(hx, y + 9);
    ctx.closePath();
    ctx.fill();
  }
  // jagged trident tip
  ctx.beginPath();
  ctx.moveTo(hx, tipY - 12);
  ctx.lineTo(hx - 7, tipY + 6);
  ctx.lineTo(hx - 2, tipY + 2);
  ctx.lineTo(hx, tipY + 8);
  ctx.lineTo(hx + 2, tipY + 2);
  ctx.lineTo(hx + 7, tipY + 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export default function BubbleTrouble() {
  const canvasRef = useRef(null);
  const stateRef = useRef(initState('medium'));
  const diffRef = useRef('medium');
  const [difficulty, setDifficulty] = useState('medium');
  const [gameStatus, setGameStatus] = useState('idle'); // idle | playing | over
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [power, setPower] = useState(null); // { type, time } for the on-screen indicator
  const [toast, setToast] = useState('');
  const [stats, setStats] = useState({ wins: 0, losses: 0, best_score: 0 });
  const [bestScore, setBestScore] = useState(0);
  const saved = useRef(false);
  const wonLogged = useRef(false);
  const toastTimer = useRef(null);
  const powerUIRef = useRef(''); // guards power indicator re-renders

  useEffect(() => {
    if (isLoggedIn()) {
      apiRequest('GET', null, '/game/stats').then((d) => {
        if (d?.bubble_trouble) setStats(d.bubble_trouble);
      }).catch(() => {});
    }
    return () => {
      cancelAnimationFrame(stateRef.current.raf);
      clearTimeout(toastTimer.current);
    };
  }, []);

  const flashToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 1800);
  }, []);

  const saveResult = useCallback((result, s) => {
    if (result === 'win') {
      if (wonLogged.current) return;
      wonLogged.current = true;
    } else {
      if (saved.current) return;
      saved.current = true;
    }
    if (isLoggedIn()) {
      apiRequest('POST', { game_type: 'bubble_trouble', result, difficulty: diffRef.current, score: s.score }, '/game/save').catch(() => {});
    }
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;
    const L = s.bounds.left;
    const R = s.bounds.right;

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0c1226');
    bg.addColorStop(1, '#0a0f1f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Walls (use current arena bounds so narrow levels show walls moved in)
    ctx.fillStyle = '#1b2540';
    ctx.fillRect(0, 0, W, TOP);
    ctx.fillRect(0, FLOOR, W, H - FLOOR);
    ctx.fillRect(0, 0, L, H);
    ctx.fillRect(R, 0, W - R, H);
    ctx.strokeStyle = 'rgba(56,189,248,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(L, TOP, R - L, FLOOR - TOP);

    // Solid platform ledges
    s.platforms.forEach((p) => drawPlatform(ctx, p));

    // Laser beam (continuous piercing shot)
    if (s.laserOn) {
      const bx = s.player.x;
      const g = ctx.createLinearGradient(bx - 7, 0, bx + 7, 0);
      g.addColorStop(0, 'rgba(244,63,94,0)');
      g.addColorStop(0.5, 'rgba(255,120,140,0.95)');
      g.addColorStop(1, 'rgba(244,63,94,0)');
      ctx.fillStyle = g;
      ctx.fillRect(bx - 7, TOP, 14, FLOOR - TOP);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillRect(bx - 2, TOP, 4, FLOOR - TOP);
    }

    // Harpoon — spiked/piercing variant looks barbed; plain variant is a line + tip
    if (s.harpoon) {
      const hx = s.harpoon.x;
      if (s.harpoon.pierce) {
        drawSpikedHarpoon(ctx, hx, s.harpoon.tipY);
      } else {
        ctx.strokeStyle = '#fde68a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(hx, FLOOR);
        ctx.lineTo(hx, s.harpoon.tipY);
        ctx.stroke();
        // arrow tip
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(hx, s.harpoon.tipY - 8);
        ctx.lineTo(hx - 6, s.harpoon.tipY + 4);
        ctx.lineTo(hx + 6, s.harpoon.tipY + 4);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Capsules (falling / waiting power-up drops)
    s.capsules.forEach((c) => {
      if (c.landed && c.life < 2 && Math.floor(c.life * 8) % 2 === 0) return; // blink when expiring
      drawCapsule(ctx, c);
    });

    // Bubbles
    const now = performance.now();
    s.bubbles.forEach((b) => {
      const t = TIERS[b.tier];
      const grad = ctx.createRadialGradient(b.x - b.r * 0.35, b.y - b.r * 0.4, b.r * 0.1, b.x, b.y, b.r);
      grad.addColorStop(0, 'rgba(255,255,255,0.9)');
      grad.addColorStop(0.25, t.color);
      grad.addColorStop(1, 'rgba(10,15,30,0.15)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // shine
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.arc(b.x - b.r * 0.32, b.y - b.r * 0.36, b.r * 0.16, 0, Math.PI * 2);
      ctx.fill();
      // hidden/nested bubble: a subtle golden inner core so keen players learn the tell
      if (b.hidden) {
        const pulse = 0.4 + 0.25 * Math.sin(now / 240 + b.id);
        ctx.save();
        ctx.strokeStyle = `rgba(253,224,71,${pulse})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * 0.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgba(253,224,71,${pulse * 0.7})`;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * 0.14, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      // special bubble: sparkly glowing ring in its power-up colour
      if (b.power) {
        const col = POWERUPS[b.power].color;
        ctx.save();
        ctx.strokeStyle = col;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = col;
        ctx.shadowBlur = 14;
        ctx.setLineDash([5, 5]);
        ctx.lineDashOffset = -(now / 40) % 10;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r + 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    });

    // Player
    const px = s.player.x;
    const py = FLOOR - PLAYER_H;
    const blink = s.invuln > 0 && Math.floor(s.invuln * 10) % 2 === 0;
    if (!blink) {
      ctx.fillStyle = '#22d3ee';
      ctx.strokeStyle = '#0e7490';
      ctx.lineWidth = 2;
      // body
      ctx.beginPath();
      ctx.roundRect(px - PLAYER_W / 2, py + 12, PLAYER_W, PLAYER_H - 12, 5);
      ctx.fill();
      ctx.stroke();
      // head
      ctx.fillStyle = '#a5f3fc';
      ctx.beginPath();
      ctx.arc(px, py + 8, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // shield power-up: protective ring
      if (s.power && s.power.type === 'shield') {
        ctx.save();
        ctx.strokeStyle = 'rgba(167,139,250,0.9)';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#a78bfa';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(px, FLOOR - PLAYER_H / 2, PLAYER_W, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Dim-lighting gimmick: darken the arena except a pool of light around the player
    if (s.mod.dim) {
      const lg = ctx.createRadialGradient(px, FLOOR - PLAYER_H, 24, px, FLOOR - PLAYER_H, 260);
      lg.addColorStop(0, 'rgba(3,6,16,0)');
      lg.addColorStop(0.7, 'rgba(3,6,16,0.55)');
      lg.addColorStop(1, 'rgba(3,6,16,0.92)');
      ctx.fillStyle = lg;
      ctx.fillRect(L, TOP, R - L, FLOOR - TOP);
    }

    // Floating surprise hint from a just-popped hidden bubble
    if (s.flashHint && s.flashHint.life > 0) {
      const a = Math.min(1, s.flashHint.life * 1.6);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = '#fde68a';
      ctx.font = '800 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(s.flashHint.text, s.flashHint.x, s.flashHint.y - (0.9 - s.flashHint.life) * 40);
      ctx.restore();
      ctx.textAlign = 'left';
    }

    // HUD text
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE ${s.score}`, LEFT + 8, TOP + 20);
    ctx.textAlign = 'center';
    ctx.fillText(`LEVEL ${s.level}`, W / 2, TOP + 20);
    ctx.textAlign = 'right';
    ctx.fillText('♥'.repeat(Math.max(0, s.lives)), RIGHT - 8, TOP + 20);
    ctx.textAlign = 'left';

    if (s.interLevel > 0 && s.lives > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.textAlign = 'center';
      ctx.font = '800 30px system-ui, sans-serif';
      ctx.fillText(`LEVEL ${s.level}`, W / 2, H / 2);
      ctx.textAlign = 'left';
    }
  }, []);

  const endGame = useCallback((s) => {
    cancelAnimationFrame(s.raf);
    s.raf = null;
    if (!wonLogged.current) saveResult('loss', s); // only a loss if they never cleared level 1
    setScore(s.score);
    setLives(0);
    setBestScore((b) => Math.max(b, s.score));
    setGameStatus('over');
  }, [saveResult]);

  const update = useCallback((dt) => {
    const s = stateRef.current;
    const L = s.bounds.left;
    const R = s.bounds.right;

    // Timers
    if (s.cooldown > 0) s.cooldown = Math.max(0, s.cooldown - dt);
    if (s.invuln > 0) s.invuln = Math.max(0, s.invuln - dt);
    if (s.power) {
      s.power.time -= dt;
      if (s.power.time <= 0) s.power = null;
    }

    // Sync the on-screen power indicator (guarded so it only re-renders on change)
    const puKey = s.power ? `${s.power.type}:${Math.ceil(s.power.time)}` : '';
    if (puKey !== powerUIRef.current) {
      powerUIRef.current = puKey;
      setPower(s.power ? { type: s.power.type, time: Math.ceil(s.power.time) } : null);
    }

    const shield = !!(s.power && s.power.type === 'shield');
    const spikes = !!(s.power && s.power.type === 'spikes');
    const laser = !!(s.power && s.power.type === 'laser');
    const freeze = !!(s.power && s.power.type === 'freeze');
    const mega = !!(s.power && s.power.type === 'mega');
    const fireCd = (s.power && s.power.type === 'rapid') ? RAPID_COOLDOWN : FIRE_COOLDOWN;

    // Transient surprise-hint text lifetime
    if (s.flashHint) {
      s.flashHint.life -= dt;
      if (s.flashHint.life <= 0) s.flashHint = null;
    }

    // Player movement
    const pv = 280;
    let vx = 0;
    if (s.input.left) vx -= pv;
    if (s.input.right) vx += pv;
    s.player.x += vx * dt;
    s.player.x = Math.max(L + PLAYER_W / 2, Math.min(R - PLAYER_W / 2, s.player.x));

    // Capsules: fall, rest on floor, expire, and get collected on contact
    {
      const cpx = s.player.x - PLAYER_W / 2;
      const cpy = FLOOR - PLAYER_H;
      for (let i = s.capsules.length - 1; i >= 0; i--) {
        const c = s.capsules[i];
        if (!c.landed) {
          c.y += CAPSULE_FALL * dt;
          if (c.y + CAPSULE_R >= FLOOR) { c.y = FLOOR - CAPSULE_R; c.landed = true; }
        } else {
          c.life -= dt;
        }
        if (circleRectHit(c.x, c.y, CAPSULE_R, cpx, cpy, PLAYER_W, PLAYER_H)) {
          s.power = { type: c.type, time: POWERUPS[c.type].duration };
          flashToast(`${POWERUPS[c.type].icon} ${POWERUPS[c.type].label}!`);
          s.capsules.splice(i, 1);
          continue;
        }
        if (c.landed && c.life <= 0) s.capsules.splice(i, 1);
      }
    }

    // Inter-level pause
    if (s.interLevel > 0) {
      s.interLevel = Math.max(0, s.interLevel - dt);
      if (s.interLevel === 0) {
        const setup = buildLevel(s.level, diffRef.current);
        s.bubbles = setup.bubbles;
        s.bounds = setup.bounds;
        s.speed = setup.speed;
        s.platforms = setup.platforms;
        s.mod = setup.mod;
      }
      return;
    }

    // Fire harpoon (disabled while Laser is active — laser handles firing).
    // Spikes makes the fired shot a piercing barbed harpoon (normal fire rhythm).
    if (!laser) {
      if (s.input.fire && !s.harpoon && s.cooldown === 0) {
        s.harpoon = { x: s.player.x, tipY: FLOOR, pierce: spikes };
      }
    }
    s.input.fire = false; // edge-triggered

    // Laser: continuous piercing beam that pops every bubble in its column
    s.laserOn = false;
    if (laser && s.input.fireHeld) {
      s.laserOn = true;
      const bx = s.player.x;
      let popped = false;
      for (let i = s.bubbles.length - 1; i >= 0; i--) {
        if (Math.abs(s.bubbles[i].x - bx) <= s.bubbles[i].r) { popBubbleAt(s, i); popped = true; }
      }
      if (popped) setScore(s.score);
    }

    // Moving platforms slide horizontally between their min/max, reversing at bounds
    for (const p of s.platforms) {
      if (!p.vx) continue;
      p.x += p.vx * dt;
      if (p.x < p.min) { p.x = p.min; p.vx = Math.abs(p.vx); }
      if (p.x + p.w > p.max) { p.x = p.max - p.w; p.vx = -Math.abs(p.vx); }
    }

    // Harpoon travel — stops at the ceiling, or at the underside of a platform that
    // sits over its column (a deliberate obstacle that forces repositioning).
    if (s.harpoon) {
      s.harpoon.tipY -= HARPOON_SPEED * dt;
      let stopY = TOP;
      for (const p of s.platforms) {
        if (s.harpoon.x >= p.x && s.harpoon.x <= p.x + p.w) stopY = Math.max(stopY, p.y + p.h);
      }
      if (s.harpoon.tipY <= stopY) {
        // A piercing shot that reaches a platform has already popped what it passed;
        // it simply retracts at the barrier like a normal shot.
        s.harpoon = null;
        s.cooldown = fireCd;
      }
    }

    // Bubble physics (Freeze slows bubble time; per-level gravity/bounce modifiers)
    const bt = freeze ? dt * FREEZE_SCALE : dt;
    const grav = GRAVITY * (s.mod.gravityMul || 1);
    const bounceMul = s.mod.bounceMul || 1;
    for (const b of s.bubbles) {
      const bounce = TIERS[b.tier].bounce * s.speed * bounceMul;
      b.vy += grav * bt;
      b.x += b.vx * bt;
      b.y += b.vy * bt;
      // side walls
      if (b.x - b.r < L) { b.x = L + b.r; b.vx = Math.abs(b.vx); }
      if (b.x + b.r > R) { b.x = R - b.r; b.vx = -Math.abs(b.vx); }
      // ceiling
      if (b.y - b.r < TOP) { b.y = TOP + b.r; b.vy = Math.abs(b.vy); }
      // floor — elastic bounce to characteristic height
      if (b.y + b.r > FLOOR) {
        b.y = FLOOR - b.r;
        b.vy = -bounce;
      }
      // platform ledges — same elastic bounce as the floor/walls
      for (const p of s.platforms) collideBubblePlatform(b, p, bounce);
    }

    // Harpoon → bubble collision. A piercing (spiked) shot pops EVERY bubble along
    // its column and keeps flying; a normal shot stops at the first hit. Mega Pop
    // makes any hit destroy the whole bubble outright (no split).
    if (s.harpoon) {
      const hx = s.harpoon.x;
      const tipY = s.harpoon.tipY;
      if (s.harpoon.pierce) {
        let popped = false;
        for (let i = s.bubbles.length - 1; i >= 0; i--) {
          const b = s.bubbles[i];
          if (Math.abs(b.x - hx) <= b.r && b.y + b.r >= tipY) { popBubbleAt(s, i, mega); popped = true; }
        }
        if (popped) setScore(s.score);
      } else {
        for (let i = 0; i < s.bubbles.length; i++) {
          const b = s.bubbles[i];
          if (Math.abs(b.x - hx) <= b.r && b.y + b.r >= tipY) {
            popBubbleAt(s, i, mega);
            s.harpoon = null;
            s.cooldown = fireCd;
            setScore(s.score);
            break;
          }
        }
      }
    }

    // Player ↔ bubble collision (Shield grants immunity)
    if (s.invuln === 0 && !shield) {
      const px = s.player.x - PLAYER_W / 2;
      const py = FLOOR - PLAYER_H;
      for (const b of s.bubbles) {
        if (circleRectHit(b.x, b.y, b.r, px, py, PLAYER_W, PLAYER_H)) {
          s.lives -= 1;
          setLives(s.lives);
          if (s.lives <= 0) {
            endGame(s);
            return;
          }
          s.invuln = RESPAWN_INVULN;
          s.player.x = (L + R) / 2;
          s.harpoon = null;
          s.cooldown = fireCd;
          s.power = null;   // lose the active power-up when hit
          break;
        }
      }
    }

    // Level cleared?
    if (s.bubbles.length === 0 && s.interLevel === 0) {
      const bonus = 100 * s.level;
      s.score += bonus;
      setScore(s.score);
      if (s.level === 1) {
        saveResult('win', s);
        flashToast('Level 1 cleared — Win saved! Keep going for bonus.');
      } else {
        flashToast(`Level ${s.level} cleared! +${bonus}`);
      }
      s.level += 1;
      setLevel(s.level);
      s.interLevel = INTER_LEVEL;
      s.harpoon = null;
      s.capsules = [];
    }
  }, [endGame, saveResult, flashToast]);

  const loop = useCallback((now) => {
    const s = stateRef.current;
    const dt = Math.min((now - s.lastTime) / 1000, 0.033);
    s.lastTime = now;
    update(dt);
    draw();
    if (s.raf !== null) s.raf = requestAnimationFrame(loop);
  }, [update, draw]);

  const startGame = useCallback(() => {
    cancelAnimationFrame(stateRef.current.raf);
    diffRef.current = difficulty;
    saved.current = false;
    wonLogged.current = false;
    powerUIRef.current = '';
    const st = initState(difficulty);
    st.lastTime = performance.now();
    stateRef.current = st;
    setScore(0);
    setLives(3);
    setLevel(1);
    setPower(null);
    setToast('');
    setGameStatus('playing');
    st.raf = requestAnimationFrame(loop);
  }, [difficulty, loop]);

  // Keyboard
  useEffect(() => {
    const s = () => stateRef.current;
    const down = (e) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') { s().input.left = true; e.preventDefault(); }
      else if (k === 'arrowright' || k === 'd') { s().input.right = true; e.preventDefault(); }
      else if (k === 'arrowup' || k === ' ' || k === 'w') { s().input.fire = true; s().input.fireHeld = true; e.preventDefault(); }
    };
    const up = (e) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') s().input.left = false;
      else if (k === 'arrowright' || k === 'd') s().input.right = false;
      else if (k === 'arrowup' || k === ' ' || k === 'w') s().input.fireHeld = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // Touch button helpers
  const hold = (key, val) => (e) => {
    e.preventDefault();
    const s = stateRef.current;
    if (key === 'fire') {
      if (val) { s.input.fire = true; s.input.fireHeld = true; }
      else s.input.fireHeld = false;
    } else {
      s.input[key] = val;
    }
  };

  useEffect(() => { draw(); }, [draw]);

  return (
    <div className="game-page">
      <div className="game-header">
        <Link to="/games" className="game-back">← Games</Link>
        <h1 className="game-title">Bubble Trouble</h1>
        <p className="game-subtitle">Pop the bouncing bubbles with your harpoon — but never let one touch you.</p>
      </div>

      <HowToPlay>
        <p><b>Objective:</b> clear every bubble from the level by shooting them, without getting touched.</p>
        <ul>
          <li>Move with the Left/Right arrows or A/D. Fire your harpoon straight up with Up, Space, or W.</li>
          <li>On mobile use the on-screen ◄ / Fire / ► buttons below the board.</li>
          <li>Only one harpoon can be in the air at a time, and there's a brief cooldown after it retracts — pick your shots.</li>
          <li>A large bubble splits into two mediums, a medium into two smalls, and a small pops for good. Smaller bubbles score more (large 10, medium 20, small 40).</li>
          <li>Touching <b>any</b> bubble costs a life. You have 3 lives, with brief invulnerability after each hit.</li>
          <li>Levels get more varied as you climb — solid ledges that bubbles ricochet off (and that can block your shot), extra-bouncy or heavy-gravity arenas, dim-lit levels, sliding platforms, and swarms of small bubbles.</li>
          <li>Watch for bubbles with a faint golden core — those are <b>hidden</b> ones that reveal a surprise when popped (bonus points, a guaranteed power-up, or a small bubble tucked inside).</li>
          <li><b>Power-ups:</b> some bubbles glow. Pop one to drop a capsule — walk into it to grab a temporary ⚡ Laser (held piercing beam), 🔱 Spikes (your shot becomes a barbed harpoon that pierces every bubble in its path in one throw), 🔥 Rapid Fire, 🛡️ Shield (bubble immunity), ❄️ Freeze (slows every bubble), or 💥 Mega Pop (each hit destroys a bubble outright, no splitting). Getting hit clears your active power-up.</li>
          <li>Clear Level 1 to win — then keep playing higher levels for bonus points.</li>
        </ul>
      </HowToPlay>

      <div className="game-controls-bar">
        <div className="game-difficulty-select">
          {['easy', 'medium', 'hard'].map((d) => (
            <button key={d} className={`difficulty-btn${difficulty === d ? ' active' : ''}`}
              onClick={() => setDifficulty(d)}>
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
        <button className="gs-btn gs-btn-primary gs-btn-sm" onClick={startGame}>
          {gameStatus === 'idle' ? 'Start Game' : 'New Game'}
        </button>
      </div>

      {isLoggedIn() && (
        <div className="game-stats-bar">
          <span>Games Won: <b>{stats.wins}</b></span>
          <span>Best: <b>{Math.max(stats.best_score || 0, bestScore)}</b></span>
        </div>
      )}

      <div className="bt-wrapper">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="bt-canvas"
        />

        {toast && <div className="bt-toast">{toast}</div>}

        {power && (
          <div className={`bt-power bt-power-${power.type}`}>
            <span className="bt-power-icon">{POWERUPS[power.type].icon}</span>
            <span className="bt-power-label">{POWERUPS[power.type].label}</span>
            <span className="bt-power-time">{power.time}s</span>
          </div>
        )}

        {gameStatus === 'idle' && (
          <div className="bt-overlay" onClick={startGame} style={{ cursor: 'pointer' }}>
            <div className="bt-overlay-inner">
              <div className="bt-overlay-emoji">🎯</div>
              <h3>Bubble Trouble</h3>
              <p>Press <b>Start Game</b> to play.</p>
              <p style={{ fontSize: 13, opacity: 0.7 }}>Move: ← → / A D · Fire: ↑ Space W</p>
              <p style={{ fontSize: 12, opacity: 0.55, marginTop: 4 }}>(or tap anywhere here)</p>
            </div>
          </div>
        )}

        {gameStatus === 'over' && (
          <div className="bt-overlay">
            <div className="bt-overlay-inner">
              <div className="bt-overlay-emoji">💥</div>
              <h3>Game Over</h3>
              <p>Reached Level <b>{level}</b> · Score <b>{score}</b></p>
              <button className="gs-btn gs-btn-primary" onClick={startGame} style={{ marginTop: 10 }}>Play Again</button>
            </div>
          </div>
        )}
      </div>

      <div className="game-touch-controls bt-touch">
        <button
          onPointerDown={hold('left', true)} onPointerUp={hold('left', false)}
          onPointerLeave={hold('left', false)} onPointerCancel={hold('left', false)}
        >◄</button>
        <button
          className="bt-fire-btn"
          onPointerDown={hold('fire', true)}
          onPointerUp={hold('fire', false)}
          onPointerLeave={hold('fire', false)} onPointerCancel={hold('fire', false)}
        >▲ Fire</button>
        <button
          onPointerDown={hold('right', true)} onPointerUp={hold('right', false)}
          onPointerLeave={hold('right', false)} onPointerCancel={hold('right', false)}
        >►</button>
      </div>
    </div>
  );
}
