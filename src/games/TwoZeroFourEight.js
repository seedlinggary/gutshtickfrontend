import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';

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

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="board-2048">
            {grid.flat().map((val, i) => (
              <div key={i} className={`tile-2048 ${tileClass(val)}`}>
                {val !== 0 ? val : ''}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginTop: 12 }}>
          <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => handleArrow('up')}>▲</button>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => handleArrow('left')}>◄</button>
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => handleArrow('down')}>▼</button>
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => handleArrow('right')}>►</button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Arrow keys or WASD also work</div>
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
