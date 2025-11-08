import { createClient } from '@supabase/supabase-js'
import { getUserIdFromToken, setCorsHeaders, handleOptions } from '../../lib/auth-helper.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  setCorsHeaders(res)
  if (handleOptions(req, res)) return

  try {
    const userId = getUserIdFromToken(req)

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('configs')
        .select('openrouter_api_key, model, system_prompt')
        .eq('user_id', userId)
        .limit(1)

      if (error) {
        console.error('Erro ao buscar config:', error)
        return res.status(500).json({ error: 'Erro ao buscar config' })
      }

      return res.status(200).json(data || [])
    }

    if (req.method === 'POST') {
      const { openrouter_api_key, model, system_prompt } = req.body

      if (!openrouter_api_key || !model) {
        return res.status(400).json({ error: 'API key e modelo são obrigatórios' })
      }

      // Upsert (se já existir, atualiza; senão cria)
      const { data, error } = await supabase
        .from('configs')
        .upsert({
          user_id: userId,
          openrouter_api_key: openrouter_api_key.trim(),
          model,
          system_prompt: system_prompt || ''
        }, { onConflict: 'user_id' })
        .select()

      if (error) {
        console.error('Erro ao salvar config:', error)
        return res.status(500).json({ error: 'Erro ao salvar config' })
      }

      return res.status(200).json({ success: true, config: data?.[0] })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Erro em /api/config:', err)
    if (err.message === 'Token não fornecido') {
      return res.status(401).json({ error: 'Não autorizado' })
    }
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
}
