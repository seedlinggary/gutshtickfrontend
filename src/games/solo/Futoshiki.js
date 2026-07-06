import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiRequest from '../../ApiRequest';
import { isLoggedIn } from '../../auth';

// Puzzles: { size, givens: [[r,c,val],...], inequalities: [{from:[r,c], to:[r,c], type:'<'|'>'},...], solution: 2d array }
// All solutions are verified Latin squares (each row/col has 1..N exactly once).
// All givens and inequality constraints are verified against the solution.
const PUZZLES = {
  easy: [
    {
      // Solution: [[2,4,1,3],[3,1,4,2],[4,2,3,1],[1,3,2,4]]
      // Verified: rows and cols each contain 1-4 exactly once.
      size: 4,
      givens: [[0,0,2],[2,0,4],[3,3,4]],
      inequalities: [
        {from:[0,0],to:[0,1],type:'<'},  // 2<4
        {from:[0,2],to:[0,3],type:'<'},  // 1<3
        {from:[1,0],to:[1,1],type:'>'},  // 3>1
        {from:[2,1],to:[2,2],type:'<'},  // 2<3
        {from:[3,0],to:[3,1],type:'<'},  // 1<3
      ],
      solution: [
        [2,4,1,3],
        [3,1,4,2],
        [4,2,3,1],
        [1,3,2,4],
      ],
    },
    {
      // Solution: [[4,1,2,3],[1,4,3,2],[3,2,4,1],[2,3,1,4]]
      // Verified: rows and cols each contain 1-4 exactly once.
      size: 4,
      givens: [[0,3,3],[1,0,1],[3,1,3]],
      inequalities: [
        {from:[0,0],to:[0,1],type:'>'},  // 4>1
        {from:[1,2],to:[1,3],type:'>'},  // 3>2
        {from:[2,0],to:[2,1],type:'>'},  // 3>2
        {from:[3,2],to:[3,3],type:'<'},  // 1<4
        {from:[0,2],to:[1,2],type:'<'},  // 2<3 (vertical)
      ],
      solution: [
        [4,1,2,3],
        [1,4,3,2],
        [3,2,4,1],
        [2,3,1,4],
      ],
    },
  ],
  medium: [
    {
      // Solution: [[1,2,3,4,5],[3,4,5,1,2],[5,1,2,3,4],[2,3,4,5,1],[4,5,1,2,3]]
      // Verified: rows and cols each contain 1-5 exactly once.
      size: 5,
      givens: [[0,2,3],[1,4,2],[2,0,5],[3,3,5],[4,1,5]],
      inequalities: [
        {from:[0,0],to:[0,1],type:'<'},  // 1<2
        {from:[0,3],to:[0,4],type:'<'},  // 4<5
        {from:[1,0],to:[1,1],type:'<'},  // 3<4
        {from:[2,1],to:[2,2],type:'<'},  // 1<2
        {from:[3,1],to:[3,2],type:'<'},  // 3<4
        {from:[4,3],to:[4,4],type:'<'},  // 2<3
        {from:[0,0],to:[1,0],type:'<'},  // 1<3 (vertical)
        {from:[0,4],to:[1,4],type:'>'},  // 5>2 (vertical)
        {from:[2,4],to:[3,4],type:'>'},  // 4>1 (vertical)
      ],
      solution: [
        [1,2,3,4,5],
        [3,4,5,1,2],
        [5,1,2,3,4],
        [2,3,4,5,1],
        [4,5,1,2,3],
      ],
    },
    {
      // Solution: [[2,1,4,3,5],[5,4,1,2,3],[1,3,5,4,2],[4,2,3,5,1],[3,5,2,1,4]]
      // Verified: rows and cols each contain 1-5 exactly once.
      size: 5,
      givens: [[0,4,5],[1,2,1],[2,0,1],[3,4,1],[4,2,2]],
      inequalities: [
        {from:[0,0],to:[0,1],type:'>'},  // 2>1
        {from:[0,2],to:[0,3],type:'>'},  // 4>3
        {from:[1,0],to:[1,1],type:'>'},  // 5>4
        {from:[2,2],to:[2,1],type:'>'},  // 5>3
        {from:[3,0],to:[3,1],type:'>'},  // 4>2
        {from:[4,1],to:[4,2],type:'>'},  // 5>2
        {from:[0,4],to:[1,4],type:'>'},  // 5>3 (vertical)
        {from:[1,1],to:[2,1],type:'>'},  // 4>3 (vertical)
        {from:[3,3],to:[4,3],type:'>'},  // 5>1 (vertical)
      ],
      solution: [
        [2,1,4,3,5],
        [5,4,1,2,3],
        [1,3,5,4,2],
        [4,2,3,5,1],
        [3,5,2,1,4],
      ],
    },
  ],
  hard: [
    {
      // Solution: [[1,2,3,4,5,6],[2,1,4,3,6,5],[3,4,5,6,1,2],[4,3,6,5,2,1],[5,6,1,2,3,4],[6,5,2,1,4,3]]
      // Verified: rows and cols each contain 1-6 exactly once.
      size: 6,
      givens: [[0,2,3],[1,5,5],[2,3,6],[3,0,4],[4,4,3],[5,1,5]],
      inequalities: [
        {from:[0,0],to:[0,1],type:'<'},  // 1<2
        {from:[0,4],to:[0,5],type:'<'},  // 5<6
        {from:[1,2],to:[1,3],type:'>'},  // 4>3
        {from:[2,0],to:[2,1],type:'<'},  // 3<4
        {from:[2,5],to:[2,4],type:'>'},  // 2>1
        {from:[3,2],to:[3,3],type:'>'},  // 6>5
        {from:[4,0],to:[4,1],type:'<'},  // 5<6
        {from:[4,3],to:[4,2],type:'>'},  // 2>1
        {from:[5,0],to:[5,1],type:'>'},  // 6>5
        {from:[5,3],to:[5,4],type:'<'},  // 1<4
        {from:[0,5],to:[1,5],type:'>'},  // 6>5 (vertical)
        {from:[2,2],to:[3,2],type:'<'},  // 5<6 (vertical)
        {from:[3,3],to:[4,3],type:'>'},  // 5>2 (vertical)
      ],
      solution: [
        [1,2,3,4,5,6],
        [2,1,4,3,6,5],
        [3,4,5,6,1,2],
        [4,3,6,5,2,1],
        [5,6,1,2,3,4],
        [6,5,2,1,4,3],
      ],
    },
    {
      // Solution: [[2,4,6,1,3,5],[1,3,5,2,4,6],[4,6,2,5,1,3],[5,1,3,6,2,4],[6,2,4,3,5,1],[3,5,1,4,6,2]]
      // Verified: rows and cols each contain 1-6 exactly once.
      size: 6,
      givens: [[0,5,5],[1,0,1],[2,2,2],[3,1,1],[4,4,5],[5,3,4]],
      inequalities: [
        {from:[0,0],to:[0,1],type:'<'},  // 2<4
        {from:[0,2],to:[0,3],type:'>'},  // 6>1
        {from:[1,1],to:[1,2],type:'<'},  // 3<5
        {from:[1,3],to:[1,4],type:'<'},  // 2<4
        {from:[2,0],to:[2,1],type:'<'},  // 4<6
        {from:[2,5],to:[2,4],type:'>'},  // 3>1
        {from:[3,0],to:[3,1],type:'>'},  // 5>1
        {from:[3,2],to:[3,3],type:'<'},  // 3<6
        {from:[4,1],to:[4,2],type:'<'},  // 2<4
        {from:[4,4],to:[4,5],type:'>'},  // 5>1
        {from:[5,0],to:[5,1],type:'<'},  // 3<5
        {from:[5,3],to:[5,4],type:'<'},  // 4<6
        {from:[1,3],to:[0,3],type:'>'},  // 2>1 (vertical)
        {from:[2,0],to:[3,0],type:'<'},  // 4<5 (vertical)
        {from:[4,0],to:[5,0],type:'>'},  // 6>3 (vertical)
      ],
      solution: [
        [2,4,6,1,3,5],
        [1,3,5,2,4,6],
        [4,6,2,5,1,3],
        [5,1,3,6,2,4],
        [6,2,4,3,5,1],
        [3,5,1,4,6,2],
      ],
    },
  ],
};

export default function Futoshiki() {
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
    const g = Array.from({length:p.size},()=>Array(p.size).fill(0));
    p.givens.forEach(([r,c,v])=> { g[r][c]=v; });
    setGrid(g);
    setSelected(null);
    setHintUsed(false);
    setWon(false);
    setMsg('');
  }, []);

  const isGiven = (r,c) => puzzle && puzzle.givens.some(([gr,gc])=>gr===r&&gc===c);

  const getViolations = (g) => {
    if (!puzzle || !g.length) return new Set();
    const v = new Set();
    const size = puzzle.size;
    // Row/col uniqueness
    for (let r = 0; r < size; r++) {
      const seen = {};
      for (let c = 0; c < size; c++) {
        const val = g[r][c];
        if (val > 0) {
          if (seen[val] !== undefined) { v.add(`${r},${c}`); v.add(`${r},${seen[val]}`); }
          else seen[val] = c;
        }
      }
    }
    for (let c = 0; c < size; c++) {
      const seen = {};
      for (let r = 0; r < size; r++) {
        const val = g[r][c];
        if (val > 0) {
          if (seen[val] !== undefined) { v.add(`${r},${c}`); v.add(`${seen[val]},${c}`); }
          else seen[val] = r;
        }
      }
    }
    // Inequalities
    for (const ineq of puzzle.inequalities) {
      const [fr,fc] = ineq.from, [tr,tc] = ineq.to;
      const fv = g[fr][fc], tv = g[tr][tc];
      if (fv > 0 && tv > 0) {
        if (ineq.type === '<' && !(fv < tv)) { v.add(`${fr},${fc}`); v.add(`${tr},${tc}`); }
        if (ineq.type === '>' && !(fv > tv)) { v.add(`${fr},${fc}`); v.add(`${tr},${tc}`); }
      }
    }
    return v;
  };

  const handleInput = (val) => {
    if (!selected || won || !puzzle) return;
    const [r,c] = selected;
    if (isGiven(r,c)) return;
    const newGrid = grid.map(row=>[...row]);
    newGrid[r][c] = val;
    setGrid(newGrid);
    const violations = getViolations(newGrid);
    const allFilled = newGrid.flat().every(v=>v>0);
    if (allFilled && violations.size === 0) {
      setWon(true);
      const score = puzzle.size * puzzle.size * 20 - (hintUsed?50:0);
      setMsg(`Solved! Score: ${score}`);
      if (isLoggedIn()) apiRequest('POST',{game_type:'futoshiki',result:'win',difficulty,score},'/game/save');
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
          const violations = getViolations(newGrid);
          const allFilled = newGrid.flat().every(v=>v>0);
          if (allFilled && violations.size === 0) {
            setWon(true);
            const score = puzzle.size * puzzle.size * 20 - 50;
            setMsg(`Solved! Score: ${score}`);
            if (isLoggedIn()) apiRequest('POST',{game_type:'futoshiki',result:'win',difficulty,score},'/game/save');
          } else {
            setMsg('Hint: one cell revealed!');
          }
          return;
        }
      }
    }
  };

  const violations = puzzle ? getViolations(grid) : new Set();

  // Get inequality between two adjacent cells
  const getHorizIneq = (r, c) => puzzle?.inequalities.find(iq =>
    (iq.from[0]===r&&iq.from[1]===c&&iq.to[0]===r&&iq.to[1]===c+1) ||
    (iq.to[0]===r&&iq.to[1]===c&&iq.from[0]===r&&iq.from[1]===c+1)
  );
  const getVertIneq = (r, c) => puzzle?.inequalities.find(iq =>
    (iq.from[0]===r&&iq.from[1]===c&&iq.to[0]===r+1&&iq.to[1]===c) ||
    (iq.to[0]===r&&iq.to[1]===c&&iq.from[0]===r+1&&iq.from[1]===c)
  );
  const renderHorizIneq = (iq, r, c) => {
    if (!iq) return <div style={{width:gapSize,display:'inline-block'}}/>;
    let symbol;
    if (iq.from[0]===r&&iq.from[1]===c) symbol = iq.type === '<' ? '<' : '>';
    else symbol = iq.type === '<' ? '>' : '<';
    return <div style={{width:gapSize,textAlign:'center',fontWeight:'bold',fontSize:'1.1rem',color:'var(--accent)'}}>{symbol}</div>;
  };
  const renderVertIneq = (iq, r, c) => {
    if (!iq) return <div style={{height:16,width:'100%'}}/>;
    let symbol;
    if (iq.from[0]===r&&iq.from[1]===c) symbol = iq.type === '<' ? '∧' : '∨';
    else symbol = iq.type === '<' ? '∨' : '∧';
    return <div style={{height:16,textAlign:'center',fontWeight:'bold',fontSize:'1rem',color:'var(--accent)'}}>{symbol}</div>;
  };

  if (!difficulty) {
    return (
      <div className="game-page">
        <div className="gs-container">
          <div className="game-header">
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
            <h1>Futoshiki</h1>
          </div>
          <div className="gs-card" style={{textAlign:'center',padding:'2rem'}}>
            <p style={{color:'var(--muted)',marginBottom:'1.5rem'}}>Fill the grid with 1-N. Each row and column has each number once. Respect the inequality signs!</p>
            <div className="difficulty-select">
              {['easy','medium','hard'].map(d => (
                <button key={d} className={`diff-btn diff-${d}`} onClick={() => startGame(d)}>
                  <span className="diff-label">{d.charAt(0).toUpperCase()+d.slice(1)}</span>
                  <span className="diff-sub">{d==='easy'?'4×4, few inequalities':d==='medium'?'5×5, more inequalities':'6×6, dense inequalities'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const size = puzzle.size;
  // Fluid cell/gap sizes: cap out at the original fixed px values on desktop,
  // shrink together (so the "<"/">"/"∧"/"∨" markers stay aligned with the
  // columns) on narrow phones without ever overflowing the viewport.
  const cellSize = size === 6 ? 'clamp(24px, 9vw, 52px)' : size === 5 ? 'clamp(26px, 10vw, 58px)' : 'clamp(30px, 13vw, 64px)';
  const gapSize = size === 6 ? 'clamp(10px, 3vw, 20px)' : size === 5 ? 'clamp(10px, 4vw, 20px)' : 'clamp(10px, 5vw, 20px)';

  return (
    <div className="game-page">
      <div className="gs-container">
        <div className="game-header">
          <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
          <h1>Futoshiki</h1>
          <span className={`diff-badge diff-${difficulty}`}>{difficulty}</span>
        </div>
        <div className="game-meta">
          {violations.size > 0 && <span style={{color:'var(--danger)'}}>⚠ Violations detected</span>}
          {hintUsed && <span className="hint-used">Hint used</span>}
        </div>
        {msg && <div className={`game-msg ${won?'success':'info'}`}>{msg}</div>}

        <div style={{display:'flex',justifyContent:'center',margin:'1rem 0',overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
          <div>
            {Array.from({length:size},(_,r) => (
              <div key={r}>
                {/* Cell row */}
                <div style={{display:'flex',alignItems:'center'}}>
                  {Array.from({length:size},(_,c) => {
                    const isSelected = selected&&selected[0]===r&&selected[1]===c;
                    const isViolated = violations.has(`${r},${c}`);
                    const given = isGiven(r,c);
                    const horizIq = c < size-1 ? getHorizIneq(r,c) : null;
                    return (
                      <React.Fragment key={c}>
                        <div
                          onClick={()=>{if(!won)setSelected([r,c]);}}
                          style={{
                            width:cellSize,height:cellSize,
                            border:`2px solid ${isViolated?'var(--danger)':isSelected?'var(--accent)':'var(--border)'}`,
                            backgroundColor: given?'var(--border)':isSelected?'#00aaff22':'var(--surface)',
                            display:'flex',alignItems:'center',justifyContent:'center',
                            cursor:given?'default':'pointer',
                            fontSize:'clamp(0.9rem, 3.2vw, 1.4rem)',fontWeight:'bold',
                            color: isViolated?'var(--danger)':given?'var(--text)':'var(--accent)',
                          }}>
                          {grid[r][c]>0?grid[r][c]:''}
                        </div>
                        {c < size-1 && renderHorizIneq(horizIq,r,c)}
                      </React.Fragment>
                    );
                  })}
                </div>
                {/* Inequality row between grid rows */}
                {r < size-1 && (
                  <div style={{display:'flex',alignItems:'center'}}>
                    {Array.from({length:size},(_,c) => {
                      const vertIq = getVertIneq(r,c);
                      return (
                        <React.Fragment key={c}>
                          <div style={{width:cellSize}}>
                            {renderVertIneq(vertIq,r,c)}
                          </div>
                          {c < size-1 && <div style={{width:gapSize}}/>}
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Number pad */}
        <div style={{display:'flex',gap:'0.4rem',justifyContent:'center',flexWrap:'wrap',margin:'0.5rem 0'}}>
          {Array.from({length:size},(_,i)=>i+1).map(n=>(
            <button key={n} className="gs-btn gs-btn-primary" style={{width:44,height:44,padding:0}}
              onClick={()=>handleInput(n)}>{n}</button>
          ))}
          <button className="gs-btn gs-btn-outline" style={{width:44,height:44,padding:0}}
            onClick={()=>handleInput(0)}>✕</button>
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
