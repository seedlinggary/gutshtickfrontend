// Mirrors backend/business/modals/business_site.py's theme registries --
// same duplication convention this codebase already uses for small
// enum-ish maps (e.g. BusinessOwnerTools.js's own
// BUSINESS_CATEGORY_TO_JOB_CATEGORY). Keep these two files in sync by
// hand; GET /business/site-themes is the source of truth for owner-facing
// LABELS (picker UI reads those), this file is what actually turns a
// theme object into real CSS.

export const DEFAULT_THEME = {
  palette: 'warm', customColors: null, fontPairing: 'modern', customFontPairing: null, headingColor: null,
  buttonStyle: 'rounded', formStyle: 'boxed', navStyle: 'top', footerStyle: 'simple', footerDark: false,
};

export const THEME_PALETTES = {
  warm: { primary: '#C8553D', secondary: '#E8A87C', background: '#FAF3E8', surface: '#FFFFFF', text: '#2B2118', muted: '#8A7A68', border: '#E3D5C0' },
  cool: { primary: '#2E6F95', secondary: '#6FA8C9', background: '#F4F8FA', surface: '#FFFFFF', text: '#1B2B33', muted: '#5C7A87', border: '#D6E4EA' },
  bold: { primary: '#E63946', secondary: '#1D3557', background: '#FFFFFF', surface: '#F8F9FA', text: '#111111', muted: '#6C757D', border: '#E0E0E0' },
  minimal: { primary: '#1A1A1A', secondary: '#6E6E6E', background: '#FFFFFF', surface: '#FAFAFA', text: '#1A1A1A', muted: '#9E9E9E', border: '#EAEAEA' },
  earthy: { primary: '#4A5D3A', secondary: '#8C7851', background: '#F5F0E6', surface: '#FFFFFF', text: '#2D2A22', muted: '#7A7260', border: '#DCD3BE' },
  dark: { primary: '#7C9EFF', secondary: '#B98CE8', background: '#121417', surface: '#1C1F24', text: '#F0F2F5', muted: '#9AA3AE', border: '#2C3036' },
  sunset: { primary: '#D96C3F', secondary: '#F2B872', background: '#FFF6ED', surface: '#FFFFFF', text: '#3A2A1E', muted: '#9C7F63', border: '#F0DCC4' },
  forest: { primary: '#2F6B4F', secondary: '#8FBF9B', background: '#F1F7F2', surface: '#FFFFFF', text: '#1E2E24', muted: '#6E8C78', border: '#D7E8DC' },
  rose: { primary: '#B5456E', secondary: '#E8A9C0', background: '#FDF2F6', surface: '#FFFFFF', text: '#3A1F2A', muted: '#A6748A', border: '#F2D9E3' },
  slate: { primary: '#475569', secondary: '#94A3B8', background: '#F1F5F9', surface: '#FFFFFF', text: '#1E293B', muted: '#64748B', border: '#E2E8F0' },
};

export const FONT_PAIRINGS = {
  classic: { heading: "'Playfair Display', Georgia, serif", body: "'Lato', Arial, sans-serif", google: 'Playfair+Display:wght@700&family=Lato:wght@400;600' },
  modern: { heading: "'Poppins', Arial, sans-serif", body: "'Inter', Arial, sans-serif", google: 'Poppins:wght@600;700&family=Inter:wght@400;600' },
  friendly: { heading: "'Quicksand', Arial, sans-serif", body: "'Nunito', Arial, sans-serif", google: 'Quicksand:wght@700&family=Nunito:wght@400;600' },
  elegant: { heading: "'Cormorant Garamond', Georgia, serif", body: "'Work Sans', Arial, sans-serif", google: 'Cormorant+Garamond:wght@700&family=Work+Sans:wght@400;600' },
  bold: { heading: "'Archivo Black', Arial, sans-serif", body: "'Archivo', Arial, sans-serif", google: 'Archivo+Black&family=Archivo:wght@400;600' },
  editorial: { heading: "'Libre Baskerville', Georgia, serif", body: "'Source Sans 3', Arial, sans-serif", google: 'Libre+Baskerville:wght@700&family=Source+Sans+3:wght@400;600' },
  rounded: { heading: "'Baloo 2', Arial, sans-serif", body: "'Mulish', Arial, sans-serif", google: 'Baloo+2:wght@700&family=Mulish:wght@400;600' },
  technical: { heading: "'Space Grotesk', Arial, sans-serif", body: "'IBM Plex Sans', Arial, sans-serif", google: 'Space+Grotesk:wght@700&family=IBM+Plex+Sans:wght@400;600' },
};

export const BUTTON_RADIUS = { rounded: '10px', pill: '999px', square: '2px', outline: '8px', ghost: '8px', shadow: '10px' };

// Label-only mirrors of the backend's NAV_STYLES/FOOTER_STYLES -- the
// editor needs these synchronously (to render a picker inside the
// click-to-edit chrome panel) without waiting on a GET /business/site-
// themes round trip, same reasoning the rest of this file mirrors the
// backend's theme registries.
export const NAV_STYLES = { top: { label: 'Top bar' }, side: { label: 'Sidebar' }, minimal: { label: 'Minimal (logo only)' }, split: { label: 'Split (centered logo)' } };
export const FOOTER_STYLES = { simple: { label: 'Simple' }, columns: { label: 'Columns' }, stacked: { label: 'Stacked (centered, with links)' }, none: { label: 'No footer' } };

/** theme -> a style object for the top-level wrapper every storefront
 * page renders inside (see ThemeWrapper.js). customColors (if set)
 * override the chosen palette per-key, so an owner can start from a
 * preset and tweak just one color without losing the rest. */
export function themeToCssVars(theme) {
  const t = { ...DEFAULT_THEME, ...(theme || {}) };
  const palette = { ...THEME_PALETTES[t.palette] || THEME_PALETTES.warm, ...(t.customColors || {}) };
  // A custom font pairing (any two Google Font family names, not just one
  // of the 8 presets) overrides fontPairing entirely -- added recreating a
  // real business's existing site, whose actual fonts (PT Serif / Inter)
  // matched none of the presets, so the closest preset was picked and
  // ended up visibly wrong everywhere text renders.
  const fonts = t.customFontPairing || FONT_PAIRINGS[t.fontPairing] || FONT_PAIRINGS.modern;
  return {
    '--sb-primary': palette.primary,
    '--sb-secondary': palette.secondary,
    '--sb-background': palette.background,
    '--sb-surface': palette.surface,
    '--sb-text': palette.text,
    '--sb-muted': palette.muted,
    '--sb-border': palette.border,
    '--sb-font-heading': fonts.heading,
    '--sb-font-body': fonts.body,
    // Headings default to the body text color (unchanged behavior) unless
    // the owner sets an explicit headingColor -- also added recreating
    // that same real site, whose every h1-h4 is colored in its brand blue
    // rather than its ordinary body text color, which the theme system had
    // no way to express (only buttons/links picked up --sb-primary).
    '--sb-heading-color': t.headingColor || palette.text,
    '--sb-button-radius': BUTTON_RADIUS[t.buttonStyle] || BUTTON_RADIUS.rounded,
    background: palette.background,
    color: palette.text,
    fontFamily: fonts.body,
    minHeight: '100%',
  };
}

/** Sets the --sb-* CSS vars on :root (so the navbar and whatever page
 * component is rendering -- siblings under App.js, not nested -- both
 * pick them up regardless of DOM structure) and loads the matching
 * Google Font. Idempotent to call from multiple components (Navbar and
 * the page body both call this); setting the same values twice is a
 * harmless no-op, simpler than coordinating a single owner. Dev-mode-only
 * caveat: switching business sites via the local ?site= toggle doesn't
 * reset these -- a real subdomain visit is always a fresh page load, so
 * this only matters for local testing, not production. */
export function applySiteTheme(theme) {
  const vars = themeToCssVars(theme);
  const root = document.documentElement.style;
  Object.entries(vars).forEach(([key, value]) => {
    if (key.startsWith('--')) root.setProperty(key, value);
  });
  document.body.style.background = vars.background;
  document.body.style.color = vars.color;
  loadGoogleFont(theme && theme.customFontPairing ? theme.customFontPairing : (theme && theme.fontPairing) || DEFAULT_THEME.fontPairing);
}

let loadedFontKey = null;
/** Injects the Google Fonts <link> for a font pairing -- idempotent,
 * replaces any previously-loaded pairing's link rather than stacking
 * them, since only one site's fonts are ever active in a given tab.
 * Takes either a preset key (string) or a custom pairing object
 * ({heading, body, google}) -- the google field is the same
 * fonts.googleapis.com family query-string fragment either way. */
export function loadGoogleFont(fontPairingKeyOrCustom) {
  const isCustom = fontPairingKeyOrCustom && typeof fontPairingKeyOrCustom === 'object';
  const fonts = isCustom ? fontPairingKeyOrCustom : (FONT_PAIRINGS[fontPairingKeyOrCustom] || FONT_PAIRINGS.modern);
  const cacheKey = isCustom ? `custom:${fonts.google}` : fontPairingKeyOrCustom;
  if (!fonts.google || loadedFontKey === cacheKey) return;
  const existing = document.getElementById('sb-google-font-link');
  if (existing) existing.remove();
  const link = document.createElement('link');
  link.id = 'sb-google-font-link';
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${fonts.google}&display=swap`;
  document.head.appendChild(link);
  loadedFontKey = cacheKey;
}
