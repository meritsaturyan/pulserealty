// src/pages/PropertyDetails.jsx
import { Link, useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import properties from '../data/properties';
import { getProperties, getPropertyImages, getPropertyPanos, getPropertyPanosCloud } from '../data/db';
import { FaBed, FaBath, FaRulerCombined, FaCheck, FaBuilding } from 'react-icons/fa';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import ChatPortal from '../components/ChatPortal';

import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

import PanoLightbox from '../components/PanoLightbox';

import chat from '../lib/chatClient';


function toHttpBase(raw) {
  try {
    let b = String(raw || '').trim();
    if (!b) return '';
    if (b.startsWith('ws://')) b = 'http://' + b.slice(5);
    if (b.startsWith('wss://')) b = 'https://' + b.slice(6);


    if (!/^https?:\/\//i.test(b)) {
      b = `${window.location.protocol}//${b}`;
    }

    const u = new URL(b);
    return u.origin.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

const CHAT_HTTP_BASE = toHttpBase(chat?.API_BASE);

const CHAT_ENABLED = true;

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const STORAGE_KEY = 'pulse:properties';

const TEXT = {
  en: {
    beds: 'Beds', baths: 'Baths', converting: 'Converting...', convFailed: 'Conversion failed',
    callUs: '📞 Call Us', onlineChat: '💬 Online Chat', namePh: 'Your full name...', emailPh: 'Your email...',
    phonePh: 'Your phone for callback...', send: 'Send', needNamePhone: 'Please enter your full name and phone number.',
    thanksContact: (n, e, p) => `Thanks ${n}, we will contact you${e ? ` at ${e}` : ''} or call you at ${p}`,
    amenitiesTitle: 'Amenities',
    actions: { call: '📞 Call', request: '📲 Request a Callback', other: '🔎 View Other Options' },
    location: 'Location', recommended: 'Recommended Properties',
    panoramaTitle: '360° View',
    modal: {
      title: 'Request a Callback', namePh: 'Your name...', phonePh: 'Your phone number...',
      cancel: 'Cancel', send: 'Send', need: 'Please enter your name and phone.',
      thanks: (n, p) => `Thanks ${n}! We will call you at ${p}.`,
    },
    notFound: 'Property not found.', chatHello: 'Hi! How can we help you?', area: '',
    amenList: ['Air Conditioning', 'Spa & Massage', 'Gym', 'Swimming Pool', 'Alarm', 'Alarm', 'Central Heating', 'Central Heating', 'Internet', 'Laundry Room', 'Pets Allowed', 'Pets Allowed', 'Window Covering', 'Free WiFi', 'Car Parking'],
  },
  ru: {
    beds: 'Спальни', baths: 'Ванные', converting: 'Конвертация...', convFailed: 'Ошибка конвертации',
    callUs: '📞 Позвонить', onlineChat: '💬 Онлайн-чат', namePh: 'Ваше полное имя...', emailPh: 'Ваш email...',
    phonePh: 'Ваш телефон для звонка...', send: 'Отправить', needNamePhone: 'Пожалуйста, введите имя и телефон.',
    thanksContact: (n, e, p) => `Спасибо, ${n}, мы свяжемся с вами${e ? ` по ${e}` : ''} или позвоним по номеру ${p}`,
    amenitiesTitle: 'Удобства',
    actions: { call: '📞 Позвонить', request: '📲 Заказать звонок', other: '🔎 Смотреть другие варианты' },
    location: 'Локация', recommended: 'Рекомендуемые объекты',
    panoramaTitle: 'Просмотр 360°',
    modal: {
      title: 'Заказать звонок', namePh: 'Ваше имя...', phonePh: 'Ваш номер телефона...',
      cancel: 'Отмена', send: 'Отправить', need: 'Пожалуйста, укажите имя и телефон.',
      thanks: (n, p) => `Спасибо, ${n}! Мы перезвоним на ${p}.`,
    },
    notFound: 'Объект не найден.', chatHello: 'Здравствуйте! Чем можем помочь?', area: '',
    amenList: ['Кондиционер', 'Спа и массаж', 'Тренажёрный зал', 'Бассейн', 'Сигнализация', 'Сигнализация', 'Центральное отопление', 'Центральное отопление', 'Интернет', 'Прачечная', 'Можно с животными', 'Можно с животными', 'Шторы', 'Бесплатный Wi-Fi', 'Парковка'],
  },
  hy: {
    beds: 'Սենյակ', baths: 'Սանհանգույց', converting: 'Փոխարկում...', convFailed: 'Փոխարկել չհաջողվեց',
    callUs: '📞 Զանգահարեք', onlineChat: '💬 Առցանց չատ',
    namePh: 'Ձեր անունը և ազգանունը...', emailPh: 'Ձեր էլ. փոստը...',
    phonePh: 'Ձեր հեռախոսահամարը...', send: 'Ուղարկել', needNamePhone: 'Խնդրում ենք գրել անունը և հեռախոսահամարը։',
    thanksContact: (n, e, p) => `Շնորհակալություն, ${n}, մենք կապ կհաստատենք${e ? ` ${e} հասցեով` : ''} կամ կզանգահարենք ${p} համարով`,
    amenitiesTitle: 'Հարմարություններ',
    actions: { call: '📞 Զանգ', request: '📲 Պատվիրել զանգ', other: '🔎 Տեսնել այլ տարբերակներ' },
    location: 'Գտնվելու վայրը', recommended: 'Առաջարկվող գույքեր',
    panoramaTitle: '360° տեսք',
    modal: {
      title: 'Պատվիրել զանգ', namePh: 'Ձեր անունը...', phonePh: 'Ձեր հեռախոսահամարը...',
      cancel: 'Չեղարկել', send: 'Ուղարկել', need: 'Խնդրում ենք գրել անուն և հեռախոսահամար։',
      thanks: (n, p) => `Շնորհակալություն, ${n}! Մենք կզանգահարենք ${p} համարով։`,
    },
    notFound: 'Գույքը չի գտնվել։', chatHello: 'Բարև, ինչպե՞ս կարող ենք օգնել:', area: '',
    amenList: ['Օդորակիչ', 'Սպա և մերսում', 'Սպորտդահլիճ', 'Լողավազան', 'Ահազանգման համակարգ', 'Ահազանգման համակարգ', 'Կենտրոնական ջեռուցում', 'Կենտրոնական ջեռուցում', 'Ինտերնետ', 'Լվացքատուն', 'Թույլատրվում են կենդանիներ', 'Թույլատրվում են կենդանիներ', 'Պատուհանի վարագույրներ', 'Անվճար Wi-Fi', 'Ավտոկայանատեղի'],
  },
};

const Wrapper = styled.div`
  background:#fff;
  color:#1A3D4D;
  min-height:100vh;
  padding:40px 24px;
  overflow-x:hidden;
  @media (max-width:560px){ padding:24px 16px 32px; }
  *, *::before, *::after { box-sizing:border-box; }
`;

const Layout = styled.div`
  max-width:1100px;
  margin:0 auto;
  display:grid;
  grid-template-columns:1fr 380px;
  grid-template-areas:"top side" "extras side";
  gap:40px;
  @media (max-width:1024px){ grid-template-columns:1fr 340px; }
  @media (max-width:900px){
    grid-template-columns:1fr;
    grid-template-areas:"top" "side" "extras";
    gap:24px;
  }
`;

const LeftTop = styled.div`grid-area:top; min-width:0;`;
const LeftExtras = styled.div`grid-area:extras; min-width:0;`;
const Right = styled.div`
  grid-area:side;
  width:100%;
  max-width:100%;
  border:1px solid #eee; padding:20px; border-radius:10px;
  box-shadow:0 4px 12px rgba(0,0,0,.05);
  display:flex; flex-direction:column; gap:20px;
  box-sizing:border-box;
  min-width:0;
`;

const MainImage = styled.img`
  width:100%;
  display:block;
  border-radius:12px;
  margin-bottom:12px;
  aspect-ratio:16/9;
  object-fit:cover;
  object-position:center;
  max-height:48vh;
  cursor:zoom-in;
  @media (max-width:600px){
    aspect-ratio:4/3;
    max-height:unset;
  }
`;

const Title = styled.h2`
  font-size:clamp(18px, 4.6vw, 28px);
  line-height:1.2;
  margin:10px 0 8px;
`;

const Info = styled.div`
  display:flex; gap:24px; font-size:16px; margin-bottom:20px; color:#555;
  @media (max-width:560px){ flex-wrap:wrap; gap:10px 16px; font-size:14px; }
`;

const InfoTop = styled.div`
  display:flex; align-items:center; justify-content:space-between;
  gap:16px; margin-bottom:20px;
  @media (max-width:560px){ align-items:flex-start; flex-direction:column; gap:12px; }
`;

const PanoBtnInline = styled.button`
  padding: 10px 14px;
  background: #1A3D4D;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  &:hover { background: #16323f; }
`;

const InfoItem = styled.div`display:flex; align-items:center; gap:8px;`;

const DescWrap = styled.div`
  color:#555; font-size:16px; line-height:1.6;
  display:flex; flex-direction:column; gap:12px;
`;
const DescP = styled.p`margin:0; white-space:pre-line;`;
const DescList = styled.ul`
  margin:0; padding:0 0 0 18px; list-style:disc;
  display:flex; flex-direction:column; gap:6px;
`;
const DescLi = styled.li`margin:0;`;

const Box = styled.div`border:1px solid #eef0f3; border-radius:12px; padding:20px; margin-top:20px;`;
const BoxTitle = styled.h3`font-size:18px; font-weight:700; color:#1A3D4D; margin-bottom:16px;`;

const AmenList = styled.ul`
  list-style:none; padding:0; margin:0;
  display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:12px 24px;
  @media (max-width:900px){ grid-template-columns:repeat(2,1fr); }
  @media (max-width:560px){ grid-template-columns:1fr; }
`;
const AmenItem = styled.li`display:flex; align-items:center; gap:10px; color:#6b7280; font-size:16px;`;
const Check = styled.span`
  display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px;
  border-radius:9999px; background:#e8f8ef; color:#28a745; flex:0 0 auto;
`;

const ButtonBar = styled.div`display:flex; gap:12px; flex-wrap:wrap; @media (max-width:560px){ flex-direction:column; }`;
const ActionButton = styled.button`
  padding:12px 16px; background-color:${p => p.$green ? '#28a745' : '#f0ae00'};
  color:#fff; border:none; border-radius:6px; font-weight:bold; cursor:pointer; display:inline-flex; align-items:center; justify-content:center;
  &:hover{ background-color:${p => p.$green ? '#23913c' : '#e6a700'}; }
`;
const ModalOverlay = styled.div`position:fixed; inset:0; z-index:1000; background:rgba(0,0,0,.4); display:flex; align-items:center; justify-content:center;`;
const ModalCard = styled.div`background:#fff; width:90%; max-width:420px; border-radius:12px; padding:20px; box-shadow:0 10px 30px rgba(0,0,0,.15);`;
const ModalTitle = styled.h4`margin:0 0 12px 0; color:#1A3D4D;`;
const ModalActions = styled.div`display:flex; gap:10px; justify-content:flex-end; margin-top:12px;`;
const ModalCancel = styled.button`padding:10px 16px; background:transparent; border:1px solid #ccc; color:#1A3D4D; border-radius:6px; cursor:pointer;`;

const MapWrap = styled.div`height:360px; border-radius:12px; overflow:hidden; .leaflet-container{height:360px; width:100%;}`;

const RecWrap = styled.div` position:relative; `;
const RecViewport = styled.div` overflow:hidden; width:100%; border-radius:10px; `;
const RecTrack = styled.div` display:flex; transition:transform .45s ease; will-change:transform; width:100%; `;
const RecPage = styled.div` min-width:100%; padding:4px 0; `;
const RecGrid = styled.div`
  display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:20px;
  @media (max-width:900px){ grid-template-columns:repeat(2, minmax(0,1fr)); }
  @media (max-width:560px){ grid-template-columns:1fr; }
`;
const RecCard = styled.div`border:1px solid #eee; border-radius:12px; overflow:hidden; background:#fff; box-shadow:0 0 12px rgba(0,0,0,.05); cursor:pointer; transition:.3s; &:hover{ transform:translateY(-5px); box-shadow:0 8px 20px rgba(0,0,0,.15); }`;
const RecImage = styled.img`width:100%; height:160px; object-fit:cover;`;
const RecBody = styled.div`padding:14px;`;
const RecInfoRow = styled.div`display:flex; justify-content:space-between; color:#666; margin:8px 0; font-size:14px;`;
const RecPrice = styled.div`color:#28a745; font-weight:700; font-size:18px;`;

const Arrow = styled.button`
  position:absolute; top:50%; transform:translateY(-50%);
  border:1px solid #e5e7eb; background:#fff; width:44px; height:44px; border-radius:9999px;
  box-shadow:0 8px 20px rgba(0,0,0,.12); cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:22px; z-index:5;
`;
const ArrowLeft = styled(Arrow)`left:8px;`; const ArrowRight = styled(Arrow)`right:8px;`;

const Price = styled.div`font-size:24px; color:#f0ae00; font-weight:bold;`;
const CurrencySelect = styled.select`margin-left:12px; padding:4px;`;
const CallButton = styled.a`
  display:block; width:100%;
  padding:10px 16px; background:#28a745; color:#fff; text-align:center; border-radius:6px; font-weight:bold; text-decoration:none;
  &:hover{background:#23913c}
`;
const ChatButton = styled.button`
  display:block; width:100%;
  padding:10px 16px; background:#f0ae00; color:#fff; border:none; border-radius:6px; font-weight:bold; cursor:pointer;
`;
const Input = styled.input`padding:10px; border-radius:6px; border:1px solid #ccc; width:100%;`;
const SendPhoneButton = styled.button`margin-top:8px; padding:10px 16px; background:#f0ae00; color:#fff; border:none; border-radius:6px; font-weight:bold; cursor:pointer; width:100%; &:hover{background:#e6a700}`;


const Thumbs = styled.div`
  display:flex;
  gap:8px;
  overflow-x:auto;
  padding:6px 2px 8px;
  margin-bottom:18px;
  -webkit-overflow-scrolling:touch;
  scrollbar-width:thin;
`;
const ThumbSmall = styled.button`
  border:none; padding:0;
  width:72px; height:54px;
  border-radius:8px; overflow:hidden; cursor:pointer; flex:0 0 auto; opacity:.9;
  img{ width:100%; height:100%; object-fit:cover; display:block; }
  &.active{ outline:2px solid #f0ae00; opacity:1; }
`;


const LightboxOverlay = styled.div`
  position:fixed; inset:0; z-index:2000;
  background:rgba(0,0,0,.9);
  display:flex; align-items:center; justify-content:center;
`;
const LightboxImg = styled.img`
  max-width:90vw; max-height:85vh; object-fit:contain; border-radius:8px;
`;
const LBArrow = styled.button`
  position:fixed; top:50%; transform:translateY(-50%);
  width:44px; height:44px; border-radius:9999px;
  border:1px solid rgba(255,255,255,.3); background:rgba(0,0,0,.35);
  color:#fff; font-size:24px; cursor:pointer; z-index:2100;
`;
const LBArrowLeft = styled(LBArrow)`left:12px;`;
const LBArrowRight = styled(LBArrow)`right:12px;`;
const LBClose = styled.button`
  position:fixed; top:12px; right:12px; z-index:2100;
  width:40px; height:40px; border-radius:9999px;
  border:1px solid rgba(255,255,255,.3); background:rgba(0,0,0,.35);
  color:#fff; font-size:22px; cursor:pointer;
`;


const PanoWrap = styled.div`
  height: 420px;
  border-radius: 12px;
  overflow: hidden;
  background: #000;
  .pnlm-container, .pnlm-render-container { height: 100% !important; }
  @media (max-width: 600px){ height: 300px; }
`;

const PanoFSOverlay = styled.div`
  position: fixed; inset: 0; z-index: 3000;
  background: rgba(0,0,0,.9);
  display: flex; align-items: center; justify-content: center;
`;
const PanoFSWrap = styled.div`
  width: min(100vw, 100%);
  height: min(100vh, 100%);
`;
const PanoFSClose = styled.button`
  position: fixed;
  top: calc(env(safe-area-inset-top, 0px) + 12px);
  right: calc(env(safe-area-inset-right, 0px) + 12px);
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 10px;
  z-index: 9999;
  background: rgba(17, 24, 39, 0.6);
  color: #fff;
  box-shadow: 0 4px 12px rgba(0,0,0,.35);
  backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; line-height: 1; font-weight: 700; cursor: pointer;
  -webkit-tap-highlight-color: transparent;
`;


const CalcBox = styled.div`
  border: 1px solid #eef0f3;
  border-radius: 12px;
  padding: 16px;
  background: #fff;
  overflow: hidden;            
`;

const CalcGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
`;

const CalcField = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`;


const NumInput = styled.input`
  display: block;
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  color: #1A3D4D;
  outline: none;
`;

const SmallNote = styled.div`
  margin-top: 6px;
  color: #6b7280;
  font-size: 13px;
`;


const CalcCTA = styled.button`
  margin-top: 12px;
  width: 100%;
  padding: 12px 16px;
  background: #f0ae00;
  color: #111;
  border: none;
  border-radius: 8px;
  font-weight: 800;
  cursor: default;
  &:hover { background: #e6a700; }
  &:disabled { opacity: 1; }
`;
const CalcTitle = styled.h3`
  margin: 0 0 10px 0;
  font-size: 16px;
  font-weight: 800;
  color: #1A3D4D;
`;

const getLang = () => document.documentElement.lang || localStorage.getItem('lang') || 'hy';

function amenityName(a) {
  if (!a) return '';
  if (typeof a === 'string') return a;
  return a.name_hy || a.name_ru || a.name_en || a.code || '';
}

function renderDescriptionBlocks(raw) {
  const text = String(raw || '').replace(/\r/g, '');
  if (!text.trim()) return null;

  const blocks = text.split(/\n{2,}/);
  return blocks.map((block, i) => {
    const lines = block.split('\n').map(s => s.trim()).filter(Boolean);
    const isBullet = lines.length > 0 && lines.every(s => /^[•\-–—]/.test(s));

    if (isBullet) {
      return (
        <DescList key={`b-${i}`}>
          {lines.map((s, j) => (
            <DescLi key={j}>{s.replace(/^[•\-–—]\s*/, '')}</DescLi>
          ))}
        </DescList>
      );
    }
    return <DescP key={`p-${i}`}>{lines.join('\n')}</DescP>;
  });
}

const PropertyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [lang, setLang] = useState(getLang());
  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver((muts) => {
      muts.forEach((x) => {
        if (x.type === 'attributes' && x.attributeName === 'lang') {
          setLang(getLang());
        }
      });
    });
    obs.observe(el, { attributes: true });
    return () => obs.disconnect();
  }, []);

  function getCurrentUserMeta() {
    try {
      const u = JSON.parse(localStorage.getItem('pulse_user') || 'null');
      if (u && (u.name || u.email || u.phone)) {
        return { user: { name: u.name || '', email: u.email || '', phone: u.phone || '' } };
      }
    } catch { }
    const fallbackName = (document.querySelector('.header-username')?.textContent || '').trim();
    if (fallbackName) return { user: { name: fallbackName } };
    return {};
  }

  const t = TEXT[lang] || TEXT.hy;


  const [chatAvailable, setChatAvailable] = useState(!!CHAT_HTTP_BASE);
  useEffect(() => {
    if (!CHAT_ENABLED) { setChatAvailable(false); return; }
    if (!CHAT_HTTP_BASE) { setChatAvailable(false); return; }

    let cancelled = false;
    (async () => {
      try {
        const base = CHAT_HTTP_BASE;

        const endpoints = ['/api/health', '/api/ping', '/health', '/'];
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 1500);

        let ok = false;
        for (const ep of endpoints) {
          try {
            const res = await fetch(`${base}${ep}`, { credentials: 'include', signal: controller.signal });
            if (res && (res.ok || res.status === 204)) { ok = true; break; }
          } catch { /* ignore and continue */ }
        }
        clearTimeout(timer);
        if (!cancelled) setChatAvailable(ok);
      } catch {
        if (!cancelled) setChatAvailable(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);


  const [rows, setRows] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let alive = true;
    const res = getProperties();
    if (res && typeof res.then === 'function') {
      res.then(v => { if (!alive) return; setRows(Array.isArray(v) ? v : []); setHydrated(true); });
    } else {
      setRows(Array.isArray(res) ? res : []);
      setHydrated(true);
    }
    const onChange = () => {
      try { const cached = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); setRows(Array.isArray(cached) ? cached : []); }
      catch { }
    };
    window.addEventListener('pulse:properties-changed', onChange);
    window.addEventListener('storage', onChange);
    return () => { alive = false; window.removeEventListener('pulse:properties-changed', onChange); window.removeEventListener('storage', onChange); };
  }, []);

  const merged = useMemo(() => {
    const map = new Map();
    (Array.isArray(properties) ? properties : []).forEach(p => p && map.set(String(p.id), p));
    (Array.isArray(rows) ? rows : []).forEach(p => {
      if (!p) return;
      const key = String(p.id);
      const base = map.get(key) || {};
      map.set(key, { ...base, ...p });
    });
    return [...map.values()];
  }, [rows]);

  const property = useMemo(
    () => (Array.isArray(merged) ? merged : []).find(p => String(p?.id) === String(id)),
    [merged, id]
  );

  const propTitle = useMemo(() => property?.title || '', [property?.title]);

  const loadChatHistory = useCallback(async () => {
    const tid = chat.getThreadId?.();
    if (!tid) return;
    try {
      const items = await chat.fetchHistory?.(tid);
      setChatMessages(
        (Array.isArray(items) ? items : []).map(m => ({
          from: m.sender || 'user',
          sender: m.sender || 'user',
          text: m.text,
          ts: m.ts && m.ts._seconds ? m.ts._seconds * 1000 : (m.ts || Date.now()),
          threadId: tid,
        }))
      );
    } catch (e) { /* silent */ }
  }, []);

  const amenToShow = useMemo(() => {
    const selected = Array.isArray(property?.amenities)
      ? property.amenities.map(amenityName).filter(Boolean)
      : [];
    return selected.length ? selected : (Array.isArray(t.amenList) ? t.amenList : []);
  }, [property?.amenities, t.amenList]);

  useEffect(() => { window.scrollTo(0, 0); }, [id]);


  useEffect(() => {
    const handler = (e) => {
      const msg = (e && e.reason && (e.reason.message || String(e.reason))) || '';
      if (/Failed to fetch/i.test(msg)) e.preventDefault?.();
    };
    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, []);

  const [album, setAlbum] = useState([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const imgs = await getPropertyImages(id);
        if (!alive) return;
        setAlbum(Array.isArray(imgs) ? imgs.filter(Boolean) : []);
      } catch { setAlbum([]); }
    })();
    return () => { alive = false; };
  }, [id]);

  const images = useMemo(() => {
    const out = [];
    const seen = new Set();
    const push = (s) => {
      const u = String(s || '').trim();
      if (!u || seen.has(u)) return;
      const isAbs = /^https?:\/\//i.test(u);
      const isRel = u.startsWith('/');
      if (!isAbs && !isRel) return;
      seen.add(u);
      out.push(u);
    };
    if (property?.image) push(property.image);
    (Array.isArray(album) ? album : []).forEach(push);
    return out;
  }, [property?.image, album]);


  const [showPanoLB, setShowPanoLB] = useState(false);
  const openPanoLB = () => setShowPanoLB(true);
  const closePanoLB = () => setShowPanoLB(false);

  const [imgIndex, setImgIndex] = useState(0);
  const [showViewer, setShowViewer] = useState(false);
  useEffect(() => setImgIndex(0), [id]);
  useEffect(() => setImgIndex(0), [images.length]);

  const lat = Number(property?.lat) || 40.1772;
  const lng = Number(property?.lng) || 44.50349;

  const recList = useMemo(() => {
    if (!property) return [];
    const others = (Array.isArray(merged) ? merged : []).filter(p => p && p.id !== property.id);
    const sameType = others.filter(p => p?.type === property.type);
    const different = others.filter(p => p?.type !== property.type);
    return [...sameType, ...different];
  }, [merged, property]);

  const [panos, setPanos] = useState([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const local = getPropertyPanos(id);
        if (alive) setPanos(Array.isArray(local) ? local : []);

        const cloud = await getPropertyPanosCloud(id);
        if (alive && (!local || local.length === 0) && Array.isArray(cloud) && cloud.length) {
          setPanos(cloud);
        }
      } catch { }
    })();

    const onChange = (e) => {
      const pid = e?.detail?.propertyId;
      if (!pid || String(pid) === String(id)) {
        try { setPanos(getPropertyPanos(id) || []); } catch { }
      }
    };
    window.addEventListener('pulse:panos-changed', onChange);

    return () => { alive = false; window.removeEventListener('pulse:panos-changed', onChange); };
  }, [id]);

  const FORCED_PANOS = useMemo(() => ({
    '1755528464698': [
      'https://pannellum.org/images/alma.jpg',
      'https://pannellum.org/images/bma-1.jpg',
      'https://pannellum.org/images/bma-2.jpg',
    ],
  }), []);
  const FALLBACK_PANOS = useMemo(() => (['https://pannellum.org/images/alma.jpg']), []);

  const panoList = useMemo(() => {
    const list = [];
    if (Array.isArray(panos) && panos.length) list.push(...panos);
    if (Array.isArray(property?.panos)) list.push(...property.panos);
    const single = property?.pano || property?.panorama || property?.panoramaUrl || property?.panorama360;
    if (single) list.push(single);
    const forced = FORCED_PANOS?.[String(property?.id)];
    if (Array.isArray(forced)) list.push(...forced);

    const out = list.filter(Boolean);
    return out.length ? out : FALLBACK_PANOS;
  }, [panos, property, FORCED_PANOS, FALLBACK_PANOS]);

  const hasPanos = panoList.length > 0;
  const [panoIdx, setPanoIdx] = useState(0);
  useEffect(() => setPanoIdx(0), [id]);
  const panoSrc = panoList[panoIdx] || '';

  const panoRef = useRef(null);
  const panoBoxRef = useRef(null);
  const [showPanoFS, setShowPanoFS] = useState(false);
  const panoFsRef = useRef(null);
  const panoFsWrapRef = useRef(null);

  useEffect(() => {
    if (!panoSrc) return;
    const { pannellum } = window || {};
    if (!pannellum?.viewer) return;

    let viewer = null;
    const el = panoRef.current;
    if (el) {
      el.innerHTML = '';
      viewer = pannellum.viewer(el, {
        type: 'equirectangular',
        panorama: panoSrc,
        autoLoad: true,
        showZoomCtrl: true,
        compass: false,
        hfov: 100,
        autoRotate: -2,
      });
    }
    return () => { try { viewer?.destroy?.(); } catch { } };
  }, [panoSrc]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setShowPanoFS(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (showPanoFS) {
      root.style.overflow = 'hidden';
      setTimeout(() => panoFsWrapRef.current?.requestFullscreen?.().catch(() => { }), 0);
    } else {
      root.style.overflow = '';
      if (document.fullscreenElement) document.exitFullscreen?.();
    }
  }, [showPanoFS]);

  useEffect(() => {
    if (!showPanoFS || !panoSrc) return;
    const { pannellum } = window || {};
    if (!pannellum?.viewer) return;

    let fsViewer = null;
    const el = panoFsRef.current;
    if (el) {
      el.innerHTML = '';
      fsViewer = pannellum.viewer(el, {
        type: 'equirectangular',
        panorama: panoSrc,
        autoLoad: true,
        showZoomCtrl: true,
        compass: false,
        hfov: 95,
        autoRotate: -2,
      });

      const handleResize = () => { try { fsViewer?.resize(); } catch { } };
      setTimeout(handleResize, 100);
      window.addEventListener('resize', handleResize);
      document.addEventListener('fullscreenchange', handleResize);

      return () => {
        try { fsViewer?.destroy?.(); } catch { }
        window.removeEventListener('resize', handleResize);
        document.removeEventListener('fullscreenchange', handleResize);
      };
    }
  }, [showPanoFS, panoSrc]);

  const VISIBLE = 3;
  const pages = Math.max(1, Math.ceil((Array.isArray(recList) ? recList.length : 0) / VISIBLE));
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [id]);

  const [phone, setPhone] = useState(''); const [name, setName] = useState(''); const [email, setEmail] = useState('');
  const [showChat, setShowChat] = useState(false); const [chatInput, setChatInput] = useState(''); const [chatMessages, setChatMessages] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [convertedPrice, setConvertedPrice] = useState(null);
  const [conversionLoading, setConversionLoading] = useState(false);
  const [conversionError, setConversionError] = useState(null);
  const supportedCurrencies = ['USD', 'AMD', 'EUR', 'RUB'];

  const isApartment = /(apartment|flat|բնակարան|квартира)/i.test(String(property?.type || ''));
  const isForSale = /(sale|sell|վաճառ|продажа)/i.test(String(property?.status || property?.dealType || ''));
  const showMortgage = isApartment && isForSale;

  const [showRequest, setShowRequest] = useState(false);
  const [reqName, setReqName] = useState(''); const [reqPhone, setReqPhone] = useState('');

  const displayedPrice = (!conversionLoading && !conversionError)
    ? Number((convertedPrice ?? property?.price) || 0)
    : 0;

  const [loan, setLoan] = useState(() => displayedPrice || 0);
  const [down, setDown] = useState(0);
  const [years, setYears] = useState(20);
  const [rate, setRate] = useState(12.5);

  useEffect(() => { setLoan(displayedPrice); }, [displayedPrice]);

  const monthlyPayment = useMemo(() => {
    const P = Math.max(0, Number(loan || 0) - Number(down || 0));
    const n = Math.max(1, Number(years || 0) * 12);
    const r = Math.max(0, Number(rate || 0)) / 100 / 12;
    if (!isFinite(P) || !isFinite(n) || !isFinite(r)) return 0;
    if (r === 0) return P / n;
    const k = Math.pow(1 + r, n);
    return (P * r * k) / (k - 1);
  }, [loan, down, years, rate]);

  const money = (v) => {
    const val = Number(v || 0);
    const rounded = selectedCurrency === 'AMD'
      ? Math.round(val)
      : Math.round(val * 100) / 100;
    return rounded.toLocaleString() + ' ' + selectedCurrency;
  };

  const displayZeroAsBlank = (v) => (v === 0 || v === null || v === undefined ? '' : v);

  const handleNum = (setter) => (e) => {
    const raw = e.target.value;
    if (raw === '') { setter(0); return; }
    setter(Number(raw));
  };

  useEffect(() => {
    if (!property || !property.price) {
      setConvertedPrice(null);
      setConversionError(null);
      return;
    }
    if (selectedCurrency === 'USD') {
      setConvertedPrice(null);
      setConversionError(null);
      return;
    }
    let aborted = false;
    (async () => {
      setConversionLoading(true);
      try {
        const base = 'usd';
        const res = await fetch('https://latest.currency-api.pages.dev/v1/currencies/usd.json');
        if (!res.ok) throw new Error('net');
        const data = await res.json();
        const rates = (data && data[base]) || {};
        const rate = rates[selectedCurrency.toLowerCase()];
        if (!rate) throw new Error('no-rate');
        const usd = Number(property.price || 0);
        const raw = usd * Number(rate);
        const value = selectedCurrency === 'AMD' ? Math.round(raw) : Number(raw.toFixed(2));
        if (!aborted) { setConvertedPrice(String(value)); setConversionError(null); }
      } catch {
        if (!aborted) { setConvertedPrice(null); setConversionError('fail'); }
      } finally { if (!aborted) setConversionLoading(false); }
    })();
    return () => { aborted = true; };
  }, [selectedCurrency, property?.price]);


  useEffect(() => {
    if (!CHAT_ENABLED) return;
    (async () => {
      try {
        const metaBase = { source: 'details', propertyId: id, page: window.location.href, title: propTitle };
        const userMeta = getCurrentUserMeta();
        const meta = { ...metaBase, ...userMeta };
        await chat.connect?.(meta);
      } catch { /* silent */ }
    })();
  }, [id, propTitle]);

  useEffect(() => {
    if (!showChat || !CHAT_ENABLED || !chatAvailable) return;
    (async () => {
      try {
        await loadChatHistory();
        try { chat.markRead?.(chat.getThreadId?.()); } catch { }
      } catch { /* silent */ }
    })();
  }, [showChat, loadChatHistory, chatAvailable]);

  useEffect(() => {
    if (!CHAT_ENABLED) return;
    const off = chat.onMessage?.((m) => {
      if (!m || !m.text) return;
      const msg = {
        threadId: m.threadId,
        sender: m.sender === 'admin' ? 'admin' : 'user',
        text: String(m.text || ''),
        ts: typeof m.ts === 'number' ? m.ts :
          (m.ts && m.ts._seconds ? m.ts._seconds * 1000 : Date.now()),
      };
      setChatMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.sender === msg.sender && last.text === msg.text && Math.abs((msg.ts || 0) - (last.ts || 0)) < 1200) {
          return prev;
        }
        return [...prev, msg];
      });
    });
    return () => { try { off?.(); } catch { } };
  }, [id]);

  const handleSendMessage = async () => {
    const txt = (chatInput || '').trim();
    if (!txt) return;

    setChatMessages(prev => [
      ...prev,
      { text: txt, sender: 'user', ts: Date.now(), threadId: chat.getThreadId?.(), _temp: true }
    ]);
    setChatInput('');

    const base = { source: 'details', propertyId: id, page: window.location.href, title: propTitle };
    const meta = { ...base, ...getCurrentUserMeta() };
    try {
      await chat.getOrCreateThread?.(meta);
      await chat.sendMessage?.({ text: txt });
    } catch { /* silent */ }
  };


  async function postJson(url, payload) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });


    let data = null;
    const ct = res.headers.get('content-type') || '';
    try {
      data = ct.includes('application/json') ? await res.json() : await res.text();
    } catch { /* ignore */ }

    if (!res.ok) {
      const err = (data && (data.error || data.message)) || `HTTP ${res.status}`;
      throw new Error(err);
    }
    return data;
  }


const handlePhoneSend = async () => {
  if (!name.trim() || !phone.trim()) {
    alert(t.needNamePhone);
    return;
  }

  const payload = {
    full_name: name.trim(),
    name: name.trim(),
    email: (email || '').trim(),
    phone: phone.trim(),
    propertyId: id,
    propertyTitle: propTitle || '',
    page: window.location.href,
    source: 'details',
    title: propTitle || '',
    threadId: chat?.getThreadId?.() || '',
    note: `Details form • ${window.location.href} • ${propTitle || ''}`.trim(),
  };

  try {

    try {
      localStorage.setItem('pulse_contact', JSON.stringify({
        name: name.trim(), email: (email || '').trim(), phone: phone.trim()
      }));

    } catch {}


    try { await chat.setUserMeta?.({ name: name.trim(), email: (email || '').trim(), phone: phone.trim() }); } catch {}


    const origin = (CHAT_HTTP_BASE || window.location.origin).replace(/\/+$/, '');
    const postJson = async (url, body) => {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      return true;
    };

    try {
      await postJson(`${origin}/api/customers`, payload);
    } catch (e1) {

      await postJson(`${origin}/customers`, payload);
    }

    alert(t.thanksContact(name, email, phone));
    setName(''); setEmail(''); setPhone('');
  } catch {
    const msg = lang === 'ru'
      ? 'Не удалось отправить. Попробуйте ещё раз.'
      : lang === 'en' ? 'Failed to send. Please try again.'
      : 'Չհաջողվեց ուղարկել։ Փորձեք կրկին։';
    alert(msg);
  }
};



  const submitRequest = () => {
    if (!reqName.trim() || !reqPhone.trim()) return alert(t.modal.need);
    alert(t.modal.thanks(reqName, reqPhone)); setShowRequest(false); setReqName(''); setReqPhone('');
  };

  if (!hydrated && !property) return <Wrapper><p>Բեռնում…</p></Wrapper>;
  if (!property) return <Wrapper><p>{t.notFound}</p></Wrapper>;

  const areaVal = property.area ?? property.sqft ?? '';

  const coverSrc =
    (images[Math.min(imgIndex, Math.max(images.length - 1, 0))] ||
      property?.image ||
      'https://via.placeholder.com/1200x800?text=Photo');

  return (
    <Wrapper>
      <Layout>
        <LeftTop>
          <>
            <MainImage
              src={coverSrc}
              alt={property.title || 'photo'}
              onClick={() => setShowViewer(true)}
            />
            {images.length > 1 && (
              <Thumbs>
                {images.map((src, i) => (
                  <ThumbSmall
                    key={i}
                    onClick={() => setImgIndex(i)}
                    className={i === imgIndex ? 'active' : ''}
                    aria-label={`photo ${i + 1}`}
                  >
                    <img
                      src={src || 'https://via.placeholder.com/160x120?text=Photo'}
                      alt={`thumb-${i}`}
                    />
                  </ThumbSmall>
                ))}
              </Thumbs>
            )}
          </>
          <Title>{property.title}</Title>
          <InfoTop>
            <Info>
              <InfoItem><FaBed /> {property.beds} {t.beds}</InfoItem>
              <InfoItem><FaBath /> {property.baths} {t.baths}</InfoItem>
              <InfoItem><FaRulerCombined /> {areaVal ? areaVal : '—'}{t.area}</InfoItem>
              <InfoItem><FaBuilding /> {property.floor ?? property.level ?? property.floorNumber ?? property.storey ?? '—'}</InfoItem>
            </Info>

            {hasPanos && (
              <PanoBtnInline onClick={openPanoLB}>360°</PanoBtnInline>
            )}
          </InfoTop>

          <DescWrap>{renderDescriptionBlocks(property.description)}</DescWrap>
        </LeftTop>

        <Right>
          <Price>
            {conversionLoading && t.converting}
            {conversionError && t.convFailed}
            {!conversionLoading && !conversionError && (
              <>
                {((convertedPrice && Number(convertedPrice)) || Number(property.price || 0)).toLocaleString()} {selectedCurrency}
              </>
            )}
            <CurrencySelect value={selectedCurrency} onChange={(e) => setSelectedCurrency(e.target.value)}>
              {supportedCurrencies.map(cur => <option key={cur} value={cur}>{cur}</option>)}
            </CurrencySelect>
          </Price>

          <CallButton href="tel:+37477447599">{t.callUs}</CallButton>
          <ChatButton
            onClick={() => {
              if (!CHAT_ENABLED || !chatAvailable) {
                const msg =
                  lang === 'ru' ? 'Чат сейчас недоступен. Попробуйте позже.' :
                    lang === 'en' ? 'Chat is currently unavailable. Please try again later.' :
                      'Չատը այժմ հասանելի չէ։ Փորձեք ավելի ուշ։';
                alert(msg);
                return;
              }
              setShowChat(true);
            }}
          >
            {t.onlineChat}
          </ChatButton>

          <div>
            <Input placeholder={t.namePh} value={name} onChange={(e) => setName(e.target.value)} required />
            <Input type="email" placeholder={t.emailPh} value={email} onChange={(e) => setEmail(e.target.value)} style={{ marginTop: 8 }} />
            <Input placeholder={t.phonePh} value={phone} onChange={(e) => setPhone(e.target.value)} style={{ marginTop: 8 }} required />
            <SendPhoneButton onClick={handlePhoneSend}>{t.send}</SendPhoneButton>
          </div>
          {showMortgage && (
            <CalcBox>
              <CalcTitle>Հիպոտեկայի հաշվիչ</CalcTitle>
              <CalcGrid>
                <CalcField>
                  <span>Գույքի արժեք / Վարկի գումար ({selectedCurrency})</span>
                  <NumInput
                    type="number"
                    min="0"
                    step="0.01"
                    value={displayZeroAsBlank(loan)}
                    onChange={handleNum(setLoan)}
                  />
                </CalcField>

                <CalcField>
                  <span>Սկզբնական մուծում ({selectedCurrency})</span>
                  <NumInput
                    type="number"
                    min="0"
                    step="0.01"
                    value={displayZeroAsBlank(down)}
                    onChange={handleNum(setDown)}
                  />
                </CalcField>

                <CalcField>
                  <span>Տևողություն (տարի)</span>
                  <NumInput
                    type="number"
                    min="1"
                    step="1"
                    value={displayZeroAsBlank(years)}
                    onChange={handleNum(setYears)}
                  />
                </CalcField>

                <CalcField>
                  <span>Տոկոսադրույք (% տարեկան)</span>
                  <NumInput
                    type="number"
                    min="0"
                    step="0.1"
                    value={displayZeroAsBlank(rate)}
                    onChange={handleNum(setRate)}
                  />
                </CalcField>
              </CalcGrid>

              <CalcCTA type="button" disabled>
                Ամսական վճարում՝ {money(monthlyPayment)}
              </CalcCTA>
              <SmallNote>Սա նախնական հաշվարկ է և կարող է տարբերվել բանկի պայմաններից։</SmallNote>
            </CalcBox>
          )}

        </Right>

        <LeftExtras>
          <Box>
            <BoxTitle>{t.amenitiesTitle}</BoxTitle>
            <AmenList>
              {amenToShow.map((a, idx) => (
                <AmenItem key={`${a}-${idx}`}>
                  <Check><FaCheck size={12} /></Check>{a}
                </AmenItem>
              ))}
            </AmenList>
          </Box>

          <Box>
            <ButtonBar>
              <ActionButton as="a" href="tel:+37477447599" $green>{t.actions.call}</ActionButton>
              <ActionButton type="button" onClick={() => setShowRequest(true)}>{t.actions.request}</ActionButton>
              <ActionButton type="button" onClick={() => navigate('/')}>{t.actions.other}</ActionButton>
            </ButtonBar>
          </Box>

          {hasPanos && (
            <Box ref={panoBoxRef}>
              <BoxTitle style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {t.panoramaTitle}
                <button
                  onClick={() => setShowPanoFS(true)}
                  aria-label="Open 360 in fullscreen"
                  style={{
                    border: 'none', background: '#16323f', color: '#fff',
                    borderRadius: 8, padding: '6px 8px', cursor: 'pointer'
                  }}
                >
                  ⛶
                </button>
              </BoxTitle>

              <PanoWrap ref={panoRef} aria-label="360 panorama viewer" />

              {panoList.length > 1 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  {panoList.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPanoIdx(i)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 8,
                        border: i === panoIdx ? '2px solid #f0ae00' : '1px solid #d1d5db',
                        background: i === panoIdx ? '#fff7e6' : '#fff',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      aria-label={`Switch to 360 #${i + 1}`}
                      title={`360 #${i + 1}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </Box>
          )}

          <Box>
            <BoxTitle>{t.location}</BoxTitle>
            <MapWrap>
              <MapContainer center={[lat, lng]} zoom={14} scrollWheelZoom={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                <Marker position={[lat, lng]} icon={defaultIcon}><Popup>{property.title}</Popup></Marker>
              </MapContainer>
            </MapWrap>
          </Box>

          {Array.isArray(recList) && recList.length > 0 && (
            <Box>
              <BoxTitle>{t.recommended}</BoxTitle>
              <RecWrap>
                <RecViewport>
                  <RecTrack style={{ transform: `translateX(-${page * 100}%)` }}>
                    {Array.from({ length: pages }).map((_, pi) => {
                      const start = pi * VISIBLE;
                      const items = recList.slice(start, start + VISIBLE);
                      return (
                        <RecPage key={pi}>
                          <RecGrid>
                            {items.map((p) => (
                              <Link key={p.id} to={`/property/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <RecCard>
                                  <RecImage
                                    src={(Array.isArray(p.images) ? p.images[0] : (p.image || 'https://via.placeholder.com/600x400?text=Photo'))}
                                    alt={p.title}
                                  />
                                  <RecBody>
                                    <h4 style={{ margin: 0 }}>{p.title}</h4>
                                    <RecInfoRow>
                                      <span><FaBed /> {p.beds} {t.beds}</span>
                                      <span><FaBath /> {p.baths} {t.baths}</span>
                                      <span><FaRulerCombined /> {p.area ?? p.sqft ?? '—'}</span>
                                    </RecInfoRow>
                                    <RecPrice>${Number(p.price || 0).toLocaleString()}</RecPrice>
                                  </RecBody>
                                </RecCard>
                              </Link>
                            ))}
                          </RecGrid>
                        </RecPage>
                      );
                    })}
                  </RecTrack>
                </RecViewport>
                {pages > 1 && (
                  <>
                    <ArrowLeft onClick={() => setPage(p => (p - 1 + pages) % pages)} aria-label="Previous">‹</ArrowLeft>
                    <ArrowRight onClick={() => setPage(p => (p + 1) % pages)} aria-label="Next">›</ArrowRight>
                  </>
                )}
              </RecWrap>
            </Box>
          )}
        </LeftExtras>
      </Layout>

      <PanoLightbox isOpen={showPanoLB} onClose={closePanoLB} images={panoList} />

      {showPanoFS && (
        <PanoFSOverlay onClick={() => setShowPanoFS(false)}>
          <PanoFSClose onClick={(e) => { e.stopPropagation(); setShowPanoFS(false); }}>✕</PanoFSClose>
          <PanoFSWrap ref={panoFsWrapRef} onClick={(e) => e.stopPropagation()}>
            <div ref={panoFsRef} style={{ width: '100%', height: '100%' }} />
          </PanoFSWrap>
        </PanoFSOverlay>
      )}

      {showViewer && images.length > 0 && (
        <LightboxOverlay onClick={() => setShowViewer(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <LightboxImg src={images[Math.min(imgIndex, images.length - 1)] || 'https://via.placeholder.com/1200x800?text=Photo'} alt="photo" />
          </div>
          {images.length > 1 && (
            <>
              <LBArrowLeft aria-label="Prev" onClick={(e) => { e.stopPropagation(); setImgIndex(i => (i - 1 + images.length) % images.length); }}>‹</LBArrowLeft>
              <LBArrowRight aria-label="Next" onClick={(e) => { e.stopPropagation(); setImgIndex(i => (i + 1) % images.length); }}>›</LBArrowRight>
            </>
          )}
          <LBClose aria-label="Close" onClick={(e) => { e.stopPropagation(); setShowViewer(false); }}>×</LBClose>
        </LightboxOverlay>
      )}

      {showRequest && (
        <ModalOverlay onClick={() => setShowRequest(false)}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <ModalTitle>{t.modal.title}</ModalTitle>
            <Input placeholder={t.modal.namePh} value={reqName} onChange={(e) => setReqName(e.target.value)} />
            <Input placeholder={t.modal.phonePh} value={reqPhone} onChange={(e) => setReqPhone(e.target.value)} style={{ marginTop: 8 }} />
            <ModalActions>
              <ModalCancel onClick={() => setShowRequest(false)}>{t.modal.cancel}</ModalCancel>
              <ActionButton onClick={submitRequest}>{t.modal.send}</ActionButton>
            </ModalActions>
          </ModalCard>
        </ModalOverlay>
      )}

      {showChat && chatAvailable && (
        <ChatPortal
          messages={chatMessages}
          input={chatInput}
          setInput={setChatInput}
          onSend={handleSendMessage}
          onClose={() => setShowChat(false)}
          lang={lang}
        />
      )}
    </Wrapper>
  );
};

export default PropertyDetails;
