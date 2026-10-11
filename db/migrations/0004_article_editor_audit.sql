-- File: DTECHNURSE-SITE-main/db/migrations/0004_article_editor_audit.sql
CREATE INDEX IF NOT EXISTS idx_articles_updated ON articles(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_created ON media_assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_resource_created ON admin_audit_log(resource_type, resource_id, created_at DESC);
