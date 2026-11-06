import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import nonprofitApiRequest, { setStaffToken } from './nonprofitApi';
import './nonprofit.css';

/** Deliberately separate from the platform's own /signin -- a nonprofit
 * staff login is a wholly different account system (see the backend's
 * NonprofitStaff docstring). Generic "Invalid email or password" error
 * either way -- no "no such email" vs "wrong password" leak, same
 * no-user-enumeration convention the system this is ported from uses. */
export default function NonprofitStaffLogin({ subdomain }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    nonprofitApiRequest('POST', { email, password }, `/nonprofit/by-subdomain/${subdomain}/staff/login`)
      .then((data) => {
        setStaffToken(data.token);
        navigate('/staff');
      })
      .catch((err) => setError(typeof err === 'string' ? err : 'Invalid email or password.'))
      .finally(() => setBusy(false));
  };

  return (
    <div className="np-auth-shell">
      <form className="gs-card np-auth-card" onSubmit={submit}>
        <h2 style={{ marginTop: 0 }}>Staff sign in</h2>
        {error && <p className="np-auth-error">{error}</p>}
        <div className="gs-field">
          <div className="gs-label">Email</div>
          <input className="gs-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </div>
        <div className="gs-field">
          <div className="gs-label">Password</div>
          <input className="gs-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button type="submit" className="gs-btn" disabled={busy} style={{ width: '100%', marginTop: 8 }}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
