import { useGameStore } from '../store/useGameStore';
import { MINI_GAME_MODES } from '../types';
import { MenuScreen } from './hud/MenuScreen';
import { PlayingHUD } from './hud/PlayingHUD';
import { ResultsScreen } from './hud/ResultsScreen';
import { MiniGameRouter } from './hud/MiniGameRouter';

export default function HUD() {
  const phase = useGameStore((s) => s.phase);
  const mode  = useGameStore((s) => s.mode);

  if (phase === 'menu')    return <MenuScreen />;
  if (phase === 'playing') {
    if (MINI_GAME_MODES.has(mode)) return <MiniGameRouter />;
    return <PlayingHUD />;
  }
  if (phase === 'results') return <ResultsScreen />;
  return null;
}
