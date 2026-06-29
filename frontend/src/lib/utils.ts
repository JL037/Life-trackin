import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

export function getHeatmapLevel(value: number): number {
  if (value <= 0) return 0
  if (value <= 0.25) return 1
  if (value <= 0.5) return 2
  if (value <= 0.75) return 3
  return 4
}

export function getHeatmapColor(level: number): string {
  const colors = ['#0a1a0a', '#1a4a1a', '#2a8a2a', '#4aca4a', '#7aff7a']
  return colors[level] || colors[0]
}

export function getBoardCompletionColor(status: 'none' | 'partial' | 'complete'): string {
  const colors = {
    none: '#991a1a',      // red-dim
    partial: '#ffb000',  // amber
    complete: '#7aff7a', // heatmap-4
  }
  return colors[status] || colors.none
}

export function formatRelativeDate(dateStr?: string): string {
  if (!dateStr) return 'never'
  const date = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}
