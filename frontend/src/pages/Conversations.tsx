import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { MessageSquare, User, Clock, ChevronRight } from 'lucide-react'

type ConversationStatus = 'new' | 'in_progress' | 'resolved' | 'archived'

type Conversation = {
  id: string
  sender_id: string
  sender_name: string
  last_message: string
  message_count: number
  status: ConversationStatus
  created_at: string
  updated_at: string
  assigned_to?: string
}

const COLUMNS: { id: ConversationStatus; title: string; color: string }[] = [
  { id: 'new', title: 'Novo', color: 'bg-blue-100 text-blue-700' },
  { id: 'in_progress', title: 'Em Andamento', color: 'bg-yellow-100 text-yellow-700' },
  { id: 'resolved', title: 'Resolvido', color: 'bg-green-100 text-green-700' },
  { id: 'archived', title: 'Arquivado', color: 'bg-gray-100 text-gray-700' },
]

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Record<ConversationStatus, Conversation[]>>({
    new: [],
    in_progress: [],
    resolved: [],
    archived: [],
  })
  const [loading, setLoading] = useState(true)
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)

  useEffect(() => {
    loadConversations()
  }, [])

  const loadConversations = async () => {
    setLoading(true)
    try {
      // TODO: Implementar endpoint de conversações
      // const { data } = await axios.get('/api/conversations')
      
      // Dados mockados
      const mockData: Conversation[] = [
        {
          id: '1',
          sender_id: '5511999999999',
          sender_name: 'João Silva',
          last_message: 'Preciso de ajuda com o produto',
          message_count: 5,
          status: 'new',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2',
          sender_id: '5511888888888',
          sender_name: 'Maria Santos',
          last_message: 'Qual o prazo de entrega?',
          message_count: 3,
          status: 'in_progress',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          assigned_to: 'Você',
        },
        {
          id: '3',
          sender_id: '5511777777777',
          sender_name: 'Pedro Costa',
          last_message: 'Obrigado pela ajuda!',
          message_count: 8,
          status: 'resolved',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]

      const grouped = mockData.reduce((acc, conv) => {
        if (!acc[conv.status]) acc[conv.status] = []
        acc[conv.status].push(conv)
        return acc
      }, {} as Record<ConversationStatus, Conversation[]>)

      setConversations({
        new: grouped.new || [],
        in_progress: grouped.in_progress || [],
        resolved: grouped.resolved || [],
        archived: grouped.archived || [],
      })
    } catch (error) {
      console.error('Erro ao carregar conversações:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result

    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return
    }

    const sourceColumn = source.droppableId as ConversationStatus
    const destColumn = destination.droppableId as ConversationStatus

    const sourceItems = Array.from(conversations[sourceColumn])
    const destItems = source.droppableId === destination.droppableId 
      ? sourceItems 
      : Array.from(conversations[destColumn])

    const [movedItem] = sourceItems.splice(source.index, 1)
    movedItem.status = destColumn

    if (source.droppableId === destination.droppableId) {
      sourceItems.splice(destination.index, 0, movedItem)
      setConversations({
        ...conversations,
        [sourceColumn]: sourceItems,
      })
    } else {
      destItems.splice(destination.index, 0, movedItem)
      setConversations({
        ...conversations,
        [sourceColumn]: sourceItems,
        [destColumn]: destItems,
      })
    }

    // TODO: Atualizar status no backend
    // await axios.patch(`/api/conversations/${draggableId}`, { status: destColumn })
    console.log(`Moved conversation ${draggableId} to ${destColumn}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Carregando conversações...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Conversas do Whatsapp</h2>
        <p className="text-sm text-gray-600 mt-1">
          Gerencie conversas com sistema Kanban
        </p>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map((column) => (
            <div key={column.id} className="flex flex-col">
              {/* Column Header */}
              <div className={`px-4 py-3 rounded-t-lg ${column.color} font-semibold flex items-center justify-between`}>
                <span>{column.title}</span>
                <span className="bg-white bg-opacity-50 px-2 py-1 rounded text-sm">
                  {conversations[column.id].length}
                </span>
              </div>

              {/* Column Content */}
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 bg-gray-50 border-2 border-t-0 rounded-b-lg p-2 min-h-[400px] transition-colors ${
                      snapshot.isDraggingOver ? 'border-primary bg-primary/5' : 'border-gray-200'
                    }`}
                  >
                    <div className="space-y-2">
                      {conversations[column.id].map((conversation, index) => (
                        <Draggable
                          key={conversation.id}
                          draggableId={conversation.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white rounded-lg border border-gray-200 p-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
                                snapshot.isDragging ? 'shadow-lg rotate-2' : ''
                              }`}
                              onClick={() => setSelectedConversation(conversation)}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <User className="w-4 h-4 text-primary" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm text-gray-900">
                                      {conversation.sender_name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {conversation.sender_id.slice(-9)}
                                    </p>
                                  </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              </div>

                              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                {conversation.last_message}
                              </p>

                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <div className="flex items-center space-x-1">
                                  <MessageSquare className="w-3 h-3" />
                                  <span>{conversation.message_count} msgs</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Clock className="w-3 h-3" />
                                  <span>
                                    {new Date(conversation.updated_at).toLocaleDateString('pt-BR', {
                                      day: '2-digit',
                                      month: 'short',
                                    })}
                                  </span>
                                </div>
                              </div>

                              {conversation.assigned_to && (
                                <div className="mt-2 pt-2 border-t border-gray-100">
                                  <p className="text-xs text-gray-500">
                                    👤 {conversation.assigned_to}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                    </div>
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Quick View Modal */}
      {selectedConversation && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedConversation(null)}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Conversa com {selectedConversation.sender_name}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {selectedConversation.message_count} mensagens
            </p>
            <button
              onClick={() => setSelectedConversation(null)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
