import React, { useState, useEffect, useCallback, useRef } from 'react';
import HowToPlay from '../HowToPlay';

const COLORS = ['red', 'blue', 'green', 'yellow'];
const COLOR_DISPLAY = { red: '#e74c3c', blue: '#3498db', green: '#27ae60', yellow: '#f1c40f', wild: '#8e44ad' };
const ACTIONS = ['Skip', 'Reverse', 'Draw Two'];

function createDeck() {
  const deck = [];
  for (const color of COLORS) {
    deck.push({ color, value: '0', type: 'number' });
    for (let n = 1; n <= 9; n++) {
      deck.push({ color, value: String(n), type: 'number' });
      deck.push({ color, value: String(n), type: 'number' });
    }
    for (const action of ACTIONS) {
      deck.push({ color, value: action, type: 'action' });
      deck.push({ color, value: action, type: 'action' });
    }
  }
  for (let i = 0; i < 4; i++) {
    deck.push({ color: 'wild', value: 'Wild', type: 'wild' });
    deck.push({ color: 'wild', value: 'Wild Draw Four', type: 'wild4' });
  }
  return deck;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cardId(card, idx) { return `${card.color}-${card.value}-${idx}`; }

function canPlay(card, topCard, currentColor) {
  if (card.type === 'wild' || card.type === 'wild4') return true;
  if (card.color === currentColor) return true;
  if (card.value === topCard.value) return true;
  return false;
}

function botPlay(hand, topCard, currentColor, difficulty) {
  const playable = hand.filter(c => canPlay(c, topCard, currentColor));
  if (playable.length === 0) return null;
  if (difficulty === 'easy') return playable[Math.floor(Math.random() * playable.length)];
  // medium/hard: prefer action cards
  const actions = playable.filter(c => c.type === 'action' || c.type === 'wild4');
  const wilds = playable.filter(c => c.type === 'wild' || c.type === 'wild4');
  if (difficulty === 'hard' && actions.length > 0) return actions[0];
  if (difficulty === 'medium' && actions.length > 0 && Math.random() > 0.4) return actions[0];
  return playable[Math.floor(Math.random() * playable.length)];
}

function botChooseColor(hand) {
  const counts = {};
  for (const c of COLORS) counts[c] = 0;
  hand.forEach(c => { if (COLORS.includes(c.color)) counts[c.color]++; });
  return COLORS.reduce((a, b) => counts[a] >= counts[b] ? a : b);
}

export default function UNO({ players, onBack }) {
  const [deck, setDeck] = useState([]);
  const [hands, setHands] = useState([]);
  const [discardPile, setDiscardPile] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [direction, setDirection] = useState(1); // 1 or -1
  const [currentColor, setCurrentColor] = useState('red');
  const [phase, setPhase] = useState('playing'); // playing, choosingColor, gameEnd
  const [winner, setWinner] = useState(null);
  const [showUno, setShowUno] = useState(null);
  const [pendingDraw, setPendingDraw] = useState(0);
  const [stackingEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const processingRef = useRef(false);
  const n = players.length;

  useEffect(() => {
    initGame();
  }, []); // eslint-disable-line

  function initGame() {
    let d = shuffle(createDeck());
    const newHands = [];
    for (let i = 0; i < n; i++) {
      newHands.push(d.slice(i * 7, (i + 1) * 7));
    }
    d = d.slice(n * 7);
    // find first non-wild card for discard
    let startIdx = d.findIndex(c => c.type === 'number');
    const startCard = d.splice(startIdx, 1)[0];
    setDeck(d);
    setHands(newHands);
    setDiscardPile([startCard]);
    setCurrentColor(startCard.color);
    setCurrentPlayer(0);
    setDirection(1);
    setWinner(null);
    setPhase('playing');
    setMessage('');
  }

  function nextPlayer(cur, dir, skip = false) {
    let next = (cur + dir + n) % n;
    if (skip) next = (next + dir + n) % n;
    return next;
  }

  function drawCards(playerIdx, count, fromDeck) {
    const drawn = fromDeck.slice(0, count);
    const remaining = fromDeck.slice(count);
    return { drawn, remaining };
  }

  const playCard = useCallback((card, playerIdx) => {
    if (processingRef.current) return;
    if (playerIdx !== currentPlayer) return;
    if (!canPlay(card, discardPile[discardPile.length - 1], currentColor)) return;

    const newHands = hands.map(h => [...h]);
    const cardIdx = newHands[playerIdx].findIndex(c => c.color === card.color && c.value === card.value);
    if (cardIdx === -1) return;
    newHands[playerIdx].splice(cardIdx, 1);

    const newDiscard = [...discardPile, card];
    setDiscardPile(newDiscard);
    setHands(newHands);

    // Check UNO
    if (newHands[playerIdx].length === 1) {
      setShowUno(playerIdx);
      setTimeout(() => setShowUno(null), 2000);
    }
    if (newHands[playerIdx].length === 0) {
      setWinner(playerIdx);
      setPhase('gameEnd');
      return;
    }

    let nextDir = direction;
    let nextP = currentPlayer;
    let newDeck = [...deck];
    let newColor = card.type === 'wild' || card.type === 'wild4' ? currentColor : card.color;

    if (card.type === 'wild' || card.type === 'wild4') {
      if (players[playerIdx].isBot) {
        newColor = botChooseColor(newHands[playerIdx]);
        setCurrentColor(newColor);
        if (card.type === 'wild4') {
          const victim = nextPlayer(currentPlayer, direction);
          if (newDeck.length < 4) {
            newDeck = shuffle(newDiscard.slice(0, -1)).concat(newDeck);
            setDiscardPile([card]);
          }
          const { drawn, remaining } = drawCards(victim, 4, newDeck);
          newHands[victim] = [...newHands[victim], ...drawn];
          newDeck = remaining;
          setDeck(newDeck);
          setHands(newHands);
          setMessage(`${players[playerIdx].name} played Wild Draw 4! ${players[victim].name} draws 4!`);
          nextP = nextPlayer(currentPlayer, direction, true);
        } else {
          nextP = nextPlayer(currentPlayer, direction);
        }
        setCurrentPlayer(nextP);
      } else {
        setPhase('choosingColor');
        return;
      }
    } else if (card.value === 'Skip') {
      nextP = nextPlayer(currentPlayer, direction, true);
      setMessage(`${players[nextPlayer(currentPlayer, direction)].name} is skipped!`);
      setCurrentPlayer(nextP);
      setCurrentColor(newColor);
    } else if (card.value === 'Reverse') {
      nextDir = direction * -1;
      if (n === 2) {
        nextP = nextPlayer(currentPlayer, nextDir, true);
      } else {
        nextP = nextPlayer(currentPlayer, nextDir);
      }
      setDirection(nextDir);
      setCurrentColor(newColor);
      setCurrentPlayer(nextP);
    } else if (card.value === 'Draw Two') {
      const victim = nextPlayer(currentPlayer, direction);
      if (newDeck.length < 2) {
        newDeck = shuffle(newDiscard.slice(0, -1)).concat(newDeck);
        setDiscardPile([card]);
      }
      const { drawn, remaining } = drawCards(victim, 2, newDeck);
      newHands[victim] = [...newHands[victim], ...drawn];
      newDeck = remaining;
      setDeck(newDeck);
      setHands(newHands);
      setMessage(`${players[victim].name} draws 2!`);
      nextP = nextPlayer(currentPlayer, direction, true);
      setCurrentPlayer(nextP);
      setCurrentColor(newColor);
    } else {
      nextP = nextPlayer(currentPlayer, direction);
      setCurrentColor(newColor);
      setCurrentPlayer(nextP);
    }
  }, [currentPlayer, direction, discardPile, hands, deck, currentColor, players, n]); // eslint-disable-line

  const chooseColor = useCallback((color) => {
    const card = discardPile[discardPile.length - 1];
    setCurrentColor(color);
    let nextP;
    let newHands = hands.map(h => [...h]);
    let newDeck = [...deck];
    if (card.type === 'wild4') {
      const victim = nextPlayer(currentPlayer, direction);
      if (newDeck.length < 4) {
        newDeck = shuffle(discardPile.slice(0, -1)).concat(newDeck);
        setDiscardPile([card]);
      }
      const { drawn, remaining } = drawCards(victim, 4, newDeck);
      newHands[victim] = [...newHands[victim], ...drawn];
      newDeck = remaining;
      setDeck(newDeck);
      setHands(newHands);
      nextP = nextPlayer(currentPlayer, direction, true);
    } else {
      nextP = nextPlayer(currentPlayer, direction);
    }
    setCurrentPlayer(nextP);
    setPhase('playing');
  }, [currentPlayer, direction, discardPile, hands, deck, n]); // eslint-disable-line

  const drawCard = useCallback(() => {
    if (processingRef.current) return;
    let newDeck = [...deck];
    if (newDeck.length === 0) {
      newDeck = shuffle(discardPile.slice(0, -1));
      setDiscardPile([discardPile[discardPile.length - 1]]);
    }
    const drawn = newDeck.shift();
    const newHands = hands.map(h => [...h]);
    newHands[currentPlayer] = [...newHands[currentPlayer], drawn];
    setDeck(newDeck);
    setHands(newHands);
    setCurrentPlayer(nextPlayer(currentPlayer, direction));
  }, [deck, discardPile, hands, currentPlayer, direction, n]); // eslint-disable-line

  // Bot turn
  useEffect(() => {
    if (phase !== 'playing') return;
    if (!players[currentPlayer]?.isBot) return;
    if (processingRef.current) return;
    const t = setTimeout(() => {
      const top = discardPile[discardPile.length - 1];
      const card = botPlay(hands[currentPlayer], top, currentColor, players[currentPlayer].botDifficulty);
      if (card) {
        playCard(card, currentPlayer);
      } else {
        drawCard();
      }
    }, 700);
    return () => clearTimeout(t);
  }, [phase, currentPlayer, discardPile, currentColor]); // eslint-disable-line

  if (phase === 'gameEnd') {
    return (
      <div style={s.container}>
        <h2 style={s.title}>UNO!</h2>
        <h3 style={{ color: '#f39c12' }}>{players[winner].name} wins!</h3>
        <button style={s.btn} onClick={initGame}>Play Again</button>
        <button style={{ ...s.btn, background: '#7f8c8d' }} onClick={onBack}>Back</button>
      </div>
    );
  }

  const top = discardPile[discardPile.length - 1];

  return (
    <div style={s.container}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack}>← Back</button>
        <h2 style={s.title}>UNO</h2>
        <div style={{ fontSize: 14, color: '#bdc3c7' }}>
          {players[currentPlayer]?.name}'s turn
          {players[currentPlayer]?.isBot ? ' (thinking...)' : ''}
        </div>
      </div>

      <HowToPlay>
        <p>Be the first to play every card in your hand. In this build, emptying your hand ends the game immediately (there's no multi-round score-to-500 — it's a single race to zero cards).</p>
        <p><strong>Turns:</strong> Only your own hand (Player 1, seat 0) is shown face-up in this build — the other seats are played by bots and shown only as a face-down pile with a card count, so no hidden information leaks between players sharing the device.</p>
        <p><strong>How it works:</strong></p>
        <ul>
          <li>Play a card that matches the color or the number/action of the top discard card.</li>
          <li>Number cards (0-9) just get played; Skip makes the next player lose their turn; Reverse flips the direction of play; Draw Two forces the next player to draw 2 cards and be skipped.</li>
          <li>Wild lets you change the current color to anything; Wild Draw Four does that plus forces the next player to draw 4 and be skipped.</li>
          <li>If you have no playable card, you must draw one from the deck instead.</li>
          <li>Getting down to your last card triggers an "UNO!" alert banner.</li>
        </ul>
        <p><strong>Play:</strong> Tap a card in your hand to play it — only cards that legally match the top card are enabled, others are dimmed. Tap the DRAW pile to draw a card on your turn. After playing a Wild card, a color-picker popup appears — tap the color you want to switch to.</p>
      </HowToPlay>

      {message && <div style={s.message}>{message}</div>}
      {showUno !== null && <div style={s.unoAlert}>UNO! — {players[showUno].name}</div>}

      {/* Other players */}
      <div style={s.otherPlayers}>
        {players.map((p, i) => {
          if (i === 0) return null;
          return (
            <div key={i} style={{ ...s.otherPlayer, border: i === currentPlayer ? '2px solid #f39c12' : '2px solid #34495e' }}>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{p.name}</div>
              <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                {(hands[i] || []).map((_, ci) => (
                  <div key={ci} style={s.faceDown} />
                ))}
              </div>
              <div style={{ fontSize: 12, marginTop: 4 }}>{(hands[i] || []).length} cards</div>
            </div>
          );
        })}
      </div>

      {/* Center */}
      <div style={s.center}>
        <div style={s.deckArea}>
          <div style={{ ...s.cardPile, background: '#2c3e50' }} onClick={phase === 'playing' && !players[currentPlayer]?.isBot ? drawCard : undefined}>
            <span style={{ color: '#fff', fontSize: 12 }}>DRAW</span>
            <span style={{ color: '#bdc3c7', fontSize: 11 }}>{deck.length}</span>
          </div>
        </div>
        <div style={s.topCard}>
          <div style={{ ...s.bigCard, background: COLOR_DISPLAY[top?.color] || '#333' }}>
            <span style={{ fontSize: 18, color: top?.color === 'yellow' ? '#2c3e50' : '#fff', fontWeight: 'bold' }}>
              {top?.value}
            </span>
          </div>
          <div style={{ marginTop: 8, color: '#bdc3c7', fontSize: 13 }}>
            Current color: <span style={{ color: COLOR_DISPLAY[currentColor], fontWeight: 'bold' }}>{currentColor.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Color chooser */}
      {phase === 'choosingColor' && (
        <div style={s.colorModal}>
          <div style={s.colorModalBox}>
            <h3>Choose a Color</h3>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              {COLORS.map(c => (
                <div key={c} style={{ ...s.colorBtn, background: COLOR_DISPLAY[c] }}
                  onClick={() => chooseColor(c)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Human hand */}
      <div style={s.handArea}>
        <div style={{ textAlign: 'center', marginBottom: 6, color: currentPlayer === 0 ? '#f39c12' : '#bdc3c7', fontWeight: 'bold' }}>
          {players[0].name} {currentPlayer === 0 && !players[0].isBot ? '← YOUR TURN' : ''}
        </div>
        <div style={s.handScroll}>
          <div style={s.hand}>
            {(hands[0] || []).map((card, i) => {
              const playable = currentPlayer === 0 && !players[0].isBot && phase === 'playing' && canPlay(card, top, currentColor);
              return (
                <div key={i}
                  style={{
                    ...s.card,
                    background: COLOR_DISPLAY[card.color],
                    opacity: (currentPlayer === 0 && !players[0].isBot && !playable) ? 0.45 : 1,
                    cursor: playable ? 'pointer' : 'default',
                    transform: playable ? 'translateY(-8px)' : 'none',
                    boxShadow: playable ? '0 4px 12px rgba(243,156,18,0.5)' : '1px 2px 4px rgba(0,0,0,0.3)',
                  }}
                  onClick={() => playable && playCard(card, 0)}
                >
                  <span style={{ color: card.color === 'yellow' ? '#2c3e50' : '#fff', fontSize: 11, fontWeight: 'bold' }}>
                    {card.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        {currentPlayer === 0 && !players[0].isBot && (
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <button style={s.drawBtn} onClick={drawCard}>Draw Card</button>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  container: { background: '#1a2634', minHeight: '100vh', padding: 16, color: '#ecf0f1', fontFamily: 'Arial, sans-serif', display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12, flexWrap: 'wrap' },
  title: { margin: 0, fontSize: 24, color: '#f39c12', flex: 1 },
  backBtn: { background: '#7f8c8d', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', minHeight: 40 },
  btn: { background: '#e67e22', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 16, margin: 8, minHeight: 44 },
  message: { background: '#e67e22', color: '#fff', padding: '8px 16px', borderRadius: 8, marginBottom: 8, textAlign: 'center', fontWeight: 'bold' },
  unoAlert: { background: '#e74c3c', color: '#fff', padding: '12px 24px', borderRadius: 8, marginBottom: 8, textAlign: 'center', fontSize: 22, fontWeight: 'bold', animation: 'pulse 0.5s' },
  otherPlayers: { display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 },
  otherPlayer: { background: '#2c3e50', borderRadius: 8, padding: '8px 12px', minWidth: 100, textAlign: 'center', fontSize: 12 },
  faceDown: { width: 22, height: 32, background: '#3498db', borderRadius: 3, border: '1px solid #2980b9' },
  center: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 32, margin: '16px 0', flexWrap: 'wrap' },
  deckArea: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  cardPile: { width: 70, height: 100, borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid #34495e' },
  topCard: { textAlign: 'center' },
  bigCard: { width: 80, height: 110, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid rgba(255,255,255,0.3)', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' },
  colorModal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  colorModalBox: { background: '#2c3e50', padding: 32, borderRadius: 16, textAlign: 'center' },
  colorBtn: { width: 60, height: 60, borderRadius: '50%', cursor: 'pointer', border: '3px solid rgba(255,255,255,0.4)', transition: 'transform 0.1s' },
  handArea: { marginTop: 'auto', paddingTop: 8 },
  handScroll: { overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 4 },
  hand: { display: 'flex', flexWrap: 'nowrap', gap: 4, justifyContent: 'center', width: 'max-content', margin: '0 auto' },
  card: { width: 50, height: 72, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.3)', transition: 'transform 0.15s, box-shadow 0.15s', position: 'relative', flexShrink: 0 },
  drawBtn: { background: '#27ae60', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 14, minHeight: 44 },
};
