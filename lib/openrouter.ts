import OpenAI from 'openai'

export function createOpenRouterClient(apiKey: string) {
  return new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    defaultHeaders: {
      'HTTP-Referer': 'https://github.com/Lleooli/ChatIARAG',
      'X-Title': 'ChatIARAG',
    },
  })
}

export async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const client = createOpenRouterClient(apiKey)
  
  const response = await client.embeddings.create({
    model: 'openai/text-embedding-ada-002',
    input: text,
  })
  
  return response.data[0].embedding
}

export async function generateChatCompletion(
  messages: Array<{ role: string; content: string }>,
  model: string,
  apiKey: string
): Promise<string> {
  const client = createOpenRouterClient(apiKey)
  
  const response = await client.chat.completions.create({
    model,
    messages: messages as any, // OpenAI SDK type assertion
  })
  
  return response.choices[0]?.message?.content || 'Sem resposta'
}
