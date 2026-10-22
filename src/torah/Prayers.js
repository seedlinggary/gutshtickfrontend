import React, { useEffect, useState } from 'react';
import { Scroll, Languages } from 'lucide-react';
import apiRequest from '../ApiRequest';

const NUSCHAOS = [
  { title: 'Siddur Ashkenaz', label: 'Ashkenaz' },
  { title: 'Siddur Sefard', label: 'Sefard' },
  { title: 'Siddur Edot HaMizrach', label: 'Edot HaMizrach' },
  { title: 'Weekday Siddur Chabad', label: 'Chabad (weekday)' },
];

// This site is meant to be offline during Shabbat and Yom Tov, so their
// liturgy is deliberately left out rather than just offered -- no point
// drawing people to a page meant for those days. Checked against each
// nusach's REAL top-level Sefaria schema (not guessed) to build this list;
// Chanukah/Purim/fast days/Rosh Chodesh are kept since those are ordinary
// days with no restriction on site use.
const EXCLUDED_TOP_LEVEL = {
  'Siddur Ashkenaz': new Set(['Shabbat', 'Festivals']),
  'Siddur Sefard': new Set([
    'Shabbat Candle Lighting', 'Shabbat Eve Mincha', 'Kabbalat Shabbat', 'Shabbat Eve Maariv',
    'Shabbat Evening Meal', 'Shabbat Morning Services', 'Musaf', 'Shabbat Day Meal', 'Shabbat Mincha',
    'Third Meal', 'Motzaei Shabbat', 'Shaking Lulav', 'Holidays', 'Nissan', 'Pesach Haggadah',
    'Sukkot', 'Simchat Torah', 'Shavuot', 'Yotzerot',
  ]),
  'Siddur Edot HaMizrach': new Set([
    'Shabbat Candle Lighting', 'Song of Songs', 'Kabbalat Shabbat', 'Shabbat Arvit', 'Shabbat Evening',
    'Shabbat Shacharit', 'Shabbat Mussaf', 'Daytime Meal', 'Shabbat Mincha', 'Third Meal', 'Havdalah',
    'Prayers for Three Festivals', 'Nissan', 'Mishna Study for Shabbat',
  ]),
  'Weekday Siddur Chabad': new Set(['Musaf for Festivals', 'Lulav']),
};

/** Longer of the he/text arrays wins -- a plain `.he.length`-driven loop
 * silently drops segments whenever Sefaria's Hebrew and English arrays for
 * a ref are different lengths (not rare), which can make a whole passage
 * vanish even when its Hebrew (or English) text actually exists. */
function textSegmentCount(textData) {
  return Math.max((textData?.he || []).length, (textData?.text || []).length);
}

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
  const [showEnglish, setShowEnglish] = useState(false);

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
  // Only the top level needs filtering -- removing a Shabbat/Festival node
  // there already blocks access to everything nested beneath it.
  if (currentNodes && pathTitles.length === 0 && bookTitle) {
    const excluded = EXCLUDED_TOP_LEVEL[bookTitle];
    // .trim() on both sides -- Sefaria's own titles aren't always
    // consistently trimmed (e.g. Siddur Sefard's "Motzaei Shabbat " has a
    // trailing space), and a silent whitespace mismatch here would let
    // Shabbat/festival content slip through unfiltered.
    if (excluded) currentNodes = currentNodes.filter((n) => !excluded.has(n.title.trim()));
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
          <div className="tor-masthead-row">
            <div className="tor-masthead-copy">
              <div className="tor-masthead-kicker"><Scroll size={13} /> Prayers</div>
              <h1 className="tor-masthead-title">Siddur, by nusach</h1>
              <p className="tor-masthead-sub">Real siddur text from Sefaria, organized the way each nusach actually lays it out. Weekday prayers only -- Shabbat and Yom Tov liturgy aren't included here, since this site isn't meant to be used on those days.</p>
            </div>
            <button
              type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setShowEnglish((s) => !s)}
              style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}
            >
              <Languages size={14} /> {showEnglish ? 'Hide English' : 'Show English'}
            </button>
          </div>
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
            {Array.from({ length: textSegmentCount(textData) }).map((_, i) => (
              <div key={i} className="tor-text-block">
                {showEnglish && textData.text && textData.text[i] && (
                  <p className="tor-text-en" dangerouslySetInnerHTML={{ __html: textData.text[i] }} />
                )}
                {textData.he && textData.he[i] && (
                  <p className="tor-hebrew" dangerouslySetInnerHTML={{ __html: textData.he[i] }} />
                )}
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
