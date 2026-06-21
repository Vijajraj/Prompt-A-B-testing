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

  // Component to simulate an IDE text editor with line numbers
  const IdeTextarea = ({ value, onChange, label, filename, rows = 3 }) => {
    const lines = value.split('\n')
    // Always show at least `rows` line numbers
    const totalLines = Math.max(lines.length, rows)
    const lineNumbers = Array.from({ length: totalLines }, (_, i) => i + 1)

    return (
      <div className="border border-gray-800 rounded-lg overflow-hidden bg-gray-950 font-mono text-xs shadow-md">
        {/* IDE Tab Header */}
        <div className="flex items-center justify-between bg-gray-900 px-4 py-2 border-b border-gray-800/80">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider ml-2">
              {filename}
            </span>
          </div>
          <span className="text-[9px] text-gray-600">UTF-8 // LF</span>
        </div>
        
        {/* Editor Body */}
        <div className="flex relative min-h-[80px]">
          {/* Line Numbers */}
          <div className="bg-gray-900/50 text-gray-600 text-right select-none pr-3 pl-2 py-3 border-r border-gray-900 w-10 shrink-0 leading-relaxed font-mono">
            {lineNumbers.map((num) => (
              <div key={num}>{num}</div>
            ))}
          </div>
          
          {/* Actual Textarea */}
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={rows}
            disabled={isDisabled}
            className="w-full bg-transparent resize-none focus:outline-none px-4 py-3 leading-relaxed text-gray-100 placeholder-gray-700 font-mono"
            placeholder={`Enter override config for ${label}...`}
          />
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 3 Prompts side by side on large, or stacked on small */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <IdeTextarea
          value={promptA}
          onChange={setPromptA}
          label="Prompt A"
          filename="system_prompt_a.cfg"
          rows={4}
        />
        <IdeTextarea
          value={promptB}
          onChange={setPromptB}
          label="Prompt B"
          filename="system_prompt_b.cfg"
          rows={4}
        />
        <IdeTextarea
          value={promptC}
          onChange={setPromptC}
          label="Prompt C"
          filename="system_prompt_c.cfg"
          rows={4}
        />
      </div>

      {/* Query input panel */}
      <IdeTextarea
        value={query}
        onChange={setQuery}
        label="User Query"
        filename="input_query.md"
        rows={5}
      />

      {/* Controls: Model Select & Run Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-gray-950/20 border border-gray-900 p-4 rounded-xl">
        <div className="flex flex-col gap-1.5 font-mono text-[10px] uppercase tracking-wider text-gray-500">
          <span>MODEL_PARAMETER</span>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={isDisabled}
            className="w-full sm:w-72 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-xs text-gray-100 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500 transition-colors uppercase cursor-pointer"
          >
            {MODEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-gray-950 text-gray-300">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 flex flex-col justify-end sm:pt-4">
          <button
            type="submit"
            disabled={isDisabled}
            className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-900 disabled:text-gray-600 text-gray-950 font-mono uppercase tracking-widest font-bold py-3 px-6 rounded-lg transition-all duration-200 cursor-pointer disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                // RUNNING_PARALLEL_RUNS
              </span>
            ) : promoting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                // ROUTING_PROMOTION
              </span>
            ) : (
              '▶ RUN_PIPELINE'
            )}
          </button>
        </div>
      </div>
    </form>
  )
}
