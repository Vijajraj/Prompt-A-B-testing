import { useState, useEffect } from 'react'

export default function MLflowReport({ apiUrl }) {
  const [modelStatus, setModelStatus] = useState(null)
  const [mlflowRuns, setMlflowRuns] = useState([])
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [loadingRuns, setLoadingRuns] = useState(true)
  const [training, setTraining] = useState(false)
  const [trainLogs, setTrainLogs] = useState('')

  const fetchModelStatus = async () => {
    setLoadingStatus(true)
    try {
      const res = await fetch(`${apiUrl}/api/model/status`)
      if (!res.ok) throw new Error('Failed to fetch model status')
      const data = await res.json()
      setModelStatus(data)
    } catch (err) {
      console.error(err)
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
      console.error(err)
    } finally {
      setLoadingRuns(false)
    }
  }

  useEffect(() => {
    fetchModelStatus()
    fetchMlflowRuns()
  }, [apiUrl])

  const handleTrainModel = async () => {
    setTraining(true)
    setTrainLogs('Initializing MLflow training run...\n')
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

  return (
    <div className="bg-white border border-zinc-200 dark:bg-zinc-950/40 dark:backdrop-blur-md dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl transition-all duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-200 dark:border-zinc-800/60 bg-zinc-50/60 dark:bg-zinc-900/10 px-6 py-4">
        <div>
          <h2 className="text-sm font-bold tracking-tight uppercase text-zinc-800 dark:text-zinc-300 font-sans flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            MLflow Experiment Report
          </h2>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono mt-0.5 uppercase tracking-wide">
            Experiment: <span className="text-indigo-500 font-semibold">prompt-ab-scorer</span> | Registered Model: <span className="text-cyan-500 font-semibold">prompt-scorer</span>
          </p>
        </div>
        
        <div className="flex items-center gap-3 mt-4 sm:mt-0">
          <button
            onClick={() => { fetchModelStatus(); fetchMlflowRuns(); }}
            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium transition-all cursor-pointer"
          >
            Refresh MLflow Data
          </button>
          <button
            onClick={handleTrainModel}
            disabled={training}
            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 disabled:from-zinc-800 disabled:to-zinc-800 text-white font-medium text-xs shadow-md transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            {training ? 'Logging MLflow Run...' : '+ New MLflow Run'}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-4 bg-zinc-50/50 dark:bg-zinc-900/30">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Active Scorer Engine</span>
            <div className="text-base font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1 uppercase">
              {modelStatus?.active_scorer || 'judge'}
            </div>
            <span className="text-[9px] text-zinc-500 font-mono mt-0.5 block">Mode: {modelStatus?.scorer_mode || 'auto'}</span>
          </div>

          <div className="border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-4 bg-zinc-50/50 dark:bg-zinc-900/30">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Mean Absolute Error (MAE)</span>
            <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              {modelStatus?.mae !== undefined ? modelStatus.mae.toFixed(4) : 'N/A'}
            </div>
            <span className="text-[9px] text-zinc-500 font-mono mt-0.5 block">RMSE: {modelStatus?.rmse !== undefined ? modelStatus.rmse.toFixed(4) : 'N/A'}</span>
          </div>

          <div className="border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-4 bg-zinc-50/50 dark:bg-zinc-900/30">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">R² Accuracy Score</span>
            <div className="text-base font-bold font-mono text-cyan-600 dark:text-cyan-400 mt-1">
              {modelStatus?.r2 !== undefined ? modelStatus.r2.toFixed(4) : 'N/A'}
            </div>
            <span className="text-[9px] text-zinc-500 font-mono mt-0.5 block">Goodness of fit</span>
          </div>

          <div className="border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-4 bg-zinc-50/50 dark:bg-zinc-900/30">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Dataset Sample Size</span>
            <div className="text-base font-bold font-mono text-zinc-800 dark:text-zinc-200 mt-1">
              {modelStatus?.training_rows || '0'} rows
            </div>
            <span className="text-[9px] text-zinc-500 font-mono mt-0.5 block">Last Trained: {formatTimestamp(modelStatus?.last_trained)}</span>
          </div>
        </div>

        {/* Feature Importance Section */}
        {modelStatus?.feature_importances && (
          <div className="border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 bg-zinc-50/20 dark:bg-zinc-950/20 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800 pb-2">
              Random Forest Feature Importance Weights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 pt-1">
              {Object.entries(modelStatus.feature_importances)
                .sort((a, b) => b[1] - a[1])
                .map(([name, val]) => (
                  <div key={name} className="space-y-1 text-xs">
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-zinc-600 dark:text-zinc-400">{name}</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">{(val * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-1.5 rounded-full"
                        style={{ width: `${val * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* MLflow Experiment Runs Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              MLflow Experiment Run Logs
            </h3>
            <span className="text-[10px] text-zinc-400 font-mono">TRACKING REGISTRY: ./mlruns</span>
          </div>

          {loadingRuns ? (
            <div className="text-center py-8 text-zinc-400 text-xs">Loading MLflow run history...</div>
          ) : mlflowRuns.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 italic text-xs border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
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
                    <tr key={run.run_id} className="hover:bg-zinc-100/50 dark:hover:bg-zinc-900/10 transition-colors">
                      <td className="px-5 py-3 text-indigo-500 dark:text-indigo-400 font-mono text-[11px] font-semibold">
                        {run.run_id.substring(0, 12)}
                      </td>
                      <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400 text-[11px]">
                        {formatTimestamp(run.start_time)}
                      </td>
                      <td className="px-5 py-3 text-[11px]">
                        <span className="bg-zinc-200/60 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-[10px] mr-2">
                          samples:{run.param_training_size || '52'}
                        </span>
                        <span className="bg-zinc-200/60 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-[10px]">
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

        {/* Live Training Output Log */}
        {trainLogs && (
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-zinc-950 text-emerald-400 font-mono text-[11px] leading-relaxed max-h-[200px] overflow-y-auto whitespace-pre-wrap shadow-inner">
            {trainLogs}
          </div>
        )}
      </div>
    </div>
  )
}
