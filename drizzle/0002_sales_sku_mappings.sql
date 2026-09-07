CREATE TABLE IF NOT EXISTS sales_sku_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,
  sales_sku TEXT NOT NULL,
  system_sku TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(platform, sales_sku)
);
CREATE INDEX IF NOT EXISTS idx_mappings_system_sku ON sales_sku_mappings(system_sku);
PRAGMA optimize;
