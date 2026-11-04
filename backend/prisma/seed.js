const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const adminEmail = process.env.ADMIN_SEED_EMAIL || "admin@chainkyc.local";
  const adminPassword = process.env.ADMIN_SEED_PASSWORD || "Admin@ChainKYC2026";
  const adminName = process.env.ADMIN_SEED_NAME || "System Administrator";

  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      role: "ADMIN",
    },
    create: {
      email: adminEmail,
      name: adminName,
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      walletAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Default Hardhat Account #0
    },
  });

  console.log("Admin account ready:", admin.email, "(Role: ADMIN)");

  // Sample User for testing
  const userEmail = "alice@example.com";
  const userPasswordHash = await bcrypt.hash("Alice@ChainKYC2026", 10);

  const sampleUser = await prisma.user.upsert({
    where: { email: userEmail },
    update: {},
    create: {
      email: userEmail,
      name: "Alice Johnson",
      passwordHash: userPasswordHash,
      role: "USER",
      walletAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Default Hardhat Account #1
    },
  });

  console.log("Sample user ready:", sampleUser.email, "(Role: USER)");
  console.log("Database seeded successfully.");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
