// src/components/ChatPortal.jsx
import { useMemo } from 'react';
import styled from 'styled-components';

const Wrap = styled.div`
  position: fixed;
  right: 16px;
  bottom: 16px;
  width: min(360px, 92vw);
  height: 440px;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0,0,0,.18);
  overflow: hidden;
  z-index: 2000;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  background: #f0ae00;
  color: #fff;                 /* ← белый текст */
  padding: 10px 14px;
  font-weight: 800;
  font-size: 14px;
`;

const CloseBtn = styled.button`
  border: none;
  background: rgba(255,255,255,.15); /* светлый фон для контраста */
  color: #fff;                        /* ← белая иконка/текст */
  border-radius: 8px;
  padding: 4px 8px;
  font-weight: 900;
  cursor: pointer;
  line-height: 1;
  &:hover { background: rgba(255,255,255,.25); }
`;

const List = styled.div`
  flex: 1;
  overflow: auto;
  padding: 12px;
  background: #f7f8fb;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Row = styled.div`
  display: flex;
  justify-content: ${p => (p.$mine ? 'flex-end' : 'flex-start')};
`;

const Bubble = styled.div`
  max-width: 78%;
  padding: 8px 12px;
  border-radius: 12px;
  background: ${p => (p.$mine ? '#e8f4ff' : '#fff')};
  color: #0f172a;
  box-shadow: 0 1px 3px rgba(0,0,0,.08);
  white-space: pre-wrap;
`;

const SenderTag = styled.div`
  font-size: 11px;
  color: #64748b;
  margin: 0 4px 2px;
  text-align: ${p => (p.$mine ? 'right' : 'left')};
`;

const Form = styled.form`
  display: flex;
  gap: 8px;
  padding: 10px;
  border-top: 1px solid #e5e7eb;
  background: #fff;
`;

const Input = styled.input`
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  outline: none;
  &:focus { border-color: #94a3b8; }
`;

const SendBtn = styled.button`
  border: none;
  background: #f0ae00;
  color: #fff;
  font-weight: 800;
  padding: 10px 14px;
  border-radius: 10px;
  cursor: pointer;
  &:disabled { opacity: .5; cursor: default; }
`;

const getLang = () => document.documentElement.lang || localStorage.getItem('lang') || 'hy';

const I18N = {
  hy: { title: 'Առցանց-չատ', you: 'Դուք', admin: 'Ադմին', ph: 'Գրեք հաղորդագրությունը…', send: 'Ուղարկել', close: 'Փակել' },
  ru: { title: 'Онлайн-чат', you: 'Вы', admin: 'Админ', ph: 'Напишите сообщение…', send: 'Отправить', close: 'Закрыть' },
  en: { title: 'Online Chat', you: 'You', admin: 'Admin', ph: 'Type a message…', send: 'Send', close: 'Close' },
};

export default function ChatPortal({
  messages = [],
  input = '',
  setInput = () => {},
  onSend = () => {},
  onClose = () => {},
}) {
  const t = useMemo(() => I18N[getLang()] || I18N.hy, []);

  const normalized = Array.isArray(messages)
    ? messages.map(m => (typeof m === 'string' ? { text: m } : m || {}))
    : [];

  const handleSubmit = (e) => {
    e.preventDefault();
    const txt = String(input || '').trim();
    if (!txt) return;
    onSend(txt);
  };

  return (
    <Wrap>
      <Header>
        <span>{t.title}</span>
        <CloseBtn onClick={onClose} aria-label={t.close}>×</CloseBtn>
      </Header>

      <List>
        {normalized.map((m, i) => {
          const mine = (m.sender === 'user' || m.from === 'user');
          const tag = mine ? t.you : t.admin;
          return (
            <div key={m.id || `${i}-${m.ts || ''}`}>
              <SenderTag $mine={mine}>{tag}</SenderTag>
              <Row $mine={mine}>
                <Bubble $mine={mine}>{m.text}</Bubble>
              </Row>
            </div>
          );
        })}
      </List>

      <Form onSubmit={handleSubmit}>
        <Input
          placeholder={t.ph}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <SendBtn type="submit" disabled={!String(input || '').trim()}>
          {t.send}
        </SendBtn>
      </Form>
    </Wrap>
  );
}








