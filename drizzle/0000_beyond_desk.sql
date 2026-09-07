CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  image TEXT NOT NULL DEFAULT '',
  wholesale_price REAL NOT NULL,
  retail_price REAL NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT '待核查',
  checked INTEGER NOT NULL DEFAULT 0,
  backend_url TEXT NOT NULL DEFAULT '',
  frontend_url TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_date TEXT NOT NULL,
  work_time TEXT NOT NULL,
  title TEXT NOT NULL,
  tag TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#466b5c',
  completed INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS daily_logs (
  work_date TEXT PRIMARY KEY,
  completed_text TEXT NOT NULL DEFAULT '',
  followup_text TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_schedules_work_date ON schedules(work_date);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
PRAGMA optimize;
