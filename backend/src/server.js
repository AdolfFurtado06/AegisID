const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const kycRoutes = require("./routes/kycRoutes");
const identityRoutes = require("./routes/identityRoutes");
const { getDeployedContractAddress } = require("./services/blockchainService");

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS configuration
app.use(
  cors({
    origin: [FRONTEND_URL, "http://127.0.0.1:5173"],
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Rate limiting for auth & public verification
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
  message: { error: "Too many authentication requests. Please try again later." },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// Health check & contract status
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    contractAddress: getDeployedContractAddress(),
    network: "Hardhat Local (ChainID: 31337)",
  });
});

// Mount modular API routes
app.use("/api/auth", authRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/identity", identityRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.path}` });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  if (err.message && err.message.includes("Invalid file format")) {
    return res.status(400).json({ error: err.message });
  }
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "File exceeds 5MB size limit." });
  }
  res.status(500).json({ error: "Internal server error." });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log("==================================================");
    console.log(`🚀 AegisID Backend running on http://localhost:${PORT}`);
    console.log(`📡 Contract Address: ${getDeployedContractAddress() || "Not deployed yet"}`);
    console.log(`🔒 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log("==================================================");
  });
}

module.exports = app;
