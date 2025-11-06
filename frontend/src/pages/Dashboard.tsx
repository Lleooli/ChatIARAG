import { useState, useEffect } from 'react'
import { BarChart3, MessageSquare, FileText, TrendingUp, Users, Star } from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

type Metrics = {
  conversationCount: number
  messageCount: number
  documentCount: number
  avgRating: number
  messagesByDay: Record<string, number>
  topModels: { model: string; count: number }[]
  topDocuments: { filename: string; usage: number }[]
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('7d')
  const { user } = useAuth()

  useEffect(() => {
    loadMetrics()
  }, [timeRange])

  const loadMetrics = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get(`/metrics?range=${timeRange}`)
      setMetrics(data)
    } catch (err: any) {
      console.error('Erro ao carregar métricas:', err)
      setError(err.response?.data?.error || 'Erro ao carregar métricas')
    } finally {
      setLoading(false)
    }
  }

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Carregando métricas...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-600 mb-2">❌ {error}</p>
          <button
            onClick={loadMetrics}
            className="text-primary hover:text-primary/80 text-sm"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6 px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-600 mt-1">
            Bem-vindo, {user?.name || 'Usuário'} 👋
          </p>
        </div>

        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as any)}
          className="px-3 lg:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm lg:text-base"
        >
          <option value="7d">📅 Últimos 7 dias</option>
          <option value="30d">📅 Últimos 30 dias</option>
          <option value="all">📅 Todo período</option>
        </select>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
        <MetricCard
          icon={<Users className="w-5 h-5 lg:w-6 lg:h-6" />}
          title="Conversas"
          value={metrics.conversationCount}
          color="blue"
        />
        <MetricCard
          icon={<MessageSquare className="w-5 h-5 lg:w-6 lg:h-6" />}
          title="Mensagens"
          value={metrics.messageCount}
          color="green"
        />
        <MetricCard
          icon={<FileText className="w-5 h-5 lg:w-6 lg:h-6" />}
          title="Documentos"
          value={metrics.documentCount}
          color="purple"
        />
        <MetricCard
          icon={<Star className="w-5 h-5 lg:w-6 lg:h-6" />}
          title="Avaliação Média"
          value={metrics.avgRating.toFixed(1)}
          color="yellow"
          suffix="/5"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Mensagens por Dia */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6 hover:shadow-md transition-shadow">
          <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-primary" />
            Mensagens por Dia
          </h3>
          <div className="space-y-2 lg:space-y-3">
            {Object.entries(metrics.messagesByDay).length > 0 ? (
              Object.entries(metrics.messagesByDay).map(([date, count]) => (
                <div key={date} className="flex items-center">
                  <span className="text-xs lg:text-sm text-gray-600 w-20 lg:w-28">{date}</span>
                  <div className="flex-1 ml-2 lg:ml-4">
                    <div className="bg-gray-200 rounded-full h-5 lg:h-6 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-primary to-primary/80 h-full flex items-center justify-end pr-2 transition-all duration-500"
                        style={{ 
                          width: `${Math.min((count / Math.max(...Object.values(metrics.messagesByDay))) * 100, 100)}%` 
                        }}
                      >
                        <span className="text-xs font-medium text-white">
                          {count}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                📭 Nenhuma mensagem no período
              </p>
            )}
          </div>
        </div>

        {/* Modelos Mais Usados */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6 hover:shadow-md transition-shadow">
          <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-primary" />
            Modelos Mais Usados
          </h3>
          <div className="space-y-3 lg:space-y-4">
            {metrics.topModels.length > 0 ? (
              metrics.topModels.map((item, idx) => (
                <div key={item.model}>
                  <div className="flex justify-between text-xs lg:text-sm mb-1">
                    <span className="font-medium text-gray-700 truncate">{item.model}</span>
                    <span className="text-gray-500 ml-2">{item.count} usos</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        idx === 0
                          ? 'bg-gradient-to-r from-primary to-primary/80'
                          : idx === 1
                          ? 'bg-blue-400'
                          : 'bg-blue-300'
                      }`}
                      style={{
                        width: `${(item.count / metrics.topModels[0].count) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                🤖 Nenhum modelo utilizado ainda
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Documentos Mais Consultados */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6 hover:shadow-md transition-shadow">
        <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-primary" />
          Documentos Mais Consultados
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
          {metrics.topDocuments.length > 0 ? (
            metrics.topDocuments.map((doc, idx) => (
              <div
                key={doc.filename}
                className="p-4 border border-gray-200 rounded-xl hover:border-primary hover:shadow-md transition-all hover:scale-105 bg-gradient-to-br from-gray-50 to-white"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm mb-1 truncate">
                      📄 {doc.filename}
                    </p>
                    <p className="text-xs text-gray-500">{doc.usage} consultas</p>
                  </div>
                  <div
                    className={`text-xl lg:text-2xl font-bold ml-2 ${
                      idx === 0
                        ? 'text-yellow-500'
                        : idx === 1
                        ? 'text-gray-400'
                        : 'text-orange-400'
                    }`}
                  >
                    #{idx + 1}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full">
              <p className="text-sm text-gray-500 text-center py-8">
                📚 Nenhum documento consultado ainda
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

type MetricCardProps = {
  icon: React.ReactNode
  title: string
  value: number | string
  color: 'blue' | 'green' | 'purple' | 'yellow'
  suffix?: string
}

function MetricCard({ icon, title, value, color, suffix }: MetricCardProps) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 ring-blue-100',
    green: 'bg-green-50 text-green-600 ring-green-100',
    purple: 'bg-purple-50 text-purple-600 ring-purple-100',
    yellow: 'bg-yellow-50 text-yellow-600 ring-yellow-100',
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6 hover:shadow-md transition-all hover:scale-105">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs lg:text-sm text-gray-600 mb-1 font-medium">{title}</p>
          <p className="text-2xl lg:text-3xl font-bold text-gray-900">
            {value}
            {suffix && <span className="text-lg lg:text-xl text-gray-500">{suffix}</span>}
          </p>
        </div>
        <div className={`p-2.5 lg:p-3 rounded-xl ring-2 ${colors[color]} transition-transform hover:scale-110`}>{icon}</div>
      </div>
    </div>
  )
}
