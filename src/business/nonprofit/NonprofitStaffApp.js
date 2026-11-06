import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  LayoutDashboard, Search, Users, CalendarDays, HandCoins, Repeat, Link2,
  AlertTriangle, ListTree, ClipboardList, Settings as SettingsIcon, History, LogOut,
} from 'lucide-react';
import nonprofitApiRequest, { clearStaffToken, getStaffToken } from './nonprofitApi';
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
import NonprofitStaffLogin from './NonprofitStaffLogin';
import './nonprofit.css';

const NAV_ITEMS = [
  { to: '', label: 'Dashboard', icon: LayoutDashboard },
  { to: 'search', label: 'Search', icon: Search },
  { to: 'families', label: 'Families', icon: Users },
  { to: 'holidays', label: 'Holidays', icon: CalendarDays },
  { to: 'donations', label: 'Donations', icon: HandCoins },
  { to: 'memberships', label: 'Memberships', icon: Repeat },
  { to: 'payment-links', label: 'Payment Links', icon: Link2 },
  { to: 'followups', label: 'Follow-Ups', icon: AlertTriangle },
  { to: 'other-transactions', label: 'Other Transactions', icon: ListTree },
  { to: 'forms', label: 'Forms', icon: ClipboardList },
  { to: 'audit-log', label: 'Audit Log', icon: History },
  { to: 'settings', label: 'Settings', icon: SettingsIcon },
];

// The list/detail page components (Families, Memberships, Holidays,
// Forms) take their "which record" id and their back/open navigation as
// plain props, not via useParams()/<Link>, so the exact same files also
// work embedded in the owner's regular dashboard (see
// NonprofitOwnerPanel.js), which has no nested routes to match against.
// These small wrappers are what supply the router-backed versions of
// those props for THIS standalone, URL-routed tree -- used only by
// delegated staff who sign in separately (see this file's own docstring).
function FamilyDetailRoute({ businessId }) {
  const { familyId } = useParams();
  const navigate = useNavigate();
  return <NonprofitFamilyDetailPage businessId={businessId} familyId={Number(familyId)} onBack={() => navigate('..')} />;
}
function HolidaySignupsRoute({ businessId }) {
  const { holidayId } = useParams();
  const navigate = useNavigate();
  return <NonprofitHolidaySignupsPage businessId={businessId} holidayId={Number(holidayId)} onBack={() => navigate('../..')} />;
}
function MembershipDetailRoute({ businessId, staff }) {
  const { membershipId } = useParams();
  const navigate = useNavigate();
  return <NonprofitMembershipDetailPage businessId={businessId} staff={staff} membershipId={Number(membershipId)} onBack={() => navigate('..')} />;
}
function FormBuilderRoute({ businessId }) {
  const { formId } = useParams();
  const navigate = useNavigate();
  return <NonprofitFormBuilderPage businessId={businessId} formId={Number(formId)} onBack={() => navigate('..')} />;
}
function FormResponsesRoute({ businessId }) {
  const { formId } = useParams();
  const navigate = useNavigate();
  // Path pattern is "forms/:formId/responses" (3 segments) -- '..' alone
  // would only strip "responses" and land back on the form BUILDER
  // (which also matches "forms/:formId"), not the forms list.
  return <NonprofitFormResponsesPage businessId={businessId} formId={Number(formId)} onBack={() => navigate('../..')} />;
}
function FamiliesListRoute({ businessId }) {
  const navigate = useNavigate();
  return <NonprofitFamiliesPage businessId={businessId} onOpenItem={(id) => navigate(String(id))} />;
}
function HolidaysListRoute({ businessId }) {
  const navigate = useNavigate();
  return <NonprofitHolidaysPage businessId={businessId} onOpenItem={(id) => navigate(`${id}/signups`)} />;
}
function MembershipsListRoute({ businessId, staff }) {
  const navigate = useNavigate();
  return <NonprofitMembershipsPage businessId={businessId} staff={staff} onOpenItem={(id) => navigate(String(id))} />;
}
function FormsListRoute({ businessId }) {
  const navigate = useNavigate();
  return <NonprofitFormsPage businessId={businessId} onOpenItem={(id) => navigate(String(id))} onOpenResponses={(id) => navigate(`${id}/responses`)} />;
}

/** Mounted at /staff/* on a nonprofit's own subdomain -- see
 * siteMode.js's businessSiteDescriptor(). A wholly separate login from
 * the rest of this dashboard's owner-tools area: every request here
 * carries an X-Nonprofit-Token, not the platform's own x-access-token.
 * This is now the SECONDARY way in -- for a nonprofit that wants to
 * delegate restricted access to someone without the owner's own
 * platform login (see nonprofit_staff.py). The owner's own, primary
 * access is NonprofitOwnerPanel.js, embedded directly in their regular
 * dashboard -- see SiteBuilderTab.js.
 */
export default function NonprofitStaffApp({ subdomain }) {
  const [staff, setStaff] = useState(undefined); // undefined = loading, null = not logged in
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!getStaffToken()) { setStaff(null); return; }
    nonprofitApiRequest('GET', null, '/nonprofit/staff/me')
      .then(setStaff)
      .catch(() => { clearStaffToken(); setStaff(null); });
  }, []);

  const logout = () => { clearStaffToken(); setStaff(null); navigate('/staff/login'); };

  if (staff === undefined) {
    return <div className="gs-loading" style={{ minHeight: '60vh' }}><div className="gs-spinner" /></div>;
  }

  if (staff === null) {
    return (
      <Routes>
        <Route path="login" element={<NonprofitStaffLogin subdomain={subdomain} />} />
        <Route path="*" element={<Navigate to="login" replace state={{ from: location }} />} />
      </Routes>
    );
  }

  const businessId = staff.business_id;

  return (
    <div className="np-shell">
      <aside className="np-sidebar">
        <div className="np-sidebar-header">
          <strong>Staff portal</strong>
          <span className="np-sidebar-role">{staff.name} · {staff.role}</span>
        </div>
        <nav className="np-nav">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to || '.'} className={`np-nav-link${location.pathname.endsWith(`/staff/${to}`) || (!to && location.pathname.endsWith('/staff')) ? ' np-nav-link-active' : ''}`}>
              <Icon size={16} /> {label}
            </Link>
          ))}
        </nav>
        <button type="button" className="np-nav-link np-logout" onClick={logout}><LogOut size={16} /> Sign out</button>
      </aside>
      <main className="np-content">
        <Routes>
          <Route path="" element={<NonprofitDashboardPage businessId={businessId} />} />
          <Route path="search" element={<NonprofitSearchPage businessId={businessId} />} />
          <Route path="families" element={<FamiliesListRoute businessId={businessId} />} />
          <Route path="families/:familyId" element={<FamilyDetailRoute businessId={businessId} />} />
          <Route path="holidays" element={<HolidaysListRoute businessId={businessId} />} />
          <Route path="holidays/:holidayId/signups" element={<HolidaySignupsRoute businessId={businessId} />} />
          <Route path="donations" element={<NonprofitDonationsPage businessId={businessId} staff={staff} />} />
          <Route path="memberships" element={<MembershipsListRoute businessId={businessId} staff={staff} />} />
          <Route path="memberships/:membershipId" element={<MembershipDetailRoute businessId={businessId} staff={staff} />} />
          <Route path="payment-links" element={<NonprofitPaymentLinksPage businessId={businessId} staff={staff} />} />
          <Route path="followups" element={<NonprofitFollowupsPage businessId={businessId} />} />
          <Route path="other-transactions" element={<NonprofitOtherTransactionsPage businessId={businessId} />} />
          <Route path="forms" element={<FormsListRoute businessId={businessId} />} />
          <Route path="forms/:formId" element={<FormBuilderRoute businessId={businessId} />} />
          <Route path="forms/:formId/responses" element={<FormResponsesRoute businessId={businessId} />} />
          <Route path="audit-log" element={<NonprofitAuditLogPage businessId={businessId} />} />
          <Route path="settings" element={<NonprofitSettingsPage businessId={businessId} staff={staff} />} />
          <Route path="*" element={<Navigate to="" replace />} />
        </Routes>
      </main>
    </div>
  );
}
