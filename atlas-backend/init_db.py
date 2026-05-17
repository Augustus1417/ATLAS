import sqlite3, pathlib
db = pathlib.Path("atlas-backend/atlas_dev.sqlite3")
conn = sqlite3.connect(db)
cur = conn.cursor()
cur.execute("""
CREATE TABLE IF NOT EXISTS components (
  component_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  brand TEXT,
  category TEXT,
  form_factor TEXT,
  release_year INTEGER,
  is_active INTEGER DEFAULT 1,
  added_by INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
)
""")
cur.execute("""
CREATE TABLE IF NOT EXISTS pricing_history (
  price_id INTEGER PRIMARY KEY AUTOINCREMENT,
  component_id INTEGER NOT NULL,
  price REAL NOT NULL,
  currency TEXT,
  source TEXT,
  recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (component_id) REFERENCES components(component_id)
)
""")
conn.commit()
print('OK: components + pricing_history ensured')
conn.close()
