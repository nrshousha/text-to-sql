DML_WRITE_KEYWORDS = {"INSERT", "UPDATE", "DELETE"}
DDL_BLOCKED_KEYWORDS = {"DROP", "ALTER", "TRUNCATE", "CREATE"}


def get_first_keyword(sql: str) -> str:
    return sql.strip().split()[0].upper()


def is_blocked_query(sql: str) -> bool:
    return get_first_keyword(sql) in DDL_BLOCKED_KEYWORDS


def is_write_query(sql: str) -> bool:
    return get_first_keyword(sql) in DML_WRITE_KEYWORDS