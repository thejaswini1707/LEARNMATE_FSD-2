/*
  LearnMate ships with no fake seed data by design (per the project's "no fake data" requirement).
  Your first Admin account is created automatically: register normally using an email address
  listed in ADMIN_EMAILS in your .env file, and that account is granted the Admin role.

  This script just verifies the database is reachable and the schema has been migrated.
*/
const prisma = require("../src/config/prisma");

async function main() {
  const userCount = await prisma.user.count().catch(() => null);
  if (userCount === null) {
    console.error('Could not query the "User" table. Run "npx prisma migrate deploy" first.');
    process.exit(1);
  }
  console.log("Database looks good. No seed data was inserted (see comment above).");
  console.log("Register using an email listed in ADMIN_EMAILS to create your Admin account.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
