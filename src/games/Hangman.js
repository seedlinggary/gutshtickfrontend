import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';

const WORD_BANK = {
  easy: ['apple', 'beach', 'cloud', 'dance', 'eagle', 'flame', 'grape', 'happy', 'input', 'jumpy',
    'kite', 'lemon', 'mango', 'night', 'ocean', 'piano', 'queen', 'river', 'smile', 'tiger',
    'under', 'vivid', 'water', 'xylophone', 'yacht', 'zebra', 'brave', 'candy', 'dream', 'ember'],
  medium: ['abstract', 'blanket', 'captain', 'dolphin', 'element', 'factory', 'gateway', 'harvest',
    'imagine', 'journey', 'kitchen', 'lantern', 'machine', 'network', 'outside', 'pattern',
    'quality', 'rainbow', 'student', 'thunder', 'uniform', 'venture', 'whisper', 'expired',
    'younger', 'zipcode', 'ancient', 'battery', 'cabinet', 'darkest'],
  hard: ['algorithm', 'brilliant', 'challenge', 'democracy', 'elaborate', 'framework', 'glamorous',
    'hypothesis', 'important', 'javascript', 'knowledge', 'longitude', 'magnitude', 'necessary',
    'orchestra', 'philosophy', 'quotient', 'revolution', 'signature', 'territory',
    'unanimous', 'vulnerable', 'wavelength', 'xenophobia', 'yesterday', 'zoologist',
    'absolution', 'bureaucrat', 'cathedral', 'dexterity'],
};

const MAX_WRONG = { easy: 8, medium: 6, hard: 4 };

function pickWord(difficulty) {
  const list = WORD_BANK[difficulty];
  return list[Math.floor(Math.random() * list.length)];
}

function GallowsSVG({ wrong, max }) {
  const parts = [
    <circle key="head" cx="150" cy="70" r="20" stroke="#ef4444" strokeWidth="3" fill="none" />,
    <line key="body" x1="150" y1="90" x2="150" y2="150" stroke="#ef4444" strokeWidth="3" />,
    <line key="larm" x1="150" y1="110" x2="115" y2="140" stroke="#ef4444" strokeWidth="3" />,
    <line key="rarm" x1="150" y1="110" x2="185" y2="140" stroke="#ef4444" strokeWidth="3" />,
    <line key="lleg" x1="150" y1="150" x2="115" y2="190" stroke="#ef4444" strokeWidth="3" />,
    <line key="rleg" x1="150" y1="150" x2="185" y2="190" stroke="#ef4444" strokeWidth="3" />,
    <line key="lfoot" x1="115" y1="140" x2="100" y2="160" stroke="#ef4444" strokeWidth="3" />,
    <line key="rfoot" x1="185" y1="140" x2="200" y2="160" stroke="#ef4444" strokeWidth="3" />,
  ].slice(0, max === 4 ? 6 : max === 6 ? 6 : 8);

  return (
    <svg viewBox="0 0 240 240" width="200" height="200" style={{ display: 'block', margin: '0 auto' }}>
      {/* Gallows */}
      <line x1="20" y1="230" x2="200" y2="230" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
      <line x1="60" y1="230" x2="60" y2="20" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
      <line x1="60" y1="20" x2="150" y2="20" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
      <line x1="60" y1="55" x2="95" y2="20" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
      <line x1="150" y1="20" x2="150" y2="50" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
      {/* Body parts */}
      {parts.slice(0, wrong)}
    </svg>
  );
}

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

export default function Hangman() {
  const [difficulty, setDifficulty] = useState('medium');
  const [word, setWord] = useState(() => pickWord('medium'));
  const [guessed, setGuessed] = useState(new Set());
  const [hintUsed, setHintUsed] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [saved, setSaved] = useState(false);
  const [stats, setStats] = useState({ wins: 0, losses: 0, wins_with_hint: 0 });

  const maxWrong = MAX_WRONG[difficulty];
  const wrongLetters = [...guessed].filter((l) => !word.includes(l));
  const wrongCount = wrongLetters.length;
  const isWon = word.split('').every((l) => guessed.has(l));
  const isLost = wrongCount >= maxWrong;
  const status = isWon ? 'won' : isLost ? 'lost' : 'playing';

  useEffect(() => {
    if (isLoggedIn()) {
      apiRequest('GET', null, '/game/stats').then((data) => {
        if (data?.hangman) setStats(data.hangman);
      }).catch(() => {});
    }
  }, [saved]);

  const saveScore = useCallback(async (result) => {
    if (!isLoggedIn() || saved) return;
    const score = result === 'win' ? word.length * 10 : result === 'win_with_hint' ? word.length * 5 : 0;
    try {
      await apiRequest('POST', { game_type: 'hangman', result, difficulty, score }, '/game/save');
      setSaved(true);
    } catch (_) {}
  }, [word, difficulty, saved]);

  useEffect(() => {
    if (status === 'won') saveScore(hintUsed ? 'win_with_hint' : 'win');
    if (status === 'lost') saveScore('loss');
  }, [status]);

  const guess = useCallback((letter) => {
    if (status !== 'playing' || guessed.has(letter)) return;
    setGuessed((prev) => new Set([...prev, letter]));
  }, [status, guessed]);

  useEffect(() => {
    const handler = (e) => {
      const key = e.key.toLowerCase();
      if (/^[a-z]$/.test(key)) guess(key);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [guess]);

  const useHint = () => {
    if (status !== 'playing' || hintUsed) return;
    const remaining = word.split('').filter((l) => !guessed.has(l));
    if (remaining.length > 0) {
      const letter = remaining[Math.floor(Math.random() * remaining.length)];
      setGuessed((prev) => new Set([...prev, letter]));
      setHintUsed(true);
    }
  };

  const startNew = () => {
    setWord(pickWord(difficulty));
    setGuessed(new Set());
    setHintUsed(false);
    setGameOver(false);
    setSaved(false);
  };

  const maskedWord = word.split('').map((l, i) => (
    <span key={i} className="hangman-letter">{guessed.has(l) || status === 'lost' ? l : '_'}</span>
  ));

  return (
    <div className="game-page">
      <div className="game-header">
        <Link to="/games" className="game-back">← Games</Link>
        <h1 className="game-title">Hangman</h1>
        <p className="game-subtitle">Guess the word before the man is hung</p>
      </div>

      <div className="game-controls-bar">
        <div className="game-difficulty-select">
          {['easy', 'medium', 'hard'].map((d) => (
            <button key={d} className={`difficulty-btn${difficulty === d ? ' active' : ''}`}
              onClick={() => { setDifficulty(d); startNew(); }}>
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
        <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={startNew}>New Game</button>
      </div>

      {isLoggedIn() && (
        <div className="game-stats-bar">
          <span>W: <b>{stats.wins}</b></span>
          <span>W+Hint: <b>{stats.wins_with_hint}</b></span>
          <span>L: <b>{stats.losses}</b></span>
        </div>
      )}

      <div className="hangman-container">
        <div className="hangman-gallows">
          <GallowsSVG wrong={wrongCount} max={maxWrong} />
          <div className="hangman-counter">
            <span style={{ color: wrongCount > 0 ? '#ef4444' : 'var(--muted)' }}>
              {wrongCount} / {maxWrong} wrong
            </span>
          </div>
        </div>

        <div className="hangman-game">
          {status !== 'playing' && (
            <div className={`game-result-banner ${status === 'won' ? 'won' : 'lost'}`}>
              {status === 'won'
                ? `🎉 You got it! ${hintUsed ? '(with hint)' : 'Perfect!'}`
                : `💀 The word was: ${word.toUpperCase()}`}
              <button className="gs-btn gs-btn-primary gs-btn-sm" style={{ marginLeft: 12 }} onClick={startNew}>
                Play Again
              </button>
            </div>
          )}

          <div className="hangman-word">{maskedWord}</div>

          {wrongLetters.length > 0 && (
            <div className="hangman-wrong">
              Wrong: {wrongLetters.map((l) => <span key={l} className="hangman-wrong-letter">{l}</span>)}
            </div>
          )}

          <div className="hangman-keyboard">
            {ALPHABET.map((letter) => {
              const isGuessed = guessed.has(letter);
              const isCorrect = isGuessed && word.includes(letter);
              const isWrong = isGuessed && !word.includes(letter);
              return (
                <button
                  key={letter}
                  className={`hangman-key${isCorrect ? ' correct' : isWrong ? ' wrong' : ''}`}
                  onClick={() => guess(letter)}
                  disabled={isGuessed || status !== 'playing'}
                >
                  {letter}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
            <button
              className="gs-btn gs-btn-outline gs-btn-sm"
              onClick={useHint}
              disabled={hintUsed || status !== 'playing'}
            >
              {hintUsed ? '💡 Hint Used' : '💡 Hint (reveal letter)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
