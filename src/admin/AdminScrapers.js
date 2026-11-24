import React, { useState } from 'react';
import { Newspaper, Briefcase, CheckCircle2 } from 'lucide-react';
import { apiRequestRaw } from '../ApiRequest';

/**
 * Self-contained SuperAdmin panel: pull the most-recent articles from three
 * news sites into the pending-approval queue. No required props.
 *
 * One section per site, each independently runnable — kicking off a run for one
 * site never blocks the others. Each run does real network fetches to an
 * external site, so it can take a few seconds; we show a per-site spinner and
 * then the result (added count + why the run stopped).
 *
 * Only title + short summary + a link back to the source are stored — never the
 * full article body — so traffic flows back to the original publisher.
 */

const BASE = '/content-pipeline/scrape';
const NEWS_BASE = '/news/scrape';
const JOBS_BASE = '/tachlis/scrape';

const SITES = [
  {
    key: 'israelnationalnews',
    name: 'Israel National News',
    blurb: 'News Briefs (flashes) feed.',
    defaultCount: 10,
  },
  {
    key: 'yeshivaworld',
    name: 'The Yeshiva World',
    blurb: 'Latest posts feed.',
    defaultCount: 10,
  },
  {
    key: 'dansdeals',
    name: 'DansDeals',
    blurb: 'Latest deals & posts feed.',
    defaultCount: 10,
  },
  {
    key: 'pzdeals',
    name: 'PZ Deals',
    blurb: 'Latest blog articles (title + picture only, no summary).',
    defaultCount: 10,
  },
];

// GutKol's own sources -- same pending-queue pattern, posted as
// NewsArticle rows via a separate endpoint (backend/news/routes/
// news_scraper.py) instead of Shtick rows, so they land in GutKol's own
// review queue, not this site's.
const NEWS_SITES = [
  {
    key: 'npr',
    name: 'NPR',
    blurb: "NPR's \"Topics: News\" RSS feed.",
    defaultCount: 10,
  },
  {
    key: 'bbc',
    name: 'BBC News (World)',
    blurb: 'BBC World news RSS feed.',
    defaultCount: 10,
  },
];

// Gut Money's job board -- auto-publishes immediately (no pending queue,
// unlike the news/GutKol sources above) under the existing bot account,
// same one other automated content on this site already uses. Also runs
// automatically once a day via .github/workflows/jobs-scraper-cron.yml;
// these buttons are for visibility and manual reruns/testing.
const JOB_SITES = [
  {
    key: 'arbeitnow',
    name: 'Arbeitnow',
    blurb: 'Remote jobs + on-site jobs in Israel.',
    defaultCount: 25,
  },
  {
    key: 'remoteok',
    name: 'Remote OK',
    blurb: 'Remote jobs, filtered to exclude single-country restrictions.',
    defaultCount: 25,
  },
  {
    key: 'jobicy',
    name: 'Jobicy',
    blurb: 'Remote jobs, filtered to exclude single-country restrictions.',
    defaultCount: 25,
  },
  {
    key: 'alljobs',
    name: 'AllJobs.co.il',
    blurb: 'Jobs physically located in Israel.',
    defaultCount: 25,
  },
];

const STOP_LABELS = {
  count_reached: 'reached your requested count',
  duplicate_limit: 'hit already-seen articles (duplicate limit)',
  no_more_articles: 'no more new articles in the feed',
  no_more_jobs: 'no more new jobs in the feed',
};

function stopLabel(reason) {
  return STOP_LABELS[reason] || reason || 'done';
}

function scrapeFetch(base, source, count) {
  return apiRequestRaw('POST', { count }, `${base}/${source}`);
}

function SiteScraper({ site, base = BASE, itemLabel = 'article', pendingQueue = true }) {
  const [count, setCount] = useState(String(site.defaultCount));
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const run = async () => {
    setError('');
    setResult(null);
    const n = parseInt(count, 10);
    const safeCount = Number.isFinite(n) && n > 0 ? n : site.defaultCount;
    setRunning(true);
    try {
      const resp = await scrapeFetch(base, site.key, safeCount);
      if (!resp.ok) {
        setError(
          (resp.data && (resp.data.message || resp.data.error)) ||
            'Run failed. Please try again.'
        );
        return;
      }
      setResult(resp.data);
    } catch (e) {
      setError('Run failed — could not reach the server.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div
      className="gs-card"
      style={{ maxWidth: 640, marginBottom: 18 }}
    >
      <div className="gs-card-body">
        <h4 className="shtick-caption" style={{ margin: '0 0 4px' }}>{site.name}</h4>
        <p className="admin-empty" style={{ margin: '0 0 14px', fontSize: 13 }}>
          {site.blurb}
          {' '}
          {pendingQueue
            ? <>New {itemLabel}s land in the <strong>Pending</strong> queue — nothing auto-publishes.</>
            : <>New {itemLabel}s go <strong>live immediately</strong> — no pending queue.</>}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <label style={{ fontWeight: 600, fontSize: 14 }} htmlFor={`count-${site.key}`}>
            How many
          </label>
          <input
            id={`count-${site.key}`}
            type="number"
            min="1"
            max="50"
            className="auth-input"
            value={count}
            onChange={(e) => setCount(e.target.value)}
            disabled={running}
            style={{ width: 90 }}
          />
          <button
            className="gs-btn gs-btn-primary"
            onClick={run}
            disabled={running}
            style={{ marginLeft: 'auto' }}
          >
            {running ? 'Running…' : 'Run'}
          </button>
        </div>

        {running && (
          <div className="gs-loading" style={{ marginTop: 14 }}>
            <div className="gs-spinner" />
            <p className="admin-empty" style={{ marginTop: 10 }}>
              Fetching {site.name} — this hits the live site, hang tight.
            </p>
          </div>
        )}

        {error && !running && (
          <div className="gs-error-box" style={{ marginTop: 14 }}>{error}</div>
        )}

        {result && !running && (
          <div className="gs-success-box" style={{ marginTop: 14 }}>
            <CheckCircle2 size={14} /> {result.added} new {itemLabel}{result.added === 1 ? '' : 's'} added
            {' '}(stopped: {stopLabel(result.stopped_reason)}).
            {' '}Checked {result.checked}.
          </div>
        )}
      </div>
    </div>
  );
}

const SOURCE_LABELS = {
  arbeitnow: 'Arbeitnow', remoteok: 'Remote OK', jobicy: 'Jobicy', alljobs: 'AllJobs.co.il',
};

function mergeCounts(perSourceResults, key) {
  const merged = {};
  Object.values(perSourceResults).forEach((r) => {
    Object.entries(r[key] || {}).forEach(([name, count]) => {
      merged[name] = (merged[name] || 0) + count;
    });
  });
  return Object.entries(merged).sort((a, b) => b[1] - a[1]).slice(0, 5);
}

function TopList({ title, rows }) {
  if (!rows.length) return null;
  return (
    <div style={{ marginTop: 10 }}>
      <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: 13 }}>{title}</p>
      {rows.map(([name, count]) => (
        <div key={name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '2px 0', color: 'var(--muted)' }}>
          <span>{name}</span>
          <span style={{ fontWeight: 600, color: 'var(--text)' }}>{count}</span>
        </div>
      ))}
    </div>
  );
}

/** "Run all sources now" -- the same combined pull + the same summary email
 * the daily cron sends (POST /tachlis/scrape/run-all), but triggered on
 * demand and rendered right here so there's no need to wait for an email
 * to see what a run just pulled. */
function JobsRunAllPanel() {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);

  const run = async () => {
    setError('');
    setResults(null);
    setRunning(true);
    try {
      const resp = await apiRequestRaw('POST', {}, `${JOBS_BASE}/run-all`);
      if (!resp.ok) {
        setError((resp.data && (resp.data.message || resp.data.error)) || 'Run failed. Please try again.');
        return;
      }
      setResults(resp.data);
    } catch (e) {
      setError('Run failed — could not reach the server.');
    } finally {
      setRunning(false);
    }
  };

  const totalAdded = results ? Object.values(results).reduce((sum, r) => sum + (r.added || 0), 0) : 0;
  const totalChecked = results ? Object.values(results).reduce((sum, r) => sum + (r.checked || 0), 0) : 0;
  const totalExcluded = results ? Object.values(results).reduce((sum, r) => sum + (r.excluded_restricted || 0), 0) : 0;
  const totalRemote = results ? Object.values(results).reduce((sum, r) => sum + (r.remote_count || 0), 0) : 0;
  const totalOnsite = results ? Object.values(results).reduce((sum, r) => sum + (r.onsite_count || 0), 0) : 0;

  return (
    <div className="gs-card" style={{ maxWidth: 640, marginBottom: 18 }}>
      <div className="gs-card-body">
        <h4 className="shtick-caption" style={{ margin: '0 0 4px' }}>Run all sources now</h4>
        <p className="admin-empty" style={{ margin: '0 0 14px', fontSize: 13 }}>
          Pulls from every source above in one go and shows the same stats the daily email sends
          (a copy of that email is sent to you too).
        </p>
        <button className="gs-btn gs-btn-primary" onClick={run} disabled={running}>
          {running ? 'Running…' : 'Run all sources now'}
        </button>

        {running && (
          <div className="gs-loading" style={{ marginTop: 14 }}>
            <div className="gs-spinner" />
            <p className="admin-empty" style={{ marginTop: 10 }}>Pulling from all 4 sources — this can take a minute.</p>
          </div>
        )}

        {error && !running && <div className="gs-error-box" style={{ marginTop: 14 }}>{error}</div>}

        {results && !running && (
          <div style={{ marginTop: 16 }}>
            <div className="gs-success-box">
              <CheckCircle2 size={14} /> {totalAdded} new job{totalAdded === 1 ? '' : 's'} added
              {' '}({totalChecked} checked, {totalExcluded} excluded as restricted to another country).
            </div>

            <table style={{ width: '100%', marginTop: 12, fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: 'var(--muted)', textAlign: 'left' }}>
                  <th style={{ fontWeight: 600, padding: '2px 8px 2px 0' }}>Source</th>
                  <th style={{ fontWeight: 600, padding: '2px 8px' }}>Added</th>
                  <th style={{ fontWeight: 600, padding: '2px 8px' }}>Checked</th>
                  <th style={{ fontWeight: 600, padding: '2px 0' }}>Note</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(results).map(([source, r]) => (
                  <tr key={source}>
                    <td style={{ padding: '2px 8px 2px 0' }}>{SOURCE_LABELS[source] || source}</td>
                    <td style={{ padding: '2px 8px', fontWeight: 600 }}>{r.error ? '—' : r.added}</td>
                    <td style={{ padding: '2px 8px', color: 'var(--muted)' }}>{r.error ? '—' : r.checked}</td>
                    <td style={{ padding: '2px 0', color: 'var(--muted)' }}>{r.error || stopLabel(r.stopped_reason)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {(totalRemote + totalOnsite) > 0 && (
              <p style={{ margin: '12px 0 0', fontSize: 13 }}>
                <strong>{totalRemote}</strong> remote &middot; <strong>{totalOnsite}</strong> in Israel
              </p>
            )}
            <TopList title="Top categories added" rows={mergeCounts(results, 'category_counts')} />
            <TopList title="Top locations added" rows={mergeCounts(results, 'location_counts')} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminScrapers() {
  return (
    <div className="admin-scrapers">
      <div style={{ maxWidth: 640 }}>
        <h3 className="shtick-caption admin-section-label" style={{ marginBottom: 6 }}><Newspaper size={16} /> News Scrapers</h3>
        <p className="admin-empty" style={{ margin: '0 0 18px' }}>
          Pull the most-recent articles from each source into the Pending queue for review.
          Each source runs independently. Already-scraped articles are skipped automatically.
        </p>
      </div>
      {SITES.map((site) => (
        <SiteScraper key={site.key} site={site} />
      ))}

      <div style={{ maxWidth: 640, marginTop: 28 }}>
        <h3 className="shtick-caption admin-section-label" style={{ marginBottom: 6 }}><Newspaper size={16} /> GutKol Scrapers</h3>
        <p className="admin-empty" style={{ margin: '0 0 18px' }}>
          Same pending-queue pattern, feeding GutKol's own article queue instead of Shtick's.
        </p>
      </div>
      {NEWS_SITES.map((site) => (
        <SiteScraper key={site.key} site={site} base={NEWS_BASE} />
      ))}

      <div style={{ maxWidth: 640, marginTop: 28 }}>
        <h3 className="shtick-caption admin-section-label" style={{ marginBottom: 6 }}><Briefcase size={16} /> Gut Money Job Scrapers</h3>
        <p className="admin-empty" style={{ margin: '0 0 18px' }}>
          Pull jobs into the Tachlis job board. Unlike the sources above, these go live
          immediately -- no pending queue -- and also run automatically once a day.
          Already-scraped jobs are skipped automatically.
        </p>
      </div>
      <JobsRunAllPanel />
      {JOB_SITES.map((site) => (
        <SiteScraper key={site.key} site={site} base={JOBS_BASE} itemLabel="job" pendingQueue={false} />
      ))}
    </div>
  );
}
