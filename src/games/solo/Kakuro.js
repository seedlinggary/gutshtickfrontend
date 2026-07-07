import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiRequest from '../../ApiRequest';
import { isLoggedIn } from '../../auth';
import HowToPlay from '../HowToPlay';

// Cell types: null = wall/black, {type:'clue',down:N,right:N} = clue cell, {type:'input',solution:N} = input cell
// Puzzles per difficulty (2 each)
// NOTE: original hand-authored clue numbers/layout were inconsistent with the
// stored solutions (wrong sums, orphaned runs with no clue, duplicate digits
// within a run). Regenerated below so every run's clue matches its solution
// sum exactly and every input cell has both a horizontal and vertical clue.
const PUZZLES = {
  easy: [
    {
      size: 6,
      grid: [
        [null, {type:'clue',down:3,right:0}, {type:'clue',down:7,right:0}, null, {type:'clue',down:0,right:0}, {type:'clue',down:4,right:0}],
        [{type:'clue',down:0,right:6}, {type:'input',solution:2}, {type:'input',solution:4}, null, {type:'clue',down:0,right:4}, {type:'input',solution:4}],
        [{type:'clue',down:0,right:4}, {type:'input',solution:1}, {type:'input',solution:3}, {type:'clue',down:5,right:0}, {type:'clue',down:4,right:0}, null],
        [null, null, {type:'clue',down:1,right:6}, {type:'input',solution:2}, {type:'input',solution:4}, null],
        [null, {type:'clue',down:0,right:4}, {type:'input',solution:1}, {type:'input',solution:3}, null, null],
        [null, null, null, null, null, null],
      ],
    },
    {
      size: 6,
      grid: [
        [null, {type:'clue',down:9,right:0}, {type:'clue',down:11,right:0}, null, {type:'clue',down:13,right:0}, {type:'clue',down:15,right:0}],
        [{type:'clue',down:0,right:11}, {type:'input',solution:5}, {type:'input',solution:6}, {type:'clue',down:0,right:15}, {type:'input',solution:7}, {type:'input',solution:8}],
        [{type:'clue',down:0,right:9}, {type:'input',solution:4}, {type:'input',solution:5}, {type:'clue',down:0,right:13}, {type:'input',solution:6}, {type:'input',solution:7}],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
      ],
    },
  ],
  medium: [
    {
      size: 8,
      grid: [
        [null, {type:'clue',down:3,right:0},{type:'clue',down:7,right:0},{type:'clue',down:9,right:0},null,{type:'clue',down:0,right:0},{type:'clue',down:6,right:0},{type:'clue',down:9,right:0}],
        [{type:'clue',down:0,right:11},{type:'input',solution:2},{type:'input',solution:4},{type:'input',solution:5},null,{type:'clue',down:0,right:15},{type:'input',solution:6},{type:'input',solution:9}],
        [{type:'clue',down:0,right:8},{type:'input',solution:1},{type:'input',solution:3},{type:'input',solution:4},{type:'clue',down:1,right:0},{type:'clue',down:2,right:0},null,null],
        [null,null,{type:'clue',down:7,right:0},{type:'clue',down:8,right:3},{type:'input',solution:1},{type:'input',solution:2},null,null],
        [null,{type:'clue',down:0,right:15},{type:'input',solution:7},{type:'input',solution:8},null,null,null,null],
        [null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null],
      ],
    },
    {
      size: 8,
      grid: [
        [null,{type:'clue',down:4,right:0},{type:'clue',down:14,right:0},null,null,{type:'clue',down:9,right:0},{type:'clue',down:14,right:0},null],
        [{type:'clue',down:0,right:11},{type:'input',solution:3},{type:'input',solution:8},null,{type:'clue',down:0,right:14},{type:'input',solution:5},{type:'input',solution:9},null],
        [{type:'clue',down:0,right:7},{type:'input',solution:1},{type:'input',solution:6},null,{type:'clue',down:0,right:9},{type:'input',solution:4},{type:'input',solution:5},null],
        [null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null],
      ],
    },
  ],
  hard: [
    {
      size: 10,
      grid: [
        [null,{type:'clue',down:11,right:0},{type:'clue',down:13,right:0},{type:'clue',down:11,right:0},{type:'clue',down:0,right:0},{type:'clue',down:11,right:0},null,{type:'clue',down:7,right:0},{type:'clue',down:8,right:0},null],
        [{type:'clue',down:0,right:21},{type:'input',solution:6},{type:'input',solution:7},{type:'input',solution:8},{type:'clue',down:0,right:9},{type:'input',solution:9},{type:'clue',down:0,right:15},{type:'input',solution:7},{type:'input',solution:8},null],
        [{type:'clue',down:0,right:14},{type:'input',solution:5},{type:'input',solution:6},{type:'input',solution:3},{type:'clue',down:0,right:2},{type:'input',solution:2},null,null,null,null],
        [null,null,null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null,null,null],
      ],
    },
    {
      size: 10,
      grid: [
        [null,null,{type:'clue',down:17,right:0},{type:'clue',down:15,right:0},null,null,{type:'clue',down:13,right:0},{type:'clue',down:11,right:0},null,null],
        [null,{type:'clue',down:0,right:17},{type:'input',solution:9},{type:'input',solution:8},null,{type:'clue',down:0,right:13},{type:'input',solution:7},{type:'input',solution:6},null,null],
        [null,{type:'clue',down:0,right:15},{type:'input',solution:8},{type:'input',solution:7},null,{type:'clue',down:0,right:11},{type:'input',solution:6},{type:'input',solution:5},null,null],
        [null,null,null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null,null,null],
      ],
    },
  ],
};

function initUserGrid(puzzleGrid) {
  return puzzleGrid.map(row => row.map(cell => {
    if (cell && cell.type === 'input') return { ...cell, value: 0 };
    return cell;
  }));
}

function checkWin(userGrid) {
  return userGrid.every(row => row.every(cell => {
    if (!cell || cell.type === 'clue') return true;
    return cell.value === cell.solution;
  }));
}

export default function Kakuro() {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState(null);
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [userGrid, setUserGrid] = useState(null);
  const [selected, setSelected] = useState(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [won, setWon] = useState(false);
  const [msg, setMsg] = useState('');

  const startGame = useCallback((diff, idx=0) => {
    setDifficulty(diff);
    setPuzzleIdx(idx);
    const puzzle = PUZZLES[diff][idx];
    setUserGrid(initUserGrid(puzzle.grid));
    setSelected(null);
    setHintUsed(false);
    setWon(false);
    setMsg('');
  }, []);

  const handleCellClick = (r, c) => {
    if (!userGrid || won) return;
    const cell = userGrid[r][c];
    if (!cell || cell.type !== 'input') return;
    setSelected([r, c]);
  };

  const handleInput = (digit) => {
    if (!selected || !userGrid || won) return;
    const [r, c] = selected;
    const newGrid = userGrid.map(row => row.map(cell => cell ? {...cell} : null));
    newGrid[r][c] = { ...newGrid[r][c], value: digit };
    setUserGrid(newGrid);
    if (checkWin(newGrid)) {
      setWon(true);
      setMsg('Puzzle solved! Great work!');
      if (isLoggedIn()) {
        apiRequest('POST', { game_type:'kakuro', result:'win', difficulty, score: 500 - (hintUsed?100:0) }, '/game/save');
      }
    }
  };

  const handleHint = () => {
    if (hintUsed || !userGrid || won) return;
    setHintUsed(true);
    for (let r = 0; r < userGrid.length; r++) {
      for (let c = 0; c < userGrid[r].length; c++) {
        const cell = userGrid[r][c];
        if (cell && cell.type === 'input' && cell.value !== cell.solution) {
          const newGrid = userGrid.map(row => row.map(c2 => c2 ? {...c2} : null));
          newGrid[r][c] = { ...newGrid[r][c], value: cell.solution };
          setUserGrid(newGrid);
          setSelected([r,c]);
          if (checkWin(newGrid)) {
            setWon(true);
            setMsg('Puzzle solved! Great work!');
            if (isLoggedIn()) {
              apiRequest('POST', { game_type:'kakuro', result:'win', difficulty, score: 500 - 100 }, '/game/save');
            }
          } else {
            setMsg('Hint: one cell revealed!');
          }
          return;
        }
      }
    }
  };

  if (!difficulty) {
    return (
      <div className="game-page">
        <div className="gs-container">
          <div className="game-header">
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
            <h1>Kakuro</h1>
          </div>
          <div className="gs-card" style={{textAlign:'center',padding:'2rem'}}>
            <p style={{color:'var(--muted)',marginBottom:'1.5rem'}}>Fill white cells with 1-9. Each run sums to its clue. No digit repeats in a run.</p>
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

  const puzzle = PUZZLES[difficulty][puzzleIdx];
  const size = puzzle.size;
  // Fluid cell size: caps at the original fixed 56px on desktop, shrinks on
  // narrow phones. The wrapper below already scrolls horizontally, so this
  // just minimizes how often that's actually needed on easy/medium boards;
  // the densest (10x10) board may still scroll a little on the smallest phones.
  const cellSize = size === 10 ? 'clamp(24px, 7vw, 56px)' : size === 8 ? 'clamp(26px, 8vw, 56px)' : 'clamp(28px, 11vw, 56px)';

  return (
    <div className="game-page">
      <div className="gs-container">
        <div className="game-header">
          <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
          <h1>Kakuro</h1>
          <span className={`diff-badge diff-${difficulty}`}>{difficulty}</span>
        </div>
        <HowToPlay>
          <p>Fill the white cells with digits 1-9 so that every "run" of connected white cells (a horizontal run or a vertical run) adds up to the clue number for that run, with no digit repeated within a single run.</p>
          <ul>
            <li>The small number in the top-right corner of a black cell is the sum clue for the run of white cells directly to its right.</li>
            <li>The small number in the bottom-left corner of a black cell is the sum clue for the run of white cells directly below it.</li>
            <li>A run ends at the next black cell or the edge of the grid.</li>
          </ul>
          <p>Click or tap a white cell to select it, then click a digit on the number pad below the grid to fill it in (✕ clears it). Cells that don't match the solution are highlighted red. Hint reveals one correct cell.</p>
        </HowToPlay>
        <div className="game-meta">
          {hintUsed && <span className="hint-used">Hint used</span>}
        </div>
        {msg && <div className={`game-msg ${won?'success':'info'}`}>{msg}</div>}

        <div style={{overflowX:'auto',margin:'1rem 0',WebkitOverflowScrolling:'touch'}}>
          <div style={{display:'inline-grid',gridTemplateColumns:`repeat(${size}, ${cellSize})`,gap:1,backgroundColor:'var(--border)'}}>
            {userGrid && userGrid.map((row,r) => row.map((cell,c) => {
              if (cell === null) {
                return <div key={`${r}-${c}`} style={{width:cellSize,height:cellSize,backgroundColor:'#222'}}/>;
              }
              if (cell.type === 'clue') {
                return (
                  <div key={`${r}-${c}`} style={{width:cellSize,height:cellSize,backgroundColor:'#333',position:'relative',overflow:'hidden'}}>
                    {cell.down > 0 && (
                      <span style={{position:'absolute',bottom:2,right:3,fontSize:'11px',color:'#fff',fontWeight:'bold'}}>{cell.down}</span>
                    )}
                    {cell.right > 0 && (
                      <span style={{position:'absolute',top:2,left:3,fontSize:'11px',color:'#fff',fontWeight:'bold'}}>{cell.right}</span>
                    )}
                    {cell.down > 0 && cell.right > 0 && (
                      <div style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',
                        background:'linear-gradient(to bottom right, transparent calc(50% - 1px), #555, transparent calc(50% + 1px))'}}/>
                    )}
                  </div>
                );
              }
              // input cell
              const isSelected = selected && selected[0]===r && selected[1]===c;
              const isWrong = cell.value > 0 && cell.value !== cell.solution;
              return (
                <div key={`${r}-${c}`}
                  onClick={() => handleCellClick(r,c)}
                  style={{
                    width:cellSize,height:cellSize,backgroundColor: isSelected?'var(--accent)':isWrong?'#ff000033':'var(--surface)',
                    cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
                    color: isWrong?'var(--danger)':'var(--text)',fontSize:'clamp(0.85rem, 3vw, 1.3rem)',fontWeight:'bold',
                  }}>
                  {cell.value > 0 ? cell.value : ''}
                </div>
              );
            }))}
          </div>
        </div>

        {/* Number pad */}
        <div style={{display:'flex',flexWrap:'wrap',gap:'0.4rem',justifyContent:'center',margin:'1rem 0'}}>
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button key={n} className="gs-btn gs-btn-primary" style={{width:44,height:44,padding:0}}
              onClick={() => handleInput(n)}>{n}</button>
          ))}
          <button className="gs-btn gs-btn-outline" style={{width:44,height:44,padding:0}}
            onClick={() => handleInput(0)}>✕</button>
        </div>

        <div className="game-controls">
          {!hintUsed && !won && <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={handleHint}>Hint</button>}
          {won ? (
            <>
              <button className="gs-btn gs-btn-primary" onClick={() => startGame(difficulty, puzzleIdx)}>Play Again</button>
              <button className="gs-btn gs-btn-outline" onClick={() => setDifficulty(null)}>Change Difficulty</button>
            </>
          ) : (
            PUZZLES[difficulty].length > 1 && (
              <button className="gs-btn gs-btn-outline gs-btn-sm"
                onClick={() => startGame(difficulty, (puzzleIdx+1)%PUZZLES[difficulty].length)}>
                Next Puzzle
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
