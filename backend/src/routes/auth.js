import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { generateToken, authenticate } from '../middleware/auth.js'
import { validate, profileUpdateSchema } from '../middleware/validate.js'

const router = Router()

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, patente } = req.body
    const prisma = req.app.locals.prisma

    if (!name?.trim()) return res.status(400).json({ message: 'El nombre es requerido' })
    if (!email?.trim()) return res.status(400).json({ message: 'El email es requerido' })
    if (!password || password.length < 6) return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' })

    const exists = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })
    if (exists) return res.status(409).json({ message: 'El email ya está registrado' })

    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashed,
        patente: (patente || '').toUpperCase().slice(0, 8) || null,
      },
    })

    const token = generateToken(user.id)
    const { password: _, ...safe } = user
    res.status(201).json({ user: safe, token })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ message: 'Error al registrar usuario' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const prisma = req.app.locals.prisma

    if (!email?.trim() || !password) return res.status(400).json({ message: 'Email y contraseña requeridos' })

    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })
    if (!user || !user.password) return res.status(401).json({ message: 'Credenciales inválidas' })

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ message: 'Credenciales inválidas' })

    const token = generateToken(user.id)
    const { password: _, ...safe } = user
    res.json({ user: safe, token })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Error al iniciar sesión' })
  }
})

router.post('/guest', async (req, res) => {
  try {
    const { name, patente } = req.body
    const prisma = req.app.locals.prisma

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'El nombre es requerido' })
    }

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        patente: (patente || '').toUpperCase().slice(0, 8) || null,
      },
    })

    const token = generateToken(user.id)

    res.status(201).json({ user, token })
  } catch (error) {
    console.error('Guest create error:', error)
    res.status(500).json({ message: 'Error al crear usuario' })
  }
})

router.patch('/me', authenticate, validate(profileUpdateSchema), async (req, res) => {
  try {
    const { name, patente } = req.body
    const prisma = req.app.locals.prisma

    const data = {}
    if (name !== undefined) data.name = name
    if (patente !== undefined) data.patente = patente

    const user = await prisma.user.update({
      where: { id: req.userId },
      data,
    })

    res.json({ user })
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({ message: 'Error al actualizar perfil' })
  }
})

export default router
