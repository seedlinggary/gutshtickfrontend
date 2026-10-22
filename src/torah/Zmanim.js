import React, { useState } from 'react';
import { Sunrise, MapPin, Loader2, Search, X } from 'lucide-react';
import apiRequest from '../ApiRequest';
import { getBrowserCoordsDetailed, getNearMeErrorMessage } from '../shared/geolocation';
import AddressAutocomplete from '../shared/AddressAutocomplete';

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

// Formats in the LOOKED-UP location's own timezone, not the viewer's --
// zmanim are local solar times at that place, so a user in New York
// checking Jerusalem's zmanim needs Jerusalem's clock time, not NY's. tzid
// comes back from Hebcal itself (it auto-detects from lat/lng when no tzid
// is sent, confirmed live), rather than being assumed from the browser.
function formatTime(iso, tzid) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZone: tzid || undefined });
}

export default function Zmanim() {
  const [coords, setCoords] = useState(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [tzid, setTzid] = useState(null);
  const [locating, setLocating] = useState(false);
  const [citySearchOpen, setCitySearchOpen] = useState(false);
  const [error, setError] = useState('');
  const [zmanim, setZmanim] = useState(null);
  const [shabbat, setShabbat] = useState(null);

  const load = async (lat, lng, label) => {
    setError('');
    setCoords({ lat, lng });
    setLocationLabel(label);
    setCitySearchOpen(false);
    try {
      // No tzid sent -- let Hebcal infer it from lat/lng (see formatTime).
      const [z, s] = await Promise.all([
        apiRequest('GET', null, `/torah/zmanim?lat=${lat}&lng=${lng}`),
        apiRequest('GET', null, `/torah/shabbat-times?lat=${lat}&lng=${lng}`),
      ]);
      setZmanim(z.times);
      setTzid(z.location?.tzid || null);
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
    load(c.lat, c.lng, 'your current location');
  };

  const pickCity = (loc) => {
    const label = [loc.city, loc.state, loc.country].filter(Boolean).join(', ') || 'this location';
    load(loc.lat, loc.lng, label);
  };

  const changeLocation = () => {
    setCoords(null);
    setZmanim(null);
    setShabbat(null);
    setCitySearchOpen(false);
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
            <p style={{ marginTop: 0 }}>Share your location, or search any city, to see today's zmanim and this week's Shabbat times.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="gs-btn gs-btn-primary" onClick={findMe} disabled={locating}>
                {locating ? <Loader2 size={15} className="tor-spin" /> : <MapPin size={15} />} {locating ? 'Locating…' : 'Use my location'}
              </button>
              <button type="button" className="gs-btn gs-btn-outline" onClick={() => setCitySearchOpen((o) => !o)}>
                <Search size={15} /> Search a city
              </button>
            </div>
            {citySearchOpen && (
              <div style={{ maxWidth: 420, margin: '14px auto 0', textAlign: 'left' }}>
                <AddressAutocomplete onSelect={pickCity} />
              </div>
            )}
            {error && <p className="tor-error" style={{ whiteSpace: 'pre-line', marginTop: 12 }}>{error}</p>}
          </div>
        )}

        {coords && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13.5 }}>Showing zmanim for <strong style={{ color: 'var(--text)' }}>{locationLabel}</strong>.</p>
              <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={changeLocation}><X size={13} /> Change location</button>
            </div>

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
                    <span className="tor-zman-time">{formatTime(zmanim[key], tzid)}</span>
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
