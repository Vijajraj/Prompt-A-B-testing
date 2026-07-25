import { useState, useEffect } from 'react'
import PromptInputs from './components/PromptInputs'
import ResultsGrid from './components/ResultsGrid'
import WinnerBanner from './components/WinnerBanner'
import RunHistory from './components/RunHistory'
import PipelineVisualizer from './components/PipelineVisualizer'
import MLflowReport from './components/MLflowReport'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

async function fetchWithRetry(url, options = {}, retries = 6, backoffMs = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options)
      if (res.ok) return res
      // Retry on 502/503/504 (Render cold-start gateway errors)
      if (res.status >= 502 && i < retries - 1) {
        await new Promise((r) => setTimeout(r, backoffMs))
        continue
      }
      return res
    } catch (err) {
      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, backoffMs))
        continue
      }
      throw err
    }
  }
}

async function waitForBackend(url, setStatus, maxAttempts = 12) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      setStatus(`WAKING UP (${i + 1}/${maxAttempts})`)
      const res = await fetch(`${url}/`, { method: 'GET', signal: AbortSignal.timeout(8000) })
      if (res.ok) {
        setStatus('ACTIVE')
        return true
      }
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, 5000))
  }
  setStatus('OFFLINE')
  return false
}

export default function App() {
  const [results, setResults] = useState(null)
  const [winner, setWinner] = useState(null)
  const [winningPrompt, setWinningPrompt] = useState('')
  const [finalOutput, setFinalOutput] = useState(null)
  const [loading, setLoading] = useState(false)
  const [promoting, setPromoting] = useState(false)
  const [error, setError] = useState(null)
  const [logId, setLogId] = useState(null)
  const [scorerUsed, setScorerUsed] = useState(null)
  const [gatewayStatus, setGatewayStatus] = useState('CHECKING')
  const [backendReady, setBackendReady] = useState(false)
  
  // Tab state: 'ab' or 'mlflow'
  const [activeTab, setActiveTab] = useState('ab')

  // Pipeline state: 'idle', 'running-ab', 'evaluating', 'promoting', 'complete'
  const [pipelineState, setPipelineState] = useState('idle')

  // Theme state: 'light' or 'dark' (defaulting to light as per user request)
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'light'
    }
    return 'light'
  })

  // Persistent warmup: keep pinging Render until it's alive (up to 60s)
  useEffect(() => {
    const warmup = async () => {
      const alive = await waitForBackend(API_URL, setGatewayStatus, 12)
      setBackendReady(alive)
    }
    warmup()
  }, [])

  useEffect(() => {
    const root = window.document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const handleRun = async ({ promptA, promptB, promptC, query, model }) => {
    setError(null)
    setResults(null)
    setWinner(null)
    setFinalOutput(null)
    setScorerUsed(null)
    setLoading(true)
    setPipelineState('running-ab')

    // If backend isn't ready yet, wait for it first
    if (!backendReady) {
      const alive = await waitForBackend(API_URL, setGatewayStatus, 12)
      setBackendReady(alive)
      if (!alive) {
        setError('Backend service could not be reached after 60 seconds. Please check Render deployment status.')
        setLoading(false)
        setPipelineState('idle')
        return
      }
    }

    try {
      // Step 1: Run A/B test on Groq with auto-retry for Render cold-starts
      const runRes = await fetchWithRetry(`${API_URL}/api/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_a: promptA,
          prompt_b: promptB,
          prompt_c: promptC,
          query,
        }),
      })

      if (!runRes.ok) {
        const errText = await runRes.text()
        throw new Error(`Run failed (${runRes.status}): ${errText}`)
      }

      const runData = await runRes.json()
      
      // Step 2: Show evaluation step
      setPipelineState('evaluating')
      setResults(runData.results)
      setWinner(runData.winner)
      setWinningPrompt(runData.winning_prompt)
      setLogId(runData.log_id)
      setScorerUsed(runData.scorer_used)
      setGatewayStatus('ACTIVE')
      setBackendReady(true)
      
      // Micro-delay for UI transition
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Step 3: Auto-promote winner to OpenRouter
      setPipelineState('promoting')
      setPromoting(true)
      setLoading(false)

      const promoteRes = await fetchWithRetry(`${API_URL}/api/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_id: runData.log_id,
          winning_prompt: runData.winning_prompt,
          query,
          model,
        }),
        signal: AbortSignal.timeout(120000),
      })

      if (!promoteRes.ok) {
        const errText = await promoteRes.text()
        throw new Error(`Promote failed (${promoteRes.status}): ${errText}`)
      }

      const promoteData = await promoteRes.json()
      setFinalOutput(promoteData)
      setPipelineState('complete')
    } catch (err) {
      const isFetchErr = err.message?.includes('Failed to fetch') || err.name === 'TypeError'
      if (isFetchErr) {
        // Auto-trigger warmup and tell user to retry
        setBackendReady(false)
        waitForBackend(API_URL, setGatewayStatus, 12).then((alive) => setBackendReady(alive))
        setError('Backend is waking up from sleep. It will be ready in ~30 seconds. Please retry after the gateway status shows ACTIVE.')
      } else {
        setError(err.message)
      }
      setPipelineState('idle')
    } finally {
      setLoading(false)
      setPromoting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] text-zinc-900 dark:bg-[#07080d] dark:text-zinc-100 relative overflow-x-hidden font-sans selection:bg-indigo-500/30 selection:text-indigo-200 transition-colors duration-300">
      {/* Sleek Design Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:5rem_5rem] pointer-events-none opacity-40 dark:opacity-[0.04]" />
      
      {/* Background Soft Purple/Blue Radial Glow */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-br from-indigo-500/5 via-purple-500/2 to-transparent dark:from-indigo-500/10 dark:via-purple-500/5 dark:to-transparent rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-950/20 backdrop-blur-md sticky top-0 z-20 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Elegant SVG Logo */}
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-950/25">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight font-sans text-zinc-900 dark:text-zinc-100">
                Prompt Studio
              </h1>
              <p className="text-[9px] text-zinc-500 dark:text-zinc-500 font-sans tracking-wider uppercase mt-0.5">
                HYBRID LLMOps + MLflow WORKBENCH
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900/60 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800/80 font-sans text-xs">
            <button
              onClick={() => setActiveTab('ab')}
              className={`px-4 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === 'ab'
                  ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-white'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              A/B Testing
            </button>
            <button
              onClick={() => setActiveTab('mlflow')}
              className={`px-4 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === 'mlflow'
                  ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-white'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              MLflow Report
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors cursor-pointer"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                // Sun Icon for dark mode
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              ) : (
                // Moon Icon for light mode
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            <div className="hidden sm:flex items-center gap-3 font-sans text-[10px]">
              <span className="text-zinc-500">API Gateway:</span>
              <span className={`flex items-center gap-1.5 font-semibold ${
                gatewayStatus === 'ACTIVE' ? 'text-emerald-500' : 'text-amber-500'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  gatewayStatus === 'ACTIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'
                }`} />
                {gatewayStatus}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 relative z-10">
        {/* Backend waking up banner */}
        {!backendReady && gatewayStatus !== 'ACTIVE' && (
          <div className="bg-indigo-50 border border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-900/50 rounded-2xl p-4 text-indigo-800 dark:text-indigo-300 text-xs font-sans shadow-lg flex items-center gap-3 animate-pulse">
            <svg className="w-5 h-5 text-indigo-500 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <div className="flex-1">
              <p className="font-bold">Waking Up Render Backend Service</p>
              <p className="mt-0.5 opacity-90">Free-tier containers sleep after 15 minutes of inactivity. Automatically reconnecting... ({gatewayStatus})</p>
            </div>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50 rounded-2xl p-4 text-amber-800 dark:text-amber-300 text-xs font-sans shadow-lg flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className="font-bold">API Connection Notice</p>
              <p className="mt-0.5 opacity-90 break-all">{error}</p>
            </div>
          </div>
        )}

        {activeTab === 'ab' ? (
          <>
            {/* Dynamic Pipeline Flow Indicator */}
            <PipelineVisualizer currentState={pipelineState} winner={winner} scorerUsed={scorerUsed} />

            {/* Full-Width Input Configuration Panel */}
            <div className="bg-white border border-zinc-200 dark:bg-zinc-950/40 dark:border-zinc-800/80 rounded-2xl p-6 space-y-4 shadow-xl transition-colors duration-300">
              <div className="border-b border-zinc-200 dark:border-zinc-800/60 pb-3">
                <h2 className="text-xs font-bold font-sans tracking-widest uppercase text-zinc-500 dark:text-zinc-400">
                  Prompt Configuration
                </h2>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 uppercase tracking-wide">
                  Configure prompt overrides and query input
                </p>
              </div>
              <PromptInputs onRun={handleRun} loading={loading} promoting={promoting} />
            </div>

            {/* Results & Promoted outputs displayed below in full width */}
            {(results || promoting) && (
              <div className="space-y-8 animate-fade-in">
                {/* Results Stdout Grid (Now gets full width layout!) */}
                {results && (
                  <ResultsGrid results={results} winner={winner} scorerUsed={scorerUsed} />
                )}

                {/* Winner output stream console */}
                {(winner || promoting) && (
                  <WinnerBanner
                    winner={winner}
                    finalOutput={finalOutput}
                    promoting={promoting}
                  />
                )}
              </div>
            )}

            {/* Database log inspector */}
            <RunHistory apiUrl={API_URL} />
          </>
        ) : (
          <MLflowReport apiUrl={API_URL} />
        )}
      </main>
    </div>
  )
}
