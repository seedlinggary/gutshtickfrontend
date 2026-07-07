import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';
import HowToPlay from './HowToPlay';

const COLORS = [
  { id: 'red',    hex: '#ef4444', className: 'simon-red' },
  { id: 'blue',   hex: '#3b82f6', className: 'simon-blue' },
  { id: 'green',  hex: '#22c55e', className: 'simon-green' },
  { id: 'yellow', hex: '#eab308', className: 'simon-yellow' },
];

const WIN_LEVEL = { easy: 8, medium: 12, hard: 16 };

export default function Simon() {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState(null);
  const [sequence, setSequence] = useState([]);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [phase, setPhase] = useState('idle'); // idle | showing | input
  const [activeColor, setActiveColor] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [message, setMessage] = useState('');
  const [level, setLevel] = useState(0);
  const showingRef = useRef(false);

  const saveScore = useCallback(async (result, sc, diff) => {
    if (!isLoggedIn()) return;
    const key = `game_result_simon_${Date.now()}`;
    sessionStorage.setItem(key, '1');
    try {
      await apiRequest('POST', { game_type: 'simon', result, difficulty: diff, score: sc }, '/game/save');
    } catch (_) {}
  }, []);

  const playSequence = useCallback((seq) => {
    if (showingRef.current) return;
    showingRef.current = true;
    setPhase('showing');
    setActiveColor(null);
    let i = 0;
    const step = () => {
      if (i >= seq.length) {
        setActiveColor(null);
        showingRef.current = false;
        setPhase('input');
        return;
      }
      setActiveColor(seq[i]);
      setTimeout(() => {
        setActiveColor(null);
        setTimeout(() => {
          i++;
          step();
        }, 200);
      }, 400);
    };
    setTimeout(step, 400);
  }, []);

  const startGame = useCallback((diff) => {
    showingRef.current = false;
    const firstColor = COLORS[Math.floor(Math.random() * 4)].id;
    const seq = [firstColor];
    setDifficulty(diff);
    setSequence(seq);
    setPlayerIndex(0);
    setPhase('idle');
    setActiveColor(null);
    setGameOver(false);
    setWon(false);
    setHintUsed(false);
    setMessage('');
    setLevel(1);
    setTimeout(() => playSequence(seq), 300);
  }, [playSequence]);

  const handleColorClick = useCallback((colorId) => {
    if (phase !== 'input' || gameOver) return;
    if (colorId !== sequence[playerIndex]) {
      setGameOver(true);
      setWon(false);
      setPhase('idle');
      setMessage(`Wrong! You reached level ${level}.`);
      saveScore('loss', sequence.length * 10, difficulty);
      return;
    }
    const nextIndex = playerIndex + 1;
    if (nextIndex === sequence.length) {
      const winLevel = WIN_LEVEL[difficulty];
      if (sequence.length >= winLevel) {
        setGameOver(true);
        setWon(true);
        setPhase('idle');
        setMessage(`You won! Completed level ${winLevel}!`);
        saveScore('win', sequence.length * 10, difficulty);
        return;
      }
      const nextColor = COLORS[Math.floor(Math.random() * 4)].id;
      const newSeq = [...sequence, nextColor];
      const newLevel = level + 1;
      setSequence(newSeq);
      setLevel(newLevel);
      setPlayerIndex(0);
      setPhase('showing');
      setTimeout(() => playSequence(newSeq), 600);
    } else {
      setPlayerIndex(nextIndex);
    }
  }, [phase, gameOver, sequence, playerIndex, level, difficulty, playSequence, saveScore]);

  const useHint = () => {
    if (hintUsed || gameOver || phase !== 'input') return;
    setHintUsed(true);
    setPlayerIndex(0);
    playSequence(sequence);
  };

  if (!difficulty) {
    return (
      <div className="game-page">
        <div className="gs-container">
          <div style={{ marginBottom: 16 }}>
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
          </div>
          <div className="game-header">
            <h1>Simon</h1>
            <p style={{ color: 'var(--muted)' }}>Watch the sequence, then repeat it. How far can you go?</p>
          </div>

          <HowToPlay>
            <p><b>Objective:</b> memorize and repeat a growing sequence of colored flashes.</p>
            <ul>
              <li>Watch the four pads (red, blue, green, yellow) light up one at a time in sequence.</li>
              <li>Once the sequence finishes, click (or tap on mobile) the pads in the same order the lights showed.</li>
              <li>Get it right and the sequence grows by one more color; get it wrong and the game ends immediately.</li>
              <li>Reach the target level for your difficulty to win: level 8 (Easy), 12 (Medium), or 16 (Hard).</li>
              <li>A one-time hint replays the current sequence from the start if you forget it.</li>
            </ul>
          </HowToPlay>

          <div className="difficulty-select">
            {['easy','medium','hard'].map(d => (
              <button key={d} className={`diff-btn diff-${d}`} onClick={() => startGame(d)}>
                <span className="diff-label">{d}</span>
                <span className="diff-sub">
                  {d === 'easy' && `Win at level ${WIN_LEVEL.easy}`}
                  {d === 'medium' && `Win at level ${WIN_LEVEL.medium}`}
                  {d === 'hard' && `Win at level ${WIN_LEVEL.hard}`}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const winLevel = WIN_LEVEL[difficulty];

  return (
    <div className="game-page">
      <div className="gs-container">
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
          <span className={`diff-badge diff-${difficulty}`}>{difficulty}</span>
        </div>
        <div className="game-header">
          <h1>Simon</h1>
          <div className="game-meta">
            <span>Level {level} / {winLevel}</span>
            <span>{phase === 'showing' ? 'Watch...' : phase === 'input' ? `Your turn (${playerIndex + 1}/${sequence.length})` : ''}</span>
            {hintUsed && <span className="hint-used">Hint used</span>}
          </div>
        </div>

        {gameOver && (
          <div className={`game-msg ${won ? 'success' : 'fail'}`}>{message}</div>
        )}
        {gameOver && (
          <div style={{ textAlign: 'center', marginBottom: 8, fontSize: 18, fontWeight: 700 }}>
            Score: {sequence.length * 10}
          </div>
        )}

        <div className="simon-grid">
          {COLORS.map(color => (
            <button
              key={color.id}
              className={`simon-pad ${color.className}${activeColor === color.id ? ' active' : ''}`}
              disabled={phase !== 'input' || gameOver}
              onClick={() => handleColorClick(color.id)}
            />
          ))}
        </div>

        <div className="game-controls">
          {!gameOver && phase === 'input' && !hintUsed && (
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={useHint}>Replay Sequence (Hint)</button>
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
