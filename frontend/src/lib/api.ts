const API_BASE = '/api'

async function fetcher(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (res.status === 401) {
    throw new Error('unauthorized')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'unknown error' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }

  return res.json()
}

export const api = {
  auth: {
    me: () => fetcher('/auth/me'),
    updateProfile: (data: unknown) => fetcher('/auth/me', { method: 'PUT', body: JSON.stringify(data) }),
    login: (handle: string) => {
      window.location.href = `/api/auth/login?handle=${encodeURIComponent(handle)}`
    },
    logout: () => fetcher('/auth/logout', { method: 'POST' }),
  },

  boards: {
    list: () => fetcher('/boards'),
    get: (id: string) => fetcher(`/boards/${id}`),
    create: (data: unknown) => fetcher('/boards', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: unknown) =>
      fetcher(`/boards/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetcher(`/boards/${id}`, { method: 'DELETE' }),
    stats: (id: string) => fetcher(`/boards/${id}/stats`),
    heatmap: (id: string, year?: number) => {
      const q = year ? `?year=${year}` : ''
      return fetcher(`/boards/${id}/heatmap${q}`)
    },
  },

  habits: {
    list: (boardId: string) => fetcher(`/boards/${boardId}/habits`),
    get: (id: string) => fetcher(`/habits/${id}`),
    create: (boardId: string, data: unknown) =>
      fetcher(`/boards/${boardId}/habits`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: unknown) =>
      fetcher(`/habits/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetcher(`/habits/${id}`, { method: 'DELETE' }),
    streak: (id: string) => fetcher(`/habits/${id}/streak`),
  },

  entries: {
    list: (habitId: string, from?: string, to?: string) => {
      const params = new URLSearchParams()
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const q = params.toString() ? `?${params.toString()}` : ''
      return fetcher(`/habits/${habitId}/entries${q}`)
    },
    create: (habitId: string, data: unknown) =>
      fetcher(`/habits/${habitId}/entries`, { method: 'POST', body: JSON.stringify(data) }),
    delete: (entryId: string) => fetcher(`/entries/${entryId}`, { method: 'DELETE' }),
  },

  public: {
    user: (handle: string) => fetcher(`/public/users/${handle}`),
    boards: (handle: string) => fetcher(`/public/users/${handle}/boards`),
    boardStats: (boardId: string) => fetcher(`/public/boards/${boardId}/stats`),
  },
}
