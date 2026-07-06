import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiRequest from '../ApiRequest';

const GENDERS = [
  { value: '', label: 'Prefer not to say' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const Profile = () => {
  const publicId = localStorage.getItem('public_id');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const [birthdate, setBirthdate] = useState('');
  const [gender, setGender] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');

  useEffect(() => {
    if (!publicId) { setLoading(false); return; }
    apiRequest('GET', null, `/user/${publicId}`)
      .then((u) => {
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
        birthdate: birthdate || null,
        gender: gender || null,
        location_country: country || null,
        location_city: city || null,
      }, '/user/profile');
      setSaved(true);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Could not save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="auth-page">
        <div className="gs-loading"><div className="gs-spinner" /> Loading…</div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <span className="auth-brand">The Good Shtick</span>
        <h2 className="auth-title">Profile settings</h2>
        <p className="auth-subtitle">
          Everything below is completely optional. It's only ever used to show you more
          relevant ads (e.g. things near you) — it's never required and you can clear it anytime.
        </p>

        {error && <div className="gs-error-box">{error}</div>}
        {saved && (
          <div className="gs-success-box" style={{ marginBottom: 16 }}>
            Saved! Your profile has been updated.
          </div>
        )}

        <form onSubmit={handleSave}>
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

        <div className="auth-footer">
          <Link to="/">Back to feed</Link>
        </div>
      </div>
    </div>
  );
};

export default Profile;
