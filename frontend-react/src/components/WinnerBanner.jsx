import React from 'react'

export default function WinnerBanner({ winner, finalOutput, promoting }) {
  const selectedModel = finalOutput?.model || 'meta-llama/llama-3.3-70b-instruct:free'
  const outputText = finalOutput?.final_output || ''

  return (
    <div className="bg-zinc-950/40 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden transition-all duration-300">
      {/* Background glow when complete */}
      {!promoting && finalOutput && (
        <div className="absolute inset-0 bg-indigo-500/[0.02] pointer-events-none" />
      )}

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/60 pb-4 mb-5">
        <div>
          <h3 className="text-xs font-bold font-sans uppercase tracking-widest text-zinc-400">
            Promoted Output
          </h3>
          <p className="text-[10px] text-zinc-500 font-mono mt-0.5 uppercase tracking-wide">
            Model: {selectedModel}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {promoting ? (
            <span className="flex items-center gap-1.5 text-xs text-indigo-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
              Promoting Winner (Var {winner})...
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Promotion Complete
            </span>
          )}
        </div>
      </div>

      {/* Promoted Output Body */}
      <div className="text-sm leading-relaxed text-zinc-200 font-sans">
        {promoting ? (
          <div className="space-y-3 animate-pulse py-2">
            <div className="h-4 bg-zinc-800/50 rounded-md w-full" />
            <div className="h-4 bg-zinc-800/50 rounded-md w-[92%]" />
            <div className="h-4 bg-zinc-800/50 rounded-md w-[85%]" />
            <div className="h-4 bg-zinc-800/50 rounded-md w-[40%]" />
          </div>
        ) : outputText ? (
          <div className="whitespace-pre-wrap select-text pr-1 max-h-[400px] overflow-y-auto">
            {outputText}
          </div>
        ) : (
          <p className="text-zinc-600 italic select-none text-xs">
            // Promoted inference output will render here once the pipeline completes.
          </p>
        )}
      </div>
    </div>
  )
}
