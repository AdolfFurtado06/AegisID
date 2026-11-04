process.env.NODE_ENV = "test";
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const app = require("../src/server");
const prisma = require("../src/config/prisma");

// Start server on a random port for testing
let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}/api`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await prisma.$disconnect();
});

test("ChainKYC End-to-End Verification Lifecycle", async (t) => {
  const timestamp = Date.now();
  const testEmail = `e2e_user_${timestamp}@chainkyc.test`;
  const testPassword = "Password123!";
  let userToken;
  let adminToken;
  let applicationId;
  let credentialId;

  await t.test("1. User registration succeeds with valid credentials", async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test E2E Applicant",
        email: testEmail,
        password: testPassword,
      }),
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.ok(data.token);
    assert.equal(data.user.email, testEmail);
    assert.equal(data.user.role, "USER");
  });

  await t.test("2. User login returns JWT token", async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.token);
    userToken = data.token;
  });

  await t.test("3. User submits synthetic KYC application with mock document", async () => {
    // Construct multipart form data
    const dummyFilePath = path.join(__dirname, `temp_doc_${timestamp}.png`);
    fs.writeFileSync(dummyFilePath, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64"));

    try {
      const fileBytes = fs.readFileSync(dummyFilePath);
      const boundary = `----WebKitFormBoundary${timestamp}`;
      let body = `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="documentType"\r\n\r\n`;
      body += `MOCK_ID\r\n`;
      body += `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="documentNumber"\r\n\r\n`;
      body += `MOCK-TEST-${timestamp}\r\n`;
      body += `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="document"; filename="mock_id.png"\r\n`;
      body += `Content-Type: image/png\r\n\r\n`;

      const headerBuf = Buffer.from(body, "utf-8");
      const footerBuf = Buffer.from(`\r\n--${boundary}--\r\n`, "utf-8");
      const fullBuffer = Buffer.concat([headerBuf, fileBytes, footerBuf]);

      const res = await fetch(`${baseUrl}/kyc/submit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userToken}`,
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
        },
        body: fullBuffer,
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.ok(data.application.id);
      assert.equal(data.application.status, "PENDING");
      applicationId = data.application.id;
    } finally {
      if (fs.existsSync(dummyFilePath)) fs.unlinkSync(dummyFilePath);
    }
  });

  await t.test("4. Admin login succeeds with default seeded admin", async () => {
    const adminEmail = process.env.ADMIN_SEED_EMAIL || "admin@chainkyc.local";
    const adminPassword = process.env.ADMIN_SEED_PASSWORD || "Admin@ChainKYC2026";
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.token);
    assert.equal(data.user.role, "ADMIN");
    adminToken = data.token;
  });

  await t.test("5. Admin approves KYC application", async () => {
    const res = await fetch(`${baseUrl}/kyc/${applicationId}/approve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.application.status, "APPROVED");
  });

  await t.test("6. Admin prepares issuance parameters", async () => {
    const res = await fetch(`${baseUrl}/identity/prepare/${applicationId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.credentialId);
    assert.ok(data.documentCommitment);
    assert.ok(data.salt);
    credentialId = data.credentialId;
  });

  // Only test on-chain issuance if blockchain RPC is available
  await t.test("7. Public verification reports NOT_FOUND for unissued credential", async () => {
    const unissuedId = "0x" + "0".repeat(64);
    const res = await fetch(`${baseUrl}/identity/verify/${unissuedId}`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(["NOT_FOUND", "UNAVAILABLE"].includes(data.status));
  });

  await t.test("8. Audit history endpoint returns logs for authenticated user", async () => {
    const res = await fetch(`${baseUrl}/identity/history`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.logs));
  });
});
