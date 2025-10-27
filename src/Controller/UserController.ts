import { Response } from 'express'
import { AuthRequest } from '../types/express'
import User, { IUser } from '../models/User'
import * as jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import Produto from '../models/Produto'

class UserController {
  async register(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const { nome, cpf, email, senha, confirmacaoSenha } = req.body

      if (senha !== confirmacaoSenha) {
        res.status(400).json({ error: 'As senhas não coincidem' })
        return
      }

      const existingUser = await User.findOne({ email })
      if (existingUser) {
        res.status(409).json({ error: 'Usuário já existe' })
        return
      }

      const existingCPF = await User.findOne({ cpf })
      if (existingCPF) {
        res.status(409).json({ error: 'CPF já cadastrado' })
        return
      }

      const newUser: IUser = new User({
        nome,
        cpf,
        email,
        senha
      })

      await newUser.save()

      const userObj = (newUser as any).toObject
        ? (newUser as any).toObject()
        : (newUser as any)
      delete userObj.senha
      res.status(201).json(userObj)
    } catch (error) {
      res.status(500).json({ error: 'Erro ao registrar usuário' })
    }
  }

  async login(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      // aceitar 'senha' ou 'password' no body
      const { email, senha } = req.body

      const user = await User.findOne({ email })
      if (!user) return res.status(401).json({ error: 'Credenciais inválidas' })

      const isMatch = await (user as any).comparePassword(senha)
      if (!isMatch)
        return res.status(401).json({ error: 'Credenciais inválidas' })

      const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret'
      const REFRESH_SECRET =
        process.env.JWT_REFRESH_SECRET || 'your_refresh_jwt_secret'

      // criar access token (curta duração)
      const accessToken = (jwt as any).sign(
        { id: user._id, email: user.email },
        JWT_SECRET,
        {
          expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m'
        }
      )

      // criar refresh token (longa duração)
      const refreshToken = (jwt as any).sign(
        { id: user._id, email: user.email },
        REFRESH_SECRET,
        {
          expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'
        }
      )

      // persistir refresh token no usuário
      user.refreshTokens = user.refreshTokens || []
      user.refreshTokens.push(refreshToken)
      await user.save()

      // setar cookie HttpOnly com o refresh token
      const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 dias em ms; ajustar conforme REFRESH_TOKEN_EXPIRES_IN
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge
      })

      const userObj = (user as any).toObject
        ? (user as any).toObject()
        : (user as any)
      delete userObj.senha

      return res.status(200).json({ accessToken, user: userObj })
    } catch (error) {
      const msg = (error as Error)?.message || String(error)
      return res.status(500).json({ error: 'Erro ao fazer login: ' + msg })
    }
  }

  async refreshToken(
    req: AuthRequest,
    res: Response
  ): Promise<Response | void> {
    try {
      const token = req.cookies?.refreshToken || req.headers['x-refresh-token']
      if (!token)
        return res.status(401).json({ error: 'Refresh token não fornecido' })

      const REFRESH_SECRET =
        process.env.JWT_REFRESH_SECRET || 'your_refresh_jwt_secret'

      let payload: any
      try {
        payload = jwt.verify(token, REFRESH_SECRET) as any
      } catch (err) {
        return res.status(401).json({ error: 'Refresh token inválido' })
      }

      const user = await User.findById(payload.id)
      if (!user || !user.refreshTokens || !user.refreshTokens.includes(token)) {
        return res.status(401).json({ error: 'Sessão inválida' })
      }

      // emitir novo access token
      const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret'
      const accessToken = (jwt as any).sign(
        { id: user._id, email: user.email },
        JWT_SECRET,
        {
          expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m'
        }
      )

      // opcional: rotação de refresh token (emitir novo e remover o antigo)
      const rotate = process.env.ROTATE_REFRESH_TOKENS === 'true'
      if (rotate) {
        const REFRESH_SECRET2 = REFRESH_SECRET
        const newRefresh = (jwt as any).sign(
          { id: user._id, email: user.email },
          REFRESH_SECRET2,
          {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'
          }
        )
        // substituir token antigo pelo novo
        user.refreshTokens = (user.refreshTokens || []).filter(
          (t: string) => t !== token
        )
        user.refreshTokens.push(newRefresh)
        await user.save()
        const maxAge = 7 * 24 * 60 * 60 * 1000
        res.cookie('refreshToken', newRefresh, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge
        })
      }

      return res.status(200).json({ accessToken })
    } catch (error) {
      const msg = (error as Error)?.message || String(error)
      return res
        .status(500)
        .json({ error: 'Erro ao gerar novo access token: ' + msg })
    }
  }

  async logout(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const token = req.cookies?.refreshToken
      if (!token) {
        // limpar cookie mesmo assim
        res.clearCookie('refreshToken', { path: '/' })
        return res.status(200).json({ ok: true })
      }

      // encontrar usuário e limpar toda a lista de refresh tokens
      const user = await User.findOne({ refreshTokens: token })
      if (user) {
        user.refreshTokens = []
        await user.save()
      }

      res.clearCookie('refreshToken', { path: '/' })
      return res.status(200).json({ ok: true })
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao deslogar' })
    }
  }

  async getUserData(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const user = await User.findById(req.user!.id).select('-senha')
      if (!user) {
        res.status(404).json({ error: 'Usuário não encontrado' })
        return
      }
      res.status(200).json({ user })
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar dados do usuário' })
    }
  }

  async updateUserData(
    req: AuthRequest,
    res: Response
  ): Promise<Response | void> {
    try {
      const user = await User.findById(req.user!.id)
      if (!user) {
        res.status(404).json({ error: 'Usuário não encontrado' })
        return
      }

      // atualizar dados do usuário
      const {
        nome,
        email,
        endereco: { telefone, cep, rua, complemento, cidade, estado }
      } = req.body
      user.email = email
      user.nome = nome
      user.endereco = [
        {
          telefone,
          cep,
          rua,
          complemento,
          cidade,
          estado
        }
      ]

      await user.save()

      res.status(200).json({ user })
    } catch (error) {
      res.status(500).json({ error: 'Erro ao atualizar dados do usuário' })
    }
  }

  async getSearch(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      // accept query from query string or route params
      const rawQuery =
        (req.query && (req.query.query as string)) ||
        (req.params && (req.params.query as string)) ||
        ''

      const query = (rawQuery || '').trim()
      if (!query) {
        // no query provided -> return empty list
        res.status(200).json({ produtos: [] })
        return
      }

      // escape regex special characters to avoid invalid regex / security issues
      const escapeRegex = (s: string) =>
        s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      const regex = new RegExp(escapeRegex(query), 'i')

      const produtos = await Produto.find({
        nome: { $regex: regex }
      })
      res.status(200).json({ produtos })
    } catch (error) {
      const msg = (error as Error)?.message || String(error)
      res.status(500).json({ error: 'Erro ao buscar produtos: ' + msg })
    }
  }

  async getProduto(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const produto = await Produto.findById(req.params.id)
      if (!produto) {
        res.status(404).json({ error: 'Produto não encontrado' })
        return
      }
      res.status(200).json({ produto })
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar dados do produto' })
    }
  }

  async getAllProdutos(
    req: AuthRequest,
    res: Response
  ): Promise<Response | void> {
    try {
      const produtos = await Produto.find()
      res.status(200).json({ produtos })
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar produtos' })
    }
  }

  async createProduto(
    req: AuthRequest,
    res: Response
  ): Promise<Response | void> {
    const idVendedor = req.user?.id
    try {
      const { nome, categoria, tipoVenda, preco, descricao, imagemUrl } =
        req.body
      const novoProduto = new Produto({
        idVendedor,
        nome,
        categoria,
        tipoVenda,
        preco,
        descricao,
        imagemUrl
      })
      await novoProduto.save()
      res.status(201).json({ produto: novoProduto })
    } catch (error) {
      res.status(500).json({ error: 'Erro ao criar produto: ' + error })
    }
  }

  async createAvaliacao(
    req: AuthRequest,
    res: Response
  ): Promise<Response | void> {
    try {
      const idUsuario = req.user?.id
      const idProduto = req.params.id
      const { nota, comentario } = req.body

      if (!idUsuario) {
        res.status(401).json({ error: 'Usuário não autenticado' })
        return
      }

      const notaNumber = Number(nota)
      if (isNaN(notaNumber) || notaNumber < 1 || notaNumber > 5) {
        res.status(400).json({ error: 'Nota inválida' })
        return
      }

      const novaAvaliacao = {
        idUsuario: new mongoose.Types.ObjectId(idUsuario),
        nota: notaNumber,
        comentario: comentario ? String(comentario) : ''
      }

      const produto = await Produto.findById(idProduto)
      if (!produto) {
        res.status(404).json({ error: 'Produto não encontrado' })
        return
      }
      produto.avaliacoes = produto.avaliacoes || []
      produto.avaliacoes.push(novaAvaliacao)
      await produto.save()
      res.status(201).json({ avaliacao: novaAvaliacao })
    } catch (error) {
      res.status(500).json({ error: 'Erro ao criar avaliação' })
    }
  }
}

export default new UserController()
