import { useState } from 'react';
import { UserPlus, Users, Trash2, Check, Award, Calendar, Activity, ChevronRight } from 'lucide-react';
import { useNeuroPlayStore } from '../store/useNeuroPlayStore';
import type { UserProfile } from '../types';

const AGE_GROUPS: UserProfile['ageGroup'][] = ['18-39', '40-59', '60-74', '75+'];
const GOALS: { id: UserProfile['goal']; label: string; desc: string }[] = [
  { id: 'memory', label: 'Improve Memory', desc: 'Focus on verbal, visual, and episodic memory' },
  { id: 'attention', label: 'Improve Attention', desc: 'Focus on attention & speed' },
  { id: 'overall', label: 'Improve Overall Cognition', desc: 'Balanced cognitive training' },
];

export function PlayersPage() {
  const profiles = useNeuroPlayStore((s) => s.profiles);
  const activeUserId = useNeuroPlayStore((s) => s.activeUserId);
  const sessionsByUser = useNeuroPlayStore((s) => s.sessionsByUser);
  const createPlayerProfile = useNeuroPlayStore((s) => s.createPlayerProfile);
  const switchPlayer = useNeuroPlayStore((s) => s.switchPlayer);
  const deletePlayer = useNeuroPlayStore((s) => s.deletePlayer);

  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [ageGroup, setAgeGroup] = useState<UserProfile['ageGroup']>('40-59');
  const [goal, setGoal] = useState<UserProfile['goal']>('overall');

  const playerList = Object.values(profiles);

  const handleAddPlayer = () => {
    if (!name.trim()) return;
    createPlayerProfile({ name: name.trim(), ageGroup, goal });
    setName('');
    setShowAddModal(false);
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto w-full space-y-8 animate-fade-in text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-50 flex items-center gap-3 font-display">
            <Users className="text-teal-400" /> Players &amp; Profiles
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage player profiles, track individual training histories, and switch between participants.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="np-btn-primary flex items-center gap-2"
        >
          <UserPlus size={18} /> Add New Player
        </button>
      </div>

      {/* Players Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {playerList.map((player) => {
          const isActive = player.id === activeUserId;
          const userSessions = sessionsByUser[player.id] ?? [];
          const sessionCount = userSessions.length;
          const avgScore = sessionCount > 0
            ? Math.round(userSessions.reduce((acc, s) => acc + (s.score || 0), 0) / sessionCount)
            : null;

          const avatarColor = player.avatarColor || '#2dd4bf';

          return (
            <div
              key={player.id}
              className={`np-card p-6 relative transition-all border ${
                isActive ? 'border-teal-400/60 bg-slate-900/90 shadow-lg shadow-teal-500/10' : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {isActive && (
                <span className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-500/10 text-teal-400 border border-teal-500/30 flex items-center gap-1">
                  <Check size={12} /> Active Player
                </span>
              )}

              <div className="flex items-start gap-4 mb-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold font-display shadow-md shrink-0"
                  style={{ backgroundColor: `${avatarColor}20`, color: avatarColor, border: `1px solid ${avatarColor}40` }}
                >
                  {player.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-slate-100 truncate">{player.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Age: <span className="text-slate-200">{player.ageGroup}</span> • Goal: <span className="text-slate-200 capitalize">{player.goal}</span>
                  </p>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                    <Calendar size={12} /> Joined {new Date(player.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Player Quick Stats */}
              <div className="grid grid-cols-2 gap-3 py-3 my-3 border-y border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-teal-400" />
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Sessions</span>
                    <span className="font-mono font-bold text-slate-200">{sessionCount} completed</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Award size={16} className="text-amber-400" />
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Avg Score</span>
                    <span className="font-mono font-bold text-slate-200">
                      {avgScore !== null ? `${avgScore} / 100` : 'Not Assessed'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                {!isActive ? (
                  <button
                    onClick={() => switchPlayer(player.id)}
                    className="np-btn-secondary py-2 px-4 text-xs font-semibold flex items-center gap-1.5"
                  >
                    Switch to {player.name} <ChevronRight size={14} />
                  </button>
                ) : (
                  <span className="text-xs text-teal-400 font-semibold flex items-center gap-1">
                    Currently Training
                  </span>
                )}

                {playerList.length > 1 && (
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete profile for ${player.name} and all associated history?`)) {
                        deletePlayer(player.id);
                      }
                    }}
                    className="text-slate-600 hover:text-red-400 p-2 rounded-lg transition-colors"
                    title="Delete Player"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Player Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel max-w-lg w-full p-8 space-y-6 rounded-3xl border border-slate-700/60 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
                <UserPlus className="text-teal-400" /> Add New Player Profile
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="np-label">Player Name</span>
                <input
                  className="np-input mt-1.5"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex, Sarah, David..."
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
                <span className="np-label">Training Goal</span>
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
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleAddPlayer}
                disabled={!name.trim()}
                className="flex-1 np-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Player &amp; Start
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="np-btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
