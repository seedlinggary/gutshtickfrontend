import React from 'react';
import AdSlot from '../ads/AdSlot';

/** Solo games have no shared wrapper (each is routed directly), so this is
 * the one place to put anything that should sit above every solo game while
 * it's actually being played, without editing all 25 game files individually. */
export default function SoloGameShell({ children }) {
  return (
    <>
      <div style={{ maxWidth: 480, margin: '12px auto 0' }}>
        <AdSlot placement="game_page" className="ad-slot-game-page" />
      </div>
      {children}
    </>
  );
}
