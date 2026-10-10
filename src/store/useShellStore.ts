import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ActiveApp = 'neuro-adapt' | 'neuroplay';

interface ShellStore {
  activeApp: ActiveApp;
  setActiveApp: (app: ActiveApp) => void;
}

export const useShellStore = create<ShellStore>()(
  persist(
    (set) => ({
      activeApp: 'neuro-adapt',
      setActiveApp: (activeApp) => set({ activeApp }),
    }),
    { name: 'app-shell' },
  ),
);
