from typing import Generator

import psycopg2
from psycopg2.extras import RealDictCursor

from config import settings


def get_db_connection() -> Generator:
    conn = psycopg2.connect(settings.database_url)
    try:
        yield conn
    finally:
        conn.close()


def dict_cursor(conn):
    return conn.cursor(cursor_factory=RealDictCursor)
