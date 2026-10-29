import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, SearchX, Newspaper, MessagesSquare, Store, Home, Briefcase, BookOpen, ChevronRight } from 'lucide-react';
import apiRequest from '../ApiRequest';
import { getCurrentSite, siteUrl } from '../siteMode';
import { crossSiteNavigate } from '../CrossSiteLink';
import timeAgo from '../utils/timeAgo';

/** One visual identity per result type -- an icon + tint reused from the
 * same tag-pill palette the rest of the site already uses for content
 * genres (see .gs-card.genre-* / src/utils/cardGenre.js), so a search
 * result reads as "the same kind of thing" as its card does everywhere
 * else instead of inventing a new color language just for this page. */
export const GROUP_STYLE = {
  shtick: { Icon: Newspaper, bg: 'var(--tag-neutral-bg)', fg: 'var(--tag-neutral-text)' },
  hock: { Icon: MessagesSquare, bg: 'var(--tag-forum-bg)', fg: 'var(--tag-forum-text)' },
  business: { Icon: Store, bg: 'var(--tag-deal-bg)', fg: 'var(--tag-deal-text)' },
  estates: { Icon: Home, bg: 'var(--tag-news-bg)', fg: 'var(--tag-news-text)' },
  tachlis: { Icon: Briefcase, bg: 'var(--tag-flyer-bg)', fg: 'var(--tag-flyer-text)' },
  torah: { Icon: BookOpen, bg: 'var(--tag-joke-bg)', fg: 'var(--tag-joke-text)' },
};
export const DEFAULT_GROUP_STYLE = { Icon: Search, bg: 'var(--tag-neutral-bg)', fg: 'var(--tag-neutral-text)' };

/** Wraps every case-insensitive occurrence of `term` in <mark> so a result's
 * title/snippet shows the reader exactly what matched instead of making
 * them re-scan the whole line for it. */
function Highlighted({ text, term }) {
  if (!term?.trim()) return text;
  const parts = text.split(new RegExp(`(${term.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'));
  return parts.map((part, i) => (
    part.toLowerCase() === term.trim().toLowerCase()
      ? <mark key={i} className="search-result-mark">{part}</mark>
      : <React.Fragment key={i}>{part}</React.Fragment>
  ));
}

/** One result card. Same-site results use a plain react-router <Link> (an
 * in-app navigation); a result that belongs to a DIFFERENT site than the
 * one this page is currently open on needs a real cross-origin link
 * instead (sub-sites are different hostnames in production, so react-
 * router's own navigate() can't reach them) -- and since cookies/
 * localStorage don't carry over across hostnames either, that link reuses
 * the exact same one-time SSO handoff CrossSiteLink.js's "switch sites"
 * menu already uses, so clicking a cross-site result also logs the viewer
 * in there automatically instead of landing them signed out. */
function ResultCard({ item, groupType, groupLabel, sameSite, term }) {
  const { Icon, bg, fg } = GROUP_STYLE[groupType] || DEFAULT_GROUP_STYLE;
  const body = (
    <>
      <div className="search-result-icon" style={{ background: bg, color: fg }}>
        <Icon size={17} />
      </div>
      <div className="search-result-body">
        <div dir="auto" className="search-result-title"><Highlighted text={item.title} term={term} /></div>
        {item.snippet && <div dir="auto" className="search-result-snippet"><Highlighted text={item.snippet} term={term} /></div>}
        <div className="search-result-meta">
          {!sameSite && <span className="search-result-site">{groupLabel}</span>}
          {item.pub_date && <span className="search-result-date">{timeAgo(item.pub_date)}</span>}
        </div>
      </div>
      <ChevronRight size={16} className="search-result-chevron" />
    </>
  );

  if (sameSite) {
    return <Link to={item.path} className="search-result-row">{body}</Link>;
  }

  const targetUrl = siteUrl(item.site_id, item.path);
  return (
    <button type="button" className="search-result-row search-result-row-btn" onClick={() => crossSiteNavigate(targetUrl)}>
      {body}
    </button>
  );
}

function ResultGroup({ group, currentSiteId, term }) {
  if (group.count === 0) return null;
  const { Icon, fg } = GROUP_STYLE[group.type] || DEFAULT_GROUP_STYLE;
  return (
    <div className="search-result-group">
      <div className="search-result-group-label">
        <Icon size={14} color={fg} /> {group.label} <span className="search-result-group-count">{group.count}</span>
      </div>
      {group.items.map((item) => (
        <ResultCard
          key={`${group.type}:${item.id}`}
          item={item}
          groupType={group.type}
          groupLabel={group.label}
          sameSite={group.site_id === currentSiteId}
          term={term}
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
      <div className="gs-container search-page" style={{ maxWidth: 820 }}>
        <h1 className="search-page-heading"><Search size={22} /> Search all of GUT</h1>
        <form onSubmit={submit} className="search-page-form" role="search">
          <Search size={17} className="search-page-icon" />
          <input
            type="search"
            className="search-page-input"
            placeholder="Search Shtick, Hock, businesses, listings, jobs, Torah posts…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label="Search all of GUT"
            autoFocus
          />
          <button type="submit" className="gs-btn gs-btn-primary">Search</button>
        </form>

        {!urlQuery && !loading && (
          <div className="search-page-empty">
            <div className="search-page-empty-badge"><Search size={28} /></div>
            <p>Search across Shtick, Hock, the Business Directory, Estates, the Job Board, and Torah posts -- all in one place.</p>
          </div>
        )}

        {loading && <div className="gs-loading"><div className="gs-spinner" /> Searching…</div>}
        {error && <div className="gs-error-box">Couldn't complete that search. Please try again.</div>}

        {data && !loading && !error && groups.length === 0 && urlQuery && (
          <div className="search-page-empty">
            <div className="search-page-empty-badge"><SearchX size={28} /></div>
            <p>No results for "{urlQuery}". Try a different word or a shorter term.</p>
          </div>
        )}

        {data && !loading && !error && groups.length > 0 && (
          <>
            <p className="search-page-count">
              {data.total} result{data.total === 1 ? '' : 's'} for "{data.q}"
            </p>
            {groups.map((group) => (
              <ResultGroup key={group.type} group={group} currentSiteId={currentSiteId} term={data.q} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
