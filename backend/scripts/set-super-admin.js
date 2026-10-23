// backend/scripts/set-super-admin.js
// Utility script to promote an admin account to Super Administrator.
// Usage: node scripts/set-super-admin.js <email>

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend or root .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { prisma } from '../src/config/prisma.js';

async function setSuperAdmin() {
  const emailArg = process.argv[2] || 'smartcampus96@gmail.com';
  const targetEmail = emailArg.trim().toLowerCase();

  console.log(`\n========================================`);
  console.log(`  Elevating User to Super Administrator`);
  console.log(`========================================`);
  console.log(`Target Email: ${targetEmail}`);

  try {
    const user = await prisma.user.findUnique({
      where: { email: targetEmail },
      select: { id: true, name: true, email: true, role: true, isSuperAdmin: true }
    });

    if (!user) {
      console.error(`\n❌ Error: No user found with email "${targetEmail}".`);
      console.error(`Please check the email address or register the account first.`);
      process.exit(1);
    }

    if (user.role !== 'ADMIN') {
      console.log(`⚠️ User "${user.name}" currently has role "${user.role}". Promoting to "ADMIN" role first...`);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        role: 'ADMIN',
        isSuperAdmin: true
      },
      select: { id: true, name: true, email: true, role: true, isSuperAdmin: true }
    });

    console.log(`\n✅ SUCCESS! Super Administrator privileges granted:`);
    console.log(`- ID:           ${updated.id}`);
    console.log(`- Name:         ${updated.name}`);
    console.log(`- Email:        ${updated.email}`);
    console.log(`- Role:         ${updated.role}`);
    console.log(`- Super Admin:  ${updated.isSuperAdmin}`);
    console.log(`\n👉 IMPORTANT: If this account is currently logged in, please LOG OUT`);
    console.log(`   and LOG BACK IN on http://localhost:5174 to refresh your JWT session token with Super Admin privileges.\n`);
  } catch (error) {
    console.error('\n❌ Failed to update user:', error.message || error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setSuperAdmin();
