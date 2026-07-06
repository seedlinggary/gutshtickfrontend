import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiRequest from '../../ApiRequest';
import { isLoggedIn } from '../../auth';

const GOAL = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,0];

function shuffle(tiles, moves) {
  const arr = [...tiles];
  let blankIdx = arr.indexOf(0);
  for (let i = 0; i < moves; i++) {
    const row = Math.floor(blankIdx/4), col = blankIdx%4;
    const neighbors = [];
    if (row>0) neighbors.push(blankIdx-4);
    if (row<3) neighbors.push(blankIdx+4);
    if (col>0) neighbors.push(blankIdx-1);
    if (col<3) neighbors.push(blankIdx+1);
    const pick = neighbors[Math.floor(Math.random()*neighbors.length)];
    [arr[blankIdx], arr[pick]] = [arr[pick], arr[blankIdx]];
    blankIdx = pick;
  }
  return arr;
}

function getHintMove(tiles) {
  // Simple heuristic: move blank toward the correct arrangement
  // Just show the direction to move blank to resolve the first misplaced tile
  const blankIdx = tiles.indexOf(0);
  const bRow = Math.floor(blankIdx/4), bCol = blankIdx%4;
  // Find a tile that is misplaced and adjacent to blank
  const neighbors = [];
  if (bRow>0) neighbors.push({idx:blankIdx-4,dir:'↓'});
  if (bRow<3) neighbors.push({idx:blankIdx+4,dir:'↑'});
  if (bCol>0) neighbors.push({idx:blankIdx-1,dir:'→'});
  if (bCol<3) neighbors.push({idx:blankIdx+1,dir:'←'});
  // Prefer moving a tile that is out of place
  for (const {idx,dir} of neighbors) {
    const tile = tiles[idx];
    if (tile !== GOAL[idx]) return `Move tile ${tile} ${dir}`;
  }
  return `Blank is at row ${bRow+1}, col ${bCol+1}`;
}

const DIFF_MOVES = { easy: 20, medium: 40, hard: 60 };

export default function FifteenPuzzle() {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState(null);
  const [tiles, setTiles] = useState(GOAL);
  const [moveCount, setMoveCount] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [hintMsg, setHintMsg] = useState('');
  const [won, setWon] = useState(false);
  const [msg, setMsg] = useState('');

  const startGame = useCallback((diff) => {
    setDifficulty(diff);
    const shuffled = shuffle([...GOAL], DIFF_MOVES[diff]);
    setTiles(shuffled);
    setMoveCount(0);
    setHintUsed(false);
    setHintMsg('');
    setWon(false);
    setMsg('');
  }, []);

  const handleTileClick = (idx) => {
    if (won) return;
    const blankIdx = tiles.indexOf(0);
    const row = Math.floor(idx/4), col = idx%4;
    const bRow = Math.floor(blankIdx/4), bCol = blankIdx%4;
    if ((Math.abs(row-bRow)+Math.abs(col-bCol))!==1) return;
    const newTiles = [...tiles];
    [newTiles[idx], newTiles[blankIdx]] = [newTiles[blankIdx], newTiles[idx]];
    setTiles(newTiles);
    const newCount = moveCount+1;
    setMoveCount(newCount);
    if (newTiles.every((t,i)=>t===GOAL[i])) {
      setWon(true);
      const score = Math.max(0, 1000 - newCount*5 - (hintUsed?50:0));
      setMsg(`Solved in ${newCount} moves! Score: ${score}`);
      if (isLoggedIn()) apiRequest('POST',{game_type:'fifteen_puzzle',result:'win',difficulty,score},'/game/save');
    }
  };

  useEffect(()=>{
    const handleKey = (e) => {
      if (won || !tiles) return;
      const blankIdx = tiles.indexOf(0);
      const bRow = Math.floor(blankIdx/4), bCol = blankIdx%4;
      let tileIdx = -1;
      if (e.key==='ArrowUp'&&bRow<3) tileIdx=blankIdx+4;
      if (e.key==='ArrowDown'&&bRow>0) tileIdx=blankIdx-4;
      if (e.key==='ArrowLeft'&&bCol<3) tileIdx=blankIdx+1;
      if (e.key==='ArrowRight'&&bCol>0) tileIdx=blankIdx-1;
      if (tileIdx>=0) handleTileClick(tileIdx);
    };
    window.addEventListener('keydown',handleKey);
    return ()=>window.removeEventListener('keydown',handleKey);
  },[tiles,won,moveCount]);

  const handleHint = () => {
    if (hintUsed || won || !tiles) return;
    setHintUsed(true);
    setHintMsg(getHintMove(tiles));
    setTimeout(()=>setHintMsg(''),4000);
  };

  if (!difficulty) {
    return (
      <div className="game-page">
        <div className="gs-container">
          <div className="game-header">
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
            <h1>15 Puzzle</h1>
          </div>
          <div className="gs-card" style={{textAlign:'center',padding:'2rem'}}>
            <p style={{color:'var(--muted)',marginBottom:'1rem'}}>Slide tiles to restore the order 1-15. Use arrow keys or click tiles adjacent to the blank.</p>
            <div className="difficulty-select">
              {['easy','medium','hard'].map(d => (
                <button key={d} className={`diff-btn diff-${d}`} onClick={() => startGame(d)}>
                  <span className="diff-label">{d.charAt(0).toUpperCase()+d.slice(1)}</span>
                  <span className="diff-sub">{d==='easy'?'~20 moves scrambled':d==='medium'?'~40 moves scrambled':'~60 moves scrambled'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const blankIdx = tiles.indexOf(0);
  // Fluid tile size: fills up to 80px on desktop (unchanged), shrinks on
  // narrow phones so the 4x4 board never overflows the viewport, but never
  // drops below 44px (a comfortable tap target).
  const tileSize = 'clamp(44px, 16vw, 80px)';

  return (
    <div className="game-page">
      <div className="gs-container">
        <div className="game-header">
          <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
          <h1>15 Puzzle</h1>
          <span className={`diff-badge diff-${difficulty}`}>{difficulty}</span>
        </div>
        <div className="game-meta">
          <span>Moves: {moveCount}</span>
          {hintUsed && <span className="hint-used">Hint used</span>}
        </div>
        {msg && <div className={`game-msg ${won?'success':'info'}`}>{msg}</div>}
        {hintMsg && <div className="game-msg info">{hintMsg}</div>}

        <div style={{display:'flex',justifyContent:'center',margin:'1rem 0',overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
          <div style={{
            display:'grid',gridTemplateColumns:`repeat(4, ${tileSize})`,gridTemplateRows:`repeat(4, ${tileSize})`,
            gap:4, backgroundColor:'var(--border)', padding:4, borderRadius:'var(--radius)',
          }}>
            {tiles.map((tile, idx) => {
              const isBlank = tile === 0;
              const bRow = Math.floor(blankIdx/4), bCol = blankIdx%4;
              const row = Math.floor(idx/4), col = idx%4;
              const isAdjacent = (Math.abs(row-bRow)+Math.abs(col-bCol))===1;
              return (
                <div key={idx}
                  onClick={()=>handleTileClick(idx)}
                  style={{
                    width:tileSize,height:tileSize,
                    backgroundColor: isBlank?'transparent':tile===GOAL[idx]?'#00880033':'var(--surface)',
                    cursor: isBlank?'default':isAdjacent?'pointer':'default',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:'1.5rem',fontWeight:'bold',
                    borderRadius:'calc(var(--radius) - 2px)',
                    color:'var(--text)',
                    border: isAdjacent&&!isBlank?'2px solid var(--accent)':'2px solid transparent',
                    transition:'all 0.1s',
                  }}>
                  {isBlank?'':tile}
                </div>
              );
            })}
          </div>
        </div>

        <div className="game-controls">
          {!hintUsed && !won && <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={handleHint}>Hint</button>}
          {won ? (
            <>
              <button className="gs-btn gs-btn-primary" onClick={()=>startGame(difficulty)}>Play Again</button>
              <button className="gs-btn gs-btn-outline" onClick={()=>setDifficulty(null)}>Change Difficulty</button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
