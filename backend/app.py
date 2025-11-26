from flask import Flask, request, jsonify
from flask_cors import CORS
import json
from psycopg2.extras import RealDictCursor
from database import init_db, get_db_connection, release_db_connection
from ai import generate_tutor_response

app = Flask(__name__)
CORS(app)

# Initialize Database Tables on Startup
with app.app_context():
    init_db()

@app.route('/api/chat', methods=['POST'])
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
def vocab():
    conn = get_db_connection()
    conn.autocommit = True
    try:
        if request.method == 'POST':
            item = request.json
            
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
            
            return jsonify({"status": "saved"})
        
        else:
            # GET Request
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM vocab")
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
        # Crucial: Return connection to the pool!
        release_db_connection(conn)

if __name__ == '__main__':
    print("🚀 Server running on http://localhost:5000")
    app.run(debug=True, port=5000)
