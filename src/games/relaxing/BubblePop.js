import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import HowToPlay from '../HowToPlay';

const BUBBLE_COUNT = 14;
const PASTELS = [
  '#fecaca', '#fed7aa', '#fde68a', '#d9f99d', '#bbf7d0',
  '#a7f3d0', '#bfdbfe', '#c7d2fe', '#ddd6fe', '#fbcfe8', '#fecdd3',
];

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function makeBubble(id) {
  return {
    id,
    x: rand(6, 92),
    y: rand(8, 88),
    size: Math.round(rand(34, 68)),
    color: PASTELS[Math.floor(Math.random() * PASTELS.length)],
    duration: rand(3.2, 5.5),
    delay: rand(0, 2.5),
    popping: false,
  };
}

function makeField() {
  const bubbles = [];
  for (let i = 0; i < BUBBLE_COUNT; i++) bubbles.push(makeBubble(i));
  return bubbles;
}

export default function BubblePop() {
  const [bubbles, setBubbles] = useState(() => makeField());
  const nextId = useRef(BUBBLE_COUNT);

  function handlePop(id) {
    setBubbles((prev) => prev.map((b) => (b.id === id ? { ...b, popping: true } : b)));
    setTimeout(() => {
      setBubbles((prev) => {
        if (!prev.some((b) => b.id === id)) return prev;
        const next = prev.filter((b) => b.id !== id);
        next.push(makeBubble(nextId.current++));
        return next;
      });
    }, 260);
  }

  function handleNewField() {
    nextId.current = BUBBLE_COUNT;
    setBubbles(makeField());
  }

  return (
    <div className="game-page">
      <div className="game-header">
        <Link to="/games" className="game-back">← Games</Link>
        <h1 className="game-title">🫧 Bubble Pop</h1>
        <p className="game-subtitle">Tap the bubbles. That's it — just a satisfying little fidget.</p>
      </div>
      <HowToPlay>
        <p>A field of gently bobbing bubbles.</p>
        <ul>
          <li>Tap or click any bubble to pop it — a new one drifts in to take its place.</li>
          <li>No score, no timer, nothing to lose.</li>
          <li>Press "New Field" for a completely fresh set of bubbles.</li>
        </ul>
      </HowToPlay>

      <div className="bubble-pop-field">
        {bubbles.map((b) => (
          <div
            key={b.id}
            className="bubble-pop-bubble-wrap"
            style={{
              left: `${b.x}%`,
              top: `${b.y}%`,
              animationDuration: `${b.duration}s`,
              animationDelay: `${b.delay}s`,
            }}
          >
            <button
              type="button"
              className={`bubble-pop-bubble${b.popping ? ' is-popping' : ''}`}
              style={{
                width: b.size,
                height: b.size,
                background: `radial-gradient(circle at 32% 28%, #ffffff, ${b.color} 70%)`,
              }}
              onClick={() => handlePop(b.id)}
              aria-label="Pop bubble"
            />
          </div>
        ))}
      </div>

      <div className="bubble-pop-footer">
        <button type="button" className="bubble-pop-btn" onClick={handleNewField}>
          New Field
        </button>
      </div>
    </div>
  );
}
