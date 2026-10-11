PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS resource_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  body_html TEXT NOT NULL DEFAULT '',
  excerpt TEXT NOT NULL DEFAULT '',
  featured_media_id TEXT REFERENCES media_assets(id) ON DELETE SET NULL,
  category_id TEXT REFERENCES resource_categories(id) ON DELETE SET NULL,
  file_type TEXT NOT NULL DEFAULT 'PDF',
  pricing TEXT NOT NULL DEFAULT 'free' CHECK (pricing IN ('free','paid')),
  price_kobo INTEGER NOT NULL DEFAULT 0 CHECK (price_kobo >= 0),
  drive_link TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  featured_on_homepage INTEGER NOT NULL DEFAULT 0 CHECK (featured_on_homepage IN (0,1)),
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_resources_status_updated ON resources(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category_id, status);
CREATE INDEX IF NOT EXISTS idx_resources_homepage ON resources(featured_on_homepage, status);
CREATE TABLE IF NOT EXISTS resource_purchases (
  id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  paystack_reference TEXT NOT NULL UNIQUE,
  amount_kobo INTEGER NOT NULL CHECK (amount_kobo >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','failed')),
  confirmed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_resource_purchases_user ON resource_purchases(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resource_purchases_resource ON resource_purchases(resource_id, status);
CREATE TABLE IF NOT EXISTS resource_downloads (
  id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  downloaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_resource_downloads_user ON resource_downloads(user_id, downloaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_resource_downloads_resource ON resource_downloads(resource_id, downloaded_at DESC);
INSERT OR IGNORE INTO resource_categories (id, name, slug, description) VALUES
('rescat-nursing', 'Nursing', 'nursing', 'Nursing study and practice resources'),
('rescat-research', 'Research', 'research', 'Research guides, templates, and learning resources'),
('rescat-digital-health', 'Digital Health', 'digital-health', 'Digital health and informatics resources'),
('rescat-patient-care', 'Patient Care', 'patient-care', 'Patient care and clinical reference resources'),
('rescat-career', 'Career Development', 'career-development', 'Career and professional development resources');
