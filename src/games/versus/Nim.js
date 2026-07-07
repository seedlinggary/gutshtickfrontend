import React, { useState, useEffect } from 'react';
import HowToPlay from '../HowToPlay';

const CONFIGS = {
  easy:   [3, 4, 5],
  medium: [1, 3, 5, 7],
  hard:   [1, 3, 5, 7, 9],
};

// Perfect Nim strategy: XOR of all pile sizes
function nimXor(piles) {
  return piles.reduce((acc, p) => acc ^ p, 0);
}

function getBotMove(piles, difficulty) {
  if (difficulty === 'easy') {
    // Random valid move
    const nonEmpty = piles.map((p, i) => p > 0 ? i : null).filter(i => i !== null);
    if (!nonEmpty.length) return null;
    const row = nonEmpty[Math.floor(Math.random() * nonEmpty.length)];
    const count = Math.floor(Math.random() * piles[row]) + 1;
    return { row, count };
  }

  // Misère Nim optimal strategy
  const xor = nimXor(piles);
  const nonEmpty = piles.filter(p => p > 0);

  // Special case: only piles of size 0 or 1 remain — every legal move is
  // forced (take the whole pile), so the outcome is already determined.
  if (nonEmpty.every(p => p <= 1)) {
    const row = piles.findIndex(p => p === 1);
    return { row, count: 1 };
  }

  // Special case: exactly one pile has size >= 2. Normal-play's "zero the
  // xor" move would push the game straight into the all-piles-<=1 endgame,
  // but in misère play you must leave an ODD number of size-1 piles behind
  // (not the even count normal play would leave), or you hand the win away.
  const bigPiles = piles.filter(p => p >= 2);
  if (bigPiles.length === 1) {
    const row = piles.findIndex(p => p >= 2);
    const onesCount = piles.filter(p => p === 1).length;
    const leaveSize = onesCount % 2 === 0 ? 1 : 0; // leave odd ones overall
    return { row, count: piles[row] - leaveSize };
  }

  // If xor = 0, we're in losing position — make a filler move
  if (xor === 0) {
    const row = piles.findIndex(p => p > 0);
    return { row, count: 1 };
  }

  // Find a move to make xor = 0 (winning move — two-or-more big-pile case)
  for (let i = 0; i < piles.length; i++) {
    const target = piles[i] ^ xor;
    if (target < piles[i]) {
      return { row: i, count: piles[i] - target };
    }
  }

  // Fallback
  const row = piles.findIndex(p => p > 0);
  return row >= 0 ? { row, count: 1 } : null;
}

export default function Nim({ mode, difficulty, onBack }) {
  const [piles, setPiles] = useState(() => [...CONFIGS[difficulty || 'medium']]);
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [selected, setSelected] = useState({ row: -1, count: 0 });
  const [winner, setWinner] = useState(null);
  const [botThinking, setBotThinking] = useState(false);
  const [lastMove, setLastMove] = useState(null);

  const isBot = mode === 'vs_computer' && currentPlayer === 2;

  useEffect(() => {
    setPiles([...CONFIGS[difficulty || 'medium']]);
    setCurrentPlayer(1);
    setSelected({ row: -1, count: 0 });
    setWinner(null);
    setBotThinking(false);
    setLastMove(null);
  }, [difficulty]);

  // Bot turn
  useEffect(() => {
    if (!isBot || winner || botThinking) return;
    if (piles.every(p => p === 0)) return;
    setBotThinking(true);
    const t = setTimeout(() => {
      const move = getBotMove(piles, difficulty);
      if (move) {
        const np = [...piles];
        np[move.row] = Math.max(0, np[move.row] - move.count);
        setPiles(np);
        setLastMove(move);
        if (np.every(p => p === 0)) {
          // Misère: player who takes last loses
          setWinner(1); // opponent wins
        } else {
          setCurrentPlayer(1);
        }
      }
      setBotThinking(false);
    }, 600);
    return () => clearTimeout(t);
  }, [isBot, piles, difficulty, winner, botThinking]);

  function handleObjectClick(rowIdx, objIdx) {
    if (winner || botThinking) return;
    if (mode === 'vs_computer' && currentPlayer !== 1) return;

    // Can only click from one row at a time
    if (selected.row >= 0 && selected.row !== rowIdx) return;
    if (objIdx >= piles[rowIdx]) return;

    const newRow = rowIdx;
    // Toggle: clicking up to objIdx means taking (objIdx+1 - already taken) objects
    // Simpler: select row, click object to set count
    const newCount = objIdx + 1 - (selected.row === rowIdx ? 0 : 0);
    // Actually: select from the end. Clicking object at idx means take (pile-idx) pieces
    const takeCount = piles[rowIdx] - objIdx;
    setSelected({ row: rowIdx, count: takeCount });
  }

  function confirmMove() {
    if (selected.row < 0 || selected.count < 1) return;
    if (winner || botThinking) return;
    const np = [...piles];
    np[selected.row] = Math.max(0, np[selected.row] - selected.count);
    setPiles(np);
    setLastMove({ row: selected.row, count: selected.count });
    setSelected({ row: -1, count: 0 });

    if (np.every(p => p === 0)) {
      // Misère: current player took last piece → current player LOSES
      setWinner(currentPlayer === 1 ? 2 : 1);
    } else {
      setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
    }
  }

  function reset() {
    setPiles([...CONFIGS[difficulty || 'medium']]);
    setCurrentPlayer(1);
    setSelected({ row: -1, count: 0 });
    setWinner(null);
    setBotThinking(false);
    setLastMove(null);
  }

  const p1label = mode === 'local' ? 'Player 1' : 'You';
  const p2label = mode === 'local' ? 'Player 2' : 'Computer';
  // Whose turn is it to interact via the UI — in vs_computer mode only
  // player 1 is human; in local mode both players take turns on this device.
  const isHumanTurn = mode !== 'vs_computer' || currentPlayer === 1;

  return (
    <div className="game-page">
      <div className="game-header">
        <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={onBack}>Back</button>
        <h1 className="game-title">Nim</h1>
        <p className="game-subtitle">
          {mode === 'local' ? 'Pass & Play' : `vs Computer (${difficulty})`} — Misère variant
        </p>
      </div>

      <HowToPlay>
        <p>This is the <strong>misère</strong> variant of Nim: whoever is forced to take the <strong>last object loses</strong> — not wins.</p>
        <ul>
          <li>The board has several rows, each with a pile of objects (🪵).</li>
          <li>On your turn, tap an object in any one row to select how many to take: tapping an object selects it and everything after it to the end of that row.</li>
          <li>Confirm your selection to remove those objects, or cancel and pick a different amount.</li>
          <li>You must take at least 1 object, and only from a single row per turn — you can take as many as you like from that row, up to the whole pile.</li>
          <li>Whoever takes the very last remaining object loses the game.</li>
        </ul>
        <p><strong>vs Computer</strong> gives you an easy, medium, or hard bot (harder difficulties play the mathematically optimal misère strategy). <strong>Pass & Play</strong> lets two people take turns on this device.</p>
      </HowToPlay>

      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        {winner ? (
          <div className="game-msg success" style={{ marginBottom: 16 }}>
            {winner === 1 ? `${p1label} wins!` : `${p2label} wins!`}
          </div>
        ) : botThinking ? (
          <div className="game-msg info" style={{ marginBottom: 16 }}>Computer is thinking...</div>
        ) : (
          <div className="game-msg info" style={{ marginBottom: 16 }}>
            {currentPlayer === 1 ? `${p1label}'s turn` : `${p2label}'s turn`} — take 1+ objects from any single row.
            {selected.row >= 0 && ` (Taking ${selected.count} from row ${selected.row + 1})`}
          </div>
        )}

        {lastMove && !winner && (
          <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', marginBottom: 12 }}>
            Last move: took {lastMove.count} from row {lastMove.row + 1}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          {piles.map((pile, rowIdx) => (
            <div key={rowIdx} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 'clamp(44px, 15vw, 60px)', fontSize: 13, color: 'var(--muted)', fontWeight: 600, flexShrink: 0 }}>
                Row {rowIdx + 1}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
                {Array.from({ length: CONFIGS[difficulty || 'medium'][rowIdx] || pile + 5 }, (_, objIdx) => {
                  const exists = objIdx < pile;
                  const isSelectedRow = selected.row === rowIdx;
                  const wouldRemove = isSelectedRow && objIdx >= pile - selected.count;
                  return (
                    <div
                      key={objIdx}
                      onClick={() => exists && !winner && !botThinking && isHumanTurn && handleObjectClick(rowIdx, objIdx)}
                      style={{
                        width: 'clamp(28px, 8vw, 36px)',
                        height: 'clamp(28px, 8vw, 36px)',
                        borderRadius: 4,
                        background: exists
                          ? wouldRemove
                            ? 'var(--danger)'
                            : isSelectedRow
                              ? 'rgba(245,158,11,0.3)'
                              : 'var(--accent)'
                          : 'transparent',
                        border: exists ? '2px solid var(--accent-hover)' : '2px dashed transparent',
                        cursor: exists && !winner && !botThinking && isHumanTurn ? 'pointer' : 'default',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18,
                        transition: 'all 150ms',
                        transform: wouldRemove ? 'scale(0.9)' : 'scale(1)',
                      }}
                    >
                      {exists ? '🪵' : ''}
                    </div>
                  );
                })}
              </div>
              <div style={{ width: 30, fontSize: 13, color: 'var(--muted)', textAlign: 'right' }}>{pile}</div>
            </div>
          ))}
        </div>

        {!winner && !botThinking && isHumanTurn && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
            {selected.row >= 0 ? (
              <>
                <div style={{ fontSize: 13, color: 'var(--muted)', alignSelf: 'center' }}>
                  Click objects to adjust selection, then confirm:
                </div>
                <button className="gs-btn gs-btn-primary" onClick={confirmMove}>
                  Take {selected.count} from Row {selected.row + 1}
                </button>
                <button className="gs-btn gs-btn-outline" onClick={() => setSelected({ row: -1, count: 0 })}>
                  Cancel
                </button>
              </>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                Click an object to select how many to take from that row
              </div>
            )}
          </div>
        )}

        <div className="game-controls">
          <button className="gs-btn gs-btn-outline" onClick={reset}>New Game</button>
        </div>

        <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--bg)', borderRadius: 8, fontSize: 13, color: 'var(--muted)' }}>
          <strong>Rules:</strong> Take 1 or more objects from any single row. The player forced to take the <strong>last object loses</strong> (Misère).
        </div>
      </div>
    </div>
  );
}
