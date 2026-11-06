import React, { useEffect, useState } from 'react';
import { Users, GitMerge, X, Download, Plus } from 'lucide-react';
import nonprofitApiRequest from '../nonprofitApi';
import '../nonprofit.css';

function NewFamilyForm({ businessId, onCreated, onCancel }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (!fullName.trim()) { setError('A name is required.'); return; }
    setSaving(true);
    setError('');
    nonprofitApiRequest('POST', { full_name: fullName.trim(), email: email.trim() || null, phone: phone.trim() || null }, `/nonprofit/businesses/${businessId}/families`)
      .then(onCreated)
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not create family.'))
      .finally(() => setSaving(false));
  };

  return (
    <form onSubmit={submit} className="sb-new-page-form" style={{ maxWidth: 420 }}>
      {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13 }}>{error}</p>}
      <input className="gs-input" placeholder="Family / household name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      <input className="gs-input" type="email" placeholder="Email -- lets them use the family portal (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="gs-input" placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="gs-btn gs-btn-sm" disabled={saving}>Create</button>
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function NonprofitFamiliesPage({ businessId, onOpenItem }) {
  const [families, setFamilies] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [merging, setMerging] = useState(null);
  const [error, setError] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const loadFamilies = () => nonprofitApiRequest('GET', null, `/nonprofit/businesses/${businessId}/families`)
    .then((d) => setFamilies(d.families))
    .catch(() => setFamilies([]));

  const loadRecommendations = () => nonprofitApiRequest('GET', null, `/nonprofit/businesses/${businessId}/families/merge-recommendations`)
    .then((d) => setRecommendations(d.recommendations))
    .catch(() => setRecommendations([]));

  useEffect(() => { loadFamilies(); loadRecommendations(); }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  const mergeCluster = (index) => {
    const items = recommendations[index].items.map((i) => ({ record_type: i.type, record_id: i.id }));
    setMerging(index);
    setError('');
    nonprofitApiRequest('POST', { items }, `/nonprofit/businesses/${businessId}/families/merge`)
      .then(() => { loadFamilies(); loadRecommendations(); })
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not merge.'))
      .finally(() => setMerging(null));
  };

  // "Ignore" has nothing to persist server-side -- recommendations are
  // recomputed fresh from the current unlinked records on every load, so
  // dropping a cluster from local state is all "ignore" can mean here.
  const ignoreCluster = (index) => setRecommendations((recs) => recs.filter((_, i) => i !== index));

  const exportCsv = () => {
    nonprofitApiRequest('GET', null, `/nonprofit/businesses/${businessId}/families/export`).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'families.csv';
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  if (!families) return <div className="gs-loading"><div className="gs-spinner" /></div>;

  return (
    <div>
      <div className="np-toolbar">
        <h2 style={{ margin: 0 }}>Families</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={exportCsv}><Download size={14} /> Export CSV</button>
          {!addOpen && <button type="button" className="gs-btn gs-btn-sm" onClick={() => setAddOpen(true)}><Plus size={14} /> Add family</button>}
        </div>
      </div>

      {addOpen && (
        <div className="gs-card" style={{ marginBottom: 16 }}>
          <NewFamilyForm businessId={businessId} onCreated={() => { setAddOpen(false); loadFamilies(); }} onCancel={() => setAddOpen(false)} />
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="gs-card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>Suggested merges</h3>
          {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13 }}>{error}</p>}
          <div className="admin-list">
            {recommendations.map((rec, i) => (
              <div key={i} className="admin-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 13 }}>{rec.items.map((it) => it.name || `#${it.id}`).join(', ')}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="gs-btn gs-btn-sm" disabled={merging === i} onClick={() => mergeCluster(i)}>
                    <GitMerge size={13} /> Merge these
                  </button>
                  <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => ignoreCluster(i)}>
                    <X size={13} /> Ignore
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="gs-card">
        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Users size={18} /> All families</h3>
        {families.length === 0 ? <p className="gs-empty">No families yet.</p> : (
          <div className="admin-list">
            {families.map((f) => (
              <div key={f.id} className="admin-card">
                <strong>
                  <button type="button" onClick={() => onOpenItem(f.id)} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent)', textDecoration: 'underline', cursor: 'pointer', font: 'inherit' }}>
                    {f.full_name}
                  </button>
                </strong>
                <div className="admin-card-meta">
                  {f.email}{f.phone && ` · ${f.phone}`}{f.city && ` · ${f.city}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
