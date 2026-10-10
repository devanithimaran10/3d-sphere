import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameMode, PatientState } from '../types';

export interface SessionRecord {
  id: string;
  mode: GameMode;
  date: string;
  cmci: number | null;
  accuracy: number | null;
  avgReactionMs: number | null;
  miniScore: number | null;
  /** AI-estimated patient state at session end (core modes only). */
  finalPatientState?: PatientState | null;
  /** 0-100 cognitive score, comparable across every game mode. */
  unifiedScore?: number;
}

const MAX_SESSIONS = 100;

interface HistoryStore {
  sessions: SessionRecord[];
  addSession: (r: SessionRecord) => void;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set) => ({
      sessions: [],
      addSession: (r) =>
        set((s) => ({ sessions: [r, ...s.sessions].slice(0, MAX_SESSIONS) })),
      clearHistory: () => set({ sessions: [] }),
    }),
    { name: 'neuro-adapt-history' }
  )
);
