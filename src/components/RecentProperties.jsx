// src/components/RecentProperties.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { FaBed, FaBath, FaRulerCombined, FaBuilding } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { getProperties, getPropertiesCached } from '../data/db';

const T = {
  en: {
    title: 'Recent Listings',
    beds: 'Beds',
    baths: 'Baths',
    sqft: 'sqft',
    bedsShort: 'bd',
    bathsShort: 'ba',
    floorShort: 'fl',
    viewDetails: 'View Details',
    noResults: (q) => `No properties found for “${q}”.`,
  },
  ru: {
    title: 'Недавние объекты',
    beds: 'Комнаты',
    baths: 'Ванные',
    sqft: 'кв. м',
    bedsShort: 'комн.',
    bathsShort: 'с/у',
    floorShort: 'эт.',
    viewDetails: 'Подробнее',
    noResults: (q) => `Объекты не найдены по запросу «${q}».`,
  },
  hy: {
    title: 'Վերջին ավելացված հայտարարություններ',
    beds: 'Սենյակներ',
    baths: 'Սանհանգույցներ',
    sqft: 'քմ',
    bedsShort: 'սեն.',
    bathsShort: 'ս/հ',
    floorShort: 'հարկ',
    viewDetails: 'Դիտել մանրամասները',
    noResults: (q) => `Հայտարարություններ չեն գտնվել «${q}» հարցմամբ։`,
  },
};

const STATUS_LABELS = {
  en: { 'For Sale': 'For Sale', 'For Rent': 'For Rent' },
  ru: { 'For Sale': 'В продаже', 'For Rent': 'В аренду' },
  hy: { 'For Sale': 'Վաճառք', 'For Rent': 'Վարձով' },
};

const TYPE_LABELS = {
  en: {
    Apartment: 'Apartment',
    House: 'House',
    'Commercial Space': 'Commercial Space',
    Land: 'Land',
  },
  ru: {
    Apartment: 'Квартира',
    House: 'Дом',
    'Commercial Space': 'Коммерческое помещение',
    Land: 'Земля',
  },
  hy: {
    Apartment: 'Բնակարան',
    House: 'Տուն',
    'Commercial Space': 'Կոմերցիոն տարածք',
    Land: 'Հող',
  },
};

const normalizeType = (p) => {
  const raw = (String(p?.type ?? '') + ' ' + String(p?.title ?? '')).toLowerCase();

  const isApt = /apartment|flat|квартир|բնակարան/.test(raw);
  const isHouse = /house|дом|տուն/.test(raw);
  const isCommercial = /commercial|коммер|կոմերց/.test(raw);
  const isLand = /land|plot|земл|участ|հող/.test(raw);

  if (isCommercial) return 'Commercial Space';
  if (isLand) return 'Land';
  if (isApt) return 'Apartment';
  if (isHouse) return 'House';
  return '';
};

const typeText = (p, lang) => {
  const key = normalizeType(p);
  return key ? (TYPE_LABELS[lang]?.[key] || key) : '';
};

const getLang = () =>
  document.documentElement.lang || localStorage.getItem('lang') || 'hy';

// ⬇️ плейсхолдер для картинок (чтобы не было пустого src)
const FALLBACK_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect fill='%23f3f4f6' width='100%25' height='100%25'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='24' fill='%239ca3af'%3EPhoto%3C/text%3E%3C/svg%3E";

// 🔹 помощник: красиво собрать подпись этажа
const hasVal = (v) => v !== null && v !== undefined && v !== '';

const getFloorLabel = (p) => {
  // сначала любые «текстовые» варианты, если ты вдруг сделаешь отдельное поле
  const textLike =
    p?.floorLabel ||
    p?.floor_text ||
    p?.floorText ||
    p?.floor_display;

  if (hasVal(textLike)) return String(textLike);

  // потом — текущий этаж
  const cur =
    p?.floor ??
    p?.level ??
    p?.floorNumber ??
    p?.storey ??
    p?.currentFloor;

  // и общее кол-во этажей
  const total =
    p?.buildingFloors ??
    p?.totalFloors ??
    p?.floors ??
    p?.floorCount ??
    p?.totalFloorCount;

  if (hasVal(cur) && hasVal(total)) return `${cur}/${total}`;
  if (hasVal(cur)) return String(cur);
  if (hasVal(total)) return String(total);

  return '—';
};

// ---------- styled ----------

const Section = styled.section`
  padding: 60px 40px;
  background: white;

  @media (max-width: 768px) {
    padding: 40px 16px;
  }
`;
const Title = styled.h2`
  text-align: center;
  font-size: clamp(20px, 4vw, 32px);
  margin-bottom: 10px;
`;
const Grid = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 30px;
`;

const Card = styled.div`
  width: 350px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: transform 0.25s ease, box-shadow 0.25s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12);
  }
`;

const ImageWrapper = styled.div`
  position: relative;
`;

const Tag = styled.span`
  position: absolute;
  top: 10px;
  left: 10px;
  background: ${({ $sale }) => ($sale ? '#28a745' : '#ffc107')};
  color: #fff;
  padding: 5px 10px;
  border-radius: 20px;
  font-size: 12px;
`;
const CategoryTag = styled.span`
  position: absolute;
  top: 10px;
  right: 10px;
  background: #d9f5e9;
  color: #1e865b;
  padding: 5px 10px;
  border-radius: 20px;
  font-size: 12px;
`;

const Img = styled.img`
  width: 100%;
  height: 200px;
  object-fit: cover;
`;
const Content = styled.div`
  padding: 20px;
`;
const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #666;
  margin: 10px 0;
  font-size: 15px;
`;
const InfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
`;
const Price = styled.div`
  color: #28a745;
  font-weight: bold;
  font-size: 20px;
`;
const ViewButton = styled.button`
  margin-top: 10px;
  background: #1e1e2c;
  color: #fff;
  padding: 10px 16px;
  border: none;
  border-radius: 4px;
  width: 100%;
`;

// ---------- компонент ----------

export default function RecentProperties({ filterText = '' }) {
  const [lang, setLang] = useState(getLang());
  const t = T[lang] || T.hy;

  const [rows, setRows] = useState(() => getPropertiesCached());
  const [hydrated, setHydrated] = useState(false);
  const lastNonEmptyRef = useRef(rows);

  // смена языка
  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === 'attributes' && m.attributeName === 'lang') {
          setLang(getLang());
        }
      }
    });
    obs.observe(el, { attributes: true });
    return () => obs.disconnect();
  }, []);

  // загрузка: сначала кеш, потом API + лёгкий поллинг
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setRows(getPropertiesCached());
        const list = await getProperties({ limit: 12 });
        if (!cancelled) setRows(Array.isArray(list) ? list : []);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }

    load();
    const timer = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (Array.isArray(rows) && rows.length) lastNonEmptyRef.current = rows;
  }, [rows]);

  const displayRows = useMemo(
    () => (rows?.length ? rows : lastNonEmptyRef.current || []),
    [rows],
  );

  const query = (filterText || '').trim().toLowerCase();

  const filtered = useMemo(() => {
    const base = Array.isArray(displayRows) ? displayRows : [];
    if (!query) return base;
    return base.filter((p) => {
      const haystack = `${p.title ?? ''} ${p.description ?? ''} ${
        p.type ?? ''
      } ${p.status ?? ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [displayRows, query]);

  const fmt = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n.toLocaleString() : v == null ? '' : String(v);
  };

  // статус
  const statusLabel = (status) => {
    const s = String(status || '').toLowerCase();
    const key =
      s === 'for_sale' || s === 'sale'
        ? 'For Sale'
        : s === 'for_rent' || s === 'rent'
        ? 'For Rent'
        : status || '';
    return STATUS_LABELS[lang]?.[key] || key;
  };

  // безопасная картинка
  const isProbablyUrl = (s) =>
    typeof s === 'string' &&
    (/^https?:\/\//i.test(s) ||
      s.startsWith('/') ||
      s.startsWith('blob:') ||
      s.startsWith('data:'));

  const safeCover = (p) => {
    const src =
      p?.cover_image ||
      (Array.isArray(p?.images) &&
        p.images[0] &&
        (p.images[0].url || p.images[0])) ||
      p?.image ||
      '';

    return isProbablyUrl(src) ? src : FALLBACK_IMG;
  };

  return (
    <Section id="properties">
      <Title>{t.title}</Title>

      <Grid>
        {filtered.map((property) => {
          const areaVal =
            property.area_sq_m ?? property.area ?? property.sqft;
          const cover = safeCover(property);
          const isSale = /sale/i.test(String(property.status || ''));
          const floorLabel = getFloorLabel(property);

          return (
            <Link
              key={property.id}
              to={`/property/${property.id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <Card $sale={isSale}>
                <ImageWrapper>
                  <Img
                    src={cover}
                    alt={property.title || 'property'}
                    onError={(e) => {
                      if (e.currentTarget.src !== FALLBACK_IMG) {
                        e.currentTarget.src = FALLBACK_IMG;
                      }
                    }}
                  />
                  <Tag $sale={isSale}>{statusLabel(property.status)}</Tag>
                  {typeText(property, lang) && (
                    <CategoryTag>{typeText(property, lang)}</CategoryTag>
                  )}
                </ImageWrapper>

                <Content>
                  <h4 style={{ margin: 0 }}>{property.title}</h4>

                  <InfoRow>
                    <InfoItem title={t.beds}>
                      <FaBed /> {property.beds ?? '—'} {t.bedsShort}
                    </InfoItem>
                    <InfoItem title={t.baths}>
                      <FaBath /> {property.baths ?? '—'} {t.bathsShort}
                    </InfoItem>
                    <InfoItem title={t.sqft}>
                      <FaRulerCombined />{' '}
                      {areaVal ? `${areaVal} ${t.sqft}` : '—'}
                    </InfoItem>
                    <InfoItem title={t.floorShort}>
                      <FaBuilding />{' '}
                      {floorLabel !== '—'
                        ? `${floorLabel} ${t.floorShort}`
                        : '—'}
                    </InfoItem>
                  </InfoRow>

                  <Price>
                    {property.currency === 'AMD' ? '' : '$'}
                    {fmt(property.price)}
                  </Price>

                  <ViewButton>{t.viewDetails}</ViewButton>
                </Content>
              </Card>
            </Link>
          );
        })}
      </Grid>

      {hydrated && filtered.length === 0 && (
        <p
          style={{
            textAlign: 'center',
            color: '#666',
            marginTop: 20,
          }}
        >
          {t.noResults(filterText)}
        </p>
      )}
    </Section>
  );
}
