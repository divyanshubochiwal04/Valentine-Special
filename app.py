from flask import Flask, render_template, request, jsonify
from database import get_db_connection, logger
from config import Config
import os

def create_app():
    app = Flask(__name__)
    app.secret_key = Config.SECRET_KEY
    
    @app.route('/')
    def index():
        return render_template('index.html')

    @app.route('/api/enter', methods=['POST'])
    def enter_universe():
        try:
            data = request.get_json(silent=True)
            if not data:
                return jsonify({'error': 'Malformed request body'}), 400
                
            name = data.get('name', '').strip()
            
            if not name:
                return jsonify({'error': 'Name is required'}), 400
                
            if len(name) > 100:
                return jsonify({'error': 'Name exceeds limit of 100 characters'}), 400
                
            conn = get_db_connection()
            if conn:
                try:
                    cursor = conn.cursor()
                    cursor.execute('INSERT INTO users (name) VALUES (%s)', (name,))
                    conn.commit()
                    cursor.close()
                    logger.info(f"User '{name}' entered the universe successfully.")
                    return jsonify({'message': 'Universe Ignited', 'name': name})
                except Exception as db_err:
                    logger.error(f"Database insertion failed for user enter: {db_err}")
                    return jsonify({'error': 'Database transaction error occurred'}), 500
                finally:
                    conn.close()
            
            return jsonify({'error': 'Cosmic database link is down'}), 500
        except Exception as e:
            logger.error(f"Unexpected error in enter_universe: {e}")
            return jsonify({'error': 'An internal cosmic error occurred'}), 500

    @app.route('/api/debug/error', methods=['POST'])
    def debug_error():
        data = request.get_json(silent=True) or {}
        logger.error(f"[BROWSER ERROR] message: {data.get('message')}, source: {data.get('source')}, line: {data.get('lineno')}, col: {data.get('colno')}, error: {data.get('error')}")
        return jsonify({'status': 'logged'})

    @app.route('/api/quotes', methods=['GET'])
    def get_quotes():
        conn = get_db_connection()
        quotes = []
        if conn:
            try:
                cursor = conn.cursor(dictionary=True)
                cursor.execute('SELECT content, language FROM quotes ORDER BY RAND() LIMIT 10')
                quotes = cursor.fetchall()
                cursor.close()
            except Exception as db_err:
                logger.error(f"Failed to fetch quotes: {db_err}")
            finally:
                conn.close()
        
        return jsonify(quotes)

    @app.route('/api/memories', methods=['GET', 'POST'])
    def handle_memories():
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Cosmic database link is down'}), 500
            
        try:
            cursor = conn.cursor(dictionary=True)
            
            if request.method == 'POST':
                data = request.get_json(silent=True)
                if not data:
                    cursor.close()
                    conn.close()
                    return jsonify({'error': 'Malformed request body'}), 400
                    
                user_name = data.get('user_name', 'Anonymous').strip()
                message = data.get('message', '').strip()
                emoji = data.get('emoji', '✨').strip()
                
                # Check for default anonymous name fallback
                if not user_name:
                    user_name = 'Anonymous'
                    
                if not message:
                    cursor.close()
                    conn.close()
                    return jsonify({'error': 'Message is required'}), 400
                    
                if len(user_name) > 100 or len(message) > 1000 or len(emoji) > 10:
                    cursor.close()
                    conn.close()
                    return jsonify({'error': 'Input sizes exceed limits'}), 400
                    
                try:
                    cursor.execute(
                        'INSERT INTO memories (user_name, message, emoji) VALUES (%s, %s, %s)', 
                        (user_name, message, emoji)
                    )
                    conn.commit()
                    logger.info(f"New memory etched by '{user_name}' successfully.")
                    return jsonify({'message': 'Memory etched in the stars'})
                except Exception as db_err:
                    logger.error(f"Database error writing memory: {db_err}")
                    return jsonify({'error': 'Database transaction error occurred'}), 500
                
            else: # GET
                try:
                    cursor.execute('SELECT user_name, message, emoji, created_at FROM memories ORDER BY created_at DESC LIMIT 20')
                    memories = cursor.fetchall()
                    return jsonify(memories)
                except Exception as db_err:
                    logger.error(f"Database error reading memories: {db_err}")
                    return jsonify({'error': 'Failed to retrieve memories'}), 500
                    
        except Exception as e:
            logger.error(f"Unexpected error in handle_memories: {e}")
            return jsonify({'error': 'An internal cosmic error occurred'}), 500
        finally:
            if 'cursor' in locals():
                cursor.close()
            conn.close()

    # Error handlers for production standard API reporting
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify(error="Bad Request", message=str(e.description)), 400

    @app.errorhandler(404)
    def page_not_found(e):
        if request.path.startswith('/api/'):
            return jsonify(error="Not Found", message="Requested API endpoint does not exist"), 404
        return render_template('index.html'), 200 # Fallback to SPA index.html

    @app.errorhandler(500)
    def server_error(e):
        return jsonify(error="Internal Server Error", message="An unexpected error occurred in the cosmos"), 500

    return app

# Expose global app object for WSGI servers like Gunicorn
app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    logger.info(f"Starting server on port {port}...")
    app.run(host='0.0.0.0', port=port)
