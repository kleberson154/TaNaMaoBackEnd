import { Response } from 'express'
import { AuthRequest } from '../types/express'
import User, { IUser } from '../models/User'
import jwt from 'jsonwebtoken'
import Produto from '../models/Produto'
import AvaliacaoProduto from '../models/AvaliacaoProduto'
import UserCarrinho from '../models/UserCarrinho'

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
        expiresIn: '24h'
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
      let carrinho = await UserCarrinho.findOne({ idUsuario: user._id })
      if (!carrinho) {
        carrinho = new UserCarrinho({ idUsuario: user._id, produtos: [] })
      }
      res.status(200).json({ user, carrinho })
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar dados do usuário' })
    }
  }

  async getSearch(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const { query } = req.params
      const produtos = await Produto.find({
        nome: { $regex: query, $options: 'i' }
      })
      res.status(200).json({ produtos })
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar produtos' })
    }
  }

  async getProduto(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const produto = await Produto.findById(req.params.id)
      if (!produto) {
        res.status(404).json({ error: 'Produto não encontrado' })
        return
      }
      const avaliacaoProduto = await AvaliacaoProduto.find({
        idProduto: produto._id
      })
      res.status(200).json({ produto, avaliacaoProduto })
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar dados do produto' })
    }
  }

  async createProduto(
    req: AuthRequest,
    res: Response
  ): Promise<Response | void> {
    try {
      const {
        idVendedor,
        nome,
        categoria,
        precoCompra,
        precoAluguel,
        quantidade,
        descricao,
        imagem
      } = req.body
      const novoProduto = new Produto({
        idVendedor,
        nome,
        categoria,
        precoCompra,
        precoAluguel,
        quantidade,
        descricao,
        imagem
      })
      await novoProduto.save()
      res.status(201).json({ produto: novoProduto })
    } catch (error) {
      res.status(500).json({ error: 'Erro ao criar produto' })
    }
  }

  async createAvaliacao(
    req: AuthRequest,
    res: Response
  ): Promise<Response | void> {
    try {
      const { idProduto, idUsuario, nota, comentario } = req.body
      const novaAvaliacao = new AvaliacaoProduto({
        idProduto,
        idUsuario,
        nota,
        comentario
      })
      await novaAvaliacao.save()
      res.status(201).json({ avaliacao: novaAvaliacao })
    } catch (error) {
      res.status(500).json({ error: 'Erro ao criar avaliação' })
    }
  }
}

export default new UserController()
