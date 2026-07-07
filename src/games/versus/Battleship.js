import React, { useState, useEffect } from 'react';
import HowToPlay from '../HowToPlay';

const GRID = 10;
const SHIPS = [
  { name: 'Carrier', size: 5 },
  { name: 'Battleship', size: 4 },
  { name: 'Cruiser', size: 3 },
  { name: 'Submarine', size: 3 },
  { name: 'Destroyer', size: 2 },
];

function emptyGrid() {
  return Array(GRID).fill(null).map(() => Array(GRID).fill(0));
}

function canPlace(grid, r, c, size, horiz) {
  for (let i = 0; i < size; i++) {
    const nr = r + (horiz ? 0 : i);
    const nc = c + (horiz ? i : 0);
    if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID) return false;
    if (grid[nr][nc]) return false;
  }
  return true;
}

function placeShip(grid, r, c, size, horiz, id) {
  const ng = grid.map(row => [...row]);
  for (let i = 0; i < size; i++) {
    const nr = r + (horiz ? 0 : i);
    const nc = c + (horiz ? i : 0);
    ng[nr][nc] = id;
  }
  return ng;
}

function randomPlacement() {
  let grid = emptyGrid();
  for (let s = 0; s < SHIPS.length; s++) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 200) {
      const horiz = Math.random() < 0.5;
      const r = Math.floor(Math.random() * GRID);
      const c = Math.floor(Math.random() * GRID);
      if (canPlace(grid, r, c, SHIPS[s].size, horiz)) {
        grid = placeShip(grid, r, c, SHIPS[s].size, horiz, s + 1);
        placed = true;
      }
      attempts++;
    }
  }
  return grid;
}

function allSunk(shipGrid, hitGrid) {
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (shipGrid[r][c] && !hitGrid[r][c]) return false;
    }
  }
  return true;
}

// Returns the name of a ship that was JUST sunk by the latest hit, or null.
function getNewlySunkShip(shipGrid, hitGrid, prevHitGrid) {
  // Find which ship IDs were fully hit before vs now
  for (let shipId = 1; shipId <= SHIPS.length; shipId++) {
    const cells = [];
    for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) {
      if (shipGrid[r][c] === shipId) cells.push([r, c]);
    }
    if (!cells.length) continue;
    const wasAlreadySunk = cells.every(([r, c]) => prevHitGrid[r][c]);
    const isNowSunk = cells.every(([r, c]) => hitGrid[r][c]);
    if (!wasAlreadySunk && isNowSunk) return SHIPS[shipId - 1].name;
  }
  return null;
}

// Bot AI modes
function getBotMoveRandom(hitGrid) {
  const available = [];
  for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) if (!hitGrid[r][c]) available.push([r, c]);
  if (!available.length) return null;
  return available[Math.floor(Math.random() * available.length)];
}

function getBotMoveHunt(hitGrid, shipGrid) {
  // Look for hits without sinking
  const hits = [];
  for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) {
    if (hitGrid[r][c] === 'hit') hits.push([r, c]);
  }
  if (hits.length > 0) {
    // Target adjacent cells
    const targets = [];
    for (const [hr, hc] of hits) {
      for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const nr = hr + dr, nc = hc + dc;
        if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID && !hitGrid[nr][nc]) {
          targets.push([nr, nc]);
        }
      }
    }
    if (targets.length) return targets[Math.floor(Math.random() * targets.length)];
  }
  return getBotMoveRandom(hitGrid);
}

function getBotMoveProbability(hitGrid, shipGrid) {
  // Probability density map
  const prob = Array(GRID).fill(null).map(() => Array(GRID).fill(0));
  const remaining = SHIPS.filter(s => {
    // Check if this ship type is fully sunk
    return true; // Simplified
  });

  for (const ship of SHIPS) {
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        // Horizontal
        if (canPlaceOnHit(hitGrid, r, c, ship.size, true)) {
          for (let i = 0; i < ship.size; i++) if (!hitGrid[r][c + i]) prob[r][c + i]++;
        }
        // Vertical
        if (canPlaceOnHit(hitGrid, r, c, ship.size, false)) {
          for (let i = 0; i < ship.size; i++) if (!hitGrid[r + i]?.[c]) prob[r + i][c]++;
        }
      }
    }
  }

  let maxProb = -1, best = null;
  for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) {
    if (!hitGrid[r][c] && prob[r][c] > maxProb) { maxProb = prob[r][c]; best = [r, c]; }
  }
  return best || getBotMoveRandom(hitGrid);
}

function canPlaceOnHit(hitGrid, r, c, size, horiz) {
  for (let i = 0; i < size; i++) {
    const nr = r + (horiz ? 0 : i);
    const nc = c + (horiz ? i : 0);
    if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID) return false;
    if (hitGrid[nr]?.[nc] === 'miss' || hitGrid[nr]?.[nc] === 'sunk') return false;
  }
  return true;
}

function getBotMove(hitGrid, shipGrid, difficulty) {
  if (difficulty === 'easy') return getBotMoveRandom(hitGrid);
  if (difficulty === 'medium') return getBotMoveHunt(hitGrid, shipGrid);
  return getBotMoveProbability(hitGrid, shipGrid);
}

export default function Battleship({ mode, difficulty, onBack }) {
  const [phase, setPhase] = useState('setup'); // 'setup' | 'battle' | 'done'
  const [p1Ships, setP1Ships] = useState(emptyGrid());
  const [p2Ships, setP2Ships] = useState(emptyGrid());
  const [p1Hits, setP1Hits] = useState(emptyGrid()); // what P1 has fired at P2
  const [p2Hits, setP2Hits] = useState(emptyGrid()); // what P2 has fired at P1
  const [currentTurn, setCurrentTurn] = useState(1);
  const [winner, setWinner] = useState(null);
  const [botThinking, setBotThinking] = useState(false);
  const [placingShipIdx, setPlacingShipIdx] = useState(0);
  const [isHoriz, setIsHoriz] = useState(true);
  const [previewCell, setPreviewCell] = useState(null);
  const [placedShips, setPlacedShips] = useState([]);
  const [viewMode, setViewMode] = useState('attack'); // 'attack' | 'defense'
  const [sunkMsg, setSunkMsg] = useState('');
  const [setupTurn, setSetupTurn] = useState(1); // which player is placing ships (local mode)

  const isBot = mode === 'vs_computer';

  // Key handler for rotation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'r' || e.key === 'R') setIsHoriz(h => !h);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Setup: place ships on the board of whichever player is currently placing
  function handleSetupClick(r, c) {
    if (phase !== 'setup') return;
    const ship = SHIPS[placingShipIdx];
    if (!ship) return;
    const targetGrid = setupTurn === 1 ? p1Ships : p2Ships;
    if (!canPlace(targetGrid, r, c, ship.size, isHoriz)) return;
    const ng = placeShip(targetGrid, r, c, ship.size, isHoriz, placingShipIdx + 1);
    if (setupTurn === 1) setP1Ships(ng); else setP2Ships(ng);
    setPlacedShips([...placedShips, { idx: placingShipIdx, r, c, horiz: isHoriz }]);
    const nextIdx = placingShipIdx + 1;
    if (nextIdx >= SHIPS.length) {
      if (isBot) {
        // Auto-place bot ships
        const botGrid = randomPlacement();
        setP2Ships(botGrid);
        setPhase('battle');
      } else if (setupTurn === 1) {
        // Local mode: hand off to Player 2 to place their fleet
        setSetupTurn(2);
        setPlacingShipIdx(0);
        setPlacedShips([]);
      } else {
        setPhase('battle');
      }
    } else {
      setPlacingShipIdx(nextIdx);
    }
  }

  function autoPlace() {
    const grid = randomPlacement();
    if (setupTurn === 1) setP1Ships(grid); else setP2Ships(grid);
    setPlacingShipIdx(SHIPS.length);
    if (isBot) {
      const botGrid = randomPlacement();
      setP2Ships(botGrid);
      setPhase('battle');
    } else if (setupTurn === 1) {
      setSetupTurn(2);
      setPlacingShipIdx(0);
      setPlacedShips([]);
    } else {
      setPhase('battle');
    }
  }

  // Battle: P1 fires at P2 grid
  function handleAttack(r, c) {
    if (phase !== 'battle' || winner || botThinking) return;
    if (currentTurn !== 1) return;
    if (p1Hits[r][c]) return; // already attacked

    const newHits = p1Hits.map(row => [...row]);
    const hit = p2Ships[r][c] !== 0;
    newHits[r][c] = hit ? 'hit' : 'miss';

    const sunkName = hit ? getNewlySunkShip(p2Ships, newHits, p1Hits) : null;
    setSunkMsg(sunkName ? `You sank their ${sunkName}!` : '');
    setP1Hits(newHits);

    if (allSunk(p2Ships, newHits)) {
      setWinner(1);
      setPhase('done');
      return;
    }
    setCurrentTurn(2);
    if (isBot) {
      // Bot fires
      setBotThinking(true);
      setTimeout(() => {
        const move = getBotMove(p2Hits, p1Ships, difficulty);
        if (move) {
          const [br, bc] = move;
          const newP2Hits = p2Hits.map(row => [...row]);
          const botHit = p1Ships[br][bc] !== 0;
          newP2Hits[br][bc] = botHit ? 'hit' : 'miss';
          const botSunkName = botHit ? getNewlySunkShip(p1Ships, newP2Hits, p2Hits) : null;
          if (botSunkName) setSunkMsg(`Computer sank your ${botSunkName}!`);
          setP2Hits(newP2Hits);
          if (allSunk(p1Ships, newP2Hits)) {
            setWinner(2);
            setPhase('done');
          } else {
            setCurrentTurn(1);
          }
        }
        setBotThinking(false);
      }, 700);
    }
  }

  // Local mode: P2 attacks P1
  function handleP2Attack(r, c) {
    if (phase !== 'battle' || winner || botThinking || isBot) return;
    if (currentTurn !== 2) return;
    if (p2Hits[r][c]) return;

    const newHits = p2Hits.map(row => [...row]);
    const hit = p1Ships[r][c] !== 0;
    newHits[r][c] = hit ? 'hit' : 'miss';
    const sunkName = hit ? getNewlySunkShip(p1Ships, newHits, p2Hits) : null;
    setSunkMsg(sunkName ? `Player 2 sank Player 1's ${sunkName}!` : '');
    setP2Hits(newHits);

    if (allSunk(p1Ships, newHits)) {
      setWinner(2);
      setPhase('done');
      return;
    }
    setCurrentTurn(1);
  }

  function reset() {
    setPhase('setup');
    setP1Ships(emptyGrid());
    setP2Ships(emptyGrid());
    setP1Hits(emptyGrid());
    setP2Hits(emptyGrid());
    setCurrentTurn(1);
    setWinner(null);
    setBotThinking(false);
    setPlacingShipIdx(0);
    setIsHoriz(true);
    setPreviewCell(null);
    setPlacedShips([]);
    setViewMode('attack');
    setSunkMsg('');
    setSetupTurn(1);
  }

  const p1label = mode === 'local' ? 'Player 1' : 'You';
  const p2label = mode === 'local' ? 'Player 2' : 'Computer';

  // Fluid cell sizing: shrinks on narrow phone screens, caps at 36px (unchanged
  // desktop size) once the viewport is wide enough to fit the 11-unit grid.
  const cellSize = 'clamp(22px, 7.8vw, 36px)';
  const headerFontSize = 'clamp(8px, 2.4vw, 11px)';
  const cellFontSize = 'clamp(10px, 3.2vw, 14px)';
  const letters = 'ABCDEFGHIJ';

  function renderGrid(label, shipGrid, hitGrid, onClick, showShips) {
    const currentShip = SHIPS[placingShipIdx];
    return (
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>{label}</div>
        <div style={{ display: 'flex' }}>
          <div style={{ width: cellSize, height: cellSize }} />
          {Array.from({ length: GRID }, (_, c) => (
            <div key={c} style={{ width: cellSize, height: cellSize, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: headerFontSize, color: 'var(--muted)', fontWeight: 700 }}>
              {c + 1}
            </div>
          ))}
        </div>
        {Array.from({ length: GRID }, (_, r) => (
          <div key={r} style={{ display: 'flex' }}>
            <div style={{ width: cellSize, height: cellSize, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: headerFontSize, color: 'var(--muted)', fontWeight: 700 }}>
              {letters[r]}
            </div>
            {Array.from({ length: GRID }, (_, c) => {
              let isPreview = false, previewValid = false;
              if (phase === 'setup' && showShips && previewCell && currentShip) {
                const [pr, pc] = previewCell;
                for (let i = 0; i < currentShip.size; i++) {
                  const nr = pr + (isHoriz ? 0 : i), nc = pc + (isHoriz ? i : 0);
                  if (nr === r && nc === c) { isPreview = true; previewValid = canPlace(shipGrid, pr, pc, currentShip.size, isHoriz); }
                }
              }
              const ship = shipGrid[r][c];
              const hit = hitGrid[r][c];
              let bg = '#e2e8f0';
              if (showShips && ship) bg = '#475569';
              if (isPreview) bg = previewValid ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)';
              if (hit === 'hit') bg = '#ef4444';
              if (hit === 'miss') bg = '#94a3b8';
              return (
                <div
                  key={c}
                  onClick={onClick ? () => onClick(r, c) : null}
                  onMouseEnter={() => setPreviewCell([r, c])}
                  onMouseLeave={() => setPreviewCell(null)}
                  style={{
                    width: cellSize, height: cellSize, background: bg,
                    border: '1px solid #cbd5e1', cursor: onClick ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: cellFontSize, fontWeight: 700, transition: 'background 100ms', borderRadius: 2,
                  }}
                >
                  {hit === 'hit' && '💥'}
                  {hit === 'miss' && '•'}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="game-page">
      <div className="game-header">
        <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={onBack}>Back</button>
        <h1 className="game-title">Battleship</h1>
        <p className="game-subtitle">{mode === 'local' ? 'Pass & Play' : `vs Computer (${difficulty})`}</p>
      </div>

      <HowToPlay>
        <p>Sink your opponent's entire fleet before they sink yours.</p>
        <p><strong>Phase 1 — Place your fleet:</strong></p>
        <ul>
          <li>Tap a cell on your board to place the currently-highlighted ship, starting from that cell.</li>
          <li>Tap the Rotate button (or press <strong>R</strong> on a keyboard) to switch a ship between horizontal and vertical before placing it.</li>
          <li>Or tap "Auto-Place All" to place your whole fleet randomly in one tap.</li>
          <li>Your fleet: Carrier (5 cells), Battleship (4), Cruiser (3), Submarine (3), Destroyer (2).</li>
          <li>In Pass & Play, each player places their fleet in turn — hide the screen from the other player before it's their turn to place.</li>
        </ul>
        <p><strong>Phase 2 — Battle:</strong></p>
        <ul>
          <li>Tap a cell on your opponent's grid to fire at it. A hit is marked 💥, a miss with a dot.</li>
          <li>You'll be told when you sink one of their ships. Sink every ship in their fleet to win.</li>
          <li>You can toggle between viewing your Attack Grid and your own Fleet at any time.</li>
        </ul>
        <p><strong>vs Computer</strong> gives you an easy, medium, or hard bot (harder difficulties hunt down ships more intelligently after landing a hit). <strong>Pass & Play</strong> lets two people take turns on this device, firing at each other's hidden fleets.</p>
      </HowToPlay>

      {phase === 'setup' && (
        <div>
          {mode === 'local' && setupTurn === 2 && (
            <div className="game-msg info" style={{ marginBottom: 12, fontWeight: 700 }}>
              Pass the device to {p2label} — hide {p1label}'s fleet!
            </div>
          )}
          <div className="game-msg info" style={{ marginBottom: 16 }}>
            {mode === 'local' && <strong>{setupTurn === 1 ? p1label : p2label}: </strong>}
            Placing: <strong>{SHIPS[placingShipIdx]?.name}</strong> ({SHIPS[placingShipIdx]?.size} cells) — Press <kbd style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 3, padding: '1px 5px' }}>R</kbd> to rotate
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 }}>
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setIsHoriz(h => !h)} style={{ minHeight: 40 }}>
              ⟲ Rotate ({isHoriz ? 'Horizontal' : 'Vertical'})
            </button>
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={autoPlace}>Auto-Place All</button>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            {SHIPS.map((s, i) => (
              <span key={i} style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: i < placingShipIdx ? 'var(--success)' : i === placingShipIdx ? 'var(--accent)' : 'var(--bg)', color: i < placingShipIdx ? 'white' : i === placingShipIdx ? '#78350f' : 'var(--muted)', fontWeight: 600 }}>
                {s.name}({s.size}) {i < placingShipIdx ? '✓' : ''}
              </span>
            ))}
          </div>
          <div style={{ overflowX: 'auto', display: 'flex', justifyContent: 'center' }}>
            {renderGrid(
              `${setupTurn === 1 ? p1label : p2label}'s Board`,
              setupTurn === 1 ? p1Ships : p2Ships,
              emptyGrid(),
              (r, c) => handleSetupClick(r, c),
              true
            )}
          </div>
        </div>
      )}

      {phase === 'battle' && (
        <div>
          {winner ? (
            <div className="game-msg success" style={{ marginBottom: 16 }}>
              {winner === 1 ? `${p1label} wins!` : `${p2label} wins!`} All ships sunk!
            </div>
          ) : (
            <div className="game-msg info" style={{ marginBottom: 16 }}>
              {botThinking ? 'Computer is firing...' : `${currentTurn === 1 ? p1label : p2label}'s turn — click opponent's grid`}
            </div>
          )}
          {sunkMsg && !winner && (
            <div className="game-msg success" style={{ marginBottom: 12, fontWeight: 700 }}>
              {sunkMsg}
            </div>
          )}

          {!isBot && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
              <button className={`gs-btn gs-btn-sm ${viewMode === 'attack' ? 'gs-btn-primary' : 'gs-btn-outline'}`} onClick={() => setViewMode('attack')}>Attack Grid</button>
              <button className={`gs-btn gs-btn-sm ${viewMode === 'defense' ? 'gs-btn-primary' : 'gs-btn-outline'}`} onClick={() => setViewMode('defense')}>My Fleet</button>
            </div>
          )}

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
            {/* P1 attacks P2 */}
            {(isBot || currentTurn === 1) && (
              <div style={{ overflowX: 'auto' }}>
                {renderGrid(
                  `${p2label}'s Waters (click to fire)`,
                  p2Ships,
                  p1Hits,
                  (!winner && currentTurn === 1 && !botThinking) ? (r, c) => handleAttack(r, c) : null,
                  false
                )}
              </div>
            )}

            {/* P2 attacks P1 (local mode) */}
            {!isBot && currentTurn === 2 && (
              <div style={{ overflowX: 'auto' }}>
                {renderGrid(
                  `${p1label}'s Waters (click to fire)`,
                  p1Ships,
                  p2Hits,
                  (!winner && currentTurn === 2) ? (r, c) => handleP2Attack(r, c) : null,
                  false
                )}
              </div>
            )}

            {/* Show own fleet */}
            {(isBot || (!isBot && viewMode === 'defense')) && (
              <div style={{ overflowX: 'auto', opacity: 0.8 }}>
                {renderGrid(
                  `${currentTurn === 1 ? p1label : p2label}'s Fleet`,
                  currentTurn === 1 ? p1Ships : p2Ships,
                  currentTurn === 1 ? p2Hits : p1Hits,
                  null,
                  true
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <div className="game-msg success" style={{ marginBottom: 20, fontSize: 18 }}>
            {winner === 1 ? `${p1label} wins!` : `${p2label} wins!`}
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ overflowX: 'auto' }}>
              {renderGrid(`${p1label}'s Fleet`, p1Ships, p2Hits, null, true)}
            </div>
            <div style={{ overflowX: 'auto' }}>
              {renderGrid(`${p2label}'s Fleet`, p2Ships, p1Hits, null, true)}
            </div>
          </div>
        </div>
      )}

      <div className="game-controls">
        <button className="gs-btn gs-btn-outline" onClick={reset}>New Game</button>
      </div>
    </div>
  );
}
