import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { TimezoneProvider } from './context/TimezoneContext.jsx';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TimezoneProvider>
          <App />
          <ToastContainer position="top-right" autoClose={3000} newestOnTop limit={1} />
        </TimezoneProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
