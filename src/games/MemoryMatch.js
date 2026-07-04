import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';

const EMOJIS = ['🎸','🌍','🎯','🏆','🎪','🎨','🦊','🦁','🐉','🌈'];

const CONFIGS = {
  easy:   { pairs: 6,  cols: 4, timer: null },
  medium: { pairs: 8,  cols: 4, timer: 90 },
  hard:   { pairs: 10, cols: 5, timer: 60 },
};

function buildCards(pairs) {
  const emojis = EMOJIS.slice(0, pairs);
  const doubled = [...emojis, ...emojis];
  for (let i = doubled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [doubled[i], doubled[j]] = [doubled[j], doubled[i]];
  }
  return doubled.map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }));
}

export default function MemoryMatch() {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState(null);
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [locked, setLocked] = useState(false);
  const [pairsMatched, setPairsMatched] = useState(0);
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [score, setScore] = useState(0);
  const timerRef = useRef(null);

  const saveScore = useCallback(async (result, sc, diff) => {
    if (!isLoggedIn()) return;
    const key = `game_result_memory_match_${Date.now()}`;
    sessionStorage.setItem(key, '1');
    try {
      await apiRequest('POST', { game_type: 'memory_match', result, difficulty: diff, score: sc }, '/game/save');
    } catch (_) {}
  }, []);

  const startGame = useCallback((diff) => {
    const cfg = CONFIGS[diff];
    const newCards = buildCards(cfg.pairs);
    setDifficulty(diff);
    setCards(newCards);
    setFlipped([]);
    setLocked(false);
    setPairsMatched(0);
    setMoves(0);
    setTimeLeft(cfg.timer);
    setGameOver(false);
    setWon(false);
    setHintUsed(false);
    setScore(0);
  }, []);

  useEffect(() => {
    if (!difficulty || gameOver || CONFIGS[difficulty].timer === null) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setGameOver(true);
          setWon(false);
          saveScore('loss', pairsMatched * 10, difficulty);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [difficulty, gameOver, pairsMatched, saveScore]);

  const handleCardClick = useCallback((id) => {
    if (locked || gameOver) return;
    setCards(prev => {
      const card = prev.find(c => c.id === id);
      if (!card || card.flipped || card.matched) return prev;
      return prev.map(c => c.id === id ? { ...c, flipped: true } : c);
    });
    setFlipped(prev => {
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });
  }, [locked, gameOver]);

  useEffect(() => {
    if (flipped.length !== 2) return;
    setLocked(true);
    setMoves(m => m + 1);
    const [a, b] = flipped;
    const cardA = cards.find(c => c.id === a);
    const cardB = cards.find(c => c.id === b);
    if (cardA && cardB && cardA.emoji === cardB.emoji) {
      const newPairs = pairsMatched + 1;
      const newCards = cards.map(c =>
        c.id === a || c.id === b ? { ...c, matched: true } : c
      );
      setCards(newCards);
      setPairsMatched(newPairs);
      setFlipped([]);
      setLocked(false);
      const totalPairs = CONFIGS[difficulty].pairs;
      if (newPairs === totalPairs) {
        clearInterval(timerRef.current);
        const finalScore = newPairs * 10 + (timeLeft || 0);
        setScore(finalScore);
        setGameOver(true);
        setWon(true);
        saveScore('win', finalScore, difficulty);
      }
    } else {
      setTimeout(() => {
        setCards(prev => prev.map(c =>
          c.id === a || c.id === b ? { ...c, flipped: false } : c
        ));
        setFlipped([]);
        setLocked(false);
      }, 1000);
    }
  }, [flipped, cards, pairsMatched, difficulty, timeLeft, saveScore]);

  const useHint = () => {
    if (hintUsed || gameOver) return;
    setHintUsed(true);
    setLocked(true);
    setCards(prev => prev.map(c => c.matched ? c : { ...c, flipped: true }));
    setTimeout(() => {
      setCards(prev => prev.map(c => c.matched ? c : { ...c, flipped: false }));
      setLocked(false);
    }, 1000);
  };

  if (!difficulty) {
    return (
      <div className="game-page">
        <div className="gs-container">
          <div style={{ marginBottom: 16 }}>
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
          </div>
          <div className="game-header">
            <h1>Memory Match</h1>
            <p style={{ color: 'var(--muted)' }}>Flip cards to find matching emoji pairs.</p>
          </div>
          <div className="difficulty-select">
            {['easy','medium','hard'].map(d => (
              <button key={d} className={`diff-btn diff-${d}`} onClick={() => startGame(d)}>
                <span className="diff-label">{d}</span>
                <span className="diff-sub">
                  {d === 'easy' && '4×3 grid · 6 pairs · no timer'}
                  {d === 'medium' && '4×4 grid · 8 pairs · 90s timer'}
                  {d === 'hard' && '5×4 grid · 10 pairs · 60s timer'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const cfg = CONFIGS[difficulty];
  const finalScore = won ? score : pairsMatched * 10 + (timeLeft || 0);

  return (
    <div className="game-page">
      <div className="gs-container">
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
          <span className={`diff-badge diff-${difficulty}`}>{difficulty}</span>
        </div>
        <div className="game-header">
          <h1>Memory Match</h1>
          <div className="game-meta">
            <span>Pairs: {pairsMatched}/{cfg.pairs}</span>
            <span>Moves: {moves}</span>
            {cfg.timer !== null && (
              <span style={{ color: timeLeft <= 15 ? 'var(--danger)' : 'inherit' }}>⏱ {timeLeft}s</span>
            )}
            {hintUsed && <span className="hint-used">Hint used</span>}
          </div>
        </div>

        {gameOver && (
          <div className={`game-msg ${won ? 'success' : 'fail'}`}>
            {won ? `You matched all pairs! Score: ${finalScore}` : `Time's up! You matched ${pairsMatched} pairs.`}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cfg.cols}, 1fr)`, gap: 8, margin: '16px auto' }}>
            {cards.map(card => (
              <div
                key={card.id}
                onClick={() => !card.flipped && !card.matched && handleCardClick(card.id)}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 'var(--radius-sm)',
                  border: `2px solid ${card.matched ? 'var(--success)' : 'var(--border)'}`,
                  background: card.flipped || card.matched ? 'var(--surface)' : 'var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                  cursor: card.flipped || card.matched || gameOver ? 'default' : 'pointer',
                  transition: 'background .15s, transform .1s',
                  opacity: card.matched ? 0.5 : 1,
                  transform: card.flipped ? 'scale(1.05)' : 'scale(1)',
                  userSelect: 'none',
                }}
              >
                {(card.flipped || card.matched) ? card.emoji : ''}
              </div>
            ))}
          </div>
        </div>

        <div className="game-controls">
          {!gameOver && !hintUsed && (
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={useHint}>Use Hint</button>
          )}
          {gameOver && (
            <>
              <button className="gs-btn gs-btn-primary" onClick={() => startGame(difficulty)}>Play Again</button>
              <button className="gs-btn gs-btn-outline" onClick={() => setDifficulty(null)}>Change Difficulty</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
