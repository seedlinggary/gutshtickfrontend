import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiRequest from '../../ApiRequest';
import { isLoggedIn } from '../../auth';

// Puzzles: { size, solution: 2d array of 0/1, givens: [[r,c,val],...] }
// All solutions verified:
//   - Equal 0s and 1s per row and column
//   - No three consecutive same value in any row or column
//   - No two identical rows or columns
const PUZZLES = {
  easy: [
    {
      size: 6,
      solution: [
        [0,1,1,0,0,1],
        [1,0,0,1,1,0],
        [0,0,1,1,0,1],
        [1,1,0,0,1,0],
        [1,0,0,1,0,1],
        [0,1,1,0,1,0],
      ],
      givens: [[0,1,1],[0,5,1],[1,0,1],[2,2,1],[3,0,1],[4,3,1],[5,4,1]],
    },
    {
      size: 6,
      solution: [
        [1,0,0,1,0,1],
        [0,1,1,0,1,0],
        [1,1,0,0,1,0],
        [0,0,1,1,0,1],
        [0,1,1,0,0,1],
        [1,0,0,1,1,0],
      ],
      givens: [[0,0,1],[0,5,1],[1,1,1],[2,0,1],[3,2,1],[4,4,0],[5,3,1]],
    },
  ],
  medium: [
    {
      size: 8,
      solution: [
        [0,1,0,1,0,1,0,1],
        [1,0,1,0,1,0,1,0],
        [0,0,1,1,0,1,1,0],
        [1,1,0,0,1,0,0,1],
        [0,1,1,0,0,1,0,1],
        [1,0,0,1,1,0,1,0],
        [0,1,0,1,1,0,1,0],
        [1,0,1,0,0,1,0,1],
      ],
      givens: [[0,0,0],[0,2,0],[1,1,0],[2,1,0],[3,0,1],[4,2,1],[5,0,1],[6,1,1],[7,0,1],[7,4,0]],
    },
    {
      size: 8,
      solution: [
        [1,1,0,0,1,0,1,0],
        [0,0,1,1,0,1,0,1],
        [1,0,1,0,0,1,1,0],
        [0,1,0,1,1,0,0,1],
        [0,1,1,0,0,1,1,0],
        [1,0,0,1,1,0,0,1],
        [0,1,0,1,0,1,1,0],
        [1,0,1,0,1,0,0,1],
      ],
      givens: [[0,0,1],[0,4,1],[1,2,1],[1,6,0],[2,0,1],[3,1,1],[4,0,0],[5,2,0],[6,3,1],[7,1,0]],
    },
  ],
  hard: [
    {
      size: 10,
      solution: [
        [0,1,0,1,0,1,0,1,1,0],
        [1,0,1,0,1,0,1,0,0,1],
        [0,0,1,1,0,0,1,1,0,1],
        [1,1,0,0,1,1,0,0,1,0],
        [0,1,0,1,1,0,0,1,0,1],
        [1,0,1,0,0,1,1,0,1,0],
        [0,1,1,0,1,0,0,1,1,0],
        [1,0,0,1,0,1,1,0,0,1],
        [1,0,1,0,0,1,0,1,1,0],
        [0,1,0,1,1,0,1,0,0,1],
      ],
      givens: [[0,0,0],[0,2,0],[1,0,1],[1,4,1],[2,1,0],[3,0,1],[4,2,0],[5,1,0],[6,1,1],[7,0,1],[8,1,0],[9,0,0],[0,9,0],[4,9,1]],
    },
    {
      size: 10,
      solution: [
        [0,0,1,1,0,0,1,1,0,1],
        [1,1,0,0,1,1,0,0,1,0],
        [0,1,0,1,0,1,0,1,1,0],
        [1,0,1,0,1,0,1,0,0,1],
        [0,0,1,1,0,1,0,1,1,0],
        [1,1,0,0,1,0,1,0,0,1],
        [0,1,1,0,1,0,0,1,1,0],
        [1,0,0,1,0,1,1,0,0,1],
        [1,0,1,0,0,1,1,0,1,0],
        [0,1,0,1,1,0,0,1,0,1],
      ],
      givens: [[0,0,0],[0,7,1],[1,2,0],[1,5,1],[2,0,0],[3,1,0],[4,2,1],[5,1,1],[6,1,1],[7,0,1],[8,2,1],[9,1,1],[0,9,1],[4,9,0]],
    },
  ],
};

function getViolations(grid, size) {
  const violated = new Set();
  // No 3 consecutive same in rows
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size-2; c++) {
      const v = grid[r][c];
      if (v !== null && v === grid[r][c+1] && v === grid[r][c+2]) {
        violated.add(`${r},${c}`); violated.add(`${r},${c+1}`); violated.add(`${r},${c+2}`);
      }
    }
  }
  // No 3 consecutive same in columns
  for (let c = 0; c < size; c++) {
    for (let r = 0; r < size-2; r++) {
      const v = grid[r][c];
      if (v !== null && v === grid[r+1][c] && v === grid[r+2][c]) {
        violated.add(`${r},${c}`); violated.add(`${r+1},${c}`); violated.add(`${r+2},${c}`);
      }
    }
  }
  // Equal 0s and 1s per row and column (flag only when exceeded, not when incomplete)
  for (let r = 0; r < size; r++) {
    const row = grid[r];
    const zeros = row.filter(v=>v===0).length;
    const ones = row.filter(v=>v===1).length;
    if (zeros > size/2 || ones > size/2) {
      row.forEach((_,c) => { if(grid[r][c]!==null) violated.add(`${r},${c}`); });
    }
  }
  for (let c = 0; c < size; c++) {
    const col = grid.map(r=>r[c]);
    const zeros = col.filter(v=>v===0).length;
    const ones = col.filter(v=>v===1).length;
    if (zeros > size/2 || ones > size/2) {
      col.forEach((_,r) => { if(grid[r][c]!==null) violated.add(`${r},${c}`); });
    }
  }
  // No two identical fully-filled rows
  for (let r1 = 0; r1 < size; r1++) {
    if (grid[r1].some(v=>v===null)) continue;
    for (let r2 = r1+1; r2 < size; r2++) {
      if (grid[r2].some(v=>v===null)) continue;
      if (grid[r1].every((v,c)=>v===grid[r2][c])) {
        for (let c = 0; c < size; c++) { violated.add(`${r1},${c}`); violated.add(`${r2},${c}`); }
      }
    }
  }
  // No two identical fully-filled columns
  for (let c1 = 0; c1 < size; c1++) {
    const col1 = grid.map(r=>r[c1]);
    if (col1.some(v=>v===null)) continue;
    for (let c2 = c1+1; c2 < size; c2++) {
      const col2 = grid.map(r=>r[c2]);
      if (col2.some(v=>v===null)) continue;
      if (col1.every((v,r)=>v===col2[r])) {
        for (let r = 0; r < size; r++) { violated.add(`${r},${c1}`); violated.add(`${r},${c2}`); }
      }
    }
  }
  return violated;
}

export default function BinaryPuzzle() {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState(null);
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [puzzle, setPuzzle] = useState(null);
  const [grid, setGrid] = useState(null); // null = empty, 0 or 1
  const [givensSet, setGivensSet] = useState(new Set());
  const [hintUsed, setHintUsed] = useState(false);
  const [won, setWon] = useState(false);
  const [msg, setMsg] = useState('');

  const startGame = useCallback((diff, idx=0) => {
    setDifficulty(diff);
    setPuzzleIdx(idx);
    const p = PUZZLES[diff][idx];
    setPuzzle(p);
    const g = Array.from({length:p.size},()=>Array(p.size).fill(null));
    const gs = new Set();
    p.givens.forEach(([r,c,v])=>{ g[r][c]=v; gs.add(`${r},${c}`); });
    setGrid(g);
    setGivensSet(gs);
    setHintUsed(false);
    setWon(false);
    setMsg('');
  }, []);

  const handleCellClick = (r, c) => {
    if (won || !grid || givensSet.has(`${r},${c}`)) return;
    const newGrid = grid.map(row=>[...row]);
    const cur = newGrid[r][c];
    newGrid[r][c] = cur === null ? 0 : cur === 0 ? 1 : null;
    setGrid(newGrid);
    // Check win — any grid that fully satisfies the puzzle rules counts as solved,
    // not just an exact match to the pre-computed solution (these puzzles are not
    // guaranteed to have a unique solution).
    const allFilled = newGrid.flat().every(v=>v!==null);
    if (allFilled) {
      const violations = getViolations(newGrid, puzzle.size);
      if (violations.size === 0) {
        setWon(true);
        const score = puzzle.size * puzzle.size * 8 - (hintUsed?50:0);
        setMsg(`Puzzle solved! Score: ${score}`);
        if (isLoggedIn()) apiRequest('POST',{game_type:'binary_puzzle',result:'win',difficulty,score},'/game/save');
      } else {
        setMsg('Almost! Check for violations.');
      }
    }
  };

  const handleHint = () => {
    if (hintUsed || !grid || won) return;
    setHintUsed(true);
    for (let r = 0; r < puzzle.size; r++) {
      for (let c = 0; c < puzzle.size; c++) {
        if (grid[r][c] === null) {
          const newGrid = grid.map(row=>[...row]);
          newGrid[r][c] = puzzle.solution[r][c];
          setGrid(newGrid);
          const allFilled = newGrid.flat().every(v=>v!==null);
          if (allFilled && getViolations(newGrid, puzzle.size).size === 0) {
            setWon(true);
            const score = puzzle.size * puzzle.size * 8 - 50;
            setMsg(`Puzzle solved! Score: ${score}`);
            if (isLoggedIn()) apiRequest('POST',{game_type:'binary_puzzle',result:'win',difficulty,score},'/game/save');
          } else {
            setMsg('Hint: one cell revealed!');
          }
          return;
        }
      }
    }
  };

  const violations = grid && puzzle ? getViolations(grid, puzzle.size) : new Set();
  // Fluid cell size: matches the original fixed px size on desktop (the vw
  // term is capped by the max), but shrinks on narrow phones so 8x8/10x10
  // boards don't overflow the viewport. Never drops below ~24-30px so cells
  // stay tappable; the wrapper below adds horizontal scroll as a safety net
  // for the densest (10x10) board on the smallest phones.
  const cellSize = puzzle && puzzle.size === 10 ? 'clamp(24px, 7vw, 40px)'
    : puzzle && puzzle.size === 8 ? 'clamp(26px, 8vw, 46px)'
    : 'clamp(30px, 11vw, 54px)';

  if (!difficulty) {
    return (
      <div className="game-page">
        <div className="gs-container">
          <div className="game-header">
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
            <h1>Binary Puzzle</h1>
          </div>
          <div className="gs-card" style={{textAlign:'center',padding:'2rem'}}>
            <p style={{color:'var(--muted)',marginBottom:'1rem'}}>Click to cycle: empty → 0 → 1. Equal 0s and 1s per row/col, no 3 in a row, no duplicate rows/cols.</p>
            <div className="difficulty-select">
              {['easy','medium','hard'].map(d => (
                <button key={d} className={`diff-btn diff-${d}`} onClick={() => startGame(d)}>
                  <span className="diff-label">{d.charAt(0).toUpperCase()+d.slice(1)}</span>
                  <span className="diff-sub">{d==='easy'?'6×6 grid':d==='medium'?'8×8 grid':'10×10 grid'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="game-page">
      <div className="gs-container">
        <div className="game-header">
          <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
          <h1>Binary Puzzle</h1>
          <span className={`diff-badge diff-${difficulty}`}>{difficulty}</span>
        </div>
        <div className="game-meta">
          {violations.size > 0 && <span style={{color:'var(--danger)'}}>⚠ Rule violation!</span>}
          {hintUsed && <span className="hint-used">Hint used</span>}
        </div>
        {msg && <div className={`game-msg ${won?'success':violations.size>0?'fail':'info'}`}>{msg}</div>}

        <div style={{display:'flex',justifyContent:'center',margin:'1rem 0',overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
          <div style={{
            display:'grid',
            gridTemplateColumns:`repeat(${puzzle.size},${cellSize})`,
            gap:2,
          }}>
            {grid && grid.map((row,r)=>row.map((val,c)=>{
              const isGiven = givensSet.has(`${r},${c}`);
              const isViolated = violations.has(`${r},${c}`);
              return (
                <div key={`${r}-${c}`}
                  onClick={()=>handleCellClick(r,c)}
                  style={{
                    width:cellSize,height:cellSize,
                    border:`2px solid ${isViolated?'var(--danger)':'var(--border)'}`,
                    backgroundColor: isGiven?'var(--border)':val===0?'#4488ff33':val===1?'#ff884433':'var(--surface)',
                    cursor:isGiven?'default':'pointer',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:'clamp(0.85rem, 3vw, 1.3rem)',fontWeight:'bold',
                    color: val===0?'#4488ff':val===1?'#ff8844':'transparent',
                    borderRadius:'var(--radius)',
                  }}>
                  {val !== null ? val : ''}
                </div>
              );
            }))}
          </div>
        </div>

        <div className="game-controls">
          {!hintUsed && !won && <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={handleHint}>Hint</button>}
          {won ? (
            <>
              <button className="gs-btn gs-btn-primary" onClick={()=>startGame(difficulty,puzzleIdx)}>Play Again</button>
              <button className="gs-btn gs-btn-outline" onClick={()=>setDifficulty(null)}>Change Difficulty</button>
            </>
          ) : (
            <button className="gs-btn gs-btn-outline gs-btn-sm"
              onClick={()=>startGame(difficulty,(puzzleIdx+1)%PUZZLES[difficulty].length)}>Next Puzzle</button>
          )}
        </div>
      </div>
    </div>
  );
}
