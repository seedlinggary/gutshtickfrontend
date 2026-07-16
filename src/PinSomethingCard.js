import React from 'react';
import { useNavigate } from 'react-router-dom';
import { isLoggedIn } from './auth';

/**
 * The site's main "come contribute" invitation -- shown to EVERY visitor,
 * logged in or not (previously every compose entry point on the site was
 * fully hidden pre-login, so a logged-out visitor saw no invitation to post
 * anywhere). Logged-in clicks go straight to the composer; logged-out
 * clicks go to sign-up instead of the card just not existing.
 */
export default function PinSomethingCard({ to, prompt, cta }) {
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();

  const go = () => navigate(loggedIn ? to : `/signup?next=${encodeURIComponent(to)}`);

  return (
    <button className="gs-card pin-something" onClick={go} type="button">
      <div className="gs-card-body pin-something-body">
        <span className="pin-something-mark">＋</span>
        <p className="pin-something-prompt">{prompt}</p>
        <span className="pin-something-cta">{loggedIn ? cta : `${cta} — sign up free`}</span>
      </div>
    </button>
  );
}
