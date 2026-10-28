import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Plus, Eye, MessageCircle } from 'lucide-react';
import apiRequest from '../ApiRequest';
import { PostCard } from './Tachlis';

const STATUS_LABEL = { active: 'Active', filled: 'Filled' };

/** Stage 5's poster dashboard for the Job Board -- views/contact-taps at a
 * glance for everything the user has posted, including expired/filled
 * ones kept here for their own records (same reasoning as Estates' own
 * /estates/my/listings). Renew/mark-filled controls live on the post's own
 * detail page (TachlisPostPage.js); "Manage" links through to them. */
export default function MyPosts() {
  const [posts, setPosts] = useState(null);

  useEffect(() => {
    apiRequest('GET', null, '/tachlis/my/posts').then((d) => setPosts(d.posts || [])).catch(() => setPosts([]));
  }, []);

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 680 }}>
        <h1 style={{ margin: '0 0 4px' }}><Briefcase size={20} style={{ verticalAlign: -2 }} /> My Job Board Posts</h1>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>
          Everything you've posted, including expired or filled posts kept here for your own records.
        </p>

        <div className="biz-list-cta" style={{ marginBottom: 14 }}>
          <Link to="/tachlis?new=1" className="gs-btn gs-btn-primary"><Plus size={15} /> Post to the Job Board</Link>
        </div>

        {posts === null && <div className="gs-loading"><div className="gs-spinner" /> Loading…</div>}
        {posts && posts.length === 0 && <p className="est-empty">You haven't posted anything yet.</p>}

        {posts && posts.map((p) => (
          <div key={p.id}>
            <PostCard post={p} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: -8, marginBottom: 14, fontSize: 13, color: 'var(--muted)', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Eye size={13} /> {p.views_count || 0} views</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MessageCircle size={13} /> {p.contact_taps || 0} contact taps</span>
              {p.status !== 'active' && <span className="admin-badge rejected">{STATUS_LABEL[p.status] || p.status}</span>}
              {p.is_expired && p.status === 'active' && <span className="admin-badge rejected">Expired</span>}
              <Link to={`/tachlis/post/${p.id}`} style={{ marginLeft: 'auto' }}>Manage →</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
