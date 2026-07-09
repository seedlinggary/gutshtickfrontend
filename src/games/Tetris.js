import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';
import HowToPlay from './HowToPlay';
import './Tetris.css';

const COLS = 10;
const ROWS = 20;
const CELL = 28;
const W = COLS * CELL;
const H = ROWS * CELL;

// Classic guideline colors.
const COLORS = {
  I: '#22d3ee', // cyan
  O: '#facc15', // yellow
  T: '#a855f7', // purple
  S: '#22c55e', // green
  Z: '#ef4444', // red
  J: '#3b82f6', // blue
  L: '#f97316', // orange
};

// Base rotation-0 matrices for each tetromino.
const BASE = {
  I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
  S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
  Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
  J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
  L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
};

function rotateCW(m) {
  const n = m.length;
  const out = m.map((row) => row.slice());
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) out[c][n - 1 - r] = m[r][c];
  return out;
}

// Precompute the 4 rotation states of every piece.
const ROTATIONS = {};
Object.keys(BASE).forEach((type) => {
  const states = [BASE[type]];
  for (let i = 1; i < 4; i++) states.push(rotateCW(states[i - 1]));
  ROTATIONS[type] = states;
});

// Absolute board cells occupied by a piece at (x,y) in rotation `rot`.
function cellsOf(type, rot, x, y) {
  const m = ROTATIONS[type][rot];
  const cells = [];
  for (let r = 0; r < m.length; r++)
    for (let c = 0; c < m[r].length; c++)
      if (m[r][c]) cells.push({ x: x + c, y: y + r });
  return cells;
}

function collides(board, type, rot, x, y) {
  const cells = cellsOf(type, rot, x, y);
  for (const cell of cells) {
    if (cell.x < 0 || cell.x >= COLS || cell.y >= ROWS) return true;
    if (cell.y >= 0 && board[cell.y][cell.x]) return true;
  }
  return false;
}

function shuffledBag() {
  const bag = Object.keys(BASE);
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

function spawnX(type) {
  const w = ROTATIONS[type][0][0].length;
  return Math.floor((COLS - w) / 2);
}

function emptyBoard() {
  return Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
}

function gravityInterval(level) {
  return Math.max(100, Math.round(800 * Math.pow(0.93, level - 1)));
}

const LINE_SCORES = [0, 100, 300, 500, 800];
const WIN_LEVEL = 10;

function initState() {
  const queue = shuffledBag();
  return {
    board: emptyBoard(),
    queue,
    bag: shuffledBag(),
    cur: null,
    score: 0,
    lines: 0,
    level: 1,
    status: 'idle', // idle | playing | over | won
    dropAcc: 0,
    lastTime: 0,
    softActive: false,
    clearing: null, // { rows: [], timer }
  };
}

export default function Tetris() {
  const canvasRef = useRef(null);
  const nextCanvasRef = useRef(null);
  const stateRef = useRef(initState());
  const rafRef = useRef(null);
  const actionsRef = useRef({});
  const saved = useRef(false);

  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [status, setStatus] = useState('idle');
  const [stats, setStats] = useState({ wins: 0, losses: 0, best_score: 0 });

  useEffect(() => {
    if (isLoggedIn()) {
      apiRequest('GET', null, '/game/stats').then((d) => {
        if (d?.tetris) setStats(d.tetris);
      }).catch(() => {});
    }
  }, []);

  const syncHud = useCallback(() => {
    const s = stateRef.current;
    setScore(s.score);
    setLevel(s.level);
    setLines(s.lines);
  }, []);

  const drawNext = useCallback(() => {
    const canvas = nextCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const NW = canvas.width;
    const NH = canvas.height;
    ctx.clearRect(0, 0, NW, NH);
    const s = stateRef.current;
    const preview = s.queue.slice(0, 3);
    const nc = 20; // preview cell size
    preview.forEach((type, i) => {
      const m = ROTATIONS[type][0];
      const rows = m.length;
      const cols = m[0].length;
      // Trim empty rows/cols for centering.
      let minR = rows, maxR = 0, minC = cols, maxC = 0;
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
          if (m[r][c]) { minR = Math.min(minR, r); maxR = Math.max(maxR, r); minC = Math.min(minC, c); maxC = Math.max(maxC, c); }
      const pw = (maxC - minC + 1) * nc;
      const ph = (maxR - minR + 1) * nc;
      const slotH = NH / 3;
      const offX = (NW - pw) / 2;
      const offY = i * slotH + (slotH - ph) / 2;
      for (let r = minR; r <= maxR; r++)
        for (let c = minC; c <= maxC; c++)
          if (m[r][c]) drawBlock(ctx, offX + (c - minC) * nc, offY + (r - minR) * nc, nc, COLORS[type]);
    });
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;

    // Background.
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    // Grid lines.
    ctx.strokeStyle = 'rgba(255,255,255,0.045)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, H); ctx.stroke(); }
    for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(W, y * CELL); ctx.stroke(); }

    // Locked blocks.
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (s.board[r][c]) drawBlock(ctx, c * CELL, r * CELL, CELL, s.board[r][c]);

    // Flash clearing rows white.
    if (s.clearing) {
      const on = Math.floor(s.clearing.timer / 80) % 2 === 0;
      ctx.fillStyle = on ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)';
      s.clearing.rows.forEach((r) => ctx.fillRect(0, r * CELL, W, CELL));
    }

    // Ghost + current piece.
    if (s.cur && !s.clearing) {
      const { type, rot, x, y } = s.cur;
      // Ghost.
      let gy = y;
      while (!collides(s.board, type, rot, x, gy + 1)) gy++;
      if (gy !== y) {
        cellsOf(type, rot, x, gy).forEach((cell) => {
          if (cell.y >= 0) {
            ctx.fillStyle = COLORS[type];
            ctx.globalAlpha = 0.22;
            ctx.fillRect(cell.x * CELL + 2, cell.y * CELL + 2, CELL - 4, CELL - 4);
            ctx.globalAlpha = 1;
          }
        });
      }
      // Current.
      cellsOf(type, rot, x, y).forEach((cell) => {
        if (cell.y >= 0) drawBlock(ctx, cell.x * CELL, cell.y * CELL, CELL, COLORS[type]);
      });
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
        apiRequest('POST', { game_type: 'tetris', result: won ? 'win' : 'loss', difficulty: 'medium', score: s.score }, '/game/save').catch(() => {});
      }
    };

    const refillQueue = () => {
      while (s.queue.length < 7) {
        if (s.bag.length === 0) s.bag = shuffledBag();
        s.queue.push(s.bag.shift());
      }
    };

    const spawn = () => {
      refillQueue();
      const type = s.queue.shift();
      refillQueue();
      s.cur = { type, rot: 0, x: spawnX(type), y: 0 };
      if (collides(s.board, type, 0, s.cur.x, s.cur.y)) {
        s.cur = null;
        drawNext();
        endGame(false);
        return false;
      }
      drawNext();
      return true;
    };

    const lockPiece = () => {
      const { type, rot, x, y } = s.cur;
      cellsOf(type, rot, x, y).forEach((cell) => {
        if (cell.y >= 0) s.board[cell.y][cell.x] = COLORS[type];
      });
      s.cur = null;
      // Detect full rows.
      const full = [];
      for (let r = 0; r < ROWS; r++)
        if (s.board[r].every((v) => v)) full.push(r);
      if (full.length > 0) {
        s.clearing = { rows: full, timer: 320 };
      } else {
        spawn();
      }
      syncHud();
    };

    const finalizeClear = () => {
      const rows = s.clearing.rows;
      const n = rows.length;
      const rowSet = new Set(rows);
      const kept = [];
      for (let r = 0; r < ROWS; r++) if (!rowSet.has(r)) kept.push(s.board[r]);
      while (kept.length < ROWS) kept.unshift(Array(COLS).fill(null));
      s.board = kept;
      s.lines += n;
      s.score += LINE_SCORES[n] * s.level;
      s.level = Math.min(WIN_LEVEL, Math.floor(s.lines / 10) + 1);
      s.clearing = null;
      syncHud();
      if (s.lines >= 90) { endGame(true); return; }
      spawn();
    };

    const tryMove = (dx, dy) => {
      if (!s.cur) return false;
      const { type, rot, x, y } = s.cur;
      if (!collides(s.board, type, rot, x + dx, y + dy)) {
        s.cur.x = x + dx; s.cur.y = y + dy;
        return true;
      }
      return false;
    };

    const rotate = (dir) => {
      if (!s.cur) return;
      const { type, rot, x, y } = s.cur;
      const nrot = (rot + (dir > 0 ? 1 : 3)) % 4;
      const kicks = [0, -1, 1, -2, 2];
      for (const k of kicks) {
        if (!collides(s.board, type, nrot, x + k, y)) {
          s.cur.rot = nrot; s.cur.x = x + k;
          return;
        }
      }
    };

    const gravityStep = (soft) => {
      if (!s.cur) return;
      if (tryMove(0, 1)) {
        if (soft) { s.score += 1; syncHud(); }
      } else {
        lockPiece();
      }
    };

    const hardDrop = () => {
      if (!s.cur || s.status !== 'playing' || s.clearing) return;
      let dist = 0;
      while (tryMove(0, 1)) dist++;
      s.score += dist * 2;
      lockPiece();
      draw();
    };

    // Wire up action triggers used by touch buttons + start button.
    actionsRef.current = {
      start: () => {
        cancelAnimationFrame(rafRef.current);
        saved.current = false;
        stateRef.current = Object.assign(stateRef.current, initState());
        const st = stateRef.current;
        st.status = 'playing';
        setStatus('playing');
        spawn();
        syncHud();
        draw();
        st.lastTime = performance.now();
        rafRef.current = requestAnimationFrame(loop);
      },
      left: () => { if (s.status === 'playing' && !s.clearing) { tryMove(-1, 0); draw(); } },
      right: () => { if (s.status === 'playing' && !s.clearing) { tryMove(1, 0); draw(); } },
      cw: () => { if (s.status === 'playing' && !s.clearing) { rotate(1); draw(); } },
      ccw: () => { if (s.status === 'playing' && !s.clearing) { rotate(-1); draw(); } },
      soft: () => { if (s.status === 'playing' && !s.clearing) { gravityStep(true); draw(); } },
      hard: hardDrop,
    };

    const loop = (time) => {
      if (s.status !== 'playing') return;
      const dt = time - s.lastTime;
      s.lastTime = time;
      if (s.clearing) {
        s.clearing.timer -= dt;
        if (s.clearing.timer <= 0) finalizeClear();
      } else if (s.cur) {
        const base = gravityInterval(s.level);
        const interval = s.softActive ? Math.min(base, 45) : base;
        s.dropAcc += dt;
        let guard = 0;
        while (s.dropAcc >= interval && !s.clearing && s.cur && guard < 4) {
          s.dropAcc -= interval;
          gravityStep(s.softActive);
          guard++;
        }
      }
      draw();
      if (s.status === 'playing') rafRef.current = requestAnimationFrame(loop);
    };

    const handleKeyDown = (e) => {
      if (s.status !== 'playing') return;
      const k = e.key;
      if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'z', 'Z', 'x', 'X'].includes(k)) e.preventDefault();
      if (s.clearing && k !== ' ') return;
      switch (k) {
        case 'ArrowLeft': tryMove(-1, 0); draw(); break;
        case 'ArrowRight': tryMove(1, 0); draw(); break;
        case 'ArrowUp': case 'x': case 'X': rotate(1); draw(); break;
        case 'z': case 'Z': rotate(-1); draw(); break;
        case 'ArrowDown': s.softActive = true; break;
        case ' ': hardDrop(); break;
        default: break;
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'ArrowDown') s.softActive = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    draw();
    drawNext();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(rafRef.current);
    };
  }, [draw, drawNext, syncHud]);

  return (
    <div className="game-page">
      <div className="game-header">
        <Link to="/games" className="game-back">← Games</Link>
        <h1 className="game-title">Tetris</h1>
        <p className="game-subtitle">Stack and clear lines. Reach Level 10 to win. Arrows to move, Up/X rotate, Space to drop.</p>
      </div>

      <HowToPlay>
        <p><b>Objective:</b> clear lines by filling complete rows. Reach <b>Level 10</b> (90 lines) to win, but don't let the stack reach the top.</p>
        <ul>
          <li><b>← / →</b> move the piece left and right.</li>
          <li><b>↓</b> soft drop (falls faster, +1 point per cell).</li>
          <li><b>↑</b> or <b>X</b> rotate clockwise, <b>Z</b> rotate counter-clockwise (wall-kicks near walls).</li>
          <li><b>Space</b> hard drop — slams the piece straight down and locks it (+2 points per cell).</li>
          <li>The translucent outline is the <b>ghost piece</b>, showing where the piece will land.</li>
          <li>Clearing 1/2/3/4 lines at once scores 100/300/500/800 × your level. Level rises every 10 lines and the pieces fall faster.</li>
          <li>On mobile, use the on-screen buttons below the board.</li>
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

      <div className="tetris-layout">
        <div className="snake-canvas-wrapper" style={{ width: '100%', maxWidth: W }}>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="snake-canvas"
            style={{ touchAction: 'none', width: '100%', maxWidth: W, height: 'auto', display: 'block' }}
          />
          {status === 'idle' && (
            <div className="snake-overlay" onClick={() => actionsRef.current.start?.()} style={{ cursor: 'pointer' }}>
              <div className="snake-overlay-inner">
                <p>Press <b>Start Game</b> to play</p>
                <p style={{ fontSize: 13, opacity: 0.7 }}>Arrows · Up/X rotate · Space drop</p>
                <p style={{ fontSize: 12, opacity: 0.55, marginTop: 4 }}>(or tap anywhere here)</p>
              </div>
            </div>
          )}
          {status === 'over' && (
            <div className="snake-overlay">
              <div className="snake-overlay-inner">
                <div style={{ fontSize: 40 }}>🧱</div>
                <h3>Topped Out</h3>
                <p>Score: <b>{score}</b> · Level {level}</p>
                <button className="gs-btn gs-btn-primary" onClick={() => actionsRef.current.start?.()}>Play Again</button>
              </div>
            </div>
          )}
          {status === 'won' && (
            <div className="snake-overlay">
              <div className="snake-overlay-inner">
                <div style={{ fontSize: 40 }}>🏆</div>
                <h3>You Win!</h3>
                <p>Reached Level 10 · Score: <b>{score}</b></p>
                <button className="gs-btn gs-btn-primary" onClick={() => actionsRef.current.start?.()}>Play Again</button>
              </div>
            </div>
          )}
        </div>

        <div className="tetris-side">
          <div className="tetris-hud">
            <div className="tetris-hud-item"><span>Score</span><b>{score}</b></div>
            <div className="tetris-hud-item"><span>Level</span><b>{level}</b></div>
            <div className="tetris-hud-item"><span>Lines</span><b>{lines}</b></div>
          </div>
          <div className="tetris-next">
            <span className="tetris-next-label">Next</span>
            <canvas ref={nextCanvasRef} width={100} height={200} className="tetris-next-canvas" />
          </div>
        </div>
      </div>

      <div className="game-touch-controls tetris-touch">
        <div className="tetris-touch-row">
          <button onClick={() => actionsRef.current.left?.()}>←</button>
          <button onClick={() => actionsRef.current.ccw?.()}>↺</button>
          <button onClick={() => actionsRef.current.cw?.()}>↻</button>
          <button onClick={() => actionsRef.current.right?.()}>→</button>
        </div>
        <div className="tetris-touch-row">
          <button onClick={() => actionsRef.current.soft?.()}>↓ Soft</button>
          <button onClick={() => actionsRef.current.hard?.()}>⤓ Drop</button>
        </div>
      </div>
    </div>
  );
}

// Draw a single beveled block.
function drawBlock(ctx, px, py, size, color) {
  ctx.fillStyle = color;
  ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
  // Top/left highlight.
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fillRect(px + 1, py + 1, size - 2, 3);
  ctx.fillRect(px + 1, py + 1, 3, size - 2);
  // Bottom/right shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(px + 1, py + size - 4, size - 2, 3);
  ctx.fillRect(px + size - 4, py + 1, 3, size - 2);
}
