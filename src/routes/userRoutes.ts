import { Router } from 'express'
import User, { IUser } from '../models/User'
import UserController from '../Controller/UserController'
import { authMiddleware } from '../middlewares/authMiddleware'

const router: Router = Router()

router.post('/register', async (req, res) => {
  await UserController.register(req, res)
})

router.post('/', async (req, res) => {
  await UserController.login(req, res)
})

router.get('/home', authMiddleware, async (req, res) => {
  try {
    const user = await UserController.getUserData(req, res)
    res.json(user)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
