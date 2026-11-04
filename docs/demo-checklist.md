# AegisID - Live Demonstration Checklist & Evaluation Script

This script walks through the end-to-end verification cycle using synthetic data.

## Pre-Demo Setup
1. **Terminal 1 (Blockchain Node)**:
   ```bash
   cd blockchain
   npx hardhat node
   ```
2. **Terminal 2 (Deploy Contract)**:
   ```bash
   cd blockchain
   npx hardhat run scripts/deploy.js --network localhost
   ```
3. **Terminal 3 (Backend API)**:
   ```bash
   cd backend
   npm run dev
   ```
4. **Terminal 4 (Frontend UI)**:
   ```bash
   cd frontend
   npm run dev
   ```

---

## 14-Step Demonstration Workflow

1. **Open Application**: Navigate to `http://localhost:5173`.
2. **Register New User**:
   - Click "Register".
   - Enter Name: `Bob Miller`, Email: `bob@example.com`, Password: `Password123!`.
   - Submit and observe redirection to User Dashboard.
3. **Submit Synthetic KYC**:
   - Click "Submit KYC Application".
   - Select "Mock Government ID Card".
   - Enter mock ID: `MOCK-BOB-9021`.
   - Upload `test-documents/sample_mock_id.png` (or PDF).
   - Click "Submit Application for Review".
4. **Inspect User Dashboard**:
   - Status badge shows `PENDING REVIEW`.
   - Stepper indicates Stage 2 complete, Stage 3 in progress.
5. **Log In as Administrator**:
   - Click Logout.
   - Click "Sign In", click "Fill Admin Demo" (`admin@chainkyc.local` / `Admin@ChainKYC2026`).
    - Click "Sign In".
    - Import Hardhat Account #0 into MetaMask and connect it to chain ID `31337` if you want to sign issuance and revocation in the wallet.
6. **Review Application**:
   - In Admin Review Queue, locate Bob's application.
   - Click "Inspect & Review".
   - Click "Download Protected Synthetic Document" to verify mock file access.
   - Click "Approve Application".
7. **Issue On-Chain Credential**:
    - Click "Issue Credential on Blockchain".
    - Confirm the MetaMask transaction when available; otherwise the configured local backend issuer submits it.
    - Observe receipt verification, Hardhat block confirmation, and transaction hash.
   - Status badge updates to `ACTIVE`.
8. **View Credential as User**:
   - Log out of Admin, log in as Bob (`bob@example.com` / `Password123!`).
   - Navigate to "My Credential".
   - Observe generated QR Code, Document Commitment hash, and transaction details.
   - Click "Copy Verification Link".
9. **Public Verification (Before Revocation)**:
   - Open verification link or paste into "Verify QR" search bar.
   - Result clearly displays `ACTIVE` with green checkmark and on-chain timestamp.
10. **Revoke Credential**:
    - Log back in as Admin.
    - Open Bob's application review page.
    - Click "Revoke On-Chain Credential" and confirm in modal.
    - Confirm the MetaMask revocation transaction when available and observe receipt confirmation.
11. **Public Verification (After Revocation)**:
    - Reload or re-scan the exact same QR code / URL.
    - Result now clearly reports `REVOKED` with red status indicator and revocation timestamp.
12. **Audit History Check**:
    - Click "Blockchain History".
    - Observe the full timeline of `ISSUED`, `VERIFIED`, and `REVOKED` events with verifiable hashes.
