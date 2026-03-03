import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function check() {
  const count = await prisma.adminCode.count();
  console.log('Current count:', count);
  if (count === 0) {
    const hash = await bcrypt.hash('kiru@08', 10);
    await prisma.adminCode.create({ data: { code_hash: hash } });
    console.log('Created admin code');
  }
  const codes = await prisma.adminCode.findMany();
  console.log(codes);
}
check();
