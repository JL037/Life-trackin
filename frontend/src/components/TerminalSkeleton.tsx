interface Props {
  lines?: number
  className?: string
}

export function TerminalSkeleton({ lines = 3, className = '' }: Props) {
  return (
    <div className={`font-mono ${className}`}>
      <div className="border border-border bg-surface p-4 animate-pulse">
        <div className="text-xs text-text-muted mb-2 border-b border-border pb-2">
          &gt; LOADING_DATASTREAM
        </div>
        <div className="space-y-2">
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className="h-4 bg-text-dim/20"
              style={{ width: `${Math.max(30, 100 - i * 15)}%` }}
            />
          ))}
        </div>
        <div className="mt-3 text-[10px] text-text-dim">
          <span className="animate-pulse">&gt;_</span> decoding packets...
        </div>
      </div>
    </div>
  )
}

export function BoardSkeleton() {
  return (
    <div className="border border-border bg-surface p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="h-4 bg-text-dim/20 w-1/3" />
        <div className="h-4 bg-text-dim/20 w-16" />
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="border border-border bg-bg p-2">
          <div className="h-3 bg-text-dim/20 w-8 mb-1" />
          <div className="h-6 bg-text-dim/20 w-6" />
        </div>
        <div className="border border-border bg-bg p-2">
          <div className="h-3 bg-text-dim/20 w-8 mb-1" />
          <div className="h-6 bg-text-dim/20 w-6" />
        </div>
        <div className="border border-border bg-bg p-2">
          <div className="h-3 bg-text-dim/20 w-8 mb-1" />
          <div className="h-6 bg-text-dim/20 w-6" />
        </div>
      </div>
      <div className="h-3 bg-text-dim/20 w-1/2" />
    </div>
  )
}

export function HabitSkeleton() {
  return (
    <div className="flex items-center justify-between border border-border bg-surface p-3 animate-pulse">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-8 h-8 border border-border bg-bg" />
        <div className="space-y-1">
          <div className="h-4 bg-text-dim/20 w-24" />
          <div className="h-3 bg-text-dim/20 w-16" />
        </div>
      </div>
      <div className="h-6 bg-text-dim/20 w-6" />
    </div>
  )
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-pulse">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="border border-border bg-surface p-3">
          <div className="h-3 bg-text-dim/20 w-16 mb-1" />
          <div className="h-6 bg-text-dim/20 w-12 mb-1" />
          <div className="h-3 bg-text-dim/20 w-20" />
        </div>
      ))}
    </div>
  )
}

export function HeatmapSkeleton() {
  return (
    <div className="border border-border bg-surface p-4 animate-pulse">
      <div className="text-xs text-text-muted mb-3 border-b border-border pb-2">
        &gt; LOADING_HEATMAP
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: 53 }).map((_, wi) => (
          <div key={wi} className="flex flex-col gap-1.5">
            {Array.from({ length: 7 }).map((_, di) => (
              <div
                key={di}
                className="w-3 h-3 bg-text-dim/20"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function EntrySkeleton() {
  return (
    <div className="flex items-center justify-between border border-border bg-surface px-3 py-2 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 border border-border bg-text-dim/20" />
        <div className="space-y-1">
          <div className="h-4 bg-text-dim/20 w-32" />
          <div className="h-3 bg-text-dim/20 w-48" />
        </div>
      </div>
      <div className="h-6 bg-text-dim/20 w-6" />
    </div>
  )
}
