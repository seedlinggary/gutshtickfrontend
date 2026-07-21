import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';
import HowToPlay from './HowToPlay';

// One-button endless flyer -- the "just one more try" arcade slot this
// library didn't have (everything else in Arcade is a classic port; nothing
// here is a pure high-score chaser). Canvas + requestAnimationFrame with a
// delta-time step and a stateRef/gameStatusRef pair (not plain useState read
// inside the loop) -- same pattern Breakout.js already uses, deliberately,
// after stale-closure bugs bit earlier canvas games in this codebase when
// the loop read state captured at loop-setup time instead of current state.
const W = 360;
const H = 520;
const BAGEL_X = 80;
const BAGEL_R = 16;
const GROUND_H = 40;
const GRAVITY = 1400;
const FLAP_V = -380;
const MAX_FALL_V = 600;
const PILLAR_W = 56;
const BASE_GAP = 175;
const MIN_GAP = 118;
const BASE_SPEED = 160;
const MAX_SPEED = 280;
const SPAWN_GAP_PX = 220;

function initState() {
  return { bagelY: H / 2, vy: 0, pillars: [], seeds: [], score: 0 };
}

function spawnPillar(state) {
  const gapHeight = Math.max(MIN_GAP, BASE_GAP - state.score * 2);
  const gapTop = 36 + Math.random() * (H - GROUND_H - gapHeight - 72);
  const pillar = { x: W + PILLAR_W, gapTop, gapHeight, scored: false };
  state.pillars.push(pillar);
  if (Math.random() < 0.55) {
    state.seeds.push({ x: pillar.x + PILLAR_W / 2, y: gapTop + gapHeight / 2, collected: false });
  }
}

export default function BagelFlight() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const stateRef = useRef(initState());
  const rafRef = useRef(null);
  const lastRef = useRef(0);
  const gameStatusRef = useRef('idle');
  const [gameStatus, setGameStatus] = useState('idle'); // idle | playing | over
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const saved = useRef(false);

  useEffect(() => {
    if (isLoggedIn()) {
      apiRequest('GET', null, '/game/stats').then((d) => {
        if (d?.bagel_flight?.best_score) setHighScore(d.bagel_flight.best_score);
      }).catch(() => {});
    }
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;

    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#ffe8d6');
    sky.addColorStop(1, '#fff6ec');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    s.pillars.forEach((p) => {
      ctx.fillStyle = '#f26d3d';
      ctx.fillRect(p.x, 0, PILLAR_W, p.gapTop);
      ctx.fillRect(p.x, p.gapTop + p.gapHeight, PILLAR_W, H - GROUND_H - (p.gapTop + p.gapHeight));
      ctx.fillStyle = '#ff8b5e';
      ctx.fillRect(p.x - 4, Math.max(0, p.gapTop - 14), PILLAR_W + 8, 14);
      ctx.fillRect(p.x - 4, p.gapTop + p.gapHeight, PILLAR_W + 8, 14);
    });

    s.seeds.forEach((sd) => {
      if (sd.collected) return;
      ctx.fillStyle = '#ffc24b';
      ctx.beginPath();
      ctx.arc(sd.x, sd.y, 6, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = '#4a3f35';
    ctx.fillRect(0, H - GROUND_H, W, GROUND_H);
    ctx.fillStyle = '#6b5f53';
    ctx.fillRect(0, H - GROUND_H, W, 6);

    ctx.save();
    ctx.translate(BAGEL_X, s.bagelY);
    const angle = Math.max(-0.5, Math.min(0.9, s.vy / 500));
    ctx.rotate(angle);
    ctx.fillStyle = '#d9a25c';
    ctx.beginPath();
    ctx.arc(0, 0, BAGEL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff6ec';
    ctx.beginPath();
    ctx.arc(0, 0, BAGEL_R * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a3f35';
    ctx.beginPath();
    ctx.arc(BAGEL_R * 0.5, -BAGEL_R * 0.3, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }, []);

  const endGame = useCallback((s) => {
    gameStatusRef.current = 'over';
    setGameStatus('over');
    setScore(s.score);
    setHighScore((prev) => (s.score > prev ? s.score : prev));
    if (!saved.current && isLoggedIn()) {
      saved.current = true;
      apiRequest('POST', { game_type: 'bagel_flight', result: 'loss', difficulty: 'medium', score: s.score }, '/game/save').catch(() => {});
    }
  }, []);

  const step = useCallback((dt) => {
    const s = stateRef.current;
    s.vy = Math.min(MAX_FALL_V, s.vy + GRAVITY * dt);
    s.bagelY += s.vy * dt;

    const speed = Math.min(MAX_SPEED, BASE_SPEED + s.score * 3);
    s.pillars.forEach((p) => { p.x -= speed * dt; });
    s.seeds.forEach((sd) => { sd.x -= speed * dt; });

    const last = s.pillars[s.pillars.length - 1];
    if (!last || (W - last.x) >= SPAWN_GAP_PX) spawnPillar(s);

    s.pillars = s.pillars.filter((p) => p.x + PILLAR_W > -10);
    s.seeds = s.seeds.filter((sd) => sd.x > -10 && !sd.collected);

    for (const p of s.pillars) {
      if (!p.scored && p.x + PILLAR_W < BAGEL_X) {
        p.scored = true;
        s.score += 1;
        setScore(s.score);
      }
      if (BAGEL_X + BAGEL_R > p.x && BAGEL_X - BAGEL_R < p.x + PILLAR_W) {
        if (s.bagelY - BAGEL_R < p.gapTop || s.bagelY + BAGEL_R > p.gapTop + p.gapHeight) {
          endGame(s);
          return;
        }
      }
    }

    for (const sd of s.seeds) {
      if (!sd.collected) {
        const dx = sd.x - BAGEL_X;
        const dy = sd.y - s.bagelY;
        if (Math.hypot(dx, dy) < BAGEL_R + 8) {
          sd.collected = true;
          s.score += 5;
          setScore(s.score);
        }
      }
    }

    if (s.bagelY + BAGEL_R > H - GROUND_H || s.bagelY - BAGEL_R < 0) {
      endGame(s);
    }
  }, [endGame]);

  const loop = useCallback((now) => {
    let dt = (now - lastRef.current) / 1000;
    lastRef.current = now;
    if (dt > 0.05) dt = 0.05;
    if (gameStatusRef.current === 'playing') step(dt);
    draw();
    if (gameStatusRef.current === 'playing') {
      rafRef.current = requestAnimationFrame(loop);
    }
  }, [step, draw]);

  const startGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    saved.current = false;
    stateRef.current = initState();
    setScore(0);
    setGameStatus('playing');
    gameStatusRef.current = 'playing';
    lastRef.current = performance.now();
    draw();
    rafRef.current = requestAnimationFrame(loop);
  }, [loop, draw]);

  const handleInput = useCallback((e) => {
    if (e) e.preventDefault();
    if (gameStatusRef.current === 'playing') {
      stateRef.current.vy = FLAP_V;
    } else {
      startGame();
    }
  }, [startGame]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space' || e.key === ' ') handleInput(e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleInput]);

  useEffect(() => { draw(); }, [draw]);
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return (
    <div className="game-page">
      <div className="gs-container">
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
        </div>
        <div className="game-header">
          <h1>Bagel Flight</h1>
          <p style={{ color: 'var(--muted)' }}>Tap, click, or press Space to flap. Thread the gaps, grab the seeds.</p>
        </div>

        <HowToPlay>
          <p><b>Objective:</b> fly as far as you can without hitting a pillar, the ground, or the ceiling.</p>
          <ul>
            <li>Tap/click the board (or press Space) to flap upward — gravity pulls you back down the rest of the time.</li>
            <li>Score a point for every gap you clear. Grab the golden seeds floating in some gaps for +5 bonus each.</li>
            <li>Gaps get tighter and the pace picks up the further you go — easy to learn, hard to master.</li>
            <li>Your best score is saved automatically and counts toward the Leaderboards tab.</li>
          </ul>
        </HowToPlay>

        <div className="game-stats-bar">
          <span>Score: <b>{score}</b></span>
          <span>Best: <b>{highScore}</b></span>
        </div>

        <div className="bagel-flight-wrapper" style={{ width: '100%', maxWidth: W }}>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="bagel-flight-canvas"
            style={{ touchAction: 'none', width: '100%', maxWidth: W, height: 'auto', display: 'block' }}
            onMouseDown={handleInput}
            onTouchStart={handleInput}
          />

          {gameStatus === 'idle' && (
            <div className="bagel-flight-overlay" onClick={handleInput}>
              <div className="bagel-flight-overlay-inner">
                <div style={{ fontSize: 36 }}>🥯</div>
                <p><b>Tap to start</b></p>
                <p style={{ fontSize: 13, opacity: 0.75 }}>Space, click, or tap</p>
              </div>
            </div>
          )}

          {gameStatus === 'over' && (
            <div className="bagel-flight-overlay" onClick={handleInput}>
              <div className="bagel-flight-overlay-inner">
                <div style={{ fontSize: 32 }}>💥</div>
                <h3 style={{ margin: '4px 0' }}>Game Over</h3>
                <p>Score: <b>{score}</b>{score >= highScore && score > 0 ? ' — new best! 🎉' : ''}</p>
                <button
                  className="gs-btn gs-btn-primary"
                  onClick={(e) => { e.stopPropagation(); startGame(); }}
                  style={{ marginTop: 8 }}
                >
                  Play Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
