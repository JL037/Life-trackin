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
  const colors = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39']
  return colors[level] || colors[0]
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}
