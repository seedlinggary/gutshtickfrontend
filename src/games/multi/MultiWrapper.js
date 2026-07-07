import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdSlot from '../../ads/AdSlot';
import ComingSoon from '../ComingSoon';
import { isAdmin } from '../../auth';

const GAME_MAP = {
  'spades':       lazy(() => import('./Spades')),
  'uno':          lazy(() => import('./UNO')),
  'yahtzee':      lazy(() => import('./Yahtzee')),
  'poker':        lazy(() => import('./Poker')),
  'codenames':    lazy(() => import('./Codenames')),
  'catan':        lazy(() => import('./Catan')),
  'scrabble-lite':lazy(() => import('./ScrabbleLite')),
  'clue':         lazy(() => import('./Clue')),
  'risk':         lazy(() => import('./Risk')),
  'rummy':        lazy(() => import('./Rummy')),
};

const GAME_META = {
  'spades':       { title: 'Spades',      minPlayers: 4, maxPlayers: 4, icon: '♠️' },
  'uno':          { title: 'UNO',         minPlayers: 2, maxPlayers: 4, icon: '🃏' },
  'yahtzee':      { title: 'Yahtzee',     minPlayers: 2, maxPlayers: 4, icon: '🎲' },
  'poker':        { title: 'Poker',       minPlayers: 2, maxPlayers: 4, icon: '🃏' },
  'codenames':    { title: 'Codenames',   minPlayers: 4, maxPlayers: 4, icon: '🕵️' },
  'catan':        { title: 'Catan',       minPlayers: 3, maxPlayers: 4, icon: '🏝️' },
  'scrabble-lite':{ title: 'Scrabble',    minPlayers: 2, maxPlayers: 4, icon: '🔤' },
  'clue':         { title: 'Clue',        minPlayers: 3, maxPlayers: 4, icon: '🔍' },
  'risk':         { title: 'Risk',        minPlayers: 2, maxPlayers: 4, icon: '⚔️' },
  'rummy':        { title: 'Gin Rummy',   minPlayers: 2, maxPlayers: 4, icon: '🀄' },
};

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const COLORS = ['#e11d48','#2563eb','#16a34a','#d97706'];
const DEFAULT_NAMES = ['Player 1','Player 2','Player 3','Player 4'];

function PlayerRow({ idx, player, meta, onChange, onRemove, canRemove }) {
  return (
    // Inline flexWrap/sizing here is deliberately redundant with the
    // .mp-player-row / .mp-player-name / .mp-bot-diff rules in index.css —
    // this file styles itself independently so the row (name input, bot
    // checkbox, difficulty select, remove button) stays usable on a narrow
    // phone screen regardless of what the shared CSS does.
    <div className="mp-player-row" style={{ flexWrap: 'wrap' }}>
      <div className="mp-player-dot" style={{ background: COLORS[idx] }} />
      <input
        className="mp-player-name"
        style={{ fontSize: 16 }}
        value={player.name}
        onChange={(e) => onChange({ ...player, name: e.target.value })}
        placeholder={`Player ${idx + 1}`}
        disabled={player.isBot}
      />
      <label className="mp-bot-toggle">
        <input
          type="checkbox"
          checked={player.isBot}
          onChange={(e) => onChange({ ...player, isBot: e.target.checked, name: e.target.checked ? `Bot ${idx + 1}` : DEFAULT_NAMES[idx] })}
        />
        <span>Bot</span>
      </label>
      {player.isBot && (
        <select
          className="mp-bot-diff"
          style={{ fontSize: 16 }}
          value={player.botDifficulty}
          onChange={(e) => onChange({ ...player, botDifficulty: e.target.value })}
        >
          {DIFFICULTIES.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
        </select>
      )}
      {canRemove && (
        <button
          className="mp-remove-btn"
          style={{ minWidth: 40, minHeight: 40, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={onRemove}
          title="Remove player"
        >×</button>
      )}
    </div>
  );
}

export default function MultiWrapper() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const meta = GAME_META[gameId];
  const GameComponent = GAME_MAP[gameId];

  const [players, setPlayers] = useState(
    Array.from({ length: meta?.minPlayers || 2 }, (_, i) => ({
      name: DEFAULT_NAMES[i],
      isBot: false,
      botDifficulty: 'easy',
    }))
  );
  const [started, setStarted] = useState(false);

  // On mobile, the player-setup lobby often requires scrolling down (more so
  // with 3-4 players), and the resulting game view is a different height;
  // without this the browser keeps the old scroll position and the board
  // renders partially off-screen. Same on the way back to the lobby.
  useEffect(() => { window.scrollTo(0, 0); }, [started]);

  // The route is /games/multi/:gameId — navigating from one game's setup
  // screen straight to another's reuses this same component instance (React
  // Router doesn't remount just because a param changed), so the players
  // array from the previous game would otherwise leak into the new game's
  // lobby with the wrong length for its min/max. Reset on gameId change.
  useEffect(() => {
    if (!meta) return;
    setPlayers(Array.from({ length: meta.minPlayers }, (_, i) => ({
      name: DEFAULT_NAMES[i],
      isBot: false,
      botDifficulty: 'easy',
    })));
    setStarted(false);
  }, [gameId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Multiplayer games are still being rolled out to the general audience —
  // only admins/super-admins can actually play them for now.
  if (!isAdmin()) {
    return <ComingSoon title={`${meta?.title || gameId} — Multiplayer`} />;
  }

  if (!GameComponent || !meta) {
    return (
      <div className="game-page" style={{ textAlign: 'center', paddingTop: 60 }}>
        <h2>Game not found</h2>
        <button className="gs-btn gs-btn-outline" onClick={() => navigate('/games')}>← Back to Arcade</button>
      </div>
    );
  }

  if (started) {
    return (
      <>
        <div style={{ maxWidth: 480, margin: '12px auto 0' }}>
          <AdSlot placement="game_page" className="ad-slot-game-page" />
        </div>
        <Suspense fallback={<div className="game-page" style={{ textAlign: 'center', paddingTop: 60 }}>Loading {meta.title}…</div>}>
          <GameComponent players={players} onBack={() => setStarted(false)} />
        </Suspense>
      </>
    );
  }

  const canAddPlayer = players.length < meta.maxPlayers;
  const canRemovePlayer = players.length > meta.minPlayers;

  const addPlayer = () => {
    if (!canAddPlayer) return;
    const idx = players.length;
    setPlayers([...players, { name: DEFAULT_NAMES[idx], isBot: false, botDifficulty: 'easy' }]);
  };

  const removePlayer = (idx) => {
    setPlayers(players.filter((_, i) => i !== idx));
  };

  const updatePlayer = (idx, p) => {
    setPlayers(players.map((pl, i) => i === idx ? p : pl));
  };

  return (
    <div className="game-page">
      <button className="gs-btn gs-btn-outline gs-btn-sm" style={{ minHeight: 40 }} onClick={() => navigate('/games')}>← Games</button>

      <div style={{ textAlign: 'center', marginTop: 32, marginBottom: 24 }}>
        <div style={{ fontSize: 48 }}>{meta.icon}</div>
        <h1 style={{ margin: '8px 0 4px' }}>{meta.title}</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          {meta.minPlayers === meta.maxPlayers
            ? `${meta.minPlayers} players`
            : `${meta.minPlayers}–${meta.maxPlayers} players`}
          {' '}· Set up your players below, then start
        </p>
      </div>

      <div className="mp-lobby">
        <h3 style={{ marginBottom: 16 }}>Players</h3>

        {players.map((p, i) => (
          <PlayerRow
            key={i}
            idx={i}
            player={p}
            meta={meta}
            onChange={(updated) => updatePlayer(i, updated)}
            onRemove={() => removePlayer(i)}
            canRemove={canRemovePlayer}
          />
        ))}

        {canAddPlayer && (
          <button className="gs-btn gs-btn-outline gs-btn-sm" style={{ marginTop: 8, minHeight: 40 }} onClick={addPlayer}>
            + Add Player
          </button>
        )}

        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <button
            className="gs-btn gs-btn-primary"
            style={{ minWidth: 200, fontSize: 16, padding: '12px 24px' }}
            onClick={() => setStarted(true)}
          >
            Start Game →
          </button>
        </div>
      </div>
    </div>
  );
}
