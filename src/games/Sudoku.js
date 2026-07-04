import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';

// ── Sudoku generator ──────────────────────────────────────────────────────────

function isValid(board, row, col, num) {
  for (let c = 0; c < 9; c++) if (board[row][c] === num) return false;
  for (let r = 0; r < 9; r++) if (board[r][col] === num) return false;
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++)
    for (let c = bc; c < bc + 3; c++)
      if (board[r][c] === num) return false;
  return true;
}

function solve(board) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
        for (const n of nums) {
          if (isValid(board, r, c, n)) {
            board[r][c] = n;
            if (solve(board)) return true;
            board[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function generatePuzzle(difficulty) {
  const solution = Array.from({ length: 9 }, () => Array(9).fill(0));
  solve(solution);
  const puzzle = solution.map((row) => [...row]);
  const cellsToRemove = { easy: 35, medium: 46, hard: 54 }[difficulty];
  let removed = 0;
  const positions = Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9])
    .sort(() => Math.random() - 0.5);
  for (const [r, c] of positions) {
    if (removed >= cellsToRemove) break;
    puzzle[r][c] = 0;
    removed++;
  }
  return { puzzle, solution };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Sudoku() {
  const [difficulty, setDifficulty] = useState('medium');
  const [puzzle, setPuzzle] = useState(null);
  const [solution, setSolution] = useState(null);
  const [board, setBoard] = useState(null);        // user's current state
  const [fixed, setFixed] = useState(null);        // immutable given cells
  const [selected, setSelected] = useState(null);  // [row, col]
  const [errors, setErrors] = useState(new Set());
  const [hintCount, setHintCount] = useState(0);
  const [gameStatus, setGameStatus] = useState('idle'); // idle | playing | won
  const [seconds, setSeconds] = useState(0);
  const [saved, setSaved] = useState(false);
  const [stats, setStats] = useState({ wins: 0, losses: 0, wins_with_hint: 0, best_score: 0 });

  useEffect(() => {
    if (isLoggedIn()) {
      apiRequest('GET', null, '/game/stats').then((d) => {
        if (d?.sudoku) setStats(d.sudoku);
      }).catch(() => {});
    }
  }, [saved]);

  useEffect(() => {
    let timer;
    if (gameStatus === 'playing') {
      timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [gameStatus]);

  const startGame = useCallback(() => {
    const { puzzle: p, solution: sol } = generatePuzzle(difficulty);
    setPuzzle(p);
    setSolution(sol);
    setBoard(p.map((row) => [...row]));
    setFixed(p.map((row) => row.map((v) => v !== 0)));
    setSelected(null);
    setErrors(new Set());
    setHintCount(0);
    setGameStatus('playing');
    setSeconds(0);
    setSaved(false);
  }, [difficulty]);

  const checkWin = useCallback((b) => {
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (b[r][c] !== solution[r][c]) return false;
    return true;
  }, [solution]);

  const placeNumber = (num) => {
    if (!selected || gameStatus !== 'playing') return;
    const [r, c] = selected;
    if (fixed[r][c]) return;
    const newBoard = board.map((row) => [...row]);
    newBoard[r][c] = num;
    // Mark errors
    const newErrors = new Set();
    for (let row = 0; row < 9; row++)
      for (let col = 0; col < 9; col++)
        if (newBoard[row][col] !== 0 && newBoard[row][col] !== solution[row][col])
          newErrors.add(`${row}-${col}`);
    setErrors(newErrors);
    setBoard(newBoard);
    if (checkWin(newBoard)) {
      setGameStatus('won');
      const result = hintCount > 0 ? 'win_with_hint' : 'win';
      const score = Math.max(0, 1000 - seconds * 2 - hintCount * 50);
      if (isLoggedIn() && !saved) {
        setSaved(true);
        apiRequest('POST', { game_type: 'sudoku', result, difficulty, score }, '/game/save').catch(() => {});
      }
    }
  };

  const useHint = () => {
    if (!selected || gameStatus !== 'playing') return;
    const [r, c] = selected;
    if (fixed[r][c]) return;
    const newBoard = board.map((row) => [...row]);
    newBoard[r][c] = solution[r][c];
    const newErrors = new Set(errors);
    newErrors.delete(`${r}-${c}`);
    setBoard(newBoard);
    setErrors(newErrors);
    setHintCount((h) => h + 1);
    if (checkWin(newBoard)) {
      setGameStatus('won');
      const score = Math.max(0, 1000 - seconds * 2 - (hintCount + 1) * 50);
      if (isLoggedIn() && !saved) {
        setSaved(true);
        apiRequest('POST', { game_type: 'sudoku', result: 'win_with_hint', difficulty, score }, '/game/save').catch(() => {});
      }
    }
  };

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="game-page">
      <div className="game-header">
        <Link to="/games" className="game-back">← Games</Link>
        <h1 className="game-title">Sudoku</h1>
        <p className="game-subtitle">Fill the 9×9 grid so every row, column, and box has 1–9</p>
      </div>

      <div className="game-controls-bar">
        <div className="game-difficulty-select">
          {['easy', 'medium', 'hard'].map((d) => (
            <button key={d} className={`difficulty-btn${difficulty === d ? ' active' : ''}`}
              onClick={() => setDifficulty(d)}>
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {gameStatus === 'playing' && <span className="sudoku-timer">{fmt(seconds)}</span>}
          <button className="gs-btn gs-btn-primary gs-btn-sm" onClick={startGame}>
            {gameStatus === 'idle' ? 'Start Game' : 'New Game'}
          </button>
        </div>
      </div>

      {isLoggedIn() && (
        <div className="game-stats-bar">
          <span>W: <b>{stats.wins}</b></span>
          <span>W+Hint: <b>{stats.wins_with_hint}</b></span>
          <span>Best: <b>{stats.best_score}</b></span>
        </div>
      )}

      {gameStatus === 'idle' && (
        <div className="game-idle-state">
          <div style={{ fontSize: 64 }}>🔢</div>
          <p>Select a difficulty and press <b>Start Game</b></p>
        </div>
      )}

      {gameStatus === 'won' && (
        <div className="game-result-banner won" style={{ margin: '0 auto 16px', maxWidth: 520 }}>
          🎉 Puzzle solved! {hintCount > 0 ? `(${hintCount} hint${hintCount > 1 ? 's' : ''} used)` : 'Flawlessly!'} — {fmt(seconds)}
          <button className="gs-btn gs-btn-primary gs-btn-sm" style={{ marginLeft: 12 }} onClick={startGame}>
            Next Puzzle
          </button>
        </div>
      )}

      {board && (
        <div className="sudoku-wrapper">
          <div className="sudoku-grid">
            {board.map((row, r) =>
              row.map((val, c) => {
                const isFixed = fixed[r][c];
                const isSelected = selected && selected[0] === r && selected[1] === c;
                const isSameNum = selected && val !== 0 && val === board[selected[0]][selected[1]];
                const hasError = errors.has(`${r}-${c}`);
                const borderRight = (c + 1) % 3 === 0 && c !== 8 ? '2px solid #334155' : undefined;
                const borderBottom = (r + 1) % 3 === 0 && r !== 8 ? '2px solid #334155' : undefined;
                return (
                  <div
                    key={`${r}-${c}`}
                    className={`sudoku-cell${isFixed ? ' fixed' : ''}${isSelected ? ' selected' : ''}${isSameNum && !isSelected ? ' highlight' : ''}${hasError ? ' error' : ''}`}
                    style={{ borderRight, borderBottom }}
                    onClick={() => setSelected([r, c])}
                  >
                    {val !== 0 ? val : ''}
                  </div>
                );
              })
            )}
          </div>

          <div className="sudoku-numpad">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <button key={n} className="sudoku-numkey" onClick={() => placeNumber(n)}>{n}</button>
            ))}
            <button className="sudoku-numkey erase" onClick={() => placeNumber(0)}>⌫</button>
            <button
              className="sudoku-numkey hint-key"
              onClick={useHint}
              disabled={!selected || (selected && fixed[selected[0]]?.[selected[1]])}
            >
              💡 Hint ({hintCount})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
