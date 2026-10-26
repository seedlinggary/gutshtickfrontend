import React from 'react';
import { AdCard } from './AdSlot';

/** Thin presentational wrapper around useFixedAds' { ads, dismiss } result --
 * looks up one placement's ad out of a batch fetched by the caller (see
 * AdSlot.js's useFixedAds, which is the actual fetch path). */
export function HomeAdSlot({ ads, dismiss, placement, className }) {
  return <AdCard ad={ads[placement]} className={className} onDismiss={() => dismiss(placement)} />;
}
