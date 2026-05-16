import { useRef, useCallback, useState } from 'react';

export type EdgeTTSStatus = 'idle' | 'loading' | 'ready' | 'speaking' | 'error';

type EdgeTTSVoice = string;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VoiceAPI = { speak: (text: string, voice?: string) => Promise<ArrayBuffer> };

export function useEdgeTTS() {
  const abortRef = useRef(false);
  const [status, setStatus] = useState<EdgeTTSStatus>('idle');

  const speak = useCallback(async (text: string, voice?: EdgeTTSVoice) => {
    abortRef.current = false;
    setStatus('loading');

    try {
      if (abortRef.current) { setStatus('idle'); return; }
      const api = (window as any).electronAPI as { voice: VoiceAPI };
      const buffer = await api.voice.speak(text, voice);
      if (abortRef.current) { setStatus('idle'); return; }

      setStatus('speaking');
      const blob = new Blob([buffer], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);
      const el = new Audio(url);
      await new Promise<void>((resolve, reject) => {
        el.onended = () => { URL.revokeObjectURL(url); setStatus('idle'); resolve(); };
        el.onerror = () => { URL.revokeObjectURL(url); setStatus('error'); reject(new Error('Audio playback error')); };
        el.play().catch(reject);
      });
    } catch (err) {
      if (!abortRef.current) { console.error('[EdgeTTS]', err); setStatus('error'); throw err; }
    }
  }, []);

  const stop = useCallback(() => { abortRef.current = true; setStatus('idle'); }, []);

  return { speak, stop, status };
}
