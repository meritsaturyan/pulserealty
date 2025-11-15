INSERT INTO regions (name_en,name_ru,name_hy) VALUES
('Yerevan','Ереван','Երևան')
ON CONFLICT DO NOTHING;

INSERT INTO towns (region_id,name_en,name_ru,name_hy)
SELECT id, 'Kentron','Кентрон','Կենտրոն' FROM regions WHERE name_en='Yerevan';

INSERT INTO amenities (code,name_en,name_ru,name_hy) VALUES
('parking','Parking','Парковка','Կայանում'),
('balcony','Balcony','Балкон','Պատշգամբ'),
('elevator','Elevator','Лիфт','Վերելակ')
ON CONFLICT DO NOTHING;
