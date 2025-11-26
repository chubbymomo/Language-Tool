from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import bcrypt
import json
import os
import asyncio
import requests
import time
import uuid
from psycopg2.extras import RealDictCursor
from database import init_db, get_db_connection, release_db_connection, is_db_available
from ai import generate_tutor_response
import edge_tts

app = Flask(__name__)
CORS(app, supports_credentials=True)

# JWT Configuration
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET', 'dev-secret-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 60 * 60 * 24 * 7  # 7 days
jwt = JWTManager(app)

WHISPER_URL = os.getenv("WHISPER_URL", "http://whisper:9000")

# Initialize Database Tables on Startup
with app.app_context():
    init_db()

# ==================== AUTH ROUTES ====================

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    
    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400
    
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    
    conn = None
    try:
        conn = get_db_connection()
        conn.autocommit = True
        
        # Check if user exists
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT id FROM users WHERE email = %s", (email,))
            if cur.fetchone():
                return jsonify({"error": "Email already registered"}), 409
        
        # Create user
        user_id = str(uuid.uuid4())
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        created_at = int(time.time() * 1000)
        
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO users (id, email, password_hash, created_at) VALUES (%s, %s, %s, %s)",
                (user_id, email, password_hash, created_at)
            )
            # Create default settings
            cur.execute(
                "INSERT INTO user_settings (user_id, settings) VALUES (%s, %s)",
                (user_id, json.dumps({}))
            )
        
        # Generate token
        access_token = create_access_token(identity=user_id)
        
        return jsonify({
            "token": access_token,
            "user": {"id": user_id, "email": email}
        }), 201
        
    except Exception as e:
        print(f"Registration error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            release_db_connection(conn)

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    
    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400
    
    conn = None
    try:
        conn = get_db_connection()
        
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT id, email, password_hash FROM users WHERE email = %s", (email,))
            user = cur.fetchone()
        
        if not user:
            return jsonify({"error": "Invalid credentials"}), 401
        
        if not bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
            return jsonify({"error": "Invalid credentials"}), 401
        
        access_token = create_access_token(identity=user['id'])
        
        return jsonify({
            "token": access_token,
            "user": {"id": user['id'], "email": user['email']}
        })
        
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            release_db_connection(conn)

@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    
    conn = None
    try:
        conn = get_db_connection()
        
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT id, email FROM users WHERE id = %s", (user_id,))
            user = cur.fetchone()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        return jsonify({"user": user})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            release_db_connection(conn)

# ==================== SETTINGS ROUTES ====================

@app.route('/api/settings', methods=['GET', 'PUT'])
@jwt_required()
def user_settings():
    user_id = get_jwt_identity()
    
    conn = None
    try:
        conn = get_db_connection()
        conn.autocommit = True
        
        if request.method == 'GET':
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT settings FROM user_settings WHERE user_id = %s", (user_id,))
                row = cur.fetchone()
            
            return jsonify(row['settings'] if row else {})
        
        else:  # PUT
            settings = request.json
            
            with conn.cursor() as cur:
                cur.execute(
                    """INSERT INTO user_settings (user_id, settings) VALUES (%s, %s)
                       ON CONFLICT (user_id) DO UPDATE SET settings = %s""",
                    (user_id, json.dumps(settings), json.dumps(settings))
                )
            
            return jsonify({"status": "saved"})
            
    except Exception as e:
        print(f"Settings error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            release_db_connection(conn)

# ==================== SESSIONS ROUTES ====================

@app.route('/api/sessions', methods=['GET', 'POST'])
@jwt_required()
def chat_sessions():
    user_id = get_jwt_identity()
    
    conn = None
    try:
        conn = get_db_connection()
        conn.autocommit = True
        
        if request.method == 'POST':
            data = request.json
            session_id = data.get('id', str(uuid.uuid4()))
            title = data.get('title', 'New Conversation')
            messages = data.get('messages', [])
            now = int(time.time() * 1000)
            
            with conn.cursor() as cur:
                cur.execute(
                    """INSERT INTO sessions (id, user_id, title, messages, created_at, updated_at)
                       VALUES (%s, %s, %s, %s, %s, %s)
                       ON CONFLICT (id) DO UPDATE SET
                           title = EXCLUDED.title,
                           messages = EXCLUDED.messages,
                           updated_at = EXCLUDED.updated_at""",
                    (session_id, user_id, title, json.dumps(messages), now, now)
                )
            
            return jsonify({"status": "saved", "id": session_id})
        
        else:  # GET
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT id, title, messages, created_at, updated_at FROM sessions WHERE user_id = %s ORDER BY updated_at DESC",
                    (user_id,)
                )
                rows = cur.fetchall()
            
            sessions = []
            for r in rows:
                sessions.append({
                    "id": r['id'],
                    "title": r['title'],
                    "messages": r['messages'] if isinstance(r['messages'], list) else json.loads(r['messages']),
                    "createdAt": r['created_at'],
                    "updatedAt": r['updated_at']
                })
            
            return jsonify(sessions)
            
    except Exception as e:
        print(f"Sessions error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            release_db_connection(conn)

@app.route('/api/sessions/<session_id>', methods=['DELETE'])
@jwt_required()
def delete_session(session_id):
    user_id = get_jwt_identity()
    
    conn = None
    try:
        conn = get_db_connection()
        conn.autocommit = True
        
        with conn.cursor() as cur:
            cur.execute("DELETE FROM sessions WHERE id = %s AND user_id = %s", (session_id, user_id))
        
        return jsonify({"status": "deleted"})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            release_db_connection(conn)

# ==================== EXISTING ROUTES (UPDATED) ====================

@app.route('/api/health', methods=['GET'])
def health():
    status = {
        "status": "ok",
        "database": "connected" if is_db_available() else "unavailable"
    }
    return jsonify(status)

@app.route('/api/transcribe', methods=['POST'])
@jwt_required()
def transcribe():
    """Transcribe audio using Whisper container."""
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
    audio_file = request.files['audio']
    
    try:
        response = requests.post(
            f"{WHISPER_URL}/asr",
            files={"audio_file": (audio_file.filename, audio_file.stream, audio_file.mimetype)},
            params={"language": "ja", "output": "json"}
        )
        
        if response.ok:
            result = response.json()
            return jsonify({"text": result.get("text", "")})
        else:
            return jsonify({"error": "Transcription failed"}), 500
            
    except Exception as e:
        print(f"Transcription error: {e}")
        return jsonify({"error": str(e)}), 500

async def generate_speech(text, voice):
    """Generate speech using Edge TTS."""
    communicate = edge_tts.Communicate(text, voice)
    
    audio_bytes = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_bytes += chunk["data"]
    
    return audio_bytes

@app.route('/api/tts', methods=['POST'])
@jwt_required()
def text_to_speech():
    """Generate speech from text using Edge TTS."""
    data = request.json
    text = data.get('text', '')
    voice = data.get('voice', 'ja-JP-NanamiNeural')
    
    valid_voices = [
        'ja-JP-NanamiNeural', 'ja-JP-KeitaNeural', 'ja-JP-AoiNeural',
        'ja-JP-DaichiNeural', 'ja-JP-MayuNeural', 'ja-JP-NaokiNeural', 
        'ja-JP-ShioriNeural'
    ]
    if voice not in valid_voices:
        voice = 'ja-JP-NanamiNeural'
    
    if not text:
        return jsonify({"error": "No text provided"}), 400
    
    try:
        audio_data = asyncio.run(generate_speech(text, voice))
        
        return app.response_class(
            audio_data,
            mimetype='audio/mpeg',
            headers={'Content-Disposition': 'inline'}
        )
    except Exception as e:
        print(f"TTS error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/chat', methods=['POST'])
@jwt_required()
def chat():
    data = request.json
    try:
        response = generate_tutor_response(
            data.get('message', ''),
            data.get('levelContext', ''),
            data.get('vocabContext', '')
        )
        return jsonify(response)
    except Exception as e:
        print(f"AI Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/vocab', methods=['GET', 'POST'])
@jwt_required()
def vocab():
    user_id = get_jwt_identity()
    
    if not is_db_available():
        return jsonify({"error": "Database not available"}), 503
    
    conn = None
    try:
        conn = get_db_connection()
        conn.autocommit = True
        
        if request.method == 'POST':
            item = request.json
            
            sql = """
                INSERT INTO vocab (id, user_id, term, reading, meaning, explanation, examples, mastery, added_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    term = EXCLUDED.term,
                    reading = EXCLUDED.reading,
                    meaning = EXCLUDED.meaning,
                    explanation = EXCLUDED.explanation,
                    examples = EXCLUDED.examples,
                    mastery = EXCLUDED.mastery,
                    added_at = EXCLUDED.added_at;
            """
            
            with conn.cursor() as cur:
                cur.execute(sql, (
                    item['id'], 
                    user_id,
                    item['term'], 
                    item['reading'], 
                    item['meaning'], 
                    item.get('explanation', ''), 
                    json.dumps(item.get('examples', [])), 
                    item['mastery'], 
                    item['addedAt']
                ))
            
            return jsonify({"status": "saved"})
        
        else:  # GET
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM vocab WHERE user_id = %s ORDER BY added_at DESC", (user_id,))
                rows = cur.fetchall()
            
            vocab_list = []
            for r in rows:
                vocab_list.append({
                    "id": r['id'],
                    "term": r['term'],
                    "reading": r['reading'],
                    "meaning": r['meaning'], 
                    "explanation": r['explanation'],
                    "examples": json.loads(r['examples']) if r['examples'] else [],
                    "mastery": r['mastery'],
                    "addedAt": r['added_at']
                })
            return jsonify(vocab_list)

    except Exception as e:
        print(f"Database Error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            release_db_connection(conn)

@app.route('/api/vocab/<vocab_id>', methods=['DELETE'])
@jwt_required()
def delete_vocab(vocab_id):
    user_id = get_jwt_identity()
    
    conn = None
    try:
        conn = get_db_connection()
        conn.autocommit = True
        
        with conn.cursor() as cur:
            cur.execute("DELETE FROM vocab WHERE id = %s AND user_id = %s", (vocab_id, user_id))
        
        return jsonify({"status": "deleted"})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            release_db_connection(conn)

if __name__ == '__main__':
    print("🚀 Server running on http://localhost:5000")
    app.run(debug=True, port=5000, host='0.0.0.0')
