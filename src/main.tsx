import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { asset } from './data/portfolioData';
import './index.css';
import './styles/pixelTheme.css';

// Blossom cursor PNGs from /public, resolved against the deploy base path.
const root = document.documentElement.style;
root.setProperty('--cursor-default', `url("${asset('images/cursor-blossom.png')}") 1 1, auto`);
root.setProperty('--cursor-pointer', `url("${asset('images/cursor-blossom-pointer.png')}") 1 1, pointer`);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
