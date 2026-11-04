import React, { useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  X,
  Copy,
  Check,
  Binary,
  KeyRound,
  FileCode,
  Layers,
} from "lucide-react";

export default function IntegrityModal({ isOpen, onClose, data }) {
  const [copiedField, setCopiedField] = useState(null);

  if (!isOpen || !data) return null;

  const copy = (val, field) => {
    navigator.clipboard.writeText(val);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const {
    matches,
    fileSha256,
    salt,
    recomputedCommitment,
    onChainCommitment,
    contractAddress,
    verifiedAt,
  } = data;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-surface rounded-card max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-borderSoft relative animate-in fade-in zoom-in duration-150 space-y-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-textSecondary hover:text-textPrimary p-1.5 rounded-btn hover:bg-gray-100 transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-btn bg-forest-light text-forest flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-textPrimary tracking-tight">
              Cryptographic Document Integrity Proof
            </h2>
            <p className="text-xs text-textSecondary">
              Mathematical proof that the uploaded synthetic document matches the on-chain commitment exactly
            </p>
          </div>
        </div>

        {/* Match Result Banner */}
        {matches ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-btn flex items-center gap-3 text-xs text-emerald-950">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold text-sm block">100% Cryptographic Match Verified</span>
              The recomputed salted digest matches the immutable smart contract storage. The document is intact and unaltered.
            </div>
          </div>
        ) : (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-btn flex items-center gap-3 text-xs text-rose-950">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <span className="font-bold text-sm block">Commitment Mismatch Detected</span>
              The retained document does not match the on-chain cryptographic commitment.
            </div>
          </div>
        )}

        {/* Step-by-Step Breakdown */}
        <div className="space-y-4 text-xs">
          {/* Step 1 */}
          <div className="p-3 bg-bgMain rounded-btn border border-borderSoft space-y-1.5">
            <div className="flex items-center justify-between text-textSecondary font-semibold text-[11px]">
              <span className="flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-forest" />
                1. Binary Document SHA-256 Digest
              </span>
              <button
                onClick={() => copy(fileSha256, "sha256")}
                className="hover:text-textPrimary flex items-center gap-1"
              >
                {copiedField === "sha256" ? <Check className="w-3 h-3 text-forest" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <div className="font-mono text-[11px] text-textPrimary break-all bg-white p-2 rounded border border-borderSoft">
              {fileSha256}
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-3 bg-bgMain rounded-btn border border-borderSoft space-y-1.5">
            <div className="flex items-center justify-between text-textSecondary font-semibold text-[11px]">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-tealAccent" />
                2. Off-Chain Secret Salt (32 Bytes)
              </span>
              <button
                onClick={() => copy(salt, "salt")}
                className="hover:text-textPrimary flex items-center gap-1"
              >
                {copiedField === "salt" ? <Check className="w-3 h-3 text-forest" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <div className="font-mono text-[11px] text-textPrimary break-all bg-white p-2 rounded border border-borderSoft">
              {salt}
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-3 bg-bgMain rounded-btn border border-borderSoft space-y-1.5">
            <div className="flex items-center justify-between text-textSecondary font-semibold text-[11px]">
              <span className="flex items-center gap-1.5">
                <Binary className="w-3.5 h-3.5 text-forest" />
                3. Recomputed Salted Commitment: keccak256(sha256 + ":" + salt)
              </span>
              <button
                onClick={() => copy(recomputedCommitment, "recomputed")}
                className="hover:text-textPrimary flex items-center gap-1"
              >
                {copiedField === "recomputed" ? <Check className="w-3 h-3 text-forest" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <div className="font-mono text-[11px] text-forest font-semibold break-all bg-white p-2 rounded border border-borderSoft">
              {recomputedCommitment}
            </div>
          </div>

          {/* Step 4 */}
          <div className="p-3 bg-bgMain rounded-btn border border-borderSoft space-y-1.5">
            <div className="flex items-center justify-between text-textSecondary font-semibold text-[11px]">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-forest" />
                4. On-Chain Smart Contract Commitment (EVM Storage)
              </span>
              <button
                onClick={() => copy(onChainCommitment, "onchain")}
                className="hover:text-textPrimary flex items-center gap-1"
              >
                {copiedField === "onchain" ? <Check className="w-3 h-3 text-forest" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <div className="font-mono text-[11px] text-forest font-semibold break-all bg-white p-2 rounded border border-borderSoft">
              {onChainCommitment}
            </div>
          </div>
        </div>

        {/* Verification Footer Metadata */}
        <div className="pt-2 border-t border-borderSoft flex flex-col sm:flex-row justify-between items-start sm:items-center text-[11px] text-textSecondary gap-2">
          <span>Contract: <span className="font-mono text-textPrimary">{contractAddress || "Local Hardhat"}</span></span>
          <span>Verified At: {new Date(verifiedAt).toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}
