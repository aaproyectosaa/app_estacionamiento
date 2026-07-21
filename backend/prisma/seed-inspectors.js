import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const password = 'inspector123'

  const inspectores = [
    { name: 'M. Gómez', email: 'gomez@inspector.com', legajo: '042' },
    { name: 'R. López', email: 'lopez@inspector.com', legajo: '087' },
    { name: 'S. Fernández', email: 'fernandez@inspector.com', legajo: '115' },
  ]

  const hashed = await bcrypt.hash(password, 10)

  for (const insp of inspectores) {
    const existing = await prisma.user.findUnique({ where: { email: insp.email } })
    if (existing) {
      await prisma.user.update({
        where: { email: insp.email },
        data: { role: 'inspector', legajo: insp.legajo, password: hashed },
      })
      console.log(`  ✓ ${insp.name} actualizado como inspector`)
    } else {
      await prisma.user.create({
        data: {
          name: insp.name,
          email: insp.email,
          password: hashed,
          role: 'inspector',
          legajo: insp.legajo,
        },
      })
      console.log(`  + ${insp.name} (Legajo ${insp.legajo})`)
    }
  }

  console.log(`\nInspectores creados. Password para todos: ${password}`)
  console.log('Credenciales:')
  inspectores.forEach(i => console.log(`  ${i.email} / ${password}`))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
