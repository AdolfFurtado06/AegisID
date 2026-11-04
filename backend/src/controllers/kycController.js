const path = require("path");
const fs = require("fs");
const prisma = require("../config/prisma");
const { submitKycSchema, reviewKycSchema } = require("../validators/kycValidators");

async function submitKyc(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Identification document file is required." });
    }

    const parseResult = submitKycSchema.safeParse(req.body);
    if (!parseResult.success) {
      // Clean up uploaded file if validation fails
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        error: "Validation failed",
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { documentType, documentNumber } = parseResult.data;

    // Check if user already has an active PENDING or APPROVED application
    const existingActive = await prisma.kycApplication.findFirst({
      where: {
        userId: req.user.id,
        status: { in: ["PENDING", "APPROVED"] },
      },
    });

    if (existingActive) {
      // Remove uploaded file
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: "You already have an active or approved KYC application.",
        applicationId: existingActive.id,
        status: existingActive.status,
      });
    }

    const application = await prisma.kycApplication.create({
      data: {
        userId: req.user.id,
        documentType,
        documentNumber,
        documentPath: req.file.path,
        status: "PENDING",
      },
      select: {
        id: true,
        documentType: true,
        status: true,
        submittedAt: true,
      },
    });

    return res.status(201).json({
      message: "KYC application submitted successfully and queued for administrator review.",
      application,
    });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error("Submit KYC error:", err);
    return res.status(500).json({ error: "Internal server error while submitting KYC application." });
  }
}

async function getMyKycStatus(req, res) {
  try {
    const application = await prisma.kycApplication.findFirst({
      where: { userId: req.user.id },
      orderBy: { submittedAt: "desc" },
      include: {
        credential: true,
      },
    });

    return res.status(200).json({ application });
  } catch (err) {
    console.error("Get KYC status error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}

async function getAllApplications(req, res) {
  try {
    const { status, search } = req.query;

    const where = {};
    if (status && ["PENDING", "APPROVED", "REJECTED"].includes(status.toUpperCase())) {
      where.status = status.toUpperCase();
    }

    if (search && search.trim().length > 0) {
      where.user = {
        OR: [
          { name: { contains: search.trim() } },
          { email: { contains: search.trim() } },
        ],
      };
    }

    const applications = await prisma.kycApplication.findMany({
      where,
      orderBy: { submittedAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            walletAddress: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        credential: true,
      },
    });

    // Counts summary for admin dashboard
    const counts = {
      total: await prisma.kycApplication.count(),
      pending: await prisma.kycApplication.count({ where: { status: "PENDING" } }),
      approved: await prisma.kycApplication.count({ where: { status: "APPROVED" } }),
      rejected: await prisma.kycApplication.count({ where: { status: "REJECTED" } }),
    };

    return res.status(200).json({ applications, counts });
  } catch (err) {
    console.error("Get all applications error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}

async function getApplicationById(req, res) {
  try {
    const { id } = req.params;
    const application = await prisma.kycApplication.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            walletAddress: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        credential: true,
      },
    });

    if (!application) {
      return res.status(404).json({ error: "Application not found." });
    }

    // Role ownership check
    if (req.user.role !== "ADMIN" && application.userId !== req.user.id) {
      return res.status(403).json({ error: "Access denied." });
    }

    return res.status(200).json({ application });
  } catch (err) {
    console.error("Get application by ID error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}

async function downloadDocument(req, res) {
  try {
    const { id } = req.params;
    const application = await prisma.kycApplication.findUnique({
      where: { id },
    });

    if (!application) {
      return res.status(404).json({ error: "Application not found." });
    }

    // Authorization: only applicant or admin
    if (req.user.role !== "ADMIN" && application.userId !== req.user.id) {
      return res.status(403).json({ error: "Access denied to document." });
    }

    if (!fs.existsSync(application.documentPath)) {
      return res.status(404).json({ error: "File not found on server disk." });
    }

    return res.sendFile(path.resolve(application.documentPath));
  } catch (err) {
    console.error("Download document error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}

async function approveApplication(req, res) {
  try {
    const { id } = req.params;
    const application = await prisma.kycApplication.findUnique({
      where: { id },
      include: { credential: true },
    });

    if (!application) {
      return res.status(404).json({ error: "Application not found." });
    }

    if (application.status === "APPROVED") {
      return res.status(400).json({ error: "Application has already been approved." });
    }

    const updated = await prisma.kycApplication.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
        rejectionReason: null,
      },
      include: {
        user: { select: { id: true, name: true, email: true, walletAddress: true } },
      },
    });

    return res.status(200).json({
      message: "Application approved. Credential can now be issued on-chain.",
      application: updated,
    });
  } catch (err) {
    console.error("Approve application error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}

async function rejectApplication(req, res) {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    const application = await prisma.kycApplication.findUnique({
      where: { id },
    });

    if (!application) {
      return res.status(404).json({ error: "Application not found." });
    }

    const updated = await prisma.kycApplication.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionReason: rejectionReason || "Document verification requirements were not met.",
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
      },
    });

    return res.status(200).json({
      message: "Application rejected.",
      application: updated,
    });
  } catch (err) {
    console.error("Reject application error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}

module.exports = {
  submitKyc,
  getMyKycStatus,
  getAllApplications,
  getApplicationById,
  downloadDocument,
  approveApplication,
  rejectApplication,
};
