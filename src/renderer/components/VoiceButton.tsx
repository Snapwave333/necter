import { useRef, useState, useEffect, useCallback } from 'react';
import { Mic, MicOff, Loader2, Volume2 } from 'lucide-react';
import { useEdgeTTS } from '../hooks/useEdgeTTS';
import { useAppStore } from '../store';
import type { Message, ContentBlock } from '../types';

type VoiceState = 'idle' | 'recording' | 'transcribing' | 'waiting' | 'speaking';

interface VoiceButtonProps {
  onSubmitText: (text: string) => void;
  activeTurn: boolean;
  messages: Message[];
  disabled?: boolean;
  ttsMuted?: boolean;
  micMuted?: boolean;
}

export function VoiceButton({ onSubmitText, activeTurn, messages, disabled, ttsMuted, micMuted }: VoiceButtonProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const prevActiveTurnRef = useRef(activeTurn);
  const { speak, stop: edgeStop } = useEdgeTTS();
  const setTtsStatus = useAppStore((s) => s.setTtsStatus);

  // Detect when LLM finishes — speak the last assistant message
  useEffect(() => {
    if (ttsMuted) return;

    const wasWaiting = voiceState === 'waiting';
    const llmJustFinished = prevActiveTurnRef.current && !activeTurn;
    prevActiveTurnRef.current = activeTurn;

    if (wasWaiting && llmJustFinished) {
      const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
      if (!lastAssistant) {
        setVoiceState('idle');
        return;
      }
      const content = lastAssistant.content;
      const contentArr = Array.isArray(content) ? content as ContentBlock[] : [];

      // Skip auto-speak if the message has tool-use blocks — LLM isn't done yet
      const hasToolBlock = contentArr.some((b) => b.type === 'tool_use');
      if (hasToolBlock) {
        setVoiceState('idle');
        return;
      }

      const text = contentArr
        .filter((b) => b.type === 'text')
        .map((b) => (b as { type: 'text'; text: string }).text)
        .join(' ');

      if (!text.trim()) {
        setVoiceState('idle');
        return;
      }

      setVoiceState('speaking');
      setTtsStatus('speaking');
      speak(text).then(() => {
        setVoiceState('idle');
        setTtsStatus('idle');
      });
    }
    // speak/edgeStop are stable useCallback refs — safe to omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTurn, voiceState, messages, ttsMuted]);

  const transcribeAndSubmit = useCallback(
    async (blob: Blob, mimeType: string) => {
      try {
        const arrayBuffer = await blob.arrayBuffer();
        const transcript = await window.electronAPI.voice.transcribe(arrayBuffer, mimeType);
        const text = transcript.trim();
        if (text) {
          setVoiceState('waiting');
          onSubmitText(text);
        } else {
          setVoiceState('idle');
        }
      } catch (err) {
        console.error('[Voice] Transcription error:', err);
        setVoiceState('idle');
      }
    },
    [onSubmitText]
  );

  const startRecording = useCallback(async () => {
    if (disabled || voiceState !== 'idle' || micMuted) return;
    edgeStop();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/ogg';

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size < 1000) {
          setVoiceState('idle');
          return;
        }
        await transcribeAndSubmit(blob, mimeType);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setVoiceState('recording');
    } catch (err) {
      console.error('[Voice] Microphone error:', err);
      setVoiceState('idle');
    }
  }, [disabled, voiceState, edgeStop, transcribeAndSubmit]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setVoiceState('transcribing');
    }
  }, []);

  const handleClick = () => {
    if (voiceState === 'idle') {
      startRecording();
    } else if (voiceState === 'recording') {
      stopRecording();
    } else if (voiceState === 'speaking') {
      edgeStop();
      setVoiceState('idle');
    }
  };

  const getIcon = () => {
    switch (voiceState) {
      case 'recording':
        return <MicOff className="w-3.5 h-3.5" />;
      case 'transcribing':
      case 'waiting':
        return <Loader2 className="w-3.5 h-3.5 animate-spin" />;
      case 'speaking':
        return <Volume2 className="w-3.5 h-3.5" />;
      default:
        return <Mic className="w-3.5 h-3.5" />;
    }
  };

  const getTitle = () => {
    switch (voiceState) {
      case 'recording':
        return 'Stop recording';
      case 'transcribing':
        return 'Transcribing…';
      case 'waiting':
        return 'Waiting for response…';
      case 'speaking':
        return 'Stop speaking';
      default:
        return 'Voice input';
    }
  };

  const isActive = voiceState === 'recording' || voiceState === 'speaking';
  const isBusy = voiceState === 'transcribing' || voiceState === 'waiting';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isBusy}
      title={getTitle()}
      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
        isActive
          ? 'bg-accent text-white hover:bg-accent-hover'
          : isBusy
            ? 'bg-surface text-text-muted cursor-not-allowed'
            : 'bg-surface-muted text-text-muted hover:bg-surface hover:text-text-secondary border border-border-subtle'
      }`}
    >
      {getIcon()}
    </button>
  );
}
