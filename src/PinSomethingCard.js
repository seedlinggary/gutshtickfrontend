import React from 'react';
import { useNavigate } from 'react-router-dom';
import { isLoggedIn } from './auth';

/**
 * The site's main "come contribute" invitation -- shown to EVERY visitor,
 * logged in or not (previously every compose entry point on the site was
 * fully hidden pre-login, so a logged-out visitor saw no invitation to post
 * anywhere). Logged-in clicks always go straight to the composer.
 *
 * `guestReady` marks a `to` whose create page has its own "no account
 * required" guest-contact section (the guest-posting feature, rolled out
 * destination-by-destination) -- those go straight there too, logged in or
 * not. Anything not yet converted keeps the old sign-up detour. Flip this
 * to true as each destination gains guest support instead of touching
 * every call site generically.
 */
export default function PinSomethingCard({ to, prompt, cta, guestReady }) {
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();
  const skipSignup = loggedIn || guestReady;

  const go = () => navigate(skipSignup ? to : `/signup?next=${encodeURIComponent(to)}`);

  return (
    <button className="gs-card pin-something" onClick={go} type="button">
      <div className="gs-card-body pin-something-body">
        <span className="pin-something-mark">＋</span>
        <p className="pin-something-prompt">{prompt}</p>
        <span className="pin-something-cta">{skipSignup ? cta : `${cta} — sign up free`}</span>
      </div>
    </button>
  );
}
