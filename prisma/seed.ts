import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create owner user (default: phone=9999999999, password=admin123)
  const ownerPhone = process.env.OWNER_PHONE || '9999999999';
  const ownerPassword = process.env.OWNER_PASSWORD || 'admin123';
  const ownerName = process.env.OWNER_NAME || 'Fleet Owner';

  const existing = await prisma.user.findUnique({ where: { phone: ownerPhone } });
  if (existing) {
    console.log(`Owner user already exists (phone: ${ownerPhone})`);
    return;
  }

  const passwordHash = await bcrypt.hash(ownerPassword, 12);

  const owner = await prisma.user.create({
    data: {
      name: ownerName,
      phone: ownerPhone,
      passwordHash,
      role: 'owner',
    },
  });

  console.log(`Created owner user: ${owner.name} (phone: ${owner.phone})`);
  console.log(`Login with: phone=${ownerPhone}, password=${ownerPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
