import React, { useState } from 'react';
import apiRequest from './ApiRequest';

const Contact = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null); // { ok: bool, text: string }

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setStatus({ ok: false, text: 'Please fill in your name, email, and message.' });
      return;
    }
    setSending(true);
    setStatus(null);
    try {
      await apiRequest('POST', { name: name.trim(), email: email.trim(), message: message.trim() }, '/contact');
      setStatus({ ok: true, text: "Thanks — your message has been sent. We'll get back to you soon." });
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setStatus({ ok: false, text: typeof err === 'string' ? err : 'Something went wrong sending your message. Please try again.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="contact-page">
      <div className="gs-container">
        <div className="contact-intro-card">
          <h3>Get in touch</h3>
          <p>
            Want to submit content? Notice something off? Just want to say hi?
            We read every message. You can also reach us directly at{' '}
            <a href="mailto:orders@kolstock.com" style={{ color: 'var(--accent)' }}>
              orders@kolstock.com
            </a>
            .
          </p>
        </div>

        <div className="contact-form-card">
          <h3 style={{ marginBottom: 24 }}>Send a message</h3>

          <form onSubmit={submit}>
            {status && (
              <div className={status.ok ? 'gs-success-box' : 'gs-error-box'} style={{ marginBottom: 16 }}>
                {status.text}
              </div>
            )}
            <div className="gs-form-row-2">
              <div className="gs-field" style={{ margin: 0 }}>
                <label className="gs-label" htmlFor="name">Your name</label>
                <input
                  id="name"
                  className="gs-input"
                  placeholder="Joe Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={sending}
                />
              </div>
              <div className="gs-field" style={{ margin: 0 }}>
                <label className="gs-label" htmlFor="email">Your email</label>
                <input
                  id="email"
                  className="gs-input"
                  type="email"
                  placeholder="joe@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={sending}
                />
              </div>
            </div>

            <div className="gs-field" style={{ marginTop: 16 }}>
              <label className="gs-label" htmlFor="message">Message</label>
              <textarea
                id="message"
                className="gs-input gs-textarea"
                placeholder="What's on your mind?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                disabled={sending}
              />
            </div>

            <button
              type="submit"
              className="gs-btn gs-btn-primary"
              style={{ marginTop: 8, display: 'inline-flex' }}
              disabled={sending}
            >
              {sending ? 'Sending…' : 'Send Message'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Contact;
