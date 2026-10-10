import { useEffect } from 'react';
import { useNeuroPlayStore } from './store/useNeuroPlayStore';
import { Onboarding } from './pages/Onboarding';
import { Dashboard } from './pages/Dashboard';
import { GamesHub } from './pages/GamesHub';
import { Progress } from './pages/Progress';
import { CognitiveProfilePage } from './pages/CognitiveProfilePage';
import { History } from './pages/History';
import { PlayersPage } from './pages/PlayersPage';
import { Settings } from './pages/Settings';
import { NavBar } from './components/NavBar';
import { TrainingSessionSummary } from './components/TrainingSessionSummary';
import { WordRecall } from './games/WordRecall';
import { PatternRecall } from './games/PatternRecall';
import { SceneMemory } from './games/SceneMemory';
import { FocusFinder } from './games/FocusFinder';
import { SequenceMaster } from './games/SequenceMaster';
import { RuleSwitch } from './games/RuleSwitch';
import { QuickResponse } from './games/QuickResponse';
import type { GameId } from './types';

const GAME_COMPONENTS: Record<GameId, React.ComponentType> = {
  'word-recall': WordRecall,
  'pattern-recall': PatternRecall,
  'scene-memory': SceneMemory,
  'focus-finder': FocusFinder,
  'sequence-master': SequenceMaster,
  'rule-switch': RuleSwitch,
  'quick-response': QuickResponse,
};

const PAGES: Record<string, React.ComponentType> = {
  dashboard: Dashboard,
  games: GamesHub,
  progress: Progress,
  'cognitive-profile': CognitiveProfilePage,
  history: History,
  players: PlayersPage,
  settings: Settings,
};

export function NeuroPlayApp({ onExit }: { onExit: () => void }) {
  const profile = useNeuroPlayStore((s) => s.profile);
  const page = useNeuroPlayStore((s) => s.page);
  const activeGame = useNeuroPlayStore((s) => s.activeGame);
  const trainingQueue = useNeuroPlayStore((s) => s.trainingQueue);
  const seedDemoData = useNeuroPlayStore((s) => s.seedDemoData);

  useEffect(() => { if (profile) seedDemoData(); }, [profile, seedDemoData]);

  if (!profile) {
    return (
      <div className="neuroplay fixed inset-0 w-full h-full overflow-y-auto overflow-x-hidden flex flex-col z-20">
        <Onboarding />
      </div>
    );
  }

  const trainingFinished = trainingQueue !== null && activeGame === null;
  const GameComponent = activeGame ? GAME_COMPONENTS[activeGame] : null;
  const PageComponent = PAGES[page] ?? Dashboard;

  return (
    <div className="neuroplay fixed inset-0 w-full h-full overflow-y-auto overflow-x-hidden flex flex-col z-20">
      <NavBar onExit={onExit} />
      <main className="flex-1 w-full pb-16">
        {trainingFinished ? (
          <TrainingSessionSummary />
        ) : GameComponent ? (
          <GameComponent />
        ) : (
          <PageComponent />
        )}
      </main>
    </div>
  );
}
