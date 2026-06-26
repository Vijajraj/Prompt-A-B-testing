import React, { useState } from 'react'

export default function ResultsGrid({ results, winner }) {
  const [activeModal, setActiveModal] = useState(null) // { variant: 'A', text: '', score: 9.0 }
  const [copiedVariant, setCopiedVariant] = useState(null)

  const handleCopy = (text, variant) => {
    navigator.clipboard.writeText(text)
    setCopiedVariant(variant)
    setTimeout(() => setCopiedVariant(null), 2000)
  }

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
              <div className="text-sm text-zinc-800 dark:text-zinc-300 leading-relaxed font-sans mt-2 max-h-[350px] overflow-y-auto pr-1">
                {r.response}
              </div>

              {/* Card Actions Footer */}
              <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/60 pt-3 text-[11px] text-zinc-400 dark:text-zinc-500 font-sans">
                <span className="font-mono uppercase tracking-wide text-[9px] text-zinc-400 dark:text-zinc-600">STDOUT_STREAM</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(r.response, r.variant)}
                    className="hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                  >
                    {copiedVariant === r.variant ? 'Copied!' : 'Copy'}
                  </button>
                  <span className="text-zinc-300 dark:text-zinc-800">•</span>
                  <button
                    type="button"
                    onClick={() => setActiveModal({ variant: r.variant, text: r.response, score: r.score })}
                    className="hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                  >
                    Expand
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modern Overlay Modal */}
      {activeModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/75 backdrop-blur-sm p-4 transition-opacity duration-300"
          onClick={() => setActiveModal(null)}
        >
          <div 
            className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden transition-transform duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40">
              <div>
                <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-300 uppercase tracking-widest font-sans">
                  Variant {activeModal.variant} Output Detail
                </h3>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                  LLM JUDGE RATING: {activeModal.score.toFixed(1)}/10
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleCopy(activeModal.text, 'modal')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer font-sans"
                >
                  {copiedVariant === 'modal' ? '✓ Copied' : 'Copy Text'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="p-1.5 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap select-text font-sans">
              {activeModal.text}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
