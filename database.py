import mysql.connector
from mysql.connector import pooling
import logging
from config import Config, logger

# Initialize connection pool if configurations allow
db_pool = None

def init_db_pool():
    global db_pool
    if db_pool is not None:
        return db_pool

    Config.validate()
    
    pool_size = 5 # Standard pool size for small flask app
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
        logger.error(f"Failed to initialize database connection pool: {err}")
        return None

def get_db_connection():
    """Retrieve a database connection from the pool."""
    global db_pool
    if db_pool is None:
        init_db_pool()
        
    if db_pool is None:
        # Fallback to direct connection if pool initialization failed
        try:
            conn = mysql.connector.connect(
                host=Config.DB_HOST,
                user=Config.DB_USER,
                password=Config.DB_PASSWORD,
                database=Config.DB_NAME,
                port=Config.DB_PORT
            )
            logger.info("Database connected directly (pool fallback).")
            return conn
        except mysql.connector.Error as err:
            logger.error(f"Fallback connection failed: {err}")
            return None

    try:
        # Get connection from pool
        conn = db_pool.get_connection()
        return conn
    except mysql.connector.Error as err:
        logger.error(f"Error fetching connection from pool: {err}")
        # Try once more with a fresh setup in case network flapped
        db_pool = None
        init_db_pool()
        try:
            if db_pool:
                return db_pool.get_connection()
        except mysql.connector.Error:
            pass
        return None
