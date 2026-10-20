import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { CloudConsoleApp } from './App.js';
import './styles/globals.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <CloudConsoleApp />
    </React.StrictMode>
  );
}
