# AegisID — Database Schema & Entity-Relationship Model

The AegisID backend persistence layer is implemented using SQLite and Prisma ORM.

## Entity-Relationship Diagram

```mermaid
erDiagram
    User ||--o{ KycApplication : "UserApplications"
    User ||--o{ KycApplication : "AdminReviews"
    User ||--o{ IdentityCredential : "owns"
    User ||--o{ VerificationLog : "performs"
    User ||--o{ WalletChallenge : "challenges"

    KycApplication ||--o| IdentityCredential : "produces"
    IdentityCredential ||--o{ VerificationLog : "records"

    User {
        String id PK
        String name
        String email UK
        String passwordHash
        String role "USER or ADMIN"
        String walletAddress UK
        DateTime createdAt
        DateTime updatedAt
    }

    KycApplication {
        String id PK
        String userId FK
        String documentType "MOCK_ID | MOCK_PAN | PASSPORT_SAMPLE"
        String documentNumber "Private synthetic number"
        String documentPath "Protected storage path"
        String status "PENDING | APPROVED | REJECTED"
        DateTime submittedAt
        DateTime reviewedAt
        String reviewedBy FK
        String rejectionReason
    }

    IdentityCredential {
        String id PK "Opaque bytes32 credential ID"
        String applicationId FK,UK
        String userId FK
        String credentialHash "Salted document commitment (bytes32)"
        String salt "Off-chain secret 32-byte salt"
        String transactionHash "Issuance Tx"
        Int blockNumber "Block height"
        String status "ACTIVE | REVOKED"
        DateTime issuedAt
        DateTime revokedAt
        String revocationTxHash
        DateTime createdAt
        DateTime updatedAt
    }

    VerificationLog {
        String id PK
        String credentialId FK
        String action "ISSUED | VERIFIED | REVOKED"
        String transactionHash
        String performedBy FK
        DateTime createdAt
    }

    WalletChallenge {
        String id PK
        String address
        String nonce UK
        String message
        DateTime expiresAt
        DateTime usedAt
        DateTime createdAt
    }
```

## Privacy & Security Boundaries
* **Passphrases**: Stored only as one-way bcrypt salted hashes (cost factor 10).
* **Document Files**: Uploaded synthetic documents are stored in `/storage/uploads/` outside the web root, accessible only through authenticated API streams checked for applicant or administrator ownership.
* **Document Commitments**: The `IdentityCredential.credentialHash` is calculated as `keccak256(sha256(file) + ":" + salt)`. Only this hash is sent to the blockchain.
* **Zero PII on Ledger**: The smart contract never receives or stores names, emails, raw document numbers, or file contents.
