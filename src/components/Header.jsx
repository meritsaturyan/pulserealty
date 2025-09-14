// src/components/Header.jsx
import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaBars, FaTimes, FaPhone } from 'react-icons/fa';
import { io } from 'socket.io-client';
import AuthModal from './AuthModal';

const WS_BASE = 'http://localhost:4000';        // сокет бэка
const WS_PATH = '/socket.io';

const FALLBACK_HEADER_OFFSET = 90;

const TEXT = {
  en: { home: 'Home', about: 'About Us', contacts: 'Contacts', properties: 'Properties', signin: 'Sign In', cta: 'Have a real estate for sale' },
  ru: { home: 'Главная', about: 'О нас', contacts: 'Контакты', properties: 'Объекты', signin: 'Войти', cta: 'Есть недвижимость на продажу' },
  hy: { home: 'Գլխավոր', about: 'Մեր մասին', contacts: 'Կոնտակտներ', properties: 'Գույքեր', signin: 'Մուտք գործել', cta: 'Ունե՞ք վաճառքի անշարժ գույք' },
};

const HeaderWrapper = styled.header`
  width: 100%;
  padding: 20px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 9999 !important;
  background: rgba(0, 0, 0, 0.8);
  @media (max-width: 768px) { position: fixed; }
`;

const LogoImg = styled.img`height: 60px;`;

const Nav = styled.nav`
  display: flex; gap: 30px;
  a { text-decoration: none; color: white; font-weight: 500; transition: color .2s; &:hover{ color:#f0ae00; } }
  @media (max-width: 768px){ display:none; }
`;

const Actions = styled.div`
  display:flex; align-items:center; gap:16px;
  @media (max-width:768px){ display:none; }
`;

const AddButton = styled.button`
  padding:8px 16px; background:#f0ae00; color:#fff; border:none; border-radius:4px; cursor:pointer;
  &:hover{ filter:brightness(.95); }
`;

const SignInButton = styled.button`
  background:none; border:none; color:#fff; font-weight:500; cursor:pointer; transition:color .2s;
  &:hover{ color:#f0ae00; }
`;

const Burger = styled.div`
  display:none; font-size:24px; color:#fff; cursor:pointer;
  @media (max-width:768px){ display:block; }
`;

const MobileMenu = styled.div`
  display:none;
  @media (max-width:768px){
    display:flex; flex-direction:column; position:fixed;
    top:var(--header-h,72px); left:0; right:0; height:calc(100vh - var(--header-h,72px));
    background:#333; padding:20px; z-index:9998; overflow-y:auto;
    .menu-item{ color:#fff; text-align:left; padding:12px 0; background:none; border:none; font-size:16px; text-decoration:none; display:block; cursor:pointer; }
    .menu-item:hover{ color:#f0ae00; }
  }
`;

const CallCircle = styled.a`
  display:none;
  @media (max-width:768px){
    display:inline-flex; align-items:center; justify-content:center; position:absolute; right:72px; top:50%; transform:translateY(-50%);
    width:44px; height:44px; border-radius:9999px; background:#28a745; color:#fff; text-decoration:none; box-shadow:0 8px 20px rgba(0,0,0,.12); z-index:10000;
  }
`;

const Badge = styled.span`
  display:inline-flex; align-items:center; justify-content:center;
  min-width:18px; height:18px; padding:0 5px;
  margin-left:6px; border-radius:999px; background:#f43f5e; color:#fff;
  font-size:11px; line-height:1; font-weight:800;
`;

const FlagGroup = styled.div`display:flex; gap:8px; align-items:center;`;
const FlagBtn = styled.button`
  width:28px; height:20px; padding:0; border-radius:4px;
  border:1px solid ${({$active}) => ($active ? '#f0ae00' : 'rgba(255,255,255,.35)')};
  background:rgba(255,255,255,.08); display:inline-flex; align-items:center; justify-content:center; cursor:pointer; overflow:hidden;
`;
const FlagImg = styled.img`width:100%; height:100%; object-fit:cover; display:block; border-radius:3px;`;
const FlagFallback = styled.span`font-size:11px; color:#fff; font-weight:700;`;

const LANG_TO_CC = { hy:'am', ru:'ru', en:'gb' };
function CountryFlag({ lang }) {
  const cc = LANG_TO_CC[lang] || 'gb';
  const [err,setErr] = useState(false);
  const src = `https://flagcdn.com/${cc}.svg`;
  if (err) return <FlagFallback>{(lang||'').toUpperCase()}</FlagFallback>;
  return <FlagImg src={src} alt={lang} onError={() => setErr(true)} />;
}

const MobileCTA = styled(AddButton)` width:100%; margin-top:12px; border-radius:6px; font-weight:700; `;
const PhoneIconR = styled(FaPhone)`transform:scaleX(-1);`;

/* ---------- helpers для счётчика ---------- */
function getThreadId() {
  return (
    localStorage.getItem('pulse:chat:threadId') ||
    localStorage.getItem('pulse:chat:tid') ||
    localStorage.getItem('chat:threadId') ||
    ''
  );
}
function readUnreadTotal() {
  const totalStr = localStorage.getItem('pulse:chat:unreadUserTotal');
  if (totalStr != null) return Number(totalStr) || 0;
  try {
    const map = JSON.parse(localStorage.getItem('pulse:chat:unreadUserMap') || '{}');
    return Object.values(map).reduce((s,v)=>s+Number(v||0),0);
  } catch { return 0; }
}
function bumpUnread(tid, delta = 1) {
  try {
    const map = JSON.parse(localStorage.getItem('pulse:chat:unreadUserMap') || '{}');
    map[tid] = Number(map[tid] || 0) + delta;
    const total = Object.values(map).reduce((s,v)=>s+Number(v||0),0);
    localStorage.setItem('pulse:chat:unreadUserMap', JSON.stringify(map));
    localStorage.setItem('pulse:chat:unreadUserTotal', String(total));
    window.dispatchEvent(new CustomEvent('pulse:chat-unread-changed', { detail: { total } }));
    window.dispatchEvent(new CustomEvent('pulse:user-unread-changed', { detail: { total } }));
  } catch {}
}
function resetUnreadAll() {
  localStorage.setItem('pulse:chat:unreadUserMap', JSON.stringify({}));
  localStorage.setItem('pulse:chat:unreadUserTotal', '0');
  window.dispatchEvent(new CustomEvent('pulse:chat-unread-changed', { detail: { total: 0 } }));
  window.dispatchEvent(new CustomEvent('pulse:user-unread-changed', { detail: { total: 0 } }));
}

/* Чтобы не плодить несколько соединений — кэшируем сокет глобально */
function getHeaderSocket() {
  if (window.__pulseHeaderSock) return window.__pulseHeaderSock;
  const sock = io(`${WS_BASE}/chat`, { path: WS_PATH, transports: ['websocket','polling'] });
  window.__pulseHeaderSock = sock;
  return sock;
}

const Header = ({ onPropertiesClick }) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lang, setLang] = useState('hy');
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pulse_user') || 'null'); } catch { return null; }
  });
  const [unread, setUnread] = useState(readUnreadTotal());

  const location = useLocation();
  const navigate = useNavigate();

  /* — высота хэдера — */
  const headerRef = useRef(null);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const setVar = () => {
      const h = el.offsetHeight || FALLBACK_HEADER_OFFSET;
      document.documentElement.style.setProperty('--header-h', `${h}px`);
    };
    setVar();
    const ro = new ResizeObserver(setVar);
    ro.observe(el);
    window.addEventListener('resize', setVar);
    return () => { ro.disconnect(); window.removeEventListener('resize', setVar); };
  }, []);

  /* — язык — */
  useEffect(() => {
    const saved = localStorage.getItem('lang');
    const initial = saved || document.documentElement.lang || 'hy';
    if (!saved) localStorage.setItem('lang', initial);
    setLang(initial);
    document.documentElement.lang = initial;
  }, []);

  /* — auth — */
  useEffect(() => {
    const h = (e) => setUser(e.detail || null);
    window.addEventListener('pulse:auth', h);
    return () => window.removeEventListener('pulse:auth', h);
  }, []);

  /* — слушаем счётчик (и изменения из других вкладок) — */
  useEffect(() => {
    const onUnread = () => setUnread(readUnreadTotal());
    window.addEventListener('pulse:chat-unread-changed', onUnread);
    window.addEventListener('pulse:user-unread-changed', onUnread);
    window.addEventListener('storage', onUnread);
    setUnread(readUnreadTotal());
    return () => {
      window.removeEventListener('pulse:chat-unread-changed', onUnread);
      window.removeEventListener('pulse:user-unread-changed', onUnread);
      window.removeEventListener('storage', onUnread);
    };
  }, []);

  /* — лёгкое сокет-подключение в хедере для получения "вне чата" — */
  useEffect(() => {
    const tid = getThreadId();
    if (!tid) return;

    const sock = getHeaderSocket();
    // подстраховка — единожды присоединяемся как пользователь
    sock.emit('join', { role: 'user', threadId: tid });

    const onMsg = (m) => {
      if (!m?.threadId || m.threadId !== tid) return;
      // если мы НЕ на странице /contacts и это сообщение от админа — увеличиваем счётчик
      if (!location.pathname.startsWith('/contacts') && m.sender === 'admin') {
        bumpUnread(tid, +1);
      }
    };
    sock.on('message', onMsg);
    return () => { sock.off('message', onMsg); };
  }, [location.pathname]);

  /* — при переходе на /contacts сбрасываем счётчик и помечаем прочитанным на бэке — */
  useEffect(() => {
    if (location.pathname.startsWith('/contacts')) {
      const tid = getThreadId();
      resetUnreadAll();
      setUnread(0);
      if (tid) {
        const sock = getHeaderSocket();
        sock.emit('join', { role: 'user', threadId: tid });
        sock.emit('read', { threadId: tid, side: 'user' });
      }
    }
  }, [location.pathname]);

  const changeLang = (code) => {
    setLang(code);
    localStorage.setItem('lang', code);
    document.documentElement.lang = code;
  };

  const getHeaderOffset = () => {
    const v = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h'), 10);
    return Number.isFinite(v) ? v : FALLBACK_HEADER_OFFSET;
  };

  const findTarget = () =>
    document.getElementById('properties') ||
    document.getElementById('recent-properties') ||
    document.querySelector('[data-scroll="properties"]');

  const scrollToWithOffset = (el, offsetPx) => {
    const y = el.getBoundingClientRect().top + window.scrollY - offsetPx;
    window.scrollTo({ top: y, behavior: 'smooth' });
  };

  const smoothScrollToProperties = () => {
    const target = findTarget();
    if (target) { scrollToWithOffset(target, getHeaderOffset()); return true; }
    return false;
  };

  const handlePropertiesClick = (e) => {
    e.preventDefault();
    setMobileOpen(false);
    if (smoothScrollToProperties()) return;
    navigate('/');
    let tries = 0;
    const timer = setInterval(() => {
      if (smoothScrollToProperties() || ++tries > 25) clearInterval(timer);
    }, 80);
  };

  const t = TEXT[lang] || TEXT.hy;

  return (
    <>
      <HeaderWrapper ref={headerRef}>
        <Link to="/" aria-label="Go home" style={{ lineHeight: 0 }}>
          <LogoImg src={`${process.env.PUBLIC_URL}/pulselogo.PNG`} alt="Pulse Realty Logo" />
        </Link>

        <CallCircle href="tel:+37494444940" aria-label="Call">
          <PhoneIconR />
        </CallCircle>

        <Nav>
          <Link to="/">{t.home}</Link>
          <Link to="/about">{t.about}</Link>
          <Link to="/contacts">
            {t.contacts}
            {unread > 0 && <Badge>{unread}</Badge>}
          </Link>
          <Link to="/" onClick={handlePropertiesClick}>{t.properties}</Link>
        </Nav>

        <Actions>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <FlagGroup>
              <FlagBtn aria-label="Հայերեն" onClick={() => changeLang('hy')} $active={lang === 'hy'}><CountryFlag lang="hy" /></FlagBtn>
              <FlagBtn aria-label="Русский" onClick={() => changeLang('ru')} $active={lang === 'ru'}><CountryFlag lang="ru" /></FlagBtn>
              <FlagBtn aria-label="English" onClick={() => changeLang('en')} $active={lang === 'en'}><CountryFlag lang="en" /></FlagBtn>
            </FlagGroup>

            {user ? (
              <>
                <span style={{ color:'#fff' }}>{user.name || user.email}</span>
                <SignInButton
                  onClick={() => {
                    localStorage.removeItem('pulse_token');
                    localStorage.removeItem('pulse_user');
                    window.dispatchEvent(new CustomEvent('pulse:auth', { detail: null }));
                  }}
                >
                  {lang === 'ru' ? 'Выйти' : lang === 'en' ? 'Sign out' : 'Դուրս գալ'}
                </SignInButton>
              </>
            ) : (
              <SignInButton onClick={() => setShowAuthModal(true)}>{t.signin}</SignInButton>
            )}

            <AddButton as={Link} to="/sell">{t.cta}</AddButton>
          </div>
        </Actions>

        <Burger onClick={() => setMobileOpen(prev => !prev)}>
          {mobileOpen ? <FaTimes /> : <FaBars />}
        </Burger>
      </HeaderWrapper>

      {mobileOpen && (
        <MobileMenu>
          <Link to="/" className="menu-item" onClick={() => setMobileOpen(false)}>{t.home}</Link>
          <Link to="/about" className="menu-item" onClick={() => setMobileOpen(false)}>{t.about}</Link>
          <Link to="/contacts" className="menu-item" onClick={() => setMobileOpen(false)}>
            {t.contacts}{unread > 0 && <Badge style={{ marginLeft:8 }}>{unread}</Badge>}
          </Link>
          <button className="menu-item" onClick={handlePropertiesClick}>{t.properties}</button>
          <button className="menu-item" onClick={() => { setShowAuthModal(true); setMobileOpen(false); }}>{t.signin}</button>

          <div style={{ display:'flex', gap:12, marginTop:8 }}>
            <FlagBtn aria-label="Հայերեն" onClick={() => changeLang('hy')} $active={lang === 'hy'}><CountryFlag lang="hy" /></FlagBtn>
            <FlagBtn aria-label="Русский" onClick={() => changeLang('ru')} $active={lang === 'ru'}><CountryFlag lang="ru" /></FlagBtn>
            <FlagBtn aria-label="English" onClick={() => changeLang('en')} $active={lang === 'en'}><CountryFlag lang="en" /></FlagBtn>
          </div>

          <MobileCTA as={Link} to="/sell" onClick={() => setMobileOpen(false)}>
            {t.cta}
          </MobileCTA>
        </MobileMenu>
      )}

      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
};

export default Header;









































