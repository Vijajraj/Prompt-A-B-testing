import { useState } from 'react'

export default function RunHistory({ apiUrl }) {
  const [logs, setLogs] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(false)

  const fetchLogs = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${apiUrl}/api/logs`, { signal: AbortSignal.timeout(10000) })
      if (!res.ok) throw new Error(`Failed to load history (${res.status})`)
      const data = await res.json()
      setLogs(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = () => {
    const next = !expanded
    setExpanded(next)
    if (next && logs === null) {
      fetchLogs()
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    try {
      return new Date(dateStr).toLocaleString()
    } catch {
      return dateStr
    }
  }

  return (
    <div className="bg-zinc-950/40 backdrop-blur-md border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl transition-all duration-300">
      {/* Header bar */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-zinc-900/20 transition-colors border-b border-zinc-800/60 cursor-pointer"
      >
        <div>
          <h3 className="text-xs font-bold font-sans uppercase tracking-widest text-zinc-400">
            Experiment Logs Database
          </h3>
          <p className="text-[10px] text-zinc-500 font-mono mt-0.5 uppercase tracking-wide">
            Inspect past A/B test runs and scores
          </p>
        </div>
        <span className={`text-xs text-zinc-500 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}>
          ▶
        </span>
      </button>

      {expanded && (
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="text-[10px] font-bold uppercase tracking-wider bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 px-3.5 py-2 rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed hover:border-zinc-700 disabled:bg-zinc-950 disabled:text-zinc-700"
            >
              {loading ? 'Refreshing...' : 'Refresh Logs'}
            </button>
            <span className="text-[10px] text-zinc-600">Showing last 50 entries</span>
          </div>

          {error && (
            <div className="bg-red-950/30 border border-red-900/50 text-red-400 p-3.5 rounded-xl text-xs font-sans">
              Error fetching database logs: {error}
            </div>
          )}

          {logs && logs.length === 0 && (
            <div className="text-center p-8 border border-dashed border-zinc-800 rounded-xl text-zinc-600 italic text-xs">
              No logged records found in the database. Run an A/B test to record logs.
            </div>
          )}

          {logs && logs.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/60">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-zinc-900/60 text-zinc-400 text-[10px] uppercase tracking-wider border-b border-zinc-800/80">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Log ID</th>
                    <th className="px-5 py-3 font-semibold">Timestamp</th>
                    <th className="px-5 py-3 font-semibold">Winner</th>
                    <th className="px-5 py-3 font-semibold">Score A</th>
                    <th className="px-5 py-3 font-semibold">Score B</th>
                    <th className="px-5 py-3 font-semibold">Score C</th>
                    <th className="px-5 py-3 font-semibold">Query Sample</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                  {logs.map((log, i) => (
                    <tr key={log.id || i} className="hover:bg-zinc-900/20 transition-colors">
                      <td className="px-5 py-3 text-zinc-500 font-mono text-[10px]">
                        {(log.id || '').substring(0, 8) || `REF_${i}`}
                      </td>
                      <td className="px-5 py-3 text-zinc-400 font-sans">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-5 py-3">
                        <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider">
                          Var {log.winner}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-zinc-300 font-medium">{log.score_a?.toFixed(1) ?? '—'}</td>
                      <td className="px-5 py-3 text-zinc-300 font-medium">{log.score_b?.toFixed(1) ?? '—'}</td>
                      <td className="px-5 py-3 text-zinc-300 font-medium">{log.score_c?.toFixed(1) ?? '—'}</td>
                      <td className="px-5 py-3 text-zinc-500 truncate max-w-xs font-sans">{log.query}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
