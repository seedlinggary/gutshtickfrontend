// Shared between Canvas.js (editor) and PublicSiteRenderer.js (the real
// public render) so a section's background always resolves identically in
// both places -- added because the only backgrounds that existed before
// this (solid color, image) couldn't reproduce something as ordinary as a
// hero with a color fade (a real business's actual homepage hero used
// exactly this: a dark-navy-to-lighter-navy gradient plus a faint radial
// highlight), which had been flattened to a single flat color recreating
// it.
export const GRADIENT_ANGLES = [
  { value: 180, label: 'Top to bottom' },
  { value: 0, label: 'Bottom to top' },
  { value: 90, label: 'Left to right' },
  { value: 270, label: 'Right to left' },
  { value: 135, label: 'Diagonal ↘' },
  { value: 315, label: 'Diagonal ↗' },
];

export function sectionBackgroundStyle(background) {
  if (!background) return {};
  if (background.type === 'color') {
    return { background: background.value };
  }
  if (background.type === 'image') {
    return { backgroundImage: `url(${background.value})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  }
  if (background.type === 'gradient') {
    const stops = (background.value?.stops || ['#FFFFFF', '#000000']).filter(Boolean);
    const angle = background.value?.angle ?? 180;
    if (stops.length < 2) return {};
    return { background: `linear-gradient(${angle}deg, ${stops.join(', ')})` };
  }
  return {};
}
