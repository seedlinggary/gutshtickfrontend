import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import ShareButton from '../ShareButton';
import { isLoggedIn, isAdmin } from '../auth';
import timeAgo from '../utils/timeAgo';

const MAX_INDENT_DEPTH = 6; // stop indenting past this so deep threads stay readable

function HeartIcon({ filled }) {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

// ── Immutable tree helpers (comments nest arbitrarily deep via `.replies`) ──
function mapTree(nodes, id, fn) {
  return nodes.map((n) => {
    if (n.id === id) return fn(n);
    if (n.replies && n.replies.length) {
      return { ...n, replies: mapTree(n.replies, id, fn) };
    }
    return n;
  });
}
function removeFromTree(nodes, id) {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => (n.replies && n.replies.length ? { ...n, replies: removeFromTree(n.replies, id) } : n));
}
function countSubtree(node) {
  if (!node.replies || !node.replies.length) return 0;
  return node.replies.reduce((acc, r) => acc + 1 + countSubtree(r), 0);
}

function CommentNode({ comment, depth, postId, myPublicId, boss, loggedIn, onTreeChange }) {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(!!comment.liked_by_me);
  const [likeCount, setLikeCount] = useState(comment.like_count || 0);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [busy, setBusy] = useState(false);

  const isOwner = comment.user_id && comment.user_id === myPublicId;
  const canDelete = isOwner || boss;
  const indent = Math.min(depth, MAX_INDENT_DEPTH) * 16;

  const like = async () => {
    if (!loggedIn) { navigate('/signin'); return; }
    if (busy) return;
    setBusy(true);
    try {
      const res = await apiRequest('POST', {}, `/hock/comments/${comment.id}/like`);
      setLiked(res.liked);
      setLikeCount(res.like_count);
    } catch (_) {}
    setBusy(false);
  };

  const submitReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setBusy(true);
    try {
      const created = await apiRequest('POST', {
        text: replyText.trim(),
        hock_post_id: postId,
        parent_comment_id: comment.id,
      }, '/hock/comments');
      created.replies = created.replies || [];
      onTreeChange((tree) => mapTree(tree, comment.id, (n) => ({
        ...n,
        replies: [...(n.replies || []), created],
      })));
      setReplyText('');
      setReplying(false);
    } catch (_) {}
    setBusy(false);
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editText.trim()) return;
    setBusy(true);
    try {
      const updated = await apiRequest('PATCH', { text: editText.trim() }, `/hock/comments/${comment.id}`);
      onTreeChange((tree) => mapTree(tree, comment.id, (n) => ({
        ...n,
        text: updated.text,
        edited_at: updated.edited_at,
      })));
      setEditing(false);
    } catch (_) {}
    setBusy(false);
  };

  const del = async () => {
    const subtree = countSubtree(comment);
    const msg = subtree > 0
      ? `Delete this comment and its ${subtree} repl${subtree === 1 ? 'y' : 'ies'}? This can't be undone.`
      : 'Delete this comment?';
    if (!window.confirm(msg)) return;
    setBusy(true);
    try {
      await apiRequest('DELETE', null, `/hock/comments/${comment.id}`);
      onTreeChange((tree) => removeFromTree(tree, comment.id));
    } catch (_) { setBusy(false); }
  };

  const authorInitial = comment.user?.profile_name?.charAt(0).toUpperCase() || '?';

  return (
    <div style={{ marginLeft: indent, marginTop: 12, borderLeft: depth > 0 ? '2px solid var(--border, #e5e7eb)' : 'none', paddingLeft: depth > 0 ? 12 : 0 }}>
      <div className="comment-item" style={{ display: 'flex', gap: 8 }}>
        <div className="comment-avatar">{authorInitial}</div>
        <div className="comment-content" style={{ flex: 1 }}>
          <div className="comment-meta">
            <span className="comment-author">{comment.user?.profile_name || 'User'}</span>
            <span className="comment-time">
              {timeAgo(comment.pub_date)}{comment.edited_at ? ' · edited' : ''}
            </span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }} title="Comment ID">#{comment.id}</span>
          </div>

          {editing ? (
            <form onSubmit={submitEdit} style={{ marginTop: 6 }}>
              <textarea
                className="gs-input gs-textarea"
                value={editText}
                rows={3}
                onChange={(e) => setEditText(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button type="submit" className="gs-btn gs-btn-primary gs-btn-sm" disabled={busy}>Save</button>
                <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => { setEditing(false); setEditText(comment.text); }}>Cancel</button>
              </div>
            </form>
          ) : (
            <p className="comment-text" style={{ whiteSpace: 'pre-wrap' }}>{comment.text}</p>
          )}

          {!editing && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
              <button className={`like-btn${liked ? ' liked' : ''}`} onClick={like} disabled={busy} title={liked ? 'Unlike' : 'Like'}>
                <HeartIcon filled={liked} />{likeCount > 0 && <span>{likeCount}</span>}
              </button>
              {loggedIn && (
                <button className="comment-action-link" onClick={() => setReplying((r) => !r)}>Reply</button>
              )}
              {isOwner && (
                <button className="comment-action-link" onClick={() => { setEditing(true); setEditText(comment.text); }}>Edit</button>
              )}
              {canDelete && (
                <button className="comment-action-link" style={{ color: 'var(--danger)' }} onClick={del} disabled={busy}>Delete</button>
              )}
            </div>
          )}

          {replying && (
            <form onSubmit={submitReply} style={{ marginTop: 8 }}>
              <textarea
                className="gs-input gs-textarea"
                placeholder="Write a reply…"
                value={replyText}
                rows={2}
                onChange={(e) => setReplyText(e.target.value)}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button type="submit" className="gs-btn gs-btn-primary gs-btn-sm" disabled={busy || !replyText.trim()}>Reply</button>
                <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => { setReplying(false); setReplyText(''); }}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>

      {comment.replies && comment.replies.map((child) => (
        <CommentNode
          key={child.id}
          comment={child}
          depth={depth + 1}
          postId={postId}
          myPublicId={myPublicId}
          boss={boss}
          loggedIn={loggedIn}
          onTreeChange={onTreeChange}
        />
      ))}
    </div>
  );
}

export default function HockPostPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [editingPost, setEditingPost] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');

  const loggedIn = isLoggedIn();
  const boss = isAdmin();
  const myPublicId = localStorage.getItem('public_id');

  useEffect(() => {
    setLoading(true);
    setError(false);
    apiRequest('GET', null, `/hock/posts/${id}`)
      .then((data) => {
        setPost(data);
        setComments(data.comments || []);
        setLiked(!!data.liked_by_me);
        setLikeCount(data.like_count || 0);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  const likePost = async () => {
    if (!loggedIn) { navigate('/signin'); return; }
    try {
      const res = await apiRequest('POST', {}, `/hock/posts/${id}/like`);
      setLiked(res.liked);
      setLikeCount(res.like_count);
    } catch (_) {}
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setPostingComment(true);
    try {
      const created = await apiRequest('POST', {
        text: newComment.trim(),
        hock_post_id: Number(id),
      }, '/hock/comments');
      created.replies = created.replies || [];
      setComments((prev) => [...prev, created]);
      setNewComment('');
    } catch (_) {}
    setPostingComment(false);
  };

  const savePostEdit = async (e) => {
    e.preventDefault();
    if (!editTitle.trim() || !editBody.trim()) return;
    try {
      const updated = await apiRequest('PATCH', { title: editTitle.trim(), body: editBody.trim() }, `/hock/posts/${id}`);
      setPost((p) => ({ ...p, title: updated.title, body: updated.body, edited_at: updated.edited_at }));
      setEditingPost(false);
    } catch (_) {}
  };

  const deletePost = async () => {
    if (!window.confirm('Delete this post and all its comments? This can\'t be undone.')) return;
    try {
      await apiRequest('DELETE', null, `/hock/posts/${id}`);
      navigate('/hock');
    } catch (_) {}
  };

  const isOwner = post && post.user_id === myPublicId;
  const totalComments = post?.comment_count ?? comments.length;
  const shareExcerpt = post?.body?.length > 100 ? `${post.body.slice(0, 100)}…` : post?.body;

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 680 }}>
        <Link to="/hock" className="gs-btn gs-btn-outline gs-btn-sm" style={{ marginBottom: 12, display: 'inline-block' }}>
          ← Back to Hock
        </Link>

        {loading && <div className="gs-loading"><div className="gs-spinner" /> Loading…</div>}

        {!loading && error && (
          <div className="gs-empty">
            <p style={{ fontSize: 40, marginBottom: 8 }}>🤷</p>
            <p>This post isn't available — it may have been removed.</p>
          </div>
        )}

        {!loading && post && (
          <>
            <div className="gs-card">
              <div className="gs-card-body">
                <div className="shtick-meta">
                  <div className="shtick-author" style={{ flex: 1 }}>
                    <div className="shtick-author-avatar">
                      {post.user?.profile_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <span className="shtick-author-name">{post.user?.profile_name || 'Anonymous'}</span>
                  </div>
                  <span className="shtick-time">
                    {timeAgo(post.pub_date)}{post.edited_at ? ' · edited' : ''}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 8 }} title="Post ID">#{post.id}</span>
                </div>

                {editingPost ? (
                  <form onSubmit={savePostEdit} style={{ marginTop: 10 }}>
                    <input className="gs-input" value={editTitle} maxLength={200}
                      onChange={(e) => setEditTitle(e.target.value)} style={{ marginBottom: 8 }} />
                    <textarea className="gs-input gs-textarea" value={editBody} rows={6}
                      onChange={(e) => setEditBody(e.target.value)} />
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <button type="submit" className="gs-btn gs-btn-primary gs-btn-sm">Save</button>
                      <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setEditingPost(false)}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <h1 className="shtick-caption" style={{ fontSize: 24 }}>{post.title}</h1>
                    <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, margin: '10px 0 0' }}>{post.body}</p>
                    {post.image_url && (
                      <img className="shtick-image" src={post.image_url} alt={post.title} loading="lazy" />
                    )}
                  </>
                )}

                <div className="shtick-footer" style={{ gap: 14 }}>
                  <button className={`like-btn${liked ? ' liked' : ''}`} onClick={likePost} title={liked ? 'Unlike' : 'Like'}>
                    <HeartIcon filled={liked} />{likeCount > 0 && <span>{likeCount}</span>}
                  </button>
                  <span className="like-btn" style={{ cursor: 'default' }}>💬 {totalComments}</span>
                  <ShareButton
                    title={post.title}
                    text={shareExcerpt}
                    url={`${window.location.origin}/hock/post/${post.id}`}
                  />
                  {isOwner && !editingPost && (
                    <button className="comment-action-link" onClick={() => { setEditingPost(true); setEditTitle(post.title); setEditBody(post.body); }}>Edit</button>
                  )}
                  {(isOwner || boss) && (
                    <button className="comment-action-link" style={{ color: 'var(--danger)' }} onClick={deletePost}>Delete</button>
                  )}
                </div>
              </div>
            </div>

            {/* Comments */}
            <div className="gs-card" style={{ marginTop: 16 }}>
              <div className="gs-card-body">
                <h3 style={{ marginTop: 0 }}>
                  {totalComments} comment{totalComments !== 1 ? 's' : ''}
                </h3>

                {loggedIn ? (
                  <form onSubmit={submitComment} style={{ marginBottom: 16 }}>
                    <textarea
                      className="gs-input gs-textarea"
                      placeholder="Add to the conversation…"
                      value={newComment}
                      rows={3}
                      onChange={(e) => setNewComment(e.target.value)}
                    />
                    <button type="submit" className="gs-btn gs-btn-primary gs-btn-sm" style={{ marginTop: 8 }}
                      disabled={postingComment || !newComment.trim()}>
                      {postingComment ? 'Posting…' : 'Comment'}
                    </button>
                  </form>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                    <Link to="/signin">Sign in</Link> to join the conversation.
                  </p>
                )}

                {comments.length === 0 && (
                  <div style={{ color: 'var(--muted)', fontSize: 14, padding: '8px 0' }}>
                    No comments yet. Be the first!
                  </div>
                )}

                {comments.map((c) => (
                  <CommentNode
                    key={c.id}
                    comment={c}
                    depth={0}
                    postId={Number(id)}
                    myPublicId={myPublicId}
                    boss={boss}
                    loggedIn={loggedIn}
                    onTreeChange={setComments}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
