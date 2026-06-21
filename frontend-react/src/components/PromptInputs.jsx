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

  // Modern SaaS Editor Box
  const EditorBox = ({ value, onChange, label, filename, rows = 3 }) => {
    return (
      <div className="border border-zinc-200 dark:border-zinc-800/80 rounded-2xl overflow-hidden bg-white dark:bg-zinc-950/40 dark:backdrop-blur-md shadow-lg transition-all duration-300 hover:border-zinc-300 dark:hover:border-zinc-700/60">
        {/* Editor Tab Header */}
        <div className="flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-900/60 px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800/60 select-none">
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 font-sans tracking-wide">
              {filename}
            </span>
          </div>
          <span className="text-[9px] text-zinc-400 dark:text-zinc-600 uppercase tracking-widest font-mono">system</span>
        </div>
        
        {/* Editor Body */}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          disabled={isDisabled}
          className="w-full bg-transparent resize-none focus:outline-none px-4 py-3.5 text-sm leading-relaxed text-zinc-800 placeholder-zinc-300 dark:text-zinc-200 dark:placeholder-zinc-700 focus:bg-zinc-50/20 dark:focus:bg-zinc-950/20 transition-all font-sans"
          placeholder={`Enter configuration for ${label}...`}
        />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 3 Prompts side by side */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <EditorBox
          value={promptA}
          onChange={setPromptA}
          label="Prompt A"
          filename="variant_a.prompt"
          rows={4}
        />
        <EditorBox
          value={promptB}
          onChange={setPromptB}
          label="Prompt B"
          filename="variant_b.prompt"
          rows={4}
        />
        <EditorBox
          value={promptC}
          onChange={setPromptC}
          label="Prompt C"
          filename="variant_c.prompt"
          rows={4}
        />
      </div>

      {/* Query input panel */}
      <EditorBox
        value={query}
        onChange={setQuery}
        label="User Query"
        filename="user_message.query"
        rows={4}
      />

      {/* Controls: Model Select & Run Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-50 border border-zinc-200 dark:bg-zinc-900/20 dark:border-zinc-800/80 p-4 rounded-2xl">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium whitespace-nowrap">Target Model:</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={isDisabled}
            className="w-full sm:w-64 bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
          >
            {MODEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-white text-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={isDisabled}
          className="w-full sm:w-48 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 disabled:from-zinc-100 disabled:to-zinc-100 dark:disabled:from-zinc-900 dark:disabled:to-zinc-900 disabled:text-zinc-400 dark:disabled:text-zinc-600 text-white font-semibold text-xs uppercase tracking-wider py-2.5 px-6 rounded-xl transition-all duration-200 cursor-pointer disabled:cursor-not-allowed shadow-md hover:shadow-[0_0_20px_rgba(99,102,241,0.25)]"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              Running Test
            </span>
          ) : promoting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              Promoting
            </span>
          ) : (
            'Run A/B Test'
          )}
        </button>
      </div>
    </form>
  )
}
