import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'

export function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: 'Token requerido' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.userId = decoded.userId
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido' })
  }
}

export function requireRole(...roles) {
  return async (req, res, next) => {
    try {
      const prisma = req.app.locals.prisma
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { role: true },
      })

      if (!user || !roles.includes(user.role)) {
        return res.status(403).json({ message: 'No tenés permiso para acceder a este recurso' })
      }

      req.userRole = user.role
      next()
    } catch (error) {
      return res.status(500).json({ message: 'Error al verificar permisos' })
    }
  }
}

export function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
}
