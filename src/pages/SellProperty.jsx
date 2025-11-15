// src/pages/SellProperty.jsx
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';


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
const API_BASE = (() => {
  const w = typeof window !== 'undefined' ? window : {};
  const loc = w.location || { origin: 'http://localhost:3000' };

  const origin = new URL(loc.origin || 'http://localhost:3000');
  origin.hostname = normalizeHostname(origin.hostname);
  const isLocal = /^(localhost|127\.0\.0\.1)$/i.test(origin.hostname);


  const apiDev = isLocal ? 'http://localhost:5050' : origin.origin;

  return sanitizeBase(w.__PULSE_API_BASE || apiDev);
})();


const Wrapper = styled.div`
  background: #fff;
  padding: 100px 20px 60px;
  min-height: 100vh;
  color: #1A3D4D;
  @media (min-width: 768px) { padding: 120px 40px 80px; }
`;
const Card = styled.div`
  max-width: 780px; margin: 0 auto; background: #ffffff;
  border: 1px solid #eef0f3; border-radius: 12px; box-shadow: 0 6px 18px rgba(0,0,0,0.06);
  padding: 24px; @media (min-width: 768px) { padding: 32px; }
`;
const Title = styled.h2`margin: 0 0 20px 0; font-size: 28px;`;
const Row = styled.div`
  display: grid; grid-template-columns: 1fr; gap: 14px;
  @media (min-width: 640px) { grid-template-columns: 1fr 1fr; }
`;
const Label = styled.label`display:block;font-size:14px;color:#5a7184;margin-bottom:6px;`;
const Select = styled.select`
  width:100%;padding:12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;background:#fff;color:#1A3D4D;
`;
const Input = styled.input`
  width:100%;padding:12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;color:#1A3D4D;
`;
const Textarea = styled.textarea`
  width:100%;min-height:140px;padding:12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;color:#1A3D4D;resize:vertical;
`;
const SendButton = styled.button`
  margin-top:16px;padding:12px 18px;background:#f0ae00;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;width:100%;
  &:hover{background:#e6a700;}
`;

const TEXT = {
  en: {
    title:'Have a real estate for sale',
    propertyType:'Property Type', dealType:'Deal Type', fullName:'Full Name', phone:'Phone Number', email:'Email',
    notesLabel:'Additional information', chooseType:'Choose type…', chooseDeal:'Choose deal…',
    fullNamePh:'Your full name…', phonePh:'Your phone number…', emailPh:'Your email…', notesPh:'Anything else we should know…',
    types:{ commercial:'Commercial Property', apartment:'Apartment', land:'Land', house:'House' },
    deals:{ selling:'Selling', rent:'Rent' }, send:'Send',
    alertFill:'Please fill in: Property Type, Deal Type, Full Name and Phone.',
    okSent:'Thanks! We will contact you soon.', fail:'Failed to send. Please try again.',
  },
  ru: {
    title:'Есть недвижимость на продажу',
    propertyType:'Тип недвижимости', dealType:'Тип сделки', fullName:'Полное имя', phone:'Номер телефона', email:'Email',
    notesLabel:'Дополнительная информация', chooseType:'Выберите тип…', chooseDeal:'Выберите сделку…',
    fullNamePh:'Ваше полное имя…', phonePh:'Ваш номер телефона…', emailPh:'Ваш email…', notesPh:'Любая дополнительная информация…',
    types:{ commercial:'Коммерческая недвижимость', apartment:'Квартира', land:'Земля', house:'Дом' },
    deals:{ selling:'Продажа', rent:'Аренда' }, send:'Отправить',
    alertFill:'Пожалуйста, заполните: Тип недвижимости, Тип сделки, Полное имя и Телефон.',
    okSent:'Спасибо! Мы скоро свяжемся с вами.', fail:'Не удалось отправить. Попробуйте ещё раз.',
  },
  hy: {
    title:'Ունե՞ք վաճառքի անշարժ գույք',
    propertyType:'Գույքի տեսակ', dealType:'Գործարքի տեսակ', fullName:'Ամբողջական անուն', phone:'Հեռախոսահամար', email:'Էլ. փոստ',
    notesLabel:'Լրացուցիչ ինֆորմացիա', chooseType:'Ընտրեք տեսակը…', chooseDeal:'Ընտրեք գործարքը…',
    fullNamePh:'Ձեր ամբողջական անունը…', phonePh:'Ձեր հեռախոսահամարը…', emailPh:'Ձեր էլ. փոստը…', notesPh:'Այլ տեղեկություն, որը պետք է իմանանք…',
    types:{ commercial:'Առևտրային անշարժ գույք', apartment:'Բնակարան', land:'Հող', house:'Տուն' },
    deals:{ selling:'Վաճառք', rent:'Վարձակալություն' }, send:'Ուղարկել',
    alertFill:'Խնդրում ենք լրացնել՝ Գույքի տեսակ, Գործարքի տեսակ, Անուն և Հեռախոսահամար։',
    okSent:'Շնորհակալություն։ Մենք շուտով կապ կհաստատենք։', fail:'Չհաջողվեց ուղարկել։ Փորձեք կրկին։',
  },
};

export default function SellProperty() {
  const [propertyType, setPropertyType] = useState('');
  const [dealType, setDealType] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  const [lang, setLang] = useState(document.documentElement.lang || localStorage.getItem('lang') || 'en');
  const t = TEXT[lang] || TEXT.en;

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('pulse_user') || 'null');
      if (u) {
        if (u.name) setFullName(u.name);
        if (u.phone) setPhone(u.phone);
        if (u.email) setEmail(u.email);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    const observer = new MutationObserver((muts) => {
      for (const m of muts) if (m.type === 'attributes' && m.attributeName === 'lang') setLang(el.lang || 'en');
    });
    observer.observe(el, { attributes: true });
    return () => observer.disconnect();
  }, []);

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!propertyType || !dealType || !fullName.trim() || !phone.trim()) {
      alert(t.alertFill);
      return;
    }
    try {

      try {
        localStorage.setItem('pulse_user', JSON.stringify({
          name: fullName.trim(),
          phone: phone.trim(),
          email: (email || '').trim(),
        }));
      } catch {}

      const res = await fetch(`${API_BASE}/api/leads/sell`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: fullName.trim(),
          phone: phone.trim(),
          email: (email || '').trim(),
          propertyType,
          dealType,
          note: (notes || '').trim(),
          pageUrl: window.location.href,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'save failed');

      alert(t.okSent);
      setPropertyType(''); setDealType(''); setFullName(''); setPhone(''); setEmail(''); setNotes('');
    } catch {
      alert(t.fail);
    }
  };

  return (
    <Wrapper>
      <Card>
        <Title>{t.title}</Title>

        <form onSubmit={submit}>
          <Row>
            <div>
              <Label>{t.propertyType}</Label>
              <Select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} required>
                <option value="" disabled>{t.chooseType}</option>
                <option value={t.types.commercial}>{t.types.commercial}</option>
                <option value={t.types.apartment}>{t.types.apartment}</option>
                <option value={t.types.land}>{t.types.land}</option>
                <option value={t.types.house}>{t.types.house}</option>
              </Select>
            </div>

            <div>
              <Label>{t.dealType}</Label>
              <Select value={dealType} onChange={(e) => setDealType(e.target.value)} required>
                <option value="" disabled>{t.chooseDeal}</option>
                <option value={t.deals.selling}>{t.deals.selling}</option>
                <option value={t.deals.rent}>{t.deals.rent}</option>
              </Select>
            </div>
          </Row>

          <Row style={{ marginTop: 14 }}>
            <div>
              <Label>{t.fullName}</Label>
              <Input
                placeholder={t.fullNamePh}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>{t.phone}</Label>
              <Input
                placeholder={t.phonePh}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          </Row>

          <div style={{ marginTop: 14 }}>
            <Label>{t.email}</Label>
            <Input
              type="email"
              placeholder={t.emailPh}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div style={{ marginTop: 14 }}>
            <Label>{t.notesLabel}</Label>
            <Textarea
              placeholder={t.notesPh}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <SendButton type="submit">{t.send}</SendButton>
        </form>
      </Card>
    </Wrapper>
  );
}
