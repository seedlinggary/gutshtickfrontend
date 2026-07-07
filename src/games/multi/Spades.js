import React, { useState, useEffect, useCallback, useRef } from 'react';
import HowToPlay from '../HowToPlay';

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANK_VALUES = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, value: RANK_VALUES[rank] });
    }
  }
  return deck;
}

function shuffleDeck(deck) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function cardKey(card) { return card.suit + card.rank; }

function cardDisplay(card) {
  const color = (card.suit === '♥' || card.suit === '♦') ? '#c0392b' : '#2c3e50';
  return { color };
}

function isSpade(card) { return card.suit === '♠'; }

function getWinnerIndex(trick, ledSuit) {
  let best = 0;
  for (let i = 1; i < trick.length; i++) {
    const curr = trick[i];
    const bestCard = trick[best];
    if (isSpade(curr) && !isSpade(bestCard)) { best = i; continue; }
    if (!isSpade(curr) && isSpade(bestCard)) continue;
    if (curr.suit === bestCard.suit && curr.value > bestCard.value) best = i;
    else if (curr.suit !== bestCard.suit && !isSpade(curr) && curr.suit === ledSuit && bestCard.suit !== ledSuit) best = i;
  }
  return best;
}

function botBid(hand, difficulty) {
  let expected = 0;
  for (const c of hand) {
    if (c.rank === 'A') expected += 1;
    else if (c.rank === 'K') expected += 0.7;
    else if (c.rank === 'Q') expected += 0.4;
    else if (isSpade(c)) expected += 0.3;
  }
  expected = Math.round(expected);
  if (difficulty === 'easy') {
    const offset = Math.floor(Math.random() * 3) - 1;
    expected = Math.max(0, Math.min(13, expected + offset));
  }
  return expected;
}

function botChooseCard(hand, trick, ledSuit, spadesbroken, partnerBid, myBid, tricksTaken, partnerTricks, difficulty) {
  const validCards = getValidCards(hand, trick, ledSuit, spadesbroken);
  if (difficulty === 'easy' || validCards.length === 1) {
    return validCards[Math.floor(Math.random() * validCards.length)];
  }
  // medium/hard: try to win if needed, else play low
  const spades = validCards.filter(isSpade);
  const nonSpades = validCards.filter(c => !isSpade(c));
  if (trick.length === 0) {
    // leading: play highest non-spade
    const sorted = [...nonSpades].sort((a, b) => b.value - a.value);
    return sorted[0] || validCards[0];
  }
  // following: win if possible, else dump lowest
  const currentWinner = trick.length > 0 ? trick[getWinnerIndex(trick, ledSuit)] : null;
  const canWin = validCards.some(c => {
    const mock = [...trick, c];
    return getWinnerIndex(mock, ledSuit) === mock.length - 1;
  });
  if (canWin && difficulty === 'hard') {
    const winners = validCards.filter(c => {
      const mock = [...trick, c];
      return getWinnerIndex(mock, ledSuit) === mock.length - 1;
    });
    return winners.sort((a, b) => a.value - b.value)[0];
  }
  return [...validCards].sort((a, b) => a.value - b.value)[0];
}

function getValidCards(hand, trick, ledSuit, spadesBroken) {
  if (trick.length === 0) {
    // leading
    if (!spadesBroken && hand.some(c => !isSpade(c))) {
      return hand.filter(c => !isSpade(c));
    }
    return hand;
  }
  // following
  const inSuit = hand.filter(c => c.suit === ledSuit);
  if (inSuit.length > 0) return inSuit;
  return hand;
}

export default function Spades({ players, onBack }) {
  const [phase, setPhase] = useState('setup'); // setup, bidding, playing, roundEnd, gameEnd
  const [hands, setHands] = useState([[], [], [], []]);
  const [bids, setBids] = useState([null, null, null, null]);
  const [currentBidder, setCurrentBidder] = useState(0);
  const [currentBid, setCurrentBid] = useState(0);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [trick, setTrick] = useState([]);
  const [ledSuit, setLedSuit] = useState(null);
  const [spadesBroken, setSpadesBroken] = useState(false);
  const [tricksTaken, setTricksTaken] = useState([0, 0, 0, 0]);
  const [scores, setScores] = useState([[0, 0], [0, 0]]); // [NS, EW] [score, bags]
  const [roundHistory, setRoundHistory] = useState([]);
  const [trickLog, setTrickLog] = useState([]);
  const [dealerIndex, setDealerIndex] = useState(0);
  const [showTrick, setShowTrick] = useState(false);
  const [lastTrickWinner, setLastTrickWinner] = useState(null);
  const processingRef = useRef(false);

  // Ensure 4 players
  const gamePlayers = players.slice(0, 4);
  while (gamePlayers.length < 4) {
    gamePlayers.push({ name: `Bot ${gamePlayers.length + 1}`, isBot: true, botDifficulty: 'easy' });
  }

  const startRound = useCallback(() => {
    const deck = shuffleDeck(createDeck());
    const newHands = [deck.slice(0, 13), deck.slice(13, 26), deck.slice(26, 39), deck.slice(39, 52)];
    setHands(newHands);
    setBids([null, null, null, null]);
    setCurrentBidder((dealerIndex + 1) % 4);
    setTricksTaken([0, 0, 0, 0]);
    setTrick([]);
    setLedSuit(null);
    setSpadesBroken(false);
    setTrickLog([]);
    setPhase('bidding');
  }, [dealerIndex]);

  useEffect(() => {
    startRound();
  }, []); // eslint-disable-line

  // Bot bidding
  useEffect(() => {
    if (phase !== 'bidding') return;
    if (!gamePlayers[currentBidder]?.isBot) return;
    const t = setTimeout(() => {
      const bid = botBid(hands[currentBidder], gamePlayers[currentBidder].botDifficulty);
      handleBid(bid);
    }, 700);
    return () => clearTimeout(t);
  }, [phase, currentBidder, hands]); // eslint-disable-line

  const handleBid = useCallback((bid) => {
    const newBids = [...bids];
    newBids[currentBidder] = bid;
    setBids(newBids);
    const next = (currentBidder + 1) % 4;
    if (next === (dealerIndex + 1) % 4 && newBids.every(b => b !== null)) {
      // all have bid
      setBids(newBids);
      setCurrentPlayer((dealerIndex + 1) % 4);
      setPhase('playing');
    } else {
      setCurrentBidder(next);
    }
  }, [bids, currentBidder, dealerIndex]);

  // Bot playing
  useEffect(() => {
    if (phase !== 'playing') return;
    if (!gamePlayers[currentPlayer]?.isBot) return;
    if (processingRef.current) return;
    const t = setTimeout(() => {
      if (processingRef.current) return;
      const hand = hands[currentPlayer];
      const card = botChooseCard(hand, trick, ledSuit, spadesBroken,
        bids[(currentPlayer + 2) % 4], bids[currentPlayer],
        tricksTaken[currentPlayer], tricksTaken[(currentPlayer + 2) % 4],
        gamePlayers[currentPlayer].botDifficulty
      );
      playCard(card);
    }, 700);
    return () => clearTimeout(t);
  }, [phase, currentPlayer, trick]); // eslint-disable-line

  const playCard = useCallback((card) => {
    if (processingRef.current) return;
    const newHand = hands[currentPlayer].filter(c => cardKey(c) !== cardKey(card));
    const newTrick = [...trick, { ...card, playerIndex: currentPlayer }];
    const newLedSuit = trick.length === 0 ? card.suit : ledSuit;
    const newSpadesBroken = spadesBroken || isSpade(card);

    const newHands = [...hands];
    newHands[currentPlayer] = newHand;
    setHands(newHands);
    setTrick(newTrick);
    setLedSuit(newLedSuit);
    setSpadesBroken(newSpadesBroken);

    if (newTrick.length === 4) {
      processingRef.current = true;
      setShowTrick(true);
      setTimeout(() => {
        const winnerOffset = getWinnerIndex(newTrick, newLedSuit);
        const winnerPlayer = newTrick[winnerOffset].playerIndex;
        const newTricksTaken = [...tricksTaken];
        newTricksTaken[winnerPlayer]++;
        setTricksTaken(newTricksTaken);
        setLastTrickWinner(winnerPlayer);
        setTrickLog(prev => [...prev, { trick: newTrick, winner: winnerPlayer, ledSuit: newLedSuit }]);
        setTrick([]);
        setLedSuit(null);
        setShowTrick(false);

        if (newTricksTaken.reduce((a, b) => a + b, 0) === 13) {
          // round over
          const newScores = scoreRound(bids, newTricksTaken, scores);
          setScores(newScores.scores);
          setRoundHistory(prev => [...prev, { bids, tricksTaken: newTricksTaken, scores: newScores.scores }]);
          setDealerIndex(prev => (prev + 1) % 4);
          processingRef.current = false;
          // check game over
          if (newScores.scores[0][0] >= 500 || newScores.scores[1][0] >= 500 ||
            newScores.scores[0][0] <= -200 || newScores.scores[1][0] <= -200) {
            setPhase('gameEnd');
          } else {
            setPhase('roundEnd');
          }
        } else {
          setCurrentPlayer(winnerPlayer);
          processingRef.current = false;
        }
      }, 1200);
    } else {
      setCurrentPlayer((currentPlayer + 1) % 4);
    }
  }, [hands, currentPlayer, trick, ledSuit, spadesBroken, tricksTaken, bids, scores]);

  function scoreRound(bids, tricksTaken, prevScores) {
    const newScores = [
      [...prevScores[0]],
      [...prevScores[1]],
    ];
    // NS = players 0,2; EW = players 1,3
    const partnerships = [[0, 2], [1, 3]];
    for (let p = 0; p < 2; p++) {
      const [p1, p2] = partnerships[p];
      const bid1 = bids[p1], bid2 = bids[p2];
      const taken1 = tricksTaken[p1], taken2 = tricksTaken[p2];

      // Nil handling
      let nilBonus = 0;
      if (bid1 === 0) nilBonus += taken1 === 0 ? 100 : -100;
      if (bid2 === 0) nilBonus += taken2 === 0 ? 100 : -100;

      const effectiveBid = (bid1 === 0 ? 0 : bid1) + (bid2 === 0 ? 0 : bid2);
      const effectiveTaken = (bid1 === 0 ? 0 : taken1) + (bid2 === 0 ? 0 : taken2);

      let roundScore = nilBonus;
      if (effectiveBid > 0) {
        if (effectiveTaken >= effectiveBid) {
          roundScore += 10 * effectiveBid;
          const bags = effectiveTaken - effectiveBid;
          newScores[p][1] += bags;
          roundScore += bags;
          while (newScores[p][1] >= 10) {
            roundScore -= 100;
            newScores[p][1] -= 10;
          }
        } else {
          roundScore -= 10 * effectiveBid;
        }
      }
      newScores[p][0] += roundScore;
    }
    return { scores: newScores };
  }

  const humanCanPlay = (card) => {
    if (phase !== 'playing') return false;
    if (gamePlayers[currentPlayer]?.isBot) return false;
    const valid = getValidCards(hands[currentPlayer], trick, ledSuit, spadesBroken);
    return valid.some(c => cardKey(c) === cardKey(card));
  };

  const positionNames = ['South (You)', 'West', 'North', 'East'];

  if (phase === 'roundEnd') {
    return (
      <div style={styles.container}>
        <h2 style={styles.title}>Round Over</h2>
        <div style={styles.scoreBoard}>
          <div style={styles.scoreTeam}>
            <h3>North/South ({gamePlayers[0].name} & {gamePlayers[2].name})</h3>
            <p>Score: {scores[0][0]} | Bags: {scores[0][1]}</p>
          </div>
          <div style={styles.scoreTeam}>
            <h3>East/West ({gamePlayers[1].name} & {gamePlayers[3].name})</h3>
            <p>Score: {scores[1][0]} | Bags: {scores[1][1]}</p>
          </div>
        </div>
        <button style={styles.btn} onClick={startRound}>Next Round</button>
        <button style={{ ...styles.btn, background: '#7f8c8d' }} onClick={onBack}>Quit</button>
      </div>
    );
  }

  if (phase === 'gameEnd') {
    const winner = scores[0][0] > scores[1][0] ? 'North/South' : 'East/West';
    return (
      <div style={styles.container}>
        <h2 style={styles.title}>Game Over!</h2>
        <h3 style={{ color: '#f39c12' }}>{winner} Wins!</h3>
        <div style={styles.scoreBoard}>
          <div style={styles.scoreTeam}>
            <h3>North/South</h3>
            <p>Final Score: {scores[0][0]}</p>
          </div>
          <div style={styles.scoreTeam}>
            <h3>East/West</h3>
            <p>Final Score: {scores[1][0]}</p>
          </div>
        </div>
        <button style={styles.btn} onClick={onBack}>Back to Menu</button>
      </div>
    );
  }

  if (phase === 'setup') {
    return <div style={styles.container}><p>Setting up...</p></div>;
  }

  const trickCards = [...trick];
  while (trickCards.length < 4) trickCards.push(null);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>← Back</button>
        <h2 style={styles.title}>♠ Spades</h2>
        <div style={styles.scores}>
          <span>N/S: {scores[0][0]} ({scores[0][1]} bags)</span>
          <span style={{ marginLeft: 16 }}>E/W: {scores[1][0]} ({scores[1][1]} bags)</span>
        </div>
      </div>

      <HowToPlay>
        <p>Spades is played in two fixed partnerships: North &amp; South vs. East &amp; West. Be the first team to reach 500 points to win — but if your team's score ever drops to -200, you lose instantly.</p>
        <p><strong>Turns:</strong> This build only shows your own hand face-up (you always sit "South"); the other three seats are played by bots, shown face-down. Bidding rotates starting left of the dealer, then trick-play starts with the same player.</p>
        <p><strong>How it works:</strong></p>
        <ul>
          <li>Each round, all 13 cards of a full deck are dealt out (13 per player).</li>
          <li>Bidding: each player bids how many of the 13 tricks they think their side will take, from 0 ("Nil") up to 13.</li>
          <li>Trick play: follow the led suit if you can. Spades can't be led until someone has been forced to play one ("spades broken").</li>
          <li>Scoring is per partnership: if your team's combined tricks meet your combined bid, you score 10 points per bid trick plus 1 point per extra trick ("bag"); missing your bid costs 10 points per bid trick.</li>
          <li>Ten accumulated bags cost your team a 100-point penalty.</li>
          <li>A Nil bid (0) scores +100 if you take zero tricks the whole round, or -100 if you take even one.</li>
        </ul>
        <p><strong>Play:</strong> Tap a bid button (or "Nil") during bidding. During play, tap a highlighted card in your hand — only cards that are legal to play right now are enabled; illegal ones are dimmed.</p>
      </HowToPlay>

      {phase === 'bidding' && (
        <div style={styles.biddingArea}>
          <h3>Bidding Phase</h3>
          <div style={styles.bidsDisplay}>
            {gamePlayers.map((p, i) => (
              <div key={i} style={{ ...styles.bidSlot, background: i === currentBidder ? '#2980b9' : '#34495e' }}>
                <div>{p.name}</div>
                <div>{bids[i] !== null ? `Bid: ${bids[i]}` : (i === currentBidder ? '...' : 'Waiting')}</div>
              </div>
            ))}
          </div>
          {!gamePlayers[currentBidder]?.isBot && (
            <div style={styles.bidInput}>
              <p>Your bid ({gamePlayers[currentBidder].name}):</p>
              <div style={styles.bidButtons}>
                {Array.from({ length: 14 }, (_, i) => (
                  <button key={i} style={{ ...styles.bidBtn, background: currentBid === i ? '#e67e22' : '#2c3e50' }}
                    onClick={() => setCurrentBid(i)}>{i === 0 ? 'Nil' : i}</button>
                ))}
              </div>
              <button style={styles.btn} onClick={() => handleBid(currentBid)}>Confirm Bid</button>
            </div>
          )}
          {gamePlayers[currentBidder]?.isBot && (
            <p style={{ color: '#bdc3c7' }}>{gamePlayers[currentBidder].name} is thinking...</p>
          )}
        </div>
      )}

      {phase === 'playing' && (
        <>
          <div style={styles.playersAround}>
            {/* North (player 2) */}
            <div style={styles.northPlayer}>
              <span style={{ fontSize: 12, color: '#bdc3c7' }}>
                {gamePlayers[2].name} | Bid: {bids[2]} | Tricks: {tricksTaken[2]}
              </span>
              <div style={styles.faceDownHand}>
                {hands[2].map((_, i) => <div key={i} style={styles.faceDownCard} />)}
              </div>
            </div>
          </div>

          <div style={styles.middleRow}>
            {/* West (player 1) */}
            <div style={styles.sidePlayer}>
              <span style={{ fontSize: 12, color: '#bdc3c7', display: 'block', marginBottom: 4 }}>
                {gamePlayers[1].name}<br />Bid: {bids[1]} | T: {tricksTaken[1]}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {hands[1].map((_, i) => <div key={i} style={{ ...styles.faceDownCard, width: 30, height: 20 }} />)}
              </div>
            </div>

            {/* Center trick area */}
            <div style={styles.trickArea}>
              <h4 style={{ color: '#bdc3c7', margin: '0 0 8px' }}>
                {currentPlayer !== null ? `${gamePlayers[currentPlayer].name}'s turn` : ''}
              </h4>
              <div style={styles.trickGrid}>
                {[2, 1, 0, 3].map((pIdx) => {
                  const played = trick.find(c => c.playerIndex === pIdx);
                  return (
                    <div key={pIdx} style={styles.trickSlot}>
                      <span style={{ fontSize: 10, color: '#95a5a6' }}>{['S', 'W', 'N', 'E'][pIdx]}</span>
                      {played ? (
                        <div style={{ ...styles.card, color: cardDisplay(played).color }}>
                          {played.rank}{played.suit}
                        </div>
                      ) : <div style={{ ...styles.card, background: 'transparent', border: '1px dashed #555' }} />}
                    </div>
                  );
                })}
              </div>
              {lastTrickWinner !== null && trick.length === 0 && (
                <div style={{ fontSize: 12, color: '#f39c12', marginTop: 4 }}>
                  {gamePlayers[lastTrickWinner].name} won last trick
                </div>
              )}
              {spadesBroken && <div style={{ fontSize: 11, color: '#9b59b6', marginTop: 4 }}>♠ Spades broken</div>}
            </div>

            {/* East (player 3) */}
            <div style={styles.sidePlayer}>
              <span style={{ fontSize: 12, color: '#bdc3c7', display: 'block', marginBottom: 4 }}>
                {gamePlayers[3].name}<br />Bid: {bids[3]} | T: {tricksTaken[3]}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {hands[3].map((_, i) => <div key={i} style={{ ...styles.faceDownCard, width: 30, height: 20 }} />)}
              </div>
            </div>
          </div>

          {/* South (player 0 = human) */}
          <div style={styles.southArea}>
            <div style={styles.playerInfo}>
              {gamePlayers[0].name} | Bid: {bids[0] !== null ? bids[0] : '?'} | Tricks: {tricksTaken[0]}
              {currentPlayer === 0 && !gamePlayers[0].isBot && (
                <span style={{ color: '#f39c12', marginLeft: 8 }}>← Your Turn!</span>
              )}
            </div>
            <div style={styles.handScroll}>
              <div style={styles.hand}>
                {[...hands[0]].sort((a, b) => {
                  if (a.suit !== b.suit) return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
                  return a.value - b.value;
                }).map((card, i) => {
                  const valid = humanCanPlay(card);
                  return (
                    <div key={cardKey(card)}
                      style={{
                        ...styles.card,
                        color: cardDisplay(card).color,
                        opacity: (currentPlayer === 0 && !gamePlayers[0].isBot && !valid) ? 0.4 : 1,
                        cursor: valid ? 'pointer' : 'default',
                        transform: `translateY(${i % 2 === 0 ? 0 : -5}px)`,
                        boxShadow: valid ? '0 0 8px #f39c12' : '2px 2px 4px rgba(0,0,0,0.3)',
                      }}
                      onClick={() => valid && playCard(card)}
                    >
                      <span style={{ fontSize: 12, fontWeight: 'bold' }}>{card.rank}</span>
                      <span style={{ fontSize: 14 }}>{card.suit}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      <div style={styles.trickLogArea}>
        {trickLog.slice(-3).map((t, i) => (
          <div key={i} style={{ fontSize: 11, color: '#95a5a6' }}>
            Trick won by {gamePlayers[t.winner].name}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: { background: '#1a2634', minHeight: '100vh', padding: 16, color: '#ecf0f1', fontFamily: 'Arial, sans-serif', display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12, flexWrap: 'wrap' },
  title: { margin: 0, fontSize: 24, color: '#f39c12' },
  backBtn: { background: '#7f8c8d', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', minHeight: 40 },
  scores: { display: 'flex', gap: 8, fontSize: 14, color: '#bdc3c7', flexWrap: 'wrap' },
  btn: { background: '#e67e22', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 16, margin: 8, minHeight: 44 },
  biddingArea: { textAlign: 'center', padding: 16 },
  bidsDisplay: { display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 },
  bidSlot: { padding: '12px 16px', borderRadius: 8, minWidth: 100, textAlign: 'center' },
  bidInput: { marginTop: 16 },
  bidButtons: { display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 12 },
  bidBtn: { color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 6, cursor: 'pointer', minWidth: 44, minHeight: 40 },
  scoreBoard: { display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' },
  scoreTeam: { background: '#2c3e50', padding: 16, borderRadius: 8, minWidth: 200 },
  northPlayer: { textAlign: 'center', marginBottom: 8 },
  faceDownHand: { display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' },
  faceDownCard: { width: 24, height: 36, background: '#2c3e50', border: '1px solid #34495e', borderRadius: 3 },
  middleRow: { display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', flex: 1, flexWrap: 'wrap' },
  sidePlayer: { textAlign: 'center' },
  trickArea: { background: '#0d6c3e', border: '2px solid #1a8a50', borderRadius: 12, padding: 16, minWidth: 220, textAlign: 'center' },
  trickGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxWidth: 180, margin: '0 auto' },
  trickSlot: { textAlign: 'center' },
  southArea: { marginTop: 12 },
  playerInfo: { fontSize: 14, color: '#bdc3c7', marginBottom: 8, textAlign: 'center' },
  handScroll: { overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 4 },
  hand: { display: 'flex', flexWrap: 'nowrap', gap: 4, justifyContent: 'center', width: 'max-content', margin: '0 auto' },
  card: { background: '#fff', color: '#2c3e50', border: '1px solid #bdc3c7', borderRadius: 6, padding: '6px 8px', minWidth: 44, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: 16, cursor: 'default', transition: 'transform 0.1s, box-shadow 0.1s', flexShrink: 0 },
  trickLogArea: { position: 'fixed', bottom: 16, right: 16, textAlign: 'right' },
};
