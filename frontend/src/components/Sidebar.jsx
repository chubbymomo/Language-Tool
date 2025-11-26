import React from 'react';
import { Brain, PlusCircle, MessageSquare, X } from 'lucide-react';
import { APP_VERSION, safeString } from '../constants';

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

export default Sidebar;
