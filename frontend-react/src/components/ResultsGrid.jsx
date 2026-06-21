import React from 'react'

export default function ResultsGrid({ results, winner }) {
  // Renders a custom ASCII-style bar for the score (e.g., [■■■■■□□□□□] 5.0)
  const renderAsciiScore = (score) => {
    const totalBlocks = 10
    const filledBlocks = Math.round(score)
    const emptyBlocks = totalBlocks - filledBlocks
    
    const filledStr = '■'.repeat(filledBlocks)
    const emptyStr = '□'.repeat(emptyBlocks)

    return (
      <span className="font-mono text-cyan-400">
        [{filledStr}{emptyStr}] <span className="font-bold text-gray-100">{score.toFixed(1)}/10</span>
      </span>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 font-mono text-xs text-gray-400 uppercase tracking-widest">
        <span>// RUN_OUTPUT_STREAM</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {results.map((r) => {
          const isWinner = winner === r.variant
          const activeBorder = isWinner 
            ? 'border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.15)] bg-gray-950/70' 
            : 'border-gray-900 bg-gray-950/30'

          const terminalIcon = r.variant === 'A' ? '⌬' : r.variant === 'B' ? '⚙' : '⌬'

          return (
            <div
              key={r.variant}
              className={`relative overflow-hidden rounded-xl border flex flex-col transition-all duration-300 ${activeBorder}`}
            >
              {/* Terminal Title Bar */}
              <div className={`flex items-center justify-between px-4 py-2 border-b font-mono text-[10px] ${
                isWinner ? 'bg-amber-950/20 border-amber-900/40 text-amber-400' : 'bg-gray-900/50 border-gray-900 text-gray-500'
              }`}>
                <div className="flex items-center gap-2">
                  <span>{terminalIcon}</span>
                  <span className="font-bold tracking-wider">
                    VAR_{r.variant}.STDOUT
                  </span>
                </div>
                {isWinner ? (
                  <span className="animate-pulse bg-amber-500/10 border border-amber-500/30 text-amber-400 px-1.5 py-0.5 rounded text-[8px] font-bold">
                    WINNING_NODE
                  </span>
                ) : (
                  <span className="text-gray-600">STABLE</span>
                )}
              </div>

              {/* Score panel embedded inside Terminal */}
              <div className="bg-gray-950/90 px-4 py-2.5 border-b border-gray-900/80 flex flex-col gap-1 font-mono text-[10px]">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">JUDGE_SCORE:</span>
                  {renderAsciiScore(r.score)}
                </div>
                <div className="text-gray-400 leading-relaxed mt-1 line-clamp-2 italic text-[9px] bg-gray-900/30 p-1.5 border border-gray-900/50 rounded">
                  &gt; {r.reason}
                </div>
              </div>

              {/* Terminal Screen Body */}
              <div className="flex-1 p-4 font-mono text-xs text-gray-300 leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto select-text bg-gray-950/80 min-h-[180px]">
                <div className="text-gray-700 select-none mb-1">// RESPONSE_DATA:</div>
                {r.response}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
