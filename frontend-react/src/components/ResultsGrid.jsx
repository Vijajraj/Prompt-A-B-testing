import React from 'react'

export default function ResultsGrid({ results, winner }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <h3 className="text-xs font-bold font-sans uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
          Variant Outputs
        </h3>
        <span className="text-[10px] text-zinc-400 dark:text-zinc-600 font-mono">3 SAMPLES GENERATED</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {results.map((r) => {
          const isWinner = winner === r.variant
          const activeBorder = isWinner 
            ? 'border-indigo-500 bg-white shadow-[0_0_20px_rgba(99,102,241,0.08)] dark:bg-zinc-950/60 dark:shadow-[0_0_20px_rgba(99,102,241,0.1)]' 
            : 'border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/20 shadow-sm dark:shadow-none'

          return (
            <div
              key={r.variant}
              className={`relative overflow-hidden rounded-2xl border p-5 flex flex-col justify-between gap-4 transition-all duration-300 hover:border-zinc-400 dark:hover:border-zinc-700/60 ${activeBorder}`}
            >
              {/* Header Info */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 font-sans tracking-wide uppercase">
                    Variant {r.variant}
                  </h4>
                  <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono">
                    {r.variant === 'A' ? 'SYSTEM_1' : r.variant === 'B' ? 'SYSTEM_2' : 'SYSTEM_3'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {isWinner && (
                    <span className="bg-indigo-50 border border-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:border-indigo-500/30 dark:text-indigo-400 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider">
                      Winner
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    isWinner 
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-250 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' 
                      : 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800/40 dark:text-zinc-400 dark:border-zinc-800/80'
                  }`}>
                    {r.score.toFixed(1)}/10
                  </span>
                </div>
              </div>

              {/* Score Reason */}
              <div className="text-[11px] text-zinc-600 dark:text-zinc-400 bg-zinc-50/50 border border-zinc-200/60 dark:bg-zinc-900/30 dark:border-zinc-800/40 p-2.5 rounded-xl italic leading-relaxed">
                &gt; {r.reason}
              </div>

              {/* Output Content */}
              <div className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans mt-2 max-h-[250px] overflow-y-auto pr-1">
                {r.response}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
