import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { createRoot } from 'react-dom/client';
import App, { AppErrorBoundary } from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(<AppErrorBoundary><App /></AppErrorBoundary>);
