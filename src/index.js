// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { createGlobalStyle } from 'styled-components';


const GlobalFix = createGlobalStyle`
  html, body, #root {
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
  }
  * { box-sizing: border-box; }
  img, video, canvas { max-width: 100%; height: auto; display: block; }
`;


const savedLang = localStorage.getItem('lang');
const initialLang = savedLang || 'hy';
document.documentElement.lang = initialLang;
if (!savedLang) {
  localStorage.setItem('lang', initialLang);
}


const redirect = sessionStorage.redirect;
if (redirect) {
  delete sessionStorage.redirect;
  window.history.replaceState(null, "", redirect);
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <GlobalFix />
    <App />
  </React.StrictMode>
);

reportWebVitals();


