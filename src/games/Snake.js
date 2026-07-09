import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';
import HowToPlay from './HowToPlay';

const COLS = 25;
const ROWS = 20;
const CELL = 22;
const W = COLS * CELL;
const H = ROWS * CELL;
const SPEEDS = { easy: 160, medium: 100, hard: 55 };

const rand = (max) => Math.floor(Math.random() * max);

function newFood(snake) {
  let pos;
  do {
    pos = { x: rand(COLS), y: rand(ROWS) };
  } while (snake.some((s) => s.x === pos.x && s.y === pos.y));
  return pos;
}

function initState() {
  const mid = { x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) };
  const snake = [mid, { x: mid.x - 1, y: mid.y }, { x: mid.x - 2, y: mid.y }];
  return { snake, dir: { x: 1, y: 0 }, nextDir: { x: 1, y: 0 }, food: newFood(snake), score: 0 };
}

export default function Snake() {
  const canvasRef = useRef(null);
  const stateRef = useRef(initState());
  const loopRef = useRef(null);
  const [difficulty, setDifficulty] = useState('medium');
  const [gameStatus, setGameStatus] = useState('idle'); // idle | playing | paused | over
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [hintVisible, setHintVisible] = useState(false);
  const [stats, setStats] = useState({ wins: 0, losses: 0, best_score: 0 });
  const saved = useRef(false);

  useEffect(() => {
    if (isLoggedIn()) {
      apiRequest('GET', null, '/game/stats').then((d) => {
        if (d?.snake) setStats(d.snake);
      }).catch(() => {});
    }
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { snake, food } = stateRef.current;

    ctx.clearRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, H); ctx.stroke(); }
    for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(W, y * CELL); ctx.stroke(); }

    // Food
    const fx = food.x * CELL + CELL / 2;
    const fy = food.y * CELL + CELL / 2;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(fx, fy, CELL / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    // Hint arrow toward food
    if (hintVisible) {
      const head = snake[0];
      const dx = food.x - head.x;
      const dy = food.y - head.y;
      const angle = Math.atan2(dy, dx);
      const hx = (head.x + 0.5) * CELL;
      const hy = (head.y + 0.5) * CELL;
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(angle);
      ctx.fillStyle = 'rgba(251,191,36,0.8)';
      ctx.beginPath();
      ctx.moveTo(CELL, 0);
      ctx.lineTo(-CELL / 2, -CELL / 2);
      ctx.lineTo(-CELL / 4, 0);
      ctx.lineTo(-CELL / 2, CELL / 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Snake
    snake.forEach((seg, i) => {
      const alpha = i === 0 ? 1 : 0.9 - (i / snake.length) * 0.5;
      ctx.fillStyle = i === 0 ? '#10b981' : `rgba(16,185,129,${alpha})`;
      const pad = i === 0 ? 1 : 2;
      ctx.beginPath();
      ctx.roundRect(seg.x * CELL + pad, seg.y * CELL + pad, CELL - pad * 2, CELL - pad * 2, i === 0 ? 5 : 3);
      ctx.fill();
    });

    // Eyes on head
    const head = snake[0];
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(head.x * CELL + CELL * 0.65, head.y * CELL + CELL * 0.3, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(head.x * CELL + CELL * 0.65, head.y * CELL + CELL * 0.7, 2.5, 0, Math.PI * 2); ctx.fill();
  }, [hintVisible]);

  const tick = useCallback(() => {
    const s = stateRef.current;
    const dir = s.nextDir;
    s.dir = dir;
    const head = { x: s.snake[0].x + dir.x, y: s.snake[0].y + dir.y };

    // Wrap walls
    head.x = (head.x + COLS) % COLS;
    head.y = (head.y + ROWS) % ROWS;

    // Self collision
    if (s.snake.some((seg) => seg.x === head.x && seg.y === head.y)) {
      clearInterval(loopRef.current);
      setGameStatus('over');
      setScore(s.score);
      if (s.score > highScore) setHighScore(s.score);
      if (!saved.current && isLoggedIn()) {
        saved.current = true;
        apiRequest('POST', { game_type: 'snake', result: 'loss', difficulty, score: s.score }, '/game/save').catch(() => {});
      }
      return;
    }

    s.snake = [head, ...s.snake];

    if (head.x === s.food.x && head.y === s.food.y) {
      s.score += 10;
      s.food = newFood(s.snake);
      setScore(s.score);
    } else {
      s.snake.pop();
    }

    draw();
  }, [difficulty, highScore, draw]);

  const startGame = useCallback(() => {
    clearInterval(loopRef.current);
    saved.current = false;
    stateRef.current = initState();
    setScore(0);
    setGameStatus('playing');
    setHintVisible(false);
    draw();
    loopRef.current = setInterval(tick, SPEEDS[difficulty]);
  }, [difficulty, tick, draw]);

  useEffect(() => {
    if (gameStatus === 'playing') {
      clearInterval(loopRef.current);
      loopRef.current = setInterval(tick, SPEEDS[difficulty]);
    }
    return () => clearInterval(loopRef.current);
  }, [difficulty]);

  // Shared by keyboard and the on-screen D-pad so both respect the same
  // "no instant reverse into yourself" guard.
  const setDirection = useCallback((newDir) => {
    const cur = stateRef.current.dir;
    if (newDir.x === -cur.x && newDir.y === -cur.y) return; // no reverse
    stateRef.current.nextDir = newDir;
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      const map = {
        ArrowUp: { x: 0, y: -1 }, w: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 }, s: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 }, a: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 }, d: { x: 1, y: 0 },
      };
      const newDir = map[e.key];
      if (!newDir) return;
      e.preventDefault();
      setDirection(newDir);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [setDirection]);

  useEffect(() => { draw(); }, [draw]);
  useEffect(() => () => clearInterval(loopRef.current), []);

  return (
    <div className="game-page">
      <div className="game-header">
        <Link to="/games" className="game-back">← Games</Link>
        <h1 className="game-title">Snake</h1>
        <p className="game-subtitle">Eat the red dot, avoid yourself. Arrow keys or WASD to move.</p>
      </div>

      <HowToPlay>
        <p><b>Objective:</b> eat as much food as possible without running into your own tail.</p>
        <ul>
          <li>On desktop, use the Arrow keys or WASD to steer.</li>
          <li>On mobile, use the on-screen arrow buttons below the board (they work the same as the keyboard controls).</li>
          <li>Each red dot you eat adds 10 points and makes your snake grow one segment longer, which makes later moves trickier to navigate.</li>
          <li>Walls wrap around — flying off one edge brings you back on the opposite side — but colliding with your own body ends the game.</li>
          <li>You can't reverse directly into yourself (e.g. tapping Left while moving Right is ignored).</li>
          <li>Toggle "Show Direction" for a hint arrow pointing from your head toward the food.</li>
        </ul>
      </HowToPlay>

      <div className="game-controls-bar">
        <div className="game-difficulty-select">
          {['easy', 'medium', 'hard'].map((d) => (
            <button key={d} className={`difficulty-btn${difficulty === d ? ' active' : ''}`}
              onClick={() => setDifficulty(d)}>
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
        <button className="gs-btn gs-btn-primary gs-btn-sm" onClick={startGame}>
          {gameStatus === 'idle' ? 'Start Game' : 'New Game'}
        </button>
      </div>

      {isLoggedIn() && (
        <div className="game-stats-bar">
          <span>Games Lost: <b>{stats.losses}</b></span>
          <span>Best: <b>{Math.max(stats.best_score, highScore)}</b></span>
        </div>
      )}

      <div className="snake-canvas-wrapper" style={{ width: '100%', maxWidth: W }}>
        <div className="snake-score-row" style={{ flexWrap: 'wrap' }}>
          <span>Score: <b>{score}</b></span>
          <span>High: <b>{highScore}</b></span>
          <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setHintVisible((h) => !h)}>
            {hintVisible ? '🧭 Hide Hint' : '🧭 Show Direction'}
          </button>
        </div>

        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="snake-canvas"
          style={{ touchAction: 'none', width: '100%', maxWidth: W, height: 'auto', display: 'block' }}
        />

        {gameStatus === 'idle' && (
          <div className="snake-overlay" onClick={startGame} style={{ cursor: 'pointer' }}>
            <div className="snake-overlay-inner">
              <p>Press <b>Start Game</b> to play</p>
              <p style={{ fontSize: 13, opacity: 0.7 }}>Arrow keys or WASD · Walls wrap around</p>
              <p style={{ fontSize: 12, opacity: 0.55, marginTop: 4 }}>(or tap anywhere here)</p>
            </div>
          </div>
        )}

        {gameStatus === 'over' && (
          <div className="snake-overlay">
            <div className="snake-overlay-inner">
              <div style={{ fontSize: 40 }}>💀</div>
              <h3>Game Over</h3>
              <p>Score: <b>{score}</b></p>
              <button className="gs-btn gs-btn-primary" onClick={startGame}>Play Again</button>
            </div>
          </div>
        )}
      </div>

      <div className="game-touch-controls">
        <button onClick={() => setDirection({ x: 0, y: -1 })}>↑</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setDirection({ x: -1, y: 0 })}>←</button>
          <button onClick={() => setDirection({ x: 0, y: 1 })}>↓</button>
          <button onClick={() => setDirection({ x: 1, y: 0 })}>→</button>
        </div>
      </div>
    </div>
  );
}
