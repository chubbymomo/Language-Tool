// frontend/src/constants.js

// Bump version to v17.0 to invalidate old LocalStorage data
export const APP_VERSION = 'v17.0'; 
export const STORAGE_KEY = `japanese_tutor_data_${APP_VERSION}`;

export const LEVEL_PRESETS = {
  'N5': {
    label: 'JLPT N5 (Beginner)',
    promptContext: 'The user is a beginner (JLPT N5 level). They understand basic polite forms (desu/masu), basic particles (wa, ga, o, ni, de), and simple sentence structures. Stick to simple vocabulary.'
  },
  'N4': {
    label: 'JLPT N4 (Upper Beginner)',
    promptContext: 'The user is an upper beginner (JLPT N4 level). They understand te-form connections, potential verbs, and basic transitive/intransitive pairs.'
  },
  'N3': {
    label: 'JLPT N3 (Intermediate)',
    promptContext: 'The user is intermediate (JLPT N3 level). They can handle passive/causative forms and more abstract topics. You can use more natural, casual speech.'
  }
};

export const DEFAULT_SETTINGS = {
  targetLevel: 'N5',
  introductionRate: 'Normal',
  tutorMode: true,
  furiganaMode: 'hover',
  englishMode: 'visible',
  autoAddVocab: false,
  useCustomBackend: true,
  // This relative path is crucial for the Proxy to work
  backendUrl: import.meta.env.VITE_API_BASE_URL || '/api/chat'
};

export const safeString = (val) => {
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (val === null || val === undefined) return '';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  try { return JSON.stringify(val); } catch (e) { return ""; }
};

export const reconstructSentence = (segments) => {
  if (!Array.isArray(segments)) return "";
  return segments.map(s => safeString(s.text)).join('');
};

export const INITIAL_MESSAGE_SEGMENTS = [
  { text: "こんにちは", reading: "こんにちは", meaning: "Hello", explanation: "A standard greeting used during the day.", function: "greeting" },
  { text: "！", reading: "", meaning: "", function: "punctuation" },
  { text: "日本語", reading: "にほんご", meaning: "Japanese language", function: "noun" },
  { text: "を", reading: "を", meaning: "Object Marker", explanation: "Indicates the direct object of the verb.", function: "particle" },
  { text: "練習", reading: "れんしゅう", meaning: "practice", function: "noun" },
  { text: "しましょう", reading: "しましょう", meaning: "let's do", explanation: "Volitional form of 'suru'.", function: "verb" },
  { text: "。", reading: "", meaning: "", function: "punctuation" }
];

export const DEFAULT_VOCAB = INITIAL_MESSAGE_SEGMENTS
  .filter(s => s.function !== 'punctuation')
  .map((s, index) => ({
    id: `default-${index}`,
    term: s.text,
    reading: s.reading,
    meaning: s.meaning,
    explanation: s.explanation || "",
    examples: [reconstructSentence(INITIAL_MESSAGE_SEGMENTS)],
    mastery: 1,
    addedAt: Date.now()
  }));
