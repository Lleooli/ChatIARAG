import { createClient } from '@supabase/supabase-js'
import { getUserIdFromToken, setCorsHeaders, handleOptions } from '../../lib/auth-helper.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  setCorsHeaders(res)
  if (handleOptions(req, res)) return

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const userId = getUserIdFromToken(req)
    const { id } = req.query

    if (!id) {
      return res.status(400).json({ error: 'ID do documento é obrigatório' })
    }

    // Verificar propriedade
    const { data: doc } = await supabase
      .from('documents')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (!doc) {
      return res.status(404).json({ error: 'Documento não encontrado' })
    }

    // Deletar embeddings primeiro (FK)
    await supabase.from('embeddings').delete().eq('document_id', id)

    // Deletar documento
    const { error } = await supabase.from('documents').delete().eq('id', id)
    if (error) throw error

    res.status(200).json({ message: 'Documento deletado com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar documento:', error)
    if (error.message === 'Token não fornecido' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Não autorizado' })
    }
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}
