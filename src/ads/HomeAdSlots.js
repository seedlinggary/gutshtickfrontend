import React, { useState, useEffect } from 'react';
import apiRequest from '../ApiRequest';
import { AdCard, getDismissedIds, dismissAdId } from './AdSlot';

const PLACEMENTS = ['top', 'bottom', 'sidebar_left', 'sidebar_right'];

/** One batched fetch for all of the home page's fixed ad slots (top/bottom/
 * both sidebars), instead of each slot firing its own request. */
export function useHomeAds() {
  const [ads, setAds] = useState({});

  useEffect(() => {
    let cancelled = false;
    const exclude = getDismissedIds().join(',');
    const qs = `?placements=${PLACEMENTS.join(',')}${exclude ? `&exclude=${exclude}` : ''}`;
    apiRequest('GET', null, `/ads/serve_batch${qs}`)
      .then((data) => { if (!cancelled) setAds(data || {}); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const dismiss = (placement) => {
    const ad = ads[placement];
    if (!ad) return;
    dismissAdId(ad.id);
    setAds((prev) => ({ ...prev, [placement]: null }));
  };

  return { ads, dismiss };
}

export function HomeAdSlot({ ads, dismiss, placement, className }) {
  return <AdCard ad={ads[placement]} className={className} onDismiss={() => dismiss(placement)} />;
}
