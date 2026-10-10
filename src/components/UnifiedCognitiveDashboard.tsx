import React from 'react';
import { ShieldCheck, BarChart3, Brain, Award, Clock, HelpCircle, Activity } from 'lucide-react';
import { useHistoryStore } from '../store/useHistoryStore';
import { useNeuroPlayStore } from '../neuroplay/store/useNeuroPlayStore';
import { calculateComprehensiveProfile, COGNITIVE_DOMAINS, type CognitiveDomainKey } from '../ai/cognitiveScoringEngine';

export const UnifiedCognitiveDashboard: React.FC = () => {
  const neuroAdaptSessions = useHistoryStore((s) => s.sessions);
  const neuroPlaySessions = useNeuroPlayStore((s) => s.sessions);

  const profile = calculateComprehensiveProfile(neuroAdaptSessions, neuroPlaySessions);

  // Confidence level colors
  const confidenceColorMap = {
    'Limited Data': { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
    'Developing Profile': { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
    'Good Data Coverage': { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400' },
    'High Confidence': { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' },
  };

  const currentConf = confidenceColorMap[profile.confidenceLevel];
  const domainKeys = Object.keys(COGNITIVE_DOMAINS) as CognitiveDomainKey[];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 p-4 md:p-8 animate-fade-in text-slate-100 font-sans">
      {/* Header Banner */}
      <div className="glass-panel p-6 md:p-8 rounded-3xl border-slate-800 shadow-2xl relative overflow-hidden space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-widest">
              <Brain size={16} /> Integrated Cognitive Performance
            </div>
            <h1 className="text-2xl md:text-4xl font-bold font-display text-white tracking-wide">
              Cognitive Profile Analytics
            </h1>
            <p className="text-slate-400 text-sm max-w-xl">
              Standardized performance scores across cognitive-motor, memory, and executive domains derived from your training sessions.
            </p>
          </div>

          {/* Overall Performance Card */}
          <div className="glass p-6 rounded-2xl border-slate-700/60 text-center min-w-[220px] space-y-1 shadow-lg bg-slate-900/90">
            <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400 block">
              Cognitive Training Score
            </span>
            {profile.overallScore !== null ? (
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-black font-display text-white text-glow-sm">
                  {profile.overallScore}
                </span>
                <span className="text-lg font-bold font-mono text-slate-500">/ 100</span>
              </div>
            ) : (
              <span className="text-lg font-bold text-amber-400 block py-2">
                Not Assessed Yet
              </span>
            )}
            <div className="pt-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${currentConf.bg} ${currentConf.border} ${currentConf.text}`}>
                <ShieldCheck size={14} /> {profile.confidenceLevel}
              </span>
            </div>
          </div>
        </div>

        {/* Confidence Explanation Banner */}
        <div className="pt-4 border-t border-slate-800/80 flex items-start gap-3 text-xs text-slate-400">
          <HelpCircle size={16} className="text-cyan-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <span className="font-semibold text-slate-300">Score Reliability Notice:</span> {profile.confidenceExplanation} Unplayed domains are marked as <span className="text-amber-400 font-semibold">Not Assessed Yet</span> and excluded from overall score calculation to ensure scientific integrity.
          </p>
        </div>
      </div>

      {/* Domain Performance Scores Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
            <BarChart3 size={18} className="text-cyan-400" /> Domain Performance Breakdown
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            {profile.assessedDomainsCount} of {profile.totalDomainsCount} Domains Assessed
          </span>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {domainKeys.map((key) => {
            const domainRes = profile.domainScores[key];
            const meta = COGNITIVE_DOMAINS[key];

            return (
              <div
                key={key}
                className="glass-panel p-5 rounded-2xl border-slate-800/80 hover:border-slate-700 transition-all space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xl">{meta.icon}</span>
                    {domainRes.status === 'assessed' ? (
                      <span className="text-2xl font-bold font-mono text-slate-100">
                        {domainRes.score} <span className="text-xs text-slate-500 font-normal">/ 100</span>
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Not Assessed Yet
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-slate-100 pt-1">{meta.label}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{meta.description}</p>
                </div>

                {domainRes.status === 'assessed' && (
                  <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {domainRes.sessionCount} sessions
                    </span>
                    <span className={`capitalize font-semibold ${
                      domainRes.trend === 'improving' ? 'text-emerald-400' :
                      domainRes.trend === 'declining' ? 'text-amber-400' : 'text-slate-400'
                    }`}>
                      {domainRes.trend === 'improving' ? '▲ Improving' :
                       domainRes.trend === 'declining' ? '▼ Declining' : '● Stable'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent History Overview */}
      <div className="glass-panel p-6 rounded-3xl border-slate-800 space-y-4">
        <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
          <Activity size={18} className="text-purple-400" /> Recent Training History ({profile.totalCompletedSessions} Total Sessions)
        </h2>

        {profile.totalCompletedSessions === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm bg-slate-900/40 rounded-2xl border border-slate-800/60">
            No training sessions completed yet. Select a game from NeuroAdapt or NeuroPlay to start building your cognitive profile!
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {[...neuroAdaptSessions, ...neuroPlaySessions]
              .sort((a, b) => new Date((b as any).date).getTime() - new Date((a as any).date).getTime())
              .slice(0, 8)
              .map((sess: any) => (
                <div
                  key={sess.id}
                  className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <Award size={16} className="text-cyan-400" />
                    <div>
                      <p className="font-semibold text-slate-200 capitalize">
                        {(sess.mode || sess.gameId || 'Game').replace('-', ' ')}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(sess.date).toLocaleDateString()} at {new Date(sess.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold font-mono text-cyan-300 text-sm">
                      {sess.unifiedScore ?? sess.score ?? sess.cmci ?? 'N/A'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono block">pts</span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};
