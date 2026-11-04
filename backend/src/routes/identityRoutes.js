const express = require("express");
const router = express.Router();
const identityController = require("../controllers/identityController");
const { authenticate, requireAdmin, requireUser } = require("../middleware/authMiddleware");

// Public verification & W3C payload
router.get("/verify/:credentialId", identityController.verifyCredentialPublic);
router.get("/:credentialId/w3c", identityController.getW3CCredential);

// User routes
router.get("/my", authenticate, requireUser, identityController.getMyCredential);

// Document cryptographic integrity check (Admin or Applicant)
router.get("/:applicationId/verify-integrity", authenticate, identityController.verifyDocumentIntegrity);

// Admin routes
router.get("/prepare/:applicationId", authenticate, requireAdmin, identityController.prepareIssuance);
router.post("/:applicationId/issue", authenticate, requireAdmin, identityController.issueCredential);
router.post("/:credentialId/revoke", authenticate, requireAdmin, identityController.revokeCredential);

// Authenticated audit history
router.get("/history", authenticate, identityController.getTransactionHistory);

module.exports = router;
