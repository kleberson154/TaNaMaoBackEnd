import { Request, Response, NextFunction } from 'express'
import * as jwt from 'jsonwebtoken'
import { AuthRequest, AuthPayload } from '../types/express'
import User from '../models/User'

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization
  let token: string | undefined
  if (authHeader) {
    token = authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : authHeader
  }

  const cookies = (req as any).cookies
  const cookieAccess = cookies?.accessToken
  const cookieRefresh = cookies?.refreshToken
  if (!token && cookieAccess) token = cookieAccess

  const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret'
  const REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET || 'your_refresh_jwt_secret'

  const unauthorized = (msg = 'Não autorizado') =>
    res.status(401).json({ error: msg })

  try {
    if (token) {
      const payload = (jwt as any).verify(token, JWT_SECRET) as AuthPayload
      req.user = payload
      return next()
    }

    if (cookieRefresh) {
      let payload: any
      try {
        payload = (jwt as any).verify(cookieRefresh, REFRESH_SECRET) as any
      } catch (err) {
        return unauthorized('Refresh token inválido')
      }

      const user = await User.findById(payload.id)
      if (
        !user ||
        !user.refreshTokens ||
        !(user.refreshTokens as string[]).includes(cookieRefresh)
      ) {
        return unauthorized('Sessão inválida')
      }
      req.user = { id: payload.id, email: payload.email } as AuthPayload
      return next()
    }

    return unauthorized('Token não fornecido')
  } catch (err) {
    return unauthorized('Token inválido')
  }
}
