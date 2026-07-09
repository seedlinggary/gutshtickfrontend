import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';
import HowToPlay from './HowToPlay';
import './SpaceInvaders.css';

const W = 640;
const H = 560;
const LEFT_BOUND = 30;
const RIGHT_BOUND = W - 30;

const ROWS = 5;
const COLS = 10;
const ALIEN_W = 30;
const ALIEN_H = 22;
const COL_SPACING = 46;
const ROW_SPACING = 38;
const FORM_LEFT = 90;
const FORM_TOP = 66;
const STEP_DOWN = 20;

const SHIP_W = 42;
const SHIP_H = 20;
const SHIP_Y = H - 44;
const SHIP_SPEED = 340;

const PLAYER_BULLET_SPEED = 560;
const ALIEN_BULLET_SPEED = 250;

const ROW_POINTS = [40, 20, 20, 10, 10];
const ROW_COLORS = ['#f472b6', '#c084fc', '#818cf8', '#4ade80', '#4ade80'];

const DIFF = {
  easy:   { baseSpeed: 34, fireEvery: 1.5, stepMul: 1.05 },
  medium: { baseSpeed: 46, fireEvery: 1.1, stepMul: 1.06 },
  hard:   { baseSpeed: 60, fireEvery: 0.8, stepMul: 1.07 },
};

// ── Barriers ──
const BARRIER_COLS = 9;
const BARRIER_ROWS = 6;
const BARRIER_CELL = 6;
const BARRIER_COUNT = 4;
const BARRIER_Y = SHIP_Y - 74;

function makeBarrier(x) {
  const cells = [];
  for (let r = 0; r < BARRIER_ROWS; r++) {
    const row = [];
    for (let c = 0; c < BARRIER_COLS; c++) {
      // carve an arch notch at the bottom-center
      const notch = r >= BARRIER_ROWS - 2 && c >= 3 && c <= 5;
      row.push(!notch);
    }
    cells.push(row);
  }
  return { x, y: BARRIER_Y, cells };
}

function initBarriers() {
  const barriers = [];
  const barW = BARRIER_COLS * BARRIER_CELL;
  const span = RIGHT_BOUND - LEFT_BOUND;
  for (let i = 0; i < BARRIER_COUNT; i++) {
    const cx = LEFT_BOUND + span * ((i + 0.5) / BARRIER_COUNT);
    barriers.push(makeBarrier(Math.round(cx - barW / 2)));
  }
  return barriers;
}

function initAliens() {
  const aliens = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      aliens.push({ row: r, col: c, alive: true });
  return aliens;
}

function initState(difficulty) {
  const cfg = DIFF[difficulty];
  return {
    aliens: initAliens(),
    formation: { dir: 1, x: 0, y: 0, speed: cfg.baseSpeed, stepMul: 1 },
    barriers: initBarriers(),
    ship: { x: W / 2 },
    playerBullet: null,          // { x, y }
    alienBullets: [],            // [{ x, y }]
    fireTimer: cfg.fireEvery,
    animTimer: 0,
    animFrame: 0,
    score: 0,
    lives: 3,
    input: { left: false, right: false, fire: false },
    lastTime: 0,
    raf: null,
  };
}

function alienWorld(a, f) {
  return {
    x: FORM_LEFT + a.col * COL_SPACING + f.x,
    y: FORM_TOP + a.row * ROW_SPACING + f.y,
  };
}

// Erode a barrier cell (plus a small cluster). Returns true if a cell was destroyed.
function hitBarrier(s, x, y) {
  for (const bar of s.barriers) {
    const lc = Math.floor((x - bar.x) / BARRIER_CELL);
    const lr = Math.floor((y - bar.y) / BARRIER_CELL);
    if (lc < 0 || lc >= BARRIER_COLS || lr < 0 || lr >= BARRIER_ROWS) continue;
    if (bar.cells[lr][lc]) {
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const rr = lr + dr, cc = lc + dc;
          if (rr >= 0 && rr < BARRIER_ROWS && cc >= 0 && cc < BARRIER_COLS && Math.abs(dr) + Math.abs(dc) < 2)
            bar.cells[rr][cc] = false;
        }
      return true;
    }
  }
  return false;
}

export default function SpaceInvaders() {
  const canvasRef = useRef(null);
  const stateRef = useRef(initState('medium'));
  const diffRef = useRef('medium');
  const [difficulty, setDifficulty] = useState('medium');
  const [gameStatus, setGameStatus] = useState('idle'); // idle | playing | over | won
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [stats, setStats] = useState({ wins: 0, losses: 0, best_score: 0 });
  const [bestScore, setBestScore] = useState(0);
  const saved = useRef(false);

  useEffect(() => {
    if (isLoggedIn()) {
      apiRequest('GET', null, '/game/stats').then((d) => {
        if (d?.space_invaders) setStats(d.space_invaders);
      }).catch(() => {});
    }
    return () => cancelAnimationFrame(stateRef.current.raf);
  }, []);

  const saveResult = useCallback((result, s) => {
    if (saved.current) return;
    saved.current = true;
    if (isLoggedIn()) {
      apiRequest('POST', { game_type: 'space_invaders', result, difficulty: diffRef.current, score: s.score }, '/game/save').catch(() => {});
    }
  }, []);

  const finish = useCallback((s, result) => {
    cancelAnimationFrame(s.raf);
    s.raf = null;
    saveResult(result, s);
    setScore(s.score);
    setLives(Math.max(0, s.lives));
    setBestScore((b) => Math.max(b, s.score));
    setGameStatus(result === 'win' ? 'won' : 'over');
  }, [saveResult]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;

    ctx.fillStyle = '#04070c';
    ctx.fillRect(0, 0, W, H);

    // starfield (static-ish subtle)
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    for (let i = 0; i < 40; i++) {
      const sx = (i * 97) % W;
      const sy = (i * 53) % (H - 60);
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }

    // ground line
    ctx.strokeStyle = 'rgba(74,222,128,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, SHIP_Y + SHIP_H + 6);
    ctx.lineTo(W, SHIP_Y + SHIP_H + 6);
    ctx.stroke();

    // Aliens
    s.aliens.forEach((a) => {
      if (!a.alive) return;
      const { x, y } = alienWorld(a, s.formation);
      ctx.fillStyle = ROW_COLORS[a.row];
      ctx.beginPath();
      ctx.roundRect(x, y, ALIEN_W, ALIEN_H - 4, 6);
      ctx.fill();
      // eyes
      ctx.fillStyle = '#04070c';
      ctx.beginPath(); ctx.arc(x + ALIEN_W * 0.32, y + 9, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + ALIEN_W * 0.68, y + 9, 2.4, 0, Math.PI * 2); ctx.fill();
      // legs wiggle
      ctx.fillStyle = ROW_COLORS[a.row];
      const off = s.animFrame ? 3 : -3;
      ctx.fillRect(x + 3, y + ALIEN_H - 5, 5, 5);
      ctx.fillRect(x + ALIEN_W - 8 + off * 0, y + ALIEN_H - 5, 5, 5);
      ctx.fillRect(x + ALIEN_W / 2 - 2 + off, y + ALIEN_H - 5, 4, 5);
    });

    // Barriers
    s.barriers.forEach((bar) => {
      ctx.fillStyle = '#22c55e';
      for (let r = 0; r < BARRIER_ROWS; r++)
        for (let c = 0; c < BARRIER_COLS; c++)
          if (bar.cells[r][c])
            ctx.fillRect(bar.x + c * BARRIER_CELL, bar.y + r * BARRIER_CELL, BARRIER_CELL, BARRIER_CELL);
    });

    // Player bullet
    if (s.playerBullet) {
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(s.playerBullet.x - 2, s.playerBullet.y - 12, 4, 12);
    }
    // Alien bullets
    ctx.fillStyle = '#f87171';
    s.alienBullets.forEach((b) => ctx.fillRect(b.x - 2, b.y, 4, 11));

    // Ship
    const shipX = s.ship.x;
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.moveTo(shipX, SHIP_Y - 6);
    ctx.lineTo(shipX + SHIP_W / 2, SHIP_Y + SHIP_H);
    ctx.lineTo(shipX - SHIP_W / 2, SHIP_Y + SHIP_H);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(shipX - 3, SHIP_Y - 14, 6, 10); // cannon

    // HUD
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE ${s.score}`, 14, 24);
    ctx.textAlign = 'right';
    ctx.fillText('▲'.repeat(Math.max(0, s.lives)), W - 14, 24);
    ctx.textAlign = 'left';
  }, []);

  const update = useCallback((dt) => {
    const s = stateRef.current;
    const cfg = DIFF[diffRef.current];

    // animation
    s.animTimer += dt;
    if (s.animTimer > 0.45) { s.animTimer = 0; s.animFrame = s.animFrame ? 0 : 1; }

    // Ship movement
    let vx = 0;
    if (s.input.left) vx -= SHIP_SPEED;
    if (s.input.right) vx += SHIP_SPEED;
    s.ship.x += vx * dt;
    s.ship.x = Math.max(LEFT_BOUND + SHIP_W / 2, Math.min(RIGHT_BOUND - SHIP_W / 2, s.ship.x));

    // Fire player bullet (one at a time)
    if (s.input.fire && !s.playerBullet) {
      s.playerBullet = { x: s.ship.x, y: SHIP_Y - 14 };
    }
    s.input.fire = false;

    // Alive stats
    const alive = s.aliens.filter((a) => a.alive);
    const aliveCount = alive.length;
    if (aliveCount === 0) { finish(s, 'win'); return; }

    // Formation movement
    const destroyedFrac = (ROWS * COLS - aliveCount) / (ROWS * COLS);
    const speed = s.formation.speed * (1 + destroyedFrac * 1.8) * s.formation.stepMul;
    s.formation.x += s.formation.dir * speed * dt;

    // Edge check
    let minX = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const a of alive) {
      const w = alienWorld(a, s.formation);
      if (w.x < minX) minX = w.x;
      if (w.x + ALIEN_W > maxX) maxX = w.x + ALIEN_W;
      if (w.y + ALIEN_H > maxY) maxY = w.y + ALIEN_H;
    }
    if (s.formation.dir > 0 && maxX >= RIGHT_BOUND) {
      s.formation.x -= (maxX - RIGHT_BOUND);
      s.formation.dir = -1;
      s.formation.y += STEP_DOWN;
      s.formation.stepMul *= cfg.stepMul;
    } else if (s.formation.dir < 0 && minX <= LEFT_BOUND) {
      s.formation.x += (LEFT_BOUND - minX);
      s.formation.dir = 1;
      s.formation.y += STEP_DOWN;
      s.formation.stepMul *= cfg.stepMul;
    }

    // Formation reached player row → game over
    if (maxY >= SHIP_Y - 4) { finish(s, 'loss'); return; }

    // Player bullet travel
    if (s.playerBullet) {
      s.playerBullet.y -= PLAYER_BULLET_SPEED * dt;
      if (s.playerBullet.y < -12) s.playerBullet = null;
    }
    // Player bullet vs alien
    if (s.playerBullet) {
      const bx = s.playerBullet.x, by = s.playerBullet.y;
      for (const a of alive) {
        const w = alienWorld(a, s.formation);
        if (bx >= w.x && bx <= w.x + ALIEN_W && by >= w.y && by <= w.y + ALIEN_H) {
          a.alive = false;
          s.score += ROW_POINTS[a.row];
          setScore(s.score);
          s.playerBullet = null;
          break;
        }
      }
    }
    // Player bullet vs barrier
    if (s.playerBullet && hitBarrier(s, s.playerBullet.x, s.playerBullet.y)) s.playerBullet = null;

    // Alien firing
    s.fireTimer -= dt;
    const fireEvery = cfg.fireEvery * (0.5 + 0.5 * (aliveCount / (ROWS * COLS)));
    if (s.fireTimer <= 0) {
      s.fireTimer = fireEvery;
      // bottom-most alien of a random alive column
      const cols = [...new Set(alive.map((a) => a.col))];
      if (cols.length) {
        const col = cols[Math.floor(Math.random() * cols.length)];
        let shooter = null;
        for (const a of alive) if (a.col === col && (!shooter || a.row > shooter.row)) shooter = a;
        if (shooter) {
          const w = alienWorld(shooter, s.formation);
          s.alienBullets.push({ x: w.x + ALIEN_W / 2, y: w.y + ALIEN_H });
        }
      }
    }

    // Alien bullets travel + collisions
    for (let i = s.alienBullets.length - 1; i >= 0; i--) {
      const b = s.alienBullets[i];
      b.y += ALIEN_BULLET_SPEED * dt;
      if (b.y > H) { s.alienBullets.splice(i, 1); continue; }
      // vs barrier
      if (hitBarrier(s, b.x, b.y)) { s.alienBullets.splice(i, 1); continue; }
      // vs ship
      if (b.y >= SHIP_Y - 6 && b.y <= SHIP_Y + SHIP_H &&
          b.x >= s.ship.x - SHIP_W / 2 && b.x <= s.ship.x + SHIP_W / 2) {
        s.alienBullets.splice(i, 1);
        s.lives -= 1;
        setLives(s.lives);
        if (s.lives <= 0) { finish(s, 'loss'); return; }
      }
    }
  }, [finish]);

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
    const st = initState(difficulty);
    st.lastTime = performance.now();
    stateRef.current = st;
    setScore(0);
    setLives(3);
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
      else if (k === ' ' || k === 'arrowup' || k === 'w') { s().input.fire = true; e.preventDefault(); }
    };
    const up = (e) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') s().input.left = false;
      else if (k === 'arrowright' || k === 'd') s().input.right = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const hold = (key, val) => (e) => {
    e.preventDefault();
    if (key === 'fire') { if (val) stateRef.current.input.fire = true; }
    else stateRef.current.input[key] = val;
  };

  useEffect(() => { draw(); }, [draw]);

  return (
    <div className="game-page">
      <div className="game-header">
        <Link to="/games" className="game-back">← Games</Link>
        <h1 className="game-title">Space Invaders</h1>
        <p className="game-subtitle">Blast the descending alien fleet before it reaches you.</p>
      </div>

      <HowToPlay>
        <p><b>Objective:</b> destroy the entire alien formation before it lands or you run out of lives.</p>
        <ul>
          <li>Move with Left/Right or A/D. Fire with Space, Up, or W.</li>
          <li>On mobile use the ◄ / Fire / ► buttons below the board.</li>
          <li>You can only have one shot on screen at a time — make it count.</li>
          <li>The fleet steps sideways, drops down and speeds up at each edge. It gets faster as you thin it out.</li>
          <li>Aliens shoot back. Hide behind the green barriers — but they erode from every hit.</li>
          <li>Top rows are worth more (40 / 20 / 10). Losing all 3 lives, or letting the fleet reach your row, ends the game.</li>
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

      <div className="si-wrapper">
        <canvas ref={canvasRef} width={W} height={H} className="si-canvas" />

        {gameStatus === 'idle' && (
          <div className="si-overlay" onClick={startGame} style={{ cursor: 'pointer' }}>
            <div className="si-overlay-inner">
              <div className="si-overlay-emoji">👾</div>
              <h3>Space Invaders</h3>
              <p>Press <b>Start Game</b> to defend Earth.</p>
              <p style={{ fontSize: 13, opacity: 0.7 }}>Move: ← → / A D · Fire: Space</p>
              <p style={{ fontSize: 12, opacity: 0.55, marginTop: 4 }}>(or tap anywhere here)</p>
            </div>
          </div>
        )}

        {gameStatus === 'over' && (
          <div className="si-overlay">
            <div className="si-overlay-inner">
              <div className="si-overlay-emoji">💀</div>
              <h3>Game Over</h3>
              <p>Score <b>{score}</b></p>
              <button className="gs-btn gs-btn-primary" onClick={startGame} style={{ marginTop: 10 }}>Play Again</button>
            </div>
          </div>
        )}

        {gameStatus === 'won' && (
          <div className="si-overlay">
            <div className="si-overlay-inner">
              <div className="si-overlay-emoji">🏆</div>
              <h3>Fleet Destroyed!</h3>
              <p>You cleared the invasion · Score <b>{score}</b></p>
              <button className="gs-btn gs-btn-primary" onClick={startGame} style={{ marginTop: 10 }}>Play Again</button>
            </div>
          </div>
        )}
      </div>

      <div className="game-touch-controls si-touch">
        <button
          onPointerDown={hold('left', true)} onPointerUp={hold('left', false)}
          onPointerLeave={hold('left', false)} onPointerCancel={hold('left', false)}
        >◄</button>
        <button className="si-fire-btn" onPointerDown={hold('fire', true)}>▲ Fire</button>
        <button
          onPointerDown={hold('right', true)} onPointerUp={hold('right', false)}
          onPointerLeave={hold('right', false)} onPointerCancel={hold('right', false)}
        >►</button>
      </div>
    </div>
  );
}
