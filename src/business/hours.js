import { WEEKDAYS } from './categories';

// hours shape: {mon: {open, close, closed}, ...}, open/close are "HH:MM"
// (24h) strings from <input type="time">, see HoursEditor.js.
function todayKey() {
  return WEEKDAYS[(new Date().getDay() + 6) % 7].key; // JS Sunday=0 -> our mon..sun
}

/** Human blurb for today's hours, e.g. "Today: 09:00–17:30" or "Closed today". */
export function hoursToday(loc) {
  if (!loc?.hours) return null;
  const day = loc.hours[todayKey()];
  if (!day) return null;
  if (day.closed) return 'Closed today';
  if (day.open && day.close) return `Today: ${day.open}–${day.close}`;
  return null;
}

/** true/false if we can tell from today's hours, otherwise null (unknown). */
export function isOpenNow(loc) {
  if (!loc?.hours) return null;
  const day = loc.hours[todayKey()];
  if (!day) return null;
  if (day.closed) return false;
  if (!day.open || !day.close) return null;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = day.open.split(':').map(Number);
  const [ch, cm] = day.close.split(':').map(Number);
  const openMin = oh * 60 + om;
  const closeMin = ch * 60 + cm;
  if (closeMin <= openMin) {
    // Overnight range (e.g. 22:00-02:00): open if after opening or before closing.
    return nowMin >= openMin || nowMin < closeMin;
  }
  return nowMin >= openMin && nowMin < closeMin;
}
