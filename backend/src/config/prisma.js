const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

if (!process.env.DATABASE_URL) {
  if (process.env.VERCEL) {
    const tmpDb = "/tmp/dev.db";
    const seedDb = path.join(__dirname, "..", "..", "prisma", "seed.db");
    if (!fs.existsSync(tmpDb) && fs.existsSync(seedDb)) {
      try {
        fs.copyFileSync(seedDb, tmpDb);
      } catch (err) {
        console.warn("Failed to copy seed database to /tmp:", err);
      }
    }
    process.env.DATABASE_URL = `file:${tmpDb}`;
  } else {
    process.env.DATABASE_URL = "file:./dev.db";
  }
}

const prisma = new PrismaClient();

module.exports = prisma;
