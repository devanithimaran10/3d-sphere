import { useState } from 'react';
import { useNeuroPlayStore } from '../store/useNeuroPlayStore';
import { Disclaimer } from '../components/Disclaimer';
import type { UserProfile } from '../types';
import { Users, UserCheck } from 'lucide-react';

const GOALS: { id: UserProfile['goal']; label: string }[] = [
  { id: 'memory', label: 'Improve Memory' },
  { id: 'attention', label: 'Improve Attention' },
  { id: 'overall', label: 'Improve Overall Cognition' },
];

export function Settings() {
  const profile = useNeuroPlayStore((s) => s.profile);
  const setProfile = useNeuroPlayStore((s) => s.setProfile);
  const clearAllData = useNeuroPlayStore((s) => s.clearAllData);
  const clearActivePlayerData = useNeuroPlayStore((s) => s.clearActivePlayerData);
  const seedDemoData = useNeuroPlayStore((s) => s.seedDemoData);
  const navigate = useNeuroPlayStore((s) => s.navigate);

  const [confirmClearActive, setConfirmClearActive] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  if (!profile) return null;

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto w-full space-y-6 animate-fade-in text-slate-100">
      <h1 className="text-3xl font-bold text-slate-50 mb-2 font-display">Settings</h1>

      {/* Active Player Profile Settings */}
      <section className="np-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="np-section-title">Active Player Profile</p>
          <button
            onClick={() => navigate('players')}
            className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1.5"
          >
            <Users size={14} /> Switch / Add Players
          </button>
        </div>

        <label className="block">
          <span className="np-label">Player Name</span>
          <input
            className="np-input mt-1.5"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
          />
        </label>

        <div>
          <span className="np-label">Training Goal</span>
          <div className="flex flex-col gap-2 mt-2">
            {GOALS.map((g) => (
              <button
                key={g.id}
                className={`np-choice-row ${profile.goal === g.id ? 'np-choice-active' : ''}`}
                onClick={() => setProfile({ ...profile, goal: g.id })}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-semibold">{g.label}</span>
                  {profile.goal === g.id && <UserCheck size={16} className="text-teal-400" />}
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Data Management Section */}
      <section className="np-card p-6 space-y-4">
        <p className="np-section-title">Storage &amp; Session History</p>
        <p className="text-sm text-slate-400 leading-relaxed">
          All performance metrics, scores, and cognitive training histories are saved in your local browser storage per player profile.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button className="np-btn-secondary" onClick={seedDemoData}>
            Add Demo Sessions
          </button>

          {!confirmClearActive ? (
            <button className="np-btn-secondary" onClick={() => setConfirmClearActive(true)}>
              Reset {profile.name}&apos;s History
            </button>
          ) : (
            <button
              className="np-btn-danger"
              onClick={() => {
                clearActivePlayerData();
                setConfirmClearActive(false);
              }}
            >
              Confirm: Erase {profile.name}&apos;s Sessions
            </button>
          )}

          {!confirmClearAll ? (
            <button
              className="text-xs text-slate-500 hover:text-red-400 py-2 px-3 self-center transition-colors"
              onClick={() => setConfirmClearAll(true)}
            >
              Reset All Players
            </button>
          ) : (
            <button
              className="np-btn-danger text-xs"
              onClick={() => {
                clearAllData();
                setConfirmClearAll(false);
              }}
            >
              Confirm: Delete Everything
            </button>
          )}
        </div>
      </section>

      <section className="np-card p-6">
        <p className="np-section-title mb-3">About the Adaptive Engine</p>
        <p className="text-sm text-slate-400 leading-relaxed">
          NeuroPlay uses the <strong className="text-slate-200">Adaptive Engine</strong> to evaluate rolling accuracy, reaction times, and cognitive consistency per player profile, personalizing challenge level to each participant.
        </p>
      </section>

      <section className="np-card p-6">
        <p className="np-section-title mb-3">About &amp; Disclaimer</p>
        <Disclaimer />
      </section>
    </div>
  );
}
