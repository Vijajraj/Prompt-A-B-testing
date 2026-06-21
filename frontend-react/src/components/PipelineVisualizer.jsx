import React from 'react'

export default function PipelineVisualizer({ currentState, winner }) {
  // States: 'idle', 'running-ab', 'evaluating', 'promoting', 'complete'

  const steps = [
    { id: 'query', label: '1. Input Query', desc: 'User Message' },
    { id: 'variants', label: '2. A/B Variants', desc: 'Parallel LLM Runs' },
    { id: 'judge', label: '3. LLM Judge', desc: 'Automated Scoring' },
    { id: 'promote', label: '4. Promotion', desc: 'Llama 3.3 Route' },
  ]

  const getStepState = (stepId) => {
    switch (currentState) {
      case 'idle':
        return 'waiting'
      case 'running-ab':
        if (stepId === 'query') return 'done'
        if (stepId === 'variants') return 'active'
        return 'waiting'
      case 'evaluating':
        if (stepId === 'query' || stepId === 'variants') return 'done'
        if (stepId === 'judge') return 'active'
        return 'waiting'
      case 'promoting':
        if (stepId === 'query' || stepId === 'variants' || stepId === 'judge') return 'done'
        if (stepId === 'promote') return 'active'
        return 'waiting'
      case 'complete':
        return 'done'
      default:
        return 'waiting'
    }
  }

  const getStatusClasses = (state) => {
    switch (state) {
      case 'done':
        return {
          ring: 'border-emerald-500/30 bg-emerald-950/10 text-emerald-400',
          dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
          label: 'text-gray-200',
          desc: 'text-gray-500',
        }
      case 'active':
        return {
          ring: 'border-indigo-500 bg-indigo-950/20 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.25)] animate-pulse',
          dot: 'bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.8)] animate-ping',
          label: 'text-indigo-400 font-semibold',
          desc: 'text-indigo-500/70',
        }
      case 'waiting':
      default:
        return {
          ring: 'border-zinc-800 bg-zinc-900/30 text-zinc-600',
          dot: 'bg-zinc-800',
          label: 'text-zinc-600',
          desc: 'text-zinc-700',
        }
    }
  }

  const getFlowDescription = () => {
    switch (currentState) {
      case 'idle':
        return 'System ready. Enter queries to run prompts in parallel.'
      case 'running-ab':
        return 'Generating variant responses on Groq (LLaMA 3.1 8B)...'
      case 'evaluating':
        return 'Scoring outputs using Judge LLM...'
      case 'promoting':
        return 'Promoting the winner to Llama 3.3 70B...'
      case 'complete':
        return `Evaluation complete. Variant ${winner} promoted.`
      default:
        return 'Offline'
    }
  }

  return (
    <div className="bg-zinc-950/40 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      {/* Dynamic Background Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/60 pb-4 mb-6">
        <div>
          <h2 className="text-sm font-bold tracking-tight uppercase text-zinc-300 font-sans">
            Execution Flow Pipeline
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {getFlowDescription()}
          </p>
        </div>
        {winner && currentState === 'complete' && (
          <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider self-start sm:self-auto">
            🏆 Winner: Variant {winner}
          </span>
        )}
      </div>

      {/* Pipeline Steps Row */}
      <div className="relative flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4 py-4">
        {/* Connection line for large screens */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-zinc-800/50 -translate-y-6 hidden md:block z-0" />
        
        {/* Active glowing progress fill line */}
        {currentState !== 'idle' && (
          <div 
            className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-indigo-500 to-cyan-400 -translate-y-6 hidden md:block z-0 transition-all duration-1000 ease-in-out"
            style={{ 
              width: currentState === 'running-ab' ? '33%' :
                     currentState === 'evaluating' ? '66%' : '100%' 
            }}
          />
        )}

        {steps.map((step, idx) => {
          const state = getStepState(step.id)
          const styles = getStatusClasses(state)
          
          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center text-center flex-1 w-full md:w-auto">
              {/* Outer Ring Circle */}
              <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${styles.ring}`}>
                {/* Center Node Circle */}
                <div className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${styles.dot}`} />
              </div>

              {/* Text Meta */}
              <div className="mt-3.5">
                <p className={`text-xs font-medium transition-colors duration-300 ${styles.label}`}>
                  {step.label}
                </p>
                <p className={`text-[10px] mt-0.5 transition-colors duration-300 ${styles.desc}`}>
                  {step.desc}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
