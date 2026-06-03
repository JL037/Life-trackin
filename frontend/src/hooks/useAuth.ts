import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import type { User } from '../types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.auth.me()
      .then((data: User) => {
        setUser(data)
        setError(null)
      })
      .catch((err) => {
        if (err.message === 'unauthorized') {
          setUser(null)
        } else {
          setError(err.message)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const login = (handle: string) => {
    api.auth.login(handle)
  }

  const logout = async () => {
    try {
      await api.auth.logout()
      setUser(null)
      window.location.reload()
    } catch {
      setUser(null)
    }
  }

  return { user, loading, error, login, logout, isAuthenticated: !!user }
}
