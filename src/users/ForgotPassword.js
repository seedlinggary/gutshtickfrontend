import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import apiRequest from '../ApiRequest';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState('email');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async (e) => {
    e.preventDefault();
    if (!email) { setError('Please enter your email.'); return; }
    setError('');
    setLoading(true);
    try {
      await apiRequest('POST', { email }, '/reset_password/');
      setStep('reset');
    } catch (_) {
      setError('Could not send a reset email. Please check the address and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!resetCode || !newPassword) { setError('Please fill in all fields.'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setError('');
    setLoading(true);
    try {
      await apiRequest('POST', { email, resetCode, password: newPassword }, '/reset_password/');
      setStep('done');
    } catch (_) {
      setError('Reset failed. The code may be incorrect or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <span className="auth-brand">Gut Shtick</span>
        <h2 className="auth-title">Reset password</h2>

        {step === 'done' ? (
          <>
            <p className="auth-subtitle" style={{ color: 'var(--success)' }}>
              Password reset successfully!
            </p>
            <Link to="/signin" className="gs-btn gs-btn-primary gs-btn-block" style={{ marginTop: 8 }}>
              Sign In
            </Link>
          </>
        ) : step === 'email' ? (
          <>
            <p className="auth-subtitle">
              Enter your email and we'll send you a reset code.
            </p>
            {error && <div className="gs-error-box">{error}</div>}
            <form onSubmit={handleSendCode}>
              <div className="auth-field">
                <label className="auth-label" htmlFor="email">Email</label>
                <input id="email" className="auth-input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <button type="submit" className="gs-btn gs-btn-primary gs-btn-block" disabled={loading}>
                {loading ? 'Sending…' : 'Send Reset Code'}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="auth-subtitle">
              Check your email for the reset code. It expires in 15 minutes.
            </p>
            {error && <div className="gs-error-box">{error}</div>}
            <form onSubmit={handleReset}>
              <div className="auth-field">
                <label className="auth-label" htmlFor="code">Reset code</label>
                <input id="code" className="auth-input" placeholder="Paste code here" value={resetCode} onChange={(e) => setResetCode(e.target.value)} />
              </div>
              <div className="auth-field">
                <label className="auth-label" htmlFor="np">New password</label>
                <input id="np" className="auth-input" type="password" placeholder="At least 6 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <button type="submit" className="gs-btn gs-btn-primary gs-btn-block" disabled={loading}>
                {loading ? 'Resetting…' : 'Set New Password'}
              </button>
            </form>
          </>
        )}

        <div className="auth-footer">
          <Link to="/signin">Back to Sign In</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
