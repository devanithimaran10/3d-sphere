import { useState, useRef, useEffect } from 'react';
import { LayoutDashboard, Gamepad2, TrendingUp, Brain, History, Settings, ArrowLeft, Users, UserCheck, UserPlus, ChevronDown } from 'lucide-react';
import { useNeuroPlayStore, type NavPage } from '../store/useNeuroPlayStore';

const ITEMS: { id: NavPage; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'games', label: 'Games', icon: Gamepad2 },
  { id: 'progress', label: 'Progress', icon: TrendingUp },
  { id: 'cognitive-profile', label: 'Cognitive Profile', icon: Brain },
  { id: 'history', label: 'History', icon: History },
  { id: 'players', label: 'Players', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function NavBar({ onExit }: { onExit: () => void }) {
  const page = useNeuroPlayStore((s) => s.page);
  const navigate = useNeuroPlayStore((s) => s.navigate);
  const profile = useNeuroPlayStore((s) => s.profile);
  const profiles = useNeuroPlayStore((s) => s.profiles);
  const activeUserId = useNeuroPlayStore((s) => s.activeUserId);
  const switchPlayer = useNeuroPlayStore((s) => s.switchPlayer);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const playerList = Object.values(profiles);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const avatarColor = profile?.avatarColor || '#2dd4bf';

  return (
    <nav className="np-navbar">
      <div className="flex items-center gap-3">
        <button className="np-exit-btn" onClick={onExit} aria-label="Exit NeuroPlay">
          <ArrowLeft size={18} />
        </button>
        <span className="font-bold text-lg text-slate-50 tracking-tight font-display">NeuroPlay</span>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        {ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`np-nav-item ${page === id ? 'np-nav-item-active' : ''}`}
            onClick={() => navigate(id)}
          >
            <Icon size={16} />
            <span className="hidden md:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Active Player Dropdown Switcher */}
      {profile && (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition-all text-xs text-slate-200"
          >
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] text-slate-950 font-mono"
              style={{ backgroundColor: avatarColor }}
            >
              {profile.name.slice(0, 2).toUpperCase()}
            </span>
            <span className="font-semibold max-w-[90px] truncate">{profile.name}</span>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {/* Switcher Dropdown Modal */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 glass-panel p-3 shadow-2xl border border-slate-700 rounded-2xl z-50 animate-fade-down space-y-2">
              <div className="px-2 py-1 border-b border-slate-800 text-[10px] uppercase tracking-widest text-slate-400 font-mono flex items-center justify-between">
                <span>Switch Player</span>
                <span className="text-teal-400">{playerList.length} total</span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1 py-1">
                {playerList.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      switchPlayer(p.id);
                      setDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors ${
                      p.id === activeUserId
                        ? 'bg-teal-500/15 text-teal-300 font-semibold border border-teal-500/30'
                        : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] text-slate-950 font-mono shrink-0"
                        style={{ backgroundColor: p.avatarColor || '#2dd4bf' }}
                      >
                        {p.name.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="truncate">{p.name}</span>
                    </div>
                    {p.id === activeUserId && <UserCheck size={14} className="text-teal-400 shrink-0" />}
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-800 flex flex-col gap-1">
                <button
                  onClick={() => {
                    navigate('players');
                    setDropdownOpen(false);
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <UserPlus size={14} /> Add / Manage Players
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
