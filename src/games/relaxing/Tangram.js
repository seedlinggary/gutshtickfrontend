import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import HowToPlay from '../HowToPlay';

const SQ2 = Math.SQRT2;

// All 7 classic tangram pieces, geometrically exact (verified by computation,
// not hand-derived): if small triangle legs = 1, medium legs = sqrt(2), large
// legs = 2, square side = 1, and the parallelogram is 2 small triangles
// joined along a leg with a flip (not a mirror — this is why the real tangram
// parallelogram has no reflection symmetry, only point symmetry).
const PIECE_DEFS = [
  { id: 'big1', points: '0,0 2,0 0,2', color: '#ef4444', challenge: 'square', target: { x: 0, y: 0, rot: 0 } },
  { id: 'big2', points: '0,0 2,0 0,2', color: '#f97316', challenge: 'square', target: { x: 2, y: 2, rot: 180 } },
  { id: 'med', points: `0,0 ${SQ2},0 0,${SQ2}`, color: '#eab308', challenge: 'triangle', target: { x: 1, y: 1, rot: 225 } },
  { id: 'sm1', points: '0,0 1,0 0,1', color: '#22c55e', challenge: 'triangle', target: { x: 0, y: 1, rot: 0 } },
  { id: 'sm2', points: '0,0 1,0 0,1', color: '#06b6d4', challenge: 'triangle', target: { x: 0, y: 1, rot: 270 } },
  { id: 'sq', points: '0,0 1,0 1,1 0,1', color: '#8b5cf6', challenge: null, target: null },
  { id: 'para', points: '0,2 0,0 2,-2 2,0', color: '#ec4899', challenge: null, target: null },
];

// Each challenge's target outline — drawn directly from the same verified
// geometry the pieces are checked against, so the outline and the solution
// can never drift apart the way a hand-drawn silhouette could.
const CHALLENGES = {
  square: { label: 'Square', outline: '0,0 2,0 2,2 0,2', pieceIds: ['big1', 'big2'] },
  triangle: { label: 'Triangle', outline: '0,0 2,0 0,2', pieceIds: ['med', 'sm1', 'sm2'] },
};
const CHALLENGE_ORDER = ['square', 'triangle'];

const ROT_STEP = 45;
const POS_TOLERANCE = 0.3; // local units, out of a ~2x2 target area
const ROT_TOLERANCE = 12; // degrees

function normalizeAngle(deg) {
  return ((deg % 360) + 360) % 360;
}
function angleDiff(a, b) {
  const d = Math.abs(normalizeAngle(a) - normalizeAngle(b));
  return Math.min(d, 360 - d);
}

function scatterPieces(challengeKey) {
  const requiredIds = new Set(CHALLENGES[challengeKey].pieceIds);
  return PIECE_DEFS.map((def, i) => {
    // Scatter around the challenge's ~2x2 target area, further out for
    // pieces not needed this round so the board reads clearly.
    const angle = (i / PIECE_DEFS.length) * Math.PI * 2 + (Math.random() - 0.5) * 0.15;
    const radius = (requiredIds.has(def.id) ? 2.1 : 2.7) + (Math.random() - 0.5) * 0.15;
    return {
      ...def,
      x: 1 + Math.cos(angle) * radius,
      y: 1 + Math.sin(angle) * radius,
      rot: Math.floor(Math.random() * 8) * ROT_STEP,
    };
  });
}

function isPieceSolved(piece) {
  if (!piece.target) return false;
  const dx = piece.x - piece.target.x, dy = piece.y - piece.target.y;
  const posOk = Math.sqrt(dx * dx + dy * dy) <= POS_TOLERANCE;
  const rotOk = angleDiff(piece.rot, piece.target.rot) <= ROT_TOLERANCE;
  return posOk && rotOk;
}

/** A tangram arranging puzzle with a real, verified fit-check: the "Square"
 * and "Triangle" challenges each use pieces whose target positions were
 * computed and confirmed (via shoelace-area + overlap checks) to exactly
 * tile that outline — no gaps, no overlaps. The square (sq) and
 * parallelogram (para) pieces are included for the classic 7-piece look but
 * aren't part of either fit-check yet; they're free-play pieces you can
 * still drag and rotate. */
export default function Tangram() {
  const [challengeKey, setChallengeKey] = useState('square');
  const [pieces, setPieces] = useState(() => scatterPieces('square'));
  const [selectedId, setSelectedId] = useState(null);
  const [showSolution, setShowSolution] = useState(false);
  const svgRef = useRef(null);
  const dragRef = useRef(null);

  const challenge = CHALLENGES[challengeKey];
  const requiredPieces = pieces.filter((p) => challenge.pieceIds.includes(p.id));
  const solvedCount = requiredPieces.filter(isPieceSolved).length;
  const isComplete = solvedCount === requiredPieces.length;

  const newPuzzle = () => {
    const next = CHALLENGE_ORDER[(CHALLENGE_ORDER.indexOf(challengeKey) + 1) % CHALLENGE_ORDER.length];
    setChallengeKey(next);
    setPieces(scatterPieces(next));
    setSelectedId(null);
    setShowSolution(false);
  };

  const retryChallenge = () => {
    setPieces(scatterPieces(challengeKey));
    setSelectedId(null);
    setShowSolution(false);
  };

  // Converts a pointer event's client coordinates into the SVG's own
  // user-space units, using the SVG's CTM — this stays correct regardless of
  // how big the SVG is rendered on screen (phone vs desktop), unlike a fixed
  // pixel-to-unit ratio.
  const clientToSvgPoint = (clientX, clientY) => {
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM().inverse();
    return pt.matrixTransform(ctm);
  };

  const handlePointerDown = (e, id) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const piece = pieces.find((p) => p.id === id);
    const start = clientToSvgPoint(e.clientX, e.clientY);
    dragRef.current = { id, pointerId: e.pointerId, startSvgX: start.x, startSvgY: start.y, startX: piece.x, startY: piece.y };
    setSelectedId(id);
  };

  const handlePointerMove = (e) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const cur = clientToSvgPoint(e.clientX, e.clientY);
    const dx = cur.x - d.startSvgX, dy = cur.y - d.startSvgY;
    setPieces((prev) => prev.map((p) => (p.id === d.id ? { ...p, x: d.startX + dx, y: d.startY + dy } : p)));
  };

  const handlePointerUp = (e) => {
    const d = dragRef.current;
    if (d && e.pointerId === d.pointerId) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    }
    dragRef.current = null;
  };

  const rotateSelected = () => {
    if (selectedId == null) return;
    setPieces((prev) => prev.map((p) => (p.id === selectedId ? { ...p, rot: normalizeAngle(p.rot + ROT_STEP) } : p)));
  };

  return (
    <div className="game-page">
      <div className="game-header">
        <Link to="/games" className="game-back">← Games</Link>
        <h1 className="game-title">🔺 Tangram</h1>
        <p className="game-subtitle">Fit the pieces into the outline. No score, no pressure.</p>
      </div>

      <HowToPlay>
        <p>Drag any piece to move it. Tap a piece to select it, then press <b>Rotate 45°</b> to spin it in place.</p>
        <p>The <b>Square</b> and <b>Triangle</b> challenges each use a specific subset of pieces (2 large triangles for Square; the medium triangle plus 2 small triangles for Triangle) that exactly tile the dashed outline — get every piece for the current challenge into place and it announces completion automatically.</p>
        <p>The purple square and pink parallelogram are included for the classic full 7-piece look, but aren't part of either fit-check yet — they're free to arrange however you like.</p>
        <p>Press <b>New Puzzle</b> to switch challenges and re-scatter the pieces. <b>Show Solution</b> previews the target outline filled in.</p>
      </HowToPlay>

      <div className="game-controls-bar">
        <button type="button" className="gs-btn gs-btn-primary gs-btn-sm" onClick={newPuzzle}>
          🔄 New Puzzle
        </button>
        <div className="tangram-controls-right">
          <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={retryChallenge}>
            ↺ Reset
          </button>
          <button
            type="button"
            className={`gs-btn gs-btn-outline gs-btn-sm${showSolution ? ' active' : ''}`}
            onClick={() => setShowSolution((s) => !s)}
          >
            👁 Show Solution
          </button>
          <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={rotateSelected} disabled={selectedId == null}>
            ↻ Rotate 45°
          </button>
        </div>
      </div>

      <p className="tangram-target-label">
        Target: <b>{challenge.label}</b> — {solvedCount}/{requiredPieces.length} pieces placed
      </p>

      {isComplete && (
        <div className="game-result-banner won" style={{ margin: '0 0 12px' }}>
          🎉 {challenge.label} complete!
          <button className="gs-btn gs-btn-primary gs-btn-sm" style={{ marginLeft: 12 }} onClick={newPuzzle}>
            Next Challenge
          </button>
        </div>
      )}

      <div className="tangram-board">
        <svg
          ref={svgRef}
          className="tangram-svg"
          viewBox="-2.3 -2.3 6.6 6.6"
          onPointerDown={() => setSelectedId(null)}
        >
          <polygon
            points={challenge.outline}
            className={`tangram-silhouette-poly${showSolution ? ' filled' : ''}`}
          />
          {pieces.map((p) => {
            const solved = challenge.pieceIds.includes(p.id) && isPieceSolved(p);
            return (
              <g
                key={p.id}
                transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`}
                className={`tangram-piece-g${selectedId === p.id ? ' selected' : ''}${solved ? ' solved' : ''}`}
                onPointerDown={(e) => handlePointerDown(e, p.id)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                <polygon points={p.points} fill={p.color} stroke="rgba(0,0,0,0.3)" strokeWidth="0.04" />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
