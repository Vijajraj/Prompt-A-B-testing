export default function WinnerBanner({ winner, finalOutput, promoting }) {
  return (
    <div className="rounded-xl border border-amber-400/50 bg-gradient-to-br from-amber-400/5 to-gray-900 p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🏆</span>
        <h2 className="text-xl font-semibold text-amber-400">
          Winner: Prompt {winner}
        </h2>
      </div>

      {promoting && !finalOutput && (
        <div className="flex items-center gap-3 text-gray-400">
          <svg className="animate-spin h-5 w-5 text-amber-400" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <span>Sending winner to LLM via OpenRouter...</span>
        </div>
      )}

      {finalOutput && (
        <div>
          <p className="text-amber-400/70 text-xs font-medium uppercase tracking-wide mb-2">
            Final Output — {finalOutput.model}
          </p>
          <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
            <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap break-words">
              {finalOutput.final_output}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
