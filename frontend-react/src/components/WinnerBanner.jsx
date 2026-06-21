import React from 'react'

export default function WinnerBanner({ winner, finalOutput, promoting }) {
  const selectedModel = finalOutput?.model || 'meta-llama/llama-3.3-70b-instruct:free'
  const outputText = finalOutput?.final_output || ''

  return (
    <div className="border border-gray-800 rounded-xl overflow-hidden bg-gray-950 font-mono text-xs shadow-xl relative">
      {/* Glow Effect when complete */}
      {!promoting && finalOutput && (
        <div className="absolute inset-0 bg-cyan-500/5 pointer-events-none transition-all duration-300" />
      )}

      {/* Title Bar */}
      <div className="flex items-center justify-between bg-gray-900 px-4 py-2 border-b border-gray-800/80">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${promoting ? 'bg-cyan-500 animate-ping' : 'bg-emerald-500'}`} />
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            PROMOTED_OUTPUT_STREAM // {selectedModel}
          </span>
        </div>
        <span className="text-[9px] text-gray-600">STDOUT // STREAM</span>
      </div>

      {/* Screen Body */}
      <div className="p-5 min-h-[160px] flex flex-col justify-between select-text bg-gray-950/90 leading-relaxed text-gray-200">
        {promoting ? (
          <div className="space-y-2 text-gray-500 select-none">
            <div className="flex items-center gap-2">
              <span className="text-cyan-500 animate-pulse">[INIT]</span>
              <span>Connecting to OpenRouter gate...</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-cyan-500 animate-pulse">[EXEC]</span>
              <span>Routing winning variant prompt (Variant {winner}) to global LLM...</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-cyan-500 animate-pulse">[LOAD]</span>
              <span className="animate-pulse">Awaiting inference response block...</span>
            </div>
          </div>
        ) : outputText ? (
          <div>
            <div className="text-gray-600 select-none mb-2">// INFERENCE_RESULT_START</div>
            <p className="whitespace-pre-wrap">{outputText}</p>
            <div className="text-gray-600 select-none mt-4">// INFERENCE_RESULT_END</div>
          </div>
        ) : (
          <p className="text-gray-700 italic select-none">// Pipeline must be run to initiate winner promotion.</p>
        )}
      </div>
    </div>
  )
}
