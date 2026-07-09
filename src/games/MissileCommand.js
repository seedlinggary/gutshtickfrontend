import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';
import HowToPlay from './HowToPlay';
import './MissileCommand.css';

const W = 720;
const H = 520;
const GROUND_Y = H - 44;

const CITY_XS = [112, 168, 224, 496, 552, 608];
const SILO_XS = [44, 360, 676];
const SILO_AMMO = 10;

const INTERCEPTOR_SPEED = 520;
const RAPID_SPEED_MULT = 1.7;   // Rapid Fire upgrade
const BLAST_MAX_R = 46;
const BIG_BLAST_MULT = 1.55;    // Bigger Blast upgrade
const BLAST_GROW = 0.18;
const BLAST_HOLD = 0.34;
const BLAST_FADE = 0.34;

const MULTI_START = 2;          // Multi-Shot charges granted when unlocked
const MULTI_REFILL = 2;         // Multi-Shot charges added on each resupply
const LASER_COOLDOWN = 3.2;     // seconds between Laser Silo shots
const LASER_HIT_R = 34;         // click radius to lock the laser onto a missile
const MIRV_START_WAVE = 5;      // MIRV splitters begin appearing at this wave
const STREAK_STEP = 8;          // kills per +1 to the score multiplier
const MULTIPLIER_MAX = 5;

const DIFF = {
  easy:   { enemySpeed: 58,  baseEnemies: 7,  spawnMin: 0.9, spawnMax: 2.0 },
  medium: { enemySpeed: 76,  baseEnemies: 9,  spawnMin: 0.7, spawnMax: 1.6 },
  hard:   { enemySpeed: 98,  baseEnemies: 12, spawnMin: 0.5, spawnMax: 1.2 },
};

// One-time unlocks granted after clearing specific waves. Multi-Shot, Smart Bomb
// and the Laser Silo are limited/cooldown-gated specials; Rapid Fire and Bigger
// Blast are permanent passive boosts. Charge-based specials are topped up again
// by the periodic resupply in the wave-clear logic (see waveRewards).
const UPGRADE_SCHEDULE = {
  2: { key: 'multiShot',   label: 'Multi-Shot',   desc: 'Press C to arm a 3-way cluster shot' },
  3: { key: 'smartBomb',   label: 'Smart Bomb',   desc: 'Press X to wipe every missile on screen' },
  4: { key: 'rapidFire',   label: 'Rapid Fire',   desc: 'Interceptors travel much faster' },
  5: { key: 'laser',       label: 'Laser Silo',   desc: 'Press Z, then click a missile to vaporize it' },
  6: { key: 'biggerBlast', label: 'Bigger Blast', desc: 'Wider explosion kill-zone' },
};

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function blastRadius(t, maxR) {
  const m = maxR || BLAST_MAX_R;
  if (t < BLAST_GROW) return m * (t / BLAST_GROW);
  if (t < BLAST_GROW + BLAST_HOLD) return m;
  if (t < BLAST_GROW + BLAST_HOLD + BLAST_FADE) return m * (1 - (t - BLAST_GROW - BLAST_HOLD) / BLAST_FADE);
  return 0;
}

function pickTarget(s) {
  const targets = [
    ...s.cities.filter((c) => c.alive).map((c) => ({ x: c.x, y: GROUND_Y - 10 })),
    ...s.silos.filter((si) => si.alive).map((si) => ({ x: si.x, y: GROUND_Y - 6 })),
  ];
  if (targets.length === 0) return null;
  return targets[Math.floor(Math.random() * targets.length)];
}

function launchEnemy(s, x0, y0, t, speed, mirv) {
  const dx = t.x - x0, dy = t.y - y0;
  const dist = Math.hypot(dx, dy) || 1;
  s.enemies.push({
    x: x0, y: y0, x0, y0,
    vx: (dx / dist) * speed, vy: (dy / dist) * speed,
    tx: t.x, ty: t.y,
    mirv: !!mirv,
    splitY: mirv ? rand(170, 250) : 0,
  });
}

function spawnEnemy(s, cfg) {
  const x0 = rand(30, W - 30);
  const t = pickTarget(s);
  if (!t) return;
  const speed = cfg.enemySpeed + s.wave * 5;
  // From MIRV_START_WAVE onward a growing share of missiles are MIRV splitters.
  const mirv = s.wave >= MIRV_START_WAVE && Math.random() < Math.min(0.35, 0.12 + s.wave * 0.02);
  launchEnemy(s, x0, 0, t, speed, mirv);
}

// Split a MIRV into 2-3 diverging warheads at its current position.
function splitMirv(s, e, cfg) {
  const speed = (cfg.enemySpeed + s.wave * 5) * 1.05;
  const count = 2 + (Math.random() < 0.5 ? 1 : 0);
  for (let i = 0; i < count; i++) {
    const t = pickTarget(s);
    if (!t) break;
    launchEnemy(s, e.x, e.y, t, speed, false);
  }
}

function hitTarget(s, e) {
  let best = null, bestD = 26;
  s.cities.forEach((c) => {
    if (!c.alive) return;
    const d = Math.abs(c.x - e.x);
    if (d < bestD) { bestD = d; best = { type: 'city', obj: c }; }
  });
  s.silos.forEach((si) => {
    if (!si.alive) return;
    const d = Math.abs(si.x - e.x);
    if (d < bestD) { bestD = d; best = { type: 'silo', obj: si }; }
  });
  if (best) {
    best.obj.alive = false;
    if (best.type === 'silo') best.obj.ammo = 0;
    if (best.type === 'city') { s.streak = 0; s.multiplier = 1; }  // losing a city breaks the streak
  }
  s.explosions.push({ x: e.x, y: GROUND_Y - 6, t: 0, chain: 0, maxR: BLAST_MAX_R });
}

function initState(difficulty) {
  const cfg = DIFF[difficulty];
  return {
    cities: CITY_XS.map((x) => ({ x, alive: true })),
    silos: SILO_XS.map((x) => ({ x, ammo: SILO_AMMO, alive: true })),
    enemies: [],
    interceptors: [],
    explosions: [],
    beams: [],
    wave: 1,
    enemiesToSpawn: cfg.baseEnemies,
    spawnTimer: 2.0,
    waveBanner: 2.0,
    score: 0,
    cursor: { x: W / 2, y: H / 2 },
    // permanent passive upgrades + one-time weapon unlocks
    upgrades: { rapidFire: false, biggerBlast: false, laser: false },
    // limited-charge / cooldown specials
    smartBombs: 0,
    multiShots: 0,
    multiShotArmed: false,
    laserArmed: false,
    laserCooldown: 0,
    // streak scoring
    streak: 0,
    multiplier: 1,
    interceptorSpeed: INTERCEPTOR_SPEED,
    blastMaxR: BLAST_MAX_R,
    upgradeBanner: 0,
    upgradeText: '',
    lastTime: 0,
    raf: null,
  };
}

export default function MissileCommand() {
  const canvasRef = useRef(null);
  const stateRef = useRef(initState('medium'));
  const diffRef = useRef('medium');
  const [difficulty, setDifficulty] = useState('medium');
  const [gameStatus, setGameStatus] = useState('idle'); // idle | playing | over
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [citiesLeft, setCitiesLeft] = useState(6);
  const [toast, setToast] = useState('');
  const [smartBombs, setSmartBombs] = useState(0);
  const [multiShots, setMultiShots] = useState(0);
  const [multiArmed, setMultiArmed] = useState(false);
  const [laserReady, setLaserReady] = useState(false); // true when unlocked AND off cooldown
  const [laserArmed, setLaserArmed] = useState(false);
  const [upgrades, setUpgrades] = useState({ rapidFire: false, biggerBlast: false, laser: false });
  const [stats, setStats] = useState({ wins: 0, losses: 0, best_score: 0 });
  const [bestScore, setBestScore] = useState(0);
  const saved = useRef(false);
  const wonLogged = useRef(false);
  const toastTimer = useRef(null);
  const gameStatusRef = useRef(gameStatus);

  useEffect(() => { gameStatusRef.current = gameStatus; }, [gameStatus]);

  useEffect(() => {
    if (isLoggedIn()) {
      apiRequest('GET', null, '/game/stats').then((d) => {
        if (d?.missile_command) setStats(d.missile_command);
      }).catch(() => {});
    }
    return () => {
      cancelAnimationFrame(stateRef.current.raf);
      clearTimeout(toastTimer.current);
    };
  }, []);

  const flashToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2000);
  }, []);

  const saveResult = useCallback((result, s) => {
    if (result === 'win') {
      if (wonLogged.current) return;
      wonLogged.current = true;
    } else {
      if (saved.current) return;
      saved.current = true;
    }
    if (isLoggedIn()) {
      apiRequest('POST', { game_type: 'missile_command', result, difficulty: diffRef.current, score: s.score }, '/game/save').catch(() => {});
    }
  }, []);

  // Grant the permanent upgrade tied to the wave that was just cleared.
  const grantUpgrade = useCallback((s, clearedWave) => {
    const up = UPGRADE_SCHEDULE[clearedWave];
    if (!up) return;
    switch (up.key) {
      case 'multiShot':   s.multiShots += MULTI_START; setMultiShots(s.multiShots); break;
      case 'laser':       s.upgrades.laser = true; s.laserCooldown = 0; setUpgrades({ ...s.upgrades }); setLaserReady(true); break;
      case 'rapidFire':   s.upgrades.rapidFire = true; s.interceptorSpeed = INTERCEPTOR_SPEED * RAPID_SPEED_MULT; setUpgrades({ ...s.upgrades }); break;
      case 'biggerBlast': s.upgrades.biggerBlast = true; s.blastMaxR = BLAST_MAX_R * BIG_BLAST_MULT; setUpgrades({ ...s.upgrades }); break;
      case 'smartBomb':   s.smartBombs += 1; setSmartBombs(s.smartBombs); break;
      default: break;
    }
    s.upgradeText = `${up.label} — ${up.desc}`;
    s.upgradeBanner = 2.6;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#140a24');
    bg.addColorStop(0.6, '#1a0e1e');
    bg.addColorStop(1, '#0a0710');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let i = 0; i < 50; i++) ctx.fillRect((i * 137) % W, (i * 71) % (GROUND_Y - 40), 1.4, 1.4);

    ctx.fillStyle = '#3b2a12';
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    ctx.fillStyle = '#4d3717';
    ctx.fillRect(0, GROUND_Y, W, 4);

    s.cities.forEach((c) => {
      if (!c.alive) {
        ctx.fillStyle = '#2a1a0a';
        ctx.fillRect(c.x - 16, GROUND_Y - 6, 32, 6);
        return;
      }
      ctx.fillStyle = '#34d399';
      ctx.fillRect(c.x - 16, GROUND_Y - 16, 8, 16);
      ctx.fillRect(c.x - 6, GROUND_Y - 24, 12, 24);
      ctx.fillRect(c.x + 8, GROUND_Y - 12, 8, 12);
      ctx.fillStyle = 'rgba(52,211,153,0.35)';
      ctx.fillRect(c.x - 18, GROUND_Y - 26, 36, 4);
    });

    s.silos.forEach((si) => {
      if (!si.alive) {
        ctx.fillStyle = '#2a1a0a';
        ctx.beginPath();
        ctx.moveTo(si.x - 20, GROUND_Y);
        ctx.lineTo(si.x + 20, GROUND_Y);
        ctx.lineTo(si.x + 10, GROUND_Y - 8);
        ctx.lineTo(si.x - 10, GROUND_Y - 8);
        ctx.closePath();
        ctx.fill();
        return;
      }
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(si.x - 22, GROUND_Y);
      ctx.lineTo(si.x + 22, GROUND_Y);
      ctx.lineTo(si.x + 11, GROUND_Y - 18);
      ctx.lineTo(si.x - 11, GROUND_Y - 18);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#160c04';
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(si.ammo, si.x, GROUND_Y - 5);
    });
    ctx.textAlign = 'left';

    s.enemies.forEach((e) => {
      const isMirv = e.mirv;
      ctx.strokeStyle = isMirv ? 'rgba(217,120,255,0.6)' : 'rgba(248,113,113,0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(e.x0, e.y0);
      ctx.lineTo(e.x, e.y);
      ctx.stroke();
      ctx.fillStyle = isMirv ? '#e9b8ff' : '#fca5a5';
      ctx.beginPath();
      ctx.arc(e.x, e.y, isMirv ? 3.4 : 2.6, 0, Math.PI * 2);
      ctx.fill();
      if (isMirv) {
        ctx.strokeStyle = 'rgba(217,120,255,0.8)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    s.interceptors.forEach((m) => {
      ctx.strokeStyle = 'rgba(125,211,252,0.8)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(m.sx, m.sy);
      ctx.lineTo(m.x, m.y);
      ctx.stroke();
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.arc(m.x, m.y, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(125,211,252,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(m.tx - 5, m.ty); ctx.lineTo(m.tx + 5, m.ty);
      ctx.moveTo(m.tx, m.ty - 5); ctx.lineTo(m.tx, m.ty + 5);
      ctx.stroke();
    });

    s.beams.forEach((b) => {
      const a = Math.max(0, 1 - b.t / 0.18);
      ctx.strokeStyle = `rgba(255,90,130,${a})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,220,230,${a})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
    });

    s.explosions.forEach((ex) => {
      const r = blastRadius(ex.t, ex.maxR);
      if (r <= 0) return;
      const grad = ctx.createRadialGradient(ex.x, ex.y, 0, ex.x, ex.y, r);
      grad.addColorStop(0, 'rgba(255,255,255,0.95)');
      grad.addColorStop(0.5, 'rgba(251,191,36,0.7)');
      grad.addColorStop(1, 'rgba(251,146,60,0.05)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(ex.x, ex.y, r, 0, Math.PI * 2);
      ctx.fill();
    });

    const cx = s.cursor.x, cy = s.cursor.y;
    // Cursor recolors to show which special is armed for the next click.
    const cursorColor = s.laserArmed ? 'rgba(255,80,120,0.95)'
      : s.multiShotArmed ? 'rgba(251,191,36,0.95)'
      : 'rgba(125,252,211,0.85)';
    ctx.strokeStyle = cursorColor;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.moveTo(cx - 14, cy); ctx.lineTo(cx - 4, cy);
    ctx.moveTo(cx + 4, cy); ctx.lineTo(cx + 14, cy);
    ctx.moveTo(cx, cy - 14); ctx.lineTo(cx, cy - 4);
    ctx.moveTo(cx, cy + 4); ctx.lineTo(cx, cy + 14);
    ctx.stroke();
    if (s.multiShotArmed) {
      // preview the cluster spread
      ctx.strokeStyle = 'rgba(251,191,36,0.5)';
      ctx.beginPath();
      ctx.arc(cx - 42, cy + 10, 4, 0, Math.PI * 2);
      ctx.arc(cx + 42, cy + 10, 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    // HUD
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE ${s.score}`, 14, 24);
    ctx.textAlign = 'center';
    ctx.fillText(`WAVE ${s.wave}`, W / 2, 24);
    ctx.textAlign = 'right';
    ctx.fillText(`CITIES ${s.cities.filter((c) => c.alive).length}`, W - 14, 24);
    ctx.textAlign = 'left';

    // Score multiplier (streak) — only shown once it climbs above x1
    if (s.multiplier > 1) {
      ctx.fillStyle = 'rgba(253,224,71,0.95)';
      ctx.font = '800 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`x${s.multiplier} STREAK`, W / 2, 44);
      ctx.textAlign = 'left';
    }

    // Weapon status line: charges + cooldowns for the special weapons
    const badges = [];
    badges.push(`CLUSTER x${s.multiShots}${s.multiShotArmed ? ' ARMED' : ''}`);
    badges.push(`BOMB x${s.smartBombs}`);
    if (s.upgrades.laser) {
      badges.push(s.laserCooldown > 0 ? `LASER ${s.laserCooldown.toFixed(1)}s`
        : s.laserArmed ? 'LASER ARMED' : 'LASER RDY');
    }
    if (s.upgrades.rapidFire) badges.push('RAPID');
    if (s.upgrades.biggerBlast) badges.push('BIG-BLAST');
    ctx.fillStyle = 'rgba(125,252,211,0.85)';
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.fillText(badges.join('   '), 14, 62);

    if (s.waveBanner > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.textAlign = 'center';
      ctx.font = '800 30px system-ui, sans-serif';
      ctx.fillText(`WAVE ${s.wave}`, W / 2, H / 2 - 20);
      ctx.textAlign = 'left';
    }

    if (s.upgradeBanner > 0) {
      const a = Math.min(1, s.upgradeBanner);
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(125,252,211,${a})`;
      ctx.font = '800 26px system-ui, sans-serif';
      ctx.fillText('UPGRADE ACQUIRED!', W / 2, H / 2 + 24);
      ctx.fillStyle = `rgba(255,255,255,${a * 0.9})`;
      ctx.font = '700 15px system-ui, sans-serif';
      ctx.fillText(s.upgradeText, W / 2, H / 2 + 48);
      ctx.textAlign = 'left';
    }
  }, []);

  const update = useCallback((dt) => {
    const s = stateRef.current;
    const cfg = DIFF[diffRef.current];

    if (s.waveBanner > 0) s.waveBanner = Math.max(0, s.waveBanner - dt);
    if (s.upgradeBanner > 0) s.upgradeBanner = Math.max(0, s.upgradeBanner - dt);

    if (s.laserCooldown > 0) {
      const before = s.laserCooldown;
      s.laserCooldown = Math.max(0, s.laserCooldown - dt);
      if (before > 0 && s.laserCooldown === 0) setLaserReady(s.upgrades.laser);
    }

    if (s.enemiesToSpawn > 0) {
      s.spawnTimer -= dt;
      if (s.spawnTimer <= 0) {
        s.spawnTimer = rand(cfg.spawnMin, cfg.spawnMax);
        s.enemiesToSpawn -= 1;
        spawnEnemy(s, cfg);
      }
    }

    for (let i = s.interceptors.length - 1; i >= 0; i--) {
      const m = s.interceptors[i];
      const dx = m.tx - m.x, dy = m.ty - m.y;
      const dist = Math.hypot(dx, dy);
      const step = s.interceptorSpeed * dt;
      if (dist <= step) {
        s.explosions.push({ x: m.tx, y: m.ty, t: 0, chain: 0, maxR: s.blastMaxR });
        s.interceptors.splice(i, 1);
      } else {
        m.x += (dx / dist) * step;
        m.y += (dy / dist) * step;
      }
    }

    for (let i = s.enemies.length - 1; i >= 0; i--) {
      const e = s.enemies[i];
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (e.mirv && e.y >= e.splitY) {
        splitMirv(s, e, cfg);   // burst into diverging warheads
        s.enemies.splice(i, 1);
        continue;
      }
      if (e.y >= e.ty) {
        hitTarget(s, e);
        s.enemies.splice(i, 1);
      }
    }

    for (let i = s.beams.length - 1; i >= 0; i--) {
      s.beams[i].t += dt;
      if (s.beams[i].t > 0.18) s.beams.splice(i, 1);
    }

    for (let i = s.explosions.length - 1; i >= 0; i--) {
      const ex = s.explosions[i];
      ex.t += dt;
      const r = blastRadius(ex.t, ex.maxR);
      if (ex.t > BLAST_GROW + BLAST_HOLD + BLAST_FADE) {
        s.explosions.splice(i, 1);
        continue;
      }
      if (r > 2) {
        for (let j = s.enemies.length - 1; j >= 0; j--) {
          const e = s.enemies[j];
          if (Math.hypot(e.x - ex.x, e.y - ex.y) <= r) {
            s.enemies.splice(j, 1);
            ex.chain += 1;
            s.streak += 1;
            s.multiplier = Math.min(MULTIPLIER_MAX, 1 + Math.floor(s.streak / STREAK_STEP));
            s.score += 25 * ex.chain * s.multiplier;
            setScore(s.score);
          }
        }
      }
    }

    const alive = s.cities.filter((c) => c.alive).length;
    setCitiesLeft(alive);
    if (alive === 0) {
      cancelAnimationFrame(s.raf);
      s.raf = null;
      if (!wonLogged.current) saveResult('loss', s);
      setScore(s.score);
      setBestScore((b) => Math.max(b, s.score));
      setGameStatus('over');
      return;
    }

    if (s.enemiesToSpawn === 0 && s.enemies.length === 0 && s.waveBanner === 0) {
      const clearedWave = s.wave;
      const bonus = alive * 100;
      s.score += bonus;
      setScore(s.score);

      // Periodic special-weapon resupply + city reconstruction.
      const rewards = [];
      if (s.multiShots > 0 && clearedWave % 3 === 0) {
        s.multiShots += MULTI_REFILL; setMultiShots(s.multiShots);
        rewards.push(`+${MULTI_REFILL} Cluster`);
      }
      if (s.smartBombs > 0 && clearedWave % 4 === 0) {
        s.smartBombs += 1; setSmartBombs(s.smartBombs);
        rewards.push('+1 Smart Bomb');
      }
      if (clearedWave % 5 === 0) {
        const dead = s.cities.find((c) => !c.alive);
        if (dead) { dead.alive = true; rewards.push('City rebuilt!'); }
      }
      const rewardStr = rewards.length ? ` · ${rewards.join(' · ')}` : '';

      if (clearedWave === 1) {
        saveResult('win', s);
        flashToast(`Wave 1 cleared — Win saved! +${bonus} city bonus${rewardStr}`);
      } else {
        flashToast(`Wave ${clearedWave} cleared! +${bonus} city bonus${rewardStr}`);
      }
      grantUpgrade(s, clearedWave);
      s.wave += 1;
      setWave(s.wave);
      s.silos.forEach((si) => { if (si.alive) si.ammo = SILO_AMMO; });
      s.enemiesToSpawn = cfg.baseEnemies + s.wave * 2;
      s.spawnTimer = 2.0;
      s.waveBanner = 2.0;
    }
  }, [saveResult, flashToast, grantUpgrade]);

  const loop = useCallback((now) => {
    const s = stateRef.current;
    const dt = Math.min((now - s.lastTime) / 1000, 0.033);
    s.lastTime = now;
    update(dt);
    draw();
    if (s.raf !== null) s.raf = requestAnimationFrame(loop);
  }, [update, draw]);

  const startGame = useCallback(() => {
    cancelAnimationFrame(stateRef.current.raf);
    diffRef.current = difficulty;
    saved.current = false;
    wonLogged.current = false;
    const st = initState(difficulty);
    st.enemiesToSpawn = DIFF[difficulty].baseEnemies;
    st.lastTime = performance.now();
    stateRef.current = st;
    setScore(0);
    setWave(1);
    setCitiesLeft(6);
    setToast('');
    setSmartBombs(0);
    setMultiShots(0);
    setMultiArmed(false);
    setLaserReady(false);
    setLaserArmed(false);
    setUpgrades({ rapidFire: false, biggerBlast: false, laser: false });
    setGameStatus('playing');
    st.raf = requestAnimationFrame(loop);
  }, [difficulty, loop]);

  const toCanvasCoords = (clientX, clientY) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (W / rect.width),
      y: (clientY - rect.top) * (H / rect.height),
    };
  };

  const handlePointerMove = (e) => {
    const p = toCanvasCoords(e.clientX, e.clientY);
    stateRef.current.cursor = p;
  };

  const fireInterceptor = (s, silo, tx, ty) => {
    const cy = clamp(ty, 12, GROUND_Y - 8);
    const cx = clamp(tx, 8, W - 8);
    const dx = cx - silo.x, dy = cy - (GROUND_Y - 18);
    const dist = Math.hypot(dx, dy) || 1;
    s.interceptors.push({
      x: silo.x, y: GROUND_Y - 18, sx: silo.x, sy: GROUND_Y - 18,
      tx: cx, ty: cy,
      vx: (dx / dist) * s.interceptorSpeed, vy: (dy / dist) * s.interceptorSpeed,
    });
  };

  const handleFire = (e) => {
    if (gameStatus !== 'playing') return;
    const s = stateRef.current;
    const p = toCanvasCoords(e.clientX, e.clientY);
    s.cursor = p;

    // Laser Silo: ammo-free, instant, cooldown-gated. Click directly on a
    // missile to vaporize it. A miss just disarms (no cooldown penalty).
    if (s.laserArmed) {
      s.laserArmed = false;
      setLaserArmed(false);
      let target = null, tD = LASER_HIT_R;
      for (const en of s.enemies) {
        const d = Math.hypot(en.x - p.x, en.y - p.y);
        if (d < tD) { tD = d; target = en; }
      }
      if (target) {
        let originX = W / 2;
        let oBest = Infinity;
        for (const si of s.silos) {
          if (!si.alive) continue;
          const d = Math.abs(si.x - target.x);
          if (d < oBest) { oBest = d; originX = si.x; }
        }
        s.beams.push({ x1: originX, y1: GROUND_Y - 18, x2: target.x, y2: target.y, t: 0 });
        s.explosions.push({ x: target.x, y: target.y, t: 0, chain: 0, maxR: BLAST_MAX_R * 0.7 });
        s.enemies = s.enemies.filter((en) => en !== target);
        s.streak += 1;
        s.multiplier = Math.min(MULTIPLIER_MAX, 1 + Math.floor(s.streak / STREAK_STEP));
        s.score += 50 * s.multiplier;
        setScore(s.score);
        s.laserCooldown = LASER_COOLDOWN;
        setLaserReady(false);
      }
      return;
    }

    if (p.y >= GROUND_Y - 8) return;
    let silo = null, bestD = Infinity;
    for (const si of s.silos) {
      if (!si.alive || si.ammo <= 0) continue;
      const d = Math.hypot(si.x - p.x, GROUND_Y - p.y);
      if (d < bestD) { bestD = d; silo = si; }
    }
    if (!silo) return;

    // Multi-Shot: only when armed (press C) and a charge is available. Consumes
    // one charge and fires a 3-way cluster. Otherwise a normal single shot.
    if (s.multiShotArmed && s.multiShots > 0) {
      s.multiShots -= 1;
      setMultiShots(s.multiShots);
      s.multiShotArmed = false;
      setMultiArmed(false);
      silo.ammo -= 1;
      fireInterceptor(s, silo, p.x - 42, p.y + 10);
      fireInterceptor(s, silo, p.x, p.y);
      fireInterceptor(s, silo, p.x + 42, p.y + 10);
    } else {
      silo.ammo -= 1;
      fireInterceptor(s, silo, p.x, p.y);
    }
  };

  const triggerSmartBomb = useCallback(() => {
    if (gameStatusRef.current !== 'playing') return;
    const s = stateRef.current;
    if (s.smartBombs <= 0) return;
    s.smartBombs -= 1;
    setSmartBombs(s.smartBombs);
    const killed = s.enemies.length;
    s.enemies.forEach((en) => s.explosions.push({ x: en.x, y: en.y, t: 0, chain: 0, maxR: BLAST_MAX_R }));
    s.enemies = [];
    s.score += killed * 25;
    setScore(s.score);
    flashToast(killed > 0 ? `Smart Bomb! ${killed} missiles destroyed` : 'Smart Bomb detonated');
  }, [flashToast]);

  // Arm/disarm the Multi-Shot cluster for the next click (limited charges).
  const toggleMultiShot = useCallback(() => {
    if (gameStatusRef.current !== 'playing') return;
    const s = stateRef.current;
    if (s.laserArmed) { s.laserArmed = false; setLaserArmed(false); }
    if (s.multiShotArmed) {
      s.multiShotArmed = false; setMultiArmed(false);
      return;
    }
    if (s.multiShots <= 0) { flashToast('No Cluster charges left'); return; }
    s.multiShotArmed = true; setMultiArmed(true);
    flashToast('Cluster armed — click to fire a 3-way spread');
  }, [flashToast]);

  // Arm/disarm the Laser Silo for the next click (ammo-free, cooldown-gated).
  const toggleLaser = useCallback(() => {
    if (gameStatusRef.current !== 'playing') return;
    const s = stateRef.current;
    if (!s.upgrades.laser) return;
    if (s.multiShotArmed) { s.multiShotArmed = false; setMultiArmed(false); }
    if (s.laserArmed) {
      s.laserArmed = false; setLaserArmed(false);
      return;
    }
    if (s.laserCooldown > 0) { flashToast(`Laser recharging (${s.laserCooldown.toFixed(1)}s)`); return; }
    s.laserArmed = true; setLaserArmed(true);
    flashToast('Laser armed — click a missile to vaporize it');
  }, [flashToast]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'x' || e.key === 'X') { triggerSmartBomb(); e.preventDefault(); }
      else if (e.key === 'c' || e.key === 'C') { toggleMultiShot(); e.preventDefault(); }
      else if (e.key === 'z' || e.key === 'Z') { toggleLaser(); e.preventDefault(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [triggerSmartBomb, toggleMultiShot, toggleLaser]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div className="game-page">
      <div className="game-header">
        <Link to="/games" className="game-back">← Games</Link>
        <h1 className="game-title">Missile Command</h1>
        <p className="game-subtitle">Defend your cities — click or tap where you want to intercept.</p>
      </div>

      <HowToPlay>
        <p><b>Objective:</b> survive each incoming wave while keeping at least one city standing.</p>
        <ul>
          <li>Click or tap anywhere on the sky to fire a single interceptor from your nearest silo toward that point.</li>
          <li>Interceptors burst into an expanding blast — enemy missiles caught in it are destroyed. Each silo has 10 interceptors per wave; if the nearest is empty the shot routes to another silo with ammo.</li>
          <li><b>Streak multiplier:</b> keep destroying missiles without losing a city to build an escalating score multiplier (up to x{MULTIPLIER_MAX}). Losing a city resets it to x1.</li>
          <li><b>Cluster Shot (press <b>C</b>):</b> arms your next click to fire a 3-way spread. It's a <i>limited-charge</i> special — you start with {MULTI_START} charges and earn more as you clear waves, so save it for a tight cluster of incoming missiles. Regular clicking always fires a single interceptor.</li>
          <li><b>Smart Bomb (press <b>X</b>):</b> instantly wipes every missile on screen. Only a couple of charges per game — use them wisely.</li>
          <li><b>Laser Silo (press <b>Z</b>):</b> unlocked mid-game — arms an ammo-free precision beam. Click directly on a missile to vaporize it instantly with no travel time, then it recharges on a short cooldown. Perfect for last-second saves.</li>
          <li><b>Passive upgrades:</b> clear waves to permanently gain Rapid Fire (faster interceptors) and Bigger Blast (wider kill-zone).</li>
          <li><b>Watch for MIRVs:</b> from wave {MIRV_START_WAVE} on, glowing purple missiles split into several warheads partway down — intercept them <i>early</i>, before they divide.</li>
          <li><b>City rebuild:</b> survive far enough and a destroyed city is reconstructed for you every few waves.</li>
          <li>Clear the first full wave with a city standing to win — then keep defending later waves for upgrades and bonus points.</li>
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
          <span>Games Won: <b>{stats.wins}</b></span>
          <span>Best: <b>{Math.max(stats.best_score || 0, bestScore)}</b></span>
        </div>
      )}

      <div className="mc-wrapper">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="mc-canvas"
          onPointerDown={handleFire}
          onPointerMove={handlePointerMove}
        />

        {toast && <div className="mc-toast">{toast}</div>}

        {gameStatus === 'idle' && (
          <div className="mc-overlay" onClick={startGame} style={{ cursor: 'pointer' }}>
            <div className="mc-overlay-inner">
              <div className="mc-overlay-emoji">🚀</div>
              <h3>Missile Command</h3>
              <p>Press <b>Start Game</b> to defend your cities.</p>
              <p style={{ fontSize: 13, opacity: 0.7 }}>Click the sky to intercept · C Cluster · X Smart Bomb · Z Laser</p>
              <p style={{ fontSize: 12, opacity: 0.55, marginTop: 4 }}>(or tap anywhere here)</p>
            </div>
          </div>
        )}

        {gameStatus === 'over' && (
          <div className="mc-overlay">
            <div className="mc-overlay-inner">
              <div className="mc-overlay-emoji">🏙️💥</div>
              <h3>Cities Lost</h3>
              <p>Reached Wave <b>{wave}</b> · Score <b>{score}</b></p>
              <button className="gs-btn gs-btn-primary" onClick={startGame} style={{ marginTop: 10 }}>Play Again</button>
            </div>
          </div>
        )}
      </div>

      <div className="mc-hud-row">
        {upgrades.rapidFire && <span className="mc-badge">Rapid Fire</span>}
        {upgrades.biggerBlast && <span className="mc-badge">Bigger Blast</span>}
        <button
          className={`mc-special mc-cluster${multiArmed ? ' armed' : ''}`}
          onClick={toggleMultiShot}
          disabled={gameStatus !== 'playing' || (multiShots <= 0 && !multiArmed)}
        >
          🎯 Cluster ({multiShots}){multiArmed ? ' ✦' : ''}
        </button>
        <button
          className="mc-special mc-smartbomb"
          onClick={triggerSmartBomb}
          disabled={gameStatus !== 'playing' || smartBombs <= 0}
        >
          💥 Smart Bomb ({smartBombs})
        </button>
        {upgrades.laser && (
          <button
            className={`mc-special mc-laser${laserArmed ? ' armed' : ''}`}
            onClick={toggleLaser}
            disabled={gameStatus !== 'playing' || (!laserReady && !laserArmed)}
          >
            🔴 Laser {laserArmed ? '✦' : laserReady ? 'RDY' : '…'}
          </button>
        )}
      </div>

      <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', marginTop: 10 }}>
        Cities remaining: <b>{citiesLeft}</b> · Click the sky to fire · <b>C</b> Cluster · <b>X</b> Smart Bomb · <b>Z</b> Laser
      </p>
    </div>
  );
}
