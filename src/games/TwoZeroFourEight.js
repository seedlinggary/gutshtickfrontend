import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';
import HowToPlay from './HowToPlay';

const WIN_TARGET = { easy: 512, medium: 1024, hard: 2048 };

function emptyGrid() {
  return Array(4).fill(null).map(() => Array(4).fill(0));
}

function addTile(grid) {
  const empties = [];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (grid[r][c] === 0) empties.push([r, c]);
  if (empties.length === 0) return grid;
  const [r, c] = empties[Math.floor(Math.random() * empties.length)];
  const next = grid.map(row => [...row]);
  next[r][c] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function slideLeft(row) {
  const nums = row.filter(v => v !== 0);
  let score = 0;
  const merged = [];
  let i = 0;
  while (i < nums.length) {
    if (i + 1 < nums.length && nums[i] === nums[i + 1]) {
      const val = nums[i] * 2;
      merged.push(val);
      score += val;
      i += 2;
    } else {
      merged.push(nums[i]);
      i++;
    }
  }
  while (merged.length < 4) merged.push(0);
  return { row: merged, score };
}

function rotateGrid(grid) {
  const n = 4;
  const next = emptyGrid();
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      next[c][n - 1 - r] = grid[r][c];
  return next;
}

function moveLeft(grid) {
  let totalScore = 0;
  const next = grid.map(row => {
    const { row: newRow, score } = slideLeft(row);
    totalScore += score;
    return newRow;
  });
  return { grid: next, score: totalScore };
}

function moveRight(grid) {
  const reversed = grid.map(row => [...row].reverse());
  const { grid: moved, score } = moveLeft(reversed);
  return { grid: moved.map(row => [...row].reverse()), score };
}

function moveUp(grid) {
  let rotated = rotateGrid(rotateGrid(rotateGrid(grid)));
  const { grid: moved, score } = moveLeft(rotated);
  return { grid: rotateGrid(moved), score };
}

function moveDown(grid) {
  let rotated = rotateGrid(grid);
  const { grid: moved, score } = moveLeft(rotated);
  return { grid: rotateGrid(rotateGrid(rotateGrid(moved))), score };
}

function gridsEqual(a, b) {
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (a[r][c] !== b[r][c]) return false;
  return true;
}

function hasValidMoves(grid) {
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) {
      if (grid[r][c] === 0) return true;
      if (c + 1 < 4 && grid[r][c] === grid[r][c + 1]) return true;
      if (r + 1 < 4 && grid[r][c] === grid[r + 1][c]) return true;
    }
  return false;
}

function countMerges(grid, direction) {
  const fns = { left: moveLeft, right: moveRight, up: moveUp, down: moveDown };
  const { score } = fns[direction](grid);
  return score;
}

function tileClass(value) {
  if (value === 0) return 't-0';
  if (value > 2048) return 't-high';
  return `t-${value}`;
}

export default function TwoZeroFourEight() {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState(null);
  const [grid, setGrid] = useState(emptyGrid());
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [winAcknowledged, setWinAcknowledged] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [hintMsg, setHintMsg] = useState('');
  const [savedRef] = useState({ saved: false });

  const saveScore = useCallback(async (result, sc, diff) => {
    if (!isLoggedIn() || savedRef.saved) return;
    savedRef.saved = true;
    const key = `game_result_2048_${Date.now()}`;
    sessionStorage.setItem(key, '1');
    try {
      await apiRequest('POST', { game_type: '2048', result, difficulty: diff, score: sc }, '/game/save');
    } catch (_) {}
  }, [savedRef]);

  const startGame = useCallback((diff) => {
    savedRef.saved = false;
    let g = emptyGrid();
    g = addTile(g);
    g = addTile(g);
    setDifficulty(diff);
    setGrid(g);
    setScore(0);
    setGameOver(false);
    setWon(false);
    setWinAcknowledged(false);
    setHintUsed(false);
    setHintMsg('');
  }, [savedRef]);

  const processMove = useCallback((direction, currentGrid, currentScore, diff) => {
    const fns = { left: moveLeft, right: moveRight, up: moveUp, down: moveDown };
    const { grid: moved, score: gained } = fns[direction](currentGrid);
    if (gridsEqual(moved, currentGrid)) return;

    const newGrid = addTile(moved);
    const newScore = currentScore + gained;
    setGrid(newGrid);
    setScore(newScore);
    setHintMsg('');

    const target = WIN_TARGET[diff];
    const maxTile = Math.max(...newGrid.flat());
    if (!won && maxTile >= target) {
      setWon(true);
    }

    if (!hasValidMoves(newGrid)) {
      setGameOver(true);
      if (maxTile >= target) {
        saveScore('win', newScore, diff);
      } else {
        saveScore('loss', newScore, diff);
      }
    }
  }, [won, saveScore]);

  useEffect(() => {
    if (!difficulty || gameOver || (won && !winAcknowledged)) return;
    const onKey = (e) => {
      const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
                    a: 'left', d: 'right', w: 'up', s: 'down',
                    A: 'left', D: 'right', W: 'up', S: 'down' };
      const dir = map[e.key];
      if (!dir) return;
      e.preventDefault();
      setGrid(g => {
        setScore(sc => {
          processMove(dir, g, sc, difficulty);
          return sc;
        });
        return g;
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [difficulty, gameOver, won, winAcknowledged, processMove]);

  const handleArrow = (dir) => {
    if (gameOver || (won && !winAcknowledged)) return;
    processMove(dir, grid, score, difficulty);
  };

  // ── Swipe support: one finger drag across the board moves in that direction ──
  const touchStartRef = useRef(null);
  const SWIPE_THRESHOLD = 24; // px — small enough to feel responsive, large enough to ignore taps

  const handleBoardTouchStart = (e) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleBoardTouchEnd = (e) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (Math.max(absX, absY) < SWIPE_THRESHOLD) return;
    if (absX > absY) {
      handleArrow(dx > 0 ? 'right' : 'left');
    } else {
      handleArrow(dy > 0 ? 'down' : 'up');
    }
  };

  const useHint = () => {
    if (hintUsed || gameOver) return;
    setHintUsed(true);
    const dirs = ['left', 'right', 'up', 'down'];
    let best = dirs[0];
    let bestScore = -1;
    for (const d of dirs) {
      const s = countMerges(grid, d);
      if (s > bestScore) { bestScore = s; best = d; }
    }
    setHintMsg(`Try sliding ${best.toUpperCase()}`);
  };

  if (!difficulty) {
    return (
      <div className="game-page">
        <div className="gs-container">
          <div style={{ marginBottom: 16 }}>
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
          </div>
          <div className="game-header">
            <h1>2048</h1>
            <p style={{ color: 'var(--muted)' }}>Slide tiles to merge them. Reach the target tile to win!</p>
          </div>

          <HowToPlay>
            <p><b>Objective:</b> slide and merge numbered tiles until you reach the target tile value.</p>
            <ul>
              <li>On desktop, use the Arrow keys or WASD to slide every tile on the board in that direction.</li>
              <li>On mobile, swipe anywhere on the board in the direction you want to move, or use the on-screen arrow buttons — both do the same thing as the keyboard.</li>
              <li>When two tiles with the same number collide, they merge into one tile with double the value and add to your score.</li>
              <li>After each move, a new tile (2 or, occasionally, 4) appears in an empty spot.</li>
              <li>Reach the target tile for your difficulty to win — 512 (Easy), 1024 (Medium), or 2048 (Hard) — then choose to keep playing for a higher score.</li>
              <li>The game ends if the board fills up and no move can slide or merge any tile.</li>
              <li>A one-time hint suggests the direction that merges the most tiles right now.</li>
            </ul>
          </HowToPlay>

          <div className="difficulty-select">
            {['easy','medium','hard'].map(d => (
              <button key={d} className={`diff-btn diff-${d}`} onClick={() => startGame(d)}>
                <span className="diff-label">{d}</span>
                <span className="diff-sub">
                  {d === 'easy' && `Reach ${WIN_TARGET.easy} tile`}
                  {d === 'medium' && `Reach ${WIN_TARGET.medium} tile`}
                  {d === 'hard' && `Reach ${WIN_TARGET.hard} tile`}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="game-page">
      <div className="gs-container">
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
          <span className={`diff-badge diff-${difficulty}`}>{difficulty}</span>
        </div>
        <div className="game-header">
          <h1>2048</h1>
          <div className="game-meta">
            <span>Score: {score}</span>
            <span>Target: {WIN_TARGET[difficulty]}</span>
            {hintUsed && <span className="hint-used">Hint used</span>}
          </div>
        </div>

        {won && !winAcknowledged && (
          <div className="game-msg success" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            You reached {WIN_TARGET[difficulty]}!
            <button className="gs-btn gs-btn-sm gs-btn-outline" onClick={() => { setWinAcknowledged(true); saveScore('win', score, difficulty); }}>
              Keep going
            </button>
          </div>
        )}
        {gameOver && (
          <div className={`game-msg ${won ? 'success' : 'fail'}`}>
            {won ? `Amazing! Final score: ${score}` : `No more moves! Score: ${score}`}
          </div>
        )}
        {hintMsg && <div className="game-msg info">{hintMsg}</div>}

        <div
          style={{ display: 'flex', justifyContent: 'center', touchAction: 'none' }}
          onTouchStart={handleBoardTouchStart}
          onTouchEnd={handleBoardTouchEnd}
        >
          <div className="board-2048">
            {grid.flat().map((val, i) => (
              <div
                key={i}
                className={`tile-2048 ${tileClass(val)}`}
                style={{ width: 'clamp(44px, calc((100vw - 120px) / 4), 72px)', height: 'clamp(44px, calc((100vw - 120px) / 4), 72px)' }}
              >
                {val !== 0 ? val : ''}
              </div>
            ))}
          </div>
        </div>

        {/* Touch/tap D-pad — mirrors the keyboard controls for touchscreens (hidden above 640px via CSS) */}
        <div className="arrow-controls-2048">
          <button onClick={() => handleArrow('up')} aria-label="Move up">▲</button>
          <div className="arrow-row-2048">
            <button onClick={() => handleArrow('left')} aria-label="Move left">◄</button>
            <button onClick={() => handleArrow('down')} aria-label="Move down">▼</button>
            <button onClick={() => handleArrow('right')} aria-label="Move right">►</button>
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, textAlign: 'center' }}>
          <span className="desktop-only-hint">Arrow keys or WASD also work</span>
          <span className="mobile-only-hint">Swipe the board in any direction to move</span>
        </div>

        <div className="game-controls">
          {!gameOver && !hintUsed && (
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={useHint}>Use Hint</button>
          )}
          {gameOver && (
            <>
              <button className="gs-btn gs-btn-primary" onClick={() => startGame(difficulty)}>Play Again</button>
              <button className="gs-btn gs-btn-outline" onClick={() => setDifficulty(null)}>Change Difficulty</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
