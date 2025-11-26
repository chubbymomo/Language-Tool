import React from 'react';
import { Server, Eye, EyeOff, MousePointer2, Languages } from 'lucide-react';

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

export default SettingsPanel;
