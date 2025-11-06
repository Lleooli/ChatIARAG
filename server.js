import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import multer from 'multer'
import pdfParse from 'pdf-parse'
import EvolutionClient from './lib/evolution.js'
import {
  generateEmbedding,
  generateChatCompletion,
  searchSimilarDocuments,
  buildRAGContext,
  chunkText,
} from './lib/helpers.js'
import {
  hashPassword,
  comparePassword,
  generateToken,
  authMiddleware,
  optionalAuth,
} from './lib/auth.js'

dotenv.config({ path: '.env.local' })

const app = express()
const PORT = 3000

// Multer para upload
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
})

// Middleware manual de CORS para Vercel Serverless
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.header('Access-Control-Allow-Credentials', 'true')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  next()
})

// Middlewares
app.use(express.json())

// Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️ Erro: Variáveis de ambiente do Supabase não configuradas!')
  console.log('Crie um arquivo .env.local com:')
  console.log('VITE_SUPABASE_URL=...')
  console.log('VITE_SUPABASE_ANON_KEY=...')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Evolution API Client
const evolutionClient = new EvolutionClient('chatia')

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', supabase: 'connected' })
})

// ============================================
// AUTH ROUTES
// ============================================

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body

    console.log('🔐 Login attempt:', email)

    // Buscar usuário
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .limit(1)

    if (error) throw error
    if (!users || users.length === 0) {
      return res.status(401).json({ error: 'Email ou senha incorretos' })
    }

    const user = users[0]

    // Verificar senha
    const isValid = await comparePassword(password, user.password_hash)
    if (!isValid) {
      return res.status(401).json({ error: 'Email ou senha incorretos' })
    }

    // Atualizar último login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id)

    // Gerar token
    const token = generateToken(user.id, user.email)

    console.log('✅ Login successful:', user.email)

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    })
  } catch (error) {
    console.error('❌ Login error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Register (criar novo usuário)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body

    console.log('👤 Register attempt:', email)

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' })
    }

    // Verificar se email já existe
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .limit(1)

    if (existing && existing.length > 0) {
      return res.status(409).json({ error: 'Email já cadastrado' })
    }

    // Hash da senha
    const password_hash = await hashPassword(password)

    // Criar usuário
    const { data: user, error } = await supabase
      .from('users')
      .insert([{ email, password_hash, name }])
      .select()
      .single()

    if (error) throw error

    // Gerar token
    const token = generateToken(user.id, user.email)

    console.log('✅ User registered:', user.email)

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    })
  } catch (error) {
    console.error('❌ Register error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Verificar token
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, created_at, last_login')
      .eq('id', req.userId)
      .single()

    if (error) throw error

    res.json({ user })
  } catch (error) {
    console.error('❌ Auth me error:', error)
    res.status(500).json({ error: error.message })
  }
})

// ============================================
// CONVERSATIONS ROUTES
// ============================================

// Listar conversas
app.get('/api/conversations', authMiddleware, async (req, res) => {
  try {
    const { status } = req.query

    console.log('📋 GET /api/conversations', { userId: req.userId, status })

    let query = supabase
      .from('conversations')
      .select('*')
      .eq('user_id', req.userId)
      .order('updated_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    console.log(`✅ Conversas: ${data.length}`)
    res.json(data)
  } catch (error) {
    console.error('❌ Erro ao listar conversas:', error)
    res.status(500).json({ error: error.message })
  }
})

// Criar conversa
app.post('/api/conversations', authMiddleware, async (req, res) => {
  try {
    const { title, sender_id, sender_name } = req.body

    console.log('📝 POST /api/conversations', { title, sender_id })

    const { data, error } = await supabase
      .from('conversations')
      .insert([{
        user_id: req.userId,
        title,
        sender_id: sender_id || 'local',
        sender_name: sender_name || 'Usuário Local',
        status: 'new',
      }])
      .select()
      .single()

    if (error) throw error

    console.log('✅ Conversa criada:', data.id)
    res.json(data)
  } catch (error) {
    console.error('❌ Erro ao criar conversa:', error)
    res.status(500).json({ error: error.message })
  }
})

// Atualizar conversa (mudar status, título)
app.patch('/api/conversations/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body

    console.log('🔄 PATCH /api/conversations/:id', { id, updates })

    const { data, error } = await supabase
      .from('conversations')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.userId)
      .select()
      .single()

    if (error) throw error

    console.log('✅ Conversa atualizada')
    res.json(data)
  } catch (error) {
    console.error('❌ Erro ao atualizar conversa:', error)
    res.status(500).json({ error: error.message })
  }
})

// Deletar conversa
app.delete('/api/conversations/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params

    console.log('🗑️ DELETE /api/conversations/:id', { id })

    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id)
      .eq('user_id', req.userId)

    if (error) throw error

    console.log('✅ Conversa deletada')
    res.json({ success: true })
  } catch (error) {
    console.error('❌ Erro ao deletar conversa:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get messages from a specific conversation
app.get('/api/conversations/:id/messages', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params

    console.log('💬 GET /api/conversations/:id/messages', { id })

    // Verificar se a conversa pertence ao usuário
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.userId)
      .single()

    if (!conversation) {
      return res.status(404).json({ error: 'Conversa não encontrada' })
    }

    // Buscar mensagens
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })

    if (error) throw error

    console.log(`✅ Mensagens retornadas: ${data?.length || 0}`)
    res.json(data || [])
  } catch (error) {
    console.error('❌ Erro ao buscar mensagens:', error)
    res.status(500).json({ error: error.message })
  }
})

// Config routes (agora protegidas)
app.get('/api/config', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('configs')
      .select('*')
      .eq('user_id', req.userId)
      .limit(1)
    
    if (error) throw error
    res.json(data || [])
  } catch (error) {
    console.error('Erro /api/config GET:', error)
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/config', authMiddleware, async (req, res) => {
  try {
    const { openrouter_api_key, model, system_prompt } = req.body

    if (!openrouter_api_key) {
      return res.status(400).json({ error: 'API Key é obrigatória' })
    }

    const { data: existing } = await supabase
      .from('configs')
      .select('id')
      .eq('user_id', req.userId)
      .limit(1)
    
    let result

    if (existing && existing.length > 0) {
      const { data, error } = await supabase
        .from('configs')
        .update({
          openrouter_api_key,
          model: model || 'openai/gpt-4-turbo',
          system_prompt: system_prompt || 'Você é um assistente prestativo.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing[0].id)
        .eq('user_id', req.userId)
        .select()
      
      if (error) throw error
      result = data
    } else {
      const { data, error } = await supabase
        .from('configs')
        .insert({
          user_id: req.userId,
          openrouter_api_key,
          model: model || 'openai/gpt-4-turbo',
          system_prompt: system_prompt || 'Você é um assistente prestativo.',
        })
        .select()
      
      if (error) throw error
      result = data
    }

    res.json(result)
  } catch (error) {
    console.error('Erro /api/config POST:', error)
    res.status(500).json({ error: error.message })
  }
})

// Documents routes
// Documents routes (protegidas)
app.get('/api/documents', authMiddleware, async (req, res) => {
  try {
    const { conversation_id } = req.query
    console.log('📥 GET /api/documents', { conversation_id })
    
    let query = supabase
      .from('documents')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
    
    if (conversation_id) {
      query = query.eq('conversation_id', conversation_id)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('❌ Erro Supabase:', error)
      throw error
    }
    console.log('✅ Documentos:', data?.length || 0)
    res.json(data || [])
  } catch (error) {
    console.error('❌ Erro /api/documents GET:', error.message)
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/documents/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    
    // Deletar embeddings primeiro (foreign key)
    await supabase
      .from('embeddings')
      .delete()
      .eq('document_id', id)
    
    // Depois deletar documento
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)
      .eq('user_id', req.userId)
    
    if (error) throw error
    res.json({ success: true })
  } catch (error) {
    console.error('Erro /api/documents DELETE:', error)
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/documents/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const { conversation_id } = req.body
    
    console.log('📤 POST /api/documents/upload')
    console.log('📦 Dados recebidos:', {
      hasFile: !!req.file,
      conversation_id,
      userId: req.userId,
      headers: req.headers['content-type']
    })
    
    if (!req.file) {
      console.error('❌ Nenhum arquivo no request')
      return res.status(400).json({ error: 'Nenhum arquivo enviado' })
    }

    const { originalname, mimetype, size, buffer } = req.file
    
    console.log(`📄 Arquivo: ${originalname} (${(size / 1024).toFixed(2)} KB)`)
    console.log(`📋 Tipo: ${mimetype}`)
    
    // Extrair texto do arquivo
    let content = ''
    
    try {
      if (mimetype === 'application/pdf') {
        console.log('📖 Parseando PDF...')
        const pdfData = await pdfParse(buffer)
        content = pdfData.text
        console.log(`✅ PDF parseado: ${pdfData.numpages} páginas, ${content.length} caracteres`)
      } else {
        // TXT, MD, etc
        content = buffer.toString('utf-8')
        console.log(`✅ Texto extraído: ${content.length} caracteres`)
      }
      
      if (!content || content.trim().length === 0) {
        throw new Error('Não foi possível extrair texto do arquivo')
      }
    } catch (parseError) {
      console.error('❌ Erro ao extrair texto:', parseError)
      return res.status(400).json({ 
        error: `Erro ao processar arquivo: ${parseError.message}` 
      })
    }
    
    // Obter configuração (API key)
    console.log('🔑 Buscando configuração...')
    const { data: configs, error: configError } = await supabase
      .from('configs')
      .select('openrouter_api_key')
      .limit(1)
    
    console.log('📊 Configs:', { found: configs?.length, error: configError })
    console.log('📊 Configs:', { found: configs?.length, error: configError })
    
    if (!configs || configs.length === 0) {
      console.error('❌ Sem configuração no banco')
      return res.status(400).json({ 
        error: 'Configure a API Key primeiro em /config' 
      })
    }
    
    const apiKey = configs[0].openrouter_api_key
    console.log('✅ API Key encontrada')
    
    // Inserir documento
    console.log('💾 Salvando documento no Supabase...')
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({
        user_id: req.userId,
        conversation_id: conversation_id || null,
        filename: originalname,
        filetype: mimetype,
        filesize: size,
        content,
      })
      .select()
      .single()
    
    if (docError) {
      console.error('❌ Erro ao salvar documento:', docError)
      throw docError
    }
    
    console.log(`✅ Documento salvo: ${doc.id}`)
    
    // Dividir em chunks e gerar embeddings
    const chunks = chunkText(content, 500)
    console.log(`🔪 Dividido em ${chunks.length} chunks`)
    
    let embeddingsCount = 0
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      console.log(`🧮 Gerando embedding ${i + 1}/${chunks.length}...`)
      
      try {
        const embedding = await generateEmbedding(chunk, apiKey)
        
        await supabase
          .from('embeddings')
          .insert({
            document_id: doc.id,
            chunk_text: chunk,
            chunk_index: i,
            embedding,
          })
        
        embeddingsCount++
        console.log(`✅ Embedding ${i + 1} salvo`)
      } catch (embError) {
        console.error(`❌ Erro no embedding ${i + 1}:`, embError.message)
        throw embError
      }
    }
    
    console.log(`✅ ${embeddingsCount} embeddings gerados`)
    
    res.json({ 
      success: true, 
      document: doc,
      chunks: chunks.length,
      embeddings: embeddingsCount,
    })
  } catch (error) {
    console.error('❌ Erro /api/documents/upload:', error)
    res.status(500).json({ error: error.message })
  }
})

// Chat routes
// Chat history (protegido)
app.get('/api/chat/history', authMiddleware, async (req, res) => {
  try {
    console.log('📥 GET /api/chat/history')
    const { conversation_id, sender_id } = req.query
    
    let query = supabase
      .from('messages')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: true })
      .limit(100)
    
    if (conversation_id) {
      query = query.eq('conversation_id', conversation_id)
    } else if (sender_id) {
      query = query.eq('sender_id', sender_id)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('❌ Erro Supabase:', error)
      throw error
    }
    console.log('✅ Mensagens:', data?.length || 0)
    res.json(data || [])
  } catch (error) {
    console.error('❌ Erro /api/chat/history GET:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// Avaliar mensagem
app.post('/api/messages/:id/rate', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const { rating } = req.body
    
    console.log('⭐ Rating mensagem:', { id, rating })
    
    const { data, error } = await supabase
      .from('messages')
      .update({ rating })
      .eq('id', id)
      .eq('user_id', req.userId)
      .select()
      .single()
    
    if (error) throw error
    
    console.log('✅ Rating salvo')
    res.json(data)
  } catch (error) {
    console.error('❌ Erro ao avaliar:', error)
    res.status(500).json({ error: error.message })
  }
})

// Métricas do Dashboard
app.get('/api/metrics', authMiddleware, async (req, res) => {
  try {
    const { range = '7d' } = req.query
    
    // Calcular data inicial baseado no range
    const now = new Date()
    const dateFrom = new Date()
    if (range === '7d') dateFrom.setDate(now.getDate() - 7)
    else if (range === '30d') dateFrom.setDate(now.getDate() - 30)
    else dateFrom.setFullYear(2020) // all time
    
    console.log('📊 GET /api/metrics', { range, dateFrom })
    
    // Contar conversas
    const { count: conversationCount } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.userId)
      .gte('created_at', dateFrom.toISOString())
    
    // Contar mensagens
    const { count: messageCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.userId)
      .gte('created_at', dateFrom.toISOString())
    
    // Contar documentos
    const { count: documentCount } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.userId)
    
    // Rating médio
    const { data: ratings } = await supabase
      .from('messages')
      .select('rating')
      .eq('user_id', req.userId)
      .not('rating', 'is', null)
      .in('rating', ['1', '2', '3', '4', '5'])
    
    const avgRating = ratings && ratings.length > 0
      ? ratings.reduce((sum, msg) => sum + parseInt(msg.rating), 0) / ratings.length
      : 0
    
    // Mensagens por dia (últimos 7 dias)
    const { data: dailyMessages } = await supabase
      .from('messages')
      .select('created_at')
      .eq('user_id', req.userId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true })
    
    const messagesByDay = {}
    dailyMessages?.forEach(msg => {
      const day = new Date(msg.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
      messagesByDay[day] = (messagesByDay[day] || 0) + 1
    })
    
    // Top modelos
    const { data: modelStats } = await supabase
      .from('messages')
      .select('model')
      .eq('user_id', req.userId)
      .eq('role', 'assistant')
      .not('model', 'is', null)
    
    const modelCounts = {}
    modelStats?.forEach(msg => {
      modelCounts[msg.model] = (modelCounts[msg.model] || 0) + 1
    })
    
    const topModels = Object.entries(modelCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([model, count]) => ({ model, count }))
    
    // Top documentos
    const { data: docStats } = await supabase
      .from('documents')
      .select('id, filename')
      .eq('user_id', req.userId)
    
    // Contar quantas vezes cada documento aparece em sources
    const { data: messagesWithSources } = await supabase
      .from('messages')
      .select('sources')
      .eq('user_id', req.userId)
      .not('sources', 'is', null)
    
    const docUsage = {}
    messagesWithSources?.forEach(msg => {
      if (Array.isArray(msg.sources)) {
        msg.sources.forEach(src => {
          if (src.id) {
            docUsage[src.id] = (docUsage[src.id] || 0) + 1
          }
        })
      }
    })
    
    const topDocuments = docStats
      ?.map(doc => ({
        ...doc,
        usage: docUsage[doc.id] || 0
      }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 3)
    
    res.json({
      conversationCount: conversationCount || 0,
      messageCount: messageCount || 0,
      documentCount: documentCount || 0,
      avgRating: Math.round(avgRating * 10) / 10,
      messagesByDay,
      topModels,
      topDocuments,
    })
  } catch (error) {
    console.error('❌ Erro ao buscar métricas:', error)
    res.status(500).json({ error: error.message })
  }
})

// WhatsApp Webhook Routes
app.post('/api/webhook/whatsapp', async (req, res) => {
  try {
    console.log('📱 Webhook WhatsApp recebido')
    console.log('📦 Dados:', JSON.stringify(req.body, null, 2))
    
    const { event, instance, data } = req.body
    
    // Responder imediatamente para não bloquear o webhook
    res.status(200).json({ success: true })
    
    // Processar apenas mensagens recebidas (não enviadas por nós)
    if (event === 'messages.upsert' && data?.key?.fromMe === false) {
      const message = data.message
      const remoteJid = data.key.remoteJid
      const messageText = message?.conversation || 
                         message?.extendedTextMessage?.text || 
                         ''
      
      if (!messageText) {
        console.log('⚠️ Mensagem sem texto, ignorando')
        return
      }
      
      console.log(`💬 Mensagem de ${remoteJid}: "${messageText}"`)
      
      // Processar mensagem com IA + RAG em background
      processWhatsAppMessage(remoteJid, messageText).catch(error => {
        console.error('❌ Erro ao processar mensagem WhatsApp:', error)
      })
    }
  } catch (error) {
    console.error('❌ Erro no webhook:', error)
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/webhook/status', async (req, res) => {
  try {
    const connection = await evolutionClient.checkConnection()
    const info = await evolutionClient.getInstanceInfo()
    
    res.json({
      connected: connection.state === 'open',
      connection,
      instance: info,
      webhook_url: `${req.protocol}://${req.get('host')}/api/webhook/whatsapp`,
    })
  } catch (error) {
    console.error('❌ Erro ao verificar status:', error)
    res.status(500).json({ error: error.message })
  }
})

// Endpoint para testar envio de mensagem manualmente
app.post('/api/webhook/test', async (req, res) => {
  try {
    const { number, message } = req.body
    
    if (!number || !message) {
      return res.status(400).json({ 
        error: 'Campos "number" e "message" são obrigatórios' 
      })
    }
    
    console.log(`📤 Teste: Enviando "${message}" para ${number}`)
    const result = await evolutionClient.sendText(number, message)
    
    res.json({ 
      success: true, 
      message: 'Mensagem enviada com sucesso!',
      result 
    })
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem de teste:', error)
    res.status(500).json({ error: error.message })
  }
})

// Função auxiliar para processar mensagens do WhatsApp
async function processWhatsAppMessage(remoteJid, messageText) {
  try {
    console.log('🤖 Processando mensagem com IA...')
    
    // Obter configuração
    const { data: configs } = await supabase
      .from('configs')
      .select('*')
      .limit(1)
    
    if (!configs || configs.length === 0) {
      await evolutionClient.sendText(
        remoteJid,
        '⚠️ Sistema não configurado. Entre em contato com o administrador.'
      )
      return
    }
    
    const { openrouter_api_key, model, system_prompt } = configs[0]
    
    // Salvar mensagem do usuário
    await supabase
      .from('messages')
      .insert({
        sender_id: remoteJid,
        role: 'user',
        content: messageText,
      })
    
    // Buscar documentos relevantes com RAG
    const similarChunks = await searchSimilarDocuments(
      supabase,
      messageText,
      openrouter_api_key,
      0.7,
      3
    )
    
    console.log(`📚 Encontrados ${similarChunks.length} chunks relevantes`)
    
    // Construir contexto RAG
    const context = buildRAGContext(similarChunks)
    
    // Gerar resposta
    const messages = [
      {
        role: 'system',
        content: `${system_prompt}\n\nContexto dos documentos:\n${context}`,
      },
      {
        role: 'user',
        content: messageText,
      },
    ]
    
    console.log('🧠 Gerando resposta...')
    const assistantResponse = await generateChatCompletion(
      messages,
      model,
      openrouter_api_key
    )
    
    // Salvar resposta do assistente
    await supabase
      .from('messages')
      .insert({
        sender_id: remoteJid,
        role: 'assistant',
        content: assistantResponse,
      })
    
    // Enviar resposta via WhatsApp
    console.log('📤 Enviando resposta via WhatsApp...')
    await evolutionClient.sendText(remoteJid, assistantResponse)
    
    console.log('✅ Mensagem WhatsApp processada com sucesso')
  } catch (error) {
    console.error('❌ Erro ao processar mensagem WhatsApp:', error)
    
    try {
      await evolutionClient.sendText(
        remoteJid,
        '❌ Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente mais tarde.'
      )
    } catch (sendError) {
      console.error('❌ Erro ao enviar mensagem de erro:', sendError)
    }
  }
}

// Chat endpoint (protegido)
app.post('/api/chat', authMiddleware, async (req, res) => {
  try {
    console.log('💬 POST /api/chat')
    const { message, conversation_id, sender_id = 'local', document_ids } = req.body
    
    if (!message) {
      return res.status(400).json({ error: 'Mensagem obrigatória' })
    }
    
    // Obter configuração do usuário
    const { data: configs } = await supabase
      .from('configs')
      .select('*')
      .eq('user_id', req.userId)
      .limit(1)
    
    if (!configs || configs.length === 0) {
      return res.status(400).json({ 
        error: 'Configure a API Key primeiro em /config' 
      })
    }
    
    const { openrouter_api_key, model, system_prompt } = configs[0]
    
    console.log(`🤖 Modelo: ${model}`)
    console.log(`📎 Documentos anexados: ${document_ids ? document_ids.length : 0}`)
    
    // Criar ou obter conversa
    let finalConversationId = conversation_id
    
    if (!finalConversationId) {
      // Criar nova conversa se não foi fornecida
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          user_id: req.userId,
          title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
          sender_id,
          status: 'new',
        })
        .select()
        .single()
      
      finalConversationId = newConv?.id
      console.log('📝 Nova conversa criada:', finalConversationId)
    }
    
    // Salvar mensagem do usuário
    const { data: userMsg } = await supabase
      .from('messages')
      .insert({
        conversation_id: finalConversationId,
        user_id: req.userId,
        sender_id,
        role: 'user',
        content: message,
      })
      .select()
      .single()
    
    console.log('💾 Mensagem do usuário salva')
    
    // Buscar documentos relevantes com RAG
    let similarChunks
    
    if (document_ids && document_ids.length > 0) {
      // Buscar apenas nos documentos selecionados
      console.log('🎯 Buscando apenas nos documentos anexados')
      
      // Gerar embedding da pergunta
      const questionEmbedding = await generateEmbedding(message, openrouter_api_key)
      
      // Buscar chunks apenas dos documentos selecionados
      const { data: chunks } = await supabase
        .rpc('match_documents', {
          query_embedding: questionEmbedding,
          match_threshold: 0.5,
          match_count: 5,
        })
      
      // Filtrar apenas os chunks dos documentos selecionados
      similarChunks = chunks?.filter(chunk => 
        document_ids.includes(chunk.document_id)
      ) || []
      
      console.log(`📚 Encontrados ${similarChunks.length} chunks nos documentos anexados`)
    } else {
      // Busca normal em todos os documentos do usuário
      similarChunks = await searchSimilarDocuments(
        supabase,
        message,
        openrouter_api_key,
        0.7,
        3
      )
      
      console.log(`📚 Encontrados ${similarChunks.length} chunks relevantes`)
    }
    
    // Construir contexto RAG
    const context = buildRAGContext(similarChunks)
    
    // Buscar documentos fontes
    const documentIdsFromChunks = similarChunks.map(chunk => chunk.document_id)
    const { data: sources } = await supabase
      .from('documents')
      .select('id, filename')
      .in('id', documentIdsFromChunks)
    
    // Gerar resposta
    const messages = [
      {
        role: 'system',
        content: `${system_prompt}\n\nContexto dos documentos:\n${context}`,
      },
      {
        role: 'user',
        content: message,
      },
    ]
    
    console.log('🧠 Gerando resposta...')
    const assistantResponse = await generateChatCompletion(
      messages,
      model,
      openrouter_api_key
    )
    
    console.log('✅ Resposta gerada')
    
    // Salvar resposta do assistente
    const { data: assistantMsg } = await supabase
      .from('messages')
      .insert({
        conversation_id: finalConversationId,
        user_id: req.userId,
        sender_id,
        role: 'assistant',
        content: assistantResponse,
        model,
        sources: sources || [],
      })
      .select()
      .single()
    
    res.json({
      message: assistantMsg,
      sources: sources || [],
      conversation_id: finalConversationId,
    })
  } catch (error) {
    console.error('❌ Erro /api/chat:', error)
    res.status(500).json({ error: error.message })
  }
})

// Start server
const server = app.listen(PORT, () => {
  console.log(`✅ API Server rodando em http://localhost:${PORT}`)
  console.log(`📊 Supabase: ${supabaseUrl}`)
  console.log(`\n🔗 Endpoints disponíveis:`)
  console.log(`   GET  /api/health`)
  console.log(`   POST /api/auth/login`)
  console.log(`   POST /api/auth/register`)
  console.log(`   GET  /api/auth/me`)
  console.log(`   GET  /api/conversations`)
  console.log(`   POST /api/conversations`)
  console.log(`   PATCH /api/conversations/:id`)
  console.log(`   DELETE /api/conversations/:id`)
  console.log(`   GET  /api/conversations/:id/messages`)
  console.log(`   GET  /api/config`)
  console.log(`   POST /api/config`)
  console.log(`   GET  /api/documents`)
  console.log(`   POST /api/documents/upload`)
  console.log(`   DELETE /api/documents/:id`)
  console.log(`   POST /api/chat`)
  console.log(`   GET  /api/chat/history`)
  console.log(`   POST /api/messages/:id/rate`)
  console.log(`   GET  /api/metrics`)
  console.log(`   POST /api/webhook/whatsapp`)
  console.log(`   GET  /api/webhook/status`)
  console.log(`   POST /api/webhook/test`)
  console.log(`\n📱 WhatsApp: Configure o webhook da Evolution API para: http://seu-dominio/api/webhook/whatsapp`)
  console.log(`\n🧪 Teste o status: http://localhost:${PORT}/api/webhook/status`)
})

// Manter o processo vivo
server.on('error', (error) => {
  console.error('❌ Erro no servidor:', error)
  process.exit(1)
})

process.on('SIGINT', () => {
  console.log('\n⚠️ Servidor interrompido')
  server.close(() => {
    console.log('✅ Servidor fechado')
    process.exit(0)
  })
})

// Export para Vercel serverless functions
export default app
