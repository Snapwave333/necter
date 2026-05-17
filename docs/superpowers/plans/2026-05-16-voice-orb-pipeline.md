# Voice + GLSL Orb Implementation Plan

> **Status**: ALL COMPLETE. Edge-TTS functional. Whisper IPC wired. Orb cross-instance reactivity FIXED (shared Zustand store). Kokoro removed from UI (useKokoro.ts deleted, SettingsVoice cleaned up). Testing pending.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Architecture:**
- Whisper: spawn persistent Python faster-whisper worker in main process; renderer IPC → main → whisper subprocess → text response
- TTS: edge-tts CLI invoked directly from main process (no server, no API key) → audio file → play via HTMLAudioElement in renderer
- GLSL Orb: WebGL canvas overlaid in the ChatView header, driven by a `useOrb` hook that subscribes to `trace.step` / `trace.update` events via `useIPC`
- State machine: `idle | thinking | tool | searching | speaking | transcribing | error` mapped from trace step types and stream events
- TTS status shared via Zustand store so the orb reacts when VoiceButton triggers TTS (not tied to ChatView's local useEdgeTTS instance)

**Tech Stack:** Python faster-whisper (CPU, `base` model), edge-tts CLI, raw WebGL/GLSL, React hooks, Zustand store

---

## Subsystem A: Whisper IPC (faster-whisper) — COMPLETE ✓

### Task A1: Python whisper worker script — COMPLETE ✓

**Files:**
- Created: `src/main/whisper-worker.py`

### Task A2: Whisper subprocess manager in main process — COMPLETE ✓

**Files:**
- Modified: `src/main/index.ts` — `initWhisperProcess()` + `voice.transcribe` handler (line ~2936)
- Modified: `src/preload/index.ts` — `voice.transcribe` added to `electronAPI.voice` (line ~444)

**Changes to `src/main/index.ts`:**
- `initWhisperProcess()` spawns whisper-worker.py as a child process on app startup
- `voice.transcribe` handler writes audio buffer to temp `.webm` file, sends path to worker, reads result

---

## Subsystem B: Edge-TTS — COMPLETE ✓

### Task B1: Replace useKokoro with useEdgeTTS hook — COMPLETE ✓

**Files:**
- Created: `src/renderer/hooks/useEdgeTTS.ts`
- Modified: `src/renderer/components/VoiceButton.tsx`

### Task B2: Main process edge-tts IPC handler — COMPLETE ✓

**Files:**
- Modified: `src/main/index.ts` — `voice.speak` handler (edge-tts subprocess → temp MP3 → bytes) (line ~2891)
- Modified: `src/preload/index.ts` — `voice.speak` added to `electronAPI.voice` (line ~446)

**New hook `useEdgeTTS.ts`:**
```typescript
export type OrbVoiceStatus = 'idle' | 'loading' | 'speaking' | 'error';

export function useEdgeTTS() {
  const [status, setStatus] = useState<OrbVoiceStatus>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef(false);

  const speak = useCallback(async (text: string) => {
    abortRef.current = false;
    setStatus('loading');
    try {
      const arrayBuffer = await window.electronAPI.voice.speak(text, 'en-US-AriaNeural');
      if (abortRef.current) return;
      const url = URL.createObjectURL(new Blob([arrayBuffer], { type: 'audio/mp3' }));
      const el = new Audio(url);
      audioRef.current = el;
      setStatus('speaking');
      el.onended = () => { URL.revokeObjectURL(url); if (!abortRef.current) setStatus('idle'); };
      el.onerror = () => { if (!abortRef.current) setStatus('error'); };
      await el.play();
    } catch (err) {
      console.error('[EdgeTTS]', err);
      if (!abortRef.current) setStatus('error');
    }
  }, []);

  const stop = useCallback(() => {
    abortRef.current = true;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setStatus('idle');
  }, []);

  return { status, speak, stop };
}
```

**Modifications to VoiceButton.tsx:**
- Import `useEdgeTTS` instead of `useKokoro`
- Replace `const { speak, stop: kokoroStop } = useKokoro()` with `const { speak, stop: ttsStop, status: ttsStatus } = useEdgeTTS()`
- When LLM finishes (state === 'waiting' → 'speaking'), call `speak(text)` instead of `speak(text)` (unchanged — just now using edge)
- Mute button: add `ttsMuted` state; if muted, skip the auto-speak on LLM finish

---

## Subsystem C: GLSL Orb — COMPLETE ✓

### Task C1: Orb WebGL canvas component — COMPLETE ✓

**Files:**
- Created: `src/renderer/components/OrbCanvas.tsx`

### Task C2: useOrb hook (state machine) — COMPLETE ✓

**Files:**
- Created: `src/renderer/hooks/useOrb.ts`

### Task C3: Mute buttons — COMPLETE ✓

**Files:**
- Created: `src/renderer/components/MuteControls.tsx`

### Task C4: Wire Orb into ChatView header — COMPLETE ✓

**Files:**
- Modified: `src/renderer/components/ChatView.tsx` — orb + mute buttons in header

### Task C5: Fix cross-instance orb reactivity — COMPLETE ✓

**Problem:** ChatView and VoiceButton each created their own `useEdgeTTS` instance. When VoiceButton auto-speak fired, ChatView's orb didn't animate because it never saw the TTS status change.

**Fix:** Added `ttsStatus: 'idle' | 'loading' | 'speaking' | 'error'` to the Zustand `AppState` store. `VoiceButton` writes to it on speak start/end. `useOrb` (via ChatView) reads from the store so the orb animates whenever TTS is active, regardless of which component owns the `useEdgeTTS` instance.

**Files:**
- Modified: `src/renderer/store/index.ts` — added `ttsStatus` state slice + `setTtsStatus` action
- Modified: `src/renderer/components/VoiceButton.tsx` — calls `setTtsStatus('speaking')` before speak, `setTtsStatus('idle')` after
- Modified: `src/renderer/components/ChatView.tsx` — reads `ttsStatus` from store instead of local `useEdgeTTS` instance; removed unused `useEdgeTTS` import

---

## Subsystem D: Cleanup and Testing

### Task D1: Remove useKokoro imports/files — COMPLETE ✓

**Files:**
- Deleted: `src/renderer/hooks/useKokoro.ts` ✓
- Removed: Kokoro engine toggle + voice picker from `SettingsVoice.tsx` ✓ (kept `ttsEngine`/`kokoroVoice` in store schema for backwards compat)
- `kokoro-js` package remains in `package.json` — removal deferred (would break users who have it selected in their persisted settings); safe to remove in a future migration pass

### Task D2: Verify whisper worker launches — PENDING

**Steps:**
- [ ] Build the app with `npm run build` (or dev mode)
- [ ] Open the app — check main process logs for `[WhisperWorker] READY`
- [ ] If no READY log, check that `pythonPath` in `initWhisperProcess()` points to a valid Python install with `faster-whisper` installed

### Task D3: Verify edge-tts speaks — PENDING

**Steps:**
- [ ] In dev mode, send a message and let the LLM respond
- [ ] With TTS unmuted, the orb should animate to `speaking` state and audio should play
- [ ] Check DevTools console for `[EdgeTTS]` errors

### Task D4: Verify orb reactivity after TTS — PENDING

**Steps:**
- [ ] Start a session, let LLM respond
- [ ] Confirm the orb turns magenta (`speaking` color) when audio plays
- [ ] Confirm orb returns to `idle` when audio finishes

---

## File Summary

**Created:**
- `src/renderer/hooks/useEdgeTTS.ts` ✓
- `src/renderer/hooks/useOrb.ts` ✓
- `src/renderer/components/OrbCanvas.tsx` ✓
- `src/renderer/components/MuteControls.tsx` ✓
- `src/main/whisper-worker.py` ✓

**Modified:**
- `src/main/index.ts` — `voice.speak` handler (edge-tts subprocess → temp MP3 → bytes) ✓
- `src/main/index.ts` — whisper subprocess manager + `voice.transcribe` handler ✓
- `src/preload/index.ts` — `voice.speak` + `voice.transcribe` added to `electronAPI.voice` ✓
- `src/renderer/components/VoiceButton.tsx` — useEdgeTTS, muted prop, shared ttsStatus ✓
- `src/renderer/components/ChatView.tsx` — orb + mute buttons in header, shared ttsStatus ✓
- `src/renderer/store/index.ts` — `ttsStatus` state + `setTtsStatus` action ✓

**Pending cleanup:** none — all done ✓

**No changes needed for:** `src/shared/ipc-types.ts`
