import React from 'react'

export default function PipelineVisualizer({ currentState, winner }) {
  // States: 'idle', 'running-ab', 'evaluating', 'promoting', 'complete'
  
  const getStepStatus = (stepName) => {
    switch (currentState) {
      case 'idle':
        return 'inactive'
      case 'running-ab':
        if (stepName === 'query' || stepName === 'variants') return 'active'
        return 'inactive'
      case 'evaluating':
        if (stepName === 'query' || stepName === 'variants') return 'completed'
        if (stepName === 'judge') return 'active'
        return 'inactive'
      case 'promoting':
        if (stepName === 'query' || stepName === 'variants' || stepName === 'judge') return 'completed'
        if (stepName === 'promote') return 'active'
        return 'inactive'
      case 'complete':
        return 'completed'
      default:
        return 'inactive'
    }
  }

  const getNodeClass = (status, activeColor = 'cyan') => {
    if (status === 'active') {
      return {
        cyan: 'border-cyan-500 bg-cyan-950/40 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] animate-pulse',
        purple: 'border-purple-500 bg-purple-950/40 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)] animate-pulse',
        amber: 'border-amber-500 bg-amber-950/40 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse',
      }[activeColor]
    }
    if (status === 'completed') {
      return 'border-emerald-500 bg-emerald-950/20 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
    }
    return 'border-gray-800 bg-gray-900/40 text-gray-500'
  }

  const getLineClass = (fromStatus, toStatus) => {
    if (fromStatus === 'completed' && toStatus === 'active') {
      return 'stroke-cyan-500 [stroke-dasharray:5] [animation:flow_dash_forward_2s_linear_infinite]'
    }
    if (fromStatus === 'completed' && toStatus === 'completed') {
      return 'stroke-emerald-500'
    }
    return 'stroke-gray-800'
  }

  const statusText = {
    idle: 'SYSTEM IDLE // AWAITING WORKBENCH INITIATION',
    'running-ab': 'EXECUTING PARALLEL RUNS ON GROQ (LLaMA 3.1 8B)...',
    evaluating: 'AI JUDGE EVALUATING RESPONSES...',
    promoting: 'PROMOTING WINNING VARIANT VIA OPENROUTER...',
    complete: 'PIPELINE COMPLETE // WINNER LOGGED',
  }[currentState] || 'PIPELINE STATUS UNKNOWN'

  const queryStatus = getStepStatus('query')
  const variantsStatus = getStepStatus('variants')
  const judgeStatus = getStepStatus('judge')
  const promoteStatus = getStepStatus('promote')

  return (
    <div className="bg-gray-950/30 rounded-xl border border-gray-900 p-6 font-mono text-xs">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            currentState === 'idle' ? 'bg-gray-600' :
            currentState === 'complete' ? 'bg-emerald-500' :
            'bg-cyan-500 animate-ping'
          }`} />
          <span className="text-[10px] tracking-widest text-gray-400 uppercase">
            {statusText}
          </span>
        </div>
        {winner && (
          <span className="text-[10px] bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded uppercase tracking-wider">
            WINNER: VARIANT {winner}
          </span>
        )}
      </div>

      {/* Responsive Grid/Flex for layout */}
      <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 py-6 overflow-hidden">
        {/* SVG connection lines for large screens */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none hidden md:block" style={{ zIndex: 0 }}>
          {/* Query to Variants */}
          <path d="M 120 70 L 260 30" fill="none" strokeWidth="2" className={getLineClass(queryStatus, variantsStatus)} />
          <path d="M 120 70 L 260 70" fill="none" strokeWidth="2" className={getLineClass(queryStatus, variantsStatus)} />
          <path d="M 120 70 L 260 110" fill="none" strokeWidth="2" className={getLineClass(queryStatus, variantsStatus)} />

          {/* Variants to Judge */}
          <path d="M 380 30 L 520 70" fill="none" strokeWidth="2" className={getLineClass(variantsStatus, judgeStatus)} />
          <path d="M 380 70 L 520 70" fill="none" strokeWidth="2" className={getLineClass(variantsStatus, judgeStatus)} />
          <path d="M 380 110 L 520 70" fill="none" strokeWidth="2" className={getLineClass(variantsStatus, judgeStatus)} />

          {/* Judge to Promote */}
          <path d="M 640 70 L 780 70" fill="none" strokeWidth="2" className={getLineClass(judgeStatus, promoteStatus)} />
        </svg>

        {/* Node 1: Input Query */}
        <div className={`relative z-10 w-28 h-14 border rounded-lg flex flex-col items-center justify-center transition-all duration-300 ${getNodeClass(queryStatus, 'cyan')}`}>
          <span className="text-[10px] text-gray-500">STEP 01</span>
          <span className="font-bold">INPUT_QUERY</span>
        </div>

        {/* Node 2: Variant Branches */}
        <div className="relative z-10 flex flex-col gap-3">
          {['A', 'B', 'C'].map((variant) => {
            const isWinner = winner === variant && currentState === 'complete'
            let status = variantsStatus
            if (currentState === 'complete' || currentState === 'promoting') {
              status = 'completed'
            }
            const activeColor = variant === 'A' ? 'cyan' : variant === 'B' ? 'purple' : 'amber'
            return (
              <div
                key={variant}
                className={`w-32 h-10 border rounded-lg flex items-center justify-between px-3 transition-all duration-300 ${
                  isWinner ? 'border-amber-400 bg-amber-950/20 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]' :
                  getNodeClass(status, activeColor)
                }`}
              >
                <span className="text-[10px] text-gray-500">VAR_{variant}</span>
                <span className="font-bold text-[10px] truncate max-w-[60px]">
                  {variant === 'A' ? 'Llama 3.1' : variant === 'B' ? 'Prompt_B' : 'Prompt_C'}
                </span>
              </div>
            )
          })}
        </div>

        {/* Node 3: LLM Judge */}
        <div className={`relative z-10 w-28 h-14 border rounded-lg flex flex-col items-center justify-center transition-all duration-300 ${getNodeClass(judgeStatus, 'amber')}`}>
          <span className="text-[10px] text-gray-500">STEP 02</span>
          <span className="font-bold">LLM_JUDGE</span>
        </div>

        {/* Node 4: Promoted output */}
        <div className={`relative z-10 w-32 h-14 border rounded-lg flex flex-col items-center justify-center transition-all duration-300 ${getNodeClass(promoteStatus, 'purple')}`}>
          <span className="text-[10px] text-gray-500">STEP 03</span>
          <span className="font-bold text-[10px]">PROMOTED_LLM</span>
        </div>
      </div>

      <style>{`
        @keyframes flow_dash_forward {
          to {
            stroke-dashoffset: -20;
          }
        }
        .animate-flow-dash {
          animation: flow_dash_forward 2s linear infinite;
        }
      `}</style>
    </div>
  )
}
