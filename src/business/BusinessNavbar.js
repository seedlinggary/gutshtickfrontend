import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store, Tag, User, Ticket, Handshake, Settings, Plug, Plus, HeartHandshake, Users,
  FerrisWheel, ChevronDown, ShieldCheck, LogOut,
} from 'lucide-react';
import { getEmail, isAdmin, isSuperAdmin, clearAuth } from '../auth';
import NotificationBell from '../NotificationBell';
import AccessibilityToggle from './AccessibilityToggle';
import { LANGUAGES, useLanguage } from './i18n';

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

export default function BusinessNavbar() {
  const navigate = useNavigate();
  // Default tab title for every Business page -- BusinessProfile.js sets its
  // own more specific "<name> | Gut Community" while mounted and restores
  // whatever was here before it on unmount, so this only needs to run once.
  useEffect(() => { document.title = 'Gut Community'; }, []);
  const email = getEmail();
  const boss = isAdmin();
  const superAdmin = isSuperAdmin();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useOutsideClose(accountOpen, setAccountOpen);
  const { lang, setLanguage, t } = useLanguage();

  const go = (path) => { setMobileOpen(false); setAccountOpen(false); navigate(path); };
  const handleSignOut = () => { clearAuth(); navigate('/'); navigate(0); };

  return (
    <nav className="gs-navbar">
      <div className="navbar-inner">
        <button className="navbar-brand" onClick={() => go('/')}>
          Gut <span>Community</span>
        </button>
        <button className="navbar-toggler" aria-label="Toggle navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen((o) => !o)}>
          <span className="navbar-toggler-icon" />
        </button>
        <div className={`navbar-collapse${mobileOpen ? ' show' : ''}`}>
          <ul className="navbar-nav navbar-nav-start">
            <li className="nav-item"><button className="nav-link" onClick={() => go('/')}><Store size={15} /> {t('directory')}</button></li>
            <li className="nav-item"><button className="nav-link nav-link-wrap" onClick={() => go('/community')}><HeartHandshake size={15} /> <span>{t('community')}</span></button></li>
            <li className="nav-item"><button className="nav-link" onClick={() => go('/communities')}><Users size={15} /> {t('findCommunity')}</button></li>
            <li className="nav-item"><button className="nav-link" onClick={() => go('/activities')}><FerrisWheel size={15} /> {t('activities')}</button></li>
            <li className="nav-item"><button className="nav-link" onClick={() => go('/deals')}><Tag size={15} /> {t('deals')}</button></li>
          </ul>
          <ul className="navbar-nav navbar-nav-end">
            <li className="nav-item">
              <select
                className="biz-lang-select" value={lang} aria-label="Language"
                onChange={(e) => setLanguage(e.target.value)}
              >
                {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </li>
            <li className="nav-item"><AccessibilityToggle /></li>
            {email ? (
              <>
                <li className="nav-item navbar-notif"><NotificationBell /></li>
                <li className="nav-item"><button className="nav-link nav-link-pin" onClick={() => go('/business/new')}><Plus size={15} /> {t('listABusiness')}</button></li>
                <li className="nav-item dropdown" ref={accountRef}>
                  <button
                    className="nav-link dropdown-toggle"
                    aria-haspopup="true"
                    aria-expanded={accountOpen}
                    onClick={() => setAccountOpen((o) => !o)}
                  >
                    <User size={15} /> {t('profile')} <ChevronDown size={13} />
                  </button>
                  {accountOpen && (
                    <ul className="dropdown-menu dropdown-menu-end">
                      <li><button className="dropdown-item" onClick={() => go('/my-businesses')}><Store size={14} /> {t('myBusinesses')}</button></li>
                      {superAdmin && <li><button className="dropdown-item" onClick={() => go('/my-deals')}><Ticket size={14} /> {t('myDeals')}</button></li>}
                      <li><button className="dropdown-item" onClick={() => go('/vendor-board')}><Handshake size={14} /> {t('vendorBoard')}</button></li>
                      {(boss || superAdmin) && <li><div className="dropdown-divider" /></li>}
                      {boss && <li><button className="dropdown-item" onClick={() => go('/admin')}><Settings size={14} /> Admin</button></li>}
                      {boss && <li><button className="dropdown-item" onClick={() => go('/admin/integrations')}><Plug size={14} /> Integrations</button></li>}
                      {superAdmin && <li><button className="dropdown-item" onClick={() => go('/superadmin')}><ShieldCheck size={14} /> Super Admin</button></li>}
                      <li><div className="dropdown-divider" /></li>
                      <li><button className="dropdown-item" onClick={() => go('/profile')}><User size={14} /> {t('profile')}</button></li>
                      <li><button className="dropdown-item" onClick={handleSignOut}><LogOut size={14} /> {t('signOut')}</button></li>
                    </ul>
                  )}
                </li>
              </>
            ) : (
              <>
                <li className="nav-item"><button className="nav-link nav-link-pin" onClick={() => go('/signup?next=%2Fbusiness%2Fnew')}><Plus size={15} /> {t('listABusiness')}</button></li>
                <li className="nav-item"><button className="nav-link" onClick={() => go('/signin')}>{t('signIn')}</button></li>
                <li className="nav-item"><button className="nav-link" onClick={() => go('/signup')}>{t('signUp')}</button></li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}
