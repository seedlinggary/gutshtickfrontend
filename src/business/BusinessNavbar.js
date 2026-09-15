import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEmail, isAdmin, isSuperAdmin, clearAuth } from '../auth';
import NotificationBell from '../NotificationBell';

export default function BusinessNavbar() {
  const navigate = useNavigate();
  const email = getEmail();
  const boss = isAdmin();
  const superAdmin = isSuperAdmin();
  const [mobileOpen, setMobileOpen] = useState(false);

  const go = (path) => { setMobileOpen(false); navigate(path); };
  const handleSignOut = () => { clearAuth(); navigate('/'); navigate(0); };

  return (
    <nav className="gs-navbar">
      <div className="navbar-inner">
        <button className="navbar-brand" onClick={() => go('/')}>
          Good Shtick <span>Business</span>
        </button>
        <button className="navbar-toggler" aria-label="Toggle navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen((o) => !o)}>
          <span className="navbar-toggler-icon" />
        </button>
        <div className={`navbar-collapse${mobileOpen ? ' show' : ''}`}>
          <ul className="navbar-nav navbar-nav-start">
            <li className="nav-item"><button className="nav-link" onClick={() => go('/')}>🏪 Directory</button></li>
            <li className="nav-item"><button className="nav-link" onClick={() => go('/deals')}>🏷️ Deals</button></li>
            {email && (
              <li className="nav-item"><button className="nav-link" onClick={() => go('/my-businesses')}>My Businesses</button></li>
            )}
            {boss && (
              <li className="nav-item"><button className="nav-link" onClick={() => go('/admin')}>⚙ Admin</button></li>
            )}
            {superAdmin && (
              <li className="nav-item"><button className="nav-link" onClick={() => go('/superadmin')}>Super Admin</button></li>
            )}
          </ul>
          <ul className="navbar-nav navbar-nav-end">
            {email ? (
              <>
                <li className="nav-item navbar-notif"><NotificationBell /></li>
                <li className="nav-item"><button className="nav-link nav-link-pin" onClick={() => go('/business/new')}>＋ List a Business</button></li>
                <li className="nav-item"><button className="nav-link" onClick={() => go('/profile')}>Profile</button></li>
                <li className="nav-item"><button className="nav-link" onClick={handleSignOut}>Sign Out</button></li>
              </>
            ) : (
              <>
                <li className="nav-item"><button className="nav-link nav-link-pin" onClick={() => go('/signup?next=%2Fbusiness%2Fnew')}>＋ List a Business</button></li>
                <li className="nav-item"><button className="nav-link" onClick={() => go('/signin')}>Sign In</button></li>
                <li className="nav-item"><button className="nav-link" onClick={() => go('/signup')}>Sign Up</button></li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}
