import { z } from 'zod'

export const sessionStartSchema = z.object({
  municipioId: z.string().min(1, 'Municipio requerido'),
  zonaNombre: z.string().min(1, 'Zona requerida'),
  patente: z.string().min(2, 'Patente requerida').max(8),
  calle: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
})

export const reportSchema = z.object({
  municipioId: z.string().min(1, 'Municipio requerido'),
  zonaNombre: z.string().min(1, 'Zona requerida'),
  patente: z.string().min(2, 'Patente requerida').max(8),
  comentario: z.string().optional(),
  fotoUrl: z.string().url().optional().or(z.literal('')),
})

export const profileUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  patente: z.string().max(8).optional(),
})

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const errors = result.error.issues.map(i => ({
        field: i.path.join('.'),
        message: i.message,
      }))
      return res.status(400).json({ message: 'Datos inválidos', errors })
    }
    req.body = result.data
    next()
  }
}
