import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import UserDashboard from "./pages/UserDashboard";
import KYCSubmission from "./pages/KYCSubmission";
import MyIdentity from "./pages/MyIdentity";
import AdminDashboard from "./pages/AdminDashboard";
import ApplicationReview from "./pages/ApplicationReview";
import VerifyIdentity from "./pages/VerifyIdentity";
import TransactionHistory from "./pages/TransactionHistory";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="min-h-[70vh] flex items-center justify-center text-xs text-textSecondary">Loading...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) {
    return <div className="min-h-[70vh] flex items-center justify-center text-xs text-textSecondary">Loading...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function HomeRedirect() {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <div className="min-h-screen flex flex-col bg-bgMain text-textPrimary">
            <Navbar />
            <main className="flex-1">
              <Routes>
                {/* Home redirect */}
                <Route path="/" element={<HomeRedirect />} />

                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify" element={<VerifyIdentity />} />
                <Route path="/verify/:id" element={<VerifyIdentity />} />

                {/* User Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <UserDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/kyc/submit"
                  element={
                    <ProtectedRoute>
                      <KYCSubmission />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-identity"
                  element={
                    <ProtectedRoute>
                      <MyIdentity />
                    </ProtectedRoute>
                  }
                />

                {/* Admin Routes */}
                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <AdminDashboard />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/review/:id"
                  element={
                    <AdminRoute>
                      <ApplicationReview />
                    </AdminRoute>
                  }
                />

                {/* Shared Authenticated Routes */}
                <Route
                  path="/history"
                  element={
                    <ProtectedRoute>
                      <TransactionHistory />
                    </ProtectedRoute>
                  }
                />

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}
