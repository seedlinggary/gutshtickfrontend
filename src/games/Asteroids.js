import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';
import HowToPlay from './HowToPlay';
import './Asteroids.css';

const W = 720;
const H = 540;

// Ship
const SHIP_R = 14;
const ROT_SPEED = 3.7;      // rad / s
const THRUST = 300;         // px / s^2
const DRAG = 0.55;          // velocity decay per second (slight space friction)
const MAX_SPEED = 380;      // px / s

// Bullets
const BULLET_SPEED = 540;   // px / s
const BULLET_LIFE = 1.0;    // seconds
const FIRE_CD = 0.22;       // seconds between shots
const MAX_BULLETS = 5;

const INVULN_TIME = 2.4;    // seconds of respawn invulnerability
const START_LIVES = 3;

// Asteroid size classes
const SIZES = {
  large: { r: 46, min: 34, max: 66, score: 20, next: 'medium' },
  medium: { r: 27, min: 58, max: 96, score: 50, next: 'small' },
  small: { r: 15, min: 90, max: 150, score: 100, next: null },
};

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);

let ID = 1;
const nextId = () => ID++;

function makeAsteroid(size, x, y, vx, vy) {
  const spec = SIZES[size];
  // Irregular closed polygon: randomized vertex radii around a circle.
  const n = Math.floor(rand(9, 13));
  const verts = [];
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * TAU;
    const rr = spec.r * rand(0.72, 1.18);
    verts.push({ ang, r: rr });
  }
  let dvx = vx, dvy = vy;
  if (dvx === undefined) {
    const dir = rand(0, TAU);
    const sp = rand(spec.min, spec.max);
    dvx = Math.cos(dir) * sp;
    dvy = Math.sin(dir) * sp;
  }
  return {
    id: nextId(), size, x, y, vx: dvx, vy: dvy,
    r: spec.r, verts, rot: rand(0, TAU), spin: rand(-1.4, 1.4),
  };
}

function initShip() {
  return { x: W / 2, y: H / 2, vx: 0, vy: 0, angle: -Math.PI / 2, thrusting: false };
}

function spawnWave(waveNum) {
  const count = 3 + waveNum; // wave 1 -> 4 large asteroids
  const asteroids = [];
  for (let i = 0; i < count; i++) {
    // Position away from the ship's center start.
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < 160);
    asteroids.push(makeAsteroid('large', x, y));
  }
  return asteroids;
}

function initState() {
  return {
    ship: initShip(),
    bullets: [],
    asteroids: spawnWave(1),
    wave: 1,
    lives: START_LIVES,
    score: 0,
    invuln: INVULN_TIME,
    fireCd: 0,
    dead: false,
    respawnTimer: 0,
  };
}

function wrap(o) {
  if (o.x < 0) o.x += W; else if (o.x > W) o.x -= W;
  if (o.y < 0) o.y += H; else if (o.y > H) o.y -= H;
}

export default function Asteroids() {
  const canvasRef = useRef(null);
  const stateRef = useRef(initState());
  const rafRef = useRef(null);
  const lastRef = useRef(0);
  const inputRef = useRef({ left: false, right: false, thrust: false, fire: false });

  const [gameStatus, setGameStatus] = useState('idle'); // idle | playing | over
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(START_LIVES);
  const [wave, setWave] = useState(1);
  const [won, setWon] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [stats, setStats] = useState({ wins: 0, losses: 0, best_score: 0 });
  const saved = useRef(false);

  useEffect(() => {
    if (isLoggedIn()) {
      apiRequest('GET', null, '/game/stats').then((d) => {
        if (d?.asteroids) setStats(d.asteroids);
      }).catch(() => {});
    }
  }, []);

  const saveResult = useCallback((result, s) => {
    if (saved.current || !isLoggedIn()) return;
    saved.current = true;
    apiRequest('POST', { game_type: 'asteroids', result, difficulty: 'medium', score: s }, '/game/save').catch(() => {});
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);

    // Asteroids — thin cyan/white wireframe
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#dbeafe';
    ctx.lineJoin = 'round';
    for (const a of s.asteroids) {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rot);
      ctx.beginPath();
      a.verts.forEach((v, i) => {
        const px = Math.cos(v.ang) * v.r;
        const py = Math.sin(v.ang) * v.r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    // Bullets
    ctx.fillStyle = '#7dd3fc';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 8;
    for (const b of s.bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2.4, 0, TAU);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Ship (skip flicker frames during invulnerability)
    const flicker = s.invuln > 0 && Math.floor(s.invuln * 12) % 2 === 0;
    if (!s.dead && !flicker) {
      const { x, y, angle } = s.ship;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(SHIP_R, 0);
      ctx.lineTo(-SHIP_R * 0.7, SHIP_R * 0.62);
      ctx.lineTo(-SHIP_R * 0.4, 0);
      ctx.lineTo(-SHIP_R * 0.7, -SHIP_R * 0.62);
      ctx.closePath();
      ctx.stroke();
      // Thrust flame
      if (s.ship.thrusting) {
        ctx.strokeStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(-SHIP_R * 0.4, 0);
        ctx.lineTo(-SHIP_R * (0.9 + Math.random() * 0.5), 0);
        ctx.stroke();
      }
      ctx.restore();
    }
  }, []);

  const endGame = useCallback((s) => {
    s.dead = true;
    setGameStatus('over');
    gameStatusRef.current = 'over';
    setScore(s.score);
    setHighScore((h) => Math.max(h, s.score));
    saveResult('loss', s.score);
  }, [saveResult]);

  const step = useCallback((dt) => {
    const s = stateRef.current;
    const input = inputRef.current;
    const ship = s.ship;

    if (!s.dead) {
      if (input.left) ship.angle -= ROT_SPEED * dt;
      if (input.right) ship.angle += ROT_SPEED * dt;
      ship.thrusting = input.thrust;
      if (input.thrust) {
        ship.vx += Math.cos(ship.angle) * THRUST * dt;
        ship.vy += Math.sin(ship.angle) * THRUST * dt;
      }
      // drag
      const drag = Math.max(0, 1 - DRAG * dt);
      ship.vx *= drag;
      ship.vy *= drag;
      const sp = Math.hypot(ship.vx, ship.vy);
      if (sp > MAX_SPEED) {
        ship.vx = (ship.vx / sp) * MAX_SPEED;
        ship.vy = (ship.vy / sp) * MAX_SPEED;
      }
      ship.x += ship.vx * dt;
      ship.y += ship.vy * dt;
      wrap(ship);

      // Firing
      s.fireCd -= dt;
      if (input.fire && s.fireCd <= 0 && s.bullets.length < MAX_BULLETS) {
        s.fireCd = FIRE_CD;
        const nx = Math.cos(ship.angle);
        const ny = Math.sin(ship.angle);
        s.bullets.push({
          x: ship.x + nx * SHIP_R,
          y: ship.y + ny * SHIP_R,
          vx: nx * BULLET_SPEED,
          vy: ny * BULLET_SPEED,
          life: BULLET_LIFE,
        });
      }
    } else if (s.respawnTimer > 0) {
      s.respawnTimer -= dt;
      if (s.respawnTimer <= 0 && s.lives > 0) {
        // respawn
        s.ship = initShip();
        s.dead = false;
        s.invuln = INVULN_TIME;
      }
    }

    if (s.invuln > 0) s.invuln -= dt;

    // Bullets
    for (const b of s.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      wrap(b);
    }
    s.bullets = s.bullets.filter((b) => b.life > 0);

    // Asteroids
    for (const a of s.asteroids) {
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.rot += a.spin * dt;
      wrap(a);
    }

    // Bullet -> asteroid collisions
    const newAsteroids = [];
    const deadBullets = new Set();
    let scored = 0;
    for (const a of s.asteroids) {
      let hit = false;
      for (let i = 0; i < s.bullets.length; i++) {
        const b = s.bullets[i];
        if (deadBullets.has(i)) continue;
        if (Math.hypot(b.x - a.x, b.y - a.y) < a.r) {
          hit = true;
          deadBullets.add(i);
          break;
        }
      }
      if (hit) {
        scored += SIZES[a.size].score;
        const nextSize = SIZES[a.size].next;
        if (nextSize) {
          for (let k = 0; k < 2; k++) {
            const dir = rand(0, TAU);
            const sp = rand(SIZES[nextSize].min, SIZES[nextSize].max);
            newAsteroids.push(makeAsteroid(nextSize, a.x, a.y, Math.cos(dir) * sp, Math.sin(dir) * sp));
          }
        }
      } else {
        newAsteroids.push(a);
      }
    }
    if (deadBullets.size > 0) {
      s.bullets = s.bullets.filter((_, i) => !deadBullets.has(i));
    }
    s.asteroids = newAsteroids;
    if (scored > 0) {
      s.score += scored;
      setScore(s.score);
    }

    // Ship -> asteroid collision
    if (!s.dead && s.invuln <= 0) {
      for (const a of s.asteroids) {
        if (Math.hypot(ship.x - a.x, ship.y - a.y) < a.r + SHIP_R * 0.7) {
          s.lives -= 1;
          setLives(s.lives);
          s.dead = true;
          if (s.lives <= 0) {
            endGame(s);
          } else {
            s.respawnTimer = 1.1;
          }
          break;
        }
      }
    }

    // Wave cleared
    if (s.asteroids.length === 0 && !s.dead) {
      if (!won) {
        setWon(true);
        saveResult('win', s.score);
      }
      s.wave += 1;
      setWave(s.wave);
      s.asteroids = spawnWave(s.wave);
      s.invuln = Math.max(s.invuln, 1.4);
    }
  }, [won, saveResult, endGame]);

  // keep a ref of status so the raf loop reads the latest without re-subscribing
  const gameStatusRef = useRef('idle');
  useEffect(() => { gameStatusRef.current = gameStatus; }, [gameStatus]);

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
    ID = 1;
    stateRef.current = initState();
    inputRef.current = { left: false, right: false, thrust: false, fire: false };
    setScore(0);
    setLives(START_LIVES);
    setWave(1);
    setWon(false);
    setGameStatus('playing');
    gameStatusRef.current = 'playing';
    lastRef.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);
  }, [loop]);

  // Keyboard
  useEffect(() => {
    const setKey = (e, val) => {
      switch (e.key) {
        case 'ArrowLeft': case 'a': case 'A': inputRef.current.left = val; break;
        case 'ArrowRight': case 'd': case 'D': inputRef.current.right = val; break;
        case 'ArrowUp': case 'w': case 'W': inputRef.current.thrust = val; break;
        case ' ': case 'Spacebar': inputRef.current.fire = val; break;
        default: return;
      }
      e.preventDefault();
    };
    const down = (e) => setKey(e, true);
    const up = (e) => setKey(e, false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  useEffect(() => { draw(); }, [draw]);
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // Touch button helpers
  const hold = (key) => ({
    onPointerDown: (e) => { e.preventDefault(); inputRef.current[key] = true; },
    onPointerUp: (e) => { e.preventDefault(); inputRef.current[key] = false; },
    onPointerLeave: () => { inputRef.current[key] = false; },
    onPointerCancel: () => { inputRef.current[key] = false; },
  });

  return (
    <div className="game-page">
      <div className="game-header">
        <Link to="/games" className="game-back">← Games</Link>
        <h1 className="game-title">Asteroids</h1>
        <p className="game-subtitle">Blast the rocks, don't get hit. Rotate, thrust, fire.</p>
      </div>

      <HowToPlay>
        <p><b>Objective:</b> destroy every asteroid in the wave without crashing your ship.</p>
        <ul>
          <li>Rotate with Left/Right arrows or A/D, thrust with Up arrow or W, and fire with Space.</li>
          <li>The ship keeps drifting after you stop thrusting — true space inertia, so plan your momentum.</li>
          <li>Large asteroids split into two mediums, mediums into two smalls, and smalls are destroyed. Smaller rocks are worth more (20 / 50 / 100).</li>
          <li>Everything wraps around the screen edges — fly off one side and reappear on the other.</li>
          <li>Clearing every asteroid wins the wave; a new, larger wave then spawns so you can keep building your score.</li>
          <li>Getting hit costs a life (you briefly flicker while invulnerable on respawn). Lose all 3 lives and it's game over.</li>
          <li>On mobile, use the on-screen rotate / thrust / fire buttons.</li>
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

      <div className="ast-canvas-wrapper" style={{ width: '100%', maxWidth: W }}>
        <div className="ast-score-row">
          <span>Score: <b>{score}</b></span>
          <span>Wave: <b>{wave}</b></span>
          <span>Ships: <b>{'▲ '.repeat(Math.max(0, lives)).trim() || '—'}</b></span>
        </div>

        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="ast-canvas"
          style={{ touchAction: 'none', width: '100%', maxWidth: W, height: 'auto', display: 'block' }}
        />

        {won && gameStatus === 'playing' && (
          <div className="ast-win-flash">WAVE CLEARED</div>
        )}

        {gameStatus === 'idle' && (
          <div className="ast-overlay" onClick={startGame} style={{ cursor: 'pointer' }}>
            <div className="ast-overlay-inner">
              <p>Press <b>Start Game</b> to play</p>
              <p style={{ fontSize: 13, opacity: 0.7 }}>Arrows / WASD · Space to fire</p>
              <p style={{ fontSize: 12, opacity: 0.55, marginTop: 4 }}>(or tap anywhere here)</p>
            </div>
          </div>
        )}

        {gameStatus === 'over' && (
          <div className="ast-overlay">
            <div className="ast-overlay-inner">
              <div style={{ fontSize: 40 }}>{won ? '🏆' : '💥'}</div>
              <h3>{won ? 'Great Run!' : 'Game Over'}</h3>
              <p>Score: <b>{score}</b> · Wave <b>{wave}</b></p>
              <button className="gs-btn gs-btn-primary" onClick={startGame}>Play Again</button>
            </div>
          </div>
        )}
      </div>

      <div className="game-touch-controls ast-touch">
        <div className="ast-touch-row">
          <button {...hold('left')} aria-label="Rotate left">⟲</button>
          <button {...hold('thrust')} aria-label="Thrust">▲</button>
          <button {...hold('right')} aria-label="Rotate right">⟳</button>
          <button {...hold('fire')} aria-label="Fire">🔫</button>
        </div>
      </div>
    </div>
  );
}
