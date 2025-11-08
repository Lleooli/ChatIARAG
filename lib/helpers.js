import OpenAI from 'openai'

export function createOpenRouterClient(apiKey) {
  // Limpar apiKey de newlines e espaços
  const cleanApiKey = (apiKey || '').trim()
  
  if (!cleanApiKey || cleanApiKey === 'sk-or-v1-demo-key-placeholder') {
    throw new Error('OPENROUTER_API_KEY inválida ou não configurada. Configure na página Config.')
  }
  
  return new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: cleanApiKey,
    defaultHeaders: {
      'HTTP-Referer': 'https://github.com/Lleooli/ChatIARAG',
      'X-Title': 'ChatIARAG',
    },
  })
}

export async function generateEmbedding(text, apiKey) {
  const client = createOpenRouterClient(apiKey)
  
  const response = await client.embeddings.create({
    model: 'openai/text-embedding-ada-002',
    input: text,
  })
  
  return response.data[0].embedding
}

export async function generateChatCompletion(messages, model, apiKey) {
  const client = createOpenRouterClient(apiKey)
  
  const response = await client.chat.completions.create({
    model,
    messages,
    max_tokens: 1000, // Reduzido para caber nos créditos disponíveis
    temperature: 0.7,
  })
  
  return response.choices[0]?.message?.content || 'Sem resposta'
}

export async function searchSimilarDocuments(supabase, query, apiKey, threshold = 0.7, limit = 3, userId, conversationId) {
  // Gerar embedding da query
  const queryEmbedding = await generateEmbedding(query, apiKey)

  // Tentar chamada com filtros (resolve overload); se falhar, fallback sem filtros
  let response = await supabase.rpc('match_embeddings', {
    query_embedding: queryEmbedding,
    match_threshold: threshold,
    match_count: limit,
    filter_user_id: userId || null,
    filter_conversation_id: conversationId || null,
  })

  if (response.error) {
    console.warn('match_embeddings com filtros falhou, tentando sem filtros:', response.error)
    response = await supabase.rpc('match_embeddings', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit,
    })
  }

  if (response.error) {
    console.error('Erro na busca vetorial:', response.error)
    return []
  }

  return response.data || []
}

export function buildRAGContext(chunks) {
  if (chunks.length === 0) {
    return 'Nenhum documento relevante encontrado.'
  }
  
  const context = chunks
    .map((chunk, idx) => `[Documento ${idx + 1}]\n${chunk.chunk_text}`)
    .join('\n\n---\n\n')
  
  return context
}

export function chunkText(text, chunkSize = 500) {
  const words = text.split(/\s+/)
  const chunks = []
  
  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join(' ')
    chunks.push(chunk)
  }
  
  return chunks
}
