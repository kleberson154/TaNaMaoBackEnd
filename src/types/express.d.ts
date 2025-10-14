import { Request } from 'express'

export interface AuthPayload {
  id: string
  email: string
}

export interface AuthRequest extends Request {
  user?: AuthPayload
}
