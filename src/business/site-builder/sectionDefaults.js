// A block's x/y/w/h are percentages of ITS OWN SECTION -- but a section
// with only `min-height` and all-absolutely-positioned children has no
// real height for those percentages to resolve against (an absolutely
// positioned child contributes nothing to its parent's auto height, so
// the box collapses to exactly `min-height` no matter how tall its
// content was meant to be). Giving every section a real, explicit pixel
// height (stored on section.height, editable in the editor's section
// toolbar) is what makes the percentages mean something -- Canvas.js
// (the editor) and PublicSiteRenderer.js (the live site) both read this
// same default so a page looks the same in both places. Shared here
// (rather than exported from Canvas.js) so the public bundle doesn't
// have to pull in the whole drag/resize editor just for one constant.
export const DEFAULT_SECTION_HEIGHT = 420;
export const SECTION_HEIGHT_STEP = 80;
export const MIN_SECTION_HEIGHT = 120;
export const MAX_SECTION_HEIGHT = 1600;
