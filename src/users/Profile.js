import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import timeAgo from '../utils/timeAgo';

const GENDERS = [
  { value: '', label: 'Prefer not to say' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const StatusBadge = ({ v }) => (
  <span className={`admin-badge ${v === true ? 'approved' : v === false ? 'rejected' : 'pending'}`}>
    {v === true ? 'Approved' : v === false ? 'Rejected' : 'Pending'}
  </span>
);

function MyActivity() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activity, setActivity] = useState(null);

  useEffect(() => {
    apiRequest('GET', null, '/user/me/activity')
      .then(setActivity)
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not load your activity.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="gs-loading"><div className="gs-spinner" /> Loading…</div>;
  }
  if (error) {
    return <div className="gs-error-box">{error}</div>;
  }
  if (!activity) return null;

  const { shticks, hock_posts: hockPosts, tachlis_posts: tachlisPosts, comments, likes } = activity;

  return (
    <div className="profile-activity">
      <section style={{ marginBottom: 28 }}>
        <h3 className="shtick-caption">📰 Your Feed Posts ({shticks.length})</h3>
        {shticks.length === 0 && <p className="admin-empty">No feed posts yet.</p>}
        {shticks.map((s) => (
          <div key={s.id} className="admin-card">
            <div className="admin-card-top">
              <StatusBadge v={s.approved_to_publish} />
              <span className="admin-date">{timeAgo(s.pub_date)}</span>
            </div>
            <Link to={`/post/${s.id}`} className="admin-caption" style={{ display: 'block', marginTop: 4 }}>
              {s.caption}
            </Link>
            <div className="admin-card-meta">👍 {s.like_count} · 💬 {s.comment_count}</div>
          </div>
        ))}
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 className="shtick-caption">🗣 Your Hock Posts ({hockPosts.length})</h3>
        {hockPosts.length === 0 && <p className="admin-empty">No Hock posts yet.</p>}
        {hockPosts.map((p) => (
          <div key={p.id} className="admin-card" style={{ borderLeft: '4px solid #6366f1' }}>
            <div className="admin-card-top">
              <span className={`admin-badge ${p.approved_to_publish ? 'approved' : 'rejected'}`}>
                {p.approved_to_publish ? 'Visible' : 'Hidden'}
              </span>
              <span className="admin-date">{timeAgo(p.pub_date)}</span>
            </div>
            <Link to={`/hock/post/${p.id}`} className="admin-caption" style={{ display: 'block', marginTop: 4 }}>
              {p.title}
            </Link>
            <div className="admin-card-meta">👍 {p.like_count} · 💬 {p.comment_count}</div>
          </div>
        ))}
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 className="shtick-caption">💼 Your Tachlis Posts ({tachlisPosts.length})</h3>
        {tachlisPosts.length === 0 && <p className="admin-empty">No Tachlis posts yet.</p>}
        {tachlisPosts.map((t) => (
          <div key={t.id} className="admin-card" style={{ borderLeft: '4px solid #6366f1' }}>
            <div className="admin-card-top">
              <StatusBadge v={t.approved_to_publish} />
              <span className="admin-date">{timeAgo(t.pub_date)}</span>
            </div>
            <Link to={`/tachlis/post/${t.id}`} className="admin-caption" style={{ display: 'block', marginTop: 4 }}>
              {t.title}
            </Link>
          </div>
        ))}
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 className="shtick-caption">💬 Your Comments ({comments.length})</h3>
        {comments.length === 0 && <p className="admin-empty">No comments yet.</p>}
        {comments.map((c) => (
          <div key={`${c.source}-${c.id}`} className="admin-card comment-card">
            <div className="admin-card-top">
              <span>{c.source === 'hock' ? '🗣 Hock' : '📰 Feed'}</span>
              <span className="admin-date">{timeAgo(c.pub_date)}</span>
            </div>
            <p style={{ margin: '6px 0' }}>{c.text}</p>
            {c.approved_to_publish === false && <span className="admin-badge rejected">Hidden</span>}
          </div>
        ))}
      </section>

      <section>
        <h3 className="shtick-caption">❤️ Your Likes ({likes.length})</h3>
        {likes.length === 0 && <p className="admin-empty">No likes yet.</p>}
        {likes.map((l, i) => (
          <div key={i} className="admin-card" style={{ padding: '10px 16px' }}>
            <span>
              {l.source === 'feed' && <Link to={`/post/${l.target_id}`}>Feed post #{l.target_id}</Link>}
              {l.source === 'hock_post' && <Link to={`/hock/post/${l.target_id}`}>Hock post #{l.target_id}</Link>}
              {l.source === 'hock_comment' && <span>Hock comment #{l.target_id}</span>}
            </span>
            <span className="admin-date" style={{ marginLeft: 10 }}>{timeAgo(l.pub_date)}</span>
          </div>
        ))}
      </section>
    </div>
  );
}

function AccountSettings() {
  const publicId = localStorage.getItem('public_id');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profileName, setProfileName] = useState('');
  const [email, setEmail] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [gender, setGender] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');

  useEffect(() => {
    if (!publicId) { setLoading(false); return; }
    apiRequest('GET', null, `/user/${publicId}`)
      .then((u) => {
        setFirstName(u.first_name || '');
        setLastName(u.last_name || '');
        setProfileName(u.profile_name || '');
        setEmail(u.email || '');
        setBirthdate(u.birthdate || '');
        setGender(u.gender || '');
        setCountry(u.location_country || '');
        setCity(u.location_city || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [publicId]);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      await apiRequest('PUT', {
        first_name: firstName,
        last_name: lastName,
        profile_name: profileName,
        email,
        birthdate: birthdate || null,
        gender: gender || null,
        location_country: country || null,
        location_city: city || null,
      }, '/user/profile');
      if (profileName) localStorage.setItem('profile_name', profileName);
      if (email) localStorage.setItem('email', email);
      setSaved(true);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Could not save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="gs-loading"><div className="gs-spinner" /> Loading…</div>;
  }

  return (
    <>
      {error && <div className="gs-error-box">{error}</div>}
      {saved && (
        <div className="gs-success-box" style={{ marginBottom: 16 }}>
          Saved! Your profile has been updated.
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="auth-field">
          <label className="auth-label" htmlFor="firstName">First name</label>
          <input
            id="firstName"
            className="auth-input"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="lastName">Last name</label>
          <input
            id="lastName"
            className="auth-input"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="profileName">Display name</label>
          <input
            id="profileName"
            className="auth-input"
            type="text"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
          />
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="email">Email</label>
          <input
            id="email"
            className="auth-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <p className="auth-subtitle" style={{ marginTop: 20 }}>
          Everything below is completely optional. It's only ever used to show you more
          relevant ads (e.g. things near you) — it's never required and you can clear it anytime.
        </p>

        <div className="auth-field">
          <label className="auth-label" htmlFor="birthdate">Birthdate</label>
          <input
            id="birthdate"
            className="auth-input"
            type="date"
            value={birthdate}
            onChange={(e) => setBirthdate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
          />
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="gender">Gender</label>
          <select
            id="gender"
            className="auth-input"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            {GENDERS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="country">Country</label>
          <input
            id="country"
            className="auth-input"
            type="text"
            placeholder="e.g. United States"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            autoComplete="country-name"
          />
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="city">City</label>
          <input
            id="city"
            className="auth-input"
            type="text"
            placeholder="e.g. Austin"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            autoComplete="address-level2"
          />
        </div>

        <button
          type="submit"
          className="gs-btn gs-btn-primary gs-btn-block"
          style={{ marginTop: 8 }}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </>
  );
}

const Profile = () => {
  const [tab, setTab] = useState('activity');

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 640 }}>
        <span className="auth-brand">Gut Shtick</span>
        <h2 className="auth-title">Your Profile</h2>

        <div className="admin-tabs" style={{ marginBottom: 20 }}>
          <button
            className={`admin-tab${tab === 'activity' ? ' active' : ''}`}
            onClick={() => setTab('activity')}
          >
            📋 My Activity
          </button>
          <button
            className={`admin-tab${tab === 'settings' ? ' active' : ''}`}
            onClick={() => setTab('settings')}
          >
            ⚙️ Account Settings
          </button>
        </div>

        {tab === 'activity' ? <MyActivity /> : <AccountSettings />}

        <div className="auth-footer">
          <Link to="/">Back to feed</Link>
        </div>
      </div>
    </div>
  );
};

export default Profile;
