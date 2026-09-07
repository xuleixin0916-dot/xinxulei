CREATE TABLE IF NOT EXISTS product_checks (
  shop TEXT NOT NULL,
  sales_sku TEXT NOT NULL,
  checked INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(shop, sales_sku)
);
PRAGMA optimize;
