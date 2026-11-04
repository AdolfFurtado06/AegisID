/**
 * AegisID - Automated Live Demonstration Seeder
 * Populates realistic on-chain & off-chain scenarios for evaluations:
 * 1. Alice Johnson: ACTIVE verified on-chain credential
 * 2. Bob Miller: REVOKED on-chain credential (ready to demonstrate revoked QR state)
 * 3. Charlie Davis: PENDING application in queue (ready to approve & issue live)
 */

const path = require("path");
module.paths.push(path.join(__dirname, "..", "backend", "node_modules"));
const fs = require("fs");
const bcrypt = require("bcryptjs");

// Load backend environment variables
require("dotenv").config({ path: path.join(__dirname, "..", "backend", ".env") });

const prisma = require("../backend/src/config/prisma");
const { hashFile, generateSalt, computeCommitment, generateCredentialId } = require("../backend/src/services/cryptoService");
const {
  getDeployedContractAddress,
  issueCredentialOnChain,
  revokeCredentialOnChain,
} = require("../backend/src/services/blockchainService");

async function main() {
  console.log("==================================================");
  console.log("🌱 Seeding AegisID Live Evaluation Scenarios");
  console.log("==================================================");

  const sampleDocPath = path.join(__dirname, "..", "test-documents", "sample_mock_id.png");
  if (!fs.existsSync(sampleDocPath)) {
    console.error("Sample document missing at:", sampleDocPath);
    process.exit(1);
  }

  // Find Admin
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) {
    console.error("Admin user not found. Please run 'npm run db:seed' first.");
    process.exit(1);
  }

  const contractAddress = getDeployedContractAddress();
  console.log(`📡 Contract Address: ${contractAddress || "Not configured"}`);

  // Helper to copy file to uploads
  const uploadDir = path.join(__dirname, "..", "backend", "storage", "uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  function copyDoc(name) {
    const dest = path.join(uploadDir, `seed_${name}_${Date.now()}.png`);
    fs.copyFileSync(sampleDocPath, dest);
    return dest;
  }

  // --- Scenario 1: Alice Johnson (ACTIVE Credential) ---
  console.log("\n1. Setting up Alice Johnson (Active Credential)...");
  const alicePassHash = await bcrypt.hash("Alice@ChainKYC2026", 10);
  const alice = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: { role: "USER", walletAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" },
    create: {
      name: "Alice Johnson",
      email: "alice@example.com",
      passwordHash: alicePassHash,
      role: "USER",
      walletAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    },
  });

  const aliceDoc = copyDoc("alice");
  const aliceFileHash = hashFile(aliceDoc);
  const aliceSalt = generateSalt();
  const aliceCommitment = computeCommitment(aliceFileHash, aliceSalt);
  const aliceCredId = generateCredentialId();

  // Clean previous application/credentials for Alice to prevent duplicates
  const existingAliceApp = await prisma.kycApplication.findFirst({ where: { userId: alice.id } });
  if (existingAliceApp) {
    await prisma.verificationLog.deleteMany({ where: { credential: { applicationId: existingAliceApp.id } } });
    await prisma.identityCredential.deleteMany({ where: { applicationId: existingAliceApp.id } });
    await prisma.kycApplication.delete({ where: { id: existingAliceApp.id } });
  }

  const aliceApp = await prisma.kycApplication.create({
    data: {
      userId: alice.id,
      documentType: "MOCK_ID",
      documentNumber: "MOCK-ALICE-1001",
      documentPath: aliceDoc,
      status: "APPROVED",
      reviewedBy: admin.id,
      reviewedAt: new Date(),
    },
  });

  let aliceTxHash = "0x" + "a".repeat(64);
  let aliceBlock = 1;
  try {
    const res = await issueCredentialOnChain(aliceCredId, alice.walletAddress, aliceCommitment);
    aliceTxHash = res.transactionHash;
    aliceBlock = res.blockNumber;
    console.log(`  ✔ On-Chain Issuance Tx: ${aliceTxHash}`);
  } catch (err) {
    console.warn(`  ⚠️ On-chain submission skipped (Node offline?): ${err.message}`);
  }

  const aliceCred = await prisma.identityCredential.create({
    data: {
      id: aliceCredId,
      applicationId: aliceApp.id,
      userId: alice.id,
      credentialHash: aliceCommitment,
      salt: aliceSalt,
      transactionHash: aliceTxHash,
      blockNumber: aliceBlock,
      status: "ACTIVE",
      issuedAt: new Date(),
    },
  });

  await prisma.verificationLog.create({
    data: {
      credentialId: aliceCred.id,
      action: "ISSUED",
      transactionHash: aliceTxHash,
      performedBy: admin.id,
    },
  });
  console.log(`  ✔ Alice Credential ID: ${aliceCred.id} (Status: ACTIVE)`);

  // --- Scenario 2: Bob Miller (REVOKED Credential) ---
  console.log("\n2. Setting up Bob Miller (Revoked Credential)...");
  const bobPassHash = await bcrypt.hash("Bob@ChainKYC2026", 10);
  const bob = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: { role: "USER", walletAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" },
    create: {
      name: "Bob Miller",
      email: "bob@example.com",
      passwordHash: bobPassHash,
      role: "USER",
      walletAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    },
  });

  const bobDoc = copyDoc("bob");
  const bobFileHash = hashFile(bobDoc);
  const bobSalt = generateSalt();
  const bobCommitment = computeCommitment(bobFileHash, bobSalt);
  const bobCredId = generateCredentialId();

  const existingBobApp = await prisma.kycApplication.findFirst({ where: { userId: bob.id } });
  if (existingBobApp) {
    await prisma.verificationLog.deleteMany({ where: { credential: { applicationId: existingBobApp.id } } });
    await prisma.identityCredential.deleteMany({ where: { applicationId: existingBobApp.id } });
    await prisma.kycApplication.delete({ where: { id: existingBobApp.id } });
  }

  const bobApp = await prisma.kycApplication.create({
    data: {
      userId: bob.id,
      documentType: "MOCK_PAN",
      documentNumber: "MOCK-BOB-9021",
      documentPath: bobDoc,
      status: "APPROVED",
      reviewedBy: admin.id,
      reviewedAt: new Date(),
    },
  });

  let bobTxHash = "0x" + "b".repeat(64);
  let bobRevokeTx = "0x" + "c".repeat(64);
  try {
    const issueRes = await issueCredentialOnChain(bobCredId, bob.walletAddress, bobCommitment);
    bobTxHash = issueRes.transactionHash;
    const revokeRes = await revokeCredentialOnChain(bobCredId);
    bobRevokeTx = revokeRes.transactionHash;
    console.log(`  ✔ On-Chain Revocation Tx: ${bobRevokeTx}`);
  } catch (err) {
    console.warn(`  ⚠️ On-chain submission skipped (Node offline?): ${err.message}`);
  }

  const bobCred = await prisma.identityCredential.create({
    data: {
      id: bobCredId,
      applicationId: bobApp.id,
      userId: bob.id,
      credentialHash: bobCommitment,
      salt: bobSalt,
      transactionHash: bobTxHash,
      blockNumber: 2,
      status: "REVOKED",
      issuedAt: new Date(Date.now() - 3600000),
      revokedAt: new Date(),
      revocationTxHash: bobRevokeTx,
    },
  });

  await prisma.verificationLog.createMany({
    data: [
      { credentialId: bobCred.id, action: "ISSUED", transactionHash: bobTxHash, performedBy: admin.id },
      { credentialId: bobCred.id, action: "REVOKED", transactionHash: bobRevokeTx, performedBy: admin.id },
    ],
  });
  console.log(`  ✔ Bob Credential ID: ${bobCred.id} (Status: REVOKED)`);

  // --- Scenario 3: Charlie Davis (PENDING Application) ---
  console.log("\n3. Setting up Charlie Davis (Pending in Queue)...");
  const charliePassHash = await bcrypt.hash("Charlie@ChainKYC2026", 10);
  const charlie = await prisma.user.upsert({
    where: { email: "charlie@example.com" },
    update: { role: "USER", walletAddress: "0x90F79bf6EB2c4f870365E785982E1f101E93b906" },
    create: {
      name: "Charlie Davis",
      email: "charlie@example.com",
      passwordHash: charliePassHash,
      role: "USER",
      walletAddress: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    },
  });

  const charlieDoc = copyDoc("charlie");
  const existingCharlieApp = await prisma.kycApplication.findFirst({ where: { userId: charlie.id } });
  if (existingCharlieApp) {
    await prisma.verificationLog.deleteMany({ where: { credential: { applicationId: existingCharlieApp.id } } });
    await prisma.identityCredential.deleteMany({ where: { applicationId: existingCharlieApp.id } });
    await prisma.kycApplication.delete({ where: { id: existingCharlieApp.id } });
  }

  const charlieApp = await prisma.kycApplication.create({
    data: {
      userId: charlie.id,
      documentType: "PASSPORT_SAMPLE",
      documentNumber: "MOCK-CHARLIE-PASS-77",
      documentPath: charlieDoc,
      status: "PENDING",
    },
  });
  console.log(`  ✔ Charlie Application ID: ${charlieApp.id} (Status: PENDING REVIEW)`);

  console.log("\n==================================================");
  console.log("✨ Live Evaluation Scenarios Seeded Successfully!");
  console.log("==================================================");
  console.log("Accounts ready for demo:");
  console.log("  • Admin:   admin@chainkyc.local / Admin@ChainKYC2026");
  console.log("  • Alice:   alice@example.com   / Alice@ChainKYC2026   -> ACTIVE Credential & QR");
  console.log("  • Bob:     bob@example.com     / Bob@ChainKYC2026     -> REVOKED Credential & QR");
  console.log("  • Charlie: charlie@example.com / Charlie@ChainKYC2026 -> PENDING in Review Queue");
  console.log("==================================================");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
