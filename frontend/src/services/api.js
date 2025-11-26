import { LEVEL_PRESETS } from '../constants';

export const fetchGeminiReply = async (userText, settings, knownVocab) => {
  const levelContext = LEVEL_PRESETS[settings.targetLevel].promptContext;
  
  // Send only the last 100 words to save tokens context
  const vocabContext = knownVocab.slice(-100).map(v => v.term).join(', ');

  // If using the custom Python backend
  if (settings.useCustomBackend) {
    try {
      const response = await fetch(settings.backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          levelContext,
          vocabContext
        })
      });
      
      if (!response.ok) throw new Error(`Backend Error: ${response.status}`);
      return await response.json();
    } catch (e) {
      throw new Error(`Failed to connect to Server: ${e.message}`);
    }
  }
  
  // Fallback: If you ever want to add direct API calls back (not recommended for production keys)
  throw new Error("Direct API mode is currently disabled. Please use the backend.");
};
