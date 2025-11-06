import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import ConfigPage from './pages/Config'
import DocumentsPage from './pages/Documents'
import ChatPage from './pages/Chat'
import DashboardPage from './pages/Dashboard'
import ConversationsPage from './pages/Conversations'
import LoginPage from './pages/Login'
import RegisterPage from './pages/Register'

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

function AppRoutes() {
  const { isAuthenticated } = useAuth()
  
  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
      } />
      
      <Route path="/register" element={
        isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />
      } />
      
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="conversations" element={<ConversationsPage />} />
        <Route path="config" element={<ConfigPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="chat" element={<ChatPage />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
