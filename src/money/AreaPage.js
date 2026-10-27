import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Briefcase } from 'lucide-react';
import apiRequest from '../ApiRequest';
import ShareButton from '../ShareButton';
import { PostCard } from './Tachlis';

const TYPE_LABEL = { job: 'Jobs', resume: 'Resumes' };

/** One "jobs in <area>" landing page per job location -- live count and the
 * newest 20 posts. Stage 2 of gut_next_level_agent.md ("Neighborhood and
 * city pages"). SEO title/description come from api/render.js
 * (kind=money_area), not this component -- see vercel.json's
 * host-conditioned rewrite for /tachlis/areas/:slug on gutmoney.com. */
export default function AreaPage() {
  const { areaSlug } = useParams();
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setData(null);
    setNotFound(false);
    apiRequest('GET', null, `/tachlis/areas/${areaSlug}`)
      .then(setData)
      .catch(() => setNotFound(true));
  }, [areaSlug]);

  if (notFound) {
    return (
      <div className="feed-section"><div className="gs-container" style={{ maxWidth: 680 }}>
        <p>No posts found for this area. <Link to="/tachlis">Back to the Job Board</Link></p>
      </div></div>
    );
  }
  if (!data) {
    return <div className="feed-section"><div className="gs-container"><div className="gs-loading"><div className="gs-spinner" /> Loading…</div></div></div>;
  }

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 680 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 6 }}>
          <h1 style={{ margin: 0 }}><MapPin size={20} style={{ verticalAlign: -2 }} /> Jobs in {data.area}</h1>
          <ShareButton
            title={`Jobs in ${data.area}`}
            text={`${data.count} job post${data.count === 1 ? '' : 's'} in ${data.area} on Gut Money`}
            url={typeof window !== 'undefined' ? window.location.href : ''}
          />
        </div>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>
          {data.count} post{data.count === 1 ? '' : 's'}
          {Object.keys(data.by_type).length > 0 && (
            <> ({Object.entries(data.by_type).map(([t, n]) => `${n} ${(TYPE_LABEL[t] || t).toLowerCase()}`).join(', ')})</>
          )}
        </p>

        {data.posts.length === 0 ? (
          <div className="gs-empty"><p>No posts in {data.area} right now.</p></div>
        ) : (
          data.posts.map((post) => <PostCard key={post.id} post={post} />)
        )}

        <Link to="/tachlis" className="gs-btn gs-btn-outline" style={{ marginTop: 10 }}>
          <Briefcase size={15} /> Browse the full Job Board
        </Link>
      </div>
    </div>
  );
}
