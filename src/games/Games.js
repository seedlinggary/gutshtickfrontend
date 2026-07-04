import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';

const GAMES = [
  {
    id: 'hangman', path: 'hangman',
    title: 'Hangman', icon: '🪄', color: '#f59e0b',
    description: 'Guess the hidden word one letter at a time before the man swings. 3 difficulty levels, hints available.',
    tags: ['Word', 'Classic'],
  },
  {
    id: 'snake', path: 'snake',
    title: 'Snake', icon: '🐍', color: '#10b981',
    description: "Eat the apples, grow longer, don't bite yourself. Walls wrap around. Arrow keys or WASD.",
    tags: ['Arcade', 'Endless'],
  },
  {
    id: 'sudoku', path: 'sudoku',
    title: 'Sudoku', icon: '🔢', color: '#3b82f6',
    description: 'Fill the 9×9 grid so every row, column, and 3×3 box contains 1–9. New puzzle every game.',
    tags: ['Puzzle', 'Logic'],
  },
  {
    id: 'minesweeper', path: 'minesweeper',
    title: 'Minesweeper', icon: '💣', color: '#8b5cf6',
    description: 'Reveal safe squares without detonating a mine. Beginner to Expert grids. Right-click to flag.',
    tags: ['Strategy', 'Classic'],
  },
  {
    id: 'wordle', path: 'wordle',
    title: 'Wordle', icon: '🟩', color: '#22c55e',
    description: 'Guess the secret 5-letter word in 5–7 tries. Green = right spot, yellow = wrong spot.',
    tags: ['Word', 'Deduction'],
  },
  {
    id: 'word_scramble', path: 'word-scramble',
    title: 'Word Scramble', icon: '🔀', color: '#f97316',
    description: 'Race the clock to unscramble 10 words before time runs out. Harder modes use longer words.',
    tags: ['Word', 'Speed'],
  },
  {
    id: 'simon', path: 'simon',
    title: 'Simon Says', icon: '🔴', color: '#ef4444',
    description: 'Watch the flashing color pattern and repeat it exactly. Each round adds one more step.',
    tags: ['Memory', 'Reflex'],
  },
  {
    id: 'memory_match', path: 'memory-match',
    title: 'Memory Match', icon: '🃏', color: '#a855f7',
    description: 'Flip cards to find matching emoji pairs. Timed modes add pressure on medium and hard.',
    tags: ['Memory', 'Logic'],
  },
  {
    id: '2048', path: '2048',
    title: '2048', icon: '🧩', color: '#0ea5e9',
    description: 'Slide tiles to merge matching numbers. Reach 512, 1024, or 2048 depending on difficulty.',
    tags: ['Logic', 'Strategy'],
  },
  {
    id: 'lights_out', path: 'lights-out',
    title: 'Lights Out', icon: '💡', color: '#6366f1',
    description: 'Clicking a light toggles it and its neighbors. Turn every light off to win.',
    tags: ['Logic', 'Puzzle'],
  },
];

export default function Games() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState({});

  useEffect(() => {
    if (isLoggedIn()) {
      apiRequest('GET', null, '/game/stats').then(setStats).catch(() => {});
    }
    GAMES.forEach(({ id }) => {
      apiRequest('GET', null, `/game/leaderboard/${id}`)
        .then((d) => setLeaderboard((prev) => ({ ...prev, [id]: d })))
        .catch(() => {});
    });
  }, []);

  return (
    <div className="games-page">
      <div className="games-hero">
        <h1>🎮 The Good Shtick Arcade</h1>
        <p>Take a break and play. Wins, losses, and high scores tracked for logged-in players.</p>
      </div>

      <div className="games-grid">
        {GAMES.map((game) => {
          const myStats = stats?.[game.id];
          const top3 = leaderboard[game.id]?.slice(0, 3) || [];
          return (
            <div key={game.id} className="game-card" onClick={() => navigate(`/games/${game.path}`)}>
              <div className="game-card-icon" style={{ background: game.color }}>{game.icon}</div>
              <div className="game-card-body">
                <div className="game-card-tags">
                  {game.tags.map((t) => <span key={t} className="game-tag">{t}</span>)}
                </div>
                <h3 className="game-card-title">{game.title}</h3>
                <p className="game-card-desc">{game.description}</p>

                {myStats && (
                  <div className="game-card-stats">
                    <span>✅ {myStats.wins} wins</span>
                    <span>❌ {myStats.losses} losses</span>
                    {myStats.best_score > 0 && <span>🏆 {myStats.best_score} best</span>}
                  </div>
                )}

                {top3.length > 0 && (
                  <div className="game-leaderboard-mini">
                    <div className="glm-title">Top Players</div>
                    {top3.map((row, i) => (
                      <div key={i} className="glm-row">
                        <span>{['🥇','🥈','🥉'][i]}</span>
                        <span>{row.profile_name}</span>
                        <span>{row.best_score}</span>
                      </div>
                    ))}
                  </div>
                )}

                <button className="gs-btn gs-btn-primary gs-btn-sm game-card-play">
                  Play Now →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {!isLoggedIn() && (
        <div className="games-signin-notice">
          <span>🏆 Sign in to track your wins, losses, and compete on the leaderboard.</span>
          <button className="gs-btn gs-btn-primary gs-btn-sm" onClick={() => navigate('/signin')}>Sign In</button>
        </div>
      )}
    </div>
  );
}
