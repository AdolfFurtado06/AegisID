# Blockchain-Based KYC and Digital Identity Verification (AegisID)

## Academic Mini-Project Report

**Project Title:** Blockchain-Based KYC and Digital Identity Verification  
**Project Name:** AegisID  
**Author:** Adolf Furtado  
**Technologies:** Solidity (^0.8.24), Hardhat, OpenZeppelin, React (Vite), Tailwind CSS, Node.js, Express, SQLite, Prisma ORM, Ethers.js v6  

---

## 1. Abstract
Traditional Know-Your-Customer (KYC) onboarding processes suffer from redundant verification cycles, single points of failure in centralized storage, and widespread exposure of personally identifiable information (PII). This project proposes and implements **AegisID**, a privacy-conscious, decentralized digital identity verification system. Users submit mock identity documents through a web application. Administrators review the submission and issue digital credentials registered as cryptographic commitments on an Ethereum-compatible smart contract (`IdentityVerification.sol`). Third-party verifiers scan a QR code to inspect the authoritative validity status (`ACTIVE`, `REVOKED`, `NOT FOUND`) directly from the smart contract without accessing private personal data. The system features cryptographic Sign-In with Ethereum (SIWE) wallet authentication, salted document commitments, automated on-chain receipt verification, and authoritative revocation.

---

## 2. Introduction & Problem Statement
### 2.1 The Problem
In modern financial and regulatory services, identity verification is repeated for every institution. This presents three severe challenges:
1. **Excessive Data Exposure:** Users repeatedly upload copies of national identity cards, passports, and utility bills, expanding the attack surface for identity theft.
2. **Centralized Vulnerabilities:** Centralized credential registries represent single points of compromise for unauthorized credential issuance or silent revocation tampering.
3. **Static Credentials:** Physical or paper-based credentials cannot be reliably revoked in real time without trusting an unverified intermediary.

### 2.2 Proposed Solution
AegisID introduces a decoupled architecture:
* **Private Off-Chain Storage:** Mock documents and personal profiles are retained off-chain in protected storage with strict access controls.
* **On-Chain Privacy Commitment:** The smart contract stores only an opaque 32-byte credential identifier and a salted document digest. Zero PII is committed to the blockchain.
* **Dynamic Locator QR:** The QR code encodes only a verification URL pointing to the credential identifier. When scanned, verification queries live contract state on the blockchain, ensuring that revocation is authoritative and instantaneous.

---

## 3. System Architecture & Privacy Scheme

```
+-------------------------------------------------------------+
|                      React + Vite UI                        |
|  - User Dashboard (KYC Stepper & Credential QR)             |
|  - Admin Review Desk (Document Inspection & Dual Issuance)  |
|  - Public Verifier (/verify/:id + Webcam QR Scanner)        |
+------------------------------+------------------------------+
                               | REST API (JWT Authenticated)
                               v
+-------------------------------------------------------------+
|                    Express.js Backend                       |
|  - Input Validation (Zod) & Multer Protected Uploads        |
|  - Salted Commitment Engine (SHA-256 + 32B Random Salt)     |
|  - SIWE Cryptographic Wallet Proof Verification             |
|  - On-Chain Receipt & Event Log Validator                   |
+--------------+-------------------------------+--------------+
               |                               |
               v                               v
+-----------------------------+ +-----------------------------+
|    SQLite + Prisma ORM      | |    Private Storage Path     |
|  - User Credentials & Roles | |  - /storage/uploads/        |
|  - Application Metadata     | |  - Protected Document Files |
|  - Off-Chain Secret Salts   | |                             |
+-----------------------------+ +-----------------------------+
               |
               v JSON-RPC (Chain ID: 31337)
+-------------------------------------------------------------+
|                 Hardhat Local EVM Node                      |
|  - IdentityVerification.sol (Solidity ^0.8.24)              |
|  - issueCredential(bytes32 id, address subject, bytes32)    |
|  - revokeCredential(bytes32 id)                             |
|  - verifyCredential(bytes32 id) [Public View]               |
+-------------------------------------------------------------+
```

### 3.1 Salted Commitment Scheme
To protect against rainbow-table and dictionary pre-image attacks on structured identity documents, the system uses a two-phase hashing scheme:
$$\text{FileDigest} = \text{SHA-256}(\text{DocumentBinary})$$
$$\text{Salt} \leftarrow \text{SecureRandom}(32\text{ bytes})$$
$$\text{Commitment} = \text{Keccak-256}(\text{FileDigest} \parallel \text{":"} \parallel \text{Salt})$$

Only $\text{Commitment}$ is recorded on-chain. The salt is preserved off-chain in the secure database. Document integrity can be proven at any time by recomputing the digest with the retained salt and comparing it against the smart contract record.

---

## 4. Smart Contract Specification

The smart contract [`IdentityVerification.sol`](file:///C:/Users/Adolf%20Furtado/OneDrive/Desktop/blockchain-kyc/blockchain/contracts/IdentityVerification.sol) inherits OpenZeppelin's `Ownable` contract.

### Data Structure
```solidity
struct Identity {
    address subject;
    address issuer;
    bytes32 documentCommitment;
    uint256 issuedAt;
    uint256 revokedAt;
    bool exists;
    bool revoked;
}
mapping(bytes32 => Identity) public identities;
```

### Core Functions
1. `issueCredential(bytes32 credentialId, address subject, bytes32 documentCommitment) external onlyOwner`:
   * Validates non-zero inputs.
   * Ensures uniqueness (`!identities[credentialId].exists`).
   * Records timestamp and emits `CredentialIssued`.
2. `revokeCredential(bytes32 credentialId) external onlyOwner`:
   * Validates credential existence and non-revoked status.
   * Sets `revoked = true`, records `revokedAt`, and emits `CredentialRevoked`.
3. `verifyCredential(bytes32 credentialId) external view returns (bool exists, bool active, address subject, address issuer, uint256 issuedAt, uint256 revokedAt)`:
   * Read-only view function queryable by any third party without gas expenditure.

---

## 5. Security & Threat Analysis

| Threat Vector | Mitigation Strategy |
| :--- | :--- |
| **On-Chain PII Leakage** | No personal data (names, dates of birth, numbers) is ever sent to the EVM. Only salted cryptographic digests are stored. |
| **Unauthorized Issuance** | `onlyOwner` modifier enforces that only the authorized issuer wallet can execute `issueCredential`. |
| **Static QR Tampering** | QR codes never encode a status flag. They contain only a resource locator URL. The frontend dynamically queries the smart contract. |
| **Replay & Sybil Attacks** | Single-use cryptographic challenge nonces with 5-minute expiration windows for wallet authentication (`WalletChallenge`). |
| **Transaction Spoofing** | The backend verifies transaction receipts directly against the blockchain provider, checking `status == 1`, matching contract target, and event log parameters before recording database updates. |

---

## 6. Testing & Evaluation

### 6.1 Smart Contract Unit Tests (Hardhat / Chai)
The contract test suite [`IdentityVerification.test.js`](file:///C:/Users/Adolf%20Furtado/OneDrive/Desktop/blockchain-kyc/blockchain/test/IdentityVerification.test.js) verifies 13 critical scenarios:
1. Deployer is assigned initial owner.
2. Owner can issue valid credential and emit `CredentialIssued`.
3. Non-owner cannot issue (`OwnableUnauthorizedAccount` revert).
4. Rejection of zero-address subjects.
5. Rejection of empty credential IDs (`bytes32(0)`).
6. Rejection of empty document commitments.
7. Rejection of duplicate credential IDs.
8. Owner can revoke active credentials and emit `CredentialRevoked`.
9. Non-owner cannot revoke.
10. Prevention of repeat revocation.
11. Rejection of revoking non-existent credentials.
12. Verification reports `exists == false` for unissued IDs.
13. `getCredential` retrieves full identity metadata.

**Result:** `13 passing (1s)`

### 6.2 Backend E2E Integration Suite
The automated suite [`integration.test.js`](file:///C:/Users/Adolf%20Furtado/OneDrive/Desktop/blockchain-kyc/backend/test/integration.test.js) executes the full user-to-admin lifecycle:
* User registration and password hashing verification.
* JWT authentication and role enforcement.
* Multipart synthetic document upload and storage.
* Admin application queue inspection and approval.
* Cryptographic commitment preparation.
* Public verification status checks.
* Activity audit trail logging.

**Result:** `9 passing (750ms)`

---

## 7. Limitations & Future Scope
* **Prototype Environment:** Currently runs on a local Hardhat EVM node (`chainId: 31337`) using synthetic mock identity documents.
* **Future W3C Standard Integration:** Future extensions can package commitments into standard W3C Verifiable Credentials (VCs) and Decentralized Identifiers (DIDs).
* **Zero-Knowledge Proofs:** Integration of zk-SNARKs (e.g. Circom / snarkjs) for selective disclosure (e.g., proving age > 21 without revealing birthdate).

---

## 8. Conclusion
AegisID demonstrates a functional, privacy-first digital identity verification framework. By marrying off-chain synthetic document inspection with on-chain cryptographic commitments and live QR verification, the system resolves the trade-off between user privacy and decentralized verifiable authenticity.
