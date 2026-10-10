import { create } from 'zustand';

export interface BurstEffect {
  id: string;
  position: [number, number, number];
  color: string;
  label?: string;
  createdAt: number;
}

interface BurstStore {
  bursts: BurstEffect[];
  triggerBurst: (position: [number, number, number], color: string, label?: string) => void;
  removeBurst: (id: string) => void;
}

export const useBurstStore = create<BurstStore>((set) => ({
  bursts: [],
  triggerBurst: (position, color, label) => {
    const id = Math.random().toString(36).slice(2, 9);
    set((s) => ({
      bursts: [...s.bursts, { id, position, color, label, createdAt: Date.now() }],
    }));

    setTimeout(() => {
      set((s) => ({
        bursts: s.bursts.filter((b) => b.id !== id),
      }));
    }, 1100);
  },
  removeBurst: (id) =>
    set((s) => ({
      bursts: s.bursts.filter((b) => b.id !== id),
    })),
}));
