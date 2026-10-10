import React from 'react';
import { Printer, Download, ShieldCheck, FileText } from 'lucide-react';
import { useNeuroPlayStore } from '../store/useNeuroPlayStore';
import { calculateComprehensiveProfile, COGNITIVE_DOMAINS, type CognitiveDomainKey } from '../../ai/cognitiveScoringEngine';
import { useHistoryStore } from '../../store/useHistoryStore';

interface ClinicalReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ClinicalReportModal: React.FC<ClinicalReportModalProps> = ({ isOpen, onClose }) => {
  const profile = useNeuroPlayStore((s) => s.profile);
  const userSessions = useNeuroPlayStore((s) => s.sessions);
  const neuroAdaptSessions = useHistoryStore((s) => s.sessions);

  if (!isOpen || !profile) return null;

  const compProfile = calculateComprehensiveProfile(neuroAdaptSessions, userSessions);
  const domainKeys = Object.keys(COGNITIVE_DOMAINS) as CognitiveDomainKey[];

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const headers = ['Date', 'Game', 'Cognitive Domain', 'Score (0-100)', 'Accuracy (%)', 'Reaction Time (ms)', 'Difficulty Level'];
    const rows = userSessions.map((s) => [
      s.date,
      s.gameId,
      s.domain,
      s.score ?? '',
      s.accuracy ?? '',
      s.avgReactionMs ?? '',
      s.difficultyEnd ?? '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cct-cognitive-report-${profile.name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-10 space-y-6 rounded-3xl border border-slate-700/60 shadow-2xl text-slate-100 print:bg-white print:text-black print:p-0 print:border-0 print:shadow-none">
        {/* Top Action Bar (Hidden on print) */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 print:hidden">
          <div className="flex items-center gap-2 text-teal-400 text-xs uppercase font-mono tracking-widest">
            <FileText size={16} /> Clinical CCT Training Report
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 border border-slate-700 transition-all"
            >
              <Download size={14} /> Export CSV
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-xs font-bold text-slate-950 flex items-center gap-1.5 transition-all shadow-md"
            >
              <Printer size={14} /> Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-lg font-bold ml-2"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Report Header */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800/80 pb-4">
            <div>
              <h1 className="text-2xl font-bold font-display text-white print:text-black">
                Cognitive Performance Summary
              </h1>
              <p className="text-xs text-slate-400 font-mono print:text-gray-600">
                Computerised Cognitive Training (CCT) Progress Assessment
              </p>
            </div>
            <div className="text-right text-xs text-slate-400 font-mono print:text-gray-600">
              <p>Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              <p>Profile ID: <span className="font-bold text-slate-300 print:text-black">{profile.id}</span></p>
            </div>
          </div>

          {/* Participant Information Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs print:bg-gray-100 print:border-gray-300">
            <div>
              <span className="text-slate-500 print:text-gray-600 block text-[10px] uppercase font-mono">Participant</span>
              <span className="font-bold text-sm text-slate-100 print:text-black">{profile.name}</span>
            </div>
            <div>
              <span className="text-slate-500 print:text-gray-600 block text-[10px] uppercase font-mono">Age Group</span>
              <span className="font-bold text-sm text-slate-100 print:text-black">{profile.ageGroup}</span>
            </div>
            <div>
              <span className="text-slate-500 print:text-gray-600 block text-[10px] uppercase font-mono">Training Goal</span>
              <span className="font-bold text-sm text-slate-100 print:text-black capitalize">{profile.goal}</span>
            </div>
            <div>
              <span className="text-slate-500 print:text-gray-600 block text-[10px] uppercase font-mono">Total Sessions</span>
              <span className="font-bold text-sm text-teal-400 print:text-teal-700">{userSessions.length} recorded</span>
            </div>
          </div>
        </div>

        {/* Primary Standardized Overall Score */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 print:bg-white print:border-gray-300">
          <div>
            <span className="text-[11px] uppercase font-mono tracking-wider text-slate-400 print:text-gray-600">
              Cognitive Training Performance Score
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black font-display text-white print:text-black">
                {compProfile.overallScore !== null ? compProfile.overallScore : 'N/A'}
              </span>
              <span className="text-lg font-bold font-mono text-slate-500 print:text-gray-500">/ 100</span>
            </div>
          </div>
          <div className="text-right sm:text-right">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/10 border border-teal-500/30 text-teal-400 print:text-teal-800 print:border-teal-400">
              <ShieldCheck size={14} /> {compProfile.confidenceLevel}
            </span>
            <p className="text-[11px] text-slate-400 print:text-gray-600 mt-1 max-w-xs">
              Based on {compProfile.assessedDomainsCount} of {compProfile.totalDomainsCount} assessed cognitive domains.
            </p>
          </div>
        </div>

        {/* Cognitive Domain Performance Table */}
        <div className="space-y-2">
          <h2 className="text-sm font-bold font-display uppercase tracking-wider text-slate-300 print:text-black">
            Domain-Specific Assessment
          </h2>
          <div className="border border-slate-800 rounded-2xl overflow-hidden print:border-gray-300">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 print:bg-gray-100 print:text-gray-700">
                <tr>
                  <th className="py-3 px-4 font-semibold">Cognitive Domain</th>
                  <th className="py-3 px-4 font-semibold text-center">Score (0-100)</th>
                  <th className="py-3 px-4 font-semibold text-center">Sessions</th>
                  <th className="py-3 px-4 font-semibold text-right">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 print:divide-gray-200">
                {domainKeys.map((key) => {
                  const meta = COGNITIVE_DOMAINS[key];
                  const res = compProfile.domainScores[key];

                  return (
                    <tr key={key} className="hover:bg-slate-900/30 print:hover:bg-transparent">
                      <td className="py-3 px-4 font-medium text-slate-200 print:text-black flex items-center gap-2">
                        <span>{meta.icon}</span>
                        <span>{meta.label}</span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        {res.status === 'assessed' ? (
                          <span className="text-teal-400 print:text-teal-800">{res.score}</span>
                        ) : (
                          <span className="text-slate-500 italic print:text-gray-400 text-[11px]">Not Assessed</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-400 print:text-gray-600">
                        {res.sessionCount}
                      </td>
                      <td className="py-3 px-4 text-right capitalize font-mono text-xs">
                        {res.trend === 'improving' ? (
                          <span className="text-emerald-400 print:text-emerald-700">▲ Improving</span>
                        ) : res.trend === 'declining' ? (
                          <span className="text-amber-400 print:text-amber-700">▼ Developing</span>
                        ) : (
                          <span className="text-slate-400 print:text-gray-600">● Stable</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Clinical Notes & AAN Compliance Disclaimer */}
        <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed space-y-1 print:bg-gray-50 print:border-gray-200 print:text-gray-600">
          <p className="font-semibold text-slate-300 print:text-black">
            Clinical Note &amp; Compliance Statement:
          </p>
          <p>
            This summary reflects performance during self-administered Computerised Cognitive Training (CCT) sessions. Unassessed domains are excluded from aggregate calculation. In accordance with American Academy of Neurology (AAN) recommendations, CCT scores serve as objective longitudinal performance markers and should be interpreted alongside clinical neuropsychological assessments.
          </p>
        </div>
      </div>
    </div>
  );
};
