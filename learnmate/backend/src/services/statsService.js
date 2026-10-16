const prisma = require("../config/prisma");

async function getPublicStats() {
  const [students, tutors, materials] = await Promise.all([
    prisma.user.count({ where: { role: "Student" } }),
    prisma.user.count({ where: { role: "Tutor" } }),
    prisma.material.count(),
  ]);
  return { students, tutors, materials };
}

module.exports = { getPublicStats };
