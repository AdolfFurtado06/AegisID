import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import StatusBadge from "../components/feedback/StatusBadge";
import QRScannerModal from "../components/identity/QRScannerModal";
import {
  ShieldCheck,
  ScanLine,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Lock,
  RefreshCw,
} from "lucide-react";

export default function VerifyIdentity() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [inputCredId, setInputCredId] = useState(id || "");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [copiedTx, setCopiedTx] = useState(false);

  const performVerification = async (targetId) => {
    if (!targetId || !targetId.trim()) return;
    try {
      setLoading(true);
      const cleanId = targetId.trim();
      const res = await api.get(`/identity/verify/${cleanId}`);
      setResult(res.data);
    } catch (err) {
      console.error("Verification error:", err);
      setResult({
        status: "UNAVAILABLE",
        error: "Could not connect to verification node.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      setInputCredId(id);
      performVerification(id);
    }
  }, [id]);

  const handleManualSearch = (e) => {
    e.preventDefault();
    if (inputCredId.trim()) {
      navigate(`/verify/${inputCredId.trim()}`);
    }
  };

  const handleScanSuccess = (scannedText) => {
    setIsScannerOpen(false);
    // If it's a full URL, extract the last path segment
    let extractedId = scannedText;
    if (scannedText.includes("/verify/")) {
      extractedId = scannedText.split("/verify/")[1].split("?")[0].split("#")[0];
    }
    navigate(`/verify/${extractedId}`);
  };

  const copyTx = (hash) => {
    navigator.clipboard.writeText(hash);
    setCopiedTx(true);
    setTimeout(() => setCopiedTx(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
      {/* Page Title */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-btn bg-forest-light text-forest mx-auto flex items-center justify-center mb-3">
          <ScanLine className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-textPrimary tracking-tight">
          Public Credential Verification
        </h1>
        <p className="text-xs text-textSecondary max-w-md mx-auto">
          Authoritatively verify digital credentials against the decentralized smart contract registry
        </p>
      </div>

      {/* Search & Scan Action Bar */}
      <div className="bg-surface border border-borderSoft rounded-card p-4 sm:p-5 shadow-xs space-y-4">
        <form onSubmit={handleManualSearch} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-textSecondary absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Paste Credential ID (0x...)"
              value={inputCredId}
              onChange={(e) => setInputCredId(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-btn border border-borderSoft bg-bgMain focus:outline-none focus:ring-1 focus:ring-forest text-textPrimary"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !inputCredId.trim()}
            className="px-5 py-2 bg-forest text-white text-xs font-semibold rounded-btn hover:bg-forest-hover shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            Verify Status
          </button>
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="px-4 py-2 border border-borderSoft bg-bgMain hover:bg-gray-100 text-textPrimary text-xs font-semibold rounded-btn transition-colors flex items-center justify-center gap-1.5"
          >
            <ScanLine className="w-3.5 h-3.5 text-forest" />
            Scan QR
          </button>
        </form>
      </div>

      {/* Verification Result Card */}
      {loading ? (
        <div className="bg-surface border border-borderSoft rounded-card p-10 text-center space-y-3">
          <RefreshCw className="w-6 h-6 text-forest animate-spin mx-auto" />
          <p className="text-xs text-textSecondary font-medium">
            Querying local Ethereum smart contract...
          </p>
        </div>
      ) : result ? (
        <div className="bg-surface border border-borderSoft rounded-card p-6 sm:p-8 shadow-xs space-y-6">
          {/* Header Status Result */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-borderSoft pb-4">
            <div>
              <h2 className="text-sm font-bold text-textSecondary uppercase tracking-wider">
                Verification Result
              </h2>
              <p className="font-mono text-xs text-textPrimary mt-0.5 break-all">
                {result.credentialId}
              </p>
            </div>
            <StatusBadge status={result.status} />
          </div>

          {/* Status Explanation Banner */}
          {result.status === "ACTIVE" && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-btn flex items-start gap-3 text-xs text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-sm">Credential is Valid and Active</span>
                This credential commitment exists on the smart contract registry and has not been revoked by the issuer.
              </div>
            </div>
          )}

          {result.status === "REVOKED" && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-btn flex items-start gap-3 text-xs text-rose-900">
              <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-sm">Credential has been REVOKED</span>
                This credential was previously issued but has since been revoked by the authorized administrator. It is no longer valid.
              </div>
            </div>
          )}

          {result.status === "NOT_FOUND" && (
            <div className="p-4 bg-gray-50 border border-gray-300 rounded-btn flex items-start gap-3 text-xs text-gray-800">
              <AlertTriangle className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-sm">Credential Not Found</span>
                No credential record with this identifier exists on the blockchain registry.
              </div>
            </div>
          )}

          {result.status === "UNAVAILABLE" && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-btn flex items-start gap-3 text-xs text-amber-900">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-sm">Blockchain Node Unavailable</span>
                Unable to query the local Hardhat RPC node. Make sure the local blockchain is running.
              </div>
            </div>
          )}

          {/* Minimal Safe Metadata */}
          {result.onChain && result.onChain.exists && (
            <div className="space-y-3 text-xs">
              <h3 className="font-bold text-textPrimary text-xs uppercase tracking-wider text-textSecondary">
                Authoritative On-Chain Ledger Data
              </h3>

              <div className="space-y-2">
                <div className="flex justify-between py-1.5 border-b border-borderSoft">
                  <span className="text-textSecondary">Issuer Address</span>
                  <span className="font-mono text-textPrimary text-[11px] truncate max-w-[220px]">
                    {result.onChain.issuer}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-borderSoft">
                  <span className="text-textSecondary">Subject Wallet</span>
                  <span className="font-mono text-textPrimary text-[11px] truncate max-w-[220px]">
                    {result.onChain.subject}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-borderSoft">
                  <span className="text-textSecondary">Issued Timestamp</span>
                  <span className="text-textPrimary">
                    {result.onChain.issuedAt
                      ? new Date(result.onChain.issuedAt * 1000).toLocaleString()
                      : "N/A"}
                  </span>
                </div>
                {result.onChain.revokedAt > 0 && (
                  <div className="flex justify-between py-1.5 border-b border-borderSoft">
                    <span className="text-textSecondary">Revoked Timestamp</span>
                    <span className="text-rose-700 font-semibold">
                      {new Date(result.onChain.revokedAt * 1000).toLocaleString()}
                    </span>
                  </div>
                )}
                {result.metadata?.transactionHash && (
                  <div className="flex justify-between items-center py-1.5 border-b border-borderSoft">
                    <span className="text-textSecondary">Transaction Hash</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-forest text-[11px]">
                        {`${result.metadata.transactionHash.substring(0, 10)}...${result.metadata.transactionHash.substring(56)}`}
                      </span>
                      <button
                        onClick={() => copyTx(result.metadata.transactionHash)}
                        className="p-1 hover:bg-gray-100 rounded text-textSecondary"
                        title="Copy Transaction Hash"
                      >
                        {copiedTx ? <Check className="w-3.5 h-3.5 text-forest" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Privacy Protection Notice */}
          <div className="p-3 bg-bgMain border border-borderSoft rounded-btn flex items-center gap-2.5 text-[11px] text-textSecondary">
            <Lock className="w-4 h-4 text-forest shrink-0" />
            <span>
              Zero-knowledge privacy guarantee: No identity documents, full document numbers, dates of birth, or personal profiles are stored on the blockchain or exposed on this verification page.
            </span>
          </div>
        </div>
      ) : null}

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  );
}
