import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home, Users, BookOpen, User, Plus, Settings, Plug, ShieldCheck, LogOut, ChevronDown, Heart, Calculator, Bell, Inbox,
} from 'lucide-react';
import { getEmail, isAdmin, isSuperAdmin, clearAuth } from '../auth';
import NotificationBell from '../NotificationBell';
import AccessibilityToggle from '../business/AccessibilityToggle';

function useOutsideClose(open, setOpen) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKeyDown = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, setOpen]);
  return ref;
}

export default function EstatesNavbar() {
  const navigate = useNavigate();
  useEffect(() => { document.title = 'Gut Estates'; }, []);
  const email = getEmail();
  const boss = isAdmin();
  const superAdmin = isSuperAdmin();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useOutsideClose(accountOpen, setAccountOpen);

  const go = (path) => { setMobileOpen(false); setAccountOpen(false); navigate(path); };
  const handleSignOut = () => { clearAuth(); navigate('/'); navigate(0); };

  return (
    <nav className="gs-navbar">
      <div className="navbar-inner">
        <button className="navbar-brand" onClick={() => go('/')} data-no-translate>
          Gut <span>Estates</span>
        </button>
        <button className="navbar-toggler" aria-label="Toggle navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen((o) => !o)}>
          <span className="navbar-toggler-icon" />
        </button>
        <div className={`navbar-collapse${mobileOpen ? ' show' : ''}`}>
          <ul className="navbar-nav navbar-nav-start">
            <li className="nav-item"><button className="nav-link" onClick={() => go('/')}><Home size={15} /> Buy &amp; Rent</button></li>
            <li className="nav-item"><button className="nav-link" onClick={() => go('/group-buy')}><Users size={15} /> Group Buy</button></li>
            <li className="nav-item"><button className="nav-link" onClick={() => go('/calculators')}><Calculator size={15} /> Calculators</button></li>
            <li className="nav-item"><button className="nav-link" onClick={() => go('/learn')}><BookOpen size={15} /> Learn</button></li>
          </ul>
          <ul className="navbar-nav navbar-nav-end">
            <li className="nav-item"><AccessibilityToggle /></li>
            {email ? (
              <>
                <li className="nav-item navbar-notif"><NotificationBell /></li>
                <li className="nav-item"><button className="nav-link nav-link-pin" onClick={() => go('/listings/new')}><Plus size={15} /> List a Property</button></li>
                <li className="nav-item dropdown" ref={accountRef}>
                  <button
                    className="nav-link dropdown-toggle"
                    aria-haspopup="true"
                    aria-expanded={accountOpen}
                    onClick={() => setAccountOpen((o) => !o)}
                  >
                    <User size={15} /> Profile <ChevronDown size={13} />
                  </button>
                  {accountOpen && (
                    <ul className="dropdown-menu dropdown-menu-end">
                      <li><button className="dropdown-item" onClick={() => go('/my-listings')}><Home size={14} /> My Listings</button></li>
                      <li><button className="dropdown-item" onClick={() => go('/my-listings?tab=saved')}><Heart size={14} /> Saved Listings</button></li>
                      <li><button className="dropdown-item" onClick={() => go('/my-group-buys')}><Users size={14} /> My Group Buys</button></li>
                      <li><button className="dropdown-item" onClick={() => go('/alerts')}><Bell size={14} /> My Alerts</button></li>
                      <li><button className="dropdown-item" onClick={() => go('/my-feed')}><Inbox size={14} /> My Feed</button></li>
                      {(boss || superAdmin) && <li><div className="dropdown-divider" /></li>}
                      {boss && <li><button className="dropdown-item" onClick={() => go('/admin')}><Settings size={14} /> Admin</button></li>}
                      {boss && <li><button className="dropdown-item" onClick={() => go('/admin/integrations')}><Plug size={14} /> Integrations</button></li>}
                      {superAdmin && <li><button className="dropdown-item" onClick={() => go('/superadmin')}><ShieldCheck size={14} /> Super Admin</button></li>}
                      <li><div className="dropdown-divider" /></li>
                      <li><button className="dropdown-item" onClick={() => go('/profile')}><User size={14} /> Profile</button></li>
                      <li><button className="dropdown-item" onClick={handleSignOut}><LogOut size={14} /> Sign Out</button></li>
                    </ul>
                  )}
                </li>
              </>
            ) : (
              <>
                <li className="nav-item"><button className="nav-link nav-link-pin" onClick={() => go('/signup?next=%2Flistings%2Fnew')}><Plus size={15} /> List a Property</button></li>
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
