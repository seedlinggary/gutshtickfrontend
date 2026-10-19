import React, { useState } from 'react';
import { MapPin, X, Shuffle } from 'lucide-react';
import { getBrowserCoordsDetailed, getNearMeErrorMessage, isIOSSafari } from './geolocation';

/** Shared "Near me" state/behavior for every list page that has it
 * (Directory, Community, Activities, Deals) -- one real geolocation
 * lookup + the same carefully-tuned error copy everywhere, instead of each
 * page re-deriving its own slightly different version.
 * `onLocated(coords)` fires once a position is found (caller sets its own
 * sort=distance + lat/lng); `onCleared()` fires on turning it back off. */
export function useNearMe(onLocated, onCleared) {
  const [locating, setLocating] = useState(false);
  const [nearMeActive, setNearMeActive] = useState(false);
  const [nearMeError, setNearMeError] = useState(null);

  const findNearMe = () => {
    if (nearMeActive) {
      setNearMeActive(false);
      setNearMeError(null);
      onCleared();
      return;
    }
    setLocating(true);
    setNearMeError(null);
    getBrowserCoordsDetailed().then(({ coords, error }) => {
      setLocating(false);
      if (!coords) {
        setNearMeError(getNearMeErrorMessage(error));
        return;
      }
      setNearMeActive(true);
      onLocated(coords);
    });
  };

  return { locating, nearMeActive, nearMeError, findNearMe };
}

/** The button row + error line, shared verbatim so every page's "Near me"/
 * "Shake the board" look identical. `radiusMiles` only affects the title
 * tooltip text. */
export function NearMeShakeControls({ nearMeActive, locating, onNearMe, radiusMiles, shaking, onShake, nearMeError }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <button
          type="button"
          className={`biz-shake-btn${nearMeActive ? ' active' : ''}`}
          onClick={onNearMe}
          disabled={locating}
          title={nearMeActive ? 'Turn off the nearby filter' : `Show only results within ${radiusMiles} miles of your location`}
        >
          {nearMeActive ? <X size={15} /> : <MapPin size={15} />} {locating ? 'Locating…' : 'Near me'}
        </button>
        <button type="button" className="biz-shake-btn" onClick={onShake} disabled={shaking}>
          <Shuffle size={15} className={shaking ? 'biz-shake-spin' : ''} /> {shaking ? 'Shaking…' : 'Shake the board'}
        </button>
      </div>
      {nearMeError && (
        <p style={{
          fontSize: 12,
          color: isIOSSafari() ? '#ff3b30' : '#ffb4a8',
          fontWeight: isIOSSafari() ? 700 : 400,
          margin: 0, maxWidth: 320, textAlign: 'right', whiteSpace: 'pre-line',
        }}>{nearMeError}</p>
      )}
    </div>
  );
}
