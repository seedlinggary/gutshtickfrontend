import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ScrollText, Plus, Globe, Lock, Users } from 'lucide-react';
import apiRequest from '../../ApiRequest';

export default function MySheets() {
  const navigate = useNavigate();
  const [sheets, setSheets] = useState(null);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('GET', null, '/torah/sheets').then((d) => setSheets(d.sheets || [])).catch(() => setSheets([]));
  }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    setError('');
    try {
      const sheet = await apiRequest('POST', { title: title.trim() }, '/torah/sheets');
      navigate(`/sheets/${sheet.id}`);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Could not create this sheet.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 1180 }}>
        <div className="tor-masthead">
          <div className="tor-masthead-kicker"><ScrollText size={13} /> Source Sheets</div>
          <h1 className="tor-masthead-title">My Source Sheets</h1>
          <p className="tor-masthead-sub">Build an ordered list of sources for a shiur or dvar Torah -- number them, title them, add your own notes, then preview and export to PDF or Word.</p>
        </div>

        <form onSubmit={create} className="tor-form-section" style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label className="tor-field-label">New sheet title</label>
            <input className="gs-input" placeholder="e.g. Parshat Bereishit -- Creation of Man" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <button type="submit" className="gs-btn gs-btn-primary" disabled={creating}>
            <Plus size={15} /> {creating ? 'Creating…' : 'Create sheet'}
          </button>
        </form>
        {error && <p className="tor-error">{error}</p>}

        <div style={{ margin: '4px 0 18px' }}>
          <Link to="/sheets/public" className="gs-btn gs-btn-outline gs-btn-sm"><Users size={14} /> Browse public sheets</Link>
        </div>

        {sheets === null && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
        {sheets && sheets.length === 0 && <p className="tor-empty">You haven't created a source sheet yet.</p>}
        {sheets && sheets.length > 0 && (
          <div className="tor-sheet-grid">
            {sheets.map((s) => (
              <Link key={s.id} to={`/sheets/${s.id}`} className="tor-sheet-card">
                <h3>{s.title}</h3>
                <p>{s.item_count} {s.item_count === 1 ? 'item' : 'items'}</p>
                <span className="tor-sheet-card-badge">
                  {s.is_public ? <><Globe size={11} /> Public</> : <><Lock size={11} /> Private</>}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
