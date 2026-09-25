import os
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")


def execute_query(sql: str) -> list[dict]:
    conn = psycopg2.connect(DATABASE_URL)
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql)
            if cur.description is None:
                # No results to fetch (e.g. an INSERT/UPDATE with no RETURNING)
                conn.commit()
                return []
            rows = cur.fetchall()
            conn.commit()
            return [dict(row) for row in rows]
    finally:
        conn.close()