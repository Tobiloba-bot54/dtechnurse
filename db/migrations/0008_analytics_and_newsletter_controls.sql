PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS article_views (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  viewed_on TEXT NOT NULL DEFAULT (date('now')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_article_views_article_day ON article_views(article_id, viewed_on);
CREATE INDEX IF NOT EXISTS idx_article_views_day ON article_views(viewed_on DESC);

ALTER TABLE newsletter_subscribers ADD COLUMN unsubscribe_token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_unsubscribe_token ON newsletter_subscribers(unsubscribe_token);
