import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import base64 from 'base-64';
import { getEmail, clearAuth, saveAuth } from '../auth';

const SignIn = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next');

  const storedEmail = getEmail();

  const handleSignOut = () => {
    clearAuth();
    navigate(0);
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const headers = new Headers();
      headers.append('Authorization', 'Basic ' + base64.encode(`${email}:${password}`));
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'}/login`, { method: 'GET', headers });
      const data = res.ok ? await res.json() : null;
      if (!res.ok || !data) {
        setError('Invalid email or password. Please try again.');
        return;
      }
      saveAuth(data, email);
      navigate(next || '/');
    } catch (_) {
      setError('Unable to connect. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  if (storedEmail) {
    const role = localStorage.getItem('role') || 'user';
    const roleBadge = { super_admin: '⭐ Super Admin', admin: '🛡 Admin', user: 'User', viewer: 'Viewer' }[role] || 'User';
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <span className="auth-brand">Gut Shtick</span>
          <h2 className="auth-title">You're signed in</h2>
          <p className="auth-subtitle">Signed in as <strong>{storedEmail}</strong></p>
          <div style={{ display: 'inline-block', padding: '4px 12px', background: 'var(--accent)', borderRadius: 20, fontSize: 13, color: '#fff', marginBottom: 16 }}>
            {roleBadge}
          </div>
          <button className="gs-btn gs-btn-danger gs-btn-block" onClick={handleSignOut}>
            Sign Out
          </button>
          <div className="auth-footer">
            <Link to="/">Back to feed</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <span className="auth-brand">Gut Shtick</span>
        <h2 className="auth-title">Welcome back</h2>
        <p className="auth-subtitle">Sign in to your account to continue.</p>

        {error && <div className="gs-error-box">{error}</div>}

        <form onSubmit={handleSignIn}>
          <div className="auth-field">
            <label className="auth-label" htmlFor="email">Email</label>
            <input
              id="email"
              className="auth-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label className="auth-label" htmlFor="password" style={{ margin: 0 }}>Password</label>
              <Link to="/forgotpassword" className="auth-forgot">Forgot password?</Link>
            </div>
            <input
              id="password"
              className="auth-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="gs-btn gs-btn-primary gs-btn-block"
            style={{ marginTop: 8 }}
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account?{' '}
          <Link to={next ? `/signup?next=${encodeURIComponent(next)}` : '/signup'}>Sign Up</Link>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
