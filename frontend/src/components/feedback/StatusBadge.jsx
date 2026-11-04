import React from "react";
import { CheckCircle2, AlertCircle, Clock, XCircle, ShieldAlert } from "lucide-react";

export default function StatusBadge({ status }) {
  const normStatus = (status || "").toUpperCase();

  switch (normStatus) {
    case "ACTIVE":
    case "APPROVED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          {normStatus}
        </span>
      );

    case "PENDING":
    case "PENDING_ISSUANCE":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          {normStatus === "PENDING_ISSUANCE" ? "READY TO ISSUE" : "PENDING REVIEW"}
        </span>
      );

    case "REVOKED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
          <XCircle className="w-3.5 h-3.5 text-rose-600" />
          REVOKED
        </span>
      );

    case "REJECTED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-50 text-red-800 border border-red-200">
          <AlertCircle className="w-3.5 h-3.5 text-red-600" />
          REJECTED
        </span>
      );

    case "NOT_FOUND":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300">
          <ShieldAlert className="w-3.5 h-3.5 text-gray-500" />
          NOT FOUND
        </span>
      );

    case "UNAVAILABLE":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300">
          <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
          NODE UNAVAILABLE
        </span>
      );

    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
          {status || "UNKNOWN"}
        </span>
      );
  }
}
