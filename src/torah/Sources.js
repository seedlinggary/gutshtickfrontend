import React, { useEffect, useState } from 'react';
import { Library, Search, Languages, ChevronRight, MessageSquareQuote, BookmarkPlus, Check } from 'lucide-react';
import apiRequest from '../ApiRequest';
import useActiveSheet from './sheets/useActiveSheet';
import SourceSheetPanel from './sheets/SourceSheetPanel';

/** Longer of the he/text arrays wins -- a plain `.he.length`-driven loop
 * silently drops segments whenever Sefaria's Hebrew and English arrays for
 * a ref differ in length. */
function textSegmentCount(data) {
  return Math.max((data?.he || []).length, (data?.text || []).length);
}

const BOOK_GROUPS = [
  { label: 'Torah', books: ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy'] },
  {
    label: 'Nevi\'im',
    books: [
      'Joshua', 'Judges', 'I Samuel', 'II Samuel', 'I Kings', 'II Kings', 'Isaiah', 'Jeremiah', 'Ezekiel',
      'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
    ],
  },
  {
    label: 'Ketuvim',
    books: [
      'Psalms', 'Proverbs', 'Job', 'Song of Songs', 'Ruth', 'Lamentations', 'Ecclesiastes', 'Esther',
      'Daniel', 'Ezra', 'Nehemiah', 'I Chronicles', 'II Chronicles',
    ],
  },
];

const CORPORA = [
  { key: 'tanach', label: 'Tanach' },
  { key: 'talmud', label: 'Talmud' },
  { key: 'halakhah', label: 'Halacha' },
];

/** Picks a chapter/daf/siman once a specific book (or tractate) is chosen --
 * via Sefaria's /shape data (see backend/torah/routes/torah_sefaria.py's
 * /shape endpoint docstring), not a blind text box: a real clickable list
 * of exactly what exists, PLUS a free-text field for typing a reference
 * directly (someone who already knows exactly what they want shouldn't
 * have to hunt through a long list for it).
 *
 * Some books (confirmed live: Tur, which has no Orach Chayim/Yoreh De'ah/
 * Even HaEzer/Choshen Mishpat entries in the library tree at all -- just
 * one bare "Tur" leaf) turn out to be "complex" one level further down,
 * meaning there's a named choice (which chelek) still to make before any
 * chapter numbers exist at all. `currentRef` tracks exactly where in that
 * (at most one level deep in every case checked live, but written to
 * recurse regardless) drill-down we are. */
function SectionPicker({ bookRef, style, onSelect }) {
  const [currentRef, setCurrentRef] = useState(bookRef);
  const [shape, setShape] = useState(null);
  const [shapeError, setShapeError] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [expandedItem, setExpandedItem] = useState(null);

  useEffect(() => {
    setCurrentRef(bookRef);
    setExpandedItem(null);
  }, [bookRef]);

  useEffect(() => {
    setShape(null);
    setShapeError('');
    setExpandedItem(null);
    const params = new URLSearchParams({ ref: currentRef });
    if (style) params.set('style', style);
    apiRequest('GET', null, `/torah/sefaria/shape?${params.toString()}`)
      .then(setShape)
      .catch(() => setShapeError('Could not load the chapter list for this text -- you can still type a reference directly below.'));
  }, [currentRef, style]);

  const pickLeafItem = (it) => {
    // A chapter/daf/siman with only one verse/line/seif inside it (count
    // <= 1) has nothing further to drill into -- just load it directly
    // instead of expanding into a single-option sub-picker.
    if (it.count <= 1) { onSelect(it.ref); return; }
    setExpandedItem((cur) => (cur === it.label ? null : it.label));
  };

  const submitManual = (e) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    onSelect(`${currentRef}.${manualInput.trim()}`);
  };

  return (
    <div className="tor-form-section">
      {currentRef !== bookRef && (
        <p className="tor-crumbs" style={{ marginBottom: 10 }}>
          <button onClick={() => setCurrentRef(bookRef)}>{bookRef}</button> / <strong>{currentRef}</strong>
        </p>
      )}

      {shapeError && <p className="tor-error">{shapeError}</p>}
      {!shape && !shapeError && <p style={{ color: 'var(--muted)' }}>Loading…</p>}

      {shape?.type === 'complex' && (
        <div className="tor-browser-list">
          {shape.children.map((c) => (
            <div key={c.title} className="tor-browser-item" onClick={() => setCurrentRef(c.title)}>
              <span>{c.title}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="tor-hebrew" style={{ fontSize: 14 }}>{c.heTitle}</span>
                <ChevronRight size={14} style={{ color: 'var(--muted-faint)' }} />
              </span>
            </div>
          ))}
        </div>
      )}

      {shape?.type === 'leaf' && (
        <>
          <div className="tor-section-grid">
            {shape.items.map((it) => (
              <button
                key={it.label} type="button"
                className={`tor-section-btn${expandedItem === it.label ? ' active' : ''}`}
                onClick={() => pickLeafItem(it)}
              >
                {it.label}
              </button>
            ))}
          </div>
          {expandedItem && (() => {
            const item = shape.items.find((it) => it.label === expandedItem);
            if (!item) return null;
            return (
              <div className="tor-subsection-picker">
                <p className="tor-field-label" style={{ marginBottom: 6 }}>
                  {item.label} has {item.count} part{item.count === 1 ? '' : 's'} -- pick one, or the whole thing:
                </p>
                <div className="tor-section-grid" style={{ marginBottom: 8 }}>
                  {Array.from({ length: item.count }, (_, i) => i + 1).map((n) => (
                    <button key={n} type="button" className="tor-section-btn" onClick={() => onSelect(`${item.ref}.${n}`)}>
                      {n}
                    </button>
                  ))}
                </div>
                <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => onSelect(item.ref)}>
                  Show all of {item.label}
                </button>
              </div>
            );
          })()}
        </>
      )}

      <form onSubmit={submitManual} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginTop: 14 }}>
        <div style={{ flex: 1 }}>
          <label className="tor-field-label">Or type a reference directly</label>
          <input className="gs-input" placeholder={style === 'talmud' ? 'e.g. 2a' : 'e.g. 1, or 1.3 for a specific paragraph'} value={manualInput} onChange={(e) => setManualInput(e.target.value)} />
        </div>
        <button type="submit" className="gs-btn gs-btn-outline"><Search size={14} /> Go</button>
      </form>
    </div>
  );
}

/** One-click "add this ref to the active source sheet" -- sits next to
 * every text block (the main text and every commentary) so building a
 * sheet while browsing doesn't mean copying refs out to paste into the
 * sheet builder separately (see sheets/SourceSheetPanel.js for picking
 * which sheet is "active"). */
function AddToSheetButton({ refValue, title, sheetState }) {
  const [state, setState] = useState('idle'); // idle | adding | added | error
  const [includeTranslation, setIncludeTranslation] = useState(true);

  const add = async () => {
    if (!sheetState.activeId) {
      setState('error');
      setTimeout(() => setState('idle'), 2500);
      return;
    }
    setState('adding');
    try {
      await sheetState.addSource(refValue, title, includeTranslation);
      setState('added');
      setTimeout(() => setState('idle'), 1800);
    } catch (_) {
      setState('error');
      setTimeout(() => setState('idle'), 2500);
    }
  };

  if (!sheetState.loggedIn) return null;

  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--muted)', cursor: 'pointer' }}>
        <input type="checkbox" checked={includeTranslation} onChange={(e) => setIncludeTranslation(e.target.checked)} />
        Translation
      </label>
      <button type="button" className="tor-add-to-sheet-btn" onClick={add} disabled={state === 'adding'}>
        {state === 'added' ? <><Check size={12} /> Added</> : <><BookmarkPlus size={12} /> Add to sheet</>}
      </button>
      {state === 'error' && (
        <span className="tor-add-to-sheet-hint">
          {sheetState.activeId ? 'Could not add this source.' : 'Choose a sheet in the sidebar first.'}
        </span>
      )}
    </span>
  );
}

/** Shows a text's Hebrew (always) / English (toggle) segments, plus the
 * ref string itself (so a rabbi can copy it straight into a source sheet's
 * "add a source" field -- see sheets/SheetView.js) and a commentary panel
 * discovered live via /torah/sefaria/links (Sefaria has no static "list of
 * all commentaries" anywhere; which ones exist is only ever discoverable
 * per-ref, same as Sefaria's own reader does it). */
function TextDisplay({ data, showEnglish, sheetState }) {
  const [commentaries, setCommentaries] = useState(null);
  const [openCommentary, setOpenCommentary] = useState(null);
  const [commentaryTexts, setCommentaryTexts] = useState({});
  const [commentaryLoading, setCommentaryLoading] = useState(null);

  useEffect(() => {
    setCommentaries(null);
    setOpenCommentary(null);
    setCommentaryTexts({});
    if (!data?.ref) return;
    apiRequest('GET', null, `/torah/sefaria/links?ref=${encodeURIComponent(data.ref)}`)
      .then((d) => setCommentaries(d.commentaries || []))
      .catch(() => setCommentaries([]));
  }, [data?.ref]);

  const openCommentator = async (c) => {
    if (openCommentary === c.title) { setOpenCommentary(null); return; }
    setOpenCommentary(c.title);
    if (commentaryTexts[c.title]) return;
    setCommentaryLoading(c.title);
    try {
      const texts = await Promise.all(
        c.refs.map((ref) => apiRequest('GET', null, `/torah/sefaria/text?ref=${encodeURIComponent(ref)}`).catch(() => null)),
      );
      setCommentaryTexts((m) => ({ ...m, [c.title]: texts.filter(Boolean) }));
    } finally {
      setCommentaryLoading(null);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0 }}>{data.ref}</h2>
        <AddToSheetButton refValue={data.ref} title={data.ref} sheetState={sheetState} />
      </div>
      {Array.from({ length: textSegmentCount(data) }).map((_, i) => (
        <div key={i} className="tor-text-block">
          {showEnglish && data.text && data.text[i] && (
            <p className="tor-text-en" dangerouslySetInnerHTML={{ __html: data.text[i] }} />
          )}
          {data.he && data.he[i] && (
            <p className="tor-hebrew" dangerouslySetInnerHTML={{ __html: data.he[i] }} />
          )}
        </div>
      ))}

      {commentaries && commentaries.length > 0 && (
        <div className="tor-form-section">
          <h3><MessageSquareQuote size={15} style={{ verticalAlign: -2 }} /> Commentaries on this text</h3>
          <div className="tor-chip-row">
            {commentaries.map((c) => (
              <button key={c.title} type="button" className={`tor-chip${openCommentary === c.title ? ' active' : ''}`} onClick={() => openCommentator(c)}>
                {c.title}
              </button>
            ))}
          </div>
          {openCommentary && (
            <div style={{ marginTop: 10 }}>
              {commentaryLoading === openCommentary && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
              {(commentaryTexts[openCommentary] || []).map((ct, i) => (
                <div key={i} className="tor-text-block">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                    <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: 0, fontWeight: 700 }}>{ct.ref}</p>
                    <AddToSheetButton refValue={ct.ref} title={ct.ref} sheetState={sheetState} />
                  </div>
                  {Array.from({ length: textSegmentCount(ct) }).map((_, j) => (
                    <div key={j}>
                      {showEnglish && ct.text && ct.text[j] && <p className="tor-text-en" dangerouslySetInnerHTML={{ __html: ct.text[j] }} />}
                      {ct.he && ct.he[j] && <p className="tor-hebrew" dangerouslySetInnerHTML={{ __html: ct.he[j] }} />}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p style={{ fontSize: 12, color: 'var(--muted)' }}>
        Text from <a href="https://www.sefaria.org" target="_blank" rel="noreferrer">Sefaria.org</a>.
        Building a source sheet? Copy the reference above (<strong>{data.ref}</strong>) into Source Sheets' "add a source" field.
      </p>
    </div>
  );
}

function TanachBrowser({ showEnglish, sheetState }) {
  const [book, setBook] = useState('Genesis');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadRef = (ref) => {
    setLoading(true);
    setError('');
    apiRequest('GET', null, `/torah/sefaria/text?ref=${encodeURIComponent(ref)}`)
      .then(setData)
      .catch(() => setError('Could not load that chapter -- check the reference is valid for this book.'))
      .finally(() => setLoading(false));
  };

  const jumpToBook = (name) => { setBook(name); setData(null); };

  return (
    <>
      <div className="tor-form-section">
        {BOOK_GROUPS.map((g) => (
          <div key={g.label} style={{ marginBottom: 12 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 13 }}>{g.label}</h3>
            <div className="tor-chip-row" style={{ marginBottom: 0 }}>
              {g.books.map((b) => (
                <button key={b} type="button" className={`tor-chip${book === b ? ' active' : ''}`} onClick={() => jumpToBook(b)}>{b}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <SectionPicker key={book} bookRef={book} onSelect={loadRef} />
      {loading && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
      {error && <p className="tor-error">{error}</p>}
      {data && <TextDisplay data={data} showEnglish={showEnglish} sheetState={sheetState} />}
    </>
  );
}

/** Talmud and Halacha both browse Sefaria's full library tree via the same
 * generic /torah/sefaria/toc endpoint (category -> subcategory -> ... ->
 * book), then hand off to SectionPicker once a specific book/tractate is
 * picked. One component covers both since the navigation shape is
 * identical; only the starting category (and the daf-vs-chapter labeling
 * style) differs. */
function TocBrowser({ rootCategory, style, showEnglish, sheetState }) {
  const [pathParts, setPathParts] = useState([rootCategory]);
  const [items, setItems] = useState(null);
  const [tocError, setTocError] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setItems(null);
    setTocError('');
    apiRequest('GET', null, `/torah/sefaria/toc?path=${encodeURIComponent(pathParts.join('/'))}`)
      .then((d) => setItems(d.items || []))
      .catch(() => setTocError('Could not load this category right now.'));
  }, [pathParts]);

  const enter = (item) => {
    if (item.category) {
      setPathParts((p) => [...p, item.category]);
      setSelectedBook(null);
      setData(null);
    } else {
      setSelectedBook(item.title);
      setData(null);
    }
  };

  const goToCrumb = (i) => {
    setPathParts(pathParts.slice(0, i + 1));
    setSelectedBook(null);
    setData(null);
  };

  const loadRef = (ref) => {
    setLoading(true);
    setError('');
    apiRequest('GET', null, `/torah/sefaria/text?ref=${encodeURIComponent(ref)}`)
      .then(setData)
      .catch(() => setError(`Could not load that reference -- check it's valid for ${selectedBook}.`))
      .finally(() => setLoading(false));
  };

  return (
    <>
      <div className="tor-crumbs">
        {pathParts.map((p, i) => (
          <React.Fragment key={i}>
            {i > 0 && ' / '}
            <button onClick={() => goToCrumb(i)}>{p}</button>
          </React.Fragment>
        ))}
        {selectedBook && <> / <strong>{selectedBook}</strong></>}
      </div>

      {!selectedBook && (
        <>
          {tocError && <p className="tor-error">{tocError}</p>}
          {!items && !tocError && (
            <p style={{ color: 'var(--muted)' }}>
              Loading…{pathParts.length <= 1 && (
                <> The very first time anyone opens {rootCategory} after a while, this can take a couple of minutes
                   (Sefaria's own full category list is slow to fetch) -- after that it's instant for about two weeks.</>
              )}
            </p>
          )}
          {items && (
            <div className="tor-browser-list">
              {items.map((item) => (
                <div key={item.category || item.title} className="tor-browser-item" onClick={() => enter(item)}>
                  <span>{item.category || item.title}{item.enShortDesc ? ` -- ${item.enShortDesc}` : ''}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="tor-hebrew" style={{ fontSize: 14 }}>{item.heCategory || item.heTitle}</span>
                    <ChevronRight size={14} style={{ color: 'var(--muted-faint)' }} />
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {selectedBook && <SectionPicker key={selectedBook} bookRef={selectedBook} style={style} onSelect={loadRef} />}

      {loading && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
      {error && <p className="tor-error">{error}</p>}
      {data && <TextDisplay data={data} showEnglish={showEnglish} sheetState={sheetState} />}
    </>
  );
}

export default function Sources() {
  const [corpus, setCorpus] = useState('tanach');
  const [showEnglish, setShowEnglish] = useState(false);
  const sheetState = useActiveSheet();

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 1080 }}>
        <div className="tor-masthead">
          <div className="tor-masthead-row">
            <div className="tor-masthead-copy">
              <div className="tor-masthead-kicker"><Library size={13} /> Sources</div>
              <h1 className="tor-masthead-title">Look up a Torah source</h1>
              <p className="tor-masthead-sub">Tanach, the full Talmud (Bavli &amp; Yerushalmi), and Halacha (Rambam, Tur, Shulchan Aruch) -- with commentaries discoverable on every text. Hebrew text, straight from Sefaria; English translation is available too, toggle it on.</p>
            </div>
            <button
              type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setShowEnglish((s) => !s)}
              style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}
            >
              <Languages size={14} /> {showEnglish ? 'Hide English' : 'Show English'}
            </button>
          </div>
        </div>

        <div className="tor-sources-layout">
          <div>
            <div className="tor-chip-row">
              {CORPORA.map((c) => (
                <button key={c.key} type="button" className={`tor-chip${corpus === c.key ? ' active' : ''}`} onClick={() => setCorpus(c.key)}>{c.label}</button>
              ))}
            </div>

            {corpus === 'tanach' && <TanachBrowser showEnglish={showEnglish} sheetState={sheetState} />}
            {corpus === 'talmud' && <TocBrowser key="talmud" rootCategory="Talmud" style="talmud" showEnglish={showEnglish} sheetState={sheetState} />}
            {corpus === 'halakhah' && <TocBrowser key="halakhah" rootCategory="Halakhah" showEnglish={showEnglish} sheetState={sheetState} />}
          </div>
          <SourceSheetPanel sheetState={sheetState} />
        </div>
      </div>
    </div>
  );
}
