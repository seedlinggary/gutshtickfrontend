import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiRequest from '../ApiRequest';

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
  const [shaking, setShaking] = useState(false);

  const shakeTheBoard = async () => {
    if (shaking) return;
    setShaking(true);
    try {
      const pick = await apiRequest('GET', null, '/shtick/random');
      if (pick?.id) navigate(`/post/${pick.id}`);
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
          <span className="gs-hero-edition">{todayLabel()} · Edition #{editionNumber()}</span>
          <h1 className="gs-hero-title">
            The Daily <span>Board</span>
          </h1>
          <p className="gs-hero-sub">
            Curated content from across the web — filtered, approved, and pinned up fresh.
            No noise. Just the good stuff.
          </p>
        </div>
        <div className="gs-hero-actions">
          <button type="button" className="gs-hero-shake" onClick={shakeTheBoard} disabled={shaking}>
            {shaking ? 'shaking…' : '🎲 shake the board'}
          </button>
        </div>
      </div>
    </div>
  );
}
