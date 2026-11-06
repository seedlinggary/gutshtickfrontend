import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard, Search, Users, CalendarDays, HandCoins, Repeat, Link2,
  AlertTriangle, ListTree, ClipboardList, Settings as SettingsIcon, History,
} from 'lucide-react';
import apiRequest from '../../ApiRequest';
import nonprofitApiRequest, { setStaffToken } from './nonprofitApi';
import NonprofitDashboardPage from './pages/NonprofitDashboardPage';
import NonprofitSearchPage from './pages/NonprofitSearchPage';
import NonprofitFamiliesPage from './pages/NonprofitFamiliesPage';
import NonprofitFamilyDetailPage from './pages/NonprofitFamilyDetailPage';
import NonprofitHolidaysPage from './pages/NonprofitHolidaysPage';
import NonprofitHolidaySignupsPage from './pages/NonprofitHolidaySignupsPage';
import NonprofitDonationsPage from './pages/NonprofitDonationsPage';
import NonprofitMembershipsPage from './pages/NonprofitMembershipsPage';
import NonprofitMembershipDetailPage from './pages/NonprofitMembershipDetailPage';
import NonprofitPaymentLinksPage from './pages/NonprofitPaymentLinksPage';
import NonprofitFollowupsPage from './pages/NonprofitFollowupsPage';
import NonprofitOtherTransactionsPage from './pages/NonprofitOtherTransactionsPage';
import NonprofitFormsPage from './pages/NonprofitFormsPage';
import NonprofitFormBuilderPage from './pages/NonprofitFormBuilderPage';
import NonprofitFormResponsesPage from './pages/NonprofitFormResponsesPage';
import NonprofitAuditLogPage from './pages/NonprofitAuditLogPage';
import NonprofitSettingsPage from './pages/NonprofitSettingsPage';
import './nonprofit.css';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'search', label: 'Search', icon: Search },
  { key: 'families', label: 'Families', icon: Users },
  { key: 'holidays', label: 'Holidays', icon: CalendarDays },
  { key: 'donations', label: 'Donations', icon: HandCoins },
  { key: 'memberships', label: 'Memberships', icon: Repeat },
  { key: 'payment-links', label: 'Payment Links', icon: Link2 },
  { key: 'followups', label: 'Follow-Ups', icon: AlertTriangle },
  { key: 'other-transactions', label: 'Other Transactions', icon: ListTree },
  { key: 'forms', label: 'Forms', icon: ClipboardList },
  { key: 'audit-log', label: 'Audit Log', icon: History },
  { key: 'settings', label: 'Settings', icon: SettingsIcon },
];

/** Everything the nonprofit module does, embedded directly in the SAME
 * owner dashboard the rest of the site is built from (SiteBuilderTab.js)
 * -- no separate login, no separate URL. The owner is already
 * authenticated here as themselves (their regular platform login); on
 * mount this silently exchanges that for a nonprofit staff token (auto-
 * login, always superadmin -- see nonprofit_staff.py's
 * auto_login_as_owner()) and stores it the same way a real staff login
 * would, so every existing nonprofit admin page underneath just works
 * unmodified. Navigation is local component state instead of routing --
 * this panel isn't mounted at a URL of its own, it's one tab inside
 * SiteBuilderTab.js, same as "Pages" manages its own editingPageId state
 * there instead of using a route. The standalone, URL-routed /staff/*
 * tree (NonprofitStaffApp.js) still exists separately, for a nonprofit
 * that wants to delegate restricted access to someone who isn't the
 * owner and shouldn't have the owner's own platform login. */
export default function NonprofitOwnerPanel({ businessId }) {
  const [staff, setStaff] = useState(undefined); // undefined = loading, false = failed, object = ready
  const [section, setSection] = useState('dashboard');
  const [detailId, setDetailId] = useState(null); // families / holidays / memberships detail
  const [formId, setFormId] = useState(null);
  const [formMode, setFormMode] = useState(null); // null | 'builder' | 'responses'

  useEffect(() => {
    apiRequest('POST', {}, `/nonprofit/businesses/${businessId}/staff/auto-login`)
      .then((d) => { setStaffToken(d.token); setStaff(d.staff); })
      .catch(() => setStaff(false));
  }, [businessId]);

  const goTo = (key) => {
    setSection(key);
    setDetailId(null);
    setFormId(null);
    setFormMode(null);
  };

  if (staff === undefined) {
    return <div className="gs-loading"><div className="gs-spinner" /></div>;
  }
  if (staff === false) {
    return <p className="gs-empty">Could not open the nonprofit back office -- try reloading this page.</p>;
  }

  let content;
  switch (section) {
    case 'dashboard':
      content = <NonprofitDashboardPage businessId={businessId} />;
      break;
    case 'search':
      content = <NonprofitSearchPage businessId={businessId} />;
      break;
    case 'families':
      content = detailId
        ? <NonprofitFamilyDetailPage businessId={businessId} familyId={detailId} onBack={() => setDetailId(null)} />
        : <NonprofitFamiliesPage businessId={businessId} onOpenItem={setDetailId} />;
      break;
    case 'holidays':
      content = detailId
        ? <NonprofitHolidaySignupsPage businessId={businessId} holidayId={detailId} onBack={() => setDetailId(null)} />
        : <NonprofitHolidaysPage businessId={businessId} onOpenItem={setDetailId} />;
      break;
    case 'donations':
      content = <NonprofitDonationsPage businessId={businessId} staff={staff} />;
      break;
    case 'memberships':
      content = detailId
        ? <NonprofitMembershipDetailPage businessId={businessId} staff={staff} membershipId={detailId} onBack={() => setDetailId(null)} />
        : <NonprofitMembershipsPage businessId={businessId} staff={staff} onOpenItem={setDetailId} />;
      break;
    case 'payment-links':
      content = <NonprofitPaymentLinksPage businessId={businessId} staff={staff} />;
      break;
    case 'followups':
      content = <NonprofitFollowupsPage businessId={businessId} />;
      break;
    case 'other-transactions':
      content = <NonprofitOtherTransactionsPage businessId={businessId} />;
      break;
    case 'forms':
      if (formMode === 'builder') {
        content = <NonprofitFormBuilderPage businessId={businessId} formId={formId} onBack={() => { setFormId(null); setFormMode(null); }} />;
      } else if (formMode === 'responses') {
        content = <NonprofitFormResponsesPage businessId={businessId} formId={formId} onBack={() => { setFormId(null); setFormMode(null); }} />;
      } else {
        content = (
          <NonprofitFormsPage
            businessId={businessId}
            onOpenItem={(id) => { setFormId(id); setFormMode('builder'); }}
            onOpenResponses={(id) => { setFormId(id); setFormMode('responses'); }}
          />
        );
      }
      break;
    case 'audit-log':
      content = <NonprofitAuditLogPage businessId={businessId} />;
      break;
    case 'settings':
      content = <NonprofitSettingsPage businessId={businessId} staff={staff} isOwnerView />;
      break;
    default:
      content = null;
  }

  return (
    <div className="np-shell np-shell-embedded">
      <aside className="np-sidebar">
        <nav className="np-nav">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
            <button key={key} type="button" className={`np-nav-link${section === key ? ' np-nav-link-active' : ''}`} onClick={() => goTo(key)}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="np-content">{content}</main>
    </div>
  );
}
