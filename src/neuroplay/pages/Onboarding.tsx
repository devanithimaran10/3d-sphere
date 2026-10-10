import { useState } from 'react';
import { useNeuroPlayStore } from '../store/useNeuroPlayStore';
import type { UserProfile } from '../types';
import { Disclaimer } from '../components/Disclaimer';
import { Users, UserPlus, ChevronRight } from 'lucide-react';

const AGE_GROUPS: UserProfile['ageGroup'][] = ['18-39', '40-59', '60-74', '75+'];
const GOALS: { id: UserProfile['goal']; label: string; desc: string }[] = [
  { id: 'memory', label: 'Improve Memory', desc: 'Focus on verbal, visual, and episodic memory games' },
  { id: 'attention', label: 'Improve Attention', desc: 'Focus on attention and processing-speed games' },
  { id: 'overall', label: 'Improve Overall Cognition', desc: 'A balanced mix across all cognitive domains' },
];

export function Onboarding() {
  const profiles = useNeuroPlayStore((s) => s.profiles);
  const switchPlayer = useNeuroPlayStore((s) => s.switchPlayer);
  const createPlayerProfile = useNeuroPlayStore((s) => s.createPlayerProfile);
  const seedDemoData = useNeuroPlayStore((s) => s.seedDemoData);

  const existingPlayers = Object.values(profiles);
  const [isCreatingNew, setIsCreatingNew] = useState(existingPlayers.length === 0);

  const [name, setName] = useState('');
  const [ageGroup, setAgeGroup] = useState<UserProfile['ageGroup']>('40-59');
  const [goal, setGoal] = useState<UserProfile['goal']>('overall');

  const handleCreate = () => {
    if (!name.trim()) return;
    createPlayerProfile({ name: name.trim(), ageGroup, goal });
    seedDemoData();
  };

  const handleSelectExisting = (id: string) => {
    switchPlayer(id);
  };

  return (
    <div className="min-h-full flex items-center justify-center p-6 my-auto">
      <div className="np-card max-w-lg w-full p-8 md:p-10 shadow-2xl border border-slate-700/60">
        <p className="text-sm uppercase tracking-widest text-teal-400 font-semibold mb-1">NeuroPlay</p>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-50 mb-2 font-display">
          {existingPlayers.length > 0 && !isCreatingNew ? 'Select Player Profile' : 'Create Player Profile'}
        </h1>
        <p className="text-slate-400 mb-6 text-sm">
          {existingPlayers.length > 0 && !isCreatingNew
            ? 'Choose your saved profile to continue your personal cognitive history, or add a new player.'
            : 'Enter your name to track your cognitive performance, accuracy, and improvement over time.'}
        </p>

        {/* Existing Player Selector */}
        {existingPlayers.length > 0 && !isCreatingNew ? (
          <div className="space-y-4 mb-6">
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {existingPlayers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectExisting(p.id)}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 hover:border-teal-400/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm font-display text-slate-950"
                      style={{ backgroundColor: p.avatarColor || '#2dd4bf' }}
                    >
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-100 group-hover:text-teal-300 transition-colors">{p.name}</p>
                      <p className="text-xs text-slate-400">Goal: <span className="capitalize">{p.goal}</span></p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-500 group-hover:text-teal-400 transition-colors" />
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsCreatingNew(true)}
              className="w-full py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-teal-400 font-semibold text-sm flex items-center justify-center gap-2 border border-slate-700 transition-all"
            >
              <UserPlus size={16} /> Add New Player Profile
            </button>
          </div>
        ) : (
          /* New Player Form */
          <div className="space-y-5 mb-6">
            <label className="block">
              <span className="np-label">Your Name</span>
              <input
                className="np-input mt-1.5"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter player name (e.g. Alex, Sarah)"
                autoFocus
              />
            </label>

            <div>
              <span className="np-label">Age Group</span>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                {AGE_GROUPS.map((g) => (
                  <button
                    key={g}
                    className={`np-choice ${ageGroup === g ? 'np-choice-active' : ''}`}
                    onClick={() => setAgeGroup(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="np-label">Primary Training Goal</span>
              <div className="flex flex-col gap-2 mt-1.5">
                {GOALS.map((g) => (
                  <button
                    key={g.id}
                    className={`np-choice-row ${goal === g.id ? 'np-choice-active' : ''}`}
                    onClick={() => setGoal(g.id)}
                  >
                    <span className="font-semibold text-sm">{g.label}</span>
                    <span className="text-xs text-slate-400">{g.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                className="np-btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!name.trim()}
                onClick={handleCreate}
              >
                Create Player &amp; Start
              </button>

              {existingPlayers.length > 0 && (
                <button
                  onClick={() => setIsCreatingNew(false)}
                  className="py-2.5 text-xs text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1.5"
                >
                  <Users size={14} /> Back to Saved Players
                </button>
              )}
            </div>
          </div>
        )}

        <Disclaimer compact />
      </div>
    </div>
  );
}
