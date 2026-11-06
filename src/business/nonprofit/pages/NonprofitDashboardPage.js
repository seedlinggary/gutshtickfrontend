import React, { useEffect, useState } from 'react';
import { HandCoins, Users, AlertTriangle, ListTree, AlertCircle, Copy, Check } from 'lucide-react';
import nonprofitApiRequest from '../nonprofitApi';

function formatCents(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ILS' }).format((cents || 0) / 100);
}

function CopyableLink({ value }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input className="gs-input" value={value} readOnly onFocus={(e) => e.target.select()} style={{ fontSize: 12 }} />
      <button type="button" className="sb-icon-btn" onClick={copy}>{copied ? <Check size={13} /> : <Copy size={13} />}</button>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="gs-card np-stat-card">
      <Icon size={20} />
      <div>
        <div className="np-stat-value">{value}</div>
        <div className="np-stat-label">{label}</div>
      </div>
    </div>
  );
}

export default function NonprofitDashboardPage({ businessId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    nonprofitApiRequest('GET', null, `/nonprofit/businesses/${businessId}/dashboard`).then(setData).catch(() => {});
  }, [businessId]);

  if (!data) return <div className="gs-loading"><div className="gs-spinner" /></div>;

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Dashboard</h2>

      {(data.warnings.nedarim_not_configured || data.warnings.email_not_configured) && (
        <div className="gs-card np-warning-banner">
          <AlertCircle size={18} />
          <div>
            {data.warnings.nedarim_not_configured && <p style={{ margin: '2px 0' }}>Nedarim Plus isn't set up yet -- donations/memberships can't be collected online until you add your Mosad ID in Settings.</p>}
            {data.warnings.email_not_configured && <p style={{ margin: '2px 0' }}>Email isn't configured -- payment follow-up emails won't send until this is set up on the server.</p>}
          </div>
        </div>
      )}

      <div className="np-stat-grid">
        <StatCard icon={HandCoins} label="Total paid donations" value={formatCents(data.total_paid_donations_cents)} />
        <StatCard icon={Users} label="Active members" value={data.active_members} />
        <StatCard icon={AlertTriangle} label="Open follow-ups" value={data.open_followups} />
        <StatCard icon={ListTree} label="Other transactions total" value={formatCents(data.other_transactions_total_cents)} />
      </div>

      <div className="gs-card" style={{ marginTop: 20 }}>
        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Users size={18} /> Family portal</h3>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: -4 }}>
          Share this link with your families -- they enter their email, get a 6-digit code, and can see their own donations,
          membership, and holiday seats. Only works for an email that's on a Family record (Families tab).
        </p>
        {data.family_portal_url ? (
          <CopyableLink value={data.family_portal_url} />
        ) : (
          <p style={{ fontSize: 12, color: 'var(--danger, #b42318)' }}>
            This server isn't fully set up yet to show this link -- ask whoever manages this platform to set BUSINESS_SITE_BASE_DOMAIN.
          </p>
        )}
      </div>
    </div>
  );
}
