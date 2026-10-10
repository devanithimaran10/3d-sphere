import { useGameStore } from '../../store/useGameStore';
import { useMiniGameStore } from '../../store/useMiniGameStore';

/** Resets the mini-game score and starts a fresh session. */
export function beginSession() {
  useMiniGameStore.getState().resetScore();
  useGameStore.getState().startSession();
}
