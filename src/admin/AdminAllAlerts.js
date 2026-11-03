import React, { useEffect, useState } from 'react';
import { Mail, MessageCircle, Pause as PauseIcon, Search } from 'lucide-react';
import apiRequest from '../ApiRequest';

const SITE_LABEL = { estates: 'Gut Estates', tachlis: 'Gut Money' };
const EMPTY_META = { page: 1, total: 0, per_page: 50, has_more: false };

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Same prev/next shape as SuperAdminDashboard.js's own Pager, local to this
 * file since that one isn't exported for reuse. */
function Pager({ meta, onPage, loading }) {
  if (!meta.total) return null;
  const start = (meta.page - 1) * meta.per_page + 1;
  const end = Math.min(meta.page * meta.per_page, meta.total);
  return (
    <div className="sa-pager" style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
      <button className="gs-btn gs-btn-outline gs-btn-sm" disabled={loading || meta.page <= 1}
        onClick={() => onPage(meta.page - 1)}>← Prev</button>
      <span style={{ fontSize: 13, color: 'var(--muted)' }}>{start}–{end} of {meta.total}</span>
      <button className="gs-btn gs-btn-outline gs-btn-sm" disabled={loading || !meta.has_more}
        onClick={() => onPage(meta.page + 1)}>Next →</button>
    </div>
  );
}

/** SuperAdmin's sitewide view of every alert any member or visitor has set
 * up (GET /alerts/admin) -- distinct from the Alerts tab's AdminAlertSchedule,
 * which is about WHEN the digest sends, not WHO has an alert. Read-only:
 * this is a visibility tool, not a moderation queue, so there's nothing
 * here to approve/reject. */
export default function AdminAllAlerts() {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(EMPTY_META);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchType, setSearchType] = useState('');
  const [q, setQ] = useState('');

  const load = (page = 1) => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ page: String(page) });
    if (searchType) params.set('search_type', searchType);
    if (q.trim()) params.set('q', q.trim());
    apiRequest('GET', null, `/alerts/admin?${params.toString()}`)
      .then((data) => { setItems(data.items); setMeta(data); })
      .catch(() => setError('Could not load alerts.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1); }, [searchType]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <p style={{ color: 'var(--muted)', marginTop: 0 }}>
        Every saved search alert set up anywhere on the site -- Gut Estates and Gut Money's Job Board alike.
      </p>

      <form onSubmit={(e) => { e.preventDefault(); load(1); }} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <select className="gs-select" style={{ width: 170 }} value={searchType} onChange={(e) => setSearchType(e.target.value)}>
          <option value="">All sites</option>
          <option value="estates">Gut Estates</option>
          <option value="tachlis">Gut Money</option>
        </select>
        <input className="gs-input" style={{ width: 240 }} placeholder="Search by email or alert name"
          value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="submit" className="gs-btn gs-btn-outline gs-btn-sm"><Search size={13} /> Search</button>
      </form>

      {error && <div className="gs-error-box">{error}</div>}
      {loading && <div className="gs-loading"><div className="gs-spinner" /></div>}
      {!loading && items.length === 0 && <div className="admin-empty">No alerts match this filter.</div>}

      <div className="admin-list">
        {!loading && items.map((a) => (
          <div key={a.id} className="admin-card">
            <div className="admin-card-top">
              <span className={`admin-badge ${a.confirmed ? 'approved' : 'pending'}`}>
                {a.confirmed ? 'Confirmed' : 'Pending confirmation'}
              </span>
              <span className="admin-date">{formatDate(a.created_at)}</span>
            </div>
            <h3 className="admin-caption">{a.label || 'Saved search'}</h3>
            <div className="admin-card-meta">
              <span>{SITE_LABEL[a.search_type] || a.search_type}</span>
              {' · '}<span>{a.profile_name || a.email}</span>
              {a.paused && <> · <span><PauseIcon size={11} style={{ verticalAlign: -1 }} /> Paused</span></>}
              {' · '}<span>{a.cadence === 'instant' ? 'Instant' : 'Daily'}</span>
              {' · '}<span>
                {a.channel === 'whatsapp' ? <><MessageCircle size={11} style={{ verticalAlign: -1 }} /> WhatsApp</> : <><Mail size={11} style={{ verticalAlign: -1 }} /> Email</>}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted-faint)', marginTop: 6, fontFamily: 'var(--font-mono, monospace)', wordBreak: 'break-all' }}>
              {a.filters}
            </div>
          </div>
        ))}
      </div>
      {!loading && <Pager meta={meta} loading={loading} onPage={(p) => load(p)} />}
    </div>
  );
}
