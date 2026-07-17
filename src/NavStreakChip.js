import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiRequest from './ApiRequest';
import { isLoggedIn } from './auth';

/**
 * A small, friendly reminder of the visitor's reading streak, always visible
 * in the nav instead of buried on the Profile page -- the retention nudge
 * from the "Sunny Board" redesign pitch. Only renders once there's actually
 * a streak to show (0-day streaks stay silent rather than nagging).
 */
export default function NavStreakChip() {
  const [streak, setStreak] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoggedIn()) return;
    apiRequest('GET', null, '/user/me/streak').then(setStreak).catch(() => {});
  }, []);

  if (!streak || streak.current_streak < 1) return null;

  return (
    <button className="nav-streak-chip" onClick={() => navigate('/profile')} title="Your reading streak">
      <span className="nav-streak-flame">🔥</span>
      <span>{streak.current_streak}-day streak</span>
    </button>
  );
}
