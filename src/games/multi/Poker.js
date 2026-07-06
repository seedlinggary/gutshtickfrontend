import React, { useState, useEffect, useCallback, useRef } from 'react';

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANK_VAL = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };

function createDeck() {
  const d = [];
  for (const s of SUITS) for (const r of RANKS) d.push({ suit: s, rank: r, v: RANK_VAL[r] });
  return d;
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function cardColor(c) { return (c.suit === '♥' || c.suit === '♦') ? '#e74c3c' : '#ecf0f1'; }

// Hand evaluation
function evalHand(cards) {
  // returns { rank: 0-8, name, tiebreakers }
  const sorted = [...cards].sort((a, b) => b.v - a.v);
  const ranks = sorted.map(c => c.v);
  const suits = sorted.map(c => c.suit);
  const counts = {};
  ranks.forEach(r => { counts[r] = (counts[r] || 0) + 1; });
  const groups = Object.entries(counts).sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const isFlush = suits.every(s => s === suits[0]);
  const isStraight = (() => {
    const u = [...new Set(ranks)].sort((a, b) => b - a);
    if (u.length !== 5) return false;
    if (u[0] - u[4] === 4) return true;
    // wheel
    if (JSON.stringify(u) === JSON.stringify([14, 5, 4, 3, 2])) return true;
    return false;
  })();
  const straightHigh = (() => {
    const u = [...new Set(ranks)].sort((a, b) => b - a);
    if (u[0] === 14 && u[1] === 5) return 5;
    return u[0];
  })();

  // Must check straightHigh (not ranks[0]) — a steel-wheel straight flush (A-2-3-4-5)
  // also has an Ace among ranks, but its straightHigh is 5, not 14, so it must
  // stay a Straight Flush rather than be misclassified as a Royal Flush.
  if (isFlush && isStraight && straightHigh === 14) return { rank: 8, name: 'Royal Flush', tb: [straightHigh] };
  if (isFlush && isStraight) return { rank: 7, name: 'Straight Flush', tb: [straightHigh] };
  if (groups[0][1] === 4) return { rank: 6, name: 'Four of a Kind', tb: [+groups[0][0], +groups[1][0]] };
  if (groups[0][1] === 3 && groups[1][1] === 2) return { rank: 5, name: 'Full House', tb: [+groups[0][0], +groups[1][0]] };
  if (isFlush) return { rank: 4, name: 'Flush', tb: ranks };
  if (isStraight) return { rank: 3, name: 'Straight', tb: [straightHigh] };
  if (groups[0][1] === 3) return { rank: 2, name: 'Three of a Kind', tb: [+groups[0][0], ...ranks.filter(r => r !== +groups[0][0])] };
  if (groups[0][1] === 2 && groups[1][1] === 2) return { rank: 1, name: 'Two Pair', tb: [+groups[0][0], +groups[1][0], +groups[2][0]] };
  if (groups[0][1] === 2) return { rank: 0, name: 'One Pair', tb: [+groups[0][0], ...ranks.filter(r => r !== +groups[0][0])] };
  return { rank: -1, name: 'High Card', tb: ranks };
}

function bestFiveFrom7(cards) {
  // NB: despite the name, this is called with 5 (flop), 6 (turn) or 7 (river)
  // cards from estimateStrength()'s bot heuristics — not just 7. The old
  // implementation always dropped exactly 2 cards, which silently mis-evaluated
  // 5- and 6-card inputs (evalHand() expects exactly 5). Choose combinations of
  // 5 generically so every street is evaluated correctly.
  if (cards.length <= 5) return evalHand(cards);
  let best = null;
  const combos = [];
  const pick = (start, chosen) => {
    if (chosen.length === 5) { combos.push(chosen.slice()); return; }
    for (let i = start; i < cards.length; i++) {
      chosen.push(cards[i]);
      pick(i + 1, chosen);
      chosen.pop();
    }
  };
  pick(0, []);
  for (const five of combos) {
    const h = evalHand(five);
    if (!best || h.rank > best.rank || (h.rank === best.rank && compareTb(h.tb, best.tb) > 0)) best = h;
  }
  return best;
}

function compareTb(a, b) {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

function botAction(holeCards, community, pot, toCall, chips, difficulty) {
  if (toCall === 0) {
    if (difficulty === 'easy') return { action: 'check' };
    return { action: 'check' };
  }
  const potOdds = toCall / (pot + toCall);
  const handStrength = estimateStrength(holeCards, community);
  if (difficulty === 'easy') {
    return Math.random() > 0.35 ? { action: 'call', amount: toCall } : { action: 'fold' };
  }
  if (difficulty === 'medium') {
    if (handStrength > 0.7) return { action: 'raise', amount: Math.min(toCall * 3, chips) };
    if (handStrength > potOdds) return { action: 'call', amount: toCall };
    return { action: 'fold' };
  }
  // hard
  const bluff = Math.random() < 0.15;
  if (bluff && Math.random() > 0.5) return { action: 'raise', amount: Math.min(pot, chips) };
  if (handStrength > 0.75) return { action: 'raise', amount: Math.min(toCall * 3, chips) };
  if (handStrength > potOdds) return { action: 'call', amount: toCall };
  return { action: 'fold' };
}

function estimateStrength(hole, community) {
  if (hole.length === 0) return 0.3;
  const all = [...hole, ...community];
  if (all.length < 5) {
    // pre-flop estimation
    const high = Math.max(...hole.map(c => c.v));
    const pair = hole[0].v === hole[1].v;
    return (pair ? 0.7 : high / 14 * 0.6);
  }
  const h = bestFiveFrom7(all);
  return (h.rank + 1) / 9;
}

export default function Poker({ players, onBack }) {
  const n = players.length;
  const [chips, setChips] = useState(() => players.map(() => 1000));
  const [deck, setDeck] = useState([]);
  const [holeCards, setHoleCards] = useState(() => players.map(() => []));
  const [community, setCommunity] = useState([]);
  const [pot, setPot] = useState(0);
  const [bets, setBets] = useState(() => players.map(() => 0));
  const [folded, setFolded] = useState(() => players.map(() => false));
  const [currentBettor, setCurrentBettor] = useState(0);
  const [phase, setPhase] = useState('preflop'); // preflop, flop, turn, river, showdown
  const [dealerBtn, setDealerBtn] = useState(0);
  const [toCall, setToCall] = useState(20);
  const [raiseAmount, setRaiseAmount] = useState(40);
  const [message, setMessage] = useState('');
  const [showdown, setShowdown] = useState(false);
  const [winners, setWinners] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const processingRef = useRef(false);

  const smallBlind = 10, bigBlind = 20;

  const initRound = useCallback((dealerIdx, currentChips) => {
    const d = shuffle(createDeck());
    const newHoleCards = [];
    for (let i = 0; i < n; i++) newHoleCards.push(d.slice(i * 2, i * 2 + 2));
    const remaining = d.slice(n * 2);
    // Heads-up (2 players) is special-cased: the dealer posts the small blind
    // and acts first preflop, per standard Hold'em rules. For 3+ players, SB/BB
    // are the two seats left of the dealer.
    const sbIdx = n === 2 ? dealerIdx : (dealerIdx + 1) % n;
    const bbIdx = n === 2 ? (dealerIdx + 1) % n : (dealerIdx + 2) % n;
    const newChips = [...currentChips];
    const newBets = players.map(() => 0);
    // Cap each blind to what the player actually has, so a short stack can't
    // post a "phantom" full blind that inflates the pot beyond real chips in play.
    const sbPost = Math.min(smallBlind, newChips[sbIdx]);
    newChips[sbIdx] -= sbPost;
    newBets[sbIdx] = sbPost;
    const bbPost = Math.min(bigBlind, newChips[bbIdx]);
    newChips[bbIdx] -= bbPost;
    newBets[bbIdx] = bbPost;
    setDeck(remaining);
    setHoleCards(newHoleCards);
    setCommunity([]);
    setPot(sbPost + bbPost);
    setBets(newBets);
    setFolded(players.map(() => false));
    setToCall(bbPost);
    setRaiseAmount(bbPost * 2);
    const firstBettor = (bbIdx + 1) % n;
    setCurrentBettor(firstBettor);
    setPhase('preflop');
    setShowdown(false);
    setWinners([]);
    setMessage('');
    processingRef.current = false;
  }, [n, players]); // eslint-disable-line

  useEffect(() => { initRound(0, players.map(() => 1000)); }, []); // eslint-disable-line

  const advancePhase = useCallback((currentPhase, currentDeck, currentCommunity, currentPot, currentBets, currentChips, currentFolded) => {
    const phaseOrder = ['preflop', 'flop', 'turn', 'river', 'showdown'];
    const nextPhase = phaseOrder[phaseOrder.indexOf(currentPhase) + 1];
    let newDeck = [...currentDeck];
    let newCommunity = [...currentCommunity];
    let newPot = currentPot;
    let newChips = [...currentChips];
    const resetBets = players.map(() => 0);

    if (nextPhase === 'flop') { newCommunity = newDeck.slice(0, 3); newDeck = newDeck.slice(3); }
    else if (nextPhase === 'turn') { newCommunity = [...newCommunity, newDeck[0]]; newDeck = newDeck.slice(1); }
    else if (nextPhase === 'river') { newCommunity = [...newCommunity, newDeck[0]]; newDeck = newDeck.slice(1); }
    else if (nextPhase === 'showdown') {
      // determine winner
      const active = players.map((_, i) => i).filter(i => !currentFolded[i]);
      if (active.length === 1) {
        newChips[active[0]] += newPot;
        setChips(newChips);
        setWinners([active[0]]);
        setMessage(`${players[active[0]].name} wins ${newPot} chips!`);
        setShowdown(true);
        setPhase('showdown');
        return { done: true, chips: newChips };
      }
      const hands = active.map(i => ({ player: i, hand: bestFiveFrom7([...holeCards[i], ...newCommunity]) }));
      const best = hands.reduce((a, b) => {
        if (b.hand.rank > a.hand.rank) return b;
        if (b.hand.rank === a.hand.rank && compareTb(b.hand.tb, a.hand.tb) > 0) return b;
        return a;
      });
      newChips[best.player] += newPot;
      setChips(newChips);
      setWinners([best.player]);
      setMessage(`${players[best.player].name} wins ${newPot} chips with ${best.hand.name}!`);
      setShowdown(true);
      setPhase('showdown');
      return { done: true, chips: newChips };
    }

    setDeck(newDeck);
    setCommunity(newCommunity);
    setBets(resetBets);
    setToCall(0);
    setRaiseAmount(bigBlind * 2);
    // first active player after dealer
    let starter = (dealerBtn + 1) % n;
    while (currentFolded[starter]) starter = (starter + 1) % n;
    setCurrentBettor(starter);
    setPhase(nextPhase);
    processingRef.current = false;
    return { done: false };
  }, [players, holeCards, dealerBtn, n, bigBlind]); // eslint-disable-line

  const processAction = useCallback((actionObj, playerIdx) => {
    if (processingRef.current) return;
    const { action, amount } = actionObj;
    const newChips = [...chips];
    const newBets = [...bets];
    const newFolded = [...folded];
    let newPot = pot;

    if (action === 'fold') {
      newFolded[playerIdx] = true;
    } else if (action === 'call') {
      const callAmt = Math.min(toCall - newBets[playerIdx], newChips[playerIdx]);
      newChips[playerIdx] -= callAmt;
      newBets[playerIdx] += callAmt;
      newPot += callAmt;
    } else if (action === 'check') {
      // nothing
    } else if (action === 'raise') {
      const rAmt = Math.min(amount, newChips[playerIdx]);
      newChips[playerIdx] -= rAmt;
      newBets[playerIdx] += rAmt;
      newPot += rAmt;
      setToCall(newBets[playerIdx]);
      setRaiseAmount(newBets[playerIdx] * 2);
    }

    setChips(newChips);
    setBets(newBets);
    setFolded(newFolded);
    setPot(newPot);

    // Find next player
    let next = (playerIdx + 1) % n;
    let checked = 0;
    while (newFolded[next] && checked < n) { next = (next + 1) % n; checked++; }
    const activePlayers = players.map((_, i) => i).filter(i => !newFolded[i]);

    if (activePlayers.length === 1) {
      processingRef.current = true;
      advancePhase(phase, deck, community, newPot, newBets, newChips, newFolded);
      return;
    }

    // Check if betting round is over
    const allCalled = activePlayers.every(i => newBets[i] >= toCall || newChips[i] === 0);
    if (allCalled && (action === 'call' || action === 'check' || action === 'fold')) {
      processingRef.current = true;
      const result = advancePhase(phase, deck, community, newPot, newBets, newChips, newFolded);
      if (result && result.done) return;
    } else {
      setCurrentBettor(next);
    }
  }, [chips, bets, folded, pot, toCall, phase, deck, community, players, n, advancePhase]); // eslint-disable-line

  // Bot action
  useEffect(() => {
    if (phase === 'showdown') return;
    if (!players[currentBettor]?.isBot) return;
    if (processingRef.current) return;
    if (folded[currentBettor]) return;
    const t = setTimeout(() => {
      const myToCall = Math.max(0, toCall - bets[currentBettor]);
      // A player already all-in (0 chips) has no further decision to make —
      // never let them "fold" away pot equity they no longer risk anything by keeping.
      const action = chips[currentBettor] === 0
        ? { action: 'call', amount: 0 }
        : botAction(holeCards[currentBettor], community, pot, myToCall, chips[currentBettor], players[currentBettor].botDifficulty);
      setMessage(`${players[currentBettor].name} ${action.action}s`);
      processAction(action, currentBettor);
    }, 700);
    return () => clearTimeout(t);
  }, [phase, currentBettor, folded]); // eslint-disable-line

  const humanAction = (action) => {
    const myToCall = Math.max(0, toCall - bets[currentBettor]);
    let actionObj = { action };
    if (action === 'call') actionObj.amount = myToCall;
    if (action === 'raise') actionObj = { action: 'raise', amount: raiseAmount - bets[currentBettor] };
    setMessage(`${players[currentBettor].name} ${action}s`);
    processAction(actionObj, currentBettor);
  };

  const startNewRound = () => {
    const newDealer = (dealerBtn + 1) % n;
    setDealerBtn(newDealer);
    const survivors = chips.filter(c => c > 0).length;
    if (survivors <= 1) { setGameOver(true); return; }
    initRound(newDealer, chips);
  };

  if (gameOver) {
    const maxChips = Math.max(...chips);
    const winnerIdx = chips.indexOf(maxChips);
    return (
      <div style={p.container}>
        <h2 style={p.title}>Poker — Game Over!</h2>
        <h3 style={{ color: '#f39c12' }}>{players[winnerIdx].name} wins!</h3>
        {chips.map((c, i) => <div key={i} style={p.row}>{players[i].name}: {c} chips</div>)}
        <button style={p.btn} onClick={onBack}>Back</button>
      </div>
    );
  }

  return (
    <div style={p.container}>
      <div style={p.header}>
        <button style={p.backBtn} onClick={onBack}>← Back</button>
        <h2 style={p.title}>♠ Texas Hold'em</h2>
        <span style={{ color: '#bdc3c7', fontSize: 14 }}>Pot: {pot} | Phase: {phase.toUpperCase()}</span>
      </div>

      {message && <div style={p.message}>{message}</div>}

      {/* Community cards */}
      <div style={p.communityArea}>
        <div style={{ color: '#bdc3c7', fontSize: 12, marginBottom: 6 }}>Community Cards</div>
        <div style={p.cardRow}>
          {community.map((c, i) => (
            <div key={i} style={{ ...p.card, color: cardColor(c) }}>{c.rank}{c.suit}</div>
          ))}
          {Array.from({ length: 5 - community.length }, (_, i) => (
            <div key={i} style={{ ...p.card, background: '#1e3a4a', border: '1px dashed #34495e', color: 'transparent' }}>?</div>
          ))}
        </div>
      </div>

      {/* Players */}
      <div style={p.playersGrid}>
        {players.map((pl, i) => {
          const isActive = i === currentBettor && phase !== 'showdown';
          return (
            <div key={i} style={{ ...p.playerBox, border: isActive ? '2px solid #f39c12' : '2px solid #34495e', opacity: folded[i] ? 0.4 : 1 }}>
              <div style={{ fontWeight: 'bold', fontSize: 13 }}>
                {pl.name} {i === dealerBtn ? '(D)' : ''} {folded[i] ? '(Folded)' : ''}
              </div>
              <div style={{ fontSize: 12, color: '#27ae60' }}>{chips[i]} chips</div>
              <div style={{ fontSize: 11, color: '#bdc3c7' }}>Bet: {bets[i]}</div>
              <div style={p.smallCardRow}>
                {(i === currentBettor && !pl?.isBot) || showdown ? (
                  holeCards[i]?.map((c, ci) => (
                    <div key={ci} style={{ ...p.smallCard, color: cardColor(c) }}>{c.rank}{c.suit}</div>
                  ))
                ) : (
                  holeCards[i]?.map((_, ci) => <div key={ci} style={{ ...p.smallCard, background: '#2c3e50' }}>?</div>)
                )}
              </div>
              {isActive && <div style={{ fontSize: 10, color: '#f39c12' }}>← TURN</div>}
            </div>
          );
        })}
      </div>

      {/* Human actions */}
      {!players[currentBettor]?.isBot && !folded[currentBettor] && phase !== 'showdown' && (
        <div style={p.actionArea}>
          <div style={{ color: '#bdc3c7', marginBottom: 8 }}>Your turn — To call: {Math.max(0, toCall - bets[currentBettor])}</div>
          <div style={p.actionBtns}>
            {/* An all-in player (0 chips) has nothing left to protect by folding or raising. */}
            {chips[currentBettor] > 0 && (
              <button style={{ ...p.btn, background: '#e74c3c' }} onClick={() => humanAction('fold')}>Fold</button>
            )}
            {toCall <= bets[currentBettor] ? (
              <button style={{ ...p.btn, background: '#27ae60' }} onClick={() => humanAction('check')}>Check</button>
            ) : (
              <button style={{ ...p.btn, background: '#3498db' }} onClick={() => humanAction('call')}>
                Call {Math.min(toCall - bets[currentBettor], chips[currentBettor])}
              </button>
            )}
            {chips[currentBettor] > 0 && (
              <button style={{ ...p.btn, background: '#e67e22' }} onClick={() => humanAction('raise')}>
                Raise to {raiseAmount}
              </button>
            )}
          </div>
          {chips[currentBettor] > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: '#bdc3c7' }}>Raise: {raiseAmount}</span>
              <input type="range" min={toCall * 2} max={chips[currentBettor] + bets[currentBettor]} value={raiseAmount}
                onChange={e => setRaiseAmount(+e.target.value)} style={{ flex: '1 1 140px', minWidth: 120, height: 32 }} />
            </div>
          )}
        </div>
      )}

      {phase === 'showdown' && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <div style={{ color: '#f39c12', fontSize: 18, marginBottom: 12 }}>{message}</div>
          <button style={p.btn} onClick={startNewRound}>Next Hand</button>
        </div>
      )}
    </div>
  );
}

const p = {
  container: { background: '#1a2634', minHeight: '100vh', padding: 16, color: '#ecf0f1', fontFamily: 'Arial, sans-serif', overflowX: 'hidden', boxSizing: 'border-box' },
  header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' },
  title: { margin: 0, fontSize: 22, color: '#f39c12', flex: 1 },
  backBtn: { background: '#7f8c8d', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', minHeight: 40, boxSizing: 'border-box' },
  btn: { background: '#e67e22', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14, margin: 4, minHeight: 42, boxSizing: 'border-box' },
  message: { background: '#2c3e50', color: '#f39c12', padding: '8px 16px', borderRadius: 8, marginBottom: 12, textAlign: 'center', fontWeight: 'bold' },
  communityArea: { textAlign: 'center', margin: '12px 0', background: '#0d6c3e', borderRadius: 12, padding: 12 },
  cardRow: { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' },
  card: { background: '#fff', borderRadius: 6, padding: '8px 12px', fontSize: 16, fontWeight: 'bold', minWidth: 44, textAlign: 'center', border: '1px solid #bdc3c7' },
  smallCard: { background: '#fff', borderRadius: 4, padding: '4px 6px', fontSize: 12, fontWeight: 'bold', border: '1px solid #bdc3c7' },
  playersGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))', gap: 8, margin: '12px 0' },
  playerBox: { background: '#2c3e50', borderRadius: 8, padding: 10, textAlign: 'center' },
  smallCardRow: { display: 'flex', gap: 4, justifyContent: 'center', marginTop: 6, flexWrap: 'wrap' },
  actionArea: { background: '#2c3e50', borderRadius: 8, padding: 12, marginTop: 8 },
  actionBtns: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  row: { padding: '6px 12px', margin: '4px 0', background: '#2c3e50', borderRadius: 6 },
};
