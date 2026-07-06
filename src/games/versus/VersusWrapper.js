import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdSlot from '../../ads/AdSlot';

const GAME_MAP = {
  'chess':         lazy(() => import('./Chess')),
  'checkers':      lazy(() => import('./Checkers')),
  'connect-four':  lazy(() => import('./ConnectFour')),
  'reversi':       lazy(() => import('./Reversi')),
  'battleship':    lazy(() => import('./Battleship')),
  'dots-and-boxes':lazy(() => import('./DotsAndBoxes')),
  'tic-tac-toe':   lazy(() => import('./TicTacToe')),
  'nim':           lazy(() => import('./Nim')),
  'word-duel':     lazy(() => import('./WordDuel')),
  'mancala':       lazy(() => import('./Mancala')),
};

const GAME_TITLES = {
  'chess': 'Chess', 'checkers': 'Checkers', 'connect-four': 'Connect Four',
  'reversi': 'Reversi', 'battleship': 'Battleship', 'dots-and-boxes': 'Dots & Boxes',
  'tic-tac-toe': 'Tic-Tac-Toe', 'nim': 'Nim', 'word-duel': 'Word Duel', 'mancala': 'Mancala',
};

function GameFallback({ title }) {
  return (
    <div className="game-page" style={{ textAlign: 'center', paddingTop: 60 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔧</div>
      <h2>{title}</h2>
      <p style={{ color: 'var(--muted)' }}>This game is loading — check back in a moment.</p>
    </div>
  );
}

export default function VersusWrapper() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);

  // On mobile, choosing a mode/difficulty often requires scrolling down the
  // lobby screen; the resulting game view is much shorter, so without this
  // the browser keeps the old scroll position and the board renders
  // partially off-screen. Same on the way back to the (shorter) lobby.
  useEffect(() => { window.scrollTo(0, 0); }, [config]);

  const GameComponent = GAME_MAP[gameId];
  const title = GAME_TITLES[gameId] || gameId;

  if (!GameComponent) {
    return (
      <div className="game-page" style={{ textAlign: 'center', paddingTop: 60 }}>
        <h2>Game not found</h2>
        <button className="gs-btn gs-btn-outline" onClick={() => navigate('/games')}>← Back to Arcade</button>
      </div>
    );
  }

  if (config) {
    return (
      <>
        <div style={{ maxWidth: 480, margin: '12px auto 0' }}>
          <AdSlot placement="game_page" className="ad-slot-game-page" />
        </div>
        <Suspense fallback={<div className="game-page" style={{ textAlign: 'center', paddingTop: 60 }}>Loading {title}…</div>}>
          <GameComponent
            mode={config.mode}
            difficulty={config.difficulty}
            onBack={() => setConfig(null)}
          />
        </Suspense>
      </>
    );
  }

  return (
    <div className="game-page">
      <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
      <div style={{ textAlign: 'center', marginTop: 32 }}>
        <h1 style={{ marginBottom: 8 }}>{title}</h1>
        <p style={{ color: 'var(--muted)', marginBottom: 40 }}>How do you want to play?</p>

        <div className="versus-lobby" style={{ padding: 'clamp(16px, 5vw, 32px)' }}>
          <div className="versus-section">
            <h3>🤖 vs Computer</h3>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
              Choose your bot's skill level
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[
                { diff: 'easy',   label: '😊 Easy',   sub: 'Random moves' },
                { diff: 'medium', label: '🎯 Medium',  sub: 'Tactical play' },
                { diff: 'hard',   label: '🔥 Hard',    sub: 'Near-optimal' },
              ].map(({ diff, label, sub }) => (
                <button
                  key={diff}
                  className={`diff-btn diff-${diff}`}
                  onClick={() => setConfig({ mode: 'vs_computer', difficulty: diff })}
                >
                  <span className="diff-label">{label}</span>
                  <span className="diff-sub">{sub}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="versus-divider">or</div>

          <div className="versus-section">
            <h3>👥 Pass & Play</h3>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
              Two players take turns on this device
            </p>
            <button
              className="gs-btn gs-btn-primary"
              style={{ minWidth: 'min(180px, 100%)' }}
              onClick={() => setConfig({ mode: 'local', difficulty: null })}
            >
              Start Local Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
