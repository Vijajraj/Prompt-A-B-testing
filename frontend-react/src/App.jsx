import { useState } from 'react'
import PromptInputs from './components/PromptInputs'
import ResultsGrid from './components/ResultsGrid'
import WinnerBanner from './components/WinnerBanner'
import RunHistory from './components/RunHistory'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function App() {
  const [results, setResults] = useState(null)
  const [winner, setWinner] = useState(null)
  const [winningPrompt, setWinningPrompt] = useState('')
  const [finalOutput, setFinalOutput] = useState(null)
  const [loading, setLoading] = useState(false)
  const [promoting, setPromoting] = useState(false)
  const [error, setError] = useState(null)
  const [logId, setLogId] = useState(null)

  const handleRun = async ({ promptA, promptB, promptC, query, model }) => {
    setError(null)
    setResults(null)
    setWinner(null)
    setFinalOutput(null)
    setLoading(true)

    try {
      // Step 1: Run A/B test
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
      setResults(runData.results)
      setWinner(runData.winner)
      setWinningPrompt(runData.winning_prompt)
      setLogId(runData.log_id)
      setLoading(false)

      // Step 2: Auto-promote winner
      setPromoting(true)
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
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setPromoting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            <span className="text-amber-400">⚡</span> Prompt A/B Testing Dashboard
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Test 3 prompts on Groq — winner auto-sent to LLM via OpenRouter
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Input Section */}
        <PromptInputs onRun={handleRun} loading={loading} promoting={promoting} />

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300">
            <p className="font-semibold">Error</p>
            <p className="text-sm mt-1 break-all">{error}</p>
          </div>
        )}

        {/* Results */}
        {results && (
          <ResultsGrid results={results} winner={winner} />
        )}

        {/* Winner + Final Output */}
        {(winner || promoting) && (
          <WinnerBanner
            winner={winner}
            finalOutput={finalOutput}
            promoting={promoting}
          />
        )}

        {/* Divider */}
        <div className="border-t border-gray-800" />

        {/* Run History */}
        <RunHistory apiUrl={API_URL} />
      </main>
    </div>
  )
}
