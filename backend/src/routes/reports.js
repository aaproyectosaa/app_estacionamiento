import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'

const router = Router()

let actaCounter = 1000

router.post('/', authenticate, async (req, res) => {
  try {
    const { municipioId, zonaNombre, patente, comentario, fotoUrl } = req.body
    const userId = req.userId

    if (!municipioId || !zonaNombre || !patente) {
      return res.status(400).json({ message: 'municipioId, zonaNombre y patente son requeridos' })
    }

    // Simulate verification (35% chance the car is paying)
    const estaPagando = Math.random() < 0.35

    if (estaPagando) {
      const min = 5 + Math.floor(Math.random() * 80)
      return res.json({
        estado: 'pagando',
        mensaje: `La patente ${patente} tiene una sesión activa en ${zonaNombre} desde hace ${min} minutos. Está todo en orden.`,
      })
    }

    const actaNumero = `ACTA-SF-${++actaCounter}`
    res.json({
      estado: 'infraccion',
      acta: actaNumero,
      mensaje: `La patente ${patente} no registra pago activo en ${zonaNombre}. Se generó el acta ${actaNumero} y se notificó al cuerpo de inspectores del municipio para verificar en el lugar.`,
    })
  } catch (error) {
    console.error('Report error:', error)
    res.status(500).json({ message: 'Error al procesar reporte' })
  }
})

export default router
