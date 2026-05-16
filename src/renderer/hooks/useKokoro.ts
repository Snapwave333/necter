import { useRef, useState, useCallback } from 'react';

export type KokoroStatus = 'idle' | 'loading' | 'ready' | 'speaking' | 'error';

let kokoroInstance: import('kokoro-js').KokoroTTS | null = null;
let kokoroLoading: Promise<import('kokoro-js').KokoroTTS> | null = null;

async function getKokoro(): Promise<import('kokoro-js').KokoroTTS> {
  if (kokoroInstance) return kokoroInstance;
  if (kokoroLoading) return kokoroLoading;

  kokoroLoading = (async () => {
    const { KokoroTTS } = await import('kokoro-js');
    const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0', {
      dtype: 'q8',
    });
    kokoroInstance = tts;
    kokoroLoading = null;
    return tts;
  })();

  return kokoroLoading;
}

type KokoroVoice = Parameters<import('kokoro-js').KokoroTTS['generate']>[1] extends
  | { voice?: infer V }
  | undefined
  ? V
  : string;

export function useKokoro() {
  const [status, setStatus] = useState<KokoroStatus>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef(false);

  const speak = useCallback(async (text: string, voice: KokoroVoice = 'af_heart' as KokoroVoice) => {
    abortRef.current = false;
    setStatus('loading');

    try {
      const tts = await getKokoro();
      if (abortRef.current) return;

      setStatus('speaking');
      const audio = await tts.generate(text, { voice });
      if (abortRef.current) return;

      const blob = audio.toBlob();
      const url = URL.createObjectURL(blob);
      const el = new Audio(url);
      audioRef.current = el;

      await new Promise<void>((resolve, reject) => {
        el.onended = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        el.onerror = reject;
        el.play();
      });

      if (!abortRef.current) setStatus('ready');
    } catch (err) {
      if (!abortRef.current) {
        console.error('[Kokoro]', err);
        setStatus('error');
      }
    }
  }, []);

  const stop = useCallback(() => {
    abortRef.current = true;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setStatus('ready');
  }, []);

  const preload = useCallback(async () => {
    setStatus('loading');
    try {
      await getKokoro();
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  return { status, speak, stop, preload };
}
