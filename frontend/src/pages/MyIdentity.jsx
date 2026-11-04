import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import StatusBadge from "../components/feedback/StatusBadge";
import IntegrityModal from "../components/identity/IntegrityModal";
import { useToast } from "../context/ToastContext";
import {
  ShieldCheck,
  QrCode,
  Download,
  Copy,
  Check,
  ExternalLink,
  Clock,
  KeyRound,
  FileText,
  AlertTriangle,
  FileJson,
  Binary,
} from "lucide-react";

export default function MyIdentity() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [integrityData, setIntegrityData] = useState(null);
  const [showIntegrityModal, setShowIntegrityModal] = useState(false);
  const [verifyingIntegrity, setVerifyingIntegrity] = useState(false);
  const toast = useToast();

  const handleVerifyIntegrity = async () => {
    if (!data?.credential?.application?.id) return;
    try {
      setVerifyingIntegrity(true);
      const res = await api.get(`/identity/${data.credential.application.id}/verify-integrity`);
      setIntegrityData(res.data);
      setShowIntegrityModal(true);
      if (res.data.matches) {
        toast.success("Cryptographic integrity confirmed: 100% on-chain match!");
      } else {
        toast.error("Document commitment mismatch!");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to verify document integrity.");
    } finally {
      setVerifyingIntegrity(false);
    }
  };

  const handleExportW3C = async () => {
    if (!data?.credential?.id) return;
    try {
      const res = await api.get(`/identity/${data.credential.id}/w3c`);
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `W3C_Credential_${data.credential.id.substring(0, 10)}.json`;
      a.click();
      toast.success("W3C Verifiable Credential JSON exported!");
    } catch (err) {
      toast.error("Failed to export W3C credential.");
    }
  };

  useEffect(() => {
    async function fetchCredential() {
      try {
        const res = await api.get("/identity/my");
        setData(res.data);
      } catch (err) {
        console.error("Failed to fetch credential:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCredential();
  }, []);

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === "id") {
      setCopiedId(true);
      toast.success("Credential ID copied to clipboard!");
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedUrl(true);
      toast.success("Verification link copied to clipboard!");
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const downloadQr = () => {
    if (!data?.qrDataUrl) return;
    const a = document.createElement("a");
    a.href = data.qrDataUrl;
    a.download = `ChainKYC_${data.credential.id.substring(0, 10)}.png`;
    a.click();
    toast.info("Downloading QR code image...");
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-xs text-textSecondary">
        Loading identity credential from blockchain registry...
      </div>
    );
  }

  if (!data?.credential) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-btn bg-amber-50 text-amber-700 mx-auto flex items-center justify-center">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-textPrimary">No Issued Credential Found</h2>
        <p className="text-xs text-textSecondary max-w-md mx-auto">
          You do not have an active blockchain credential yet. Please submit your synthetic KYC application or wait for an administrator to approve it.
        </p>
        <Link
          to="/kyc/submit"
          className="inline-flex items-center gap-2 px-4 py-2 bg-forest text-white text-xs font-semibold rounded-btn hover:bg-forest-hover shadow-xs transition-colors"
        >
          Submit KYC Application
        </Link>
      </div>
    );
  }

  const { credential, verificationUrl, qrDataUrl } = data;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-textPrimary tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-forest" />
            My Digital Identity Credential
          </h1>
          <p className="text-xs text-textSecondary mt-1">
            Anchored to the local Ethereum blockchain via smart contract commitment
          </p>
        </div>
        <StatusBadge status={credential.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: QR Code Showcase */}
        <div className="bg-surface border border-borderSoft rounded-card p-6 shadow-xs flex flex-col items-center text-center">
          <h2 className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-4">
            Public Verification QR
          </h2>

          <div className="p-3 bg-white border border-borderSoft rounded-btn shadow-xs mb-4">
            {qrDataUrl && (
              <img
                src={qrDataUrl}
                alt="Credential Verification QR Code"
                className="w-48 h-48 object-contain"
              />
            )}
          </div>

          <p className="text-[11px] text-textSecondary mb-5 max-w-[220px]">
            Contains only the verification URL. Points to authoritative smart contract status.
          </p>

          <div className="flex flex-col gap-2 w-full">
            <button
              onClick={downloadQr}
              className="w-full py-2 px-3 text-xs font-semibold bg-forest text-white rounded-btn hover:bg-forest-hover shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              Download QR Image
            </button>
            <button
              onClick={() => copyToClipboard(verificationUrl, "url")}
              className="w-full py-2 px-3 text-xs font-medium border border-borderSoft bg-bgMain hover:bg-gray-100 rounded-btn text-textPrimary transition-colors flex items-center justify-center gap-2"
            >
              {copiedUrl ? (
                <>
                  <Check className="w-3.5 h-3.5 text-forest" />
                  URL Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-textSecondary" />
                  Copy Verification Link
                </>
              )}
            </button>
            <Link
              to={`/verify/${credential.id}`}
              className="w-full py-2 px-3 text-xs font-medium text-forest hover:underline text-center flex items-center justify-center gap-1 mt-1"
            >
              <ExternalLink className="w-3 h-3" />
              Open Verification Page
            </Link>
          </div>
        </div>

        {/* Right Column: Detailed Credential Metadata */}
        <div className="md:col-span-2 bg-surface border border-borderSoft rounded-card p-6 shadow-xs space-y-5">
          <h2 className="text-sm font-bold text-textPrimary border-b border-borderSoft pb-3">
            On-Chain Cryptographic Commitment
          </h2>

          <div className="space-y-4 text-xs">
            {/* Opaque Credential ID */}
            <div>
              <span className="text-textSecondary block mb-1">Opaque Credential ID (bytes32)</span>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={credential.id}
                  className="flex-1 px-3 py-1.5 bg-bgMain rounded-btn border border-borderSoft font-mono text-[11px] text-textPrimary"
                />
                <button
                  onClick={() => copyToClipboard(credential.id, "id")}
                  className="p-2 border border-borderSoft rounded-btn hover:bg-gray-100 transition-colors"
                  title="Copy Credential ID"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-forest" /> : <Copy className="w-3.5 h-3.5 text-textSecondary" />}
                </button>
              </div>
            </div>

            {/* Salted Document Commitment */}
            <div>
              <span className="text-textSecondary block mb-1">
                Salted Document Commitment (Stored on-chain)
              </span>
              <input
                readOnly
                value={credential.credentialHash}
                className="w-full px-3 py-1.5 bg-bgMain rounded-btn border border-borderSoft font-mono text-[11px] text-textPrimary"
              />
              <span className="text-[10px] text-textSecondary mt-1 block">
                Hash generated from document binary + secret salt. Proves document integrity without storing raw files on-chain.
              </span>
            </div>

            {/* Transaction Hash */}
            <div>
              <span className="text-textSecondary block mb-1">Issuance Transaction Hash</span>
              <input
                readOnly
                value={credential.transactionHash || "N/A"}
                className="w-full px-3 py-1.5 bg-bgMain rounded-btn border border-borderSoft font-mono text-[11px] text-forest"
              />
            </div>

            {/* Timestamps and Document Type */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-borderSoft">
              <div>
                <span className="text-textSecondary block">Document Type</span>
                <span className="font-semibold text-textPrimary">
                  {credential.application?.documentType || "MOCK_ID"}
                </span>
              </div>
              <div>
                <span className="text-textSecondary block">Block Number</span>
                <span className="font-mono text-textPrimary">
                  {credential.blockNumber ? `#${credential.blockNumber}` : "Pending"}
                </span>
              </div>
              <div>
                <span className="text-textSecondary block">Issued At</span>
                <span className="text-textPrimary">
                  {credential.issuedAt ? new Date(credential.issuedAt).toLocaleString() : "N/A"}
                </span>
              </div>
              <div>
                <span className="text-textSecondary block">Revoked At</span>
                <span className="text-textPrimary">
                  {credential.revokedAt ? new Date(credential.revokedAt).toLocaleString() : "None (Active)"}
                </span>
              </div>
            </div>

            {/* Verification and Interoperability Action Buttons */}
            <div className="pt-4 border-t border-borderSoft grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleVerifyIntegrity}
                disabled={verifyingIntegrity}
                className="py-2.5 px-3 bg-forest-light text-forest border border-emerald-300 text-xs font-semibold rounded-btn hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <ShieldCheck className="w-4 h-4 text-forest" />
                {verifyingIntegrity ? "Checking Proof..." : "Verify Document Integrity"}
              </button>
              <button
                onClick={handleExportW3C}
                className="py-2.5 px-3 bg-bgMain text-textPrimary border border-borderSoft text-xs font-semibold rounded-btn hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
              >
                <FileJson className="w-4 h-4 text-tealAccent" />
                Export W3C Credential (JSON)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Document Integrity Proof Modal */}
      <IntegrityModal
        isOpen={showIntegrityModal}
        onClose={() => setShowIntegrityModal(false)}
        data={integrityData}
      />
    </div>
  );
}
