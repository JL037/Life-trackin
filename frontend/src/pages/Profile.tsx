import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import type { User } from '../types'
import { ArrowLeft, Save, User, Globe, Lock, Users } from 'lucide-react'

export function Profile() {
  const { user: authUser } = useAuth()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [goals, setGoals] = useState('')
  const [privacyDefault, setPrivacyDefault] = useState<'private' | 'followers' | 'public'>('private')

  useEffect(() => {
    api.auth.me()
      .then((data: User) => {
        setUser(data)
        setDisplayName(data.display_name || '')
        setBio(data.bio || '')
        setGoals(data.goals || '')
        setPrivacyDefault((data.privacy_default as 'private' | 'followers' | 'public') || 'private')
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const updates: Record<string, string> = {}
      if (displayName !== (user?.display_name || '')) updates.display_name = displayName
      if (bio !== (user?.bio || '')) updates.bio = bio
      if (goals !== (user?.goals || '')) updates.goals = goals
      if (privacyDefault !== user?.privacy_default) updates.privacy_default = privacyDefault

      if (Object.keys(updates).length > 0) {
        await api.auth.updateProfile(updates)
        const refreshed = await api.auth.me()
        setUser(refreshed as User)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch (err) {
      console.error('Failed to update profile:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 font-mono">
        <div className="text-text-muted text-sm animate-pulse">&gt; loading profile...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-16 font-mono">
        <h2 className="text-xl font-bold text-red mb-2">[ERROR: USER NOT FOUND]</h2>
        <Link to="/dashboard" className="text-primary hover:text-primary-dim border-b border-primary">
          &lt;&lt; RETURN TO DASHBOARD
        </Link>
      </div>
    )
  }

  return (
    <div className="font-mono max-w-2xl mx-auto">
      <div className="mb-6 border-b border-border pb-3">
        <Link to="/dashboard" className="text-xs text-text-muted hover:text-primary flex items-center gap-1 mb-2">
          <ArrowLeft className="w-3 h-3" />
          &lt;&lt; DASHBOARD
        </Link>
        <h1 className="text-xl font-bold text-primary">[PROFILE]</h1>
        <p className="text-text-muted text-xs mt-1">// manage identity and preferences</p>
      </div>

      {/* Identity Card */}
      <div className="border border-border bg-surface p-4 mb-4">
        <div className="text-xs text-text-muted mb-3 border-b border-border pb-2">
          &gt; AT_PROTOCOL_IDENTITY
        </div>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 border border-primary/30 bg-bg flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-primary">@{user.handle}</h2>
            <p className="text-xs text-text-muted font-mono break-all">{user.did}</p>
          </div>
        </div>
        <div className="text-xs text-text-muted">
          <span className="text-primary">&gt;</span> joined {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Profile Form */}
      <div className="border border-border bg-surface p-4 mb-4">
        <div className="text-xs text-text-muted mb-3 border-b border-border pb-2">
          &gt; EDIT_PROFILE
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-primary mb-1.5">DISPLAY_NAME:</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
              className="w-full px-3 py-2 border border-border bg-bg text-primary placeholder:text-text-dim focus:outline-none focus:border-primary transition-colors font-mono"
            />
          </div>

          <div>
            <label className="block text-xs text-primary mb-1.5">BIO:</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell others about yourself..."
              rows={3}
              className="w-full px-3 py-2 border border-border bg-bg text-primary placeholder:text-text-dim focus:outline-none focus:border-primary transition-colors font-mono resize-none"
            />
            <p className="text-xs text-text-muted mt-1">// Short description visible on your public profile</p>
          </div>

          <div>
            <label className="block text-xs text-primary mb-1.5">GOALS:</label>
            <textarea
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="What are you working towards?"
              rows={3}
              className="w-full px-3 py-2 border border-border bg-bg text-primary placeholder:text-text-dim focus:outline-none focus:border-primary transition-colors font-mono resize-none"
            />
            <p className="text-xs text-text-muted mt-1">// Your personal goals and aspirations</p>
          </div>

          <div>
            <label className="block text-xs text-primary mb-1.5">DEFAULT_VISIBILITY:</label>
            <div className="grid grid-cols-3 gap-2">
              {(['private', 'followers', 'public'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setPrivacyDefault(v)}
                  className={`flex items-center justify-center gap-2 py-2 px-3 border text-xs transition-colors ${
                    privacyDefault === v
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-text-muted hover:border-primary/50'
                  }`}
                >
                  {v === 'private' && <Lock className="w-3 h-3" />}
                  {v === 'followers' && <Users className="w-3 h-3" />}
                  {v === 'public' && <Globe className="w-3 h-3" />}
                  <span className="uppercase">{v}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-text-muted mt-1">// Default visibility for new boards</p>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-text-muted">
          {saved && <span className="text-primary">&gt; changes saved successfully</span>}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 border border-primary bg-primary/10 hover:bg-primary/20 text-primary py-2 px-4 transition-colors text-sm disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'SAVING...' : 'SAVE_PROFILE'}
        </button>
      </div>
    </div>
  )
}
