import React, { useEffect, useState } from 'react';
import apiRequest from '../ApiRequest';

const STYLES = [
  { value: 'info', label: 'ℹ️ Info (blue)' },
  { value: 'success', label: '✅ Success (green)' },
  { value: 'warning', label: '⚠️ Warning (yellow)' },
  { value: 'urgent', label: '🚨 Urgent (red)' },
];

/** Super Admin control for the site-wide announcement banner -- shown above
 * the navbar on every one of GUT's 5 sites (see good-shtick/src/SiteBanner.js,
 * mounted once in App.js). Edits backend/banner's single-row SiteBanner via
 * PATCH /banner/admin, no redeploy involved -- same pattern as
 * AdminAlertSchedule.js. */
export default function AdminSiteBanner() {
  const [form, setForm] = useState({ enabled: false, message: '', link_url: '', link_text: '', style: 'info' });
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgIsError, setMsgIsError] = useState(false);

  useEffect(() => {
    apiRequest('GET', null, '/banner/admin')
      .then((data) => {
        setForm({
          enabled: !!data.enabled,
          message: data.message || '',
          link_url: data.link_url || '',
          link_text: data.link_text || '',
          style: data.style || 'info',
        });
        setUpdatedAt(data.updated_at);
      })
      .catch(() => { setMsg('Could not load the current banner.'); setMsgIsError(true); })
      .finally(() => setLoading(false));
  }, []);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const save = async (overrides = {}) => {
    const body = { ...form, ...overrides };
    setSaving(true);
    setMsg('');
    try {
      const updated = await apiRequest('PATCH', body, '/banner/admin');
      setForm({
        enabled: !!updated.enabled,
        message: updated.message || '',
        link_url: updated.link_url || '',
        link_text: updated.link_text || '',
        style: updated.style || 'info',
      });
      setUpdatedAt(updated.updated_at);
      setMsgIsError(false);
      setMsg(updated.enabled ? 'Saved -- live on every site now.' : 'Saved.');
    } catch (e) {
      setMsgIsError(true);
      setMsg(e?.message || 'Could not save the banner.');
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = () => {
    const next = !form.enabled;
    if (next && !form.message.trim()) {
      setMsgIsError(true);
      setMsg('Write a message below before turning the banner on.');
      return;
    }
    setForm((f) => ({ ...f, enabled: next }));
    save({ enabled: next });
  };

  return (
    <div className="admin-card" style={{ maxWidth: 640 }}>
      <h3>📣 Site Banner</h3>
      <p style={{ color: 'var(--muted)', marginTop: 0 }}>
        A dismissible announcement shown above the navbar on every GUT site. Anyone who
        closes it won't see that exact message again, but editing it here brings it back
        for everyone, even people who already dismissed the old one.
      </p>

      {loading ? (
        <div className="gs-loading"><div className="gs-spinner" /> Loading…</div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <input id="bannerEnabled" type="checkbox" checked={form.enabled} disabled={saving} onChange={toggleEnabled} />
            <label htmlFor="bannerEnabled">{form.enabled ? 'ON -- visible on every site' : 'OFF -- hidden'}</label>
          </div>

          <label style={{ display: 'block', marginBottom: 12 }}>
            Message
            <textarea
              className="auth-input"
              style={{ width: '100%', marginTop: 4, minHeight: 60, resize: 'vertical' }}
              maxLength={500}
              value={form.message}
              onChange={set('message')}
              placeholder="e.g. We're adding new features this week -- check out My Feed!"
            />
          </label>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            <label style={{ flex: '1 1 200px' }}>
              Link URL (optional)
              <input className="auth-input" style={{ width: '100%', marginTop: 4 }} value={form.link_url} onChange={set('link_url')} placeholder="https://www.gutshtick.com/..." />
            </label>
            <label style={{ flex: '1 1 140px' }}>
              Link text
              <input className="auth-input" style={{ width: '100%', marginTop: 4 }} maxLength={60} value={form.link_text} onChange={set('link_text')} placeholder="Learn more" />
            </label>
          </div>

          <label style={{ display: 'block', marginBottom: 14 }}>
            Style
            <select className="auth-input" style={{ display: 'block', marginTop: 4 }} value={form.style} onChange={set('style')}>
              {STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>

          {form.message && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Preview:</div>
              <div className={`site-banner site-banner-${form.style} site-banner-preview`}>
                <span className="site-banner-message">
                  {form.message}
                  {form.link_url && <a href={form.link_url} onClick={(e) => e.preventDefault()} className="site-banner-link"> {form.link_text || 'Learn more'} →</a>}
                </span>
                <button type="button" className="site-banner-close" aria-label="Close" onClick={(e) => e.preventDefault()}>×</button>
              </div>
            </div>
          )}

          <button type="button" className="gs-btn gs-btn-sm" onClick={() => save()} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>

          {msg && <div className={msgIsError ? 'gs-error-box' : 'gs-success-box'} style={{ marginTop: 10 }}>{msg}</div>}
          {updatedAt && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>Last updated: {new Date(updatedAt).toLocaleString()}</p>}
        </>
      )}
    </div>
  );
}
