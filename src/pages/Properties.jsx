// src/pages/Properties.jsx
import RecentProperties from '../components/RecentProperties';

const TITLES = {
  hy: 'Բոլոր հայտարարությունները',
  ru: 'Все объявления',
  en: 'All Properties',
};

function getLang() {
  return document.documentElement.lang || localStorage.getItem('lang') || 'hy';
}

export default function Properties() {
  const lang = getLang();
  const title = TITLES[lang] || TITLES.hy;

  return (
    <div style={{ padding: '40px 20px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>{title}</h2>
      <RecentProperties />
    </div>
  );
}
