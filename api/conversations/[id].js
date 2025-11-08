import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
)

function getUserIdFromToken(req) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Token não fornecido')
  }
  const token = authHeader.replace('Bearer ', '')
  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret')
  return decoded.userId
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  try {
    const userId = getUserIdFromToken(req)
    const { id } = req.query

    if (req.method === 'GET') {
      console.log('📨 GET /conversations/:id para conversationId:', id, 'userId:', userId)
      // Buscar mensagens da conversa
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('❌ Erro ao buscar mensagens:', error)
        throw error
      }
      console.log('✅ Mensagens encontradas:', data?.length || 0)
      return res.status(200).json(data)
    }

    if (req.method === 'PATCH') {
      const { status } = req.body
      const { data, error } = await supabase
        .from('conversations')
        .update({ status })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return res.status(200).json(data)
    }

    if (req.method === 'DELETE') {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (error) throw error
      return res.status(204).end()
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Erro em conversations/[id]:', error)
    if (error.message === 'Token não fornecido' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Não autorizado' })
    }
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}
