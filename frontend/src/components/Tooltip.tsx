import { useState, type ReactNode } from 'react'

interface Props {
  content: string
  children: ReactNode
}

export function Tooltip({ content, children }: Props) {
  const [show, setShow] = useState(false)

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        {children}
      </div>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 pointer-events-none">
          <div className="bg-bg border border-border px-2 py-1 text-xs font-mono text-primary whitespace-nowrap shadow-lg">
            {content}
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-l-transparent border-r-transparent border-t-border" />
        </div>
      )}
    </div>
  )
}
