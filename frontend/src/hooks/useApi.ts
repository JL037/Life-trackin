import { useState, useCallback } from 'react'

export function useApi<T>(fetchFn: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchFn()
      setData(result)
      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown error'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [fetchFn])

  return { data, loading, error, execute }
}
