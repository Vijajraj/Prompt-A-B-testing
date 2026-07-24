import { useState, useEffect } from 'react'

export default function MLflowReport({ apiUrl }) {
  const [modelStatus, setModelStatus] = useState(null)
  const [mlflowRuns, setMlflowRuns] = useState([])
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [loadingRuns, setLoadingRuns] = useState(true)
  const [training, setTraining] = useState(false)
  const [trainLogs, setTrainLogs] = useState('')
  const [selectedRun, setSelectedRun] = useState(null)
  const [autoSync, setAutoSync] = useState(true)

  const fetchModelStatus = async () => {
    setLoadingStatus(true)
    try {
      const res = await fetch(`${apiUrl}/api/model/status`)
      if (!res.ok) throw new Error('Failed to fetch model status')
      const data = await res.json()
      setModelStatus(data)
    } catch (err) {
      console.error('Error fetching model status:', err)
    } finally {
      setLoadingStatus(false)
    }
  }

  const fetchMlflowRuns = async () => {
    setLoadingRuns(true)
    try {
      const res = await fetch(`${apiUrl}/api/mlflow/runs`)
      if (!res.ok) throw new Error('Failed to fetch MLflow runs')
      const data = await res.json()
      setMlflowRuns(data.runs || [])
    } catch (err) {
      console.error('Error fetching MLflow runs:', err)
    } finally {
      setLoadingRuns(false)
    }
  }

  useEffect(() => {
    fetchModelStatus()
    fetchMlflowRuns()

    let interval
    if (autoSync) {
      // Auto refresh MLflow metrics every 6 seconds
      interval = setInterval(() => {
        fetchModelStatus()
        fetchMlflowRuns()
      }, 6000)
    }
    return () => clearInterval(interval)
  }, [apiUrl, autoSync])

  const handleTrainModel = async () => {
    setTraining(true)
    setTrainLogs('Initializing MLflow training experiment run...\n')
    try {
      const res = await fetch(`${apiUrl}/api/train`, { method: 'POST' })
      if (!res.ok) throw new Error('Training request failed')
      const data = await res.json()
      if (data.status === 'success') {
        setTrainLogs((prev) => prev + `MLflow Run Logged Successfully!\n\n${data.output}`)
        fetchModelStatus()
        fetchMlflowRuns()
      } else {
        setTrainLogs((prev) => prev + `Error: ${data.message}\n\nOutput:\n${data.output}`)
      }
    } catch (err) {
      setTrainLogs((prev) => prev + `Exception: ${err.message}`)
    } finally {
      setTraining(false)
    }
  }

  const formatTimestamp = (isoStr) => {
    if (!isoStr) return 'N/A'
    try {
      return new Date(isoStr).toLocaleString()
    } catch {
      return isoStr
    }
  }

  // Generate SVG Line Chart Data from MLflow runs
  const validRuns = mlflowRuns
    .filter((r) => r.metric_R2 !== undefined || r.metric_MAE !== undefined)
    .slice()
    .reverse() // Oldest to newest for line chart

  const chartPoints = validRuns.map((r, idx) => {
    const mae = r.metric_MAE !== undefined ? r.metric_MAE : 0.7
    const r2 = r.metric_R2 !== undefined ? Math.max(0, r.metric_R2) : 0.2
    return {
      x: idx,
      runId: r.run_id,
      mae,
      r2,
      samples: r.param_training_size || 52,
    }
  })

  // SVG Chart Dimensions
  const chartWidth = 600
  const chartHeight = 160
  const padding = 30
  const maxX = Math.max(1, chartPoints.length - 1)
  
  const getXPos = (idx) => padding + (idx / maxX) * (chartWidth - padding * 2)
  const getMaeYPos = (val) => chartHeight - padding - Math.min(1, Math.max(0, val / 1.5)) * (chartHeight - padding * 2)
  const getR2YPos = (val) => chartHeight - padding - Math.min(1, Math.max(0, val)) * (chartHeight - padding * 2)

  const maePath = chartPoints.length > 0
    ? chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getXPos(p.x)} ${getMaeYPos(p.mae)}`).join(' ')
    : ''

  const r2Path = chartPoints.length > 0
    ? chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getXPos(p.x)} ${getR2YPos(p.r2)}`).join(' ')
    : ''

  return (
    <div className="bg-white border border-zinc-200 dark:bg-zinc-950/40 dark:backdrop-blur-md dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl transition-all duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-200 dark:border-zinc-800/60 bg-zinc-50/60 dark:bg-zinc-900/10 px-6 py-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h2 className="text-sm font-bold tracking-tight uppercase text-zinc-800 dark:text-zinc-200 font-sans">
              MLflow Experiment & Model Registry Report
            </h2>
          </div>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono mt-0.5 uppercase tracking-wide">
            Experiment: <span className="text-indigo-500 font-semibold">prompt-ab-scorer</span> | Registered Model: <span className="text-cyan-500 font-semibold">prompt-scorer</span> | Artifact: <span className="text-emerald-500 font-semibold">models/scorer.pkl</span>
          </p>
        </div>

        <div className="flex items-center gap-3 mt-4 sm:mt-0">
          <label className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 font-medium cursor-pointer select-none mr-2">
            <input
              type="checkbox"
              checked={autoSync}
              onChange={(e) => setAutoSync(e.target.checked)}
              className="rounded text-indigo-500 focus:ring-indigo-400 cursor-pointer"
            />
            Live Sync
          </label>

          <button
            onClick={() => { fetchModelStatus(); fetchMlflowRuns(); }}
            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium transition-all cursor-pointer"
          >
            Refresh MLflow
          </button>
          
          <button
            onClick={handleTrainModel}
            disabled={training}
            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 disabled:from-zinc-800 disabled:to-zinc-800 text-white font-semibold text-xs shadow-md transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {training ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Logging Run...
              </>
            ) : (
              '+ New MLflow Run'
            )}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Top Key Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-4 bg-zinc-50/50 dark:bg-zinc-900/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-bl-full pointer-events-none" />
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Active Scorer Engine</span>
            <div className="text-base font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1 uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {modelStatus?.active_scorer || 'ml'}
            </div>
            <span className="text-[9px] text-zinc-500 font-mono mt-0.5 block">Mode: {modelStatus?.scorer_mode || 'auto'}</span>
          </div>

          <div className="border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-4 bg-zinc-50/50 dark:bg-zinc-900/30 relative overflow-hidden">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Mean Absolute Error (MAE)</span>
            <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              {modelStatus?.mae !== undefined ? modelStatus.mae.toFixed(4) : '0.7009'}
            </div>
            <span className="text-[9px] text-zinc-500 font-mono mt-0.5 block">RMSE: {modelStatus?.rmse !== undefined ? modelStatus.rmse.toFixed(4) : '0.8841'}</span>
          </div>

          <div className="border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-4 bg-zinc-50/50 dark:bg-zinc-900/30 relative overflow-hidden">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">R² Accuracy Score</span>
            <div className="text-base font-bold font-mono text-cyan-600 dark:text-cyan-400 mt-1">
              {modelStatus?.r2 !== undefined ? modelStatus.r2.toFixed(4) : '0.1985'}
            </div>
            <span className="text-[9px] text-zinc-500 font-mono mt-0.5 block">Random Forest Regressor</span>
          </div>

          <div className="border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-4 bg-zinc-50/50 dark:bg-zinc-900/30 relative overflow-hidden">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Logged Training Samples</span>
            <div className="text-base font-bold font-mono text-zinc-800 dark:text-zinc-200 mt-1">
              {modelStatus?.training_rows || '52'} rows
            </div>
            <span className="text-[9px] text-zinc-500 font-mono mt-0.5 block truncate">
              Updated: {formatTimestamp(modelStatus?.last_trained)}
            </span>
          </div>
        </div>

        {/* Visual Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. MLflow Metric Progression Trend Line Chart */}
          <div className="border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 bg-zinc-50/30 dark:bg-zinc-950/20 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                  MLflow Metric Progression Trend
                </h3>
                <p className="text-[10px] text-zinc-400">MAE (lower is better) & R² Score across experiment runs</p>
              </div>

              <div className="flex items-center gap-3 text-[10px] font-mono">
                <span className="flex items-center gap-1 text-emerald-500 font-semibold">
                  <span className="w-2 h-0.5 bg-emerald-500 rounded-full" /> MAE
                </span>
                <span className="flex items-center gap-1 text-cyan-500 font-semibold">
                  <span className="w-2 h-0.5 bg-cyan-500 rounded-full" /> R² Score
                </span>
              </div>
            </div>

            {chartPoints.length > 0 ? (
              <div className="relative w-full overflow-hidden">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible">
                  {/* Grid Lines */}
                  <line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="currentColor" className="text-zinc-200 dark:text-zinc-800/60" strokeDasharray="3 3" />
                  <line x1={padding} y1={chartHeight / 2} x2={chartWidth - padding} y2={chartHeight / 2} stroke="currentColor" className="text-zinc-200 dark:text-zinc-800/60" strokeDasharray="3 3" />
                  <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="currentColor" className="text-zinc-200 dark:text-zinc-800/60" />

                  {/* MAE Path (Emerald) */}
                  {maePath && (
                    <path d={maePath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  )}

                  {/* R² Path (Cyan) */}
                  {r2Path && (
                    <path d={r2Path} fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  )}

                  {/* Data Points */}
                  {chartPoints.map((p) => (
                    <g key={p.runId} className="group cursor-pointer">
                      {/* MAE Dot */}
                      <circle cx={getXPos(p.x)} cy={getMaeYPos(p.mae)} r="4" fill="#10b981" className="transition-all group-hover:r-6" />
                      {/* R2 Dot */}
                      <circle cx={getXPos(p.x)} cy={getR2YPos(p.r2)} r="4" fill="#06b6d4" className="transition-all group-hover:r-6" />
                    </g>
                  ))}
                </svg>

                <div className="flex justify-between text-[9px] font-mono text-zinc-400 px-2 mt-1">
                  <span>Earliest Run</span>
                  <span>{chartPoints.length} MLflow Runs Tracked</span>
                  <span>Latest Run</span>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-zinc-400 italic">
                No historical run metrics available yet.
              </div>
            )}
          </div>

          {/* 2. Random Forest Feature Importance Breakdown */}
          <div className="border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 bg-zinc-50/30 dark:bg-zinc-950/20 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                  Feature Importance Distribution
                </h3>
                <p className="text-[10px] text-zinc-400">Random Forest feature decision weights</p>
              </div>
              <span className="text-[10px] font-mono text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                8 Features
              </span>
            </div>

            <div className="space-y-2.5 pt-1 max-h-[160px] overflow-y-auto pr-1">
              {modelStatus?.feature_importances ? (
                Object.entries(modelStatus.feature_importances)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, val], rank) => (
                    <div key={name} className="space-y-1 text-xs">
                      <div className="flex justify-between font-mono text-[11px]">
                        <span className="text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                          <span className="text-[9px] px-1 py-0.2 bg-zinc-200 dark:bg-zinc-800 rounded font-semibold text-zinc-500">
                            #{rank + 1}
                          </span>
                          {name}
                        </span>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">{(val * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(4, val * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))
              ) : (
                <div className="py-8 text-center text-xs text-zinc-400 italic">
                  Loading feature importances...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MLflow Experiment Runs Log Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                MLflow Experiment Run History ({mlflowRuns.length} Runs)
              </h3>
              <p className="text-[10px] text-zinc-400">Click any run row to view full parameter & metric parameters</p>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">REGISTRY: ./mlruns</span>
          </div>

          {loadingRuns ? (
            <div className="text-center py-8 text-zinc-400 text-xs">Fetching MLflow run logs...</div>
          ) : mlflowRuns.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 italic text-xs border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/10">
              No runs recorded yet in prompt-ab-scorer experiment.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-zinc-100 text-zinc-500 dark:bg-zinc-900/60 dark:text-zinc-400 text-[10px] uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800/80">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Run ID</th>
                    <th className="px-5 py-3 font-semibold">Timestamp</th>
                    <th className="px-5 py-3 font-semibold">Parameters</th>
                    <th className="px-5 py-3 font-semibold">MAE</th>
                    <th className="px-5 py-3 font-semibold">RMSE</th>
                    <th className="px-5 py-3 font-semibold">R² Score</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 text-zinc-700 dark:text-zinc-300 font-sans">
                  {mlflowRuns.map((run) => (
                    <tr
                      key={run.run_id}
                      onClick={() => setSelectedRun(run)}
                      className="hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3 text-indigo-500 dark:text-indigo-400 font-mono text-[11px] font-semibold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        {run.run_id.substring(0, 12)}
                      </td>
                      <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400 text-[11px]">
                        {formatTimestamp(run.start_time)}
                      </td>
                      <td className="px-5 py-3 text-[11px]">
                        <span className="bg-zinc-200/60 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-[10px] mr-2 text-zinc-700 dark:text-zinc-300">
                          samples:{run.param_training_size || '52'}
                        </span>
                        <span className="bg-zinc-200/60 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-[10px] text-zinc-700 dark:text-zinc-300">
                          trees:{run.param_n_estimators || '100'}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {run.metric_MAE !== undefined ? run.metric_MAE.toFixed(4) : '—'}
                      </td>
                      <td className="px-5 py-3 font-mono text-zinc-500">
                        {run.metric_RMSE !== undefined ? run.metric_RMSE.toFixed(4) : '—'}
                      </td>
                      <td className="px-5 py-3 font-mono font-semibold text-cyan-600 dark:text-cyan-400">
                        {run.metric_R2 !== undefined ? run.metric_R2.toFixed(4) : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          FINISHED
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Live Training Output Log Terminal */}
        {trainLogs && (
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-zinc-950 text-emerald-400 font-mono text-[11px] leading-relaxed max-h-[200px] overflow-y-auto whitespace-pre-wrap shadow-inner">
            {trainLogs}
          </div>
        )}
      </div>

      {/* Selected Run Details Modal */}
      {selectedRun && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                  MLflow Run Details
                </h3>
                <p className="text-[10px] font-mono text-indigo-500">{selectedRun.run_id}</p>
              </div>
              <button
                onClick={() => setSelectedRun(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="bg-zinc-100 dark:bg-zinc-950 p-3 rounded-xl space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Status:</span>
                  <span className="text-emerald-500 font-bold">{selectedRun.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Start Time:</span>
                  <span>{formatTimestamp(selectedRun.start_time)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">MAE Score:</span>
                  <span className="text-emerald-400 font-bold">{selectedRun.metric_MAE?.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">RMSE Score:</span>
                  <span>{selectedRun.metric_RMSE?.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">R² Score:</span>
                  <span className="text-cyan-400 font-bold">{selectedRun.metric_R2?.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Training Samples:</span>
                  <span>{selectedRun.param_training_size || 52}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">n_estimators:</span>
                  <span>{selectedRun.param_n_estimators || 100}</span>
                </div>
              </div>

              <div className="text-[10px] text-zinc-500 space-y-1">
                <p>Experiment: <span className="text-zinc-400">prompt-ab-scorer</span></p>
                <p>Model Registry: <span className="text-zinc-400">prompt-scorer</span></p>
                <p>Artifact Directory: <span className="text-zinc-400">./mlruns</span></p>
              </div>
            </div>

            <button
              onClick={() => setSelectedRun(null)}
              className="w-full py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
