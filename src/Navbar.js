import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import useFetch from './UseFetch';
import { fetchCategory, fetchData } from './actions';
import { getEmail, getToken, isAdmin, isSuperAdmin, clearAuth } from './auth';
import NotificationBell from './NotificationBell';

function useOutsideClose(open, setOpen) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, setOpen]);
  return ref;
}

function AppNavbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const email = getEmail();
  const cookie = getToken();
  const boss = isAdmin();
  const superAdmin = isSuperAdmin();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [feedOpen, setFeedOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const feedRef = useOutsideClose(feedOpen, setFeedOpen);
  const adminRef = useOutsideClose(adminOpen, setAdminOpen);

  const { data: categories } = useFetch('/generalc', {
    method: 'GET',
    headers: { 'x-access-token': cookie },
  });

  function closeMenus() {
    setMobileOpen(false);
    setFeedOpen(false);
    setAdminOpen(false);
  }

  function go(path) {
    closeMenus();
    navigate(path);
  }

  function goToFeed(path, category) {
    closeMenus();
    dispatch(fetchCategory(category));
    dispatch(fetchData());
    navigate(path);
  }

  function handleSignOut() {
    closeMenus();
    clearAuth();
    navigate('/');
    navigate(0);
  }

  return (
    <nav className="gs-navbar">
      <div className="navbar-inner">
        <button className="navbar-brand" onClick={() => go('/')}>
          Gut <span>Shtick</span>
        </button>
        <button
          className="navbar-toggler"
          aria-label="Toggle navigation"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((o) => !o)}
        >
          <span className="navbar-toggler-icon" />
        </button>
        <div className={`navbar-collapse${mobileOpen ? ' show' : ''}`}>
          <ul className="navbar-nav navbar-nav-start">
            <li className="nav-item"><button className="nav-link" onClick={() => go('/')}>Home</button></li>
            <li className="nav-item"><button className="nav-link" onClick={() => go('/about')}>About</button></li>

            <li className="nav-item dropdown" ref={feedRef}>
              <button className="nav-link dropdown-toggle" onClick={() => setFeedOpen((o) => !o)}>
                Feed
              </button>
              {feedOpen && (
                <ul className="dropdown-menu">
                  {boss && (
                    <li><button className="dropdown-item" onClick={() => goToFeed('/feed/0', '0')}>
                      ⏳ Pending Approval
                    </button></li>
                  )}
                  <li><button className="dropdown-item" onClick={() => goToFeed('/feed/all', 'all')}>
                    All Posts
                  </button></li>
                  {email && (
                    <li><button className="dropdown-item" onClick={() => goToFeed('/feed/liked', 'liked')}>
                      ❤ My Liked Posts
                    </button></li>
                  )}
                  {categories && categories.length > 0 && <li><hr className="dropdown-divider" /></li>}
                  {categories && categories.map((cat) => (
                    <li key={cat.id}>
                      <button className="dropdown-item" onClick={() => goToFeed(`/feed/${cat.id}`, cat.id)}>
                        {cat.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>

            <li className="nav-item"><button className="nav-link" onClick={() => go('/hock')}>🗣️ Hock</button></li>
            <li className="nav-item"><button className="nav-link" onClick={() => go('/tachlis')}>📌 Tachlis</button></li>
            <li className="nav-item"><button className="nav-link" onClick={() => go('/games')}>☕ Coffee Break</button></li>

            {boss && (
              <li className="nav-item dropdown" ref={adminRef}>
                <button className="nav-link dropdown-toggle" onClick={() => setAdminOpen((o) => !o)}>
                  ⚙ Admin
                </button>
                {adminOpen && (
                  <ul className="dropdown-menu">
                    <li><button className="dropdown-item" onClick={() => go('/admin')}>Admin Dashboard</button></li>
                    {superAdmin && (
                      <li><button className="dropdown-item" onClick={() => go('/superadmin')}>Super Admin</button></li>
                    )}
                  </ul>
                )}
              </li>
            )}
          </ul>

          <ul className="navbar-nav navbar-nav-end">
            {email ? (
              <>
                <li className="nav-item navbar-notif"><NotificationBell /></li>
                <li className="nav-item"><button className="nav-link nav-link-pin" onClick={() => go('/CreateShtick')}>＋ Pin Something</button></li>
                <li className="nav-item"><button className="nav-link" onClick={() => go('/profile')}>Profile</button></li>
                <li className="nav-item"><button className="nav-link" onClick={handleSignOut}>Sign Out</button></li>
              </>
            ) : (
              <>
                {/* Visible logged-out too -- previously this whole button was hidden
                    pre-login, so a visitor never saw an invitation to contribute
                    anywhere on the site. */}
                <li className="nav-item">
                  <button className="nav-link nav-link-pin" onClick={() => go('/signup?next=%2FCreateShtick')}>＋ Pin Something</button>
                </li>
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

export default AppNavbar;
