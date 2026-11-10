import React, { useEffect, useState } from 'react';
import { Save, Plus, Trash2, Shield, Copy, Check, KeyRound, Heart } from 'lucide-react';
import nonprofitApiRequest from '../nonprofitApi';

function CopyableField({ value }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input className="gs-input" value={value} readOnly onFocus={(e) => e.target.select()} style={{ fontSize: 12 }} />
      <button type="button" className="sb-icon-btn" onClick={copy}>{copied ? <Check size={13} /> : <Copy size={13} />}</button>
    </div>
  );
}

function PaymentConfigCard({ businessId, staff }) {
  const [config, setConfig] = useState(null);
  const [mosadId, setMosadId] = useState('');
  const [apiValid, setApiValid] = useState('');
  const [apiPassword, setApiPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = () => nonprofitApiRequest('GET', null, `/nonprofit/businesses/${businessId}/payment-config`).then((d) => {
    setConfig(d);
    setMosadId(d.mosad_id || '');
    setApiValid(d.api_valid || '');
  });
  useEffect(() => { load(); }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const body = { mosad_id: mosadId, api_valid: apiValid };
    if (apiPassword) body.api_password = apiPassword;
    nonprofitApiRequest('PATCH', body, `/nonprofit/businesses/${businessId}/payment-config`)
      .then((d) => { setConfig(d); setApiPassword(''); setSaved(true); })
      .finally(() => setSaving(false));
  };

  if (!config) return <div className="gs-loading"><div className="gs-spinner" /></div>;
  if (staff.role !== 'superadmin') {
    return (
      <div className="gs-card">
        <h3 style={{ marginTop: 0 }}>Nedarim Plus</h3>
        <p className="gs-empty">
          {config.is_configured ? 'Online giving is set up for this organization.' : 'Online giving is not set up yet -- ask a super admin to configure it.'}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="gs-card" style={{ marginBottom: 20 }}>
      <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Shield size={18} /> Nedarim Plus</h3>
      <p style={{ fontSize: 13, color: 'var(--muted)' }}>
        Mosad number + ApiValid are enough to accept online payments. ApiPassword (from Nedarim Plus's "API Keys" screen) additionally
        enables history sync, decline detection, and live standing-order management -- optional, but recommended.
      </p>
      <div className="gs-field">
        <div className="gs-label">Mosad number</div>
        <input className="gs-input" value={mosadId} onChange={(e) => setMosadId(e.target.value)} placeholder="7-digit institution number" />
      </div>
      <div className="gs-field">
        <div className="gs-label">ApiValid</div>
        <input className="gs-input" value={apiValid} onChange={(e) => setApiValid(e.target.value)} placeholder="Client-side verification text" />
      </div>
      <div className="gs-field">
        <div className="gs-label">ApiPassword {config.has_api_password && <span style={{ color: 'var(--muted)' }}>(already set -- leave blank to keep it)</span>}</div>
        <input className="gs-input" type="password" value={apiPassword} onChange={(e) => setApiPassword(e.target.value)} placeholder={config.has_api_password ? '••••••••' : 'npk_...'} />
      </div>
      <button type="submit" className="gs-btn gs-btn-sm" disabled={saving}><Save size={14} /> Save</button>
      {saved && <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 10 }}>Saved</span>}

      <div className="gs-field" style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border, #e5e1d6)' }}>
        <div className="gs-label">Webhook URL -- paste this into Nedarim Plus</div>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: -2 }}>
          In Nedarim Plus's own dashboard: עוד (More) → Webhook → paste this into "עדכוני עסקאות" (transaction updates) and
          "הקמת הוראת קבע" (standing order setup), then save. Without this step, payments will still process, but this system
          will never find out they happened -- donations/memberships will stay stuck on "pending" forever.
        </p>
        {config.webhook_url ? (
          <CopyableField value={config.webhook_url} />
        ) : (
          <p style={{ fontSize: 12, color: 'var(--danger, #b42318)' }}>
            This server isn't fully set up yet to show a webhook URL -- ask whoever manages this platform to set BACKEND_PUBLIC_URL.
          </p>
        )}
      </div>
    </form>
  );
}

function MembershipTiersCard({ businessId, staff }) {
  const [tiers, setTiers] = useState(null);
  const [isOpen, setIsOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => nonprofitApiRequest('GET', null, `/nonprofit/businesses/${businessId}/membership-tiers`)
    .then((d) => { setTiers(d.tiers); setIsOpen(d.is_open); });
  useEffect(() => { load(); }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!tiers) return null;
  if (staff.role !== 'superadmin') return null;

  const update = (i, patch) => setTiers(tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  const archive = (i) => setTiers(tiers.map((t, idx) => (idx === i ? { ...t, archived: true } : t)));
  const add = () => setTiers([...tiers, { label: '', monthly_cents: '' }]);

  const save = (e) => {
    e.preventDefault();
    const active = tiers.filter((t) => !t.archived);
    if (active.length === 0 || active.some((t) => !t.label.trim() || !t.monthly_cents)) {
      setError('Every tier needs a name and a monthly price.');
      return;
    }
    setSaving(true);
    setError('');
    nonprofitApiRequest('PATCH', { tiers, is_open: isOpen }, `/nonprofit/businesses/${businessId}/membership-tiers`)
      .then((d) => { setTiers(d.tiers); setIsOpen(d.is_open); })
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not save.'))
      .finally(() => setSaving(false));
  };

  return (
    <form onSubmit={save} className="gs-card" style={{ marginBottom: 20 }}>
      <h3 style={{ marginTop: 0 }}>Membership tiers</h3>
      <p style={{ fontSize: 13, color: 'var(--muted)' }}>
        Define any number of tiers (e.g. Member, Associate Member, Non-Member) -- visitors pick one when they sign up online.
      </p>
      {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13 }}>{error}</p>}
      {tiers.map((t, i) => !t.archived && (
        <div key={t.id || `new-${i}`} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
          <input className="gs-input" placeholder="Tier name" value={t.label}
            onChange={(e) => update(i, { label: e.target.value })} style={{ flex: '2 1 180px' }} />
          <input className="gs-input" type="number" step="0.01" min="0" placeholder="₪/month"
            value={t.monthly_cents === '' ? '' : (t.monthly_cents / 100)}
            onChange={(e) => update(i, { monthly_cents: Math.round(Number(e.target.value) * 100) })}
            style={{ flex: '1 1 100px' }} />
          {tiers.filter((x) => !x.archived).length > 1 && (
            <button type="button" className="sb-icon-btn" title="Remove tier" onClick={() => archive(i)}><Trash2 size={14} /></button>
          )}
        </div>
      ))}
      <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={add} style={{ marginBottom: 14 }}><Plus size={13} /> Add tier</button>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 10 }}>
        <input type="checkbox" checked={isOpen} onChange={(e) => setIsOpen(e.target.checked)} />
        Open for new members online
      </label>

      <button type="submit" className="gs-btn gs-btn-sm" disabled={saving}><Save size={14} /> Save</button>
    </form>
  );
}

function DonationsOpenCard({ businessId, staff }) {
  const [isOpen, setIsOpen] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    nonprofitApiRequest('GET', null, `/nonprofit/businesses/${businessId}/donate-open`).then((d) => setIsOpen(d.is_open));
  }, [businessId]);

  if (staff.role !== 'superadmin') return null;
  if (isOpen === null) return null;

  const toggle = (next) => {
    setSaving(true);
    nonprofitApiRequest('PATCH', { is_open: next }, `/nonprofit/businesses/${businessId}/donate-open`)
      .then((d) => setIsOpen(d.is_open))
      .finally(() => setSaving(false));
  };

  return (
    <div className="gs-card" style={{ marginBottom: 20 }}>
      <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Heart size={18} /> Donations</h3>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
        <input type="checkbox" checked={isOpen} disabled={saving} onChange={(e) => toggle(e.target.checked)} />
        Open for online donations
      </label>
    </div>
  );
}

function StaffManagementCard({ businessId, staff }) {
  const [rows, setRows] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('staff');
  const [error, setError] = useState('');

  const load = () => nonprofitApiRequest('GET', null, `/nonprofit/businesses/${businessId}/staff`).then((d) => setRows(d.staff));
  useEffect(() => { load(); }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (staff.role !== 'superadmin') return null;
  if (!rows) return null;

  const submit = (e) => {
    e.preventDefault();
    setError('');
    nonprofitApiRequest('POST', { email, name, password, role }, `/nonprofit/businesses/${businessId}/staff`)
      .then(() => { setFormOpen(false); setEmail(''); setName(''); setPassword(''); setRole('staff'); load(); })
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not add staff member.'));
  };

  return (
    <div className="gs-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Staff accounts</h3>
        {!formOpen && <button type="button" className="gs-btn gs-btn-sm" onClick={() => setFormOpen(true)}><Plus size={14} /> Add staff</button>}
      </div>

      {formOpen && (
        <form onSubmit={submit} className="sb-new-page-form" style={{ maxWidth: 420 }}>
          {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13 }}>{error}</p>}
          <input className="gs-input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <input className="gs-input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="gs-input" type="password" placeholder="Temporary password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <select className="gs-select" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="staff">Staff</option>
            <option value="superadmin">Super admin</option>
          </select>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="gs-btn gs-btn-sm">Add</button>
            <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setFormOpen(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="admin-list" style={{ marginTop: 14 }}>
        {rows.map((s) => (
          <div key={s.id} className="admin-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <strong>{s.name}</strong> <span style={{ color: 'var(--muted)', fontSize: 13 }}>{s.email}</span>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.role}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select className="gs-select" value={s.role} disabled={s.id === staff.id}
                onChange={(e) => nonprofitApiRequest('PATCH', { role: e.target.value }, `/nonprofit/staff/${s.id}`).then(load)}>
                <option value="staff">Staff</option>
                <option value="superadmin">Super admin</option>
              </select>
              <button type="button" className="sb-icon-btn" disabled={s.id === staff.id}
                onClick={() => { if (window.confirm(`Remove ${s.name}?`)) nonprofitApiRequest('DELETE', null, `/nonprofit/staff/${s.id}`).then(load); }}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    nonprofitApiRequest('PATCH', { current_password: currentPassword, new_password: newPassword }, '/nonprofit/staff/me/password')
      .then(() => { setCurrentPassword(''); setNewPassword(''); setSaved(true); })
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not change your password.'))
      .finally(() => setSaving(false));
  };

  return (
    <form onSubmit={submit} className="gs-card" style={{ marginBottom: 20 }}>
      <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}><KeyRound size={18} /> Your password</h3>
      {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input className="gs-input" type="password" placeholder="Current password" value={currentPassword} required
          onChange={(e) => setCurrentPassword(e.target.value)} style={{ flex: '1 1 180px' }} />
        <input className="gs-input" type="password" placeholder="New password (min 8 characters)" value={newPassword} required minLength={8}
          onChange={(e) => setNewPassword(e.target.value)} style={{ flex: '1 1 180px' }} />
      </div>
      <button type="submit" className="gs-btn gs-btn-sm" disabled={saving} style={{ marginTop: 10 }}><Save size={14} /> Change password</button>
      {saved && <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 10 }}>Changed</span>}
    </form>
  );
}

export default function NonprofitSettingsPage({ businessId, staff, isOwnerView }) {
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Settings</h2>
      <PaymentConfigCard businessId={businessId} staff={staff} />
      <MembershipTiersCard businessId={businessId} staff={staff} />
      <DonationsOpenCard businessId={businessId} staff={staff} />
      <StaffManagementCard businessId={businessId} staff={staff} />
      {/* isOwnerView's staff identity is auto-provisioned with a random
          password nobody knows (see nonprofit_staff.py's
          auto_login_as_owner) -- the owner gets in through their regular
          platform login, never a password here, so "change my password"
          would be an unusable dead end (it requires the current one) --
          only shown for a real delegated staff login via the separate
          /staff/* portal, where there IS a real, staff-chosen password. */}
      {isOwnerView ? (
        <div className="gs-card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}><KeyRound size={18} /> Your access</h3>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
            You're in as the site owner, through your regular platform login -- there's no separate password here to change.
            Anyone else you add from Staff accounts above signs in on their own, at this site's own staff login page.
          </p>
        </div>
      ) : (
        <ChangePasswordCard />
      )}
    </div>
  );
}
