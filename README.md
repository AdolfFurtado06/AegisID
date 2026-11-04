# AegisID — Blockchain-Based Digital Identity & KYC Verification

[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?logo=solidity)](https://soliditylang.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.22-yellow)](https://hardhat.org/)
[![React](https://img.shields.io/badge/React-18-blue?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green?logo=node.js)](https://nodejs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)](https://www.prisma.io/)

A complete, privacy-conscious digital identity verification system. AegisID allows users to submit synthetic identity documentation for administrator review, commits privacy-preserving cryptographic hashes to an Ethereum-compatible smart contract, issues verifiable QR codes for third-party public checks, and enforces authoritative on-chain revocation.

---

## Key Features

* **Privacy-First On-Chain Commitments**: Zero personally identifiable information (PII) is placed on the blockchain. The contract stores only an opaque `bytes32` identifier and a salted document commitment: `keccak256(fileSha256 + ":" + salt)`.
* **Smart Contract Registry (`IdentityVerification.sol`)**:
  * Issuer-only issuance and revocation protected by OpenZeppelin access controls.
  * Public read-only verification methods (`verifyCredential`, `credentialExists`, `getCredential`).
  * Emits `CredentialIssued` and `CredentialRevoked` events.
* **Role-Based Web Platform**:
  * **Applicant**: Register, submit synthetic document (`MOCK_ID`, `MOCK_PAN`, `PASSPORT_SAMPLE`), track verification progress stepper, view digital credential and QR code.
   * **Administrator / Issuer**: Review queue with search and status filtering, secure document inspection, one-click on-chain issuance, and on-chain revocation.
   * **Public Verifier**: Scan QR code via webcam (`html5-qrcode`) or query by credential ID to get real-time blockchain validity (`ACTIVE`, `REVOKED`, `NOT FOUND`, `UNAVAILABLE`).
   * **Wallet Ownership Proof**: Link MetaMask or sign in with a wallet using a one-time, five-minute challenge message; addresses are never accepted without signature verification.
   * **Cryptographic Integrity Verifier**: Recomputes SHA-256 + secret salt on demand and matches it against on-chain smart contract storage to prove the document has not been altered by even one bit.
   * **W3C Verifiable Credential Export**: Download interoperable W3C JSON-LD credentials with embedded Ethereum smart contract cryptographic proof metadata.
* **Design System**: Built with Tailwind CSS using an intentional, restrained aesthetic (warm off-white `#F6F7F3`, forest green `#236B53`, clean status badges, no generic purple/blue gradients or AI clutter).

---

## Project Structure

```text
blockchain-kyc/
├── backend/                  # Express REST API & Prisma SQLite database
│   ├── prisma/
│   │   ├── schema.prisma     # SQLite models: User, KycApplication, IdentityCredential, VerificationLog
│   │   └── seed.js           # Seeds default admin and test user
│   ├── src/
│   │   ├── controllers/      # Auth, KYC, and Identity/Blockchain controllers
│   │   ├── middleware/       # JWT auth guards & Multer private file upload
│   │   ├── routes/           # REST endpoints
│   │   ├── services/         # Salted commitments & Ethers.js integration
│   │   └── server.js         # Express app entry point
│   └── storage/uploads/      # Protected document storage (outside public root)
│
├── blockchain/               # Hardhat smart contract development environment
│   ├── contracts/
│   │   └── IdentityVerification.sol # Solidity ^0.8.24 registry contract
│   ├── scripts/
│   │   └── deploy.js         # Deployment script (exports address to JSON)
│   ├── test/
│   │   └── IdentityVerification.test.js # 13 automated unit tests
│   └── hardhat.config.js     # Hardhat network & compiler configuration
│
├── frontend/                 # React + Vite single-page application
│   ├── src/
│   │   ├── components/       # Layout, Navbar, StatusBadge, QRScannerModal
│   │   ├── context/          # AuthContext (JWT & wallet sync)
│   │   ├── pages/            # Login, Register, Dashboards, Review, Verify, History
│   │   └── services/         # Axios API client
│   └── tailwind.config.js    # Custom colour palette & typography
│
├── docs/                     # Architecture, API specifications, and demo checklist
└── test-documents/           # Sample synthetic test files (PNG, PDF)
```

---

## Quickstart Guide

### Option A: One-Click Single Command (Recommended)
You can launch the entire stack (Hardhat Node + Contract Deployment + Backend API + Frontend UI) with a single command:

**PowerShell:**
```powershell
.\start-dev.ps1
```
*or via npm:*
```bash
npm run dev
```

The runner automatically starts the local blockchain, verifies RPC readiness, deploys the smart contract, launches the backend API on `http://localhost:5000`, and opens the Vite UI on `http://localhost:5173`.

### Option B: Pre-seed Evaluation Demo Scenarios
To instantly pre-populate the blockchain and database with active, revoked, and pending credentials:
```bash
npm run seed:demo
```
This sets up:
* **Alice Johnson** (`alice@example.com` / `Alice@ChainKYC2026`) &rarr; **ACTIVE** on-chain credential & QR code.
* **Bob Miller** (`bob@example.com` / `Bob@ChainKYC2026`) &rarr; **REVOKED** on-chain credential & QR code.
* **Charlie Davis** (`charlie@example.com` / `Charlie@ChainKYC2026`) &rarr; **PENDING** in review queue (ready for live review).

---

### Option C: Docker Containerization
Run all services isolated inside Docker:
```bash
docker compose up --build
```
Access the application at `http://localhost:5173`.

---

### Option D: Manual Multi-Terminal Setup

#### 1. Prerequisites
- **Node.js**: v18+ or v20+ LTS
- **npm**

#### 2. Start Local Blockchain & Deploy Contract

In a new terminal:
```bash
cd blockchain
npx hardhat test                # Run 13 unit tests
npx hardhat node                # Starts local JSON-RPC node at http://127.0.0.1:8545
```

In a second terminal, deploy the smart contract to the running node:
```bash
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
```
*The deployed address is automatically saved to `blockchain/deployed-contract.json` and read by the backend.*

---

#### 3. Start Backend API

In a third terminal:
```bash
cd backend
npm run db:migrate              # Applies SQLite migrations
npm run db:seed                 # Seeds default admin and test user
npm run dev                     # Starts API at http://localhost:5000
```

Default credentials seeded:
- **Admin**: `admin@chainkyc.local` / `Admin@ChainKYC2026`
- **User**: `alice@example.com` / `Alice@ChainKYC2026`

---

#### 4. Start Frontend UI

In a fourth terminal:
```bash
cd frontend
npm install
npm run dev                     # Starts Vite dev server at http://localhost:5173
```

Open `http://localhost:5173` in your browser.

For MetaMask flows, import a local Hardhat account into MetaMask and connect it to `http://127.0.0.1:8545` with chain ID `31337`. Sign in with a password first, then click **Connect Wallet** to prove ownership and link the wallet. Administrators can approve issuance and revocation directly in MetaMask. The backend validates every receipt before changing the database credential status.

---

## Complete Verification Cycle Demonstration

1. **User Submission**: Sign in as `alice@example.com` (or click "Fill User Demo"). Go to **Submit KYC**, choose `MOCK_ID`, and upload `test-documents/sample_mock_id.png`.
2. **Admin Review & Issuance**: Log in as `admin@chainkyc.local` (or click "Fill Admin Demo"). In **Review Queue**, click **Inspect & Review**, approve the application, then click **Issue Credential on Blockchain**.
3. **QR Generation**: Log back in as Alice, open **My Credential**, and view the issued QR code and transaction hash.
4. **Public Verification (Active)**: Open the verification URL (or scan via webcam on `/verify`). The system displays `ACTIVE` with on-chain confirmation.
5. **Revocation**: From the Admin review page, click **Revoke On-Chain Credential**.
6. **Public Verification (Revoked)**: Refresh the public verification page. The same QR code now definitively reports `REVOKED`.

---

## Automated Tests & Verification

You can run the entire automated test suite (Smart Contracts + Backend E2E Lifecycle) with:
```bash
npm test
```

### 1. Smart Contract Tests (13 Tests)
Run contract tests independently:
```bash
npm run test:contracts
```
* Deployer access control & ownership verification.
* Authorized issuance vs. unauthorized non-owner revert (`OwnableUnauthorizedAccount`).
* Zero-address subject and empty commitment validations.
* Duplicate credential ID collision prevention.
* Authorized revocation vs. unauthorized revocation revert.
* Duplicate revocation rejection.
* Authoritative on-chain view queries (`verifyCredential`, `getCredential`).

### 2. Backend E2E Integration Suite (9 Tests)
Run backend integration tests independently:
```bash
npm run test:backend
```
* User registration, password hashing, and JWT creation.
* Multipart synthetic document upload and storage isolation.
* Admin application queue filtering and inspection.
* Application approval and cryptographic salt/commitment preparation.
* Public verification of unissued IDs reporting `NOT_FOUND`.
* Audit log tracking across all lifecycle operations.
- Duplicate revocation prevention.
- Authoritative on-chain view queries (`verifyCredential`, `getCredential`).

---

## Security & Privacy Highlights

- **No On-Chain PII**: Full names, dates of birth, raw identity numbers, and document images are never transmitted to the blockchain.
- **Salted Commitments**: Hashes incorporate a 32-byte secret random salt to prevent pre-image dictionary matching against structured document numbers.
- **Role-Based Middleware**: Sensitive administrative review and document download routes are secured with JWT and database-level role verification.
- **Wallet Ownership Proof**: Wallet linking and wallet login require recovery of the requested address from a one-time signed challenge; challenges expire after five minutes and cannot be reused.
- **Receipt Verification**: Credential status changes occur only after the backend confirms a successful transaction targeted at the configured contract and containing the expected event values.
- **QR As Locator**: QR codes contain only opaque URLs (`http://localhost:5173/verify/<id>`); on-chain contract state is always queried dynamically.

---

## License
MIT License. Built as an academic blockchain prototype.
