import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Settings, FileText, MessageSquare, BarChart3, Kanban, LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  const navItems = [
    { path: '/dashboard', icon: BarChart3, label: 'Dashboard' },
    { path: '/conversations', icon: Kanban, label: 'Conversas' },
    { path: '/chat', icon: MessageSquare, label: 'Chat' },
    { path: '/documents', icon: FileText, label: 'Documentos' },
    { path: '/config', icon: Settings, label: 'Config' },
  ]
  
  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 lg:h-16">
            <div className="flex items-center space-x-2 lg:space-x-3">
              <div className="w-9 h-9 lg:w-10 lg:h-10 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center shadow-md">
                <MessageSquare className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg lg:text-xl font-bold text-gray-900">ChatIARAG</h1>
                <p className="text-xs text-gray-500 hidden sm:block">IA + RAG + WhatsApp</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-4">
              <nav className="flex space-x-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center space-x-2 px-3 lg:px-4 py-2 rounded-lg transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-primary to-primary/90 text-white shadow-md'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </NavLink>
                ))}
              </nav>
              
              {/* User Menu - Desktop */}
              <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all active:scale-95"
                  title="Sair"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="lg:hidden pb-4 pt-2 border-t border-gray-200 animate-fade-in">
              <nav className="flex flex-col space-y-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-primary to-primary/90 text-white shadow-md'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </NavLink>
                ))}
              </nav>
              
              {/* User Menu - Mobile */}
              <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between px-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-all active:scale-95"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-sm font-medium">Sair</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 lg:py-8">
        <Outlet />
      </main>
    </div>
  )
}
