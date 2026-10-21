import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Pencil, Trash2, BookOpen } from 'lucide-react';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';

const CATEGORY_LABEL = {
  parsha: 'Parsha', halacha: 'Halacha', mussar: 'Mussar', stories: 'Stories', holidays: 'Holidays', other: 'Other',
};

export default function PostProfile() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setPost(null);
    setNotFound(false);
    apiRequest('GET', null, `/torah/posts/${slug}`).then(setPost).catch(() => setNotFound(true));
  }, [slug]);

  const toggleLike = async () => {
    if (!isLoggedIn() || !post) return;
    const next = !post.is_liked;
    try {
      await apiRequest(next ? 'POST' : 'DELETE', null, `/torah/posts/${post.id}/like`);
      setPost((p) => ({ ...p, is_liked: next, like_count: p.like_count + (next ? 1 : -1) }));
    } catch (e) { /* ignore */ }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    try {
      await apiRequest('DELETE', null, `/torah/posts/${post.id}`);
      navigate('/my-posts');
    } catch (e) { /* ignore */ }
  };

  if (notFound) {
    return (
      <div className="feed-section"><div className="gs-container" style={{ maxWidth: 820 }}>
        <p>Post not found. <Link to="/">Back to Posts</Link></p>
      </div></div>
    );
  }
  if (!post) {
    return <div className="feed-section"><div className="gs-container"><div className="gs-loading"><div className="gs-spinner" /> Loading…</div></div></div>;
  }

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 820 }}>
        <Link to="/" className="tor-back-link"><ArrowLeft size={13} /> Back to Posts</Link>

        {post.post_type === 'video' && post.youtube_video_id && (
          <div className="tor-video-embed">
            <iframe
              src={`https://www.youtube.com/embed/${post.youtube_video_id}`}
              title={post.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {post.photos && post.photos.length > 0 && (
          <div className="tor-hero-gallery" style={{ marginBottom: 18 }}>
            {post.photos.map((p) => <img key={p.id} src={p.url} alt={post.title} />)}
          </div>
        )}

        <div className="tor-chip active" style={{ display: 'inline-flex', marginBottom: 10, cursor: 'default' }}>{CATEGORY_LABEL[post.category] || post.category}</div>
        <h1 style={{ margin: '0 0 12px' }}>{post.title}</h1>

        {post.body_text && <p style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap', fontSize: 15.5 }}>{post.body_text}</p>}

        <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          {isLoggedIn() && (
            <button type="button" className={`gs-btn gs-btn-outline${post.is_liked ? ' active' : ''}`} onClick={toggleLike}>
              <Heart size={15} fill={post.is_liked ? 'currentColor' : 'none'} /> {post.like_count} {post.like_count === 1 ? 'Like' : 'Likes'}
            </button>
          )}
          {!isLoggedIn() && post.like_count > 0 && (
            <span style={{ color: 'var(--muted)', fontSize: 13.5 }}><Heart size={14} style={{ verticalAlign: -2 }} /> {post.like_count}</span>
          )}
          {post.is_own_post && (
            <>
              <Link to={`/posts/${post.slug}/edit`} className="gs-btn gs-btn-outline"><Pencil size={15} /> Edit</Link>
              <button type="button" className="gs-btn gs-btn-outline" onClick={handleDelete}><Trash2 size={15} /> Delete</button>
            </>
          )}
          <span style={{ color: 'var(--muted-faint)', fontSize: 12.5, marginLeft: 'auto' }}>
            <BookOpen size={12} style={{ verticalAlign: -1 }} /> {post.views_count} views
          </span>
        </div>
      </div>
    </div>
  );
}
