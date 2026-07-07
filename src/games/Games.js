import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import { isLoggedIn, isAdmin } from '../auth';
import AdSlot from '../ads/AdSlot';
import ShareButton from '../ShareButton';

const SOLO_GAMES = [
  { id: 'hangman',      path: '/games/hangman',        title: 'Hangman',       icon: '🪄', color: '#f59e0b', tags: ['Word','Classic'],    desc: 'Guess the hidden word one letter at a time.' },
  { id: 'snake',        path: '/games/snake',          title: 'Snake',         icon: '🐍', color: '#10b981', tags: ['Arcade','Endless'],   desc: 'Eat apples, grow longer, don\'t bite yourself.' },
  { id: 'sudoku',       path: '/games/sudoku',         title: 'Sudoku',        icon: '🔢', color: '#3b82f6', tags: ['Puzzle','Logic'],     desc: 'Fill the 9×9 grid so every row, column, and box contains 1–9.' },
  { id: 'minesweeper',  path: '/games/minesweeper',    title: 'Minesweeper',   icon: '💣', color: '#8b5cf6', tags: ['Strategy','Classic'], desc: 'Reveal safe squares without detonating a mine.' },
  { id: 'wordle',       path: '/games/wordle',         title: 'Wordle',        icon: '🟩', color: '#22c55e', tags: ['Word','Deduction'],   desc: 'Guess the secret 5-letter word in 6 tries.' },
  { id: 'word_scramble',path: '/games/word-scramble',  title: 'Word Scramble', icon: '🔀', color: '#f97316', tags: ['Word','Speed'],       desc: 'Race the clock to unscramble 10 words.' },
  { id: 'simon',        path: '/games/simon',          title: 'Simon Says',    icon: '🔴', color: '#ef4444', tags: ['Memory','Reflex'],    desc: 'Repeat the flashing color pattern.' },
  { id: 'memory_match', path: '/games/memory-match',   title: 'Memory Match',  icon: '🃏', color: '#a855f7', tags: ['Memory','Logic'],     desc: 'Flip cards to find matching emoji pairs.' },
  { id: '2048',         path: '/games/2048',           title: '2048',          icon: '🧩', color: '#0ea5e9', tags: ['Logic','Strategy'],   desc: 'Slide tiles to merge matching numbers.' },
  { id: 'lights_out',   path: '/games/lights-out',     title: 'Lights Out',    icon: '💡', color: '#6366f1', tags: ['Logic','Puzzle'],     desc: 'Clicking a light toggles it and its neighbors. Turn all off.' },
  { id: 'kenken',       path: '/games/kenken',         title: 'KenKen',        icon: '🧮', color: '#0d9488', tags: ['Logic','Math'],       desc: 'Fill the grid with numbers satisfying math cage targets.' },
  { id: 'kakuro',       path: '/games/kakuro',         title: 'Kakuro',        icon: '➕', color: '#7c3aed', tags: ['Logic','Numbers'],    desc: 'Number crossword: each run must sum to its clue.' },
  { id: 'nonogram',     path: '/games/nonogram',       title: 'Nonogram',      icon: '🖼️', color: '#be185d', tags: ['Puzzle','Logic'],     desc: 'Paint cells to reveal a picture from row/column clues.' },
  { id: 'n_queens',     path: '/games/n-queens',       title: 'N-Queens',      icon: '♛', color: '#b45309', tags: ['Strategy','Logic'],   desc: 'Place N queens on a chessboard with no attacks.' },
  { id: 'futoshiki',    path: '/games/futoshiki',      title: 'Futoshiki',     icon: '⚖️', color: '#065f46', tags: ['Logic','Inequality'], desc: 'Sudoku-style grid with inequality constraints between cells.' },
  { id: 'binary_puzzle',path: '/games/binary-puzzle',  title: 'Binary Puzzle', icon: '🔵', color: '#1e40af', tags: ['Logic','Deduction'],  desc: 'Fill the grid with 0s and 1s following three strict rules.' },
  { id: 'skyscrapers',  path: '/games/skyscrapers',    title: 'Skyscrapers',   icon: '🏙️', color: '#374151', tags: ['Logic','Vision'],     desc: 'Place buildings so the edge clues match your view count.' },
  { id: 'fifteen_puzzle',path: '/games/fifteen-puzzle',title: '15 Puzzle',     icon: '🔲', color: '#92400e', tags: ['Sliding','Classic'],  desc: 'Slide tiles into order in the classic 4×4 puzzle.' },
  { id: 'towers_hanoi', path: '/games/towers-hanoi',   title: 'Hanoi',         icon: '🗼', color: '#7f1d1d', tags: ['Classic','Logic'],    desc: 'Move all discs from peg A to peg C, one at a time.' },
  { id: 'flow_free',    path: '/games/flow-free',      title: 'Flow Free',     icon: '🌈', color: '#7c2d12', tags: ['Path','Logic'],       desc: 'Connect matching dots with paths that cover every cell.' },
  { id: 'cryptogram',   path: '/games/cryptogram',     title: 'Cryptogram',    icon: '🔐', color: '#134e4a', tags: ['Word','Deduction'],   desc: 'Decode the substitution cipher to reveal a famous quote.' },
  { id: 'sokoban',      path: '/games/sokoban',        title: 'Sokoban',       icon: '📦', color: '#4a1942', tags: ['Puzzle','Strategy'],  desc: 'Push boxes onto target squares — you can only push, not pull.' },
  { id: 'hashi',        path: '/games/hashi',          title: 'Bridges',       icon: '🌉', color: '#1e3a5f', tags: ['Logic','Graph'],      desc: 'Connect islands with bridges matching their number.' },
  { id: 'nurikabe',     path: '/games/nurikabe',       title: 'Nurikabe',      icon: '🌊', color: '#0c4a6e', tags: ['Logic','Deduction'],  desc: 'Paint a river of black cells obeying island rules.' },
  { id: 'mastermind',   path: '/games/mastermind',     title: 'Mastermind',    icon: '🎯', color: '#4c0519', tags: ['Deduction','Classic'],'desc': 'Guess the secret color code from peg feedback.' },
];

const VERSUS_GAMES = [
  { id: 'chess',        path: '/games/versus/chess',         title: 'Chess',         icon: '♟️', color: '#1e293b', tags: ['Strategy','Classic'],   desc: 'Full chess with castling, en passant, and check detection.' },
  { id: 'checkers',     path: '/games/versus/checkers',      title: 'Checkers',      icon: '🔴', color: '#991b1b', tags: ['Strategy','Classic'],   desc: 'Diagonal moves, mandatory captures, multi-jump, kinging.' },
  { id: 'connect_four', path: '/games/versus/connect-four',  title: 'Connect Four',  icon: '🟡', color: '#d97706', tags: ['Strategy','Classic'],   desc: 'Drop pieces to get four in a row before your opponent.' },
  { id: 'reversi',      path: '/games/versus/reversi',       title: 'Reversi',       icon: '⚫', color: '#374151', tags: ['Strategy','Abstract'],  desc: 'Flip opponent pieces to control the board. Most pieces wins.' },
  { id: 'battleship',   path: '/games/versus/battleship',    title: 'Battleship',    icon: '🚢', color: '#1d4ed8', tags: ['Strategy','Hidden'],    desc: 'Place your fleet and sink the enemy\'s ships first.' },
  { id: 'dots_and_boxes',path: '/games/versus/dots-and-boxes',title: 'Dots & Boxes', icon: '🔲', color: '#6d28d9', tags: ['Strategy','Classic'],   desc: 'Complete boxes to score — steal chains from your opponent.' },
  { id: 'tic_tac_toe',  path: '/games/versus/tic-tac-toe',   title: 'Tic-Tac-Toe',  icon: '✖️', color: '#be185d', tags: ['Classic','Quick'],      desc: 'Classic 3×3 — or try the 9-board Ultimate variant.' },
  { id: 'nim',          path: '/games/versus/nim',           title: 'Nim',           icon: '🪵', color: '#7f1d1d', tags: ['Math','Strategy'],      desc: 'Take matchsticks from rows. Force your opponent to take the last.' },
  { id: 'word_duel',    path: '/games/versus/word-duel',     title: 'Word Duel',     icon: '⚡', color: '#0e7490', tags: ['Word','Speed'],         desc: 'Same letters, 60 seconds — who can make the longest word?' },
  { id: 'mancala',      path: '/games/versus/mancala',       title: 'Mancala',       icon: '🪨', color: '#78350f', tags: ['Strategy','Classic'],   desc: 'Distribute seeds, capture pits, fill your Mancala store.' },
];

const MULTI_GAMES = [
  { id: 'spades',      path: '/games/multi/spades',       title: 'Spades',        icon: '♠️', color: '#1e293b', tags: ['Cards','Classic'],   desc: 'Full Spades with partnerships, nil bids, and bag penalties.' },
  { id: 'uno',         path: '/games/multi/uno',          title: 'UNO',           icon: '🃏', color: '#dc2626', tags: ['Cards','Party'],     desc: 'Full UNO with Draw Two, Skip, Reverse, and Wild Draw Four.' },
  { id: 'yahtzee',     path: '/games/multi/yahtzee',      title: 'Yahtzee',       icon: '🎲', color: '#d97706', tags: ['Dice','Classic'],    desc: 'Roll 5 dice, fill your scorecard, beat everyone\'s total.' },
  { id: 'poker',       path: '/games/multi/poker',        title: 'Poker',         icon: '🃏', color: '#065f46', tags: ['Cards','Bluffing'],  desc: 'Texas Hold\'em with blinds, betting rounds, and showdowns.' },
  { id: 'codenames',   path: '/games/multi/codenames',    title: 'Codenames',     icon: '🕵️', color: '#4c0519', tags: ['Word','Teams'],      desc: 'Spymasters give one-word clues; teams guess the right words.' },
  { id: 'catan',       path: '/games/multi/catan',        title: 'Catan',         icon: '🏝️', color: '#92400e', tags: ['Strategy','Euro'],   desc: 'Full Settlers of Catan — build, trade, and race to 10 VP.' },
  { id: 'scrabble_lite',path:'/games/multi/scrabble-lite',title: 'Scrabble',      icon: '🔤', color: '#1e40af', tags: ['Word','Classic'],    desc: 'Tile-laying word game with premium squares and bingos.' },
  { id: 'clue',        path: '/games/multi/clue',         title: 'Clue',          icon: '🔍', color: '#312e81', tags: ['Deduction','Party'], desc: 'Move between rooms and eliminate suspects, weapons, rooms.' },
  { id: 'risk',        path: '/games/multi/risk',         title: 'Risk',          icon: '⚔️', color: '#7f1d1d', tags: ['Strategy','War'],    desc: 'Conquer territories with dice battles — control the map.' },
  { id: 'rummy',       path: '/games/multi/rummy',        title: 'Gin Rummy',     icon: '🀄', color: '#4a1942', tags: ['Cards','Classic'],   desc: 'Meld sets and runs, knock before your opponent gins.' },
];

// Relaxing games have no win/loss/score — nothing to track, no leaderboard,
// no /game/save calls. Kept out of ALL_IDS/ALL_GAMES so they never show up
// in the Leaderboards tab's per-game dropdown.
const RELAXING_GAMES = [
  { id: 'color_by_number', path: '/games/color-by-number', title: 'Color by Number', icon: '🎨', color: '#f472b6', tags: ['Relaxing','Creative'], desc: 'Fill numbered regions with their matching color. A new picture every time.' },
  { id: 'room_designer',   path: '/games/room-designer',   title: 'Room Designer',   icon: '🛋️', color: '#c084fc', tags: ['Relaxing','Creative'], desc: 'Drag furniture into a room and arrange it however you like. No rules.' },
  { id: 'jigsaw_puzzle',   path: '/games/jigsaw-puzzle',   title: 'Jigsaw Puzzle',   icon: '🧩', color: '#60a5fa', tags: ['Relaxing','Puzzle'],   desc: 'Piece together a fresh generated image. New picture every game.' },
  { id: 'zen_garden',      path: '/games/zen-garden',      title: 'Zen Garden',      icon: '🪨', color: '#a3a380', tags: ['Relaxing','Creative'], desc: 'Rake calming sand patterns around randomly placed stones.' },
  { id: 'bubble_pop',      path: '/games/bubble-pop',      title: 'Bubble Pop',      icon: '🫧', color: '#38bdf8', tags: ['Relaxing','Casual'],   desc: 'Pop drifting bubbles at your own pace. No timer, no pressure.' },
  { id: 'tangram',         path: '/games/tangram',         title: 'Tangram',         icon: '🔺', color: '#fb923c', tags: ['Relaxing','Puzzle'],   desc: 'Fit geometric pieces into a silhouette. A new shape every game.' },
  { id: 'dot_to_dot',      path: '/games/dot-to-dot',      title: 'Dot to Dot',      icon: '🔢', color: '#34d399', tags: ['Relaxing','Casual'],   desc: 'Connect the numbered dots to reveal a picture.' },
  { id: 'mandala_draw',    path: '/games/mandala-draw',    title: 'Mandala Draw',    icon: '🌸', color: '#e879f9', tags: ['Relaxing','Creative'], desc: 'Draw with mirrored symmetry for an instant kaleidoscope pattern.' },
  { id: 'chill_word_search',path:'/games/word-search-chill',title:'Chill Word Search', icon: '🔤', color: '#facc15', tags: ['Relaxing','Word'],   desc: 'Find hidden words at your own pace. No timer, no losing.' },
  { id: 'zen_match3',      path: '/games/zen-match3',      title: 'Zen Match-3',     icon: '💎', color: '#2dd4bf', tags: ['Relaxing','Casual'],   desc: 'Endless, low-pressure match-3. Swap gems, clear lines, relax.' },
  { id: 'spirograph',      path: '/games/spirograph',      title: 'Spirograph',     icon: '🌀', color: '#818cf8', tags: ['Relaxing','Creative'], desc: 'Classic gear-driven curves. New ratios and colors every time.' },
  { id: 'fractal_bloom',   path: '/games/fractal-bloom',   title: 'Fractal Bloom',  icon: '🌺', color: '#fb7185', tags: ['Relaxing','Creative'], desc: 'Tap to grow procedural blooming branches. Plant a whole garden.' },
  { id: 'light_trails',    path: '/games/light-trails',    title: 'Light Trails',   icon: '✨', color: '#22d3ee', tags: ['Relaxing','Creative'], desc: 'Glowing trails follow your finger or cursor. Pure ambient fun.' },
  { id: 'stained_glass',   path: '/games/stained-glass',   title: 'Stained Glass',  icon: '🪟', color: '#f59e0b', tags: ['Relaxing','Creative'], desc: 'Tap to place colored glass shards and build a mosaic.' },
  { id: 'constellation',   path: '/games/constellation',   title: 'Constellation',  icon: '⭐', color: '#4338ca', tags: ['Relaxing','Creative'], desc: 'Place stars in a night sky — nearby ones connect automatically.' },
];

const ALL_IDS = [
  ...SOLO_GAMES.map(g => g.id),
  ...VERSUS_GAMES.map(g => g.id),
  ...MULTI_GAMES.map(g => g.id),
];

const ALL_GAMES = [...SOLO_GAMES, ...VERSUS_GAMES, ...MULTI_GAMES];

const TABS = [
  { key: 'solo',  label: '🎮 Solo',        sub: '25 games' },
  { key: 'relaxing', label: '🌿 Relaxing', sub: '15 games' },
  { key: 'versus',label: '⚔️  1v1',         sub: '10 games' },
  { key: 'multi', label: '👥 Multiplayer', sub: '10 games' },
  { key: 'leaderboards', label: '🏆 Leaderboards', sub: 'All games' },
];

const PERIODS = [
  { key: 'daily',    label: 'Daily' },
  { key: 'weekly',   label: 'Weekly' },
  { key: 'monthly',  label: 'Monthly' },
  { key: 'yearly',   label: 'Yearly' },
  { key: 'all_time', label: 'All-Time' },
];

function LeaderboardsPanel() {
  const [gameId, setGameId] = useState(ALL_GAMES[0].id);
  const [period, setPeriod] = useState('all_time');
  const [limit, setLimit] = useState(10);
  const [entries, setEntries] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiRequest('GET', null, `/game/leaderboard/${gameId}?period=${period}&limit=${limit}`)
      .then((d) => { if (!cancelled) setEntries(d); })
      .catch(() => { if (!cancelled) setEntries([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [gameId, period, limit]);

  const game = ALL_GAMES.find((g) => g.id === gameId);
  const medals = ['🥇', '🥈', '🥉'];
  const myProfileName = localStorage.getItem('profile_name');

  return (
    <div className="leaderboards-panel">
      <div className="leaderboards-controls">
        <select
          className="auth-input leaderboard-game-select"
          value={gameId}
          onChange={(e) => setGameId(e.target.value)}
        >
          {ALL_GAMES.map((g) => (
            <option key={g.id} value={g.id}>{g.icon} {g.title}</option>
          ))}
        </select>

        <div className="leaderboard-period-group">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              className={`difficulty-btn${period === p.key ? ' active' : ''}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="leaderboard-limit-group">
          {[10, 25].map((n) => (
            <button
              key={n}
              className={`difficulty-btn${limit === n ? ' active' : ''}`}
              onClick={() => setLimit(n)}
            >
              Top {n}
            </button>
          ))}
        </div>
      </div>

      <div className="gs-card leaderboard-card">
        <div className="gs-card-body">
          <h3 className="shtick-caption" style={{ marginBottom: 14 }}>
            {game?.icon} {game?.title} — {PERIODS.find((p) => p.key === period)?.label} Top {limit}
          </h3>

          {loading && <div className="gs-loading"><div className="gs-spinner" /></div>}

          {!loading && entries && entries.length === 0 && (
            <div className="admin-empty">No scores yet for this game/period — be the first!</div>
          )}

          {!loading && entries && entries.length > 0 && (
            <div className="leaderboard-list">
              {entries.map((e, i) => (
                <div key={i} className="leaderboard-row">
                  <span className="leaderboard-rank">{medals[i] || `#${i + 1}`}</span>
                  <span className="leaderboard-name">{e.profile_name}</span>
                  <span className="leaderboard-score">{e.best_score} pts</span>
                  <span className="leaderboard-games">{e.games} game{e.games === 1 ? '' : 's'}</span>
                  {e.profile_name === myProfileName && (
                    <ShareButton
                      className="leaderboard-share"
                      title="The Good Shtick"
                      text={`I'm ranked #${i + 1} on ${game?.title} with ${e.best_score} pts on The Good Shtick! Can you beat me?`}
                      url={`${window.location.origin}${game?.path || '/games'}`}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GameCard({ game, myStats, top3, onClick, locked }) {
  return (
    <div className={`game-card${locked ? ' game-card-locked' : ''}`} onClick={onClick}>
      <div className="game-card-icon" style={{ background: game.color }}>{game.icon}</div>
      <div className="game-card-body">
        <div className="game-card-tags">
          {locked
            ? <span className="game-tag game-tag-locked">🔒 Admins Only</span>
            : game.tags.map((t) => <span key={t} className="game-tag">{t}</span>)}
        </div>
        <h3 className="game-card-title">{game.title}</h3>
        <p className="game-card-desc">{game.desc}</p>
        {myStats && (
          <div className="game-card-stats">
            <span>✅ {myStats.wins}W</span>
            <span>❌ {myStats.losses}L</span>
            {myStats.best_score > 0 && <span>🏆 {myStats.best_score}</span>}
          </div>
        )}
        {top3?.length > 0 && (
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
        <button className={`gs-btn gs-btn-sm game-card-play${locked ? ' gs-btn-outline' : ' gs-btn-primary'}`}>
          {locked ? 'Coming Soon' : 'Play Now →'}
        </button>
      </div>
    </div>
  );
}

export default function Games() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('solo');
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState({});

  useEffect(() => {
    if (isLoggedIn()) {
      apiRequest('GET', null, '/game/stats').then(setStats).catch(() => {});
    }
    // One request for every game's top-3, instead of one request per game card
    // (was up to 25 requests per tab visit). Fetched once for the whole page —
    // switching tabs re-renders from what's already loaded, no re-fetch.
    apiRequest('GET', null, '/game/leaderboards/top3').then(setLeaderboard).catch(() => {});
  }, []);

  const activeGames = tab === 'solo' ? SOLO_GAMES
    : tab === 'relaxing' ? RELAXING_GAMES
    : tab === 'versus' ? VERSUS_GAMES
    : MULTI_GAMES;

  return (
    <div className="games-page">
      <div className="games-hero">
        <h1>🎮 The Good Shtick Arcade</h1>
        <p>Solo puzzles, relaxing games, head-to-head duels, or multiplayer parties — all tracked for logged-in players.</p>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto 20px' }}>
        <AdSlot placement="games_hub" />
      </div>

      <div className="games-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`games-tab-btn${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            <span className="tab-label">{t.label}</span>
            <span className="tab-sub">{t.sub}</span>
          </button>
        ))}
      </div>

      {tab === 'relaxing' && (
        <div className="games-tab-notice">
          🌿 No scores, no timers, no losing — just something to do with your hands. Every game generates a fresh board, so it's never the same twice.
        </div>
      )}
      {tab === 'versus' && (
        <div className="games-tab-notice">
          ⚔️ Challenge the computer or pass the screen to a friend. Bots have Easy, Medium, and Hard difficulty.
        </div>
      )}
      {tab === 'multi' && (
        <div className="games-tab-notice">
          👥 2–4 players on one device. Absent seats can be filled by bots. Create a room or join by code (coming soon: online rooms).
        </div>
      )}

      {tab === 'leaderboards' ? (
        <LeaderboardsPanel />
      ) : (
        <div className="games-grid">
          {activeGames.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              myStats={stats?.[game.id]}
              top3={leaderboard[game.id]?.slice(0, 3)}
              onClick={() => navigate(game.path)}
              locked={(tab === 'versus' || tab === 'multi') && !isAdmin()}
            />
          ))}
        </div>
      )}

      {!isLoggedIn() && (
        <div className="games-signin-notice">
          <span>🏆 Sign in to track your wins, losses, and compete on the leaderboard.</span>
          <button className="gs-btn gs-btn-primary gs-btn-sm" onClick={() => navigate('/signin')}>Sign In</button>
        </div>
      )}
    </div>
  );
}
