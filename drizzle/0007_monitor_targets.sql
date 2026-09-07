CREATE TABLE IF NOT EXISTS monitor_targets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop TEXT NOT NULL,
  platform_sku TEXT NOT NULL,
  sales_sku TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  link_url TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Furniture',
  keyword TEXT NOT NULL DEFAULT '',
  priority INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop, platform_sku)
);
CREATE INDEX IF NOT EXISTS idx_monitor_targets_shop_active ON monitor_targets(shop, active, priority DESC);
