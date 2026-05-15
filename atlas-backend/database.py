from pathlib import Path
from typing import Generator

import sqlite3

import psycopg2
from psycopg2.extras import RealDictCursor

from config import settings


SQLITE_DB_PATH = Path(__file__).with_name("atlas_dev.sqlite3")


class SQLiteCursorAdapter:
    def __init__(self, cursor: sqlite3.Cursor):
        self._cursor = cursor

    def execute(self, query: str, params=None):
        sqlite_query = query.replace("%s", "?")
        return self._cursor.execute(sqlite_query, params or ())

    def fetchone(self):
        row = self._cursor.fetchone()
        return dict(row) if row is not None else None

    def fetchall(self):
        return [dict(row) for row in self._cursor.fetchall()]

    def close(self):
        self._cursor.close()


def _initialize_sqlite(conn: sqlite3.Connection) -> None:
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS roles (
            role_id INTEGER PRIMARY KEY AUTOINCREMENT,
            role_name TEXT NOT NULL UNIQUE,
            description TEXT
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            role_id INTEGER NOT NULL,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (role_id) REFERENCES roles(role_id)
        )
        """
    )
    cur.execute(
        """
        INSERT OR IGNORE INTO roles (role_name, description)
        VALUES
            ('admin', 'Administrator role with elevated component management access'),
            ('user', 'Standard user role')
        """
    )
    conn.commit()


def _connect_sqlite() -> sqlite3.Connection:
    conn = sqlite3.connect(SQLITE_DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    _initialize_sqlite(conn)
    return conn


def get_db_connection() -> Generator:
    try:
        conn = psycopg2.connect(settings.database_url)
    except Exception:
        conn = _connect_sqlite()
    try:
        yield conn
    finally:
        conn.close()


def dict_cursor(conn):
    if isinstance(conn, sqlite3.Connection):
        return SQLiteCursorAdapter(conn.cursor())
    return conn.cursor(cursor_factory=RealDictCursor)


def is_sqlite_connection(conn) -> bool:
    return isinstance(conn, sqlite3.Connection)
