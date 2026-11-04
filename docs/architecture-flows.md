# AegisID — System Sequence Diagrams & Workflows

## 1. KYC Submission & Document Processing Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Applicant (Web Browser)
    participant API as Express Backend
    participant FS as Private Storage
    participant DB as SQLite / Prisma

    User->>API: POST /api/kyc/submit (documentType, mockNumber, file)
    Note over API: Zod validation & Multer size/type filter
    API->>FS: Save binary to storage/uploads/kyc_...png
    API->>DB: INSERT KycApplication (status: PENDING)
    API-->>User: 201 Created (Application ID, Status: PENDING)
```

---

## 2. Admin Review & Dual-Mode On-Chain Issuance Flow

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Administrator
    participant UI as React UI (Admin Review)
    participant API as Express Backend
    participant SC as Smart Contract (Hardhat)
    participant DB as SQLite / Prisma

    Admin->>UI: Click "Approve Application"
    UI->>API: POST /api/kyc/:id/approve
    API->>DB: UPDATE KycApplication (status: APPROVED)
    API-->>UI: 200 OK

    Admin->>UI: Click "Issue Credential on Blockchain"
    UI->>API: GET /api/identity/prepare/:id
    Note over API: Computes sha256(file), generates salt, computes keccak256 commitment
    API-->>UI: 200 OK (credentialId, documentCommitment, salt)

    alt MetaMask Detected
        UI->>SC: issueCredential(credentialId, subject, commitment) via MetaMask
        SC-->>UI: Transaction Receipt (txHash, blockNumber)
        UI->>API: POST /api/identity/:id/issue (receipt + commitment)
    else Fallback to Backend Issuer Key
        UI->>API: POST /api/identity/:id/issue
        API->>SC: issueCredential(credentialId, subject, commitment)
        SC-->>API: Transaction Receipt
    end

    Note over API: verifyIssueReceipt checks receipt status == 1 & emits CredentialIssued event
    API->>DB: INSERT IdentityCredential (status: ACTIVE)
    API->>DB: INSERT VerificationLog (action: ISSUED)
    API-->>UI: 201 Created (Active Credential, QR Code)
```

---

## 3. Public QR Verification & Revocation Flow

```mermaid
sequenceDiagram
    autonumber
    actor Verifier as Public Verifier (Web / Camera)
    participant QR as QR Code / Camera
    participant UI as React UI (/verify/:id)
    participant API as Express Public Endpoint
    participant SC as Smart Contract (Hardhat)

    Verifier->>QR: Scan QR code with webcam
    QR-->>UI: Resolves URL http://localhost:5173/verify/<credentialId>
    UI->>API: GET /api/identity/verify/:credentialId
    API->>SC: verifyCredential(credentialId) [view method]
    SC-->>API: (exists=true, active=true, subject, issuer, issuedAt, revokedAt=0)
    API-->>UI: 200 OK (status: "ACTIVE", onChain metadata)
    UI-->>Verifier: Displays Green ACTIVE Verified Badge

    Note over Verifier: Later, Admin triggers on-chain revocation...

    Verifier->>UI: Refresh or Re-scan QR
    UI->>API: GET /api/identity/verify/:credentialId
    API->>SC: verifyCredential(credentialId) [view method]
    SC-->>API: (exists=true, active=false, subject, issuer, issuedAt, revokedAt=171...)
    API-->>UI: 200 OK (status: "REVOKED", onChain metadata)
    UI-->>Verifier: Displays Red REVOKED Badge
```
