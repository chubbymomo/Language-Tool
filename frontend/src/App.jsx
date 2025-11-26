import React, { useState, useEffect } from 'react';
import { Menu, ChevronLeft, MessageSquare, BookOpen, Settings, Mic, Square, Send, WifiOff, LogOut, Loader2 } from 'lucide-react';

// Components
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import WordInspector from './components/WordInspector';
import KnowledgePanel from './components/KnowledgePanel';
import SettingsPanel from './components/SettingsPanel';
import AuthPage from './components/AuthPage';

// Context & Services
import { useAuth } from './context/AuthContext';
import { 
  fetchGeminiReply, 
  fetchSettings, saveSettings,
  fetchSessions, saveSession, deleteSession as apiDeleteSession,
  fetchVocab, saveVocabItem
} from './services/api';

// Constants
import { DEFAULT_SETTINGS, INITIAL_MESSAGE_SEGMENTS, safeString, reconstructSentence } from './constants';

// Hooks
import useSpeech from './hooks/useSpeech';

function JapaneseTutorApp() {
  const { user, logout, loading: authLoading } = useAuth();
  
  // State
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [knownVocab, setKnownVocab] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('chat'); 
  const [inspectedWord, setInspectedWord] = useState(null); 
  const [inputText, setInputText] = useState('');
  
  const { isListening, transcript, setTranscript, toggle: toggleMic, isSupported } = useSpeech();

  // Sync Speech to Input
  useEffect(() => { if (transcript) setInputText(transcript); }, [transcript]);

  // Load user data on login
  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    setDataLoading(true);
    try {
      const [settingsData, sessionsData, vocabData] = await Promise.all([
        fetchSettings(),
        fetchSessions(),
        fetchVocab()
      ]);
      
      setSettings({ ...DEFAULT_SETTINGS, ...settingsData });
      setKnownVocab(vocabData);
      
      if (sessionsData.length > 0) {
        setSessions(sessionsData);
        setActiveSessionId(sessionsData[0].id);
      } else {
        // Create default session
        const defaultSession = {
          id: crypto.randomUUID(),
          title: 'New Conversation',
          messages: [{ role: 'assistant', content: { segments: INITIAL_MESSAGE_SEGMENTS, english: "Hello! Let's practice Japanese.", grammar_point: null } }]
        };
        setSessions([defaultSession]);
        setActiveSessionId(defaultSession.id);
        await saveSession(defaultSession);
      }
    } catch (e) {
      console.error('Failed to load user data:', e);
    } finally {
      setDataLoading(false);
    }
  };

  // Persist settings changes
  const updateSettings = async (updateFn) => {
    const newSettings = updateFn(settings);
    setSettings(newSettings);
    try {
      await saveSettings(newSettings);
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  };

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  // --- Handlers ---

  const handleCreateSession = async () => {
    const newSession = {
      id: crypto.randomUUID(),
      title: `Conversation ${sessions.length + 1}`,
      messages: [{ role: 'assistant', content: { segments: INITIAL_MESSAGE_SEGMENTS, english: "New Conversation", grammar_point: null } }]
    };
    setSessions([newSession, ...sessions]);
    setActiveSessionId(newSession.id);
    if(window.innerWidth < 768) setSidebarOpen(false);
    
    try {
      await saveSession(newSession);
    } catch (e) {
      console.error('Failed to save session:', e);
    }
  };

  const handleDeleteSession = async (e, id) => {
    e.stopPropagation();
    if (sessions.length <= 1) return;
    
    const filtered = sessions.filter(s => s.id !== id);
    setSessions(filtered);
    if (activeSessionId === id) {
      setActiveSessionId(filtered[0].id);
    }
    
    try {
      await apiDeleteSession(id);
    } catch (e) {
      console.error('Failed to delete session:', e);
    }
  };

  const handleAddToVocab = async (wordData, context) => {
    const term = safeString(wordData.text);
    const existing = knownVocab.find(p => p.term === term);
    let newItem;

    if (existing) {
      newItem = { 
        ...existing, 
        examples: [...new Set([...existing.examples, context])], 
        explanation: safeString(wordData.explanation) || existing.explanation 
      };
      setKnownVocab(knownVocab.map(p => p.term === term ? newItem : p));
    } else {
      newItem = {
        id: crypto.randomUUID(),
        term,
        reading: safeString(wordData.reading),
        meaning: safeString(wordData.meaning),
        explanation: safeString(wordData.explanation),
        examples: [context],
        mastery: 1,
        addedAt: Date.now()
      };
      setKnownVocab([newItem, ...knownVocab]);
    }
    
    try {
      await saveVocabItem(newItem);
    } catch (e) {
      console.error('Failed to save vocab:', e);
    }
    
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
    
    // Add User Message
    const updatedMessages = [...activeSession.messages, { role: 'user', content: text }];
    const updatedSessions = sessions.map(s => 
      s.id === activeSessionId ? { ...s, messages: updatedMessages } : s
    );
    setSessions(updatedSessions);
    setIsProcessing(true);

    try {
      const reply = await fetchGeminiReply(text, settings, knownVocab);
      
      // Auto-Add Vocab Logic
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
          updatedVocab = [...newWords, ...updatedVocab];
          setKnownVocab(updatedVocab);
          // Save new vocab items
          for (const word of newWords) {
            try {
              await saveVocabItem(word);
            } catch (e) {
              console.error('Failed to save vocab:', e);
            }
          }
        }
      }

      // Update Session with AI Message
      const finalMessages = [...updatedMessages, { role: 'assistant', content: reply }];
      const finalSession = { ...activeSession, messages: finalMessages };
      const finalSessions = sessions.map(s => 
        s.id === activeSessionId ? finalSession : s
      );
      setSessions(finalSessions);
      
      // Save session
      try {
        await saveSession(finalSession);
      } catch (e) {
        console.error('Failed to save session:', e);
      }

    } catch (e) {
      console.error(e);
      const errorMessages = [...updatedMessages, { role: 'assistant', isError: true, content: { text: e.message || "Unknown error" } }];
      setSessions(sessions.map(s => 
        s.id === activeSessionId ? { ...s, messages: errorMessages } : s
      ));
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Loading States ---
  
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-indigo-600" />
      </div>
    );
  }
  
  if (!user) {
    return <AuthPage />;
  }
  
  if (dataLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading your data...</p>
        </div>
      </div>
    );
  }

  // --- Render ---

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      {/* Modals */}
      <WordInspector inspectedWord={inspectedWord} knownVocab={knownVocab} onAddToVocab={handleAddToVocab} onClose={() => setInspectedWord(null)} />
      
      {/* Sidebar */}
      <Sidebar 
        sessions={sessions} 
        activeSessionId={activeSessionId} 
        isOpen={sidebarOpen} 
        onSelectSession={(id) => { setActiveSessionId(id); setActiveTab('chat'); if(window.innerWidth<768) setSidebarOpen(false); }}
        onCreateSession={handleCreateSession}
        onDeleteSession={handleDeleteSession}
        user={user}
        onLogout={logout}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* Mobile Toggle */}
        {!sidebarOpen && <button onClick={() => setSidebarOpen(true)} className="absolute top-4 left-4 z-10 p-2 bg-white shadow-md rounded-lg md:hidden"><Menu size={20} className="text-gray-600" /></button>}

        {/* Header */}
        <header className="bg-white border-b px-6 py-3 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
             <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hidden md:block">{sidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}</button>
             <div><h1 className="font-bold text-lg text-gray-800">{activeSession ? safeString(activeSession.title) : 'J-Tutor'}</h1><p className="text-xs text-gray-500">{settings.targetLevel}</p></div>
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

        {/* Tab Views */}
        {activeTab === 'chat' && activeSession && (
          <>
            <ChatArea 
              activeSession={activeSession} 
              settings={settings} 
              isProcessing={isProcessing} 
              onWordClick={(seg, context) => setInspectedWord({ data: seg, originSegments: context })} 
            />
            {/* Input Area */}
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
        {activeTab === 'settings' && <SettingsPanel settings={settings} setSettings={updateSettings} />}
      </div>
    </div>
  );
}

export default JapaneseTutorApp;
