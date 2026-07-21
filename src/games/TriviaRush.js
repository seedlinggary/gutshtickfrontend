import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';
import HowToPlay from './HowToPlay';
import ShareButton from '../ShareButton';
import { todayKey, todaysQuestions, practiceQuestions } from './triviaQuestions';

const TIME_PER_QUESTION = 15;
const STORAGE_KEY = 'trivia_daily_result_v1';

function loadTodayResult() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data.date === todayKey() ? data : null;
  } catch (_) {
    return null;
  }
}

function saveTodayResult(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: todayKey(), ...data }));
  } catch (_) { /* daily gate just won't persist across reloads */ }
}

export default function TriviaRush() {
  const navigate = useNavigate();
  const [mode, setMode] = useState(null); // 'daily' | 'practice'
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [results, setResults] = useState([]); // [{correct, points}]
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [streak, setStreak] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [savedKey, setSavedKey] = useState('');
  const [priorResult, setPriorResult] = useState(null);
  const timerRef = useRef(null);

  const dayIndex = useMemo(() => {
    const epoch = new Date('2026-01-01T00:00:00');
    return Math.max(1, Math.floor((new Date() - epoch) / 86400000) + 1);
  }, []);

  useEffect(() => {
    setPriorResult(loadTodayResult());
  }, []);

  const saveScore = useCallback(async (score) => {
    if (!isLoggedIn()) return;
    const key = `game_result_trivia_rush_${Date.now()}`;
    if (sessionStorage.getItem(savedKey)) return;
    sessionStorage.setItem(key, '1');
    setSavedKey(key);
    const correctCount = results.filter((r) => r?.correct).length;
    try {
      await apiRequest('POST', {
        game_type: 'trivia_rush',
        result: correctCount >= 6 ? 'win' : 'loss',
        difficulty: 'medium',
        score,
      }, '/game/save');
    } catch (_) { /* leaderboard is a nice-to-have */ }
  }, [savedKey, results]);

  const clearTimer = () => { if (timerRef.current) clearInterval(timerRef.current); };

  const finish = useCallback((finalResults) => {
    clearTimer();
    setGameOver(true);
    const score = finalResults.reduce((sum, r) => sum + (r?.points || 0), 0);
    if (mode === 'daily') {
      saveTodayResult({ results: finalResults, score });
    }
    saveScore(score);
  }, [mode, saveScore]);

  const nextQuestion = useCallback((finalResultsList) => {
    setIndex((prevIdx) => {
      const nextIdx = prevIdx + 1;
      if (nextIdx >= questions.length) {
        finish(finalResultsList);
        return prevIdx;
      }
      setSelected(null);
      setAnswered(false);
      setTimeLeft(TIME_PER_QUESTION);
      return nextIdx;
    });
  }, [questions.length, finish]);

  const answer = useCallback((optionIdx) => {
    if (answered || gameOver) return;
    clearTimer();
    setAnswered(true);
    setSelected(optionIdx);
    const q = questions[index];
    const correct = optionIdx === q.answer;
    const points = correct ? 100 + timeLeft * 5 + Math.min(streak, 5) * 10 : 0;
    setStreak((s) => (correct ? s + 1 : 0));
    // Computed outside the setState updater (not e.g. setResults(prev => {
    // ...; setTimeout(...); return updated })) -- React 18 StrictMode can
    // invoke an updater function twice in dev, which would double-schedule
    // the setTimeout and skip two questions on one answer instead of one.
    const updated = [...results, { correct, points }];
    setResults(updated);
    setTimeout(() => nextQuestion(updated), 1100);
  }, [answered, gameOver, questions, index, timeLeft, streak, results, nextQuestion]);

  // Per-question countdown.
  useEffect(() => {
    if (!mode || answered || gameOver || questions.length === 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          answer(-1); // time's up -- counts as a miss
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, index, answered, gameOver, questions.length]);

  const startGame = (isDaily) => {
    const qs = isDaily ? todaysQuestions(todayKey()) : practiceQuestions();
    setQuestions(qs);
    setMode(isDaily ? 'daily' : 'practice');
    setIndex(0);
    setSelected(null);
    setAnswered(false);
    setResults([]);
    setTimeLeft(TIME_PER_QUESTION);
    setStreak(0);
    setGameOver(false);
    setSavedKey('');
  };

  const correctCount = results.filter((r) => r?.correct).length;
  const totalScore = results.reduce((sum, r) => sum + (r?.points || 0), 0);

  const shareText = useMemo(() => {
    if (!gameOver) return '';
    const grid = results.map((r) => (r.correct ? '✅' : '❌')).join('');
    return `Gut Shtick Trivia Rush #${dayIndex} — ${correctCount}/${questions.length}\n${grid}`;
  }, [gameOver, results, dayIndex, correctCount, questions.length]);

  // ── Menu ──
  if (!mode) {
    return (
      <div className="game-page">
        <div className="gs-container">
          <div style={{ marginBottom: 16 }}>
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
          </div>
          <div className="game-header">
            <h1>Trivia Rush</h1>
            <p style={{ color: 'var(--muted)' }}>10 questions, 15 seconds each. A new set every day.</p>
          </div>

          <HowToPlay defaultOpen>
            <p><b>Objective:</b> answer as many of today's 10 questions correctly as you can.</p>
            <ul>
              <li>Each question gives you 15 seconds — the faster you answer correctly, the more points you get.</li>
              <li>Chain correct answers in a row for a small streak bonus (capped at a 5-streak).</li>
              <li>Everyone gets the same 10 questions each day, resetting at midnight. Practice Mode gives you a random 10 any time, unlimited.</li>
            </ul>
          </HowToPlay>

          <div className="categories-menu">
            <button className="gs-btn gs-btn-primary categories-menu-btn" onClick={() => startGame(true)}>
              {priorResult ? "📅 Today's Rush — View Result" : "📅 Play Today's Rush"}
            </button>
            <button className="gs-btn gs-btn-outline categories-menu-btn" onClick={() => startGame(false)}>
              🔁 Practice Mode (unlimited)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Already played today, showing stored result without replaying ──
  if (mode === 'daily' && priorResult && !gameOver && results.length === 0 && index === 0 && !answered) {
    const storedCorrect = priorResult.results.filter((r) => r.correct).length;
    return (
      <div className="game-page">
        <div className="gs-container">
          <div style={{ marginBottom: 16 }}>
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
          </div>
          <div className="game-header"><h1>Trivia Rush</h1></div>
          <div className="game-msg info">You already played today's rush — here's how it went.</div>
          <div className="trivia-result-score">{storedCorrect}/{priorResult.results.length} correct · {priorResult.score} pts</div>
          <div className="trivia-result-grid">
            {priorResult.results.map((r, i) => (
              <span key={i} className={`trivia-result-chip ${r.correct ? 'correct' : 'wrong'}`}>{r.correct ? '✅' : '❌'}</span>
            ))}
          </div>
          <div className="categories-share-row">
            <ShareButton
              title="Gut Shtick Trivia Rush"
              text={`Gut Shtick Trivia Rush #${dayIndex} — ${storedCorrect}/${priorResult.results.length}\n${priorResult.results.map((r) => (r.correct ? '✅' : '❌')).join('')}`}
              url="https://gutshtick.com/games/trivia-rush"
            />
            <button className="gs-btn gs-btn-outline" onClick={() => startGame(false)}>Practice Mode</button>
            <button className="gs-btn gs-btn-outline" onClick={() => setMode(null)}>Menu</button>
          </div>
        </div>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="game-page">
        <div className="gs-container">
          <div style={{ marginBottom: 16 }}>
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
          </div>
          <div className="game-header"><h1>Trivia Rush</h1></div>
          <div className={`game-msg ${correctCount >= 6 ? 'success' : 'fail'}`}>
            {correctCount === questions.length ? '🎉 Perfect score!' : `You got ${correctCount}/${questions.length}.`}
          </div>
          <div className="trivia-result-score">{correctCount}/{questions.length} correct · {totalScore} pts</div>
          <div className="trivia-result-grid">
            {results.map((r, i) => (
              <span key={i} className={`trivia-result-chip ${r.correct ? 'correct' : 'wrong'}`}>{r.correct ? '✅' : '❌'}</span>
            ))}
          </div>
          <div className="categories-share-row">
            <ShareButton title="Gut Shtick Trivia Rush" text={shareText} url="https://gutshtick.com/games/trivia-rush" />
            {mode === 'daily' ? (
              <span className="categories-comeback">New rush tomorrow — or try Practice Mode now.</span>
            ) : (
              <button className="gs-btn gs-btn-primary" onClick={() => startGame(false)}>Next Rush</button>
            )}
            <button className="gs-btn gs-btn-outline" onClick={() => setMode(null)}>Menu</button>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[index];
  if (!q) return null;

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
          <h1>Trivia Rush</h1>
          <div className="game-meta">
            <span>Question {index + 1}/{questions.length}</span>
            {streak > 1 && <span className="hint-used">🔥 {streak} streak</span>}
          </div>
        </div>

        <div className="trivia-timer-bar">
          <div className="trivia-timer-fill" style={{ width: `${(timeLeft / TIME_PER_QUESTION) * 100}%` }} />
        </div>

        <div className="trivia-question-card">
          <span className="card-kind">{q.cat}</span>
          <h3>{q.q}</h3>
        </div>

        <div className="trivia-options">
          {q.options.map((opt, i) => {
            let cls = 'trivia-option';
            if (answered) {
              if (i === q.answer) cls += ' correct';
              else if (i === selected) cls += ' wrong';
            } else if (i === selected) {
              cls += ' selected';
            }
            return (
              <button key={i} className={cls} onClick={() => answer(i)} disabled={answered}>
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
