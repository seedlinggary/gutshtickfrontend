import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Users, Plus, X } from 'lucide-react';
import apiRequest from '../ApiRequest';
import UploadFile from '../Uploadfile';
import { isLoggedIn } from '../auth';
import GuestContactFields from '../guest/GuestContactFields';
import GuestSubmitSuccess from '../guest/GuestSubmitSuccess';

const EMPTY = { name: '', city: '', state: '', country: '', description: '', lat: '', lng: '', eruv_status: '', eruv_url: '', eruv_map_image: '' };

// One row per sub-area, kept as a single "match text" string per the task's
// simplification -- the backend accepts a list of spelling variants, but a
// manager entering several per row isn't needed for a first version. Loaded
// from `{name, match}` on edit (match[0], or '' if match is empty) and sent
// back the same way on submit.
const EMPTY_SUB_AREA_ROW = { name: '', match: '' };

export default function CommunityForm() {
  const { slug } = useParams();
  const editing = !!slug;
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [communityId, setCommunityId] = useState(null);
  const [subAreaRows, setSubAreaRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(editing);
  const loggedIn = isLoggedIn();
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestResult, setGuestResult] = useState(null);

  useEffect(() => {
    if (!editing) return;
    apiRequest('GET', null, `/business/communities/${slug}`)
      .then((c) => {
        setCommunityId(c.id);
        setForm({
          name: c.name || '', city: c.city || '', state: c.state || '', country: c.country || '',
          description: c.description || '', lat: c.lat ?? '', lng: c.lng ?? '',
          eruv_status: c.eruv_status || '', eruv_url: c.eruv_url || '',
          eruv_map_image: c.eruv_map_image || '',
        });
        setSubAreaRows((c.sub_areas || []).map((a) => ({ name: a.name || '', match: (a.match || [])[0] || '' })));
      })
      .catch(() => setError('Could not load this community.'))
      .finally(() => setLoading(false));
  }, [editing, slug]);

  const addSubAreaRow = () => setSubAreaRows((rows) => [...rows, { ...EMPTY_SUB_AREA_ROW }]);
  const removeSubAreaRow = (i) => setSubAreaRows((rows) => rows.filter((_, idx) => idx !== i));
  const updateSubAreaRow = (i, field, value) => setSubAreaRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));

  const submit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.city.trim()) {
      setError('Name and city are required.');
      return;
    }
    if (!editing && !loggedIn && !guestEmail.trim() && !guestPhone.trim()) {
      setError('Add an email or phone so we can send you a link to manage this later.');
      return;
    }
    setSaving(true);

    // Guest create/edit only supports name/city/state/country/description/
    // lat/lng (see create_guest_community/edit_guest_community in
    // backend/business/routes/community.py) -- no eruv fields, no
    // sub_areas, so the guest path sends a reduced payload rather than one
    // the backend would silently ignore most of.
    if (!editing && !loggedIn) {
      const body = {
        name: form.name.trim(), city: form.city.trim(), state: form.state.trim() || null,
        country: form.country.trim() || null, description: form.description.trim() || null,
        lat: form.lat === '' ? null : form.lat, lng: form.lng === '' ? null : form.lng,
        guest_email: guestEmail.trim() || null, guest_phone: guestPhone.trim() || null,
      };
      apiRequest('POST', body, '/business/communities/guest')
        .then((c) => setGuestResult(c))
        .catch((err) => setError(typeof err === 'string' ? err : 'Could not save this community.'))
        .finally(() => setSaving(false));
      return;
    }

    const sub_areas = subAreaRows
      .filter((r) => r.name.trim() && r.match.trim())
      .map((r) => ({ name: r.name.trim(), match: [r.match.trim()] }));
    const body = { ...form, lat: form.lat === '' ? null : form.lat, lng: form.lng === '' ? null : form.lng, sub_areas };
    const req = editing
      ? apiRequest('PATCH', body, `/business/communities/${communityId}`)
      : apiRequest('POST', body, '/business/communities');
    req
      .then((c) => navigate(`/communities/${c.slug}`))
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not save this community.'))
      .finally(() => setSaving(false));
  };

  if (loading) return <div className="feed-section"><div className="gs-container" style={{ maxWidth: 640 }}><p style={{ color: 'var(--muted)' }}>Loading…</p></div></div>;

  if (guestResult) {
    return (
      <div className="feed-section">
        <div className="gs-container" style={{ maxWidth: 640 }}>
          <div className="biz-masthead">
            <div className="biz-masthead-kicker"><Users size={13} /> Add a community</div>
            <h1 className="biz-masthead-title">Thanks!</h1>
          </div>
          <GuestSubmitSuccess
            manageUrl={`${window.location.origin}/guest/community/${guestResult.guest_manage_token}`}
            guestEmail={guestEmail.trim()}
          />
        </div>
      </div>
    );
  }

  const isGuestCreate = !editing && !loggedIn;

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 640 }}>
        <Link to="/communities" style={{ fontSize: 13, color: 'var(--muted)' }}>← All communities</Link>
        <div className="biz-masthead">
          <div className="biz-masthead-kicker"><Users size={13} /> {editing ? 'Edit community' : 'Add a community'}</div>
          <h1 className="biz-masthead-title">{editing ? `Edit ${form.name}` : 'Add a new community'}</h1>
          <p className="biz-masthead-sub">
            A community is just a place marker -- its shuls, mikvah, grocery, restaurants and activities are pulled
            automatically from everything already in the directory nearby. Give it a location so that lookup works.
          </p>
        </div>

        <form onSubmit={submit} className="biz-minyan-form" style={{ maxWidth: 'none' }}>
          {error && <p className="biz-error">{error}</p>}
          <label>Community name
            <input className="gs-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <div className="biz-minyan-form-grid">
            <label>City
              <input className="gs-input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
            </label>
            <label>State / region
              <input className="gs-input" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </label>
          </div>
          <label>Country
            <input className="gs-input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </label>
          <label>Description (optional)
            <textarea className="gs-input" style={{ minHeight: 70 }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <div className="biz-minyan-form-grid">
            <label>Latitude (optional)
              <input className="gs-input" type="number" step="any" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} />
            </label>
            <label>Longitude (optional)
              <input className="gs-input" type="number" step="any" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} />
            </label>
          </div>
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
            Without coordinates, this community's page can't automatically find nearby shuls, mikvahs, groceries,
            restaurants or activities -- it'll just show your description.
          </p>
          {!isGuestCreate && (
            <>
              <label>Eruv status (optional)
                <input className="gs-input" placeholder="e.g. Active, connected to the Peterson Park eruv"
                  value={form.eruv_status} onChange={(e) => setForm({ ...form, eruv_status: e.target.value })} />
              </label>
              <label>Eruv map / hotline link (optional)
                <input className="gs-input" type="url" placeholder="https://..."
                  value={form.eruv_url} onChange={(e) => setForm({ ...form, eruv_url: e.target.value })} />
              </label>
              <label>Eruv map image (optional)
                <UploadFile apiextension="/business/upload" setInvestors={(name) => setForm((f) => ({ ...f, eruv_map_image: name }))} />
                {form.eruv_map_image && <span style={{ fontSize: 12, color: 'var(--muted)' }}>A map image is attached.</span>}
              </label>
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
                Eruv status changes week to week -- visitors will always be shown a reminder to confirm with the
                community's own map or hotline before relying on it.
              </p>

              <div>
                <label style={{ marginBottom: 4 }}>Sub-areas (optional)</label>
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 10px' }}>
                  If this community spans distinct neighborhoods (e.g. different sections of a town), list them here so
                  visitors can narrow the Housing tab to just one. "Match text" is the one spelling of that area's name
                  as it tends to appear in listing addresses.
                </p>
                {subAreaRows.map((row, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <input
                      className="gs-input"
                      placeholder="Name (e.g. North Side)"
                      style={{ flex: 1 }}
                      value={row.name}
                      onChange={(e) => updateSubAreaRow(i, 'name', e.target.value)}
                    />
                    <input
                      className="gs-input"
                      placeholder="Match text (e.g. North Side)"
                      style={{ flex: 1 }}
                      value={row.match}
                      onChange={(e) => updateSubAreaRow(i, 'match', e.target.value)}
                    />
                    <button
                      type="button"
                      className="gs-btn gs-btn-outline gs-btn-sm"
                      onClick={() => removeSubAreaRow(i)}
                      aria-label="Remove sub-area"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={addSubAreaRow}>
                  <Plus size={14} /> Add sub-area
                </button>
              </div>
            </>
          )}

          {isGuestCreate && (
            <GuestContactFields
              email={guestEmail}
              phone={guestPhone}
              onEmailChange={setGuestEmail}
              onPhoneChange={setGuestPhone}
            />
          )}

          <button type="submit" className="gs-btn gs-btn-primary" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create community'}
          </button>
        </form>
      </div>
    </div>
  );
}
