ALTER TABLE orders ADD COLUMN shop TEXT NOT NULL DEFAULT 'BBB-PB-2';
CREATE INDEX IF NOT EXISTS idx_orders_shop_date ON orders(shop, order_date);
CREATE TABLE IF NOT EXISTS sales_sku_mappings_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop TEXT NOT NULL,
  platform TEXT NOT NULL,
  sales_sku TEXT NOT NULL,
  system_sku TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop, platform, sales_sku)
);
INSERT OR IGNORE INTO sales_sku_mappings_v2(shop,platform,sales_sku,system_sku,display_name,active,updated_at)
SELECT 'BBB-PB-2',platform,sales_sku,system_sku,display_name,active,updated_at FROM sales_sku_mappings;
CREATE INDEX IF NOT EXISTS idx_mappings_v2_shop_system ON sales_sku_mappings_v2(shop, system_sku);
PRAGMA optimize;
