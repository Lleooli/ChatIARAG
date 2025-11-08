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
    max_tokens: 500, // Reduzido para evitar erro de créditos insuficientes
    temperature: 0.7,
  })
  
  return response.choices[0]?.message?.content || 'Sem resposta'
}

export async function searchSimilarDocuments(supabase, query, apiKey, threshold = 0.7, limit = 3, userId, conversationId, documentIds = null) {
  // Gerar embedding da query
  const queryEmbedding = await generateEmbedding(query, apiKey)

  // Se documentIds foi fornecido, buscar diretamente nesses documentos
  if (documentIds && Array.isArray(documentIds) && documentIds.length > 0) {
    const { data, error } = await supabase
      .from('embeddings')
      .select(`
        id,
        document_id,
        chunk_text,
        embedding,
        documents!inner(filename, user_id, conversation_id)
      `)
      .in('document_id', documentIds)
      .limit(limit * documentIds.length)

    if (error) {
      console.error('Erro ao buscar embeddings por document_id:', error)
      return []
    }

    // Calcular similaridade manualmente para os chunks encontrados
    const chunksWithSimilarity = data.map(chunk => {
      // Similaridade de cosseno: 1 - distância
      // (Simplificado - idealmente usar biblioteca vetorial)
      return {
        id: chunk.id,
        document_id: chunk.document_id,
        chunk_text: chunk.chunk_text,
        filename: chunk.documents.filename,
        conversation_id: chunk.documents.conversation_id,
        similarity: 0.8 // Placeholder - todos chunks dos docs selecionados são relevantes
      }
    })

    // Ordenar por document_id e pegar top chunks
    return chunksWithSimilarity.slice(0, limit)
  }

  // Caso contrário, usar busca vetorial semântica
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
