import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';
import HowToPlay from './HowToPlay';
import './TankDuel.css';

// ── Battlefield dimensions ──
const W = 760;
const H = 460;

// ── Physics ──
const GRAVITY = 320;      // px / s^2 (downward)
const MAX_SPEED = 680;    // muzzle velocity at 100% power (px / s)
const WIND_MAX = 100;     // max |wind| sideways accel (px / s^2)
const HOMING = 100;       // guided-shot lateral steer accel (px / s^2)

// ── Napalm fire (damage-over-time) ──
const FIRE_TICK = 0.6;    // seconds between DoT ticks for a burning patch
const FIRE_DMG = 4;       // damage per tick to a tank standing in the fire

// ── Tank geometry ──
const TANK_W = 26;
const TANK_H = 12;
const TANK_R = 16;        // collision / blast-target radius
const BARREL_LEN = 22;

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const clampCol = (x) => Math.max(0, Math.min(W - 1, Math.round(x)));
const randWind = () => rand(-WIND_MAX, WIND_MAX);

// ── Weapons: limited ammo per type ──
const WEAPONS = {
  standard: { key: 'standard', name: 'Standard', icon: '●', damage: 26, radius: 26, color: '#fbbf24' },
  big:      { key: 'big',      name: 'Big Bomb', icon: '💣', damage: 46, radius: 46, color: '#f97316' },
  cluster:  { key: 'cluster',  name: 'Cluster',  icon: '✳️', damage: 18, radius: 20, color: '#a3e635', clusters: 5 },
  digger:   { key: 'digger',   name: 'Digger',   icon: '⛏️', damage: 8,  radius: 14, color: '#60a5fa', depth: true },
  guided:   { key: 'guided',   name: 'Guided',   icon: '🎯', damage: 30, radius: 28, color: '#f472b6', homing: true },
  // Napalm: small impact blast, then a burning patch that deals DoT over several seconds.
  napalm:   { key: 'napalm',   name: 'Napalm',   icon: '🔥', damage: 10, radius: 18, color: '#fb923c', napalm: true, fireR: 52, fireLife: 5.5 },
  // MIRV: splits mid-air (after apex, on the way down) into independent warheads.
  mirv:     { key: 'mirv',     name: 'MIRV',     icon: '🚀', damage: 20, radius: 22, color: '#c084fc', mirv: true, warheads: 4,
              child: { key: 'mirv_warhead', name: 'Warhead', damage: 20, radius: 22, color: '#c084fc' } },
  // Nuke: single-use, enormous blast/crater/damage.
  nuke:     { key: 'nuke',     name: 'Nuke',     icon: '☢️', damage: 120, radius: 90, color: '#fde047' },
  // Earthquake: wide, shallow terrain collapse plus modest area damage.
  quake:    { key: 'quake',    name: 'Quake',    icon: '🌍', damage: 14, radius: 0, color: '#a16207', quake: true, span: 110, drop: 34 },
};
const WEAPON_ORDER = ['standard', 'big', 'cluster', 'digger', 'guided', 'napalm', 'mirv', 'nuke', 'quake'];
const defaultAmmo = () => ({ standard: Infinity, big: 4, cluster: 3, digger: 3, guided: 2, napalm: 2, mirv: 2, nuke: 1, quake: 2 });

// ── Procedural terrain (1-D midpoint displacement) ──
// Returns a Float32Array of length W; each value is the y-coordinate of the
// ground surface at that column (smaller y = higher hill). Solid dirt fills
// from that y down to H, so it can be carved by lowering values.
function genTerrain() {
  const size = 1024; // power of two >= W
  const arr = new Float32Array(size + 1);
  const base = H * 0.62;
  arr[0] = base + rand(-40, 40);
  arr[size] = base + rand(-40, 40);
  let step = size;
  let disp = H * 0.30;
  while (step > 1) {
    const half = step / 2;
    for (let i = half; i < size; i += step) {
      const avg = (arr[i - half] + arr[i + half]) / 2;
      arr[i] = avg + rand(-disp, disp);
    }
    step = half;
    disp *= 0.55; // roughness — keeps hills jagged but not spiky
  }
  const g = new Float32Array(W);
  for (let x = 0; x < W; x++) {
    const idx = (x / (W - 1)) * size;
    const i0 = Math.floor(idx);
    const frac = idx - i0;
    const a = arr[i0];
    const b = arr[Math.min(size, i0 + 1)];
    let v = a + (b - a) * frac;
    v = clamp(v, H * 0.32, H * 0.9);
    g[x] = v;
  }
  return g;
}

function makeTank(x, terrain, angle, color, name) {
  return { x, y: terrain[clampCol(x)], vy: 0, angle, power: 55, hp: 100, color, name };
}

function initState() {
  const terrain = genTerrain();
  const player = makeTank(60, terrain, 50, '#38bdf8', 'You');
  const ai = makeTank(W - 60, terrain, 130, '#f87171', 'Enemy');
  return {
    terrain,
    tanks: [player, ai],       // [0] = player, [1] = AI
    turn: 'player',
    phase: 'idle',             // idle | aim | flying | explode | ai_think | over
    projectiles: [],
    explosions: [],
    particles: [],
    fires: [],                 // active napalm burn patches (persist across turns)
    wind: randWind(),
    selectedWeapon: 'standard',
    ammo: { player: defaultAmmo(), ai: defaultAmmo() },
    playerDamage: 0,
    aiTimer: 0,
    aiShot: null,
    explodeTimer: 0,
    won: false,
    finalScore: 0,
  };
}

// ── Pure terrain/damage helpers (operate on the passed state, never a captured one) ──
function carveCrater(terrain, cx, cy, r) {
  const x0 = Math.round(cx - r);
  const x1 = Math.round(cx + r);
  for (let x = x0; x <= x1; x++) {
    if (x < 0 || x >= W) continue;
    const dx = x - cx;
    if (Math.abs(dx) > r) continue;
    const dy = Math.sqrt(r * r - dx * dx);
    const bottom = cy + dy;
    if (bottom > terrain[x]) terrain[x] = Math.min(H, bottom); // only ever lower the ground
  }
}

// Narrow, deep vertical slot (heightmap can't hold true tunnels/overhangs, so a
// digger carves a deep column downward from its impact point).
function carveTunnel(terrain, cx) {
  const r = 8;
  const depth = 150;
  const x0 = Math.round(cx - r);
  const x1 = Math.round(cx + r);
  for (let x = x0; x <= x1; x++) {
    if (x < 0 || x >= W) continue;
    const dxn = (x - cx) / r;
    if (Math.abs(dxn) > 1) continue;
    const dd = depth * Math.sqrt(1 - dxn * dxn);
    terrain[x] = Math.min(H, terrain[x] + dd);
  }
}

// Wide, shallow terrain collapse for the earthquake weapon: lowers the surface
// across a broad horizontal span (tapering to the edges, with a little noise).
function carveQuake(terrain, cx, span, drop) {
  const x0 = Math.round(cx - span);
  const x1 = Math.round(cx + span);
  for (let x = x0; x <= x1; x++) {
    if (x < 0 || x >= W) continue;
    const t = 1 - Math.abs(x - cx) / span; // 1 at centre → 0 at the edges
    if (t <= 0) continue;
    const dd = drop * t * (0.6 + Math.random() * 0.6);
    terrain[x] = Math.min(H, terrain[x] + dd); // only ever lower the ground
  }
}

// Blast damage is applied to EVERY tank within reach — never attacker-exempt.
// `owner` is used only to attribute score (damage the player deals to the enemy);
// it deliberately does NOT shield the firer, so you can hurt yourself with your
// own blast (and the AI can hurt itself with its own), symmetrically.
function applyDamage(s, x, y, reach, dmg, owner) {
  for (let i = 0; i < s.tanks.length; i++) {
    const t = s.tanks[i];
    const cy = t.y - TANK_H * 0.5;
    const d = Math.hypot(t.x - x, cy - y);
    const r = reach + TANK_R;
    if (d < r) {
      const applied = dmg * (1 - d / r);
      if (applied > 0) {
        t.hp = Math.max(0, t.hp - applied);
        if (owner === 'player' && i === 1) s.playerDamage += applied;
      }
    }
  }
}

function spawnParticles(s, x, y, color) {
  for (let k = 0; k < 12; k++) {
    s.particles.push({
      x, y,
      vx: rand(-140, 140),
      vy: rand(-190, 20),
      life: rand(0.3, 0.7),
      max: 0.7,
      color,
    });
  }
}

function detonate(s, x, y, weapon, owner) {
  // ── Napalm: small blast + a lingering fire patch that hugs the terrain ──
  if (weapon.napalm) {
    carveCrater(s.terrain, x, y, weapon.radius);
    applyDamage(s, x, y, weapon.radius * 1.15, weapon.damage, owner);
    s.explosions.push({ x, y, maxR: weapon.radius * 1.6, age: 0, life: 0.5, color: weapon.color });
    spawnParticles(s, x, y, weapon.color);
    s.fires.push({ x, r: weapon.fireR, life: weapon.fireLife, tick: FIRE_TICK, color: weapon.color });
    return;
  }
  // ── Earthquake: wide shallow collapse + modest area damage ──
  if (weapon.quake) {
    carveQuake(s.terrain, x, weapon.span, weapon.drop);
    applyDamage(s, x, y, weapon.span * 0.9, weapon.damage, owner);
    const stepX = weapon.span / 2;
    for (let ox = -weapon.span; ox <= weapon.span + 1; ox += stepX) {
      const gx = clamp(x + ox, 2, W - 2);
      const gy = s.terrain[clampCol(gx)];
      s.explosions.push({ x: gx, y: gy, maxR: 34, age: 0, life: 0.5, color: weapon.color });
      spawnParticles(s, gx, gy, weapon.color);
    }
    return;
  }
  // ── MIRV fallback: a warhead normally splits mid-air, but if a parent MIRV
  //    somehow reaches impact unsplit, treat it as a single warhead blast ──
  if (weapon.mirv) {
    const c = weapon.child;
    carveCrater(s.terrain, x, y, c.radius);
    applyDamage(s, x, y, c.radius * 1.15, c.damage, owner);
    s.explosions.push({ x, y, maxR: c.radius * 1.6, age: 0, life: 0.5, color: c.color });
    spawnParticles(s, x, y, c.color);
    return;
  }

  const blasts = [];
  if (weapon.key === 'cluster') {
    blasts.push({ x, y, r: weapon.radius, dmg: weapon.damage });
    for (let i = 0; i < weapon.clusters; i++) {
      const ox = clamp(x + rand(-60, 60), 4, W - 4);
      const col = clampCol(ox);
      blasts.push({ x: ox, y: s.terrain[col] - 3, r: weapon.radius, dmg: weapon.damage });
    }
  } else {
    blasts.push({ x, y, r: weapon.radius, dmg: weapon.damage });
  }
  for (const b of blasts) {
    if (weapon.depth) carveTunnel(s.terrain, b.x);
    else carveCrater(s.terrain, b.x, b.y, b.r);
    applyDamage(s, b.x, b.y, weapon.depth ? b.r : b.r * 1.15, b.dmg, owner);
    s.explosions.push({ x: b.x, y: b.y, maxR: b.r * 1.6, age: 0, life: 0.5, color: weapon.color });
    spawnParticles(s, b.x, b.y, weapon.color);
  }
}

function launch(s, tank, weapon, owner) {
  const rad = (tank.angle * Math.PI) / 180;
  const v = (tank.power / 100) * MAX_SPEED;
  const pivotX = tank.x;
  const pivotY = tank.y - TANK_H;
  const tipX = pivotX + Math.cos(rad) * BARREL_LEN;
  const tipY = pivotY - Math.sin(rad) * BARREL_LEN;
  s.projectiles = [{
    x: tipX, y: tipY,
    vx: Math.cos(rad) * v,
    vy: -Math.sin(rad) * v,
    weapon, owner, trail: [], dead: false, age: 0, descend: 0,
  }];
  s.phase = 'flying';
}

function stepProjectiles(s, dt) {
  const spawned = []; // MIRV warheads created mid-loop; appended after iteration
  for (const p of s.projectiles) {
    p.vy += GRAVITY * dt;
    p.vx += s.wind * dt;
    if (p.weapon.homing) {
      const tgt = s.tanks[p.owner === 'player' ? 1 : 0];
      const dir = Math.sign(tgt.x - p.x) || 1;
      p.vx += dir * HOMING * dt;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.age += dt;
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 20) p.trail.shift();

    // Off the sides / bottom → a miss (bottom still detonates on the floor)
    if (p.x < -40 || p.x > W + 40) { p.dead = true; continue; }

    // ── MIRV: split mid-air, a moment after passing the apex (on the way down),
    //    into independent warheads that arc off on divergent trajectories ──
    if (p.weapon.mirv) {
      if (p.vy > 0) p.descend += dt;
      const overGround = p.y < s.terrain[clampCol(p.x)] && p.y < H;
      if (p.descend >= 0.30 && overGround) {
        const n = p.weapon.warheads;
        for (let k = 0; k < n; k++) {
          const t = n > 1 ? (k / (n - 1)) * 2 - 1 : 0; // spread factor -1..1
          spawned.push({
            x: p.x, y: p.y,
            vx: p.vx + t * 70 + rand(-15, 15),
            vy: p.vy - rand(20, 80), // upward kick → each warhead re-arcs and lands apart
            weapon: p.weapon.child, owner: p.owner, trail: [], dead: false, age: 0, descend: 0,
          });
        }
        s.explosions.push({ x: p.x, y: p.y, maxR: 18, age: 0, life: 0.25, color: p.weapon.color });
        p.dead = true;
        continue;
      }
    }

    let impact = null;
    if (p.y >= H) {
      impact = { x: clamp(p.x, 0, W - 1), y: H };
    } else {
      const col = clampCol(p.x);
      if (p.y >= s.terrain[col]) {
        impact = { x: p.x, y: s.terrain[col] };
      } else {
        for (let i = 0; i < s.tanks.length; i++) {
          const t = s.tanks[i];
          const cy = t.y - TANK_H * 0.5;
          if (Math.hypot(t.x - p.x, cy - p.y) < TANK_R) {
            impact = { x: p.x, y: p.y };
            break;
          }
        }
      }
    }
    if (impact) {
      detonate(s, impact.x, impact.y, p.weapon, p.owner);
      p.dead = true;
    }
  }
  if (spawned.length) s.projectiles = s.projectiles.concat(spawned);
  s.projectiles = s.projectiles.filter((p) => !p.dead);
  if (s.projectiles.length === 0) {
    s.phase = 'explode';
    s.explodeTimer = 0.6;
  }
}

function stepExplosions(s, dt) {
  for (const e of s.explosions) e.age += dt;
  s.explosions = s.explosions.filter((e) => e.age < e.life);
}

function stepParticles(s, dt) {
  for (const pa of s.particles) {
    pa.life -= dt;
    pa.vy += 220 * dt;
    pa.x += pa.vx * dt;
    pa.y += pa.vy * dt;
  }
  s.particles = s.particles.filter((pa) => pa.life > 0);
}

// Napalm burn patches: tick down over several seconds and periodically damage any
// tank standing within the patch (horizontal overlap + near the ground surface).
// Applies to whoever is in the fire — the tank that fired it is not exempt.
function stepFires(s, dt) {
  for (const f of s.fires) {
    f.life -= dt;
    f.tick -= dt;
    if (f.tick <= 0) {
      f.tick = FIRE_TICK;
      for (const t of s.tanks) {
        const onGround = Math.abs(t.y - s.terrain[clampCol(t.x)]) < 30;
        if (onGround && Math.abs(t.x - f.x) < f.r) {
          t.hp = Math.max(0, t.hp - FIRE_DMG);
        }
      }
    }
  }
  s.fires = s.fires.filter((f) => f.life > 0);
}

// After terrain is carved, tanks floating over a new gap fall to the ground.
function stepTankFall(s, dt) {
  for (const t of s.tanks) {
    const groundY = s.terrain[clampCol(t.x)];
    if (t.y < groundY - 0.5) {
      t.vy += GRAVITY * dt;
      t.y += t.vy * dt;
      if (t.y >= groundY) { t.y = groundY; t.vy = 0; }
    } else {
      t.y = groundY;
      t.vy = 0;
    }
  }
}

function tanksSettled(s) {
  return s.tanks.every((t) => t.y >= s.terrain[clampCol(t.x)] - 0.5);
}

// Basic ballistic AI: solve muzzle velocity for a chosen elevation to reach the
// player, ignoring wind (that plus a little noise makes it beatable).
function computeAiShot(s, difficulty) {
  const me = s.tanks[1];
  const foe = s.tanks[0];
  const ox = me.x;
  const oy = me.y - TANK_H;
  const tx = foe.x;
  const ty = foe.y - TANK_H * 0.5;
  const dx = tx - ox; // negative (foe is to the left)
  const dy = ty - oy; // positive if foe sits lower on screen

  let best = null;
  for (let elev = 62; elev >= 22; elev--) {
    const a = 180 - elev; // AI fires up-and-to-the-left
    const rad = (a * Math.PI) / 180;
    const cos = Math.cos(rad);
    const tan = Math.tan(rad);
    const denom = cos * cos * (dy + dx * tan);
    if (denom > 0) {
      const v2 = (0.5 * GRAVITY * dx * dx) / denom;
      if (v2 > 0) {
        const v = Math.sqrt(v2);
        if (v <= MAX_SPEED * 0.97) { best = { a, v }; break; }
      }
    }
  }
  if (!best) best = { a: 135, v: MAX_SPEED * 0.85 };

  const errs = { easy: { ang: 11, pow: 0.15 }, medium: { ang: 6, pow: 0.08 }, hard: { ang: 3, pow: 0.04 } }[difficulty] || { ang: 6, pow: 0.08 };
  const angle = clamp(best.a + rand(-errs.ang, errs.ang), 92, 176);
  const power = clamp((best.v / MAX_SPEED) * 100 * (1 + rand(-errs.pow, errs.pow)), 22, 100);

  // Pick a weapon: usually reach for an available special, else fall back to
  // Standard. Ammo-gated so it naturally varies its arsenal over a match.
  let weapon = 'standard';
  const r = Math.random();
  const a = s.ammo.ai;
  if (r < 0.10 && a.nuke > 0) weapon = 'nuke';
  else if (r < 0.24 && a.big > 0) weapon = 'big';
  else if (r < 0.36 && a.cluster > 0) weapon = 'cluster';
  else if (r < 0.46 && a.guided > 0) weapon = 'guided';
  else if (r < 0.56 && a.napalm > 0) weapon = 'napalm';
  else if (r < 0.66 && a.mirv > 0) weapon = 'mirv';
  else if (r < 0.74 && a.quake > 0) weapon = 'quake';

  return { angle, power, weapon };
}

export default function TankDuel() {
  const canvasRef = useRef(null);
  const stateRef = useRef(initState());
  const rafRef = useRef(null);
  const lastRef = useRef(0);
  const gameStatusRef = useRef('idle');
  const lastPhaseRef = useRef('idle');
  const difficultyRef = useRef('medium');
  const saved = useRef(false);

  const [gameStatus, setGameStatus] = useState('idle'); // idle | playing | over
  const [difficulty, setDifficulty] = useState('medium');
  const [turn, setTurn] = useState('player');
  const [phase, setPhase] = useState('idle');
  const [angle, setAngle] = useState(50);
  const [power, setPower] = useState(55);
  const [selWeapon, setSelWeapon] = useState('standard');
  const [ammoP, setAmmoP] = useState(defaultAmmo());
  const [pHp, setPHp] = useState(100);
  const [eHp, setEHp] = useState(100);
  const [wind, setWind] = useState(0);
  const [won, setWon] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [stats, setStats] = useState({ wins: 0, losses: 0, best_score: 0 });

  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);

  useEffect(() => {
    if (isLoggedIn()) {
      apiRequest('GET', null, '/game/stats').then((d) => {
        if (d?.tank_duel) setStats(d.tank_duel);
      }).catch(() => {});
    }
  }, []);

  const saveResult = useCallback((result, score) => {
    if (saved.current || !isLoggedIn()) return;
    saved.current = true;
    apiRequest('POST', { game_type: 'tank_duel', result, difficulty: difficultyRef.current, score }, '/game/save').catch(() => {});
  }, []);
  const saveResultRef = useRef(saveResult);
  useEffect(() => { saveResultRef.current = saveResult; }, [saveResult]);

  // Mirror the mutable engine state into React state — only at discrete
  // transitions, so the sliders aren't fought while the player drags them.
  const syncUI = useCallback(() => {
    const s = stateRef.current;
    lastPhaseRef.current = s.phase;
    setTurn(s.turn);
    setPhase(s.phase);
    setPHp(Math.round(s.tanks[0].hp));
    setEHp(Math.round(s.tanks[1].hp));
    setWind(s.wind);
    setAmmoP({ ...s.ammo.player });
    setAngle(Math.round(s.tanks[0].angle));
    setPower(Math.round(s.tanks[0].power));
    setSelWeapon(s.selectedWeapon);
  }, []);

  // End the match. `w` = did the player win. Callable from any phase so that a
  // kill from lingering napalm (which can land outside the normal explode-resolve
  // window, e.g. while a tank sits idle in 'aim') is handled correctly.
  const endGame = useCallback((w) => {
    const s = stateRef.current;
    s.phase = 'over';
    s.won = w;
    const score = Math.round(s.playerDamage * 4) + (w ? 600 : 0);
    s.finalScore = score;
    gameStatusRef.current = 'over';
    setGameStatus('over');
    setWon(w);
    setFinalScore(score);
    setPHp(Math.round(s.tanks[0].hp));
    setEHp(Math.round(s.tanks[1].hp));
    saveResultRef.current(w ? 'win' : 'loss', score);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;
    const terr = s.terrain;

    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#1e3a5f');
    sky.addColorStop(0.55, '#3b6ea5');
    sky.addColorStop(1, '#8fbad9');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Sun
    ctx.fillStyle = 'rgba(255,241,190,0.85)';
    ctx.beginPath();
    ctx.arc(W * 0.83, 66, 26, 0, TAU);
    ctx.fill();

    // Terrain (filled dirt silhouette)
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, terr[0]);
    for (let x = 1; x < W; x++) ctx.lineTo(x, terr[x]);
    ctx.lineTo(W - 1, H);
    ctx.closePath();
    const grd = ctx.createLinearGradient(0, H * 0.3, 0, H);
    grd.addColorStop(0, '#8b5a2b');
    grd.addColorStop(0.5, '#6b4423');
    grd.addColorStop(1, '#40280f');
    ctx.fillStyle = grd;
    ctx.fill();

    // Surface line
    ctx.beginPath();
    ctx.moveTo(0, terr[0]);
    for (let x = 1; x < W; x++) ctx.lineTo(x, terr[x]);
    ctx.strokeStyle = 'rgba(120,180,90,0.55)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Tanks
    for (const t of s.tanks) drawTank(ctx, t);

    // Projectiles + trails
    for (const p of s.projectiles) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      p.trail.forEach((pt, j) => { if (j === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y); });
      ctx.stroke();
      ctx.fillStyle = p.weapon.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, TAU);
      ctx.fill();
    }

    // Explosions
    for (const e of s.explosions) {
      const f = e.age / e.life;
      const r = e.maxR * (0.4 + 0.6 * Math.min(1, f * 1.4));
      const alpha = 1 - f;
      const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r);
      g.addColorStop(0, `rgba(255,255,220,${alpha})`);
      g.addColorStop(0.4, `rgba(255,160,40,${alpha * 0.9})`);
      g.addColorStop(1, 'rgba(200,40,10,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(e.x, e.y, r, 0, TAU);
      ctx.fill();
    }

    // Particles
    for (const pa of s.particles) {
      ctx.globalAlpha = Math.max(0, pa.life / pa.max);
      ctx.fillStyle = pa.color;
      ctx.fillRect(pa.x, pa.y, 2.5, 2.5);
    }
    ctx.globalAlpha = 1;

    // Napalm fires
    drawFires(ctx, s);

    // Aim preview (player's turn only)
    if (s.phase === 'aim' && s.turn === 'player') drawAimPreview(ctx, s);

    // Wind indicator
    drawWind(ctx, s);
  }, []);

  const step = useCallback((dt) => {
    const s = stateRef.current;
    stepParticles(s, dt);
    stepFires(s, dt); // napalm DoT — burns every frame, regardless of phase

    // A napalm kill can happen while a tank is idle in 'aim'/'ai_think', where the
    // normal explode-resolve below never runs — catch that here so the game ends.
    if (s.phase === 'aim' || s.phase === 'ai_think') {
      const pDead = s.tanks[0].hp <= 0;
      const aiDead = s.tanks[1].hp <= 0;
      if (pDead || aiDead) { endGame(aiDead); return; }
    }

    if (s.phase === 'ai_think') {
      s.aiTimer -= dt;
      if (s.aiShot) {
        const me = s.tanks[1];
        me.angle += (s.aiShot.angle - me.angle) * Math.min(1, dt * 7);
        me.power += (s.aiShot.power - me.power) * Math.min(1, dt * 7);
      }
      if (s.aiTimer <= 0) {
        const shot = s.aiShot;
        const me = s.tanks[1];
        me.angle = shot.angle;
        me.power = shot.power;
        if (s.ammo.ai[shot.weapon] !== Infinity && s.ammo.ai[shot.weapon] > 0) s.ammo.ai[shot.weapon] -= 1;
        launch(s, me, WEAPONS[shot.weapon], 'ai');
      }
    } else if (s.phase === 'flying') {
      stepProjectiles(s, dt);
    } else if (s.phase === 'explode') {
      stepExplosions(s, dt);
      stepTankFall(s, dt);
      s.explodeTimer -= dt;
      if (s.explodeTimer <= 0 && s.explosions.length === 0 && tanksSettled(s)) {
        // ── Resolve end of turn ──
        const aiDead = s.tanks[1].hp <= 0;
        const pDead = s.tanks[0].hp <= 0;
        if (aiDead || pDead) {
          endGame(aiDead);
        } else {
          s.turn = s.turn === 'player' ? 'ai' : 'player';
          s.wind = randWind();
          if (s.turn === 'ai') {
            s.aiShot = computeAiShot(s, difficultyRef.current);
            s.phase = 'ai_think';
            s.aiTimer = 0.9;
          } else {
            s.phase = 'aim';
          }
          syncUI();
        }
      }
    }

    // Detect a phase change that happened outside syncUI (e.g. AI just fired).
    if (s.phase !== lastPhaseRef.current && s.phase !== 'over') {
      syncUI();
    }
  }, [syncUI, endGame]);

  const loop = useCallback((now) => {
    let dt = (now - lastRef.current) / 1000;
    lastRef.current = now;
    if (dt > 0.05) dt = 0.05; // clamp big frame gaps (tab switch)
    if (gameStatusRef.current === 'playing') step(dt);
    draw();
    if (gameStatusRef.current === 'playing') {
      rafRef.current = requestAnimationFrame(loop);
    }
  }, [step, draw]);

  const startGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    saved.current = false;
    stateRef.current = initState();
    stateRef.current.phase = 'aim'; // initState() defaults to 'idle'; the player's first turn needs 'aim' immediately or the controls stay permanently disabled (nothing else ever transitions out of 'idle')
    gameStatusRef.current = 'playing';
    lastPhaseRef.current = 'aim';
    setGameStatus('playing');
    setWon(false);
    setFinalScore(0);
    syncUI();
    lastRef.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);
  }, [loop, syncUI]);

  const fireWeapon = useCallback(() => {
    const s = stateRef.current;
    if (gameStatusRef.current !== 'playing' || s.phase !== 'aim' || s.turn !== 'player') return;
    const wkey = s.selectedWeapon;
    const wep = WEAPONS[wkey];
    if (s.ammo.player[wkey] <= 0) return;
    if (s.ammo.player[wkey] !== Infinity) s.ammo.player[wkey] -= 1;
    launch(s, s.tanks[0], wep, 'player');
    if (s.ammo.player[wkey] !== Infinity && s.ammo.player[wkey] <= 0) s.selectedWeapon = 'standard';
    syncUI();
  }, [syncUI]);

  const selectWeapon = useCallback((key) => {
    const s = stateRef.current;
    if (gameStatusRef.current !== 'playing' || s.phase !== 'aim' || s.turn !== 'player') return;
    if (s.ammo.player[key] === Infinity || s.ammo.player[key] > 0) {
      s.selectedWeapon = key;
      setSelWeapon(key);
    }
  }, []);

  const nudge = useCallback((kind, delta) => {
    const s = stateRef.current;
    if (gameStatusRef.current !== 'playing' || s.phase !== 'aim' || s.turn !== 'player') return;
    const t = s.tanks[0];
    if (kind === 'angle') { t.angle = clamp(t.angle + delta, 0, 180); setAngle(Math.round(t.angle)); }
    else { t.power = clamp(t.power + delta, 0, 100); setPower(Math.round(t.power)); }
  }, []);

  // Keyboard controls (desktop fallback)
  useEffect(() => {
    const handler = (e) => {
      const s = stateRef.current;
      if (gameStatusRef.current !== 'playing' || s.phase !== 'aim' || s.turn !== 'player') return;
      const t = s.tanks[0];
      let handled = true;
      switch (e.key) {
        case 'ArrowLeft': t.angle = clamp(t.angle + 1.5, 0, 180); setAngle(Math.round(t.angle)); break;
        case 'ArrowRight': t.angle = clamp(t.angle - 1.5, 0, 180); setAngle(Math.round(t.angle)); break;
        case 'ArrowUp': t.power = clamp(t.power + 2, 0, 100); setPower(Math.round(t.power)); break;
        case 'ArrowDown': t.power = clamp(t.power - 2, 0, 100); setPower(Math.round(t.power)); break;
        case ' ': case 'Enter': fireWeapon(); break;
        case '1': case '2': case '3': case '4': case '5':
        case '6': case '7': case '8': case '9': {
          const wk = WEAPON_ORDER[Number(e.key) - 1];
          if (wk) selectWeapon(wk);
          break;
        }
        default: handled = false;
      }
      if (handled) e.preventDefault();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [fireWeapon, selectWeapon]);

  useEffect(() => { draw(); }, [draw]);
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const onAngle = (e) => {
    const v = Number(e.target.value);
    stateRef.current.tanks[0].angle = v;
    setAngle(v);
  };
  const onPower = (e) => {
    const v = Number(e.target.value);
    stateRef.current.tanks[0].power = v;
    setPower(v);
  };

  const ctrlDisabled = gameStatus !== 'playing' || turn !== 'player' || phase !== 'aim';
  const windMag = Math.round((Math.abs(wind) / WIND_MAX) * 100);
  const windDir = wind >= 0 ? '→' : '←';

  return (
    <div className="game-page">
      <div className="game-header">
        <Link to="/games" className="game-back">← Games</Link>
        <h1 className="game-title">Tank Duel</h1>
        <p className="game-subtitle">Turn-based artillery. Set angle &amp; power, mind the wind, blow up the enemy.</p>
      </div>

      <HowToPlay>
        <p><b>Objective:</b> destroy the enemy tank before it destroys you. First tank to 0 HP loses.</p>
        <ul>
          <li>Turns alternate: aim, then <b>Fire</b>. The enemy AI takes its shot right after yours.</li>
          <li><b>Angle</b> (0–180°) points the barrel; <b>Power</b> (0–100%) sets how hard you fire. Drag the sliders, use the ± buttons, or on desktop use <b>← →</b> for angle, <b>↑ ↓</b> for power, and <b>Space</b> to fire.</li>
          <li><b>Wind</b> is shown at the top of the battlefield and re-rolls every turn — it pushes the shell sideways in flight, so lead into it. A dotted arc previews your shot (it does <i>not</i> account for wind).</li>
          <li><b>Weapons</b> (limited ammo, keys 1–9): <b>Standard</b> (unlimited), <b>Big Bomb</b> (huge blast, ×4), <b>Cluster</b> (scatters mini-blasts, ×3), <b>Digger</b> (carves a deep pit / cover, ×3), <b>Guided</b> (curves toward the enemy, ×2), <b>Napalm</b> 🔥 (leaves a fire that burns anyone standing in it, ×2), <b>MIRV</b> 🚀 (splits mid-air into 4 warheads that scatter, ×2), <b>Nuke</b> ☢️ (one-use, massive blast, ×1), <b>Quake</b> 🌍 (wide shallow ground collapse, ×2).</li>
          <li><b>Careful:</b> explosions hurt <i>any</i> tank in range — including your own. Don't fire powerful weapons at point-blank range or drop napalm on your own position.</li>
          <li>Explosions carve craters into the dirt. Blow the ground out from under a tank and it tumbles into the hole.</li>
          <li>Score rewards damage dealt plus a bonus for winning. Higher difficulty = sharper enemy aim.</li>
        </ul>
      </HowToPlay>

      <div className="game-controls-bar">
        <div className="game-difficulty-select">
          {['easy', 'medium', 'hard'].map((d) => (
            <button key={d} className={`difficulty-btn${difficulty === d ? ' active' : ''}`}
              disabled={gameStatus === 'playing'}
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
          <span>Lost: <b>{stats.losses}</b></span>
          <span>Best: <b>{Math.max(stats.best_score, finalScore)}</b></span>
        </div>
      )}

      <div className="td-canvas-wrapper" style={{ width: '100%', maxWidth: W }}>
        <div className="td-hud">
          <span className="td-hud-tank td-hud-player">🔵 You <b>{pHp}</b></span>
          <span className={`td-turn td-turn-${turn}`}>
            {gameStatus !== 'playing' ? '—' : turn === 'player' ? 'YOUR TURN' : 'ENEMY TURN'}
          </span>
          <span className="td-hud-tank td-hud-enemy"><b>{eHp}</b> Enemy 🔴</span>
        </div>
        <div className="td-hud td-hud-sub">
          <span>Wind {windDir} <b>{windMag}</b></span>
          <span>Angle <b>{angle}°</b> · Power <b>{power}%</b></span>
        </div>

        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="td-canvas"
          style={{ touchAction: 'none', width: '100%', maxWidth: W, height: 'auto', display: 'block' }}
        />

        {gameStatus === 'idle' && (
          <div className="td-overlay" onClick={startGame} style={{ cursor: 'pointer' }}>
            <div className="td-overlay-inner">
              <div style={{ fontSize: 40 }}>🎯</div>
              <p>Press <b>Start Game</b> to deploy</p>
              <p style={{ fontSize: 13, opacity: 0.75 }}>Aim, adjust power, mind the wind, fire.</p>
              <p style={{ fontSize: 12, opacity: 0.55, marginTop: 4 }}>(or tap anywhere here)</p>
            </div>
          </div>
        )}

        {gameStatus === 'over' && (
          <div className="td-overlay">
            <div className="td-overlay-inner">
              <div style={{ fontSize: 44 }}>{won ? '🏆' : '💥'}</div>
              <h3>{won ? 'Victory!' : 'Defeated'}</h3>
              <p>Score: <b>{finalScore}</b></p>
              <button className="gs-btn gs-btn-primary" onClick={startGame}>Play Again</button>
            </div>
          </div>
        )}
      </div>

      <div className="td-panel">
        <div className="td-weapons">
          {WEAPON_ORDER.map((k) => {
            const w = WEAPONS[k];
            const cnt = ammoP[k];
            const out = cnt !== Infinity && cnt <= 0;
            return (
              <button
                key={k}
                className={`td-weapon${selWeapon === k ? ' active' : ''}`}
                disabled={ctrlDisabled || out}
                onClick={() => selectWeapon(k)}
                title={w.name}
              >
                <span className="td-weapon-icon">{w.icon}</span>
                <span className="td-weapon-name">{w.name}</span>
                <span className="td-weapon-ammo">{cnt === Infinity ? '∞' : cnt}</span>
              </button>
            );
          })}
        </div>

        <div className="td-aim">
          <div className="td-slider-row">
            <button className="td-nudge" disabled={ctrlDisabled} onClick={() => nudge('angle', -2)} aria-label="Angle down">−</button>
            <label className="td-slider">
              <span>Angle <b>{angle}°</b></span>
              <input type="range" min="0" max="180" step="1" value={angle} disabled={ctrlDisabled}
                onChange={onAngle} style={{ touchAction: 'none' }} />
            </label>
            <button className="td-nudge" disabled={ctrlDisabled} onClick={() => nudge('angle', 2)} aria-label="Angle up">+</button>
          </div>
          <div className="td-slider-row">
            <button className="td-nudge" disabled={ctrlDisabled} onClick={() => nudge('power', -3)} aria-label="Power down">−</button>
            <label className="td-slider">
              <span>Power <b>{power}%</b></span>
              <input type="range" min="0" max="100" step="1" value={power} disabled={ctrlDisabled}
                onChange={onPower} style={{ touchAction: 'none' }} />
            </label>
            <button className="td-nudge" disabled={ctrlDisabled} onClick={() => nudge('power', 3)} aria-label="Power up">+</button>
          </div>
          <button className="gs-btn gs-btn-primary td-fire" disabled={ctrlDisabled} onClick={fireWeapon}>
            🔥 Fire
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Canvas drawing helpers (module-level, pure) ──
function drawTank(ctx, t) {
  const bodyY = t.y - TANK_H;
  // Treads
  ctx.fillStyle = '#3f3f46';
  ctx.beginPath();
  ctx.roundRect(t.x - TANK_W / 2, t.y - 6, TANK_W, 7, 3);
  ctx.fill();
  // Body
  ctx.fillStyle = t.color;
  ctx.beginPath();
  ctx.roundRect(t.x - TANK_W / 2 + 2, bodyY, TANK_W - 4, TANK_H, 3);
  ctx.fill();
  // Turret dome
  ctx.beginPath();
  ctx.arc(t.x, bodyY, 7, Math.PI, 0);
  ctx.fill();
  // Barrel
  const rad = (t.angle * Math.PI) / 180;
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(t.x, bodyY);
  ctx.lineTo(t.x + Math.cos(rad) * BARREL_LEN, bodyY - Math.sin(rad) * BARREL_LEN);
  ctx.stroke();
  // Health bar
  const bw = 34;
  const bh = 5;
  const bx = t.x - bw / 2;
  const by = t.y - TANK_H - 20;
  const hpf = Math.max(0, t.hp) / 100;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
  ctx.fillStyle = hpf > 0.5 ? '#4ade80' : hpf > 0.25 ? '#facc15' : '#ef4444';
  ctx.fillRect(bx, by, bw * hpf, bh);
}

function drawFires(ctx, s) {
  for (const f of s.fires) {
    const fade = Math.min(1, f.life / 1.2); // fade out over the last ~1.2s
    for (let x = f.x - f.r; x <= f.x + f.r; x += 7) {
      const gx = clampCol(x);
      const gy = s.terrain[gx];
      const edge = 1 - Math.abs(x - f.x) / f.r; // shorter flames toward the edges
      if (edge <= 0) continue;
      const h = (8 + Math.random() * 14) * (0.5 + edge * 0.5);
      const w = 3 + Math.random() * 3;
      const g = ctx.createLinearGradient(x, gy, x, gy - h);
      g.addColorStop(0, `rgba(255,${120 + Math.random() * 60 | 0},20,${0.75 * fade})`);
      g.addColorStop(1, `rgba(255,240,120,0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - w, gy);
      ctx.quadraticCurveTo(x, gy - h * 1.3, x + w, gy);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawAimPreview(ctx, s) {
  const t = s.tanks[0];
  const rad = (t.angle * Math.PI) / 180;
  const v = (t.power / 100) * MAX_SPEED;
  let x = t.x + Math.cos(rad) * BARREL_LEN;
  let y = (t.y - TANK_H) - Math.sin(rad) * BARREL_LEN;
  let vx = Math.cos(rad) * v;
  let vy = -Math.sin(rad) * v;
  const dt = 1 / 60;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (let i = 0; i < 150; i++) {
    vy += GRAVITY * dt;
    x += vx * dt;
    y += vy * dt;
    if (x < 0 || x > W || y > H) break;
    if (y >= s.terrain[clampCol(x)]) break;
    if (i % 4 === 0) {
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, TAU);
      ctx.fill();
    }
  }
}

function drawWind(ctx, s) {
  const cx = W / 2;
  const cy = 22;
  const mag = Math.abs(s.wind);
  const dir = s.wind >= 0 ? 1 : -1;
  ctx.textAlign = 'center';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText('WIND', cx, cy - 6);
  const len = 8 + (mag / WIND_MAX) * 34;
  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - (dir * len) / 2, cy + 6);
  ctx.lineTo(cx + (dir * len) / 2, cy + 6);
  ctx.stroke();
  const hx = cx + (dir * len) / 2;
  ctx.beginPath();
  ctx.moveTo(hx, cy + 6);
  ctx.lineTo(hx - dir * 7, cy + 2);
  ctx.lineTo(hx - dir * 7, cy + 10);
  ctx.closePath();
  ctx.fillStyle = '#fde68a';
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText(String(Math.round((mag / WIND_MAX) * 100)), cx, cy + 24);
  ctx.textAlign = 'left';
}
