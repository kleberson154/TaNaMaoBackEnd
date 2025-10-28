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

      const userObj = (user as any).toObject
        ? (user as any).toObject()
        : (user as any)
      delete userObj.senha

      // retornar ambos tokens no body (frontend enviará Authorization Bearer)
      return res.status(200).json({ accessToken, refreshToken, user: userObj })
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
      const token =
        (req.headers['x-refresh-token'] as string) || req.body?.refreshToken
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
        // retornar novo refresh token no body (frontend deve armazenar em memória/local secure storage)
        // Note: secure storage on client is recommended; avoid localStorage if possible.
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
      const token =
        (req.headers['x-refresh-token'] as string) || req.body?.refreshToken
      if (!token)
        return res.status(200).json({ ok: true, message: 'No token provided' })

      const user = await User.findOne({ refreshTokens: token })
      if (user) {
        user.refreshTokens = []
        await user.save()
      }

      return res
        .status(200)
        .json({ ok: true, message: 'Logged out successfully' })
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

      const { nome, email, endereco } = req.body
      if (email) user.email = email
      if (nome) user.nome = nome

      if (endereco && typeof endereco === 'object') {
        const src = Array.isArray(endereco) ? endereco[0] || {} : endereco
        const { telefone, cep, rua, numero, cidade, estado } = src

        const novoEndereco = {
          telefone: telefone,
          cep: cep,
          rua: rua,
          numero: numero,
          cidade: cidade,
          estado: estado
        }

        if (user.endereco && user.endereco.length > 0) {
          user.endereco[0] = novoEndereco as any
        } else {
          user.endereco = [novoEndereco as any]
        }
      }
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
      res.status(201).json({ produto: novoProduto, status: 'created' })
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

  async addToCart(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const userId = req.user?.id
      const { idProduto, quantidade } = req.body
      if (!userId) {
        res.status(401).json({ error: 'Usuário não autenticado' })
        return
      }
      const user = await User.findById(userId)
      if (!user) {
        res.status(404).json({ error: 'Usuário não encontrado' })
        return
      }
      if (user.carrinho && user.carrinho.length) {
        const existing = user.carrinho.find(
          item => item.idProduto.toString() === String(idProduto)
        )
        if (existing) {
          const add = Number(quantidade) || 1
          existing.quantidade = (Number(existing.quantidade) || 0) + add
          await user.save()
          return res.status(200).json({ carrinho: user.carrinho })
        }
      }
      user.carrinho = user.carrinho || []
      user.carrinho.push({ idProduto, quantidade })
      await user.save()
      res.status(200).json({ carrinho: user.carrinho })
    } catch (error) {
      res
        .status(500)
        .json({ error: 'Erro ao adicionar item ao carrinho' + error })
    }
  }

  async removeCartItem(
    req: AuthRequest,
    res: Response
  ): Promise<Response | void> {
    try {
      const userId = req.user?.id
      const { idProduto } = req.body
      if (!userId) {
        res.status(401).json({ error: 'Usuário não autenticado' })
        return
      }
      const user = await User.findById(userId)
      if (!user) {
        res.status(404).json({ error: 'Usuário não encontrado' })
        return
      }
      const removeQty = Math.max(1, Number(req.body.quantidade) || 1)
      user.carrinho = user.carrinho || []
      const itemIndex = user.carrinho.findIndex(
        item => item.idProduto.toString() === String(idProduto)
      )
      if (itemIndex !== -1) {
        const existing = user.carrinho[itemIndex]
        const currentQty = Number(existing.quantidade) || 0
        const newQty = currentQty - removeQty
        if (newQty > 0) {
          user.carrinho[itemIndex].quantidade = newQty
        } else {
          user.carrinho.splice(itemIndex, 1)
        }
      }
      await user.save()
      res.status(200).json({ carrinho: user.carrinho })
    } catch (error) {
      res
        .status(500)
        .json({ error: 'Erro ao remover item do carrinho' + error })
    }
  }

  async getCart(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const userId = req.user?.id
      if (!userId) {
        res.status(401).json({ error: 'Usuário não autenticado' })
        return
      }
      const user = await User.findById(userId)
      if (!user) {
        res.status(404).json({ error: 'Usuário não encontrado' })
        return
      }
      res.status(200).json({ carrinho: user.carrinho })
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar carrinho' })
    }
  }

  async createOrder(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const userId = req.user?.id
      if (!userId) {
        res.status(401).json({ error: 'Usuário não autenticado' })
        return
      }
      const user = await User.findById(userId)
      if (!user) {
        res.status(404).json({ error: 'Usuário não encontrado' })
        return
      }
      if (!user.carrinho || user.carrinho.length === 0) {
        res.status(400).json({ error: 'Carrinho vazio' })
        return
      }
      // Criar um novo pedido
      const novoPedido = {
        produtos: user.carrinho,
        status: 'preparando'
      }
      for (const item of user.carrinho) {
        const produto = await Produto.findById(item.idProduto)
        if (!produto) {
          res
            .status(404)
            .json({ error: `Produto com id ${item.idProduto} não encontrado` })
          return
        }
        produto.quantidadeVendida =
          (produto.quantidadeVendida || 0) + item.quantidade
        await produto.save()
      }
      user.pedidos = user.pedidos || []
      user.pedidos.push(novoPedido as any)
      // Limpar o carrinho do usuário
      user.carrinho = []
      await user.save()
      res.status(201).json({ pedido: novoPedido, status: 'created' })
    } catch (error) {
      res.status(500).json({ error: 'Erro ao criar pedido' })
    }
  }
}

export default new UserController()
