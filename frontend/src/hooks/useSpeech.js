import { useState, useRef, useCallback } from 'react';

const useSpeech = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const toggle = useCallback(async () => {
    if (isListening) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setIsListening(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach(track => track.stop());
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          
          try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            const token = localStorage.getItem('token');
            const response = await fetch('/api/transcribe', {
              method: 'POST',
              headers: {
                ...(token && { 'Authorization': `Bearer ${token}` })
              },
              body: formData
            });

            if (response.ok) {
              const data = await response.json();
              setTranscript(data.text || '');
            } else {
              console.error('Transcription failed:', response.status);
            }
          } catch (err) {
            console.error('Failed to transcribe:', err);
          }
        };

        mediaRecorder.start();
        setIsListening(true);
      } catch (err) {
        console.error('Microphone access denied:', err);
        setIsSupported(false);
        alert('Microphone access denied. Please allow microphone permissions.');
      }
    }
  }, [isListening]);

  return { isListening, transcript, setTranscript, toggle, isSupported };
};

export default useSpeech;
