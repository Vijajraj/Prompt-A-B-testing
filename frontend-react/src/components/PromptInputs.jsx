import { useState } from 'react'

const MODEL_OPTIONS = [
  { label: 'Auto-Select Free (OpenRouter)', value: 'openrouter/free' },
  { label: 'Llama 3.3 70B (Free)', value: 'meta-llama/llama-3.3-70b-instruct:free' },
  { label: 'Gemma 4 31B (Free)', value: 'google/gemma-4-31b-it:free' },
  { label: 'GPT OSS 120B (Free)', value: 'openai/gpt-oss-120b:free' },
  { label: 'Llama 3.2 3B (Free)', value: 'meta-llama/llama-3.2-3b-instruct:free' },
]

export default function PromptInputs({ onRun, loading, promoting }) {
  const [promptA, setPromptA] = useState('Summarize formally in 2-3 sentences')
  const [promptB, setPromptB] = useState('Summarize as 3-5 bullet points')
  const [promptC, setPromptC] = useState('Summarize in simple everyday language')
  const [query, setQuery] = useState(
    'Artificial Intelligence (AI) is intelligence demonstrated by machines, as opposed to intelligence of humans and other animals. Example tasks in which this is done include speech recognition, computer vision, translation between (natural) languages, as well as other mappings of inputs.'
  )
  const [model, setModel] = useState(MODEL_OPTIONS[0].value)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!promptA.trim() || !promptB.trim() || !promptC.trim() || !query.trim()) return
    onRun({ promptA, promptB, promptC, query, model })
  }

  const isDisabled = loading || promoting

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Prompt A and B side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Prompt A <span className="text-gray-500">(System Prompt Variant 1)</span>
          </label>
          <textarea
            value={promptA}
            onChange={(e) => setPromptA(e.target.value)}
            rows={3}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-colors resize-none"
            placeholder="Enter system prompt variant A..."
            disabled={isDisabled}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Prompt B <span className="text-gray-500">(System Prompt Variant 2)</span>
          </label>
          <textarea
            value={promptB}
            onChange={(e) => setPromptB(e.target.value)}
            rows={3}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-colors resize-none"
            placeholder="Enter system prompt variant B..."
            disabled={isDisabled}
          />
        </div>
      </div>

      {/* Prompt C full width */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Prompt C <span className="text-gray-500">(System Prompt Variant 3)</span>
        </label>
        <textarea
          value={promptC}
          onChange={(e) => setPromptC(e.target.value)}
          rows={3}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-colors resize-none"
          placeholder="Enter system prompt variant C..."
          disabled={isDisabled}
        />
      </div>

      {/* Query full width */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Your Query <span className="text-gray-500">(User Message)</span>
        </label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={4}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-colors resize-none"
          placeholder="Enter the query to test against all 3 prompts..."
          disabled={isDisabled}
        />
      </div>

      {/* Model selector + Run button */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="sm:w-72 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-colors"
          disabled={isDisabled}
        >
          {MODEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <button
          type="submit"
          disabled={isDisabled}
          className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-950 font-semibold py-2.5 px-6 rounded-lg transition-colors duration-200 cursor-pointer disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              Testing on Groq...
            </span>
          ) : promoting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              Promoting winner...
            </span>
          ) : (
            '▶ Run All Prompts'
          )}
        </button>
      </div>
    </form>
  )
}
