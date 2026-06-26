import { useState, useEffect } from 'react'
import PromptInputs from './components/PromptInputs'
import ResultsGrid from './components/ResultsGrid'
import WinnerBanner from './components/WinnerBanner'
import RunHistory from './components/RunHistory'
import PipelineVisualizer from './components/PipelineVisualizer'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export default function App() {
  const [results, setResults] = useState(null)
  const [winner, setWinner] = useState(null)
  const [winningPrompt, setWinningPrompt] = useState('')
  const [finalOutput, setFinalOutput] = useState(null)
  const [loading, setLoading] = useState(false)
  const [promoting, setPromoting] = useState(false)
  const [error, setError] = useState(null)
  const [logId, setLogId] = useState(null)
  
  // Pipeline state: 'idle', 'running-ab', 'evaluating', 'promoting', 'complete'
  const [pipelineState, setPipelineState] = useState('idle')

  // Theme state: 'light' or 'dark' (defaulting to light as per user request)
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'light'
    }
    return 'light'
  })

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
    setLoading(true)
    setPipelineState('running-ab')

    try {
      // Step 1: Run A/B test on Groq
      const runRes = await fetch(`${API_URL}/api/run`, {
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
      
      // Micro-delay to let the user see the Judge active state
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Step 3: Auto-promote winner to OpenRouter
      setPipelineState('promoting')
      setPromoting(true)
      setLoading(false)

      const promoteRes = await fetch(`${API_URL}/api/promote`, {
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
      setError(err.message)
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
                A/B TESTING & AUTO-PROMOTION WORKBENCH
              </p>
            </div>
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
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ACTIVE
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 relative z-10">
        {/* Error notification */}
        {error && (
          <div className="bg-red-55 border border-red-200 dark:bg-red-950/20 dark:border-red-900/50 rounded-2xl p-4 text-red-600 dark:text-red-400 text-xs font-sans shadow-lg flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className="font-bold">System Runtime Exception</p>
              <p className="mt-0.5 opacity-80 break-all">{error}</p>
            </div>
          </div>
        )}

        {/* Dynamic Pipeline Flow Indicator */}
        <PipelineVisualizer currentState={pipelineState} winner={winner} />

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
              <ResultsGrid results={results} winner={winner} />
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
      </main>
    </div>
  )
}
