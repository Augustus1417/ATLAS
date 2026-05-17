import sqlite3
conn = sqlite3.connect("atlas-backend/atlas_dev.sqlite3")
cur = conn.cursor()
cur.execute("""
UPDATE users
SET role_id = (SELECT role_id FROM roles WHERE role_name='admin' LIMIT 1)
WHERE LOWER(email) = LOWER('devadmin@example.com')
""")
conn.commit()
conn.close()
print("promoted")
