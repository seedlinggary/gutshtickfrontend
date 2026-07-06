import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiRequest from '../../ApiRequest';
import { isLoggedIn } from '../../auth';

// Pre-made puzzles: { size, solution, cages: [{cells:[[r,c],...], op, target}] }
// All solutions verified: each row/col has each number 1..N exactly once.
// All cage targets verified against solution values.
const PUZZLES = {
  easy: [
    {
      size: 4,
      solution: [[1,2,3,4],[2,1,4,3],[3,4,1,2],[4,3,2,1]],
      cages: [
        { cells: [[0,0],[0,1]], op: '+', target: 3 },
        { cells: [[0,2],[0,3]], op: '+', target: 7 },
        { cells: [[1,0],[2,0]], op: '+', target: 5 },
        { cells: [[1,1],[1,2]], op: '+', target: 5 },
        { cells: [[1,3],[2,3]], op: '+', target: 5 },
        { cells: [[2,1],[2,2]], op: '×', target: 4 },
        { cells: [[3,0],[3,1]], op: '+', target: 7 },
        { cells: [[3,2],[3,3]], op: '+', target: 3 },
      ],
    },
    {
      size: 4,
      solution: [[2,3,4,1],[4,1,2,3],[1,4,3,2],[3,2,1,4]],
      cages: [
        { cells: [[0,0],[1,0]], op: '×', target: 8 },
        { cells: [[0,1],[0,2]], op: '+', target: 7 },
        { cells: [[0,3],[1,3]], op: '+', target: 4 },
        { cells: [[1,1],[1,2]], op: '+', target: 3 },
        { cells: [[2,0],[3,0]], op: '+', target: 4 },
        { cells: [[2,1],[2,2]], op: '×', target: 12 },
        { cells: [[2,3],[3,3]], op: '+', target: 6 },
        { cells: [[3,1],[3,2]], op: '+', target: 3 },
      ],
    },
    {
      size: 4,
      solution: [[3,1,4,2],[1,3,2,4],[4,2,1,3],[2,4,3,1]],
      cages: [
        { cells: [[0,0],[1,0]], op: '+', target: 4 },
        { cells: [[0,1],[0,2]], op: '×', target: 4 },
        { cells: [[0,3],[1,3]], op: '+', target: 6 },
        { cells: [[1,1],[2,1]], op: '+', target: 5 },
        { cells: [[1,2],[2,2]], op: '+', target: 3 },
        { cells: [[2,0],[3,0]], op: '+', target: 6 },
        { cells: [[2,3],[3,3]], op: '+', target: 4 },
        { cells: [[3,1],[3,2]], op: '×', target: 12 },
      ],
    },
  ],
  medium: [
    {
      size: 5,
      solution: [[1,2,3,4,5],[2,3,4,5,1],[3,4,5,1,2],[4,5,1,2,3],[5,1,2,3,4]],
      cages: [
        { cells: [[0,0],[1,0]], op: '+', target: 3 },
        { cells: [[0,1],[0,2]], op: '×', target: 6 },
        { cells: [[0,3],[0,4]], op: '+', target: 9 },
        { cells: [[1,1],[2,1]], op: '-', target: 1 },
        { cells: [[1,2],[1,3]], op: '+', target: 9 },
        { cells: [[1,4],[2,4]], op: '-', target: 1 },
        { cells: [[2,0],[3,0]], op: '+', target: 7 },
        { cells: [[2,2],[2,3]], op: '÷', target: 5 },
        { cells: [[3,1],[3,2]], op: '+', target: 6 },
        { cells: [[3,3],[4,3]], op: '+', target: 5 },
        { cells: [[3,4],[4,4]], op: '+', target: 7 },
        { cells: [[4,0],[4,1]], op: '+', target: 6 },
        { cells: [[4,2]], op: '+', target: 2 },
      ],
    },
    {
      size: 5,
      solution: [[5,4,3,2,1],[1,5,2,4,3],[4,2,1,3,5],[3,1,4,5,2],[2,3,5,1,4]],
      cages: [
        { cells: [[0,0],[0,1]], op: '-', target: 1 },
        { cells: [[0,2],[1,2]], op: '+', target: 5 },
        { cells: [[0,3],[0,4]], op: '-', target: 1 },
        { cells: [[1,0],[2,0]], op: '+', target: 5 },
        { cells: [[1,1],[2,1]], op: '×', target: 10 },
        { cells: [[1,3],[1,4]], op: '+', target: 7 },
        { cells: [[2,2],[3,2]], op: '+', target: 5 },
        { cells: [[2,3],[2,4]], op: '+', target: 8 },
        { cells: [[3,0],[4,0]], op: '+', target: 5 },
        { cells: [[3,1],[4,1]], op: '+', target: 4 },
        { cells: [[3,3],[3,4]], op: '×', target: 10 },
        { cells: [[4,2],[4,3]], op: '+', target: 6 },
        { cells: [[4,4]], op: '+', target: 4 },
      ],
    },
    {
      // solution verified: each row/col has 1-5 exactly once
      // row0=[1,2,4,3,5] row1=[4,5,1,2,3] row2=[2,3,5,4,1] row3=[5,4,3,1,2] row4=[3,1,2,5,4]
      // col0=[1,4,2,5,3] col1=[2,5,3,4,1] col2=[4,1,5,3,2] col3=[3,2,4,1,5] col4=[5,3,1,2,4]
      size: 5,
      solution: [[1,2,4,3,5],[4,5,1,2,3],[2,3,5,4,1],[5,4,3,1,2],[3,1,2,5,4]],
      cages: [
        { cells: [[0,0],[0,1]], op: '+', target: 3 },
        { cells: [[0,2],[1,2]], op: '×', target: 4 },
        { cells: [[0,3],[0,4]], op: '+', target: 8 },
        { cells: [[1,0],[2,0]], op: '+', target: 6 },
        { cells: [[1,1],[2,1]], op: '+', target: 8 },
        { cells: [[1,3],[1,4]], op: '+', target: 5 },
        { cells: [[2,2],[3,2]], op: '+', target: 8 },
        { cells: [[2,3],[2,4]], op: '+', target: 5 },
        { cells: [[3,0],[4,0]], op: '+', target: 8 },
        { cells: [[3,1],[4,1]], op: '+', target: 5 },
        { cells: [[3,3],[3,4]], op: '+', target: 3 },
        { cells: [[4,2],[4,3]], op: '+', target: 7 },
        { cells: [[4,4]], op: '+', target: 4 },
      ],
    },
  ],
  hard: [
    {
      // solution verified: each row/col has 1-6 exactly once
      // row0=[1,2,3,4,5,6] row1=[2,1,4,3,6,5] row2=[3,4,5,6,1,2] row3=[4,3,6,5,2,1] row4=[5,6,1,2,3,4] row5=[6,5,2,1,4,3]
      // col0=[1,2,3,4,5,6] col1=[2,1,4,3,6,5] col2=[3,4,5,6,1,2] col3=[4,3,6,5,2,1] col4=[5,6,1,2,3,4] col5=[6,5,2,1,4,3]
      size: 6,
      solution: [[1,2,3,4,5,6],[2,1,4,3,6,5],[3,4,5,6,1,2],[4,3,6,5,2,1],[5,6,1,2,3,4],[6,5,2,1,4,3]],
      cages: [
        { cells: [[0,0],[0,1]], op: '+', target: 3 },
        { cells: [[0,2],[0,3]], op: '+', target: 7 },
        { cells: [[0,4],[1,4]], op: '+', target: 11 },
        { cells: [[0,5],[1,5]], op: '-', target: 1 },
        { cells: [[1,0],[2,0]], op: '+', target: 5 },
        { cells: [[1,1],[2,1]], op: '+', target: 5 },
        { cells: [[1,2],[1,3]], op: '+', target: 7 },
        { cells: [[2,2],[3,2]], op: '+', target: 11 },
        { cells: [[2,3],[2,4]], op: '+', target: 7 },
        { cells: [[2,5],[3,5]], op: '+', target: 3 },
        { cells: [[3,0],[4,0]], op: '+', target: 9 },
        { cells: [[3,1],[4,1]], op: '+', target: 9 },
        { cells: [[3,3],[3,4]], op: '+', target: 7 },
        { cells: [[4,2],[5,2]], op: '+', target: 3 },
        { cells: [[4,3],[4,4]], op: '+', target: 5 },
        { cells: [[4,5],[5,5]], op: '+', target: 7 },
        { cells: [[5,0]], op: '+', target: 6 },
        { cells: [[5,1]], op: '+', target: 5 },
        { cells: [[5,3],[5,4]], op: '+', target: 5 },
      ],
    },
    {
      size: 6,
      solution: [[6,3,2,5,4,1],[4,5,1,6,2,3],[2,6,4,1,3,5],[1,4,6,3,5,2],[3,2,5,4,1,6],[5,1,3,2,6,4]],
      cages: [
        { cells: [[0,0],[1,0]], op: '+', target: 10 },
        { cells: [[0,1],[0,2]], op: '+', target: 5 },
        { cells: [[0,3],[1,3]], op: '+', target: 11 },
        { cells: [[0,4],[0,5]], op: '+', target: 5 },
        { cells: [[1,1],[2,1]], op: '+', target: 11 },
        { cells: [[1,2],[2,2]], op: '+', target: 5 },
        { cells: [[1,4],[1,5]], op: '+', target: 5 },
        { cells: [[2,0],[3,0]], op: '+', target: 3 },
        { cells: [[2,3],[2,4]], op: '+', target: 4 },
        { cells: [[2,5],[3,5]], op: '+', target: 7 },
        { cells: [[3,1],[4,1]], op: '+', target: 6 },
        { cells: [[3,2],[3,3]], op: '×', target: 18 },
        { cells: [[3,4],[4,4]], op: '+', target: 6 },
        { cells: [[4,0],[5,0]], op: '+', target: 8 },
        { cells: [[4,2],[4,3]], op: '+', target: 9 },
        { cells: [[4,5],[5,5]], op: '+', target: 10 },
        { cells: [[5,1],[5,2]], op: '+', target: 4 },
        { cells: [[5,3],[5,4]], op: '+', target: 8 },
      ],
    },
    {
      // new puzzle - verified solution: each row/col has 1-6 exactly once
      // row0=[1,2,3,4,5,6] row1=[3,1,4,2,6,5] row2=[5,4,1,6,2,3] row3=[2,6,5,3,4,1] row4=[6,3,2,5,1,4] row5=[4,5,6,1,3,2]
      // col0=[1,3,5,2,6,4] col1=[2,1,4,6,3,5] col2=[3,4,1,5,2,6] col3=[4,2,6,3,5,1] col4=[5,6,2,4,1,3] col5=[6,5,3,1,4,2]
      size: 6,
      solution: [[1,2,3,4,5,6],[3,1,4,2,6,5],[5,4,1,6,2,3],[2,6,5,3,4,1],[6,3,2,5,1,4],[4,5,6,1,3,2]],
      cages: [
        { cells: [[0,0],[0,1]], op: '+', target: 3 },
        { cells: [[0,2],[1,2]], op: '+', target: 7 },
        { cells: [[0,3],[0,4]], op: '+', target: 9 },
        { cells: [[0,5],[1,5]], op: '-', target: 1 },
        { cells: [[1,0],[2,0]], op: '+', target: 8 },
        { cells: [[1,1],[2,1]], op: '+', target: 5 },
        { cells: [[1,3],[1,4]], op: '+', target: 8 },
        { cells: [[2,2],[3,2]], op: '+', target: 6 },
        { cells: [[2,3],[2,4]], op: '+', target: 8 },
        { cells: [[2,5],[3,5]], op: '+', target: 4 },
        { cells: [[3,0],[4,0]], op: '+', target: 8 },
        { cells: [[3,1],[4,1]], op: '+', target: 9 },
        { cells: [[3,3],[3,4]], op: '+', target: 7 },
        { cells: [[4,2],[5,2]], op: '+', target: 8 },
        { cells: [[4,3],[4,4]], op: '+', target: 6 },
        { cells: [[4,5],[5,5]], op: '+', target: 6 },
        { cells: [[5,0]], op: '+', target: 4 },
        { cells: [[5,1]], op: '+', target: 5 },
        { cells: [[5,3],[5,4]], op: '+', target: 4 },
      ],
    },
  ],
};

const CAGE_COLORS = [
  '#ff000022','#00aa0022','#0000ff22','#ff880022','#aa00ff22',
  '#00aaff22','#ff005522','#aaff0022','#00ffaa22','#ff00aa22',
  '#888800aa','#008888aa','#880088aa','#884400aa','#004488aa',
  '#448800aa','#000088aa','#880000aa','#008800aa','#440088aa',
];

function checkCage(cage, grid) {
  const vals = cage.cells.map(([r,c]) => grid[r][c]).filter(v => v > 0);
  if (vals.length !== cage.cells.length) return false;
  if (cage.op === '+') return vals.reduce((a,b)=>a+b,0) === cage.target;
  if (cage.op === '×') return vals.reduce((a,b)=>a*b,1) === cage.target;
  if (cage.op === '-') { const [a,b] = vals; return Math.abs(a-b) === cage.target; }
  if (cage.op === '÷') { const [a,b] = vals; return (a/b === cage.target || b/a === cage.target); }
  return true;
}

function validateGrid(grid, size) {
  for (let r = 0; r < size; r++) {
    const row = grid[r].filter(v=>v>0);
    if (new Set(row).size !== row.length) return false;
  }
  for (let c = 0; c < size; c++) {
    const col = grid.map(r=>r[c]).filter(v=>v>0);
    if (new Set(col).size !== col.length) return false;
  }
  return true;
}

// Returns the set of "r,c" cells that currently violate a rule: a duplicate
// value in its row/column, or membership in a fully-filled cage whose cells
// don't satisfy the cage's arithmetic clue.
function getKenKenViolations(grid, puzzle) {
  const violations = new Set();
  const size = puzzle.size;
  for (let r = 0; r < size; r++) {
    const seen = {};
    for (let c = 0; c < size; c++) {
      const v = grid[r][c];
      if (v > 0) {
        if (seen[v] !== undefined) { violations.add(`${r},${c}`); violations.add(`${r},${seen[v]}`); }
        else seen[v] = c;
      }
    }
  }
  for (let c = 0; c < size; c++) {
    const seen = {};
    for (let r = 0; r < size; r++) {
      const v = grid[r][c];
      if (v > 0) {
        if (seen[v] !== undefined) { violations.add(`${r},${c}`); violations.add(`${seen[v]},${c}`); }
        else seen[v] = r;
      }
    }
  }
  puzzle.cages.forEach(cage => {
    const vals = cage.cells.map(([r,c]) => grid[r][c]);
    if (vals.every(v => v > 0) && !checkCage(cage, grid)) {
      cage.cells.forEach(([r,c]) => violations.add(`${r},${c}`));
    }
  });
  return violations;
}

export default function KenKen() {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState(null);
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [puzzle, setPuzzle] = useState(null);
  const [grid, setGrid] = useState([]);
  const [selected, setSelected] = useState(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [won, setWon] = useState(false);
  const [msg, setMsg] = useState('');

  const startGame = useCallback((diff) => {
    setDifficulty(diff);
    const idx = 0;
    setPuzzleIdx(idx);
    const p = PUZZLES[diff][idx];
    setPuzzle(p);
    setGrid(Array.from({length: p.size}, ()=>Array(p.size).fill(0)));
    setSelected(null);
    setHintUsed(false);
    setMistakes(0);
    setWon(false);
    setMsg('');
  }, []);

  const handleCellClick = (r, c) => {
    if (won) return;
    setSelected([r, c]);
  };

  const handleKeyInput = useCallback((val) => {
    if (!selected || won || !puzzle) return;
    const [r, c] = selected;
    const size = puzzle.size;
    if (val < 1 || val > size) return;
    const newGrid = grid.map(row => [...row]);
    newGrid[r][c] = val;
    // Rule-based check: a duplicate in the row/col, or a fully-filled cage
    // whose cells don't satisfy its clue, counts as a mistake.
    const violations = getKenKenViolations(newGrid, puzzle);
    if (violations.has(`${r},${c}`)) {
      setMistakes(m => m+1);
      setMsg('Wrong value! Try again.');
      setTimeout(() => setMsg(''), 2000);
    } else {
      setMsg('');
    }
    setGrid(newGrid);
    // check win
    const filled = newGrid.flat().every(v => v > 0);
    if (filled && violations.size === 0) {
      setWon(true);
      const score = Math.max(0, size*size*10 - (hintUsed?20:0) - mistakes*5);
      setMsg(`Solved! Score: ${score}`);
      if (isLoggedIn()) {
        apiRequest('POST', { game_type:'kenken', result:'win', difficulty, score }, '/game/save');
      }
    }
  }, [selected, won, puzzle, grid, hintUsed, mistakes, difficulty]);

  const handleHint = () => {
    if (hintUsed || !puzzle || won) return;
    setHintUsed(true);
    // find first empty or wrong cell
    for (let r = 0; r < puzzle.size; r++) {
      for (let c = 0; c < puzzle.size; c++) {
        if (grid[r][c] !== puzzle.solution[r][c]) {
          const newGrid = grid.map(row=>[...row]);
          newGrid[r][c] = puzzle.solution[r][c];
          setGrid(newGrid);
          setSelected([r,c]);
          const violations = getKenKenViolations(newGrid, puzzle);
          const filled = newGrid.flat().every(v => v > 0);
          if (filled && violations.size === 0) {
            setWon(true);
            const score = Math.max(0, puzzle.size*puzzle.size*10 - 20 - mistakes*5);
            setMsg(`Solved! Score: ${score}`);
            if (isLoggedIn()) {
              apiRequest('POST', { game_type:'kenken', result:'win', difficulty, score }, '/game/save');
            }
          } else {
            setMsg('Hint used! One cell revealed.');
          }
          return;
        }
      }
    }
  };

  const handleClear = () => {
    if (!selected || won || !puzzle) return;
    const [r, c] = selected;
    const newGrid = grid.map(row=>[...row]);
    newGrid[r][c] = 0;
    setGrid(newGrid);
  };

  // Build cage border map
  const getCageBorders = (r, c, cage) => {
    const inCage = (rr,cc) => cage.cells.some(([cr,cc2])=>cr===rr&&cc2===cc);
    return {
      top: !inCage(r-1,c),
      bottom: !inCage(r+1,c),
      left: !inCage(r,c-1),
      right: !inCage(r,c+1),
    };
  };

  const getCageForCell = (r, c) => puzzle?.cages.findIndex(cage => cage.cells.some(([cr,cc])=>cr===r&&cc===c));

  if (!difficulty) {
    return (
      <div className="game-page">
        <div className="gs-container">
          <div className="game-header">
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
            <h1>KenKen</h1>
          </div>
          <div className="gs-card" style={{textAlign:'center',padding:'2rem'}}>
            <p style={{color:'var(--muted)',marginBottom:'1.5rem'}}>Fill the grid with numbers so each row/column has no repeats, and each cage satisfies its arithmetic clue.</p>
            <div className="difficulty-select">
              {['easy','medium','hard'].map(d => (
                <button key={d} className={`diff-btn diff-${d}`} onClick={() => startGame(d)}>
                  <span className="diff-label">{d.charAt(0).toUpperCase()+d.slice(1)}</span>
                  <span className="diff-sub">{d==='easy'?'4×4, + and × only':d==='medium'?'5×5, all operations':'6×6, all operations'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!puzzle) return null;
  const size = puzzle.size;
  const violations = getKenKenViolations(grid, puzzle);
  // Fluid cell size: caps at the original fixed 52px on desktop, shrinks on
  // narrow phones so the grid never overflows the viewport, without dropping
  // below a comfortably tappable ~26-34px depending on grid density.
  const cellSize = size === 6 ? 'clamp(26px, 11vw, 52px)' : size === 5 ? 'clamp(30px, 13vw, 52px)' : 'clamp(34px, 16vw, 52px)';

  return (
    <div className="game-page">
      <div className="gs-container">
        <div className="game-header">
          <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
          <h1>KenKen</h1>
          <span className={`diff-badge diff-${difficulty}`}>{difficulty}</span>
        </div>
        <div className="game-meta">
          <span>Mistakes: {mistakes}</span>
          {hintUsed && <span className="hint-used">Hint used</span>}
        </div>
        {msg && <div className={`game-msg ${won?'success':msg.includes('Wrong')?'fail':'info'}`}>{msg}</div>}

        <div style={{display:'flex',gap:'1.5rem',flexWrap:'wrap',justifyContent:'center',margin:'1rem 0'}}>
          {/* Grid */}
          <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch',maxWidth:'100%'}}>
          <div style={{
            display:'grid',
            gridTemplateColumns:`repeat(${size}, ${cellSize})`,
            gridTemplateRows:`repeat(${size}, ${cellSize})`,
            gap:0,
            border:'3px solid var(--text)',
          }}>
            {Array.from({length:size},(_,r)=>Array.from({length:size},(_,c)=>{
              const cageIdx = getCageForCell(r,c);
              const cage = cageIdx>=0 ? puzzle.cages[cageIdx] : null;
              const borders = cage ? getCageBorders(r,c,cage) : {top:true,bottom:true,left:true,right:true};
              const isFirst = cage && cage.cells[0][0]===r && cage.cells[0][1]===c;
              const isSelected = selected && selected[0]===r && selected[1]===c;
              const isWrong = grid[r][c]>0 && violations.has(`${r},${c}`);
              return (
                <div key={`${r}-${c}`}
                  onClick={()=>handleCellClick(r,c)}
                  style={{
                    width:cellSize, height:cellSize, position:'relative', cursor:'pointer',
                    backgroundColor: isSelected ? 'var(--accent)' : isWrong ? '#ff000033' : (cageIdx>=0?CAGE_COLORS[cageIdx%CAGE_COLORS.length]:'var(--surface)'),
                    borderTop: borders.top ? '2px solid var(--text)' : '1px solid var(--border)',
                    borderBottom: borders.bottom ? '2px solid var(--text)' : '1px solid var(--border)',
                    borderLeft: borders.left ? '2px solid var(--text)' : '1px solid var(--border)',
                    borderRight: borders.right ? '2px solid var(--text)' : '1px solid var(--border)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                  {isFirst && cage && (
                    <span style={{position:'absolute',top:2,left:3,fontSize:'10px',fontWeight:'bold',color:'var(--text)'}}>
                      {cage.target}{cage.op}
                    </span>
                  )}
                  <span style={{fontSize:'clamp(0.85rem, 3vw, 1.3rem)',fontWeight:'bold',color:isWrong?'var(--danger)':'var(--text)'}}>
                    {grid[r][c]>0?grid[r][c]:''}
                  </span>
                </div>
              );
            }))}
          </div>
          </div>

          {/* Number pad */}
          <div style={{display:'flex',flexDirection:'column',gap:'0.5rem',justifyContent:'center'}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,44px)',gap:'0.3rem'}}>
              {Array.from({length:size},(_,i)=>i+1).map(n=>(
                <button key={n} className="gs-btn gs-btn-primary" style={{width:44,height:44,padding:0}}
                  onClick={()=>handleKeyInput(n)}>{n}</button>
              ))}
            </div>
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={handleClear} style={{marginTop:'0.5rem'}}>Clear</button>
          </div>
        </div>

        <div className="game-controls">
          {!hintUsed && !won && (
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={handleHint}>Hint</button>
          )}
          {won && (
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
