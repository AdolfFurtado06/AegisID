# AegisID — Project Presentation Slides (Viva / Evaluation)

A 10-slide presentation structure for defending and demonstrating the AegisID mini-project.

---

### Slide 1: Title Slide
* **Title:** AegisID — Blockchain-Based Digital Identity & KYC Verification
* **Subtitle:** A Privacy-Preserving On-Chain Credential Registry
* **Domain:** Blockchain, Cryptography & Decentralized Identity
* **Speaker Notes:**
  > "Good morning/afternoon evaluators. Today I will present AegisID, an intermediate blockchain working prototype designed to solve the data exposure and central point of failure problems in traditional KYC onboarding."

---

### Slide 2: Problem Definition
* **Repetitive Submissions:** Users must submit sensitive identity documents repeatedly to banks, exchanges, and employers.
* **Honeypot of PII:** Centralized KYC databases store unencrypted identity photos and document numbers, creating prime targets for data leaks.
* **Revocation Ambiguity:** Physical or static credentials cannot be instantly verified or revoked in real time without trusting the original issuer.
* **Speaker Notes:**
  > "Traditional KYC is broken in two ways: it exposes too much private data, and it relies on centralized silos that cannot offer tamper-proof, real-time revocation."

---

### Slide 3: Proposed Solution & Core Innovation
* **Decoupled Architecture:** Private documents remain in protected storage off-chain; zero personal details go on the blockchain.
* **Salted Cryptographic Commitments:** Only an opaque 32-byte ID and a salted SHA-256 digest are recorded on-chain.
* **Decentralized Authoritative State:** Third parties verify credential validity directly from smart contracts using QR codes.
* **Speaker Notes:**
  > "AegisID resolves this dilemma by separating verification from data storage. The smart contract acts as an immutable, authoritative truth anchor without ever knowing the user's name or identity number."

---

### Slide 4: System Architecture
* **Frontend:** React + Vite + Tailwind CSS (clean, professional aesthetic, no AI templates).
* **Backend:** Node.js Express API + SQLite + Prisma ORM with role-based JWT authentication.
* **Blockchain:** Solidity `^0.8.24` smart contract running on a local Hardhat EVM node (`chainId: 31337`).
* **Wallet:** MetaMask for client-side signing and Sign-In with Ethereum (SIWE) challenge-response.
* **Speaker Notes:**
  > "The architecture connects a modern React single-page app to an Express backend and a local Ethereum-compatible node, providing a real EVM execution environment."

---

### Slide 5: Privacy Scheme: Salted Commitments
* **Calculation:**
  $$\text{Digest} = \text{SHA-256}(\text{Document File})$$
  $$\text{Commitment} = \text{Keccak-256}(\text{Digest} \parallel \text{":"} \parallel \text{32-byte Random Salt})$$
* **Why Salt?** Prevents pre-image dictionary attacks against structured identity numbers.
* **Verification:** Integrity is checked by re-hashing the document with the stored salt.
* **Speaker Notes:**
  > "Even if an attacker knows the document format, the 32-byte secret salt makes brute-force hashing mathematically infeasible."

---

### Slide 6: Smart Contract Design (`IdentityVerification.sol`)
* **State Mapping:** `mapping(bytes32 => Identity) public identities;`
* **Access Control:** OpenZeppelin `Ownable` ensures only the authorized issuer can issue or revoke credentials.
* **Key Methods:**
  * `issueCredential(bytes32 id, address subject, bytes32 commitment)`
  * `revokeCredential(bytes32 id)`
  * `verifyCredential(bytes32 id)` — Free, public read-only view function.
* **Speaker Notes:**
  > "The smart contract independently enforces permissions. Hiding buttons in the frontend is not security; the EVM contract rejects any unauthorized transaction attempts."

---

### Slide 7: Real-Time Dynamic QR Verification
* **QR Payload:** Encodes *only* `http://localhost:5173/verify/<credentialId>`.
* **Zero Trust in Static Codes:** The QR does not contain a status flag. The web application dynamically queries the blockchain.
* **Revocation Proof:** When an administrator revokes a credential, the exact same QR code immediately transitions from **ACTIVE** to **REVOKED**.
* **Speaker Notes:**
  > "This is our key evaluation moment: scanning the same QR code before and after revocation displays the live state change, proving the blockchain is the single source of truth."

---

### Slide 8: Testing & Verification Results
* **Smart Contract Tests (13 Passing):**
  * Deployer ownership and unauthorized caller reverts (`OwnableUnauthorizedAccount`).
  * Zero-address and zero-commitment validation.
  * Duplicate credential ID collision prevention.
  * Revocation verification and repeat revocation reverts.
* **Backend E2E Tests (9 Passing):**
  * Registration, JWT login, multipart upload, admin approval, commitment generation, public verification.
* **Speaker Notes:**
  > "All 22 automated tests pass cleanly across both Hardhat and the backend integration suite."

---

### Slide 9: Security & Threat Mitigation Summary
* **No PII on Chain:** Solves privacy & GDPR right-to-be-forgotten concerns.
* **SIWE Wallet Proofs:** Single-use nonces prevent replay attacks.
* **Receipt Verification:** Backend validates transaction receipts and parsed event logs directly with the blockchain provider before updating application records.
* **Speaker Notes:**
  > "Every transaction submitted through MetaMask is verified on-chain by the backend before database records are committed."

---

### Slide 10: Conclusion & Future Scope
* **Conclusion:** Successfully built a functional, demonstrable, privacy-preserving KYC prototype on an EVM blockchain.
* **Future Work:**
  * Integration with W3C Verifiable Credentials (VCs) and Decentralized Identifiers (DIDs).
  * Zero-Knowledge Proofs (zk-SNARKs) for selective disclosure (e.g., proving age > 21 without revealing birthdate).
  * Deployment to Sepolia/Polygon testnets.
* **Speaker Notes:**
  > "Thank you. I am now ready to demonstrate the live application and answer your questions."
