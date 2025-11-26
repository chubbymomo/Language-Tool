import { LEVEL_PRESETS } from '../constants';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

export const fetchGeminiReply = async (userText, settings, knownVocab) => {
  const levelContext = LEVEL_PRESETS[settings.targetLevel].promptContext;
  const vocabContext = knownVocab.slice(-100).map(v => v.term).join(', ');

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      message: userText,
      levelContext,
      vocabContext
    })
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      window.location.reload();
    }
    throw new Error(`API Error: ${response.status}`);
  }
  
  return await response.json();
};

// Settings API
export const fetchSettings = async () => {
  const response = await fetch('/api/settings', {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch settings');
  return await response.json();
};

export const saveSettings = async (settings) => {
  const response = await fetch('/api/settings', {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(settings)
  });
  if (!response.ok) throw new Error('Failed to save settings');
  return await response.json();
};

// Sessions API
export const fetchSessions = async () => {
  const response = await fetch('/api/sessions', {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch sessions');
  return await response.json();
};

export const saveSession = async (session) => {
  const response = await fetch('/api/sessions', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(session)
  });
  if (!response.ok) throw new Error('Failed to save session');
  return await response.json();
};

export const deleteSession = async (sessionId) => {
  const response = await fetch(`/api/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to delete session');
  return await response.json();
};

// Vocab API
export const fetchVocab = async () => {
  const response = await fetch('/api/vocab', {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch vocab');
  return await response.json();
};

export const saveVocabItem = async (item) => {
  const response = await fetch('/api/vocab', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(item)
  });
  if (!response.ok) throw new Error('Failed to save vocab');
  return await response.json();
};

export const deleteVocabItem = async (vocabId) => {
  const response = await fetch(`/api/vocab/${vocabId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to delete vocab');
  return await response.json();
};
