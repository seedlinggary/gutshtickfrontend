import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';
import HowToPlay from './HowToPlay';
import './Pinball.css';

const W = 440;
const H = 700;

const BALL_R = 9;
const GRAVITY = 880;         // px / s^2
const E_WALL = 0.55;         // wall restitution
const E_FLIP = 0.4;          // flipper restitution
const E_BUMP = 0.35;         // bumper restitution
const E_TARGET = 0.5;        // standup target restitution
const MAX_BALL_SPEED = 1500;
const DRAIN_Y = 664;
const START_BALLS = 3;
const WIN_SCORE = 100000;    // raised from 50,000 — more scoring paths (targets, multiball, orbit, skill) make points come faster

// Plunger / launch. LAUNCH_MIN is tuned so even the weakest plunge always
// clears the launch lane into the field (v=1000 lifts the ball ~568px, well
// past the lane exit near y=90) — a ball can never stall inside the lane.
const CHARGE_TIME = 1.1;     // seconds to charge the plunger to full
const LAUNCH_MIN = 1000;
const LAUNCH_MAX = 1240;

// Scoring
const BUMP_PTS = 1000;
const SLING_PTS = 200;
const TARGET_PTS = 750;
const SHOW_BONUS = 6000;     // complete the SHOW standup bank -> multiball
const LANE_PTS = 400;
const GOOD_BONUS = 4000;     // complete the GOOD rollover lanes
const ORBIT_PTS = 3000;      // complete the left loop
const SPIN_PTS = 120;        // per spinner pass
const SKILL_BONUS = 15000;   // release the plunger in the lit skill zone
const LANE_R = 15;           // rollover detection radius

// ── Round-2 bonuses ──
const COMBO_PTS = 500;       // per combo level (2x combo = +1000, 3x = +1500 …)
const COMBO_WINDOW = 1.5;    // seconds allowed between hits to keep a combo alive
const JACKPOT_PTS = 25000;   // first pop-bumper hit during multiball
const SAUCER_PTS = 2500;     // rolling the ball into the lock saucer
const MYSTERY_PTS = 3500;    // "points" outcome of the saucer mystery award
const BONUS_PER_UNIT = 500;  // end-of-ball bonus paid per collected bonus unit
const LOCKS_FOR_MB = 3;      // saucer locks needed to release the lock-multiball
const MAX_MULT = 5;          // bonus multiplier caps at 5x
// Minimum seconds between multiball grants. With two independent triggers
// (SHOW bank + lock saucer) both capable of releasing multiball, and the
// saucer re-capturable every 0.5s, multiball could otherwise re-fire again
// within seconds of the last one ending — reported as balls feeling like
// they "keep coming even as they go down." Completing a trigger while this
// cooldown is active still pays a bonus, it just doesn't add more balls.
const MULTIBALL_COOLDOWN = 20;

// Flippers.
// Center-drain gap tuning (answers "a small space so only a small chance the
// ball gets by"): at rest the flippers form a shallow V whose TIPS are the
// closest approach, tip separation D = 160 − 2·FLIP_LEN·cos(REST). Each flipper
// is a collision capsule of radius (ball.r + FLIP_R) = 16 around its line, so
// the free channel for the BALL CENTER between the two capsules is W = D − 32.
// FLIP_LEN=70, REST=0.68 → D = 160 − 140·cos(0.68) ≈ 51.1 → W ≈ 19px (~1.06×
// the 18px ball diameter): a real but narrow center drain — a ball coming
// straight down the middle can slip through, but it must be nearly centered so
// a resting flipper usually catches it. (Previously REST=0.5/LEN=80 gave D=19.6
// → W=−12.4, i.e. the capsules OVERLAPPED and the flippers were a solid wall.)
// REST=0.68 also ≈ the left funnel's own slope (atan2(100,126)=0.67), so the
// flipper continues the funnel line instead of kinking. Tip y=600+70·sin(0.68)
// ≈644, comfortably above DRAIN_Y=664. Pivots stay at x=150/310 so the funnels
// (…→150,600 and …→310,600) still meet the pivots exactly — no new wedge.
const LEFT_PIVOT = { x: 150, y: 600 };
const RIGHT_PIVOT = { x: 310, y: 600 };
const FLIP_LEN = 70;
const FLIP_R = 7;
const LEFT_REST = 0.68;
const LEFT_UP = -0.55;
const RIGHT_REST = Math.PI - 0.68;
const RIGHT_UP = Math.PI + 0.55;
const FLIP_UP_SPEED = 26;    // rad / s
const FLIP_DOWN_SPEED = 14;

// Launch lane rest position for the ball
const PARK = { x: 402, y: 632 };

// Static wall segments the ball bounces off of.
const WALLS = [
  // rounded top arc
  [24, 96, 80, 54],
  [80, 54, 190, 40],
  [190, 40, 300, 42],
  [300, 42, 380, 60],
  [380, 60, 416, 110],
  // right / launch lane
  [416, 110, 416, 648],   // outer right wall
  [388, 648, 416, 648],   // lane bottom
  [388, 150, 388, 470],   // divider between field and launch lane (stops where the funnel takes over — previously ran all the way to 648, overlapping the funnel wall below and trapping the ball in the wedge between them)
  [388, 470, 310, 600],   // right funnel toward right flipper
  // left
  [24, 96, 24, 500],      // left wall
  [24, 500, 150, 600],    // left funnel toward left flipper
  // ── left orbit / loop inner wall ──
  // Forms a ~36px channel with the left wall (x=24). A ball shot up the left
  // gutter rides between the two walls, the top curve steers it back over the
  // playfield ("around and back") — a real loop shot, not just a bounce.
  // These segments are parallel-OFFSET to the left wall (never share an
  // endpoint with it) and the channel is open at BOTH ends (gravity always
  // drains a stalled ball out the bottom), so there is no trapping wedge.
  [60, 430, 60, 180],     // vertical inner wall
  [60, 180, 78, 132],     // curve begins
  [78, 132, 120, 104],    // curve steers ball right, back into the field
];

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);

function makeBumpers() {
  return [
    { x: 140, y: 210, r: 26, boost: 250, points: BUMP_PTS, kind: 'pop', flash: 0 },
    { x: 300, y: 210, r: 26, boost: 250, points: BUMP_PTS, kind: 'pop', flash: 0 },
    { x: 220, y: 300, r: 26, boost: 250, points: BUMP_PTS, kind: 'pop', flash: 0 },
    { x: 112, y: 520, r: 15, boost: 230, points: SLING_PTS, kind: 'sling', flash: 0 },
    // Right sling bumper: moved from (322,520) — its surface was only ~15.9px
    // from the right funnel wall [388,470→310,600] (closest point ≈(348.4,536),
    // dist 30.9px − bumper r 15 = 15.9px clearance, barely more than the ball's
    // own radius of 9). A kicked ball had almost no room before it re-hit the
    // funnel wall and bounced straight back into the bumper, repeating —
    // reported as "stuck kicking it back up to itself and wall." Moved 20px
    // away from the wall along the bumper→wall normal, giving ≈35.6px
    // clearance (comfortably more than the 18px ball diameter) so a kicked
    // ball has real room to escape before it can reach the wall again.
    { x: 305, y: 510, r: 15, boost: 230, points: SLING_PTS, kind: 'sling', flash: 0 },
  ];
}

// SHOW standup targets — thin vertical posts sitting in open pockets of the
// field (all ≥30px clearance from every wall/bumper, so a ball can never wedge
// against them). Light all four to trigger multiball, then they reset.
function makeTargets() {
  return [
    { label: 'S', seg: [150, 119, 150, 141], lit: false, flash: 0 },
    { label: 'H', seg: [290, 119, 290, 141], lit: false, flash: 0 },
    { label: 'O', seg: [90, 309, 90, 331], lit: false, flash: 0 },
    { label: 'W', seg: [350, 309, 350, 331], lit: false, flash: 0 },
  ];
}

// GOOD rollover lanes across the top — pass-over detection only (no collision
// geometry, so they cannot trap a ball). Light all four for a bonus.
function makeLanes() {
  return [
    { label: 'G', x: 120, y: 90, lit: false, flash: 0 },
    { label: 'O', x: 190, y: 90, lit: false, flash: 0 },
    { label: 'O', x: 260, y: 90, lit: false, flash: 0 },
    { label: 'D', x: 330, y: 90, lit: false, flash: 0 },
  ];
}

function makeBall(parked) {
  return { x: PARK.x, y: PARK.y, vx: 0, vy: 0, r: BALL_R, parked: !!parked, drained: false };
}

function armSkill(s) {
  s.skillLo = rand(0.34, 0.60);
  s.skillHi = s.skillLo + 0.13;
}

function resetSets(s) {
  for (const t of s.targets) { t.lit = false; t.flash = 0; }
  for (const l of s.lanes) { l.lit = false; l.flash = 0; }
}

// Per-ball state reset — bonuses that only last for the current ball (multiplier,
// combo, end-of-ball bonus units, per-ball completion flags) all clear here.
function resetBall(s) {
  s.multiplier = 1;
  s.combo = 0; s.comboTimer = 0;
  s.ballBonus = 0;
  s.jackpotReady = false;
  s.lockCount = 0;
  s.goodDoneThisBall = false;
  s.showDoneThisBall = false;
  s.extraAwardedThisBall = false;
}

// Register a switch hit for the combo timer. Returns the combo bonus points to
// award (0 for the first hit; escalating once the chain reaches 2+).
function registerCombo(s) {
  s.combo = s.comboTimer > 0 ? s.combo + 1 : 1;
  s.comboTimer = COMBO_WINDOW;
  if (s.combo >= 2) { s.comboMsg = 1.0; return s.combo * COMBO_PTS; }
  return 0;
}

function initState() {
  const s = {
    balls: [makeBall(true)],  // array of ball objects; normally length 1, up to 3 during multiball
    lives: START_BALLS,       // remaining balls (lives), separate from the ball objects above
    score: 0,
    bumpers: makeBumpers(),
    targets: makeTargets(),
    lanes: makeLanes(),
    spinner: { x: 42, y: 300, angle: 0, spin: 0, flash: 0 },
    plunger: 0,
    skillLo: 0, skillHi: 0,
    multiball: false,
    orbitPrimed: false, orbitTimer: 0,
    spinCd: 0,
    skillMsg: 0, mbMsg: 0, orbitMsg: 0,
    // ── round-2 bonus state ──
    multiplier: 1,                      // playfield/bonus multiplier: 1→2→3→5
    combo: 0, comboTimer: 0, comboMsg: 0,
    ballBonus: 0,                       // end-of-ball bonus units collected this ball
    jackpotReady: false, jackpotMsg: 0, // first-bumper jackpot armed during multiball
    lockCount: 0, lockMsg: 0,           // saucer locks toward the lock-multiball
    multiballCd: 0,                     // seconds until multiball can be (re-)granted again
    mysteryMsg: 0, saucerCd: 0,
    extraMsg: 0, multMsg: 0,
    goodDoneThisBall: false, showDoneThisBall: false, extraAwardedThisBall: false,
    saucer: { x: 356, y: 168, r: 13, flash: 0 }, // capture hole (no wall geometry)
    // end-of-ball bonus count-up animation
    tallyActive: false, tallyTotal: 0, tallyRemaining: 0, tallyElapsed: 0, tallyGameOver: false,
    left: { pivot: LEFT_PIVOT, angle: LEFT_REST, angularVel: 0, restAngle: LEFT_REST, upAngle: LEFT_UP, active: false },
    right: { pivot: RIGHT_PIVOT, angle: RIGHT_REST, angularVel: 0, restAngle: RIGHT_REST, upAngle: RIGHT_UP, active: false },
  };
  armSkill(s);
  return s;
}

// ── geometry helpers ──
function closestOnSegment(px, py, x1, y1, x2, y2) {
  const ex = x2 - x1, ey = y2 - y1;
  const len2 = ex * ex + ey * ey || 1e-9;
  let t = ((px - x1) * ex + (py - y1) * ey) / len2;
  t = Math.max(0, Math.min(1, t));
  return { x: x1 + t * ex, y: y1 + t * ey };
}

function clampSpeed(ball) {
  const sp = Math.hypot(ball.vx, ball.vy);
  if (sp > MAX_BALL_SPEED) {
    ball.vx = (ball.vx / sp) * MAX_BALL_SPEED;
    ball.vy = (ball.vy / sp) * MAX_BALL_SPEED;
  }
}

// Returns true if the ball was overlapping the segment (a contact this step).
function collideSegment(ball, seg, e) {
  const C = closestOnSegment(ball.x, ball.y, seg[0], seg[1], seg[2], seg[3]);
  let dx = ball.x - C.x, dy = ball.y - C.y;
  let d2 = dx * dx + dy * dy;
  if (d2 >= ball.r * ball.r) return false;
  let d = Math.sqrt(d2);
  let nx, ny;
  if (d > 1e-6) { nx = dx / d; ny = dy / d; }
  else {
    const ex = seg[2] - seg[0], ey = seg[3] - seg[1];
    const len = Math.hypot(ex, ey) || 1;
    nx = -ey / len; ny = ex / len;
    if (ball.vx * nx + ball.vy * ny > 0) { nx = -nx; ny = -ny; }
    d = 0;
  }
  ball.x += nx * (ball.r - d);
  ball.y += ny * (ball.r - d);
  const vn = ball.vx * nx + ball.vy * ny;
  if (vn < 0) {
    ball.vx -= (1 + e) * vn * nx;
    ball.vy -= (1 + e) * vn * ny;
  }
  return true;
}

function collideBumper(ball, b) {
  const dx = ball.x - b.x, dy = ball.y - b.y;
  const minD = ball.r + b.r;
  const d = Math.hypot(dx, dy);
  if (d >= minD) return 0;
  let nx, ny;
  if (d > 1e-6) { nx = dx / d; ny = dy / d; } else { nx = 0; ny = -1; }
  ball.x = b.x + nx * minD;
  ball.y = b.y + ny * minD;
  const vn = ball.vx * nx + ball.vy * ny;
  if (vn < 0) {
    ball.vx -= (1 + E_BUMP) * vn * nx;
    ball.vy -= (1 + E_BUMP) * vn * ny;
  }
  // A dead-center hit (ball falling essentially straight down onto the top of
  // a bumper) has a near-vertical normal, so a pure normal-direction boost
  // would kick the ball straight back up along the exact same line — it falls
  // right back onto the same spot and repeats forever (the reported "stuck on
  // the yellow bumper" bug). Real pinball bumpers always kick the ball off at
  // a lively angle, never straight back. Guarantee a minimum tangential
  // (sideways) component every hit so a vertical trap can't persist.
  const tx = -ny, ty = nx; // perpendicular to the normal
  const side = Math.random() < 0.5 ? -1 : 1;
  const spin = side * (0.22 + Math.random() * 0.3) * b.boost;
  ball.vx += nx * b.boost + tx * spin;
  ball.vy += ny * b.boost + ty * spin;
  b.flash = 0.16;
  return b.points;
}

function flipperTip(fl) {
  return { x: fl.pivot.x + FLIP_LEN * Math.cos(fl.angle), y: fl.pivot.y + FLIP_LEN * Math.sin(fl.angle) };
}

function collideFlipper(ball, fl) {
  const tip = flipperTip(fl);
  const C = closestOnSegment(ball.x, ball.y, fl.pivot.x, fl.pivot.y, tip.x, tip.y);
  let dx = ball.x - C.x, dy = ball.y - C.y;
  const minD = ball.r + FLIP_R;
  let d2 = dx * dx + dy * dy;
  if (d2 >= minD * minD) return;
  let d = Math.sqrt(d2);
  let nx, ny;
  if (d > 1e-6) { nx = dx / d; ny = dy / d; }
  else {
    const ex = tip.x - fl.pivot.x, ey = tip.y - fl.pivot.y;
    const len = Math.hypot(ex, ey) || 1;
    nx = -ey / len; ny = ex / len;
    if (ball.vx * nx + ball.vy * ny > 0) { nx = -nx; ny = -ny; }
    d = 0;
  }
  // surface velocity at contact due to flipper rotation about pivot
  const px = C.x - fl.pivot.x, py = C.y - fl.pivot.y;
  const vsx = -fl.angularVel * py;
  const vsy = fl.angularVel * px;
  // push ball out of the flipper
  ball.x += nx * (minD - d);
  ball.y += ny * (minD - d);
  // relative velocity along the normal
  const relx = ball.vx - vsx, rely = ball.vy - vsy;
  const vn = relx * nx + rely * ny;
  if (vn < 0) {
    ball.vx -= (1 + E_FLIP) * vn * nx;
    ball.vy -= (1 + E_FLIP) * vn * ny;
  }
}

function updateFlipper(fl, dt) {
  const target = fl.active ? fl.upAngle : fl.restAngle;
  const prev = fl.angle;
  const speed = fl.active ? FLIP_UP_SPEED : FLIP_DOWN_SPEED;
  const maxStep = speed * dt;
  const diff = target - fl.angle;
  if (Math.abs(diff) <= maxStep) fl.angle = target;
  else fl.angle += Math.sign(diff) * maxStep;
  fl.angularVel = dt > 0 ? (fl.angle - prev) / dt : 0;
}

export default function Pinball() {
  const canvasRef = useRef(null);
  const stateRef = useRef(initState());
  const rafRef = useRef(null);
  const lastRef = useRef(0);
  const inputRef = useRef({ left: false, right: false, plunge: false });
  const gameStatusRef = useRef('idle');

  const [gameStatus, setGameStatus] = useState('idle'); // idle | playing | over
  const [score, setScore] = useState(0);
  const [balls, setBalls] = useState(START_BALLS);
  const [multiplier, setMultiplier] = useState(1);
  const [won, setWon] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [stats, setStats] = useState({ wins: 0, losses: 0, best_score: 0 });
  const saved = useRef(false);
  const wonRef = useRef(false);

  useEffect(() => { gameStatusRef.current = gameStatus; }, [gameStatus]);

  useEffect(() => {
    if (isLoggedIn()) {
      apiRequest('GET', null, '/game/stats').then((d) => {
        if (d?.pinball) setStats(d.pinball);
      }).catch(() => {});
    }
  }, []);

  const saveResult = useCallback((result, s) => {
    if (saved.current || !isLoggedIn()) return;
    saved.current = true;
    apiRequest('POST', { game_type: 'pinball', result, difficulty: 'medium', score: s }, '/game/save').catch(() => {});
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;

    // CRT navy background
    ctx.fillStyle = '#080b1f';
    ctx.fillRect(0, 0, W, H);

    // Launch lane subtle fill
    ctx.fillStyle = 'rgba(56,189,248,0.05)';
    ctx.fillRect(388, 110, 28, 538);

    // Orbit channel subtle fill (between left wall and inner loop wall)
    ctx.fillStyle = 'rgba(167,139,250,0.05)';
    ctx.fillRect(24, 132, 36, 300);

    // Walls — neon cyan glow
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 8;
    for (const seg of WALLS) {
      ctx.beginPath();
      ctx.moveTo(seg[0], seg[1]);
      ctx.lineTo(seg[2], seg[3]);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // GOOD rollover lanes (drawn under everything else near the top)
    for (const ln of s.lanes) {
      const on = ln.lit || ln.flash > 0;
      const col = on ? '#4ade80' : '#1e3a5f';
      ctx.fillStyle = on ? 'rgba(74,222,128,0.18)' : 'rgba(30,58,95,0.4)';
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.shadowColor = col;
      ctx.shadowBlur = on ? 14 : 0;
      ctx.beginPath();
      ctx.arc(ln.x, ln.y, LANE_R - 2, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = on ? '#eafff0' : '#5b7fa6';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ln.label, ln.x, ln.y + 1);
    }

    // SHOW standup targets (thin lit posts)
    for (const t of s.targets) {
      const on = t.lit || t.flash > 0;
      const col = on ? '#fbbf24' : '#1e3a5f';
      ctx.strokeStyle = col;
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.shadowColor = col;
      ctx.shadowBlur = on ? 18 : 0;
      ctx.beginPath();
      ctx.moveTo(t.seg[0], t.seg[1]);
      ctx.lineTo(t.seg[2], t.seg[3]);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = on ? '#fff7e0' : '#5b7fa6';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.label, (t.seg[0] + t.seg[2]) / 2, (t.seg[1] + t.seg[3]) / 2);
    }

    // Spinner (rotating paddle in the orbit channel)
    {
      const sp = s.spinner;
      const on = sp.flash > 0;
      const col = on ? '#ffffff' : '#a78bfa';
      const half = 12;
      // The vane pivots on a horizontal axis across the channel; as it spins,
      // its visible vertical extent scales with sin(angle) (edge-on when flat).
      const vy = half * Math.sin(sp.angle);
      ctx.strokeStyle = col;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#a78bfa';
      ctx.shadowBlur = on ? 16 : 6;
      ctx.beginPath();
      ctx.moveTo(sp.x - 10, sp.y - vy);
      ctx.lineTo(sp.x + 10, sp.y + vy);
      ctx.stroke();
      // pivot dots top & bottom of the vane
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#7c3aed';
      ctx.beginPath(); ctx.arc(sp.x, sp.y - half, 2.5, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(sp.x, sp.y + half, 2.5, 0, TAU); ctx.fill();
    }

    // Lock saucer (kicker hole) — a capture zone only, no wall geometry, so it
    // cannot wedge a ball. Pips under it show lock progress toward multiball.
    {
      const sc = s.saucer;
      const on = sc.flash > 0;
      ctx.save();
      ctx.strokeStyle = on ? '#ffffff' : '#38bdf8';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = on ? 22 : 8;
      ctx.fillStyle = 'rgba(2,6,23,0.9)';
      ctx.beginPath(); ctx.arc(sc.x, sc.y, sc.r, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = on ? '#e0f2fe' : '#7aa2c8';
      ctx.font = 'bold 8px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('LOCK', sc.x, sc.y);
      for (let i = 0; i < LOCKS_FOR_MB; i++) {
        ctx.fillStyle = i < s.lockCount ? '#f472b6' : 'rgba(148,163,184,0.35)';
        ctx.beginPath();
        ctx.arc(sc.x - 8 + i * 8, sc.y + sc.r + 7, 2.6, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    // Bonus multiplier indicator, lit in the open field above the flippers
    if (s.multiplier > 1) {
      ctx.save();
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 14;
      ctx.fillText(s.multiplier + 'X', 220, 432);
      ctx.font = 'bold 8px system-ui, sans-serif';
      ctx.fillText('BONUS', 220, 448);
      ctx.restore();
    }

    // Bumpers.
    // Glow is a pre-blended radial gradient instead of ctx.shadowBlur — a
    // native shadow blur is recomputed from scratch every frame for every
    // shadowed draw call and is one of the most expensive Canvas2D
    // operations; with 5 bumpers doing it unconditionally every single frame
    // (independent of ball count) this was a real, measurable contributor to
    // the reported lag. A gradient achieves the same glow look for a
    // fraction of the cost.
    for (const b of s.bumpers) {
      const base = b.kind === 'pop' ? '#ec4899' : '#facc15';
      const glow = b.flash > 0 ? '#ffffff' : base;
      const glowRgb = b.flash > 0 ? '255,255,255' : (b.kind === 'pop' ? '236,72,153' : '250,204,21');
      const glowR = b.r * (b.flash > 0 ? 2.1 : 1.7);
      const grad = ctx.createRadialGradient(b.x, b.y, b.r * 0.75, b.x, b.y, glowR);
      grad.addColorStop(0, `rgba(${glowRgb},${b.flash > 0 ? 0.7 : 0.42})`);
      grad.addColorStop(1, `rgba(${glowRgb},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, glowR, 0, TAU);
      ctx.fill();

      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, TAU);
      ctx.fill();
      // inner ring
      ctx.fillStyle = 'rgba(8,11,31,0.55)';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 0.55, 0, TAU);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Plunger power meter (only while a ball waits in the launch lane)
    if (s.balls.some((b) => b.parked)) {
      const mx = 390, mw = 5, mBot = 645, mH = 140;
      ctx.fillStyle = 'rgba(148,163,184,0.22)';
      ctx.fillRect(mx, mBot - mH, mw, mH);
      // lit skill-shot target band
      const by1 = mBot - s.skillHi * mH, by2 = mBot - s.skillLo * mH;
      ctx.fillStyle = 'rgba(74,222,128,0.9)';
      ctx.shadowColor = '#4ade80';
      ctx.shadowBlur = 8;
      ctx.fillRect(mx - 1, by1, mw + 2, by2 - by1);
      ctx.shadowBlur = 0;
      // current charge
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(mx, mBot - s.plunger * mH, mw, s.plunger * mH);
    }

    // Flippers
    for (const fl of [s.left, s.right]) {
      const tip = flipperTip(fl);
      ctx.strokeStyle = '#a78bfa';
      ctx.shadowColor = '#a78bfa';
      ctx.shadowBlur = 10;
      ctx.lineWidth = FLIP_R * 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(fl.pivot.x, fl.pivot.y);
      ctx.lineTo(tip.x, tip.y);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // Balls — same gradient-glow-instead-of-shadowBlur approach as the
    // bumpers above; this one scales directly with ball count (up to 3
    // during multiball), so it's the single biggest lag win of the two.
    for (const ball of s.balls) {
      const glowR = ball.r * 2.3;
      const glow = ctx.createRadialGradient(ball.x, ball.y, ball.r * 0.6, ball.x, ball.y, glowR);
      glow.addColorStop(0, 'rgba(226,232,240,0.55)');
      glow.addColorStop(1, 'rgba(226,232,240,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, glowR, 0, TAU);
      ctx.fill();

      const g = ctx.createRadialGradient(ball.x - 3, ball.y - 3, 1, ball.x, ball.y, ball.r);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(1, '#cbd5e1');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, TAU);
      ctx.fill();
    }

    // End-of-ball bonus count-up (takes over the banner area while tallying)
    if (s.tallyActive) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillStyle = '#fde68a';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 18;
      ctx.fillText('BALL BONUS', W / 2, 330);
      ctx.font = 'bold 32px system-ui, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('+' + (s.tallyTotal - s.tallyRemaining).toLocaleString(), W / 2, 368);
      if (s.multiplier > 1) {
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(s.multiplier + 'X multiplier applied', W / 2, 398);
      }
      ctx.restore();
      ctx.shadowBlur = 0;
    } else {
      // Event banner text over the playfield (priority-ordered)
      let msg = null, mcol = '#22d3ee';
      if (s.mbMsg > 0) { msg = 'MULTIBALL!'; mcol = '#f472b6'; }
      else if (s.jackpotMsg > 0) { msg = 'JACKPOT!  +' + JACKPOT_PTS.toLocaleString(); mcol = '#fbbf24'; }
      else if (s.extraMsg > 0) { msg = 'EXTRA BALL!'; mcol = '#4ade80'; }
      else if (s.skillMsg > 0) { msg = 'SKILL SHOT!  +' + SKILL_BONUS.toLocaleString(); mcol = '#4ade80'; }
      else if (s.orbitMsg > 0) { msg = 'LOOP!  +' + ORBIT_PTS.toLocaleString(); mcol = '#22d3ee'; }
      else if (s.lockMsg > 0) { msg = 'BALL LOCKED  ' + s.lockCount + ' / ' + LOCKS_FOR_MB; mcol = '#38bdf8'; }
      else if (s.mysteryMsg > 0) { msg = 'MYSTERY!'; mcol = '#a78bfa'; }
      else if (s.multMsg > 0) { msg = 'BONUS ' + s.multiplier + 'X'; mcol = '#fbbf24'; }
      if (msg) {
        ctx.save();
        ctx.font = 'bold 26px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = mcol;
        ctx.shadowColor = mcol;
        ctx.shadowBlur = 20;
        ctx.fillText(msg, W / 2, 360);
        ctx.restore();
      }
      // Combo counter (secondary line, doesn't hide the main banner)
      if (s.comboMsg > 0 && s.combo >= 2) {
        ctx.save();
        ctx.font = 'bold 20px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fb7185';
        ctx.shadowColor = '#fb7185';
        ctx.shadowBlur = 16;
        ctx.fillText(s.combo + 'X COMBO!', W / 2, 405);
        ctx.restore();
      }
    }
    ctx.shadowBlur = 0;
  }, []);

  const step = useCallback((dt) => {
    const s = stateRef.current;

    const applyWin = () => {
      if (!wonRef.current && s.score >= WIN_SCORE) {
        wonRef.current = true;
        setWon(true);
        saveResult('win', s.score);
      }
    };

    // ── End-of-ball bonus count-up ── runs between balls, physics paused.
    if (s.tallyActive) {
      s.tallyElapsed += dt;
      if (s.comboMsg > 0) s.comboMsg -= dt;
      if (s.saucer.flash > 0) s.saucer.flash -= dt;
      const dur = 1.4;
      const shouldRemain = Math.round(s.tallyTotal * (1 - Math.min(1, s.tallyElapsed / dur)));
      const transfer = s.tallyRemaining - shouldRemain;
      if (transfer > 0) {
        s.tallyRemaining -= transfer;
        s.score += transfer;
        setScore(s.score);
        applyWin();
      }
      if (s.tallyElapsed >= dur) {
        if (s.tallyRemaining > 0) { s.score += s.tallyRemaining; s.tallyRemaining = 0; setScore(s.score); applyWin(); }
        s.tallyActive = false;
        if (s.tallyGameOver) {
          setGameStatus('over');
          gameStatusRef.current = 'over';
          setHighScore((h) => Math.max(h, s.score));
          if (!wonRef.current) saveResult('loss', s.score);
        } else {
          // serve the next ball to the launch lane and reset per-ball bonuses
          s.balls = [makeBall(true)];
          s.multiball = false;
          s.plunger = 0;
          armSkill(s);
          resetSets(s);
          resetBall(s);
          setMultiplier(1);
        }
      }
      return;
    }

    s.left.active = inputRef.current.left;
    s.right.active = inputRef.current.right;
    updateFlipper(s.left, dt);
    updateFlipper(s.right, dt);

    // decay timers / flashes
    for (const b of s.bumpers) if (b.flash > 0) b.flash -= dt;
    for (const t of s.targets) if (t.flash > 0) t.flash -= dt;
    for (const ln of s.lanes) if (ln.flash > 0) ln.flash -= dt;
    if (s.spinner.flash > 0) s.spinner.flash -= dt;
    if (s.spinCd > 0) s.spinCd -= dt;
    if (s.skillMsg > 0) s.skillMsg -= dt;
    if (s.mbMsg > 0) s.mbMsg -= dt;
    if (s.orbitMsg > 0) s.orbitMsg -= dt;
    if (s.orbitTimer > 0) { s.orbitTimer -= dt; if (s.orbitTimer <= 0) s.orbitPrimed = false; }
    if (s.multiballCd > 0) s.multiballCd -= dt;
    // round-2 timers
    if (s.jackpotMsg > 0) s.jackpotMsg -= dt;
    if (s.extraMsg > 0) s.extraMsg -= dt;
    if (s.lockMsg > 0) s.lockMsg -= dt;
    if (s.mysteryMsg > 0) s.mysteryMsg -= dt;
    if (s.multMsg > 0) s.multMsg -= dt;
    if (s.comboMsg > 0) s.comboMsg -= dt;
    if (s.saucerCd > 0) s.saucerCd -= dt;
    if (s.saucer.flash > 0) s.saucer.flash -= dt;
    if (s.comboTimer > 0) { s.comboTimer -= dt; if (s.comboTimer <= 0) s.combo = 0; }
    // spinner spin animation + decay
    s.spinner.angle += s.spinner.spin * dt;
    s.spinner.spin *= Math.pow(0.02, dt);
    if (Math.abs(s.spinner.spin) < 0.05) s.spinner.spin = 0;

    let gained = 0;  // playfield scoring — multiplied by s.multiplier
    let flat = 0;    // big fixed awards (skill / loop / jackpot / …) — not multiplied

    // ── Plunger: charge while held, fire on release (skill shot in the lit band) ──
    const parkedBall = s.balls.find((b) => b.parked);
    if (parkedBall) {
      if (inputRef.current.plunge) {
        s.plunger = Math.min(1, s.plunger + dt / CHARGE_TIME);
      } else if (s.plunger > 0) {
        const power = s.plunger;
        parkedBall.parked = false;
        parkedBall.vy = -(LAUNCH_MIN + (LAUNCH_MAX - LAUNCH_MIN) * power);
        parkedBall.vx = rand(-20, 8);
        if (power >= s.skillLo && power <= s.skillHi) {
          flat += SKILL_BONUS;
          s.skillMsg = 1.8;
        }
        s.plunger = 0;
      }
    }

    // ── Per-ball physics (independent position/velocity, shared everything else) ──
    for (const ball of s.balls) {
      if (ball.parked) continue;
      // Held in the lock saucer: sit still, then get kicked back into the field.
      // The ball stays in s.balls (never "drained") so holding it costs no life.
      if (ball.held) {
        ball.holdTimer -= dt;
        ball.x = s.saucer.x; ball.y = s.saucer.y; ball.vx = 0; ball.vy = 0;
        if (ball.holdTimer <= 0) {
          ball.held = false;
          ball.vx = rand(-120, -40);  // kick down-and-left, away from the right divider
          ball.vy = rand(200, 320);
        }
        continue;
      }
      // Fixed substep count sized for the maximum possible speed so a mid-frame
      // flipper/bumper kick can never tunnel through a thin wall.
      const steps = Math.max(1, Math.min(16, Math.ceil((MAX_BALL_SPEED * dt) / (BALL_R * 0.5))));
      const sdt = dt / steps;

      for (let i = 0; i < steps; i++) {
        ball.vy += GRAVITY * sdt;
        ball.x += ball.vx * sdt;
        ball.y += ball.vy * sdt;

        for (const seg of WALLS) collideSegment(ball, seg, E_WALL);
        for (const t of s.targets) {
          if (collideSegment(ball, t.seg, E_TARGET) && !t.lit) {
            t.lit = true; t.flash = 0.3; gained += TARGET_PTS;
            gained += registerCombo(s); s.ballBonus += 2;
          }
        }
        for (const b of s.bumpers) {
          const bp = collideBumper(ball, b);
          if (bp > 0) {
            gained += bp;
            gained += registerCombo(s);
            s.ballBonus += 1;
            // Jackpot: first pop-bumper hit while multiball is running
            if (s.multiball && s.jackpotReady && b.kind === 'pop') {
              s.jackpotReady = false;
              flat += JACKPOT_PTS;
              s.jackpotMsg = 1.8;
            }
          }
        }
        collideFlipper(ball, s.left);
        collideFlipper(ball, s.right);
        clampSpeed(ball);

        if (ball.y - ball.r > DRAIN_Y) { ball.drained = true; break; }
      }
      if (ball.drained) continue;

      // GOOD rollover lanes (pass-over)
      for (const ln of s.lanes) {
        if (!ln.lit && Math.hypot(ball.x - ln.x, ball.y - ln.y) < LANE_R) {
          ln.lit = true; ln.flash = 0.3; gained += LANE_PTS; s.ballBonus += 2;
        }
      }

      // Spinner in the orbit channel
      if (ball.x > 22 && ball.x < 62 && Math.abs(ball.y - s.spinner.y) < 11 && s.spinCd <= 0) {
        gained += SPIN_PTS; s.ballBonus += 1;
        s.spinCd = 0.18;
        s.spinner.spin = Math.max(6, Math.min(30, Math.hypot(ball.vx, ball.vy) / 25)) * (ball.vy < 0 ? 1 : -1);
        s.spinner.flash = 0.2;
      }

      // Left loop: prime it low in the channel moving up, complete it near the top exit
      if (ball.x < 62 && ball.y > 340 && ball.y < 436 && ball.vy < 0) {
        s.orbitPrimed = true; s.orbitTimer = 2.5;
      }
      if (s.orbitPrimed && ball.y < 118 && ball.x < 150) {
        s.orbitPrimed = false; flat += ORBIT_PTS; s.orbitMsg = 1.6; s.ballBonus += 6;
      }

      // ── Lock saucer capture (kicker hole) ──
      const sc = s.saucer;
      if (!ball.held && s.saucerCd <= 0 && Math.hypot(ball.x - sc.x, ball.y - sc.y) < sc.r + ball.r) {
        ball.held = true; ball.holdTimer = 0.9;
        sc.flash = 0.5; s.saucerCd = 0.5;
        flat += SAUCER_PTS; s.ballBonus += 4;
        s.lockCount += 1;

        // Mystery award — a random extra each capture, for variety
        const roll = Math.random();
        if (roll < 0.34) { flat += MYSTERY_PTS; s.mysteryMsg = 1.4; }
        else if (roll < 0.62) {
          if (s.multiplier < MAX_MULT) {
            s.multiplier = s.multiplier >= 3 ? MAX_MULT : s.multiplier + 1;
            setMultiplier(s.multiplier);
          } else { flat += MYSTERY_PTS; }
          s.mysteryMsg = 1.4;
        } else if (roll < 0.85) { s.ballBonus += 12; s.mysteryMsg = 1.4; }
        // else: no mystery this time, just the lock + saucer points

        if (s.lockCount >= LOCKS_FOR_MB) {
          // Reset the lock bank the INSTANT it's complete, regardless of
          // whether multiball actually releases this time — a previous
          // version only reset lockCount inside the "cooldown clear" branch,
          // so while multiballCd was active, every recapture (every ~0.5s+)
          // kept incrementing lockCount past 3 forever with no reset ("BALL
          // LOCKED 8/3" and climbing) — that unbounded counter, plus the
          // eventual release once cooldown cleared, is what read as "ball
          // locked is broken and keeps sending out balls."
          s.lockCount = 0;
          if (s.multiballCd <= 0) {
            // Release the lock-multiball: kick this ball out and add balls up to 3
            const inPlay = s.balls.filter((b) => !b.parked && !b.drained).length;
            const toAdd = Math.max(0, Math.min(2, 3 - inPlay));
            for (let k = 0; k < toAdd; k++) {
              s.balls.push({ x: sc.x - 10 + k * 20, y: sc.y + 22, vx: rand(-140, 140), vy: rand(160, 260), r: BALL_R, parked: false, drained: false });
            }
            if (inPlay + toAdd > 1) { s.multiball = true; s.mbMsg = 2.2; s.jackpotReady = true; s.multiballCd = MULTIBALL_COOLDOWN; }
          } else {
            // Multiball still on cooldown from a recent grant — pay a
            // consolation bonus instead of flooding the table with more balls
            // (see MULTIBALL_COOLDOWN).
            flat += SAUCER_PTS * 2;
          }
          s.lockMsg = 1.4;
        } else {
          s.lockMsg = 1.4;
        }
      }
    }

    // ── Complete SHOW bank -> bonus + multiball ──
    if (s.targets.every((t) => t.lit)) {
      flat += SHOW_BONUS;
      s.showDoneThisBall = true;
      for (const t of s.targets) { t.lit = false; t.flash = 0.4; }
      if (s.multiballCd <= 0) {
        const inPlay = s.balls.filter((b) => !b.parked && !b.drained).length;
        const toAdd = Math.max(0, Math.min(2, 3 - inPlay));
        for (let k = 0; k < toAdd; k++) {
          s.balls.push({ x: 200 + k * 44, y: 170, vx: rand(-140, 140), vy: -140 - k * 40, r: BALL_R, parked: false, drained: false });
        }
        if (inPlay + toAdd > 1) { s.multiball = true; s.mbMsg = 2.2; s.jackpotReady = true; s.multiballCd = MULTIBALL_COOLDOWN; }
      } else {
        // Multiball still on cooldown from a recent grant — bank a bigger flat
        // bonus instead of adding more balls (see MULTIBALL_COOLDOWN).
        flat += SHOW_BONUS;
      }
    }

    // ── Complete GOOD lanes -> bonus + advance the bonus multiplier ──
    if (s.lanes.every((l) => l.lit)) {
      flat += GOOD_BONUS;
      s.goodDoneThisBall = true;
      for (const l of s.lanes) { l.lit = false; l.flash = 0.4; }
      if (s.multiplier < MAX_MULT) {
        // 1 → 2 → 3 → 5 (classic pinball multiplier ladder)
        s.multiplier = s.multiplier >= 3 ? MAX_MULT : s.multiplier + 1;
        setMultiplier(s.multiplier);
        s.multMsg = 1.6;
      }
    }

    // ── Extra ball: complete BOTH the GOOD lanes and SHOW targets in one ball ──
    if (s.goodDoneThisBall && s.showDoneThisBall && !s.extraAwardedThisBall) {
      s.extraAwardedThisBall = true;
      s.lives += 1;
      setBalls(s.lives);
      s.extraMsg = 2.4;
    }

    // ── Ball-to-ball collision (equal-mass separation + normal-velocity swap) ──
    for (let i = 0; i < s.balls.length; i++) {
      for (let j = i + 1; j < s.balls.length; j++) {
        const a = s.balls[i], b = s.balls[j];
        if (a.parked || b.parked || a.drained || b.drained) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        const minD = a.r + b.r;
        if (d > 1e-6 && d < minD) {
          const nx = dx / d, ny = dy / d;
          const overlap = (minD - d) / 2;
          a.x -= nx * overlap; a.y -= ny * overlap;
          b.x += nx * overlap; b.y += ny * overlap;
          const rvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny; // approach speed along n
          if (rvn < 0) {
            a.vx += rvn * nx; a.vy += rvn * ny;
            b.vx -= rvn * nx; b.vy -= rvn * ny;
          }
        }
      }
    }

    // ── Apply this step's scoring (playfield gains × multiplier, plus flat awards) ──
    if (gained > 0 || flat > 0) {
      s.score += gained * s.multiplier + flat;
      setScore(s.score);
      applyWin();
    }

    // ── Remove drained balls; only losing the LAST one costs a life ──
    s.balls = s.balls.filter((b) => !b.drained);
    // Defensive hard cap: no matter what combination of triggers fired this
    // frame, never let more than 3 live balls be in play at once (drop the
    // newest excess ones rather than let the table flood).
    const liveBalls = s.balls.filter((b) => !b.parked);
    if (liveBalls.length > 3) {
      const excess = liveBalls.length - 3;
      let removed = 0;
      s.balls = s.balls.filter((b) => {
        if (b.parked) return true;
        if (removed < excess) { removed++; return false; }
        return true;
      });
    }
    if (s.balls.length === 0) {
      // Last ball drained: lose a life, then run the end-of-ball bonus count-up.
      s.lives -= 1;
      setBalls(s.lives);
      s.tallyGameOver = s.lives <= 0;
      s.tallyTotal = Math.round(s.ballBonus * BONUS_PER_UNIT * s.multiplier);
      s.tallyRemaining = s.tallyTotal;
      s.tallyElapsed = 0;
      s.tallyActive = true;
    } else if (s.multiball && s.balls.filter((b) => !b.parked).length <= 1) {
      // dropped back to a single ball — resume normal single-ball play
      s.multiball = false;
    }
  }, [saveResult]);

  const loop = useCallback((now) => {
    let dt = (now - lastRef.current) / 1000;
    lastRef.current = now;
    if (dt > 0.05) dt = 0.05;
    if (gameStatusRef.current === 'playing') step(dt);
    draw();
    if (gameStatusRef.current === 'playing') {
      rafRef.current = requestAnimationFrame(loop);
    }
  }, [step, draw]);

  const startGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    saved.current = false;
    wonRef.current = false;
    stateRef.current = initState();
    inputRef.current = { left: false, right: false, plunge: false };
    setScore(0);
    setBalls(START_BALLS);
    setMultiplier(1);
    setWon(false);
    setGameStatus('playing');
    gameStatusRef.current = 'playing';
    lastRef.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);
  }, [loop]);

  // Keyboard
  useEffect(() => {
    const down = (e) => {
      switch (e.code) {
        case 'ShiftLeft': case 'KeyZ': inputRef.current.left = true; e.preventDefault(); break;
        case 'ShiftRight': case 'Slash': case 'ArrowRight': inputRef.current.right = true; e.preventDefault(); break;
        case 'ArrowLeft': inputRef.current.left = true; e.preventDefault(); break;
        case 'Space': case 'ArrowDown': inputRef.current.plunge = true; e.preventDefault(); break;
        default: break;
      }
    };
    const up = (e) => {
      switch (e.code) {
        case 'ShiftLeft': case 'KeyZ': case 'ArrowLeft': inputRef.current.left = false; break;
        case 'ShiftRight': case 'Slash': case 'ArrowRight': inputRef.current.right = false; break;
        case 'Space': case 'ArrowDown': inputRef.current.plunge = false; break;
        default: break;
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  useEffect(() => { draw(); }, [draw]);
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const holdFlipper = (side) => ({
    onPointerDown: (e) => { e.preventDefault(); inputRef.current[side] = true; },
    onPointerUp: (e) => { e.preventDefault(); inputRef.current[side] = false; },
    onPointerLeave: () => { inputRef.current[side] = false; },
    onPointerCancel: () => { inputRef.current[side] = false; },
  });

  const holdLaunch = {
    onPointerDown: (e) => { e.preventDefault(); inputRef.current.plunge = true; },
    onPointerUp: (e) => { e.preventDefault(); inputRef.current.plunge = false; },
    onPointerLeave: () => { inputRef.current.plunge = false; },
    onPointerCancel: () => { inputRef.current.plunge = false; },
  };

  return (
    <div className="game-page">
      <div className="game-header">
        <Link to="/games" className="game-back">← Games</Link>
        <h1 className="game-title">Pinball</h1>
        <p className="game-subtitle">Keep the ball alive, rack up points. Just like the old machines.</p>
      </div>

      <HowToPlay>
        <p><b>Objective:</b> score as many points as you can across 3 balls — reach 100,000 to win.</p>
        <ul>
          <li><b>Plunger / skill shot:</b> hold Space (or the LAUNCH button) to charge the power meter in the launch lane, then release. Release while the meter is inside the glowing green band for a big <b>Skill Shot</b> bonus.</li>
          <li>Left flipper: hold Left Shift, Z, or the Left arrow. Right flipper: hold Right Shift, /, or the Right arrow.</li>
          <li>Hitting the ball near a flipper's tip flicks it harder than hitting near the base — time your flips.</li>
          <li>The glowing bumpers kick the ball back and score (pink bumpers 1,000, yellow slingshots 200).</li>
          <li><b>SHOW targets</b> (amber posts): hit all four to light the set and trigger <b>MULTIBALL</b> — up to 3 balls at once. Losing balls during multiball is free; only draining your last ball on the table costs a life.</li>
          <li><b>GOOD lanes</b> (green rollovers across the top): roll through all four for a bonus and to <b>advance the bonus multiplier</b> (1× → 2× → 3× → 5×). The multiplier boosts all your bumper/target/lane scoring until the ball drains.</li>
          <li><b>Extra ball:</b> complete <i>both</i> the GOOD lanes and the SHOW targets on the same ball to earn a genuine extra ball.</li>
          <li><b>Lock saucer</b> (blue "LOCK" hole, upper right): shoot the ball into it to lock a ball — do it three times to unleash a second <b>MULTIBALL</b>. Each lock also pays out and rolls a <b>MYSTERY</b> award (points, a multiplier bump, or bonus).</li>
          <li><b>Jackpot:</b> the first pink-bumper hit during any multiball is worth a huge <b>JACKPOT</b>.</li>
          <li><b>Combos:</b> hit bumpers and targets in quick succession (within 1.5s) for escalating <b>2×/3×/4× COMBO</b> bonuses.</li>
          <li><b>End-of-ball bonus:</b> everything you light and hit builds a bonus that's tallied up (times your multiplier) when the ball drains — play carefully to cash a big one.</li>
          <li><b>Left loop:</b> shoot the ball up the left gutter and around the top for a Loop bonus — and rack up the spinner on the way through.</li>
          <li>The narrow gap between the flippers is the drain — let the ball fall straight through the middle and you lose that ball.</li>
          <li>Reach 100,000 points to win; you can keep playing your remaining balls for a higher score afterward.</li>
          <li>On mobile, use the large flipper buttons at the bottom and hold/release LAUNCH to plunge.</li>
        </ul>
      </HowToPlay>

      <div className="game-controls-bar">
        <div className="game-difficulty-select" style={{ visibility: 'hidden' }}>
          <button className="difficulty-btn">.</button>
        </div>
        <button className="gs-btn gs-btn-primary gs-btn-sm" onClick={startGame}>
          {gameStatus === 'idle' ? 'Start Game' : 'New Game'}
        </button>
      </div>

      {isLoggedIn() && (
        <div className="game-stats-bar">
          <span>Games Won: <b>{stats.wins}</b></span>
          <span>Best: <b>{Math.max(stats.best_score, highScore)}</b></span>
        </div>
      )}

      <div className="pb-canvas-wrapper" style={{ width: '100%', maxWidth: W }}>
        <div className="pb-score-row">
          <span>Score: <b>{score.toLocaleString()}</b></span>
          <span>Balls: <b>{balls}</b></span>
          {multiplier > 1 && <span className="pb-mult">{multiplier}× BONUS</span>}
        </div>

        <div className="pb-canvas-shell">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="pb-canvas"
            style={{ touchAction: 'none', width: '100%', maxWidth: W, height: 'auto', display: 'block' }}
          />
          <div className="pb-scanlines" aria-hidden="true" />

          {won && gameStatus === 'playing' && (
            <div className="pb-win-banner">100,000! You won — keep playing for a higher score.</div>
          )}

          {gameStatus === 'idle' && (
            <div className="pb-overlay" onClick={startGame} style={{ cursor: 'pointer' }}>
              <div className="pb-overlay-inner">
                <p>Press <b>Start Game</b> to play</p>
                <p style={{ fontSize: 13, opacity: 0.7 }}>Hold Space to charge · release to launch · Shift keys to flip</p>
                <p style={{ fontSize: 12, opacity: 0.55, marginTop: 4 }}>(or tap anywhere here)</p>
              </div>
            </div>
          )}

          {gameStatus === 'over' && (
            <div className="pb-overlay">
              <div className="pb-overlay-inner">
                <div style={{ fontSize: 40 }}>{won ? '🏆' : '🎯'}</div>
                <h3>{won ? 'You Won!' : 'Game Over'}</h3>
                <p>Score: <b>{score.toLocaleString()}</b></p>
                <button className="gs-btn gs-btn-primary" onClick={startGame}>Play Again</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="game-touch-controls pb-touch">
        <div className="pb-touch-row">
          <button className="pb-flip-btn" {...holdFlipper('left')} aria-label="Left flipper">◀ FLIP</button>
          <button className="pb-launch-btn" {...holdLaunch} aria-label="Launch ball">LAUNCH</button>
          <button className="pb-flip-btn" {...holdFlipper('right')} aria-label="Right flipper">FLIP ▶</button>
        </div>
      </div>
    </div>
  );
}
