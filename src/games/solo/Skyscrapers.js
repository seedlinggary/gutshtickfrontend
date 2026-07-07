import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiRequest from '../../ApiRequest';
import { isLoggedIn } from '../../auth';
import HowToPlay from '../HowToPlay';

// Clues: { top, right, bottom, left } - arrays of clues for each row/col from that edge
// top[c] = how many buildings visible from top of column c
// right[r] = how many visible from right of row r
// bottom[c] = from bottom of column c
// left[r] = from left of row r
const PUZZLES = {
  easy: [
    {
      size: 4,
      solution: [
        [2,1,4,3],
        [3,4,1,2],
        [4,2,3,1],
        [1,3,2,4],
      ],
      clues: { top:[3,2,1,2], right:[2,2,3,1], bottom:[2,2,3,1], left:[2,2,1,3] },
    },
    {
      size: 4,
      solution: [
        [1,2,3,4],
        [3,4,2,1],
        [4,3,1,2],
        [2,1,4,3],
      ],
      clues: { top:[3,2,2,1], right:[1,3,3,2], bottom:[2,3,1,2], left:[4,2,1,2] },
    },
  ],
  medium: [
    {
      size: 5,
      solution: [
        [1,2,4,3,5],
        [3,5,2,1,4],
        [5,4,1,2,3],
        [2,3,5,4,1],
        [4,1,3,5,2],
      ],
      clues: { top:[3,2,2,3,1], right:[1,2,3,3,2], bottom:[2,4,2,1,4], left:[4,2,1,3,2] },
    },
    {
      size: 5,
      solution: [
        [5,4,3,2,1],
        [4,3,2,1,5],
        [2,5,1,4,3],
        [1,2,5,3,4],
        [3,1,4,5,2],
      ],
      clues: { top:[1,2,2,3,2], right:[5,1,3,2,2], bottom:[3,3,2,1,3], left:[1,2,2,3,3] },
    },
  ],
  hard: [
    {
      size: 6,
      solution: [
        [2,1,4,3,5,6],
        [3,5,6,2,1,4],
        [4,6,3,5,2,1],
        [6,3,2,1,4,5],
        [1,4,5,6,3,2],
        [5,2,1,4,6,3],
      ],
      clues: { top:[4,3,2,3,2,1], right:[1,2,4,2,3,2], bottom:[2,3,3,2,1,3], left:[4,3,2,1,4,2] },
    },
    {
      size: 6,
      solution: [
        [3,2,6,1,4,5],
        [6,1,3,5,2,4],
        [1,5,2,4,6,3],
        [4,6,5,3,1,2],
        [2,3,4,6,5,1],
        [5,4,1,2,3,6],
      ],
      clues: { top:[2,3,1,3,2,2], right:[2,3,2,4,3,1], bottom:[2,2,4,2,3,1], left:[2,1,3,2,4,2] },
    },
  ],
};

function countVisible(line) {
  let max = 0, count = 0;
  for (const h of line) { if (h > max) { max = h; count++; } }
  return count;
}

function computeClues(solution, size) {
  const top = Array.from({length:size},(_,c)=>countVisible(solution.map(r=>r[c])));
  const bottom = Array.from({length:size},(_,c)=>countVisible([...solution.map(r=>r[c])].reverse()));
  const left = Array.from({length:size},(_,r)=>countVisible(solution[r]));
  const right = Array.from({length:size},(_,r)=>countVisible([...solution[r]].reverse()));
  return {top,right,bottom,left};
}

// A grid is a valid skyscraper solution if it's a Latin square (each row/col has
// every height 1..size exactly once) AND its visibility clues match the puzzle's.
// We don't require an exact cell-for-cell match to the stored solution because a
// given clue set is not guaranteed to have only one valid arrangement.
function isValidSolution(grid, size, clues) {
  for (let r = 0; r < size; r++) {
    const seen = new Set(grid[r]);
    if (seen.size !== size) return false;
  }
  for (let c = 0; c < size; c++) {
    const seen = new Set(grid.map(r=>r[c]));
    if (seen.size !== size) return false;
  }
  const computed = computeClues(grid, size);
  return ['top','right','bottom','left'].every(dir =>
    computed[dir].every((v,i) => v === clues[dir][i])
  );
}

export default function Skyscrapers() {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState(null);
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [puzzle, setPuzzle] = useState(null);
  const [grid, setGrid] = useState([]);
  const [selected, setSelected] = useState(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [won, setWon] = useState(false);
  const [msg, setMsg] = useState('');

  const startGame = useCallback((diff, idx=0) => {
    setDifficulty(diff);
    setPuzzleIdx(idx);
    const p = PUZZLES[diff][idx];
    setPuzzle(p);
    setGrid(Array.from({length:p.size},()=>Array(p.size).fill(0)));
    setSelected(null);
    setHintUsed(false);
    setWon(false);
    setMsg('');
  }, []);

  const handleCellClick = (r, c) => {
    if (won || !puzzle) return;
    setSelected([r, c]);
  };

  const handleInput = (val) => {
    if (!selected || won || !puzzle) return;
    const [r, c] = selected;
    const newGrid = grid.map(row=>[...row]);
    newGrid[r][c] = val;
    setGrid(newGrid);
    // Check win
    const allFilled = newGrid.flat().every(v=>v>0);
    if (allFilled) {
      if (isValidSolution(newGrid, puzzle.size, puzzle.clues)) {
        setWon(true);
        const score = puzzle.size*puzzle.size*15 - (hintUsed?40:0);
        setMsg(`Solved! Score: ${score}`);
        if (isLoggedIn()) apiRequest('POST',{game_type:'skyscrapers',result:'win',difficulty,score},'/game/save');
      } else {
        setMsg('Not quite right — check your clues!');
      }
    }
  };

  const handleHint = () => {
    if (hintUsed || !puzzle || won) return;
    setHintUsed(true);
    for (let r = 0; r < puzzle.size; r++) {
      for (let c = 0; c < puzzle.size; c++) {
        if (grid[r][c] !== puzzle.solution[r][c]) {
          const newGrid = grid.map(row=>[...row]);
          newGrid[r][c] = puzzle.solution[r][c];
          setGrid(newGrid);
          setSelected([r,c]);
          const allFilled = newGrid.flat().every(v=>v>0);
          if (allFilled && isValidSolution(newGrid, puzzle.size, puzzle.clues)) {
            setWon(true);
            const score = puzzle.size*puzzle.size*15 - 40;
            setMsg(`Solved! Score: ${score}`);
            if (isLoggedIn()) apiRequest('POST',{game_type:'skyscrapers',result:'win',difficulty,score},'/game/save');
          } else {
            setMsg('Hint: one cell revealed!');
          }
          return;
        }
      }
    }
  };

  const isWrong = (r, c) => grid[r][c] > 0 && grid[r][c] !== puzzle?.solution[r][c];

  // Fluid cell/clue size: caps at the original fixed px on desktop, shrinks
  // together on narrow phones (clue columns match cell width so edge numbers
  // stay aligned with the grid) without the board overflowing the viewport.
  const cellSize = puzzle && puzzle.size === 6 ? 'clamp(24px, 8vw, 52px)' : puzzle && puzzle.size === 5 ? 'clamp(26px, 9vw, 58px)' : 'clamp(28px, 11vw, 64px)';
  const clueSize = cellSize;

  if (!difficulty) {
    return (
      <div className="game-page">
        <div className="gs-container">
          <div className="game-header">
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
            <h1>Skyscrapers</h1>
          </div>
          <div className="gs-card" style={{textAlign:'center',padding:'2rem'}}>
            <p style={{color:'var(--muted)',marginBottom:'1rem'}}>Place buildings 1-N. Edge numbers show how many are visible from that direction.</p>
            <div className="difficulty-select">
              {['easy','medium','hard'].map(d => (
                <button key={d} className={`diff-btn diff-${d}`} onClick={() => startGame(d)}>
                  <span className="diff-label">{d.charAt(0).toUpperCase()+d.slice(1)}</span>
                  <span className="diff-sub">{d==='easy'?'4×4 grid':d==='medium'?'5×5 grid':'6×6 grid'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { size, clues } = puzzle;

  return (
    <div className="game-page">
      <div className="gs-container">
        <div className="game-header">
          <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
          <h1>Skyscrapers</h1>
          <span className={`diff-badge diff-${difficulty}`}>{difficulty}</span>
        </div>
        <HowToPlay>
          <p>Fill the grid with building heights 1 through N (N = the grid's size) so each row and column contains every height exactly once — and the number of buildings visible from each direction matches the clue outside the grid on that edge.</p>
          <ul>
            <li>A taller building blocks the view of any shorter building behind it, so a clue is the count of "visible" buildings — the number you'd actually see looking down that row/column from that edge, counting only buildings taller than every building before them.</li>
            <li>All four edges (top, bottom, left, right) have their own clues, and all of them must be satisfied at once.</li>
          </ul>
          <p>Click or tap a cell to select it, then click a number on the number pad below the grid to fill it in (✕ clears it). Cells that don't match the solution are highlighted red. Hint reveals one correct cell.</p>
        </HowToPlay>
        <div className="game-meta">
          {hintUsed && <span className="hint-used">Hint used</span>}
        </div>
        {msg && <div className={`game-msg ${won?'success':msg.includes('quite')?'fail':'info'}`}>{msg}</div>}

        <div style={{display:'flex',justifyContent:'center',margin:'1rem 0',overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
          <div>
            {/* Top clues */}
            <div style={{display:'flex',marginLeft:clueSize}}>
              {clues.top.map((v,c)=>(
                <div key={c} style={{width:cellSize,height:clueSize,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'bold',color:'var(--accent)',fontSize:'1.1rem'}}>
                  {v||''}
                </div>
              ))}
            </div>

            {/* Grid rows with left/right clues */}
            {Array.from({length:size},(_,r)=>(
              <div key={r} style={{display:'flex',alignItems:'center'}}>
                {/* Left clue */}
                <div style={{width:clueSize,height:cellSize,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'bold',color:'var(--accent)',fontSize:'1.1rem'}}>
                  {clues.left[r]||''}
                </div>
                {/* Cells */}
                {Array.from({length:size},(_,c)=>{
                  const isSel = selected&&selected[0]===r&&selected[1]===c;
                  const wrong = isWrong(r,c);
                  return (
                    <div key={c}
                      onClick={()=>handleCellClick(r,c)}
                      style={{
                        width:cellSize,height:cellSize,
                        border:`2px solid ${wrong?'var(--danger)':isSel?'var(--accent)':'var(--border)'}`,
                        backgroundColor: isSel?'#00aaff22':wrong?'#ff000022':'var(--surface)',
                        cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
                        fontSize:'clamp(0.85rem, 3vw, 1.3rem)',fontWeight:'bold',
                        color:wrong?'var(--danger)':'var(--text)',
                      }}>
                      {grid[r][c]>0?grid[r][c]:''}
                    </div>
                  );
                })}
                {/* Right clue */}
                <div style={{width:clueSize,height:cellSize,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'bold',color:'var(--accent)',fontSize:'1.1rem'}}>
                  {clues.right[r]||''}
                </div>
              </div>
            ))}

            {/* Bottom clues */}
            <div style={{display:'flex',marginLeft:clueSize}}>
              {clues.bottom.map((v,c)=>(
                <div key={c} style={{width:cellSize,height:clueSize,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'bold',color:'var(--accent)',fontSize:'1.1rem'}}>
                  {v||''}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Number pad */}
        <div style={{display:'flex',gap:'0.4rem',justifyContent:'center',flexWrap:'wrap',margin:'0.5rem 0'}}>
          {Array.from({length:size},(_,i)=>i+1).map(n=>(
            <button key={n} className="gs-btn gs-btn-primary" style={{width:44,height:44,padding:0}}
              onClick={()=>handleInput(n)}>{n}</button>
          ))}
          <button className="gs-btn gs-btn-outline" style={{width:44,height:44,padding:0}} onClick={()=>handleInput(0)}>✕</button>
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
