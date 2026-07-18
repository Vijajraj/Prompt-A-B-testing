import { useState, useEffect } from 'react'

export default function MLOpsDashboard({ apiUrl }) {
  const [modelStatus, setModelStatus] = useState(null)
  const [mlflowRuns, setMlflowRuns] = useState([])
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [loadingRuns, setLoadingRuns] = useState(true)
  const [training, setTraining] = useState(false)
  const [trainLogs, setTrainLogs] = useState('')
  const [driftReportUrl, setDriftReportUrl] = useState('')
  const [activeSubTab, setActiveSubTab] = useState('status') // 'status', 'runs', 'drift'

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
    setDriftReportUrl(`${apiUrl}/api/drift-report?t=${Date.now()}`)
  }, [apiUrl])

  const handleTrainModel = async () => {
    setTraining(true)
    setTrainLogs('Starting training job...\n')
    try {
      const res = await fetch(`${apiUrl}/api/train`, { method: 'POST' })
      if (!res.ok) throw new Error('Training request failed')
      const data = await res.json()
      if (data.status === 'success') {
        setTrainLogs((prev) => prev + `Success: ${data.message}\n\nMetrics:\n${data.output}`)
        fetchModelStatus()
        fetchMlflowRuns()
        setDriftReportUrl(`${apiUrl}/api/drift-report?t=${Date.now()}`)
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
      {/* Tab Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-200 dark:border-zinc-800/60 bg-zinc-50/60 dark:bg-zinc-900/10 px-6 py-4">
        <div>
          <h2 className="text-sm font-bold tracking-tight uppercase text-zinc-800 dark:text-zinc-300 font-sans">
            MLOps Control Center
          </h2>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono mt-0.5 uppercase tracking-wide">
            Model registry, tracking, and drift detection
          </p>
        </div>
        
        {/* Sub-tabs */}
        <div className="flex items-center gap-2 mt-4 sm:mt-0 font-sans text-xs">
          <button
            onClick={() => setActiveSubTab('status')}
            className={`px-3 py-1.5 rounded-lg border font-medium transition-all cursor-pointer ${
              activeSubTab === 'status'
                ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/30 dark:border-indigo-800/80 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            Model Status
          </button>
          <button
            onClick={() => setActiveSubTab('runs')}
            className={`px-3 py-1.5 rounded-lg border font-medium transition-all cursor-pointer ${
              activeSubTab === 'runs'
                ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/30 dark:border-indigo-800/80 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            MLflow Runs
          </button>
          <button
            onClick={() => setActiveSubTab('drift')}
            className={`px-3 py-1.5 rounded-lg border font-medium transition-all cursor-pointer ${
              activeSubTab === 'drift'
                ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/30 dark:border-indigo-800/80 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            Evidently Drift Report
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Model Status Sub-tab */}
        {activeSubTab === 'status' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Model Metadata Card */}
              <div className="lg:col-span-2 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-5 bg-zinc-50/20 dark:bg-zinc-950/20 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Model Information
                  </h3>
                  {loadingStatus ? (
                    <span className="text-[10px] text-zinc-400">Loading...</span>
                  ) : modelStatus?.exists ? (
                    <span className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      ACTIVE MODEL
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-100 dark:border-amber-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      LLM FALLBACK ACTIVE
                    </span>
                  )}
                </div>

                {loadingStatus ? (
                  <div className="animate-pulse space-y-2 py-4">
                    <div className="h-4 bg-zinc-200 dark:bg-zinc-800 w-2/3 rounded" />
                    <div className="h-4 bg-zinc-200 dark:bg-zinc-800 w-1/2 rounded" />
                    <div className="h-4 bg-zinc-200 dark:bg-zinc-800 w-3/4 rounded" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans text-zinc-600 dark:text-zinc-400">
                    <div className="space-y-2">
                      <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-900 pb-1">
                        <span className="text-zinc-400">Registry Name:</span>
                        <span className="font-semibold font-mono text-zinc-800 dark:text-zinc-200">prompt-scorer</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-900 pb-1">
                        <span className="text-zinc-400">Model Type:</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">Random Forest Regressor</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-900 pb-1">
                        <span className="text-zinc-400">Training Sample Size:</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{modelStatus?.training_rows || '0'} rows</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-900 pb-1">
                        <span className="text-zinc-400">Active Scorer Mode:</span>
                        <span className="font-semibold font-mono text-indigo-500 uppercase">{modelStatus?.active_scorer || 'judge'}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-900 pb-1">
                        <span className="text-zinc-400">Mean Absolute Error (MAE):</span>
                        <span className="font-semibold font-mono text-emerald-500">{modelStatus?.mae?.toFixed(4) || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-900 pb-1">
                        <span className="text-zinc-400">Root Mean Squared Error (RMSE):</span>
                        <span className="font-semibold font-mono text-emerald-500">{modelStatus?.rmse?.toFixed(4) || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-900 pb-1">
                        <span className="text-zinc-400">R² Score (Accuracy):</span>
                        <span className="font-semibold font-mono text-emerald-500">{modelStatus?.r2?.toFixed(4) || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-900 pb-1">
                        <span className="text-zinc-400">Last Trained:</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{formatTimestamp(modelStatus?.last_trained)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Training Trigger Box */}
              <div className="border border-zinc-200 dark:border-zinc-850 rounded-2xl p-5 bg-zinc-50/20 dark:bg-zinc-950/20 flex flex-col justify-between gap-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
                    Continuous Retraining
                  </h3>
                  <p className="text-xs text-zinc-500 mt-3 leading-relaxed">
                    Trigger Random Forest regressor retraining on the latest Supabase bootstrap training data. Logs will be recorded in MLflow.
                  </p>
                </div>
                <button
                  onClick={handleTrainModel}
                  disabled={training}
                  className="w-full bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 text-white font-semibold text-xs uppercase tracking-wider py-2.5 rounded-xl transition-all cursor-pointer shadow-md hover:shadow-[0_0_15px_rgba(99,102,241,0.2)] disabled:cursor-not-allowed"
                >
                  {training ? 'Training Pipeline Running...' : 'Retrain Model Now'}
                </button>
              </div>
            </div>

            {/* Feature Importance Plot */}
            {modelStatus?.feature_importances && (
              <div className="border border-zinc-200 dark:border-zinc-850 rounded-2xl p-5 bg-zinc-50/20 dark:bg-zinc-950/20 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
                  Feature Importance (Random Forest Regressor)
                </h3>
                <div className="space-y-3.5">
                  {Object.entries(modelStatus.feature_importances)
                    .sort((a, b) => b[1] - a[1])
                    .map(([name, val]) => (
                      <div key={name} className="space-y-1 text-xs">
                        <div className="flex justify-between font-mono">
                          <span className="text-zinc-600 dark:text-zinc-400">{name}</span>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-250">{(val * 100).toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-zinc-100 dark:bg-zinc-900 rounded-full h-1.5 overflow-hidden">
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

            {/* Live stdout stream of training logs */}
            {trainLogs && (
              <div className="border border-zinc-200 dark:border-zinc-850 rounded-2xl p-4 bg-zinc-950 text-emerald-400 font-mono text-[11px] leading-relaxed max-h-[250px] overflow-y-auto whitespace-pre-wrap select-text shadow-inner">
                {trainLogs}
              </div>
            )}
          </div>
        )}

        {/* MLflow Runs Sub-tab */}
        {activeSubTab === 'runs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Experiment Runs tracking (MLflow)
              </h3>
              <button
                onClick={fetchMlflowRuns}
                className="text-[10px] font-semibold text-indigo-500 hover:underline cursor-pointer"
              >
                Refresh Runs
              </button>
            </div>

            {loadingRuns ? (
              <div className="text-center py-10 text-zinc-400 text-xs">Loading experiment runs...</div>
            ) : mlflowRuns.length === 0 ? (
              <div className="text-center py-10 text-zinc-500 italic text-xs border border-dashed border-zinc-200 dark:border-zinc-850 rounded-xl">
                No runs recorded yet in prompt-ab-scorer experiment.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-950/40">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-zinc-100 text-zinc-500 dark:bg-zinc-900/60 dark:text-zinc-400 text-[10px] uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800/80">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Run ID</th>
                      <th className="px-5 py-3 font-semibold">Timestamp</th>
                      <th className="px-5 py-3 font-semibold">Params</th>
                      <th className="px-5 py-3 font-semibold">MAE</th>
                      <th className="px-5 py-3 font-semibold">RMSE</th>
                      <th className="px-5 py-3 font-semibold">R²</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 text-zinc-700 dark:text-zinc-350">
                    {mlflowRuns.map((run) => (
                      <tr key={run.run_id} className="hover:bg-zinc-100/50 dark:hover:bg-zinc-900/10 transition-colors">
                        <td className="px-5 py-3 text-zinc-400 dark:text-zinc-550 font-mono text-[10px]">
                          {run.run_id.substring(0, 12)}
                        </td>
                        <td className="px-5 py-3 text-zinc-500 dark:text-zinc-450 font-sans">
                          {formatTimestamp(run.start_time)}
                        </td>
                        <td className="px-5 py-3 font-sans max-w-xs truncate">
                          <span className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-[10px] mr-2">
                            size:{run.param_training_size || 'N/A'}
                          </span>
                          <span className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-[10px]">
                            trees:{run.param_n_estimators || 'N/A'}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-mono font-semibold text-emerald-500">
                          {run.metric_MAE !== undefined ? run.metric_MAE.toFixed(4) : '—'}
                        </td>
                        <td className="px-5 py-3 font-mono text-zinc-500">
                          {run.metric_RMSE !== undefined ? run.metric_RMSE.toFixed(4) : '—'}
                        </td>
                        <td className="px-5 py-3 font-mono font-semibold text-indigo-500">
                          {run.metric_R2 !== undefined ? run.metric_R2.toFixed(4) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Drift Report Sub-tab */}
        {activeSubTab === 'drift' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Evidently AI Data Drift Report
              </h3>
              <a
                href={driftReportUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] font-semibold text-indigo-500 hover:underline flex items-center gap-1 cursor-pointer"
              >
                Open Fullscreen
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>

            <div className="w-full aspect-[4/3] min-h-[600px] border border-zinc-200 dark:border-zinc-850 rounded-2xl overflow-hidden shadow-inner bg-white">
              <iframe
                src={driftReportUrl}
                title="Evidently Drift Report"
                className="w-full h-full border-0"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
