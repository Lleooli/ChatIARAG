import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase não configurado' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // GET - Listar documentos
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('uploaded_at', { ascending: false })
      
      if (error) throw error
      return res.status(200).json(data || [])
    }

    // DELETE - Deletar documento
    if (req.method === 'DELETE') {
      const { id } = req.query
      
      if (!id) {
        return res.status(400).json({ error: 'ID não fornecido' })
      }

      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      return res.status(200).json({ success: true })
    }

    // POST - Upload (simplificado - será implementado depois)
    if (req.method === 'POST') {
      return res.status(501).json({ 
        error: 'Upload não implementado ainda. Use a interface após configurar a API Key.' 
      })
    }

    return res.status(405).json({ error: 'Método não permitido' })
  } catch (error) {
    console.error('Erro em /api/documents:', error)
    return res.status(500).json({ error: error.message || 'Erro interno do servidor' })
  }
}
