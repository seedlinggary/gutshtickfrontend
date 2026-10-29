import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import apiRequest from '../ApiRequest';
import { getCurrentSite, siteUrl } from '../siteMode';
import { crossSiteNavigate } from '../CrossSiteLink';
import timeAgo from '../utils/timeAgo';

/** One result card. Same-site results use a plain react-router <Link> (an
 * in-app navigation); a result that belongs to a DIFFERENT site than the
 * one this page is currently open on needs a real cross-origin link
 * instead (sub-sites are different hostnames in production, so react-
 * router's own navigate() can't reach them) -- and since cookies/
 * localStorage don't carry over across hostnames either, that link reuses
 * the exact same one-time SSO handoff CrossSiteLink.js's "switch sites"
 * menu already uses, so clicking a cross-site result also logs the viewer
 * in there automatically instead of landing them signed out. */
function ResultCard({ item, groupLabel, sameSite }) {
  const body = (
    <>
      <div dir="auto" className="today-row-title">{item.title}</div>
      {item.snippet && <div dir="auto" className="today-row-sub">{item.snippet}</div>}
      <div className="search-result-meta">
        {!sameSite && <span className="search-result-site">{groupLabel}</span>}
        {item.pub_date && <span className="search-result-date">{timeAgo(item.pub_date)}</span>}
      </div>
    </>
  );

  if (sameSite) {
    return <Link to={item.path} className="today-row search-result-row">{body}</Link>;
  }

  const targetUrl = siteUrl(item.site_id, item.path);
  return (
    <button type="button" className="today-row search-result-row search-result-row-btn" onClick={() => crossSiteNavigate(targetUrl)}>
      {body}
    </button>
  );
}

function ResultGroup({ group, currentSiteId }) {
  if (group.count === 0) return null;
  return (
    <div className="today-group search-result-group">
      <div className="today-group-label">
        {group.label} <span className="today-group-count">({group.count})</span>
      </div>
      {group.items.map((item) => (
        <ResultCard
          key={`${group.type}:${item.id}`}
          item={item}
          groupLabel={group.label}
          sameSite={group.site_id === currentSiteId}
        />
      ))}
    </div>
  );
}

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || '';
  const [input, setInput] = useState(urlQuery);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const currentSite = getCurrentSite();
  const currentSiteId = currentSite ? currentSite.id : 'main';

  useEffect(() => {
    setInput(urlQuery);
    if (!urlQuery || urlQuery.trim().length < 2) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(false);
    apiRequest('GET', null, `/search?q=${encodeURIComponent(urlQuery)}`)
      .then((res) => setData(res))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [urlQuery]);

  const submit = (e) => {
    e.preventDefault();
    const term = input.trim();
    if (term) setSearchParams({ q: term });
  };

  const groups = data ? data.groups.filter((g) => g.count > 0) : [];

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 820 }}>
        <h1 style={{ marginBottom: 14 }}>🔎 Search all of GUT</h1>
        <form onSubmit={submit} className="search-page-form" role="search">
          <Search size={16} className="search-page-icon" />
          <input
            type="search"
            className="gs-input search-page-input"
            placeholder="Search Shtick, Hock, businesses, listings, jobs, Torah posts…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label="Search all of GUT"
            autoFocus
          />
          <button type="submit" className="gs-btn gs-btn-primary">Search</button>
        </form>

        {!urlQuery && !loading && (
          <div className="gs-empty">
            <p style={{ fontSize: 40, marginBottom: 8 }}>🔎</p>
            <p>Search across Shtick, Hock, the Business Directory, Estates, the Job Board, and Torah posts -- all in one place.</p>
          </div>
        )}

        {loading && <div className="gs-loading"><div className="gs-spinner" /> Searching…</div>}
        {error && <div className="gs-error-box">Couldn't complete that search. Please try again.</div>}

        {data && !loading && !error && groups.length === 0 && urlQuery && (
          <div className="gs-empty">
            <p style={{ fontSize: 40, marginBottom: 8 }}>🤷</p>
            <p>No results for "{urlQuery}". Try a different word or a shorter term.</p>
          </div>
        )}

        {data && !loading && !error && groups.length > 0 && (
          <>
            <p style={{ color: 'var(--muted)' }}>
              {data.total} result{data.total === 1 ? '' : 's'} for "{data.q}"
            </p>
            {groups.map((group) => (
              <ResultGroup key={group.type} group={group} currentSiteId={currentSiteId} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
