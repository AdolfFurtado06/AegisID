const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { ethers } = require("ethers");
const prisma = require("../config/prisma");
const {
  registerSchema,
  loginSchema,
  walletChallengeSchema,
  walletProofSchema,
} = require("../validators/authValidators");

const JWT_SECRET = process.env.JWT_SECRET || "default_local_secret";

function issueToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "24h" }
  );
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    walletAddress: user.walletAddress,
    createdAt: user.createdAt,
  };
}

function normalizeWalletAddress(walletAddress) {
  try {
    return ethers.getAddress(walletAddress);
  } catch {
    return null;
  }
}

function createWalletMessage(address, nonce, issuedAt, expiresAt) {
  return [
    "ChainKYC wallet verification",
    "",
    `Address: ${address}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt.toISOString()}`,
    `Expires At: ${expiresAt.toISOString()}`,
    "",
    "Sign this message to prove ownership of the wallet. No blockchain transaction will be sent.",
  ].join("\n");
}

async function findUserByWallet(address) {
  const users = await prisma.user.findMany({
    where: { walletAddress: { not: null } },
  });
  return users.find((user) => user.walletAddress.toLowerCase() === address.toLowerCase()) || null;
}

async function verifyWalletProof({ walletAddress, nonce, signature }) {
  const address = normalizeWalletAddress(walletAddress);
  if (!address) {
    const error = new Error("Invalid Ethereum wallet address.");
    error.statusCode = 400;
    throw error;
  }

  const challenge = await prisma.walletChallenge.findUnique({ where: { nonce } });
  if (!challenge || challenge.address.toLowerCase() !== address.toLowerCase()) {
    const error = new Error("Wallet challenge not found.");
    error.statusCode = 400;
    throw error;
  }

  if (challenge.usedAt || challenge.expiresAt <= new Date()) {
    const error = new Error("Wallet challenge has expired or was already used.");
    error.statusCode = 400;
    throw error;
  }

  let recoveredAddress;
  try {
    recoveredAddress = ethers.verifyMessage(challenge.message, signature);
  } catch {
    const error = new Error("Invalid wallet signature.");
    error.statusCode = 400;
    throw error;
  }

  if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
    const error = new Error("Wallet signature does not match the requested address.");
    error.statusCode = 401;
    throw error;
  }

  const consumed = await prisma.walletChallenge.updateMany({
    where: { nonce, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (consumed.count !== 1) {
    const error = new Error("Wallet challenge has already been used.");
    error.statusCode = 400;
    throw error;
  }

  return address;
}

function sendAuthError(err, res, context) {
  if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
  console.error(context, err);
  return res.status(500).json({ error: "Internal server error." });
}

async function createWalletChallenge(req, res) {
  try {
    const parseResult = walletChallengeSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const address = normalizeWalletAddress(parseResult.data.walletAddress);
    if (!address) return res.status(400).json({ error: "Invalid Ethereum wallet address." });

    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + 5 * 60 * 1000);
    const nonce = crypto.randomBytes(32).toString("hex");
    const message = createWalletMessage(address, nonce, issuedAt, expiresAt);

    await prisma.walletChallenge.deleteMany({
      where: {
        address: address.toLowerCase(),
        OR: [{ usedAt: { not: null } }, { expiresAt: { lt: issuedAt } }],
      },
    });
    await prisma.walletChallenge.create({
      data: { address: address.toLowerCase(), nonce, message, expiresAt },
    });

    return res.status(200).json({ address, nonce, message, expiresAt });
  } catch (err) {
    return sendAuthError(err, res, "Create wallet challenge error:");
  }
}

async function loginWithWallet(req, res) {
  try {
    const parseResult = walletProofSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const address = await verifyWalletProof(parseResult.data);
    const user = await findUserByWallet(address);
    if (!user) {
      return res.status(404).json({
        error: "No ChainKYC account is linked to this wallet. Sign in with a password and link it first.",
      });
    }

    return res.status(200).json({
      message: "Wallet login successful.",
      token: issueToken(user),
      user: publicUser(user),
    });
  } catch (err) {
    return sendAuthError(err, res, "Wallet login error:");
  }
}

async function linkWallet(req, res) {
  try {
    const parseResult = walletProofSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const address = await verifyWalletProof(parseResult.data);
    const existingUser = await findUserByWallet(address);
    if (existingUser && existingUser.id !== req.user.id) {
      return res.status(409).json({ error: "This wallet is already linked to another account." });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { walletAddress: address },
    });
    return res.status(200).json({ message: "Wallet ownership verified and linked.", user: publicUser(user) });
  } catch (err) {
    return sendAuthError(err, res, "Wallet linking error:");
  }
}

async function register(req, res) {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { name, email, password } = parseResult.data;

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    // Role is strictly forced to USER for public registration
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: "USER",
        walletAddress: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        walletAddress: true,
        createdAt: true,
      },
    });

    const token = issueToken(user);

    return res.status(201).json({
      message: "Registration successful.",
      token,
      user,
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ error: "Internal server error during registration." });
  }
}

async function login(req, res) {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { email, password } = parseResult.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = issueToken(user);

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        walletAddress: user.walletAddress,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal server error during login." });
  }
}

async function me(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        walletAddress: true,
        createdAt: true,
        applications: {
          orderBy: { submittedAt: "desc" },
          take: 1,
          include: {
            credential: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    return res.status(200).json({ user });
  } catch (err) {
    console.error("Me endpoint error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}

module.exports = {
  register,
  login,
  me,
  createWalletChallenge,
  loginWithWallet,
  linkWallet,
};
