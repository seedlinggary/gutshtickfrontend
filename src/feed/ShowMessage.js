import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import ShowUrl from './ShowURL';
import apiRequest from '../ApiRequest';
import Comments from './Comments';
import ShareButton from '../ShareButton';
import { fetchCategory, fetchData } from '../actions';
import { isLoggedIn } from '../auth';
import formatDate from '../utils/timeAgo';
import { cardGenre } from '../utils/cardGenre';
import { tallyMarks } from '../utils/tally';

function HeartIcon({ filled }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

const ShowMessage = ({ message, pinned }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isLikedId, setIsLikedId] = useState(false);
  const [likeCount, setLikeCount] = useState(message.likes ? message.likes.length : 0);

  const [viewCount, setViewCount] = useState(message.view_count || 0);
  const loggedIn = isLoggedIn();
  const myPublicId = localStorage.getItem('public_id');

  useEffect(() => {
    if (message.likes && myPublicId) {
      message.likes.forEach((like) => {
        if (like.user_id === myPublicId) setIsLikedId(like.id);
      });
    }
  }, []);

  useEffect(() => {
    // Record a view once per browser session per post
    const key = `viewed_${message.id}`;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');
      apiRequest('POST', null, `/shtick/${message.id}/view`)
        .then(() => setViewCount((c) => c + 1))
        .catch(() => {});
    }
  }, [message.id]);

  const handleLike = async () => {
    if (!loggedIn) { navigate('/signin'); return; }
    try {
      const result = await apiRequest('POST', { like_id: isLikedId || null, shtick_id: message.id }, '/like/action');
      if (result === 'deleted') { setIsLikedId(false); setLikeCount((c) => Math.max(0, c - 1)); }
      else if (result?.id) { setIsLikedId(result.id); setLikeCount((c) => c + 1); }
    } catch (_) {}
  };

  const goToFeed = (catId) => {
    dispatch(fetchCategory(String(catId)));
    dispatch(fetchData());
    navigate(`/feed/${catId}`);
  };

  const authorInitial = message.user?.profile_name?.charAt(0).toUpperCase() || '?';
  const allCats = message.categories?.length ? message.categories : message.generalc ? [message.generalc] : [];
  const genre = cardGenre(message);

  return (
    <div className={`gs-card genre-${genre.genre}${pinned ? ' shtick-pinned' : ''}`}>
      <div className="gs-card-body">
        <span className="card-kind">
          {pinned ? '📌 Pinned by the editors' : `${genre.label} · ${allCats[0]?.name || 'Gut Shtick'}`}
        </span>
        {/* Meta row */}
        <div className="shtick-meta">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
            {allCats.map((cat) => (
              <button key={cat.id} className="shtick-badge" onClick={() => goToFeed(cat.id)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                <span className="shtick-badge">{cat.name}</span>
              </button>
            ))}
          </div>
          <span className="shtick-time">
            {formatDate(message.pub_date)}
            <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 8 }} title="Post ID">#{message.id}</span>
          </span>
        </div>

        {/* Caption */}
        <h3 className={pinned ? 'shtick-caption shtick-caption-pinned' : 'shtick-caption'}>{message.caption}</h3>

        {/* Content */}
        {message.content && (
          <blockquote className="shtick-content-block">{message.content.stuff}</blockquote>
        )}

        {/* Image */}
        {message.picture?.url && (
          <img className="shtick-image" src={message.picture.url} alt={message.caption} loading="lazy" />
        )}

        {/* URL */}
        {message.url && <ShowUrl url={message.url.name} />}

        {/* Credit */}
        {message.credit && (
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '8px 0 0' }}>— {message.credit}</p>
        )}

        {/* Footer */}
        <div className="shtick-footer">
          <div className="shtick-author">
            <div className="shtick-author-avatar">{authorInitial}</div>
            <span className="shtick-author-name">{message.user?.profile_name || 'Anonymous'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="view-count" title="Views">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {viewCount}
            </span>
            <button
              className={`like-btn${isLikedId ? ' liked' : ''}`}
              onClick={handleLike}
              title={isLikedId ? 'Unlike' : 'Like'}
            >
              <HeartIcon filled={!!isLikedId} />
              {likeCount > 0 && <span className="tally-marks">{tallyMarks(likeCount)}</span>}
            </button>
            <ShareButton
              title="Gut Shtick"
              text={message.caption}
              url={`${window.location.origin}/post/${message.id}`}
            />
          </div>
        </div>

        {/* Comments — only on approved posts */}
        {message.approved_to_publish && <Comments shtickId={message.id} />}
      </div>
    </div>
  );
};

export default ShowMessage;
