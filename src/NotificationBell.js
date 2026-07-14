import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiRequest from './ApiRequest';
import { isLoggedIn } from './auth';

// Was 45s with no visibility gating -- polled the DB from every open tab,
// on every page (including mid-game), forever, even backgrounded. Backed off
// to 2 min and now pauses entirely while the tab is hidden.
const POLL_MS = 120000;

function formatRelative(dateStr) {
  const diffMins = Math.floor((Date.now() - new Date(dateStr)) / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();

  const loadUnreadCount = () => {
    apiRequest('GET', null, '/notifications/unread-count').then((d) => setUnreadCount(d.count)).catch(() => {});
  };

  useEffect(() => {
    if (!loggedIn) return;

    let interval = null;
    const start = () => {
      if (interval) return;
      loadUnreadCount();
      interval = setInterval(loadUnreadCount, POLL_MS);
    };
    const stop = () => {
      if (interval) { clearInterval(interval); interval = null; }
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') start();
      else stop();
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loggedIn]);

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      apiRequest('GET', null, '/notifications').then(setNotifications).catch(() => {});
    }
  };

  const handleClick = (n) => {
    if (!n.is_read) {
      apiRequest('POST', null, `/notifications/${n.id}/read`).catch(() => {});
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x));
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const markAllRead = (e) => {
    e.stopPropagation();
    apiRequest('POST', null, '/notifications/read-all').catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  if (!loggedIn) return null;

  return (
    <div className="notif-bell-wrap">
      <button
        className="notif-bell-btn"
        onClick={toggleOpen}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>
      {open && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-header">
            <strong>Notifications</strong>
            {unreadCount > 0 && (
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={markAllRead}>Mark all read</button>
            )}
          </div>
          {notifications.length === 0 && <div className="notif-empty">No notifications yet.</div>}
          {notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              className={`notif-item${n.is_read ? '' : ' unread'}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleClick(n)}
            >
              <span className="notif-item-message">{n.message}</span>
              <span className="notif-item-time">{formatRelative(n.pub_date)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
