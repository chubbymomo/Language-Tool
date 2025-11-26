import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai

# --- CONFIGURATION ---
API_KEY = os.environ.get("AI_API_KEY", "") 

# Postgres Configuration
# If you set a password, add password='your_password' to the conn_string
DB_DSN = "dbname='japaneselanguagetool' user='languagetool' host='localhost'"

# --- SETUP ---
app = Flask(__name__)
CORS(app)
genai.configure(api_key=API_KEY)

# --- DATABASE HELPER ---
def get_db_connection():
    conn = psycopg2.connect(DB_DSN)
    conn.autocommit = True
    return conn

def init_db():
    """Initializes the PostgreSQL tables."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Create Vocab Table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS vocab (
                        id TEXT PRIMARY KEY,
                        term TEXT NOT NULL,
                        reading TEXT,
                        meaning TEXT,
                        explanation TEXT,
                        examples TEXT, 
                        mastery INTEGER DEFAULT 1,
                        added_at BIGINT
                    );
                """)
                # Create Sessions Table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS sessions (
                        id TEXT PRIMARY KEY,
                        data TEXT
                    );
                """)
        print("Database initialized successfully.")
    except Exception as e:
        print(f"Database initialization failed: {e}")

# --- ROUTES ---

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    user_message = data.get('message', '')
    level_context = data.get('levelContext', '')
    vocab_context = data.get('vocabContext', '')
    
    system_prompt = f"""
    You are a Japanese language tutor.
    **User Profile:** Level: {level_context} | Known Vocab: {vocab_context}
    **Instructions:**
    1. Reply naturally to: "{user_message}"
    2. Prioritize using KNOWN grammar/vocab.
    3. Output JSON only.
    4. "reading" must be in HIRAGANA/KATAKANA.
    5. If token is PARTICLE/GRAMMAR, provide detailed 'explanation'.

    **Output Schema:**
    {{
      "segments": [
         {{ "text": "猫", "reading": "ねこ", "meaning": "cat", "explanation": "optional note", "function": "noun" }}
      ],
      "english": "English translation.",
      "grammar_point": "Brief summary."
    }}
    """

    try:
        model = genai.GenerativeModel('gemini-flash-latest')
        response = model.generate_content(
            system_prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        ai_json = json.loads(response.text)
        return jsonify(ai_json)

    except Exception as e:
        print(f"Gemini Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/vocab', methods=['GET', 'POST'])
def vocab():
    try:
        conn = get_db_connection()
        
        if request.method == 'POST':
            item = request.json
            
            # PostgreSQL Upsert (Insert or Update)
            sql = """
                INSERT INTO vocab (id, term, reading, meaning, explanation, examples, mastery, added_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
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
                    item['term'], 
                    item['reading'], 
                    item['meaning'], 
                    item.get('explanation', ''), 
                    json.dumps(item.get('examples', [])), 
                    item['mastery'], 
                    item['addedAt']
                ))
            
            conn.close()
            return jsonify({"status": "saved"})
        
        else:
            # GET Request
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM vocab")
                rows = cur.fetchall()
            
            conn.close()
            
            # Format for frontend
            vocab_list = []
            for r in rows:
                vocab_list.append({
                    "id": r['id'],
                    "term": r['term'],
                    "reading": r['reading'],
                    "meaning": r['meaning'], 
                    "explanation": r['explanation'],
                    # Deserialize the JSON string back to a list
                    "examples": json.loads(r['examples']) if r['examples'] else [],
                    "mastery": r['mastery'],
                    "addedAt": r['added_at']
                })
            return jsonify(vocab_list)

    except Exception as e:
        print(f"Database Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    init_db()
    print(f"Server running on http://localhost:5000")
    app.run(debug=True, port=5000)
