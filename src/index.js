import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import store from './Store';
import { fetchData } from './actions';
import { Provider } from 'react-redux';
import { TranslateProvider } from '@guttools/translation-tool';

const root = ReactDOM.createRoot(document.getElementById('root'));
store.dispatch(fetchData());
root.render(
  <React.StrictMode>
    <TranslateProvider
      projectKey={import.meta.env.VITE_TRANSLATE_PROJECT_KEY}
      apiUrl={import.meta.env.VITE_TRANSLATE_API_URL}
      sourceLang="en"
    >
      <Provider store={store}><App /></Provider>
    </TranslateProvider>
  </React.StrictMode>
);
