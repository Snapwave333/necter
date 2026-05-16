import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Volume2, VolumeX, Mic, MicOff, Play } from 'lucide-react';
import { useAppStore } from '../../store';
import { useEdgeTTS } from '../../hooks/useEdgeTTS';
import { useKokoro } from '../../hooks/useKokoro';

const EDGE_VOICES = [
  { value: 'en-US-AriaNeural', label: 'Aria (US) — warm, professional' },
  { value: 'en-US-JennyNeural', label: 'Jenny (US) — friendly, clear' },
  { value: 'en-US-GuyNeural', label: 'Guy (US) — authoritative' },
  { value: 'en-US-SaraNeural', label: 'Sara (US) — upbeat' },
  { value: 'en-GB-SoniaNeural', label: 'Sonia (UK) — elegant' },
  { value: 'en-AU-NatashaNeural', label: 'Natasha (AU) — clear' },
];

const KOKORO_VOICES = [
  { value: 'af_heart', label: 'af_heart — warm female' },
  { value: 'af_bella', label: 'af_bella — bright female' },
  { value: 'af_nicole', label: 'af_nicole — friendly female' },
  { value: 'af_sarah', label: 'af_sarah — clear female' },
  { value: 'am_adam', label: 'am_adam — calm male' },
  { value: 'am_michael', label: 'am_michael — steady male' },
  { value: 'bf_emma', label: 'bf_emma — british female' },
  { value: 'bm_george', label: 'bm_george — british male' },
];

const TEST_PHRASE = 'Hello! This is a test of the voice settings. How does this sound?';

export function SettingsVoice() {
  const { t } = useTranslation();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const { speak: speakEdge, status: edgeStatus, stop: stopEdge } = useEdgeTTS();
  const { speak: speakKokoro, status: kokoroStatus, stop: stopKokoro } = useKokoro();

  const [testing, setTesting] = useState(false);

  const handleTestSpeak = useCallback(async () => {
    if (testing) return;
    setTesting(true);
    // Stop any current speech
    stopEdge();
    stopKokoro();

    try {
      if (settings.ttsEngine === 'edge') {
        await speakEdge(TEST_PHRASE, settings.edgeVoice);
      } else {
        await speakKokoro(TEST_PHRASE, settings.kokoroVoice);
      }
    } finally {
      setTesting(false);
    }
  }, [testing, settings.ttsEngine, settings.edgeVoice, settings.kokoroVoice, speakEdge, speakKokoro, stopEdge, stopKokoro]);

  const handleStopTest = useCallback(() => {
    stopEdge();
    stopKokoro();
    setTesting(false);
  }, [stopEdge, stopKokoro]);

  return (
    <div className="space-y-8">
      {/* TTS Engine Toggle */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-text-primary">{t('voice.ttsEngine')}</h4>
        <div className="flex gap-2">
          {(['edge', 'kokoro'] as const).map((engine) => (
            <button
              key={engine}
              onClick={() => updateSettings({ ttsEngine: engine })}
              className={`flex-1 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                settings.ttsEngine === engine
                  ? 'border-accent bg-accent/5 text-text-primary'
                  : 'border-border bg-surface hover:border-accent/50 text-text-secondary'
              }`}
            >
              {engine === 'edge' ? 'Edge TTS' : 'Kokoro (Local)'}
            </button>
          ))}
        </div>
        <p className="text-xs text-text-muted">
          {settings.ttsEngine === 'edge'
            ? 'Microsoft Edge TTS — high quality, requires internet.'
            : 'Kokoro-82M — runs locally via WebAssembly, no internet needed.'}
        </p>
      </div>

      {/* Voice Picker */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-text-primary">{t('voice.voice')}</h4>
        {settings.ttsEngine === 'edge' ? (
          <div className="grid grid-cols-1 gap-2">
            {EDGE_VOICES.map((v) => (
              <button
                key={v.value}
                onClick={() => updateSettings({ edgeVoice: v.value })}
                className={`w-full text-left px-4 py-3 rounded-lg border-2 text-sm transition-all ${
                  settings.edgeVoice === v.value
                    ? 'border-accent bg-accent/5 text-text-primary'
                    : 'border-border bg-surface hover:border-accent/50 text-text-secondary'
                }`}
              >
                <span className="font-medium">{v.label.split(' — ')[0]}</span>
                <span className="ml-2 text-text-muted">— {v.label.split(' — ')[1]}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {KOKORO_VOICES.map((v) => (
              <button
                key={v.value}
                onClick={() => updateSettings({ kokoroVoice: v.value })}
                className={`w-full text-left px-4 py-3 rounded-lg border-2 text-sm transition-all ${
                  settings.kokoroVoice === v.value
                    ? 'border-accent bg-accent/5 text-text-primary'
                    : 'border-border bg-surface hover:border-accent/50 text-text-secondary'
                }`}
              >
                <span className="font-medium">{v.label.split(' — ')[0]}</span>
                <span className="ml-2 text-text-muted">— {v.label.split(' — ')[1]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Test Speak */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-text-primary">{t('voice.testVoice')}</h4>
        <button
          onClick={testing ? handleStopTest : handleTestSpeak}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
            testing
              ? 'border-red-400 bg-red-500/10 text-red-400 hover:bg-red-500/20'
              : 'border-accent bg-accent/10 text-accent hover:bg-accent/20'
          }`}
        >
          {testing ? (
            <>
              <VolumeX className="w-4 h-4" />
              Stop
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Test voice
            </>
          )}
        </button>
        {testing && (
          <p className="text-xs text-text-muted">
            {settings.ttsEngine === 'edge'
              ? 'Speaking via Edge TTS...'
              : 'Speaking via Kokoro (first load may take a moment)...'}
          </p>
        )}
      </div>

      {/* Default Mute States */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-text-primary">{t('voice.defaultBehavior')}</h4>
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer group">
            <button
              type="button"
              onClick={() => updateSettings({ ttsMuted: !settings.ttsMuted })}
              className={`w-9 h-5 rounded-full transition-colors relative ${
                settings.ttsMuted ? 'bg-red-500/30' : 'bg-surface-muted group-hover:bg-surface'
              }`}
              role="switch"
              aria-checked={!settings.ttsMuted}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-text-muted transition-transform mt-0.5 ${
                  !settings.ttsMuted ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'
                }`}
              />
            </button>
            <span className="text-sm text-text-secondary flex items-center gap-2">
              <Volume2 className="w-3.5 h-3.5 text-text-muted" />
              Auto-speak responses (enable TTS)
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <button
              type="button"
              onClick={() => updateSettings({ micMuted: !settings.micMuted })}
              className={`w-9 h-5 rounded-full transition-colors relative ${
                settings.micMuted ? 'bg-red-500/30' : 'bg-surface-muted group-hover:bg-surface'
              }`}
              role="switch"
              aria-checked={!settings.micMuted}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-text-muted transition-transform mt-0.5 ${
                  !settings.micMuted ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'
                }`}
              />
            </button>
            <span className="text-sm text-text-secondary flex items-center gap-2">
              <Mic className="w-3.5 h-3.5 text-text-muted" />
              Start with microphone muted
            </span>
          </label>
        </div>
        <p className="text-xs text-text-muted">
          These set the default when you open a new chat. TTS and mic can always be toggled in the header.
        </p>
      </div>
    </div>
  );
}
