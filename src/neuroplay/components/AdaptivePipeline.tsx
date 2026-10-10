import { Brain, Shield, Cpu, Activity, RefreshCw, Layers } from 'lucide-react';

export function AdaptivePipeline() {
  return (
    <div className="np-card p-6 border-slate-800 space-y-6 animate-fade-in text-slate-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
            <Layers className="text-teal-400" size={18} /> Closed-Loop AI System Architecture
          </h3>
          <p className="text-xs text-slate-400">
            Real-time multi-layer intelligence pipeline connecting sensor inputs, state estimation, safety, and RL adaptation.
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-teal-500/10 text-teal-400 border border-teal-500/30 self-start sm:self-auto">
          Closed-Loop Active
        </span>
      </div>

      {/* Visual System Architecture Diagram matching SSN Presentation */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
        
        {/* Layer 1: Input & Sensors */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-blue-500/30 flex flex-col justify-between space-y-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 flex items-center gap-1.5 mb-2">
              <Activity size={13} /> 1. Input &amp; Sensors
            </span>
            <div className="space-y-1.5 text-[11px] text-slate-300">
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="font-semibold text-slate-100 block">VR Therapy Tasks</span>
                <span className="text-[10px] text-slate-400">14 Active Cognitive/Motor Tasks</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="font-semibold text-slate-100 block">Sensors &amp; Timing</span>
                <span className="text-[10px] text-slate-400">Reaction RT (ms), Drift, Gestures</span>
              </div>
            </div>
          </div>
          <span className="text-[10px] text-blue-400 font-bold text-center">→ Raw Signal Stream</span>
        </div>

        {/* Layer 2: DL & Patient State */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-teal-500/30 flex flex-col justify-between space-y-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-teal-400 flex items-center gap-1.5 mb-2">
              <Brain size={13} /> 2. Intelligence Layer
            </span>
            <div className="space-y-1.5 text-[11px] text-slate-300">
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="font-semibold text-slate-100 block">State Estimator</span>
                <span className="text-[10px] text-slate-400">CNN + LSTM Feature Extraction</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="font-semibold text-slate-100 block">Patient State Vector</span>
                <span className="text-[10px] text-slate-400">Cognitive, Motor, Fatigue %</span>
              </div>
            </div>
          </div>
          <span className="text-[10px] text-teal-400 font-bold text-center">→ State Tuple (s)</span>
        </div>

        {/* Layer 3: RL & Safety Controller */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/30 flex flex-col justify-between space-y-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 flex items-center gap-1.5 mb-2">
              <Cpu size={13} /> 3. Adaptation &amp; Safety
            </span>
            <div className="space-y-1.5 text-[11px] text-slate-300">
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="font-semibold text-slate-100 block">RL Controller</span>
                <span className="text-[10px] text-slate-400">Q-Learning Decision &amp; Action</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="font-semibold text-slate-100 block flex items-center gap-1">
                  <Shield size={11} className="text-rose-400" /> Safety Layer
                </span>
                <span className="text-[10px] text-slate-400">CMCI Rules &amp; Clinical Limits</span>
              </div>
            </div>
          </div>
          <span className="text-[10px] text-amber-400 font-bold text-center">→ Vetted Action (a)</span>
        </div>

        {/* Layer 4: Execution API & Closed-Loop */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-purple-500/30 flex flex-col justify-between space-y-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400 flex items-center gap-1.5 mb-2">
              <RefreshCw size={13} /> 4. Execution API
            </span>
            <div className="space-y-1.5 text-[11px] text-slate-300">
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="font-semibold text-slate-100 block">Dynamic Difficulty</span>
                <span className="text-[10px] text-slate-400">Speed, Spawn Delay, Spans</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="font-semibold text-slate-100 block">Task Environment</span>
                <span className="text-[10px] text-slate-400">Target Modality &amp; Load</span>
              </div>
            </div>
          </div>
          <span className="text-[10px] text-purple-400 font-bold text-center">→ Continuous Adaptation</span>
        </div>

      </div>

      {/* Closed Loop Continuous Feedback Bar */}
      <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <RefreshCw size={14} className="text-teal-400 animate-spin" style={{ animationDuration: '6s' }} />
          <span className="text-slate-300 font-semibold">Closed-Loop Feedback:</span>
          <span>Next Task → New Trial Data → Continuous Patient State Adaptation</span>
        </div>
        <span className="hidden sm:inline text-teal-400 font-bold">Latency &lt; 16ms</span>
      </div>
    </div>
  );
}
