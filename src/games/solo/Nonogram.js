import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiRequest from '../../ApiRequest';
import { isLoggedIn } from '../../auth';

// Puzzles: solution is 2D array (1=filled, 0=empty)
const PUZZLES = {
  easy: [
    {
      size: 5,
      solution: [
        [1,1,1,1,1],
        [1,0,0,0,1],
        [1,0,1,0,1],
        [1,0,0,0,1],
        [1,1,1,1,1],
      ],
    },
    {
      size: 5,
      solution: [
        [0,1,1,1,0],
        [1,1,0,1,1],
        [1,0,0,0,1],
        [1,1,0,1,1],
        [0,1,1,1,0],
      ],
    },
  ],
  medium: [
    {
      size: 10,
      solution: [
        [0,0,1,1,1,1,1,1,0,0],
        [0,1,1,0,0,0,0,1,1,0],
        [1,1,0,0,0,0,0,0,1,1],
        [1,0,0,1,1,1,1,0,0,1],
        [1,0,1,1,0,0,1,1,0,1],
        [1,0,1,1,0,0,1,1,0,1],
        [1,0,0,1,1,1,1,0,0,1],
        [1,1,0,0,0,0,0,0,1,1],
        [0,1,1,0,0,0,0,1,1,0],
        [0,0,1,1,1,1,1,1,0,0],
      ],
    },
    {
      size: 10,
      solution: [
        [1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,1],
        [1,0,1,1,0,0,1,1,0,1],
        [1,0,1,1,0,0,1,1,0,1],
        [1,0,0,0,1,1,0,0,0,1],
        [1,0,0,0,1,1,0,0,0,1],
        [1,0,1,1,0,0,1,1,0,1],
        [1,0,1,1,0,0,1,1,0,1],
        [1,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1],
      ],
    },
  ],
  hard: [
    {
      size: 15,
      solution: [
        [0,0,0,0,1,1,1,1,1,1,1,0,0,0,0],
        [0,0,0,1,1,0,0,0,0,0,1,1,0,0,0],
        [0,0,1,1,0,0,0,0,0,0,0,1,1,0,0],
        [0,1,1,0,0,1,1,0,1,1,0,0,1,1,0],
        [1,1,0,0,1,1,0,0,0,1,1,0,0,1,1],
        [1,0,0,1,1,0,0,0,0,0,1,1,0,0,1],
        [1,0,1,1,0,0,1,0,1,0,0,1,1,0,1],
        [1,0,1,0,0,0,1,0,1,0,0,0,1,0,1],
        [1,0,1,1,0,0,1,0,1,0,0,1,1,0,1],
        [1,0,0,1,1,0,0,0,0,0,1,1,0,0,1],
        [1,1,0,0,1,1,0,0,0,1,1,0,0,1,1],
        [0,1,1,0,0,1,1,0,1,1,0,0,1,1,0],
        [0,0,1,1,0,0,0,0,0,0,0,1,1,0,0],
        [0,0,0,1,1,0,0,0,0,0,1,1,0,0,0],
        [0,0,0,0,1,1,1,1,1,1,1,0,0,0,0],
      ],
    },
    {
      size: 15,
      solution: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,1,1,1,0,0,1,0,0,1,1,1,0,1],
        [1,0,1,0,1,0,0,1,0,0,1,0,1,0,1],
        [1,0,1,1,1,0,0,1,0,0,1,1,1,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,1,0,1,0,0,0,1,0,1,0,0,1],
        [1,0,0,1,1,1,0,0,0,1,1,1,0,0,1],
        [1,0,0,1,0,1,0,0,0,1,0,1,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,1,1,1,0,0,1,0,0,1,1,1,0,1],
        [1,0,1,0,1,0,0,1,0,0,1,0,1,0,1],
        [1,0,1,1,1,0,0,1,0,0,1,1,1,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      ],
    },
  ],
};

function getClues(line) {
  const clues = [];
  let count = 0;
  for (const v of line) {
    if (v === 1) count++;
    else if (count > 0) { clues.push(count); count = 0; }
  }
  if (count > 0) clues.push(count);
  return clues.length ? clues : [0];
}

function getRowClues(solution) {
  return solution.map(row => getClues(row));
}

function getColClues(solution) {
  const size = solution[0].length;
  return Array.from({length:size}, (_,c) => getClues(solution.map(r=>r[c])));
}

function checkWin(board, solution) {
  return board.every((row,r) => row.every((cell,c) =>
    (cell === 'filled') === (solution[r][c] === 1)
  ));
}

// Touch drag support: touchmove doesn't retarget to the element under the
// finger (unlike mouseenter), so we look up the DOM node at the touch point
// and read its data-r/data-c attributes to find the cell being dragged over.
function getCellFromTouch(e) {
  const touch = e.touches && e.touches[0];
  if (!touch) return null;
  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  const cellEl = el && el.closest ? el.closest('[data-r]') : null;
  if (!cellEl) return null;
  const r = Number(cellEl.dataset.r);
  const c = Number(cellEl.dataset.c);
  if (Number.isNaN(r) || Number.isNaN(c)) return null;
  return { r, c };
}

export default function Nonogram() {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState(null);
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [puzzle, setPuzzle] = useState(null);
  const [board, setBoard] = useState(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [won, setWon] = useState(false);
  const [msg, setMsg] = useState('');
  const dragging = useRef(false);
  const dragMode = useRef('fill'); // 'fill' or 'cross'

  const rowClues = puzzle ? getRowClues(puzzle.solution) : [];
  const colClues = puzzle ? getColClues(puzzle.solution) : [];

  const startGame = useCallback((diff, idx=0) => {
    setDifficulty(diff);
    setPuzzleIdx(idx);
    const p = PUZZLES[diff][idx];
    setPuzzle(p);
    setBoard(Array.from({length:p.size},()=>Array(p.size).fill('empty')));
    setHintUsed(false);
    setWon(false);
    setMsg('');
  }, []);

  const cycleCell = (board, r, c, mode) => {
    const cell = board[r][c];
    if (mode === 'fill') return cell === 'filled' ? 'empty' : 'filled';
    return cell === 'crossed' ? 'empty' : 'crossed';
  };

  const handleCellInteract = (r, c, mode) => {
    if (won || !board) return;
    const newBoard = board.map(row=>[...row]);
    newBoard[r][c] = cycleCell(board, r, c, mode);
    setBoard(newBoard);
    if (checkWin(newBoard, puzzle.solution)) {
      setWon(true);
      const score = puzzle.size * puzzle.size * 10 - (hintUsed?50:0);
      setMsg(`Puzzle complete! Score: ${score}`);
      if (isLoggedIn()) apiRequest('POST', { game_type:'nonogram', result:'win', difficulty, score }, '/game/save');
    }
  };

  const handleMouseDown = (e, r, c) => {
    e.preventDefault();
    dragging.current = true;
    const mode = e.button === 2 ? 'cross' : 'fill';
    dragMode.current = mode;
    handleCellInteract(r, c, mode);
  };

  const handleMouseEnter = (r, c) => {
    if (!dragging.current) return;
    handleCellInteract(r, c, dragMode.current);
  };

  const handleMouseUp = () => { dragging.current = false; };

  // Touch equivalents: no right-tap gesture exists, so touch always paints in
  // 'fill' mode (the primary left-click behavior); drag-paint reuses the same
  // handleCellInteract/handleMouseEnter functions the mouse path uses.
  const handleBoardTouchStart = (e) => {
    const cell = getCellFromTouch(e);
    if (!cell) return;
    e.preventDefault();
    dragging.current = true;
    dragMode.current = 'fill';
    handleCellInteract(cell.r, cell.c, 'fill');
  };

  const handleBoardTouchMove = (e) => {
    const cell = getCellFromTouch(e);
    if (!cell) return;
    e.preventDefault();
    handleMouseEnter(cell.r, cell.c);
  };

  const handleHint = () => {
    if (hintUsed || !board || won) return;
    setHintUsed(true);
    for (let r = 0; r < puzzle.size; r++) {
      for (let c = 0; c < puzzle.size; c++) {
        if (board[r][c] === 'empty' && puzzle.solution[r][c] === 1) {
          const newBoard = board.map(row=>[...row]);
          newBoard[r][c] = 'filled';
          setBoard(newBoard);
          if (checkWin(newBoard, puzzle.solution)) {
            setWon(true);
            const score = puzzle.size * puzzle.size * 10 - 50;
            setMsg(`Puzzle complete! Score: ${score}`);
            if (isLoggedIn()) apiRequest('POST', { game_type:'nonogram', result:'win', difficulty, score }, '/game/save');
          } else {
            setMsg('Hint: one cell filled!');
          }
          return;
        }
      }
    }
  };

  // Check if a clue group is satisfied
  const isRowClueComplete = (r) => {
    if (!board) return false;
    const line = board[r].map(c => c === 'filled' ? 1 : 0);
    return JSON.stringify(getClues(line)) === JSON.stringify(rowClues[r]);
  };
  const isColClueComplete = (c) => {
    if (!board) return false;
    const line = board.map(row => row[c] === 'filled' ? 1 : 0);
    return JSON.stringify(getClues(line)) === JSON.stringify(colClues[c]);
  };

  const maxRowClues = rowClues.length ? Math.max(...rowClues.map(c=>c.length)) : 1;
  const maxColClues = colClues.length ? Math.max(...colClues.map(c=>c.length)) : 1;
  const cellSize = puzzle && puzzle.size === 15 ? 28 : puzzle && puzzle.size === 10 ? 36 : 44;
  const clueW = puzzle && puzzle.size === 15 ? 40 : puzzle && puzzle.size === 10 ? 52 : 64;
  const clueH = puzzle && puzzle.size === 15 ? 36 : puzzle && puzzle.size === 10 ? 44 : 52;

  if (!difficulty) {
    return (
      <div className="game-page">
        <div className="gs-container">
          <div className="game-header">
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
            <h1>Nonogram</h1>
          </div>
          <div className="gs-card" style={{textAlign:'center',padding:'2rem'}}>
            <p style={{color:'var(--muted)',marginBottom:'0.5rem'}}>Left-click to fill, right-click to cross out cells. Solve the picture puzzle!</p>
            <div className="difficulty-select">
              {['easy','medium','hard'].map(d => (
                <button key={d} className={`diff-btn diff-${d}`} onClick={() => startGame(d)}>
                  <span className="diff-label">{d.charAt(0).toUpperCase()+d.slice(1)}</span>
                  <span className="diff-sub">{d==='easy'?'5×5 grid':d==='medium'?'10×10 grid':'15×15 grid'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="game-page" onMouseUp={handleMouseUp} onContextMenu={e=>e.preventDefault()}
      onTouchEnd={handleMouseUp} onTouchCancel={handleMouseUp}>
      <div className="gs-container">
        <div className="game-header">
          <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
          <h1>Nonogram</h1>
          <span className={`diff-badge diff-${difficulty}`}>{difficulty}</span>
        </div>
        <div className="game-meta" style={{fontSize:'0.85rem',color:'var(--muted)'}}>
          Left-click: fill | Right-click: cross out
          {hintUsed && <span className="hint-used" style={{marginLeft:'1rem'}}>Hint used</span>}
        </div>
        {msg && <div className={`game-msg ${won?'success':'info'}`}>{msg}</div>}

        <div style={{overflowX:'auto',margin:'1rem 0',userSelect:'none'}}
          onTouchStart={handleBoardTouchStart}
          onTouchMove={handleBoardTouchMove}
          onTouchEnd={handleMouseUp}
          onTouchCancel={handleMouseUp}>
          <div style={{display:'inline-block'}}>
            {/* Column clues row */}
            <div style={{display:'flex', marginLeft: clueW * maxRowClues}}>
              {colClues.map((clue,c) => (
                <div key={c} style={{
                  width:cellSize, minHeight:clueH * maxColClues,
                  display:'flex', flexDirection:'column', justifyContent:'flex-end', alignItems:'center',
                  color: isColClueComplete(c) ? 'var(--success)' : 'var(--text)',
                  fontWeight: isColClueComplete(c) ? 'bold' : 'normal',
                  fontSize: cellSize <= 28 ? '10px' : '12px', paddingBottom:2,
                }}>
                  {clue.map((n,i)=><div key={i}>{n}</div>)}
                </div>
              ))}
            </div>

            {/* Grid rows with row clues */}
            {board && board.map((row, r) => (
              <div key={r} style={{display:'flex'}}>
                {/* Row clue */}
                <div style={{
                  width: clueW * maxRowClues, height:cellSize,
                  display:'flex', flexDirection:'row', justifyContent:'flex-end', alignItems:'center', gap:2,
                  color: isRowClueComplete(r) ? 'var(--success)' : 'var(--text)',
                  fontWeight: isRowClueComplete(r) ? 'bold' : 'normal',
                  fontSize: cellSize <= 28 ? '10px' : '12px', paddingRight:4,
                }}>
                  {rowClues[r].map((n,i)=><span key={i}>{n}</span>)}
                </div>
                {/* Cells */}
                {row.map((cell, c) => (
                  <div key={c}
                    data-r={r} data-c={c}
                    onMouseDown={e => handleMouseDown(e, r, c)}
                    onMouseEnter={() => handleMouseEnter(r, c)}
                    style={{
                      width:cellSize, height:cellSize,
                      border:'1px solid var(--border)',
                      borderRight: (c+1) % 5 === 0 ? '2px solid var(--text)' : '1px solid var(--border)',
                      borderBottom: (r+1) % 5 === 0 ? '2px solid var(--text)' : '1px solid var(--border)',
                      backgroundColor: cell === 'filled' ? 'var(--text)' : 'var(--surface)',
                      cursor:'pointer', position:'relative',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      touchAction: 'none',
                    }}>
                    {cell === 'crossed' && <span style={{color:'var(--danger)',fontSize: cellSize<=28?'10px':'14px',fontWeight:'bold'}}>×</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="game-controls">
          {!hintUsed && !won && <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={handleHint}>Hint</button>}
          <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => startGame(difficulty, (puzzleIdx+1)%PUZZLES[difficulty].length)}>
            Next Puzzle
          </button>
          {won ? (
            <>
              <button className="gs-btn gs-btn-primary" onClick={() => startGame(difficulty, puzzleIdx)}>Play Again</button>
              <button className="gs-btn gs-btn-outline" onClick={() => setDifficulty(null)}>Change Difficulty</button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
