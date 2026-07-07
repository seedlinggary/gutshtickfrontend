import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiRequest from '../../ApiRequest';
import { isLoggedIn } from '../../auth';
import HowToPlay from '../HowToPlay';

const COLOR_LIST = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'white', 'pink'];
const COLOR_HEX = {
  red: '#e74c3c', blue: '#3498db', green: '#2ecc71', yellow: '#f1c40f',
  orange: '#e67e22', purple: '#9b59b6', white: '#ecf0f1', pink: '#e91e63',
};

const DIFFICULTY_CONFIG = {
  easy:   { positions: 4, colors: 6, maxGuesses: 10, allowRepeat: true },
  medium: { positions: 5, colors: 8, maxGuesses: 8,  allowRepeat: false },
  hard:   { positions: 6, colors: 8, maxGuesses: 6,  allowRepeat: true },
};

function generateSecret(positions, colors, allowRepeat) {
  const available = COLOR_LIST.slice(0, colors);
  const secret = [];
  for (let i = 0; i < positions; i++) {
    if (allowRepeat) {
      secret.push(available[Math.floor(Math.random() * available.length)]);
    } else {
      const pool = available.filter(c => !secret.includes(c));
      secret.push(pool[Math.floor(Math.random() * pool.length)]);
    }
  }
  return secret;
}

// Correct Mastermind peg scoring:
// Black peg = correct color in correct position.
// White peg = correct color in wrong position (not already counted as black).
function scorePegs(secret, guess) {
  let black = 0, white = 0;
  const sUsed = Array(secret.length).fill(false);
  const gUsed = Array(guess.length).fill(false);

  // First pass: count blacks (exact matches)
  for (let i = 0; i < secret.length; i++) {
    if (guess[i] === secret[i]) {
      black++;
      sUsed[i] = true;
      gUsed[i] = true;
    }
  }

  // Second pass: count whites (right color, wrong position)
  for (let i = 0; i < guess.length; i++) {
    if (gUsed[i]) continue; // already counted as black
    for (let j = 0; j < secret.length; j++) {
      if (!sUsed[j] && guess[i] === secret[j]) {
        white++;
        sUsed[j] = true; // mark secret color as used
        break;
      }
    }
  }

  return { black, white };
}

export default function Mastermind() {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState(null);
  const [config, setConfig] = useState(null);
  const [secret, setSecret] = useState([]);
  const [currentGuess, setCurrentGuess] = useState([]);
  const [guesses, setGuesses] = useState([]);
  const [selectedPos, setSelectedPos] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [won, setWon] = useState(false);
  const [lost, setLost] = useState(false);
  const [msg, setMsg] = useState('');

  const startGame = useCallback((diff) => {
    const cfg = DIFFICULTY_CONFIG[diff];
    setDifficulty(diff);
    setConfig(cfg);
    const s = generateSecret(cfg.positions, cfg.colors, cfg.allowRepeat);
    setSecret(s);
    setCurrentGuess(Array(cfg.positions).fill(null));
    setGuesses([]);
    setSelectedPos(0);
    setHintUsed(false);
    setWon(false);
    setLost(false);
    setMsg('');
  }, []);

  const handleColorClick = (color) => {
    if (won || lost || !config) return;
    const newGuess = [...currentGuess];
    newGuess[selectedPos] = color;
    setCurrentGuess(newGuess);
    // Auto-advance to next empty slot
    for (let i = selectedPos + 1; i < config.positions; i++) {
      if (!newGuess[i]) { setSelectedPos(i); return; }
    }
    // Wrap around to find first empty slot
    for (let i = 0; i < config.positions; i++) {
      if (!newGuess[i]) { setSelectedPos(i); return; }
    }
    // All slots filled — keep selection
  };

  const handleSubmit = () => {
    if (!config || won || lost) return;
    if (currentGuess.some(c => !c)) {
      setMsg('Fill all positions first!');
      return;
    }
    const { black, white } = scorePegs(secret, currentGuess);
    const newGuesses = [...guesses, { guess: [...currentGuess], black, white }];
    setGuesses(newGuesses);
    setCurrentGuess(Array(config.positions).fill(null));
    setSelectedPos(0);

    if (black === config.positions) {
      setWon(true);
      const score = Math.max(0, (config.maxGuesses - newGuesses.length + 1) * 100 - (hintUsed ? 100 : 0));
      setMsg(`Code cracked in ${newGuesses.length} guess${newGuesses.length === 1 ? '' : 'es'}! Score: ${score}`);
      if (isLoggedIn()) apiRequest('POST', { game_type: 'mastermind', result: 'win', difficulty, score }, '/game/save');
    } else if (newGuesses.length >= config.maxGuesses) {
      setLost(true);
      setMsg(`Out of guesses! The code was: ${secret.join(', ')}`);
      if (isLoggedIn()) apiRequest('POST', { game_type: 'mastermind', result: 'loss', difficulty, score: 0 }, '/game/save');
    } else {
      setMsg(`${black} black peg${black !== 1 ? 's' : ''}, ${white} white peg${white !== 1 ? 's' : ''}`);
    }
  };

  const handleHint = () => {
    if (hintUsed || won || lost || !config) return;
    setHintUsed(true);
    // Reveal the color at the currently selected position
    const pos = selectedPos < config.positions ? selectedPos : 0;
    const newGuess = [...currentGuess];
    newGuess[pos] = secret[pos];
    setCurrentGuess(newGuess);
    setMsg(`Hint: position ${pos + 1} is ${secret[pos]}`);
  };

  const availableColors = config ? COLOR_LIST.slice(0, config.colors) : [];

  if (!difficulty) {
    return (
      <div className="game-page">
        <div className="gs-container">
          <div className="game-header">
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
            <h1>Mastermind</h1>
          </div>
          <div className="gs-card" style={{ textAlign: 'center', padding: '2rem' }}>
            <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>
              Guess the secret color code. Black peg = right color, right position.
              White peg = right color, wrong position.
            </p>
            <div className="difficulty-select">
              {['easy', 'medium', 'hard'].map(d => (
                <button key={d} className={`diff-btn diff-${d}`} onClick={() => startGame(d)}>
                  <span className="diff-label">{d.charAt(0).toUpperCase() + d.slice(1)}</span>
                  <span className="diff-sub">
                    {d === 'easy' ? '4 slots, 6 colors, 10 guesses'
                      : d === 'medium' ? '5 slots, 8 colors, 8 guesses (no repeats)'
                      : '6 slots, 8 colors, 6 guesses'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="game-page">
      <div className="gs-container">
        <div className="game-header">
          <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
          <h1>Mastermind</h1>
          <span className={`diff-badge diff-${difficulty}`}>{difficulty}</span>
        </div>
        <HowToPlay>
          <p>Crack the secret color code — a hidden sequence of colored pegs — before you run out of guesses.</p>
          <ul>
            <li>After each guess, you get a black peg for every position where your guess has the exact right color in the exact right spot.</li>
            <li>You get a white peg for every guessed color that's correct but sitting in the wrong position (and not already counted as a black peg).</li>
            <li>The count of black and white pegs — not which slots they refer to — is your only clue, so use it to narrow down the code guess by guess.</li>
          </ul>
          <p>Click or tap a slot in your current guess to select it, then click/tap a color swatch to fill that slot — it auto-advances to the next empty slot. Once every slot is filled, tap Submit Guess. Hint reveals the correct color for the currently selected slot.</p>
        </HowToPlay>
        <div className="game-meta">
          <span>Guess {Math.min(guesses.length + 1, config.maxGuesses)}/{config.maxGuesses}</span>
          {hintUsed && <span className="hint-used" style={{ marginLeft: '1rem' }}>Hint used</span>}
        </div>
        {msg && <div className={`game-msg ${won ? 'success' : lost ? 'fail' : 'info'}`}>{msg}</div>}

        {/* Past guesses */}
        <div style={{ margin: '1rem 0' }}>
          {guesses.map((g, gi) => (
            <div key={gi} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap',
              backgroundColor: 'var(--surface)', padding: '0.5rem', borderRadius: 'var(--radius)',
            }}>
              <span style={{ minWidth: 24, color: 'var(--muted)', fontSize: '0.85rem' }}>#{gi + 1}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {g.guess.map((color, ci) => (
                  <div key={ci} style={{
                    width: 36, height: 36, borderRadius: '50%',
                    backgroundColor: COLOR_HEX[color], border: '2px solid rgba(0,0,0,0.2)',
                  }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 3, marginLeft: 'auto', flexWrap: 'wrap', maxWidth: 80 }}>
                {Array.from({ length: g.black }).map((_, i) => (
                  <div key={`b${i}`} style={{
                    width: 14, height: 14, borderRadius: '50%',
                    backgroundColor: '#222', border: '1px solid var(--border)',
                  }} />
                ))}
                {Array.from({ length: g.white }).map((_, i) => (
                  <div key={`w${i}`} style={{
                    width: 14, height: 14, borderRadius: '50%',
                    backgroundColor: '#eee', border: '1px solid var(--border)',
                  }} />
                ))}
                {g.black === 0 && g.white === 0 && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>No match</span>
                )}
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)', minWidth: 70 }}>
                {g.black} black, {g.white} white
              </span>
            </div>
          ))}
        </div>

        {/* Current guess input */}
        {!won && !lost && (
          <div className="gs-card" style={{ padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
              Current guess — click a slot to select it, then pick a color:
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: '1rem', flexWrap: 'wrap' }}>
              {currentGuess.map((color, i) => (
                <div key={i} onClick={() => setSelectedPos(i)} style={{
                  width: 42, height: 42, borderRadius: '50%', cursor: 'pointer',
                  backgroundColor: color ? COLOR_HEX[color] : 'var(--bg)',
                  border: `3px solid ${i === selectedPos ? 'var(--accent)' : 'var(--border)'}`,
                  boxShadow: i === selectedPos ? '0 0 0 2px var(--accent)' : 'none',
                  transition: 'all 0.1s',
                }} />
              ))}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
              Choose color:
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {availableColors.map(color => (
                <div key={color} onClick={() => handleColorClick(color)} title={color} style={{
                  width: 38, height: 38, borderRadius: '50%', cursor: 'pointer',
                  backgroundColor: COLOR_HEX[color],
                  border: `3px solid ${currentGuess[selectedPos] === color ? 'var(--accent)' : 'rgba(0,0,0,0.2)'}`,
                  transition: 'transform 0.1s',
                }}
                  onMouseOver={e => e.currentTarget.style.transform = 'scale(1.15)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                />
              ))}
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
              <button className="gs-btn gs-btn-primary" onClick={handleSubmit}
                disabled={currentGuess.some(c => !c)}>
                Submit Guess
              </button>
              <button className="gs-btn gs-btn-outline gs-btn-sm"
                onClick={() => setCurrentGuess(Array(config.positions).fill(null))}>
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Show secret when lost */}
        {lost && (
          <div className="gs-card" style={{ padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
              The secret code was:
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {secret.map((color, i) => (
                <div key={i} style={{
                  width: 42, height: 42, borderRadius: '50%',
                  backgroundColor: COLOR_HEX[color], border: '2px solid rgba(0,0,0,0.2)',
                }} />
              ))}
            </div>
          </div>
        )}

        <div className="game-controls">
          {!hintUsed && !won && !lost && (
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={handleHint}>Hint</button>
          )}
          {(won || lost) ? (
            <>
              <button className="gs-btn gs-btn-primary" onClick={() => startGame(difficulty)}>Play Again</button>
              <button className="gs-btn gs-btn-outline" onClick={() => setDifficulty(null)}>Change Difficulty</button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
