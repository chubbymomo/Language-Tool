import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, Square, Send, Settings, BookOpen, Sparkles, GraduationCap, Brain, 
  Trash2, Plus, Database, Server, MessageSquare, PlusCircle, Menu, 
  ChevronLeft, Info, Layers, Eye, EyeOff, MousePointer2, Check, X, 
  AlertTriangle, RefreshCw, Lightbulb, Languages, Zap, Volume2, AlertCircle,
  WifiOff, Wifi
} from 'lucide-react';

// ==========================================
// 1. UTILITIES & CONSTANTS
// ==========================================

const APP_VERSION = 'v16.0'; // Bumped for Backend Integration
const STORAGE_KEY = `japanese_tutor_data_${APP_VERSION}`;

const LEVEL_PRESETS = {
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

const DEFAULT_SETTINGS = {
  targetLevel: 'N5',
  introductionRate: 'Normal',
  tutorMode: true,
  furiganaMode: 'hover',
  englishMode: 'visible',
  autoAddVocab: false,
  useCustomBackend: false,
  backendUrl: 'http://localhost:5000/api/chat'
};

// Robust sanitization
const safeString = (val) => {
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (val === null || val === undefined) return '';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  try { return JSON.stringify(val); } catch (e) { return ""; }
};

const reconstructSentence = (segments) => {
  if (!Array.isArray(segments)) return "";
  return segments.map(s => safeString(s.text)).join('');
};

// Initial Data
const INITIAL_MESSAGE_SEGMENTS = [
  { text: "こんにちは", reading: "こんにちは", meaning: "Hello", explanation: "A standard greeting used during the day.", function: "greeting" },
  { text: "！", reading: "", meaning: "", function: "punctuation" },
  { text: "日本語", reading: "にほんご", meaning: "Japanese language", function: "noun" },
  { 
    text: "を", 
    reading: "を", 
    meaning: "Object Marker", 
    explanation: "Indicates the direct object of the verb. Here, it marks 'Japanese' as the thing being practiced.", 
    function: "particle" 
  },
  { text: "練習", reading: "れんしゅう", meaning: "practice", function: "noun" },
  { 
    text: "しましょう", 
    reading: "しましょう", 
    meaning: "let's do", 
    explanation: "Volitional form of 'suru' (to do). 'Shimashou' implies a suggestion or invitation to do something together.", 
    function: "verb" 
  },
  { text: "。", reading: "", meaning: "", function: "punctuation" }
];

const DEFAULT_VOCAB = INITIAL_MESSAGE_SEGMENTS
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

// ==========================================
// 2. ERROR BOUNDARY
// ==========================================

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-red-50 p-6 text-center">
          <AlertTriangle size={48} className="text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Something went wrong.</h1>
          <p className="text-gray-600 mb-6 max-w-md">The application encountered a critical error, likely due to corrupted data.</p>
          <button 
            onClick={this.handleReset}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-lg"
          >
            <RefreshCw size={20} />
            Reset App Data
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ==========================================
// 3. CUSTOM HOOKS
// ==========================================

const usePersistence = () => {
  const [data, setData] = useState({
    settings: DEFAULT_SETTINGS,
    knownVocab: DEFAULT_VOCAB,
    sessions: [{
      id: 'default',
      title: 'New Conversation',
      messages: [{ role: 'assistant', content: { segments: INITIAL_MESSAGE_SEGMENTS, english: "Hello! Let's practice Japanese.", grammar_point: null } }]
    }],
    activeSessionId: 'default'
  });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const settings = { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) };
        const knownVocab = Array.isArray(parsed.knownVocab) ? parsed.knownVocab : DEFAULT_VOCAB;
        const sessions = Array.isArray(parsed.sessions) ? parsed.sessions : data.sessions;
        
        setData({
          settings,
          knownVocab,
          sessions,
          activeSessionId: parsed.activeSessionId || sessions[0]?.id || 'default'
        });
      } catch (e) {
        console.error("Corruption detected, using defaults.");
      }
    }
  }, []);

  const persist = useCallback((newData) => {
    setData(prev => {
      const updated = { ...prev, ...newData };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return [data, persist];
};

const useSpeech = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window))) {
      setIsSupported(false);
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true; 
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'ja-JP';

      recognitionRef.current.onresult = (event) => {
        const text = Array.from(event.results).map(r => r[0].transcript).join('');
        setTranscript(text);
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => setIsListening(false);
    } catch (e) {
      console.error("Speech init failed", e);
      setIsSupported(false);
    }
  }, []);

  const toggle = useCallback(() => {
    if (!isSupported || !recognitionRef.current) {
      alert("Speech recognition is not supported in this browser or environment.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setTranscript('');
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Failed to start recognition:", e);
        setIsListening(false);
        alert("Microphone failed to start. Check permissions.");
      }
    }
  }, [isListening, isSupported]);

  return { isListening, transcript, setTranscript, toggle, isSupported };
};

// Text-to-Speech Hook
const useTTS = () => {
  const speak = useCallback((text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.9; 
    
    const voices = window.speechSynthesis.getVoices();
    const jaVoice = voices.find(v => v.lang.includes('ja'));
    if (jaVoice) utterance.voice = jaVoice;

    window.speechSynthesis.speak(utterance);
  }, []);

  return { speak };
};

// ==========================================
// 4. API LOGIC
// ==========================================

const fetchGeminiReply = async (userText, settings, knownVocab) => {
  const levelContext = LEVEL_PRESETS[settings.targetLevel].promptContext;
  const vocabContext = knownVocab.slice(-100).map(v => v.term).join(', ');

  const systemPrompt = `
    You are a Japanese language tutor.
    **User Profile:** Level: ${levelContext} | Known Vocab: ${vocabContext}
    **Instructions:**
    1. Reply naturally to: "${userText}"
    2. Prioritize using KNOWN grammar/vocab.
    3. Output JSON only.
    4. "reading" must be in HIRAGANA/KATAKANA.
    5. If token is PARTICLE/GRAMMAR, provide detailed 'explanation'.

    **Output Schema:**
    {
      "segments": [
         { "text": "猫", "reading": "ねこ", "meaning": "cat", "explanation": "optional note", "function": "noun" }
      ],
      "english": "English translation.",
      "grammar_point": "Brief summary."
    }
  `;

  // --- CUSTOM BACKEND PATH ---
  if (settings.useCustomBackend) {
    try {
      const response = await fetch(settings.backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          levelContext,
          vocabContext,
          systemPrompt // Optional: Send strict prompt to backend or let backend decide
        })
      });
      
      if (!response.ok) throw new Error(`Backend Error: ${response.status}`);
      return await response.json();
    } catch (e) {
      throw new Error(`Failed to connect to Python server: ${e.message}`);
    }
  }

  // --- DIRECT API PATH (Demo) ---
  const apiKey = ""; 
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from Gemini");
  return JSON.parse(text);
};

// ==========================================
// 5. SUB-COMPONENTS
// ==========================================

const InteractiveSentence = ({ segments, onWordClick, furiganaMode }) => {
  if (!Array.isArray(segments)) return null;
  return (
    <div className="flex flex-wrap items-end gap-x-1 gap-y-2 leading-[2.5rem] text-lg">
      {segments.map((seg, idx) => {
        if (!seg) return null; 
        const text = safeString(seg.text);
        const reading = safeString(seg.reading);
        const func = safeString(seg.function);
        const isInteractive = func !== 'punctuation';
        const showFurigana = reading && text !== reading; 

        return (
          <button
            key={idx}
            type="button"
            onClick={() => isInteractive && onWordClick(seg)}
            disabled={!isInteractive}
            className={`
              relative group rounded px-0.5 -mx-0.5 transition-colors text-left
              ${isInteractive ? 'hover:bg-indigo-100 cursor-pointer' : 'cursor-default'}
              ${func === 'particle' ? 'text-indigo-600 font-normal' : 'text-gray-900 font-medium'}
            `}
          >
            <ruby className="ruby-align-center">
              {text}
              {showFurigana && (
                <rt 
                  className={`
                    text-[0.55em] text-indigo-500/80 font-normal select-none transition-all duration-200
                    ${furiganaMode === 'hidden' ? 'opacity-0 h-0 hidden' : ''}
                    ${furiganaMode === 'hover' ? 'opacity-0 group-hover:opacity-100' : ''}
                    ${furiganaMode === 'always' ? 'opacity-100' : ''}
                  `}
                  style={{ visibility: (furiganaMode === 'hover' || furiganaMode === 'always') ? 'visible' : 'hidden' }}
                >
                  {reading}
                </rt>
              )}
            </ruby>
          </button>
        );
      })}
    </div>
  );
};

const WordInspector = ({ inspectedWord, knownVocab, onAddToVocab, onClose }) => {
  if (!inspectedWord) return null;
  
  const { data, originSegments } = inspectedWord;
  const term = safeString(data.text);
  const reading = safeString(data.reading);
  const meaning = safeString(data.meaning);
  const explanation = safeString(data.explanation);
  const func = safeString(data.function);
  
  const fullSentence = reconstructSentence(originSegments);
  const isKnown = knownVocab.some(v => v.term === term);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-indigo-600 p-6 text-white relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white"><X size={20}/></button>
          <h2 className="text-3xl font-bold mb-1">{term}</h2>
          <div className="text-indigo-100 text-lg">{reading}</div>
          <div className="mt-2 inline-block px-2 py-0.5 bg-indigo-500 rounded text-xs uppercase tracking-wider">{func}</div>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-1">Meaning</h3>
            <p className="text-gray-800 text-lg font-medium">{meaning}</p>
            {explanation && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-100 rounded-lg">
                <div className="flex items-center gap-1.5 text-xs font-bold text-yellow-700 uppercase mb-1">
                  <Lightbulb size={12} /> Context
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{explanation}</p>
              </div>
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-2">Context</h3>
            <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600 italic border border-gray-100">"{fullSentence}"</div>
          </div>
          <button 
            onClick={() => onAddToVocab(data, fullSentence)}
            className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
              isKnown 
              ? 'border border-indigo-200 text-indigo-600 hover:bg-indigo-50' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
            }`}
          >
            {isKnown ? <><Check size={18} /> Update Context</> : <><Plus size={18} /> Add to Flashcards</>}
          </button>
        </div>
      </div>
    </div>
  );
};

const Sidebar = ({ sessions, activeSessionId, isOpen, onSelectSession, onCreateSession, onDeleteSession }) => (
  <div className={`
    ${isOpen ? 'w-64' : 'w-0'} bg-gray-900 text-gray-300 transition-all duration-300 ease-in-out overflow-hidden flex flex-col border-r border-gray-800
    absolute md:relative z-20 h-full shadow-xl
  `}>
    <div className="p-4 flex items-center gap-2 border-b border-gray-800 shrink-0">
      <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold"><Brain size={18} /></div>
      <span className="font-bold text-white tracking-wide">J-TUTOR</span>
    </div>
    <div className="flex-1 overflow-y-auto p-2 space-y-1">
      <button onClick={onCreateSession} className="w-full flex items-center gap-2 p-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg mb-4 transition-colors text-sm font-medium">
        <PlusCircle size={16} /> New Chat
      </button>
      <div className="text-xs font-semibold text-gray-500 uppercase px-3 mb-2">History</div>
      {sessions.map(s => (
        <div 
          key={s.id} 
          onClick={() => onSelectSession(s.id)}
          className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer text-sm transition-all ${activeSessionId === s.id ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-800' : 'hover:bg-gray-800'}`}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <MessageSquare size={14} className="shrink-0" />
            <span className="truncate">{safeString(s.title)}</span>
          </div>
          {sessions.length > 1 && (
            <button onClick={(e) => onDeleteSession(e, s.id)} className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-1">
              <X size={12} />
            </button>
          )}
        </div>
      ))}
    </div>
    <div className="p-4 border-t border-gray-800 shrink-0 text-xs text-gray-500 flex justify-between">
       <span>{APP_VERSION}</span>
    </div>
  </div>
);

const ChatArea = ({ activeSession, settings, isProcessing, onWordClick }) => {
  const scrollRef = useRef(null);
  const { speak } = useTTS();
  
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession.messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {activeSession.messages.map((msg, idx) => (
        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-4 shadow-sm ${
            msg.role === 'user' 
              ? 'bg-indigo-600 text-white' 
              : msg.isError 
                ? 'bg-red-50 border border-red-200' 
                : 'bg-white border border-gray-100'
          }`}>
            {msg.role === 'user' ? (
              <div className="text-lg">{safeString(msg.content)}</div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-2">
                  {msg.isError ? (
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle size={20} />
                      <span className="font-medium">Error: {safeString(msg.content.text)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="text-gray-800 flex-1">
                        {msg.content && msg.content.segments 
                          ? <InteractiveSentence 
                              segments={msg.content.segments} 
                              furiganaMode={settings.furiganaMode} 
                              onWordClick={(seg) => onWordClick(seg, msg.content.segments)} 
                            />
                          : <div className="text-xl">{safeString(msg.content?.japanese || "...")}</div>
                        }
                      </div>
                      {/* TTS Button */}
                      <button 
                        onClick={() => speak(reconstructSentence(msg.content?.segments || []))}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                        title="Listen"
                      >
                        <Volume2 size={18} />
                      </button>
                    </>
                  )}
                </div>

                {(settings.tutorMode || idx === activeSession.messages.length - 1) && !msg.isError && (
                  <div className="border-t border-gray-100 pt-3 mt-2 space-y-2">
                    <p className={`
                      text-sm text-gray-500 font-serif italic transition-all duration-300
                      ${settings.englishMode === 'hidden' ? 'opacity-0 h-0 overflow-hidden' : ''}
                      ${settings.englishMode === 'hover' ? 'blur-[3px] hover:blur-0 cursor-pointer select-none' : ''}
                    `}>
                      {safeString(msg.content?.english)}
                    </p>
                    {msg.content?.grammar_point && (
                      <div className="flex items-start gap-2 text-sm text-indigo-600 bg-indigo-50 p-2 rounded-lg">
                        <GraduationCap size={16} className="mt-0.5 shrink-0" />
                        <span>{safeString(msg.content.grammar_point)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
      {isProcessing && (
        <div className="flex justify-start">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-2">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-75" />
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-150" />
          </div>
        </div>
      )}
      <div ref={scrollRef} />
    </div>
  );
};

const KnowledgePanel = ({ knownVocab, onAddManual }) => {
  const [term, setTerm] = useState('');
  
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Database size={20} className="text-blue-500"/> Manual Entry
        </h2>
        <div className="flex gap-2">
          <input 
            value={term} onChange={(e) => setTerm(e.target.value)} 
            placeholder="Add word (e.g. 猫)" className="flex-1 border p-2 rounded-lg text-sm" 
          />
          <button 
            onClick={() => { if(term) { onAddManual(term); setTerm(''); } }}
            className="px-4 bg-gray-900 text-white rounded-lg text-sm font-medium"
          >
            Add
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[600px]">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-gray-700 flex items-center gap-2"><BookOpen size={16} /> Knowledge Base</h3>
          <span className="text-xs font-mono bg-white border px-2 py-1 rounded text-gray-500">{knownVocab.length} words</span>
        </div>
        <div className="overflow-y-auto flex-1 p-0">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-gray-100">
              {knownVocab.map((item) => (
                <div key={item.id} className="p-4 bg-white hover:bg-blue-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-xl text-gray-800">{safeString(item.term)}</span>
                        {item.reading && <span className="text-sm text-gray-500 font-medium">({safeString(item.reading)})</span>}
                      </div>
                      <div className="text-sm text-gray-600 font-medium">{safeString(item.meaning)}</div>
                      {item.explanation && <div className="text-xs text-yellow-700 bg-yellow-50 p-1 rounded mt-1 inline-block">{safeString(item.explanation)}</div>}
                    </div>
                  </div>
                  {item.examples?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-dashed border-gray-200">
                      <div className="text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1"><Layers size={10} /> Context</div>
                      <ul className="space-y-1">
                        {item.examples.slice(0, 2).map((ex, i) => (
                          <li key={i} className="text-xs text-gray-500 italic bg-gray-50 p-1.5 rounded border border-gray-100">"{safeString(ex)}"</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

const SettingsPanel = ({ settings, setSettings }) => (
  <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold flex items-center gap-2"><Server size={24} className="text-gray-700"/> Configuration</h2>
      
      {/* Auto Add Settings */}
      <div className="p-4 bg-green-50 rounded-lg border border-green-100">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium text-gray-900">Auto-Add Vocabulary</h3>
            <p className="text-xs text-gray-500 mt-1">Automatically save new nouns, verbs, and adjectives from AI responses to your Knowledge Base.</p>
          </div>
          <button 
            onClick={() => setSettings(s => ({ ...s, autoAddVocab: !s.autoAddVocab }))}
            className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${settings.autoAddVocab ? 'bg-green-500' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.autoAddVocab ? 'left-7' : 'left-1'}`} />
          </button>
        </div>
      </div>

      {/* Furigana */}
      <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
        <h3 className="font-medium text-gray-900 mb-2">Reading Aids (Furigana)</h3>
        <div className="grid grid-cols-3 gap-2">
          {['always', 'hover', 'hidden'].map(mode => (
            <button key={mode} onClick={() => setSettings(s => ({ ...s, furiganaMode: mode }))}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-medium border transition-all ${settings.furiganaMode === mode ? 'bg-white border-indigo-500 text-indigo-600 shadow-sm' : 'border-transparent text-gray-500 hover:bg-white/50'}`}>
              {mode === 'always' ? <Eye size={16}/> : mode === 'hover' ? <MousePointer2 size={16}/> : <EyeOff size={16}/>}
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* English */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="font-medium text-gray-900 mb-2">English Translation</h3>
        <div className="grid grid-cols-3 gap-2">
          {['visible', 'hover', 'hidden'].map(mode => (
             <button key={mode} onClick={() => setSettings(s => ({ ...s, englishMode: mode }))}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-medium border transition-all ${settings.englishMode === mode ? 'bg-white border-gray-500 text-gray-800 shadow-sm' : 'border-transparent text-gray-500 hover:bg-white/50'}`}>
              {mode === 'visible' ? <Eye size={16}/> : mode === 'hover' ? <Languages size={16}/> : <EyeOff size={16}/>}
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

       {/* Backend */}
       <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div><h3 className="font-medium text-gray-900">Custom Backend</h3><p className="text-xs text-gray-500">Route requests to local Python server.</p></div>
            <button onClick={() => setSettings(s => ({ ...s, useCustomBackend: !s.useCustomBackend }))} className={`w-12 h-6 rounded-full transition-colors relative ${settings.useCustomBackend ? 'bg-green-500' : 'bg-gray-300'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.useCustomBackend ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
          {settings.useCustomBackend && (
            <input type="text" value={settings.backendUrl} onChange={(e) => setSettings(s => ({...s, backendUrl: e.target.value}))} className="w-full mt-2 p-2 text-sm border rounded font-mono text-gray-600 bg-white" />
          )}
        </div>
    </div>
  </div>
);

// ==========================================
// 6. MAIN COMPONENT
// ==========================================

function JapaneseTutorApp() {
  const [data, persist] = usePersistence();
  const { settings, knownVocab, sessions, activeSessionId } = data;
  const { isListening, transcript, setTranscript, toggle: toggleMic, isSupported } = useSpeech();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('chat'); 
  const [inspectedWord, setInspectedWord] = useState(null); 

  // Sync speech input to chat input
  const [inputText, setInputText] = useState('');
  useEffect(() => { if (transcript) setInputText(transcript); }, [transcript]);

  // Actions
  const handleCreateSession = () => {
    const newSession = {
      id: crypto.randomUUID(),
      title: `Conversation ${sessions.length + 1}`,
      messages: [{ role: 'assistant', content: { segments: INITIAL_MESSAGE_SEGMENTS, english: "New Conversation", grammar_point: null } }]
    };
    persist({ sessions: [...sessions, newSession], activeSessionId: newSession.id });
    if(window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleDeleteSession = (e, id) => {
    e.stopPropagation();
    if (sessions.length <= 1) return;
    const filtered = sessions.filter(s => s.id !== id);
    persist({ sessions: filtered, activeSessionId: activeSessionId === id ? filtered[0].id : activeSessionId });
  };

  const handleAddToVocab = (wordData, context) => {
    const term = safeString(wordData.text);
    const existing = knownVocab.find(p => p.term === term);
    let newVocab = [];

    if (existing) {
       newVocab = knownVocab.map(p => p.term === term 
         ? { ...p, examples: [...new Set([...p.examples, context])], explanation: safeString(wordData.explanation) || p.explanation } 
         : p);
    } else {
       newVocab = [...knownVocab, {
         id: crypto.randomUUID(),
         term,
         reading: safeString(wordData.reading),
         meaning: safeString(wordData.meaning),
         explanation: safeString(wordData.explanation),
         examples: [context],
         mastery: 1,
         addedAt: Date.now()
       }];
    }
    persist({ knownVocab: newVocab });
    setInspectedWord(null);
  };

  const handleManualAdd = (term) => {
    handleAddToVocab({ text: term, reading: '?', meaning: 'Manual Entry', explanation: '' }, 'Manual Entry');
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText('');
    setTranscript('');
    
    // Optimistic User Msg
    const updatedSessions = sessions.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, { role: 'user', content: text }] } : s);
    persist({ sessions: updatedSessions });
    setIsProcessing(true);

    try {
      const reply = await fetchGeminiReply(text, settings, knownVocab);
      
      // --- Auto-Add Logic ---
      let updatedVocab = [...knownVocab];
      if (settings.autoAddVocab && reply.segments) {
        const context = reconstructSentence(reply.segments);
        const newWords = reply.segments
          .filter(seg => ['noun', 'verb', 'adjective'].includes(seg.function) && !knownVocab.some(kv => kv.term === seg.text))
          .map(seg => ({
            id: crypto.randomUUID(),
            term: seg.text,
            reading: seg.reading,
            meaning: seg.meaning,
            explanation: seg.explanation || "",
            examples: [context],
            mastery: 1,
            addedAt: Date.now()
          }));
        
        if (newWords.length > 0) {
          updatedVocab = [...updatedVocab, ...newWords];
        }
      }

      const finalSessions = updatedSessions.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, { role: 'assistant', content: reply }] } : s);
      persist({ sessions: finalSessions, knownVocab: updatedVocab });

    } catch (e) {
      console.error(e);
      // Add visual error message
      const errorSessions = updatedSessions.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, { role: 'assistant', isError: true, content: { text: e.message || "Unknown error" } }] } : s);
      persist({ sessions: errorSessions });
    } finally {
      setIsProcessing(false);
    }
  };

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      <WordInspector inspectedWord={inspectedWord} knownVocab={knownVocab} onAddToVocab={handleAddToVocab} onClose={() => setInspectedWord(null)} />
      
      <Sidebar 
        sessions={sessions} 
        activeSessionId={activeSessionId} 
        isOpen={sidebarOpen} 
        onSelectSession={(id) => { persist({ activeSessionId: id }); setActiveTab('chat'); if(window.innerWidth<768) setSidebarOpen(false); }}
        onCreateSession={handleCreateSession}
        onDeleteSession={handleDeleteSession}
      />

      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        {!sidebarOpen && <button onClick={() => setSidebarOpen(true)} className="absolute top-4 left-4 z-10 p-2 bg-white shadow-md rounded-lg md:hidden"><Menu size={20} className="text-gray-600" /></button>}

        <header className="bg-white border-b px-6 py-3 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
             <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hidden md:block">{sidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}</button>
             <div><h1 className="font-bold text-lg text-gray-800">{safeString(activeSession.title)}</h1><p className="text-xs text-gray-500">{settings.targetLevel}</p></div>
          </div>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            {['chat', 'knowledge', 'settings'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === tab ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                {tab === 'chat' && <MessageSquare size={16} />}
                {tab === 'knowledge' && <BookOpen size={16} />}
                {tab === 'settings' && <Settings size={16} />}
                <span className="capitalize hidden sm:inline">{tab}</span>
              </button>
            ))}
          </div>
        </header>

        {activeTab === 'chat' && (
          <>
            <ChatArea 
              activeSession={activeSession} 
              settings={settings} 
              isProcessing={isProcessing} 
              onWordClick={(seg, context) => setInspectedWord({ data: seg, originSegments: context })} 
            />
            <div className="bg-white p-4 border-t shrink-0">
              <div className="flex gap-2 max-w-3xl mx-auto">
                <button 
                  onClick={toggleMic} 
                  disabled={!isSupported}
                  title={!isSupported ? "Speech recognition not supported" : "Hold to speak"}
                  className={`p-4 rounded-full transition-all duration-300 ${
                    !isSupported ? 'bg-gray-200 text-gray-400 cursor-not-allowed' :
                    isListening ? 'bg-red-500 text-white shadow-red-200 shadow-lg scale-110' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {/* Visual feedback for supported/unsupported/listening */}
                  {!isSupported ? <WifiOff size={24} /> : isListening ? <Square size={24} fill="currentColor" className="animate-pulse" /> : <Mic size={24} />}
                </button>
                <input 
                  type="text" 
                  value={inputText} 
                  onChange={(e) => setInputText(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
                  placeholder={isListening ? "Listening..." : "Type Japanese..."} 
                  className="flex-1 bg-gray-50 border-0 rounded-2xl px-6 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none" 
                />
                <button onClick={handleSend} disabled={!inputText.trim() || isProcessing} className="p-4 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg"><Send size={24} /></button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'knowledge' && <KnowledgePanel knownVocab={knownVocab} onAddManual={handleManualAdd} />}
        {activeTab === 'settings' && <SettingsPanel settings={settings} setSettings={(fn) => persist({ settings: fn(settings) })} />}
      </div>
    </div>
  );
}

export default function JapaneseTutor() {
  return (
    <ErrorBoundary>
      <JapaneseTutorApp />
    </ErrorBoundary>
  );
}
