import { useState } from 'react'
import { Search, X, Calendar, User, Bot } from 'lucide-react'

type FilterOptions = {
  searchTerm: string
  sender: 'all' | 'user' | 'assistant'
  dateFrom: string
  dateTo: string
  model: string
  hasRating: boolean
}

type ChatFiltersProps = {
  onFilterChange: (filters: FilterOptions) => void
  availableModels?: string[]
}

export default function ChatFilters({ onFilterChange, availableModels = [] }: ChatFiltersProps) {
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    sender: 'all',
    dateFrom: '',
    dateTo: '',
    model: '',
    hasRating: false,
  })

  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleChange = (key: keyof FilterOptions, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const clearFilters = () => {
    const emptyFilters: FilterOptions = {
      searchTerm: '',
      sender: 'all',
      dateFrom: '',
      dateTo: '',
      model: '',
      hasRating: false,
    }
    setFilters(emptyFilters)
    onFilterChange(emptyFilters)
  }

  const hasActiveFilters =
    filters.searchTerm ||
    filters.sender !== 'all' ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.model ||
    filters.hasRating

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      {/* Search Bar */}
      <div className="flex items-center space-x-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={filters.searchTerm}
            onChange={(e) => handleChange('searchTerm', e.target.value)}
            placeholder="Buscar nas conversas..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          {showAdvanced ? 'Menos Filtros' : 'Mais Filtros'}
        </button>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Limpar filtros"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
          {/* Sender Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Remetente
            </label>
            <div className="flex space-x-2">
              <button
                onClick={() => handleChange('sender', 'all')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filters.sender === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => handleChange('sender', 'user')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center ${
                  filters.sender === 'user'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <User className="w-4 h-4 mr-1" />
                Usuário
              </button>
              <button
                onClick={() => handleChange('sender', 'assistant')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center ${
                  filters.sender === 'assistant'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Bot className="w-4 h-4 mr-1" />
                IA
              </button>
            </div>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Data Inicial
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleChange('dateFrom', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Data Final
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleChange('dateTo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Model Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Modelo IA
            </label>
            <select
              value={filters.model}
              onChange={(e) => handleChange('model', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Todos os modelos</option>
              {availableModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="flex items-center flex-wrap gap-2 pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-500 font-medium">Filtros ativos:</span>
          {filters.searchTerm && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
              Busca: "{filters.searchTerm}"
            </span>
          )}
          {filters.sender !== 'all' && (
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
              {filters.sender === 'user' ? 'Usuário' : 'IA'}
            </span>
          )}
          {filters.dateFrom && (
            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
              De: {new Date(filters.dateFrom).toLocaleDateString('pt-BR')}
            </span>
          )}
          {filters.dateTo && (
            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
              Até: {new Date(filters.dateTo).toLocaleDateString('pt-BR')}
            </span>
          )}
          {filters.model && (
            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
              Modelo: {filters.model}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
