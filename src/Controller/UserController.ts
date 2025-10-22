import { Response } from 'express'
import { AuthRequest } from '../types/express'
import User, { IUser } from '../models/User'
import jwt from 'jsonwebtoken'
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

      const { password, ...userData } = newUser.toObject()
      res.status(201).json(userData)
    } catch (error) {
      res.status(500).json({ error: 'Erro ao registrar usuário' })
    }
  }

  async login(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const { email, senha } = req.body
      const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret'

      const user = await User.findOne({ email })
      if (!user) {
        res.status(401).json({ error: 'Credenciais inválidas' })
        return
      }

      const isMatch = await (user as any).comparePassword(senha)
      if (!isMatch) {
        res.status(401).json({ error: 'Credenciais inválidas' })
        return
      }

      const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
        expiresIn: '24h'
      })

      const { senha: _, ...safeUser } = user.toObject()
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
      const {
        nome,
        categoria,
        precoCompra,
        precoAluguel,
        quantidade,
        descricao,
        imagemUrl
      } = req.body
      const novoProduto = new Produto({
        idVendedor,
        nome,
        categoria,
        precoCompra,
        precoAluguel,
        quantidade,
        descricao,
        imagemUrl
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
