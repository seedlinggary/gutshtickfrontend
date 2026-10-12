import React, { useEffect, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import apiRequest from '../ApiRequest';
import { siteUrl } from '../siteMode';

const NEW_COLOR = 'var(--info, #3b82f6)';
const RETURNING_COLOR = 'var(--accent, #f59e0b)';
const CHART_HEIGHT = 100;
const WINDOWS = ['7d', '30d', '90d'];

function formatShortDate(isoDate) {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function Legend() {
  return (
    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 10, height: 10, borderRadius: 2, background: NEW_COLOR, display: 'inline-block' }} />
        New
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 10, height: 10, borderRadius: 2, background: RETURNING_COLOR, display: 'inline-block' }} />
        Returning
      </span>
    </div>
  );
}

/**
 * Super Admin panel: everything about traffic/engagement on the Business
 * sub-site specifically -- unique visitors, geography, new-vs-returning
 * (same shape as AdminAnalytics.js, just scoped server-side to
 * site='business'), plus a leaderboard of the most-viewed listings and the
 * business locations (cities) drawing the most of that attention.
 *
 * Backed by GET /business/admin/analytics. Localhost traffic and
 * admin/super_admin accounts' own activity are excluded server-side, same as
 * the site-wide dashboard.
 */
export default function AdminBusinessAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [leaderboardWindow, setLeaderboardWindow] = useState('30d');

  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupResults, setLookupResults] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(null);

  const copyEmail = async (email) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail((e) => (e === email ? null : e)), 2000);
    } catch (_) { /* clipboard unavailable -- the email's still shown on screen */ }
  };

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    setError('');
    apiRequest('GET', null, '/business/admin/analytics')
      .then((d) => setData(d))
      .catch((e) => setError(typeof e === 'string' ? e : 'Failed to load Business analytics.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const q = lookupQuery.trim();
    if (!q) { setLookupResults(null); setLookupLoading(false); return undefined; }
    setLookupLoading(true);
    const t = setTimeout(() => {
      apiRequest('GET', null, `/business/admin/businesses/search?q=${encodeURIComponent(q)}`)
        .then((d) => setLookupResults(d.results || []))
        .catch(() => setLookupResults([]))
        .finally(() => setLookupLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [lookupQuery]);

  const dailyNewReturning = data?.daily_new_vs_returning || [];
  const maxDaily = dailyNewReturning.reduce((m, d) => Math.max(m, d.new + d.returning), 0) || 1;
  const topBusinesses = data?.top_businesses?.[leaderboardWindow] || [];
  const topLocations = data?.top_locations?.[leaderboardWindow] || [];
  const maxLocationViews = topLocations.reduce((m, l) => Math.max(m, l.views), 0) || 1;

  return (
    <div className="admin-analytics">
      {/* ── Look up a business: jump straight into its account ── */}
      <div style={{ marginBottom: 28 }}>
        <h3 className="shtick-caption" style={{ marginBottom: 4 }}>🔎 Look Up a Business</h3>
        <p className="admin-empty" style={{ marginTop: 0, marginBottom: 10 }}>
          Search by business name, city, or the owner's email/name — then jump straight into
          its public profile or Owner Tools (open to Super Admin regardless of ownership).
        </p>
        <input
          type="text"
          className="auth-input games-search-input"
          style={{ maxWidth: 480 }}
          placeholder={'e.g. "EJ\'s Pizza", "Teaneck", or an owner\'s email…'}
          value={lookupQuery}
          onChange={(e) => setLookupQuery(e.target.value)}
        />

        {lookupLoading && <div className="gs-loading" style={{ marginTop: 10 }}><div className="gs-spinner" /></div>}

        {!lookupLoading && lookupResults && lookupResults.length === 0 && (
          <div className="admin-empty" style={{ marginTop: 10 }}>No businesses match "{lookupQuery.trim()}".</div>
        )}

        {!lookupLoading && lookupResults && lookupResults.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lookupResults.map((b) => (
              <div key={b.id} className="admin-card" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                {b.logo_url ? (
                  <img src={b.logo_url} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <span style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--surface-deep)', flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontWeight: 700 }}>{b.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {b.category}{b.city ? ` · ${b.city}${b.state ? `, ${b.state}` : ''}` : ''} · {b.views_30d} view{b.views_30d === 1 ? '' : 's'} (30d)
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {b.is_claimed ? (
                      <>
                        <span>Claimed by {b.owner_name || 'owner'}{b.owner_email ? ` (${b.owner_email})` : ''}</span>
                        {b.owner_email && (
                          <button
                            type="button"
                            onClick={() => copyEmail(b.owner_email)}
                            title="Copy owner's email"
                            aria-label="Copy owner's email"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, display: 'inline-flex', alignItems: 'center' }}
                          >
                            {copiedEmail === b.owner_email ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        )}
                      </>
                    ) : 'Unclaimed'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <a
                    href={siteUrl('business', `/business/${b.slug}`)}
                    target="_blank" rel="noopener noreferrer"
                    className="gs-btn gs-btn-outline gs-btn-sm"
                  >
                    Profile
                  </a>
                  <a
                    href={siteUrl('business', `/business/${b.slug}/tools`)}
                    target="_blank" rel="noopener noreferrer"
                    className="gs-btn gs-btn-primary gs-btn-sm"
                  >
                    Owner Tools
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <h3 className="shtick-caption" style={{ marginBottom: 4 }}>🏪 Business Site Analytics</h3>
          <p className="admin-empty" style={{ margin: 0 }}>
            Traffic and engagement for Gut Community — kept separate from the main site's numbers.
            Localhost/dev traffic and staff activity are excluded automatically.
          </p>
        </div>
        <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={load} disabled={loading}>
          ↻ Refresh
        </button>
      </div>

      {loading && <div className="gs-loading"><div className="gs-spinner" /></div>}
      {!loading && error && <div className="gs-error-box">{error}</div>}

      {!loading && !error && data && (
        <div>
          {/* ── Unique visitor counts ── */}
          <div className="superadmin-stats-grid" style={{ marginBottom: 24 }}>
            {WINDOWS.map((key) => {
              const v = data.visitors?.[key] || { total: 0, logged_in: 0, anonymous: 0 };
              const nr = data.new_vs_returning?.[key] || { new: 0, returning: 0 };
              const colors = { '7d': 'blue', '30d': 'green', '90d': 'purple' };
              return (
                <div key={key} className={`sa-stat-card ${colors[key]}`}>
                  <div className="sa-stat-num">{v.total}</div>
                  <div className="sa-stat-label">{key.replace('d', '')}-Day Visitors</div>
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                    {v.logged_in} logged-in · {v.anonymous} anonymous
                  </div>
                  <div style={{ marginTop: 2, fontSize: 12, opacity: 0.75 }}>
                    {nr.new} new · {nr.returning} returning
                  </div>
                </div>
              );
            })}
            <div className="sa-stat-card teal">
              <div className="sa-stat-num">{data.avg_page_views ?? 0}</div>
              <div className="sa-stat-label">Avg. Page Views</div>
            </div>
          </div>

          <div className="sa-activity-grid">
            {/* ── Top countries (visitors to the Business site) ── */}
            <div className="sa-activity-section">
              <h4>Top Countries</h4>
              {(!data.top_countries || data.top_countries.length === 0) && (
                <div className="admin-empty">No geo data yet.</div>
              )}
              {data.top_countries?.map((c, i) => (
                <div key={i} className="sa-activity-item">
                  <span>{c.country || 'Unknown'}</span>
                  <span>{c.count} visitor{c.count === 1 ? '' : 's'}</span>
                </div>
              ))}
            </div>

            {/* ── New vs returning, per day (last 30 days) ── */}
            <div className="sa-activity-section">
              <h4>New vs Returning — Last 30 Days</h4>
              {dailyNewReturning.length === 0 && <div className="admin-empty">No visitor activity yet.</div>}
              {dailyNewReturning.length > 0 && dailyNewReturning.length < 3 && (
                <div className="admin-empty" style={{ marginBottom: 8 }}>
                  Only {dailyNewReturning.length} day{dailyNewReturning.length === 1 ? '' : 's'} of tracked
                  history so far — the trend will fill in as more days pass.
                </div>
              )}
              {dailyNewReturning.length > 0 && (
                <>
                  <Legend />
                  <div
                    style={{
                      display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start', gap: 3,
                      height: CHART_HEIGHT, marginTop: 6, marginBottom: 6,
                    }}
                  >
                    {dailyNewReturning.map((d, i) => {
                      const total = d.new + d.returning;
                      const totalPx = Math.max(4, (total / maxDaily) * CHART_HEIGHT);
                      const newPx = total > 0 ? (d.new / total) * totalPx : 0;
                      const returningPx = Math.max(0, totalPx - newPx - (d.new > 0 && d.returning > 0 ? 2 : 0));
                      return (
                        <div
                          key={i}
                          title={`${formatShortDate(d.date)}: ${d.new} new, ${d.returning} returning`}
                          style={{
                            flex: '0 1 32px', minWidth: 3,
                            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                            height: CHART_HEIGHT,
                          }}
                        >
                          {d.new > 0 && (
                            <div style={{ height: newPx, background: NEW_COLOR, borderRadius: '2px 2px 0 0', opacity: 0.9 }} />
                          )}
                          {d.new > 0 && d.returning > 0 && <div style={{ height: 2 }} />}
                          {d.returning > 0 && (
                            <div
                              style={{
                                height: returningPx, background: RETURNING_COLOR, opacity: 0.9,
                                borderRadius: d.new > 0 ? '0 0 2px 2px' : '2px',
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}>
                    <span>{formatShortDate(dailyNewReturning[0].date)}</span>
                    <span>{formatShortDate(dailyNewReturning[dailyNewReturning.length - 1].date)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Leaderboards: top viewed businesses + top locations ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '28px 0 12px', flexWrap: 'wrap' }}>
            <h3 className="shtick-caption" style={{ margin: 0 }}>Leaderboards</h3>
            <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
              {WINDOWS.map((w) => (
                <button
                  key={w}
                  type="button"
                  className={`gs-btn gs-btn-sm ${leaderboardWindow === w ? 'gs-btn-primary' : 'gs-btn-outline'}`}
                  onClick={() => setLeaderboardWindow(w)}
                >
                  {w === '7d' ? '7 days' : w === '30d' ? '30 days' : '90 days'}
                </button>
              ))}
            </div>
          </div>

          <div className="sa-activity-grid">
            {/* ── Top viewed businesses ── */}
            <div className="sa-activity-section">
              <h4>Top Viewed Businesses</h4>
              {topBusinesses.length === 0 && <div className="admin-empty">No profile views tracked in this window yet.</div>}
              {topBusinesses.map((b, i) => (
                <a
                  key={b.id}
                  href={siteUrl('business', `/business/${b.slug}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sa-activity-item"
                  style={{ textDecoration: 'none', color: 'inherit', justifyContent: 'space-between' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ color: 'var(--muted)', fontSize: 12, width: 16, flexShrink: 0 }}>{i + 1}.</span>
                    {b.logo_url ? (
                      <img src={b.logo_url} alt="" style={{ width: 22, height: 22, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <span style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--surface-deep)', flexShrink: 0 }} />
                    )}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</span>
                  </span>
                  <span style={{ flexShrink: 0, textAlign: 'right' }}>
                    {b.views} view{b.views === 1 ? '' : 's'}
                    {b.redemptions > 0 && <span style={{ color: 'var(--muted)' }}> · {b.redemptions} redeemed</span>}
                  </span>
                </a>
              ))}
            </div>

            {/* ── Top locations by business views ── */}
            <div className="sa-activity-section">
              <h4>Top Locations by Business Views</h4>
              <p className="admin-empty" style={{ marginTop: -4, marginBottom: 10 }}>
                Where the businesses getting the most views are located — not visitor geography.
              </p>
              {topLocations.length === 0 && <div className="admin-empty">No profile views tracked in this window yet.</div>}
              {topLocations.map((l, i) => (
                <div key={i} className="sa-activity-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
                  <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{l.city}{l.state ? `, ${l.state}` : ''}</span>
                    <span>{l.views} view{l.views === 1 ? '' : 's'}</span>
                  </span>
                  <span style={{ height: 5, borderRadius: 999, background: 'var(--surface-deep)', overflow: 'hidden' }}>
                    <span style={{
                      display: 'block', height: '100%', borderRadius: 999,
                      width: `${Math.max(4, (l.views / maxLocationViews) * 100)}%`,
                      background: 'var(--accent)',
                    }} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
