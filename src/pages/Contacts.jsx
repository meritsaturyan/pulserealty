// src/pages/Contacts.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { FaFacebookF, FaTelegramPlane, FaInstagram, FaMapMarkerAlt, FaEnvelope } from 'react-icons/fa';
import { io } from 'socket.io-client';


function normalizeHostname(host = '') {
  const map = {
    'а':'a','с':'c','е':'e','о':'o','р':'p','х':'x','к':'k','у':'y','м':'m','т':'t','н':'h','в':'v',
    'А':'A','С':'C','Е':'E','О':'O','Р':'P','Х':'X','К':'K','У':'Y','М':'M','Т':'T','Н':'H','В':'V',
  };
  return String(host).replace(/./g, ch => map[ch] ?? ch);
}
function sanitizeBase(u = '') {
  try {
    const url = new URL(String(u));
    url.hostname = normalizeHostname(url.hostname);
    return url.toString().replace(/\/$/, '');
  } catch {
    return String(u || '').replace(/\/$/, '');
  }
}

const { API_BASE, WS_BASE, WS_PATH } = (() => {
  const w = typeof window !== 'undefined' ? window : {};
  const loc = w.location || { origin: 'http://localhost:3000' };

  const origin = new URL(loc.origin || 'http://localhost:3000');
  origin.hostname = normalizeHostname(origin.hostname);
  const isLocal = /^(localhost|127\.0\.0\.1)$/i.test(origin.hostname);


  const apiDev = isLocal ? `http://localhost:5050` : origin.origin;
  const wsDev  = isLocal ? `ws://localhost:5050`  : origin.origin;

  const apiBase = sanitizeBase(w.__PULSE_API_BASE || apiDev);
  const wsBase  = sanitizeBase(w.__PULSE_WS_BASE  || wsDev);
  const wsPath  = w.__PULSE_SOCKET_PATH || w.__PULSE_WS_PATH || '/socket.io';

  try { console.log('[CONTACTS] API_BASE=', apiBase, 'WS_BASE=', wsBase, 'WS_PATH=', wsPath); } catch {}
  return { API_BASE: apiBase, WS_BASE: wsBase, WS_PATH: wsPath };
})();


const TEXT = {
  en: {
    title: 'Contact Us',
    call: '📞 Call Us',
    email: 'pulserealty.official@gmail.com',
    address: '62 Hanrapetutyan St, Yerevan, Armenia',
    typeHere: 'Type your message...',
    send: 'Send',
    hello: 'Hi! How can we help you today?',
    thanks: 'Thanks for your message! We’ll get back to you shortly.',
    telDisplay: '+374 94 444 940',
    telHref: 'tel:+37494444940',
    mapsQuery: '62 Hanrapetutyan St, Yerevan, Armenia',
    admin: 'Admin',
    you: 'You',
    chatTitle: 'Online Chat',
  },
  ru: {
    title: 'Свяжитесь с нами',
    call: '📞 Позвонить',
    email: 'pulserealty.official@gmail.com',
    address: 'Армения, Ереван, ул. Республики, 62',
    typeHere: 'Напишите сообщение…',
    send: 'Отправить',
    hello: 'Здравствуйте! Чем можем помочь?',
    thanks: 'Спасибо за сообщение! Мы скоро свяжемся с вами.',
    telDisplay: '+374 94 444 940',
    telHref: 'tel:+37494444940',
    mapsQuery: 'ул. Республики 62, Ереван, Армения',
    admin: 'Админ',
    you: 'Вы',
    chatTitle: 'Онлайн-чат',
  },
  hy: {
    title: 'Կապ մեզ հետ',
    call: '📞 Զանգահարել',
    email: 'pulserealty.official@gmail.com',
    address: 'Հանրապետության փողոց, 62, Երևան, Հայաստան',
    typeHere: 'Գրեք ձեր հաղորդագրությունը…',
    send: 'Ուղարկել',
    hello: 'Բարև! Ինչպե՞ս կարող ենք օգնել Ձեզ:',
    thanks: 'Շնորհակալություն ձեր հաղորդագրության համար, շուտով կկապվենք ձեզ հետ։',
    telDisplay: '+374 94 444 940',
    telHref: 'tel:+37494444940',
    mapsQuery: 'Հանրապետության փողոց 62, Երևան, Հայաստան',
    admin: 'Ադմին',
    you: 'Դուք',
    chatTitle: 'Առցանց-չատ',
  },
};

const getLang = () =>
  document.documentElement.lang || localStorage.getItem('lang') || 'hy';

const PageWrapper = styled.div`
  padding: calc(var(--header-h, 90px) + 20px) 20px 40px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Title = styled.h2`
  text-align: center;
  color: #f0ae00;
  margin-bottom: 40px;
`;

const ContactGrid = styled.div`
  display: flex;
  gap: 40px;
  flex-wrap: wrap;
  justify-content: center;
  @media (max-width: 768px) { flex-direction: column; }
`;

const InfoSection = styled.div`
  flex: 1;
  min-width: 280px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: #f0ae00;
`;

const GlassPanel = styled.div`
  background: rgba(255, 255, 255, 0.60);
  backdrop-filter: blur(10px) saturate(140%);
  -webkit-backdrop-filter: blur(10px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, 0.45);
  border-radius: 14px;
  padding: 18px 22px;
`;

const ContactLine = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: clamp(16px, 1.9vw, 20px);
  line-height: 1.35;
  color: #1A3D4D;
  svg { color: inherit; flex: 0 0 auto; }
`;

const ContactLink = styled.a`
  color: inherit;
  text-decoration: none;
  &:hover { text-decoration: underline; }
`;

const SocialIcons = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 10px;
  a { color: #f0ae00; font-size: 20px; transition: transform .2s;
      &:hover { transform: scale(1.2); color: #e6a700; } }
`;

const CallButton = styled.a`
  display: inline-block;
  text-align: center;
  background-color: #f0ae00;
  color: white;
  padding: 10px 20px;
  border-radius: 6px;
  text-decoration: none;
  font-weight: bold;
  transition: background-color .3s;
  &:hover { background-color: #e6a700; }
`;

const ChatContainer = styled.div`
  flex: 1;
  min-width: 360px;
  max-width: 100%;
  border: 1px solid #ccc;
  border-radius: 10px;
  height: 480px;
  display: flex;
  flex-direction: column;
  background: #fff;
`;

const ChatTop = styled.div`
  padding: 10px 14px;
  background: #f0ae00;
  color: #fff;
  font-weight: 800;
  border-radius: 10px 10px 0 0;
`;

const Messages = styled.div`
  flex: 1; overflow-y: auto; padding: 12px; gap: 6px; display: flex; flex-direction: column;
  background: #fafafa;
`;

const Msg = styled.div`
  align-self: ${({$mine}) => ($mine ? 'flex-end' : 'flex-start')};
  background: ${({$mine}) => ($mine ? '#e8f4ff' : '#fff')};
  color: #222;
  border-radius: 12px;
  padding: 8px 10px;
  max-width: 75%;
  box-shadow: 0 1px 3px rgba(0,0,0,.06);
`;

const MsgMeta = styled.div`
  font-size: 11px; color:#999; margin-bottom: 2px;
`;

const InputRow = styled.form`
  display:flex; gap:8px; padding:10px; border-top:1px solid #eee; background:#fff; border-radius: 0 0 10px 10px;
`;

const ChatInput = styled.input`
  flex: 1; padding: 10px; border-radius: 6px; border: 1px solid #ccc;
`;

const SendButton = styled.button`
  padding: 10px 16px; background-color: #f0ae00; color: white;
  border: none; border-radius: 6px; font-weight: bold; cursor: pointer;
  &:hover { background-color: #e6a700; }
`;


async function apiGetJSON(path) {
  const res = await fetch(`${API_BASE}${path}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`GET ${path} ${res.status}`);
  return res.json();
}
async function apiPostJSON(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type':'application/json' },
    body: JSON.stringify(body || {})
  });
  if (!res.ok) throw new Error(`POST ${path} ${res.status}`);
  return res.json();
}

const getThreadId = () =>
  localStorage.getItem('pulse:chat:threadId') ||
  localStorage.getItem('pulse:chat:tid') ||
  localStorage.getItem('chat:threadId') ||
  '';


function getClientSocket() {
  if (window.__pulseClientSock) return window.__pulseClientSock;
  const sock = io(`${WS_BASE}/chat`, {
    path: WS_PATH,
    transports: ['websocket', 'polling'],
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
  });
  sock.on('connect_error', (e) => console.warn('[Contacts] WS connect error:', e?.message || e));
  window.__pulseClientSock = sock;
  return sock;
}

const Contacts = () => {
  const [lang, setLang] = useState(getLang());
  const t = TEXT[lang] || TEXT.hy;

  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver((muts) => {
      muts.forEach((m) => {
        if (m.type === 'attributes' && m.attributeName === 'lang') {
          setLang(getLang());
        }
      });
    });
    obs.observe(el, { attributes: true });
    return () => obs.disconnect();
  }, []);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const listRef = useRef(null);
  const seenRef = useRef(new Set());
  const threadIdRef = useRef('');


  useEffect(() => {
    const h = document.querySelector('header')?.offsetHeight || 90;
    document.documentElement.style.setProperty('--header-h', `${h}px`);
    const onResize = () => {
      const nh = document.querySelector('header')?.offsetHeight || 90;
      document.documentElement.style.setProperty('--header-h', `${nh}px`);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      document.documentElement.style.removeProperty('--header-h');
    };
  }, []);

  const ensureThread = useMemo(() => async () => {
    let tid = getThreadId();
    if (!tid) {
      const userMeta = (() => {
        try { return JSON.parse(localStorage.getItem('pulse_user') || 'null') || {}; } catch { return {}; }
      })();
      const r = await apiPostJSON('/api/chat/start', userMeta);
      tid = r?.threadId || '';
      if (tid) {
        localStorage.setItem('pulse:chat:threadId', tid);
        localStorage.setItem('pulse:chat:tid', tid);
        localStorage.setItem('chat:threadId', tid);
      }
    }
    threadIdRef.current = tid;
    return tid;
  }, []);


  useEffect(() => {
    let unsub = () => {};
    (async () => {
      const tid = await ensureThread();
      if (!tid) return;

      try {
        const r = await apiGetJSON(`/api/chat/${tid}/messages`);
        const items = (Array.isArray(r?.items) ? r.items : r) || [];
        const s = seenRef.current;
        items.forEach(m => {
          const key = `${m.id || ''}|${m.ts || ''}|${m.sender}|${m.text}`;
          s.add(key);
        });
        setMessages(items);
        queueMicrotask(() => listRef.current?.scrollTo({ top: 1e9, behavior: 'auto' }));
      } catch { /* ignore */ }

      const sock = getClientSocket();
      sock.emit('join', { role: 'user', threadId: tid });
      sock.emit('read', { threadId: tid, side: 'user' });

      const onMsg = (m) => {
        if (!m?.threadId || m.threadId !== tid) return;
        const key = `${m.id || ''}|${m.ts || ''}|${m.sender}|${m.text}`;
        const s = seenRef.current;
        if (s.has(key)) return;
        s.add(key);
        setMessages(prev => {
          const cleaned = prev.filter(x => !(x?._temp && x.sender === m.sender && x.text === m.text));
          return [...cleaned, m];
        });
        queueMicrotask(() => listRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' }));
      };

      sock.on('message', onMsg);
      unsub = () => sock.off('message', onMsg);
    })();

    return () => unsub();
  }, [ensureThread]);

  const send = async (e) => {
    e?.preventDefault?.();
    const txt = String(input || '').trim();
    const tid = threadIdRef.current;
    if (!txt || !tid) return;

    const tempId = `c-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const mine = { id: tempId, sender: 'user', text: txt, ts: Date.now(), threadId: tid, _temp: true };
    setMessages(prev => [...prev, mine]);
    queueMicrotask(() => listRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' }));

    try {
      const sock = getClientSocket();
      sock.emit('message', { threadId: tid, text: txt, sender: 'user' });
    } catch { /* ignore */ }

    setInput('');
  };

  return (
    <PageWrapper>
      <Title>{t.title}</Title>

      <ContactGrid>
        {/* left column */}
        <InfoSection>
          <CallButton href={t.telHref} aria-label={`${t.call} ${t.telDisplay}`}>
            {t.call}
          </CallButton>

          <GlassPanel>
            <ContactLine>
              <FaEnvelope />
              <ContactLink href={`mailto:${t.email}`}>{t.email}</ContactLink>
            </ContactLine>

            <ContactLine style={{ marginTop: 10 }}>
              <FaMapMarkerAlt />
              <ContactLink
                href={`https://www.google.com/maps?q=${encodeURIComponent(t.mapsQuery)}`}
                target="_blank" rel="noopener noreferrer"
              >
                {t.address}
              </ContactLink>
            </ContactLine>
          </GlassPanel>

          <SocialIcons>
            <a href="https://www.facebook.com/share/1FWngzVzdx/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" title="Facebook">
              <FaFacebookF />
            </a>
            <a href="https://t.me/Pulse_realty" target="_blank" rel="noopener noreferrer" title="Telegram">
              <FaTelegramPlane />
            </a>
            <a href="https://www.instagram.com/pulse_realty?igsh=MTRucWprdXIydGdwcQ==" target="_blank" rel="noopener noreferrer" title="Instagram">
              <FaInstagram />
            </a>
          </SocialIcons>
        </InfoSection>

        {/* chat */}
        <ChatContainer>
          <ChatTop>{t.chatTitle}</ChatTop>

          <Messages ref={listRef}>
            {messages.length === 0 && (
              <Msg $mine={false}>
                <div style={{whiteSpace:'pre-wrap'}}>{t.hello}</div>
              </Msg>
            )}
            {messages.map((m) => (
              <Msg key={m.id || `${m.ts}-${m.sender}-${m.text}`} $mine={m.sender === 'user'}>
                <MsgMeta>{m.sender === 'admin' ? t.admin : t.you}</MsgMeta>
                <div style={{whiteSpace:'pre-wrap'}}>{m.text}</div>
              </Msg>
            ))}
          </Messages>

          <InputRow onSubmit={send}>
            <ChatInput
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.typeHere}
            />
            <SendButton type="submit">{t.send}</SendButton>
          </InputRow>
        </ChatContainer>
      </ContactGrid>
    </PageWrapper>
  );
};

export default Contacts;
