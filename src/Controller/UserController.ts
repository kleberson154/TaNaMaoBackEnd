import { Response } from 'express'
import { AuthRequest } from '../types/express'
import User, { IUser } from '../models/User'
import jwt from 'jsonwebtoken'

class UserController {
  async register(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const { email, senha, nome, sobrenome, telefone } = req.body

      const existingUser = await User.findOne({ email })
      if (existingUser) {
        res.status(409).json({ error: 'Usuário já existe' })
        return
      }

      const newUser: IUser = new User({
        email,
        password: senha,
        firstName: nome,
        lastName: sobrenome,
        phone: telefone
      })

      await newUser.save()

      const { password, ...userData } = newUser.toObject()
      res.status(201).json(userData)
    } catch (error) {
      res.status(500).json({ error: 'Erro ao registrar usuário' })
    }
  }

  async login(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const { email, password } = req.body
      const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret'

      const user = await User.findOne({ email })
      if (!user) {
        res.status(401).json({ error: 'Credenciais inválidas' })
        return
      }

      const isMatch = await (user as any).comparePassword(password)
      if (!isMatch) {
        res.status(401).json({ error: 'Credenciais inválidas' })
        return
      }

      const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
        expiresIn: '1h'
      })

      const { password: _, ...safeUser } = user.toObject()
      res.status(200).json({ user: safeUser, token })
    } catch (error) {
      res.status(500).json({ error: 'Erro ao fazer login' })
    }
  }

  async getUserData(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const user = await User.findById(req.user!.id).select('-password')
      if (!user) {
        res.status(404).json({ error: 'Usuário não encontrado' })
        return
      }
      res.status(200).json({ user })
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar dados do usuário' })
    }
  }
}

export default new UserController()
