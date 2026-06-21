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
    <div className="border border-gray-900 rounded-xl overflow-hidden bg-gray-950/20 font-mono text-xs">
      {/* DB Header Bar */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between bg-gray-900/50 hover:bg-gray-900 px-4 py-3 text-left border-b border-gray-900 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
            QUERY_CONSOLE // db_logs_query.sql
          </span>
        </div>
        <span className={`text-[10px] text-gray-500 font-bold transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}>
          ▶
        </span>
      </button>

      {expanded && (
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="text-[10px] uppercase font-bold tracking-wider bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800 px-3 py-1.5 rounded transition-all cursor-pointer disabled:cursor-not-allowed hover:border-gray-700 disabled:bg-gray-950 disabled:text-gray-700"
            >
              {loading ? 'RUNNING_QUERY...' : 'EXECUTE SELECT *'}
            </button>
            <span className="text-[9px] text-gray-600">LIMIT 50 // SORT DESC</span>
          </div>

          {error && (
            <div className="bg-red-950/30 border border-red-900/50 text-red-400 p-3 rounded text-[10px]">
              &gt; ERROR: {error}
            </div>
          )}

          {logs && logs.length === 0 && (
            <div className="text-center p-6 border border-dashed border-gray-800 text-gray-600 italic">
              // Table ab_logs is currently empty. Run an experiment above to log data.
            </div>
          )}

          {logs && logs.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-gray-900 bg-gray-950">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-900 text-gray-500 text-[10px] uppercase tracking-wider border-b border-gray-900">
                  <tr>
                    <th className="px-4 py-2 border-r border-gray-900">LOG_ID</th>
                    <th className="px-4 py-2 border-r border-gray-900">TIMESTAMP</th>
                    <th className="px-4 py-2 border-r border-gray-900">WINNER</th>
                    <th className="px-4 py-2 border-r border-gray-900">SC_A</th>
                    <th className="px-4 py-2 border-r border-gray-900">SC_B</th>
                    <th className="px-4 py-2 border-r border-gray-900">SC_C</th>
                    <th className="px-4 py-2">QUERY_SAMPLE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900 text-gray-300">
                  {logs.map((log, i) => (
                    <tr key={log.id || i} className="hover:bg-gray-900/25 transition-colors">
                      <td className="px-4 py-2 border-r border-gray-900 font-semibold text-gray-500 text-[10px]">
                        {(log.id || '').substring(0, 8) || `MOCK_${i}`}
                      </td>
                      <td className="px-4 py-2 border-r border-gray-900 text-[10px] text-gray-400 whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-4 py-2 border-r border-gray-900">
                        <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold px-1.5 py-0.5 rounded text-[10px]">
                          VAR_{log.winner}
                        </span>
                      </td>
                      <td className="px-4 py-2 border-r border-gray-900 text-cyan-400">{log.score_a?.toFixed(1) ?? '—'}</td>
                      <td className="px-4 py-2 border-r border-gray-900 text-purple-400">{log.score_b?.toFixed(1) ?? '—'}</td>
                      <td className="px-4 py-2 border-r border-gray-900 text-amber-400">{log.score_c?.toFixed(1) ?? '—'}</td>
                      <td className="px-4 py-2 text-gray-400 truncate max-w-xs">{log.query}</td>
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
