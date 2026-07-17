const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

export const fetchData = () => async (dispatch, getState) => {
  // isLoading also guards against overlapping in-flight requests (e.g.
  // React StrictMode's dev-only double-invoke, or the app-bootstrap dispatch
  // in index.js racing Home's own mount effect) -- isDataFetched alone only
  // blocks a *new* dispatch after one has already resolved, so two thunks
  // starting close together could otherwise both fetch, and whichever
  // response lands second (even a stale page-1 fetch) would blow away an
  // already-appended later page.
  if (getState().isDataFetched || getState().isLoading) return;

  const cookie = localStorage.getItem('cookie');
  const headers = { 'Content-Type': 'application/json', 'x-access-token': cookie };
  const { shtickgeneralc, limitsloaded } = getState();

  dispatch({ type: 'FETCH_START' });
  try {
    // limitsloaded is now a real 1-indexed page number (backend does true
    // OFFSET/LIMIT paging) -- page 1 is a fresh load, anything after is a
    // "Load more" click, which should append rather than replace the feed.
    // The Daily Board's recency-weighted, Hock/Tachlis-mixed feed only
    // applies at the true root ("/") -- category browsing, "/feed/all", and
    // every other page stay plain reverse-chronological Shtick. This is
    // several places (Home, Footer, Navbar, a category click from
    // ShowMessage, the app-bootstrap dispatch in index.js) that can all fire
    // fetchData() around the same time on first load -- computing the flag
    // here off window.location, instead of threading it through every call
    // site as an argument, means they can never race to different URLs:
    // whichever dispatch actually wins, they all agree on the same one.
    const isBoardRoot = window.location.pathname === '/' && shtickgeneralc === 'all';
    const qs = isBoardRoot ? '?mix=1' : '';
    const feedRes = await fetch(`${API}/shtick/${shtickgeneralc}/${limitsloaded}${qs}`, { method: 'GET', headers });
    const feed = await feedRes.json();
    dispatch({ type: 'FETCH_SUCCESS', payload: { feed, append: limitsloaded > 1 } });
  } catch (err) {
    dispatch({ type: 'FETCH_ERROR', payload: err.message });
  }
};

export const fetchLimitsLoaded = () => (dispatch) => {
  dispatch({ type: 'ADD_LIMIT' });
};

// "Shake the Board" -- re-rolls the Home board's feed in place with a fresh
// random shuffle (see backend's /shtick/shake_board) instead of appending or
// navigating away. Bypasses the isLoading/isDataFetched guards fetchData()
// uses for pagination since this is a deliberate one-off user action, not a
// dispatch that could race the bootstrap/mount fetches.
export const shakeBoard = () => async (dispatch) => {
  const cookie = localStorage.getItem('cookie');
  const headers = { 'Content-Type': 'application/json', 'x-access-token': cookie };
  dispatch({ type: 'FETCH_START' });
  try {
    const feedRes = await fetch(`${API}/shtick/shake_board`, { method: 'GET', headers });
    const feed = await feedRes.json();
    dispatch({ type: 'SHAKE_SUCCESS', payload: { feed } });
  } catch (err) {
    dispatch({ type: 'FETCH_ERROR', payload: err.message });
  }
};

export const fetchCategory = (shtickgeneralc) => (dispatch) => {
  dispatch({ type: 'CHANGE_CATEGORY', payload: { shtickgeneralc } });
};
