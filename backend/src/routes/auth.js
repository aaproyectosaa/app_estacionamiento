import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { generateToken } from '../middleware/auth.js'

const router = Router()

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, patente } = req.body
    const prisma = req.app.locals.prisma

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nombre, email y contraseña son requeridos' })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return res.status(400).json({ message: 'El email ya está registrado' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, patente },
    })

    const token = generateToken(user.id)
    const { password: _, ...userWithoutPassword } = user

    res.status(201).json({ user: userWithoutPassword, token })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ message: 'Error al crear usuario' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const prisma = req.app.locals.prisma

    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña son requeridos' })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ message: 'Credenciales inválidas' })
    }

    const token = generateToken(user.id)
    const { password: _, ...userWithoutPassword } = user

    res.json({ user: userWithoutPassword, token })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Error al iniciar sesión' })
  }
})

export default router
