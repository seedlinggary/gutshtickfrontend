// Real vector furniture icons (not emoji) for Room Designer. Each item draws
// its own small SVG scene inside a viewBox proportioned to match its own
// footprint (W x H below, in arbitrary SVG units) so nothing gets distorted
// when the outer element is scaled to size in the room. `render(color)`
// returns the SVG children for the piece's primary color; most pieces also
// draw a couple of fixed-tone details (wood, metal, glass) independent of
// the chosen color for a bit of built-in richness.

const shade = (hex, amt) => {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + amt, g = ((n >> 8) & 0xff) + amt, b = (n & 0xff) + amt;
  r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

const WOOD = '#a9744f';
const WOOD_DARK = '#8a5c3c';
const METAL = '#c7cdd4';
const GLASS = '#bfe3f0';

function Legs({ positions, color = '#6b4a33', w = 3, h = 10 }) {
  return positions.map(([x, y], i) => <rect key={i} x={x - w / 2} y={y} width={w} height={h} rx={1.5} fill={color} />);
}

// ── LIVING ROOM ──────────────────────────────────────────────────────────
const sofa = {
  type: 'sofa', label: 'Sofa', category: 'living', w: 2.4, h: 1.1,
  colors: ['#c17a5b', '#5b7a8c', '#7c8a5b', '#8c6b8c'],
  render: (c) => {
    const W = 96, H = 44;
    return (
      <>
        <Legs positions={[[8, H - 4], [W - 8, H - 4]]} h={6} />
        <rect x={2} y={10} width={W - 4} height={H - 14} rx={10} fill={c} />
        <rect x={2} y={4} width={14} height={H - 8} rx={7} fill={shade(c, -15)} />
        <rect x={W - 16} y={4} width={14} height={H - 8} rx={7} fill={shade(c, -15)} />
        {[0, 1, 2].map((i) => (
          <rect key={i} x={16 + i * ((W - 34) / 3)} y={12} width={(W - 34) / 3 - 3} height={H - 22} rx={6} fill={shade(c, 12)} />
        ))}
      </>
    );
  },
};

const armchair = {
  type: 'armchair', label: 'Armchair', category: 'living', w: 1.15, h: 1.1,
  colors: ['#c17a5b', '#5b7a8c', '#7c8a5b', '#8c6b8c'],
  render: (c) => {
    const W = 46, H = 44;
    return (
      <>
        <Legs positions={[[8, H - 4], [W - 8, H - 4]]} h={6} />
        <rect x={2} y={8} width={W - 4} height={H - 12} rx={9} fill={c} />
        <rect x={2} y={2} width={11} height={H - 6} rx={5.5} fill={shade(c, -15)} />
        <rect x={W - 13} y={2} width={11} height={H - 6} rx={5.5} fill={shade(c, -15)} />
        <rect x={14} y={10} width={W - 28} height={H - 20} rx={6} fill={shade(c, 12)} />
      </>
    );
  },
};

const coffeeTable = {
  type: 'coffee_table', label: 'Coffee Table', category: 'living', w: 1.1, h: 0.65,
  colors: [WOOD],
  render: () => {
    const W = 44, H = 26;
    return (
      <>
        <Legs positions={[[6, 16], [W - 6, 16], [6, H - 2], [W - 6, H - 2]]} h={8} color={WOOD_DARK} />
        <rect x={2} y={4} width={W - 4} height={14} rx={4} fill={WOOD} />
        <rect x={4} y={6} width={W - 8} height={4} rx={2} fill={shade(WOOD, 25)} opacity={0.7} />
      </>
    );
  },
};

const sideTable = {
  type: 'side_table', label: 'Side Table', category: 'living', w: 0.55, h: 0.55,
  colors: [WOOD],
  render: () => {
    const W = 22, H = 22;
    return (
      <>
        <Legs positions={[[5, 10], [W - 5, 10]]} h={9} color={WOOD_DARK} />
        <ellipse cx={W / 2} cy={7} rx={10} ry={6} fill={WOOD} />
      </>
    );
  },
};

const tvStand = {
  type: 'tv_stand', label: 'TV Stand', category: 'living', w: 1.6, h: 0.5,
  colors: [WOOD_DARK, '#4a4a4a'],
  render: (c) => {
    const W = 64, H = 20;
    return (
      <>
        <rect x={1} y={2} width={W - 2} height={H - 6} rx={3} fill={c} />
        <rect x={5} y={5} width={(W - 16) / 2} height={H - 12} rx={2} fill={shade(c, -18)} />
        <rect x={W / 2 + 3} y={5} width={(W - 16) / 2} height={H - 12} rx={2} fill={shade(c, -18)} />
        <circle cx={(W - 16) / 4 + 5} cy={H / 2 - 3} r={1.4} fill={shade(c, 30)} />
        <circle cx={W / 2 + 3 + (W - 16) / 4} cy={H / 2 - 3} r={1.4} fill={shade(c, 30)} />
      </>
    );
  },
};

const tv = {
  type: 'tv', label: 'TV', category: 'living', w: 1.3, h: 0.18,
  colors: ['#20232a'],
  render: (c) => {
    const W = 52, H = 7;
    return (
      <>
        <rect x={W / 2 - 6} y={H - 2} width={12} height={2.4} rx={1} fill="#5a5a5a" />
        <rect x={0} y={0} width={W} height={H - 1.5} rx={1.6} fill={c} />
        <rect x={2} y={1.4} width={W - 4} height={H - 4.5} fill="#39485c" />
      </>
    );
  },
};

const bookshelf = {
  type: 'bookshelf', label: 'Bookshelf', category: 'living', w: 1.1, h: 1.5,
  colors: [WOOD, WOOD_DARK],
  render: (c) => {
    const W = 44, H = 60;
    const shelves = 4;
    const bookColors = ['#c1553b', '#3b6ea5', '#4d8c5a', '#c79a3b', '#7a5aa5'];
    let bookSeed = 0;
    return (
      <>
        <rect x={1} y={1} width={W - 2} height={H - 2} rx={2} fill={c} />
        {Array.from({ length: shelves }).map((_, i) => {
          const shelfY = 1 + ((H - 2) / shelves) * (i + 1);
          return <rect key={`shelf${i}`} x={2} y={shelfY - 2} width={W - 4} height={2} fill={shade(c, -20)} />;
        })}
        {Array.from({ length: shelves }).map((_, row) => {
          const top = 3 + (row * (H - 2)) / shelves;
          const rowH = (H - 2) / shelves - 5;
          const books = [];
          let x = 4;
          while (x < W - 6) {
            const bw = 3 + ((bookSeed * 7) % 4);
            books.push(<rect key={`${row}-${x}`} x={x} y={top + (rowH - (rowH - 2)) } width={bw} height={rowH - 2} fill={bookColors[bookSeed % bookColors.length]} />);
            x += bw + 1;
            bookSeed++;
          }
          return books;
        })}
      </>
    );
  },
};

const floorLamp = {
  type: 'floor_lamp', label: 'Floor Lamp', category: 'living', w: 0.35, h: 1.1,
  colors: ['#e8d9a8', '#d98a6b', '#9ac2c9'],
  render: (c) => {
    const W = 14, H = 44;
    return (
      <>
        <ellipse cx={W / 2} cy={H - 3} rx={6} ry={2.4} fill="#3a3a3a" />
        <rect x={W / 2 - 1} y={14} width={2} height={H - 16} fill="#3a3a3a" />
        <path d={`M ${W / 2 - 7} 14 L ${W / 2 + 7} 14 L ${W / 2 + 4} 1 L ${W / 2 - 4} 1 Z`} fill={c} />
      </>
    );
  },
};

const rugRect = {
  type: 'rug_rect', label: 'Rug', category: 'living', w: 2.1, h: 1.3,
  colors: ['#c1553b', '#3b6ea5', '#4d8c5a', '#c79a3b'],
  render: (c) => {
    const W = 84, H = 52;
    return (
      <>
        <rect x={0} y={0} width={W} height={H} rx={6} fill={c} opacity={0.9} />
        <rect x={6} y={6} width={W - 12} height={H - 12} rx={4} fill="none" stroke={shade(c, 40)} strokeWidth={2} opacity={0.8} />
        <rect x={12} y={12} width={W - 24} height={H - 24} rx={3} fill="none" stroke={shade(c, 40)} strokeWidth={1.2} opacity={0.6} />
      </>
    );
  },
};

// ── BEDROOM ──────────────────────────────────────────────────────────────
const bed = {
  type: 'bed', label: 'Bed', category: 'bedroom', w: 1.5, h: 2.0,
  colors: ['#7c93b0', '#c17a5b', '#8c9a7c', '#a08cc1'],
  render: (c) => {
    const W = 60, H = 80;
    return (
      <>
        <rect x={0} y={0} width={W} height={H} rx={7} fill={shade(c, -25)} />
        <rect x={3} y={14} width={W - 6} height={H - 17} rx={5} fill={c} />
        <rect x={5} y={4} width={(W - 14) / 2} height={12} rx={4} fill="#f5f0e6" />
        <rect x={W / 2 + 2} y={4} width={(W - 14) / 2} height={12} rx={4} fill="#f5f0e6" />
        <rect x={3} y={H - 24} width={W - 6} height={16} rx={4} fill={shade(c, 25)} />
      </>
    );
  },
};

const nightstand = {
  type: 'nightstand', label: 'Nightstand', category: 'bedroom', w: 0.55, h: 0.55,
  colors: [WOOD, WOOD_DARK, '#4a4a4a'],
  render: (c) => {
    const W = 22, H = 22;
    return (
      <>
        <rect x={1} y={1} width={W - 2} height={H - 2} rx={2.5} fill={c} />
        <rect x={4} y={5} width={W - 8} height={5} rx={1.5} fill={shade(c, -18)} />
        <circle cx={W / 2} cy={7.5} r={1} fill={shade(c, 35)} />
        <rect x={4} y={13} width={W - 8} height={6} rx={1.5} fill={shade(c, -18)} />
        <circle cx={W / 2} cy={16} r={1} fill={shade(c, 35)} />
      </>
    );
  },
};

const dresser = {
  type: 'dresser', label: 'Dresser', category: 'bedroom', w: 1.2, h: 0.55,
  colors: [WOOD, WOOD_DARK, '#4a4a4a'],
  render: (c) => {
    const W = 48, H = 22;
    return (
      <>
        <rect x={1} y={1} width={W - 2} height={H - 2} rx={2.5} fill={c} />
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x={3 + i * ((W - 6) / 3)} y={4} width={(W - 6) / 3 - 2} height={H - 8} rx={1.5} fill={shade(c, -16)} />
            <circle cx={3 + i * ((W - 6) / 3) + (W - 6) / 6} cy={H / 2} r={1} fill={shade(c, 35)} />
          </g>
        ))}
      </>
    );
  },
};

const wardrobe = {
  type: 'wardrobe', label: 'Wardrobe', category: 'bedroom', w: 0.9, h: 0.5,
  colors: [WOOD, WOOD_DARK, '#4a4a4a'],
  render: (c) => {
    const W = 36, H = 20;
    return (
      <>
        <rect x={1} y={1} width={W - 2} height={H - 2} rx={2} fill={c} />
        <rect x={W / 2 - 0.6} y={2} width={1.2} height={H - 4} fill={shade(c, -25)} />
        <circle cx={W / 2 - 4} cy={H / 2} r={1} fill={shade(c, 35)} />
        <circle cx={W / 2 + 4} cy={H / 2} r={1} fill={shade(c, 35)} />
      </>
    );
  },
};

const mirror = {
  type: 'mirror', label: 'Mirror', category: 'bedroom', w: 0.45, h: 0.75,
  colors: [WOOD, '#c7cdd4', '#e8d9a8'],
  render: (c) => {
    const W = 18, H = 30;
    return (
      <>
        <ellipse cx={W / 2} cy={H / 2} rx={W / 2 - 1} ry={H / 2 - 1} fill={c} />
        <ellipse cx={W / 2} cy={H / 2} rx={W / 2 - 4} ry={H / 2 - 4} fill={GLASS} opacity={0.85} />
      </>
    );
  },
};

// ── KITCHEN ──────────────────────────────────────────────────────────────
const diningTable = {
  type: 'dining_table', label: 'Dining Table', category: 'kitchen', w: 1.5, h: 0.85,
  colors: [WOOD],
  render: () => {
    const W = 60, H = 34;
    return (
      <>
        <Legs positions={[[6, 22], [W - 6, 22], [6, H - 2], [W - 6, H - 2]]} h={10} color={WOOD_DARK} />
        <rect x={1} y={2} width={W - 2} height={20} rx={4} fill={WOOD} />
        <rect x={4} y={5} width={W - 8} height={4} rx={2} fill={shade(WOOD, 25)} opacity={0.6} />
      </>
    );
  },
};

const diningChair = {
  type: 'dining_chair', label: 'Dining Chair', category: 'kitchen', w: 0.42, h: 0.42,
  colors: [WOOD, '#c17a5b'],
  render: (c) => {
    const W = 17, H = 17;
    return (
      <>
        <rect x={1} y={1} width={W - 2} height={3} rx={1.5} fill={shade(c, -20)} />
        <rect x={2} y={4} width={W - 4} height={H - 6} rx={2.5} fill={c} />
      </>
    );
  },
};

const kitchenIsland = {
  type: 'kitchen_island', label: 'Kitchen Island', category: 'kitchen', w: 1.6, h: 0.7,
  colors: ['#e8e2d4', '#c7cdd4'],
  render: (c) => {
    const W = 64, H = 28;
    return (
      <>
        <rect x={0} y={4} width={W} height={H - 4} rx={2} fill={c} />
        <rect x={0} y={0} width={W} height={6} rx={2} fill="#5a5f66" />
        {[0, 1, 2].map((i) => (
          <rect key={i} x={4 + i * ((W - 8) / 3)} y={9} width={(W - 8) / 3 - 3} height={H - 13} rx={1.5} fill={shade(c, -14)} />
        ))}
      </>
    );
  },
};

const fridge = {
  type: 'fridge', label: 'Fridge', category: 'kitchen', w: 0.65, h: 0.65,
  colors: [METAL, '#3a3a3a', '#e8e2d4'],
  render: (c) => {
    const W = 26, H = 26;
    return (
      <>
        <rect x={1} y={1} width={W - 2} height={H - 2} rx={2.5} fill={c} />
        <rect x={1} y={9} width={W - 2} height={1.4} fill={shade(c, -30)} />
        <rect x={W - 6} y={3} width={1.6} height={4} rx={0.8} fill={shade(c, -40)} />
        <rect x={W - 6} y={12} width={1.6} height={8} rx={0.8} fill={shade(c, -40)} />
      </>
    );
  },
};

const kitchenCounter = {
  type: 'kitchen_counter', label: 'Counter', category: 'kitchen', w: 1.7, h: 0.42,
  colors: ['#e8e2d4', '#c7cdd4'],
  render: (c) => {
    const W = 68, H = 17;
    return (
      <>
        <rect x={0} y={3} width={W} height={H - 3} rx={2} fill={c} />
        <rect x={0} y={0} width={W} height={5} rx={2} fill="#5a5f66" />
        <rect x={W / 2 - 8} y={1} width={16} height={3} rx={1.5} fill="#3a3f45" />
      </>
    );
  },
};

// ── DECOR ────────────────────────────────────────────────────────────────
const plant = {
  type: 'plant', label: 'Plant', category: 'decor', w: 0.5, h: 0.65,
  colors: ['#4d8c5a', '#5aa06a', '#3d7048'],
  render: (c) => {
    const W = 20, H = 26;
    return (
      <>
        <path d={`M 4 ${H - 8} L ${W - 4} ${H - 8} L ${W - 6} ${H - 1} L 6 ${H - 1} Z`} fill={WOOD_DARK} />
        <circle cx={W / 2} cy={9} r={8} fill={c} />
        <circle cx={W / 2 - 6} cy={12} r={6} fill={shade(c, 12)} />
        <circle cx={W / 2 + 6} cy={12} r={6} fill={shade(c, -8)} />
      </>
    );
  },
};

const wallArt = {
  type: 'wall_art', label: 'Wall Art', category: 'decor', w: 0.5, h: 0.65,
  colors: ['#c1553b', '#3b6ea5', '#4d8c5a', '#c79a3b'],
  render: (c) => {
    const W = 20, H = 26;
    return (
      <>
        <rect x={0} y={0} width={W} height={H} rx={1.5} fill="#f5f0e6" stroke="#3a3a3a" strokeWidth={1.6} />
        <path d={`M 3 ${H - 5} L ${W * 0.4} ${H * 0.4} L ${W * 0.6} ${H * 0.65} L ${W - 3} ${H * 0.25} L ${W - 3} ${H - 5} Z`} fill={c} opacity={0.85} />
      </>
    );
  },
};

const window_ = {
  type: 'window', label: 'Window', category: 'decor', w: 0.9, h: 0.6,
  colors: ['#ffffff'],
  render: () => {
    const W = 36, H = 24;
    return (
      <>
        <rect x={0} y={0} width={W} height={H} rx={2} fill="#f5f0e6" />
        <rect x={3} y={3} width={W - 6} height={H - 6} fill={GLASS} />
        <rect x={W / 2 - 0.8} y={3} width={1.6} height={H - 6} fill="#f5f0e6" />
        <rect x={3} y={H / 2 - 0.8} width={W - 6} height={1.6} fill="#f5f0e6" />
      </>
    );
  },
};

const door = {
  type: 'door', label: 'Door', category: 'decor', w: 0.55, h: 0.9,
  colors: [WOOD, '#f5f0e6', WOOD_DARK],
  render: (c) => {
    const W = 22, H = 36;
    return (
      <>
        <rect x={0} y={0} width={W} height={H} rx={1.5} fill={c} />
        <rect x={3} y={3} width={W - 6} height={H / 2 - 5} rx={1} fill={shade(c, -18)} />
        <rect x={3} y={H / 2 + 2} width={W - 6} height={H / 2 - 5} rx={1} fill={shade(c, -18)} />
        <circle cx={W - 5} cy={H / 2} r={1.4} fill="#e8c96a" />
      </>
    );
  },
};

const rugRound = {
  type: 'rug_round', label: 'Round Rug', category: 'decor', w: 1.3, h: 1.3,
  colors: ['#c1553b', '#3b6ea5', '#4d8c5a', '#c79a3b'],
  render: (c) => {
    const W = 52, H = 52;
    return (
      <>
        <circle cx={W / 2} cy={H / 2} r={W / 2 - 1} fill={c} opacity={0.9} />
        <circle cx={W / 2} cy={H / 2} r={W / 2 - 7} fill="none" stroke={shade(c, 40)} strokeWidth={2} opacity={0.8} />
        <circle cx={W / 2} cy={H / 2} r={W / 2 - 14} fill="none" stroke={shade(c, 40)} strokeWidth={1.2} opacity={0.6} />
      </>
    );
  },
};

const candle = {
  type: 'candle', label: 'Candle', category: 'decor', w: 0.22, h: 0.3,
  colors: ['#e8d9a8', '#d9a8b0', '#a8d9c9'],
  render: (c) => {
    const W = 9, H = 12;
    return (
      <>
        <rect x={2} y={3} width={W - 4} height={H - 3} rx={1.2} fill={c} />
        <path d={`M ${W / 2} 0 C ${W / 2 + 2} 2, ${W / 2 + 1.4} 3.2, ${W / 2} 3.2 C ${W / 2 - 1.4} 3.2, ${W / 2 - 1.2} 1.6, ${W / 2} 0 Z`} fill="#e8842a" />
      </>
    );
  },
};

export const FURNITURE = [
  sofa, armchair, coffeeTable, sideTable, tvStand, tv, bookshelf, floorLamp, rugRect,
  bed, nightstand, dresser, wardrobe, mirror,
  diningTable, diningChair, kitchenIsland, fridge, kitchenCounter,
  plant, wallArt, window_, door, rugRound, candle,
];

export const CATEGORIES = [
  { key: 'living', label: '🛋️ Living Room' },
  { key: 'bedroom', label: '🛏️ Bedroom' },
  { key: 'kitchen', label: '🍽️ Kitchen' },
  { key: 'decor', label: '🖼️ Decor' },
];

export const FLOOR_STYLES = [
  { key: 'wood', label: 'Wood', base: '#cba178', line: '#b8895f' },
  { key: 'light-wood', label: 'Light Oak', base: '#e3cba3', line: '#d0b48a' },
  { key: 'tile', label: 'Tile', base: '#e7e2d8', line: '#cfc8ba' },
  { key: 'dark-wood', label: 'Walnut', base: '#8a6248', line: '#734f39' },
  { key: 'carpet', label: 'Carpet', base: '#d8cfe0', line: '#c4b8d4' },
];

export const WALL_COLORS = [
  { key: 'cream', label: 'Cream', color: '#f2ead8' },
  { key: 'sage', label: 'Sage', color: '#d7e0d0' },
  { key: 'sky', label: 'Sky', color: '#dbe8ef' },
  { key: 'blush', label: 'Blush', color: '#f0dfdd' },
  { key: 'charcoal', label: 'Charcoal', color: '#4a4d54' },
  { key: 'white', label: 'White', color: '#fbfbfa' },
];
