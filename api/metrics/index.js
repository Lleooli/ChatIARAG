import { createClient } from '@supabase/supabase-js'
import { getUserIdFromToken, setCorsHeaders, handleOptions } from '../../lib/auth-helper.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  setCorsHeaders(res)
  if (handleOptions(req, res)) return

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const userId = getUserIdFromToken(req)
    const range = req.query.range || '7d'

    // Calcular data inicial baseada no range
    let startDate = new Date()
    if (range === '7d') {
      startDate.setDate(startDate.getDate() - 7)
    } else if (range === '30d') {
      startDate.setDate(startDate.getDate() - 30)
    } else {
      startDate = new Date(0) // all time
    }

    // Contar conversas
    const { count: conversationCount } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Contar mensagens
    const { count: messageCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Contar documentos
    const { count: documentCount } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Buscar ratings
    const { data: ratings } = await supabase
      .from('messages')
      .select('rating')
      .eq('user_id', userId)
      .not('rating', 'is', null)

    const avgRating = ratings && ratings.length > 0
      ? ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / ratings.length
      : 0

    // Mensagens por dia
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())

    const messagesByDay = {}
    recentMessages?.forEach(msg => {
      const day = new Date(msg.created_at).toLocaleDateString('pt-BR')
      messagesByDay[day] = (messagesByDay[day] || 0) + 1
    })

    // Top models (simulado - você pode ajustar conforme seu schema)
    const topModels = [
      { model: 'gpt-4-turbo', count: messageCount || 0 }
    ]

    // Top documents (simulado - você pode ajustar conforme seu schema)
    const { data: documents } = await supabase
      .from('documents')
      .select('filename')
      .eq('user_id', userId)
      .limit(5)

    const topDocuments = documents?.map(doc => ({
      filename: doc.filename,
      usage: 0 // Você pode implementar contagem real depois
    })) || []

    res.status(200).json({
      conversationCount: conversationCount || 0,
      messageCount: messageCount || 0,
      documentCount: documentCount || 0,
      avgRating: avgRating || 0,
      messagesByDay,
      topModels,
      topDocuments
    })
  } catch (error) {
    console.error('Erro ao buscar métricas:', error)
    if (error.message === 'Token não fornecido' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Não autorizado' })
    }
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}
