import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'seu-secret-super-secreto-mude-isso'
const JWT_EXPIRES_IN = '7d'

/**
 * Gera hash de senha usando bcrypt
 */
export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

/**
 * Compara senha com hash
 */
export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash)
}

/**
 * Gera JWT token
 */
export function generateToken(userId, email) {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )
}

/**
 * Verifica JWT token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}

/**
 * Middleware de autenticação
 */
export function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)

    if (!decoded) {
      return res.status(401).json({ error: 'Token inválido ou expirado' })
    }

    req.userId = decoded.userId
    req.userEmail = decoded.email
    next()
  } catch (error) {
    console.error('❌ Erro no middleware de autenticação:', error)
    res.status(401).json({ error: 'Não autorizado' })
  }
}

/**
 * Middleware opcional (não retorna erro se não autenticado)
 */
export function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const decoded = verifyToken(token)
      
      if (decoded) {
        req.userId = decoded.userId
        req.userEmail = decoded.email
      }
    }
    next()
  } catch (error) {
    next()
  }
}
