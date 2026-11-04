import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowRight, Wallet } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { login, walletLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(email, password);
      if (user.role === "ADMIN") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(
        err.response?.data?.error || "Login failed. Please check your credentials."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleWalletLogin = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const user = await walletLogin();
      navigate(user.role === "ADMIN" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Wallet login failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const fillAdmin = () => {
    setEmail("admin@chainkyc.local");
    setPassword("Admin@ChainKYC2026");
  };

  const fillUser = () => {
    setEmail("alice@example.com");
    setPassword("Alice@ChainKYC2026");
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-md w-full bg-surface border border-borderSoft rounded-card p-8 shadow-xs">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-12 h-12 rounded-btn bg-forest-light text-forest flex items-center justify-center mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-textPrimary tracking-tight">Sign in to ChainKYC</h2>
          <p className="text-xs text-textSecondary mt-1">
            Access your privacy-preserving KYC verification dashboard
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-btn flex items-center gap-2 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-textPrimary mb-1">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-textSecondary">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-btn border border-borderSoft bg-bgMain focus:outline-none focus:ring-1 focus:ring-forest text-textPrimary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-textPrimary mb-1">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-textSecondary">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-btn border border-borderSoft bg-bgMain focus:outline-none focus:ring-1 focus:ring-forest text-textPrimary"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 bg-forest text-white text-sm font-semibold rounded-btn hover:bg-forest-hover shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {submitting ? "Signing in..." : "Sign In"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="relative my-5">
          <div className="border-t border-borderSoft" />
          <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 px-2 bg-surface text-[11px] text-textSecondary">
            or
          </span>
        </div>

        <button
          type="button"
          onClick={handleWalletLogin}
          disabled={submitting}
          className="w-full py-2.5 px-4 border border-borderSoft bg-bgMain text-textPrimary text-sm font-semibold rounded-btn hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <Wallet className="w-4 h-4 text-forest" />
          Sign in with MetaMask
        </button>
        <p className="text-[11px] text-textSecondary text-center mt-2">
          Your wallet must already be linked to a ChainKYC account.
        </p>

        {/* Demo Fast-fill Shortcuts */}
        <div className="mt-6 pt-5 border-t border-borderSoft">
          <p className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider mb-2.5 text-center">
            Demo Credentials
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={fillAdmin}
              className="py-1.5 px-2.5 text-xs font-medium border border-borderSoft rounded-btn bg-bgMain hover:bg-gray-100 text-textPrimary transition-colors text-center"
            >
              Fill Admin Demo
            </button>
            <button
              type="button"
              onClick={fillUser}
              className="py-1.5 px-2.5 text-xs font-medium border border-borderSoft rounded-btn bg-bgMain hover:bg-gray-100 text-textPrimary transition-colors text-center"
            >
              Fill User Demo
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-textSecondary">
          Don't have an account?{" "}
          <Link to="/register" className="text-forest font-semibold hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}
