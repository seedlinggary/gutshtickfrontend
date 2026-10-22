const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

/** Export links can't just be plain <a href> tags -- this app authenticates
 * with a custom x-access-token header (see ApiRequest.js), not a cookie, so
 * a normal browser navigation/new-tab click would never carry it and a
 * private sheet's own owner would get a 404 trying to view their own
 * export. Fetching with the header, then either opening the resulting blob
 * in a new tab ("preview") or triggering a synthetic download link
 * ("download"), works for both public and private sheets alike. */
export default async function downloadSheetFile(path, filename, mode = 'preview') {
  const cookie = localStorage.getItem('cookie');
  const res = await fetch(`${API}${path}`, { headers: cookie ? { 'x-access-token': cookie } : {} });
  if (!res.ok) throw new Error('Could not load this file right now.');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  if (mode === 'preview') {
    window.open(url, '_blank');
  } else {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
