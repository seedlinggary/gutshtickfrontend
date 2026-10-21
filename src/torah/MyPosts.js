import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Plus } from 'lucide-react';
import apiRequest from '../ApiRequest';
import PostCard from './PostCard';

export default function MyPosts() {
  const [posts, setPosts] = useState(null);

  useEffect(() => {
    apiRequest('GET', null, '/torah/my/posts').then((d) => setPosts(d.posts || [])).catch(() => setPosts([]));
  }, []);

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 1180 }}>
        <div className="tor-masthead">
          <div className="tor-masthead-kicker"><BookOpen size={13} /> Your account</div>
          <h1 className="tor-masthead-title">My Posts</h1>
          <p className="tor-masthead-sub">Everything you've shared.</p>
        </div>

        <div className="biz-list-cta">
          <Link to="/posts/new" className="gs-btn gs-btn-primary"><Plus size={15} /> Share Torah</Link>
        </div>

        {posts === null && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
        {posts && posts.length === 0 && <p className="tor-empty">You haven't shared anything yet.</p>}
        {posts && posts.length > 0 && (
          <div className="tor-post-grid">
            {posts.map((p) => <PostCard key={p.id} post={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
