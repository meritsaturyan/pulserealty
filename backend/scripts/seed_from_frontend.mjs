// backend/scripts/seed_from_frontend.mjs
import 'dotenv/config';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { sequelize } from '../src/db/sequelize.js';
import {
  initDb,
  Property,
  PropertyImage,
  Panorama,
  Amenity,
  PropertyAmenity,
  Region,
  Town,
} from '../src/db/models/index.js';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const slug = (s = '') =>
  String(s)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

function normStatus(s = '') {
  const v = String(s).toLowerCase();
  if (/rent|в арен|վարձ/.test(v)) return 'for_rent';
  return 'for_sale';
}
function normType(s = '') {
  const v = String(s).toLowerCase();
  if (/house|дом|տուն/.test(v)) return 'House';
  if (/villa|կոմերց|commercial|коммер/.test(v)) return 'Villa';
  if (/land|зем|հող/.test(v)) return 'Land';
  return 'Apartment';
}
const pick = (arr) => (Array.isArray(arr) ? arr.filter(Boolean) : []);

async function upsertRegionTown(regionName = '', townName = '') {
  let region = null;
  if (regionName) {
    [region] = await Region.findOrCreate({
      where: { name_hy: regionName },
      defaults: { name_hy: regionName, name_ru: regionName, name_en: regionName },
    });
  }

  let town = null;
  if (townName) {
    [town] = await Town.findOrCreate({
      where: { name_hy: townName, region_id: region?.id || null },
      defaults: {
        name_hy: townName,
        name_ru: townName,
        name_en: townName,
        region_id: region?.id || null,
      },
    });
  }
  return { region, town };
}

async function upsertAmenity(nameRaw = '') {
  const code = slug(nameRaw) || slug('amenity');
  const [a] = await Amenity.findOrCreate({
    where: { code },
    defaults: { code, name_hy: nameRaw, name_ru: nameRaw, name_en: nameRaw },
  });
  return a;
}

async function main() {
  await initDb();


  const frontendPropsPath = path.resolve(process.cwd(), '../src/data/properties.js');
  const { default: staticProps } = await import(pathToFileURL(frontendPropsPath).href);

  const items = Array.isArray(staticProps) ? staticProps : [];
  if (!items.length) {
    console.log('Нет статических объектов для импорта.');
    return;
  }

  console.log(`[seed] Найдено объектов: ${items.length}`);
  let created = 0, skipped = 0;

  for (const raw of items) {
    try {
      const title = String(raw.title || raw.name || '').trim() || 'Untitled';
      const status = normStatus(raw.status || raw.dealType || '');
      const type   = normType(raw.type || '');

      const price  = Number(raw.price || raw.priceUSD || 0) || 0;
      const beds   = Number(raw.beds || raw.rooms || 0) || null;
      const baths  = Number(raw.baths || raw.bathrooms || 0) || null;
      const area   = Number(raw.area || raw.area_sq_m || raw.sqft || 0) || null;
      const floor  = raw.floor ?? raw.level ?? raw.floorNumber ?? null;

      const regionName = raw.region?.name_hy || raw.region || '';
      const townName   = raw.town?.name_hy   || raw.town   || '';

      const images = pick(raw.images);
      const panos  = pick(raw.panos || raw.panoramas);

      // простой антидубликат — по title+price
      const exists = await Property.findOne({ where: { title, price } });
      if (exists) { skipped++; continue; }

      const { region, town } = await upsertRegionTown(regionName, townName);

      const prop = await Property.create({
        title,
        description: String(raw.description || ''),
        type,
        status,
        price,
        currency: (raw.currency || 'USD').toUpperCase(),
        beds,
        baths,
        area_sq_m: area,
        floor,
        lat: raw.lat ?? null,
        lng: raw.lng ?? null,
        cover_image: images[0] || null,
        region_id: region?.id || null,
        town_id: town?.id || null,
      });

      for (let i = 0; i < images.length; i++) {
        await PropertyImage.create({
          property_id: prop.id,
          url: images[i],
          sort_order: i,
          is_cover: i === 0,
        });
      }

      for (let i = 0; i < panos.length; i++) {
        await Panorama.create({
          property_id: prop.id,
          url: panos[i],
          sort_order: i,
        });
      }

      const amenitiesArr = Array.isArray(raw.amenities) ? raw.amenities.filter(Boolean) : [];
      for (const name of amenitiesArr) {
        const a = await upsertAmenity(String(name));
        await PropertyAmenity.findOrCreate({
          where: { property_id: prop.id, amenity_id: a.id },
          defaults: { property_id: prop.id, amenity_id: a.id },
        });
      }

      created++;
      await sleep(10);
    } catch (e) {
      console.warn('[seed] ошибка:', e?.message || e);
    }
  }

  console.log(`[seed] Готово. Новых: ${created}, пропущено: ${skipped}`);
}

main()
  .then(() => sequelize.close().catch(()=>{}))
  .catch((e) => {
    console.error(e);
    sequelize.close().catch(()=>{});
    process.exit(1);
  });
