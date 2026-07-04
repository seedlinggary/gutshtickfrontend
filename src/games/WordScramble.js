import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';

const WORDS = {
  easy: ['APPLE','BREAD','CHAIR','DANCE','EARTH','FLAME','GRAPE','HEART','IMAGE','JUDGE','KNIFE','LEMON','MUSIC','NIGHT','OCEAN','PAINT','QUEEN','RIVER','SMILE','TIGER','UNCLE','VOICE','WATER','EXTRA','YOUNG','CRANE','DREAM','FROST','GHOST','HOUSE'],
  medium: ['BRIDGE','CASTLE','DANGER','FLIGHT','GARDEN','HAMMER','ISLAND','JUNGLE','KEEPER','LAUNCH','MARKET','NEEDLE','ORANGE','PILLOW','QUARTZ','RABBIT','SILVER','THRONE','UNIQUE','VALLEY','WEAPON','EXPORT','YELLOW','ZIPPER','CANYON','DESERT','FELINE','GROWTH','HUNTER','INSECT'],
  hard: ['BLANKET','CAPTAIN','DIAMOND','EASTERN','FEELING','GRAVITY','HARMONY','INFUSED','JOURNEY','KINGDOM','LANTERN','MORNING','NOWHERE','OPINION','PHANTOM','QUANTUM','RADIANT','SILENCE','THUNDER','UNBOUND','VERTIGO','WHISPER','ALCHEMY','BLOATED','CAPSULE','DEVOTED','ECLIPSE','FIGHTER','GLIMPSE'],
};

const TIMER = { easy: 60, medium: 45, hard: 30 };
const MULTIPLIER = { easy: 1, medium: 1.5, hard: 2 };
const TOTAL_ROUNDS = 10;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function scramble(word) {
  if (word.length <= 1) return word;
  let result;
  do {
    result = shuffle(word.split('')).join('');
  } while (result === word);
  return result;
}

function pickWord(diff, used) {
  const bank = WORDS[diff];
  const available = bank.filter(w => !used.has(w));
  const pool = available.length > 0 ? available : bank;
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function WordScramble() {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState(null);
  const [round, setRound] = useState(0);
  const [currentWord, setCurrentWord] = useState('');
  const [scrambled, setScrambled] = useState('');
  const [guess, setGuess] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [score, setScore] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [hintText, setHintText] = useState('');
  const [message, setMessage] = useState('');
  const [usedWords, setUsedWords] = useState(new Set());
  const timerRef = useRef(null);
  const inputRef = useRef(null);

  const saveScore = useCallback(async (result, sc, diff) => {
    if (!isLoggedIn()) return;
    const key = `game_result_word_scramble_${Date.now()}`;
    sessionStorage.setItem(key, '1');
    try {
      await apiRequest('POST', { game_type: 'word_scramble', result, difficulty: diff, score: sc }, '/game/save');
    } catch (_) {}
  }, []);

  const startGame = useCallback((diff) => {
    const used = new Set();
    const word = pickWord(diff, used);
    setDifficulty(diff);
    setRound(1);
    setCurrentWord(word);
    setScrambled(scramble(word));
    setGuess('');
    setTimeLeft(TIMER[diff]);
    setGameOver(false);
    setWon(false);
    setScore(0);
    setHintUsed(false);
    setHintText('');
    setMessage('');
    setUsedWords(new Set([word]));
  }, []);

  useEffect(() => {
    if (!difficulty || gameOver) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setGameOver(true);
          setWon(false);
          setMessage(`Time's up! The word was ${currentWord}.`);
          saveScore('loss', score, difficulty);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [difficulty, gameOver, currentWord, score, saveScore]);

  const nextRound = useCallback((newScore, newRound, diff) => {
    if (newRound > TOTAL_ROUNDS) {
      clearInterval(timerRef.current);
      setGameOver(true);
      setWon(true);
      setScore(newScore);
      setMessage(`You unscrambled all ${TOTAL_ROUNDS} words!`);
      saveScore('win', newScore, diff);
      return;
    }
    const newUsed = new Set(usedWords);
    const word = pickWord(diff, newUsed);
    newUsed.add(word);
    setUsedWords(newUsed);
    setCurrentWord(word);
    setScrambled(scramble(word));
    setRound(newRound);
    setGuess('');
    setHintText('');
    setTimeLeft(TIMER[diff]);
    clearInterval(timerRef.current);
    setScore(newScore);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [usedWords, saveScore]);

  const handleSubmit = useCallback(() => {
    if (gameOver || !guess.trim()) return;
    if (guess.toUpperCase() === currentWord) {
      setMessage('Correct!');
      const newScore = score + 10;
      setTimeout(() => {
        setMessage('');
        nextRound(newScore, round + 1, difficulty);
      }, 600);
    } else {
      setMessage('Try again!');
      setGuess('');
      setTimeout(() => setMessage(''), 1000);
    }
  }, [gameOver, guess, currentWord, score, round, difficulty, nextRound]);

  const useHint = () => {
    if (hintUsed || gameOver) return;
    setHintUsed(true);
    setHintText(`First letter: ${currentWord[0]}`);
  };

  const finalScore = Math.round(
    (10 - (hintUsed ? 1 : 0)) * (won ? TOTAL_ROUNDS : round - 1) * MULTIPLIER[difficulty || 'easy']
  );

  if (!difficulty) {
    return (
      <div className="game-page">
        <div className="gs-container">
          <div style={{ marginBottom: 16 }}>
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
          </div>
          <div className="game-header">
            <h1>Word Scramble</h1>
            <p style={{ color: 'var(--muted)' }}>Unscramble the word before time runs out. 10 rounds to win!</p>
          </div>
          <div className="difficulty-select">
            {['easy','medium','hard'].map(d => (
              <button key={d} className={`diff-btn diff-${d}`} onClick={() => startGame(d)}>
                <span className="diff-label">{d}</span>
                <span className="diff-sub">
                  {d === 'easy' && '4-5 letters · 60 seconds'}
                  {d === 'medium' && '5-7 letters · 45 seconds'}
                  {d === 'hard' && '7-10 letters · 30 seconds'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="game-page">
      <div className="gs-container">
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
          <span className={`diff-badge diff-${difficulty}`}>{difficulty}</span>
        </div>
        <div className="game-header">
          <h1>Word Scramble</h1>
          <div className="game-meta">
            <span>Round {Math.min(round, TOTAL_ROUNDS)}/{TOTAL_ROUNDS}</span>
            <span>Score: {score}</span>
            <span style={{ color: timeLeft <= 10 ? 'var(--danger)' : 'inherit' }}>⏱ {timeLeft}s</span>
            {hintUsed && <span className="hint-used">Hint used</span>}
          </div>
        </div>

        {!gameOver && (
          <>
            <div style={{ textAlign: 'center', margin: '24px 0 8px' }}>
              <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: 8, color: 'var(--accent)', fontFamily: 'monospace' }}>
                {scrambled}
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>Unscramble this word</div>
            </div>

            {hintText && <div className="game-msg info">{hintText}</div>}
            {message && <div className={`game-msg ${message === 'Correct!' ? 'success' : 'fail'}`}>{message}</div>}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
              <input
                ref={inputRef}
                type="text"
                value={guess}
                onChange={e => setGuess(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="Your answer..."
                autoFocus
                style={{ padding: '10px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 18, width: 220, textAlign: 'center', letterSpacing: 4 }}
              />
              <button className="gs-btn gs-btn-primary" onClick={handleSubmit}>Check</button>
            </div>
          </>
        )}

        {gameOver && (
          <>
            <div className={`game-msg ${won ? 'success' : 'fail'}`}>{message}</div>
            <div style={{ textAlign: 'center', margin: '8px 0', fontSize: 20, fontWeight: 700 }}>
              Final Score: {finalScore}
            </div>
          </>
        )}

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
