const initialState = {
  feed: null,
  error: null,
  isLoading: false,
  isDataFetched: false,
  shtickgeneralc: 'all',
  limitsloaded: 1,
};

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, isLoading: true, error: null };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        feed: action.payload.append && state.feed
          ? [...state.feed, ...action.payload.feed]
          : action.payload.feed,
        error: null,
        isLoading: false,
        isDataFetched: true,
      };
    case 'FETCH_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'SHAKE_SUCCESS':
      // Always a full replace, never an append -- "Shake the Board" reorders
      // what's on screen, it doesn't add to it. Resets limitsloaded to 1 so
      // a later "Load more" continues from page 2 of *this* fresh shuffle
      // rather than the old one.
      return {
        ...state,
        feed: action.payload.feed,
        limitsloaded: 1,
        error: null,
        isLoading: false,
        isDataFetched: true,
      };
    case 'ADD_LIMIT':
      return { ...state, limitsloaded: state.limitsloaded + 1, isDataFetched: false };
    case 'CHANGE_CATEGORY':
      return {
        ...state,
        shtickgeneralc: action.payload.shtickgeneralc,
        limitsloaded: 1,
        isDataFetched: false,
      };
    default:
      return state;
  }
};

export default rootReducer;
