import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─── Card Utilities ───────────────────────────────────────────────────────────

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const RANK_VALUES = { A: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, '10': 10, J: 10, Q: 10, K: 10 };
const RANK_ORDER = { A: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, '10': 10, J: 11, Q: 12, K: 13 };

function makeCard(rank, suit, id) {
  return { rank, suit, id, value: RANK_VALUES[rank] };
}

function makeDeck() {
  const deck = [];
  let id = 0;
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(makeCard(rank, suit, id++));
    }
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

function cardKey(card) { return `${card.rank}${card.suit}`; }
function isRed(suit) { return suit === '♥' || suit === '♦'; }

function cardValue(card) { return RANK_VALUES[card.rank] || 0; }
function rankOrder(rank) { return RANK_ORDER[rank] || 0; }

// ─── Meld Detection ───────────────────────────────────────────────────────────

function isSet(cards) {
  if (cards.length < 3 || cards.length > 4) return false;
  return new Set(cards.map(c => c.rank)).size === 1;
}

function isRun(cards) {
  if (cards.length < 3) return false;
  const suits = new Set(cards.map(c => c.suit));
  if (suits.size !== 1) return false;
  const sorted = [...cards].sort((a, b) => rankOrder(a.rank) - rankOrder(b.rank));
  for (let i = 1; i < sorted.length; i++) {
    if (rankOrder(sorted[i].rank) !== rankOrder(sorted[i - 1].rank) + 1) return false;
  }
  return true;
}

function isMeld(cards) { return isSet(cards) || isRun(cards); }

// Find all possible melds from a hand, return groups
function findBestMelds(hand) {
  // Try to find the arrangement that minimizes deadwood
  // Simple greedy: find all valid melds, pick largest non-overlapping
  const n = hand.length;
  let bestMelds = [];
  let bestDeadwood = hand.reduce((s, c) => s + cardValue(c), 0);

  function solve(idx, used, currentMelds) {
    if (idx === n) {
      const deadwood = hand.filter((_, i) => !used[i]).reduce((s, c) => s + cardValue(c), 0);
      if (deadwood < bestDeadwood) {
        bestDeadwood = deadwood;
        bestMelds = currentMelds.map(m => m.map(i => hand[i]));
      }
      return;
    }
    // Skip this card (leave as deadwood)
    solve(idx + 1, used, currentMelds);

    // Try starting a meld from this card
    if (!used[idx]) {
      const remaining = hand.map((_, i) => i).filter(i => !used[i] && i !== idx);
      for (let size = Math.min(4, remaining.length + 1); size >= 3; size--) {
        // Try combinations of 'size - 1' more cards
        const combos = combinations(remaining, size - 1);
        for (const combo of combos) {
          const group = [idx, ...combo];
          const cards = group.map(i => hand[i]);
          if (isMeld(cards)) {
            const newUsed = [...used];
            group.forEach(i => { newUsed[i] = true; });
            solve(idx + 1, newUsed, [...currentMelds, group]);
            break; // take first valid meld for this start card + size
          }
        }
      }
    }
  }

  // Limit to smaller hands or cap combos for performance
  if (n <= 10) {
    solve(0, new Array(n).fill(false), []);
  } else {
    // Greedy fallback for larger hands
    bestMelds = greedyMelds(hand);
    bestDeadwood = hand
      .filter(c => !bestMelds.flat().find(m => m.id === c.id))
      .reduce((s, c) => s + cardValue(c), 0);
  }
  return { melds: bestMelds, deadwood: bestDeadwood };
}

function greedyMelds(hand) {
  const used = new Set();
  const melds = [];
  // Find sets
  const byRank = {};
  for (const c of hand) {
    if (!byRank[c.rank]) byRank[c.rank] = [];
    byRank[c.rank].push(c);
  }
  for (const group of Object.values(byRank)) {
    if (group.length >= 3) {
      melds.push(group.slice(0, Math.min(4, group.length)));
      group.slice(0, Math.min(4, group.length)).forEach(c => used.add(c.id));
    }
  }
  // Find runs
  const bySuit = {};
  for (const c of hand) {
    if (used.has(c.id)) continue;
    if (!bySuit[c.suit]) bySuit[c.suit] = [];
    bySuit[c.suit].push(c);
  }
  for (const group of Object.values(bySuit)) {
    const sorted = group.filter(c => !used.has(c.id)).sort((a, b) => rankOrder(a.rank) - rankOrder(b.rank));
    let i = 0;
    while (i < sorted.length) {
      let j = i + 1;
      while (j < sorted.length && rankOrder(sorted[j].rank) === rankOrder(sorted[j - 1].rank) + 1) j++;
      if (j - i >= 3) {
        const run = sorted.slice(i, j);
        melds.push(run);
        run.forEach(c => used.add(c.id));
      }
      i = j;
    }
  }
  return melds;
}

function combinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  const withFirst = combinations(rest, k - 1).map(c => [first, ...c]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

function getDeadwood(hand) {
  const { deadwood } = findBestMelds(hand);
  return deadwood;
}

function canKnock(hand) { return getDeadwood(hand) <= 10; }
function canGin(hand) { return getDeadwood(hand) === 0; }

// ─── Bot AI ───────────────────────────────────────────────────────────────────

function botDraw(hand, discardTop, difficulty) {
  if (!discardTop) return 'deck';
  if (difficulty === 'easy') return Math.random() > 0.7 ? 'discard' : 'deck';

  // Would the discard card improve our hand?
  const testHand = [...hand, discardTop];
  const withDiscard = getDeadwood(testHand.slice(0, hand.length + 1));
  return withDiscard < getDeadwood(hand) ? 'discard' : 'deck';
}

function botDiscard(hand, difficulty) {
  if (difficulty === 'easy') {
    // Discard highest non-meld card
    const { melds } = findBestMelds(hand);
    const meldIds = new Set(melds.flat().map(c => c.id));
    const deadwood = hand.filter(c => !meldIds.has(c.id));
    if (deadwood.length === 0) return hand[hand.length - 1];
    return deadwood.reduce((a, b) => cardValue(a) >= cardValue(b) ? a : b);
  }
  // medium/hard: discard the card that maximizes reduction in deadwood
  let bestCard = null;
  let bestDeadwood = Infinity;
  for (const card of hand) {
    const remaining = hand.filter(c => c.id !== card.id);
    const dw = getDeadwood(remaining);
    if (dw < bestDeadwood) {
      bestDeadwood = dw;
      bestCard = card;
    }
  }
  return bestCard || hand[hand.length - 1];
}

// Best card to discard and the resulting deadwood, evaluated on the
// post-discard hand (this is what actually determines gin/knock legality —
// checking deadwood on the pre-discard hand is too strict for gin and can
// mismatch the card actually discarded).
function bestDiscardOption(hand) {
  let bestCard = null;
  let bestDeadwood = Infinity;
  for (const card of hand) {
    const remaining = hand.filter(c => c.id !== card.id);
    const dw = getDeadwood(remaining);
    if (dw < bestDeadwood) { bestDeadwood = dw; bestCard = card; }
  }
  return { card: bestCard, deadwood: bestDeadwood };
}

function botShouldKnock(hand, difficulty) {
  const { deadwood: dw } = bestDiscardOption(hand);
  if (dw === 0) return 'gin';
  if (difficulty === 'easy') return dw <= 5 && Math.random() > 0.5 ? 'knock' : null;
  if (difficulty === 'medium') return dw <= 8 ? 'knock' : null;
  return dw <= 6 ? 'knock' : null;
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function scoreRound(knockerIdx, hands, melds) {
  // knocker already has deadwood from their perspective
  const knockerDW = getDeadwood(hands[knockerIdx]);
  const results = {};

  for (let i = 0; i < hands.length; i++) {
    if (i === knockerIdx) continue;
    // Lay off opponent cards onto knocker's melds (simplified: try adding to each meld)
    let oppDW = getDeadwood(hands[i]);
    // simplified lay-off for scoring
    results[i] = oppDW;
  }

  const scores = {};
  let undercut = false;
  for (const [idxStr, oppDW] of Object.entries(results)) {
    const idx = parseInt(idxStr);
    if (oppDW <= knockerDW) {
      undercut = true;
      scores[idx] = (scores[idx] || 0) + knockerDW - oppDW + 25;
      scores[knockerIdx] = scores[knockerIdx] || 0;
    } else {
      scores[knockerIdx] = (scores[knockerIdx] || 0) + oppDW - knockerDW;
    }
  }
  return { scores, undercut, isGin: knockerDW === 0 };
}

// ─── Game Init ────────────────────────────────────────────────────────────────

function initRound(players) {
  const n = players.length;
  const handSize = n === 2 ? 10 : 7;
  const deck = shuffle(makeDeck());
  const hands = [];
  for (let i = 0; i < n; i++) {
    hands.push(deck.splice(0, handSize));
  }
  const discard = [deck.splice(0, 1)[0]];
  return { deck, hands, discard };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Rummy({ players, onBack }) {
  const n = players.length;
  const [scores, setScores] = useState(() => players.map(() => 0));
  const [roundNum, setRoundNum] = useState(1);

  const [roundState, setRoundState] = useState(() => initRound(players));
  const { deck, hands, discard } = roundState;

  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [turnPhase, setTurnPhase] = useState('draw'); // draw | discard | knock_reveal
  const [drawnCard, setDrawnCard] = useState(null);
  const [selectedCards, setSelectedCards] = useState([]); // indices in current player's hand
  const [knockerIdx, setKnockerIdx] = useState(null);
  const [knockReveal, setKnockReveal] = useState(null); // { knocker, hands, melds }
  const [layoffCards, setLayoffCards] = useState({}); // { meldIdx: [card, ...] }
  const [roundResult, setRoundResult] = useState(null);
  const [gameWinner, setGameWinner] = useState(null);
  const [log, setLog] = useState([`Round ${1} — ${players[0].name}'s turn`]);
  const [showOpponentHands, setShowOpponentHands] = useState(false);

  const botTimerRef = useRef(null);

  const addLog = useCallback(msg => setLog(prev => [...prev.slice(-9), msg]), []);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const updateRound = useCallback((updates) => {
    setRoundState(prev => ({ ...prev, ...updates }));
  }, []);

  const advanceTurn = useCallback((nextPlayerOverride, ownState) => {
    const state = ownState || roundState;
    const next = nextPlayerOverride !== undefined ? nextPlayerOverride : (currentPlayer + 1) % n;
    setCurrentPlayer(next);
    setTurnPhase('draw');
    setSelectedCards([]);
    setDrawnCard(null);
    addLog(`${players[next].name}'s turn`);
  }, [currentPlayer, n, players, roundState, addLog]);

  // ── Start new round ──────────────────────────────────────────────────────
  const startNewRound = useCallback((newScores) => {
    const nextRound = roundNum + 1;
    setRoundNum(nextRound);
    setRoundState(initRound(players));
    setCurrentPlayer(0);
    setTurnPhase('draw');
    setDrawnCard(null);
    setSelectedCards([]);
    setKnockerIdx(null);
    setKnockReveal(null);
    setLayoffCards({});
    setRoundResult(null);
    addLog(`Round ${nextRound} — ${players[0].name}'s turn`);
  }, [roundNum, players, addLog]);

  // ── Handle knock/gin ─────────────────────────────────────────────────────
  const handleKnock = useCallback((isGin, handSnap, deckSnap, discardSnap) => {
    const hand = handSnap || hands[currentPlayer];
    const { melds } = findBestMelds(hand);
    setKnockerIdx(currentPlayer);
    setKnockReveal({ knocker: currentPlayer, melds, isGin });
    setTurnPhase('knock_reveal');
    addLog(`${players[currentPlayer].name} ${isGin ? 'goes Gin!' : 'knocks!'}`);
  }, [currentPlayer, hands, players, addLog]);

  // ── Finalize scoring ─────────────────────────────────────────────────────
  const finalizeRound = useCallback(() => {
    if (!knockReveal) return;
    const { knocker, isGin } = knockReveal;
    const knockerDW = getDeadwood(hands[knocker]);
    let roundScores = {};
    let undercut = false;
    let ginBonus = isGin ? 25 : 0;

    for (let i = 0; i < n; i++) {
      if (i === knocker) continue;
      const oppDW = getDeadwood(hands[i]);
      if (!isGin && oppDW <= knockerDW) {
        undercut = true;
        roundScores[i] = (roundScores[i] || 0) + knockerDW - oppDW + 25;
      } else {
        roundScores[knocker] = (roundScores[knocker] || 0) + oppDW - knockerDW + ginBonus;
        ginBonus = 0; // only add once
      }
    }
    const newTotals = scores.map((s, i) => s + (roundScores[i] || 0));
    setScores(newTotals);
    setRoundResult({ roundScores, undercut, isGin, knockerDW, hands: [...hands] });

    const winner = newTotals.findIndex(s => s >= 100);
    if (winner !== -1) setGameWinner(winner);
  }, [knockReveal, hands, n, scores]);

  // ── Bot turn logic ────────────────────────────────────────────────────────
  useEffect(() => {
    if (gameWinner !== null || knockReveal || roundResult) return;
    if (!players[currentPlayer]?.isBot) return;
    const diff = players[currentPlayer].botDifficulty || 'medium';

    if (turnPhase === 'draw') {
      botTimerRef.current = setTimeout(() => {
        const discardTop = discard[discard.length - 1];
        const drawFrom = botDraw(hands[currentPlayer], discardTop, diff);
        let newDeck = [...deck];
        let newDiscard = [...discard];
        let drawn;
        if (drawFrom === 'discard' && discardTop) {
          drawn = discardTop;
          newDiscard = newDiscard.slice(0, -1);
          addLog(`${players[currentPlayer].name} takes from discard.`);
        } else {
          if (newDeck.length === 0) {
            // Reshuffle discard (keep top)
            const top = newDiscard.pop();
            newDeck = shuffle(newDiscard);
            newDiscard = top ? [top] : [];
          }
          drawn = newDeck.shift();
          addLog(`${players[currentPlayer].name} draws from deck.`);
        }
        const newHands = hands.map((h, i) => i === currentPlayer ? [...h, drawn] : [...h]);
        setDrawnCard(drawn);
        updateRound({ deck: newDeck, discard: newDiscard, hands: newHands });
        setTurnPhase('discard');
      }, 700);
    }

    if (turnPhase === 'discard') {
      botTimerRef.current = setTimeout(() => {
        const hand = hands[currentPlayer];
        const action = botShouldKnock(hand, diff);
        if (action === 'gin' || action === 'knock') {
          // Use the optimal discard (the one that made gin/knock legal),
          // not the difficulty-flavored botDiscard heuristic, so the bot
          // never ends up "knocking" with a hand that's actually over the
          // deadwood threshold.
          const { card: discardCard } = bestDiscardOption(hand);
          const newHand = hand.filter(c => c.id !== discardCard.id);
          const newHands = hands.map((h, i) => i === currentPlayer ? newHand : [...h]);
          const newDiscard = [...discard, discardCard];
          updateRound({ hands: newHands, discard: newDiscard });
          setDrawnCard(null);
          setSelectedCards([]);
          if (action === 'gin' && getDeadwood(newHand) !== 0) {
            // Safety net: shouldn't happen since discardCard was chosen to
            // minimize deadwood, but don't let a bot falsely claim gin.
            advanceTurn((currentPlayer + 1) % n, { deck, hands: newHands, discard: newDiscard });
          } else {
            setTimeout(() => handleKnock(action === 'gin', newHand), 50);
          }
          return;
        }
        // Just discard
        const discardCard = botDiscard(hand, diff);
        const newHand = hand.filter(c => c.id !== discardCard.id);
        const newHands = hands.map((h, i) => i === currentPlayer ? newHand : [...h]);
        const newDiscard = [...discard, discardCard];
        updateRound({ hands: newHands, discard: newDiscard });
        setDrawnCard(null);
        setSelectedCards([]);
        addLog(`${players[currentPlayer].name} discards ${discardCard.rank}${discardCard.suit}`);
        advanceTurn((currentPlayer + 1) % n);
      }, 700);
    }

    return () => clearTimeout(botTimerRef.current);
  }, [turnPhase, currentPlayer, gameWinner, knockReveal, roundResult]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Human draw ───────────────────────────────────────────────────────────
  function humanDrawFrom(source) {
    if (turnPhase !== 'draw' || players[currentPlayer]?.isBot) return;
    let newDeck = [...deck];
    let newDiscard = [...discard];
    let drawn;
    if (source === 'discard') {
      if (newDiscard.length === 0) return;
      drawn = newDiscard.pop();
    } else {
      if (newDeck.length === 0) {
        const top = newDiscard.pop();
        newDeck = shuffle(newDiscard);
        newDiscard = top ? [top] : [];
      }
      if (newDeck.length === 0) return;
      drawn = newDeck.shift();
    }
    const newHands = hands.map((h, i) => i === currentPlayer ? [...h, drawn] : [...h]);
    setDrawnCard(drawn);
    updateRound({ deck: newDeck, discard: newDiscard, hands: newHands });
    setTurnPhase('discard');
    addLog(`${players[currentPlayer].name} draws from ${source}.`);
  }

  // ── Human discard ────────────────────────────────────────────────────────
  function humanDiscardCard(cardId) {
    if (turnPhase !== 'discard' || players[currentPlayer]?.isBot) return;
    const hand = hands[currentPlayer];
    const card = hand.find(c => c.id === cardId);
    if (!card) return;
    const newHand = hand.filter(c => c.id !== cardId);
    const newHands = hands.map((h, i) => i === currentPlayer ? newHand : [...h]);
    const newDiscard = [...discard, card];
    updateRound({ hands: newHands, discard: newDiscard });
    setDrawnCard(null);
    setSelectedCards([]);
    addLog(`${players[currentPlayer].name} discards ${card.rank}${card.suit}`);
    advanceTurn((currentPlayer + 1) % n);
  }

  function humanKnock() {
    if (turnPhase !== 'discard' || players[currentPlayer]?.isBot) return;
    const hand = hands[currentPlayer];
    // Find best card to discard (minimizes deadwood on remaining 10-card hand)
    const { card: bestDiscardCard } = bestDiscardOption(hand);
    if (!bestDiscardCard) return;
    const finalHand = hand.filter(c => c.id !== bestDiscardCard.id);
    if (!canKnock(finalHand)) return;
    const isGin = canGin(finalHand);
    const newHands = hands.map((h, i) => i === currentPlayer ? finalHand : [...h]);
    const newDiscard = [...discard, bestDiscardCard];
    updateRound({ hands: newHands, discard: newDiscard });
    setDrawnCard(null);
    setSelectedCards([]);
    addLog(`${players[currentPlayer].name} discards ${bestDiscardCard.rank}${bestDiscardCard.suit} and ${isGin ? 'goes Gin' : 'knocks'}!`);
    setTimeout(() => handleKnock(isGin, finalHand), 50);
  }

  function toggleCardSelect(idx) {
    setSelectedCards(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  }

  // ── Lay-off phase (post-knock, human opponents) ──────────────────────────
  // For simplicity: after knock, we show all hands and finalize immediately
  // (full lay-off UI is complex; we compute it automatically)

  // ─── Render helpers ───────────────────────────────────────────────────────

  function CardView({ card, selected, onClick, disabled, faceDown }) {
    if (faceDown) {
      return (
        <div
          style={{
            width: 44,
            height: 64,
            borderRadius: 6,
            background: 'linear-gradient(135deg, #1a4a8a, #0d2a5a)',
            border: '2px solid var(--border)',
            cursor: 'default',
            flexShrink: 0,
          }}
        />
      );
    }
    const red = isRed(card.suit);
    return (
      <div
        onClick={disabled ? undefined : onClick}
        style={{
          width: 44,
          height: 64,
          borderRadius: 6,
          background: selected ? '#fffacd' : '#fff',
          border: `2px solid ${selected ? '#f39c12' : 'var(--border)'}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: disabled ? 'default' : 'pointer',
          flexShrink: 0,
          userSelect: 'none',
          boxShadow: selected ? '0 0 6px #f39c12' : '0 1px 3px rgba(0,0,0,0.2)',
          transform: selected ? 'translateY(-6px)' : 'none',
          transition: 'transform 0.1s, box-shadow 0.1s',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 'bold', color: red ? '#c0392b' : '#2c3e50', lineHeight: 1 }}>
          {card.rank}
        </div>
        <div style={{ fontSize: 16, color: red ? '#c0392b' : '#2c3e50' }}>{card.suit}</div>
      </div>
    );
  }

  // ─── Game winner screen ───────────────────────────────────────────────────
  if (gameWinner !== null) {
    return (
      <div className="game-page">
        <div className="gs-container" style={{ textAlign: 'center', paddingTop: 60 }}>
          <div className="gs-card" style={{ maxWidth: 400, margin: '0 auto', padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🃏</div>
            <h2 style={{ color: 'var(--accent)', marginBottom: 8 }}>Game Over!</h2>
            <p style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 16 }}>
              {players[gameWinner].name} wins!
            </p>
            <div style={{ marginBottom: 24 }}>
              {scores.map((s, i) => (
                <div key={i} style={{ fontSize: 15, color: i === gameWinner ? 'var(--accent)' : 'var(--text)' }}>
                  {players[i].name}: {s} pts
                </div>
              ))}
            </div>
            <button className="gs-btn gs-btn-primary" style={{ minHeight: 44 }} onClick={onBack}>Back to Lobby</button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Round result screen ──────────────────────────────────────────────────
  if (roundResult) {
    return (
      <div className="game-page">
        <div className="gs-container" style={{ paddingTop: 40, textAlign: 'center' }}>
          <div className="gs-card" style={{ maxWidth: 500, margin: '0 auto', padding: 32 }}>
            <h3 style={{ color: 'var(--accent)', marginBottom: 12 }}>
              Round {roundNum} Result
            </h3>
            {roundResult.isGin && (
              <div style={{ color: '#27ae60', fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>GIN! (+25 bonus)</div>
            )}
            {roundResult.undercut && (
              <div style={{ color: '#e74c3c', fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>UNDERCUT!</div>
            )}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>Round scores:</div>
              {players.map((p, i) => (
                <div key={i} style={{ fontSize: 15, marginBottom: 4 }}>
                  {p.name}: +{roundResult.roundScores[i] || 0} pts (total: {scores[i]})
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>Hands:</div>
              {players.map((p, i) => {
                const { melds, deadwood: dw } = findBestMelds(roundResult.hands[i]);
                const meldIds = new Set(melds.flat().map(c => c.id));
                return (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 4 }}>{p.name} (DW: {getDeadwood(roundResult.hands[i])})</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
                      {roundResult.hands[i].map(card => (
                        <div
                          key={card.id}
                          style={{
                            width: 36,
                            height: 52,
                            borderRadius: 4,
                            background: meldIds.has(card.id) ? '#d5f5e3' : '#fde8e8',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            color: isRed(card.suit) ? '#c0392b' : '#2c3e50',
                          }}
                        >
                          <div>{card.rank}</div>
                          <div>{card.suit}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <button className="gs-btn gs-btn-primary" style={{ minHeight: 44 }} onClick={() => startNewRound(scores)}>
              Next Round
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Knock reveal screen ──────────────────────────────────────────────────
  if (knockReveal && turnPhase === 'knock_reveal') {
    const { knocker, melds, isGin } = knockReveal;
    return (
      <div className="game-page">
        <div className="gs-container" style={{ paddingTop: 20 }}>
          <div className="gs-card" style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
            <h3 style={{ color: 'var(--accent)', marginBottom: 4 }}>
              {players[knocker].name} {isGin ? 'went Gin!' : 'knocked!'}
            </h3>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
              Deadwood: {getDeadwood(hands[knocker])}
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 8 }}>
                {players[knocker].name}'s melds:
              </div>
              {melds.length === 0 && <span style={{ color: 'var(--muted)', fontSize: 12 }}>None</span>}
              {melds.map((meld, mi) => (
                <div key={mi} style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
                  {meld.map(card => (
                    <div
                      key={card.id}
                      style={{
                        width: 36,
                        height: 52,
                        borderRadius: 4,
                        background: '#d5f5e3',
                        border: '1px solid #27ae60',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        color: isRed(card.suit) ? '#c0392b' : '#2c3e50',
                      }}
                    >
                      <div>{card.rank}</div>
                      <div>{card.suit}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <button className="gs-btn gs-btn-primary" style={{ minHeight: 44 }} onClick={finalizeRound}>
              Score the Round
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main game view ───────────────────────────────────────────────────────
  const myHand = hands[currentPlayer];
  const discardTop = discard[discard.length - 1];
  const myDeadwood = getDeadwood(myHand);
  // Knock/gin eligibility depends on the deadwood AFTER discarding one card,
  // not the raw (pre-discard) hand — checking the raw hand is too strict
  // (it can hide a legal knock/gin that only becomes true post-discard).
  const myBestDiscardDeadwood = turnPhase === 'discard' ? bestDiscardOption(myHand).deadwood : Infinity;
  const myCanKnock = turnPhase === 'discard' && myBestDiscardDeadwood <= 10;
  const myCanGin = turnPhase === 'discard' && myBestDiscardDeadwood === 0;
  const isHumanTurn = !players[currentPlayer]?.isBot;

  // Sort hand for display: group by suit then rank
  const sortedHand = [...myHand].sort((a, b) => {
    if (a.suit !== b.suit) return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
    return rankOrder(a.rank) - rankOrder(b.rank);
  });

  const { melds: myMelds } = findBestMelds(myHand);
  const myMeldIds = new Set(myMelds.flat().map(c => c.id));

  return (
    <div className="game-page" style={{ paddingBottom: 40 }}>
      <div className="gs-container">
        {/* Header */}
        <div className="game-header">
          <button className="gs-btn gs-btn-outline gs-btn-sm" style={{ minHeight: 40 }} onClick={onBack}>← Back</button>
          <h2 style={{ margin: 0, flex: 1 }}>Gin Rummy — Round {roundNum}</h2>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>First to 100 wins</div>
        </div>

        {/* Score panel */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {players.map((p, i) => (
            <div
              key={i}
              style={{
                border: `2px solid ${i === currentPlayer ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)',
                padding: '6px 14px',
                background: i === currentPlayer ? 'var(--surface)' : 'transparent',
                fontSize: 13,
              }}
            >
              <span style={{ fontWeight: i === currentPlayer ? 'bold' : 'normal' }}>{p.name}</span>
              <span style={{ color: 'var(--muted)', marginLeft: 8 }}>{scores[i]} pts</span>
            </div>
          ))}
        </div>

        {/* Turn indicator */}
        <div
          style={{
            background: 'var(--surface)',
            borderRadius: 'var(--radius)',
            padding: '10px 16px',
            marginBottom: 14,
            fontWeight: 'bold',
            fontSize: 15,
            borderLeft: '4px solid var(--accent)',
          }}
        >
          {players[currentPlayer].name}'s turn —{' '}
          {turnPhase === 'draw' ? 'Draw a card' : 'Discard a card'}
          {players[currentPlayer]?.isBot && ' (thinking...)'}
        </div>

        {/* Deck + Discard */}
        <div
          style={{
            display: 'flex',
            gap: 20,
            alignItems: 'center',
            marginBottom: 16,
            padding: 16,
            flexWrap: 'wrap',
          }}
          className="gs-card"
        >
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>DECK ({deck.length})</div>
            <div
              onClick={() => humanDrawFrom('deck')}
              style={{
                width: 52,
                height: 76,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #1a4a8a, #0d2a5a)',
                border: `2px solid ${turnPhase === 'draw' && isHumanTurn ? 'var(--accent)' : 'var(--border)'}`,
                cursor: turnPhase === 'draw' && isHumanTurn ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 11,
                fontWeight: 'bold',
              }}
            >
              DRAW
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>DISCARD</div>
            {discardTop ? (
              <div
                onClick={() => humanDrawFrom('discard')}
                style={{
                  width: 52,
                  height: 76,
                  borderRadius: 8,
                  background: '#fff',
                  border: `2px solid ${turnPhase === 'draw' && isHumanTurn ? 'var(--accent)' : 'var(--border)'}`,
                  cursor: turnPhase === 'draw' && isHumanTurn ? 'pointer' : 'default',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isRed(discardTop.suit) ? '#c0392b' : '#2c3e50',
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 'bold' }}>{discardTop.rank}</div>
                <div style={{ fontSize: 18 }}>{discardTop.suit}</div>
              </div>
            ) : (
              <div
                style={{
                  width: 52,
                  height: 76,
                  borderRadius: 8,
                  border: '2px dashed var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--muted)',
                  fontSize: 11,
                }}
              >
                empty
              </div>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
              Your deadwood: <strong style={{ color: myDeadwood <= 10 ? 'var(--success)' : 'var(--text)' }}>{myDeadwood}</strong>
            </div>
            {isHumanTurn && turnPhase === 'discard' && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  className="gs-btn gs-btn-primary gs-btn-sm"
                  onClick={humanKnock}
                  disabled={!myCanKnock}
                  style={{ opacity: myCanKnock ? 1 : 0.4, minHeight: 44, padding: '10px 18px' }}
                >
                  {myCanGin ? 'Gin!' : 'Knock'}
                </button>
              </div>
            )}
          </div>

          {/* Opponent card counts */}
          <div>
            {players.map((p, i) => {
              if (i === currentPlayer) return null;
              return (
                <div key={i} style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>
                  {p.name}: {hands[i].length} cards
                </div>
              );
            })}
          </div>
        </div>

        {/* Current player's hand */}
        <div className="gs-card" style={{ padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>YOUR HAND ({myHand.length} cards)</span>
            <span style={{ fontSize: 11 }}>
              {turnPhase === 'discard' && isHumanTurn ? 'Click a card to discard it' : ''}
            </span>
          </div>

          {/* Melds highlighted — horizontally scrollable strip so a full
              10-13 card hand never forces the page to scroll sideways */}
          <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 5, marginBottom: 10, overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 4 }}>
            {sortedHand.map((card) => {
              const inMeld = myMeldIds.has(card.id);
              const isDrawn = drawnCard && card.id === drawnCard.id;
              return (
                <div
                  key={card.id}
                  onClick={() => {
                    if (turnPhase === 'discard' && isHumanTurn) humanDiscardCard(card.id);
                  }}
                  style={{
                    width: 48,
                    height: 70,
                    borderRadius: 7,
                    background: isDrawn ? '#fffacd' : inMeld ? '#d5f5e3' : '#fff',
                    border: `2px solid ${isDrawn ? '#f39c12' : inMeld ? '#27ae60' : 'var(--border)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: turnPhase === 'discard' && isHumanTurn ? 'pointer' : 'default',
                    userSelect: 'none',
                    boxShadow: isDrawn ? '0 0 8px rgba(243,156,18,0.5)' : 'none',
                    transform: isDrawn ? 'translateY(-8px)' : 'none',
                    transition: 'transform 0.15s',
                    flexShrink: 0,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 'bold', color: isRed(card.suit) ? '#c0392b' : '#2c3e50', lineHeight: 1 }}>
                    {card.rank}
                  </div>
                  <div style={{ fontSize: 18, color: isRed(card.suit) ? '#c0392b' : '#2c3e50' }}>{card.suit}</div>
                  <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>{card.value}</div>
                </div>
              );
            })}
          </div>

          {/* Meld legend */}
          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 12, height: 12, background: '#d5f5e3', border: '1px solid #27ae60', borderRadius: 2, display: 'inline-block' }} />
              In meld
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 12, height: 12, background: '#fffacd', border: '1px solid #f39c12', borderRadius: 2, display: 'inline-block' }} />
              Just drawn
            </span>
          </div>
        </div>

        {/* Detected melds */}
        {myMelds.length > 0 && (
          <div className="gs-card" style={{ padding: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>DETECTED MELDS</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {myMelds.map((meld, mi) => (
                <div key={mi} style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: 'var(--muted)', marginRight: 4 }}>
                    {isSet(meld) ? 'Set' : 'Run'}:
                  </span>
                  {meld.map(card => (
                    <div
                      key={card.id}
                      style={{
                        width: 34,
                        height: 48,
                        borderRadius: 4,
                        background: '#d5f5e3',
                        border: '1px solid #27ae60',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        color: isRed(card.suit) ? '#c0392b' : '#2c3e50',
                      }}
                    >
                      <div>{card.rank}</div>
                      <div>{card.suit}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Event log */}
        <div className="gs-card" style={{ padding: 10, maxHeight: 120, overflowY: 'auto' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, fontWeight: 'bold' }}>LOG</div>
          {[...log].reverse().map((entry, i) => (
            <div key={i} style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6 }}>{entry}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
