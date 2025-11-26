import React, { useState } from 'react';
import { Database, BookOpen, Layers } from 'lucide-react';
import { safeString } from '../constants';

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

export default KnowledgePanel;
