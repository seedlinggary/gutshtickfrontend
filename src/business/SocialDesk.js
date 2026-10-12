import React, { useEffect, useState } from 'react';
import { ThumbsUp, Camera, MapPinned, AtSign, Briefcase, Music2, MessageCircle, Sparkles } from 'lucide-react';
import apiRequest from '../ApiRequest';

// Generic, non-logo icons tinted in each platform's brand color -- enough to
// tell the platforms apart at a glance without reproducing any of their
// actual trademarked marks.
const PLATFORM_META = {
  facebook: { label: 'Facebook', Icon: ThumbsUp, color: '#1877F2' },
  instagram: { label: 'Instagram', Icon: Camera, color: '#C13584' },
  google: { label: 'Google Business Profile', Icon: MapPinned, color: '#1a73e8' },
  x: { label: 'X (Twitter)', Icon: AtSign, color: '#0f1419' },
  linkedin: { label: 'LinkedIn', Icon: Briefcase, color: '#0a66c2' },
  tiktok: { label: 'TikTok', Icon: Music2, color: '#111' },
  whatsapp: { label: 'WhatsApp Status', Icon: MessageCircle, color: '#25D366' },
};

const CAPTION_MAX = 2200;

/** The flagship "social desk": connect Facebook/Instagram/Google/X/LinkedIn
 * via OAuth, or hand TikTok/WhatsApp Status off to the phone's own share
 * sheet (no public API exists for posting to either -- see the backend's
 * social/publishers.py), and compose one post that fans out to everything
 * that's connected. */
export default function SocialDesk({ businessId }) {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState([]);
  const [caption, setCaption] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [posts, setPosts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [templates, setTemplates] = useState([]);

  const loadStatus = () => apiRequest('GET', null, `/business/businesses/${businessId}/social/status`).then(setStatus).catch(setError);
  const loadPosts = () => apiRequest('GET', null, `/business/businesses/${businessId}/social/posts`).then(setPosts).catch(() => {});

  useEffect(() => {
    loadStatus();
    loadPosts();
    apiRequest('GET', null, `/business/businesses/${businessId}/social/campaign-templates`).then(setTemplates).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const social = params.get('social');
    if (social === 'connected') setNotice('Connected!');
    else if (social === 'error') setNotice(params.get('message') || 'Could not connect that account');
    if (social) {
      loadStatus();
      const url = new URL(window.location.href);
      url.searchParams.delete('social');
      url.searchParams.delete('message');
      window.history.replaceState({}, '', url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = (platform) => {
    apiRequest('POST', {}, `/business/businesses/${businessId}/social/connect/${platform}`)
      .then((res) => { window.location.href = res.authorize_url; })
      .catch((err) => setNotice(typeof err === 'string' ? err : `Couldn't start connecting ${platform}`));
  };

  const disconnect = (platform) => {
    const label = PLATFORM_META[platform]?.label || platform;
    if (!window.confirm(`Disconnect ${label}? You'll need to reconnect (and re-authorize) it to post there again.`)) return;
    apiRequest('DELETE', null, `/business/businesses/${businessId}/social/disconnect/${platform}`)
      .then(loadStatus)
      .catch(() => setNotice(`Couldn't disconnect ${label} -- try again.`));
  };

  const togglePlatform = (platform) => {
    setSelected((cur) => (cur.includes(platform) ? cur.filter((p) => p !== platform) : [...cur, platform]));
  };

  const shareToDevice = async (postId, platform) => {
    const res = await apiRequest('GET', null, `/business/businesses/${businessId}/social/posts/${postId}/share-payload/${platform}`);
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Gut Community', text: res.caption, url: res.media_url || undefined });
        return;
      } catch (e) { /* user cancelled */ }
    }
    try {
      await navigator.clipboard.writeText(res.caption);
      setNotice(`Caption copied -- paste it into ${PLATFORM_META[platform]?.label || platform} to post.`);
      setTimeout(() => setNotice((n) => (n?.startsWith('Caption copied') ? null : n)), 4000);
    } catch (e) {
      window.prompt('Copy this caption:', res.caption);
    }
  };

  const submitPost = (e) => {
    e.preventDefault();
    if (!caption.trim() || selected.length === 0 || busy) return;
    setBusy(true);
    apiRequest('POST', {
      caption: caption.trim(),
      platforms: selected,
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
    }, `/business/businesses/${businessId}/social/posts`)
      .then(() => { setCaption(''); setSelected([]); setScheduledAt(''); loadPosts(); })
      .catch((err) => setNotice(typeof err === 'string' ? err : 'Could not create that post'))
      .finally(() => setBusy(false));
  };

  if (error) return <p className="biz-error">Could not load the social desk.</p>;
  if (!status) return <p>Loading...</p>;

  return (
    <div className="biz-social-desk">
      {notice && <p className="biz-social-notice">{notice}</p>}

      <div className="biz-social-accounts">
        {status.map((row) => {
          const meta = PLATFORM_META[row.platform] || { label: row.platform, Icon: Sparkles, color: 'var(--muted)' };
          return (
            <div key={row.platform} className={`biz-social-account-card${row.connected ? ' biz-social-account-connected' : ''}`}>
              <div className="biz-social-account-icon" style={{ color: meta.color }}><meta.Icon size={22} /></div>
              <div className="biz-social-account-info">
                <strong>{meta.label}</strong>
                {row.mode === 'share_sheet' ? (
                  <span className="biz-social-mode-tag">Share-sheet -- no posting API exists for this platform</span>
                ) : row.connected ? (
                  <span className="biz-social-mode-tag">Connected as {row.account?.external_account_name || 'account'}</span>
                ) : row.configured ? (
                  <span className="biz-social-mode-tag">Not connected</span>
                ) : (
                  <span className="biz-social-mode-tag biz-social-mode-tag-warn">Not configured on this deployment yet</span>
                )}
              </div>
              {row.mode === 'api' && row.configured && (
                row.connected ? (
                  <button type="button" className="biz-social-disconnect" onClick={() => disconnect(row.platform)}>Disconnect</button>
                ) : (
                  <button type="button" className="biz-social-connect" onClick={() => connect(row.platform)}>Connect</button>
                )
              )}
            </div>
          );
        })}
      </div>

      <form className="biz-social-composer" onSubmit={submitPost}>
        <h3>Compose</h3>
        {templates.length > 0 && (
          <div className="biz-campaign-templates">
            <div className="biz-campaign-templates-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Sparkles size={14} /> Seasonal suggestions</div>
            <div className="biz-campaign-templates-row">
              {templates.map((tpl) => (
                <button
                  key={tpl.holiday}
                  type="button"
                  className="biz-campaign-template-chip"
                  onClick={() => setCaption(tpl.caption)}
                  title={tpl.caption}
                >
                  {tpl.holiday}{tpl.days_away != null && ` (in ${tpl.days_away}d)`}
                </button>
              ))}
            </div>
          </div>
        )}
        <textarea
          value={caption} maxLength={CAPTION_MAX} placeholder="What's the update?"
          onChange={(e) => setCaption(e.target.value)}
        />
        <div className="biz-social-platform-picker">
          {status.map((row) => {
            const meta = PLATFORM_META[row.platform];
            const PickIcon = meta?.Icon;
            return (
              <label key={row.platform} className={`biz-social-pick${selected.includes(row.platform) ? ' biz-social-pick-active' : ''}`}>
                <input
                  type="checkbox"
                  checked={selected.includes(row.platform)}
                  disabled={row.mode === 'api' && !row.connected}
                  onChange={() => togglePlatform(row.platform)}
                />
                {PickIcon && <PickIcon size={14} />} {meta?.label}
              </label>
            );
          })}
        </div>
        <label className="biz-social-schedule">
          Schedule for later (optional):
          <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
        </label>
        <button type="submit" disabled={busy || !caption.trim() || selected.length === 0}>
          {scheduledAt ? 'Schedule post' : 'Post now'}
        </button>
      </form>

      <div className="biz-social-history">
        <h3>Recent posts</h3>
        {posts.length === 0 && <p className="biz-empty">Nothing posted yet.</p>}
        {posts.map((post) => (
          <div key={post.id} className="biz-social-post-row">
            <p className="biz-social-post-caption">{post.caption}</p>
            <div className="biz-social-post-targets">
              {post.targets.map((tgt) => {
                const TargetIcon = PLATFORM_META[tgt.platform]?.Icon;
                return (
                  <span key={tgt.id} className={`biz-social-target-chip biz-social-target-${tgt.status}`}>
                    {TargetIcon && <TargetIcon size={12} />} {tgt.platform}: {tgt.status.replace('_', ' ')}
                    {tgt.status === 'share_pending' && (
                      <button type="button" onClick={() => shareToDevice(post.id, tgt.platform)}>Share now</button>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
