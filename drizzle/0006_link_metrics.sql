CREATE TABLE IF NOT EXISTS link_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop TEXT NOT NULL,
  metric_date TEXT NOT NULL,
  platform_sku TEXT NOT NULL,
  link_url TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  rank_position INTEGER NOT NULL DEFAULT 0,
  rating REAL NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  low_star_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop, metric_date, platform_sku)
);
CREATE INDEX IF NOT EXISTS idx_link_metrics_shop_date ON link_metrics(shop, metric_date DESC);
