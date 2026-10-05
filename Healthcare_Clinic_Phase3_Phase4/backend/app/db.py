"""Request-scoped MySQL connections and explicit transaction boundaries."""
from contextlib import contextmanager
from datetime import time, timedelta

from flask import current_app, g
import mysql.connector


def get_db():
    if "db" not in g:
        g.db = mysql.connector.connect(
            host=current_app.config["MYSQL_HOST"], port=current_app.config["MYSQL_PORT"],
            user=current_app.config["MYSQL_USER"], password=current_app.config["MYSQL_PASSWORD"],
            database=current_app.config["MYSQL_DATABASE"], charset="utf8mb4",
            autocommit=True, connection_timeout=5,
        )
        with g.db.cursor() as cursor:
            cursor.execute("SET time_zone = '+07:00'")
    return g.db


def close_db(_error=None):
    connection = g.pop("db", None)
    if connection is not None:
        connection.close()


@contextmanager
def transaction():
    connection = get_db()
    nested = connection.in_transaction
    if not nested:
        connection.start_transaction()
    try:
        yield connection
        if not nested:
            connection.commit()
    except Exception:
        if not nested:
            connection.rollback()
        raise


def normalize_row(row):
    if row is None:
        return None
    # MySQL Connector represents SQL TIME as timedelta; baseline shifts are <24h.
    return {key: time(int(value.total_seconds()) // 3600,
                      int(value.total_seconds()) % 3600 // 60,
                      int(value.total_seconds()) % 60)
            if isinstance(value, timedelta) else value for key, value in row.items()}


def query(sql, params=(), *, one=False):
    with get_db().cursor(dictionary=True) as cursor:
        cursor.execute(sql, params)
        return normalize_row(cursor.fetchone()) if one else [normalize_row(r) for r in cursor.fetchall()]


def execute(sql, params=()):
    with get_db().cursor() as cursor:
        cursor.execute(sql, params)
        return cursor.rowcount
