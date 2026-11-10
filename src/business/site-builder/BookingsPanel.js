import React, { useEffect, useState } from 'react';
import { CalendarClock, Plus, Trash2, ClipboardList, Clock, Check, ExternalLink } from 'lucide-react';
import apiRequest from '../../ApiRequest';

/** Mirrors PaymentsPanel.js's own useOauthReturnBanner -- reads the
 * one-time ?calendar=connected|error&message=... the Google OAuth
 * callback redirect lands with (see routes/calendar.py's
 * _frontend_return_url), shown once, not persisted. */
function useOauthReturnBanner() {
  const [banner, setBanner] = useState(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const calendar = params.get('calendar');
    if (calendar) {
      setBanner({ ok: calendar === 'connected', message: params.get('message') });
      params.delete('calendar');
      params.delete('message');
      params.delete('tab');
      const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
      window.history.replaceState({}, '', next);
    }
  }, []);
  return banner;
}

export function GoogleCalendarSection({ businessId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(false);
  const banner = useOauthReturnBanner();

  const load = () => apiRequest('GET', null, `/business/businesses/${businessId}/calendar/status`).then(setData).catch(() => setError('Could not load calendar status.'));
  useEffect(() => { load(); }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  const connect = () => {
    setConnecting(true);
    apiRequest('POST', {}, `/business/businesses/${businessId}/calendar/connect/start`)
      .then(({ authorize_url }) => { window.location.href = authorize_url; })
      .catch((err) => { setError(typeof err === 'string' ? err : 'Could not start that connection.'); setConnecting(false); });
  };

  const disconnect = () => {
    if (!window.confirm('Disconnect Google Calendar? New bookings will stop syncing to it.')) return;
    setError('');
    apiRequest('DELETE', null, `/business/businesses/${businessId}/calendar/disconnect`).then(load).catch((err) => setError(typeof err === 'string' ? err : 'Could not disconnect -- try again.'));
  };

  if (!data) return null;
  const account = data.account;
  const isActive = account?.status === 'active';

  return (
    <div style={{ marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid var(--border, #e5e1d6)' }}>
      <h4 className="biz-section-title" style={{ marginTop: 0 }}>Google Calendar</h4>
      {banner && (
        <p style={{ fontSize: 13, color: banner.ok ? 'var(--accent)' : 'var(--danger, #b42318)' }}>
          {banner.ok ? 'Google Calendar connected.' : (banner.message || 'Could not connect Google Calendar.')}
        </p>
      )}
      {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13 }}>{error}</p>}

      {!data.google_configured && <p className="gs-empty">Google isn't configured on this deployment yet -- check back soon.</p>}

      {data.google_configured && !isActive && (
        <>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            Connect your Google Calendar so every booking automatically appears on it, and times you've already blocked off there won't be offered to customers.
          </p>
          <button type="button" className="gs-btn gs-btn-sm" disabled={connecting} onClick={connect}>
            <ExternalLink size={14} /> Connect Google Calendar
          </button>
        </>
      )}

      {isActive && (
        <>
          <p style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent)', fontSize: 13 }}>
            <Check size={16} /> Connected{account.account_email ? ` as ${account.account_email}` : ''}
          </p>
          <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={disconnect}>Disconnect</button>
        </>
      )}
    </div>
  );
}

const WEEKDAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function formatCents(cents) {
  return cents == null ? 'Price on request' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format(cents / 100);
}

function ServiceTypesSection({ businessId, services, onReload }) {
  const [name, setName] = useState('');
  const [duration, setDuration] = useState(30);
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError('');
    apiRequest('POST', {
      name: name.trim(),
      duration_minutes: Number(duration) || 30,
      price_cents: price === '' ? null : Math.round(Number(price) * 100),
    }, `/business/businesses/${businessId}/service-types`)
      .then(() => { setName(''); setPrice(''); onReload(); })
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not save.'));
  };

  return (
    <div>
      <h4 className="biz-section-title" style={{ marginTop: 0 }}>Services</h4>
      <form onSubmit={submit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <input className="gs-input" placeholder="Service name" value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1, minWidth: 140 }} />
        <input className="gs-input" type="number" min={5} placeholder="Minutes" value={duration} onChange={(e) => setDuration(e.target.value)} style={{ width: 90 }} />
        <input className="gs-input" type="number" step="0.01" placeholder="Price $ (blank = on request)" value={price} onChange={(e) => setPrice(e.target.value)} style={{ width: 170 }} />
        <button type="submit" className="gs-btn gs-btn-sm"><Plus size={14} /> Add</button>
      </form>
      {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13 }}>{error}</p>}
      <div className="admin-list">
        {services.length === 0 && <p className="gs-empty">No services yet.</p>}
        {services.map((s) => (
          <div key={s.id} className="admin-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>{s.name}</strong>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.duration_minutes} min · {formatCents(s.price_cents)}</div>
            </div>
            <button type="button" className="sb-icon-btn" onClick={() => { if (window.confirm(`Delete "${s.name}"?`)) apiRequest('DELETE', null, `/business/service-types/${s.id}`).then(onReload); }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AvailabilitySection({ businessId, services, rules, onReload }) {
  const [weekday, setWeekday] = useState(0);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [serviceTypeId, setServiceTypeId] = useState('');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    setError('');
    apiRequest('POST', {
      weekday: Number(weekday), start_time: startTime, end_time: endTime,
      service_type_id: serviceTypeId || null,
    }, `/business/businesses/${businessId}/availability-rules`)
      .then(onReload)
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not save.'));
  };

  return (
    <div>
      <h4 className="biz-section-title">Open hours</h4>
      <form onSubmit={submit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
        <select className="gs-select" value={weekday} onChange={(e) => setWeekday(e.target.value)} style={{ width: 130 }}>
          {WEEKDAY_LABELS.map((label, i) => <option key={i} value={i}>{label}</option>)}
        </select>
        <input className="gs-input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={{ width: 110 }} />
        <span style={{ fontSize: 13 }}>to</span>
        <input className="gs-input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={{ width: 110 }} />
        <select className="gs-select" value={serviceTypeId} onChange={(e) => setServiceTypeId(e.target.value)} style={{ width: 160 }}>
          <option value="">All services</option>
          {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button type="submit" className="gs-btn gs-btn-sm"><Plus size={14} /> Add</button>
      </form>
      {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13 }}>{error}</p>}
      <div className="admin-list">
        {rules.length === 0 && <p className="gs-empty">No open hours set yet -- the booking widget shows nothing until you add some.</p>}
        {rules.map((r) => (
          <div key={r.id} className="admin-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={13} /> {WEEKDAY_LABELS[r.weekday]} {r.start_time}–{r.end_time}
              {r.service_type_id && <span style={{ color: 'var(--muted)' }}>({services.find((s) => s.id === r.service_type_id)?.name || 'one service'})</span>}
            </div>
            <button type="button" className="sb-icon-btn" onClick={() => apiRequest('DELETE', null, `/business/availability-rules/${r.id}`).then(onReload)}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AppointmentsSection({ businessId }) {
  const [appointments, setAppointments] = useState(null);
  const [error, setError] = useState('');

  const load = () => apiRequest('GET', null, `/business/businesses/${businessId}/appointments`).then((d) => setAppointments(d.appointments)).catch(() => setAppointments([]));
  useEffect(() => { load(); }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  const setStatus = (id, status) => {
    setError('');
    apiRequest('PATCH', { status }, `/business/appointments/${id}`).then(load).catch((err) => setError(typeof err === 'string' ? err : 'Could not update that appointment.'));
  };

  if (!appointments) return <div className="gs-loading"><div className="gs-spinner" /></div>;

  return (
    <div>
      {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13 }}>{error}</p>}
      {appointments.length === 0 ? <p className="gs-empty">No appointments yet.</p> : (
    <div className="admin-list">
      {appointments.map((a) => (
        <div key={a.id} className="admin-card">
          <div className="admin-card-top">
            <span className={`admin-badge ${a.status === 'completed' ? 'approved' : a.status === 'canceled' || a.status === 'no_show' ? 'rejected' : 'pending'}`}>{a.status}</span>
            <span className="admin-date">{new Date(a.start_at).toLocaleString()}</span>
          </div>
          <div style={{ fontSize: 13 }}>{a.service_name} -- {a.customer_label}</div>
          {a.status === 'scheduled' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setStatus(a.id, 'completed')}>Mark completed</button>
              <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setStatus(a.id, 'canceled')}>Cancel</button>
              <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setStatus(a.id, 'no_show')}>No-show</button>
            </div>
          )}
        </div>
      ))}
    </div>
      )}
    </div>
  );
}

export default function BookingsPanel({ businessId }) {
  const [services, setServices] = useState(null);
  const [rules, setRules] = useState(null);
  const [showAppointments, setShowAppointments] = useState(false);

  const loadServices = () => apiRequest('GET', null, `/business/businesses/${businessId}/service-types`).then((d) => setServices(d.service_types)).catch(() => setServices([]));
  const loadRules = () => apiRequest('GET', null, `/business/businesses/${businessId}/availability-rules`).then((d) => setRules(d.availability_rules)).catch(() => setRules([]));

  useEffect(() => { loadServices(); loadRules(); }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!services || !rules) return <div className="gs-loading"><div className="gs-spinner" /></div>;

  return (
    <div className="gs-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}><CalendarClock size={18} /> Bookings</h3>
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setShowAppointments((s) => !s)}>
          <ClipboardList size={14} /> {showAppointments ? 'Hide appointments' : 'Appointments'}
        </button>
      </div>

      {showAppointments && <div style={{ marginTop: 14 }}><AppointmentsSection businessId={businessId} /></div>}

      <div style={{ marginTop: 14 }}>
        <GoogleCalendarSection businessId={businessId} />
      </div>

      <div style={{ marginTop: 14 }}>
        <ServiceTypesSection businessId={businessId} services={services} onReload={loadServices} />
      </div>
      <div style={{ marginTop: 20 }}>
        <AvailabilitySection businessId={businessId} services={services} rules={rules} onReload={loadRules} />
      </div>
    </div>
  );
}
