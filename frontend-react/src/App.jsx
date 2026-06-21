import { useState } from 'react'
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
    <div className="min-h-screen bg-[#07080d] text-gray-100 relative overflow-x-hidden font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Visual Design Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f1118_1px,transparent_1px),linear-gradient(to_bottom,#0f1118_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none opacity-20" />
      
      {/* Top Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[300px] bg-gradient-to-b from-cyan-950/20 via-purple-950/5 to-transparent rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-gray-900 bg-gray-950/30 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight font-mono flex items-center gap-2">
              <span className="text-cyan-500 select-none">⌬</span> PROMPT_STUDIO.IO
            </h1>
            <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase mt-0.5">
              LLM A/B TESTING & AUTO-PROMOTION WORKBENCH
            </p>
          </div>
          <div className="flex items-center gap-3 font-mono text-[10px]">
            <span className="text-gray-600">API_STATUS:</span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ONLINE
            </span>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6 relative z-10">
        {/* Error notification */}
        {error && (
          <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-4 text-red-400 font-mono text-xs shadow-lg flex items-start gap-3">
            <span className="text-red-500 font-bold select-none">[FATAL_ERROR]</span>
            <div className="flex-1">
              <p className="font-bold">SYSTEM RUNTIME EXCEPTION</p>
              <p className="mt-1 opacity-80 break-all">{error}</p>
            </div>
          </div>
        )}

        {/* Dynamic Pipeline Flow Indicator */}
        <PipelineVisualizer currentState={pipelineState} winner={winner} />

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Column: Input Workbench (7cols on xl) */}
          <div className="xl:col-span-7 space-y-6">
            <div className="border border-gray-900 bg-gray-950/30 rounded-xl p-5 space-y-4">
              <div className="border-b border-gray-900 pb-3">
                <h2 className="text-xs font-bold font-mono tracking-widest uppercase text-gray-400">
                  // EDITOR_WORKBENCH
                </h2>
                <p className="text-[10px] text-gray-600 font-mono mt-0.5 uppercase">
                  Configure prompt overrides and query input
                </p>
              </div>
              <PromptInputs onRun={handleRun} loading={loading} promoting={promoting} />
            </div>
          </div>

          {/* Right Column: Results & Promoted Output (5cols on xl) */}
          <div className="xl:col-span-5 space-y-6">
            {/* Winner output stream console */}
            {(winner || promoting) && (
              <WinnerBanner
                winner={winner}
                finalOutput={finalOutput}
                promoting={promoting}
              />
            )}

            {/* Results Stdout Grid */}
            {results && (
              <ResultsGrid results={results} winner={winner} />
            )}
            
            {/* If no runs yet, show empty trace workspace */}
            {!results && !promoting && (
              <div className="h-full min-h-[300px] border border-dashed border-gray-900 rounded-xl flex flex-col items-center justify-center text-center p-6 text-gray-600 font-mono text-xs">
                <span>⌬</span>
                <span className="mt-2">// RUNTIME_CONSOLE_AWAITING_INPUT</span>
                <span className="text-[10px] mt-1 text-gray-700">Submit the workspace form to trigger parallel A/B streams.</span>
              </div>
            )}
          </div>
        </div>

        {/* Database log inspector */}
        <RunHistory apiUrl={API_URL} />
      </main>
    </div>
  )
}
