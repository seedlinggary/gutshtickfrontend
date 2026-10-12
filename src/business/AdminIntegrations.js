import React, { useEffect, useState } from 'react';
import { Plug, CheckCircle2, ArrowRight } from 'lucide-react';
import apiRequest from '../ApiRequest';

const PLATFORM_DOCS = {
  facebook: 'https://developers.facebook.com/apps/',
  google: 'https://console.cloud.google.com/apis/credentials',
  x: 'https://developer.x.com/en/portal/dashboard',
  linkedin: 'https://www.linkedin.com/developers/apps',
};

function IntegrationRow({ row, onSaved }) {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const [editing, setEditing] = useState(!row.configured);

  const save = (e) => {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    apiRequest('PUT', { client_id: clientId.trim(), client_secret: clientSecret.trim() }, `/business/admin/integrations/${row.platform}`)
      .then(() => { setStatus('Saved!'); setEditing(false); setClientSecret(''); onSaved(); })
      .catch((err) => setStatus(typeof err === 'string' ? err : 'Could not save that'))
      .finally(() => setBusy(false));
  };

  const clear = () => {
    if (!window.confirm(`Remove the ${row.label} credentials? Businesses that connected through it will need to reconnect once you add new ones.`)) return;
    apiRequest('DELETE', null, `/business/admin/integrations/${row.platform}`)
      .then(() => { setEditing(true); onSaved(); })
      .catch((err) => setStatus(typeof err === 'string' ? err : 'Could not remove those credentials'));
  };

  return (
    <div className={`biz-integration-row${row.configured ? ' biz-integration-configured' : ''}`}>
      <div className="biz-integration-header">
        <div>
          <strong>{row.label}</strong>
          {row.configured ? (
            <span className="biz-integration-status biz-integration-status-ok">
              <CheckCircle2 size={13} /> Configured {row.source === 'environment' ? '(via environment variable)' : ''}
            </span>
          ) : (
            <span className="biz-integration-status biz-integration-status-off">Not configured</span>
          )}
        </div>
        {row.configured && row.source === 'database' && !editing && (
          <div className="biz-integration-actions">
            <button type="button" onClick={() => setEditing(true)}>Edit</button>
            <button type="button" onClick={clear}>Remove</button>
          </div>
        )}
      </div>

      {row.client_id && !editing && (
        <p className="biz-integration-client-id">App/Client ID: <code>{row.client_id}</code></p>
      )}

      {status && !editing && <p className="biz-integration-status-msg">{status}</p>}

      {editing && (
        <form onSubmit={save} className="biz-integration-form">
          <input type="text" placeholder="App / Client ID" value={clientId} onChange={(e) => setClientId(e.target.value)} required />
          <input type="password" placeholder="App / Client Secret" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} required />
          <div className="biz-integration-form-actions">
            <button type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save'}</button>
            {row.configured && <button type="button" onClick={() => setEditing(false)}>Cancel</button>}
          </div>
          {status && <p className="biz-integration-status-msg">{status}</p>}
        </form>
      )}
    </div>
  );
}

export default function AdminIntegrations() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(false);

  const load = () => apiRequest('GET', null, '/business/admin/integrations').then(setRows).catch(() => setError(true));
  useEffect(() => { load(); }, []);

  if (error) return <div className="biz-page"><p className="biz-error">You don't have access to this page.</p></div>;
  if (!rows) return <div className="biz-page"><p>Loading...</p></div>;

  return (
    <div className="biz-page biz-admin-integrations">
      <h1 className="biz-page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Plug size={26} /> Social Platform Integrations</h1>
      <p className="biz-page-subtitle">
        These are the app-level credentials the whole directory shares for the Social Desk's "Connect" buttons.
        Business owners never see or enter these -- once you set one up here, any business owner can click
        "Connect" on that platform and log into <em>their own</em> account through the normal OAuth screen.
        You create one app per platform (one-time, free), paste its ID and secret below, and every business
        on the directory can use it.
      </p>

      <div className="biz-integration-list">
        {rows.map((row) => (
          <div key={row.platform}>
            <IntegrationRow row={row} onSaved={load} />
            <a href={PLATFORM_DOCS[row.platform]} target="_blank" rel="noopener noreferrer" className="biz-integration-doc-link">
              Create a {row.label} app <ArrowRight size={12} style={{ verticalAlign: 'middle' }} />
            </a>
          </div>
        ))}
      </div>

      <div className="biz-integration-callout">
        <h4>Redirect URI to register with each app</h4>
        <p>When creating each app, use this as the OAuth redirect/callback URL:</p>
        <code>{window.location.origin.replace('3000', '5000')}/business/social/oauth/&lt;platform&gt;/callback</code>
        <p className="biz-integration-callout-note">
          (replace <code>&lt;platform&gt;</code> with <code>facebook</code>, <code>google</code>, <code>x</code>, or <code>linkedin</code> --
          for Instagram, use the same Facebook app since they share one login.)
        </p>
      </div>
    </div>
  );
}
