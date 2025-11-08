import { createClient } from '@supabase/supabase-js'
import { getUserIdFromToken, setCorsHeaders, handleOptions } from '../../lib/auth-helper.js'
import { generateEmbedding, chunkText } from '../../lib/helpers.js'
import formidable from 'formidable'
import fs from 'fs/promises'
import pdfParse from 'pdf-parse'
import MarkdownIt from 'markdown-it'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
)

const md = new MarkdownIt()

// Desabilitar bodyParser para multipart
export const config = {
  api: {
    bodyParser: false
  }
}

async function parseFile(filepath, mimetype) {
  const buffer = await fs.readFile(filepath)
  
  if (mimetype === 'application/pdf') {
    const data = await pdfParse(buffer)
    return data.text
  } else if (mimetype === 'text/markdown' || filepath.endsWith('.md')) {
    const text = buffer.toString('utf-8')
    return text // Retornar markdown puro
  } else if (mimetype === 'text/plain' || filepath.endsWith('.txt')) {
    return buffer.toString('utf-8')
  }
  
  throw new Error('Tipo de arquivo não suportado')
}

export default async function handler(req, res) {
  setCorsHeaders(res)
  if (handleOptions(req, res)) return

  try {
    const userId = getUserIdFromToken(req)

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('documents')
        .select('id, filename, filetype, filesize, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro em documents:', error)
        throw error
      }
      return res.status(200).json(data)
    }

    if (req.method === 'POST') {
      // Buscar API key do usuário
      const { data: config } = await supabase
        .from('configs')
        .select('openrouter_api_key')
        .eq('user_id', userId)
        .single()

      const apiKey = config?.openrouter_api_key || process.env.OPENROUTER_API_KEY

      const form = formidable({
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowEmptyFiles: false
      })

      const [fields, files] = await new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) reject(err)
          else resolve([fields, files])
        })
      })

      const file = Array.isArray(files.file) ? files.file[0] : files.file
      if (!file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' })
      }

      const content = await parseFile(file.filepath, file.mimetype)
      
      // Criar documento (armazenar conteúdo para auditoria/visualização)
      const { data: doc, error: docError } = await supabase
        .from('documents')
        .insert({
          user_id: userId,
          filename: file.originalFilename,
          filetype: file.mimetype,
          filesize: file.size,
          content
        })
        .select()
        .single()

      if (docError) throw docError

      // Gerar chunks e embeddings
      const chunks = chunkText(content, 500)
      const embeddings = []

      for (let i = 0; i < chunks.length; i++) {
        const embedding = await generateEmbedding(chunks[i], apiKey)
        embeddings.push({
          document_id: doc.id,
          chunk_index: i,
          content: chunks[i],
          embedding
        })
      }

      const { error: embError } = await supabase
        .from('embeddings')
        .insert(embeddings)

      if (embError) throw embError

      // Limpar arquivo temporário
      await fs.unlink(file.filepath).catch(() => {})

      return res.status(201).json({ 
        id: doc.id, 
        filename: doc.filename,
        chunks: chunks.length 
      })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Erro em documents:', error)
    if (error.message === 'Token não fornecido' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Não autorizado' })
    }
    res.status(500).json({ error: error.message || 'Erro interno do servidor' })
  }
}
