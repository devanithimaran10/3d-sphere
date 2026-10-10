import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SessionState =
  | 'NOT_STARTED'
  | 'ACTIVE'
  | 'PAUSED'
  | 'BACKGROUND'
  | 'RECOVERABLE'
  | 'COMPLETED'
  | 'ABANDONED';

export interface ActiveSessionDraft {
  sessionId: string;
  gameId: string;
  suite: 'neuro-adapt' | 'neuroplay';
  state: SessionState;
  startTimeMs: number;
  lastActiveTimestampMs: number;
  accumulatedPauseMs: number;
  pauseStartedAtMs: number | null;
  targetDurationSeconds: number;
  completedTrialsCount: number;
  rawScore: number;
  gameData: Record<string, any>;
  lastSavedAt: number;
}

interface SessionLifecycleStore {
  activeSession: ActiveSessionDraft | null;
  recoverableSession: ActiveSessionDraft | null;
  
  // Actions
  initSession: (params: {
    gameId: string;
    suite: 'neuro-adapt' | 'neuroplay';
    durationSeconds?: number;
    initialData?: Record<string, any>;
  }) => ActiveSessionDraft;
  
  pauseSession: (reason?: 'user' | 'background') => void;
  resumeSession: () => void;
  updateSessionProgress: (data: {
    rawScore?: number;
    completedTrialsCount?: number;
    gameData?: Record<string, any>;
  }) => void;
  
  completeSession: () => ActiveSessionDraft | null;
  abandonSession: () => void;
  
  checkRecoverableSession: () => ActiveSessionDraft | null;
  restoreSession: () => ActiveSessionDraft | null;
  dismissRecovery: () => void;
  
  calculateElapsedTimeMs: () => number;
}

const STORAGE_KEY = 'neuro_session_recovery_draft';
const STALE_SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

function safeStorageGet(): ActiveSessionDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.sessionId === 'string') return parsed;
  } catch (e) {
    console.warn('[SessionLifecycle] Failed to read recovery storage:', e);
  }
  return null;
}

function safeStorageSet(draft: ActiveSessionDraft | null) {
  try {
    if (draft === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    }
  } catch (e) {
    console.warn('[SessionLifecycle] Failed to save recovery storage:', e);
  }
}

export const useSessionLifecycle = create<SessionLifecycleStore>()(
  persist(
    (set, get) => ({
      activeSession: null,
      recoverableSession: null,

      initSession: ({ gameId, suite, durationSeconds = 90, initialData = {} }) => {
        const now = Date.now();
        const draft: ActiveSessionDraft = {
          sessionId: `sess_${now}_${Math.random().toString(36).slice(2, 9)}`,
          gameId,
          suite,
          state: 'ACTIVE',
          startTimeMs: now,
          lastActiveTimestampMs: now,
          accumulatedPauseMs: 0,
          pauseStartedAtMs: null,
          targetDurationSeconds: durationSeconds,
          completedTrialsCount: 0,
          rawScore: 0,
          gameData: initialData,
          lastSavedAt: now,
        };

        set({ activeSession: draft, recoverableSession: null });
        safeStorageSet(draft);
        return draft;
      },

      pauseSession: (reason = 'user') => {
        const { activeSession } = get();
        if (!activeSession || activeSession.state === 'COMPLETED' || activeSession.state === 'PAUSED') return;

        const now = Date.now();
        const newState: SessionState = reason === 'background' ? 'BACKGROUND' : 'PAUSED';
        const updated: ActiveSessionDraft = {
          ...activeSession,
          state: newState,
          pauseStartedAtMs: activeSession.pauseStartedAtMs ?? now,
          lastActiveTimestampMs: now,
          lastSavedAt: now,
        };

        set({ activeSession: updated });
        safeStorageSet(updated);
      },

      resumeSession: () => {
        const { activeSession } = get();
        if (!activeSession || (activeSession.state !== 'PAUSED' && activeSession.state !== 'BACKGROUND')) return;

        const now = Date.now();
        const pauseDuration = activeSession.pauseStartedAtMs ? now - activeSession.pauseStartedAtMs : 0;
        const updated: ActiveSessionDraft = {
          ...activeSession,
          state: 'ACTIVE',
          accumulatedPauseMs: activeSession.accumulatedPauseMs + pauseDuration,
          pauseStartedAtMs: null,
          lastActiveTimestampMs: now,
          lastSavedAt: now,
        };

        set({ activeSession: updated });
        safeStorageSet(updated);
      },

      updateSessionProgress: ({ rawScore, completedTrialsCount, gameData }) => {
        const { activeSession } = get();
        if (!activeSession || activeSession.state === 'COMPLETED') return;

        const now = Date.now();
        const updated: ActiveSessionDraft = {
          ...activeSession,
          rawScore: rawScore !== undefined ? Math.max(0, rawScore) : activeSession.rawScore,
          completedTrialsCount: completedTrialsCount !== undefined ? Math.max(0, completedTrialsCount) : activeSession.completedTrialsCount,
          gameData: gameData ? { ...activeSession.gameData, ...gameData } : activeSession.gameData,
          lastActiveTimestampMs: now,
          lastSavedAt: now,
        };

        set({ activeSession: updated });
        if (now - activeSession.lastSavedAt > 1000) {
          safeStorageSet(updated);
        }
      },

      completeSession: () => {
        const { activeSession } = get();
        if (!activeSession) return null;

        const now = Date.now();
        const completed: ActiveSessionDraft = {
          ...activeSession,
          state: 'COMPLETED',
          lastActiveTimestampMs: now,
          lastSavedAt: now,
        };

        set({ activeSession: null, recoverableSession: null });
        safeStorageSet(null);
        return completed;
      },

      abandonSession: () => {
        set({ activeSession: null, recoverableSession: null });
        safeStorageSet(null);
      },

      checkRecoverableSession: () => {
        const draft = safeStorageGet();
        if (!draft) return null;

        const now = Date.now();
        const isStale = now - draft.lastActiveTimestampMs > STALE_SESSION_TIMEOUT_MS;

        if (isStale || draft.state === 'COMPLETED') {
          safeStorageSet(null);
          return null;
        }

        const recoverable: ActiveSessionDraft = {
          ...draft,
          state: 'RECOVERABLE',
        };

        set({ recoverableSession: recoverable });
        return recoverable;
      },

      restoreSession: () => {
        const { recoverableSession } = get();
        if (!recoverableSession) return null;

        const now = Date.now();
        const restored: ActiveSessionDraft = {
          ...recoverableSession,
          state: 'PAUSED',
          pauseStartedAtMs: now,
          lastActiveTimestampMs: now,
          lastSavedAt: now,
        };

        set({ activeSession: restored, recoverableSession: null });
        safeStorageSet(restored);
        return restored;
      },

      dismissRecovery: () => {
        set({ recoverableSession: null });
        safeStorageSet(null);
      },

      calculateElapsedTimeMs: () => {
        const { activeSession } = get();
        if (!activeSession) return 0;

        const now = Date.now();
        let totalElapsed = now - activeSession.startTimeMs - activeSession.accumulatedPauseMs;

        if (activeSession.pauseStartedAtMs) {
          totalElapsed -= (now - activeSession.pauseStartedAtMs);
        }

        return Math.max(0, totalElapsed);
      },
    }),
    { name: 'neuro-session-lifecycle' }
  )
);
