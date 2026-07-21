import React, { useState, useEffect } from 'react';
import { Tweet } from 'react-twitter-widgets';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

function normalizeUrl(raw) {
  if (!raw) return '';
  if (raw.startsWith('http')) return raw;
  if (raw.startsWith('www.')) return 'https://' + raw;
  return 'https://www.' + raw;
}

function getYoutubeEmbedUrl(url) {
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
  const longMatch = url.match(/[?&]v=([^?&]+)/);
  if (longMatch) return `https://www.youtube.com/embed/${longMatch[1]}`;
  return null;
}

function getTweetId(url) {
  const parts = url.split('status/');
  if (parts.length < 2) return null;
  return parts[1].split(/[?&/]/)[0] || null;
}

// TikTok has no plain-iframe embed like YouTube -- oEmbed returns a ready-made
// <blockquote class="tiktok-embed"> snippet that TikTok's own embed.js script
// scans the page for and turns into the actual player. That script is loaded
// once globally and re-triggered (a fresh <script> tag, not a cached one) after
// injecting new HTML, since it doesn't watch the DOM for later insertions.
let tiktokScriptPromise = null;
function loadTiktokScript() {
  if (tiktokScriptPromise) return tiktokScriptPromise;
  tiktokScriptPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://www.tiktok.com/embed.js';
    script.async = true;
    script.onload = resolve;
    script.onerror = resolve; // don't block the fallback link on a load failure
    document.body.appendChild(script);
  });
  return tiktokScriptPromise;
}
// A later embed on an already-loaded page needs a fresh script tag to get
// TikTok's loader to re-scan for new .tiktok-embed blockquotes.
function rescanTiktokEmbeds() {
  const script = document.createElement('script');
  script.src = 'https://www.tiktok.com/embed.js';
  script.async = true;
  document.body.appendChild(script);
}

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function XLinkCard({ url }) {
  const norm = normalizeUrl(url);
  const tweetId = getTweetId(url);
  return (
    <a href={norm} target="_blank" rel="noopener noreferrer" className="x-card">
      <div className="x-card-icon">
        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.257 5.633 5.907-5.633zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </div>
      <div className="x-card-body">
        <span className="x-card-label">View on X / Twitter</span>
        {tweetId && <span className="x-card-id">Post #{tweetId.slice(-6)}</span>}
      </div>
      <ExternalLinkIcon />
    </a>
  );
}

function YoutubeEmbed({ url }) {
  const norm = normalizeUrl(url);
  const embedUrl = getYoutubeEmbedUrl(norm);
  // 'loading' → checking oEmbed | 'embed' → show iframe | 'link' → embedding disabled
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!embedUrl) { setStatus('link'); return; }
    fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(norm)}&format=json`)
      .then((r) => setStatus(r.ok ? 'embed' : 'link'))
      .catch(() => setStatus('link'));
  }, [norm]);

  if (status === 'loading') {
    return (
      <div className="yt-loading">
        <div className="gs-spinner" style={{ width: 24, height: 24 }} />
        <span>Checking video…</span>
      </div>
    );
  }

  if (status === 'embed') {
    return (
      <div className="yt-wrapper">
        <iframe
          className="yt-iframe"
          src={embedUrl}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          title="YouTube video"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <a href={norm} target="_blank" rel="noopener noreferrer" className="yt-link-card">
      <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22" style={{ color: '#ff0000' }}>
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.8 15.5V8.5l6.3 3.5-6.3 3.5z" />
      </svg>
      <span>Watch on YouTube (embedding disabled for this video)</span>
      <ExternalLinkIcon />
    </a>
  );
}

function TiktokEmbed({ url }) {
  const norm = normalizeUrl(url);
  // 'loading' → fetching oEmbed | 'embed' → have the snippet | 'link' → fall back
  const [status, setStatus] = useState('loading');
  const [html, setHtml] = useState('');

  useEffect(() => {
    let cancelled = false;
    // Via our own backend, not TikTok directly -- TikTok's oEmbed doesn't
    // send Access-Control-Allow-Origin, so a direct browser fetch is
    // blocked by CORS (unlike YouTube's oEmbed above, which does allow it).
    fetch(`${API}/media/tiktok-oembed?url=${encodeURIComponent(norm)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (cancelled || !data || !data.html) { setStatus('link'); return; }
        setHtml(data.html);
        setStatus('embed');
      })
      .catch(() => { if (!cancelled) setStatus('link'); });
    return () => { cancelled = true; };
  }, [norm]);

  useEffect(() => {
    if (status !== 'embed') return;
    loadTiktokScript().then(rescanTiktokEmbeds);
  }, [status, html]);

  if (status === 'loading') {
    return (
      <div className="yt-loading">
        <div className="gs-spinner" style={{ width: 24, height: 24 }} />
        <span>Checking video…</span>
      </div>
    );
  }

  if (status === 'embed') {
    return <div className="tiktok-wrapper" dangerouslySetInnerHTML={{ __html: html }} />;
  }

  return (
    <a href={norm} target="_blank" rel="noopener noreferrer" className="yt-link-card">
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z" />
      </svg>
      <span>Watch on TikTok</span>
      <ExternalLinkIcon />
    </a>
  );
}

function TwitterEmbed({ url }) {
  const tweetId = getTweetId(url);
  if (!tweetId) return <XLinkCard url={url} />;
  return (
    <div style={{ margin: '10px 0' }}>
      <Tweet
        tweetId={tweetId}
        options={{ theme: 'light', align: 'left', dnt: true }}
        renderError={() => <XLinkCard url={url} />}
      />
    </div>
  );
}

const ShowUrl = ({ url }) => {
  if (!url) return null;
  const norm = normalizeUrl(url);

  if (url.includes('youtu.be') || url.includes('youtube.com')) {
    return <YoutubeEmbed url={url} />;
  }

  if (url.includes('tiktok.com')) {
    return <TiktokEmbed url={url} />;
  }

  if (url.includes('twitter.com') || url.includes('x.com')) {
    return <TwitterEmbed url={url} />;
  }

  return (
    <a href={norm} target="_blank" rel="noopener noreferrer" className="shtick-url-box">
      <ExternalLinkIcon />
      {norm}
    </a>
  );
};

export default ShowUrl;
