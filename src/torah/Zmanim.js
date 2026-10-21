import React, { useState } from 'react';
import { Sunrise, MapPin, Loader2 } from 'lucide-react';
import apiRequest from '../ApiRequest';
import { getBrowserCoordsDetailed, getNearMeErrorMessage } from '../shared/geolocation';

const ZMAN_LABELS = [
  ['alotHaShachar', 'Alot HaShachar (dawn)'],
  ['misheyakir', 'Misheyakir'],
  ['sunrise', 'Sunrise (Hanetz)'],
  ['sofZmanShma', "Sof Zman Shma (GRA)"],
  ['sofZmanShmaMGA', 'Sof Zman Shma (Magen Avraham)'],
  ['sofZmanTfilla', 'Sof Zman Tefilah (GRA)'],
  ['chatzot', 'Chatzot (midday)'],
  ['minchaGedola', 'Mincha Gedola'],
  ['minchaKetana', 'Mincha Ketana'],
  ['plagHaMincha', 'Plag HaMincha'],
  ['sunset', 'Sunset (Shkiah)'],
  ['tzeit85deg', 'Tzeit HaKochavim'],
];

function formatTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function Zmanim() {
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [zmanim, setZmanim] = useState(null);
  const [shabbat, setShabbat] = useState(null);

  const tzid = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const load = async (lat, lng) => {
    setError('');
    try {
      const [z, s] = await Promise.all([
        apiRequest('GET', null, `/torah/zmanim?lat=${lat}&lng=${lng}&tzid=${encodeURIComponent(tzid)}`),
        apiRequest('GET', null, `/torah/shabbat-times?lat=${lat}&lng=${lng}&tzid=${encodeURIComponent(tzid)}`),
      ]);
      setZmanim(z.times);
      setShabbat(s.items || []);
    } catch (e) {
      setError('Could not load zmanim for this location right now.');
    }
  };

  const findMe = async () => {
    setLocating(true);
    setError('');
    const { coords: c, error: err } = await getBrowserCoordsDetailed();
    setLocating(false);
    if (err) { setError(getNearMeErrorMessage(err)); return; }
    setCoords(c);
    load(c.lat, c.lng);
  };

  const candle = shabbat && shabbat.find((i) => i.category === 'candles');
  const havdalah = shabbat && shabbat.find((i) => i.category === 'havdalah');
  const parasha = shabbat && shabbat.find((i) => i.category === 'parashat');

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 720 }}>
        <div className="tor-masthead">
          <div className="tor-masthead-kicker"><Sunrise size={13} /> Zmanim</div>
          <h1 className="tor-masthead-title">Halachic times for your location</h1>
          <p className="tor-masthead-sub">Calculated live from Hebcal based on your coordinates -- not a fixed table, so it's accurate to exactly where you are.</p>
        </div>

        {!coords && (
          <div className="tor-form-section" style={{ textAlign: 'center' }}>
            <p style={{ marginTop: 0 }}>Share your location to see today's zmanim and this week's Shabbat times.</p>
            <button type="button" className="gs-btn gs-btn-primary" onClick={findMe} disabled={locating}>
              {locating ? <Loader2 size={15} className="tor-spin" /> : <MapPin size={15} />} {locating ? 'Locating…' : 'Use my location'}
            </button>
            {error && <p className="tor-error" style={{ whiteSpace: 'pre-line', marginTop: 12 }}>{error}</p>}
          </div>
        )}

        {coords && (
          <>
            {parasha && (
              <div className="tor-form-section">
                <h3 style={{ marginTop: 0 }}>This week: {parasha.title}</h3>
                <div className="tor-zman-row"><span className="tor-zman-label">Candle lighting</span><span className="tor-zman-time">{candle ? candle.title.replace('Candle lighting: ', '') : '—'}</span></div>
                <div className="tor-zman-row"><span className="tor-zman-label">Havdalah</span><span className="tor-zman-time">{havdalah ? havdalah.title.replace('Havdalah ', '').replace(/\(\d+ min\): /, '') : '—'}</span></div>
              </div>
            )}

            {zmanim && (
              <div className="tor-form-section">
                <h3 style={{ marginTop: 0 }}>Today's zmanim</h3>
                {ZMAN_LABELS.map(([key, label]) => (
                  <div className="tor-zman-row" key={key}>
                    <span className="tor-zman-label">{label}</span>
                    <span className="tor-zman-time">{formatTime(zmanim[key])}</span>
                  </div>
                ))}
              </div>
            )}

            <p style={{ fontSize: 12, color: 'var(--muted)' }}>
              Times courtesy of <a href="https://www.hebcal.com" target="_blank" rel="noreferrer">Hebcal.com</a> (CC BY 4.0). Always confirm with a local halachic authority for anything time-sensitive (e.g. the end of a fast or the start of Shabbat).
            </p>
          </>
        )}
      </div>
    </div>
  );
}
