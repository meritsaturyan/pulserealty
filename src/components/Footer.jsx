// src/components/Footer.jsx
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import {
  FaPhone,
  FaMapMarkerAlt,
  FaFacebookF,
  FaInstagram,
  FaTelegramPlane
} from 'react-icons/fa';
import { Link } from 'react-router-dom'; 

const T = {
  en: {
    sellText: 'Do you have a property for sale? We can help you sell it.',
    fullName: 'Full Name',
    email: 'Email Address',
    phone: 'Phone Number',
    request: 'Request a Callback',
    chatBtn: '💬 Online Chat',
    contact: 'Contact',
    chat: 'Chat',
    follow: 'Follow Us',
    openChat: 'Open Chat',
    address: '62 Republic St, Yerevan, Armenia',
    fillAll: 'Please fill in all fields.',
    thanks: (n, e, p) => `Thanks ${n}, we’ll contact you at ${e} or call ${p}`,
    rights: 'All rights reserved.',
  },
  ru: {
    sellText: 'У вас есть недвижимость на продажу? Мы поможем её продать.',
    fullName: 'Полное имя',
    email: 'Эл. почта',
    phone: 'Номер телефона',
    request: 'Заказать звонок',
    chatBtn: '💬 Онлайн-чат',
    contact: 'Контакты',
    chat: 'Чат',
    follow: 'Мы в соцсетях',
    openChat: 'Открыть чат',
    address: 'ул. Республики, 62, Ереван, Армения',
    fillAll: 'Пожалуйста, заполните все поля.',
    thanks: (n, e, p) => `Спасибо, ${n}! Свяжемся по ${e} или позвоним на ${p}`,
    rights: 'Все права защищены.',
  },
  hy: {
    sellText: 'Ունե՞ք վաճառքի անշարժ գույք։ Կօգնենք արագ վաճառել։',
    fullName: 'Անուն Ազգանուն',
    email: 'Էլ. հասցե',
    phone: 'Հեռախոսահամար',
    request: 'Պատվիրել զանգ',
    chatBtn: '💬 Առցանց չատ',
    contact: 'Կապ',
    chat: 'Չատ',
    follow: 'Հետևեք մեզ',
    openChat: 'Բացել չատը',
    address: 'Հանրապետության փողոց, 62, Երևան, Հայաստան',
    fillAll: 'Խնդրում ենք լրացնել բոլոր դաշտերը։',
    thanks: (n, e, p) => `Շնորհակալություն, ${n}։ Կկապվենք ${e} էլ. հասցեով կամ կզանգահարենք ${p} համարին`,
    rights: 'Բոլոր իրավունքները պաշտպանված են։',
  },
};

const getLang = () =>
  document.documentElement.lang || localStorage.getItem('lang') || 'en';

const FooterWrapper = styled.footer`
  background: #4a4a4a;
  color: white;
  padding: 32px 20px;
  text-align: center;
  position: relative;
  z-index: 0;
`;

const FooterContent = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 20px;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
`;

const Column = styled.div`
  flex: 1;
  min-width: 200px;
  text-align: left;

  h4 {
    color: #f0ae00;
    margin: 0 0 10px 0;
    font-size: 18px;
  }

  p, a {
    color: #ddd;
    font-size: 14px;
    text-decoration: none;
    display: block;
    margin-bottom: 6px;
    &:hover { color: #f0ae00; }
  }

  @media (max-width: 768px) {
    flex: 0 0 auto;
    width: 100%;
    max-width: 500px;
  }
`;

const SocialIcons = styled.div`
  margin-top: 8px;
  display: flex;
  gap: 12px;

  a {
    color: white;
    font-size: 18px;
    transition: color 0.3s;
    &:hover { color: #f0ae00; }
  }
`;

const BottomText = styled.div`
  border-top: 1px solid #555;
  padding-top: 14px;
  font-size: 14px;
  color: #c4c4c4;
`;

const SellBox = styled.div`
  background-color: #2e2e2e;
  padding: 18px;
  border-radius: 10px;
  margin: 20px auto 24px;
  max-width: 500px;
  text-align: center;
`;

const SellText = styled.p`
  font-size: 16px;
  margin-bottom: 12px;
  color: #f5f5f5;
`;

const InputField = styled.input`
  padding: 10px;
  width: 100%;
  max-width: 300px;
  margin-bottom: 8px;
  border: none;
  border-radius: 5px;
`;

const ChatButton = styled.button`
  padding: 10px 20px;
  background-color: transparent;
  border: 2px solid #f0ae00;
  color: #f0ae00;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
  transition: 0.3s;
  &:hover { background-color: #f0ae00; color: black; }
`;
ц


const PhoneIcon = styled(FaPhone)`
  transform: scaleX(-1);
`;

const Footer = () => {
  const [lang, setLang] = useState(getLang());
  const t = T[lang] || T.en;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

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

  const handleSubmit = () => {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      alert(t.fillAll);
      return;
    }
    alert(t.thanks(name, email, phone));
    setName(''); setEmail(''); setPhone('');
  };

  const year = new Date().getFullYear();

  return (
    <FooterWrapper>
      <SellBox>
        <SellText>{t.sellText}</SellText>

        <InputField
          type="text"
          placeholder={t.fullName}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <InputField
          type="email"
          placeholder={t.email}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <InputField
          type="tel"
          placeholder={t.phone}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <br />
        <ChatButton onClick={handleSubmit}>{t.request}</ChatButton>
        <br /><br />
        <ChatButton>{t.chatBtn}</ChatButton>
      </SellBox>

      <FooterContent>
        <Column>
          <h4>{t.contact}</h4>
          <a href="tel:+37494444940">
            <PhoneIcon /> 094444940
          </a>
          <a
            href={`https://www.google.com/maps?q=${encodeURIComponent(t.address)}`}
            target="_blank" rel="noopener noreferrer"
          >
            <FaMapMarkerAlt /> {t.address}
          </a>

        </Column>

        <Column>
          <h4>{t.chat}</h4>

          <Link to="/contacts"> {t.openChat} </Link>
        </Column>

        <Column>
          <h4>{t.follow}</h4>
          <SocialIcons>
            <a
              href="https://www.facebook.com/share/1FWngzVzdx/?mibextid=wwXIfr"
              target="_blank" rel="noopener noreferrer"
            >
              <FaFacebookF />
            </a>
            <a
              href="https://www.instagram.com/pulse_realty?igsh=MTRucWprdXIydGdwcQ=="
              target="_blank" rel="noopener noreferrer"
            >
              <FaInstagram />
            </a>
            <a
              href="https://t.me/Pulse_realty"
              target="_blank" rel="noopener noreferrer"
            >
              <FaTelegramPlane />
            </a>
          </SocialIcons>
        </Column>
      </FooterContent>

      <BottomText>© {year} Pulse Realty. {t.rights}</BottomText>
    </FooterWrapper>
  );
};

export default Footer;










