import { useState, useEffect, useRef, useCallback } from 'react';

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

export default useSpeech;
