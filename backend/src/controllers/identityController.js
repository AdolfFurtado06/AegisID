const qrcode = require("qrcode");
const { ethers } = require("ethers");
const prisma = require("../config/prisma");
const {
  hashFile,
  generateSalt,
  computeCommitment,
  generateCredentialId,
} = require("../services/cryptoService");
const {
  verifyOnChain,
  issueCredentialOnChain,
  revokeCredentialOnChain,
  verifyIssueReceipt,
  verifyRevokeReceipt,
  getReadOnlyContract,
  getDeployedContractAddress,
} = require("../services/blockchainService");

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

/**
 * Returns current user's credential and QR data.
 */
async function getMyCredential(req, res) {
  try {
    const credential = await prisma.identityCredential.findFirst({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        application: {
          select: {
            id: true,
            documentType: true,
            submittedAt: true,
            status: true,
          },
        },
      },
    });

    if (!credential) {
      return res.status(200).json({ credential: null });
    }

    // Public QR verification URL
    const verificationUrl = `${FRONTEND_URL}/verify/${credential.id}`;
    const qrDataUrl = await qrcode.toDataURL(verificationUrl, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 300,
    });

    return res.status(200).json({
      credential,
      verificationUrl,
      qrDataUrl,
    });
  } catch (err) {
    console.error("Get my credential error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}

/**
 * Prepares parameters for issuance (useful if frontend wants to sign with MetaMask).
 */
async function prepareIssuance(req, res) {
  try {
    const { applicationId } = req.params;
    const application = await prisma.kycApplication.findUnique({
      where: { id: applicationId },
      include: { user: true, credential: true },
    });

    if (!application) {
      return res.status(404).json({ error: "Application not found." });
    }

    if (application.status !== "APPROVED") {
      return res.status(400).json({
        error: "Cannot issue credential. Application has not been approved.",
      });
    }

    if (application.credential && application.credential.status === "ACTIVE") {
      return res.status(400).json({
        error: "A credential has already been issued for this application.",
      });
    }

    const fileHash = hashFile(application.documentPath);
    const salt = generateSalt();
    const commitment = computeCommitment(fileHash, salt);
    const credentialId = generateCredentialId();
    const contractAddress = getDeployedContractAddress();

    // Subject wallet address: user's linked wallet or fallback
    const subjectAddress =
      application.user.walletAddress || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

    return res.status(200).json({
      applicationId,
      credentialId,
      subjectAddress,
      documentCommitment: commitment,
      salt,
      contractAddress,
    });
  } catch (err) {
    console.error("Prepare issuance error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}

/**
 * Issues credential on-chain and persists record in database.
 * Supports either:
 *  - Automated backend issuer transaction submission (Hardhat local issuer)
 *  - Or recording receipt when admin signed directly via MetaMask
 */
async function issueCredential(req, res) {
  try {
    const { applicationId } = req.params;
    const {
      credentialId: customId,
      salt: customSalt,
      documentCommitment: customCommitment,
      transactionHash: submittedTxHash,
      blockNumber: submittedBlock,
    } = req.body;

    const application = await prisma.kycApplication.findUnique({
      where: { id: applicationId },
      include: { user: true, credential: true },
    });

    if (!application) {
      return res.status(404).json({ error: "Application not found." });
    }

    if (application.status !== "APPROVED") {
      return res.status(400).json({
        error: "Application must be APPROVED before issuing a credential.",
      });
    }

    if (application.credential && application.credential.status === "ACTIVE") {
      return res.status(400).json({
        error: "Active credential already exists for this application.",
      });
    }

    const fileHash = hashFile(application.documentPath);
    const salt = customSalt || generateSalt();
    const commitment = customCommitment || computeCommitment(fileHash, salt);
    const credentialId = customId || generateCredentialId();
    const subjectAddress =
      application.user.walletAddress || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

    if (!ethers.isHexString(credentialId, 32) || !ethers.isHexString(commitment, 32)) {
      return res.status(400).json({ error: "Credential ID and commitment must be bytes32 values." });
    }
    if (customCommitment && computeCommitment(fileHash, salt).toLowerCase() !== commitment.toLowerCase()) {
      return res.status(400).json({ error: "Document commitment does not match the uploaded document and salt." });
    }

    let txHash = submittedTxHash;
    let blockNum = submittedBlock;

    // If transaction was not pre-executed by MetaMask, execute via the backend issuer.
    if (!txHash) {
      const onChainResult = await issueCredentialOnChain(
        credentialId,
        subjectAddress,
        commitment
      );
      txHash = onChainResult.transactionHash;
      blockNum = onChainResult.blockNumber;
    } else {
      if (!customId || !customSalt || !customCommitment) {
        return res.status(400).json({
          error: "A client-submitted transaction must include its credential ID, salt, and commitment.",
        });
      }
      const owner = await getReadOnlyContract().owner();
      const verifiedReceipt = await verifyIssueReceipt(txHash, {
        credentialId,
        subjectAddress,
        documentCommitment: commitment,
        issuerAddress: owner,
      });
      txHash = verifiedReceipt.transactionHash;
      blockNum = verifiedReceipt.blockNumber;
    }

    // Persist or update credential in DB
    const credential = await prisma.identityCredential.upsert({
      where: { applicationId },
      update: {
        id: credentialId,
        credentialHash: commitment,
        salt,
        transactionHash: txHash,
        blockNumber: blockNum,
        status: "ACTIVE",
        issuedAt: new Date(),
        revokedAt: null,
      },
      create: {
        id: credentialId,
        applicationId,
        userId: application.userId,
        credentialHash: commitment,
        salt,
        transactionHash: txHash,
        blockNumber: blockNum,
        status: "ACTIVE",
        issuedAt: new Date(),
      },
    });

    // Record audit log
    await prisma.verificationLog.create({
      data: {
        credentialId: credential.id,
        action: "ISSUED",
        transactionHash: txHash,
        performedBy: req.user.id,
      },
    });

    const verificationUrl = `${FRONTEND_URL}/verify/${credential.id}`;
    const qrDataUrl = await qrcode.toDataURL(verificationUrl, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 300,
    });

    return res.status(201).json({
      message: "Credential issued successfully on-chain.",
      credential,
      transactionHash: txHash,
      blockNumber: blockNum,
      verificationUrl,
      qrDataUrl,
    });
  } catch (err) {
    console.error("Issue credential error:", err);
    return res.status(500).json({
      error: "Failed to issue credential on blockchain.",
      details: err.message,
    });
  }
}

/**
 * Revokes a credential on-chain and marks it REVOKED in database.
 */
async function revokeCredential(req, res) {
  try {
    const { credentialId } = req.params;
    const { transactionHash: submittedTxHash, blockNumber: submittedBlock } = req.body;

    const credential = await prisma.identityCredential.findUnique({
      where: { id: credentialId },
    });

    if (!credential) {
      return res.status(404).json({ error: "Credential record not found." });
    }

    if (credential.status === "REVOKED") {
      return res.status(400).json({ error: "Credential has already been revoked." });
    }

    let txHash = submittedTxHash;
    let blockNum = submittedBlock;

    if (!txHash) {
      const onChainResult = await revokeCredentialOnChain(credentialId);
      txHash = onChainResult.transactionHash;
      blockNum = onChainResult.blockNumber;
    } else {
      const owner = await getReadOnlyContract().owner();
      const verifiedReceipt = await verifyRevokeReceipt(txHash, {
        credentialId,
        issuerAddress: owner,
      });
      txHash = verifiedReceipt.transactionHash;
      blockNum = verifiedReceipt.blockNumber;
    }

    const updated = await prisma.identityCredential.update({
      where: { id: credentialId },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        revocationTxHash: txHash,
      },
    });

    // Audit log
    await prisma.verificationLog.create({
      data: {
        credentialId,
        action: "REVOKED",
        transactionHash: txHash,
        performedBy: req.user.id,
      },
    });

    return res.status(200).json({
      message: "Credential revoked successfully on-chain.",
      credential: updated,
      transactionHash: txHash,
    });
  } catch (err) {
    console.error("Revoke credential error:", err);
    return res.status(500).json({
      error: "Failed to revoke credential on blockchain.",
      details: err.message,
    });
  }
}

/**
 * Public Verification Endpoint - Checks authoritative on-chain state.
 * Never leaks private info like full ID number, raw document, or password.
 */
async function verifyCredentialPublic(req, res) {
  try {
    const { credentialId } = req.params;

    // 1. Authoritative check on blockchain
    const chainState = await verifyOnChain(credentialId);

    // 2. Fetch minimal, safe public metadata from database index
    const dbRecord = await prisma.identityCredential.findUnique({
      where: { id: credentialId },
      include: {
        application: {
          select: {
            documentType: true,
            submittedAt: true,
          },
        },
      },
    });

    // Determine authoritative status
    let status = "NOT_FOUND";
    if (chainState.unavailable) {
      status = "UNAVAILABLE";
    } else if (chainState.exists) {
      status = chainState.active ? "ACTIVE" : "REVOKED";
    }

    // Optional verification audit log
    if (dbRecord) {
      await prisma.verificationLog.create({
        data: {
          credentialId,
          action: "VERIFIED",
          transactionHash: null,
          performedBy: null,
        },
      });
    }

    return res.status(200).json({
      credentialId,
      status, // "ACTIVE" | "REVOKED" | "NOT_FOUND" | "UNAVAILABLE"
      onChain: chainState,
      metadata: dbRecord
        ? {
            documentType: dbRecord.application.documentType,
            issuedAt: dbRecord.issuedAt,
            revokedAt: dbRecord.revokedAt,
            transactionHash: dbRecord.transactionHash,
            revocationTxHash: dbRecord.revocationTxHash,
          }
        : null,
    });
  } catch (err) {
    console.error("Public verify credential error:", err);
    return res.status(500).json({
      error: "Internal server error during verification.",
      status: "UNAVAILABLE",
    });
  }
}

/**
 * Returns audit and transaction history.
 */
async function getTransactionHistory(req, res) {
  try {
    const logs = await prisma.verificationLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        credential: {
          select: {
            id: true,
            status: true,
            applicationId: true,
            credentialHash: true,
            transactionHash: true,
            revocationTxHash: true,
          },
        },
        performer: {
          select: {
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return res.status(200).json({ logs });
  } catch (err) {
    console.error("Get transaction history error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}

/**
 * Cryptographically recomputes document commitment and checks match against smart contract.
 */
async function verifyDocumentIntegrity(req, res) {
  try {
    const { applicationId } = req.params;
    const application = await prisma.kycApplication.findUnique({
      where: { id: applicationId },
      include: { credential: true, user: true },
    });

    if (!application) {
      return res.status(404).json({ error: "Application not found." });
    }

    if (req.user.role !== "ADMIN" && application.userId !== req.user.id) {
      return res.status(403).json({ error: "Access denied." });
    }

    if (!application.credential) {
      return res.status(400).json({ error: "No issued credential found for this application." });
    }

    const fs = require("fs");
    if (!fs.existsSync(application.documentPath)) {
      return res.status(404).json({ error: "Retained document file not found on disk." });
    }

    const fileSha256 = hashFile(application.documentPath);
    const salt = application.credential.salt;
    const recomputedCommitment = computeCommitment(fileSha256, salt);

    let onChainCommitment = null;
    let onChainFound = false;
    try {
      const contract = getReadOnlyContract();
      const identity = await contract.getCredential(application.credential.id);
      onChainCommitment = identity.documentCommitment;
      onChainFound = true;
    } catch (e) {
      // Contract call fallback if node offline
    }

    const targetCommitment = onChainCommitment || application.credential.credentialHash;
    const matches = recomputedCommitment.toLowerCase() === targetCommitment.toLowerCase();

    return res.status(200).json({
      applicationId,
      credentialId: application.credential.id,
      matches,
      fileSha256,
      salt,
      recomputedCommitment,
      onChainCommitment: targetCommitment,
      onChainLiveQueried: onChainFound,
      contractAddress: getDeployedContractAddress(),
      verifiedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Verify document integrity error:", err);
    return res.status(500).json({ error: "Internal server error during integrity check." });
  }
}

/**
 * Returns W3C-compliant Verifiable Credential JSON-LD payload.
 */
async function getW3CCredential(req, res) {
  try {
    const { credentialId } = req.params;
    const credential = await prisma.identityCredential.findUnique({
      where: { id: credentialId },
      include: {
        application: true,
        user: { select: { id: true, name: true, walletAddress: true } },
      },
    });

    if (!credential) {
      return res.status(404).json({ error: "Credential not found." });
    }

    const contractAddress = getDeployedContractAddress();
    const subjectDid = credential.user.walletAddress
      ? `did:pkh:eip155:31337:${credential.user.walletAddress}`
      : `urn:chainkyc:user:${credential.user.id}`;

    const w3cPayload = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://schema.org"
      ],
      id: `urn:chainkyc:credential:${credential.id}`,
      type: ["VerifiableCredential", "DigitalIdentityCredential"],
      issuer: `did:pkh:eip155:31337:${contractAddress || "0x5FbDB2315678afecb367f032d93F642f64180aa3"}`,
      issuanceDate: credential.issuedAt ? credential.issuedAt.toISOString() : new Date().toISOString(),
      credentialSubject: {
        id: subjectDid,
        documentType: credential.application.documentType,
        documentCommitment: credential.credentialHash,
        status: credential.status,
      },
      evidence: [
        {
          id: `urn:chainkyc:application:${credential.applicationId}`,
          type: ["DocumentVerificationEvidence"],
          verifier: "ChainKYC Administrator",
          documentType: credential.application.documentType,
        }
      ],
      proof: {
        type: "EthereumSmartContractProof2024",
        created: credential.issuedAt ? credential.issuedAt.toISOString() : new Date().toISOString(),
        network: "Hardhat Local (ChainID: 31337)",
        contractAddress: contractAddress,
        credentialId: credential.id,
        transactionHash: credential.transactionHash,
        blockNumber: credential.blockNumber,
      }
    };

    return res.status(200).json(w3cPayload);
  } catch (err) {
    console.error("Get W3C credential error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}

module.exports = {
  getMyCredential,
  prepareIssuance,
  issueCredential,
  revokeCredential,
  verifyCredentialPublic,
  getTransactionHistory,
  verifyDocumentIntegrity,
  getW3CCredential,
};
