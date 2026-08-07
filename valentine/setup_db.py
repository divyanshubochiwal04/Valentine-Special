import mysql.connector
import logging
from config import Config, logger

def setup_database():
    logger.info("Starting database setup...")
    
    # 1. Connect to MySQL server (without specifying DB name) to create database
    try:
        conn = mysql.connector.connect(
            host=Config.DB_HOST,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            port=Config.DB_PORT
        )
        cursor = conn.cursor()
        
        db_name = Config.DB_NAME
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name}")
        logger.info(f"Database '{db_name}' verified / created.")
        
        # Select the database
        conn.database = db_name
        
        # 2. Create Users Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            entry_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)
        logger.info("Verified 'users' table structure.")
        
        # 3. Create Quotes Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS quotes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            content TEXT NOT NULL,
            language ENUM('english', 'hinglish') DEFAULT 'english'
        )
        """)
        logger.info("Verified 'quotes' table structure.")

        # 4. Create Memories Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS memories (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_name VARCHAR(100) NOT NULL,
            message TEXT NOT NULL,
            emoji VARCHAR(10) DEFAULT '✨',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)
        logger.info("Verified 'memories' table structure.")
        
        # 5. Seed Quotes (only if quotes table is empty)
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
            
            cursor.executemany("INSERT INTO quotes (content, language) VALUES (%s, %s)", quotes)
            conn.commit()
            logger.info(f"Seeded {len(quotes)} default quotes successfully.")
        else:
            logger.info("Quotes table already seeded. Skipping quote seeding.")
            
        cursor.close()
        conn.close()
        logger.info("Database setup completed successfully.")
        
    except mysql.connector.Error as err:
        logger.critical(f"Database setup failed due to error: {err}")
        raise

if __name__ == '__main__':
    setup_database()
