import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';
import HowToPlay from './HowToPlay';
import './Frogger.css';

const COLS = 13;
const ROWS = 9;
const CELL = 36;
const W = COLS * CELL;
const H = ROWS * CELL;

// Row roles (0 = top goal row, 8 = bottom start).
const HOME_ROW = 0;
const RIVER_ROWS = [1, 2, 3];
const MEDIAN_ROW = 4;
const ROAD_ROWS = [5, 6, 7];
const START_ROW = 8;
const SLOT_COLS = [1, 3, 6, 9, 11];

const START = { col: 6, row: START_ROW };

// Lane definitions keyed by row. speed in columns/sec, dir ±1.
function makeLanes() {
  return {
    1: { type: 'log', dir: -1, speed: 1.3, w: 3, gap: 3, offset: 0, color: '#8b5a2b' },
    2: { type: 'turtle', dir: 1, speed: 1.1, w: 2, gap: 2, offset: 4, color: '#16a34a' },
    3: { type: 'log', dir: 1, speed: 1.7, w: 4, gap: 3, offset: 1, color: '#a16207' },
    5: { type: 'car', dir: 1, speed: 2.0, w: 1, gap: 3, offset: 0, color: '#eab308' },
    6: { type: 'truck', dir: -1, speed: 1.3, w: 2, gap: 4, offset: 2, color: '#ef4444' },
    7: { type: 'car', dir: 1, speed: 2.7, w: 1, gap: 4, offset: 5, color: '#38bdf8' },
  };
}

function platformsOf(lane) {
  const P = lane.w + lane.gap;
  const phase = ((lane.offset % P) + P) % P;
  const list = [];
  for (let x = phase - P; x < COLS + P; x += P) list.push({ x, w: lane.w });
  return list;
}

function initState() {
  return {
    lanes: makeLanes(),
    frog: { col: START.col, row: START.row, dir: 'up' },
    lives: 4,
    score: 0,
    status: 'idle', // idle | playing | over | won
    filled: [false, false, false, false, false],
    maxReached: START_ROW,
    deathTimer: 0,
    lastTime: 0,
  };
}

export default function Frogger() {
  const canvasRef = useRef(null);
  const stateRef = useRef(initState());
  const rafRef = useRef(null);
  const actionsRef = useRef({});
  const saved = useRef(false);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(4);
  const [filledCount, setFilledCount] = useState(0);
  const [status, setStatus] = useState('idle');
  const [stats, setStats] = useState({ wins: 0, losses: 0, best_score: 0 });

  useEffect(() => {
    if (isLoggedIn()) {
      apiRequest('GET', null, '/game/stats').then((d) => {
        if (d?.frogger) setStats(d.frogger);
      }).catch(() => {});
    }
  }, []);

  const syncHud = useCallback(() => {
    const s = stateRef.current;
    setScore(s.score);
    setLives(s.lives);
    setFilledCount(s.filled.filter(Boolean).length);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;

    // Row backgrounds.
    for (let r = 0; r < ROWS; r++) {
      let col;
      if (r === HOME_ROW) col = '#052e16';
      else if (RIVER_ROWS.includes(r)) col = '#0c4a6e';
      else if (r === MEDIAN_ROW) col = '#166534';
      else if (ROAD_ROWS.includes(r)) col = '#1f2937';
      else col = '#166534';
      ctx.fillStyle = col;
      ctx.fillRect(0, r * CELL, W, CELL);
    }

    // Road dashes.
    ROAD_ROWS.forEach((r) => {
      ctx.strokeStyle = 'rgba(250,204,21,0.35)';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.moveTo(0, r * CELL + CELL - 1);
      ctx.lineTo(W, r * CELL + CELL - 1);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // River platforms.
    RIVER_ROWS.forEach((r) => {
      const lane = s.lanes[r];
      const y = r * CELL;
      platformsOf(lane).forEach(({ x, w }) => {
        const px = x * CELL;
        const pw = w * CELL;
        if (lane.type === 'log') {
          ctx.fillStyle = lane.color;
          roundRect(ctx, px + 2, y + 5, pw - 4, CELL - 10, 8);
          ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.25)';
          ctx.lineWidth = 1;
          for (let i = 1; i < w; i++) {
            ctx.beginPath();
            ctx.moveTo(px + i * CELL, y + 6);
            ctx.lineTo(px + i * CELL, y + CELL - 6);
            ctx.stroke();
          }
        } else {
          // turtles: one hump per cell
          for (let i = 0; i < w; i++) {
            const tcx = px + i * CELL + CELL / 2;
            const tcy = y + CELL / 2;
            ctx.fillStyle = '#15803d';
            ctx.beginPath();
            ctx.ellipse(tcx, tcy, CELL * 0.4, CELL * 0.36, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#166534';
            ctx.beginPath();
            ctx.arc(tcx, tcy, CELL * 0.16, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });
    });

    // Vehicles.
    ROAD_ROWS.forEach((r) => {
      const lane = s.lanes[r];
      const y = r * CELL;
      platformsOf(lane).forEach(({ x, w }) => {
        const px = x * CELL;
        const pw = w * CELL;
        ctx.fillStyle = lane.color;
        roundRect(ctx, px + 3, y + 5, pw - 6, CELL - 10, 6);
        ctx.fill();
        // windshield hint
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        const fx = lane.dir > 0 ? px + pw - 12 : px + 5;
        ctx.fillRect(fx, y + 9, 7, CELL - 18);
      });
    });

    // Home slots.
    SLOT_COLS.forEach((sc, i) => {
      const cx = (sc + 0.5) * CELL;
      const cy = HOME_ROW * CELL + CELL / 2;
      ctx.fillStyle = s.filled[i] ? '#22c55e' : 'rgba(34,197,94,0.22)';
      ctx.beginPath();
      ctx.arc(cx, cy, CELL * 0.4, 0, Math.PI * 2);
      ctx.fill();
      if (s.filled[i]) {
        ctx.fillStyle = '#052e16';
        ctx.beginPath();
        ctx.arc(cx - 5, cy - 2, 3, 0, Math.PI * 2);
        ctx.arc(cx + 5, cy - 2, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Frog.
    const f = s.frog;
    const fcx = (f.col + 0.5) * CELL;
    const fcy = (f.row + 0.5) * CELL;
    if (s.deathTimer > 0) {
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 3;
      const rr = CELL * 0.3;
      ctx.beginPath(); ctx.moveTo(fcx - rr, fcy - rr); ctx.lineTo(fcx + rr, fcy + rr);
      ctx.moveTo(fcx + rr, fcy - rr); ctx.lineTo(fcx - rr, fcy + rr); ctx.stroke();
    } else {
      drawFrog(ctx, fcx, fcy, f.dir);
    }
  }, []);

  useEffect(() => {
    const s = stateRef.current;

    const endGame = (won) => {
      s.status = won ? 'won' : 'over';
      setStatus(s.status);
      syncHud();
      if (!saved.current && isLoggedIn()) {
        saved.current = true;
        apiRequest('POST', { game_type: 'frogger', result: won ? 'win' : 'loss', difficulty: 'medium', score: s.score }, '/game/save').catch(() => {});
      }
    };

    const respawn = () => {
      s.frog = { col: START.col, row: START.row, dir: 'up' };
      s.maxReached = START_ROW;
      s.deathTimer = 0;
    };

    const loseLife = () => {
      if (s.deathTimer > 0) return;
      s.lives -= 1;
      syncHud();
      if (s.lives <= 0) {
        endGame(false);
      } else {
        s.deathTimer = 700;
      }
    };

    const speedMult = () => 1 + s.filled.filter(Boolean).length * 0.12;

    const resolveHome = () => {
      const center = s.frog.col; // integer column-index alignment target
      let matched = -1;
      SLOT_COLS.forEach((sc, i) => {
        if (Math.abs(s.frog.col - sc) < 0.6) matched = i;
      });
      if (matched === -1 || s.filled[matched]) {
        loseLife();
        return;
      }
      s.filled[matched] = true;
      s.score += 100;
      syncHud();
      if (s.filled.every(Boolean)) {
        endGame(true);
      } else {
        respawn();
      }
      void center;
    };

    const move = (dir) => {
      if (s.status !== 'playing' || s.deathTimer > 0) return;
      const f = s.frog;
      f.dir = dir;
      if (dir === 'up') {
        const newRow = f.row - 1;
        if (newRow < HOME_ROW) return;
        if (newRow === HOME_ROW) {
          f.row = HOME_ROW;
          draw();
          resolveHome();
          return;
        }
        f.row = newRow;
        if (!RIVER_ROWS.includes(f.row)) f.col = clamp(Math.round(f.col), 0, COLS - 1);
        if (f.row < s.maxReached) { s.maxReached = f.row; s.score += 10; syncHud(); }
      } else if (dir === 'down') {
        const newRow = f.row + 1;
        if (newRow > START_ROW) return;
        f.row = newRow;
        if (!RIVER_ROWS.includes(f.row)) f.col = clamp(Math.round(f.col), 0, COLS - 1);
      } else if (dir === 'left') {
        f.col = clamp(Math.round(f.col - 1), 0, COLS - 1);
      } else if (dir === 'right') {
        f.col = clamp(Math.round(f.col + 1), 0, COLS - 1);
      }
      draw();
    };

    const tick = (dt) => {
      const dts = dt / 1000;
      // Advance lanes.
      const mult = speedMult();
      Object.values(s.lanes).forEach((lane) => { lane.offset += lane.dir * lane.speed * mult * dts; });

      if (s.deathTimer > 0) {
        s.deathTimer -= dt;
        if (s.deathTimer <= 0) respawn();
        return;
      }

      const f = s.frog;
      if (RIVER_ROWS.includes(f.row)) {
        const lane = s.lanes[f.row];
        const center = f.col + 0.5;
        const plats = platformsOf(lane);
        const on = plats.find((p) => center >= p.x && center <= p.x + p.w);
        if (!on) {
          loseLife();
          return;
        }
        f.col += lane.dir * lane.speed * mult * dts;
        if (f.col < -0.3 || f.col > COLS - 0.7) { loseLife(); return; }
      } else if (ROAD_ROWS.includes(f.row)) {
        const lane = s.lanes[f.row];
        const hit = platformsOf(lane).some((p) => f.col < p.x + p.w && p.x < f.col + 1);
        if (hit) { loseLife(); return; }
      }
    };

    const loop = (time) => {
      const st = stateRef.current;
      let dt = time - st.lastTime;
      st.lastTime = time;
      if (dt > 60) dt = 60;
      if (st.status === 'playing') tick(dt);
      draw();
      if (st.status === 'playing') rafRef.current = requestAnimationFrame(loop);
    };

    actionsRef.current = {
      start: () => {
        cancelAnimationFrame(rafRef.current);
        saved.current = false;
        const st = Object.assign(stateRef.current, initState());
        st.status = 'playing';
        setStatus('playing');
        syncHud();
        st.lastTime = performance.now();
        rafRef.current = requestAnimationFrame(loop);
      },
      move,
    };

    const keyMap = {
      ArrowUp: 'up', w: 'up', W: 'up',
      ArrowDown: 'down', s: 'down', S: 'down',
      ArrowLeft: 'left', a: 'left', A: 'left',
      ArrowRight: 'right', d: 'right', D: 'right',
    };
    const handleKey = (e) => {
      const dir = keyMap[e.key];
      if (!dir) return;
      e.preventDefault();
      move(dir);
    };

    window.addEventListener('keydown', handleKey);
    draw();
    return () => {
      window.removeEventListener('keydown', handleKey);
      cancelAnimationFrame(rafRef.current);
    };
  }, [draw, syncHud]);

  return (
    <div className="game-page">
      <div className="game-header">
        <Link to="/games" className="game-back">← Games</Link>
        <h1 className="game-title">Frogger</h1>
        <p className="game-subtitle">Hop across the road and river to fill all 5 homes. Arrow keys or WASD.</p>
      </div>

      <HowToPlay>
        <p><b>Objective:</b> guide the frog to each of the 5 home pads at the top without being run over or falling in the water.</p>
        <ul>
          <li>Each Arrow key / WASD press (or on-screen D-pad on mobile) hops the frog exactly one square.</li>
          <li>On the road, avoid the cars and trucks — getting hit costs a life.</li>
          <li>On the river there is no swimming: you must ride the <b>logs</b> and <b>turtles</b>. Landing in open water, or riding a log off the edge of the screen, costs a life.</li>
          <li>Reach an empty home pad to fill it (+100). Landing on an already-filled pad or hitting the bushes between pads costs a life.</li>
          <li>Every new furthest row forward scores a small bonus, so don't dawdle.</li>
          <li>You start with 4 lives. The lanes speed up a little each time you fill a home. Fill all 5 to win!</li>
        </ul>
      </HowToPlay>

      <div className="game-controls-bar">
        <button className="gs-btn gs-btn-primary gs-btn-sm" onClick={() => actionsRef.current.start?.()}>
          {status === 'idle' ? 'Start Game' : 'New Game'}
        </button>
      </div>

      {isLoggedIn() && (
        <div className="game-stats-bar">
          <span>Games Won: <b>{stats.wins}</b></span>
          <span>Best: <b>{Math.max(stats.best_score, score)}</b></span>
        </div>
      )}

      <div className="snake-canvas-wrapper" style={{ width: '100%', maxWidth: W }}>
        <div className="snake-score-row" style={{ flexWrap: 'wrap' }}>
          <span>Score: <b>{score}</b></span>
          <span>Lives: <b>{'🐸'.repeat(Math.max(0, lives)) || '—'}</b></span>
          <span>Homes: <b>{filledCount}/5</b></span>
        </div>

        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="snake-canvas frogger-canvas"
          style={{ touchAction: 'none', width: '100%', maxWidth: W, height: 'auto', display: 'block' }}
        />

        {status === 'idle' && (
          <div className="snake-overlay" onClick={() => actionsRef.current.start?.()} style={{ cursor: 'pointer' }}>
            <div className="snake-overlay-inner">
              <p>Press <b>Start Game</b> to play</p>
              <p style={{ fontSize: 13, opacity: 0.7 }}>Arrow keys or WASD · one hop per press</p>
              <p style={{ fontSize: 12, opacity: 0.55, marginTop: 4 }}>(or tap anywhere here)</p>
            </div>
          </div>
        )}
        {status === 'over' && (
          <div className="snake-overlay">
            <div className="snake-overlay-inner">
              <div style={{ fontSize: 40 }}>💦</div>
              <h3>Game Over</h3>
              <p>Score: <b>{score}</b> · Homes {filledCount}/5</p>
              <button className="gs-btn gs-btn-primary" onClick={() => actionsRef.current.start?.()}>Play Again</button>
            </div>
          </div>
        )}
        {status === 'won' && (
          <div className="snake-overlay">
            <div className="snake-overlay-inner">
              <div style={{ fontSize: 40 }}>🏆</div>
              <h3>All Homes Filled!</h3>
              <p>Score: <b>{score}</b></p>
              <button className="gs-btn gs-btn-primary" onClick={() => actionsRef.current.start?.()}>Play Again</button>
            </div>
          </div>
        )}
      </div>

      <div className="game-touch-controls">
        <button onClick={() => actionsRef.current.move?.('up')}>↑</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => actionsRef.current.move?.('left')}>←</button>
          <button onClick={() => actionsRef.current.move?.('down')}>↓</button>
          <button onClick={() => actionsRef.current.move?.('right')}>→</button>
        </div>
      </div>
    </div>
  );
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawFrog(ctx, cx, cy, dir) {
  const R = CELL * 0.4;
  ctx.save();
  ctx.translate(cx, cy);
  const rot = { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 }[dir] || 0;
  ctx.rotate(rot);
  // body
  ctx.fillStyle = '#22c55e';
  roundRect(ctx, -R * 0.7, -R * 0.7, R * 1.4, R * 1.4, 7);
  ctx.fill();
  // legs
  ctx.fillStyle = '#16a34a';
  ctx.fillRect(-R * 0.95, R * 0.2, R * 0.35, R * 0.7);
  ctx.fillRect(R * 0.6, R * 0.2, R * 0.35, R * 0.7);
  // eyes
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-R * 0.32, -R * 0.5, R * 0.24, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(R * 0.32, -R * 0.5, R * 0.24, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#052e16';
  ctx.beginPath(); ctx.arc(-R * 0.32, -R * 0.5, R * 0.11, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(R * 0.32, -R * 0.5, R * 0.11, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
