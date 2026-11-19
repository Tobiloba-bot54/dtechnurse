PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS store_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  image_key TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_store_categories_active_sort ON store_categories(is_active, sort_order);

CREATE TABLE IF NOT EXISTS category_attributes (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES store_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  input_type TEXT NOT NULL DEFAULT 'select' CHECK (input_type IN ('select','text')),
  is_required INTEGER NOT NULL DEFAULT 1 CHECK (is_required IN (0,1)),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (category_id, slug)
);

CREATE TABLE IF NOT EXISTS category_attribute_values (
  id TEXT PRIMARY KEY,
  attribute_id TEXT NOT NULL REFERENCES category_attributes(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  swatch_color TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_category_attribute_values_attr ON category_attribute_values(attribute_id, sort_order);

CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  listing_type TEXT NOT NULL CHECK (listing_type IN ('single','bundle')),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category_id TEXT REFERENCES store_categories(id) ON DELETE SET NULL,
  price_kobo INTEGER NOT NULL CHECK (price_kobo >= 0),
  compare_at_price_kobo INTEGER CHECK (compare_at_price_kobo >= 0),
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  is_featured INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0,1)),
  is_free_shipping INTEGER NOT NULL DEFAULT 0 CHECK (is_free_shipping IN (0,1)),
  track_stock INTEGER NOT NULL DEFAULT 1 CHECK (track_stock IN (0,1)),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  is_digital INTEGER NOT NULL DEFAULT 0 CHECK (is_digital IN (0,1)),
  digital_file_key TEXT,
  digital_download_limit INTEGER NOT NULL DEFAULT 5 CHECK (digital_download_limit >= 0),
  created_by TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_listings_status_published ON listings(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_category_status ON listings(category_id, status);
CREATE INDEX IF NOT EXISTS idx_listings_type_status ON listings(listing_type, status);

CREATE TABLE IF NOT EXISTS listing_images (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL,
  alt_text TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_listing_images_listing ON listing_images(listing_id, sort_order);

CREATE TABLE IF NOT EXISTS listing_attribute_options (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  attribute_id TEXT NOT NULL REFERENCES category_attributes(id) ON DELETE CASCADE,
  attribute_value_id TEXT NOT NULL REFERENCES category_attribute_values(id) ON DELETE CASCADE,
  UNIQUE (listing_id, attribute_id, attribute_value_id)
);
CREATE INDEX IF NOT EXISTS idx_listing_attribute_options_listing ON listing_attribute_options(listing_id);

CREATE TABLE IF NOT EXISTS bundle_items (
  id TEXT PRIMARY KEY,
  bundle_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_bundle_items_bundle ON bundle_items(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundle_items_product ON bundle_items(product_id);

CREATE TABLE IF NOT EXISTS bundle_item_attributes (
  id TEXT PRIMARY KEY,
  bundle_item_id TEXT NOT NULL REFERENCES bundle_items(id) ON DELETE CASCADE,
  attribute_id TEXT NOT NULL REFERENCES category_attributes(id) ON DELETE CASCADE,
  attribute_value_id TEXT NOT NULL REFERENCES category_attribute_values(id) ON DELETE CASCADE,
  UNIQUE (bundle_item_id, attribute_id, attribute_value_id)
);

CREATE TABLE IF NOT EXISTS flash_deals (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage','fixed')),
  discount_value INTEGER NOT NULL CHECK (discount_value > 0),
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_flash_deals_active_window ON flash_deals(is_active, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_flash_deals_listing ON flash_deals(listing_id);

CREATE TABLE IF NOT EXISTS listing_discounts (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage','fixed')),
  discount_value INTEGER NOT NULL CHECK (discount_value > 0),
  starts_at TEXT,
  ends_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_listing_discounts_active ON listing_discounts(is_active, listing_id);

CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE COLLATE NOCASE,
  description TEXT NOT NULL DEFAULT '',
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage','fixed')),
  discount_value INTEGER NOT NULL CHECK (discount_value > 0),
  min_order_amount_kobo INTEGER NOT NULL DEFAULT 0 CHECK (min_order_amount_kobo >= 0),
  max_uses INTEGER CHECK (max_uses >= 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  per_user_limit INTEGER NOT NULL DEFAULT 1 CHECK (per_user_limit >= 0),
  starts_at TEXT,
  ends_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active, ends_at);

CREATE TABLE IF NOT EXISTS shipping_zones (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  fee_kobo INTEGER NOT NULL DEFAULT 0 CHECK (fee_kobo >= 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_shipping_zones_active_sort ON shipping_zones(is_active, sort_order);

CREATE TABLE IF NOT EXISTS shipping_locations (
  id TEXT PRIMARY KEY,
  zone_id TEXT NOT NULL REFERENCES shipping_zones(id) ON DELETE CASCADE,
  name TEXT NOT NULL UNIQUE,
  fee_kobo INTEGER CHECK (fee_kobo IS NULL OR fee_kobo >= 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_shipping_locations_zone ON shipping_locations(zone_id, is_active);

CREATE TABLE IF NOT EXISTS customer_addresses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT '',
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  street TEXT NOT NULL,
  city TEXT NOT NULL,
  local_government TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT 'Nigeria',
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_user ON customer_addresses(user_id);

CREATE TABLE IF NOT EXISTS carts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','converted','abandoned')),
  coupon_id TEXT REFERENCES coupons(id) ON DELETE SET NULL,
  reminder_sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_carts_user_status ON carts(user_id, status);

CREATE TABLE IF NOT EXISTS cart_items (
  id TEXT PRIMARY KEY,
  cart_id TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  selected_attributes TEXT NOT NULL DEFAULT '{}',
  unit_price_kobo INTEGER NOT NULL CHECK (unit_price_kobo >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);

CREATE TABLE IF NOT EXISTS wishlists (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, listing_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment','paid','shipped','finished','disputed','refunded','exchanged','cancelled')),
  subtotal_kobo INTEGER NOT NULL CHECK (subtotal_kobo >= 0),
  discount_kobo INTEGER NOT NULL DEFAULT 0 CHECK (discount_kobo >= 0),
  coupon_id TEXT REFERENCES coupons(id) ON DELETE SET NULL,
  coupon_code TEXT,
  shipping_fee_kobo INTEGER NOT NULL DEFAULT 0 CHECK (shipping_fee_kobo >= 0),
  shipping_zone_id TEXT REFERENCES shipping_zones(id) ON DELETE SET NULL,
  shipping_location_id TEXT REFERENCES shipping_locations(id) ON DELETE SET NULL,
  total_kobo INTEGER NOT NULL CHECK (total_kobo >= 0),
  currency TEXT NOT NULL DEFAULT 'NGN',
  payment_provider TEXT CHECK (payment_provider IN ('paystack','flutterwave')),
  payment_reference TEXT,
  shipping_address TEXT NOT NULL,
  dispute_window_hours INTEGER NOT NULL DEFAULT 24 CHECK (dispute_window_hours > 0),
  paid_at TEXT,
  shipped_at TEXT,
  finished_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_reference ON orders(payment_reference);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  listing_id TEXT REFERENCES listings(id) ON DELETE SET NULL,
  listing_type TEXT NOT NULL CHECK (listing_type IN ('single','bundle')),
  title TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_kobo INTEGER NOT NULL CHECK (unit_price_kobo >= 0),
  total_price_kobo INTEGER NOT NULL CHECK (total_price_kobo >= 0),
  selected_attributes TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_listing ON order_items(listing_id);

CREATE TABLE IF NOT EXISTS order_status_history (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  changed_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(order_id, created_at DESC);

CREATE TABLE IF NOT EXISTS disputes (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  dispute_type TEXT NOT NULL CHECK (dispute_type IN ('refund','exchange')),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_review','resolved','rejected')),
  resolution_note TEXT NOT NULL DEFAULT '',
  resolved_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_disputes_order ON disputes(order_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status, created_at DESC);

CREATE TABLE IF NOT EXISTS refunds (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  dispute_id TEXT REFERENCES disputes(id) ON DELETE SET NULL,
  amount_kobo INTEGER NOT NULL CHECK (amount_kobo > 0),
  provider TEXT NOT NULL CHECK (provider IN ('paystack','flutterwave','other')),
  reference TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  refunded_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_refunds_order ON refunds(order_id);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  moderated_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  moderated_at TEXT,
  UNIQUE (listing_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_listing_status ON reviews(listing_id, status);
CREATE INDEX IF NOT EXISTS idx_reviews_status_created ON reviews(status, created_at DESC);

CREATE TABLE IF NOT EXISTS related_listings (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  related_listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (listing_id, related_listing_id),
  CHECK (listing_id <> related_listing_id)
);
CREATE INDEX IF NOT EXISTS idx_related_listings_listing ON related_listings(listing_id, sort_order);

CREATE TABLE IF NOT EXISTS inventory_logs (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  quantity_change INTEGER NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_listing ON inventory_logs(listing_id, created_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app','email','whatsapp')),
  type TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  data TEXT NOT NULL DEFAULT '{}',
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS payment_gateway_configs (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL UNIQUE CHECK (provider IN ('paystack','flutterwave')),
  is_enabled INTEGER NOT NULL DEFAULT 0 CHECK (is_enabled IN (0,1)),
  public_key TEXT NOT NULL DEFAULT '',
  secret_key TEXT NOT NULL DEFAULT '',
  mode TEXT NOT NULL DEFAULT 'test' CHECK (mode IN ('test','live')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_service_configs (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL UNIQUE CHECK (provider IN ('resend')),
  is_enabled INTEGER NOT NULL DEFAULT 0 CHECK (is_enabled IN (0,1)),
  api_key TEXT NOT NULL DEFAULT '',
  from_email TEXT NOT NULL DEFAULT '',
  from_name TEXT NOT NULL DEFAULT '',
  mode TEXT NOT NULL DEFAULT 'test' CHECK (mode IN ('test','live')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gift_cards (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE COLLATE NOCASE,
  initial_amount_kobo INTEGER NOT NULL CHECK (initial_amount_kobo > 0),
  balance_kobo INTEGER NOT NULL CHECK (balance_kobo >= 0),
  currency TEXT NOT NULL DEFAULT 'NGN',
  purchased_by TEXT REFERENCES users_profile(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','redeemed','expired','disabled')),
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gift_card_transactions (
  id TEXT PRIMARY KEY,
  gift_card_id TEXT NOT NULL REFERENCES gift_cards(id) ON DELETE CASCADE,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  amount_kobo INTEGER NOT NULL CHECK (amount_kobo > 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_card ON gift_card_transactions(gift_card_id);

CREATE TABLE IF NOT EXISTS loyalty_accounts (
  user_id TEXT PRIMARY KEY REFERENCES users_profile(id) ON DELETE CASCADE,
  points_balance INTEGER NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
  lifetime_points INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_points >= 0),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earn','redeem','adjust','refund')),
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user ON loyalty_transactions(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  referrer_id TEXT NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  referee_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','signed_up','rewarded','expired')),
  reward_amount_kobo INTEGER NOT NULL DEFAULT 0 CHECK (reward_amount_kobo >= 0),
  rewarded_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id, created_at DESC);

INSERT OR IGNORE INTO store_categories (id, name, slug, sort_order, is_active) VALUES
('stcat-scrubs-uniforms', 'Scrubs & Uniforms', 'scrubs-uniforms', 1, 1),
('stcat-footwear', 'Footwear', 'footwear', 2, 1),
('stcat-medical-accessories', 'Medical Accessories', 'medical-accessories', 3, 1),
('stcat-medical-equipment', 'Medical Equipment', 'medical-equipment', 4, 1),
('stcat-books-study-materials', 'Books & Study Materials', 'books-study-materials', 5, 1),
('stcat-bags-backpacks', 'Bags & Backpacks', 'bags-backpacks', 6, 1),
('stcat-clinical-consumables', 'Clinical Consumables', 'clinical-consumables', 7, 1),
('stcat-gifts-lifestyle', 'Gifts & Lifestyle', 'gifts-lifestyle', 8, 1),
('stcat-digital-products', 'Digital Products', 'digital-products', 9, 1),
('stcat-protective-wear-safety', 'Protective Wear & Safety', 'protective-wear-safety', 10, 1),
('stcat-training-simulation', 'Training & Simulation', 'training-simulation', 11, 1),
('stcat-stationery-office-supplies', 'Stationery & Office Supplies', 'stationery-office-supplies', 12, 1),
('stcat-home-healthcare-patient-care', 'Home Healthcare & Patient Care', 'home-healthcare-patient-care', 13, 1),
('stcat-graduation-professional-gifts', 'Graduation & Professional Gifts', 'graduation-professional-gifts', 14, 1);

INSERT OR IGNORE INTO payment_gateway_configs (id, provider, is_enabled, mode) VALUES
('pgc-paystack', 'paystack', 1, 'test'),
('pgc-flutterwave', 'flutterwave', 1, 'test');

INSERT OR IGNORE INTO email_service_configs (id, provider, is_enabled, mode) VALUES
('esc-resend', 'resend', 1, 'test');

INSERT OR IGNORE INTO shipping_zones (id, name, sort_order) VALUES
('shipzone-south-west', 'South West', 1),
('shipzone-south-south', 'South South', 2),
('shipzone-south-east', 'South East', 3),
('shipzone-north-central', 'North Central', 4),
('shipzone-north-east', 'North East', 5),
('shipzone-north-west', 'North West', 6);

INSERT OR IGNORE INTO shipping_locations (id, zone_id, name, sort_order) VALUES
('shiploc-ekiti', 'shipzone-south-west', 'Ekiti', 1),
('shiploc-lagos', 'shipzone-south-west', 'Lagos', 2),
('shiploc-ogun', 'shipzone-south-west', 'Ogun', 3),
('shiploc-ondo', 'shipzone-south-west', 'Ondo', 4),
('shiploc-osun', 'shipzone-south-west', 'Osun', 5),
('shiploc-oyo', 'shipzone-south-west', 'Oyo', 6),
('shiploc-akwa-ibom', 'shipzone-south-south', 'Akwa Ibom', 7),
('shiploc-bayelsa', 'shipzone-south-south', 'Bayelsa', 8),
('shiploc-cross-river', 'shipzone-south-south', 'Cross River', 9),
('shiploc-delta', 'shipzone-south-south', 'Delta', 10),
('shiploc-edo', 'shipzone-south-south', 'Edo', 11),
('shiploc-rivers', 'shipzone-south-south', 'Rivers', 12),
('shiploc-abia', 'shipzone-south-east', 'Abia', 13),
('shiploc-anambra', 'shipzone-south-east', 'Anambra', 14),
('shiploc-ebonyi', 'shipzone-south-east', 'Ebonyi', 15),
('shiploc-enugu', 'shipzone-south-east', 'Enugu', 16),
('shiploc-imo', 'shipzone-south-east', 'Imo', 17),
('shiploc-benue', 'shipzone-north-central', 'Benue', 18),
('shiploc-kogi', 'shipzone-north-central', 'Kogi', 19),
('shiploc-kwara', 'shipzone-north-central', 'Kwara', 20),
('shiploc-nasarawa', 'shipzone-north-central', 'Nasarawa', 21),
('shiploc-niger', 'shipzone-north-central', 'Niger', 22),
('shiploc-plateau', 'shipzone-north-central', 'Plateau', 23),
('shiploc-fct-abuja', 'shipzone-north-central', 'FCT Abuja', 24),
('shiploc-adamawa', 'shipzone-north-east', 'Adamawa', 25),
('shiploc-bauchi', 'shipzone-north-east', 'Bauchi', 26),
('shiploc-borno', 'shipzone-north-east', 'Borno', 27),
('shiploc-gombe', 'shipzone-north-east', 'Gombe', 28),
('shiploc-taraba', 'shipzone-north-east', 'Taraba', 29),
('shiploc-yobe', 'shipzone-north-east', 'Yobe', 30),
('shiploc-jigawa', 'shipzone-north-west', 'Jigawa', 31),
('shiploc-kaduna', 'shipzone-north-west', 'Kaduna', 32),
('shiploc-kano', 'shipzone-north-west', 'Kano', 33),
('shiploc-katsina', 'shipzone-north-west', 'Katsina', 34),
('shiploc-kebbi', 'shipzone-north-west', 'Kebbi', 35),
('shiploc-sokoto', 'shipzone-north-west', 'Sokoto', 36),
('shiploc-zamfara', 'shipzone-north-west', 'Zamfara', 37);

INSERT OR IGNORE INTO site_settings (setting_key, setting_value) VALUES
('store_name', 'DTECHNURSE STORE'),
('store_default_currency', 'NGN'),
('store_homepage_section_enabled', 'true'),
('store_initial_load_count', '20'),
('store_whatsapp_chat_enabled', 'true'),
('store_whatsapp_number', ''),
('store_dispute_window_hours', '24'),
('store_low_stock_default_threshold', '5'),
('store_moderator_can_delete', 'false'),
('store_reviews_auto_approve', 'false'),
('store_loyalty_points_per_order', '0'),
('store_cache_enabled', 'true'),
('store_region_shipping_enabled', 'true'),
('store_free_shipping_requires_all_items', 'true'),
('store_referral_reward_amount_kobo', '0'),
('store_referral_reward_type', 'cash'),
('store_order_auto_finish_days', '7'),
('store_order_number_prefix', 'DTN'),
('store_stock_reservation_enabled', 'true'),
('store_stock_hold_minutes', '15'),
('store_refund_method', 'manual'),
('store_whatsapp_order_notifications_enabled', 'false'),
('store_whatsapp_api_token', ''),
('store_whatsapp_phone_number_id', '');
