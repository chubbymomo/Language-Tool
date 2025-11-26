import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEY, DEFAULT_SETTINGS, DEFAULT_VOCAB, INITIAL_MESSAGE_SEGMENTS } from '../constants';

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

export default usePersistence;
