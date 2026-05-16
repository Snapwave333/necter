import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store';
import type { TraceStep } from '../types';

export type OrbState = 'idle' | 'thinking' | 'tool' | 'search' | 'speaking' | 'transcribing' | 'error' | 'muted';

type TTSStatus = 'idle' | 'loading' | 'ready' | 'speaking' | 'error';

// Tool names that indicate a search operation
const SEARCH_TOOL_NAMES = new Set([
  'websearch',
  'web_fetch',
  'browser',
  'search',
  'fetch',
]);

/**
 * Maps IPC events (stream.thinking, stream.message, trace.step, trace.update)
 * and TTS status to an OrbState.
 *
 * - activeSteps Set tracks running trace stepIds.
 * - isThinkingRef tracks when stream.thinking has fired but stream.message hasn't arrived yet.
 * - When a step completes (completed/error), it is removed from activeSteps and the
 *   state is recalculated based on remaining active steps.
 * - Priority order: error > speaking > transcribing > thinking > tool/search > idle
 */
export function useOrb(ttsStatus: TTSStatus = 'idle'): OrbState {
  // Active running trace stepIds (kept in sync with store)
  const activeStepsRef = useRef<Set<string>>(new Set());

  // Tracks stream.thinking arrived but stream.message not yet
  const isThinkingRef = useRef(false);

  // Subscribe to store slices that drive recomputation
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  const sessionStates = useAppStore((s) => s.sessionStates);

  // Keep activeStepsRef in sync when trace steps change in the store
  useEffect(() => {
    const steps = activeSessionId
      ? (sessionStates[activeSessionId]?.traceSteps ?? [])
      : [];
    const next = new Set<string>();
    for (const step of steps) {
      if (step.status === 'running') {
        next.add(step.id);
      }
    }
    activeStepsRef.current = next;
  }, [activeSessionId, sessionStates]);

  // Listen for IPC events that affect orb state
  useEffect(() => {
    const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;
    if (!isElectron) return;

    // stream.thinking — set thinking flag
    const unsubThinking = window.electronAPI.on((event) => {
      if (event.type === 'stream.thinking') {
        isThinkingRef.current = true;
      }
    });

    // stream.message — clear thinking flag
    const unsubMessage = window.electronAPI.on((event) => {
      if (event.type === 'stream.message') {
        isThinkingRef.current = false;
      }
    });

    // trace.step — add running step to activeSteps
    const unsubTraceStep = window.electronAPI.on((event) => {
      if (event.type === 'trace.step') {
        const { step } = event.payload as { step: TraceStep };
        if (step.status === 'running') {
          activeStepsRef.current.add(step.id);
        }
      }
    });

    // trace.update — remove completed/error steps from activeSteps
    const unsubTraceUpdate = window.electronAPI.on((event) => {
      if (event.type === 'trace.update') {
        const { stepId, updates } = event.payload as {
          stepId: string;
          updates: Partial<TraceStep>;
        };
        if (updates.status === 'completed' || updates.status === 'error') {
          activeStepsRef.current.delete(stepId);
        }
      }
    });

    return () => {
      unsubThinking?.();
      unsubMessage?.();
      unsubTraceStep?.();
      unsubTraceUpdate?.();
    };
  }, []);

  // Re-calculate orb state — priority order determines final state
  const computeOrbState = useCallback((
    tts: TTSStatus,
    thinking: boolean,
    activeSteps: Set<string>,
    steps: TraceStep[],
  ): OrbState => {
    // 1. Error state — any step with error status takes precedence
    if (steps.some((s) => s.status === 'error')) return 'error';

    // 2. TTS states
    if (tts === 'speaking') return 'speaking';
    if (tts === 'loading') return 'transcribing';

    // 3. Thinking stream active
    if (thinking) return 'thinking';

    // 4. Running trace steps — determine tool vs search
    if (activeSteps.size > 0) {
      const sessionId = useAppStore.getState().activeSessionId;
      if (!sessionId) return 'thinking';

      const sessionSteps = useAppStore.getState().sessionStates[sessionId]?.traceSteps ?? [];
      for (const step of sessionSteps) {
        if (step.status === 'running' && activeSteps.has(step.id)) {
          if (step.type === 'tool_call') {
            // Distinguish search vs generic tool by tool name
            const name = step.toolName?.toLowerCase() ?? '';
            if (SEARCH_TOOL_NAMES.has(name) || name.includes('search') || name.includes('web')) {
              return 'search';
            }
            return 'tool';
          }
          // Non-tool_call running step (e.g. 'text', 'thinking')
          return 'tool';
        }
      }
      return 'thinking';
    }

    return 'idle';
  }, []);

  // Compute final orb state on every render where inputs change
  const orbState: OrbState = (() => {
    const steps = activeSessionId
      ? (sessionStates[activeSessionId]?.traceSteps ?? [])
      : [];
    return computeOrbState(ttsStatus, isThinkingRef.current, activeStepsRef.current, steps);
  })();

  return orbState;
}
