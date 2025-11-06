import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase não configurado' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // GET - Histórico de mensagens
    if (req.method === 'GET') {
      const { sender_id = 'local' } = req.query
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('sender_id', sender_id)
        .order('created_at', { ascending: true })
        .limit(50)
      
      if (error) throw error
      return res.status(200).json(data || [])
    }

    // POST - Enviar mensagem (simplificado)
    if (req.method === 'POST') {
      return res.status(501).json({ 
        error: 'Chat RAG não implementado ainda. Configure primeiro a API Key em /config' 
      })
    }

    return res.status(405).json({ error: 'Método não permitido' })
  } catch (error) {
    console.error('Erro em /api/chat:', error)
    return res.status(500).json({ 
      error: error.message || 'Erro interno do servidor',
    })
  }
}
