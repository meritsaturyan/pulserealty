import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function main() {
  const token = process.env.SYNC_TOKEN;
  if (!token) throw new Error('SYNC_TOKEN not set');

  const payload = {
    external_id: 'EXT123',
    title: 'Example title',
    address_full: 'Երևան, Աբովյան 15',
    region: 'Երևան',
    town: 'Կենտրոն',
    street: 'Աբովյան',
    property_type: 'Apartment',
    listing_status: 'for_sale',
    beds: 2,
    baths: 1,
    area_sqft: 860,
    area_text: '80 քմ',
    price: 95000,
    currency: 'USD',
    description: 'Գեղեցիկ նորակառույց բնակարան քաղաքի կենտրոնում։',
    lat: 40.1772,
    lng: 44.5035,
    image_urls: ["https://site.com/img1.jpg","https://site.com/img2.jpg"],
    cover_image_url: "https://site.com/cover.jpg",
    images_order: ["img2.jpg","img1.jpg"],
    updated_at: new Date().toISOString()
  };

  const { data } = await axios.post(
    'http://localhost:8080/api/properties/bitrix/sync',
    payload,
    { headers: { 'X-Sync-Token': token } }
  );
  console.log('SYNC RESULT:', data);
}

main().catch(e => { console.error(e); process.exit(1); });
