from app.llm import generate_sql
from app.db import execute_query
from app.query_safety import is_write_query


def ask_database(question: str, confirm_write=None) -> list[dict]:
    sql = generate_sql(question)

    if is_write_query(sql):
        if confirm_write is None:
            raise ValueError("This is a write query and requires confirmation, but no confirm_write handler was provided.")
        approved = confirm_write(sql)
        if not approved:
            return []

    return execute_query(sql)