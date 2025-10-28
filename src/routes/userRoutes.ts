import { Router, Request } from 'express'
import User, { IUser } from '../models/User'
import UserController from '../Controller/UserController'
import { authMiddleware } from '../middlewares/authMiddleware'

const router: Router = Router()

router.get('/', async (req, res) => {
  await UserController.getAllProdutos(req, res)
})

router.post('/cadastro', async (req, res) => {
  await UserController.register(req, res)
})

router.post('/login', async (req, res) => {
  await UserController.login(req, res)
})

router.post('/refresh', async (req, res) => {
  await UserController.refreshToken(req, res)
})

router.post('/logout', async (req, res) => {
  await UserController.logout(req, res)
})

router.get('/perfil', authMiddleware, async (req, res) => {
  await UserController.getUserData(req as any, res)
})

router.put('/perfil', authMiddleware, async (req, res) => {
  await UserController.updateUserData(req as any, res)
})

router.get('/produtos/:id', async (req, res) => {
  await UserController.getProduto(req, res)
})

router.get('/produtos/busca/:query', async (req, res) => {
  await UserController.getSearch(req, res)
})

router.get('/produtos/categoria/:category', async (req, res) => {
  await UserController.getPerCategory(req, res)
})

router.post('/produtos', authMiddleware, async (req, res) => {
  await UserController.createProduto(req, res)
})

router.post('/produtos/:id/avaliacoes', authMiddleware, async (req, res) => {
  await UserController.createAvaliacao(req, res)
})

router.post('/carrinho', authMiddleware, async (req, res) => {
  await UserController.addToCart(req as any, res)
})

router.delete('/carrinho', authMiddleware, async (req, res) => {
  await UserController.removeCartItem(req as any, res)
})

router.get('/carrinho', authMiddleware, async (req, res) => {
  await UserController.getCart(req as any, res)
})

router.post('/pedidos', authMiddleware, async (req, res) => {
  await UserController.createOrder(req as any, res)
})

export default router
