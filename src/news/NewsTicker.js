import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Radio } from 'lucide-react';
import apiRequest from '../ApiRequest';
import timeAgo from '../utils/timeAgo';

const FALLBACK_ROTATE_MS = 5000;
// Constant reading speed for the scrolling marquee, in pixels/second. The
// old CSS used one fixed animation-duration (e.g. 55s) for the whole
// loop regardless of how much text was in it -- that's a fixed TIME for
// a variable DISTANCE (the track is the items doubled end-to-end), so
// actual px/sec speed scaled up with the item count. Whenever the news
// pipeline produced more live items than it had the day this was last
// tuned, the same 55s now had to cover a much longer track and the
// ticker visibly sped up -- which is exactly the "it's going very fast
// again" complaint. Measuring the real track width and deriving the
// duration from it keeps px/sec constant no matter how many items are
// live at once.
const TICKER_PX_PER_SECOND = 70;
const MIN_TICKER_DURATION_S = 12;

function renderText(item) {
  if (!item.link_url) return item.text;
  return item.link_url.startsWith('/')
    ? <Link to={item.link_url}>{item.text}</Link>
    : <a href={item.link_url} target="_blank" rel="noreferrer">{item.text}</a>;
}

/** The last-24-hours widget shown on every GutKol page (mounted once, in
 * NewsNavbar.js): a horizontal scrolling strip of EVERY live item running
 * continuously, plus a "Next Up" box beside it that steps through the
 * same items one at a time, advancing on a timer (see
 * backend/news/routes/news_ticker.py's /live, which already merges
 * ticker blurbs with recent article headlines and sorts newest-first --
 * this component just renders what it's given). Side-by-side on a wide
 * screen, stacked on a narrow one (see .news-ticker-bar in
 * news-theme.css). Renders nothing at all when there's nothing live,
 * rather than an empty bar taking up space. */
export default function NewsTicker() {
  const [items, setItems] = useState(null);
  const [rotateMs, setRotateMs] = useState(FALLBACK_ROTATE_MS);
  const [rotIndex, setRotIndex] = useState(0);
  const reducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const barRef = useRef(null);
  const trackRef = useRef(null);
  const [trackDuration, setTrackDuration] = useState(MIN_TICKER_DURATION_S);

  useEffect(() => {
    apiRequest('GET', null, '/news/ticker/live')
      .then((d) => { setItems(d.items || []); setRotateMs(d.rotate_ms || FALLBACK_ROTATE_MS); })
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    if (reducedMotion.current || !items || items.length < 2) return undefined;
    const id = setInterval(() => setRotIndex((i) => (i + 1) % items.length), rotateMs);
    return () => clearInterval(id);
  }, [items, rotateMs]);

  // .news-ticker-bar is `position: fixed` (pinned right under the navbar,
  // see news-theme.css) so it can't push page content down the way a
  // normal in-flow element would -- it has to be measured and fed back in
  // as a CSS var instead, the same trick SiteBanner.js already uses for
  // --site-banner-h, which .main-content's own padding-top already adds
  // in. Re-measured on resize since the bar goes from one row to two
  // (stacked) at the mobile breakpoint.
  useEffect(() => {
    const root = document.documentElement;
    const el = barRef.current;
    if (!items || items.length === 0 || !el) {
      root.style.setProperty('--news-ticker-h', '0px');
      return undefined;
    }
    const update = () => root.style.setProperty('--news-ticker-h', `${el.offsetHeight}px`);
    update();
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      root.style.setProperty('--news-ticker-h', '0px');
    };
  }, [items]);

  // Derive the marquee's animation-duration from its actual rendered
  // width instead of hard-coding one -- see TICKER_PX_PER_SECOND above.
  // trackRef holds the DOUBLED content (for the seamless -50% loop), so
  // the real one-copy distance is half of scrollWidth. Re-measured on
  // resize too: the items themselves don't reflow with viewport width,
  // but this keeps it correct if that ever changes.
  useEffect(() => {
    if (reducedMotion.current || !items || items.length === 0) return undefined;
    const update = () => {
      const el = trackRef.current;
      if (!el) return;
      const oneCopyWidth = el.scrollWidth / 2;
      setTrackDuration(Math.max(MIN_TICKER_DURATION_S, oneCopyWidth / TICKER_PX_PER_SECOND));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [items]);

  if (!items || items.length === 0) return null;

  // Doubled so the horizontal marquee can loop seamlessly at a -50%
  // translate instead of snapping back to the start.
  const doubled = [...items, ...items];
  const current = items[rotIndex % items.length];

  return (
    <div className="news-ticker-bar" role="region" aria-label="Latest headlines" ref={barRef}>
      <div className="news-ticker-scroll">
        <span className="news-ticker-label"><Radio size={11} /> Live</span>
        <div className="news-ticker-viewport">
          <div className="news-ticker-track" ref={trackRef} style={{ animationDuration: `${trackDuration}s` }}>
            {doubled.map((item, i) => (
              <span className={`news-ticker-item news-ticker-item-${item.type}`} key={`${item.type}-${item.id}-${i}`}>
                {renderText(item)}
                <span className="news-ticker-item-time">{timeAgo(item.created_at)}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {items.length > 1 && (
        <div className="news-ticker-rotator">
          <div className="news-ticker-rotator-inner" key={current.id} aria-live="polite">
            <span className="news-ticker-rotator-meta">
              <span className={`news-ticker-rotator-badge news-ticker-rotator-badge-${current.type}`}>
                {current.type === 'article' ? 'Article' : 'Next up'}
              </span>
              <span className="news-ticker-rotator-time">{timeAgo(current.created_at)}</span>
            </span>
            <span className="news-ticker-rotator-text">{renderText(current)}</span>
          </div>
          {!reducedMotion.current && (
            <div className="news-ticker-rotator-progress-track">
              <div className="news-ticker-rotator-progress" key={`progress-${current.id}`} style={{ animationDuration: `${rotateMs}ms` }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
