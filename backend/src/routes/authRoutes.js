const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticate } = require("../middleware/authMiddleware");

// Password authentication
router.post("/register", authController.register);
router.post("/login", authController.login);

// Wallet authentication
router.post("/wallet/challenge", authController.createWalletChallenge);
router.post("/wallet/login", authController.loginWithWallet);

// Authenticated account routes
router.get("/me", authenticate, authController.me);
router.post("/wallet/link", authenticate, authController.linkWallet);

module.exports = router;
