ALTER TABLE orders ADD COLUMN source_order_no TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN platform_sku TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN customer_info TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN item_price REAL NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN is_replacement INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_orders_shop_date ON orders(shop, order_date);
PRAGMA optimize;
