import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';
import HowToPlay from './HowToPlay';
import ShareButton from '../ShareButton';
import { todayKey, puzzleForDate, randomPuzzle } from './categoriesPuzzles';
import PUZZLES from './categoriesPuzzles';

const MAX_MISTAKES = 4;
const STORAGE_KEY = 'categories_daily_progress_v1';
const COLOR_EMOJI = { yellow: '🟨', green: '🟩', blue: '🟦', purple: '🟪' };

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function wordColor(puzzle, word) {
  const g = puzzle.groups.find((gr) => gr.words.includes(word));
  return g ? g.color : null;
}

function loadDailyProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.date !== todayKey()) return null;
    return data;
  } catch (_) {
    return null;
  }
}

function saveDailyProgress(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: todayKey(), ...state }));
  } catch (_) { /* storage unavailable -- daily gate just won't persist across reloads */ }
}

export default function Categories() {
  const navigate = useNavigate();
  const [mode, setMode] = useState(null); // 'daily' | 'practice'
  const [puzzle, setPuzzle] = useState(null);
  const [solvedGroups, setSolvedGroups] = useState([]);
  const [selected, setSelected] = useState([]);
  const [mistakes, setMistakes] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [message, setMessage] = useState('');
  const [wordOrder, setWordOrder] = useState([]);
  const [guessHistory, setGuessHistory] = useState([]);
  const [shaking, setShaking] = useState(false);
  const [savedKey, setSavedKey] = useState('');
  const [alreadyPlayedToday, setAlreadyPlayedToday] = useState(false);

  const dayIndex = useMemo(() => {
    // A stable, human-friendly "puzzle #" for the header/share text -- days
    // since a fixed epoch, not the array index (which would jump around as
    // the bank grows).
    const epoch = new Date('2026-01-01T00:00:00');
    const now = new Date();
    return Math.max(1, Math.floor((now - epoch) / 86400000) + 1);
  }, []);

  const remainingWords = useMemo(() => {
    if (!puzzle) return [];
    const solvedWords = new Set(solvedGroups.flatMap((g) => g.words));
    return wordOrder.filter((w) => !solvedWords.has(w));
  }, [puzzle, solvedGroups, wordOrder]);

  const saveScore = useCallback(async (result, score) => {
    if (!isLoggedIn()) return;
    const key = `game_result_categories_${Date.now()}`;
    if (sessionStorage.getItem(savedKey)) return;
    sessionStorage.setItem(key, '1');
    setSavedKey(key);
    try {
      await apiRequest('POST', { game_type: 'categories', result, difficulty: 'medium', score }, '/game/save');
    } catch (_) { /* leaderboard is a nice-to-have, never block the game on it */ }
  }, [savedKey]);

  const startPuzzle = useCallback((p, isDaily) => {
    setPuzzle(p);
    setMode(isDaily ? 'daily' : 'practice');
    setSolvedGroups([]);
    setSelected([]);
    setMistakes(0);
    setGameOver(false);
    setWon(false);
    setMessage('');
    setGuessHistory([]);
    setSavedKey('');
    setWordOrder(shuffle(p.groups.flatMap((g) => g.words)));
    setAlreadyPlayedToday(false);
  }, []);

  const startDaily = useCallback(() => {
    const p = puzzleForDate(todayKey());
    startPuzzle(p, true);
  }, [startPuzzle]);

  const startPractice = useCallback(() => {
    const todaysPuzzle = puzzleForDate(todayKey());
    const excludeIdx = PUZZLES.indexOf(todaysPuzzle);
    startPuzzle(randomPuzzle(excludeIdx), false);
  }, [startPuzzle]);

  // On mount, silently check for an in-progress or completed daily puzzle so
  // a refresh mid-game (or coming back later the same day) resumes exactly
  // where they left off instead of losing progress or letting them replay.
  useEffect(() => {
    const saved = loadDailyProgress();
    if (!saved) return;
    const p = puzzleForDate(todayKey());
    setPuzzle(p);
    setMode('daily');
    setSolvedGroups(saved.solvedGroups || []);
    setMistakes(saved.mistakes || 0);
    setGameOver(!!saved.gameOver);
    setWon(!!saved.won);
    setGuessHistory(saved.guessHistory || []);
    setWordOrder(saved.wordOrder || shuffle(p.groups.flatMap((g) => g.words)));
    setAlreadyPlayedToday(!!saved.gameOver);
  }, []);

  // Persist daily progress after every meaningful change (mode === 'daily' only
  // -- practice runs are throwaway and never touch the daily gate).
  useEffect(() => {
    if (mode !== 'daily' || !puzzle) return;
    saveDailyProgress({ solvedGroups, mistakes, gameOver, won, guessHistory, wordOrder });
  }, [mode, puzzle, solvedGroups, mistakes, gameOver, won, guessHistory, wordOrder]);

  const toggleWord = (word) => {
    if (gameOver) return;
    setSelected((prev) => {
      if (prev.includes(word)) return prev.filter((w) => w !== word);
      if (prev.length >= 4) return prev;
      return [...prev, word];
    });
  };

  const finishGame = useCallback((didWin) => {
    setGameOver(true);
    setWon(didWin);
    const score = didWin ? Math.max(100, 500 - mistakes * 100) : 0;
    saveScore(didWin ? 'win' : 'loss', score);
  }, [mistakes, saveScore]);

  const submitGuess = () => {
    if (selected.length !== 4 || gameOver || !puzzle) return;
    const matchedGroup = puzzle.groups.find(
      (g) => !solvedGroups.includes(g) && g.words.every((w) => selected.includes(w))
    );
    const colors = selected.map((w) => wordColor(puzzle, w));
    setGuessHistory((h) => [...h, { words: selected, colors }]);

    if (matchedGroup) {
      const newSolved = [...solvedGroups, matchedGroup];
      setSolvedGroups(newSolved);
      setSelected([]);
      setMessage(newSolved.length === 4 ? '' : 'Nice!');
      if (newSolved.length === 4) finishGame(true);
      return;
    }

    // "One away" feedback -- exactly 3 of the 4 selected words share a group.
    const counts = {};
    colors.forEach((c) => { counts[c] = (counts[c] || 0) + 1; });
    const oneAway = Object.values(counts).some((n) => n === 3);

    setShaking(true);
    setTimeout(() => setShaking(false), 420);
    const nextMistakes = mistakes + 1;
    setMistakes(nextMistakes);
    setMessage(oneAway ? 'One away...' : 'Not quite — try again.');

    if (nextMistakes >= MAX_MISTAKES) {
      setSolvedGroups(puzzle.groups); // reveal everything, including what's still unsolved
      setSelected([]);
      finishGame(false);
    } else {
      setSelected([]);
    }
  };

  const shuffleBoard = () => setWordOrder((prev) => shuffle(prev));

  const shareText = useMemo(() => {
    if (!gameOver) return '';
    const rows = guessHistory.map((g) =>
      g.colors.map((c) => COLOR_EMOJI[c] || '⬜').join('')
    ).join('\n');
    const result = won ? `solved in ${guessHistory.length} guess${guessHistory.length === 1 ? '' : 'es'}` : 'couldn\'t solve it';
    return `Gut Shtick Categories #${dayIndex} — ${result}\n${rows}`;
  }, [gameOver, guessHistory, won, dayIndex]);

  // ── Menu screen ──
  if (!mode) {
    const savedToday = loadDailyProgress();
    return (
      <div className="game-page">
        <div className="gs-container">
          <div style={{ marginBottom: 16 }}>
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
          </div>
          <div className="game-header">
            <h1>Categories</h1>
            <p style={{ color: 'var(--muted)' }}>Find groups of four connected words. A new puzzle every day.</p>
          </div>

          <HowToPlay defaultOpen>
            <p><b>Objective:</b> sort 16 words into 4 hidden groups of 4.</p>
            <ul>
              <li>Tap up to 4 words, then submit your guess. A correct group locks in and shows its category.</li>
              <li>Groups get trickier by color: 🟨 yellow (straightforward) → 🟩 green → 🟦 blue → 🟪 purple (usually wordplay).</li>
              <li>You get {MAX_MISTAKES} mistakes before the puzzle ends. "One away..." means 3 of your 4 picks belong together.</li>
              <li>Everyone gets the same daily puzzle, and it resets at midnight — come back tomorrow for a new one. Practice Mode gives you a random puzzle any time, unlimited.</li>
            </ul>
          </HowToPlay>

          <div className="categories-menu">
            <button className="gs-btn gs-btn-primary categories-menu-btn" onClick={startDaily}>
              {savedToday?.gameOver ? "📅 Today's Puzzle — View Result" : "📅 Play Today's Puzzle"}
            </button>
            <button className="gs-btn gs-btn-outline categories-menu-btn" onClick={startPractice}>
              🔁 Practice Mode (unlimited)
            </button>
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
          <span className={`diff-badge diff-${mode === 'daily' ? 'medium' : 'easy'}`}>
            {mode === 'daily' ? `Daily #${dayIndex}` : 'Practice'}
          </span>
        </div>
        <div className="game-header">
          <h1>Categories</h1>
          <div className="game-meta">
            <span>Mistakes: {'❤️'.repeat(Math.max(0, MAX_MISTAKES - mistakes))}{'🖤'.repeat(mistakes)}</span>
          </div>
        </div>

        {message && !gameOver && (
          <div className={`game-msg ${message === 'Nice!' ? 'success' : 'info'}`}>{message}</div>
        )}

        {alreadyPlayedToday && !guessHistory.length && (
          <div className="game-msg info">You already played today's puzzle — here's how it went.</div>
        )}

        <div className="categories-board">
          {solvedGroups.map((g) => (
            <div key={g.category} className={`categories-solved-row categories-${g.color}`}>
              <div className="categories-solved-title">{g.category}</div>
              <div className="categories-solved-words">{g.words.join(', ')}</div>
            </div>
          ))}

          {!gameOver && (
            <div className={`categories-grid${shaking ? ' shake' : ''}`}>
              {remainingWords.map((word) => (
                <button
                  key={word}
                  className={`categories-tile${selected.includes(word) ? ' selected' : ''}`}
                  onClick={() => toggleWord(word)}
                >
                  {word}
                </button>
              ))}
            </div>
          )}
        </div>

        {gameOver ? (
          <>
            <div className={`game-msg ${won ? 'success' : 'fail'}`}>
              {won ? '🎉 Solved it!' : "That's 4 mistakes — here's today's answer."}
            </div>
            <div className="categories-share-row">
              <ShareButton
                title="Gut Shtick Categories"
                text={shareText}
                url="https://gutshtick.com/games/categories"
              />
              {mode === 'daily' ? (
                <span className="categories-comeback">New puzzle tomorrow — or try Practice Mode now.</span>
              ) : (
                <button className="gs-btn gs-btn-primary" onClick={startPractice}>Next Puzzle</button>
              )}
              <button className="gs-btn gs-btn-outline" onClick={() => setMode(null)}>Menu</button>
            </div>
          </>
        ) : (
          <div className="game-controls">
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={shuffleBoard}>🔀 Shuffle</button>
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setSelected([])} disabled={selected.length === 0}>
              Deselect All
            </button>
            <button className="gs-btn gs-btn-primary" onClick={submitGuess} disabled={selected.length !== 4}>
              Submit
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
