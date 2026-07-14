import React, { useEffect, useState, useCallback } from 'react';
import { apiRequestRaw } from '../ApiRequest';
import timeAgo from '../utils/timeAgo';

/**
 * Self-contained SuperAdmin panel: track YouTube channels and pull their new
 * uploads into the pending-approval queue. No required props — fetches its own
 * channel list. Meant to be dropped into a new SuperAdminDashboard tab.
 *
 * Uses apiRequestRaw (not the throwing apiRequest) so it can read the
 * backend's structured `{error: ...}` body — apiRequest only surfaces `message`
 * / status, which would hide the "YOUTUBE_API_KEY not configured" 503 detail we
 * need to show the friendly setup message and stop hammering the API.
 */

const BASE = '/content-pipeline/youtube';

const KEY_MISSING_MSG =
  'YouTube API key not configured yet — ask the site owner to add YOUTUBE_API_KEY to the environment.';

function ytFetch(method, path, body) {
  return apiRequestRaw(method, method !== 'GET' ? (body || {}) : undefined, path);
}

// A response is the missing-key case if it's a 503 whose error mentions the key.
function isKeyMissing({ status, data }) {
  return status === 503 && !!(data && data.error && data.error.includes('YOUTUBE_API_KEY'));
}

// Best-effort human message out of a response body.
function errText({ data }, fallback) {
  if (data && (data.error || data.message)) return data.error || data.message;
  return fallback;
}

export default function AdminYoutubeChannels() {
  const [channels, setChannels] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [input, setInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [result, setResult] = useState(null);
  // Once we've seen the missing-key 503, latch it so we stop firing add/check
  // requests that we know will fail, and show the setup message instead.
  const [keyMissing, setKeyMissing] = useState(false);

  const loadChannels = useCallback(async () => {
    setLoadingList(true);
    try {
      const { ok, data } = await ytFetch('GET', `${BASE}/channels`);
      if (ok && Array.isArray(data)) setChannels(data);
    } catch (e) {
      setError('Failed to load tracked channels.');
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { loadChannels(); }, [loadChannels]);

  const addChannel = async () => {
    setError('');
    setNotice('');
    setResult(null);
    const raw = input.trim();
    if (!raw) {
      setError('Paste a channel URL, @handle, or channel id first.');
      return;
    }
    setAdding(true);
    try {
      const resp = await ytFetch('POST', `${BASE}/channels`, { input: raw });
      if (isKeyMissing(resp)) {
        setKeyMissing(true);
        setAdding(false);
        return;
      }
      if (!resp.ok) {
        setError(errText(resp, 'Could not add that channel.'));
        setAdding(false);
        return;
      }
      setInput('');
      setNotice(resp.data && resp.data.message ? resp.data.message : 'Channel added.');
      await loadChannels();
    } catch (e) {
      setError('Could not add that channel. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  const removeChannel = async (id, name) => {
    setError('');
    setNotice('');
    // Optimistic removal from the list.
    const prev = channels;
    setChannels((cs) => cs.filter((c) => c.id !== id));
    try {
      const { ok } = await ytFetch('DELETE', `${BASE}/channels/${id}`);
      if (!ok) {
        setChannels(prev); // restore on failure
        setError(`Could not remove ${name || 'channel'}.`);
      }
    } catch (e) {
      setChannels(prev);
      setError(`Could not remove ${name || 'channel'}.`);
    }
  };

  const checkAll = async () => {
    setError('');
    setNotice('');
    setResult(null);
    setChecking(true);
    try {
      const resp = await ytFetch('POST', `${BASE}/check`);
      if (isKeyMissing(resp)) {
        setKeyMissing(true);
        setChecking(false);
        return;
      }
      if (!resp.ok) {
        setError(errText(resp, 'Check failed. Please try again.'));
        setChecking(false);
        return;
      }
      setResult(resp.data);
      await loadChannels(); // refresh last-checked timestamps
    } catch (e) {
      setError('Check failed. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="admin-youtube-channels">
      <div className="gs-card" style={{ maxWidth: 640 }}>
        <div className="gs-card-body">
          <h3 className="shtick-caption" style={{ marginBottom: 6 }}>📺 YouTube Channel Monitor</h3>
          <p className="admin-empty" style={{ margin: '0 0 18px' }}>
            Track channels and pull their new uploads into the <strong>Pending</strong> queue
            for review — nothing is auto-published. Videos post as embedded players.
          </p>

          {keyMissing && (
            <div className="gs-error-box" style={{ marginBottom: 16 }}>
              {KEY_MISSING_MSG}
            </div>
          )}

          {/* Add channel */}
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 14 }}>
            Add a channel
          </label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <input
              type="text"
              className="auth-input"
              placeholder="Channel URL, @handle, or UC… id"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !adding && !keyMissing) addChannel(); }}
              disabled={adding || keyMissing}
              style={{ flex: 1 }}
            />
            <button
              className="gs-btn gs-btn-primary"
              onClick={addChannel}
              disabled={adding || keyMissing || !input.trim()}
            >
              {adding ? 'Adding…' : 'Add'}
            </button>
          </div>
          <p className="admin-empty" style={{ margin: '0 0 18px', fontSize: 13 }}>
            Accepts youtube.com/@handle, /channel/UC…, /c/Name, /user/Name, or a raw channel id.
          </p>

          {/* Check all */}
          <button
            className="gs-btn gs-btn-primary"
            onClick={checkAll}
            disabled={checking || keyMissing || channels.length === 0}
            style={{ width: '100%', marginBottom: 4 }}
          >
            {checking ? 'Checking channels…' : 'Check All Now'}
          </button>
          <p className="admin-empty" style={{ margin: '0 0 18px', fontSize: 13 }}>
            Hits the live YouTube API — can take a few seconds per channel.
          </p>

          {checking && (
            <div className="gs-loading" style={{ marginBottom: 16 }}>
              <div className="gs-spinner" />
              <p className="admin-empty" style={{ marginTop: 10 }}>
                Checking each channel for new uploads — hang tight.
              </p>
            </div>
          )}

          {error && <div className="gs-error-box" style={{ marginBottom: 16 }}>{error}</div>}
          {notice && !error && <div className="gs-success-box" style={{ marginBottom: 16 }}>{notice}</div>}

          {result && !checking && (
            <div className="gs-success-box" style={{ marginBottom: 16 }}>
              ✅ {result.total_new_videos} new video{result.total_new_videos === 1 ? '' : 's'} added to Pending.
              {Array.isArray(result.channels) && result.channels.some((c) => c.new_videos > 0 || c.error) && (
                <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                  {result.channels
                    .filter((c) => c.new_videos > 0 || c.error)
                    .map((c, i) => (
                      <li key={i}>
                        {c.channel}: {c.error ? `error — ${c.error}` : `${c.new_videos} new`}
                      </li>
                    ))}
                </ul>
              )}
            </div>
          )}

          {/* Channel list */}
          <h4 style={{ margin: '8px 0 10px', fontSize: 15 }}>
            Tracked channels {channels.length > 0 && `(${channels.length})`}
          </h4>
          {loadingList ? (
            <p className="admin-empty">Loading…</p>
          ) : channels.length === 0 ? (
            <p className="admin-empty">No channels tracked yet. Add one above.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {channels.map((c) => (
                <li
                  key={c.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.08)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.display_name || c.channel_id}
                    </div>
                    <div className="admin-empty" style={{ fontSize: 12 }}>
                      Last checked: {c.last_checked_at ? timeAgo(c.last_checked_at) : 'never'}
                    </div>
                  </div>
                  <button
                    className="gs-btn"
                    onClick={() => removeChannel(c.id, c.display_name)}
                    style={{ flexShrink: 0 }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
