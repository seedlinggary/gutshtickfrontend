import React, { useEffect, useState } from 'react';
import { Newspaper, Sunrise, Home as HomeIcon, Briefcase } from 'lucide-react';
import apiRequest from './ApiRequest';
import { siteUrl } from './siteMode';
import ShareButton from './ShareButton';
import { formatPrice } from './estates/ListingCard';

const LISTING_TYPE_LABEL = { sale: 'For Sale', long_term_lease: 'For Rent', short_term_lease: 'Short-Term' };

/** Groups a flat list by `keyFn`, dropping items where keyFn returns falsy
 * into an "Other" bucket -- used for both Estates' area grouping and
 * Tachlis' category grouping below, same shape either way. */
function groupBy(items, keyFn, otherLabel) {
  const groups = new Map();
  for (const item of items) {
    const key = keyFn(item) || otherLabel;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
}

function EstateRow({ listing }) {
  return (
    <a href={siteUrl('estates', `/listings/${listing.slug}`)} target="_blank" rel="noopener noreferrer" className="today-row">
      {listing.cover_photo_url && <img src={listing.cover_photo_url} alt="" className="today-row-img" />}
      <div className="today-row-body">
        <div dir="auto" className="today-row-title">{listing.title}</div>
        <div className="today-row-sub">
          {LISTING_TYPE_LABEL[listing.listing_type] || listing.listing_type} · {formatPrice(listing)}
        </div>
      </div>
    </a>
  );
}

function JobRow({ job }) {
  const bits = [job.location, job.remote ? 'Remote' : null, job.compensation].filter(Boolean);
  return (
    <a href={siteUrl('money', `/tachlis/post/${job.id}`)} target="_blank" rel="noopener noreferrer" className="today-row">
      <div className="today-row-body">
        <div dir="auto" className="today-row-title">{job.title}</div>
        {bits.length > 0 && <div className="today-row-sub">{bits.join(' · ')}</div>}
      </div>
    </a>
  );
}

export default function TodayOnGut() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiRequest('GET', null, '/feed/today')
      .then(setData)
      .catch(() => setError(true));
  }, []);

  const estatesGroups = data ? groupBy(data.estates, (l) => l.area, 'Other areas') : [];
  const jobsGroups = data ? groupBy(data.jobs, (j) => j.category, 'Other') : [];
  const totalCount = data ? data.estates.length + data.jobs.length : 0;
  const updatedAt = data ? new Date(data.generated_at) : null;

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 820 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 4 }}>
          <h1 style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: 8 }}><Newspaper size={22} /> Today on GUT</h1>
          <ShareButton
            title="Today on GUT"
            text={`${totalCount} new homes and jobs posted today across GUT -- `}
            url={typeof window !== 'undefined' ? window.location.href : ''}
          />
        </div>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>
          Every new listing and job posted across GUT in the last 24 hours. Paste this link back into the group.
          {updatedAt && (
            <> Updated {updatedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.</>
          )}
        </p>

        {!data && !error && <div className="gs-loading"><div className="gs-spinner" /> Loading…</div>}
        {error && <div className="gs-error-box">Couldn't load today's new posts. Please try again.</div>}

        {data && totalCount === 0 && (
          <div className="gs-empty">
            <div className="gs-empty-icon"><Sunrise size={26} /></div>
            <p>Nothing new in the last 24 hours yet -- check back soon.</p>
          </div>
        )}

        {data && data.estates.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: 18, display: 'inline-flex', alignItems: 'center', gap: 6 }}><HomeIcon size={16} /> New homes ({data.estates.length})</h2>
            {estatesGroups.map(([area, items]) => (
              <div key={area} className="today-group">
                <div className="today-group-label">{area} <span className="today-group-count">({items.length})</span></div>
                {items.map((l) => <EstateRow key={l.id} listing={l} />)}
              </div>
            ))}
          </div>
        )}

        {data && data.jobs.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: 18, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Briefcase size={16} /> New jobs ({data.jobs.length})</h2>
            {jobsGroups.map(([category, items]) => (
              <div key={category} className="today-group">
                <div className="today-group-label">{category} <span className="today-group-count">({items.length})</span></div>
                {items.map((j) => <JobRow key={j.id} job={j} />)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
