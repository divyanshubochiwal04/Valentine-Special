import os
import logging
from dotenv import load_dotenv

load_dotenv()

# Setup logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("valentine_universe")

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dark_universe_secret_key_default_888')
    
    # DB parameters support both custom variables and Railway platform variables
    DB_HOST = os.getenv('MYSQLHOST') or os.getenv('DB_HOST', 'localhost')
    DB_USER = os.getenv('MYSQLUSER') or os.getenv('DB_USER', 'root')
    DB_PASSWORD = os.getenv('MYSQLPASSWORD') or os.getenv('DB_PASSWORD', '')
    DB_NAME = os.getenv('MYSQLDATABASE') or os.getenv('DB_NAME', 'valentine_universe')
    
    try:
        DB_PORT = int(os.getenv('MYSQLPORT') or os.getenv('DB_PORT', 3306))
    except (ValueError, TypeError):
        DB_PORT = 3306

    @classmethod
    def validate(cls):
        """Validate that essential parameters are configured."""
        if not cls.DB_HOST or not cls.DB_NAME:
            logger.warning("Database configuration parameters might be incomplete. Please check your environment variables.")
