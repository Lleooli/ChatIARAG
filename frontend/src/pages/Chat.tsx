import { useState, useEffect, useRef } from 'react'
import api from '../lib/api'
import { Send, Bot, User, Loader2, Plus, MessageSquare, Archive, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import MessageRating from '../components/MessageRating'
import DocumentSelector from '../components/DocumentSelector'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: any
  created_at: string
  conversation_id?: string
}

type Conversation = {
  id: string
  title: string
  status: string
  created_at: string
  updated_at: string
  message_count: number
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    console.log('🔄 useEffect currentConversation:', currentConversation)
    if (currentConversation) {
      loadMessages(currentConversation)
    } else {
      setMessages([])
    }
  }, [currentConversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadConversations = async () => {
    setLoadingConversations(true)
    try {
      console.log('🔄 Carregando conversas...')
      const { data } = await api.get('/conversations')
      console.log('✅ Conversas carregadas:', data)
      setConversations(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('❌ Erro ao carregar conversas:', err)
      setConversations([])
    } finally {
      setLoadingConversations(false)
    }
  }

  const loadMessages = async (conversationId: string) => {
    try {
      console.log('🔄 Carregando mensagens da conversa:', conversationId)
      // Backend returns messages on GET /conversations/{id}
      const { data } = await api.get(`/conversations/${conversationId}`)
      console.log('✅ Mensagens carregadas:', data)
      setMessages(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('❌ Erro ao carregar mensagens:', err)
      setMessages([])
    }
  }

  const createNewConversation = () => {
    setCurrentConversation(null)
    setMessages([])
    setSelectedDocuments([])
    setInput('')
  }

  const archiveConversation = async (conversationId: string) => {
    try {
      await api.patch(`/conversations/${conversationId}`, {
        status: 'archived'
      })
      
      if (currentConversation === conversationId) {
        createNewConversation()
      }
      
      loadConversations()
    } catch (err) {
      console.error('Erro ao arquivar conversa:', err)
    }
  }

  const deleteConversation = async (conversationId: string) => {
    if (!confirm('Deseja realmente deletar esta conversa?')) return
    
    try {
      await api.delete(`/conversations/${conversationId}`)
      
      if (currentConversation === conversationId) {
        createNewConversation()
      }
      
      loadConversations()
    } catch (err) {
      console.error('Erro ao deletar conversa:', err)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    const docsToSend = [...selectedDocuments]
    setInput('')
    
    const tempUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])
    setLoading(true)

    try {
      const { data } = await api.post('/chat', {
        message: userMessage,
        conversationId: currentConversation || undefined,
        documentIds: docsToSend.length > 0 ? docsToSend : undefined,
      })
      
      if (!currentConversation && data.conversationId) {
        setCurrentConversation(data.conversationId)
        loadConversations()
      }
      
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: typeof data.message === 'string' ? data.message : (data.message?.content || 'Sem resposta'),
        sources: Array.isArray(data.sources) ? data.sources : [],
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '❌ Erro: ' + (err.response?.data?.error || 'Falha ao processar mensagem'),
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)] gap-2 lg:gap-4 relative">
      {/* Sidebar - Lista de Conversas */}
      <div className={`${
        sidebarOpen ? 'flex' : 'hidden'
      } lg:flex ${
        sidebarOpen ? 'fixed lg:relative inset-0 z-50 lg:z-0 bg-black/50 lg:bg-transparent' : ''
      } lg:w-80 transition-all duration-300`}>
        <div className="w-80 lg:w-full h-full bg-white rounded-lg shadow-lg lg:shadow-sm border border-gray-200 flex flex-col ml-auto lg:ml-0">
          <div className="p-3 lg:p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm lg:text-base">Conversas</h3>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          
          <div className="p-3 lg:p-4 border-b border-gray-200">
            <button
              onClick={createNewConversation}
              className="w-full px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center space-x-2 shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span>Nova Conversa</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 lg:p-2">
            {loadingConversations ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : !Array.isArray(conversations) || conversations.length === 0 ? (
              <div className="text-center py-8 px-4 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma conversa ainda</p>
                <p className="text-xs mt-1 text-gray-400">Comece uma nova!</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`group mb-2 p-3 rounded-lg cursor-pointer transition-all active:scale-98 ${
                    currentConversation === conv.id
                      ? 'bg-primary/10 border border-primary shadow-sm'
                      : 'hover:bg-gray-50 border border-transparent hover:shadow-sm'
                  }`}
                  onClick={() => {
                    console.log('👆 Clicou na conversa:', conv.id, conv.title)
                    setCurrentConversation(conv.id)
                    setSidebarOpen(false)
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-sm font-medium truncate ${
                        currentConversation === conv.id ? 'text-primary' : 'text-gray-900'
                      }`}>
                        {conv.title}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 flex items-center space-x-2">
                        <span>{conv.message_count} msgs</span>
                        <span>•</span>
                        <span className={`px-1.5 py-0.5 rounded ${
                          conv.status === 'archived' ? 'bg-gray-200 text-gray-600' :
                          conv.status === 'resolved' ? 'bg-green-100 text-green-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {conv.status}
                        </span>
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(conv.updated_at).toLocaleDateString('pt-BR', { 
                          day: '2-digit', 
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                      {conv.status !== 'archived' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            archiveConversation(conv.id)
                          }}
                          className="p-1.5 hover:bg-blue-100 rounded transition-colors"
                          title="Arquivar"
                        >
                          <Archive className="w-4 h-4 text-blue-600" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteConversation(conv.id)
                        }}
                        className="p-1.5 hover:bg-red-100 rounded transition-colors"
                        title="Deletar"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Toggle Sidebar Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed lg:absolute left-4 lg:left-0 top-20 lg:top-1/2 lg:-translate-y-1/2 bg-white border border-gray-200 rounded-lg lg:rounded-r-lg lg:rounded-l-none p-2 hover:bg-gray-50 shadow-md lg:shadow-sm z-40 transition-all active:scale-95"
        aria-label={sidebarOpen ? 'Fechar menu' : 'Abrir menu'}
      >
        {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
      </button>

      {/* Área Principal do Chat */}
      <div className="flex-1 flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 min-h-0">
        <div className="p-3 lg:p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 lg:space-x-3">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-md">
                <Bot className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
              </div>
              <div>
                <h2 className="text-base lg:text-lg font-semibold text-gray-900">
                  {currentConversation ? 'Conversa Ativa' : 'Nova Conversa'}
                </h2>
                <p className="text-xs text-gray-500 hidden sm:block">Com contexto RAG de documentos</p>
              </div>
            </div>
            
            {currentConversation && (
              <button
                onClick={() => archiveConversation(currentConversation)}
                className="px-3 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-all active:scale-95 flex items-center space-x-1 lg:space-x-2"
              >
                <Archive className="w-4 h-4" />
                <span className="hidden sm:inline">Encerrar</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 lg:p-4 space-y-3 lg:space-y-4 min-h-0">
          {!Array.isArray(messages) || messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 px-4">
              <div className="w-20 h-20 lg:w-24 lg:h-24 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full flex items-center justify-center mb-4">
                <Bot className="w-10 h-10 lg:w-12 lg:h-12 text-primary/60" />
              </div>
              <p className="text-base lg:text-lg font-medium text-center">
                {currentConversation ? 'Nenhuma mensagem nesta conversa' : 'Comece uma nova conversa'}
              </p>
              <p className="text-sm text-center mt-2">Faça uma pergunta para começar!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div
                  className={`flex items-start space-x-2 max-w-full sm:max-w-[85%] lg:max-w-[80%] ${
                    msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  <div
                    className={`w-7 h-7 lg:w-8 lg:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      msg.role === 'user' ? 'bg-gray-200' : 'bg-gradient-to-br from-primary to-primary/80 shadow-md'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <User className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600" />
                    ) : (
                      <Bot className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div
                      className={`px-3 lg:px-4 py-2 lg:py-2.5 rounded-2xl ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-br from-primary to-primary/90 text-white shadow-md'
                          : 'bg-gray-100 text-gray-900 border border-gray-200'
                      }`}
                    >
                      <p className="text-sm lg:text-base whitespace-pre-wrap break-words">{msg.content}</p>
                      
                      {msg.sources && Array.isArray(msg.sources) && msg.sources.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-white/20">
                          <p className="text-xs font-semibold mb-1 opacity-80">📚 Fontes:</p>
                          <ul className="text-xs space-y-0.5 opacity-80">
                            {msg.sources.map((src: any, idx: number) => (
                              <li key={idx} className="truncate">• {src.filename}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    {msg.role === 'assistant' && msg.id && (
                      <div className="mt-2 ml-1">
                        <MessageRating messageId={msg.id} type="thumbs" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          
          {loading && (
            <div className="flex justify-start animate-fade-in">
              <div className="flex items-center space-x-2 px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-2xl">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-gray-600">Pensando...</span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <form
          onSubmit={handleSend}
          className="p-3 lg:p-4 border-t border-gray-200 flex-shrink-0"
        >
          <div className="flex flex-col sm:flex-row items-end space-y-2 sm:space-y-0 sm:space-x-2">
            <div className="flex-1 w-full">
              <DocumentSelector
                selectedDocuments={selectedDocuments}
                onDocumentsChange={setSelectedDocuments}
              />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="w-full mt-2 px-4 py-2.5 lg:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow text-sm lg:text-base"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="w-full sm:w-auto px-5 lg:px-6 py-2.5 lg:py-3 bg-gradient-to-r from-primary to-primary/90 text-white rounded-xl font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none transition-all active:scale-95 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              <span>{loading ? 'Enviando...' : 'Enviar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
