import React, { useEffect, useState } from 'react';
import { Download, Ban, RotateCcw, UploadCloud } from 'lucide-react';
import nonprofitApiRequest from '../nonprofitApi';
import FamilyLinkCell from '../FamilyLinkCell';
import { linkRecordToFamily, unlinkRecordFromFamily } from '../familyLinkActions';
import '../nonprofit.css';

function formatCents(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ILS' }).format((cents || 0) / 100);
}

// The Nedarim Plus API is slow per-record, so imports come back in small
// batches (default 5) with a cursor (last_id) rather than one big call --
// staff click "Continue import" as many times as it takes instead of this
// auto-looping and risking a request timing out mid-import.
function ImportFromNedarim({ businessId, onImported }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const runBatch = () => {
    setBusy(true);
    setError('');
    nonprofitApiRequest('POST', { last_id: result?.last_id, batch_size: 5 }, `/nonprofit/businesses/${businessId}/nedarim/import-members`)
      .then((d) => {
        setResult((prev) => ({
          imported: (prev?.imported || 0) + d.imported,
          skipped: (prev?.skipped || 0) + d.skipped,
          has_more: d.has_more,
          last_id: d.last_id,
        }));
        onImported();
      })
      .catch((err) => setError(typeof err === 'string' ? err : 'Import failed.'))
      .finally(() => setBusy(false));
  };

  return (
    <div className="gs-card" style={{ marginBottom: 16 }}>
      <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}><UploadCloud size={18} /> Import from Nedarim Plus</h3>
      <p style={{ fontSize: 13, color: 'var(--muted)' }}>
        Pulls standing-order members in small batches -- run it once, then keep clicking "Continue import" until it reports
        there's nothing left.
      </p>
      {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13 }}>{error}</p>}
      {result && (
        <p style={{ fontSize: 13 }}>
          Imported {result.imported}, skipped {result.skipped} so far.{!result.has_more && ' Done -- no more to import.'}
        </p>
      )}
      {(!result || result.has_more) && (
        <button type="button" className="gs-btn gs-btn-sm" disabled={busy} onClick={runBatch}>
          {busy ? 'Importing…' : result ? 'Continue import' : 'Import from Nedarim Plus'}
        </button>
      )}
    </div>
  );
}

export default function NonprofitMembershipsPage({ businessId, staff, onOpenItem }) {
  const [memberships, setMemberships] = useState(null);
  const [families, setFamilies] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [familyBusyId, setFamilyBusyId] = useState(null);

  const load = () => nonprofitApiRequest('GET', null, `/nonprofit/businesses/${businessId}/memberships`)
    .then((d) => setMemberships(d.memberships))
    .catch(() => setMemberships([]));
  useEffect(() => { load(); }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    nonprofitApiRequest('GET', null, `/nonprofit/businesses/${businessId}/families`).then((d) => setFamilies(d.families)).catch(() => setFamilies([]));
  }, [businessId]);

  const chooseFamily = (m, choice) => {
    setFamilyBusyId(m.id);
    linkRecordToFamily(businessId, 'NonprofitMembership', m.id, choice).then(load).finally(() => setFamilyBusyId(null));
  };
  const unlinkFamily = (m) => {
    setFamilyBusyId(m.id);
    unlinkRecordFromFamily('NonprofitMembership', m.id).then(load).finally(() => setFamilyBusyId(null));
  };

  const exportCsv = () => {
    nonprofitApiRequest('GET', null, `/nonprofit/businesses/${businessId}/memberships/export`).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'memberships.csv';
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const runAction = (id, action) => nonprofitApiRequest('PATCH', { action }, `/nonprofit/memberships/${id}`).then(load);

  if (!memberships) return <div className="gs-loading"><div className="gs-spinner" /></div>;

  const filtered = memberships.filter((m) => {
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!(m.full_name || '').toLowerCase().includes(q) && !(m.email || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Memberships</h2>

      {staff.role === 'superadmin' && <ImportFromNedarim businessId={businessId} onImported={load} />}

      <div className="np-toolbar">
        <div className="np-filters">
          <input className="gs-input" placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 220 }} />
          <select className="gs-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="past_due">Past due</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={exportCsv}><Download size={14} /> Export CSV</button>
      </div>

      {filtered.length === 0 && <p className="gs-empty">No memberships found.</p>}

      <div className="admin-list">
        {filtered.map((m) => (
          <div key={m.id} className="admin-card">
            <div className="admin-card-top">
              <span className={`np-badge np-badge-${m.status}`}>{m.status}</span>
              <span className="admin-date">Next charge: {m.next_charge_date ? new Date(m.next_charge_date).toLocaleDateString() : '--'}</span>
            </div>
            <div style={{ fontSize: 13 }}>
              <button type="button" onClick={() => onOpenItem(m.id)} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent)', textDecoration: 'underline', cursor: 'pointer', font: 'inherit' }}>
                <strong>{m.full_name}</strong>
              </button>
              {m.email && <span style={{ color: 'var(--muted)' }}> · {m.email}</span>}
            </div>
            <div className="admin-card-meta">
              {m.tier} · {formatCents(m.monthly_cents)}{m.monthly_is_estimated ? ' (estimated)' : ''}/month
            </div>
            <div style={{ marginTop: 6 }}>
              <FamilyLinkCell
                families={families} familyId={m.family_id} familyName={m.family_name} busy={familyBusyId === m.id}
                onChoose={(choice) => chooseFamily(m, choice)} onUnlink={() => unlinkFamily(m)}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {m.status !== 'cancelled' ? (
                <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => { if (window.confirm('Cancel this membership?')) runAction(m.id, 'cancel'); }}><Ban size={13} /> Cancel</button>
              ) : (
                <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => runAction(m.id, 'reactivate')}><RotateCcw size={13} /> Reactivate</button>
              )}
              <span style={{ fontSize: 11, color: 'var(--muted)' }} title="This only changes the status shown here -- it does not touch the real standing order at the payment processor.">
                This does not cancel the real standing order
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
