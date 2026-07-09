import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import HowToPlay from '../HowToPlay';
import { FURNITURE, CATEGORIES, FLOOR_STYLES, WALL_COLORS } from './roomDesignerData';

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const randomOf = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomRoomRatio = () => +(1.1 + Math.random() * 0.7).toFixed(2); // width:height

// A hand-placed "instant room" template (percentage positions) used by
// Auto-Furnish — a random scatter never actually looks designed, so this is
// a real small floor plan: rug anchoring the seating area, sofa against the
// back wall facing in, coffee table in front of it, TV opposite, a plant
// softening a corner. Rotations assume the room is wider than it is tall;
// still reads fine on a squarer room.
const STARTER_LAYOUT = [
  { type: 'rug_rect', x: 50, y: 60, rot: 0 },
  { type: 'tv_stand', x: 50, y: 13, rot: 0 },
  { type: 'tv', x: 50, y: 7, rot: 0 },
  { type: 'coffee_table', x: 50, y: 55, rot: 0 },
  { type: 'sofa', x: 50, y: 82, rot: 0 },
  { type: 'armchair', x: 20, y: 80, rot: 90 },
  { type: 'side_table', x: 10, y: 72, rot: 0 },
  { type: 'floor_lamp', x: 92, y: 78, rot: 0 },
  { type: 'bookshelf', x: 90, y: 20, rot: 0 },
  { type: 'plant', x: 10, y: 20, rot: 0 },
];

function furnitureDef(type) {
  return FURNITURE.find((f) => f.type === type);
}

function floorStyleBg(style) {
  if (style.key === 'tile') {
    return {
      backgroundColor: style.base,
      backgroundImage: `repeating-linear-gradient(0deg, ${style.line} 0 2px, transparent 2px 48px), repeating-linear-gradient(90deg, ${style.line} 0 2px, transparent 2px 48px)`,
    };
  }
  if (style.key === 'carpet') {
    return {
      backgroundColor: style.base,
      backgroundImage: `radial-gradient(${style.line} 1px, transparent 1.4px)`,
      backgroundSize: '10px 10px',
    };
  }
  return {
    backgroundColor: style.base,
    backgroundImage: `repeating-linear-gradient(90deg, ${style.line} 0 2px, transparent 2px 34px)`,
  };
}

/** An actual room-planning tool rather than a random-emoji sandbox: real
 * vector furniture (roomDesignerData.js), a floor you can re-texture, walls
 * you can repaint, a browsable catalog organized by room type, and an
 * Auto-Furnish starter layout. Still no win condition — "New Room" gives a
 * fresh empty room with a randomized shape and theme to redecorate. */
export default function RoomDesigner() {
  const [category, setCategory] = useState('living');
  const [roomRatio, setRoomRatio] = useState(randomRoomRatio);
  const [floorStyle, setFloorStyle] = useState(() => randomOf(FLOOR_STYLES));
  const [wallColor, setWallColor] = useState(() => randomOf(WALL_COLORS));
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const roomRef = useRef(null);
  const dragRef = useRef(null);
  const nextIdRef = useRef(1);
  const nextZRef = useRef(1);

  const newRoom = () => {
    setRoomRatio(randomRoomRatio());
    setFloorStyle(randomOf(FLOOR_STYLES));
    setWallColor(randomOf(WALL_COLORS));
    setItems([]);
    setSelectedId(null);
  };

  const addItem = (def, atX, atY, presetRot) => {
    const id = nextIdRef.current++;
    const x = atX != null ? atX : clamp(50 + (Math.random() * 30 - 15), 12, 88);
    const y = atY != null ? atY : clamp(50 + (Math.random() * 30 - 15), 12, 88);
    const color = def.colors[Math.floor(Math.random() * def.colors.length)];
    setItems((prev) => [...prev, { id, type: def.type, x, y, rot: presetRot || 0, color, z: nextZRef.current++ }]);
    setSelectedId(id);
    return id;
  };

  const autoFurnish = () => {
    setItems([]);
    const newItems = STARTER_LAYOUT.map((placement) => {
      const def = furnitureDef(placement.type);
      const color = def.colors[0];
      return { id: nextIdRef.current++, type: def.type, x: placement.x, y: placement.y, rot: placement.rot, color, z: nextZRef.current++ };
    });
    setItems(newItems);
    setSelectedId(null);
  };

  const bringToFront = (id) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, z: nextZRef.current++ } : it)));
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
      moved: false,
    };
    setSelectedId(id);
    bringToFront(id);
  };

  const handleItemPointerMove = (e) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const dxPct = ((e.clientX - d.startClientX) / d.rect.width) * 100;
    const dyPct = ((e.clientY - d.startClientY) / d.rect.height) * 100;
    if (Math.abs(dxPct) > 0.5 || Math.abs(dyPct) > 0.5) d.moved = true;
    setItems((prev) =>
      prev.map((it) => (it.id === d.id ? { ...it, x: clamp(d.startX + dxPct, 3, 97), y: clamp(d.startY + dyPct, 3, 97) } : it))
    );
  };

  const handleItemPointerUp = (e) => {
    const d = dragRef.current;
    if (d && e.pointerId === d.pointerId) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      if (d.moved) {
        // Snap to a soft grid on release — small enough to feel free-form
        // while placement, tidy enough that things end up looking aligned
        // rather than randomly off-by-a-pixel.
        setItems((prev) =>
          prev.map((it) => (it.id === d.id ? { ...it, x: Math.round(it.x / 2.5) * 2.5, y: Math.round(it.y / 2.5) * 2.5 } : it))
        );
      }
    }
    dragRef.current = null;
  };

  const rotateSelected = () => {
    if (selectedId == null) return;
    setItems((prev) => prev.map((it) => (it.id === selectedId ? { ...it, rot: (it.rot + 90) % 360 } : it)));
  };

  const cycleColorSelected = () => {
    if (selectedId == null) return;
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== selectedId) return it;
        const def = furnitureDef(it.type);
        const idx = def.colors.indexOf(it.color);
        const nextColor = def.colors[(idx + 1) % def.colors.length];
        return { ...it, color: nextColor };
      })
    );
  };

  const duplicateSelected = () => {
    if (selectedId == null) return;
    const it = items.find((i) => i.id === selectedId);
    if (!it) return;
    addItem(furnitureDef(it.type), clamp(it.x + 6, 3, 97), clamp(it.y + 6, 3, 97), it.rot);
  };

  const removeSelected = () => {
    if (selectedId == null) return;
    setItems((prev) => prev.filter((it) => it.id !== selectedId));
    setSelectedId(null);
  };

  const selectedItem = items.find((it) => it.id === selectedId) || null;
  const selectedDef = selectedItem ? furnitureDef(selectedItem.type) : null;
  const catalog = FURNITURE.filter((f) => f.category === category);

  return (
    <div className="game-page">
      <div className="game-header">
        <Link to="/games" className="game-back">← Games</Link>
        <h1 className="game-title">🛋️ Room Designer</h1>
        <p className="game-subtitle">Design a room with real furniture — pick a style, decorate, make it yours.</p>
      </div>

      <HowToPlay>
        <p>Browse furniture by room type using the tabs, then tap a piece to add it. Drag anything placed to move it around.</p>
        <ul>
          <li>Tap a placed item to select it — a toolbar appears with <b>Rotate</b> (90°), <b>Recolor</b>, <b>Duplicate</b>, and <b>Remove</b>.</li>
          <li>Tap empty floor to deselect. Dragged items snap gently into alignment when you let go.</li>
          <li><b>🎨 Theme</b> lets you repaint the walls and re-floor the room. <b>✨ Auto-Furnish</b> drops in a ready-made starter layout you can then tweak.</li>
          <li>No win condition — it's a sandbox. <b>New Room</b> gives you an empty room with a fresh shape and theme.</li>
        </ul>
      </HowToPlay>

      <div className="game-controls-bar">
        <div className="rd-toolbar-left">
          <button type="button" className="gs-btn gs-btn-primary gs-btn-sm" onClick={newRoom}>🔄 New Room</button>
          <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={autoFurnish}>✨ Auto-Furnish</button>
          <button type="button" className={`gs-btn gs-btn-outline gs-btn-sm${showThemePicker ? ' active' : ''}`} onClick={() => setShowThemePicker((s) => !s)}>
            🎨 Theme
          </button>
        </div>
      </div>

      {showThemePicker && (
        <div className="rd-theme-picker">
          <div className="rd-theme-row">
            <span className="rd-theme-row-label">Floor</span>
            {FLOOR_STYLES.map((s) => (
              <button
                key={s.key}
                type="button"
                className={`rd-swatch${floorStyle.key === s.key ? ' active' : ''}`}
                style={{ background: s.base }}
                title={s.label}
                onClick={() => setFloorStyle(s)}
              />
            ))}
          </div>
          <div className="rd-theme-row">
            <span className="rd-theme-row-label">Walls</span>
            {WALL_COLORS.map((s) => (
              <button
                key={s.key}
                type="button"
                className={`rd-swatch${wallColor.key === s.key ? ' active' : ''}`}
                style={{ background: s.color }}
                title={s.label}
                onClick={() => setWallColor(s)}
              />
            ))}
          </div>
        </div>
      )}

      {selectedItem && (
        <div className="rd-selected-toolbar">
          <span className="rd-selected-label">{selectedDef.label} selected</span>
          <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={rotateSelected}>↻ Rotate</button>
          {selectedDef.colors.length > 1 && (
            <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={cycleColorSelected}>🎨 Recolor</button>
          )}
          <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={duplicateSelected}>⧉ Duplicate</button>
          <button type="button" className="gs-btn gs-btn-outline gs-btn-sm rd-remove-btn" onClick={removeSelected}>🗑 Remove</button>
        </div>
      )}

      <div className="rd-category-tabs">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            className={`rd-category-tab${category === c.key ? ' active' : ''}`}
            onClick={() => setCategory(c.key)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="room-designer-palette">
        {catalog.map((def) => (
          <button key={def.type} type="button" className="room-designer-palette-item" onClick={() => addItem(def)}>
            <svg viewBox={`0 0 ${def.w * 40} ${def.h * 40}`} className="rd-palette-icon">
              {def.render(def.colors[0])}
            </svg>
            <span className="room-designer-palette-label">{def.label}</span>
          </button>
        ))}
      </div>

      <div
        ref={roomRef}
        className="room-designer-room"
        style={{ aspectRatio: roomRatio, background: wallColor.color }}
        onPointerDown={() => setSelectedId(null)}
      >
        <div className="rd-floor" style={floorStyleBg(floorStyle)} />
        {items.length === 0 && <div className="room-designer-empty-hint">Add furniture from the catalog below, or try ✨ Auto-Furnish.</div>}
        {items
          .slice()
          .sort((a, b) => a.z - b.z)
          .map((it) => {
            const def = furnitureDef(it.type);
            return (
              <div
                key={it.id}
                className={`room-designer-item${selectedId === it.id ? ' selected' : ''}`}
                style={{
                  left: `${it.x}%`,
                  top: `${it.y}%`,
                  width: `calc(var(--room-unit) * ${def.w})`,
                  height: `calc(var(--room-unit) * ${def.h})`,
                  transform: `translate(-50%, -50%) rotate(${it.rot}deg)`,
                  zIndex: it.z,
                }}
                onPointerDown={(e) => handleItemPointerDown(e, it.id)}
                onPointerMove={handleItemPointerMove}
                onPointerUp={handleItemPointerUp}
                onPointerCancel={handleItemPointerUp}
              >
                <svg viewBox={`0 0 ${def.w * 40} ${def.h * 40}`} className="rd-item-svg">
                  {def.render(it.color)}
                </svg>
              </div>
            );
          })}
      </div>
    </div>
  );
}
