import { Response, NextFunction } from 'express'
import * as jwt from 'jsonwebtoken'
import { AuthRequest, AuthPayload } from '../types/express'

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido' })
  }

  const token = authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : authHeader

  const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret'

  try {
    const payload = (jwt as any).verify(token, JWT_SECRET) as AuthPayload
    req.user = payload
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' })
  }
}
