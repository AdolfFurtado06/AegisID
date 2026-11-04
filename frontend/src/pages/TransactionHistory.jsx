import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import {
  History,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  XCircle,
  Eye,
  Clock,
  Layers,
} from "lucide-react";

export default function TransactionHistory() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedHash, setCopiedHash] = useState(null);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await api.get("/identity/history");
        setLogs(res.data.logs);
      } catch (err) {
        console.error("Failed to load history logs:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const getActionBadge = (action) => {
    switch (action) {
      case "ISSUED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            ISSUED
          </span>
        );
      case "REVOKED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            REVOKED
          </span>
        );
      case "VERIFIED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <Eye className="w-3 h-3 text-blue-600" />
            VERIFIED
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] bg-gray-100 text-gray-700">
            {action}
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-textPrimary tracking-tight flex items-center gap-2">
          <History className="w-6 h-6 text-forest" />
          Blockchain & Application Activity History
        </h1>
        <p className="text-xs text-textSecondary mt-1">
          Complete audit trail of identity issuance transactions, on-chain revocations, and verifications
        </p>
      </div>

      <div className="bg-surface border border-borderSoft rounded-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-bgMain border-b border-borderSoft text-textSecondary font-semibold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Credential ID</th>
                <th className="py-3 px-4">Transaction Hash</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Initiated By</th>
                <th className="py-3 px-4 text-right">Verify</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderSoft">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-textSecondary">
                    Loading blockchain transaction log...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-textSecondary">
                    No transactions or verification events recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-4">{getActionBadge(log.action)}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-textPrimary">
                      <span title={log.credentialId}>
                        {`${log.credentialId.substring(0, 10)}...${log.credentialId.substring(log.credentialId.length - 8)}`}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {log.transactionHash ? (
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-forest">
                          <span>{`${log.transactionHash.substring(0, 8)}...${log.transactionHash.substring(log.transactionHash.length - 6)}`}</span>
                          <button
                            onClick={() => copyText(log.transactionHash)}
                            className="p-1 hover:bg-gray-100 rounded text-textSecondary"
                            title="Copy Transaction Hash"
                          >
                            {copiedHash === log.transactionHash ? (
                              <Check className="w-3 h-3 text-forest" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-textSecondary italic">
                          Off-chain query
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-textSecondary">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-textSecondary">
                      {log.performer ? (
                        <span className="font-medium text-textPrimary">
                          {log.performer.name} ({log.performer.role})
                        </span>
                      ) : (
                        <span className="text-[11px] italic">Public Verifier</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/verify/${log.credentialId}`}
                        className="inline-flex items-center gap-1 text-forest hover:underline font-medium text-xs"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Check Status
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
