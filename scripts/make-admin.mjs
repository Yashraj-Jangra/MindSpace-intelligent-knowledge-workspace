import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const targetEmail = process.argv[2];

  if (!targetEmail || !targetEmail.trim()) {
    console.error('\x1b[31m%s\x1b[0m', 'Error: Please provide a user email address.');
    console.log('\x1b[36m%s\x1b[0m', 'Usage: npm run make-admin <user-email>');
    console.log('\x1b[36m%s\x1b[0m', 'Example: npm run make-admin test@cvweb.tech');
    process.exit(1);
  }

  const normalizedEmail = targetEmail.toLowerCase().trim();
  console.log(`Promoting user with email "${normalizedEmail}" to ADMIN...`);

  let dbUpdated = false;
  let jsonUpdated = false;

  // 1. Update PostgreSQL Database via Prisma
  try {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user) {
      await prisma.user.update({
        where: { email: normalizedEmail },
        data: { role: 'ADMIN' },
      });
      dbUpdated = true;
      console.log('\x1b[32m%s\x1b[0m', `✓ PostgreSQL DB: User ${user.email} (ID: ${user.id}) role set to ADMIN`);
    } else {
      console.log('\x1b[33m%s\x1b[0m', `! PostgreSQL DB: User with email "${normalizedEmail}" not found in DB.`);
    }
  } catch (err) {
    console.warn('\x1b[33m%s\x1b[0m', `! PostgreSQL DB Update warning: ${err.message}`);
  } finally {
    await prisma.$disconnect();
  }

  // 2. Update Local JSON Fallback Store (.data/users.json)
  const jsonPath = path.join(process.cwd(), '.data', 'users.json');
  if (fs.existsSync(jsonPath)) {
    try {
      const raw = fs.readFileSync(jsonPath, 'utf-8');
      const users = JSON.parse(raw);
      let matchCount = 0;

      const updatedUsers = users.map((u) => {
        if (u.email && u.email.toLowerCase() === normalizedEmail) {
          matchCount++;
          return { ...u, role: 'ADMIN' };
        }
        return u;
      });

      if (matchCount > 0) {
        fs.writeFileSync(jsonPath, JSON.stringify(updatedUsers, null, 2), 'utf-8');
        jsonUpdated = true;
        console.log('\x1b[32m%s\x1b[0m', `✓ Local Store (.data/users.json): ${matchCount} user record(s) updated to ADMIN`);
      } else {
        console.log('\x1b[33m%s\x1b[0m', `! Local Store (.data/users.json): User "${normalizedEmail}" not found.`);
      }
    } catch (jsonErr) {
      console.error('\x1b[31m%s\x1b[0m', `Error updating local users file: ${jsonErr.message}`);
    }
  }

  if (dbUpdated || jsonUpdated) {
    console.log('\n\x1b[32m%s\x1b[0m', `SUCCESS: User "${normalizedEmail}" is now an ADMIN! 🎉`);
  } else {
    console.error('\n\x1b[31m%s\x1b[0m', `FAILED: User "${normalizedEmail}" was not found in DB or local store.`);
  }
}

main();
