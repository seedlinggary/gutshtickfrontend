const initialState = {
  feed: null,
  pictures: null,
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
        feed: action.payload.feed,
        pictures: action.payload.pictures,
        error: null,
        isLoading: false,
        isDataFetched: true,
      };
    case 'FETCH_ERROR':
      return { ...state, error: action.payload, isLoading: false };
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
