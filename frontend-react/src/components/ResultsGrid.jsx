export default function ResultsGrid({ results, winner }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-100 mb-4">Results</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {results.map((r) => {
          const isWinner = r.variant === winner
          return (
            <div
              key={r.variant}
              className={`rounded-xl p-5 transition-all duration-300 ${
                isWinner
                  ? 'border-2 border-amber-400 bg-amber-400/5 shadow-lg shadow-amber-400/10'
                  : 'border border-gray-700 bg-gray-900'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">
                  Prompt {r.variant} {isWinner && '🏆'}
                </h3>
                <span
                  className={`text-sm font-bold px-3 py-0.5 rounded-full ${
                    isWinner
                      ? 'bg-amber-400 text-gray-950'
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {r.score}/10
                </span>
              </div>

              {/* Prompt used */}
              <p className="text-gray-400 text-sm italic mb-3 border-b border-gray-800 pb-3">
                "{r.prompt}"
              </p>

              {/* Response */}
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Response</p>
                <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {r.response}
                </p>
              </div>

              {/* Judge reason */}
              <div className="border-t border-gray-800 pt-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Judge Reason</p>
                <p className="text-gray-400 text-sm">{r.reason}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
