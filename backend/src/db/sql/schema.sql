

CREATE TABLE IF NOT EXISTS regions (
  id SERIAL PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_ru TEXT NOT NULL,
  name_hy TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS towns (
  id SERIAL PRIMARY KEY,
  region_id INT NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  name_en TEXT NOT NULL,
  name_ru TEXT NOT NULL,
  name_hy TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS properties (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  type TEXT,
  status TEXT,
  price NUMERIC(14,2),
  currency TEXT DEFAULT 'USD',
  beds INT,
  baths INT,
  area_sq_m INT,
  floor INT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  region_id INT REFERENCES regions(id),
  town_id INT REFERENCES towns(id),
  cover_image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS properties_region_idx ON properties(region_id);
CREATE INDEX IF NOT EXISTS properties_town_idx   ON properties(town_id);
CREATE INDEX IF NOT EXISTS properties_price_idx  ON properties(price);

CREATE TABLE IF NOT EXISTS property_images (
  id BIGSERIAL PRIMARY KEY,
  property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  is_cover BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS panoramas (
  id BIGSERIAL PRIMARY KEY,
  property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS amenities (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name_en TEXT NOT NULL,
  name_ru TEXT NOT NULL,
  name_hy TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS property_amenities (
  property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  amenity_id INT NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
  PRIMARY KEY (property_id, amenity_id)
);

CREATE TABLE IF NOT EXISTS customers (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leads (
  id BIGSERIAL PRIMARY KEY,
  property_id BIGINT REFERENCES properties(id) ON DELETE SET NULL,
  customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
  source TEXT,
  message TEXT DEFAULT '',
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- users
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
