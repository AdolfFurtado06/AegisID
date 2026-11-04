import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  ShieldCheck,
  LogOut,
  ScanLine,
  Wallet,
} from "lucide-react";

export default function Navbar() {
  const { user, logout, isAdmin, linkWallet } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [connectingWallet, setConnectingWallet] = useState(false);

  const handleConnectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask is not installed. Please install MetaMask to interact with the blockchain.");
      return;
    }
    try {
      setConnectingWallet(true);
      await linkWallet();
    } catch (err) {
      console.error("Wallet connection error:", err);
      alert(err.response?.data?.error || err.message || "Wallet connection failed.");
    } finally {
      setConnectingWallet(false);
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="bg-surface border-b border-borderSoft sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Brand */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-btn bg-forest flex items-center justify-center text-white shadow-sm">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg text-textPrimary tracking-tight flex items-center gap-2">
                  ChainKYC
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase bg-forest-light text-forest border border-emerald-300">
                    Local Hardhat
                  </span>
                </span>
              </div>
            </Link>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {user && !isAdmin && (
                <>
                  <Link
                    to="/dashboard"
                    className={`px-3 py-1.5 rounded-btn text-sm font-medium transition-colors ${
                      isActive("/dashboard")
                        ? "bg-forest-light text-forest font-semibold"
                        : "text-textSecondary hover:text-textPrimary hover:bg-gray-100"
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/kyc/submit"
                    className={`px-3 py-1.5 rounded-btn text-sm font-medium transition-colors ${
                      isActive("/kyc/submit")
                        ? "bg-forest-light text-forest font-semibold"
                        : "text-textSecondary hover:text-textPrimary hover:bg-gray-100"
                    }`}
                  >
                    Submit KYC
                  </Link>
                  <Link
                    to="/my-identity"
                    className={`px-3 py-1.5 rounded-btn text-sm font-medium transition-colors ${
                      isActive("/my-identity")
                        ? "bg-forest-light text-forest font-semibold"
                        : "text-textSecondary hover:text-textPrimary hover:bg-gray-100"
                    }`}
                  >
                    My Credential
                  </Link>
                </>
              )}

              {user && isAdmin && (
                <>
                  <Link
                    to="/admin"
                    className={`px-3 py-1.5 rounded-btn text-sm font-medium transition-colors ${
                      isActive("/admin")
                        ? "bg-forest-light text-forest font-semibold"
                        : "text-textSecondary hover:text-textPrimary hover:bg-gray-100"
                    }`}
                  >
                    Review Queue
                  </Link>
                  <Link
                    to="/history"
                    className={`px-3 py-1.5 rounded-btn text-sm font-medium transition-colors ${
                      isActive("/history")
                        ? "bg-forest-light text-forest font-semibold"
                        : "text-textSecondary hover:text-textPrimary hover:bg-gray-100"
                    }`}
                  >
                    Blockchain History
                  </Link>
                </>
              )}

              <Link
                to="/verify"
                className={`px-3 py-1.5 rounded-btn text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  isActive("/verify")
                    ? "bg-forest-light text-forest font-semibold"
                    : "text-textSecondary hover:text-textPrimary hover:bg-gray-100"
                }`}
              >
                <ScanLine className="w-4 h-4 text-forest" />
                Verify QR
              </Link>
            </nav>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* Wallet Status */}
                <button
                  onClick={handleConnectWallet}
                  title={user.walletAddress || "Click to connect MetaMask"}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-btn border border-borderSoft bg-bgMain text-textSecondary hover:text-textPrimary transition-colors"
                >
                  <Wallet className="w-3.5 h-3.5 text-forest" />
                  {user.walletAddress ? (
                    <span>{`${user.walletAddress.substring(0, 6)}...${user.walletAddress.substring(38)}`}</span>
                  ) : (
                    <span>{connectingWallet ? "Connecting..." : "Connect Wallet"}</span>
                  )}
                </button>

                {/* Role indicator */}
                <span
                  className={`text-xs px-2 py-0.5 rounded font-semibold uppercase ${
                    isAdmin
                      ? "bg-amber-100 text-amber-900 border border-amber-300"
                      : "bg-gray-100 text-gray-700 border border-gray-300"
                  }`}
                >
                  {user.role}
                </span>

                {/* Account info */}
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-xs font-semibold text-textPrimary leading-none">
                    {user.name}
                  </span>
                  <span className="text-[11px] text-textSecondary">{user.email}</span>
                </div>

                {/* Logout */}
                <button
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  className="p-2 text-textSecondary hover:text-brandDanger rounded-btn hover:bg-red-50 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 rounded-btn text-sm font-medium text-textPrimary hover:bg-gray-100 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 rounded-btn text-sm font-medium bg-forest text-white hover:bg-forest-hover shadow-sm transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
