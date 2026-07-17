import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { isLoggedIn } from '../auth';
import { shakeBoard } from '../actions';

// Edition number counts up once a day from a fixed anchor -- purely cosmetic
// (no backend concept of an "edition"), but it's what makes the board read
// as dated and worth checking again tomorrow instead of a static tagline.
const EDITION_EPOCH = new Date('2026-01-01T00:00:00Z').getTime();
const DAY_MS = 24 * 60 * 60 * 1000;

function editionNumber() {
  return Math.max(1, Math.floor((Date.now() - EDITION_EPOCH) / DAY_MS));
}

function todayLabel() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function DailyBoardHero() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [shaking, setShaking] = useState(false);

  const shakeTheBoard = async () => {
    if (shaking) return;
    setShaking(true);
    try {
      // Reshuffles the board you're already looking at (a fresh random
      // order, new Hock/Tachlis picks) rather than jumping away to one
      // unrelated post -- see actions.js's shakeBoard for why this needs
      // its own action instead of reusing fetchData().
      await dispatch(shakeBoard());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (_) {
      // No luck this time -- the board just stays put, nothing to break.
    } finally {
      setShaking(false);
    }
  };

  return (
    <div className="gs-hero">
      <div className="gs-container">
        <div>
          <span className="gs-hero-edition">☀️ {todayLabel()} · The Daily Board #{editionNumber()}</span>
          <h1 className="gs-hero-title">
            What's <span>good</span> today?
          </h1>
          <p className="gs-hero-sub">
            A little humor, a few good deals, and whatever the community's talking about.
            Grab a coffee and scroll.
          </p>
        </div>
        <div className="gs-hero-actions">
          <button type="button" className="gs-hero-shake" onClick={shakeTheBoard} disabled={shaking}>
            {shaking ? 'shaking…' : '🎲 Shake the board'}
          </button>
          <button
            type="button"
            className="gs-hero-pin"
            onClick={() => navigate(isLoggedIn() ? '/CreateShtick' : '/signup?next=%2FCreateShtick')}
          >
            ＋ Pin something
          </button>
        </div>
      </div>
    </div>
  );
}
