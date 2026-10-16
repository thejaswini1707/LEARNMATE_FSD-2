const http = require("http");
const app = require("./app");
const env = require("./config/env");
const { initSockets } = require("./sockets");
const prisma = require("./config/prisma");

const server = http.createServer(app);
initSockets(server);

async function start() {
  try {
    await prisma.$queryRaw`SELECT 1`; // fail fast with a clear message if the DB isn't reachable
  } catch (err) {
    console.error("\nCould not connect to PostgreSQL. Check DATABASE_URL in your .env file.");
    console.error("Have you run 'npx prisma migrate deploy' yet?");
    console.error(err.message);
    process.exit(1);
  }

  server.listen(env.port, () => {
    console.log(`LearnMate API + Socket.IO listening on http://localhost:${env.port}`);
  });
}

start();
