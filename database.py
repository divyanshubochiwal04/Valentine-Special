import mysql.connector
from mysql.connector import pooling
import sqlite3
import os
import re
import logging
from config import Config, logger

# Initialize connection pool if configurations allow
db_pool = None
sqlite_initialized = False
SQLITE_DB_PATH = "valentine.db"

class SQLiteCursorWrapper:
    def __init__(self, sqlite_cursor, is_dict=False):
        self.cursor = sqlite_cursor
        self.is_dict = is_dict

    def execute(self, query, params=None):
        # Translate query format from MySQL to SQLite
        query = query.replace('%s', '?')
        if 'RAND()' in query or 'rand()' in query:
            query = re.sub(r'RAND\(\)', 'random()', query, flags=re.IGNORECASE)
        
        if params is None:
            self.cursor.execute(query)
        else:
            if not isinstance(params, (tuple, list)):
                params = (params,)
            self.cursor.execute(query, params)

    def fetchall(self):
        rows = self.cursor.fetchall()
        if self.is_dict:
            desc = self.cursor.description
            if not desc:
                return []
            colnames = [d[0] for d in desc]
            return [dict(zip(colnames, row)) for row in rows]
        return rows

    def fetchone(self):
        row = self.cursor.fetchone()
        if row is None:
            return None
        if self.is_dict:
            desc = self.cursor.description
            if not desc:
                return {}
            colnames = [d[0] for d in desc]
            return dict(zip(colnames, row))
        return row

    def close(self):
        self.cursor.close()

class SQLiteConnectionWrapper:
    def __init__(self, sqlite_conn):
        self.conn = sqlite_conn

    def cursor(self, dictionary=False):
        cursor = self.conn.cursor()
        return SQLiteCursorWrapper(cursor, is_dict=dictionary)

    def commit(self):
        self.conn.commit()

    def close(self):
        self.conn.close()

def init_sqlite_db():
    global sqlite_initialized
    if sqlite_initialized:
        return
        
    logger.info(f"Initializing local SQLite database: {SQLITE_DB_PATH}")
    try:
        conn = sqlite3.connect(SQLITE_DB_PATH)
        cursor = conn.cursor()
        
        # 1. Create Users Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            entry_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)
        
        # 2. Create Quotes Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS quotes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            language TEXT CHECK(language IN ('english', 'hinglish')) DEFAULT 'english'
        )
        """)

        # 3. Create Memories Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS memories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_name TEXT NOT NULL,
            message TEXT NOT NULL,
            emoji TEXT DEFAULT '✨',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)
        
        # 4. Seed Quotes if empty
        cursor.execute("SELECT COUNT(*) FROM quotes")
        count = cursor.fetchone()[0]
        if count == 0:
            quotes = [
                ("In another universe, we are the stars that collided to form a galaxy.", "english"),
                ("Kuch rishte dosti se badhkar hote hain, aur pyaar se bhi gehre.", "hinglish"),
                ("You are the poetry the universe wrote when it was in love.", "english"),
                ("Tumhari hassi se hi meri duniya mein roshni hai.", "hinglish"),
                ("Gravity isn't responsible for people falling in love, but you are specifically responsible for my smile.", "english"),
                ("Bas tum ho, aur kuch nahi chahiye is soone brahmand mein.", "hinglish"),
                ("If I had a flower for every time I thought of you, I could walk through my garden forever.", "english"),
                ("Chaand bhi sharma jaye jab tum muskurati ho.", "hinglish")
            ]
            cursor.executemany("INSERT INTO quotes (content, language) VALUES (?, ?)", quotes)
            conn.commit()
            logger.info("Seeded default quotes to SQLite.")
            
        cursor.close()
        conn.close()
        sqlite_initialized = True
        logger.info("SQLite database initialization completed successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize SQLite database: {e}")

def init_db_pool():
    global db_pool
    if db_pool is not None:
        return db_pool

    Config.validate()
    
    pool_size = 5
    try:
        db_pool = pooling.MySQLConnectionPool(
            pool_name="valentine_pool",
            pool_size=pool_size,
            pool_reset_session=True,
            host=Config.DB_HOST,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            database=Config.DB_NAME,
            port=Config.DB_PORT
        )
        logger.info(f"Database connection pool initialized with size {pool_size}.")
        return db_pool
    except mysql.connector.Error as err:
        logger.warning(f"Failed to initialize database connection pool: {err}. Fallback will be used.")
        return None

def get_db_connection():
    """Retrieve a database connection from the pool (MySQL), falling back to local SQLite if MySQL is unavailable."""
    global db_pool
    
    # Try pool (MySQL)
    if db_pool is None:
        init_db_pool()
        
    if db_pool is not None:
        try:
            conn = db_pool.get_connection()
            logger.info("Database connected via MySQL Pool.")
            return conn
        except mysql.connector.Error as err:
            logger.warning(f"Error fetching connection from MySQL pool: {err}. Trying direct connection...")
            
    # Try direct (MySQL)
    try:
        conn = mysql.connector.connect(
            host=Config.DB_HOST,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            database=Config.DB_NAME,
            port=Config.DB_PORT
        )
        logger.info("Database connected directly to MySQL.")
        return conn
    except mysql.connector.Error as err:
        logger.warning(f"MySQL connection failed: {err}. Falling back to local SQLite database.")
        
    # SQLite Fallback
    try:
        init_sqlite_db()
        conn = sqlite3.connect(SQLITE_DB_PATH)
        logger.info("Database connected to local SQLite database (resilient fallback).")
        return SQLiteConnectionWrapper(conn)
    except Exception as sqlite_err:
        logger.critical(f"All database connection attempts (MySQL and SQLite) failed: {sqlite_err}")
        return None
