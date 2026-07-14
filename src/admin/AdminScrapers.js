import React, { useState } from 'react';
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
];

const STOP_LABELS = {
  count_reached: 'reached your requested count',
  duplicate_limit: 'hit already-seen articles (duplicate limit)',
  no_more_articles: 'no more new articles in the feed',
};

function stopLabel(reason) {
  return STOP_LABELS[reason] || reason || 'done';
}

function scrapeFetch(source, count) {
  return apiRequestRaw('POST', { count }, `${BASE}/${source}`);
}

function SiteScraper({ site }) {
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
      const resp = await scrapeFetch(site.key, safeCount);
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
          {site.blurb} New articles land in the <strong>Pending</strong> queue — nothing auto-publishes.
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
            ✅ {result.added} new article{result.added === 1 ? '' : 's'} added
            {' '}(stopped: {stopLabel(result.stopped_reason)}).
            {' '}Checked {result.checked}.
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
        <h3 className="shtick-caption" style={{ marginBottom: 6 }}>📰 News Scrapers</h3>
        <p className="admin-empty" style={{ margin: '0 0 18px' }}>
          Pull the most-recent articles from each source into the Pending queue for review.
          Each source runs independently. Already-scraped articles are skipped automatically.
        </p>
      </div>
      {SITES.map((site) => (
        <SiteScraper key={site.key} site={site} />
      ))}
    </div>
  );
}
