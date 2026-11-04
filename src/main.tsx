import React from 'react';
import ReactDOM from 'react-dom/client';
import { CustomRouter } from './router/Router';
import { AppProvider } from './context/AppContext';
import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <CustomRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </CustomRouter>
  </React.StrictMode>
);
