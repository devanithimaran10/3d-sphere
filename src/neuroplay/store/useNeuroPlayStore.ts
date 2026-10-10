import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DifficultyLevel, GameId, GameSessionResult, UserProfile } from '../types';
import { generateDemoSessions } from '../engine/demoData';

export type NavPage = 'dashboard' | 'games' | 'progress' | 'cognitive-profile' | 'history' | 'players' | 'settings';

const DEFAULT_DIFFICULTY: Record<GameId, DifficultyLevel> = {
  'word-recall': 1, 'pattern-recall': 1, 'scene-memory': 1, 'focus-finder': 1,
  'sequence-master': 1, 'rule-switch': 1, 'quick-response': 1,
};

const AVATAR_COLORS = ['#2dd4bf', '#38bdf8', '#818cf8', '#a855f7', '#f43f5e', '#fb923c', '#4ade80'];

function getRandomAvatarColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

interface NeuroPlayStore {
  // Multi-user state
  profiles: Record<string, UserProfile>;
  activeUserId: string | null;
  sessionsByUser: Record<string, GameSessionResult[]>;
  difficultyByUser: Record<string, Record<GameId, DifficultyLevel>>;

  // Active user getters/state
  profile: UserProfile | null;
  sessions: GameSessionResult[];
  difficultyByGame: Record<GameId, DifficultyLevel>;

  page: NavPage;
  activeGame: GameId | null;
  demoSeeded: boolean;

  trainingQueue: GameId[] | null;
  trainingIndex: number;
  trainingSessionIds: string[];

  // Actions
  createPlayerProfile: (params: { name: string; ageGroup?: UserProfile['ageGroup']; goal?: UserProfile['goal'] }) => UserProfile;
  switchPlayer: (userId: string) => void;
  deletePlayer: (userId: string) => void;
  setProfile: (p: UserProfile) => void;
  navigate: (page: NavPage) => void;
  openGame: (id: GameId) => void;
  closeGame: () => void;
  addGameSession: (s: GameSessionResult) => void;
  seedDemoData: () => void;
  clearAllData: () => void;
  clearActivePlayerData: () => void;

  startTrainingSession: (games: GameId[]) => void;
  advanceTrainingSession: () => void;
  endTrainingSession: () => void;
}

const MAX_SESSIONS = 200;

export const useNeuroPlayStore = create<NeuroPlayStore>()(
  persist(
    (set, get) => ({
      profiles: {},
      activeUserId: null,
      sessionsByUser: {},
      difficultyByUser: {},

      profile: null,
      sessions: [],
      difficultyByGame: { ...DEFAULT_DIFFICULTY },
      page: 'dashboard',
      activeGame: null,
      demoSeeded: false,

      trainingQueue: null,
      trainingIndex: 0,
      trainingSessionIds: [],

      createPlayerProfile: ({ name, ageGroup = '40-59', goal = 'overall' }) => {
        const now = new Date().toISOString();
        const id = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const newProfile: UserProfile = {
          id,
          name: name.trim() || 'Guest',
          ageGroup,
          goal,
          createdAt: now,
          lastActiveAt: now,
          avatarColor: getRandomAvatarColor(),
        };

        const profiles = { ...get().profiles, [id]: newProfile };
        const sessionsByUser = { ...get().sessionsByUser, [id]: [] };
        const difficultyByUser = { ...get().difficultyByUser, [id]: { ...DEFAULT_DIFFICULTY } };

        set({
          profiles,
          activeUserId: id,
          profile: newProfile,
          sessionsByUser,
          difficultyByUser,
          sessions: [],
          difficultyByGame: { ...DEFAULT_DIFFICULTY },
          page: 'dashboard',
        });

        return newProfile;
      },

      switchPlayer: (userId) => {
        const { profiles, sessionsByUser, difficultyByUser } = get();
        const targetProfile = profiles[userId];
        if (!targetProfile) return;

        const updatedProfile = { ...targetProfile, lastActiveAt: new Date().toISOString() };
        const updatedProfiles = { ...profiles, [userId]: updatedProfile };

        const targetSessions = sessionsByUser[userId] ?? [];
        const targetDifficulty = difficultyByUser[userId] ?? { ...DEFAULT_DIFFICULTY };

        set({
          profiles: updatedProfiles,
          activeUserId: userId,
          profile: updatedProfile,
          sessions: targetSessions,
          difficultyByGame: targetDifficulty,
          activeGame: null,
          trainingQueue: null,
          trainingIndex: 0,
          trainingSessionIds: [],
          page: 'dashboard',
        });
      },

      deletePlayer: (userId) => {
        const { profiles, activeUserId, sessionsByUser, difficultyByUser } = get();
        const nextProfiles = { ...profiles };
        delete nextProfiles[userId];

        const nextSessionsByUser = { ...sessionsByUser };
        delete nextSessionsByUser[userId];

        const nextDifficultyByUser = { ...difficultyByUser };
        delete nextDifficultyByUser[userId];

        const remainingIds = Object.keys(nextProfiles);
        const nextActiveId = activeUserId === userId ? (remainingIds[0] ?? null) : activeUserId;
        const nextProfile = nextActiveId ? nextProfiles[nextActiveId] : null;
        const nextSessions = nextActiveId ? (nextSessionsByUser[nextActiveId] ?? []) : [];
        const nextDifficulty = nextActiveId ? (nextDifficultyByUser[nextActiveId] ?? { ...DEFAULT_DIFFICULTY }) : { ...DEFAULT_DIFFICULTY };

        set({
          profiles: nextProfiles,
          activeUserId: nextActiveId,
          profile: nextProfile,
          sessionsByUser: nextSessionsByUser,
          difficultyByUser: nextDifficultyByUser,
          sessions: nextSessions,
          difficultyByGame: nextDifficulty,
          page: nextProfile ? 'dashboard' : 'dashboard',
        });
      },

      setProfile: (profile) => {
        const { activeUserId } = get();
        const id = profile.id || activeUserId || `usr_${Date.now()}`;
        const updatedProfile: UserProfile = {
          ...profile,
          id,
          lastActiveAt: new Date().toISOString(),
          avatarColor: profile.avatarColor || getRandomAvatarColor(),
        };

        set((s) => ({
          profile: updatedProfile,
          activeUserId: id,
          profiles: { ...s.profiles, [id]: updatedProfile },
        }));
      },

      navigate: (page) => set({ page, activeGame: null, trainingQueue: null, trainingIndex: 0, trainingSessionIds: [] }),
      openGame: (id) => set({ activeGame: id }),
      closeGame: () => set({ activeGame: null, trainingQueue: null, trainingIndex: 0, trainingSessionIds: [] }),

      addGameSession: (session) => {
        const { activeUserId, sessionsByUser, difficultyByUser } = get();
        const uid = activeUserId || 'default_user';

        const currentSessions = sessionsByUser[uid] ?? get().sessions;
        const currentDifficulty = difficultyByUser[uid] ?? get().difficultyByGame;

        const updatedSessions = [session, ...currentSessions].slice(0, MAX_SESSIONS);
        const updatedDifficulty = { ...currentDifficulty, [session.gameId]: session.difficultyEnd };

        set((s) => ({
          sessions: updatedSessions,
          difficultyByGame: updatedDifficulty,
          sessionsByUser: { ...s.sessionsByUser, [uid]: updatedSessions },
          difficultyByUser: { ...s.difficultyByUser, [uid]: updatedDifficulty },
          trainingSessionIds: s.trainingQueue ? [...s.trainingSessionIds, session.id] : s.trainingSessionIds,
        }));
      },

      seedDemoData: () => {
        const { demoSeeded, sessions, activeUserId } = get();
        if (demoSeeded || sessions.length > 0) return;
        const demo = generateDemoSessions();
        const uid = activeUserId || 'default_user';

        set((s) => ({
          sessions: demo,
          demoSeeded: true,
          sessionsByUser: { ...s.sessionsByUser, [uid]: demo },
        }));
      },

      clearAllData: () => set({
        profiles: {},
        activeUserId: null,
        profile: null,
        sessions: [],
        sessionsByUser: {},
        difficultyByUser: {},
        difficultyByGame: { ...DEFAULT_DIFFICULTY },
        demoSeeded: false,
      }),

      clearActivePlayerData: () => {
        const { activeUserId } = get();
        if (!activeUserId) return;

        set((s) => ({
          sessions: [],
          difficultyByGame: { ...DEFAULT_DIFFICULTY },
          sessionsByUser: { ...s.sessionsByUser, [activeUserId]: [] },
          difficultyByUser: { ...s.difficultyByUser, [activeUserId]: { ...DEFAULT_DIFFICULTY } },
          demoSeeded: false,
        }));
      },

      startTrainingSession: (games) => set({
        trainingQueue: games, trainingIndex: 0, trainingSessionIds: [], activeGame: games[0] ?? null,
      }),

      advanceTrainingSession: () => {
        const { trainingQueue, trainingIndex } = get();
        if (!trainingQueue) return;
        const next = trainingIndex + 1;
        if (next < trainingQueue.length) {
          set({ trainingIndex: next, activeGame: trainingQueue[next] });
        } else {
          set({ activeGame: null });
        }
      },

      endTrainingSession: () => set({
        trainingQueue: null, trainingIndex: 0, trainingSessionIds: [], activeGame: null,
      }),
    }),
    {
      name: 'neuroplay-store',
      migrate: (persistedState: any) => {
        if (!persistedState) return persistedState;
        if (persistedState.profile && !persistedState.profiles) {
          const profile = persistedState.profile;
          const uid = profile.id || `usr_migrated_${Date.now()}`;
          profile.id = uid;
          return {
            ...persistedState,
            profiles: { [uid]: profile },
            activeUserId: uid,
            sessionsByUser: { [uid]: persistedState.sessions || [] },
            difficultyByUser: { [uid]: persistedState.difficultyByGame || { ...DEFAULT_DIFFICULTY } },
          };
        }
        return persistedState;
      },
    },
  ),
);
