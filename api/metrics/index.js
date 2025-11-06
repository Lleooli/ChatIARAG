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

    // Contar conversas
    const { count: conversationsCount } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Contar mensagens
    const { count: messagesCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Contar documentos
    const { count: documentsCount } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Estatísticas por período (últimos 7 dias)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: recentMessages } = await supabase
      .from('messages')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo.toISOString())

    // Agrupar por dia
    const messagesByDay = {}
    recentMessages?.forEach(msg => {
      const day = new Date(msg.created_at).toISOString().split('T')[0]
      messagesByDay[day] = (messagesByDay[day] || 0) + 1
    })

    res.status(200).json({
      conversations: conversationsCount || 0,
      messages: messagesCount || 0,
      documents: documentsCount || 0,
      messagesByDay
    })
  } catch (error) {
    console.error('Erro ao buscar métricas:', error)
    if (error.message === 'Token não fornecido' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Não autorizado' })
    }
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}
