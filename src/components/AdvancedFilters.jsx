// src/components/AdvancedFilters.jsx
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

const FilterContainer = styled.div`
  background: white;
  padding: 30px;
  border-radius: 10px;
  margin-top: 20px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  width: 100%;
  max-width: 720px;
  box-sizing: border-box;
  @media (max-width: 768px) { padding: 20px 16px; }
`;

const Row = styled.div`
  display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 30px;
`;

const Select = styled.select`
  flex: 1; min-width: 180px; padding: 12px; border: 1px solid #ccc; border-radius: 6px;
  color: #1A3D4D; font-size: 16px;
  @media (max-width: 400px) { min-width: 140px; }
`;

const Input = styled.input`
  flex: 1; min-width: 180px; padding: 12px; border: 1px solid #ccc; border-radius: 6px;
  color: #1A3D4D; font-size: 16px;
  @media (max-width: 400px) { min-width: 140px; }
`;

const SectionTitle = styled.h4`font-size: 18px; color: #1A1A1A; font-weight: 600; margin-bottom: 15px;`;

const PriceLabel = styled.div`
  display: flex; justify-content: space-between; font-weight: 500; color: #333; margin-top: 5px;
`;

const AmenitiesContainer = styled.div`
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px 24px; margin-top: 20px; justify-items: start; align-items: start;
  @media (max-width: 768px) { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 16px; }
  @media (max-width: 420px) { grid-template-columns: 1fr; }
`;

const CheckboxLabel = styled.label`
  display: flex; align-items: flex-start; gap: 10px; color: #6C7A96; font-size: 16px;
  line-height: 1.25; word-break: break-word; text-align: left; cursor: pointer;
`;

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  flex: 0 0 auto; width: 18px; height: 18px; margin-top: 2px;
  appearance: none; -webkit-appearance: none; -moz-appearance: none;
  border: 2px solid #6C7A96; border-radius: 3px; background: #fff;
  display: inline-grid; place-content: center; transition: background-color .15s, border-color .15s;
  &::after { content: ""; width: 10px; height: 10px; transform: scale(0) rotate(45deg); border-right: 2px solid #fff; border-bottom: 2px solid #fff; }
  &:checked{ background: #f0ae00; border-color: #f0ae00; }
  &:checked::after{ transform: scale(1) rotate(45deg); }
  &:focus-visible{ outline: 2px solid rgba(240,174,0,.6); outline-offset: 2px; }
`;

const TEXT = {
  en: {
    bedrooms: 'Bedrooms', bathrooms: 'Bathrooms', minArea: 'Min area', maxArea: 'Max area',
    priceRange: 'Price Range', amenitiesTitle: 'Amenities & Features',
    amenities: ['Air Conditioner','Heating','Microwave','Bedding','Internet','Pets Allowed','Swimming Pool','Car Parking','Laundry Room','Spa Center'],
    one: '1', two: '2', threePlus: '3+',
  },
  ru: {
    bedrooms: 'Спальни', bathrooms: 'Ванные', minArea: 'Мин. площадь', maxArea: 'Макс. площадь',
    priceRange: 'Диапазон цены', amenitiesTitle: 'Удобства и особенности',
    amenities: ['Кондиционер','Отопление','Микроволновка','Постельные принадлежности','Интернет','Можно с животными','Бассейн','Парковка','Прачечная','Спа-центр'],
    one: '1', two: '2', threePlus: '3+',
  },
  hy: {
    bedrooms: 'Սենյակներ', bathrooms: 'Սանհանգույց', minArea: 'Նվազ. մակերես', maxArea: 'Առ. մակերես',
    priceRange: 'Գնի միջակայք', amenitiesTitle: 'Հարմարություններ և առանձնահատկություններ',
    amenities: ['Օդորակիչ','Ջեռուցում','Միկրոալիքային վառարան','Սպիտակեղեն','Ինտերնետ','Թույլատրվում են կենդանիներ','Լողավազան','Ավտոկայանատեղի','Լվացքատուն','Սպա կենտրոն'],
    one: '1', two: '2', threePlus: '3+',
  },
};

const AdvancedFilters = () => {
  const [price, setPrice] = useState([0, 10000]);

  const [lang, setLang] = useState(
    document.documentElement.lang || localStorage.getItem('lang') || 'hy'
  );

  useEffect(() => {
    const el = document.documentElement;
    const observer = new MutationObserver((muts) => {
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

  const t = TEXT[lang] || TEXT.hy;

  return (
    <FilterContainer>
      <Row>
        <Select>
          <option>{t.bedrooms}</option>
          <option>{t.one}</option>
          <option>{t.two}</option>
          <option>{t.threePlus}</option>
        </Select>

        <Select>
          <option>{t.bathrooms}</option>
          <option>{t.one}</option>
          <option>{t.two}</option>
          <option>{t.threePlus}</option>
        </Select>

        <Input placeholder={t.minArea} />
        <Input placeholder={t.maxArea} />
      </Row>

      <SectionTitle>{t.priceRange}</SectionTitle>
      <Slider
        range
        min={0}
        max={10000}
        value={price}
        onChange={setPrice}
        trackStyle={[{ backgroundColor: '#FFA500', height: 6 }]}
        handleStyle={[
          { borderColor: '#FFA500', height: 22, width: 22 },
          { borderColor: '#FFA500', height: 22, width: 22 }
        ]}
        railStyle={{ backgroundColor: '#eee', height: 6 }}
      />
      <PriceLabel>
        <span>{price[0]}</span>
        <span>{price[1]}</span>
      </PriceLabel>

      <SectionTitle>{t.amenitiesTitle}</SectionTitle>
      <AmenitiesContainer>
        {t.amenities.map((item) => (
          <CheckboxLabel key={item}>
            <Checkbox />
            {item}
          </CheckboxLabel>
        ))}
      </AmenitiesContainer>
    </FilterContainer>
  );
};

export default AdvancedFilters;






