import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { name, email, password } = req.body

    console.log('📝 Registro - dados recebidos:', { name, email, hasPassword: !!password })

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' })
    }

    // Verificar se email já existe
    console.log('🔍 Verificando email existente...')
    const { data: existing, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    if (checkError) {
      console.error('❌ Erro ao verificar email:', checkError)
      return res.status(500).json({ error: 'Erro ao verificar email', details: checkError.message })
    }

    if (existing) {
      return res.status(400).json({ error: 'Email já cadastrado' })
    }

    // Hash da senha
    console.log('🔐 Gerando hash da senha...')
    const password_hash = await bcrypt.hash(password, 10)
    console.log('✅ Hash gerado com sucesso')

    // Criar usuário
    console.log('👤 Criando usuário no banco...')
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        name,
        email: email.toLowerCase(),
        password_hash
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Erro ao criar usuário:', error)
      return res.status(500).json({ error: 'Erro ao criar usuário', details: error.message })
    }

    console.log('✅ Usuário criado:', user.id)

    // Gerar JWT
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' }
    )

    // Remover password_hash da resposta
    const { password_hash: _, ...userWithoutPassword } = user

    res.status(201).json({
      token,
      user: userWithoutPassword
    })
  } catch (error) {
    console.error('❌ Erro no registro:', error)
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}
