// src/pages/Home.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled, { css } from 'styled-components';
import RecentProperties from '../components/RecentProperties';
import AdvancedFilters from '../components/AdvancedFilters';
import { useOutletContext } from 'react-router-dom';


const REGIONS = {
  Yerevan: {
    label: { en: 'Yerevan', ru: 'Ереван', hy: 'Երևան' },
    towns: [
      { key: 'Ajapnyak', label: { en: 'Ajapnyak', ru: 'Ачапняк', hy: 'Աջափնյակ' } },
      { key: 'Avan', label: { en: 'Avan', ru: 'Аван', hy: 'Ավան' } },
      { key: 'Davtashen', label: { en: 'Davtashen', ru: 'Давташен', hy: 'Դավթաշեն' } },
      { key: 'Erebuni', label: { en: 'Erebuni', ru: 'Эребуни', hy: 'Էրեբունի' } },
      { key: 'Kanaker-Zeytun', label: { en: 'Kanaker-Zeytun', ru: 'Канакер-Зейтун', hy: 'Քանաքեռ-Զեյթուն' } },
      { key: 'Kentron', label: { en: 'Kentron', ru: 'Кентрон', hy: 'Կենտրոն' } },
      { key: 'Malatia-Sebastia', label: { en: 'Malatia-Sebastia', ru: 'Малатия-Սебастия', hy: 'Մալաթիա-Սեբաստիա' } },
      { key: 'Nor Nork', label: { en: 'Nor Nork', ru: 'Нор-Норк', hy: 'Նոր Նորք' } },
      { key: 'Nork-Marash', label: { en: 'Nork-Marash', ru: 'Норк-Мараш', hy: 'Նորք-Մարաշ' } },
      { key: 'Nubarashen', label: { en: 'Nubarashen', ru: 'Нубарашен', hy: 'Նուբարաշեն' } },
      { key: 'Shengavit', label: { en: 'Shengavit', ru: 'Շенգавит', hy: 'Շենգավիթ' } },
      { key: 'Arabkir', label: { en: 'Arabkir', ru: 'Арабкир', hy: 'Արաբկիր' } },
    ],
  },

  Aragatsotn: {
    label: { en: 'Aragatsotn', ru: 'Арагацотн', hy: 'Արագածոտն' },
    towns: [
      { key: 'Ashtarak', label: { en: 'Ashtarak', ru: 'Аштарак', hy: 'Աշտարակ' } },
      { key: 'Aparan', label: { en: 'Aparan', ru: 'Апаран', hy: 'Ապարան' } },
      { key: 'Talin', label: { en: 'Talin', ru: 'Талин', hy: 'Թալին' } },
      { key: 'Oshakan', label: { en: 'Oshakan', ru: 'Ошакан', hy: 'Օշական' } },
      { key: 'Tsaghkahovit', label: { en: 'Tsaghkahovit', ru: 'Цахкаовит', hy: 'Ծաղկահովիտ' } },
    ],
  },

  Ararat: {
    label: { en: 'Ararat', ru: 'Арарат', hy: 'Արարատ' },
    towns: [
      { key: 'Artashat', label: { en: 'Artashat', ru: 'Арташат', hy: 'Արտաշատ' } },
      { key: 'Masis', label: { en: 'Masis', ru: 'Масис', hy: 'Մասիս' } },
      { key: 'Vedi', label: { en: 'Vedi', ru: 'Веди', hy: 'Վեդի' } },
      { key: 'Ararat', label: { en: 'Ararat', ru: 'Арарат', hy: 'Արարատ' } },
      { key: 'Lusarat', label: { en: 'Lusarat', ru: 'Лусарат', hy: 'Լուսառատ' } },
    ],
  },

  Armavir: {
    label: { en: 'Armavir', ru: 'Армавир', hy: 'Արմավիր' },
    towns: [
      { key: 'Armavir', label: { en: 'Armavir', ru: 'Армавир', hy: 'Արմավիր' } },
      { key: 'Echmiadzin', label: { en: 'Vagharshapat (Etchmiadzin)', ru: 'Вагаршапат (Эчмиадзин)', hy: 'Վաղարշապատ (Էջմիածին)' } },
      { key: 'Metsamor', label: { en: 'Metsamor', ru: 'Мецамор', hy: 'Մեծամոր' } },
      { key: 'Baghramyan', label: { en: 'Baghramyan', ru: 'Баграмян', hy: 'Բաղրամյան' } },
    ],
  },

  Gegharkunik: {
    label: { en: 'Gegharkunik', ru: 'Гегаркуник', hy: 'Գեղարքունիք' },
    towns: [
      { key: 'Gavar', label: { en: 'Gavar', ru: 'Гавар', hy: 'Գավառ' } },
      { key: 'Sevan', label: { en: 'Sevan', ru: 'Севан', hy: 'Սևան' } },
      { key: 'Vardenis', label: { en: 'Vardenis', ru: 'Варденис', hy: 'Վարդենիս' } },
      { key: 'Martuni', label: { en: 'Martuni', ru: 'Мартуни', hy: 'Մարտունի' } },
      { key: 'Chambarak', label: { en: 'Chambarak', ru: 'Чамбарак', hy: 'Չամբարակ' } },
    ],
  },

  Lori: {
    label: { en: 'Lori', ru: 'Лори', hy: 'Լոռի' },
    towns: [
      { key: 'Vanadzor', label: { en: 'Vanadzor', ru: 'Ванадзор', hy: 'Վանաձոր' } },
      { key: 'Alaverdi', label: { en: 'Alaverdi', ru: 'Алаверди', hy: 'Ալավերդի' } },
      { key: 'Stepanavan', label: { en: 'Stepanavan', ru: 'Степанаван', hy: 'Ստեփանավան' } },
      { key: 'Spitak', label: { en: 'Spitak', ru: 'Спитак', hy: 'Սպիտակ' } },
      { key: 'Tashir', label: { en: 'Tashir', ru: 'Ташир', hy: 'Տաշիր' } },
    ],
  },

  Kotayk: {
    label: { en: 'Kotayk', ru: 'Котайк', hy: 'Կոտայք' },
    towns: [
      { key: 'Abovyan', label: { en: 'Abovyan', ru: 'Абовян', hy: 'Աբովյան' } },
      { key: 'Hrazdan', label: { en: 'Hrazdan', ru: 'Раздан', hy: 'Հրազդան' } },
      { key: 'Charentsavan', label: { en: 'Charentsavan', ru: 'Чаренцаван', hy: 'Չարենցավան' } },
      { key: 'Byureghavan', label: { en: 'Byureghavan', ru: 'Бюрегаван', hy: 'Բյուրեղավան' } },
      { key: 'Tsaghkadzor', label: { en: 'Tsaghkadzor', ru: 'Цахкадзор', hy: 'Ծաղկաձոր' } },
    ],
  },

  Shirak: {
    label: { en: 'Shirak', ru: 'Շирак', hy: 'Շիրակ' },
    towns: [
      { key: 'Gyumri', label: { en: 'Gyumri', ru: 'Гюмри', hy: 'Գյումրի' } },
      { key: 'Artik', label: { en: 'Artik', ru: 'Артик', hy: 'Արթիկ' } },
      { key: 'Akhuryan', label: { en: 'Akhuryan', ru: 'Ахурян', hy: 'Ախուրյան' } },
      { key: 'Maralik', label: { en: 'Maralik', ru: 'Маралик', hy: 'Մարալիկ' } },
    ],
  },

  Syunik: {
    label: { en: 'Syunik', ru: 'Сюник', hy: 'Սյունիք' },
    towns: [
      { key: 'Kapan', label: { en: 'Kapan', ru: 'Капан', hy: 'Կապան' } },
      { key: 'Goris', label: { en: 'Goris', ru: 'Горис', hy: 'Գորիս' } },
      { key: 'Sisian', label: { en: 'Sisian', ru: 'Сисиан', hy: 'Սիսիան' } },
      { key: 'Meghri', label: { en: 'Meghri', ru: 'Мегри', hy: 'Մեղրի' } },
      { key: 'Agarak', label: { en: 'Agarak', ru: 'Агарак', hy: 'Ագարակ' } },
    ],
  },

  VayotsDzor: {
    label: { en: 'Vayots Dzor', ru: 'Вайоц Дзор', hy: 'Վայոց ձոր' },
    towns: [
      { key: 'Yeghegnadzor', label: { en: 'Yeghegnadzor', ru: 'Ехегнадзор', hy: 'Եղեգնաձոր' } },
      { key: 'Vayk', label: { en: 'Vayk', ru: 'Вайк', hy: 'Վայք' } },
      { key: 'Jermuk', label: { en: 'Jermuk', ru: 'Джермук', hy: 'Ջերմուկ' } },
    ],
  },

  Tavush: {
    label: { en: 'Tavush', ru: 'Тавуш', hy: 'Տավուշ' },
    towns: [
      { key: 'Ijevan', label: { en: 'Ijevan', ru: 'Иджеван', hy: 'Իջևան' } },
      { key: 'Dilijan', label: { en: 'Dilijan', ru: 'Дилижан', hy: 'Դիլիջան' } },
      { key: 'Berd', label: { en: 'Berd', ru: 'Берд', hy: 'Բերդ' } },
      { key: 'Noyemberyan', label: { en: 'Noyemberyan', ru: 'Ноемберян', hy: 'Նոյեմբերյան' } },
    ],
  },
};


const regionKeys = Object.keys(REGIONS);
const getRegionLabel = (key, lang) => REGIONS[key]?.label?.[lang] || key;
const getTownLabel = (regionKey, townKey, lang) => {
  const list = REGIONS[regionKey]?.towns || [];
  if (!list.length) return townKey;
  if (typeof list[0] === 'string') return townKey;
  const item = list.find(x => x.key === townKey);
  return (item?.label?.[lang]) || townKey;
};


const TEXT = {
  en: {
    heroTitle: 'Search Your Next Home',
    heroSubtitle: '',
    forRent: 'For Rent',
    forSale: 'For Sale',
    propertyLabel: 'Search',
    keywordsPlaceholder: 'Search...',
    regionLabel: 'Region',
    districtsLabel: 'Districts',
    townsLabel: 'Towns/Villages',
    propertyType: 'Property Type',
    apartment: 'Apartment',
    house: 'House',
    villa: 'Commercial Space',
    land: 'Land',
    dealType: 'Deal Type',
    advanceFilter: 'Advance Filter',
    searchBtn: 'Search Property',
    callUs: '📞 Call Us:',
    openTelegram: 'Open Telegram Chat',
    statsTitle: 'Our Statistics',
    housesSold: 'Houses Sold',
    homesRented: 'Homes Rented',
    happyClients: 'Happy Clients',
    managedProperties: 'Managed Properties',
    clear: 'Clear',
    apply: 'OK',
  },
  ru: {
    heroTitle: 'Найдите свой новый дом',
    heroSubtitle: '',
    forRent: 'Аренда',
    forSale: 'Продажа',
    propertyLabel: 'Поиск',
    keywordsPlaceholder: 'Искать...',
    regionLabel: 'Область',
    districtsLabel: 'Районы',
    townsLabel: 'Города/сёла',
    propertyType: 'Тип недвижимости',
    apartment: 'Квартира',
    house: 'Дом',
    villa: 'Коммерческое помещение',
    land: 'Земля',
    dealType: 'Тип сделки',
    advanceFilter: 'Расширенный фильтр',
    searchBtn: 'Искать объекты',
    callUs: '📞 Позвоните нам:',
    openTelegram: 'Открыть чат в Telegram',
    statsTitle: 'Наша статистика',
    housesSold: 'Продано домов',
    homesRented: 'Сдано в аренду',
    happyClients: 'Довольные клиенты',
    managedProperties: 'Объектов в управлении',
    clear: 'Очистить',
    apply: 'ОК',
  },
  hy: {
    heroTitle: 'Գտե՛ք Ձեր հաջորդ տունը',
    heroSubtitle: '',
    forRent: 'Վարձով',
    forSale: 'Վաճառք',
    propertyLabel: 'Որոնում',
    keywordsPlaceholder: 'Որոնել...',
    regionLabel: 'Մարզ',
    districtsLabel: 'Վարչական շրջաններ',
    townsLabel: 'Քաղաքներ/գյուղեր',
    propertyType: 'Գույքի տեսակ',
    apartment: 'Բնակարան',
    house: 'Տուն',
    villa: 'Կոմերցիոն տարածք',
    land: 'Հող',
    dealType: 'Գործարքի տեսակ',
    advanceFilter: 'Լրացուցիչ ֆիլտր',
    searchBtn: 'Փնտրել գույք',
    callUs: '📞 Զանգահարեք մեզ՝',
    openTelegram: 'Բացել Telegram չատը',
    statsTitle: 'Մեր վիճակագրությունը',
    housesSold: 'Վաճառված տներ',
    homesRented: 'Տրված վարձով',
    happyClients: 'Գոհ հաճախորդներ',
    managedProperties: 'Կառավարվող գույքեր',
    clear: 'Մաքրել',
    apply: 'Լավ',
  },
};

const Hero = styled.div`
  height: 100vh;
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 0 20px;
  position: relative;

  ${({ $withBackground }) => $withBackground && css`
    background-image: url('https://images.unsplash.com/photo-1501183638710-841dd1904471');
    background-size: cover;
    background-position: center;

    &::before {
      content: '';
      position: absolute;
      inset: 0;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 0;
    }

    > * { position: relative; z-index: 1; }
  `}
`;


const Tabs = styled.div`
  display: flex;
  gap: 30px;
  margin-top: 20px;
  font-weight: bold;

  span {
    cursor: pointer;
    color: white;
    position: relative;
    padding-bottom: 4px;
    transition: color 0.3s;

    &.active { color: #f0ae00; }
    &.active::after {
      content: "";
      position: absolute;
      bottom: -4px; left: 0;
      width: 100%; height: 2px;
      background-color: #f0ae00;
    }
  }
`;

const SearchWrapper = styled.div`
  background: white;
  padding: 20px;
  border-radius: 10px;
  display: flex;
  align-items: flex-start;
  gap: 12px; /* было 15px — чуть компактнее */
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
  width: min(1100px, calc(100% - 48px));
  margin: 20px auto 0;

  /* по умолчанию можно переносить (для мобильных/узких) */
  flex-wrap: wrap;

  /* на десктопе — ВСЁ в одну строку */
  @media (min-width: 1024px){
    flex-wrap: nowrap;
  }

  justify-content: center;
  position: relative;
  z-index: 1;
`;



const InputBlock = styled.div`
  display: flex;
  flex-direction: column;
  position: relative; /* для dropdown */
  min-width: 140px;   /* было 180px */
  flex: 1 1 140px;    /* можно ужиматься/расти в пределах строки */
`;

const Label = styled.label`
  color: #8E90A6; font-size: 12px; margin-bottom: 4px;
`;
const Input = styled.input`
  border: none; outline: none; padding: 8px 12px; background: #fff; color: #1A3D4D; font-size: 14px;
`;
const Select = styled.select`
  border: none; outline: none; padding: 8px 12px; background: #fff; color: #1A3D4D; font-size: 14px;
`;

const ButtonBlock = styled(InputBlock)`
  flex: 0 0 auto;          /* не растягивать, держать компактным */
  justify-content: flex-start;
`;
const FakeLabel = styled(Label)` visibility: hidden; `;
const CheckboxWrapper = styled.div` display: flex; flex-direction: column; gap: 10px; margin-top: 8px; `;
const CheckboxLabel = styled.label`
  display: flex; align-items: center; gap: 12px; font-size: 16px; font-weight: 500; color: #555; cursor: pointer;
  input[type="checkbox"]{
    width:20px;height:20px;appearance:none;border:2px solid #ccc;border-radius:2px;background:#fff;position:relative;transition:.2s;
    &:checked{background:#f0ae00;border-color:#f0ae00;}
    &:checked::after{content:'';position:absolute;top:3px;left:6px;width:5px;height:10px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg);}
  }
`;

const FilterButton = styled.button`
  display:flex; align-items:center; border:none; background:none; color:#1A3D4D;
  font-size:14px; cursor:pointer; padding:8px 12px; white-space:nowrap;
`;
const SearchButton = styled.button`
  padding:10px 20px; background:#f0ae00; color:#fff; border:none; border-radius:4px; font-weight:bold; white-space:nowrap;
`;


const DesktopFilters = styled.div`
  max-height: ${({ $visible }) => ($visible ? '1500px' : '0')};
  opacity: ${({ $visible }) => ($visible ? '1' : '0')};
  overflow: hidden;
  transition: max-height .6s ease, opacity .4s ease;
  width: 100%;
  display: flex;
  justify-content: center;

  @media (max-width: 768px){ display:none; }
`;


const DesktopPanel = styled.div`
  width: 100%;
  max-width: 760px; /* было 1100px */
  padding: 8px 0 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;


const DesktopActions = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const CloseBtn = styled.button`
  padding: 6px 10px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  color: #111;
  border-radius: 6px;
  cursor: pointer;
`;

const Backdrop = styled.div`
  display:none;
  @media (max-width:768px){
    display:${({ $open }) => ($open ? 'block' : 'none')};
    position:fixed; inset:0; background:transparent; z-index:9;
  }
`;


const MobileDrawer = styled.div`
  display:none;

  @media (max-width:768px){
    display:${({ $open }) => ($open ? 'flex' : 'none')};
    position:fixed; left:0; right:0; bottom:0;
    width:100%;
    max-height:72vh;
    background:#fff;
    z-index:10;
    border-radius:16px 16px 0 0;
    box-shadow: 0 -8px 24px rgba(0,0,0,.15);
    padding:12px 16px max(16px, env(safe-area-inset-bottom));
    overflow-y:auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    flex-direction:column;
  }
`;

const Grabber = styled.div`
  width:44px; height:4px; border-radius:2px; background:#E5E7EB; margin:4px auto 10px;
`;

const DrawerActions = styled.div`
  display:flex; gap:12px; margin-top:12px;
  button{ flex:1; }
`;


const PseudoSelect = styled.button`
  display:flex; align-items:center; justify-content:space-between;
  padding:8px 12px; background:#fff; color:#1A3D4D; font-size:14px;
  border:none; outline:none; cursor:pointer;
  min-width:140px;            /* было 180px */
  border-radius:4px;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,.08);
  &:after{ content:'▾'; margin-left:12px; opacity:.7; }
`;


const TownsDropdown = styled.div`
  position:absolute; top: calc(100% + 6px); left: 0;
  width: min(360px, 90vw);
  max-height: 260px;
  background:#fff; border-radius:8px;
  box-shadow: 0 12px 28px rgba(0,0,0,.12), 0 2px 6px rgba(0,0,0,.08);
  padding:10px;
  overflow:auto;
  z-index: 20;
`;

const DropActions = styled.div`
  display:flex; gap:8px; margin-top:8px;
  button{ flex:1; padding:8px 10px; border-radius:6px; cursor:pointer; }
  .apply{ background:#f0ae00; color:#fff; border:none; }
  .clear{ background:#f3f4f6; border:1px solid #e5e7eb; color:#111; }
`;


const StatsWrapper = styled.section` max-width:1100px; margin:40px auto 0; padding:0 20px; `;
const StatsTitle = styled.h3` text-align:center; color:#1A3D4D; font-size:28px; margin:0 0 16px; `;
const StatsGrid = styled.div`
  display:grid; grid-template-columns:repeat(4, minmax(160px,1fr)); gap:16px;
  @media (max-width:900px){ grid-template-columns:repeat(2,1fr); }
  @media (max-width:520px){ grid-template-columns:1fr; }
`;
const StatCard = styled.div` background:#f0f4f7; border-radius:10px; padding:20px; text-align:center; `;
const StatNumber = styled.div` font-size:32px; font-weight:800; color:#f0ae00; margin-bottom:8px; `;
const StatLabel = styled.div` font-size:16px; color:#1A3D4D; `;

const ContactsSection = styled.div`
  background:#f9f9f9; padding:30px; text-align:center; margin-top:40px; font-size:16px; color:#1A3D4D;
  h3{ margin-bottom:10px; white-space: nowrap; }
  a{ color:#f0ae00; text-decoration:none; font-weight:bold; }
  @media (max-width:420px){ h3{ font-size:18px; } }
`;

const Home = ({ propertiesRef: propRef }) => {
  const { propertiesRef: ctxRef } = useOutletContext() ?? {};
  const propertiesRef = propRef || ctxRef;

  const [activeTab, setActiveTab] = useState('sale');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedTowns, setSelectedTowns] = useState([]);
  const [keywords, setKeywords] = useState('');


  const [openTowns, setOpenTowns] = useState(false);
  const townsRef = useRef(null);

  const searchAreaRef = useRef(null);

  const [lang, setLang] = useState(
    document.documentElement.lang || localStorage.getItem('lang') || 'hy'
  );

  useEffect(() => {
    const el = document.documentElement;
    const observer = new MutationObserver(muts => {
      for (const m of muts) {
        if (m.type === 'attributes' && m.attributeName === 'lang') {
          setLang(el.lang || 'hy');
        }
      }
    });
    observer.observe(el, { attributes: true });
    if (!el.lang) el.lang = localStorage.getItem('lang') || 'hy';
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onFocus = () => {
      const saved = localStorage.getItem('lang') || 'hy';
      if (saved !== lang) setLang(saved);
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [lang]);

  const t = useMemo(() => TEXT[lang] || TEXT.hy, [lang]);


  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile && showFilters) {
      const prev = document.body.style.overflow;
      document.body.dataset.prevOverflow = prev || '';
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = document.body.dataset.prevOverflow || '';
    }
    return () => { document.body.style.overflow = document.body.dataset.prevOverflow || ''; };
  }, [showFilters]);


  useEffect(() => {
    const handler = (e) => {
      if (!showFilters) return;
      if (window.matchMedia('(max-width:768px)').matches) return;
      if (searchAreaRef.current && !searchAreaRef.current.contains(e.target)) {
        setShowFilters(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showFilters]);


  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setShowFilters(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const handleTownToggle = (town) => {
    setSelectedTowns(prev => prev.includes(town) ? prev.filter(t => t !== town) : [...prev, town]);
  };

  const clearTowns = () => setSelectedTowns([]);

  const townsArray = useMemo(() => {
    if (!selectedRegion) return [];
    const raw = REGIONS[selectedRegion]?.towns || [];
    if (!raw.length) return [];
    if (typeof raw[0] === 'string') return raw.map(x => ({ key: x, label: x }));
    return raw.map(x => ({ key: x.key, label: x.label?.[lang] || x.key }));
  }, [selectedRegion, lang]);

  const summaryTowns = useMemo(() => {
    if (!selectedRegion) return '';
    if (!selectedTowns.length) return selectedRegion === 'Yerevan' ? t.districtsLabel : t.townsLabel;
    const labels = selectedTowns.map(k => getTownLabel(selectedRegion, k, lang));
    if (labels.length <= 2) return labels.join(', ');
    return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`;
  }, [selectedRegion, selectedTowns, lang, t]);

  const scrollToResults = () => { if (propertiesRef?.current) propertiesRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  return (
    <>
      <Hero $withBackground>
        <h1>{t.heroTitle}</h1>
        {t.heroSubtitle && <p>{t.heroSubtitle}</p>}
        <Tabs>
          <span
            className={activeTab === 'sale' ? 'active' : ''}
            onClick={() => setActiveTab('sale')}
          >
            {t.forSale}
          </span>
          <span
            className={activeTab === 'rent' ? 'active' : ''}
            onClick={() => setActiveTab('rent')}
          >
            {t.forRent}
          </span>
        </Tabs>


        { }
        <div ref={searchAreaRef} style={{ width: '100%' }}>
          <SearchWrapper>
            <InputBlock>
              <Label>{t.propertyLabel}</Label>
              <Input
                placeholder={t.keywordsPlaceholder}
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') scrollToResults(); }}
              />
            </InputBlock>

            <InputBlock>
              <Label>{t.regionLabel}</Label>
              <Select
                value={selectedRegion}
                onChange={(e) => {
                  setSelectedRegion(e.target.value);
                  setSelectedTowns([]);
                  setOpenTowns(false);
                }}
              >
                <option value="">{t.regionLabel}</option>
                {regionKeys.map(r => (
                  <option key={r} value={r}>{getRegionLabel(r, lang)}</option>
                ))}
              </Select>
            </InputBlock>

            {selectedRegion && (
              <InputBlock ref={townsRef}>
                <Label>{selectedRegion === 'Yerevan' ? t.districtsLabel : t.townsLabel}</Label>
                <PseudoSelect type="button" onClick={() => setOpenTowns(v => !v)}>
                  <span>{summaryTowns}</span>
                </PseudoSelect>

                {openTowns && (
                  <TownsDropdown>
                    <div style={{ fontSize: 12, color: '#8E90A6', margin: '0 0 6px' }}>
                      {selectedRegion === 'Yerevan' ? t.districtsLabel : t.townsLabel}
                    </div>
                    <CheckboxWrapper style={{ marginTop: 0 }}>
                      {townsArray.map(({ key, label }) => (
                        <CheckboxLabel key={key}>
                          <input type="checkbox" checked={selectedTowns.includes(key)} onChange={() => handleTownToggle(key)} />
                          {label}
                        </CheckboxLabel>
                      ))}
                    </CheckboxWrapper>
                    <DropActions>
                      <button type="button" className="clear" onClick={clearTowns}>{t.clear}</button>
                      <button type="button" className="apply" onClick={() => setOpenTowns(false)}>{t.apply}</button>
                    </DropActions>

                  </TownsDropdown>
                )}
              </InputBlock>
            )}

            <InputBlock>
              <Label>{t.propertyType}</Label>
              <Select>
                <option>{t.apartment}</option>
                <option>{t.house}</option>
                <option>{t.villa}</option>
                <option>{t.land}</option>
              </Select>
            </InputBlock>

            <InputBlock>
              <Label>{t.dealType}</Label>
              <Select value={activeTab} onChange={(e) => setActiveTab(e.target.value)}>
                <option value="sale">{t.forSale}</option>
                <option value="rent">{t.forRent}</option>
              </Select>

            </InputBlock>

            { }
            <ButtonBlock>
              <FakeLabel>_</FakeLabel>
              <FilterButton
                onClick={() => setShowFilters(v => !v)}
                aria-expanded={showFilters}
                aria-controls="desktop-advanced-filters"
              >
                &#9776;&nbsp;{t.advanceFilter}
              </FilterButton>
            </ButtonBlock>

            <ButtonBlock>
              <FakeLabel>_</FakeLabel>
              <SearchButton onClick={scrollToResults}>{t.searchBtn}</SearchButton>
            </ButtonBlock>
          </SearchWrapper>

          { }
          <DesktopFilters $visible={showFilters} id="desktop-advanced-filters">
            <DesktopPanel>
              <DesktopActions>
                <CloseBtn type="button" onClick={() => setShowFilters(false)}>✕ Close</CloseBtn>
              </DesktopActions>
              <AdvancedFilters />
            </DesktopPanel>
          </DesktopFilters>
        </div>

        { }
        <Backdrop $open={showFilters} onClick={() => setShowFilters(false)} />
        <MobileDrawer $open={showFilters} onClick={(e) => e.stopPropagation()}>
          <Grabber />
          <AdvancedFilters />
          <DrawerActions>
            <SearchButton onClick={() => { setShowFilters(false); scrollToResults(); }}>{t.searchBtn}</SearchButton>
            <button
              style={{ border: '1px solid #e5e7eb', background: '#fff', color: '#1A3D4D', borderRadius: 4, fontWeight: 600 }}
              onClick={() => setShowFilters(false)}
            >
              Close
            </button>
          </DrawerActions>
        </MobileDrawer>
      </Hero>

      { }
      { }
      <div
        id="properties"
        data-scroll="properties"
        ref={propertiesRef}
        style={{ scrollMarginTop: '120px' }}
      >
        <RecentProperties filterText={keywords} />
      </div>



      { }
      <StatsWrapper>
        <StatsTitle>{t.statsTitle}</StatsTitle>
        <StatsGrid>
          <StatCard><StatNumber>320+</StatNumber><StatLabel>{t.housesSold}</StatLabel></StatCard>
          <StatCard><StatNumber>210+</StatNumber><StatLabel>{t.homesRented}</StatLabel></StatCard>
          <StatCard><StatNumber>500+</StatNumber><StatLabel>{t.happyClients}</StatLabel></StatCard>
          <StatCard><StatNumber>75+</StatNumber><StatLabel>{t.managedProperties}</StatLabel></StatCard>
        </StatsGrid>
      </StatsWrapper>

      { }
      <ContactsSection>
        <h3>{t.callUs} +374 94444940</h3>
        <p>💬 Live Chat: <a href="https://t.me/your_support_bot" target="_blank" rel="noopener noreferrer">{t.openTelegram}</a></p>
      </ContactsSection>
    </>
  );
};

export default Home;








































