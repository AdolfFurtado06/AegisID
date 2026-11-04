import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";
import {
  issueCredentialWithWallet,
  revokeCredentialWithWallet,
} from "../services/blockchain";
import StatusBadge from "../components/feedback/StatusBadge";
import IntegrityModal from "../components/identity/IntegrityModal";
import { useToast } from "../context/ToastContext";
import {
  FileCheck2,
  FileText,
  User,
  ShieldCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  ArrowLeft,
  QrCode,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";

export default function ApplicationReview() {
  const { id } = useParams();
  const toast = useToast();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Rejection modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Revocation modal state
  const [showRevokeModal, setShowRevokeModal] = useState(false);

  // Issuance and Revocation processing states
  const [processingAction, setProcessingAction] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState(null);

  // Document Integrity Modal state
  const [integrityData, setIntegrityData] = useState(null);
  const [showIntegrityModal, setShowIntegrityModal] = useState(false);
  const [verifyingIntegrity, setVerifyingIntegrity] = useState(false);

  const handleVerifyIntegrity = async () => {
    try {
      setVerifyingIntegrity(true);
      const res = await api.get(`/identity/${id}/verify-integrity`);
      setIntegrityData(res.data);
      setShowIntegrityModal(true);
      if (res.data.matches) {
        toast.success("Cryptographic integrity confirmed: 100% on-chain match!");
      } else {
        toast.error("Document commitment does not match on-chain record!");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to verify document integrity.");
    } finally {
      setVerifyingIntegrity(false);
    }
  };

  const fetchApplication = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/kyc/${id}`);
      setApplication(res.data.application);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load application details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplication();
  }, [id]);

  const handleApprove = async () => {
    try {
      setProcessingAction(true);
      setError(null);
      await api.post(`/kyc/${id}/approve`);
      toast.success("Application approved successfully!");
      setActionSuccessMessage("Application approved! You can now issue the on-chain credential.");
      await fetchApplication();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to approve application.");
      setError(err.response?.data?.error || "Failed to approve application.");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    try {
      setProcessingAction(true);
      setError(null);
      await api.post(`/kyc/${id}/reject`, { rejectionReason });
      setShowRejectModal(false);
      setActionSuccessMessage("Application rejected with feedback.");
      await fetchApplication();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reject application.");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleIssueCredential = async () => {
    try {
      setProcessingAction(true);
      setError(null);
      setActionSuccessMessage("Preparing the document commitment...");

      const prepared = await api.get(`/identity/prepare/${id}`);
      let receipt = null;
      if (window.ethereum) {
        setActionSuccessMessage("Confirm the credential issuance in MetaMask...");
        receipt = await issueCredentialWithWallet(
          prepared.data.contractAddress,
          prepared.data.credentialId,
          prepared.data.subjectAddress,
          prepared.data.documentCommitment
        );
      } else {
        setActionSuccessMessage("Submitting through the configured backend issuer...");
      }

      const res = await api.post(`/identity/${id}/issue`, receipt
        ? {
            credentialId: prepared.data.credentialId,
            salt: prepared.data.salt,
            documentCommitment: prepared.data.documentCommitment,
            transactionHash: receipt.transactionHash,
            blockNumber: receipt.blockNumber,
          }
        : {});
      toast.success("Credential successfully issued on blockchain!");
      setActionSuccessMessage(
        `Credential successfully issued on-chain! Tx: ${res.data.transactionHash}`
      );
      await fetchApplication();
    } catch (err) {
      toast.error(err.response?.data?.details || err.response?.data?.error || "Failed to issue credential on blockchain.");
      setError(
        err.response?.data?.details ||
          err.response?.data?.error ||
          "Failed to issue credential on blockchain."
      );
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRevokeCredential = async () => {
    if (!application?.credential?.id) return;
    try {
      setProcessingAction(true);
      setError(null);
      setActionSuccessMessage("Preparing credential revocation...");
      let receipt = null;
      if (window.ethereum) {
        const health = await api.get("/health");
        setActionSuccessMessage("Confirm the credential revocation in MetaMask...");
        receipt = await revokeCredentialWithWallet(
          health.data.contractAddress,
          application.credential.id
        );
      } else {
        setActionSuccessMessage("Submitting through the configured backend issuer...");
      }

      const res = await api.post(`/identity/${application.credential.id}/revoke`, receipt
        ? { transactionHash: receipt.transactionHash, blockNumber: receipt.blockNumber }
        : {});
      setShowRevokeModal(false);
      toast.success("Credential revoked on-chain!");
      setActionSuccessMessage(
        `Credential revoked on-chain! Tx: ${res.data.transactionHash}`
      );
      await fetchApplication();
    } catch (err) {
      toast.error(err.response?.data?.details || err.response?.data?.error || "Failed to revoke credential.");
      setError(
        err.response?.data?.details ||
          err.response?.data?.error ||
          "Failed to revoke credential."
      );
    } finally {
      setProcessingAction(false);
    }
  };

  const downloadFileProtected = async () => {
    try {
      const token = localStorage.getItem("chainkyc_token");
      const res = await fetch(`http://localhost:5000/api/kyc/${id}/document`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Could not download file");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Application_${id}_document`;
      a.click();
    } catch (err) {
      alert("Error downloading document: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-xs text-textSecondary">
        Loading application file and records...
      </div>
    );
  }

  if (error && !application) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
        <h2 className="text-xl font-bold text-textPrimary">{error}</h2>
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-xs text-forest hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Queue
        </Link>
      </div>
    );
  }

  const { user, credential } = application;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back button */}
      <div>
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-textSecondary hover:text-textPrimary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Applications Queue
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-borderSoft pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-textPrimary tracking-tight">
            Application Review & Credential Management
          </h1>
          <p className="text-xs text-textSecondary mt-1">
            Application ID: <span className="font-mono text-textPrimary">{application.id}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={application.status} />
          {credential && <StatusBadge status={credential.status} />}
        </div>
      </div>

      {actionSuccessMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-btn flex items-center gap-2 text-xs text-emerald-800 font-medium">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-btn flex items-center gap-2 text-xs text-rose-800">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Applicant Details */}
        <div className="bg-surface border border-borderSoft rounded-card p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-textPrimary flex items-center gap-2 border-b border-borderSoft pb-2">
            <User className="w-4 h-4 text-forest" />
            Applicant Information
          </h2>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-borderSoft">
              <span className="text-textSecondary">Full Name</span>
              <span className="font-semibold text-textPrimary">{user.name}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-borderSoft">
              <span className="text-textSecondary">Email Address</span>
              <span className="font-mono text-textPrimary">{user.email}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-borderSoft">
              <span className="text-textSecondary">Wallet Address</span>
              <span className="font-mono text-textPrimary text-[11px] truncate max-w-[200px]" title={user.walletAddress}>
                {user.walletAddress || "Not linked"}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-borderSoft">
              <span className="text-textSecondary">Submitted At</span>
              <span className="text-textPrimary">{new Date(application.submittedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Submitted Mock Document */}
        <div className="bg-surface border border-borderSoft rounded-card p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-textPrimary flex items-center gap-2 border-b border-borderSoft pb-2">
            <FileText className="w-4 h-4 text-tealAccent" />
            Mock Identity Document
          </h2>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-borderSoft">
              <span className="text-textSecondary">Document Type</span>
              <span className="font-semibold text-textPrimary">{application.documentType}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-borderSoft">
              <span className="text-textSecondary">Mock ID Number</span>
              <span className="font-mono text-textPrimary">{application.documentNumber}</span>
            </div>
            <div className="pt-2">
              <button
                onClick={downloadFileProtected}
                className="w-full py-2 px-3 text-xs font-semibold bg-bgMain border border-borderSoft hover:bg-gray-100 rounded-btn text-textPrimary flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-forest" />
                Download Protected Synthetic Document
              </button>
              {application.credential && (
                <button
                  onClick={handleVerifyIntegrity}
                  disabled={verifyingIntegrity}
                  className="w-full mt-2 py-2 px-3 text-xs font-semibold bg-forest-light text-forest border border-emerald-300 hover:bg-emerald-100 rounded-btn flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-forest" />
                  {verifyingIntegrity ? "Verifying On-Chain Proof..." : "Verify Document Integrity (On-Chain)"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Admin Action Decision Desk */}
      <div className="bg-surface border border-borderSoft rounded-card p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-textPrimary flex items-center gap-2 border-b border-borderSoft pb-2">
          <ShieldCheck className="w-4 h-4 text-forest" />
          Administrator Authorization & On-Chain Issuance
        </h2>

        {application.status === "PENDING" && (
          <div className="space-y-4">
            <p className="text-xs text-textSecondary">
              Inspect the synthetic document above. If the simulated criteria are met, approve the application to enable smart-contract issuance.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleApprove}
                disabled={processingAction}
                className="py-2 px-4 bg-forest text-white text-xs font-semibold rounded-btn hover:bg-forest-hover shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                Approve Application
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={processingAction}
                className="py-2 px-4 bg-rose-50 text-rose-700 border border-rose-300 text-xs font-semibold rounded-btn hover:bg-rose-100 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                Reject with Reason
              </button>
            </div>
          </div>
        )}

        {application.status === "APPROVED" && (!credential || credential.status !== "ACTIVE") && (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-btn text-xs text-emerald-800">
              This application is approved. You can now execute the on-chain transaction to record the salted cryptographic commitment on the local Ethereum network.
            </div>
            <button
              onClick={handleIssueCredential}
              disabled={processingAction}
              className="py-2.5 px-5 bg-forest text-white text-xs font-semibold rounded-btn hover:bg-forest-hover shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              {processingAction ? "Submitting Transaction to Blockchain..." : "Issue Credential on Blockchain"}
            </button>
          </div>
        )}

        {credential && credential.status === "ACTIVE" && (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-btn text-xs text-emerald-800 flex justify-between items-center">
              <div>
                <span className="font-bold block">On-Chain Credential is ACTIVE</span>
                <span className="font-mono text-[11px] block mt-0.5">
                  ID: {credential.id} &bull; Tx: {credential.transactionHash}
                </span>
              </div>
              <Link
                to={`/verify/${credential.id}`}
                target="_blank"
                className="px-3 py-1 bg-white border border-emerald-300 text-emerald-800 font-semibold rounded-btn text-[11px] hover:bg-emerald-50 flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                Verify
              </Link>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowRevokeModal(true)}
                disabled={processingAction}
                className="py-2 px-4 bg-rose-600 text-white text-xs font-semibold rounded-btn hover:bg-rose-700 shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <ShieldAlert className="w-4 h-4" />
                Revoke On-Chain Credential
              </button>
              <p className="text-[11px] text-textSecondary mt-1">
                Submits a revocation transaction directly to the smart contract. The public QR code will immediately update to reflect REVOKED status.
              </p>
            </div>
          </div>
        )}

        {credential && credential.status === "REVOKED" && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-btn text-xs text-rose-800 space-y-1">
            <span className="font-bold">Credential Revoked</span>
            <p>
              This credential was permanently revoked on-chain at{" "}
              {new Date(credential.revokedAt).toLocaleString()}.
            </p>
            {credential.revocationTxHash && (
              <p className="font-mono text-[11px]">
                Revocation Tx: {credential.revocationTxHash}
              </p>
            )}
          </div>
        )}

        {application.status === "REJECTED" && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-btn text-xs text-rose-800 space-y-1">
            <span className="font-bold">Application Rejected</span>
            <p>Reason: {application.rejectionReason || "None specified"}</p>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-card max-w-md w-full p-6 shadow-xl border border-borderSoft space-y-4">
            <h3 className="text-base font-bold text-textPrimary">Reject Application</h3>
            <p className="text-xs text-textSecondary">
              Provide feedback explaining why this mock application was rejected:
            </p>
            <textarea
              rows="3"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Document image is illegible or mock ID numbers do not match."
              className="w-full p-3 text-xs rounded-btn border border-borderSoft bg-bgMain focus:outline-none focus:ring-1 focus:ring-forest text-textPrimary"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="py-1.5 px-3 text-xs font-medium border border-borderSoft rounded-btn hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={processingAction}
                className="py-1.5 px-4 bg-rose-600 text-white text-xs font-semibold rounded-btn hover:bg-rose-700 disabled:opacity-50"
              >
                {processingAction ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Modal */}
      {showRevokeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-card max-w-md w-full p-6 shadow-xl border border-borderSoft space-y-4">
            <div className="flex items-center gap-2 text-rose-700">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="text-base font-bold">Confirm Credential Revocation</h3>
            </div>
            <p className="text-xs text-textSecondary leading-relaxed">
              Are you sure you want to revoke credential{" "}
              <span className="font-mono text-textPrimary font-semibold">
                {credential?.id.substring(0, 16)}...
              </span>
              ? This transaction will be executed directly on the local smart contract and cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRevokeModal(false)}
                className="py-1.5 px-3 text-xs font-medium border border-borderSoft rounded-btn hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevokeCredential}
                disabled={processingAction}
                className="py-1.5 px-4 bg-rose-600 text-white text-xs font-semibold rounded-btn hover:bg-rose-700 disabled:opacity-50"
              >
                {processingAction ? "Submitting Revocation Tx..." : "Revoke on Blockchain"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Document Integrity Proof Modal */}
      <IntegrityModal
        isOpen={showIntegrityModal}
        onClose={() => setShowIntegrityModal(false)}
        data={integrityData}
      />
    </div>
  );
}
