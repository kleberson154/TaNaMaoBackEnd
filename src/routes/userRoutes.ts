import { Router } from 'express'
import User, { IUser } from '../models/User'
import UserController from '../Controller/UserController'
import { authMiddleware } from '../middlewares/authMiddleware'

const router: Router = Router()

router.get('/', async (req, res) => {})

router.post('/cadastro', async (req, res) => {
  await UserController.register(req, res)
})

router.post('/login', async (req, res) => {
  await UserController.login(req, res)
})

router.get('/perfil', authMiddleware, async (req, res) => {
  const userId = req.user?.id
  if (!userId) {
    return res.status(401).json({ error: 'Usuário não autenticado' })
  }

  try {
    const user: IUser | null = await User.findById(userId).select('-senha')
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }
    res.status(200).json({ user })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar dados do usuário' })
  }
})

router.get('/produtos/:id', async (req, res) => {
  await UserController.getProduto(req, res)
})

router.get('/produtos/busca/:query', async (req, res) => {
  await UserController.getSearch(req, res)
})

export default router
