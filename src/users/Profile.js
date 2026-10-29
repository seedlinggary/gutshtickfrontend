import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check, Newspaper, ThumbsUp, MessageCircle, MessagesSquare, Briefcase, Heart, ClipboardList, Settings } from 'lucide-react';
import apiRequest from '../ApiRequest';
import timeAgo from '../utils/timeAgo';
import { siteUrl } from '../siteMode';

const GENDERS = [
  { value: '', label: 'Prefer not to say' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const LINE_OF_WORK_OPTIONS = [
  { value: '', label: "Doesn't matter" },
  { value: 'tech', label: 'Tech' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'education', label: 'Education' },
  { value: 'sales_marketing', label: 'Sales & Marketing' },
  { value: 'finance_accounting', label: 'Finance & Accounting' },
  { value: 'skilled_trade', label: 'Skilled Trade' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'legal', label: 'Legal' },
  { value: 'government', label: 'Government' },
  { value: 'self_employed', label: 'Self-Employed' },
  { value: 'student', label: 'Student' },
  { value: 'other', label: 'Other' },
];

const StatusBadge = ({ v }) => (
  <span className={`admin-badge ${v === true ? 'approved' : v === false ? 'rejected' : 'pending'}`}>
    {v === true ? 'Approved' : v === false ? 'Rejected' : 'Pending'}
  </span>
);

function PunchCard() {
  const [streak, setStreak] = useState(null);

  useEffect(() => {
    apiRequest('GET', null, '/user/me/streak').then(setStreak).catch(() => {});
  }, []);

  if (!streak) return null;

  const slots = Array.from({ length: 7 }, (_, i) => i < streak.current_streak);
  const toNextStamp = Math.max(0, 5 - streak.current_streak);

  return (
    <div className="punch-card">
      <div className="punch-card-head">
        <span className="card-kind">Your ticket book</span>
        {streak.is_regular && <span className="admin-badge approved">Regular</span>}
      </div>
      <h3 style={{ fontSize: 19, marginTop: 4 }}>
        {streak.current_streak > 0
          ? `${streak.current_streak}-day streak`
          : "Start today's streak"}
      </h3>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
        {streak.is_regular
          ? `${streak.distinct_days} days on the board, and counting.`
          : toNextStamp > 0
            ? `${toNextStamp} more day${toNextStamp === 1 ? '' : 's'} for Regular status.`
            : 'Come back tomorrow to keep it going.'}
      </p>
      <div className="punch-row">
        {slots.map((filled, i) => (
          <div key={i} className={`punch${filled ? ' filled' : ''}`}>{filled ? <Check size={14} /> : i + 1}</div>
        ))}
      </div>
    </div>
  );
}

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
      <PunchCard />
      <section style={{ marginBottom: 28 }}>
        <h3 className="shtick-caption" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Newspaper size={16} /> Your Feed Posts ({shticks.length})</h3>
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
            <div className="admin-card-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><ThumbsUp size={13} /> {s.like_count} · <MessageCircle size={13} /> {s.comment_count}</div>
          </div>
        ))}
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 className="shtick-caption" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><MessagesSquare size={16} /> Your Hock Posts ({hockPosts.length})</h3>
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
            <div className="admin-card-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><ThumbsUp size={13} /> {p.like_count} · <MessageCircle size={13} /> {p.comment_count}</div>
          </div>
        ))}
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 className="shtick-caption" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Briefcase size={16} /> Your Job Board Posts ({tachlisPosts.length})</h3>
        {tachlisPosts.length === 0 && <p className="admin-empty">No Job Board posts yet.</p>}
        {tachlisPosts.map((t) => (
          <div key={t.id} className="admin-card" style={{ borderLeft: '4px solid #6366f1' }}>
            <div className="admin-card-top">
              <StatusBadge v={t.approved_to_publish} />
              <span className="admin-date">{timeAgo(t.pub_date)}</span>
            </div>
            <a
              href={siteUrl('money', `/tachlis/post/${t.id}`)} target="_blank" rel="noopener noreferrer"
              className="admin-caption" style={{ display: 'block', marginTop: 4 }}
            >
              {t.title}
            </a>
          </div>
        ))}
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 className="shtick-caption" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><MessageCircle size={16} /> Your Comments ({comments.length})</h3>
        {comments.length === 0 && <p className="admin-empty">No comments yet.</p>}
        {comments.map((c) => (
          <div key={`${c.source}-${c.id}`} className="admin-card comment-card">
            <div className="admin-card-top">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {c.source === 'hock' ? <><MessagesSquare size={13} /> Hock</> : <><Newspaper size={13} /> Feed</>}
              </span>
              <span className="admin-date">{timeAgo(c.pub_date)}</span>
            </div>
            <p style={{ margin: '6px 0' }}>{c.text}</p>
            {c.approved_to_publish === false && <span className="admin-badge rejected">Hidden</span>}
          </div>
        ))}
      </section>

      <section>
        <h3 className="shtick-caption" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Heart size={16} /> Your Likes ({likes.length})</h3>
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
  const [profileArea, setProfileArea] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [familySize, setFamilySize] = useState('');
  const [lineOfWork, setLineOfWork] = useState('');
  const [weeklyDigestEnabled, setWeeklyDigestEnabled] = useState(true);
  const [cvSummary, setCvSummary] = useState('');
  const [cvContact, setCvContact] = useState('');
  const [openToWork, setOpenToWork] = useState(false);

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
        setProfileArea(u.profile_area || '');
        setBudgetMin(u.budget_min ?? '');
        setBudgetMax(u.budget_max ?? '');
        setFamilySize(u.family_size ?? '');
        setLineOfWork(u.line_of_work || '');
        setWeeklyDigestEnabled(u.weekly_digest_enabled !== false);
        setCvSummary(u.cv_summary || '');
        setCvContact(u.cv_contact || '');
        setOpenToWork(!!u.open_to_work);
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
        profile_area: profileArea || null,
        budget_min: budgetMin === '' ? null : budgetMin,
        budget_max: budgetMax === '' ? null : budgetMax,
        family_size: familySize === '' ? null : familySize,
        line_of_work: lineOfWork || null,
        weekly_digest_enabled: weeklyDigestEnabled,
        cv_summary: cvSummary || null,
        cv_contact: cvContact || null,
        open_to_work: openToWork,
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

        <p className="auth-subtitle" style={{ marginTop: 20 }}>
          Also optional: this drives your personal feed (Area, budget, family size and line of
          work from one profile pull together one stream of homes, jobs and businesses from
          across every GUT site) and the weekly email below — nothing here is ever required.
        </p>

        <div className="auth-field">
          <label className="auth-label" htmlFor="profileArea">Area you're focused on</label>
          <input
            id="profileArea"
            className="auth-input"
            type="text"
            placeholder="e.g. Beit Shemesh or RBS Gimmel"
            value={profileArea}
            onChange={(e) => setProfileArea(e.target.value)}
          />
        </div>

        <div className="auth-field" style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label className="auth-label" htmlFor="budgetMin">Budget min</label>
            <input
              id="budgetMin"
              className="auth-input"
              type="number"
              min="0"
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="auth-label" htmlFor="budgetMax">Budget max</label>
            <input
              id="budgetMax"
              className="auth-input"
              type="number"
              min="0"
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
            />
          </div>
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="familySize">Family size</label>
          <input
            id="familySize"
            className="auth-input"
            type="number"
            min="1"
            value={familySize}
            onChange={(e) => setFamilySize(e.target.value)}
          />
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="lineOfWork">Line of work</label>
          <select
            id="lineOfWork"
            className="auth-input"
            value={lineOfWork}
            onChange={(e) => setLineOfWork(e.target.value)}
          >
            {LINE_OF_WORK_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="auth-field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            id="weeklyDigest"
            type="checkbox"
            checked={weeklyDigestEnabled}
            onChange={(e) => setWeeklyDigestEnabled(e.target.checked)}
          />
          <label className="auth-label" htmlFor="weeklyDigest" style={{ margin: 0 }}>
            Email me a weekly roundup (new matches, what's new nearby, price moves on things I've saved)
          </label>
        </div>

        <p className="auth-subtitle" style={{ marginTop: 20 }}>
          Job profile (optional): a simple CV so you can one-tap apply to Job Board posts, and an
          opt-in card employers can browse. Your account email is never shown -- only the contact
          you put here, and only once "Open to work" is checked.
        </p>

        <div className="auth-field">
          <label className="auth-label" htmlFor="cvSummary">CV summary</label>
          <textarea
            id="cvSummary"
            className="auth-input"
            style={{ minHeight: 90 }}
            placeholder="e.g. 5 years as a bookkeeper, QuickBooks + Excel, available immediately"
            value={cvSummary}
            onChange={(e) => setCvSummary(e.target.value)}
            maxLength={4000}
          />
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="cvContact">Contact for employers</label>
          <input
            id="cvContact"
            className="auth-input"
            type="text"
            placeholder="Email, phone, or WhatsApp -- shown only if you're open to work"
            value={cvContact}
            onChange={(e) => setCvContact(e.target.value)}
          />
        </div>

        <div className="auth-field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            id="openToWork"
            type="checkbox"
            checked={openToWork}
            onChange={(e) => setOpenToWork(e.target.checked)}
          />
          <label className="auth-label" htmlFor="openToWork" style={{ margin: 0 }}>
            List me on the "open to work" card for employers to browse
          </label>
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
            <ClipboardList size={14} /> My Activity
          </button>
          <button
            className={`admin-tab${tab === 'settings' ? ' active' : ''}`}
            onClick={() => setTab('settings')}
          >
            <Settings size={14} /> Account Settings
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
