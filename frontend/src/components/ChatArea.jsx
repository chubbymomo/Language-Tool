// frontend/src/components/ChatArea.jsx
import React, { useRef, useEffect } from 'react';
import { AlertCircle, Volume2, GraduationCap } from 'lucide-react';
import useTTS from '../hooks/useTTS';
import { safeString, reconstructSentence } from '../constants';

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
                      ${/* CHANGED: hover:blur-0 -> hover:blur-none */ ''}
                      ${settings.englishMode === 'hover' ? 'blur-[3px] hover:blur-none cursor-pointer select-none' : ''}
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

export default ChatArea;
