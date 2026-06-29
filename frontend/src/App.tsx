import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { ToastProvider } from './context/ToastContext'
import { ToastContainer } from './components/ToastContainer'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { BoardView } from './pages/BoardView'
import { HabitView } from './pages/HabitView'
import { Profile } from './pages/Profile'
import { PublicProfile } from './pages/PublicProfile'
import { Following } from './pages/Following'
import { Feed } from './pages/Feed'
import { NotFound } from './pages/NotFound'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-center">
          <div className="text-primary font-mono text-sm mb-2">
            <span className="text-primary">&gt;_</span> booting lifetrack...
          </div>
          <div className="w-64 h-px bg-border animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <ToastProvider>
        {user ? (
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/board/:boardId" element={<BoardView />} />
              <Route path="/habit/:habitId" element={<HabitView />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/user/:handle" element={<PublicProfile />} />
              <Route path="/following" element={<Following />} />
              <Route path="/feed" element={<Feed />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        ) : (
          <Routes>
            <Route path="*" element={<Login />} />
          </Routes>
        )}
        <ToastContainer />
      </ToastProvider>
    </BrowserRouter>
  )
}

export default App
