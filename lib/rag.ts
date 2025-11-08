import { supabase } from './supabase'
import { generateEmbedding } from './openrouter'

export async function searchSimilarDocuments(
  query: string,
  apiKey: string,
  threshold: number = 0.7,
  limit: number = 3
) {
  // Gerar embedding da query
  const queryEmbedding = await generateEmbedding(query, apiKey)
  
  // Buscar documentos similares no Supabase
  const { data, error } = await supabase.rpc('match_embeddings', {
    query_embedding: queryEmbedding,
    match_threshold: threshold,
    match_count: limit,
  })
  
  if (error) {
    console.error('Erro na busca vetorial:', error)
    return []
  }
  
  return data || []
}

export async function buildRAGContext(chunks: any[]): Promise<string> {
  if (chunks.length === 0) {
    return 'Nenhum documento relevante encontrado.'
  }
  
  const context = chunks
    .map((chunk, idx) => `[Documento ${idx + 1}]\n${chunk.chunk_text}`)
    .join('\n\n---\n\n')
  
  return context
}

export async function processWithRAG(
  userMessage: string,
  systemPrompt: string,
  model: string,
  apiKey: string
): Promise<{ response: string; sources: any[] }> {
  const { generateChatCompletion } = await import('./openrouter')
  
  // Buscar documentos relevantes
  const similarChunks = await searchSimilarDocuments(userMessage, apiKey)
  
  // Construir contexto
  const context = await buildRAGContext(similarChunks)
  
  // Construir prompt
  const messages = [
    {
      role: 'system',
      content: `${systemPrompt}\n\nContexto dos documentos:\n${context}`,
    },
    {
      role: 'user',
      content: userMessage,
    },
  ]
  
  // Gerar resposta
  const response = await generateChatCompletion(messages, model, apiKey)
  
  // Buscar fontes (documentos originais)
  const documentIds = similarChunks.map((chunk: any) => chunk.document_id)
  const { data: sources } = await supabase
    .from('documents')
    .select('id, filename')
    .in('id', documentIds)
  
  return {
    response,
    sources: sources || [],
  }
}
