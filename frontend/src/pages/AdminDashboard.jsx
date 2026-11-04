import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import StatusBadge from "../components/feedback/StatusBadge";
import { TableSkeleton } from "../components/feedback/Skeleton";
import {
  FileCheck2,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Eye,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

export default function AdminDashboard() {
  const [applications, setApplications] = useState([]);
  const [counts, setCounts] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.get("/kyc/applications", { params });
      setApplications(res.data.applications);
      setCounts(res.data.counts);
    } catch (err) {
      console.error("Failed to load applications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchApplications();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-textPrimary tracking-tight flex items-center gap-2">
          <FileCheck2 className="w-6 h-6 text-forest" />
          Administrator KYC Verification Desk
        </h1>
        <p className="text-xs text-textSecondary mt-1">
          Review submitted mock applications, authorize verification, and issue smart contract commitments
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Applications", value: counts.total, icon: FileCheck2, color: "text-textPrimary" },
          { label: "Pending Review", value: counts.pending, icon: Clock, color: "text-amber-600" },
          { label: "Approved Applications", value: counts.approved, icon: CheckCircle2, color: "text-emerald-600" },
          { label: "Rejected Applications", value: counts.rejected, icon: XCircle, color: "text-rose-600" },
        ].map((stat, idx) => (
          <div key={idx} className="bg-surface border border-borderSoft rounded-card p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-textSecondary">{stat.label}</span>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <div className="mt-3 text-2xl font-bold text-textPrimary">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface border border-borderSoft rounded-card p-4 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-textSecondary absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-btn border border-borderSoft bg-bgMain focus:outline-none focus:ring-1 focus:ring-forest text-textPrimary"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-textSecondary" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-btn border border-borderSoft bg-bgMain focus:outline-none focus:ring-1 focus:ring-forest text-textPrimary"
          >
            <option value="">All Review Statuses</option>
            <option value="PENDING">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-surface border border-borderSoft rounded-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-bgMain border-b border-borderSoft text-textSecondary font-semibold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4">Applicant</th>
                <th className="py-3 px-4">Document Type</th>
                <th className="py-3 px-4">Mock ID Number</th>
                <th className="py-3 px-4">Submitted Date</th>
                <th className="py-3 px-4">Review Status</th>
                <th className="py-3 px-4">On-Chain Credential</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderSoft">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-4">
                    <TableSkeleton rows={4} cols={7} />
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-textSecondary">
                    No applications found matching the selected filter.
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-textPrimary">{app.user.name}</div>
                      <div className="text-[11px] text-textSecondary">{app.user.email}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-textPrimary">
                      {app.documentType}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-textSecondary">
                      {app.documentNumber}
                    </td>
                    <td className="py-3 px-4 text-textSecondary">
                      {new Date(app.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="py-3 px-4">
                      {app.credential ? (
                        <StatusBadge status={app.credential.status} />
                      ) : (
                        <span className="text-[11px] text-textSecondary italic">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/admin/review/${app.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-forest-light text-forest border border-emerald-300 rounded-btn font-semibold hover:bg-emerald-100 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect & Review
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
