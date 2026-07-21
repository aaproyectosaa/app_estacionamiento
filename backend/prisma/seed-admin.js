import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = 'admin@admin.com'
  const password = 'admin123'
  const name = 'Admin'

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`El usuario ${email} ya existe. Actualizando a admin...`)
    const hashed = await bcrypt.hash(password, 10)
    await prisma.user.update({
      where: { email },
      data: { role: 'admin', password: hashed },
    })
    console.log('Usuario actualizado como admin.')
    return
  }

  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      role: 'admin',
    },
  })

  console.log('Admin creado:')
  console.log(`  Email:    ${email}`)
  console.log(`  Password: ${password}`)
  console.log(`  ID:       ${user.id}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
