import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiRequest from '../../ApiRequest';
import { isLoggedIn } from '../../auth';
import HowToPlay from '../HowToPlay';

const DIFFICULTY_CONFIG = {
  easy:   { n: 6 },
  medium: { n: 8 },
  hard:   { n: 10 },
};

function getAttacks(queens, n) {
  // returns set of attacked cells as "r,c"
  const attacked = new Set();
  for (const [qr, qc] of queens) {
    for (let c = 0; c < n; c++) if (c !== qc) attacked.add(`${qr},${c}`);
    for (let r = 0; r < n; r++) if (r !== qr) attacked.add(`${r},${qc}`);
    for (let d = -n; d < n; d++) {
      const r2 = qr+d, c2 = qc+d;
      if (r2>=0&&r2<n&&c2>=0&&c2<n&&!(r2===qr&&c2===qc)) attacked.add(`${r2},${c2}`);
    }
    for (let d = -n; d < n; d++) {
      const r2 = qr+d, c2 = qc-d;
      if (r2>=0&&r2<n&&c2>=0&&c2<n&&!(r2===qr&&c2===qc)) attacked.add(`${r2},${c2}`);
    }
  }
  return attacked;
}

function getConflicts(queens) {
  const conflicts = new Set();
  for (let i = 0; i < queens.length; i++) {
    for (let j = i+1; j < queens.length; j++) {
      const [r1,c1] = queens[i], [r2,c2] = queens[j];
      if (r1===r2 || c1===c2 || Math.abs(r1-r2)===Math.abs(c1-c2)) {
        conflicts.add(`${r1},${c1}`);
        conflicts.add(`${r2},${c2}`);
      }
    }
  }
  return conflicts;
}

// Find a valid hint position using backtracking
function findNextQueenHint(queens, n) {
  const rows = new Set(queens.map(([r])=>r));
  const cols = new Set(queens.map(([,c])=>c));
  const d1 = new Set(queens.map(([r,c])=>r-c));
  const d2 = new Set(queens.map(([r,c])=>r+c));

  for (let r = 0; r < n; r++) {
    if (rows.has(r)) continue;
    for (let c = 0; c < n; c++) {
      if (cols.has(c) || d1.has(r-c) || d2.has(r+c)) continue;
      if (!queens.some(([qr,qc])=>qr===r&&qc===c)) return [r,c];
    }
  }
  return null;
}

export default function NQueens() {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState(null);
  const [n, setN] = useState(8);
  const [queens, setQueens] = useState([]); // array of [r,c]
  const [hintUsed, setHintUsed] = useState(false);
  const [won, setWon] = useState(false);
  const [msg, setMsg] = useState('');

  const startGame = useCallback((diff) => {
    setDifficulty(diff);
    const size = DIFFICULTY_CONFIG[diff].n;
    setN(size);
    setQueens([]);
    setHintUsed(false);
    setWon(false);
    setMsg('');
  }, []);

  const handleCellClick = (r, c) => {
    if (won) return;
    const idx = queens.findIndex(([qr,qc])=>qr===r&&qc===c);
    let newQueens;
    if (idx >= 0) {
      newQueens = queens.filter((_,i)=>i!==idx);
    } else {
      newQueens = [...queens, [r,c]];
    }
    setQueens(newQueens);

    if (newQueens.length === n && getConflicts(newQueens).size === 0) {
      setWon(true);
      const score = n * 50 - (hintUsed ? 30 : 0);
      setMsg(`All ${n} queens placed! Score: ${score}`);
      if (isLoggedIn()) apiRequest('POST', { game_type:'n_queens', result:'win', difficulty, score }, '/game/save');
    } else {
      setMsg('');
    }
  };

  const handleHint = () => {
    if (hintUsed || won) return;
    // Remove conflicting queens first, then find a hint
    const hint = findNextQueenHint(queens, n);
    if (hint) {
      setHintUsed(true);
      const newQueens = [...queens, hint];
      setQueens(newQueens);
      if (newQueens.length === n && getConflicts(newQueens).size === 0) {
        setWon(true);
        const score = n * 50 - 30;
        setMsg(`All ${n} queens placed! Score: ${score}`);
        if (isLoggedIn()) apiRequest('POST', { game_type:'n_queens', result:'win', difficulty, score }, '/game/save');
      } else {
        setMsg(`Hint: queen placed at row ${hint[0]+1}, col ${hint[1]+1}`);
      }
    } else {
      setMsg('No safe position found — try removing some queens first.');
    }
  };

  const conflicts = getConflicts(queens);
  const cellSize = n === 10 ? 44 : n === 8 ? 52 : 60; // numeric, used for the font-size decision below
  // Fluid on-screen size: caps at the original fixed px on desktop, shrinks
  // on narrow phones. The wrapper below already scrolls horizontally as a
  // safety net for the densest (10x10) board on the smallest phones.
  const cellSizeCss = n === 10 ? 'clamp(24px, 7vw, 44px)' : n === 8 ? 'clamp(26px, 8vw, 52px)' : 'clamp(28px, 11vw, 60px)';

  if (!difficulty) {
    return (
      <div className="game-page">
        <div className="gs-container">
          <div className="game-header">
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
            <h1>N-Queens</h1>
          </div>
          <div className="gs-card" style={{textAlign:'center',padding:'2rem'}}>
            <p style={{color:'var(--muted)',marginBottom:'1.5rem'}}>Place N queens on the board so no two attack each other.</p>
            <div className="difficulty-select">
              {['easy','medium','hard'].map(d => (
                <button key={d} className={`diff-btn diff-${d}`} onClick={() => startGame(d)}>
                  <span className="diff-label">{d.charAt(0).toUpperCase()+d.slice(1)}</span>
                  <span className="diff-sub">{d==='easy'?'6×6, 6 queens':d==='medium'?'8×8, 8 queens':'10×10, 10 queens'}</span>
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
          <h1>N-Queens</h1>
          <span className={`diff-badge diff-${difficulty}`}>{difficulty}</span>
        </div>
        <HowToPlay>
          <p>Place N queens on the N×N board (N = the board's size) so that no two queens attack each other.</p>
          <ul>
            <li>Two queens attack each other if they share the same row, the same column, or the same diagonal (in either direction).</li>
            <li>You win once all N queens are placed on the board with zero attacking pairs among them.</li>
          </ul>
          <p>Click or tap an empty square to place a queen there, or tap an occupied square to remove that queen. Any queen involved in an attacking pair is highlighted red. Hint places one safe queen for you.</p>
        </HowToPlay>
        <div className="game-meta">
          <span>Queens placed: {queens.length} / {n}</span>
          {conflicts.size > 0 && <span style={{color:'var(--danger)',marginLeft:'1rem'}}>⚠ {conflicts.size/2} conflict(s)</span>}
          {hintUsed && <span className="hint-used">Hint used</span>}
        </div>
        {msg && <div className={`game-msg ${won?'success':conflicts.size>0?'fail':'info'}`}>{msg}</div>}

        <div style={{display:'flex',justifyContent:'center',margin:'1rem 0',overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
          <div style={{
            display:'grid',
            gridTemplateColumns:`repeat(${n}, ${cellSizeCss})`,
            gridTemplateRows:`repeat(${n}, ${cellSizeCss})`,
            border:'2px solid var(--text)',
          }}>
            {Array.from({length:n},(_,r)=>Array.from({length:n},(_,c)=>{
              const hasQueen = queens.some(([qr,qc])=>qr===r&&qc===c);
              const isConflict = hasQueen && conflicts.has(`${r},${c}`);
              const isLight = (r+c)%2===0;
              return (
                <div key={`${r}-${c}`}
                  onClick={()=>handleCellClick(r,c)}
                  style={{
                    width:cellSizeCss, height:cellSizeCss,
                    backgroundColor: isConflict ? '#ff000055' : isLight ? '#f0d9b5' : '#b58863',
                    cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize: cellSize <= 44 ? '1.5rem' : '2rem',
                    transition:'background-color 0.15s',
                  }}>
                  {hasQueen && <span style={{filter: isConflict ? 'hue-rotate(180deg) saturate(3)' : 'none'}}>♛</span>}
                </div>
              );
            }))}
          </div>
        </div>

        <div className="game-controls">
          {!hintUsed && !won && <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={handleHint}>Hint</button>}
          <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setQueens([])}>Clear Board</button>
          {won ? (
            <>
              <button className="gs-btn gs-btn-primary" onClick={() => startGame(difficulty)}>Play Again</button>
              <button className="gs-btn gs-btn-outline" onClick={() => setDifficulty(null)}>Change Difficulty</button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
