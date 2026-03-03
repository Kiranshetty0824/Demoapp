import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const code = 'kiru@08';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(code, salt);

  await prisma.adminCode.upsert({
    where: { code_hash: hash },
    update: {},
    create: {
      code_hash: hash,
    },
  });

  console.log('Admin code seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
