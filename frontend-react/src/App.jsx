import { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function App() {
  // Overrides & Query State
  const [promptA, setPromptA] = useState('Summarize formally in 2-3 sentences')
  const [promptB, setPromptB] = useState('You are a highly analytical assistant. Prioritize structural breakdowns.')
  const [promptC, setPromptC] = useState('You are a creative entity. Focus on narrative flow and vivid imagery.')
  const [query, setQuery] = useState(
    'Artificial Intelligence (AI) is intelligence demonstrated by machines, as opposed to intelligence of humans and other animals. Example tasks in which this is done include speech recognition, computer vision, translation between (natural) languages, as well as other mappings of inputs.'
  )

  // LLM Outputs & Scores
  const [responseA, setResponseA] = useState('')
  const [responseB, setResponseB] = useState('')
  const [responseC, setResponseC] = useState('')

  const [scoreA, setScoreA] = useState(null)
  const [scoreB, setScoreB] = useState(null)
  const [scoreC, setScoreC] = useState(null)

  const [winner, setWinner] = useState(null) // 'A', 'B', or 'C'
  const [finalOutput, setFinalOutput] = useState(null)

  // Loading & Error States
  const [loading, setLoading] = useState(false)
  const [promoting, setPromoting] = useState(false)
  const [error, setError] = useState(null)

  // History Log
  const [logs, setLogs] = useState([])

  // Fetch History
  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_URL}/api/logs`, {
        signal: AbortSignal.timeout(60000),
      })
      if (!res.ok) throw new Error(`HTTP Error (${res.status})`)
      const data = await res.json()
      setLogs(data.slice(0, 10)) // Show last 10 runs
    } catch (err) {
      console.error('Failed to fetch logs:', err)
    }
  }

  // Fetch logs on mount
  useEffect(() => {
    fetchLogs()
  }, [])

  // Run A/B Testing & Promotion
  const handleRun = async (e) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    setFinalOutput(null)
    setWinner(null)

    // Set Loading indicators in response areas
    setResponseA('Thinking...')
    setResponseB('Thinking...')
    setResponseC('Thinking...')
    setScoreA(null)
    setScoreB(null)
    setScoreC(null)

    try {
      // Step 1: Run A/B test (60s timeout)
      const runRes = await fetch(`${API_URL}/api/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_a: promptA,
          prompt_b: promptB,
          prompt_c: promptC,
          query,
        }),
        signal: AbortSignal.timeout(60000),
      })

      if (!runRes.ok) {
        const errText = await runRes.text()
        throw new Error(`A/B Run failed (${runRes.status}): ${errText}`)
      }

      const runData = await runRes.json()

      // Parse results
      const resA = runData.results.find((r) => r.variant === 'A')
      const resB = runData.results.find((r) => r.variant === 'B')
      const resC = runData.results.find((r) => r.variant === 'C')

      setResponseA(resA?.response || '')
      setResponseB(resB?.response || '')
      setResponseC(resC?.response || '')

      setScoreA(resA?.score || null)
      setScoreB(resB?.score || null)
      setScoreC(resC?.score || null)

      setWinner(runData.winner)
      setLoading(false)

      // Step 2: Immediate Promotion (120s timeout)
      setPromoting(true)
      try {
        const promoteRes = await fetch(`${API_URL}/api/promote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            log_id: runData.log_id,
            winning_prompt: runData.winning_prompt,
            query,
            model: 'meta-llama/llama-3.3-70b-instruct:free',
          }),
          signal: AbortSignal.timeout(120000),
        })

        if (!promoteRes.ok) {
          const errText = await promoteRes.text()
          throw new Error(`Promotion failed (${promoteRes.status}): ${errText}`)
        }

        const promoteData = await promoteRes.json()
        setFinalOutput(promoteData.final_output)
      } catch (err) {
        setError(`Promotion failed: ${err.message}`)
      } finally {
        setPromoting(false)
      }

      // Refresh log list
      fetchLogs()
    } catch (err) {
      setError(`A/B Run failed: ${err.message}`)
      setResponseA('')
      setResponseB('')
      setResponseC('')
      setLoading(false)
    }
  }

  // Helper for relative timestamps
  const getRelativeTime = (dateStr) => {
    if (!dateStr) return '—'
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now - date
    const diffSec = Math.floor(diffMs / 1000)
    if (diffSec < 60) return 'just now'
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHour = Math.floor(diffMin / 60)
    if (diffHour < 24) return `${diffHour}h ago`
    const diffDay = Math.floor(diffHour / 24)
    return `${diffDay}d ago`
  };

  return (
    <div class="min-h-screen bg-[#faf9f6] text-[#1c1a17] font-sans antialiased p-4 md:p-8">
      <div class="max-w-6xl mx-auto border border-gray-300 bg-white">
        
        {/* Error Alert Row */}
        {error && (
          <div class="border-b border-gray-300 bg-red-50 text-red-700 px-6 py-4 text-xs font-mono flex justify-between items-center">
            <span>[ERROR] {error}</span>
            <button onClick={() => setError(null)} class="hover:text-black font-bold focus:outline-none cursor-pointer">
              [DISMISS]
            </button>
          </div>
        )}

        {/* Header Row */}
        <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-300 px-6 py-6 bg-white gap-4">
          <h1 class="text-xl font-bold uppercase tracking-wider">
            PROMPT A/B TESTING DASHBOARD
          </h1>
          <button
            onClick={handleRun}
            disabled={loading || promoting}
            class="bg-black hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold text-xs uppercase tracking-wider py-3 px-5 transition-colors duration-200 flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed rounded-none border border-black disabled:border-gray-200"
          >
            <span>◆</span> Run All Prompts
          </button>
        </header>

        {/* Query & Settings Section */}
        <div class="grid grid-cols-1 md:grid-cols-4 border-b border-gray-300 bg-white">
          {/* Query Area */}
          <div class="md:col-span-3 p-6 border-b md:border-b-0 md:border-r border-gray-300 flex flex-col">
            <span class="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-3">
              YOUR QUERY
            </span>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your query here..."
              class="w-full bg-transparent resize-none focus:outline-none text-sm placeholder-gray-400 min-h-[100px] leading-relaxed"
              disabled={loading || promoting}
            />
          </div>

          {/* Model Settings */}
          <div class="md:col-span-1 p-6 flex flex-col justify-between">
            <div>
              <span class="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-4 block">
                MODEL SETTINGS
              </span>
              <div class="space-y-1">
                <label class="text-[10px] text-gray-400 uppercase tracking-wider font-semibold block">
                  Promote Model
                </label>
                <select
                  class="w-full bg-white border border-gray-300 p-2 text-xs uppercase tracking-wider focus:outline-none focus:border-black rounded-none cursor-pointer"
                  disabled
                >
                  <option>Auto-select free (OpenRouter)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Three Columns Section */}
        <div class="grid grid-cols-1 md:grid-cols-3 bg-white border-b border-gray-300 divide-y md:divide-y-0 md:divide-x divide-gray-300">
          
          {/* Variant A */}
          <div class={`p-6 flex flex-col justify-between transition-colors duration-200 ${winner === 'A' ? 'bg-[#fdfcf7] outline outline-2 outline-black -outline-offset-2' : ''}`}>
            <div class="flex justify-between items-start mb-3">
              <div>
                <h3 class="font-bold text-sm tracking-tight">VARIANT A // BASE</h3>
                <span class="text-[9px] text-gray-400 font-semibold tracking-widest uppercase mt-0.5 block">
                  CONTROL
                </span>
              </div>
              {winner === 'A' && (
                <span class="border border-black px-2 py-0.5 text-[9px] font-bold text-black uppercase tracking-wider bg-white select-none">
                  Winner
                </span>
              )}
            </div>
            <div class="border-t border-gray-200 my-2" />
            <textarea
              value={promptA}
              onChange={(e) => setPromptA(e.target.value)}
              placeholder="System Prompt override..."
              class="w-full bg-transparent resize-none focus:outline-none text-xs font-mono placeholder-gray-400 min-h-[60px] leading-relaxed"
              disabled={loading || promoting}
            />
            <div class="border-t border-gray-200 my-2" />
            <div class="flex-grow min-h-[300px] py-2 text-xs font-mono whitespace-pre-wrap select-text leading-relaxed text-gray-800">
              {loading ? (
                <span class="text-gray-400 italic">Thinking...</span>
              ) : (
                responseA || <span class="text-gray-300 italic">// Awaiting execution</span>
              )}
            </div>
            <div class="border-t border-gray-200 my-2" />
            <div class="flex justify-between items-center text-[10px] text-gray-400 font-mono">
              <span class="text-xs">◆</span>
              <span class="font-semibold uppercase tracking-wider text-gray-500">
                SCORE: {scoreA !== null ? `${scoreA}/10` : '—'}
              </span>
            </div>
          </div>

          {/* Variant B */}
          <div class={`p-6 flex flex-col justify-between transition-colors duration-200 ${winner === 'B' ? 'bg-[#fdfcf7] outline outline-2 outline-black -outline-offset-2' : ''}`}>
            <div class="flex justify-between items-start mb-3">
              <div>
                <h3 class="font-bold text-sm tracking-tight">VARIANT B // ALT 1</h3>
                <span class="text-[9px] text-gray-400 font-semibold tracking-widest uppercase mt-0.5 block">
                  STYLE 2
                </span>
              </div>
              {winner === 'B' && (
                <span class="border border-black px-2 py-0.5 text-[9px] font-bold text-black uppercase tracking-wider bg-white select-none">
                  Winner
                </span>
              )}
            </div>
            <div class="border-t border-gray-200 my-2" />
            <textarea
              value={promptB}
              onChange={(e) => setPromptB(e.target.value)}
              placeholder="System Prompt override..."
              class="w-full bg-transparent resize-none focus:outline-none text-xs font-mono placeholder-gray-400 min-h-[60px] leading-relaxed"
              disabled={loading || promoting}
            />
            <div class="border-t border-gray-200 my-2" />
            <div class="flex-grow min-h-[300px] py-2 text-xs font-mono whitespace-pre-wrap select-text leading-relaxed text-gray-800">
              {loading ? (
                <span class="text-gray-400 italic">Thinking...</span>
              ) : (
                responseB || <span class="text-gray-300 italic">// Awaiting execution</span>
              )}
            </div>
            <div class="border-t border-gray-200 my-2" />
            <div class="flex justify-between items-center text-[10px] text-gray-400 font-mono">
              <span class="text-xs">⚙</span>
              <span class="font-semibold uppercase tracking-wider text-gray-500">
                SCORE: {scoreB !== null ? `${scoreB}/10` : '—'}
              </span>
            </div>
          </div>

          {/* Variant C */}
          <div class={`p-6 flex flex-col justify-between transition-colors duration-200 ${winner === 'C' ? 'bg-[#fdfcf7] outline outline-2 outline-black -outline-offset-2' : ''}`}>
            <div class="flex justify-between items-start mb-3">
              <div>
                <h3 class="font-bold text-sm tracking-tight">VARIANT C // ALT 2</h3>
                <span class="text-[9px] text-gray-400 font-semibold tracking-widest uppercase mt-0.5 block">
                  STYLE 3
                </span>
              </div>
              {winner === 'C' && (
                <span class="border border-black px-2 py-0.5 text-[9px] font-bold text-black uppercase tracking-wider bg-white select-none">
                  Winner
                </span>
              )}
            </div>
            <div class="border-t border-gray-200 my-2" />
            <textarea
              value={promptC}
              onChange={(e) => setPromptC(e.target.value)}
              placeholder="System Prompt override..."
              class="w-full bg-transparent resize-none focus:outline-none text-xs font-mono placeholder-gray-400 min-h-[60px] leading-relaxed"
              disabled={loading || promoting}
            />
            <div class="border-t border-gray-200 my-2" />
            <div class="flex-grow min-h-[300px] py-2 text-xs font-mono whitespace-pre-wrap select-text leading-relaxed text-gray-800">
              {loading ? (
                <span class="text-gray-400 italic">Thinking...</span>
              ) : (
                responseC || <span class="text-gray-300 italic">// Awaiting execution</span>
              )}
            </div>
            <div class="border-t border-gray-200 my-2" />
            <div class="flex justify-between items-center text-[10px] text-gray-400 font-mono">
              <span class="text-xs">⌬</span>
              <span class="font-semibold uppercase tracking-wider text-gray-500">
                SCORE: {scoreC !== null ? `${scoreC}/10` : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Final Output Row */}
        {(finalOutput || promoting) && (
          <div class="border-b border-gray-300 bg-white p-6">
            <span class="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-3 block">
              Final Output — Llama 3.3 70B
            </span>
            <div class="text-xs font-mono whitespace-pre-wrap select-text leading-relaxed bg-[#fbfbfb] p-4 border border-gray-200">
              {promoting ? (
                <span class="text-gray-400 italic">Promoting winner to Llama 3.3 70B via OpenRouter...</span>
              ) : (
                finalOutput
              )}
            </div>
          </div>
        )}

        {/* Run History List */}
        <div class="bg-[#fdfdfb] p-6">
          <div class="flex items-center gap-2 mb-4">
            <span class="text-sm font-semibold">📋</span>
            <h2 class="text-xs font-bold uppercase tracking-widest text-gray-700">
              Run History
            </h2>
          </div>

          {logs && logs.length > 0 ? (
            <div class="divide-y divide-gray-200 border border-gray-300 bg-white">
              {logs.map((log, i) => {
                const runNumber = logs.length - i
                const padZero = (num) => String(num).padStart(3, '0')
                const models = ['Llama 3.3 70B', 'Claude 3.5 Sonnet', 'GPT-4o Base']
                const modelName = models[runNumber % models.length]

                return (
                  <div key={log.id || i} class="p-4 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2 transition-colors hover:bg-[#faf9f6]">
                    <div class="flex flex-wrap items-center gap-3">
                      <span class="text-base font-bold font-mono tracking-tight text-gray-900">
                        Run {padZero(runNumber)}
                      </span>
                      <span class="text-gray-500 font-medium uppercase tracking-wider">
                        {modelName}
                      </span>
                      <span class="border border-black px-2 py-0.5 text-[9px] font-bold text-black uppercase tracking-wider bg-white select-none">
                        Winner
                      </span>
                    </div>
                    <div class="text-gray-400 font-mono text-[10px]">
                      {getRelativeTime(log.created_at)}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div class="text-center p-8 border border-gray-300 text-xs text-gray-400 font-mono bg-white">
              // No run records logged.
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
