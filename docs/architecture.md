# ChainKYC - System Architecture & Privacy Model

## Overview
ChainKYC is a privacy-conscious, blockchain-anchored digital identity verification prototype. It separates identity document management from public on-chain verification, ensuring that zero personally identifiable information (PII) is ever written to the immutable ledger.

```
+-------------------------------------------------------------+
|                      React + Vite UI                        |
|  - User Dashboard (KYC status, credential QR)               |
|  - Admin Dashboard (Application review & on-chain issuance) |
|  - Public Verifier (/verify/:id + live QR camera scanner)   |
+------------------------------+------------------------------+
                               | REST API (JWT Authenticated)
                               v
+-------------------------------------------------------------+
|                    Express.js Backend                       |
|  - Zod Input & File Validation                              |
|  - Salted Commitment Generator (SHA-256 + 32B Secret Salt)  |
|  - Role-Based Access Control (USER vs ADMIN)                |
|  - Wallet Challenge/Signature Verification                  |
+--------------+-------------------------------+--------------+
               |                               |
               v                               v
+-----------------------------+ +-----------------------------+
|    SQLite + Prisma ORM      | |    Private Storage Path     |
|  - Users & Passwords (hash) | |  - /storage/uploads/        |
|  - Application Metadata     | |  - Protected Document Files |
|  - Off-Chain Salts          | |                             |
+-----------------------------+ +-----------------------------+
               |
               v JSON-RPC / Ethers.js
+-------------------------------------------------------------+
|                 Hardhat Local EVM Node                      |
|  - IdentityVerification.sol (Solidity ^0.8.24)              |
|  - Function: issueCredential(bytes32 id, address, bytes32)  |
|  - Function: revokeCredential(bytes32 id)                   |
|  - Function: verifyCredential(bytes32 id) [Public View]     |
+-------------------------------------------------------------+
```

## Privacy & Commitment Scheme
1. User uploads a mock synthetic document file (JPEG, PNG, or PDF).
2. The backend generates:
   - A SHA-256 digest of the uploaded binary file.
   - A cryptographically secure random 32-byte salt.
   - A salted commitment: `commitment = keccak256(fileSha256 + ":" + salt)`.
3. Only the `commitment` and an opaque 32-byte `credentialId` are recorded on-chain.
4. The QR code encodes only a public URL pointing to `http://localhost:5173/verify/<credentialId>`.
5. No raw identity numbers, names, photos, or emails are ever placed on the blockchain.

## Wallet Authentication & Receipt Verification

1. The frontend requests a short-lived challenge for a MetaMask address.
2. MetaMask signs the challenge message without sending a transaction.
3. The backend recovers the signer address, rejects expired/reused challenges, and then links or logs in the account.
4. For issuance and revocation, MetaMask submits the contract transaction directly when available.
5. The backend verifies the receipt status, target contract, expected issuer, and emitted event before updating SQLite.
