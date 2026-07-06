import React, { useState } from 'react';

const Contact = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const mailto = `mailto:seedling.gary@gmail.com?subject=${encodeURIComponent(`Message from ${name} (${email})`)}&body=${encodeURIComponent(message)}`;

  return (
    <div className="contact-page">
      <div className="gs-container">
        <div className="contact-intro-card">
          <h3>Get in touch</h3>
          <p>
            Want to submit content? Notice something off? Just want to say hi?
            We read every message. You can also reach us directly at{' '}
            <a href="mailto:seedling.gary@gmail.com" style={{ color: 'var(--accent)' }}>
              seedling.gary@gmail.com
            </a>
            .
          </p>
        </div>

        <div className="contact-form-card">
          <h3 style={{ marginBottom: 24 }}>Send a message</h3>

          <div className="gs-form-row-2">
            <div className="gs-field" style={{ margin: 0 }}>
              <label className="gs-label" htmlFor="name">Your name</label>
              <input
                id="name"
                className="gs-input"
                placeholder="Joe Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
            />
          </div>

          <a
            href={mailto}
            className="gs-btn gs-btn-primary"
            style={{ marginTop: 8, display: 'inline-flex' }}
          >
            Send Message
          </a>
        </div>
      </div>
    </div>
  );
};

export default Contact;
