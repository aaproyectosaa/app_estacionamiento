import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(authenticate, requireRole('admin'))

// ──────────────────────────────────────────
// DASHBOARD / STATS
// ──────────────────────────────────────────

router.get('/stats/:municipioId', async (req, res) => {
  try {
    const { municipioId } = req.params
    const prisma = req.app.locals.prisma

    const [
      totalSessions,
      activeSessions,
      revenue,
      totalReports,
      pendingReports,
      verifiedReports,
      infraccionReports,
      usersCount,
      sessionsHoy,
    ] = await Promise.all([
      prisma.session.count({ where: { municipioId } }),
      prisma.session.count({ where: { municipioId, fin: null } }),
      prisma.session.aggregate({
        where: { municipioId, fin: { not: null } },
        _sum: { montoTotal: true },
        _avg: { montoTotal: true },
      }),
      prisma.report.count({ where: { municipioId } }),
      prisma.report.count({ where: { municipioId, estado: 'pendiente' } }),
      prisma.report.count({ where: { municipioId, estado: 'verificado' } }),
      prisma.report.count({ where: { municipioId, estado: 'infraccion' } }),
      prisma.user.count(),
      prisma.session.count({
        where: {
          municipioId,
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ])

    const topZonas = await prisma.session.groupBy({
      by: ['zonaNombre'],
      where: { municipioId },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    })

    const ultimasSesiones = await prisma.session.findMany({
      where: { municipioId },
      include: { user: { select: { name: true, patente: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    res.json({
      totalSessions,
      activeSessions,
      totalRevenue: revenue._sum.montoTotal || 0,
      avgRevenue: revenue._avg.montoTotal || 0,
      totalReports,
      pendingReports,
      verifiedReports,
      infraccionReports,
      usersCount,
      sessionsHoy,
      topZonas,
      ultimasSesiones,
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    res.status(500).json({ message: 'Error al obtener estadísticas' })
  }
})

// ──────────────────────────────────────────
// REPORTES
// ──────────────────────────────────────────

router.get('/reports', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma
    const { municipioId, estado, page = 1, limit = 50 } = req.query

    const where = {}
    if (municipioId) where.municipioId = municipioId
    if (estado) where.estado = estado

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: { user: { select: { id: true, name: true, patente: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.report.count({ where }),
    ])

    res.json({ reports, total, page: Number(page), pages: Math.ceil(total / Number(limit)) })
  } catch (error) {
    console.error('Admin get reports error:', error)
    res.status(500).json({ message: 'Error al obtener reportes' })
  }
})

router.patch('/reports/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { estado, actaNumero, notas } = req.body
    const prisma = req.app.locals.prisma

    const data = {}
    if (estado) data.estado = estado
    if (actaNumero) data.actaNumero = actaNumero
    if (notas !== undefined) data.comentario = notas

    const report = await prisma.report.update({
      where: { id },
      data,
      include: { user: { select: { name: true } } },
    })

    res.json(report)
  } catch (error) {
    console.error('Admin update report error:', error)
    res.status(500).json({ message: 'Error al actualizar reporte' })
  }
})

router.delete('/reports/:id', async (req, res) => {
  try {
    const { id } = req.params
    const prisma = req.app.locals.prisma
    await prisma.report.delete({ where: { id } })
    res.json({ ok: true })
  } catch (error) {
    console.error('Admin delete report error:', error)
    res.status(500).json({ message: 'Error al eliminar reporte' })
  }
})

// ──────────────────────────────────────────
// SESIONES
// ──────────────────────────────────────────

router.get('/sessions', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma
    const { municipioId, activa, page = 1, limit = 50 } = req.query

    const where = {}
    if (municipioId) where.municipioId = municipioId
    if (activa === 'true') where.fin = null
    if (activa === 'false') where.fin = { not: null }

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        include: { user: { select: { id: true, name: true, patente: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.session.count({ where }),
    ])

    res.json({ sessions, total, page: Number(page), pages: Math.ceil(total / Number(limit)) })
  } catch (error) {
    console.error('Admin get sessions error:', error)
    res.status(500).json({ message: 'Error al obtener sesiones' })
  }
})

router.delete('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params
    const prisma = req.app.locals.prisma
    await prisma.session.delete({ where: { id } })
    res.json({ ok: true })
  } catch (error) {
    console.error('Admin delete session error:', error)
    res.status(500).json({ message: 'Error al eliminar sesión' })
  }
})

// ──────────────────────────────────────────
// ZONAS (CRUD completo)
// ──────────────────────────────────────────

router.get('/zonas/:municipioId', async (req, res) => {
  try {
    const { municipioId } = req.params
    const prisma = req.app.locals.prisma

    const zonas = await prisma.zona.findMany({
      where: { municipioId },
      include: { plazas: true },
    })

    const result = zonas.map(z => ({
      id: z.id,
      nombre: z.nombre,
      ref: z.ref,
      lat: z.lat,
      lng: z.lng,
      capacidad: z.capacidad,
      plazasCount: z.plazas.length,
      ocupadas: z.plazas.filter(p => p.ocupado).length,
    }))

    res.json(result)
  } catch (error) {
    console.error('Admin get zonas error:', error)
    res.status(500).json({ message: 'Error al obtener zonas' })
  }
})

router.post('/zonas/:municipioId', async (req, res) => {
  try {
    const { municipioId } = req.params
    const { nombre, ref, lat, lng, capacidad } = req.body
    const prisma = req.app.locals.prisma

    if (!nombre?.trim()) return res.status(400).json({ message: 'El nombre es requerido' })
    if (!lat || !lng) return res.status(400).json({ message: 'Latitud y longitud son requeridas' })
    if (!capacidad || capacidad < 1) return res.status(400).json({ message: 'Capacidad inválida' })

    const zona = await prisma.zona.create({
      data: {
        municipioId,
        nombre: nombre.trim(),
        ref: ref?.trim() || '',
        lat: Number(lat),
        lng: Number(lng),
        capacidad: Number(capacidad),
      },
    })

    const plazas = []
    const nCuadras = Math.ceil(capacidad / 15)
    for (let c = 0; c < nCuadras; c++) {
      const accesos = 2 + Math.floor(Math.random() * 4)
      const medidos = 20 - accesos
      for (let k = 0; k < medidos && plazas.length < capacidad; k++) {
        plazas.push({ zonaId: zona.id, cuadra: c, ocupado: Math.random() < 0.4, pago: false })
      }
    }
    if (plazas.length > 0) {
      await prisma.plaza.createMany({ data: plazas.slice(0, capacidad) })
    }

    res.status(201).json(zona)
  } catch (error) {
    console.error('Admin create zona error:', error)
    res.status(500).json({ message: 'Error al crear zona' })
  }
})

router.put('/zonas/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { nombre, ref, lat, lng, capacidad } = req.body
    const prisma = req.app.locals.prisma

    const data = {}
    if (nombre !== undefined) data.nombre = nombre.trim()
    if (ref !== undefined) data.ref = ref.trim()
    if (lat !== undefined) data.lat = Number(lat)
    if (lng !== undefined) data.lng = Number(lng)
    if (capacidad !== undefined) data.capacidad = Number(capacidad)

    const zona = await prisma.zona.update({ where: { id }, data })

    if (capacidad !== undefined) {
      const newCap = Number(capacidad)
      const plazas = await prisma.plaza.findMany({ where: { zonaId: id } })
      const currentCount = plazas.length

      if (newCap > currentCount) {
        const toAdd = newCap - currentCount
        const lastCuadra = plazas.length > 0 ? Math.max(...plazas.map(p => p.cuadra)) : -1
        const newPlazas = []
        for (let i = 0; i < toAdd; i++) {
          newPlazas.push({
            zonaId: id,
            cuadra: lastCuadra + 1 + Math.floor(i / 15),
            ocupado: false,
            pago: false,
          })
        }
        await prisma.plaza.createMany({ data: newPlazas })
      } else if (newCap < currentCount) {
        const toRemove = currentCount - newCap
        const sorted = [...plazas].sort((a, b) => (a.ocupado ? 1 : 0) - (b.ocupado ? 1 : 0))
        const idsToDelete = sorted.slice(0, toRemove).map(p => p.id)
        await prisma.plaza.deleteMany({ where: { id: { in: idsToDelete } } })
      }
    }

    res.json(zona)
  } catch (error) {
    console.error('Admin update zona error:', error)
    res.status(500).json({ message: 'Error al actualizar zona' })
  }
})

router.delete('/zonas/:id', async (req, res) => {
  try {
    const { id } = req.params
    const prisma = req.app.locals.prisma
    await prisma.plaza.deleteMany({ where: { zonaId: id } })
    await prisma.zona.delete({ where: { id } })
    res.json({ ok: true })
  } catch (error) {
    console.error('Admin delete zona error:', error)
    res.status(500).json({ message: 'Error al eliminar zona' })
  }
})

// ──────────────────────────────────────────
// MUNICIPIOS
// ──────────────────────────────────────────

router.get('/municipios', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma
    const municipios = await prisma.municipio.findMany({
      include: { _count: { select: { zonas: true } } },
      orderBy: { nombre: 'asc' },
    })
    res.json(municipios)
  } catch (error) {
    console.error('Admin get municipios error:', error)
    res.status(500).json({ message: 'Error al obtener municipios' })
  }
})

router.put('/municipios/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { nombre, lat, lng, tarifaHora } = req.body
    const prisma = req.app.locals.prisma

    const data = {}
    if (nombre !== undefined) data.nombre = nombre.trim()
    if (lat !== undefined) data.lat = Number(lat)
    if (lng !== undefined) data.lng = Number(lng)
    if (tarifaHora !== undefined) data.tarifaHora = Number(tarifaHora)

    const municipio = await prisma.municipio.update({ where: { id }, data })
    res.json(municipio)
  } catch (error) {
    console.error('Admin update municipio error:', error)
    res.status(500).json({ message: 'Error al actualizar municipio' })
  }
})

router.post('/municipios', async (req, res) => {
  try {
    const { id, nombre, lat, lng, tarifaHora } = req.body
    const prisma = req.app.locals.prisma

    if (!id?.trim() || !nombre?.trim()) {
      return res.status(400).json({ message: 'ID y nombre son requeridos' })
    }

    const exists = await prisma.municipio.findUnique({ where: { id: id.trim() } })
    if (exists) return res.status(409).json({ message: 'Ya existe un municipio con ese ID' })

    const municipio = await prisma.municipio.create({
      data: {
        id: id.trim(),
        nombre: nombre.trim(),
        lat: Number(lat) || 0,
        lng: Number(lng) || 0,
        tarifaHora: Number(tarifaHora) || 750,
      },
    })

    res.status(201).json(municipio)
  } catch (error) {
    console.error('Admin create municipio error:', error)
    res.status(500).json({ message: 'Error al crear municipio' })
  }
})

router.delete('/municipios/:id', async (req, res) => {
  try {
    const { id } = req.params
    const prisma = req.app.locals.prisma

    await prisma.acta.deleteMany({ where: { municipioId: id } })
    await prisma.report.deleteMany({ where: { municipioId: id } })
    await prisma.session.deleteMany({ where: { municipioId: id } })

    const zonas = await prisma.zona.findMany({ where: { municipioId: id }, select: { id: true } })
    for (const z of zonas) {
      await prisma.plaza.deleteMany({ where: { zonaId: z.id } })
    }
    await prisma.zona.deleteMany({ where: { municipioId: id } })
    await prisma.municipio.delete({ where: { id } })

    res.json({ ok: true })
  } catch (error) {
    console.error('Admin delete municipio error:', error)
    res.status(500).json({ message: 'Error al eliminar municipio' })
  }
})

// ──────────────────────────────────────────
// USUARIOS
// ──────────────────────────────────────────

router.get('/users', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma
    const { role, search, page = 1, limit = 50 } = req.query

    const where = {}
    if (role) where.role = role
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { patente: { contains: search.toUpperCase() } },
      ]
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true, patente: true, role: true, legajo: true, createdAt: true, _count: { select: { sessions: true, reports: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.user.count({ where }),
    ])

    res.json({ users, total, page: Number(page), pages: Math.ceil(total / Number(limit)) })
  } catch (error) {
    console.error('Admin get users error:', error)
    res.status(500).json({ message: 'Error al obtener usuarios' })
  }
})

router.patch('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params
    const { role } = req.body
    const prisma = req.app.locals.prisma

    if (!['user', 'admin', 'inspector'].includes(role)) {
      return res.status(400).json({ message: 'Rol inválido' })
    }

    if (id === req.userId && role !== 'admin') {
      return res.status(400).json({ message: 'No podés quitarte el rol de administrador' })
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    })

    res.json(user)
  } catch (error) {
    console.error('Admin update role error:', error)
    res.status(500).json({ message: 'Error al actualizar rol' })
  }
})

router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params
    const prisma = req.app.locals.prisma

    if (id === req.userId) {
      return res.status(400).json({ message: 'No podés eliminar tu propia cuenta' })
    }

    await prisma.report.deleteMany({ where: { userId: id } })
    await prisma.session.deleteMany({ where: { userId: id } })
    await prisma.acta.deleteMany({ where: { inspectorId: id } })
    await prisma.user.delete({ where: { id } })
    res.json({ ok: true })
  } catch (error) {
    console.error('Admin delete user error:', error)
    res.status(500).json({ message: 'Error al eliminar usuario' })
  }
})

export default router
