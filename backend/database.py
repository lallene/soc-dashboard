import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "logs.db")


def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS analysis (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            source TEXT,
            errors INTEGER,
            logins INTEGER,
            cpu REAL,
            anomaly INTEGER
        )
    """)

    conn.commit()
    conn.close()


def save_analysis(errors, logins, cpu, anomaly, source="default"):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT errors, logins, cpu, anomaly, source
        FROM analysis
        ORDER BY id DESC
        LIMIT 1
    """)
    last = cursor.fetchone()

    current = (errors, logins, cpu, anomaly, source)

    if last != current:
        cursor.execute("""
            INSERT INTO analysis (source, errors, logins, cpu, anomaly)
            VALUES (?, ?, ?, ?, ?)
        """, (source, errors, logins, cpu, anomaly))

    conn.commit()
    conn.close()