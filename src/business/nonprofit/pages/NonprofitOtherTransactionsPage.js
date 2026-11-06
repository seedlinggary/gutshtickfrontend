import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import nonprofitApiRequest from '../nonprofitApi';
import FamilyLinkCell from '../FamilyLinkCell';
import { linkRecordToFamily, unlinkRecordFromFamily } from '../familyLinkActions';
import '../nonprofit.css';

function formatCents(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ILS' }).format((cents || 0) / 100);
}

export default function NonprofitOtherTransactionsPage({ businessId }) {
  const [transactions, setTransactions] = useState(null);
  const [families, setFamilies] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [rowError, setRowError] = useState({});
  const [familyBusyId, setFamilyBusyId] = useState(null);

  const load = () => nonprofitApiRequest('GET', null, `/nonprofit/businesses/${businessId}/other-transactions`)
    .then((d) => setTransactions(d.transactions))
    .catch(() => setTransactions([]));
  useEffect(() => { load(); }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    nonprofitApiRequest('GET', null, `/nonprofit/businesses/${businessId}/families`)
      .then((d) => setFamilies(d.families))
      .catch(() => setFamilies([]));
  }, [businessId]);

  const chooseFamily = (t, choice) => {
    setRowError((e) => ({ ...e, [t.id]: '' }));
    setFamilyBusyId(t.id);
    linkRecordToFamily(businessId, 'NonprofitExternalTransaction', t.id, choice)
      .then(load)
      .catch((err) => setRowError((e) => ({ ...e, [t.id]: typeof err === 'string' ? err : 'Could not link.' })))
      .finally(() => setFamilyBusyId(null));
  };
  const unlinkFamily = (t) => {
    setFamilyBusyId(t.id);
    unlinkRecordFromFamily('NonprofitExternalTransaction', t.id).then(load).finally(() => setFamilyBusyId(null));
  };

  const exportCsv = () => {
    setExporting(true);
    nonprofitApiRequest('GET', null, `/nonprofit/businesses/${businessId}/other-transactions/export`)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'other-transactions.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      })
      .catch(() => {})
      .finally(() => setExporting(false));
  };

  if (!transactions) return <div className="gs-loading"><div className="gs-spinner" /></div>;

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Other transactions</h2>
      <div className="np-toolbar">
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
          Payments that came through the processor but don't match any record this system generated.
        </p>
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={exportCsv} disabled={exporting}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {transactions.length === 0 ? <p className="gs-empty">No other transactions.</p> : (
        <div className="admin-list">
          {transactions.map((t) => {
            return (
              <div key={t.id} className="admin-card">
                <div className="admin-card-top">
                  <strong>{t.client_name || 'Unnamed'}</strong>
                  <span className="admin-date">{t.received_at ? new Date(t.received_at).toLocaleDateString() : ''}</span>
                </div>
                <div style={{ fontSize: 13 }}>{formatCents(t.amount_cents)}{t.groupe && ` · ${t.groupe}`}</div>
                <div className="admin-card-meta">
                  {t.phone && `${t.phone} `}{t.email && `· ${t.email}`}
                  {t.comments && ` · ${t.comments}`}
                </div>
                {rowError[t.id] && <p style={{ color: 'var(--danger, #b42318)', fontSize: 12 }}>{rowError[t.id]}</p>}
                <div style={{ marginTop: 6 }}>
                  <FamilyLinkCell
                    families={families} familyId={t.family_id} familyName={t.family_name} busy={familyBusyId === t.id}
                    onChoose={(choice) => chooseFamily(t, choice)} onUnlink={() => unlinkFamily(t)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
