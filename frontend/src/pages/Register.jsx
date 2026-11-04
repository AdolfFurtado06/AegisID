import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ShieldCheck, User, Mail, Lock, AlertCircle, ArrowRight } from "lucide-react";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(name, email, password);
      navigate("/dashboard");
    } catch (err) {
      const errDetails = err.response?.data?.details;
      if (errDetails) {
        const firstErrKey = Object.keys(errDetails)[0];
        setError(`${firstErrKey}: ${errDetails[firstErrKey][0]}`);
      } else {
        setError(err.response?.data?.error || "Registration failed. Please check your inputs.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-md w-full bg-surface border border-borderSoft rounded-card p-8 shadow-xs">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-12 h-12 rounded-btn bg-forest-light text-forest flex items-center justify-center mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-textPrimary tracking-tight">Create an Account</h2>
          <p className="text-xs text-textSecondary mt-1">
            Register to submit your mock identity for decentralized verification
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
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-textSecondary">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alice Johnson"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-btn border border-borderSoft bg-bgMain focus:outline-none focus:ring-1 focus:ring-forest text-textPrimary"
              />
            </div>
          </div>

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
                placeholder="alice@example.com"
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
                placeholder="Min 8 chars, 1 uppercase & 1 number"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-btn border border-borderSoft bg-bgMain focus:outline-none focus:ring-1 focus:ring-forest text-textPrimary"
              />
            </div>
            <p className="text-[11px] text-textSecondary mt-1">
              Must be at least 8 characters with 1 uppercase letter and 1 number.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 bg-forest text-white text-sm font-semibold rounded-btn hover:bg-forest-hover shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {submitting ? "Creating Account..." : "Create Account"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-textSecondary">
          Already have an account?{" "}
          <Link to="/login" className="text-forest font-semibold hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
