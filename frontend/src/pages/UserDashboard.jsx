import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import StatusBadge from "../components/feedback/StatusBadge";
import {
  FileText,
  ShieldCheck,
  QrCode,
  ArrowRight,
  Clock,
  AlertTriangle,
  CheckCircle,
  FileUp,
} from "lucide-react";

export default function UserDashboard() {
  const { user } = useAuth();
  const [kycData, setKycData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await api.get("/kyc/status");
        setKycData(res.data.application);
      } catch (err) {
        console.error("Failed to load KYC status:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, []);

  // Determine active step index (0 to 3)
  const getStepIndex = () => {
    if (!kycData) return 0;
    if (kycData.status === "PENDING") return 1;
    if (kycData.status === "REJECTED") return 2;
    if (kycData.status === "APPROVED" && (!kycData.credential || kycData.credential.status !== "ACTIVE"))
      return 2;
    if (kycData.credential && kycData.credential.status === "ACTIVE") return 3;
    if (kycData.credential && kycData.credential.status === "REVOKED") return 3;
    return 1;
  };

  const currentStep = getStepIndex();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-surface border border-borderSoft rounded-card p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-textPrimary tracking-tight">
            Welcome back, {user?.name}
          </h1>
          <p className="text-xs text-textSecondary mt-1">
            Account: <span className="font-mono text-textPrimary">{user?.email}</span> &bull; Role:{" "}
            <span className="font-semibold text-textPrimary">{user?.role}</span>
          </p>
        </div>

        {kycData?.credential?.status === "ACTIVE" ? (
          <Link
            to="/my-identity"
            className="inline-flex items-center gap-2 px-4 py-2 bg-forest text-white text-xs font-semibold rounded-btn hover:bg-forest-hover shadow-xs transition-colors"
          >
            <QrCode className="w-4 h-4" />
            View Credential & QR
          </Link>
        ) : !kycData || kycData.status === "REJECTED" ? (
          <Link
            to="/kyc/submit"
            className="inline-flex items-center gap-2 px-4 py-2 bg-forest text-white text-xs font-semibold rounded-btn hover:bg-forest-hover shadow-xs transition-colors"
          >
            <FileUp className="w-4 h-4" />
            Submit KYC Application
          </Link>
        ) : null}
      </div>

      {/* Verification Stepper */}
      <div className="bg-surface border border-borderSoft rounded-card p-6 shadow-xs">
        <h2 className="text-sm font-semibold text-textPrimary mb-6 flex items-center gap-2">
          <Clock className="w-4 h-4 text-forest" />
          KYC Verification Progress
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
          {[
            {
              title: "1. Account Created",
              desc: "Registered and authenticated",
              done: true,
            },
            {
              title: "2. Document Submitted",
              desc: kycData ? `Type: ${kycData.documentType}` : "Pending submission",
              done: !!kycData,
            },
            {
              title: "3. Administrator Review",
              desc: kycData
                ? kycData.status === "APPROVED"
                  ? "Approved by Issuer"
                  : kycData.status === "REJECTED"
                  ? "Rejected"
                  : "In Review Queue"
                : "Awaiting submission",
              done: kycData?.status === "APPROVED" || kycData?.status === "REJECTED",
              rejected: kycData?.status === "REJECTED",
            },
            {
              title: "4. Smart Contract Issued",
              desc:
                kycData?.credential?.status === "ACTIVE"
                  ? "Credential Active on Chain"
                  : kycData?.credential?.status === "REVOKED"
                  ? "Revoked by Issuer"
                  : "Awaiting on-chain commitment",
              done: !!kycData?.credential,
              revoked: kycData?.credential?.status === "REVOKED",
            },
          ].map((step, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-btn border transition-all ${
                step.rejected
                  ? "bg-rose-50 border-rose-200"
                  : step.revoked
                  ? "bg-amber-50 border-amber-200"
                  : step.done
                  ? "bg-forest-light border-emerald-200"
                  : "bg-bgMain border-borderSoft text-textSecondary"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-textPrimary">{step.title}</span>
                {step.rejected ? (
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                ) : step.done ? (
                  <CheckCircle className="w-4 h-4 text-forest" />
                ) : (
                  <Clock className="w-4 h-4 text-textSecondary" />
                )}
              </div>
              <p className="text-[11px] text-textSecondary leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Status Details Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface border border-borderSoft rounded-card p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-semibold text-textPrimary flex items-center justify-between">
            <span>Application Status</span>
            <StatusBadge status={kycData ? kycData.status : "NOT_SUBMITTED"} />
          </h3>

          {loading ? (
            <div className="py-8 text-center text-xs text-textSecondary">Loading status...</div>
          ) : !kycData ? (
            <div className="py-6 text-center space-y-3">
              <p className="text-xs text-textSecondary">
                You have not submitted a KYC application yet.
              </p>
              <Link
                to="/kyc/submit"
                className="inline-flex items-center gap-2 px-4 py-2 bg-forest text-white text-xs font-semibold rounded-btn hover:bg-forest-hover shadow-xs transition-colors"
              >
                Submit Synthetic KYC Now
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-borderSoft">
                <span className="text-textSecondary">Application ID</span>
                <span className="font-mono text-textPrimary">{kycData.id}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-borderSoft">
                <span className="text-textSecondary">Document Type</span>
                <span className="font-semibold text-textPrimary">{kycData.documentType}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-borderSoft">
                <span className="text-textSecondary">Submitted On</span>
                <span className="text-textPrimary">{new Date(kycData.submittedAt).toLocaleString()}</span>
              </div>

              {kycData.rejectionReason && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-btn text-rose-800 space-y-1">
                  <span className="font-bold">Rejection Feedback:</span>
                  <p>{kycData.rejectionReason}</p>
                </div>
              )}

              {kycData.status === "APPROVED" && !kycData.credential && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-btn text-amber-800">
                  Your application has been approved by the administrator. The on-chain credential is now being issued.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Credential Quick Glance */}
        <div className="bg-surface border border-borderSoft rounded-card p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-textPrimary mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-forest" />
              Digital Credential Status
            </h3>
            <div className="mb-4">
              <StatusBadge status={kycData?.credential ? kycData.credential.status : "NOT_ISSUED"} />
            </div>

            {kycData?.credential ? (
              <div className="space-y-2 text-xs">
                <p className="text-textSecondary">
                  Credential ID:{" "}
                  <span className="font-mono text-textPrimary font-semibold block truncate">
                    {kycData.credential.id}
                  </span>
                </p>
                {kycData.credential.transactionHash && (
                  <p className="text-textSecondary">
                    Tx Hash:{" "}
                    <span className="font-mono text-forest block truncate">
                      {kycData.credential.transactionHash}
                    </span>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-textSecondary leading-relaxed">
                Once an administrator approves your submitted KYC application, a cryptographic credential commitment is registered on the local Ethereum network.
              </p>
            )}
          </div>

          {kycData?.credential && (
            <Link
              to="/my-identity"
              className="mt-6 w-full py-2 bg-forest-light text-forest border border-emerald-300 text-xs font-semibold rounded-btn text-center hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5" />
              Open Credential & QR
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
