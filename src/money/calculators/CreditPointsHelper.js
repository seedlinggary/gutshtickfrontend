import React, { useState } from 'react';
import { X } from 'lucide-react';

// Per-child points by age band, 2026 -- as officially split per PARENT, but
// this helper assumes ONE filer claims the child's points (the common case
// for a single filer working out their own number), not a two-parent split.
// Sources disagree specifically on the 6-17 band (some give 1 point to each
// parent as a 2024+ change, others still split 2/1 mother/father) -- flagged
// in the UI, not just here.
const CHILD_AGE_BANDS = [
  { key: '0', label: 'Born this tax year (age 0)', points: 2.5 },
  { key: '1-2', label: 'Age 1–2', points: 4.5 },
  { key: '3', label: 'Age 3', points: 3.5 },
  { key: '4-5', label: 'Age 4–5', points: 2.5 },
  { key: '6-17', label: 'Age 6–17', points: 1.0 },
  { key: '18', label: 'Age 18 (still receiving child allowance)', points: 0.5 },
];

function olehPoints(months) {
  if (months <= 0 || months > 54) return 0;
  if (months <= 12) return 1;
  if (months <= 30) return 3;
  if (months <= 42) return 2;
  return 1;
}

let childRowId = 0;

export default function CreditPointsHelper({ onApply }) {
  const [open, setOpen] = useState(false);
  const [gender, setGender] = useState('male');
  const [singleParent, setSingleParent] = useState(false);
  const [children, setChildren] = useState([]);
  const [isOleh, setIsOleh] = useState(false);
  const [olehMonths, setOlehMonths] = useState(12);
  const [isSoldier, setIsSoldier] = useState(false);
  const [soldierMonths, setSoldierMonths] = useState(12);
  const [hasDegree, setHasDegree] = useState(false);

  const addChild = () => setChildren((c) => [...c, { id: childRowId++, band: '6-17' }]);
  const removeChild = (id) => setChildren((c) => c.filter((row) => row.id !== id));
  const setChildBand = (id, band) => setChildren((c) => c.map((row) => (row.id === id ? { ...row, band } : row)));

  const basePoints = gender === 'female' ? 2.75 : 2.25;
  const childPoints = children.reduce((sum, row) => sum + (CHILD_AGE_BANDS.find((b) => b.key === row.band)?.points || 0), 0);
  const singleParentPoints = singleParent ? 1 : 0;
  const olehPts = isOleh ? olehPoints(Number(olehMonths) || 0) : 0;
  const soldierPts = isSoldier && Number(soldierMonths) <= 36 ? 2 : 0;
  const degreePts = hasDegree ? 1 : 0;
  const total = basePoints + childPoints + singleParentPoints + olehPts + soldierPts + degreePts;

  if (!open) {
    return (
      <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setOpen(true)}>
        Not sure how many points you have? Work it out
      </button>
    );
  }

  return (
    <div className="fin-form-section" style={{ marginTop: 10 }}>
      <h3 style={{ marginTop: 0 }}>Work out your credit points</h3>
      <p className="fin-calc-help" style={{ marginTop: 0 }}>
        These are the commonly-cited 2026 point values, assuming you (one filer) claim every point below -- the real
        rules split some categories between two parents and have more exceptions than fit here. Check the Tax
        Authority's own credit-point calculator if your situation is more complex than this.
      </p>

      <div style={{ display: 'flex', gap: 16, margin: '10px 0' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="radio" name="cpGender" checked={gender === 'male'} onChange={() => setGender('male')} /> Male (2.25 base)
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="radio" name="cpGender" checked={gender === 'female'} onChange={() => setGender('female')} /> Female (2.75 base)
        </label>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="checkbox" checked={singleParent} onChange={(e) => setSingleParent(e.target.checked)} /> Single parent (+1, on top of child points below)
      </label>

      <div style={{ marginTop: 12 }}>
        <strong style={{ fontSize: 13 }}>Children</strong>
        {children.map((row) => (
          <div key={row.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
            <select className="auth-input" style={{ flex: 1 }} value={row.band} onChange={(e) => setChildBand(row.id, e.target.value)}>
              {CHILD_AGE_BANDS.map((b) => <option key={b.key} value={b.key}>{b.label} — {b.points} pts</option>)}
            </select>
            <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => removeChild(row.id)} aria-label="Remove child"><X size={13} /></button>
          </div>
        ))}
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" style={{ marginTop: 8 }} onClick={addChild}>+ Add child</button>
      </div>

      <div style={{ marginTop: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={isOleh} onChange={(e) => setIsOleh(e.target.checked)} /> New immigrant (oleh), within first 54 months
        </label>
        {isOleh && (
          <div style={{ marginTop: 6, maxWidth: 220 }}>
            <label className="fin-field-label">Months since your immigrant certificate</label>
            <input className="gs-input" type="number" value={olehMonths} onChange={(e) => setOlehMonths(e.target.value)} />
          </div>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={isSoldier} onChange={(e) => setIsSoldier(e.target.checked)} /> Discharged soldier (within ~36 months of discharge)
        </label>
        {isSoldier && (
          <div style={{ marginTop: 6, maxWidth: 220 }}>
            <label className="fin-field-label">Months since discharge</label>
            <input className="gs-input" type="number" value={soldierMonths} onChange={(e) => setSoldierMonths(e.target.value)} />
            <p className="fin-calc-help">Exact amount depends on service length (sources differ, 1-2 points) -- this uses 2 as a common figure.</p>
          </div>
        )}
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <input type="checkbox" checked={hasDegree} onChange={(e) => setHasDegree(e.target.checked)} /> Completed an academic degree (+1, claimed the year after graduating)
      </label>

      <div className="fin-calc-row total" style={{ marginTop: 14 }}>
        <span className="fin-calc-row-label">Total points</span>
        <span className="fin-calc-row-value">{total}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button type="button" className="gs-btn gs-btn-primary gs-btn-sm" onClick={() => { onApply(total); setOpen(false); }}>
          Use {total} points
        </button>
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}
