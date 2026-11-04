import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  FileUp,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  FileCheck,
  ArrowRight,
  Info,
} from "lucide-react";

export default function KYCSubmission() {
  const [documentType, setDocumentType] = useState("MOCK_ID");
  const [documentNumber, setDocumentNumber] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (selected.size > 5 * 1024 * 1024) {
        setError("File exceeds 5MB size limit.");
        return;
      }
      const allowed = ["image/jpeg", "image/png", "application/pdf"];
      if (!allowed.includes(selected.type)) {
        setError("Invalid file format. Please upload JPG, PNG, or PDF.");
        return;
      }
      setError(null);
      setFile(selected);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a synthetic identity document file.");
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("documentType", documentType);
      formData.append("documentNumber", documentNumber);
      formData.append("document", file);

      await api.post("/kyc/submit", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSuccess(true);
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    } catch (err) {
      const errMsg =
        err.response?.data?.error ||
        "Failed to submit KYC application. Please check your inputs.";
      setError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="bg-surface border border-borderSoft rounded-card p-6 sm:p-8 shadow-xs">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-semibold bg-forest-light text-forest border border-emerald-200 mb-2">
            <FileUp className="w-3.5 h-3.5" />
            KYC Application Form
          </div>
          <h1 className="text-xl font-bold text-textPrimary tracking-tight">
            Submit Synthetic Identity Information
          </h1>
          <p className="text-xs text-textSecondary mt-1">
            Fill in simulated document details to initiate digital credential verification
          </p>
        </div>

        {/* Academic Prototype Notice */}
        <div className="mb-6 p-3.5 bg-amber-50 border border-amber-200 rounded-btn flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Academic Prototype Notice</span>
            Please use synthetic/dummy data only. Do not upload actual Aadhaar, PAN, passport, or real government ID cards.
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-btn flex items-center gap-2 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-btn flex items-center gap-2 text-xs text-emerald-800 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Application submitted successfully! Redirecting to dashboard...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-textPrimary mb-1">
              Synthetic Document Type
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-btn border border-borderSoft bg-bgMain focus:outline-none focus:ring-1 focus:ring-forest text-textPrimary"
            >
              <option value="MOCK_ID">Mock Government ID Card</option>
              <option value="MOCK_PAN">Mock Tax / PAN Identification</option>
              <option value="PASSPORT_SAMPLE">Sample Travel Passport</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-textPrimary mb-1">
              Mock Document Number
            </label>
            <input
              type="text"
              required
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              placeholder="e.g. MOCK-9874-5612"
              className="w-full px-3 py-2 text-sm rounded-btn border border-borderSoft bg-bgMain focus:outline-none focus:ring-1 focus:ring-forest text-textPrimary"
            />
            <span className="text-[11px] text-textSecondary mt-1 block">
              Enter any synthetic sequence (e.g. DUMMY-2026-X).
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-textPrimary mb-1">
              Upload Mock Document File (PNG, JPG, or PDF)
            </label>
            <div className="border-2 border-dashed border-borderSoft hover:border-forest rounded-card p-6 text-center cursor-pointer transition-colors bg-bgMain">
              <input
                type="file"
                id="docUpload"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="docUpload" className="cursor-pointer block">
                {file ? (
                  <div className="flex flex-col items-center gap-2 text-forest">
                    <FileCheck className="w-8 h-8" />
                    <span className="text-xs font-semibold text-textPrimary">{file.name}</span>
                    <span className="text-[11px] text-textSecondary">
                      ({(file.size / 1024).toFixed(1)} KB) &bull; Click to change
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <FileUp className="w-8 h-8 text-textSecondary" />
                    <span className="text-xs font-semibold text-textPrimary">
                      Click to choose or drag document here
                    </span>
                    <span className="text-[11px] text-textSecondary">
                      Supported formats: JPG, PNG, PDF (Max 5 MB)
                    </span>
                  </div>
                )}
              </label>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || success}
              className="w-full py-2.5 px-4 bg-forest text-white text-sm font-semibold rounded-btn hover:bg-forest-hover shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting ? "Uploading & Submitting..." : "Submit Application for Review"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
