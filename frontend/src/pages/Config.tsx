import { useState, useEffect } from 'react'
import { configAPI } from '../lib/api'
import { Save, Check, AlertCircle } from 'lucide-react'

const MODELS = [
  { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo' },
  { id: 'openai/gpt-4', name: 'GPT-4' },
  { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus' },
  { id: 'meta-llama/llama-3-70b-instruct', name: 'Llama 3 70B' },
  { id: 'google/gemini-pro', name: 'Gemini Pro' },
]

export default function ConfigPage() {
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('openai/gpt-4-turbo')
  const [systemPrompt, setSystemPrompt] = useState('Você é um assistente prestativo e inteligente.')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const { data } = await configAPI.get()
      if (data && data.length > 0) {
        const config = data[0]
        setApiKey(config.openrouter_api_key || '')
        setModel(config.model || 'openai/gpt-4-turbo')
        setSystemPrompt(config.system_prompt || '')
      }
    } catch (err) {
      console.error('Erro ao carregar config:', err)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSaved(false)

    try {
      await configAPI.save({
        openrouter_api_key: apiKey,
        model,
        system_prompt: systemPrompt,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar configurações')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-2 sm:px-0">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
        <div className="mb-6">
          <h2 className="text-xl lg:text-2xl font-bold text-gray-900">⚙️ Configurações</h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure a API do Open Router e o modelo de IA
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-5 lg:space-y-6">
          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🔑 Open Router API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-or-v1-..."
              className="w-full px-4 py-2.5 lg:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm lg:text-base"
              required
            />
            <p className="text-xs text-gray-500 mt-2 flex items-center flex-wrap">
              💡 Obtenha sua chave em{' '}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline ml-1 font-medium"
              >
                openrouter.ai/keys
              </a>
            </p>
          </div>

          {/* Model Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🤖 Modelo de IA
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-4 py-2.5 lg:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm lg:text-base"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📝 System Prompt
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={6}
              className="w-full px-4 py-2.5 lg:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm lg:text-base resize-none"
              placeholder="Você é um assistente..."
            />
            <p className="text-xs text-gray-500 mt-2">
              💬 Define o comportamento do assistente
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 lg:p-4 rounded-xl border border-red-200 animate-fade-in">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Save Button */}
          <button
            type="submit"
            disabled={loading || !apiKey}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-primary to-primary/90 text-white py-3 lg:py-3.5 rounded-xl font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none transition-all active:scale-95"
          >
            {saved ? (
              <>
                <Check className="w-5 h-5" />
                <span>✅ Salvo com sucesso!</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>{loading ? '⏳ Salvando...' : 'Salvar Configurações'}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
