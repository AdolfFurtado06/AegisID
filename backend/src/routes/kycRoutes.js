const express = require("express");
const router = express.Router();
const kycController = require("../controllers/kycController");
const { authenticate, requireAdmin, requireUser } = require("../middleware/authMiddleware");
const { upload } = require("../middleware/uploadMiddleware");

// User routes
router.post("/submit", authenticate, requireUser, upload.single("document"), kycController.submitKyc);
router.get("/status", authenticate, requireUser, kycController.getMyKycStatus);

// Admin routes
router.get("/applications", authenticate, requireAdmin, kycController.getAllApplications);
router.post("/:id/approve", authenticate, requireAdmin, kycController.approveApplication);
router.post("/:id/reject", authenticate, requireAdmin, kycController.rejectApplication);

// Shared (Applicant or Admin)
router.get("/:id", authenticate, kycController.getApplicationById);
router.get("/:id/document", authenticate, kycController.downloadDocument);

module.exports = router;
