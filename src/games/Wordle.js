import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';

const WORDS = {
  easy: ['CRANE','PLANT','STONE','LIGHT','BREAD','CLIMB','DANCE','EARTH','FLAME','GRACE','HEART','KNIFE','LEMON','MUSIC','NIGHT','OCEAN','PEACE','RIVER','SMILE','TIGER','WATER','YOUNG','APPLE','BRAVE','CHAIR','CLOUD','DREAM','FRUIT','HOUSE','JUDGE','OLIVE','PAINT','ROUND','SWEET','TRAIN','WHOLE','CLEAN','ACTOR','AFTER','AGAIN','AGREE','ALARM','ALBUM','ANGEL','ANGRY','ANKLE','ARROW'],
  medium: ['PROXY','QUIRK','SHRUG','THYME','VIVID','WALTZ','CYNIC','EXPEL','FROST','JUMPY','KNELT','SLUMP','VIXEN','WHISK','YACHT','BANJO','BLUNT','CLOWN','DRAPE','EPOCH','FROWN','GLOOM','IMPLY','KNACK','MOIST','PIXEL','QUOTA','RIGID','SCREW','SWAMP','THORN','VAPOR','BLAZE','CRISP','FLECK','GAUDY','PERCH','SKIMP','SMIRK','TROUT','INERT','GRUFF','STOMP','TITHE','VOUCH','PERKY'],
  hard: ['ABYSS','BOTCH','FJORD','GLYPH','LYMPH','MYRRH','PYGMY','QUAFF','SYNTH','ULCER','BUXOM','CRYPT','DWARF','AXIOM','ETHOS','FUROR','KNAVE','LYRIC','MIRTH','NEXUS','PSALM','RAVEN','SCRUB','TENOR','USURP','VERGE','WRATH','CHIMP','SQUIB','THUMP','OOMPH','RAJAH','STOMP','UNWED','INFIX','IGLOO','TRYST','ELUDE','BRUNT','FLINT','GRAFT','JOUST','OXIDE'],
};
const MAX_ATTEMPTS = { easy: 7, medium: 6, hard: 5 };

const KEY_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['ENTER','Z','X','C','V','B','N','M','⌫'],
];

function pickWord(diff) {
  const bank = WORDS[diff];
  return bank[Math.floor(Math.random() * bank.length)];
}

function evaluateGuess(guess, solution) {
  const result = Array(5).fill('absent');
  const solArr = solution.split('');
  const guessArr = guess.split('');
  const used = Array(5).fill(false);

  for (let i = 0; i < 5; i++) {
    if (guessArr[i] === solArr[i]) {
      result[i] = 'correct';
      used[i] = true;
    }
  }
  for (let i = 0; i < 5; i++) {
    if (result[i] === 'correct') continue;
    for (let j = 0; j < 5; j++) {
      if (!used[j] && guessArr[i] === solArr[j]) {
        result[i] = 'present';
        used[j] = true;
        break;
      }
    }
  }
  return result;
}

export default function Wordle() {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState(null);
  const [solution, setSolution] = useState('');
  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [hintLetter, setHintLetter] = useState(null);
  const [message, setMessage] = useState('');
  const [savedKey, setSavedKey] = useState('');

  const maxAttempts = difficulty ? MAX_ATTEMPTS[difficulty] : 6;

  const saveScore = useCallback(async (result, sc, diff) => {
    if (!isLoggedIn()) return;
    const key = `game_result_wordle_${Date.now()}`;
    if (sessionStorage.getItem(savedKey)) return;
    sessionStorage.setItem(key, '1');
    setSavedKey(key);
    try {
      await apiRequest('POST', { game_type: 'wordle', result, difficulty: diff, score: sc }, '/game/save');
    } catch (_) {}
  }, [savedKey]);

  const startGame = useCallback((diff) => {
    setDifficulty(diff);
    setSolution(pickWord(diff));
    setGuesses([]);
    setCurrentGuess('');
    setGameOver(false);
    setWon(false);
    setHintUsed(false);
    setHintLetter(null);
    setMessage('');
    setSavedKey('');
  }, []);

  const submitGuess = useCallback(() => {
    if (currentGuess.length !== 5 || gameOver) return;
    const evaluation = evaluateGuess(currentGuess, solution);
    const newGuesses = [...guesses, { word: currentGuess, evaluation }];
    setGuesses(newGuesses);
    setCurrentGuess('');

    if (currentGuess === solution) {
      const sc = (MAX_ATTEMPTS[difficulty] - newGuesses.length + 1) * 50;
      setWon(true);
      setGameOver(true);
      setMessage(`You got it! The word was ${solution}.`);
      saveScore('win', sc, difficulty);
    } else if (newGuesses.length >= MAX_ATTEMPTS[difficulty]) {
      setGameOver(true);
      setMessage(`Game over! The word was ${solution}.`);
      saveScore('loss', 0, difficulty);
    }
  }, [currentGuess, gameOver, guesses, solution, difficulty, saveScore]);

  const handleKey = useCallback((key) => {
    if (gameOver) return;
    if (key === 'ENTER') {
      submitGuess();
    } else if (key === '⌫' || key === 'BACKSPACE') {
      setCurrentGuess(prev => prev.slice(0, -1));
    } else if (/^[A-Z]$/.test(key) && currentGuess.length < 5) {
      setCurrentGuess(prev => prev + key);
    }
  }, [gameOver, currentGuess, submitGuess]);

  useEffect(() => {
    const onKey = (e) => {
      const k = e.key.toUpperCase();
      if (k === 'ENTER') handleKey('ENTER');
      else if (k === 'BACKSPACE') handleKey('BACKSPACE');
      else if (/^[A-Z]$/.test(k)) handleKey(k);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleKey]);

  const getKeyState = () => {
    const states = {};
    for (const g of guesses) {
      g.word.split('').forEach((letter, i) => {
        const ev = g.evaluation[i];
        const cur = states[letter];
        if (cur === 'correct') return;
        if (ev === 'correct') states[letter] = 'correct';
        else if (ev === 'present' && cur !== 'correct') states[letter] = 'present';
        else if (!cur) states[letter] = 'absent';
      });
    }
    return states;
  };

  const useHint = () => {
    if (hintUsed || gameOver) return;
    const guessedCorrect = new Set();
    for (const g of guesses) {
      g.word.split('').forEach((letter, i) => {
        if (g.evaluation[i] === 'correct') guessedCorrect.add(i);
      });
    }
    for (let i = 0; i < 5; i++) {
      if (!guessedCorrect.has(i)) {
        setHintLetter({ index: i, letter: solution[i] });
        setHintUsed(true);
        return;
      }
    }
  };

  if (!difficulty) {
    return (
      <div className="game-page">
        <div className="gs-container">
          <div style={{ marginBottom: 16 }}>
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
          </div>
          <div className="game-header">
            <h1>Wordle</h1>
            <p style={{ color: 'var(--muted)' }}>Guess the 5-letter word before you run out of attempts.</p>
          </div>
          <div className="difficulty-select">
            {['easy','medium','hard'].map(d => (
              <button key={d} className={`diff-btn diff-${d}`} onClick={() => startGame(d)}>
                <span className="diff-label">{d}</span>
                <span className="diff-sub">
                  {d === 'easy' && '7 attempts · common words'}
                  {d === 'medium' && '6 attempts · harder words'}
                  {d === 'hard' && '5 attempts · tricky words'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const keyStates = getKeyState();
  const emptyRows = maxAttempts - guesses.length - (gameOver ? 0 : 1);

  // Shrink the board/keyboard on narrow viewports so a 5-wide row (and the
  // 10-wide top keyboard row) never forces horizontal page scroll.
  const wordleCellSize = 'clamp(38px, calc((100vw - 104px) / 5), 52px)';
  const wordleCellStyle = { width: wordleCellSize, height: wordleCellSize };
  const wordleKeyBase = 'calc((100vw - 116px) / 10)';
  const wordleKeyPadding = 'clamp(8px, 3vw, 13px) clamp(2px, 1vw, 8px)';
  const wordleKeyStyle = {
    minWidth: `clamp(20px, ${wordleKeyBase}, 34px)`,
    width: `clamp(20px, ${wordleKeyBase}, 34px)`,
    padding: wordleKeyPadding,
  };
  const wordleWideKeyStyle = {
    minWidth: `clamp(30px, calc(${wordleKeyBase} * 1.529), 52px)`,
    width: `clamp(30px, calc(${wordleKeyBase} * 1.529), 52px)`,
    padding: wordleKeyPadding,
  };

  return (
    <div className="game-page">
      <div className="gs-container">
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
          <span className={`diff-badge diff-${difficulty}`}>{difficulty}</span>
        </div>
        <div className="game-header">
          <h1>Wordle</h1>
          <div className="game-meta">
            <span>Attempt {guesses.length}/{maxAttempts}</span>
            {hintUsed && <span className="hint-used">Hint used</span>}
          </div>
        </div>

        {hintLetter && !gameOver && (
          <div className="game-msg info">Hint: Position {hintLetter.index + 1} is "{hintLetter.letter}"</div>
        )}
        {gameOver && (
          <div className={`game-msg ${won ? 'success' : 'fail'}`}>{message}</div>
        )}

        <div className="wordle-board">
          {guesses.map((g, ri) => (
            <div key={ri} className="wordle-row">
              {g.word.split('').map((letter, ci) => (
                <div key={ci} className={`wordle-cell ${g.evaluation[ci]}`} style={wordleCellStyle}>{letter}</div>
              ))}
            </div>
          ))}

          {!gameOver && (
            <div className="wordle-row">
              {Array(5).fill('').map((_, ci) => (
                <div key={ci} className={`wordle-cell ${currentGuess[ci] ? 'filled' : ''}`} style={wordleCellStyle}>
                  {currentGuess[ci] || ''}
                </div>
              ))}
            </div>
          )}

          {Array(Math.max(0, emptyRows)).fill('').map((_, ri) => (
            <div key={ri} className="wordle-row">
              {Array(5).fill('').map((_, ci) => (
                <div key={ci} className="wordle-cell" style={wordleCellStyle}></div>
              ))}
            </div>
          ))}
        </div>

        <div className="wordle-keyboard">
          {KEY_ROWS.map((row, ri) => (
            <div key={ri} className="wordle-key-row" style={{ gap: 'clamp(2px, 1vw, 4px)' }}>
              {row.map(key => (
                <button
                  key={key}
                  className={`wordle-key${key.length > 1 ? ' wide' : ''}${keyStates[key] ? ` ${keyStates[key]}` : ''}`}
                  style={key.length > 1 ? wordleWideKeyStyle : wordleKeyStyle}
                  onClick={() => handleKey(key)}
                >
                  {key}
                </button>
              ))}
            </div>
          ))}
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

        {gameOver && (
          <div style={{ textAlign: 'center', marginTop: 12, color: 'var(--muted)', fontSize: 14 }}>
            Score: {won ? (MAX_ATTEMPTS[difficulty] - guesses.length + 1) * 50 : 0}
          </div>
        )}
      </div>
    </div>
  );
}
