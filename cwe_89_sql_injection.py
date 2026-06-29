import sqlite3

def get_user():
    conn = sqlite3.connect(':memory:')
    cursor = conn.cursor()
    cursor.execute("CREATE TABLE users (username TEXT)")
    user_input = input("Enter username: ")
    # CWE-89: SQL Injection
    cursor.execute("SELECT * FROM users WHERE username = '%s'" % user_input)
    return cursor.fetchall()
