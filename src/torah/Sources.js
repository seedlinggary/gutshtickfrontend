import React, { useState } from 'react';
import { Library, Search } from 'lucide-react';
import apiRequest from '../ApiRequest';

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

export default function Sources() {
  const [book, setBook] = useState('Genesis');
  const [chapter, setChapter] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    apiRequest('GET', null, `/torah/sefaria/text?ref=${encodeURIComponent(`${book}.${chapter}`)}`)
      .then(setData)
      .catch(() => setError('Could not load this chapter -- check the chapter number is valid for this book.'))
      .finally(() => setLoading(false));
  };

  const jumpToBook = (name) => {
    setBook(name);
    setChapter(1);
    setData(null);
  };

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 760 }}>
        <div className="tor-masthead">
          <div className="tor-masthead-kicker"><Library size={13} /> Sources</div>
          <h1 className="tor-masthead-title">Look up a Torah source</h1>
          <p className="tor-masthead-sub">Hebrew and English text, straight from Sefaria -- pick a book and chapter.</p>
        </div>

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

          <form onSubmit={load} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginTop: 10 }}>
            <div>
              <label className="tor-field-label">Chapter</label>
              <input className="gs-input" type="number" min="1" value={chapter} onChange={(e) => setChapter(Number(e.target.value))} style={{ width: 90 }} />
            </div>
            <button type="submit" className="gs-btn gs-btn-primary" disabled={loading}>
              <Search size={14} /> {loading ? 'Loading…' : `Show ${book} ${chapter}`}
            </button>
          </form>
        </div>

        {error && <p className="tor-error">{error}</p>}

        {data && (
          <div>
            <h2>{data.ref}</h2>
            {(data.he || []).map((heText, i) => (
              <div key={i} className="tor-text-block">
                {data.text && data.text[i] && (
                  <p className="tor-text-en"><strong>{i + 1}.</strong> <span dangerouslySetInnerHTML={{ __html: data.text[i] }} /></p>
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
