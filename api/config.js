import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ 
        error: 'Supabase não configurado. Verifique as variáveis de ambiente.',
        supabaseUrl: supabaseUrl ? 'OK' : 'MISSING',
        supabaseKey: supabaseKey ? 'OK' : 'MISSING'
      })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    if (req.method === 'GET') {
      // Buscar configuração
      const { data, error } = await supabase
        .from('configs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (error) throw error
      return res.status(200).json(data || [])
    }

    if (req.method === 'POST') {
      const { openrouter_api_key, model, system_prompt } = req.body

      if (!openrouter_api_key) {
        return res.status(400).json({ error: 'API Key é obrigatória' })
      }

      // Verificar se já existe config
      const { data: existing } = await supabase
        .from('configs')
        .select('id')
        .limit(1)
      
      let result

      if (existing && existing.length > 0) {
        // Atualizar
        const { data, error } = await supabase
          .from('configs')
          .update({
            openrouter_api_key,
            model: model || 'openai/gpt-4-turbo',
            system_prompt: system_prompt || 'Você é um assistente prestativo.',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing[0].id)
          .select()
        
        if (error) throw error
        result = data
      } else {
        // Criar
        const { data, error } = await supabase
          .from('configs')
          .insert({
            openrouter_api_key,
            model: model || 'openai/gpt-4-turbo',
            system_prompt: system_prompt || 'Você é um assistente prestativo.',
          })
          .select()
        
        if (error) throw error
        result = data
      }

      return res.status(200).json(result)
    }

    return res.status(405).json({ error: 'Método não permitido' })
  } catch (error) {
    console.error('Erro em /api/config:', error)
    return res.status(500).json({ error: error.message || 'Erro interno do servidor' })
  }
}
