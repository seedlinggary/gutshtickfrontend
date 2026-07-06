import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';

const CONFIGS = {
  easy:   { size: 3, moves: 5 },
  medium: { size: 4, moves: 8 },
  hard:   { size: 5, moves: 12 },
};

function emptyGrid(size) {
  return Array(size).fill(null).map(() => Array(size).fill(0));
}

function applyToggle(grid, r, c) {
  const size = grid.length;
  const next = grid.map(row => [...row]);
  const neighbors = [[r, c], [r-1, c], [r+1, c], [r, c-1], [r, c+1]];
  for (const [nr, nc] of neighbors) {
    if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
      next[nr][nc] = next[nr][nc] === 0 ? 1 : 0;
    }
  }
  return next;
}

function generatePuzzle(size, numMoves) {
  let grid = emptyGrid(size);
  for (let i = 0; i < numMoves; i++) {
    const r = Math.floor(Math.random() * size);
    const c = Math.floor(Math.random() * size);
    grid = applyToggle(grid, r, c);
  }
  return grid;
}

function countOn(grid) {
  return grid.flat().reduce((sum, v) => sum + v, 0);
}

function allOff(grid) {
  return grid.flat().every(v => v === 0);
}

export default function LightsOut() {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState(null);
  const [grid, setGrid] = useState(null);
  const [moves, setMoves] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [hintCell, setHintCell] = useState(null);
  const [savedRef] = useState({ saved: false });

  const saveScore = useCallback(async (result, sc, diff) => {
    if (!isLoggedIn() || savedRef.saved) return;
    savedRef.saved = true;
    const key = `game_result_lights_out_${Date.now()}`;
    sessionStorage.setItem(key, '1');
    try {
      await apiRequest('POST', { game_type: 'lights_out', result, difficulty: diff, score: sc }, '/game/save');
    } catch (_) {}
  }, [savedRef]);

  const startGame = useCallback((diff) => {
    savedRef.saved = false;
    const cfg = CONFIGS[diff];
    setDifficulty(diff);
    setGrid(generatePuzzle(cfg.size, cfg.moves));
    setMoves(0);
    setGameOver(false);
    setWon(false);
    setHintUsed(false);
    setHintCell(null);
  }, [savedRef]);

  const handleCellClick = useCallback((r, c) => {
    if (gameOver) return;
    setHintCell(null);
    setGrid(prev => {
      const next = applyToggle(prev, r, c);
      setMoves(m => {
        const newMoves = m + 1;
        if (allOff(next)) {
          setGameOver(true);
          setWon(true);
          const size = prev.length;
          const sc = Math.max(0, (size * size * 10) - (newMoves * 2) - (hintUsed ? 15 : 0));
          saveScore('win', sc, difficulty);
        }
        return newMoves;
      });
      return next;
    });
  }, [gameOver, hintUsed, difficulty, saveScore]);

  const useHint = () => {
    if (hintUsed || gameOver || !grid) return;
    setHintUsed(true);
    const size = grid.length;
    let bestCell = null;
    let bestReduction = -1;
    const currentOn = countOn(grid);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const next = applyToggle(grid, r, c);
        const reduction = currentOn - countOn(next);
        if (reduction > bestReduction) {
          bestReduction = reduction;
          bestCell = [r, c];
        }
      }
    }
    setHintCell(bestCell);
  };

  if (!difficulty) {
    return (
      <div className="game-page">
        <div className="gs-container">
          <div style={{ marginBottom: 16 }}>
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
          </div>
          <div className="game-header">
            <h1>Lights Out</h1>
            <p style={{ color: 'var(--muted)' }}>Click cells to toggle lights. Turn them all OFF to win!</p>
          </div>
          <div className="difficulty-select">
            {['easy','medium','hard'].map(d => (
              <button key={d} className={`diff-btn diff-${d}`} onClick={() => startGame(d)}>
                <span className="diff-label">{d}</span>
                <span className="diff-sub">
                  {d === 'easy' && '3×3 grid · 5 shuffles'}
                  {d === 'medium' && '4×4 grid · 8 shuffles'}
                  {d === 'hard' && '5×5 grid · 12 shuffles'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const size = CONFIGS[difficulty].size;
  const lightsOn = grid ? countOn(grid) : 0;
  const finalScore = grid
    ? Math.max(0, (size * size * 10) - (moves * 2) - (hintUsed ? 15 : 0))
    : 0;

  return (
    <div className="game-page">
      <div className="gs-container">
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
          <span className={`diff-badge diff-${difficulty}`}>{difficulty}</span>
        </div>
        <div className="game-header">
          <h1>Lights Out</h1>
          <div className="game-meta">
            <span>Moves: {moves}</span>
            <span>Lights on: {lightsOn}</span>
            {hintUsed && <span className="hint-used">Hint used</span>}
          </div>
        </div>

        {gameOver && (
          <div className="game-msg success">
            Solved in {moves} moves! Score: {finalScore}
          </div>
        )}

        {grid && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div
              className="lights-grid"
              style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
            >
              {grid.map((row, r) =>
                row.map((cell, c) => {
                  const isHint = hintCell && hintCell[0] === r && hintCell[1] === c;
                  const cellSize = `clamp(34px, calc((100vw - 80px - ${(size - 1) * 7}px) / ${size}), 62px)`;
                  return (
                    <div
                      key={`${r}-${c}`}
                      className={`light-cell ${cell === 1 ? 'on' : 'off'}${isHint ? ' hint-cell' : ''}`}
                      style={{ width: cellSize, height: cellSize }}
                      onClick={() => handleCellClick(r, c)}
                    />
                  );
                })
              )}
            </div>
          </div>
        )}

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
