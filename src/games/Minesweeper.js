import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';

const PRESETS = {
  easy: { cols: 9, rows: 9, mines: 10 },
  medium: { cols: 16, rows: 16, mines: 40 },
  hard: { cols: 30, rows: 16, mines: 99 },
};

function buildEmpty(cols, rows) {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({
      r, c, isMine: false, isRevealed: false, isFlagged: false, adjacent: 0,
    }))
  );
}

function placeMines(grid, cols, rows, mines, safeR, safeC) {
  const positions = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (Math.abs(r - safeR) > 1 || Math.abs(c - safeC) > 1) positions.push([r, c]);
  positions.sort(() => Math.random() - 0.5);
  for (let i = 0; i < mines; i++) {
    const [r, c] = positions[i];
    grid[r][c].isMine = true;
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c].isMine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc].isMine) count++;
        }
      grid[r][c].adjacent = count;
    }
  }
  return grid;
}

function revealCascade(grid, r, c, rows, cols) {
  if (r < 0 || r >= rows || c < 0 || c >= cols) return;
  const cell = grid[r][c];
  if (cell.isRevealed || cell.isFlagged || cell.isMine) return;
  cell.isRevealed = true;
  if (cell.adjacent === 0) {
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++)
        revealCascade(grid, r + dr, c + dc, rows, cols);
  }
}

function getNeighbors(r, c, rows, cols) {
  const neighbors = [];
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) neighbors.push([nr, nc]);
    }
  return neighbors;
}

const ADJ_COLORS = ['', '#3b82f6', '#22c55e', '#ef4444', '#7c3aed', '#b91c1c', '#0891b2', '#000', '#64748b'];

export default function Minesweeper() {
  const [difficulty, setDifficulty] = useState('easy');
  const [grid, setGrid] = useState(null);
  const [gameStatus, setGameStatus] = useState('idle');
  const [minesLeft, setMinesLeft] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [firstClick, setFirstClick] = useState(true);
  const [hintUsed, setHintUsed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [stats, setStats] = useState({ wins: 0, losses: 0, wins_with_hint: 0 });

  // Chord state: the cell currently being chorded, and the set of neighbor keys showing pressed
  const [chordTarget, setChordTarget] = useState(null); // [r, c] or null
  const chordTargetRef = useRef(null);                  // same value, accessible in event handlers

  useEffect(() => {
    if (isLoggedIn()) {
      apiRequest('GET', null, '/game/stats').then((d) => {
        if (d?.minesweeper) setStats(d.minesweeper);
      }).catch(() => {});
    }
  }, [saved]);

  useEffect(() => {
    let t;
    if (gameStatus === 'playing') t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [gameStatus]);

  const startGame = useCallback(() => {
    const { cols, rows, mines } = PRESETS[difficulty];
    setGrid(buildEmpty(cols, rows));
    setMinesLeft(mines);
    setGameStatus('idle');
    setSeconds(0);
    setFirstClick(true);
    setHintUsed(false);
    setSaved(false);
    setChordTarget(null);
    chordTargetRef.current = null;
  }, [difficulty]);

  useEffect(() => { startGame(); }, []);

  const checkWin = useCallback((g) => {
    const { cols, rows, mines } = PRESETS[difficulty];
    let revealed = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (g[r][c].isRevealed) revealed++;
    return revealed === cols * rows - mines;
  }, [difficulty]);

  // ── Chord: both-button click on a revealed number ──────────────────────────
  const performChord = useCallback((r, c, currentGrid) => {
    if (gameStatus !== 'playing') return;
    const { rows, cols } = PRESETS[difficulty];
    const cell = currentGrid[r][c];
    if (!cell.isRevealed || cell.adjacent === 0) return;

    const neighbors = getNeighbors(r, c, rows, cols);
    const flaggedCount = neighbors.filter(([nr, nc]) => currentGrid[nr][nc].isFlagged).length;

    // Chord only fires when flagged count exactly matches the cell's number
    if (flaggedCount !== cell.adjacent) return;

    const g = currentGrid.map((row) => row.map((cell) => ({ ...cell })));
    let hitMine = false;

    for (const [nr, nc] of neighbors) {
      if (g[nr][nc].isRevealed || g[nr][nc].isFlagged) continue;
      if (g[nr][nc].isMine) {
        // Wrong flag somewhere — reveal all mines
        for (let row2 = 0; row2 < rows; row2++)
          for (let col2 = 0; col2 < cols; col2++)
            if (g[row2][col2].isMine) g[row2][col2].isRevealed = true;
        hitMine = true;
        break;
      }
      revealCascade(g, nr, nc, rows, cols);
    }

    setGrid(g);
    setChordTarget(null);
    chordTargetRef.current = null;

    if (hitMine) {
      setGameStatus('lost');
      if (!saved && isLoggedIn()) {
        setSaved(true);
        apiRequest('POST', { game_type: 'minesweeper', result: 'loss', difficulty, score: 0 }, '/game/save').catch(() => {});
      }
    } else if (checkWin(g)) {
      setGameStatus('won');
      const score = Math.max(0, 500 - seconds);
      const result = hintUsed ? 'win_with_hint' : 'win';
      if (!saved && isLoggedIn()) {
        setSaved(true);
        apiRequest('POST', { game_type: 'minesweeper', result, difficulty, score }, '/game/save').catch(() => {});
      }
    }
  }, [gameStatus, difficulty, saved, seconds, hintUsed, checkWin]);

  // Cancel chord when either button is released anywhere on the page
  useEffect(() => {
    const cancel = (e) => {
      // Both buttons released (buttons === 0) or only one remains
      if (e.buttons !== 3 && chordTargetRef.current) {
        // If the mouseup is on the same cell we started the chord on, fire it
        // (the cell's onMouseUp handles that — here we just clean up if released elsewhere)
        setChordTarget(null);
        chordTargetRef.current = null;
      }
    };
    window.addEventListener('mouseup', cancel);
    return () => window.removeEventListener('mouseup', cancel);
  }, []);

  // ── Left-click reveal ───────────────────────────────────────────────────────
  const handleClick = (e, r, c) => {
    // Ignore if this was part of a chord gesture
    if (e.button !== 0) return;
    if (gameStatus === 'won' || gameStatus === 'lost') return;
    const { cols, rows, mines } = PRESETS[difficulty];
    let g = grid.map((row) => row.map((cell) => ({ ...cell })));

    if (g[r][c].isFlagged || g[r][c].isRevealed) return;

    if (firstClick) {
      g = placeMines(g, cols, rows, mines, r, c);
      setFirstClick(false);
      setGameStatus('playing');
    }

    if (g[r][c].isMine) {
      for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) if (g[row][col].isMine) g[row][col].isRevealed = true;
      setGrid(g);
      setGameStatus('lost');
      if (!saved && isLoggedIn()) {
        setSaved(true);
        apiRequest('POST', { game_type: 'minesweeper', result: 'loss', difficulty, score: 0 }, '/game/save').catch(() => {});
      }
      return;
    }

    revealCascade(g, r, c, rows, cols);
    setGrid(g);

    if (checkWin(g)) {
      setGameStatus('won');
      const score = Math.max(0, 500 - seconds);
      const result = hintUsed ? 'win_with_hint' : 'win';
      if (!saved && isLoggedIn()) {
        setSaved(true);
        apiRequest('POST', { game_type: 'minesweeper', result, difficulty, score }, '/game/save').catch(() => {});
      }
    }
  };

  // ── Flag toggle (shared by right-click and long-press) ──────────────────────
  const flagCell = (r, c) => {
    if (gameStatus !== 'playing' || grid[r][c].isRevealed) return;
    // Don't flag if we're in chord mode on this cell
    if (chordTargetRef.current) return;
    const g = grid.map((row) => row.map((cell) => ({ ...cell })));
    g[r][c].isFlagged = !g[r][c].isFlagged;
    setMinesLeft((m) => m + (g[r][c].isFlagged ? -1 : 1));
    setGrid(g);
  };

  // ── Right-click flag ────────────────────────────────────────────────────────
  const handleRightClick = (e, r, c) => {
    e.preventDefault();
    flagCell(r, c);
  };

  // ── Touch support: tap reveals via onClick (works already); long-press flags ─
  const touchTimerRef = useRef(null);
  const touchMovedRef = useRef(false);
  const longPressFiredRef = useRef(false);

  const clearTouchTimer = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  // Always clear any pending long-press timer on unmount so it can't fire
  // after the component is gone.
  useEffect(() => clearTouchTimer, []);

  const handleTouchStart = (r, c) => {
    if (gameStatus === 'won' || gameStatus === 'lost') return;
    touchMovedRef.current = false;
    longPressFiredRef.current = false;
    clearTouchTimer();
    touchTimerRef.current = setTimeout(() => {
      if (!touchMovedRef.current) {
        longPressFiredRef.current = true;
        flagCell(r, c);
      }
    }, 450);
  };

  // Cancel the long-press if the finger moves (e.g. scrolling) instead of holding
  const handleTouchMove = () => {
    touchMovedRef.current = true;
    clearTouchTimer();
  };

  // Clean up on release; if the long-press already flagged the cell, swallow
  // the compatibility click that would otherwise also reveal it.
  const handleTouchEnd = (e) => {
    clearTouchTimer();
    if (longPressFiredRef.current) {
      e.preventDefault();
      longPressFiredRef.current = false;
    }
  };

  // ── mousedown: detect chord gesture start ───────────────────────────────────
  const handleMouseDown = (e, r, c) => {
    if (gameStatus !== 'playing') return;
    // e.buttons === 3 means both left (1) and right (2) are held simultaneously
    if (e.buttons === 3) {
      const cell = grid[r][c];
      if (cell.isRevealed && cell.adjacent > 0) {
        setChordTarget([r, c]);
        chordTargetRef.current = [r, c];
      }
    }
  };

  // ── mouseup: fire chord if we release on the same cell ──────────────────────
  const handleMouseUp = (e, r, c) => {
    const target = chordTargetRef.current;
    if (!target) return;
    if (target[0] === r && target[1] === c) {
      performChord(r, c, grid);
    } else {
      setChordTarget(null);
      chordTargetRef.current = null;
    }
  };

  const useHint = () => {
    if (!grid || gameStatus !== 'playing') return;
    const { rows, cols } = PRESETS[difficulty];
    const safe = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
      if (!grid[r][c].isRevealed && !grid[r][c].isMine && !grid[r][c].isFlagged) safe.push([r, c]);
    if (safe.length === 0) return;
    const [r, c] = safe[Math.floor(Math.random() * safe.length)];
    const g = grid.map((row) => row.map((cell) => ({ ...cell })));
    revealCascade(g, r, c, rows, cols);
    setGrid(g);
    setHintUsed(true);
  };

  // Compute which cells should show the "pressed" chord preview
  const chordNeighborSet = new Set();
  if (chordTarget && grid) {
    const { rows, cols } = PRESETS[difficulty];
    const [cr, cc] = chordTarget;
    getNeighbors(cr, cc, rows, cols).forEach(([nr, nc]) => {
      if (!grid[nr][nc].isRevealed && !grid[nr][nc].isFlagged) {
        chordNeighborSet.add(`${nr}-${nc}`);
      }
    });
  }

  const { cols } = PRESETS[difficulty];

  return (
    <div className="game-page">
      <div className="game-header">
        <Link to="/games" className="game-back">← Games</Link>
        <h1 className="game-title">Minesweeper</h1>
        <p className="game-subtitle">
          Left click to reveal · Right click to flag · <b>Both buttons</b> on a number to chord-reveal neighbors
        </p>
      </div>

      <div className="game-controls-bar">
        <div className="game-difficulty-select">
          {['easy', 'medium', 'hard'].map((d) => (
            <button key={d} className={`difficulty-btn${difficulty === d ? ' active' : ''}`}
              onClick={() => { setDifficulty(d); }}>
              {d === 'easy' ? 'Beginner (9×9)' : d === 'medium' ? 'Intermediate (16×16)' : 'Expert (30×16)'}
            </button>
          ))}
        </div>
        <button className="gs-btn gs-btn-primary gs-btn-sm" onClick={startGame}>New Game</button>
      </div>

      {isLoggedIn() && (
        <div className="game-stats-bar">
          <span>W: <b>{stats.wins}</b></span>
          <span>W+Hint: <b>{stats.wins_with_hint}</b></span>
          <span>L: <b>{stats.losses}</b></span>
        </div>
      )}

      <div className="minesweeper-hud">
        <span className="ms-counter">💣 {minesLeft}</span>
        <div>
          {gameStatus === 'won' && <span className="ms-status won">🎉 You won!</span>}
          {gameStatus === 'lost' && <span className="ms-status lost">💥 Boom!</span>}
          {(gameStatus === 'playing' || gameStatus === 'idle') && (
            <span className="ms-timer">⏱ {seconds}s</span>
          )}
        </div>
        <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={useHint} disabled={hintUsed || gameStatus !== 'playing'}>
          {hintUsed ? '💡 Used' : '💡 Hint'}
        </button>
      </div>

      {gameStatus === 'won' && (
        <div className="game-result-banner won" style={{ margin: '0 0 12px', flexWrap: 'wrap' }}>
          🎉 Cleared in {seconds}s! {hintUsed ? '(hint used)' : 'No hints!'}
          <button className="gs-btn gs-btn-primary gs-btn-sm" style={{ marginLeft: 12 }} onClick={startGame}>Play Again</button>
        </div>
      )}
      {gameStatus === 'lost' && (
        <div className="game-result-banner lost" style={{ margin: '0 0 12px', flexWrap: 'wrap' }}>
          💥 Hit a mine! Better luck next time.
          <button className="gs-btn gs-btn-primary gs-btn-sm" style={{ marginLeft: 12 }} onClick={startGame}>Try Again</button>
        </div>
      )}

      <div className="minesweeper-scroll" onContextMenu={(e) => e.preventDefault()}>
        <div className="minesweeper-grid" style={{ gridTemplateColumns: `repeat(${cols}, 28px)` }}>
          {grid && grid.map((row) =>
            row.map((cell) => {
              const key = `${cell.r}-${cell.c}`;
              const isChordNeighbor = chordNeighborSet.has(key);
              const isChordCenter = chordTarget && chordTarget[0] === cell.r && chordTarget[1] === cell.c;

              let cls = 'ms-cell';
              if (cell.isRevealed) cls += ' revealed';
              if (cell.isFlagged && !cell.isRevealed) cls += ' flagged';
              if (cell.isRevealed && cell.isMine) cls += ' mine';
              if (isChordNeighbor) cls += ' chord-neighbor';
              if (isChordCenter) cls += ' chord-center';

              return (
                <div
                  key={key}
                  className={cls}
                  style={{
                    ...(cell.isRevealed && !cell.isMine && cell.adjacent > 0 ? { color: ADJ_COLORS[cell.adjacent] } : {}),
                    WebkitTouchCallout: 'none',
                    touchAction: 'manipulation',
                  }}
                  onClick={(e) => handleClick(e, cell.r, cell.c)}
                  onContextMenu={(e) => handleRightClick(e, cell.r, cell.c)}
                  onMouseDown={(e) => handleMouseDown(e, cell.r, cell.c)}
                  onMouseUp={(e) => handleMouseUp(e, cell.r, cell.c)}
                  onTouchStart={() => handleTouchStart(cell.r, cell.c)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchEnd}
                >
                  {cell.isFlagged && !cell.isRevealed
                    ? '🚩'
                    : cell.isRevealed && cell.isMine
                    ? '💣'
                    : cell.isRevealed && cell.adjacent > 0
                    ? cell.adjacent
                    : ''}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
