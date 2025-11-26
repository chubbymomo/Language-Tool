import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Support both variable names
API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("AI_API_KEY")

if API_KEY:
    genai.configure(api_key=API_KEY)
else:
    print("⚠️  WARNING: No API Key found in .env file.")

def generate_tutor_response(user_message, level_context, vocab_context):
    if not API_KEY:
        raise Exception("Server API Key is missing. Check your .env file.")

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

    # Using the flash model for speed and cost
    model = genai.GenerativeModel('gemini-flash-latest')
    
    response = model.generate_content(
        system_prompt,
        generation_config={"response_mime_type": "application/json"}
    )
    
    return json.loads(response.text)
