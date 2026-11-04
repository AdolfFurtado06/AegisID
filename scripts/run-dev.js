const { spawn } = require("child_process");
const http = require("http");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const isWin = process.platform === "win32";
const npmCmd = isWin ? "npm.cmd" : "npm";
const npxCmd = isWin ? "npx.cmd" : "npx";

const children = [];

function log(prefix, msg) {
  const lines = String(msg).trim().split("\n");
  for (const line of lines) {
    if (line.trim()) {
      console.log(`[${prefix}] ${line}`);
    }
  }
}

function runProcess(prefix, cmd, args, cwd) {
  const child = spawn(cmd, args, { cwd, shell: isWin, stdio: ["ignore", "pipe", "pipe"] });
  children.push(child);

  child.stdout.on("data", (data) => log(prefix, data));
  child.stderr.on("data", (data) => log(prefix, data));
  child.on("close", (code) => {
    if (code !== 0 && code !== null) {
      log(prefix, `Process exited with code ${code}`);
    }
  });

  return child;
}

function checkRpcReady() {
  return new Promise((resolve) => {
    const req = http.request(
      "http://127.0.0.1:8545",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        timeout: 1000,
      },
      (res) => {
        resolve(res.statusCode === 200);
      }
    );
    req.on("error", () => resolve(false));
    req.write(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "net_version", params: [] }));
    req.end();
  });
}

async function waitForRpc(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await checkRpcReady()) return true;
    await new Promise((r) => setTimeout(r, 600));
  }
  return false;
}

async function main() {
  console.log("==================================================");
  console.log("🚀 Starting AegisID Full Development Stack");
  console.log("==================================================");

  // 1. Start Hardhat Node
  console.log("\n1. Starting local Hardhat blockchain node...");
  runProcess("CHAIN", npxCmd, ["hardhat", "node"], path.join(ROOT, "blockchain"));

  // 2. Wait for RPC to be ready
  process.stdout.write("Waiting for blockchain RPC on port 8545...");
  const ready = await waitForRpc();
  if (!ready) {
    console.error("\n❌ Hardhat node did not respond in time.");
    cleanup();
    process.exit(1);
  }
  console.log(" Ready!\n");

  // 3. Deploy smart contract
  console.log("2. Deploying IdentityVerification contract to localhost...");
  await new Promise((resolve, reject) => {
    const deployProc = spawn(npxCmd, ["hardhat", "run", "scripts/deploy.js", "--network", "localhost"], {
      cwd: path.join(ROOT, "blockchain"),
      shell: isWin,
      stdio: ["ignore", "pipe", "pipe"],
    });
    deployProc.stdout.on("data", (data) => log("DEPLOY", data));
    deployProc.stderr.on("data", (data) => log("DEPLOY", data));
    deployProc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Deploy process failed with code ${code}`));
    });
  });

  // 4. Start Backend
  console.log("\n3. Starting Backend API on http://localhost:5000...");
  runProcess("BACKEND", npmCmd, ["run", "dev"], path.join(ROOT, "backend"));

  // 5. Start Frontend
  console.log("\n4. Starting Frontend UI on http://localhost:5173...");
  runProcess("FRONTEND", npmCmd, ["run", "dev"], path.join(ROOT, "frontend"));

  console.log("\n==================================================");
  console.log("✨ All AegisID services are running!");
  console.log("👉 Open in browser: http://localhost:5173");
  console.log("Press Ctrl+C to terminate all services.");
  console.log("==================================================\n");
}

function cleanup() {
  for (const child of children) {
    try {
      if (isWin) {
        spawn("taskkill", ["/pid", child.pid, "/f", "/t"]);
      } else {
        child.kill("SIGTERM");
      }
    } catch (e) {
      // ignore
    }
  }
}

process.on("SIGINT", () => {
  console.log("\nShutting down AegisID services...");
  cleanup();
  process.exit(0);
});

process.on("SIGTERM", () => {
  cleanup();
  process.exit(0);
});

main().catch((err) => {
  console.error("Startup error:", err);
  cleanup();
  process.exit(1);
});
