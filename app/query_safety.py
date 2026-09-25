WRITE_KEYWORDS = {"INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE", "CREATE"}


def is_write_query(sql: str) -> bool:
    first_word = sql.strip().split()[0].upper()
    return first_word in WRITE_KEYWORDS
