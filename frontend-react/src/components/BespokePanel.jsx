import React from 'react'

export default function BespokePanel({ 
  children, 
  title, 
  subtitle, 
  accentColor = 'teal', 
  className = '', 
  headerRight 
}) {
  const accentClasses = {
    teal: 'before:bg-cyan-500/80 border-cyan-950 shadow-cyan-950/5',
    purple: 'before:bg-purple-500/80 border-purple-950 shadow-purple-950/5',
    amber: 'before:bg-amber-500/80 border-amber-950 shadow-amber-950/5',
    emerald: 'before:bg-emerald-500/80 border-emerald-950 shadow-emerald-950/5',
    rose: 'before:bg-rose-500/80 border-rose-950 shadow-rose-950/5',
  }

  const selectedAccent = accentClasses[accentColor] || accentClasses.teal

  return (
    <div className={`relative overflow-hidden rounded-xl border bg-gray-950/45 backdrop-blur-md shadow-2xl p-5 transition-all duration-300 hover:border-gray-800/80 ${selectedAccent} ${className}
      before:content-[""] before:absolute before:top-0 before:left-0 before:w-[3px] before:h-full`
    }>
      {title && (
        <div className="flex items-center justify-between border-b border-gray-800/80 pb-3.5 mb-4">
          <div>
            <h3 className="font-semibold text-gray-100 tracking-tight text-sm uppercase font-mono">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[10px] text-gray-500 font-mono mt-0.5 tracking-wider uppercase">
                {subtitle}
              </p>
            )}
          </div>
          {headerRight && <div className="flex items-center">{headerRight}</div>}
        </div>
      )}
      <div className="relative z-10 text-gray-200">
        {children}
      </div>
    </div>
  )
}
