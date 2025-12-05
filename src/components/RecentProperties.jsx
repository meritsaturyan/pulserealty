// src/components/RecentProperties.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import styled, { css } from 'styled-components';
import { FaBed, FaBath, FaRulerCombined, FaBuilding } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { getProperties, getPropertiesCached, subscribeProperties } from '../data/db';

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
  en: { Apartment: 'Apartment', House: 'House', Villa: 'Commercial Space', Land: 'Land' },
  ru: { Apartment: 'Квартира', House: 'Дом', Villa: 'Коммерческое помещение', Land: 'Земля' },
  hy: { Apartment: 'Բնակարան', House: 'Տուն', Villa: 'Կոմերցիոն տարածք', Land: 'Հող' },
};

const getLang = () =>
  document.documentElement.lang || localStorage.getItem('lang') || 'hy';

const Section = styled.section`
  padding: 60px 40px;
  background: white;
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
  border: 1px solid #e5e7eb;      /* спокойная серая рамка */
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 4px 10px rgba(0,0,0,.06);
  cursor: pointer;
  transition: transform .25s ease, box-shadow .25s ease;
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 24px rgba(0,0,0,.12);
  }
`;


const ImageWrapper = styled.div` position: relative; `;


const Tag = styled.span`
  position: absolute;
  top: 10px; left: 10px;
  background: ${({ $sale }) => ($sale ? '#28a745' : '#ffc107')};
  color: white; padding: 5px 10px; border-radius: 20px; font-size: 12px;
`;

const CategoryTag = styled.span`
  position: absolute;
  top: 10px; right: 10px;
  background: #d9f5e9; color: #1e865b;
  padding: 5px 10px; border-radius: 20px; font-size: 12px;
`;
const Img = styled.img` width: 100%; height: 200px; object-fit: cover; `;
const Content = styled.div` padding: 20px; `;
const InfoRow = styled.div`
  display: flex; justify-content: space-between; align-items: center;
  color: #666; margin: 10px 0; font-size: 15px;
`;
const InfoItem = styled.div` display: flex; align-items: center; gap: 5px; `;
const Price = styled.div` color: #28a745; font-weight: bold; font-size: 20px; `;
const ViewButton = styled.button`
  margin-top: 10px; background: #1e1e2c; color: white;
  padding: 10px 16px; border: none; border-radius: 4px; width: 100%;
`;

const RecentProperties = ({ filterText = '' }) => {
  const [lang, setLang] = useState(getLang());
  const t = T[lang] || T.hy;

  const [rows, setRows] = useState(() => getPropertiesCached());
  const [hydrated, setHydrated] = useState(false);
  const lastNonEmptyRef = useRef(rows);

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

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await getProperties();
        if (alive) setRows(Array.isArray(res) ? res : []);
      } finally {
        if (alive) setHydrated(true);
      }
    })();

    let unsub = null;
    try { unsub = subscribeProperties((items) => setRows(Array.isArray(items) ? items : [])); } catch {}

    const reload = async () => {
      try {
        const res = await getProperties();
        setRows(Array.isArray(res) ? res : []);
      } catch {}
    };
    window.addEventListener('pulse:properties-changed', reload);

    return () => {
      alive = false;
      if (unsub) unsub();
      window.removeEventListener('pulse:properties-changed', reload);
    };
  }, []);

  useEffect(() => {
    if (Array.isArray(rows) && rows.length) lastNonEmptyRef.current = rows;
  }, [rows]);

  const displayRows = rows?.length ? rows : lastNonEmptyRef.current || [];

  const query = (filterText || '').trim().toLowerCase();
  const filtered = useMemo(() => {
    const base = Array.isArray(displayRows) ? displayRows : [];
    if (!query) return base;
    return base.filter((p) => {
      const haystack = `${p.title ?? ''} ${p.description ?? ''} ${p.type ?? ''} ${p.status ?? ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [displayRows, query]);

  const fmt = (n) => (typeof n === 'number' ? n.toLocaleString() : n);

  const statusLabel = (status) => STATUS_LABELS[lang]?.[status] || status || '';
  const typeLabel = (type) => TYPE_LABELS[lang]?.[type] || type || '';

  return (
    <Section id="properties">
      <Title>{t.title}</Title>

      <Grid>
        {filtered.map((property) => {
          const areaVal = property.area ?? property.sqft;
          const floorVal = property.floor ?? property.level ?? property.floorNumber ?? property.storey;

          const isSale = /sale/i.test(String(property.status || ''));

          return (
            <Link
              key={property.id}
              to={`/property/${property.id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              {}
              <Card $sale={isSale}>
                <ImageWrapper>
                  <Img src={property.images?.[0] || property.image} alt={property.title || 'property'} />
                  {}
                  <Tag $sale={isSale}>{statusLabel(property.status)}</Tag>
                  <CategoryTag>{typeLabel(property.type)}</CategoryTag>
                </ImageWrapper>
                <Content>
                  <h4 style={{ margin: 0 }}>{property.title}</h4>
                  <InfoRow>
                    <InfoItem title={t.beds}><FaBed /> {property.beds} {t.bedsShort}</InfoItem>
                    <InfoItem title={t.baths}><FaBath /> {property.baths} {t.bathsShort}</InfoItem>
                    <InfoItem title={t.sqft}>
                      <FaRulerCombined /> {areaVal ? `${areaVal} ${t.sqft}` : '—'}
                    </InfoItem>
                    <InfoItem title={t.floorShort}>
                      <FaBuilding /> {floorVal ? `${floorVal} ${t.floorShort}` : '—'}
                    </InfoItem>
                  </InfoRow>
                  <Price>${fmt(property.price)}</Price>
                  <ViewButton>{t.viewDetails}</ViewButton>
                </Content>
              </Card>
            </Link>
          );
        })}
      </Grid>

      {hydrated && filtered.length === 0 && (
        <p style={{ textAlign: 'center', color: '#666', marginTop: 20 }}>
          {t.noResults(filterText)}
        </p>
      )}
    </Section>
  );
};

export default RecentProperties;





















