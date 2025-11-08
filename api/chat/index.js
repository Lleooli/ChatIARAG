import { createClient } from '@supabase/supabase-js'
import { getUserIdFromToken, setCorsHeaders, handleOptions } from '../../lib/auth-helper.js'
import { generateChatCompletion, searchSimilarDocuments, buildRAGContext } from '../../lib/helpers.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  setCorsHeaders(res)
  if (handleOptions(req, res)) return

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const userId = getUserIdFromToken(req)
    const { message, conversationId, documentIds } = req.body

    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' })
    }

    console.log('📩 Chat request:', {
      userId,
      conversationId,
      documentIds,
      hasDocuments: documentIds && documentIds.length > 0
    })

    // Buscar config do usuário para pegar API key
    const { data: config } = await supabase
      .from('configs')
      .select('openrouter_api_key, model')
      .eq('user_id', userId)
      .single()

    const apiKey = config?.openrouter_api_key || process.env.OPENROUTER_API_KEY
    const model = config?.model || 'openai/gpt-4-turbo'

    // Buscar ou criar conversa
    let conversation
    if (conversationId) {
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('user_id', userId)
        .single()
      conversation = data
    } else {
      const { data } = await supabase
        .from('conversations')
        .insert({
          user_id: userId,
          title: message.substring(0, 50),
          status: 'in_progress'
        })
        .select()
        .single()
      conversation = data
    }

    // Buscar contexto RAG
    const relevantChunks = await searchSimilarDocuments(
      supabase,
      message,
      apiKey,
      0.7,
      3,
      userId,
      conversationId || null,
      documentIds || null
    )
    const context = buildRAGContext(relevantChunks)

    // Buscar histórico
    const { data: history } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
      .limit(10)

    // Construir mensagens
    const messages = [
      { role: 'system', content: `Você é um assistente útil. Use o seguinte contexto para responder:\n\n${context}` },
      ...(history || []),
      { role: 'user', content: message }
    ]

    // Chamar LLM
    const assistantMessage = await generateChatCompletion(messages, model, apiKey)

    // Salvar mensagens
    await supabase.from('messages').insert([
      { conversation_id: conversation.id, user_id: userId, role: 'user', content: message },
      { conversation_id: conversation.id, user_id: userId, role: 'assistant', content: assistantMessage }
    ])

    res.status(200).json({
      message: assistantMessage,
      conversationId: conversation.id,
      sources: Array.isArray(relevantChunks) ? relevantChunks.map(c => ({ 
        filename: c.filename, 
        similarity: c.similarity,
        content: c.chunk_text?.substring(0, 100) + '...'
      })) : []
    })
  } catch (error) {
    console.error('Erro no chat:', error)
    if (error.message === 'Token não fornecido' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Não autorizado' })
    }
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}
