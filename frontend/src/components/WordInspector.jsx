import React from 'react';
import { X, Lightbulb, Check, Plus } from 'lucide-react';
import { safeString, reconstructSentence } from '../constants';

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

export default WordInspector;
