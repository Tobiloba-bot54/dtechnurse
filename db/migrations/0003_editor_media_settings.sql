-- File: DTECHNURSE-SITE-main/db/migrations/0003_editor_media_settings.sql
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS article_categories (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, slug TEXT NOT NULL UNIQUE, description TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS article_tags (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, slug TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS article_category_links (article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE, category_id TEXT NOT NULL REFERENCES article_categories(id) ON DELETE CASCADE, PRIMARY KEY (article_id, category_id));
CREATE TABLE IF NOT EXISTS article_tag_links (article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE, tag_id TEXT NOT NULL REFERENCES article_tags(id) ON DELETE CASCADE, PRIMARY KEY (article_id, tag_id));
CREATE TABLE IF NOT EXISTS article_revisions (id TEXT PRIMARY KEY, article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE, title TEXT NOT NULL, excerpt TEXT NOT NULL DEFAULT '', body_html TEXT NOT NULL DEFAULT '', changed_by TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_article_revisions_article_date ON article_revisions(article_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_category_links_category ON article_category_links(category_id, article_id);
CREATE INDEX IF NOT EXISTS idx_tag_links_tag ON article_tag_links(tag_id, article_id);
