import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';
import HowToPlay from './HowToPlay';
import './PacMan.css';

// Legend: # wall, . pellet, o power pellet, ' ' empty, - ghost-house door, G ghost start
const MAZE = [
  '###################',
  '#........#........#',
  '#o##.###.#.###.##o#',
  '#.................#',
  '#.##.#.#####.#.##.#',
  '#....#...#...#....#',
  '####.###.#.###.####',
  '####.#.......#.####',
  '####.#.##-##.#.####',
  '......#GG GG#......',
  '####.#.#####.#.####',
  '####.#.......#.####',
  '####.#.#####.#.####',
  '#........#........#',
  '#.##.###.#.###.##.#',
  '#o.#.........#..o.#',
  '##.#.#.#####.#.#.##',
  '#....#...#...#....#',
  '#.######.#.######.#',
  '#.................#',
  '###################',
];

const ROWS = MAZE.length;   // 21
const COLS = MAZE[0].length; // 19
const CELL = 24;
const W = COLS * CELL;
const H = ROWS * CELL;

const PAC_START = { col: 9, row: 15 };
const GHOST_STARTS = [
  { col: 7, row: 9 },
  { col: 8, row: 9 },
  { col: 10, row: 9 },
  { col: 11, row: 9 },
];
const HOUSE_TILE = { col: 9, row: 9 };
const EXIT_TILE = { col: 9, row: 7 };
const GHOST_DEFS = [
  { key: 'blinky', color: '#ef4444', kind: 'chaser', home: { col: COLS - 2, row: 1 } },
  { key: 'pinky', color: '#f9a8d4', kind: 'ambusher', home: { col: 1, row: 1 } },
  { key: 'inky', color: '#22d3ee', kind: 'patroller', home: { col: 1, row: ROWS - 2 } },
  { key: 'clyde', color: '#fb923c', kind: 'random', home: { col: COLS - 2, row: ROWS - 2 } },
];

const DIRS = [
  { x: 0, y: -1 }, // up
  { x: -1, y: 0 }, // left
  { x: 0, y: 1 },  // down
  { x: 1, y: 0 },  // right
];

const FRIGHT_MS = 7500;
const DEATH_PAUSE_MS = 900;
const SPEED = { pac: 0.115, ghost: 0.098, fright: 0.06, eaten: 0.22 };

const wrapCol = (c) => (c + COLS) % COLS;

function cellType(r, c) {
  if (r < 0 || r >= ROWS) return '#';
  return MAZE[r][wrapCol(c)];
}

// Passable for movement. Ghosts may pass the door; Pac-Man may not.
function passable(r, c, forGhost) {
  const ch = cellType(r, c);
  if (ch === '#') return false;
  if (ch === '-') return forGhost;
  return true;
}

function manhattan(a, b) {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

// Nearest passable tile to a (possibly out-of-bounds / wall) target.
function nearestPassable(col, row) {
  if (row >= 0 && row < ROWS && passable(row, col, true)) return { col: wrapCol(col), row };
  let best = HOUSE_TILE;
  let bestD = Infinity;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (passable(r, c, true)) {
        const d = Math.abs(c - col) + Math.abs(r - row);
        if (d < bestD) { bestD = d; best = { col: c, row: r }; }
      }
  return best;
}

// BFS distance field from a target tile (ghost-passable graph, with tunnel wrap).
function distField(target) {
  const dist = Array(ROWS).fill(null).map(() => Array(COLS).fill(Infinity));
  const t = passable(target.row, target.col, true) ? target : nearestPassable(target.col, target.row);
  dist[t.row][t.col] = 0;
  const q = [t];
  let head = 0;
  while (head < q.length) {
    const { col, row } = q[head++];
    const d = dist[row][col];
    for (const dir of DIRS) {
      const nc = wrapCol(col + dir.x);
      const nr = row + dir.y;
      if (nr < 0 || nr >= ROWS) continue;
      if (!passable(nr, nc, true)) continue;
      if (dist[nr][nc] > d + 1) { dist[nr][nc] = d + 1; q.push({ col: nc, row: nr }); }
    }
  }
  return dist;
}

function buildPellets() {
  let remaining = 0;
  const grid = MAZE.map((row) => row.split('').map((ch) => {
    if (ch === '.') { remaining++; return '.'; }
    if (ch === 'o') { remaining++; return 'o'; }
    return null;
  }));
  return { grid, remaining };
}

function makeActor(start, dir) {
  return { col: start.col, row: start.row, dir: { ...dir }, p: 0 };
}

function resetPositions(s) {
  s.pac = { ...makeActor(PAC_START, { x: -1, y: 0 }), nextDir: { x: -1, y: 0 }, mouthT: 0, lastDir: { x: -1, y: 0 } };
  s.ghosts = GHOST_DEFS.map((def, i) => ({
    ...makeActor(GHOST_STARTS[i], { x: 0, y: -1 }),
    def,
    mode: 'normal', // normal | frightened | eaten
    exiting: true,
  }));
}

function initState() {
  const { grid, remaining } = buildPellets();
  const s = {
    pellets: grid,
    remaining,
    score: 0,
    lives: 3,
    status: 'idle', // idle | playing | dying | over | won
    frightTimer: 0,
    ghostCombo: 0,
    deathTimer: 0,
    lastTime: 0,
  };
  resetPositions(s);
  return s;
}

export default function PacMan() {
  const canvasRef = useRef(null);
  const stateRef = useRef(initState());
  const rafRef = useRef(null);
  const actionsRef = useRef({});
  const saved = useRef(false);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [status, setStatus] = useState('idle');
  const [stats, setStats] = useState({ wins: 0, losses: 0, best_score: 0 });

  useEffect(() => {
    if (isLoggedIn()) {
      apiRequest('GET', null, '/game/stats').then((d) => {
        if (d?.pacman) setStats(d.pacman);
      }).catch(() => {});
    }
  }, []);

  const syncHud = useCallback(() => {
    const s = stateRef.current;
    setScore(s.score);
    setLives(s.lives);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;

    ctx.fillStyle = '#05070f';
    ctx.fillRect(0, 0, W, H);

    // Walls.
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const ch = MAZE[r][c];
        if (ch === '#') {
          const x = c * CELL, y = r * CELL;
          ctx.fillStyle = '#111d3a';
          roundRect(ctx, x + 2, y + 2, CELL - 4, CELL - 4, 6);
          ctx.fill();
          ctx.strokeStyle = 'rgba(96,165,250,0.5)';
          ctx.lineWidth = 1.5;
          roundRect(ctx, x + 2, y + 2, CELL - 4, CELL - 4, 6);
          ctx.stroke();
        } else if (ch === '-') {
          ctx.fillStyle = '#f9a8d4';
          ctx.fillRect(c * CELL + 3, r * CELL + CELL / 2 - 2, CELL - 6, 4);
        }
      }

    // Pellets.
    const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 200);
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const p = s.pellets[r][c];
        if (!p) continue;
        const cx = c * CELL + CELL / 2;
        const cy = r * CELL + CELL / 2;
        if (p === '.') {
          ctx.fillStyle = '#ffd9a0';
          ctx.beginPath();
          ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = `rgba(255,213,160,${pulse})`;
          ctx.beginPath();
          ctx.arc(cx, cy, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

    // Ghosts.
    s.ghosts.forEach((g) => drawGhost(ctx, g, s));

    // Pac-Man.
    drawPac(ctx, s.pac, s.status);
  }, []);

  useEffect(() => {
    const s = stateRef.current;

    const endGame = (won) => {
      s.status = won ? 'won' : 'over';
      setStatus(s.status);
      syncHud();
      if (!saved.current && isLoggedIn()) {
        saved.current = true;
        apiRequest('POST', { game_type: 'pacman', result: won ? 'win' : 'loss', difficulty: 'medium', score: s.score }, '/game/save').catch(() => {});
      }
    };

    const eatAt = (col, row) => {
      const p = s.pellets[row][col];
      if (!p) return;
      s.pellets[row][col] = null;
      s.remaining -= 1;
      if (p === '.') {
        s.score += 10;
      } else {
        s.score += 50;
        s.frightTimer = FRIGHT_MS;
        s.ghostCombo = 0;
        s.ghosts.forEach((g) => { if (g.mode === 'normal') g.mode = 'frightened'; });
      }
      syncHud();
      if (s.remaining <= 0) endGame(true);
    };

    const canMove = (col, row, dir, forGhost) => {
      const nr = row + dir.y;
      const nc = wrapCol(col + dir.x);
      return passable(nr, nc, forGhost);
    };

    const chooseGhostDir = (g) => {
      const speedInHouse = g.exiting;
      // Determine target.
      let target;
      if (g.mode === 'eaten') {
        target = HOUSE_TILE;
      } else if (speedInHouse) {
        target = EXIT_TILE;
      } else if (g.mode === 'normal') {
        const pac = s.pac;
        if (g.def.kind === 'chaser') {
          target = { col: pac.col, row: pac.row };
        } else if (g.def.kind === 'ambusher') {
          target = nearestPassable(pac.col + pac.dir.x * 4, pac.row + pac.dir.y * 4);
        } else if (g.def.kind === 'patroller') {
          target = manhattan(g, pac) <= 8 ? { col: pac.col, row: pac.row } : g.def.home;
        } else { // random
          target = { col: pac.col, row: pac.row };
        }
      }

      const rev = { x: -g.dir.x, y: -g.dir.y };
      let candidates = DIRS.filter((d) => canMove(g.col, g.row, d, true) && !(d.x === rev.x && d.y === rev.y));
      if (candidates.length === 0) candidates = DIRS.filter((d) => canMove(g.col, g.row, d, true));
      if (candidates.length === 0) return g.dir;

      if (g.mode === 'frightened') {
        return candidates[Math.floor(Math.random() * candidates.length)];
      }
      if (g.mode === 'normal' && g.def.kind === 'random' && !speedInHouse && manhattan(g, s.pac) > 5) {
        return candidates[Math.floor(Math.random() * candidates.length)];
      }

      const dist = distField(target);
      let best = candidates[0];
      let bestD = Infinity;
      for (const d of candidates) {
        const nr = g.row + d.y;
        const nc = wrapCol(g.col + d.x);
        const dd = dist[nr][nc];
        if (dd < bestD) { bestD = dd; best = d; }
      }
      return best;
    };

    const onGhostArrive = (g) => {
      // House exit / respawn bookkeeping.
      if (g.mode === 'eaten' && g.row === HOUSE_TILE.row && Math.abs(g.col - HOUSE_TILE.col) <= 2) {
        g.mode = 'normal';
        g.exiting = true;
      }
      if (g.exiting && g.row <= EXIT_TILE.row) {
        g.exiting = false;
      }
      g.dir = chooseGhostDir(g);
    };

    // Movement invariant: whenever p advances, the current dir points at a
    // passable neighbour. arriveCb (re-)chooses a validated dir at each tile.
    const stepActor = (a, speed, forGhost, arriveCb) => {
      if (a.dir.x === 0 && a.dir.y === 0) {
        if (a.nextDir && canMove(a.col, a.row, a.nextDir, forGhost)) a.dir = { ...a.nextDir };
        else arriveCb(a);
        if (a.dir.x === 0 && a.dir.y === 0) return;
      } else if (!canMove(a.col, a.row, a.dir, forGhost)) {
        arriveCb(a);
        if (a.dir.x === 0 && a.dir.y === 0) return;
      }
      a.p += speed;
      let guard = 0;
      while (a.p >= 1 && guard < 4) {
        a.p -= 1;
        a.col = wrapCol(a.col + a.dir.x);
        a.row += a.dir.y;
        arriveCb(a);
        guard++;
        if (a.dir.x === 0 && a.dir.y === 0) { a.p = 0; break; }
      }
    };

    const onPacArrive = (a) => {
      eatAt(a.col, a.row);
      if (a.nextDir && canMove(a.col, a.row, a.nextDir, false)) {
        a.dir = { ...a.nextDir };
      }
      if (!canMove(a.col, a.row, a.dir, false)) {
        a.dir = { x: 0, y: 0 };
      }
      if (a.dir.x !== 0 || a.dir.y !== 0) a.lastDir = { ...a.dir };
    };

    const loseLife = () => {
      s.lives -= 1;
      syncHud();
      if (s.lives <= 0) {
        endGame(false);
      } else {
        s.status = 'dying';
        s.deathTimer = DEATH_PAUSE_MS;
        s.frightTimer = 0;
      }
    };

    const checkCollisions = () => {
      const pac = s.pac;
      s.ghosts.forEach((g) => {
        const dx = (g.col + g.dir.x * g.p) - (pac.col + pac.dir.x * pac.p);
        const dy = (g.row + g.dir.y * g.p) - (pac.row + pac.dir.y * pac.p);
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
          if (g.mode === 'frightened') {
            s.ghostCombo = Math.min(s.ghostCombo + 1, 4);
            s.score += 100 * Math.pow(2, s.ghostCombo); // 200,400,800,1600
            g.mode = 'eaten';
            syncHud();
          } else if (g.mode === 'normal') {
            loseLife();
          }
        }
      });
    };

    const tick = (dt) => {
      if (s.status === 'dying') {
        s.deathTimer -= dt;
        if (s.deathTimer <= 0) {
          resetPositions(s);
          s.status = 'playing';
        }
        return;
      }
      if (s.status !== 'playing') return;

      if (s.frightTimer > 0) {
        s.frightTimer -= dt;
        if (s.frightTimer <= 0) {
          s.frightTimer = 0;
          s.ghosts.forEach((g) => { if (g.mode === 'frightened') g.mode = 'normal'; });
        }
      }

      const norm = dt / 16.6667;
      // Pac-Man.
      s.pac.mouthT += norm * 0.35;
      stepActor(s.pac, SPEED.pac * norm, false, onPacArrive);
      checkCollisions();
      if (s.status !== 'playing') return;

      // Ghosts.
      s.ghosts.forEach((g) => {
        let sp;
        if (g.mode === 'eaten') sp = SPEED.eaten;
        else if (g.mode === 'frightened') sp = SPEED.fright;
        else sp = SPEED.ghost;
        stepActor(g, sp * norm, true, onGhostArrive);
      });
      checkCollisions();
    };

    const loop = (time) => {
      const s2 = stateRef.current;
      let dt = time - s2.lastTime;
      s2.lastTime = time;
      if (dt > 50) dt = 50;
      if (s2.status === 'playing' || s2.status === 'dying') tick(dt);
      draw();
      if (s2.status === 'playing' || s2.status === 'dying') rafRef.current = requestAnimationFrame(loop);
    };

    const setDirection = (dir) => {
      if (s.status !== 'playing') return;
      const pac = s.pac;
      pac.nextDir = dir;
      // Allow an immediate 180° reversal mid-segment for responsive feel:
      // flip the from/to tiles and invert progress.
      if (dir.x === -pac.dir.x && dir.y === -pac.dir.y && (pac.dir.x !== 0 || pac.dir.y !== 0)) {
        pac.col = wrapCol(pac.col + pac.dir.x);
        pac.row += pac.dir.y;
        pac.p = 1 - pac.p;
        pac.dir = { ...dir };
        pac.lastDir = { ...dir };
      }
    };

    actionsRef.current = {
      start: () => {
        cancelAnimationFrame(rafRef.current);
        saved.current = false;
        const st = Object.assign(stateRef.current, initState());
        eatAtStart(st);
        st.status = 'playing';
        setStatus('playing');
        syncHud();
        st.lastTime = performance.now();
        rafRef.current = requestAnimationFrame(loop);
      },
      dir: setDirection,
    };

    function eatAtStart(st) {
      const p = st.pellets[PAC_START.row][PAC_START.col];
      if (p) { st.pellets[PAC_START.row][PAC_START.col] = null; st.remaining -= 1; st.score += p === 'o' ? 50 : 10; }
    }

    const keyMap = {
      ArrowUp: { x: 0, y: -1 }, w: { x: 0, y: -1 }, W: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 }, s: { x: 0, y: 1 }, S: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 }, a: { x: -1, y: 0 }, A: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 }, d: { x: 1, y: 0 }, D: { x: 1, y: 0 },
    };
    const handleKey = (e) => {
      const dir = keyMap[e.key];
      if (!dir) return;
      e.preventDefault();
      setDirection(dir);
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
        <h1 className="game-title">Pac-Man</h1>
        <p className="game-subtitle">Eat every pellet, dodge the ghosts. Arrow keys or WASD to move.</p>
      </div>

      <HowToPlay>
        <p><b>Objective:</b> clear the whole maze of pellets without losing all your lives.</p>
        <ul>
          <li>Use the Arrow keys / WASD (or the on-screen D-pad on mobile) to steer Pac-Man.</li>
          <li>Small pellets score 10 points; the four large <b>power pellets</b> score 50 and turn the ghosts blue.</li>
          <li>While ghosts are blue you can eat them for escalating bonuses — 200, 400, 800, 1600 — resetting with each power pellet.</li>
          <li>Eaten ghosts return to the house as eyes and come back to life shortly after.</li>
          <li>Touching a normal (non-blue) ghost costs a life. You start with 3.</li>
          <li>Each ghost hunts differently — one chases, one cuts you off, one patrols, one wanders.</li>
          <li>Clear every pellet to win the board.</li>
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
          <span>Lives: <b>{'🟡'.repeat(Math.max(0, lives)) || '—'}</b></span>
        </div>

        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="snake-canvas pacman-canvas"
          style={{ touchAction: 'none', width: '100%', maxWidth: W, height: 'auto', display: 'block' }}
        />

        {status === 'idle' && (
          <div className="snake-overlay" onClick={() => actionsRef.current.start?.()} style={{ cursor: 'pointer' }}>
            <div className="snake-overlay-inner">
              <p>Press <b>Start Game</b> to play</p>
              <p style={{ fontSize: 13, opacity: 0.7 }}>Arrow keys or WASD</p>
              <p style={{ fontSize: 12, opacity: 0.55, marginTop: 4 }}>(or tap anywhere here)</p>
            </div>
          </div>
        )}
        {status === 'over' && (
          <div className="snake-overlay">
            <div className="snake-overlay-inner">
              <div style={{ fontSize: 40 }}>👻</div>
              <h3>Game Over</h3>
              <p>Score: <b>{score}</b></p>
              <button className="gs-btn gs-btn-primary" onClick={() => actionsRef.current.start?.()}>Play Again</button>
            </div>
          </div>
        )}
        {status === 'won' && (
          <div className="snake-overlay">
            <div className="snake-overlay-inner">
              <div style={{ fontSize: 40 }}>🏆</div>
              <h3>Maze Cleared!</h3>
              <p>Score: <b>{score}</b></p>
              <button className="gs-btn gs-btn-primary" onClick={() => actionsRef.current.start?.()}>Play Again</button>
            </div>
          </div>
        )}
      </div>

      <div className="game-touch-controls">
        <button onClick={() => actionsRef.current.dir?.({ x: 0, y: -1 })}>↑</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => actionsRef.current.dir?.({ x: -1, y: 0 })}>←</button>
          <button onClick={() => actionsRef.current.dir?.({ x: 0, y: 1 })}>↓</button>
          <button onClick={() => actionsRef.current.dir?.({ x: 1, y: 0 })}>→</button>
        </div>
      </div>
    </div>
  );
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function actorPixel(a) {
  let cx = (a.col + 0.5 + a.dir.x * a.p) * CELL;
  const cy = (a.row + 0.5 + a.dir.y * a.p) * CELL;
  if (cx < 0) cx += W;
  if (cx >= W) cx -= W;
  return { cx, cy };
}

function drawPac(ctx, pac, status) {
  const { cx, cy } = actorPixel(pac);
  const R = CELL * 0.46;
  const moving = pac.dir.x !== 0 || pac.dir.y !== 0;
  const dir = moving ? pac.dir : pac.lastDir;
  let angle = 0;
  if (dir.x === 1) angle = 0;
  else if (dir.x === -1) angle = Math.PI;
  else if (dir.y === -1) angle = -Math.PI / 2;
  else if (dir.y === 1) angle = Math.PI / 2;
  const openMax = 0.32 * Math.PI;
  const open = status === 'dying' ? 0.02 : (moving ? (0.5 + 0.5 * Math.sin(pac.mouthT)) * openMax : 0.06);

  ctx.save();
  ctx.fillStyle = '#ffd21e';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, R, angle + open, angle + Math.PI * 2 - open);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawGhost(ctx, g, s) {
  const { cx, cy } = actorPixel(g);
  const R = CELL * 0.46;
  const top = cy - R * 0.15;
  const bottom = cy + R;

  let body;
  const frightEnding = s.frightTimer > 0 && s.frightTimer < 2000;
  if (g.mode === 'eaten') {
    body = null; // eyes only
  } else if (g.mode === 'frightened') {
    body = (frightEnding && Math.floor(s.frightTimer / 200) % 2 === 0) ? '#ffffff' : '#2563eb';
  } else {
    body = g.def.color;
  }

  if (body) {
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(cx, top, R, Math.PI, 0);
    ctx.lineTo(cx + R, bottom);
    // wavy bottom
    const humps = 4;
    const step = (2 * R) / humps;
    for (let i = 0; i < humps; i++) {
      const x0 = cx + R - i * step;
      const midX = x0 - step / 2;
      const x1 = x0 - step;
      const yUp = i % 2 === 0 ? bottom - R * 0.28 : bottom - R * 0.28;
      ctx.quadraticCurveTo(midX, yUp, x1, bottom);
    }
    ctx.closePath();
    ctx.fill();
  }

  // Eyes.
  const ex = R * 0.34;
  const ey = -R * 0.1;
  const look = g.dir;
  if (g.mode === 'frightened' && !(frightEnding && Math.floor(s.frightTimer / 200) % 2 === 0)) {
    // scared face: two small eyes + zigzag mouth
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(cx - ex, cy + ey, R * 0.13, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + ex, cy + ey, R * 0.13, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - R * 0.5, cy + R * 0.4);
    for (let i = 0; i <= 4; i++) {
      ctx.lineTo(cx - R * 0.5 + i * (R * 0.25), cy + R * 0.4 + (i % 2 === 0 ? 0 : -R * 0.18));
    }
    ctx.stroke();
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(cx - ex, cy + ey, R * 0.2, R * 0.26, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + ex, cy + ey, R * 0.2, R * 0.26, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath(); ctx.arc(cx - ex + look.x * R * 0.09, cy + ey + look.y * R * 0.1, R * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + ex + look.x * R * 0.09, cy + ey + look.y * R * 0.1, R * 0.1, 0, Math.PI * 2); ctx.fill();
  }
}
