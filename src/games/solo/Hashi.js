import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiRequest from '../../ApiRequest';
import { isLoggedIn } from '../../auth';
import HowToPlay from '../HowToPlay';

// Puzzles: { size, islands: [{r,c,n},...], solution: [{r1,c1,r2,c2,count},...] }
// Each puzzle's bridge network is built first (connected, non-crossing), and island
// numbers are derived directly from that network, so `solution` is guaranteed valid
// and the puzzle is guaranteed solvable via that exact bridge configuration.
const PUZZLES = {
  easy: [
    {
      // 6x6, 8 islands, sum=24
      size: 6,
      islands: [
        {r:0,c:0,n:3},{r:0,c:3,n:1},{r:3,c:0,n:5},{r:3,c:3,n:3},{r:3,c:5,n:3},{r:5,c:0,n:2},{r:5,c:3,n:3},{r:5,c:5,n:4}
      ],
      solution: [
        {r1:3,c1:0,r2:5,c2:0,count:1},
        {r1:3,c1:0,r2:3,c2:3,count:2},
        {r1:5,c1:3,r2:5,c2:5,count:2},
        {r1:0,c1:0,r2:3,c2:0,count:2},
        {r1:5,c1:0,r2:5,c2:3,count:1},
        {r1:0,c1:0,r2:0,c2:3,count:1},
        {r1:3,c1:3,r2:3,c2:5,count:1},
        {r1:3,c1:5,r2:5,c2:5,count:2},
      ],
    },
    {
      // 6x6, 8 islands, sum=24
      size: 6,
      islands: [
        {r:0,c:0,n:3},{r:0,c:3,n:3},{r:0,c:5,n:3},{r:3,c:0,n:4},{r:3,c:3,n:3},{r:3,c:5,n:4},{r:5,c:0,n:2},{r:5,c:5,n:2}
      ],
      solution: [
        {r1:0,c1:5,r2:3,c2:5,count:2},
        {r1:0,c1:3,r2:3,c2:3,count:1},
        {r1:0,c1:3,r2:0,c2:5,count:1},
        {r1:5,c1:0,r2:5,c2:5,count:1},
        {r1:3,c1:0,r2:3,c2:3,count:1},
        {r1:0,c1:0,r2:3,c2:0,count:2},
        {r1:3,c1:0,r2:5,c2:0,count:1},
        {r1:3,c1:3,r2:3,c2:5,count:1},
        {r1:3,c1:5,r2:5,c2:5,count:1},
        {r1:0,c1:0,r2:0,c2:3,count:1},
      ],
    },
  ],
  medium: [
    {
      // 8x8, 11 islands, sum=30
      size: 8,
      islands: [
        {r:0,c:0,n:2},{r:0,c:2,n:3},{r:0,c:5,n:2},{r:0,c:7,n:3},{r:4,c:0,n:2},{r:4,c:2,n:3},{r:4,c:7,n:5},{r:7,c:0,n:3},{r:7,c:2,n:4},{r:7,c:5,n:2},{r:7,c:7,n:1}
      ],
      solution: [
        {r1:7,c1:0,r2:7,c2:2,count:2},
        {r1:4,c1:2,r2:4,c2:7,count:2},
        {r1:4,c1:7,r2:7,c2:7,count:1},
        {r1:4,c1:0,r2:7,c2:0,count:1},
        {r1:0,c1:0,r2:4,c2:0,count:1},
        {r1:7,c1:2,r2:7,c2:5,count:2},
        {r1:0,c1:2,r2:4,c2:2,count:1},
        {r1:0,c1:2,r2:0,c2:5,count:1},
        {r1:0,c1:0,r2:0,c2:2,count:1},
        {r1:0,c1:5,r2:0,c2:7,count:1},
        {r1:0,c1:7,r2:4,c2:7,count:2},
      ],
    },
    {
      // 8x8, 11 islands, sum=38
      size: 8,
      islands: [
        {r:0,c:0,n:3},{r:0,c:2,n:3},{r:0,c:5,n:3},{r:4,c:0,n:5},{r:4,c:2,n:4},{r:4,c:5,n:6},{r:4,c:7,n:4},{r:7,c:0,n:3},{r:7,c:2,n:2},{r:7,c:5,n:2},{r:7,c:7,n:3}
      ],
      solution: [
        {r1:0,c1:0,r2:4,c2:0,count:1},
        {r1:0,c1:2,r2:0,c2:5,count:1},
        {r1:0,c1:5,r2:4,c2:5,count:2},
        {r1:4,c1:7,r2:7,c2:7,count:2},
        {r1:4,c1:0,r2:7,c2:0,count:2},
        {r1:4,c1:0,r2:4,c2:2,count:2},
        {r1:7,c1:0,r2:7,c2:2,count:1},
        {r1:4,c1:2,r2:4,c2:5,count:1},
        {r1:4,c1:5,r2:7,c2:5,count:1},
        {r1:7,c1:5,r2:7,c2:7,count:1},
        {r1:4,c1:2,r2:7,c2:2,count:1},
        {r1:0,c1:0,r2:0,c2:2,count:2},
        {r1:4,c1:5,r2:4,c2:7,count:2},
      ],
    },
  ],
  hard: [
    {
      // 10x10, 14 islands, sum=48
      size: 10,
      islands: [
        {r:0,c:0,n:2},{r:0,c:3,n:3},{r:0,c:6,n:5},{r:0,c:9,n:3},{r:3,c:0,n:3},{r:3,c:3,n:4},{r:3,c:6,n:7},{r:3,c:9,n:4},{r:6,c:0,n:2},{r:6,c:3,n:2},{r:6,c:6,n:4},{r:9,c:0,n:1},{r:9,c:6,n:4},{r:9,c:9,n:4}
      ],
      solution: [
        {r1:3,c1:3,r2:3,c2:6,count:2},
        {r1:0,c1:3,r2:3,c2:3,count:1},
        {r1:0,c1:6,r2:0,c2:9,count:2},
        {r1:3,c1:6,r2:3,c2:9,count:1},
        {r1:6,c1:3,r2:6,c2:6,count:1},
        {r1:0,c1:0,r2:0,c2:3,count:1},
        {r1:3,c1:0,r2:3,c2:3,count:1},
        {r1:0,c1:9,r2:3,c2:9,count:1},
        {r1:3,c1:6,r2:6,c2:6,count:2},
        {r1:3,c1:0,r2:6,c2:0,count:1},
        {r1:9,c1:6,r2:9,c2:9,count:2},
        {r1:9,c1:0,r2:9,c2:6,count:1},
        {r1:6,c1:6,r2:9,c2:6,count:1},
        {r1:0,c1:0,r2:3,c2:0,count:1},
        {r1:6,c1:0,r2:6,c2:3,count:1},
        {r1:0,c1:3,r2:0,c2:6,count:1},
        {r1:3,c1:9,r2:9,c2:9,count:2},
        {r1:0,c1:6,r2:3,c2:6,count:2},
      ],
    },
    {
      // 10x10, 14 islands, sum=44
      size: 10,
      islands: [
        {r:0,c:3,n:2},{r:0,c:6,n:5},{r:0,c:9,n:3},{r:3,c:0,n:2},{r:3,c:3,n:3},{r:3,c:6,n:3},{r:3,c:9,n:1},{r:6,c:0,n:4},{r:6,c:3,n:4},{r:6,c:6,n:6},{r:6,c:9,n:2},{r:9,c:0,n:4},{r:9,c:6,n:4},{r:9,c:9,n:1}
      ],
      solution: [
        {r1:3,c1:6,r2:6,c2:6,count:1},
        {r1:9,c1:0,r2:9,c2:6,count:2},
        {r1:9,c1:6,r2:9,c2:9,count:1},
        {r1:0,c1:6,r2:0,c2:9,count:2},
        {r1:0,c1:9,r2:3,c2:9,count:1},
        {r1:6,c1:6,r2:6,c2:9,count:2},
        {r1:0,c1:3,r2:3,c2:3,count:1},
        {r1:0,c1:3,r2:0,c2:6,count:1},
        {r1:3,c1:0,r2:6,c2:0,count:1},
        {r1:3,c1:3,r2:6,c2:3,count:1},
        {r1:6,c1:0,r2:6,c2:3,count:1},
        {r1:0,c1:6,r2:3,c2:6,count:2},
        {r1:6,c1:0,r2:9,c2:0,count:2},
        {r1:6,c1:6,r2:9,c2:6,count:1},
        {r1:3,c1:0,r2:3,c2:3,count:1},
        {r1:6,c1:3,r2:6,c2:6,count:2},
      ],
    },
  ],
};

function bridgeKey(r1, c1, r2, c2) {
  if (r1 > r2 || (r1 === r2 && c1 > c2)) return `${r2},${c2},${r1},${c1}`;
  return `${r1},${c1},${r2},${c2}`;
}

function islandBridgeCount(r, c, bridges) {
  return bridges.reduce((sum, b) => {
    if ((b.r1 === r && b.c1 === c) || (b.r2 === r && b.c2 === c)) return sum + b.count;
    return sum;
  }, 0);
}

// Check if a new bridge from (r1,c1)-(r2,c2) crosses any existing bridge
function bridgeCrosses(r1, c1, r2, c2, existing) {
  const newHoriz = r1 === r2;
  for (const b of existing) {
    if (b.count === 0) continue;
    const bHoriz = b.r1 === b.r2;
    if (newHoriz === bHoriz) continue; // parallel: can't cross
    // One is horizontal, one is vertical
    let hr, hcMin, hcMax, vcMin, vcMax, vc, vr;
    if (newHoriz) {
      // new bridge is horizontal, existing is vertical
      hr = r1;
      hcMin = Math.min(c1, c2);
      hcMax = Math.max(c1, c2);
      vc = b.c1; // b.c1 === b.c2 since vertical
      vcMin = Math.min(b.r1, b.r2);
      vcMax = Math.max(b.r1, b.r2);
      vr = hr;
    } else {
      // new bridge is vertical, existing is horizontal
      vc = c1; // c1 === c2 since vertical
      vcMin = Math.min(r1, r2);
      vcMax = Math.max(r1, r2);
      hr = b.r1; // b.r1 === b.r2 since horizontal
      hcMin = Math.min(b.c1, b.c2);
      hcMax = Math.max(b.c1, b.c2);
      vr = hr;
    }
    // Cross if: vertical column is strictly inside horizontal span AND horizontal row is strictly inside vertical span
    if (vc > hcMin && vc < hcMax && hr > vcMin && hr < vcMax) return true;
  }
  return false;
}

// Check if a path is blocked by another island between two islands in same row/col
function pathBlocked(r1, c1, r2, c2, islands) {
  if (r1 === r2) {
    const minC = Math.min(c1, c2), maxC = Math.max(c1, c2);
    return islands.some(i => i.r === r1 && i.c > minC && i.c < maxC);
  } else {
    const minR = Math.min(r1, r2), maxR = Math.max(r1, r2);
    return islands.some(i => i.c === c1 && i.r > minR && i.r < maxR);
  }
}

// BFS connectivity check: all islands must be reachable from the first island via bridges
function isConnected(islands, bridges) {
  if (islands.length === 0) return true;
  const key = (r, c) => `${r},${c}`;
  // Build adjacency: which islands are connected by >=1 bridge
  const adj = {};
  islands.forEach(i => { adj[key(i.r, i.c)] = []; });
  for (const b of bridges) {
    if (b.count > 0) {
      adj[key(b.r1, b.c1)].push(key(b.r2, b.c2));
      adj[key(b.r2, b.c2)].push(key(b.r1, b.c1));
    }
  }
  const visited = new Set();
  const start = key(islands[0].r, islands[0].c);
  const queue = [start];
  visited.add(start);
  while (queue.length > 0) {
    const cur = queue.shift();
    for (const nb of adj[cur] || []) {
      if (!visited.has(nb)) {
        visited.add(nb);
        queue.push(nb);
      }
    }
  }
  return visited.size === islands.length;
}

function checkWin(islands, bridges) {
  // All islands must have exactly the right bridge count
  for (const isl of islands) {
    if (islandBridgeCount(isl.r, isl.c, bridges) !== isl.n) return false;
  }
  // All islands must form one connected group
  return isConnected(islands, bridges);
}

// Normalize bridge endpoints so r1<=r2 (and if r1==r2, c1<=c2)
function normalizeBridge(r1, c1, r2, c2) {
  if (r1 > r2 || (r1 === r2 && c1 > c2)) return { r1: r2, c1: c2, r2: r1, c2: c1 };
  return { r1, c1, r2, c2 };
}

export default function Hashi() {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState(null);
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [puzzle, setPuzzle] = useState(null);
  const [bridges, setBridges] = useState([]);
  const [firstIsland, setFirstIsland] = useState(null); // [r, c] or null
  const [hintUsed, setHintUsed] = useState(false);
  const [won, setWon] = useState(false);
  const [msg, setMsg] = useState('');

  const startGame = useCallback((diff, idx = 0) => {
    setDifficulty(diff);
    setPuzzleIdx(idx);
    setPuzzle(PUZZLES[diff][idx]);
    setBridges([]);
    setFirstIsland(null);
    setHintUsed(false);
    setWon(false);
    setMsg('');
  }, []);

  const handleIslandClick = (r, c) => {
    if (won) return;
    if (!firstIsland) {
      setFirstIsland([r, c]);
      setMsg(`Island at (${r + 1},${c + 1}) selected. Click another island in the same row or column.`);
      return;
    }
    const [fr, fc] = firstIsland;
    // Clicking same island deselects
    if (fr === r && fc === c) {
      setFirstIsland(null);
      setMsg('');
      return;
    }
    // Must be same row or same column
    if (fr !== r && fc !== c) {
      // Reselect the newly clicked island
      setFirstIsland([r, c]);
      setMsg(`Islands must share a row or column. Island at (${r + 1},${c + 1}) selected.`);
      return;
    }
    // Check for blocking islands in between
    if (pathBlocked(fr, fc, r, c, puzzle.islands)) {
      setMsg('Another island blocks that connection!');
      setFirstIsland(null);
      return;
    }
    // Check for crossing bridges
    if (bridgeCrosses(fr, fc, r, c, bridges)) {
      setMsg('A bridge already crosses that path!');
      setFirstIsland(null);
      return;
    }
    // Find or create bridge, cycling 0→1→2→0
    const norm = normalizeBridge(fr, fc, r, c);
    const key = bridgeKey(norm.r1, norm.c1, norm.r2, norm.c2);
    const existing = bridges.find(b => bridgeKey(b.r1, b.c1, b.r2, b.c2) === key);
    let newBridges;
    if (!existing) {
      // Add bridge with count 1
      newBridges = [...bridges, { ...norm, count: 1 }];
    } else if (existing.count === 1) {
      newBridges = bridges.map(b => bridgeKey(b.r1, b.c1, b.r2, b.c2) === key ? { ...b, count: 2 } : b);
    } else {
      // count was 2, remove it
      newBridges = bridges.filter(b => bridgeKey(b.r1, b.c1, b.r2, b.c2) !== key);
    }
    setBridges(newBridges);
    setFirstIsland(null);
    if (checkWin(puzzle.islands, newBridges)) {
      setWon(true);
      const score = puzzle.islands.length * 20 - (hintUsed ? 50 : 0);
      setMsg(`All islands connected! Score: ${score}`);
      if (isLoggedIn()) apiRequest('POST', { game_type: 'hashi', result: 'win', difficulty, score }, '/game/save');
    } else {
      setMsg('');
    }
  };

  const handleHint = () => {
    if (hintUsed || !puzzle || won) return;
    setHintUsed(true);
    // Find first solution bridge that is not yet fully placed
    for (const sb of puzzle.solution) {
      if (!sb || sb.count === 0) continue;
      const key = bridgeKey(sb.r1, sb.c1, sb.r2, sb.c2);
      const existing = bridges.find(b => bridgeKey(b.r1, b.c1, b.r2, b.c2) === key);
      const curCount = existing ? existing.count : 0;
      if (curCount < sb.count) {
        let newBridges;
        if (!existing) {
          newBridges = [...bridges, { r1: sb.r1, c1: sb.c1, r2: sb.r2, c2: sb.c2, count: 1 }];
        } else {
          newBridges = bridges.map(b => bridgeKey(b.r1, b.c1, b.r2, b.c2) === key ? { ...b, count: curCount + 1 } : b);
        }
        setBridges(newBridges);
        if (checkWin(puzzle.islands, newBridges)) {
          setWon(true);
          const score = puzzle.islands.length * 20 - 50;
          setMsg(`All islands connected! Score: ${score}`);
          if (isLoggedIn()) apiRequest('POST', { game_type: 'hashi', result: 'win', difficulty, score }, '/game/save');
        } else {
          setMsg('Hint: one bridge added from the solution!');
        }
        return;
      }
    }
    setMsg('Hint: puzzle is looking correct so far!');
  };

  if (!difficulty) {
    return (
      <div className="game-page">
        <div className="gs-container">
          <div className="game-header">
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
            <h1>Hashi (Bridges)</h1>
          </div>
          <div className="gs-card" style={{ textAlign: 'center', padding: '2rem' }}>
            <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>
              Connect islands with bridges. Each island needs exactly as many bridges as its number.
              Max 2 bridges between any pair. Bridges cannot cross. All islands must be connected.
            </p>
            <div className="difficulty-select">
              {['easy', 'medium', 'hard'].map(d => (
                <button key={d} className={`diff-btn diff-${d}`} onClick={() => startGame(d)}>
                  <span className="diff-label">{d.charAt(0).toUpperCase() + d.slice(1)}</span>
                  <span className="diff-sub">
                    {d === 'easy' ? '6×6, ~8 islands' : d === 'medium' ? '8×8, ~11 islands' : '10×10, ~14 islands'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const size = puzzle.size;
  const cellSize = size === 10 ? 44 : size === 8 ? 52 : 64;
  const totalSize = cellSize * size;

  const renderBridges = () => {
    return bridges.flatMap((b, i) => {
      const horiz = b.r1 === b.r2;
      const x1 = b.c1 * cellSize + cellSize / 2;
      const y1 = b.r1 * cellSize + cellSize / 2;
      const x2 = b.c2 * cellSize + cellSize / 2;
      const y2 = b.r2 * cellSize + cellSize / 2;
      const lines = [];
      if (b.count === 1) {
        lines.push(<line key={`${i}a`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--accent)" strokeWidth={3} />);
      } else if (b.count === 2) {
        // Offset the two lines perpendicular to the bridge direction
        const off = 4;
        if (horiz) {
          // horizontal bridge: offset vertically
          lines.push(<line key={`${i}a`} x1={x1} y1={y1 - off} x2={x2} y2={y2 - off} stroke="var(--accent)" strokeWidth={2.5} />);
          lines.push(<line key={`${i}b`} x1={x1} y1={y1 + off} x2={x2} y2={y2 + off} stroke="var(--accent)" strokeWidth={2.5} />);
        } else {
          // vertical bridge: offset horizontally
          lines.push(<line key={`${i}a`} x1={x1 - off} y1={y1} x2={x2 - off} y2={y2} stroke="var(--accent)" strokeWidth={2.5} />);
          lines.push(<line key={`${i}b`} x1={x1 + off} y1={y1} x2={x2 + off} y2={y2} stroke="var(--accent)" strokeWidth={2.5} />);
        }
      }
      return lines;
    });
  };

  return (
    <div className="game-page">
      <div className="gs-container">
        <div className="game-header">
          <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
          <h1>Hashi (Bridges)</h1>
          <span className={`diff-badge diff-${difficulty}`}>{difficulty}</span>
        </div>
        <HowToPlay>
          <p>Connect every numbered island with straight bridges so each island ends up with exactly as many bridges touching it as its number says, and every island is reachable from every other island through the bridge network.</p>
          <ul>
            <li>Bridges run only horizontally or vertically, directly between two islands with a clear straight line between them — no island or existing bridge blocking the path.</li>
            <li>You can build at most two bridges between the same pair of islands.</li>
            <li>Bridges can never cross each other.</li>
          </ul>
          <p>Click or tap an island, then click/tap another island in the same row or column to add a bridge between them. Clicking that same pair again adds a second, parallel bridge; a third click removes the bridge entirely. An island turns green once it has exactly the right number of bridges, red if it has too many.</p>
        </HowToPlay>
        <div className="game-meta">
          <span>Click an island, then click another (same row/col) to add a bridge. Click again to add second bridge, again to remove.</span>
          {firstIsland && (
            <span style={{ color: 'var(--accent)', marginLeft: '1rem' }}>
              Island selected at ({firstIsland[0] + 1},{firstIsland[1] + 1})
            </span>
          )}
          {hintUsed && <span className="hint-used" style={{ marginLeft: '1rem' }}>Hint used</span>}
        </div>
        {msg && <div className={`game-msg ${won ? 'success' : 'info'}`}>{msg}</div>}

        <div style={{ overflowX: 'auto', margin: '1rem 0' }}>
          <div style={{
            position: 'relative', width: totalSize, height: totalSize,
            backgroundColor: '#1a2a3a', flexShrink: 0,
          }}>
            <svg style={{
              position: 'absolute', top: 0, left: 0,
              width: totalSize, height: totalSize, pointerEvents: 'none',
            }}>
              {renderBridges()}
            </svg>
            {puzzle.islands.map((isl, i) => {
              const curCount = islandBridgeCount(isl.r, isl.c, bridges);
              const isSelected = firstIsland && firstIsland[0] === isl.r && firstIsland[1] === isl.c;
              const isSatisfied = curCount === isl.n;
              const isOver = curCount > isl.n;
              return (
                <div key={i}
                  onClick={() => handleIslandClick(isl.r, isl.c)}
                  style={{
                    position: 'absolute',
                    left: isl.c * cellSize + cellSize * 0.15,
                    top: isl.r * cellSize + cellSize * 0.15,
                    width: cellSize * 0.7, height: cellSize * 0.7,
                    borderRadius: '50%',
                    backgroundColor: isOver ? 'var(--danger)' : isSatisfied ? 'var(--success)' : isSelected ? 'var(--accent)' : 'var(--surface)',
                    border: `3px solid ${isSelected ? 'var(--accent)' : isOver ? 'var(--danger)' : isSatisfied ? 'var(--success)' : 'var(--muted)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 'bold', fontSize: cellSize <= 44 ? '0.8rem' : '1rem',
                    cursor: 'pointer',
                    color: isSatisfied || isOver || isSelected ? '#fff' : 'var(--text)',
                    zIndex: 2,
                    userSelect: 'none',
                  }}>
                  {isl.n}
                </div>
              );
            })}
          </div>
        </div>

        <div className="game-controls">
          {!hintUsed && !won && (
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={handleHint}>Hint</button>
          )}
          <button className="gs-btn gs-btn-outline gs-btn-sm"
            onClick={() => { setBridges([]); setFirstIsland(null); setMsg(''); }}>
            Clear
          </button>
          <button className="gs-btn gs-btn-outline gs-btn-sm"
            onClick={() => startGame(difficulty, (puzzleIdx + 1) % PUZZLES[difficulty].length)}>
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
