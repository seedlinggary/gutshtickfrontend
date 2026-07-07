import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import HowToPlay from '../HowToPlay';

// Pool of ~16 furniture types. w/h are footprint sizes in "room units" (a
// room is treated as roughly 12 units wide) so different pieces read as
// different sizes when placed.
const FURNITURE_POOL = [
  { type: 'bed', emoji: '🛏️', label: 'Bed', w: 2.6, h: 1.6 },
  { type: 'sofa', emoji: '🛋️', label: 'Sofa', w: 2.4, h: 1.1 },
  { type: 'chair', emoji: '🪑', label: 'Chair', w: 1, h: 1 },
  { type: 'tv', emoji: '📺', label: 'TV', w: 1.6, h: 1 },
  { type: 'lamp', emoji: '💡', label: 'Lamp', w: 0.7, h: 0.7 },
  { type: 'plant', emoji: '🪴', label: 'Plant', w: 0.8, h: 0.9 },
  { type: 'rug', emoji: '🟫', label: 'Rug', w: 2.2, h: 1.5 },
  { type: 'bookshelf', emoji: '📚', label: 'Bookshelf', w: 1.4, h: 0.8 },
  { type: 'desk', emoji: '🖥️', label: 'Desk', w: 1.6, h: 1 },
  { type: 'wardrobe', emoji: '🚪', label: 'Wardrobe', w: 1.2, h: 1.8 },
  { type: 'mirror', emoji: '🪞', label: 'Mirror', w: 0.9, h: 1.6 },
  { type: 'clock', emoji: '🕰️', label: 'Clock', w: 0.7, h: 0.7 },
  { type: 'window', emoji: '🪟', label: 'Window', w: 1.4, h: 1 },
  { type: 'fireplace', emoji: '🔥', label: 'Fireplace', w: 1.4, h: 1.2 },
  { type: 'piano', emoji: '🎹', label: 'Piano', w: 2, h: 1 },
  { type: 'aquarium', emoji: '🐠', label: 'Fish Tank', w: 1.4, h: 0.8 },
  { type: 'cabinet', emoji: '🗄️', label: 'Cabinet', w: 1.2, h: 1 },
  { type: 'candle', emoji: '🕯️', label: 'Candle', w: 0.5, h: 0.5 },
];

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const randomRoomRatio = () => +(1.15 + Math.random() * 0.55).toFixed(2); // width:height
const randomPalette = () => shuffle(FURNITURE_POOL).slice(0, 6 + Math.floor(Math.random() * 3)); // 6-8 items

/** A pure creative sandbox: place furniture into a room, drag it around
 * freely, rotate or remove it. No win condition, no score — "New Room"
 * just resets to an empty room with a freshly randomized palette and a
 * slightly different room shape each time. */
export default function RoomDesigner() {
  const [palette, setPalette] = useState(randomPalette);
  const [roomRatio, setRoomRatio] = useState(randomRoomRatio);
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const roomRef = useRef(null);
  const dragRef = useRef(null);
  const nextIdRef = useRef(1);

  const newRoom = () => {
    setPalette(randomPalette());
    setRoomRatio(randomRoomRatio());
    setItems([]);
    setSelectedId(null);
  };

  const addItem = (def) => {
    const id = nextIdRef.current++;
    const x = clamp(50 + (Math.random() * 30 - 15), 12, 88);
    const y = clamp(50 + (Math.random() * 30 - 15), 12, 88);
    setItems((prev) => [...prev, { id, ...def, x, y, rot: 0 }]);
    setSelectedId(id);
  };

  const handleItemPointerDown = (e, id) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = roomRef.current.getBoundingClientRect();
    const item = items.find((i) => i.id === id);
    dragRef.current = {
      id,
      pointerId: e.pointerId,
      rect,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: item.x,
      startY: item.y,
    };
    setSelectedId(id);
  };

  const handleItemPointerMove = (e) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const dxPct = ((e.clientX - d.startClientX) / d.rect.width) * 100;
    const dyPct = ((e.clientY - d.startClientY) / d.rect.height) * 100;
    setItems((prev) =>
      prev.map((it) => (it.id === d.id ? { ...it, x: clamp(d.startX + dxPct, 4, 96), y: clamp(d.startY + dyPct, 4, 96) } : it))
    );
  };

  const handleItemPointerUp = (e) => {
    const d = dragRef.current;
    if (d && e.pointerId === d.pointerId) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    dragRef.current = null;
  };

  const rotateSelected = () => {
    if (selectedId == null) return;
    setItems((prev) => prev.map((it) => (it.id === selectedId ? { ...it, rot: (it.rot + 45) % 360 } : it)));
  };

  const removeSelected = () => {
    if (selectedId == null) return;
    setItems((prev) => prev.filter((it) => it.id !== selectedId));
    setSelectedId(null);
  };

  const selectedItem = items.find((it) => it.id === selectedId) || null;

  return (
    <div className="game-page">
      <div className="game-header">
        <Link to="/games" className="game-back">← Games</Link>
        <h1 className="game-title">🛋️ Room Designer</h1>
        <p className="game-subtitle">Drag furniture into a room and arrange it however you like. No rules.</p>
      </div>

      <HowToPlay>
        <p>Tap a furniture item in the palette to add it to the room. Drag anything already placed to move it around freely.</p>
        <p>Tap a placed item to select it, then use <b>Rotate</b> or <b>Remove</b> below. Tap empty floor to deselect.</p>
        <p>There's no win condition here — it's a sandbox. Press <b>New Room</b> for an empty room, a new shape, and a freshly randomized furniture palette.</p>
      </HowToPlay>

      <div className="game-controls-bar">
        <button type="button" className="gs-btn gs-btn-primary gs-btn-sm" onClick={newRoom}>
          🔄 New Room
        </button>
        {selectedItem && (
          <div className="room-designer-selected-controls">
            <span>{selectedItem.emoji} {selectedItem.label} selected</span>
            <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={rotateSelected}>↻ Rotate</button>
            <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={removeSelected}>🗑 Remove</button>
          </div>
        )}
      </div>

      <div className="room-designer-palette">
        {palette.map((def) => (
          <button key={def.type} type="button" className="room-designer-palette-item" onClick={() => addItem(def)}>
            <span className="room-designer-palette-emoji">{def.emoji}</span>
            <span className="room-designer-palette-label">{def.label}</span>
          </button>
        ))}
      </div>

      <div
        ref={roomRef}
        className="room-designer-room"
        style={{ aspectRatio: roomRatio }}
        onPointerDown={() => setSelectedId(null)}
      >
        {items.length === 0 && <div className="room-designer-empty-hint">Tap a furniture item above to add it to the room.</div>}
        {items.map((it) => (
          <div
            key={it.id}
            className={`room-designer-item${selectedId === it.id ? ' selected' : ''}`}
            style={{
              left: `${it.x}%`,
              top: `${it.y}%`,
              width: `calc(var(--room-unit) * ${it.w})`,
              height: `calc(var(--room-unit) * ${it.h})`,
              fontSize: `calc(var(--room-unit) * ${Math.min(it.w, it.h) * 0.85})`,
              transform: `translate(-50%, -50%) rotate(${it.rot}deg)`,
              zIndex: selectedId === it.id ? 10 : 1,
            }}
            onPointerDown={(e) => handleItemPointerDown(e, it.id)}
            onPointerMove={handleItemPointerMove}
            onPointerUp={handleItemPointerUp}
            onPointerCancel={handleItemPointerUp}
          >
            {it.emoji}
          </div>
        ))}
      </div>
    </div>
  );
}
