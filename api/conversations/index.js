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

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return res.status(200).json(data)
    }

    if (req.method === 'POST') {
      const { title } = req.body
      const { data, error} = await supabase
        .from('conversations')
        .insert({
          user_id: userId,
          title: title || 'Nova conversa',
          status: 'new'
        })
        .select()
        .single()

      if (error) throw error
      return res.status(201).json(data)
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Erro em conversations:', error)
    if (error.message === 'Token não fornecido' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Não autorizado' })
    }
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}
