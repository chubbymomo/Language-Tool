import React, { useState, useEffect } from 'react';
import { Menu, ChevronLeft, MessageSquare, BookOpen, Settings, Mic, Square, Send, WifiOff } from 'lucide-react';

// Components
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import WordInspector from './components/WordInspector';
import KnowledgePanel from './components/KnowledgePanel';
import SettingsPanel from './components/SettingsPanel';

// Hooks & Services
import usePersistence from './hooks/usePersistence';
import useSpeech from './hooks/useSpeech';
import { fetchGeminiReply } from './services/api';
import { INITIAL_MESSAGE_SEGMENTS, safeString, reconstructSentence } from './constants';

function JapaneseTutorApp() {
  // State & Hooks
  const [data, persist] = usePersistence();
  const { settings, knownVocab, sessions, activeSessionId } = data;
  const { isListening, transcript, setTranscript, toggle: toggleMic, isSupported } = useSpeech();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('chat'); 
  const [inspectedWord, setInspectedWord] = useState(null); 
  const [inputText, setInputText] = useState('');

  // Sync Speech to Input
  useEffect(() => { if (transcript) setInputText(transcript); }, [transcript]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  // --- Handlers ---

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
    
    // 1. Add User Message
    const updatedSessions = sessions.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, { role: 'user', content: text }] } : s);
    persist({ sessions: updatedSessions });
    setIsProcessing(true);

    try {
      // 2. Fetch AI Reply
      const reply = await fetchGeminiReply(text, settings, knownVocab);
      
      // 3. Auto-Add Vocab Logic
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

      // 4. Update Session with AI Message
      const finalSessions = updatedSessions.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, { role: 'assistant', content: reply }] } : s);
      persist({ sessions: finalSessions, knownVocab: updatedVocab });

    } catch (e) {
      console.error(e);
      // Error State
      const errorSessions = updatedSessions.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, { role: 'assistant', isError: true, content: { text: e.message || "Unknown error" } }] } : s);
      persist({ sessions: errorSessions });
    } finally {
      setIsProcessing(false);
    }
  };

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
        onSelectSession={(id) => { persist({ activeSessionId: id }); setActiveTab('chat'); if(window.innerWidth<768) setSidebarOpen(false); }}
        onCreateSession={handleCreateSession}
        onDeleteSession={handleDeleteSession}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* Mobile Toggle */}
        {!sidebarOpen && <button onClick={() => setSidebarOpen(true)} className="absolute top-4 left-4 z-10 p-2 bg-white shadow-md rounded-lg md:hidden"><Menu size={20} className="text-gray-600" /></button>}

        {/* Header */}
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

        {/* Tab Views */}
        {activeTab === 'chat' && (
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
        {activeTab === 'settings' && <SettingsPanel settings={settings} setSettings={(fn) => persist({ settings: fn(settings) })} />}
      </div>
    </div>
  );
}

export default JapaneseTutorApp;
