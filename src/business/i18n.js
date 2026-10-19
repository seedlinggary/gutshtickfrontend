import { useState, useEffect, useCallback } from 'react';

// Scoped to the business directory's own chrome/labels -- not a full
// app-wide i18n framework, just enough to remove a real barrier for the
// Hebrew/French-speaking communities this directory already lists
// businesses in (see the growth-plan doc's customer feature #9).
const LANG_KEY = 'biz_lang';

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'he', label: 'עברית' },
];

const DICT = {
  en: {
    directory: 'Shops',
    // "Community" belongs to the per-city lookup feature (shuls, mikvahs,
    // schools, orgs, activities, eruv -- everything about one place), since
    // that's the more natural meaning of the word. The older shul/chessed-
    // org directory view (still at /community) needed its own distinct,
    // descriptive name once it no longer owned "Community" -- it's really
    // just the directory filtered down to those two categories.
    community: 'Shuls & Orgs',
    findCommunity: 'Community',
    activities: 'Activities',
    deals: 'Deals',
    myBusinesses: 'My Businesses',
    myDeals: 'My Deals',
    vendorBoard: 'Vendor Board',
    listABusiness: 'List a Business',
    signIn: 'Sign In',
    signUp: 'Sign Up',
    signOut: 'Sign Out',
    profile: 'Profile',
    search: 'Search',
    filters: 'Filters',
    category: 'Category',
    openNow: 'Open Now',
    nearMe: 'Near me',
    kosherOnly: 'Kosher only',
    sortBy: 'Sort by',
    follow: 'Follow',
    following: 'Following',
    askQuestion: 'Ask a Question',
    requestQuote: 'Request a Quote',
    getThisDeal: 'Get This Deal',
    compare: 'Compare',
    share: 'Share',
    directions: 'Directions',
    call: 'Call',
    website: 'Website',
    writeReview: 'Write a Review',
    verified: 'Verified visit',
    hours: 'Hours',
    closedForHoliday: 'Closed for {reason}',
    noResults: 'No businesses match your search yet.',
    loading: 'Loading...',
  },
  he: {
    directory: 'חנויות',
    community: 'בתי כנסת וארגונים',
    findCommunity: 'קהילה',
    activities: 'פעילויות',
    deals: 'מבצעים',
    myBusinesses: 'העסקים שלי',
    myDeals: 'המבצעים שלי',
    vendorBoard: 'לוח ספקים',
    listABusiness: 'הוספת עסק',
    signIn: 'התחברות',
    signUp: 'הרשמה',
    signOut: 'התנתקות',
    profile: 'פרופיל',
    search: 'חיפוש',
    filters: 'סינון',
    category: 'קטגוריה',
    openNow: 'פתוח עכשיו',
    nearMe: 'לידי',
    kosherOnly: 'כשר בלבד',
    sortBy: 'מיון לפי',
    follow: 'עקוב',
    following: 'עוקב',
    askQuestion: 'שאל שאלה',
    requestQuote: 'בקש הצעת מחיר',
    getThisDeal: 'קבל מבצע זה',
    compare: 'השווה',
    share: 'שתף',
    directions: 'ניווט',
    call: 'התקשר',
    website: 'אתר',
    writeReview: 'כתוב ביקורת',
    verified: 'ביקור מאומת',
    hours: 'שעות פתיחה',
    closedForHoliday: 'סגור עבור {reason}',
    noResults: 'לא נמצאו עסקים התואמים את החיפוש.',
    loading: 'טוען...',
  },
};

function readStoredLang() {
  try {
    return localStorage.getItem(LANG_KEY) || 'en';
  } catch (e) {
    return 'en';
  }
}

let currentLang = readStoredLang();
const listeners = new Set();

export function setLanguage(lang) {
  if (!DICT[lang]) return;
  currentLang = lang;
  try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* ignore */ }
  listeners.forEach((fn) => fn(lang));
}

export function getLanguage() {
  return currentLang;
}

/** Any mounted component calling this re-renders when setLanguage() is
 * called anywhere else (e.g. the navbar's toggle) -- a tiny external-store
 * pattern instead of a Context provider, so no wrapper needs to be threaded
 * through App.js/sites/registry.js. */
export function useLanguage() {
  const [lang, setLang] = useState(currentLang);
  useEffect(() => {
    listeners.add(setLang);
    return () => listeners.delete(setLang);
  }, []);
  const t = useCallback((key, vars) => {
    let str = (DICT[lang] && DICT[lang][key]) || DICT.en[key] || key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => { str = str.replace(`{${k}}`, v); });
    }
    return str;
  }, [lang]);
  return { lang, setLanguage, t };
}
