import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

const Wrapper = styled.div`
  background: #fff;
  padding: 100px 20px 60px; 
  min-height: 100vh;
  color: #1A3D4D;

  @media (min-width: 768px) {
    padding: 120px 40px 80px;
  }
`;

const Card = styled.div`
  max-width: 780px;
  margin: 0 auto;
  background: #ffffff;
  border: 1px solid #eef0f3;
  border-radius: 12px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.06);
  padding: 24px;

  @media (min-width: 768px) {
    padding: 32px;
  }
`;

const Title = styled.h2`
  margin: 0 0 20px 0;
  font-size: 28px;
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;

  @media (min-width: 640px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  color: #5a7184;
  margin-bottom: 6px;
`;

const Select = styled.select`
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  background: #fff;
  color: #1A3D4D;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  color: #1A3D4D;
`;

const Textarea = styled.textarea`
  width: 100%;
  min-height: 140px;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  color: #1A3D4D;
  resize: vertical;
`;

const SendButton = styled.button`
  margin-top: 16px;
  padding: 12px 18px;
  background: #f0ae00;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  width: 100%;

  &:hover {
    background: #e6a700;
  }
`;

const TEXT = {
  en: {
    title: 'Have a real estate for sale',
    propertyType: 'Property Type',
    dealType: 'Deal Type',
    fullName: 'Full Name',
    phone: 'Phone Number',
    notesLabel: 'Additional information',
    chooseType: 'Choose type…',
    chooseDeal: 'Choose deal…',
    fullNamePh: 'Your full name…',
    phonePh: 'Your phone number…',
    notesPh: 'Anything else we should know…',
    types: {
      commercial: 'Commercial Property',
      apartment: 'Apartment',
      land: 'Land',
      house: 'House',
    },
    deals: { selling: 'Selling', rent: 'Rent' },
    send: 'Send',
    alertFill: 'Please fill in: Property Type, Deal Type, Full Name and Phone.',
    thanks: 'Thanks',
    typeLbl: 'Type',
    dealLbl: 'Deal',
    phoneLbl: 'Phone',
    addInfoLbl: 'Additional info',
  },
  ru: {
    title: 'Есть недвижимость на продажу',
    propertyType: 'Тип недвижимости',
    dealType: 'Тип сделки',
    fullName: 'Полное имя',
    phone: 'Номер телефона',
    notesLabel: 'Дополнительная информация',
    chooseType: 'Выберите тип…',
    chooseDeal: 'Выберите сделку…',
    fullNamePh: 'Ваше полное имя…',
    phonePh: 'Ваш номер телефона…',
    notesPh: 'Любая дополнительная информация…',
    types: {
      commercial: 'Коммерческая недвижимость',
      apartment: 'Квартира',
      land: 'Земля',
      house: 'Дом',
    },
    deals: { selling: 'Продажа', rent: 'Аренда' },
    send: 'Отправить',
    alertFill: 'Пожалуйста, заполните: Тип недвижимости, Тип сделки, Полное имя и Телефон.',
    thanks: 'Спасибо',
    typeLbl: 'Тип',
    dealLbl: 'Сделка',
    phoneLbl: 'Телефон',
    addInfoLbl: 'Доп. информация',
  },
  hy: {
    title: 'Ունե՞ք վաճառքի անշարժ գույք',
    propertyType: 'Գույքի տեսակ',
    dealType: 'Գործարքի տեսակ',
    fullName: 'Ամբողջական անուն',
    phone: 'Հեռախոսահամար',
    notesLabel: 'Լրացուցիչ ինֆորմացիա',
    chooseType: 'Ընտրեք տեսակը…',
    chooseDeal: 'Ընտրեք գործարքը…',
    fullNamePh: 'Ձեր ամբողջական անունը…',
    phonePh: 'Ձեր հեռախոսահամարը…',
    notesPh: 'Այլ տեղեկություն, որը պետք է իմանանք…',
    types: {
      commercial: 'Առևտրային անշարժ գույք',
      apartment: 'Բնակարան',
      land: 'Հող',
      house: 'Տուն',
    },
    deals: { selling: 'Վաճառք', rent: 'Վարձակալություն' },
    send: 'Ուղարկել',
    alertFill: 'Խնդրում ենք լրացնել՝ Գույքի տեսակ, Գործարքի տեսակ, Անուն և Հեռախոսահամար։',
    thanks: 'Շնորհակալություն',
    typeLbl: 'Տեսակ',
    dealLbl: 'Գործարք',
    phoneLbl: 'Հեռախոս',
    addInfoLbl: 'Լրացուցիչ տեղեկություն',
  },
};

const SellProperty = () => {
  const [propertyType, setPropertyType] = useState('');
  const [dealType, setDealType] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');


  const [lang, setLang] = useState(
    document.documentElement.lang || localStorage.getItem('lang') || 'en'
  );


  useEffect(() => {
    const el = document.documentElement;
    const observer = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === 'attributes' && m.attributeName === 'lang') {
          setLang(el.lang || 'en');
        }
      }
    });
    observer.observe(el, { attributes: true });
    return () => observer.disconnect();
  }, []);

  const t = TEXT[lang] || TEXT.en;

  const submit = () => {
    if (!propertyType || !dealType || !fullName.trim() || !phone.trim()) {
      alert(t.alertFill);
      return;
    }
    alert(
      `${t.thanks}, ${fullName}!\n\n` +
      `${t.typeLbl}: ${propertyType}\n${t.dealLbl}: ${dealType}\n${t.phoneLbl}: ${phone}\n` +
      (notes ? `${t.addInfoLbl}: ${notes}` : '')
    );

    setPropertyType('');
    setDealType('');
    setFullName('');
    setPhone('');
    setNotes('');
  };

  return (
    <Wrapper>
      <Card>
        <Title>{t.title}</Title>

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
          <Label>{t.notesLabel}</Label>
          <Textarea
            placeholder={t.notesPh}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <SendButton onClick={submit}>{t.send}</SendButton>
      </Card>
    </Wrapper>
  );
};

export default SellProperty;

