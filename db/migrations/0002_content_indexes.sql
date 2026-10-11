-- File: DTECHNURSE-SITE-main/db/migrations/0002_content_indexes.sql
CREATE INDEX IF NOT EXISTS idx_articles_updated ON articles(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_created ON media_assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pages_slug ON editable_pages(slug);
CREATE INDEX IF NOT EXISTS idx_contact_email_created ON contact_submissions(email, created_at DESC);
