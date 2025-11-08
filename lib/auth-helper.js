import jwt from 'jsonwebtoken'

export function getUserIdFromToken(req) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Token não fornecido')
  }
  const token = authHeader.replace('Bearer ', '')
  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret')
  return decoded.userId
}

export function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization')
}

export function handleOptions(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return true
  }
  return false
}
