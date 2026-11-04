# ChainKYC - REST API Specification

Base URL: `http://localhost:5000/api`

## Authentication (`/api/auth`)

### 1. Register User
- **POST** `/api/auth/register`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "password": "Password123"
  }
  ```
- **Response** `201 Created`:
  ```json
  {
    "message": "Registration successful.",
    "token": "eyJhbGciOi...",
    "user": { "id": "...", "name": "...", "email": "...", "role": "USER" }
  }
  ```

### 2. Login
- **POST** `/api/auth/login`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "admin@chainkyc.local",
    "password": "Admin@ChainKYC2026"
  }
  ```
- **Response** `200 OK`:
  ```json
  {
    "message": "Login successful.",
    "token": "eyJhbGciOi...",
    "user": { "id": "...", "name": "...", "email": "...", "role": "ADMIN" }
  }
  ```

### 3. Current User Profile
- **GET** `/api/auth/me`
- **Access**: Authenticated (`Bearer <token>`)

### 4. Create Wallet Challenge
- **POST** `/api/auth/wallet/challenge`
- **Access**: Public
- **Request Body**: `{ "walletAddress": "0x..." }`
- **Returns**: A short-lived message and one-time nonce for MetaMask signing.

### 5. Wallet Login
- **POST** `/api/auth/wallet/login`
- **Access**: Public
- **Request Body**: `{ "walletAddress": "0x...", "nonce": "...", "signature": "0x..." }`
- **Action**: Recovers the signer from the challenge signature and creates a JWT for the linked account.

### 6. Link Wallet
- **POST** `/api/auth/wallet/link`
- **Access**: Authenticated (`Bearer <token>`)
- **Request Body**: `{ "walletAddress": "0x...", "nonce": "...", "signature": "0x..." }`
- **Action**: Verifies wallet ownership before linking the address to the current account.

---

## KYC Applications (`/api/kyc`)

### 1. Submit Application
- **POST** `/api/kyc/submit`
- **Access**: User (`Bearer <token>`)
- **Headers**: `Content-Type: multipart/form-data`
- **Form Fields**:
  - `documentType`: `MOCK_ID` | `MOCK_PAN` | `PASSPORT_SAMPLE`
  - `documentNumber`: Synthetic identity string
  - `document`: File (JPG, PNG, or PDF; max 5MB)

### 2. My KYC Status
- **GET** `/api/kyc/status`
- **Access**: User (`Bearer <token>`)

### 3. List All Applications
- **GET** `/api/kyc/applications?status=PENDING&search=alice`
- **Access**: Admin (`Bearer <token>`)

### 4. Application Details
- **GET** `/api/kyc/:id`
- **Access**: Owner or Admin (`Bearer <token>`)

### 5. Download Protected Document
- **GET** `/api/kyc/:id/document`
- **Access**: Owner or Admin (`Bearer <token>`)

### 6. Approve Application
- **POST** `/api/kyc/:id/approve`
- **Access**: Admin (`Bearer <token>`)

### 7. Reject Application
- **POST** `/api/kyc/:id/reject`
- **Access**: Admin (`Bearer <token>`)
- **Request Body**: `{ "rejectionReason": "..." }`

---

## Identity & Blockchain (`/api/identity`)

### 1. My Credential
- **GET** `/api/identity/my`
- **Access**: User (`Bearer <token>`)
- **Returns**: Credential metadata, verification URL, and QR base64 data URL.

### 2. Prepare Issuance Parameters
- **GET** `/api/identity/prepare/:applicationId`
- **Access**: Admin (`Bearer <token>`)

### 3. Issue Credential On-Chain
- **POST** `/api/identity/:applicationId/issue`
- **Access**: Admin (`Bearer <token>`)
- **Action**: MetaMask or the backend issuer executes `issueCredential`. The backend verifies the receipt, destination contract, success status, and `CredentialIssued` event before storing the transaction hash and block number.

### 4. Revoke Credential On-Chain
- **POST** `/api/identity/:credentialId/revoke`
- **Access**: Admin (`Bearer <token>`)
- **Action**: MetaMask or the backend issuer executes `revokeCredential`. The backend verifies the receipt and `CredentialRevoked` event before updating status to `REVOKED`.

### 5. Public Verification
- **GET** `/api/identity/verify/:credentialId`
- **Access**: Public (No authentication required)
- **Action**: Queries live Ethereum contract `verifyCredential()` and returns `ACTIVE`, `REVOKED`, `NOT_FOUND`, or `UNAVAILABLE`.

### 6. Cryptographic Document Integrity Check
- **GET** `/api/identity/:applicationId/verify-integrity`
- **Access**: Applicant or Admin (`Bearer <token>`)
- **Action**: Recomputes SHA-256 of the stored document and hashes it with the secret salt. Compares against the live on-chain smart contract commitment and returns step-by-step cryptographic proof data.

### 7. W3C Verifiable Credential Export
- **GET** `/api/identity/:credentialId/w3c`
- **Access**: Public
- **Returns**: W3C-compliant Verifiable Credential JSON-LD payload (`@context: ["https://www.w3.org/2018/credentials/v1"]`) containing Ethereum smart contract proof metadata.

### 8. Transaction & Audit History
- **GET** `/api/identity/history`
- **Access**: Authenticated (`Bearer <token>`)
