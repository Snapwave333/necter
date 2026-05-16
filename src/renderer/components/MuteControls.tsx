import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

interface MuteControlsProps {
  micMuted: boolean;
  ttsMuted: boolean;
  onMicToggle: () => void;
  onTtsToggle: () => void;
}

export function MuteControls({ micMuted, ttsMuted, onMicToggle, onTtsToggle }: MuteControlsProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onMicToggle}
        title={micMuted ? 'Unmute microphone' : 'Mute microphone'}
        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
          micMuted
            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
            : 'bg-surface-muted text-text-muted hover:bg-surface hover:text-text-secondary border border-border-subtle'
        }`}
      >
        {micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </button>

      <button
        type="button"
        onClick={onTtsToggle}
        title={ttsMuted ? 'Unmute TTS' : 'Mute TTS'}
        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
          ttsMuted
            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
            : 'bg-surface-muted text-text-muted hover:bg-surface hover:text-text-secondary border border-border-subtle'
        }`}
      >
        {ttsMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>
    </div>
  );
}
