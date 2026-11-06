import React, { useEffect, useState } from 'react';
import { History, Download } from 'lucide-react';
import nonprofitApiRequest from '../nonprofitApi';
import '../nonprofit.css';

const PER_PAGE = 50;

export default function NonprofitAuditLogPage({ businessId }) {
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [recordType, setRecordType] = useState('');
  const [recordId, setRecordId] = useState('');

  const fetchPage = (pageNum, replace) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (recordType.trim()) params.set('record_type', recordType.trim());
    if (recordId.trim()) params.set('record_id', recordId.trim());
    params.set('page', String(pageNum));
    params.set('per_page', String(PER_PAGE));
    return nonprofitApiRequest('GET', null, `/nonprofit/businesses/${businessId}/audit-log?${params.toString()}`)
      .then((d) => {
        setEntries((prev) => (replace ? d.entries : [...prev, ...d.entries]));
        setHasMore(d.entries.length === PER_PAGE);
        setPage(pageNum);
      })
      .catch(() => { if (replace) setEntries([]); setHasMore(false); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPage(1, true); }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyFilters = (e) => {
    e.preventDefault();
    fetchPage(1, true);
  };

  const exportCsv = () => {
    const params = new URLSearchParams();
    if (recordType.trim()) params.set('record_type', recordType.trim());
    if (recordId.trim()) params.set('record_id', recordId.trim());
    nonprofitApiRequest('GET', null, `/nonprofit/businesses/${businessId}/audit-log/export?${params.toString()}`).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'audit-log.csv';
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div>
      <div className="np-toolbar">
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><History size={20} /> Audit log</h2>
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={exportCsv}><Download size={14} /> Export CSV</button>
      </div>

      <form onSubmit={applyFilters} className="np-filters" style={{ marginBottom: 16 }}>
        <input className="gs-input" placeholder="Record type (optional)" value={recordType} onChange={(e) => setRecordType(e.target.value)} style={{ maxWidth: 200 }} />
        <input className="gs-input" placeholder="Record ID (optional)" value={recordId} onChange={(e) => setRecordId(e.target.value)} style={{ maxWidth: 160 }} />
        <button type="submit" className="gs-btn gs-btn-sm">Filter</button>
      </form>

      {entries.length === 0 && !loading && <p className="gs-empty">No audit log entries.</p>}

      <div className="admin-list">
        {entries.map((entry) => (
          <div key={entry.id} className="admin-card">
            <div className="admin-card-top">
              <span>
                <strong>{entry.staff_email === 'system' ? 'System' : entry.staff_email}</strong>{' '}
                {entry.action}
                {entry.is_live_nedarim_write && <span className="np-badge np-badge-live" style={{ marginLeft: 6 }}>LIVE</span>}
              </span>
              <span className="admin-date">{entry.created_at ? new Date(entry.created_at).toLocaleString() : ''}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{entry.record_type} #{entry.record_id}</div>
            {entry.changes && (
              <div style={{ marginTop: 6 }}>
                {Object.entries(entry.changes).map(([field, change]) => (
                  <div key={field} style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {field}: {String(change.before)} → {String(change.after)}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {loading && <div className="gs-loading"><div className="gs-spinner" /></div>}

      {!loading && hasMore && entries.length > 0 && (
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" style={{ marginTop: 14 }} onClick={() => fetchPage(page + 1, false)}>Load more</button>
      )}
    </div>
  );
}
