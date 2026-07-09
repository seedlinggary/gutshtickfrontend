import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';
import HowToPlay from './HowToPlay';
import './Breakout.css';

const W = 720;
const H = 520;

const PADDLE_W = 112;      // base paddle width
const PADDLE_H = 14;
const PADDLE_Y = H - 40;
const BALL_R = 8;

const BASE_SPEED = 330;   // px / s
const MAX_SPEED = 470;
const MAX_BOUNCE = 1.05;  // radians from vertical at the paddle edge (~60deg)
const START_LIVES = 3;

const WIN_LEVEL = 5;       // reaching this level logs a "win"

// Power-up tuning
const WIDE_MULT = 1.65;
const SLOW_MULT = 0.6;
const WIDE_TIME = 10;      // seconds
const SLOW_TIME = 9;       // seconds
const CAPSULE_VY = 155;    // falling speed of power-up capsules
const CAPSULE_W = 30;
const CAPSULE_H = 16;
const MAX_BALLS = 6;

// Brick grid geometry (per-cell size is recomputed per level from col count)
const GRID_TOP = 60;
const GRID_LEFT = 40;
const GRID_GAP = 6;
const BRICK_H = 22;

// Colors for normal bricks (by row); top rows worth more.
const ROW_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#a855f7', '#ec4899', '#14b8a6'];

const POWERUPS = {
  multi: { color: '#c084fc', glyph: '⁛', label: 'Multi-Ball' },
  chaos: { color: '#f87171', glyph: '?', label: 'Chaos' },
  wide:  { color: '#4ade80', glyph: '↔', label: 'Wide Paddle' },
  slow:  { color: '#38bdf8', glyph: 'S', label: 'Slow Ball' },
  life:  { color: '#f472b6', glyph: '♥', label: 'Extra Life' },
};
// Weighted drop pool — life is rarer than the rest.
const DROP_POOL = ['multi', 'multi', 'chaos', 'chaos', 'wide', 'wide', 'slow', 'slow', 'life'];

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function makeBall() {
  return { x: W / 2, y: PADDLE_Y - BALL_R - 1, vx: 0, vy: 0, r: BALL_R, trail: [] };
}

function countBreakable(bricks) {
  let n = 0;
  for (const b of bricks) if (b.type !== 'solid') n += 1;
  return n;
}

function resetBallOnPaddle(s) {
  s.paddleX = W / 2;
  s.balls = [makeBall()];
  s.stuck = true;
}

const LEVEL_PATTERNS = ['grid', 'gaps', 'pyramid', 'diamond', 'zigzag', 'checker', 'columns'];

function pickPattern(level) {
  if (level === 1) return 'grid';
  return LEVEL_PATTERNS[Math.floor(Math.random() * LEVEL_PATTERNS.length)];
}

// Procedural level generator. Produces a genuinely different, hand-designed-feeling
// layout every level, with brick variety and difficulty that scales with `level`.
function buildLevel(level) {
  const pattern = pickPattern(level);
  const cols = 9 + Math.floor(Math.random() * 3);           // 9-11
  const rows = clamp(4 + Math.floor((level - 1) / 2) + (Math.random() < 0.4 ? 1 : 0), 4, 8);
  const gap = GRID_GAP;
  const brickW = (W - GRID_LEFT * 2 - gap * (cols - 1)) / cols;
  const brickH = BRICK_H;
  const stagger = pattern === 'zigzag' || (pattern === 'grid' && Math.random() < 0.35);
  const mid = (cols - 1) / 2;
  const midRow = (rows - 1) / 2;

  // Precompute empty columns for gap/column patterns so a level is internally consistent.
  const emptyCols = new Set();
  if (pattern === 'gaps') {
    const n = 1 + Math.floor(Math.random() * 3);
    while (emptyCols.size < n) emptyCols.add(Math.floor(Math.random() * cols));
  }
  const colParity = Math.floor(Math.random() * 2);

  const present = (r, c) => {
    switch (pattern) {
      case 'gaps':    return !emptyCols.has(c);
      case 'columns': return c % 2 === colParity;
      case 'pyramid': return Math.abs(c - mid) <= r + 0.25;                 // point at top
      case 'diamond': return Math.abs(c - mid) <= (midRow - Math.abs(r - midRow)) + 0.75;
      case 'zigzag':  return ((r + c) % 4) < 2;                             // diagonal stripes
      case 'checker': return (r + c) % 2 === 0;
      case 'grid':
      default:        return Math.random() > 0.06;                          // occasional holes
    }
  };

  // Difficulty scaling for tougher bricks.
  const toughChance = Math.min(0.10 + level * 0.05, 0.42);
  const solidChance = level >= 3 ? Math.min((level - 2) * 0.03, 0.12) : 0;

  const bricks = [];
  for (let r = 0; r < rows; r++) {
    const off = stagger && r % 2 === 1 ? brickW / 2 : 0;
    for (let c = 0; c < cols; c++) {
      if (off && c === cols - 1) continue;   // keep staggered rows in bounds
      if (!present(r, c)) continue;
      const x = GRID_LEFT + c * (brickW + gap) + off;
      const y = GRID_TOP + r * (brickH + gap);

      let type = 'normal';
      let hp = 1;
      const roll = Math.random();
      if (roll < solidChance) {
        type = 'solid';
        hp = Infinity;
      } else if (roll < solidChance + toughChance) {
        type = 'tough';
        hp = 2 + (level >= 3 && Math.random() < 0.4 ? 1 : 0); // 2 or 3 hits
      }

      const points = type === 'tough'
        ? 40 * hp
        : Math.min(10 + (rows - 1 - r) * 10, 80);

      bricks.push({
        x, y, w: brickW, h: brickH,
        type, hp, maxHp: hp,
        color: ROW_COLORS[r % ROW_COLORS.length],
        points, alive: true, powerup: null,
      });
    }
  }

  // Sprinkle a few power-up drops onto breakable bricks (rare — feels like a treat).
  const breakable = bricks.filter((b) => b.type !== 'solid');
  const drops = clamp(Math.round(breakable.length * 0.11), 2, 6);
  const shuffled = breakable.slice().sort(() => Math.random() - 0.5);
  for (let i = 0; i < drops && i < shuffled.length; i++) {
    shuffled[i].powerup = DROP_POOL[Math.floor(Math.random() * DROP_POOL.length)];
  }

  return bricks;
}

function initState() {
  const bricks = buildLevel(1);
  return {
    level: 1,
    paddleX: W / 2,
    paddleW: PADDLE_W,
    balls: [makeBall()],
    stuck: true,                  // ball rests on paddle until launched
    bricks,
    remaining: countBreakable(bricks),
    lives: START_LIVES,
    score: 0,
    speed: BASE_SPEED,
    powerups: [],                 // falling capsules { x, y, type }
    effects: { wide: 0, slow: 0 },// remaining seconds
    slowActive: false,
    banner: 0,                    // "LEVEL n" banner timer
  };
}

export default function Breakout() {
  const canvasRef = useRef(null);
  const stateRef = useRef(initState());
  const rafRef = useRef(null);
  const lastRef = useRef(0);
  const keysRef = useRef({ left: false, right: false });
  const gameStatusRef = useRef('idle');
  const toastTimer = useRef(null);

  const [gameStatus, setGameStatus] = useState('idle'); // idle | playing | over
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(START_LIVES);
  const [level, setLevel] = useState(1);
  const [won, setWon] = useState(false);
  const [toast, setToast] = useState('');
  const [highScore, setHighScore] = useState(0);
  const [stats, setStats] = useState({ wins: 0, losses: 0, best_score: 0 });
  const saved = useRef(false);       // guards the loss save
  const wonLogged = useRef(false);   // guards the win save

  useEffect(() => { gameStatusRef.current = gameStatus; }, [gameStatus]);

  useEffect(() => {
    if (isLoggedIn()) {
      apiRequest('GET', null, '/game/stats').then((d) => {
        if (d?.breakout) setStats(d.breakout);
      }).catch(() => {});
    }
  }, []);

  useEffect(() => () => { clearTimeout(toastTimer.current); }, []);

  const flashToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 1800);
  }, []);

  // Mirrors the Missile Command save pattern: a game logs a win (milestone reached)
  // OR a loss (died first), never both — once won, no loss is recorded.
  const saveResult = useCallback((result, s) => {
    if (result === 'win') {
      if (wonLogged.current) return;
      wonLogged.current = true;
    } else {
      if (saved.current || wonLogged.current) return;
      saved.current = true;
    }
    if (!isLoggedIn()) return;
    apiRequest('POST', { game_type: 'breakout', result, difficulty: 'medium', score: s }, '/game/save').catch(() => {});
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    // Bricks
    for (const b of s.bricks) {
      if (!b.alive) continue;

      if (b.type === 'solid') {
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.w, b.h, 3);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.10)';
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.w, b.h * 0.4, 3);
        ctx.fill();
        // rivets to read as an immovable pillar
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        const rr = 2;
        [[b.x + 5, b.y + 5], [b.x + b.w - 5, b.y + 5], [b.x + 5, b.y + b.h - 5], [b.x + b.w - 5, b.y + b.h - 5]].forEach(([px, py]) => {
          ctx.beginPath(); ctx.arc(px, py, rr, 0, Math.PI * 2); ctx.fill();
        });
      } else if (b.type === 'tough') {
        const shade = b.hp >= 3 ? '#e2e8f0' : b.hp === 2 ? '#94a3b8' : '#64748b';
        ctx.fillStyle = shade;
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.w, b.h, 4);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.20)';
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.w, b.h * 0.4, 4);
        ctx.fill();
        // cracks appear as it takes damage
        if (b.hp < b.maxHp) {
          ctx.strokeStyle = 'rgba(15,23,42,0.75)';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
          ctx.moveTo(cx, b.y + 2); ctx.lineTo(cx - 4, cy); ctx.lineTo(cx + 3, b.y + b.h - 2);
          ctx.moveTo(b.x + 3, cy); ctx.lineTo(cx, cy - 2); ctx.lineTo(b.x + b.w - 3, cy + 2);
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.w, b.h, 4);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.w, b.h * 0.4, 4);
        ctx.fill();
      }

      // Power-up hint glyph
      if (b.powerup) {
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.font = '700 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★', b.x + b.w / 2, b.y + b.h / 2 + 1);
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'left';
      }
    }

    // Falling power-up capsules
    for (const p of s.powerups) {
      const meta = POWERUPS[p.type];
      ctx.fillStyle = meta.color;
      ctx.shadowColor = meta.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(p.x - CAPSULE_W / 2, p.y - CAPSULE_H / 2, CAPSULE_W, CAPSULE_H, 7);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0f172a';
      ctx.font = '800 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(meta.glyph, p.x, p.y + 1);
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
    }

    // Balls (with per-ball trail)
    for (const ball of s.balls) {
      for (let i = 0; i < ball.trail.length; i++) {
        const t = ball.trail[i];
        const a = (i / ball.trail.length) * 0.4;
        ctx.fillStyle = `rgba(56,189,248,${a})`;
        ctx.beginPath();
        ctx.arc(t.x, t.y, BALL_R * (0.5 + (i / ball.trail.length) * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#e0f2fe';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Paddle (width may be boosted by Wide power-up)
    const pw = s.paddleW;
    const px = s.paddleX - pw / 2;
    const grad = ctx.createLinearGradient(0, PADDLE_Y, 0, PADDLE_Y + PADDLE_H);
    grad.addColorStop(0, s.effects.wide > 0 ? '#4ade80' : '#38bdf8');
    grad.addColorStop(1, s.effects.wide > 0 ? '#16a34a' : '#0ea5e9');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(px, PADDLE_Y, pw, PADDLE_H, 7);
    ctx.fill();

    // Active-effect duration bars (bottom-left)
    let by = H - 16;
    const drawBar = (frac, color, label) => {
      const bw = 90;
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(12, by, bw, 6);
      ctx.fillStyle = color;
      ctx.fillRect(12, by, bw * clamp(frac, 0, 1), 6);
      ctx.fillStyle = color;
      ctx.font = '700 10px system-ui, sans-serif';
      ctx.fillText(label, 12 + bw + 6, by + 6);
      by -= 14;
    };
    if (s.effects.slow > 0) drawBar(s.effects.slow / SLOW_TIME, '#38bdf8', 'SLOW');
    if (s.effects.wide > 0) drawBar(s.effects.wide / WIDE_TIME, '#4ade80', 'WIDE');

    // Level banner
    if (s.banner > 0) {
      ctx.fillStyle = `rgba(224,242,254,${clamp(s.banner, 0, 1)})`;
      ctx.textAlign = 'center';
      ctx.font = '800 34px system-ui, sans-serif';
      ctx.fillText(`LEVEL ${s.level}`, W / 2, H / 2 - 12);
      ctx.textAlign = 'left';
    }
  }, []);

  const launchBall = useCallback(() => {
    const s = stateRef.current;
    if (!s.stuck) return;
    s.stuck = false;
    const angle = Math.random() * 0.5 - 0.25;
    const sp = s.speed * (s.slowActive ? SLOW_MULT : 1);
    s.balls[0].vx = Math.sin(angle) * sp;
    s.balls[0].vy = -Math.cos(angle) * sp;
  }, []);

  const activatePowerup = useCallback((s, type) => {
    switch (type) {
      case 'multi': {
        if (s.stuck) launchBall();
        const src = s.balls.slice();
        for (const ball of src) {
          const sp = Math.hypot(ball.vx, ball.vy) || s.speed;
          const baseAng = Math.atan2(ball.vy, ball.vx);
          for (const off of [0.4, -0.4]) {
            if (s.balls.length >= MAX_BALLS) break;
            const a = baseAng + off;
            s.balls.push({ x: ball.x, y: ball.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: BALL_R, trail: [] });
          }
        }
        break;
      }
      case 'chaos': {
        if (s.stuck) launchBall();
        for (const ball of s.balls) {
          const sp = Math.hypot(ball.vx, ball.vy) || s.speed;
          // random direction in the upper hemisphere so it stays fun, not instant death
          const a = -Math.PI + 0.35 + Math.random() * (Math.PI - 0.7);
          ball.vx = Math.cos(a) * sp;
          ball.vy = Math.sin(a) * sp;
        }
        break;
      }
      case 'wide':
        s.paddleW = Math.min(W * 0.55, PADDLE_W * WIDE_MULT);
        s.effects.wide = WIDE_TIME;
        break;
      case 'slow':
        if (!s.slowActive) {
          for (const ball of s.balls) { ball.vx *= SLOW_MULT; ball.vy *= SLOW_MULT; }
          s.slowActive = true;
        }
        s.effects.slow = SLOW_TIME;
        break;
      case 'life':
        s.lives += 1;
        setLives(s.lives);
        break;
      default: break;
    }
    flashToast(POWERUPS[type].label + '!');
  }, [launchBall, flashToast]);

  const loseLife = useCallback((s) => {
    s.lives -= 1;
    setLives(s.lives);
    // clear transient state
    s.powerups = [];
    s.paddleW = PADDLE_W;
    s.effects = { wide: 0, slow: 0 };
    s.slowActive = false;
    if (s.lives <= 0) {
      setGameStatus('over');
      gameStatusRef.current = 'over';
      setScore(s.score);
      setHighScore((h) => Math.max(h, s.score));
      saveResult('loss', s.score);
      return;
    }
    resetBallOnPaddle(s);
  }, [saveResult]);

  const nextLevel = useCallback((s) => {
    s.level += 1;
    setLevel(s.level);
    s.bricks = buildLevel(s.level);
    s.remaining = countBreakable(s.bricks);
    s.speed = Math.min(MAX_SPEED, BASE_SPEED + (s.level - 1) * 10);
    // fresh start for the new level
    s.powerups = [];
    s.paddleW = PADDLE_W;
    s.effects = { wide: 0, slow: 0 };
    s.slowActive = false;
    resetBallOnPaddle(s);
    s.banner = 2.0;
    if (s.level >= WIN_LEVEL && !wonLogged.current) {
      setWon(true);
      saveResult('win', s.score);
      flashToast(`Level ${WIN_LEVEL} reached — Win saved!`);
    } else {
      flashToast(`Level ${s.level}!`);
    }
  }, [saveResult, flashToast]);

  // Resolve ball vs one brick using closest-point normal. Returns true if hit.
  const collideBrick = (ball, b) => {
    const cx = clamp(ball.x, b.x, b.x + b.w);
    const cy = clamp(ball.y, b.y, b.y + b.h);
    const dx = ball.x - cx;
    const dy = ball.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 > ball.r * ball.r) return false;

    if (dx === 0 && dy === 0) {
      const overlapX = Math.min(ball.x - b.x, b.x + b.w - ball.x);
      const overlapY = Math.min(ball.y - b.y, b.y + b.h - ball.y);
      if (overlapX < overlapY) {
        ball.vx = -ball.vx;
        ball.x += ball.vx > 0 ? overlapX + ball.r : -(overlapX + ball.r);
      } else {
        ball.vy = -ball.vy;
        ball.y += ball.vy > 0 ? overlapY + ball.r : -(overlapY + ball.r);
      }
      return true;
    }

    const dist = Math.sqrt(d2) || 0.0001;
    const nx = dx / dist;
    const ny = dy / dist;
    const pen = ball.r - dist;
    ball.x += nx * pen;
    ball.y += ny * pen;
    if (Math.abs(nx) > Math.abs(ny)) {
      if (ball.vx * nx < 0) ball.vx = -ball.vx;
    } else {
      if (ball.vy * ny < 0) ball.vy = -ball.vy;
    }
    return true;
  };

  const step = useCallback((dt) => {
    const s = stateRef.current;

    // Paddle keyboard movement (pointer handled separately)
    const pspeed = 520;
    if (keysRef.current.left) s.paddleX -= pspeed * dt;
    if (keysRef.current.right) s.paddleX += pspeed * dt;
    s.paddleX = clamp(s.paddleX, s.paddleW / 2, W - s.paddleW / 2);

    // Timed effects
    if (s.banner > 0) s.banner = Math.max(0, s.banner - dt);
    if (s.effects.wide > 0) {
      s.effects.wide -= dt;
      if (s.effects.wide <= 0) { s.effects.wide = 0; s.paddleW = PADDLE_W; }
    }
    if (s.effects.slow > 0) {
      s.effects.slow -= dt;
      if (s.effects.slow <= 0) {
        s.effects.slow = 0;
        if (s.slowActive) { for (const ball of s.balls) { ball.vx /= SLOW_MULT; ball.vy /= SLOW_MULT; } }
        s.slowActive = false;
      }
    }

    // Falling power-up capsules
    for (let i = s.powerups.length - 1; i >= 0; i--) {
      const p = s.powerups[i];
      p.y += CAPSULE_VY * dt;
      const caught = p.y + CAPSULE_H / 2 >= PADDLE_Y &&
        p.y - CAPSULE_H / 2 <= PADDLE_Y + PADDLE_H &&
        p.x >= s.paddleX - s.paddleW / 2 - CAPSULE_W / 2 &&
        p.x <= s.paddleX + s.paddleW / 2 + CAPSULE_W / 2;
      if (caught) {
        s.powerups.splice(i, 1);
        activatePowerup(s, p.type);
      } else if (p.y - CAPSULE_H / 2 > H) {
        s.powerups.splice(i, 1);
      }
    }

    if (s.stuck) {
      s.balls[0].x = s.paddleX;
      s.balls[0].y = PADDLE_Y - BALL_R - 1;
      return;
    }

    const speedUp = (ball) => {
      if (s.slowActive) return;
      if (s.remaining % 8 === 0 && s.speed < MAX_SPEED) {
        s.speed = Math.min(MAX_SPEED, s.speed + 12);
        const cur = Math.hypot(ball.vx, ball.vy) || 1;
        ball.vx = (ball.vx / cur) * s.speed;
        ball.vy = (ball.vy / cur) * s.speed;
      }
    };

    const hitBrick = (b, ball) => {
      if (b.type === 'solid') return;          // indestructible — ball just bounced
      b.hp -= 1;
      if (b.hp > 0) { s.score += 5; setScore(s.score); return; }
      b.alive = false;
      s.remaining -= 1;
      s.score += b.points;
      setScore(s.score);
      if (b.powerup) {
        s.powerups.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, type: b.powerup });
      }
      speedUp(ball);
    };

    const lost = [];
    for (let bi = 0; bi < s.balls.length; bi++) {
      const ball = s.balls[bi];
      const speed = Math.hypot(ball.vx, ball.vy) || 1;
      const steps = Math.max(1, Math.ceil((speed * dt) / (BALL_R * 0.75)));
      const sdt = dt / steps;
      let fell = false;

      for (let iter = 0; iter < steps; iter++) {
        ball.x += ball.vx * sdt;
        ball.y += ball.vy * sdt;

        // Walls
        if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); }
        else if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); }
        if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); }

        // Paddle
        if (ball.vy > 0 &&
            ball.y + ball.r >= PADDLE_Y &&
            ball.y - ball.r <= PADDLE_Y + PADDLE_H &&
            ball.x >= s.paddleX - s.paddleW / 2 - ball.r &&
            ball.x <= s.paddleX + s.paddleW / 2 + ball.r) {
          const rel = clamp((ball.x - s.paddleX) / (s.paddleW / 2), -1, 1);
          const angle = rel * MAX_BOUNCE;
          const cap = s.slowActive ? MAX_SPEED * SLOW_MULT : MAX_SPEED;
          const sp = Math.min(cap, Math.hypot(ball.vx, ball.vy));
          ball.vx = Math.sin(angle) * sp;
          ball.vy = -Math.cos(angle) * sp;
          ball.y = PADDLE_Y - ball.r - 0.5;
        }

        // Bricks — resolve at most one per sub-step for stability
        for (const b of s.bricks) {
          if (!b.alive) continue;
          if (collideBrick(ball, b)) { hitBrick(b, ball); break; }
        }

        if (ball.y - ball.r > H) { fell = true; break; }
      }

      ball.trail.push({ x: ball.x, y: ball.y });
      if (ball.trail.length > 8) ball.trail.shift();
      if (fell) lost.push(bi);
    }

    // Remove lost balls (descending index)
    for (let i = lost.length - 1; i >= 0; i--) s.balls.splice(lost[i], 1);
    if (s.balls.length === 0) { loseLife(s); return; }

    // Level cleared → generate the next one (endless)
    if (s.remaining <= 0) { nextLevel(s); return; }
  }, [loseLife, nextLevel, activatePowerup]);

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
    wonLogged.current = false;
    stateRef.current = initState();
    keysRef.current = { left: false, right: false };
    setScore(0);
    setLives(START_LIVES);
    setLevel(1);
    setWon(false);
    setToast('');
    setGameStatus('playing');
    gameStatusRef.current = 'playing';
    lastRef.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);
  }, [loop]);

  // Keyboard
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { keysRef.current.left = true; e.preventDefault(); }
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { keysRef.current.right = true; e.preventDefault(); }
      else if (e.key === ' ' || e.key === 'Spacebar') { launchBall(); e.preventDefault(); }
    };
    const up = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysRef.current.left = false;
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [launchBall]);

  useEffect(() => { draw(); }, [draw]);
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // Pointer control — paddle tracks pointer x within the canvas.
  const pointerMove = (clientX) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = W / rect.width;
    const x = (clientX - rect.left) * scale;
    const s = stateRef.current;
    s.paddleX = clamp(x, s.paddleW / 2, W - s.paddleW / 2);
  };

  const handlePointerMove = (e) => { if (gameStatusRef.current === 'playing') pointerMove(e.clientX); };
  const handlePointerDown = (e) => {
    if (gameStatusRef.current === 'playing') { pointerMove(e.clientX); launchBall(); }
  };

  return (
    <div className="game-page">
      <div className="game-header">
        <Link to="/games" className="game-back">← Games</Link>
        <h1 className="game-title">Breakout</h1>
        <p className="game-subtitle">Clear every brick, level after level. Move with the mouse, launch with Space or a tap.</p>
      </div>

      <HowToPlay>
        <p><b>Objective:</b> smash the bricks to clear each level. Clearing a level generates a brand-new, tougher layout — keep going as far as you can on your 3 balls.</p>
        <ul>
          <li>Move the paddle by sliding the mouse (or your finger) left and right. Left/Right arrows or A/D also work.</li>
          <li>Press Space, click, or tap the board to launch the ball at the start of each turn.</li>
          <li>Where the ball hits the paddle changes its angle — hit near the center for a near-vertical bounce, the edges for a sharp angle.</li>
          <li><b>Brick types:</b> most break in one hit; steel bricks take 2-3 hits and crack as they weaken; dark riveted pillars are indestructible — play around them.</li>
          <li><b>Power-ups:</b> bricks marked with a ★ drop a capsule when destroyed — catch it with the paddle. Multi-Ball splits your ball, Chaos flings the ball off in a random direction, Wide Paddle and Slow Ball help for a while (watch the timer bar), and Extra Life gives +1 ball.</li>
          <li>Levels get denser and faster as you climb. Reaching Level {WIN_LEVEL} counts as a win — then keep pushing for score.</li>
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

      <div className="bk-canvas-wrapper" style={{ width: '100%', maxWidth: W }}>
        <div className="bk-score-row">
          <span>Score: <b>{score}</b></span>
          <span>Level: <b>{level}</b></span>
          <span>Balls: <b>{Math.max(0, lives)}</b></span>
        </div>

        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="bk-canvas"
          style={{ touchAction: 'none', width: '100%', maxWidth: W, height: 'auto', display: 'block' }}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
        />

        {toast && <div className="bk-toast">{toast}</div>}

        {gameStatus === 'idle' && (
          <div className="bk-overlay" onClick={startGame} style={{ cursor: 'pointer' }}>
            <div className="bk-overlay-inner">
              <p>Press <b>Start Game</b> to play</p>
              <p style={{ fontSize: 13, opacity: 0.7 }}>Mouse to move · Space / tap to launch · catch ★ power-ups</p>
              <p style={{ fontSize: 12, opacity: 0.55, marginTop: 4 }}>(or tap anywhere here)</p>
            </div>
          </div>
        )}

        {gameStatus === 'over' && (
          <div className="bk-overlay">
            <div className="bk-overlay-inner">
              <div style={{ fontSize: 40 }}>{won ? '🏆' : '💥'}</div>
              <h3>{won ? 'Great Run!' : 'Game Over'}</h3>
              <p>Reached Level <b>{level}</b></p>
              <p>Score: <b>{score}</b></p>
              <button className="gs-btn gs-btn-primary" onClick={startGame}>Play Again</button>
            </div>
          </div>
        )}
      </div>

      <div className="game-touch-controls bk-touch">
        <button onClick={launchBall}>Launch Ball</button>
      </div>
    </div>
  );
}
