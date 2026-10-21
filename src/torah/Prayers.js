import React, { useEffect, useState } from 'react';
import { Scroll } from 'lucide-react';
import apiRequest from '../ApiRequest';

const NUSCHAOS = [
  { title: 'Siddur Ashkenaz', label: 'Ashkenaz' },
  { title: 'Siddur Sefard', label: 'Sefard' },
  { title: 'Siddur Edot HaMizrach', label: 'Edot HaMizrach' },
  { title: 'Weekday Siddur Chabad', label: 'Chabad (weekday)' },
];

/** Sefaria's siddur schemas are several levels of *named* sections deep
 * (Nusach -> Weekday/Shabbat/Festivals -> Shacharit/Mincha/Maariv -> named
 * prayer sections, sometimes a level deeper still, e.g. Amidah's individual
 * blessings) and that depth varies by section -- rather than hardcode any
 * one nusach's shape, this walks whatever `nodes` the schema actually has:
 * a node with its own `nodes` is a folder to click into, anything else is
 * assumed to be text, fetched by joining the book title with every title
 * on the path so far into a Sefaria ref. */
export default function Prayers() {
  const [bookTitle, setBookTitle] = useState(null);
  const [schema, setSchema] = useState(null);
  const [pathTitles, setPathTitles] = useState([]);
  const [textData, setTextData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!bookTitle) return;
    setLoading(true);
    setSchema(null);
    setPathTitles([]);
    setTextData(null);
    setError('');
    apiRequest('GET', null, `/torah/sefaria/book?title=${encodeURIComponent(bookTitle)}`)
      .then((d) => setSchema(d.schema))
      .catch(() => setError('Could not load this siddur right now.'))
      .finally(() => setLoading(false));
  }, [bookTitle]);

  let currentNodes = schema ? schema.nodes : null;
  for (const t of pathTitles) {
    const found = currentNodes && currentNodes.find((n) => n.title === t);
    if (!found) break;
    currentNodes = found.nodes;
  }

  const selectChild = (node) => {
    const newPath = [...pathTitles, node.title];
    setTextData(null);
    setError('');
    if (node.nodes) {
      setPathTitles(newPath);
      return;
    }
    setPathTitles(newPath);
    setLoading(true);
    const ref = `${bookTitle}, ${newPath.join(', ')}`;
    apiRequest('GET', null, `/torah/sefaria/text?ref=${encodeURIComponent(ref)}`)
      .then(setTextData)
      .catch(() => setError('Could not load this text right now.'))
      .finally(() => setLoading(false));
  };

  const goToCrumb = (i) => {
    setPathTitles(pathTitles.slice(0, i));
    setTextData(null);
  };

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 720 }}>
        <div className="tor-masthead">
          <div className="tor-masthead-kicker"><Scroll size={13} /> Prayers</div>
          <h1 className="tor-masthead-title">Siddur, by nusach</h1>
          <p className="tor-masthead-sub">Real siddur text from Sefaria, organized the way each nusach actually lays it out -- pick a nusach, then drill into Weekday/Shabbat, the service, and the section you want.</p>
        </div>

        {!bookTitle && (
          <div className="tor-chip-row">
            {NUSCHAOS.map((n) => (
              <button key={n.title} type="button" className="tor-chip" onClick={() => setBookTitle(n.title)}>{n.label}</button>
            ))}
          </div>
        )}

        {bookTitle && (
          <div className="tor-crumbs">
            <button onClick={() => setBookTitle(null)}>Nuschaos</button>
            {' / '}
            <button onClick={() => goToCrumb(0)}>{NUSCHAOS.find((n) => n.title === bookTitle)?.label || bookTitle}</button>
            {pathTitles.map((t, i) => (
              <React.Fragment key={i}>
                {' / '}
                <button onClick={() => goToCrumb(i + 1)}>{t}</button>
              </React.Fragment>
            ))}
          </div>
        )}

        {loading && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
        {error && <p className="tor-error">{error}</p>}

        {!loading && !textData && currentNodes && (
          <div className="tor-browser-list">
            {currentNodes.map((n) => (
              <div key={n.title} className="tor-browser-item" onClick={() => selectChild(n)}>
                <span>{n.title}</span>
                <span className="tor-hebrew" style={{ fontSize: 14 }}>{n.heTitle}</span>
              </div>
            ))}
          </div>
        )}

        {!loading && textData && (
          <div>
            {(textData.he || []).map((heText, i) => (
              <div key={i} className="tor-text-block">
                {textData.text && textData.text[i] && (
                  <p className="tor-text-en" dangerouslySetInnerHTML={{ __html: textData.text[i] }} />
                )}
                <p className="tor-hebrew" dangerouslySetInnerHTML={{ __html: heText }} />
              </div>
            ))}
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>
              Text from <a href="https://www.sefaria.org" target="_blank" rel="noreferrer">Sefaria.org</a>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
