const API = 'http://127.0.0.1:5000';

export const fetchData = () => async (dispatch, getState) => {
  if (getState().isDataFetched) return;

  const cookie = localStorage.getItem('cookie');
  const headers = { 'Content-Type': 'application/json', 'x-access-token': cookie };
  const { shtickgeneralc, limitsloaded } = getState();

  dispatch({ type: 'FETCH_START' });
  try {
    const [feedRes, picRes] = await Promise.all([
      fetch(`${API}/shtick/${shtickgeneralc}/${limitsloaded}`, { method: 'GET', headers }),
      fetch(`${API}/shtick/download/${shtickgeneralc}/${limitsloaded}`, { method: 'GET', headers }),
    ]);
    const feed = await feedRes.json();
    const pictures = await picRes.json();
    dispatch({ type: 'FETCH_SUCCESS', payload: { feed, pictures } });
  } catch (err) {
    dispatch({ type: 'FETCH_ERROR', payload: err.message });
  }
};

export const fetchLimitsLoaded = () => (dispatch) => {
  dispatch({ type: 'ADD_LIMIT' });
};

export const fetchCategory = (shtickgeneralc) => (dispatch) => {
  dispatch({ type: 'CHANGE_CATEGORY', payload: { shtickgeneralc } });
};
