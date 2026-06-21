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
    <div>
      <button
        onClick={handleToggle}
        className="flex items-center gap-2 text-lg font-semibold text-gray-100 hover:text-amber-400 transition-colors cursor-pointer"
      >
        <span className={`transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}>▶</span>
        📋 Run History
      </button>

      {expanded && (
        <div className="mt-4">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="mb-3 text-sm bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800 disabled:text-gray-600 text-gray-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : '🔄 Refresh'}
          </button>

          {error && (
            <p className="text-red-400 text-sm mb-3">{error}</p>
          )}

          {logs && logs.length === 0 && (
            <p className="text-gray-500 text-sm">No run logs found yet. Run an experiment above!</p>
          )}

          {logs && logs.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-gray-800">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-900 text-gray-400 uppercase text-xs tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Winner</th>
                    <th className="px-4 py-3">Score A</th>
                    <th className="px-4 py-3">Score B</th>
                    <th className="px-4 py-3">Score C</th>
                    <th className="px-4 py-3 max-w-xs">Query</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {logs.map((log, i) => (
                    <tr key={log.id || i} className="hover:bg-gray-900/50 transition-colors">
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{formatDate(log.created_at)}</td>
                      <td className="px-4 py-3">
                        <span className="bg-amber-400/10 text-amber-400 font-semibold px-2 py-0.5 rounded text-xs">
                          {log.winner}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-300">{log.score_a ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-300">{log.score_b ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-300">{log.score_c ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-400 max-w-xs truncate">{log.query}</td>
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
