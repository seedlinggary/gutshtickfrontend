import React, { useState } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import apiRequest from '../ApiRequest';

const SignUp = () => {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    profile_name: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { paymentcanceled } = useParams();

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const missing = Object.entries(form).filter(([, v]) => !v.trim());
    if (missing.length) {
      setError('Please fill in all fields.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await apiRequest('POST', form, '/user');
      navigate('/signin');
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Sign-up failed. That email or profile name may already be taken.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <span className="auth-brand">The Good Shtick</span>
        <h2 className="auth-title">Create an account</h2>
        <p className="auth-subtitle">Join the community and start sharing good stuff.</p>

        {paymentcanceled && (
          <div className="gs-error-box">Payment was cancelled. Please try again.</div>
        )}
        {error && <div className="gs-error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="gs-form-row-2">
            <div className="auth-field" style={{ margin: 0 }}>
              <label className="auth-label" htmlFor="first_name">First name</label>
              <input id="first_name" className="auth-input" placeholder="Joe" value={form.first_name} onChange={set('first_name')} />
            </div>
            <div className="auth-field" style={{ margin: 0 }}>
              <label className="auth-label" htmlFor="last_name">Last name</label>
              <input id="last_name" className="auth-input" placeholder="Smith" value={form.last_name} onChange={set('last_name')} />
            </div>
          </div>

          <div className="auth-field" style={{ marginTop: 14 }}>
            <label className="auth-label" htmlFor="email">Email</label>
            <input id="email" className="auth-input" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} autoComplete="email" />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="profile_name">Profile name</label>
            <input id="profile_name" className="auth-input" placeholder="e.g. CoolGuy99" value={form.profile_name} onChange={set('profile_name')} />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="password">Password</label>
            <input id="password" className="auth-input" type="password" placeholder="At least 6 characters" value={form.password} onChange={set('password')} autoComplete="new-password" />
          </div>

          <button
            type="submit"
            className="gs-btn gs-btn-primary gs-btn-block"
            style={{ marginTop: 4 }}
            disabled={loading}
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/signin">Sign In</Link>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
